# Side-Docked Product Catalog & Stock Items Drawer: Technical Review & Implementation Scripts

## 1. Executive Summary & Design Overview

Based on your design reference (`image_90756972.png`), we are designing a **Side-Docked Product Catalog & Stock Items Drawer** that seamlessly sits directly to the right of your Quotation Schedule.

Rather than opening a full-screen blocking modal that hides the quotation, the user can now browse, search, and select luminaires **side-by-side** with the active quotation table.

```
┌─────────────────────────────────────────────────────────────┬────────────────────────────────────┐
│                       QUOTATION TABLE                       │   ⚡ List of Stock Items (Row #1) ✕│
│  Luminaire Specification & Price Proposal                   ├────────────────────────────────────┤
│                                                             │  🔍 Search matching SKU or name... │
├─────────────────────────────────────────────────────────────┼────────────────────────────────────┤
│ S.No. │ Product Code │ Product Description   │ Qty │ Unit ₹ │  [All] [Downlights] [Tracks] [P...]│
├───────┼──────────────┼───────────────────────┼─────┼────────┼────────────────────────────────────┤
│   1   │ LFSL1211R-ZT⚡│ COBLIGHT ZIGBEE 7W... │  1  │ 3,585  │  ┌───┐ LFSL1211R-ZT        ₹3,585  │
│       │              │ ⚡ 7W  |  💡 3000K    │     │        │  │ 💡│ COBLIGHT ZIGBEE 7W  + Select│
│       │              │ 🎯 24° |  🎨 CRI 95   │     │        │  └───┘ ⚡ 7W • CCT • Matt White   │
│   2   │ 17MM PROFILE │ Surface Profile 2M... │  2  │   250  │  ┌───┐ AL-DL-COB15         ₹2,850  │
│       │              │                       │     │        │  │ 💡│ Architectural Downlight     │
│   3   │ [SKU...] ⚡  │ [Type to search...]   │  1  │     0  │  └───┘ ⚡ 15W • 4000K • CRI 95     │
├───────┴──────────────┴───────────────────────┴─────┴────────┼────────────────────────────────────┤
│ + Add Row  |  ❖ Catalog  |  + Spec                          │ Press Enter or click to populate #1│
└─────────────────────────────────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Key Features & Interaction Workflow

### A. Side-by-Side Split View
* **Dynamic Grid Layout**: When the side catalog is closed, the quotation table spans full width. When opened, the view smoothly transitions into a side-by-side grid (`flex` or `grid lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_420px]`).
* **Non-Blocking Operation**: The quotation table remains completely editable while the stock items drawer is open.
* **Auto-Scroll & Row Focus**: The quotation table keeps the target row highlighted with an amber border so the user always knows which row is being filled.

### B. Trigger Points (How to Open the Drawer)
1. **Lightning Icon (`⚡`) inside SKU cell**: Clicking the amber lightning button on any row opens the drawer bound directly to that row.
2. **Focusing / Typing in SKU input**: When typing a partial SKU (e.g. `LFSL`), the drawer automatically opens and filters matching stock items in real time.
3. **Bottom Table Toolbar Button (`❖ Catalog`)**: Opens the drawer for the currently selected or newest row.
4. **Keyboard Shortcut**: Pressing `F2` or `Ctrl + Space` while focused on a row.

### C. Context-Aware Row Binding ("Row #X")
* Drawer header dynamically displays: **`⚡ List of Stock Items (Row #1)`** (updates to `#2`, `#3`, etc. as you click different rows).
* A close button (`✕`) at the top right collapses the drawer back into full-width table mode.

### D. Smart Search & Instant Category Filters
* **Live Search**: Searches across SKU, product title, description, body finish, wattage, and CCT.
* **Filter Chips**:
  * `All`
  * `Downlights`
  * `Magnetic Tracks`
  * `LED Profiles`
  * `COB Spotlights`
  * `Linear & Strip Lights`
  * `Wall Sconces & Pendants`
  * `Outdoor & Landscape`

### E. 1-Click Row Population (`+ Select`)
When a user clicks **`+ Select`** (or presses Enter on an item):
The active row is instantly populated with complete architectural lighting specs:
* **Product Code / SKU**: e.g., `LFSL1211R-ZT`
* **Product Description**: e.g., `COBLIGHT ZIGBEE TUNABLE`
* **Power / Wattage**: `7W`
* **CCT**: `Tunable White / 3000K-6000K`
* **Beam Angle**: `24°`
* **CRI**: `CRI 95+`
* **IP Rating**: `IP20`
* **Body Finish**: `Matt White`
* **Reflector**: `Specular Gold / Deep Baffle`
* **High-Res Luminaire Image**: Attached to the row
* **List Price & Unit Price**: Set to stock catalog rate (e.g., `₹3,585`)
* **Auto-Advance Option**: Automatically moves focus to the next row for rapid quote building!

---

## 3. Component Architecture & Script Specification

### File 1: `src/components/SideStockCatalogDrawer.tsx` (New Dedicated Component)
```tsx
import React, { useState, useMemo } from 'react';
import { Product, StudioBranch } from '../types';

interface SideStockCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeRowIndex: number;
  activeRowSku?: string;
  products: Product[];
  branch: StudioBranch;
  onSelectItem: (rowIndex: number, product: Product) => void;
  formatInr: (amount: number) => string;
}

export const SideStockCatalogDrawer: React.FC<SideStockCatalogDrawerProps> = ({
  isOpen,
  onClose,
  activeRowIndex,
  activeRowSku = '',
  products,
  branch,
  onSelectItem,
  formatInr,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Categories list derived from inventory
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered products based on search term and active category
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch =
        !term ||
        p.sku.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        (p.cct && p.cct.toLowerCase().includes(term)) ||
        (p.watt && p.watt.toLowerCase().includes(term)) ||
        (p.finish && p.finish.toLowerCase().includes(term));
      return matchCat && matchSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <aside className="w-full lg:w-[400px] xl:w-[440px] shrink-0 bg-white border-l border-[#d9cbb9] shadow-xl flex flex-col h-full z-40 transition-all duration-200">
      {/* Header */}
      <div className="p-3.5 bg-gradient-to-r from-[#faf7f4] to-white border-b border-[#d9cbb9] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-600 font-bold text-base">⚡</span>
          <div>
            <h3 className="font-bold text-sm text-[#17191c]">
              List of Stock Items <span className="text-amber-700 font-extrabold">(Row #{activeRowIndex + 1})</span>
            </h3>
            <p className="text-[11px] text-gray-500">Click to populate selected quotation row</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
          title="Close Catalog Drawer"
        >
          ✕
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-gray-100 bg-[#fdfbf9]">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={`Search matching "${activeRowSku || 'SKU'}" or name...`}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#d9cbb9] rounded-lg outline-none focus:border-[#7b3f22] focus:ring-1 focus:ring-[#7b3f22]/30"
          />
          <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🔍</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1.5 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-0.5 no-scrollbar text-[11px]">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md font-semibold shrink-0 cursor-pointer transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 divide-y divide-gray-100">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <span className="text-3xl block mb-2">💡</span>
            <p className="text-xs font-semibold">No luminaires found</p>
            <p className="text-[11px] text-gray-400 mt-1">Try another search keyword or category filter</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <div
              key={product.id}
              className="pt-2 p-2 hover:bg-[#faf7f4] rounded-lg border border-transparent hover:border-amber-200 transition-all flex items-start gap-2.5 cursor-pointer group"
              onClick={() => onSelectItem(activeRowIndex, product)}
            >
              {/* Image thumbnail */}
              <div className="w-12 h-12 bg-white rounded border border-gray-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                {product.img ? (
                  <img src={product.img} alt={product.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xl text-gray-300">💡</span>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono font-bold text-xs text-amber-900 truncate">
                    {product.sku}
                  </span>
                  <span className="font-bold text-xs text-emerald-700 font-mono">
                    {formatInr(product.price)}
                  </span>
                </div>

                <div className="text-xs font-semibold text-gray-800 line-clamp-1">
                  {product.name}
                </div>

                {/* Specs inline */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 mt-1">
                  {product.watt && <span>⚡ {product.watt}</span>}
                  {product.cct && <span>• 💡 {product.cct}</span>}
                  {product.finish && <span>• ✨ {product.finish}</span>}
                </div>
              </div>

              {/* Select Button */}
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shadow-xs transition-opacity shrink-0 cursor-pointer self-center"
              >
                + Select
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer Helper */}
      <div className="p-2.5 bg-[#fbf8f5] border-t border-[#d9cbb9] text-[11px] text-gray-500 text-center">
        Click any item or press <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono text-[10px]">Enter</kbd> to populate Row #{activeRowIndex + 1}
      </div>
    </aside>
  );
};
```

---

### File 2: Layout Updates in `src/App.tsx`
1. **Container Layout**:
   Wraps the quotation editor table and the `SideStockCatalogDrawer` in a responsive flex layout:
   ```tsx
   <div className="flex flex-col lg:flex-row items-stretch gap-0 overflow-hidden rounded-xl border border-[#d9cbb9] bg-white shadow-xl">
     {/* Main Quotation Schedule Table (Flexible 1fr) */}
     <div className="flex-1 min-w-0 overflow-x-auto">
       {/* Quotation Table Code */}
     </div>

     {/* Docked Stock Items Drawer (Right Side) */}
     {isSideCatalogOpen && (
       <SideStockCatalogDrawer
         isOpen={isSideCatalogOpen}
         activeRowIndex={activeCatalogRowIndex}
         activeRowSku={items[activeCatalogRowIndex]?.sku}
         products={products}
         branch={activeBranch}
         onSelectItem={handlePopulateFromCatalog}
         onClose={() => setIsSideCatalogOpen(false)}
         formatInr={formatInr}
       />
     )}
   </div>
   ```

2. **Row Interaction**:
   * Add a `⚡` button inside the SKU cell:
     ```tsx
     <button
       type="button"
       onClick={() => {
         setActiveCatalogRowIndex(idx);
         setIsSideCatalogOpen(true);
       }}
       className="p-1 hover:bg-amber-100 rounded text-amber-700 font-bold text-xs"
       title="Open Stock Catalog for Row"
     >
       ⚡
     </button>
     ```
   * Clicking `- Catalog` at the bottom sets `activeCatalogRowIndex = items.length - 1` and opens the side drawer.

---

## 4. Confirmation & Next Step

Please review this script and design flow:
* ✅ **Side-docked right drawer**: Sits beside the quotation table, matching your reference image.
* ✅ **Context-bound to active row**: Clearly highlights and targets `Row #X`.
* ✅ **Full luminaire spec population**: Transfers SKU, Description, Wattage, CCT, Beam, CRI, IP, Finish, Reflector, Image, and Price in 1 click.
* ✅ **Zero modal blocking**: You can type and inspect the quotation simultaneously.

**Reply with your confirmation or any adjustments, and I will implement it immediately!**
