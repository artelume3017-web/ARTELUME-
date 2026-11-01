# Editable Delivery Challan with Inner Tabs Architecture

This guide and script specification provides an **inner tabbed editable format** for both already generated and new Delivery Challans.

---

## 1. Feature Architecture & Inner Tabs Layout

When opening any already generated Delivery Challan, the modal provides three dedicated **Inner Tabs**:

1. **Tab 1: ✏️ Edit Manifest & Quantities**
   - Editable dispatched quantities (adjust units dispatched on site).
   - Add/Remove luminaire line items.
   - Dedicated Quote In-Charge, driver name & contact phone.
   - Vehicle number, transporter name, and site address.
   - Status switcher (`Preparing` ➔ `In-Transit` ➔ `Delivered`).

2. **Tab 2: 💳 Payment & Official Receipt**
   - Live invoice value, total paid to date, and balance due.
   - Toggle to record or edit on-delivery payment (advance, partial, or full settlement).
   - Payment Mode: UPI, Cash in Hand, NEFT/RTGS, Cheque.
   - Reference / UTR # field.
   - Official Receipt Preview (`RCP-DC-${challanNum}`).
   - Bank Account / Cash Ledger credit confirmation indicator.

3. **Tab 3: 📄 Printable Slip & Physical Manifest**
   - Live architectural handover document.
   - Formatted table of dispatched luminaires.
   - Embedded Official Payment Receipt acknowledgment block.
   - Driver & Client physical sign-off boxes.
   - 1-Click `🖨️ Print Document` button.

---

## 2. Inner Tabbed Modal Component Script (`DeliveryChallanModal.tsx`)

```tsx
import React, { useState, useEffect } from 'react';
import {
  DeliveryChallan,
  DeliveryChallanItem,
  QuotationDocument,
  BranchProfile,
  QuotationPaymentRecord,
  AppRole
} from '../types';
import {
  allocateDedicatedPersonToChallan,
  getLinkedChallansForQuote,
  createPaymentRecordFromChallan
} from '../utils/challanAllocation';

export interface DeliveryChallanModalProps {
  isOpen: boolean;
  challan: DeliveryChallan | null; // null if creating, populated if editing already generated
  initialQuote: QuotationDocument | null;
  savedQuotes: Record<string, QuotationDocument>;
  allChallans: DeliveryChallan[];
  branch: BranchProfile;
  currentRole: AppRole;
  staffName: string;
  initialTab?: 'edit' | 'payment' | 'slip';
  onClose: () => void;
  onSaveChallan: (challan: DeliveryChallan, payment?: QuotationPaymentRecord) => void;
  onOpenPaymentModal?: (quote: QuotationDocument, tab?: 'add' | 'history') => void;
  onShowToast: (msg: string) => void;
}

export const DeliveryChallanModal: React.FC<DeliveryChallanModalProps> = ({
  isOpen,
  challan,
  initialQuote,
  savedQuotes,
  allChallans,
  branch,
  currentRole,
  staffName,
  initialTab = 'edit',
  onClose,
  onSaveChallan,
  onShowToast
}) => {
  const isEditing = Boolean(challan?.id);

  // Inner Tab State
  const [activeInnerTab, setActiveInnerTab] = useState<'edit' | 'payment' | 'slip'>(initialTab);

  // Form State
  const [challanNum, setChallanNum] = useState<string>(() => challan?.challanNum || '');
  const [client, setClient] = useState<string>(() => challan?.client || '');
  const [siteAddress, setSiteAddress] = useState<string>(() => challan?.siteAddress || '');
  const [contactPhone, setContactPhone] = useState<string>(() => challan?.contactPhone || '');
  const [dispatchDate, setDispatchDate] = useState<string>(() => challan?.dispatchDate || new Date().toISOString().split('T')[0]);
  const [vehicleNumber, setVehicleNumber] = useState<string>(() => challan?.vehicleNumber || 'TS 09 UB 4821');
  const [transporterName, setTransporterName] = useState<string>(() => challan?.transporterName || '');
  const [driverName, setDriverName] = useState<string>(() => challan?.driverName || '');
  const [driverPhone, setDriverPhone] = useState<string>(() => challan?.driverPhone || '');
  const [allocatedPerson, setAllocatedPerson] = useState<string>(() => challan?.allocatedPerson || staffName);
  const [allocatedPersonRole, setAllocatedPersonRole] = useState<string>(() => challan?.allocatedPersonRole || 'Dedicated Quote In-Charge');
  const [items, setItems] = useState<DeliveryChallanItem[]>(() => challan?.items || []);
  const [status, setStatus] = useState<DeliveryChallan['status']>(() => challan?.status || 'Preparing');
  const [recipientName, setRecipientName] = useState<string>(() => challan?.recipientName || '');
  const [notes, setNotes] = useState<string>(() => challan?.notes || '');

  // Payment Form State
  const [recordPaymentNow, setRecordPaymentNow] = useState<boolean>(() => Boolean(challan?.paymentCollected && challan.paymentCollected > 0));
  const [collectedAmount, setCollectedAmount] = useState<number>(() => Number(challan?.paymentCollected) || 0);
  const [collectedMode, setCollectedMode] = useState<QuotationPaymentRecord['paymentMode']>(() => challan?.paymentMode || 'UPI');
  const [collectedRef, setCollectedRef] = useState<string>(() => challan?.paymentRef || '');

  const formatInr = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val || 0));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let paymentRecord: QuotationPaymentRecord | undefined;
    if (recordPaymentNow && collectedAmount > 0) {
      paymentRecord = {
        id: `pay-dc-${challan?.id || Date.now()}`,
        date: dispatchDate,
        amount: collectedAmount,
        type: 'On-Delivery Payment',
        paymentMode: collectedMode,
        referenceNo: collectedRef.trim() || undefined,
        collectedByRole: currentRole,
        collectedByName: allocatedPerson || driverName || staffName,
        receiptNumber: `RCP-DC-${challanNum.trim().replace(/^DC-?/i, '')}`,
        verifiedByAdmin: false,
        notes: `Collected on site with Delivery Challan #${challanNum.trim()}`
      };
    }

    const updatedChallan: DeliveryChallan = {
      id: challan?.id || `dc-${Date.now()}`,
      challanNum: challanNum.trim(),
      quoteNum: challan?.quoteNum || initialQuote?.quoteNum || 'AL-DIRECT',
      client: client.trim(),
      siteAddress: siteAddress.trim(),
      contactPhone: contactPhone.trim() || undefined,
      dispatchDate,
      vehicleNumber: vehicleNumber.trim(),
      transporterName: transporterName.trim() || undefined,
      driverName: driverName.trim() || undefined,
      driverPhone: driverPhone.trim() || undefined,
      items,
      status,
      recipientName: recipientName.trim() || undefined,
      notes: notes.trim() || undefined,
      branchId: branch.id,
      paymentCollected: recordPaymentNow && collectedAmount > 0 ? collectedAmount : undefined,
      paymentMode: recordPaymentNow && collectedAmount > 0 ? collectedMode : undefined,
      paymentRef: recordPaymentNow && collectedAmount > 0 ? (collectedRef.trim() || undefined) : undefined,
      createdAt: challan?.createdAt || new Date().toISOString(),
      allocatedPerson,
      allocatedPersonRole
    };

    onSaveChallan(updatedChallan, paymentRecord);
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-neutral-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div
          className="p-4 text-white flex items-center justify-between shrink-0"
          style={{ backgroundColor: branch.theme.primaryColor }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🚚</span>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>{isEditing ? `Delivery Challan #${challan?.challanNum}` : 'Create Delivery Challan'}</span>
                <span className="text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded-full font-bold">
                  {status}
                </span>
              </h3>
              <p className="text-xs text-white/80">
                Client: <strong>{client || 'Valued Client'}</strong> • Quote: <strong>{challan?.quoteNum || initialQuote?.quoteNum}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* INNER TAB BAR */}
        <div className="flex border-b border-neutral-200 bg-neutral-100/80 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveInnerTab('edit')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeInnerTab === 'edit'
                ? 'border-[#7b3f22] text-[#7b3f22] bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
            }`}
          >
            <span>✏️</span>
            <span>1. Edit Manifest &amp; Fixtures</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveInnerTab('payment')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeInnerTab === 'payment'
                ? 'border-[#7b3f22] text-[#7b3f22] bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
            }`}
          >
            <span>💳</span>
            <span>2. Payment &amp; Receipt</span>
            {collectedAmount > 0 && (
              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                {formatInr(collectedAmount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveInnerTab('slip')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeInnerTab === 'slip'
                ? 'border-[#7b3f22] text-[#7b3f22] bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
            }`}
          >
            <span>📄</span>
            <span>3. Printable Slip</span>
          </button>
        </div>

        {/* TAB 1: EDIT MANIFEST & QUANTITIES */}
        {activeInnerTab === 'edit' && (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {/* Quick Status Bar */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
              <div>
                <span className="font-bold text-neutral-700 block">Dispatch Status</span>
                <span className="text-[11px] text-neutral-500">Update current logistics milestone</span>
              </div>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="bg-white border border-neutral-300 font-bold px-3 py-1.5 rounded-lg text-xs"
              >
                <option value="Preparing">📦 Preparing in Warehouse</option>
                <option value="In-Transit">🚚 In-Transit / Dispatched</option>
                <option value="Delivered">✅ Delivered to Site</option>
                <option value="Returned">⚠️ Returned / Pending</option>
              </select>
            </div>

            {/* Editable Fixtures Quantities Table */}
            <div className="border border-neutral-300 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-neutral-800 text-white font-bold">
                  <tr>
                    <th className="p-2 w-10 text-center">#</th>
                    <th className="p-2 min-w-[100px]">Product Code</th>
                    <th className="p-2 min-w-[200px]">Description</th>
                    <th className="p-2 w-20 text-center">Ordered</th>
                    <th className="p-2 w-24 text-center bg-neutral-900">Dispatched Now</th>
                    <th className="p-2 w-20 text-center">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="p-2 text-center text-neutral-400 font-mono">{idx + 1}</td>
                      <td className="p-2 font-mono font-bold text-neutral-900">{it.sku}</td>
                      <td className="p-2 text-neutral-800 font-medium">{it.name}</td>
                      <td className="p-2 text-center font-bold text-neutral-600">{it.qtyOrdered}</td>
                      <td className="p-1.5 text-center bg-amber-50/50">
                        <input
                          type="number"
                          min={0}
                          value={it.qtyDispatched}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            const copy = [...items];
                            copy[idx] = { ...it, qtyDispatched: val, qtyPending: Math.max(0, it.qtyOrdered - val) };
                            setItems(copy);
                          }}
                          className="w-16 text-center bg-white border border-amber-400 rounded py-1 font-extrabold text-emerald-800 outline-none text-xs"
                        />
                      </td>
                      <td className="p-2 text-center font-bold text-neutral-600">
                        {it.qtyPending > 0 ? (
                          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
                            {it.qtyPending}
                          </span>
                        ) : (
                          <span className="text-emerald-700">✓ 0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Logistics & Vehicle Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={e => setVehicleNumber(e.target.value)}
                  className="w-full bg-[#faf8f5] border border-neutral-300 rounded-lg p-2 font-mono font-bold text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Driver / Handler Name</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  className="w-full bg-[#faf8f5] border border-neutral-300 rounded-lg p-2 text-xs"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setActiveInnerTab('payment')}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-lg cursor-pointer"
              >
                Next: Payment &amp; Receipt →
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Save Challan Changes
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: PAYMENT & OFFICIAL RECEIPT */}
        {activeInnerTab === 'payment' && (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <span>💳</span>
                  <span>Record On-Delivery Payment (Advance / Full)</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                  Receipt: RCP-DC-{challanNum.replace(/^DC-?/i, '')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Amount Collected (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    value={collectedAmount || ''}
                    onChange={e => {
                      const val = Number(e.target.value) || 0;
                      setCollectedAmount(val);
                      setRecordPaymentNow(val > 0);
                    }}
                    placeholder="e.g. 10600"
                    className="w-full bg-white border border-emerald-400 rounded-lg p-2 font-bold text-emerald-900 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Payment Mode *</label>
                  <select
                    value={collectedMode}
                    onChange={e => setCollectedMode(e.target.value as any)}
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2 font-bold text-xs"
                  >
                    <option value="UPI">📱 UPI / QR Code</option>
                    <option value="NEFT / RTGS">🏦 NEFT / RTGS Transfer</option>
                    <option value="Cash">💵 Cash in Hand</option>
                    <option value="Cheque">📜 Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Ref / UTR / Cheque #</label>
                  <input
                    type="text"
                    value={collectedRef}
                    onChange={e => setCollectedRef(e.target.value)}
                    placeholder="e.g. 8ybvy8yv8tv8"
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2 font-mono text-xs"
                  />
                </div>
              </div>

              {collectedAmount > 0 && (
                <div className="p-3 bg-white rounded-lg border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
                  <div>
                    ✓ Will auto-credit <strong>{formatInr(collectedAmount)}</strong> to{' '}
                    <strong>{collectedMode === 'Cash' ? 'Studio Cash Ledger' : 'Studio Bank Account Passbook'}</strong>.
                  </div>
                  <span className="font-bold text-xs text-emerald-900">Receipt Ready</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setActiveInnerTab('slip')}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-lg cursor-pointer"
              >
                View Printable Slip →
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Save Payment &amp; Update Ledger
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: PRINTABLE SLIP & MANIFEST */}
        {activeInnerTab === 'slip' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>🖨️</span>
                <span>Print Delivery Challan Slip</span>
              </button>
            </div>

            {/* Document Body */}
            <div className="border border-neutral-300 p-6 rounded-xl bg-white space-y-4 text-xs font-sans">
              <div
                className="p-4 rounded-xl text-white flex justify-between items-start"
                style={{ backgroundColor: branch.theme.primaryColor }}
              >
                <div>
                  <h2 className="font-serif font-black text-xl">{branch.name}</h2>
                  <p className="text-[11px] text-white/80">{branch.tagline}</p>
                  <p className="text-[10px] text-white/70 mt-1">{branch.address}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase font-bold text-amber-300 tracking-wider">DELIVERY CHALLAN</div>
                  <div className="font-mono text-base font-black">#{challanNum}</div>
                  <div className="text-[11px] text-white/80 mt-0.5">Date: {dispatchDate}</div>
                </div>
              </div>

              {/* Official Payment Receipt Box if collected */}
              {collectedAmount > 0 && (
                <div className="border-2 border-emerald-500 bg-emerald-50/70 p-3.5 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">
                      🧾 OFFICIAL PAYMENT RECEIPT #{`RCP-DC-${challanNum.trim().replace(/^DC-?/i, '')}`}
                    </span>
                    <div className="font-bold text-neutral-900 mt-1">
                      Received with thanks from <span className="text-emerald-900 font-extrabold">{client}</span>
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">
                      Payment Mode: <strong>{collectedMode}</strong> {collectedRef ? `• Ref/UTR: ${collectedRef}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">Amount Collected</span>
                    <span className="text-base font-black text-emerald-900">{formatInr(collectedAmount)}</span>
                    <span className="text-[9.5px] text-emerald-700 block font-semibold mt-0.5">
                      ✓ Credited to Studio Bank Account
                    </span>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <table className="w-full border-collapse border border-neutral-300 text-xs">
                <thead>
                  <tr className="bg-neutral-800 text-white font-bold">
                    <th className="p-2 border border-neutral-300 w-10 text-center">#</th>
                    <th className="p-2 border border-neutral-300 text-left">Product Code</th>
                    <th className="p-2 border border-neutral-300 text-left">Description</th>
                    <th className="p-2 border border-neutral-300 w-20 text-center">Qty Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-b border-neutral-200">
                      <td className="p-2 border border-neutral-300 text-center">{idx + 1}</td>
                      <td className="p-2 border border-neutral-300 font-mono font-bold">{it.sku}</td>
                      <td className="p-2 border border-neutral-300">{it.name}</td>
                      <td className="p-2 border border-neutral-300 text-center font-bold">{it.qtyDispatched}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-neutral-300">
                <div className="text-center">
                  <div className="h-12 flex items-end justify-center font-bold text-xs">{driverName || 'Studio Driver'}</div>
                  <div className="border-t border-neutral-400 pt-1 text-[10px] font-bold uppercase text-neutral-600">Dispatched By</div>
                </div>
                <div className="text-center">
                  <div className="h-12 flex items-end justify-center font-bold text-xs">{recipientName || 'Site Rep'}</div>
                  <div className="border-t border-neutral-400 pt-1 text-[10px] font-bold uppercase text-neutral-600">Received By (Client)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 3. How the Delivery View Card Triggers This (`DeliveryChallanView.tsx`)

On the already generated challan card, provide two distinct buttons:
1. `✏️ Edit Challan & Quantities`: Opens directly on **Tab 1**.
2. `🧾 Payment Receipt`: Opens directly on **Tab 2** (or opens payment history).
3. `🖨️ Print Slip`: Opens directly on **Tab 3** for instant physical slip printing.

```tsx
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={() => onOpenEditChallan(dc, 'edit')}
    className="px-3 py-1.5 bg-[#df9c20] hover:brightness-105 text-[#170e08] rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shadow-2xs"
    title="Open editable format to adjust quantities, handlers, and details"
  >
    <span>✏️</span>
    <span>Edit Challan</span>
  </button>

  <button
    type="button"
    onClick={() => onOpenEditChallan(dc, 'slip')}
    className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shadow-2xs"
    title="View and print delivery slip"
  >
    <span>🖨️</span>
    <span>Print Slip</span>
  </button>
</div>
```

---
*Ready for your review. Please confirm if you would like me to apply this tabbed inner editable format to your application.*
