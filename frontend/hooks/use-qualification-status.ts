import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { type Address } from 'viem';
import { checkIdentityRegistration, getIdentityInfo, checkAccreditationClaims } from '@/lib/evm-client-api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface QualificationStatus {
  overallStatus: 'approved' | 'rejected' | 'pending' | 'incomplete';
  progress: number;
  estimatedCompletion: string;
  criteria: QualificationCriterion[];
  timeline: ReviewStep[];
  lastUpdated: string;
}

interface QualificationCriterion {
  id: string;
  name: string;
  description: string;
  status: 'approved' | 'rejected' | 'pending' | 'not_started';
  comments?: string;
  evidence?: string[];
}

interface ReviewStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  timestamp: string;
  documents?: Array<{ id: string; name: string }>;
}

interface QualificationResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const fetchQualificationStatus = async (sessionId: string): Promise<QualificationStatus> => {
  const response = await fetch(`${API_BASE_URL}/api/onboarding/session/${sessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch qualification status');
  }

  const result: QualificationResponse = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch qualification status');
  }

  const session = result.data;

  // Map session data to qualification status format
  const kycCompleted = session.kycCompleted;
  const identityCompleted = session.identityCompleted;
  const qualificationCompleted = session.qualificationCompleted;

  // Enhanced qualification checking with ERC-3643 identity registry
  let blockchainIdentityVerified = false;
  let blockchainAccreditationVerified = false;
  let identityRegistryAddress: Address | undefined;

  // Check if session has wallet address for blockchain verification
  if (session.walletAddress && session.walletAddress.startsWith('0x')) {
    try {
      // Get identity registry address from session or use default
      // In production, this would come from the deployed ERC-3643 contracts
      identityRegistryAddress = session.identityRegistryAddress as Address ||
        '0x1234567890123456789012345678901234567890'; // Placeholder

      // Check blockchain identity verification
      blockchainIdentityVerified = await checkIdentityRegistration(
        session.walletAddress as Address,
        identityRegistryAddress
      );

      // Check blockchain accreditation claims
      blockchainAccreditationVerified = await checkAccreditationClaims(
        session.walletAddress as Address,
        identityRegistryAddress
      );

      // Get additional identity information
      const identityInfo = await getIdentityInfo(
        session.walletAddress as Address,
        identityRegistryAddress
      );

      if (identityInfo) {
        // Enhance session with blockchain data
        console.log('Blockchain identity verified:', identityInfo);
      }
    } catch (blockchainError) {
      console.warn('Blockchain identity verification failed:', blockchainError);
      // Continue with API-based verification
    }
  }

  // Combine API and blockchain verification
  const enhancedKycCompleted = kycCompleted || blockchainIdentityVerified;
  const enhancedQualificationCompleted = qualificationCompleted || blockchainAccreditationVerified;

  let overallStatus: 'approved' | 'rejected' | 'pending' | 'incomplete' = 'pending';
  if (enhancedQualificationCompleted) {
    overallStatus = 'approved';
  } else if (!enhancedKycCompleted || !identityCompleted) {
    overallStatus = 'incomplete';
  }

  // Calculate enhanced progress based on blockchain verification
  const baseProgress = session.progress || 0;
  const blockchainBonus = (blockchainIdentityVerified ? 15 : 0) + (blockchainAccreditationVerified ? 20 : 0);
  const enhancedProgress = Math.min(baseProgress + blockchainBonus, 100);

  return {
    overallStatus,
    progress: enhancedProgress,
    estimatedCompletion: blockchainIdentityVerified ? '1-2 business days' : '2-3 business days',
    lastUpdated: session.updatedAt || new Date().toISOString(),
    criteria: [
      {
        id: 'identity',
        name: 'Identity Verification',
        description: 'Government ID and personal information verification',
        status: identityCompleted ? 'approved' : 'pending',
        comments: identityCompleted ? 'Identity verified successfully' : 'Pending verification'
      },
      {
        id: 'blockchain-identity',
        name: 'Blockchain Identity',
        description: 'ERC-3643 identity registry verification',
        status: blockchainIdentityVerified ? 'approved' : 'pending',
        comments: blockchainIdentityVerified ?
          'Blockchain identity verified via ERC-3643' :
          'Pending blockchain identity verification'
      },
      {
        id: 'kyc',
        name: 'Know Your Customer',
        description: 'AML/KYC compliance check',
        status: kycCompleted ? 'approved' : 'pending',
        comments: kycCompleted ? 'KYC verification completed' : 'Pending KYC review'
      },
      {
        id: 'blockchain-accreditation',
        name: 'Blockchain Accreditation',
        description: 'ERC-3643 accreditation claims verification',
        status: blockchainAccreditationVerified ? 'approved' : 'pending',
        comments: blockchainAccreditationVerified ?
          'Accreditation verified via ERC-3643 claims' :
          'Pending blockchain accreditation verification'
      },
      {
        id: 'accreditation',
        name: 'Investor Accreditation',
        description: 'Financial qualification assessment',
        status: qualificationCompleted ? 'approved' : 'pending',
        comments: qualificationCompleted ? 'Qualification approved' : 'Under review'
      },
      {
        id: 'source-of-funds',
        name: 'Source of Funds',
        description: 'Verification of fund legitimacy',
        status: qualificationCompleted ? 'approved' : 'pending',
        comments: qualificationCompleted ? 'Funds verified' : 'Pending verification'
      }
    ],
    timeline: [
      {
        id: 'submission',
        title: 'Application Submitted',
        description: 'Initial application and documents received',
        status: 'completed',
        timestamp: session.startedAt || session.createdAt
      },
      {
        id: 'identity-check',
        title: 'Identity Verification',
        description: 'Cross-referencing identity information',
        status: identityCompleted ? 'completed' : 'upcoming',
        timestamp: session.identityCompletedAt || ''
      },
      {
        id: 'blockchain-identity',
        title: 'Blockchain Identity',
        description: 'ERC-3643 identity registry verification',
        status: blockchainIdentityVerified ? 'completed' : 'upcoming',
        timestamp: blockchainIdentityVerified ? new Date().toISOString() : ''
      },
      {
        id: 'kyc-review',
        title: 'KYC Review',
        description: 'Reviewing KYC documents and information',
        status: kycCompleted ? 'completed' : 'upcoming',
        timestamp: session.kycCompletedAt || ''
      },
      {
        id: 'blockchain-accreditation',
        title: 'Blockchain Accreditation',
        description: 'ERC-3643 accreditation claims verification',
        status: blockchainAccreditationVerified ? 'completed' : 'upcoming',
        timestamp: blockchainAccreditationVerified ? new Date().toISOString() : ''
      },
      {
        id: 'qualification-assessment',
        title: 'Qualification Assessment',
        description: 'Evaluating investor qualification status',
        status: qualificationCompleted ? 'completed' : session.currentStep === 'qualification' ? 'current' : 'upcoming',
        timestamp: session.qualificationCompletedAt || ''
      },
      {
        id: 'final-approval',
        title: 'Final Approval',
        description: 'Final review and account activation',
        status: 'upcoming',
        timestamp: ''
      }
    ]
  };
};

export function useQualificationStatus(sessionId: string) {
  const queryClient = useQueryClient();

  // Real-time blockchain monitoring for qualification status
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setupMonitoring = async () => {
      if (!sessionId) return;

      try {
        // Get current session data to check for wallet address
        const currentData = queryClient.getQueryData(['qualification', sessionId]) as QualificationStatus | undefined;

        if (!currentData) return;

        // Check if we have a wallet address for blockchain monitoring
        // In production, this would come from the session data
        const walletAddress = '0x1234567890123456789012345678901234567890'; // Placeholder for demo
        const identityRegistryAddress = '0x1234567890123456789012345678901234567890'; // Placeholder

        if (walletAddress && walletAddress.startsWith('0x')) {
          try {
            // Monitor blockchain identity and accreditation status
            const [identityVerified, accreditationVerified] = await Promise.all([
              checkIdentityRegistration(walletAddress as Address, identityRegistryAddress as Address),
              checkAccreditationClaims(walletAddress as Address, identityRegistryAddress as Address)
            ]);

            // Update qualification status if blockchain verification changed
            const needsUpdate =
              identityVerified !== (currentData.criteria.find(c => c.id === 'blockchain-identity')?.status === 'approved') ||
              accreditationVerified !== (currentData.criteria.find(c => c.id === 'blockchain-accreditation')?.status === 'approved');

            if (needsUpdate) {
              console.log('Blockchain qualification status updated:', { identityVerified, accreditationVerified });

              // Trigger refetch to get updated status from API with blockchain data
              queryClient.invalidateQueries({ queryKey: ['qualification', sessionId] });
            }
          } catch (blockchainError) {
            console.warn('Blockchain qualification monitoring failed:', blockchainError);
          }
        }

        // Fallback to periodic polling if blockchain monitoring fails
        // This ensures the status stays updated even without wallet connection
        const fallbackInterval = setInterval(() => {
          queryClient.invalidateQueries({ queryKey: ['qualification', sessionId] });
        }, 60000); // Check every minute for API updates

        cleanup = () => clearInterval(fallbackInterval);

      } catch (error) {
        console.error('Failed to setup qualification monitoring:', error);

        // Fallback to basic polling if setup fails
        const fallbackInterval = setInterval(() => {
          queryClient.invalidateQueries({ queryKey: ['qualification', sessionId] });
        }, 30000); // 30 second fallback

        cleanup = () => clearInterval(fallbackInterval);
      }
    };

    setupMonitoring();

    return () => {
      if (cleanup) cleanup();
    };
  }, [sessionId, queryClient]);

  return useQuery({
    queryKey: ['qualification', sessionId],
    queryFn: () => fetchQualificationStatus(sessionId),
    staleTime: 30000,
  });
}
