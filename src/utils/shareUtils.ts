import { QuotationDocument, BranchProfile } from '../types';

/**
 * Safe UTF-8 Base64 Encoding & Decoding
 * Replaces deprecated unescape/escape which crashes on Indian Rupee symbol (₹),
 * accented characters like ARTÈ LUME (È), em-dashes (—), and emojis.
 */
export function safeUtf8ToBase64(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.error('Failed to encode string to base64:', err);
    return '';
  }
}

export function safeBase64ToUtf8(b64: string): string {
  try {
    const cleanB64 = b64.replace(/\s/g, '');
    const binary = atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (err) {
    console.error('Failed to decode base64 to string:', err);
    return '';
  }
}

export type WhatsAppFormatType = 'summary' | 'detailed' | 'pdf-submittal';

export function formatInrCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Math.round(amount || 0));
}

/**
 * Formats WhatsApp text message based on user-chosen format
 */
export function buildWhatsAppMessage({
  format,
  quote,
  branch,
  clientLink,
  expiryDays = 7,
  includeBank = true
}: {
  format: WhatsAppFormatType;
  quote: QuotationDocument;
  branch: BranchProfile;
  clientLink?: string;
  expiryDays?: number;
  includeBank?: boolean;
}): string {
  const items = quote.items || [];
  const subtotal = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
  const gstRate = Number(quote.gst) || 18;
  const gstAmount = subtotal * (gstRate / 100);
  const grandTotal = subtotal + gstAmount;

  const clientName = quote.client || 'Valued Client';
  const projectName = quote.name || 'Architectural Lighting Project';
  const quoteRef = quote.quoteNum || branch.quotePrefix || 'AL-QT';
  const quoteDate = quote.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const bank = branch.bankDetails || quote.bankDetails;
  let bankBlock = '';
  if (includeBank && bank && (quote.showBank !== false)) {
    bankBlock = `\n🏦 *BANK TRANSFER DETAILS:*\n• *A/c Name:* ${bank.accName}\n• *Bank:* ${bank.bankName}\n• *A/c No:* ${bank.accNo}\n• *IFSC:* ${bank.ifsc}\n• *Branch:* ${bank.branch}\n`;
  }

  const linkBlock = clientLink
    ? `\n🔗 *VIEW INTERACTIVE PROPOSAL ONLINE:*\n${clientLink}\n_(Review complete specifications, browse fixtures & approve directly)_\n`
    : '';

  // FORMAT 1: Executive Proposal Summary & Total Pricing
  if (format === 'summary') {
    return `*${branch.name}* — ${branch.tagline}
📍 ${branch.location}

Dear *${clientName}*,

Please find the financial proposal summary for *${projectName}*:

📄 *Quotation Ref:* #${quoteRef}
📅 *Date of Issue:* ${quoteDate}
💡 *Total Luminaires:* ${items.length} Fixtures (${items.reduce((s, it) => s + (Number(it.qty) || 0), 0)} Units)

📊 *FINANCIAL SUMMARY:*
• *Subtotal:* ${formatInrCurrency(subtotal)}
• *GST (${gstRate}%):* ${formatInrCurrency(gstAmount)}
• *GRAND TOTAL:* *${formatInrCurrency(grandTotal)}* (incl. GST)
${linkBlock}${bankBlock}
📄 _Official PDF document with luminaire technical cut sheets is attached._

Warm regards,
*${branch.name}*
📞 ${branch.phone || ''} | ✉️ ${branch.email || ''}`.trim();
  }

  // FORMAT 2: Detailed Line-by-Line Specifications
  if (format === 'detailed') {
    let text = `*${branch.name}* — ${branch.tagline}\n`;
    text += `📍 ${branch.location}\n\n`;
    text += `*QUOTATION SPECIFICATION SUBMITTAL*\n`;
    text += `📄 *Ref:* #${quoteRef} | 📅 *Date:* ${quoteDate}\n`;
    text += `👤 *Client:* ${clientName} | 🏢 *Project:* ${projectName}\n\n`;
    text += `*LUMINAIRE SCHEDULE (${items.length} Fixtures):*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;

    items.forEach((it, idx) => {
      const wattCct = [it.watt ? `⚡ ${it.watt}` : '', it.cct ? `💡 ${it.cct}` : ''].filter(Boolean).join(' • ');
      text += `*${idx + 1}. ${it.name || it.sku}*${wattCct ? ` (${wattCct})` : ''}\n`;
      if (it.beam) text += `   📐 Beam: ${it.beam}\n`;
      if (it.cri) text += `   🎯 CRI: ${it.cri}\n`;
      if (it.ip) text += `   🛡️ IP: ${it.ip}\n`;
      const finishRef = [it.finish ? `✨ ${it.finish}` : '', it.reflector ? `🔆 ${it.reflector}` : ''].filter(Boolean).join(' | ');
      if (finishRef) text += `   🎨 Finish: ${finishRef}\n`;
      const lineTotal = (Number(it.price) || 0) * (Number(it.qty) || 0);
      text += `   📦 Qty: *${it.qty}* × ${formatInrCurrency(it.price)} = *${formatInrCurrency(lineTotal)}*\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `• *Subtotal:* ${formatInrCurrency(subtotal)}\n`;
    text += `• *GST (${gstRate}%):* ${formatInrCurrency(gstAmount)}\n`;
    text += `• *GRAND TOTAL:* *${formatInrCurrency(grandTotal)}*\n`;
    text += `${linkBlock}${bankBlock}\n`;
    text += `_Thank you for partnering with ${branch.name}._\n`;
    text += `📞 ${branch.phone || ''}`;
    return text.trim();
  }

  // FORMAT 3: PDF / Document Submittal Notice
  return `*${branch.name}* — Architectural Lighting Specification
📍 ${branch.location}

Dear *${clientName}*,

We have generated your formal architectural lighting submittal document for *${projectName}* (#${quoteRef}).

📄 *Quotation Details:*
• Ref: *#${quoteRef}*
• Total Project Proposal: *${formatInrCurrency(grandTotal)}* (incl. GST)
• Fixtures: *${items.length} Items*

The full high-resolution A4 document with complete optical specifications, driver details, and brand identity is attached as a PDF.
${linkBlock}${bankBlock}
Please let us know if you require luminaire samples or mock-up verification.

Sincerely,
*${branch.name}*
📞 ${branch.phone || ''} | ✉️ ${branch.email || ''}`.trim();
}
