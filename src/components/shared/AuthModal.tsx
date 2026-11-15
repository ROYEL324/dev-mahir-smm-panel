import React, { useEffect, useState } from 'react';
import { Lock, Mail, User as UserIcon, X, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  requestPasswordReset,
} from '../../services/authService';
import firebaseConfig from '../../../firebase-applet-config.json';

export function AuthModal() {
  const { authModalOpen, authModalInitialTab, closeAuthModal, pushToast } = useApp();
  const [tab, setTab] = useState<'login' | 'register' | 'reset'>(authModalInitialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showProviderSetupHint, setShowProviderSetupHint] = useState(false);

  useEffect(() => {
    setTab(authModalInitialTab);
    setErrorMsg(null);
    setShowProviderSetupHint(false);
  }, [authModalInitialTab, authModalOpen]);

  if (!authModalOpen) return null;

  const formatAuthError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('auth/operation-not-allowed')) {
      setShowProviderSetupHint(true);
      return 'Email/Password sign-up is currently disabled in Firebase Authentication. Click "Continue with Google (Gmail)" above to sign up instantly, or enable Email/Password in Firebase Console.';
    }
    if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
      return 'Incorrect email or password.';
    }
    if (raw.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists. Try signing in or using Google Sign-In.';
    }
    if (raw.includes('auth/weak-password')) {
      return 'Password must be at least 6 characters long.';
    }
    if (raw.includes('auth/popup-closed-by-user')) {
      return 'Google sign-in window was closed before completing.';
    }
    if (raw.includes('auth/unauthorized-domain')) {
      return 'This domain is not yet authorized in Firebase Console → Authentication → Settings → Authorized domains.';
    }
    return raw;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setShowProviderSetupHint(false);
    setBusy(true);
    try {
      if (tab === 'login') {
        await loginWithEmail(email, password);
        pushToast('Welcome back to MAHIR DEV SMM Panel', 'success');
        closeAuthModal();
      } else if (tab === 'register') {
        await registerWithEmail(name, email, password);
        pushToast(
          'Account created',
          'success',
          'Welcome to MAHIR DEV SMM Panel!'
        );
        closeAuthModal();
      } else {
        await requestPasswordReset(email);
        pushToast('Password reset email sent', 'success', 'Check your inbox to reset your password.');
        setTab('login');
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setShowProviderSetupHint(false);
    setBusy(true);
    try {
      await loginWithGoogle();
      pushToast('Signed in with Google', 'success', 'Welcome to MAHIR DEV SMM Panel!');
      closeAuthModal();
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const firebaseAuthConsoleUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 sm:p-7 relative border border-violet-400/25 max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-violet-300/70 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Close authentication modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold text-white">
              {tab === 'login'
                ? 'Sign In to MAHIR DEV'
                : tab === 'register'
                  ? 'Create Your Account'
                  : 'Reset Password'}
            </h2>
            <p className="text-xs text-violet-300/80">Secured by Firebase Authentication</p>
          </div>
        </div>

        {/* Instant Google (Gmail) Sign-In / Sign-Up Button */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full neon-button-primary rounded-xl py-2.5 px-4 text-sm font-semibold text-white flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 mb-4"
        >
          <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
            />
          </svg>
          <span>{tab === 'register' ? 'Sign Up with Google (Gmail)' : 'Continue with Google (Gmail)'}</span>
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-violet-500/20" />
          <span className="text-[11px] text-violet-300/65">or use email &amp; password</span>
          <div className="h-px flex-1 bg-violet-500/20" />
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0B051A] border border-violet-500/20 mb-4">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg(null);
              setShowProviderSetupHint(false);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'login'
                ? 'bg-violet-600 text-white shadow'
                : 'text-violet-300/80 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg(null);
              setShowProviderSetupHint(false);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'register'
                ? 'bg-violet-600 text-white shadow'
                : 'text-violet-300/80 hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('reset');
              setErrorMsg(null);
              setShowProviderSetupHint(false);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'reset'
                ? 'bg-violet-600 text-white shadow'
                : 'text-violet-300/80 hover:text-white'
            }`}
          >
            Reset
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200 leading-relaxed space-y-2">
            <p>{errorMsg}</p>
            {showProviderSetupHint && (
              <a
                href={firebaseAuthConsoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sky-300 hover:underline font-semibold"
              >
                <span>Open Firebase Auth Sign-in Providers</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-violet-200 mb-1.5">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="MAHIR DEV"
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-violet-400/40 focus:outline-none focus:border-violet-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-violet-200 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-violet-400/40 focus:outline-none focus:border-violet-400"
              />
            </div>
          </div>

          {tab !== 'reset' && (
            <div>
              <label className="block text-xs font-medium text-violet-200 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-violet-400/40 focus:outline-none focus:border-violet-400"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-violet-400/30 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
          >
            <span>
              {busy
                ? 'Please wait...'
                : tab === 'login'
                  ? 'Sign In with Email'
                  : tab === 'register'
                    ? 'Register with Email'
                    : 'Send Reset Link'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
