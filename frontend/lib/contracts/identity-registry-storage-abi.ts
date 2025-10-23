/**
 * ERC-3643 Identity Registry Storage ABI
 *
 * Storage contract for identity registry data
 * Manages identity mappings, countries, and registry bindings
 */

export const identityRegistryStorageAbi = [
  // Errors
  {
    inputs: [],
    name: "IdentityAlreadyStored",
    type: "error",
  },
  {
    inputs: [],
    name: "IdentityNotStored",
    type: "error",
  },
  {
    inputs: [],
    name: "OnlyBoundRegistry",
    type: "error",
  },
  {
    inputs: [],
    name: "RegistryAlreadyBound",
    type: "error",
  },
  {
    inputs: [],
    name: "RegistryNotBound",
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
      { indexed: true, internalType: "address", name: "investorAddress", type: "address" },
      { indexed: true, internalType: "uint16", name: "country", type: "uint16" },
    ],
    name: "CountryModified",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "contract IIdentity", name: "oldIdentity", type: "address" },
      { indexed: true, internalType: "contract IIdentity", name: "newIdentity", type: "address" },
    ],
    name: "IdentityModified",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "identityRegistry", type: "address" },
    ],
    name: "IdentityRegistryBound",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "identityRegistry", type: "address" },
    ],
    name: "IdentityRegistryUnbound",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "investorAddress", type: "address" },
      { indexed: true, internalType: "contract IIdentity", name: "identity", type: "address" },
    ],
    name: "IdentityStored",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "investorAddress", type: "address" },
      { indexed: true, internalType: "contract IIdentity", name: "identity", type: "address" },
    ],
    name: "IdentityUnstored",
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
      { internalType: "address", name: "_userAddress", type: "address" },
      { internalType: "contract IIdentity", name: "_identity", type: "address" },
      { internalType: "uint16", name: "_country", type: "uint16" },
    ],
    name: "addIdentityToStorage",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_identityRegistry", type: "address" },
    ],
    name: "bindIdentityRegistry",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
    ],
    name: "identityRegistries",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_userAddress", type: "address" },
      { internalType: "contract IIdentity", name: "_identity", type: "address" },
    ],
    name: "modifyStoredIdentity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_userAddress", type: "address" },
      { internalType: "uint16", name: "_country", type: "uint16" },
    ],
    name: "modifyStoredInvestorCountry",
    outputs: [],
    stateMutability: "nonpayable",
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
      { internalType: "address", name: "_userAddress", type: "address" },
    ],
    name: "removeIdentityFromStorage",
    outputs: [],
    stateMutability: "nonpayable",
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
      { internalType: "address", name: "_userAddress", type: "address" },
    ],
    name: "storedIdentity",
    outputs: [{ internalType: "contract IIdentity", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_userAddress", type: "address" },
    ],
    name: "storedInvestorCountry",
    outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
    stateMutability: "view",
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
      { internalType: "address", name: "_identityRegistry", type: "address" },
    ],
    name: "unbindIdentityRegistry",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

export default identityRegistryStorageAbi
