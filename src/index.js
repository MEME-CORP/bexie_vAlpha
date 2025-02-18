import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { berachainBartio } from './config/chains';

// Create a QueryClient instance
const queryClient = new QueryClient();

// Configure RainbowKit
const config = getDefaultConfig({
  appName: 'Bexie DApp',
  projectId: '701812e78b1505706d7aaf82cd8de060',
  chains: [berachainBartio, mainnet, polygon, optimism, arbitrum, base],
  ssr: true,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
); 