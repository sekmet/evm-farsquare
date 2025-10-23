/**
 * ERC-3643 Claim Topics Registry ABI
 *
 * Registry contract for managing claim topics used in identity verification
 * Manages the topics that can be claimed by identities for KYC/AML verification
 */

export const claimTopicsRegistryAbi = [
  // Errors
  {
    inputs: [],
    name: "TopicAlreadyExists",
    type: "error",
  },
  {
    inputs: [],
    name: "TopicDoesNotExist",
    type: "error",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "claimTopic", type: "uint256" },
    ],
    name: "ClaimTopicAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "claimTopic", type: "uint256" },
    ],
    name: "ClaimTopicRemoved",
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
      { internalType: "uint256", name: "claimTopic", type: "uint256" },
    ],
    name: "addClaimTopic",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getClaimTopics",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
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
      { internalType: "uint256", name: "claimTopic", type: "uint256" },
    ],
    name: "removeClaimTopic",
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
] as const

export default claimTopicsRegistryAbi
