// Minimal PNG reader (8-bit RGBA, no interlace) used only to measure the logo
// artwork so the SVG redraw matches the original geometry. Not part of the site.
const fs = require('fs');
const zlib = require('zlib');

function decode(path) {
  const buf = fs.readFileSync(path);
  let pos = 8, w = 0, h = 0, depth = 0, ctype = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; ctype = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8 || ctype !== 6) throw new Error('expected 8-bit RGBA');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let rp = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[rp++];
    const line = raw.subarray(rp, rp + stride); rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      switch (f) {
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          break;
        }
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, px: out };
}

const { w, h, px } = decode(process.argv[2]);
const ink = (x, y) => px[(y * w + x) * 4 + 3] > 128;

// Overall bounding box of the artwork.
let minX = w, maxX = -1, minY = h, maxY = -1;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink(x, y)) {
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (y < minY) minY = y; if (y > maxY) maxY = y;
}
console.log(`size ${w}x${h}  bbox x:${minX}-${maxX} y:${minY}-${maxY}`);

// Ink runs per scanline — reveals the triangle edges, stem and ground dashes.
const rows = process.argv[3] === 'all'
  ? Array.from({ length: h }, (_, i) => i)
  : String(process.argv[3] || '').split(',').filter(Boolean).map(Number);
for (const y of rows) {
  if (y < 0 || y >= h) continue;
  const runs = [];
  let s = -1;
  for (let x = 0; x <= w; x++) {
    const on = x < w && ink(x, y);
    if (on && s < 0) s = x;
    if (!on && s >= 0) { runs.push([s, x - 1]); s = -1; }
  }
  if (runs.length) console.log(`y=${y}  ` + runs.map(r => `${r[0]}-${r[1]}`).join('  '));
}
