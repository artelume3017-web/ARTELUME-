import React, { useState } from 'react';

interface AppUsageGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateView?: (view: any) => void;
  brandPrimaryColor?: string;
  brandAccentColor?: string;
}

interface GuideStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  keyHighlights: { label: string; detail: string; icon: string }[];
  proTip: string;
  actionLabel?: string;
  actionView?: string;
}

export const AppUsageGuideModal: React.FC<AppUsageGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateView,
  brandPrimaryColor = '#7b3f22',
  brandAccentColor = '#df9c20'
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const steps: GuideStep[] = [
    {
      id: 'step-quotes',
      badge: 'Step 1 of 5',
      title: 'Architectural Quotations & Luminaire Specs',
      subtitle: 'Build luxury lighting schedules with complete optical and electrical details',
      icon: '💡',
      description:
        'Create professional quotations tailored for architects, interior designers, and luxury projects. Pick luminaires from the curated library or type custom specifications with zero effort.',
      keyHighlights: [
        {
          label: 'Comprehensive Specs',
          detail: 'Specify Wattage, CCT (2700K to 6500K / Tunable), Beam Angles (15° to 60°), CRI 90+, and Body Finish.',
          icon: '🎯'
        },
        {
          label: 'Automated Financials',
          detail: 'Adjust List Price, trade discounts (%), GST rates (5%, 12%, 18%, 28%), and instant subtotal recalculations.',
          icon: '⚡'
        },
        {
          label: 'Cloud & Local Auto-Save',
          detail: 'Every keystroke is saved immediately to your device and synchronized silently across all team devices.',
          icon: '☁️'
        }
      ],
      proTip: 'Use "Toggle Columns" to show or hide Beam, CRI, IP, Finish, or Reflectors based on client preference.',
      actionLabel: 'Open Quotation Builder',
      actionView: 'quote-builder'
    },
    {
      id: 'step-challans',
      badge: 'Step 2 of 5',
      title: 'Batch Delivery Challans & Site Dispatch',
      subtitle: 'Track material movement from warehouse to construction sites with signatures',
      icon: '🚚',
      description:
        'Deliver fixtures in multiple batches or all at once. The application automatically links every delivery challan to its parent quotation and tracks remaining quantities balance.',
      keyHighlights: [
        {
          label: 'Multi-Batch Deliveries',
          detail: 'Dispatch Phase 1 (COB Downlights) today and Phase 2 (Magnetic Tracks) next week with individual challan numbers (#DC-901, #DC-902).',
          icon: '📦'
        },
        {
          label: 'Driver & Vehicle Manifest',
          detail: 'Assign Artè Lume Fleet or 3rd-party logistics (courier docket, vehicle number, handler phone).',
          icon: '🚛'
        },
        {
          label: 'On-Site Digital Signature',
          detail: 'Capture client or site engineer signatures on mobile/tablet upon physical handover.',
          icon: '✍️'
        }
      ],
      proTip: 'Click "🚚 Create Delivery Challan" directly on any Saved Quotation card to auto-fill client and item details.',
      actionLabel: 'View Delivery Challans',
      actionView: 'delivery-challans'
    },
    {
      id: 'step-payments',
      badge: 'Step 3 of 5',
      title: 'Payments, Receipts & Bank Passbook Auto-Sync',
      subtitle: 'Bi-directional financial sync between quotations, challans, and bank statements',
      icon: '💰',
      description:
        'Record advance tokens and on-delivery payments. Every payment automatically credits your chosen bank account, updates the quotation status, and marks delivery challans as paid.',
      keyHighlights: [
        {
          label: 'Instant Payment Receipts',
          detail: 'Generate official PDF receipts (#RCP-001) with transaction reference numbers (NEFT, UPI, Cheque, Cash).',
          icon: '🧾'
        },
        {
          label: 'Automatic Status Evolution',
          detail: 'Quotes automatically advance from "Draft" → "Advance Received" → "Accepted & Paid" as funds arrive.',
          icon: '📈'
        },
        {
          label: 'Bank Passbook Integration',
          detail: 'Directly credits HDFC or ICICI bank accounts with a running ledger and audit-proof statement.',
          icon: '🏦'
        }
      ],
      proTip: 'Deleting a payment automatically reverts quotation and challan balances, keeping books 100% accurate.',
      actionLabel: 'Open Bank Accounts',
      actionView: 'bank'
    },
    {
      id: 'step-export',
      badge: 'Step 4 of 5',
      title: 'Branded PDF Proposals & 1-Click WhatsApp',
      subtitle: 'Share luxurious lighting schedules with architects and luxury clients instantly',
      icon: '📄',
      description:
        'Present your work in executive high-resolution formats. Send quotations directly to clients over WhatsApp or download print-ready PDFs with full studio branding and bank account QR codes.',
      keyHighlights: [
        {
          label: 'Executive PDF Schedules',
          detail: 'Architectural layout with company logo, GST details, fixture photos, terms & conditions, and bank details.',
          icon: '🖨️'
        },
        {
          label: '1-Click WhatsApp Format',
          detail: 'Formatted text message with emojis, power ratings, beam angles, quantities, and totals ready to send.',
          icon: '💬'
        },
        {
          label: 'Interactive Client Proposal Link',
          detail: 'Send a secure read-only web link where clients can review and approve quotations on their smartphones.',
          icon: '🔗'
        }
      ],
      proTip: 'Click "👁️ Preview PDF" on any quotation to check formatting and print directly from your browser or phone.',
      actionLabel: 'View Saved Quotations',
      actionView: 'quotations'
    },
    {
      id: 'step-sync',
      badge: 'Step 5 of 5',
      title: 'Multi-Device Staff Access & Studio Customization',
      subtitle: 'Connect phones, tablets, and computers with your 6-digit Studio Join Code',
      icon: '👑',
      description:
        'Studio Owners can invite staff across Hyderabad & Visakhapatnam branches. Assign dedicated roles (Admin, Sales Executive, Delivery Logistics) with personalized permissions.',
      keyHighlights: [
        {
          label: '6-Digit Team Join Code',
          detail: 'Share your studio invite code (e.g. AL-8429) to instantly connect staff devices to the same cloud catalog.',
          icon: '🔑'
        },
        {
          label: 'Role-Based Access Control',
          detail: 'Owners control P&L profit views and financial settings; sales staff handle quotations; delivery team manages challans.',
          icon: '🛡️'
        },
        {
          label: '100% Offline Capability',
          detail: 'Work seamlessly inside basement car parks or remote construction sites without internet connection.',
          icon: '📶'
        }
      ],
      proTip: 'Studio Owners can customize brand accent colors, logo, and branch bank accounts in "⚙ Settings".',
      actionLabel: 'Open Studio Settings',
      actionView: 'settings'
    }
  ];

  const currentStep = steps[currentStepIdx];

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      // Completed tour: mark in localStorage
      try {
        localStorage.setItem('artelume_onboarding_completed', 'true');
      } catch (e) {}
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const handleAction = () => {
    try {
      localStorage.setItem('artelume_onboarding_completed', 'true');
    } catch (e) {}
    if (currentStep.actionView && onNavigateView) {
      onNavigateView(currentStep.actionView);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in no-print"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#19110b] border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#ede5dc]"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundImage: `radial-gradient(circle at top right, ${brandPrimaryColor}40 0%, transparent 70%)`
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg border border-amber-400/40"
              style={{
                background: `linear-gradient(135deg, ${brandPrimaryColor}, #22120a)`
              }}
            >
              <span>{currentStep.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentStep.badge}
                </span>
                <span className="text-[11px] text-stone-400">Application User Guide</span>
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#f5eee6] tracking-wide mt-0.5">
                {currentStep.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-sm"
            title="Close guide"
          >
            ✕
          </button>
        </div>

        {/* Step Navigation Dots Bar */}
        <div className="px-5 pt-3 pb-2 bg-black/20 border-b border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStepIdx(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIdx
                    ? 'w-7 bg-amber-400'
                    : idx < currentStepIdx
                    ? 'w-2 bg-amber-500/50'
                    : 'w-2 bg-white/20'
                }`}
                title={`Jump to ${s.title}`}
              />
            ))}
          </div>

          <span className="text-[11px] text-stone-400 font-medium">
            {currentStepIdx + 1} of {steps.length}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Subtitle Intro */}
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-stone-200 leading-relaxed text-[12.5px] font-medium">
            {currentStep.subtitle}
          </div>

          {/* Description */}
          <p className="text-stone-300 leading-relaxed text-[12px]">
            {currentStep.description}
          </p>

          {/* Key Feature Highlights */}
          <div className="space-y-2.5 pt-1">
            <div className="text-[11px] uppercase tracking-wider font-bold text-amber-300">
              Key Capabilities:
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {currentStep.keyHighlights.map((feat, i) => (
                <div
                  key={i}
                  className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-start gap-3"
                >
                  <span className="text-base p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
                    {feat.icon}
                  </span>
                  <div>
                    <div className="font-bold text-stone-200 text-xs">{feat.label}</div>
                    <div className="text-[11.5px] text-stone-400 mt-0.5 leading-relaxed">
                      {feat.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tip Box */}
          <div className="p-3 bg-amber-950/30 border border-amber-600/30 rounded-xl flex items-start gap-2.5 text-[11.5px] text-amber-200/90">
            <span className="text-base shrink-0">💡</span>
            <div>
              <strong className="text-amber-300 font-bold">Studio Pro-Tip: </strong>
              <span>{currentStep.proTip}</span>
            </div>
          </div>
        </div>

        {/* Footer Navigation Controls */}
        <div className="p-4 sm:p-5 bg-black/60 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-300 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-2">
            {currentStep.actionLabel && (
              <button
                type="button"
                onClick={handleAction}
                className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-xs font-bold text-amber-200 bg-amber-900/40 hover:bg-amber-900/60 border border-amber-600/40 transition-colors cursor-pointer"
              >
                <span>{currentStep.actionLabel}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl text-xs font-black text-neutral-950 shadow-lg cursor-pointer transition-all hover:brightness-110 flex items-center gap-1.5"
              style={{
                background: `linear-gradient(135deg, ${brandAccentColor}, #ffcd38)`
              }}
            >
              <span>{currentStepIdx === steps.length - 1 ? 'Finish & Explore App ✓' : 'Next Step →'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
