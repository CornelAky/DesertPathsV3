import { FILE_UPLOAD } from './constants';
import { logger } from './logger';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = FILE_UPLOAD.IMAGE_MAX_WIDTH,
    maxHeight = FILE_UPLOAD.IMAGE_MAX_HEIGHT,
    quality = FILE_UPLOAD.IMAGE_COMPRESSION_QUALITY,
    mimeType = file.type,
  } = options;

  if (!file.type.startsWith('image/')) {
    logger.debug('File is not an image, skipping compression', { fileName: file.name });
    return file;
  }

  if (file.type === 'image/gif') {
    logger.debug('GIF files are not compressed to preserve animation', { fileName: file.name });
    return file;
  }

  try {
    const image = await createImageBitmap(file);

    let width = image.width;
    let height = image.height;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      logger.error('Failed to get canvas context');
      return file;
    }

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, mimeType, quality);
    });

    if (!blob) {
      logger.error('Failed to create blob from canvas');
      return file;
    }

    const compressedFile = new File([blob], file.name, {
      type: mimeType,
      lastModified: Date.now(),
    });

    const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
    logger.info('Image compressed', {
      fileName: file.name,
      originalSize: file.size,
      compressedSize: compressedFile.size,
      compressionRatio: `${compressionRatio}%`,
    });

    return compressedFile;
  } catch (error) {
    logger.error('Error compressing image', error as Error, { fileName: file.name });
    return file;
  }
}

export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  const compressedFiles: File[] = [];

  for (const file of files) {
    const compressed = await compressImage(file, options);
    compressedFiles.push(compressed);
  }

  return compressedFiles;
}

export function shouldCompressImage(file: File): boolean {
  if (!file.type.startsWith('image/')) {
    return false;
  }

  if (file.type === 'image/gif') {
    return false;
  }

  if (file.size > 1024 * 1024) {
    return true;
  }

  return false;
}
