import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { IdentityStatus } from "@/components/onboarding/identity-status";
import { IdentityClaims } from "@/components/onboarding/identity-claims";
import { useIdentitySetup } from "@/hooks/use-identity-setup";
import { useWallet } from "@/contexts/wallet-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, Wallet, CheckCircle, ArrowRight, AlertTriangle } from "lucide-react";
import { CountryCodes, type CountryCode } from "@/lib/contracts/identity-types";
import { useAccount } from "wagmi";

export default function OnboardingIdentity() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { connectWallet, state: walletState, switchChain } = useWallet();
  const { connector } = useAccount();
  const {
    createIdentity,
    identity,
    verificationStatus,
    isConnected,
    walletAddress,
    userId,
    sessionData,
    isCreating,
    createError,
  } = useIdentitySetup(sessionId!);

  // Map country codes to names for display
  const getCountryName = (code: CountryCode) => {
    const countryMap: Record<CountryCode, string> = {
      [CountryCodes.USA]: 'United States',
      [CountryCodes.UK]: 'United Kingdom',
      [CountryCodes.EU]: 'European Union',
      [CountryCodes.CANADA]: 'Canada',
      [CountryCodes.AUSTRALIA]: 'Australia',
      [CountryCodes.SINGAPORE]: 'Singapore',
      [CountryCodes.SWITZERLAND]: 'Switzerland',
    };
    return countryMap[code] || `Country ${code}`;
  };

  // Get jurisdiction from session or default to USA
  const getCountryCodeFromJurisdiction = (jurisdiction: string): CountryCode => {
    const jurisdictionMap: Record<string, CountryCode> = {
      'us': CountryCodes.USA,
      'uk': CountryCodes.UK,
      'eu': CountryCodes.EU,
      'ca': CountryCodes.CANADA,
      'au': CountryCodes.AUSTRALIA,
      'sg': CountryCodes.SINGAPORE,
      'ch': CountryCodes.SWITZERLAND,
    };
    return jurisdictionMap[jurisdiction?.toLowerCase()] || CountryCodes.USA;
  };

  const [claims, setClaims] = useState<Record<string, { value: string; verified?: boolean }>>({
    KYC: { value: "Verified", verified: true },
    AML: { value: "Verified", verified: true },
    ACCREDITATION: { value: "Qualified", verified: true },
    JURISDICTION: { value: "United States", verified: true },
  });

  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode>(CountryCodes.USA);

  // Load claims from session data when available
  useEffect(() => {
    if (sessionData?.sessionData?.identity?.claims) {
      // Load stored claims from session data
      const storedClaims = sessionData.sessionData.identity.claims;
      setClaims(prev => ({
        ...prev,
        ...storedClaims
      }));
    }

    if (sessionData?.jurisdiction) {
      // Map jurisdiction to country code
      const countryCode = getCountryCodeFromJurisdiction(sessionData.jurisdiction);
      const countryName = getCountryName(countryCode);
      setSelectedCountryCode(countryCode);
      setClaims(prev => ({
        ...prev,
        JURISDICTION: { value: countryName, verified: true }
      }));
    }
  }, [sessionData]);

  // Update claims when verification status changes
  useEffect(() => {
    if (verificationStatus.isVerified && verificationStatus.countryCode) {
      const countryName = getCountryName(verificationStatus.countryCode);
      setClaims(prev => ({
        ...prev,
        JURISDICTION: { value: countryName, verified: true }
      }));
    }
  }, [verificationStatus]);

  /**
   * Handle identity creation with ERC-3643 flow
   */
  const handleCreateIdentity = () => {
    if (!userId) {
      console.error('User ID not available');
      return;
    }

    if (!walletAddress) {
      console.error('Wallet not connected');
      return;
    }

    const claimData = Object.fromEntries(
      Object.entries(claims).map(([key, claim]) => [key, claim.value])
    );

    createIdentity.mutate({
      claims: claimData,
      userId,
      countryCode: selectedCountryCode,
    });
  };

  const handleUpdateClaim = (claimKey: string, value: string) => {
    setClaims(prev => ({
      ...prev,
      [claimKey]: { value, verified: true }
    }));
  };

  // EVM wallet connectors
  const evmWallets = [
    { id: "injected", label: "Browser Wallet", icon: "🦊", description: "MetaMask, Rabby, etc." },
    { id: "metaMask", label: "MetaMask", icon: "🦊", description: "Popular Ethereum wallet" },
    { id: "coinbaseWalletSDK", label: "Coinbase Wallet", icon: "🔷", description: "Coinbase Wallet" },
    { id: "walletConnect", label: "WalletConnect", icon: "⚡", description: "Connect any mobile wallet" },
  ];

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
      <div className="max-w-6xl mx-auto mt-0">
        {/* Progress Indicator */}
        <div className="mb-8">
          <OnboardingProgress currentStep="identity" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Identity Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  On-Chain Identity Setup
                </CardTitle>
                <CardDescription className="text-lg">
                  Create your blockchain-based digital identity for secure property token ownership and compliance verification.
                </CardDescription>
                <div className="flex items-center gap-2 mt-4">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    Self-Sovereign
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    ERC-3643 Compatible
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Identity Status */}
                <IdentityStatus identity={identity} isLoading={createIdentity.isPending} />

                {/* Wallet Connection */}
                {!isConnected ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Connect Your EVM Wallet</h3>
                    <p className="text-gray-600">
                      Connect an Ethereum-compatible wallet to create your OnchainID identity and access regulated security tokens.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {evmWallets.map((wallet) => (
                        <Button
                          key={wallet.id}
                          variant="outline"
                          className="h-24 flex flex-col items-center justify-center gap-2 hover:border-primary"
                          onClick={() => connectWallet(wallet.id)}
                          disabled={walletState.isLoading}
                        >
                          <span className="text-3xl">{wallet.icon}</span>
                          <div className="text-center">
                            <span className="text-sm font-medium block">{wallet.label}</span>
                            <span className="text-xs text-gray-500">{wallet.description}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <div className="flex justify-between items-center">
                          <div>
                            <strong>Wallet Connected</strong>
                            <p className="text-sm mt-1 font-mono">{walletAddress}</p>
                            <p className="text-xs mt-1">Chain: {walletState.chainId} | {connector?.name}</p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>

                    {/* Show verification status if exists */}
                    {verificationStatus.exists && (
                      <Alert className={verificationStatus.isVerified ? "border-blue-200 bg-blue-50" : "border-yellow-200 bg-yellow-50"}>
                        <Shield className={`h-4 w-4 ${verificationStatus.isVerified ? 'text-blue-600' : 'text-yellow-600'}`} />
                        <AlertDescription>
                          <strong>{verificationStatus.isVerified ? 'Identity Verified' : 'Identity Pending Verification'}</strong>
                          {verificationStatus.identityAddress && (
                            <p className="text-xs mt-1 font-mono">Identity: {verificationStatus.identityAddress}</p>
                          )}
                          {verificationStatus.countryCode && (
                            <p className="text-xs mt-1">Country: {getCountryName(verificationStatus.countryCode)}</p>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Identity Claims */}
                {isConnected && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Identity Claims</h3>
                    <IdentityClaims claims={claims} onUpdate={handleUpdateClaim} />
                  </div>
                )}

                {/* Create Identity Button */}
                {isConnected && !verificationStatus.exists && (
                  <div className="space-y-2">
                    <Button
                      onClick={handleCreateIdentity}
                      disabled={isCreating || !userId}
                      className="w-full"
                      size="lg"
                    >
                      {isCreating ? (
                        <>
                          <span className="animate-pulse">Creating OnchainID Identity...</span>
                        </>
                      ) : (
                        <>
                          Create ERC-3643 Identity
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                    {createError && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Error:</strong> {createError.message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Already verified message */}
                {isConnected && verificationStatus.isVerified && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Identity Already Verified</strong>
                      <p className="text-sm mt-1">Your OnchainID identity is registered and verified in the ERC-3643 Identity Registry.</p>
                      <Button
                        onClick={() => window.location.href = `/onboarding/qualification/${sessionId}`}
                        className="mt-3"
                        size="sm"
                      >
                        Continue to Next Step
                        <ArrowRight className="w-3 h-3 ml-2" />
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Security Warning */}
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Security & Privacy:</strong> Your private keys never leave your wallet. 
                    Identity creation is a blockchain transaction that creates an OnchainID smart contract. 
                    All identity data is cryptographically secured and follows ERC-3643 compliance standards.
                  </AlertDescription>
                </Alert>

                {/* ERC-3643 Info */}
                <Alert className="border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>ERC-3643 Compliance:</strong> This creates a permissioned identity contract 
                    that enables you to hold and trade regulated security tokens while maintaining 
                    KYC/AML compliance and jurisdictional requirements.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Identity Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Regulatory Compliance</h4>
                    <p className="text-sm text-gray-600">
                      Meet KYC/AML requirements for tokenized real estate
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Self-Sovereign</h4>
                    <p className="text-sm text-gray-600">
                      You control your identity data and permissions
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Blockchain Verified</h4>
                    <p className="text-sm text-gray-600">
                      Cryptographically verifiable on the EVM networks
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert className="mt-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your identity data is encrypted and stored securely on the EVM blockchain network.
                We follow GDPR and CCPA privacy standards.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
