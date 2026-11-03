export interface LightingProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  watt: string;
  cct: string;
  beam?: string;         // e.g. "15°", "24°", "36°", "60°", "Diffused"
  cri?: string;          // e.g. "CRI 90+", "CRI 95+", "CRI 97"
  ip?: string;           // e.g. "IP20", "IP44", "IP54", "IP65", "IP68"
  finish?: string;       // e.g. "Matte White", "Matte Black", "Brushed Brass", "Antique Bronze"
  reflector?: string;    // e.g. "Specular", "Black Chrome", "Rose Gold", "Matte White", "Dark Light"
  dimming?: string;      // e.g. "Non-Dim", "Phase/Triac", "0-10V", "DALI-2", "CASAMBI"
  cutout?: string;       // e.g. "Ø75mm", "Ø50mm", "100×100mm", "Trimless"
  dimensions?: string;   // e.g. "Ø85×95mm", "L1200×W35×H55mm"
  chip?: string;         // e.g. "Bridgelux", "Citizen", "Cree"
  driver?: string;       // e.g. "Lafit", "Tridonic", "Philips", "Mean Well"
  price: number;
  cost?: number;
  stock?: number;
  img?: string;
  svg?: string;
  popular?: boolean;
}

export interface QuotationItem extends LightingProduct {
  qty: number;
  listPrice: number;
  discount: number;
  price: number;
  area?: string;         // e.g. "Living Room", "Dining Area", "Master Bed", "Façade"
  code?: string;         // Legacy compatibility
  desc?: string;         // Legacy compatibility
  _lastMatchedSku?: string;
}

export type AppRole = 'owner' | 'admin' | 'sales' | 'delivery' | 'member' | 'staff';

export interface CompanyMember {
  uid: string;
  email: string;
  displayName: string;
  role: AppRole;
  phone?: string;
  pin?: string;                // 4-digit numeric PIN for quick staff sign-in
  assignedBranchId?: string;   // 'artelume' (Branch 1 - Hyd) or 'artelume-vizag' (Branch 2 - Vizag)
  assignedBranchName?: string; // Human readable branch label
  inviteCode?: string;         // Unique dedicated invite code for the staff member (e.g. HYD-SALES-8492)
  status: 'active' | 'invited' | 'disabled';
  joinedAt?: string;
  assignedBy?: string;
}

export interface QuotationPaymentRecord {
  id: string;
  date: string;
  amount: number;
  type: 'Advance Booking' | 'On-Delivery Payment' | 'Milestone' | 'Final Settlement';
  paymentMode: 'UPI' | 'NEFT / RTGS' | 'Cash' | 'Cheque';
  referenceNo?: string;        // e.g. UTR # or Cheque #
  collectedByRole: AppRole;
  collectedByName: string;     // Staff name / email
  receiptNumber: string;       // e.g. RCP-2026-001
  verifiedByAdmin: boolean;    // Bank audit flag
  notes?: string;
}

export interface DeliveryChallanItem {
  sku: string;
  name: string;
  qtyDispatched: number;
  qtyOrdered: number;
  qtyPending: number;
}

export interface DeliveryChallan {
  id: string;
  challanNum: string;          // e.g. "DC-101"
  quoteId?: string;
  quoteNum: string;
  client: string;
  siteAddress: string;
  contactPhone?: string;
  dispatchDate: string;
  vehicleNumber: string;
  transporterName?: string;
  driverName?: string;
  driverPhone?: string;
  items: DeliveryChallanItem[];
  status: 'Preparing' | 'In-Transit' | 'Delivered' | 'Returned';
  paymentCollected?: number;
  paymentMode?: 'UPI' | 'NEFT / RTGS' | 'Cash' | 'Cheque';
  paymentRef?: string;
  recipientName?: string;
  deliveredAt?: string;
  notes?: string;
  branchId?: string;
  createdAt: string;
  createdBy?: string;
  // Automated Dedicated Person Allocation from Quote
  allocatedPerson?: string;
  allocatedPersonRole?: string;
  allocatedPersonPhone?: string;
  allocatedPersonEmail?: string;
  allocationSource?: 'quote_dedicated_person' | 'manual' | 'staff_override';
  batchSequence?: number;      // e.g. Shipment 1 of 3
  batchTotal?: number;
}

export interface QuotationDocument {
  quoteNum: string;
  name?: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Advance Received' | 'Dispatched' | 'Delivered' | 'Rejected' | 'Accepted & Paid';
  client: string;
  date: string;
  gst: number;
  items: QuotationItem[];
  showCode: boolean;
  showSpecs?: boolean;     // Legacy compatibility
  showBeam?: boolean;      // Beam Angle
  showCRI?: boolean;       // CRI
  showIP?: boolean;        // IP Rating
  showFinish?: boolean;    // Body Finish
  showReflector?: boolean; // Reflector Finish
  showDiscount: boolean;
  showBank: boolean;
  bankDetails?: {
    accName: string;
    accNo: string;
    bankName: string;
    ifsc: string;
    branch: string;
  };
  termsHTML?: string;
  branchId?: string;
  branch?: BranchProfile;
  payments?: QuotationPaymentRecord[];
  deliveryChallans?: string[];
  siteAddress?: string;
  clientPhone?: string;
  // Dedicated Person Assigned to Quote
  dedicatedPerson?: string;
  dedicatedPersonRole?: string;
  dedicatedPersonPhone?: string;
  dedicatedPersonEmail?: string;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface BranchProfile {
  id: string; // 'artelume' | 'lightcraft' | custom
  name: string; // e.g. 'ARTÈ LUME' or 'LIGHTCRAFT'
  tagline: string; // e.g. 'Architectural Lighting Studio' or 'Architectural & Commercial Lighting Co.'
  location: string; // e.g. 'Jubilee Hills • Hyderabad' or 'Dwaraka Nagar • Visakhapatnam (Vizag)'
  address: string; // Full address
  gstin: string; // GST number
  email: string;
  phone: string;
  quotePrefix: string; // 'AL' or 'LC'
  logoUrl?: string; // base64 / pasted image
  theme: {
    primaryColor: string; // e.g. '#7b3f22' vs '#16325c'
    accentColor: string;  // e.g. '#df9c20' vs '#0284c7'
    excelBannerColor: string; // 'FF7B3F22' vs 'FF16325C'
    excelAccentColor: string; // 'FFDF9C20' vs 'FF0284C7'
  };
  bankDetails: {
    accName: string;
    accNo: string;
    bankName: string;
    ifsc: string;
    branch: string;
  };
}

export interface BankTransaction {
  id: string;
  bankAccountId?: string;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  category: 'Client Payment' | 'Vendor Purchase' | 'Studio Expense' | 'Capital Deposit' | 'Transfer' | 'Other';
  mode: 'UPI' | 'NEFT / RTGS' | 'Cheque' | 'Card' | 'Cash Deposit' | 'Cash';
  referenceNo?: string;
  receiptNumber?: string;
  quoteNum?: string;
  client?: string;
  verified?: boolean;
  notes?: string;
  createdAt?: string;
}

export interface BankAccount {
  id?: string;
  name: string;
  acct: string;
  bal: number;
  ifsc?: string;
  branch?: string;
  transactions?: BankTransaction[];
}

export interface CustomerParty {
  id?: string;
  name: string;
  loc: string;
  phone?: string;
  email?: string;
}

export interface PurchaseBill {
  name: string;
  amt: number;
  date: string;
}

export interface ExpenseRecord {
  name: string;
  amt: number;
  date: string;
}

export interface CashEntry {
  name: string;
  amt: number;
  date: string;
}

export interface StudioNotification {
  id: string;
  type: 'quotation' | 'challan' | 'payment';
  actorName: string;
  actorRole?: string;
  title: string;
  description: string;
  timestamp: string;
  branchId?: string;
}
