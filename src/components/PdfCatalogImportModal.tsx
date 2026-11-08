import React, { useState, useRef, useMemo } from 'react';
import { LightingProduct, BranchProfile } from '../types';

export interface ExtractedProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  watt?: string;
  cct?: string;
  beam?: string;
  cri?: string;
  ip?: string;
  finish?: string;
  reflector?: string;
  cutout?: string;
  price: number;
  cost?: number;
  stock?: number;
  img?: string;
  descriptionNotes?: string;
  selected: boolean;
}

interface PdfCatalogImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: BranchProfile;
  onImportToCatalog: (products: LightingProduct[]) => void;
  onImportToQuote?: (products: LightingProduct[]) => void;
  formatInr: (amount: number) => string;
}

// Sample architectural catalog fixtures for instant 1-click demo/test
const SAMPLE_CATALOG_DATA: Omit<ExtractedProductItem, 'id' | 'selected'>[] = [
  {
    sku: 'LFSL1211R-ZT',
    name: 'COBLIGHT ZIGBEE 7W TUNABLE ARCHITECTURAL DOWNLIGHT',
    category: 'Downlights',
    watt: '7W',
    cct: '2700K-6500K Tunable',
    beam: '24° / 36°',
    cri: 'CRI 95+',
    ip: 'IP20',
    finish: 'Matte White',
    reflector: 'Specular Dark Light',
    cutout: 'Ø75mm',
    price: 3585,
    cost: 1650,
    stock: 25,
    descriptionNotes: 'Deep recessed anti-glare, UGR<16, Zigbee 3.0 / Tuya Smart driver integrated.'
  },
  {
    sku: 'AL-MAG-TRK-15W',
    name: 'MAGNETIC TRACK LINEAR ACCENT SPOTLIGHT',
    category: 'Track Lights',
    watt: '15W',
    cct: '3000K Warm White',
    beam: '30° Dark Light',
    cri: 'CRI 97',
    ip: 'IP20',
    finish: 'Matte Black Anodized',
    reflector: 'Black Chrome Cup',
    cutout: 'Magnetic Snap-in 24mm',
    price: 2850,
    cost: 1300,
    stock: 40,
    descriptionNotes: '48V Low Voltage magnetic track luminaire, Osram Oslon LED, DALI-2 dimmable option.'
  },
  {
    sku: 'AL-PROF-SURF-1707',
    name: '17MM SLIM SURFACE ARCHITECTURAL ALUMINIUM PROFILE',
    category: 'Linear Profiles',
    watt: '24W/m',
    cct: '4000K Natural White',
    beam: '120° Opal Diffuser',
    cri: 'CRI 90+',
    ip: 'IP44',
    finish: 'Anodized Silver',
    reflector: 'High Transmission Opal PMMA',
    cutout: 'Surface Mount / Clip-in',
    price: 450,
    cost: 210,
    stock: 120,
    descriptionNotes: 'Aircraft-grade 6063-T5 aluminum housing, dot-free continuous line of light with end caps.'
  },
  {
    sku: 'AL-STRIP-2835-240D',
    name: '24V ULTRA HIGH EFFICIENCY 240 LED/M ARCHITECTURAL STRIP',
    category: 'LED Strips',
    watt: '18W/m',
    cct: '3000K Warm White',
    beam: '120° Diffused',
    cri: 'CRI 95+ (R9>90)',
    ip: 'IP65 Silicone Coated',
    finish: 'White PCB 10mm',
    reflector: 'N/A',
    cutout: 'Cuttable every 25mm',
    price: 380,
    cost: 165,
    stock: 200,
    descriptionNotes: 'San’an / Epistar chip, 3-Step MacAdam ellipse, 3M 300LSE thermal adhesive tape.'
  },
  {
    sku: 'AL-SCONCE-UPDOWN-12W',
    name: 'DUAL EMISSION ARCHITECTURAL WALL SCONCE',
    category: 'Wall Sconces',
    watt: '12W (6W Up + 6W Down)',
    cct: '3000K Warm White',
    beam: '45° Dual Cones',
    cri: 'CRI 92',
    ip: 'IP65 Outdoor Rated',
    finish: 'Textured Anthracite Grey',
    reflector: 'Tempered Optical Glass Lens',
    cutout: 'Surface Wall Mount',
    price: 4200,
    cost: 1950,
    stock: 15,
    descriptionNotes: 'Die-cast aluminum body with anti-corrosion powder coating, internal Mean Well driver.'
  }
];

export const PdfCatalogImportModal: React.FC<PdfCatalogImportModalProps> = ({
  isOpen,
  onClose,
  branch,
  onImportToCatalog,
  onImportToQuote,
  formatInr,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<string>('');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedProductItem[]>([]);
  const [hasExtracted, setHasExtracted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'split'>('table');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    setExtractionError(null);
    if (fileBlobUrl) {
      URL.revokeObjectURL(fileBlobUrl);
    }
    const blobUrl = URL.createObjectURL(file);
    setFileBlobUrl(blobUrl);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleExtractFromPdf = async () => {
    if (!selectedFile) {
      setExtractionError('Please select or drop a PDF catalog file first.');
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);
    setExtractionProgress('Reading file into memory...');

    try {
      const fileSizeMb = selectedFile.size / (1024 * 1024);
      if (fileSizeMb > 40) {
        throw new Error(`File is ${fileSizeMb.toFixed(1)}MB. Cloud Run proxy enforces a 32MB payload limit. Please compress this PDF or select specific price list pages.`);
      }

      const base64Data = await convertFileToBase64(selectedFile);
      setExtractionProgress('Sending to Gemini 3.8 Flash for optical specification & price extraction...');

      const response = await fetch('/api/catalog/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/pdf',
        }),
      });

      if (!response.ok) {
        let errorMsg = '';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error;
        } catch {
          // If response body is not JSON (e.g. reverse proxy returned HTML or plain 413)
          if (response.status === 413) {
            errorMsg = `Document payload (${fileSizeMb.toFixed(1)}MB) exceeds network upload limit (HTTP 413). Please compress the PDF to under 25MB or upload specific pages of the price list.`;
          } else {
            errorMsg = `Server responded with status ${response.status}: ${response.statusText || 'Unable to process document'}`;
          }
        }
        throw new Error(errorMsg || `Server responded with status ${response.status}`);
      }

      setExtractionProgress('Processing extracted luminaires and optical data...');
      const data = await response.json();

      if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
        throw new Error('No architectural lighting products could be identified in this document. Please ensure the PDF contains product codes and specifications.');
      }

      const formatted: ExtractedProductItem[] = data.products.map((p: any, idx: number) => ({
        id: `extracted-${Date.now()}-${idx}`,
        sku: p.sku || `AL-SPEC-${idx + 1}`,
        name: p.name || 'Architectural Luminaire',
        category: p.category || 'Downlights',
        watt: p.watt || '',
        cct: p.cct || '',
        beam: p.beam || '',
        cri: p.cri || '',
        ip: p.ip || '',
        finish: p.finish || '',
        reflector: p.reflector || '',
        cutout: p.cutout || '',
        price: Number(p.price) || 0,
        cost: Number(p.cost) || Math.round((Number(p.price) || 0) * 0.5),
        stock: Number(p.stock) || 10,
        descriptionNotes: p.descriptionNotes || '',
        selected: true,
      }));

      setExtractedItems(formatted);
      setHasExtracted(true);
    } catch (err: any) {
      console.error('Extraction error:', err);
      setExtractionError(err.message || 'Failed to extract products from PDF. Please check file format.');
    } finally {
      setIsExtracting(false);
      setExtractionProgress('');
    }
  };

  const handleLoadSampleData = () => {
    const formatted: ExtractedProductItem[] = SAMPLE_CATALOG_DATA.map((p, idx) => ({
      ...p,
      id: `sample-${Date.now()}-${idx}`,
      selected: true,
    }));
    setExtractedItems(formatted);
    setHasExtracted(true);
    setExtractionError(null);
  };

  // Toggle selection
  const handleToggleSelectAll = (checked: boolean) => {
    setExtractedItems(prev => prev.map(item => ({ ...item, selected: checked })));
  };

  const handleToggleItem = (id: string) => {
    setExtractedItems(prev => prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item)));
  };

  const handleUpdateItem = (id: string, field: keyof ExtractedProductItem, value: any) => {
    setExtractedItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleDeleteItem = (id: string) => {
    setExtractedItems(prev => prev.filter(item => item.id !== id));
  };

  // Categories list
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    extractedItems.forEach(i => {
      if (i.category) cats.add(i.category);
    });
    return ['All', ...Array.from(cats)];
  }, [extractedItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return extractedItems.filter(item => {
      const matchesCat = selectedCategoryFilter === 'All' || item.category === selectedCategoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.watt && item.watt.toLowerCase().includes(q)) ||
        (item.cct && item.cct.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [extractedItems, selectedCategoryFilter, searchQuery]);

  const selectedCount = useMemo(() => {
    return extractedItems.filter(i => i.selected).length;
  }, [extractedItems]);

  // Final Action: Import to Catalog
  const handleConfirmImportToCatalog = () => {
    const toImport = extractedItems.filter(i => i.selected);
    if (toImport.length === 0) {
      alert('Please select at least 1 product to import.');
      return;
    }

    const convertedProducts: LightingProduct[] = toImport.map(item => ({
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sku: item.sku.trim(),
      name: item.name.trim(),
      category: item.category || 'Downlights',
      watt: item.watt || '',
      cct: item.cct || '',
      beam: item.beam || '',
      cri: item.cri || '',
      ip: item.ip || '',
      finish: item.finish || '',
      reflector: item.reflector || '',
      cutout: item.cutout || '',
      price: Number(item.price) || 0,
      cost: Number(item.cost) || 0,
      stock: Number(item.stock) || 10,
      img: item.img || '',
    }));

    onImportToCatalog(convertedProducts);
    setSuccessToast(`Successfully imported ${convertedProducts.length} luminaires into your catalog!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Final Action: Import & Add directly to Quote
  const handleConfirmImportToQuote = () => {
    const toImport = extractedItems.filter(i => i.selected);
    if (toImport.length === 0) {
      alert('Please select at least 1 product to add to the quotation.');
      return;
    }

    const convertedProducts: LightingProduct[] = toImport.map(item => ({
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sku: item.sku.trim(),
      name: item.name.trim(),
      category: item.category || 'Downlights',
      watt: item.watt || '',
      cct: item.cct || '',
      beam: item.beam || '',
      cri: item.cri || '',
      ip: item.ip || '',
      finish: item.finish || '',
      reflector: item.reflector || '',
      cutout: item.cutout || '',
      price: Number(item.price) || 0,
      cost: Number(item.cost) || 0,
      stock: Number(item.stock) || 10,
      img: item.img || '',
    }));

    // Save to catalog first
    onImportToCatalog(convertedProducts);

    // Also populate in current quote if callback provided
    if (onImportToQuote) {
      onImportToQuote(convertedProducts);
    }

    setSuccessToast(`Added ${convertedProducts.length} luminaires directly to current quotation!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[1050] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-[#d9cbb9]">
        {/* Header */}
        <div
          className="p-4 sm:p-5 text-white flex items-center justify-between transition-colors shrink-0"
          style={{ backgroundColor: branch.theme.primaryColor || '#7B3F22' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl shadow-xs">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg tracking-wide text-white">
                  PDF &amp; Price List AI Catalog Importer
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 border border-amber-300">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Upload your product PDF catalog or price sheet — all specifications and prices are extracted without manual typing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in slide-in-from-top duration-150">
            <span>✓</span>
            <span>{successToast}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!hasExtracted ? (
            /* STEP 1: UPLOAD AREA */
            <div className="space-y-4 max-w-2xl mx-auto py-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#cbb8a3] hover:border-[#7b3f22] bg-[#fbf9f6] hover:bg-[#f6f0e9] rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all group shadow-xs"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-white border border-[#df9c20]/40 text-amber-700 mx-auto flex items-center justify-center text-3xl shadow-sm group-hover:scale-105 transition-transform">
                  📄
                </div>

                <div className="mt-4 font-bold text-sm sm:text-base text-stone-900">
                  {selectedFile ? selectedFile.name : 'Click to select or drag & drop your Product PDF'}
                </div>

                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                  Supports manufacturer price lists, tear sheets, optical specification brochures, and catalog PDFs (.pdf, .png, .jpg)
                </p>

                {selectedFile && (
                  <div className="mt-3 flex flex-col items-center gap-1.5">
                    <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-stone-200 text-xs font-semibold text-stone-700 shadow-2xs">
                      <span>📎</span>
                      <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span className="text-stone-400">•</span>
                      {selectedFile.size > 25 * 1024 * 1024 ? (
                        <span className="text-amber-700 font-bold">Large file (compress recommended)</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">Ready for extraction</span>
                      )}
                    </div>
                    {selectedFile.size > 25 * 1024 * 1024 && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                        Notice: Files over 25MB may exceed reverse proxy upload limits. For fastest extraction, use a compressed version or select specific catalog pages.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {extractionError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
                  <span className="text-base shrink-0">⚠️</span>
                  <div className="flex-1 font-medium">{extractionError}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleLoadSampleData}
                  className="text-xs text-[#7b3f22] hover:text-[#5e2f18] font-bold underline cursor-pointer flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Try with sample architectural fixtures (Demo)</span>
                </button>

                <button
                  type="button"
                  disabled={!selectedFile || isExtracting}
                  onClick={handleExtractFromPdf}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    !selectedFile || isExtracting
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : 'bg-[#7b3f22] hover:bg-[#683318] text-white hover:scale-[1.01]'
                  }`}
                >
                  {isExtracting ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span>
                      <span>Extracting with Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Extract Products &amp; Prices</span>
                    </>
                  )}
                </button>
              </div>

              {/* Progressive Extraction Loader */}
              {isExtracting && (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">🔄</span>
                      <span>{extractionProgress || 'AI Document Processing...'}</span>
                    </span>
                    <span className="text-[11px] font-mono">Gemini 3.8 Flash</span>
                  </div>
                  <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-600 h-full w-2/3 animate-pulse rounded-full" />
                  </div>
                  <p className="text-[11px] text-amber-800/80 italic">
                    Reading model codes, power (W), CCT, beam angles, finishes, and selling prices...
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: INTERACTIVE LIVE PREVIEW GRID */
            <div className="space-y-4">
              {/* Stats & Filters Bar */}
              <div className="bg-[#fbf9f6] border border-[#ebdcd0] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-600 uppercase">Found:</span>
                    <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                      {extractedItems.length} Products
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-600 uppercase">Selected:</span>
                    <span className="text-xs font-black bg-[#7b3f22] text-white px-2 py-0.5 rounded-full">
                      {selectedCount} / {extractedItems.length}
                    </span>
                  </div>

                  {/* Category Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto max-w-md py-0.5">
                    {availableCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategoryFilter(cat)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
                          selectedCategoryFilter === cat
                            ? 'bg-[#7b3f22] text-white font-bold shadow-2xs'
                            : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search SKU or name..."
                      className="text-xs bg-white border border-[#d9cbb9] rounded-lg pl-7 pr-3 py-1.5 outline-none focus:border-[#7b3f22] w-44"
                    />
                    <span className="absolute left-2.5 top-1.5 text-stone-400 text-xs">🔍</span>
                  </div>

                  {/* Split View Toggle if PDF available */}
                  {fileBlobUrl && (
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === 'table' ? 'split' : 'table')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                        viewMode === 'split'
                          ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                      title="View PDF document side-by-side with extracted data"
                    >
                      <span>👁️</span>
                      <span>{viewMode === 'split' ? 'Full Table' : 'Split View (PDF + Table)'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setHasExtracted(false);
                      setSelectedFile(null);
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold cursor-pointer"
                  >
                    🔄 Upload Another
                  </button>
                </div>
              </div>

              {/* Main Preview Container (Split or Full) */}
              <div className={`grid gap-4 ${viewMode === 'split' && fileBlobUrl ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Optional Left Side PDF Viewer */}
                {viewMode === 'split' && fileBlobUrl && (
                  <div className="bg-stone-100 rounded-xl border border-stone-300 p-2 flex flex-col h-[560px]">
                    <div className="text-xs font-bold text-stone-700 px-2 py-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>📄</span>
                        <span>Original PDF Source Document</span>
                      </span>
                      <a
                        href={fileBlobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#7b3f22] hover:underline"
                      >
                        Open Full ↗
                      </a>
                    </div>
                    <iframe
                      src={fileBlobUrl}
                      title="Uploaded Catalog PDF"
                      className="w-full flex-1 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>
                )}

                {/* Right / Full Side Data Table */}
                <div className="border border-[#d9cbb9] rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="max-h-[560px] overflow-auto">
                    <table className="w-full border-collapse text-xs text-left">
                      <thead className="bg-[#7b3f22] text-white sticky top-0 z-10 font-bold">
                        <tr>
                          <th className="p-2.5 text-center w-10">
                            <input
                              type="checkbox"
                              checked={extractedItems.length > 0 && selectedCount === extractedItems.length}
                              onChange={e => handleToggleSelectAll(e.target.checked)}
                              className="rounded cursor-pointer"
                              title="Select/Deselect All"
                            />
                          </th>
                          <th className="p-2.5 w-32">SKU / Model</th>
                          <th className="p-2.5">Product Name &amp; Description</th>
                          <th className="p-2.5 w-28">Category</th>
                          <th className="p-2.5 w-24">Watt &amp; CCT</th>
                          <th className="p-2.5 w-24">Optics / IP</th>
                          <th className="p-2.5 w-24 text-right">Price (₹)</th>
                          <th className="p-2.5 w-10 text-center">✕</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {filteredItems.map((item, idx) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-[#faf7f4] transition-colors ${
                              item.selected ? 'bg-white' : 'bg-stone-50/60 opacity-60'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleToggleItem(item.id)}
                                className="rounded cursor-pointer"
                              />
                            </td>

                            {/* SKU */}
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.sku}
                                onChange={e => handleUpdateItem(item.id, 'sku', e.target.value)}
                                className="w-full font-mono font-bold text-xs bg-transparent border-b border-transparent focus:border-[#7b3f22] outline-none text-[#7b3f22]"
                              />
                            </td>

                            {/* Name & Notes */}
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => handleUpdateItem(item.id, 'name', e.target.value)}
                                className="w-full font-semibold text-xs bg-transparent border-b border-transparent focus:border-[#7b3f22] outline-none text-stone-900"
                              />
                              {item.descriptionNotes && (
                                <div className="text-[10px] text-stone-500 italic mt-0.5 truncate max-w-sm" title={item.descriptionNotes}>
                                  {item.descriptionNotes}
                                </div>
                              )}
                            </td>

                            {/* Category */}
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.category}
                                onChange={e => handleUpdateItem(item.id, 'category', e.target.value)}
                                className="w-full text-[11px] bg-stone-50 border border-stone-200 rounded px-1.5 py-0.5 outline-none font-medium"
                              />
                            </td>

                            {/* Watt & CCT */}
                            <td className="p-2.5 text-[11px]">
                              <input
                                type="text"
                                value={item.watt || ''}
                                placeholder="Watt"
                                onChange={e => handleUpdateItem(item.id, 'watt', e.target.value)}
                                className="w-full font-semibold text-stone-800 bg-transparent border-b border-transparent focus:border-[#7b3f22] outline-none"
                              />
                              <input
                                type="text"
                                value={item.cct || ''}
                                placeholder="CCT"
                                onChange={e => handleUpdateItem(item.id, 'cct', e.target.value)}
                                className="w-full text-stone-500 bg-transparent border-b border-transparent focus:border-[#7b3f22] outline-none"
                              />
                            </td>

                            {/* Beam, CRI, IP */}
                            <td className="p-2.5 text-[11px]">
                              <div className="text-stone-700 truncate" title={`${item.beam || ''} ${item.cri || ''}`}>
                                {item.beam || '-'}
                              </div>
                              <div className="text-[10px] text-stone-500 font-mono">
                                {item.ip || 'IP20'} • {item.finish || 'Standard'}
                              </div>
                            </td>

                            {/* Price */}
                            <td className="p-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-stone-400 font-semibold">₹</span>
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={e => handleUpdateItem(item.id, 'price', Number(e.target.value) || 0)}
                                  className="w-20 text-right font-bold text-xs bg-transparent border-b border-transparent focus:border-[#7b3f22] outline-none text-emerald-800"
                                />
                              </div>
                            </td>

                            {/* Delete */}
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-stone-400 hover:text-red-600 font-bold text-xs cursor-pointer"
                                title="Remove item"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions Bar */}
        {hasExtracted && (
          <div className="p-4 bg-[#fbf9f6] border-t border-[#ebdcd0] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-stone-600 font-medium">
              Ready to import <strong className="text-[#7b3f22] font-bold">{selectedCount}</strong> out of {extractedItems.length} luminaires
            </div>

            <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-stone-300 bg-white hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 cursor-pointer"
              >
                Cancel
              </button>

              {onImportToQuote && (
                <button
                  type="button"
                  onClick={handleConfirmImportToQuote}
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
                  title="Import to stock catalog and add directly to active quotation schedule"
                >
                  <span>📋</span>
                  <span>Import &amp; Add to Current Quote</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmImportToCatalog}
                className="px-5 py-2 bg-[#7b3f22] hover:bg-[#683318] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                title="Add to permanent product catalog"
              >
                <span>✓</span>
                <span>Save All Selected ({selectedCount}) to Catalog</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
