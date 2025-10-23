/**
 * ERC-3643 Country Restrictions Module ABI
 *
 * Compliance module implementing geographic restrictions on token transfers
 * Supports country whitelisting/blacklisting based on identity registry data
 */

export const countryRestrictionsModuleAbi = [
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
      { indexed: true, internalType: "uint16", name: "country", type: "uint16" },
    ],
    name: "CountryBlacklisted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint16", name: "country", type: "uint16" },
    ],
    name: "CountryUnblacklisted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint16", name: "country", type: "uint16" },
    ],
    name: "CountryUnwhitelisted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint16", name: "country", type: "uint16" },
    ],
    name: "CountryWhitelisted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "identityRegistry", type: "address" },
    ],
    name: "IdentityRegistrySet",
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
      { internalType: "uint16", name: "country", type: "uint16" },
    ],
    name: "blacklistCountry",
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
    name: "identityRegistry",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint16", name: "country", type: "uint16" },
    ],
    name: "isCountryBlacklisted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint16", name: "country", type: "uint16" },
    ],
    name: "isCountryWhitelisted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
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
      { internalType: "address", name: "identityRegistry", type: "address" },
    ],
    name: "setIdentityRegistry",
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
  {
    inputs: [
      { internalType: "uint16", name: "country", type: "uint16" },
    ],
    name: "unblacklistCountry",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint16", name: "country", type: "uint16" },
    ],
    name: "unwhitelistCountry",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint16", name: "country", type: "uint16" },
    ],
    name: "whitelistCountry",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

export default countryRestrictionsModuleAbi
