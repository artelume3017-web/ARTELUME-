import ExcelJS from 'exceljs';
import { QuotationDocument, BranchProfile } from '../types';

export async function exportQuotationToExcel(quote: QuotationDocument, branchProfile?: BranchProfile): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Quotation', {
    views: [{ showGridLines: false }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });

  const client = quote.client || 'Valued Client';
  const date = quote.date || new Date().toLocaleDateString('en-GB');
  const gst = Number(quote.gst) || 18;

  // Active branch identity
  const branch = branchProfile || quote.branch;
  const companyName = branch?.name || 'ARTÈ LUME';
  const tagline = branch?.tagline || 'Architectural Lighting Studio';
  const address = branch?.address || 'Plot No. 1345, Road No. 68, Jubilee Hills, Hyderabad, Telangana - 500033';
  const gstin = branch?.gstin || '36AAACN4010N1ZW';
  const email = branch?.email || 'contact@artelume.com';
  const phone = branch?.phone ? ` | ${branch.phone}` : '';
  const bannerColor = branch?.theme?.excelBannerColor || 'FF7B3F22';
  const accentColor = branch?.theme?.excelAccentColor || 'FFDF9C20';
  const branchLocation = branch?.location || 'Jubilee Hills • Hyderabad';
  const branchLocationShort = branchLocation.split('•')[1]?.trim() || branchLocation;

  const hasLogo = Boolean(branch?.logoUrl && branch.logoUrl.startsWith('data:image'));

  // Standardized 9-column structural grid for bulletproof Excel rendering
  // Column A has fixed width 16 so Logo, CLIENT NAME:, and PROJECT / REF: never clip when Column B is hidden
  interface ColDef {
    header: string;
    key: string;
    width: number;
    align: 'center' | 'left' | 'right';
  }

  const columns: ColDef[] = [
    { header: 'S.No.', key: 'sno', width: 16, align: 'center' },                               // Col 1 (A)
    { header: 'Product Code', key: 'code', width: 17, align: 'left' },                           // Col 2 (B) - Can be hidden
    { header: 'Product Description & Specifications', key: 'desc', width: 44, align: 'left' },  // Col 3 (C)
    { header: 'Image', key: 'img', width: 18, align: 'center' },                                // Col 4 (D)
    { header: 'Qty', key: 'qty', width: 8, align: 'center' },                                   // Col 5 (E)
    { header: 'List Price (₹)', key: 'listPrice', width: 15, align: 'right' },                  // Col 6 (F) - Can be hidden
    { header: 'Disc %', key: 'discount', width: 10, align: 'center' },                          // Col 7 (G) - Can be hidden
    { header: 'Unit Price (₹)', key: 'unitPrice', width: 15, align: 'right' },                  // Col 8 (H)
    { header: 'Total (₹)', key: 'total', width: 17, align: 'right' }                            // Col 9 (I)
  ];

  const totalColCount = 9;
  const totalColLetter = 'I';
  ws.columns = columns.map(c => ({ width: c.width }));

  // Excel Native Column Hiding:
  // If showCode is false -> Hide Column B (Product Code) in Excel
  // If showDiscount is false -> Hide Column F (List Price) and Column G (Disc %) in Excel
  ws.getColumn(2).hidden = !quote.showCode;
  ws.getColumn(6).hidden = !quote.showDiscount;
  ws.getColumn(7).hidden = !quote.showDiscount;

  // Helper function to style rectangular ranges cleanly across all cells
  const styleRange = (
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    style: {
      fillColor?: string;
      borderColor?: string;
      borderStyle?: ExcelJS.BorderStyle;
      font?: Partial<ExcelJS.Font>;
      alignment?: Partial<ExcelJS.Alignment>;
    }
  ) => {
    const borderObj: Partial<ExcelJS.Borders> = style.borderColor
      ? {
          top: { style: style.borderStyle || 'thin', color: { argb: style.borderColor } },
          left: { style: style.borderStyle || 'thin', color: { argb: style.borderColor } },
          bottom: { style: style.borderStyle || 'thin', color: { argb: style.borderColor } },
          right: { style: style.borderStyle || 'thin', color: { argb: style.borderColor } }
        }
      : {};

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = ws.getCell(r, c);
        if (style.fillColor) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fillColor } };
        }
        if (style.borderColor) {
          cell.border = borderObj;
        }
        if (style.font && r === startRow && c === startCol) {
          cell.font = style.font;
        }
        if (style.alignment && r === startRow && c === startCol) {
          cell.alignment = style.alignment;
        }
      }
    }
  };

  // Set Row Heights for Header Rows 1 to 4
  ws.getRow(1).height = 24;
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 20;
  ws.getRow(4).height = 20;

  // Fill entire banner background (Rows 1-4, Cols A to I) with seamless studio theme
  // No internal vertical gridlines, matching website's elegant continuous banner
  for (let r = 1; r <= 4; r++) {
    for (let c = 1; c <= totalColCount; c++) {
      const cell = ws.getCell(r, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bannerColor } };
      cell.border = {
        top: r === 1 ? { style: 'thin', color: { argb: 'FF683318' } } : undefined,
        bottom: r === 4 ? { style: 'thin', color: { argb: 'FF683318' } } : undefined,
        left: c === 1 ? { style: 'thin', color: { argb: 'FF683318' } } : undefined,
        right: c === totalColCount ? { style: 'thin', color: { argb: 'FF683318' } } : undefined
      };
    }
  }

  // 1. EMBED LOGO IN DEDICATED SEPARATE RANGE (Columns A & B, origin A1)
  // When Column B is hidden, origin A1 has width 16 (~125px), keeping logo centered and visible!
  ws.mergeCells('A1:B4');
  if (hasLogo && branch?.logoUrl) {
    try {
      const base64Data = branch.logoUrl.split(',')[1];
      const extMatch = branch.logoUrl.match(/data:image\/([a-zA-Z]+);/);
      const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpeg' : 'png') : 'png';
      const logoId = wb.addImage({
        base64: base64Data,
        extension: ext as 'png' | 'jpeg',
      });
      ws.addImage(logoId, {
        tl: { col: 0.12, row: 0.2 },
        ext: { width: 110, height: 56 },
        editAs: 'absolute'
      });
    } catch (err) {
      console.warn('Branch logo embedding fallback:', err);
    }
  }

  // 2. COMPANY DETAILS & ADDRESS (Columns C to G, origin C1)
  // Seamlessly spans all columns up to Column H. No empty gap in the middle!
  // Rich text typography matching website (Image 3)
  ws.mergeCells('C1:G4');
  const cInfo = ws.getCell('C1');
  cInfo.value = {
    richText: [
      { font: { size: 16, bold: true, color: { argb: 'FFF5EEE6' } }, text: `${companyName}\n` },
      { font: { size: 10, italic: true, bold: true, color: { argb: accentColor } }, text: `${tagline}\n` },
      { font: { size: 9, color: { argb: 'FFE8DFD6' } }, text: `${address}\n` },
      { font: { size: 8.5, color: { argb: 'FFD4C5B5' } }, text: `GSTIN: ${gstin} • ${email}${phone}` }
    ]
  };
  cInfo.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left', indent: 1 };

  // 3. QUOTATION TITLE & PROPOSAL DETAILS (Columns H to I, origin H1)
  // Columns H (Unit Price) & I (Total) are NEVER hidden. Width = 15 + 17 = 32 characters!
  // Rich text typography matching website (Image 3)
  ws.mergeCells('H1:I4');
  const cRight = ws.getCell('H1');
  cRight.value = {
    richText: [
      { font: { size: 16, bold: true, color: { argb: accentColor } }, text: 'QUOTATION\n' },
      { font: { size: 9.5, bold: false, color: { argb: 'FFFFFFFF' } }, text: 'Luminaire Specification & Price Proposal\n' },
      { font: { size: 11, bold: true, color: { argb: 'FFF2CF8C' } }, text: `# ${quote.quoteNum || branch?.quotePrefix || 'AL-001'}\n` },
      { font: { size: 9, color: { argb: 'FFE8DFD6' } }, text: branchLocation }
    ]
  };
  cRight.alignment = { wrapText: true, vertical: 'middle', horizontal: 'right', indent: 1 };

  // 4. CLEAN METADATA CARD: ROW 5 (CLIENT NAME & QUOTATION DATE)
  // Matches website layout exactly (Image 3) — PROJECT / REF and ISSUING STUDIO row removed per request
  ws.getRow(5).height = 24;

  // A5:B5 -> "CLIENT NAME:" (Origin A5, width 16 min, never clips even if Column B is hidden!)
  ws.mergeCells('A5:B5');
  styleRange(5, 1, 5, 2, {
    fillColor: bannerColor,
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 9.5 },
    alignment: { vertical: 'middle', horizontal: 'center' }
  });
  ws.getCell('A5').value = 'CLIENT NAME:';

  // C5:G5 -> Client Name Value (Origin C5, width 70 to 95, never hidden!)
  ws.mergeCells('C5:G5');
  styleRange(5, 3, 5, 7, {
    fillColor: 'FFFDFAF6',
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FF17191C' }, bold: true, size: 10.5 },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
  });
  ws.getCell('C5').value = client;

  // H5 -> "QUOTE DATE:" (Column H is Unit Price, never hidden!)
  styleRange(5, 8, 5, 8, {
    fillColor: bannerColor,
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 9.5 },
    alignment: { vertical: 'middle', horizontal: 'center' }
  });
  ws.getCell('H5').value = 'QUOTE DATE:';

  // I5 -> Date Value (Column I is Total, never hidden!)
  styleRange(5, 9, 5, 9, {
    fillColor: 'FFFDFAF6',
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FF17191C' }, bold: true, size: 10 },
    alignment: { vertical: 'middle', horizontal: 'center' }
  });
  ws.getCell('I5').value = date;

  // 5. TABLE HEADERS (Row 6)
  const row6 = ws.getRow(6);
  columns.forEach((col, idx) => {
    const cell = row6.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9.5 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bannerColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD9CBB9' } },
      left: { style: 'thin', color: { argb: 'FFD9CBB9' } },
      bottom: { style: 'medium', color: { argb: 'FFD9CBB9' } },
      right: { style: 'thin', color: { argb: 'FFD9CBB9' } }
    };
  });
  row6.height = 28;

  // 6. DATA ROWS WITH HIGH-PRECISION EMBEDDED FIXTURE IMAGES
  let currentRow = 7;
  let subtotal = 0;

  quote.items.forEach((item, idx) => {
    const row = ws.getRow(currentRow);
    row.height = 60; // Clean, standard height
    const rowTotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
    subtotal += rowTotal;

    // Fixed Column 1 (A): S.No
    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Fixed Column 2 (B): Product Code (Always in Col 2, hidden via Excel if showCode is false)
    row.getCell(2).value = item.sku || item.code || '-';
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
    row.getCell(2).font = { bold: true, size: 9, color: { argb: 'FF17191C' } };

    // Fixed Column 3 (C): Product Description & Specifications
    const title = item.name || item.desc || 'Architectural Lighting Fixture';
    const wattCctParts: string[] = [];
    if (item.watt) wattCctParts.push(`⚡ Power: ${item.watt}`);
    if (item.cct) wattCctParts.push(`💡 CCT: ${item.cct}`);
    const line1and2 = wattCctParts.length > 0 ? `${title} — ${wattCctParts.join(' | ')}` : title;

    const descLines: string[] = [line1and2];
    if (item.beam) descLines.push(`🎯 Beam Angle: ${item.beam}`);
    if (item.cri) descLines.push(`🎨 CRI: ${item.cri}`);
    if (item.ip) descLines.push(`🛡️ IP Rating: ${item.ip}`);
    const finishReflParts: string[] = [];
    if (item.finish) finishReflParts.push(`✨ Body Finish: ${item.finish}`);
    if (item.reflector) finishReflParts.push(`🔆 Reflector: ${item.reflector}`);
    if (finishReflParts.length > 0) descLines.push(finishReflParts.join(' | '));

    const descCell = row.getCell(3);
    descCell.value = descLines.join('\n');
    descCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
    descCell.font = { size: 9, color: { argb: 'FF17191C' } };

    // Adjust row height dynamically so all specification lines fit cleanly
    row.height = Math.max(68, 20 + descLines.length * 15);

    // Fixed Column 4 (D): Image — Centered cleanly in Column D (never hidden)
    if (item.img && item.img.startsWith('data:image')) {
      try {
        const base64Data = item.img.split(',')[1];
        const extMatch = item.img.match(/data:image\/([a-zA-Z]+);/);
        const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpeg' : 'png') : 'png';
        const imageId = wb.addImage({
          base64: base64Data,
          extension: ext as 'png' | 'jpeg',
        });
        ws.addImage(imageId, {
          tl: { col: 3.18, row: currentRow - 1 + 0.08 },
          ext: { width: 54, height: 50 },
          editAs: 'oneCell'
        });
      } catch (err) {
        console.warn('Image embedding fallback:', err);
      }
    }
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    // Fixed Column 5 (E): Qty
    row.getCell(5).value = Number(item.qty) || 0;
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).font = { bold: true, size: 10 };

    // Fixed Column 6 (F): List Price (Always in Col 6, hidden via Excel if showDiscount is false)
    row.getCell(6).value = Number(item.listPrice) || Number(item.price) || 0;
    row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(6).numFmt = '#,##0.00';

    // Fixed Column 7 (G): Disc % (Always in Col 7, hidden via Excel if showDiscount is false)
    row.getCell(7).value = (Number(item.discount) || 0) + '%';
    row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

    // Fixed Column 8 (H): Unit Price
    row.getCell(8).value = Number(item.price) || 0;
    row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(8).numFmt = '#,##0.00';

    // Fixed Column 9 (I): Total Amount
    row.getCell(9).value = Number(rowTotal) || 0;
    row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(9).font = { bold: true };
    row.getCell(9).numFmt = '#,##0.00';

    // Borders & zebra striping
    const isOdd = (currentRow % 2 !== 0);
    const rowBg = isOdd ? 'FFFDFAF6' : 'FFFFFFFF';
    for (let c = 1; c <= totalColCount; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9CBB9' } },
        left: { style: 'thin', color: { argb: 'FFD9CBB9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9CBB9' } },
        right: { style: 'thin', color: { argb: 'FFD9CBB9' } }
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
    }

    currentRow++;
  });

  // 7. COMMERCIAL SUMMARY & TAX TOTALS
  const taxHalf = (subtotal * (gst / 100)) / 2;
  const grandTotal = subtotal + (taxHalf * 2);

  const addTotalRow = (label: string, value: number, isGrand: boolean) => {
    // Label merged across Columns 4 to 8 (D to H). Origin D is never hidden.
    // Visible width even when F & G are hidden = 18 (D) + 8 (E) + 15 (H) = 41 characters!
    const labelStartCol = 4;
    const labelEndCol = 8;
    const valueCol = 9;

    ws.mergeCells(`${getColLetter(labelStartCol)}${currentRow}:${getColLetter(labelEndCol)}${currentRow}`);
    const r = ws.getRow(currentRow);
    r.height = isGrand ? 26 : 21;

    // Style merged label cells
    for (let c = labelStartCol; c <= labelEndCol; c++) {
      const cell = r.getCell(c);
      cell.border = {
        top: { style: isGrand ? 'medium' : 'thin', color: { argb: 'FFD9CBB9' } },
        left: { style: 'thin', color: { argb: 'FFD9CBB9' } },
        bottom: { style: isGrand ? 'double' : 'thin', color: { argb: isGrand ? 'FF33261F' : 'FFD9CBB9' } },
        right: { style: 'thin', color: { argb: 'FFD9CBB9' } }
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isGrand ? accentColor : 'FFF8F6F2' } };
    }

    const labelCell = r.getCell(labelStartCol);
    labelCell.value = label;
    labelCell.font = { bold: true, color: isGrand ? { argb: 'FFFFFFFF' } : { argb: 'FF33261F' }, size: isGrand ? 11 : 9.5 };
    labelCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

    // Style value cell
    const valCell = r.getCell(valueCol);
    valCell.value = Number(value);
    valCell.font = { bold: true, color: isGrand ? { argb: 'FFFFFFFF' } : { argb: 'FF33261F' }, size: isGrand ? 11 : 10 };
    valCell.alignment = { horizontal: 'right', vertical: 'middle' };
    valCell.numFmt = '#,##0.00';
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isGrand ? accentColor : 'FFF8F6F2' } };
    valCell.border = {
      top: { style: isGrand ? 'medium' : 'thin', color: { argb: 'FFD9CBB9' } },
      left: { style: 'thin', color: { argb: 'FFD9CBB9' } },
      bottom: { style: isGrand ? 'double' : 'thin', color: { argb: isGrand ? 'FF33261F' : 'FFD9CBB9' } },
      right: { style: 'thin', color: { argb: 'FFD9CBB9' } }
    };

    currentRow++;
  };

  addTotalRow('SUBTOTAL (EXCL. TAX)', subtotal, false);
  addTotalRow(`CGST (${gst / 2}%)`, taxHalf, false);
  addTotalRow(`SGST (${gst / 2}%)`, taxHalf, false);
  addTotalRow('GRAND TOTAL (INCL. GST)', grandTotal, true);

  // 8. COMMERCIAL & TECHNICAL TERMS SECTION
  currentRow += 1;
  ws.mergeCells(`A${currentRow}:${totalColLetter}${currentRow}`);
  styleRange(currentRow, 1, currentRow, totalColCount, {
    fillColor: bannerColor,
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 9.5 },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
  });
  ws.getCell(`A${currentRow}`).value = 'Commercial & Technical Terms:';
  ws.getRow(currentRow).height = 22;
  currentRow++;

  const terms = [
    `1. Prices quoted are inclusive of ${gst}% GST and standard factory testing certifications.`,
    '2. Warranty: 3 Years manufacturer replacement warranty on driver and LED chip modules.',
    '3. Validity: Above quoted prices valid for 30 calendar days from quotation date.',
    '4. Payment Terms: 60% advance along with confirmed PO, balance 40% before dispatch.',
    '5. Delivery: 10-14 working days from date of advance payment and specification sign-off.',
    '6. Installation: Architectural fixtures must be installed by certified electrical contractors.'
  ];

  terms.forEach((term, idx) => {
    ws.mergeCells(`A${currentRow}:${totalColLetter}${currentRow}`);
    styleRange(currentRow, 1, currentRow, totalColCount, {
      fillColor: idx % 2 === 0 ? 'FFFFFFFF' : 'FFFDFAF6',
      borderColor: 'FFE8DFD6',
      font: { italic: true, size: 9, color: { argb: 'FF444444' } },
      alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
    });
    ws.getCell(`A${currentRow}`).value = term;
    ws.getRow(currentRow).height = 18;
    currentRow++;
  });

  // 9. BANK TRANSFER DETAILS SECTION
  if (quote.showBank) {
    currentRow++;
    ws.mergeCells(`A${currentRow}:${totalColLetter}${currentRow}`);
    styleRange(currentRow, 1, currentRow, totalColCount, {
      fillColor: bannerColor,
      borderColor: 'FFD9CBB9',
      font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 9.5 },
      alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
    });
    ws.getCell(`A${currentRow}`).value = 'BANK TRANSFER DETAILS (NEFT / RTGS / IMPS):';
    ws.getRow(currentRow).height = 20;
    currentRow++;

    const b = quote.bankDetails || branch?.bankDetails || {
      accName: 'ARTÈ LUME LIGHTING STUDIO PVT LTD',
      accNo: '98765432109876',
      bankName: 'HDFC BANK',
      ifsc: 'HDFC0001234',
      branch: 'JUBILEE HILLS, HYDERABAD'
    };

    const bankDetails = [
      `•  ACCOUNT BENEFICIARY: ${b.accName}`,
      `•  ACCOUNT NUMBER: ${b.accNo}`,
      `•  BANK NAME & BRANCH: ${b.bankName} — ${b.branch}`,
      `•  IFSC CODE: ${b.ifsc}`
    ];

    bankDetails.forEach((line, idx) => {
      ws.mergeCells(`A${currentRow}:${totalColLetter}${currentRow}`);
      styleRange(currentRow, 1, currentRow, totalColCount, {
        fillColor: idx % 2 !== 0 ? 'FFFFFFFF' : 'FFFDFAF6',
        borderColor: 'FFE8DFD6',
        font: { bold: true, size: 9, color: { argb: 'FF2D3436' } },
        alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
      });
      ws.getCell(`A${currentRow}`).value = line;
      ws.getRow(currentRow).height = 18;
      currentRow++;
    });
  }

  // 10. REFINED FOOTER
  currentRow++;
  ws.mergeCells(`A${currentRow}:${totalColLetter}${currentRow}`);
  const foot = ws.getCell(`A${currentRow}`);
  foot.value = `Thank you for choosing ${companyName} — ${tagline}.`;
  foot.font = { color: { argb: bannerColor }, italic: true, bold: true, size: 10.5 };
  foot.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(currentRow).height = 28;

  // Generate buffer and trigger download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const quoteCode = quote.quoteNum || branch?.quotePrefix || 'AL';
  const filename = `${client.replace(/[^a-zA-Z0-9_-]/g, '_')}_Quotation_${quoteCode}.xlsx`;

  downloadBlob(blob, filename);
}

function getColLetter(colIdx: number): string {
  let temp = '';
  let letter = '';
  while (colIdx > 0) {
    temp = String.fromCharCode(((colIdx - 1) % 26) + 65);
    letter = temp + letter;
    colIdx = Math.floor((colIdx - 1) / 26);
  }
  return letter;
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Mobile Web Share support (ideal for mobile Android Chrome)
  if (typeof navigator !== 'undefined' && 'canShare' in navigator && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
    try {
      const file = new File([blob], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
          text: `Architectural Lighting Quotation Spreadsheet (${filename})`
        });
        return;
      }
    } catch (e) {
      // User cancelled share or failed, proceed with standard blob download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
