import React, { useState } from 'react';
import { useAuth } from '../firebase/AuthContext';

interface StudioAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onOpenTeamModal?: () => void;
}

export const StudioAccountModal: React.FC<StudioAccountModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onOpenTeamModal
}) => {
  const { user, userProfile, company, currentRole, switchRole, signOut, switchCompanyCode, loading } = useAuth();
  const [switchCodeInput, setSwitchCodeInput] = useState('');
  const [showSwitchForm, setShowSwitchForm] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  if (!isOpen) return null;

  const handleCopyInviteCode = () => {
    if (company?.inviteCode) {
      navigator.clipboard.writeText(company.inviteCode);
      onShowToast(`Copied Team Join Code: ${company.inviteCode}`);
    }
  };

  const handleSwitchCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!switchCodeInput.trim()) return;
    setSwitchError(null);
    setIsSubmitting(true);
    try {
      await switchCompanyCode(switchCodeInput.trim());
      onShowToast(`Successfully connected to new Studio organization!`);
      setShowSwitchForm(false);
      setSwitchCodeInput('');
      onClose();
    } catch (err: any) {
      console.error(err);
      setSwitchError(err.message || 'Failed to switch studio. Check the invite code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteSignOut = async () => {
    try {
      await signOut();
      onShowToast('Signed out successfully.');
      onClose();
    } catch (err) {
      console.error(err);
      onShowToast('Sign out error. Please try again.');
    }
  };

  const userInitials = (userProfile?.displayName || user?.displayName || user?.email || 'AL')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#18110c] text-white border border-[#3e271a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#2c170d] to-[#18110c] border-b border-[#3e271a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7b3f22] to-[#df9c20] flex items-center justify-center font-serif font-black text-sm text-[#18110c] shadow-md">
              {userInitials}
            </div>
            <div>
              <div className="font-bold text-sm text-[#f5eee6] truncate max-w-[200px]">
                {userProfile?.displayName || user?.displayName || user?.email?.split('@')[0]}
              </div>
              <div className="text-[11px] text-[#df9c20] font-medium flex items-center gap-1.5">
                <span>{currentRole === 'owner' ? '👑 Studio Owner' : currentRole === 'admin' ? '🛡️ Administrator' : currentRole === 'sales' ? '💼 Sales Executive' : '🚚 Delivery Logistics'}</span>
                <span>•</span>
                <span className="text-[#a89588] font-mono text-[10px]">{user?.email}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9a8576] hover:text-white p-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-base"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Active Company Studio Information */}
          <div className="bg-[#22150e] border border-[#4a3022] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#df9c20]">
                Active Studio Organization
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#f5eee6]">
                  {company?.name || 'ARTÈ LUME'}
                </h3>
                <p className="text-xs text-[#a89588]">{company?.location || 'Jubilee Hills • Hyderabad'}</p>
              </div>
              <span className="text-xs font-mono text-stone-400">Prefix: {company?.quotePrefix || 'AL'}</span>
            </div>

            {/* 6-Digit Join Code Box */}
            {company?.inviteCode && (
              <div className="pt-2 border-t border-[#3e271a] flex items-center justify-between bg-[#190e08] p-2.5 rounded-lg">
                <div>
                  <div className="text-[9.5px] text-[#a89588] uppercase tracking-wider">Multi-Device Join Code</div>
                  <div className="font-mono font-bold text-base text-[#df9c20] tracking-widest">
                    {company.inviteCode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyInviteCode}
                  className="px-3 py-1.5 bg-[#7b3f22] hover:bg-[#914a28] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <span>📋</span>
                  <span>Copy Code</span>
                </button>
              </div>
            )}
          </div>

          {/* Team Staff & Role Assignment for Studio Owner */}
          {currentRole === 'owner' ? (
            <div className="bg-[#22150e] border border-[#df9c20]/40 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#df9c20] flex items-center gap-1.5">
                  <span>👑</span>
                  <span>Owner Staff Management Console</span>
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Full Authority
                </span>
              </div>

              <p className="text-xs text-[#d8c7b8]">
                As Studio Owner, you have complete control to assign roles to Administrator, Sales Person, and Delivery Person.
              </p>

              {onOpenTeamModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTeamModal();
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-[#7b3f22] to-[#df9c20] hover:from-[#914a28] hover:to-[#efa624] text-[#18110c] font-black text-xs rounded-lg transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <span>👥</span>
                  <span>Manage Team Staff &amp; Assign Roles</span>
                  <span>›</span>
                </button>
              )}

              {/* Owner Role Perspective Tester */}
              <div className="pt-2 border-t border-[#3e271a]">
                <div className="text-[10px] uppercase tracking-wider text-[#a89588] font-bold mb-1.5 flex items-center justify-between">
                  <span>Test Staff Perspective:</span>
                  <span className="text-[9px] font-normal text-stone-400">Simulation Mode</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    { id: 'owner', icon: '👑', label: 'Owner View', desc: 'Full P&L & Setups' },
                    { id: 'admin', icon: '🛡️', label: 'Admin View', desc: 'Financial Ops & Audit' },
                    { id: 'sales', icon: '💼', label: 'Sales View', desc: 'Quotes & Spec Sheets' },
                    { id: 'delivery', icon: '🚚', label: 'Delivery View', desc: 'Challans & Dispatches' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={async () => {
                        await switchRole(item.id as any);
                        onShowToast(`Perspective switched to ${item.label}`);
                      }}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        currentRole === item.id
                          ? 'border-[#df9c20] bg-[#df9c20]/20 text-[#f5eee6] font-bold'
                          : 'border-[#3e271a] bg-[#1a0f09] text-[#a89588] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold text-[11px]">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <div className="text-[9.5px] opacity-70 truncate">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Locked Role View for Staff Logins */
            <div className="bg-[#22150e] border border-amber-600/30 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                  <span>🔒</span>
                  <span>Role Assigned by Studio Owner</span>
                </span>
                <span className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold uppercase">
                  {currentRole.toUpperCase()}
                </span>
              </div>

              <div className="p-2.5 bg-[#170e09] border border-[#3e271a] rounded-lg space-y-1.5">
                <div className="text-xs font-bold text-[#f5eee6] flex items-center gap-2">
                  <span>
                    {currentRole === 'admin'
                      ? '🛡️ Administrator'
                      : currentRole === 'sales'
                      ? '💼 Sales Person'
                      : '🚚 Delivery Person'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-normal">● Assigned &amp; Verified</span>
                </div>
                <p className="text-[11px] text-[#a89588] leading-relaxed">
                  Your access permissions are locked to your designated station. To request role elevation or additional permissions, please reach out directly to Artè Lume Studio Owner (
                  <span className="text-[#df9c20] font-mono">artelume3017@gmail.com</span>).
                </p>
              </div>

              {/* Disabled role switches with lock icons */}
              <div className="grid grid-cols-2 gap-1.5 opacity-60 pointer-events-none">
                <div className="p-2 rounded-lg border border-[#3e271a] bg-[#120a06] text-[10px] text-[#7d6c60]">
                  <span>🔒 👑 Owner (Restricted)</span>
                </div>
                <div className="p-2 rounded-lg border border-[#3e271a] bg-[#120a06] text-[10px] text-[#7d6c60]">
                  <span>🔒 🛡️ Admin (Restricted)</span>
                </div>
                <div className="p-2 rounded-lg border border-[#3e271a] bg-[#120a06] text-[10px] text-[#7d6c60]">
                  <span>🔒 💼 Sales (Restricted)</span>
                </div>
                <div className="p-2 rounded-lg border border-[#3e271a] bg-[#120a06] text-[10px] text-[#7d6c60]">
                  <span>🔒 🚚 Delivery (Restricted)</span>
                </div>
              </div>
            </div>
          )}

          {/* Switch Organization Form Toggle */}
          {!showSwitchForm ? (
            <button
              type="button"
              onClick={() => setShowSwitchForm(true)}
              className="w-full py-2 px-3 bg-[#22150e] hover:bg-[#2c1c13] border border-[#4a3022] text-[#c7b7aa] hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>🔄</span>
                <span>Switch Studio or Join Another Organization</span>
              </span>
              <span>›</span>
            </button>
          ) : (
            <form onSubmit={handleSwitchCompany} className="p-3 bg-[#241710] border border-[#df9c20]/40 rounded-xl space-y-2.5">
              <div className="text-xs font-bold text-[#df9c20] flex items-center justify-between">
                <span>Enter 6-digit Invite Code</span>
                <button
                  type="button"
                  onClick={() => setShowSwitchForm(false)}
                  className="text-stone-400 hover:text-white text-[11px]"
                >
                  Cancel
                </button>
              </div>
              <input
                type="text"
                value={switchCodeInput}
                onChange={e => setSwitchCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. AL-8429"
                className="w-full bg-[#18110c] border border-[#4a3022] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#df9c20] tracking-wider outline-none focus:border-[#df9c20]"
              />
              {switchError && (
                <div className="text-[11px] text-red-300 bg-red-950/50 p-1.5 rounded">{switchError}</div>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !switchCodeInput.trim()}
                className="w-full py-2 bg-[#df9c20] hover:bg-[#efa624] text-[#18110c] font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying & Switching...' : 'Switch to this Studio'}
              </button>
            </form>
          )}

          {/* Device & Session Info */}
          <div className="text-[11px] text-[#8e7b70] bg-[#140c08] p-2.5 rounded-lg border border-[#3e271a] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="text-stone-400">💻</span>
              <span>Current Session: {currentRole.toUpperCase()} Mode</span>
            </span>
          </div>

          {/* Sign Out Action */}
          <div className="pt-2 border-t border-[#3e271a]">
            {!confirmSignOut ? (
              <button
                type="button"
                onClick={() => setConfirmSignOut(true)}
                className="w-full py-2.5 px-4 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚪</span>
                <span>Sign Out of Artè Lume</span>
              </button>
            ) : (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl space-y-2">
                <p className="text-xs text-red-200 font-medium text-center">
                  Are you sure you want to sign out from this device?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmSignOut(false)}
                    className="flex-1 py-1.5 border border-red-500/30 text-red-200 text-xs font-semibold rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteSignOut}
                    disabled={loading}
                    className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    Yes, Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
