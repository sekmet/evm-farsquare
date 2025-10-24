/**
 * Document Upload Service
 * Handles KYC document uploads with secure storage and validation
 */

import { mkdir, writeFile, unlink, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import type { Pool } from 'pg';

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  documentId?: string;
  error?: string;
}

export interface DocumentMetadata {
  id: string;
  userId: string;
  sessionId: string;
  documentType: 'id_front' | 'id_back' | 'passport' | 'proof_of_address' | 'proof_of_income' | 'selfie' | 'other';
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  status: 'uploaded' | 'processing' | 'verified' | 'rejected';
  extractedData?: Record<string, any>;
  uploadedAt: Date;
  verifiedAt?: Date;
}

export interface DocumentUploadOptions {
  userId: string;
  sessionId: string;
  documentType: string;
  file: File;
}

/**
 * Service for managing KYC document uploads
 */
export class UploadDocsService {
  private pool: Pool;
  private uploadDir: string;

  constructor(pool: Pool, uploadDir: string = './uploads') {
    this.pool = pool;
    this.uploadDir = uploadDir;
  }

  /**
   * Upload a KYC document for a specific user/session
   */
  async uploadDocument(options: DocumentUploadOptions): Promise<UploadResult> {
    try {
      const { userId, sessionId, documentType, file } = options;

      // Validate session ownership
      const sessionCheck = await this.pool.query(
        'SELECT id FROM public.onboarding_sessions WHERE session_id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      if (sessionCheck.rows.length === 0) {
        return {
          success: false,
          error: 'Session not found or access denied'
        };
      }

      // Create user-specific directory
      const userDir = join(this.uploadDir, 'kyc', userId);
      await mkdir(userDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const extension = extname(file.name).toLowerCase();
      const fileName = `${documentType}-${timestamp}-${randomId}${extension}`;

      // Validate file type (documents and images)
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: 'Invalid file type. Only PDF, JPEG, PNG, WebP, and HEIC/HEIF are allowed.'
        };
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'File size too large. Maximum size is 10MB.'
        };
      }

      // Save file
      const filePath = join(userDir, fileName);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filePath, buffer);

      // Save metadata to database
      const documentId = `doc-${userId}-${timestamp}-${randomId}`;
      const fileUrl = `/uploads/kyc/${userId}/${fileName}`;

      const insertQuery = `
        INSERT INTO public.kyc_documents (
          id, user_id, session_id, document_type, file_name, 
          original_name, mime_type, size, url, status, uploaded_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'uploaded', NOW())
        RETURNING *
      `;

      await this.pool.query(insertQuery, [
        documentId,
        userId,
        sessionId,
        documentType,
        fileName,
        file.name,
        file.type,
        file.size,
        fileUrl
      ]);

      return {
        success: true,
        fileUrl,
        fileName,
        documentId
      };
    } catch (error) {
      console.error('Document upload error:', error);
      return {
        success: false,
        error: 'Failed to upload document'
      };
    }
  }

  /**
   * Get all documents for a session
   */
  async getSessionDocuments(sessionId: string): Promise<DocumentMetadata[]> {
    try {
      const query = `
        SELECT 
          id, user_id, session_id, document_type, file_name,
          original_name, mime_type, size, url, status,
          extracted_data, uploaded_at, verified_at
        FROM public.kyc_documents
        WHERE session_id = $1
        ORDER BY uploaded_at DESC
      `;

      const result = await this.pool.query(query, [sessionId]);

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        documentType: row.document_type,
        fileName: row.file_name,
        originalName: row.original_name,
        mimeType: row.mime_type,
        size: row.size,
        url: row.url,
        status: row.status,
        extractedData: row.extracted_data,
        uploadedAt: row.uploaded_at,
        verifiedAt: row.verified_at
      }));
    } catch (error) {
      console.error('Failed to get session documents:', error);
      return [];
    }
  }

  /**
   * Get documents for a user
   */
  async getUserDocuments(userId: string): Promise<DocumentMetadata[]> {
    try {
      const query = `
        SELECT 
          id, user_id, session_id, document_type, file_name,
          original_name, mime_type, size, url, status,
          extracted_data, uploaded_at, verified_at
        FROM public.kyc_documents
        WHERE user_id = $1
        ORDER BY uploaded_at DESC
      `;

      const result = await this.pool.query(query, [userId]);

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        documentType: row.document_type,
        fileName: row.file_name,
        originalName: row.original_name,
        mimeType: row.mime_type,
        size: row.size,
        url: row.url,
        status: row.status,
        extractedData: row.extracted_data,
        uploadedAt: row.uploaded_at,
        verifiedAt: row.verified_at
      }));
    } catch (error) {
      console.error('Failed to get user documents:', error);
      return [];
    }
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(
    documentId: string,
    status: 'uploaded' | 'processing' | 'verified' | 'rejected',
    extractedData?: Record<string, any>
  ): Promise<boolean> {
    try {
      const query = `
        UPDATE public.kyc_documents
        SET status = $2,
            extracted_data = $3,
            verified_at = CASE WHEN $2 = 'verified' THEN NOW() ELSE verified_at END,
            updated_at = NOW()
        WHERE id = $1
      `;

      await this.pool.query(query, [documentId, status, extractedData ? JSON.stringify(extractedData) : null]);
      return true;
    } catch (error) {
      console.error('Failed to update document status:', error);
      return false;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      // Get document info and verify ownership
      const docResult = await this.pool.query(
        'SELECT * FROM public.kyc_documents WHERE id = $1 AND user_id = $2',
        [documentId, userId]
      );

      if (docResult.rows.length === 0) {
        return false;
      }

      const document = docResult.rows[0];

      // Delete from filesystem
      const filePath = join(this.uploadDir, 'kyc', userId, document.file_name);
      try {
        await unlink(filePath);
      } catch (fsError) {
        console.warn('Failed to delete file from filesystem:', fsError);
      }

      // Delete from database
      await this.pool.query('DELETE FROM public.kyc_documents WHERE id = $1', [documentId]);

      return true;
    } catch (error) {
      console.error('Failed to delete document:', error);
      return false;
    }
  }

  /**
   * Check if required documents are uploaded for a session
   */
  async checkRequiredDocuments(sessionId: string): Promise<{
    allUploaded: boolean;
    missing: string[];
    uploaded: string[];
  }> {
    try {
      const requiredTypes = ['id_front', 'proof_of_address'];
      const documents = await this.getSessionDocuments(sessionId);
      
      const uploadedTypes = documents.map(d => d.documentType);
      const missing = requiredTypes.filter(type => !uploadedTypes.includes(type as any));

      return {
        allUploaded: missing.length === 0,
        missing,
        uploaded: uploadedTypes
      };
    } catch (error) {
      console.error('Failed to check required documents:', error);
      return {
        allUploaded: false,
        missing: ['id_front', 'proof_of_address'],
        uploaded: []
      };
    }
  }

  /**
   * Clean up orphaned files (files without database records)
   */
  async cleanupOrphanedFiles(): Promise<number> {
    try {
      const kycDir = join(this.uploadDir, 'kyc');
      const userDirs = await readdir(kycDir).catch(() => []);

      let cleanedCount = 0;

      for (const userId of userDirs) {
        const userDir = join(kycDir, userId);
        const files = await readdir(userDir).catch(() => []);

        for (const fileName of files) {
          // Check if file exists in database
          const dbCheck = await this.pool.query(
            'SELECT id FROM public.kyc_documents WHERE user_id = $1 AND file_name = $2',
            [userId, fileName]
          );

          if (dbCheck.rows.length === 0) {
            // File is orphaned, delete it
            const filePath = join(userDir, fileName);
            await unlink(filePath).catch(() => {});
            cleanedCount++;
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup orphaned files:', error);
      return 0;
    }
  }
}
