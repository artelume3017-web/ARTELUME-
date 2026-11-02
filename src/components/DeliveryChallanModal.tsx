import React, { useState, useEffect } from 'react';
import { DeliveryChallan, DeliveryChallanItem, QuotationDocument, BranchProfile, AppRole, QuotationPaymentRecord } from '../types';
import { allocateDedicatedPersonToChallan, getLinkedChallansForQuote, getPriorDispatchedBreakdown } from '../utils/challanAllocation';

interface DeliveryChallanModalProps {
  isOpen: boolean;
  challan?: DeliveryChallan | null;
  initialQuote?: QuotationDocument | null;
  initialTab?: 'edit' | 'payment' | 'slip';
  savedQuotes: Record<string, QuotationDocument>;
  allChallans?: DeliveryChallan[];
  branch: BranchProfile;
  currentRole: AppRole;
  staffName: string;
  onClose: () => void;
  onSaveChallan: (dc: DeliveryChallan, paymentToRecord?: QuotationPaymentRecord) => void;
  onOpenPaymentModal?: (quote: QuotationDocument) => void;
  onShowToast: (msg: string) => void;
}

export const DeliveryChallanModal: React.FC<DeliveryChallanModalProps> = ({
  isOpen,
  challan,
  initialQuote,
  initialTab = 'edit',
  savedQuotes,
  allChallans = [],
  branch,
  currentRole,
  staffName,
  onClose,
  onSaveChallan,
  onOpenPaymentModal,
  onShowToast
}) => {
  const isEditing = Boolean(challan);

  const [activeTab, setActiveTab] = useState<'edit' | 'payment' | 'slip'>(() => initialTab || 'edit');
  const [showPriorDetails, setShowPriorDetails] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [selectedQuoteKey, setSelectedQuoteKey] = useState<string>(() => {
    if (challan?.quoteNum) {
      const match = Object.keys(savedQuotes).find(k => savedQuotes[k].quoteNum === challan.quoteNum);
      if (match) return match;
    }
    if (initialQuote?.quoteNum) {
      const match = Object.keys(savedQuotes).find(k => savedQuotes[k].quoteNum === initialQuote.quoteNum);
      if (match) return match;
      if (initialQuote.name && savedQuotes[initialQuote.name]) return initialQuote.name;
    }
    return Object.keys(savedQuotes)[0] || '';
  });

  const targetQuote = selectedQuoteKey ? savedQuotes[selectedQuoteKey] : null;

  // Existing challans for selected quotation
  const existingQuoteChallans = targetQuote ? getLinkedChallansForQuote(targetQuote, allChallans) : [];
  
  // Prior challans specifically (all batches that came before this one)
  const priorChallans = existingQuoteChallans.filter(c => c.id !== challan?.id && c.challanNum !== challan?.challanNum);
  const nextBatchSequence = isEditing && challan?.batchSequence ? challan.batchSequence : existingQuoteChallans.length + (isEditing ? 0 : 1);
  const isSubsequentBatch = nextBatchSequence > 1 && priorChallans.length > 0;

  // Dedicated Person Auto-Allocation State
  const initialAllocation = targetQuote ? allocateDedicatedPersonToChallan(targetQuote, staffName) : null;

  const [allocatedPerson, setAllocatedPerson] = useState<string>(() => {
    return challan?.allocatedPerson || initialAllocation?.allocatedPerson || staffName || 'Studio In-Charge';
  });
  const [allocatedPersonRole, setAllocatedPersonRole] = useState<string>(() => {
    return challan?.allocatedPersonRole || initialAllocation?.allocatedPersonRole || 'Dedicated Quote In-Charge';
  });
  const [allocatedPersonPhone, setAllocatedPersonPhone] = useState<string>(() => {
    return challan?.allocatedPersonPhone || initialAllocation?.allocatedPersonPhone || '';
  });

  const [challanNum, setChallanNum] = useState<string>(() => {
    if (challan?.challanNum) return challan.challanNum;
    const cleanPfx = (targetQuote?.quoteNum || 'AL-001').replace(/^#/, '');
    return existingQuoteChallans.length > 0
      ? `DC-${cleanPfx}-B${nextBatchSequence}`
      : `DC-${cleanPfx}-${Math.floor(100 + Math.random() * 900)}`;
  });

  const [client, setClient] = useState<string>(() => {
    return challan?.client || (selectedQuoteKey ? savedQuotes[selectedQuoteKey]?.client || '' : '');
  });

  const [siteAddress, setSiteAddress] = useState<string>(() => {
    return challan?.siteAddress || (selectedQuoteKey ? savedQuotes[selectedQuoteKey]?.siteAddress || '' : '');
  });

  const [contactPhone, setContactPhone] = useState<string>(() => challan?.contactPhone || '');
  const [dispatchDate, setDispatchDate] = useState<string>(() => {
    return challan?.dispatchDate || new Date().toISOString().split('T')[0];
  });

  const [vehicleNumber, setVehicleNumber] = useState<string>(() => challan?.vehicleNumber || 'TS 09 UB 4821');
  const [transporterName, setTransporterName] = useState<string>(() => challan?.transporterName || `${branch.name} Internal Logistics`);
  const [driverName, setDriverName] = useState<string>(() => challan?.driverName || initialAllocation?.allocatedPerson || staffName || '');
  const [driverPhone, setDriverPhone] = useState<string>(() => challan?.driverPhone || initialAllocation?.allocatedPersonPhone || '');

  const [items, setItems] = useState<DeliveryChallanItem[]>(() => {
    if (challan?.items && challan.items.length > 0) return challan.items;
    if (selectedQuoteKey && savedQuotes[selectedQuoteKey]) {
      return (savedQuotes[selectedQuoteKey].items || []).map(it => {
        const totalOrdered = it.qty || 1;
        const alreadyDispatched = existingQuoteChallans.reduce((sum, dc) => {
          const match = (dc.items || []).find(dci => dci.sku === it.sku || dci.name === it.name);
          return sum + (match?.qtyDispatched || 0);
        }, 0);
        const remaining = Math.max(0, totalOrdered - alreadyDispatched);
        const qtyToDisp = remaining > 0 ? remaining : totalOrdered;

        return {
          sku: it.sku || 'AL-SPEC',
          name: it.name || 'Architectural Lighting Fixture',
          qtyOrdered: totalOrdered,
          qtyDispatched: qtyToDisp,
          qtyPending: Math.max(0, totalOrdered - (alreadyDispatched + qtyToDisp))
        };
      });
    }
    return [];
  });

  const [status, setStatus] = useState<DeliveryChallan['status']>(() => challan?.status || 'Preparing');
  const [recipientName, setRecipientName] = useState<string>(() => {
    return challan?.recipientName || initialAllocation?.recipientName || '';
  });
  const [notes, setNotes] = useState<string>(() => challan?.notes || '');

  // Detailed breakdown of previous delivery material for 2nd, 3rd, 4th challans
  const priorMaterialProgress = isSubsequentBatch && targetQuote
    ? getPriorDispatchedBreakdown(targetQuote.items || [], priorChallans)
    : [];

  // Financial calculations for linked quotation
  const quoteItems = targetQuote?.items || [];
  const quoteTotal = Math.round(
    quoteItems.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0) * (1 + (Number(targetQuote?.gst) || 18) / 100)
  );
  const quotePaid = (targetQuote?.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const quoteBalance = Math.max(0, quoteTotal - quotePaid);

  // On-Delivery Payment Collection State
  const [recordPaymentNow, setRecordPaymentNow] = useState<boolean>(() => Boolean(challan?.paymentCollected && challan.paymentCollected > 0));
  const [collectedAmount, setCollectedAmount] = useState<number>(() => Number(challan?.paymentCollected) || 0);
  const [collectedMode, setCollectedMode] = useState<QuotationPaymentRecord['paymentMode']>(() => challan?.paymentMode || 'Cash');
  const [collectedRef, setCollectedRef] = useState<string>(() => challan?.paymentRef || '');

  // CRITICAL FIX: Explicit Lifecycle Reset when Modal Opens or target changes (Eliminates #DC-907 duplication)
  useEffect(() => {
    if (!isOpen) return;

    if (challan) {
      // 1. EDITING EXISTING CHALLAN
      const qKey = challan.quoteId || (challan.quoteNum ? Object.keys(savedQuotes).find(k => savedQuotes[k].quoteNum === challan.quoteNum) : '') || '';
      if (qKey) setSelectedQuoteKey(qKey);
      setChallanNum(challan.challanNum);
      setClient(challan.client || '');
      setSiteAddress(challan.siteAddress || '');
      setContactPhone(challan.contactPhone || '');
      setDispatchDate(challan.dispatchDate || new Date().toISOString().split('T')[0]);
      setVehicleNumber(challan.vehicleNumber || 'TS 09 UB 4821');
      setTransporterName(challan.transporterName || `${branch.name} Internal Logistics`);
      setDriverName(challan.driverName || '');
      setDriverPhone(challan.driverPhone || '');
      setItems(challan.items || []);
      setStatus(challan.status || 'Preparing');
      setRecipientName(challan.recipientName || '');
      setNotes(challan.notes || '');
      setAllocatedPerson(challan.allocatedPerson || staffName);
      setAllocatedPersonRole(challan.allocatedPersonRole || 'Dedicated Quote In-Charge');
      setAllocatedPersonPhone(challan.allocatedPersonPhone || '');
      const hasPayment = Boolean(challan.paymentCollected && Number(challan.paymentCollected) > 0);
      setRecordPaymentNow(hasPayment);
      setCollectedAmount(Number(challan.paymentCollected) || 0);
      setCollectedMode(challan.paymentMode || 'Cash');
      setCollectedRef(challan.paymentRef || '');
    } else {
      // 2. CREATING A BRAND NEW CHALLAN
      const targetQ = initialQuote || (selectedQuoteKey ? savedQuotes[selectedQuoteKey] : null) || Object.values(savedQuotes)[0] || null;
      const qKey = targetQ ? (targetQ.name || targetQ.quoteNum || '') : '';
      setSelectedQuoteKey(qKey);

      const alloc = targetQ ? allocateDedicatedPersonToChallan(targetQ, staffName) : null;
      const cleanQuoteNum = (targetQ?.quoteNum || 'AL-001').replace(/^#/, '');

      const qChallans = targetQ ? getLinkedChallansForQuote(targetQ, allChallans) : [];
      const batchSeq = qChallans.length + 1;

      // Unique batch numbering that avoids collision
      let generatedNum = `DC-${cleanQuoteNum}-B${batchSeq}`;
      let suffix = 1;
      while (allChallans.some(c => c.challanNum.toLowerCase() === generatedNum.toLowerCase())) {
        suffix++;
        generatedNum = `DC-${cleanQuoteNum}-B${batchSeq}-${suffix}`;
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

      if (targetQ && targetQ.items) {
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

  const formatInr = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val || 0));
  };

  const handleSelectQuote = (quoteKey: string) => {
    setSelectedQuoteKey(quoteKey);
    const q = savedQuotes[quoteKey];
    if (q) {
      // 1. AUTO-ALLOCATE DEDICATED PERSON FROM QUOTE
      const alloc = allocateDedicatedPersonToChallan(q, staffName);
      setAllocatedPerson(alloc.allocatedPerson);
      setAllocatedPersonRole(alloc.allocatedPersonRole);
      setAllocatedPersonPhone(alloc.allocatedPersonPhone || '');
      setDriverName(alloc.allocatedPerson);
      setDriverPhone(alloc.allocatedPersonPhone || '');
      setRecipientName(alloc.recipientName);

      setClient(q.client || '');
      setSiteAddress(q.siteAddress || `${q.client || 'Project Site'} (Per Quotation Specification)`);
      if (q.clientPhone) setContactPhone(q.clientPhone);

      // Multi-challan batch sequence & number
      const qChallans = getLinkedChallansForQuote(q, allChallans);
      const nextSeq = qChallans.length + 1;
      const cleanPfx = (q.quoteNum || 'AL-001').replace(/^#/, '');
      if (qChallans.length > 0) {
        setChallanNum(`DC-${cleanPfx}-P${nextSeq}`);
      } else {
        setChallanNum(`DC-${cleanPfx}-${Math.floor(100 + Math.random() * 900)}`);
      }

      setItems(
        (q.items || []).map(it => {
          const totalOrdered = it.qty || 1;
          const alreadyDispatched = qChallans.reduce((sum, dc) => {
            const match = (dc.items || []).find(dci => dci.sku === it.sku || dci.name === it.name);
            return sum + (match?.qtyDispatched || 0);
          }, 0);
          const remaining = Math.max(0, totalOrdered - alreadyDispatched);
          const qtyToDisp = remaining > 0 ? remaining : totalOrdered;

          return {
            sku: it.sku || 'AL-SPEC',
            name: it.name || 'Architectural Lighting Fixture',
            qtyOrdered: totalOrdered,
            qtyDispatched: qtyToDisp,
            qtyPending: Math.max(0, totalOrdered - (alreadyDispatched + qtyToDisp))
          };
        })
      );

      // Refresh balance
      const newTotal = Math.round(
        (q.items || []).reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0) * (1 + (Number(q.gst) || 18) / 100)
      );
      const newPaid = (q.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const newBal = Math.max(0, newTotal - newPaid);
      if (newBal > 0 && !challan?.paymentCollected) {
        setCollectedAmount(newBal);
      }
    }
  };

  const handleQtyDispatchedChange = (index: number, newQty: number) => {
    const updated = [...items];
    const current = updated[index];
    const cleanQty = Math.max(0, newQty);
    current.qtyDispatched = cleanQty;
    
    // Calculate how many were dispatched in prior batches
    const priorMatch = priorMaterialProgress.find(p => p.sku === current.sku || p.name === current.name);
    const priorDispatched = priorMatch ? priorMatch.totalPriorDispatched : 0;
    
    current.qtyPending = Math.max(0, current.qtyOrdered - (priorDispatched + cleanQty));
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!challanNum.trim()) {
      onShowToast('Please enter a Delivery Challan Number.');
      return;
    }
    if (!client.trim()) {
      onShowToast('Please enter the client / project name.');
      return;
    }

    // Prepare on-delivery payment record if checked
    let paymentRecord: QuotationPaymentRecord | undefined;
    if (recordPaymentNow && collectedAmount > 0) {
      paymentRecord = {
        id: `pay-dc-${challan?.id || challanNum.trim()}-${Date.now()}`,
        date: dispatchDate || new Date().toISOString().split('T')[0],
        amount: collectedAmount,
        type: 'On-Delivery Payment',
        paymentMode: collectedMode,
        referenceNo: collectedRef.trim() || undefined,
        collectedByRole: currentRole,
        collectedByName: staffName,
        receiptNumber: `RCP-DC-${challanNum.trim().replace(/^DC-?/i, '') || Date.now().toString().slice(-4)}`,
        verifiedByAdmin: false,
        notes: `Collected on site with Delivery Challan #${challanNum.trim()}`
      };
    }

    const record: DeliveryChallan = {
      id: challan?.id || `dc-${Date.now()}`,
      challanNum: challanNum.trim(),
      quoteId: selectedQuoteKey || undefined,
      quoteNum: targetQuote?.quoteNum || challan?.quoteNum || 'AL-DIRECT',
      client: client.trim(),
      siteAddress: siteAddress.trim() || 'Site Address per Client Instructions',
      contactPhone: contactPhone.trim() || undefined,
      dispatchDate,
      vehicleNumber: vehicleNumber.trim() || 'Internal Handover',
      transporterName: transporterName.trim() || undefined,
      driverName: driverName.trim() || undefined,
      driverPhone: driverPhone.trim() || undefined,
      items,
      status,
      recipientName: recipientName.trim() || undefined,
      notes: notes.trim() || undefined,
      branchId: branch.id,
      paymentCollected: recordPaymentNow && collectedAmount > 0 ? collectedAmount : (challan?.paymentCollected || undefined),
      paymentMode: recordPaymentNow && collectedAmount > 0 ? collectedMode : (challan?.paymentMode || undefined),
      paymentRef: recordPaymentNow && collectedAmount > 0 ? (collectedRef.trim() || undefined) : (challan?.paymentRef || undefined),
      createdAt: challan?.createdAt || new Date().toISOString(),
      allocatedPerson: allocatedPerson.trim() || undefined,
      allocatedPersonRole: allocatedPersonRole.trim() || undefined,
      allocatedPersonPhone: allocatedPersonPhone.trim() || undefined,
      allocationSource: 'quote_dedicated_person',
      batchSequence: nextBatchSequence,
      batchTotal: Math.max(nextBatchSequence, existingQuoteChallans.length)
    };

    onSaveChallan(record, paymentRecord);
    onShowToast(`🚚 Delivery Challan #${challanNum} saved for ${allocatedPerson} (${allocatedPersonRole})${paymentRecord ? ` & payment of ${formatInr(collectedAmount)} credited!` : '!'}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-neutral-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div
          className="p-4 text-white flex items-center justify-between shrink-0"
          style={{ backgroundColor: branch.theme.primaryColor }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🚚</span>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>{isEditing ? `Edit Delivery Challan #${challan?.challanNum}` : 'Create Architectural Delivery Challan (DC)'}</span>
                {existingQuoteChallans.length > 0 && !isEditing && (
                  <span className="text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded-full font-bold">
                    Batch #{nextBatchSequence} of {targetQuote?.quoteNum}
                  </span>
                )}
              </h3>
              <p className="text-xs text-white/80">
                Dispatch verification, dedicated person allocation &amp; site manifest
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 3-Tab Inner Navigation Strip */}
        <div className="bg-neutral-100 border-b border-neutral-200 px-4 pt-2.5 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-white text-neutral-900 border-[#7b3f22] shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900 border-transparent hover:bg-neutral-200/60'
            }`}
          >
            <span>✏️</span>
            <span>1. Edit Manifest &amp; Fixtures</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'payment'
                ? 'bg-white text-neutral-900 border-[#7b3f22] shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900 border-transparent hover:bg-neutral-200/60'
            }`}
          >
            <span>💳</span>
            <span>2. Payment &amp; Receipt</span>
            {(recordPaymentNow && collectedAmount > 0) && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                {formatInr(collectedAmount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('slip')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'slip'
                ? 'bg-white text-neutral-900 border-[#7b3f22] shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900 border-transparent hover:bg-neutral-200/60'
            }`}
          >
            <span>📄</span>
            <span>3. Printable Slip</span>
            {isSubsequentBatch && (
              <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full font-bold">
                Batch #{nextBatchSequence}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: EDIT MANIFEST & QUANTITIES */}
        {activeTab === 'edit' && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Dedicated Person Auto-Allocation Banner */}
              <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                    🎯
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs text-emerald-950 uppercase tracking-wide">
                        Auto-Allocated Dedicated Person:
                      </span>
                      <span className="font-bold text-xs bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded border border-emerald-400">
                        {allocatedPerson}
                      </span>
                      <span className="text-[10px] text-emerald-800 font-semibold bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200">
                        {allocatedPersonRole}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Automatically allocated from Quote {targetQuote?.quoteNum ? `#${targetQuote.quoteNum}` : ''} as the dedicated handler and site delivery contact.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span className="text-[10px] font-black uppercase bg-emerald-700 text-white px-2.5 py-1 rounded-full shadow-2xs flex items-center gap-1">
                    <span>✓</span>
                    <span>Direct Allocation</span>
                  </span>
                </div>
              </div>

              {/* Linked Quotation Selector & Basic Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#faf8f5] p-3.5 rounded-xl border border-[#ebdcd0]">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Challan Number *</label>
                  <input
                    type="text"
                    value={challanNum}
                    onChange={e => setChallanNum(e.target.value.toUpperCase())}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-gray-900 outline-none focus:border-[#7b3f22]"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Link to Quotation</label>
                  <select
                    value={selectedQuoteKey}
                    onChange={e => handleSelectQuote(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-semibold text-gray-800 outline-none focus:border-[#7b3f22]"
                  >
                    <option value="">-- Standalone / Unlinked --</option>
                    {Object.keys(savedQuotes).map(k => (
                      <option key={k} value={k}>
                        #{savedQuotes[k].quoteNum} — {savedQuotes[k].client || 'Client'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Dispatch Date</label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={e => setDispatchDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-semibold text-gray-800 outline-none focus:border-[#7b3f22]"
                  />
                </div>
              </div>

              {/* PREVIOUS DELIVERY MATERIAL PANEL: ONLY DISPLAYED IF 2ND, 3RD, 4TH... CHALLAN */}
              {isSubsequentBatch ? (
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-300 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📦</span>
                      <div>
                        <div className="font-bold text-xs text-amber-950 flex items-center gap-2">
                          <span>Previous Delivery Material (Batches 1 to {nextBatchSequence - 1})</span>
                          <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-black">
                            Current: Batch #{nextBatchSequence}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-900/80">
                          Materials previously dispatched across {priorChallans.length} earlier shipment{priorChallans.length === 1 ? '' : 's'} for Quote #{targetQuote?.quoteNum}.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPriorDetails(!showPriorDetails)}
                      className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                    >
                      {showPriorDetails ? 'Hide Past Breakdown ▲' : 'View Past Breakdown ▼'}
                    </button>
                  </div>

                  {/* Prior Batches Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {priorChallans.map((pc, idx) => {
                      const unitsInBatch = (pc.items || []).reduce((s, it) => s + (it.qtyDispatched || 0), 0);
                      return (
                        <div key={pc.id || idx} className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-amber-900">Batch #{pc.batchSequence || idx + 1}</span>
                            <span className="font-mono text-[10px] font-bold text-neutral-800">#{pc.challanNum}</span>
                          </div>
                          <div className="text-[10px] text-neutral-500 flex justify-between">
                            <span>Date: {pc.dispatchDate}</span>
                            <span className="font-bold text-emerald-800">{unitsInBatch} units</span>
                          </div>
                          <div className="text-[9.5px] text-neutral-600 truncate">
                            By: {pc.allocatedPerson || pc.driverName || 'Dispatch'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expanded SKU by SKU Prior Dispatches Table */}
                  {showPriorDetails && priorMaterialProgress.length > 0 && (
                    <div className="border border-amber-200 rounded-xl overflow-hidden bg-white text-[11px]">
                      <div className="bg-amber-100/70 px-3 py-1.5 font-bold text-amber-950 flex justify-between items-center text-[10px] uppercase tracking-wider">
                        <span>Cumulative Material Dispatched in Batches 1 to {nextBatchSequence - 1}</span>
                        <span>Item Audit</span>
                      </div>
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-amber-50/50 text-neutral-600 border-b border-amber-200 text-[10px]">
                          <tr>
                            <th className="p-2">Code</th>
                            <th className="p-2">Luminaire</th>
                            <th className="p-2 text-center">Ordered</th>
                            <th className="p-2 text-center font-bold text-amber-900">Prev Dispatched (1st, 2nd, 3rd)</th>
                            <th className="p-2 text-center text-emerald-800 font-bold">Pending Before Today</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {priorMaterialProgress.map((pm, idx) => (
                            <tr key={idx} className="hover:bg-amber-50/30">
                              <td className="p-2 font-mono font-bold text-neutral-900">{pm.sku}</td>
                              <td className="p-2 text-neutral-800">{pm.name}</td>
                              <td className="p-2 text-center font-semibold text-neutral-600">{pm.qtyOrdered}</td>
                              <td className="p-2 text-center font-bold text-amber-900">
                                <span className="bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                                  {pm.totalPriorDispatched} units
                                </span>
                              </td>
                              <td className="p-2 text-center font-bold text-emerald-800">
                                {pm.remainingToDispatch} units
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Dedicated Person & Dispatch Allocation Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                <div>
                  <label className="font-bold text-neutral-800 block mb-1">
                    🎯 Dedicated Person (Quote In-Charge) *
                  </label>
                  <input
                    type="text"
                    value={allocatedPerson}
                    onChange={e => {
                      setAllocatedPerson(e.target.value);
                      setDriverName(e.target.value);
                    }}
                    placeholder="e.g. Vikram Sharma (Sales Lead) / Ar. Rajesh"
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-bold text-emerald-900 outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-800 block mb-1">Role / Designation</label>
                  <input
                    type="text"
                    value={allocatedPersonRole}
                    onChange={e => setAllocatedPersonRole(e.target.value)}
                    placeholder="e.g. Sales Executive / Project In-Charge"
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-neutral-800 outline-none focus:border-emerald-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-800 block mb-1">Dedicated Contact Phone</label>
                  <input
                    type="text"
                    value={allocatedPersonPhone}
                    onChange={e => setAllocatedPersonPhone(e.target.value)}
                    placeholder="e.g. +91 98490 12345"
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-neutral-800 outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              {/* Client & Destination Site Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Client / Architect Name *</label>
                  <input
                    type="text"
                    value={client}
                    onChange={e => setClient(e.target.value)}
                    placeholder="e.g. Ar. Rajesh Mehta / Hyderabad Villa"
                    className="w-full bg-[#faf8f5] border border-gray-300 rounded-lg px-3 py-1.5 font-bold text-gray-900 outline-none focus:border-[#7b3f22]"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Site Contact Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="e.g. +91 98490 XXXXX"
                    className="w-full bg-[#faf8f5] border border-gray-300 rounded-lg px-3 py-1.5 text-gray-800 outline-none focus:border-[#7b3f22]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-gray-700 block mb-1">Delivery Site Destination Address *</label>
                  <textarea
                    rows={2}
                    value={siteAddress}
                    onChange={e => setSiteAddress(e.target.value)}
                    placeholder="e.g. Plot No 45, Road No 10, Jubilee Hills, Hyderabad (Opposite Villa 4B)"
                    className="w-full bg-[#faf8f5] border border-gray-300 rounded-lg p-2.5 text-gray-800 outline-none focus:border-[#7b3f22]"
                    required
                  />
                </div>
              </div>

              {/* Vehicle & Logistics Manifest */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#faf8f5] p-3.5 rounded-xl border border-[#ebdcd0]">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Vehicle / Truck Number</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. TS 09 UB 4821"
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-gray-900 outline-none focus:border-[#7b3f22]"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Delivery Person / Driver</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    placeholder="Driver or Delivery Executive"
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-semibold text-gray-900 outline-none focus:border-[#7b3f22]"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Delivery Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-bold text-gray-800 outline-none focus:border-[#7b3f22]"
                  >
                    <option value="Preparing">📦 Preparing in Warehouse</option>
                    <option value="In-Transit">🚚 In-Transit / Dispatched</option>
                    <option value="Delivered">✅ Delivered to Site</option>
                    <option value="Returned">⚠️ Returned / Pending</option>
                  </select>
                </div>
              </div>

              {/* Luminaire Items Dispatch Quantities Table */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                    <span>Dispatched Luminaire Fixtures ({items.length} types)</span>
                    {isSubsequentBatch && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        Batch #{nextBatchSequence} of {targetQuote?.quoteNum}
                      </span>
                    )}
                  </label>
                  <span className="text-[11px] text-gray-500">
                    Dispatched This Batch: <strong className="text-emerald-800 font-bold">{items.reduce((s, it) => s + it.qtyDispatched, 0)} units</strong>
                  </span>
                </div>

                <div className="border border-[#d9cbb9] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#faf8f5] text-gray-700 font-bold border-b border-[#d9cbb9]">
                      <tr>
                        <th className="p-2 w-10 text-center">#</th>
                        <th className="p-2 min-w-[90px]">Product Code</th>
                        <th className="p-2 min-w-[180px]">Description</th>
                        <th className="p-2 w-14 text-center">Ordered</th>
                        {/* If 2nd, 3rd, 4th challan, show prior dispatched column */}
                        {isSubsequentBatch && (
                          <th className="p-2 w-28 text-center text-amber-900 bg-amber-50/70">
                            Prev Dispatched
                          </th>
                        )}
                        <th className="p-2 w-24 text-center text-emerald-900 bg-emerald-50/40">
                          {isSubsequentBatch ? `Batch #${nextBatchSequence} Qty` : 'Dispatched'}
                        </th>
                        <th className="p-2 w-16 text-center">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ebdcd0]">
                      {items.map((it, idx) => {
                        const priorMatch = priorMaterialProgress.find(p => p.sku === it.sku || p.name === it.name);
                        const priorCount = priorMatch ? priorMatch.totalPriorDispatched : 0;

                        return (
                          <tr key={idx} className="hover:bg-neutral-50">
                            <td className="p-2 text-center text-gray-400 font-mono">{idx + 1}</td>
                            <td className="p-2 font-mono font-bold text-gray-900">{it.sku}</td>
                            <td className="p-2 text-gray-800 font-medium">{it.name}</td>
                            <td className="p-2 text-center font-bold text-gray-600">{it.qtyOrdered}</td>
                            {isSubsequentBatch && (
                              <td className="p-2 text-center bg-amber-50/40 font-bold text-amber-900">
                                {priorCount > 0 ? (
                                  <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
                                    {priorCount}
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 font-normal">0</span>
                                )}
                              </td>
                            )}
                            <td className="p-1.5 text-center bg-emerald-50/20">
                              <input
                                type="number"
                                min={0}
                                value={it.qtyDispatched}
                                onChange={e => handleQtyDispatchedChange(idx, Number(e.target.value) || 0)}
                                className="w-16 text-center bg-white border border-gray-300 focus:border-[#7b3f22] rounded py-1 font-bold text-emerald-800 outline-none"
                              />
                            </td>
                            <td className="p-2 text-center font-bold text-amber-800">
                              {it.qtyPending > 0 ? (
                                <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
                                  {it.qtyPending}
                                </span>
                              ) : (
                                <span className="text-emerald-700">✓ 0</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delivery Sign-off Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Site Receiver Name (Person on Site)</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    placeholder="e.g. Mr. Himanth / Site Electrical Supervisor"
                    className="w-full bg-[#faf8f5] border border-gray-300 rounded-lg px-3 py-1.5 text-gray-800 outline-none focus:border-[#7b3f22]"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Dispatch &amp; Handling Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. 8 boxes checked and stored in Ground Floor electrical room"
                    className="w-full bg-[#faf8f5] border border-gray-300 rounded-lg px-3 py-1.5 text-gray-800 outline-none focus:border-[#7b3f22]"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-neutral-100 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('payment')}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <span>💳</span>
                  <span>Next: Payment &amp; Receipt →</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer transition-all hover:brightness-105 flex items-center gap-1.5"
                  style={{ backgroundColor: branch.theme.primaryColor }}
                >
                  <span>✓</span>
                  <span>Save Delivery Challan</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: PAYMENT & OFFICIAL RECEIPT */}
        {activeTab === 'payment' && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Linked Quote Balance Card */}
              <div className="p-4 bg-[#faf8f5] rounded-xl border border-[#ebdcd0] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#7b3f22] flex items-center gap-1.5">
                    <span>💳</span>
                    <span>Quotation Accounts Status (#{targetQuote?.quoteNum || 'Direct'})</span>
                  </span>
                  <span className="text-[11px] font-semibold text-neutral-500">
                    Client: <strong className="text-neutral-900">{client || 'Client'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center pt-1">
                  <div className="bg-white p-3 rounded-lg border border-neutral-200">
                    <div className="text-[10px] uppercase font-bold text-neutral-400">Total Invoice Value</div>
                    <div className="text-base font-extrabold text-neutral-900 mt-0.5">{formatInr(quoteTotal)}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 bg-emerald-50/20">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">Already Received</div>
                    <div className="text-base font-extrabold text-emerald-800 mt-0.5">{formatInr(quotePaid)}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-red-200 bg-red-50/20">
                    <div className="text-[10px] uppercase font-bold text-red-700">Balance to Collect</div>
                    <div className="text-base font-black text-red-700 mt-0.5">{formatInr(quoteBalance)}</div>
                  </div>
                </div>
              </div>

              {/* On-Delivery Collection Form */}
              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs space-y-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recordPaymentNow}
                    onChange={e => {
                      const checked = e.target.checked;
                      setRecordPaymentNow(checked);
                      if (checked && collectedAmount === 0 && quoteBalance > 0) {
                        setCollectedAmount(quoteBalance);
                      }
                    }}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer accent-[#7b3f22]"
                  />
                  <span className="font-bold text-xs text-neutral-900">
                    Record Payment Collected from Client upon Site Delivery
                  </span>
                </label>

                {recordPaymentNow ? (
                  <div className="space-y-4 pt-2 border-t border-neutral-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                          Amount Received (₹) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={collectedAmount || ''}
                          onChange={e => setCollectedAmount(Number(e.target.value) || 0)}
                          placeholder="e.g. 10600"
                          className="w-full bg-[#faf8f5] border border-neutral-300 rounded-lg px-3 py-2 font-bold text-emerald-800 outline-none focus:border-emerald-600 text-xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                          Payment Mode *
                        </label>
                        <select
                          value={collectedMode}
                          onChange={e => setCollectedMode(e.target.value as any)}
                          className="w-full bg-[#faf8f5] border border-neutral-300 rounded-lg px-3 py-2 font-semibold text-neutral-800 outline-none focus:border-emerald-600 text-xs cursor-pointer"
                        >
                          <option value="Cash">💵 Cash in Hand</option>
                          <option value="UPI">📱 UPI / QR Code</option>
                          <option value="Cheque">📜 Cheque</option>
                          <option value="NEFT / RTGS">🏦 NEFT / RTGS Transfer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                          Ref / UTR / Cheque #
                        </label>
                        <input
                          type="text"
                          value={collectedRef}
                          onChange={e => setCollectedRef(e.target.value)}
                          placeholder="e.g. 8ybvy8yv8tv8 or Cash Slip"
                          className="w-full bg-[#faf8f5] border border-neutral-300 rounded-lg px-3 py-2 text-neutral-800 outline-none focus:border-emerald-600 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Official Receipt Preview Card */}
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-bold text-emerald-900 flex items-center gap-1.5">
                          <span>🧾 Official Receipt:</span>
                          <span className="bg-emerald-200/80 px-2 py-0.5 rounded text-xs font-mono font-black">
                            RCP-DC-{challanNum.trim().replace(/^DC-?/i, '')}
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-800 mt-1">
                          Will credit directly to <strong>{collectedMode === 'Cash' ? 'Studio Cash In-Hand' : 'Studio Bank Account Passbook'}</strong>.
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-neutral-400 block">Total Credit</span>
                        <span className="text-base font-black text-emerald-800">{formatInr(collectedAmount)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-neutral-500 italic text-[11px] bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                    ℹ️ Check the box above if the delivery person or sales in-charge collected cash, UPI, or cheque payment on site.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-neutral-100 rounded-lg font-semibold text-xs cursor-pointer"
              >
                ← Back to Manifest
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('slip')}
                  className="px-3.5 py-2 bg-neutral-800 hover:bg-black text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <span>📄</span>
                  <span>Preview Slip →</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer transition-all hover:brightness-105 flex items-center gap-1.5"
                  style={{ backgroundColor: branch.theme.primaryColor }}
                >
                  <span>✓</span>
                  <span>Save Delivery Challan</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: PRINTABLE SLIP */}
        {activeTab === 'slip' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Top Toolbar */}
            <div className="bg-[#170e08] text-white p-3 px-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-sm">A4 Delivery Challan Dispatch Slip</span>
                <span className="text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded font-mono font-bold">
                  #{challanNum}
                </span>
                {isSubsequentBatch && (
                  <span className="text-[10px] bg-neutral-700 text-amber-300 px-2 py-0.5 rounded font-bold">
                    Shipment Batch #{nextBatchSequence}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-[#df9c20] hover:bg-[#c88916] text-[#170e08] font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <span>🖨️</span>
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-lg cursor-pointer"
                >
                  ✏️ Edit Details
                </button>
              </div>
            </div>

            {/* Simulated Paper A4 Document */}
            <div className="p-6 sm:p-8 overflow-y-auto bg-neutral-100 flex justify-center flex-1">
              <div className="bg-white border border-neutral-300 p-8 rounded-sm shadow-lg max-w-2xl w-full text-neutral-900 text-xs space-y-5">
                {/* Header Letterhead */}
                <div
                  className="p-5 rounded-lg text-white flex justify-between items-start"
                  style={{ backgroundColor: branch.theme.primaryColor }}
                >
                  <div>
                    <h2 className="font-serif text-2xl font-bold tracking-wider">{branch.name}</h2>
                    <p className="text-xs italic" style={{ color: branch.theme.accentColor }}>{branch.tagline}</p>
                    <p className="text-[10px] text-white/80 mt-1 max-w-sm">{branch.address}</p>
                    <p className="text-[9.5px] font-mono text-white/70 mt-0.5">GSTIN: {branch.gstin} • {branch.phone}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xl uppercase tracking-wider text-amber-400">DELIVERY CHALLAN</div>
                    <div className="font-mono text-sm font-bold text-white mt-1">#{challanNum}</div>
                    <div className="text-[10px] text-white/80 mt-0.5">Date: {dispatchDate}</div>
                    {selectedQuoteKey && (
                      <div className="text-[10px] text-amber-200 mt-0.5">Ref Quote #{savedQuotes[selectedQuoteKey]?.quoteNum}</div>
                    )}
                    {isSubsequentBatch && (
                      <div className="text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded font-black mt-1 inline-block">
                        PARTIAL SHIPMENT #{nextBatchSequence}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dispatch Destination & Vehicle Manifest */}
                <div className="grid grid-cols-2 gap-4 border border-neutral-200 p-3.5 rounded-lg bg-neutral-50 text-[11px]">
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-neutral-500 block">Deliver To (Site Destination):</span>
                    <strong className="text-sm font-bold text-neutral-900 block">{client}</strong>
                    <p className="text-neutral-700 mt-1 leading-snug">{siteAddress}</p>
                    {contactPhone && <p className="text-neutral-600 mt-0.5">📞 Contact: {contactPhone}</p>}
                  </div>

                  <div className="border-l border-neutral-200 pl-4 space-y-1">
                    <span className="text-[9.5px] uppercase font-bold text-neutral-500 block">Logistics &amp; Dedicated Person:</span>
                    <div><strong>Dedicated In-Charge:</strong> <span className="text-emerald-800 font-bold">{allocatedPerson} ({allocatedPersonRole})</span></div>
                    <div><strong>Vehicle No:</strong> <span className="font-mono font-bold">{vehicleNumber || 'Studio Vehicle'}</span></div>
                    {transporterName && <div><strong>Transporter:</strong> {transporterName}</div>}
                    <div><strong>Delivered By:</strong> {driverName || allocatedPerson}</div>
                    {(driverPhone || allocatedPersonPhone) && <div><strong>Phone:</strong> {driverPhone || allocatedPersonPhone}</div>}
                    <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        Status: {status}
                      </span>
                      {nextBatchSequence > 1 && (
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                          Batch #{nextBatchSequence}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* PREVIOUS DELIVERY MATERIAL DISPATCH RECORD (Only for 2nd, 3rd, 4th... Challans) */}
                {isSubsequentBatch && priorChallans.length > 0 && (
                  <div className="border border-amber-300 bg-amber-50/40 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[10.5px] text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                        <span>📦</span>
                        <span>Previous Delivery Material Record (Batches 1 to {nextBatchSequence - 1})</span>
                      </span>
                      <span className="text-[10px] text-amber-900 font-bold">
                        {priorChallans.reduce((s, c) => s + (c.items || []).reduce((si, i) => si + (i.qtyDispatched || 0), 0), 0)} units previously received at site
                      </span>
                    </div>

                    <table className="w-full text-left text-[10px] border-collapse bg-white border border-amber-200 rounded">
                      <thead className="bg-amber-100/70 text-amber-950 font-bold border-b border-amber-200">
                        <tr>
                          <th className="p-1.5">Prior Batch</th>
                          <th className="p-1.5">Challan #</th>
                          <th className="p-1.5">Dispatch Date</th>
                          <th className="p-1.5">Logistics Handler</th>
                          <th className="p-1.5 text-right">Units Sent</th>
                          <th className="p-1.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {priorChallans.map((pc, idx) => {
                          const units = (pc.items || []).reduce((s, it) => s + (it.qtyDispatched || 0), 0);
                          return (
                            <tr key={pc.id || idx}>
                              <td className="p-1.5 font-bold">Batch #{pc.batchSequence || idx + 1}</td>
                              <td className="p-1.5 font-mono font-bold text-neutral-900">#{pc.challanNum}</td>
                              <td className="p-1.5">{pc.dispatchDate}</td>
                              <td className="p-1.5 text-neutral-600 truncate">{pc.allocatedPerson || pc.driverName || 'Dispatch'}</td>
                              <td className="p-1.5 text-right font-bold text-neutral-900">{units} units</td>
                              <td className="p-1.5 text-center">
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800">
                                  {pc.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table of Dispatched Luminaires */}
                <div className="border border-neutral-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-neutral-800 text-white font-bold text-[10.5px]">
                      <tr>
                        <th className="p-2 w-8 text-center">S.No</th>
                        <th className="p-2 min-w-[90px]">Product SKU</th>
                        <th className="p-2 min-w-[180px]">Description of Luminaires</th>
                        <th className="p-2 w-14 text-center">Ordered</th>
                        {isSubsequentBatch && (
                          <th className="p-2 w-20 text-center bg-neutral-700 text-amber-300">
                            Prev Sent
                          </th>
                        )}
                        <th className="p-2 w-16 text-center">
                          {isSubsequentBatch ? `Sent Today` : 'Qty Sent'}
                        </th>
                        <th className="p-2 w-16 text-center">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {items.map((it, idx) => {
                        const priorMatch = priorMaterialProgress.find(p => p.sku === it.sku || p.name === it.name);
                        const priorCount = priorMatch ? priorMatch.totalPriorDispatched : 0;

                        return (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/60'}>
                            <td className="p-2 text-center text-neutral-400 font-mono">{idx + 1}</td>
                            <td className="p-2 font-mono font-bold text-neutral-900">{it.sku}</td>
                            <td className="p-2 text-neutral-800">{it.name}</td>
                            <td className="p-2 text-center font-bold text-neutral-700">{it.qtyOrdered}</td>
                            {isSubsequentBatch && (
                              <td className="p-2 text-center font-bold text-amber-900 bg-amber-50/30">
                                {priorCount > 0 ? `${priorCount}` : '—'}
                              </td>
                            )}
                            <td className="p-2 text-center font-black text-neutral-900 text-sm">{it.qtyDispatched}</td>
                            <td className="p-2 text-center text-neutral-600 font-medium">
                              {it.qtyPending > 0 ? `${it.qtyPending} pcs` : 'Nil'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Official Payment Receipt on Delivery Acknowledgement */}
                {(recordPaymentNow && collectedAmount > 0) && (
                  <div className="border-2 border-emerald-500 bg-emerald-50/70 p-3.5 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">
                        🧾 OFFICIAL PAYMENT RECEIPT #{`RCP-DC-${challanNum.trim().replace(/^DC-?/i, '')}`}
                      </span>
                      <div className="font-bold text-neutral-900 mt-1">
                        Received with thanks from <span className="text-emerald-900 font-extrabold">{client}</span>
                      </div>
                      <div className="text-[11px] text-neutral-600 mt-0.5">
                        Mode: <strong>{collectedMode}</strong> {collectedRef ? `• Ref / UTR: ${collectedRef}` : ''}
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

                {/* Terms of Delivery & Sign-off Boxes */}
                <div className="pt-2 space-y-4">
                  <div className="text-[10px] text-neutral-500 leading-snug">
                    <strong>Declaration:</strong> Goods dispatched above are delivered for site installation as per approved architectural luminaire schedule. Please inspect boxes and sign acknowledgement upon physical receipt.
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-neutral-200">
                    <div className="text-center">
                      <div className="h-14 flex items-end justify-center pb-1">
                        <span className="font-serif italic font-bold text-xs text-neutral-700">{driverName || 'Artè Lume Dispatch'}</span>
                      </div>
                      <div className="border-t border-neutral-400 pt-1 text-[10px] text-neutral-600 font-bold uppercase">
                        Dispatched By (Driver / Logistics Sign)
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="h-14 flex items-end justify-center pb-1">
                        <span className="font-bold text-xs text-neutral-800">{recipientName || 'Received in Good Condition'}</span>
                      </div>
                      <div className="border-t border-neutral-400 pt-1 text-[10px] text-neutral-600 font-bold uppercase">
                        Received By (Client / Site Rep Signature &amp; Stamp)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
