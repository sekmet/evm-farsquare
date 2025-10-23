/**
 * ERC-3643 Max Balance Module ABI
 *
 * Compliance module implementing maximum balance restrictions on token holdings
 * Enforces limits on individual wallet balances to prevent concentration
 */

export const maxBalanceModuleAbi = [
  // Constructor
  {
    inputs: [
      { internalType: "address", name: "compliance", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  // Errors
  {
    inputs: [],
    name: "InvalidPercentage",
    type: "error",
  },
  {
    inputs: [],
    name: "OnlyCompliance",
    type: "error",
  },
  {
    inputs: [],
    name: "OnlyToken",
    type: "error",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "maxBalance", type: "uint256" },
    ],
    name: "MaxBalanceSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "maxPercentage", type: "uint256" },
    ],
    name: "MaxPercentageSet",
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
      { internalType: "address", name: "token", type: "address" },
    ],
    name: "bindToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_from", type: "address" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
    ],
    name: "canTransfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "created",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "destroyed",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "maxBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxPercentage",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "compliance", type: "address" },
    ],
    name: "moduleCheck",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
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
      { internalType: "uint256", name: "maxBalance", type: "uint256" },
    ],
    name: "setMaxBalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "maxPercentage", type: "uint256" },
    ],
    name: "setMaxPercentage",
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
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "transferred",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
] as const

export default maxBalanceModuleAbi
