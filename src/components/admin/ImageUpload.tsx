import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, Image as ImageIcon, Loader, AlertCircle, FileText, File as FileIcon, ExternalLink } from 'lucide-react';
import { uploadFile, deleteFile, isImageFile as isImageFileUtil } from '../../lib/fileUpload';
import { logger } from '../../lib/logger';
import { FILE_UPLOAD } from '../../lib/constants';

interface ImageData {
  file_name: string;
  file_path: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by: string;
}

interface ImageUploadProps {
  images: ImageData[];
  onImagesChange: (images: ImageData[]) => void;
  sectionType: 'accommodations' | 'activities' | 'dining';
  sectionId: string;
  maxImages?: number;
  label?: string;
  helpText?: string;
}

export default function ImageUpload({
  images,
  onImagesChange,
  sectionType,
  sectionId,
  maxImages = 5,
  label = 'Images & Files',
  helpText = 'Upload images and documents (JPG, PNG, PDF, Word, Excel - max 10MB each)',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be logged in to upload images');
      return;
    }

    if (images.length + selectedFiles.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setError(null);
    setUploading(true);

    const newImages: ImageData[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        const result = await uploadFile(
          file,
          'section-images',
          `${sectionType}/${sectionId}`,
          { compress: true }
        );

        if (!result.success) {
          throw new Error(`${file.name}: ${result.error}`);
        }

        newImages.push({
          file_name: result.fileName || file.name,
          file_path: result.filePath || '',
          file_url: result.fileUrl || '',
          uploaded_at: new Date().toISOString(),
          uploaded_by: user.id,
        });
      }

      onImagesChange([...images, ...newImages]);
    } catch (err) {
      logger.error('Error uploading images', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = async (index: number) => {
    const imageToRemove = images[index];

    try {
      const deleted = await deleteFile('section-images', imageToRemove.file_path);

      if (!deleted) {
        logger.warn('Failed to delete file from storage', { filePath: imageToRemove.file_path });
      }

      const newImages = images.filter((_, i) => i !== index);
      onImagesChange(newImages);
    } catch (err) {
      logger.error('Error removing image', err as Error, { index });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : '+ Add More'}
          </button>
        )}
      </div>

      {helpText && (
        <p className="text-xs text-slate-500">{helpText}</p>
      )}

      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={[...FILE_UPLOAD.ALLOWED_IMAGE_TYPES, ...FILE_UPLOAD.ALLOWED_DOCUMENT_TYPES].join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {images.length === 0 && !uploading && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Click to upload files</p>
          <p className="text-xs text-slate-500 mt-1">Images, PDFs, and documents</p>
        </div>
      )}

      {uploading && (
        <div className="flex items-center justify-center space-x-2 p-6 border border-slate-200 rounded-lg">
          <Loader className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-sm text-slate-600">Uploading files...</span>
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-3">
          {images.filter(img => isImageFileUtil(img.file_name)).length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Images</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.filter(img => isImageFileUtil(img.file_name)).map((image, actualIndex) => {
                  const index = images.indexOf(image);
                  return (
                    <div
                      key={index}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                    >
                      <img
                        src={image.file_url}
                        alt={image.file_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-600 hover:bg-red-700 text-white rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2 truncate">
                        {image.file_name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {images.filter(img => !isImageFileUtil(img.file_name)).length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Documents</p>
              <div className="space-y-2">
                {images.filter(img => !isImageFileUtil(img.file_name)).map((doc, actualIndex) => {
                  const index = images.indexOf(doc);
                  const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
                  const isWord = doc.file_name.toLowerCase().match(/\.(doc|docx)$/);
                  const isExcel = doc.file_name.toLowerCase().match(/\.(xls|xlsx)$/);

                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-white rounded border border-slate-200 group hover:border-blue-400"
                    >
                      <div className="flex-shrink-0 p-2 bg-slate-100 rounded">
                        {isPdf ? (
                          <FileText className="w-4 h-4 text-red-600" />
                        ) : isWord ? (
                          <FileText className="w-4 h-4 text-blue-600" />
                        ) : isExcel ? (
                          <FileText className="w-4 h-4 text-green-600" />
                        ) : (
                          <FileIcon className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name}</p>
                        <p className="text-xs text-slate-500">
                          Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        title="View file"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="flex-shrink-0 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {images.length > 0 && images.length < maxImages && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
          <span className="text-sm text-slate-600">
            Add More Files ({images.length}/{maxImages})
          </span>
        </button>
      )}
    </div>
  );
}
