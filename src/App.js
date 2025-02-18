import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ethers } from 'ethers';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
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
  ssr: true,
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider>
          <Router>
            <>
              <Navbar />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/token/:id" element={<TokenDetail />} />
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