import { useState, useEffect } from "react";
import { useConnect, useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";

interface SIWEButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function SIWEButton({ onSuccess, onError }: SIWEButtonProps) {
  const { t } = useI18n();
  const { signInWithEthereum } = useAuth();
  const { connectors, connect, isPending } = useConnect();
  const { address, chainId, isConnected } = useAccount();

  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

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

  const handleConnect = async () => {
    if (!hasWalletAvailable) {
      setError("No Ethereum wallet found. Please install MetaMask or similar");
      return;
    }

    setError(null);

    try {
      // Connect wallet using Wagmi
      connect({ connector: injectedConnector }, {
        onSuccess: async () => {
          // After wallet connection, perform SIWE
          setIsSigning(true);
          try {
            await signInWithEthereum({
              walletAddress: address!,
              chainId: chainId!,
            });
            onSuccess?.();
          } catch (siweError) {
            let errorMessage = "SIWE verification failed";

            if (siweError instanceof Error) {
              if (siweError.message.includes("signature")) {
                errorMessage = "Message signature rejected";
              } else {
                errorMessage = siweError.message;
              }
            }

            setError(errorMessage);
            onError?.(errorMessage);
          } finally {
            setIsSigning(false);
          }
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
          onError?.(errorMessage);
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during wallet connection";
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const isLoading = isPending || isSigning;

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleConnect}
        disabled={!hasWalletAvailable || isLoading}
        className="w-full"
        size="lg"
        variant="outline"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isSigning ? "Signing..." : "Connecting..."}
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </>
        )}
      </Button>

      {!hasWalletAvailable && (
        <p className="text-sm text-muted-foreground text-center">
          No Ethereum wallet detected. Please install MetaMask or a compatible wallet.
        </p>
      )}
    </div>
  );
}
