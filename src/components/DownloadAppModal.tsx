import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandPrimaryColor?: string;
  brandAccentColor?: string;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  brandPrimaryColor = '#7b3f22',
  brandAccentColor = '#df9c20'
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isDesktop, install } = usePWAInstall();

  // Tab state: default to detected platform
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'pc'>(() => {
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'pc';
  });

  const [copiedLink, setCopiedLink] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    setInstalling(true);
    try {
      const success = await install();
      if (success) {
        onClose();
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Install ARTÈ LUME Architectural Lighting Studio App on your phone or PC:\n${window.location.origin}\n\n1. Open link\n2. Tap "Install App" or "Add to Home Screen"\n3. Enjoy fast, offline quotation and delivery tracking!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleOpenStandaloneTab = () => {
    try {
      const topUrl = window.top ? window.top.location.href : window.location.href;
      window.open(topUrl, '_blank');
    } catch {
      window.open(window.location.href, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in no-print"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#17100b] border border-amber-600/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] text-[#ede5dc]"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundImage: `radial-gradient(circle at top right, ${brandPrimaryColor}44 0%, transparent 65%)`
        }}
      >
        {/* ================= STORE LISTING TOP HEADER ================= */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-black/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
              {/* App Icon (Play Store / App Store squircle) */}
              <div className="relative shrink-0">
                <div
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center shadow-xl border border-amber-400/40 p-2.5"
                  style={{
                    background: `linear-gradient(135deg, ${brandPrimaryColor}, #190c06)`
                  }}
                >
                  <img
                    src="/icon.svg"
                    alt="Artè Lume App Icon"
                    className="w-full h-full object-contain drop-shadow"
                    onError={e => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#17100b] flex items-center justify-center text-[10px] text-black font-black shadow-sm">
                  ✓
                </span>
              </div>

              {/* Title & Publisher */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif font-black text-lg sm:text-xl text-[#f7efe6] tracking-wide leading-tight">
                    ARTÈ LUME: Lighting Studio
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Official App
                  </span>
                </div>
                <p className="text-xs text-amber-400 font-medium mt-0.5">
                  Artè Lume Architectural Studio Pvt Ltd
                </p>
                <p className="text-[11px] text-[#9a8576]">
                  Contains Quotation Builder, Delivery Challans &amp; Studio Manager
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-[#9e8d7f] hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-sm"
              title="Close modal"
            >
              ✕
            </button>
          </div>

          {/* App Store / Google Play Metrics Strip */}
          <div className="grid grid-cols-4 gap-1 sm:gap-2 mt-4 pt-3 border-t border-white/5 text-center">
            <div className="p-1">
              <div className="flex items-center justify-center gap-1 font-bold text-xs sm:text-sm text-stone-200">
                <span>4.9</span>
                <span className="text-amber-400 text-xs">★</span>
              </div>
              <div className="text-[10px] text-stone-400">1.4K reviews</div>
            </div>

            <div className="p-1 border-l border-white/5">
              <div className="font-bold text-xs sm:text-sm text-stone-200">10K+</div>
              <div className="text-[10px] text-stone-400">Downloads</div>
            </div>

            <div className="p-1 border-l border-white/5">
              <div className="font-bold text-xs sm:text-sm text-stone-200">2.4 MB</div>
              <div className="text-[10px] text-stone-400">Instant Load</div>
            </div>

            <div className="p-1 border-l border-white/5">
              <div className="font-bold text-xs sm:text-sm text-emerald-400">Rated 3+</div>
              <div className="text-[10px] text-stone-400">Verified PWA</div>
            </div>
          </div>
        </div>

        {/* 1-Click Direct Native Install Trigger (if browser supports beforeinstallprompt) */}
        {isInstallable && !isInstalled && (
          <div className="mx-4 sm:mx-6 mt-4 p-3.5 bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">⚡</span>
              <div>
                <div className="text-xs font-bold text-emerald-300">Instant One-Tap Install Ready!</div>
                <div className="text-[11px] text-stone-300">Install directly onto your home screen or desktop taskbar.</div>
              </div>
            </div>
            <button
              onClick={handleNativeInstall}
              disabled={installing}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>{installing ? 'Installing...' : '⬇️ Install App'}</span>
            </button>
          </div>
        )}

        {/* Already Installed Status */}
        {isInstalled && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
            <span className="text-lg">🎉</span>
            <div>
              <span className="font-bold">Official Application is Running in Standalone Mode!</span> Offline database precached and multi-device sync active.
            </div>
          </div>
        )}

        {/* Store Platform Selector Tabs */}
        <div className="px-4 sm:px-6 pt-3 flex gap-2 border-b border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('android')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'android'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-neutral-400 hover:text-stone-200'
            }`}
          >
            <span>🤖</span>
            <span>Google Play (Android)</span>
            {isAndroid && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-normal">
                Your Device
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'ios'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-neutral-400 hover:text-stone-200'
            }`}
          >
            <span>🍏</span>
            <span>App Store (iPhone &amp; iPad)</span>
            {isIOS && (
              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-normal">
                Your Device
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pc')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'pc'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-400 hover:text-stone-200'
            }`}
          >
            <span>💻</span>
            <span>PC &amp; Mac Desktop</span>
            {isDesktop && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-normal">
                Your Device
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* ================= ANDROID TAB (GOOGLE PLAY EXPERIENCE) ================= */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="bg-black/40 border border-emerald-500/25 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                    <span>🤖</span>
                    <span>Android Play Store Installation Steps</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">Chrome / Edge / Samsung</span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                    <div>
                      <div className="font-bold text-stone-200 text-xs">Open Browser Options Menu (⋮)</div>
                      <div className="text-[11.5px] text-stone-300 mt-0.5 leading-relaxed">
                        Tap the <strong>three vertical dots (⋮)</strong> in the top-right corner of Chrome, Brave, or Samsung Internet.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                    <div>
                      <div className="font-bold text-stone-200 text-xs">Tap "Install App" or "Add to Home screen"</div>
                      <div className="text-[11.5px] text-stone-300 mt-0.5 leading-relaxed">
                        Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong> from the menu options.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                    <div>
                      <div className="font-bold text-stone-200 text-xs">Confirm &amp; Launch</div>
                      <div className="text-[11.5px] text-stone-300 mt-0.5 leading-relaxed">
                        Tap <strong>"Install"</strong>. The gold ARTÈ LUME app icon is added to your app drawer and opens as a genuine full-screen application.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Post-Install Experience Notice */}
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-200/90 flex items-start gap-2.5">
                  <span className="text-base">📱</span>
                  <div>
                    <strong>Post-Download Experience:</strong> When you open the downloaded app, it will ask you to <strong>Sign In</strong> to sync your studio quotations and ask if you'd like a <strong>1-minute guided tour</strong> on using the app.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= IOS TAB (APPLE APP STORE EXPERIENCE) ================= */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="bg-black/40 border border-blue-500/25 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-blue-400 flex items-center gap-2">
                    <span>🍏</span>
                    <span>Apple iOS Safari Installation (No App Store password needed)</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">iPhone &amp; iPad</span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                    <div>
                      <div className="font-bold text-stone-200 text-xs flex items-center gap-2">
                        <span>Tap the Safari Share Button</span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[11px] border border-blue-500/30">
                          ⎋ Share
                        </span>
                      </div>
                      <div className="text-[11.5px] text-stone-300 mt-0.5 leading-relaxed">
                        In Safari bottom toolbar on iPhone (or top right on iPad), tap the rectangular <strong>Share icon</strong> (square with an upward arrow).
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                    <div>
                      <div className="font-bold text-stone-200 text-xs flex items-center gap-2">
                        <span>Tap "Add to Home Screen"</span>
                        <span className="px-2 py-0.5 rounded bg-white/10 text-stone-200 text-[11px]">
                          ➕ Add to Home Screen
                        </span>
                      </div>
                      <div className="text-[11.5px] text-stone-300 mt-0.5 leading-relaxed">
                        Scroll down the sharing sheet options and tap <strong>"Add to Home Screen"</strong>.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                    <div>
                      <div className="font-bold text-stone-200 text-xs">Tap "Add" in Top-Right</div>
                      <div className="text-[11.5px] text-stone-300 mt-0.5 leading-relaxed">
                        Tap <strong>Add</strong>. The high-resolution ARTÈ LUME app icon appears on your iPhone home screen with zero browser bars!
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl text-[11px] text-blue-200/90 flex items-start gap-2.5">
                  <span className="text-base">✨</span>
                  <div>
                    <strong>Native iOS Mode:</strong> Once added to your Home Screen, ARTÈ LUME launches in immersive fullscreen with offline caching enabled.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= PC & MAC DESKTOP TAB ================= */}
          {activeTab === 'pc' && (
            <div className="space-y-4">
              <div className="bg-black/40 border border-amber-500/25 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-amber-400 flex items-center gap-2">
                    <span>💻</span>
                    <span>Install on Windows PC or Mac (Standalone Window)</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">Chrome / Edge / Arc</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-stone-300">
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-2">
                    <div className="font-bold text-amber-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[11px]">1</span>
                      <span>Address Bar Install Icon</span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-stone-300">
                      Look on the right side of the browser's top URL address bar. You'll find an <strong>Install icon</strong> (screen with downward arrow <span className="text-amber-300 font-mono">⊞</span> or plus <span className="text-amber-300 font-mono">⊕</span>).
                    </p>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-2">
                    <div className="font-bold text-amber-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[11px]">2</span>
                      <span>Click "Install ARTÈ LUME"</span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-stone-300">
                      Click <strong>Install</strong>. A standalone desktop app window opens immediately and creates an icon on your Desktop &amp; Windows Taskbar or macOS Dock.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-950/20 border border-amber-600/25 rounded-xl flex items-start gap-2 text-[11px] text-amber-200/90">
                  <span className="text-base">💡</span>
                  <span>
                    <strong>Can't see the icon?</strong> Click the <strong>three dots (⋮)</strong> in Chrome/Edge &gt; select <strong>"Save and share"</strong> or <strong>"Apps"</strong> &gt; click <strong>"Install ARTÈ LUME"</strong>.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Sharing & Direct Link Bar */}
          <div className="p-4 bg-black/50 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="min-w-0 text-center sm:text-left">
              <div className="text-xs font-bold text-stone-200">Share with Lighting Team &amp; Sales Staff</div>
              <div className="text-[11px] text-stone-400">Install across unlimited phones, iPads, and office laptops</div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>💬 WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 sm:flex-initial px-3 py-2 bg-white/10 hover:bg-white/20 text-[#ede5dc] rounded-xl font-bold text-xs transition-colors cursor-pointer border border-white/15 flex items-center justify-center gap-1.5"
              >
                <span>{copiedLink ? '✓ Copied' : '🔗 Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenStandaloneTab}
                className="flex-1 sm:flex-initial px-3 py-2 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 rounded-xl font-bold text-xs transition-colors cursor-pointer border border-amber-500/30 flex items-center justify-center gap-1.5"
                title="Open in clean standalone window"
              >
                <span>↗ Open Clean Tab</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3.5 sm:p-4 bg-black/60 border-t border-white/10 flex items-center justify-between">
          <div className="text-[11px] text-stone-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Official Progressive Web Application • Offline Precaching</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-stone-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
