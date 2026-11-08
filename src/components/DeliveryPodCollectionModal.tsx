import React, { useState, useRef, useEffect } from 'react';
import { DeliveryChallan, QuotationDocument, BranchProfile, QuotationPaymentRecord } from '../types';

interface DeliveryPodCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  challan: DeliveryChallan;
  quote?: QuotationDocument;
  branch: BranchProfile;
  onConfirmPodPayment: (
    challanId: string,
    signatureDataUrl: string,
    receiverName: string,
    receiverPhone: string,
    amount: number,
    mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque',
    notes?: string
  ) => void;
  formatInr: (amount: number) => string;
  onShowToast: (msg: string) => void;
}

export const DeliveryPodCollectionModal: React.FC<DeliveryPodCollectionModalProps> = ({
  isOpen,
  onClose,
  challan,
  quote,
  branch,
  onConfirmPodPayment,
  formatInr,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'pod' | 'receipt'>('pod');
  const [receiverName, setReceiverName] = useState<string>(challan.recipientName || challan.client || '');
  const [receiverPhone, setReceiverPhone] = useState<string>(challan.contactPhone || '');
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMode, setCollectMode] = useState<'UPI' | 'Cash' | 'Cheque' | 'Bank Transfer'>('UPI');
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<{
    receiptNo: string;
    amount: number;
    mode: string;
    receiver: string;
    date: string;
    totalPaid: number;
    balanceDue: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Financial metrics
  const quoteTotal = quote
    ? (quote.items || []).reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0) * 1.18
    : 0;
  const quotePayments = quote?.payments || [];
  const quotePaid = quotePayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const quoteBalance = Math.max(0, quoteTotal - quotePaid);

  // Set default collect amount to remaining balance or reasonable phase value
  useEffect(() => {
    if (quoteBalance > 0) {
      setCollectAmount(quoteBalance);
    } else {
      setCollectAmount(challan.paymentCollected || 0);
    }
  }, [quoteBalance, challan.paymentCollected]);

  // Canvas drawing handlers
  useEffect(() => {
    if (!isOpen || activeTab !== 'pod') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  }, [isOpen, activeTab]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasSignature(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    const sigUrl = canvas ? canvas.toDataURL() : '';
    const recName = receiverName.trim() || challan.client || 'Client Receiver';
    const numAmt = Number(collectAmount) || 0;

    onConfirmPodPayment(
      challan.id,
      sigUrl,
      recName,
      receiverPhone.trim(),
      numAmt,
      collectMode,
      `Site payment collection against Delivery Challan #${challan.challanNum}`
    );

    const generatedReceiptNo = `RCP-POD-${challan.challanNum.replace(/^DC-?/i, '')}`;
    const newPaid = quotePaid + numAmt;
    const newBal = Math.max(0, quoteTotal - newPaid);

    setReceiptData({
      receiptNo: generatedReceiptNo,
      amount: numAmt,
      mode: collectMode,
      receiver: recName,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      totalPaid: newPaid,
      balanceDue: newBal
    });

    onShowToast(`✓ Delivery confirmed & ${formatInr(numAmt)} payment receipt created!`);
    setActiveTab('receipt');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1050] bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#121824] border border-neutral-800 rounded-2xl w-full max-w-4xl text-neutral-100 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#151c28] border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">💳</span>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Delivery Challan Payments &amp; Site Collection
              </h2>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                Phase Handover
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Challan <strong className="text-white font-mono">#{challan.challanNum}</strong> • Client: <strong className="text-white">{challan.client}</strong> • Site: 📍 {challan.siteAddress || 'Jubilee Hills, Hyderabad'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs font-bold bg-neutral-900 px-2.5 py-1 rounded border border-neutral-700 text-[#df9c20]">
              Quote #{challan.quoteNum || quote?.quoteNum || 'AL-3017'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-3 bg-[#0f141d] border-b border-neutral-800 shrink-0 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('pod')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pod'
                ? 'bg-[#df9c20] text-black shadow-sm font-extrabold'
                : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            <span>✍️</span>
            <span>1. On-Site POD &amp; UPI Payment Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'matrix'
                ? 'bg-[#df9c20] text-black shadow-sm font-extrabold'
                : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            <span>📊</span>
            <span>2. Multi-Phase Financial Matrix</span>
          </button>

          {receiptData && (
            <button
              type="button"
              onClick={() => setActiveTab('receipt')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'receipt'
                  ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              <span>🧾</span>
              <span>3. Official Delivery Receipt ({receiptData.receiptNo})</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: POD SIGNATURE & PAYMENT */}
          {activeTab === 'pod' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: Signature Canvas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <span>✍️</span>
                      <span>1. Client Touch Signature (Proof of Delivery)</span>
                    </span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                    >
                      Clear ↺
                    </button>
                  </div>

                  <div className="rounded-xl overflow-hidden border-2 border-dashed border-neutral-600 bg-white relative">
                    <canvas
                      ref={canvasRef}
                      width={420}
                      height={150}
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={stopDraw}
                      className="w-full h-36 bg-white cursor-crosshair touch-none"
                    />
                    {!hasSignature && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-400 text-xs italic">
                        Draw receiver signature here with finger or mouse...
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-neutral-400 block font-semibold mb-1">
                        Receiver Name *
                      </label>
                      <input
                        type="text"
                        value={receiverName}
                        onChange={e => setReceiverName(e.target.value)}
                        placeholder="e.g. Mr. Jahingir"
                        className="w-full bg-[#1c2433] border border-neutral-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#df9c20]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block font-semibold mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={receiverPhone}
                        onChange={e => setReceiverPhone(e.target.value)}
                        placeholder="+91 98490 12345"
                        className="w-full bg-[#1c2433] border border-neutral-700 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-[#df9c20]"
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Payment Collection & Dynamic UPI QR */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 uppercase tracking-wide">
                      2. On-Site Phase Payment
                    </span>
                    <span className="font-mono font-bold text-slate-300">
                      Balance: {formatInr(quoteBalance)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1 font-semibold">
                        Amount Collecting (₹)
                      </label>
                      <input
                        type="number"
                        value={collectAmount}
                        onChange={e => setCollectAmount(Number(e.target.value) || 0)}
                        className="w-full bg-[#1c2433] border border-amber-500/50 rounded-lg p-2 text-sm font-bold font-mono text-amber-300 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1 font-semibold">
                        Payment Mode
                      </label>
                      <select
                        value={collectMode}
                        onChange={e => setCollectMode(e.target.value as any)}
                        className="w-full bg-[#1c2433] border border-neutral-700 rounded-lg p-2 text-xs text-white font-medium focus:outline-none"
                      >
                        <option value="UPI">Instant UPI QR Scan</option>
                        <option value="Cash">Cash Handover</option>
                        <option value="Cheque">Cheque on Site</option>
                        <option value="Bank Transfer">NEFT / Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  {/* Dynamic UPI QR Box */}
                  <div className="bg-[#121824] border border-neutral-800 rounded-xl p-3 flex items-center gap-3.5">
                    <div className="w-20 h-20 bg-white p-1 rounded-lg shrink-0 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <rect x="0" y="0" width="100" height="100" fill="white" />
                        <rect x="8" y="8" width="28" height="28" fill="#121824" />
                        <rect x="14" y="14" width="16" height="16" fill="white" />
                        <rect x="64" y="8" width="28" height="28" fill="#121824" />
                        <rect x="70" y="14" width="16" height="16" fill="white" />
                        <rect x="8" y="64" width="28" height="28" fill="#121824" />
                        <rect x="14" y="70" width="16" height="16" fill="white" />
                        <rect x="42" y="16" width="12" height="20" fill="#121824" />
                        <rect x="58" y="38" width="16" height="10" fill="#121824" />
                        <rect x="42" y="68" width="20" height="12" fill="#121824" />
                        <rect x="72" y="58" width="10" height="26" fill="#121824" />
                        <circle cx="50" cy="50" r="6" fill="#df9c20" />
                      </svg>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-white flex items-center gap-1 text-[11px]">
                        <span>📱 GPay / PhonePe / Paytm / BHIM</span>
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        UPI: <strong className="text-neutral-200 font-mono">artelume.lighting@icici</strong>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-emerald-400">
                        Amount: {formatInr(collectAmount)}
                      </div>
                      <div className="text-[9px] text-neutral-500">
                        Auto-tagged: DC-{challan.challanNum.replace(/^DC-?/i, '')}
                      </div>
                    </div>
                  </div>

                  {/* Complete Handover Button */}
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <span>✓</span>
                    <span>Confirm Delivery &amp; Record {formatInr(collectAmount)}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FINANCIAL MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#151c24] border border-neutral-800 rounded-xl p-3.5">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase">Quotation Total</div>
                  <div className="text-xl font-extrabold text-white font-mono mt-0.5">{formatInr(quoteTotal)}</div>
                  <div className="text-[10px] text-neutral-500">incl. 18% GST</div>
                </div>

                <div className="bg-[#151c24] border border-neutral-800 rounded-xl p-3.5">
                  <div className="text-[10px] text-sky-400 font-bold uppercase">Dispatched Value</div>
                  <div className="text-xl font-extrabold text-sky-300 font-mono mt-0.5">{formatInr(quoteTotal)}</div>
                  <div className="text-[10px] text-emerald-400 font-bold">100% Dispatched</div>
                </div>

                <div className="bg-[#151c24] border border-neutral-800 rounded-xl p-3.5">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase">Total Collected</div>
                  <div className="text-xl font-extrabold text-emerald-300 font-mono mt-0.5">{formatInr(quotePaid)}</div>
                  <div className="text-[10px] text-neutral-400">{quoteTotal > 0 ? Math.round((quotePaid / quoteTotal) * 100) : 0}% paid so far</div>
                </div>

                <div className="bg-[#151c24] border border-amber-500/30 bg-amber-500/5 rounded-xl p-3.5">
                  <div className="text-[10px] text-amber-400 font-bold uppercase">Balance Due</div>
                  <div className="text-xl font-extrabold text-amber-400 font-mono mt-0.5">{formatInr(quoteBalance)}</div>
                  <div className="text-[10px] text-amber-300">Pending on Phase Handover</div>
                </div>
              </div>

              {/* Payments History Table */}
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-[#0f141d]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101622] text-neutral-400 font-mono uppercase text-[10px] border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Payment / Phase</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-200">
                    {quotePayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-neutral-500 italic">
                          No payments recorded yet for this project.
                        </td>
                      </tr>
                    ) : (
                      quotePayments.map((p, idx) => (
                        <tr key={idx} className="hover:bg-neutral-800/40">
                          <td className="p-3 font-semibold text-white">Payment #{idx + 1}</td>
                          <td className="p-3 text-neutral-400">{p.date}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">{formatInr(p.amount)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                              {p.paymentMode || p.mode || 'UPI'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-neutral-400">{p.referenceNo || p.ref || 'Direct Site Collection'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: OFFICIAL RECEIPT */}
          {activeTab === 'receipt' && receiptData && (
            <div className="bg-white text-neutral-900 rounded-2xl p-6 max-w-xl mx-auto shadow-2xl border border-neutral-300 space-y-5">
              <div className="flex items-start justify-between border-b border-neutral-200 pb-3">
                <div>
                  <div className="text-lg font-black tracking-tight text-neutral-950">
                    ARTÈ LUME LIGHTING STUDIO
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Official Delivery &amp; Milestone Payment Receipt
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="font-extrabold text-neutral-900">{receiptData.receiptNo}</div>
                  <div className="text-neutral-500 text-[10px]">{receiptData.date}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[10px] text-neutral-400 uppercase font-bold">Received From</div>
                  <div className="font-bold text-neutral-900 mt-0.5">{receiptData.receiver}</div>
                  <div className="text-neutral-600 text-[11px]">{challan.siteAddress || 'Jubilee Hills'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400 uppercase font-bold">Delivery Challan</div>
                  <div className="font-mono font-bold text-neutral-900 mt-0.5">#{challan.challanNum}</div>
                  <div className="text-neutral-600 text-[11px]">Quote: #{challan.quoteNum || 'AL-3017'}</div>
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                    Amount Received on Site
                  </div>
                  <div className="text-2xl font-black text-emerald-700 font-mono mt-0.5">
                    {formatInr(receiptData.amount)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                    ✓ {receiptData.mode} Received
                  </span>
                </div>
              </div>

              <div className="border-t border-b border-neutral-200 py-2.5 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-[10px] text-neutral-400 uppercase font-bold">Total Quote</div>
                  <div className="font-mono font-bold text-neutral-800">{formatInr(quoteTotal)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400 uppercase font-bold">Total Paid</div>
                  <div className="font-mono font-bold text-emerald-700">{formatInr(receiptData.totalPaid)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400 uppercase font-bold">Balance Left</div>
                  <div className="font-mono font-bold text-neutral-900">
                    {receiptData.balanceDue === 0 ? '✓ Fully Settled' : formatInr(receiptData.balanceDue)}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-end justify-between text-xs">
                <div>
                  <div className="w-28 h-8 border-b border-neutral-400 flex items-center justify-center italic text-neutral-700 font-serif text-sm">
                    {receiptData.receiver}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-bold mt-1">Client Signature</div>
                </div>
                <div className="text-right">
                  <div className="w-28 h-8 border-b border-neutral-400 flex items-center justify-center font-mono text-xs font-bold text-neutral-800">
                    ARTÈ LUME DISPATCH
                  </div>
                  <div className="text-[10px] text-neutral-500 font-bold mt-1">Authorised Signatory</div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-[#df9c20] text-black font-bold text-xs rounded-lg hover:bg-[#c98918] cursor-pointer shadow-xs"
                >
                  🖨️ Print Receipt
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0f141d] border-t border-neutral-800 flex justify-end gap-2 text-xs shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
