import React, { useState, useRef } from 'react';
import { CivicLogo } from './CivicLogo';
import { User, UserRole } from '../types';
import { updateAccountDetails } from '../utils/authStorage';
import { uploadToAppFiles, syncCitizenAccountToSupabase, getUserEmailPrefix } from '../utils/supabaseClient';
import {
  User as UserIcon,
  Phone,
  MapPin,
  Building2,
  Building,
  CheckCircle2,
  AlertCircle,
  FileBadge,
  Sparkles,
  Camera,
  Upload,
  FolderLock,
  Trash2,
} from 'lucide-react';

interface ProfileSetupModalProps {
  isOpen: boolean;
  user: User;
  onComplete: (updatedUser: User) => void;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  user,
  onComplete,
}) => {
  const [name, setName] = useState(user.name !== user.email.split('@')[0] ? user.name : '');
  const [phone, setPhone] = useState(user.phone || '');
  const [ward, setWard] = useState(user.ward || 'Ward 1');
  const [city, setCity] = useState(user.city || 'Bhubaneswar');
  const [address, setAddress] = useState(user.address || '');
  const [pincode, setPincode] = useState(user.pincode || '');
  const [department, setDepartment] = useState(user.department || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const wards = Array.from({ length: 20 }, (_, i) => `Ward ${i + 1}`);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter your full legal name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter your residence / locality address.');
      return;
    }
    if (!pincode.trim() || pincode.trim().length < 6) {
      setErrorMsg('Please enter a valid 6-digit postal pincode.');
      return;
    }
    if (user.role === 'authority' && !department.trim()) {
      setErrorMsg('Please specify your municipal department/office designation.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Uploading profile photo to "App Files"...');

    let finalAvatarUrl = avatarPreview || user.avatarUrl;

    // Upload Avatar to Supabase "App Files" bucket under [emailId]/avatars/
    if (avatarFile) {
      try {
        const fileExt = avatarFile.name.split('.').pop() || 'jpg';
        const fileName = `avatar_${Date.now()}.${fileExt}`;
        const uploadRes = await uploadToAppFiles({
          userEmail: user.email,
          category: 'avatars',
          fileName,
          file: avatarFile,
        });

        if (uploadRes.success) {
          finalAvatarUrl = uploadRes.url || uploadRes.signedUrl || uploadRes.publicUrl;
        }
      } catch (err) {
        console.warn('Avatar upload to Supabase notice:', err);
      }
    }

    setStatusMessage('Saving profile in Supabase database...');

    const initials =
      name
        .trim()
        .split(' ')
        .map((p) => p[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'CI';

    let updatedUser: User | null = null;

    if (user.id) {
      updatedUser = updateAccountDetails(user.id, {
        name: name.trim(),
        phone: phone.trim(),
        ward,
        city: city.trim(),
        address: address.trim(),
        pincode: pincode.trim(),
        department: user.role === 'authority' ? department.trim() : undefined,
        avatarUrl: finalAvatarUrl || undefined,
      });
    }

    if (!updatedUser) {
      updatedUser = {
        ...user,
        name: name.trim(),
        phone: phone.trim(),
        ward,
        city: city.trim(),
        address: address.trim(),
        pincode: pincode.trim(),
        department: department.trim(),
        avatarUrl: finalAvatarUrl || undefined,
        profileCompleted: true,
        avatarInitials: initials,
      };
    }

    // Sync to Supabase citizen_accounts table
    try {
      await syncCitizenAccountToSupabase(updatedUser);
    } catch (err) {
      console.warn('Supabase profile sync notice:', err);
    }

    onComplete(updatedUser);
    setIsSubmitting(false);
    setStatusMessage(null);
  };

  return (
    <div
      id="profileSetupModal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-[var(--card-bg)] backdrop-blur-2xl border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Top Gradient Stripe */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-400 via-purple-500 to-pink-500" />

        {/* Header with Logo */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-[var(--border-color)] mb-4">
          <CivicLogo size="sm" />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-400/30 mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Step 2 of 2: Required Details</span>
            </div>
            <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
              Complete Your Civic Profile
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Please provide your verified details for municipal request routing and ledger recording.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Avatar / Profile Picture Upload to Supabase 'App Files' */}
          <div className="p-3 bg-[var(--item-bg)] border border-[var(--border-color)] rounded-2xl flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-purple-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md overflow-hidden shrink-0 border-2 border-sky-400/40">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user.avatarInitials}</span>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                title="Change Avatar"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text)]">Profile Photo</span>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarPreview(null);
                      setAvatarFile(null);
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mb-2 truncate">
                Saved in Supabase <span className="font-mono text-sky-400">App Files/{getUserEmailPrefix(user.email)}/avatars</span>
              </p>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 hover:bg-sky-500/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-3 h-3" />
                <span>{avatarPreview ? 'Change Photo' : 'Upload Avatar'}</span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>
          </div>

          {/* Email (Readonly Verified) */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Registered Email (Verified)
            </label>
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--item-bg)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text)] font-mono">
              <span>{user.email}</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {user.role}
              </span>
            </div>
          </div>

          {/* Full Legal Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Full Legal Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar Patra"
                className="w-full pl-9 pr-3 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text)] text-xs placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Mobile Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full pl-9 pr-3 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text)] text-xs placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
              />
            </div>
          </div>

          {/* Ward & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Ward / Jurisdiction <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text)] text-xs outline-none focus:border-sky-400"
                >
                  {wards.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                City / Municipality <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bhubaneswar"
                  className="w-full pl-9 pr-3 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text)] text-xs placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400"
                />
              </div>
            </div>
          </div>

          {/* Address & Pincode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Locality / Residential Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Plot No. 104, Shaheed Nagar"
                className="w-full px-3 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text)] text-xs placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Postal Pincode <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="751007"
                className="w-full px-3 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text)] text-xs placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Authority Department if Authority Role */}
          {user.role === 'authority' && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Department / Authority Designation <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Public Works Department - Executive Engineer"
                  className="w-full pl-9 pr-3 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text)] text-xs placeholder:text-[var(--text-muted)] outline-none focus:border-purple-400"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600 text-white shadow-[0_4px_18px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_22px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{statusMessage || 'Saving Details...'}</span>
                </>
              ) : (
                <>
                  <FileBadge className="w-4 h-4" />
                  <span>Save Details & Access Portal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
