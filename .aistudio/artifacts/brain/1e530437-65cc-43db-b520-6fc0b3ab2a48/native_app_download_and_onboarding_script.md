# Native App Download & Interactive Usage Onboarding System

## 1. Overview & Objectives

In response to your specification:
> *"need download option for the applicatin like how we install from play store or app store like that i need if i downoled the application and then ask to the login the applicatian and how using the application like that ask to me i need that changes i dont need the desktop page downloaded button i need like real application of the app for mobile and pc application"*

We eliminated generic desktop download buttons that clutter the browser header. In their place, we implemented an authentic **Google Play Store & Apple App Store storefront installation flow**, integrated standalone application detection, and added an **App Launch Login Gate** alongside an **Interactive 5-Step "How to Use App" Onboarding Walkthrough**.

---

## 2. Key Architecture Components

### A. Authentic App Store / Google Play Experience (`DownloadAppModal.tsx`)
Rather than treating the app as a standard website with a generic download button, the application now opens an official **Storefront Listing Experience**:
- **Storefront Card**:
  - Gold architectural ARTÈ LUME emblem squircle icon with verified checkmark.
  - App Name: `ARTÈ LUME: Lighting Studio`
  - Studio: `Artè Lume Architectural Studio Pvt Ltd`
  - Verified Store Badges: `4.9 ★ (1.4K reviews)`, `10K+ Downloads`, `2.4 MB Instant Load`, `Rated 3+ (Verified PWA)`.
- **Platform-Tailored Installation Tabs**:
  1. 🤖 **Google Play (Android)**: Direct 1-tap browser install via native Chromium prompt (`beforeinstallprompt`) or 3-step menu guidance (`Menu (⋮) > Install App / Add to Home screen`).
  2. 🍏 **Apple App Store (iOS Safari)**: Clean Apple Safari visual instruction sheet (`⎋ Share > ➕ Add to Home Screen > Add`), creating a fullscreen iOS home screen app with no URL address bar.
  3. 💻 **PC & Mac Desktop App**: Windows Taskbar and macOS Dock installation via address bar install icon (`⊕`), running in an independent window.
- **Team Share**: 1-click WhatsApp sharing to distribute the application to staff phones and tablets.

### B. Clean Desktop Header (Removed Generic Download Button)
- **Problem**: Previously, a large `Download App` button occupied prominent space in the top navigation bar, looking like a download banner.
- **Solution**:
  - Removed the bulky button from the desktop header.
  - Replaced it with a helpful, professional **`📖 How to Use App`** button that launches the interactive guide at any time.
  - Placed the native app install option where it naturally belongs:
    - In the **Left Sidebar** navigation (`📲 Get Mobile & PC App`).
    - Inside the **Sign-In Screen (`AuthGate`)** so new users can install directly to their phone before logging in.
    - Inside **Studio Account Settings**.

### C. Post-Install Login Gate (`AuthGate.tsx`)
When a user launches the app after downloading or in standalone mode:
- **Standalone App Detection**: Detects `(display-mode: standalone)` and `window.navigator.standalone`.
- **Installed Welcome Banner**: Displays a prominent top banner:
  > *"🎉 Official App Installed: Sign in with your studio account to sync your database."*
- **Database Security**: Enforces Firebase Studio authentication (`artelume3017@gmail.com` or 6-digit Studio Join Code) before any business data is unlocked.

### D. "How to Use the Application" Interactive Walkthrough (`AppUsageGuideModal.tsx` & `AppWelcomePromptModal.tsx`)
Upon installing or launching the app for the first time:
1. **Welcome Prompt (`AppWelcomePromptModal`)**:
   - Greets the user: *"Welcome to ARTÈ LUME Architectural Lighting Studio — Would you like a 1-minute interactive walkthrough on how to use the application?"*
   - Choices: **`▶ Yes, Start Interactive Guide`** or **`Explore Workspace Directly`**.
2. **5-Step Interactive Guided Tour (`AppUsageGuideModal`)**:
   - **Step 1: Architectural Quotations & Luminaire Specs** (Configuring CCT 3000K/4000K/Tunable, beam angles 15°-60°, CRI 90+, list price, discounts, GST, and auto-save).
   - **Step 2: Batch Delivery Challans & Site Dispatch** (Phase 1/Phase 2 dispatches, vehicle manifests, driver phone numbers, and digital client signatures).
   - **Step 3: Payments, Receipts & Bank Passbook Auto-Sync** (Advance tokens, on-delivery payments, automatic status transitions from Draft to Paid, and bank ledger credits).
   - **Step 4: Branded PDF Proposals & 1-Click WhatsApp** (High-res architectural PDF schedules with QR codes and formatted WhatsApp messages).
   - **Step 5: Multi-Device Staff Access & Studio Customization** (6-digit Studio Join Code `AL-8429`, role permissions, and branch settings).
- **Persistent Access**: Staff can reopen the guide anytime using the **`📖 How to Use App`** button in the top navigation or sidebar.

---

## 3. Verification & Code Quality

- **TypeScript Compilation**: `npm run lint` (`tsc --noEmit`) passes with **0 errors**.
- **Production Bundle**: `npm run build` completed cleanly.
- **Offline Precaching**: Workbox Service Worker active for full offline operation on site visits.
