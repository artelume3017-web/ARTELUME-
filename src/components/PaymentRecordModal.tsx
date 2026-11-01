import React, { useState } from 'react';
import { QuotationDocument, QuotationPaymentRecord, BranchProfile, AppRole } from '../types';

interface PaymentRecordModalProps {
  isOpen: boolean;
  quote: QuotationDocument;
  branch: BranchProfile;
  currentRole: AppRole;
  staffName: string;
  userEmail?: string;
  initialTab?: 'add' | 'history';
  onClose: () => void;
  onSavePayment: (payment: QuotationPaymentRecord, updatedQuote: QuotationDocument) => void;
  onEditPayment?: (oldPayment: QuotationPaymentRecord, updatedPayment: QuotationPaymentRecord, updatedQuote: QuotationDocument) => void;
  onDeletePayment?: (paymentId: string) => void;
  onShowToast: (msg: string) => void;
}

export const PaymentRecordModal: React.FC<PaymentRecordModalProps> = ({
  isOpen,
  quote,
  branch,
  currentRole,
  staffName,
  userEmail,
  initialTab = 'add',
  onClose,
  onSavePayment,
  onEditPayment,
  onDeletePayment,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'history'>(initialTab);

  const subtotal = (quote.items || []).reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
  const gstRate = Number(quote.gst) || 18;
  const grandTotal = Math.round(subtotal * (1 + gstRate / 100));

  const existingPayments = quote.payments || [];
  const alreadyPaid = existingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const balanceRemaining = Math.max(0, grandTotal - alreadyPaid);

  // Default payment type depends on user role and payment history
  const defaultType: QuotationPaymentRecord['type'] =
    currentRole === 'delivery'
      ? 'On-Delivery Payment'
      : alreadyPaid === 0
      ? 'Advance Booking'
      : balanceRemaining <= 0
      ? 'Final Settlement'
      : 'Milestone';

  const [amount, setAmount] = useState<number>(() => {
    if (balanceRemaining <= 0) return 0;
    if (alreadyPaid === 0) {
      return Math.round(grandTotal * 0.6);
    }
    return balanceRemaining;
  });

  const [paymentType, setPaymentType] = useState<QuotationPaymentRecord['type']>(defaultType);
  const [paymentMode, setPaymentMode] = useState<QuotationPaymentRecord['paymentMode']>('UPI');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<QuotationPaymentRecord | null>(null);

  // Edit Payment State
  const [editingPayment, setEditingPayment] = useState<QuotationPaymentRecord | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDate, setEditDate] = useState<string>('');
  const [editType, setEditType] = useState<QuotationPaymentRecord['type']>('Advance Booking');
  const [editMode, setEditMode] = useState<QuotationPaymentRecord['paymentMode']>('UPI');
  const [editRef, setEditRef] = useState<string>('');
  const [editCollector, setEditCollector] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Collecting person name auto-populated from active login with quick edit
  const [collectorName, setCollectorName] = useState<string>(staffName);
  const [isEditingCollector, setIsEditingCollector] = useState(false);

  React.useEffect(() => {
    if (staffName) {
      setCollectorName(staffName);
    }
  }, [staffName]);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  if (!isOpen) return null;

  const formatInr = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val || 0));
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'owner':
        return { label: '👑 Studio Owner', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'admin':
        return { label: '🛡️ Administrator', bg: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'sales':
      case 'member':
      case 'staff':
        return { label: '💼 Sales Executive', bg: 'bg-purple-100 text-purple-900 border-purple-300' };
      case 'delivery':
        return { label: '🚚 Delivery Staff', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      default:
        return { label: '✨ Studio Team', bg: 'bg-neutral-100 text-neutral-800 border-neutral-300' };
    }
  };

  const roleInfo = getRoleBadge(currentRole);

  // Real-time calculation of remaining balance after the proposed payment
  const projectedBalance = Math.max(0, balanceRemaining - (Number(amount) || 0));
  const isOverpaying = (Number(amount) || 0) > balanceRemaining && balanceRemaining > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      onShowToast('Please enter a valid payment amount.');
      return;
    }

    const receiptNum = `RCP-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const newRecord: QuotationPaymentRecord = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: Number(amount),
      type: paymentType,
      paymentMode,
      referenceNo: referenceNo.trim() || undefined,
      collectedByRole: currentRole,
      collectedByName: collectorName.trim() || staffName || 'Artè Lume Staff',
      receiptNumber: receiptNum,
      verifiedByAdmin: currentRole === 'owner' || currentRole === 'admin',
      notes: notes.trim() || undefined
    };

    const updatedPayments = [...existingPayments, newRecord];
    const newTotalPaid = updatedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    let updatedStatus = quote.status;
    if (newTotalPaid >= grandTotal) {
      updatedStatus = 'Accepted & Paid';
    } else if (newTotalPaid > 0) {
      updatedStatus = 'Advance Received';
    }

    const updatedQuote: QuotationDocument = {
      ...quote,
      status: updatedStatus,
      payments: updatedPayments
    };

    onSavePayment(newRecord, updatedQuote);
    setSavedReceipt(newRecord);
    setShowReceiptPreview(true);
    onShowToast(`Recorded payment of ${formatInr(amount)} (${receiptNum})!`);
  };

  const startEditPayment = (p: QuotationPaymentRecord) => {
    setEditingPayment(p);
    setEditAmount(Number(p.amount) || 0);
    setEditDate(p.date || new Date().toISOString().split('T')[0]);
    setEditType(p.type || 'Advance Booking');
    setEditMode(p.paymentMode || 'UPI');
    setEditRef(p.referenceNo || '');
    setEditCollector(p.collectedByName || staffName || 'Artè Lume Staff');
    setEditNotes(p.notes || '');
    setConfirmDeleteId(null);
  };

  const handleSaveEditedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    if (!editAmount || editAmount <= 0) {
      onShowToast('Please enter a valid payment amount.');
      return;
    }

    const updatedRecord: QuotationPaymentRecord = {
      ...editingPayment,
      amount: Number(editAmount),
      date: editDate || editingPayment.date,
      type: editType,
      paymentMode: editMode,
      referenceNo: editRef.trim() || undefined,
      collectedByName: editCollector.trim() || editingPayment.collectedByName,
      notes: editNotes.trim() || undefined
    };

    const targetId = editingPayment.id || editingPayment.receiptNumber;
    const updatedPayments = existingPayments.map(p =>
      (p.id && p.id === targetId) || (p.receiptNumber && p.receiptNumber === targetId) ? updatedRecord : p
    );

    const newTotalPaid = updatedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    let updatedStatus = quote.status;
    if (newTotalPaid >= grandTotal && grandTotal > 0) {
      updatedStatus = 'Accepted & Paid';
    } else if (newTotalPaid > 0) {
      updatedStatus = 'Advance Received';
    } else {
      updatedStatus = 'Draft';
    }

    const updatedQuote: QuotationDocument = {
      ...quote,
      status: updatedStatus,
      payments: updatedPayments
    };

    if (onEditPayment) {
      onEditPayment(editingPayment, updatedRecord, updatedQuote);
    } else {
      onSavePayment(updatedRecord, updatedQuote);
    }

    setEditingPayment(null);
    onShowToast(`✏️ Payment receipt ${updatedRecord.receiptNumber} updated to ${formatInr(editAmount)}!`);
  };

  const handleShareWhatsAppReceipt = (rec: QuotationPaymentRecord) => {
    let msg = `*OFFICIAL PAYMENT ACKNOWLEDGEMENT*\n`;
    msg += `*${branch.name} — ${branch.tagline}*\n`;
    msg += `*Receipt #:* ${rec.receiptNumber}\n`;
    msg += `*Quotation #:* ${quote.quoteNum} (${quote.client})\n`;
    msg += `*Date:* ${rec.date}\n`;
    msg += `*Amount Received:* ${formatInr(rec.amount)}\n`;
    msg += `*Payment Category:* ${rec.type}\n`;
    msg += `*Payment Mode:* ${rec.paymentMode}${rec.referenceNo ? ` (Ref: ${rec.referenceNo})` : ''}\n`;
    msg += `*Received By:* ${rec.collectedByName} (${rec.collectedByRole.toUpperCase()})\n`;
    const newBal = Math.max(0, grandTotal - (alreadyPaid + rec.amount));
    msg += `*Remaining Project Balance:* ${formatInr(newBal)}\n\n`;
    msg += `_Thank you for choosing ${branch.name}. This is a system-generated electronic receipt._`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-neutral-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {!showReceiptPreview ? (
          <div>
            {/* Header */}
            <div
              className="p-4 text-white flex items-center justify-between"
              style={{ backgroundColor: branch.theme.primaryColor }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">💳</span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Quotation Payments &amp; Due Ledger</h3>
                  <p className="text-xs text-white/80">
                    Quote #{quote.quoteNum} • {quote.client || 'Valued Client'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 text-lg cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Comprehensive Financial Status Strip */}
            <div className="bg-[#faf8f5] p-3.5 border-b border-[#ebdcd0] grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-[#ebdcd0] shadow-2xs">
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Grand Total (Quote)</span>
                <span className="font-extrabold text-gray-900 text-sm">{formatInr(grandTotal)}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="text-[10px] text-emerald-700 uppercase block font-semibold">
                  Already Paid ({existingPayments.length})
                </span>
                <span className="font-extrabold text-emerald-700 text-sm">{formatInr(alreadyPaid)}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-300 bg-amber-50/40 shadow-2xs">
                <span className="text-[10px] text-amber-800 uppercase block font-bold">Remaining Due</span>
                <span className="font-extrabold text-[#7b3f22] text-sm">{formatInr(balanceRemaining)}</span>
              </div>
            </div>

            {/* Navigation Tabs: Add New Payment vs View Multiple Payments */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('add')}
                className={`py-2 px-3 border-b-2 rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'add'
                    ? 'border-[#7b3f22] text-[#7b3f22] bg-white font-black shadow-2xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>➕</span>
                <span>Record New Payment</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`py-2 px-3 border-b-2 rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'history'
                    ? 'border-[#7b3f22] text-[#7b3f22] bg-white font-black shadow-2xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>📜</span>
                <span>Payment History &amp; Installments</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-200 text-neutral-800">
                  {existingPayments.length}
                </span>
              </button>
            </div>

            {/* TAB 1: RECORD NEW PAYMENT FORM */}
            {activeTab === 'add' && (
              <form onSubmit={handleSubmit}>
                <div className="p-4 sm:p-5 space-y-4 text-xs max-h-[60vh] overflow-y-auto">
                  {/* Collector Role Info - Dynamically bound to active user login */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-[#faf8f5] to-neutral-50 border border-[#e8ded5] shadow-2xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#df9c20] text-[#110905] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-[#c48512]">
                          {(collectorName || staffName || 'A').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] uppercase font-bold text-[#7b3f22] tracking-wider">Collecting Person (From Login)</span>
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.2 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Active Login
                            </span>
                          </div>
                          {!isEditingCollector ? (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-900 truncate">
                                {collectorName || staffName}
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsEditingCollector(true)}
                                className="text-[10px] text-amber-700 hover:text-amber-900 underline font-semibold cursor-pointer"
                                title="Edit collecting staff name"
                              >
                                Edit
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="text"
                                value={collectorName}
                                onChange={e => setCollectorName(e.target.value)}
                                className="px-2 py-1 text-xs border border-[#7b3f22] rounded bg-white font-bold outline-none w-48 text-gray-900 shadow-inner"
                                placeholder="Enter collecting staff name"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => setIsEditingCollector(false)}
                                className="px-2 py-1 bg-[#7b3f22] text-white text-[10px] font-bold rounded cursor-pointer"
                              >
                                Done
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-2xs shrink-0 ${roleInfo.bg}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                    {userEmail && (
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5 pl-10 border-t border-[#ebdcd0]/70 pt-1.5">
                        <span>Logged In Account:</span>
                        <span className="font-mono text-gray-800 font-bold truncate">{userEmail}</span>
                      </div>
                    )}
                  </div>

                  {/* Amount Input with Quick Preset Chips */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-gray-800 text-xs">Payment Amount (₹) *</label>
                      {balanceRemaining > 0 && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAmount(Math.round(grandTotal * 0.5))}
                            className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-[10px] font-semibold cursor-pointer"
                          >
                            50% Advance
                          </button>
                          <button
                            type="button"
                            onClick={() => setAmount(Math.round(grandTotal * 0.6))}
                            className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-[10px] font-semibold cursor-pointer"
                          >
                            60% Advance
                          </button>
                          <button
                            type="button"
                            onClick={() => setAmount(balanceRemaining)}
                            className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Full Balance ({formatInr(balanceRemaining)})
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-bold text-gray-400 text-sm">₹</span>
                      <input
                        type="number"
                        min={1}
                        max={grandTotal * 2}
                        value={amount || ''}
                        onChange={e => setAmount(Number(e.target.value) || 0)}
                        placeholder="Enter amount"
                        className="w-full pl-8 pr-3 py-2 bg-[#faf8f5] border border-gray-300 rounded-lg font-bold text-sm text-gray-900 outline-none focus:border-[#7b3f22]"
                        required
                      />
                    </div>
                    {isOverpaying && (
                      <p className="text-[10px] text-amber-700 mt-1">
                        ⚠️ Note: Amount entered exceeds remaining project balance ({formatInr(balanceRemaining)}).
                      </p>
                    )}
                  </div>

                  {/* Payment Category & Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Payment Category</label>
                      <select
                        value={paymentType}
                        onChange={e => setPaymentType(e.target.value as any)}
                        className="w-full bg-[#faf8f5] border border-gray-300 rounded-lg px-2.5 py-2 font-medium text-gray-800 outline-none focus:border-[#7b3f22]"
                      >
                        <option value="Advance Booking">Advance Booking (Sales Token)</option>
                        <option value="On-Delivery Payment">On-Delivery Payment (Site Collection)</option>
                        <option value="Milestone">Milestone / Interim Installment</option>
                        <option value="Final Settlement">Final Settlement &amp; Handover</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Payment Mode</label>
                      <select
                        value={paymentMode}
                        onChange={e => setPaymentMode(e.target.value as any)}
                        className="w-full bg-[#faf8f5] border border-gray-300 rounded-lg px-2.5 py-2 font-medium text-gray-800 outline-none focus:border-[#7b3f22]"
                      >
                        <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                        <option value="NEFT / RTGS">Bank NEFT / RTGS / IMPS</option>
                        <option value="Cash">Cash in Hand</option>
                        <option value="Cheque">Cheque / Demand Draft</option>
                      </select>
                    </div>
                  </div>

                  {/* Real-time Ledger Routing Notice */}
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center gap-2 text-[11px] text-blue-900">
                    <span className="text-base">ℹ️</span>
                    <span>
                      {paymentMode === 'Cash' ? (
                        <>Payment will be credited directly to <strong>Cash in Hand Ledger</strong>.</>
                      ) : (
                        <>Payment will be logged &amp; credited to <strong>Bank Account Passbook ({branch.bankDetails?.bankName || 'Studio Bank'})</strong>.</>
                      )}
                    </span>
                  </div>

                  {/* Reference / UTR Number */}
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Transaction Ref / UTR # / Cheque No.</label>
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={e => setReferenceNo(e.target.value)}
                      placeholder="e.g. UPI Ref 329048102948 or HDFC Cheque 001928"
                      className="w-full bg-[#faf8f5] border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-mono outline-none focus:border-[#7b3f22]"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Site / Handover Notes (Optional)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. Collected at site during fixture handover"
                      className="w-full bg-[#faf8f5] border border-gray-300 rounded-lg px-3 py-1.5 text-gray-800 outline-none focus:border-[#7b3f22]"
                    />
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-neutral-100 rounded-lg font-semibold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer transition-all hover:brightness-105 flex items-center gap-1.5"
                    style={{ backgroundColor: branch.theme.primaryColor }}
                  >
                    <span>✓</span>
                    <span>Record Payment &amp; Issue Receipt</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: MULTIPLE PAYMENTS HISTORY & INSTALLMENTS LEDGER */}
            {activeTab === 'history' && (
              <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">
                    Recorded Installments &amp; Receipts ({existingPayments.length})
                  </h4>
                  {!editingPayment && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('add')}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg text-white cursor-pointer shadow-2xs hover:brightness-105 transition-all"
                      style={{ backgroundColor: branch.theme.accentColor }}
                    >
                      + Add Another Payment
                    </button>
                  )}
                </div>

                {editingPayment ? (
                  /* INLINE EDIT PAYMENT FORM */
                  <form onSubmit={handleSaveEditedPayment} className="p-4 rounded-xl border-2 border-amber-400 bg-amber-50/40 space-y-3.5 shadow-sm animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-300">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✏️</span>
                        <div>
                          <h4 className="font-extrabold text-xs uppercase text-amber-950">
                            Edit Payment Receipt #{editingPayment.receiptNumber}
                          </h4>
                          <p className="text-[10px] text-gray-600">
                            Update payment amount, payment mode, date, reference UTR, or notes
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingPayment(null)}
                        className="text-xs font-bold text-gray-600 hover:text-gray-900 px-2 py-1 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                      >
                        ✕ Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1 text-[11px]">Amount Received (₹) *</label>
                        <input
                          type="number"
                          min={1}
                          value={editAmount || ''}
                          onChange={e => setEditAmount(Number(e.target.value) || 0)}
                          className="w-full p-2 bg-white border border-amber-300 focus:border-amber-500 rounded-lg font-black text-sm outline-none text-[#7b3f22]"
                          required
                        />
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 block mb-1 text-[11px]">Payment Date *</label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={e => setEditDate(e.target.value)}
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg outline-none font-medium"
                          required
                        />
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 block mb-1 text-[11px]">Payment Mode *</label>
                        <select
                          value={editMode}
                          onChange={e => setEditMode(e.target.value as any)}
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg outline-none font-bold"
                        >
                          <option value="UPI">UPI (Google Pay / PhonePe / Paytm / QR)</option>
                          <option value="NEFT / RTGS">Bank NEFT / RTGS / IMPS</option>
                          <option value="Cheque">Cheque / Demand Draft</option>
                          <option value="Cash">Cash in Hand</option>
                          <option value="Card">Debit / Credit Card (POS)</option>
                          <option value="Net Banking">Net Banking</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 block mb-1 text-[11px]">Payment Category *</label>
                        <select
                          value={editType}
                          onChange={e => setEditType(e.target.value as any)}
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg outline-none font-semibold"
                        >
                          <option value="Advance Booking">Advance Booking (Token)</option>
                          <option value="Milestone">Milestone / Stage Installment</option>
                          <option value="On-Delivery Payment">On-Delivery Payment</option>
                          <option value="Final Settlement">Final Settlement &amp; Handover</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 block mb-1 text-[11px]">Transaction UTR / Cheque Ref #</label>
                        <input
                          type="text"
                          value={editRef}
                          onChange={e => setEditRef(e.target.value)}
                          placeholder="e.g. UPI Ref / UTR / Cheque #"
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 block mb-1 text-[11px]">Collected By</label>
                        <input
                          type="text"
                          value={editCollector}
                          onChange={e => setEditCollector(e.target.value)}
                          placeholder="Staff or In-Charge Name"
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-bold text-gray-700 block mb-1 text-[11px]">Notes / Remarks</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          placeholder="Optional notes regarding this installment"
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-300">
                      <button
                        type="button"
                        onClick={() => setEditingPayment(null)}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 cursor-pointer text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-sm cursor-pointer text-xs flex items-center gap-1.5"
                      >
                        <span>✓</span>
                        <span>Save Payment Changes</span>
                      </button>
                    </div>
                  </form>
                ) : existingPayments.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50 space-y-2">
                    <span className="text-3xl block">💳</span>
                    <p className="font-bold text-sm text-gray-800">No Payments Recorded Yet</p>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      No advance booking or milestone payments have been logged for Quotation #{quote.quoteNum}.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('add')}
                      className="mt-2 px-3 py-1.5 bg-[#7b3f22] text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Record First Payment
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {existingPayments.map((p, idx) => {
                      const paymentTargetId = p.id || p.receiptNumber || String(idx);
                      const isConfirmingDelete = confirmDeleteId === paymentTargetId;

                      return (
                        <div
                          key={paymentTargetId}
                          className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-amber-300 transition-all shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#7b3f22]">
                                {p.receiptNumber || `RCP-${idx + 1}`}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
                                {p.type}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                                {p.paymentMode}
                              </span>
                            </div>
                            <span className="font-extrabold text-sm text-emerald-800">
                              +{formatInr(p.amount)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] text-gray-600 pt-1 border-t border-gray-100">
                            <div>
                              <span className="text-gray-400">Date:</span> <strong className="text-gray-800">{p.date}</strong>
                            </div>
                            <div>
                              <span className="text-gray-400">Collected By:</span> <strong className="text-gray-800">{p.collectedByName}</strong>
                            </div>
                            {p.referenceNo && (
                              <div>
                                <span className="text-gray-400">Ref:</span> <strong className="font-mono text-gray-800">{p.referenceNo}</strong>
                              </div>
                            )}
                          </div>

                          {p.notes && (
                            <div className="text-[10px] text-gray-500 italic bg-gray-50 p-1.5 rounded">
                              &quot;{p.notes}&quot;
                            </div>
                          )}

                          {/* Actions for this individual payment */}
                          <div className="flex items-center justify-between pt-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              {p.verifiedByAdmin ? (
                                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                  <span>✓</span>
                                  <span>Verified in Bank</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-700 font-medium">
                                  ⏳ Pending bank statement audit
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleShareWhatsAppReceipt(p)}
                                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer flex items-center gap-1"
                                title="Share Electronic Receipt on WhatsApp"
                              >
                                <span>📱</span>
                                <span>Receipt</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => startEditPayment(p)}
                                className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                                title="Edit this payment installment"
                              >
                                <span>✏️</span>
                                <span>Edit</span>
                              </button>

                              {onDeletePayment && (
                                <>
                                  {isConfirmingDelete ? (
                                    <div className="flex items-center gap-1 bg-red-50 border border-red-300 px-2 py-0.5 rounded-lg animate-in fade-in">
                                      <span className="text-[10px] font-bold text-red-800">Delete?</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeletePayment(paymentTargetId);
                                          setConfirmDeleteId(null);
                                        }}
                                        className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-1.5 py-0.5 bg-white border border-gray-300 text-gray-700 rounded text-[10px] hover:bg-gray-100 cursor-pointer"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(paymentTargetId)}
                                      className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] border border-red-200 cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                                      title="Delete this payment receipt and restore due balance"
                                    >
                                      <span>🗑️</span>
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </>
                              )}
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
        ) : (
          /* Instant Digital Payment Receipt View */
          <div className="p-6 space-y-4">
            <div className="text-center space-y-1 pb-3 border-b border-gray-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <h3 className="font-serif text-lg font-bold text-gray-900">Payment Recorded Successfully</h3>
              <p className="text-xs text-gray-500">Official Electronic Receipt Generated</p>
            </div>

            {savedReceipt && (
              <div className="p-4 rounded-xl border border-amber-300 bg-[#fdfaf6] space-y-2.5 text-xs text-gray-800">
                <div className="flex justify-between items-center border-b border-amber-200/80 pb-2">
                  <span className="font-mono font-bold text-amber-900">{savedReceipt.receiptNumber}</span>
                  <span className="text-gray-500">{savedReceipt.date}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-bold text-gray-900">{quote.client || 'Valued Client'}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Quotation Ref:</span>
                  <span className="font-mono font-semibold">#{quote.quoteNum}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Amount Received:</span>
                  <span className="font-black text-base text-emerald-800">{formatInr(savedReceipt.amount)}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Mode &amp; Type:</span>
                  <span className="font-semibold">{savedReceipt.paymentMode} • {savedReceipt.type}</span>
                </div>

                {savedReceipt.referenceNo && (
                  <div className="flex justify-between items-center py-1 font-mono text-[11px]">
                    <span className="text-gray-600">Ref / UTR:</span>
                    <span className="font-bold text-gray-900">{savedReceipt.referenceNo}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-amber-200/80">
                  <span className="text-gray-600">Collected By:</span>
                  <span className="font-semibold text-gray-900">
                    {savedReceipt.collectedByName} ({savedReceipt.collectedByRole.toUpperCase()})
                  </span>
                </div>
              </div>
            )}

            {/* Account Credited Confirmation Banner */}
            {savedReceipt && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏦</span>
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>Studio Accounts Credited:</span>
                      <span className="font-extrabold text-emerald-800">
                        {savedReceipt.paymentMode === 'Cash' ? 'Cash in Hand Ledger' : 'Primary Bank Account Passbook'}
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-700">
                      Amount {formatInr(savedReceipt.amount)} posted to live transactions statement.
                    </div>
                  </div>
                </div>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  +{formatInr(savedReceipt.amount)}
                </span>
              </div>
            )}

            {/* Remaining Balance Summary & Action Buttons */}
            {savedReceipt && balanceRemaining - savedReceipt.amount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Remaining Balance Due</span>
                  <span className="font-extrabold text-sm text-[#7b3f22]">
                    {formatInr(Math.max(0, balanceRemaining - savedReceipt.amount))}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextRem = Math.max(0, balanceRemaining - savedReceipt.amount);
                    setAmount(nextRem);
                    setPaymentType(currentRole === 'delivery' ? 'On-Delivery Payment' : 'Final Settlement');
                    setReferenceNo('');
                    setNotes('');
                    setShowReceiptPreview(false);
                    setActiveTab('add');
                  }}
                  className="px-3 py-1.5 bg-[#7b3f22] hover:bg-[#63331b] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  title="Record the next milestone or balance payment for this client"
                >
                  <span>💳</span>
                  <span>+ Record Next Payment</span>
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {savedReceipt && (
                <button
                  type="button"
                  onClick={() => handleShareWhatsAppReceipt(savedReceipt)}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>📱</span>
                  <span>Share Receipt on WhatsApp</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowReceiptPreview(false);
                  setActiveTab('history');
                }}
                className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-lg text-xs cursor-pointer"
              >
                View All Installments
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 bg-gray-900 hover:bg-black text-white font-semibold rounded-lg text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
