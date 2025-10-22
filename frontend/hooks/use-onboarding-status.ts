import { useQuery } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface OnboardingStatus {
  id?: string;
  address: string;
  email: string | null;
  userType: 'individual' | 'entity';
  jurisdiction: string;
  onboardingStatus: 'not_started' | 'in_progress' | 'completed' | 'rejected';
  onboardingCurrentStep: string | null;
  onboardingProgress: number;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'expired';
  identityVerified: boolean;
  qualificationStatus: 'pending' | 'approved' | 'rejected';
  accountStatus: 'active' | 'suspended' | 'closed';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OnboardingSessionInfo {
  sessionId: string;
  currentStep: string;
  sessionStatus: string;
}

interface OnboardingStatusResponse {
  success: boolean;
  data: OnboardingStatus | null;
  session: OnboardingSessionInfo | null;
}

const fetchOnboardingStatus = async (evmAddress: string): Promise<OnboardingStatusResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/onboarding/status/${evmAddress}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch onboarding status: ${response.status}`);
  }

  return response.json();
};

export function useOnboardingStatus(evmAddress: string) {
  return useQuery({
    queryKey: ['onboarding-status', evmAddress],
    queryFn: () => fetchOnboardingStatus(evmAddress),
    enabled: !!evmAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
