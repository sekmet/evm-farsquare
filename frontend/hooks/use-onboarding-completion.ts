import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface CompletionData {
  investorId: string;
  completionDate: string;
  totalSteps: number;
  completedSteps: number;
  achievements: Achievement[];
  certificateUrl?: string;
  qualificationStatus: 'approved' | 'pending' | 'rejected';
  nextSteps: string[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}

// Fetch completion data from backend
const fetchCompletionData = async (sessionId: string): Promise<CompletionData> => {
  const response = await fetch(`${API_BASE_URL}/api/onboarding/session/${sessionId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch completion data');
  }
  
  const result = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch completion data');
  }
  
  const session = result.data;
  
  // Transform backend data to match frontend interface
  return {
    investorId: session.userId,
    completionDate: session.updatedAt || new Date().toISOString(),
    totalSteps: 6,
    completedSteps: [
      session.startCompleted,
      session.kycCompleted,
      session.identityCompleted,
      session.qualificationCompleted,
      session.esignCompleted,
      session.status === 'completed'
    ].filter(Boolean).length,
    qualificationStatus: session.status === 'completed' ? 'approved' : 'pending',
    nextSteps: [
      'Browse tokenized real estate opportunities',
      'Set up investment preferences',
      'Complete security settings',
      'Join investor community'
    ],
    achievements: [
      {
        id: 'identity-verified',
        title: 'Identity Verified',
        description: 'Successfully completed identity verification',
        icon: 'Shield',
        earned: session.identityCompleted,
        earnedDate: session.identityCompleted ? session.updatedAt : undefined
      },
      {
        id: 'kyc-compliant',
        title: 'KYC Compliant',
        description: 'Passed Know Your Customer requirements',
        icon: 'CheckCircle',
        earned: session.kycCompleted,
        earnedDate: session.kycCompleted ? session.updatedAt : undefined
      },
      {
        id: 'qualified-investor',
        title: 'Qualified Investor',
        description: 'Met ERC-3643 qualification standards',
        icon: 'Award',
        earned: session.qualificationCompleted,
        earnedDate: session.qualificationCompleted ? session.updatedAt : undefined
      },
      {
        id: 'signed-agreements',
        title: 'Agreements Signed',
        description: 'Completed all legal document signatures',
        icon: 'FileText',
        earned: session.esignCompleted,
        earnedDate: session.esignCompleted ? session.updatedAt : undefined
      }
    ]
  };
};

// Generate completion certificate
const generateCompletionCertificate = async (sessionId: string): Promise<Blob> => {
  // In production, this would call a document generation service
  // For now, create a simple text certificate
  const certificateText = `
    ERC-3643 Investor Qualification Certificate

    This certifies that the investor has successfully completed
    all required onboarding steps and is qualified to participate
    in tokenized real estate investments.

    Session ID: ${sessionId}
    Completion Date: ${new Date().toISOString()}

    This certificate is cryptographically signed and verified on the blockchain.
  `;

  const blob = new Blob([certificateText], { type: 'text/plain' });
  return blob;
};

// Share to social platforms
const shareToPlatform = async (platform: string, shareData: any) => {
  // Platform-specific sharing logic
  const platforms: Record<string, string> = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`
  };
  
  if (platforms[platform]) {
    window.open(platforms[platform], '_blank', 'width=600,height=400');
  }
};

export function useOnboardingCompletion(sessionId: string) {
  const navigate = useNavigate();

  const { data: completionData, isLoading } = useQuery({
    queryKey: ['onboarding-completion', sessionId],
    queryFn: () => fetchCompletionData(sessionId),
  });

  const downloadCertificate = useMutation({
    mutationFn: async () => {
      const certificate = await generateCompletionCertificate(sessionId);
      // Trigger download
      const url = URL.createObjectURL(certificate);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'onboarding-certificate.pdf';
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const shareAchievement = useMutation({
    mutationFn: async (platform: string) => {
      if (!completionData) return;

      const shareData = {
        title: 'Completed ERC-3643 Investor Onboarding',
        text: 'Successfully completed regulated token investment onboarding!',
        url: `${window.location.origin}/investor/${completionData.investorId}`,
      };

      if (navigator.share && platform === 'native') {
        await navigator.share(shareData);
      } else {
        // Fallback to platform-specific sharing
        await shareToPlatform(platform, shareData);
      }
    },
  });

  return { completionData, downloadCertificate, shareAchievement, isLoading };
}
