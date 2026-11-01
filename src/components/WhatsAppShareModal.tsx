import React, { useState, useEffect } from 'react';
import { QuotationDocument, BranchProfile } from '../types';
import {
  WhatsAppFormatType,
  buildWhatsAppMessage,
  safeUtf8ToBase64
} from '../utils/shareUtils';
import { savePublicProposal } from '../firebase/syncService';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuotationDocument;
  branch: BranchProfile;
  onShowToast: (msg: string) => void;
  onOpenPdfPreview?: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  quote,
  branch,
  onShowToast,
  onOpenPdfPreview
}) => {
  const [selectedFormat, setSelectedFormat] = useState<WhatsAppFormatType>('summary');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [includeLink, setIncludeLink] = useState<boolean>(true);
  const [includeBank, setIncludeBank] = useState<boolean>(true);
  const [clientUrl, setClientUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSavingLink, setIsSavingLink] = useState<boolean>(false);

  // Generate lightweight client view URL & persist to Firestore
  useEffect(() => {
    let isMounted = true;

    async function initClientLink() {
      const proposalId = `AL-${(quote.quoteNum || 'QT').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36)}`;
      const baseUrl = `${window.location.origin}${window.location.pathname}`;

      // 1. Sanitize items: Keep lightweight data for URL, strip massive embedded data URLs if too big
      const cleanQuote: QuotationDocument = {
        ...quote,
        showBank: includeBank,
        bankDetails: includeBank ? (branch.bankDetails || quote.bankDetails) : undefined,
        items: (quote.items || []).map(it => ({
          ...it,
          // If item image is a huge data URL, we keep it in Firestore but truncate for URL query string
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
        expiresAt: Date.now() + 14 * 86400000 // 14 days default
      };

      // Save to localStorage as immediate offline cache
      try {
        localStorage.setItem(`artelume_shared_${proposalId}`, JSON.stringify(payload));
        localStorage.setItem('artelume_last_shared_quote', JSON.stringify(payload));
      } catch (e) {}

      // Save to Firestore public collection so any client on phone or desktop can open without login
      setIsSavingLink(true);
      try {
        await savePublicProposal(payload);
      } catch (err) {
        console.warn('Could not save to Firestore, will fallback to URL params:', err);
      } finally {
        if (isMounted) setIsSavingLink(false);
      }

      // Compact encoded fallback string
      const jsonStr = JSON.stringify({ quote: cleanQuote, branch: payload.branch });
      const encoded = safeUtf8ToBase64(jsonStr);

      // Short clean URL with ID as primary and data as fallback
      const link = `${baseUrl}?view=client&id=${proposalId}${encoded ? `&data=${encodeURIComponent(encoded)}` : ''}`;
      if (isMounted) {
        setClientUrl(link);
      }
    }

    if (isOpen) {
      initClientLink();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, quote, branch, includeBank]);

  if (!isOpen) return null;

  // Build the live message
  const messageText = buildWhatsAppMessage({
    format: selectedFormat,
    quote,
    branch,
    clientLink: includeLink ? clientUrl : undefined,
    includeBank
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      onShowToast('📋 WhatsApp message copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onShowToast('Please copy message text manually from preview box.');
    }
  };

  const handleSendWhatsApp = () => {
    const cleanNum = clientPhone.replace(/[^0-9]/g, '');
    let targetNum = cleanNum;
    if (cleanNum) {
      if (cleanNum.length === 10) {
        targetNum = `91${cleanNum}`;
      }
    }

    const encodedMsg = encodeURIComponent(messageText);
    const waUrl = targetNum
      ? `https://wa.me/${targetNum}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;

    // Safe dispatch that works inside mobile Chrome and desktop
    const win = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.href = waUrl;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[1100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#170e08] text-[#ede5dc] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-white/10 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 p-4 sm:p-5 flex items-center justify-between border-b border-emerald-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-2xl shrink-0 shadow-sm">
              📱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base sm:text-lg text-white">
                  Share via WhatsApp
                </h3>
                <span className="text-[10px] font-sans font-black bg-emerald-400 text-stone-950 px-2 py-0.5 rounded-full">
                  INSTANT DISPATCH
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/80 mt-0.5">
                Formatted architectural proposal for #{quote.quoteNum || 'AL-001'} • {quote.client || 'Valued Client'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-black/20 hover:bg-black/40 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Format Selector Tabs */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-bold text-[#baa899] block mb-2">
              Select WhatsApp Format &amp; Style:
            </label>
            <div className="grid grid-cols-3 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setSelectedFormat('summary')}
                className={`py-2 px-2.5 rounded-lg text-center font-bold text-xs transition-all cursor-pointer ${
                  selectedFormat === 'summary'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-[#baaaa0] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="text-base mb-0.5">📊</div>
                <div>Summary &amp; Pricing</div>
                <div className="text-[9px] font-normal opacity-80 mt-0.5">Totals + Key Info</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('detailed')}
                className={`py-2 px-2.5 rounded-lg text-center font-bold text-xs transition-all cursor-pointer ${
                  selectedFormat === 'detailed'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-[#baaaa0] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="text-base mb-0.5">📑</div>
                <div>Full Luminaire Specs</div>
                <div className="text-[9px] font-normal opacity-80 mt-0.5">Item-by-item specs</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('pdf-submittal')}
                className={`py-2 px-2.5 rounded-lg text-center font-bold text-xs transition-all cursor-pointer ${
                  selectedFormat === 'pdf-submittal'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-[#baaaa0] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="text-base mb-0.5">📄</div>
                <div>PDF Format Notice</div>
                <div className="text-[9px] font-normal opacity-80 mt-0.5">Official Submittal</div>
              </button>
            </div>
          </div>

          {/* Options: Include Link & Bank */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#ede5dc]">
              <input
                type="checkbox"
                checked={includeLink}
                onChange={e => setIncludeLink(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-neutral-800 border-neutral-600"
              />
              <span>Include Online Client View Link</span>
              {isSavingLink && <span className="text-[10px] text-amber-400 animate-pulse">(Connecting...)</span>}
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#ede5dc]">
              <input
                type="checkbox"
                checked={includeBank}
                onChange={e => setIncludeBank(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-neutral-800 border-neutral-600"
              />
              <span>Include Bank Details</span>
            </label>
          </div>

          {/* Client WhatsApp Number (Optional) */}
          <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1.5">
            <label className="text-[11px] font-semibold text-[#baa899] flex items-center justify-between">
              <span>Client WhatsApp Mobile Number (Optional):</span>
              <span className="text-[10px] text-neutral-400">Leave blank to pick from WhatsApp contacts</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="bg-neutral-800 text-neutral-300 px-2.5 py-2 rounded-lg font-mono text-xs border border-white/10">
                +91
              </span>
              <input
                type="tel"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="Enter 10-digit mobile number (e.g. 9849012345)"
                className="flex-1 bg-neutral-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Live Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#baa899]">
              <span className="font-semibold flex items-center gap-1.5">
                <span>💬 Formatted WhatsApp Message Preview:</span>
              </span>
              <span className="text-emerald-400 font-mono text-[10px]">
                {messageText.length} characters
              </span>
            </div>
            <div className="bg-[#0b1410] border border-emerald-900/40 rounded-xl p-3.5 font-sans text-xs text-[#d1fae5] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto select-all selection:bg-emerald-700">
              {messageText}
            </div>
          </div>

          {/* PDF Format Actions Reminder */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs flex items-center justify-between gap-3 text-amber-200">
            <div className="flex items-center gap-2">
              <span className="text-lg">📄</span>
              <div>
                <div className="font-bold text-amber-300">Sending along with PDF file?</div>
                <div className="text-[10px] text-amber-200/80">
                  Preview or save the A4 PDF to your device to attach directly in WhatsApp chat
                </div>
              </div>
            </div>
            {onOpenPdfPreview && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPdfPreview();
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-[11px] shrink-0 cursor-pointer transition-colors shadow-sm"
              >
                👁️ Preview PDF
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>{copied ? '✅' : '📋'}</span>
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Formatted Text'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-stone-950 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-lg active:scale-95"
            >
              <span>📱</span>
              <span>Open &amp; Send on WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
