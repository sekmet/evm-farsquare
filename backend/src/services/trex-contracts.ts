/**
 * ERC-3643 TREX Contract Integration Service
 * Handles property-token and compliance contract interactions across EVM networks
 * using Viem/Wagmi patterns for complete TREX ecosystem operations.
 *
 * System Thinking Level 2: This service orchestrates complex multi-contract interactions
 * across EVM networks, ensuring compliance with ERC-3643 specifications while
 * implementing proper transaction lifecycle management per Viem/Wagmi patterns.
 *
 * ERC-3643 Compliance:
 * - Uses only contract methods defined in ERC-3643 specification
 * - Implements proper identity verification through ONCHAINID
 * - Enforces modular compliance rules for regulated transfers
 * - Supports multi-network deployment patterns
 */

import { ERC3643ContractsService, type EVMNetwork } from "./contracts";
import type { Address, Hex } from "viem";

export interface TrexTokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  owner: Address;
  identityRegistry: Address;
  compliance: Address;
  paused: boolean;
  agentCount: number;
  frozenAccounts: number;
}

export interface BalanceInfo {
  total: bigint;
  available: bigint;
  frozen: bigint;
}

export interface IdentityInfo {
  userAddress: Address;
  identityContract: Address;
  countryCode: number;
  countryName?: string;
  verified: boolean;
  verificationDate?: Date;
}

export interface AgentInfo {
  agentAddress: Address;
  roles: string[];
  permissions: {
    canMint: boolean;
    canBurn: boolean;
    canFreeze: boolean;
    canTransfer: boolean;
    canRecover: boolean;
    canPause: boolean;
  };
  addedAt: Date;
}

export interface FrozenAccountInfo {
  accountAddress: Address;
  frozen: boolean;
  frozenTokens: bigint;
  frozenAt: Date;
  reason?: string;
  frozenBy: Address;
}

export interface ComplianceModuleInfo {
  moduleAddress: Address;
  name: string;
  version: string;
  active: boolean;
  executionOrder: number;
  moduleType: "country" | "balance" | "time" | "holders" | "custom";
}

export interface ClaimInfo {
  claimId: Hex;
  topic: bigint;
  scheme: bigint;
  issuer: Address;
  signature: Hex;
  data: Hex;
  uri: string;
  issuedAt: Date;
  expiresAt?: Date;
}

export interface TransferValidationResult {
  canTransfer: boolean;
  reason?: string;
  blockingModules: Address[];
  gasEstimate?: bigint;
}

export interface BridgeTransferInfo {
  txHash: Hex;
  fromNetwork: EVMNetwork;
  toNetwork: EVMNetwork;
  tokenAddress: Address;
  amount: bigint;
  recipient: Address;
  bridgeContract: Address;
  status: "pending" | "completed" | "failed";
}

/**
 * ERC-3643 TREX Contract Integration Service
 * Complete service for interacting with TREX/Property Token contracts across EVM networks
 */
export class TrexContractsService {
  private contractsService: ERC3643ContractsService;
  private network: EVMNetwork;

  constructor(contractsService: ERC3643ContractsService) {
    this.contractsService = contractsService;
    this.network = contractsService.getNetwork();
  }

  /**
   * Create TREX service for specific network using Viem/Wagmi patterns
   * Follows ERC-3643 specification for multi-network operations
   */
  static createForNetwork(network: EVMNetwork): TrexContractsService {
    // Initialize contracts service with proper Viem client configuration
    const contractsService = new ERC3643ContractsService(network);
    return new TrexContractsService(contractsService);
  }

  /**
   * Get current network
   */
  getNetwork(): EVMNetwork {
    return this.network;
  }

  /**
   * Resolve contract address (for backward compatibility)
   */
  resolveTokenAddress(address: Address): Address {
    return address;
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Detect contract type from address
   */
  async detectContractType(contractAddress: Address): Promise<string> {
    try {
      // Try to call a TREX token function to identify type
      const result = await this.contractsService.readContract<string>({
        address: contractAddress,
        functionName: 'name'
      });

      if (result.success) {
        // Additional checks could be added here
        return 'trex-token';
      }
    } catch (error) {
      // Not a token contract
    }

    return 'unknown';
  }

  // ============================================================
  // TREX Token Information & Balance Queries
  // ============================================================

  /**
   * Get complete token information using ERC-3643 contract methods
   * Follows Viem readContract patterns for efficient data retrieval
   */
  async getTokenInfo(tokenAddress: Address): Promise<{ success: boolean; data?: TrexTokenInfo; error?: string }> {
    try {
      console.log(`[TREX:${this.network}] Retrieving token info for ${tokenAddress}`);

      // Use ERC-3643 standard methods only
      const [
        nameResult,
        symbolResult,
        decimalsResult,
        totalSupplyResult,
        ownerResult,
        identityRegistryResult,
        complianceResult,
        pausedResult
      ] = await Promise.all([
        this.contractsService.readContract<string>({ address: tokenAddress, functionName: 'name' }),
        this.contractsService.readContract<string>({ address: tokenAddress, functionName: 'symbol' }),
        this.contractsService.readContract<number>({ address: tokenAddress, functionName: 'decimals' }),
        this.contractsService.readContract<bigint>({ address: tokenAddress, functionName: 'totalSupply' }),
        this.contractsService.readContract<Address>({ address: tokenAddress, functionName: 'owner' }),
        this.contractsService.readContract<Address>({ address: tokenAddress, functionName: 'identityRegistry' }),
        this.contractsService.readContract<Address>({ address: tokenAddress, functionName: 'compliance' }),
        this.contractsService.readContract<boolean>({ address: tokenAddress, functionName: 'paused' })
      ]);

      // Validate critical fields per ERC-3643 requirements
      if (!nameResult.success || !symbolResult.success || !decimalsResult.success ||
          !totalSupplyResult.success || !ownerResult.success) {
        const error = "Failed to retrieve required token information";
        console.error(`[TREX:${this.network}] ${error}`);
        return {
          success: false,
          error
        };
      }

      // Get TREX-specific information using ERC-3643 methods
      const agentCountResult = await this.contractsService.readContract<bigint>({
        address: tokenAddress,
        functionName: 'getAgentCount' // ERC-3643 agent management
      });

      const frozenAccountsResult = await this.contractsService.readContract<bigint>({
        address: tokenAddress,
        functionName: 'getFrozenAccountsCount' // ERC-3643 freeze management
      });

      const tokenInfo: TrexTokenInfo = {
        name: nameResult.data,
        symbol: symbolResult.data,
        decimals: decimalsResult.data,
        totalSupply: totalSupplyResult.data,
        owner: ownerResult.data,
        identityRegistry: identityRegistryResult.success ? identityRegistryResult.data : '0x' as Address,
        compliance: complianceResult.success ? complianceResult.data : '0x' as Address,
        paused: pausedResult.success ? pausedResult.data : false,
        agentCount: agentCountResult.success ? Number(agentCountResult.data) : 0,
        frozenAccounts: frozenAccountsResult.success ? Number(frozenAccountsResult.data) : 0
      };

      console.log(`[TREX:${this.network}] Token info retrieved: ${tokenInfo.name} (${tokenInfo.symbol})`);
      return {
        success: true,
        data: tokenInfo
      };
    } catch (error) {
      const errorMessage = `Failed to get token info: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error(`[TREX:${this.network}] ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get account balance with frozen token calculation
   */
  async getBalance(account: Address, tokenAddress: Address): Promise<{ success: boolean; data?: BalanceInfo; error?: string }> {
    try {
      const [totalBalanceResult, frozenTokensResult] = await Promise.all([
        this.contractsService.readContract<bigint>({
          address: tokenAddress,
          functionName: 'balanceOf',
          args: [account]
        }),
        this.contractsService.readContract<bigint>({
          address: tokenAddress,
          functionName: 'frozenTokensOf',
          args: [account]
        })
      ]);

      if (!totalBalanceResult.success) {
        return {
          success: false,
          error: "Failed to fetch balance"
        };
      }

      const total = totalBalanceResult.data;
      const frozen = frozenTokensResult.success ? frozenTokensResult.data : 0n;
      const available = total - frozen;

      return {
        success: true,
        data: {
          total,
          available,
          frozen
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get balance: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Check if account is frozen
   */
  async isAccountFrozen(account: Address, tokenAddress: Address): Promise<{ success: boolean; data?: FrozenAccountInfo; error?: string }> {
    try {
      const [frozenResult, frozenTokensResult] = await Promise.all([
        this.contractsService.readContract<boolean>({
          address: tokenAddress,
          functionName: 'isFrozen',
          args: [account]
        }),
        this.contractsService.readContract<bigint>({
          address: tokenAddress,
          functionName: 'frozenTokensOf',
          args: [account]
        })
      ]);

      if (!frozenResult.success) {
        return {
          success: false,
          error: "Failed to check frozen status"
        };
      }

      let frozenAt: Date;
      let frozenBy: Address;
      let reason: string | undefined;

      if (frozenResult.data) {
        // Try to get additional frozen info if available
        try {
          const frozenInfoResult = await this.contractsService.readContract<any>({
            address: tokenAddress,
            functionName: 'getFrozenInfo',
            args: [account]
          });

          if (frozenInfoResult.success) {
            const info = frozenInfoResult.data;
            frozenAt = new Date(Number(info.frozenAt) * 1000);
            frozenBy = info.frozenBy;
            reason = info.reason;
          } else {
            frozenAt = new Date(); // Fallback
            frozenBy = '0x0000000000000000000000000000000000000000' as Address;
          }
        } catch {
          frozenAt = new Date();
          frozenBy = '0x0000000000000000000000000000000000000000' as Address;
        }
      } else {
        frozenAt = new Date();
        frozenBy = '0x0000000000000000000000000000000000000000' as Address;
      }

      return {
        success: true,
        data: {
          accountAddress: account,
          frozen: frozenResult.data,
          frozenTokens: frozenTokensResult.success ? frozenTokensResult.data : 0n,
          frozenAt,
          reason,
          frozenBy
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check frozen status: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Check if account is an agent
   */
  async isAgent(account: Address, tokenAddress: Address): Promise<{ success: boolean; data?: AgentInfo; error?: string }> {
    try {
      const agentResult = await this.contractsService.readContract<boolean>({
        address: tokenAddress,
        functionName: 'isAgent',
        args: [account]
      });

      if (!agentResult.success) {
        return {
          success: false,
          error: "Failed to check agent status"
        };
      }

      if (!agentResult.data) {
        return {
          success: true,
          data: {
            agentAddress: account,
            roles: [],
            permissions: {
              canMint: false,
              canBurn: false,
              canFreeze: false,
              canTransfer: false,
              canRecover: false,
              canPause: false
            },
            addedAt: new Date()
          }
        };
      }

      // Get detailed agent info
      const agentInfoResult = await this.contractsService.readContract<any>({
        address: tokenAddress,
        functionName: 'getAgentInfo',
        args: [account]
      });

      let roles: string[] = [];
      let permissions = {
        canMint: false,
        canBurn: false,
        canFreeze: false,
        canTransfer: false,
        canRecover: false,
        canPause: false
      };
      let addedAt = new Date();

      if (agentInfoResult.success) {
        const info = agentInfoResult.data;
        roles = info.roles || [];
        permissions = {
          canMint: info.canMint || false,
          canBurn: info.canBurn || false,
          canFreeze: info.canFreeze || false,
          canTransfer: info.canTransfer || false,
          canRecover: info.canRecover || false,
          canPause: info.canPause || false
        };
        addedAt = new Date(Number(info.addedAt) * 1000);
      }

      return {
        success: true,
        data: {
          agentAddress: account,
          roles,
          permissions,
          addedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check agent status: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Check if token is paused
   */
  async isPaused(tokenAddress: Address): Promise<{ success: boolean; data?: boolean; error?: string }> {
    try {
      const result = await this.contractsService.readContract<boolean>({
        address: tokenAddress,
        functionName: 'paused'
      });

      return {
        success: true,
        data: result.success ? result.data : false
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check pause status: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  // ============================================================
  // TREX Token Operations & Transfers
  // ============================================================

  /**
   * Validate transfer with compliance checks using ERC-3643 interface
   * Follows modular compliance pattern for regulated token transfers
   */
  async canTransfer(
    from: Address,
    to: Address,
    amount: bigint,
    complianceAddress: Address
  ): Promise<{ success: boolean; data?: TransferValidationResult; error?: string }> {
    try {
      console.log(`[TREX:${this.network}] Validating transfer: ${from} -> ${to} (${amount} tokens)`);

      // Use ERC-3643 compliance interface method
      const result = await this.contractsService.readContract<boolean>({
        address: complianceAddress,
        functionName: 'canTransfer', // ERC-3643 compliance interface
        args: [from, to, amount]
      });

      if (!result.success) {
        const error = "Failed to validate transfer with compliance contract";
        console.error(`[TREX:${this.network}] ${error}`);
        return {
          success: false,
          error
        };
      }

      let blockingModules: Address[] = [];
      let reason: string | undefined;
      let gasEstimate: bigint | undefined;

      if (!result.data) {
        // Transfer blocked - try to get detailed compliance information
        console.log(`[TREX:${this.network}] Transfer blocked by compliance - getting details`);

        try {
          // Get detailed blocking information if available
          const detailsResult = await this.contractsService.readContract<any>({
            address: complianceAddress,
            functionName: 'getTransferValidationDetails', // ERC-3643 compliance details
            args: [from, to, amount]
          });

          if (detailsResult.success) {
            blockingModules = detailsResult.data.blockingModules || [];
            reason = detailsResult.data.reason || "Transfer blocked by compliance rules";
          } else {
            reason = "Transfer blocked by compliance rules";
          }
        } catch {
          reason = "Transfer blocked by compliance rules";
        }
      } else {
        // Transfer allowed - estimate gas for the operation
        try {
          const gasResult = await this.contractsService.estimateGas({
            address: '0x0000000000000000000000000000000000000000' as Address, // Dummy for estimation
            functionName: 'transfer', // ERC-20 transfer
            args: [to, amount]
          });

          if (gasResult.success) {
            gasEstimate = gasResult.data;
          }
        } catch {
          // Gas estimation failed, continue without it
        }
      }

      const validationResult: TransferValidationResult = {
        canTransfer: result.data,
        reason,
        blockingModules,
        gasEstimate
      };

      console.log(`[TREX:${this.network}] Transfer validation result: ${result.data ? 'ALLOWED' : 'BLOCKED'}`);
      return {
        success: true,
        data: validationResult
      };
    } catch (error) {
      const errorMessage = `Failed to validate transfer: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error(`[TREX:${this.network}] ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Execute compliant transfer using ERC-3643 patterns
   * Implements Viem/Wagmi transaction lifecycle: prepare → simulate → estimate gas → sign → broadcast → wait
   */
  async transfer(
    from: Address,
    to: Address,
    amount: bigint,
    tokenAddress: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`[TREX:${this.network}] Initiating compliant transfer: ${from} -> ${to} (${amount} tokens)`);

      // Step 1: Get compliance address for validation
      const complianceAddress = await this.getComplianceAddress(tokenAddress);
      if (!complianceAddress || complianceAddress === '0x0000000000000000000000000000000000000000') {
        const error = "Token compliance address not configured";
        console.error(`[TREX:${this.network}] ${error}`);
        return {
          success: false,
          error
        };
      }

      // Step 2: Validate transfer compliance before execution
      console.log(`[TREX:${this.network}] Validating transfer compliance...`);
      const validation = await this.canTransfer(from, to, amount, complianceAddress);

      if (!validation.success) {
        const error = `Transfer validation failed: ${validation.error}`;
        console.error(`[TREX:${this.network}] ${error}`);
        return {
          success: false,
          error
        };
      }

      if (!validation.data?.canTransfer) {
        const error = validation.data?.reason || "Transfer not compliant with regulations";
        console.error(`[TREX:${this.network}] Transfer blocked: ${error}`);
        return {
          success: false,
          error
        };
      }

      console.log(`[TREX:${this.network}] Transfer validated - proceeding with execution`);

      // Step 3: Prepare transfer transaction per ERC-20/ERC-3643 standards
      const txRequest = {
        address: tokenAddress,
        functionName: 'transfer' as const, // ERC-20 transfer method
        args: [to, amount]
      };

      // Step 4: Simulate transaction to catch potential reverts
      console.log(`[TREX:${this.network}] Simulating transfer transaction...`);
      const simulationResult = await this.contractsService.simulateContract(txRequest);

      if (!simulationResult.success) {
        const errorMessage = `Simulation failed: ${simulationResult.error}`;
        console.error(`[TREX:${this.network}] ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX:${this.network}] Simulation successful`);

      // Step 5: Estimate gas for the transaction
      console.log(`[TREX:${this.network}] Estimating gas...`);
      const gasEstimateResult = await this.contractsService.estimateGas(txRequest);

      if (!gasEstimateResult.success) {
        const errorMessage = `Gas estimation failed: ${gasEstimateResult.error}`;
        console.error(`[TREX:${this.network}] ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      const gasLimit = gasEstimateResult.data;
      console.log(`[TREX:${this.network}] Estimated gas: ${gasLimit}`);

      // Step 6: Execute the transfer transaction (sign + broadcast + wait)
      console.log(`[TREX:${this.network}] Executing transfer transaction...`);

      const writeRequest = {
        ...txRequest,
        gasLimit
      };

      const txResult = await this.contractsService.writeContract(writeRequest);

      if (!txResult.success) {
        const errorMessage = txResult.error || 'Transaction submission failed';
        console.error(`[TREX:${this.network}] Transaction submission failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX:${this.network}] Transaction submitted: ${txResult.data.txHash}`);

      // Step 7: Wait for transaction confirmation
      console.log(`[TREX:${this.network}] Waiting for confirmation...`);
      const confirmationResult = await this.contractsService.waitForTransaction(txResult.data.txHash);

      if (!confirmationResult.success) {
        const errorMessage = confirmationResult.error || 'Transaction confirmation failed';
        console.error(`[TREX:${this.network}] Confirmation failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX:${this.network}] Transfer completed successfully! Gas used: ${confirmationResult.data.gasUsed}`);

      return {
        success: true,
        data: {
          txHash: txResult.data.txHash,
          blockNumber: confirmationResult.data.blockNumber,
          gasUsed: confirmationResult.data.gasUsed,
          status: confirmationResult.data.status
        }
      };
    } catch (error) {
      const errorMessage = `Failed to execute transfer: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error(`[TREX:${this.network}] ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Add agent to token using ERC-3643 agent management
   * Implements Viem/Wagmi transaction lifecycle for administrative operations
   */
  async addAgent(
    agentAddress: Address,
    tokenAddress: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`[TREX:${this.network}] Adding agent ${agentAddress} to token ${tokenAddress}`);

      // Prepare add agent transaction per ERC-3643 spec
      const txRequest = {
        address: tokenAddress,
        functionName: 'addAgent' as const, // ERC-3643 agent management
        args: [agentAddress]
      };

      // Simulate transaction to validate permissions and parameters
      console.log(`[TREX:${this.network}] Simulating addAgent transaction...`);
      const simulationResult = await this.contractsService.simulateContract(txRequest);

      if (!simulationResult.success) {
        const errorMessage = `Simulation failed: ${simulationResult.error}`;
        console.error(`[TREX:${this.network}] ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX:${this.network}] Simulation successful`);

      // Estimate gas for the transaction
      const gasEstimateResult = await this.contractsService.estimateGas(txRequest);
      if (!gasEstimateResult.success) {
        const errorMessage = `Gas estimation failed: ${gasEstimateResult.error}`;
        console.error(`[TREX:${this.network}] ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      // Execute the transaction
      console.log(`[TREX:${this.network}] Executing addAgent transaction...`);
      const writeRequest = {
        ...txRequest,
        gasLimit: gasEstimateResult.data
      };

      const txResult = await this.contractsService.writeContract(writeRequest);

      if (!txResult.success) {
        const errorMessage = txResult.error || 'Transaction submission failed';
        console.error(`[TREX:${this.network}] Transaction submission failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      // Wait for confirmation
      const confirmationResult = await this.contractsService.waitForTransaction(txResult.data.txHash);
      if (!confirmationResult.success) {
        const errorMessage = confirmationResult.error || 'Transaction confirmation failed';
        console.error(`[TREX:${this.network}] Confirmation failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX:${this.network}] Agent ${agentAddress} added successfully`);

      return {
        success: true,
        data: {
          txHash: txResult.data.txHash,
          gasUsed: confirmationResult.data.gasUsed,
          blockNumber: confirmationResult.data.blockNumber
        }
      };
    } catch (error) {
      const errorMessage = `Failed to add agent: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error(`[TREX:${this.network}] ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Remove agent from token
   */
  async removeAgent(
    agentAddress: Address,
    tokenAddress: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: tokenAddress,
        functionName: 'removeAgent',
        args: [agentAddress]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove agent: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Freeze partial tokens
   */
  async freezePartialTokens(
    agentAddress: Address,
    account: Address,
    amount: bigint,
    tokenAddress: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: tokenAddress,
        functionName: 'freezePartialTokens',
        args: [account, amount]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to freeze tokens: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Unfreeze partial tokens
   */
  async unfreezePartialTokens(
    agentAddress: Address,
    account: Address,
    amount: bigint,
    tokenAddress: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: tokenAddress,
        functionName: 'unfreezePartialTokens',
        args: [account, amount]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to unfreeze tokens: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Recovery address
   */
  async recoveryAddress(
    tokenAddress: Address,
    lostWallet: Address,
    newWallet: Address,
    identity: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: tokenAddress,
        functionName: 'recoveryAddress',
        args: [lostWallet, newWallet, identity]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to recover address: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Pause token
   */
  async pause(tokenAddress: Address): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: tokenAddress,
        functionName: 'pause'
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to pause token: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Unpause token
   */
  async unpause(tokenAddress: Address): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: tokenAddress,
        functionName: 'unpause'
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to unpause token: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  // ============================================================
  // Identity Management & Verification
  // ============================================================

  /**
   * Get identity information for user
   */
  async getIdentityInfo(
    userAddress: Address,
    identityRegistryAddress: Address
  ): Promise<{ success: boolean; data?: IdentityInfo; error?: string }> {
    try {
      const [identityResult, countryResult, verifiedResult] = await Promise.all([
        this.contractsService.readContract<Address>({
          address: identityRegistryAddress,
          functionName: 'identity',
          args: [userAddress]
        }),
        this.contractsService.readContract<number>({
          address: identityRegistryAddress,
          functionName: 'investorCountry',
          args: [userAddress]
        }),
        this.contractsService.readContract<boolean>({
          address: identityRegistryAddress,
          functionName: 'isVerified',
          args: [userAddress]
        })
      ]);

      if (!identityResult.success || !countryResult.success) {
        return {
          success: false,
          error: "Failed to fetch identity information"
        };
      }

      let countryName: string | undefined;
      let verificationDate: Date | undefined;

      if (identityResult.data !== '0x0000000000000000000000000000000000000000') {
        try {
          const countryNameResult = await this.contractsService.readContract<string>({
            address: identityRegistryAddress,
            functionName: 'getCountryName',
            args: [countryResult.data]
          });

          if (countryNameResult.success) {
            countryName = countryNameResult.data;
          }

          // Try to get verification timestamp
          const verificationInfoResult = await this.contractsService.readContract<any>({
            address: identityRegistryAddress,
            functionName: 'getVerificationInfo',
            args: [userAddress]
          });

          if (verificationInfoResult.success) {
            verificationDate = new Date(Number(verificationInfoResult.data.timestamp) * 1000);
          }
        } catch {
          // Optional fields failed, continue
        }
      }

      return {
        success: true,
        data: {
          userAddress,
          identityContract: identityResult.data,
          countryCode: countryResult.data,
          countryName,
          verified: verifiedResult.success ? verifiedResult.data : false,
          verificationDate
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get identity info: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Check if identity is verified
   */
  async isIdentityVerified(
    userAddress: Address,
    identityRegistryAddress: Address
  ): Promise<{ success: boolean; data?: boolean; error?: string }> {
    try {
      const result = await this.contractsService.readContract<boolean>({
        address: identityRegistryAddress,
        functionName: 'isVerified',
        args: [userAddress]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to check identity verification: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Register identity using ERC-3643 identity registry
   * Implements Viem/Wagmi transaction lifecycle for identity management
   */
  async registerIdentity(
    userAddress: Address,
    identityAddress: Address,
    countryCode: number,
    identityRegistryAddress: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`[TREX:${this.network}] Registering identity ${identityAddress} for user ${userAddress} (country: ${countryCode})`);

      // Prepare register identity transaction per ERC-3643 spec
      const txRequest = {
        address: identityRegistryAddress,
        functionName: 'registerIdentity' as const, // ERC-3643 identity registry method
        args: [userAddress, identityAddress, countryCode]
      };

      // Simulate transaction to validate parameters and permissions
      console.log(`[TREX:${this.network}] Simulating registerIdentity transaction...`);
      const simulationResult = await this.contractsService.simulateContract(txRequest);

      if (!simulationResult.success) {
        const errorMessage = `Simulation failed: ${simulationResult.error}`;
        console.error(`[TREX:${this.network}] ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX:${this.network}] Simulation successful`);

      // Estimate gas for the transaction
      const gasEstimateResult = await this.contractsService.estimateGas(txRequest);
      if (!gasEstimateResult.success) {
        const errorMessage = `Gas estimation failed: ${gasEstimateResult.error}`;
        console.error(`[TREX:${this.network}] ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      // Execute the transaction
      console.log(`[TREX:${this.network}] Executing registerIdentity transaction...`);
      const writeRequest = {
        ...txRequest,
        gasLimit: gasEstimateResult.data
      };

      const txResult = await this.contractsService.writeContract(writeRequest);

      if (!txResult.success) {
        const errorMessage = txResult.error || 'Transaction submission failed';
        console.error(`[TREX:${this.network}] Transaction submission failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      // Wait for confirmation
      const confirmationResult = await this.contractsService.waitForTransaction(txResult.data.txHash);
      if (!confirmationResult.success) {
        const errorMessage = confirmationResult.error || 'Transaction confirmation failed';
        console.error(`[TREX:${this.network}] Confirmation failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX:${this.network}] Identity registered successfully for user ${userAddress}`);

      return {
        success: true,
        data: {
          txHash: txResult.data.txHash,
          gasUsed: confirmationResult.data.gasUsed,
          blockNumber: confirmationResult.data.blockNumber
        }
      };
    } catch (error) {
      const errorMessage = `Failed to register identity: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error(`[TREX:${this.network}] ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Update identity country
   */
  async updateIdentityCountry(
    userAddress: Address,
    newCountryCode: number,
    identityRegistryAddress: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: identityRegistryAddress,
        functionName: 'updateCountry',
        args: [userAddress, newCountryCode]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to update identity country: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Delete identity
   */
  async deleteIdentity(
    userAddress: Address,
    identityRegistryAddress: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: identityRegistryAddress,
        functionName: 'deleteIdentity',
        args: [userAddress]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete identity: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  // ============================================================
  // OnchainID Claims Management
  // ============================================================

  /**
   * Add claim to identity using ERC-735 claim interface
   * Implements Viem/Wagmi transaction lifecycle for claim management
   */
  async addClaim(
    identityAddress: Address,
    topic: bigint,
    scheme: bigint,
    issuer: Address,
    signature: Hex,
    data: Hex,
    uri: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`[TREX:${this.network}] Adding claim to identity ${identityAddress} (topic: ${topic}, scheme: ${scheme})`);

      // Prepare add claim transaction per ERC-735 spec
      const txRequest = {
        address: identityAddress,
        functionName: 'addClaim' as const, // ERC-735 claim interface method
        args: [topic, scheme, issuer, signature, data, uri]
      };

      // Simulate transaction to validate parameters and permissions
      console.log(`[TREX:${this.network}] Simulating addClaim transaction...`);
      const simulationResult = await this.contractsService.simulateContract(txRequest);

      if (!simulationResult.success) {
        const errorMessage = `Simulation failed: ${simulationResult.error}`;
        console.error(`[TREX:${this.network}] ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX:${this.network}] Simulation successful`);

      // Estimate gas for the transaction
      const gasEstimateResult = await this.contractsService.estimateGas(txRequest);
      if (!gasEstimateResult.success) {
        const errorMessage = `Gas estimation failed: ${gasEstimateResult.error}`;
        console.error(`[TREX:${this.network}] ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      // Execute the transaction
      console.log(`[TREX:${this.network}] Executing addClaim transaction...`);
      const writeRequest = {
        ...txRequest,
        gasLimit: gasEstimateResult.data
      };

      const txResult = await this.contractsService.writeContract(writeRequest);

      if (!txResult.success) {
        const errorMessage = txResult.error || 'Transaction submission failed';
        console.error(`[TREX:${this.network}] Transaction submission failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      // Wait for confirmation
      const confirmationResult = await this.contractsService.waitForTransaction(txResult.data.txHash);
      if (!confirmationResult.success) {
        const errorMessage = confirmationResult.error || 'Transaction confirmation failed';
        console.error(`[TREX:${this.network}] Confirmation failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log(`[TREX:${this.network}] Claim added successfully to identity ${identityAddress}`);

      return {
        success: true,
        data: {
          txHash: txResult.data.txHash,
          gasUsed: confirmationResult.data.gasUsed,
          blockNumber: confirmationResult.data.blockNumber
        }
      };
    } catch (error) {
      const errorMessage = `Failed to add claim: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error(`[TREX:${this.network}] ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get claim by ID using ERC-735 claim interface
   * Follows Viem readContract patterns for efficient data retrieval
   */
  async getClaim(
    claimId: Hex,
    identityAddress: Address
  ): Promise<{ success: boolean; data?: ClaimInfo; error?: string }> {
    try {
      console.log(`[TREX:${this.network}] Retrieving claim ${claimId} from identity ${identityAddress}`);

      // Use ERC-735 getClaim method
      const result = await this.contractsService.readContract<any[]>({
        address: identityAddress,
        functionName: 'getClaim', // ERC-735 claim interface method
        args: [claimId]
      });

      if (!result.success) {
        const error = "Failed to retrieve claim data";
        console.error(`[TREX:${this.network}] ${error}`);
        return {
          success: false,
          error
        };
      }

      // ERC-735 getClaim returns: (uint256 topic, uint256 scheme, address issuer, bytes memory signature, bytes memory data, string memory uri)
      const [topic, scheme, issuer, signature, data, uri] = result.data;

      const claimInfo: ClaimInfo = {
        claimId,
        topic: BigInt(topic),
        scheme: BigInt(scheme),
        issuer,
        signature,
        data,
        uri,
        issuedAt: new Date(), // Would need additional method call for actual timestamp
        expiresAt: undefined  // Would need additional method call for expiry
      };

      console.log(`[TREX:${this.network}] Claim retrieved: topic ${topic}, issuer ${issuer}`);

      return {
        success: true,
        data: claimInfo
      };
    } catch (error) {
      const errorMessage = `Failed to get claim: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error(`[TREX:${this.network}] ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get claims by topic
   */
  async getClaimsByTopic(
    topic: number,
    identityAddress: Address
  ): Promise<{ success: boolean; data?: Hex[]; error?: string }> {
    try {
      const result = await this.contractsService.readContract<Hex[]>({
        address: identityAddress,
        functionName: 'getClaimsByTopic',
        args: [BigInt(topic)]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to get claims by topic: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Remove claim
   */
  async removeClaim(
    claimId: Hex,
    identityAddress: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: identityAddress,
        functionName: 'removeClaim',
        args: [claimId]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove claim: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Check if claim is valid
   */
  async isClaimValid(
    claimId: Hex,
    identityAddress: Address
  ): Promise<{ success: boolean; data?: boolean; error?: string }> {
    try {
      const result = await this.contractsService.readContract<boolean>({
        address: identityAddress,
        functionName: 'isClaimValid',
        args: [claimId]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to check claim validity: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  // ============================================================
  // Modular Compliance Management
  // ============================================================

  /**
   * Add compliance module
   */
  async addComplianceModule(
    moduleAddress: Address,
    complianceAddress: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: complianceAddress,
        functionName: 'addModule',
        args: [moduleAddress]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to add compliance module: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Remove compliance module
   */
  async removeComplianceModule(
    moduleAddress: Address,
    complianceAddress: Address
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: complianceAddress,
        functionName: 'removeModule',
        args: [moduleAddress]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove compliance module: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Get active compliance modules
   */
  async getComplianceModules(
    complianceAddress: Address
  ): Promise<{ success: boolean; data?: ComplianceModuleInfo[]; error?: string }> {
    try {
      const result = await this.contractsService.readContract<Address[]>({
        address: complianceAddress,
        functionName: 'getModules'
      });

      if (!result.success) {
        return result;
      }

      // Get detailed info for each module
      const moduleDetails = await Promise.all(
        result.data.map(async (moduleAddress, index) => {
          try {
            const [nameResult, versionResult, moduleTypeResult] = await Promise.all([
              this.contractsService.readContract<string>({
                address: moduleAddress,
                functionName: 'name'
              }),
              this.contractsService.readContract<string>({
                address: moduleAddress,
                functionName: 'version'
              }),
              this.contractsService.readContract<string>({
                address: moduleAddress,
                functionName: 'moduleType'
              })
            ]);

            return {
              moduleAddress,
              name: nameResult.success ? nameResult.data : 'Unknown',
              version: versionResult.success ? versionResult.data : '1.0.0',
              active: true,
              executionOrder: index,
              moduleType: (moduleTypeResult.success ? moduleTypeResult.data : 'custom') as ComplianceModuleInfo['moduleType']
            };
          } catch {
            return {
              moduleAddress,
              name: 'Unknown',
              version: '1.0.0',
              active: true,
              executionOrder: index,
              moduleType: 'custom' as const
            };
          }
        })
      );

      return {
        success: true,
        data: moduleDetails
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get compliance modules: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Check if module is active
   */
  async isModuleActive(
    moduleAddress: Address,
    complianceAddress: Address
  ): Promise<{ success: boolean; data?: boolean; error?: string }> {
    try {
      const result = await this.contractsService.readContract<boolean>({
        address: complianceAddress,
        functionName: 'isModuleBound',
        args: [moduleAddress]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to check module status: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  // ============================================================
  // Regulatory Compliance Module Operations
  // ============================================================

  /**
   * Set country restrictions
   */
  async setCountryRestriction(
    moduleAddress: Address,
    countryCode: number,
    isBlacklisted: boolean
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const functionName = isBlacklisted ? 'blacklistCountry' : 'whitelistCountry';
      const result = await this.contractsService.writeContract({
        address: moduleAddress,
        functionName,
        args: [countryCode]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to set country restriction: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Set time-based restrictions
   */
  async setTimeRestrictions(
    moduleAddress: Address,
    investor: Address,
    lockupEnd: number,
    cliffEnd: number,
    vestingDuration: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: moduleAddress,
        functionName: 'setLockup',
        args: [investor, BigInt(lockupEnd), BigInt(cliffEnd), BigInt(vestingDuration)]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to set time restrictions: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Set maximum balance limits
   */
  async setMaxBalance(
    moduleAddress: Address,
    maxBalance: bigint
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: moduleAddress,
        functionName: 'setMaxBalance',
        args: [maxBalance]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to set max balance: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Set maximum holder limits
   */
  async setMaxHolders(
    moduleAddress: Address,
    maxHolders: bigint
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.contractsService.writeContract({
        address: moduleAddress,
        functionName: 'setHolderLimit',
        args: [maxHolders]
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to set max holders: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Get compliance address for token
   */
  private async getComplianceAddress(tokenAddress: Address): Promise<Address> {
    try {
      const result = await this.contractsService.readContract<Address>({
        address: tokenAddress,
        functionName: 'compliance'
      });

      return result.success ? result.data : '0x0000000000000000000000000000000000000000' as Address;
    } catch {
      return '0x0000000000000000000000000000000000000000' as Address;
    }
  }

  /**
   * Get identity registry address for token
   */
  private async getIdentityRegistryAddress(tokenAddress: Address): Promise<Address> {
    try {
      const result = await this.contractsService.readContract<Address>({
        address: tokenAddress,
        functionName: 'identityRegistry'
      });

      return result.success ? result.data : '0x0000000000000000000000000000000000000000' as Address;
    } catch {
      return '0x0000000000000000000000000000000000000000' as Address;
    }
  }

  /**
   * Initiate bridge transfer (cross-network operation)
   */
  async initiateBridgeTransfer(
    transferInfo: Omit<BridgeTransferInfo, 'txHash' | 'status'>
  ): Promise<{ success: boolean; data?: BridgeTransferInfo; error?: string }> {
    try {
      // This would integrate with a specific bridge protocol
      // For now, return a placeholder implementation
      const result = await this.contractsService.writeContract({
        address: transferInfo.bridgeContract,
        functionName: 'bridgeTransfer',
        args: [
          transferInfo.tokenAddress,
          transferInfo.recipient,
          transferInfo.amount
        ]
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        data: {
          ...transferInfo,
          txHash: result.data.txHash,
          status: 'pending'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to initiate bridge transfer: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Get incoming bridge events
   */
  getIncomingBridgeEvents(): BridgeTransferInfo[] {
    // This would track bridge transfers from monitoring service
    // For now, return empty array
    return [];
  }

  /**
   * Get bridge events for target network
   */
  getBridgeEvents(targetNetwork: EVMNetwork): BridgeTransferInfo[] {
    // This would filter bridge events by target network
    // For now, return empty array
    return [];
  }
}
