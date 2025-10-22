import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

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
  
  let overallStatus: 'approved' | 'rejected' | 'pending' | 'incomplete' = 'pending';
  if (qualificationCompleted) {
    overallStatus = 'approved';
  } else if (!kycCompleted || !identityCompleted) {
    overallStatus = 'incomplete';
  }

  return {
    overallStatus,
    progress: session.progress || 0,
    estimatedCompletion: '2-3 business days',
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
        id: 'kyc',
        name: 'Know Your Customer',
        description: 'AML/KYC compliance check',
        status: kycCompleted ? 'approved' : 'pending',
        comments: kycCompleted ? 'KYC verification completed' : 'Pending KYC review'
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
        id: 'kyc-review',
        title: 'KYC Review',
        description: 'Reviewing KYC documents and information',
        status: kycCompleted ? 'completed' : 'upcoming',
        timestamp: session.kycCompletedAt || ''
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

  // Subscribe to real-time updates
  useEffect(() => {
    // Mock WebSocket connection - replace with actual WebSocket
    const interval = setInterval(() => {
      // Simulate periodic updates
      queryClient.invalidateQueries({ queryKey: ['qualification', sessionId] });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [sessionId, queryClient]);

  return useQuery({
    queryKey: ['qualification', sessionId],
    queryFn: () => fetchQualificationStatus(sessionId),
    staleTime: 30000,
  });
}
