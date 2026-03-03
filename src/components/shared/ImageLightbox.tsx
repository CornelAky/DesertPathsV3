import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';

interface ImageLightboxProps {
  images: Array<{ file_url: string; file_name?: string }>;
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImageLightbox({ images, currentIndex, onClose, onNavigate }: ImageLightboxProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [currentIndex, images.length, onClose, onNavigate]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors z-10"
        title="Close (Esc)"
      >
        <X className="w-6 h-6" />
      </button>

      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(currentIndex - 1);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors z-10"
              title="Previous (←)"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {currentIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(currentIndex + 1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors z-10"
              title="Next (→)"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </>
      )}

      <div
        className="relative max-w-7xl max-h-[90vh] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.file_url}
          alt={currentImage.file_name || `Image ${currentIndex + 1}`}
          className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
        />

        {currentImage.file_name && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white px-4 py-3 rounded-b-lg">
            <p className="text-sm truncate">{currentImage.file_name}</p>
          </div>
        )}

        {images.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
