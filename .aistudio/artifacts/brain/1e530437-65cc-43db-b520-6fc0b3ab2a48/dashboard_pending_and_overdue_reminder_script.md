# Dashboard Reminder System, 'Pending & Overdue' Panel & Action Buttons: Complete Scripts

## Summary of Confirmed Choices
1. **Quotation Card Action Structure**:
   - **Top 3 Exterior Actions**: `✏️ Edit`, `💳 Payment`, `🚚 Challan`, and `📂 More Options`.
   - **Inside '📂 More Options' Modal**: `👁️ Preview PDF`, `🖨️ Download PDF`, `📗 Save Excel (.xlsx)`, `🔗 Copy Client Share Link`, and `🗑️ Delete Quotation`.
2. **'Notify Client' Follow-up Launcher**:
   - Dual-channel modal with toggle tabs for **Email (`mailto:`)** and **WhatsApp (`wa.me`)**.
   - Auto-generated professional copy with quote number, age/date, balance due, delivery items count, and direct client portal URL link.
3. **Dashboard KPI Strip Counters**:
   - `⚡ Pending Actions` and `🚨 Overdue (>30d)` counter cards with smooth scroll and tab activation.
4. **'Pending & Overdue' Dashboard Panel**:
   - 4 filter tabs (`All Flagged`, `🚨 Overdue (>30d)`, `📦 Pending Deliveries`, `💳 Balance Due`), with direct operational shortcuts (`Notify Client`, `Payment`, `Challan`, `Edit`).

---

## 1. Classification & Aging Utility (`src/utils/challanAllocation.ts`)

```typescript
// Quotation Age Calculator supporting DD-MMM-YYYY, YYYY-MM-DD, DD/MM/YYYY, ISO strings, and timestamps
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
    const linkedChallans = getLinkedChallansForQuote(deliveryChallans, q);
    const totalOrderedQty = (q.items || []).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
    const totalDeliveredQty = linkedChallans.reduce((sum, ch) => {
      return sum + (ch.items || []).reduce((sub, it) => sub + (Number(it.dispatchQty) || 0), 0);
    }, 0);
    const pendingDeliveryQty = Math.max(0, totalOrderedQty - totalDeliveredQty);
    const hasPendingDelivery = !isTerminal && pendingDeliveryQty > 0;

    // Financial calculations
    const itemsSubtotal = (q.items || []).reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
    const gstMultiplier = 1 + (Number(q.gstRate ?? 18) / 100);
    const grandTotal = Math.round(itemsSubtotal * gstMultiplier);
    const totalPaid = (q.paymentReceipts || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
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
```

---

## 2. Streamlined Quotation Card Actions Script (`src/App.tsx`)

Replacing crowded action rows with the confirmed clean 3-action exterior:

```tsx
{/* Exterior Top 3 Actions + More Options */}
<div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-neutral-100">
  {/* 1. Edit Quote */}
  <button
    type="button"
    onClick={() => openSavedQuote(quoteKey)}
    className="px-3 py-1.5 bg-[#df9c20]/15 hover:bg-[#df9c20]/25 text-[#7b3f22] font-bold text-xs rounded-lg border border-[#df9c20]/40 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
    title="Open this quotation in the builder to edit items and details"
  >
    <span>✏️</span>
    <span>Edit</span>
  </button>

  {/* 2. Record Advance / Balance Payment */}
  <button
    type="button"
    onClick={() => handleOpenRecordPayment(quote)}
    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-300 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
    title="Record a bank or cash payment receipt for this quotation"
  >
    <span>💳</span>
    <span>Payment</span>
  </button>

  {/* 3. Delivery Challan */}
  <button
    type="button"
    onClick={() => handleOpenCreateChallan(quote)}
    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs rounded-lg border border-indigo-300 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
    title="Dispatch materials or view delivery challans for this quotation"
  >
    <span>🚚</span>
    <span>Challan</span>
  </button>

  {/* 4. More Options (Opens Modal with PDF Preview, PDF Download, Excel, Share Link, and Delete) */}
  <button
    type="button"
    onClick={() => setShowExportModal({ isOpen: true, quoteName: quoteKey, quote })}
    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-lg border border-neutral-300 flex items-center gap-1 cursor-pointer transition-all shadow-2xs ml-auto"
    title="Document downloads, PDF preview, Excel schedule, and Delete"
  >
    <span>📂</span>
    <span>More Options</span>
  </button>
</div>
```

---

## 3. Dual-Channel 'Notify Client' Modal Script (`Email & WhatsApp`)

```tsx
{showNotifyClientModal.isOpen && showNotifyClientModal.meta && (
  <div className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-neutral-200">
      {/* Header */}
      <div 
        className="p-4 text-white flex justify-between items-center"
        style={{ backgroundColor: activeBranch.theme.primaryColor }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">✉️</span>
          <div>
            <h3 className="font-bold text-sm sm:text-base">Notify Client &amp; Follow-up</h3>
            <p className="text-[11px] text-white/80">
              Quotation #{showNotifyClientModal.meta.quote.quoteNum || showNotifyClientModal.meta.quoteKey}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowNotifyClientModal({ isOpen: false, meta: null, tab: 'email' })}
          className="text-white/80 hover:text-white text-lg font-bold cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Channel Switcher Tabs */}
      <div className="flex border-b border-neutral-200 bg-neutral-50 px-4 pt-3 gap-2">
        <button
          type="button"
          onClick={() => setShowNotifyClientModal(prev => ({ ...prev, tab: 'email' }))}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
            showNotifyClientModal.tab === 'email'
              ? 'bg-white text-neutral-900 border-[#7b3f22] shadow-2xs'
              : 'text-neutral-500 border-transparent hover:text-neutral-800'
          }`}
        >
          <span>📧</span>
          <span>Email Template (mailto:)</span>
        </button>
        <button
          type="button"
          onClick={() => setShowNotifyClientModal(prev => ({ ...prev, tab: 'whatsapp' }))}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
            showNotifyClientModal.tab === 'whatsapp'
              ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
              : 'text-neutral-500 border-transparent hover:text-neutral-800'
          }`}
        >
          <span>💬</span>
          <span>WhatsApp Message</span>
        </button>
      </div>

      {/* Body Content */}
      <div className="p-5 space-y-4 text-xs">
        {/* Quotation Quick Status Bar */}
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between">
          <div>
            <span className="font-bold text-neutral-900 block">{showNotifyClientModal.meta.quote.client || 'Client'}</span>
            <span className="text-[11px] text-neutral-500">
              Age: {showNotifyClientModal.meta.ageDays} Days | Status: {showNotifyClientModal.meta.quote.status || 'Draft'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 block uppercase font-bold">Balance Due</span>
            <span className="font-mono font-bold text-rose-700 text-sm">
              {formatInr(showNotifyClientModal.meta.balanceDue)}
            </span>
          </div>
        </div>

        {/* Message Preview Textarea */}
        <div>
          <label className="font-bold text-neutral-700 block mb-1">
            {showNotifyClientModal.tab === 'email' ? 'Email Body Preview' : 'WhatsApp Message Preview'}
          </label>
          <textarea
            rows={8}
            value={showNotifyClientModal.message}
            onChange={e => setShowNotifyClientModal(prev => ({ ...prev, message: e.target.value }))}
            className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-[11px] leading-relaxed outline-none focus:border-[#7b3f22]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(showNotifyClientModal.message);
              showToast('📋 Copied follow-up message to clipboard!');
            }}
            className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
          >
            <span>📋</span>
            <span>Copy Text</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotifyClientModal({ isOpen: false, meta: null, tab: 'email' })}
              className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 font-semibold cursor-pointer"
            >
              Close
            </button>
            {showNotifyClientModal.tab === 'email' ? (
              <a
                href={`mailto:${encodeURIComponent(showNotifyClientModal.meta.quote.clientEmail || '')}?subject=${encodeURIComponent(
                  `Follow-up: Quotation #${showNotifyClientModal.meta.quote.quoteNum || ''} - ${activeBranch.name}`
                )}&body=${encodeURIComponent(showNotifyClientModal.message)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <span>🚀</span>
                <span>Open in Email App</span>
              </a>
            ) : (
              <a
                href={`https://wa.me/${(showNotifyClientModal.meta.quote.clientPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                  showNotifyClientModal.message
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <span>💬</span>
                <span>Open WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)}
```
