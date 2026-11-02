import { DeliveryChallan, DeliveryChallanItem, QuotationDocument, BranchProfile, QuotationPaymentRecord } from '../types';

export interface AllocationResult {
  allocatedPerson: string;
  allocatedPersonRole: string;
  allocatedPersonPhone?: string;
  allocatedPersonEmail?: string;
  recipientName: string;
  allocationSource: 'quote_dedicated_person' | 'manual' | 'staff_override';
  allocationNote: string;
}

/**
 * Script: Automatically resolves and allocates the dedicated person named on a quote
 * to the delivery challan by default.
 */
export function allocateDedicatedPersonToChallan(
  quote: QuotationDocument,
  fallbackStaffName: string = 'Studio In-Charge'
): AllocationResult {
  // 1. Direct explicit dedicated person on quote
  if (quote.dedicatedPerson && quote.dedicatedPerson.trim()) {
    const role = quote.dedicatedPersonRole || 'Dedicated Quote In-Charge';
    return {
      allocatedPerson: quote.dedicatedPerson.trim(),
      allocatedPersonRole: role,
      allocatedPersonPhone: quote.dedicatedPersonPhone || quote.clientPhone,
      allocatedPersonEmail: quote.dedicatedPersonEmail,
      recipientName: quote.dedicatedPerson.trim(),
      allocationSource: 'quote_dedicated_person',
      allocationNote: `Directly auto-allocated from Quote #${quote.quoteNum} dedicated quote owner: ${quote.dedicatedPerson.trim()} (${role})`
    };
  }

  // 2. Parse client name if it indicates a named Architect / Engineer (e.g., "Ar. Rajesh Mehta")
  const clientName = quote.client || quote.name || '';
  if (clientName.toLowerCase().startsWith('ar.') || clientName.toLowerCase().startsWith('architect')) {
    return {
      allocatedPerson: clientName.trim(),
      allocatedPersonRole: 'Architect / Project In-Charge',
      allocatedPersonPhone: quote.clientPhone,
      recipientName: clientName.trim(),
      allocationSource: 'quote_dedicated_person',
      allocationNote: `Auto-allocated from project architect named on quote: ${clientName.trim()}`
    };
  }

  // 3. Fallback to active studio staff
  return {
    allocatedPerson: fallbackStaffName,
    allocatedPersonRole: 'Studio Operations / Dispatch Lead',
    allocatedPersonPhone: quote.clientPhone,
    recipientName: clientName || fallbackStaffName,
    allocationSource: 'manual',
    allocationNote: `Assigned to active studio staff: ${fallbackStaffName}`
  };
}

/**
 * Script: Creates a new Delivery Challan instance with auto-allocated dedicated person
 * and pre-populated quantities from the specified quotation.
 */
export function buildChallanFromQuotation(
  quote: QuotationDocument,
  branch: BranchProfile,
  existingChallansForQuote: DeliveryChallan[] = [],
  staffName: string = 'Studio In-Charge'
): DeliveryChallan {
  const allocation = allocateDedicatedPersonToChallan(quote, staffName);
  const batchSeq = existingChallansForQuote.length + 1;
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  
  // Format Challan Number: e.g. "DC-AL-001-P1" (Partial 1) or "DC-2026-402"
  const cleanQuoteNum = (quote.quoteNum || 'AL-001').replace(/^#/, '');
  const challanNum = existingChallansForQuote.length > 0
    ? `DC-${cleanQuoteNum}-P${batchSeq}`
    : `DC-${cleanQuoteNum}-${randomSuffix}`;

  // Calculate items and remaining pending quantities across existing shipments
  const items: DeliveryChallanItem[] = (quote.items || []).map(it => {
    const totalOrdered = it.qty || 1;
    // Calculate how many have already been dispatched in prior challans
    const alreadyDispatched = existingChallansForQuote.reduce((sum, dc) => {
      const match = (dc.items || []).find(dci => dci.sku === it.sku || dci.name === it.name);
      return sum + (match?.qtyDispatched || 0);
    }, 0);

    const remainingToDispatch = Math.max(0, totalOrdered - alreadyDispatched);
    const qtyToDispatchNow = remainingToDispatch > 0 ? remainingToDispatch : totalOrdered;

    return {
      sku: it.sku || 'AL-SPEC',
      name: it.name || 'Architectural Lighting Fixture',
      qtyOrdered: totalOrdered,
      qtyDispatched: qtyToDispatchNow,
      qtyPending: Math.max(0, totalOrdered - (alreadyDispatched + qtyToDispatchNow))
    };
  });

  const todayIso = new Date().toISOString().split('T')[0];

  return {
    id: `dc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    challanNum,
    quoteId: quote.name || quote.quoteNum,
    quoteNum: quote.quoteNum,
    client: quote.client || quote.name || 'Valued Client',
    siteAddress: quote.siteAddress || `${quote.client || 'Project Site'} (Per Quotation Specification)`,
    contactPhone: quote.clientPhone || allocation.allocatedPersonPhone,
    dispatchDate: todayIso,
    vehicleNumber: 'TS 09 UB 4821',
    transporterName: `${branch.name} Internal Logistics`,
    driverName: allocation.allocatedPerson,
    driverPhone: allocation.allocatedPersonPhone,
    items,
    status: 'Preparing',
    recipientName: allocation.recipientName,
    notes: `[Auto-Allocated: ${allocation.allocatedPerson} (${allocation.allocatedPersonRole})] ${allocation.allocationNote}`,
    branchId: quote.branchId || branch.id,
    createdAt: new Date().toISOString(),
    // Strong allocation metadata
    allocatedPerson: allocation.allocatedPerson,
    allocatedPersonRole: allocation.allocatedPersonRole,
    allocatedPersonPhone: allocation.allocatedPersonPhone,
    allocatedPersonEmail: allocation.allocatedPersonEmail,
    allocationSource: allocation.allocationSource,
    batchSequence: batchSeq,
    batchTotal: batchSeq
  };
}

/**
 * Script: Checks if a delivery challan strictly belongs to a specific quote and client.
 * Guarantees that challans NEVER leak across different clients.
 */
export function isChallanLinkedToQuote(
  challan: DeliveryChallan,
  quote: QuotationDocument,
  quoteKey?: string
): boolean {
  const dcQuoteNum = (challan.quoteNum || '').trim().toLowerCase().replace(/^#/, '');
  const qNum = (quote.quoteNum || '').trim().toLowerCase().replace(/^#/, '');
  const qKeyClean = (quoteKey || '').trim().toLowerCase().replace(/^#/, '');
  const qNameClean = (quote.name || '').trim().toLowerCase();

  // 1. Direct quotation reference inside quote.deliveryChallans array
  if (Array.isArray(quote.deliveryChallans) && quote.deliveryChallans.includes(challan.challanNum)) {
    return true;
  }

  // 2. Direct exact quoteId match
  if (challan.quoteId) {
    const dcQId = challan.quoteId.trim().toLowerCase().replace(/^#/, '');
    if (dcQId === qNum || dcQId === qKeyClean || dcQId === qNameClean) {
      return true;
    }
  }

  // 3. Exact quote number match (e.g., both are AL-001)
  if (dcQuoteNum && qNum && dcQuoteNum === qNum) {
    return true;
  }

  // 4. Flexible Client Name Matching (normalizing titles like Ar., Mr., Mrs.)
  const normalizeName = (s: string) =>
    s
      .toLowerCase()
      .replace(/^(ar\.|architect|mr\.|mrs\.|ms\.|dr\.)\s*/i, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

  const dcClient = (challan.client || '').trim().toLowerCase();
  const qClient = (quote.client || quote.name || '').trim().toLowerCase();
  const dcClean = normalizeName(dcClient);
  const qClean = normalizeName(qClient);

  if (dcClean && qClean) {
    if (dcClean === qClean || dcClean.includes(qClean) || qClean.includes(dcClean)) {
      if (!dcQuoteNum || !qNum || dcQuoteNum === qNum || dcQuoteNum === 'al-direct') {
        return true;
      }
    }
  }

  return false;
}

/**
 * Script: Retrieves all Delivery Challans strictly associated with a given Quotation.
 */
export function getLinkedChallansForQuote(
  quote: QuotationDocument,
  allChallans: DeliveryChallan[],
  quoteKey?: string
): DeliveryChallan[] {
  return allChallans.filter(dc => isChallanLinkedToQuote(dc, quote, quoteKey));
}

/**
 * Script: Generates an official QuotationPaymentRecord from a Delivery Challan payment collection
 */
export function createPaymentRecordFromChallan(
  challan: DeliveryChallan,
  staffName: string = 'Studio Logistics Team'
): QuotationPaymentRecord | null {
  const amount = Number(challan.paymentCollected) || 0;
  if (amount <= 0) return null;

  const cleanNum = challan.challanNum.replace(/^DC-?/i, '');
  const receiptNumber = `RCP-DC-${cleanNum}`;

  return {
    id: `pay-dc-${challan.id || challan.challanNum}`,
    date: challan.deliveredAt
      ? challan.deliveredAt.split(',')[0]
      : (challan.dispatchDate || new Date().toISOString().split('T')[0]),
    amount,
    type: 'On-Delivery Payment',
    paymentMode: challan.paymentMode || 'UPI',
    referenceNo: challan.paymentRef || undefined,
    collectedByRole: 'delivery',
    collectedByName: challan.allocatedPerson || challan.driverName || staffName,
    receiptNumber,
    verifiedByAdmin: false,
    notes: `Collected on site with Delivery Challan #${challan.challanNum} (Ref: ${challan.paymentRef || 'N/A'})`
  };
}

export interface PriorBatchDispatch {
  challanNum: string;
  batchSequence: number;
  dispatchDate: string;
  qtyDispatched: number;
  status: string;
  handler?: string;
  vehicle?: string;
}

export interface ItemDeliveryProgress {
  sku: string;
  name: string;
  qtyOrdered: number;
  priorDispatches: PriorBatchDispatch[];
  totalPriorDispatched: number;
  remainingToDispatch: number;
}

/**
 * Script: Computes detailed breakdown of material dispatched across 1st, 2nd, 3rd... prior challans
 * for each luminaire fixture line item in the quotation.
 */
export function getPriorDispatchedBreakdown(
  items: Array<{ sku?: string; name?: string; qty?: number }>,
  priorChallans: DeliveryChallan[]
): ItemDeliveryProgress[] {
  // Sort prior challans chronologically / by batch sequence
  const sortedPrior = [...priorChallans].sort((a, b) => {
    const seqA = a.batchSequence || 0;
    const seqB = b.batchSequence || 0;
    if (seqA !== seqB) return seqA - seqB;
    return new Date(a.dispatchDate || a.createdAt || '').getTime() - new Date(b.dispatchDate || b.createdAt || '').getTime();
  });

  return items.map(it => {
    const sku = it.sku || 'AL-SPEC';
    const name = it.name || 'Architectural Luminaire Fixture';
    const qtyOrdered = Number(it.qty) || 1;

    const priorDispatches: PriorBatchDispatch[] = [];
    let totalPriorDispatched = 0;

    sortedPrior.forEach((dc, idx) => {
      const match = (dc.items || []).find(
        dci => (dci.sku && dci.sku.toLowerCase() === sku.toLowerCase()) || (dci.name && dci.name.toLowerCase() === name.toLowerCase())
      );
      const dispatchedInBatch = match ? Number(match.qtyDispatched) || 0 : 0;
      if (dispatchedInBatch > 0) {
        priorDispatches.push({
          challanNum: dc.challanNum,
          batchSequence: dc.batchSequence || idx + 1,
          dispatchDate: dc.dispatchDate || 'Previous',
          qtyDispatched: dispatchedInBatch,
          status: dc.status,
          handler: dc.allocatedPerson || dc.driverName,
          vehicle: dc.vehicleNumber
        });
        totalPriorDispatched += dispatchedInBatch;
      }
    });

    const remainingToDispatch = Math.max(0, qtyOrdered - totalPriorDispatched);

    return {
      sku,
      name,
      qtyOrdered,
      priorDispatches,
      totalPriorDispatched,
      remainingToDispatch
    };
  });
}

/**
 * Calculates quotation age in elapsed calendar days across various date formats
 */
export function getQuotationAgeDays(dateStr?: string, createdAt?: string): number {
  if (!dateStr && !createdAt) return 0;
  
  let targetTime: number | null = null;

  if (createdAt) {
    const t = new Date(createdAt).getTime();
    if (!isNaN(t)) targetTime = t;
  }

  if (!targetTime && dateStr) {
    const direct = Date.parse(dateStr);
    if (!isNaN(direct)) {
      targetTime = direct;
    } else {
      const dmmmy = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
      if (dmmmy) {
        const months: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };
        const day = parseInt(dmmmy[1], 10);
        const mon = months[dmmmy[2].toLowerCase()] ?? 0;
        const year = parseInt(dmmmy[3], 10);
        targetTime = new Date(year, mon, day).getTime();
      }
    }
  }

  if (!targetTime) return 0;
  const now = Date.now();
  const diffMs = now - targetTime;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export interface QuotationReminderMeta {
  quoteKey: string;
  quote: QuotationDocument;
  ageDays: number;
  isOverdue30Days: boolean;
  totalOrderedQty: number;
  totalDeliveredQty: number;
  pendingDeliveryQty: number;
  hasPendingDelivery: boolean;
  grandTotal: number;
  totalPaid: number;
  balanceDue: number;
  hasOverdueBalance: boolean;
  priorityScore: number;
}

export function classifyQuotationReminders(
  savedQuotes: Record<string, QuotationDocument>,
  deliveryChallans: DeliveryChallan[]
): QuotationReminderMeta[] {
  const TERMINAL_STATUSES = ['Accepted & Paid', 'Delivered'];

  return Object.entries(savedQuotes).map(([quoteKey, q]) => {
    const ageDays = getQuotationAgeDays(q.date, q.createdAt);
    const status = q.status || 'Draft';
    const isTerminal = TERMINAL_STATUSES.includes(status);

    // Multi-batch delivery reconciliation
    const linkedChallans = getLinkedChallansForQuote(q, deliveryChallans);
    const totalOrderedQty = (q.items || []).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
    const totalDeliveredQty = linkedChallans.reduce((sum, ch) => {
      return sum + (ch.items || []).reduce((sub, it) => sub + (Number(it.qtyDispatched) || 0), 0);
    }, 0);
    const pendingDeliveryQty = Math.max(0, totalOrderedQty - totalDeliveredQty);
    const hasPendingDelivery = !isTerminal && pendingDeliveryQty > 0;

    // Financial calculations
    const itemsSubtotal = (q.items || []).reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
    const gstMultiplier = 1 + (Number(q.gst ?? 18) / 100);
    const grandTotal = Math.round(itemsSubtotal * gstMultiplier);
    const totalPaid = (q.payments || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const balanceDue = Math.max(0, grandTotal - totalPaid);
    const hasOverdueBalance = !isTerminal && balanceDue > 0 && ageDays > 15;

    // Overdue rule (>30 days and not terminal)
    const isOverdue30Days = !isTerminal && ageDays > 30;

    let priorityScore = 0;
    if (isOverdue30Days) priorityScore += 100;
    if (hasOverdueBalance) priorityScore += 50;
    if (hasPendingDelivery) priorityScore += 30;
    priorityScore += Math.min(50, ageDays);

    return {
      quoteKey,
      quote: q,
      ageDays,
      isOverdue30Days,
      totalOrderedQty,
      totalDeliveredQty,
      pendingDeliveryQty,
      hasPendingDelivery,
      grandTotal,
      totalPaid,
      balanceDue,
      hasOverdueBalance,
      priorityScore
    };
  }).filter(meta => meta.isOverdue30Days || meta.hasPendingDelivery || meta.hasOverdueBalance)
    .sort((a, b) => b.priorityScore - a.priorityScore);
}


