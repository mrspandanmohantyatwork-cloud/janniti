import React, { useState } from 'react';
import { CivicUpdate, User } from '../types';
import { ImageLightboxModal, LightboxImageData } from './ImageLightboxModal';
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Search,
  Volume2,
  Paperclip,
  FolderLock,
  Maximize2,
  Camera,
} from 'lucide-react';

interface SubmissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  updates: CivicUpdate[];
  user: User | null;
  initialFilter?: 'all' | 'resolved';
}

export const SubmissionsDrawer: React.FC<SubmissionsDrawerProps> = ({
  isOpen,
  onClose,
  updates,
  user,
  initialFilter = 'all',
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved' | 'photos'>(
    initialFilter === 'resolved' ? 'resolved' : 'all'
  );
  const [search, setSearch] = useState('');
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<LightboxImageData | null>(null);

  if (!isOpen) return null;

  const filtered = updates.filter((u) => {
    if (filter === 'photos' && !u.imageUrl) return false;
    if (filter !== 'all' && filter !== 'photos' && u.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.description.toLowerCase().includes(q) ||
        u.ward.toLowerCase().includes(q) ||
        u.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: CivicUpdate['status']) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <RefreshCw className="w-3 h-3 animate-spin" /> In Progress
          </span>
        );
      case 'reviewing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Clock className="w-3 h-3" /> Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" /> Pending Council
          </span>
        );
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div className="relative w-full max-w-2xl bg-[var(--card-bg)] backdrop-blur-2xl border border-[var(--border-color)] rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">
                {user ? `${user.name}'s Civic Submissions` : 'Community Submissions Ledger'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Track status and timeline of municipal requests
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--item-bg)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Ward, category or keyword..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text)] outline-none focus:border-sky-400"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs bg-[var(--item-bg)] p-1 rounded-xl border border-[var(--border-color)] overflow-x-auto">
            {(['all', 'photos', 'pending', 'in_progress', 'resolved'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  filter === key
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {key === 'photos' && <Camera className="w-3 h-3" />}
                <span>{key === 'photos' ? 'Photos' : key.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)] text-xs">
              {filter === 'photos'
                ? 'No civic submissions with attached citizen photos found.'
                : 'No matching civic submissions found.'}
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[var(--item-bg)] border border-[var(--border-color)] hover:border-sky-400/40 transition-all flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-sky-400 font-mono">
                      #{item.id}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text)]">
                      {item.ward} &bull; {item.category}
                    </span>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <p className="text-xs sm:text-sm text-blue-800/90 dark:text-slate-300 leading-relaxed">
                  {item.description}
                </p>

                {item.imageUrl && (
                  <div
                    onClick={() =>
                      setSelectedLightboxImage({
                        url: item.imageUrl!,
                        title: item.description,
                        ward: item.ward,
                        category: item.category,
                        author: item.authorName,
                        id: item.id,
                        status: item.status,
                        timestamp: item.timestamp,
                      })
                    }
                    className="relative group w-full h-48 sm:h-56 rounded-xl overflow-hidden border border-white/15 mt-1 cursor-pointer bg-slate-950 transition-all hover:border-sky-400/50 hover:shadow-lg"
                    title="Click to view full photo evidence"
                  >
                    <img
                      src={item.imageUrl}
                      alt="Attached Citizen Evidence"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] font-semibold text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Citizen Evidence Photo</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                      <span className="text-xs font-medium text-white flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Tap to view full resolution</span>
                      </span>
                      {item.filePath && (
                        <span className="bg-black/70 text-[9px] text-sky-300 font-mono px-1.5 py-0.5 rounded">
                          {item.filePath.split('/')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {item.audioUrl && (
                  <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-sky-300">
                      <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-[11px] font-medium">Voice Note</span>
                    </div>
                    <audio controls src={item.audioUrl} className="h-6 w-40 accent-sky-400" />
                  </div>
                )}

                {item.attachmentUrl && (
                  <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs text-purple-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <Paperclip className="w-3.5 h-3.5 text-purple-400" />
                      <span className="truncate text-[11px]">{item.attachmentName || 'Attached Document'}</span>
                    </div>
                    <a
                      href={item.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-[10px] font-bold"
                    >
                      Open
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-2 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Submitted {item.timestamp}
                  </span>
                  <span>Citizen ID: {item.authorName || 'Verified Citizen'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Citizen Evidence Lightbox */}
      <ImageLightboxModal
        isOpen={Boolean(selectedLightboxImage)}
        imageData={selectedLightboxImage}
        onClose={() => setSelectedLightboxImage(null)}
      />
    </div>
  );
};
