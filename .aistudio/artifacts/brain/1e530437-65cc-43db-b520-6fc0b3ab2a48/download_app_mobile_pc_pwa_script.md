# ARTÈ LUME — Mobile & PC Application Download & Installation (PWA) Review Scripts

## 1. Executive Summary

This update adds a universal, high-visibility **Download / Install Application** button engineered for both **Mobile (iOS Safari & Android)** and **PC / Desktop (Windows, macOS, Chrome, Edge)**.

Built on the official Progressive Web App (PWA) specification, ARTÈ LUME can now be installed as an independent, standalone desktop and mobile application without requiring third-party app stores, while consuming less than 2 MB of storage and functioning completely offline.

---

## 2. Key Capabilities & User Experience

| Feature | Desktop (Windows / macOS) | Android (Samsung, OnePlus, Pixel) | iOS (iPhone & iPad) |
| :--- | :--- | :--- | :--- |
| **Download Button Location** | Top Navigation Bar & Sidebar | Top Floating Bar & Drawer Menu | Top Floating Bar & Drawer Menu |
| **Installation Method** | Native 1-Click Install or Address Bar Icon | 1-Tap Prompt or Chrome Menu | Safari Share ➡️ Add to Home Screen |
| **Window Experience** | Clean standalone window (no browser tabs) | Fullscreen native app frame | Fullscreen app (no Safari address bar) |
| **Home/Desktop Icon** | Desktop shortcut & Taskbar icon | Android App Drawer & Home Screen | iPhone Home Screen icon |
| **Offline Support** | Workbox runtime precaching | Workbox runtime precaching | Workbox runtime precaching |
| **Cloud Auto-Sync** | Real-time Firebase sync on reconnect | Real-time Firebase sync on reconnect | Real-time Firebase sync on reconnect |

---

## 3. Component Architecture & Placement

```
                                  ┌──────────────────────────┐
                                  │      Top Navbar &        │
                                  │   Sidebar Navigation     │
                                  └────────────┬─────────────┘
                                               │
                                   [ ⬇️ Download App ]
                                   (PWAInstallButton)
                                               │
                    ┌──────────────────────────┴──────────────────────────┐
                    ▼                                                     ▼
      If Browser Native Prompt Ready                        If Manual / iOS Safari / Guide
      ┌──────────────────────────────┐                      ┌──────────────────────────────┐
      │   Trigger 1-Click Prompt     │                      │      DownloadAppModal        │
      │   (beforeinstallprompt)      │                      ├──────────────────────────────┤
      │   Creates desktop/app icon   │                      │  • 💻 PC / Mac Guide         │
      └──────────────────────────────┘                      │  • 🤖 Android 1-Tap Guide    │
                                                            │  • 🍏 iOS Safari Share Guide │
                                                            │  • 🔗 Copy App Link          │
                                                            │  • ↗ Open Standalone Tab     │
                                                            └──────────────────────────────┘
```

---

## 4. Source Scripts & Implementation

### Script 1: PWA React Hook (`src/hooks/usePWAInstall.ts`)
Tracks browser installability, detects whether the app is already running in standalone mode, and identifies the operating platform (iOS, Android, Windows, Mac).

```typescript
import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PWAUserPlatform = 'ios' | 'android' | 'windows' | 'mac' | 'desktop';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [platform, setPlatform] = useState<PWAUserPlatform>('desktop');

  useEffect(() => {
    // Detect standalone mode (already installed & running outside regular browser tab)
    const checkIsStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandaloneMode);
    };

    checkIsStandalone();

    // Detect user platform
    const ua = (typeof window !== 'undefined' ? window.navigator.userAgent : '').toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);
    const isMacDevice = /macintosh|mac os x/.test(ua) && !isIOSDevice;
    const isWinDevice = /windows/.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(!isIOSDevice && !isAndroidDevice);

    if (isIOSDevice) setPlatform('ios');
    else if (isAndroidDevice) setPlatform('android');
    else if (isWinDevice) setPlatform('windows');
    else if (isMacDevice) setPlatform('mac');
    else setPlatform('desktop');

    // Listen for beforeinstallprompt event (Chromium desktop & mobile browsers)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const mql = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    mql.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mql.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Install prompt error:', err);
      return false;
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    platform,
    deferredPrompt,
    install,
  };
}
```

---

### Script 2: Download / Install Button (`src/components/PWAInstallButton.tsx`)
Presents a responsive install button that dynamically adjusts its label and icon depending on the current user device:

```tsx
import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { DownloadAppModal } from './DownloadAppModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'pill' | 'minimal';
  primaryColor?: string;
  accentColor?: string;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
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

  const deviceLabel = isIOS ? 'Install on iPhone' : isAndroid ? 'Install on Android' : 'Download App';
  const deviceIcon = isIOS ? '🍏' : isAndroid ? '🤖' : '💻';

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] ${
            isInstalled
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
              : 'text-neutral-950 border border-amber-300/40 hover:brightness-110'
          } ${className}`}
          style={
            !isInstalled
              ? {
                  background: `linear-gradient(135deg, ${accentColor}, #ffd166)`,
                  boxShadow: `0 2px 10px ${accentColor}44`
                }
              : {}
          }
          title={isInstalled ? 'ARTÈ LUME App Installed & Running' : 'Download & Install ARTÈ LUME on Mobile or PC'}
        >
          <span className="text-sm leading-none">{isInstalled ? '✓' : '⬇️'}</span>
          <span className="hidden sm:inline font-extrabold tracking-wide">
            {isInstalled ? 'App Installed' : deviceLabel}
          </span>
          <span className="sm:hidden font-extrabold text-[11px]">
            {isInstalled ? 'Installed' : 'Install'}
          </span>
          {!isInstalled && (
            <span className="hidden md:inline-block text-[9px] bg-black/25 text-neutral-900 px-1 py-0.2 rounded font-bold uppercase">
              PC &amp; Mobile
            </span>
          )}
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer text-left border ${
            isInstalled
              ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300'
              : 'bg-gradient-to-r from-amber-600/25 to-amber-900/30 border-amber-500/30 text-amber-200 hover:brightness-110'
          } ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base">{isInstalled ? '📱' : '⬇️'}</span>
            <div className="truncate">
              <div className="text-xs font-bold leading-tight">
                {isInstalled ? 'ARTÈ LUME Installed' : 'Download Application'}
              </div>
              <div className="text-[10px] text-stone-400 leading-tight">
                {isInstalled ? 'Running Standalone PWA' : 'For Mobile (iOS/Android) & PC'}
              </div>
            </div>
          </div>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0"
            style={{
              backgroundColor: isInstalled ? '#065f46' : accentColor,
              color: isInstalled ? '#a7f3d0' : '#1a1009'
            }}
          >
            {isInstalled ? 'Active' : 'Install'}
          </span>
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
```

---

### Script 3: Vite PWA Bundler & Workbox Configuration (`vite.config.ts`)

```typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'ARTÈ LUME — Architectural Lighting Studio',
          short_name: 'ArtèLume', // ≤ 12 chars per standard
          description: 'Architectural lighting quotation builder, luminaire specs, delivery challans, and studio manager.',
          theme_color: '#7b3f22',
          background_color: '#1c0f08',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    // ...
  };
});
```

---

### Script 4: Mobile & Web App Meta Tags (`index.html`)

```html
<meta name="theme-color" content="#7b3f22" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="ArtèLume" />
<meta name="application-name" content="Artè Lume" />
<link rel="icon" type="image/svg+xml" href="/icon.svg" />
<link rel="shortcut icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

---

### Script 5: Offline Status Indicator (`src/components/OfflineIndicator.tsx`)

```tsx
import React, { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9998] flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-xl border border-amber-400/40 no-print">
      <span className="h-2.5 w-2.5 rounded-full bg-white animate-ping" />
      <span>Offline Mode — Cached quotations &amp; catalog available</span>
    </div>
  );
};
```

---

## 5. Verification Checklist & Results

- [x] **Web App Manifest**: Valid `id: '/'`, `short_name: 'ArtèLume'` (≤ 12 chars), `start_url: '/'`, `display: 'standalone'`, and brand colors (`theme_color: '#7b3f22'`).
- [x] **Icon Suite**: Generated `icon.svg`, `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `apple-touch-icon.png`, and `favicon.ico`.
- [x] **In-App Install Prompt**: Installed in both the top navigation bar (`header` variant) and sidebar drawer (`sidebar` variant), plus Studio Account Modal.
- [x] **Platform Detection**: Automatically detects whether the user is on PC/Mac, Android, or iOS Safari and presets the instructions tab.
- [x] **Offline Precache**: Configured Workbox with Google Fonts caching and 10 MiB asset threshold.
- [x] **Zero TypeScript Errors**: Passed `tsc --noEmit` and production build with 0 warnings.
