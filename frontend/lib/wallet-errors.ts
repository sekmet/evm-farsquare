// Wallet error types and interfaces
export enum WalletErrorType {
  CONNECTION_FAILED = "CONNECTION_FAILED",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  SIGNATURE_FAILED = "SIGNATURE_FAILED",
  BALANCE_FETCH_FAILED = "BALANCE_FETCH_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface WalletError {
  type: WalletErrorType;
  message: string;
  userMessage: string; // User-friendly message
  details?: any; // Technical details (not shown to user)
  recoverable: boolean; // Can the user retry this operation?
  errorId: string;
}

// Utility function to create wallet errors
export function createWalletError(
  type: WalletErrorType,
  originalError?: Error | any,
  context?: string
): WalletError {
  const errorId = `wallet_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const errorMap: Record<WalletErrorType, { userMessage: string; recoverable: boolean }> = {
    [WalletErrorType.CONNECTION_FAILED]: {
      userMessage: "Unable to connect to wallet. Please check your connection and try again.",
      recoverable: true,
    },
    [WalletErrorType.TRANSACTION_FAILED]: {
      userMessage: "Transaction failed. Please check your balance and try again.",
      recoverable: true,
    },
    [WalletErrorType.SIGNATURE_FAILED]: {
      userMessage: "Failed to sign transaction. Please try again.",
      recoverable: true,
    },
    [WalletErrorType.BALANCE_FETCH_FAILED]: {
      userMessage: "Unable to fetch balance. Please refresh and try again.",
      recoverable: true,
    },
    [WalletErrorType.NETWORK_ERROR]: {
      userMessage: "Network connection error. Please check your internet connection.",
      recoverable: true,
    },
    [WalletErrorType.TIMEOUT_ERROR]: {
      userMessage: "Request timed out. Please try again.",
      recoverable: true,
    },
    [WalletErrorType.UNKNOWN_ERROR]: {
      userMessage: "An unexpected error occurred. Please try again.",
      recoverable: false,
    },
  };

  const errorConfig = errorMap[type] || errorMap[WalletErrorType.UNKNOWN_ERROR];

  return {
    type,
    message: originalError?.message || "Unknown error",
    userMessage: errorConfig.userMessage,
    details: {
      originalError: originalError?.message,
      context,
      timestamp: new Date().toISOString(),
    },
    recoverable: errorConfig.recoverable,
    errorId,
  };
}
