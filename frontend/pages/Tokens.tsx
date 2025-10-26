import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BaseTable } from "@/components/tables/base-table";
import { ColumnDef } from "@tanstack/react-table";
import { Coins, AlertCircle, RefreshCw, Calendar, Network, Hash } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { createSecureApiClientFromEnv } from "@/lib/secure-api";
import { formatAddress, formatDate } from "@/lib/utils";

// Types for API data
interface TokenDeployment {
  property_id: string;
  token_address: string;
  identity_registry: string;
  compliance: string;
  status: string;
  tx_hash: string;
  deployed_at: string;
  deployer_address: string;
  network: string;
  error: string;
  created_at: string;
  token_id: string;
  contract_address: string;
  token_name: string;
  token_symbol: string;
  decimals: number;
  total_supply: string;
  circulating_supply: string;
  identity_registry_contract: string;
  compliance_contract: string;
  paused: boolean;
  owner_address: string;
  token_deployed_at: string;
  deployed_tx_hash: string;
  token_created_at: string;
  token_updated_at: string;
  salt: string;
  identity_factory_contract: string;
  authority_contract: string;
  suite_identity_registry: string;
  identity_storage_contract: string;
  claim_topics_registry_contract: string;
  trusted_issuers_registry_contract: string;
  suite_compliance: string;
  time_restriction_module_contract: string;
  country_restriction_module_contract: string;
  max_balance_module_contract: string;
  max_holders_module_contract: string;
  suite_deployed_at: string;
  deployed_by: string;
  suite_deployed_tx_hash: string;
  suite_token_name: string;
  suite_token_symbol: string;
  initial_supply: string;
}

interface TokensResponse {
  success: boolean;
  data: TokenDeployment[];
  count: number;
  error?: string;
}

const Tokens = () => {
  const { user } = useAuth();
  const { address: userAddress } = useAccount();
  const [tokens, setTokens] = useState<TokenDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenDeployment | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Fetch tokens from API
  const fetchTokens = async () => {
    if (!userAddress) return;

    try {
      setLoading(true);
      setError(null);
      const apiClient = createSecureApiClientFromEnv();

      const result = await apiClient.makeRequest(`/api/tokens/user/${userAddress}`) as TokensResponse;

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tokens');
      }

      setTokens(result.data || []);
    } catch (err) {
      setError("Failed to load tokens. Please try again.");
      console.error("Tokens fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userAddress) {
      fetchTokens();
    }
  }, [userAddress]);

  const handleRefresh = async () => {
    await fetchTokens();
  };

  const handleRowClick = (token: TokenDeployment) => {
    setSelectedToken(token);
    setSheetOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'success';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Define table columns
  const columns: ColumnDef<TokenDeployment, any>[] = [
    {
      accessorKey: "token_name",
      header: "Token Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.token_name}</span>
        </div>
      ),
    },
    {
      accessorKey: "token_symbol",
      header: "Symbol",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.token_symbol}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getStatusBadgeVariant(row.original.status)} className="text-white">
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "deployed_at",
      header: "Deployed",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(row.original.deployed_at)}
        </div>
      ),
    },
    {
      accessorKey: "network",
      header: "Network",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Network className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{row.original.network}</span>
        </div>
      ),
    },
    {
      accessorKey: "total_supply",
      header: "Total Supply",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {parseFloat(row.original.total_supply).toLocaleString()}
        </span>
      ),
    },
  ];

  // Loading skeleton
  if (loading && tokens.length === 0) {
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
          <h1 className="text-3xl font-bold mb-2">Property Tokens</h1>
          <p className="text-muted-foreground">
            ERC-3643 compliant tokens you've deployed for your properties
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

      {/* Tokens Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Property Tokens ({tokens.length})
          </CardTitle>
          <CardDescription>
            All ERC-3643 property tokens associated with your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BaseTable
            data={tokens}
            columns={columns}
            enableSorting
            enablePagination
            enableColumnVisibility={false}
            onRowClick={handleRowClick}
            emptyMessage="No tokens found. Deploy your first property token to get started."
            initialPageSize={10}
          />
        </CardContent>
      </Card>

      {/* Token Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              {selectedToken?.token_name} ({selectedToken?.token_symbol})
            </SheetTitle>
            <SheetDescription>
              Detailed information about this ERC-3643 compliant property token
            </SheetDescription>
          </SheetHeader>

          {selectedToken && (
            <div className="space-y-6">
              {/* Token Overview */}
              <Card>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p className="font-medium">{selectedToken.token_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Symbol</label>
                      <p className="font-medium">{selectedToken.token_symbol}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Decimals</label>
                      <p className="font-mono">{selectedToken.decimals}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Supply</label>
                      <p className="font-mono">{parseFloat(selectedToken.total_supply).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground pr-2">Status</label>
                      <Badge variant={getStatusBadgeVariant(selectedToken.status)} className="text-white">
                        {selectedToken.status}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Network</label>
                      <p>{selectedToken.network}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contract Addresses */}
              <Card>
                <CardContent className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Token Contract</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {selectedToken.contract_address}
                      </code>
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={`https://etherscan.io/address/${selectedToken.contract_address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Hash className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  {selectedToken.identity_registry && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Identity Registry</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {selectedToken.identity_registry}
                        </code>
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`https://etherscan.io/address/${selectedToken.identity_registry}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Hash className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedToken.compliance && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Compliance Contract</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {selectedToken.compliance}
                        </code>
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`https://etherscan.io/address/${selectedToken.compliance}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Hash className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Deployment Info */}
              <Card>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Deployer</label>
                      <p className="text-xs bg-muted px-2 py-1 rounded font-mono">{selectedToken.deployer_address}</p>
                    </div>
                  </div>

                  {selectedToken.tx_hash && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Transaction Hash</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {formatAddress(selectedToken.tx_hash)}
                        </code>
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`https://etherscan.io/tx/${selectedToken.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Hash className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedToken.error && selectedToken.error !== 'false' && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Error</label>
                      <p className="text-red-600 text-sm mt-1">{selectedToken.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Tokens;
