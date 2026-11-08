import React, { useState } from 'react';
import { DeliveryChallan, QuotationDocument, BranchProfile, AppRole } from '../types';
import { isChallanLinkedToQuote, getLinkedChallansForQuote } from '../utils/challanAllocation';

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
  onOpenMaterialMatrix?: (quote: QuotationDocument) => void;
  onOpenPodSimulator?: (dc: DeliveryChallan, quote?: QuotationDocument) => void;
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
  onOpenMaterialMatrix,
  onOpenPodSimulator,
  onShowToast
}) => {
  const [viewMode, setViewMode] = useState<'grouped' | 'matrix' | 'flat'>('grouped');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedMatrixQuoteKey, setSelectedMatrixQuoteKey] = useState<string>('');
  const [matrixDetailView, setMatrixDetailView] = useState<'table' | 'projects'>('table');

  const formatInr = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val || 0));
  };

  const togglePhaseDetails = (phaseId: string) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const filteredChallans = challans.filter(dc => {
    if (filterStatus !== 'all' && dc.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchedQuote = Object.values(savedQuotes).find(sq =>
        (sq.quoteNum && dc.quoteNum && sq.quoteNum.toLowerCase() === dc.quoteNum.toLowerCase()) ||
        (sq.deliveryChallans && sq.deliveryChallans.includes(dc.challanNum)) ||
        (dc.quoteId && (sq.name === dc.quoteId || sq.quoteNum === dc.quoteId))
      );
      const quoteName = (matchedQuote?.name || '').toLowerCase();
      const quoteClient = (matchedQuote?.client || '').toLowerCase();

      return (
        dc.challanNum.toLowerCase().includes(q) ||
        dc.client.toLowerCase().includes(q) ||
        quoteName.includes(q) ||
        quoteClient.includes(q) ||
        (dc.quoteNum && dc.quoteNum.toLowerCase().includes(q)) ||
        (dc.vehicleNumber && dc.vehicleNumber.toLowerCase().includes(q)) ||
        (dc.siteAddress && dc.siteAddress.toLowerCase().includes(q)) ||
        (dc.recipientName && dc.recipientName.toLowerCase().includes(q)) ||
        (dc.allocatedPerson && dc.allocatedPerson.toLowerCase().includes(q))
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

  // Group challans by project (linked quote) using authoritative isChallanLinkedToQuote
  const projectGroups = React.useMemo(() => {
    const groups: {
      quoteKey: string;
      quote: QuotationDocument;
      quoteNum: string;
      client: string;
      siteAddress: string;
      challans: DeliveryChallan[];
      totalOrderedUnits: number;
      totalDispatchedUnits: number;
    }[] = [];

    // 1. Process all savedQuotes
    Object.entries(savedQuotes).forEach(([quoteKey, q]) => {
      const qNum = (q.quoteNum || quoteKey).replace(/^#/, '');
      const linked = challans.filter(c => isChallanLinkedToQuote(c, q, quoteKey));

      const totalOrdered = (q.items || []).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
      const totalDispatched = linked.reduce((sum, ch) => {
        return sum + (ch.items || []).reduce((s, it) => s + (Number(it.qtyDispatched) || 0), 0);
      }, 0);

      const qLower = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !qLower ||
        qNum.toLowerCase().includes(qLower) ||
        (q.client || '').toLowerCase().includes(qLower) ||
        (q.name || '').toLowerCase().includes(qLower) ||
        (q.siteAddress || '').toLowerCase().includes(qLower) ||
        linked.some(c => c.challanNum.toLowerCase().includes(qLower));

      const matchesStatus =
        filterStatus === 'all' ||
        (linked.length > 0 ? linked.some(c => c.status === filterStatus) : filterStatus === 'Preparing');

      if (matchesSearch && matchesStatus) {
        groups.push({
          quoteKey,
          quote: q,
          quoteNum: qNum,
          client: q.client || q.name || 'Client',
          siteAddress: q.siteAddress || 'Site per Client Instructions',
          challans: linked.sort((a, b) => (a.batchSequence || 0) - (b.batchSequence || 0) || a.challanNum.localeCompare(b.challanNum)),
          totalOrderedUnits: totalOrdered,
          totalDispatchedUnits: totalDispatched
        });
      }
    });

    // 2. Also capture any orphan challans (direct challans not in savedQuotes)
    challans.forEach(dc => {
      const alreadyIncluded = groups.some(g => g.challans.some(c => c.id === dc.id || c.challanNum === dc.challanNum));
      if (!alreadyIncluded) {
        const orphanOrdered = (dc.items || []).reduce((s, it) => s + (Number(it.qtyOrdered) || Number(it.qtyDispatched) || 0), 0);
        const orphanDispatched = (dc.items || []).reduce((s, it) => s + (Number(it.qtyDispatched) || 0), 0);

        const pseudoQuote: QuotationDocument = {
          quoteNum: dc.quoteNum || dc.challanNum,
          name: dc.client,
          client: dc.client,
          date: dc.dispatchDate,
          status: dc.status === 'Delivered' ? 'Delivered' : 'Dispatched',
          gst: 18,
          items: (dc.items || []).map((it, idx) => ({
            id: `orphan-${idx}`,
            sku: it.sku,
            name: it.name,
            category: 'Downlights',
            watt: '',
            cct: '',
            qty: it.qtyOrdered || it.qtyDispatched || 1,
            listPrice: 0,
            discount: 0,
            price: 0
          })),
          showCode: true,
          showDiscount: false,
          showBank: true,
          siteAddress: dc.siteAddress
        };

        groups.push({
          quoteKey: dc.id,
          quote: pseudoQuote,
          quoteNum: dc.quoteNum || dc.challanNum,
          client: dc.client,
          siteAddress: dc.siteAddress,
          challans: [dc],
          totalOrderedUnits: orphanOrdered,
          totalDispatchedUnits: orphanDispatched
        });
      }
    });

    return groups;
  }, [challans, savedQuotes, searchQuery, filterStatus]);

  // Active Project for Matrix View
  const activeMatrixProject = React.useMemo(() => {
    if (selectedMatrixQuoteKey) {
      const found = projectGroups.find(g => g.quoteKey === selectedMatrixQuoteKey);
      if (found) return found;
    }
    // Default to project with challans or first project
    return projectGroups.find(g => g.challans.length > 0) || projectGroups[0] || null;
  }, [projectGroups, selectedMatrixQuoteKey]);

  // Compute live item matrix rows for active project
  const activeMatrixRows = React.useMemo(() => {
    if (!activeMatrixProject) return [];
    const q = activeMatrixProject.quote;
    const lChallans = activeMatrixProject.challans;

    const cleanSku = (s?: string) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = (s?: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

    return (q.items || []).map((item, idx) => {
      const sku = (item.sku || '').trim() || `AL-SPEC-${idx + 1}`;
      const name = item.name || 'Architectural Luminaire';
      const orderedQty = Number(item.qty) || 0;

      const perChallanQty = lChallans.map(ch => {
        const chItems = ch.items || [];
        const match = chItems.find(ci => {
          const ciSku = cleanSku(ci.sku);
          const tSku = cleanSku(item.sku);
          if (ciSku && tSku && (ciSku === tSku || ciSku.includes(tSku) || tSku.includes(ciSku))) return true;
          const ciNm = cleanName(ci.name);
          const tNm = cleanName(item.name);
          if (ciNm && tNm && (ciNm === tNm || ciNm.includes(tNm) || tNm.includes(ciNm))) return true;
          return false;
        }) || (chItems.length === (q.items || []).length ? chItems[idx] : undefined);

        return match ? Number(match.qtyDispatched) || 0 : 0;
      });

      const totalDelivered = perChallanQty.reduce((sum, qty) => sum + qty, 0);
      const pendingQty = Math.max(0, orderedQty - totalDelivered);
      const isComplete = totalDelivered >= orderedQty && orderedQty > 0;

      return {
        sNo: idx + 1,
        sku,
        name,
        watt: item.watt,
        cct: item.cct,
        finish: item.finish,
        orderedQty,
        perChallanQty,
        totalDelivered,
        pendingQty,
        isComplete
      };
    });
  }, [activeMatrixProject]);

  return (
    <div className="space-y-6">
      {/* Top Header with Mode Switcher */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900">
              📦 Consolidated Delivery Matrix &amp; Site Dispatch
            </h1>
            <span className="text-xs bg-sky-50 text-sky-800 font-bold px-2.5 py-0.5 rounded-full border border-sky-200">
              Smart Logistics Hub
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Solves multi-challan clutter! Group all delivery phases under one clean project dashboard, with an instant Cumulative Material Matrix showing what was sent and what remains.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-300 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'grouped'
                ? 'bg-[#7b3f22] text-white shadow-xs font-black'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            📑 Grouped by Project (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-[#7b3f22] text-white shadow-xs font-black'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            📊 Cumulative Item Matrix
          </button>
          <button
            type="button"
            onClick={() => setViewMode('flat')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'flat'
                ? 'bg-[#7b3f22] text-white shadow-xs font-black'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            📋 Flat List
          </button>
        </div>
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

      {/* Filter Toolbar */}
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

        <div className="flex items-center gap-2">
          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Client, DC #, or Vehicle..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#faf8f5] border border-neutral-300 rounded-lg text-xs outline-none focus:border-[#7b3f22]"
            />
            <span className="absolute left-2.5 top-2 text-neutral-400 text-xs">🔍</span>
          </div>

          <button
            type="button"
            onClick={() => onOpenCreateChallan()}
            className="px-3.5 py-1.5 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer hover:brightness-110 flex items-center gap-1 shrink-0"
            style={{ backgroundColor: branch.theme.primaryColor }}
          >
            <span>+</span>
            <span>New Challan</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: GROUPED BY PROJECT (THE HERO VIEW) */}
      {viewMode === 'grouped' && (
        <div className="space-y-5">
          {projectGroups.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-[#d9cbb9] p-12 text-center space-y-3">
              <div className="text-4xl">🚚</div>
              <h3 className="font-bold text-base text-neutral-900">No Delivery Challans Found</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                Create a delivery challan from any accepted quotation to group multi-phase luminaire shipments under one project master card.
              </p>
              <button
                type="button"
                onClick={() => onOpenCreateChallan()}
                className="px-4 py-2 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                style={{ backgroundColor: branch.theme.primaryColor }}
              >
                + Create Delivery Challan
              </button>
            </div>
          ) : (
            projectGroups.map(group => {
              const ordered = group.totalOrderedUnits || group.totalDispatchedUnits;
              const dispatched = group.totalDispatchedUnits;
              const pending = Math.max(0, ordered - dispatched);
              const pct = ordered > 0 ? Math.min(100, Math.round((dispatched / ordered) * 100)) : 100;

              return (
                <div
                  key={group.quoteKey}
                  className="bg-white border border-neutral-200 hover:border-neutral-400 rounded-2xl p-5 shadow-sm transition-all space-y-4"
                >
                  {/* Master Project Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3.5 border-b border-neutral-200">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-extrabold text-[#7b3f22] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                          #{group.quoteNum}
                        </span>
                        <h2 className="text-base sm:text-lg font-black text-neutral-900">
                          {group.client} — Architectural Lighting Supply
                        </h2>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                          pct === 100
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          <span>✓</span>
                          <span>{group.challans.length} Dispatches ({pct}%)</span>
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 mt-1 flex items-center gap-3 flex-wrap">
                        <span>📍 Site: <strong>{group.siteAddress}</strong></span>
                        <span>•</span>
                        <span>👤 Contact: <strong>{group.client}</strong></span>
                        <span>•</span>
                        <span>🏛️ Studio: <strong>{branch.name}</strong></span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {onOpenMaterialMatrix && (
                        <button
                          type="button"
                          onClick={() => onOpenMaterialMatrix(group.quote)}
                          className="px-3.5 py-1.5 bg-[#df9c20] hover:bg-[#c98918] text-black font-extrabold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>📊</span>
                          <span>View Full Item Matrix</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenCreateChallan(group.quoteKey)}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>🚚</span>
                        <span>+ Add Phase {group.challans.length + 1}</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress Meter */}
                  <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-[#ebdcd0] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-800 flex items-center gap-2">
                        <span>🚚 Total Material Dispatched:</span>
                        <strong className="text-neutral-900 font-mono text-sm">
                          {dispatched} of {ordered} Units ({pct}% Complete)
                        </strong>
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-700">
                        {pending === 0 ? '✓ 0 Units Pending' : `${pending} Units Pending`}
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-neutral-200 overflow-hidden flex">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`rounded-full h-full transition-all ${
                          pct === 100
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                            : 'bg-gradient-to-r from-amber-500 to-[#7b3f22]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Batches Timeline Accordion */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider px-1">
                      <span>Dispatched Batches ({group.challans.length} Phases)</span>
                      <span className="text-[11px] font-normal lowercase text-neutral-400">
                        click any batch to expand / collapse details
                      </span>
                    </div>

                    {group.challans.map((dc, idx) => {
                      const phaseUnits = (dc.items || []).reduce((s, it) => s + (it.qtyDispatched || 0), 0);
                      const isExpanded = expandedPhases[dc.id];

                      return (
                        <div key={dc.id} className="border border-neutral-200 rounded-xl bg-neutral-50/60 overflow-hidden">
                          <div
                            onClick={() => togglePhaseDetails(dc.id)}
                            className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-100/80 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-wrap">
                              <span className="font-mono font-bold text-xs text-[#7b3f22] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                #{dc.challanNum}
                              </span>
                              <span className="font-bold text-xs text-neutral-900 truncate">
                                Phase {dc.batchSequence || idx + 1}: {dc.recipientName ? `Signed by ${dc.recipientName}` : 'In Warehouse / Transit'}
                              </span>
                              <span className="text-[11px] text-neutral-500 font-mono">
                                📅 {dc.dispatchDate}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(dc.status)}`}>
                                {dc.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                              <span className="font-mono text-xs font-black text-neutral-900 bg-white border border-neutral-200 px-2.5 py-1 rounded-md">
                                {phaseUnits} Units
                              </span>

                              {/* On-Site POD Simulator */}
                              {onOpenPodSimulator && (
                                <button
                                  type="button"
                                  onClick={() => onOpenPodSimulator(dc, group.quote)}
                                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="Open Touch Signature & Payment Collection Simulator"
                                >
                                  <span>✍️</span>
                                  <span>POD &amp; Pay</span>
                                </button>
                              )}

                              {/* View Slip */}
                              <button
                                type="button"
                                onClick={() => onOpenEditChallan(dc, 'slip')}
                                className="px-2.5 py-1 bg-neutral-800 hover:bg-black text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="View Printable A4 Challan Slip"
                              >
                                <span>🖨️</span>
                                <span>View Slip</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => togglePhaseDetails(dc.id)}
                                className="text-neutral-400 hover:text-neutral-700 text-xs px-1 cursor-pointer"
                              >
                                {isExpanded ? '▲' : '▼'}
                              </button>
                            </div>
                          </div>

                          {/* Collapsible Details Panel */}
                          {isExpanded && (
                            <div className="p-3.5 bg-white border-t border-neutral-200 text-xs space-y-2.5">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-neutral-600">
                                <div>🚚 Vehicle: <strong className="text-neutral-900 font-mono">{dc.vehicleNumber || 'Internal Logistics'}</strong></div>
                                <div>👤 Driver / In-Charge: <strong className="text-neutral-900">{dc.allocatedPerson || dc.driverName || 'Dispatch Team'}</strong></div>
                                <div>✍️ Sign-off: <strong className="text-emerald-700 font-semibold">{dc.recipientName ? `✓ Signed by ${dc.recipientName}` : 'Pending Site Sign'}</strong></div>
                              </div>

                              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between flex-wrap gap-2">
                                <div className="text-neutral-700">
                                  <strong>Dispatched in this Phase:</strong>
                                  <span className="font-mono text-neutral-900 ml-1">
                                    {(dc.items || []).map(it => `${it.sku} (${it.qtyDispatched} pcs)`).join(', ')}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onOpenEditChallan(dc, 'edit')}
                                    className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-lg cursor-pointer"
                                  >
                                    ✏️ Edit Items
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onOpenEditChallan(dc, 'slip')}
                                    className="px-3 py-1 bg-[#df9c20] hover:bg-[#c98918] text-black font-extrabold text-xs rounded-lg cursor-pointer shadow-xs flex items-center gap-1"
                                  >
                                    <span>🖨️</span>
                                    <span>Print Phase Slip</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: CUMULATIVE ITEM MATRIX (ALL DISPATCHES IN 1 MASTER TABLE) */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-sm space-y-4">
          {/* Header Strip with Project Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xl">📊</span>
                <h2 className="text-lg font-black text-neutral-900 tracking-tight">
                  Cumulative Material Matrix (Everything in One Table)
                </h2>
                {activeMatrixProject && (
                  <span className="font-mono text-xs font-black bg-[#df9c20] text-black px-2.5 py-0.5 rounded shadow-2xs">
                    #{activeMatrixProject.quoteNum}
                  </span>
                )}
                {activeMatrixProject && (
                  <span className="text-xs font-bold text-neutral-600">
                    {activeMatrixProject.client}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Real-time tracking of ordered luminaire quantities against dynamic delivery challan phases and site balances.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Project Selector Dropdown */}
              {projectGroups.length > 0 && (
                <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-1.5 rounded-xl border border-neutral-300 text-xs">
                  <span className="text-neutral-500 font-bold">Project:</span>
                  <select
                    value={activeMatrixProject?.quoteKey || ''}
                    onChange={e => setSelectedMatrixQuoteKey(e.target.value)}
                    className="bg-transparent font-bold text-neutral-900 outline-none cursor-pointer max-w-[200px] truncate"
                  >
                    {projectGroups.map(pg => (
                      <option key={pg.quoteKey} value={pg.quoteKey}>
                        #{pg.quoteNum} {pg.client} ({pg.challans.length} Phases)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* View Toggle: Item Table vs Projects Summary */}
              <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-300 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMatrixDetailView('table')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    matrixDetailView === 'table' ? 'bg-[#7b3f22] text-white shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Table View
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixDetailView('projects')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    matrixDetailView === 'projects' ? 'bg-[#7b3f22] text-white shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  All Projects ({projectGroups.length})
                </button>
              </div>

              {activeMatrixProject && (
                <button
                  type="button"
                  onClick={() => onOpenCreateChallan(activeMatrixProject.quoteKey)}
                  className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <span>🚚</span>
                  <span>+ New DC (Phase {activeMatrixProject.challans.length + 1})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <span>🖨️</span>
                <span>Print</span>
              </button>

              {activeMatrixProject && onOpenMaterialMatrix && (
                <button
                  type="button"
                  onClick={() => onOpenMaterialMatrix(activeMatrixProject.quote)}
                  className="px-3 py-1.5 bg-[#df9c20] hover:bg-[#c98918] text-black font-black text-xs rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Open full-screen modal"
                >
                  <span>↗</span>
                  <span>Fullscreen</span>
                </button>
              )}
            </div>
          </div>

          {/* DETAIL VIEW 1: FULL ITEM-BY-ITEM CUMULATIVE MATRIX TABLE */}
          {matrixDetailView === 'table' && activeMatrixProject && (
            <div className="space-y-4">
              {/* Active Project KPI Cards */}
              {(() => {
                const totalOrd = activeMatrixRows.reduce((s, r) => s + r.orderedQty, 0);
                const totalDisp = activeMatrixRows.reduce((s, r) => s + r.totalDelivered, 0);
                const totalPend = Math.max(0, totalOrd - totalDisp);
                const pct = totalOrd > 0 ? Math.min(100, Math.round((totalDisp / totalOrd) * 100)) : 0;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
                      <div className="text-[10px] uppercase font-bold text-neutral-500">Total Ordered</div>
                      <div className="text-xl font-black text-neutral-900 font-mono mt-0.5">{totalOrd} units</div>
                      <div className="text-[11px] text-neutral-500">{activeMatrixRows.length} fixture items</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <div className="text-[10px] uppercase font-bold text-emerald-700">Total Dispatched</div>
                      <div className="text-xl font-black text-emerald-800 font-mono mt-0.5">{totalDisp} units</div>
                      <div className="text-[11px] text-emerald-700">{activeMatrixProject.challans.length} phases shipped</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <div className="text-[10px] uppercase font-bold text-amber-700">Pending Dispatch</div>
                      <div className="text-xl font-black text-amber-800 font-mono mt-0.5">{totalPend} units</div>
                      <div className="text-[11px] text-amber-700">{totalPend === 0 ? '✓ All fulfilled' : 'remaining on site'}</div>
                    </div>
                    <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
                      <div className="text-[10px] uppercase font-bold text-sky-700">Fulfillment Rate</div>
                      <div className="text-xl font-black text-sky-900 font-mono mt-0.5">{pct}%</div>
                      <div className="w-full bg-sky-200 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-sky-600'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Master Matrix Table */}
              <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-[#0f141d]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#101622] text-slate-400 uppercase text-[10px] font-mono tracking-wider sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="p-3 text-center w-10">#</th>
                      <th className="p-3 min-w-[130px]">SKU / Code</th>
                      <th className="p-3 min-w-[200px]">Fixture Description</th>
                      <th className="p-3 text-center bg-[#151c28] text-white">Ordered</th>

                      {/* Dynamic DC Phase Columns */}
                      {activeMatrixProject.challans.map((ch, cIdx) => (
                        <th
                          key={ch.id || cIdx}
                          className="p-3 text-center text-sky-400 border-l border-slate-800 min-w-[85px]"
                        >
                          <div className="font-bold">#{ch.challanNum.replace(/^DC-?/i, 'DC-')}</div>
                          <div className="text-[9px] text-slate-500 font-normal">Phase {ch.batchSequence || cIdx + 1}</div>
                        </th>
                      ))}

                      {/* Header button for next DC */}
                      <th className="p-2 text-center border-l border-slate-800 bg-[#df9c20]/15 min-w-[85px]">
                        <button
                          type="button"
                          onClick={() => onOpenCreateChallan(activeMatrixProject.quoteKey)}
                          className="px-2 py-0.5 bg-[#df9c20] text-black font-black text-[10px] rounded hover:bg-[#c98918] cursor-pointer mx-auto flex items-center gap-1 shadow-2xs"
                        >
                          <span>+</span>
                          <span>New DC</span>
                        </button>
                      </th>

                      <th className="p-3 text-center text-emerald-400 bg-emerald-500/10 border-l border-slate-800">
                        Delivered
                      </th>
                      <th className="p-3 text-center text-amber-400 bg-amber-500/10 border-l border-slate-800">
                        Pending
                      </th>
                      <th className="p-3 text-center border-l border-slate-800">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800 font-mono text-slate-200">
                    {activeMatrixRows.map(row => (
                      <tr key={row.sNo} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-center text-slate-500">{row.sNo}</td>
                        <td className="p-3 font-bold text-white">{row.sku}</td>
                        <td className="p-3 font-sans">
                          <div className="font-bold text-white text-xs">{row.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {row.watt && <span>⚡ {row.watt}</span>}
                            {row.cct && <span>• 💡 {row.cct}</span>}
                            {row.finish && <span>• 🎨 {row.finish}</span>}
                          </div>
                        </td>
                        <td className="p-3 text-center font-black text-white bg-[#151c28]">
                          {row.orderedQty}
                        </td>

                        {/* Per-Challan Cells */}
                        {row.perChallanQty.map((qty, qIdx) => (
                          <td
                            key={qIdx}
                            className="p-3 text-center border-l border-slate-800 text-sky-300 font-semibold"
                          >
                            {qty > 0 ? qty : <span className="text-slate-600">-</span>}
                          </td>
                        ))}

                        {/* Quick Add row action */}
                        <td
                          onClick={() => onOpenCreateChallan(activeMatrixProject.quoteKey)}
                          className="p-3 text-center border-l border-slate-800 text-[#df9c20] hover:text-white hover:bg-[#df9c20]/30 font-bold text-[11px] cursor-pointer transition-colors"
                          title={`Click to dispatch ${row.sku} in next phase`}
                        >
                          {row.pendingQty > 0 ? `+ Add (${row.pendingQty})` : '+ Add'}
                        </td>

                        <td className="p-3 text-center font-black text-emerald-400 bg-emerald-500/10 border-l border-slate-800">
                          {row.totalDelivered}
                        </td>

                        <td className={`p-3 text-center font-bold border-l border-slate-800 ${
                          row.pendingQty === 0 ? 'text-slate-500' : 'text-amber-400'
                        }`}>
                          {row.pendingQty}
                        </td>

                        <td className="p-3 text-center border-l border-slate-800 font-sans">
                          {row.isComplete ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ✓ Complete
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {row.pendingQty} Left
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Summary Totals Footer */}
                  <tfoot className="bg-[#101622] font-mono font-bold text-white border-t-2 border-slate-700">
                    <tr>
                      <td colSpan={3} className="p-3 text-right text-slate-400 uppercase text-[10px] tracking-wider">
                        Total Project Units:
                      </td>
                      <td className="p-3 text-center text-white bg-[#151c28]">
                        {activeMatrixRows.reduce((s, r) => s + r.orderedQty, 0)}
                      </td>
                      {activeMatrixProject.challans.map((ch, cIdx) => {
                        const phaseSum = activeMatrixRows.reduce((s, r) => s + (r.perChallanQty[cIdx] || 0), 0);
                        return (
                          <td key={cIdx} className="p-3 text-center text-sky-400 border-l border-slate-800">
                            {phaseSum}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center border-l border-slate-800 text-slate-500">-</td>
                      <td className="p-3 text-center text-emerald-400 bg-emerald-500/10 border-l border-slate-800">
                        {activeMatrixRows.reduce((s, r) => s + r.totalDelivered, 0)}
                      </td>
                      <td className="p-3 text-center text-amber-400 bg-amber-500/10 border-l border-slate-800">
                        {activeMatrixRows.reduce((s, r) => s + r.pendingQty, 0)}
                      </td>
                      <td className="p-3 text-center border-l border-slate-800 font-sans text-xs">
                        {activeMatrixRows.every(r => r.isComplete) ? '✓ 100%' : 'In Progress'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* DETAIL VIEW 2: ALL PROJECTS SUMMARY TABLE */}
          {matrixDetailView === 'projects' && (
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121824] text-slate-300 font-mono uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Project / Quote</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">Phases</th>
                    <th className="p-3 text-center">Ordered</th>
                    <th className="p-3 text-center text-sky-400">Dispatched</th>
                    <th className="p-3 text-center text-amber-400">Pending</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-medium">
                  {projectGroups.map((pg, idx) => {
                    const ordered = pg.totalOrderedUnits;
                    const dispatched = pg.totalDispatchedUnits;
                    const pending = Math.max(0, ordered - dispatched);
                    const isDone = pending === 0 && ordered > 0;

                    return (
                      <tr key={pg.quoteKey} className="hover:bg-neutral-50 transition-colors">
                        <td className="p-3 text-neutral-500 font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-neutral-900">
                          #{pg.quoteNum}
                        </td>
                        <td className="p-3 font-bold text-neutral-900">
                          {pg.client}
                          <div className="text-[10px] text-neutral-500 font-normal truncate max-w-xs">{pg.siteAddress}</div>
                        </td>
                        <td className="p-3 font-mono text-xs">
                          <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded font-bold">
                            {pg.challans.length} Phases
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-neutral-800">{ordered}</td>
                        <td className="p-3 text-center font-mono font-black text-emerald-700 bg-emerald-50">{dispatched}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-700">{pending}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {isDone ? '✓ 100% Complete' : `${pending} Left`}
                          </span>
                        </td>
                        <td className="p-3 text-right flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMatrixQuoteKey(pg.quoteKey);
                              setMatrixDetailView('table');
                            }}
                            className="px-2.5 py-1 bg-[#7b3f22] hover:bg-[#5f3019] text-white font-bold text-[11px] rounded-lg cursor-pointer"
                          >
                            Inspect Items ▾
                          </button>
                          {onOpenMaterialMatrix && (
                            <button
                              type="button"
                              onClick={() => onOpenMaterialMatrix(pg.quote)}
                              className="px-2.5 py-1 bg-neutral-800 hover:bg-black text-white font-bold text-[11px] rounded-lg cursor-pointer"
                            >
                              Modal ↗
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: FLAT LIST (CLASSIC VIEW) */}
      {viewMode === 'flat' && (
        <div className="space-y-4">
          {filteredChallans.map(dc => {
            const linkedQuote = dc.quoteId
              ? savedQuotes[dc.quoteId]
              : Object.values(savedQuotes).find(
                  q => q.quoteNum === dc.quoteNum && (!dc.client || !q.client || dc.client.toLowerCase() === q.client.toLowerCase())
                );
            const totalUnits = (dc.items || []).reduce((s, it) => s + (it.qtyDispatched || 0), 0);

            return (
              <div
                key={dc.id}
                className="bg-white rounded-2xl border border-neutral-200 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
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

                <div className="p-4 flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs text-neutral-600">
                    Vehicle: <strong className="text-neutral-900 font-mono">{dc.vehicleNumber || 'Internal Van'}</strong> • Driver: <strong className="text-neutral-900">{dc.allocatedPerson || dc.driverName || 'Dispatch'}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenPodSimulator && (
                      <button
                        type="button"
                        onClick={() => onOpenPodSimulator(dc, linkedQuote)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <span>✍️</span>
                        <span>POD &amp; Pay</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenEditChallan(dc, 'edit')}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenEditChallan(dc, 'slip')}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span>🖨️</span>
                      <span>View Slip</span>
                    </button>
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
