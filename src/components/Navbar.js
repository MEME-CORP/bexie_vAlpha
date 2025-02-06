import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar({ account, onDisconnect }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
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
        <Link to="/">Dashboard</Link>
        <Link to="/deploy">Token Deployer</Link>
        <Link to="/profile">Profile</Link>
      </div>
      <div className="nav-wallet">
        <span className="wallet-address">
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
        <button onClick={onDisconnect} className="disconnect-button">
          Disconnect
        </button>
      </div>
    </nav>
  );
}

export default Navbar; 