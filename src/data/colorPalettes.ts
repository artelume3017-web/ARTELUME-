export interface ColorPalette {
  id: number;
  name: string;
  category:
    | 'Corporate & Clean'
    | 'Warm & Earthy'
    | 'Bold & Vibrant'
    | 'Luxury & Dark'
    | 'Soft, Pastel & Minimal'
    | 'Dopely Collection'
    | 'Premium UI'
    | 'Beauty & Warm'
    | 'Food & Cafe'
    | 'Gradient & Neon'
    | 'Retro & Vintage'
    | 'Seasonal & Nature';
  colors: string[]; // Full color plate swatches (3 to 5 colors)
  primary: string; // Hex for primary banner
  accent: string;  // Hex for accent highlight
  excelBannerColor: string; // ARGB
  excelAccentColor: string; // ARGB
  tag: string;
}

export function hexToARGB(hex: string): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    return 'FF' + clean.toUpperCase();
  }
  if (clean.length === 8) {
    return clean.toUpperCase();
  }
  return 'FF000000';
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const fullHex = clean.length === 3 ? clean.split('').map(x => x + x).join('') : clean;
  const num = parseInt(fullHex || '000000', 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function getDarkTone(hex: string, opacity = 0.16): string {
  const { r, g, b } = hexToRgb(hex);
  const bgR = Math.round(18 + r * opacity);
  const bgG = Math.round(18 + g * opacity);
  const bgB = Math.round(20 + b * opacity);
  return `rgb(${bgR}, ${bgG}, ${bgB})`;
}

export function getContrastTextColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#111215' : '#ffffff';
}

export const PALETTE_CATEGORIES = [
  'All (121)',
  'Luxury & Dark',
  'Warm & Earthy',
  'Corporate & Clean',
  'Bold & Vibrant',
  'Soft, Pastel & Minimal',
  'Dopely Collection',
  'Premium UI',
  'Beauty & Warm',
  'Food & Cafe',
  'Gradient & Neon',
  'Retro & Vintage',
  'Seasonal & Nature'
] as const;

export const COLOR_PALETTES: ColorPalette[] = [
  // --- Corporate and Clean (01 - 10) ---
  {
    id: 1,
    name: 'Royal blue and gold',
    category: 'Corporate & Clean',
    colors: ['#1E3A8A', '#F8BF24', '#FEF3C7', '#E5E7EB'],
    primary: '#1E3A8A',
    accent: '#F8BF24',
    excelBannerColor: 'FF1E3A8A',
    excelAccentColor: 'FFF8BF24',
    tag: 'Classic corporate prestige'
  },
  {
    id: 2,
    name: 'Navy and cream',
    category: 'Corporate & Clean',
    colors: ['#1E3A8A', '#F9FAFB', '#E7E5E4', '#F3F4F6'],
    primary: '#1E3A8A',
    accent: '#E7E5E4',
    excelBannerColor: 'FF1E3A8A',
    excelAccentColor: 'FFE7E5E4',
    tag: 'Executive minimal cream'
  },
  {
    id: 3,
    name: 'Slate and blue',
    category: 'Corporate & Clean',
    colors: ['#475569', '#3B82F6', '#93C5FD', '#E0F2FE'],
    primary: '#475569',
    accent: '#3B82F6',
    excelBannerColor: 'FF475569',
    excelAccentColor: 'FF3B82F6',
    tag: 'Modern architectural slate'
  },
  {
    id: 4,
    name: 'Corporate blue',
    category: 'Corporate & Clean',
    colors: ['#0F62FE', '#2563EB', '#3B82F6', '#93C5FD', '#E0E7FF'],
    primary: '#0F62FE',
    accent: '#3B82F6',
    excelBannerColor: 'FF0F62FE',
    excelAccentColor: 'FF3B82F6',
    tag: 'Dynamic corporate energy'
  },
  {
    id: 5,
    name: 'Charcoal and coral',
    category: 'Corporate & Clean',
    colors: ['#374151', '#FF6B6B', '#FFB4A2', '#FFE4E6'],
    primary: '#374151',
    accent: '#FF6B6B',
    excelBannerColor: 'FF374151',
    excelAccentColor: 'FFFF6B6B',
    tag: 'Crisp charcoal with vivid accent'
  },
  {
    id: 6,
    name: 'Deep teal and gold',
    category: 'Corporate & Clean',
    colors: ['#004D4D', '#0F7F7F', '#3FB8B8', '#D4AF37', '#F8F6F1'],
    primary: '#004D4D',
    accent: '#D4AF37',
    excelBannerColor: 'FF004D4D',
    excelAccentColor: 'FFD4AF37',
    tag: 'Teal architectural elegance'
  },
  {
    id: 7,
    name: 'Steel and sky',
    category: 'Corporate & Clean',
    colors: ['#334155', '#64748B', '#CBD5E1', '#F1F5F9'],
    primary: '#334155',
    accent: '#64748B',
    excelBannerColor: 'FF334155',
    excelAccentColor: 'FF64748B',
    tag: 'Steel balance and light'
  },
  {
    id: 8,
    name: 'Ocean corporate',
    category: 'Corporate & Clean',
    colors: ['#0C4A6E', '#0284C7', '#38BDF8', '#E0F2FE'],
    primary: '#0C4A6E',
    accent: '#0284C7',
    excelBannerColor: 'FF0C4A6E',
    excelAccentColor: 'FF0284C7',
    tag: 'Deep ocean corporate clarity'
  },
  {
    id: 9,
    name: 'Monochrome blue',
    category: 'Corporate & Clean',
    colors: ['#0D47A1', '#1976D2', '#64B5F6', '#BBDEFB', '#E3F2FD'],
    primary: '#0D47A1',
    accent: '#64B5F6',
    excelBannerColor: 'FF0D47A1',
    excelAccentColor: 'FF64B5F6',
    tag: 'Precision tonal blue'
  },
  {
    id: 10,
    name: 'Cool professional',
    category: 'Corporate & Clean',
    colors: ['#0EA5E9', '#06B6D4', '#14B8A6', '#A3E635', '#C7D2FE'],
    primary: '#0EA5E9',
    accent: '#14B8A6',
    excelBannerColor: 'FF0EA5E9',
    excelAccentColor: 'FF14B8A6',
    tag: 'Fresh tech & professional'
  },

  // --- Warm and earthy (11 - 20) ---
  {
    id: 11,
    name: 'Terracotta and sand',
    category: 'Warm & Earthy',
    colors: ['#C0563D', '#8B5E3C', '#D6C6B3', '#FAF3E0'],
    primary: '#C0563D',
    accent: '#8B5E3C',
    excelBannerColor: 'FFC0563D',
    excelAccentColor: 'FF8B5E3C',
    tag: 'Earthy warmth & sand'
  },
  {
    id: 12,
    name: 'Terracotta brand',
    category: 'Warm & Earthy',
    colors: ['#A4553A', '#F2A82E', '#FBF5EC', '#E9D6C2', '#2B2220'],
    primary: '#A4553A',
    accent: '#F2A82E',
    excelBannerColor: 'FFA4553A',
    excelAccentColor: 'FFF2A82E',
    tag: 'Artè Lume signature terracotta'
  },
  {
    id: 13,
    name: 'Mustard and brown',
    category: 'Warm & Earthy',
    colors: ['#D97706', '#92400E', '#D6B89C', '#F5EAD7'],
    primary: '#92400E',
    accent: '#D97706',
    excelBannerColor: 'FF92400E',
    excelAccentColor: 'FFD97706',
    tag: 'Rich ochre & wood tones'
  },
  {
    id: 14,
    name: 'Olive and beige',
    category: 'Warm & Earthy',
    colors: ['#556B2F', '#A3B18A', '#E7DCC8', '#F7F6F1'],
    primary: '#556B2F',
    accent: '#A3B18A',
    excelBannerColor: 'FF556B2F',
    excelAccentColor: 'FFA3B18A',
    tag: 'Olive canopy & warm beige'
  },
  {
    id: 15,
    name: 'Earthy neutrals',
    category: 'Warm & Earthy',
    colors: ['#3E2723', '#8D6E63', '#C9B8A7', '#EADCC8', '#F5EFE7'],
    primary: '#3E2723',
    accent: '#8D6E63',
    excelBannerColor: 'FF3E2723',
    excelAccentColor: 'FF8D6E63',
    tag: 'Subdued organic plaster'
  },
  {
    id: 16,
    name: 'Autumn harvest',
    category: 'Warm & Earthy',
    colors: ['#7C2D12', '#C2410C', '#F59E0B', '#FDE68A', '#FEF3C7'],
    primary: '#7C2D12',
    accent: '#F59E0B',
    excelBannerColor: 'FF7C2D12',
    excelAccentColor: 'FFF59E0B',
    tag: 'Warm autumnal glow'
  },
  {
    id: 17,
    name: 'Clay and cream',
    category: 'Warm & Earthy',
    colors: ['#B9654A', '#E8D9C8', '#F7F1E8', '#2E2A27'],
    primary: '#B9654A',
    accent: '#E8D9C8',
    excelBannerColor: 'FFB9654A',
    excelAccentColor: 'FFE8D9C8',
    tag: 'Artisan pottery aesthetic'
  },
  {
    id: 18,
    name: 'Honey and cocoa',
    category: 'Warm & Earthy',
    colors: ['#E8A33D', '#6B4226', '#C4A484', '#F5E6D3'],
    primary: '#6B4226',
    accent: '#E8A33D',
    excelBannerColor: 'FF6B4226',
    excelAccentColor: 'FFE8A33D',
    tag: 'Cozy lounge warmth'
  },
  {
    id: 19,
    name: 'Rust and sand',
    category: 'Warm & Earthy',
    colors: ['#9C4A2F', '#D9A441', '#EADBC8', '#FAF6EF'],
    primary: '#9C4A2F',
    accent: '#D9A441',
    excelBannerColor: 'FF9C4A2F',
    excelAccentColor: 'FFD9A441',
    tag: 'Earthy desert palette'
  },
  {
    id: 20,
    name: 'Warm espresso',
    category: 'Warm & Earthy',
    colors: ['#2B2220', '#7A3B2A', '#F2A82E', '#FBF5EC'],
    primary: '#2B2220',
    accent: '#F2A82E',
    excelBannerColor: 'FF2B2220',
    excelAccentColor: 'FFF2A82E',
    tag: 'Deep espresso & amber'
  },

  // --- Bold and vibrant (21 - 30) ---
  {
    id: 21,
    name: 'Teal and coral',
    category: 'Bold & Vibrant',
    colors: ['#0D9488', '#FF6B6B', '#FFD6CC', '#E6F7F4'],
    primary: '#0D9488',
    accent: '#FF6B6B',
    excelBannerColor: 'FF0D9488',
    excelAccentColor: 'FFFF6B6B',
    tag: 'Vibrant modern retail'
  },
  {
    id: 22,
    name: 'Purple and yellow',
    category: 'Bold & Vibrant',
    colors: ['#7C3AED', '#FACC15', '#FEF9C3', '#EDE9FE'],
    primary: '#7C3AED',
    accent: '#FACC15',
    excelBannerColor: 'FF7C3AED',
    excelAccentColor: 'FFFACC15',
    tag: 'Dynamic contrast'
  },
  {
    id: 23,
    name: 'Indigo and orange',
    category: 'Bold & Vibrant',
    colors: ['#4F46E5', '#F97316', '#FFEDD5', '#E0E7FF'],
    primary: '#4F46E5',
    accent: '#F97316',
    excelBannerColor: 'FF4F46E5',
    excelAccentColor: 'FFF97316',
    tag: 'Electric evening mood'
  },
  {
    id: 24,
    name: 'Red and grey',
    category: 'Bold & Vibrant',
    colors: ['#EF4444', '#334155', '#CBD5E1', '#F1F5F9'],
    primary: '#334155',
    accent: '#EF4444',
    excelBannerColor: 'FF334155',
    excelAccentColor: 'FFEF4444',
    tag: 'Sharp high-impact architectural'
  },
  {
    id: 25,
    name: 'Pink and mint',
    category: 'Bold & Vibrant',
    colors: ['#EC4899', '#10B981', '#FCE7F3', '#D1FAE5'],
    primary: '#10B981',
    accent: '#EC4899',
    excelBannerColor: 'FF10B981',
    excelAccentColor: 'FFEC4899',
    tag: 'Playful boutique luminaire'
  },
  {
    id: 26,
    name: 'Cyan and magenta',
    category: 'Bold & Vibrant',
    colors: ['#06B6D4', '#EC4899', '#FBCFE8', '#E0F2FE'],
    primary: '#06B6D4',
    accent: '#EC4899',
    excelBannerColor: 'FF06B6D4',
    excelAccentColor: 'FFEC4899',
    tag: 'Ultra-modern neon pop'
  },
  {
    id: 27,
    name: 'Electric sunset',
    category: 'Bold & Vibrant',
    colors: ['#FF6B6B', '#FF9F1C', '#FFBF69', '#7209B7'],
    primary: '#7209B7',
    accent: '#FF9F1C',
    excelBannerColor: 'FF7209B7',
    excelAccentColor: 'FFFF9F1C',
    tag: 'Atmospheric twilight'
  },
  {
    id: 28,
    name: 'Neon pop',
    category: 'Bold & Vibrant',
    colors: ['#FF2D8B', '#8B5CF6', '#6366F1', '#06B6D4', '#A3E635'],
    primary: '#6366F1',
    accent: '#FF2D8B',
    excelBannerColor: 'FF6366F1',
    excelAccentColor: 'FFFF2D8B',
    tag: 'Club and experiential lighting'
  },
  {
    id: 29,
    name: 'Tropical punch',
    category: 'Bold & Vibrant',
    colors: ['#FF6F61', '#FFB74D', '#FFE082', '#7ED957', '#4DD0E1'],
    primary: '#FF6F61',
    accent: '#FFB74D',
    excelBannerColor: 'FFFF6F61',
    excelAccentColor: 'FFFFB74D',
    tag: 'Vibrant resort & hospitality'
  },
  {
    id: 30,
    name: 'Vintage retro',
    category: 'Bold & Vibrant',
    colors: ['#8D6E63', '#D7CCC8', '#B8AAA4', '#A5B4FC', '#FFF8E1'],
    primary: '#8D6E63',
    accent: '#A5B4FC',
    excelBannerColor: 'FF8D6E63',
    excelAccentColor: 'FFA5B4FC',
    tag: '70s mid-century revival'
  },

  // --- Luxury and dark (31 - 40) ---
  {
    id: 31,
    name: 'Classic black and gold',
    category: 'Luxury & Dark',
    colors: ['#0B0B0B', '#D4AF37', '#F5D76E', '#FAF9F6'],
    primary: '#0B0B0B',
    accent: '#D4AF37',
    excelBannerColor: 'FF0B0B0B',
    excelAccentColor: 'FFD4AF37',
    tag: 'The quintessential luxury look'
  },
  {
    id: 32,
    name: 'Navy and gold',
    category: 'Luxury & Dark',
    colors: ['#0A2D5B', '#D4AF37', '#E7D7B1', '#FAFAF8'],
    primary: '#0A2D5B',
    accent: '#D4AF37',
    excelBannerColor: 'FF0A2D5B',
    excelAccentColor: 'FFD4AF37',
    tag: 'High-end executive elegance'
  },
  {
    id: 33,
    name: 'Burgundy and gold',
    category: 'Luxury & Dark',
    colors: ['#6B0F1A', '#D4AF37', '#C9A96A', '#EAD9C6'],
    primary: '#6B0F1A',
    accent: '#D4AF37',
    excelBannerColor: 'FF6B0F1A',
    excelAccentColor: 'FFD4AF37',
    tag: 'Opulent theater & private cellar'
  },
  {
    id: 34,
    name: 'Emerald and gold',
    category: 'Luxury & Dark',
    colors: ['#064E3B', '#D4AF37', '#A7B68F', '#FAFAF7'],
    primary: '#064E3B',
    accent: '#D4AF37',
    excelBannerColor: 'FF064E3B',
    excelAccentColor: 'FFD4AF37',
    tag: 'Imperial emerald sophistication'
  },
  {
    id: 35,
    name: 'Charcoal and champagne',
    category: 'Luxury & Dark',
    colors: ['#1F1F1F', '#D9C3A5', '#A79A8A', '#DADADA'],
    primary: '#1F1F1F',
    accent: '#D9C3A5',
    excelBannerColor: 'FF1F1F1F',
    excelAccentColor: 'FFD9C3A5',
    tag: 'Champagne luster on dark charcoal'
  },
  {
    id: 36,
    name: 'Purple and gold',
    category: 'Luxury & Dark',
    colors: ['#4B0082', '#D4AF37', '#C9B7E8', '#F5F0FF'],
    primary: '#4B0082',
    accent: '#D4AF37',
    excelBannerColor: 'FF4B0082',
    excelAccentColor: 'FFD4AF37',
    tag: 'Regal penthouse ambiance'
  },
  {
    id: 37,
    name: 'Deep teal and champagne',
    category: 'Luxury & Dark',
    colors: ['#004D4D', '#C9B37E', '#3FB8B8', '#F8F6F1'],
    primary: '#004D4D',
    accent: '#C9B37E',
    excelBannerColor: 'FF004D4D',
    excelAccentColor: 'FFC9B37E',
    tag: 'Subdued luxury mineral tone'
  },
  {
    id: 38,
    name: 'Dark moody',
    category: 'Luxury & Dark',
    colors: ['#0B0F14', '#334155', '#475569', '#6B7280', '#94A3B8'],
    primary: '#0B0F14',
    accent: '#6B7280',
    excelBannerColor: 'FF0B0F14',
    excelAccentColor: 'FF6B7280',
    tag: 'Stealth architectural matte'
  },
  {
    id: 39,
    name: 'Black and rose gold',
    category: 'Luxury & Dark',
    colors: ['#111111', '#B76E79', '#E8B4B8', '#F4E7E7'],
    primary: '#111111',
    accent: '#B76E79',
    excelBannerColor: 'FF111111',
    excelAccentColor: 'FFB76E79',
    tag: 'Refined rose luminaire'
  },
  {
    id: 40,
    name: 'Espresso and gold',
    category: 'Luxury & Dark',
    colors: ['#1F1714', '#7A3B2A', '#F5B343', '#F5EDE3', '#8C7B70'],
    primary: '#1F1714',
    accent: '#F5B343',
    excelBannerColor: 'FF1F1714',
    excelAccentColor: 'FFF5B343',
    tag: 'Deep leather and warm brass'
  },

  // --- Soft, pastel and minimal (41 - 50) ---
  {
    id: 41,
    name: 'Pastel mix',
    category: 'Soft, Pastel & Minimal',
    colors: ['#C4B5FD', '#A7F3D0', '#93C5FD', '#FED7AA'],
    primary: '#475569',
    accent: '#93C5FD',
    excelBannerColor: 'FF475569',
    excelAccentColor: 'FF93C5FD',
    tag: 'Gentle architectural pastels'
  },
  {
    id: 42,
    name: 'Blush and sage',
    category: 'Soft, Pastel & Minimal',
    colors: ['#E8C4B8', '#A3B18A', '#F7F1E8', '#6B7F6A'],
    primary: '#6B7F6A',
    accent: '#E8C4B8',
    excelBannerColor: 'FF6B7F6A',
    excelAccentColor: 'FFE8C4B8',
    tag: 'Biophilic calm & soft blush'
  },
  {
    id: 43,
    name: 'Soft lavender',
    category: 'Soft, Pastel & Minimal',
    colors: ['#A78BFA', '#C4B5FD', '#EDE9FE', '#FAF5FF'],
    primary: '#7C3AED',
    accent: '#A78BFA',
    excelBannerColor: 'FF7C3AED',
    excelAccentColor: 'FFA78BFA',
    tag: 'Ethereal ambient lighting'
  },
  {
    id: 44,
    name: 'Mint and lavender',
    category: 'Soft, Pastel & Minimal',
    colors: ['#34D399', '#A78BFA', '#C4B5FD', '#ECFDF5'],
    primary: '#10B981',
    accent: '#A78BFA',
    excelBannerColor: 'FF10B981',
    excelAccentColor: 'FFA78BFA',
    tag: 'Calm restorative interior'
  },
  {
    id: 45,
    name: 'Pastel calm',
    category: 'Soft, Pastel & Minimal',
    colors: ['#FADADD', '#FFE8B6', '#D1F2EB', '#DBEAFE'],
    primary: '#334155',
    accent: '#FFE8B6',
    excelBannerColor: 'FF334155',
    excelAccentColor: 'FFFFE8B6',
    tag: 'Spa and wellness diffusion'
  },
  {
    id: 46,
    name: 'Warm neutrals',
    category: 'Soft, Pastel & Minimal',
    colors: ['#78716C', '#A8A29E', '#D6D3D1', '#F5F5F4'],
    primary: '#78716C',
    accent: '#A8A29E',
    excelBannerColor: 'FF78716C',
    excelAccentColor: 'FFA8A29E',
    tag: 'Subdued travertine'
  },
  {
    id: 47,
    name: 'Grayscale minimal',
    category: 'Soft, Pastel & Minimal',
    colors: ['#111827', '#4B5563', '#9CA3AF', '#E5E7EB', '#F9FAFB'],
    primary: '#111827',
    accent: '#9CA3AF',
    excelBannerColor: 'FF111827',
    excelAccentColor: 'FF9CA3AF',
    tag: 'Pure architectural gray'
  },
  {
    id: 48,
    name: 'Light and airy',
    category: 'Soft, Pastel & Minimal',
    colors: ['#F0F9FF', '#E0F2FE', '#E6FFFA', '#FEF7CD', '#FFE4E6'],
    primary: '#0284C7',
    accent: '#FEF7CD',
    excelBannerColor: 'FF0284C7',
    excelAccentColor: 'FFFEF7CD',
    tag: 'Sunlit daylight gallery'
  },
  {
    id: 49,
    name: 'Cream and taupe',
    category: 'Soft, Pastel & Minimal',
    colors: ['#F7F1E8', '#E8D9C8', '#B9A58F', '#6B5B4B'],
    primary: '#6B5B4B',
    accent: '#B9A58F',
    excelBannerColor: 'FF6B5B4B',
    excelAccentColor: 'FFB9A58F',
    tag: 'Quiet luxury linen'
  },
  {
    id: 50,
    name: 'Monochrome grey',
    category: 'Soft, Pastel & Minimal',
    colors: ['#1F2937', '#4B5563', '#9CA3AF', '#D1D5DB', '#F3F4F6'],
    primary: '#1F2937',
    accent: '#9CA3AF',
    excelBannerColor: 'FF1F2937',
    excelAccentColor: 'FF9CA3AF',
    tag: 'Studio industrial concrete'
  },

  // --- Dopely Palette collection (51 - 70) ---
  {
    id: 51,
    name: 'Ocean Blue and Sun',
    category: 'Dopely Collection',
    colors: ['#2563EB', '#BFDBFE', '#FACC15', '#FDE68A', '#111111'],
    primary: '#2563EB',
    accent: '#FACC15',
    excelBannerColor: 'FF2563EB',
    excelAccentColor: 'FFFACC15',
    tag: 'Azure sky & golden sun'
  },
  {
    id: 52,
    name: 'Palm Green and Coconut',
    category: 'Dopely Collection',
    colors: ['#0F7A5F', '#D9F99D', '#FFFAE8', '#B58A62', '#12372A'],
    primary: '#0F7A5F',
    accent: '#B58A62',
    excelBannerColor: 'FF0F7A5F',
    excelAccentColor: 'FFB58A62',
    tag: 'Tropical botanical serenity'
  },
  {
    id: 53,
    name: 'Midnight Sea and Neon Aqua',
    category: 'Dopely Collection',
    colors: ['#071A2E', '#22D3EE', '#C084FC', '#F8FAFC', '#164E3F'],
    primary: '#071A2E',
    accent: '#22D3EE',
    excelBannerColor: 'FF071A2E',
    excelAccentColor: 'FF22D3EE',
    tag: 'Deep abyss with neon flare'
  },
  {
    id: 54,
    name: 'Peach and Apricot',
    category: 'Dopely Collection',
    colors: ['#FFB088', '#F97345', '#FFF0E3', '#8A5A44', '#8FA878'],
    primary: '#8A5A44',
    accent: '#F97345',
    excelBannerColor: 'FF8A5A44',
    excelAccentColor: 'FFF97345',
    tag: 'Soft fruit and olive leaf'
  },
  {
    id: 55,
    name: 'Sunset Orange and Purple Dusk',
    category: 'Dopely Collection',
    colors: ['#F97316', '#FF5A6E', '#6D28D9', '#111827', '#FFF1D6'],
    primary: '#6D28D9',
    accent: '#F97316',
    excelBannerColor: 'FF6D28D9',
    excelAccentColor: 'FFF97316',
    tag: 'Horizon dusk transition'
  },
  {
    id: 56,
    name: 'Pistachio and Strawberry Cream',
    category: 'Dopely Collection',
    colors: ['#B7D99A', '#FFC4CF', '#FFF2C7', '#5A382E', '#F3FFF5'],
    primary: '#5A382E',
    accent: '#B7D99A',
    excelBannerColor: 'FF5A382E',
    excelAccentColor: 'FFB7D99A',
    tag: 'Artisanal sweet tones'
  },
  {
    id: 57,
    name: 'Orange Peel and Sea Foam',
    category: 'Dopely Collection',
    colors: ['#FF8A1F', '#FFEFA6', '#A8E6CF', '#FFFDF5', '#145C5A'],
    primary: '#145C5A',
    accent: '#FF8A1F',
    excelBannerColor: 'FF145C5A',
    excelAccentColor: 'FFFF8A1F',
    tag: 'Coastal energy & sea foam'
  },
  {
    id: 58,
    name: 'Pool Blue and Coral Pop',
    category: 'Dopely Collection',
    colors: ['#37BDF8', '#087EA4', '#F8FDFF', '#E7C99F', '#FF7C6B'],
    primary: '#087EA4',
    accent: '#FF7C6B',
    excelBannerColor: 'FF087EA4',
    excelAccentColor: 'FFFF7C6B',
    tag: 'Vibrant resort poolside'
  },
  {
    id: 59,
    name: 'Orchard Black and Copper',
    category: 'Dopely Collection',
    colors: ['#221A17', '#5A2E25', '#8C3D2D', '#B97947', '#EBD3B2'],
    primary: '#221A17',
    accent: '#B97947',
    excelBannerColor: 'FF221A17',
    excelAccentColor: 'FFB97947',
    tag: 'Smoked timber and copper'
  },
  {
    id: 60,
    name: 'Autumn Path',
    category: 'Dopely Collection',
    colors: ['#8B4A1F', '#C7782E', '#E9B45F', '#F7E4C2', '#33261D'],
    primary: '#33261D',
    accent: '#E9B45F',
    excelBannerColor: 'FF33261D',
    excelAccentColor: 'FFE9B45F',
    tag: 'Golden forest canopy'
  },
  {
    id: 61,
    name: 'Forest Shadow and Mist',
    category: 'Dopely Collection',
    colors: ['#1F2D24', '#50614B', '#8A9779', '#D8D2C0', '#F3EEE2'],
    primary: '#1F2D24',
    accent: '#8A9779',
    excelBannerColor: 'FF1F2D24',
    excelAccentColor: 'FF8A9779',
    tag: 'Deep woods & morning mist'
  },
  {
    id: 62,
    name: 'Cranberry and Blush',
    category: 'Dopely Collection',
    colors: ['#7A1F2B', '#B44B5A', '#D9A1A8', '#F3E3DC', '#3C2926'],
    primary: '#7A1F2B',
    accent: '#D9A1A8',
    excelBannerColor: 'FF7A1F2B',
    excelAccentColor: 'FFD9A1A8',
    tag: 'Rich berry luxury'
  },
  {
    id: 63,
    name: 'Wool and Mocha',
    category: 'Dopely Collection',
    colors: ['#5B382D', '#9B6A58', '#C8A996', '#EFE0D3', '#6F7658'],
    primary: '#5B382D',
    accent: '#C8A996',
    excelBannerColor: 'FF5B382D',
    excelAccentColor: 'FFC8A996',
    tag: 'Textured textile comfort'
  },
  {
    id: 64,
    name: 'Pumpkin and Squash',
    category: 'Dopely Collection',
    colors: ['#C95F22', '#E09145', '#F3C27D', '#FFF0D8', '#2F241E'],
    primary: '#2F241E',
    accent: '#E09145',
    excelBannerColor: 'FF2F241E',
    excelAccentColor: 'FFE09145',
    tag: 'Rustic farmstead warmth'
  },
  {
    id: 65,
    name: 'Olive and Wheat',
    category: 'Dopely Collection',
    colors: ['#3F4A2F', '#7A7F4E', '#B8A96B', '#E9D8B7', '#4A3428'],
    primary: '#3F4A2F',
    accent: '#B8A96B',
    excelBannerColor: 'FF3F4A2F',
    excelAccentColor: 'FFB8A96B',
    tag: 'Mediterranean countryside'
  },
  {
    id: 66,
    name: 'Cinnamon and Biscuit',
    category: 'Dopely Collection',
    colors: ['#3A241C', '#7B4A35', '#B8754D', '#E8C5A5', '#FFF0DF'],
    primary: '#3A241C',
    accent: '#B8754D',
    excelBannerColor: 'FF3A241C',
    excelAccentColor: 'FFB8754D',
    tag: 'Spiced warmth & dough'
  },
  {
    id: 67,
    name: 'Maple and Golden Leaf',
    category: 'Dopely Collection',
    colors: ['#9F2D20', '#D96B35', '#E6A84F', '#F4DFC0', '#3A211A'],
    primary: '#3A211A',
    accent: '#E6A84F',
    excelBannerColor: 'FF3A211A',
    excelAccentColor: 'FFE6A84F',
    tag: 'Vivid maple foliage'
  },
  {
    id: 68,
    name: 'Midnight Gold',
    category: 'Dopely Collection',
    colors: ['#050816', '#111B3A', '#C9A84A', '#E7D39B', '#F8F3E6'],
    primary: '#050816',
    accent: '#C9A84A',
    excelBannerColor: 'FF050816',
    excelAccentColor: 'FFC9A84A',
    tag: 'Celestial dark & polished brass'
  },
  {
    id: 69,
    name: 'Cashmere and Taupe',
    category: 'Dopely Collection',
    colors: ['#332821', '#8C7562', '#D8C5AD', '#F8EFE3', '#FFFFFF'],
    primary: '#332821',
    accent: '#8C7562',
    excelBannerColor: 'FF332821',
    excelAccentColor: 'FF8C7562',
    tag: 'Subdued cashmere weave'
  },
  {
    id: 70,
    name: 'Arctic Night and Ice',
    category: 'Dopely Collection',
    colors: ['#020617', '#0F766E', '#67E8F9', '#E0F2FE', '#F8FAFC'],
    primary: '#020617',
    accent: '#67E8F9',
    excelBannerColor: 'FF020617',
    excelAccentColor: 'FF67E8F9',
    tag: 'Glacial luminescence'
  },

  // --- Premium UI (71 - 73) ---
  {
    id: 71,
    name: 'Premium UI palette 1',
    category: 'Premium UI',
    colors: ['#211B1A', '#382A28', '#C1A094'],
    primary: '#211B1A',
    accent: '#C1A094',
    excelBannerColor: 'FF211B1A',
    excelAccentColor: 'FFC1A094',
    tag: 'Dark obsidian UI with blush metallic'
  },
  {
    id: 72,
    name: 'Premium UI palette 2',
    category: 'Premium UI',
    colors: ['#111522', '#1E263B', '#303D59', '#98A9C4'],
    primary: '#111522',
    accent: '#98A9C4',
    excelBannerColor: 'FF111522',
    excelAccentColor: 'FF98A9C4',
    tag: 'Deep twilight interface'
  },
  {
    id: 73,
    name: 'Premium UI palette 3',
    category: 'Premium UI',
    colors: ['#17151C', '#292531', '#45404F', '#AAA2B3', '#E2DDE7'],
    primary: '#17151C',
    accent: '#AAA2B3',
    excelBannerColor: 'FF17151C',
    excelAccentColor: 'FFAAA2B3',
    tag: 'Refined lavender charcoal UI'
  },

  // --- Beauty & Warm (74 - 82) ---
  {
    id: 74,
    name: 'Beauty palette 1',
    category: 'Beauty & Warm',
    colors: ['#F8D7DA', '#FBECEF', '#C98C96', '#7A5558', '#3A2A2C'],
    primary: '#3A2A2C',
    accent: '#C98C96',
    excelBannerColor: 'FF3A2A2C',
    excelAccentColor: 'FFC98C96',
    tag: 'Dusty rose and velvet'
  },
  {
    id: 75,
    name: 'Beauty palette 2',
    category: 'Beauty & Warm',
    colors: ['#FFF8EF', '#E8D8C3', '#BFA58A', '#6F5A48', '#211A16'],
    primary: '#211A16',
    accent: '#BFA58A',
    excelBannerColor: 'FF211A16',
    excelAccentColor: 'FFBFA58A',
    tag: 'Organic cosmetic glow'
  },
  {
    id: 76,
    name: 'Beauty palette 3',
    category: 'Beauty & Warm',
    colors: ['#F4C2C2', '#A64D63', '#FDF2F5', '#3D2730'],
    primary: '#3D2730',
    accent: '#A64D63',
    excelBannerColor: 'FF3D2730',
    excelAccentColor: 'FFA64D63',
    tag: 'Berry cosmetic radiance'
  },
  {
    id: 77,
    name: 'Beauty palette 4',
    category: 'Beauty & Warm',
    colors: ['#EAF3E7', '#B7C9A8', '#F8F4EA', '#3D4A35'],
    primary: '#3D4A35',
    accent: '#B7C9A8',
    excelBannerColor: 'FF3D4A35',
    excelAccentColor: 'FFB7C9A8',
    tag: 'Botanical herbal skincare'
  },
  {
    id: 78,
    name: 'Beauty palette 5',
    category: 'Beauty & Warm',
    colors: ['#120915', '#3A183F', '#D8B4E2', '#F8EEFF'],
    primary: '#120915',
    accent: '#D8B4E2',
    excelBannerColor: 'FF120915',
    excelAccentColor: 'FFD8B4E2',
    tag: 'Nocturnal orchid violet'
  },
  {
    id: 79,
    name: 'Beauty palette 6',
    category: 'Beauty & Warm',
    colors: ['#7A1F2B', '#F2A3AD', '#FFE6EA', '#2A171A'],
    primary: '#2A171A',
    accent: '#7A1F2B',
    excelBannerColor: 'FF2A171A',
    excelAccentColor: 'FF7A1F2B',
    tag: 'Crimson rouge & silk'
  },
  {
    id: 80,
    name: 'Beauty palette 7',
    category: 'Beauty & Warm',
    colors: ['#FFFFFF', '#F3EDE4', '#D8CABE', '#4A403C'],
    primary: '#4A403C',
    accent: '#D8CABE',
    excelBannerColor: 'FF4A403C',
    excelAccentColor: 'FFD8CABE',
    tag: 'Minimal plaster & alabaster'
  },
  {
    id: 81,
    name: 'Beauty palette 8',
    category: 'Beauty & Warm',
    colors: ['#543825', '#FFE8C8', '#FFF8EF'],
    primary: '#543825',
    accent: '#FFE8C8',
    excelBannerColor: 'FF543825',
    excelAccentColor: 'FFFFE8C8',
    tag: 'Caramel warmth & cream'
  },
  {
    id: 82,
    name: 'Beauty palette 9',
    category: 'Beauty & Warm',
    colors: ['#F8FBFF', '#DCEBFF', '#5B708A', '#1E2A3A'],
    primary: '#1E2A3A',
    accent: '#5B708A',
    excelBannerColor: 'FF1E2A3A',
    excelAccentColor: 'FF5B708A',
    tag: 'Hydro oceanic calm'
  },

  // --- Food brand (83 - 89) ---
  {
    id: 83,
    name: 'Food brand palette 1',
    category: 'Food & Cafe',
    colors: ['#8C1D18', '#D9472B', '#F6C6A8', '#FFF1E6'],
    primary: '#8C1D18',
    accent: '#D9472B',
    excelBannerColor: 'FF8C1D18',
    excelAccentColor: 'FFD9472B',
    tag: 'Chili spice & terracotta crust'
  },
  {
    id: 84,
    name: 'Food brand palette 2',
    category: 'Food & Cafe',
    colors: ['#354A2F', '#7A8A45', '#D9C98E', '#4A3428'],
    primary: '#354A2F',
    accent: '#D9C98E',
    excelBannerColor: 'FF354A2F',
    excelAccentColor: 'FFD9C98E',
    tag: 'Artisan bakery & olive oil'
  },
  {
    id: 85,
    name: 'Food brand palette 3',
    category: 'Food & Cafe',
    colors: ['#6B3F2A', '#C98A4B', '#EBCB9C'],
    primary: '#6B3F2A',
    accent: '#C98A4B',
    excelBannerColor: 'FF6B3F2A',
    excelAccentColor: 'FFC98A4B',
    tag: 'Roasted hazelnut & pastry'
  },
  {
    id: 86,
    name: 'Food brand palette 4',
    category: 'Food & Cafe',
    colors: ['#101820', '#E63946', '#F1FAEE', '#A8DADC'],
    primary: '#101820',
    accent: '#E63946',
    excelBannerColor: 'FF101820',
    excelAccentColor: 'FFE63946',
    tag: 'Modern bistro red & black'
  },
  {
    id: 87,
    name: 'Food brand palette 5',
    category: 'Food & Cafe',
    colors: ['#21120D', '#E8C7A2', '#FFF3E2'],
    primary: '#21120D',
    accent: '#E8C7A2',
    excelBannerColor: 'FF21120D',
    excelAccentColor: 'FFE8C7A2',
    tag: 'Dark roast & frothed latte'
  },
  {
    id: 88,
    name: 'Food brand palette 6',
    category: 'Food & Cafe',
    colors: ['#12372A', '#4D7C3F', '#F2E8CF', '#6F4E37'],
    primary: '#12372A',
    accent: '#F2E8CF',
    excelBannerColor: 'FF12372A',
    excelAccentColor: 'FFF2E8CF',
    tag: 'Farm-to-table organic kitchen'
  },
  {
    id: 89,
    name: 'Food brand palette 7',
    category: 'Food & Cafe',
    colors: ['#160B08', '#3A1F18', '#7B3F2A'],
    primary: '#160B08',
    accent: '#7B3F2A',
    excelBannerColor: 'FF160B08',
    excelAccentColor: 'FF7B3F2A',
    tag: 'Smoked timber steakhouse'
  },

  // --- Gradient & Neon (90 - 102) ---
  {
    id: 90,
    name: 'Gradient palette 1',
    category: 'Gradient & Neon',
    colors: ['#3A1C1C', '#FF6B6B', '#FFB86B', '#FFF1D6', '#FFFFFF'],
    primary: '#3A1C1C',
    accent: '#FF6B6B',
    excelBannerColor: 'FF3A1C1C',
    excelAccentColor: 'FFFF6B6B',
    tag: 'Solar flare sunset gradient'
  },
  {
    id: 91,
    name: 'Gradient palette 2',
    category: 'Gradient & Neon',
    colors: ['#053B36', '#14B8A6', '#99F6E4', '#ECFEFF', '#F8FAFC'],
    primary: '#053B36',
    accent: '#14B8A6',
    excelBannerColor: 'FF053B36',
    excelAccentColor: 'FF14B8A6',
    tag: 'Luminescent aqua wave'
  },
  {
    id: 92,
    name: 'Gradient palette 3',
    category: 'Gradient & Neon',
    colors: ['#120A2A', '#C4B5FD', '#F5F3FF'],
    primary: '#120A2A',
    accent: '#C4B5FD',
    excelBannerColor: 'FF120A2A',
    excelAccentColor: 'FFC4B5FD',
    tag: 'Deep interstellar purple'
  },
  {
    id: 93,
    name: 'Gradient palette 4',
    category: 'Gradient & Neon',
    colors: ['#1E1B4B', '#FDE68A', '#FFF7ED'],
    primary: '#1E1B4B',
    accent: '#FDE68A',
    excelBannerColor: 'FF1E1B4B',
    excelAccentColor: 'FFFDE68A',
    tag: 'Midnight indigo & golden star'
  },
  {
    id: 94,
    name: 'Gradient palette 5',
    category: 'Gradient & Neon',
    colors: ['#082F49', '#0369A1', '#38BDF8', '#BAE6FD'],
    primary: '#082F49',
    accent: '#38BDF8',
    excelBannerColor: 'FF082F49',
    excelAccentColor: 'FF38BDF8',
    tag: 'Atmospheric blue gradient'
  },
  {
    id: 95,
    name: 'Gradient palette 6',
    category: 'Gradient & Neon',
    colors: ['#111827', '#84CC16', '#D9F99D', '#F7FEE7', '#FFFFFF'],
    primary: '#111827',
    accent: '#84CC16',
    excelBannerColor: 'FF111827',
    excelAccentColor: 'FF84CC16',
    tag: 'High-contrast lime neon'
  },
  {
    id: 96,
    name: 'Gradient palette 7',
    category: 'Gradient & Neon',
    colors: ['#F9A8D4', '#FCE7F3', '#FFF7FB'],
    primary: '#374151',
    accent: '#F9A8D4',
    excelBannerColor: 'FF374151',
    excelAccentColor: 'FFF9A8D4',
    tag: 'Soft pink dream gradient'
  },
  {
    id: 97,
    name: 'Gradient palette 8',
    category: 'Gradient & Neon',
    colors: ['#0F172A', '#3B82F6', '#A78BFA', '#F8FAFC'],
    primary: '#0F172A',
    accent: '#3B82F6',
    excelBannerColor: 'FF0F172A',
    excelAccentColor: 'FF3B82F6',
    tag: 'Cyberpunk neon dusk'
  },
  {
    id: 98,
    name: 'Neon palette 1',
    category: 'Gradient & Neon',
    colors: ['#120018', '#FFE6F6', '#2A1033'],
    primary: '#120018',
    accent: '#FFE6F6',
    excelBannerColor: 'FF120018',
    excelAccentColor: 'FFFFE6F6',
    tag: 'Nocturnal magenta neon'
  },
  {
    id: 99,
    name: 'Neon palette 2',
    category: 'Gradient & Neon',
    colors: ['#050B1A', '#00D9FF', '#DDF7FF', '#1D2B53'],
    primary: '#050B1A',
    accent: '#00D9FF',
    excelBannerColor: 'FF050B1A',
    excelAccentColor: 'FF00D9FF',
    tag: 'Laser cyan neon'
  },
  {
    id: 100,
    name: 'Neon palette 3',
    category: 'Gradient & Neon',
    colors: ['#111111', '#FF6A00', '#FFFFFF', '#5A5A5A'],
    primary: '#111111',
    accent: '#FF6A00',
    excelBannerColor: 'FF111111',
    excelAccentColor: 'FFFF6A00',
    tag: 'Amber tungsten neon tube'
  },
  {
    id: 101,
    name: 'Neon palette 4',
    category: 'Gradient & Neon',
    colors: ['#080017', '#FF4FD8', '#F2E8FF', '#24113F'],
    primary: '#080017',
    accent: '#FF4FD8',
    excelBannerColor: 'FF080017',
    excelAccentColor: 'FFFF4FD8',
    tag: 'Electric violet pop'
  },
  {
    id: 102,
    name: 'Neon palette 5',
    category: 'Gradient & Neon',
    colors: ['#06130F', '#8CFFDA', '#E8FFF7', '#34524A'],
    primary: '#06130F',
    accent: '#8CFFDA',
    excelBannerColor: 'FF06130F',
    excelAccentColor: 'FF8CFFDA',
    tag: 'Phosphorescent mint neon'
  },

  // --- Retro & Vintage (103 - 110) ---
  {
    id: 103,
    name: 'Retro palette 1',
    category: 'Retro & Vintage',
    colors: ['#4A2C1D', '#A0522D', '#F2C078', '#F7E7C6'],
    primary: '#4A2C1D',
    accent: '#F2C078',
    excelBannerColor: 'FF4A2C1D',
    excelAccentColor: 'FFF2C078',
    tag: 'Sienna timber & amber glass'
  },
  {
    id: 104,
    name: 'Retro palette 2',
    category: 'Retro & Vintage',
    colors: ['#7A1212', '#062828', '#F2E2C4', '#1D1D1B', '#8B6F47'],
    primary: '#062828',
    accent: '#7A1212',
    excelBannerColor: 'FF062828',
    excelAccentColor: 'FF7A1212',
    tag: 'Vintage speakeasy interior'
  },
  {
    id: 105,
    name: 'Retro palette 3',
    category: 'Retro & Vintage',
    colors: ['#101820', '#2E4057', '#8FD694', '#D6FFF6'],
    primary: '#101820',
    accent: '#8FD694',
    excelBannerColor: 'FF101820',
    excelAccentColor: 'FF8FD694',
    tag: 'Mid-century industrial teal'
  },
  {
    id: 106,
    name: 'Retro palette 4',
    category: 'Retro & Vintage',
    colors: ['#FF4FA3', '#7A5CFF', '#3BD6FF', '#FFF275', '#111111'],
    primary: '#111111',
    accent: '#7A5CFF',
    excelBannerColor: 'FF111111',
    excelAccentColor: 'FF7A5CFF',
    tag: '80s arcade vaporwave'
  },
  {
    id: 107,
    name: 'Retro palette 5',
    category: 'Retro & Vintage',
    colors: ['#222222', '#F6AE2D', '#86BBD8', '#F5F1E6'],
    primary: '#222222',
    accent: '#F6AE2D',
    excelBannerColor: 'FF222222',
    excelAccentColor: 'FFF6AE2D',
    tag: 'Bauhaus yellow & slate'
  },
  {
    id: 108,
    name: 'Retro palette 6',
    category: 'Retro & Vintage',
    colors: ['#E9A66A', '#F4D6B5', '#5D7A8A', '#2E2A24'],
    primary: '#2E2A24',
    accent: '#E9A66A',
    excelBannerColor: 'FF2E2A24',
    excelAccentColor: 'FFE9A66A',
    tag: 'Terrazzo & faded denim'
  },
  {
    id: 109,
    name: 'Retro palette 7',
    category: 'Retro & Vintage',
    colors: ['#2B3A24', '#6B8E23', '#C2B280', '#3A2F2F'],
    primary: '#2B3A24',
    accent: '#C2B280',
    excelBannerColor: 'FF2B3A24',
    excelAccentColor: 'FFC2B280',
    tag: 'Military olive & brass'
  },
  {
    id: 110,
    name: 'Retro palette 8',
    category: 'Retro & Vintage',
    colors: ['#7209B7', '#3A0CA3', '#F8F9FA'],
    primary: '#3A0CA3',
    accent: '#7209B7',
    excelBannerColor: 'FF3A0CA3',
    excelAccentColor: 'FF7209B7',
    tag: 'Classic vinyl disco violet'
  },

  // --- Seasonal & Nature (111 - 121) ---
  {
    id: 111,
    name: 'Spring palette 1',
    category: 'Seasonal & Nature',
    colors: ['#EF476F', '#FFF6EA', '#344E41'],
    primary: '#344E41',
    accent: '#EF476F',
    excelBannerColor: 'FF344E41',
    excelAccentColor: 'FFEF476F',
    tag: 'Forest evergreen & spring blossom'
  },
  {
    id: 112,
    name: 'Spring palette 2',
    category: 'Seasonal & Nature',
    colors: ['#DDF8E8', '#F8FFF9', '#8A9A8F'],
    primary: '#8A9A8F',
    accent: '#DDF8E8',
    excelBannerColor: 'FF8A9A8F',
    excelAccentColor: 'FFDDF8E8',
    tag: 'Morning dew on fresh leaves'
  },
  {
    id: 113,
    name: 'Spring palette 3',
    category: 'Seasonal & Nature',
    colors: ['#CFE8FF', '#F8FBFF', '#8190A5'],
    primary: '#8190A5',
    accent: '#CFE8FF',
    excelBannerColor: 'FF8190A5',
    excelAccentColor: 'FFCFE8FF',
    tag: 'April rain & clear skies'
  },
  {
    id: 114,
    name: 'Winter palette 1',
    category: 'Seasonal & Nature',
    colors: ['#071629', '#17345C', '#9DB7D5', '#EAF4FF', '#FFFFFF'],
    primary: '#071629',
    accent: '#9DB7D5',
    excelBannerColor: 'FF071629',
    excelAccentColor: 'FF9DB7D5',
    tag: 'Nordic frost & polar night'
  },
  {
    id: 115,
    name: 'Winter palette 2',
    category: 'Seasonal & Nature',
    colors: ['#12372A', '#2F6B4F', '#BFD8C2', '#F3FAF4', '#3A2B22'],
    primary: '#12372A',
    accent: '#BFD8C2',
    excelBannerColor: 'FF12372A',
    excelAccentColor: 'FFBFD8C2',
    tag: 'Pine boughs & winter snow'
  },
  {
    id: 116,
    name: 'Winter palette 3',
    category: 'Seasonal & Nature',
    colors: ['#2B2540', '#CFC8F8', '#F1EEFF', '#FFFFFF'],
    primary: '#2B2540',
    accent: '#CFC8F8',
    excelBannerColor: 'FF2B2540',
    excelAccentColor: 'FFCFC8F8',
    tag: 'Frosted lilac dusk'
  },
  {
    id: 117,
    name: 'Winter palette 4',
    category: 'Seasonal & Nature',
    colors: ['#1F2933', '#6B7280', '#D1D5DB', '#F7F7F2'],
    primary: '#1F2933',
    accent: '#6B7280',
    excelBannerColor: 'FF1F2933',
    excelAccentColor: 'FF6B7280',
    tag: 'Granite stone under snow'
  },
  {
    id: 118,
    name: 'Winter palette 5',
    category: 'Seasonal & Nature',
    colors: ['#7F1D1D', '#BE3A3A', '#F4D6D6', '#FFF8F2', '#2A1C1C'],
    primary: '#2A1C1C',
    accent: '#BE3A3A',
    excelBannerColor: 'FF2A1C1C',
    excelAccentColor: 'FFBE3A3A',
    tag: 'Holiday holly & warm fireplace'
  },
  {
    id: 119,
    name: 'Earthy palette 1',
    category: 'Seasonal & Nature',
    colors: ['#3A2A22', '#B86F52', '#D9BFA3', '#F3E7D8', '#8C8A68'],
    primary: '#3A2A22',
    accent: '#B86F52',
    excelBannerColor: 'FF3A2A22',
    excelAccentColor: 'FFB86F52',
    tag: 'Rich soil, moss and clay'
  },
  {
    id: 120,
    name: 'Soft beauty palette 1',
    category: 'Seasonal & Nature',
    colors: ['#F8D7DA', '#FBECEF', '#C98C96', '#3A2A2C'],
    primary: '#3A2A2C',
    accent: '#C98C96',
    excelBannerColor: 'FF3A2A2C',
    excelAccentColor: 'FFC98C96',
    tag: 'Cashmere rose & charcoal'
  },
  {
    id: 121,
    name: 'Warm cafe palette 1',
    category: 'Seasonal & Nature',
    colors: ['#2D211B', '#E7D7C2', '#B9784D'],
    primary: '#2D211B',
    accent: '#B9784D',
    excelBannerColor: 'FF2D211B',
    excelAccentColor: 'FFB9784D',
    tag: 'Artisan roast coffee & steamed milk'
  }
];
