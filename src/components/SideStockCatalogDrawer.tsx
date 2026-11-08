import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LightingProduct, BranchProfile } from '../types';

interface SideStockCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeRowIndex: number;
  activeRowSku?: string;
  activeRowName?: string;
  products: LightingProduct[];
  branch: BranchProfile;
  onSelectItem: (rowIndex: number, product: LightingProduct) => void;
  formatInr: (amount: number) => string;
  onOpenPdfImporter?: () => void;
}

export const SideStockCatalogDrawer: React.FC<SideStockCatalogDrawerProps> = ({
  isOpen,
  onClose,
  activeRowIndex,
  activeRowSku = '',
  activeRowName = '',
  products,
  branch,
  onSelectItem,
  formatInr,
  onOpenPdfImporter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // When activeRowSku or activeRowIndex changes and drawer opens, initialize search filter
  useEffect(() => {
    if (isOpen) {
      if (activeRowSku && activeRowSku.trim().length > 1) {
        setSearchTerm(activeRowSku.trim());
      } else {
        setSearchTerm('');
      }
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 80);
    }
  }, [isOpen, activeRowIndex, activeRowSku]);

  // Derive distinct categories from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    // Priority order for lighting categories
    const priority = ['All', 'Downlights', 'Spotlights', 'Tracks', 'Profiles', 'LED Strips', 'Sconces', 'Pendants', 'Outdoor'];
    const found = Array.from(set);
    const ordered: string[] = ['All'];
    priority.forEach(cat => {
      if (cat !== 'All' && found.includes(cat) && !ordered.includes(cat)) {
        ordered.push(cat);
      }
    });
    found.forEach(cat => {
      if (!ordered.includes(cat)) {
        ordered.push(cat);
      }
    });
    return ordered;
  }, [products]);

  // Filter products by search term and category
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter(p => {
      const matchCat =
        selectedCategory === 'All' ||
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

      const matchSearch =
        !term ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.cct && p.cct.toLowerCase().includes(term)) ||
        (p.watt && p.watt.toLowerCase().includes(term)) ||
        (p.finish && p.finish.toLowerCase().includes(term)) ||
        (p.beam && p.beam.toLowerCase().includes(term));

      return matchCat && matchSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <aside
      className="w-full lg:w-[380px] xl:w-[420px] shrink-0 bg-white border-l border-[#d9cbb9] flex flex-col h-auto min-h-[600px] z-30 transition-all duration-200 shadow-xl"
      aria-label="Stock Items Catalog Drawer"
    >
      {/* 1. Header Bar: Matching reference image style */}
      <div className="p-3.5 bg-[#faf7f4] border-b border-[#d9cbb9] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-amber-600 font-bold text-base shrink-0">⚡</span>
          <div className="min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-[#17191c] truncate flex items-center gap-1.5">
              <span>List of Stock Items</span>
              <span
                className="font-extrabold px-1.5 py-0.5 rounded text-[11px] text-white shrink-0 shadow-xs"
                style={{ backgroundColor: branch.theme.primaryColor }}
              >
                Row #{activeRowIndex + 1}
              </span>
            </h3>
            <p className="text-[10.5px] text-gray-500 truncate">
              {activeRowName ? `Targeting: ${activeRowName}` : 'Click any luminaire to populate this row'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenPdfImporter && (
            <button
              type="button"
              onClick={onOpenPdfImporter}
              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              title="Auto-import catalog products from PDF"
            >
              <span>⚡</span>
              <span>Import PDF</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-200/70 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors shrink-0"
            title="Close Stock Catalog Drawer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. Search & Category Filters Area */}
      <div className="p-3 border-b border-[#ebdcd0] bg-[#fdfbf9] shrink-0 space-y-2.5">
        {/* Search Input Box */}
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={`Search matching "${activeRowSku || 'SKU'}" or name...`}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-[#d9cbb9] rounded-lg outline-none focus:border-[#7b3f22] focus:ring-1 focus:ring-[#7b3f22]/30 font-medium"
          />
          <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🔍</span>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-700 text-xs p-0.5 cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Scrollable Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md font-semibold shrink-0 cursor-pointer transition-all ${
                  isSelected
                    ? 'text-white shadow-xs font-bold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
                style={isSelected ? { backgroundColor: branch.theme.primaryColor } : {}}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Luminaire Product Cards List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 divide-y divide-gray-100 max-h-[650px]">
        {filteredProducts.length === 0 ? (
          <div className="py-12 px-4 text-center text-gray-400">
            <span className="text-3xl block mb-2">💡</span>
            <p className="text-xs font-bold text-gray-700">No matching luminaires found</p>
            <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">
              Try searching with another keyword, clearing the search box, or selecting "All" categories.
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="mt-3 px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          filteredProducts.map(product => (
            <div
              key={product.id}
              onClick={() => onSelectItem(activeRowIndex, product)}
              className="pt-2 p-2.5 rounded-xl border border-transparent hover:border-amber-300 hover:bg-[#faf7f4] transition-all cursor-pointer group flex items-start gap-2.5"
              title={`Click to populate Row #${activeRowIndex + 1} with ${product.sku}`}
            >
              {/* Product Thumbnail */}
              <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 p-1 shrink-0 flex items-center justify-center overflow-hidden group-hover:border-amber-400 transition-colors">
                {product.img ? (
                  <img
                    src={product.img}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xl text-stone-400">💡</span>
                )}
              </div>

              {/* Luminaire Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-mono font-bold text-xs text-[#7b3f22] group-hover:text-amber-900 transition-colors truncate">
                      {product.sku}
                    </span>
                    {product.category && (
                      <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-medium shrink-0">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-xs text-emerald-700 font-mono shrink-0">
                    {formatInr(product.price)}
                  </span>
                </div>

                <div className="text-xs font-bold text-gray-800 line-clamp-1 mt-0.5 group-hover:text-amber-950">
                  {product.name}
                </div>

                {/* Inline Optical & Electrical Specs */}
                <div className="flex flex-wrap items-center gap-1 text-[10px] text-gray-500 mt-1 font-medium">
                  {product.watt && <span className="text-amber-800">⚡ {product.watt}</span>}
                  {product.cct && <span>• 💡 {product.cct}</span>}
                  {product.finish && <span>• ✨ {product.finish}</span>}
                  {product.beam && <span>• 🎯 {product.beam}</span>}
                  {product.cri && <span>• 🎨 {product.cri}</span>}
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0 self-center">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onSelectItem(activeRowIndex, product);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-xs cursor-pointer transition-all opacity-85 group-hover:opacity-100 group-hover:scale-105"
                  style={{ backgroundColor: branch.theme.primaryColor }}
                >
                  + Select
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Bottom Status & Keyboard Hint Footer */}
      <div className="p-2.5 bg-[#fbf8f5] border-t border-[#d9cbb9] text-[11px] text-gray-500 flex items-center justify-between gap-2 shrink-0">
        <span className="truncate">
          Press or click item to populate <strong className="text-gray-800">Row #{activeRowIndex + 1}</strong>
        </span>
        <span className="font-mono text-[10px] text-gray-400 shrink-0">
          {filteredProducts.length} items
        </span>
      </div>
    </aside>
  );
};
