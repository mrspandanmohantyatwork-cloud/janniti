import React, { useEffect } from 'react';
import { X, ExternalLink, MapPin, Tag, User, Maximize2 } from 'lucide-react';

export interface LightboxImageData {
  url: string;
  title: string;
  ward?: string;
  category?: string;
  author?: string;
  id?: string;
  status?: string;
  timestamp?: string;
}

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageData: LightboxImageData | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  imageData,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageData) return null;

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    reviewing: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    in_progress: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };

  const currentStatusStyle = imageData.status
    ? statusColors[imageData.status] || 'bg-slate-500/20 text-slate-300 border-slate-500/40'
    : '';

  return (
    <div
      id="citizen-image-lightbox-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-[11px] font-semibold text-sky-300 flex items-center gap-1 shrink-0">
              <Maximize2 className="w-3 h-3" />
              <span>Citizen Evidence Photo</span>
            </div>
            {imageData.id && (
              <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
                #{imageData.id}
              </span>
            )}
            {imageData.status && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${currentStatusStyle}`}
              >
                {imageData.status.replace('_', ' ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {imageData.url && (
              <a
                href={imageData.url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Open original image in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              id="close-lightbox-button"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Photo Container */}
        <div className="relative flex-1 bg-black/95 flex items-center justify-center overflow-hidden min-h-[300px] max-h-[65vh] p-2">
          <img
            id="lightbox-main-image"
            src={imageData.url}
            alt={imageData.title || 'Citizen uploaded civic evidence'}
            referrerPolicy="no-referrer"
            className="max-h-[62vh] max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>

        {/* Metadata Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            {imageData.author && (
              <div className="flex items-center gap-1 text-slate-200 font-medium">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>Submitted by: <strong>{imageData.author}</strong></span>
              </div>
            )}
            {imageData.ward && (
              <div className="flex items-center gap-1 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{imageData.ward}</span>
              </div>
            )}
            {imageData.category && (
              <div className="flex items-center gap-1 text-slate-400">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>{imageData.category}</span>
              </div>
            )}
            {imageData.timestamp && (
              <span className="text-slate-500 text-[11px] ml-auto">
                {imageData.timestamp}
              </span>
            )}
          </div>

          <p className="text-sm text-slate-100 font-medium leading-relaxed">
            &ldquo;{imageData.title}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
};
