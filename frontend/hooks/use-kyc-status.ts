import { useQuery } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

type KYCStatus = 'pending' | 'approved' | 'rejected' | 'incomplete';

interface KYCStatusResponse {
  success: boolean;
  data?: {
    kycStatus: KYCStatus;
  };
  error?: string;
}

const fetchKYCStatus = async (sessionId: string): Promise<KYCStatus> => {
  const response = await fetch(`${API_BASE_URL}/api/onboarding/session/${sessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch KYC status');
  }

  const result: KYCStatusResponse = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch KYC status');
  }

  // Map session data to KYC status
  return result.data.kycStatus || 'pending';
};

export function useKYCStatus(sessionId: string) {
  return useQuery({
    queryKey: ['kyc-status', sessionId],
    queryFn: () => fetchKYCStatus(sessionId),
    refetchInterval: 5000, // Poll every 5 seconds
  });
}
