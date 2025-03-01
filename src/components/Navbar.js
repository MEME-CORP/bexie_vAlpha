import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import './Navbar.css';

// ASCII art for the logo
const ASCII_LOGO = `
  ██████╗ ███████╗██╗  ██╗██╗███████╗
  ██╔══██╗██╔════╝╚██╗██╔╝██║██╔════╝
  ██████╔╝█████╗   ╚███╔╝ ██║█████╗  
  ██╔══██╗██╔══╝   ██╔██╗ ██║██╔══╝  
  ██████╔╝███████╗██╔╝ ██╗██║███████╗
  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝
`;

function Navbar({ account }) {
  const location = useLocation();
  const [terminalOutput, setTerminalOutput] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);

  // Generate terminal feedback based on current route
  useEffect(() => {
    let output = '';
    
    switch(location.pathname) {
      case '/':
        output = 'ACCESSING TOKEN VAULT...';
        break;
      case '/deploy':
        output = 'INITIALIZING TOKEN DEPLOYER...';
        break;
      case '/profile':
        output = 'LOADING USER PROFILE...';
        break;
      default:
        if (location.pathname.startsWith('/token/')) {
          const tokenAddress = location.pathname.split('/token/')[1];
          output = `ACCESSING TOKEN: ${tokenAddress.substring(0, 6)}...${tokenAddress.substring(tokenAddress.length - 4)}`;
        } else {
          output = 'NAVIGATING...';
        }
    }
    
    setTerminalOutput(output);
    setShowTerminal(true);
    
    // Hide terminal output after 3 seconds
    const timer = setTimeout(() => {
      setShowTerminal(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [location]);

  const handleNavigation = (path) => {
    let output = '';
    
    switch(path) {
      case '/':
        output = 'ACCESSING TOKEN VAULT...';
        break;
      case '/deploy':
        output = 'INITIALIZING TOKEN DEPLOYER...';
        break;
      case '/profile':
        output = 'LOADING USER PROFILE...';
        break;
      default:
        output = 'NAVIGATING...';
    }
    
    setTerminalOutput(output);
    setShowTerminal(true);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/" onClick={() => handleNavigation('/')}>
            <img 
              src="/bexie-logo.png"
              alt="Bexie Logo"
              className="navbar-logo"
              width="40"
              height="40"
            />
          </Link>
        </div>
        <div className="nav-links">
          <Link 
            to="/" 
            onClick={() => handleNavigation('/')}
            className={location.pathname === '/' ? 'active' : ''}
          >
            DASHBOARD
          </Link>
          <Link 
            to="/deploy" 
            onClick={() => handleNavigation('/deploy')}
            className={location.pathname === '/deploy' ? 'active' : ''}
          >
            TOKEN DEPLOYER
          </Link>
          <Link 
            to="/profile" 
            onClick={() => handleNavigation('/profile')}
            className={location.pathname === '/profile' ? 'active' : ''}
          >
            PROFILE
          </Link>
        </div>
        <div className="nav-wallet">
          <ConnectButton />
        </div>
      </nav>
      
      {showTerminal && (
        <div 
          className="terminal-feedback"
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            background: '#000',
            border: '1px solid #fff',
            padding: '0.5rem 1rem',
            fontFamily: 'monospace',
            zIndex: 1000,
            animation: 'flicker 2s infinite'
          }}
        >
          &gt; {terminalOutput}
        </div>
      )}
    </>
  );
}

export default Navbar; 