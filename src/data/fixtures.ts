import { LightingProduct } from '../types';

export const CURATED_FIXTURES: LightingProduct[] = [
  {
    id: 'AL-PEND-8801',
    sku: 'AL-PEND-8801',
    category: 'Pendant Lights',
    name: 'Artè Sculpt Brass Pendant Light',
    watt: '18W',
    cct: '3000K Warm White',
    beam: 'Diffused 120°',
    cri: 'CRI 95+',
    ip: 'IP20',
    finish: 'Brushed Brass',
    dimming: 'Phase/Triac',
    cutout: 'Suspended 2m',
    dimensions: 'Ø180×H220mm',
    chip: 'Bridgelux COB',
    driver: 'Tridonic Dimmable',
    price: 14500,
    cost: 7200,
    stock: 15,
    popular: true,
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="80" y1="0" x2="80" y2="48" stroke="#df9c20" stroke-width="2"/>
      <path d="M48 48 C48 30 112 30 112 48 Z" fill="#b97c1d"/>
      <path d="M54 48 L106 48 L96 78 L64 78 Z" fill="#df9c20"/>
      <ellipse cx="80" cy="78" rx="16" ry="7" fill="#fff5d6"/>
      <polygon points="64,78 40,118 120,118 96,78" fill="url(#pBeam)" opacity="0.4"/>
      <defs>
        <linearGradient id="pBeam" x1="80" y1="78" x2="80" y2="120" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ffeaa7" stop-opacity="0.8"/>
          <stop offset="1" stop-color="#ffeaa7" stop-opacity="0"/>
        </linearGradient>
      </defs>
    </svg>`
  },
  {
    id: 'AL-ARCH-204',
    sku: 'AL-ARCH-204',
    category: 'Magnetic Track',
    name: 'Architectural Linear Track Module 24W',
    watt: '24W',
    cct: '4000K Neutral White',
    beam: '48° Anti-glare Louver',
    cri: 'CRI 90+',
    ip: 'IP20',
    finish: 'Matte Black',
    dimming: 'DALI-2',
    cutout: 'Magnetic Track 48V',
    dimensions: 'L600×W34×H45mm',
    chip: 'Osram Oslon',
    driver: '48V DC Low Voltage',
    price: 8200,
    cost: 4100,
    stock: 28,
    popular: true,
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="32" width="120" height="12" rx="2" fill="#2d3436"/>
      <rect x="35" y="44" width="90" height="24" rx="3" fill="#1e272e" stroke="#df9c20" stroke-width="1.5"/>
      <circle cx="48" cy="56" r="4" fill="#df9c20"/>
      <circle cx="64" cy="56" r="4" fill="#df9c20"/>
      <circle cx="80" cy="56" r="4" fill="#df9c20"/>
      <circle cx="96" cy="56" r="4" fill="#df9c20"/>
      <circle cx="112" cy="56" r="4" fill="#df9c20"/>
      <polygon points="35,68 15,115 145,115 125,68" fill="url(#tBeam)" opacity="0.3"/>
      <defs>
        <linearGradient id="tBeam" x1="80" y1="68" x2="80" y2="120" gradientUnits="userSpaceOnUse">
          <stop stop-color="#fff" stop-opacity="0.7"/>
          <stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>
    </svg>`
  },
  {
    id: 'AL-DOWN-410',
    sku: 'AL-DOWN-410',
    category: 'Downlights',
    name: 'Lume Ellipse Recessed Trimless Downlight 12W',
    watt: '12W',
    cct: '3000K Warm White',
    beam: '24° Spot Optic',
    cri: 'CRI 97+ Ultra',
    ip: 'IP44 Splashproof',
    finish: 'Sandy White',
    dimming: 'Phase/Triac',
    cutout: 'Ø75mm Plaster-in',
    dimensions: 'Ø85×H90mm',
    chip: 'Citizen CLU028',
    driver: 'Lafit Glare-Free',
    price: 4650,
    cost: 2150,
    stock: 45,
    popular: true,
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="20" y1="36" x2="140" y2="36" stroke="#555" stroke-width="3" stroke-dasharray="4 4"/>
      <path d="M60 36 L100 36 L88 56 L72 56 Z" fill="#2d3436"/>
      <ellipse cx="80" cy="56" rx="8" ry="4" fill="#ffeaa7"/>
      <polygon points="72,56 45,118 115,118 88,56" fill="url(#dBeam)" opacity="0.45"/>
      <defs>
        <linearGradient id="dBeam" x1="80" y1="56" x2="80" y2="120" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ffeaa7" stop-opacity="0.9"/>
          <stop offset="1" stop-color="#ffeaa7" stop-opacity="0"/>
        </linearGradient>
      </defs>
    </svg>`
  },
  {
    id: 'AL-WALL-109',
    sku: 'AL-WALL-109',
    category: 'Wall Sconces',
    name: 'Aura Minimalist Linear Wall Sconce 16W',
    watt: '16W',
    cct: '2700K Architectural Warm',
    beam: 'Bi-directional Grazing',
    cri: 'CRI 90+',
    ip: 'IP54 Outdoor Rated',
    finish: 'Antique Bronze',
    dimming: 'Touch Micro-dim / Non-Dim',
    cutout: 'Surface Mount Wall',
    dimensions: 'W60×H300×D45mm',
    chip: 'Cree SMD2835',
    driver: 'Integrated Waterproof',
    price: 9800,
    cost: 4800,
    stock: 20,
    popular: true,
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="80" y1="20" x2="80" y2="100" stroke="#df9c20" stroke-width="4" stroke-linecap="round"/>
      <circle cx="80" cy="60" r="14" fill="#5b2813" stroke="#df9c20" stroke-width="2"/>
      <circle cx="80" cy="60" r="5" fill="#fff5d6"/>
    </svg>`
  },
  {
    id: 'AL-CHAND-902',
    sku: 'AL-CHAND-902',
    category: 'Chandeliers',
    name: 'Vortex Spherical Brass Chandelier 48W',
    watt: '48W',
    cct: 'Dim-to-Warm (1800-3000K)',
    beam: '360° Omnidirectional',
    cri: 'CRI 95+',
    ip: 'IP20',
    finish: 'Satin Brass',
    dimming: 'DALI-2 / CASAMBI',
    cutout: 'Ceiling Canopy Ø160mm',
    dimensions: 'Ø900×H650mm',
    chip: 'Custom LED Array',
    driver: 'Mean Well Constant Current',
    price: 38500,
    cost: 18000,
    stock: 6,
    popular: true,
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="80" y1="0" x2="80" y2="35" stroke="#df9c20" stroke-width="2"/>
      <ellipse cx="80" cy="60" rx="36" ry="20" stroke="#df9c20" stroke-width="2.5" fill="none"/>
      <ellipse cx="80" cy="60" rx="22" ry="12" stroke="#b97c1d" stroke-width="2" fill="none"/>
      <circle cx="80" cy="60" r="7" fill="#fff9db"/>
    </svg>`
  },
  {
    id: 'AL-SPOT-305',
    sku: 'AL-SPOT-305',
    category: 'Spotlights',
    name: 'Apex Deep Regressed Track Spot 15W',
    watt: '15W',
    cct: '3000K Warm White',
    beam: '15° Narrow Accent',
    cri: 'CRI 95+',
    ip: 'IP20',
    finish: 'Gunmetal Gray',
    dimming: 'Non-Dim',
    cutout: 'Standard 3-Circuit Track',
    dimensions: 'Ø55×H110mm',
    chip: 'Citizen COB',
    driver: 'Philips Xitanium',
    price: 6400,
    cost: 2900,
    stock: 32,
    popular: true,
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="68" y="22" width="24" height="6" fill="#2d3436"/>
      <rect x="70" y="50" width="20" height="28" rx="2" fill="#2d3436" stroke="#999" stroke-width="1"/>
      <ellipse cx="80" cy="78" rx="10" ry="4" fill="#ffeaa7"/>
    </svg>`
  },
  {
    id: 'AL-DOWN-512',
    sku: 'AL-DOWN-512',
    category: 'Downlights',
    name: 'Titan Regressed Deep Dark-Light COB 15W',
    watt: '15W',
    cct: '3000K Warm White',
    beam: '36° Medium (UGR<10)',
    cri: 'CRI 95+',
    ip: 'IP44 Splash Guard',
    finish: 'Matte Black',
    dimming: 'Phase/Triac',
    cutout: 'Ø80mm Cut-out',
    dimensions: 'Ø90×H95mm',
    chip: 'Bridgelux V10',
    driver: 'Lafit Dark-Light Driver',
    price: 5200,
    cost: 2300,
    stock: 40,
    popular: true,
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="20" y1="34" x2="140" y2="34" stroke="#444" stroke-width="3"/>
      <path d="M50 34 L110 34 L92 60 L68 60 Z" fill="#111" stroke="#333" stroke-width="1.5"/>
      <circle cx="80" cy="60" r="8" fill="#ffd32a"/>
    </svg>`
  },
  {
    id: 'AL-DOWN-206',
    sku: 'AL-DOWN-206',
    category: 'Downlights',
    name: 'Micro Pin-Hole Architectural Accent 7W',
    watt: '7W',
    cct: '2700K Warm White',
    beam: '15° Pin-Hole Focused',
    cri: 'CRI 92+',
    ip: 'IP20',
    finish: 'Antique Bronze',
    dimming: 'Phase/Triac',
    cutout: 'Ø35mm Miniature',
    dimensions: 'Ø45×H60mm',
    chip: 'Cree XP-E2',
    driver: 'Remote Compact Constant Current',
    price: 3800,
    cost: 1600,
    stock: 55,
    popular: false,
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="30" y1="36" x2="130" y2="36" stroke="#666" stroke-width="3"/>
      <path d="M68 36 L92 36 L86 52 L74 52 Z" fill="#2d3436"/>
      <circle cx="80" cy="52" r="3.5" fill="#fff5d6"/>
    </svg>`
  },
  {
    id: 'AL-LIN-612',
    sku: 'AL-LIN-612',
    category: 'Linear Architectural',
    name: 'Vektor Slim Continuous Profile 36W/m',
    watt: '36W/m',
    cct: '4000K Natural White',
    beam: 'Direct/Indirect 70°/110°',
    cri: 'CRI 90+',
    ip: 'IP20',
    finish: 'Anodized Black',
    dimming: '0-10V / DALI',
    cutout: 'Suspended Cable / Surface',
    dimensions: 'W35×H65mm (Custom Lengths)',
    chip: 'Samsung LM281B+',
    driver: 'Tridonic Linear',
    price: 11200,
    cost: 5400,
    stock: 22,
    popular: false,
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="35" y1="20" x2="35" y2="54" stroke="#888" stroke-width="1.5"/>
      <line x1="125" y1="20" x2="125" y2="54" stroke="#888" stroke-width="1.5"/>
      <rect x="25" y="54" width="110" height="14" rx="2" fill="#1e272e" stroke="#444" stroke-width="1"/>
    </svg>`
  },
  {
    id: 'AL-TRACK-308',
    sku: 'AL-TRACK-308',
    category: 'Magnetic Track',
    name: 'Orbit Adjustable Magnetic Ball Spotlight 10W',
    watt: '10W',
    cct: '3000K Warm White',
    beam: '24° Rotatable Ball',
    cri: 'CRI 95+',
    ip: 'IP20',
    finish: 'Matte Black',
    dimming: 'CASAMBI / 48V PWM',
    cutout: 'Magnetic Track 48V Snap',
    dimensions: 'Ø45mm Ball Eyeball',
    chip: 'Bridgelux V8',
    driver: 'Internal 48V DC Module',
    price: 6900,
    cost: 3100,
    stock: 35,
    popular: true,
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="24" width="110" height="12" rx="2" fill="#2d3436"/>
      <circle cx="80" cy="62" r="18" fill="#1e272e" stroke="#df9c20" stroke-width="2"/>
    </svg>`
  },
  {
    id: 'AL-WALL-215',
    sku: 'AL-WALL-215',
    category: 'Wall Sconces',
    name: 'Eclipse Brushed Brass Halo Wall Light 12W',
    watt: '12W',
    cct: '2700K Warm White',
    beam: '360° Perimeter Halo',
    cri: 'CRI 95+',
    ip: 'IP20',
    finish: 'Hand Spun Brass',
    dimming: 'Phase/Triac',
    cutout: 'Surface Wall Bracket',
    dimensions: 'Ø250×D40mm',
    chip: 'Osram Duris',
    driver: 'Integrated Ultra-Slim',
    price: 11800,
    cost: 5600,
    stock: 14,
    popular: true,
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="60" r="38" fill="none" stroke="#ffeaa7" stroke-width="12" opacity="0.45"/>
      <circle cx="80" cy="60" r="34" fill="#5b2813" stroke="#df9c20" stroke-width="3"/>
    </svg>`
  },
  {
    id: 'AL-OUT-101',
    sku: 'AL-OUT-101',
    category: 'Spotlights',
    name: 'Terra In-Ground Drive-Over Uplight 18W',
    watt: '18W',
    cct: '3000K Warm White',
    beam: '20° Tiltable ±15°',
    cri: 'CRI 85+',
    ip: 'IP68 Submersible / Drive-Over',
    finish: '316 Stainless Steel',
    dimming: 'Non-Dim',
    cutout: 'Ground Sleeve Ø140mm',
    dimensions: 'Ø160×H180mm',
    chip: 'Cree COB CXA1512',
    driver: 'Encapsulated IP67 Driver',
    price: 13500,
    cost: 6500,
    stock: 18,
    popular: false,
    svg: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="20" y1="80" x2="140" y2="80" stroke="#777" stroke-width="4"/>
      <rect x="55" y="80" width="50" height="30" fill="#2d3436" stroke="#999" stroke-width="2"/>
    </svg>`
  },
  // LF+ Auro Series
  {
    id: 'LFSL1211R-7W',
    sku: 'LFSL1211R',
    category: 'COB Lights',
    name: 'Auro Bottom Opening Luminaire 7W',
    watt: '7W',
    cct: '3000K/4000K/6500K/Tunable',
    beam: '36° / 60° Reflector',
    cri: 'CRI >90',
    ip: 'IP20',
    finish: 'White/Titanium Reflector',
    dimming: 'Lafit Driver Non-Dim',
    cutout: 'Ø40mm Recessed',
    dimensions: 'Ø44.5×96mm',
    chip: 'Bridgelux Chip',
    driver: 'Lafit Isolated Constant Current',
    price: 1485,
    cost: 720,
    stock: 24,
    popular: true
  },
  {
    id: 'LFSL1211R-12W',
    sku: 'LFSL1211R',
    category: 'COB Lights',
    name: 'Auro Bottom Opening Luminaire 12W',
    watt: '12W',
    cct: '3000K/4000K/6500K/Tunable',
    beam: '36° / 60° Reflector',
    cri: 'CRI >90',
    ip: 'IP20',
    finish: 'White/Black Housing',
    dimming: 'Lafit Driver Non-Dim',
    cutout: 'Ø55mm Recessed',
    dimensions: 'Ø60×101mm',
    chip: 'Bridgelux Chip',
    driver: 'Lafit Isolated Constant Current',
    price: 1900,
    cost: 950,
    stock: 18,
    popular: true
  },
  {
    id: 'LFSL1211R-18W',
    sku: 'LFSL1211R',
    category: 'COB Lights',
    name: 'Auro Bottom Opening Luminaire 18W',
    watt: '18W',
    cct: '3000K/4000K/6500K/Tunable',
    beam: '36° / 60° Reflector',
    cri: 'CRI >90',
    ip: 'IP20',
    finish: 'White/Black Housing',
    dimming: 'Lafit Driver Non-Dim',
    cutout: 'Ø75mm Recessed',
    dimensions: 'Ø80×108mm',
    chip: 'Bridgelux Chip',
    driver: 'Lafit Isolated Constant Current',
    price: 2245,
    cost: 1100,
    stock: 12,
    popular: true
  },
  {
    id: 'LFSL1212R-7W',
    sku: 'LFSL1212R',
    category: 'COB Lights',
    name: 'Auro Trimless Only Lamp 7W',
    watt: '7W',
    cct: '3000K/4000K/6500K',
    beam: '36° Focused',
    cri: 'CRI >90',
    ip: 'IP20',
    finish: 'Titanium Reflector',
    dimming: 'Lafit Driver',
    cutout: 'Ø32mm Trimless Frame',
    dimensions: 'Ø32×75mm',
    chip: 'Bridgelux Chip',
    driver: 'Lafit Driver',
    price: 1300,
    cost: 650,
    stock: 24,
    popular: false
  },
  {
    id: 'LFSL1212R-12W',
    sku: 'LFSL1212R',
    category: 'COB Lights',
    name: 'Auro Trimless Only Lamp 12W',
    watt: '12W',
    cct: '3000K/4000K/6500K',
    beam: '36° / 60° Reflector',
    cri: 'CRI >90',
    ip: 'IP20',
    finish: 'Titanium Reflector',
    dimming: 'Lafit Driver',
    cutout: 'Ø52mm Trimless Frame',
    dimensions: 'Ø52×94mm',
    chip: 'Bridgelux Chip',
    driver: 'Lafit Driver',
    price: 1630,
    cost: 820,
    stock: 18,
    popular: false
  },
  {
    id: 'LFSL1212R-18W',
    sku: 'LFSL1212R',
    category: 'COB Lights',
    name: 'Auro Trimless Only Lamp 18W',
    watt: '18W',
    cct: '3000K/4000K/6500K',
    beam: '36° / 60° Reflector',
    cri: 'CRI >90',
    ip: 'IP20',
    finish: 'Titanium Reflector',
    dimming: 'Lafit Driver',
    cutout: 'Ø72mm Trimless Frame',
    dimensions: 'Ø72×106mm',
    chip: 'Bridgelux Chip',
    driver: 'Lafit Driver',
    price: 1945,
    cost: 980,
    stock: 12,
    popular: false
  }
];
