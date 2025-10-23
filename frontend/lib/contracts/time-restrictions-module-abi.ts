/**
 * ERC-3643 Time Restrictions Module ABI
 *
 * Compliance module implementing time-based restrictions on token transfers
 * Supports lockup periods, vesting schedules, and time-gated transfers
 */

export const timeRestrictionsModuleAbi = [
  // Errors
  {
    inputs: [],
    name: "InvalidLockupTime",
    type: "error",
  },
  {
    inputs: [],
    name: "NotCompliance",
    type: "error",
  },
  {
    inputs: [],
    name: "NotOwner",
    type: "error",
  },
  {
    inputs: [],
    name: "ZeroAddress",
    type: "error",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "compliance", type: "address" },
    ],
    name: "ComplianceBound",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "investor", type: "address" },
      { indexed: false, internalType: "uint256", name: "lockupEnd", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "cliffEnd", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "vestingDuration", type: "uint256" },
    ],
    name: "LockupSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "investor", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "releaseTime", type: "uint256" },
    ],
    name: "TokensLocked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "investor", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "TokensUnlocked",
    type: "event",
  },
  // Functions
  {
    inputs: [
      { internalType: "address", name: "_compliance", type: "address" },
    ],
    name: "bindCompliance",
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
    inputs: [],
    name: "compliance",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
    ],
    name: "created",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_from", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
    ],
    name: "destroyed",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_investor", type: "address" },
    ],
    name: "getTotalBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_investor", type: "address" },
    ],
    name: "getUnlockedBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
    ],
    name: "lockupInfo",
    outputs: [
      { internalType: "uint256", name: "lockupEnd", type: "uint256" },
      { internalType: "uint256", name: "cliffEnd", type: "uint256" },
      { internalType: "uint256", name: "vestingDuration", type: "uint256" },
      { internalType: "uint256", name: "vestingStart", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_compliance", type: "address" },
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
    inputs: [
      { internalType: "address", name: "_investor", type: "address" },
      { internalType: "uint256", name: "_lockupEnd", type: "uint256" },
      { internalType: "uint256", name: "_cliffEnd", type: "uint256" },
      { internalType: "uint256", name: "_vestingDuration", type: "uint256" },
    ],
    name: "setLockup",
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
    name: "transferred",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

export default timeRestrictionsModuleAbi
