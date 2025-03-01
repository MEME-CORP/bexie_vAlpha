import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../config/supabaseClient';
import './Profile.css';
import AgentActivationForm from '../components/AgentActivationForm';

// ASCII art for the header
const ASCII_HEADER = `
+----------------------------------------------+
|                                              |
|  ██████╗ ███████╗██╗  ██╗██╗███████╗        |
|  ██╔══██╗██╔════╝╚██╗██╔╝██║██╔════╝        |
|  ██████╔╝█████╗   ╚███╔╝ ██║█████╗          |
|  ██╔══██╗██╔══╝   ██╔██╗ ██║██╔══╝          |
|  ██████╔╝███████╗██╔╝ ██╗██║███████╗        |
|  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝        |
|                                              |
|  USER PROFILE INTERFACE v1.0                 |
|                                              |
+----------------------------------------------+
`;

function Profile() {
  const { address } = useAccount();
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showActivationForm, setShowActivationForm] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [terminalOutput, setTerminalOutput] = useState([]);

  // Add terminal output function
  const addTerminalLine = (line) => {
    setTerminalOutput(prev => [...prev, `> ${line}`]);
    // Keep only the last 5 lines
    if (terminalOutput.length > 5) {
      setTerminalOutput(prev => prev.slice(prev.length - 5));
    }
  };

  useEffect(() => {
    if (address) {
      addTerminalLine(`WALLET CONNECTED: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`);
    }
  }, [address]);

  useEffect(() => {
    const fetchUserTokens = async () => {
      try {
        addTerminalLine("INITIALIZING DATA RETRIEVAL...");
        
        if (!address) {
          setTokens([]);
          setIsLoading(false);
          addTerminalLine("ERROR: NO WALLET CONNECTED");
          return;
        }
        
        addTerminalLine("QUERYING USER DATABASE...");
        
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
            addTerminalLine("NO USER RECORD FOUND");
            return;
          }
          throw userError;
        }

        addTerminalLine(`USER IDENTIFIED: ID ${user.id.substring(0, 8)}...`);
        addTerminalLine("RETRIEVING TOKEN DATA...");

        // Then get all tokens for this user
        const { data: userTokens, error: tokensError } = await supabase
          .from('tokens')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (tokensError) throw tokensError;

        addTerminalLine(`FOUND ${userTokens.length} TOKEN(S)`);
        setTokens(userTokens);
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setError('Something went wrong while loading your tokens');
        addTerminalLine("ERROR: DATA RETRIEVAL FAILED");
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

  const handleActivateAgent = (token) => {
    addTerminalLine(`PREPARING AGENT ACTIVATION: ${token.token_symbol}`);
    setSelectedToken(token);
    setShowActivationForm(true);
  };

  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="ascii-header" style={{ whiteSpace: 'pre', fontFamily: 'monospace', textAlign: 'center', marginBottom: '2rem' }}>
          {ASCII_HEADER}
        </div>
        <div className="loading">LOADING TOKEN DATA...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="ascii-header" style={{ whiteSpace: 'pre', fontFamily: 'monospace', textAlign: 'center', marginBottom: '2rem' }}>
          {ASCII_HEADER}
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="ascii-header" style={{ whiteSpace: 'pre', fontFamily: 'monospace', textAlign: 'center', marginBottom: '2rem' }}>
        {ASCII_HEADER}
      </div>
      
      <div className="profile-header">
        <h1>USER PROFILE</h1>
        <div className="wallet-info">
          <span className="label">CONNECTED WALLET:</span>
          <span className="address">{address}</span>
        </div>
      </div>

      {terminalOutput.length > 0 && (
        <div className="terminal-output" style={{
          background: '#000',
          border: '1px solid #fff',
          padding: '1rem',
          fontFamily: 'monospace',
          marginBottom: '1.5rem',
          whiteSpace: 'pre-line',
          lineHeight: '1.5'
        }}>
          {terminalOutput.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}

      <div className="tokens-section">
        <h2>DEPLOYED TOKENS</h2>
        {tokens.length === 0 ? (
          <div className="no-tokens">
            <p>NO TOKENS FOUND IN DATABASE</p>
            <p style={{ opacity: 0.7, marginTop: '1rem' }}>Deploy a token to see it listed here</p>
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
                    <h3>{token.token_name.toUpperCase()}</h3>
                    <span className="token-symbol">{token.token_symbol.toUpperCase()}</span>
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
                      onClick={() => addTerminalLine(`OPENING WEBSITE: ${token.token_symbol}`)}
                    >
                      <i className="fas fa-globe"></i>
                      WEBSITE
                    </a>
                  )}
                  {token.use_bexie && (
                    <span className="bexie-badge">
                      <i className="fas fa-robot"></i>
                      BEXIE SITE
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
                      onClick={() => addTerminalLine(`OPENING TELEGRAM: ${token.token_symbol}`)}
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
                      onClick={() => addTerminalLine(`OPENING X/TWITTER: ${token.token_symbol}`)}
                    >
                      <i className="fab fa-x-twitter"></i>
                    </a>
                  )}
                </div>

                {token.contract_address && (
                  <div className="contract-info">
                    <span className="label">CONTRACT:</span>
                    <span className="address">
                      {token.contract_address.slice(0, 6)}...
                      {token.contract_address.slice(-4)}
                    </span>
                  </div>
                )}

                <button 
                  className="activate-agent-button"
                  onClick={() => handleActivateAgent(token)}
                >
                  ACTIVATE AGENT
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
            addTerminalLine("AGENT ACTIVATION CANCELLED");
          }}
          tokenName={selectedToken.token_name}
        />
      )}
    </div>
  );
}

export default Profile; 