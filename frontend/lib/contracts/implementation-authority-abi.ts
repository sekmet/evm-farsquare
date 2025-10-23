/**
 * ERC-3643 Implementation Authority ABI
 *
 * Authority contract managing contract implementations for upgradeable proxies
 * Maintains versioned implementations for different contract types
 */

export const implementationAuthorityAbi = [
  // Errors
  {
    inputs: [],
    name: "InvalidImplementation",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidName",
    type: "error",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "name", type: "bytes32" },
      { indexed: true, internalType: "address", name: "implementation", type: "address" },
      { indexed: false, internalType: "uint256", name: "version", type: "uint256" },
    ],
    name: "ImplementationUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  // Functions
  {
    inputs: [
      { internalType: "bytes32", name: "_name", type: "bytes32" },
    ],
    name: "getImplementation",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "_name", type: "bytes32" },
    ],
    name: "getVersion",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "", type: "bytes32" },
    ],
    name: "implementations",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "_name", type: "bytes32" },
      { internalType: "address", name: "_implementation", type: "address" },
    ],
    name: "setImplementation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "", type: "bytes32" },
    ],
    name: "versions",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

export default implementationAuthorityAbi
