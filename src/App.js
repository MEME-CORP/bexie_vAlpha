import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ethers } from 'ethers';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base, berachainTestnetbArtio } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { berachainBartio } from './config/chains';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import TokenDeployer from './pages/TokenDeployer';
import Profile from './pages/Profile';
import TokenDetail from './pages/TokenDetail';

// Create a QueryClient instance
const queryClient = new QueryClient();

// Configure RainbowKit
const config = getDefaultConfig({
  appName: 'Bexie DApp',
  projectId: '701812e78b1505706d7aaf82cd8de060',
  chains: [berachainBartio, mainnet, polygon, optimism, arbitrum, base],
  ssr: false,
});

// Patch JSON.stringify to handle circular references
// This solution is based on the approach from https://stackoverflow.com/questions/11616630/how-can-i-print-a-circular-structure-in-a-json-like-format
function patchJSONStringify() {
  const originalStringify = JSON.stringify;
  
  JSON.stringify = function(obj, replacer, space) {
    const cache = new Set();
    
    const customReplacer = (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return undefined; // Remove circular reference
        }
        cache.add(value);
      }
      
      return replacer ? replacer(key, value) : value;
    };
    
    const result = originalStringify(obj, customReplacer, space);
    cache.clear(); // Clean up memory
    return result;
  };
  
  return () => {
    JSON.stringify = originalStringify; // Cleanup function
  };
}

function App() {
  // Apply JSON.stringify patch when component mounts
  useEffect(() => {
    const cleanup = patchJSONStringify();
    return cleanup; // Restore original when component unmounts
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider theme={lightTheme()} coolMode>
          <Router>
            <>
              <Navbar />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/token/:contract_address" element={<TokenDetail />} />
                <Route path="/deploy" element={<TokenDeployer />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </>
          </Router>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App; 