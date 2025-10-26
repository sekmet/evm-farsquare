import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BaseTable } from "@/components/tables/base-table";
import { ColumnDef } from "@tanstack/react-table";
import { FileText, AlertCircle, RefreshCw, Calendar, Wallet, Building2, DollarSign, CheckCircle, XCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { createSecureApiClientFromEnv } from "@/lib/secure-api";
import { formatAddress, formatDate } from "@/lib/utils";
import { toast } from "sonner";

// Types for API data
interface InvestmentRequest {
  id: string;
  wallet_address: string;
  property_id: string;
  property_name: string;
  token_quantity: number;
  requested_amount: string;
  status: string;
  request_type: string;
  risk_assessment: string;
  kyc_status: string;
  qualification_status: string;
  compliance_check: string;
  requested_at: string;
  expires_at: string;
  user_type: string;
  full_name?: string;
  email?: string;
  property_type: string;
  annual_yield: string;
  minimum_investment: string;
  available_tokens: number;
}

interface RequestsResponse {
  success: boolean;
  data: InvestmentRequest[];
  count: number;
  error?: string;
}

const Requests = () => {
  const { user } = useAuth();
  const { address: userAddress } = useAccount();
  const [requests, setRequests] = useState<InvestmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<InvestmentRequest | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch requests from API
  const fetchRequests = async () => {
    if (!userAddress) return;

    try {
      setLoading(true);
      setError(null);
      const apiClient = createSecureApiClientFromEnv();

      const result = await apiClient.makeRequest(`/api/requests/user/${userAddress}`) as RequestsResponse;

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch requests');
      }

      setRequests(result.data || []);
    } catch (err) {
      setError("Failed to load requests. Please try again.");
      console.error("Requests fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userAddress) {
      fetchRequests();
    }
  }, [userAddress]);

  const handleRefresh = async () => {
    await fetchRequests();
  };

  const handleRowClick = (request: InvestmentRequest) => {
    setSelectedRequest(request);
    setSheetOpen(true);
  };

  const handleApproveRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const apiClient = createSecureApiClientFromEnv();
      const result = await apiClient.makeRequest(`/api/requests/${requestId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approvedBy: userAddress })
      });

      if (result.success) {
        toast.success("Request approved successfully");
        await fetchRequests(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to approve request');
      }
    } catch (err) {
      toast.error("Failed to approve request");
      console.error("Approval error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string, reason?: string) => {
    setProcessingId(requestId);
    try {
      const apiClient = createSecureApiClientFromEnv();
      const result = await apiClient.makeRequest(`/api/requests/${requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectedBy: userAddress, reason })
      });

      if (result.success) {
        toast.success("Request rejected");
        await fetchRequests(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to reject request');
      }
    } catch (err) {
      toast.error("Failed to reject request");
      console.error("Rejection error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const getRequestStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      case 'expired':
        return 'outline';
      default:
        return 'outline';
    }
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

  const getComplianceBadgeVariant = (status: string) => {
    switch (status) {
      case 'passed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Define table columns
  const columns: ColumnDef<InvestmentRequest, any>[] = [
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
      header: "Tokens Requested",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.token_quantity.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "requested_amount",
      header: "Amount",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-sm">
            ${parseFloat(row.original.requested_amount).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getRequestStatusBadgeVariant(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "kyc_status",
      header: "KYC",
      cell: ({ row }) => (
        <Badge variant={getKycBadgeVariant(row.original.kyc_status)} className="text-xs">
          {row.original.kyc_status}
        </Badge>
      ),
    },
    {
      accessorKey: "compliance_check",
      header: "Compliance",
      cell: ({ row }) => (
        <Badge variant={getComplianceBadgeVariant(row.original.compliance_check)} className="text-xs">
          {row.original.compliance_check}
        </Badge>
      ),
    },
    {
      accessorKey: "requested_at",
      header: "Requested",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(row.original.requested_at)}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const request = row.original;
        const isProcessing = processingId === request.id;

        if (request.status !== 'pending') {
          return (
            <Badge variant="outline" className="text-xs">
              {request.status}
            </Badge>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                handleApproveRequest(request.id);
              }}
              disabled={isProcessing}
              className="h-8 px-2"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {isProcessing ? '...' : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleRejectRequest(request.id);
              }}
              disabled={isProcessing}
              className="h-8 px-2"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  // Loading skeleton
  if (loading && requests.length === 0) {
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
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
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
          <h1 className="text-3xl font-bold mb-2">Investment Requests</h1>
          <p className="text-muted-foreground">
            Pending investment requests requiring your approval
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

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Investment Requests ({requests.length})
          </CardTitle>
          <CardDescription>
            Review and approve investment requests for your properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BaseTable
            data={requests}
            columns={columns}
            enableSorting
            enablePagination
            enableColumnVisibility={false}
            onRowClick={handleRowClick}
            emptyMessage="No pending requests. All investment requests have been processed."
            initialPageSize={10}
          />
        </CardContent>
      </Card>

      {/* Request Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Investment Request Details
            </SheetTitle>
            <SheetDescription>
              Review this investment request for approval
            </SheetDescription>
          </SheetHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Overview */}
              <Card>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Investor Wallet</label>
                      <p className="text-xs bg-muted px-2 py-1 rounded font-mono mt-1">
                        {selectedRequest.wallet_address}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">User Type</label>
                      <Badge variant="outline" className="mt-1">
                        {selectedRequest.user_type}
                      </Badge>
                    </div>
                    {selectedRequest.full_name && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                        <p className="font-medium mt-1">{selectedRequest.full_name}</p>
                      </div>
                    )}
                    {selectedRequest.email && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="font-medium mt-1">{selectedRequest.email}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Request Status</label>
                      <Badge variant={getRequestStatusBadgeVariant(selectedRequest.status)} className="text-white mt-1">
                        {selectedRequest.status}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Request Type</label>
                      <Badge variant="outline" className="mt-1">
                        {selectedRequest.request_type}
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
                      <p className="font-medium mt-1">{selectedRequest.property_name}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {selectedRequest.property_type}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Annual Yield</label>
                      <p className="font-mono mt-1">{selectedRequest.annual_yield}%</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tokens Requested</label>
                      <p className="font-mono mt-1">{selectedRequest.token_quantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Investment Amount</label>
                      <p className="font-mono mt-1">${parseFloat(selectedRequest.requested_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Minimum Investment</label>
                      <p className="font-mono mt-1">${parseFloat(selectedRequest.minimum_investment).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Available Tokens</label>
                      <p className="font-mono mt-1">{selectedRequest.available_tokens.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Requested At</label>
                      <p className="mt-1">{formatDate(selectedRequest.requested_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Expires At</label>
                      <p className="mt-1">{formatDate(selectedRequest.expires_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance & Risk Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Compliance & Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">KYC Status</label>
                      <Badge variant={getKycBadgeVariant(selectedRequest.kyc_status)} className="text-white mt-1 w-full justify-center">
                        {selectedRequest.kyc_status}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Qualification</label>
                      <Badge variant={getKycBadgeVariant(selectedRequest.qualification_status)} className="text-white mt-1 w-full justify-center">
                        {selectedRequest.qualification_status}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Compliance</label>
                      <Badge variant={getComplianceBadgeVariant(selectedRequest.compliance_check)} className="text-white mt-1 w-full justify-center">
                        {selectedRequest.compliance_check}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Risk Assessment</label>
                    <p className="mt-1 text-sm">{selectedRequest.risk_assessment}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Approval Actions */}
              {selectedRequest.status === 'pending' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Approval Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => handleApproveRequest(selectedRequest.id)}
                        disabled={processingId === selectedRequest.id}
                        className="flex-1"
                        size="lg"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processingId === selectedRequest.id ? 'Processing...' : 'Approve Request'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleRejectRequest(selectedRequest.id)}
                        disabled={processingId === selectedRequest.id}
                        className="flex-1"
                        size="lg"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Request
                      </Button>
                    </div>
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

export default Requests;
