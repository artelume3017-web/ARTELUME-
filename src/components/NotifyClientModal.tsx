import React, { useState, useMemo } from 'react';
import { QuotationDocument, BranchProfile } from '../types';
import { QuotationReminderMeta } from '../utils/challanAllocation';
import { safeUtf8ToBase64 } from '../utils/shareUtils';

interface NotifyClientModalProps {
  meta: QuotationReminderMeta;
  branch: BranchProfile;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const NotifyClientModal: React.FC<NotifyClientModalProps> = ({
  meta,
  branch,
  onClose,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>('email');
  const quote = meta.quote;
  const quoteNum = quote.quoteNum || meta.quoteKey;
  const clientName = quote.client || quote.name || 'Valued Client';

  // Format currency
  const formatInr = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(n || 0);

  // Generate public view link
  const proposalLink = useMemo(() => {
    try {
      const proposalId = `AL-${quoteNum.replace(/[^a-zA-Z0-9]/g, '')}`;
      const payload = {
        quote: {
          ...quote,
          items: (quote.items || []).map(it => ({
            ...it,
            img: it.img && it.img.startsWith('data:image') && it.img.length > 5000 ? '' : it.img
          }))
        },
        branch: {
          name: branch.name,
          phone: branch.phone,
          email: branch.email,
          gstin: branch.gstin
        },
        created: Date.now()
      };
      const jsonStr = JSON.stringify(payload);
      const encoded = safeUtf8ToBase64(jsonStr);
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      return `${baseUrl}?view=client&id=${proposalId}${encoded ? `&data=${encodeURIComponent(encoded)}` : ''}`;
    } catch {
      return `${window.location.origin}${window.location.pathname}?view=client`;
    }
  }, [quote, quoteNum, branch]);

  // Default contact details
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>(() => {
    if (quote.clientPhone) return quote.clientPhone;
    const phoneMatch = ((quote.notes || '') + ' ' + (quote.client || '')).match(/(\+?\d{10,12})/);
    return phoneMatch ? phoneMatch[1] : '';
  });

  // Email subject & body states
  const [emailSubject, setEmailSubject] = useState<string>(() => {
    return `Follow-up: ${branch.name} Lighting Quotation #${quoteNum} for ${clientName}`;
  });

  const [emailBody, setEmailBody] = useState<string>(() => {
    const balanceText = meta.balanceDue > 0
      ? `• Outstanding Balance: ${formatInr(meta.balanceDue)} of ${formatInr(meta.grandTotal)}\n`
      : '';
    const deliveryText = meta.pendingDeliveryQty > 0
      ? `• Pending Material Dispatch: ${meta.pendingDeliveryQty} fixtures remaining to deliver\n`
      : '';

    return `Dear ${clientName},\n\n` +
      `Greetings from ${branch.name}.\n\n` +
      `We are following up on your architectural lighting quotation #${quoteNum} dated ${quote.date || 'earlier'}, which was submitted ${meta.ageDays} days ago.\n\n` +
      `Quotation Summary:\n` +
      `• Total Amount (incl. GST): ${formatInr(meta.grandTotal)}\n` +
      `• Total Received: ${formatInr(meta.totalPaid)}\n` +
      `${balanceText}` +
      `${deliveryText}` +
      `\nYou can inspect the detailed luminaire specifications, lighting layout schedules, and real-time updates directly via your online proposal link:\n` +
      `${proposalLink}\n\n` +
      `Please let us know if you require any revisions to the fixtures, optical beam angles, or site delivery timelines.\n\n` +
      `Warm regards,\n` +
      `${branch.name}\n` +
      `Architectural Lighting Solutions\n` +
      `Phone: ${branch.phone || '+91 98490 12345'}\n` +
      `Email: ${branch.email || 'contact@artelume.com'}`;
  });

  // WhatsApp text state
  const [whatsappBody, setWhatsappBody] = useState<string>(() => {
    const balanceText = meta.balanceDue > 0
      ? `💳 *Outstanding Balance:* ${formatInr(meta.balanceDue)}\n`
      : '';
    const deliveryText = meta.pendingDeliveryQty > 0
      ? `📦 *Pending Delivery:* ${meta.pendingDeliveryQty} fixtures\n`
      : '';

    return `✨ *${branch.name} — Lighting Studio*\n\n` +
      `Hello *${clientName}*,\n\n` +
      `Following up on your architectural lighting proposal *#${quoteNum}* (${meta.ageDays} days since issuance).\n\n` +
      `💰 *Total Value:* ${formatInr(meta.grandTotal)}\n` +
      `${balanceText}` +
      `${deliveryText}\n` +
      `🔗 *View Proposal & Specifications:*\n${proposalLink}\n\n` +
      `Please let us know if we can schedule the material dispatch or finalize site requirements!\n\n` +
      `— *${branch.name} Team* (${branch.phone || '+91 98490 12345'})`;
  });

  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(label);
      onShowToast(`📋 ${label} copied to clipboard!`);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      onShowToast('Could not copy automatically. Please copy text manually.');
    }
  };

  const handleSendEmail = () => {
    const to = clientEmail.trim();
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailto;
    onShowToast('Opening default email client...');
  };

  const handleSendWhatsApp = () => {
    let cleanPhone = clientPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappBody)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsappBody)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onShowToast('Opening WhatsApp...');
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[1060] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-neutral-300 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-[#1f1712] text-white flex items-center justify-between border-b border-[#3e271a] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📢</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-neutral-100">
                  Notify Client • Follow-up Reminder
                </h3>
                {meta.isOverdue30Days && (
                  <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {meta.ageDays}d OVERDUE
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                #{quoteNum} • {clientName} ({quote.status || 'Draft'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Status & Aging Meta Strip */}
        <div className="bg-amber-50/70 border-b border-amber-200/80 px-4 py-3 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-[10px] font-bold text-neutral-500 block">AGE / CREATED</span>
            <span className="font-extrabold text-neutral-800">
              {meta.ageDays} days ago
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-neutral-500 block">TOTAL VALUE</span>
            <span className="font-extrabold text-neutral-900">
              {formatInr(meta.grandTotal)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-neutral-500 block">BALANCE DUE</span>
            <span className={`font-extrabold ${meta.balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {meta.balanceDue > 0 ? formatInr(meta.balanceDue) : 'Nil (Fully Paid)'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-neutral-500 block">DELIVERY STATUS</span>
            <span className={`font-extrabold ${meta.pendingDeliveryQty > 0 ? 'text-indigo-700' : 'text-emerald-700'}`}>
              {meta.pendingDeliveryQty > 0 ? `${meta.pendingDeliveryQty} units pending` : 'All Delivered'}
            </span>
          </div>
        </div>

        {/* Channel Selector Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-100 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border-b-2 ${
              activeTab === 'email'
                ? 'bg-white border-[#7b3f22] text-[#7b3f22]'
                : 'text-neutral-600 hover:text-neutral-900 border-transparent'
            }`}
          >
            <span>✉️</span>
            <span>Follow-up Email Template</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border-b-2 ${
              activeTab === 'whatsapp'
                ? 'bg-white border-green-600 text-green-700'
                : 'text-neutral-600 hover:text-neutral-900 border-transparent'
            }`}
          >
            <span>💬</span>
            <span>WhatsApp Quick Message</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'email' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="e.g. client@example.com (or leave empty to select in mail client)"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs outline-none focus:border-[#7b3f22]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-semibold outline-none focus:border-[#7b3f22]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700">
                    Email Body Template (includes live proposal link)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(emailBody, 'Email Body')}
                    className="text-[11px] font-bold text-[#7b3f22] hover:underline cursor-pointer"
                  >
                    {copied === 'Email Body' ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  className="w-full p-3 border border-neutral-300 rounded-lg text-xs font-mono bg-neutral-50/70 outline-none focus:border-[#7b3f22] leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Client WhatsApp Number (10 digits or with +91)
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="e.g. +91 98490 12345"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs outline-none focus:border-green-600 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700">
                    WhatsApp Message Text
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(whatsappBody, 'WhatsApp Message')}
                    className="text-[11px] font-bold text-green-700 hover:underline cursor-pointer"
                  >
                    {copied === 'WhatsApp Message' ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={whatsappBody}
                  onChange={e => setWhatsappBody(e.target.value)}
                  className="w-full p-3 border border-neutral-300 rounded-lg text-xs font-mono bg-neutral-50/70 outline-none focus:border-green-600 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Proposal Link Notice */}
          <div className="p-3 bg-neutral-100 rounded-xl border border-neutral-200 text-xs text-neutral-600 flex items-start gap-2.5">
            <span className="text-base shrink-0">🔗</span>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-neutral-800 block">Verified Public Proposal Link Included</span>
              <span className="font-mono text-[10px] text-neutral-500 truncate block">
                {proposalLink}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(proposalLink, 'Proposal Link')}
              className="px-2 py-1 bg-white border border-neutral-300 rounded text-[11px] font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer shrink-0"
            >
              {copied === 'Proposal Link' ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-100 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {activeTab === 'email' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleCopy(emailBody, 'Email Body')}
                  className="px-3.5 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  📋 Copy Email
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="px-5 py-2 bg-[#7b3f22] hover:bg-[#603119] text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>✉️</span>
                  <span>Open in Mail App</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleCopy(whatsappBody, 'WhatsApp Message')}
                  className="px-3.5 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  📋 Copy Text
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>💬</span>
                  <span>Launch WhatsApp</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
