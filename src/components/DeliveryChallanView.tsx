import React, { useState } from 'react';
import { DeliveryChallan, QuotationDocument, BranchProfile, AppRole } from '../types';

interface DeliveryChallanViewProps {
  challans: DeliveryChallan[];
  savedQuotes: Record<string, QuotationDocument>;
  branch: BranchProfile;
  currentRole: AppRole;
  staffName: string;
  onOpenCreateChallan: (quoteKey?: string) => void;
  onOpenEditChallan: (dc: DeliveryChallan, tab?: 'edit' | 'payment' | 'slip') => void;
  onOpenPaymentModal: (quote: QuotationDocument, tab?: 'add' | 'history') => void;
  onUpdateChallanStatus: (challanId: string, status: DeliveryChallan['status']) => void;
  onDeleteChallan?: (challanId: string) => void;
  onShowToast: (msg: string) => void;
}

export const DeliveryChallanView: React.FC<DeliveryChallanViewProps> = ({
  challans,
  savedQuotes,
  branch,
  currentRole,
  staffName,
  onOpenCreateChallan,
  onOpenEditChallan,
  onOpenPaymentModal,
  onUpdateChallanStatus,
  onDeleteChallan,
  onShowToast
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const formatInr = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val || 0));
  };

  const filteredChallans = challans.filter(dc => {
    if (filterStatus !== 'all' && dc.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        dc.challanNum.toLowerCase().includes(q) ||
        dc.client.toLowerCase().includes(q) ||
        (dc.quoteNum && dc.quoteNum.toLowerCase().includes(q)) ||
        (dc.vehicleNumber && dc.vehicleNumber.toLowerCase().includes(q)) ||
        (dc.siteAddress && dc.siteAddress.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const countPreparing = challans.filter(c => c.status === 'Preparing').length;
  const countInTransit = challans.filter(c => c.status === 'In-Transit').length;
  const countDelivered = challans.filter(c => c.status === 'Delivered').length;

  const getStatusBadge = (status: DeliveryChallan['status']) => {
    switch (status) {
      case 'Preparing':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'In-Transit':
        return 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse';
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Returned':
        return 'bg-red-50 text-red-800 border-red-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Delivery Challans &amp; Site Dispatch</h1>
            <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Logistics Portal
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Architectural luminaire shipments, vehicle manifests, on-delivery payments &amp; client sign-offs
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenCreateChallan()}
          className="px-4 py-2 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer hover:brightness-110 flex items-center gap-1.5 transition-all"
          style={{ backgroundColor: branch.theme.primaryColor }}
        >
          <span>+</span>
          <span>Create Delivery Challan</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Total Dispatches</div>
          <div className="text-2xl font-extrabold text-neutral-900 mt-0.5">{challans.length}</div>
          <div className="text-[11px] text-neutral-500">site shipments</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-100 bg-blue-50/20 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">In-Transit</div>
          <div className="text-2xl font-extrabold text-blue-800 mt-0.5">{countInTransit}</div>
          <div className="text-[11px] text-blue-600">on the road</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-100 bg-amber-50/20 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Preparing</div>
          <div className="text-2xl font-extrabold text-amber-800 mt-0.5">{countPreparing}</div>
          <div className="text-[11px] text-amber-600">warehouse packing</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Delivered</div>
          <div className="text-2xl font-extrabold text-emerald-800 mt-0.5">{countDelivered}</div>
          <div className="text-[11px] text-emerald-600">signed &amp; received</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-neutral-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {['all', 'Preparing', 'In-Transit', 'Delivered', 'Returned'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                filterStatus === st
                  ? 'bg-neutral-900 text-white shadow-xs font-bold'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              {st === 'all' ? `All Challans (${challans.length})` : st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search DC #, client, quote or vehicle..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#faf8f5] border border-neutral-300 rounded-lg text-xs outline-none focus:border-[#7b3f22]"
          />
          <span className="absolute left-2.5 top-2 text-neutral-400 text-xs">🔍</span>
        </div>
      </div>

      {/* Challans List */}
      {filteredChallans.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[#d9cbb9] p-12 text-center space-y-3">
          <div className="text-4xl">🚚</div>
          <h3 className="font-bold text-base text-neutral-900">No Delivery Challans Found</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Create an architectural delivery challan from any accepted quotation to dispatch luminaires to site with vehicle manifests and payment tracking.
          </p>
          <button
            type="button"
            onClick={() => onOpenCreateChallan()}
            className="px-4 py-2 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
            style={{ backgroundColor: branch.theme.primaryColor }}
          >
            + Create First Delivery Challan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChallans.map(dc => {
            const linkedQuote = dc.quoteId
              ? savedQuotes[dc.quoteId]
              : Object.values(savedQuotes).find(
                  q => q.quoteNum === dc.quoteNum && (!dc.client || !q.client || dc.client.toLowerCase() === q.client.toLowerCase())
                );
            const totalUnits = (dc.items || []).reduce((s, it) => s + (it.qtyDispatched || 0), 0);

            const quoteVal = linkedQuote
              ? (linkedQuote.items || []).reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0) * (1 + (Number(linkedQuote.gst) || 18) / 100)
              : 0;
            const quotePayments = linkedQuote?.payments || [];
            const quotePaid = quotePayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const balanceDue = Math.max(0, quoteVal - quotePaid);

            return (
              <div
                key={dc.id}
                className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
              >
                {/* 1. Header Strip */}
                <div className="px-5 py-3.5 bg-neutral-50/70 border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-lg shadow-2xs">
                      🚚
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-neutral-900 tracking-tight">
                          #{dc.challanNum}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(dc.status)}`}>
                          {dc.status.toUpperCase()}
                        </span>
                        {dc.batchSequence && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-200/60 text-neutral-700">
                            Batch #{dc.batchSequence}
                          </span>
                        )}
                        {dc.batchSequence && dc.batchSequence > 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 shadow-2xs">
                            <span>📦</span>
                            <span>Includes Batches 1–{dc.batchSequence - 1} History</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2">
                        <span>Client: <strong className="text-neutral-900 font-semibold">{dc.client}</strong></span>
                        {dc.quoteNum && (
                          <>
                            <span className="text-neutral-300">•</span>
                            <span>Quote: <strong className="text-neutral-700 font-mono">#{dc.quoteNum}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-neutral-400">Dispatch Date</span>
                      <strong className="text-neutral-800 font-semibold">{dc.dispatchDate}</strong>
                    </div>
                    <div className="border-l border-neutral-200 pl-4">
                      <span className="block text-[10px] uppercase font-bold text-neutral-400">Quantity</span>
                      <strong className="text-neutral-900 font-bold">{totalUnits} Units</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Three-Column Organized Information Grid */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                  {/* Column 1: Site Destination */}
                  <div className="space-y-2 border-b md:border-b-0 md:border-r border-neutral-100 pb-4 md:pb-0 md:pr-4">
                    <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                      📍 Site Destination
                    </div>
                    <div className="font-semibold text-neutral-900 leading-snug">
                      {dc.siteAddress || 'Site Address per Client Instructions'}
                    </div>
                    {dc.contactPhone && (
                      <div className="text-neutral-600 flex items-center gap-1.5 pt-1">
                        <span className="text-neutral-400">Contact:</span>
                        <a href={`tel:${dc.contactPhone}`} className="font-mono text-neutral-900 hover:underline font-medium">
                          {dc.contactPhone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Column 2: Logistics & Dedicated In-Charge */}
                  <div className="space-y-2 border-b md:border-b-0 md:border-r border-neutral-100 pb-4 md:pb-0 md:pr-4">
                    <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                      🚛 Transport &amp; Handler
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200">
                        {dc.vehicleNumber || 'Internal Logistics'}
                      </span>
                      <span className="text-neutral-600 text-[11px]">
                        {dc.transporterName || 'ArtèLume Fleet'}
                      </span>
                    </div>
                    <div className="pt-1 space-y-0.5">
                      <div className="text-neutral-700">
                        <span className="text-neutral-400">In-Charge: </span>
                        <strong className="text-neutral-900">{dc.allocatedPerson || dc.driverName || 'Dispatch Team'}</strong>
                      </div>
                      {dc.allocatedPersonPhone && (
                        <div className="text-neutral-500 font-mono text-[11px]">
                          📞 {dc.allocatedPersonPhone}
                        </div>
                      )}
                      {dc.recipientName && (
                        <div className="text-emerald-700 font-medium text-[11px] pt-1">
                          ✓ Signed by: {dc.recipientName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 3: Accounts Ledger & Receipt Status */}
                  <div className="space-y-2 bg-[#faf8f5] p-3.5 rounded-xl border border-[#ede3d5]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#7b3f22] tracking-wider">
                        💳 Accounts &amp; Payment
                      </span>
                      {quoteVal > 0 && balanceDue === 0 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Settled
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                          Due
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-[11px]">
                      {quoteVal > 0 && (
                        <div className="flex justify-between text-neutral-600">
                          <span>Quote Value:</span>
                          <span className="font-medium text-neutral-900">{formatInr(quoteVal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-neutral-600">
                        <span>Total Received:</span>
                        <span className="font-bold text-emerald-700">{formatInr(quotePaid)}</span>
                      </div>
                      {balanceDue > 0 && (
                        <div className="flex justify-between text-neutral-700 font-semibold border-t border-neutral-200/60 pt-1">
                          <span>Balance to Collect:</span>
                          <span className="font-bold text-red-700">{formatInr(balanceDue)}</span>
                        </div>
                      )}
                    </div>

                    {dc.paymentCollected && dc.paymentCollected > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#e2d5c3] space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-emerald-900 font-bold">On-Delivery:</span>
                          <span className="font-mono font-black text-emerald-800">{formatInr(dc.paymentCollected)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-mono bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                            🧾 RCP-DC-{dc.challanNum.replace(/^DC-?/i, '')}
                          </span>
                          <span className="text-emerald-700 font-medium">✓ In Bank Ledger</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Streamlined Clean Footer Bar */}
                <div className="px-5 py-3 bg-white border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
                  {/* Status Switcher */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400 font-medium">Change Status:</span>
                    <select
                      value={dc.status}
                      onChange={e => onUpdateChallanStatus(dc.id, e.target.value as DeliveryChallan['status'])}
                      className="text-xs bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-800 font-semibold outline-none cursor-pointer"
                    >
                      <option value="Preparing">Preparing</option>
                      <option value="In-Transit">In-Transit</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Returned">Returned</option>
                    </select>
                  </div>

                  {/* Primary Actions */}
                  <div className="flex items-center gap-2">
                    {linkedQuote && (
                      <button
                        type="button"
                        onClick={() => onOpenPaymentModal(linkedQuote, 'add')}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        💵 Collect Payment
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenEditChallan(dc, 'edit')}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      ✏️ Edit Challan
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenEditChallan(dc, 'slip')}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>🖨️</span>
                      <span>View &amp; Print Slip</span>
                    </button>

                    {onDeleteChallan && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmDeleteId === dc.id) {
                            onDeleteChallan(dc.id);
                            setConfirmDeleteId(null);
                          } else {
                            setConfirmDeleteId(dc.id);
                          }
                        }}
                        className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          confirmDeleteId === dc.id
                            ? 'bg-red-600 text-white animate-pulse px-2'
                            : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title="Delete challan"
                      >
                        {confirmDeleteId === dc.id ? 'Confirm?' : '🗑️'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
