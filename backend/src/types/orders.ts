/**
 * Order Types
 * Type definitions for off-chain orders and signatures
 */

/**
 * Canonical order structure for off-chain order creation
 */
export interface Order {
  chain: string;
  contract: string;
  propertyId: string;
  side: "buy" | "sell";
  pricePerShare: string;
  quantity: string;
  wallet: string;
  nonce: string;
  expiry: string;
}

/**
 * Signed order with signature data
 */
export interface SignedOrder extends Order {
  signature: string;
  messageHash: string;
  publicKey: string;
}

/**
 * Result type for order operations
 */
export type OrderResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Keypair for signing
 */
export interface Keypair {
  privateKey: string;
  publicKey: string;
  publicKeyCompressed: string;
}
