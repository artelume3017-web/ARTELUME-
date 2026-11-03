import React, { useState, useEffect } from 'react';
import { useAuth } from '../firebase/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { DownloadAppModal } from './DownloadAppModal';
import { getStoredStaffMembers } from '../data/staffRoster';
import { CompanyMember, AppRole } from '../types';

export const AuthGate: React.FC = () => {
  const { signIn, signInAsOwner, signInAsStaff, signInWithGoogle } = useAuth();
  const { isInstalled } = usePWAInstall();

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

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Staff Portal State
  const [selectedBranch, setSelectedBranch] = useState<'artelume' | 'artelume-vizag'>('artelume');
  const [activeStaffMember, setActiveStaffMember] = useState<CompanyMember | null>(null);
  const [staffPin, setStaffPin] = useState('');
  const [customMobile, setCustomMobile] = useState('');
  const [customPin, setCustomPin] = useState('');
  const [customName, setCustomName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [staffLoginMode, setStaffLoginMode] = useState<'roster' | 'invite_code' | 'mobile'>('roster');

  // Director Collapsible Manual Login
  const [showDirectorManualLogin, setShowDirectorManualLogin] = useState(false);
  const [directorEmail, setDirectorEmail] = useState('artelume3017@gmail.com');
  const [directorPass, setDirectorPass] = useState('');

  // Live Staff Roster for the Selected Branch
  const [staffRoster, setStaffRoster] = useState<CompanyMember[]>([]);

  useEffect(() => {
    const allStaff = getStoredStaffMembers();
    setStaffRoster(allStaff);
  }, []);

  const branchStaff = staffRoster.filter(m => {
    if (m.role === 'owner') return false;
    if (selectedBranch === 'artelume-vizag') {
      return m.assignedBranchId === 'artelume-vizag';
    }
    return !m.assignedBranchId || m.assignedBranchId === 'artelume';
  });

  // 1-Click Director Entry
  const handleDirectorInstantEntry = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      localStorage.setItem('artelume_staff_name', 'Studio Director');
      await signInAsOwner();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error signing in as Studio Director.');
    } finally {
      setLoading(false);
    }
  };

  // Director Password Sign In
  const handleDirectorManualSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directorEmail.trim() || !directorPass.trim()) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      localStorage.setItem('artelume_staff_name', 'Studio Director');
      await signIn(directorEmail.trim(), directorPass.trim());
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Invalid password. You can use 1-Click Director Entry above.');
    } finally {
      setLoading(false);
    }
  };

  // Staff Sign In with Dedicated Invite Code (e.g. HYD-SALES-4821)
  const handleInviteCodeSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inviteCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Please enter your Dedicated Staff Invite Code.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      // Find matching staff member by inviteCode or fallback pattern
      const matched = staffRoster.find(
        m => m.inviteCode?.toUpperCase() === cleanCode ||
             cleanCode.includes(m.pin || '999999') ||
             (cleanCode.startsWith('VZG') && m.assignedBranchId === 'artelume-vizag' && cleanCode.includes(m.pin || '')) ||
             (cleanCode.startsWith('HYD') && m.assignedBranchId !== 'artelume-vizag' && cleanCode.includes(m.pin || ''))
      );

      const targetBranch = cleanCode.startsWith('VZG') ? 'artelume-vizag' : (matched?.assignedBranchId === 'artelume-vizag' ? 'artelume-vizag' : 'artelume');
      const staffName = matched?.displayName || (cleanCode.startsWith('VZG') ? 'Vizag Staff' : 'Hyderabad Staff');
      const staffIdentifier = matched?.phone || matched?.email || `staff_${cleanCode.toLowerCase()}`;
      const staffPinCode = matched?.pin || cleanCode.split('-').pop() || '1234';

      localStorage.setItem('artelume_staff_name', staffName);
      await signInAsStaff(staffIdentifier, staffPinCode, targetBranch);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid Invite Code. Please check with your Studio Director.');
    } finally {
      setLoading(false);
    }
  };

  // Staff Quick Sign In with Selected Profile & PIN
  const handleStaffPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStaffMember) return;
    if (!staffPin.trim()) {
      setErrorMsg('Please enter your 4-digit PIN.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      localStorage.setItem('artelume_staff_name', activeStaffMember.displayName);
      const identifier = activeStaffMember.phone || activeStaffMember.email;
      await signInAsStaff(identifier, staffPin.trim(), selectedBranch);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid PIN. Please verify with your Studio Director.');
    } finally {
      setLoading(false);
    }
  };

  // Staff Manual Mobile & PIN Sign In
  const handleCustomStaffSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMobile.trim() || !customPin.trim()) {
      setErrorMsg('Please enter both your mobile number and 4-digit PIN.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const recordedName = customName.trim() || `Staff (${customMobile.slice(-4)})`;
      localStorage.setItem('artelume_staff_name', recordedName);
      await signInAsStaff(customMobile.trim(), customPin.trim(), selectedBranch);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Verification failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0c0704] flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans text-neutral-100">
      {/* Background Architectural Ambient Illumination */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[550px] bg-[#7b3f22]/20 blur-[150px] rounded-full" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-[#df9c20]/15 blur-[140px] rounded-full" />
      </div>

      <div className="relative w-full max-w-4xl bg-[#160e09] border border-[#3e271a] rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Top Native App Download Bar */}
        <div className="p-3 bg-gradient-to-r from-[#22130c] via-[#2f190e] to-[#22130c] border-b border-[#df9c20]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base shrink-0">📲</span>
            <span className="text-stone-300">
              {isInstalled ? (
                <strong className="text-emerald-400">✓ Official App Installed</strong>
              ) : (
                <>
                  <strong className="text-[#df9c20]">Install Official ARTÈ LUME App</strong> on Mobile &amp; PC
                </>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowInstallModal(true)}
            className="px-3.5 py-1.5 bg-[#df9c20] hover:bg-[#efaa29] text-[#140c08] text-xs font-black rounded-xl transition-all shrink-0 cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            {isInstalled ? 'View App Details' : '📲 Download App'}
          </button>
        </div>

        {/* Studio Branding Header */}
        <div className="p-6 bg-gradient-to-b from-[#24130a] to-[#160e09] border-b border-[#3e271a] text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#7b3f22]/40 border border-[#df9c20]/50 text-[#df9c20] text-2xl mb-2.5 shadow-inner">
            ❖
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-black tracking-wider text-[#f5eee6] uppercase">
            STUDIO PORTAL
          </h1>
          <p className="text-xs text-[#b8a496] mt-1 font-medium">
            Architectural Lighting Quotations, Logistics &amp; Studio Operations
          </p>

          {/* 2 Studios Status Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3 text-xs font-mono">
            <span className="px-3 py-1 rounded-full bg-black/50 border border-[#7b3f22] text-[#e8cbb7] flex items-center gap-1.5">
              <span>🏛️</span>
              <span>Artè Lume Studio (Hyderabad)</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-black/50 border border-[#df9c20]/50 text-[#df9c20] flex items-center gap-1.5">
              <span>🌊</span>
              <span>Vizag Studio (Siripuram)</span>
            </span>
          </div>
        </div>

        {/* Global Error Notice */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1 leading-relaxed font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Main Two-Door Clean Gateway */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* ================= DOOR 1: STUDIO DIRECTOR (OWNER) ================= */}
          <div className="bg-[#1f130c] border border-[#df9c20]/40 rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#df9c20]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">👑</span>
                  <div>
                    <h2 className="font-serif font-bold text-lg text-white">Studio Director</h2>
                    <span className="text-[10px] text-[#df9c20] font-mono uppercase tracking-wider block">
                      Master Owner Authority
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#df9c20]/20 text-[#df9c20] border border-[#df9c20]/40">
                  Owner
                </span>
              </div>

              <div className="p-3 bg-[#160c07] border border-[#4a3022] rounded-xl space-y-1 text-xs">
                <div className="text-[#a89588] text-[11px]">Registered Account:</div>
                <div className="font-mono font-bold text-white text-xs truncate">artelume3017@gmail.com</div>
                <div className="text-[10px] text-[#bda495] pt-1">
                  ✓ Full control over Branch 1 &amp; Branch 2<br />
                  ✓ Confidential profit margins &amp; bank ledgers<br />
                  ✓ Staff role assignment &amp; PIN management
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-5">
              {/* Primary 1-Click Director Entry */}
              <button
                type="button"
                onClick={handleDirectorInstantEntry}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#df9c20] to-[#efaa29] hover:brightness-110 active:scale-[0.99] text-[#140c08] font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-[#df9c20]/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>⚡</span>
                <span>{loading ? 'Authenticating...' : 'Enter Studio as Director'}</span>
              </button>

              {/* Collapsible Manual Sign In for Director */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setShowDirectorManualLogin(!showDirectorManualLogin)}
                  className="text-[11px] text-[#a89588] hover:text-[#df9c20] underline cursor-pointer"
                >
                  {showDirectorManualLogin ? 'Hide Password Sign-In' : 'Sign in with Password / Google'}
                </button>
              </div>

              {showDirectorManualLogin && (
                <form onSubmit={handleDirectorManualSignIn} className="space-y-2.5 pt-2 border-t border-[#3e271a]">
                  <input
                    type="password"
                    placeholder="Enter Director Password"
                    value={directorPass}
                    onChange={e => setDirectorPass(e.target.value)}
                    className="w-full bg-[#160c07] border border-[#4a3022] rounded-lg px-3 py-2 text-xs text-white placeholder-[#786355] outline-none focus:border-[#df9c20]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 bg-[#7b3f22] hover:bg-[#8e4520] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Sign In with Password
                    </button>
                    <button
                      type="button"
                      onClick={signInWithGoogle}
                      disabled={loading}
                      className="px-3 py-2 bg-[#160c07] hover:bg-[#20100a] border border-[#4a3022] rounded-lg text-xs font-bold text-stone-200 cursor-pointer"
                      title="Sign in with Google"
                    >
                      Google
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* ================= DOOR 2: BRANCH STAFF ACCESS ================= */}
          <div className="bg-[#1f130c] border border-[#3e271a] rounded-2xl p-5 flex flex-col justify-between shadow-lg">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🏢</span>
                  <div>
                    <h2 className="font-serif font-bold text-lg text-white">Branch Staff Portal</h2>
                    <span className="text-[10px] text-[#a89588] block">Quick PIN Access for Studio Team</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-800 text-stone-300 border border-stone-700">
                  Staff
                </span>
              </div>

              {/* Step 1: Studio Toggle */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#a89588] tracking-wider mb-1.5">
                  1. Select Studio:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranch('artelume');
                      setActiveStaffMember(null);
                      setStaffPin('');
                      setErrorMsg(null);
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedBranch === 'artelume'
                        ? 'bg-[#331c10] border-[#df9c20] text-white shadow-md'
                        : 'bg-[#160c07] border-[#4a3022] text-[#9a8677] hover:text-stone-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1 truncate">
                      <span>🏛️</span>
                      <span>Artè Lume (Hyd)</span>
                    </div>
                    <div className="text-[9.5px] text-[#df9c20] font-mono mt-0.5">Jubilee Hills</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranch('artelume-vizag');
                      setActiveStaffMember(null);
                      setStaffPin('');
                      setErrorMsg(null);
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedBranch === 'artelume-vizag'
                        ? 'bg-[#331c10] border-[#df9c20] text-white shadow-md'
                        : 'bg-[#160c07] border-[#4a3022] text-[#9a8677] hover:text-stone-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1 truncate">
                      <span>🌊</span>
                      <span>Vizag Studio</span>
                    </div>
                    <div className="text-[9.5px] text-[#df9c20] font-mono mt-0.5">Siripuram</div>
                  </button>
                </div>
              </div>

              {/* Login Method Tabs */}
              <div className="flex border-b border-[#3e271a] bg-[#160c07] rounded-lg p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setStaffLoginMode('invite_code')}
                  className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer text-center ${
                    staffLoginMode === 'invite_code'
                      ? 'bg-[#df9c20] text-[#140c08] shadow-xs'
                      : 'text-[#a89588] hover:text-white'
                  }`}
                >
                  🔑 Invite Code
                </button>
                <button
                  type="button"
                  onClick={() => setStaffLoginMode('roster')}
                  className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer text-center ${
                    staffLoginMode === 'roster'
                      ? 'bg-[#df9c20] text-[#140c08] shadow-xs'
                      : 'text-[#a89588] hover:text-white'
                  }`}
                >
                  👥 Choose Name
                </button>
                <button
                  type="button"
                  onClick={() => setStaffLoginMode('mobile')}
                  className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer text-center ${
                    staffLoginMode === 'mobile'
                      ? 'bg-[#df9c20] text-[#140c08] shadow-xs'
                      : 'text-[#a89588] hover:text-white'
                  }`}
                >
                  📱 Mobile &amp; PIN
                </button>
              </div>

              {/* METHOD A: DEDICATED INVITE CODE */}
              {staffLoginMode === 'invite_code' && (
                <form onSubmit={handleInviteCodeSignIn} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#a89588] tracking-wider mb-1">
                      Enter Dedicated Staff Invite Code:
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteCodeInput}
                      onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. HYD-SALES-4821 or VZG-DELIV-1234"
                      className="w-full bg-[#160c07] border border-[#df9c20]/70 focus:border-[#df9c20] rounded-lg px-3 py-2 text-sm font-mono font-bold tracking-wider text-[#df9c20] placeholder-[#786355] outline-none uppercase text-center"
                    />
                    <div className="text-[10px] text-[#a89588] mt-1 text-center">
                      Assigned by Studio Director. Auto-identifies your studio, role &amp; permissions.
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-[#df9c20] to-[#efaa29] hover:brightness-110 text-[#140c08] font-black text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-sm"
                  >
                    {loading ? 'Verifying Invite Code...' : 'Enter Studio with Invite Code →'}
                  </button>
                </form>
              )}

              {/* METHOD B: ROSTER NAME & PIN */}
              {staffLoginMode === 'roster' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] uppercase font-bold text-[#a89588] tracking-wider">
                      2. Choose Your Name:
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
                    {branchStaff.length > 0 ? (
                      branchStaff.map(member => {
                        const isSelected = activeStaffMember?.uid === member.uid;
                        const roleLabel =
                          member.role === 'sales'
                            ? '💼 Sales Lead'
                            : member.role === 'delivery'
                            ? '🚚 Logistics'
                            : '🛡️ Administrator';

                        return (
                          <div
                            key={member.uid}
                            onClick={() => {
                              setActiveStaffMember(member);
                              setStaffPin(member.pin || '');
                              setErrorMsg(null);
                            }}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-[#331c10] border-[#df9c20] shadow-sm'
                                : 'bg-[#160c07] border-[#3e271a] hover:border-[#5a3622]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white truncate">{member.displayName}</div>
                              <div className="text-[10px] text-[#df9c20] font-mono">{roleLabel}</div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                                isSelected ? 'bg-[#df9c20] text-[#140c08]' : 'bg-[#25150d] text-[#b39e90]'
                              }`}
                            >
                              {isSelected ? '✓ Selected' : 'Select'}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 bg-[#160c07] border border-[#3e271a] rounded-xl text-center text-xs text-[#a89588]">
                        No staff pre-assigned to this studio yet.
                      </div>
                    )}
                  </div>

                  {/* PIN Input for Selected Staff */}
                  {activeStaffMember && (
                    <form onSubmit={handleStaffPinSubmit} className="mt-3 p-3 bg-[#160c07] border border-[#df9c20]/60 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white truncate">
                          Enter PIN for <span className="text-[#df9c20]">{activeStaffMember.displayName}</span>:
                        </span>
                        <span className="text-[10px] font-mono text-[#a89588]">(PIN: {activeStaffMember.pin || '1234'})</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          maxLength={6}
                          required
                          value={staffPin}
                          onChange={e => setStaffPin(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="••••"
                          className="w-full bg-[#20140d] border border-[#df9c20] rounded-lg px-3 py-2 text-center text-lg font-mono font-bold tracking-[0.3em] text-[#df9c20] outline-none"
                        />
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-[#df9c20] hover:bg-[#efaa29] text-[#140c08] font-black text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          {loading ? 'Entering...' : 'Enter App →'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* METHOD C: MANUAL MOBILE + PIN + NAME INPUT FORM */}
              {staffLoginMode === 'mobile' && (
                <form onSubmit={handleCustomStaffSignIn} className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#a89588] tracking-wider mb-1 block">
                      Your Full Name:
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      placeholder="e.g. Ramesh Chandra"
                      className="w-full bg-[#160c07] border border-[#4a3022] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#786355] outline-none focus:border-[#df9c20]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#a89588] tracking-wider mb-1 block">
                      Staff Mobile Number:
                    </label>
                    <input
                      type="tel"
                      required
                      value={customMobile}
                      onChange={e => setCustomMobile(e.target.value)}
                      placeholder="e.g. 9849012345"
                      className="w-full bg-[#160c07] border border-[#4a3022] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#786355] outline-none focus:border-[#df9c20] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#a89588] tracking-wider mb-1">
                      4-Digit Security PIN:
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      required
                      value={customPin}
                      onChange={e => setCustomPin(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••"
                      className="w-full bg-[#160c07] border border-[#df9c20]/60 rounded-lg px-3 py-1.5 text-center text-base font-mono font-bold tracking-widest text-[#df9c20] outline-none"
                    />
                  </div>

                    <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-[#df9c20] hover:bg-[#efaa29] text-[#140c08] font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    {loading ? 'Verifying...' : `Sign In to ${selectedBranch === 'artelume' ? 'Artè Lume (Hyderabad)' : 'Vizag Studio (Siripuram)'}`}
                  </button>
                </form>
              )}
            </div>

            <div className="pt-3 border-t border-[#3e271a] flex items-center justify-between text-[10px] text-[#8e7a6c]">
              <span>🔒 Staff accounts are strictly locked to their assigned branch.</span>
            </div>
          </div>
        </div>

        {/* Studio System Footer */}
        <div className="p-3 bg-[#120905] border-t border-[#3e271a] text-center text-xs text-[#a89588]">
          🏛️ ARTÈ LUME LIGHTING STUDIO • Official Enterprise Portal
        </div>
      </div>

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
