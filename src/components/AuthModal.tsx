import React, { useState, useEffect } from 'react';
import { CivicLogo } from './CivicLogo';
import { UserRole, User } from '../types';
import { registerAccount, authenticateUserAsync } from '../utils/authStorage';
import { X, CheckCircle2, AlertCircle, ArrowRight, Lock, Mail, Shield, User as UserIcon, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'signin' | 'signup';
  onLoginSuccess: (user: User, needsProfileCompletion: boolean) => void;
  canDismiss?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialView = 'signin',
  onLoginSuccess,
  canDismiss = true,
}) => {
  const [view, setView] = useState<'signin' | 'signup'>(initialView);
  const [role, setRole] = useState<UserRole>('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showGoToSignup, setShowGoToSignup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (role === 'authority') {
      setView('signin');
    } else {
      setView(initialView);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowGoToSignup(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [initialView, isOpen]);

  // Keep view on signin if authority role is active
  useEffect(() => {
    if (role === 'authority' && view === 'signup') {
      setView('signin');
    }
  }, [role, view]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowGoToSignup(false);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authenticateUserAsync(email, password, role);

      if (!result.success) {
        setErrorMsg(result.message);
        // Only citizens can navigate to public sign up
        if (
          role === 'citizen' &&
          (result.message.toLowerCase().includes('not exist') || result.message.toLowerCase().includes('sign up first'))
        ) {
          setShowGoToSignup(true);
        }
        setIsSubmitting(false);
        return;
      }

      if (result.user) {
        if (role === 'authority' && result.source === 'supabase') {
          setSuccessMsg('Authenticated with Supabase Authorities database!');
        } else {
          setSuccessMsg('Signed in successfully!');
        }

        setTimeout(() => {
          onLoginSuccess(result.user!, !!result.needsProfileCompletion);
          onClose();
          setIsSubmitting(false);
        }, 400);
      } else {
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
      setIsSubmitting(false);
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Authority officers cannot self register
    if (role === 'authority') {
      setErrorMsg('Authority officer accounts are pre-authorized by civic administration. Please sign in or contact your department.');
      setView('signin');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please check and try again.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const result = registerAccount(email, password, role);

      if (!result.success) {
        setErrorMsg(result.message);
        setIsSubmitting(false);
        return;
      }

      // Per user specification:
      // "if the user doesn't exist then he will go to sign up page. Then again he will login the account with the same email id and password."
      setSuccessMsg('Account created successfully! Please sign in with your email and password.');
      setView('signin');
      setPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setShowGoToSignup(false);
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div
      id="authModal"
      onClick={(e) => {
        if (canDismiss && e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 transition-all duration-300 animate-in fade-in"
    >
      <div className="relative w-full max-w-md">
        {/* Optional Close Button (only if user can dismiss) */}
        {canDismiss && (
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute -top-3 -right-3 z-20 w-8 h-8 rounded-full bg-slate-800/90 border border-white/20 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Auth Card Layout */}
        <div className="relative bg-[var(--card-bg)] backdrop-blur-2xl border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 text-center shadow-[0_20px_50px_var(--shadow-color)] overflow-hidden">
          {/* Top 3px gradient border */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-400 via-purple-500 to-pink-500" />

          {/* Logo container */}
          <div className="flex justify-center mb-3">
            <CivicLogo size="md" />
          </div>

          {/* Role Toggle Selector */}
          <div className="flex bg-[var(--item-bg)] rounded-xl p-1 mb-4 border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => {
                setRole('citizen');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                role === 'citizen'
                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-400/40 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Citizen</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('authority');
                setView('signin');
                setErrorMsg(null);
                setShowGoToSignup(false);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                role === 'authority'
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-400/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Authority Officer</span>
            </button>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2 text-left animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-300 text-xs flex flex-col gap-2 text-left animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
              {showGoToSignup && role === 'citizen' && (
                <button
                  type="button"
                  onClick={() => {
                    setView('signup');
                    setErrorMsg(null);
                    setShowGoToSignup(false);
                  }}
                  className="self-start inline-flex items-center gap-1 px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                >
                  <span>Go to Sign Up Page</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {view === 'signin' ? (
            /* ================= SIGN IN VIEW ================= */
            <div>
              <h2 className="text-xl font-extrabold text-[var(--text)] mb-1 tracking-tight">
                {role === 'authority' ? 'Authority Officer Sign In' : 'Sign In to JANNITI'}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                {role === 'authority'
                  ? 'Enter department-issued credentials to access administrative controls'
                  : 'Enter your registered credentials to access your citizen account'}
              </p>

              <form onSubmit={handleSignIn} className="text-left space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={role === 'authority' ? 'e.g. officer@janniti.gov.in' : 'e.g. citizen@civic.in'}
                      className="w-full pl-9 pr-3 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text)] text-xs placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-10 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text)] text-xs placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-0.5 rounded cursor-pointer transition-colors focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_22px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* ================= SIGN UP VIEW ================= */
            <div>
              <h2 className="text-xl font-extrabold text-[var(--text)] mb-1 tracking-tight">
                Create New Account
              </h2>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Register with your email and password as {role === 'citizen' ? 'a Citizen' : 'an Authority Officer'}
              </p>

              <form onSubmit={handleSignUp} className="text-left space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. citizen@civic.in"
                      className="w-full pl-9 pr-3 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text)] text-xs placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password (min 6 chars)"
                      className="w-full pl-9 pr-10 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text)] text-xs placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-0.5 rounded cursor-pointer transition-colors focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full pl-9 pr-10 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text)] text-xs placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-0.5 rounded cursor-pointer transition-colors focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_22px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Register Account</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Toggle View Link */}
          <div className="mt-4 pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)]">
            {role === 'authority' ? (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)] py-0.5">
                <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Authority accounts are pre-authorized by administration.</span>
              </div>
            ) : view === 'signin' ? (
              <p>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setShowGoToSignup(false);
                  }}
                  className="text-sky-600 dark:text-sky-400 hover:text-purple-600 dark:hover:text-purple-400 font-bold cursor-pointer underline-offset-2 hover:underline ml-1"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('signin');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setShowGoToSignup(false);
                  }}
                  className="text-sky-600 dark:text-sky-400 hover:text-purple-600 dark:hover:text-purple-400 font-bold cursor-pointer underline-offset-2 hover:underline ml-1"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
