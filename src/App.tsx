import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LightingProduct,
  QuotationItem,
  QuotationDocument,
  BranchProfile,
  BankAccount,
  BankTransaction,
  PurchaseBill,
  ExpenseRecord,
  CustomerParty,
  CashEntry,
  DeliveryChallan,
  DeliveryChallanItem,
  QuotationPaymentRecord,
  AppRole,
  CompanyMember,
  StudioNotification
} from './types';
import { CURATED_FIXTURES } from './data/fixtures';
import { exportQuotationToExcel } from './utils/excelExport';
import {
  COLOR_PALETTES,
  PALETTE_CATEGORIES,
  hexToARGB,
  hexToRgb,
  getDarkTone,
  getContrastTextColor,
  ColorPalette
} from './data/colorPalettes';
import { parseExcelSpreadsheet, ParsedSpreadsheetResult } from './utils/excelImport';
import { AuthProvider, useAuth } from './firebase/AuthContext';
import { AuthGate } from './components/AuthGate';
import {
  subscribeToCompanyQuotations,
  saveCloudQuotation,
  deleteCloudQuotation,
  subscribeToCompanyProducts,
  saveCloudProduct,
  deleteCloudProduct,
  subscribeToCompanyCustomers,
  getPublicProposal,
  subscribeToCompanyMembers,
  DEFAULT_TEAM_MEMBERS,
  subscribeToCompanyBankTransactions,
  saveCloudBankTransaction,
  deleteCloudBankTransaction,
  saveCloudBanks,
  subscribeToCompanyDeliveryChallans,
  saveCloudDeliveryChallan,
  deleteCloudDeliveryChallan,
  subscribeToCompanyStudioConfig,
  saveCloudStudioConfig,
  StudioConfigRecord
} from './firebase/syncService';
import { safeBase64ToUtf8 } from './utils/shareUtils';
import { DashboardCharts } from './components/DashboardCharts';
import { StudioAccountModal } from './components/StudioAccountModal';
import { ClientShareModal } from './components/ClientShareModal';
import { WhatsAppShareModal } from './components/WhatsAppShareModal';
import { ClientQuotationView } from './components/ClientQuotationView';
import { QuotationGalleryView } from './components/QuotationGalleryView';
import { SideStockCatalogDrawer } from './components/SideStockCatalogDrawer';
import { PdfCatalogImportModal } from './components/PdfCatalogImportModal';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { PaymentRecordModal } from './components/PaymentRecordModal';
import { DeliveryChallanModal } from './components/DeliveryChallanModal';
import { DeliveryChallanView } from './components/DeliveryChallanView';
import { MaterialMatrixModal } from './components/MaterialMatrixModal';
import { DeliveryPodCollectionModal } from './components/DeliveryPodCollectionModal';
import { TeamManagementModal } from './components/TeamManagementModal';
import { NotifyClientModal } from './components/NotifyClientModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { DownloadAppModal } from './components/DownloadAppModal';
import { AppUsageGuideModal } from './components/AppUsageGuideModal';
import { AppWelcomePromptModal } from './components/AppWelcomePromptModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  createPaymentRecordFromChallan,
  isChallanLinkedToQuote,
  getLinkedChallansForQuote,
  getQuotationAgeDays,
  classifyQuotationReminders,
  QuotationReminderMeta
} from './utils/challanAllocation';

export const DEFAULT_BRANCHES: BranchProfile[] = [
  {
    id: 'artelume',
    name: 'ARTÈ LUME',
    tagline: 'Architectural Lighting Studio',
    location: 'Jubilee Hills • Hyderabad',
    address: 'Plot No. 1345, Road No. 68, Jubilee Hills, Hyderabad, Telangana - 500033',
    gstin: '36AAACN4010N1ZW',
    email: 'contact@artelume.com',
    phone: '+91 98490 12345',
    quotePrefix: 'AL-HYD',
    theme: {
      primaryColor: '#7b3f22',
      accentColor: '#df9c20',
      excelBannerColor: 'FF7B3F22',
      excelAccentColor: 'FFDF9C20'
    },
    bankDetails: {
      accName: 'ARTÈ LUME LIGHTING STUDIO PVT LTD',
      accNo: '98765432109876',
      bankName: 'HDFC BANK',
      ifsc: 'HDFC0001234',
      branch: 'JUBILEE HILLS, HYDERABAD'
    }
  },
  {
    id: 'artelume-vizag',
    name: 'ARTÈ LUME (Vizag)',
    tagline: 'Architectural Lighting Studio',
    location: 'Siripuram • Visakhapatnam',
    address: 'Door No. 10-50-24, Siripuram Main Road, Visakhapatnam, Andhra Pradesh - 530003',
    gstin: '37AAACN4010N1ZX',
    email: 'vizag@artelume.com',
    phone: '+91 891 278 9012',
    quotePrefix: 'AL-VZG',
    theme: {
      primaryColor: '#63361c',
      accentColor: '#e09822',
      excelBannerColor: 'FF63361C',
      excelAccentColor: 'FFE09822'
    },
    bankDetails: {
      accName: 'ARTÈ LUME LIGHTING STUDIO PVT LTD',
      accNo: '98765432109888',
      bankName: 'ICICI BANK',
      ifsc: 'ICIC0002468',
      branch: 'SIRIPURAM, VISAKHAPATNAM'
    }
  }
];

const formatInr = (num: number) =>
  '₹' + (Number(num) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const money = (n: number) =>
  (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const todayStr = () => {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
};

function StudioQuotationApp() {
  const { user, userProfile, company, currentRole, switchRole, signOut, updateCompany } = useAuth();

  // Branch Management State - Pure Artè Lume or Registered Company
  const [branches, setBranches] = useState<BranchProfile[]>(() => {
    try {
      const saved = localStorage.getItem('artelume_branches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((b: any) => b.id !== 'lightcraft');
          if (filtered.length > 0) return filtered;
        }
      }
    } catch (e) {
      console.warn('Failed to load branches:', e);
    }
    return DEFAULT_BRANCHES;
  });

  const [activeBranchId, setActiveBranchId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('artelume_active_branch_id');
      if (saved && saved !== 'lightcraft') return saved;
    } catch (e) {}
    return 'artelume';
  });

  // Persistent live theme override for instant website-wide color styling
  const [themeOverride, setThemeOverride] = useState<{
    primaryColor: string;
    accentColor: string;
    excelBannerColor: string;
    excelAccentColor: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('artelume_active_theme');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Synchronize branches with company if available in Firestore
  useEffect(() => {
    if (company?.branches && Array.isArray(company.branches) && company.branches.length > 0) {
      setBranches(company.branches);
      try {
        localStorage.setItem('artelume_branches', JSON.stringify(company.branches));
      } catch (e) {}
    }
  }, [company?.branches]);

  const activeBranch = useMemo<BranchProfile>(() => {
    const found = branches.find(b => b.id === activeBranchId) || branches[0] || DEFAULT_BRANCHES[0];
    return {
      ...found,
      theme: (activeBranchId === found.id && themeOverride) ? themeOverride : (found.theme || DEFAULT_BRANCHES[0].theme)
    };
  }, [branches, activeBranchId, themeOverride]);

  // Synchronize dynamic website CSS variables on :root
  useEffect(() => {
    const root = document.documentElement;
    const primary = activeBranch.theme.primaryColor || '#7b3f22';
    const accent = activeBranch.theme.accentColor || '#df9c20';
    root.style.setProperty('--al-primary', primary);
    root.style.setProperty('--al-accent', accent);
    root.style.setProperty('--al-sidebar-bg', getDarkTone(primary, 0.14));
    root.style.setProperty('--al-topbar-bg', getDarkTone(primary, 0.20));
  }, [activeBranch.theme]);

  // Branch Settings & Logo Modal State
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string>('artelume');
  const [branchEditForm, setBranchEditForm] = useState<BranchProfile>(() => DEFAULT_BRANCHES[0]);

  // Navigation State - includes 'delivery-challans'
  const [activeView, setActiveView] = useState<
    'dashboard' | 'quotations' | 'quote-builder' | 'delivery-challans' | 'products' | 'customers' | 'purchases' | 'expenses' | 'bank' | 'cash' | 'profit' | 'settings'
  >('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));

  // Safe navigation that switches view and automatically dismisses the mobile drawer
  const navigateView = (view: typeof activeView) => {
    if (currentRole === 'delivery' && view === 'quote-builder') {
      showToast('🔒 Delivery personnel have access to Delivery Challans & Logistics.');
      setActiveView('delivery-challans');
      return;
    }
    setActiveView(view);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Studio Activity Notifications (Offline persisted in localStorage)
  const [studioNotifications, setStudioNotifications] = useState<StudioNotification[]>(() => {
    try {
      const saved = localStorage.getItem('artelume_studio_notifications');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const recordStudioNotification = (
    type: 'quotation' | 'challan' | 'payment',
    title: string,
    description: string
  ) => {
    const actorName =
      localStorage.getItem('artelume_staff_name') ||
      userProfile?.displayName ||
      user?.displayName ||
      user?.email?.split('@')[0] ||
      (currentRole === 'owner' ? 'Studio Director' : 'Staff Member');

    const newNotif: StudioNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      actorName,
      actorRole: currentRole,
      title,
      description,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      branchId: activeBranchId
    };

    setStudioNotifications(prev => {
      const next = [newNotif, ...prev.slice(0, 49)];
      try {
        localStorage.setItem('artelume_studio_notifications', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    showToast(`🔔 ${actorName}: ${title}`);
  };

  // Active Quotation State
  const [quoteNum, setQuoteNum] = useState('AL-001');
  const [quoteName, setQuoteName] = useState('');
  const [quoteStatus, setQuoteStatus] = useState<
    'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Accepted & Paid' | 'Advance Received' | 'Dispatched' | 'Delivered'
  >('Draft');
  const [client, setClient] = useState('');
  const [quoteDate, setQuoteDate] = useState(todayStr());
  // Dedicated Person Assigned to Quotation (e.g. Sales Executive, Dedicated Architect, Project In-Charge)
  const [dedicatedPerson, setDedicatedPerson] = useState<string>('Vikram Sharma (Sales Lead)');
  const [dedicatedPersonRole, setDedicatedPersonRole] = useState<string>('Sales Executive');
  const [dedicatedPersonPhone, setDedicatedPersonPhone] = useState<string>('+91 98490 12345');
  const [gstRate, setGstRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('artelume_default_gst');
      if (saved !== null) return Number(saved) || 18;
    } catch {}
    return 18;
  });

  // Column Visibility Toggles - Default Product Code, List Price & Disc %, Bank Details & Lighting Specs enabled
  const [showCode, setShowCode] = useState(true);
  const [showBeam, setShowBeam] = useState(true);     // Beam Angle
  const [showCRI, setShowCRI] = useState(true);       // CRI
  const [showIP, setShowIP] = useState(true);         // IP Rating
  const [showFinish, setShowFinish] = useState(true); // Body Finish
  const [showReflector, setShowReflector] = useState(true); // Reflector Finish
  const [showDiscount, setShowDiscount] = useState(true);
  const [showBank, setShowBank] = useState(true);
  const [bankInfo, setBankInfo] = useState(() => DEFAULT_BRANCHES[0].bankDetails);
  const [editingBankModal, setEditingBankModal] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'quote' | 'product';
    id: string;
    name: string;
  } | null>(null);

  // Quotation Items - Clean Slate
  const [items, setItems] = useState<QuotationItem[]>([]);

  // Saved Quotations & Databases
  const [savedQuotes, setSavedQuotes] = useState<Record<string, QuotationDocument>>({});
  const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
  const [products, setProducts] = useState<LightingProduct[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>(() => {
    try {
      const saved = localStorage.getItem('artelume_banks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'bank-primary',
        name: DEFAULT_BRANCHES[0].bankDetails.bankName || 'HDFC Bank',
        acct: DEFAULT_BRANCHES[0].bankDetails.accNo || '98765432109876',
        bal: 0
      }
    ];
  });
  const [purchases, setPurchases] = useState<PurchaseBill[]>(() => {
    try {
      const saved = localStorage.getItem('artelume_purchases');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    try {
      const saved = localStorage.getItem('artelume_expenses');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [customers, setCustomers] = useState<CustomerParty[]>(() => {
    try {
      const saved = localStorage.getItem('artelume_customers');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [cashEntries, setCashEntries] = useState<CashEntry[]>(() => {
    try {
      const saved = localStorage.getItem('artelume_cash');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Modals
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSpreadsheetModal, setShowSpreadsheetModal] = useState(false);
  const [showClientShareModal, setShowClientShareModal] = useState(false);
  const [showWhatsAppShareModal, setShowWhatsAppShareModal] = useState(false);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [showPdfCatalogModal, setShowPdfCatalogModal] = useState(false);
  const [quoteBuilderMode, setQuoteBuilderMode] = useState<'table' | 'gallery'>('table');
  const [matrixModalQuote, setMatrixModalQuote] = useState<QuotationDocument | null>(null);
  const [podModalTarget, setPodModalTarget] = useState<{ challan: DeliveryChallan; quote?: QuotationDocument } | null>(null);
  const [activeQuoteMenu, setActiveQuoteMenu] = useState<string | null>(null);

  // Close quotation card menu when clicking anywhere outside
  useEffect(() => {
    if (!activeQuoteMenu) return;
    const handleOutsideClick = () => setActiveQuoteMenu(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeQuoteMenu]);
  const [isSideCatalogOpen, setIsSideCatalogOpen] = useState(false);
  const [activeCatalogRowIndex, setActiveCatalogRowIndex] = useState(0);
  const [showUsageGuideModal, setShowUsageGuideModal] = useState(false);
  const [showStoreInstallModal, setShowStoreInstallModal] = useState(false);
  const [showWelcomePromptModal, setShowWelcomePromptModal] = useState<boolean>(() => {
    try {
      const dismissed = localStorage.getItem('artelume_welcome_prompt_dismissed');
      return dismissed !== 'true';
    } catch {
      return false;
    }
  });

  // Delivery Challans State - Pristine Clean Slate (Filters out legacy demo records)
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>(() => {
    try {
      const saved = localStorage.getItem('artelume_delivery_challans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(c => c.id !== 'dc-demo-1' && !c.challanNum.includes('DC-2026-901'));
        }
      }
    } catch (e) {}
    return [];
  });

  // Advance / Payment Recording Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTargetQuote, setPaymentTargetQuote] = useState<QuotationDocument | null>(null);
  const [paymentModalTab, setPaymentModalTab] = useState<'add' | 'history'>('add');

  // Bank Passbook Transactions State (Client payments via UPI/NEFT/Cheque & direct ledger entries)
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('artelume_bank_transactions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [bankTxFilter, setBankTxFilter] = useState<'all' | 'credit' | 'debit' | 'verified' | 'pending'>('all');
  const [bankTxSearch, setBankTxSearch] = useState('');
  const [showDirectBankTxModal, setShowDirectBankTxModal] = useState(false);
  const [directTxForm, setDirectTxForm] = useState<{
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    mode: BankTransaction['mode'];
    ref: string;
  }>({
    type: 'credit',
    amount: 0,
    description: '',
    mode: 'UPI',
    ref: ''
  });

  // Delivery Challan Modal State
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [editingChallan, setEditingChallan] = useState<DeliveryChallan | null>(null);
  const [challanSourceQuote, setChallanSourceQuote] = useState<QuotationDocument | null>(null);
  const [challanModalInitialTab, setChallanModalInitialTab] = useState<'edit' | 'payment' | 'slip'>('edit');

  // Pending & Overdue Reminders Panel State
  const [reminderFilterTab, setReminderFilterTab] = useState<'all' | 'overdue' | 'delivery' | 'balance'>('all');
  const [showNotifyClientModal, setShowNotifyClientModal] = useState(false);
  const [notifyClientTarget, setNotifyClientTarget] = useState<QuotationReminderMeta | null>(null);

  // Visual Progress States for Excel and PDF Exports in Quotation Builder
  const [excelProgress, setExcelProgress] = useState<{
    isExporting: boolean;
    progress: number;
    statusText: string;
    isSuccess: boolean;
  }>({
    isExporting: false,
    progress: 0,
    statusText: '',
    isSuccess: false
  });

  const [pdfProgress, setPdfProgress] = useState<{
    isExporting: boolean;
    progress: number;
    statusText: string;
    isSuccess: boolean;
  }>({
    isExporting: false,
    progress: 0,
    statusText: '',
    isSuccess: false
  });

  // Team Staff & Role Assignment State (Owner Managed)
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<CompanyMember[]>(() => {
    try {
      const saved = localStorage.getItem('artelume_team_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_TEAM_MEMBERS;
  });

  // Real-time synchronization of Studio Team members with Firestore
  useEffect(() => {
    if (!company?.id) return;
    const unsub = subscribeToCompanyMembers(company.id, members => {
      setTeamMembers(members);
      try {
        localStorage.setItem('artelume_team_members', JSON.stringify(members));
      } catch (e) {}
    });
    return () => unsub();
  }, [company?.id]);

  // Enforce Owner-assigned role & branch on staff login accounts
  useEffect(() => {
    if (!user?.email) return;
    const isOwnerAccount =
      user.email === 'artelume3017@gmail.com' || (company?.ownerId && company.ownerId === user.uid) || currentRole === 'owner';
    if (isOwnerAccount) {
      // Primary owner retains master authority over all branches
      return;
    }

    // Look up assigned role and branch in studio roster
    const assigned = teamMembers.find(
      m => m.email.toLowerCase() === user.email?.toLowerCase() || m.uid === user.uid
    );
    if (assigned) {
      if (assigned.role && assigned.role !== currentRole) {
        switchRole(assigned.role);
      }
      if (assigned.assignedBranchId && assigned.assignedBranchId !== activeBranchId) {
        switchBranch(assigned.assignedBranchId);
      }
    }
  }, [user?.email, user?.uid, company?.ownerId, teamMembers, currentRole, switchRole, activeBranchId]);

  // Gating / Role Redirection: If Delivery person logs in, auto land them on Delivery Challans portal
  useEffect(() => {
    if (currentRole === 'delivery' && (activeView === 'profit' || activeView === 'purchases' || activeView === 'expenses' || activeView === 'bank' || activeView === 'cash')) {
      setActiveView('delivery-challans');
    } else if (currentRole === 'sales' && (activeView === 'profit' || activeView === 'purchases' || activeView === 'expenses' || activeView === 'bank' || activeView === 'cash')) {
      setActiveView('quotations');
    }
  }, [currentRole, activeView]);

  // Synchronize Delivery Challans with Collected Payments (COD) strictly into their matching client quote
  useEffect(() => {
    let quotesUpdated = false;
    const nextSavedQuotes = { ...savedQuotes };

    deliveryChallans.forEach(dc => {
      const amt = Number(dc.paymentCollected) || 0;
      if (amt <= 0) return;

      const cleanChallanNum = dc.challanNum.replace(/^DC-?/i, '');
      const receiptNumber = `RCP-DC-${cleanChallanNum}`;

      // Strictly match quotation by client and quoteNum
      const matchedKey = Object.keys(nextSavedQuotes).find(k =>
        isChallanLinkedToQuote(dc, nextSavedQuotes[k], k)
      );

      if (matchedKey && nextSavedQuotes[matchedKey]) {
        const q = nextSavedQuotes[matchedKey];
        const pList = q.payments || [];
        const alreadyHasPayment = pList.some(
          p => p.receiptNumber === receiptNumber || p.id === `pay-dc-${dc.id}` || p.id === `pay-dc-${dc.challanNum}`
        );

        if (!alreadyHasPayment) {
          const newPayment: QuotationPaymentRecord = {
            id: `pay-dc-${dc.id || dc.challanNum}`,
            date: dc.dispatchDate || todayStr(),
            amount: amt,
            type: 'On-Delivery Payment',
            paymentMode: dc.paymentMode || 'UPI',
            referenceNo: dc.paymentRef || undefined,
            collectedByRole: 'delivery',
            collectedByName: dc.allocatedPerson || dc.driverName || 'Studio Dispatch Team',
            receiptNumber,
            verifiedByAdmin: false,
            notes: `Collected on site with Delivery Challan #${dc.challanNum} (Ref: ${dc.paymentRef || 'N/A'})`
          };

          const updatedPayments = [newPayment, ...pList];
          const totalPaid = updatedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
          const itemsSubtotal = (q.items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
          const grandTotal = Math.round(itemsSubtotal * (1 + (Number(q.gst) || 18) / 100));

          let newStatus = q.status;
          if (totalPaid >= grandTotal && grandTotal > 0) {
            newStatus = 'Accepted & Paid';
          } else if (totalPaid > 0 && newStatus !== 'Delivered') {
            newStatus = 'Advance Received';
          }

          nextSavedQuotes[matchedKey] = {
            ...q,
            payments: updatedPayments,
            status: newStatus
          };
          quotesUpdated = true;
        }
      }
    });

    if (quotesUpdated) {
      setSavedQuotes(nextSavedQuotes);
      try {
        localStorage.setItem('artelume_quotes', JSON.stringify(nextSavedQuotes));
      } catch (e) {}
    }
  }, [deliveryChallans, savedQuotes]);

  // Synchronize already recorded payments from saved quotes into Bank Accounts, Bank Transactions Passbook and Cash In-Hand
  useEffect(() => {
    let totalBank = 0;
    let totalCash = 0;
    const missingBankTxs: BankTransaction[] = [];

    Object.values(savedQuotes).forEach(q => {
      (q.payments || []).forEach(p => {
        if (p.paymentMode === 'Cash') {
          totalCash += Number(p.amount) || 0;
        } else {
          totalBank += Number(p.amount) || 0;
          missingBankTxs.push({
            id: `tx-${p.id || p.receiptNumber || Date.now()}`,
            bankAccountId: 'bank-primary',
            date: p.date || todayStr(),
            type: 'credit',
            amount: Number(p.amount) || 0,
            description: `Client Payment: ${q.client || q.name} (Quote #${q.quoteNum})`,
            category: 'Client Payment',
            mode: p.paymentMode,
            referenceNo: p.referenceNo,
            receiptNumber: p.receiptNumber,
            quoteNum: q.quoteNum,
            client: q.client,
            verified: p.verifiedByAdmin || false,
            createdAt: new Date().toISOString()
          });
        }
      });
    });

    // Populate bank passbook transactions from quotes
    if (missingBankTxs.length > 0) {
      setBankTransactions(prevTxs => {
        const existingReceipts = new Set(prevTxs.map(t => t.receiptNumber || t.id));
        const toAdd = missingBankTxs.filter(t => !existingReceipts.has(t.receiptNumber || t.id));
        if (toAdd.length > 0) {
          const merged = [...toAdd, ...prevTxs];
          try {
            localStorage.setItem('artelume_bank_transactions', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        }
        return prevTxs;
      });
    }

    if (totalBank > 0) {
      setBanks(prev => {
        const currentSum = prev.reduce((s, b) => s + (Number(b.bal) || 0), 0);
        if (currentSum < totalBank) {
          const updated = prev.length > 0
            ? prev.map((b, idx) => (idx === 0 ? { ...b, bal: Math.max(Number(b.bal) || 0, totalBank) } : b))
            : [
                {
                  id: 'bank-primary',
                  name: activeBranch.bankDetails?.bankName || 'HDFC Bank',
                  acct: activeBranch.bankDetails?.accNo || '98765432109876',
                  bal: totalBank
                }
              ];
          try {
            localStorage.setItem('artelume_banks', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        }
        return prev;
      });
    }

    if (totalCash > 0) {
      setCashEntries(prev => {
        const currentSum = prev.reduce((s, c) => s + (Number(c.amt) || 0), 0);
        if (currentSum < totalCash) {
          const autoEntry: CashEntry = {
            name: 'Client Advances & Cash Receipts',
            amt: totalCash,
            date: todayStr()
          };
          const updated = [autoEntry, ...prev.filter(c => c.name !== autoEntry.name)];
          try {
            localStorage.setItem('artelume_cash', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        }
        return prev;
      });
    }
  }, [savedQuotes, activeBranch]);

  // Client Read-Only View Data Detection (Supports ID lookup & safe base64 decoding)
  const [clientViewData, setClientViewData] = useState<{
    quote: QuotationDocument;
    branch: BranchProfile;
    expiresAt?: number;
    isExpired?: boolean;
  } | null>(() => {
    try {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      const isClient = params.get('view') === 'client' || params.get('clientView') === 'true';
      if (!isClient) return null;

      const expParam = params.get('exp');
      const exp = expParam ? parseInt(expParam, 10) : 0;
      const isExpired = exp > 0 && Date.now() > exp;

      // 1. Check if proposal ID is cached locally
      const proposalId = params.get('id');
      if (proposalId) {
        const cached = localStorage.getItem(`artelume_shared_${proposalId}`) || localStorage.getItem('artelume_last_shared_quote');
        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            quote: parsed.quote || parsed,
            branch: parsed.branch || DEFAULT_BRANCHES[0],
            expiresAt: parsed.expiresAt || exp || undefined,
            isExpired: parsed.expiresAt ? Date.now() > parsed.expiresAt : isExpired
          };
        }
      }

      // 2. Fallback: Parse safe UTF-8 base64 payload from URL
      const rawData = params.get('data');
      if (rawData) {
        const jsonStr = safeBase64ToUtf8(rawData) || decodeURIComponent(escape(atob(rawData)));
        if (jsonStr) {
          const parsed = JSON.parse(jsonStr);
          return {
            quote: parsed.quote || parsed,
            branch: parsed.branch || DEFAULT_BRANCHES[0],
            expiresAt: exp || undefined,
            isExpired
          };
        }
      }
    } catch (err) {
      console.error('Failed to parse client view data from URL:', err);
    }
    return null;
  });

  const [isClientProposalLoading, setIsClientProposalLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const isClient = params.get('view') === 'client' || params.get('clientView') === 'true';
    return Boolean(isClient && params.get('id') && !clientViewData);
  });

  // Fetch shared proposal from Firestore if opening via Cloud ID
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const isClient = params.get('view') === 'client' || params.get('clientView') === 'true';
    const proposalId = params.get('id');

    if (isClient && proposalId && !clientViewData) {
      setIsClientProposalLoading(true);
      getPublicProposal(proposalId).then(record => {
        if (record) {
          const isExp = record.expiresAt > 0 && Date.now() > record.expiresAt;
          setClientViewData({
            quote: record.quote,
            branch: record.branch || DEFAULT_BRANCHES[0],
            expiresAt: record.expiresAt || undefined,
            isExpired: isExp
          });
        }
      }).catch(err => {
        console.warn('Could not load public proposal from cloud:', err);
      }).finally(() => {
        setIsClientProposalLoading(false);
      });
    }
  }, [clientViewData]);

  const [isParsingSpreadsheet, setIsParsingSpreadsheet] = useState(false);
  const [parsedSpreadsheetResult, setParsedSpreadsheetResult] = useState<ParsedSpreadsheetResult | null>(null);
  const [spreadsheetImportMode, setSpreadsheetImportMode] = useState<'replace' | 'append'>('replace');
  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null);
  const spreadsheetFileInputRef = useRef<HTMLInputElement | null>(null);

  // Palette filter inside Branch Modal
  const [paletteCategory, setPaletteCategory] = useState<string>('All');
  const [paletteSearch, setPaletteSearch] = useState<string>('');

  // SKU Usage & Pricing History Modal State
  const [showSkuHistoryModal, setShowSkuHistoryModal] = useState(false);
  const [skuHistoryTarget, setSkuHistoryTarget] = useState<{
    sku: string;
    name?: string;
    itemIndex?: number;
  } | null>(null);
  const [skuHistoryClientFilter, setSkuHistoryClientFilter] = useState<string>('all');
  const [skuHistorySearch, setSkuHistorySearch] = useState<string>('');

  // Product Editing Modal State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodForm, setProdForm] = useState<Partial<LightingProduct>>({
    sku: '',
    name: '',
    category: '',
    watt: '',
    cct: '',
    beam: '',
    cri: 'CRI 95+',
    ip: 'IP20',
    finish: '',
    reflector: '',
    price: 0,
    cost: 0,
    stock: 10,
    img: ''
  });

  // Bulk Import Table State
  const [bulkRows, setBulkRows] = useState<Array<Partial<LightingProduct> & { id: string }>>([
    { id: '1', sku: '', name: '', watt: '', cct: '3000K', beam: '36°', cri: 'CRI 90+', ip: 'IP20', finish: 'White', reflector: 'Specular', price: 0, cost: 0, stock: 10, img: '' },
    { id: '2', sku: '', name: '', watt: '', cct: '3000K', beam: '36°', cri: 'CRI 90+', ip: 'IP20', finish: 'Black', reflector: 'Black Chrome', price: 0, cost: 0, stock: 10, img: '' },
    { id: '3', sku: '', name: '', watt: '', cct: '4000K', beam: '24°', cri: 'CRI 95+', ip: 'IP44', finish: 'Brass', reflector: 'Rose Gold', price: 0, cost: 0, stock: 10, img: '' }
  ]);
  const [activeBulkRowIdx, setActiveBulkRowIdx] = useState<number>(0);
  const [selectedBulkRowIds, setSelectedBulkRowIds] = useState<Set<string>>(new Set());
  const [copiedBulkImage, setCopiedBulkImage] = useState<string | null>(null);
  const [bulkFamilyFilter, setBulkFamilyFilter] = useState<string>('all');

  // Catalog Library Multi-Select
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(new Set());
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('all');
  const [catalogFinishFilter, setCatalogFinishFilter] = useState('all');
  const [catalogCriFilter, setCatalogCriFilter] = useState('all');
  const [catalogIpFilter, setCatalogIpFilter] = useState('all');
  const [catalogBeamFilter, setCatalogBeamFilter] = useState('all');

  // Active Code Dropdown
  const [activeCodeDropdown, setActiveCodeDropdown] = useState<number | null>(null);

  // Auto-Save notification
  const [autoSaveStatus, setAutoSaveStatus] = useState('● All changes saved');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDeletingRef = useRef(false);

  // Category Selector State
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const savedCategories = useMemo(() => {
    const catSet = new Set<string>([
      'COB Lights',
      'Downlights',
      'Track Lights',
      'Magnetic Lights',
      'Pendant Lights',
      'Linear Profile',
      'Strip Lights',
      'Wall Lights',
      'Outdoor & Facade',
      'Step Lights',
      'Chandeliers'
    ]);
    CURATED_FIXTURES.forEach(p => {
      if (p.category && p.category.trim()) catSet.add(p.category.trim());
    });
    products.forEach(p => {
      if (p.category && p.category.trim()) catSet.add(p.category.trim());
    });
    return Array.from(catSet).sort();
  }, [products]);

  const catalogAvailableCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();
  }, [products]);

  const catalogAvailableBeams = useMemo(() => {
    const beams = new Set<string>();
    products.forEach(p => {
      if (p.beam?.trim()) beams.add(p.beam.trim());
    });
    return Array.from(beams).sort();
  }, [products]);

  const catalogAvailableCris = useMemo(() => {
    const cris = new Set<string>();
    products.forEach(p => {
      if (p.cri?.trim()) cris.add(p.cri.trim());
    });
    return Array.from(cris).sort();
  }, [products]);

  const catalogAvailableIps = useMemo(() => {
    const ips = new Set<string>();
    products.forEach(p => {
      if (p.ip?.trim()) ips.add(p.ip.trim());
    });
    return Array.from(ips).sort();
  }, [products]);

  const filteredCatalogProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Text Search query (SKU, name, category, beam, CRI, IP, reflector, finish)
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase().trim();
        const searchPool = [
          p.sku,
          p.name,
          p.category,
          p.beam,
          p.cri,
          p.ip,
          p.reflector,
          p.finish,
          p.watt,
          p.cct,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!searchPool.includes(q)) return false;
      }

      // 2. Category filter
      if (catalogCategoryFilter !== 'all' && p.category !== catalogCategoryFilter) {
        return false;
      }

      // 3. Finish filter
      if (catalogFinishFilter !== 'all') {
        const finishLower = (p.finish || '').toLowerCase();
        if (!finishLower.includes(catalogFinishFilter.toLowerCase())) return false;
      }

      // 4. CRI Filter
      if (catalogCriFilter !== 'all') {
        const criStr = (p.cri || '').toUpperCase();
        const criNumMatch = criStr.match(/\d{2,3}/);
        const criVal = criNumMatch ? parseInt(criNumMatch[0], 10) : 0;
        if (catalogCriFilter === '90') {
          if (criVal < 90 && !criStr.includes('90') && !criStr.includes('95') && !criStr.includes('97') && !criStr.includes('98')) return false;
        } else if (catalogCriFilter === '95') {
          if (criVal < 95 && !criStr.includes('95') && !criStr.includes('97') && !criStr.includes('98')) return false;
        } else if (catalogCriFilter === '97') {
          if (criVal < 97 && !criStr.includes('97') && !criStr.includes('98')) return false;
        } else {
          if (!criStr.includes(catalogCriFilter.toUpperCase())) return false;
        }
      }

      // 5. IP Rating Filter
      if (catalogIpFilter !== 'all') {
        const ipStr = (p.ip || '').toUpperCase().replace(/\s+/g, '');
        const targetIp = catalogIpFilter.toUpperCase().replace(/\s+/g, '');
        if (catalogIpFilter === 'IP20') {
          const isIp20 = ipStr.includes('IP20') || (!p.ip && !p.category.toLowerCase().includes('outdoor') && !p.category.toLowerCase().includes('facade'));
          if (!isIp20) return false;
        } else {
          if (!ipStr.includes(targetIp)) return false;
        }
      }

      // 6. Beam Angle Filter
      if (catalogBeamFilter !== 'all') {
        const beamStr = (p.beam || '').toLowerCase();
        const beamNumMatch = beamStr.match(/\d+/);
        const beamDeg = beamNumMatch ? parseInt(beamNumMatch[0], 10) : null;

        if (catalogBeamFilter === 'narrow') {
          if (beamDeg !== null) {
            if (beamDeg > 20) return false;
          } else if (!beamStr.includes('10') && !beamStr.includes('15') && !beamStr.includes('20') && !beamStr.includes('narrow') && !beamStr.includes('spot')) {
            return false;
          }
        } else if (catalogBeamFilter === 'medium') {
          if (beamDeg !== null) {
            if (beamDeg <= 20 || beamDeg > 38) return false;
          } else if (!beamStr.includes('24') && !beamStr.includes('30') && !beamStr.includes('36') && !beamStr.includes('medium') && !beamStr.includes('flood')) {
            return false;
          }
        } else if (catalogBeamFilter === 'wide') {
          if (beamDeg !== null) {
            if (beamDeg < 40) return false;
          } else if (!beamStr.includes('40') && !beamStr.includes('45') && !beamStr.includes('50') && !beamStr.includes('60') && !beamStr.includes('wide')) {
            return false;
          }
        } else if (catalogBeamFilter === 'diffused') {
          if (!beamStr.includes('diffus') && !beamStr.includes('linear') && !beamStr.includes('120') && !beamStr.includes('opal') && !beamStr.includes('general')) {
            return false;
          }
        } else {
          if (!beamStr.includes(catalogBeamFilter.toLowerCase())) return false;
        }
      }

      return true;
    });
  }, [products, catalogSearch, catalogCategoryFilter, catalogFinishFilter, catalogCriFilter, catalogIpFilter, catalogBeamFilter]);

  const hasActiveCatalogFilters =
    Boolean(catalogSearch.trim()) ||
    catalogCategoryFilter !== 'all' ||
    catalogFinishFilter !== 'all' ||
    catalogCriFilter !== 'all' ||
    catalogIpFilter !== 'all' ||
    catalogBeamFilter !== 'all';

  const resetCatalogFilters = () => {
    setCatalogSearch('');
    setCatalogCategoryFilter('all');
    setCatalogFinishFilter('all');
    setCatalogCriFilter('all');
    setCatalogIpFilter('all');
    setCatalogBeamFilter('all');
  };

  const filteredSavedQuotes = useMemo(() => {
    const query = quoteSearchQuery.toLowerCase().trim();
    let entries = Object.entries(savedQuotes);

    // Strict Branch Isolation: Staff members only see quotations for their assigned branch
    if (currentRole !== 'owner') {
      entries = entries.filter(([_, q]) => {
        const qBranchId = q.branchId || (q.quoteNum?.startsWith('AL-VZG') ? 'artelume-vizag' : 'artelume');
        return qBranchId === activeBranchId;
      });
    }

    if (!query) return entries;
    return entries.filter(([name, q]) => {
      const projectTitle = (name || '').toLowerCase();
      const clientName = (q.client || '').toLowerCase();
      const quoteNumber = (q.quoteNum || '').toLowerCase();
      return projectTitle.includes(query) || clientName.includes(query) || quoteNumber.includes(query);
    });
  }, [savedQuotes, quoteSearchQuery, currentRole, activeBranchId]);

  const displayedDeliveryChallans = useMemo(() => {
    if (currentRole === 'owner') return deliveryChallans;
    return deliveryChallans.filter(c => {
      const cBranchId = c.branchId || (c.challanNum?.includes('VZG') ? 'artelume-vizag' : 'artelume');
      return cBranchId === activeBranchId;
    });
  }, [deliveryChallans, currentRole, activeBranchId]);


  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. Initial Load from localStorage & Clean Slate
  useEffect(() => {
    // Load products - Clean Slate (No automatic CURATED_FIXTURES injection)
    try {
      const storedProds = localStorage.getItem('artelume_products');
      if (storedProds) {
        setProducts(JSON.parse(storedProds));
      } else {
        setProducts([]);
        localStorage.setItem('artelume_products', JSON.stringify([]));
      }
    } catch {
      setProducts([]);
    }

    // Startup deduplication for delivery challans (resolves duplicate #DC-907 and removes legacy demo records)
    try {
      const rawDc = localStorage.getItem('artelume_delivery_challans');
      if (rawDc) {
        const parsed = JSON.parse(rawDc);
        if (Array.isArray(parsed)) {
          const seen = new Map<string, DeliveryChallan>();
          let hasDups = false;
          parsed.forEach((c: DeliveryChallan) => {
            const numKey = (c.challanNum || '').trim().toLowerCase();
            if (!numKey || c.id === 'dc-demo-1' || c.challanNum.includes('DC-2026-901')) {
              hasDups = true;
              return;
            }
            if (seen.has(numKey)) {
              hasDups = true;
              const existing = seen.get(numKey)!;
              const existingTime = new Date(existing.createdAt || 0).getTime();
              const currentTime = new Date(c.createdAt || 0).getTime();
              if (currentTime > existingTime) {
                seen.set(numKey, c);
              }
            } else {
              seen.set(numKey, c);
            }
          });
          const deduped = Array.from(seen.values());
          if (hasDups || deduped.length !== parsed.length) {
            localStorage.setItem('artelume_delivery_challans', JSON.stringify(deduped));
            setDeliveryChallans(deduped);
          }
        }
      }
    } catch (e) {}

    // Clean up Lightcraft from storage if present
    try {
      if (localStorage.getItem('artelume_active_branch_id') === 'lightcraft') {
        localStorage.setItem('artelume_active_branch_id', 'artelume');
      }
      const rawBr = localStorage.getItem('artelume_branches');
      if (rawBr) {
        const parsed = JSON.parse(rawBr);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((b: any) => b.id !== 'lightcraft');
          localStorage.setItem('artelume_branches', JSON.stringify(filtered));
          setBranches(filtered.length ? filtered : DEFAULT_BRANCHES);
        }
      }
    } catch (e) {}

    // Load saved quotes
    try {
      const loadedQuotes: Record<string, QuotationDocument> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('artelume_q_')) {
          const name = k.replace('artelume_q_', '');
          const val = JSON.parse(localStorage.getItem(k) || '{}');
          loadedQuotes[name] = val;
        }
      }
      setSavedQuotes(loadedQuotes);
    } catch (e) {
      console.error(e);
    }

    // Load accounting records
    try {
      setBanks(JSON.parse(localStorage.getItem('artelume_banks') || '[]'));
      setPurchases(JSON.parse(localStorage.getItem('artelume_purchases') || '[]'));
      setExpenses(JSON.parse(localStorage.getItem('artelume_expenses') || '[]'));
      setCustomers(JSON.parse(localStorage.getItem('artelume_customers') || '[]'));
      setCashEntries(JSON.parse(localStorage.getItem('artelume_cash') || '[]'));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Multi-Device Cloud Real-Time Sync via Firestore (Per-Company Isolated)
  useEffect(() => {
    if (!company?.id) return;

    // 1. Quotations real-time sync across all devices logged into this company
    const unsubQuotes = subscribeToCompanyQuotations(company.id, cloudQuotes => {
      if (cloudQuotes && Object.keys(cloudQuotes).length > 0) {
        setSavedQuotes(prev => ({ ...prev, ...cloudQuotes }));
      }
    });

    // 2. Product catalog real-time sync
    const unsubProducts = subscribeToCompanyProducts(company.id, cloudProds => {
      if (cloudProds) {
        setProducts(cloudProds);
      }
    });

    // 3. Client directory real-time sync
    const unsubCustomers = subscribeToCompanyCustomers(company.id, cloudCusts => {
      if (cloudCusts && cloudCusts.length > 0) {
        setCustomers(cloudCusts);
      }
    });

    // 4. Bank passbook transactions real-time sync
    const unsubBankTxs = subscribeToCompanyBankTransactions(company.id, cloudTxs => {
      if (cloudTxs && cloudTxs.length > 0) {
        setBankTransactions(prev => {
          const mergedMap = new Map<string, BankTransaction>();
          prev.forEach(t => mergedMap.set(t.id, t));
          cloudTxs.forEach(t => mergedMap.set(t.id, t));
          const result = Array.from(mergedMap.values());
          result.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
          try {
            localStorage.setItem('artelume_bank_transactions', JSON.stringify(result));
          } catch (e) {}
          return result;
        });
      }
    });

    // 5. Delivery Challans real-time sync across company devices
    const unsubChallans = subscribeToCompanyDeliveryChallans(company.id, cloudChallans => {
      if (cloudChallans) {
        const cleanList = cloudChallans.filter(c => c.id !== 'dc-demo-1' && !c.challanNum.includes('DC-2026-901'));
        setDeliveryChallans(cleanList);
        try {
          localStorage.setItem('artelume_delivery_challans', JSON.stringify(cleanList));
        } catch (e) {}
      }
    });

    // 6. Studio Branding & Settings sync (Owner configures -> all staff devices automatically inherit)
    const unsubStudioConfig = subscribeToCompanyStudioConfig(company.id, cloudConfig => {
      if (cloudConfig) {
        if (cloudConfig.branches && cloudConfig.branches.length > 0) {
          setBranches(cloudConfig.branches);
          try {
            localStorage.setItem('artelume_branches', JSON.stringify(cloudConfig.branches));
          } catch (e) {}
        }
        if (cloudConfig.activeBranchId) {
          setActiveBranchId(cloudConfig.activeBranchId);
          try {
            localStorage.setItem('artelume_active_branch_id', cloudConfig.activeBranchId);
          } catch (e) {}
        }
        if (cloudConfig.themeOverride) {
          setThemeOverride(cloudConfig.themeOverride);
        }
        if (cloudConfig.defaultGstRate !== undefined) {
          setGstRate(cloudConfig.defaultGstRate);
          try {
            localStorage.setItem('artelume_default_gst', String(cloudConfig.defaultGstRate));
          } catch (e) {}
        }
      }
    });

    return () => {
      unsubQuotes();
      unsubProducts();
      unsubCustomers();
      unsubBankTxs();
      unsubChallans();
      unsubStudioConfig();
    };
  }, [company?.id]);

  // 2. Debounced Auto-Save (LocalStorage + Firestore Cloud Sync)
  useEffect(() => {
    if (isDeletingRef.current) return;
    if (activeView !== 'quote-builder') return;
    if (!client.trim() && !quoteName.trim()) return;

    setAutoSaveStatus('● Saving changes...');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      if (isDeletingRef.current) return;
      const currentName = (client.trim() || quoteName.trim() || `Quotation ${quoteNum}`).trim();
      const doc: QuotationDocument = {
        quoteNum,
        name: currentName,
        status: quoteStatus,
        client: currentName,
        date: quoteDate,
        gst: gstRate,
        items,
        showCode,
        showSpecs: showBeam && showFinish,
        showBeam,
        showCRI,
        showIP,
        showFinish,
        showReflector,
        showDiscount,
        showBank,
        bankDetails: bankInfo,
        branchId: activeBranch.id,
        branch: activeBranch,
        dedicatedPerson,
        dedicatedPersonRole,
        dedicatedPersonPhone
      };

      try {
        localStorage.setItem(`artelume_q_${currentName}`, JSON.stringify(doc));
        setSavedQuotes(prev => ({ ...prev, [currentName]: doc }));
        setAutoSaveStatus(`✓ Saved & Synced (${currentName})`);

        // Cloud sync to Firestore if user belongs to an organization
        if (company?.id) {
          saveCloudQuotation(company.id, currentName, doc).catch(err => {
            console.warn('Cloud quotation save warning:', err);
          });
        }
      } catch (err) {
        console.error(err);
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [quoteNum, quoteName, quoteStatus, client, quoteDate, gstRate, items, showCode, showBeam, showCRI, showIP, showFinish, showReflector, showDiscount, showBank, bankInfo, activeBranch, activeView, dedicatedPerson, dedicatedPersonRole, dedicatedPersonPhone]);

  // Calculation Math
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0);
  const taxHalf = (subtotal * (gstRate / 100)) / 2;
  const grandTotal = subtotal + taxHalf * 2;

  // Row Manipulation
  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === 'qty' || field === 'listPrice' || field === 'discount' || field === 'price') {
      const numVal = Number(value) || 0;
      (item as any)[field] = numVal;

      if (field === 'listPrice' || field === 'discount') {
        const lp = field === 'listPrice' ? numVal : item.listPrice;
        const disc = field === 'discount' ? numVal : item.discount;
        item.price = lp * (1 - disc / 100);
      } else if (field === 'price' && item.listPrice > 0) {
        item.discount = Math.max(0, ((item.listPrice - numVal) / item.listPrice) * 100);
      }
    } else {
      (item as any)[field] = value;
    }

    // Auto-match SKU if code changed
    if (field === 'sku') {
      const clean = String(value).trim().toLowerCase();
      const match = products.find(p => p.sku.toLowerCase() === clean);
      if (match) {
        item.name = match.name;
        item.watt = match.watt;
        item.cct = match.cct;
        item.beam = match.beam;
        item.cri = match.cri;
        item.ip = match.ip;
        item.finish = match.finish;
        item.reflector = match.reflector;
        item.listPrice = match.price;
        item.price = match.price * (1 - (item.discount || 0) / 100);
        if (match.img) item.img = match.img;
      }
    }

    updated[index] = item;
    setItems(updated);
  };

  const handlePopulateRowFromStock = (rowIndex: number, product: LightingProduct) => {
    setItems(prevItems => {
      const updated = [...prevItems];
      if (!updated[rowIndex]) {
        updated[rowIndex] = {
          id: `item-${Date.now()}`,
          sku: '',
          name: '',
          category: 'Downlights',
          watt: '',
          cct: '3000K',
          beam: '24°',
          cri: 'CRI 90+',
          ip: 'IP20',
          finish: 'Matte White',
          reflector: 'Specular',
          qty: 1,
          listPrice: 0,
          discount: 0,
          price: 0,
          img: ''
        };
      }
      const target = { ...updated[rowIndex] };
      target.sku = product.sku || target.sku;
      target.name = product.name || target.name;
      target.category = product.category || target.category;
      if (product.watt) target.watt = product.watt;
      if (product.cct) target.cct = product.cct;
      if (product.beam) target.beam = product.beam;
      if (product.cri) target.cri = product.cri;
      if (product.ip) target.ip = product.ip;
      if (product.finish) target.finish = product.finish;
      if (product.reflector) target.reflector = product.reflector;
      if (product.img) target.img = product.img;
      const unitPrice = Number(product.price) || 0;
      target.listPrice = unitPrice;
      target.discount = 0;
      target.price = unitPrice;
      updated[rowIndex] = target;
      return updated;
    });
    showToast(`✓ Row #${rowIndex + 1} populated with ${product.sku} (${formatInr(product.price)})`);
  };

  const addBlankRow = () => {
    const newIdx = items.length;
    setActiveCatalogRowIndex(newIdx);
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        sku: '',
        name: '',
        category: 'COB Lights',
        watt: '',
        cct: '3000K',
        beam: '36°',
        cri: 'CRI 90+',
        ip: 'IP20',
        finish: 'Matte White',
        reflector: 'Specular',
        qty: 1,
        listPrice: 0,
        discount: 0,
        price: 0,
        img: ''
      }
    ]);
  };

  const removeRow = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated.length ? updated : []);
  };

  const handleImagePaste = (e: React.ClipboardEvent, index: number) => {
    const clipItems = e.clipboardData.items;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.startsWith('image/')) {
        const file = clipItems[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = evt => {
            if (evt.target?.result) {
              handleItemChange(index, 'img', evt.target.result as string);
              showToast('Image attached from clipboard!');
            }
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = evt => {
        if (evt.target?.result) {
          handleItemChange(index, 'img', evt.target.result as string);
          showToast('Image uploaded successfully!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Keyboard Navigation: Enter / Down / Tab auto-row
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, rowIndex: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (rowIndex === items.length - 1) {
        addBlankRow();
      }
    }
  };

  // Save / Load Quotes
  const openSavedQuote = (name: string) => {
    const q = savedQuotes[name];
    if (!q) return;

    if (q.branchId) {
      setActiveBranchId(q.branchId);
      try {
        localStorage.setItem('artelume_active_branch_id', q.branchId);
      } catch (e) {}
    }
    setQuoteNum(q.quoteNum || `${activeBranch.quotePrefix}-001`);
    const unifiedName = q.client || q.name || name;
    setQuoteName(unifiedName);
    setQuoteStatus(q.status || 'Draft');
    setClient(unifiedName);
    setQuoteDate(q.date || todayStr());
    setGstRate(Number(q.gst) || 18);
    setDedicatedPerson(q.dedicatedPerson || 'Vikram Sharma (Sales Lead)');
    setDedicatedPersonRole(q.dedicatedPersonRole || 'Sales Executive');
    setDedicatedPersonPhone(q.dedicatedPersonPhone || '+91 98490 12345');
    setShowCode(q.showCode ?? false);
    setShowBeam(q.showBeam ?? q.showSpecs ?? false);
    setShowCRI(q.showCRI ?? false);
    setShowIP(q.showIP ?? false);
    setShowFinish(q.showFinish ?? q.showSpecs ?? false);
    setShowReflector(q.showReflector ?? false);
    setShowDiscount(q.showDiscount ?? false);
    setShowBank(q.showBank ?? false);
    if (q.bankDetails) setBankInfo(q.bankDetails);
    setItems(q.items || []);
    setActiveView('quote-builder');
    showToast(`Loaded quotation: ${name}`);
  };

  const deleteSavedQuote = (name: string) => {
    setDeleteConfirmTarget({ type: 'quote', id: name, name });
  };

  const handleExecuteDeleteQuote = (name: string) => {
    isDeletingRef.current = true;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    localStorage.removeItem(`artelume_q_${name}`);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('artelume_q_')) {
        const quoteKey = k.replace('artelume_q_', '');
        if (quoteKey === name || quoteKey.trim() === name.trim()) {
          localStorage.removeItem(k);
        }
      }
    }

    setSavedQuotes(prev => {
      const updated = { ...prev };
      delete updated[name];
      Object.keys(updated).forEach(k => {
        if (k.trim() === name.trim()) {
          delete updated[k];
        }
      });
      return updated;
    });

    const activeCurrentName = quoteName.trim() || `${client || 'Untitled Client'} ${quoteDate}`;
    if (quoteName === name || activeCurrentName === name) {
      setQuoteName('');
      setClient('');
      const nextNum = `QT-${String(Math.max(1, Object.keys(savedQuotes).length)).padStart(3, '0')}`;
      setQuoteNum(nextNum);
      setItems([
        {
          id: `item-${Date.now()}`,
          sku: '',
          name: '',
          category: 'COB Lights',
          watt: '',
          cct: '3000K',
          beam: '36°',
          cri: 'CRI 90+',
          ip: 'IP20',
          finish: 'Matte White',
          qty: 1,
          listPrice: 0,
          discount: 0,
          price: 0,
          img: ''
        }
      ]);
      setShowCode(false);
      setShowBeam(false);
      setShowCRI(false);
      setShowIP(false);
      setShowFinish(false);
      setShowDiscount(false);
      setShowBank(false);
      setActiveView('quotations');
    }

    // Delete from Firestore cloud if user is signed into a company
    if (company?.id) {
      deleteCloudQuotation(company.id, name).catch(err => {
        console.warn('Cloud delete quotation error:', err);
      });
    }

    setTimeout(() => {
      isDeletingRef.current = false;
    }, 2000);

    showToast(`Quotation "${name}" deleted.`);
  };

  // Switch Active Branch
  const switchBranch = (branchId: string) => {
    setActiveBranchId(branchId);
    try {
      localStorage.setItem('artelume_active_branch_id', branchId);
    } catch (e) {}
    const targetBranch = branches.find(b => b.id === branchId);
    if (targetBranch) {
      setBankInfo(targetBranch.bankDetails);
      setThemeOverride(targetBranch.theme);
      try {
        localStorage.setItem('artelume_active_theme', JSON.stringify(targetBranch.theme));
      } catch (e) {}
      // Update quote number prefix if matching standard prefix pattern
      if (quoteNum.includes('-')) {
        const numPart = quoteNum.replace(/^[A-Za-z0-9_-]+-/, '');
        setQuoteNum(`${targetBranch.quotePrefix}-${numPart || '001'}`);
      }
      showToast(`Active Branch: ${targetBranch.name} (${targetBranch.location.split('•')[1]?.trim() || targetBranch.location})`);
    }
  };

  // Open Branch Settings & Logo Modal
  const openBranchSettings = (branchId?: string) => {
    const bId = branchId || activeBranchId;
    setEditingBranchId(bId);
    const target = branches.find(b => b.id === bId) || branches[0];
    setBranchEditForm(JSON.parse(JSON.stringify(target)));
    setShowBranchModal(true);
  };

  // Switch Editing Branch Tab inside Modal
  const switchEditingBranchTab = (branchId: string) => {
    setEditingBranchId(branchId);
    const target = branches.find(b => b.id === branchId) || branches[0];
    setBranchEditForm(JSON.parse(JSON.stringify(target)));
  };

  // Add a new branch
  const addNewBranch = () => {
    const cityIndex = branches.length + 1;
    const cities = [
      { name: 'ARTÈ LUME (Bengaluru)', loc: 'Indiranagar • Bengaluru', pfx: 'AL-BLR', st: '29', bank: 'AXIS BANK' },
      { name: 'ARTÈ LUME (Mumbai)', loc: 'Bandra West • Mumbai', pfx: 'AL-BOM', st: '27', bank: 'KOTAK MAHINDRA BANK' },
      { name: 'ARTÈ LUME (Delhi NCR)', loc: 'Mehrauli • New Delhi', pfx: 'AL-DEL', st: '07', bank: 'HDFC BANK' },
      { name: 'ARTÈ LUME (Chennai)', loc: 'Khader Nawaz Khan Road • Chennai', pfx: 'AL-MAA', st: '33', bank: 'ICICI BANK' },
      { name: 'ARTÈ LUME (Dubai)', loc: 'Design District (d3) • Dubai', pfx: 'AL-DXB', st: 'AE', bank: 'EMIRATES NBD' }
    ];
    const cityInfo = cities[(cityIndex - 2) % cities.length] || {
      name: `ARTÈ LUME (Studio ${cityIndex})`,
      loc: `Studio Branch • Location ${cityIndex}`,
      pfx: `AL-0${cityIndex}`,
      st: '36',
      bank: 'HDFC BANK'
    };
    const newId = `branch_${Date.now()}`;
    const newBranch: BranchProfile = {
      id: newId,
      name: cityInfo.name,
      tagline: 'Architectural Lighting Studio',
      location: cityInfo.loc,
      address: `Experience Studio, ${cityInfo.loc.split('•')[0]?.trim() || 'Studio Road'}, City Center`,
      gstin: `${cityInfo.st}AAACN4010N1Z${cityIndex}`,
      email: `${cityInfo.pfx.toLowerCase().replace(/[^a-z]/g, '')}@artelume.com`,
      phone: '+91 98490 12345',
      quotePrefix: cityInfo.pfx,
      theme: COLOR_PALETTES[(cityIndex * 7) % COLOR_PALETTES.length]?.colors
        ? {
            primaryColor: COLOR_PALETTES[(cityIndex * 7) % COLOR_PALETTES.length].primary,
            accentColor: COLOR_PALETTES[(cityIndex * 7) % COLOR_PALETTES.length].accent,
            excelBannerColor: COLOR_PALETTES[(cityIndex * 7) % COLOR_PALETTES.length].excelBannerColor,
            excelAccentColor: COLOR_PALETTES[(cityIndex * 7) % COLOR_PALETTES.length].excelAccentColor
          }
        : DEFAULT_BRANCHES[0].theme,
      bankDetails: {
        accName: 'ARTÈ LUME LIGHTING STUDIO PVT LTD',
        accNo: `9876543210${String(9000 + cityIndex)}`,
        bankName: cityInfo.bank,
        ifsc: `${cityInfo.bank.slice(0, 4)}000${1000 + cityIndex}`,
        branch: cityInfo.loc.toUpperCase()
      }
    };
    const updated = [...branches, newBranch];
    setBranches(updated);
    try {
      localStorage.setItem('artelume_branches', JSON.stringify(updated));
    } catch (e) {}
    setEditingBranchId(newId);
    setBranchEditForm(newBranch);
    if (company?.id) {
      updateCompany({ branches: updated as any }).catch(e => console.warn(e));
    }
    showToast(`Created new branch "${newBranch.name}"! You can now configure separate branding, logo, 121 color plates, and bank details.`);
  };

  // Delete a branch
  const deleteBranch = (branchId: string) => {
    if (branches.length <= 1) {
      showToast('Cannot delete the primary studio branch.');
      return;
    }
    const branchToDelete = branches.find(b => b.id === branchId);
    const updated = branches.filter(b => b.id !== branchId);
    setBranches(updated);
    try {
      localStorage.setItem('artelume_branches', JSON.stringify(updated));
    } catch (e) {}
    if (activeBranchId === branchId) {
      switchBranch(updated[0].id);
    }
    switchEditingBranchTab(updated[0].id);
    if (company?.id) {
      updateCompany({ branches: updated as any }).catch(e => console.warn(e));
    }
    showToast(`Deleted branch "${branchToDelete?.name || branchId}".`);
  };

  // 1-Click Master Theme & Color Plate Applicator (for all 121 plates)
  const applyColorPlateTheme = (p: ColorPalette, showNotice = true) => {
    const newTheme = {
      primaryColor: p.primary,
      accentColor: p.accent,
      excelBannerColor: p.excelBannerColor,
      excelAccentColor: p.excelAccentColor
    };

    const targetBranchId = branchEditForm.id || editingBranchId || activeBranchId;

    // 1. Keep branchEditForm in sync so modal reflects the choice for this specific branch
    setBranchEditForm(prev => ({
      ...prev,
      theme: newTheme
    }));

    // 2. Update branches state and localStorage
    const updatedBranches = branches.map(b => {
      if (b.id === targetBranchId) {
        return { ...b, theme: newTheme };
      }
      return b;
    });
    setBranches(updatedBranches);
    try {
      localStorage.setItem('artelume_branches', JSON.stringify(updatedBranches));
    } catch (e) {}

    // 3. If configuring the active branch, apply live to website immediately
    if (targetBranchId === activeBranchId || branches.length === 1) {
      setThemeOverride(newTheme);
      try {
        localStorage.setItem('artelume_active_theme', JSON.stringify(newTheme));
      } catch (e) {}

      if (company?.id) {
        updateCompany({ theme: newTheme, branches: updatedBranches as any }).catch(err => {
          console.warn('Could not sync theme to company Firestore:', err);
        });
      }
    } else {
      if (company?.id) {
        updateCompany({ branches: updatedBranches as any }).catch(err => {
          console.warn('Could not sync branches to company Firestore:', err);
        });
      }
    }

    if (showNotice) {
      showToast(`🎨 Applied Color Plate #${String(p.id).padStart(2, '0')} "${p.name}" to ${branchEditForm.name || 'Branch'}!`);
    }
  };

  // Save Branch Settings Changes
  const saveBranchEdits = async () => {
    const updated = branches.map(b => (b.id === branchEditForm.id ? { ...branchEditForm } : b));
    setBranches(updated);
    try {
      localStorage.setItem('artelume_branches', JSON.stringify(updated));
    } catch (e) {}

    if (activeBranchId === branchEditForm.id || branches.length === 1) {
      setBankInfo(branchEditForm.bankDetails);
      setThemeOverride(branchEditForm.theme);
      try {
        localStorage.setItem('artelume_active_theme', JSON.stringify(branchEditForm.theme));
      } catch (e) {}
    }

    if (company?.id) {
      try {
        await updateCompany({
          branches: updated as any,
          ...(activeBranchId === branchEditForm.id
            ? {
                name: branchEditForm.name,
                tagline: branchEditForm.tagline,
                location: branchEditForm.location,
                address: branchEditForm.address,
                gstin: branchEditForm.gstin,
                email: branchEditForm.email,
                phone: branchEditForm.phone,
                quotePrefix: branchEditForm.quotePrefix,
                theme: branchEditForm.theme,
                bankDetails: branchEditForm.bankDetails,
                logoUrl: branchEditForm.logoUrl
              }
            : {})
        });
        await saveCloudStudioConfig(company.id, {
          companyName: branchEditForm.name,
          branches: updated,
          activeBranchId,
          defaultGstRate: gstRate,
          themeOverride: branchEditForm.theme,
          updatedBy: user?.email || 'Owner',
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Could not sync branch edits to Firestore company:', err);
      }
    }

    setShowBranchModal(false);
    showToast(`Saved ${branchEditForm.name}! Branding, logo, colors & bank details updated.`);
  };

  // Reset Branch to Factory Default
  const resetBranchToDefault = (branchId: string) => {
    const defaultData = DEFAULT_BRANCHES.find(b => b.id === branchId) || DEFAULT_BRANCHES[0];
    const resetForm = {
      ...defaultData,
      id: branchId
    };
    setBranchEditForm(resetForm);
    const updated = branches.map(b => (b.id === branchId ? resetForm : b));
    setBranches(updated);
    try {
      localStorage.setItem('artelume_branches', JSON.stringify(updated));
    } catch (e) {}
    if (activeBranchId === branchId) {
      setThemeOverride(resetForm.theme);
      setBankInfo(resetForm.bankDetails);
    }
    showToast(`Reset ${resetForm.name} to default settings.`);
  };

  // Logo Ctrl+V Paste Handler for Branch Settings Modal
  const handleLogoPaste = (e: React.ClipboardEvent | ClipboardEvent) => {
    const clipData = 'clipboardData' in e ? e.clipboardData : null;
    const clipItems = clipData?.items;
    if (!clipItems) return;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.startsWith('image/')) {
        const file = clipItems[i].getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = ev => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) {
              setBranchEditForm(prev => ({ ...prev, logoUrl: dataUrl }));
              showToast('Branch Logo pasted from clipboard!');
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  // Logo File Upload for Branch Settings Modal
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          setBranchEditForm(prev => ({ ...prev, logoUrl: dataUrl }));
          showToast('Branch Logo uploaded!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Spreadsheet (.xlsx, .xls) Upload & Parsing
  const processSpreadsheetFile = async (file: File) => {
    setIsParsingSpreadsheet(true);
    setSpreadsheetError(null);
    try {
      const result = await parseExcelSpreadsheet(file);
      if (!result.items || result.items.length === 0) {
        setSpreadsheetError('No luminaire or quotation rows found in this sheet. Please ensure standard columns exist.');
      } else {
        setParsedSpreadsheetResult(result);
        setShowSpreadsheetModal(true);
      }
    } catch (err: any) {
      console.error('Spreadsheet parse failed:', err);
      setSpreadsheetError(err?.message || 'Could not parse this spreadsheet. Please ensure it is a valid .xlsx file.');
      setShowSpreadsheetModal(true);
    } finally {
      setIsParsingSpreadsheet(false);
    }
  };

  const handleSpreadsheetFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSpreadsheetFile(file);
    e.target.value = '';
  };

  const applySpreadsheetToQuotation = () => {
    if (!parsedSpreadsheetResult || !parsedSpreadsheetResult.items.length) return;

    if (spreadsheetImportMode === 'replace') {
      setItems(parsedSpreadsheetResult.items);
    } else {
      setItems(prev => [...prev, ...parsedSpreadsheetResult.items]);
    }

    if (parsedSpreadsheetResult.metadata?.client && (!client || client === 'Valued Client')) {
      setClient(parsedSpreadsheetResult.metadata.client);
    }
    if (parsedSpreadsheetResult.metadata?.quoteNum) {
      setQuoteNum(parsedSpreadsheetResult.metadata.quoteNum);
    }
    if (parsedSpreadsheetResult.metadata?.date) {
      setQuoteDate(parsedSpreadsheetResult.metadata.date);
    }

    showToast(`Loaded ${parsedSpreadsheetResult.items.length} items from spreadsheet!`);
    setShowSpreadsheetModal(false);
    setParsedSpreadsheetResult(null);
    setActiveView('quote-builder');
  };

  // SKU Usage & Pricing History Handlers
  const openSkuHistory = (sku: string, name?: string, itemIndex?: number) => {
    setSkuHistoryTarget({
      sku: sku || '',
      name: name || '',
      itemIndex
    });
    setSkuHistoryClientFilter('all');
    setSkuHistorySearch('');
    setShowSkuHistoryModal(true);
  };

  const skuUsageRecords = useMemo(() => {
    if (!skuHistoryTarget) return [];
    const targetSku = (skuHistoryTarget.sku || '').trim().toLowerCase();
    const targetName = (skuHistoryTarget.name || '').trim().toLowerCase();
    if (!targetSku && !targetName) return [];

    const results: Array<{
      quoteKey: string;
      quoteNum: string;
      quoteName: string;
      client: string;
      date: string;
      status: string;
      branchName: string;
      qty: number;
      listPrice: number;
      discount: number;
      price: number;
      total: number;
      watt?: string;
      cct?: string;
      beam?: string;
      finish?: string;
      reflector?: string;
    }> = [];

    Object.entries(savedQuotes).forEach(([key, q]) => {
      if (!q || !Array.isArray(q.items)) return;
      q.items.forEach(it => {
        const itSku = (it.sku || it.code || '').trim().toLowerCase();
        const itName = (it.name || it.desc || '').trim().toLowerCase();

        const matchesSku = targetSku && itSku && (itSku === targetSku || itSku.includes(targetSku) || targetSku.includes(itSku));
        const matchesName = targetName && itName && (itName === targetName || itName.includes(targetName) || targetName.includes(itName));

        if (matchesSku || matchesName) {
          const itemPrice = Number(it.price) || 0;
          const itemQty = Number(it.qty) || 1;
          const listP = Number(it.listPrice) || itemPrice;
          const disc = Number(it.discount) || 0;
          const branchProfile = branches.find(b => b.id === q.branchId) || q.branch || DEFAULT_BRANCHES[0];

          results.push({
            quoteKey: key,
            quoteNum: q.quoteNum || key,
            quoteName: q.name || key,
            client: q.client || 'Valued Client',
            date: q.date || '',
            status: q.status || 'Draft',
            branchName: branchProfile.name || 'ARTÈ LUME',
            qty: itemQty,
            listPrice: listP,
            discount: disc,
            price: itemPrice,
            total: itemPrice * itemQty,
            watt: it.watt,
            cct: it.cct,
            beam: it.beam,
            finish: it.finish,
            reflector: it.reflector
          });
        }
      });
    });

    return results.sort((a, b) => {
      return (b.date || '').localeCompare(a.date || '');
    });
  }, [skuHistoryTarget, savedQuotes, branches]);

  const skuUsageStats = useMemo(() => {
    if (skuUsageRecords.length === 0) {
      return {
        totalQuotes: 0,
        totalQty: 0,
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0,
        uniqueClients: 0,
        clientSpecificQuotes: [],
        clientAvgPrice: 0,
        clientLastPrice: 0
      };
    }

    const prices = skuUsageRecords.map(r => r.price).filter(p => p > 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const avgPrice = prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0;
    const totalQty = skuUsageRecords.reduce((s, r) => s + r.qty, 0);

    const clientSet = new Set(skuUsageRecords.map(r => r.client));

    const activeClientName = (client || '').trim().toLowerCase();
    const clientSpecificQuotes = activeClientName
      ? skuUsageRecords.filter(r => r.client.toLowerCase().includes(activeClientName) || activeClientName.includes(r.client.toLowerCase()))
      : [];

    const clientPrices = clientSpecificQuotes.map(r => r.price).filter(p => p > 0);
    const clientAvgPrice = clientPrices.length ? Math.round(clientPrices.reduce((s, p) => s + p, 0) / clientPrices.length) : 0;
    const clientLastPrice = clientSpecificQuotes.length ? clientSpecificQuotes[0].price : 0;

    return {
      totalQuotes: skuUsageRecords.length,
      totalQty,
      minPrice,
      maxPrice,
      avgPrice,
      uniqueClients: clientSet.size,
      clientSpecificQuotes,
      clientAvgPrice,
      clientLastPrice
    };
  }, [skuUsageRecords, client]);

  const skuHistoryUniqueClients = useMemo(() => {
    const clients = new Set<string>();
    skuUsageRecords.forEach(r => {
      if (r.client) clients.add(r.client);
    });
    return Array.from(clients).sort();
  }, [skuUsageRecords]);

  const displayedSkuHistoryRecords = useMemo(() => {
    return skuUsageRecords.filter(r => {
      if (skuHistoryClientFilter === 'current_client') {
        const activeClient = (client || '').trim().toLowerCase();
        if (!activeClient || !r.client.toLowerCase().includes(activeClient)) {
          return false;
        }
      } else if (skuHistoryClientFilter !== 'all') {
        if (r.client.toLowerCase() !== skuHistoryClientFilter.toLowerCase()) return false;
      }

      if (skuHistorySearch.trim()) {
        const q = skuHistorySearch.toLowerCase().trim();
        const match =
          r.quoteNum.toLowerCase().includes(q) ||
          r.quoteName.toLowerCase().includes(q) ||
          r.client.toLowerCase().includes(q) ||
          r.branchName.toLowerCase().includes(q) ||
          (r.watt && r.watt.toLowerCase().includes(q)) ||
          (r.cct && r.cct.toLowerCase().includes(q)) ||
          (r.beam && r.beam.toLowerCase().includes(q)) ||
          (r.finish && r.finish.toLowerCase().includes(q)) ||
          (r.reflector && r.reflector.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [skuUsageRecords, skuHistoryClientFilter, skuHistorySearch, client]);

  const applyHistoricalPriceToItem = (recordPrice: number, recordDiscount: number, recordListPrice: number) => {
    if (skuHistoryTarget?.itemIndex === undefined) return;
    const idx = skuHistoryTarget.itemIndex;
    handleItemChange(idx, 'price', recordPrice);
    if (recordListPrice > 0) {
      handleItemChange(idx, 'listPrice', recordListPrice);
    }
    if (recordDiscount >= 0) {
      handleItemChange(idx, 'discount', recordDiscount);
    }
    showToast(`⚡ Applied historical price ${formatInr(recordPrice)} to Item #${idx + 1}!`);
    setShowSkuHistoryModal(false);
  };

  const openQuoteFromHistory = (quoteKey: string) => {
    setShowSkuHistoryModal(false);
    openSavedQuote(quoteKey);
  };

  const startNewQuote = () => {
    const prefix = activeBranch.quotePrefix || 'AL';
    const nextNum = `${prefix}-${String(Object.keys(savedQuotes).length + 1).padStart(3, '0')}`;
    setQuoteNum(nextNum);
    setQuoteName('');
    setQuoteStatus('Draft');
    setClient('');
    setQuoteDate(todayStr());
    try {
      const savedGst = localStorage.getItem('artelume_default_gst');
      setGstRate(savedGst !== null ? Number(savedGst) || 18 : 18);
    } catch {
      setGstRate(18);
    }
    setShowCode(false);
    setShowBeam(false);
    setShowCRI(false);
    setShowIP(false);
    setShowFinish(false);
    setShowDiscount(false);
    setShowBank(false);
    setBankInfo(activeBranch.bankDetails);
    setItems([
      {
        id: `item-${Date.now()}`,
        sku: '',
        name: '',
        category: 'COB Lights',
        watt: '',
        cct: '3000K',
        beam: '36°',
        cri: 'CRI 90+',
        ip: 'IP20',
        finish: 'Matte White',
        qty: 1,
        listPrice: 0,
        discount: 0,
        price: 0,
        img: ''
      }
    ]);
    setActiveView('quote-builder');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    showToast(`New quotation started for ${activeBranch.name}!`);
  };

  // WhatsApp Share with Lighting Specifications and Branch Identity
  const shareWhatsApp = () => {
    let text = `*${activeBranch.name} — ${activeBranch.tagline}*\n`;
    text += `*Branch:* ${activeBranch.location}\n`;
    text += `*Quotation #:* ${quoteNum}\n*Client:* ${client || 'Valued Client'}\n*Date:* ${quoteDate}\n\n`;

    items.forEach((it, idx) => {
      // Line 1 & Line 2 in SAME line: Product Description + (Watt & CCT)
      const wattCct = [it.watt ? `⚡ Power: ${it.watt}` : '', it.cct ? `💡 CCT: ${it.cct}` : ''].filter(Boolean).join(' | ');
      const titleAndWattCct = wattCct ? `*${it.name || it.sku}* — ${wattCct}` : `*${it.name || it.sku}*`;
      text += `${idx + 1}. ${titleAndWattCct}\n`;
      // Line 3: Beam Angle separate line
      if (it.beam) text += `   🎯 Beam Angle: ${it.beam}\n`;
      // Line 4: CRI separate line
      if (it.cri) text += `   🎨 CRI: ${it.cri}\n`;
      // Line 5: IP Rating separate line
      if (it.ip) text += `   🛡️ IP Rating: ${it.ip}\n`;
      // Line 6: Body Finish and Reflector in same line
      const fin = [it.finish ? `✨ Body Finish: ${it.finish}` : '', it.reflector ? `🔆 Reflector: ${it.reflector}` : ''].filter(Boolean).join(' | ');
      if (fin) text += `   ${fin}\n`;
      text += `   Qty: ${it.qty} × ₹${money(it.price)} = *₹${money(it.price * it.qty)}*\n\n`;
    });

    text += `*Subtotal:* ₹${money(subtotal)}\n`;
    text += `*GST (${gstRate}%):* ₹${money(taxHalf * 2)}\n`;
    text += `*GRAND TOTAL:* ₹${money(grandTotal)}\n\n`;
    text += `_Thank you for choosing ${activeBranch.name} — ${activeBranch.tagline}._`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  // Export Active Quotation to Excel with Live Progress Feedback
  const handleExportActiveQuoteExcel = async () => {
    if (excelProgress.isExporting) return;

    setExcelProgress({
      isExporting: true,
      progress: 20,
      statusText: 'Formatting specs...',
      isSuccess: false
    });

    try {
      const currentDoc: QuotationDocument = {
        quoteNum,
        name: quoteName || `${client || 'Quotation'} ${quoteDate}`,
        status: quoteStatus,
        client,
        date: quoteDate,
        gst: gstRate,
        items,
        showCode,
        showBeam,
        showCRI,
        showIP,
        showFinish,
        showReflector,
        showDiscount,
        showBank,
        bankDetails: bankInfo,
        branchId: activeBranchId
      };

      // Stage 1: Document compilation
      await new Promise(r => setTimeout(r, 200));
      setExcelProgress({
        isExporting: true,
        progress: 55,
        statusText: 'Embedding fixtures & styling...',
        isSuccess: false
      });

      // Stage 2: ExcelJS workbook creation & formula calculation
      await exportQuotationToExcel(currentDoc, activeBranch);

      // Stage 3: Packaging & Download confirmation
      setExcelProgress({
        isExporting: true,
        progress: 90,
        statusText: 'Finalizing .xlsx...',
        isSuccess: false
      });
      await new Promise(r => setTimeout(r, 250));

      setExcelProgress({
        isExporting: false,
        progress: 100,
        statusText: '✓ Excel Saved!',
        isSuccess: true
      });
      showToast('Exported quotation to Excel (.xlsx)!');

      // Revert after 2.5 seconds
      setTimeout(() => {
        setExcelProgress({
          isExporting: false,
          progress: 0,
          statusText: '',
          isSuccess: false
        });
      }, 2500);
    } catch (err) {
      console.error('Excel Export Error:', err);
      setExcelProgress({
        isExporting: false,
        progress: 0,
        statusText: '',
        isSuccess: false
      });
      showToast('Excel export encountered an error. Please try again.');
    }
  };

  // Export / Print Active Quotation to PDF with Live Progress Feedback
  const handleSavePdfWithProgress = async () => {
    if (pdfProgress.isExporting) return;

    setPdfProgress({
      isExporting: true,
      progress: 25,
      statusText: 'Compiling A4 layout...',
      isSuccess: false
    });

    try {
      await new Promise(r => setTimeout(r, 200));
      setPdfProgress({
        isExporting: true,
        progress: 65,
        statusText: 'Rendering print styles...',
        isSuccess: false
      });

      await new Promise(r => setTimeout(r, 200));
      setPdfProgress({
        isExporting: true,
        progress: 90,
        statusText: 'Opening PDF dialog...',
        isSuccess: false
      });

      setTimeout(() => {
        window.print();
        setPdfProgress({
          isExporting: false,
          progress: 100,
          statusText: '✓ PDF Ready!',
          isSuccess: true
        });
        showToast('PDF print / save dialog opened!');

        setTimeout(() => {
          setPdfProgress({
            isExporting: false,
            progress: 0,
            statusText: '',
            isSuccess: false
          });
        }, 2500);
      }, 250);
    } catch (err) {
      console.error('PDF Export Error:', err);
      setPdfProgress({
        isExporting: false,
        progress: 0,
        statusText: '',
        isSuccess: false
      });
    }
  };

  // Product Spec Modal Image Upload & Ctrl+V Paste Handlers
  const handleProductModalImagePaste = (e: React.ClipboardEvent | ClipboardEvent) => {
    const clipData = 'clipboardData' in e ? e.clipboardData : null;
    const clipItems = clipData?.items;
    if (!clipItems) return;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.startsWith('image/')) {
        const file = clipItems[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = evt => {
            if (evt.target?.result) {
              setProdForm(prev => ({ ...prev, img: evt.target?.result as string }));
              showToast('Image pasted from clipboard (Ctrl+V)!');
            }
          };
          reader.readAsDataURL(file);
          if ('preventDefault' in e && typeof e.preventDefault === 'function') {
            e.preventDefault();
          }
          break;
        }
      }
    }
  };

  const handleProductModalImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = evt => {
        if (evt.target?.result) {
          setProdForm(prev => ({ ...prev, img: evt.target?.result as string }));
          showToast('Image uploaded successfully!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductModalImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = evt => {
        if (evt.target?.result) {
          setProdForm(prev => ({ ...prev, img: evt.target?.result as string }));
          showToast('Image dropped and attached!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!showProductModal) return;
    const onWindowPaste = (e: ClipboardEvent) => {
      handleProductModalImagePaste(e);
    };
    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  }, [showProductModal]);

  // Bulk Import Image Upload & Ctrl+V Paste Handlers
  const handleBulkRowImagePaste = (e: React.ClipboardEvent | ClipboardEvent, rowIndex?: number) => {
    const targetIdx = rowIndex !== undefined ? rowIndex : activeBulkRowIdx;
    if (targetIdx === null || targetIdx === undefined || targetIdx < 0 || targetIdx >= bulkRows.length) return;
    const clipData = 'clipboardData' in e ? e.clipboardData : null;
    const clipItems = clipData?.items;
    if (!clipItems) return;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.startsWith('image/')) {
        const file = clipItems[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = evt => {
            if (evt.target?.result) {
              setBulkRows(prev => {
                const updated = [...prev];
                if (updated[targetIdx]) {
                  updated[targetIdx] = { ...updated[targetIdx], img: evt.target?.result as string };
                }
                return updated;
              });
              showToast(`Image attached to Row #${targetIdx + 1} from clipboard (Ctrl+V)!`);
            }
          };
          reader.readAsDataURL(file);
          if ('preventDefault' in e && typeof e.preventDefault === 'function') {
            e.preventDefault();
          }
          break;
        }
      }
    }
  };

  const handleBulkRowImageFile = (e: React.ChangeEvent<HTMLInputElement>, targetIdx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = evt => {
        if (evt.target?.result) {
          setBulkRows(prev => {
            const updated = [...prev];
            if (updated[targetIdx]) {
              updated[targetIdx] = { ...updated[targetIdx], img: evt.target?.result as string };
            }
            return updated;
          });
          showToast(`Image uploaded for Row #${targetIdx + 1}!`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBulkRowImageDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = evt => {
        if (evt.target?.result) {
          setBulkRows(prev => {
            const updated = [...prev];
            if (updated[targetIdx]) {
              updated[targetIdx] = { ...updated[targetIdx], img: evt.target?.result as string };
            }
            return updated;
          });
          showToast(`Image dropped and attached to Row #${targetIdx + 1}!`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!showBulkImportModal) return;
    const onBulkWindowPaste = (e: ClipboardEvent) => {
      handleBulkRowImagePaste(e, activeBulkRowIdx);
    };
    window.addEventListener('paste', onBulkWindowPaste);
    return () => window.removeEventListener('paste', onBulkWindowPaste);
  }, [showBulkImportModal, activeBulkRowIdx, bulkRows]);

  // Helper to extract base model family from SKU (e.g. LFSL1211R-ZB -> LFSL1211R)
  const getBaseModelFamily = (sku?: string, name?: string): string => {
    if (sku && sku.trim()) {
      const clean = sku.trim();
      const parts = clean.split(/[-_]/);
      if (parts.length > 1) {
        return parts[0];
      }
      return clean;
    }
    if (name && name.trim()) {
      return name.trim().split(/[-–(]/)[0].trim();
    }
    return 'Default Model';
  };

  const copyBulkImage = (img: string) => {
    if (!img) return;
    setCopiedBulkImage(img);
    showToast('📋 Photo copied! You can now click "Paste" on any row or "Apply to Selected".');
  };

  const applyImageToSku = (sourceImg: string, targetSku?: string) => {
    if (!sourceImg || !targetSku || !targetSku.trim()) {
      showToast('Please enter an SKU first to apply to same model.');
      return;
    }
    const clean = targetSku.trim().toLowerCase();
    let count = 0;
    setBulkRows(prev =>
      prev.map(r => {
        if (r.sku && r.sku.trim().toLowerCase() === clean) {
          count++;
          return { ...r, img: sourceImg };
        }
        return r;
      })
    );
    showToast(`🔗 Photo applied to all ${count} rows matching SKU "${targetSku.trim()}"!`);
  };

  const applyImageToFamily = (sourceImg: string, familyPrefix?: string) => {
    if (!sourceImg || !familyPrefix || !familyPrefix.trim()) {
      showToast('Please enter SKU/Model to detect family.');
      return;
    }
    const base = familyPrefix.trim().toLowerCase();
    let count = 0;
    setBulkRows(prev =>
      prev.map(r => {
        const rowSku = (r.sku || '').trim().toLowerCase();
        const rowBase = getBaseModelFamily(r.sku, r.name).toLowerCase();
        if (rowSku.startsWith(base) || rowBase === base) {
          count++;
          return { ...r, img: sourceImg };
        }
        return r;
      })
    );
    showToast(`🌐 Photo applied to all ${count} variants of family "${familyPrefix}"!`);
  };

  const applyImageToSelected = (sourceImg: string) => {
    if (!sourceImg) {
      showToast('No photo to apply.');
      return;
    }
    if (selectedBulkRowIds.size === 0) {
      showToast('Please select at least one row checkbox to apply photo.');
      return;
    }
    const count = selectedBulkRowIds.size;
    setBulkRows(prev =>
      prev.map(r => {
        if (selectedBulkRowIds.has(r.id)) {
          return { ...r, img: sourceImg };
        }
        return r;
      })
    );
    showToast(`✓ Photo applied to ${count} selected rows!`);
  };

  const pasteCopiedImageToRow = (idx: number) => {
    if (!copiedBulkImage) {
      showToast('No image in memory clipboard. Copy an image first.');
      return;
    }
    setBulkRows(prev => {
      const updated = [...prev];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], img: copiedBulkImage };
      }
      return updated;
    });
    showToast(`📥 Photo pasted to Row #${idx + 1}!`);
  };

  const pasteCopiedImageToSelected = () => {
    if (!copiedBulkImage) {
      showToast('No image in memory clipboard. Copy an image first.');
      return;
    }
    applyImageToSelected(copiedBulkImage);
  };

  const toggleSelectBulkRow = (id: string) => {
    setSelectedBulkRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllBulkRows = () => {
    if (selectedBulkRowIds.size === bulkRows.length && bulkRows.length > 0) {
      setSelectedBulkRowIds(new Set());
    } else {
      setSelectedBulkRowIds(new Set(bulkRows.map(r => r.id)));
    }
  };

  const selectRowsByFamily = (familyKey: string) => {
    const matchingIds = bulkRows
      .filter(r => {
        const base = getBaseModelFamily(r.sku, r.name).toLowerCase();
        const rowSku = (r.sku || '').toLowerCase();
        return base === familyKey.toLowerCase() || rowSku === familyKey.toLowerCase();
      })
      .map(r => r.id);
    setSelectedBulkRowIds(new Set(matchingIds));
    showToast(`Selected ${matchingIds.length} rows of model "${familyKey}"!`);
  };

  // Helper to generate clean category code slug
  // e.g. "Pendant Lights" -> "PEND", "COB Lights" -> "DOWN", "Magnetic Track" -> "TRK"
  const getCategorySlug = (cat: string): string => {
    const c = (cat || '').trim().toLowerCase();
    if (c.includes('pendant')) return 'PEND';
    if (c.includes('cob') || c.includes('downlight') || c.includes('recessed')) return 'DOWN';
    if (c.includes('track') || c.includes('magnetic')) return 'TRK';
    if (c.includes('spot')) return 'SPOT';
    if (c.includes('profile') || c.includes('linear')) return 'PROF';
    if (c.includes('strip') || c.includes('cove')) return 'STRIP';
    if (c.includes('outdoor') || c.includes('landscape') || c.includes('bollard') || c.includes('facade') || c.includes('gate') || c.includes('spike')) return 'OUT';
    if (c.includes('wall') || c.includes('sconce')) return 'WALL';
    if (c.includes('ceiling') || c.includes('surface')) return 'SURF';
    if (c.includes('step') || c.includes('foot')) return 'STEP';
    
    // Custom fallback: clean alphanumeric 3-4 chars
    const cleaned = (cat || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return cleaned.length >= 3 ? cleaned.slice(0, 4) : (cleaned || 'SPEC');
  };

  const generateStudioProductCode = (
    category: string,
    branchPrefix: string,
    productList: LightingProduct[]
  ): string => {
    const prefix = (branchPrefix || 'AL').toUpperCase();
    const catSlug = getCategorySlug(category);
    const pattern = new RegExp(`^${prefix}-${catSlug}-(\\d+)$`, 'i');
    const namePattern = new RegExp(`\\b${prefix}-${catSlug}-(\\d+)\\b`, 'i');
    
    let maxSeq = 100;
    for (const p of productList) {
      const skuMatch = (p.sku || '').match(pattern);
      if (skuMatch && skuMatch[1]) {
        const num = parseInt(skuMatch[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
      const nameMatch = (p.name || '').match(namePattern);
      if (nameMatch && nameMatch[1]) {
        const num = parseInt(nameMatch[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}-${catSlug}-${nextSeq}`;

    // Collision check across catalog
    const isTaken = (code: string) =>
      productList.some(
        p =>
          (p.sku || '').toLowerCase() === code.toLowerCase() ||
          (p.name || '').toLowerCase().includes(code.toLowerCase())
      );

    while (isTaken(candidate)) {
      nextSeq++;
      candidate = `${prefix}-${catSlug}-${nextSeq}`;
    }

    return candidate;
  };

  // Automated studio code suggested for active category & active branch
  const suggestedStudioCode = useMemo(() => {
    return generateStudioProductCode(
      prodForm.category || 'COB Lights',
      activeBranch.quotePrefix || 'AL',
      products
    );
  }, [prodForm.category, activeBranch.quotePrefix, products]);

  const handleCategoryChange = (newCat: string) => {
    const newCode = generateStudioProductCode(
      newCat || 'General',
      activeBranch.quotePrefix || 'AL',
      products
    );
    let updatedName = prodForm.name || '';
    const studioPrefixRegex = /^(?:AL|LC)-[A-Z0-9]+-\d+\s*[-–—:]\s*/i;
    if (!updatedName || studioPrefixRegex.test(updatedName)) {
      const rest = updatedName.replace(studioPrefixRegex, '');
      updatedName = rest ? `${newCode} - ${rest}` : `${newCode} - `;
    }
    setProdForm(prev => ({
      ...prev,
      category: newCat,
      name: updatedName
    }));
  };

  const insertStudioCodeIntoDescription = (codeToInsert: string) => {
    const currentName = (prodForm.name || '').trim();
    const studioPrefixRegex = /^(?:AL|LC)-[A-Z0-9]+-\d+\s*[-–—:]\s*/i;
    let newName = '';
    if (studioPrefixRegex.test(currentName)) {
      const rest = currentName.replace(studioPrefixRegex, '');
      newName = rest ? `${codeToInsert} - ${rest}` : `${codeToInsert} - `;
    } else if (currentName) {
      newName = `${codeToInsert} - ${currentName}`;
    } else {
      newName = `${codeToInsert} - `;
    }
    setProdForm(prev => ({ ...prev, name: newName }));
    showToast(`Inserted "${codeToInsert}" into description!`);
  };

  // Product Catalog Management
  const openAddProductModal = (prodToEdit?: LightingProduct) => {
    setIsCustomCategory(false);
    if (prodToEdit) {
      setEditingProductId(prodToEdit.id);
      setProdForm({ ...prodToEdit });
    } else {
      setEditingProductId(null);
      const defaultCat = 'COB Lights';
      const initialCode = generateStudioProductCode(
        defaultCat,
        activeBranch.quotePrefix || 'AL',
        products
      );
      setProdForm({
        sku: '', // MANDATORY - User fills in their factory SKU (e.g. lfss1121r)
        name: `${initialCode} - `, // Pre-fill with sequential category studio code
        category: defaultCat,
        watt: '12W',
        cct: '3000K',
        beam: '36°',
        cri: 'CRI 95+',
        ip: 'IP20',
        finish: 'Matte White',
        reflector: 'Specular',
        price: 2400,
        cost: 1100,
        stock: 20,
        img: ''
      });
    }
    setShowProductModal(true);
  };

  const saveProduct = () => {
    if (!prodForm.sku || !prodForm.sku.trim()) {
      showToast('SKU / Factory Code (e.g. lfss1121r) is mandatory.');
      return;
    }
    if (!prodForm.name || !prodForm.name.trim()) {
      showToast('Product Name & Description is mandatory.');
      return;
    }
    if (!prodForm.price) {
      showToast('Selling Price is mandatory.');
      return;
    }

    let updated = [...products];
    const newEntry: LightingProduct = {
      id: editingProductId || `prod-${Date.now()}`,
      sku: prodForm.sku.trim(),
      name: prodForm.name.trim(),
      category: prodForm.category || 'General Fixture',
      watt: prodForm.watt || '',
      cct: prodForm.cct || '',
      beam: prodForm.beam || '',
      cri: prodForm.cri || '',
      ip: prodForm.ip || '',
      finish: prodForm.finish || '',
      reflector: prodForm.reflector || '',
      price: Number(prodForm.price) || 0,
      cost: Number(prodForm.cost) || 0,
      stock: Number(prodForm.stock) || 0,
      img: prodForm.img || ''
    };

    if (editingProductId) {
      updated = updated.map(p => (p.id === editingProductId ? newEntry : p));
    } else {
      updated.push(newEntry);
    }

    setProducts(updated);
    localStorage.setItem('artelume_products', JSON.stringify(updated));
    if (company?.id) {
      saveCloudProduct(company.id, newEntry).catch(err => {
        console.warn('Cloud save product error:', err);
      });
    }
    setShowProductModal(false);
    showToast(`Product "${newEntry.sku}" saved!`);
  };

  const handleImportFromPdfToCatalog = (newProducts: LightingProduct[]) => {
    if (!newProducts || newProducts.length === 0) return;
    const merged = [...products];

    newProducts.forEach(np => {
      const idx = merged.findIndex(p => (p.sku || '').toLowerCase().trim() === (np.sku || '').toLowerCase().trim());
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...np };
      } else {
        merged.push(np);
      }

      if (company?.id) {
        saveCloudProduct(company.id, np).catch(err => {
          console.warn('Cloud save imported product error:', err);
        });
      }
    });

    setProducts(merged);
    try {
      localStorage.setItem('artelume_products', JSON.stringify(merged));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
    showToast(`✓ Added ${newProducts.length} luminaires from PDF to Catalog!`);
  };

  const handleImportFromPdfToQuote = (newProducts: LightingProduct[]) => {
    if (!newProducts || newProducts.length === 0) return;
    const newItems: QuotationItem[] = newProducts.map(p => ({
      ...p,
      qty: 1,
      listPrice: p.price,
      discount: 0,
      price: p.price,
    }));

    setItems(prev => {
      const cleaned = prev.filter(it => it.sku || it.name || (it.price && it.price > 0));
      return [...cleaned, ...newItems];
    });
    showToast(`✓ Populated ${newItems.length} luminaires from PDF into quotation!`);
  };

  const deleteProduct = (id: string) => {
    const p = products.find(prod => prod.id === id);
    setDeleteConfirmTarget({ type: 'product', id, name: p ? p.sku : 'Product' });
  };

  const handleExecuteDeleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    localStorage.setItem('artelume_products', JSON.stringify(updated));
    if (company?.id) {
      deleteCloudProduct(company.id, id).catch(err => {
        console.warn('Cloud delete product error:', err);
      });
    }
    showToast('Product deleted from catalog.');
  };

  // Bulk Import Execution
  const executeBulkImport = () => {
    const validRows = bulkRows.filter(r => r.sku && r.name && Number(r.price) > 0);
    if (!validRows.length) {
      showToast('Please fill at least one row with SKU, Name, and Price.');
      return;
    }

    const current = [...products];
    validRows.forEach(r => {
      const cleanSku = r.sku!.trim();
      const existingIdx = current.findIndex(p => p.sku.toLowerCase() === cleanSku.toLowerCase() && p.watt === r.watt);
      const newProd: LightingProduct = {
        id: `prod-bulk-${Date.now()}-${Math.random()}`,
        sku: cleanSku,
        name: r.name!.trim(),
        category: r.category || 'Architectural Lighting',
        watt: r.watt || '',
        cct: r.cct || '3000K',
        beam: r.beam || '36°',
        cri: r.cri || 'CRI 90+',
        ip: r.ip || 'IP20',
        finish: r.finish || 'White',
        reflector: r.reflector || '',
        price: Number(r.price) || 0,
        cost: Number(r.cost) || 0,
        stock: Number(r.stock) || 10,
        img: r.img || ''
      };

      if (existingIdx !== -1) {
        current[existingIdx] = { ...current[existingIdx], ...newProd };
      } else {
        current.push(newProd);
      }
    });

    setProducts(current);
    localStorage.setItem('artelume_products', JSON.stringify(current));
    if (company?.id) {
      validRows.forEach(r => {
        const cleanSku = r.sku!.trim();
        const pMatch = current.find(p => p.sku.toLowerCase() === cleanSku.toLowerCase());
        if (pMatch) {
          saveCloudProduct(company.id, pMatch).catch(console.warn);
        }
      });
    }
    setShowBulkImportModal(false);
    showToast(`Imported ${validRows.length} architectural products!`);
  };

  // Import Selected Fixtures from Catalog Modal
  const importCatalogSelection = () => {
    if (selectedCatalogIds.size === 0) return;
    const toAdd = products.filter(p => selectedCatalogIds.has(p.id));

    const newItems = [...items];
    toAdd.forEach(prod => {
      newItems.push({
        id: `item-${Date.now()}-${Math.random()}`,
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        watt: prod.watt,
        cct: prod.cct,
        beam: prod.beam || '36°',
        cri: prod.cri || 'CRI 95+',
        ip: prod.ip || 'IP20',
        finish: prod.finish || 'White',
        reflector: prod.reflector || '',
        qty: 1,
        listPrice: prod.price,
        discount: 0,
        price: prod.price,
        img: prod.img || ''
      });
    });

    setItems(newItems);
    setSelectedCatalogIds(new Set());
    setShowCatalogModal(false);
    setActiveView('quote-builder');
    showToast(`Added ${toAdd.length} fixture${toAdd.length === 1 ? '' : 's'} to quotation!`);
  };

  // Active Quote Document for Exporters and Share Link Generator
  const currentQuoteDoc: QuotationDocument = useMemo(() => {
    const existingPayments = savedQuotes[quoteName]?.payments || savedQuotes[quoteNum]?.payments || [];
    return {
      quoteNum,
      name: quoteName || client,
      status: quoteStatus,
      client,
      date: quoteDate,
      gst: gstRate,
      items,
      showCode,
      showBeam,
      showCRI,
      showIP,
      showFinish,
      showReflector,
      showDiscount,
      showBank,
      bankDetails: activeBranch.bankDetails || bankInfo,
      branchId: activeBranch.id,
      branch: activeBranch,
      payments: existingPayments,
      dedicatedPerson,
      dedicatedPersonRole,
      dedicatedPersonPhone
    };
  }, [
    quoteNum,
    quoteName,
    quoteStatus,
    client,
    quoteDate,
    gstRate,
    items,
    showCode,
    showBeam,
    showCRI,
    showIP,
    showFinish,
    showReflector,
    showDiscount,
    showBank,
    activeBranch,
    bankInfo,
    savedQuotes,
    dedicatedPerson,
    dedicatedPersonRole,
    dedicatedPersonPhone
  ]);

  // Payment Recording & Bank Verification Handlers
  const handleOpenRecordPayment = (targetQuote?: QuotationDocument, tab: 'add' | 'history' = 'add') => {
    const quoteToPay = targetQuote || currentQuoteDoc;
    setPaymentTargetQuote(quoteToPay);
    setPaymentModalTab(tab);
    setShowPaymentModal(true);
  };

  const handleSavePayment = (payment: QuotationPaymentRecord, updatedQuote?: QuotationDocument) => {
    const targetQuote = updatedQuote || paymentTargetQuote;
    if (!targetQuote) return;
    const targetNum = targetQuote.quoteNum;

    // 1. Update in active state if current quote matches
    if (quoteNum === targetNum || quoteName === targetQuote.name) {
      if (payment.type === 'Advance Booking' && (quoteStatus === 'Draft' || quoteStatus === 'Sent')) {
        setQuoteStatus('Accepted & Paid');
      }
    }

    // 2. Persist to savedQuotes
    setSavedQuotes(prev => {
      const updated = { ...prev };
      let matchedKey = Object.keys(updated).find(
        k => updated[k].quoteNum === targetNum || k === targetNum || updated[k].name === targetQuote.name || k === targetQuote.name
      );

      if (!matchedKey) {
        matchedKey = targetQuote.name || targetNum;
        updated[matchedKey] = { ...targetQuote };
      }

      const existingPayments = updated[matchedKey].payments || [];
      const newStatus = (payment.type === 'Advance Booking' && (!updated[matchedKey].status || updated[matchedKey].status === 'Draft' || updated[matchedKey].status === 'Sent'))
        ? 'Accepted & Paid'
        : (updatedQuote?.status || updated[matchedKey].status);

      updated[matchedKey] = {
        ...updated[matchedKey],
        ...(updatedQuote || {}),
        payments: [payment, ...existingPayments.filter(p => p.id !== payment.id)],
        status: newStatus
      };

      try {
        localStorage.setItem('artelume_quotes', JSON.stringify(updated));
      } catch (e) {}

      if (company?.id) {
        saveCloudQuotation(company.id, matchedKey, updated[matchedKey]).catch(console.warn);
      }

      return updated;
    });

    // 3. AUTOMATIC ACCOUNTS LEDGER UPDATE (Bank or Cash)
    if (payment.paymentMode === 'Cash') {
      // Credit to Cash in Hand
      setCashEntries(prevCash => {
        const cashEntry: CashEntry = {
          name: `Client Payment: ${targetQuote.client || targetQuote.name} (${payment.receiptNumber})`,
          amt: Number(payment.amount),
          date: payment.date || todayStr()
        };
        const updatedCash = [cashEntry, ...prevCash];
        try {
          localStorage.setItem('artelume_cash', JSON.stringify(updatedCash));
        } catch (e) {}
        return updatedCash;
      });
      showToast(`💰 Payment ${formatInr(payment.amount)} recorded & credited to Cash Ledger! (${payment.receiptNumber})`);
    } else {
      // Credit to Bank Accounts (UPI, NEFT / RTGS, Cheque)
      setBanks(prevBanks => {
        const branchBankName = activeBranch.bankDetails?.bankName || 'HDFC Bank';
        const branchAccNo = activeBranch.bankDetails?.accNo || '98765432109876';
        let updatedBanks: BankAccount[];
        if (prevBanks.length === 0) {
          updatedBanks = [
            {
              id: 'bank-primary',
              name: branchBankName,
              acct: branchAccNo,
              bal: Number(payment.amount)
            }
          ];
        } else {
          updatedBanks = prevBanks.map((b, idx) => {
            if (idx === 0) {
              return {
                ...b,
                bal: Number(b.bal || 0) + Number(payment.amount)
              };
            }
            return b;
          });
        }
        try {
          localStorage.setItem('artelume_banks', JSON.stringify(updatedBanks));
        } catch (e) {}
        return updatedBanks;
      });

      // Post live transaction entry into Bank Passbook Transactions Statement
      const bankTx: BankTransaction = {
        id: `tx-${payment.id || Date.now()}`,
        bankAccountId: 'bank-primary',
        date: payment.date || todayStr(),
        type: 'credit',
        amount: Number(payment.amount),
        description: `Client Payment: ${targetQuote.client || targetQuote.name} (Quote #${targetQuote.quoteNum})`,
        category: 'Client Payment',
        mode: payment.paymentMode,
        referenceNo: payment.referenceNo,
        receiptNumber: payment.receiptNumber,
        quoteNum: targetQuote.quoteNum,
        client: targetQuote.client,
        verified: payment.verifiedByAdmin || false,
        notes: payment.notes,
        createdAt: new Date().toISOString()
      };
      setBankTransactions(prevTxs => {
        const nextTxs = [bankTx, ...prevTxs.filter(t => t.receiptNumber !== payment.receiptNumber && t.id !== bankTx.id)];
        try {
          localStorage.setItem('artelume_bank_transactions', JSON.stringify(nextTxs));
        } catch (e) {}
        return nextTxs;
      });

      if (company?.id) {
        saveCloudBankTransaction(company.id, bankTx).catch(console.warn);
      }

      showToast(`💰 Payment ${formatInr(payment.amount)} recorded & credited to Bank Passbook Statement! (${payment.receiptNumber})`);
    }

    // 4. BI-DIRECTIONAL SYNC: UPDATE ALL LINKED DELIVERY CHALLANS WITH THIS PAYMENT
    setDeliveryChallans(prevChallans => {
      let challanUpdated = false;
      const updated = prevChallans.map(c => {
        const isMatch =
          c.quoteNum === targetNum ||
          c.quoteId === targetQuote.name ||
          (c.client && targetQuote.client && c.client.toLowerCase() === targetQuote.client.toLowerCase());

        if (isMatch) {
          challanUpdated = true;
          return {
            ...c,
            paymentCollected: (Number(c.paymentCollected) || 0) + Number(payment.amount),
            paymentMode: payment.paymentMode,
            paymentRef: payment.receiptNumber || payment.referenceNo
          };
        }
        return c;
      });

      if (challanUpdated) {
        try {
          localStorage.setItem('artelume_delivery_challans', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    recordStudioNotification(
      'payment',
      `Payment ${formatInr(payment.amount)} Recorded (${payment.paymentMode})`,
      `Receipt #${payment.receiptNumber} for Quote #${targetQuote.quoteNum || targetQuote.name}`
    );
  };

  const handleDeletePayment = (quoteNumOrKey: string, paymentId: string) => {
    let deletedPayment: QuotationPaymentRecord | undefined;
    setSavedQuotes(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        if (
          updated[key].quoteNum === quoteNumOrKey ||
          key === quoteNumOrKey ||
          updated[key].name === quoteNumOrKey ||
          (updated[key].client && updated[key].client.toLowerCase() === quoteNumOrKey.toLowerCase())
        ) {
          const pList = updated[key].payments || [];
          deletedPayment = pList.find(p => p.id === paymentId || p.receiptNumber === paymentId);
          const nextPayments = pList.filter(p => p.id !== paymentId && p.receiptNumber !== paymentId);
          const totalPaid = nextPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
          const itemsSubtotal = (updated[key].items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
          const grandTotal = Math.round(itemsSubtotal * (1 + (Number(updated[key].gst) || 18) / 100));

          let newStatus = updated[key].status;
          if (totalPaid <= 0) {
            newStatus = 'Draft';
          } else if (totalPaid < grandTotal) {
            newStatus = 'Advance Received';
          } else {
            newStatus = 'Accepted & Paid';
          }

          updated[key] = {
            ...updated[key],
            payments: nextPayments,
            status: newStatus
          };

          try {
            localStorage.setItem('artelume_quotes', JSON.stringify(updated));
            localStorage.setItem(`artelume_q_${key}`, JSON.stringify(updated[key]));
          } catch (e) {}
          if (company?.id) {
            saveCloudQuotation(company.id, key, updated[key]).catch(console.warn);
          }
        }
      }
      return updated;
    });

    // Update paymentTargetQuote in state so modal refreshes immediately
    setPaymentTargetQuote(prev => {
      if (!prev) return null;
      const pList = prev.payments || [];
      const found = pList.find(p => p.id === paymentId || p.receiptNumber === paymentId);
      if (!deletedPayment && found) deletedPayment = found;
      const nextPayments = pList.filter(p => p.id !== paymentId && p.receiptNumber !== paymentId);
      const totalPaid = nextPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const itemsSubtotal = (prev.items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
      const grandTotal = Math.round(itemsSubtotal * (1 + (Number(prev.gst) || 18) / 100));
      let newStatus = prev.status;
      if (totalPaid <= 0) newStatus = 'Draft';
      else if (totalPaid < grandTotal) newStatus = 'Advance Received';
      else newStatus = 'Accepted & Paid';
      return {
        ...prev,
        payments: nextPayments,
        status: newStatus
      };
    });

    // Update current active quote status if it matches
    if (quoteNum === quoteNumOrKey || quoteName === quoteNumOrKey) {
      setSavedQuotes(prev => {
        const match = prev[quoteName] || Object.values(prev).find(q => q.quoteNum === quoteNum);
        if (match) {
          setQuoteStatus(match.status);
        }
        return prev;
      });
    }

    if (deletedPayment) {
      if (deletedPayment.paymentMode === 'Cash') {
        setCashEntries(prev => {
          const next = prev.filter(c => !c.name.includes(deletedPayment!.receiptNumber || ''));
          try {
            localStorage.setItem('artelume_cash', JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      } else {
        setBanks(prev => {
          const next = prev.map((b, idx) =>
            idx === 0 ? { ...b, bal: Math.max(0, (Number(b.bal) || 0) - Number(deletedPayment!.amount)) } : b
          );
          try {
            localStorage.setItem('artelume_banks', JSON.stringify(next));
          } catch (e) {}
          return next;
        });
        setBankTransactions(prev => {
          const next = prev.filter(
            t => t.receiptNumber !== deletedPayment!.receiptNumber && t.id !== `tx-${deletedPayment!.id}`
          );
          try {
            localStorage.setItem('artelume_bank_transactions', JSON.stringify(next));
          } catch (e) {}
          return next;
        });

        if (company?.id) {
          deleteCloudBankTransaction(company.id, `tx-${deletedPayment.id}`).catch(console.warn);
          if (deletedPayment.receiptNumber) {
            deleteCloudBankTransaction(company.id, `tx-${deletedPayment.receiptNumber}`).catch(console.warn);
          }
        }
      }

      // Also deduct from any linked delivery challan's paymentCollected
      setDeliveryChallans(prevChallans => {
        const updated = prevChallans.map(c => {
          if (
            c.quoteNum === quoteNumOrKey ||
            (c.paymentRef && (c.paymentRef === deletedPayment?.receiptNumber || c.paymentRef === deletedPayment?.referenceNo))
          ) {
            return {
              ...c,
              paymentCollected: Math.max(0, (Number(c.paymentCollected) || 0) - Number(deletedPayment?.amount || 0))
            };
          }
          return c;
        });
        try {
          localStorage.setItem('artelume_delivery_challans', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      showToast(`🗑️ Payment receipt ${deletedPayment.receiptNumber} deleted. Due balance updated!`);
    }
  };

  const handleEditPayment = (
    oldPayment: QuotationPaymentRecord,
    updatedPayment: QuotationPaymentRecord,
    updatedQuote: QuotationDocument
  ) => {
    const targetQuote = paymentTargetQuote || updatedQuote || currentQuoteDoc;
    const targetNum = targetQuote?.quoteNum || quoteNum;

    // 1. Update savedQuotes
    setSavedQuotes(prev => {
      const updated = { ...prev };
      let matchedKey = Object.keys(updated).find(
        k =>
          updated[k].quoteNum === targetNum ||
          k === targetNum ||
          updated[k].name === targetQuote.name ||
          k === targetQuote.name ||
          (updated[k].client && targetQuote.client && updated[k].client.toLowerCase() === targetQuote.client.toLowerCase())
      );

      if (!matchedKey) {
        matchedKey = targetQuote.name || targetNum;
        updated[matchedKey] = { ...targetQuote };
      }

      const pList = updated[matchedKey].payments || [];
      const targetId = oldPayment.id || oldPayment.receiptNumber;
      const nextPayments = pList.map(p =>
        (p.id && p.id === targetId) || (p.receiptNumber && p.receiptNumber === targetId) ? updatedPayment : p
      );

      const totalPaid = nextPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const itemsSubtotal = (updated[matchedKey].items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
      const grandTotal = Math.round(itemsSubtotal * (1 + (Number(updated[matchedKey].gst) || 18) / 100));

      let newStatus = updated[matchedKey].status;
      if (totalPaid >= grandTotal && grandTotal > 0) {
        newStatus = 'Accepted & Paid';
      } else if (totalPaid > 0) {
        newStatus = 'Advance Received';
      }

      updated[matchedKey] = {
        ...updated[matchedKey],
        ...(updatedQuote || {}),
        payments: nextPayments,
        status: newStatus
      };

      try {
        localStorage.setItem('artelume_quotes', JSON.stringify(updated));
        localStorage.setItem(`artelume_q_${matchedKey}`, JSON.stringify(updated[matchedKey]));
      } catch (e) {}

      if (company?.id) {
        saveCloudQuotation(company.id, matchedKey, updated[matchedKey]).catch(console.warn);
      }

      return updated;
    });

    // 2. Update paymentTargetQuote in state so modal refreshes immediately
    setPaymentTargetQuote(prev => {
      if (!prev) return updatedQuote;
      const pList = prev.payments || [];
      const targetId = oldPayment.id || oldPayment.receiptNumber;
      const nextPayments = pList.map(p =>
        (p.id && p.id === targetId) || (p.receiptNumber && p.receiptNumber === targetId) ? updatedPayment : p
      );
      const totalPaid = nextPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const itemsSubtotal = (prev.items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
      const grandTotal = Math.round(itemsSubtotal * (1 + (Number(prev.gst) || 18) / 100));
      let newStatus = prev.status;
      if (totalPaid >= grandTotal && grandTotal > 0) newStatus = 'Accepted & Paid';
      else if (totalPaid > 0) newStatus = 'Advance Received';
      return {
        ...prev,
        payments: nextPayments,
        status: newStatus
      };
    });

    // 3. Update Bank Accounts / Cash Ledger
    const diff = Number(updatedPayment.amount) - Number(oldPayment.amount);

    if (updatedPayment.paymentMode === 'Cash') {
      setCashEntries(prev => {
        const next = prev.map(c => {
          if (c.name.includes(oldPayment.receiptNumber || '')) {
            return {
              ...c,
              amt: Number(updatedPayment.amount),
              date: updatedPayment.date || c.date
            };
          }
          return c;
        });
        try {
          localStorage.setItem('artelume_cash', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    } else {
      if (diff !== 0) {
        setBanks(prev => {
          const next = prev.map((b, idx) =>
            idx === 0 ? { ...b, bal: (Number(b.bal) || 0) + diff } : b
          );
          try {
            localStorage.setItem('artelume_banks', JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }

      setBankTransactions(prev => {
        const next = prev.map(t => {
          if (t.receiptNumber === oldPayment.receiptNumber || t.id === `tx-${oldPayment.id}`) {
            const updatedTx: BankTransaction = {
              ...t,
              amount: Number(updatedPayment.amount),
              date: updatedPayment.date || t.date,
              mode: updatedPayment.paymentMode,
              referenceNo: updatedPayment.referenceNo,
              notes: updatedPayment.notes
            };
            if (company?.id) {
              saveCloudBankTransaction(company.id, updatedTx).catch(console.warn);
            }
            return updatedTx;
          }
          return t;
        });
        try {
          localStorage.setItem('artelume_bank_transactions', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }

    // 4. Update linked delivery challans if payment collected changed
    if (diff !== 0) {
      setDeliveryChallans(prev => {
        const updated = prev.map(c => {
          if (
            c.quoteNum === targetNum ||
            (c.paymentRef && (c.paymentRef === oldPayment.receiptNumber || c.paymentRef === oldPayment.referenceNo))
          ) {
            return {
              ...c,
              paymentCollected: Math.max(0, (Number(c.paymentCollected) || 0) + diff),
              paymentMode: updatedPayment.paymentMode,
              paymentRef: updatedPayment.receiptNumber || updatedPayment.referenceNo
            };
          }
          return c;
        });
        try {
          localStorage.setItem('artelume_delivery_challans', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }

    showToast(`✏️ Payment receipt ${updatedPayment.receiptNumber} updated successfully!`);
  };

  const handleVerifyPaymentInBank = (quoteNumOrKey: string, paymentId: string) => {
    let receiptNum: string | undefined;
    setSavedQuotes(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        if (updated[key].quoteNum === quoteNumOrKey || key === quoteNumOrKey) {
          const pList = updated[key].payments || [];
          updated[key] = {
            ...updated[key],
            payments: pList.map(p => {
              if (p.id === paymentId) {
                receiptNum = p.receiptNumber;
                return { ...p, verifiedByAdmin: true };
              }
              return p;
            })
          };
          try {
            localStorage.setItem('artelume_quotes', JSON.stringify(updated));
          } catch (e) {}
          if (company?.id) {
            saveCloudQuotation(company.id, key, updated[key]).catch(console.warn);
          }
        }
      }
      return updated;
    });

    setBankTransactions(prev => {
      const updated = prev.map(t => {
        if (t.receiptNumber === receiptNum || t.id === `tx-${paymentId}`) {
          const verifiedTx = { ...t, verified: true };
          if (company?.id) {
            saveCloudBankTransaction(company.id, verifiedTx).catch(console.warn);
          }
          return verifiedTx;
        }
        return t;
      });
      try {
        localStorage.setItem('artelume_bank_transactions', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    showToast('✅ Payment verified against studio Bank Account statement!');
  };

  // Delivery Challan Handlers with Strict Client Isolation & Bi-Directional Payment Sync
  const handleSaveChallan = (challan: DeliveryChallan, paymentRecord?: QuotationPaymentRecord) => {
    // 1. Update deliveryChallans state
    setDeliveryChallans(prev => {
      const existingIdx = prev.findIndex(c => c.id === challan.id);
      let updated: DeliveryChallan[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = challan;
      } else {
        updated = [challan, ...prev];
      }
      try {
        localStorage.setItem('artelume_delivery_challans', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. BI-DIRECTIONAL SYNC: Strictly match the quotation belonging to this client
    let matchedQuoteDoc: QuotationDocument | undefined;
    setSavedQuotes(prev => {
      const updated = { ...prev };
      const matchedKey = Object.keys(updated).find(k => isChallanLinkedToQuote(challan, updated[k], k));

      if (matchedKey && updated[matchedKey]) {
        const q = updated[matchedKey];
        const existingChallans = q.deliveryChallans || [];
        const nextChallans = Array.from(new Set([...existingChallans, challan.challanNum]));
        const newStatus =
          challan.status === 'Delivered'
            ? 'Delivered'
            : challan.status === 'In-Transit'
            ? 'Dispatched'
            : q.status;

        updated[matchedKey] = {
          ...q,
          deliveryChallans: nextChallans,
          status: newStatus,
          siteAddress: challan.siteAddress || q.siteAddress,
          clientPhone: challan.contactPhone || q.clientPhone
        };
        matchedQuoteDoc = updated[matchedKey];

        try {
          localStorage.setItem('artelume_quotes', JSON.stringify(updated));
        } catch (e) {}
        if (company?.id) {
          saveCloudQuotation(company.id, matchedKey, updated[matchedKey]).catch(console.warn);
        }
      }
      return updated;
    });

    // 3. Process On-Delivery Payment if collected: creates official receipt & credits bank
    const targetQuoteForPayment = matchedQuoteDoc || challanSourceQuote || (isChallanLinkedToQuote(challan, currentQuoteDoc) ? currentQuoteDoc : undefined);
    const paymentToRecord = paymentRecord || (
      challan.paymentCollected && Number(challan.paymentCollected) > 0
        ? createPaymentRecordFromChallan(challan, userProfile?.displayName || user?.displayName || 'Studio Logistics')
        : undefined
    );

    if (paymentToRecord && targetQuoteForPayment) {
      handleSavePayment(paymentToRecord, targetQuoteForPayment);
    }

    // 4. Update active quotation if it strictly matches
    if (isChallanLinkedToQuote(challan, currentQuoteDoc)) {
      if (challan.status === 'Delivered') setQuoteStatus('Delivered');
      else if (challan.status === 'In-Transit') setQuoteStatus('Dispatched');
    }

    // 5. Cloud Sync Delivery Challan to Firestore
    if (company?.id) {
      saveCloudDeliveryChallan(company.id, challan).catch(console.warn);
    }

    recordStudioNotification(
      'challan',
      `Delivery Challan #${challan.challanNum} Issued`,
      `Goods dispatched to ${challan.client || 'client'} • Status: ${challan.status}`
    );

    showToast(`🚚 Delivery Challan #${challan.challanNum} saved for ${challan.client || 'client'}${paymentToRecord ? ` & payment receipt ${paymentToRecord.receiptNumber} (${formatInr(paymentToRecord.amount)}) credited to Bank!` : '!'}`);
  };

  const handleUnlinkChallanFromQuote = (quoteKey: string, challanNum: string) => {
    setSavedQuotes(prev => {
      const updated = { ...prev };
      if (!updated[quoteKey]) return prev;
      const q = updated[quoteKey];
      const remainingChallans = (q.deliveryChallans || []).filter(cn => cn !== challanNum);

      // Recompute quote status
      const linked = deliveryChallans.filter(
        c => c.challanNum !== challanNum && isChallanLinkedToQuote(c, q, quoteKey)
      );
      const newStatus = linked.some(c => c.status === 'Delivered')
        ? 'Delivered'
        : linked.some(c => c.status === 'In-Transit')
        ? 'Dispatched'
        : (q.payments && q.payments.length > 0)
        ? 'Advance Received'
        : 'Draft';

      updated[quoteKey] = {
        ...q,
        deliveryChallans: remainingChallans,
        status: newStatus
      };

      try {
        localStorage.setItem('artelume_quotes', JSON.stringify(updated));
      } catch (e) {}
      if (company?.id) {
        saveCloudQuotation(company.id, quoteKey, updated[quoteKey]).catch(console.warn);
      }
      return updated;
    });
    showToast(`Challan #${challanNum} unlinked from quotation.`);
  };

  const handleDeleteChallan = (challanId: string) => {
    setDeliveryChallans(prev => {
      const target = prev.find(c => c.id === challanId);
      if (!target) return prev;

      const updated = prev.filter(c => c.id !== challanId);
      try {
        localStorage.setItem('artelume_delivery_challans', JSON.stringify(updated));
      } catch (e) {}

      // Cloud deletion
      if (company?.id) {
        deleteCloudDeliveryChallan(company.id, challanId).catch(console.warn);
      }

      // 1. Remove from Quotation reference & revert payment receipt
      const cleanChallanNum = target.challanNum.replace(/^DC-?/i, '');
      const receiptNum = `RCP-DC-${cleanChallanNum}`;

      setSavedQuotes(sq => {
        const nextSq = { ...sq };
        for (const k of Object.keys(nextSq)) {
          const q = nextSq[k];
          if (q.deliveryChallans?.includes(target.challanNum)) {
            const nextChallans = (q.deliveryChallans || []).filter(cn => cn !== target.challanNum);
            const nextPayments = (q.payments || []).filter(
              p => p.receiptNumber !== receiptNum && p.id !== `pay-dc-${target.id}` && p.id !== `pay-dc-${target.challanNum}`
            );
            const totalPaid = nextPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const itemsSubtotal = (q.items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
            const grandTotal = Math.round(itemsSubtotal * (1 + (Number(q.gst) || 18) / 100));
            let newStatus = q.status;
            if (totalPaid <= 0) newStatus = 'Draft';
            else if (totalPaid < grandTotal) newStatus = 'Advance Received';
            else newStatus = 'Accepted & Paid';

            nextSq[k] = {
              ...q,
              deliveryChallans: nextChallans,
              payments: nextPayments,
              status: newStatus
            };
            if (company?.id) {
              saveCloudQuotation(company.id, k, nextSq[k]).catch(console.warn);
            }
          }
        }
        try {
          localStorage.setItem('artelume_quotes', JSON.stringify(nextSq));
        } catch (e) {}
        return nextSq;
      });

      // 2. Revert from Bank Transactions Passbook & Bank Balance
      if (target.paymentCollected && Number(target.paymentCollected) > 0) {
        setBankTransactions(bt => {
          const next = bt.filter(t => t.receiptNumber !== receiptNum && t.id !== `tx-pay-dc-${target.id}`);
          try {
            localStorage.setItem('artelume_bank_transactions', JSON.stringify(next));
          } catch (e) {}
          return next;
        });

        if (company?.id) {
          deleteCloudBankTransaction(company.id, `tx-pay-dc-${target.id}`).catch(console.warn);
          deleteCloudBankTransaction(company.id, `tx-${receiptNum}`).catch(console.warn);
        }

        if (target.paymentMode !== 'Cash') {
          setBanks(bList => {
            const next = bList.map((b, idx) =>
              idx === 0 ? { ...b, bal: Math.max(0, (Number(b.bal) || 0) - Number(target.paymentCollected)) } : b
            );
            try {
              localStorage.setItem('artelume_banks', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        }
      }

      return updated;
    });
    showToast('🗑️ Delivery Challan removed from records & cloud!');
  };

  const handleUpdateChallanStatus = (challanId: string, status: DeliveryChallan['status'], recipientName?: string) => {
    let matchedQuoteNum: string | undefined;
    setDeliveryChallans(prev => {
      const updated = prev.map(c => {
        if (c.id === challanId) {
          matchedQuoteNum = c.quoteNum;
          return {
            ...c,
            status,
            ...(recipientName ? { recipientName } : {}),
            ...(status === 'Delivered' ? { deliveredAt: new Date().toLocaleString('en-IN') } : {})
          };
        }
        return c;
      });
      try {
        localStorage.setItem('artelume_delivery_challans', JSON.stringify(updated));
      } catch (e) {}
      if (company?.id) {
        const matchDc = updated.find(c => c.id === challanId);
        if (matchDc) {
          saveCloudDeliveryChallan(company.id, matchDc).catch(console.warn);
        }
      }
      return updated;
    });

    // Sync status change directly to Saved Quotation
    if (matchedQuoteNum) {
      setSavedQuotes(prev => {
        const updated = { ...prev };
        for (const k of Object.keys(updated)) {
          if (updated[k].quoteNum === matchedQuoteNum) {
            const newStatus = status === 'Delivered' ? 'Delivered' : status === 'In-Transit' ? 'Dispatched' : updated[k].status;
            updated[k] = { ...updated[k], status: newStatus };
            try {
              localStorage.setItem('artelume_quotes', JSON.stringify(updated));
            } catch (e) {}
            if (company?.id) {
              saveCloudQuotation(company.id, k, updated[k]).catch(console.warn);
            }
          }
        }
        return updated;
      });

      if (quoteNum === matchedQuoteNum) {
        if (status === 'Delivered') setQuoteStatus('Delivered');
        else if (status === 'In-Transit') setQuoteStatus('Dispatched');
      }
    }

    showToast(`🚚 Delivery Challan & Quotation status updated to "${status}"!`);
  };

  const handleConfirmPodPayment = (
    challanId: string,
    signatureDataUrl: string,
    receiverName: string,
    receiverPhone: string,
    amount: number,
    mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque',
    notes?: string
  ) => {
    setDeliveryChallans(prev => {
      const updated = prev.map(dc => {
        if (dc.id === challanId) {
          return {
            ...dc,
            status: 'Delivered' as const,
            recipientName: receiverName,
            contactPhone: receiverPhone || dc.contactPhone,
            paymentCollected: (Number(dc.paymentCollected) || 0) + amount,
            notes: notes ? `${dc.notes ? dc.notes + ' • ' : ''}${notes}` : dc.notes
          };
        }
        return dc;
      });
      try {
        localStorage.setItem('artelume_delivery_challans', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (amount > 0 && podModalTarget?.quote) {
      const q = podModalTarget.quote;
      const cleanChallanNum = podModalTarget.challan.challanNum.replace(/^DC-?/i, '');
      const paymentModeVal: 'UPI' | 'NEFT / RTGS' | 'Cash' | 'Cheque' = mode === 'Bank Transfer' ? 'NEFT / RTGS' : mode;

      const paymentRecord: QuotationPaymentRecord = {
        id: `pay-pod-${Date.now()}`,
        amount,
        date: new Date().toISOString().split('T')[0],
        type: 'On-Delivery Payment',
        paymentMode: paymentModeVal,
        referenceNo: `RCP-POD-${cleanChallanNum}`,
        collectedByRole: currentRole,
        collectedByName: userProfile?.displayName || user?.displayName || 'Delivery Team',
        verifiedByAdmin: false,
        receiptNumber: `RCP-POD-${cleanChallanNum}`,
        notes: `On-site POD payment collected by driver/dispatch team from ${receiverName}`
      };

      setSavedQuotes(prev => {
        const next = { ...prev };
        const quoteKey = (Object.keys(next).find(k => next[k].quoteNum === q.quoteNum || k === q.name) || q.name || '') as string;
        if (quoteKey && next[quoteKey]) {
          const currentPayments = next[quoteKey].payments || [];
          next[quoteKey] = {
            ...next[quoteKey],
            status: 'Delivered',
            payments: [...currentPayments, paymentRecord]
          };
          try {
            localStorage.setItem('artelume_quotes', JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });

      const tx: BankTransaction = {
        id: `tx-pod-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: 'credit',
        amount,
        description: `Site POD Payment — ${q.client || 'Client'} (Challan #${podModalTarget.challan.challanNum})`,
        category: 'Client Payment',
        mode: paymentModeVal,
        referenceNo: `RCP-POD-${cleanChallanNum}`,
        receiptNumber: `RCP-POD-${cleanChallanNum}`,
        quoteNum: q.quoteNum,
        client: q.client
      };
      setBankTransactions(prev => [tx, ...prev]);
    }

    showToast(`✓ POD signed by ${receiverName} & ${formatInr(amount)} recorded!`);
  };

  const handleOpenCreateChallan = (fromQuote?: QuotationDocument) => {
    setChallanSourceQuote(fromQuote || currentQuoteDoc);
    setEditingChallan(null);
    setChallanModalInitialTab('edit');
    setShowChallanModal(true);
  };

  const handleOpenEditChallan = (challan: DeliveryChallan, tab: 'edit' | 'payment' | 'slip' = 'edit') => {
    setEditingChallan(challan);
    setChallanSourceQuote(null);
    setChallanModalInitialTab(tab);
    setShowChallanModal(true);
  };

  const handleUpdateSavedQuoteStatus = (quoteNameOrKey: string, newStatus: any) => {
    setSavedQuotes(prev => {
      const updated = { ...prev };
      if (updated[quoteNameOrKey]) {
        updated[quoteNameOrKey] = { ...updated[quoteNameOrKey], status: newStatus };
        try {
          localStorage.setItem('artelume_quotes', JSON.stringify(updated));
          localStorage.setItem(`artelume_q_${quoteNameOrKey}`, JSON.stringify(updated[quoteNameOrKey]));
        } catch (e) {}
        if (company?.id) {
          saveCloudQuotation(company.id, quoteNameOrKey, updated[quoteNameOrKey]).catch(console.warn);
        }
      }
      return updated;
    });
    if (quoteName === quoteNameOrKey) {
      setQuoteStatus(newStatus || 'Draft');
    }
    showToast(`Quotation status updated to "${newStatus}"!`);
  };

  // If viewing via client link, render dedicated read-only architectural client proposal
  if (clientViewData) {
    return (
      <ClientQuotationView
        quote={clientViewData.quote}
        branch={clientViewData.branch}
        expiresAt={clientViewData.expiresAt}
        isExpired={clientViewData.isExpired}
        onExitClientView={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('view');
          url.searchParams.delete('clientView');
          url.searchParams.delete('data');
          url.searchParams.delete('exp');
          url.searchParams.delete('id');
          window.history.replaceState({}, '', url.pathname + (url.search || ''));
          setClientViewData(null);
        }}
      />
    );
  }

  // If a client proposal link is being loaded from cloud
  if (isClientProposalLoading) {
    return (
      <div className="min-h-screen bg-[#110905] flex flex-col items-center justify-center p-6 text-[#f5eee6]">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7b3f22] to-[#df9c20] flex items-center justify-center shadow-[0_0_35px_rgba(223,156,32,0.35)] animate-pulse">
            <span className="font-serif font-black text-2xl text-[#110905] tracking-wider">AL</span>
          </div>
          <div className="absolute -inset-2 border-2 border-[#df9c20]/30 rounded-3xl animate-ping opacity-30" />
        </div>
        <p className="font-serif tracking-[0.25em] uppercase text-sm text-[#df9c20] font-semibold">ARTÈ LUME</p>
        <p className="text-[11px] text-[#9e8d7f] uppercase tracking-widest mt-1">Opening Architectural Lighting Proposal...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4f5f7] text-[#17191c]">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#7b3f22] text-white px-6 py-2.5 rounded-full shadow-2xl z-[9999] font-medium text-sm transition-all duration-300">
          {toastMsg}
        </div>
      )}

      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Luxury ARTÈ LUME Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 text-[#ede5dc] flex flex-col border-r border-white/5 transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
        style={{
          backgroundColor: getDarkTone(activeBranch.theme.primaryColor, 0.14),
          backgroundImage: `radial-gradient(circle at 10% 10%, ${activeBranch.theme.primaryColor}24 0%, transparent 80%)`
        }}
      >
        {/* Brand Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {activeBranch.logoUrl ? (
                <img
                  src={activeBranch.logoUrl}
                  alt={`${activeBranch.name} Logo`}
                  className="h-8 max-w-[85px] object-contain rounded bg-white/10 p-1 border border-white/15"
                />
              ) : (
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]"
                  style={{ backgroundColor: activeBranch.theme.accentColor, color: activeBranch.theme.accentColor }}
                />
              )}
              <div>
                <span className="font-serif tracking-widest text-lg font-bold text-[#f5eee6] block leading-tight">
                  {activeBranch.name}
                </span>
                <span className="text-[10px] italic block" style={{ color: activeBranch.theme.accentColor }}>
                  {activeBranch.tagline}
                </span>
              </div>
            </div>
            <button
              onClick={e => {
                e.stopPropagation();
                setSidebarOpen(false);
              }}
              className="text-[#9a8473] hover:text-white p-1 md:hidden cursor-pointer"
              title="Close sidebar"
            >
              ✕
            </button>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-full px-2.5 py-1 mt-2.5 text-[11px] text-[#c4b5a8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2ecc71] shadow-[0_0_6px_#2ecc71]" />
            <span>{activeBranch.location}</span>
          </div>

          {/* Studio Control: Owner can toggle between Hyderabad & Vizag, Staff is locked */}
          {currentRole === 'owner' ? (
            branches.length > 1 && (
              <div className="mt-3 bg-black/50 border border-white/10 rounded-lg p-1 flex items-center gap-1">
                {branches.map(b => {
                  const isSelected = b.id === activeBranchId;
                  const label = b.id === 'artelume' ? '🏛️ Artè Lume (Hyd)' : '🌊 Vizag Studio';
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => switchBranch(b.id)}
                      className={`flex-1 py-1 px-1.5 rounded text-[11px] font-semibold transition-all cursor-pointer truncate text-center ${
                        isSelected ? 'text-white shadow-sm font-bold' : 'text-[#baaaa0] hover:text-white hover:bg-white/5'
                      }`}
                      style={isSelected ? { backgroundColor: b.theme.primaryColor } : {}}
                      title={`Switch active studio branch to ${b.name}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="mt-2.5 bg-black/60 border border-amber-600/40 rounded-lg py-1.5 px-2.5 flex items-center justify-between text-xs">
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <span>🔒</span>
                <span>Assigned:</span>
              </span>
              <span className="font-bold text-[11px] text-white">
                {activeBranchId === 'artelume-vizag' ? '🌊 Vizag Studio (Siripuram)' : '🏛️ Artè Lume (Hyderabad)'}
              </span>
            </div>
          )}
        </div>

        {/* Primary Action Button - Hidden for Delivery Person */}
        {currentRole !== 'delivery' && (
          <div className="px-4 py-2">
            <button
              onClick={startNewQuote}
              className="w-full flex items-center justify-center gap-2 text-white py-2.5 px-4 rounded-lg font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${activeBranch.theme.primaryColor}, ${activeBranch.theme.accentColor})`,
                boxShadow: `0 8px 18px ${activeBranch.theme.primaryColor}55`,
                color: getContrastTextColor(activeBranch.theme.primaryColor) === '#ffffff' ? '#ffffff' : '#111215'
              }}
            >
              <span className="text-lg leading-none">+</span>
              <span>New Quotation</span>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 text-sm font-medium">
          <div className="text-[10px] uppercase tracking-wider text-[#9a8473] font-bold px-3 py-2">Navigation</div>

          <button
            onClick={() => navigateView('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
              activeView === 'dashboard' ? 'font-bold text-white' : 'text-[#baaaa0] hover:bg-white/5'
            }`}
            style={
              activeView === 'dashboard'
                ? {
                    backgroundColor: `${activeBranch.theme.primaryColor}38`,
                    borderLeft: `3px solid ${activeBranch.theme.accentColor}`,
                    color: '#ffffff'
                  }
                : {}
            }
          >
            <span className="text-base">◫</span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => navigateView('quotations')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
              activeView === 'quotations' ? 'font-bold text-white' : 'text-[#baaaa0] hover:bg-white/5'
            }`}
            style={
              activeView === 'quotations'
                ? {
                    backgroundColor: `${activeBranch.theme.primaryColor}38`,
                    borderLeft: `3px solid ${activeBranch.theme.accentColor}`,
                    color: '#ffffff'
                  }
                : {}
            }
          >
            <div className="flex items-center gap-3">
              <span className="text-base">📄</span>
              <span>Saved Quotations</span>
            </div>
            <span className="text-xs bg-black/40 border border-white/10 px-2 py-0.5 rounded-full text-[#9e8d7f]">
              {filteredSavedQuotes.length}
            </span>
          </button>

          {/* Quotation Builder - Hidden for Delivery Person */}
          {currentRole !== 'delivery' && (
            <button
              onClick={() => navigateView('quote-builder')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
                activeView === 'quote-builder' ? 'font-bold text-white' : 'text-[#baaaa0] hover:bg-white/5'
              }`}
              style={
                activeView === 'quote-builder'
                  ? {
                      backgroundColor: `${activeBranch.theme.primaryColor}38`,
                      borderLeft: `3px solid ${activeBranch.theme.accentColor}`,
                      color: '#ffffff'
                    }
                  : {}
              }
            >
              <span className="text-base">✏️</span>
              <span>Quotation Builder</span>
            </button>
          )}

          {/* Dedicated Logistics Delivery Challan Section */}
          <button
            onClick={() => navigateView('delivery-challans')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
              activeView === 'delivery-challans' ? 'font-bold text-white' : 'text-[#baaaa0] hover:bg-white/5'
            }`}
            style={
              activeView === 'delivery-challans'
                ? {
                    backgroundColor: `${activeBranch.theme.primaryColor}38`,
                    borderLeft: `3px solid ${activeBranch.theme.accentColor}`,
                    color: '#ffffff'
                  }
                : {}
            }
          >
            <div className="flex items-center gap-3">
              <span className="text-base">🚚</span>
              <span>Delivery Challans</span>
            </div>
            <span className="text-xs bg-black/40 border border-white/10 px-2 py-0.5 rounded-full text-[#9e8d7f]">
              {displayedDeliveryChallans.length}
            </span>
          </button>

          <button
            onClick={() => navigateView('products')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
              activeView === 'products' ? 'font-bold text-white' : 'text-[#baaaa0] hover:bg-white/5'
            }`}
            style={
              activeView === 'products'
                ? {
                    backgroundColor: `${activeBranch.theme.primaryColor}38`,
                    borderLeft: `3px solid ${activeBranch.theme.accentColor}`,
                    color: '#ffffff'
                  }
                : {}
            }
          >
            <div className="flex items-center gap-3">
              <span className="text-base">🗂️</span>
              <span>Product Catalog</span>
            </div>
            <span className="text-xs bg-black/40 border border-white/10 px-2 py-0.5 rounded-full text-[#9e8d7f]">
              {products.length}
            </span>
          </button>

          <button
            onClick={() => navigateView('customers')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
              activeView === 'customers' ? 'font-bold text-white' : 'text-[#baaaa0] hover:bg-white/5'
            }`}
            style={
              activeView === 'customers'
                ? {
                    backgroundColor: `${activeBranch.theme.primaryColor}38`,
                    borderLeft: `3px solid ${activeBranch.theme.accentColor}`,
                    color: '#ffffff'
                  }
                : {}
            }
          >
            <span className="text-base">👥</span>
            <span>Client Directory</span>
          </button>

          {/* Studio Owner Exclusive: Team Staff & Role Assignment Portal */}
          {currentRole === 'owner' && (
            <button
              onClick={() => setShowTeamModal(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer text-left hover:bg-white/5 border border-[#df9c20]/30 my-1 shadow-xs"
              style={{
                backgroundColor: 'rgba(223, 156, 32, 0.08)'
              }}
              title="Assign Administrator, Sales, and Delivery roles to studio staff"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">👑</span>
                <span className="text-xs font-bold text-[#f5eee6]">Team Staff &amp; Roles</span>
              </div>
              <span
                className="text-[10px] font-black px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: activeBranch.theme.primaryColor }}
              >
                {teamMembers.length}
              </span>
            </button>
          )}

          {/* Accounting & Financial Logs - Visible only to Owner and Administrator */}
          {(currentRole === 'owner' || currentRole === 'admin') && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-[#9a8473] font-bold px-3 pt-4 pb-1">Accounting &amp; Logs</div>

              {currentRole === 'owner' && (
                <button
                  onClick={() => navigateView('profit')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
                    activeView === 'profit' ? 'font-bold text-white' : 'text-[#baaaa0] hover:bg-white/5'
                  }`}
                  style={
                    activeView === 'profit'
                      ? {
                          backgroundColor: `${activeBranch.theme.primaryColor}38`,
                          borderLeft: `3px solid ${activeBranch.theme.accentColor}`,
                          color: '#ffffff'
                        }
                      : {}
                  }
                >
                  <span className="text-base">📊</span>
                  <span>Profit &amp; Overview</span>
                </button>
              )}

              <button
                onClick={() => navigateView('purchases')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
                  activeView === 'purchases' ? 'font-bold text-white' : 'text-[#baaaa0] hover:bg-white/5'
                }`}
                style={
                  activeView === 'purchases'
                    ? {
                        backgroundColor: `${activeBranch.theme.primaryColor}38`,
                        borderLeft: `3px solid ${activeBranch.theme.accentColor}`,
                        color: '#ffffff'
                      }
                    : {}
                }
              >
                <span className="text-base">📥</span>
                <span>Purchases</span>
              </button>

              <button
                onClick={() => navigateView('expenses')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
                  activeView === 'expenses' ? 'font-bold text-white' : 'text-[#baaaa0] hover:bg-white/5'
                }`}
                style={
                  activeView === 'expenses'
                    ? {
                        backgroundColor: `${activeBranch.theme.primaryColor}38`,
                        borderLeft: `3px solid ${activeBranch.theme.accentColor}`,
                        color: '#ffffff'
                      }
                    : {}
                }
              >
                <span className="text-base">🧾</span>
                <span>Expenses</span>
              </button>

              <button
                onClick={() => navigateView('bank')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
                  activeView === 'bank' ? 'font-bold text-white' : 'text-[#baaaa0] hover:bg-white/5'
                }`}
                style={
                  activeView === 'bank'
                    ? {
                        backgroundColor: `${activeBranch.theme.primaryColor}38`,
                        borderLeft: `3px solid ${activeBranch.theme.accentColor}`,
                        color: '#ffffff'
                      }
                    : {}
                }
              >
                <span className="text-base">🏦</span>
                <span>Bank Accounts</span>
              </button>

              <button
                onClick={() => navigateView('cash')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
                  activeView === 'cash' ? 'font-bold text-white' : 'text-[#baaaa0] hover:bg-white/5'
                }`}
                style={
                  activeView === 'cash'
                    ? {
                        backgroundColor: `${activeBranch.theme.primaryColor}38`,
                        borderLeft: `3px solid ${activeBranch.theme.accentColor}`,
                        color: '#ffffff'
                      }
                    : {}
                }
              >
                <span className="text-base">💵</span>
                <span>Cash In-Hand</span>
              </button>
            </>
          )}
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="p-3.5 bg-black/40 border-t border-white/5 flex flex-col gap-2.5">
          <div
            onClick={() => setShowAccountModal(true)}
            className="flex items-center justify-between p-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            title="Click to view account"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 border"
                style={{
                  backgroundColor: activeBranch.theme.primaryColor,
                  borderColor: `${activeBranch.theme.accentColor}60`
                }}
              >
                {(userProfile?.displayName || user?.displayName || user?.email || 'AL').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 truncate">
                <div className="text-xs font-bold text-[#ede5dc] truncate">
                  {userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Architect'}
                </div>
                <div className="text-[10px] text-[#9e8d7f] truncate">
                  {currentRole === 'owner' ? '👑 Studio Owner' : currentRole === 'admin' ? '🛡️ Administrator' : currentRole === 'sales' ? '💼 Sales Executive' : '🚚 Delivery Logistics'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                navigateView('settings');
              }}
              className="hover:brightness-125 transition-colors p-1 cursor-pointer"
              style={{ color: activeBranch.theme.accentColor }}
              title="Studio Settings"
            >
              ⚙
            </button>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                await signOut();
                showToast('Signed out successfully.');
              } catch (e) {
                console.error(e);
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-red-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title={`Sign out (${user?.email})`}
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop Overlay - prevents clicks from bleeding through to underlying page */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity cursor-pointer no-print"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            setSidebarOpen(false);
          }}
          onTouchStart={e => {
            e.stopPropagation();
          }}
          aria-label="Close sidebar overlay"
        />
      )}

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'ml-0'} flex flex-col min-w-0 ${sidebarOpen ? 'max-md:pointer-events-none' : ''}`}>
        {/* Top Floating Bar for Mobile / Sidebar Toggler */}
        {/* Top Floating Bar / Header: Only Company Name & Logout/Login Button */}
        <div
          className="text-white px-4 py-2.5 flex items-center justify-between no-print gap-3 transition-colors duration-300 shadow-sm"
          style={{
            backgroundColor: getDarkTone(activeBranch.theme.primaryColor, 0.22),
            borderBottom: `1px solid ${activeBranch.theme.primaryColor}50`
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={e => {
                e.stopPropagation();
                setSidebarOpen(prev => !prev);
              }}
              className="p-1 hover:bg-white/10 rounded cursor-pointer shrink-0 text-base"
              title="Toggle Sidebar"
            >
              ☰
            </button>
            <div className="flex items-center gap-2.5 min-w-0 truncate">
              {activeBranch.logoUrl && (
                <img
                  src={activeBranch.logoUrl}
                  alt={activeBranch.name}
                  className="h-6 max-w-[48px] object-contain rounded bg-white/10 p-0.5 border border-white/15 shrink-0"
                />
              )}
              <span
                className="font-serif tracking-wider font-bold text-base truncate"
                style={{ color: activeBranch.theme.accentColor }}
              >
                {activeBranch.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Activity Notifications Bell */}
            <button
              type="button"
              onClick={() => setShowNotificationsModal(true)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white text-base transition-colors cursor-pointer relative"
              title="Studio Activity Notifications (Quotations, Challans, Payments)"
            >
              <span>🔔</span>
              {studioNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#df9c20] text-[#140c08] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {Math.min(studioNotifications.length, 99)}
                </span>
              )}
            </button>

            {user ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await signOut();
                    showToast('Signed out successfully.');
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="px-3.5 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-red-100 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                title="Sign out of ARTÈ LUME"
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAccountModal(true)}
                className="px-3.5 py-1.5 bg-[#df9c20] hover:bg-[#efa624] text-[#18110c] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <span>🔑</span>
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher */}
        <main className="p-4 md:p-6 max-w-7xl mx-auto w-full flex-1">
          {/* ===================== DASHBOARD VIEW ===================== */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Studio Dashboard 👋</h1>
                  <p className="text-xs text-[#7c828b]">Real-time quotations, receivables, and luminaire inventory</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCatalogModal(true)}
                    className="px-4 py-2 text-white text-xs font-semibold rounded-lg shadow hover:brightness-110 cursor-pointer transition-all"
                    style={{
                      backgroundColor: activeBranch.theme.primaryColor,
                      color: getContrastTextColor(activeBranch.theme.primaryColor)
                    }}
                  >
                    ❖ Open Lighting Library
                  </button>
                  <button
                    onClick={startNewQuote}
                    className="px-4 py-2 text-xs font-bold rounded-lg shadow hover:brightness-105 cursor-pointer transition-all"
                    style={{
                      backgroundColor: activeBranch.theme.accentColor,
                      color: getContrastTextColor(activeBranch.theme.accentColor)
                    }}
                  >
                    + New Quotation
                  </button>
                </div>
              </div>

              {/* Computed Quotation Follow-up & Reminder Metrics */}
              {(() => {
                const reminderItems = classifyQuotationReminders(savedQuotes, deliveryChallans);
                const overdueItems = reminderItems.filter(r => r.isOverdue30Days);
                const pendingDeliveryItems = reminderItems.filter(r => r.hasPendingDelivery);
                const balanceDueItems = reminderItems.filter(r => r.hasOverdueBalance);

                const displayedReminders = reminderFilterTab === 'overdue'
                  ? overdueItems
                  : reminderFilterTab === 'delivery'
                  ? pendingDeliveryItems
                  : reminderFilterTab === 'balance'
                  ? balanceDueItems
                  : reminderItems;

                const scrollToReminderPanel = () => {
                  const el = document.getElementById('pending-overdue-panel');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                };

                return (
                  <div className="space-y-6">
                    {/* KPI Strip with 6 Quick-Action Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                      {/* 1. Total Quotations */}
                      <div className="bg-white p-4 rounded-xl border border-[#e4e5e7] shadow-sm">
                        <div className="text-xs text-[#7c828b] font-medium">Total Quotations</div>
                        <div className="text-2xl font-extrabold mt-1">{Object.keys(savedQuotes).length}</div>
                      </div>

                      {/* 2. Active Receivables */}
                      <div className="bg-white p-4 rounded-xl border border-[#e4e5e7] shadow-sm">
                        <div className="text-xs text-[#5cb85c] font-medium">Active Receivables</div>
                        <div className="text-2xl font-extrabold text-[#327442] mt-1">
                          {formatInr(
                            Object.values(savedQuotes).reduce((sum, q) => {
                              const itemsTotal = q.items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);
                              return sum + itemsTotal * 1.18;
                            }, 0)
                          )}
                        </div>
                      </div>

                      {/* 3. Overdue (>30d) Quick-Action Counter Card */}
                      <div
                        onClick={() => {
                          setReminderFilterTab('overdue');
                          scrollToReminderPanel();
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
                          overdueItems.length > 0
                            ? 'bg-red-50/70 border-red-200 hover:border-red-300 hover:bg-red-50 ring-1 ring-red-200'
                            : 'bg-white border-[#e4e5e7] hover:border-gray-300'
                        }`}
                        title="Click to view all quotations created >30 days ago that require follow-up"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-red-700">Overdue (&gt;30d)</span>
                          <span className="text-xs">🚨</span>
                        </div>
                        <div className="text-2xl font-black text-red-700 mt-1">
                          {overdueItems.length}
                        </div>
                        <div className="text-[10px] text-red-600 font-semibold mt-0.5 flex items-center gap-1">
                          <span>Action needed</span>
                          <span>›</span>
                        </div>
                      </div>

                      {/* 4. Pending Actions Counter Card */}
                      <div
                        onClick={() => {
                          setReminderFilterTab('all');
                          scrollToReminderPanel();
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
                          reminderItems.length > 0
                            ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300 hover:bg-amber-50 ring-1 ring-amber-200'
                            : 'bg-white border-[#e4e5e7] hover:border-gray-300'
                        }`}
                        title="Click to view all pending proposals and material shipments"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900">Pending Actions</span>
                          <span className="text-xs">⏳</span>
                        </div>
                        <div className="text-2xl font-black text-amber-900 mt-1">
                          {reminderItems.length}
                        </div>
                        <div className="text-[10px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                          <span>Review &amp; notify</span>
                          <span>›</span>
                        </div>
                      </div>

                      {/* 5. Catalog Fixtures */}
                      <div className="bg-white p-4 rounded-xl border border-[#e4e5e7] shadow-sm">
                        <div className="text-xs text-[#7c828b] font-medium">Catalog Fixtures</div>
                        <div className="text-2xl font-extrabold mt-1">{products.length}</div>
                      </div>

                      {/* 6. Cash In-Hand */}
                      <div className="bg-white p-4 rounded-xl border border-[#e4e5e7] shadow-sm">
                        <div className="text-xs text-[#7c828b] font-medium">Cash In-Hand</div>
                        <div
                          className="text-2xl font-extrabold mt-1 transition-colors"
                          style={{ color: activeBranch.theme.accentColor }}
                        >
                          {formatInr(cashEntries.reduce((s, c) => s + (Number(c.amt) || 0), 0))}
                        </div>
                      </div>
                    </div>

                    {/* 'Pending & Overdue' Action Center Panel */}
                    <div id="pending-overdue-panel" className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden scroll-mt-6">
                      {/* Panel Header */}
                      <div className="px-5 py-4 sm:px-6 sm:py-5 bg-[#1a1614] border-b border-stone-800 text-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#df9c20]/25 to-amber-950/40 border border-[#df9c20]/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 className="font-bold text-base text-stone-100 tracking-tight">
                                Quotation Follow-ups &amp; Action Center
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#df9c20]/15 text-[#f0ba54] border border-[#df9c20]/30 tracking-wide">
                                {reminderItems.length} ACTIVE
                              </span>
                            </div>
                            <p className="text-xs text-stone-400 mt-0.5">
                              Proposals awaiting client confirmation, partial material dispatch, or balance collection
                            </p>
                          </div>
                        </div>

                        {/* Filter Tabs - Clean Segmented Control */}
                        <div className="flex items-center gap-1 bg-stone-900/90 p-1 rounded-xl border border-stone-800 self-stretch sm:self-start lg:self-auto overflow-x-auto no-scrollbar text-xs">
                          <button
                            type="button"
                            onClick={() => setReminderFilterTab('all')}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                              reminderFilterTab === 'all'
                                ? 'bg-stone-800 text-white shadow-xs border border-stone-700/80 font-bold'
                                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                            }`}
                          >
                            <span>All</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${reminderFilterTab === 'all' ? 'bg-[#df9c20] text-stone-950' : 'bg-stone-800 text-stone-400'}`}>
                              {reminderItems.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setReminderFilterTab('overdue')}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                              reminderFilterTab === 'overdue'
                                ? 'bg-red-950/80 text-red-200 border border-red-700/60 shadow-xs font-bold'
                                : 'text-stone-400 hover:text-red-300 hover:bg-stone-800/50'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                            <span>Overdue &gt;30d</span>
                            {overdueItems.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-red-500/30 text-red-300">
                                {overdueItems.length}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setReminderFilterTab('delivery')}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                              reminderFilterTab === 'delivery'
                                ? 'bg-indigo-950/80 text-indigo-200 border border-indigo-700/60 shadow-xs font-bold'
                                : 'text-stone-400 hover:text-indigo-300 hover:bg-stone-800/50'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"></span>
                            <span>Pending Dispatch</span>
                            {pendingDeliveryItems.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-500/30 text-indigo-300">
                                {pendingDeliveryItems.length}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setReminderFilterTab('balance')}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                              reminderFilterTab === 'balance'
                                ? 'bg-amber-950/80 text-amber-200 border border-amber-700/60 shadow-xs font-bold'
                                : 'text-stone-400 hover:text-amber-300 hover:bg-stone-800/50'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                            <span>Balance Due</span>
                            {balanceDueItems.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/30 text-amber-300">
                                {balanceDueItems.length}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Panel Items List */}
                      <div className="p-4 sm:p-5">
                        {displayedReminders.length === 0 ? (
                          <div className="p-8 text-center space-y-2">
                            <span className="text-3xl block">🎉</span>
                            <div className="font-bold text-sm text-neutral-800">
                              No Quotations Flagged in this View
                            </div>
                            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                              {reminderItems.length === 0
                                ? 'Outstanding proposals are completely updated with zero overdue actions or undelivered fixtures.'
                                : 'No quotations meet the active filter tab selection.'}
                            </p>
                            {reminderFilterTab !== 'all' && (
                              <button
                                type="button"
                                onClick={() => setReminderFilterTab('all')}
                                className="mt-2 text-xs font-bold text-[#7b3f22] hover:underline cursor-pointer"
                              >
                                View All Flagged Proposals ({reminderItems.length})
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="divide-y divide-neutral-200">
                            {displayedReminders.map(meta => {
                              const q = meta.quote;
                              const qNum = q.quoteNum || meta.quoteKey;
                              const client = q.client || q.name || 'Valued Client';
                              const status = q.status || 'Draft';

                              return (
                                <div
                                  key={meta.quoteKey}
                                  className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50/60 p-2.5 rounded-xl transition-colors"
                                >
                                  {/* Left: Client & Proposal Identifiers */}
                                  <div className="space-y-1.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-sm text-neutral-900">{client}</span>
                                      <span className="font-mono text-xs font-bold text-[#7b3f22] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        #{qNum}
                                      </span>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        status === 'Accepted & Paid'
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                          : status === 'Advance Received'
                                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                                          : status === 'Delivered'
                                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                                          : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                                      }`}>
                                        {status}
                                      </span>
                                      {meta.isOverdue30Days && (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 animate-pulse">
                                          🚨 {meta.ageDays} DAYS OLD (OVERDUE)
                                        </span>
                                      )}
                                      {!meta.isOverdue30Days && (
                                        <span className="text-[10px] font-semibold text-neutral-500">
                                          📅 Created {meta.ageDays}d ago ({q.date || 'Earlier'})
                                        </span>
                                      )}
                                    </div>

                                    {/* Financial & Delivery Metrics Strip */}
                                    <div className="flex items-center gap-4 text-xs text-neutral-600 flex-wrap pt-0.5">
                                      <div>
                                        <span className="text-neutral-400">Total:</span>{' '}
                                        <strong className="text-neutral-900">{formatInr(meta.grandTotal)}</strong>
                                      </div>
                                      <div>
                                        <span className="text-neutral-400">Paid:</span>{' '}
                                        <strong className="text-emerald-700">{formatInr(meta.totalPaid)}</strong>
                                      </div>
                                      {meta.balanceDue > 0 && (
                                        <div>
                                          <span className="text-neutral-400">Balance:</span>{' '}
                                          <strong className="text-amber-800 font-extrabold">{formatInr(meta.balanceDue)}</strong>
                                        </div>
                                      )}
                                      <div className="border-l border-neutral-300 pl-3">
                                        <span className="text-neutral-400">Dispatched:</span>{' '}
                                        <strong className={meta.hasPendingDelivery ? 'text-indigo-800' : 'text-emerald-700'}>
                                          {meta.totalDeliveredQty} / {meta.totalOrderedQty} units
                                        </strong>
                                        {meta.hasPendingDelivery && (
                                          <span className="text-[10px] text-indigo-600 font-bold ml-1">
                                            ({meta.pendingDeliveryQty} left)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Quick Action Buttons */}
                                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                                    {/* 1. Notify Client (Follow-up Email / WhatsApp) */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNotifyClientTarget(meta);
                                        setShowNotifyClientModal(true);
                                      }}
                                      className="px-3.5 py-1.5 bg-[#df9c20] hover:brightness-105 text-[#170e08] font-bold text-xs rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
                                      title="Generate follow-up email or WhatsApp message with proposal summary link"
                                    >
                                      <span>📢</span>
                                      <span>Notify Client</span>
                                    </button>

                                    {/* 2. Payment */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRecordPayment(q, 'add')}
                                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-2xs cursor-pointer flex items-center gap-1 transition-all"
                                      title="Record payment or booking advance"
                                    >
                                      <span>💳</span>
                                      <span>Payment</span>
                                    </button>

                                    {/* 3. Delivery Challan */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCreateChallan(q)}
                                      className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-2xs cursor-pointer flex items-center gap-1 transition-all"
                                      title="Create delivery challan for remaining items"
                                    >
                                      <span>🚚</span>
                                      <span>Challan</span>
                                    </button>

                                    {/* 4. Edit Quotation */}
                                    <button
                                      type="button"
                                      onClick={() => openSavedQuote(meta.quoteKey)}
                                      className="px-3 py-1.5 border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 font-semibold text-xs rounded-lg shadow-2xs cursor-pointer flex items-center gap-1 transition-all"
                                      title="Open in Quotation Builder"
                                    >
                                      <span>✏️</span>
                                      <span>Edit</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Analytics Charts: Monthly Total Sales Trend Line & Category Distribution */}
              <DashboardCharts savedQuotes={savedQuotes} products={products} />

              {/* Recent Quotations & Popular Fixtures */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-[#e4e5e7] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-base">Recent Quotations</h2>
                    <button
                      onClick={() => setActiveView('quotations')}
                      className="text-xs font-bold hover:underline transition-colors"
                      style={{ color: activeBranch.theme.accentColor }}
                    >
                      View All ›
                    </button>
                  </div>
                  {Object.keys(savedQuotes).length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-500">No saved quotations yet. Click "+ New Quotation" to begin.</div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(savedQuotes)
                        .slice(0, 5)
                        .map(([name, q]) => {
                          const quoteTotal = q.items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0) * 1.18;
                          return (
                            <div
                              key={name}
                              onClick={() => openSavedQuote(name)}
                              className="p-3 border border-[#f0eae4] rounded-lg hover:bg-[#fcfaf7] cursor-pointer transition-all flex items-center justify-between"
                              style={{ borderColor: '#f0eae4' }}
                            >
                              <div>
                                <div className="font-bold text-sm text-[#170e08]">{name}</div>
                                <div className="text-xs text-[#7c828b] mt-0.5">
                                  {q.client || 'Client'} • {q.date || 'Today'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div
                                  className="font-bold text-sm transition-colors"
                                  style={{ color: activeBranch.theme.primaryColor }}
                                >
                                  {formatInr(quoteTotal)}
                                </div>
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                  {q.status || 'Draft'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Popular Lighting Fixtures */}
                <div className="bg-white rounded-xl border border-[#e4e5e7] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-base">Featured Architectural Fixtures</h2>
                    <button
                      onClick={() => setShowCatalogModal(true)}
                      className="text-xs font-bold hover:underline transition-colors"
                      style={{ color: activeBranch.theme.primaryColor }}
                    >
                      Browse Catalog ›
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {CURATED_FIXTURES.slice(0, 4).map(f => (
                      <div
                        key={f.id}
                        onClick={() => openAddProductModal(f)}
                        className="p-3 border border-[#eee] rounded-lg hover:border-[#df9c20] transition-colors cursor-pointer flex flex-col justify-between"
                      >
                        <div
                          className="text-xs font-mono font-bold transition-colors"
                          style={{ color: activeBranch.theme.primaryColor }}
                        >
                          {f.sku}
                        </div>
                        <div className="font-bold text-xs text-[#17191c] line-clamp-1 mt-1">{f.name}</div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          {f.watt} • {f.cct} • {f.beam}
                        </div>
                        <div className="mt-2 text-sm font-extrabold text-[#17191c]">{formatInr(f.price)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== SAVED QUOTATIONS VIEW ===================== */}
          {activeView === 'quotations' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Saved Quotations</h1>
                  <p className="text-xs text-[#7c828b]">Manage client proposals, auto-allocated delivery challans &amp; payment installments</p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => navigateView('delivery-challans')}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
                    title="View all site delivery challans and shipments across all quotations"
                  >
                    <span>🚚</span>
                    <span>View All Delivery Challans ({deliveryChallans.length}) ›</span>
                  </button>
                  {currentRole !== 'delivery' && (
                    <button
                      onClick={startNewQuote}
                      className="px-4 py-2 text-xs font-bold rounded-lg shadow hover:brightness-105 cursor-pointer transition-all"
                      style={{
                        backgroundColor: activeBranch.theme.accentColor,
                        color: getContrastTextColor(activeBranch.theme.accentColor)
                      }}
                    >
                      + New Quotation
                    </button>
                  )}
                </div>
              </div>

              {Object.keys(savedQuotes).length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-[#d9cbb9] p-12 text-center">
                  <div className="text-4xl mb-3">📄</div>
                  <div className="font-bold text-base">No Saved Quotations Found</div>
                  <div className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Create a new quotation to automatically save client luminaire schedules and price proposals.
                  </div>
                  <button
                    onClick={startNewQuote}
                    className="mt-4 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all hover:brightness-110"
                    style={{
                      backgroundColor: activeBranch.theme.primaryColor,
                      color: getContrastTextColor(activeBranch.theme.primaryColor)
                    }}
                  >
                    + Create First Quotation
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search Toolbar */}
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[260px]">
                      <input
                        type="text"
                        value={quoteSearchQuery}
                        onChange={e => setQuoteSearchQuery(e.target.value)}
                        placeholder="Search quotations by client name, project title, or quote #..."
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-xs outline-none transition-colors"
                      />
                      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
                      {quoteSearchQuery && (
                        <button
                          onClick={() => setQuoteSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs px-1 cursor-pointer"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 font-medium">
                      Showing{' '}
                      <strong
                        className="font-bold transition-colors"
                        style={{ color: activeBranch.theme.primaryColor }}
                      >
                        {filteredSavedQuotes.length}
                      </strong>{' '}
                      of {Object.keys(savedQuotes).length} quotation{Object.keys(savedQuotes).length === 1 ? '' : 's'}
                    </div>
                  </div>

                  {filteredSavedQuotes.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                      <div className="text-3xl mb-2">🔍</div>
                      <div className="font-bold text-sm text-gray-800">No Quotations Match Your Search</div>
                      <div className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        No proposals found matching &quot;{quoteSearchQuery}&quot;. Check the client name, project title, or quote ID.
                      </div>
                      <button
                        onClick={() => setQuoteSearchQuery('')}
                        className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Clear Search
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {filteredSavedQuotes.map(([name, q]) => {
                        const totalVal = q.items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0) * 1.18;
                        const qBranch = branches.find(b => b.id === q.branchId) || (q.quoteNum?.startsWith('LC') ? branches.find(b => b.id === 'lightcraft') : branches[0]) || activeBranch;
                        const linkedChallans = getLinkedChallansForQuote(q, deliveryChallans, name);
                        const qPayments = q.payments || [];
                        const qPaidTotal = qPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                        const qBalanceDue = Math.max(0, totalVal - qPaidTotal);
                        const paidPct = totalVal > 0 ? Math.min(100, Math.round((qPaidTotal / totalVal) * 100)) : 0;
                        const effectiveStatus = linkedChallans.some(c => c.status === 'Delivered')
                          ? 'Delivered'
                          : linkedChallans.some(c => c.status === 'In-Transit')
                          ? 'Dispatched'
                          : q.status || 'Draft';

                        const qTotalOrdered = (q.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
                        const qTotalDispatched = linkedChallans.reduce((sum, ch) => {
                          return sum + (ch.items || []).reduce((s, it) => s + (Number(it.qtyDispatched) || 0), 0);
                        }, 0);
                        const qDispatchPct = qTotalOrdered > 0 ? Math.min(100, Math.round((qTotalDispatched / qTotalOrdered) * 100)) : (linkedChallans.length > 0 ? 100 : 0);
                        const rawLead = q.dedicatedPerson || 'Vikram Sharma';
                        const cleanLead = rawLead.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || rawLead;

                        return (
                          <div
                            key={name}
                            className="bg-white border border-stone-200 hover:border-stone-400 rounded-xl p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                            onClick={() => {
                              if (currentRole === 'delivery') {
                                navigateView('delivery-challans');
                                showToast(`Viewing delivery challans for ${q.client || name}`);
                              } else {
                                openSavedQuote(name);
                              }
                            }}
                          >
                            {/* Left Information Strip */}
                            <div className="space-y-2 flex-1 min-w-0">
                              {/* 1. Header: Quote Code, Name/Client, Status, Branch */}
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span
                                  className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-100 border border-stone-200"
                                  style={{ color: qBranch.theme.primaryColor }}
                                >
                                  {q.quoteNum || 'QT'}
                                </span>
                                <span className="font-bold text-base text-stone-900 tracking-tight">{name}</span>
                                <select
                                  value={q.status || 'Draft'}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => {
                                    e.stopPropagation();
                                    handleUpdateSavedQuoteStatus(name, e.target.value as any);
                                  }}
                                  className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border cursor-pointer outline-none shadow-2xs transition-colors ${
                                    effectiveStatus === 'Delivered'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : effectiveStatus === 'Dispatched'
                                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                                      : effectiveStatus === 'Accepted & Paid'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : effectiveStatus === 'Advance Received'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : effectiveStatus === 'Sent'
                                      ? 'bg-sky-50 text-sky-800 border-sky-300'
                                      : effectiveStatus === 'Accepted'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : effectiveStatus === 'Rejected'
                                      ? 'bg-red-50 text-red-800 border-red-300'
                                      : 'bg-stone-100 text-stone-700 border-stone-300'
                                  }`}
                                  title="Click to change quotation status"
                                >
                                  <option value="Draft">Draft</option>
                                  <option value="Sent">Sent</option>
                                  <option value="Accepted">Accepted ✅</option>
                                  <option value="Advance Received">Advance Received 💳</option>
                                  <option value="Accepted & Paid">Accepted & Paid 💳</option>
                                  <option value="Dispatched">Dispatched 🚚</option>
                                  <option value="Delivered">Delivered 📦</option>
                                  <option value="Rejected">Rejected ❌</option>
                                </select>
                                <span className="text-[11px] font-medium text-stone-500 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200/80">
                                  🏛️ {qBranch.name || 'Artè Lume'}
                                </span>
                              </div>

                              {/* 2. Metadata: Date, Items Count, Clean Sales Lead (No redundant client repetition) */}
                              <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
                                <span>{q.date || 'Today'}</span>
                                <span className="text-stone-300">•</span>
                                <span className="text-stone-700 font-medium">{q.items.length} line items</span>
                                <span className="text-stone-300">•</span>
                                <span>Lead: <strong className="font-semibold text-stone-800">{cleanLead}</strong></span>
                                {q.client && q.client.toLowerCase() !== name.toLowerCase() && (
                                  <>
                                    <span className="text-stone-300">•</span>
                                    <span>Client: <strong className="font-semibold text-stone-800">{q.client}</strong></span>
                                  </>
                                )}
                              </div>

                              {/* 3. Live Financial & Dispatch Indicators (Clean & Compact) */}
                              <div className="flex items-center gap-3 text-xs flex-wrap pt-0.5" onClick={e => e.stopPropagation()}>
                                {/* Payment progress bar */}
                                <div
                                  className="flex items-center gap-2 cursor-pointer group"
                                  onClick={() => handleOpenRecordPayment(q, 'history')}
                                  title="View payments & installments history"
                                >
                                  <div className="w-24 bg-stone-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full ${qPaidTotal >= totalVal && totalVal > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                      style={{ width: `${paidPct}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] text-stone-600 font-medium group-hover:text-stone-900 transition-colors">
                                    {qPaidTotal >= totalVal && totalVal > 0 ? (
                                      <span className="text-emerald-700 font-semibold">✓ Paid in Full ({formatInr(qPaidTotal)})</span>
                                    ) : (
                                      <span>
                                        Paid: <strong className="text-emerald-700 font-semibold">{formatInr(qPaidTotal)}</strong> • Due:{' '}
                                        <strong className="text-stone-900 font-semibold">{formatInr(qBalanceDue)}</strong>
                                      </span>
                                    )}
                                  </span>
                                  {qPayments.length > 0 && (
                                    <span className="text-[10px] text-stone-400">
                                      ({qPayments.length} inst.)
                                    </span>
                                  )}
                                </div>

                                {/* Dispatch indicator */}
                                {linkedChallans.length > 0 ? (
                                  <div
                                    className="flex items-center gap-1.5 border-l border-stone-200 pl-3 cursor-pointer group"
                                    onClick={() => setActiveQuoteMenu(prev => (prev === `dispatch-${name}` ? null : `dispatch-${name}`))}
                                    title="Click to view delivery challans and material matrix"
                                  >
                                    <span className="text-[11px] text-stone-400">Dispatch:</span>
                                    <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                                      qDispatchPct >= 100 ? 'text-emerald-700' : 'text-indigo-700'
                                    }`}>
                                      <span>🚚 {linkedChallans.length} {linkedChallans.length === 1 ? 'Challan' : 'Challans'}</span>
                                      <span className="font-mono text-[10px] font-bold">({qDispatchPct}%)</span>
                                    </span>
                                  </div>
                                ) : (
                                  <div className="border-l border-stone-200 pl-3 text-[11px] text-stone-400">
                                    No shipments yet
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right Action & Price Column */}
                            <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
                              {/* Price */}
                              <div className="sm:text-right">
                                <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Total (incl. GST)</div>
                                <div
                                  className="text-lg font-black"
                                  style={{ color: qBranch.theme.primaryColor }}
                                >
                                  {formatInr(totalVal)}
                                </div>
                              </div>

                              {/* Unified Toolbar (Edit + Delivery & Matrix dropdown + Payments dropdown + More dropdown) */}
                              <div className="flex items-center gap-2 flex-wrap sm:justify-end relative" onClick={e => e.stopPropagation()}>
                                {/* 1. Edit Button */}
                                {currentRole !== 'delivery' && (
                                  <button
                                    type="button"
                                    onClick={() => openSavedQuote(name)}
                                    className="px-3 py-1.5 bg-[#7b3f22] hover:bg-[#5f3019] text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                    title="Open quote builder"
                                  >
                                    <span>✏️</span>
                                    <span>Edit</span>
                                  </button>
                                )}

                                {/* 2. Unified Delivery & Matrix Dropdown (Exact match for user prompt) */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setActiveQuoteMenu(prev => (prev === `dispatch-${name}` ? null : `dispatch-${name}`));
                                    }}
                                    className="px-3 py-1.5 bg-[#0f2744] hover:bg-[#0284c7] text-[#bae6fd] hover:text-white border border-[#0284c7]/40 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                                    title="View Material Matrix & Manage Delivery Challans"
                                  >
                                    <span>🚚</span>
                                    <span>Challan &amp; Matrix</span>
                                    {linkedChallans.length > 0 && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 rounded text-sky-200">
                                        {linkedChallans.length}
                                      </span>
                                    )}
                                    <span className="text-[9px] opacity-75">▼</span>
                                  </button>

                                  {activeQuoteMenu === `dispatch-${name}` && (
                                    <div
                                      className="absolute right-0 bottom-full mb-1.5 bg-[#182232] text-white border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[260px] flex flex-col gap-1 text-xs animate-in fade-in duration-100"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <div className="text-[10px] uppercase font-bold text-slate-400 px-2.5 py-1 border-b border-slate-800 flex justify-between items-center">
                                        <span>Dispatch &amp; Matrix Hub</span>
                                        <span className="text-sky-400 font-mono text-[9px]">{qTotalDispatched}/{qTotalOrdered} units</span>
                                      </div>

                                      {/* Action A: Material Matrix Modal */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMatrixModalQuote(q);
                                          setActiveQuoteMenu(null);
                                        }}
                                        className="flex items-center gap-2.5 p-2 hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                                      >
                                        <span className="text-base">📊</span>
                                        <div className="flex-1">
                                          <div className="font-bold text-white text-xs flex items-center justify-between">
                                            <span>Material Dispatch Matrix</span>
                                            <span className="text-[10px] text-sky-400 font-mono font-bold">{qDispatchPct}%</span>
                                          </div>
                                          <div className="text-[10px] text-slate-400">Ordered vs dispatched cumulative balance</div>
                                        </div>
                                      </button>

                                      {/* Action B: Create Next Challan */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleOpenCreateChallan(q);
                                          setActiveQuoteMenu(null);
                                        }}
                                        className="flex items-center gap-2.5 p-2 hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                                      >
                                        <span className="text-base">🚚</span>
                                        <div>
                                          <div className="font-bold text-white text-xs">
                                            + Issue New Challan {linkedChallans.length > 0 ? `(#${linkedChallans.length + 1})` : ''}
                                          </div>
                                          <div className="text-[10px] text-slate-400">Auto-allocate fixtures to site shipment</div>
                                        </div>
                                      </button>

                                      {/* Action C: On-Site POD Simulator */}
                                      {linkedChallans.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPodModalTarget({ challan: linkedChallans[0], quote: q });
                                            setActiveQuoteMenu(null);
                                          }}
                                          className="flex items-center gap-2.5 p-2 hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                                        >
                                          <span className="text-base">✍️</span>
                                          <div>
                                            <div className="font-bold text-white text-xs">On-Site POD &amp; UPI Collection</div>
                                            <div className="text-[10px] text-slate-400">Digital signature &amp; instant delivery receipt</div>
                                          </div>
                                        </button>
                                      )}

                                      {/* Subsection: Active Linked Challans List */}
                                      {linkedChallans.length > 0 && (
                                        <div className="mt-1 pt-1 border-t border-slate-800/80">
                                          <div className="text-[9px] uppercase font-bold text-slate-400 px-2 py-0.5">
                                            Active Challans ({linkedChallans.length})
                                          </div>
                                          <div className="max-h-36 overflow-y-auto space-y-0.5">
                                            {linkedChallans.map(dc => (
                                              <div
                                                key={dc.id}
                                                className="flex items-center justify-between p-1.5 hover:bg-slate-800/70 rounded-lg text-xs"
                                              >
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    handleOpenEditChallan(dc);
                                                    setActiveQuoteMenu(null);
                                                  }}
                                                  className="flex items-center gap-1.5 text-left text-sky-300 hover:text-white font-mono font-bold cursor-pointer"
                                                >
                                                  <span>#{dc.challanNum}</span>
                                                  <span className="text-[9px] font-sans font-normal text-slate-400">({dc.status})</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={e => {
                                                    e.stopPropagation();
                                                    handleUnlinkChallanFromQuote(name, dc.challanNum);
                                                  }}
                                                  className="text-[10px] text-slate-500 hover:text-red-400 px-1.5 py-0.5 rounded cursor-pointer"
                                                  title={`Unlink #${dc.challanNum}`}
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* 3. Combined Payments Hub */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setActiveQuoteMenu(prev => (prev === `pay-${name}` ? null : `pay-${name}`));
                                    }}
                                    className="px-3 py-1.5 bg-[#2a1f10] hover:bg-[#d97706] text-[#fde68a] hover:text-black border border-[#d97706]/60 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                    title="Manage booking advance, installment payments, and view receipts"
                                  >
                                    <span>💳</span>
                                    <span>Payments ({qPayments.length})</span>
                                    <span className="text-[9px] opacity-75">▼</span>
                                  </button>

                                  {activeQuoteMenu === `pay-${name}` && (
                                    <div
                                      className="absolute right-0 bottom-full mb-1.5 bg-[#182232] text-white border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[210px] flex flex-col gap-1 text-xs animate-in fade-in duration-100"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <div className="text-[10px] uppercase font-bold text-slate-400 px-2.5 py-1 border-b border-slate-800">
                                        Payments &amp; Receipts
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleOpenRecordPayment(q, 'add');
                                          setActiveQuoteMenu(null);
                                        }}
                                        className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                                      >
                                        <span className="text-base">💳</span>
                                        <div>
                                          <div className="font-bold text-white text-xs">Record Payment</div>
                                          <div className="text-[10px] text-slate-400">Collect via UPI, Cash, Cheque</div>
                                        </div>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleOpenRecordPayment(q, 'history');
                                          setActiveQuoteMenu(null);
                                        }}
                                        className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                                      >
                                        <span className="text-base">🧾</span>
                                        <div>
                                          <div className="font-bold text-white text-xs">View Receipts ({qPayments.length})</div>
                                          <div className="text-[10px] text-slate-400">Print or share official receipts</div>
                                        </div>
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* 4. Combined Export & More Hub */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setActiveQuoteMenu(prev => (prev === `export-${name}` ? null : `export-${name}`));
                                    }}
                                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                    title="Export, Print PDF, Excel, WhatsApp, or Duplicate"
                                  >
                                    <span>📤</span>
                                    <span>More</span>
                                    <span className="text-[9px] opacity-75">▼</span>
                                  </button>

                                  {activeQuoteMenu === `export-${name}` && (
                                    <div
                                      className="absolute right-0 bottom-full mb-1.5 bg-[#182232] text-white border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[220px] flex flex-col gap-1 text-xs animate-in fade-in duration-100"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <div className="text-[10px] uppercase font-bold text-slate-400 px-2.5 py-1 border-b border-slate-800">
                                        Export &amp; Options
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          openSavedQuote(name);
                                          setShowPdfPreviewModal(true);
                                          setActiveQuoteMenu(null);
                                        }}
                                        className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                                      >
                                        <span className="text-base">🖨️</span>
                                        <div>
                                          <div className="font-bold text-white text-xs">Print / Save PDF</div>
                                          <div className="text-[10px] text-slate-400">Official client presentation proposal</div>
                                        </div>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          openSavedQuote(name);
                                          setShowSpreadsheetModal(true);
                                          setActiveQuoteMenu(null);
                                        }}
                                        className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                                      >
                                        <span className="text-base">📗</span>
                                        <div>
                                          <div className="font-bold text-white text-xs">Excel Spreadsheet (.xlsx)</div>
                                          <div className="text-[10px] text-slate-400">Download formatted workbook</div>
                                        </div>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newName = `${q.name} (Copy)`;
                                          const nextNum = `${activeBranch.id === 'lightcraft' ? 'LC' : 'AL'}-${String(Object.keys(savedQuotes).length + 1).padStart(3, '0')}`;
                                          const duplicated: QuotationDocument = {
                                            ...q,
                                            id: `quote-${Date.now()}`,
                                            name: newName,
                                            quoteNum: nextNum,
                                            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                                            status: 'Draft',
                                            payments: [],
                                            deliveryChallans: []
                                          };
                                          setSavedQuotes(prev => ({ ...prev, [newName]: duplicated }));
                                          showToast(`📋 Quotation duplicated as "${newName}" (#${nextNum})!`);
                                          setActiveQuoteMenu(null);
                                        }}
                                        className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                                      >
                                        <span className="text-base">📋</span>
                                        <div>
                                          <div className="font-bold text-white text-xs">Duplicate Quote</div>
                                          <div className="text-[10px] text-slate-400">Clone line items to new draft</div>
                                        </div>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          openSavedQuote(name);
                                          setShowWhatsAppShareModal(true);
                                          setActiveQuoteMenu(null);
                                        }}
                                        className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded-lg text-left cursor-pointer transition-colors"
                                      >
                                        <span className="text-base">📱</span>
                                        <div>
                                          <div className="font-bold text-white text-xs">Share on WhatsApp</div>
                                          <div className="text-[10px] text-slate-400">Direct instant proposal message</div>
                                        </div>
                                      </button>
                                      <div className="border-t border-slate-800 pt-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            deleteSavedQuote(name);
                                            setActiveQuoteMenu(null);
                                          }}
                                          className="flex items-center gap-2 p-2 hover:bg-red-950/60 text-red-400 hover:text-red-300 rounded-lg text-left cursor-pointer transition-colors w-full"
                                        >
                                          <span className="text-base">🗑️</span>
                                          <div>
                                            <div className="font-bold text-xs">Delete Quotation</div>
                                            <div className="text-[10px] text-red-500/80">Permanently remove proposal</div>
                                          </div>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===================== QUOTATION BUILDER VIEW ===================== */}
          {activeView === 'quote-builder' && (
            <div className="space-y-4">
              {/* Overhead Quotation Management Bar (Clean & Focused on Drafting) */}
              <div className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-neutral-500 uppercase tracking-wider">Quote Name:</span>
                    <input
                      type="text"
                      value={quoteName}
                      onChange={e => {
                        const val = e.target.value;
                        setQuoteName(val);
                        setClient(val);
                      }}
                      placeholder="e.g. Ar. Rajesh Mehta / Hyderabad Villa"
                      className="bg-[#faf8f5] border border-neutral-300 focus:border-[#7b3f22] rounded-lg px-3 py-1.5 text-xs text-neutral-900 font-bold outline-none w-56 sm:w-80 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-2xs">
                    {autoSaveStatus}
                  </span>
                </div>
              </div>

              {/* Studio Printable Document Card */}
              <div className="bg-white rounded-xl border border-[#d9cbb9] shadow-sm overflow-hidden">
                {/* Header Banner */}
                <header
                  className="text-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors"
                  style={{ backgroundColor: activeBranch.theme.primaryColor }}
                >
                  <div className="flex items-center gap-4">
                    {activeBranch.logoUrl && (
                      <div className="bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20 shrink-0 max-w-[130px] max-h-[70px] flex items-center justify-center">
                        <img
                          src={activeBranch.logoUrl}
                          alt={`${activeBranch.name} Logo`}
                          className="max-h-12 max-w-full object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <div className="font-serif text-3xl font-bold tracking-wider text-[#f5eee6] flex items-center gap-2">
                        <span>{activeBranch.name}</span>
                      </div>
                      <div className="text-xs italic mt-0.5" style={{ color: activeBranch.theme.accentColor }}>
                        {activeBranch.tagline}
                      </div>
                      <div className="text-[11px] text-white/80 mt-1 max-w-lg">
                        {activeBranch.address}
                      </div>
                      <div className="text-[10px] text-white/70 mt-0.5 font-mono">
                        GSTIN: {activeBranch.gstin} • {activeBranch.email} {activeBranch.phone ? `• ${activeBranch.phone}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="font-bold text-2xl tracking-wide" style={{ color: activeBranch.theme.accentColor }}>
                      QUOTATION
                    </div>
                    <div className="text-xs text-white/90">Luminaire Specification &amp; Price Proposal</div>
                    <div className="text-xs font-mono font-bold text-[#f2cf8c] mt-1"># {quoteNum}</div>
                    <div className="text-[11px] text-white/75 mt-0.5 font-medium">{activeBranch.location}</div>
                  </div>
                </header>

                {/* Studio Identity Strip in Quote Builder */}
                <div className="bg-[#f2ece4] border-b border-[#d9cbb9] px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs no-print">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#443831]">Issuing Studio:</span>
                    {branches.length > 1 ? (
                      <div className="inline-flex rounded-lg p-0.5 bg-neutral-200/90 border border-neutral-300">
                        {branches.map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => switchBranch(b.id)}
                            className={`px-3 py-1 rounded font-semibold text-xs transition-all cursor-pointer ${
                              b.id === activeBranchId
                                ? 'bg-white shadow-sm text-neutral-900 font-bold'
                                : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                          >
                            {b.id === 'artelume' ? '🏛️ Artè Lume (Hyderabad)' : b.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="font-semibold text-neutral-800 bg-white px-2.5 py-0.5 rounded border border-neutral-300">
                        🏛️ {activeBranch.name} ({activeBranch.location.split('•')[1]?.trim() || activeBranch.location})
                      </span>
                    )}
                  </div>
                </div>

                {/* Quotation Settings Box (Hidden in Print) */}
                <div className="p-4 bg-[#faf8f5] border-b border-[#d9cbb9] no-print">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div
                      className="text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                      style={{ color: activeBranch.theme.primaryColor }}
                    >
                      <span>Quotation Columns &amp; Display Options</span>
                      <span className="text-[10px] bg-amber-100/80 text-amber-900 font-semibold px-2 py-0.5 rounded-full border border-amber-300/60">
                        ⚡ Specs Formatted Line-by-Line in Description
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCode(true);
                          setShowDiscount(true);
                          setShowBank(true);
                          setShowBeam(true);
                          setShowCRI(true);
                          setShowIP(true);
                          setShowFinish(true);
                          setShowReflector(true);
                        }}
                        className="text-[11px] font-semibold hover:underline cursor-pointer transition-colors"
                        style={{ color: activeBranch.theme.primaryColor }}
                      >
                        Enable All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCode(true);
                          setShowDiscount(false);
                          setShowBank(true);
                          setShowBeam(false);
                          setShowCRI(false);
                          setShowIP(false);
                          setShowFinish(false);
                          setShowReflector(false);
                        }}
                        className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 hover:underline cursor-pointer"
                      >
                        Minimal (Default)
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Columns & Section Toggles */}
                    <button
                      type="button"
                      onClick={() => setShowCode(!showCode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        showCode
                          ? 'bg-[#7b3f22] text-white border-[#7b3f22] shadow-xs font-bold'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      style={showCode ? { backgroundColor: activeBranch.theme.primaryColor, borderColor: activeBranch.theme.primaryColor } : {}}
                      title="Toggle Product Code column"
                    >
                      <span className="font-bold text-xs">{showCode ? '✓' : '+'}</span>
                      <span>Product Code</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDiscount(!showDiscount)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        showDiscount
                          ? 'bg-[#7b3f22] text-white border-[#7b3f22] shadow-xs font-bold'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      style={showDiscount ? { backgroundColor: activeBranch.theme.primaryColor, borderColor: activeBranch.theme.primaryColor } : {}}
                      title="Toggle List Price & Discount % columns"
                    >
                      <span className="font-bold text-xs">{showDiscount ? '✓' : '+'}</span>
                      <span>List Price &amp; Disc %</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowBank(!showBank)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        showBank
                          ? 'bg-[#7b3f22] text-white border-[#7b3f22] shadow-xs font-bold'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      style={showBank ? { backgroundColor: activeBranch.theme.primaryColor, borderColor: activeBranch.theme.primaryColor } : {}}
                      title="Toggle Bank Transfer Details card"
                    >
                      <span className="font-bold text-xs">{showBank ? '✓' : '+'}</span>
                      <span>Bank Details</span>
                    </button>

                    {/* Divider separating Layout toggles from Specs in Description */}
                    <div className="h-5 w-[1px] bg-stone-300 hidden sm:block mx-1" />

                    {/* Specs in Description Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-xs font-bold flex items-center gap-1 mr-1"
                        style={{ color: activeBranch.theme.primaryColor }}
                      >
                        Specs in Description:
                      </span>

                      <button
                        type="button"
                        onClick={() => setShowBeam(!showBeam)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          showBeam
                            ? 'bg-[#7b3f22] text-white border-[#7b3f22] shadow-xs font-bold'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        style={showBeam ? { backgroundColor: activeBranch.theme.primaryColor, borderColor: activeBranch.theme.primaryColor } : {}}
                        title="Toggle Beam Angle specification in description"
                      >
                        <span className="font-bold text-xs">{showBeam ? '✓' : '+'}</span>
                        <span>🎯 Beam</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCRI(!showCRI)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          showCRI
                            ? 'bg-[#7b3f22] text-white border-[#7b3f22] shadow-xs font-bold'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        style={showCRI ? { backgroundColor: activeBranch.theme.primaryColor, borderColor: activeBranch.theme.primaryColor } : {}}
                        title="Toggle Color Rendering Index (CRI) in description"
                      >
                        <span className="font-bold text-xs">{showCRI ? '✓' : '+'}</span>
                        <span>🎨 CRI</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowIP(!showIP)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          showIP
                            ? 'bg-[#7b3f22] text-white border-[#7b3f22] shadow-xs font-bold'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        style={showIP ? { backgroundColor: activeBranch.theme.primaryColor, borderColor: activeBranch.theme.primaryColor } : {}}
                        title="Toggle IP Rating (Ingress Protection) in description"
                      >
                        <span className="font-bold text-xs">{showIP ? '✓' : '+'}</span>
                        <span>🛡️ IP</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowFinish(!showFinish)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          showFinish
                            ? 'bg-[#7b3f22] text-white border-[#7b3f22] shadow-xs font-bold'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        style={showFinish ? { backgroundColor: activeBranch.theme.primaryColor, borderColor: activeBranch.theme.primaryColor } : {}}
                        title="Toggle Body Finish specification in description"
                      >
                        <span className="font-bold text-xs">{showFinish ? '✓' : '+'}</span>
                        <span>✨ Finish</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowReflector(!showReflector)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          showReflector
                            ? 'bg-[#7b3f22] text-white border-[#7b3f22] shadow-xs font-bold'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        style={showReflector ? { backgroundColor: activeBranch.theme.primaryColor, borderColor: activeBranch.theme.primaryColor } : {}}
                        title="Toggle Reflector specification in description"
                      >
                        <span className="font-bold text-xs">{showReflector ? '✓' : '+'}</span>
                        <span>🔆 Reflector</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Client Information Bar (Clean 2-Column Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-[#d9cbb9] text-xs">
                  <div className="flex border-b sm:border-b-0 sm:border-r border-[#d9cbb9]">
                    <div
                      className="text-white px-4 py-2.5 font-bold flex items-center justify-center min-w-[110px] transition-colors"
                      style={{ backgroundColor: activeBranch.theme.primaryColor }}
                    >
                      Client Name
                    </div>
                    <input
                      type="text"
                      value={client}
                      onChange={e => {
                        const val = e.target.value;
                        setClient(val);
                        setQuoteName(val);
                      }}
                      placeholder="e.g. Ar. Rajesh Mehta / Hyderabad Villa"
                      className="flex-1 px-3 py-2 bg-transparent font-semibold text-sm outline-none"
                    />
                  </div>

                  <div className="flex">
                    <div
                      className="text-white px-4 py-2.5 font-bold flex items-center justify-center min-w-[110px] transition-colors"
                      style={{ backgroundColor: activeBranch.theme.primaryColor }}
                    >
                      Quotation Date
                    </div>
                    <input
                      type="text"
                      value={quoteDate}
                      onChange={e => setQuoteDate(e.target.value)}
                      className="flex-1 px-3 py-2 bg-transparent font-semibold outline-none text-center"
                    />
                  </div>
                </div>

                {/* Dedicated Person / Quote Handler & Challan Dispatch Allocation Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-[#d9cbb9] bg-[#fbf9f6] text-xs no-print">
                  <div className="flex border-b sm:border-b-0 sm:border-r border-[#d9cbb9]">
                    <div
                      className="text-white px-3 py-2 font-bold flex items-center justify-center min-w-[130px] transition-colors gap-1.5"
                      style={{ backgroundColor: activeBranch.theme.accentColor }}
                      title="The dedicated person named on this quote automatically becomes the in-charge and recipient for all delivery challans"
                    >
                      <span>🎯</span>
                      <span>Dedicated Person</span>
                    </div>
                    <input
                      type="text"
                      value={dedicatedPerson}
                      onChange={e => setDedicatedPerson(e.target.value)}
                      placeholder="e.g. Vikram Sharma (Sales Lead)"
                      className="flex-1 px-3 py-2 bg-transparent font-bold text-xs outline-none text-[#7b3f22]"
                    />
                  </div>

                  <div className="flex border-b sm:border-b-0 sm:border-r border-[#d9cbb9]">
                    <div className="bg-[#ede4d8] text-[#554338] px-3 py-2 font-bold flex items-center justify-center min-w-[90px]">
                      Role / Dept
                    </div>
                    <input
                      type="text"
                      value={dedicatedPersonRole}
                      onChange={e => setDedicatedPersonRole(e.target.value)}
                      placeholder="e.g. Senior Lighting Consultant"
                      className="flex-1 px-3 py-2 bg-transparent font-semibold outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between px-3 py-1.5 gap-2 bg-emerald-50/60">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[10px] font-bold text-emerald-900 truncate">
                        ⚡ Auto-allocates to Challans
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateChallan(currentQuoteDoc)}
                      className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-[11px] rounded shadow-xs cursor-pointer flex items-center gap-1 shrink-0 transition-all hover:scale-[1.02]"
                      title="1-Click create delivery challan pre-allocated to this dedicated person"
                    >
                      <span>🚚</span>
                      <span>Create Challan</span>
                    </button>
                  </div>
                </div>

                {/* Quotation Table Schedule with Side-Docked Stock Drawer */}
                <div className="flex flex-col lg:flex-row items-stretch border-t border-[#d9cbb9] relative">
                  {/* Interactive Table with Lighting Specifications */}
                  <div className="flex-1 min-w-0 overflow-x-auto">
                    <table className="w-full border-collapse text-xs quote-table">
                      <thead>
                        <tr
                          className="text-white text-center font-bold transition-colors"
                          style={{ backgroundColor: activeBranch.theme.primaryColor }}
                        >
                          <th className="p-2 border border-[#d9cbb9] w-10">S.No.</th>
                          {showCode && <th className="p-2 border border-[#d9cbb9] min-w-[130px] text-left">Product Code</th>}
                          <th className="p-2 border border-[#d9cbb9] min-w-[280px] text-left">Product Description &amp; Specifications</th>
                          <th className="p-2 border border-[#d9cbb9] w-24">Image</th>
                          <th className="p-2 border border-[#d9cbb9] w-14">Qty</th>
                          {showDiscount && (
                            <>
                              <th className="p-2 border border-[#d9cbb9] w-24 text-right">List Price (₹)</th>
                              <th className="p-2 border border-[#d9cbb9] w-16">Disc %</th>
                            </>
                          )}
                          <th className="p-2 border border-[#d9cbb9] w-24 text-right">Unit Price (₹)</th>
                          <th className="p-2 border border-[#d9cbb9] w-28 text-right">Total (₹)</th>
                          <th className="p-2 border border-[#d9cbb9] w-10 no-print">Act</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => {
                          const rowTotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
                          const isRowTargeted = isSideCatalogOpen && activeCatalogRowIndex === idx;
                          return (
                            <tr
                              key={item.id || idx}
                              onClick={() => {
                                if (isSideCatalogOpen) {
                                  setActiveCatalogRowIndex(idx);
                                }
                              }}
                              className={`border-b border-[#d9cbb9] text-center transition-colors cursor-pointer ${
                                isRowTargeted
                                  ? 'bg-amber-50/70 ring-2 ring-amber-400 ring-inset font-semibold'
                                  : idx % 2 === 0
                                  ? 'bg-white'
                                  : 'bg-[#fdfaf6]'
                              }`}
                            >
                              {/* S.No */}
                              <td className="p-2 border border-[#d9cbb9] font-semibold text-gray-500 align-top pt-3">{idx + 1}</td>

                              {/* Product Code (with autocomplete suggestion & ⚡ Stock Drawer opener) */}
                              {showCode && (
                                <td className="p-1.5 border border-[#d9cbb9] text-left relative align-top">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={item.sku || ''}
                                      onFocus={() => {
                                        setActiveCatalogRowIndex(idx);
                                        setActiveCodeDropdown(idx);
                                      }}
                                      onChange={e => {
                                        handleItemChange(idx, 'sku', e.target.value);
                                        setActiveCodeDropdown(idx);
                                      }}
                                      placeholder="SKU Code"
                                      className="w-full bg-transparent px-1.5 py-1 outline-none font-mono font-bold text-[#17191c]"
                                    />
                                    {/* ⚡ Stock Items Catalog Opener Button (matching user screenshot) */}
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        setActiveCatalogRowIndex(idx);
                                        setIsSideCatalogOpen(true);
                                      }}
                                      className={`p-1 rounded text-xs font-bold transition-all no-print shrink-0 cursor-pointer ${
                                        isRowTargeted
                                          ? 'bg-amber-500 text-white shadow-xs'
                                          : 'text-amber-700 hover:text-amber-900 hover:bg-amber-100'
                                      }`}
                                      title={`Open Stock Items Catalog Drawer for Row #${idx + 1}`}
                                    >
                                      ⚡
                                    </button>
                                    {(item.sku || item.name) && (
                                      <button
                                        type="button"
                                        onClick={() => openSkuHistory(item.sku, item.name, idx)}
                                        className="text-amber-800 hover:text-amber-950 hover:bg-amber-100/70 p-1 rounded text-xs transition-colors no-print shrink-0 cursor-pointer"
                                        title="View SKU Pricing & Usage History across past quotations"
                                      >
                                        🕒
                                      </button>
                                    )}
                                  </div>
                                {activeCodeDropdown === idx && item.sku && (
                                  <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-[#df9c20] rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto no-print">
                                    {products
                                      .filter(p => p.sku.toLowerCase().includes((item.sku || '').toLowerCase()))
                                      .slice(0, 5)
                                      .map(p => (
                                        <div
                                          key={p.id}
                                          onMouseDown={() => {
                                            handleItemChange(idx, 'sku', p.sku);
                                            setActiveCodeDropdown(null);
                                          }}
                                          className="p-2 hover:bg-[#faf7f4] cursor-pointer text-left border-b border-gray-100 flex items-center justify-between"
                                        >
                                          <div>
                                            <div
                                              className="font-mono font-bold text-xs"
                                              style={{ color: activeBranch.theme.primaryColor }}
                                            >
                                              {p.sku}
                                            </div>
                                            <div className="text-[11px] text-gray-600 line-clamp-1">{p.name}</div>
                                          </div>
                                          <div className="font-bold text-xs text-emerald-700">{formatInr(p.price)}</div>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </td>
                            )}

                            {/* Product Description & Line-by-Line Specifications */}
                            <td className="p-2 border border-[#d9cbb9] text-left align-top">
                              {/* Line 1 & Line 2 in SAME LINE: Product Description + Watt & CCT */}
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={item.name || ''}
                                  onChange={e => handleItemChange(idx, 'name', e.target.value)}
                                  placeholder="Product description & luminaire model"
                                  className="flex-1 min-w-[220px] bg-transparent px-1 py-0.5 outline-none font-bold text-sm text-[#17191c] border-b border-gray-300 focus:border-[#7b3f22]"
                                />
                                <div className="flex items-center gap-1.5 text-gray-700 bg-stone-50/70 p-1 rounded border border-stone-200/60 shrink-0 no-print">
                                  <span className="font-semibold text-gray-500">⚡ Power:</span>
                                  <input
                                    type="text"
                                    value={item.watt || ''}
                                    onChange={e => handleItemChange(idx, 'watt', e.target.value)}
                                    placeholder="12W"
                                    className="w-16 px-1 py-0.5 bg-white border border-stone-300 rounded font-bold text-center text-[11px] outline-none focus:border-[#7b3f22]"
                                  />
                                  <span className="text-gray-300">|</span>
                                  <span className="font-semibold text-gray-500">💡 CCT:</span>
                                  <input
                                    type="text"
                                    value={item.cct || ''}
                                    onChange={e => handleItemChange(idx, 'cct', e.target.value)}
                                    placeholder="3000K"
                                    className="w-20 px-1 py-0.5 bg-white border border-stone-300 rounded font-bold text-center text-[#a75723] text-[11px] outline-none focus:border-[#7b3f22]"
                                  />
                                </div>
                              </div>

                              {/* Interactive Line-by-Line Technical Specifications */}
                              {(showBeam || showCRI || showIP || showFinish || showReflector) && (
                                <div className="mt-2 pt-2 border-t border-[#ebdcd0] space-y-1.5 no-print text-[11px]">
                                  {/* Line 3: Beam Angle SEPARATE LINE */}
                                  {showBeam && (
                                    <div className="flex items-center gap-1.5 bg-stone-50/70 p-1 rounded border border-stone-200/60">
                                      <span className="font-semibold text-gray-500">🎯 Beam Angle:</span>
                                      <input
                                        type="text"
                                        value={item.beam || ''}
                                        onChange={e => handleItemChange(idx, 'beam', e.target.value)}
                                        placeholder="24°"
                                        className="w-24 px-1.5 py-0.5 bg-white border border-stone-300 rounded font-semibold text-center text-[11px] outline-none focus:border-[#7b3f22]"
                                      />
                                    </div>
                                  )}

                                  {/* Line 4: CRI SEPARATE LINE */}
                                  {showCRI && (
                                    <div className="flex items-center gap-1.5 bg-amber-50/40 p-1 rounded border border-amber-200/50">
                                      <span className="font-bold text-amber-800">🎨 CRI:</span>
                                      <input
                                        type="text"
                                        value={item.cri || ''}
                                        onChange={e => handleItemChange(idx, 'cri', e.target.value)}
                                        placeholder="CRI 95+"
                                        className="w-28 px-1.5 py-0.5 bg-white border border-amber-300 rounded font-bold text-[11px] text-[#7b3f22] outline-none focus:border-[#7b3f22]"
                                      />
                                      <span className="text-[10px] text-amber-600 font-medium">(Color Rendering Index)</span>
                                    </div>
                                  )}

                                  {/* Line 5: IP Rating SEPARATE LINE */}
                                  {showIP && (
                                    <div className="flex items-center gap-1.5 bg-blue-50/40 p-1 rounded border border-blue-200/50">
                                      <span className="font-bold text-blue-800">🛡️ IP Rating:</span>
                                      <input
                                        type="text"
                                        value={item.ip || ''}
                                        onChange={e => handleItemChange(idx, 'ip', e.target.value)}
                                        placeholder="IP20"
                                        className="w-24 px-1.5 py-0.5 bg-white border border-blue-300 rounded font-bold text-[11px] text-blue-900 outline-none focus:border-blue-700"
                                      />
                                      <span className="text-[10px] text-blue-600 font-medium">(Ingress Protection)</span>
                                    </div>
                                  )}

                                  {/* Line 6: Body Finish & Reflector in SAME LINE */}
                                  {(showFinish || showReflector) && (
                                    <div className="flex flex-wrap items-center gap-1.5 text-gray-700 bg-stone-50/70 p-1 rounded border border-stone-200/60">
                                      {showFinish && (
                                        <>
                                          <span className="font-semibold text-gray-500">✨ Body Finish:</span>
                                          <input
                                            type="text"
                                            value={item.finish || ''}
                                            onChange={e => handleItemChange(idx, 'finish', e.target.value)}
                                            placeholder="Matte White"
                                            className="w-28 px-1.5 py-0.5 bg-white border border-stone-300 rounded font-semibold text-[11px] outline-none focus:border-[#7b3f22]"
                                          />
                                        </>
                                      )}
                                      {showFinish && showReflector && <span className="text-gray-300">|</span>}
                                      {showReflector && (
                                        <>
                                          <span className="font-semibold text-gray-500">🔆 Reflector:</span>
                                          <input
                                            type="text"
                                            value={item.reflector || ''}
                                            onChange={e => handleItemChange(idx, 'reflector', e.target.value)}
                                            placeholder="Specular"
                                            className="w-24 px-1.5 py-0.5 bg-white border border-stone-300 rounded font-semibold text-[11px] outline-none focus:border-[#7b3f22]"
                                          />
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Print-Only Pristine Specification Stack (Shown when printed/saved as PDF) */}
                              <div className="hidden print:block mt-1.5 pt-1 border-t border-gray-200 space-y-0.5 text-[10px] text-gray-700 font-sans leading-tight">
                                {/* Line 1 & Line 2 in SAME LINE: Title + Watt & CCT */}
                                <div className="font-bold text-gray-900">
                                  <span>{item.name || item.sku || 'Architectural Lighting Fixture'}</span>
                                  {(item.watt || item.cct) && (
                                    <span className="font-normal text-gray-700 ml-2">
                                      — {[item.watt ? `⚡ Power: ${item.watt}` : '', item.cct ? `💡 CCT: ${item.cct}` : ''].filter(Boolean).join('  |  ')}
                                    </span>
                                  )}
                                </div>
                                {showBeam && item.beam && (
                                  <div>
                                    🎯 Beam Angle: {item.beam}
                                  </div>
                                )}
                                {showCRI && item.cri && (
                                  <div className="font-bold text-gray-800">
                                    🎨 CRI: {item.cri}
                                  </div>
                                )}
                                {showIP && item.ip && (
                                  <div className="font-bold text-gray-800">
                                    🛡️ IP Rating: {item.ip}
                                  </div>
                                )}
                                {((showFinish && item.finish) || (showReflector && item.reflector)) && (
                                  <div>
                                    {[showFinish && item.finish ? `✨ Body Finish: ${item.finish}` : '', showReflector && item.reflector ? `🔆 Reflector: ${item.reflector}` : ''].filter(Boolean).join('  |  ')}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Product Image (supports paste & file selection) */}
                            <td
                              className="p-1.5 border border-[#d9cbb9] relative align-middle"
                              onPaste={e => handleImagePaste(e, idx)}
                            >
                              {item.img ? (
                                <div className="relative group inline-block">
                                  <img
                                    src={item.img}
                                    alt="Product"
                                    className="w-16 h-12 object-contain bg-white rounded border border-gray-200 mx-auto"
                                  />
                                  <button
                                    onClick={() => handleItemChange(idx, 'img', '')}
                                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center shadow no-print"
                                    title="Remove image"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="no-print">
                                  <label
                                    className="cursor-pointer border border-dashed border-[#d9cbb9] rounded p-1 text-[10px] text-gray-500 block hover:bg-white transition-colors"
                                    title="Click to upload or press Ctrl+V to paste"
                                  >
                                    <div className="flex flex-col items-center leading-tight py-0.5">
                                      <span className="font-bold transition-colors" style={{ color: activeBranch.theme.primaryColor }}>📁 Upload</span>
                                      <span className="text-[9px] text-gray-400">or Ctrl+V</span>
                                    </div>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={e => handleImageFile(e, idx)}
                                    />
                                  </label>
                                </div>
                              )}
                            </td>

                            {/* Qty */}
                            <td className="p-1.5 border border-[#d9cbb9]">
                              <input
                                type="number"
                                min={1}
                                value={item.qty}
                                onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, idx)}
                                className="w-full text-center bg-transparent font-bold outline-none"
                              />
                            </td>

                            {/* List Price */}
                            {showDiscount && (
                              <>
                                <td className="p-1.5 border border-[#d9cbb9] text-right">
                                  <input
                                    type="number"
                                    value={item.listPrice || ''}
                                    onChange={e => handleItemChange(idx, 'listPrice', e.target.value)}
                                    className="w-full text-right bg-transparent font-medium outline-none"
                                  />
                                </td>
                                <td className="p-1.5 border border-[#d9cbb9]">
                                  <input
                                    type="number"
                                    value={item.discount || 0}
                                    onChange={e => handleItemChange(idx, 'discount', e.target.value)}
                                    className="w-full text-center bg-transparent font-medium outline-none"
                                  />
                                </td>
                              </>
                            )}

                            {/* Unit Price */}
                            <td className="p-1.5 border border-[#d9cbb9] text-right font-bold text-gray-800">
                              <input
                                type="number"
                                value={item.price ? Number(item.price).toFixed(2) : ''}
                                onChange={e => handleItemChange(idx, 'price', e.target.value)}
                                className="w-full text-right bg-transparent font-bold outline-none"
                              />
                            </td>

                            {/* Total Amount */}
                            <td
                              className="p-2 border border-[#d9cbb9] text-right font-extrabold transition-colors"
                              style={{ color: activeBranch.theme.primaryColor }}
                            >
                              {money(rowTotal)}
                            </td>

                            {/* Row Actions */}
                            <td className="p-1 border border-[#d9cbb9] no-print">
                              <div className="flex items-center justify-center gap-1">
                                {(item.sku || item.name) && (
                                  <button
                                    type="button"
                                    onClick={() => openSkuHistory(item.sku, item.name, idx)}
                                    className="text-amber-800 hover:text-amber-950 hover:bg-amber-100/70 p-1 rounded text-xs transition-colors cursor-pointer"
                                    title="View SKU Pricing & Usage History across past quotations"
                                  >
                                    🕒
                                  </button>
                                )}
                                <button
                                  onClick={() => removeRow(idx)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold p-1 cursor-pointer rounded transition-colors"
                                  title="Delete Row"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Docked Side Stock Items Catalog Drawer */}
                <SideStockCatalogDrawer
                  isOpen={isSideCatalogOpen}
                  onClose={() => setIsSideCatalogOpen(false)}
                  activeRowIndex={activeCatalogRowIndex}
                  activeRowSku={items[activeCatalogRowIndex]?.sku}
                  activeRowName={items[activeCatalogRowIndex]?.name}
                  products={products}
                  branch={activeBranch}
                  onSelectItem={handlePopulateRowFromStock}
                  formatInr={formatInr}
                  onOpenPdfImporter={() => setShowPdfCatalogModal(true)}
                />
              </div>

                {/* Table Actions Toolbar (Hidden in Print) */}
                <div className="p-3 bg-[#fbf8f5] border-t border-[#d9cbb9] flex flex-wrap items-center justify-between gap-3 no-print">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={addBlankRow}
                      className="px-3.5 py-1.5 hover:brightness-105 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer transition-all"
                      style={{ backgroundColor: activeBranch.theme.accentColor }}
                    >
                      + Add Blank Row
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const targetIdx = items.length > 0 ? (activeCatalogRowIndex < items.length ? activeCatalogRowIndex : items.length - 1) : 0;
                        setActiveCatalogRowIndex(targetIdx);
                        setIsSideCatalogOpen(!isSideCatalogOpen);
                      }}
                      className={`px-3.5 py-1.5 font-bold text-xs rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5 transition-all text-white ${
                        isSideCatalogOpen ? 'ring-2 ring-amber-400 font-extrabold shadow-md' : 'hover:brightness-110'
                      }`}
                      style={{ backgroundColor: activeBranch.theme.primaryColor }}
                      title="Toggle Side Stock Items Catalog Drawer"
                    >
                      <span className="text-amber-300">⚡</span>
                      <span>{isSideCatalogOpen ? 'Close Stock Drawer' : 'Stock Items (Side)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPdfCatalogModal(true)}
                      className="px-3.5 py-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100/80 font-bold text-xs rounded-lg cursor-pointer transition-all flex items-center gap-1.5 text-amber-950 shadow-2xs hover:scale-[1.02]"
                      title="Upload product PDF catalog or price sheet to auto-extract luminaires without manual typing"
                    >
                      <span className="text-sm">⚡</span>
                      <span>Auto-Import PDF Catalog</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCatalogModal(true)}
                      className="px-3 py-1.5 border border-[#d9cbb9] bg-white hover:bg-gray-50 font-semibold text-xs rounded-lg cursor-pointer transition-all"
                      style={{ color: activeBranch.theme.primaryColor }}
                      title="Browse Full Screen Catalog / Library Modal"
                    >
                      <span>❖</span>
                      <span>Catalog Library Modal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddProductModal()}
                      className="px-3 py-1.5 border border-[#d9cbb9] bg-white hover:bg-gray-50 font-semibold text-xs rounded-lg cursor-pointer transition-all flex items-center gap-1"
                      style={{ color: activeBranch.theme.primaryColor }}
                      title="Enter a new product from your price list with specs and image"
                    >
                      <span>+</span>
                      <span>Add Product Spec</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkImportModal(true)}
                      className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/70 font-semibold text-xs rounded-lg cursor-pointer transition-all flex items-center gap-1 text-emerald-900 shadow-2xs"
                      title="Bulk enter multiple products from your price list and paste images"
                    >
                      <span>📋</span>
                      <span>Bulk Price List Entry</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium">GST Rate:</span>
                    <input
                      type="number"
                      value={gstRate}
                      onChange={e => setGstRate(Number(e.target.value) || 0)}
                      className="w-14 bg-white border border-[#d9cbb9] px-2 py-1 rounded text-xs text-center font-bold"
                    />
                    <span className="text-xs font-bold text-gray-600">%</span>
                  </div>
                </div>

                {/* Totals Summary Card */}
                <div className="flex justify-end p-4 bg-white">
                  <div className="w-full sm:w-96 border border-[#d9cbb9] text-xs font-semibold">
                    <div className="flex justify-between p-2.5 border-b border-[#d9cbb9] bg-[#fdfaf6]">
                      <span className="text-gray-600 uppercase">Subtotal (Excl. Tax)</span>
                      <span className="font-bold text-[#17191c]">₹ {money(subtotal)}</span>
                    </div>
                    <div className="flex justify-between p-2.5 border-b border-[#d9cbb9] bg-[#fdfaf6]">
                      <span className="text-gray-600">CGST ({gstRate / 2}%)</span>
                      <span className="font-bold text-[#17191c]">₹ {money(taxHalf)}</span>
                    </div>
                    <div className="flex justify-between p-2.5 border-b border-[#d9cbb9] bg-[#fdfaf6]">
                      <span className="text-gray-600">SGST ({gstRate / 2}%)</span>
                      <span className="font-bold text-[#17191c]">₹ {money(taxHalf)}</span>
                    </div>
                    <div
                      className="flex justify-between p-3 text-white text-sm font-extrabold grand-total-row transition-colors"
                      style={{ backgroundColor: activeBranch.theme.accentColor }}
                    >
                      <span>GRAND TOTAL (INCL. GST)</span>
                      <span>₹ {money(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Quotation Payment Ledger & Add Next Payment Strip */}
                {(() => {
                  const qPayments = currentQuoteDoc.payments || [];
                  const qPaidTotal = qPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                  const qBalanceDue = Math.max(0, grandTotal - qPaidTotal);
                  const paidPercentage = grandTotal > 0 ? Math.min(100, Math.round((qPaidTotal / grandTotal) * 100)) : 0;

                  return (
                    <div className="p-4 bg-[#faf8f5] border-t border-[#d9cbb9] no-print">
                      <div className="rounded-xl border border-[#ebdcd0] bg-white p-4 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ebdcd0]">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs uppercase font-extrabold text-[#7b3f22] tracking-wider">
                                💳 Payment Status &amp; Client Ledger
                              </span>
                              {qPaidTotal >= grandTotal && grandTotal > 0 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  ✓ Fully Paid &amp; Settled (100%)
                                </span>
                              ) : qPaidTotal > 0 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                  Advance Received ({paidPercentage}%)
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-300">
                                  No Advance Yet (0%)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs">
                              <span className="text-gray-600">
                                Total Invoice Value: <strong className="font-bold text-gray-900">{formatInr(grandTotal)}</strong>
                              </span>
                              <span>•</span>
                              <span className="text-emerald-800">
                                Total Received: <strong className="font-black text-emerald-700">{formatInr(qPaidTotal)}</strong>
                              </span>
                              <span>•</span>
                              <span className="text-[#7b3f22]">
                                Balance Pending: <strong className="font-black text-base text-[#7b3f22]">{formatInr(qBalanceDue)}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Explicit Next Payment Action Button */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenRecordPayment(currentQuoteDoc)}
                              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                              title="Click to record next payment or booking advance"
                            >
                              <span className="text-sm">💳</span>
                              <span>
                                {qPaidTotal > 0
                                  ? (qBalanceDue > 0
                                      ? `+ Add Next Payment (${formatInr(qBalanceDue)} due)`
                                      : 'Record Settlement Payment')
                                  : '+ Add Booking Advance Payment'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* List of recorded payment receipts for this quotation */}
                        {qPayments.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                              <span>Recorded Receipts ({qPayments.length})</span>
                              <span className="text-[10px] text-emerald-700 font-bold">✓ Credited in Bank &amp; Cash Accounts</span>
                            </div>
                            <div className="grid gap-2">
                              {qPayments.map(p => (
                                <div
                                  key={p.id}
                                  className="p-3 bg-[#faf8f5] border border-[#ebdcd0] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-bold text-amber-900">{p.receiptNumber}</span>
                                      <span className="text-[10px] bg-white border border-neutral-200 text-neutral-800 font-semibold px-2 py-0.5 rounded">
                                        {p.type}
                                      </span>
                                      <span className="text-[10px] text-gray-500">• {p.date}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-600">
                                      Mode: <strong className="text-gray-900">{p.paymentMode}</strong>
                                      {p.referenceNo ? ` (Ref: ${p.referenceNo})` : ''} • Collected By: <strong className="text-gray-900">{p.collectedByName}</strong> ({p.collectedByRole.toUpperCase()})
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                                    <span className="font-black text-sm text-emerald-800">{formatInr(p.amount)}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      ✓ In Studio Accounts
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic py-1 flex items-center justify-between">
                            <span>No advance payments recorded yet for this quotation.</span>
                            <span className="text-[11px] text-gray-400">Standard: 60% advance before production, 40% before dispatch</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Commercial & Technical Terms */}
                <div className="p-6 bg-white border-t border-[#d9cbb9] space-y-4">
                  <div
                    className="text-white px-3 py-1 font-bold text-xs uppercase notes-header transition-colors"
                    style={{ backgroundColor: activeBranch.theme.primaryColor }}
                  >
                    Commercial &amp; Technical Terms:
                  </div>
                  <ol className="list-decimal pl-5 text-xs text-gray-700 space-y-1 italic leading-relaxed">
                    <li>Prices quoted are inclusive of {gstRate}% GST.</li>
                    <li>Warranty: 3 Years manufacturer replacement warranty on driver and LED chips.</li>
                    <li>Above quoted prices are valid only for 30 calendar days from the quotation date.</li>
                    <li>Payment terms: 60% advance with confirmed purchase order, balance 40% before dispatch.</li>
                    <li>Delivery timeline: 8-12 working days from the date of advance confirmation.</li>
                  </ol>

                  {showBank && (
                    <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="text-xs font-bold underline transition-colors"
                          style={{ color: activeBranch.theme.primaryColor }}
                        >
                          BANK TRANSFER DETAILS:
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingBankModal(true)}
                          className="no-print text-[11px] font-semibold bg-white border border-[#d9cbb9] px-2.5 py-1 rounded hover:bg-[#faf7f4] cursor-pointer flex items-center gap-1 shadow-sm transition-colors"
                          style={{ color: activeBranch.theme.primaryColor }}
                        >
                          <span>✏️</span>
                          <span>Edit Bank Details</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold uppercase text-gray-800 bg-[#fdfaf6] p-3 rounded border border-[#ebdcd0]">
                        <div>• ACC NAME: {bankInfo.accName}</div>
                        <div>• BANK ACCOUNT NO: {bankInfo.accNo}</div>
                        <div>• BANK: {bankInfo.bankName}</div>
                        <div>• IFSC CODE: {bankInfo.ifsc}</div>
                        <div className="sm:col-span-2">• BRANCH ADDRESS: {bankInfo.branch}</div>
                      </div>
                    </div>
                  )}

                  <div
                    className="text-center pt-3 text-xs font-serif italic font-bold"
                    style={{ color: activeBranch.theme.primaryColor }}
                  >
                    Thank you for choosing {activeBranch.name} — {activeBranch.tagline}.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== PRODUCT CATALOG VIEW ===================== */}
          {activeView === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Product Catalog &amp; Specification Library</h1>
                  <p className="text-xs text-[#7c828b]">
                    Manage architectural lighting fixtures, optical specs, wattages, and list pricing
                  </p>
                </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowPdfCatalogModal(true)}
                      className="px-4 py-2 bg-[#7b3f22] hover:bg-[#683318] text-white text-xs font-bold rounded-lg shadow cursor-pointer flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                      title="Upload product PDF catalog to auto-extract luminaires without manual typing"
                    >
                      <span className="text-sm">⚡</span>
                      <span>Auto-Import from PDF</span>
                    </button>
                    <button
                      onClick={() => openAddProductModal()}
                      className="px-4 py-2 bg-[#df9c20] text-[#170e08] text-xs font-bold rounded-lg shadow cursor-pointer"
                    >
                      + Add Product Spec
                    </button>
                    <button
                      onClick={() => setShowBulkImportModal(true)}
                      className="px-4 py-2 bg-[#1a7a50] text-white text-xs font-bold rounded-lg shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📥</span>
                      <span>Bulk Import Products</span>
                    </button>
                  </div>
              </div>

              {/* Product Cards Grid with Rich Specifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(p => (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl border border-[#e4e5e7] hover:border-[#df9c20] p-4 shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-mono text-xs font-bold text-[#7b3f22]">{p.sku}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase">{p.category}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openSkuHistory(p.sku, p.name)}
                            className="p-1.5 hover:bg-amber-100 rounded text-xs text-amber-800 cursor-pointer transition-colors"
                            title="View SKU Pricing & Usage History across past quotations"
                          >
                            🕒
                          </button>
                          <button
                            onClick={() => openAddProductModal(p)}
                            className="p-1.5 hover:bg-gray-100 rounded text-xs text-gray-600"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="p-1.5 hover:bg-red-50 rounded text-xs text-red-600"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Title & Image */}
                      <div className="flex items-center gap-3 my-2">
                        {p.img ? (
                          <img
                            src={p.img}
                            alt={p.name}
                            className="w-14 h-14 object-contain rounded border border-gray-100 bg-white"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded bg-[#faf7f4] flex items-center justify-center text-xl">
                            💡
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-sm text-[#17191c] leading-snug">{p.name}</h3>
                          <div className="text-xs text-gray-600 font-semibold mt-0.5">
                            {p.watt} • {p.cct}
                          </div>
                        </div>
                      </div>

                      {/* Technical Specifications Grid */}
                      <div className="bg-[#faf8f5] p-2.5 rounded-lg border border-[#eee8df] my-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-gray-700">
                        <div>
                          <span className="text-gray-400">Beam:</span> <span className="font-semibold">{p.beam || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">CRI:</span> <span className="font-semibold">{p.cri || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">IP Rating:</span> <span className="font-semibold">{p.ip || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Finish:</span> <span className="font-semibold">{p.finish || '-'}</span>
                        </div>
                        {p.reflector && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Reflector:</span> <span className="font-semibold text-amber-800">{p.reflector}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Price & Add to Quote */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between mt-2">
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">List Price</div>
                        <div className="text-base font-extrabold text-[#17191c]">{formatInr(p.price)}</div>
                      </div>
                      <button
                        onClick={() => {
                          setItems([
                            ...items,
                            {
                              id: `item-${Date.now()}`,
                              sku: p.sku,
                              name: p.name,
                              category: p.category,
                              watt: p.watt,
                              cct: p.cct,
                              beam: p.beam || '36°',
                              cri: p.cri || 'CRI 95+',
                              ip: p.ip || 'IP20',
                              finish: p.finish || 'White',
                              reflector: p.reflector || '',
                              qty: 1,
                              listPrice: p.price,
                              discount: 0,
                              price: p.price,
                              img: p.img || ''
                            }
                          ]);
                          setActiveView('quote-builder');
                          showToast(`Added ${p.sku} to active quotation!`);
                        }}
                        className="px-3 py-1.5 bg-[#df9c20] hover:brightness-105 text-[#170e08] rounded-lg font-bold text-xs cursor-pointer"
                      >
                        + Add to Quote
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================== LOGISTICS DELIVERY CHALLANS VIEW ===================== */}
          {activeView === 'delivery-challans' && (
            <DeliveryChallanView
              challans={displayedDeliveryChallans}
              savedQuotes={savedQuotes}
              branch={activeBranch}
              currentRole={currentRole}
              staffName={userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Studio Team'}
              onOpenCreateChallan={quoteKey => {
                const q = quoteKey ? savedQuotes[quoteKey] : currentQuoteDoc;
                handleOpenCreateChallan(q);
              }}
              onOpenEditChallan={handleOpenEditChallan}
              onOpenPaymentModal={(quote, tab) => handleOpenRecordPayment(quote, tab || 'add')}
              onUpdateChallanStatus={handleUpdateChallanStatus}
              onDeleteChallan={handleDeleteChallan}
              onOpenMaterialMatrix={q => setMatrixModalQuote(q)}
              onOpenPodSimulator={(dc, q) => setPodModalTarget({ challan: dc, quote: q })}
              onShowToast={showToast}
            />
          )}

          {/* ===================== ACCOUNTING / PROFIT / CLIENT VIEWS ===================== */}
          {activeView === 'profit' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold tracking-tight">Studio Profit &amp; Overview</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <div className="text-xs text-gray-500 font-bold">Total Sales Pipeline</div>
                  <div className="text-xl font-extrabold text-emerald-600 mt-1">
                    {formatInr(
                      Object.values(savedQuotes).reduce((sum, q) => {
                        const itemsTotal = q.items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);
                        return sum + itemsTotal * 1.18;
                      }, 0)
                    )}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <div className="text-xs text-gray-500 font-bold">Total Purchases</div>
                  <div className="text-xl font-extrabold text-red-600 mt-1">
                    {formatInr(purchases.reduce((s, p) => s + (Number(p.amt) || 0), 0))}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <div className="text-xs text-gray-500 font-bold">Total Expenses</div>
                  <div className="text-xl font-extrabold text-amber-600 mt-1">
                    {formatInr(expenses.reduce((s, e) => s + (Number(e.amt) || 0), 0))}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <div className="text-xs text-gray-500 font-bold">Net Margin</div>
                  <div className="text-xl font-extrabold text-[#7b3f22] mt-1">
                    {formatInr(
                      Object.values(savedQuotes).reduce((sum, q) => {
                        return sum + q.items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0) * 1.18;
                      }, 0) -
                        purchases.reduce((s, p) => s + (Number(p.amt) || 0), 0) -
                        expenses.reduce((s, e) => s + (Number(e.amt) || 0), 0)
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'customers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Client &amp; Architect Directory</h1>
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="px-4 py-2 bg-[#df9c20] text-[#170e08] text-xs font-bold rounded-lg cursor-pointer"
                >
                  + Add Client
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                {customers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-500">No client records saved.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {customers.map((c, idx) => (
                      <div key={idx} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-sm">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.loc}</div>
                        </div>
                        <button
                          onClick={() => {
                            const updated = customers.filter((_, i) => i !== idx);
                            setCustomers(updated);
                            localStorage.setItem('artelume_customers', JSON.stringify(updated));
                          }}
                          className="text-red-500 text-xs font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'purchases' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Supplier Purchases</h1>
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="px-4 py-2 bg-[#df9c20] text-[#170e08] text-xs font-bold rounded-lg cursor-pointer"
                >
                  + Add Purchase Bill
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                {purchases.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-500">No purchases recorded.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {purchases.map((p, idx) => (
                      <div key={idx} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-sm">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.date}</div>
                        </div>
                        <div className="font-extrabold text-sm text-red-600">{formatInr(p.amt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'expenses' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Business Expenses</h1>
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="px-4 py-2 bg-[#df9c20] text-[#170e08] text-xs font-bold rounded-lg cursor-pointer"
                >
                  + Add Expense
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                {expenses.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-500">No expenses recorded.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {expenses.map((e, idx) => (
                      <div key={idx} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-sm">{e.name}</div>
                          <div className="text-xs text-gray-500">{e.date}</div>
                        </div>
                        <div className="font-extrabold text-sm text-amber-600">{formatInr(e.amt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'bank' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Studio Bank Accounts &amp; Passbook Statement</h1>
                  <p className="text-xs text-gray-500">
                    Live transaction passbook for client UPI payments, NEFT transfers, cheques, and studio ledger balances
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowDirectBankTxModal(true)}
                    className="px-3.5 py-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <span>➕</span>
                    <span>Log Bank Inflow / Outflow</span>
                  </button>
                  <button
                    onClick={() => setShowBankModal(true)}
                    className="px-4 py-2 bg-[#df9c20] text-[#170e08] text-xs font-bold rounded-lg shadow cursor-pointer transition-all hover:brightness-105"
                  >
                    + Add Bank Account
                  </button>
                </div>
              </div>

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Bank Balance</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                    {formatInr(banks.reduce((s, b) => s + (Number(b.bal) || 0), 0))}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Across {banks.length} registered studio account{banks.length === 1 ? '' : 's'}</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Client Inflows (UPI/NEFT)</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">
                    {formatInr(
                      bankTransactions
                        .filter(t => t.type === 'credit')
                        .reduce((s, t) => s + (Number(t.amount) || 0), 0)
                    )}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">
                    {bankTransactions.filter(t => t.type === 'credit').length} quotation payment receipts
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-xs text-red-600 font-semibold uppercase tracking-wider">Bank Debits / Outflows</div>
                  <div className="text-xl sm:text-2xl font-black text-red-600 mt-1">
                    {formatInr(
                      bankTransactions
                        .filter(t => t.type === 'debit')
                        .reduce((s, t) => s + (Number(t.amount) || 0), 0)
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {bankTransactions.filter(t => t.type === 'debit').length} vendor payouts &amp; debits
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-xs text-blue-700 font-semibold uppercase tracking-wider">Statement Audit Status</div>
                  <div className="text-xl sm:text-2xl font-black text-blue-900 mt-1">
                    {bankTransactions.filter(t => t.verified).length} / {bankTransactions.length}
                  </div>
                  <div className="text-[10px] text-blue-700 mt-0.5">
                    {bankTransactions.filter(t => !t.verified).length > 0 ? (
                      <span className="text-amber-700 font-bold">
                        ⚠️ {bankTransactions.filter(t => !t.verified).length} pending audit
                      </span>
                    ) : (
                      '✓ 100% verified against statement'
                    )}
                  </div>
                </div>
              </div>

              {/* Registered Bank Accounts Cards */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                    <span>🏛️</span>
                    <span>Studio Registered Accounts</span>
                  </h3>
                  <span className="text-xs text-gray-400 font-medium">{banks.length} active</span>
                </div>
                {banks.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-500">
                    No bank accounts configured. Click &quot;+ Add Bank Account&quot; to add your primary branch bank.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {banks.map((b, idx) => (
                      <div
                        key={b.id || idx}
                        className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 flex items-center justify-between gap-3 hover:border-amber-400 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{b.name}</span>
                            {idx === 0 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                Primary Branch Account
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-gray-600 mt-0.5">
                            A/c: <strong>{b.acct}</strong>
                          </div>
                          {activeBranch.bankDetails?.ifsc && (
                            <div className="text-[10px] text-gray-500">
                              IFSC: {activeBranch.bankDetails.ifsc} • {activeBranch.bankDetails.branch}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Ledger Balance</span>
                          <span className="text-base font-black text-emerald-800">{formatInr(b.bal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bank Account Passbook & Transactions Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1.5 flex-wrap text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setBankTxFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        bankTxFilter === 'all'
                          ? 'bg-gray-900 text-white font-bold shadow-2xs'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      All Transactions ({bankTransactions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankTxFilter('credit')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        bankTxFilter === 'credit'
                          ? 'bg-emerald-700 text-white font-bold shadow-2xs'
                          : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      Client Inflows ({bankTransactions.filter(t => t.type === 'credit').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankTxFilter('debit')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        bankTxFilter === 'debit'
                          ? 'bg-red-700 text-white font-bold shadow-2xs'
                          : 'bg-white border border-red-200 text-red-800 hover:bg-red-50'
                      }`}
                    >
                      Debits ({bankTransactions.filter(t => t.type === 'debit').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankTxFilter('pending')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        bankTxFilter === 'pending'
                          ? 'bg-amber-700 text-white font-bold shadow-2xs'
                          : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      Pending Audit ({bankTransactions.filter(t => !t.verified).length})
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="relative min-w-[240px]">
                    <input
                      type="text"
                      value={bankTxSearch}
                      onChange={e => setBankTxSearch(e.target.value)}
                      placeholder="Search by quotation name, client, quote #, UTR / receipt #..."
                      className="w-full pl-8 pr-7 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-[#7b3f22]"
                    />
                    <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🔍</span>
                    {bankTxSearch && (
                      <button
                        type="button"
                        onClick={() => setBankTxSearch('')}
                        className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Transactions Passbook Table */}
                {(() => {
                  const filteredTxs = bankTransactions
                    .filter(tx => {
                      if (bankTxFilter === 'credit' && tx.type !== 'credit') return false;
                      if (bankTxFilter === 'debit' && tx.type !== 'debit') return false;
                      if (bankTxFilter === 'verified' && !tx.verified) return false;
                      if (bankTxFilter === 'pending' && tx.verified) return false;
                      if (bankTxSearch.trim()) {
                        const q = bankTxSearch.toLowerCase().trim();
                        // Find matching quotation by quoteNum to search by quote name
                        const linkedQuote = tx.quoteNum
                          ? Object.values(savedQuotes).find(sq => sq.quoteNum === tx.quoteNum)
                          : undefined;
                        const pool = [
                          tx.description,
                          tx.client,
                          tx.quoteNum,
                          tx.referenceNo,
                          tx.receiptNumber,
                          tx.mode,
                          linkedQuote?.name,
                          linkedQuote?.client
                        ]
                          .filter(Boolean)
                          .join(' ')
                          .toLowerCase();
                        if (!pool.includes(q)) return false;
                      }
                      return true;
                    })
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

                  if (filteredTxs.length === 0) {
                    return (
                      <div className="p-12 text-center space-y-2">
                        <span className="text-3xl block">📋</span>
                        <h4 className="font-bold text-sm text-gray-800">No Bank Transactions Found</h4>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                          {bankTransactions.length === 0
                            ? 'Client payments recorded via UPI, NEFT, or Cheque will immediately show here with complete reference and client details.'
                            : 'No transactions meet the active filter or search criteria.'}
                        </p>
                        {bankTxSearch && (
                          <button
                            type="button"
                            onClick={() => setBankTxSearch('')}
                            className="mt-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded"
                          >
                            Clear Search
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-100/80 text-gray-700 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                            <th className="p-3">Date</th>
                            <th className="p-3">Reference / Receipt #</th>
                            <th className="p-3">Description &amp; Linked Quotation</th>
                            <th className="p-3">Client</th>
                            <th className="p-3 text-center">Payment Mode</th>
                            <th className="p-3 text-right">Inflow / Outflow</th>
                            <th className="p-3 text-center">Verification Status</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredTxs.map(tx => (
                            <tr key={tx.id} className="hover:bg-amber-50/40 transition-colors">
                              {/* Date */}
                              <td className="p-3 font-semibold text-gray-800 whitespace-nowrap">
                                {tx.date}
                              </td>

                              {/* Reference / Receipt # */}
                              <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                                <span className="text-[#7b3f22]">{tx.receiptNumber || tx.referenceNo || 'DIRECT'}</span>
                                {tx.referenceNo && tx.receiptNumber && (
                                  <span className="block text-[10px] text-gray-500 font-normal">
                                    UTR: {tx.referenceNo}
                                  </span>
                                )}
                              </td>

                              {/* Description & Link */}
                              <td className="p-3 font-medium text-gray-800">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{tx.description}</span>
                                  {tx.quoteNum && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const matchKey = Object.keys(savedQuotes).find(
                                          k => savedQuotes[k].quoteNum === tx.quoteNum || k === tx.quoteNum
                                        );
                                        if (matchKey) {
                                          openSavedQuote(matchKey);
                                        }
                                      }}
                                      className="px-1.5 py-0.2 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold border border-amber-300 cursor-pointer transition-colors shadow-2xs"
                                      title="Open this quotation in builder"
                                    >
                                      🔗 Quote #{tx.quoteNum}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Client */}
                              <td className="p-3 font-semibold text-gray-800 whitespace-nowrap">
                                {tx.client || 'Direct Studio'}
                              </td>

                              {/* Mode Badge */}
                              <td className="p-3 text-center whitespace-nowrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  tx.mode === 'UPI'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : tx.mode === 'NEFT / RTGS'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : tx.mode === 'Cheque'
                                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                                    : 'bg-neutral-100 text-neutral-800 border-neutral-300'
                                }`}>
                                  {tx.mode || 'Bank'}
                                </span>
                              </td>

                              {/* Amount */}
                              <td className="p-3 text-right whitespace-nowrap font-extrabold text-sm">
                                {tx.type === 'credit' ? (
                                  <span className="text-emerald-700 font-black">
                                    +{formatInr(tx.amount)}
                                  </span>
                                ) : (
                                  <span className="text-red-600 font-black">
                                    -{formatInr(tx.amount)}
                                  </span>
                                )}
                              </td>

                              {/* Verification Status */}
                              <td className="p-3 text-center whitespace-nowrap">
                                {tx.verified ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
                                    <span>✓</span>
                                    <span>Verified in Bank</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBankTransactions(prev => {
                                        const updated = prev.map(t => (t.id === tx.id ? { ...t, verified: true } : t));
                                        try {
                                          localStorage.setItem('artelume_bank_transactions', JSON.stringify(updated));
                                        } catch (e) {}
                                        return updated;
                                      });
                                      if (tx.quoteNum) {
                                        handleVerifyPaymentInBank(tx.quoteNum, tx.id.replace('tx-', ''));
                                      } else {
                                        showToast('✅ Transaction marked as verified against statement!');
                                      }
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-full cursor-pointer transition-colors shadow-2xs"
                                    title="Click to verify this credit against studio bank statement"
                                  >
                                    ⏳ Mark Verified
                                  </button>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="p-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Delete transaction of ${formatInr(tx.amount)} (${tx.description})?`)) {
                                      setBankTransactions(prev => {
                                        const updated = prev.filter(t => t.id !== tx.id);
                                        try {
                                          localStorage.setItem('artelume_bank_transactions', JSON.stringify(updated));
                                        } catch (e) {}
                                        return updated;
                                      });
                                      if (company?.id) {
                                        deleteCloudBankTransaction(company.id, tx.id).catch(console.warn);
                                      }
                                      // If credit, adjust bank balance
                                      setBanks(prev => {
                                        const updated = prev.map((b, idx) =>
                                          idx === 0
                                            ? {
                                                ...b,
                                                bal:
                                                  tx.type === 'credit'
                                                    ? Math.max(0, (Number(b.bal) || 0) - Number(tx.amount))
                                                    : (Number(b.bal) || 0) + Number(tx.amount)
                                              }
                                            : b
                                        );
                                        try {
                                          localStorage.setItem('artelume_banks', JSON.stringify(updated));
                                        } catch (e) {}
                                        return updated;
                                      });
                                      showToast('🗑️ Transaction removed and bank balance adjusted.');
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 text-xs font-bold p-1 hover:bg-red-50 rounded cursor-pointer"
                                  title="Delete transaction"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Direct Bank Transaction Modal */}
              {showDirectBankTxModal && (
                <div className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95">
                    <div
                      className="p-4 text-white flex items-center justify-between"
                      style={{ backgroundColor: activeBranch.theme.primaryColor }}
                    >
                      <h3 className="font-bold text-sm sm:text-base">Log Bank Inflow / Outflow</h3>
                      <button
                        type="button"
                        onClick={() => setShowDirectBankTxModal(false)}
                        className="text-white/80 hover:text-white text-lg cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        if (!directTxForm.amount || directTxForm.amount <= 0) {
                          showToast('Please enter a valid amount.');
                          return;
                        }

                        const newTx: BankTransaction = {
                          id: `tx-direct-${Date.now()}`,
                          bankAccountId: 'bank-primary',
                          date: todayStr(),
                          type: directTxForm.type,
                          amount: Number(directTxForm.amount),
                          description: directTxForm.description.trim() || (directTxForm.type === 'credit' ? 'Capital Deposit' : 'Bank Expense'),
                          category: directTxForm.type === 'credit' ? 'Capital Deposit' : 'Studio Expense',
                          mode: directTxForm.mode,
                          referenceNo: directTxForm.ref.trim() || undefined,
                          verified: true,
                          createdAt: new Date().toISOString()
                        };

                        setBankTransactions(prev => {
                          const updated = [newTx, ...prev];
                          try {
                            localStorage.setItem('artelume_bank_transactions', JSON.stringify(updated));
                          } catch (err) {}
                          return updated;
                        });

                        if (company?.id) {
                          saveCloudBankTransaction(company.id, newTx).catch(console.warn);
                        }

                        setBanks(prev => {
                          const updated = prev.map((b, idx) =>
                            idx === 0
                              ? {
                                  ...b,
                                  bal:
                                    directTxForm.type === 'credit'
                                      ? (Number(b.bal) || 0) + Number(directTxForm.amount)
                                      : Math.max(0, (Number(b.bal) || 0) - Number(directTxForm.amount))
                                }
                              : b
                          );
                          try {
                            localStorage.setItem('artelume_banks', JSON.stringify(updated));
                          } catch (err) {}
                          return updated;
                        });

                        setShowDirectBankTxModal(false);
                        setDirectTxForm({ type: 'credit', amount: 0, description: '', mode: 'UPI', ref: '' });
                        showToast(`Logged bank ${directTxForm.type === 'credit' ? 'deposit' : 'payout'} of ${formatInr(directTxForm.amount)}!`);
                      }}
                      className="p-5 space-y-4 text-xs"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDirectTxForm({ ...directTxForm, type: 'credit' })}
                          className={`py-2 rounded-lg font-bold text-center border cursor-pointer transition-all ${
                            directTxForm.type === 'credit'
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                              : 'bg-neutral-50 text-gray-700 border-gray-200 hover:bg-neutral-100'
                          }`}
                        >
                          + Inflow / Deposit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDirectTxForm({ ...directTxForm, type: 'debit' })}
                          className={`py-2 rounded-lg font-bold text-center border cursor-pointer transition-all ${
                            directTxForm.type === 'debit'
                              ? 'bg-red-600 text-white border-red-700 shadow-sm'
                              : 'bg-neutral-50 text-gray-700 border-gray-200 hover:bg-neutral-100'
                          }`}
                        >
                          - Outflow / Debit
                        </button>
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Amount (₹) *</label>
                        <input
                          type="number"
                          min={1}
                          value={directTxForm.amount || ''}
                          onChange={e => setDirectTxForm({ ...directTxForm, amount: Number(e.target.value) || 0 })}
                          placeholder="e.g. 50000"
                          className="w-full p-2 bg-[#faf8f5] border border-gray-300 rounded-lg font-bold outline-none text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Description / Narration *</label>
                        <input
                          type="text"
                          value={directTxForm.description}
                          onChange={e => setDirectTxForm({ ...directTxForm, description: e.target.value })}
                          placeholder="e.g. Partner capital infusion or showroom rent via bank"
                          className="w-full p-2 bg-[#faf8f5] border border-gray-300 rounded-lg outline-none"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-gray-700 block mb-1">Mode</label>
                          <select
                            value={directTxForm.mode}
                            onChange={e => setDirectTxForm({ ...directTxForm, mode: e.target.value as any })}
                            className="w-full p-2 bg-[#faf8f5] border border-gray-300 rounded-lg outline-none"
                          >
                            <option value="UPI">UPI</option>
                            <option value="NEFT / RTGS">NEFT / RTGS</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Card">Card</option>
                            <option value="Cash Deposit">Cash Deposit</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-gray-700 block mb-1">Ref / UTR #</label>
                          <input
                            type="text"
                            value={directTxForm.ref}
                            onChange={e => setDirectTxForm({ ...directTxForm, ref: e.target.value })}
                            placeholder="Optional UTR #"
                            className="w-full p-2 bg-[#faf8f5] border border-gray-300 rounded-lg font-mono outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setShowDirectBankTxModal(false)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-emerald-700 text-white rounded-lg font-bold shadow hover:bg-emerald-800"
                        >
                          Save Transaction
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeView === 'cash' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Cash In-Hand Ledger</h1>
                <button
                  onClick={() => setShowCashModal(true)}
                  className="px-4 py-2 bg-[#df9c20] text-[#170e08] text-xs font-bold rounded-lg cursor-pointer"
                >
                  + Add Cash Entry
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                {cashEntries.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-500">No cash transactions logged.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {cashEntries.map((c, idx) => (
                      <div key={idx} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-sm">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.date}</div>
                        </div>
                        <div className={`font-extrabold text-sm ${c.amt >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {formatInr(c.amt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Studio &amp; Branch Settings</h1>
                <p className="text-xs text-neutral-500">Configure company identities, logos, branch themes, and default tax rates</p>
              </div>

              {/* Branch Profiles & Logos Management Card */}
              <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">Studio Profiles &amp; Branding</h3>
                    <p className="text-xs text-neutral-500">Configured for Artè Lume Studio (Hyderabad) and Vizag Studio (Siripuram)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 pt-1">
                  {branches.map(b => (
                    <div
                      key={b.id}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        b.id === activeBranchId
                          ? 'border-neutral-900 bg-amber-50/20 ring-2 ring-neutral-900 shadow-sm'
                          : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-xs'
                      }`}
                      onClick={() => openBranchSettings(b.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {b.logoUrl ? (
                            <img src={b.logoUrl} alt={b.name} className="h-9 max-w-[85px] object-contain rounded bg-neutral-50 p-1 border border-neutral-200" />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs"
                              style={{ backgroundColor: b.theme.primaryColor }}
                            >
                              {b.quotePrefix || 'AL'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-neutral-900">{b.name}</span>
                              {b.id === activeBranchId && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                                  Currently Active Branch ✓
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500">{b.location} • <span className="italic">{b.tagline}</span></div>
                          </div>
                        </div>

                        {/* Branch Color Scheme Preview Swatches */}
                        <div className="flex items-center gap-2 self-start sm:self-auto bg-neutral-100 p-1.5 rounded-lg border border-neutral-200 shrink-0">
                          <div className="flex -space-x-1 items-center">
                            <span
                              className="w-5 h-5 rounded-full border border-white shadow-xs"
                              style={{ backgroundColor: b.theme.primaryColor }}
                              title={`Primary: ${b.theme.primaryColor}`}
                            />
                            <span
                              className="w-5 h-5 rounded-full border border-white shadow-xs"
                              style={{ backgroundColor: b.theme.accentColor }}
                              title={`Accent: ${b.theme.accentColor}`}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-neutral-600 font-semibold">
                            {b.theme.primaryColor}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-neutral-600 border-t border-neutral-200/80 pt-2.5">
                        <div><strong className="text-neutral-800">GSTIN:</strong> {b.gstin}</div>
                        <div><strong className="text-neutral-800">Quote Prefix:</strong> #{b.quotePrefix}-xxx</div>
                        <div><strong className="text-neutral-800">Bank:</strong> {b.bankDetails.bankName} ({b.bankDetails.accNo ? `••${b.bankDetails.accNo.slice(-4)}` : 'N/A'})</div>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            switchBranch(b.id);
                          }}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                            b.id === activeBranchId
                              ? 'bg-neutral-200 text-neutral-700 cursor-default font-bold'
                              : 'bg-neutral-900 text-white hover:bg-black shadow-xs font-semibold'
                          }`}
                        >
                          {b.id === activeBranchId ? 'Currently Active' : 'Set as Active Branch'}
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            openBranchSettings(b.id);
                          }}
                          className="text-xs bg-[#df9c20]/10 hover:bg-[#df9c20]/20 text-[#7b3f22] border border-[#df9c20]/30 font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all shadow-2xs"
                        >
                          <span>⚙️</span>
                          <span>Configure Identity, Logo, 121 Colors &amp; Bank Details</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Tax Settings Card */}
              <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4 text-xs">
                <h3 className="font-bold text-sm text-neutral-900">Tax &amp; Quotation Preferences</h3>
                <div>
                  <label className="font-bold block mb-1 text-neutral-700">Default Quotation GST Rate (%)</label>
                  <input
                    type="number"
                    value={gstRate}
                    onChange={e => {
                      const val = Number(e.target.value) || 0;
                      setGstRate(val);
                      try {
                        localStorage.setItem('artelume_default_gst', String(val));
                      } catch {}
                    }}
                    className="w-full sm:w-48 border border-neutral-300 p-2 rounded-lg font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Applies {(gstRate / 2).toFixed(1).replace('.0', '')}% CGST + {(gstRate / 2).toFixed(1).replace('.0', '')}% SGST (or {gstRate}% IGST) by default. Automatically syncs across all quotes, PDF previews, Excel exports &amp; WhatsApp summaries.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ===================== MODALS ===================== */}



      {/* SPREADSHEET IMPORT MODAL */}
      {showSpreadsheetModal && (
        <div className="fixed inset-0 bg-black/60 z-[1050] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-neutral-200">
            {/* Modal Header */}
            <div className="bg-[#170e08] text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg font-bold">
                  📥
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#ede5dc]">Upload Spreadsheet (.xlsx, .xls)</h3>
                  <p className="text-[11px] text-[#9a8473]">
                    Import client luminaire schedules or vendor quotation files into {activeBranch.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSpreadsheetModal(false);
                  setParsedSpreadsheetResult(null);
                  setSpreadsheetError(null);
                }}
                className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* File Input hidden trigger */}
              <input
                ref={spreadsheetFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleSpreadsheetFileSelect}
                className="hidden"
              />

              {!parsedSpreadsheetResult ? (
                /* Dropzone / Upload state */
                <div className="space-y-4">
                  <div
                    onClick={() => spreadsheetFileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const droppedFile = e.dataTransfer.files?.[0];
                      if (droppedFile) processSpreadsheetFile(droppedFile);
                    }}
                    className="border-2 border-dashed border-[#d9cbb9] hover:border-[#df9c20] bg-[#faf8f5] hover:bg-[#f6f0e8] rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3 group"
                  >
                    <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 group-hover:bg-amber-200 text-amber-800 flex items-center justify-center text-2xl transition-transform group-hover:scale-105">
                      📊
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#17191c]">
                        Drag and drop your spreadsheet here, or <span className="text-[#7b3f22] underline font-semibold">browse file</span>
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">
                        Supports Microsoft Excel (.xlsx, .xls) and CSV schedules
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] bg-white border border-[#d9cbb9] px-3 py-1 rounded-full text-neutral-600 font-medium">
                      <span>✓ Auto-detects Luminaire Code, Specs, Watts, CCT, Prices &amp; Embedded Images</span>
                    </div>
                  </div>

                  {isParsingSpreadsheet && (
                    <div className="flex items-center justify-center gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
                      <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                      <span>Reading and analyzing workbook sheets, rows, and cell images...</span>
                    </div>
                  )}

                  {spreadsheetError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5">
                      <span className="text-base shrink-0">⚠️</span>
                      <div>
                        <div className="font-bold">Spreadsheet Reading Issue</div>
                        <div className="text-[11px] mt-0.5">{spreadsheetError}</div>
                      </div>
                    </div>
                  )}

                  {/* Format Guidelines Card */}
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-xs space-y-2 text-neutral-600">
                    <div className="font-bold text-neutral-800 flex items-center gap-1.5">
                      <span>💡</span>
                      <span>Supported Spreadsheet Layouts:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-[11px]">
                      <li>
                        <strong>ARTÈ LUME Formatted Exports:</strong> Re-import any spreadsheet previously exported from this studio.
                      </li>
                      <li>
                        <strong>Multi-line Specs in Description:</strong> Detects Line 1 &amp; Line 2 combinations (e.g. <code>Downlight — ⚡ Power: 12W | 💡 CCT: 3000K</code>) plus Beam, CRI, Finish.
                      </li>
                      <li>
                        <strong>Multi-column Vendor Sheets:</strong> Detects standard columns: SKU/Code, Description, Wattage, CCT, Beam, CRI, IP, Finish, Qty, and Unit Price / MRP.
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* Parsed Result Preview State */
                <div className="space-y-4">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">✅</span>
                      <div>
                        <div className="font-bold text-emerald-900">
                          {parsedSpreadsheetResult.totalRows} luminaire items ready to import
                        </div>
                        <div className="text-[11px] text-emerald-700">
                          File: <span className="font-mono">{parsedSpreadsheetResult.fileName}</span> (Sheet: &ldquo;{parsedSpreadsheetResult.sheetName}&rdquo;)
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => spreadsheetFileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg font-semibold cursor-pointer"
                    >
                      Choose Different File
                    </button>
                  </div>

                  {/* Import Mode Selection */}
                  <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-neutral-700 block">How would you like to apply these items?</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        spreadsheetImportMode === 'replace'
                          ? 'border-amber-500 bg-amber-50/60 font-semibold text-neutral-900'
                          : 'border-neutral-200 bg-white text-neutral-600'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          checked={spreadsheetImportMode === 'replace'}
                          onChange={() => setSpreadsheetImportMode('replace')}
                          className="mt-0.5"
                        />
                        <div>
                          <div>Replace Active Quotation</div>
                          <div className="text-[10px] text-neutral-500 font-normal">
                            Replace current {items.length} items with {parsedSpreadsheetResult.items.length} items from sheet
                          </div>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        spreadsheetImportMode === 'append'
                          ? 'border-amber-500 bg-amber-50/60 font-semibold text-neutral-900'
                          : 'border-neutral-200 bg-white text-neutral-600'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          checked={spreadsheetImportMode === 'append'}
                          onChange={() => setSpreadsheetImportMode('append')}
                          className="mt-0.5"
                        />
                        <div>
                          <div>Append / Add to Bottom</div>
                          <div className="text-[10px] text-neutral-500 font-normal">
                            Keep existing {items.length} items and add {parsedSpreadsheetResult.items.length} more
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Preview Items Table */}
                  <div className="border border-neutral-200 rounded-xl overflow-hidden">
                    <div className="bg-neutral-100 px-3 py-2 text-[11px] font-bold text-neutral-700 flex justify-between items-center">
                      <span>Previewing Imported Luminaires (Top {Math.min(5, parsedSpreadsheetResult.items.length)} of {parsedSpreadsheetResult.items.length})</span>
                      <span className="text-neutral-500 font-normal">All columns will be imported</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 text-[10px] uppercase">
                          <tr>
                            <th className="p-2">#</th>
                            <th className="p-2">Code</th>
                            <th className="p-2">Description &amp; Specs (Line 1 &amp; 2)</th>
                            <th className="p-2 text-center">Qty</th>
                            <th className="p-2 text-right">Unit Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {parsedSpreadsheetResult.items.slice(0, 5).map((it, idx) => (
                            <tr key={it.id || idx} className="hover:bg-neutral-50">
                              <td className="p-2 text-neutral-500 font-mono">{idx + 1}</td>
                              <td className="p-2 font-mono font-bold text-neutral-800">{it.sku || '-'}</td>
                              <td className="p-2 text-neutral-800">
                                <div className="font-medium">
                                  {it.name} — <span className="text-amber-800">⚡ {it.watt} | 💡 {it.cct}</span>
                                </div>
                                <div className="text-[10px] text-neutral-500">
                                  {it.beam && `🎯 ${it.beam} • `}
                                  {it.finish && `✨ ${it.finish}`}
                                </div>
                              </td>
                              <td className="p-2 text-center font-bold text-neutral-700">{it.qty}</td>
                              <td className="p-2 text-right font-bold text-neutral-900">₹ {money(it.price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSpreadsheetModal(false);
                  setParsedSpreadsheetResult(null);
                  setSpreadsheetError(null);
                }}
                className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Cancel
              </button>

              {parsedSpreadsheetResult && (
                <button
                  type="button"
                  onClick={applySpreadsheetToQuotation}
                  className="px-5 py-2 bg-gradient-to-r from-[#7b3f22] to-[#df9c20] hover:brightness-105 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <span>✓</span>
                  <span>Import {parsedSpreadsheetResult.items.length} Items into Quotation</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SKU USAGE & PRICING HISTORY MODAL */}
      {showSkuHistoryModal && skuHistoryTarget && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-3 backdrop-blur-xs">
          <div className="bg-[#faf8f5] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-[#c8b7a6]">
            {/* Modal Header */}
            <div className="bg-[#5b2813] text-white p-4 flex items-center justify-between border-b-2 border-[#df9c20] shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🕒</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-lg font-bold">SKU Usage &amp; Pricing History</span>
                    {skuHistoryTarget.sku && (
                      <span className="font-mono text-xs font-extrabold bg-[#df9c20] text-black px-2 py-0.5 rounded shadow-sm">
                        {skuHistoryTarget.sku}
                      </span>
                    )}
                    {skuHistoryTarget.itemIndex !== undefined && (
                      <span className="text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                        Active Item #{skuHistoryTarget.itemIndex + 1}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#edd6c8] line-clamp-1">
                    {skuHistoryTarget.name || 'Historical quotations and pricing intelligence for this luminaire'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSkuHistoryModal(false);
                  setSkuHistoryTarget(null);
                }}
                className="text-white/80 hover:text-white text-xl font-bold p-1 cursor-pointer hover:bg-white/10 rounded-lg w-8 h-8 flex items-center justify-center transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Client Consistency Intelligence Banner */}
              {client ? (
                skuUsageStats.clientSpecificQuotes.length > 0 ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3">
                    <span className="text-xl shrink-0">🎯</span>
                    <div className="flex-1 text-xs text-emerald-950">
                      <div className="font-bold text-sm text-emerald-900 flex items-center gap-2 flex-wrap">
                        <span>Pricing Consistency for &ldquo;{client}&rdquo;</span>
                        <span className="bg-emerald-200 text-emerald-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {skuUsageStats.clientSpecificQuotes.length} Prior Quotation{skuUsageStats.clientSpecificQuotes.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-1 text-emerald-800 leading-relaxed">
                        This client was previously quoted this fixture at an average of{' '}
                        <strong className="text-emerald-950 font-bold">{formatInr(skuUsageStats.clientAvgPrice)}</strong>.
                        Their most recent quoted price was{' '}
                        <strong className="text-emerald-950 font-bold underline">{formatInr(skuUsageStats.clientLastPrice)}</strong>.
                        Studio-wide quotes range between {formatInr(skuUsageStats.minPrice)} and {formatInr(skuUsageStats.maxPrice)}.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
                    <span className="text-xl shrink-0">✨</span>
                    <div className="flex-1 text-xs text-amber-950">
                      <div className="font-bold text-sm text-amber-900 flex items-center gap-2 flex-wrap">
                        <span>First Time Quoting for &ldquo;{client}&rdquo;</span>
                        <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          New SKU for Client
                        </span>
                      </div>
                      <div className="mt-1 text-amber-800 leading-relaxed">
                        No previous quotation contains this SKU for {client}. The overall studio benchmark average is{' '}
                        <strong className="text-amber-950 font-bold">{formatInr(skuUsageStats.avgPrice)}</strong> across {skuUsageStats.totalQuotes} quotation(s).
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-3 bg-stone-100 border border-stone-300 rounded-xl flex items-center gap-2.5 text-xs text-stone-700">
                  <span className="text-base">💡</span>
                  <span>
                    <strong>Client Consistency Tip:</strong> Type a client name in the Quotation Builder to immediately benchmark pricing history against previous rates offered to that specific client.
                  </span>
                </div>
              )}

              {/* 4 KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-[#d9cbb9] shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Quotations</div>
                  <div className="text-xl font-extrabold text-[#17191c] mt-0.5">{skuUsageStats.totalQuotes}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{skuUsageStats.uniqueClients} unique client{skuUsageStats.uniqueClients === 1 ? '' : 's'}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#d9cbb9] shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Units Quoted</div>
                  <div className="text-xl font-extrabold text-[#7b3f22] mt-0.5">{skuUsageStats.totalQty}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">fixtures specified</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#d9cbb9] shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Historical Range</div>
                  <div className="text-sm sm:text-base font-extrabold text-[#17191c] mt-1 truncate">
                    {skuUsageStats.minPrice > 0 ? formatInr(skuUsageStats.minPrice) : '₹0'} – {skuUsageStats.maxPrice > 0 ? formatInr(skuUsageStats.maxPrice) : '₹0'}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">min to max unit rate</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#df9c20]/40 bg-gradient-to-br from-white to-amber-50/40 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-[#7b3f22] tracking-wider">Studio Average</div>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">
                    {skuUsageStats.avgPrice > 0 ? formatInr(skuUsageStats.avgPrice) : '₹0'}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">per unit across all quotes</div>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="bg-white p-3 rounded-xl border border-[#d9cbb9] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                  {/* Client Filter */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-gray-600">Client:</span>
                    <select
                      value={skuHistoryClientFilter}
                      onChange={e => setSkuHistoryClientFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-[#faf8f5] border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 outline-none focus:border-[#7b3f22]"
                    >
                      <option value="all">All Clients ({skuUsageRecords.length})</option>
                      {client && (
                        <option value="current_client">
                          Current Client: {client} ({skuUsageStats.clientSpecificQuotes.length})
                        </option>
                      )}
                      {skuHistoryUniqueClients
                        .filter(c => !client || c.toLowerCase() !== client.toLowerCase())
                        .map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[180px]">
                    <input
                      type="text"
                      value={skuHistorySearch}
                      onChange={e => setSkuHistorySearch(e.target.value)}
                      placeholder="Search quote #, client, branch, or specs..."
                      className="w-full pl-7 pr-3 py-1.5 bg-[#faf8f5] border border-gray-300 rounded-lg text-xs text-gray-800 outline-none focus:border-[#7b3f22]"
                    />
                    <span className="absolute left-2.5 top-1.5 text-xs text-gray-400">🔍</span>
                  </div>
                </div>

                {(skuHistoryClientFilter !== 'all' || skuHistorySearch.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSkuHistoryClientFilter('all');
                      setSkuHistorySearch('');
                    }}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Quotations History Table */}
              <div className="bg-white border border-[#d9cbb9] rounded-xl overflow-hidden shadow-sm">
                <div className="bg-[#f5ede4] px-4 py-2.5 border-b border-[#d9cbb9] flex items-center justify-between text-xs">
                  <span className="font-bold text-[#5b2813]">
                    Quotation Records ({displayedSkuHistoryRecords.length} of {skuUsageRecords.length})
                  </span>
                  <span className="text-gray-500 text-[11px]">Sorted by newest quotation first</span>
                </div>

                {displayedSkuHistoryRecords.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <span className="text-3xl block">📋</span>
                    <div className="font-bold text-gray-700 text-sm">No Matching Quotations Found</div>
                    <div className="text-xs text-gray-500 max-w-md mx-auto">
                      {skuUsageRecords.length === 0
                        ? `No previous quotations in ARTÈ LUME contain the SKU "${skuHistoryTarget.sku}". When you save quotations with this item, its price benchmarks and usage history will appear here.`
                        : 'No quotations match your current search and client filter criteria. Try resetting filters.'}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[420px]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#faf7f4] text-gray-600 border-b border-[#d9cbb9] text-[10px] uppercase font-bold tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5">Quote # &amp; Date</th>
                          <th className="p-2.5">Client &amp; Branch</th>
                          <th className="p-2.5">Specifications</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5 text-right">List Price</th>
                          <th className="p-2.5 text-right">Discount</th>
                          <th className="p-2.5 text-right">Quoted Price</th>
                          <th className="p-2.5 text-right">Total</th>
                          <th className="p-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {displayedSkuHistoryRecords.map((rec, i) => {
                          const isCurrentClient = client && rec.client.toLowerCase().includes(client.toLowerCase());
                          return (
                            <tr
                              key={`${rec.quoteKey}-${i}`}
                              className={`transition-colors ${
                                isCurrentClient ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-[#faf7f4]'
                              }`}
                            >
                              {/* Quote # & Date */}
                              <td className="p-2.5 align-top">
                                <div className="font-mono font-bold text-[#5b2813]">{rec.quoteNum}</div>
                                <div className="text-[11px] text-gray-500">{rec.date || 'No Date'}</div>
                                <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  rec.status === 'Accepted' || rec.status === 'Accepted & Paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : rec.status === 'Sent'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {rec.status}
                                </span>
                              </td>

                              {/* Client & Branch */}
                              <td className="p-2.5 align-top">
                                <div className="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                                  <span>{rec.client}</span>
                                  {isCurrentClient && (
                                    <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide">
                                      CURRENT
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-500 font-medium">{rec.branchName}</div>
                              </td>

                              {/* Specifications */}
                              <td className="p-2.5 align-top">
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {rec.watt && (
                                    <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-semibold border border-stone-200">
                                      ⚡ {rec.watt}
                                    </span>
                                  )}
                                  {rec.cct && (
                                    <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-semibold border border-amber-200">
                                      💡 {rec.cct}
                                    </span>
                                  )}
                                  {rec.beam && (
                                    <span className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-medium border border-blue-200">
                                      📐 {rec.beam}
                                    </span>
                                  )}
                                  {rec.finish && (
                                    <span className="text-[10px] bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-medium border border-gray-200">
                                      {rec.finish}
                                    </span>
                                  )}
                                  {rec.reflector && (
                                    <span className="text-[10px] bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded font-medium border border-purple-200">
                                      {rec.reflector}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Qty */}
                              <td className="p-2.5 text-center font-bold text-gray-800 align-top">
                                {rec.qty}
                              </td>

                              {/* List Price */}
                              <td className="p-2.5 text-right text-gray-500 font-medium align-top">
                                {formatInr(rec.listPrice)}
                              </td>

                              {/* Discount */}
                              <td className="p-2.5 text-right font-semibold text-gray-700 align-top">
                                {rec.discount > 0 ? `${rec.discount}%` : '-'}
                              </td>

                              {/* Quoted Unit Price */}
                              <td className="p-2.5 text-right align-top">
                                <span className="font-extrabold text-sm text-[#17191c]">
                                  {formatInr(rec.price)}
                                </span>
                              </td>

                              {/* Total */}
                              <td className="p-2.5 text-right font-bold text-emerald-800 align-top">
                                {formatInr(rec.total)}
                              </td>

                              {/* Actions */}
                              <td className="p-2.5 text-center align-top">
                                <div className="flex flex-col items-center gap-1.5">
                                  {skuHistoryTarget.itemIndex !== undefined && (
                                    <button
                                      type="button"
                                      onClick={() => applyHistoricalPriceToItem(rec.price, rec.discount, rec.listPrice)}
                                      className="w-full px-2 py-1 bg-gradient-to-r from-[#7b3f22] to-[#df9c20] hover:brightness-110 text-white font-bold text-[11px] rounded shadow-xs cursor-pointer flex items-center justify-center gap-1 transition-all"
                                      title={`Apply this price (${formatInr(rec.price)}) to active quotation row`}
                                    >
                                      <span>⚡</span>
                                      <span>Use Price</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => openQuoteFromHistory(rec.quoteKey)}
                                    className="text-[11px] text-[#5b2813] hover:underline font-semibold cursor-pointer"
                                    title="Open this quotation in builder"
                                  >
                                    View Quote ↗
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-neutral-100 border-t border-[#d9cbb9] flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-gray-600">
                Found <strong className="text-gray-900">{skuUsageRecords.length}</strong> quotation record{skuUsageRecords.length === 1 ? '' : 's'} for this SKU across all branches
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSkuHistoryModal(false);
                  setSkuHistoryTarget(null);
                }}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-700 cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PRODUCT LIBRARY / CATALOG BROWSER MODAL */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-3">
          <div className="bg-[#faf8f5] rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#c8b7a6]">
            {/* Header */}
            <div className="bg-[#5b2813] text-white p-4 flex items-center justify-between border-b-2 border-[#df9c20]">
              <div className="flex items-center gap-3">
                <span className="text-2xl">❖</span>
                <div>
                  <div className="font-serif text-lg font-bold">Artè Lume Fixtures Catalog</div>
                  <div className="text-xs text-[#edd6c8]">Select architectural fixtures to add to active quotation</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAddProductModal()}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-semibold"
                >
                  + Add Custom
                </button>
                <button
                  onClick={() => setShowCatalogModal(false)}
                  className="p-1 hover:bg-white/20 rounded text-lg w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Filter Bar with Technical Specifications */}
            <div className="p-3 bg-white border-b border-gray-200 flex flex-wrap gap-2 items-center text-xs">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Search by SKU, name, or optical spec..."
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-[#7b3f22] text-xs"
                />
                <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
              </div>

              {/* Category */}
              <select
                value={catalogCategoryFilter}
                onChange={e => setCatalogCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none focus:border-[#7b3f22]"
                title="Filter by Category"
              >
                <option value="all">All Categories</option>
                {catalogAvailableCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Beam Angle Filter */}
              <select
                value={catalogBeamFilter}
                onChange={e => setCatalogBeamFilter(e.target.value)}
                className={`border rounded-lg px-2.5 py-1.5 outline-none font-medium ${
                  catalogBeamFilter !== 'all'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
                title="Filter by Beam Angle"
              >
                <option value="all">All Beams</option>
                <optgroup label="Presets">
                  <option value="narrow">Narrow (≤ 20°)</option>
                  <option value="medium">Medium (24° – 36°)</option>
                  <option value="wide">Wide (≥ 40°)</option>
                  <option value="diffused">Diffused / Linear</option>
                </optgroup>
                {catalogAvailableBeams.length > 0 && (
                  <optgroup label="Specific Angles">
                    {catalogAvailableBeams.map(beam => (
                      <option key={beam} value={beam}>
                        {beam}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {/* CRI Filter */}
              <select
                value={catalogCriFilter}
                onChange={e => setCatalogCriFilter(e.target.value)}
                className={`border rounded-lg px-2.5 py-1.5 outline-none font-medium ${
                  catalogCriFilter !== 'all'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
                title="Filter by Color Rendering Index (CRI)"
              >
                <option value="all">All CRI</option>
                <option value="90">CRI 90+</option>
                <option value="95">CRI 95+</option>
                <option value="97">CRI 97+</option>
                {catalogAvailableCris.filter(c => !['CRI 90+', 'CRI 95+', 'CRI 97+'].includes(c)).map(cri => (
                  <option key={cri} value={cri}>
                    {cri}
                  </option>
                ))}
              </select>

              {/* IP Rating Filter */}
              <select
                value={catalogIpFilter}
                onChange={e => setCatalogIpFilter(e.target.value)}
                className={`border rounded-lg px-2.5 py-1.5 outline-none font-medium ${
                  catalogIpFilter !== 'all'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
                title="Filter by Ingress Protection (IP Rating)"
              >
                <option value="all">All IP Ratings</option>
                <option value="IP20">IP20 (Indoor)</option>
                <option value="IP44">IP44 (Damp/Bath)</option>
                <option value="IP54">IP54 (Splash-proof)</option>
                <option value="IP65">IP65 (Outdoor/Jet)</option>
                <option value="IP68">IP68 (Submersible)</option>
                {catalogAvailableIps.filter(ip => !['IP20', 'IP44', 'IP54', 'IP65', 'IP68'].includes(ip)).map(ip => (
                  <option key={ip} value={ip}>
                    {ip}
                  </option>
                ))}
              </select>

              {/* Body Finish Filter */}
              <select
                value={catalogFinishFilter}
                onChange={e => setCatalogFinishFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none"
                title="Filter by Body Finish"
              >
                <option value="all">All Finishes</option>
                <option value="Brass">Brass / Gold</option>
                <option value="Black">Matte Black</option>
                <option value="White">Sandy White</option>
                <option value="Bronze">Antique Bronze</option>
              </select>

              {/* Active count & Reset */}
              <div className="flex items-center gap-2 ml-auto text-xs">
                <span className="text-gray-500 font-medium">
                  Showing <strong className="text-[#7b3f22] font-bold">{filteredCatalogProducts.length}</strong> of {products.length}
                </span>
                {hasActiveCatalogFilters && (
                  <button
                    onClick={resetCatalogFilters}
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    title="Clear all filters"
                  >
                    ✕ Reset
                  </button>
                )}
              </div>
            </div>

            {/* Catalog Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredCatalogProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-xl mb-3 border border-amber-200">
                    🔍
                  </div>
                  <h3 className="font-serif font-bold text-base text-gray-800 mb-1">No Matching Fixtures Found</h3>
                  <p className="text-xs text-gray-500 max-w-sm mb-4">
                    No products in the catalog meet the active combination of technical filters (Beam, CRI, IP rating, or Category).
                  </p>
                  <button
                    onClick={resetCatalogFilters}
                    className="px-4 py-2 bg-[#7b3f22] hover:bg-[#8e4928] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredCatalogProducts.map(f => {
                    const isSel = selectedCatalogIds.has(f.id);
                    return (
                      <div
                        key={f.id}
                        onClick={() => {
                          const updated = new Set(selectedCatalogIds);
                          if (isSel) updated.delete(f.id);
                          else updated.add(f.id);
                          setSelectedCatalogIds(updated);
                        }}
                        className={`p-3 rounded-xl border bg-white cursor-pointer transition-all flex flex-col justify-between hover:shadow-md ${
                          isSel ? 'border-[#df9c20] ring-2 ring-[#df9c20]/20 bg-[#fdfaf6]' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="font-mono text-xs font-bold text-[#7b3f22]">{f.sku}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-1.5 py-0.5 rounded">
                              {f.category}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-[#17191c] leading-tight mb-1">{f.name}</h4>
                          <div className="text-[11px] text-gray-600 font-medium space-x-1 mb-2">
                            <span>{f.watt}</span>
                            <span>•</span>
                            <span>{f.cct}</span>
                          </div>

                          {/* Technical Spec Badges */}
                          <div className="flex flex-wrap gap-1">
                            {f.beam && (
                              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                                📐 {f.beam}
                              </span>
                            )}
                            {f.cri && (
                              <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                                ✨ {f.cri}
                              </span>
                            )}
                            {f.ip && (
                              <span className="text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded">
                                🛡️ {f.ip}
                              </span>
                            )}
                            {f.reflector && (
                              <span className="text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded">
                                🔆 {f.reflector}
                              </span>
                            )}
                            {f.finish && (
                              <span className="text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200 px-1.5 py-0.5 rounded">
                                {f.finish}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-[#17191c]">{formatInr(f.price)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSkuHistory(f.sku, f.name);
                              }}
                              className="text-[11px] text-[#7b3f22] hover:text-[#df9c20] hover:underline flex items-center gap-0.5 font-semibold cursor-pointer"
                              title="View SKU Pricing & Usage History"
                            >
                              <span>🕒</span>
                              <span>History</span>
                            </button>
                          </div>
                          <span
                            className={`text-xs px-2.5 py-1 rounded font-bold ${
                              isSel ? 'bg-[#df9c20] text-white' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {isSel ? '✓ Selected' : '+ Select'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-600 font-medium">
                {selectedCatalogIds.size} fixture{selectedCatalogIds.size === 1 ? '' : 's'} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCatalogModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={importCatalogSelection}
                  disabled={selectedCatalogIds.size === 0}
                  className="px-4 py-2 bg-[#7b3f22] hover:bg-[#8e4928] disabled:opacity-50 text-white rounded text-xs font-bold cursor-pointer"
                >
                  📥 Import to Quotation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2B. SMART PDF & PRICE LIST CATALOG IMPORTER MODAL */}
      {showPdfCatalogModal && (
        <PdfCatalogImportModal
          isOpen={showPdfCatalogModal}
          onClose={() => setShowPdfCatalogModal(false)}
          branch={activeBranch}
          onImportToCatalog={handleImportFromPdfToCatalog}
          onImportToQuote={handleImportFromPdfToQuote}
          formatInr={formatInr}
        />
      )}

      {/* 3. ADD / EDIT PRODUCT MODAL (WITH FULL SPECS) */}
      {showProductModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-3"
          onPaste={handleProductModalImagePaste}
        >
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div
              className="p-4 text-white flex justify-between items-center transition-colors"
              style={{ backgroundColor: activeBranch.theme.primaryColor }}
            >
              <h3 className="font-bold text-sm">
                {editingProductId ? `Edit Product Spec: ${prodForm.sku}` : 'Add Architectural Lighting Spec'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-gray-300 hover:text-white">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-gray-700 block">
                      SKU / Factory Code <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded border border-red-200">
                      Mandatory
                    </span>
                  </div>
                  <input
                    type="text"
                    value={prodForm.sku || ''}
                    onChange={e => setProdForm({ ...prodForm, sku: e.target.value })}
                    className="w-full border p-2 rounded font-mono font-bold bg-amber-50/20 focus:bg-white focus:border-[#7b3f22] outline-none"
                    placeholder="e.g. lfss1121r"
                    required
                  />
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Enter your factory / supplier model code
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-gray-700 block">Category</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCategory(!isCustomCategory)}
                      className="text-[11px] font-semibold hover:underline cursor-pointer transition-colors"
                      style={{ color: activeBranch.theme.primaryColor }}
                    >
                      {isCustomCategory ? '▾ Choose Saved' : '+ New Category'}
                    </button>
                  </div>
                  {isCustomCategory ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={prodForm.category || ''}
                        onChange={e => handleCategoryChange(e.target.value)}
                        className="w-full border border-[#d9cbb9] p-2 rounded font-medium focus:border-[#7b3f22] outline-none text-xs"
                        placeholder="Type new category..."
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomCategory(false)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border rounded text-[11px] font-bold text-gray-700 shrink-0 cursor-pointer"
                        title="Back to dropdown"
                      >
                        Saved ▾
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={prodForm.category || ''}
                        onChange={e => {
                          if (e.target.value === '__NEW__') {
                            setIsCustomCategory(true);
                            handleCategoryChange('');
                          } else {
                            handleCategoryChange(e.target.value);
                          }
                        }}
                        className="w-full border border-gray-300 p-2 rounded font-semibold bg-white text-[#17191c] focus:border-[#7b3f22] focus:ring-1 focus:ring-[#7b3f22] outline-none cursor-pointer appearance-none pr-8 text-xs"
                      >
                        <option value="">-- Select Saved Category --</option>
                        {savedCategories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        <option value="__NEW__" className="font-bold" style={{ color: activeBranch.theme.primaryColor }}>
                          + Type New Category...
                        </option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-gray-500 text-xs">
                        ▼
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Category code: <strong className="font-mono text-gray-700">{getCategorySlug(prodForm.category || '')}</strong>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <label className="font-bold text-gray-700 block">
                    Product Name &amp; Description <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-500">Studio Identifier:</span>
                    <button
                      type="button"
                      onClick={() => insertStudioCodeIntoDescription(suggestedStudioCode)}
                      className="px-2 py-0.5 rounded text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 shadow-2xs hover:brightness-95 active:scale-95"
                      style={{
                        backgroundColor: `${activeBranch.theme.primaryColor}18`,
                        color: activeBranch.theme.primaryColor,
                        border: `1px solid ${activeBranch.theme.primaryColor}40`
                      }}
                      title="Click to insert or update this code in the description"
                    >
                      <span>⚡ {suggestedStudioCode}</span>
                      <span className="text-[10px] opacity-80">(+ Insert)</span>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={prodForm.name || ''}
                  onChange={e => setProdForm({ ...prodForm, name: e.target.value })}
                  className="w-full border p-2 rounded font-medium"
                  placeholder={`e.g. ${suggestedStudioCode} - Architectural Recessed Trimless Downlight`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">WATT</label>
                  <input
                    type="text"
                    value={prodForm.watt || ''}
                    onChange={e => setProdForm({ ...prodForm, watt: e.target.value })}
                    className="w-full border p-2 rounded"
                    placeholder="12W"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">CCT</label>
                  <input
                    type="text"
                    value={prodForm.cct || ''}
                    onChange={e => setProdForm({ ...prodForm, cct: e.target.value })}
                    className="w-full border p-2 rounded"
                    placeholder="3000K"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Beam Angle</label>
                  <input
                    type="text"
                    value={prodForm.beam || ''}
                    onChange={e => setProdForm({ ...prodForm, beam: e.target.value })}
                    className="w-full border p-2 rounded"
                    placeholder="24° / 36°"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">CRI</label>
                  <input
                    type="text"
                    value={prodForm.cri || ''}
                    onChange={e => setProdForm({ ...prodForm, cri: e.target.value })}
                    className="w-full border p-2 rounded"
                    placeholder="CRI 95+"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">IP Rating</label>
                  <input
                    type="text"
                    value={prodForm.ip || ''}
                    onChange={e => setProdForm({ ...prodForm, ip: e.target.value })}
                    className="w-full border p-2 rounded"
                    placeholder="IP20 / IP44"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Body Finish</label>
                  <input
                    type="text"
                    value={prodForm.finish || ''}
                    onChange={e => setProdForm({ ...prodForm, finish: e.target.value })}
                    className="w-full border p-2 rounded"
                    placeholder="Sandy White / Brass"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-gray-700 block">Reflector</label>
                    <span className="text-[10px] text-gray-400">Finish / Cup</span>
                  </div>
                  <input
                    type="text"
                    value={prodForm.reflector || ''}
                    onChange={e => setProdForm({ ...prodForm, reflector: e.target.value })}
                    className="w-full border p-2 rounded font-medium"
                    placeholder="e.g. Specular / Rose Gold / Black"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['Specular', 'Black', 'Rose Gold', 'White', 'Dark Light'].map(rf => (
                      <button
                        key={rf}
                        type="button"
                        onClick={() => setProdForm({ ...prodForm, reflector: rf })}
                        className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                          prodForm.reflector === rf
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {rf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product Image: Upload & Ctrl+V Paste */}
              <div className="border border-[#e7ded4] rounded-xl p-3 bg-[#fdfaf6]/70">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-gray-700 flex items-center gap-1.5 text-xs">
                    <span>🖼️</span>
                    <span>Product Image / Luminaire Photo</span>
                  </label>
                  <span className="text-[10px] text-[#7b3f22] bg-[#f4ebe1] border border-[#df9c20]/30 px-2 py-0.5 rounded font-mono font-bold">
                    Upload or Ctrl + V to Paste
                  </span>
                </div>

                {prodForm.img ? (
                  <div className="flex items-center gap-3.5 p-2.5 bg-white border border-[#d9cbb9] rounded-lg">
                    <div className="relative group shrink-0">
                      <img
                        src={prodForm.img}
                        alt="Product Spec Preview"
                        className="w-16 h-16 object-contain rounded border border-gray-200 bg-white p-1 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setProdForm({ ...prodForm, img: '' })}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 text-[11px] flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <span>✓</span>
                        <span>Image Attached</span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Will automatically appear on quotations, catalog cards, and exported Excel sheets.
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <label className="px-2.5 py-1 bg-white border border-[#d9cbb9] hover:border-[#7b3f22] text-[#7b3f22] rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1">
                          <span>🔄</span>
                          <span>Change Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleProductModalImageFile}
                          />
                        </label>
                        <span className="text-[10px] text-gray-400">or press Ctrl+V to paste new</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    tabIndex={0}
                    onPaste={handleProductModalImagePaste}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleProductModalImageDrop}
                    className="border-2 border-dashed border-[#d9cbb9] hover:border-[#7b3f22] focus:border-[#7b3f22] focus:ring-2 focus:ring-[#7b3f22]/20 rounded-xl p-3.5 text-center bg-white hover:bg-[#faf6f0] transition-all cursor-pointer relative group"
                  >
                    <input
                      type="file"
                      id="product-spec-image-input"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProductModalImageFile}
                    />
                    <label htmlFor="product-spec-image-input" className="cursor-pointer block">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="w-9 h-9 rounded-full bg-[#fcf8f3] border border-[#df9c20]/30 flex items-center justify-center text-lg shadow-2xs group-hover:scale-105 transition-transform">
                          📷
                        </div>
                        <div className="text-xs font-bold text-[#7b3f22]">
                          Click to Upload Image or Drag &amp; Drop
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center justify-center gap-1.5 flex-wrap">
                          <span>Or press</span>
                          <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono font-bold text-gray-800 shadow-2xs">
                            Ctrl + V
                          </kbd>
                          <span>to paste directly from clipboard</span>
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    value={prodForm.price || ''}
                    onChange={e => setProdForm({ ...prodForm, price: Number(e.target.value) || 0 })}
                    className="w-full border p-2 rounded font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Cost / Purchase (₹)</label>
                  <input
                    type="number"
                    value={prodForm.cost || ''}
                    onChange={e => setProdForm({ ...prodForm, cost: Number(e.target.value) || 0 })}
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={prodForm.stock || ''}
                    onChange={e => setProdForm({ ...prodForm, stock: Number(e.target.value) || 0 })}
                    className="w-full border p-2 rounded"
                  />
                </div>
              </div>
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveProduct}
                className="px-4 py-2 bg-[#df9c20] hover:brightness-105 text-[#170e08] rounded text-xs font-bold cursor-pointer"
              >
                Save Product Spec
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. BULK IMPORT MODAL */}
      {showBulkImportModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-2"
          onPaste={e => handleBulkRowImagePaste(e, activeBulkRowIdx)}
        >
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>📥</span>
                  <span>Bulk Import Architectural Lighting Fixtures</span>
                </h3>
                <div className="text-xs text-white/80">
                  Quickly input or paste multiple products with complete optical &amp; electrical specifications and photos
                </div>
              </div>
              <button onClick={() => setShowBulkImportModal(false)} className="text-white text-xl cursor-pointer">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3.5">
              {/* 1. TOP DEDICATED IMAGE CARD (Exact match to image_126c79b0 with Family Multi-Apply) */}
              {bulkRows.length > 0 && (() => {
                const activeRow = bulkRows[activeBulkRowIdx] || null;
                const activeSku = activeRow?.sku?.trim() || '';
                const activeFamily = activeSku ? getBaseModelFamily(activeSku) : '';
                const sameSkuCount = activeSku ? bulkRows.filter(r => r.sku?.trim().toLowerCase() === activeSku.toLowerCase()).length : 0;
                const sameFamilyCount = activeFamily ? bulkRows.filter(r => {
                  const rowSku = (r.sku || '').trim().toLowerCase();
                  const rowBase = getBaseModelFamily(r.sku, r.name).toLowerCase();
                  return rowSku.startsWith(activeFamily.toLowerCase()) || rowBase === activeFamily.toLowerCase();
                }).length : 0;

                return (
                  <div className="border border-[#e7ded4] rounded-xl p-3 bg-[#fdfaf6]/90 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🖼️</span>
                        <label className="font-bold text-gray-800 text-xs">
                          Product Image / Luminaire Photo
                        </label>
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                          Target: Row #{activeBulkRowIdx + 1}
                          {activeSku ? ` (${activeSku})` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 text-[11px] text-gray-600 font-medium">
                          <span>Select Target Row:</span>
                          <select
                            value={activeBulkRowIdx}
                            onChange={e => setActiveBulkRowIdx(Number(e.target.value))}
                            className="border border-gray-300 bg-white rounded px-2 py-0.5 text-xs font-bold text-[#17191c] outline-none cursor-pointer"
                          >
                            {bulkRows.map((r, i) => (
                              <option key={r.id || i} value={i}>
                                Row #{i + 1} {r.sku ? `(${r.sku})` : ''} {r.img ? '✓ Photo Attached' : '(No Photo)'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-[10px] text-[#7b3f22] bg-[#f4ebe1] border border-[#df9c20]/30 px-2 py-0.5 rounded font-mono font-bold">
                          Upload or Ctrl + V to Paste
                        </span>
                      </div>
                    </div>

                    {activeRow?.img ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-2.5 bg-white border border-[#d9cbb9] rounded-lg">
                        <div className="relative group shrink-0">
                          <img
                            src={activeRow.img}
                            alt="Product Spec Preview"
                            className="w-16 h-16 object-contain rounded border border-gray-200 bg-white p-1 shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...bulkRows];
                              if (updated[activeBulkRowIdx]) {
                                updated[activeBulkRowIdx] = { ...updated[activeBulkRowIdx], img: '' };
                                setBulkRows(updated);
                              }
                            }}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 text-[11px] flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                            title="Remove image"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex-1 space-y-1.5 w-full">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                              <span>✓</span>
                              <span>Image Attached to Row #{activeBulkRowIdx + 1}</span>
                            </div>
                            <span className="text-[10px] text-gray-400">or press Ctrl+V to paste new photo</span>
                          </div>

                          {/* Quick Multi-Apply & Copy Action Buttons */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <label className="px-2.5 py-1 bg-white border border-[#d9cbb9] hover:border-[#7b3f22] text-[#7b3f22] rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 shadow-2xs">
                              <span>🔄</span>
                              <span>Change Photo</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => handleBulkRowImageFile(e, activeBulkRowIdx)}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => copyBulkImage(activeRow.img!)}
                              className="px-2.5 py-1 bg-white border border-gray-300 hover:border-gray-500 text-gray-800 rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 shadow-2xs"
                              title="Copy this image to paste to other rows"
                            >
                              <span>📋</span>
                              <span>Copy Photo</span>
                            </button>

                            {/* 1-Click Apply to Same SKU */}
                            {sameSkuCount > 1 && (
                              <button
                                type="button"
                                onClick={() => applyImageToSku(activeRow.img!, activeSku)}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 shadow-2xs"
                                title={`Apply this photo to all ${sameSkuCount} rows with SKU ${activeSku}`}
                              >
                                <span>🔗</span>
                                <span>Apply to All {sameSkuCount} with SKU "{activeSku}"</span>
                              </button>
                            )}

                            {/* 1-Click Apply to Family */}
                            {sameFamilyCount > sameSkuCount && (
                              <button
                                type="button"
                                onClick={() => applyImageToFamily(activeRow.img!, activeFamily)}
                                className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 shadow-2xs"
                                title={`Apply to all ${sameFamilyCount} variants of family ${activeFamily}`}
                              >
                                <span>🌐</span>
                                <span>Apply to All {sameFamilyCount} in Family "{activeFamily}"</span>
                              </button>
                            )}

                            {/* Apply to Selected Rows */}
                            {selectedBulkRowIds.size > 0 && (
                              <button
                                type="button"
                                onClick={() => applyImageToSelected(activeRow.img!)}
                                className="px-2.5 py-1 bg-[#df9c20] hover:bg-[#c98918] text-[#170e08] rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 shadow-2xs"
                                title={`Apply photo to all ${selectedBulkRowIds.size} checked rows`}
                              >
                                <span>☑️</span>
                                <span>Apply to Selected ({selectedBulkRowIds.size})</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div
                          tabIndex={0}
                          onPaste={e => handleBulkRowImagePaste(e, activeBulkRowIdx)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => handleBulkRowImageDrop(e, activeBulkRowIdx)}
                          className="border-2 border-dashed border-[#d9cbb9] hover:border-[#7b3f22] focus:border-[#7b3f22] focus:ring-2 focus:ring-[#7b3f22]/20 rounded-xl p-3.5 text-center bg-white hover:bg-[#faf6f0] transition-all cursor-pointer relative group"
                        >
                          <input
                            type="file"
                            id="bulk-active-row-image-input"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleBulkRowImageFile(e, activeBulkRowIdx)}
                          />
                          <label htmlFor="bulk-active-row-image-input" className="cursor-pointer block">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <div className="w-9 h-9 rounded-full bg-[#fcf8f3] border border-[#df9c20]/30 flex items-center justify-center text-lg shadow-2xs group-hover:scale-105 transition-transform">
                                📷
                              </div>
                              <div className="text-xs font-bold text-[#7b3f22]">
                                Click to Upload Image or Drag &amp; Drop (for Row #{activeBulkRowIdx + 1})
                              </div>
                              <div className="text-[11px] text-gray-500 flex items-center justify-center gap-1.5 flex-wrap">
                                <span>Or press</span>
                                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono font-bold text-gray-800 shadow-2xs">
                                  Ctrl + V
                                </kbd>
                                <span>to paste directly from clipboard</span>
                              </div>
                            </div>
                          </label>
                        </div>

                        {/* Paste from in-memory copied image button if available */}
                        {copiedBulkImage && (
                          <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <img
                                src={copiedBulkImage}
                                alt="Copied"
                                className="w-8 h-8 object-contain rounded bg-white border border-gray-200"
                              />
                              <span className="font-semibold text-amber-900">
                                You have a photo copied in memory
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => pasteCopiedImageToRow(activeBulkRowIdx)}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[11px] cursor-pointer"
                              >
                                📥 Paste to Row #{activeBulkRowIdx + 1}
                              </button>
                              {selectedBulkRowIds.size > 0 && (
                                <button
                                  type="button"
                                  onClick={pasteCopiedImageToSelected}
                                  className="px-2.5 py-1 bg-[#df9c20] hover:bg-[#c98918] text-[#170e08] rounded font-bold text-[11px] cursor-pointer"
                                >
                                  📥 Paste to Selected ({selectedBulkRowIds.size})
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setCopiedBulkImage(null)}
                                className="text-gray-400 hover:text-gray-600 px-1 font-bold text-xs"
                                title="Clear clipboard"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 2. MODEL FAMILY SEGREGATION & MULTI-SELECT TOOLBAR */}
              <div className="bg-[#f2f8f5] border border-emerald-200/80 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                {/* Left: Checkbox Tools */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1 font-bold text-emerald-900">
                    <input
                      type="checkbox"
                      id="select-all-bulk-chk"
                      checked={selectedBulkRowIds.size === bulkRows.length && bulkRows.length > 0}
                      onChange={toggleSelectAllBulkRows}
                      className="rounded accent-emerald-700 cursor-pointer w-4 h-4"
                    />
                    <label htmlFor="select-all-bulk-chk" className="cursor-pointer select-none">
                      {selectedBulkRowIds.size === bulkRows.length && bulkRows.length > 0
                        ? 'Deselect All'
                        : `Select All (${bulkRows.length})`}
                    </label>
                  </div>

                  {selectedBulkRowIds.size > 0 && (
                    <span className="text-[11px] bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-full">
                      {selectedBulkRowIds.size} Selected
                    </span>
                  )}

                  {/* Actions for Selected */}
                  {selectedBulkRowIds.size > 0 && (
                    <div className="flex items-center gap-1.5 ml-1">
                      {copiedBulkImage && (
                        <button
                          type="button"
                          onClick={pasteCopiedImageToSelected}
                          className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 shadow-2xs"
                        >
                          <span>📥</span>
                          <span>Paste Photo to Selected ({selectedBulkRowIds.size})</span>
                        </button>
                      )}
                      {bulkRows[activeBulkRowIdx]?.img && (
                        <button
                          type="button"
                          onClick={() => applyImageToSelected(bulkRows[activeBulkRowIdx].img!)}
                          className="px-2 py-0.5 bg-[#df9c20] hover:bg-[#c98918] text-[#170e08] rounded text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 shadow-2xs"
                        >
                          <span>🔗</span>
                          <span>Apply Active Photo to Selected</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedBulkRowIds(new Set())}
                        className="text-[11px] text-gray-500 hover:text-gray-800 underline ml-1 cursor-pointer"
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Model Family Filter & Segregation Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-gray-600 font-bold flex items-center gap-1">
                    <span>📦</span>
                    <span>Filter Model Family:</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setBulkFamilyFilter('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      bulkFamilyFilter === 'all'
                        ? 'bg-emerald-800 text-white shadow-2xs'
                        : 'bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}
                  >
                    All ({bulkRows.length})
                  </button>

                  {/* Unique model families list */}
                  {Array.from(
                    new Set(
                      bulkRows
                        .map(r => (r.sku ? getBaseModelFamily(r.sku) : '') || r.name?.trim() || '')
                        .filter(Boolean)
                    )
                  ).map(fam => {
                    const count = bulkRows.filter(r => {
                      const rowFam = (r.sku ? getBaseModelFamily(r.sku) : '') || r.name?.trim() || '';
                      return rowFam.toLowerCase() === fam.toLowerCase();
                    }).length;

                    return (
                      <button
                        key={fam}
                        type="button"
                        onClick={() => setBulkFamilyFilter(bulkFamilyFilter === fam ? 'all' : fam)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          bulkFamilyFilter === fam
                            ? 'bg-emerald-800 text-white shadow-2xs'
                            : 'bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                        title={`Show only variants of ${fam}`}
                      >
                        {fam} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. TABLE WITH CHECKBOX, MODEL FAMILY SEGREGATION BANNERS & INLINE ACTIONS */}
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-emerald-700 text-white text-left font-bold">
                    <th className="p-2 border border-emerald-600 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedBulkRowIds.size === bulkRows.length && bulkRows.length > 0}
                        onChange={toggleSelectAllBulkRows}
                        className="rounded accent-emerald-500 cursor-pointer"
                        title="Select/Deselect all rows"
                      />
                    </th>
                    <th className="p-2 border border-emerald-600 w-8 text-center">#</th>
                    <th className="p-2 border border-emerald-600 min-w-[120px]">SKU *</th>
                    <th className="p-2 border border-emerald-600 min-w-[190px]">Product Name &amp; Description *</th>
                    <th className="p-2 border border-emerald-600 w-16">Watt</th>
                    <th className="p-2 border border-emerald-600 w-20">CCT</th>
                    <th className="p-2 border border-emerald-600 w-20">Beam</th>
                    <th className="p-2 border border-emerald-600 w-16">CRI</th>
                    <th className="p-2 border border-emerald-600 w-16">IP</th>
                    <th className="p-2 border border-emerald-600 w-20">Finish</th>
                    <th className="p-2 border border-emerald-600 w-20">Reflector</th>
                    <th className="p-2 border border-emerald-600 w-32 text-center">Image (Upload/Paste)</th>
                    <th className="p-2 border border-emerald-600 w-24">Price (₹) *</th>
                    <th className="p-2 border border-emerald-600 w-10 text-center">✕</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows
                    .map((row, originalIdx) => ({ row, originalIdx }))
                    .filter(({ row }) => {
                      if (bulkFamilyFilter === 'all') return true;
                      const fam = (row.sku ? getBaseModelFamily(row.sku) : '') || row.name?.trim() || '';
                      return fam.toLowerCase() === bulkFamilyFilter.toLowerCase();
                    })
                    .map(({ row, originalIdx }, displayIdx, arr) => {
                      const idx = originalIdx;
                      const prevRow = displayIdx > 0 ? arr[displayIdx - 1].row : null;
                      const rowFamily = (row.sku ? getBaseModelFamily(row.sku) : '') || row.name?.trim() || '';
                      const prevFamily = prevRow ? (prevRow.sku ? getBaseModelFamily(prevRow.sku) : '') || prevRow.name?.trim() || '' : null;
                      const isNewFamily = displayIdx === 0 || rowFamily !== prevFamily;

                      const familyCount = bulkRows.filter(r => {
                        const f = (r.sku ? getBaseModelFamily(r.sku) : '') || r.name?.trim() || '';
                        return f.toLowerCase() === rowFamily.toLowerCase();
                      }).length;

                      return (
                        <React.Fragment key={row.id}>
                          {/* Model Family Divider Header to Segregate Models */}
                          {isNewFamily && rowFamily && (
                            <tr className="bg-[#e8f5ee] text-emerald-950 border-y-2 border-emerald-400 font-semibold text-xs">
                              <td colSpan={14} className="py-1.5 px-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">📦</span>
                                    <span className="font-bold text-emerald-900">Model Family:</span>
                                    <span className="font-mono font-bold bg-white text-[#7b3f22] px-2 py-0.5 rounded border border-emerald-300">
                                      {rowFamily}
                                    </span>
                                    <span className="text-gray-500 font-normal text-[11px]">
                                      ({familyCount} type{familyCount === 1 ? '' : 's'}/variant{familyCount === 1 ? '' : 's'})
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => selectRowsByFamily(rowFamily)}
                                      className="px-2 py-0.5 bg-white hover:bg-emerald-50 border border-emerald-300 rounded text-[11px] font-bold text-emerald-800 cursor-pointer shadow-2xs"
                                    >
                                      ✓ Select Family ({familyCount})
                                    </button>

                                    {row.img && (
                                      <button
                                        type="button"
                                        onClick={() => applyImageToFamily(row.img!, rowFamily)}
                                        className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold cursor-pointer shadow-2xs"
                                        title="Apply this row's photo to all rows in this model family"
                                      >
                                        🔗 Apply Photo to this Family
                                      </button>
                                    )}

                                    {!row.img && copiedBulkImage && (
                                      <button
                                        type="button"
                                        onClick={() => applyImageToFamily(copiedBulkImage, rowFamily)}
                                        className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold cursor-pointer shadow-2xs"
                                        title="Paste copied photo to all variants of this model"
                                      >
                                        📥 Paste Copied Photo to Family
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Data Row */}
                          <tr
                            className={`${displayIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                              activeBulkRowIdx === idx ? 'bg-emerald-50/50 ring-1 ring-emerald-500/50' : ''
                            } ${selectedBulkRowIds.has(row.id) ? 'bg-amber-50/60' : ''}`}
                            onClick={() => setActiveBulkRowIdx(idx)}
                          >
                            {/* Row Checkbox */}
                            <td className="p-1 border border-gray-200 text-center">
                              <input
                                type="checkbox"
                                checked={selectedBulkRowIds.has(row.id)}
                                onChange={() => toggleSelectBulkRow(row.id)}
                                onClick={e => e.stopPropagation()}
                                className="rounded accent-emerald-700 cursor-pointer w-3.5 h-3.5"
                              />
                            </td>

                            <td className="p-1 border border-gray-200 text-center text-gray-400 font-semibold">
                              {idx + 1}
                            </td>

                            <td className="p-1 border border-gray-200">
                              <input
                                type="text"
                                value={row.sku || ''}
                                onFocus={() => setActiveBulkRowIdx(idx)}
                                onChange={e => {
                                  const updated = [...bulkRows];
                                  updated[idx].sku = e.target.value;
                                  setBulkRows(updated);
                                }}
                                placeholder="e.g. LFSL1211R"
                                className="w-full p-1 bg-transparent font-mono font-bold outline-none"
                              />
                            </td>

                            <td className="p-1 border border-gray-200">
                              <input
                                type="text"
                                value={row.name || ''}
                                onFocus={() => setActiveBulkRowIdx(idx)}
                                onChange={e => {
                                  const updated = [...bulkRows];
                                  updated[idx].name = e.target.value;
                                  setBulkRows(updated);
                                }}
                                placeholder="Luminaire Name"
                                className="w-full p-1 bg-transparent outline-none"
                              />
                            </td>

                            <td className="p-1 border border-gray-200">
                              <input
                                type="text"
                                value={row.watt || ''}
                                onFocus={() => setActiveBulkRowIdx(idx)}
                                onChange={e => {
                                  const updated = [...bulkRows];
                                  updated[idx].watt = e.target.value;
                                  setBulkRows(updated);
                                }}
                                placeholder="12W"
                                className="w-full p-1 bg-transparent text-center outline-none"
                              />
                            </td>

                            <td className="p-1 border border-gray-200">
                              <input
                                type="text"
                                value={row.cct || ''}
                                onFocus={() => setActiveBulkRowIdx(idx)}
                                onChange={e => {
                                  const updated = [...bulkRows];
                                  updated[idx].cct = e.target.value;
                                  setBulkRows(updated);
                                }}
                                placeholder="3000K"
                                className="w-full p-1 bg-transparent text-center outline-none"
                              />
                            </td>

                            <td className="p-1 border border-gray-200">
                              <input
                                type="text"
                                value={row.beam || ''}
                                onFocus={() => setActiveBulkRowIdx(idx)}
                                onChange={e => {
                                  const updated = [...bulkRows];
                                  updated[idx].beam = e.target.value;
                                  setBulkRows(updated);
                                }}
                                placeholder="36°"
                                className="w-full p-1 bg-transparent text-center outline-none"
                              />
                            </td>

                            <td className="p-1 border border-gray-200">
                              <input
                                type="text"
                                value={row.cri || ''}
                                onFocus={() => setActiveBulkRowIdx(idx)}
                                onChange={e => {
                                  const updated = [...bulkRows];
                                  updated[idx].cri = e.target.value;
                                  setBulkRows(updated);
                                }}
                                placeholder="CRI 90+"
                                className="w-full p-1 bg-transparent text-center outline-none"
                              />
                            </td>

                            <td className="p-1 border border-gray-200">
                              <input
                                type="text"
                                value={row.ip || ''}
                                onFocus={() => setActiveBulkRowIdx(idx)}
                                onChange={e => {
                                  const updated = [...bulkRows];
                                  updated[idx].ip = e.target.value;
                                  setBulkRows(updated);
                                }}
                                placeholder="IP20"
                                className="w-full p-1 bg-transparent text-center outline-none"
                              />
                            </td>

                            <td className="p-1 border border-gray-200">
                              <input
                                type="text"
                                value={row.finish || ''}
                                onFocus={() => setActiveBulkRowIdx(idx)}
                                onChange={e => {
                                  const updated = [...bulkRows];
                                  updated[idx].finish = e.target.value;
                                  setBulkRows(updated);
                                }}
                                placeholder="White/Brass"
                                className="w-full p-1 bg-transparent outline-none"
                              />
                            </td>

                            <td className="p-1 border border-gray-200">
                              <input
                                type="text"
                                value={row.reflector || ''}
                                onFocus={() => setActiveBulkRowIdx(idx)}
                                onChange={e => {
                                  const updated = [...bulkRows];
                                  updated[idx].reflector = e.target.value;
                                  setBulkRows(updated);
                                }}
                                placeholder="Specular"
                                className="w-full p-1 bg-transparent outline-none"
                              />
                            </td>

                            {/* Image column with thumbnail preview, 1-click copy/paste & same SKU duplicate */}
                            <td
                              className={`p-1 border border-gray-200 text-center relative align-middle ${
                                activeBulkRowIdx === idx ? 'bg-emerald-50/50' : ''
                              }`}
                              onPaste={e => handleBulkRowImagePaste(e, idx)}
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => handleBulkRowImageDrop(e, idx)}
                              onClick={e => {
                                e.stopPropagation();
                                setActiveBulkRowIdx(idx);
                              }}
                            >
                              {row.img ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="relative group inline-block">
                                    <img
                                      src={row.img}
                                      alt="Product"
                                      className="w-14 h-11 object-contain bg-white rounded border border-gray-200 mx-auto p-0.5 shadow-2xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        const updated = [...bulkRows];
                                        updated[idx].img = '';
                                        setBulkRows(updated);
                                      }}
                                      className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center shadow-xs cursor-pointer"
                                      title="Remove image"
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        copyBulkImage(row.img!);
                                      }}
                                      className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[9px] font-bold text-gray-700 cursor-pointer"
                                      title="Copy image"
                                    >
                                      📋 Copy
                                    </button>
                                    {row.sku && (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          applyImageToSku(row.img!, row.sku);
                                        }}
                                        className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded text-[9px] font-bold text-emerald-800 cursor-pointer"
                                        title={`Apply photo to all rows with SKU ${row.sku}`}
                                      >
                                        🔗 SKU
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <label
                                    htmlFor={`bulk-row-img-file-${idx}`}
                                    onClick={e => {
                                      e.stopPropagation();
                                      setActiveBulkRowIdx(idx);
                                    }}
                                    className="cursor-pointer border border-dashed border-emerald-400 hover:border-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 rounded p-1 text-[10px] text-emerald-800 flex flex-col items-center gap-0.5 w-full transition-all group"
                                    title="Click to browse image, or select row and press Ctrl+V"
                                  >
                                    <span className="font-bold flex items-center gap-0.5">
                                      <span>📷</span>
                                      <span>Upload</span>
                                    </span>
                                    <span className="text-[9px] text-gray-500 font-mono font-medium group-hover:text-emerald-900">
                                      Ctrl + V
                                    </span>
                                    <input
                                      id={`bulk-row-img-file-${idx}`}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={e => handleBulkRowImageFile(e, idx)}
                                    />
                                  </label>

                                  {/* Paste button if copied image exists */}
                                  {copiedBulkImage && (
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        pasteCopiedImageToRow(idx);
                                      }}
                                      className="w-full px-1 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[9px] font-bold cursor-pointer transition-all"
                                      title="Paste copied image here"
                                    >
                                      📥 Paste
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="p-1 border border-gray-200">
                              <input
                                type="number"
                                value={row.price || ''}
                                onFocus={() => setActiveBulkRowIdx(idx)}
                                onChange={e => {
                                  const updated = [...bulkRows];
                                  updated[idx].price = Number(e.target.value) || 0;
                                  setBulkRows(updated);
                                }}
                                placeholder="0"
                                className="w-full p-1 bg-transparent text-right font-bold outline-none"
                              />
                            </td>

                            <td className="p-1 border border-gray-200 text-center">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  const updated = bulkRows.filter((_, i) => i !== idx);
                                  setBulkRows(updated);
                                  if (activeBulkRowIdx >= updated.length) {
                                    setActiveBulkRowIdx(Math.max(0, updated.length - 1));
                                  }
                                }}
                                className="text-red-500 font-bold hover:text-red-700 cursor-pointer"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-between items-center gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setBulkRows([
                      ...bulkRows,
                      {
                        id: `row-${Date.now()}`,
                        sku: '',
                        name: '',
                        watt: '',
                        cct: '3000K',
                        beam: '36°',
                        cri: 'CRI 90+',
                        ip: 'IP20',
                        finish: 'White',
                        price: 0,
                        cost: 0,
                        stock: 10,
                        img: ''
                      }
                    ])
                  }
                  className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded cursor-pointer"
                >
                  + Add Row
                </button>
                <button
                  onClick={() => setBulkRows([])}
                  className="px-3 py-1.5 border border-red-300 text-red-600 text-xs font-bold rounded cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkImportModal(false)}
                  className="px-4 py-1.5 border border-gray-300 text-gray-700 text-xs font-bold rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkImport}
                  className="px-5 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded shadow cursor-pointer"
                >
                  ✅ Import All Products
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ACCOUNTING QUICK MODALS */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-3">
          <div className="bg-white rounded-xl p-5 w-80 space-y-3 text-xs">
            <h3 className="font-bold text-sm">Add Bank Account</h3>
            <input id="bank-in-name" type="text" placeholder="Bank Name" className="w-full border p-2 rounded" />
            <input id="bank-in-acct" type="text" placeholder="Account Number" className="w-full border p-2 rounded" />
            <input id="bank-in-bal" type="number" placeholder="Opening Balance" className="w-full border p-2 rounded" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowBankModal(false)} className="px-3 py-1.5 border rounded">
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = (document.getElementById('bank-in-name') as HTMLInputElement).value;
                  const acct = (document.getElementById('bank-in-acct') as HTMLInputElement).value;
                  const bal = Number((document.getElementById('bank-in-bal') as HTMLInputElement).value) || 0;
                  if (name) {
                    const updated = [...banks, { name, acct, bal }];
                    setBanks(updated);
                    localStorage.setItem('artelume_banks', JSON.stringify(updated));
                    setShowBankModal(false);
                  }
                }}
                className="px-3 py-1.5 bg-[#df9c20] text-black font-bold rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-3">
          <div className="bg-white rounded-xl p-5 w-80 space-y-3 text-xs">
            <h3 className="font-bold text-sm">Add Customer</h3>
            <input id="cust-in-name" type="text" placeholder="Client / Architect Name" className="w-full border p-2 rounded" />
            <input id="cust-in-loc" type="text" placeholder="Location / City" className="w-full border p-2 rounded" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCustomerModal(false)} className="px-3 py-1.5 border rounded">
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = (document.getElementById('cust-in-name') as HTMLInputElement).value;
                  const loc = (document.getElementById('cust-in-loc') as HTMLInputElement).value;
                  if (name) {
                    const updated = [...customers, { name, loc }];
                    setCustomers(updated);
                    localStorage.setItem('artelume_customers', JSON.stringify(updated));
                    setShowCustomerModal(false);
                  }
                }}
                className="px-3 py-1.5 bg-[#df9c20] text-black font-bold rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-3">
          <div className="bg-white rounded-xl p-5 w-80 space-y-3 text-xs">
            <h3 className="font-bold text-sm">Add Purchase Bill</h3>
            <input id="pur-in-name" type="text" placeholder="Supplier Name" className="w-full border p-2 rounded" />
            <input id="pur-in-amt" type="number" placeholder="Bill Amount (₹)" className="w-full border p-2 rounded" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowPurchaseModal(false)} className="px-3 py-1.5 border rounded">
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = (document.getElementById('pur-in-name') as HTMLInputElement).value;
                  const amt = Number((document.getElementById('pur-in-amt') as HTMLInputElement).value) || 0;
                  if (name) {
                    const updated = [...purchases, { name, amt, date: todayStr() }];
                    setPurchases(updated);
                    localStorage.setItem('artelume_purchases', JSON.stringify(updated));
                    setShowPurchaseModal(false);
                  }
                }}
                className="px-3 py-1.5 bg-[#df9c20] text-black font-bold rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-3">
          <div className="bg-white rounded-xl p-5 w-80 space-y-3 text-xs">
            <h3 className="font-bold text-sm">Add Expense Record</h3>
            <input id="exp-in-name" type="text" placeholder="Category (e.g. Freight)" className="w-full border p-2 rounded" />
            <input id="exp-in-amt" type="number" placeholder="Amount (₹)" className="w-full border p-2 rounded" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowExpenseModal(false)} className="px-3 py-1.5 border rounded">
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = (document.getElementById('exp-in-name') as HTMLInputElement).value;
                  const amt = Number((document.getElementById('exp-in-amt') as HTMLInputElement).value) || 0;
                  if (name) {
                    const updated = [...expenses, { name, amt, date: todayStr() }];
                    setExpenses(updated);
                    localStorage.setItem('artelume_expenses', JSON.stringify(updated));
                    setShowExpenseModal(false);
                  }
                }}
                className="px-3 py-1.5 bg-[#df9c20] text-black font-bold rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showCashModal && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-3">
          <div className="bg-white rounded-xl p-5 w-80 space-y-3 text-xs">
            <h3 className="font-bold text-sm">Add Cash Entry</h3>
            <input id="cash-in-name" type="text" placeholder="Description" className="w-full border p-2 rounded" />
            <input id="cash-in-amt" type="number" placeholder="Amount (₹)" className="w-full border p-2 rounded" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCashModal(false)} className="px-3 py-1.5 border rounded">
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = (document.getElementById('cash-in-name') as HTMLInputElement).value;
                  const amt = Number((document.getElementById('cash-in-amt') as HTMLInputElement).value) || 0;
                  if (name) {
                    const updated = [...cashEntries, { name, amt, date: todayStr() }];
                    setCashEntries(updated);
                    localStorage.setItem('artelume_cash', JSON.stringify(updated));
                    setShowCashModal(false);
                  }
                }}
                className="px-3 py-1.5 bg-[#df9c20] text-black font-bold rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 6. EDIT BANK DETAILS MODAL */}
      {editingBankModal && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3.5 text-xs shadow-2xl border border-[#d9cbb9]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-[#7b3f22]">Edit Bank Transfer Details</h3>
              <button onClick={() => setEditingBankModal(false)} className="text-gray-400 hover:text-gray-700 text-base font-bold">
                ✕
              </button>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Beneficiary / Account Name</label>
                <input
                  type="text"
                  value={bankInfo.accName}
                  onChange={e => setBankInfo({ ...bankInfo, accName: e.target.value })}
                  className="w-full border p-2 rounded font-semibold"
                  placeholder="e.g. ARTÈ LUME LIGHTING STUDIO PVT LTD (DEMO)"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankInfo.accNo}
                  onChange={e => setBankInfo({ ...bankInfo, accNo: e.target.value })}
                  className="w-full border p-2 rounded font-mono font-bold"
                  placeholder="e.g. 98765432109876"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankInfo.bankName}
                    onChange={e => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                    className="w-full border p-2 rounded font-semibold"
                    placeholder="e.g. HDFC BANK"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={bankInfo.ifsc}
                    onChange={e => setBankInfo({ ...bankInfo, ifsc: e.target.value })}
                    className="w-full border p-2 rounded font-mono font-bold uppercase"
                    placeholder="e.g. HDFC0001234"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Branch Address</label>
                <input
                  type="text"
                  value={bankInfo.branch}
                  onChange={e => setBankInfo({ ...bankInfo, branch: e.target.value })}
                  className="w-full border p-2 rounded font-semibold"
                  placeholder="e.g. JUBILEE HILLS, HYDERABAD"
                />
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() =>
                  setBankInfo({
                    accName: 'ARTÈ LUME LIGHTING STUDIO PVT LTD (DEMO)',
                    accNo: '98765432109876',
                    bankName: 'HDFC BANK',
                    ifsc: 'HDFC0001234',
                    branch: 'JUBILEE HILLS, HYDERABAD'
                  })
                }
                className="text-gray-500 hover:text-[#7b3f22] text-[11px] underline cursor-pointer"
              >
                Reset to Dummy Details
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBankModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBankModal(false);
                    showToast('Bank details updated!');
                  }}
                  className="px-4 py-1.5 bg-[#df9c20] hover:brightness-105 text-[#170e08] font-bold rounded cursor-pointer shadow-sm"
                >
                  Save Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6.3. EXPORT & PRINT QUOTATION MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[1050] flex items-center justify-center p-4">
          <div className="bg-[#18110c] text-white border border-[#3e271a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-[#2c170d] to-[#18110c] border-b border-[#3e271a] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📂</span>
                <div>
                  <h3 className="font-bold text-sm text-[#f5eee6]">Export &amp; Print Quotation</h3>
                  <p className="text-[11px] text-[#baaaa0]">
                    #{quoteNum} • {client || 'Valued Client'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-[#9a8576] hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Preview PDF in full-page simulated A4 modal */}
              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  setShowPdfPreviewModal(true);
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 border border-amber-400/40 transition-all text-left cursor-pointer group shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-[#df9c20]/25 border border-[#df9c20]/50 flex items-center justify-center text-lg shrink-0">
                  👁️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-[#f5eee6] group-hover:text-amber-300 transition-colors flex items-center gap-2">
                    <span>Preview PDF Document</span>
                    <span className="text-[9.5px] font-sans font-black bg-[#df9c20] text-black px-1.5 py-0.2 rounded shadow-2xs">
                      FULL PAGE A4
                    </span>
                  </div>
                  <div className="text-[11px] text-[#baa899] mt-0.5">
                    Render full-page document formatted exactly as final printed proposal
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  setTimeout(() => window.print(), 200);
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#df9c20]/20 border border-[#df9c20]/40 flex items-center justify-center text-lg shrink-0">
                  🖨️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white group-hover:text-[#df9c20] transition-colors">
                    Print / Save as PDF
                  </div>
                  <div className="text-[11px] text-[#baaaa0]">
                    Clean architectural PDF print with header, specifications &amp; bank details
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowExportModal(false);
                  await handleExportActiveQuoteExcel();
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-lg shrink-0">
                  📗
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                    Export to Excel (.xlsx)
                  </div>
                  <div className="text-[11px] text-[#baaaa0]">
                    Formatted spreadsheet with embedded luminaire images &amp; line-by-line specs
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  setShowWhatsAppShareModal(true);
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/40 flex items-center justify-center text-lg shrink-0">
                  📱
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white group-hover:text-green-400 transition-colors flex items-center gap-2">
                    <span>Share via WhatsApp</span>
                    <span className="text-[9px] font-sans font-bold bg-green-500/20 text-green-300 border border-green-500/30 px-1.5 py-0.2 rounded">
                      FORMAT SELECTOR
                    </span>
                  </div>
                  <div className="text-[11px] text-[#baaaa0]">
                    Formatted text message with client proposal summary &amp; total pricing
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  setShowClientShareModal(true);
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#df9c20]/20 border border-[#df9c20]/40 flex items-center justify-center text-lg shrink-0">
                  🔗
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white group-hover:text-[#df9c20] transition-colors flex items-center gap-2">
                    <span>Generate Client View Link</span>
                    <span className="text-[9px] font-sans font-bold bg-[#df9c20]/20 text-amber-300 border border-[#df9c20]/30 px-1.5 py-0.2 rounded">
                      READ-ONLY
                    </span>
                  </div>
                  <div className="text-[11px] text-[#baaaa0]">
                    Create a temporary live link to send proposal directly via WhatsApp, SMS, or Email
                  </div>
                </div>
              </button>

              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowExportModal(false);
                    const targetName = quoteName || client;
                    if (targetName) {
                      deleteSavedQuote(targetName);
                    }
                  }}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all text-left cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-lg shrink-0">
                    🗑️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-red-300 group-hover:text-red-200">
                      Delete Quotation
                    </div>
                    <div className="text-[11px] text-red-400/80">
                      Permanently remove this quotation and its saved records
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#110905] border-t border-[#3e271a] flex justify-end">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-[#baaaa0] hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6.5. BRANCH & LOGO SETTINGS MODAL */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/60 z-[1050] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-neutral-200 my-auto">
            {/* Header with Branch Selector Tabs */}
            <div className="bg-[#170e08] text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🏢</span>
                  <div>
                    <h2 className="font-bold text-base tracking-wide text-white">Configure Identity, Logo, 121 Colors &amp; Bank Details</h2>
                    <p className="text-xs text-[#a89689]">Branch Identity &amp; Logo Settings (121 Architectural Color Plates)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Branch Selector Tabs (Configure separate branding, logos, colors & bank details per branch) */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-1.5">
                  {branches.map(b => {
                    const isCurrent = b.id === branchEditForm.id;
                    const isActive = b.id === activeBranchId;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => switchEditingBranchTab(b.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isCurrent
                            ? 'bg-white text-neutral-900 shadow-sm ring-2 ring-amber-400'
                            : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0"
                          style={{ backgroundColor: b.theme.primaryColor }}
                        />
                        <span>{b.name}</span>
                        {isActive && (
                          <span className="text-[9px] bg-emerald-500 text-black px-1.5 py-0.2 rounded font-black">
                            ACTIVE
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={addNewBranch}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#df9c20] hover:brightness-110 text-[#170e08] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Add a new studio branch with independent branding, logo, colors & bank details"
                  >
                    <span>+</span>
                    <span>Add Branch</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {branchEditForm.id !== activeBranchId ? (
                    <button
                      type="button"
                      onClick={() => switchBranch(branchEditForm.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                      title="Set this branch as currently active for all live quotations & website styling"
                    >
                      ✓ Set as Active
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
                      ● Active Branch
                    </span>
                  )}
                  {branches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteBranch(branchEditForm.id)}
                      className="text-[11px] text-red-300 hover:text-red-100 hover:bg-red-950/50 px-2 py-1 rounded transition-colors cursor-pointer"
                      title="Delete this branch"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5 text-xs">
              {/* 1. Branch Logo Upload & Ctrl+V Paste Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-neutral-800 text-xs">
                    Branch Logo ({branchEditForm.name})
                  </label>
                  <span className="text-[11px] text-amber-700 font-medium">Supports File Upload &amp; Ctrl + V Paste</span>
                </div>

                <div
                  tabIndex={0}
                  onPaste={handleLogoPaste}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onload = ev => {
                        if (ev.target?.result) {
                          setBranchEditForm(prev => ({ ...prev, logoUrl: ev.target!.result as string }));
                          showToast('Logo dropped!');
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="border-2 border-dashed border-neutral-300 hover:border-amber-500 rounded-xl p-4 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-neutral-50"
                >
                  {branchEditForm.logoUrl ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#170e08] border border-neutral-700 shadow-inner text-center">
                          <img
                            src={branchEditForm.logoUrl}
                            alt="Logo on dark"
                            className="h-12 max-w-[130px] object-contain mx-auto"
                          />
                          <span className="text-[9px] text-neutral-400 block mt-1">Dark Header</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-neutral-200 shadow-inner text-center">
                          <img
                            src={branchEditForm.logoUrl}
                            alt="Logo on light"
                            className="h-12 max-w-[130px] object-contain mx-auto"
                          />
                          <span className="text-[9px] text-neutral-500 block mt-1">Light Canvas</span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col gap-2 items-end">
                        <label className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-semibold rounded cursor-pointer shadow-sm">
                          Browse File
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoFileUpload}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setBranchEditForm(prev => ({ ...prev, logoUrl: '' }))}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded cursor-pointer"
                        >
                          Remove Logo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <div className="text-3xl mb-1">🖼️</div>
                      <div className="font-bold text-sm text-neutral-800">
                        Click inside this box &amp; press <kbd className="px-1.5 py-0.5 bg-neutral-200 border border-neutral-300 rounded text-xs font-mono font-semibold">Ctrl + V</kbd> to Paste Logo
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Paste from clipboard, drag &amp; drop an image file, or browse from device
                      </p>
                      <label className="mt-3 inline-block px-4 py-1.5 bg-[#7b3f22] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#8e4928] shadow-sm">
                        📁 Browse Logo File
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoFileUpload}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Live Header Preview */}
              <div>
                <label className="font-bold text-neutral-800 text-xs block mb-1.5">
                  Live Quotation Banner Preview
                </label>
                <div
                  className="rounded-xl p-4 text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors"
                  style={{ backgroundColor: branchEditForm.theme.primaryColor }}
                >
                  <div className="flex items-center gap-3">
                    {branchEditForm.logoUrl && (
                      <div className="bg-white/10 backdrop-blur-sm p-1.5 rounded-lg border border-white/20 shrink-0 max-w-[100px] max-h-[50px] flex items-center justify-center">
                        <img
                          src={branchEditForm.logoUrl}
                          alt="Logo"
                          className="max-h-10 max-w-full object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <div className="font-serif text-lg font-bold tracking-wider">{branchEditForm.name || 'COMPANY NAME'}</div>
                      <div className="text-[11px] italic" style={{ color: branchEditForm.theme.accentColor }}>
                        {branchEditForm.tagline || 'Lighting Studio'}
                      </div>
                      <div className="text-[10px] text-white/80">{branchEditForm.location}</div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="font-bold text-sm tracking-wide" style={{ color: branchEditForm.theme.accentColor }}>
                      QUOTATION
                    </div>
                    <div className="text-[11px] font-mono text-[#f2cf8c]">#{branchEditForm.quotePrefix}-001</div>
                  </div>
                </div>
              </div>

              {/* 3. Company & Branch Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500 border-b pb-1">
                  Company Identity &amp; Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Company / Branch Name</label>
                    <input
                      type="text"
                      value={branchEditForm.name}
                      onChange={e => setBranchEditForm({ ...branchEditForm, name: e.target.value })}
                      className="w-full border border-neutral-300 p-2 rounded-lg font-semibold"
                      placeholder="e.g. LIGHTCRAFT"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Tagline / Subtitle</label>
                    <input
                      type="text"
                      value={branchEditForm.tagline}
                      onChange={e => setBranchEditForm({ ...branchEditForm, tagline: e.target.value })}
                      className="w-full border border-neutral-300 p-2 rounded-lg"
                      placeholder="e.g. Architectural & Decorative Lighting Co."
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Location Tag</label>
                    <input
                      type="text"
                      value={branchEditForm.location}
                      onChange={e => setBranchEditForm({ ...branchEditForm, location: e.target.value })}
                      className="w-full border border-neutral-300 p-2 rounded-lg font-semibold"
                      placeholder="e.g. Dwaraka Nagar • Visakhapatnam (Vizag)"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Quotation &amp; Challan Number Prefix</label>
                    <input
                      type="text"
                      value={branchEditForm.quotePrefix}
                      onChange={e => setBranchEditForm({ ...branchEditForm, quotePrefix: e.target.value.toUpperCase() })}
                      className="w-full border border-neutral-300 p-2 rounded-lg font-mono font-bold"
                      placeholder="e.g. AL-HYD, AL-VZG, AL"
                      maxLength={12}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">GSTIN Number</label>
                    <input
                      type="text"
                      value={branchEditForm.gstin}
                      onChange={e => setBranchEditForm({ ...branchEditForm, gstin: e.target.value.toUpperCase() })}
                      className="w-full border border-neutral-300 p-2 rounded-lg font-mono font-bold uppercase"
                      placeholder="e.g. 37AAACL9988K1Z5"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Email &amp; Phone</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={branchEditForm.email}
                        onChange={e => setBranchEditForm({ ...branchEditForm, email: e.target.value })}
                        className="w-full border border-neutral-300 p-2 rounded-lg text-xs"
                        placeholder="contact@company.com"
                      />
                      <input
                        type="text"
                        value={branchEditForm.phone}
                        onChange={e => setBranchEditForm({ ...branchEditForm, phone: e.target.value })}
                        className="w-full border border-neutral-300 p-2 rounded-lg text-xs"
                        placeholder="+91 891 2789123"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Full Studio / Branch Address</label>
                  <textarea
                    value={branchEditForm.address}
                    onChange={e => setBranchEditForm({ ...branchEditForm, address: e.target.value })}
                    className="w-full border border-neutral-300 p-2 rounded-lg text-xs"
                    rows={2}
                    placeholder="Full street address, city, state, pincode"
                  />
                </div>
              </div>

              {/* 4. Theme & Color Customization (121 Curated Architectural Color Plates) */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-800">
                      Branch Theme &amp; Color Scheme (121 Architectural Color Plates)
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Applied instantly to live quotations and exported Excel spreadsheets
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                    121 Designer Color Plates
                  </span>
                </div>

                {/* Live Preview Band (Quote + Excel Export) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-900 rounded-xl text-white">
                  {/* Quotation Header Live Preview */}
                  <div className="bg-[#170e08] p-3 rounded-lg border border-neutral-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
                        📄 Quotation Live Style
                      </span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: branchEditForm.theme.accentColor }}
                      >
                        Accent
                      </span>
                    </div>
                    <div
                      className="font-serif font-black text-base tracking-wider truncate"
                      style={{ color: branchEditForm.theme.primaryColor === '#0B0B0B' || branchEditForm.theme.primaryColor === '#111215' || branchEditForm.theme.primaryColor === '#121212' ? '#df9c20' : branchEditForm.theme.accentColor }}
                    >
                      {branchEditForm.name}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate">{branchEditForm.tagline}</div>
                    <div
                      className="h-1 rounded-full w-full"
                      style={{ backgroundColor: branchEditForm.theme.accentColor }}
                    />
                  </div>

                  {/* Excel Spreadsheet Live Preview */}
                  <div className="bg-[#1b232a] p-3 rounded-lg border border-neutral-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
                        📗 Excel Export Banner
                      </span>
                      <span className="text-[9px] font-mono font-bold text-amber-300">
                        {branchEditForm.theme.excelBannerColor}
                      </span>
                    </div>
                    <div
                      className="p-2 rounded text-white font-bold text-xs truncate shadow"
                      style={{ backgroundColor: branchEditForm.theme.primaryColor }}
                    >
                      <span>{branchEditForm.name}</span>
                      <span className="font-normal text-[10px] opacity-80 block truncate">
                        {branchEditForm.location}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-sm w-full"
                      style={{ backgroundColor: branchEditForm.theme.accentColor }}
                    />
                  </div>
                </div>

                {/* Category Filter Tabs & Search */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-neutral-700">Choose from 121 Architectural Color Plates:</span>
                    <input
                      type="text"
                      value={paletteSearch}
                      onChange={e => setPaletteSearch(e.target.value)}
                      placeholder="Search palette by name, category, or hex..."
                      className="text-[11px] border border-neutral-300 px-2.5 py-1 rounded-lg w-48 sm:w-64 outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {PALETTE_CATEGORIES.map(cat => {
                      const isAll = cat.startsWith('All');
                      const isActive = isAll ? (paletteCategory === 'All' || paletteCategory.startsWith('All')) : paletteCategory === cat;
                      const count = isAll ? COLOR_PALETTES.length : COLOR_PALETTES.filter(p => p.category === cat).length;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPaletteCategory(cat)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all ${
                            isActive
                              ? 'bg-neutral-900 text-white shadow-sm'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          <span>{cat.replace(/ \(\d+\)/, '')}</span>
                          <span className={`ml-1 text-[10px] ${isActive ? 'text-amber-300' : 'text-neutral-400'}`}>
                            ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 121 Color Plates Interactive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-1.5 border border-neutral-200 rounded-xl bg-neutral-50/50">
                  {COLOR_PALETTES.filter(p => {
                    const isAll = paletteCategory === 'All' || paletteCategory.startsWith('All');
                    if (!isAll && p.category !== paletteCategory) return false;
                    if (paletteSearch.trim()) {
                      const q = paletteSearch.toLowerCase();
                      return (
                        p.name.toLowerCase().includes(q) ||
                        p.category.toLowerCase().includes(q) ||
                        p.primary.toLowerCase().includes(q) ||
                        p.accent.toLowerCase().includes(q) ||
                        p.tag.toLowerCase().includes(q) ||
                        p.colors.some(c => c.toLowerCase().includes(q))
                      );
                    }
                    return true;
                  }).map(p => {
                    const isSelected =
                      branchEditForm.theme.primaryColor.toLowerCase() === p.primary.toLowerCase() &&
                      branchEditForm.theme.accentColor.toLowerCase() === p.accent.toLowerCase();

                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 relative group ${
                          isSelected
                            ? 'border-neutral-900 bg-amber-50/30 ring-2 ring-neutral-900 shadow-sm'
                            : 'border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-xs'
                        }`}
                      >
                        {/* Segmented Color Plate Strip */}
                        <div
                          onClick={() => applyColorPlateTheme(p)}
                          className="w-full flex h-6 rounded-md overflow-hidden border border-neutral-300 shadow-xs cursor-pointer"
                          title="Click to apply this entire color plate live to the website"
                        >
                          {p.colors.map((c, cIdx) => (
                            <div
                              key={cIdx}
                              className="flex-1 h-full hover:brightness-110 transition-all relative group/swatch"
                              style={{ backgroundColor: c }}
                              title={`${c} (Swatch ${cIdx + 1})`}
                            />
                          ))}
                        </div>

                        {/* Plate Header & Meta */}
                        <div className="w-full flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-neutral-400">
                                #{String(p.id).padStart(2, '0')}
                              </span>
                              <button
                                type="button"
                                onClick={() => applyColorPlateTheme(p)}
                                className="text-xs font-bold text-neutral-800 hover:text-amber-700 truncate text-left cursor-pointer"
                              >
                                {p.name}
                              </button>
                            </div>
                            <div className="text-[10px] text-neutral-500 truncate mt-0.5">{p.tag}</div>

                            {/* Hex Swatch Tags (Clickable for fine-tune setting) */}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {p.colors.map((hex, hIdx) => (
                                <button
                                  key={hIdx}
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    const argb = 'FF' + hex.replace('#', '').toUpperCase();
                                    const newTheme = hIdx === 0
                                      ? { ...branchEditForm.theme, primaryColor: hex, excelBannerColor: argb }
                                      : { ...branchEditForm.theme, accentColor: hex, excelAccentColor: argb };
                                    setBranchEditForm({
                                      ...branchEditForm,
                                      theme: newTheme
                                    });
                                    if (branchEditForm.id === activeBranchId) {
                                      setThemeOverride(newTheme);
                                      try { localStorage.setItem('artelume_active_theme', JSON.stringify(newTheme)); } catch (err) {}
                                    }
                                    showToast(`Set ${hex} as ${hIdx === 0 ? 'Primary' : 'Accent'} Color for ${branchEditForm.name}!`);
                                  }}
                                  className="font-mono text-[9px] text-neutral-600 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/60 px-1 py-0.5 rounded cursor-pointer transition-colors"
                                  title={`Click to apply ${hex} (${hIdx === 0 ? 'Primary' : 'Accent'})`}
                                >
                                  {hex}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1">
                            {isSelected ? (
                              <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                Active ✓
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => applyColorPlateTheme(p)}
                                className="text-[10px] font-semibold text-neutral-600 hover:text-amber-800 border border-neutral-300 rounded px-1.5 py-0.5 hover:bg-neutral-50 cursor-pointer"
                              >
                                Apply
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Color Overrides (Fine-tuning) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1 text-xs">Custom Primary Banner Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branchEditForm.theme.primaryColor}
                        onChange={e => {
                          const val = e.target.value;
                          const argb = 'FF' + val.replace('#', '').toUpperCase();
                          const newTheme = { ...branchEditForm.theme, primaryColor: val, excelBannerColor: argb };
                          setBranchEditForm(prev => ({
                            ...prev,
                            theme: newTheme
                          }));
                          if (branchEditForm.id === activeBranchId) {
                            setThemeOverride(newTheme);
                            try { localStorage.setItem('artelume_active_theme', JSON.stringify(newTheme)); } catch (err) {}
                          }
                        }}
                        className="w-9 h-8 p-0.5 border border-neutral-300 rounded cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={branchEditForm.theme.primaryColor}
                        onChange={e => {
                          const val = e.target.value;
                          const argb = 'FF' + val.replace('#', '').toUpperCase();
                          const newTheme = { ...branchEditForm.theme, primaryColor: val, excelBannerColor: argb };
                          setBranchEditForm(prev => ({
                            ...prev,
                            theme: newTheme
                          }));
                          if (val.length === 7 && branchEditForm.id === activeBranchId) {
                            setThemeOverride(newTheme);
                            try { localStorage.setItem('artelume_active_theme', JSON.stringify(newTheme)); } catch (err) {}
                          }
                        }}
                        className="w-full border border-neutral-300 p-1.5 rounded-lg font-mono text-xs font-semibold uppercase"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1 text-xs">Custom Accent Highlight Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branchEditForm.theme.accentColor}
                        onChange={e => {
                          const val = e.target.value;
                          const argb = 'FF' + val.replace('#', '').toUpperCase();
                          const newTheme = { ...branchEditForm.theme, accentColor: val, excelAccentColor: argb };
                          setBranchEditForm(prev => ({
                            ...prev,
                            theme: newTheme
                          }));
                          if (branchEditForm.id === activeBranchId) {
                            setThemeOverride(newTheme);
                            try { localStorage.setItem('artelume_active_theme', JSON.stringify(newTheme)); } catch (err) {}
                          }
                        }}
                        className="w-9 h-8 p-0.5 border border-neutral-300 rounded cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={branchEditForm.theme.accentColor}
                        onChange={e => {
                          const val = e.target.value;
                          const argb = 'FF' + val.replace('#', '').toUpperCase();
                          const newTheme = { ...branchEditForm.theme, accentColor: val, excelAccentColor: argb };
                          setBranchEditForm(prev => ({
                            ...prev,
                            theme: newTheme
                          }));
                          if (val.length === 7 && branchEditForm.id === activeBranchId) {
                            setThemeOverride(newTheme);
                            try { localStorage.setItem('artelume_active_theme', JSON.stringify(newTheme)); } catch (err) {}
                          }
                        }}
                        className="w-full border border-neutral-300 p-1.5 rounded-lg font-mono text-xs font-semibold uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Branch Bank Account Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500 border-b pb-1">
                  Bank Transfer Details for {branchEditForm.name}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Account Beneficiary Name</label>
                    <input
                      type="text"
                      value={branchEditForm.bankDetails.accName}
                      onChange={e =>
                        setBranchEditForm({
                          ...branchEditForm,
                          bankDetails: { ...branchEditForm.bankDetails, accName: e.target.value }
                        })
                      }
                      className="w-full border border-neutral-300 p-2 rounded-lg font-semibold"
                      placeholder="e.g. LIGHTCRAFT LIGHTING COMPANY"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={branchEditForm.bankDetails.accNo}
                      onChange={e =>
                        setBranchEditForm({
                          ...branchEditForm,
                          bankDetails: { ...branchEditForm.bankDetails, accNo: e.target.value }
                        })
                      }
                      className="w-full border border-neutral-300 p-2 rounded-lg font-mono font-bold"
                      placeholder="e.g. 005405009876"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={branchEditForm.bankDetails.bankName}
                      onChange={e =>
                        setBranchEditForm({
                          ...branchEditForm,
                          bankDetails: { ...branchEditForm.bankDetails, bankName: e.target.value }
                        })
                      }
                      className="w-full border border-neutral-300 p-2 rounded-lg font-semibold"
                      placeholder="e.g. ICICI BANK"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={branchEditForm.bankDetails.ifsc}
                      onChange={e =>
                        setBranchEditForm({
                          ...branchEditForm,
                          bankDetails: { ...branchEditForm.bankDetails, ifsc: e.target.value.toUpperCase() }
                        })
                      }
                      className="w-full border border-neutral-300 p-2 rounded-lg font-mono font-bold uppercase"
                      placeholder="e.g. ICIC0000054"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold text-neutral-700 block mb-1">Branch Name / Address</label>
                    <input
                      type="text"
                      value={branchEditForm.bankDetails.branch}
                      onChange={e =>
                        setBranchEditForm({
                          ...branchEditForm,
                          bankDetails: { ...branchEditForm.bankDetails, branch: e.target.value }
                        })
                      }
                      className="w-full border border-neutral-300 p-2 rounded-lg font-semibold"
                      placeholder="e.g. DWARAKA NAGAR, VISAKHAPATNAM"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => resetBranchToDefault(branchEditForm.id)}
                className="text-neutral-500 hover:text-red-700 text-xs font-semibold underline cursor-pointer"
              >
                Reset {branchEditForm.name} to Factory Defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-3.5 py-1.5 border border-neutral-300 hover:bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveBranchEdits}
                  className="px-5 py-1.5 bg-[#df9c20] hover:brightness-105 text-[#170e08] rounded-lg text-xs font-bold shadow cursor-pointer"
                >
                  Save Branch Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION MODAL */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-black/60 z-[1100] flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl border border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-lg font-bold shrink-0">
                🗑️
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#17191c]">
                  Delete {deleteConfirmTarget.type === 'quote' ? 'Quotation' : 'Product'}?
                </h3>
                <p className="text-xs text-gray-500">
                  This item will be permanently removed from your studio records.
                </p>
              </div>
            </div>
            <div className="p-3 bg-[#faf7f4] border border-[#eee8df] rounded-lg text-xs font-semibold text-[#7b3f22] break-words">
              {deleteConfirmTarget.name}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmTarget.type === 'quote') {
                    handleExecuteDeleteQuote(deleteConfirmTarget.id);
                  } else {
                    handleExecuteDeleteProduct(deleteConfirmTarget.id);
                  }
                  setDeleteConfirmTarget(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7B. STUDIO ACTIVITY & CREATOR NOTIFICATIONS MODAL */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#18110c] text-white border border-[#3e271a] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2c170d] via-[#1f110a] to-[#18110c] border-b border-[#3e271a] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔔</span>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#f5eee6]">
                    Studio Activity Notifications
                  </h3>
                  <p className="text-[11px] text-[#a89588]">
                    Real-time audit log of quotes created, challans issued &amp; payments logged
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                className="text-[#9a8576] hover:text-white p-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
              {studioNotifications.length === 0 ? (
                <div className="p-8 text-center bg-[#130b07] rounded-xl border border-[#3e271a]/60">
                  <span className="text-3xl block mb-2">📭</span>
                  <div className="font-bold text-sm text-neutral-300">No Notifications Yet</div>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                    When anyone creates a quotation, issues a delivery challan, or records a payment, their name and details will appear here.
                  </p>
                </div>
              ) : (
                studioNotifications.map(n => (
                  <div
                    key={n.id}
                    className="p-3 bg-[#20130c] border border-[#3e271a] rounded-xl flex items-start gap-3 hover:border-[#df9c20]/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#331c10] border border-[#4a3022] flex items-center justify-center text-base shrink-0">
                      {n.type === 'quotation' ? '📄' : n.type === 'challan' ? '🚚' : '💳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-[#f5eee6] truncate">{n.title}</span>
                        <span className="text-[10px] text-neutral-500 font-mono shrink-0">{n.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-[#c4b5a8] mt-0.5">{n.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                          👤 {n.actorName}
                        </span>
                        {n.actorRole && (
                          <span className="text-[9.5px] text-[#df9c20] font-mono capitalize">
                            ({n.actorRole})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {studioNotifications.length > 0 && (
              <div className="p-3 bg-[#130b07] border-t border-[#3e271a] flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  Total: {studioNotifications.length} notification{studioNotifications.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStudioNotifications([]);
                    try {
                      localStorage.removeItem('artelume_studio_notifications');
                    } catch (e) {}
                    showToast('Notifications cleared.');
                  }}
                  className="px-3 py-1 bg-red-950/50 hover:bg-red-900/60 border border-red-500/30 text-red-200 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. STUDIO ACCOUNT & SIGN OUT MODAL */}
      <StudioAccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onShowToast={showToast}
        onOpenTeamModal={() => setShowTeamModal(true)}
      />

      {/* 8B. OWNER TEAM STAFF ROLE ASSIGNMENT & PERMISSIONS MODAL */}
      <TeamManagementModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        members={teamMembers}
        onMembersChange={setTeamMembers}
        onShowToast={showToast}
        activeBranch={activeBranch}
      />

      {/* 9. CLIENT VIEW SHARE LINK GENERATOR MODAL */}
      {showClientShareModal && (
        <ClientShareModal
          quote={currentQuoteDoc}
          branch={activeBranch}
          onClose={() => setShowClientShareModal(false)}
          onShowToast={showToast}
        />
      )}

      {/* 10. WHATSAPP PROPOSAL SHARE MODAL */}
      {showWhatsAppShareModal && (
        <WhatsAppShareModal
          isOpen={showWhatsAppShareModal}
          onClose={() => setShowWhatsAppShareModal(false)}
          quote={currentQuoteDoc}
          branch={activeBranch}
          onShowToast={showToast}
          onOpenPdfPreview={() => setShowPdfPreviewModal(true)}
        />
      )}

      {/* 11. PDF DOCUMENT PREVIEW MODAL */}
      {showPdfPreviewModal && (
        <PdfPreviewModal
          quote={currentQuoteDoc}
          branch={activeBranch}
          isOpen={showPdfPreviewModal}
          onClose={() => setShowPdfPreviewModal(false)}
          onPrint={() => window.print()}
          onShareWhatsApp={() => setShowWhatsAppShareModal(true)}
        />
      )}

      {/* 12. ADVANCE & ON-DELIVERY PAYMENT RECORDING MODAL */}
      <PaymentRecordModal
        isOpen={showPaymentModal && Boolean(paymentTargetQuote || currentQuoteDoc)}
        quote={paymentTargetQuote || currentQuoteDoc}
        branch={activeBranch}
        currentRole={currentRole}
        staffName={userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Studio Team'}
        userEmail={user?.email || undefined}
        initialTab={paymentModalTab}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentTargetQuote(null);
        }}
        onSavePayment={handleSavePayment}
        onEditPayment={handleEditPayment}
        onDeletePayment={paymentId => {
          const target = paymentTargetQuote || currentQuoteDoc;
          if (target) {
            handleDeletePayment(target.quoteNum, paymentId);
          }
        }}
        onShowToast={showToast}
      />

      {/* 13. ARCHITECTURAL DELIVERY CHALLAN & VEHICLE MANIFEST MODAL */}
      <DeliveryChallanModal
        isOpen={showChallanModal}
        challan={editingChallan}
        initialQuote={challanSourceQuote}
        initialTab={challanModalInitialTab}
        savedQuotes={savedQuotes}
        allChallans={deliveryChallans}
        branch={activeBranch}
        currentRole={currentRole}
        staffName={userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Studio Team'}
        onClose={() => {
          setShowChallanModal(false);
          setEditingChallan(null);
          setChallanSourceQuote(null);
        }}
        onSaveChallan={(challan, payment) => {
          handleSaveChallan(challan, payment);
          setShowChallanModal(false);
          setEditingChallan(null);
          setChallanSourceQuote(null);
        }}
        onOpenPaymentModal={quote => handleOpenRecordPayment(quote)}
        onShowToast={showToast}
      />

      {/* 13B. CUMULATIVE MATERIAL MATRIX MODAL */}
      {/* 13B. CUMULATIVE MATERIAL MATRIX MODAL (ALWAYS LIVE-SYNCED) */}
      {matrixModalQuote && (() => {
        const liveQuote = Object.values(savedQuotes).find(
          q =>
            (q.quoteNum && matrixModalQuote.quoteNum && q.quoteNum.toLowerCase() === matrixModalQuote.quoteNum.toLowerCase()) ||
            (q.name && matrixModalQuote.name && q.name.toLowerCase() === matrixModalQuote.name.toLowerCase()) ||
            (matrixModalQuote.id && q.id === matrixModalQuote.id)
        ) || matrixModalQuote;

        return (
          <MaterialMatrixModal
            isOpen={Boolean(matrixModalQuote)}
            onClose={() => setMatrixModalQuote(null)}
            quote={liveQuote}
            challans={deliveryChallans}
            branch={activeBranch}
            onCreateNextChallan={(q, prefilledSku) => {
              setMatrixModalQuote(null);
              handleOpenCreateChallan(q);
            }}
            formatInr={formatInr}
            onShowToast={showToast}
          />
        );
      })()}

      {/* 13C. DELIVERY POD & SITE PAYMENT COLLECTION SIMULATOR */}
      {podModalTarget && (
        <DeliveryPodCollectionModal
          isOpen={Boolean(podModalTarget)}
          onClose={() => setPodModalTarget(null)}
          challan={podModalTarget.challan}
          quote={podModalTarget.quote}
          branch={activeBranch}
          onConfirmPodPayment={handleConfirmPodPayment}
          formatInr={formatInr}
          onShowToast={showToast}
        />
      )}

      {/* 14. PENDING & OVERDUE NOTIFY CLIENT FOLLOW-UP MODAL */}
      {showNotifyClientModal && notifyClientTarget && (
        <NotifyClientModal
          meta={notifyClientTarget}
          branch={activeBranch}
          onClose={() => {
            setShowNotifyClientModal(false);
            setNotifyClientTarget(null);
          }}
          onShowToast={showToast}
        />
      )}

      {/* 15. FIRST-LAUNCH / INSTALLED APP ONBOARDING PROMPT */}
      <AppWelcomePromptModal
        isOpen={showWelcomePromptModal}
        onClose={() => setShowWelcomePromptModal(false)}
        onStartGuide={() => setShowUsageGuideModal(true)}
        brandPrimaryColor={activeBranch.theme.primaryColor}
        brandAccentColor={activeBranch.theme.accentColor}
      />

      {/* 16. INTERACTIVE 5-STEP APPLICATION USAGE GUIDE ("HOW TO USE APP") */}
      <AppUsageGuideModal
        isOpen={showUsageGuideModal}
        onClose={() => setShowUsageGuideModal(false)}
        onNavigateView={navigateView}
        brandPrimaryColor={activeBranch.theme.primaryColor}
        brandAccentColor={activeBranch.theme.accentColor}
      />

      {/* 17. OFFICIAL STORE INSTALLATION MODAL (PLAY STORE / APP STORE / PC) */}
      <DownloadAppModal
        isOpen={showStoreInstallModal}
        onClose={() => setShowStoreInstallModal(false)}
        brandPrimaryColor={activeBranch.theme.primaryColor}
        brandAccentColor={activeBranch.theme.accentColor}
      />
    </div>
  );
}

function AppGatekeeper() {
  const { user, company, loading } = useAuth();

  // If a client view link is opened, bypass Studio login and render the read-only proposal directly
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isClientProposalView = urlParams && (urlParams.get('view') === 'client' || urlParams.get('clientView') === 'true');

  if (isClientProposalView) {
    return <StudioQuotationApp />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#110905] flex flex-col items-center justify-center p-6 text-[#f5eee6]">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7b3f22] to-[#df9c20] flex items-center justify-center shadow-[0_0_35px_rgba(223,156,32,0.35)] animate-pulse">
            <span className="font-serif font-black text-2xl text-[#110905] tracking-wider">AL</span>
          </div>
          <div className="absolute -inset-2 border-2 border-[#df9c20]/30 rounded-3xl animate-ping opacity-30" />
        </div>
        <p className="font-serif tracking-[0.25em] uppercase text-sm text-[#df9c20] font-semibold">ARTÈ LUME</p>
        <p className="text-[11px] text-[#9e8d7f] uppercase tracking-widest mt-1">Connecting to Studio Database & Auth Engine...</p>
      </div>
    );
  }

  // Strict User Mandate: App preview remains completely locked until the user logs in or joins a company!
  if (!user || !company) {
    return <AuthGate />;
  }

  // Once authenticated into their company/organization, the full application opens
  return <StudioQuotationApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppGatekeeper />
    </AuthProvider>
  );
}
