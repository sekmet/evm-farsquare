/**
 * ERC-3643 Identity Factory ABI
 * 
 * ABI for Identity Factory contract
 * Used for creating OnchainID identity contracts
 */

export const identityFactoryAbi = [
  // Write functions
  {
    name: 'createIdentity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_salt', type: 'bytes32' },
    ],
    outputs: [{ name: 'identityAddress', type: 'address' }],
  },
  // Read functions
  {
    name: 'predictIdentityAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_salt', type: 'bytes32' },
    ],
    outputs: [{ name: 'predicted', type: 'address' }],
  },
  // Events
  {
    name: 'IdentityCreated',
    type: 'event',
    inputs: [
      { name: 'identity', type: 'address', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'salt', type: 'bytes32', indexed: true },
    ],
  },
] as const

export default identityFactoryAbi
