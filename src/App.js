import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ethers } from 'ethers';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import TokenDeployer from './pages/TokenDeployer';
import Profile from './pages/Profile';
import ConnectWallet from './components/ConnectWallet';

function App() {
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        handleAccountsChanged(accounts);
      } else {
        alert('Please install MetaMask!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setIsConnected(false);
    localStorage.removeItem('isWalletConnected');
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      // MetaMask is locked or the user has not connected any accounts
      disconnectWallet();
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
      setIsConnected(true);
      localStorage.setItem('isWalletConnected', 'true');
    }
  };

  const handleChainChanged = (chainId) => {
    // Handle chain changes - reload the page as recommended by MetaMask
    window.location.reload();
  };

  useEffect(() => {
    const init = async () => {
      // Check if wallet was previously connected
      const wasConnected = localStorage.getItem('isWalletConnected') === 'true';
      
      if (window.ethereum) {
        // Add listeners
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('disconnect', disconnectWallet);

        // Check if already connected
        if (wasConnected) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            handleAccountsChanged(accounts);
          } catch (error) {
            console.error('Error checking wallet connection:', error);
          }
        }
      }

      // Cleanup listeners
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('disconnect', disconnectWallet);
        }
      };
    };

    init();
  }, [account]); // Added account as dependency

  return (
    <Router>
      {isConnected ? (
        <>
          <Navbar 
            account={account} 
            onDisconnect={disconnectWallet}
          />
          <Routes>
            <Route path="/" element={<Dashboard account={account} />} />
            <Route path="/deploy" element={<TokenDeployer account={account} />} />
            <Route path="/profile" element={<Profile account={account} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </>
      ) : (
        <ConnectWallet 
          connectWallet={connectWallet} 
          error={window.ethereum ? null : 'Please install MetaMask'}
        />
      )}
    </Router>
  );
}

export default App; 