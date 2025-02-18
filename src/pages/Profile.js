import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../config/supabaseClient';
import './Profile.css';
import AgentActivationForm from '../components/AgentActivationForm';

function Profile() {
  const { address } = useAccount();
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showActivationForm, setShowActivationForm] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);

  useEffect(() => {
    const fetchUserTokens = async () => {
      try {
        // First get user ID by wallet address
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', address)
          .single();

        if (userError) {
          // If no user found, set empty tokens instead of error
          if (userError.code === 'PGRST116') {
            setTokens([]);
            return;
          }
          throw userError;
        }

        // Then get all tokens for this user
        const { data: userTokens, error: tokensError } = await supabase
          .from('tokens')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (tokensError) throw tokensError;

        setTokens(userTokens);
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setError('Something went wrong while loading your tokens');
      } finally {
        setIsLoading(false);
      }
    };

    if (address) {
      fetchUserTokens();
    } else {
      setTokens([]);
      setIsLoading(false);
    }
  }, [address]);

  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading tokens...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Your Profile</h1>
        <div className="wallet-info">
          <span className="label">Connected Wallet:</span>
          <span className="address">{address}</span>
        </div>
      </div>

      <div className="tokens-section">
        <h2>Your Deployed Tokens</h2>
        {tokens.length === 0 ? (
          <div className="no-tokens">
            <p>You haven't deployed any tokens yet.</p>
          </div>
        ) : (
          <div className="tokens-grid">
            {tokens.map((token) => (
              <div key={token.id} className="token-card">
                <div className="token-header">
                  <img 
                    src={token.logo_url} 
                    alt={`${token.token_name} logo`}
                    className="token-logo"
                  />
                  <div className="token-title">
                    <h3>{token.token_name}</h3>
                    <span className="token-symbol">{token.token_symbol}</span>
                  </div>
                </div>

                <p className="token-description">{token.token_description}</p>

                <div className="token-links">
                  {token.website_link && (
                    <a 
                      href={token.website_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="website-link"
                    >
                      <i className="fas fa-globe"></i>
                      Website
                    </a>
                  )}
                  {token.use_bexie && (
                    <span className="bexie-badge">
                      <i className="fas fa-robot"></i>
                      Bexie Website
                    </span>
                  )}
                </div>

                <div className="social-links">
                  {token.telegram_link && (
                    <a 
                      href={token.telegram_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link telegram"
                    >
                      <i className="fab fa-telegram"></i>
                    </a>
                  )}
                  {token.x_link && (
                    <a 
                      href={token.x_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link twitter"
                    >
                      <i className="fab fa-x-twitter"></i>
                    </a>
                  )}
                </div>

                {token.contract_address && (
                  <div className="contract-info">
                    <span className="label">Contract Address:</span>
                    <span className="address">
                      {token.contract_address.slice(0, 6)}...
                      {token.contract_address.slice(-4)}
                    </span>
                  </div>
                )}

                <button 
                  className="activate-agent-button"
                  onClick={() => {
                    setSelectedToken(token);
                    setShowActivationForm(true);
                  }}
                >
                  Activate Agent
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showActivationForm && selectedToken && (
        <AgentActivationForm
          onClose={() => {
            setShowActivationForm(false);
            setSelectedToken(null);
          }}
          tokenName={selectedToken.token_name}
        />
      )}
    </div>
  );
}

export default Profile; 