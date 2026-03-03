import { supabase } from './supabase';
import { FILE_UPLOAD, CACHE_CONTROL } from './constants';
import { sanitizeFileName } from './sanitize';
import { compressImage, shouldCompressImage } from './imageCompression';
import { logger } from './logger';

export interface UploadOptions {
  compress?: boolean;
  cacheControl?: string;
  upsert?: boolean;
}

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  filePath?: string;
  fileName?: string;
  error?: string;
}

export function validateFileType(file: File): boolean {
  const allAllowedTypes = [
    ...FILE_UPLOAD.ALLOWED_IMAGE_TYPES,
    ...FILE_UPLOAD.ALLOWED_DOCUMENT_TYPES,
  ];

  return allAllowedTypes.includes(file.type);
}

export function validateFileSize(file: File): boolean {
  return file.size <= FILE_UPLOAD.MAX_SIZE;
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function isImageFile(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return FILE_UPLOAD.IMAGE_EXTENSIONS.includes(ext);
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!validateFileType(file)) {
    return {
      valid: false,
      error: `Invalid file type. Only ${FILE_UPLOAD.ALLOWED_FILE_EXTENSIONS.join(', ')} files are allowed.`,
    };
  }

  if (!validateFileSize(file)) {
    return {
      valid: false,
      error: `File size exceeds ${FILE_UPLOAD.MAX_SIZE_MB}MB limit.`,
    };
  }

  return { valid: true };
}

export async function uploadFile(
  file: File,
  bucket: string,
  path: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const validation = validateFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    let fileToUpload = file;

    if (options.compress !== false && shouldCompressImage(file)) {
      logger.info('Compressing image before upload', { fileName: file.name });
      fileToUpload = await compressImage(file);
    }

    const sanitizedName = sanitizeFileName(file.name);
    const fileExt = getFileExtension(sanitizedName);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileToUpload, {
        cacheControl: options.cacheControl || CACHE_CONTROL.DEFAULT,
        upsert: options.upsert || false,
      });

    if (uploadError) {
      logger.error('File upload failed', uploadError as Error, { fileName: file.name });
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`,
      };
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    logger.info('File uploaded successfully', {
      fileName: file.name,
      filePath,
      fileUrl: urlData.publicUrl,
    });

    return {
      success: true,
      fileUrl: urlData.publicUrl,
      filePath,
      fileName: sanitizedName,
    };
  } catch (error) {
    logger.error('Unexpected error during file upload', error as Error, { fileName: file.name });
    return {
      success: false,
      error: 'An unexpected error occurred during upload.',
    };
  }
}

export async function uploadMultipleFiles(
  files: File[],
  bucket: string,
  path: string,
  options: UploadOptions = {}
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadFile(file, bucket, path, options);
    results.push(result);
  }

  return results;
}

export async function deleteFile(bucket: string, filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      logger.error('File deletion failed', error as Error, { filePath });
      return false;
    }

    logger.info('File deleted successfully', { filePath });
    return true;
  } catch (error) {
    logger.error('Unexpected error during file deletion', error as Error, { filePath });
    return false;
  }
}

export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      logger.error('Failed to create signed URL', error as Error, { filePath });
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    logger.error('Unexpected error creating signed URL', error as Error, { filePath });
    return null;
  }
}
