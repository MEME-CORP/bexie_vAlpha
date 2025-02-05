import React from 'react';
import './ConnectWallet.css';

function ConnectWallet({ connectWallet }) {
  return (
    <div className="connect-wallet-container">
      <div className="connect-wallet-box">
        <h1>Welcome to DApp</h1>
        <p>Please connect your wallet to continue</p>
        <button onClick={connectWallet} className="connect-button">
          Connect MetaMask
        </button>
      </div>
    </div>
  );
}

export default ConnectWallet; 