import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/contexts/wallet-context";
import { useBalance, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { publicClient } from "@/lib/viem-client";
import { Address, formatEther, parseEther } from "viem";
import { useEffect } from "react";

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "transfer";
  amount: string;
  address: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
  txHash?: string;
  fee?: string;
  gasUsed?: string;
  gasPrice?: string;
}

export interface WalletBalance {
  value: bigint;
  formatted: string;
  symbol: string;
  decimals: number;
  usd: number;
}

// EVM-specific API functions using Viem public client
const fetchWalletBalance = async (address: Address, chainId: number): Promise<WalletBalance> => {
  try {
    // Use Viem public client to fetch native token balance
    const balance = await publicClient.getBalance({
      address,
    });

    // Get current price from a price API (mocked for now)
    const mockPrice = 2000; // ETH price in USD
    const formattedBalance = formatEther(balance);
    const usdValue = parseFloat(formattedBalance) * mockPrice;

    return {
      value: balance,
      formatted: formattedBalance,
      symbol: 'ETH', // Could be dynamic based on chain
      decimals: 18,
      usd: usdValue,
    };
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    // Return zero balance on error
    return {
      value: 0n,
      formatted: "0",
      symbol: "ETH",
      decimals: 18,
      usd: 0,
    };
  }
};

const fetchTransactionHistory = async (
  address: Address,
  page: number = 1,
  limit: number = 10
): Promise<{ transactions: Transaction[]; total: number }> => {
  try {
    // Note: EVM chains don't have a standard API for transaction history
    // In production, you'd use services like Etherscan, Alchemy, or Infura APIs
    // For now, return empty array as placeholder
    console.warn("Transaction history fetching not implemented for EVM. Use external APIs like Etherscan.");

    return {
      transactions: [],
      total: 0,
    };
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return {
      transactions: [],
      total: 0,
    };
  }
};

const submitTransaction = async (transactionRequest: {
  to: Address;
  value?: string;
  data?: `0x${string}`;
  gasLimit?: bigint;
}): Promise<{ txHash: `0x${string}` }> => {
  try {
    // This would typically be handled by useSendTransaction hook
    // For server-side submission, you'd use Viem wallet client
    throw new Error("Direct transaction submission not implemented. Use useSendTransaction hook.");
  } catch (error) {
    console.error('Transaction submission failed:', error);
    throw error;
  }
};

// Query keys for React Query
export const walletQueryKeys = {
  balance: (address: string, chainId: number) => ["wallet", "balance", address, chainId] as const,
  transactions: (address: string, page: number, limit: number) =>
    ["wallet", "transactions", address, page, limit] as const,
};

// Wallet-specific React Query hooks using Wagmi + Viem patterns
export const useWalletBalance = () => {
  const { state } = useWallet();

  const address = state.address ?? undefined;
  const chainId = state.chainId ?? 1; // Default to mainnet

  // Use Wagmi's useBalance hook for reactive balance updates
  const wagmiBalance = useBalance({
    address,
    chainId,
    query: {
      enabled: !!address && state.isConnected,
    },
  });

  // Also provide a custom query for additional balance formatting
  const customBalance = useQuery({
    queryKey: walletQueryKeys.balance(address || "", chainId),
    queryFn: () => address ? fetchWalletBalance(address, chainId) : Promise.reject("No address"),
    enabled: !!address && state.isConnected,
    staleTime: 30000, // 30 seconds - balance updates frequently
  });

  // Return the more reliable Wagmi balance data, with fallback to custom query
  return {
    ...wagmiBalance,
    data: wagmiBalance.data || customBalance.data,
    isLoading: wagmiBalance.isLoading || customBalance.isLoading,
    error: wagmiBalance.error || customBalance.error,
  };
};

export const useTransactionHistory = (page: number = 1, limit: number = 10) => {
  const { state } = useWallet();

  const address = state.address ?? undefined;

  return useQuery({
    queryKey: walletQueryKeys.transactions(address || "", page, limit),
    queryFn: () => address ? fetchTransactionHistory(address, page, limit) : Promise.reject("No address"),
    enabled: !!address && state.isConnected,
    staleTime: 60000, // 1 minute - transaction history doesn't change as frequently
  });
};

// Enhanced transaction sending hook using Wagmi patterns
export const useSendWalletTransaction = () => {
  const { sendTransactionAsync, data: txHash, isPending, error } = useSendTransaction();
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const queryClient = useQueryClient();
  const { state } = useWallet();

  const sendTransaction = useMutation({
    mutationFn: async (transactionRequest: {
      to: Address;
      value?: string;
      data?: `0x${string}`;
      gasLimit?: bigint;
    }) => {
      try {
        // Note: Transaction simulation for native transfers is limited in Viem

        // Send transaction using Wagmi
        const hash = await sendTransactionAsync({
          to: transactionRequest.to,
          value: transactionRequest.value ? parseEther(transactionRequest.value) : 0n,
          data: transactionRequest.data,
        });

        return { txHash: hash };
      } catch (error) {
        console.error("Transaction failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate and refetch balance and transactions
      if (state.address && state.chainId) {
        queryClient.invalidateQueries({
          queryKey: walletQueryKeys.balance(state.address, state.chainId)
        });
        queryClient.invalidateQueries({
          queryKey: ["wallet", "transactions", state.address]
        });
      }

      // Add optimistic update for pending transaction
      const optimisticTransaction: Transaction = {
        id: `pending-${Date.now()}`,
        type: "transfer",
        amount: "0", // Would need to be passed in mutation variables
        address: "", // Would need to be passed in mutation variables
        timestamp: Date.now(),
        status: "pending",
        txHash: data.txHash,
      };

      // Update transaction history cache optimistically
      if (state.address) {
        queryClient.setQueryData(
          walletQueryKeys.transactions(state.address, 1, 10),
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              transactions: [optimisticTransaction, ...oldData.transactions],
            };
          }
        );
      }
    },
    onError: (error) => {
      console.error("Transaction submission failed:", error);
    },
  });

  return {
    ...sendTransaction,
    txHash,
    receipt,
    isConfirming: isPending || isConfirming,
    error: error || sendTransaction.error,
  };
};

// Utility hook for wallet data synchronization
export const useWalletSync = () => {
  const queryClient = useQueryClient();
  const { state } = useWallet();

  const syncWalletData = async () => {
    if (!state.address || !state.isConnected || !state.chainId) return;

    // Invalidate all wallet-related queries
    await queryClient.invalidateQueries({
      queryKey: ["wallet"]
    });

    // Refetch critical data
    await Promise.all([
      queryClient.refetchQueries({
        queryKey: walletQueryKeys.balance(state.address, state.chainId)
      }),
      queryClient.refetchQueries({
        queryKey: ["wallet", "transactions", state.address]
      }),
    ]);
  };

  return { syncWalletData };
};

// Hook for real-time wallet updates
export const useWalletRealtime = () => {
  const queryClient = useQueryClient();
  const { state } = useWallet();

  // Set up polling for real-time updates when component mounts
  useQuery({
    queryKey: ["wallet", "realtime", state.address, state.chainId],
    queryFn: () => Promise.resolve(null),
    enabled: !!state.address && state.isConnected && !!state.chainId,
  });

  // Separate effect for invalidation logic
  useEffect(() => {
    if (state.address && state.chainId) {
      queryClient.invalidateQueries({
        queryKey: walletQueryKeys.balance(state.address, state.chainId)
      });
    }
  }, [state.address, state.chainId, queryClient]);

  return null;
};

// Utility functions for external use
export { fetchWalletBalance };
