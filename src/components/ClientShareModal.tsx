import React, { useState, useId, useEffect } from 'react';
import { QuotationDocument, BranchProfile } from '../types';
import { safeUtf8ToBase64 } from '../utils/shareUtils';
import { savePublicProposal } from '../firebase/syncService';

interface ClientShareModalProps {
  quote: QuotationDocument;
  branch: BranchProfile;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const ClientShareModal: React.FC<ClientShareModalProps> = ({
  quote,
  branch,
  onClose,
  onShowToast
}) => {
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [includeBankDetails, setIncludeBankDetails] = useState<boolean>(true);
  const [proposalId] = useState<string>(() => `AL-${(quote.quoteNum || 'QT').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36)}`);
  const [isPersisted, setIsPersisted] = useState<boolean>(false);
  const expirySelectId = useId();
  const clientPhoneId = useId();
  const clientEmailId = useId();

  // Save proposal to Firestore and localStorage so it is publicly accessible to any client
  useEffect(() => {
    const expTimestamp = expiryDays > 0 ? Date.now() + expiryDays * 86400000 : 0;
    const cleanQuote: QuotationDocument = {
      ...quote,
      showBank: includeBankDetails,
      bankDetails: includeBankDetails ? (branch.bankDetails || quote.bankDetails) : undefined,
      items: (quote.items || []).map(it => ({
        ...it,
        img: it.img && it.img.startsWith('data:image') && it.img.length > 5000 ? '' : it.img
      }))
    };

    const payload = {
      id: proposalId,
      quote: cleanQuote,
      branch: {
        id: branch.id,
        name: branch.name,
        tagline: branch.tagline,
        location: branch.location,
        address: branch.address,
        gstin: branch.gstin,
        email: branch.email,
        phone: branch.phone,
        quotePrefix: branch.quotePrefix,
        logoUrl: branch.logoUrl,
        theme: branch.theme,
        bankDetails: branch.bankDetails
      },
      created: Date.now(),
      expiresAt: expTimestamp
    };

    try {
      localStorage.setItem(`artelume_shared_${proposalId}`, JSON.stringify(payload));
      localStorage.setItem('artelume_last_shared_quote', JSON.stringify(payload));
    } catch (e) {}

    savePublicProposal(payload).then(() => {
      setIsPersisted(true);
    }).catch(err => {
      console.warn('Firestore proposal save notice:', err);
    });
  }, [proposalId, expiryDays, includeBankDetails, quote, branch]);

  // Generate self-contained URL
  const generateLink = (days: number): string => {
    const expTimestamp = days > 0 ? Date.now() + days * 86400000 : 0;
    const cleanQuote: QuotationDocument = {
      ...quote,
      showBank: includeBankDetails,
      bankDetails: includeBankDetails ? (branch.bankDetails || quote.bankDetails) : undefined,
      items: (quote.items || []).map(it => ({
        ...it,
        img: it.img && it.img.startsWith('data:image') && it.img.length > 5000 ? '' : it.img
      }))
    };

    const payload = {
      quote: cleanQuote,
      branch: {
        id: branch.id,
        name: branch.name,
        tagline: branch.tagline,
        location: branch.location,
        address: branch.address,
        gstin: branch.gstin,
        email: branch.email,
        phone: branch.phone,
        quotePrefix: branch.quotePrefix,
        logoUrl: branch.logoUrl,
        theme: branch.theme,
        bankDetails: branch.bankDetails
      },
      created: Date.now(),
      expiresAt: expTimestamp
    };

    try {
      const jsonStr = JSON.stringify(payload);
      const encoded = safeUtf8ToBase64(jsonStr);
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      return `${baseUrl}?view=client&id=${proposalId}${encoded ? `&data=${encodeURIComponent(encoded)}` : ''}${expTimestamp ? `&exp=${expTimestamp}` : ''}`;
    } catch (e) {
      console.error('Error generating client view link:', e);
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      return `${baseUrl}?view=client&id=${proposalId}`;
    }
  };

  const shareableUrl = generateLink(expiryDays);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      onShowToast('🔗 Client View link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onShowToast('Could not copy link automatically. Please copy the text manually.');
    }
  };

  const getExpiryLabel = (days: number) => {
    if (days === 0) return 'Never Expires (Permanent)';
    const d = new Date(Date.now() + days * 86400000);
    return `Valid for ${days} days (Expires ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`;
  };

  // WhatsApp share
  const handleWhatsAppShare = () => {
    const totalVal = quote.items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0) * (1 + (quote.gst || 18) / 100);
    const formattedTotal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalVal);
    const expiryText = expiryDays > 0 
      ? `\n⏳ *Validity:* Link active until ${new Date(Date.now() + expiryDays * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : '';

    const text = `Dear ${quote.client || 'Valued Client'},\n\nPlease review your architectural lighting proposal from *${branch.name}*:\n\n📄 *Quotation Ref:* ${quote.quoteNum || 'AL-QT'}\n💼 *Project:* ${quote.name || quote.client || 'Lighting Project'}\n💰 *Total Proposal:* ${formattedTotal} (incl. GST)\n\n🔗 *Click to view your interactive proposal:*\n${shareableUrl}${expiryText}\n\nYou can review complete luminaire specifications, download the A4 PDF, or approve directly through the link.\n\nWarm regards,\n*${branch.name}*\n${branch.phone ? `📞 ${branch.phone}` : ''}`;

    const cleanNum = clientPhone.replace(/[^0-9]/g, '');
    const waUrl = cleanNum
      ? `https://wa.me/${cleanNum.startsWith('91') || cleanNum.length > 10 ? cleanNum : `91${cleanNum}`}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank');
  };

  // Email share
  const handleEmailShare = () => {
    const subject = `Architectural Lighting Quotation #${quote.quoteNum || ''} — ${branch.name}`;
    const body = `Dear ${quote.client || 'Valued Client'},\n\nPlease find the read-only link to your customized architectural lighting quotation proposal below:\n\n${shareableUrl}\n\nQuotation Details:\n• Quote Reference: ${quote.quoteNum || 'N/A'}\n• Project / Client: ${quote.name || quote.client || 'N/A'}\n• Issuing Studio: ${branch.name} (${branch.location})\n${expiryDays > 0 ? `• Link Expiration: ${new Date(Date.now() + expiryDays * 86400000).toLocaleDateString('en-IN')}\n` : ''}\nPlease feel free to reach out if you require any adjustments or luminaire samples.\n\nSincerely,\n${branch.name}\n${branch.email} | ${branch.phone || ''}`;

    window.location.href = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareableUrl)}&color=170e08&bgcolor=ffffff`;

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[1050] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#fcfaf7] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-[#d9cbb9] my-auto">
        {/* Modal Header */}
        <div
          className="p-4 sm:p-5 text-white flex items-center justify-between"
          style={{ backgroundColor: branch.theme.primaryColor }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl shrink-0 shadow-xs">
              🔗
            </div>
            <div>
              <div className="font-serif text-lg font-bold tracking-wide text-white flex items-center gap-2">
                <span>Share Client View Link</span>
                <span className="text-[10px] font-sans font-bold uppercase bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full">
                  Read-Only
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Generate a temporary link to send directly to your client via WhatsApp, Phone or Email
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Link Generation Box */}
          <div className="bg-white p-3.5 rounded-xl border border-[#d9cbb9] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="client-share-link-input" className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                <span>🔒 Secure Proposal Link</span>
              </label>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Self-Contained • Instant Access
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="client-share-link-input"
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 bg-[#faf8f5] border border-gray-300 rounded-lg px-3 py-2 font-mono text-[11px] text-gray-800 select-all outline-none focus:border-[#7b3f22]"
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#df9c20] hover:bg-[#c88916] text-[#170e08]'
                }`}
              >
                <span>{copied ? '✓' : '📋'}</span>
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Expiration & Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Expiration Duration */}
            <div className="bg-white p-3 rounded-xl border border-[#d9cbb9]">
              <label htmlFor={expirySelectId} className="font-bold text-gray-800 block mb-1">
                ⏳ Link Expiration Duration
              </label>
              <select
                id={expirySelectId}
                value={expiryDays}
                onChange={e => setExpiryDays(Number(e.target.value))}
                className="w-full bg-[#faf8f5] border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 outline-none focus:border-[#7b3f22] cursor-pointer"
              >
                <option value={2}>Expires in 48 Hours</option>
                <option value={7}>Expires in 7 Days (Recommended)</option>
                <option value={14}>Expires in 14 Days</option>
                <option value={30}>Expires in 30 Days</option>
                <option value={0}>Never Expires (Permanent)</option>
              </select>
              <div className="text-[10px] text-gray-500 mt-1">
                {getExpiryLabel(expiryDays)}
              </div>
            </div>

            {/* Toggle Options */}
            <div className="bg-white p-3 rounded-xl border border-[#d9cbb9] flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeBankDetails}
                  onChange={e => setIncludeBankDetails(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="font-bold text-gray-800 text-xs">Include Bank Transfer Details</span>
              </label>
              <p className="text-[10px] text-gray-500 mt-1 pl-6">
                Enables client to view NEFT/RTGS/UPI info directly on their proposal document
              </p>
            </div>
          </div>

          {/* Fast Direct Dispatch: WhatsApp & Email */}
          <div className="bg-white p-3.5 rounded-xl border border-[#d9cbb9] space-y-3">
            <div className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
              <span>🚀 Direct Send to Client Phone or Email</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* WhatsApp Option */}
              <div className="space-y-1.5">
                <label htmlFor={clientPhoneId} className="text-[11px] font-semibold text-gray-600 flex items-center justify-between">
                  <span>Client Mobile / WhatsApp</span>
                  <span className="text-[10px] text-gray-400">Optional</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id={clientPhoneId}
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="flex-1 bg-[#faf8f5] border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-green-600"
                  />
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
                  >
                    <span>💬</span>
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Email Option */}
              <div className="space-y-1.5">
                <label htmlFor={clientEmailId} className="text-[11px] font-semibold text-gray-600 flex items-center justify-between">
                  <span>Client Email Address</span>
                  <span className="text-[10px] text-gray-400">Optional</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id={clientEmailId}
                    type="email"
                    placeholder="client@example.com"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    className="flex-1 bg-[#faf8f5] border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handleEmailShare}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
                  >
                    <span>✉️</span>
                    <span>Email</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code & Live Test Banner */}
          <div className="p-3 bg-[#f5ede4] rounded-xl border border-[#d9cbb9] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-white p-1 rounded-lg border border-[#d9cbb9] shrink-0 shadow-2xs">
                <img
                  src={qrApiUrl}
                  alt="Client View QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-xs">Scan on Phone Camera</div>
                <div className="text-[11px] text-gray-600 mt-0.5">
                  Instant mobile proposal preview without installing any apps
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.open(shareableUrl, '_blank')}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs shrink-0"
            >
              <span>↗</span>
              <span>Test Client View</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-neutral-100 border-t border-[#d9cbb9] flex items-center justify-between">
          <div className="text-[11px] text-gray-500">
            Client view is strictly <strong className="text-gray-800">read-only</strong> without editing or pricing margin controls.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 cursor-pointer shadow-2xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
