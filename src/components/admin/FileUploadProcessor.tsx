import { useState } from 'react';
import { Upload, FileText, Image, File, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FileUploadProcessorProps {
  journeyId: string;
  onComplete: () => void;
  onClose: () => void;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
  progress: number;
}

export function FileUploadProcessor({ journeyId, onComplete, onClose }: FileUploadProcessorProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const acceptedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
  ];

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = async (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter((file) =>
      acceptedTypes.includes(file.type)
    );

    if (validFiles.length === 0) {
      alert('Please select valid file types (images, PDFs, Word, Excel, or text files)');
      return;
    }

    const newFiles: UploadedFile[] = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'uploading',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    for (let i = 0; i < validFiles.length; i++) {
      await uploadAndProcessFile(validFiles[i], newFiles[i].id);
    }
  };

  const uploadAndProcessFile = async (file: File, fileId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${journeyId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, progress: 30 } : f
        )
      );

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('itinerary-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, progress: 50 } : f
        )
      );

      const { data: fileData, error: insertError } = await supabase
        .from('uploaded_files')
        .insert({
          trip_id: journeyId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: uploadData.path,
          processing_status: 'pending',
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: 'processing', progress: 60 } : f
        )
      );

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-uploaded-file`;
      const { data: { session } } = await supabase.auth.getSession();

      const processResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileData.id,
          journeyId,
          openaiApiKey: openaiKey || undefined,
        }),
      });

      if (!processResponse.ok) {
        throw new Error('Failed to process file');
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: 'completed', progress: 100 } : f
        )
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      );
    }
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const allCompleted = files.length > 0 && files.every((f) => f.status === 'completed');

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Upload Itinerary Files</h2>
            <p className="text-sm text-slate-600 mt-1">
              Upload images, PDFs, Word, Excel, or text files to extract itinerary data
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!showKeyInput && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                For best results with AI-powered data extraction, you can optionally provide an OpenAI API key.
                <button
                  onClick={() => setShowKeyInput(true)}
                  className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add API Key
                </button>
              </p>
            </div>
          )}

          {showKeyInput && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                OpenAI API Key (Optional)
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500">
                Your API key is only used for this session and is not stored.
              </p>
            </div>
          )}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Supports: JPG, PNG, PDF, Word, Excel, and text files
            </p>
            <input
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
            >
              Select Files
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700">Uploaded Files</h3>
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div className="text-slate-600">{getFileIcon(file.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            file.status === 'failed'
                              ? 'bg-red-500'
                              : file.status === 'completed'
                              ? 'bg-green-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {file.status === 'uploading' && 'Uploading...'}
                        {file.status === 'processing' && 'Processing...'}
                        {file.status === 'completed' && 'Completed'}
                        {file.status === 'failed' && 'Failed'}
                      </span>
                    </div>
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>
                  <div>{getStatusIcon(file.status)}</div>
                  {(file.status === 'completed' || file.status === 'failed') && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-6 flex items-center justify-between bg-slate-50">
          <p className="text-sm text-slate-600">
            {files.length > 0
              ? `${files.filter((f) => f.status === 'completed').length} of ${files.length} files processed`
              : 'No files uploaded yet'}
          </p>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {allCompleted && (
              <button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Review Extracted Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
