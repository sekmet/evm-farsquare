import { createPublicClient, http } from 'viem'
import { mainnet, hedera, base } from 'viem/chains'

/**
 * Public Client Configuration
 *
 * Creates a Viem public client for reading blockchain data from multiple chains.
 * This client supports multicall aggregation for improved performance.
 */
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
  batch: {
    multicall: true,
  },
})

// Export supported chains for use throughout the application
export const supportedChains = [mainnet, hedera, base] as const

// Chain configurations for easy access
export const chainConfigs = {
  mainnet,
  hedera,
  base,
} as const
