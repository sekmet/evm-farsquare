import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BaseTable } from "@/components/tables/base-table";
import { ColumnDef } from "@tanstack/react-table";
import { Users, AlertCircle, RefreshCw, Calendar, Wallet, Building2, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { createSecureApiClientFromEnv } from "@/lib/secure-api";
import { formatAddress, formatDate } from "@/lib/utils";

// Types for API data
interface Investor {
  wallet_address: string;
  property_id: string;
  property_name: string;
  token_quantity: number;
  average_purchase_price: string;
  total_investment: string;
  property_type: string;
  annual_yield: string;
  risk_level: string;
  created_at: string;
  user_type: string;
  kyc_status: string;
  full_name?: string;
  email?: string;
}

interface InvestorsResponse {
  success: boolean;
  data: Investor[];
  count: number;
  error?: string;
}

const Investors = () => {
  const { user } = useAuth();
  const { address: userAddress } = useAccount();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Fetch investors from API
  const fetchInvestors = async () => {
    if (!userAddress) return;

    try {
      setLoading(true);
      setError(null);
      const apiClient = createSecureApiClientFromEnv();

      const result = await apiClient.makeRequest(`/api/investors/user/${userAddress}`) as InvestorsResponse;

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch investors');
      }

      setInvestors(result.data || []);
    } catch (err) {
      setError("Failed to load investors. Please try again.");
      console.error("Investors fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userAddress) {
      fetchInvestors();
    }
  }, [userAddress]);

  const handleRefresh = async () => {
    await fetchInvestors();
  };

  const handleRowClick = (investor: Investor) => {
    setSelectedInvestor(investor);
    setSheetOpen(true);
  };

  const getKycBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'low':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'high':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Define table columns
  const columns: ColumnDef<Investor, any>[] = [
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
      accessorKey: "property_name",
      header: "Property",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium">{row.original.property_name}</span>
            <Badge variant="outline" className="text-xs w-fit">
              {row.original.property_type}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "token_quantity",
      header: "Tokens Held",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.token_quantity.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "total_investment",
      header: "Total Investment",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-sm">
            ${parseFloat(row.original.total_investment).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "kyc_status",
      header: "KYC Status",
      cell: ({ row }) => (
        <Badge variant={getKycBadgeVariant(row.original.kyc_status)}>
          {row.original.kyc_status}
        </Badge>
      ),
    },
    {
      accessorKey: "risk_level",
      header: "Risk Level",
      cell: ({ row }) => (
        <Badge variant={getRiskBadgeVariant(row.original.risk_level)}>
          {row.original.risk_level}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Invested",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(row.original.created_at)}
        </div>
      ),
    },
  ];

  // Loading skeleton
  if (loading && investors.length === 0) {
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
          <h1 className="text-3xl font-bold mb-2">Property Investors</h1>
          <p className="text-muted-foreground">
            Investors who hold tokens in your properties
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

      {/* Investors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Property Investors ({investors.length})
          </CardTitle>
          <CardDescription>
            All investors holding tokens in your properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BaseTable
            data={investors}
            columns={columns}
            enableSorting
            enablePagination
            enableColumnVisibility={false}
            onRowClick={handleRowClick}
            emptyMessage="No investors found. No tokens have been purchased in your properties yet."
            initialPageSize={10}
          />
        </CardContent>
      </Card>

      {/* Investor Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Investor Details
            </SheetTitle>
            <SheetDescription>
              Detailed information about this property token investor
            </SheetDescription>
          </SheetHeader>

          {selectedInvestor && (
            <div className="space-y-6">
              {/* Investor Overview */}
              <Card>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
                      <p className="text-xs bg-muted px-2 py-1 rounded font-mono mt-1">
                        {selectedInvestor.wallet_address}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">User Type</label>
                      <Badge variant="outline" className="mt-1">
                        {selectedInvestor.user_type}
                      </Badge>
                    </div>
                    {selectedInvestor.full_name && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                        <p className="font-medium mt-1">{selectedInvestor.full_name}</p>
                      </div>
                    )}
                    {selectedInvestor.email && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="font-medium mt-1">{selectedInvestor.email}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">KYC Status</label>
                      <Badge variant={getKycBadgeVariant(selectedInvestor.kyc_status)} className="text-white mt-1">
                        {selectedInvestor.kyc_status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Investment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Investment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Property</label>
                      <p className="font-medium mt-1">{selectedInvestor.property_name}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {selectedInvestor.property_type}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Risk Level</label>
                      <Badge variant={getRiskBadgeVariant(selectedInvestor.risk_level)} className="text-white mt-1">
                        {selectedInvestor.risk_level}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tokens Held</label>
                      <p className="font-mono mt-1">{selectedInvestor.token_quantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Average Purchase Price</label>
                      <p className="font-mono mt-1">${parseFloat(selectedInvestor.average_purchase_price).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Investment</label>
                      <p className="font-mono mt-1">${parseFloat(selectedInvestor.total_investment).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Annual Yield</label>
                      <p className="font-mono mt-1">{selectedInvestor.annual_yield}%</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Investment Date</label>
                    <p className="mt-1">{formatDate(selectedInvestor.created_at)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Investors;
