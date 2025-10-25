import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
import { type Address, type Hex, formatEther } from "viem";
import { useAccount } from "wagmi";

// Wallet balance interface
interface TokenBalance {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  formattedBalance: string;
  network: EVMNetwork;
  isNative?: boolean;
}

// Transaction interface
interface TransactionInfo {
  hash: Hex;
  blockNumber: bigint;
  blockHash: Hex;
  transactionIndex: number;
  from: Address;
  to: Address | null;
  value: bigint;
  gasPrice: bigint;
  gasLimit: bigint;
  gasUsed?: bigint;
  status?: 'success' | 'failed' | 'pending';
  timestamp?: Date;
  network: EVMNetwork;
  logs?: any[];
  input?: Hex;
  nonce: number;
}

// Wallet summary interface
interface WalletSummary {
  address: Address;
  totalBalanceUSD: number;
  networks: EVMNetwork[];
  lastActivity: Date | null;
  totalTransactions: number;
}

// Complete wallet information
interface WalletInfo {
  address: Address;
  summary: WalletSummary;
  balances: TokenBalance[];
  recentTransactions: TransactionInfo[];
  supportedNetworks: EVMNetwork[];
}

// Network type for wallet operations
type EVMNetwork = 'optimism-testnet' | 'testnet' | 'sepolia';

// API response interfaces
interface WalletBalancesResponse {
  success: boolean;
  data: TokenBalance[];
  error?: string;
}

interface WalletTransactionsResponse {
  success: boolean;
  data: TransactionInfo[];
  error?: string;
}

interface WalletInfoResponse {
  success: boolean;
  data: WalletInfo;
  error?: string;
}

interface WalletActivityResponse {
  success: boolean;
  data: { hasActivity: boolean };
  error?: string;
}

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

      // Load complete wallet information in parallel
      const [balancesResult, transactionsResult] = await Promise.all([
        apiClient.makeRequest<WalletBalancesResponse>(`/api/wallet/balances/${userAddress}`),
        apiClient.makeRequest<WalletTransactionsResponse>(`/api/wallet/transactions/${userAddress}`)
      ]);

      if (balancesResult.success && balancesResult.data) {
        setBalances(balancesResult.data);
      }

      if (transactionsResult.success && transactionsResult.data) {
        setTransactions(transactionsResult.data);
      }

      // Calculate wallet summary
      const summary: WalletSummary = {
        address: userAddress,
        totalBalanceUSD: 0, // Would need price oracle integration
        networks: ['optimism-testnet', 'testnet', 'sepolia'],
        lastActivity: transactionsResult.data && transactionsResult.data.length > 0 ?
          transactionsResult.data[0].timestamp || null : null,
        totalTransactions: transactionsResult.data ? transactionsResult.data.length : 0,
      };

      const walletData: WalletInfo = {
        address: userAddress,
        summary,
        balances: (balancesResult.success && balancesResult.data) ? balancesResult.data as unknown as TokenBalance[] : [],
        recentTransactions: (transactionsResult.success && transactionsResult.data) ? transactionsResult.data as unknown as TransactionInfo[] : [],
        supportedNetworks: ['optimism-testnet', 'testnet', 'sepolia'],
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
        setHasWalletActivity(activityResult.data.hasActivity);
      }
    } catch (err) {
      console.error('Failed to check wallet activity:', err);
      setHasWalletActivity(false);
    }
  };

  const getStatusIcon = (status: string) => {
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

  const getStatusBadge = (status: string) => {
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

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString();
  };

  const getNetworkName = (network: EVMNetwork) => {
    const names = {
      'optimism-testnet': 'Optimism Sepolia',
      'testnet': 'Base Sepolia',
      'sepolia': 'Sepolia'
    };
    return names[network] || network;
  };

  const getNetworkColor = (network: EVMNetwork) => {
    const colors = {
      'optimism-testnet': 'bg-red-100 text-red-800',
      'testnet': 'bg-blue-100 text-blue-800',
      'sepolia': 'bg-gray-100 text-gray-800'
    };
    return colors[network] || 'bg-gray-100 text-gray-800';
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
      <div className="container mx-auto py-8 px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
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
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">
            <WalletIcon className="h-8 w-8" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">Wallet Portfolio</h1>
          <p className="text-gray-600 font-mono text-sm">{formatAddress(walletInfo.address)}</p>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant="outline">ERC-3643 Compliant</Badge>
            <Badge variant="secondary">{walletInfo.supportedNetworks.length} Networks</Badge>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
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
                <div className="text-2xl font-bold">
                  {balances.reduce((total, balance) =>
                    total + parseFloat(balance.formattedBalance), 0
                  ).toFixed(4)} ETH
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {walletInfo.summary.networks.length} networks
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
                {walletInfo.recentTransactions.slice(0, 3).map((tx, index) => (
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
                        {parseFloat(formatEther(tx.value)).toFixed(4)} ETH
                      </p>
                    </div>
                  </div>
                ))}
                {walletInfo.recentTransactions.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No recent transactions</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {balances.map((balance, index) => (
              <Card key={`${balance.network}-${balance.address}-${index}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{balance.name}</CardTitle>
                  <Badge className={getNetworkColor(balance.network)}>
                    {getNetworkName(balance.network)}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{balance.formattedBalance}</div>
                  <p className="text-xs text-muted-foreground">
                    {balance.symbol} • {balance.isNative ? 'Native' : 'ERC-20'}
                  </p>
                  <div className="mt-3">
                    <Progress
                      value={parseFloat(balance.formattedBalance) > 0 ? 100 : 0}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            {balances.length === 0 && (
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
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All your wallet transactions across supported networks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((tx) => (
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
                          {tx.timestamp ? formatDate(tx.timestamp) : 'Unknown time'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getNetworkColor(tx.network)}>
                          {getNetworkName(tx.network)}
                        </Badge>
                        {getStatusBadge(tx.status || 'pending')}
                      </div>
                      <p className="text-sm font-medium">
                        {parseFloat(formatEther(tx.value)).toFixed(4)} ETH
                      </p>
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
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
