import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import './Dashboard.css';
import { Link } from 'react-router-dom';

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
|  TOKEN VAULT ACCESS v1.0                     |
|                                              |
+----------------------------------------------+
`;

// ASCII art for the footer
const ASCII_FOOTER = `
+----------------------------------------------+
|                                              |
|  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  |
|  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  |
|  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  |
|                                              |
+----------------------------------------------+
`;

function Dashboard() {
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
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
    const fetchAllTokens = async () => {
      try {
        addTerminalLine("INITIALIZING TOKEN VAULT ACCESS...");
        addTerminalLine("QUERYING DATABASE...");
        
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

        addTerminalLine(`RETRIEVED ${allTokens.length} TOKEN RECORDS`);
        setTokens(allTokens);
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setError('Failed to load tokens');
        addTerminalLine("ERROR: DATABASE ACCESS FAILURE");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTokens();
  }, []);

  const handleTokenClick = (token) => {
    addTerminalLine(`ACCESSING TOKEN: ${token.token_symbol}`);
  };

  const handleExternalLink = (e, type, symbol) => {
    e.stopPropagation();
    addTerminalLine(`OPENING ${type}: ${symbol}`);
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="ascii-header" style={{ whiteSpace: 'pre', fontFamily: 'monospace', textAlign: 'center', marginBottom: '2rem' }}>
          {ASCII_HEADER}
        </div>
        <header className="header">
          <h1>TOKEN VAULT</h1>
        </header>
        <div className="loading">LOADING TOKENS</div>
        <footer className="footer">
          <div className="ascii-signature">
            {ASCII_FOOTER}
          </div>
          <p>COPYRIGHT &copy; {new Date().getFullYear()} | ASCII ART NOIR INTERFACE</p>
        </footer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="ascii-header" style={{ whiteSpace: 'pre', fontFamily: 'monospace', textAlign: 'center', marginBottom: '2rem' }}>
          {ASCII_HEADER}
        </div>
        <header className="header">
          <h1>TOKEN VAULT</h1>
        </header>
        <div className="error-message">{error}</div>
        <footer className="footer">
          <div className="ascii-signature">
            {ASCII_FOOTER}
          </div>
          <p>COPYRIGHT &copy; {new Date().getFullYear()} | ASCII ART NOIR INTERFACE</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="ascii-header" style={{ whiteSpace: 'pre', fontFamily: 'monospace', textAlign: 'center', marginBottom: '2rem' }}>
        {ASCII_HEADER}
      </div>
      
      <header className="header">
        <h1>TOKEN VAULT</h1>
        <div className="header-controls">
          <button className="btn">FILTER</button>
          <button className="btn">SORT</button>
        </div>
      </header>

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

      <main>
        <div id="content">
          {tokens.length === 0 ? (
            <div className="no-tokens">
              <p>NO TOKENS HAVE BEEN DEPLOYED YET</p>
              <p style={{ opacity: 0.7, marginTop: '1rem' }}>WAITING FOR FIRST TOKEN DEPLOYMENT</p>
            </div>
          ) : (
            <div className="token-grid">
              {tokens.map((token) => (
                <Link 
                  to={`/token/${token.contract_address}`} 
                  key={token.id} 
                  className="token-card"
                  onClick={() => handleTokenClick(token)}
                >
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
                        onClick={(e) => handleExternalLink(e, 'WEBSITE', token.token_symbol)}
                      >
                        <i className="fas fa-globe"></i> WEBSITE
                      </a>
                    )}
                    {token.use_bexie && (
                      <span className="bexie-badge">
                        <i className="fas fa-robot"></i> BEXIE
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
                        onClick={(e) => handleExternalLink(e, 'TELEGRAM', token.token_symbol)}
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
                        onClick={(e) => handleExternalLink(e, 'X/TWITTER', token.token_symbol)}
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

                  <div className="creator-info">
                    <span className="label">CREATOR:</span>
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
      </main>

      <footer className="footer">
        <div className="ascii-signature">
          {ASCII_FOOTER}
        </div>
        <p>COPYRIGHT &copy; {new Date().getFullYear()} | ASCII ART NOIR INTERFACE</p>
      </footer>
    </div>
  );
}

export default Dashboard; 