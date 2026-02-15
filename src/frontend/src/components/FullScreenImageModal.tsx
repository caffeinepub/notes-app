import { X } from 'lucide-react';

interface FullScreenImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export default function FullScreenImageModal({ imageUrl, onClose }: FullScreenImageModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-card hover:bg-accent transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      <img
        src={imageUrl}
        alt="Full screen view"
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
