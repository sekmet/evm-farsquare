/**
 * ERC-3643 TREX Factory ABI
 *
 * Main factory contract for deploying complete TREX (Token for Regulated Exchange) suites
 * Deploys full token ecosystems including token, registries, compliance, and identity contracts
 */

export const trexFactoryAbi = [
  // Errors
  {
    inputs: [],
    name: "DeploymentFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidSalt",
    type: "error",
  },
  // Functions
  {
    inputs: [
      { internalType: "bytes32", name: "s", type: "bytes32" },
      { internalType: "string", name: "n", type: "string" },
      { internalType: "string", name: "y", type: "string" },
      { internalType: "uint8", name: "d", type: "uint8" },
      { internalType: "address", name: "o", type: "address" },
    ],
    name: "deployTREXSuite",
    outputs: [
      { internalType: "address", name: "t", type: "address" },
      { internalType: "address", name: "r", type: "address" },
      { internalType: "address", name: "c", type: "address" },
      { internalType: "address", name: "st", type: "address" },
      { internalType: "address", name: "ct", type: "address" },
      { internalType: "address", name: "ti", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

export default trexFactoryAbi
