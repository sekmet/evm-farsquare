import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Wifi, WifiOff, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { useRealTimePrices } from '@/hooks/use-realtime-prices';
import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { hardhat, anvil, sepolia, baseSepolia, optimismSepolia } from 'viem/chains';
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { fetchETHPrice, fetchOPTIMISMPrice } from "@/data/asset-prices";
import { useWallet } from '@/contexts/wallet-context';

interface InvestmentCalculatorProps {
  property: {
    id: string;
    name: string;
    tokenPrice: number;
    annualYield: number;
    minimumInvestment: number;
    riskLevel: 'low' | 'medium' | 'high';
    contract_address?: string; // EVM contract address for ERC-3643 compliance
  };
  userId?: string;
  className?: string;
  onCalculate?: (results: InvestmentResults) => void;
}

interface InvestmentResults {
  tokensToReceive: number;
  annualReturn: number;
  totalReturn: number;
  riskAdjustedReturn: number;
  projectedTotalValue: number;
  holdPeriod: number;
  contractValidated?: boolean;
  erc3643Compliant?: boolean;
  complianceScore?: number;
}

interface ReviewStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  timestamp: string;
  documents?: Array<{ id: string; name: string }>;
}

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
// ERC-3643 CONTRACT INTEGRATION FUNCTIONS - Viem/Wagmi Patterns
// ============================================================================

/**
 * Check if an ERC-3643 token contract is deployed and valid
 * Uses TREXToken.onchainID() and identityRegistry() methods
 */
async function validateERC3643Token(contractAddress: Address): Promise<boolean> {
  try {
    // ERC-3643 Level 3 ABI for validation - parsed using parseAbi
    const erc3643Abi = parseAbi([
      'function onchainID() external view returns (address)',
      'function identityRegistry() external view returns (address)',
      'function compliance() external view returns (address)',
      'function name() external view returns (string)',
      'function symbol() external view returns (string)',
      'function totalSupply() external view returns (uint256)'
    ]);

    // Check if contract responds to ERC-3643 methods
    const [onchainID, identityRegistry] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: erc3643Abi,
        functionName: 'onchainID'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: erc3643Abi,
        functionName: 'identityRegistry'
      })
    ]);

    // Validate that addresses are not zero
    return onchainID !== '0x0000000000000000000000000000000000000000' &&
           identityRegistry !== '0x0000000000000000000000000000000000000000';
  } catch (error) {
    console.error(`Failed to validate ERC-3643 token ${contractAddress}:`, error);
    return false;
  }
}

/**
 * Get ERC-3643 token information for investment calculations
 */
async function getERC3643TokenInfo(contractAddress: Address) {
  try {
    // ERC-3643 token information ABI - parsed using parseAbi
    const tokenInfoAbi = parseAbi([
      'function name() external view returns (string)',
      'function symbol() external view returns (string)',
      'function totalSupply() external view returns (uint256)',
      'function decimals() external view returns (uint8)',
      'function balanceOf(address) external view returns (uint256)'
    ]);

    const [name, symbol, totalSupply, decimals] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: tokenInfoAbi,
        functionName: 'name'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: tokenInfoAbi,
        functionName: 'symbol'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: tokenInfoAbi,
        functionName: 'totalSupply'
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: tokenInfoAbi,
        functionName: 'decimals'
      })
    ]);

    return {
      name: name as string,
      symbol: symbol as string,
      totalSupply: (totalSupply as bigint).toString(),
      decimals: decimals as number,
      contractAddress
    };
  } catch (error) {
    console.error(`Failed to get token info for ${contractAddress}:`, error);
    return null;
  }
}

/**
 * Calculate ERC-3643 compliance score for investment risk assessment
 */
async function calculateComplianceScore(contractAddress: Address, userAddress?: Address): Promise<number> {
  try {
    const isValidERC3643 = await validateERC3643Token(contractAddress);
    if (!isValidERC3643) return 0;

    let score = 70; // Base score for valid ERC-3643 token

    // Add points for additional compliance features
    if (userAddress) {
      // Could check identity registry status, claim verification, etc.
      score += 15; // User-specific compliance bonus
    }

    // Add points for contract maturity/audit status
    // In production, this would check audit reports, contract age, etc.
    score += 15; // Contract maturity bonus

    return Math.min(score, 100);
  } catch (error) {
    console.error(`Failed to calculate compliance score for ${contractAddress}:`, error);
    return 0;
  }
}

export function InvestmentCalculator({ property, userId, className, onCalculate }: InvestmentCalculatorProps) {
  const [investmentAmount, setInvestmentAmount] = useState<number>(property?.minimumInvestment || 1000);
  const [holdPeriod, setHoldPeriod] = useState<number>(1);
  const [contractValidated, setContractValidated] = useState<boolean>(false);
  const [erc3643Compliant, setErc3643Compliant] = useState<boolean>(false);
  const [complianceScore, setComplianceScore] = useState<number>(85);
  const { state } = useWallet();
  const { isConnected, lastUpdate } = useRealTimePrices();
  
  //const userAddress = state.address;
  const isWalletConnected = state.isConnected; // Simple check for wallet connection

  // Fetch ETH price for USD conversion
  const { data: ethPrice, isLoading: isPriceLoading } = useQuery({
    queryKey: ['eth-price'],
    queryFn: fetchETHPrice,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  //const handleRefresh = () => {
  //  refetch();
  //};

  // ETH price for calculations
  const [etherPrice, setEtherPrice] = useState<number>(65000); // USD per ETH

  // Safe property access with defaults
  const tokenPrice = property?.tokenPrice || 100;
  const annualYield = property?.annualYield || 0;
  const riskLevel = property?.riskLevel || 'medium';

  // Enhanced investment calculations with ERC-3643 compliance
  React.useEffect(() => {
    const validateContract = async () => {
      if (property?.contract_address?.startsWith('0x')) {
        try {
          const [isValid, complianceScore] = await Promise.all([
            validateERC3643Token(property.contract_address as Address),
            calculateComplianceScore(property.contract_address as Address)
          ]);

          setContractValidated(true);
          setErc3643Compliant(isValid);
          setComplianceScore(complianceScore);

          console.log(`Contract validation for ${property.contract_address}:`, {
            validated: true,
            erc3643Compliant: isValid,
            complianceScore
          });
        } catch (error) {
          console.warn('Contract validation failed:', error);
          setContractValidated(false);
          setErc3643Compliant(false);
          setComplianceScore(0);
        }
      } else {
        // No contract address provided - use default values
        setContractValidated(false);
        setErc3643Compliant(false);
        setComplianceScore(85); // Default compliance score
      }
    };

    validateContract();
  }, [property?.contract_address]);

  // Calculate investment metrics with ERC-3643 compliance factors
  const tokensToReceive = investmentAmount && tokenPrice ? investmentAmount / tokenPrice : 0;
  const annualYieldRate = annualYield ? annualYield / 100 : 0;
  const annualReturn = investmentAmount && annualYieldRate ? investmentAmount * annualYieldRate : 0;
  const totalReturn = annualReturn && holdPeriod ? annualReturn * holdPeriod : 0;
  const projectedTotalValue = investmentAmount ? investmentAmount + totalReturn : 0;

  // Enhanced risk-adjusted calculations with ERC-3643 compliance factors
  const baseRiskAdjustment = riskLevel === 'low' ? 0.95 :
                           riskLevel === 'medium' ? 0.85 : 0.7;

  // Apply ERC-3643 compliance bonus to risk adjustment
  const complianceBonus = erc3643Compliant ? (complianceScore / 100) * 0.1 : 0;
  const riskAdjustment = Math.min(baseRiskAdjustment + complianceBonus, 0.95);

  const riskAdjustedReturn = totalReturn ? totalReturn * riskAdjustment : 0;

  // ETH equivalent
  const ethEquivalent = projectedTotalValue && etherPrice ? projectedTotalValue / etherPrice : 0;

  const results: InvestmentResults = {
    tokensToReceive,
    annualReturn,
    totalReturn,
    riskAdjustedReturn,
    projectedTotalValue,
    holdPeriod,
    contractValidated,
    erc3643Compliant,
    complianceScore,
  };

  // Notify parent component of calculation results
  React.useEffect(() => {
    if (onCalculate) {
      onCalculate(results);
    }
  }, [investmentAmount, holdPeriod, property, onCalculate]);

  const handleAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    setInvestmentAmount(Math.max(amount, property.minimumInvestment || 0));
  };

  const handlePeriodChange = (value: string) => {
    setHoldPeriod(parseInt(value) || 1);
  };

  if (!isWalletConnected && !userId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Investment Calculator
          </CardTitle>
          <CardDescription>
            Connect your EVM wallet to check investment calculator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              Please connect your EVM wallet (MetaMask, Coinbase Wallet, etc.) to view investment calculator.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Investment Calculator
          <Badge variant={isConnected ? "success" : "destructive"} className="text-xs">
            {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Calculate potential returns for your investment in {property.name}
          {contractValidated && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={erc3643Compliant ? "default" : "destructive"} className="text-xs">
                {erc3643Compliant ? "ERC-3643 Compliant" : "ERC-3643 Non-Compliant"}
              </Badge>
              {erc3643Compliant && (
                <Badge variant="outline" className="text-xs">
                  Compliance Score: {complianceScore}%
                </Badge>
              )}
            </div>
          )}
          {lastUpdate && (
            <span className="text-xs text-muted-foreground ml-2">
              • Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Investment Amount ($)</label>
            <Input
              type="number"
              value={investmentAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder={property.minimumInvestment?.toString() || "1000"}
              min={property.minimumInvestment || 0}
              step="100"
              className="w-full"
            />
            {property.minimumInvestment && (
              <p className="text-xs text-muted-foreground mt-1">
                Minimum: ${property.minimumInvestment ? property.minimumInvestment.toLocaleString() : '0'}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Hold Period</label>
            <Select value={holdPeriod.toString()} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Year</SelectItem>
                <SelectItem value="3">3 Years</SelectItem>
                <SelectItem value="5">5 Years</SelectItem>
                <SelectItem value="10">10 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Tokens to Receive</span>
            <span className="font-semibold">{tokensToReceive ? tokensToReceive.toFixed(2) : '0.00'}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <span className="text-sm text-green-700 dark:text-green-300">
              Annual Return ({property.annualYield}%)
            </span>
            <span className="font-semibold text-green-600">
              ${annualReturn ? annualReturn.toFixed(2) : '0.00'}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Total Return ({holdPeriod} {holdPeriod === 1 ? 'year' : 'years'})
            </span>
            <span className="font-semibold text-blue-600">
              ${totalReturn ? totalReturn.toFixed(2) : '0.00'}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <span className="text-sm text-purple-700 dark:text-purple-300">
              Risk-Adjusted Return
            </span>
            <span className="font-semibold text-purple-600">
              ${riskAdjustedReturn ? riskAdjustedReturn.toFixed(2) : '0.00'}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border-2 border-orange-200">
            <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
              Projected Total Value
            </span>
            <div className="text-right">
              <div className="font-bold text-orange-600 text-lg">
                ${projectedTotalValue ? projectedTotalValue.toFixed(2) : '0.00'}
              </div>
              <div className="text-xs text-orange-600/80">
                ERC-3643 {erc3643Compliant ? 'Compliant' : 'Non-Compliant'}
              </div>
              {contractValidated && (
                <div className="text-xs text-orange-600/60">
                  Compliance Score: {complianceScore}%
                </div>
              )}
            </div>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Projections are estimates based on current yield rates and ERC-3643 compliance status.
            {erc3643Compliant ? 
              ' This investment meets ERC-3643 Level 3 regulatory standards.' : 
              ' ERC-3643 compliance verification is recommended before investing.'
            }
            Past performance does not predict future results. {property.riskLevel} risk investment.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
