import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWallet } from "@/contexts/wallet-context";
import { onboardingStartSchema, OnboardingStartData } from "@/schemas/onboarding-schemas";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface OnboardingStartRequest {
  address: string;
  userType: 'individual' | 'entity';
  jurisdiction: string;
  email?: string;
  privacyConsent: boolean;
  termsConsent: boolean;
  dataProcessingConsent: boolean;
}

interface OnboardingStartResponse {
  success: boolean;
  data?: {
    sessionId: string;
    userId: string;
  };
  error?: string;
}

const createOnboardingSession = async (data: OnboardingStartRequest): Promise<OnboardingStartResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/onboarding/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to start onboarding' }));
    throw new Error(errorData.error || errorData.details || 'Failed to start onboarding');
  }

  return response.json();
};

export function useOnboardingStart() {
  const navigate = useNavigate();
  const { state } = useWallet();

  const form = useForm<OnboardingStartData>({
    resolver: zodResolver(onboardingStartSchema),
    defaultValues: {
      userType: undefined,
      jurisdiction: '',
      email: '',
      consents: {
        privacy: false,
        terms: false,
        dataProcessing: false,
      }
    }
  });

  const startOnboarding = useMutation({
    mutationFn: async (data: OnboardingStartData) => {
      const walletAddress = state.address;
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }
      
      const requestData: OnboardingStartRequest = {
        address: walletAddress,
        userType: data.userType as 'individual' | 'entity',
        jurisdiction: data.jurisdiction,
        email: data.email,
        privacyConsent: data.consents.privacy,
        termsConsent: data.consents.terms,
        dataProcessingConsent: data.consents.dataProcessing,
      };
      
      const result = await createOnboardingSession(requestData);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to start onboarding');
      }
      
      return { sessionId: result.data.sessionId, userId: result.data.userId, userType: data.userType };
    },
    onSuccess: ({ sessionId, userType }) => {
      const nextStep = userType === 'individual' ? 'kyc' : 'identity';
      navigate(`/onboarding/${nextStep}/${sessionId}`);
    },
  });

  return { form, startOnboarding };
}
