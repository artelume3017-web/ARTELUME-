import React, { useState } from 'react';
import { QuotationDocument, BranchProfile } from '../types';

interface PdfPreviewModalProps {
  quote: QuotationDocument;
  branch: BranchProfile;
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  onShareWhatsApp?: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  quote,
  branch,
  isOpen,
  onClose,
  onPrint,
  onShareWhatsApp
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      // Auto-fit for mobile portrait (e.g. 390px / 840px ≈ 45%)
      return Math.max(45, Math.floor((window.innerWidth - 32) / 840 * 100));
    }
    return 100;
  });

  if (!isOpen) return null;

  const formatInr = (val: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val || 0));
  };

  const subtotal = (quote.items || []).reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0),
    0
  );
  const gstRate = Number(quote.gst) || 18;
  const gstAmount = subtotal * (gstRate / 100);
  const grandTotal = subtotal + gstAmount;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[1150] flex flex-col justify-between overflow-hidden animate-in fade-in duration-150">
      {/* Top Floating Control Bar */}
      <div className="bg-[#170e08] text-white px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-xl">📄</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif font-bold text-sm tracking-wide text-white">
                PDF Document Preview
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-400 text-stone-950 px-2 py-0.5 rounded">
                #{quote.quoteNum || 'AL-QT'}
              </span>
              <span className="text-xs text-stone-300 hidden sm:inline">
                • {quote.name || quote.client || 'Client Proposal'}
              </span>
            </div>
            <p className="text-[11px] text-[#baa899] mt-0.5">
              Exact simulated A4 sheet view before sending to printer or saving as PDF
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Selector with Fit button */}
          <div className="flex items-center gap-1 bg-white/10 border border-white/15 rounded-lg px-2 py-1 text-xs text-stone-300">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(35, prev - 10))}
              className="px-1.5 hover:text-white font-bold cursor-pointer"
              title="Zoom Out"
            >
              -
            </button>
            <span className="font-mono text-[11px] w-10 text-center">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
              className="px-1.5 hover:text-white font-bold cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                const auto = Math.max(40, Math.min(100, Math.floor((window.innerWidth - 32) / 840 * 100)));
                setZoomLevel(auto);
              }}
              className="text-[10px] text-amber-300 hover:underline ml-1 cursor-pointer font-bold"
              title="Fit to Screen"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="text-[10px] text-stone-400 hover:text-white ml-0.5 cursor-pointer"
              title="100% Zoom"
            >
              100%
            </button>
          </div>

          {/* WhatsApp Share Button */}
          {onShareWhatsApp && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onShareWhatsApp();
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Share via WhatsApp"
            >
              <span>📱</span>
              <span className="hidden sm:inline">Share WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </button>
          )}

          {/* Direct Print Button */}
          <button
            type="button"
            onClick={() => {
              onClose();
              setTimeout(() => onPrint(), 250);
            }}
            className="px-3.5 py-1.5 bg-[#df9c20] hover:bg-[#c88916] text-[#170e08] rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <span>🖨️</span>
            <span>Print / PDF</span>
          </button>

          {/* Close Preview */}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Preview Sheet Canvas Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 bg-[#2b2b2b] flex justify-center">
        {/* Simulated A4 Paper Page */}
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out'
          }}
          className="w-full max-w-[840px] bg-white text-[#17191c] shadow-2xl rounded-sm border border-neutral-300 p-8 sm:p-10 flex flex-col justify-between my-2 min-h-[1050px]"
        >
          <div className="space-y-6">
            {/* 1. Header Banner */}
            <div
              className="text-white p-6 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors"
              style={{ backgroundColor: branch.theme.primaryColor }}
            >
              <div className="flex items-center gap-4">
                {branch.logoUrl && (
                  <div className="bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20 shrink-0 max-w-[130px] max-h-[70px] flex items-center justify-center">
                    <img
                      src={branch.logoUrl}
                      alt={branch.name}
                      className="max-h-12 max-w-full object-contain"
                    />
                  </div>
                )}
                <div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold tracking-wider text-[#f5eee6]">
                    {branch.name}
                  </div>
                  <div className="text-xs italic mt-0.5" style={{ color: branch.theme.accentColor }}>
                    {branch.tagline}
                  </div>
                  <div className="text-[11px] text-white/80 mt-1 max-w-md leading-tight">
                    {branch.address}
                  </div>
                  <div className="text-[10px] text-white/70 mt-0.5 font-mono">
                    GSTIN: {branch.gstin} • {branch.email} {branch.phone ? `• ${branch.phone}` : ''}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="font-bold text-2xl tracking-wide uppercase" style={{ color: branch.theme.accentColor }}>
                  QUOTATION
                </div>
                <div className="text-xs text-white/90">Luminaire Specification Proposal</div>
                <div className="text-xs font-mono font-bold text-[#f2cf8c] mt-1"># {quote.quoteNum}</div>
                <div className="text-[11px] text-white/75 mt-0.5 font-medium">{branch.location}</div>
              </div>
            </div>

            {/* 2. Client & Project Details Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#faf8f5] border border-[#ebdcd0] p-3.5 rounded-lg text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Client / Architect</span>
                <span className="font-bold text-gray-900">{quote.client || 'Valued Client'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Project / Site</span>
                <span className="font-bold text-gray-900">{quote.name || 'Architectural Lighting'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Date of Issue</span>
                <span className="font-semibold text-gray-800">{quote.date || new Date().toLocaleDateString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Proposal Status</span>
                <span className="font-semibold text-emerald-800">{quote.status || 'Draft'}</span>
              </div>
            </div>

            {/* 3. Luminaire Specification Table */}
            <div className="overflow-hidden border border-[#d9cbb9] rounded-lg">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr
                    className="text-white text-center font-bold"
                    style={{ backgroundColor: branch.theme.primaryColor }}
                  >
                    <th className="p-2 border border-[#d9cbb9] w-10 text-center">S.No</th>
                    {quote.showCode && <th className="p-2 border border-[#d9cbb9] min-w-[90px] text-left">Code</th>}
                    <th className="p-2 border border-[#d9cbb9] text-left">Product Description &amp; Specifications</th>
                    <th className="p-2 border border-[#d9cbb9] w-20 text-center">Image</th>
                    <th className="p-2 border border-[#d9cbb9] w-12 text-center">Qty</th>
                    {quote.showDiscount && (
                      <>
                        <th className="p-2 border border-[#d9cbb9] w-20 text-right">List Price</th>
                        <th className="p-2 border border-[#d9cbb9] w-12 text-center">Disc%</th>
                      </>
                    )}
                    <th className="p-2 border border-[#d9cbb9] w-20 text-right">Rate (₹)</th>
                    <th className="p-2 border border-[#d9cbb9] w-24 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(quote.items || []).map((item, idx) => {
                    const rowTotal = (Number(item.price) || 0) * (Number(item.qty) || 0);

                    return (
                      <tr
                        key={item.id || idx}
                        className={`border-b border-[#ebdcd0] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fcfaf7]'}`}
                      >
                        <td className="p-2 border border-[#d9cbb9] text-center font-semibold text-gray-500 align-top">
                          {idx + 1}
                        </td>

                        {quote.showCode && (
                          <td className="p-2 border border-[#d9cbb9] font-mono font-bold text-gray-900 align-top">
                            {item.sku || 'AL-SPEC'}
                          </td>
                        )}

                        <td className="p-2 border border-[#d9cbb9] text-left align-top space-y-1">
                          {/* Line 1: Description + Watt & CCT */}
                          <div className="font-bold text-sm text-[#17191c]">
                            {item.name || 'Architectural Fixture'}
                            {(item.watt || item.cct) && (
                              <span className="font-normal text-xs text-stone-600 ml-2">
                                {[item.watt ? `⚡ ${item.watt}` : '', item.cct ? `💡 ${item.cct}` : ''].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>

                          {/* Line 2: Optical & Electrical Specs */}
                          <div className="text-[10.5px] text-gray-600 space-x-2">
                            {(quote.showBeam ?? true) && item.beam && <span>📐 Beam: {item.beam}</span>}
                            {(quote.showCRI ?? true) && item.cri && <span>🎯 CRI: {item.cri}</span>}
                            {(quote.showIP ?? true) && item.ip && <span>🛡️ IP: {item.ip}</span>}
                            {(quote.showFinish ?? true) && item.finish && <span>✨ Finish: {item.finish}</span>}
                            {(quote.showReflector ?? true) && item.reflector && <span>🔆 Reflector: {item.reflector}</span>}
                          </div>
                        </td>

                        <td className="p-1.5 border border-[#d9cbb9] text-center align-middle">
                          {item.img ? (
                            <img
                              src={item.img}
                              alt={item.name}
                              className="w-14 h-10 object-contain mx-auto rounded border border-gray-200 bg-white"
                            />
                          ) : (
                            <span className="text-[9px] text-gray-400 font-mono italic">No Photo</span>
                          )}
                        </td>

                        <td className="p-2 border border-[#d9cbb9] text-center font-bold text-gray-800 align-top">
                          {item.qty}
                        </td>

                        {quote.showDiscount && (
                          <>
                            <td className="p-2 border border-[#d9cbb9] text-right text-gray-600 align-top">
                              {formatInr(item.listPrice || item.price)}
                            </td>
                            <td className="p-2 border border-[#d9cbb9] text-center font-semibold text-gray-700 align-top">
                              {item.discount ? `${item.discount}%` : '-'}
                            </td>
                          </>
                        )}

                        <td className="p-2 border border-[#d9cbb9] text-right font-medium text-gray-800 align-top">
                          {formatInr(item.price)}
                        </td>

                        <td className="p-2 border border-[#d9cbb9] text-right font-bold text-[#17191c] align-top">
                          {formatInr(rowTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4. Financial Summary & Bank Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Left Column: Bank Transfer Details */}
              <div className="space-y-3">
                {quote.showBank !== false && (branch.bankDetails || quote.bankDetails) && (
                  <div className="border border-[#d9cbb9] rounded-lg p-3 bg-[#faf8f5] text-[11px] space-y-1">
                    <span className="font-bold text-xs text-[#7b3f22] block uppercase tracking-wider">
                      Bank Transfer Details
                    </span>
                    <div><strong>A/c Name:</strong> {(branch.bankDetails || quote.bankDetails)?.accName}</div>
                    <div><strong>Bank:</strong> {(branch.bankDetails || quote.bankDetails)?.bankName} • <strong>A/c No:</strong> {(branch.bankDetails || quote.bankDetails)?.accNo}</div>
                    <div><strong>IFSC:</strong> {(branch.bankDetails || quote.bankDetails)?.ifsc} • <strong>Branch:</strong> {(branch.bankDetails || quote.bankDetails)?.branch}</div>
                  </div>
                )}

                <div className="text-[10px] text-gray-500 leading-tight">
                  <strong>Terms:</strong> Prices are valid for 30 days. Material will be dispatched upon receipt of advance. Luminaires carry standard manufacturer warranty against defects.
                </div>
              </div>

              {/* Right Column: Totals Summary */}
              <div className="border border-[#d9cbb9] rounded-lg p-3.5 bg-white space-y-2 text-xs flex flex-col justify-end">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-gray-900">{formatInr(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST ({gstRate}%):</span>
                  <span className="font-semibold text-gray-900">{formatInr(gstAmount)}</span>
                </div>
                <div className="pt-2 border-t border-[#ebdcd0] flex justify-between items-center">
                  <span className="font-bold text-sm uppercase text-[#7b3f22]">Grand Total</span>
                  <span
                    className="font-extrabold text-xl"
                    style={{ color: branch.theme.primaryColor }}
                  >
                    {formatInr(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Document Footer & Page Numbering */}
          <div className="pt-6 mt-6 border-t border-[#ebdcd0] flex justify-between items-center text-[10px] text-gray-400">
            <div>
              {branch.name} • {branch.location} • Architectural Lighting Specification Submittal
            </div>
            <div>
              Page 1 of 1 • System Generated
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
