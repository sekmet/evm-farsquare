import { useState, useEffect } from "react";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Wallet, CheckCircle, XCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface WalletConnectFieldProps {
  userId: string;
  onWalletConnected?: (address: string) => void;
}

export function WalletConnectField({ userId, onWalletConnected }: WalletConnectFieldProps) {
  const { connectors, connect, isPending } = useConnect();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { user } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Get the injected connector (MetaMask, etc.)
  const injectedConnector = connectors.find(
    (connector) => connector.id === "injected" || connector.id === "metaMask"
  );

  const hasWalletAvailable = !!injectedConnector;

  useEffect(() => {
    // Reset error when wallet becomes available
    if (hasWalletAvailable) {
      setError(null);
    }
  }, [hasWalletAvailable]);

  // Mutation to update user profile with evm_address
  const updateProfileMutation = useMutation({
    mutationFn: async (evmAddress: string) => {
      const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          evm_address: evmAddress,
          email: user?.email,
          full_name: user?.name,
          user_type: 'individual',
          jurisdiction: 'XX',
          /*onboarding_status: 'completed',
          onboarding_current_step: 'completed',
          onboarding_progress: 100,
          onboarding_started_at: new Date(),
          onboarding_completed_at: new Date(),
          kyc_status: 'approved',
          kyc_verified_at: new Date(),
          kyc_expires_at: new Date(),
          identity_verified: true,
          identity_country_code: 1,
          onchain_identity_address: evmAddress,
          qualification_status: 'approved',
          qualified_at: new Date(),
          accredited_investor: true,
          privacy_consent: true,
          terms_consent: true,
          data_processing_consent: true,
          esign_completed: true,
          esign_completed_at: new Date(),
          account_status: 'active',
          suspension_reason: null,
          last_login_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),*/
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update profile' }));
        throw new Error(errorData.error || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been linked to your account successfully.",
      });
      onWalletConnected?.(address!);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
      setError(errorMessage);
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // When wallet connects, update the profile
  useEffect(() => {
    if (isConnected && address && !isUpdatingProfile) {
      setIsUpdatingProfile(true);
      updateProfileMutation.mutate(address);
    }
  }, [isConnected, address, updateProfileMutation, isUpdatingProfile]);

  const handleConnect = async () => {
    if (!hasWalletAvailable) {
      setError("No Ethereum wallet found. Please install MetaMask or similar");
      return;
    }

    setError(null);

    try {
      connect({ connector: injectedConnector }, {
        onSuccess: () => {
          // Profile update will happen in useEffect
        },
        onError: (connectError) => {
          let errorMessage = "Wallet connection failed";

          if (connectError instanceof Error) {
            if (connectError.message.includes("rejected") || connectError.message.includes("denied")) {
              errorMessage = "Wallet connection rejected";
            } else {
              errorMessage = connectError.message;
            }
          }

          setError(errorMessage);
          toast({
            title: "Connection Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during wallet connection";
      setError(errorMessage);
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setError(null);
  };

  const isLoading = isPending || updateProfileMutation.isPending;

  return (
    <div className="space-y-4 min-w-sm sm:min-w-3xl">
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="items-center justify-between p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center gap-3">
          {isConnected ? <CheckCircle className="h-10 w-10 text-green-500" /> : <Wallet className="h-10 w-10 text-gray-600" />}
          <div>
            <h4 className="font-medium">{isConnected ? 'Wallet Connected' : 'Connect your wallet'}</h4>
            <p className="text-sm text-gray-600">
              {isConnected
                ? `Connected: ${address/*address?.slice(0, 6)}...${address?.slice(-4)*/}`
                : "Connect your wallet (Metamask, Coinbase, etc...) to continue"
              }
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {isConnected ? (
            <>
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                size="lg"
                disabled={isLoading}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={!hasWalletAvailable || isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {!hasWalletAvailable && (
        <Alert>
          <AlertDescription>
            No Ethereum compatible wallet detected. Please install MetaMask or a compatible wallet to continue.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
