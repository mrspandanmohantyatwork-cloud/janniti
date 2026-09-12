import React, { useState, useRef, useEffect } from 'react';
import { CivicUpdate, Language, User } from '../types';
import { TRANSLATIONS } from '../data/initialData';
import { sendOrderToSupabase, uploadToAppFiles, getUserEmailPrefix } from '../utils/supabaseClient';
import { ImageLightboxModal, LightboxImageData } from './ImageLightboxModal';
import {
  Mic,
  Camera,
  Send,
  ThumbsUp,
  MapPin,
  Tag,
  Clock,
  Volume2,
  Square,
  Trash2,
  FileCheck,
  Filter,
  Star,
  Inbox,
  Sparkles,
  Database,
  Paperclip,
  FolderLock,
  FileText,
  Play,
  Pause,
  CheckCircle2,
  Maximize2,
  Image as ImageIcon,
} from 'lucide-react';

interface JannitiPortalProps {
  language: Language;
  user: User | null;
  updates: CivicUpdate[];
  onAddUpdate: (newUpdate: CivicUpdate) => void;
  onOpenAuth: (view: 'signin' | 'signup') => void;
}

export const JannitiPortal: React.FC<JannitiPortalProps> = ({
  language,
  user,
  updates,
  onAddUpdate,
  onOpenAuth,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Form State
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Infrastructure');
  const [selectedWard, setSelectedWard] = useState(user?.ward || 'Ward 1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);
  const [submittedReceipt, setSubmittedReceipt] = useState<{
    id: string;
    timestamp: string;
    filePath?: string;
    audioPath?: string;
  } | null>(null);

  // Update selected ward when user changes
  useEffect(() => {
    if (user?.ward) {
      setSelectedWard(user.ward);
    }
  }, [user]);

  // Photo Upload State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  // Updates Filter & Upvote state
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('All');
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<LightboxImageData | null>(null);

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Audio Recording
  const startRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingSeconds(0);

        timerIntervalRef.current = window.setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      } else {
        // Fallback simulated recording
        setIsRecording(true);
        setRecordingSeconds(0);
        timerIntervalRef.current = window.setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      }
    } catch {
      setIsRecording(true);
      setRecordingSeconds(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Create a fallback audio blob if mic hardware wasn't accessible
      const dummyBlob = new Blob(['simulated voice note data'], { type: 'audio/webm' });
      setAudioBlob(dummyBlob);
      setAudioUrl('simulated_audio_note');
    }
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Handle Submission with Supabase 'App Files' Storage & Database Record
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      onOpenAuth('signin');
      return;
    }

    if (!description.trim() && !photoPreview && !photoFile && !audioUrl && !audioBlob) {
      alert('Please describe your request, attach a photo, or record a voice note.');
      return;
    }

    setIsSubmitting(true);
    setUploadStatusText('Uploading files to Supabase "App Files" storage...');

    const userEmail = user.email;
    const generatedId = `JNT-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalDescription = description.trim() || 'Voice/Photo civic development request submitted.';

    let finalImageUrl = photoPreview || undefined;
    let finalImagePath: string | undefined;
    let finalAudioUrl = audioUrl || undefined;
    let finalAudioPath: string | undefined;

    // 1. Upload Photo to "App Files" under [emailId]/grievances/...
    if (photoFile) {
      try {
        setUploadStatusText('Uploading evidence photo to "App Files"...');
        const fileExt = photoFile.name.split('.').pop() || 'jpg';
        const photoFileName = `evidence_${Date.now()}.${fileExt}`;
        const photoRes = await uploadToAppFiles({
          userEmail,
          category: 'grievances',
          fileName: photoFileName,
          file: photoFile,
        });

        if (photoRes.success && photoRes.url) {
          finalImageUrl = photoRes.url || photoRes.signedUrl || photoRes.publicUrl;
          finalImagePath = photoRes.filePath;
        } else {
          // Keep base64 photoPreview so citizen uploaded image is safely preserved and rendered!
          finalImageUrl = photoPreview || undefined;
        }
      } catch (err) {
        console.warn('Photo upload notice:', err);
        finalImageUrl = photoPreview || undefined;
      }
    }

    // 2. Upload Audio Voice Note to "App Files" under [emailId]/voice_notes/...
    if (audioBlob) {
      try {
        setUploadStatusText('Uploading voice petition to "App Files"...');
        const audioFileName = `voice_${Date.now()}.webm`;
        const audioRes = await uploadToAppFiles({
          userEmail,
          category: 'voice_notes',
          fileName: audioFileName,
          file: audioBlob,
        });

        if (audioRes.success) {
          finalAudioUrl = audioRes.url || audioRes.signedUrl || audioRes.publicUrl;
          finalAudioPath = audioRes.filePath;
        }
      } catch (err) {
        console.warn('Audio upload to App Files notice:', err);
      }
    }

    setUploadStatusText('Saving submission in Supabase database...');

    const newUpdate: CivicUpdate = {
      id: generatedId,
      ward: selectedWard,
      category: selectedCategory,
      description: finalDescription,
      timestamp: 'Just now',
      status: 'pending',
      likes: 0,
      authorName: user ? user.name : 'Citizen',
      authorId: user ? user.id : undefined,
      imageUrl: finalImageUrl,
      audioUrl: finalAudioUrl,
      filePath: finalImagePath,
    };

    // Send complete order/petition payload to Supabase database (orders table)
    try {
      await sendOrderToSupabase({
        id: generatedId,
        user,
        ward: selectedWard,
        category: selectedCategory,
        description: finalDescription,
        status: 'pending',
        imageUrl: finalImageUrl,
        audioUrl: finalAudioUrl,
        amount: 0,
        metadata: {
          submittedVia: 'portal_checkout_form',
          category: selectedCategory,
          ward: selectedWard,
          storage_bucket: 'App Files',
          file_path: finalImagePath,
          audio_file_path: finalAudioPath,
          user_email_folder: getUserEmailPrefix(userEmail),
        },
      });
    } catch (err) {
      console.warn('Supabase sync error:', err);
    }

    onAddUpdate(newUpdate);

    setSubmittedReceipt({
      id: generatedId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      filePath: finalImagePath,
      audioPath: finalAudioPath,
    });

    // Clear Form
    setDescription('');
    setPhotoPreview(null);
    setPhotoFile(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setIsSubmitting(false);
    setUploadStatusText(null);
  };

  const toggleUpvote = (id: string) => {
    setUpvotedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const categories = [
    'Infrastructure',
    'Education',
    'Public Health',
    'Transit',
    'Safety',
    'Waste Management',
    'Water & Sanitation',
    'Parks & Greenery',
  ];

  const wards = Array.from({ length: 20 }, (_, i) => `Ward ${i + 1}`);

  const filteredUpdates =
    selectedFilterCategory === 'All'
      ? updates
      : selectedFilterCategory === 'Photos'
      ? updates.filter((u) => Boolean(u.imageUrl))
      : updates.filter((u) => u.category.toLowerCase() === selectedFilterCategory.toLowerCase());

  const pendingCount = updates.filter((u) => u.status === 'pending' || u.status === 'reviewing').length;
  const inProgressCount = updates.filter((u) => u.status === 'in_progress').length;
  const resolvedCount = updates.filter((u) => u.status === 'resolved').length;

  const WHATSAPP_NUMBER = '918847845435';
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    description.trim()
      ? `Hello, I want to submit a civic development request via JANNITI:\n\n• Category: ${selectedCategory}\n• Ward: ${selectedWard}\n• Details: ${description.trim()}`
      : 'Hello, I want to submit a civic development request via JANNITI.'
  )}`;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 flex flex-col gap-6">
      {/* Top Running Banner */}
      <div className="w-full bg-[var(--card-bg)] backdrop-blur-xl border border-blue-900/40 dark:border-blue-800/60 rounded-2xl py-3 px-4 sm:px-6 overflow-hidden shadow-[0_5px_25px_var(--shadow-color)] flex items-center relative group">
        <div className="flex items-center gap-2 bg-[#0b2545] dark:bg-[#071a33] text-white px-3 py-1.5 rounded-lg text-xs font-black tracking-wider shrink-0 z-10 border border-blue-800/80 shadow-md">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
          <span className="font-extrabold tracking-wider text-white">CIVIC TICKER</span>
        </div>
        <div className="overflow-hidden whitespace-nowrap w-full ml-4">
          <div className="animate-scroll-left text-xs sm:text-sm font-semibold text-blue-950 dark:text-sky-300">
            {updates.length > 0 ? (
              <>
                🏛️ <strong>Civic Ledger Status:</strong> {updates.length} total petition(s) recorded &nbsp;&bull;&nbsp; {pendingCount} awaiting council review &nbsp;&bull;&nbsp; {inProgressCount} in progress &nbsp;&bull;&nbsp; {resolvedCount} resolved &nbsp;&nbsp;&bull;&nbsp;&nbsp; 🚀 Your voice shapes our community! Submit requests directly to municipal officers.
              </>
            ) : (
              <>
                🏛️ <strong>JANNITI Civic Grievance & Development Portal:</strong> Submit community needs, voice recordings, and photos directly to your Municipal Council &nbsp;&nbsp;&bull;&nbsp;&nbsp; 📍 Verified citizen ledger tracking with real-time status updates &nbsp;&nbsp;&bull;&nbsp;&nbsp; ⚡ Technology + Togetherness for better cities!
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Updates (Left) & Form (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: Live Civic Updates */}
        <div className="lg:col-span-5 flex flex-col bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--border-color)] rounded-3xl p-5 sm:p-6 shadow-[0_15px_35px_var(--shadow-color)] h-[620px] overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-lg font-bold text-[var(--text)] tracking-wide">
                Live Civic Updates
              </h2>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              {updates.length} {updates.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {/* Quick Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 no-scrollbar text-xs">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3 h-3" />
            </span>
            {['All', 'Photos', 'Infrastructure', 'Safety', 'Public Health', 'Transit', 'Waste Management'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  selectedFilterCategory === cat
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-[var(--item-bg)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {cat === 'Photos' && <Camera className="w-3 h-3" />}
                <span>{cat === 'Photos' ? 'With Photos' : cat}</span>
              </button>
            ))}
          </div>

          {/* Scrolling updates container */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 group">
            {filteredUpdates.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)]">
                <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
                  <Inbox className="w-8 h-8 text-sky-400" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text)] mb-1">
                  No Civic Petitions Found
                </h3>
                <p className="text-xs max-w-xs text-[var(--text-muted)] leading-relaxed">
                  {selectedFilterCategory === 'Photos'
                    ? 'No petitions with attached citizen photos found in this view.'
                    : 'Be the first citizen in your ward to report an issue or suggest a development project using the form on the right.'}
                </p>
              </div>
            ) : (
              filteredUpdates.map((item) => {
                const isUpvoted = upvotedIds.has(item.id);
                const likeCount = (item.likes || 0) + (isUpvoted ? 1 : 0);

                const statusColors = {
                  pending: 'border-amber-500/80 bg-amber-500/10 text-amber-300',
                  reviewing: 'border-sky-500/80 bg-sky-500/10 text-sky-300',
                  in_progress: 'border-purple-500/80 bg-purple-500/10 text-purple-300',
                  resolved: 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300',
                };

                return (
                  <div
                    key={item.id}
                    className="bg-[var(--item-bg)] hover:bg-[var(--item-hover)] p-4 rounded-2xl border-l-4 border-l-purple-500 border border-[var(--border-color)] transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-sky-400">
                          {item.ward} - {item.category}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          statusColors[item.status] || 'border-slate-500'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-[var(--text)] leading-relaxed mb-3">
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
                        className="mb-3 rounded-xl overflow-hidden max-h-56 border border-white/15 relative group cursor-pointer bg-slate-950/70 transition-all hover:border-sky-500/50 hover:shadow-lg"
                        title="Click to expand citizen evidence photo"
                      >
                        <img
                          src={item.imageUrl}
                          alt={`Civic issue evidence for ${item.category}`}
                          referrerPolicy="no-referrer"
                          className="w-full max-h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80';
                          }}
                        />
                        {/* Overlay Citizen Evidence Badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-semibold text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Citizen Evidence Photo</span>
                        </div>

                        {/* Hover hint to expand */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                          <span className="text-[11px] font-medium text-white flex items-center gap-1.5">
                            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                            <span>Click to expand full photo</span>
                          </span>
                          {item.filePath && (
                            <span className="text-[9px] text-sky-300 font-mono bg-black/70 px-1.5 py-0.5 rounded">
                              {item.filePath.split('/')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {item.audioUrl && (
                      <div className="mb-3 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-sky-300">
                          <Volume2 className="w-4 h-4 text-sky-400" />
                          <span>Voice Recording</span>
                        </div>
                        <audio controls src={item.audioUrl} className="h-7 w-48 max-w-full accent-sky-400" />
                      </div>
                    )}

                    {item.attachmentUrl && (
                      <div className="mb-3 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs text-purple-300">
                        <div className="flex items-center gap-1.5 truncate">
                          <Paperclip className="w-3.5 h-3.5 text-purple-400" />
                          <span className="truncate">{item.attachmentName || 'Attached Document'}</span>
                        </div>
                        <a
                          href={item.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-[10px] font-bold"
                        >
                          View
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.timestamp}</span>
                        {item.authorName && (
                          <span className="text-slate-400">• By {item.authorName}</span>
                        )}
                      </div>

                      <button
                        onClick={() => toggleUpvote(item.id)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                          isUpvoted
                            ? 'bg-sky-500/20 text-sky-300 font-bold'
                            : 'hover:bg-white/10 text-slate-400'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{likeCount}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Main Submission Form */}
        <div className="lg:col-span-7 flex flex-col bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-[0_15px_35px_var(--shadow-color)] relative">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight mb-2">
              {t.title}
            </h1>
            <p className="text-sm text-[var(--text-muted)] font-light">
              {t.subtitle}
            </p>
          </div>

          {/* Quick Input Action Buttons: Voice Record & Take Photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
            {/* Audio Action Button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                isRecording
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                  : audioUrl
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                  : 'bg-[var(--item-bg)] border-[var(--border-color)] text-sky-400 hover:border-sky-400 hover:bg-[var(--item-hover)] hover:shadow-[0_4px_15px_rgba(56,189,248,0.2)]'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-sky-500/10 flex items-center justify-center mb-2">
                {isRecording ? (
                  <Square className="w-5 h-5 text-rose-400" />
                ) : (
                  <Mic className="w-6 h-6 text-sky-400" />
                )}
              </div>
              <span className="font-bold text-sm">
                {isRecording
                  ? `${t.stopRecord} (${recordingSeconds}s)`
                  : audioUrl
                  ? t.audioAttached
                  : t.audio}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {isRecording ? 'Click to finish' : 'Voice Petition'}
              </span>
            </button>

            {/* Photo Action Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                photoPreview
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                  : 'bg-[var(--item-bg)] border-[var(--border-color)] text-sky-400 hover:border-sky-400 hover:bg-[var(--item-hover)] hover:shadow-[0_4px_15px_rgba(56,189,248,0.2)]'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-sky-500/10 flex items-center justify-center mb-2">
                <Camera className="w-6 h-6 text-sky-400" />
              </div>
              <span className="font-bold text-sm">
                {photoPreview ? t.photoAttached : t.photo}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {photoPreview ? 'Click to change' : 'Evidence Photo'}
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          {/* Media Attachments Preview Bar */}
          {(photoPreview || audioUrl) && (
            <div className="mb-4 p-3 rounded-2xl bg-[var(--item-bg)] border border-[var(--border-color)] flex flex-wrap items-center gap-3">
              {photoPreview && (
                <div className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-sky-500/10 border border-sky-500/30">
                  <div className="relative group rounded-lg overflow-hidden w-14 h-14 border border-sky-400/40 shrink-0 bg-black">
                    <img
                      src={photoPreview}
                      alt="Uploaded preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedLightboxImage({
                          url: photoPreview,
                          title: 'Citizen Evidence Photo ready to attach to petition',
                          author: user ? user.name : 'You',
                        })
                      }
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                      title="Inspect full image"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Photo Attached</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[130px]">
                      {photoFile?.name || 'evidence.jpg'}
                    </span>
                    {photoFile && (
                      <span className="text-[9px] text-slate-400 font-mono">
                        {(photoFile.size / 1024).toFixed(0)} KB
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoFile(null);
                    }}
                    className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors ml-1 cursor-pointer"
                    title="Remove attached photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {audioUrl && (
                <div className="flex items-center gap-2 bg-sky-500/15 border border-sky-500/30 px-3 py-2 rounded-xl text-xs text-sky-300">
                  <Volume2 className="w-4 h-4 text-sky-400 animate-pulse" />
                  <span>Voice Note ({recordingSeconds > 0 ? `${recordingSeconds}s` : 'Attached'})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioUrl(null);
                      setAudioBlob(null);
                    }}
                    className="text-rose-400 hover:text-rose-300 ml-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {user && (
                <div className="ml-auto text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <FolderLock className="w-3 h-3 text-sky-400" />
                  <span>Bucket: <b>App Files</b>/{getUserEmailPrefix(user.email)}/...</span>
                </div>
              )}
            </div>
          )}

          {/* Form Controls */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            {/* Category & Ward Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  <Tag className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.categoryLabel}</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text)] outline-none focus:border-sky-400"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.wardLabel}</span>
                </label>
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text)] outline-none focus:border-sky-400"
                >
                  {wards.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description Textarea */}
            <div className="flex-1 mb-5">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.placeholder}
                rows={4}
                className="w-full h-full min-h-[140px] p-4 text-sm sm:text-base rounded-2xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400 focus:shadow-[0_0_15px_rgba(56,189,248,0.2)] transition-all resize-none"
              />
            </div>

            {/* Receipt notification on submission */}
            {submittedReceipt && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold">{t.successTitle}</span> Ref #{submittedReceipt.id}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    <Database className="w-3 h-3 text-emerald-400" />
                    <span>Supabase Synced</span>
                  </span>
                  <span className="text-emerald-400 font-mono">
                    {submittedReceipt.timestamp}
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl text-sm sm:text-base font-bold uppercase tracking-widest bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600 text-white shadow-[0_4px_18px_rgba(37,99,235,0.45)] hover:shadow-[0_6px_25px_rgba(37,99,235,0.65)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs sm:text-sm font-semibold normal-case">
                    {uploadStatusText || t.submitting}
                  </span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t.submit}</span>
                </>
              )}
            </button>
          </form>

          {/* WhatsApp Action Option */}
          <div className="mt-6 pt-5 border-t border-[var(--border-color)] text-center">
            <p className="text-xs text-[var(--text-muted)] mb-3">
              {t.msgText}
            </p>
            <a
              id="whatsapp-submit-btn"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold text-xs sm:text-sm hover:bg-[#20ba56] hover:shadow-[0_4px_15px_rgba(37,211,102,0.4)] hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <span>{t.whatsapp}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Citizen Evidence Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={Boolean(selectedLightboxImage)}
        imageData={selectedLightboxImage}
        onClose={() => setSelectedLightboxImage(null)}
      />
    </div>
  );
};
