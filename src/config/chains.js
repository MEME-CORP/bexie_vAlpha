import { Chain } from 'wagmi';

export const berachainBartio = {
  id: 80084,
  name: 'Berachain bArtio',
  network: 'berachain bartio',
  iconUrl: 'https://example.com/berachain-icon.png',
  iconBackground: '#ffffff',
  nativeCurrency: {
    name: 'Berachain',
    symbol: 'BERA',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://bartio.rpc.berachain.com'] },
  },
  blockExplorers: {
    default: { name: 'Beratrail', url: 'https://bartio.beratrail.io' },
  },
  testnet: true,
}; 