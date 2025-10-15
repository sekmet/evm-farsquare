import { createConfig, http } from 'wagmi'
import { mainnet, hedera, base } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [mainnet, hedera, base],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [hedera.id]: http(),
  },
})
