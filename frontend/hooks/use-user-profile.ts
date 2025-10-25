import { useQuery } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface Qualification {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  comments: string | null;
  evidence: string | null;
  assessed_at: Date | null;
  assessed_by: string | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  evm_address: string | null;
  email: string | null;
  user_type: 'individual' | 'entity';
  jurisdiction: string;
  onboarding_status: 'not_started' | 'in_progress' | 'completed' | 'rejected';
  onboarding_current_step: string | null;
  onboarding_progress: number;
  onboarding_started_at: Date | null;
  onboarding_completed_at: Date | null;
  kyc_status: 'pending' | 'approved' | 'rejected' | 'expired';
  kyc_verified_at: Date | null;
  kyc_expires_at: Date | null;
  identity_verified: boolean;
  identity_country_code: number | null;
  onchain_identity_address: string | null;
  qualification_status: 'pending' | 'approved' | 'rejected';
  qualified_at: Date | null;
  accredited_investor: boolean;
  full_name: string | null;
  date_of_birth: Date | null;
  phone_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  entity_name: string | null;
  entity_type: string | null;
  entity_registration_number: string | null;
  entity_country: string | null;
  privacy_consent: boolean;
  terms_consent: boolean;
  data_processing_consent: boolean;
  esign_completed: boolean;
  esign_completed_at: Date | null;
  account_status: 'active' | 'suspended' | 'closed';
  suspension_reason: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface UserProfileResponse {
  profile: UserProfile;
  claims: Record<string, any>;
  qualifications: Qualification[];
}

const fetchUserProfile = async (userId: string): Promise<UserProfileResponse | null> => {
  const response = await fetch(`${API_BASE_URL}/api/users/profile/id/${userId}`, {
    method: 'GET',
    credentials: 'include', // Include cookies for authentication
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }

  const result = await response.json();
  if (result?.success) {
    return result.data as UserProfileResponse;
  }
  return null;
};

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId, // Only run query if userId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
