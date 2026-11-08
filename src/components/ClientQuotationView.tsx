import React, { useState } from 'react';
import { QuotationDocument, BranchProfile } from '../types';

interface ClientQuotationViewProps {
  quote: QuotationDocument;
  branch: BranchProfile;
  expiresAt?: number;
  isExpired?: boolean;
  onExitClientView: () => void;
}

export const ClientQuotationView: React.FC<ClientQuotationViewProps> = ({
  quote,
  branch,
  expiresAt,
  isExpired = false,
  onExitClientView
}) => {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approverName, setApproverName] = useState(quote.client || '');
  const [approverNotes, setApproverNotes] = useState('');
  const [isApproved, setIsApproved] = useState(quote.status === 'Accepted' || quote.status === 'Accepted & Paid');

  const formatInr = (val: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(val || 0));
  };

  const subtotal = (quote.items || []).reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
  const gstRate = Number(quote.gst) || 18;
  const gstAmount = subtotal * (gstRate / 100);
  const grandTotal = subtotal + gstAmount;

  const expiryDate = expiresAt ? new Date(expiresAt) : null;
  const expiryFormatted = expiryDate
    ? expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  // Handle Client Approval via WhatsApp
  const handleConfirmApproval = () => {
    setIsApproved(true);
    setShowApproveModal(false);

    const text = `*QUOTATION ACCEPTANCE*\n\nDear *${branch.name}* Team,\n\nI hereby approve and accept Quotation *#${quote.quoteNum}*.\n\n👤 *Client/Approver:* ${approverName}\n💼 *Project:* ${quote.name || quote.client || 'Lighting Project'}\n💰 *Approved Amount:* ${formatInr(grandTotal)} (incl. GST)\n${approverNotes ? `📝 *Notes:* ${approverNotes}\n` : ''}\nPlease issue the commercial proforma invoice and coordinate delivery schedule.\n\nThank you!`;

    const cleanNum = (branch.phone || '').replace(/[^0-9]/g, '');
    const waUrl = cleanNum
      ? `https://wa.me/${cleanNum.startsWith('91') || cleanNum.length > 10 ? cleanNum : `91${cleanNum}`}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank');
  };

  // If expired, show elegant expiration screen
  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-[#17191c] flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-2xl mx-auto my-auto w-full bg-white rounded-2xl border border-[#d9cbb9] shadow-xl overflow-hidden p-6 sm:p-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-3xl flex items-center justify-center mx-auto text-amber-700 shadow-xs">
            ⏳
          </div>

          <div>
            <div className="font-serif text-2xl font-bold tracking-wide text-[#7b3f22]">
              Quotation Link Expired
            </div>
            <div className="text-xs text-gray-500 mt-1 font-mono">
              Quotation #{quote.quoteNum || 'AL-QT'} • {quote.name || quote.client || 'Architectural Lighting'}
            </div>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 leading-relaxed text-left space-y-2">
            <p>
              This temporary quotation link was valid until{' '}
              <strong className="text-stone-900 font-bold">{expiryFormatted || 'recently'}</strong> and has now expired.
            </p>
            <p>
              Luminaire pricing, stock availability, and lead times may have been updated. Please contact the studio consultant directly to request a refreshed proposal or link renewal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {branch.phone && (
              <a
                href={`https://wa.me/${branch.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${branch.name}, my proposal link for Quote #${quote.quoteNum} has expired. Could you please send me an updated link?`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>💬</span>
                <span>WhatsApp {branch.name}</span>
              </a>
            )}

            {branch.email && (
              <a
                href={`mailto:${branch.email}?subject=${encodeURIComponent(`Request to Renew Quotation #${quote.quoteNum}`)}`}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#7b3f22] hover:bg-[#8e4928] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>✉️</span>
                <span>Email Studio</span>
              </a>
            )}

            <button
              type="button"
              onClick={onExitClientView}
              className="w-full sm:w-auto px-4 py-2.5 border border-stone-300 hover:bg-stone-100 rounded-xl text-xs font-semibold text-stone-700 cursor-pointer"
            >
              Studio Login
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-stone-400 py-4">
          {branch.name} • {branch.location} • {branch.address}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3efe9] text-[#17191c] flex flex-col font-sans">
      {/* Top Client View Floating Action Bar */}
      <header className="sticky top-0 z-50 bg-[#170e08]/95 backdrop-blur-md text-white border-b border-white/10 px-4 py-2.5 sm:px-6 no-print shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-serif font-bold text-sm tracking-wide text-white">
                  {branch.name}
                </span>
                <span className="text-[10px] font-sans font-bold uppercase bg-white/15 text-stone-200 px-2 py-0.5 rounded">
                  Client Proposal View
                </span>
                {isApproved && (
                  <span className="text-[10px] font-bold bg-emerald-500 text-stone-950 px-2 py-0.5 rounded-full">
                    ✓ Accepted
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#baa899] hidden sm:block">
                {expiryFormatted ? `Valid until ${expiryFormatted}` : 'Active Architectural Specification'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Print / Save as PDF */}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="Download or Print PDF Proposal"
            >
              <span>🖨️</span>
              <span>Download PDF</span>
            </button>

            {/* WhatsApp Contact */}
            {branch.phone && (
              <a
                href={`https://wa.me/${branch.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${branch.name}, I am reviewing quotation #${quote.quoteNum} (${quote.name || quote.client || ''}).`)}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>💬</span>
                <span className="hidden sm:inline">WhatsApp Studio</span>
                <span className="sm:hidden">WhatsApp</span>
              </a>
            )}

            {/* Accept / Approve Proposal Button */}
            {!isApproved ? (
              <button
                type="button"
                onClick={() => setShowApproveModal(true)}
                className="px-3.5 py-1.5 bg-[#df9c20] hover:bg-[#c88916] text-[#170e08] rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                <span>✓</span>
                <span>Approve Quotation</span>
              </button>
            ) : (
              <div className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs">
                <span>✓</span>
                <span>Proposal Approved</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Printable Document Card */}
      <main className="max-w-6xl mx-auto w-full p-3 sm:p-6 flex-1">
        <div className="bg-white rounded-2xl border border-[#d9cbb9] shadow-lg overflow-hidden printable-area">
          {/* Architectural Header Banner */}
          <div
            className="text-white p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-colors"
            style={{ backgroundColor: branch.theme.primaryColor }}
          >
            <div className="flex items-center gap-4 sm:gap-5">
              {branch.logoUrl && (
                <div className="bg-white/10 backdrop-blur-sm p-2 sm:p-2.5 rounded-xl border border-white/20 shrink-0 max-w-[140px] max-h-[80px] flex items-center justify-center">
                  <img
                    src={branch.logoUrl}
                    alt={`${branch.name} Logo`}
                    className="max-h-14 max-w-full object-contain"
                  />
                </div>
              )}
              <div>
                <div className="font-serif text-3xl sm:text-4xl font-bold tracking-wider text-[#f5eee6] flex items-center gap-2">
                  <span>{branch.name}</span>
                </div>
                <div className="text-xs sm:text-sm italic mt-1" style={{ color: branch.theme.accentColor }}>
                  {branch.tagline}
                </div>
                <div className="text-xs text-white/85 mt-1.5 max-w-lg leading-relaxed">
                  {branch.address}
                </div>
                <div className="text-[11px] text-white/75 mt-1 font-mono">
                  GSTIN: {branch.gstin} • {branch.email} {branch.phone ? `• ${branch.phone}` : ''}
                </div>
              </div>
            </div>

            <div className="text-left md:text-right border-t md:border-t-0 border-white/15 pt-3 md:pt-0 w-full md:w-auto">
              <div className="font-bold text-2xl sm:text-3xl tracking-wide uppercase" style={{ color: branch.theme.accentColor }}>
                QUOTATION
              </div>
              <div className="text-xs text-white/90 mt-0.5">Luminaire Specification &amp; Price Proposal</div>
              <div className="text-sm font-mono font-bold text-[#f2cf8c] mt-1.5"># {quote.quoteNum}</div>
              <div className="text-xs text-white/80 mt-1 font-medium">{branch.location}</div>
              {expiryFormatted && (
                <div className="inline-block mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  Valid Until: {expiryFormatted}
                </div>
              )}
            </div>
          </div>

          {/* Quotation Metadata Bar */}
          <div className="bg-[#fcfaf7] border-b border-[#ebdcd0] p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Client / Architect</div>
              <div className="font-bold text-sm text-[#17191c] mt-0.5">{quote.client || 'Valued Client'}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Project / Site</div>
              <div className="font-bold text-sm text-[#17191c] mt-0.5">{quote.name || 'Architectural Lighting'}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Issue Date</div>
              <div className="font-bold text-sm text-[#17191c] mt-0.5">{quote.date || new Date().toLocaleDateString('en-IN')}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Proposal Status</div>
              <div className="mt-0.5">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {isApproved ? 'Accepted ✓' : (quote.status || 'Active Proposal')}
                </span>
              </div>
            </div>
          </div>

          {/* Luminaire Specification Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr
                  className="text-white text-center font-bold"
                  style={{ backgroundColor: branch.theme.primaryColor }}
                >
                  <th className="p-3 border border-[#d9cbb9] w-12 text-center">Item</th>
                  {quote.showCode && <th className="p-3 border border-[#d9cbb9] min-w-[110px] text-left">Code</th>}
                  <th className="p-3 border border-[#d9cbb9] min-w-[280px] text-left">Product Description &amp; Technical Specifications</th>
                  <th className="p-3 border border-[#d9cbb9] w-24 text-center">Image</th>
                  <th className="p-3 border border-[#d9cbb9] w-14 text-center">Qty</th>
                  <th className="p-3 border border-[#d9cbb9] w-24 text-right">Unit Price (₹)</th>
                  <th className="p-3 border border-[#d9cbb9] w-28 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(quote.items || []).map((item, idx) => {
                  const lineTotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
                  return (
                    <tr
                      key={item.id || idx}
                      className={`border-b border-[#ebdcd0] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fdfbf9]'}`}
                    >
                      {/* Item # */}
                      <td className="p-3 border border-[#d9cbb9] font-semibold text-gray-500 text-center align-top pt-3.5">
                        {idx + 1}
                      </td>

                      {/* Product Code */}
                      {quote.showCode && (
                        <td className="p-3 border border-[#d9cbb9] text-left align-top font-mono font-bold text-gray-800">
                          {item.sku || 'AL-SPEC'}
                        </td>
                      )}

                      {/* Description & Specifications (Line 1 & Line 2) */}
                      <td className="p-3 border border-[#d9cbb9] text-left align-top space-y-1.5">
                        {/* Line 1: Product Description + Watt & CCT */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-[#17191c]">
                            {item.name || 'Architectural Luminaire'}
                          </span>
                          {(item.watt || item.cct) && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 bg-stone-100 text-stone-800 rounded border border-stone-200">
                              {item.watt && <span>⚡ {item.watt}</span>}
                              {item.watt && item.cct && <span>•</span>}
                              {item.cct && <span className="text-[#a75723]">💡 {item.cct}</span>}
                            </span>
                          )}
                        </div>

                        {/* Line 2: Technical Specifications Breakdown */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                          {(quote.showBeam ?? true) && item.beam && (
                            <span className="text-gray-700">
                              📐 Beam: <strong className="text-gray-900">{item.beam}</strong>
                            </span>
                          )}
                          {(quote.showCRI ?? true) && item.cri && (
                            <span className="text-gray-700">
                              🎯 CRI: <strong className="text-gray-900">{item.cri}</strong>
                            </span>
                          )}
                          {(quote.showIP ?? true) && item.ip && (
                            <span className="text-gray-700">
                              🛡️ IP: <strong className="text-gray-900">{item.ip}</strong>
                            </span>
                          )}
                          {(quote.showFinish ?? true) && item.finish && (
                            <span className="text-gray-700">
                              ✨ Finish: <strong className="text-gray-900">{item.finish}</strong>
                            </span>
                          )}
                          {(quote.showReflector ?? true) && item.reflector && (
                            <span className="text-gray-700">
                              🔆 Reflector: <strong className="text-gray-900">{item.reflector}</strong>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Product Image */}
                      <td className="p-2 border border-[#d9cbb9] text-center align-middle">
                        {item.img ? (
                          <img
                            src={item.img}
                            alt={item.name}
                            className="w-16 h-12 object-contain bg-white rounded border border-gray-200 mx-auto shadow-2xs"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400 font-mono italic">No Image</span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="p-3 border border-[#d9cbb9] text-center font-bold text-gray-800 align-top pt-3.5">
                        {item.qty}
                      </td>

                      {/* Unit Price */}
                      <td className="p-3 border border-[#d9cbb9] text-right font-medium text-gray-700 align-top pt-3.5">
                        {formatInr(item.price)}
                      </td>

                      {/* Line Total */}
                      <td className="p-3 border border-[#d9cbb9] text-right font-bold text-[#17191c] align-top pt-3.5">
                        {formatInr(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Summary & Bank Details Section */}
          <div className="p-6 bg-[#fcfaf7] border-t border-[#ebdcd0] grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Bank Details & Terms */}
            <div className="space-y-4">
              {quote.showBank !== false && (branch.bankDetails || quote.bankDetails) && (
                <div className="bg-white p-4 rounded-xl border border-[#d9cbb9] shadow-2xs space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#7b3f22] flex items-center gap-1.5">
                    <span>🏦 Bank Transfer / Payment Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Beneficiary Name</span>
                      <span className="font-semibold text-gray-900">{(branch.bankDetails || quote.bankDetails)?.accName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Bank Name</span>
                      <span className="font-semibold text-gray-900">{(branch.bankDetails || quote.bankDetails)?.bankName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Account Number</span>
                      <span className="font-mono font-bold text-gray-900">{(branch.bankDetails || quote.bankDetails)?.accNo}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">IFSC Code</span>
                      <span className="font-mono font-bold text-gray-900">{(branch.bankDetails || quote.bankDetails)?.ifsc}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-[11px] text-gray-500 space-y-1">
                <div className="font-bold text-gray-700">Commercial Terms:</div>
                <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                  <li>Prices are inclusive of standard optical fixtures &amp; drivers as specified.</li>
                  <li>Delivery timeline: 2 to 3 weeks upon quotation confirmation and advance payment.</li>
                  <li>All luminaires carry standard studio manufacturer warranty against defects.</li>
                </ul>
              </div>
            </div>

            {/* Right Column: Totals Box */}
            <div className="flex flex-col justify-end">
              <div className="bg-white p-5 rounded-xl border border-[#d9cbb9] shadow-2xs space-y-2.5">
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-bold text-gray-800">{formatInr(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>GST ({gstRate}%):</span>
                  <span className="font-bold text-gray-800">{formatInr(gstAmount)}</span>
                </div>

                <div className="pt-2.5 border-t border-[#ebdcd0] flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7b3f22] block">
                      Grand Total
                    </span>
                    <span className="text-[10px] text-gray-500">Inclusive of all taxes</span>
                  </div>
                  <div
                    className="text-2xl sm:text-3xl font-extrabold"
                    style={{ color: branch.theme.primaryColor }}
                  >
                    {formatInr(grandTotal)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <div className="p-4 bg-[#170e08] text-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-center sm:text-left text-white/70 text-[11px]">
              {branch.name} • {branch.location} • Luminaire Engineering &amp; Architectural Lighting Design
            </div>
            <button
              type="button"
              onClick={onExitClientView}
              className="text-[10px] text-white/40 hover:text-white/80 transition-colors no-print cursor-pointer"
            >
              Studio Login / Admin Mode ↗
            </button>
          </div>
        </div>
      </main>

      {/* Approval Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[1060] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#d9cbb9]">
            <div
              className="p-4 text-white flex items-center justify-between"
              style={{ backgroundColor: branch.theme.primaryColor }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">✓</span>
                <span className="font-serif font-bold text-base">Approve Quotation Proposal</span>
              </div>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Your Full Name</label>
                <input
                  type="text"
                  value={approverName}
                  onChange={e => setApproverName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 font-semibold outline-none focus:border-[#7b3f22]"
                  placeholder="e.g. Mr. Rajesh Sharma"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Additional Project Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={approverNotes}
                  onChange={e => setApproverNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-[#7b3f22]"
                  placeholder="e.g. Approved. Please coordinate with interior designer."
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                <div className="font-bold">Total Approved Amount: {formatInr(grandTotal)}</div>
                <p className="text-[11px] text-emerald-700">
                  Submitting approval will notify {branch.name} directly via WhatsApp with your project confirmation.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Confirm &amp; Notify Studio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
