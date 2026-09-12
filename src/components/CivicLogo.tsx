import React, { useState, useEffect } from 'react';
import { getCustomLogo } from '../utils/imageStorage';
import { CIVIC_INNOVATORS_LOGO_URL } from '../data/initialData';

interface CivicLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

export const CivicLogo: React.FC<CivicLogoProps> = ({
  size = 'md',
  className = '',
  showBorder = true,
}) => {
  const [imgSrcIndex, setImgSrcIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [customLogo] = useState<string | null>(getCustomLogo());

  const logoCandidates = [
    customLogo,
    CIVIC_INNOVATORS_LOGO_URL,
    'https://gpllirkyqgzwgsndliht.supabase.co/storage/v1/object/public/JANNITI%20Storage/CIVIC%20INNOVATORS%20LOGO.jpeg',
    'https://gpllirkyqgzwgsndliht.supabase.co/storage/v1/object/public/JANNITI%20Storage/CIVIC%20INNOVATORS%20LOGO.jpg',
    'https://gpllirkyqgzwgsndliht.supabase.co/storage/v1/object/public/JANNITI%20Storage/civic_innovators_logo.png',
    'https://gpllirkyqgzwgsndliht.supabase.co/storage/v1/object/public/JANNITI%20Storage/civic_innovators_logo.jpg',
    'https://gpllirkyqgzwgsndliht.supabase.co/storage/v1/object/public/JANNITI%20Storage/logo/civic_innovators_logo.png',
    'https://gpllirkyqgzwgsndliht.supabase.co/storage/v1/object/public/janniti-storage/logo/civic_innovators_logo.png',
    '/civic_innovators_logo.jpg',
  ].filter(Boolean) as string[];

  const handleImageError = () => {
    if (imgSrcIndex < logoCandidates.length - 1) {
      setImgSrcIndex((prev) => prev + 1);
    } else {
      setHasError(true);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-24 h-24 sm:w-28 sm:h-28',
  };

  const iconSizes = {
    sm: 32,
    md: 44,
    lg: 56,
    xl: 112,
  };

  const currentImgSrc = logoCandidates[imgSrcIndex] || '/civic_innovators_logo.jpg';

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative rounded-full flex items-center justify-center bg-white overflow-hidden shrink-0 transition-all duration-300 ${
          showBorder ? 'border-2 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)]' : ''
        } ${sizeClasses[size]}`}
      >
        {!hasError ? (
          <img
            src={currentImgSrc}
            alt="Civic Innovators Logo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-full select-none"
            onError={handleImageError}
          />
        ) : (
          /* Vector SVG representation matching the five-people circle emblem */
          <svg
            width={iconSizes[size]}
            height={iconSizes[size]}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full p-1"
          >
            {/* Outer circle */}
            <circle cx="50" cy="50" r="48" fill="#FFFFFF" />

            {/* 5 People Heads */}
            {/* Top Person (Navy/Black) */}
            <circle cx="50" cy="16" r="6" fill="#1E293B" />
            {/* Top Right Person (Amber/Gold) */}
            <circle cx="80" cy="38" r="6" fill="#F59E0B" />
            {/* Bottom Right Person (Coral/Red) */}
            <circle cx="69" cy="78" r="6" fill="#F87171" />
            {/* Bottom Left Person (Purple) */}
            <circle cx="31" cy="78" r="6" fill="#8B5CF6" />
            {/* Top Left Person (Teal) */}
            <circle cx="20" cy="38" r="6" fill="#0D9488" />

            {/* Arcs / Arms connecting */}
            <path
              d="M50 24 C50 34 68 34 76 43"
              stroke="#F59E0B"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M78 47 C75 58 75 66 67 74"
              stroke="#F87171"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M63 80 C50 82 45 82 35 78"
              stroke="#8B5CF6"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M27 74 C22 66 22 55 24 45"
              stroke="#0D9488"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M26 40 C32 32 45 30 50 24"
              stroke="#1E293B"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Center Hands Unity Hub */}
            <circle cx="50" cy="50" r="11" fill="#0F172A" />
            <circle cx="50" cy="50" r="6" fill="#38BDF8" />
          </svg>
        )}
      </div>
    </div>
  );
};
