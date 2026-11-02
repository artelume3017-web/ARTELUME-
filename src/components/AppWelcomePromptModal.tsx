import React from 'react';

interface AppWelcomePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGuide: () => void;
  brandPrimaryColor?: string;
  brandAccentColor?: string;
}

export const AppWelcomePromptModal: React.FC<AppWelcomePromptModalProps> = ({
  isOpen,
  onClose,
  onStartGuide,
  brandPrimaryColor = '#7b3f22',
  brandAccentColor = '#df9c20'
}) => {
  if (!isOpen) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem('artelume_welcome_prompt_dismissed', 'true');
    } catch (e) {}
    onClose();
  };

  const handleStart = () => {
    try {
      localStorage.setItem('artelume_welcome_prompt_dismissed', 'true');
    } catch (e) {}
    onClose();
    onStartGuide();
  };

  return (
    <div
      className="fixed inset-0 z-[9994] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in no-print"
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-md bg-[#19110b] border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#ede5dc] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundImage: `radial-gradient(circle at top, ${brandPrimaryColor}45 0%, transparent 65%)`
        }}
      >
        {/* Glow Header */}
        <div className="p-6 text-center space-y-3 bg-gradient-to-b from-black/40 to-transparent">
          <div className="relative inline-block mx-auto">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl border border-amber-400/50 mx-auto"
              style={{
                background: `linear-gradient(135deg, ${brandPrimaryColor}, #180d07)`
              }}
            >
              <img
                src="/icon.svg"
                alt="Artè Lume App"
                className="w-11 h-11 object-contain drop-shadow"
                onError={e => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#19110b] flex items-center justify-center text-[10px] text-black font-black">
              ✓
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Welcome to ARTÈ LUME
            </span>
            <h2 className="font-serif font-bold text-xl text-[#f7efe6] mt-2 tracking-wide">
              Architectural Lighting Studio
            </h2>
            <p className="text-xs text-stone-300 mt-1 max-w-xs mx-auto leading-relaxed">
              Official application loaded. Would you like a 1-minute interactive walkthrough on how to use the application?
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="px-6 pb-2 space-y-2">
          <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl flex items-center gap-3 text-xs">
            <span className="text-lg">💡</span>
            <div>
              <div className="font-bold text-stone-200">Draft Lighting Schedules</div>
              <div className="text-[11px] text-stone-400">Wattage, CCT, Beam, Finish &amp; instant GST calculations</div>
            </div>
          </div>

          <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl flex items-center gap-3 text-xs">
            <span className="text-lg">🚚</span>
            <div>
              <div className="font-bold text-stone-200">Delivery Challans &amp; Signatures</div>
              <div className="text-[11px] text-stone-400">Multi-batch site dispatches, driver manifests &amp; sign-offs</div>
            </div>
          </div>

          <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl flex items-center gap-3 text-xs">
            <span className="text-lg">💰</span>
            <div>
              <div className="font-bold text-stone-200">Payment Sync &amp; Bank Passbook</div>
              <div className="text-[11px] text-stone-400">Advance receipts, ledger balance &amp; automated quote sync</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-4 space-y-2.5 bg-black/40 border-t border-white/10">
          <button
            type="button"
            onClick={handleStart}
            className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider text-neutral-950 shadow-xl cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${brandAccentColor}, #ffcd38)`
            }}
          >
            <span>▶</span>
            <span>Yes, Start Interactive Guide</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-stone-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Explore Workspace Directly
          </button>

          <div className="text-[10px] text-center text-stone-400 pt-1">
            You can reopen the guide anytime using the <strong className="text-amber-300">"📖 How to Use App"</strong> button.
          </div>
        </div>
      </div>
    </div>
  );
};
