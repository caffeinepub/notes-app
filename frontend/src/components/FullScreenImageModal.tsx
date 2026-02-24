import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface FullScreenImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export default function FullScreenImageModal({ imageUrl, onClose }: FullScreenImageModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };

    // Add listener in capture phase to intercept before Dialog receives it
    document.addEventListener('keydown', handleEscape, true);

    return () => {
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the backdrop itself was clicked, not a child element
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const handleCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    // Prevent clicks on the image from bubbling to backdrop
    e.stopPropagation();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-background/98 backdrop-blur-md flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onPointerDown={(e) => {
        // Capture pointer events to prevent click-through
        if (e.target === e.currentTarget) {
          e.stopPropagation();
        }
      }}
      style={{ pointerEvents: 'auto' }}
    >
      <button
        type="button"
        onClick={handleCloseClick}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 p-2 rounded-full bg-card hover:bg-accent transition-colors z-[201]"
        aria-label="Close fullscreen image"
      >
        <X className="h-6 w-6" />
      </button>

      <img
        src={imageUrl}
        alt="Full screen view"
        className="max-w-full max-h-full object-contain"
        onClick={handleImageClick}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
