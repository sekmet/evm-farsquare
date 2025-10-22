import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/contexts/wallet-context";
import { useSendWalletTransaction, walletQueryKeys } from "@/hooks/use-wallet-queries";
import { publicClient } from "@/lib/viem-client";
import { Address, formatEther } from "viem";

export type TransactionStatus = "pending" | "confirmed" | "failed";

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "transfer";
  amount: string;
  toAddress: Address;
  fromAddress?: Address;
  timestamp: number;
  status: TransactionStatus;
  txHash?: `0x${string}`;
  error?: string;
  retryCount?: number;
  gasUsed?: string;
  gasPrice?: string;
  fee?: string;
}

interface TransactionState {
  pendingTransactions: Transaction[];
  confirmedTransactions: Transaction[];
  failedTransactions: Transaction[];
}

interface TransactionStateContextType extends TransactionState {
  addPendingTransaction: (transaction: Omit<Transaction, "status">) => void;
  confirmTransaction: (transactionId: string) => void;
  failTransaction: (transactionId: string, error: string) => void;
  retryTransaction: (transactionId: string) => void;
  clearCompletedTransactions: () => void;
  getTransactionStatus: (transactionId: string) => TransactionStatus | "unknown";
  getTransactionById: (transactionId: string) => Transaction | undefined;
}

const TransactionStateContext = createContext<TransactionStateContextType | undefined>(undefined);

export const useTransactionState = (): TransactionStateContextType => {
  const context = useTransactionStateContext();
  if (context === undefined) {
    throw new Error("useTransactionState must be used within a TransactionStateProvider");
  }
  return context;
};

// Alias for backward compatibility
export const useTransactionStateContext = useTransactionState;

interface TransactionStateProviderProps {
  children: React.ReactNode;
}

export const TransactionStateProvider: React.FC<TransactionStateProviderProps> = ({ children }) => {
  const { state: walletState } = useWallet();
  const queryClient = useQueryClient();
  const sendTransaction = useSendWalletTransaction();

  const [transactionState, setTransactionState] = useState<TransactionState>({
    pendingTransactions: [],
    confirmedTransactions: [],
    failedTransactions: [],
  });

  // Add pending transaction with optimistic update
  const addPendingTransaction = useCallback((transaction: Omit<Transaction, "status">) => {
    const pendingTransaction: Transaction = {
      ...transaction,
      status: "pending",
      retryCount: 0,
    };

    setTransactionState(prev => ({
      ...prev,
      pendingTransactions: [...prev.pendingTransactions, pendingTransaction],
    }));

    // Trigger actual transaction submission using EVM Viem/Wagmi
    sendTransaction.mutate(
      {
        to: transaction.toAddress,
        value: transaction.amount,
        data: undefined, // For now, simple transfers
      },
      {
        onSuccess: (data) => {
          // Transaction submitted successfully, update with txHash
          setTransactionState(prev => ({
            ...prev,
            pendingTransactions: prev.pendingTransactions.map(tx =>
              tx.id === transaction.id
                ? { ...tx, txHash: data.txHash }
                : tx
            ),
          }));
        },
        onError: (error) => {
          // Transaction failed immediately
          failTransaction(transaction.id, error instanceof Error ? error.message : "Transaction failed");
        },
      }
    );
  }, [sendTransaction]);

  // Confirm transaction (move from pending to confirmed)
  const confirmTransaction = useCallback((transactionId: string) => {
    setTransactionState(prev => {
      const transaction = prev.pendingTransactions.find(tx => tx.id === transactionId);
      if (!transaction) return prev;

      return {
        ...prev,
        pendingTransactions: prev.pendingTransactions.filter(tx => tx.id !== transactionId),
        confirmedTransactions: [...prev.confirmedTransactions, { ...transaction, status: "confirmed" }],
      };
    });
  }, []);

  // Fail transaction (move from pending to failed)
  const failTransaction = useCallback((transactionId: string, error: string) => {
    setTransactionState(prev => {
      const transaction = prev.pendingTransactions.find(tx => tx.id === transactionId);
      if (!transaction) return prev;

      return {
        ...prev,
        pendingTransactions: prev.pendingTransactions.filter(tx => tx.id !== transactionId),
        failedTransactions: [...prev.failedTransactions, {
          ...transaction,
          status: "failed",
          error,
        }],
      };
    });
  }, []);

  // Retry failed transaction
  const retryTransaction = useCallback((transactionId: string) => {
    setTransactionState(prev => {
      const transaction = prev.failedTransactions.find(tx => tx.id === transactionId);
      if (!transaction) return prev;

      const retryTransaction: Transaction = {
        ...transaction,
        status: "pending",
        retryCount: (transaction.retryCount || 0) + 1,
        error: undefined,
      };

      return {
        ...prev,
        failedTransactions: prev.failedTransactions.filter(tx => tx.id !== transactionId),
        pendingTransactions: [...prev.pendingTransactions, retryTransaction],
      };
    });

    // Trigger retry using EVM transaction
    const transaction = transactionState.failedTransactions.find(tx => tx.id === transactionId);
    if (transaction) {
      sendTransaction.mutate(
        {
          to: transaction.toAddress,
          value: transaction.amount,
          data: undefined,
        },
        {
          onSuccess: (data) => {
            setTransactionState(prev => ({
              ...prev,
              pendingTransactions: prev.pendingTransactions.map(tx =>
                tx.id === transactionId
                  ? { ...tx, txHash: data.txHash }
                  : tx
              ),
            }));
          },
          onError: (error) => {
            failTransaction(transactionId, error instanceof Error ? error.message : "Retry failed");
          },
        }
      );
    }
  }, [sendTransaction, transactionState.failedTransactions, failTransaction]);

  // Clear completed transactions (confirmed and failed)
  const clearCompletedTransactions = useCallback(() => {
    setTransactionState(prev => ({
      ...prev,
      confirmedTransactions: [],
      failedTransactions: [],
    }));
  }, []);

  // Get transaction status
  const getTransactionStatus = useCallback((transactionId: string): TransactionStatus | "unknown" => {
    const allTransactions = [
      ...transactionState.pendingTransactions,
      ...transactionState.confirmedTransactions,
      ...transactionState.failedTransactions,
    ];

    const transaction = allTransactions.find(tx => tx.id === transactionId);
    return transaction?.status || "unknown";
  }, [transactionState]);

  // Get transaction by ID
  const getTransactionById = useCallback((transactionId: string): Transaction | undefined => {
    const allTransactions = [
      ...transactionState.pendingTransactions,
      ...transactionState.confirmedTransactions,
      ...transactionState.failedTransactions,
    ];

    return allTransactions.find(tx => tx.id === transactionId);
  }, [transactionState]);

  // Monitor pending transactions for confirmations using Viem public client
  useEffect(() => {
    const monitorTransactions = async () => {
      const pendingTxs = transactionState.pendingTransactions.filter(tx => tx.txHash);
      if (pendingTxs.length === 0) return;

      for (const tx of pendingTxs) {
        if (!tx.txHash) continue;

        try {
          // Wait for transaction receipt using Viem
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: tx.txHash,
          });

          // Update transaction with receipt data
          setTransactionState(prev => ({
            ...prev,
            pendingTransactions: prev.pendingTransactions.filter(pTx => pTx.id !== tx.id),
            confirmedTransactions: [...prev.confirmedTransactions, {
              ...tx,
              status: "confirmed" as const,
              gasUsed: receipt.gasUsed.toString(),
              gasPrice: receipt.effectiveGasPrice.toString(),
              fee: formatEther(receipt.gasUsed * receipt.effectiveGasPrice),
            }],
          }));

          // Invalidate wallet balance queries
          if (walletState.address && walletState.chainId) {
            queryClient.invalidateQueries({
              queryKey: walletQueryKeys.balance(walletState.address, walletState.chainId)
            });
          }
        } catch (error) {
          // If waiting fails, mark as failed
          failTransaction(tx.id, error instanceof Error ? error.message : "Confirmation failed");
        }
      }
    };

    monitorTransactions();
  }, [transactionState.pendingTransactions, walletState.address, walletState.chainId, queryClient, failTransaction]);

  // Clean up transactions when wallet disconnects
  useEffect(() => {
    if (!walletState.isConnected) {
      setTransactionState({
        pendingTransactions: [],
        confirmedTransactions: [],
        failedTransactions: [],
      });
    }
  }, [walletState.isConnected]);

  const contextValue: TransactionStateContextType = {
    ...transactionState,
    addPendingTransaction,
    confirmTransaction,
    failTransaction,
    retryTransaction,
    clearCompletedTransactions,
    getTransactionStatus,
    getTransactionById,
  };

  return (
    <TransactionStateContext.Provider value={contextValue}>
      {children}
    </TransactionStateContext.Provider>
  );
};
