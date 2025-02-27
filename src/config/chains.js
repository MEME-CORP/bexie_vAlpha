// Remove unused Chain import
// import { Chain } from 'wagmi/chains'

// Define the Berachain bArtio testnet with proper parameters
export const berachainBartio = {
  id: 80084,
  name: 'Berachain bArtio Testnet',
  network: 'berachain-bartio',
  nativeCurrency: {
    decimals: 18,
    name: 'BERA',
    symbol: 'BERA',
  },
  rpcUrls: {
    default: {
      http: ['https://bartio.rpc.berachain.com/'],
      webSocket: [], // Add WebSocket URLs if available
    },
    public: {
      http: ['https://bartio.rpc.berachain.com/'],
      webSocket: [], // Add WebSocket URLs if available
    },
  },
  blockExplorers: {
    default: { 
      name: 'Beratrail', 
      url: 'https://bartio.beratrail.io/' 
    },
  },
  contracts: {},
  testnet: true,
}; 