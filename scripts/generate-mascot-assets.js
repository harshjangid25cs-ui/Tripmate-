const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function createPng(width, height, getPixel) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const raw = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Generate high fidelity SVGs for the 4 states of Matey
function getMascotSvg(state) {
  const isListening = state === 'listening';
  const isGuiding = state === 'guiding';
  const isSuccess = state === 'success';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
    <!-- Drop Shadow / Contact Shadow -->
    <ellipse cx="128" cy="226" rx="64" ry="14" fill="#000000" fill-opacity="0.12" />

    <!-- Listening Aqua / Cyan Outer Sound Waves -->
    ${isListening ? `
      <circle cx="38" cy="118" r="32" stroke="#22D3EE" stroke-width="4" stroke-opacity="0.6" stroke-dasharray="8 8" />
      <circle cx="38" cy="118" r="44" stroke="#06B6D4" stroke-width="3" stroke-opacity="0.4" />
      <circle cx="218" cy="118" r="32" stroke="#22D3EE" stroke-width="4" stroke-opacity="0.6" stroke-dasharray="8 8" />
      <circle cx="218" cy="118" r="44" stroke="#06B6D4" stroke-width="3" stroke-opacity="0.4" />
    ` : ''}

    <!-- Sparkle Stars for Success State -->
    ${isSuccess ? `
      <!-- Top Left Sparkle -->
      <path d="M 44 68 Q 44 80 32 80 Q 44 80 44 92 Q 44 80 56 80 Q 44 80 44 68 Z" fill="#FBBF24" />
      <!-- Top Right Big Sparkle -->
      <path d="M 218 64 Q 218 78 204 78 Q 218 78 218 92 Q 218 78 232 78 Q 218 78 218 64 Z" fill="#FBBF24" />
      <!-- Mid Right Small Sparkle -->
      <path d="M 226 130 Q 226 138 218 138 Q 226 138 226 146 Q 226 138 234 138 Q 226 138 226 130 Z" fill="#F59E0B" />
    ` : ''}

    <!-- Main Headband Arch (Cream Fluffy Fleece #F5F3ED) -->
    <path d="M 46 112 C 46 56 82 28 128 28 C 174 28 210 56 210 112" stroke="#F5F3ED" stroke-width="26" stroke-linecap="round" fill="none" />
    <path d="M 46 112 C 46 56 82 28 128 28 C 174 28 210 56 210 112" stroke="#EBE7DE" stroke-width="20" stroke-linecap="round" fill="none" />

    <!-- Plush Blue Body -->
    <g transform="${isGuiding ? 'rotate(3 128 140)' : isListening ? 'rotate(-3 128 140)' : ''}">
      <!-- Main Body Circle / Oval -->
      <circle cx="128" cy="142" r="76" fill="#1650DD" />
      <!-- Top / Front Plush Volume -->
      <circle cx="128" cy="138" r="72" fill="#2563EB" />
      <!-- Highlight Reflection -->
      <ellipse cx="128" cy="98" rx="42" ry="24" fill="#3B82F6" fill-opacity="0.5" />

      <!-- Left Plush Arm / Hand -->
      <circle cx="56" cy="180" r="18" fill="#1D4ED8" />
      <circle cx="56" cy="178" r="16" fill="#2563EB" />

      <!-- Right Plush Arm / Hand (Waving in Guiding State) -->
      ${isGuiding ? `
        <!-- Raised Waving Paw -->
        <g transform="translate(196, 142) rotate(-35)">
          <ellipse cx="0" cy="0" rx="16" ry="22" fill="#1D4ED8" />
          <ellipse cx="-2" cy="-2" rx="14" ry="19" fill="#2563EB" />
        </g>
      ` : `
        <!-- Resting Right Hand -->
        <circle cx="200" cy="180" r="18" fill="#1D4ED8" />
        <circle cx="200" cy="178" r="16" fill="#2563EB" />
      `}

      <!-- Face Expressions -->
      ${isSuccess ? `
        <!-- Happy Joyful Curved Eyes (^ ^) -->
        <path d="M 96 136 Q 106 122 116 136" stroke="#1F1F1E" stroke-width="6" stroke-linecap="round" fill="none" />
        <path d="M 140 136 Q 150 122 160 136" stroke="#1F1F1E" stroke-width="6" stroke-linecap="round" fill="none" />
        <!-- Big Joyful Smile -->
        <path d="M 116 150 Q 128 166 140 150" stroke="#1F1F1E" stroke-width="5" stroke-linecap="round" fill="#FF5E1E" />
      ` : `
        <!-- Glossy Black Bead Eyes -->
        <!-- Left Eye -->
        <circle cx="106" cy="134" r="14" fill="#1F1F1E" />
        <circle cx="111" cy="129" r="5" fill="#FFFFFF" />
        <circle cx="103" cy="138" r="2.5" fill="#FFFFFF" />

        <!-- Right Eye -->
        <circle cx="150" cy="134" r="14" fill="#1F1F1E" />
        <circle cx="155" cy="129" r="5" fill="#FFFFFF" />
        <circle cx="147" cy="138" r="2.5" fill="#FFFFFF" />

        <!-- Mouth Expression -->
        ${isGuiding ? `
          <!-- Open Cheerful Talking Smile -->
          <path d="M 120 152 Q 128 168 136 152 Z" fill="#1F1F1E" />
          <path d="M 123 158 Q 128 166 133 158 Z" fill="#FF5E1E" />
        ` : isListening ? `
          <!-- Attentive Listening Small O-Mouth -->
          <ellipse cx="128" cy="154" rx="6" ry="7" fill="#1F1F1E" />
        ` : `
          <!-- Gentle Happy Smile -->
          <path d="M 118 152 Q 128 162 138 152" stroke="#1F1F1E" stroke-width="5" stroke-linecap="round" fill="none" />
        `}
      `}

      <!-- Cheeks Warm Coral Blush -->
      <circle cx="86" cy="150" r="10" fill="#FF8A65" fill-opacity="0.6" />
      <circle cx="170" cy="150" r="10" fill="#FF8A65" fill-opacity="0.6" />
    </g>

    <!-- Bulky Fluffy Cream Earmuffs (Left & Right) -->
    <!-- Left Earmuff -->
    <g>
      <ellipse cx="44" cy="122" rx="28" ry="36" fill="#DAD5C8" />
      <ellipse cx="44" cy="120" rx="26" ry="34" fill="#EBE7DE" />
      <ellipse cx="44" cy="118" rx="22" ry="30" fill="#F5F3ED" />
      <!-- Fluffy Cloud Bumps -->
      <circle cx="28" cy="104" r="10" fill="#F5F3ED" />
      <circle cx="24" cy="120" r="11" fill="#F5F3ED" />
      <circle cx="28" cy="136" r="10" fill="#F5F3ED" />
      <circle cx="58" cy="104" r="9" fill="#F5F3ED" />
      <circle cx="62" cy="120" r="10" fill="#F5F3ED" />
      <circle cx="58" cy="136" r="9" fill="#F5F3ED" />
    </g>

    <!-- Right Earmuff -->
    <g>
      <ellipse cx="212" cy="122" rx="28" ry="36" fill="#DAD5C8" />
      <ellipse cx="212" cy="120" rx="26" ry="34" fill="#EBE7DE" />
      <ellipse cx="212" cy="118" rx="22" ry="30" fill="#F5F3ED" />
      <!-- Fluffy Cloud Bumps -->
      <circle cx="228" cy="104" r="10" fill="#F5F3ED" />
      <circle cx="232" cy="120" r="11" fill="#F5F3ED" />
      <circle cx="228" cy="136" r="10" fill="#F5F3ED" />
      <circle cx="198" cy="104" r="9" fill="#F5F3ED" />
      <circle cx="194" cy="120" r="10" fill="#F5F3ED" />
      <circle cx="198" cy="136" r="9" fill="#F5F3ED" />
    </g>

    <!-- Speech Bubble for Guiding State: "Let's go explore!" -->
    ${isGuiding ? `
      <g transform="translate(148, 32)">
        <rect x="0" y="0" width="102" height="38" rx="12" fill="#FFFFFF" stroke="#1F1F1E" stroke-width="2" />
        <polygon points="18,38 12,46 26,38" fill="#FFFFFF" />
        <line x1="12" y1="46" x2="18" y2="38" stroke="#1F1F1E" stroke-width="2" />
        <line x1="12" y1="46" x2="26" y2="38" stroke="#1F1F1E" stroke-width="2" />
        <text x="51" y="23" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#1F1F1E" text-anchor="middle">Let's go explore!</text>
      </g>
    ` : ''}
  </svg>`;
}

// Draw rasterized pixel representation for PNG fallback
function drawMascotPixel(x, y, state) {
  // Center is (128, 128)
  const dx = x - 128;
  const dy = y - 138;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background is transparent
  let r = 0, g = 0, b = 0, a = 0;

  // Headband arch: ellipse ring
  const hdx = x - 128;
  const hdy = (y - 110) * 1.35;
  const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
  if (y < 125 && hdist >= 70 && hdist <= 96) {
    return [245, 243, 237, 255]; // Cream headband
  }

  // Left Earmuff
  const edx1 = (x - 44) * 1.25;
  const edy1 = y - 120;
  if (Math.sqrt(edx1 * edx1 + edy1 * edy1) <= 34) {
    return [240, 236, 226, 255];
  }

  // Right Earmuff
  const edx2 = (x - 212) * 1.25;
  const edy2 = y - 120;
  if (Math.sqrt(edx2 * edx2 + edy2 * edy2) <= 34) {
    return [240, 236, 226, 255];
  }

  // Hands / Paws
  // Left Hand
  const lhx = x - 56;
  const lhy = y - 178;
  if (Math.sqrt(lhx * lhx + lhy * lhy) <= 18) {
    return [37, 99, 235, 255];
  }

  // Right Hand
  if (state === 'guiding') {
    const rhx = x - 200;
    const rhy = y - 146;
    if (Math.sqrt(rhx * rhx + rhy * rhy) <= 18) {
      return [37, 99, 235, 255];
    }
  } else {
    const rhx = x - 200;
    const rhy = y - 178;
    if (Math.sqrt(rhx * rhx + rhy * rhy) <= 18) {
      return [37, 99, 235, 255];
    }
  }

  // Eyes
  if (state === 'success') {
    // Curved eyes
    const eye1 = Math.abs(Math.sqrt((x - 106) * (x - 106) + (y - 138) * (y - 138)) - 10);
    if (eye1 <= 2.5 && y <= 138) return [31, 31, 30, 255];
    const eye2 = Math.abs(Math.sqrt((x - 150) * (x - 150) + (y - 138) * (y - 138)) - 10);
    if (eye2 <= 2.5 && y <= 138) return [31, 31, 30, 255];
  } else {
    // Left eye
    const elx = x - 106;
    const ely = y - 134;
    const edistL = Math.sqrt(elx * elx + ely * ely);
    if (edistL <= 13) {
      // Glint
      if (Math.sqrt((x - 110) * (x - 110) + (y - 130) * (y - 130)) <= 4) {
        return [255, 255, 255, 255];
      }
      return [31, 31, 30, 255];
    }

    // Right eye
    const erx = x - 150;
    const ery = y - 134;
    const edistR = Math.sqrt(erx * erx + ery * ery);
    if (edistR <= 13) {
      // Glint
      if (Math.sqrt((x - 154) * (x - 154) + (y - 130) * (y - 130)) <= 4) {
        return [255, 255, 255, 255];
      }
      return [31, 31, 30, 255];
    }
  }

  // Blush
  const blx = x - 86;
  const bly = y - 148;
  if (Math.sqrt(blx * blx + bly * bly) <= 10) {
    return [255, 138, 101, 160];
  }
  const brx = x - 170;
  const bry = y - 148;
  if (Math.sqrt(brx * brx + bry * bry) <= 10) {
    return [255, 138, 101, 160];
  }

  // Mouth
  if (y >= 148 && y <= 158 && x >= 118 && x <= 138) {
    const mdist = Math.abs((y - 150) - (0.05 * (x - 128) * (x - 128)));
    if (mdist <= 2) {
      return [31, 31, 30, 255];
    }
  }

  // Main Blue Body
  if (dist <= 72) {
    // Gradient-free solid blue tones
    if (y < 110 && dist <= 46) {
      return [59, 130, 246, 255]; // Soft top tone
    }
    return [37, 99, 235, 255]; // Main rich blue
  }

  return [r, g, b, a];
}

const states = ['idle', 'listening', 'guiding', 'success'];
const targetDir = path.resolve(__dirname, '../public/images');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

states.forEach((st) => {
  // Write SVG
  const svgContent = getMascotSvg(st);
  fs.writeFileSync(path.join(targetDir, `mascot-${st}.svg`), svgContent);

  // Write PNG
  const pngBuffer = createPng(256, 256, (x, y) => drawMascotPixel(x, y, st));
  fs.writeFileSync(path.join(targetDir, `mascot-${st}.png`), pngBuffer);

  console.log(`Exported mascot-${st}.svg and mascot-${st}.png`);
});
