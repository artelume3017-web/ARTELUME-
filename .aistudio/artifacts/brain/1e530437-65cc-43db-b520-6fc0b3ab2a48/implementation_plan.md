# Studio Clean Slate, Owner Settings Cloud Sync & Delivery Challan Search Engine

Comprehensive architectural plan resolving:
1. **Zero Default Dummy Data**: Total elimination of dummy challans (`dc-demo-1`), placeholder fixtures, and artificial payments appearing when creating quotes.
2. **Owner Studio Configuration & Staff Inheritance**: The Studio Owner configures company name, 121 architectural brand colors, branch profiles, logos, and bank details. These settings are persisted to Firestore, and all staff accounts (Admin, Sales, Delivery) automatically inherit and run on the Owner's saved configuration.
3. **Delivery Challans Real-Time Cloud Sync**: Full Firestore synchronization (`companies/{companyId}/deliveryChallans`) ensuring real-time multi-device visibility, permanent deletions, and complete payment reconciliation.
4. **Quotation Name Search**: Robust search by Quotation Name (`quote.name`, `client`, `quoteNum`) across both Delivery Challans and Bank Payments passbooks.
5. **Challan Modal Lifecycle & Deduplication**: Complete form state reset on modal open, preventing stale `#DC-907` reuse, accompanied by boot-time deduplication.
6. **Dashboard Reminder System**: Quick-action KPI counter cards (`Pending Actions`, `Overdue >30d`) and the 'Pending & Overdue' command panel with 1-click 'Notify Client' follow-ups.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Please review the architectural workflows below:

- **Clean Slate (No Dummy Data on New Quote or Startup)**:
  - Quotation Builder items start empty (`[]`).
  - Catalog Fixtures starts empty (`[]`), removing the background auto-seed of `CURATED_FIXTURES`.
  - Delivery Challans starts empty (`[]`), purging `dc-demo-1` from state and localStorage.
  - Creating a quote with `AL-001` will **never** trigger dummy challans or artificial payment receipts.
- **Owner-Driven Configuration vs Staff Inheritance**:
  - The Owner logs in and sets Company Name, Branch Profiles (Artè Lume Hyderabad, Vizag, or custom), Logos, Brand Colors, and GST rates.
  - Saved to Firestore at `companies/{companyId}/settings/studioConfig`.
  - When staff (Admin, Sales, Delivery) log in, the application automatically pulls and displays the Owner's exact configuration. Staff do not see default templates.
- **Search by Quotation Name**:
  - Both the Delivery Challan view and Bank Passbook view allow searching directly by Quotation Name (e.g. "Hyderabad Villa", "Mehta Residence", "AL-001").
- **Working Deletion & Cascading Reversion**:
  - Deleting a challan removes it from localStorage and Firestore (`deleteCloudDeliveryChallan`), while reverting any associated on-delivery payment receipt from the quote and bank passbook.

---

## 1. Overview & Core Concept

### What It Delivers
1. **Pristine Studio Workspace**: New users start with 0 dummy quotations, 0 dummy fixtures, 0 dummy challans, and 0 dummy payments.
2. **Centralized Brand Authority**: The studio owner sets company branding once; all team devices automatically sync and present that exact brand identity.
3. **Full Cloud Delivery Logistics**: Delivery challans sync in real-time across owner, sales, and logistics devices via Firestore.
4. **Quotation-Centric Search**: Instant search by Quotation Name across Delivery Challans and Bank Payments.
5. **Dashboard Operational Center**: KPI strip counters and the 'Pending & Overdue' panel track aging quotes (>30 days), pending material deliveries, and due balances.

---

## 2. User Experience & Visual Design

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  OWNER STUDIO BRANDING & SETTINGS                                                      │
│  Company: [ARTÈ LUME LIGHTING STUDIO PVT LTD]                                          │
│  Brand Colors: Primary [#7b3f22] • Accent [#df9c20]                                    │
│  Branches: Jubilee Hills (Hyderabad) • Siripuram (Vizag)                               │
│  [✓ Save & Sync to All Staff Devices]                                                  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ (Synced via Firestore studioConfig)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  STAFF ACCOUNT (Sales / Delivery)                                                      │
│  • Automatically displays Owner's Company Name & Brand Colors                          │
│  • Starts clean with zero dummy quotes or dummy challans                               │
│  • Searches challans & payments by Quotation Name ("Hyderabad Villa")                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Elimination of `CURATED_FIXTURES` Auto-Seed in Firestore**:
  - *Chosen Approach*: Remove lines 86-98 in `syncService.ts` that automatically committed curated fixtures to Firestore on empty snapshot.
  - *Why*: Allows users to import and curate their own factory SKUs without unwanted fixtures cluttering the library.
- **Decision 2: Firestore Document for Studio Configuration**:
  - *Chosen Approach*: Store global studio configuration at `companies/{companyId}/settings/studioConfig`.
  - *Why*: Provides a single source of truth for branch logos, addresses, bank accounts, and colors across all team members.
- **Decision 3: Bi-Directional Search across Challans & Payments**:
  - *Chosen Approach*: Cross-reference `quoteId` and `quoteNum` with `savedQuotes` so searching by either client name or quote name resolves instantly.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Firestore Multi-Tenant Engine                             │
│  companies/{companyId}/                                                                │
│    ├── settings/studioConfig (Owner's company name, colors, branches, GST)             │
│    ├── quotations/{quoteId} (Quotation documents & payment receipts)                   │
│    ├── deliveryChallans/{dcId} (Real-time delivery dispatches)                         │
│    ├── bankTransactions/{txId} (Verified bank passbook credits & debits)               │
│    └── members/{uid} (Team staff roles: owner, admin, sales, delivery)                 │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
┌──────────────────────────────────────────┐  ┌──────────────────────────────────────────┐
│ Owner Login Session                      │  │ Staff Login Session (Admin/Sales/Logistics)│
│ - Configures company & brand options     │  │ - Inherits Owner's brand options         │
│ - Sets branches, logos & bank accounts   │  │ - Operates on clean, real data           │
│ - Saves to studioConfig in Firestore     │  │ - Searches by Quotation Name             │
└──────────────────────────────────────────┘  └──────────────────────────────────────────┘
```

---

## 5. Execution Steps
1. [x] **Remove All Auto-Seeding & Dummy Data**: 
   - Wiped `dc-demo-1` and initial demo items from `src/App.tsx`.
   - Removed `CURATED_FIXTURES` auto-seeding in `src/firebase/syncService.ts`.
   - Initialized `items: []`, `products: []`, `deliveryChallans: []`.
2. [x] **Implement Owner Studio Settings Sync**:
   - Added `subscribeToCompanyStudioConfig` and `saveCloudStudioConfig` in `src/firebase/syncService.ts`.
   - Hooked into `src/App.tsx` so staff accounts load Owner's saved settings.
3. [x] **Implement Delivery Challans Real-Time Cloud Sync**:
   - Added `subscribeToCompanyDeliveryChallans`, `saveCloudDeliveryChallan`, and `deleteCloudDeliveryChallan`.
   - Connected `handleDeleteChallan` with Firestore cloud deletion.
4. [x] **Fix Quotation Name Search**:
   - Added quotation name search in `DeliveryChallanView.tsx` and Bank Transactions view.
5. [x] **Reset Challan Modal State**:
   - Added `useEffect` on `[isOpen, challan?.id]` to prevent stale `#DC-907` reuse.
   - Enforced unique batch sequencing and global collision check (`DC-[QuoteNum]-B[Seq]`).
6. [x] **Mount Dashboard Reminder System**:
   - Inserted KPI counter cards (`Pending Actions`, `Overdue >30d`) and the 'Pending & Overdue' command panel.
   - Built and mounted `NotifyClientModal` supporting 1-click Email (`mailto:`) and WhatsApp (`wa.me`) follow-ups with quotation summary link.
7. [x] **Quotation Action Buttons Reorganization**:
   - Streamlined quotation card actions to strictly 3 exterior buttons (`Edit`, `Payment`, `Challan`), moving exports into `More Options`.
8. [x] **Verification**: Ran `lint_applet` and `compile_applet` (0 errors).
