// Compares the SVG redraw against the supplied PNG and writes a visual diff.
// Radish = in the PNG only (redraw missed it). Green = in the redraw only
// (redraw added it). Slate = both agree. Not part of the site.
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
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8 || (ctype !== 6 && ctype !== 2)) throw new Error(`${path}: depth=${depth} ctype=${ctype}`);
  const bpp = ctype === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
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
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, px: out, bpp };
}

function encode(w, h, rgb) {
  const stride = w * 3;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const chunks = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
  const crcTable = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const v of b) c = crcTable[(c ^ v) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const cc = Buffer.alloc(4); cc.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, cc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  chunks.push(chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

const A = decode(process.argv[2]);  // original, RGBA on transparent
const B = decode(process.argv[3]);  // render, RGB on white
if (A.w !== B.w || A.h !== B.h) throw new Error(`size mismatch ${A.w}x${A.h} vs ${B.w}x${B.h}`);

const inkA = (i) => A.px[i * A.bpp + 3] > 128;
const inkB = (i) => {
  const o = i * B.bpp;
  return (0.2126 * B.px[o] + 0.7152 * B.px[o + 1] + 0.0722 * B.px[o + 2]) < 190;
};

const w = A.w, h = A.h;
const outPx = Buffer.alloc(w * h * 3, 255);
let onlyA = 0, onlyB = 0, both = 0;
for (let i = 0; i < w * h; i++) {
  const a = inkA(i), b = inkB(i), o = i * 3;
  if (a && b) { both++; outPx[o] = 0x32; outPx[o + 1] = 0x43; outPx[o + 2] = 0x53; }
  else if (a) { onlyA++; outPx[o] = 0xB0; outPx[o + 1] = 0x4A; outPx[o + 2] = 0x63; }
  else if (b) { onlyB++; outPx[o] = 0x2E; outPx[o + 1] = 0x8B; outPx[o + 2] = 0x57; }
}
fs.writeFileSync(process.argv[4], encode(w, h, outPx));

const totalA = onlyA + both, totalB = onlyB + both;
const pct = (n, d) => d ? (100 * n / d).toFixed(1) + '%' : '—';
console.log(`original ink px : ${totalA}`);
console.log(`redraw   ink px : ${totalB}   (${pct(totalB, totalA)} of original)`);
console.log(`overlap         : ${both}   (${pct(both, totalA)} of original covered)`);
console.log(`missed  (radish): ${onlyA}   (${pct(onlyA, totalA)})`);
console.log(`added   (green) : ${onlyB}   (${pct(onlyB, totalA)})`);
