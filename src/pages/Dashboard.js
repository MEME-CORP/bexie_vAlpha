import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import './Dashboard.css';
import { Link } from 'react-router-dom';

function Dashboard() {
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllTokens = async () => {
      try {
        const { data: allTokens, error: tokensError } = await supabase
          .from('tokens')
          .select(`
            *,
            users (
              wallet_address
            )
          `)
          .order('created_at', { ascending: false });

        if (tokensError) throw tokensError;

        setTokens(allTokens);
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setError('Failed to load tokens');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTokens();
  }, []);

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading tokens...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>All Deployed Tokens</h1>
      </div>

      <div className="tokens-section">
        {tokens.length === 0 ? (
          <div className="no-tokens">
            <p>No tokens have been deployed yet.</p>
          </div>
        ) : (
          <div className="tokens-grid">
            {tokens.map((token) => (
              <Link 
                to={`/token/${token.id}`} 
                key={token.id} 
                className="token-card"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
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

                <div className="creator-info">
                  <span className="label">Created by:</span>
                  <span className="address">
                    {token.users?.wallet_address.slice(0, 6)}...
                    {token.users?.wallet_address.slice(-4)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard; 