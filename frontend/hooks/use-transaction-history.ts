import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/contexts/wallet-context";
import { Address, formatEther } from "viem";
import { mainnet, base, hedera } from "viem/chains";

export interface Transaction {
  id: string;
  type: "transfer" | "receive";
  amount: string; // ETH amount as string (wei)
  amountDisplay: number; // Amount for display (ETH)
  tokenType: "ETH" | "HBAR"; // Type of token
  tokenSymbol: string; // Token symbol (ETH, USDC, etc.)
  toAddress?: Address;
  fromAddress?: Address;
  timestamp: Date;
  status: "pending" | "confirmed" | "failed";
  gasUsed?: string;
  gasPrice?: string;
  fee?: string;
  txHash: `0x${string}`;
  contractAddress?: Address; // For HBAR tokens
}

export interface TransactionFilters {
  type?: "transfer" | "receive" | "all";
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface TransactionHistoryParams {
  page?: number;
  limit?: number;
  filters?: TransactionFilters;
}

const ETHERSCAN_API_URL = "https://api.etherscan.io/api";
const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || ""; // Note: API key should be configured

// Chain-specific API configurations
const getChainApiConfig = (chainId: number) => {
  switch (chainId) {
    case mainnet.id:
      return {
        baseUrl: "https://api.etherscan.io/api",
        apiKey: ETHERSCAN_API_KEY,
      };
    case base.id:
      return {
        baseUrl: "https://api.basescan.org/api",
        apiKey: ETHERSCAN_API_KEY,
      };
    case hedera.id:
      // Hedera doesn't have Etherscan-like API, return empty for now
      return {
        baseUrl: "",
        apiKey: "",
      };
    default:
      // Fallback to mainnet
      return {
        baseUrl: "https://api.etherscan.io/api",
        apiKey: ETHERSCAN_API_KEY,
      };
  }
};

export const useTransactionHistory = (params: TransactionHistoryParams = {}) => {
  const { state } = useWallet();
  const { page = 1, limit = 20, filters } = params;

  return useQuery({
    queryKey: [
      "transaction-history",
      state.address,
      state.chainId,
      { page, limit, ...filters },
    ],
    queryFn: async (): Promise<{
      transactions: Transaction[];
      total: number;
      page: number;
      limit: number;
    }> => {
      if (!state.isConnected || !state.address || !state.chainId) {
        throw new Error("Wallet not connected or chain not set");
      }

      const apiConfig = getChainApiConfig(state.chainId);

      if (!apiConfig.baseUrl) {
        // Chain doesn't support transaction history API
        return {
          transactions: [],
          total: 0,
          page,
          limit,
        };
      }

      try {
        // For EVM, use Etherscan-like API to fetch transaction history
        const offset = (page - 1) * limit;
        const url = `${apiConfig.baseUrl}?module=account&action=txlist&address=${state.address}&startblock=0&endblock=99999999&page=${page}&offset=${limit}&sort=desc&apikey=${apiConfig.apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch transactions: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status !== "1") {
          throw new Error(`Etherscan API error: ${data.message}`);
        }

        // Transform Etherscan API response to our Transaction interface
        const transactions: Transaction[] = [];

        for (const tx of data.result) {
          // Handle ETH transfers
          const isReceive = tx.to.toLowerCase() === state.address.toLowerCase();
          const amount = tx.value; // wei as string
          const amountDisplay = parseFloat(formatEther(BigInt(amount)));

          transactions.push({
            id: tx.hash,
            type: isReceive ? "receive" : "transfer",
            amount: amount,
            amountDisplay: amountDisplay,
            tokenType: "ETH",
            tokenSymbol: "ETH",
            toAddress: tx.to as Address,
            fromAddress: tx.from as Address,
            timestamp: new Date(parseInt(tx.timeStamp) * 1000),
            status: tx.txreceipt_status === "1" ? "confirmed" : 
                   tx.confirmations === "0" ? "pending" : "failed",
            gasUsed: tx.gasUsed,
            gasPrice: tx.gasPrice,
            fee: tx.gasUsed && tx.gasPrice ? formatEther(BigInt(tx.gasUsed) * BigInt(tx.gasPrice)) : undefined,
            txHash: tx.hash as `0x${string}`,
          });
        }

        // Apply client-side filters if provided
        let filteredTransactions = transactions;

        if (filters?.type && filters.type !== "all") {
          filteredTransactions = filteredTransactions.filter(
            (tx) => tx.type === filters.type
          );
        }

        if (filters?.dateFrom) {
          filteredTransactions = filteredTransactions.filter(
            (tx) => tx.timestamp >= filters.dateFrom!
          );
        }

        if (filters?.dateTo) {
          filteredTransactions = filteredTransactions.filter(
            (tx) => tx.timestamp <= filters.dateTo!
          );
        }

        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          filteredTransactions = filteredTransactions.filter(
            (tx) =>
              tx.txHash.toLowerCase().includes(searchLower) ||
              tx.toAddress?.toLowerCase().includes(searchLower) ||
              tx.fromAddress?.toLowerCase().includes(searchLower)
          );
        }

        return {
          transactions: filteredTransactions,
          total: parseInt(data.result.length) || filteredTransactions.length, // Etherscan doesn't provide total count easily
          page,
          limit,
        };
      } catch (error) {
        console.error("Error fetching transaction history:", error);
        // Return empty result on error instead of throwing
        return {
          transactions: [],
          total: 0,
          page,
          limit,
        };
      }
    },
    enabled: !!state.address && state.isConnected,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
};
