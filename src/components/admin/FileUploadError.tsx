import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

export interface FileError {
  code: string;
  message: string;
  suggestion?: string;
}

interface FileUploadErrorProps {
  fileName: string;
  error: FileError;
  onRetry?: () => void;
  onRemove?: () => void;
}

export function FileUploadError({ fileName, error, onRetry, onRemove }: FileUploadErrorProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getErrorTitle = (code: string): string => {
    switch (code) {
      case 'UNSUPPORTED_FORMAT':
        return 'File format not supported';
      case 'OCR_FAILED':
        return 'Could not read file content';
      case 'OCR_PARTIAL':
        return 'File partially processed';
      case 'CORRUPTED':
        return 'File appears corrupted';
      case 'MAPPING_FAILED':
        return 'Could not map data';
      case 'TOO_LARGE':
        return 'File too large';
      case 'NETWORK_ERROR':
        return 'Upload failed';
      default:
        return 'Upload error';
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-amber-600 hover:text-amber-700 transition-colors"
          title="Click for details"
        >
          <AlertTriangle className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-amber-900 text-sm">{getErrorTitle(error.code)}</h4>
              <p className="text-xs text-amber-700 mt-0.5 truncate" title={fileName}>
                {fileName}
              </p>
            </div>
            {onRemove && (
              <button
                onClick={onRemove}
                className="text-amber-600 hover:text-amber-800 transition-colors"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showDetails && (
            <div className="mt-3 space-y-2">
              <div className="bg-white rounded p-3 border border-amber-200">
                <p className="text-sm text-slate-700 font-medium mb-1">What happened:</p>
                <p className="text-sm text-slate-600">{error.message}</p>
              </div>

              {error.suggestion && (
                <div className="bg-white rounded p-3 border border-amber-200">
                  <p className="text-sm text-slate-700 font-medium mb-1">What you can do:</p>
                  <p className="text-sm text-slate-600">{error.suggestion}</p>
                </div>
              )}

              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-sm font-medium text-amber-700 hover:text-amber-800 underline"
                >
                  Try uploading again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function getFileErrorInfo(errorCode: string, errorMessage?: string): FileError {
  // Check for specific error messages that need custom handling
  if (errorMessage?.includes('converted to PDF first') || errorMessage?.includes('Word and Excel')) {
    return {
      code: 'UNSUPPORTED_FORMAT',
      message: 'Word and Excel files must be converted to PDF format before uploading.',
      suggestion: 'Open your document in Word/Excel, choose "Save As" or "Export", and select PDF format. Then upload the PDF file.',
    };
  }

  switch (errorCode) {
    case 'UNSUPPORTED_FORMAT':
      return {
        code: errorCode,
        message: errorMessage || 'This file format is not supported for OCR processing.',
        suggestion: 'Please use PDF or image files (JPG, PNG). If you have a Word or Excel file, save it as PDF first.',
      };
    case 'OCR_FAILED':
      return {
        code: errorCode,
        message: errorMessage || 'Could not extract itinerary data from this file.',
        suggestion: 'Make sure the file contains structured itinerary information. You can also manually enter the data instead.',
      };
    case 'OCR_PARTIAL':
      return {
        code: errorCode,
        message: 'The file was processed but some information could not be extracted automatically.',
        suggestion: 'Review the extracted data in the next step and manually add any missing information.',
      };
    case 'CORRUPTED':
      return {
        code: errorCode,
        message: errorMessage || 'The file appears to be damaged, empty, or cannot be read.',
        suggestion: 'Try opening the file on your computer first to verify it works. Then re-upload it, or use a different copy.',
      };
    case 'MAPPING_FAILED':
      return {
        code: errorCode,
        message: 'The file was read but the data structure does not match our expected format.',
        suggestion: 'Ensure your file contains itinerary information like dates, times, activities, and locations.',
      };
    case 'TOO_LARGE':
      return {
        code: errorCode,
        message: 'This file exceeds the maximum size limit of 50MB.',
        suggestion: 'Try compressing images in the document, reducing page count, or splitting into multiple files.',
      };
    case 'NETWORK_ERROR':
      return {
        code: errorCode,
        message: 'Upload failed due to a connection problem.',
        suggestion: 'Check your internet connection and try again. If the problem persists, try a smaller file or refresh the page.',
      };
    case 'UPLOAD_FAILED':
      return {
        code: errorCode,
        message: errorMessage || 'File upload to storage failed.',
        suggestion: 'Try uploading again. If the problem continues, check your file permissions or try a different file.',
      };
    default:
      return {
        code: 'UNKNOWN',
        message: errorMessage || 'An unexpected error occurred while processing this file.',
        suggestion: 'Try uploading the file again. If the problem continues, contact support with the file name and type.',
      };
  }
}
