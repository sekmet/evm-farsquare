import { createConfig, http } from 'wagmi'
import { hardhat, anvil, sepolia, baseSepolia, optimismSepolia } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [hardhat, anvil, sepolia, baseSepolia, optimismSepolia],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [hardhat.id]: http(),
    //[anvil.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [optimismSepolia.id]: http(),
  },
})
