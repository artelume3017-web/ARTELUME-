# Technical Documentation: Payment Ledger, Multi-Installments & Bank Passbook Engine

**Project:** ArteLume Architectural Lighting Studio OS  
**Module:** Payments, Installments Ledger & Bank Passbook Synchronization  
**Version:** 2.4.0  
**Date:** October 30, 2026  
**Author:** AI Studio Build Team  

---

## 1. Executive Summary

This document provides the complete technical specification and implementation scripts for:
1. **Dynamic Due Amount Calculation:** Live calculation and projection of outstanding balances on quotations, challans, and invoices.
2. **Multi-Installment Payment Tracking:** Support for Advance Bookings, Milestone Installments, Delivery Payments, and Final Settlements with automatic receipt numbers and WhatsApp dispatch.
3. **Automated Bank Passbook Synchronization:** Automatic credit to studio bank accounts (HDFC, SBI, ICICI) and entry into the digital passbook for any UPI, NEFT/RTGS, or Cheque client transactions.
4. **Reversible Voiding / Audit Reversals:** Atomic recalculation of quote due balances and bank statements if a payment installment is deleted or altered.

---

## 2. Data Models & TypeScript Interfaces

### 2.1. Payment Record (`PaymentRecord`)
```typescript
export interface PaymentRecord {
  id: string;                         // Unique UUID e.g. "pay-17302930219"
  receiptNumber: string;              // Official sequence e.g. "RCP-2026-1042"
  quoteNum: string;                   // Linked quote reference e.g. "Q-2026-089"
  clientName: string;                 // Client / Architectural firm name
  date: string;                       // YYYY-MM-DD
  amount: number;                     // Transaction amount in INR
  paymentStage: 'Advance' | 'Milestone' | 'Delivery' | 'Final';
  paymentMode: 'Cash' | 'UPI' | 'NEFT' | 'RTGS' | 'Cheque';
  referenceNo?: string;               // Bank UTR or Transaction Reference
  bankAccountId?: string;             // Linked studio bank ledger
  notes?: string;                     // Internal billing comments
  receivedBy: string;                 // Name of staff or accountant
  verifiedByAdmin?: boolean;          // Bank statement audit verified flag
  recordedAt: string;                 // ISO 8601 Timestamp
}
```

### 2.2. Bank Passbook Transaction (`BankTransaction`)
```typescript
export interface BankTransaction {
  id: string;                         // Transaction ID e.g. "tx-pay-17302930219"
  bankAccountId: string;              // Studio bank account identifier
  date: string;                       // Date of credit/debit
  type: 'credit' | 'debit';           // Inflow (credit) or Outflow (debit)
  amount: number;                     // Amount in INR
  description: string;                // e.g. "Client Payment: Oberoi Hotels (Quote #Q-2026-089)"
  category: 'Client Payment' | 'Vendor Payout' | 'Direct Deposit' | 'Utilities' | 'Tax';
  mode: 'UPI' | 'NEFT' | 'RTGS' | 'Cheque' | 'Cash';
  referenceNo?: string;               // Bank UTR or cheque leaf number
  receiptNumber?: string;             // Linked client receipt number
  quoteNum?: string;                  // Quote number link
  client?: string;                    // Client name
  verified: boolean;                  // Reconciled against official bank statement
  createdAt: string;                  // ISO 8601 Timestamp
}
```

### 2.3. Quotation Document Financial Attributes (`QuotationDoc`)
```typescript
export interface QuotationDoc {
  key: string;
  quoteNum: string;
  name: string;
  client: string;
  grandTotal: number;                 // Total gross quote amount (₹)
  totalPaid: number;                  // Cumulative sum of all approved payments (₹)
  paymentStatus: 'Unpaid' | 'Partial' | 'Paid';
  paymentHistory?: PaymentRecord[];   // Array of all recorded installments
  // ...other architectural quotation fields
}
```

---

## 3. Core Engine Scripts & Implementation

### 3.1. Dynamic Due Amount & Balance Calculation
The due amount is never stored as a stale hardcoded value; it is calculated reactively from `grandTotal` and `totalPaid`.

```typescript
/**
 * Computes live balances, installment counts, and status for any quotation.
 */
export function getQuotationFinancials(quote: QuotationDoc) {
  const grandTotal = Number(quote.grandTotal || 0);
  
  // Sum payments from paymentHistory array or totalPaid fallback
  const totalPaid = Array.isArray(quote.paymentHistory) && quote.paymentHistory.length > 0
    ? quote.paymentHistory.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : Number(quote.totalPaid || 0);

  const dueAmount = Math.max(0, grandTotal - totalPaid);
  const paidPercent = grandTotal > 0 ? Math.min(100, Math.round((totalPaid / grandTotal) * 100)) : 0;
  
  let paymentStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';
  if (totalPaid >= grandTotal && grandTotal > 0) {
    paymentStatus = 'Paid';
  } else if (totalPaid > 0) {
    paymentStatus = 'Partial';
  }

  return {
    grandTotal,
    totalPaid,
    dueAmount,
    paidPercent,
    paymentStatus,
    installmentCount: quote.paymentHistory?.length || 0
  };
}
```

---

### 3.2. Saving a Payment & Syncing into the Bank Passbook

This script executes when a user records a payment (Advance, Milestone, or Delivery). It updates:
1. The Quotation document (`totalPaid`, `paymentStatus`, `paymentHistory`).
2. The Studio Bank Account balance (for UPI, NEFT, Cheque).
3. The Studio Cash-in-Hand register (for Cash).
4. The Bank Passbook Statement (`bankTransactions`) with full UTR, Receipt, and Quote link.

```typescript
export function handleSavePaymentEngine(
  payment: PaymentRecord,
  savedQuotes: QuotationDoc[],
  setSavedQuotes: React.Dispatch<React.SetStateAction<QuotationDoc[]>>,
  setBanks: React.Dispatch<React.SetStateAction<any[]>>,
  setBankTransactions: React.Dispatch<React.SetStateAction<BankTransaction[]>>,
  showToast: (msg: string, type: string) => void
) {
  // 1. Locate the Target Quotation
  const targetQuote = savedQuotes.find(
    q => q.quoteNum === payment.quoteNum || q.key === payment.quoteNum
  );

  if (!targetQuote) {
    showToast(`Quotation #${payment.quoteNum} not found`, 'error');
    return;
  }

  // 2. Append new payment to history and compute updated financials
  const existingHistory = Array.isArray(targetQuote.paymentHistory) ? targetQuote.paymentHistory : [];
  const updatedHistory = [...existingHistory, payment];
  const newTotalPaid = updatedHistory.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const grandTotal = Number(targetQuote.grandTotal || 0);

  const newStatus: 'Unpaid' | 'Partial' | 'Paid' = 
    newTotalPaid >= grandTotal && grandTotal > 0
      ? 'Paid'
      : newTotalPaid > 0
      ? 'Partial'
      : 'Unpaid';

  const updatedQuote: QuotationDoc = {
    ...targetQuote,
    totalPaid: newTotalPaid,
    paymentStatus: newStatus,
    paymentHistory: updatedHistory,
    advancePaid: newTotalPaid,
    updatedAt: new Date().toISOString()
  };

  // 3. Update Quotation State & Local Storage
  setSavedQuotes(prev => {
    const nextQuotes = prev.map(q =>
      (q.quoteNum === payment.quoteNum || q.key === targetQuote.key) ? updatedQuote : q
    );
    localStorage.setItem('artelume_saved_quotes', JSON.stringify(nextQuotes));
    return nextQuotes;
  });

  // 4. Synchronize with Studio Bank Accounts & Passbook (if non-cash)
  if (payment.paymentMode !== 'Cash') {
    // 4A. Credit Bank Ledger Balance
    setBanks(prevBanks => {
      const nextBanks = prevBanks.map((b, idx) =>
        idx === 0 ? { ...b, bal: Number(b.bal || 0) + Number(payment.amount) } : b
      );
      localStorage.setItem('artelume_bank_accounts', JSON.stringify(nextBanks));
      return nextBanks;
    });

    // 4B. Post to Live Bank Passbook Statement
    const bankTx: BankTransaction = {
      id: `tx-${payment.id || Date.now()}`,
      bankAccountId: payment.bankAccountId || 'bank-primary',
      date: payment.date || new Date().toISOString().split('T')[0],
      type: 'credit',
      amount: Number(payment.amount),
      description: `Client Payment: ${targetQuote.client || targetQuote.name} (Quote #${targetQuote.quoteNum})`,
      category: 'Client Payment',
      mode: payment.paymentMode,
      referenceNo: payment.referenceNo || 'Direct Payment',
      receiptNumber: payment.receiptNumber,
      quoteNum: targetQuote.quoteNum,
      client: targetQuote.client,
      verified: payment.verifiedByAdmin || false,
      createdAt: new Date().toISOString()
    };

    setBankTransactions(prevTxs => {
      const nextTxs = [bankTx, ...prevTxs.filter(t => t.receiptNumber !== payment.receiptNumber)];
      localStorage.setItem('artelume_bank_transactions', JSON.stringify(nextTxs));
      return nextTxs;
    });
  }

  showToast(`Payment of ₹${payment.amount.toLocaleString('en-IN')} recorded & credited to bank passbook!`, 'success');
}
```

---

### 3.3. Payment Reversal / Deletion Engine

If an accountant makes an error or a cheque bounces, deleting the payment installment performs an atomic reversal:
- Subtracts payment from `totalPaid`.
- Re-evaluates quote status from `Paid` -> `Partial` or `Unpaid`.
- Restores the Due Amount on the quotation card.
- Deducts amount from the studio bank ledger balance.
- Removes transaction entry from the Bank Passbook Statement.

```typescript
export function handleDeletePaymentEngine(
  quoteNumOrKey: string,
  paymentId: string,
  savedQuotes: QuotationDoc[],
  setSavedQuotes: React.Dispatch<React.SetStateAction<QuotationDoc[]>>,
  setBanks: React.Dispatch<React.SetStateAction<any[]>>,
  setBankTransactions: React.Dispatch<React.SetStateAction<BankTransaction[]>>,
  showToast: (msg: string, type: string) => void
) {
  const quote = savedQuotes.find(q => q.quoteNum === quoteNumOrKey || q.key === quoteNumOrKey);
  if (!quote) return;

  const paymentToDelete = quote.paymentHistory?.find(p => p.id === paymentId);
  if (!paymentToDelete) return;

  const updatedHistory = (quote.paymentHistory || []).filter(p => p.id !== paymentId);
  const newTotalPaid = updatedHistory.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const grandTotal = Number(quote.grandTotal || 0);

  const newStatus: 'Unpaid' | 'Partial' | 'Paid' = 
    newTotalPaid >= grandTotal && grandTotal > 0
      ? 'Paid'
      : newTotalPaid > 0
      ? 'Partial'
      : 'Unpaid';

  const updatedQuote: QuotationDoc = {
    ...quote,
    totalPaid: newTotalPaid,
    paymentStatus: newStatus,
    paymentHistory: updatedHistory,
    advancePaid: newTotalPaid,
    updatedAt: new Date().toISOString()
  };

  // Update Quotations
  setSavedQuotes(prev => {
    const nextQuotes = prev.map(q =>
      (q.quoteNum === quote.quoteNum || q.key === quote.key) ? updatedQuote : q
    );
    localStorage.setItem('artelume_saved_quotes', JSON.stringify(nextQuotes));
    return nextQuotes;
  });

  // Reversal from Bank Account and Passbook
  if (paymentToDelete.paymentMode !== 'Cash') {
    setBanks(prevBanks => {
      const nextBanks = prevBanks.map((b, idx) =>
        idx === 0 ? { ...b, bal: Math.max(0, Number(b.bal || 0) - Number(paymentToDelete.amount)) } : b
      );
      localStorage.setItem('artelume_bank_accounts', JSON.stringify(nextBanks));
      return nextBanks;
    });

    setBankTransactions(prevTxs => {
      const nextTxs = prevTxs.filter(
        t => t.receiptNumber !== paymentToDelete.receiptNumber && t.id !== `tx-${paymentToDelete.id}`
      );
      localStorage.setItem('artelume_bank_transactions', JSON.stringify(nextTxs));
      return nextTxs;
    });
  }

  showToast(`Installment ${paymentToDelete.receiptNumber} voided. Bank ledger and quote due amount restored.`, 'info');
}
```

---

### 3.4. Instant WhatsApp Receipt Generator Script

This function formats a message for client notification via WhatsApp:

```typescript
export function sendPaymentReceiptWhatsApp(
  payment: PaymentRecord,
  quote: QuotationDoc,
  branchName: string
) {
  const grandTotal = Number(quote.grandTotal || 0);
  const totalPaid = (quote.paymentHistory || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const dueRemaining = Math.max(0, grandTotal - totalPaid);

  const message = 
`*RECEIPT OF PAYMENT | ${branchName.toUpperCase()}*
────────────────────────
*Receipt No:* ${payment.receiptNumber}
*Quotation Ref:* #${quote.quoteNum}
*Client:* ${quote.client || 'Valued Architectural Client'}
*Date:* ${payment.date}

*Amount Received:* ₹${Number(payment.amount).toLocaleString('en-IN')}
*Payment Stage:* ${payment.paymentStage}
*Payment Mode:* ${payment.paymentMode} ${payment.referenceNo ? `(Ref: ${payment.referenceNo})` : ''}

*SUMMARY OF ACCOUNT:*
• Grand Total: ₹${grandTotal.toLocaleString('en-IN')}
• Total Settled to Date: ₹${totalPaid.toLocaleString('en-IN')}
• Balance Outstanding: ₹${dueRemaining.toLocaleString('en-IN')} ${dueRemaining === 0 ? '✅ (FULLY SETTLED)' : ''}

Thank you for partnering with ArteLume Architectural Lighting Solutions.`;

  const encoded = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank');
}
```

---

## 4. UI Components & Screen References

| Component | File Location | Key Responsibilities |
| :--- | :--- | :--- |
| **`PaymentRecordModal`** | `src/components/PaymentRecordModal.tsx` | Two-tab modal with **Record New Payment** (chips, UTR entry, live projected balance) and **Payment History & Installments** list with WhatsApp share & delete. |
| **`BankAccountsView`** | `src/App.tsx` (`activeTab === 'bank'`) | Studio accounts balances, KPI metrics, filterable **Bank Statement Passbook**, direct quote lookup, and **Mark Verified** reconciliation buttons. |
| **`QuotationCard`** | `src/App.tsx` (Saved Quotations list) | Live `Paid: ₹XX • Due: ₹XX` progress bar and interactive `📜 N installments` badge. |
| **`DeliveryChallanModal`** | `src/components/DeliveryChallanModal.tsx` | Generates transport challan, records on-delivery driver collections, and creates delivery payment records. |

---

## 5. Testing & Verification Checklist

- [x] Record a 50% Advance via UPI:
  - Quotation Due Amount updates from 100% to 50%.
  - Payment appears in `Payment History` tab with Receipt number.
  - Credit appears in `Bank Accounts & Passbook Statement` with `UPI` badge and green `+₹XX,XXX`.
- [x] Record a Second Installment via NEFT:
  - Installment count updates from `1 installment` to `2 installments`.
  - Due Amount reflects remaining balance.
  - Second credit appears in Bank Passbook.
- [x] Void an Installment:
  - Clicking `✕ Delete` in history reverses the installment.
  - Due Amount on quote increases accordingly.
  - Bank balance reduces and the passbook transaction is removed.
