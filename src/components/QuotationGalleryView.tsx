import React, { useState, useEffect } from 'react';
import { QuotationItem, BranchProfile } from '../types';

interface QuotationGalleryViewProps {
  items: QuotationItem[];
  branch: BranchProfile;
  quoteNum: string;
  onItemChange: (idx: number, field: keyof QuotationItem, val: any) => void;
  onRemoveItem: (idx: number) => void;
  onOpenSkuHistory: (sku: string, name?: string, idx?: number) => void;
  onOpenCatalog: () => void;
  onSwitchToTable: (focusIndex?: number) => void;
  formatInr: (val: number) => string;
  onShowToast: (msg: string) => void;
}

export const QuotationGalleryView: React.FC<QuotationGalleryViewProps> = ({
  items,
  branch,
  quoteNum,
  onItemChange,
  onRemoveItem,
  onOpenSkuHistory,
  onOpenCatalog,
  onSwitchToTable,
  formatInr,
  onShowToast
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'with-photos' | string>('all');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Extract unique categories present in the active quote
  const availableCategories = Array.from(
    new Set(items.map(it => it.category).filter(Boolean))
  ) as string[];

  const itemsWithPhotosCount = items.filter(it => Boolean(it.img)).length;

  // Filter items
  const filteredItems = items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item }) => {
      if (filterMode === 'with-photos') return Boolean(item.img);
      if (filterMode === 'all') return true;
      return item.category === filterMode;
    });

  // Handle local image file upload for a specific row
  const handleCardImageUpload = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        onShowToast('Image size exceeds 2MB limit. Please compress.');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          onItemChange(idx, 'img', ev.target.result as string);
          onShowToast('Fixture image updated!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') {
        setLightboxIdx(prev => (prev !== null && prev < items.length - 1 ? prev + 1 : 0));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIdx(prev => (prev !== null && prev > 0 ? prev - 1 : items.length - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIdx, items.length]);

  return (
    <div className="bg-[#faf8f5] border-t border-[#d9cbb9]">
      {/* Gallery Header & Filter Toolbar */}
      <div className="p-4 bg-white border-b border-[#ebdcd0] flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif font-bold text-base text-[#17191c]">
              Project Luminaire Aesthetics Gallery
            </span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
              #{quoteNum}
            </span>
            <span className="text-xs text-stone-500 font-medium">
              • {items.length} Fixtures ({itemsWithPhotosCount} with photos)
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Visual project moodboard to inspect luminaire aesthetics, finishes, and optical harmony across all rooms
          </p>
        </div>

        {/* View Switcher & Catalog Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenCatalog}
            className="px-3 py-1.5 bg-[#df9c20] hover:bg-[#c88916] text-[#170e08] rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <span>❖</span>
            <span>+ Add From Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchToTable()}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <span>📋</span>
            <span>Switch to Schedule Table</span>
          </button>
        </div>
      </div>

      {/* Filter Category Chips */}
      <div className="px-4 py-2.5 bg-[#fcfaf7] border-b border-[#ebdcd0] flex items-center gap-1.5 overflow-x-auto text-xs no-print">
        <span className="text-stone-400 font-bold text-[10px] uppercase tracking-wider mr-1">
          Filter:
        </span>
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`px-3 py-1 rounded-full font-semibold text-xs cursor-pointer transition-all ${
            filterMode === 'all'
              ? 'bg-neutral-900 text-white shadow-2xs font-bold'
              : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-100'
          }`}
        >
          All Fixtures ({items.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('with-photos')}
          className={`px-3 py-1 rounded-full font-semibold text-xs cursor-pointer transition-all flex items-center gap-1 ${
            filterMode === 'with-photos'
              ? 'bg-neutral-900 text-white shadow-2xs font-bold'
              : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-100'
          }`}
        >
          <span>📷</span>
          <span>With Photos Only ({itemsWithPhotosCount})</span>
        </button>

        {availableCategories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterMode(cat)}
            className={`px-3 py-1 rounded-full font-semibold text-xs cursor-pointer transition-all ${
              filterMode === cat
                ? 'bg-[#7b3f22] text-white shadow-2xs font-bold'
                : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-100'
            }`}
          >
            {cat} ({items.filter(it => it.category === cat).length})
          </button>
        ))}
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <span className="text-4xl block">🖼️</span>
          <div className="font-serif text-lg font-bold text-gray-800">Your Quotation is Empty</div>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Add luminaires from the catalog or bulk importer to view them in the visual aesthetics gallery.
          </p>
          <button
            type="button"
            onClick={onOpenCatalog}
            className="px-4 py-2 bg-[#df9c20] text-[#170e08] font-bold text-xs rounded-lg shadow-sm cursor-pointer"
          >
            ❖ Open Fixtures Library
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-10 text-center space-y-2">
          <span className="text-3xl block">🔍</span>
          <div className="font-bold text-gray-800 text-sm">No luminaires match this filter</div>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className="text-xs text-amber-700 font-bold underline cursor-pointer"
          >
            Reset filter to show all
          </button>
        </div>
      ) : (
        /* Visual Moodboard Cards Grid */
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map(({ item, originalIndex }) => {
            const lineTotal = (Number(item.price) || 0) * (Number(item.qty) || 0);

            return (
              <div
                key={item.id || originalIndex}
                className="bg-white rounded-xl border border-[#d9cbb9] hover:border-[#7b3f22] shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group"
              >
                {/* Image Section */}
                <div className="relative h-52 bg-[#fdfbf9] border-b border-[#ebdcd0] flex items-center justify-center overflow-hidden p-3">
                  {item.img ? (
                    <>
                      <img
                        src={item.img}
                        alt={item.name}
                        onClick={() => setLightboxIdx(originalIndex)}
                        className="max-h-full max-w-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Hover Overlay with Action Buttons */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => setLightboxIdx(originalIndex)}
                          className="px-2.5 py-1.5 bg-white text-neutral-900 font-bold text-xs rounded-lg shadow-md hover:bg-neutral-100 cursor-pointer flex items-center gap-1"
                        >
                          <span>🔍</span>
                          <span>Zoom</span>
                        </button>
                        <label className="px-2.5 py-1.5 bg-[#df9c20] text-[#170e08] font-bold text-xs rounded-lg shadow-md cursor-pointer hover:bg-[#c88916] flex items-center gap-1">
                          <span>🔄</span>
                          <span>Change</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleCardImageUpload(e, originalIndex)}
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    /* Clean Uploader placeholder */
                    <label className="w-full h-full border-2 border-dashed border-[#d9cbb9] hover:border-[#7b3f22] rounded-lg flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors bg-white/70 hover:bg-amber-50/40">
                      <span className="text-2xl mb-1">📷</span>
                      <span className="font-bold text-xs text-[#7b3f22]">Add Fixture Photo</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">Click or drag photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleCardImageUpload(e, originalIndex)}
                      />
                    </label>
                  )}

                  {/* Corner Badges */}
                  <span className="absolute top-2 left-2 bg-stone-900/80 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                    #{originalIndex + 1}
                  </span>

                  <span
                    className="absolute top-2 right-2 text-white font-bold text-[10px] px-2 py-0.5 rounded-md shadow-xs"
                    style={{ backgroundColor: branch.theme.accentColor }}
                  >
                    Qty: {item.qty}
                  </span>
                </div>

                {/* Card Content & Specifications */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* SKU & Category Strip */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className="font-mono text-xs font-bold truncate"
                        style={{ color: branch.theme.primaryColor }}
                      >
                        {item.sku || 'AL-SPEC'}
                      </span>
                      {item.category && (
                        <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                          {item.category}
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <h4 className="font-bold text-sm text-[#17191c] line-clamp-2 leading-snug">
                      {item.name || 'Architectural Luminaire'}
                    </h4>

                    {/* Optical & Physical Specification Tags */}
                    <div className="mt-2.5 flex flex-wrap gap-1 text-[10.5px]">
                      {item.watt && (
                        <span className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-semibold border border-stone-200">
                          ⚡ {item.watt}
                        </span>
                      )}
                      {item.cct && (
                        <span className="bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                          💡 {item.cct}
                        </span>
                      )}
                      {item.beam && (
                        <span className="bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded font-medium border border-blue-200">
                          📐 {item.beam}
                        </span>
                      )}
                      {item.cri && (
                        <span className="bg-purple-50 text-purple-900 px-1.5 py-0.5 rounded font-medium border border-purple-200">
                          🎯 {item.cri}
                        </span>
                      )}
                      {item.ip && (
                        <span className="bg-emerald-50 text-emerald-900 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                          🛡️ {item.ip}
                        </span>
                      )}
                      {item.finish && (
                        <span className="bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded font-medium border border-stone-200">
                          ✨ {item.finish}
                        </span>
                      )}
                      {item.reflector && (
                        <span className="bg-orange-50 text-orange-900 px-1.5 py-0.5 rounded font-medium border border-orange-200">
                          🔆 {item.reflector}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Commercial Pricing Strip & Quick Actions */}
                  <div className="pt-2.5 border-t border-[#ebdcd0] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold">Quoted Total</div>
                      <div
                        className="text-sm font-extrabold"
                        style={{ color: branch.theme.primaryColor }}
                      >
                        {formatInr(lineTotal)}
                      </div>
                      <div className="text-[10.5px] text-gray-500">
                        {formatInr(item.price)} / unit
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Price History Button */}
                      {(item.sku || item.name) && (
                        <button
                          type="button"
                          onClick={() => onOpenSkuHistory(item.sku, item.name, originalIndex)}
                          className="p-1.5 text-stone-600 hover:text-amber-900 hover:bg-amber-50 rounded-lg text-xs cursor-pointer transition-colors"
                          title="View SKU Pricing History"
                        >
                          🕒
                        </button>
                      )}

                      {/* Jump to Table Row */}
                      <button
                        type="button"
                        onClick={() => onSwitchToTable(originalIndex)}
                        className="p-1.5 text-stone-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg text-xs cursor-pointer transition-colors"
                        title="Edit in Schedule Table"
                      >
                        ✏️
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onRemoveItem(originalIndex)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs cursor-pointer transition-colors"
                        title="Delete Luminaire"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Lookbook Modal */}
      {lightboxIdx !== null && items[lightboxIdx] && (() => {
        const activeItem = items[lightboxIdx];
        const lineTotal = (Number(activeItem.price) || 0) * (Number(activeItem.qty) || 0);

        return (
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[1100] flex items-center justify-center p-3 sm:p-6"
            onClick={() => setLightboxIdx(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl border border-neutral-300 relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setLightboxIdx(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-neutral-900/70 hover:bg-black text-white flex items-center justify-center z-20 cursor-pointer"
              >
                ✕
              </button>

              {/* Left Column: Full Image Container */}
              <div className="md:w-1/2 bg-[#fcfaf7] p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-[#ebdcd0]">
                {activeItem.img ? (
                  <img
                    src={activeItem.img}
                    alt={activeItem.name}
                    className="max-h-[60vh] max-w-full object-contain drop-shadow-md rounded"
                  />
                ) : (
                  <div className="text-center p-8 text-stone-400">
                    <span className="text-4xl block mb-2">📷</span>
                    <span className="text-xs font-semibold">No Image Uploaded</span>
                  </div>
                )}

                {/* Previous / Next Arrow Controls */}
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setLightboxIdx(prev => (prev !== null && prev > 0 ? prev - 1 : items.length - 1));
                    }}
                    className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-stone-900 font-bold shadow-md flex items-center justify-center pointer-events-auto cursor-pointer"
                    title="Previous Fixture (Arrow Left)"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setLightboxIdx(prev => (prev !== null && prev < items.length - 1 ? prev + 1 : 0));
                    }}
                    className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-stone-900 font-bold shadow-md flex items-center justify-center pointer-events-auto cursor-pointer"
                    title="Next Fixture (Arrow Right)"
                  >
                    ›
                  </button>
                </div>

                <div className="text-[11px] text-stone-400 font-mono mt-3">
                  Fixture {lightboxIdx + 1} of {items.length} (Use ← / → keys to navigate)
                </div>
              </div>

              {/* Right Column: Full Specifications & Commercial Details */}
              <div className="md:w-1/2 p-6 flex flex-col justify-between space-y-4 overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-xs font-extrabold px-2 py-0.5 rounded shadow-2xs"
                      style={{ backgroundColor: branch.theme.accentColor, color: '#170e08' }}
                    >
                      {activeItem.sku || 'AL-SPEC'}
                    </span>
                    <span className="text-xs text-stone-500 font-semibold">
                      {activeItem.category || 'Architectural Lighting'}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-xl text-neutral-900">
                    {activeItem.name || 'Architectural Luminaire'}
                  </h3>

                  {/* Optical & Electrical Specs */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#ebdcd0]">
                    <div className="p-2 bg-stone-50 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Wattage</span>
                      <span className="font-bold text-gray-800">{activeItem.watt || 'N/A'}</span>
                    </div>

                    <div className="p-2 bg-stone-50 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Color Temperature</span>
                      <span className="font-bold text-amber-800">{activeItem.cct || 'N/A'}</span>
                    </div>

                    <div className="p-2 bg-stone-50 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Beam Angle</span>
                      <span className="font-bold text-gray-800">{activeItem.beam || 'N/A'}</span>
                    </div>

                    <div className="p-2 bg-stone-50 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">CRI Rating</span>
                      <span className="font-bold text-gray-800">{activeItem.cri || 'N/A'}</span>
                    </div>

                    <div className="p-2 bg-stone-50 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">IP Enclosure</span>
                      <span className="font-bold text-gray-800">{activeItem.ip || 'N/A'}</span>
                    </div>

                    <div className="p-2 bg-stone-50 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Body Finish</span>
                      <span className="font-bold text-gray-800">{activeItem.finish || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Commercial Details */}
                <div className="pt-4 border-t border-[#ebdcd0] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500">Specified Quantity:</span>
                      <span className="font-bold text-sm text-gray-900 ml-1.5">{activeItem.qty} units</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">Quoted Line Total:</span>
                      <span
                        className="text-lg font-extrabold"
                        style={{ color: branch.theme.primaryColor }}
                      >
                        {formatInr(lineTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetIdx = lightboxIdx;
                        setLightboxIdx(null);
                        onSwitchToTable(targetIdx);
                      }}
                      className="px-4 py-2 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
                    >
                      ✏️ Edit in Schedule Table
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
