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

  // Build dynamic column definition based on user toggles
  interface ColDef {
    header: string;
    key: string;
    width: number;
    align: 'center' | 'left' | 'right';
  }

  const columns: ColDef[] = [
    { header: 'S.No.', key: 'sno', width: 7, align: 'center' }
  ];

  if (quote.showCode) {
    columns.push({ header: 'Product Code', key: 'code', width: 17, align: 'left' });
  }

  // Merged Product Description with Line-by-Line Specifications
  columns.push({ header: 'Product Description & Specifications', key: 'desc', width: 44, align: 'left' });
  columns.push({ header: 'Image', key: 'img', width: 18, align: 'center' });
  columns.push({ header: 'Qty', key: 'qty', width: 8, align: 'center' });

  if (quote.showDiscount) {
    columns.push({ header: 'List Price (₹)', key: 'listPrice', width: 15, align: 'right' });
    columns.push({ header: 'Disc %', key: 'discount', width: 10, align: 'center' });
  }

  columns.push({ header: 'Unit Price (₹)', key: 'unitPrice', width: 15, align: 'right' });
  columns.push({ header: 'Total (₹)', key: 'total', width: 17, align: 'right' });

  const totalColCount = columns.length;
  ws.columns = columns.map(c => ({ width: c.width }));

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
  ws.getRow(1).height = 22;
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 20;
  ws.getRow(4).height = 20;

  // Determine column splits for Header Banner
  // If logo is present: Columns 1 & 2 are reserved ONLY for the logo!
  // Columns 3 to midCol are for company text.
  // Columns midCol+1 to totalColCount are for QUOTATION & Ref.
  const logoCols = hasLogo ? 2 : 0;
  const midCol = Math.max(logoCols + 1, Math.min(totalColCount - 2, Math.floor(totalColCount * 0.55)));
  const midColLetter = getColLetter(midCol);
  const nextMidCol = midCol + 1;
  const nextMidColLetter = getColLetter(nextMidCol);
  const totalColLetter = getColLetter(totalColCount);

  // Fill entire banner background (Rows 1-4, Cols 1 to totalColCount)
  styleRange(1, 1, 4, totalColCount, {
    fillColor: bannerColor,
    borderColor: 'FF683318'
  });

  // 1. EMBED LOGO IN DEDICATED SEPARATE RANGE (Columns A & B)
  if (hasLogo && branch?.logoUrl) {
    try {
      ws.mergeCells(`A1:B4`);
      const base64Data = branch.logoUrl.split(',')[1];
      const extMatch = branch.logoUrl.match(/data:image\/([a-zA-Z]+);/);
      const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpeg' : 'png') : 'png';
      const logoId = wb.addImage({
        base64: base64Data,
        extension: ext as 'png' | 'jpeg',
      });
      // Position logo neatly inside A1:B4 with ample padding so it never touches borders
      ws.addImage(logoId, {
        tl: { col: 0.15, row: 0.2 },
        ext: { width: 110, height: 56 },
        editAs: 'oneCell'
      });
    } catch (err) {
      console.warn('Branch logo embedding fallback:', err);
    }
  }

  // 2. COMPANY DETAILS (Starts at C1 if logo present, else A1)
  const textStartColLetter = hasLogo ? 'C' : 'A';
  ws.mergeCells(`${textStartColLetter}1:${midColLetter}4`);
  const cInfo = ws.getCell(`${textStartColLetter}1`);
  cInfo.value = `${companyName}\n${tagline}\n${address}\nGSTIN: ${gstin} | ${email}${phone}`;
  cInfo.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
  cInfo.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left', indent: 1 };

  // 3. QUOTATION TITLE & PROPOSAL DETAILS (Right Side)
  ws.mergeCells(`${nextMidColLetter}1:${totalColLetter}4`);
  const cRight = ws.getCell(`${nextMidColLetter}1`);
  cRight.value = `QUOTATION\nQuote Ref: #${quote.quoteNum || branch?.quotePrefix || 'AL'}\nDate: ${date}\n${branchLocation}`;
  cRight.font = { color: { argb: accentColor }, bold: true, size: 13 };
  cRight.alignment = { wrapText: true, vertical: 'middle', horizontal: 'right', indent: 1 };

  // 4. BALANCED 2-ROW CLIENT & PROJECT METADATA CARD (Rows 5 & 6)
  // Row 5: Client Name & Quotation Date
  // Row 6: Project/Ref & Issuing Studio
  ws.getRow(5).height = 23;
  ws.getRow(6).height = 21;

  const metaLabelEndCol = totalColCount <= 6 ? 1 : 2;
  const metaLabelEndLetter = getColLetter(metaLabelEndCol);
  const metaValStartCol = metaLabelEndCol + 1;
  const metaValStartLetter = getColLetter(metaValStartCol);
  const metaValEndCol = midCol;
  const metaValEndLetter = getColLetter(metaValEndCol);

  const metaRightLabelStartCol = nextMidCol;
  const metaRightLabelStartLetter = getColLetter(metaRightLabelStartCol);
  const metaRightLabelEndCol = totalColCount <= 7 ? nextMidCol : Math.min(totalColCount - 1, nextMidCol + 1);
  const metaRightLabelEndLetter = getColLetter(metaRightLabelEndCol);
  const metaRightValStartCol = metaRightLabelEndCol + 1;
  const metaRightValStartLetter = getColLetter(metaRightValStartCol);

  // --- ROW 5 ---
  // A5:B5 -> "CLIENT NAME:"
  ws.mergeCells(`A5:${metaLabelEndLetter}5`);
  styleRange(5, 1, 5, metaLabelEndCol, {
    fillColor: bannerColor,
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 9.5 },
    alignment: { vertical: 'middle', horizontal: 'center' }
  });
  ws.getCell('A5').value = 'CLIENT NAME:';

  // C5:midCol5 -> Client Name Value
  ws.mergeCells(`${metaValStartLetter}5:${metaValEndLetter}5`);
  styleRange(5, metaValStartCol, 5, metaValEndCol, {
    fillColor: 'FFFDFAF6',
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FF17191C' }, bold: true, size: 10.5 },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
  });
  ws.getCell(`${metaValStartLetter}5`).value = client;

  // Right Label 5 -> "QUOTE DATE:"
  ws.mergeCells(`${metaRightLabelStartLetter}5:${metaRightLabelEndLetter}5`);
  styleRange(5, metaRightLabelStartCol, 5, metaRightLabelEndCol, {
    fillColor: bannerColor,
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 9.5 },
    alignment: { vertical: 'middle', horizontal: 'center' }
  });
  ws.getCell(`${metaRightLabelStartLetter}5`).value = 'QUOTE DATE:';

  // Right Value 5 -> Date Value
  ws.mergeCells(`${metaRightValStartLetter}5:${totalColLetter}5`);
  styleRange(5, metaRightValStartCol, 5, totalColCount, {
    fillColor: 'FFFDFAF6',
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FF17191C' }, bold: true, size: 10 },
    alignment: { vertical: 'middle', horizontal: 'center' }
  });
  ws.getCell(`${metaRightValStartLetter}5`).value = date;

  // --- ROW 6 ---
  // A6:B6 -> "PROJECT / REF:"
  ws.mergeCells(`A6:${metaLabelEndLetter}6`);
  styleRange(6, 1, 6, metaLabelEndCol, {
    fillColor: bannerColor,
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 },
    alignment: { vertical: 'middle', horizontal: 'center' }
  });
  ws.getCell('A6').value = 'PROJECT / REF:';

  // C6:midCol6 -> Project Title
  ws.mergeCells(`${metaValStartLetter}6:${metaValEndLetter}6`);
  styleRange(6, metaValStartCol, 6, metaValEndCol, {
    fillColor: 'FFFFFFFF',
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FF333333' }, bold: false, size: 9.5 },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
  });
  ws.getCell(`${metaValStartLetter}6`).value = quote.name || 'Architectural Lighting Proposal';

  // Right Label 6 -> "ISSUING STUDIO:"
  ws.mergeCells(`${metaRightLabelStartLetter}6:${metaRightLabelEndLetter}6`);
  styleRange(6, metaRightLabelStartCol, 6, metaRightLabelEndCol, {
    fillColor: bannerColor,
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 },
    alignment: { vertical: 'middle', horizontal: 'center' }
  });
  ws.getCell(`${metaRightLabelStartLetter}6`).value = 'ISSUING STUDIO:';

  // Right Value 6 -> Branch Location
  ws.mergeCells(`${metaRightValStartLetter}6:${totalColLetter}6`);
  styleRange(6, metaRightValStartCol, 6, totalColCount, {
    fillColor: 'FFFFFFFF',
    borderColor: 'FFD9CBB9',
    font: { color: { argb: 'FF333333' }, bold: false, size: 9.5 },
    alignment: { vertical: 'middle', horizontal: 'center' }
  });
  ws.getCell(`${metaRightValStartLetter}6`).value = `${companyName} (${branchLocationShort})`;

  // 5. TABLE HEADERS (Row 7)
  const row7 = ws.getRow(7);
  columns.forEach((col, idx) => {
    const cell = row7.getCell(idx + 1);
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
  row7.height = 28;

  // 6. DATA ROWS WITH HIGH-PRECISION EMBEDDED FIXTURE IMAGES
  let currentRow = 8;
  let subtotal = 0;

  quote.items.forEach((item, idx) => {
    const row = ws.getRow(currentRow);
    row.height = 60; // Clean, standard height
    const rowTotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
    subtotal += rowTotal;

    let cIndex = 1;

    // S.No
    row.getCell(cIndex).value = idx + 1;
    row.getCell(cIndex).alignment = { horizontal: 'center', vertical: 'middle' };
    cIndex++;

    if (quote.showCode) {
      row.getCell(cIndex).value = item.sku || item.code || '-';
      row.getCell(cIndex).alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
      cIndex++;
    }

    // Product Description & Specifications
    // Line 1 & Line 2 in SAME line: Product Description + (Watt & CCT)
    const title = item.name || item.desc || 'Architectural Lighting Fixture';
    const wattCctParts: string[] = [];
    if (item.watt) wattCctParts.push(`⚡ Power: ${item.watt}`);
    if (item.cct) wattCctParts.push(`💡 CCT: ${item.cct}`);
    const line1and2 = wattCctParts.length > 0 ? `${title} — ${wattCctParts.join(' | ')}` : title;

    const descLines: string[] = [line1and2];

    // Line 3: Beam Angle SEPARATE line
    if (item.beam) {
      descLines.push(`🎯 Beam Angle: ${item.beam}`);
    }

    // Line 4: CRI SEPARATE line
    if (item.cri) {
      descLines.push(`🎨 CRI: ${item.cri}`);
    }

    // Line 5: IP Rating SEPARATE line
    if (item.ip) {
      descLines.push(`🛡️ IP Rating: ${item.ip}`);
    }

    // Line 6: Body Finish & Reflector in SAME line
    const finishReflParts: string[] = [];
    if (item.finish) finishReflParts.push(`✨ Body Finish: ${item.finish}`);
    if (item.reflector) finishReflParts.push(`🔆 Reflector: ${item.reflector}`);
    if (finishReflParts.length > 0) {
      descLines.push(finishReflParts.join(' | '));
    }

    const descCell = row.getCell(cIndex);
    descCell.value = descLines.join('\n');
    descCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
    descCell.font = { size: 9, color: { argb: 'FF17191C' } };
    cIndex++;

    // Adjust row height dynamically so all specification lines fit cleanly
    row.height = Math.max(68, 20 + descLines.length * 15);

    // Image column — Cleanly centered and scaled without clipping
    const imgColIndex = cIndex;
    if (item.img && item.img.startsWith('data:image')) {
      try {
        const base64Data = item.img.split(',')[1];
        const extMatch = item.img.match(/data:image\/([a-zA-Z]+);/);
        const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpeg' : 'png') : 'png';
        const imageId = wb.addImage({
          base64: base64Data,
          extension: ext as 'png' | 'jpeg',
        });
        // 54px x 50px fits comfortably inside width 18 (~140px) and row height 60 (~80px)
        ws.addImage(imageId, {
          tl: { col: imgColIndex - 1 + 0.18, row: currentRow - 1 + 0.08 },
          ext: { width: 54, height: 50 },
          editAs: 'oneCell'
        });
      } catch (err) {
        console.warn('Image embedding fallback:', err);
      }
    }
    row.getCell(cIndex).alignment = { horizontal: 'center', vertical: 'middle' };
    cIndex++;

    // Qty
    row.getCell(cIndex).value = Number(item.qty) || 0;
    row.getCell(cIndex).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(cIndex).font = { bold: true, size: 10 };
    cIndex++;

    if (quote.showDiscount) {
      row.getCell(cIndex).value = Number(item.listPrice) || 0;
      row.getCell(cIndex).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(cIndex).numFmt = '#,##0.00';
      cIndex++;

      row.getCell(cIndex).value = (Number(item.discount) || 0) + '%';
      row.getCell(cIndex).alignment = { horizontal: 'center', vertical: 'middle' };
      cIndex++;
    }

    // Unit Price
    row.getCell(cIndex).value = Number(item.price) || 0;
    row.getCell(cIndex).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(cIndex).numFmt = '#,##0.00';
    cIndex++;

    // Total Amount
    row.getCell(cIndex).value = Number(rowTotal) || 0;
    row.getCell(cIndex).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(cIndex).font = { bold: true };
    row.getCell(cIndex).numFmt = '#,##0.00';

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
    const labelStartCol = Math.max(1, totalColCount - 4);
    const labelEndCol = totalColCount - 1;
    const valueCol = totalColCount;

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
