import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BaseTable } from "@/components/tables/base-table";
import { ColumnDef } from "@tanstack/react-table";
import { UserCheck, AlertCircle, RefreshCw, Calendar, Wallet, Building2, DollarSign, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { createSecureApiClientFromEnv } from "@/lib/secure-api";
import { formatAddress, formatDate } from "@/lib/utils";

// Types for API data
interface Candidate {
  wallet_address: string;
  property_id: string;
  property_name: string;
  interest_score: number;
  investment_amount: string;
  risk_level: string;
  annual_yield: string;
  property_type: string;
  expected_returns: string;
  time_horizon: string;
  risk_factors: string[];
  opportunities: string[];
  user_type: string;
  kyc_status: string;
  qualification_status: string;
  full_name?: string;
  email?: string;
  created_at: string;
}

interface CandidatesResponse {
  success: boolean;
  data: Candidate[];
  count: number;
  error?: string;
}

const Candidates = () => {
  const { user } = useAuth();
  const { address: userAddress } = useAccount();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Fetch candidates from API
  const fetchCandidates = async () => {
    if (!userAddress) return;

    try {
      setLoading(true);
      setError(null);
      const apiClient = createSecureApiClientFromEnv();

      const result = await apiClient.makeRequest(`/api/candidates/user/${userAddress}`) as CandidatesResponse;

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch candidates');
      }

      setCandidates(result.data || []);
    } catch (err) {
      setError("Failed to load candidates. Please try again.");
      console.error("Candidates fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userAddress) {
      fetchCandidates();
    }
  }, [userAddress]);

  const handleRefresh = async () => {
    await fetchCandidates();
  };

  const handleRowClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
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

  const getQualificationBadgeVariant = (status: string) => {
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
  const columns: ColumnDef<Candidate, any>[] = [
    {
      accessorKey: "wallet_address",
      header: "Candidate",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
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
      header: "Interested Property",
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
      accessorKey: "interest_score",
      header: "Interest Score",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium text-sm">
            {Math.round(row.original.interest_score * 100)}%
          </span>
        </div>
      ),
    },
    {
      accessorKey: "investment_amount",
      header: "Investment Amount",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-sm">
            ${parseFloat(row.original.investment_amount).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "expected_returns",
      header: "Expected Returns",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-sm">
            ${parseFloat(row.original.expected_returns).toLocaleString()}
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
      accessorKey: "qualification_status",
      header: "Qualification",
      cell: ({ row }) => (
        <Badge variant={getQualificationBadgeVariant(row.original.qualification_status)}>
          {row.original.qualification_status}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Interest Date",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(row.original.created_at)}
        </div>
      ),
    },
  ];

  // Loading skeleton
  if (loading && candidates.length === 0) {
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
          <h1 className="text-3xl font-bold mb-2">Investment Candidates</h1>
          <p className="text-muted-foreground">
            Eligible candidates interested in your property tokens
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

      {/* Candidates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Investment Candidates ({candidates.length})
          </CardTitle>
          <CardDescription>
            Potential investors who have expressed interest in your properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BaseTable
            data={candidates}
            columns={columns}
            enableSorting
            enablePagination
            enableColumnVisibility={false}
            onRowClick={handleRowClick}
            emptyMessage="No candidates found. No potential investors have expressed interest in your properties yet."
            initialPageSize={10}
          />
        </CardContent>
      </Card>

      {/* Candidate Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Candidate Details
            </SheetTitle>
            <SheetDescription>
              Detailed information about this investment candidate
            </SheetDescription>
          </SheetHeader>

          {selectedCandidate && (
            <div className="space-y-6">
              {/* Candidate Overview */}
              <Card>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
                      <p className="text-xs bg-muted px-2 py-1 rounded font-mono mt-1">
                        {selectedCandidate.wallet_address}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">User Type</label>
                      <Badge variant="outline" className="mt-1">
                        {selectedCandidate.user_type}
                      </Badge>
                    </div>
                    {selectedCandidate.full_name && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                        <p className="font-medium mt-1">{selectedCandidate.full_name}</p>
                      </div>
                    )}
                    {selectedCandidate.email && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="font-medium mt-1">{selectedCandidate.email}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">KYC Status</label>
                      <Badge variant={getKycBadgeVariant(selectedCandidate.kyc_status)} className="text-white mt-1">
                        {selectedCandidate.kyc_status}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Qualification</label>
                      <Badge variant={getQualificationBadgeVariant(selectedCandidate.qualification_status)} className="text-white mt-1">
                        {selectedCandidate.qualification_status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Investment Interest */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Investment Interest</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Property</label>
                      <p className="font-medium mt-1">{selectedCandidate.property_name}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {selectedCandidate.property_type}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Interest Score</label>
                      <div className="flex items-center gap-2 mt-1">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {Math.round(selectedCandidate.interest_score * 100)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Investment Amount</label>
                      <p className="font-mono mt-1">${parseFloat(selectedCandidate.investment_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Expected Returns</label>
                      <p className="font-mono mt-1">${parseFloat(selectedCandidate.expected_returns).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Annual Yield</label>
                      <p className="font-mono mt-1">{selectedCandidate.annual_yield}%</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Risk Level</label>
                      <Badge variant={getRiskBadgeVariant(selectedCandidate.risk_level)} className="text-white mt-1">
                        {selectedCandidate.risk_level}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Time Horizon</label>
                    <p className="mt-1">{selectedCandidate.time_horizon}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Interest Date</label>
                    <p className="mt-1">{formatDate(selectedCandidate.created_at)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Analysis */}
              {(selectedCandidate.risk_factors.length > 0 || selectedCandidate.opportunities.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Risk & Opportunity Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedCandidate.risk_factors.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Risk Factors</label>
                        <ul className="mt-2 space-y-1">
                          {selectedCandidate.risk_factors.map((factor, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-red-500 mt-0.5">•</span>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedCandidate.opportunities.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Opportunities</label>
                        <ul className="mt-2 space-y-1">
                          {selectedCandidate.opportunities.map((opportunity, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">•</span>
                              {opportunity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Candidates;
