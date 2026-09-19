import React, { useState } from 'react';
import { TEAM_MEMBERS } from '../data/initialData';
import { CivicLogo } from './CivicLogo';
import {
  Mail,
  Phone,
  Check,
  Copy,
  Sparkles,
  Shield,
  Code,
  Database,
  Presentation,
} from 'lucide-react';

interface TeamSectionProps {
  onBackToPortal?: () => void;
}

const MEMBER_FILE_MAP: Record<string, string> = {
  'ankit-sharma': 'backend.jpeg',
  'ayushman-pati': 'frontend.jpeg',
  'spandan-mohanty': 'database.jpeg',
  'subhalaxmi-swain': 'PPT1.jpeg',
  'sneha-sinha': 'PPT2.jpeg',
};

const TeamMemberAvatar: React.FC<{ member: typeof TEAM_MEMBERS[0] }> = ({ member }) => {
  const [imgSrcIndex, setImgSrcIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  const baseFileName = MEMBER_FILE_MAP[member.id] || `${member.id}.jpeg`;
  const nameWithoutExt = baseFileName.replace(/\.[^/.]+$/, '');

  // Comprehensive array of Supabase Storage URL variations covering JANNITI Storage and janniti-storage
  const buckets = ['JANNITI%20Storage', 'janniti-storage', 'Janniti%20Storage', 'JANNITI_Storage', 'janniti_storage'];
  const nameVariations = [
    baseFileName,
    baseFileName.toLowerCase(),
    baseFileName.toUpperCase(),
    `${nameWithoutExt}.jpg`,
    `${nameWithoutExt.toLowerCase()}.jpg`,
    `${nameWithoutExt.toUpperCase()}.JPG`,
    `${nameWithoutExt}.jpeg`,
    `${nameWithoutExt.toLowerCase()}.jpeg`,
    `${nameWithoutExt.toUpperCase()}.JPEG`,
    `${nameWithoutExt}.png`,
    `${nameWithoutExt.toLowerCase()}.png`,
    `${nameWithoutExt.toUpperCase()}.PNG`,
    `${nameWithoutExt}.webp`,
    `${member.id}.jpg`,
    `${member.id}.jpeg`,
    `${member.id}.png`,
  ];

  const generatedUrls: string[] = [];
  for (const b of buckets) {
    for (const n of nameVariations) {
      generatedUrls.push(`https://gpllirkyqgzwgsndliht.supabase.co/storage/v1/object/public/${b}/${n}`);
      generatedUrls.push(`https://gpllirkyqgzwgsndliht.supabase.co/storage/v1/object/public/${b}/developers/${n}`);
    }
  }

  const storageUrls = Array.from(
    new Set([
      member.avatarUrl,
      ...generatedUrls,
    ])
  ).filter(Boolean) as string[];

  const handleImageError = () => {
    if (imgSrcIndex < storageUrls.length - 1) {
      setImgSrcIndex((prev) => prev + 1);
    } else {
      setHasError(true);
    }
  };

  return (
    <div className="relative w-28 h-28 mx-auto mb-5">
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-400 to-purple-500 blur-md opacity-30 group-hover:opacity-60 transition-opacity" />
      
      <div className="relative w-full h-full rounded-full bg-sky-50 dark:bg-slate-900 border-2 border-sky-400/40 group-hover:border-purple-400 p-1 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.25)] group-hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all duration-300 overflow-hidden">
        {!hasError ? (
          <img
            src={storageUrls[imgSrcIndex]}
            alt={member.name}
            onError={handleImageError}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-full select-none"
          />
        ) : (
          <div
            className={`w-full h-full rounded-full bg-gradient-to-br ${member.gradient} flex items-center justify-center font-extrabold text-2xl text-white tracking-wider`}
          >
            {member.initials}
          </div>
        )}
      </div>
    </div>
  );
};

export const TeamSection: React.FC<TeamSectionProps> = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRoleIcon = (role: string) => {
    if (role.includes('LEADER') || role.includes('BACKEND')) return <Shield className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />;
    if (role.includes('FRONTEND')) return <Code className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
    if (role.includes('DATABASE')) return <Database className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
    return <Presentation className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12 flex flex-col items-center relative">
      {/* Header & Logo Area */}
      <div className="text-center mb-10 md:mb-14 flex flex-col items-center">
        <div className="relative mb-3 flex flex-col items-center">
          <CivicLogo size="xl" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#0b2545]/10 border border-[#0b2545]/30 text-[#0b2545] mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#0b2545]" />
          <span className="text-[#0b2545]">About The Developers &bull; Civic Innovators</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-blue-900 dark:text-white mb-4">
          MEET OUR TEAM
        </h1>
        
        <p className="text-blue-950/80 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-medium leading-relaxed">
          &ldquo;By the People For the People&rdquo; &bull; TECHNOLOGY + TOGETHERNESS
        </p>
      </div>

      {/* Team Grid */}
      <div className="flex flex-wrap justify-center gap-7 max-w-6xl w-full">
        {TEAM_MEMBERS.map((member) => {
          return (
            <div
              key={member.id}
              id={`team-card-${member.id}`}
              className="group relative bg-white/95 dark:bg-[var(--card-bg)] backdrop-blur-xl border border-sky-200/80 dark:border-[var(--border-color)] rounded-3xl p-8 w-full sm:w-[calc(50%-1.75rem)] lg:w-[calc(33.333%-1.75rem)] min-w-[280px] max-w-[360px] text-center flex flex-col items-center shadow-[0_10px_30px_rgba(2,132,199,0.08)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_45px_rgba(56,189,248,0.25)] hover:-translate-y-2 transition-all duration-300 overflow-hidden"
            >
              {/* Top 3px gradient border line */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-400 via-purple-500 to-pink-500" />

              {/* Fixed Profile Avatar from Supabase Storage */}
              <TeamMemberAvatar member={member} />

              {/* Name */}
              <h3 className="text-xl font-bold uppercase tracking-wide text-blue-950 dark:text-white mb-1 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                {member.name}
              </h3>

              {/* Designation */}
              {member.designation && (
                <div className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-2.5">
                  {member.designation}
                </div>
              )}

              {/* Role Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 mb-4">
                <span>{getRoleIcon(member.role)}</span>
                <span>{member.role}</span>
              </div>

              {/* Quote */}
              <p className="text-blue-900/90 dark:text-slate-300 text-sm font-normal italic leading-relaxed mb-6 flex-grow">
                {member.quote}
              </p>

              {/* Contact Actions */}
              <div className="mt-auto w-full flex flex-col gap-2.5">
                <a
                  href={`mailto:${member.email}`}
                  className="inline-flex items-center justify-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-semibold py-2 px-4 rounded-full bg-sky-500/10 border border-sky-500/25 hover:bg-sky-500 hover:text-white dark:hover:text-slate-950 hover:shadow-[0_0_15px_rgba(56,189,248,0.5)] transition-all break-all"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>{member.email}</span>
                </a>

                <div className="flex items-center justify-center gap-2">
                  <a
                    href={`tel:${member.phone}`}
                    className="text-blue-950 dark:text-slate-400 hover:text-sky-600 dark:hover:text-slate-200 text-xs font-medium tracking-wide flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-sky-500" />
                    <span>{member.phone}</span>
                  </a>
                  <button
                    onClick={() => handleCopy(member.id, member.phone)}
                    title="Copy Phone Number"
                    className="text-blue-800 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 p-1 rounded transition-colors cursor-pointer"
                  >
                    {copiedId === member.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


