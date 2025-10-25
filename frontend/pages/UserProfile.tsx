import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, Clock, XCircle, AlertCircle, User, Shield, FileText, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { createSecureApiClientFromEnv } from "@/lib/secure-api";
import { useAccount } from "wagmi";

// User profile interface matching database schema
interface UserProfile {
  user_id: string;
  evm_address: string;
  email: string;
  user_type: 'individual' | 'entity';
  onboarding_status: 'not_started' | 'in_progress' | 'completed' | 'rejected';
  onboarding_current_step?: string;
  onboarding_progress: number;
  onboarding_started_at?: Date;
  onboarding_completed_at?: Date;
  kyc_status: 'pending' | 'approved' | 'rejected' | 'expired';
  kyc_verified_at?: Date;
  kyc_expires_at?: Date;
  identity_verified: boolean;
  identity_country_code?: number;
  qualification_status: 'pending' | 'approved' | 'rejected';
  qualified_at?: Date;
  accredited_investor: boolean;
  // Personal information
  full_name?: string;
  date_of_birth?: Date;
  phone_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  // Entity information
  entity_name?: string;
  entity_type?: string;
  entity_registration_number?: string;
  entity_country?: string;
  // Consent and completion
  privacy_consent: boolean;
  terms_consent: boolean;
  data_processing_consent: boolean;
  esign_completed: boolean;
  esign_completed_at?: Date;
  account_status: 'active' | 'suspended' | 'closed';
  suspension_reason?: string;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Identity claims interface
interface IdentityClaim {
  value: string;
  verified?: boolean;
  timestamp?: string;
}

// Qualification criteria interface
interface QualificationCriterion {
  id: string;
  name: string;
  description: string;
  status: 'approved' | 'rejected' | 'pending' | 'not_started';
  comments?: string;
  evidence?: string[];
}

// Complete user profile response
interface UserProfileResponse {
  profile: UserProfile;
  claims: Record<string, IdentityClaim>;
  qualifications: QualificationCriterion[];
}

export default function UserProfile() {
  const { user } = useAuth();
  const { address } = useAccount();
  const { t } = useI18n();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [claims, setClaims] = useState<Record<string, IdentityClaim>>({});
  const [qualifications, setQualifications] = useState<QualificationCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && address) {
      loadUserProfile();
    }
  }, [user?.id, address]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const apiClient = createSecureApiClientFromEnv();

      // Load user profile data using the secure API client
      const profileResponse = await apiClient.makeRequest<UserProfileResponse>(`/api/users/profile/${address}`);
      if (profileResponse.success && profileResponse.data) {
        const userProfileData = profileResponse.data;
        setProfile(userProfileData.profile);
        setClaims(userProfileData.claims || {});
        setQualifications(userProfileData.qualifications || []);
      } else {
        throw new Error(profileResponse.error?.message || 'Failed to load profile data');
      }

    } catch (err) {
      console.error('Failed to load user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
      case 'suspended':
      case 'closed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'default',
      completed: 'default',
      active: 'default',
      pending: 'secondary',
      in_progress: 'secondary',
      rejected: 'destructive',
      suspended: 'destructive',
      closed: 'destructive',
      not_started: 'outline',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString();
  };

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

  if (error || !profile) {
    return (
      <div className="container mx-auto py-8 px-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Profile Load Error</h3>
              <p className="text-gray-600">{error || 'Unable to load profile'}</p>
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
          <AvatarFallback className="text-4xl font-bold bg-accent">
            {profile.full_name?.split(' ').map(n => n[0]).join('') || profile.email[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{profile.full_name || 'User Profile'}</h1>
          <p className="text-gray-600">{profile.email}</p>
          <div className="flex items-center space-x-2 mt-2">
            {getStatusIcon(profile.account_status)}
            {getStatusBadge(profile.account_status)}
            <Badge variant="outline">{profile.user_type}</Badge>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-accent">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Account Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Account Status</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(profile.account_status)}
                  <span className="text-2xl font-bold capitalize">{profile.account_status}</span>
                </div>
                {profile.suspension_reason && (
                  <p className="text-sm text-red-600 mt-2">{profile.suspension_reason}</p>
                )}
              </CardContent>
            </Card>

            {/* Onboarding Progress */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Onboarding Progress</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(profile.onboarding_status)}
                  <span className="text-2xl font-bold">{profile.onboarding_progress}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Current Step: {profile.onboarding_current_step || 'Not started'}
                </p>
              </CardContent>
            </Card>

            {/* KYC Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(profile.kyc_status)}
                  <span className="text-lg font-semibold capitalize">{profile.kyc_status}</span>
                </div>
                {profile.kyc_expires_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expires: {formatDate(profile.kyc_expires_at)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent account activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Profile Updated</p>
                  <p className="text-xs text-muted-foreground">{formatDate(profile.updated_at)}</p>
                </div>
              </div>
              {profile.last_login_at && (
                <div className="flex items-center space-x-4">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-xs text-muted-foreground">{formatDate(profile.last_login_at)}</p>
                  </div>
                </div>
              )}
              {profile.onboarding_completed_at && (
                <div className="flex items-center space-x-4">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Onboarding Completed</p>
                    <p className="text-xs text-muted-foreground">{formatDate(profile.onboarding_completed_at)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Identity Tab */}
        <TabsContent value="identity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Blockchain Identity</CardTitle>
              <CardDescription>Your ERC-3643 compliant identity information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">EVM Address</label>
                  <p className="font-mono text-sm bg-gray-50 p-2 rounded">{profile.evm_address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Identity Verified</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(profile.identity_verified ? 'approved' : 'pending')}
                    <span>{profile.identity_verified ? 'Verified' : 'Pending'}</span>
                  </div>
                </div>
                {profile.identity_country_code && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Country Code</label>
                    <p className="text-sm">{profile.identity_country_code}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Identity Claims */}
          <Card>
            <CardHeader>
              <CardTitle>Identity Claims</CardTitle>
              <CardDescription>Verified claims associated with your identity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(claims).map(([key, claim]) => (
                  <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(claim.verified ? 'approved' : 'pending')}
                      <div>
                        <p className="font-medium">{key}</p>
                        <p className="text-sm text-gray-600">{claim.value}</p>
                      </div>
                    </div>
                    <Badge variant={claim.verified ? 'default' : 'secondary'}>
                      {claim.verified ? 'Verified' : 'Pending'}
                    </Badge>
                  </div>
                ))}
                {Object.keys(claims).length === 0 && (
                  <p className="text-center text-gray-500 py-8">No identity claims found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Compliance</CardTitle>
              <CardDescription>Your compliance status and qualifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Qualification Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(profile.qualification_status)}
                    <span className="capitalize">{profile.qualification_status}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Accredited Investor</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {profile.accredited_investor ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <span>{profile.accredited_investor ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                {profile.qualified_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Qualified Date</label>
                    <p className="text-sm">{formatDate(profile.qualified_at)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Qualification Criteria */}
          <Card>
            <CardHeader>
              <CardTitle>Qualification Criteria</CardTitle>
              <CardDescription>Detailed qualification assessment results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualifications.map((criterion) => (
                  <div key={criterion.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{criterion.name}</h4>
                      {getStatusBadge(criterion.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{criterion.description}</p>
                    {criterion.comments && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm">{criterion.comments}</p>
                      </div>
                    )}
                    {criterion.evidence && criterion.evidence.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-sm font-medium mb-2">Evidence Submitted:</h5>
                        <div className="flex flex-wrap gap-2">
                          {criterion.evidence.map((evidence, index) => (
                            <Badge key={index} variant="outline">
                              {evidence}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {qualifications.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No qualification criteria found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Tab */}
        <TabsContent value="personal" className="space-y-6">
          {profile.user_type === 'individual' ? (
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <p className="text-sm">{profile.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                    <p className="text-sm">{profile.date_of_birth ? formatDate(profile.date_of_birth) : 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                    <p className="text-sm">{profile.phone_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm">{profile.email}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Address</h4>
                  <div className="space-y-2 text-sm">
                    <p>{profile.address_line1 || 'Not provided'}</p>
                    {profile.address_line2 && <p>{profile.address_line2}</p>}
                    <p>
                      {profile.city && `${profile.city}, `}
                      {profile.state_province && `${profile.state_province} `}
                      {profile.postal_code && profile.postal_code}
                    </p>
                    <p>{profile.country || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Entity Information</CardTitle>
                <CardDescription>Your entity details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Entity Name</label>
                    <p className="text-sm">{profile.entity_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Entity Type</label>
                    <p className="text-sm">{profile.entity_type || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Registration Number</label>
                    <p className="text-sm">{profile.entity_registration_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Entity Country</label>
                    <p className="text-sm">{profile.entity_country || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Consents */}
          <Card>
            <CardHeader>
              <CardTitle>Legal Consents</CardTitle>
              <CardDescription>Your consent status for data processing and terms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Privacy Policy Consent</span>
                  {profile.privacy_consent ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Terms of Service Consent</span>
                  {profile.terms_consent ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data Processing Consent</span>
                  {profile.data_processing_consent ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Electronic Signature</span>
                  <div className="flex items-center space-x-2">
                    {profile.esign_completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    {profile.esign_completed_at && (
                      <span className="text-xs text-gray-500">
                        {formatDate(profile.esign_completed_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Technical account information and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">User ID</label>
                  <p className="font-mono text-sm bg-gray-50 p-2 rounded">{profile.user_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Account Created</label>
                  <p className="text-sm">{formatDate(profile.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="text-sm">{formatDate(profile.updated_at)}</p>
                </div>
                {profile.last_login_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Login</label>
                    <p className="text-sm">{formatDate(profile.last_login_at)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Onboarding Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Timeline</CardTitle>
              <CardDescription>Your journey through the onboarding process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Settings className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Onboarding Started</p>
                    <p className="text-sm text-gray-600">
                      {profile.onboarding_started_at ? formatDate(profile.onboarding_started_at) : 'Not started'}
                    </p>
                  </div>
                </div>

                {profile.onboarding_completed_at && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Onboarding Completed</p>
                      <p className="text-sm text-gray-600">{formatDate(profile.onboarding_completed_at)}</p>
                    </div>
                  </div>
                )}

                {profile.kyc_verified_at && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Shield className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">KYC Verified</p>
                      <p className="text-sm text-gray-600">{formatDate(profile.kyc_verified_at)}</p>
                    </div>
                  </div>
                )}

                {profile.esign_completed_at && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <FileText className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Electronic Signature Completed</p>
                      <p className="text-sm text-gray-600">{formatDate(profile.esign_completed_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
