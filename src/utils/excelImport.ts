import ExcelJS from 'exceljs';
import { QuotationItem } from '../types';

export interface ParsedSpreadsheetResult {
  fileName: string;
  sheetName: string;
  totalRows: number;
  detectedColumns: string[];
  items: QuotationItem[];
  metadata?: {
    client?: string;
    quoteNum?: string;
    date?: string;
    gst?: number;
  };
}

/**
 * Extracts luminaire specifications from merged multiline description strings,
 * including the Line 1 & Line 2 format: "[Title] — ⚡ Power: 12W | 💡 CCT: 3000K"
 */
function parseMultilineDescription(text: string): {
  name: string;
  watt?: string;
  cct?: string;
  beam?: string;
  cri?: string;
  ip?: string;
  finish?: string;
  reflector?: string;
} {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { name: text };

  let name = lines[0];
  let watt: string | undefined;
  let cct: string | undefined;
  let beam: string | undefined;
  let cri: string | undefined;
  let ip: string | undefined;
  let finish: string | undefined;
  let reflector: string | undefined;

  // Check if first line contains " — ⚡ Power: ... | 💡 CCT: ..."
  if (name.includes('—') || name.includes(' - ')) {
    const divider = name.includes('—') ? '—' : ' - ';
    const parts = name.split(divider);
    const titlePart = parts[0].trim();
    const specPart = parts.slice(1).join(divider);

    if (specPart.includes('Power') || specPart.includes('Watt') || specPart.includes('CCT') || specPart.includes('W')) {
      name = titlePart;
      const wattMatch = specPart.match(/(?:⚡\s*Power:\s*|Power:\s*|Watt:\s*)([0-9]+(?:\.[0-9]+)?\s*W)/i) ||
                        specPart.match(/([0-9]+(?:\.[0-9]+)?\s*W)/i);
      if (wattMatch) watt = wattMatch[1].trim();

      const cctMatch = specPart.match(/(?:💡\s*CCT:\s*|CCT:\s*)([0-9]{4}\s*K|Tunable\s*White|Warm\s*Dim|RGBW?)/i);
      if (cctMatch) cct = cctMatch[1].trim();
    }
  }

  // Parse remaining lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (/beam/i.test(line)) {
      const match = line.replace(/^[🎯\s*Beam\s*Angle:\s*]+/i, '').trim();
      if (match) beam = match;
    } else if (/cri/i.test(line)) {
      const match = line.replace(/^[🎨\s*CRI:\s*]+/i, '').trim();
      if (match) cri = match;
    } else if (/ip/i.test(line)) {
      const match = line.replace(/^[🛡️\s*IP\s*Rating:\s*]+/i, '').trim();
      if (match) ip = match;
    } else if (/finish/i.test(line) || /reflector/i.test(line)) {
      const finishMatch = line.match(/(?:✨\s*Body Finish:\s*|Body Finish:\s*|Finish:\s*)([^|]+)/i);
      if (finishMatch) finish = finishMatch[1].trim();

      const reflMatch = line.match(/(?:🔆\s*Reflector:\s*|Reflector:\s*)(.+)/i);
      if (reflMatch) reflector = reflMatch[1].trim();
    }
  }

  return { name, watt, cct, beam, cri, ip, finish, reflector };
}

/**
 * Reads any cell value cleanly to a string or number
 */
function getCleanCellValue(cell: ExcelJS.Cell): any {
  if (cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'object') {
    // Rich text or formula
    if ('richText' in (cell.value as any)) {
      return (cell.value as any).richText.map((t: any) => t.text).join('');
    }
    if ('result' in (cell.value as any)) {
      return (cell.value as any).result;
    }
    if ('text' in (cell.value as any)) {
      return (cell.value as any).text;
    }
  }
  return cell.value;
}

/**
 * Parse an Excel (.xlsx, .xls) file into QuotationItem array
 */
export async function parseExcelSpreadsheet(file: File): Promise<ParsedSpreadsheetResult> {
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  // Pick first worksheet with rows
  const ws = wb.worksheets.find(s => s.rowCount > 0) || wb.worksheets[0];
  if (!ws) {
    throw new Error('No valid worksheet found in the uploaded file.');
  }

  // Check for client / metadata in top rows (rows 1 to 15)
  let extractedClient = '';
  let extractedQuoteNum = '';
  let extractedDate = '';
  let headerRowIndex = -1;

  for (let r = 1; r <= Math.min(ws.rowCount, 25); r++) {
    const row = ws.getRow(r);
    const rowValues = (row.values as any[]) || [];
    const rowText = rowValues.map(v => String(v || '').toLowerCase()).join(' ');

    if (!extractedClient && (rowText.includes('client:') || rowText.includes('prepared for:') || rowText.includes('customer:'))) {
      for (let c = 1; c <= row.cellCount; c++) {
        const val = String(getCleanCellValue(row.getCell(c)));
        if (/client:|customer:|prepared for:/i.test(val)) {
          const nextVal = String(getCleanCellValue(row.getCell(c + 1)));
          extractedClient = nextVal || val.replace(/client:|customer:|prepared for:/i, '').trim();
          break;
        }
      }
    }

    if (!extractedQuoteNum && (rowText.includes('quote') || rowText.includes('ref no') || rowText.includes('quotation no'))) {
      for (let c = 1; c <= row.cellCount; c++) {
        const val = String(getCleanCellValue(row.getCell(c)));
        if (/quote\s*(no|num|#)|ref\s*no/i.test(val)) {
          const nextVal = String(getCleanCellValue(row.getCell(c + 1)));
          extractedQuoteNum = nextVal || val.replace(/quote\s*(no|num|#|ref no):?/i, '').trim();
          break;
        }
      }
    }

    // Detect header row by checking for standard column names
    const isHeaderRow =
      (rowText.includes('description') || rowText.includes('product') || rowText.includes('item')) &&
      (rowText.includes('qty') || rowText.includes('price') || rowText.includes('rate') || rowText.includes('amount') || rowText.includes('code') || rowText.includes('watt'));

    if (isHeaderRow && headerRowIndex === -1) {
      headerRowIndex = r;
    }
  }

  // Fallback if header not detected
  if (headerRowIndex === -1) {
    headerRowIndex = 1;
  }

  const headerRow = ws.getRow(headerRowIndex);
  const colMap: Record<string, number> = {};
  const detectedCols: string[] = [];

  headerRow.eachCell((cell, colNumber) => {
    const header = String(getCleanCellValue(cell) || '').trim().toLowerCase();
    if (!header) return;
    detectedCols.push(header);

    if (header.includes('s.no') || header === 'sno' || header === 'sr no' || header === 'sl no' || header === '#') {
      colMap.sno = colNumber;
    } else if (header.includes('code') || header.includes('sku') || header.includes('model') || header.includes('art. no')) {
      colMap.sku = colNumber;
    } else if (header.includes('desc') || header.includes('item') || header.includes('product') || header.includes('fixture') || header.includes('luminaire')) {
      if (!colMap.desc) colMap.desc = colNumber;
    } else if (header.includes('qty') || header.includes('quantity') || header.includes('nos')) {
      colMap.qty = colNumber;
    } else if (header.includes('list') || header.includes('mrp')) {
      colMap.listPrice = colNumber;
    } else if (header.includes('disc')) {
      colMap.discount = colNumber;
    } else if (header.includes('unit') || header.includes('rate') || header === 'price' || header.includes('unit price')) {
      colMap.unitPrice = colNumber;
    } else if (header.includes('total') || header.includes('amt') || header.includes('amount')) {
      colMap.total = colNumber;
    } else if (header.includes('watt') || header.includes('power')) {
      colMap.watt = colNumber;
    } else if (header.includes('cct') || header.includes('kelvin') || header.includes('color temp')) {
      colMap.cct = colNumber;
    } else if (header.includes('beam') || header.includes('optic')) {
      colMap.beam = colNumber;
    } else if (header.includes('cri')) {
      colMap.cri = colNumber;
    } else if (header.includes('ip') || header.includes('ingress')) {
      colMap.ip = colNumber;
    } else if (header.includes('finish') || header.includes('body')) {
      colMap.finish = colNumber;
    } else if (header.includes('reflector')) {
      colMap.reflector = colNumber;
    } else if (header.includes('area') || header.includes('room') || header.includes('zone') || header.includes('location')) {
      colMap.area = colNumber;
    } else if (header.includes('image') || header.includes('picture') || header.includes('photo')) {
      colMap.img = colNumber;
    }
  });

  // Extract embedded images from worksheet if any
  const imageByRow: Record<number, string> = {};
  try {
    const wsImages = ws.getImages();
    if (wsImages && wsImages.length > 0) {
      for (const imgRef of wsImages) {
        try {
          const imgObj = wb.getImage(imgRef.imageId as any);
          if (imgObj && imgObj.buffer) {
            const rowTarget = Math.floor(imgRef.range.tl.row) + 1; // 1-indexed
            const base64 = `data:image/${imgObj.extension || 'png'};base64,${Buffer.from(imgObj.buffer).toString('base64')}`;
            imageByRow[rowTarget] = base64;
          }
        } catch {
          // ignore single image decode failure
        }
      }
    }
  } catch {
    // worksheet images extraction not critical
  }

  const items: QuotationItem[] = [];

  for (let r = headerRowIndex + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    // Skip empty rows or summary/terms rows
    const firstFew = [1, 2, 3, 4, 5].map(c => String(getCleanCellValue(row.getCell(c)) || '')).join(' ').toLowerCase();
    if (!firstFew.trim() || firstFew.includes('subtotal') || firstFew.includes('grand total') || firstFew.includes('terms & conditions') || firstFew.includes('authorized signature')) {
      continue;
    }

    const descRaw = colMap.desc ? String(getCleanCellValue(row.getCell(colMap.desc)) || '').trim() : '';
    const skuRaw = colMap.sku ? String(getCleanCellValue(row.getCell(colMap.sku)) || '').trim() : '';
    const qtyVal = colMap.qty ? Number(getCleanCellValue(row.getCell(colMap.qty))) : 1;
    const unitPriceVal = colMap.unitPrice ? Number(getCleanCellValue(row.getCell(colMap.unitPrice))) : 0;
    const listPriceVal = colMap.listPrice ? Number(getCleanCellValue(row.getCell(colMap.listPrice))) : (unitPriceVal || 0);
    const discVal = colMap.discount ? Number(getCleanCellValue(row.getCell(colMap.discount))) : 0;

    // Skip if row has neither sku, description, nor price
    if (!descRaw && !skuRaw && !unitPriceVal) {
      continue;
    }

    // Parse multi-line description format if present
    const parsedSpecs = parseMultilineDescription(descRaw);

    const watt = (colMap.watt ? String(getCleanCellValue(row.getCell(colMap.watt)) || '').trim() : '') || parsedSpecs.watt || '12W';
    const cct = (colMap.cct ? String(getCleanCellValue(row.getCell(colMap.cct)) || '').trim() : '') || parsedSpecs.cct || '3000K';
    const beam = (colMap.beam ? String(getCleanCellValue(row.getCell(colMap.beam)) || '').trim() : '') || parsedSpecs.beam || '24°';
    const cri = (colMap.cri ? String(getCleanCellValue(row.getCell(colMap.cri)) || '').trim() : '') || parsedSpecs.cri || 'CRI 90+';
    const ip = (colMap.ip ? String(getCleanCellValue(row.getCell(colMap.ip)) || '').trim() : '') || parsedSpecs.ip || 'IP20';
    const finish = (colMap.finish ? String(getCleanCellValue(row.getCell(colMap.finish)) || '').trim() : '') || parsedSpecs.finish || 'Matte White';
    const reflector = (colMap.reflector ? String(getCleanCellValue(row.getCell(colMap.reflector)) || '').trim() : '') || parsedSpecs.reflector || 'Dark Light';
    const area = colMap.area ? String(getCleanCellValue(row.getCell(colMap.area)) || '').trim() : '';

    const finalName = parsedSpecs.name || skuRaw || `Luminaire Item ${items.length + 1}`;
    const finalPrice = unitPriceVal || (listPriceVal ? listPriceVal * (1 - (discVal || 0) / 100) : 0);

    const rowImage = imageByRow[r] || '';

    const item: QuotationItem = {
      id: `imported-${Date.now()}-${items.length + 1}`,
      sku: skuRaw || `AL-${String(items.length + 1).padStart(3, '0')}`,
      name: finalName,
      desc: finalName,
      category: 'Architectural Lighting',
      watt,
      cct,
      beam,
      cri,
      ip,
      finish,
      reflector,
      area: area || undefined,
      qty: isNaN(qtyVal) || qtyVal <= 0 ? 1 : qtyVal,
      listPrice: isNaN(listPriceVal) ? finalPrice : listPriceVal,
      discount: isNaN(discVal) ? 0 : discVal,
      price: isNaN(finalPrice) ? 0 : Math.round(finalPrice),
      img: rowImage || undefined
    };

    items.push(item);
  }

  return {
    fileName: file.name,
    sheetName: ws.name,
    totalRows: items.length,
    detectedColumns: detectedCols,
    items,
    metadata: {
      client: extractedClient,
      quoteNum: extractedQuoteNum,
      date: extractedDate
    }
  };
}
