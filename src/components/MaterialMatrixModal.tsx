import React, { useState } from 'react';
import { QuotationDocument, DeliveryChallan, BranchProfile } from '../types';
import { getLinkedChallansForQuote } from '../utils/challanAllocation';

interface MaterialMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuotationDocument;
  challans: DeliveryChallan[];
  branch: BranchProfile;
  onCreateNextChallan: (quote: QuotationDocument, prefilledSku?: string) => void;
  formatInr: (amount: number) => string;
  onShowToast: (msg: string) => void;
}

export const MaterialMatrixModal: React.FC<MaterialMatrixModalProps> = ({
  isOpen,
  onClose,
  quote,
  challans,
  branch,
  onCreateNextChallan,
  formatInr,
  onShowToast
}) => {
  const [downloadingDc, setDownloadingDc] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter linked challans strictly and accurately for this quotation
  const linkedChallans = getLinkedChallansForQuote(quote, challans, quote.name)
    .sort((a, b) => (a.batchSequence || 0) - (b.batchSequence || 0) || a.challanNum.localeCompare(b.challanNum));

  const cleanSku = (s?: string) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanName = (s?: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // Compute items matrix data
  const matrixRows = (quote.items || []).map((item, idx) => {
    const sku = (item.sku || '').trim() || `AL-SPEC-${idx + 1}`;
    const name = item.name || 'Architectural Luminaire';
    const orderedQty = Number(item.qty) || 0;

    // Dispatched qty per challan using multi-tier fuzzy & positional matching
    const perChallanQty = linkedChallans.map(ch => {
      const chItems = ch.items || [];
      const match = chItems.find(ci => {
        const ciSku = cleanSku(ci.sku);
        const tSku = cleanSku(item.sku);
        if (ciSku && tSku && (ciSku === tSku || ciSku.includes(tSku) || tSku.includes(ciSku))) {
          return true;
        }
        const ciNm = cleanName(ci.name);
        const tNm = cleanName(item.name);
        if (ciNm && tNm && (ciNm === tNm || ciNm.includes(tNm) || tNm.includes(ciNm))) {
          return true;
        }
        return false;
      }) || (chItems.length === (quote.items || []).length ? chItems[idx] : undefined);

      return match ? Number(match.qtyDispatched) || 0 : 0;
    });

    const totalDelivered = perChallanQty.reduce((sum, q) => sum + q, 0);
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

  const totalOrdered = matrixRows.reduce((sum, r) => sum + r.orderedQty, 0);
  const totalDispatched = matrixRows.reduce((sum, r) => sum + r.totalDelivered, 0);
  const totalPending = Math.max(0, totalOrdered - totalDispatched);
  const completionPct = totalOrdered > 0 ? Math.min(100, Math.round((totalDispatched / totalOrdered) * 100)) : (linkedChallans.length > 0 ? 100 : 0);

  const handleSimulatePdf = (dcNum: string) => {
    setDownloadingDc(dcNum);
    setTimeout(() => {
      setDownloadingDc(null);
      onShowToast(`✓ Delivery Challan #${dcNum} PDF generated and ready for print/download!`);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[1050] bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#121824] text-slate-100 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Header Strip */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#17202b] via-[#1a2330] to-[#121922] border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xl">📊</span>
              <h2 className="text-lg font-black tracking-tight text-white">
                Cumulative Material Matrix (Everything in One Table)
              </h2>
              <span className="font-mono text-xs font-black bg-[#df9c20] text-black px-2.5 py-0.5 rounded shadow-xs">
                #{quote.quoteNum || 'QT'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                completionPct === 100
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {completionPct}% Dispatched ({linkedChallans.length} Phases)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Client: <strong className="text-white">{quote.client || 'Client'}</strong> • Project: <strong className="text-white">{quote.name || quote.client}</strong> • Site: 📍 {quote.siteAddress || 'Site per Client Instructions'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onCreateNextChallan(quote)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-[#df9c20] text-black hover:bg-[#c98918] cursor-pointer transition shadow flex items-center gap-1.5"
            >
              <span>🚚</span>
              <span>+ New Challan (Phase {linkedChallans.length + 1})</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer flex items-center gap-1"
            >
              <span>🖨️</span>
              <span>Print Matrix</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#151c24] border border-slate-800 rounded-xl p-3.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Ordered</div>
              <div className="text-2xl font-black text-white font-mono mt-0.5">{totalOrdered}</div>
              <div className="text-[11px] text-slate-400">across {matrixRows.length} line items</div>
            </div>

            <div className="bg-[#151c24] border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-3.5">
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Total Dispatched</div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">{totalDispatched}</div>
              <div className="text-[11px] text-emerald-400 font-medium">across {linkedChallans.length} phases</div>
            </div>

            <div className="bg-[#151c24] border border-amber-500/30 bg-amber-500/5 rounded-xl p-3.5">
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Pending Dispatch</div>
              <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">{totalPending}</div>
              <div className="text-[11px] text-amber-300">{totalPending === 0 ? '✓ All fulfilled' : 'remaining to ship'}</div>
            </div>

            <div className="bg-[#151c24] border border-slate-800 rounded-xl p-3.5">
              <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Completion Rate</div>
              <div className="text-2xl font-black text-white font-mono mt-0.5">{completionPct}%</div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className={`h-full ${completionPct === 100 ? 'bg-emerald-500' : 'bg-[#df9c20]'}`}
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Master Cumulative Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0f141d]">
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#101622] text-slate-400 uppercase text-[10px] font-mono tracking-wider sticky top-0 z-10 border-b border-slate-800">
                  <tr>
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3 min-w-[130px]">SKU / Code</th>
                    <th className="p-3 min-w-[220px]">Fixture Description</th>
                    <th className="p-3 text-center bg-[#151c28] text-white">Ordered</th>
                    
                    {/* Dynamic DC Columns */}
                    {linkedChallans.map((ch, cIdx) => (
                      <th
                        key={ch.id || cIdx}
                        className="p-3 text-center text-sky-400 border-l border-slate-800 min-w-[80px]"
                      >
                        <div className="font-bold">#{ch.challanNum.replace(/^DC-?/i, 'DC-')}</div>
                        <div className="text-[9px] text-slate-500 font-normal">Phase {ch.batchSequence || cIdx + 1}</div>
                      </th>
                    ))}

                    {/* Direct + New DC header button */}
                    <th className="p-2 text-center border-l border-slate-800 bg-[#df9c20]/15 min-w-[85px]">
                      <button
                        type="button"
                        onClick={() => onCreateNextChallan(quote)}
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
                  {matrixRows.map(row => (
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
                        onClick={() => onCreateNextChallan(quote, row.sku)}
                        className="p-3 text-center border-l border-slate-800 text-[#df9c20] hover:text-white hover:bg-[#df9c20]/30 font-bold text-[11px] cursor-pointer transition-colors"
                        title={`Click to dispatch ${row.sku} in next delivery phase`}
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

                <tfoot className="bg-[#101622] font-mono font-bold text-white border-t-2 border-slate-700 sticky bottom-0">
                  <tr>
                    <td colSpan={3} className="p-3 text-right uppercase text-[10px] text-slate-400 font-sans">
                      Total Units:
                    </td>
                    <td className="p-3 text-center font-black text-white bg-[#151c28]">
                      {totalOrdered}
                    </td>

                    {linkedChallans.map((ch, cIdx) => {
                      const phaseTotal = (ch.items || []).reduce((s, it) => s + (it.qtyDispatched || 0), 0);
                      return (
                        <td key={cIdx} className="p-3 text-center text-sky-400 border-l border-slate-800 font-black">
                          {phaseTotal}
                        </td>
                      );
                    })}

                    <td className="p-3 text-center text-[#df9c20] font-black border-l border-slate-800 bg-[#df9c20]/10">
                      +
                    </td>

                    <td className="p-3 text-center text-emerald-400 bg-emerald-500/20 font-black border-l border-slate-800">
                      {totalDispatched}
                    </td>
                    <td className="p-3 text-center text-amber-400 font-black border-l border-slate-800">
                      {totalPending}
                    </td>
                    <td className="p-3 text-center border-l border-slate-800 text-emerald-300 font-sans">
                      {completionPct}% Dispatched
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Linked Delivery Phases Timeline Bar with 1-Click PDF Download Cards */}
          <div className="bg-[#151c24] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Linked Delivery Phases ({linkedChallans.length} Dispatches):
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">
                ✓ 1-Click PDF Save &amp; Slips Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* + Create New Challan CTA Card */}
              <button
                type="button"
                onClick={() => onCreateNextChallan(quote)}
                className="bg-[#df9c20]/10 hover:bg-[#df9c20]/20 border-2 border-dashed border-[#df9c20]/60 rounded-xl p-3.5 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#df9c20] text-black font-black text-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  +
                </div>
                <div>
                  <div className="font-bold text-xs text-[#df9c20]">
                    + Create New Challan
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Phase {linkedChallans.length + 1} • Dispatch Additional Units
                  </div>
                </div>
              </button>

              {/* Existing Challans */}
              {linkedChallans.map((ch, idx) => {
                const phaseUnits = (ch.items || []).reduce((s, it) => s + (it.qtyDispatched || 0), 0);
                const isDownloading = downloadingDc === ch.challanNum;

                return (
                  <div
                    key={ch.id || idx}
                    className="bg-[#111720] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-white">
                          #{ch.challanNum}
                        </span>
                        <span className="text-[10px] text-sky-400 bg-sky-950/60 px-1.5 py-0.2 rounded font-bold">
                          Phase {ch.batchSequence || idx + 1}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>📅 {ch.dispatchDate}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">{phaseUnits} Units</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        🚚 {ch.vehicleNumber || 'Internal Van'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSimulatePdf(ch.challanNum)}
                        disabled={isDownloading}
                        className="px-2.5 py-1 bg-red-600/90 hover:bg-red-600 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Download PDF Delivery Challan"
                      >
                        {isDownloading ? (
                          <span className="animate-spin text-xs">⏳</span>
                        ) : (
                          <span>📄</span>
                        )}
                        <span>{isDownloading ? 'Saving...' : 'PDF'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#0f141d] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div>
            Quotation: <strong className="text-white">#{quote.quoteNum || 'QT'}</strong> • Total Value: <strong className="text-[#df9c20] font-mono font-bold">{formatInr((quote.items || []).reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0) * 1.18)}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
