import React from 'react';
import { User } from '../types';
import { FileText, CheckCircle2, Bell, LogOut, Shield, MapPin, Settings, X, Phone, Home } from 'lucide-react';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSignOut: () => void;
  onOpenSubmissions: () => void;
  onOpenResolved: () => void;
  onOpenNotifications: () => void;
  onEditProfile: () => void;
  onOpenIntelligenceSuite?: () => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isOpen,
  onClose,
  user,
  onSignOut,
  onOpenSubmissions,
  onOpenResolved,
  onOpenNotifications,
  onEditProfile,
  onOpenIntelligenceSuite,
}) => {
  if (!isOpen) return null;

  const firstName = user.name.split(' ')[0] || 'User';
  const isOfficer = user.role === 'authority';

  return (
    <>
      {/* Click-outside backdrop */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
      />

      {/* Floating Profile Box */}
      <div
        id="profile-box"
        className="fixed top-20 right-4 sm:right-8 md:right-12 w-[calc(100%-2rem)] sm:w-88 max-w-sm bg-[var(--card-bg)] backdrop-blur-2xl border border-[var(--border-color)] rounded-3xl p-5 shadow-[0_15px_40px_var(--shadow-color)] z-50 flex flex-col items-center animate-in fade-in slide-in-from-top-3 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Profile Menu"
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text)] p-1.5 rounded-full hover:bg-[var(--item-bg)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* User Email */}
        <div className="text-xs font-medium text-[var(--text-muted)] mb-3 text-center truncate max-w-[240px]">
          {user.email}
        </div>

        {/* Large Avatar (Removed corner badge per Request 4) */}
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-purple-600 flex items-center justify-center font-extrabold text-2xl text-white shadow-[0_0_20px_rgba(56,189,248,0.35)] mb-3 overflow-hidden border-2 border-sky-400/40">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{user.avatarInitials}</span>
          )}
        </div>

        {/* Greeting */}
        <div className="text-xl font-semibold text-[var(--text)] mb-2">
          Hi, {firstName}!
        </div>

        {/* For Citizens: Location info and Update Details button */}
        {!isOfficer && (
          <>
            <div className="flex flex-col items-center gap-1 text-xs text-[var(--text-muted)] mb-3">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" />
                <span>{user.ward || 'Ward 1'} {user.city ? `• ${user.city}` : ''}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                  <Phone className="w-2.5 h-2.5 text-slate-400" />
                  <span>{user.phone}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                onClose();
                onEditProfile();
              }}
              className="w-full max-w-[220px] mb-4 py-2 px-4 rounded-full text-xs font-semibold text-[var(--primary)] border border-[var(--border-color)] hover:border-[var(--primary)] hover:bg-[var(--item-bg)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Update Required Details</span>
            </button>
          </>
        )}

        {/* For Officers: Interactive Full-Width Officer Intelligence Suite Switcher Button (Request 4) */}
        {isOfficer && (
          <button
            id="profile-suite-switcher-btn"
            onClick={() => {
              onClose();
              if (onOpenIntelligenceSuite) {
                onOpenIntelligenceSuite();
              }
            }}
            className="w-full mb-4 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-600 hover:via-indigo-600 hover:to-purple-700 text-white shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-purple-200" />
            <span>Officer Intelligence Suite</span>
          </button>
        )}

        {/* Inner Menu List Container (Cleaned up per Request 3) */}
        <div className="w-full bg-[var(--item-bg)] rounded-2xl border border-[var(--border-color)] overflow-hidden flex flex-col">
          <button
            onClick={() => {
              onClose();
              onOpenSubmissions();
            }}
            className="w-full flex items-center justify-between p-3 text-xs font-semibold text-[var(--text)] hover:bg-[var(--item-hover)] border-b border-[var(--border-color)] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded-md bg-sky-500/10 text-sky-400">
                <FileText className="w-4 h-4" />
              </span>
              <span>{isOfficer ? 'Petitions Ledger' : 'My Submissions'}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300">
              {user.submissionsCount}
            </span>
          </button>

          {!isOfficer && (
            <button
              onClick={() => {
                onClose();
                onOpenResolved();
              }}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-[var(--text)] hover:bg-[var(--item-hover)] border-b border-[var(--border-color)] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <span>Resolved Requests</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                {user.resolvedCount}
              </span>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onOpenNotifications();
            }}
            className="w-full flex items-center justify-between p-3 text-xs font-semibold text-[var(--text)] hover:bg-[var(--item-hover)] border-b border-[var(--border-color)] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded-md bg-purple-500/10 text-purple-400">
                <Bell className="w-4 h-4" />
              </span>
              <span>Notifications</span>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full flex items-center gap-2.5 p-3 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
          >
            <span className="p-1 rounded-md bg-rose-500/10 text-rose-400">
              <LogOut className="w-4 h-4" />
            </span>
            <span>Sign out</span>
          </button>
        </div>

        {/* Footer Meta */}
        <div className="flex justify-between w-full text-[11px] text-[var(--text-muted)] mt-3.5 px-2">
          <span className="font-semibold text-sky-400">Civic Innovators</span>
          <span>Official Portal</span>
        </div>
      </div>
    </>
  );
};
