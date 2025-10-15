import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authClient, type User, type Session } from "@/lib/auth-client";
import { SiweMessage } from "siwe";
import { useSignMessage, useAccount } from "wagmi";

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials {
  email: string;
  password: string;
  name: string;
}

interface SIWECredentials {
  walletAddress: string;
  chainId: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  getBackend: () => any; // Keep for backward compatibility
  getAuthHeaders: () => Record<string, string>;
  // New Better Auth methods
  signInWithEthereum: (credentials: SIWECredentials) => Promise<void>;
  getSIWENonce: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { signMessageAsync } = useSignMessage();
  const { address } = useAccount();
  const isAuthenticated = !!user && !!session;

  // Determine backend target from env (VITE_CLIENT_TARGET) with fallback to generated Local (default: :4000)
  const backendTarget = import.meta.env.VITE_CLIENT_TARGET || ({} as any); // Keep for backward compatibility
  // Include cookies on cross-origin requests (needed for session cookie handling)
  const baseBackend = {} as any; // Simplified for Better Auth migration

  const authenticatedBackend = baseBackend; // Simplified for Better Auth migration

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const sessionData = await authClient.getSession();
        if (sessionData?.data?.user && sessionData?.data?.session) {
          setUser(sessionData.data.user);
          setSession(sessionData.data.session);
        }
      } catch (error) {
        console.error("Failed to get session:", error);
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      const result = await authClient.signIn.email({
        email: credentials.email,
        password: credentials.password,
      });

      if (result?.data?.user) {
        setUser(result.data.user);
        setSession({} as Session); // Simplified session handling for now
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (credentials: SignUpCredentials) => {
    try {
      setLoading(true);
      const result = await authClient.signUp.email({
        email: credentials.email,
        password: credentials.password,
        name: credentials.name,
      } as any);

      if (result?.data?.user) {
        setUser(result.data.user);
        setSession({} as Session); // Simplified session handling for now
      }
    } catch (error) {
      console.error("SignUp failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      // If user logged in with SIWE, call SIWE logout endpoint
      if (address) {
        try {          
          await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/auth/siwe/logout`, {
            method: "POST",
            credentials: "include",
          });
        } catch (siweError) {
          console.error("SIWE logout failed:", siweError);
          // Don't throw, continue with regular logout
        }
      }

      await authClient.signOut();      
      setUser(null);
      setSession(null);
      localStorage.removeItem("auth_token"); // Clear legacy token
       
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBackend = () => authenticatedBackend; // Keep for backward compatibility
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {};
    // Better Auth handles auth headers automatically via cookies/sessions
    return headers;
  };

  // New SIWE methods - full implementation
  const signInWithEthereum = async (credentials: SIWECredentials) => {
    try {
      setLoading(true);
      // Since SIWE is handled by the backend plugin,
      const nonceResponse = await authClient.siwe.nonce({
        walletAddress: credentials.walletAddress,
        chainId: credentials.chainId,
        // Additional SIWE parameters would be handled by the SIWEButton
      });

      if (!nonceResponse.data?.nonce) {
        throw new Error("Failed to get SIWE nonce");
      }

      const message = new SiweMessage({
        domain: window.location.hostname,
        address: credentials.walletAddress,
        statement: "Sign in with Ethereum to access your account.",
        uri: window.location.origin,
        version: "1",
        chainId: credentials.chainId,
        nonce: nonceResponse.data.nonce,
      });

      if (!message.prepareMessage()) {
        throw new Error("Failed to prepare SIWE message");
      }

      try {
        // Sign the message
        const signature = await signMessageAsync({
          message: message.prepareMessage(),
        });

        // Verify with Better Auth
        const verifyResponse = await authClient.siwe.verify({
          message: message.prepareMessage(),
          signature,
          walletAddress: credentials.walletAddress as `0x${string}`,
          chainId: credentials.chainId,
          email: `${credentials.walletAddress}@farsquare.xyz`,
        });

        if (verifyResponse.error) {
          throw new Error("SIWE verification failed");
        }

        setUser({
          email: `${credentials.walletAddress}@farsquare.xyz`, 
          name: credentials.walletAddress} as User);
        // For SIWE, session might be handled differently
        setSession({} as Session);

      } catch (siweError) {
        let errorMessage = "SIWE verification failed";

        if (siweError instanceof Error) {
          if (siweError.message.includes("signature")) {
            errorMessage = "Message signature rejected";
          } else {
            errorMessage = siweError.message;
          }
        }

      } finally {
        //setIsSigning(false);
      }


    } catch (error) {
      console.error("SIWE authentication failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getSIWENonce = async (): Promise<string> => {
    try {
      // Get nonce from Better Auth SIWE endpoint
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/auth/siwe/nonce`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get SIWE nonce");
      }

      const data = await response.json();

      if (!data || typeof data.nonce !== 'string') {
        throw new Error("Invalid nonce response");
      }

      return data.nonce;
    } catch (error) {
      console.error("Failed to get SIWE nonce:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      login,
      signUp,
      logout,
      getBackend,
      getAuthHeaders,
      signInWithEthereum,
      getSIWENonce
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
