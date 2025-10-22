import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_BASE_API_URL || 'http://localhost:3000';

interface DocumentUpload {
  id: string;
  type: string;
  filename: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  extractedData?: any;
}

interface UploadParams {
  file: File;
  type: string;
}

interface UploadResponse {
  success: boolean;
  data?: {
    id: string;
  };
  error?: string;
}

const uploadToKYCProvider = async (formData: FormData): Promise<DocumentUpload> => {
  const response = await fetch(`${API_BASE_URL}/api/onboarding/kyc/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Failed to upload document');
  }

  const result: UploadResponse = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to upload document');
  }

  const file = formData.get('file') as File;
  const type = formData.get('type') as string;

  return {
    id: result.data.id,
    type,
    filename: file.name,
    status: 'processing',
  };
};

const extractDocumentData = async (documentId: string) => {
  // For now, return basic confirmation
  // In production, this would trigger OCR and wait for results
  return {
    documentId,
    processed: true,
    message: 'Document uploaded and queued for processing',
  };
};

export function useDocumentUpload(sessionId: string) {
  const [uploads, setUploads] = useState<DocumentUpload[]>([]);

  const uploadDocument = useMutation({
    mutationFn: async ({ file, type }: UploadParams) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('sessionId', sessionId);

      return await uploadToKYCProvider(formData);
    },
    onSuccess: (result) => {
      setUploads(prev => [...prev, result]);
      // Trigger OCR processing
      processDocument.mutate(result.id);
    },
  });

  const processDocument = useMutation({
    mutationFn: async (documentId: string) => {
      return await extractDocumentData(documentId);
    },
    onSuccess: (extractedData, documentId) => {
      // Update upload status and add extracted data
      setUploads(prev =>
        prev.map(upload =>
          upload.id === documentId
            ? { ...upload, status: 'completed', extractedData }
            : upload
        )
      );
    },
  });

  return { uploads, uploadDocument, processDocument };
}
