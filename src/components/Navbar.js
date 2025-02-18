import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import './Navbar.css';

function Navbar({ account }) {
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
        <ConnectButton />
      </div>
    </nav>
  );
}

export default Navbar; 