import React from 'react';
import { CivicLogo } from './CivicLogo';
import { Language, User } from '../types';
import { Sun, Moon } from 'lucide-react';

interface HeaderProps {
  currentTab: 'janniti' | 'team' | 'officer';
  setCurrentTab: (tab: 'janniti' | 'team' | 'officer') => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  user: User | null;
  onOpenAuth: (view: 'signin' | 'signup') => void;
  onToggleProfile: () => void;
  onOpenSubmissions: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  theme,
  toggleTheme,
  language,
  setLanguage,
  user,
  onOpenAuth,
  onToggleProfile,
}) => {
  const handleTitleClick = () => {
    if (user?.role === 'authority') {
      if (currentTab === 'officer') {
        setCurrentTab('janniti');
      } else {
        setCurrentTab('officer');
      }
    } else {
      setCurrentTab('janniti');
    }
  };

  return (
    <header
      id="main-header"
      className="fixed top-0 left-0 w-full h-20 bg-black border-b border-[var(--border-color)] flex justify-between items-center px-4 sm:px-8 md:px-12 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all duration-300"
    >
      {/* Brand Heading & Logo */}
      <div className="flex items-center gap-3 sm:gap-6">
        <button
          id="civic-logo-brand"
          onClick={() => setCurrentTab('team')}
          className="flex items-center gap-3 text-left cursor-pointer group focus:outline-none transition-transform hover:scale-[1.02]"
          title="About Developers (Civic Innovators)"
        >
          <CivicLogo size="md" />
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-extrabold tracking-wider uppercase text-sky-500 dark:text-sky-400 group-hover:text-blue-600 dark:group-hover:text-sky-300 transition-colors drop-shadow-sm">
              Civic Innovators
            </span>
          </div>
        </button>
      </div>

      {/* Center Aligned JANNITI Heading (Toggles between Intelligence Suite and JANNITI for Authority users) */}
      <div className="flex items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-auto">
        <button
          id="header-center-janniti-title"
          onClick={handleTitleClick}
          className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest uppercase bg-gradient-to-r from-slate-900 via-sky-600 to-purple-700 dark:from-white dark:via-sky-400 dark:to-purple-500 bg-clip-text text-transparent drop-shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all border-none outline-none focus:outline-none select-none"
          title={
            user?.role === 'authority'
              ? currentTab === 'officer'
                ? 'Click to switch to JANNITI Home'
                : 'Click to switch to Intelligence Suite'
              : 'Go to JANNITI Portal'
          }
        >
          JANNITI
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Theme Switcher */}
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Toggle Light/Dark Theme"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="w-9 h-9 rounded-lg bg-[var(--select-bg)] border border-[var(--border-color)] text-[var(--text)] flex items-center justify-center cursor-pointer hover:border-[var(--primary)] hover:shadow-[0_0_10px_rgba(56,189,248,0.25)] transition-all"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-300" />
          ) : (
            <Moon className="w-4 h-4 text-sky-600" />
          )}
        </button>

        {/* Language Selector */}
        <select
          id="language-select"
          aria-label="Select Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="h-9 px-2 sm:px-3 text-xs sm:text-sm rounded-lg border border-[var(--border-color)] bg-[var(--select-bg)] text-[var(--text)] outline-none cursor-pointer hover:border-[var(--primary)] transition-all focus:ring-1 focus:ring-sky-400"
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी (Hindi)</option>
          <option value="or">ଓଡ଼ିଆ (Odia)</option>
        </select>

        {/* Profile Avatar Trigger or Auth Buttons */}
        {user ? (
          <button
            id="profile-btn"
            onClick={onToggleProfile}
            title={`Logged in as ${user.name} (${user.role})`}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-purple-600 flex items-center justify-center font-bold text-sm text-white border-2 border-[var(--border-color)] hover:border-sky-400 hover:shadow-[0_0_15px_rgba(56,189,248,0.5)] transition-all cursor-pointer transform hover:scale-105 select-none overflow-hidden"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              user.avatarInitials
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAuth('signup')}
              className="px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Sign Up
            </button>
            <button
              onClick={() => onOpenAuth('signin')}
              className="hidden sm:inline-block px-3.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-transparent text-[var(--text)] border border-[var(--border-color)] hover:bg-[var(--item-hover)] hover:border-sky-400 hover:text-sky-400 transition-all cursor-pointer"
            >
              Login
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
