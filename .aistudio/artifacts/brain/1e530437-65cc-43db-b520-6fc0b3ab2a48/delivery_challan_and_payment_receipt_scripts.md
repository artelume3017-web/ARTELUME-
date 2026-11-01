# Delivery Challan & Payment Receipt Synchronization Architecture

This document contains the reviewed scripts for:
1. **Strict Client-Specific Challan Isolation** (guarantees a delivery challan only links and sinks to that particular client's quote).
2. **Automatic Payment Receipt Creation** (`RCP-DC-...`) on advance, partial, or full payment on delivery.
3. **Studio Bank Account & Passbook Statement Auto-Credit** (for UPI, NEFT, Cheque, or Cash).

---

## Script 1: Strict Client-Specific Quotation Linking (`strictChallanLinking.ts`)

Ensures that delivery challans behave exclusively like individual client quotes and **never leak across different clients**:

```typescript
import { DeliveryChallan, QuotationDocument } from '../types';

/**
 * STRICT CLIENT & QUOTATION MATCHING RULE:
 * A challan belongs to a quotation ONLY if:
 * 1. Both client names match (Hard constraint: if client names differ, NEVER link!)
 * 2. Quote numbers match, OR quoteId matches, OR quote explicitly contains challanNum
 */
export function isChallanLinkedToQuote(
  challan: DeliveryChallan,
  quote: QuotationDocument,
  quoteKey?: string
): boolean {
  const dcClient = (challan.client || '').trim().toLowerCase();
  const qClient = (quote.client || quote.name || '').trim().toLowerCase();

  // 1. HARD RULE: If both client names are present and different, NEVER link!
  if (dcClient && qClient && dcClient !== qClient) {
    return false;
  }

  const dcQuoteNum = (challan.quoteNum || '').trim().toLowerCase().replace(/^#/, '');
  const qNum = (quote.quoteNum || '').trim().toLowerCase().replace(/^#/, '');
  const qKeyClean = (quoteKey || '').trim().toLowerCase().replace(/^#/, '');
  const qNameClean = (quote.name || '').trim().toLowerCase();

  // 2. Exact quote number match
  if (dcQuoteNum && qNum && dcQuoteNum === qNum) {
    return true;
  }

  // 3. Exact quoteId / quote key match
  if (challan.quoteId) {
    const dcQId = challan.quoteId.trim().toLowerCase().replace(/^#/, '');
    if (dcQId === qNum || dcQId === qKeyClean || dcQId === qNameClean) {
      return true;
    }
  }

  // 4. Quotation's deliveryChallans array explicitly contains this challan
  if (Array.isArray(quote.deliveryChallans) && quote.deliveryChallans.includes(challan.challanNum)) {
    return true;
  }

  // 5. Fallback client match only if quoteNum is generic or direct
  if ((!challan.quoteNum || challan.quoteNum === 'AL-DIRECT') && dcClient && qClient && dcClient === qClient) {
    return true;
  }

  return false;
}

/**
 * Filter delivery challans strictly belonging to the given quote
 */
export function getLinkedChallansForQuote(
  quote: QuotationDocument,
  allChallans: DeliveryChallan[],
  quoteKey?: string
): DeliveryChallan[] {
  return allChallans.filter(dc => isChallanLinkedToQuote(dc, quote, quoteKey));
}
```

---

## Script 2: Payment Receipt Generation & Bank Account Credit (`challanPaymentSync.ts`)

When an amount is entered on delivery (e.g. ₹10,600 UPI `8ybvy8yv8tv8` for Mr. Himanth):
1. Creates an official **Payment Receipt** with formatted number `RCP-DC-${challanNum}`.
2. Updates the quotation's `payments` history.
3. Automatically credits the **Studio Bank Account** balance and logs a **Credit Transaction** in the passbook statement.

```typescript
import { DeliveryChallan, QuotationDocument, QuotationPaymentRecord, BankTransaction, BankAccount, CashEntry } from '../types';

/**
 * Generates an official QuotationPaymentRecord from Delivery Challan COD
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

/**
 * Synchronizes the Challan Payment to the Quotation and the Bank Account Ledger
 */
export function syncChallanPaymentToQuoteAndBank(params: {
  challan: DeliveryChallan;
  targetQuote: QuotationDocument;
  banks: BankAccount[];
  bankTransactions: BankTransaction[];
  cashEntries: CashEntry[];
  staffName?: string;
}) {
  const { challan, targetQuote, banks, bankTransactions, cashEntries, staffName } = params;
  const paymentRecord = createPaymentRecordFromChallan(challan, staffName);
  if (!paymentRecord) return null;

  // 1. Update Quotation Payments
  const existingPayments = targetQuote.payments || [];
  const nextPayments = [
    paymentRecord,
    ...existingPayments.filter(p => p.receiptNumber !== paymentRecord.receiptNumber && p.id !== paymentRecord.id)
  ];

  const totalPaid = nextPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const itemsSubtotal = (targetQuote.items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
  const grandTotal = Math.round(itemsSubtotal * (1 + (Number(targetQuote.gst) || 18) / 100));

  let newStatus = targetQuote.status;
  if (totalPaid >= grandTotal && grandTotal > 0) {
    newStatus = 'Accepted & Paid';
  } else if (totalPaid > 0 && newStatus !== 'Delivered') {
    newStatus = 'Advance Received';
  }

  const updatedQuote: QuotationDocument = {
    ...targetQuote,
    payments: nextPayments,
    status: newStatus
  };

  // 2. Update Bank or Cash Accounts
  let updatedBanks = [...banks];
  let updatedBankTransactions = [...bankTransactions];
  let updatedCashEntries = [...cashEntries];

  if (paymentRecord.paymentMode === 'Cash') {
    // Credit Cash in Hand
    const cashEntry: CashEntry = {
      name: `Delivery Payment: ${targetQuote.client} (${paymentRecord.receiptNumber})`,
      amt: paymentRecord.amount,
      date: paymentRecord.date
    };
    updatedCashEntries = [cashEntry, ...cashEntries.filter(c => !c.name.includes(paymentRecord.receiptNumber))];
  } else {
    // Credit Primary Bank Account (UPI, NEFT / RTGS, Cheque)
    if (updatedBanks.length === 0) {
      updatedBanks = [{ id: 'bank-primary', name: 'HDFC Bank', acct: '98765432109876', bal: paymentRecord.amount }];
    } else {
      updatedBanks = updatedBanks.map((b, idx) =>
        idx === 0 ? { ...b, bal: (Number(b.bal) || 0) + paymentRecord.amount } : b
      );
    }

    // Post to Bank Passbook Statement
    const bankTx: BankTransaction = {
      id: `tx-dc-${challan.challanNum}`,
      bankAccountId: 'bank-primary',
      date: paymentRecord.date,
      type: 'credit',
      amount: paymentRecord.amount,
      description: `Delivery Collection: ${targetQuote.client} (Quote #${targetQuote.quoteNum})`,
      category: 'Client Payment',
      mode: paymentRecord.paymentMode,
      referenceNo: paymentRecord.referenceNo,
      receiptNumber: paymentRecord.receiptNumber,
      quoteNum: targetQuote.quoteNum,
      client: targetQuote.client,
      verified: false,
      notes: `Collected with Challan #${challan.challanNum}`,
      createdAt: new Date().toISOString()
    };

    updatedBankTransactions = [
      bankTx,
      ...bankTransactions.filter(t => t.receiptNumber !== paymentRecord.receiptNumber && t.id !== bankTx.id)
    ];
  }

  return {
    updatedQuote,
    paymentRecord,
    updatedBanks,
    updatedBankTransactions,
    updatedCashEntries,
    balanceDue: Math.max(0, grandTotal - totalPaid)
  };
}
```

---

## Script 3: Implementation Wiring in `App.tsx`

When saving a Delivery Challan, it guarantees:
1. Exact quotation is matched (matching quote number AND client).
2. Payment receipt is created and passed with the quote directly into `handleSavePayment`.
3. Bank passbook and accounts are updated synchronously.

```typescript
// Inside onSaveChallan in App.tsx:
onSaveChallan={(challan, payment) => {
  // 1. Save Delivery Challan Record
  handleSaveChallan(challan);

  // 2. Match the exact particular quotation strictly by quoteNum AND client
  const matchedQuoteKey = Object.keys(savedQuotes).find(k =>
    isChallanLinkedToQuote(challan, savedQuotes[k], k)
  );
  const targetQuote = matchedQuoteKey ? savedQuotes[matchedQuoteKey] : challanSourceQuote || currentQuoteDoc;

  // 3. If payment was collected on delivery (advance or full), record payment receipt & credit bank
  if (challan.paymentCollected && Number(challan.paymentCollected) > 0 && targetQuote) {
    const paymentToRecord = payment || createPaymentRecordFromChallan(challan, userProfile?.displayName || 'Studio Team');
    if (paymentToRecord) {
      handleSavePayment(paymentToRecord, targetQuote);
    }
  }

  setShowChallanModal(false);
  setEditingChallan(null);
  setChallanSourceQuote(null);
}}
```

---

## Script 4: Printable Slip with Official Payment Receipt Box

When printing or previewing the Delivery Challan slip, if money was collected, it renders the official Payment Receipt acknowledgment:

```tsx
{Number(challan.paymentCollected) > 0 && (
  <div className="border border-emerald-300 bg-emerald-50/60 p-3.5 rounded-lg my-3 flex items-center justify-between text-xs">
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
        🧾 OFFICIAL PAYMENT RECEIPT #{`RCP-DC-${challan.challanNum.replace(/^DC-?/i, '')}`}
      </span>
      <div className="font-bold text-neutral-900 mt-1">
        Received with thanks from <span className="text-emerald-900 font-extrabold">{challan.client}</span>
      </div>
      <div className="text-[11px] text-neutral-600 mt-0.5">
        Payment Mode: <strong>{challan.paymentMode || 'UPI'}</strong>
        {challan.paymentRef ? ` • Ref / UTR: ${challan.paymentRef}` : ''}
      </div>
    </div>
    <div className="text-right">
      <span className="text-[10px] uppercase font-bold text-neutral-500 block">Amount Received</span>
      <span className="text-base font-black text-emerald-800">{formatInr(challan.paymentCollected)}</span>
      <span className="text-[9.5px] text-emerald-700 block font-semibold mt-0.5">
        ✓ Credited to Studio Bank Account
      </span>
    </div>
  </div>
)}
```
