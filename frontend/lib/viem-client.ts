import { createPublicClient, http } from 'viem'
import { hardhat, anvil, sepolia, baseSepolia, optimismSepolia } from 'viem/chains'

/**
 * Public Client Configuration
 *
 * Creates a Viem public client for reading blockchain data from multiple chains.
 * This client supports multicall aggregation for improved performance.
 */
export const publicClient = createPublicClient({
  chain: anvil,
  transport: http(),
  batch: {
    multicall: true,
  },
})

// Export supported chains for use throughout the application
export const supportedChains = [hardhat, anvil, sepolia, baseSepolia, optimismSepolia] as const

// Chain configurations for easy access
export const chainConfigs = {
  hardhat,
  anvil,
  sepolia,
  baseSepolia,
  optimismSepolia,
} as const
