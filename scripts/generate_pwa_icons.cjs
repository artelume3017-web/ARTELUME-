const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function createPng(width, height, drawFn) {
  // 8-bit RGBA
  const rowStride = 1 + width * 4; // 1 filter byte + 4 bytes per pixel
  const rawData = Buffer.alloc(rowStride * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: 6 = RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Ensure public directory exists
const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate SVG Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c0f08"/>
      <stop offset="50%" stop-color="#3d1d0e"/>
      <stop offset="100%" stop-color="#7b3f22"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff1c5"/>
      <stop offset="35%" stop-color="#df9c20"/>
      <stop offset="70%" stop-color="#f2b43b"/>
      <stop offset="100%" stop-color="#b67a14"/>
    </linearGradient>
    <radialGradient id="haloGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#df9c20" stop-opacity="0.35"/>
      <stop offset="70%" stop-color="#df9c20" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#df9c20" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background rounded rect -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect width="504" height="504" x="4" y="4" rx="108" fill="none" stroke="#df9c20" stroke-width="2.5" stroke-opacity="0.35"/>

  <!-- Subtle ambient luminaire glow ring -->
  <circle cx="256" cy="226" r="160" fill="url(#haloGrad)" />
  <circle cx="256" cy="226" r="128" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.25" stroke-dasharray="4 6"/>

  <!-- Architectural Beam Icon / Luminaire Symbol -->
  <g transform="translate(0, -10)">
    <!-- Architectural Diamond / Light Aperture -->
    <path d="M 256 90 L 320 180 L 256 220 L 192 180 Z" fill="url(#goldGrad)" opacity="0.9" />
    <!-- Light Ray Cones -->
    <path d="M 256 220 L 370 340 L 142 340 Z" fill="url(#goldGrad)" opacity="0.22" />
    
    <!-- Bold AL Monogram in Center -->
    <text x="256" y="275" font-family="'Cinzel', 'Times New Roman', serif" font-size="108" font-weight="800" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="4" filter="url(#glow)">AL</text>
  </g>

  <!-- Brand Label -->
  <text x="256" y="405" font-family="'Cinzel', 'Times New Roman', serif" font-size="34" font-weight="700" fill="#fdfbf7" text-anchor="middle" letter-spacing="9">ARTÈ LUME</text>
  <text x="256" y="438" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="600" fill="#df9c20" text-anchor="middle" letter-spacing="4">LIGHTING STUDIO</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
console.log('✓ Wrote public/icon.svg');

// Draw procedural Artè Lume luxury branding for crisp PNGs
function drawBrandIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxR = Math.min(w, h) / 2;

  // Background color gradient (Dark terracotta / espresso: #1e1009 to #7b3f22)
  const normY = y / h;
  const normX = x / w;
  const t = (normX + normY) * 0.5;
  let bgR = Math.round(28 + t * (123 - 28));
  let bgG = Math.round(15 + t * (63 - 15));
  let bgB = Math.round(9 + t * (34 - 9));

  // Corner radius rounding if not maskable (maskable must be full-bleed)
  let alpha = 255;
  if (!isMaskable) {
    const cornerR = w * 0.22;
    const clampedX = Math.max(cornerR, Math.min(w - cornerR, x));
    const clampedY = Math.max(cornerR, Math.min(h - cornerR, y));
    const cdist = Math.hypot(x - clampedX, y - clampedY);
    if (cdist > cornerR) {
      const edge = cdist - cornerR;
      if (edge >= 1.5) return [0, 0, 0, 0];
      alpha = Math.round(255 * (1.5 - edge) / 1.5);
    }
  }

  // Gold luminaire rings / halo in center
  const scale = w / 512;
  const ringRadius = 140 * scale;
  const ringDist = Math.abs(dist - ringRadius);
  let goldIntensity = 0;

  // Ambient center glow
  if (dist < 180 * scale) {
    goldIntensity += (1 - dist / (180 * scale)) * 0.35;
  }

  // Thin gold concentric circle
  if (ringDist < 2.5 * scale) {
    goldIntensity += (1 - ringDist / (2.5 * scale)) * 0.8;
  }

  // Central architectural diamond / fixture aperture
  const diamondDy = (y - (cy - 30 * scale));
  const diamondDx = Math.abs(dx);
  if (diamondDy > -80 * scale && diamondDy < 70 * scale) {
    const halfWidth = (diamondDy < 0) ? (diamondDy + 80 * scale) * 0.8 : (70 * scale - diamondDy) * 0.9;
    if (diamondDx < halfWidth) {
      goldIntensity += 0.85;
    }
  }

  // Downward lighting cone
  if (y > cy - 10 * scale && y < cy + 120 * scale) {
    const coneProgress = (y - (cy - 10 * scale)) / (130 * scale);
    const coneWidth = (30 * scale) + coneProgress * (130 * scale);
    if (Math.abs(dx) < coneWidth) {
      goldIntensity += (1 - Math.abs(dx) / coneWidth) * 0.3;
    }
  }

  // Gold color: #df9c20 (223, 156, 32)
  const finalR = Math.min(255, Math.round(bgR * (1 - goldIntensity) + 242 * goldIntensity));
  const finalG = Math.min(255, Math.round(bgG * (1 - goldIntensity) + 180 * goldIntensity));
  const finalB = Math.min(255, Math.round(bgB * (1 - goldIntensity) + 50 * goldIntensity));

  return [finalR, finalG, finalB, alpha];
}

// Generate files:
// 1. pwa-192x192.png
const pwa192 = createPng(192, 192, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
console.log('✓ Wrote public/pwa-192x192.png');

// 2. pwa-512x512.png
const pwa512 = createPng(512, 512, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
console.log('✓ Wrote public/pwa-512x512.png');

// 3. pwa-maskable-512x512.png (full-bleed for Android adaptive crop)
const pwaMaskable = createPng(512, 512, (x, y, w, h) => drawBrandIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);
console.log('✓ Wrote public/pwa-maskable-512x512.png');

// 4. apple-touch-icon.png (180x180 for iOS Safari home screen)
const appleIcon = createPng(180, 180, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
console.log('✓ Wrote public/apple-touch-icon.png');

// 5. favicon.ico / favicon (64x64 PNG format works universally as modern favicon)
const favIcon = createPng(64, 64, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favIcon);
console.log('✓ Wrote public/favicon.ico');
