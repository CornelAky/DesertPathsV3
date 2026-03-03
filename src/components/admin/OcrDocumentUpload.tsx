import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, Image, File, X, AlertCircle, CheckCircle, Loader, AlertTriangle } from 'lucide-react';
import { FileUploadError, getFileErrorInfo, type FileError } from './FileUploadError';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  errorCode?: string;
}

interface OcrDocumentUploadProps {
  journeyId: string;
  onUploadComplete: () => void;
  onClose: () => void;
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function OcrDocumentUpload({
  journeyId,
  onUploadComplete,
  onClose,
}: OcrDocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      if (!ALLOWED_TYPES.includes(file.type)) {
        newFiles.push({
          file,
          id: `${Date.now()}-${i}`,
          status: 'failed',
          progress: 0,
          errorCode: 'UNSUPPORTED_FORMAT',
          error: 'Unsupported file format',
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        newFiles.push({
          file,
          id: `${Date.now()}-${i}`,
          status: 'failed',
          progress: 0,
          errorCode: 'TOO_LARGE',
          error: 'File too large',
        });
        continue;
      }

      newFiles.push({
        file,
        id: `${Date.now()}-${i}`,
        status: 'pending',
        progress: 0,
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const processAllFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to upload files');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const uploadFile = files[i];
      if (uploadFile.status !== 'pending') continue;

      try {
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f))
        );

        const fileExt = uploadFile.file.name.split('.').pop();
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `${journeyId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('itinerary-documents')
          .upload(filePath, uploadFile.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: 50 } : f))
        );

        const { data: docData, error: docError } = await supabase
          .from('uploaded_documents')
          .insert({
            trip_id: journeyId,
            file_name: uploadFile.file.name,
            file_type: uploadFile.file.type,
            file_size: uploadFile.file.size,
            storage_path: filePath,
            upload_order: i,
            ocr_status: 'pending',
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (docError) throw docError;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'processing', progress: 75 } : f
          )
        );

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-ocr-document`;
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId: docData.id,
            journeyId: journeyId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          const errorCode = result.errorCode || 'UNKNOWN';
          const errorMessage = result.error || 'OCR processing failed';
          throw { code: errorCode, message: errorMessage };
        }

        if (result.status === 'partial') {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: 'failed', progress: 100, errorCode: 'OCR_PARTIAL', error: 'Partial processing' }
                : f
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: 'completed', progress: 100 } : f
            )
          );
        }
      } catch (error: any) {
        console.error('Error processing file:', error);

        let errorCode = 'UNKNOWN';
        let errorMessage = 'Upload failed';

        if (error.code) {
          errorCode = error.code;
          errorMessage = error.message || 'Upload failed';
        } else if (error instanceof Error) {
          errorMessage = error.message;
          if (error.message.includes('OCR') || error.message.includes('extract')) {
            errorCode = 'OCR_FAILED';
          } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            errorCode = 'NETWORK_ERROR';
          } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
            errorCode = 'CORRUPTED';
          }
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'failed',
                  error: errorMessage,
                  errorCode,
                }
              : f
          )
        );
      }
    }

    const allCompleted = files.every((f) => f.status === 'completed' || f.status === 'failed');
    if (allCompleted) {
      setTimeout(() => {
        onUploadComplete();
      }, 1000);
    }
  };

  const allPending = files.length > 0 && files.every((f) => f.status === 'pending');
  const hasFiles = files.length > 0;
  const isProcessing = files.some((f) => f.status === 'uploading' || f.status === 'processing');

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Upload Itinerary Documents</h2>
            <p className="text-sm text-slate-600 mt-1">
              Upload images or PDFs for automatic data extraction. Word and Excel files must be saved as PDF first.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Best results with PDF and image files (JPG, PNG). Max 50MB per file.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Select Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_TYPES.join(',')}
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {hasFiles && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Files ({files.length})
                </h3>
                {allPending && (
                  <button
                    onClick={processAllFiles}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Process All Files
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {files.map((uploadFile) => {
                  const Icon = getFileIcon(uploadFile.file.type);

                  if (uploadFile.status === 'failed') {
                    const errorInfo = getFileErrorInfo(uploadFile.errorCode || 'UNKNOWN', uploadFile.error);
                    return (
                      <FileUploadError
                        key={uploadFile.id}
                        fileName={uploadFile.file.name}
                        error={errorInfo}
                        onRetry={() => {
                          setFiles((prev) =>
                            prev.map((f) =>
                              f.id === uploadFile.id
                                ? { ...f, status: 'pending', error: undefined, errorCode: undefined }
                                : f
                            )
                          );
                        }}
                        onRemove={() => removeFile(uploadFile.id)}
                      />
                    );
                  }

                  return (
                    <div
                      key={uploadFile.id}
                      className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg"
                    >
                      <Icon className="w-8 h-8 text-slate-600 flex-shrink-0" />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                        {uploadFile.status !== 'pending' && (
                          <div className="mt-2">
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${uploadFile.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {uploadFile.status === 'pending' && (
                          <button
                            onClick={() => removeFile(uploadFile.id)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {uploadFile.status === 'uploading' && (
                          <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                        )}
                        {uploadFile.status === 'processing' && (
                          <Loader className="w-5 h-5 text-amber-600 animate-spin" />
                        )}
                        {uploadFile.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Upload your itinerary documents in any supported format</li>
              <li>Our AI analyzes each document and extracts structured data</li>
              <li>Review and edit the extracted information in a table</li>
              <li>Import the data directly into your trip itinerary</li>
            </ol>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
