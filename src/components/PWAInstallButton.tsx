import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { DownloadAppModal } from './DownloadAppModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'pill' | 'minimal' | 'store-badge';
  primaryColor?: string;
  accentColor?: string;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'sidebar',
  primaryColor = '#7b3f22',
  accentColor = '#df9c20',
  className = ''
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isDesktop, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  const deviceLabel = isIOS ? 'App Store (iOS)' : isAndroid ? 'Google Play (Android)' : 'Desktop App (PC)';
  const deviceIcon = isIOS ? '🍏' : isAndroid ? '🤖' : '💻';

  return (
    <>
      {/* Header Variant: Mobile-Only or discreet icon to avoid cluttered desktop page download button */}
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs ${
            isInstalled
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
              : 'bg-black/50 hover:bg-black/70 text-amber-300 border border-amber-500/30'
          } ${className}`}
          title={isInstalled ? 'ARTÈ LUME App Installed & Active' : 'Install Official App on Phone or PC'}
        >
          <span className="text-sm leading-none">{isInstalled ? '✓' : deviceIcon}</span>
          <span className="font-semibold text-[11px]">
            {isInstalled ? 'App Active' : 'Get App'}
          </span>
          {!isInstalled && (
            <span className="hidden xl:inline text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono">
              Store
            </span>
          )}
        </button>
      )}

      {/* Sidebar Variant: Complete App Store / Play Store style card */}
      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer text-left border shadow-sm ${
            isInstalled
              ? 'bg-emerald-950/30 border-emerald-500/25 text-emerald-300'
              : 'bg-gradient-to-r from-[#2a170d] to-[#1a0e08] hover:from-[#351e12] hover:to-[#22130b] border-amber-500/30 text-amber-200'
          } ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-black/40 border border-amber-400/30 flex items-center justify-center text-sm shrink-0">
              {isInstalled ? '📱' : '📲'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold leading-tight text-[#f5eee6]">
                {isInstalled ? 'ARTÈ LUME App Installed' : 'Get Mobile & PC App'}
              </div>
              <div className="text-[10px] text-stone-400 leading-tight mt-0.5">
                {isInstalled ? 'Running Standalone Application' : 'Play Store • App Store • Windows'}
              </div>
            </div>
          </div>

          <span
            className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 tracking-wider shadow-xs"
            style={{
              backgroundColor: isInstalled ? '#065f46' : accentColor,
              color: isInstalled ? '#a7f3d0' : '#140c06'
            }}
          >
            {isInstalled ? 'Installed' : 'Install'}
          </span>
        </button>
      )}

      {/* Store Badge Variant: Looks like official App Store & Google Play button */}
      {variant === 'store-badge' && (
        <button
          type="button"
          onClick={handleClick}
          className={`px-3 py-2 bg-black/70 hover:bg-black/90 border border-white/20 hover:border-amber-400/50 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 text-left text-white shadow-md ${className}`}
        >
          <span className="text-xl">{deviceIcon}</span>
          <div className="leading-tight">
            <div className="text-[9px] uppercase tracking-wider text-stone-400">Install Official App</div>
            <div className="text-xs font-bold text-amber-300">{deviceLabel}</div>
          </div>
        </button>
      )}

      {variant === 'pill' && (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
            isInstalled
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500 text-neutral-950 border-amber-400 hover:brightness-105'
          } ${className}`}
        >
          <span>{deviceIcon}</span>
          <span>{isInstalled ? 'App Active' : deviceLabel}</span>
        </button>
      )}

      {variant === 'minimal' && (
        <button
          type="button"
          onClick={handleClick}
          className={`text-xs text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer ${className}`}
        >
          {deviceLabel}
        </button>
      )}

      <DownloadAppModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        brandPrimaryColor={primaryColor}
        brandAccentColor={accentColor}
      />
    </>
  );
};
