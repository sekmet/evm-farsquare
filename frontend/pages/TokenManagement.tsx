import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BaseTable } from "@/components/tables/base-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Settings,
  AlertCircle,
  RefreshCw,
  Plus,
  Minus,
  Pause,
  Play,
  Ban,
  CheckCircle,
  ArrowRightLeft,
  RotateCcw,
  ShieldCheck,
  Coins,
  UserCheck,
  Wallet,
  Building2,
  DollarSign,
  Users
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { createSecureApiClientFromEnv } from "@/lib/secure-api";
import { formatAddress } from "@/lib/utils";
import { toast } from "sonner";

// Types for API data
interface TokenHolder {
  wallet_address: string;
  token_address: string;
  token_name: string;
  token_symbol: string;
  balance: number;
  blocked: boolean;
  frozen_amount: number;
  last_activity: string;
  user_type: string;
  full_name?: string;
  email?: string;
  kyc_status: string;
}

interface TokenContract {
  contract_address: string;
  name: string;
  symbol: string;
  total_supply: number;
  circulating_supply: number;
  paused: boolean;
  owner_address: string;
  property_name: string;
  property_type: string;
}

interface TokenHoldersResponse {
  success: boolean;
  data: TokenHolder[];
  count: number;
  error?: string;
}

interface TokenContractsResponse {
  success: boolean;
  data: TokenContract[];
  count: number;
  error?: string;
}

type OperationType = 'mint' | 'burn' | 'pause' | 'unpause' | 'block' | 'unblock' | 'force-transfer' | 'recover' | 'approve-transfer';

interface BulkOperation {
  type: OperationType;
  tokenAddress: string;
  targets: string[]; // wallet addresses
  amount?: number;
  reason?: string;
  fromAddress?: string;
  toAddress?: string;
  transferId?: string;
}

const TokenManagement = () => {
  const { user } = useAuth();
  const { address: userAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<OperationType>('mint');
  const [tokenHolders, setTokenHolders] = useState<TokenHolder[]>([]);
  const [tokenContracts, setTokenContracts] = useState<TokenContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHolders, setSelectedHolders] = useState<string[]>([]);
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [operationParams, setOperationParams] = useState<any>({});
  const [processing, setProcessing] = useState(false);

  // Fetch data
  const fetchTokenHolders = async () => {
    if (!userAddress) return;

    try {
      setLoading(true);
      const apiClient = createSecureApiClientFromEnv();
      const result = await apiClient.makeRequest(`/api/token-management/holders/${userAddress}`) as TokenHoldersResponse;

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch token holders');
      }

      setTokenHolders(result.data || []);
    } catch (err) {
      setError("Failed to load token holders. Please try again.");
      console.error("Token holders fetch error:", err);
    }
  };

  const fetchTokenContracts = async () => {
    if (!userAddress) return;

    try {
      const apiClient = createSecureApiClientFromEnv();
      const result = await apiClient.makeRequest(`/api/token-management/contracts/${userAddress}`) as TokenContractsResponse;

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch token contracts');
      }

      setTokenContracts(result.data || []);
    } catch (err) {
      console.error("Token contracts fetch error:", err);
    }
  };

  useEffect(() => {
    if (userAddress) {
      fetchTokenHolders();
      fetchTokenContracts();
    }
  }, [userAddress]);

  useEffect(() => {
    setLoading(false);
  }, [tokenHolders, tokenContracts]);

  const handleRefresh = async () => {
    await Promise.all([fetchTokenHolders(), fetchTokenContracts()]);
  };

  const handleBulkOperation = async (operation: BulkOperation) => {
    setProcessing(true);
    try {
      const apiClient = createSecureApiClientFromEnv();
      const result = await apiClient.makeRequest('/api/token-management/execute', {
        method: 'POST',
        body: JSON.stringify(operation)
      });

      if (result.success) {
        toast.success(`${operation.type} operation executed successfully`);
        await handleRefresh();
        setSelectedHolders([]);
        setOperationParams({});
      } else {
        throw new Error(typeof result.error === 'string' ? result.error : result.error?.message || 'Failed to execute operation');
      }
    } catch (err) {
      toast.error(`Failed to execute ${operation.type} operation`);
      console.error("Bulk operation error:", err);
    } finally {
      setProcessing(false);
    }
  };

  const getOperationIcon = (type: OperationType) => {
    switch (type) {
      case 'mint': return Plus;
      case 'burn': return Minus;
      case 'pause': return Pause;
      case 'unpause': return Play;
      case 'block': return Ban;
      case 'unblock': return CheckCircle;
      case 'force-transfer': return ArrowRightLeft;
      case 'recover': return RotateCcw;
      case 'approve-transfer': return ShieldCheck;
      default: return Settings;
    }
  };

  const getOperationTitle = (type: OperationType) => {
    switch (type) {
      case 'mint': return 'Mint Tokens';
      case 'burn': return 'Burn Tokens';
      case 'pause': return 'Pause Token Contract';
      case 'unpause': return 'Unpause Token Contract';
      case 'block': return 'Block Investors';
      case 'unblock': return 'Unblock Investors';
      case 'force-transfer': return 'Force Transfer Tokens';
      case 'recover': return 'Recover Tokens';
      case 'approve-transfer': return 'Approve Transfers';
      default: return 'Token Operation';
    }
  };

  const getOperationDescription = (type: OperationType) => {
    switch (type) {
      case 'mint': return 'Create new tokens and distribute to investors';
      case 'burn': return 'Permanently remove tokens from circulation';
      case 'pause': return 'Pause all token operations contract-wide';
      case 'unpause': return 'Resume token operations';
      case 'block': return 'Block specific investors or token portions';
      case 'unblock': return 'Remove blocking restrictions';
      case 'force-transfer': return 'Transfer tokens between investors on their behalf';
      case 'recover': return 'Recover tokens for investors who lost access';
      case 'approve-transfer': return 'Approve conditional transfers manually';
      default: return 'Execute token management operation';
    }
  };

  // Table columns for token holders
  const holderColumns: ColumnDef<TokenHolder, any>[] = [
    {
      accessorKey: "wallet_address",
      header: "Investor",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium">{formatAddress(row.original.wallet_address)}</span>
            {row.original.full_name && (
              <span className="text-xs text-muted-foreground">{row.original.full_name}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "token_name",
      header: "Token",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium">{row.original.token_name}</span>
            <Badge variant="outline" className="text-xs w-fit">
              {row.original.token_symbol}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.balance.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "blocked",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <Badge variant={row.original.blocked ? "destructive" : "default"}>
            {row.original.blocked ? "Blocked" : "Active"}
          </Badge>
          {row.original.frozen_amount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {row.original.frozen_amount} Frozen
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "kyc_status",
      header: "KYC",
      cell: ({ row }) => (
        <Badge variant={row.original.kyc_status === 'approved' ? 'default' : 'secondary'} className="text-xs">
          {row.original.kyc_status}
        </Badge>
      ),
    },
  ];

  const renderOperationForm = (type: OperationType) => {
    switch (type) {
      case 'mint':
      case 'burn':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="token-select">Select Token Contract</Label>
                <Select value={selectedContract} onValueChange={setSelectedContract}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose token contract" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokenContracts.map((contract) => (
                      <SelectItem key={contract.contract_address} value={contract.contract_address}>
                        {contract.name} ({contract.symbol}) - {contract.property_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount per Investor</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={operationParams.amount || ''}
                  onChange={(e) => setOperationParams({ ...operationParams, amount: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Provide reason for this operation"
                value={operationParams.reason || ''}
                onChange={(e) => setOperationParams({ ...operationParams, reason: e.target.value })}
              />
            </div>
          </div>
        );

      case 'pause':
      case 'unpause':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="token-select">Select Token Contract</Label>
              <Select value={selectedContract} onValueChange={setSelectedContract}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose token contract" />
                </SelectTrigger>
                <SelectContent>
                  {tokenContracts.map((contract) => (
                    <SelectItem key={contract.contract_address} value={contract.contract_address}>
                      {contract.name} ({contract.symbol}) - {contract.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {type === 'pause'
                  ? "This will pause ALL operations on the token contract. No transfers, mints, or burns will be possible until unpaused."
                  : "This will resume all token operations that were previously paused."
                }
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'block':
      case 'unblock':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Provide detailed reason for blocking/unblocking"
                value={operationParams.reason || ''}
                onChange={(e) => setOperationParams({ ...operationParams, reason: e.target.value })}
                required
              />
            </div>
            {type === 'block' && (
              <div>
                <Label htmlFor="freeze-amount">Freeze Amount (Optional)</Label>
                <Input
                  id="freeze-amount"
                  type="number"
                  placeholder="Amount to freeze (leave empty to block entirely)"
                  value={operationParams.freezeAmount || ''}
                  onChange={(e) => setOperationParams({ ...operationParams, freezeAmount: e.target.value })}
                />
              </div>
            )}
          </div>
        );

      case 'force-transfer':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="from-address">From Address</Label>
                <Input
                  id="from-address"
                  placeholder="0x..."
                  value={operationParams.fromAddress || ''}
                  onChange={(e) => setOperationParams({ ...operationParams, fromAddress: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="to-address">To Address</Label>
                <Input
                  id="to-address"
                  placeholder="0x..."
                  value={operationParams.toAddress || ''}
                  onChange={(e) => setOperationParams({ ...operationParams, toAddress: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="transfer-amount">Amount to Transfer</Label>
              <Input
                id="transfer-amount"
                type="number"
                placeholder="Enter amount"
                value={operationParams.transferAmount || ''}
                onChange={(e) => setOperationParams({ ...operationParams, transferAmount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="transfer-reason">Reason</Label>
              <Textarea
                id="transfer-reason"
                placeholder="Provide reason for force transfer"
                value={operationParams.reason || ''}
                onChange={(e) => setOperationParams({ ...operationParams, reason: e.target.value })}
                required
              />
            </div>
          </div>
        );

      case 'recover':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="recovery-reason">Recovery Reason</Label>
              <Textarea
                id="recovery-reason"
                placeholder="Describe the recovery request and justification"
                value={operationParams.reason || ''}
                onChange={(e) => setOperationParams({ ...operationParams, reason: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="new-address">New Address (Optional)</Label>
              <Input
                id="new-address"
                placeholder="0x... (leave empty to recover to current address)"
                value={operationParams.newAddress || ''}
                onChange={(e) => setOperationParams({ ...operationParams, newAddress: e.target.value })}
              />
            </div>
          </div>
        );

      case 'approve-transfer':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="transfer-id">Transfer ID</Label>
              <Input
                id="transfer-id"
                placeholder="Enter transfer ID to approve"
                value={operationParams.transferId || ''}
                onChange={(e) => setOperationParams({ ...operationParams, transferId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="approval-reason">Approval Notes</Label>
              <Textarea
                id="approval-reason"
                placeholder="Additional notes for approval"
                value={operationParams.reason || ''}
                onChange={(e) => setOperationParams({ ...operationParams, reason: e.target.value })}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Loading skeleton
  if (loading && tokenHolders.length === 0) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-24" />
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

  return (
    <div className="container mx-auto py-8 px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Token Management</h1>
          <p className="text-muted-foreground">
            Execute bulk token operations for your deployed property tokens
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Main Content */}
        <div className="lg:col-span-4 space-y-6">

          {/* Token Holders Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Token Holders ({tokenHolders.length})
              </CardTitle>
              <CardDescription>
                Select investors to execute bulk operations on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BaseTable
                data={tokenHolders}
                columns={holderColumns}
                enableSorting
                enablePagination
                enableSelection
                enableColumnVisibility={false}
                /*onRowSelectionChange={(rows) => {
                  const selected = Object.keys(rows).filter(key => rows[key]);
                  setSelectedHolders(selected);
                }}*/
                emptyMessage="No token holders found for your properties."
                initialPageSize={10}
              />
            </CardContent>
          </Card>

          {/* Current Operation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = getOperationIcon(activeTab);
                  return <Icon className="h-5 w-5" />;
                })()}
                {getOperationTitle(activeTab)}
              </CardTitle>
              <CardDescription>
                {getOperationDescription(activeTab)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderOperationForm(activeTab)}

              {/* Selected Investors */}
              {selectedHolders.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Investors ({selectedHolders.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedHolders.map((address) => (
                      <Badge key={address} variant="secondary">
                        {formatAddress(address)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Execute Button */}
              <Button
                onClick={() => {
                  const operation: BulkOperation = {
                    type: activeTab,
                    tokenAddress: selectedContract,
                    targets: selectedHolders,
                    ...operationParams
                  };
                  handleBulkOperation(operation);
                }}
                disabled={processing || selectedHolders.length === 0 || (['mint', 'burn', 'pause', 'unpause'].includes(activeTab) && !selectedContract)}
                className="w-full"
                size="lg"
              >
                {processing ? 'Processing...' : `Execute ${getOperationTitle(activeTab)}`}
              </Button>
            </CardContent>
          </Card>

        </div>
        
        {/* Operations Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Operations
              </CardTitle>
              <CardDescription>
                Select an operation to execute
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(['mint', 'burn', 'pause', 'unpause', 'block', 'unblock', 'force-transfer', 'recover', 'approve-transfer'] as OperationType[]).map((type) => {
                const Icon = getOperationIcon(type);
                return (
                  <Button
                    key={type}
                    variant={activeTab === type ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab(type)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {getOperationTitle(type)}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default TokenManagement;
