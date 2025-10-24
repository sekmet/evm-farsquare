import { createConfig, http } from 'wagmi'
import { hardhat, anvil, sepolia, baseSepolia, optimismSepolia } from 'wagmi/chains'
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors'
import logoBig from '@/assets/evm-farsquare.png'
/**
 * Wagmi Configuration
 *
 * Configures Wagmi for wallet connections and multi-chain support.
 * This setup enables SIWE authentication and wallet interactions across multiple networks.
 */

// Define the chains supported by the application
export const supportedChains = [hardhat, anvil, sepolia, baseSepolia, optimismSepolia] as const

// Create wagmi configuration
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({
      appName: 'Farsquare',
      appLogoUrl: logoBig,
    }),
  ],
  transports: {
    [hardhat.id]: http(),
    //[anvil.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [optimismSepolia.id]: http(),
  },
})

// Export configuration for use in providers and hooks
export default wagmiConfig

// Re-export commonly used wagmi utilities
export { type Config } from 'wagmi'
export { type Chain } from 'wagmi/chains'
