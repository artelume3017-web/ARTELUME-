# Delivery Challan Deduplication, Clean Slate & Delete Fix Scripts

## Problem Analysis from Screenshot (`#DC-907` Duplication & Delete Failure)

### 1. Root Cause of Duplicate `#DC-907`
In `src/components/DeliveryChallanModal.tsx`, state variables (`challanNum`, `items`, `collectedAmount`, `client`, etc.) were initialized using lazy `useState(() => ...)`.
- **The Stale State Trap**: When a user opened `#DC-907` to edit or view it, the modal state was populated with `#DC-907`.
- When the user closed the modal and clicked "+ Create Delivery Challan", React reused the modal component without re-running `useState(() => ...)`.
- Upon submitting, `handleSubmit` created a new record with a new ID (`dc-${Date.now()}`), but with the **stale `challanNum` (#DC-907)** and previous item dispatch quantities!
- Result: **Two `#DC-907` cards with identical numbers and contents** appearing in the list as captured in the user screenshot.

### 2. Root Cause of "Delete Option Not Working"
- In `DeliveryChallanView.tsx`, the delete button required two silent clicks toggling `confirmDeleteId === dc.id`, which was easily lost or confused.
- In `src/App.tsx`, `handleDeleteChallan` only removed the challan from `localStorage`. It **never called Firestore cloud deletion**. If the company was synced to Firestore, cloud sync immediately restored the deleted challan!
- Deleting a challan left orphan on-delivery payment receipts (`RCP-DC-907`) in `savedQuotes` and `bankTransactions`.

### 3. Root Cause of Default / Dummy Data
- Default quotation items (`item-1` Artè Sculpt Pendant, `item-2` Lume Ellipse Downlight).
- Default demo delivery challan (`dc-demo-1` DC-2026-901 Ar. Rajesh Mehta).
- Default product catalog fallback (`CURATED_FIXTURES` re-seeding if empty).
- Default payments auto-crediting into bank accounts from dummy quotes.

---

## Technical Scripts & Solutions

### Script 1: Clean Slate Initialization (Removing All Defaults)

In `src/App.tsx`:
```typescript
// 1. Quotation Builder Items - Clean Empty Start
const [items, setItems] = useState<QuotationItem[]>([]);

// 2. Delivery Challans - Clean Empty Start
const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>(() => {
  try {
    const saved = localStorage.getItem('artelume_delivery_challans');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Purge any legacy demo challan
        return parsed.filter(c => c.id !== 'dc-demo-1' && !c.challanNum.includes('DC-2026-901'));
      }
    }
  } catch (e) {}
  return [];
});

// 3. Product Catalog - No Forced CURATED_FIXTURES Fallback
useEffect(() => {
  try {
    const storedProds = localStorage.getItem('artelume_products');
    if (storedProds) {
      setProducts(JSON.parse(storedProds));
    } else {
      // Clean slate - user starts with their own factory SKUs
      setProducts([]);
      localStorage.setItem('artelume_products', JSON.stringify([]));
    }
  } catch {
    setProducts([]);
  }
}, []);
```

---

### Script 2: Fix Delivery Challan State Reset & Unique Batch Numbering

In `src/components/DeliveryChallanModal.tsx`:
Add an explicit `useEffect` that resets all form fields whenever the modal opens or the target challan/quote changes:

```typescript
// Re-initialize all fields freshly every time modal opens or editing target changes
useEffect(() => {
  if (!isOpen) return;

  if (challan) {
    // EDITING EXISTING CHALLAN
    setSelectedQuoteKey(challan.quoteId || challan.quoteNum || '');
    setChallanNum(challan.challanNum);
    setClient(challan.client || '');
    setSiteAddress(challan.siteAddress || '');
    setContactPhone(challan.contactPhone || '');
    setDispatchDate(challan.dispatchDate || new Date().toISOString().split('T')[0]);
    setVehicleNumber(challan.vehicleNumber || 'Internal Handover');
    setTransporterName(challan.transporterName || `${branch.name} Logistics`);
    setDriverName(challan.driverName || '');
    setDriverPhone(challan.driverPhone || '');
    setItems(challan.items || []);
    setStatus(challan.status || 'Preparing');
    setRecipientName(challan.recipientName || '');
    setNotes(challan.notes || '');
    setAllocatedPerson(challan.allocatedPerson || staffName);
    setAllocatedPersonRole(challan.allocatedPersonRole || 'Logistics Lead');
    setAllocatedPersonPhone(challan.allocatedPersonPhone || '');
    setRecordPaymentNow(Boolean(challan.paymentCollected && challan.paymentCollected > 0));
    setCollectedAmount(Number(challan.paymentCollected) || 0);
    setCollectedMode(challan.paymentMode || 'Cash');
    setCollectedRef(challan.paymentRef || '');
  } else {
    // CREATING A BRAND NEW CHALLAN
    const targetQ = initialQuote || (selectedQuoteKey ? savedQuotes[selectedQuoteKey] : null) || Object.values(savedQuotes)[0];
    const qKey = targetQ ? (targetQ.quoteNum || targetQ.name || '') : '';
    setSelectedQuoteKey(qKey);

    const alloc = targetQ ? allocateDedicatedPersonToChallan(targetQ, staffName) : null;
    const cleanQuoteNum = (targetQ?.quoteNum || 'AL-001').replace(/^#/, '');

    // Strict Unique Numbering: Count existing challans for this quote and generate sequential DC number
    const qChallans = targetQ ? getLinkedChallansForQuote(targetQ, allChallans) : [];
    const nextSeq = qChallans.length + 1;
    
    // Check global uniqueness across all challans to prevent collisions
    let generatedNum = `DC-${cleanQuoteNum}-B${nextSeq}`;
    let suffix = 1;
    while (allChallans.some(c => c.challanNum.toLowerCase() === generatedNum.toLowerCase())) {
      suffix++;
      generatedNum = `DC-${cleanQuoteNum}-B${nextSeq}-${suffix}`;
    }

    setChallanNum(generatedNum);
    setClient(targetQ?.client || '');
    setSiteAddress(targetQ?.siteAddress || `${targetQ?.client || 'Project Site'} (Per Quotation)`);
    setContactPhone(targetQ?.clientPhone || '');
    setDispatchDate(new Date().toISOString().split('T')[0]);
    setVehicleNumber('TS 09 UB 4821');
    setTransporterName(`${branch.name} Internal Logistics`);
    setDriverName(alloc?.allocatedPerson || staffName);
    setDriverPhone(alloc?.allocatedPersonPhone || '');
    setStatus('Preparing');
    setRecipientName(alloc?.recipientName || targetQ?.client || '');
    setNotes('');
    setAllocatedPerson(alloc?.allocatedPerson || staffName);
    setAllocatedPersonRole(alloc?.allocatedPersonRole || 'Dedicated Quote In-Charge');
    setAllocatedPersonPhone(alloc?.allocatedPersonPhone || '');

    // Calculate items remaining to dispatch
    if (targetQ) {
      setItems(
        (targetQ.items || []).map(it => {
          const totalOrdered = it.qty || 1;
          const alreadyDispatched = qChallans.reduce((sum, dc) => {
            const match = (dc.items || []).find(dci => dci.sku === it.sku || dci.name === it.name);
            return sum + (match?.qtyDispatched || 0);
          }, 0);
          const remaining = Math.max(0, totalOrdered - alreadyDispatched);
          return {
            sku: it.sku || 'AL-SPEC',
            name: it.name || 'Architectural Lighting Fixture',
            qtyOrdered: totalOrdered,
            qtyDispatched: remaining > 0 ? remaining : totalOrdered,
            qtyPending: Math.max(0, totalOrdered - (alreadyDispatched + (remaining > 0 ? remaining : totalOrdered)))
          };
        })
      );
    } else {
      setItems([]);
    }

    setRecordPaymentNow(false);
    setCollectedAmount(0);
    setCollectedMode('Cash');
    setCollectedRef('');
  }
}, [isOpen, challan?.id, initialQuote?.quoteNum]);
```

---

### Script 3: Deduplication Engine & Cloud-Synced Deletion

In `src/App.tsx`:
```typescript
// Automatic Deduplication of Delivery Challans on Load
useEffect(() => {
  setDeliveryChallans(prev => {
    const seen = new Map<string, DeliveryChallan>();
    let hasDuplicates = false;

    // Keep the most recent version of any duplicate challan number
    prev.forEach(c => {
      const key = (c.challanNum || '').trim().toLowerCase();
      if (!key) return;
      if (seen.has(key)) {
        hasDuplicates = true;
        // Keep the one with higher updatedAt / createdAt
        const existing = seen.get(key)!;
        const existingTime = new Date(existing.createdAt || 0).getTime();
        const currentTime = new Date(c.createdAt || 0).getTime();
        if (currentTime > existingTime) {
          seen.set(key, c);
        }
      } else {
        seen.set(key, c);
      }
    });

    if (hasDuplicates) {
      const deduped = Array.from(seen.values());
      try {
        localStorage.setItem('artelume_delivery_challans', JSON.stringify(deduped));
      } catch (e) {}
      return deduped;
    }
    return prev;
  });
}, []);

// Robust Delivery Challan Deletion with Automatic Payment Receipt Reversion & Cloud Sync
const handleDeleteChallan = (challanId: string) => {
  setDeliveryChallans(prev => {
    const target = prev.find(c => c.id === challanId);
    if (!target) return prev;

    const updated = prev.filter(c => c.id !== challanId);
    try {
      localStorage.setItem('artelume_delivery_challans', JSON.stringify(updated));
    } catch (e) {}

    // 1. Remove from Quotation reference
    setSavedQuotes(sq => {
      const nextSq = { ...sq };
      for (const k of Object.keys(nextSq)) {
        const q = nextSq[k];
        if (q.deliveryChallans?.includes(target.challanNum)) {
          const nextChallans = q.deliveryChallans.filter(cn => cn !== target.challanNum);
          
          // If this challan collected payment, revert the payment receipt!
          const cleanChallanNum = target.challanNum.replace(/^DC-?/i, '');
          const receiptNum = `RCP-DC-${cleanChallanNum}`;
          const nextPayments = (q.payments || []).filter(
            p => p.receiptNumber !== receiptNum && p.id !== `pay-dc-${target.id}` && p.id !== `pay-dc-${target.challanNum}`
          );

          // Recalculate status
          const totalPaid = nextPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
          const subtotal = (q.items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
          const grand = Math.round(subtotal * (1 + (Number(q.gst) || 18) / 100));
          let newStatus = q.status;
          if (totalPaid <= 0) newStatus = 'Draft';
          else if (totalPaid < grand) newStatus = 'Advance Received';
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
      const cleanChallanNum = target.challanNum.replace(/^DC-?/i, '');
      const receiptNum = `RCP-DC-${cleanChallanNum}`;
      
      setBankTransactions(bt => {
        const next = bt.filter(t => t.receiptNumber !== receiptNum && t.id !== `tx-pay-dc-${target.id}`);
        try {
          localStorage.setItem('artelume_bank_transactions', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

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

  showToast(`🗑️ Delivery Challan #${challanId} deleted and linked payment receipts reverted!`);
};
```

---

### Script 4: DeliveryChallanView Delete Button UX Fix

In `src/components/DeliveryChallanView.tsx`:
Replace the ambiguous tiny confirmation with an explicit, high-visibility 1-click Delete button:

```tsx
<button
  type="button"
  onClick={() => {
    if (confirmDeleteId === dc.id) {
      onDeleteChallan(dc.id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(dc.id);
      // Auto-revert confirm state after 4 seconds if not clicked
      setTimeout(() => setConfirmDeleteId(prev => (prev === dc.id ? null : prev)), 4000);
    }
  }}
  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
    confirmDeleteId === dc.id
      ? 'bg-red-600 text-white animate-pulse shadow-md ring-2 ring-red-400'
      : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
  }`}
  title="Delete this delivery challan"
>
  <span>🗑️</span>
  <span>{confirmDeleteId === dc.id ? 'Click to Confirm Delete' : 'Delete'}</span>
</button>
```

---

## Execution Plan & Validation Steps
1. **Clean Initial Defaults**: Empty out initial states for items, products, and challans.
2. **Implement Modal Lifecycle Reset**: Add `useEffect` on `[isOpen, challan?.id]` in `DeliveryChallanModal.tsx`.
3. **Run Startup Deduplication**: Auto-purge duplicate `#DC-907` entries on load.
4. **Harden Deletion & Payment Reversion**: Connect `handleDeleteChallan` with quotation sync, payment receipt cleanup, bank passbook balance reduction, and cloud sync.
5. **Verify**: Run `lint_applet` and `compile_applet`.
