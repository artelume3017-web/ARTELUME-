import React, { useState } from 'react';
import { useAuth } from '../firebase/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { DownloadAppModal } from './DownloadAppModal';

export const AuthGate: React.FC = () => {
  const { signIn, signInAsOwner, signInAsStaff, joinCompanyWithCode, signInWithGoogle, resetPassword } = useAuth();
  const { isInstalled, isIOS, isAndroid } = usePWAInstall();

  // Automatic Store Download Modal on first shared link arrival
  const [showInstallModal, setShowInstallModal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return false;
    const shown = sessionStorage.getItem('artelume_shared_link_download_prompt');
    if (!shown) {
      sessionStorage.setItem('artelume_shared_link_download_prompt', 'true');
      return true;
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<'owner' | 'staff' | 'join'>('owner');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Owner Login State
  const [ownerEmail, setOwnerEmail] = useState(() => {
    return localStorage.getItem('artelume_remember_email') || 'artelume3017@gmail.com';
  });
  const [ownerPass, setOwnerPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('artelume_remember_me') !== 'false';
  });

  // Staff Login State
  const [staffBranch, setStaffBranch] = useState<'artelume' | 'artelume-vizag'>('artelume');
  const [staffId, setStaffId] = useState('');
  const [staffPin, setStaffPin] = useState('');

  // Forgot Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');

  // Join Existing Team Form State
  const [joinName, setJoinName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // Owner Standard Sign In
  const handleOwnerStandardSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerEmail.trim() || !ownerPass.trim()) {
      setErrorMsg('Please enter both your work email and password.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('artelume_remember_email', ownerEmail.trim());
        localStorage.setItem('artelume_remember_me', 'true');
      } else {
        localStorage.removeItem('artelume_remember_email');
        localStorage.setItem('artelume_remember_me', 'false');
      }

      await signIn(ownerEmail, ownerPass);
    } catch (err: any) {
      console.error(err);
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setErrorMsg('Invalid email or password. You can use 1-Click Director Sign-In or reset your password below.');
      } else {
        setErrorMsg(err.message || 'Failed to sign in. Please verify your credentials or use 1-Click Director Sign-In.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Owner 1-Click Sign In (Fast Director Access)
  const handleOwnerQuickSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInAsOwner();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error signing in as Studio Director.');
    } finally {
      setLoading(false);
    }
  };

  // Staff Sign In Handler
  const handleStaffSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim() || !staffPin.trim()) {
      setErrorMsg('Please enter your Staff Mobile Number / ID and 4-digit Security PIN.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      await signInAsStaff(staffId, staffPin, staffBranch);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Staff verification failed. Please check with your Studio Director.');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Click Staff Demo Login
  const handleQuickStaffTest = async (mobile: string, pin: string, branch: 'artelume' | 'artelume-vizag') => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInAsStaff(mobile, pin, branch);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Quick staff sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  // Join Existing Organization via Invite Code
  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim() || !joinEmail.trim() || !joinPass.trim() || !inviteCode.trim()) {
      setErrorMsg('Please enter all fields and the 6-character Studio Invite Code.');
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
      setErrorMsg(err.message || 'Failed to join studio. Please verify the invite code.');
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

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0c0704] flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans text-neutral-100">
      {/* Background Architectural Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[520px] bg-[#7b3f22]/25 blur-[140px] rounded-full" />
        <div className="absolute bottom-8 right-8 w-[420px] h-[420px] bg-[#df9c20]/15 blur-[130px] rounded-full" />
      </div>

      <div className="relative w-full max-w-lg bg-[#18110c] border border-[#3e271a] rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Top Automatic Store Download Banner */}
        <div className="p-3 bg-gradient-to-r from-[#2a170e] via-[#331c10] to-[#2a170e] border-b border-[#df9c20]/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">📲</span>
            <span className="text-stone-300 truncate">
              {isInstalled ? (
                <strong className="text-emerald-400">✓ Official App Installed</strong>
              ) : (
                <>
                  <strong className="text-[#df9c20]">Install Official App</strong> on Mobile &amp; PC
                </>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowInstallModal(true)}
            className="px-3 py-1 bg-[#df9c20] hover:bg-[#efaa29] text-[#140c08] text-[11px] font-black rounded-lg transition-all shrink-0 cursor-pointer shadow-sm"
          >
            {isInstalled ? 'Store Details' : 'Download App'}
          </button>
        </div>

        {/* Studio Branding Header */}
        <div className="p-6 bg-gradient-to-b from-[#24130a] to-[#18110c] border-b border-[#3e271a] text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#7b3f22]/40 border border-[#df9c20]/50 text-[#df9c20] text-2xl mb-2.5 shadow-inner">
            ❖
          </div>
          <h1 className="font-serif text-2xl font-black tracking-wider text-[#f5eee6] uppercase">
            Artè Lume Studio Portal
          </h1>
          <p className="text-xs text-[#b8a496] mt-0.5 font-medium">
            Architectural Lighting Quotations, Logistics &amp; 2-Branch Cloud Sync
          </p>

          {/* 2-Branch Pills */}
          <div className="flex items-center justify-center gap-2 mt-3 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded-full bg-black/40 border border-[#7b3f22] text-[#e8cbb7]">
              🏛️ Branch 1: Hyderabad
            </span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 border border-[#df9c20]/40 text-[#df9c20]">
              🌊 Branch 2: Vizag
            </span>
          </div>
        </div>

        {/* 3 Main Login Tabs */}
        <div className="flex border-b border-[#3e271a] bg-[#120a06] text-xs font-bold">
          <button
            type="button"
            onClick={() => { setActiveTab('owner'); setErrorMsg(null); }}
            className={`flex-1 py-3 text-center transition-all cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'owner'
                ? 'border-[#df9c20] text-[#df9c20] bg-[#22130c]'
                : 'border-transparent text-[#9a8677] hover:text-white hover:bg-white/5'
            }`}
          >
            <span>👑</span>
            <span>Owner Login</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('staff'); setErrorMsg(null); }}
            className={`flex-1 py-3 text-center transition-all cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'staff'
                ? 'border-[#df9c20] text-[#df9c20] bg-[#22130c]'
                : 'border-transparent text-[#9a8677] hover:text-white hover:bg-white/5'
            }`}
          >
            <span>👷</span>
            <span>Staff Login</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('join'); setErrorMsg(null); }}
            className={`flex-1 py-3 text-center transition-all cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'join'
                ? 'border-[#df9c20] text-[#df9c20] bg-[#22130c]'
                : 'border-transparent text-[#9a8677] hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🔑</span>
            <span>Join Code</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* ================= TAB 1: STUDIO OWNER LOGIN ================= */}
        {activeTab === 'owner' && (
          <div className="p-6 space-y-4">
            {/* Quick 1-Click Director Access Card */}
            <div className="p-3 bg-[#24150d] border border-[#df9c20]/40 rounded-xl flex items-center justify-between text-xs shadow-inner">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-[#df9c20] font-bold uppercase tracking-wider block">
                  Studio Director • Master Authority
                </span>
                <span className="font-mono text-white text-[11px] truncate block font-bold">
                  artelume3017@gmail.com
                </span>
                <span className="text-[10px] text-[#9a8677] block mt-0.5">
                  Controls Branch 1 &amp; Branch 2, P&amp;L, Staff Delegation
                </span>
              </div>
              <button
                type="button"
                onClick={handleOwnerQuickSignIn}
                disabled={loading}
                className="px-3.5 py-2 bg-gradient-to-r from-[#df9c20] to-[#efaa29] text-[#170e08] font-black text-xs rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0 shadow-md disabled:opacity-50"
              >
                1-Click Sign In
              </button>
            </div>

            <form onSubmit={handleOwnerStandardSignIn} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#c7b7aa] mb-1.5 uppercase tracking-wider">
                  Owner Email Address
                </label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)}
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
                  value={ownerPass}
                  onChange={e => setOwnerPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#20140d] border border-[#4a3022] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#786355] outline-none focus:border-[#df9c20] focus:ring-1 focus:ring-[#df9c20]/40 transition-all font-mono"
                />
              </div>

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
                    setResetEmail(ownerEmail);
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
                  <span>Sign In as Studio Owner</span>
                )}
              </button>

              <div className="relative my-2 text-center">
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
            </form>
          </div>
        )}

        {/* ================= TAB 2: STAFF MEMBER LOGIN ================= */}
        {activeTab === 'staff' && (
          <div className="p-6 space-y-4">
            <div className="p-3 bg-[#24150d] border border-[#4a3022] rounded-xl text-xs text-[#c4b1a2] leading-relaxed">
              👋 <strong>Studio Staff Portal:</strong> Select your assigned branch and enter your registered Mobile Number and 4-Digit Access PIN provided by your Studio Director.
            </div>

            <form onSubmit={handleStaffSignIn} className="space-y-4">
              {/* Step 1: Branch Selection */}
              <div>
                <label className="block text-xs font-bold text-[#c7b7aa] mb-1.5 uppercase tracking-wider">
                  Select Your Assigned Branch *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffBranch('artelume')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      staffBranch === 'artelume'
                        ? 'bg-[#331c10] border-[#df9c20] text-white shadow-md'
                        : 'bg-[#1c120b] border-[#4a3022] text-[#9a8677] hover:text-stone-300'
                    }`}
                  >
                    <div className="text-sm">🏛️</div>
                    <div className="font-bold text-xs mt-1">Branch 1: Hyderabad</div>
                    <div className="text-[10px] text-[#df9c20] font-mono mt-0.5">Jubilee Hills • AL-HYD</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStaffBranch('artelume-vizag')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      staffBranch === 'artelume-vizag'
                        ? 'bg-[#331c10] border-[#df9c20] text-white shadow-md'
                        : 'bg-[#1c120b] border-[#4a3022] text-[#9a8677] hover:text-stone-300'
                    }`}
                  >
                    <div className="text-sm">🌊</div>
                    <div className="font-bold text-xs mt-1">Branch 2: Vizag</div>
                    <div className="text-[10px] text-[#df9c20] font-mono mt-0.5">Siripuram • AL-VZG</div>
                  </button>
                </div>
              </div>

              {/* Step 2: Staff Mobile / ID */}
              <div>
                <label className="block text-xs font-bold text-[#c7b7aa] mb-1.5 uppercase tracking-wider">
                  Staff Mobile Number / Work Email *
                </label>
                <input
                  type="text"
                  required
                  value={staffId}
                  onChange={e => setStaffId(e.target.value)}
                  placeholder="e.g. 9849012345 or vikram.hyd@artelume.com"
                  className="w-full bg-[#20140d] border border-[#4a3022] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#786355] outline-none focus:border-[#df9c20] font-mono"
                />
              </div>

              {/* Step 3: 4-Digit Security PIN */}
              <div>
                <label className="block text-xs font-bold text-[#c7b7aa] mb-1.5 uppercase tracking-wider">
                  4-Digit Security PIN *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={staffPin}
                  onChange={e => setStaffPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-[#20140d] border border-[#df9c20]/60 rounded-lg px-3.5 py-2.5 text-base tracking-[0.3em] font-mono font-bold text-[#df9c20] placeholder-[#786355] outline-none focus:border-[#df9c20]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#df9c20] hover:bg-[#efaa29] text-[#170e08] font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-[#df9c20]/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating Staff...' : `Sign In to ${staffBranch === 'artelume' ? 'Branch 1 (Hyderabad)' : 'Branch 2 (Vizag)'}`}
              </button>

              {/* Quick Demo Staff Test Shortcuts */}
              <div className="pt-2 border-t border-[#3e271a] space-y-1.5">
                <span className="text-[10px] text-[#8e7a6c] uppercase tracking-wider font-bold block">
                  Quick Staff Sign-In Shortcuts:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickStaffTest('9849012345', '1234', 'artelume')}
                    disabled={loading}
                    className="p-2 bg-[#20140d] hover:bg-[#2c1b11] border border-[#4a3022] rounded-lg text-left cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-[#f5eee6] text-[11px]">🏛️ Branch 1: Hyderabad</div>
                    <div className="text-[10px] text-[#df9c20]">Vikram (Sales Lead • PIN: 1234)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickStaffTest('8912789012', '5678', 'artelume-vizag')}
                    disabled={loading}
                    className="p-2 bg-[#20140d] hover:bg-[#2c1b11] border border-[#4a3022] rounded-lg text-left cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-[#f5eee6] text-[11px]">🌊 Branch 2: Vizag</div>
                    <div className="text-[10px] text-[#df9c20]">Sneha (Design &amp; Sales • PIN: 5678)</div>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ================= TAB 3: JOIN TEAM WITH INVITE CODE ================= */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinCompany} className="p-6 space-y-4">
            <div className="p-3 bg-[#24160f] border border-[#4a3022] rounded-xl text-xs text-[#c4b1a2] leading-relaxed">
              💡 <strong>Multi-Device Access:</strong> Enter the 6-character <strong>Studio Join Code</strong> generated by your studio director to access quotations and products on this phone, iPad, or laptop.
            </div>

            <div>
              <label className="block text-xs font-bold text-[#c7b7aa] mb-1.5 uppercase tracking-wider">
                Studio Join Code (e.g. AL-STUDIO)
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. AL-STUDIO"
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
                placeholder="e.g. Rajesh Kumar (Lighting Consultant)"
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
                  placeholder="designer@artelume.com"
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
        <div className="p-3.5 bg-[#120a06] border-t border-[#3e271a] text-center text-xs text-[#a89588]">
          🏛️ Dedicated Portal for <strong className="text-[#df9c20]">ARTÈ LUME</strong> • Branch 1 (Hyderabad) &amp; Branch 2 (Vizag)
        </div>
      </div>

      {/* Official Mobile & PC App Store Trigger Button */}
      <div className="mt-4 flex flex-col items-center gap-1.5 z-10">
        <button
          type="button"
          onClick={() => setShowInstallModal(true)}
          className="px-4 py-2 bg-[#1b110a]/90 hover:bg-[#25170e] border border-[#df9c20]/40 rounded-xl text-xs font-bold text-[#df9c20] hover:text-amber-300 flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>📲</span>
          <span>{isInstalled ? '✓ Official App Installed (View Store Details)' : 'Install Official App on Phone or PC'}</span>
        </button>
        <span className="text-[10px] text-[#8e7a6c]">
          Google Play Store • Apple App Store • Windows Standalone
        </span>
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
              Enter your registered studio email address. We will send a secure Firebase password reset link to your inbox.
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

      {/* Official App Store & Play Store Download Guide Modal */}
      <DownloadAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        brandPrimaryColor="#7b3f22"
        brandAccentColor="#df9c20"
      />
    </div>
  );
};
