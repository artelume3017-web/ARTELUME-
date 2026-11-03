# ARTÈ LUME LIGHTING STUDIO
## Two-Branch Operations, App Download Flow & Owner-to-Staff Access Delegation Script

---

### Executive Summary

| Capability | Specification | Operational Status |
| :--- | :--- | :--- |
| **Shared Link First Arrival** | Auto-displays **Download Official App** modal first (Google Play / App Store / PC PWA) | ✅ Active |
| **Mandatory Entry Gate** | Strict Studio Login required before accessing quotations or company records | ✅ Active |
| **Studio Branches** | Exactly **Two Branches Only**: Branch 1 (Hyderabad) & Branch 2 (Visakhapatnam) | ✅ Active |
| **Owner Authority** | Director account (`artelume3017@gmail.com`) controls both branches, pricing & staff | ✅ Active |
| **Staff Authentication** | Branch Selection + Staff Mobile/Email + 4-Digit Security PIN | ✅ Active |
| **Access Delegation** | 1-Tap WhatsApp Invitation Dispatch with pre-formatted credentials & install link | ✅ Active |
| **Branch Isolation** | Staff is strictly locked to their assigned branch (HYD vs VZG) | ✅ Active |

---

### 1. Shared Link & Download-First Flow

When you share your application link (`https://ais-pre-5yfyn57iko7wuyvu5hn5qg-715954534020.asia-east1.run.app`) with any client, contractor, or new staff member:

1. **Automatic Download App Modal Appears First**:
   - The app detects that the visitor is accessing via browser (not yet installed).
   - A storefront modal immediately opens:
     - **Android (Google Play)**: Direct installation via Chrome / Android PWA WebAPK.
     - **Apple iOS (App Store)**: Safari `Share ⎋` → `Add to Home Screen ⊞` visual guide.
     - **Windows / Mac PC**: Instant Desktop standalone application via Chrome / Edge address bar `Install ⊕`.
   - The user can tap **"📲 Install App to Home Screen"** or tap **"Proceed to Studio Login"**.

2. **Mandatory Login Gate Enforced**:
   - The user cannot view client lists, quotations, bank balances, or products until authenticated.
   - The login portal offers two distinct experiences tailored for the Studio Director and Branch Staff.

---

### 2. Two Separate Branches Architecture

Artè Lume operates strictly across two distinct studio branches:

```
                      👑 ARTÈ LUME STUDIO DIRECTOR
                       (artelume3017@gmail.com)
                                 │
        ┌────────────────────────┴────────────────────────┐
        ▼                                                 ▼
🏛️ BRANCH 1: HYDERABAD                            🌊 BRANCH 2: VISAKHAPATNAM
• Head Studio: Jubilee Hills                      • Branch Studio: Siripuram
• Quotation Prefix: AL-HYD                        • Quotation Prefix: AL-VZG
• GSTIN: 36AAACN4010N1ZW (Telangana)              • GSTIN: 37AAACN4010N1ZX (Andhra Pradesh)
• Bank: HDFC Bank Jubilee Hills                   • Bank: ICICI Bank Siripuram
• Primary Roster: Vikram (Sales), Ramesh (Logistics) • Primary Roster: Sneha (Sales), Kishore (Logistics)
```

- **Owner Perspective**: The Studio Director has an active branch switcher in the top bar and sidebar allowing seamless switching between **Branch 1 (Hyderabad)** and **Branch 2 (Vizag)**.
- **Staff Perspective**: Once a staff member signs in, their interface is strictly locked to their assigned branch (`🔒 Assigned: Branch 1 (Hyderabad)` or `🔒 Assigned: Branch 2 (Vizag)`). They cannot mistakenly view or alter the other branch's records.

---

### 3. Owner Login vs. Staff Login Structure

#### Tab A: 👑 Studio Owner Login
- **Primary Director Email**: `artelume3017@gmail.com`
- **Instant Access**: "⚡ 1-Click Director Sign In" for instant owner access on trusted devices.
- **Master Authority**:
  - Full visibility into confidential P&L Gross Margins & Net Profit.
  - Complete control over bank passbooks, cash ledgers, and supplier purchase bills.
  - Authority to add, modify, or remove staff members and change their 4-digit PINs.

#### Tab B: 👷 Staff Member Login
- **Step 1: Select Branch Studio**:
  - 🏛️ **Branch 1: Hyderabad Head Studio** (`AL-HYD`)
  - 🌊 **Branch 2: Vizag Branch Studio** (`AL-VZG`)
- **Step 2: Staff Mobile / ID**: Registered 10-digit mobile number or work email.
- **Step 3: 4-Digit Security PIN**: Secure passcode assigned by Owner (e.g., `1234`, `5678`, `4821`).
- **Quick Test Demo Buttons**:
  - `🏛️ Branch 1: Hyderabad • Vikram (Sales Lead • PIN: 1234)`
  - `🌊 Branch 2: Vizag • Sneha (Design & Sales • PIN: 5678)`

---

### 4. How the Owner Delegates Access to Staff (Step-by-Step)

```
[Owner Logs In] ──► [Opens "Team Staff & Roles"] ──► [Clicks "+ Pre-Assign New Staff"]
                                                                   │
                                                                   ▼
                                                 Fill: Name, Mobile, Branch, Role, PIN
                                                                   │
                                                                   ▼
                                                 [Click "Assign Staff & Generate Credentials"]
                                                                   │
                                                                   ▼
                                                 [Tap "📱 WhatsApp" or "📋 Copy PIN"]
                                                                   │
                                                                   ▼
                                            Staff receives formatted WhatsApp message,
                                            installs app, enters PIN, and begins work!
```

#### Step 1: Owner Opens Team Management
- Click **"👑 Team Staff & Roles"** in the top bar or sidebar.
- Switch to the **"➕ Pre-Assign New Staff"** tab.

#### Step 2: Configure Staff Credentials
1. **Assigned Branch**: Select `Branch 1: Hyderabad` OR `Branch 2: Vizag`.
2. **Staff Full Name**: e.g., `Rahul Verma`.
3. **Mobile Number (WhatsApp)**: e.g., `9849012345`.
4. **Assigned Role Tier**:
   - `💼 Sales Person`: Quotations, luminaire specs, advance booking payments.
   - `🚚 Delivery Person`: Site dispatch, delivery challans, goods handover, cash/UPI COD.
   - `🛡️ Administrator`: Accounts ledger verification, expense audits.
5. **4-Digit Access PIN**: Auto-generated or custom (e.g., `4821`). Tap **"⚡ Randomize PIN"** if desired.
6. Click **"Assign Staff & Generate Credentials"**.

#### Step 3: 1-Click WhatsApp Invite Dispatch
- In the Staff Roster card, tap **"📱 WhatsApp"**.
- This opens WhatsApp with the following pre-formatted script:

```
🏛️ *ARTÈ LUME ARCHITECTURAL LIGHTING*
*Official Staff App Access & Setup*

Hello *Rahul Verma*,
You have been granted official access to Artè Lume Studio!

📍 *Assigned Branch:* Branch 1: Hyderabad (Head Studio • Jubilee Hills)
💼 *Assigned Role:* Sales Person
📱 *Staff ID / Mobile:* 9849012345
🔒 *4-Digit Access PIN:* `4821`

📲 *STEP 1: INSTALL OFFICIAL APP*
Open the link below on your phone or PC and tap *"Install App"* to add Artè Lume to your home screen:
👉 https://ais-pre-5yfyn57iko7wuyvu5hn5qg-715954534020.asia-east1.run.app

🔑 *STEP 2: LOGIN TO YOUR BRANCH*
1. Open the Artè Lume App
2. Tap the *"Staff Sign In"* tab
3. Select *Branch 1: Hyderabad*
4. Enter your Mobile and Security PIN: `4821`

_Authorized by Studio Director (artelume3017@gmail.com)_
```

---

### 5. Role Permissions Matrix

| Feature / Workspace Action | 👑 Studio Owner | 🛡️ Administrator | 💼 Sales Person | 🚚 Delivery Person |
| :--- | :---: | :---: | :---: | :---: |
| **Quotation Builder & Spec Sheets** | Full Access | Full Access | Full Access | Read-Only |
| **Branded PDF & Excel Generation** | Full Access | Full Access | Full Access | Read-Only |
| **Booking Advance Payment Receipts** | Full Access | Full Access | Full Access | Hidden |
| **Delivery Challan Dispatch Execution** | Full Access | Full Access | Read-Only | Primary Role |
| **On-Delivery Cash & UPI Receipts** | Full Access | Full Access | Hidden | Full Access |
| **Branch Switching (HYD ⟷ VZG)** | ✅ Both Branches | 🔒 Assigned Branch | 🔒 Assigned Branch | 🔒 Assigned Branch |
| **Bank Accounts & Passbook Ledgers** | Full Audit | Audit & Verify | Hidden | Hidden |
| **Studio Purchases & Operational Expenses** | Full Access | Full Access | Hidden | Hidden |
| **Confidential P&L Profit Margins** | 🔒 Exclusive | Hidden | Hidden | Hidden |
| **Staff Member Access & PIN Delegation** | 🔒 Exclusive | Hidden | Hidden | Hidden |

---

### 6. Verification & Compilation Report

- **Static Type Checking (`tsc --noEmit`)**: Passed with 0 errors.
- **Production Build (`compile_applet`)**: Succeeded cleanly with all assets packaged.
- **Live Preview URL**: `https://ais-dev-5yfyn57iko7wuyvu5hn5qg-715954534020.asia-east1.run.app`
- **Client & Staff Share URL**: `https://ais-pre-5yfyn57iko7wuyvu5hn5qg-715954534020.asia-east1.run.app`
- **Cloud Database**: Connected to Firestore db `ai-studio-artlumearchitect-1e530437-65cc-43db-b520-6fc0b3ab2a48`.
