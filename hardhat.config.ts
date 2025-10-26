import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import hardhatViemPlugin from "@nomicfoundation/hardhat-viem";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin, hardhatViemPlugin],
  networks: {
    hardhat: {
      chainId: 1337,
      type: "edr-simulated",
      chainType: "op",
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
      type: "http",
      chainType: "op",
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : [
        '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6'
      ],
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}` || "https://sepolia.infura.io",
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : [],
      type: "http",
      chainType: "l1",
    },   
    optimism_sepolia: {
      url: `https://optimism-sepolia.infura.io/v3/${process.env.INFURA_API_KEY}` || "https://sepolia.optimism.io",
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : [],
      type: "http",
      chainType: "op",
    },    
    base_sepolia: {
      url: `https://base-sepolia.infura.io/v3/${process.env.INFURA_API_KEY}` || "https://sepolia.base.org",
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : [],
      type: "http",
      chainType: "op",
    }
  },
  solidity: {
    version: '0.8.20',
    settings: {
      evmVersion: "paris",
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 1,
      },
      metadata: {
        // do not include the metadata hash, since this is machine dependent
        // and we want all generated code to be deterministic
        // https://docs.soliditylang.org/en/v0.7.6/metadata.html
        bytecodeHash: 'none',
      },
    },
  },
};

export default config;