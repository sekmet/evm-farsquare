import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Network,
  Coins,
  Activity,
  WalletIcon,
  ExternalLink,
  Copy
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { createSecureApiClientFromEnv } from "@/lib/secure-api";
import { formatAddress, formatDate, getNetworkName, getNetworkColor, formatCurrency, getExplorerUrl } from "@/lib/utils";
import { 
  type EVMNetwork, 
  type WalletInfo, 
  type TokenBalance, 
  type TransactionInfo ,
  type WalletActivityResponse,
  type WalletBalancesResponse,
  type WalletTransactionsResponse,
  type WalletInfoResponse,
  type WalletSummary,
} from "@/types/wallet"
import { formatEther } from "viem";
import { useAccount } from "wagmi";


export const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'approved':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
      case 'rejected':
      case 'suspended':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
};

export const getStatusBadge = (status: string) => {
    const variants = {
      success: 'default',
      approved: 'default',
      active: 'default',
      pending: 'secondary',
      in_progress: 'secondary',
      failed: 'destructive',
      rejected: 'destructive',
      suspended: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.replace('_', ' ')}
      </Badge>
    );
};

// Helper functions for USD calculations
const getTokenPrice = (symbol: string, prices: any) => {
  if (!prices) return 0;
  
  switch (symbol.toLowerCase()) {
    case 'eth':
      return prices.ethPrice || 0;
    case 'usdc':
      return prices.usdcPrice || 0;
    case 'eurc':
      return prices.eurcPrice || 0;
    case 'pyusd':
      return prices.pyusdPrice || 0;
    case 'paxg':
      return prices.paxgoldPrice || 0;
    default:
      return 0;
  }
};

const calculateTokenBalanceUSD = (balance: TokenBalance, prices: any): number => {
  const price = getTokenPrice(balance.symbol, prices);
  const balanceValue = parseFloat(balance.formattedBalance);
  return balanceValue * price;
};

const calculateTotalBalanceUSD = (balances: TokenBalance[], prices: any): number => {
  return balances.reduce((total, balance) => {
    return total + calculateTokenBalanceUSD(balance, prices);
  }, 0);
};

// Helper functions for transaction USD calculations
const calculateTransactionUSDValue = (tx: TransactionInfo, prices: any): number => {
  const tokenInfo = getTransactionTokenInfo(tx);
  
  // For ERC-20 tokens, use the formatted amount directly
  if (tokenInfo.isERC20) {
    const tokenPrice = getTokenPrice(tokenInfo.symbol, prices);
    return parseFloat(tokenInfo.amount) * tokenPrice;
  }
  
  // For native ETH transfers, use the transaction value
  if (tx.value > 0n) {
    const ethValue = parseFloat(formatEther(tx.value));
    return ethValue * (prices?.ethPrice || 0);
  }
  
  return 0;
};

const getTransactionTokenInfo = (tx: TransactionInfo): { symbol: string; amount: string; isERC20: boolean } => {
  // Check if this is an ERC-20 transfer by looking at logs
  if (tx.logs && tx.logs.length > 0) {
    for (const log of tx.logs) {
      // ERC-20 Transfer event signature: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
      if (log.topics && log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
        // This is a Transfer event
        const from = '0x' + log.topics[1].slice(26); // Remove padding
        const to = '0x' + log.topics[2].slice(26); // Remove padding
        const amountHex = log.data;
        
        // Parse amount (first 32 bytes of data)
        const amount = BigInt('0x' + amountHex.slice(2, 66));
        
        // Try to identify the token symbol from the contract address
        const tokenSymbol = getTokenSymbolFromAddress(log.address);
        const decimals = getTokenDecimals(log.address);
        
        // Format amount according to token decimals
        const formattedAmount = Number(amount) / Math.pow(10, decimals);
        
        return {
          symbol: tokenSymbol,
          amount: formattedAmount.toString(),
          isERC20: true
        };
      }
    }
  }
  
  // Fallback to ETH transaction
  if (tx.value > 0n) {
    return {
      symbol: 'ETH',
      amount: formatEther(tx.value),
      isERC20: false
    };
  }
  
  return {
    symbol: 'ETH',
    amount: '0',
    isERC20: false
  };
};

// Helper function to identify token symbols from contract addresses
const getTokenSymbolFromAddress = (contractAddress: string): string => {
  // Known token addresses from env
  const knownTokens: Record<string, string> = {
    '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238': 'USDC', // Sepolia USDC
    '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4': 'EURC', // Sepolia EURC
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e': 'USDC', // Base Sepolia USDC
    '0x808456652fdb597867f38412077A9182bf77359F': 'EURC', // Base Sepolia EURC
    '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9': 'PYUSD', // Sepolia PYUSD
  };
  
  return knownTokens[contractAddress.toLowerCase()] || 'UNKNOWN';
};

// Helper function to get token decimals
const getTokenDecimals = (contractAddress: string): number => {
  // Known token decimals
  const tokenDecimals: Record<string, number> = {
    '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238': 6, // Sepolia USDC
    '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4': 6, // Sepolia EURC
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e': 6, // Base Sepolia USDC
    '0x808456652fdb597867f38412077A9182bf77359F': 6, // Base Sepolia EURC
    '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9': 6, // Sepolia PYUSD
  };
  
  return tokenDecimals[contractAddress.toLowerCase()] || 18; // Default to 18 decimals
};

export default function UserWallet() {
  const { user } = useAuth();
  const { address: userAddress } = useAccount();
  const { t } = useI18n();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasWalletActivity, setHasWalletActivity] = useState<boolean | null>(null);
  const [assetPrices, setAssetPrices] = useState<{
    ethPrice: number;
    pyusdPrice: number;
    paxgoldPrice: number;
    usdcPrice: number;
    eurcPrice: number;
  } | null>(null);

  useEffect(() => {
    if (user?.id && userAddress) {
      loadWalletData();
    } else if (user?.id && !userAddress) {
      checkWalletActivity();
    }
  }, [user?.id, userAddress]);

  const loadWalletData = async () => {
    if (!userAddress) return;

    try {
      setLoading(true);
      const apiClient = createSecureApiClientFromEnv();

      // Load wallet data and asset prices in parallel
      const [balancesResult, transactionsResult, pricesResult] = await Promise.all([
        apiClient.makeRequest<WalletBalancesResponse>(`/api/wallet/balances/${userAddress}`),
        apiClient.makeRequest<WalletTransactionsResponse>(`/api/wallet/transactions/${userAddress}`),
        apiClient.makeRequest<{ ethPrice: number; pyusdPrice: number; paxgoldPrice: number; usdcPrice: number; eurcPrice: number }>(`/api/prices`)
      ]);

      let balances: TokenBalance[] = [];
      let transactions: TransactionInfo[] = [];

      if (balancesResult.success && balancesResult.data) {
        balances = balancesResult.data as unknown as TokenBalance[];
      }

      if (transactionsResult.success && transactionsResult.data) {
        transactions = transactionsResult.data as unknown as TransactionInfo[];
      }

      if (pricesResult.success && pricesResult.data) {
        setAssetPrices(pricesResult.data);
      }

      setBalances(balances);
      setTransactions(transactions);

      // Calculate wallet summary with proper USD values
      const summary: WalletSummary = {
        address: userAddress,
        totalBalanceUSD: calculateTotalBalanceUSD(balances, pricesResult.success ? pricesResult.data : null),
        networks: ['optimism-sepolia', 'base-sepolia', 'sepolia'],
        lastActivity: (transactions.length > 0) ? (typeof transactions[0].timestamp === 'number' ? new Date(transactions[0].timestamp * 1000) : transactions[0].timestamp) || null : null,
        totalTransactions: transactions.length,
      };

      const walletData: WalletInfo = {
        address: userAddress,
        summary,
        balances,
        recentTransactions: transactions,
        supportedNetworks: ['optimism-sepolia', 'base-sepolia', 'sepolia'],
      };

      setWalletInfo(walletData);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const checkWalletActivity = async () => {
    if (!userAddress) return;

    try {
      const apiClient = createSecureApiClientFromEnv();
      const activityResult = await apiClient.makeRequest<WalletActivityResponse>(`/api/wallet/activity/${userAddress}`);

      if (activityResult.success && activityResult.data && typeof activityResult.data === 'object' && 'hasActivity' in activityResult.data) {
        setHasWalletActivity(activityResult.data.hasActivity as any);
      }
    } catch (err) {
      console.error('Failed to check wallet activity:', err);
      setHasWalletActivity(false);
    }
  };



  // If user doesn't have a wallet connected, show connection prompt
  if (!userAddress) {
    return (
      <div className="container mx-auto py-8 px-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <WalletIcon className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              To view your wallet balances and transaction history, you need to connect your EVM-compatible wallet.
              This will allow you to interact with ERC-3643 compliant tokens and view your portfolio.
            </p>
            <div className="space-y-4 w-full max-w-sm">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Supported Networks:</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-white">Optimism Sepolia</Badge>
                  <Badge variant="outline" className="bg-white">Base Sepolia</Badge>
                  <Badge variant="outline" className="bg-white">Sepolia</Badge>
                </div>
              </div>
              <Button className="w-full" size="lg">
                <WalletIcon className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
              <p className="text-xs text-gray-500 text-center">
                By connecting your wallet, you agree to our terms of service and privacy policy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-6 px-6">
        {/* Header Section Skeleton */}
        <div className="flex items-center space-x-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />

          {/* Overview Tab Content Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Four summary cards skeleton */}
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Transactions Preview Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-4 w-4" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-5 w-16 mb-1" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !walletInfo) {
    return (
      <div className="container mx-auto py-8 px-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Wallet Load Error</h3>
              <p className="text-gray-600">{error || 'Unable to load wallet data'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 px-6">
      {/* Header Section */}
      <div className="flex items-center space-x-4">
        <Avatar className="h-24 w-24">
          <AvatarFallback className="text-lg bg-accent">
            <WalletIcon className="h-12 w-12" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">Wallet Portfolio</h1>
          <p className="text-gray-600 font-mono text-sm">{walletInfo.address}</p>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant="outline">ERC-3643 Compliant</Badge>
            <Badge variant="secondary">{walletInfo.supportedNetworks.length} Networks</Badge>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-accent">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="networks">Networks</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Balance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency(walletInfo.summary.totalBalanceUSD)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {walletInfo.summary.networks.length} networks and {balances.length} tokens
                </p>
              </CardContent>
            </Card>

            {/* Active Networks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Networks</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{walletInfo.summary.networks.length}</div>
                <p className="text-xs text-muted-foreground">
                  ERC-3643 compliant
                </p>
              </CardContent>
            </Card>

            {/* Total Transactions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{walletInfo.summary.totalTransactions}</div>
                <p className="text-xs text-muted-foreground">
                  Recent activity
                </p>
              </CardContent>
            </Card>

            {/* Last Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {walletInfo.summary.lastActivity ? formatDate(walletInfo.summary.lastActivity) : 'No activity'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Transaction timestamp
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest wallet activity across all networks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {walletInfo.recentTransactions.slice(0, 3).map((tx, index) => {
                  const tokenInfo = getTransactionTokenInfo(tx);
                  
                  return (
                    <div key={tx.hash} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {tx.from.toLowerCase() === walletInfo.address.toLowerCase() ? (
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {tx.from.toLowerCase() === walletInfo.address.toLowerCase() ? 'Sent' : 'Received'}
                          </p>
                          <p className="text-sm text-gray-600 font-mono">
                            {formatAddress(tx.hash)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getNetworkColor(tx.network)}>
                          {getNetworkName(tx.network)}
                        </Badge>
                        <p className="text-sm font-medium mt-1">
                          {formatCurrency(Number(tokenInfo.amount))} {tokenInfo.symbol}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {walletInfo.recentTransactions.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No recent transactions</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-6">
          {/* ETH Balance - Prominent */}
          {balances.filter(b => b.symbol === 'ETH' && b.isNative).map((balance, index) => (
            <Card key={`eth-${balance.network}-${index}`} className="border-2 border-blue-200 bg-blue-50/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Network className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{balance.name}</CardTitle>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                      {getNetworkName(balance.network)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-900">
                    {balance.formattedBalance.substring(0, 6)} {balance.symbol}
                  </div>
                  <div className="text-sm text-blue-700">
                    ≈ {formatCurrency(calculateTokenBalanceUSD(balance, assetPrices))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Native Token</span>
                  <Progress
                    value={parseFloat(balance.formattedBalance) > 0 ? 100 : 0}
                    className="w-24 h-2"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* ERC-20 Tokens - Smaller cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {balances.filter(b => !b.isNative).map((balance, index) => (
              <Card key={`${balance.network}-${balance.address}-${index}`} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{balance.symbol}</CardTitle>
                  <Badge variant="outline" className={getNetworkColor(balance.network)}>
                    {getNetworkName(balance.network)}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{formatCurrency(Number(balance.formattedBalance))} {balance.symbol}</div>
                  <div className="text-sm text-muted-foreground">
                    ≈ {formatCurrency(calculateTokenBalanceUSD(balance, assetPrices))}
                  </div>
                  <div className="mt-2">
                    <Progress
                      value={parseFloat(balance.formattedBalance) > 0 ? 100 : 0}
                      className="h-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {balance.name}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {balances.filter(b => !b.isNative).length === 0 && balances.filter(b => b.symbol === 'ETH').length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Balances Found</h3>
                  <p className="text-gray-600">
                    Your wallet doesn't have any tokens on the supported networks yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All your wallet transactions across supported networks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((tx) => {
                  const tokenInfo = getTransactionTokenInfo(tx);
                  const usdValue = calculateTransactionUSDValue(tx, assetPrices);
                  
                  return (
                    <div key={tx.hash} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {tx.from.toLowerCase() === walletInfo.address.toLowerCase() ? (
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {tx.from.toLowerCase() === walletInfo.address.toLowerCase() ? 'Sent' : 'Received'}
                          </p>
                          <p className="text-sm text-gray-600">
                            To: {formatAddress(tx.to || tx.from)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {tx.timestamp ? formatDate(tx.timestamp) : 'Date unavailable'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getNetworkColor(tx.network)}>
                            {getNetworkName(tx.network)}
                          </Badge>
                          {getStatusBadge(tx.status || 'pending')}

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6"
                          onClick={() => window.open(getExplorerUrl(tx.network, tx.hash), '_blank')}
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        </div>
                        <div className="text-sm font-medium">
                          {formatCurrency(Number(tokenInfo.amount))} {tokenInfo.symbol}
                        </div>
                        {usdValue > 0 && (
                          <div className="text-xs text-muted-foreground">
                            ≈ {formatCurrency(usdValue)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {transactions.length === 0 && (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Transactions</h3>
                    <p className="text-gray-600">
                      Your wallet hasn't made any transactions on the supported networks yet.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Networks Tab */}
        <TabsContent value="networks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {walletInfo.supportedNetworks.map((network) => {
              const networkBalances = balances.filter(b => b.network === network);
              const networkTransactions = transactions.filter(t => t.network === network);

              return (
                <Card key={network}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {getNetworkName(network)}
                      <Badge className={getNetworkColor(network)}>
                        {networkBalances.length > 0 ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>ERC-3643 compliant network</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Balances</p>
                        <p className="font-medium">{networkBalances.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Transactions</p>
                        <p className="font-medium">{networkTransactions.length}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Recent Activity</p>
                      {networkTransactions.length > 0 ? (
                        <p className="text-xs text-gray-600">
                          Last: {formatDate(networkTransactions[0].timestamp)}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-600">No activity</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
