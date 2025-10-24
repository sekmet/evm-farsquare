import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  User,
  Building,
  Wallet,
  ExternalLink
} from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { hardhat, anvil, sepolia, baseSepolia, optimismSepolia } from 'viem/chains';

interface ComplianceStatusProps {
  propertyId: string;
  userId?: string;
  className?: string;
}

interface ComplianceData {
  overallEligible: boolean;
  requirements: {
    kyc: {
      status: 'pending' | 'approved' | 'rejected' | 'not_required';
      completedAt?: string;
      expiresAt?: string;
      provider?: string;
    };
    accreditation: {
      status: 'pending' | 'approved' | 'rejected' | 'not_required';
      completedAt?: string;
      expiresAt?: string;
      level?: 'individual' | 'entity';
    };
    jurisdiction: {
      status: 'eligible' | 'restricted' | 'blocked';
      allowedCountries: string[];
      restrictedCountries: string[];
      userCountry?: string;
    };
    investmentLimits: {
      status: 'within_limits' | 'approaching_limit' | 'exceeded_limit';
      currentInvestment: number;
      maxInvestment: number;
      period: 'daily' | 'monthly' | 'yearly' | 'lifetime';
    };
    tokenHolding: {
      status: 'eligible' | 'restricted';
      currentHoldings: number;
      maxHoldings: number;
      lockupPeriod?: number;
    };
  };
  nextSteps: string[];
  documents: {
    name: string;
    status: 'pending' | 'submitted' | 'approved' | 'rejected';
    submittedAt?: string;
    reviewedAt?: string;
  }[];
  lastUpdated: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ============================================================================
// EVM CLIENT CONFIGURATION - Viem/Wagmi Patterns
// ============================================================================

// Create public client for read-only operations (ERC-3643 compliance)
const publicClient = createPublicClient({
  chain: anvil, // Using Base network for production EVM interactions
  transport: http(import.meta.env.VITE_EVM_RPC_URL || 'http://127.0.0.1:8545'),
});

// Supported chains for multi-chain deployment
export const supportedChains = [hardhat, anvil, sepolia, baseSepolia, optimismSepolia] as const;

// ============================================================================
// ERC-3643 IDENTITY REGISTRY FUNCTIONS - Viem/Wagmi Patterns
// ============================================================================

/**
 * Check if an address is registered in the ERC-3643 identity registry
 * Uses identityRegistry.isVerified() and identityRegistry.identity() methods
 */
async function checkIdentityRegistration(userAddress: Address, identityRegistryAddress?: Address): Promise<boolean> {
  if (!identityRegistryAddress) return false;

  try {
    // ERC-3643 identity registry ABI for verification
    const identityRegistryAbi = parseAbi([
      'function isVerified(address) external view returns (bool)',
      'function identity(address) external view returns (address)',
      'function investors(address) external view returns (uint256)',
      'function hasClaim(address,uint256) external view returns (bool)'
    ]);

    // Check if user is verified in identity registry
    const isVerified = await publicClient.readContract({
      address: identityRegistryAddress,
      abi: identityRegistryAbi,
      functionName: 'isVerified',
      args: [userAddress]
    });

    return isVerified as boolean;
  } catch (error) {
    console.error(`Failed to check identity registration for ${userAddress}:`, error);
    return false;
  }
}

/**
 * Check if user has required accreditation claims in ERC-3643
 */
async function checkAccreditationClaims(userAddress: Address, identityRegistryAddress?: Address): Promise<boolean> {
  if (!identityRegistryAddress) return false;

  try {
    const identityRegistryAbi = parseAbi([
      'function hasClaim(address,uint256) external view returns (bool)',
      'function getClaimIdsByTopic(uint256) external view returns (uint256[])'
    ]);

    // Check for common accreditation claim topics
    // Topic 1: KYC/AML verification
    // Topic 2: Accreditation status
    // Topic 3: Country restrictions
    const accreditationTopics = [1, 2, 3]; // Define based on your claim topics

    for (const topic of accreditationTopics) {
      try {
        const hasClaim = await publicClient.readContract({
          address: identityRegistryAddress,
          abi: identityRegistryAbi,
          functionName: 'hasClaim',
          args: [userAddress, BigInt(topic)]
        });

        if (hasClaim as boolean) {
          return true; // User has at least one accreditation claim
        }
      } catch {
        // Continue checking other topics
      }
    }

    return false;
  } catch (error) {
    console.error(`Failed to check accreditation claims for ${userAddress}:`, error);
    return false;
  }
}

/**
 * Enhanced compliance status fetch with ERC-3643 integration
 */
async function fetchComplianceStatus(propertyId: string, userId?: string, userAddress?: Address): Promise<ComplianceData | null> {
  if (!userId && !userAddress) {
    return null;
  }

  try {
    // First try to get compliance data from API
    const apiResponse = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/compliance/${userId || userAddress}`);
    let apiData = null;

    if (apiResponse.ok) {
      const apiResult = await apiResponse.json();
      if (apiResult.success) {
        apiData = apiResult.data;
      }
    }

    // Enhanced compliance checking with ERC-3643 identity registry
    let blockchainIdentityVerified = false;
    let blockchainAccreditationVerified = false;
    let identityRegistryAddress: Address | undefined;

    // Check if we have a user address for blockchain verification
    if (userAddress && userAddress.startsWith('0x')) {
      try {
        // Get identity registry address from property or use default
        // In production, this would come from the deployed ERC-3643 contracts
        identityRegistryAddress = '0x1234567890123456789012345678901234567890'; // Placeholder

        // Check blockchain identity verification
        blockchainIdentityVerified = await checkIdentityRegistration(
          userAddress as Address,
          identityRegistryAddress
        );

        // Check blockchain accreditation claims
        blockchainAccreditationVerified = await checkAccreditationClaims(
          userAddress as Address,
          identityRegistryAddress
        );

        console.log(`Blockchain compliance check for ${userAddress}:`, {
          identityVerified: blockchainIdentityVerified,
          accreditationVerified: blockchainAccreditationVerified
        });
      } catch (blockchainError) {
        console.warn('Blockchain compliance verification failed:', blockchainError);
        // Continue with API data
      }
    }

    // Combine API and blockchain data
    if (apiData) {
      // Enhance API data with blockchain verification
      return {
        ...apiData,
        requirements: {
          ...apiData.requirements,
          kyc: {
            ...apiData.requirements.kyc,
            status: blockchainIdentityVerified ? 'approved' : apiData.requirements.kyc.status
          },
          accreditation: {
            ...apiData.requirements.accreditation,
            status: blockchainAccreditationVerified ? 'approved' : apiData.requirements.accreditation.status
          }
        },
        // Recalculate overall eligibility based on enhanced requirements
        overallEligible: apiData.overallEligible || (blockchainIdentityVerified && blockchainAccreditationVerified)
      };
    } else if (userAddress) {
      // Fallback: Generate basic compliance data from blockchain verification
      return {
        overallEligible: blockchainIdentityVerified && blockchainAccreditationVerified,
        requirements: {
          kyc: {
            status: blockchainIdentityVerified ? 'approved' : 'pending',
            completedAt: blockchainIdentityVerified ? new Date().toISOString() : undefined,
            provider: 'ERC-3643 Identity Registry'
          },
          accreditation: {
            status: blockchainAccreditationVerified ? 'approved' : 'pending',
            completedAt: blockchainAccreditationVerified ? new Date().toISOString() : undefined,
            level: 'individual'
          },
          jurisdiction: {
            status: 'eligible',
            allowedCountries: ['US', 'CA', 'GB', 'DE', 'FR'],
            restrictedCountries: [],
            userCountry: undefined
          },
          investmentLimits: {
            status: 'within_limits',
            currentInvestment: 0,
            maxInvestment: 100000,
            period: 'yearly'
          },
          tokenHolding: {
            status: 'eligible',
            currentHoldings: 0,
            maxHoldings: 1000000,
            lockupPeriod: undefined
          }
        },
        nextSteps: blockchainIdentityVerified && blockchainAccreditationVerified ? [] : [
          'Complete ERC-3643 identity verification',
          'Obtain required accreditation claims'
        ],
        documents: [],
        lastUpdated: new Date().toISOString()
      };
    }

    return null;
  } catch (error) {
    console.error('Compliance status fetch error:', error);
    return null;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved':
    case 'eligible':
    case 'within_limits':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'rejected':
    case 'blocked':
    case 'exceeded_limit':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'restricted':
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-gray-500" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'approved':
    case 'eligible':
    case 'within_limits':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'pending':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'rejected':
    case 'blocked':
    case 'exceeded_limit':
      return 'text-red-700 bg-red-50 border-red-200';
    case 'restricted':
    case 'approaching_limit':
      return 'text-orange-700 bg-orange-50 border-orange-200';
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200';
  }
}

export function ComplianceStatus({ propertyId, userId, className }: ComplianceStatusProps) {
  const { state } = useWallet();
  const userAddress = state.address;
  const isWalletConnected = state.isConnected; // Simple check for wallet connection

  const { data: complianceData, isLoading, error } = useQuery({
    queryKey: ['compliance-status', propertyId, userId || userAddress],
    queryFn: () => fetchComplianceStatus(propertyId, userId, userAddress as Address),
    enabled: !!(userId || userAddress),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!isWalletConnected && !userId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Investment Compliance
          </CardTitle>
          <CardDescription>
            Connect your EVM wallet to check investment eligibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              Please connect your EVM wallet (MetaMask, Coinbase Wallet, etc.) to view compliance status and investment requirements.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Investment Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !complianceData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Investment Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to verify compliance status. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const overallEligible = complianceData.overallEligible;
  const requirements = complianceData.requirements;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Investment Compliance
          <Badge variant={overallEligible ? "default" : "destructive"}>
            {overallEligible ? 'Eligible' : 'Not Eligible'}
          </Badge>
        </CardTitle>
        <CardDescription>
          ERC-3643 Level 3 security token compliance verification for tokenized real estate investment
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {getStatusIcon(overallEligible ? 'approved' : 'rejected')}
            <div>
              <p className="font-medium">
                {overallEligible ? 'Eligible to Invest' : 'Not Eligible to Invest'}
              </p>
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date(complianceData.lastUpdated).toLocaleString()}
              </p>
            </div>
          </div>
          {overallEligible && (
            <Button size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Certificate
            </Button>
          )}
        </div>

        {/* Compliance Requirements */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Compliance Requirements
          </h4>

          {/* KYC Status */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              {getStatusIcon(requirements.kyc.status)}
              <div>
                <p className="font-medium">Know Your Customer (KYC)</p>
                <p className="text-sm text-muted-foreground">
                  Identity verification - {requirements.kyc.provider || 'Required'}
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(requirements.kyc.status)}>
              {requirements.kyc.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Accreditation Status */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              {getStatusIcon(requirements.accreditation.status)}
              <div>
                <p className="font-medium">Investor Accreditation</p>
                <p className="text-sm text-muted-foreground">
                  SEC Regulation D compliance - {requirements.accreditation.level || 'Individual'}
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(requirements.accreditation.status)}>
              {requirements.accreditation.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Jurisdiction Status */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              {getStatusIcon(requirements.jurisdiction.status)}
              <div>
                <p className="font-medium">Jurisdictional Eligibility</p>
                <p className="text-sm text-muted-foreground">
                  Geographic investment restrictions
                  {requirements.jurisdiction.userCountry &&
                    ` - Current: ${requirements.jurisdiction.userCountry}`
                  }
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(requirements.jurisdiction.status)}>
              {requirements.jurisdiction.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Investment Limits */}
          <div className="p-3 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {getStatusIcon(requirements.investmentLimits.status)}
                <div>
                  <p className="font-medium">Investment Limits</p>
                  <p className="text-sm text-muted-foreground">
                    {requirements.investmentLimits.period} limit monitoring
                  </p>
                </div>
              </div>
              <Badge className={getStatusColor(requirements.investmentLimits.status)}>
                {requirements.investmentLimits.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current: ${requirements.investmentLimits.currentInvestment ? requirements.investmentLimits.currentInvestment.toLocaleString() : 'N/A'}</span>
                <span>Limit: ${requirements.investmentLimits.maxInvestment ? requirements.investmentLimits.maxInvestment.toLocaleString() : 'N/A'}</span>
              </div>
              <Progress
                value={(requirements.investmentLimits.currentInvestment / requirements.investmentLimits.maxInvestment) * 100}
                className="h-2"
              />
            </div>
          </div>

          {/* Token Holding Limits */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              {getStatusIcon(requirements.tokenHolding.status)}
              <div>
                <p className="font-medium">Token Holding Limits</p>
                <p className="text-sm text-muted-foreground">
                  Maximum position size restrictions
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(requirements.tokenHolding.status)}>
              {requirements.tokenHolding.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Required Documents */}
        {complianceData.documents.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Building className="w-4 h-4" />
              Required Documents
            </h4>
            <div className="space-y-2">
              {complianceData.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(doc.status)}
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      {doc.submittedAt && (
                        <p className="text-sm text-muted-foreground">
                          Submitted: {new Date(doc.submittedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(doc.status)}>
                    {doc.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        {complianceData.nextSteps.length > 0 && !overallEligible && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Next Steps
            </h4>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {complianceData.nextSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Compliance verification powered by ERC-3643 Level 3 permission registry.
            All investment eligibility is subject to change based on regulatory requirements.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
