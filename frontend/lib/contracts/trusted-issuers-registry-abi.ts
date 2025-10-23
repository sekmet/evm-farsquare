/**
 * ERC-3643 Trusted Issuers Registry ABI
 *
 * Registry contract for managing trusted claim issuers
 * Manages authorized issuers that can verify and sign identity claims
 */

export const trustedIssuersRegistryAbi = [
  // Errors
  {
    inputs: [],
    name: "EmptyClaimTopics",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidIssuer",
    type: "error",
  },
  {
    inputs: [],
    name: "IssuerAlreadyExists",
    type: "error",
  },
  {
    inputs: [],
    name: "IssuerDoesNotExist",
    type: "error",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "contract IClaimIssuer", name: "trustedIssuer", type: "address" },
      { indexed: false, internalType: "uint256[]", name: "claimTopics", type: "uint256[]" },
    ],
    name: "ClaimTopicsUpdated",
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
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "contract IClaimIssuer", name: "trustedIssuer", type: "address" },
      { indexed: false, internalType: "uint256[]", name: "claimTopics", type: "uint256[]" },
    ],
    name: "TrustedIssuerAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "contract IClaimIssuer", name: "trustedIssuer", type: "address" },
    ],
    name: "TrustedIssuerRemoved",
    type: "event",
  },
  // Functions
  {
    inputs: [
      { internalType: "contract IClaimIssuer", name: "trustedIssuer", type: "address" },
      { internalType: "uint256[]", name: "claimTopics", type: "uint256[]" },
    ],
    name: "addTrustedIssuer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "contract IClaimIssuer", name: "trustedIssuer", type: "address" },
    ],
    name: "getTrustedIssuerClaimTopics",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTrustedIssuers",
    outputs: [{ internalType: "contract IClaimIssuer[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "issuer", type: "address" },
      { internalType: "uint256", name: "claimTopic", type: "uint256" },
    ],
    name: "hasClaimTopic",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "issuer", type: "address" },
    ],
    name: "isTrustedIssuer",
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
      { internalType: "contract IClaimIssuer", name: "trustedIssuer", type: "address" },
    ],
    name: "removeTrustedIssuer",
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
      { internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "contract IClaimIssuer", name: "trustedIssuer", type: "address" },
      { internalType: "uint256[]", name: "claimTopics", type: "uint256[]" },
    ],
    name: "updateIssuerClaimTopics",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

export default trustedIssuersRegistryAbi
