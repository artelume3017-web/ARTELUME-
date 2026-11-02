import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import {
  LightingProduct,
  QuotationDocument,
  CustomerParty,
  BranchProfile,
  CompanyMember,
  AppRole,
  BankTransaction,
  BankAccount,
  DeliveryChallan
} from '../types';

// Helper to sanitize document keys for Firestore
const sanitizeId = (str: string) => {
  return str.replace(/[\/\#\$\[\]]/g, '_').trim();
};

/**
 * 1. QUOTATIONS REAL-TIME SYNC
 */
export const subscribeToCompanyQuotations = (
  companyId: string,
  onUpdate: (quotes: Record<string, QuotationDocument>) => void
) => {
  if (!companyId) return () => {};

  const colRef = collection(db, 'companies', companyId, 'quotations');
  return onSnapshot(
    colRef,
    snapshot => {
      const quotesMap: Record<string, QuotationDocument> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as QuotationDocument;
        const key = data.name || docSnap.id;
        quotesMap[key] = data;
      });
      onUpdate(quotesMap);
    },
    err => {
      console.warn('Quotations subscription error (or permissions loading):', err);
    }
  );
};

export const saveCloudQuotation = async (
  companyId: string,
  quoteName: string,
  quoteData: QuotationDocument
) => {
  if (!companyId || !quoteName.trim()) return;
  try {
    const docId = sanitizeId(quoteName);
    const docRef = doc(db, 'companies', companyId, 'quotations', docId);
    await setDoc(docRef, JSON.parse(JSON.stringify(quoteData)), { merge: true });
  } catch (err) {
    // Offline mode: saved locally to localStorage
  }
};

export const deleteCloudQuotation = async (companyId: string, quoteName: string) => {
  if (!companyId || !quoteName.trim()) return;
  try {
    const docId = sanitizeId(quoteName);
    const docRef = doc(db, 'companies', companyId, 'quotations', docId);
    await deleteDoc(docRef);
  } catch (err) {
    // Offline mode: deleted locally from localStorage
  }
};

/**
 * 2. PRODUCTS REAL-TIME SYNC (Zero unwanted auto-seeding)
 */
export const subscribeToCompanyProducts = (
  companyId: string,
  onUpdate: (products: LightingProduct[]) => void
) => {
  if (!companyId) return () => {};

  const colRef = collection(db, 'companies', companyId, 'products');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: LightingProduct[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as LightingProduct);
      });
      onUpdate(list);
    },
    err => {
      console.warn('Products subscription error:', err);
      onUpdate([]);
    }
  );
};

export const saveCloudProduct = async (companyId: string, product: LightingProduct) => {
  if (!companyId || !product.id) return;
  try {
    const docRef = doc(db, 'companies', companyId, 'products', product.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(product)), { merge: true });
  } catch (err) {
    // Offline mode: saved locally to localStorage
  }
};

export const deleteCloudProduct = async (companyId: string, productId: string) => {
  if (!companyId || !productId) return;
  try {
    const docRef = doc(db, 'companies', companyId, 'products', productId);
    await deleteDoc(docRef);
  } catch (err) {
    // Offline mode: deleted locally from localStorage
  }
};

/**
 * 3. CUSTOMER CLIENT DIRECTORY SYNC
 */
export const subscribeToCompanyCustomers = (
  companyId: string,
  onUpdate: (customers: CustomerParty[]) => void
) => {
  if (!companyId) return () => {};
  const colRef = collection(db, 'companies', companyId, 'customers');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: CustomerParty[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || '',
          loc: data.loc || '',
          phone: data.phone,
          email: data.email
        });
      });
      onUpdate(list);
    },
    err => {
      // Offline mode: uses localStorage customers
    }
  );
};

export const saveCloudCustomer = async (companyId: string, customer: CustomerParty) => {
  const custId = customer.id || sanitizeId(customer.name);
  if (!companyId || !custId) return;
  try {
    const docRef = doc(db, 'companies', companyId, 'customers', custId);
    await setDoc(docRef, JSON.parse(JSON.stringify(customer)), { merge: true });
  } catch (err) {
    // Offline mode: saved locally to localStorage
  }
};

/**
 * 4. PUBLIC CLIENT VIEW PROPOSALS
 * Allows sharing lightweight, permanent quotation links directly with end clients.
 */
export interface PublicProposalRecord {
  id: string;
  quote: QuotationDocument;
  branch: BranchProfile;
  created: number;
  expiresAt: number;
}

export const savePublicProposal = async (record: PublicProposalRecord): Promise<void> => {
  try {
    const docRef = doc(db, 'sharedProposals', record.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(record)), { merge: true });
  } catch (err) {
    console.warn('Firestore public proposal save error:', err);
  }
};

export const getPublicProposal = async (proposalId: string): Promise<PublicProposalRecord | null> => {
  try {
    const docRef = doc(db, 'sharedProposals', proposalId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PublicProposalRecord;
    }
  } catch (err) {
    console.warn('Firestore public proposal fetch error:', err);
  }
  return null;
};

/**
 * 5. STUDIO TEAM & STAFF ROLE SYNCHRONIZATION
 */
export const DEFAULT_TEAM_MEMBERS: CompanyMember[] = [
  {
    uid: 'member_owner_main',
    email: 'artelume3017@gmail.com',
    displayName: 'Artè Lume Studio (Owner)',
    role: 'owner',
    phone: '+91 98490 12345',
    status: 'active',
    joinedAt: '2026-01-15'
  },
  {
    uid: 'member_admin_rajesh',
    email: 'admin@artelume.com',
    displayName: 'Rajesh Sharma',
    role: 'admin',
    phone: '+91 98491 55667',
    status: 'active',
    joinedAt: '2026-02-01',
    assignedBy: 'artelume3017@gmail.com'
  },
  {
    uid: 'member_sales_priya',
    email: 'sales@artelume.com',
    displayName: 'Priya Varma',
    role: 'sales',
    phone: '+91 98492 88990',
    status: 'active',
    joinedAt: '2026-02-10',
    assignedBy: 'artelume3017@gmail.com'
  },
  {
    uid: 'member_delivery_suresh',
    email: 'delivery@artelume.com',
    displayName: 'Suresh Reddy',
    role: 'delivery',
    phone: '+91 98493 11223',
    status: 'active',
    joinedAt: '2026-03-05',
    assignedBy: 'artelume3017@gmail.com'
  }
];

export const subscribeToCompanyMembers = (
  companyId: string,
  onUpdate: (members: CompanyMember[]) => void
) => {
  if (!companyId) return () => {};
  const colRef = collection(db, 'companies', companyId, 'members');
  return onSnapshot(
    colRef,
    async snapshot => {
      if (snapshot.empty) {
        // Auto-seed default team members if empty
        try {
          const batch = writeBatch(db);
          DEFAULT_TEAM_MEMBERS.forEach(m => {
            const mRef = doc(db, 'companies', companyId, 'members', m.uid);
            batch.set(mRef, m);
          });
          await batch.commit();
        } catch (e) {
          console.warn('Auto-seed members error:', e);
        }
        onUpdate(DEFAULT_TEAM_MEMBERS);
      } else {
        const list: CompanyMember[] = [];
        snapshot.forEach(d => {
          list.push({ uid: d.id, ...d.data() } as CompanyMember);
        });
        onUpdate(list);
      }
    },
    err => {
      console.warn('Members subscription error (using cached):', err);
      try {
        const cached = localStorage.getItem('artelume_team_members');
        if (cached) onUpdate(JSON.parse(cached));
        else onUpdate(DEFAULT_TEAM_MEMBERS);
      } catch {
        onUpdate(DEFAULT_TEAM_MEMBERS);
      }
    }
  );
};

export const saveCompanyMember = async (companyId: string, member: CompanyMember) => {
  if (!companyId || !member.uid) return;
  try {
    const docRef = doc(db, 'companies', companyId, 'members', member.uid);
    await setDoc(docRef, JSON.parse(JSON.stringify(member)), { merge: true });
    // Also mirror to users collection if relevant
    const userRef = doc(db, 'users', member.uid);
    await setDoc(userRef, { role: member.role, companyId, displayName: member.displayName, email: member.email }, { merge: true });
  } catch (err) {
    // Offline mode
  }
};

export const deleteCompanyMember = async (companyId: string, memberUid: string) => {
  if (!companyId || !memberUid) return;
  try {
    const docRef = doc(db, 'companies', companyId, 'members', memberUid);
    await deleteDoc(docRef);
  } catch (err) {
    // Offline mode
  }
};

/**
 * 6. BANK TRANSACTIONS & PASSBOOK REAL-TIME SYNC
 */
export const subscribeToCompanyBankTransactions = (
  companyId: string,
  onUpdate: (transactions: BankTransaction[]) => void
) => {
  if (!companyId) return () => {};
  const colRef = collection(db, 'companies', companyId, 'bankTransactions');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: BankTransaction[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as BankTransaction);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
      onUpdate(list);
    },
    err => {
      console.warn('Bank transactions subscription error:', err);
    }
  );
};

export const saveCloudBankTransaction = async (companyId: string, transaction: BankTransaction) => {
  if (!companyId || !transaction.id) return;
  try {
    const docId = sanitizeId(transaction.id);
    const docRef = doc(db, 'companies', companyId, 'bankTransactions', docId);
    await setDoc(docRef, JSON.parse(JSON.stringify(transaction)), { merge: true });
  } catch (err) {
    // Offline mode: saved locally
  }
};

export const deleteCloudBankTransaction = async (companyId: string, transactionId: string) => {
  if (!companyId || !transactionId) return;
  try {
    const docId = sanitizeId(transactionId);
    const docRef = doc(db, 'companies', companyId, 'bankTransactions', docId);
    await deleteDoc(docRef);
  } catch (err) {
    // Offline mode: deleted locally
  }
};

export const saveCloudBanks = async (companyId: string, banks: BankAccount[]) => {
  if (!companyId) return;
  try {
    const docRef = doc(db, 'companies', companyId, 'financials', 'bankAccounts');
    await setDoc(docRef, { accounts: JSON.parse(JSON.stringify(banks)), updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    // Offline mode: saved locally
  }
};

/**
 * 7. DELIVERY CHALLANS REAL-TIME SYNC & CASCADING DELETION
 */
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

/**
 * 8. OWNER-CONTROLLED STUDIO BRAND & BRANCH SETTINGS
 * When the Studio Owner configures company name, brand colors, branches, logos,
 * and GST rates, they are saved here so all staff automatically use the owner's settings.
 */
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


