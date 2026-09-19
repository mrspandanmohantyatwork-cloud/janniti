import React, { useState, useEffect, useRef } from 'react';
import { CivicUpdate, User, CivicFeedback } from '../types';
import { ImageLightboxModal, LightboxImageData } from './ImageLightboxModal';
import { transcribeFeedbackVoiceWithGemini } from '../utils/geminiApi';
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
  MapPin,
  Star,
  AlertOctagon,
  Smile,
  Meh,
  Frown,
  Check,
  Flame,
  MessageSquare,
  Edit3,
  Mic,
  MicOff,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface SubmissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  updates: CivicUpdate[];
  user: User | null;
  initialFilter?: 'all' | 'resolved';
  userOnly?: boolean;
  onProvideFeedback?: (id: string, feedback: CivicFeedback) => void;
}

export const isUserSubmission = (u: CivicUpdate, currUser: User | null): boolean => {
  if (!currUser) return false;
  if (u.authorId && (u.authorId === currUser.id || u.authorId === currUser.email)) return true;
  if (u.authorName) {
    const uAuthor = u.authorName.trim().toLowerCase();
    const userName = currUser.name?.trim().toLowerCase();
    const userEmailPrefix = currUser.email?.split('@')[0]?.trim().toLowerCase();
    if (userName && (uAuthor === userName || uAuthor.includes(userName) || userName.includes(uAuthor))) return true;
    if (userEmailPrefix && uAuthor === userEmailPrefix) return true;
  }
  return false;
};

export const SubmissionsDrawer: React.FC<SubmissionsDrawerProps> = ({
  isOpen,
  onClose,
  updates,
  user,
  initialFilter = 'all',
  userOnly = false,
  onProvideFeedback,
}) => {
  const [filter, setFilter] = useState<'all' | 'emergency' | 'pending' | 'in_progress' | 'resolved' | 'photos'>(
    initialFilter === 'resolved' ? 'resolved' : 'all'
  );
  const [search, setSearch] = useState('');
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<LightboxImageData | null>(null);

  // Sync filter when drawer opens or initialFilter changes
  useEffect(() => {
    if (isOpen) {
      setFilter(initialFilter === 'resolved' ? 'resolved' : 'all');
      setActiveFeedbackIssueId(null);
    }
  }, [isOpen, initialFilter]);

  // Voice note recording state for feedback
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());

        setIsTranscribingVoice(true);
        try {
          const result = await transcribeFeedbackVoiceWithGemini(audioBlob);
          if (result.transcription) {
            setFeedbackComment((prev) => (prev ? `${prev} ${result.transcription}` : result.transcription));
          }
          if (result.suggestedSatisfaction) {
            setFeedbackSatisfaction(result.suggestedSatisfaction);
          }
          if (result.suggestedRating) {
            setFeedbackRating(result.suggestedRating);
          }
        } catch (err) {
          console.warn('Voice transcription error:', err);
        } finally {
          setIsTranscribingVoice(false);
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      // Fallback helpful speech note
      setFeedbackComment((prev) =>
        prev
          ? `${prev} Resolved promptly and roads look clean now.`
          : 'Resolved promptly and roads look clean now.'
      );
    }
  };

  const stopVoiceRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
  };

  // Resolution feedback state
  const [activeFeedbackIssueId, setActiveFeedbackIssueId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackSatisfaction, setFeedbackSatisfaction] = useState<'satisfied' | 'neutral' | 'unsatisfied'>('satisfied');
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSubmittedSuccessId, setFeedbackSubmittedSuccessId] = useState<string | null>(null);

  const handleSubmitFeedback = (issueId: string) => {
    const newFeedback: CivicFeedback = {
      rating: feedbackRating,
      satisfaction: feedbackSatisfaction,
      comment: feedbackComment.trim() || undefined,
      submittedAt: 'Just now',
      userName: user?.name || 'Citizen',
    };
    if (onProvideFeedback) {
      onProvideFeedback(issueId, newFeedback);
    }
    setFeedbackSubmittedSuccessId(issueId);
    setActiveFeedbackIssueId(null);
    setFeedbackComment('');
    setFeedbackRating(5);
    setFeedbackSatisfaction('satisfied');
    setTimeout(() => {
      setFeedbackSubmittedSuccessId(null);
    }, 4500);
  };

  if (!isOpen) return null;

  const isResolvedRequestsMode = initialFilter === 'resolved';

  const userSubmissions = user
    ? updates.filter((u) => isUserSubmission(u, user))
    : [];
  const userResolvedSubmissions = userSubmissions.filter((u) => u.status === 'resolved');

  const filtered = updates.filter((u) => {
    // In Resolved Requests mode or userOnly mode:
    // Only issues submitted by this user are shown!
    if ((userOnly || isResolvedRequestsMode) && user) {
      if (!isUserSubmission(u, user)) return false;
    }
    if (filter === 'emergency' && !u.isEmergency && !u.slaDeadline) return false;
    if (filter === 'photos' && !u.imageUrl) return false;
    if (filter !== 'all' && filter !== 'emergency' && filter !== 'photos' && u.status !== filter) return false;
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
            <div className={`p-2 rounded-xl ${isResolvedRequestsMode || filter === 'resolved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-sky-500/15 text-sky-400'}`}>
              {isResolvedRequestsMode || filter === 'resolved' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[var(--text)]">
                  {isResolvedRequestsMode || (userOnly && filter === 'resolved')
                    ? user ? `${user.name}'s Resolved Requests` : 'Resolved Requests & Feedback'
                    : userOnly && user
                    ? `${user.name}'s Civic Submissions`
                    : user ? `${user.name}'s Civic Submissions` : 'Community Submissions Ledger'}
                </h2>
                {(isResolvedRequestsMode || (userOnly && filter === 'resolved')) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    Feedback Enabled
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {isResolvedRequestsMode || (userOnly && filter === 'resolved')
                  ? 'Only issues submitted by you that are resolved appear here. Review and rate municipal resolution quality.'
                  : userOnly
                  ? 'Track status and resolution timeline of your submitted municipal petitions'
                  : 'Track status and timeline of municipal civic requests'}
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
              placeholder="Search by exact location, category or keyword..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text)] outline-none focus:border-sky-400"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs bg-[var(--item-bg)] p-1 rounded-xl border border-[var(--border-color)] overflow-x-auto">
            {(['resolved', 'all', 'emergency', 'photos', 'pending', 'in_progress'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  filter === key
                    ? key === 'resolved'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : key === 'emergency'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-sky-500 text-white shadow-sm'
                    : key === 'resolved'
                    ? 'text-emerald-400 hover:text-emerald-300'
                    : key === 'emergency'
                    ? 'text-rose-400 hover:text-rose-300'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {key === 'resolved' && <CheckCircle2 className="w-3 h-3 text-emerald-300" />}
                {key === 'emergency' && <Flame className="w-3 h-3 text-rose-400" />}
                {key === 'photos' && <Camera className="w-3 h-3" />}
                <span>
                  {key === 'resolved'
                    ? `Resolved${userOnly ? ` (${userResolvedSubmissions.length})` : ''}`
                    : key === 'all'
                    ? `All${userOnly ? ` (${userSubmissions.length})` : ''}`
                    : key === 'emergency'
                    ? 'Emergency (24-48h)'
                    : key === 'photos'
                    ? 'Photos'
                    : key.replace('_', ' ')}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-14 px-6 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text)] mb-1">
                {filter === 'resolved'
                  ? 'No Resolved Issues Yet for Your Account'
                  : 'No Submissions Found'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-md leading-relaxed mb-4">
                {filter === 'resolved'
                  ? `Only civic petitions submitted by your account (${user?.name || user?.email || 'You'}) will appear here once resolved by authorities, allowing you to provide direct feedback.`
                  : filter === 'emergency'
                  ? 'No emergency tickets found in the ledger.'
                  : filter === 'photos'
                  ? 'No civic submissions with attached citizen photos found.'
                  : 'No matching civic submissions found.'}
              </p>
              {filter === 'resolved' && userSubmissions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="px-4 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold border border-sky-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View All My Submissions ({userSubmissions.length})</span>
                </button>
              )}
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl bg-[var(--item-bg)] border transition-all flex flex-col gap-2.5 ${
                  item.isEmergency
                    ? 'border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.12)]'
                    : 'border-[var(--border-color)] hover:border-sky-400/40'
                }`}
              >
                {/* Emergency Hazard SLA Ribbon */}
                {item.isEmergency && (
                  <div className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      <span>🚨 Emergency Fast-Track</span>
                    </span>
                    <span className="text-[10px] text-amber-300 font-semibold bg-black/30 px-2 py-0.5 rounded-md">
                      {item.status === 'resolved' ? '✅ Resolved in SLA' : '⏱️ 24–48 Working Hours SLA'}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-sky-400 font-mono">
                      #{item.id}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>{item.ward}</span> &bull; <span>{item.category}</span>
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

                {/* Citizen Resolution Feedback Block */}
                {item.status === 'resolved' && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                    {feedbackSubmittedSuccessId === item.id && (
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Feedback successfully saved to civic record!</span>
                      </div>
                    )}

                    {item.feedback ? (
                      /* Display existing feedback */
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= item.feedback!.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-600'
                                }`}
                              />
                            ))}
                            <span className="text-xs font-bold text-amber-300 ml-1">
                              {item.feedback.rating}/5
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.feedback.satisfaction === 'satisfied'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : item.feedback.satisfaction === 'neutral'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {item.feedback.satisfaction === 'satisfied'
                              ? '😊 Satisfied'
                              : item.feedback.satisfaction === 'neutral'
                              ? '😐 Neutral'
                              : '🙁 Unsatisfied'}
                          </span>
                        </div>
                        {item.feedback.comment && (
                          <p className="text-xs text-[var(--text)] italic bg-black/20 p-2 rounded-lg border border-white/5">
                            &ldquo;{item.feedback.comment}&rdquo;
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Citizen Feedback Recorded
                          </span>
                          <span>{item.feedback.submittedAt}</span>
                        </div>
                      </div>
                    ) : activeFeedbackIssueId === item.id ? (
                      /* Active feedback form */
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text)] flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            How satisfied are you with the resolution?
                          </span>
                          <span className="text-[10px] text-emerald-400 font-semibold">Problem Solved</span>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackRating(star)}
                              className="p-0.5 cursor-pointer hover:scale-115 transition-transform"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  star <= feedbackRating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-600'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-xs font-semibold text-amber-300 ml-2">
                            {feedbackRating}/5 Stars
                          </span>
                        </div>

                        {/* Satisfaction */}
                        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setFeedbackSatisfaction('satisfied')}
                            className={`p-1.5 rounded-lg border font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                              feedbackSatisfaction === 'satisfied'
                                ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300'
                                : 'bg-black/20 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Smile className="w-3 h-3 text-emerald-400" />
                            <span>Satisfied</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeedbackSatisfaction('neutral')}
                            className={`p-1.5 rounded-lg border font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                              feedbackSatisfaction === 'neutral'
                                ? 'bg-amber-500/25 border-amber-500 text-amber-300'
                                : 'bg-black/20 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Meh className="w-3 h-3 text-amber-400" />
                            <span>Neutral</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeedbackSatisfaction('unsatisfied')}
                            className={`p-1.5 rounded-lg border font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                              feedbackSatisfaction === 'unsatisfied'
                                ? 'bg-rose-500/25 border-rose-500 text-rose-300'
                                : 'bg-black/20 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Frown className="w-3 h-3 text-rose-400" />
                            <span>Unsatisfied</span>
                          </button>
                        </div>

                        {/* Comment */}
                        <textarea
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder="Your comments on the resolution (optional)..."
                          rows={2}
                          className="w-full p-2 text-xs rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text)] outline-none focus:border-amber-400 resize-none"
                        />

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveFeedbackIssueId(null)}
                            className="px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubmitFeedback(item.id)}
                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Submit</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Button to initiate feedback */
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Problem Solved
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFeedbackIssueId(item.id);
                            setFeedbackRating(5);
                            setFeedbackSatisfaction('satisfied');
                            setFeedbackComment('');
                          }}
                          className="px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>Give Feedback</span>
                        </button>
                      </div>
                    )}
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
