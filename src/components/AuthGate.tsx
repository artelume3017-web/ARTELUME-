import React, { useState } from 'react';
import { useAuth } from '../firebase/AuthContext';

export const AuthGate: React.FC = () => {
  const { signIn, joinCompanyWithCode, signInWithGoogle, resetPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'join'>('signin');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState(() => {
    return localStorage.getItem('artelume_remember_email') || 'artelume3017@gmail.com';
  });
  const [loginPass, setLoginPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('artelume_remember_me') !== 'false';
  });

  // Forgot Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');

  // Join Existing Artè Lume Team Form
  const [joinName, setJoinName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPass.trim()) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('artelume_remember_email', loginEmail.trim());
        localStorage.setItem('artelume_remember_me', 'true');
      } else {
        localStorage.removeItem('artelume_remember_email');
        localStorage.setItem('artelume_remember_me', 'false');
      }

      await signIn(loginEmail, loginPass);
    } catch (err: any) {
      console.error(err);
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setErrorMsg('Invalid email or password. You can reset your password or register a new studio account below.');
      } else {
        setErrorMsg(err.message || 'Failed to sign in. Please verify your credentials or use Instant Access.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim() || !joinEmail.trim() || !joinPass.trim() || !inviteCode.trim()) {
      setErrorMsg('Please enter your details and the 6-character Studio Invite Code.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await joinCompanyWithCode(
        { name: joinName, email: joinEmail, pass: joinPass },
        inviteCode.trim()
      );
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to join studio. Please verify the 6-digit invite code.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Google sign-in was cancelled or encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetMessage('Please enter your registered email address.');
      setResetStatus('error');
      return;
    }
    setResetStatus('loading');
    try {
      await resetPassword(resetEmail.trim());
      setResetStatus('success');
      setResetMessage(`Password reset link sent to ${resetEmail.trim()}! Please check your inbox.`);
    } catch (err: any) {
      console.error(err);
      setResetStatus('error');
      setResetMessage(err.message || 'Could not send reset email. Ensure the address is registered.');
    }
  };

  // Quick One-Click Studio Owner Access
  const handleOwnerSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signIn('artelume3017@gmail.com', 'Artelume2026!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Sign-in error: ' + (err.message || 'Please check your credentials or reset password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0f0906] flex items-center justify-center p-4 overflow-y-auto font-sans text-neutral-100">
      {/* Background Architectural Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#7b3f22]/20 blur-[130px] rounded-full" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#df9c20]/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-lg bg-[#18110c] border border-[#3e271a] rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Header Branding */}
        <div className="p-6 bg-gradient-to-b from-[#2a170e] to-[#18110c] border-b border-[#3e271a] text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#7b3f22]/30 border border-[#df9c20]/40 text-[#df9c20] text-2xl mb-3 shadow-inner">
            ❖
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-wider text-[#f5eee6] uppercase">
            Artè Lume Studio Portal
          </h1>
          <p className="text-xs text-[#b8a496] mt-1 font-medium">
            Architectural Lighting Quotations &amp; Multi-Device Cloud Sync
          </p>
        </div>

        {/* Tab Selection (Dedicated Company Portal) */}
        <div className="flex border-b border-[#3e271a] bg-[#140c08] text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab('signin'); setErrorMsg(null); }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 ${
              activeTab === 'signin'
                ? 'border-[#df9c20] text-[#df9c20] bg-[#22130c] font-bold'
                : 'border-transparent text-[#9a8677] hover:text-white hover:bg-white/5'
            }`}
          >
            Team Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('join'); setErrorMsg(null); }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 ${
              activeTab === 'join'
                ? 'border-[#df9c20] text-[#df9c20] bg-[#22130c] font-bold'
                : 'border-transparent text-[#9a8677] hover:text-white hover:bg-white/5'
            }`}
          >
            Join Team (Multi-Device)
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Tab 1: Team Sign In */}
        {activeTab === 'signin' && (
          <div className="p-6 space-y-4">
            {/* Quick Fill Shortcut for Studio Account */}
            <div className="p-2.5 bg-[#22150d] border border-[#df9c20]/30 rounded-xl flex items-center justify-between text-xs">
              <div className="truncate pr-2">
                <span className="text-[10px] text-[#df9c20] font-bold uppercase tracking-wider block">
                  Registered Studio Account
                </span>
                <span className="font-mono text-white text-[11px] truncate block">
                  artelume3017@gmail.com
                </span>
              </div>
              <button
                type="button"
                onClick={handleOwnerSignIn}
                disabled={loading}
                className="px-3 py-1.5 bg-[#df9c20] hover:bg-[#efaa29] text-[#170e08] font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm disabled:opacity-50"
              >
                1-Click Sign In
              </button>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#c7b7aa] mb-1.5 uppercase tracking-wider">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="artelume3017@gmail.com"
                  className="w-full bg-[#20140d] border border-[#4a3022] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#786355] outline-none focus:border-[#df9c20] focus:ring-1 focus:ring-[#df9c20]/40 transition-all font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#c7b7aa] uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="text-[11px] text-[#df9c20] hover:underline cursor-pointer"
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#20140d] border border-[#4a3022] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#786355] outline-none focus:border-[#df9c20] focus:ring-1 focus:ring-[#df9c20]/40 transition-all font-mono"
                />
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-[#a89588] hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded border-[#4a3022] bg-[#20140d] text-[#df9c20] focus:ring-[#df9c20]"
                  />
                  <span>Remember my email</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(loginEmail);
                    setResetStatus('idle');
                    setShowResetModal(true);
                  }}
                  className="text-[#df9c20] hover:underline cursor-pointer font-medium"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#8e4520] to-[#b35d27] hover:brightness-110 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-[#7b3f22]/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In to Studio Workspace</span>
                )}
              </button>

              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#3e271a]" />
                </div>
                <span className="relative px-3 bg-[#18110c] text-[11px] text-[#846f61] font-semibold uppercase">
                  or continue with
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 bg-[#20140d] hover:bg-[#2b1c12] border border-[#4a3022] rounded-lg text-xs font-semibold text-[#f5eee6] flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Google Account</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('artelume_cached_user', JSON.stringify({ uid: 'local_studio_user', email: 'artelume3017@gmail.com', displayName: 'Artè Lume Studio' }));
                  window.location.reload();
                }}
                className="w-full py-2.5 bg-[#25170f] hover:bg-[#301e13] border border-[#df9c20]/40 rounded-lg text-xs font-bold text-[#df9c20] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <span>⚡</span>
                <span>Open Studio (Offline / Local Storage Mode)</span>
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Join Existing Team / Multi-Device */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinCompany} className="p-6 space-y-4">
            <div className="p-3 bg-[#24160f] border border-[#4a3022] rounded-xl text-xs text-[#c4b1a2] leading-relaxed">
              💡 <strong>Multi-Device Access:</strong> Enter the 6-character <strong>Studio Join Code</strong> generated by your studio director to access the same quotations and products on this phone, iPad, or laptop.
            </div>

            <div>
              <label className="block text-xs font-bold text-[#c7b7aa] mb-1.5 uppercase tracking-wider">
                Studio Join Code (e.g. AL-8429)
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. AL-8429"
                className="w-full bg-[#20140d] border border-[#df9c20]/60 rounded-lg px-3.5 py-2.5 text-sm text-[#df9c20] font-mono font-bold tracking-widest placeholder-[#786355] outline-none focus:border-[#df9c20]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#c7b7aa] mb-1.5 uppercase tracking-wider">
                Your Full Name
              </label>
              <input
                type="text"
                required
                value={joinName}
                onChange={e => setJoinName(e.target.value)}
                placeholder="e.g. Sneha Reddy (Lighting Designer)"
                className="w-full bg-[#20140d] border border-[#4a3022] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#786355] outline-none focus:border-[#df9c20]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#c7b7aa] mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={joinEmail}
                  onChange={e => setJoinEmail(e.target.value)}
                  placeholder="designer@company.com"
                  className="w-full bg-[#20140d] border border-[#4a3022] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#786355] outline-none focus:border-[#df9c20]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#c7b7aa] mb-1.5 uppercase tracking-wider">
                  Create Password
                </label>
                <input
                  type="password"
                  required
                  value={joinPass}
                  onChange={e => setJoinPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#20140d] border border-[#4a3022] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#786355] outline-none focus:border-[#df9c20] font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#df9c20] hover:bg-[#efaa29] text-[#170e08] font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-[#df9c20]/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Joining Studio...' : 'Connect This Device to Studio'}
            </button>
          </form>
        )}

        {/* Dedicated Studio Info Footer */}
        <div className="p-3.5 bg-[#140c07] border-t border-[#3e271a] text-center text-xs text-[#a89588]">
          🏛️ Dedicated Portal for <strong className="text-[#df9c20]">ARTÈ LUME</strong> • Hyderabad &amp; Visakhapatnam Branches
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18110c] text-white border border-[#3e271a] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#f5eee6] flex items-center gap-2">
                <span>🔑</span>
                <span>Reset Account Password</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#a89588] leading-relaxed">
              Enter your studio email address. We will send a secure Firebase password reset link to your inbox.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="name@artelume.com"
                className="w-full bg-[#20140d] border border-[#4a3022] rounded-lg px-3 py-2 text-xs text-white placeholder-[#786355] outline-none focus:border-[#df9c20]"
              />

              {resetMessage && (
                <div
                  className={`text-xs p-2.5 rounded-lg leading-relaxed ${
                    resetStatus === 'success'
                      ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/70 border border-red-500/40 text-red-300'
                  }`}
                >
                  {resetMessage}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3 py-1.5 border border-[#4a3022] rounded-lg text-xs font-semibold text-stone-300 hover:bg-white/5 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={resetStatus === 'loading'}
                  className="px-4 py-1.5 bg-[#df9c20] hover:bg-[#efa624] text-[#170e08] font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {resetStatus === 'loading' ? 'Sending Link...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
