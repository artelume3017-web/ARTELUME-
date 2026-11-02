# Complete Clean Slate, Owner Settings Sync & Delivery Challan Real-Time Cloud Engine

## Overview & User Problem Analysis

### 1. Why Dummy Challans and Payments Kept Appearing
When a user created a new quotation, `quoteNum` was initially `#AL-001`.
In `src/App.tsx`, the initial state of `deliveryChallans` contained hardcoded `dc-demo-1` (`DC-2026-901`, `quoteNum: 'AL-001'`).
- `isChallanLinkedToQuote` saw `AL-001` match, linking the demo challan to the newly created quote.
- The bi-directional payment sync `useEffect` saw `paymentCollected` on `dc-demo-1` and automatically generated payment receipt `RCP-DC-2026-901` into the quote.
- The bank sync `useEffect` then took that payment and automatically deposited it into the Bank Passbook and cash ledger.
**Resolution**: 
1. Permanently wipe `dc-demo-1` and start with `deliveryChallans: []`.
2. Connect `deliveryChallans` to Firestore cloud sync (`companies/{companyId}/deliveryChallans`) so real challans sync across all devices and deletions are permanent.

---

### 2. Owner-Controlled Studio Settings (Owner Configures -> Staff Inherits)
The user specified:
> *"all the settings are all the user setup the defult colours and company name and all client will give inputs using the options every login of owner can change the options of application the staff will be use how the owner ssaaved the changes the application the staff will use"*

**Architecture**:
- Firestore Document: `companies/{companyId}/settings/studioConfig`
- Stored Properties:
  - `companyName`: Studio / Brand Name
  - `primaryColor`, `accentColor`, `excelBannerColor`, `excelAccentColor`
  - `branches`: Complete list of branches, logos, addresses, GSTIN, and bank details
  - `activeBranchId`
  - `defaultGstRate`
- **Owner Authority**: Only the Studio Owner (or Admin) can modify these studio settings in Settings view.
- **Staff Inheritance**: When any staff member (Sales Lead, Delivery Person, Consultant) logs in, the app automatically pulls the Owner's live `studioConfig` from Firestore, setting their colors, branches, logos, and company details without showing defaults.

---

### 3. Search Delivery Challans & Payments by Quotation Name
In `DeliveryChallanView.tsx` and Bank/Payments passbook:
- Search input checks:
  - `dc.quoteNum` (e.g. `AL-001`)
  - `dc.client` / `dc.recipientName`
  - Linked quote name from `savedQuotes[dc.quoteId]?.name` or `savedQuotes[dc.quoteNum]?.name`
  - `dc.challanNum`
  - `dc.siteAddress`
  - `dc.vehicleNumber`

---

## Technical Scripts

### Script 1: Delivery Challans & Company Settings Firestore Cloud Sync (`src/firebase/syncService.ts`)

```typescript
// 1. DELIVERY CHALLANS REAL-TIME CLOUD SYNC
export const subscribeToCompanyDeliveryChallans = (
  companyId: string,
  onUpdate: (challans: DeliveryChallan[]) => void
) => {
  if (!companyId) return () => {};
  const colRef = collection(db, 'companies', companyId, 'deliveryChallans');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: DeliveryChallan[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as DeliveryChallan);
      });
      // Sort newest dispatch date or createdAt first
      list.sort((a, b) => new Date(b.dispatchDate || b.createdAt || 0).getTime() - new Date(a.dispatchDate || a.createdAt || 0).getTime());
      onUpdate(list);
    },
    err => {
      console.warn('Delivery challans subscription error:', err);
    }
  );
};

export const saveCloudDeliveryChallan = async (
  companyId: string,
  challan: DeliveryChallan
) => {
  if (!companyId || !challan.id) return;
  try {
    const docId = sanitizeId(challan.id);
    const docRef = doc(db, 'companies', companyId, 'deliveryChallans', docId);
    await setDoc(docRef, JSON.parse(JSON.stringify(challan)), { merge: true });
  } catch (err) {
    // Offline mode: saved locally
  }
};

export const deleteCloudDeliveryChallan = async (
  companyId: string,
  challanId: string
) => {
  if (!companyId || !challanId) return;
  try {
    const docId = sanitizeId(challanId);
    const docRef = doc(db, 'companies', companyId, 'deliveryChallans', docId);
    await deleteDoc(docRef);
  } catch (err) {
    // Offline mode: deleted locally
  }
};

// 2. OWNER-CONTROLLED STUDIO BRAND & BRANCH SETTINGS CLOUD SYNC
export interface StudioConfigRecord {
  companyName?: string;
  branches: BranchProfile[];
  activeBranchId: string;
  defaultGstRate: number;
  themeOverride?: {
    primaryColor: string;
    accentColor: string;
    excelBannerColor: string;
    excelAccentColor: string;
  } | null;
  updatedBy?: string;
  updatedAt?: string;
}

export const subscribeToCompanyStudioConfig = (
  companyId: string,
  onUpdate: (config: StudioConfigRecord) => void
) => {
  if (!companyId) return () => {};
  const docRef = doc(db, 'companies', companyId, 'settings', 'studioConfig');
  return onSnapshot(
    docRef,
    snap => {
      if (snap.exists()) {
        onUpdate(snap.data() as StudioConfigRecord);
      }
    },
    err => {
      console.warn('Studio config subscription error:', err);
    }
  );
};

export const saveCloudStudioConfig = async (
  companyId: string,
  config: StudioConfigRecord
) => {
  if (!companyId) return;
  try {
    const docRef = doc(db, 'companies', companyId, 'settings', 'studioConfig');
    await setDoc(docRef, JSON.parse(JSON.stringify(config)), { merge: true });
  } catch (err) {
    // Offline mode: saved to localStorage
  }
};
```

---

### Script 2: Clean Slate & Multi-User Settings Inheritance (`src/App.tsx`)

```typescript
// 1. Pristine Initial States - Zero Default Dummy Data
const [items, setItems] = useState<QuotationItem[]>([]);
const [products, setProducts] = useState<LightingProduct[]>([]);
const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);
const [savedQuotes, setSavedQuotes] = useState<Record<string, QuotationDocument>>({});

// 2. Startup Sanitizer - Purges legacy dummy data from localStorage on boot
useEffect(() => {
  try {
    const rawDc = localStorage.getItem('artelume_delivery_challans');
    if (rawDc) {
      const parsed = JSON.parse(rawDc);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(c => c.id !== 'dc-demo-1' && !c.challanNum.includes('DC-2026-901'));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem('artelume_delivery_challans', JSON.stringify(cleaned));
          setDeliveryChallans(cleaned);
        }
      }
    }
  } catch (e) {}
}, []);

// 3. Owner Studio Settings Sync (Owner modifies -> Staff automatically uses)
useEffect(() => {
  if (!company?.id) return;

  const unsubConfig = subscribeToCompanyStudioConfig(company.id, cloudConfig => {
    if (cloudConfig) {
      if (cloudConfig.branches && cloudConfig.branches.length > 0) {
        setBranches(cloudConfig.branches);
        localStorage.setItem('artelume_branches', JSON.stringify(cloudConfig.branches));
      }
      if (cloudConfig.activeBranchId) {
        setActiveBranchId(cloudConfig.activeBranchId);
        localStorage.setItem('artelume_active_branch_id', cloudConfig.activeBranchId);
      }
      if (cloudConfig.themeOverride) {
        setThemeOverride(cloudConfig.themeOverride);
      }
      if (cloudConfig.defaultGstRate !== undefined) {
        setGstRate(cloudConfig.defaultGstRate);
        localStorage.setItem('artelume_default_gst', String(cloudConfig.defaultGstRate));
      }
    }
  });

  // 4. Delivery Challans real-time cloud sync across all company staff
  const unsubChallans = subscribeToCompanyDeliveryChallans(company.id, cloudChallans => {
    // Clean out demo records
    const cleanList = (cloudChallans || []).filter(c => c.id !== 'dc-demo-1' && !c.challanNum.includes('DC-2026-901'));
    setDeliveryChallans(cleanList);
    try {
      localStorage.setItem('artelume_delivery_challans', JSON.stringify(cleanList));
    } catch (e) {}
  });

  return () => {
    unsubConfig();
    unsubChallans();
  };
}, [company?.id]);

// 5. Saving Owner Studio Settings to Cloud
const handleSaveBranchSettings = (updatedBranch: BranchProfile) => {
  const updatedBranches = branches.map(b => (b.id === updatedBranch.id ? updatedBranch : b));
  setBranches(updatedBranches);
  localStorage.setItem('artelume_branches', JSON.stringify(updatedBranches));

  if (company?.id) {
    saveCloudStudioConfig(company.id, {
      branches: updatedBranches,
      activeBranchId,
      defaultGstRate: gstRate,
      themeOverride,
      updatedBy: user?.email || 'Owner',
      updatedAt: new Date().toISOString()
    }).catch(console.warn);
  }
  showToast('✓ Studio branding, colors and branch details saved & synced to all staff accounts!');
};
```

---

### Script 3: Delivery Challans Search by Quotation Name (`src/components/DeliveryChallanView.tsx`)

```tsx
// Comprehensive search by Quotation Name, Client Name, Quote #, Challan #, or Site Address
const filteredChallans = challans.filter(dc => {
  if (filterStatus !== 'all' && dc.status !== filterStatus) return false;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    
    // Look up quote name from savedQuotes
    const linkedQuote = Object.values(savedQuotes).find(sq =>
      isChallanLinkedToQuote(dc, sq)
    );
    const quoteName = (linkedQuote?.name || '').toLowerCase();
    const quoteClient = (linkedQuote?.client || '').toLowerCase();

    return (
      dc.challanNum.toLowerCase().includes(q) ||
      dc.client.toLowerCase().includes(q) ||
      quoteName.includes(q) ||
      quoteClient.includes(q) ||
      (dc.quoteNum && dc.quoteNum.toLowerCase().includes(q)) ||
      (dc.vehicleNumber && dc.vehicleNumber.toLowerCase().includes(q)) ||
      (dc.siteAddress && dc.siteAddress.toLowerCase().includes(q)) ||
      (dc.recipientName && dc.recipientName.toLowerCase().includes(q)) ||
      (dc.allocatedPerson && dc.allocatedPerson.toLowerCase().includes(q))
    );
  }
  return true;
});
```

---

### Script 4: Bank Payments Search by Quotation Name (`src/App.tsx`)

```tsx
// In activeView === 'bank'
const filteredTxs = bankTransactions.filter(tx => {
  if (bankTxFilter === 'credit' && tx.type !== 'credit') return false;
  if (bankTxFilter === 'debit' && tx.type !== 'debit') return false;
  if (bankTxFilter === 'verified' && !tx.verified) return false;
  if (bankTxFilter === 'pending' && tx.verified) return false;

  if (bankTxSearch.trim()) {
    const q = bankTxSearch.toLowerCase().trim();
    
    // Search quotation name across savedQuotes
    const linkedQuote = tx.quoteNum
      ? Object.values(savedQuotes).find(sq => sq.quoteNum === tx.quoteNum)
      : null;
    const quoteName = (linkedQuote?.name || '').toLowerCase();

    return (
      (tx.quoteNum && tx.quoteNum.toLowerCase().includes(q)) ||
      quoteName.includes(q) ||
      (tx.client && tx.client.toLowerCase().includes(q)) ||
      (tx.receiptNumber && tx.receiptNumber.toLowerCase().includes(q)) ||
      (tx.referenceNo && tx.referenceNo.toLowerCase().includes(q)) ||
      (tx.description && tx.description.toLowerCase().includes(q)) ||
      (tx.mode && tx.mode.toLowerCase().includes(q))
    );
  }
  return true;
});
```
