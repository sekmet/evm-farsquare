/**
 * ERC-3643 Identity Registry ABI
 * 
 * Minimal ABI for Identity Registry contract interactions
 * Used for registering identities and checking verification status
 */

export const identityRegistryAbi = [
  // Read functions
  {
    name: 'contains',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_userAddress', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isVerified',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_userAddress', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'identity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_userAddress', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'investorCountry',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_userAddress', type: 'address' }],
    outputs: [{ name: '', type: 'uint16' }],
  },
  // Write functions
  {
    name: 'registerIdentity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_userAddress', type: 'address' },
      { name: '_identity', type: 'address' },
      { name: '_country', type: 'uint16' },
    ],
    outputs: [],
  },
  // Events
  {
    name: 'IdentityRegistered',
    type: 'event',
    inputs: [
      { name: 'investorAddress', type: 'address', indexed: true },
      { name: 'identity', type: 'address', indexed: true },
    ],
  },
] as const

export default identityRegistryAbi
