/**
 * EVM Settlement Service
 * Handles atomic settlement for matched buy/sell orders with signature verification
 * Uses Viem/Wagmi patterns for EVM blockchain interactions
 * Follows ERC-3643 compliance and identity verification patterns
 */

import type { Address, Hash, Hex, PublicClient, WalletClient } from 'viem';
import type { Pool } from "pg";
import { encodeFunctionData, parseAbi, keccak256, encodeAbiParameters, parseAbiParameters, recoverMessageAddress } from 'viem';
import { type Chain, base, mainnet } from 'viem/chains';

/**
 * Order data structure for EVM settlements
 * Compatible with EIP-712 typed data signing
 */
export interface OrderData {
  propertyToken: Address;
  stablecoinToken: Address;
  propertyAmount: bigint;
  stablecoinAmount: bigint;
  expiry: bigint;
  nonce: bigint;
}

/**
 * Signed order with EVM signature (ECDSA)
 */
export interface SignedOrder extends OrderData {
  signature: Hex;
  signer: Address;
}

/**
 * Settlement parameters for paired orders
 */
export interface SettlementParams {
  buyOrder: SignedOrder;
  sellOrder: SignedOrder;
  buyer: Address;
  seller: Address;
}

/**
 * Settlement result with transaction hash
 */
export interface SettlementResult {
  txHash: Hash;
  propertyAmount: bigint;
  stablecoinAmount: bigint;
  buyer: Address;
  seller: Address;
  settledAt: Date;
  status: "pending" | "confirmed" | "failed";
  blockNumber?: bigint;
  gasUsed?: bigint;
}

/**
 * Deposit information for escrow tracking
 */
export interface DepositInfo {
  token: Address;
  wallet: Address;
  amount: bigint;
  depositedAt: Date;
}

/**
 * EIP-712 Domain for order signing
 */
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
}

/**
 * Result wrapper for EVM operations
 */
export interface EvmResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  txHash?: Hash;
}

/**
 * Service for atomic settlement of ERC-3643 property token trades on EVM
 * Implements compliance-aware trading with identity verification
 */
export class SettlementService {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private pool: Pool;
  private settlementContract: Address;
  private chain: Chain;

  // Settlement contract ABI following ERC-3643 patterns
  private readonly settlementAbi = parseAbi([
    // Order settlement functions
    'function settlePair(bytes32 buyOrderHash, bytes buySignature, address buyer, bytes32 sellOrderHash, bytes sellSignature, address seller, address propertyToken, address stablecoinToken, uint256 propertyAmount, uint256 stablecoinAmount, uint256 expiry) external returns (bool)',
    'function settleSimple(address buyer, address seller, address propertyToken, address stablecoinToken, uint256 propertyAmount, uint256 stablecoinAmount) external returns (bool)',
    
    // Deposit management
    'function confirmDeposit(address token, uint256 amount) external returns (bool)',
    'function getDeposit(address token, address wallet) external view returns (uint256)',
    
    // Order tracking
    'function isExecuted(bytes32 orderHash) external view returns (bool)',
    'function getOrderStatus(bytes32 orderHash) external view returns (bool executed, uint256 timestamp)',
    
    // Events
    'event SettlementExecuted(bytes32 indexed buyOrderHash, bytes32 indexed sellOrderHash, address buyer, address seller, address propertyToken, uint256 propertyAmount, uint256 stablecoinAmount)',
    'event DepositConfirmed(address indexed token, address indexed wallet, uint256 amount)',
  ]);

  // ERC20 token ABI for approvals and transfers
  private readonly erc20Abi = parseAbi([
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  ]);

  constructor(
    publicClient: PublicClient,
    walletClient: WalletClient,
    pool: Pool,
    settlementContract: Address,
    chain: Chain = base
  ) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.pool = pool;
    this.settlementContract = settlementContract;
    this.chain = chain;
  }

  /**
   * Settle matched buy and sell orders atomically with signature verification
   * Follows ERC-3643 compliance patterns with identity verification
   */
  async settlePair(params: SettlementParams): Promise<EvmResult<SettlementResult>> {
    try {
      // Validate orders match
      if (
        params.buyOrder.propertyToken !== params.sellOrder.propertyToken ||
        params.buyOrder.stablecoinToken !== params.sellOrder.stablecoinToken ||
        params.buyOrder.propertyAmount !== params.sellOrder.propertyAmount ||
        params.buyOrder.stablecoinAmount !== params.sellOrder.stablecoinAmount
      ) {
        return {
          success: false,
          error: "Buy and sell orders do not match",
        };
      }

      // Check if orders are expired
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (params.buyOrder.expiry < now || params.sellOrder.expiry < now) {
        return {
          success: false,
          error: "One or both orders have expired",
        };
      }

      // Hash orders using EIP-712
      const buyOrderHash: Hex = await this.hashOrderData(params.buyOrder);
      const sellOrderHash: Hex = await this.hashOrderData(params.sellOrder);

      // Verify signatures
      const buySignerValid = await this.verifyOrderSignature(params.buyOrder, buyOrderHash);
      const sellSignerValid = await this.verifyOrderSignature(params.sellOrder, sellOrderHash);

      if (!buySignerValid) {
        return {
          success: false,
          error: "Invalid buy order signature",
        };
      }

      if (!sellSignerValid) {
        return {
          success: false,
          error: "Invalid sell order signature",
        };
      }

      // Check if already executed
      const [buyExecuted, sellExecuted] = await Promise.all([
        this.isOrderExecuted(buyOrderHash),
        this.isOrderExecuted(sellOrderHash),
      ]);

      if (buyExecuted.success && buyExecuted.data) {
        return {
          success: false,
          error: "Buy order already executed",
        };
      }

      if (sellExecuted.success && sellExecuted.data) {
        return {
          success: false,
          error: "Sell order already executed",
        };
      }

      // Simulate transaction before sending
      const { request } = await this.publicClient.simulateContract({
        address: this.settlementContract,
        abi: this.settlementAbi,
        functionName: 'settlePair',
        args: [
          buyOrderHash,
          params.buyOrder.signature,
          params.buyer,
          sellOrderHash,
          params.sellOrder.signature,
          params.seller,
          params.buyOrder.propertyToken,
          params.buyOrder.stablecoinToken,
          params.buyOrder.propertyAmount,
          params.buyOrder.stablecoinAmount,
          params.buyOrder.expiry,
        ],
        account: params.buyer,
      });

      // Execute settlement transaction
      const txHash = await this.walletClient.writeContract(request);

      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      // Create settlement record
      const settlement: SettlementResult = {
        txHash,
        propertyAmount: params.buyOrder.propertyAmount,
        stablecoinAmount: params.buyOrder.stablecoinAmount,
        buyer: params.buyer,
        seller: params.seller,
        settledAt: new Date(),
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      };

      // Store in database
      await this.storeSettlement(settlement, params.buyOrder.propertyToken);

      return {
        success: true,
        data: settlement,
        txHash,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to settle orders: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Simplified settlement for testing (without signature verification)
   * Useful for development and testing environments
   */
  async settleSimple(
    buyer: Address,
    seller: Address,
    propertyToken: Address,
    stablecoinToken: Address,
    propertyAmount: bigint,
    stablecoinAmount: bigint,
    account: Address
  ): Promise<EvmResult<SettlementResult>> {
    try {
      // Simulate transaction
      const { request } = await this.publicClient.simulateContract({
        address: this.settlementContract,
        abi: this.settlementAbi,
        functionName: 'settleSimple',
        args: [
          buyer,
          seller,
          propertyToken,
          stablecoinToken,
          propertyAmount,
          stablecoinAmount,
        ],
        account,
      });

      // Execute transaction
      const txHash = await this.walletClient.writeContract(request);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      const settlement: SettlementResult = {
        txHash,
        propertyAmount,
        stablecoinAmount,
        buyer,
        seller,
        settledAt: new Date(),
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      };

      await this.storeSettlement(settlement, propertyToken);

      return {
        success: true,
        data: settlement,
        txHash,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to settle: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Confirm deposit of tokens into settlement escrow
   * Follows ERC-3643 compliance checks
   */
  async confirmDeposit(
    token: Address,
    amount: bigint,
    wallet: Address
  ): Promise<EvmResult<boolean>> {
    try {
      // Check token balance and allowance first
      // @ts-ignore - Viem v2 type definition issue: authorizationList should be optional
      const balance = (await this.publicClient.readContract({
        address: token,
        abi: this.erc20Abi,
        functionName: 'balanceOf',
        args: [wallet],
      })) as bigint;

      if (balance < amount) {
        return {
          success: false,
          error: `Insufficient balance: ${balance} < ${amount}`,
        };
      }

      // @ts-ignore - Viem v2 type definition issue: authorizationList should be optional
      const allowance = (await this.publicClient.readContract({
        address: token,
        abi: this.erc20Abi,
        functionName: 'allowance',
        args: [wallet, this.settlementContract],
      })) as bigint;

      if (allowance < amount) {
        return {
          success: false,
          error: `Insufficient allowance: ${allowance} < ${amount}. Approval required.`,
        };
      }

      // Simulate deposit
      const { request } = await this.publicClient.simulateContract({
        address: this.settlementContract,
        abi: this.settlementAbi,
        functionName: 'confirmDeposit',
        args: [token, amount],
        account: wallet,
      });

      // Execute deposit
      const txHash = await this.walletClient.writeContract(request);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      // Store deposit record
      await this.storeDeposit({ token, wallet, amount, depositedAt: new Date() });

      return {
        success: receipt.status === 'success',
        data: receipt.status === 'success',
        txHash,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to confirm deposit: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get deposit amount for wallet and token from settlement contract
   * Read-only operation
   */
  async getDeposit(token: Address, wallet: Address): Promise<EvmResult<bigint>> {
    try {
      // @ts-ignore - Viem v2 type definition issue: authorizationList should be optional
      const deposit = (await this.publicClient.readContract({
        address: this.settlementContract,
        abi: this.settlementAbi,
        functionName: 'getDeposit',
        args: [token, wallet],
      })) as bigint;

      return {
        success: true,
        data: deposit as bigint,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get deposit: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Check if order hash has been executed on-chain
   * Read-only operation
   */
  async isOrderExecuted(orderHash: Hex): Promise<EvmResult<boolean>> {
    try {
      // @ts-ignore - Viem v2 type definition issue: authorizationList should be optional
      const executed = (await this.publicClient.readContract({
        address: this.settlementContract,
        abi: this.settlementAbi,
        functionName: 'isExecuted',
        args: [orderHash],
      })) as boolean;

      return {
        success: true,
        data: executed as boolean,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check order execution: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Hash order data using EIP-712 typed data hashing
   * Provides domain separation and replay protection
   */
  private async hashOrderData(order: OrderData): Promise<Hex> {
    // EIP-712 domain separator
    const domain: EIP712Domain = {
      name: 'FarsquareSettlement',
      version: '1',
      chainId: this.chain.id,
      verifyingContract: this.settlementContract,
    };

    // Order type hash (keccak256 of type string)
    const ORDER_TYPEHASH = keccak256(
      encodeAbiParameters(
        parseAbiParameters('string'),
        ['Order(address propertyToken,address stablecoinToken,uint256 propertyAmount,uint256 stablecoinAmount,uint256 expiry,uint256 nonce)']
      )
    );

    // Encode order struct
    const structHash = keccak256(
      encodeAbiParameters(
        parseAbiParameters('bytes32, address, address, uint256, uint256, uint256, uint256'),
        [
          ORDER_TYPEHASH,
          order.propertyToken,
          order.stablecoinToken,
          order.propertyAmount,
          order.stablecoinAmount,
          order.expiry,
          order.nonce,
        ]
      )
    );

    // EIP-712 domain separator hash
    const DOMAIN_TYPEHASH = keccak256(
      encodeAbiParameters(
        parseAbiParameters('string'),
        ['EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)']
      )
    );

    const domainSeparator = keccak256(
      encodeAbiParameters(
        parseAbiParameters('bytes32, bytes32, bytes32, uint256, address'),
        [
          DOMAIN_TYPEHASH,
          keccak256(encodeAbiParameters(parseAbiParameters('string'), [domain.name])),
          keccak256(encodeAbiParameters(parseAbiParameters('string'), [domain.version])),
          BigInt(domain.chainId),
          domain.verifyingContract,
        ]
      )
    );

    // Final EIP-712 message hash: keccak256("\x19\x01" + domainSeparator + structHash)
    return keccak256(
      encodeAbiParameters(
        parseAbiParameters('bytes1, bytes1, bytes32, bytes32'),
        ['0x19' as Hex, '0x01' as Hex, domainSeparator, structHash]
      )
    );
  }

  /**
   * Verify order signature using ECDSA recovery
   * Ensures the signer matches the order signer address
   */
  private async verifyOrderSignature(order: SignedOrder, messageHash: Hex): Promise<boolean> {
    try {
      // Recover address from signature
      const recoveredAddress = await recoverMessageAddress({
        message: { raw: messageHash },
        signature: order.signature,
      });

      // Compare recovered address with order signer
      return recoveredAddress.toLowerCase() === order.signer.toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  // ============================================================
  // Database Operations
  // ============================================================

  /**
   * Store settlement record in database
   */
  private async storeSettlement(settlement: SettlementResult, propertyToken: Address): Promise<void> {
    const query = `
      INSERT INTO marketplace.settlements (
        tx_hash, property_token, property_amount, stablecoin_amount,
        buyer, seller, settled_at, status, block_number, gas_used
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (tx_hash)
      DO UPDATE SET
        status = EXCLUDED.status,
        block_number = EXCLUDED.block_number,
        gas_used = EXCLUDED.gas_used,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      settlement.txHash,
      propertyToken,
      settlement.propertyAmount.toString(),
      settlement.stablecoinAmount.toString(),
      settlement.buyer,
      settlement.seller,
      settlement.settledAt,
      settlement.status,
      settlement.blockNumber?.toString() || null,
      settlement.gasUsed?.toString() || null,
    ]);
  }

  /**
   * Store deposit record in database
   */
  private async storeDeposit(deposit: DepositInfo): Promise<void> {
    const query = `
      INSERT INTO marketplace.deposits (token, wallet, amount, deposited_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (token, wallet)
      DO UPDATE SET
        amount = deposits.amount + EXCLUDED.amount,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      deposit.token,
      deposit.wallet,
      deposit.amount.toString(),
      deposit.depositedAt,
    ]);
  }

  /**
   * Get settlement by transaction hash
   */
  async getSettlement(txHash: Hash): Promise<SettlementResult | null> {
    const query = `
      SELECT * FROM marketplace.settlements
      WHERE tx_hash = $1
    `;

    try {
      const result = await this.pool.query(query, [txHash]);
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        txHash: row.tx_hash as Hash,
        propertyAmount: BigInt(row.property_amount),
        stablecoinAmount: BigInt(row.stablecoin_amount),
        buyer: row.buyer as Address,
        seller: row.seller as Address,
        settledAt: row.settled_at,
        status: row.status,
        blockNumber: row.block_number ? BigInt(row.block_number) : undefined,
        gasUsed: row.gas_used ? BigInt(row.gas_used) : undefined,
      };
    } catch (error) {
      console.error("Failed to get settlement:", error);
      return null;
    }
  }

  /**
   * Update settlement status
   */
  async updateSettlementStatus(
    txHash: Hash,
    status: "pending" | "confirmed" | "failed"
  ): Promise<boolean> {
    const query = `
      UPDATE marketplace.settlements
      SET status = $2, updated_at = NOW()
      WHERE tx_hash = $1
    `;

    try {
      await this.pool.query(query, [txHash, status]);
      return true;
    } catch (error) {
      console.error("Failed to update settlement status:", error);
      return false;
    }
  }

  /**
   * Get user's settlement history
   */
  async getUserSettlements(userAddress: Address): Promise<SettlementResult[]> {
    const query = `
      SELECT * FROM marketplace.settlements
      WHERE buyer = $1 OR seller = $1
      ORDER BY settled_at DESC
      LIMIT 100
    `;

    try {
      const result = await this.pool.query(query, [userAddress]);
      return result.rows.map((row) => ({
        txHash: row.tx_hash as Hash,
        propertyAmount: BigInt(row.property_amount),
        stablecoinAmount: BigInt(row.stablecoin_amount),
        buyer: row.buyer as Address,
        seller: row.seller as Address,
        settledAt: row.settled_at,
        status: row.status,
        blockNumber: row.block_number ? BigInt(row.block_number) : undefined,
        gasUsed: row.gas_used ? BigInt(row.gas_used) : undefined,
      }));
    } catch (error) {
      console.error("Failed to get user settlements:", error);
      return [];
    }
  }

  /**
   * Get property's settlement history
   */
  async getPropertySettlements(propertyToken: Address): Promise<SettlementResult[]> {
    const query = `
      SELECT * FROM marketplace.settlements
      WHERE property_token = $1
      ORDER BY settled_at DESC
      LIMIT 100
    `;

    try {
      const result = await this.pool.query(query, [propertyToken]);
      return result.rows.map((row) => ({
        txHash: row.tx_hash as Hash,
        propertyAmount: BigInt(row.property_amount),
        stablecoinAmount: BigInt(row.stablecoin_amount),
        buyer: row.buyer as Address,
        seller: row.seller as Address,
        settledAt: row.settled_at,
        status: row.status,
        blockNumber: row.block_number ? BigInt(row.block_number) : undefined,
        gasUsed: row.gas_used ? BigInt(row.gas_used) : undefined,
      }));
    } catch (error) {
      console.error("Failed to get property settlements:",error);
      return [];
    }
  }

  /**
   * Approve token spending for settlement contract
   * Helper method for users to approve tokens before deposit
   */
  async approveToken(
    token: Address,
    amount: bigint,
    owner: Address
  ): Promise<EvmResult<boolean>> {
    try {
      // Simulate approval
      const { request } = await this.publicClient.simulateContract({
        address: token,
        abi: this.erc20Abi,
        functionName: 'approve',
        args: [this.settlementContract, amount],
        account: owner,
      });

      // Execute approval
      const txHash = await this.walletClient.writeContract(request);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      return {
        success: receipt.status === 'success',
        data: receipt.status === 'success',
        txHash,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to approve token: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Check token allowance for settlement contract
   * Read-only helper method
   */
  async checkAllowance(token: Address, owner: Address): Promise<EvmResult<bigint>> {
    try {
      // @ts-ignore - Viem v2 type definition issue: authorizationList should be optional
      const allowance = (await this.publicClient.readContract({
        address: token,
        abi: this.erc20Abi,
        functionName: 'allowance',
        args: [owner, this.settlementContract],
      })) as bigint;

      return {
        success: true,
        data: allowance as bigint,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check allowance: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get token balance for an address
   * Read-only helper method
   */
  async getTokenBalance(token: Address, owner: Address): Promise<EvmResult<bigint>> {
    try {
      // @ts-ignore - Viem v2 type definition issue: authorizationList should be optional
      const balance = (await this.publicClient.readContract({
        address: token,
        abi: this.erc20Abi,
        functionName: 'balanceOf',
        args: [owner],
      })) as bigint;

      return {
        success: true,
        data: balance as bigint,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get token balance: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
}
