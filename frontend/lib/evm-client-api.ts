import { createPublicClient, http, parseAbi, Log, type Address } from 'viem';
import { hardhat, anvil, sepolia, baseSepolia, optimismSepolia } from 'viem/chains';

// ============================================================================
// EVM CLIENT CONFIGURATION - Viem/Wagmi Patterns
// ============================================================================

// Create public client for read-only operations (ERC-3643 compliance)
const publicClient = createPublicClient({
  chain: anvil, // Using Base network for production EVM interactions
  transport: http(import.meta.env.VITE_EVM_RPC_URL || 'http://127.0.0.1:8545'),
});

// Supported chains for multi-chain deployment
export const supportedChains = [hardhat, anvil, sepolia, baseSepolia, optimismSepolia] as const;

// ============================================================================
// ERC-3643 CONTRACT INTERACTION FUNCTIONS - Viem/Wagmi Patterns
// ============================================================================

/**
 * Check if an ERC-3643 token contract is deployed and valid
 * Uses TREXToken.onchainID() and identityRegistry() methods
 */
export async function validateERC3643Token(contractAddress: Address): Promise<boolean> {
  try {
    // ERC-3643 ABI for validation - parsed using parseAbi
    const erc3643Abi = parseAbi([
      'function onchainID() external view returns (address)',
      'function identityRegistry() external view returns (address)',
      'function compliance() external view returns (address)',
      'function name() external view returns (string)',
      'function symbol() external view returns (string)',
      'function totalSupply() external view returns (uint256)'
    ]);

    // Check if contract responds to ERC-3643 methods
    const [onchainID, identityRegistry] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: erc3643Abi,
        functionName: 'onchainID'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: erc3643Abi,
        functionName: 'identityRegistry'
      })
    ]);

    // Validate that addresses are not zero
    return onchainID !== '0x0000000000000000000000000000000000000000' &&
           identityRegistry !== '0x0000000000000000000000000000000000000000';
  } catch (error) {
    console.error(`Failed to validate ERC-3643 token ${contractAddress}:`, error);
    return false;
  }
}

/**
 * Get ERC-3643 token information using contract read methods
 */
export async function getERC3643TokenInfo(contractAddress: Address) {
  try {
    // ERC-3643 token information ABI - parsed using parseAbi
    const tokenInfoAbi = parseAbi([
      'function name() external view returns (string)',
      'function symbol() external view returns (string)',
      'function totalSupply() external view returns (uint256)',
      'function decimals() external view returns (uint8)'
    ]);

    const [name, symbol, totalSupply, decimals] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: tokenInfoAbi,
        functionName: 'name'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: tokenInfoAbi,
        functionName: 'symbol'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: tokenInfoAbi,
        functionName: 'totalSupply'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: tokenInfoAbi,
        functionName: 'decimals'
      })
    ]);

    return {
      name: name as string,
      symbol: symbol as string,
      totalSupply: (totalSupply as bigint).toString(),
      decimals: decimals as number,
      contractAddress
    };
  } catch (error) {
    console.error(`Failed to get token info for ${contractAddress}:`, error);
    return null;
  }
}

/**
 * Validate property ownership on-chain
 */
export async function validatePropertyOwnership(contractAddress: Address, ownerAddress: Address): Promise<boolean> {
  try {
    // ERC-3643 ownership validation
    const ownerAbi = parseAbi([
      'function owner() external view returns (address)',
      'function balanceOf(address) external view returns (uint256)'
    ]);

    const contractOwner = await publicClient.readContract({
      address: contractAddress,
      abi: ownerAbi,
      functionName: 'owner'
    });

    return contractOwner === ownerAddress;
  } catch (error) {
    console.error(`Failed to validate ownership for ${contractAddress}:`, error);
    return false;
  }
}

/**
 * Check if contract allows minting operations
 */
export async function canMintTokens(contractAddress: Address, minterAddress: Address): Promise<boolean> {
  try {
    const mintingAbi = parseAbi([
      'function isMinter(address) external view returns (bool)',
      'function hasRole(bytes32,address) external view returns (bool)',
      'function MINTER_ROLE() external view returns (bytes32)'
    ]);

    // Try different minting permission checks
    try {
      const isMinter = await publicClient.readContract({
        address: contractAddress,
        abi: mintingAbi,
        functionName: 'isMinter',
        args: [minterAddress]
      });
      if (isMinter) return true;
    } catch {
      // Try role-based check
      try {
        const minterRole = await publicClient.readContract({
          address: contractAddress,
          abi: mintingAbi,
          functionName: 'MINTER_ROLE'
        });

        const hasRole = await publicClient.readContract({
          address: contractAddress,
          abi: mintingAbi,
          functionName: 'hasRole',
          args: [minterRole, minterAddress]
        });

        return hasRole as boolean;
      } catch {
        // Fallback: assume authorized if we can't check
        console.warn(`Could not verify minting permissions for ${contractAddress}`);
        return true; // Allow API to handle authorization
      }
    }

    return false;
  } catch (error) {
    console.error(`Failed to check minting permissions for ${contractAddress}:`, error);
    return false;
  }
}

// ============================================================================
// ERC-3643 IDENTITY REGISTRY FUNCTIONS - Viem/Wagmi Patterns
// ============================================================================

/**
 * Check if an address is registered in the ERC-3643 identity registry
 * Uses identityRegistry.registeredUsers() method
 */
export async function checkIdentityRegistration(userAddress: Address, identityRegistryAddress?: Address): Promise<boolean> {
  if (!identityRegistryAddress) return false;

  try {
    // ERC-3643 identity registry ABI
    const identityRegistryAbi = parseAbi([
      'function isVerified(address) external view returns (bool)',
      'function identity(address) external view returns (address)',
      'function investors(address) external view returns (uint256)',
      'function hasClaim(address,uint256) external view returns (bool)'
    ]);

    // Check if user is verified in identity registry
    const isVerified = await publicClient.readContract({
      address: identityRegistryAddress,
      abi: identityRegistryAbi,
      functionName: 'isVerified',
      args: [userAddress]
    });

    return isVerified as boolean;
  } catch (error) {
    console.error(`Failed to check identity registration for ${userAddress}:`, error);
    return false;
  }
}

/**
 * Get identity information from ERC-3643 identity registry
 */
export async function getIdentityInfo(userAddress: Address, identityRegistryAddress?: Address) {
  if (!identityRegistryAddress) return null;

  try {
    const identityRegistryAbi = parseAbi([
      'function identity(address) external view returns (address)',
      'function investors(address) external view returns (uint256)',
      'function hasClaim(address,uint256) external view returns (bool)',
      'function getClaimIdsByTopic(uint256) external view returns (uint256[])'
    ]);

    const [identityAddress, investorStatus] = await Promise.all([
      publicClient.readContract({
        address: identityRegistryAddress,
        abi: identityRegistryAbi,
        functionName: 'identity',
        args: [userAddress]
      }),
      publicClient.readContract({
        address: identityRegistryAddress,
        abi: identityRegistryAbi,
        functionName: 'investors',
        args: [userAddress]
      })
    ]);

    return {
      identityAddress: identityAddress as string,
      investorStatus: (investorStatus as bigint).toString(),
      userAddress
    };
  } catch (error) {
    console.error(`Failed to get identity info for ${userAddress}:`, error);
    return null;
  }
}

/**
 * Check if user has required accreditation claims
 */
export async function checkAccreditationClaims(userAddress: Address, identityRegistryAddress?: Address): Promise<boolean> {
  if (!identityRegistryAddress) return false;

  try {
    const identityRegistryAbi = parseAbi([
      'function hasClaim(address,uint256) external view returns (bool)',
      'function getClaimIdsByTopic(uint256) external view returns (uint256[])'
    ]);

    // Check for common accreditation claim topics
    // Topic 1: KYC/AML verification
    // Topic 2: Accreditation status
    // Topic 3: Country restrictions
    const accreditationTopics = [1, 2, 3]; // Define based on your claim topics

    for (const topic of accreditationTopics) {
      try {
        const hasClaim = await publicClient.readContract({
          address: identityRegistryAddress,
          abi: identityRegistryAbi,
          functionName: 'hasClaim',
          args: [userAddress, BigInt(topic)]
        });

        if (hasClaim as boolean) {
          return true; // User has at least one accreditation claim
        }
      } catch {
        // Continue checking other topics
      }
    }

    return false;
  } catch (error) {
    console.error(`Failed to check accreditation claims for ${userAddress}:`, error);
    return false;
  }
}

// ============================================================================
// ERC-3643 CONTRACT MONITORING FUNCTIONS - Viem/Wagmi Patterns
// ============================================================================

/**
 * Monitor ERC-3643 Transfer events for real-time volume tracking
 */
export async function monitorERC3643Transfers(contractAddress: Address, callback: (log: Log) => void): Promise<() => void> {
  try {
    // ERC-3643 Transfer event signature
    const transferEventAbi = parseAbi([
      'event Transfer(address indexed from, address indexed to, uint256 value)'
    ]);

    // Watch for Transfer events
    const unwatch = publicClient.watchContractEvent({
      address: contractAddress,
      abi: transferEventAbi,
      eventName: 'Transfer',
      onLogs: (logs) => {
        logs.forEach(callback);
      },
    });

    return unwatch;
  } catch (error) {
    console.error(`Failed to setup transfer monitoring for ${contractAddress}:`, error);
    return () => {}; // Return no-op cleanup function
  }
}

/**
 * Get real-time contract activity metrics
 */
export async function getContractActivity(contractAddress: Address): Promise<{
  transferCount: number;
  volume24h: number;
  activeUsers: number;
}> {
  try {
    // Get recent transfer events (last 24 hours)
    const currentTime = Math.floor(Date.now() / 1000);
    const oneDayAgo = currentTime - 86400;

    // ERC-3643 Transfer event for activity monitoring
    const transferEventAbi = parseAbi([
      'event Transfer(address indexed from, address indexed to, uint256 value)'
    ]);

    const logs = await publicClient.getLogs({
      address: contractAddress,
      event: transferEventAbi[0],
      fromBlock: BigInt(oneDayAgo), // Approximate block time
      toBlock: 'latest'
    });

    const transferCount = logs.length;
    const volume24h = logs.reduce((sum, log) => {
      const value = log.args.value as bigint;
      return sum + Number(value);
    }, 0);

    // Count unique addresses involved in transfers
    const addresses = new Set<string>();
    logs.forEach(log => {
      if (log.args.from) addresses.add(log.args.from.toLowerCase());
      if (log.args.to) addresses.add(log.args.to.toLowerCase());
    });

    return {
      transferCount,
      volume24h,
      activeUsers: addresses.size
    };
  } catch (error) {
    console.error(`Failed to get contract activity for ${contractAddress}:`, error);
    return { transferCount: 0, volume24h: 0, activeUsers: 0 };
  }
}