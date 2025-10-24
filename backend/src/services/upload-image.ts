import { mkdir, writeFile, unlink, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { Pool } from 'pg';

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

export interface ImageMetadata {
  id: string;
  propertyId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export class UploadImageService {
  private pool: Pool;
  private uploadDir: string;

  constructor(pool: Pool, uploadDir: string = './uploads') {
    this.pool = pool;
    this.uploadDir = uploadDir;
  }

  /**
   * Upload an image for a specific property
   */
  async uploadPropertyImage(
    propertyId: string,
    file: File,
    userAddress: string
  ): Promise<UploadResult> {
    try {
      // Validate property ownership
      const propertyCheck = await this.pool.query(
        'SELECT id FROM public.properties WHERE id = $1 AND created_by = $2',
        [propertyId, userAddress]
      );

      if (propertyCheck.rows.length === 0) {
        return {
          success: false,
          error: 'Property not found or access denied'
        };
      }

      // Create property-specific directory
      const propertyDir = join(this.uploadDir, 'properties', propertyId);
      await mkdir(propertyDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const extension = extname(file.name).toLowerCase();
      const fileName = `${timestamp}-${randomId}${extension}`;

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'
        };
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'File size too large. Maximum size is 5MB.'
        };
      }

      // Save file
      const filePath = join(propertyDir, fileName);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filePath, buffer);

      // Save metadata to database
      const imageId = `${propertyId}-${timestamp}-${randomId}`;
      const fileUrl = `/uploads/properties/${propertyId}/${fileName}`;

      await this.pool.query(
        `INSERT INTO public.property_images (id, property_id, file_name, original_name, mime_type, size, url, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [imageId, propertyId, fileName, file.name, file.type, file.size, fileUrl]
      );

      return {
        success: true,
        fileUrl,
        fileName
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: 'Failed to upload image'
      };
    }
  }

  /**
   * Get all images for a property
   */
  async getPropertyImages(propertyId: string): Promise<ImageMetadata[]> {
    try {
      const result = await this.pool.query(
        `SELECT id, property_id, file_name, original_name, mime_type, size, url, uploaded_at
         FROM public.property_images
         WHERE property_id = $1
         ORDER BY uploaded_at DESC`,
        [propertyId]
      );

      return result.rows.map(row => ({
        id: row.id,
        propertyId: row.property_id,
        fileName: row.file_name,
        originalName: row.original_name,
        mimeType: row.mime_type,
        size: row.size,
        url: row.url,
        uploadedAt: row.uploaded_at
      }));
    } catch (error) {
      console.error('Failed to get property images:', error);
      return [];
    }
  }

  /**
   * Delete an image
   */
  async deleteImage(imageId: string, userAddress: string): Promise<boolean> {
    try {
      // Get image info and verify ownership
      const imageResult = await this.pool.query(
        `SELECT pi.*, p.created_by
         FROM public.property_images pi
         JOIN public.properties p ON pi.property_id = p.id
         WHERE pi.id = $1`,
        [imageId]
      );

      if (imageResult.rows.length === 0) {
        return false;
      }

      const image = imageResult.rows[0];
      if (image.created_by !== userAddress) {
        return false;
      }

      // Delete from filesystem
      const filePath = join(this.uploadDir, 'properties', image.property_id, image.file_name);
      try {
        await unlink(filePath);
      } catch (fsError) {
        console.warn('Failed to delete file from filesystem:', fsError);
      }

      // Delete from database
      await this.pool.query('DELETE FROM property_images WHERE id = $1', [imageId]);

      return true;
    } catch (error) {
      console.error('Failed to delete image:', error);
      return false;
    }
  }

  /**
   * Clean up orphaned files (files without database records)
   */
  async cleanupOrphanedFiles(): Promise<number> {
    try {
      const propertiesDir = join(this.uploadDir, 'properties');
      const propertyDirs = await readdir(propertiesDir).catch(() => []);

      let cleanedCount = 0;

      for (const propertyId of propertyDirs) {
        const propertyDir = join(propertiesDir, propertyId);
        const files = await readdir(propertyDir).catch(() => []);

        for (const fileName of files) {
          // Check if file exists in database
          const dbCheck = await this.pool.query(
            'SELECT id FROM property_images WHERE property_id = $1 AND file_name = $2',
            [propertyId, fileName]
          );

          if (dbCheck.rows.length === 0) {
            // File is orphaned, delete it
            const filePath = join(propertyDir, fileName);
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