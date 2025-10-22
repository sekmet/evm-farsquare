import { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain } from "wagmi";
import { Address } from "viem";
import { supportedChains } from "@/lib/viem-client";

// Wallet balance interface for EVM networks
interface WalletBalanceState {
  value: bigint;
  decimals: number;
  formatted: string;
  symbol: string;
  updatedAt: string | null;
}

// Wallet state interface for EVM
interface WalletState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  address: Address | null;
  chainId: number | null;
  balance: WalletBalanceState | null;
}

// Action types for EVM wallet
type WalletAction =
  | { type: "CONNECT_START" }
  | {
      type: "CONNECT_SUCCESS";
      payload: { address: Address; chainId: number };
    }
  | { type: "CONNECT_ERROR"; payload: string }
  | { type: "DISCONNECT" }
  | { type: "SET_BALANCE"; payload: WalletBalanceState | null }
  | { type: "SET_CHAIN"; payload: number }
  | { type: "CLEAR_ERROR" };

// Initial state
const initialState: WalletState = {
  isConnected: false,
  isLoading: false,
  error: null,
  address: null,
  chainId: null,
  balance: null,
};

// Reducer function
const walletReducer = (state: WalletState, action: WalletAction): WalletState => {
  switch (action.type) {
    case "CONNECT_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case "CONNECT_SUCCESS":
      return {
        ...state,
        isConnected: true,
        isLoading: false,
        address: action.payload.address,
        chainId: action.payload.chainId,
        error: null,
      };
    case "CONNECT_ERROR":
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case "DISCONNECT":
      return {
        ...initialState,
      };
    case "SET_BALANCE":
      return {
        ...state,
        balance: action.payload,
      };
    case "SET_CHAIN":
      return {
        ...state,
        chainId: action.payload,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Context interface
interface WalletContextType {
  state: WalletState;
  connectWallet: (connectorId: string) => Promise<void>;
  disconnectWallet: () => void;
  switchChain: (chainId: number) => Promise<void>;
  clearError: () => void;
}

// Create context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider props
interface WalletProviderProps {
  children: ReactNode;
}

// Provider component
export const WalletProvider = ({ children }: WalletProviderProps) => {
  const [state, dispatch] = useReducer(walletReducer, initialState);
  const queryClient = useQueryClient();

  // Wagmi hooks
  const { address, isConnected, chainId, connector } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  // Balance query using Wagmi
  const { data: balanceData } = useBalance({
    address: state.address ?? undefined,
    chainId: state.chainId ?? undefined,
  });

  // Sync Wagmi state with our reducer
  useEffect(() => {
    if (isConnected && address && chainId) {
      dispatch({
        type: "CONNECT_SUCCESS",
        payload: { address, chainId },
      });
    } else if (!isConnected && !isPending) {
      dispatch({ type: "DISCONNECT" });
    }
  }, [isConnected, address, chainId, isPending]);

  // Update balance when data changes
  useEffect(() => {
    if (balanceData) {
      const balance: WalletBalanceState = {
        value: balanceData.value,
        decimals: balanceData.decimals,
        formatted: balanceData.formatted,
        symbol: balanceData.symbol,
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: "SET_BALANCE", payload: balance });
    }
  }, [balanceData]);

  // Helper function to create user profile if it doesn't exist
  const createUserProfileIfNeeded = async (address: Address) => {
    try {
      // Check if user profile already exists for this wallet address
      const existingUser = await fetch('/api/users/by-address/' + address, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (existingUser.ok) {
        const userData = await existingUser.json();
        if (userData.success && userData.data) {
          console.log('User profile already exists for wallet:', address);
          return; // User already exists
        }
      }

      // Create new user profile
      const createResponse = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          walletType: connector?.name?.toLowerCase() || 'unknown',
        }),
      });

      if (createResponse.ok) {
        const result = await createResponse.json();
        if (result.success) {
          console.log('Created new user profile for wallet:', address);
        } else {
          console.error('Failed to create user profile:', result.error);
        }
      } else {
        console.error('Failed to create user profile - HTTP error:', createResponse.status);
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
      // Don't throw - wallet connection should succeed even if user profile creation fails
    }
  };

  // Connect wallet function using Wagmi
  const connectWallet = async (connectorId: string) => {
    try {
      const connector = connectors.find(c => c.id === connectorId);
      if (!connector) {
        throw new Error(`Connector ${connectorId} not found`);
      }

      dispatch({ type: "CONNECT_START" });

      await connect({ connector });

      // Create user profile after successful connection
      if (address) {
        await createUserProfileIfNeeded(address);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      dispatch({ type: "CONNECT_ERROR", payload: errorMessage });
      throw error;
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    disconnect();
    dispatch({ type: "DISCONNECT" });
    queryClient.clear();
  };

  // Switch chain function
  const switchChain = async (chainId: number) => {
    try {
      await switchChainAsync({ chainId });
      dispatch({ type: "SET_CHAIN", payload: chainId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch chain';
      dispatch({ type: "CONNECT_ERROR", payload: errorMessage });
      throw error;
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const value: WalletContextType = {
    state,
    connectWallet,
    disconnectWallet,
    switchChain,
    clearError,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Hook to use wallet context
export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

// Export types
export type { WalletState, WalletAction, WalletBalanceState };
