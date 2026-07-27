// Measures the left leaf's true profile: projects its ink onto the midrib axis
// and reports the perpendicular half-width at each step. Used to fit the SVG
// curves. Not part of the site.
const fs = require('fs');
const zlib = require('zlib');

function decode(path) {
  const buf = fs.readFileSync(path);
  let pos = 8, w = 0, h = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp, out = Buffer.alloc(h * stride);
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
      if (f === 1) v += a; else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, px: out };
}

const { w, px } = decode('img/logo-mark-slate.png');
const ink = (x, y) => px[(y * w + x) * 4 + 3] > 128;

// Axis of the left leaf, read off the midrib stroke.
const T = [361, 470], B = [460, 558];
const ax = B[0] - T[0], ay = B[1] - T[1];
const L = Math.hypot(ax, ay);
const ux = ax / L, uy = ay / L;      // along axis
const nx = -uy, ny = ux;             // perpendicular (points down-left)

// Collect leaf ink only: bounded box, excluding the stem column and anything
// right of the axis end.
const pts = [];
for (let y = 452; y <= 575; y++) {
  for (let x = 335; x <= 470; x++) {
    if (!ink(x, y)) continue;
    if (Math.abs(x - 464.5) < 11 && y > 545) continue;   // stem
    if (y < 470 && Math.abs(x - 464.5) < 45) continue;    // top leaf base
    const dx = x - T[0], dy = y - T[1];
    const t = (dx * ux + dy * uy) / L;
    const p = dx * nx + dy * ny;
    if (t < -0.06 || t > 1.06) continue;
    pts.push([t, p]);
  }
}

console.log(`axis length ${L.toFixed(1)}  ink pts ${pts.length}`);
console.log('  t     lower-left   upper-right');
for (let i = 0; i <= 20; i++) {
  const t0 = i / 20 - 0.025, t1 = i / 20 + 0.025;
  const band = pts.filter(p => p[0] >= t0 && p[0] < t1);
  if (!band.length) { console.log(`${(i / 20).toFixed(2)}    —`); continue; }
  const lo = Math.max(...band.map(p => p[1]));
  const hi = Math.min(...band.map(p => p[1]));
  console.log(`${(i / 20).toFixed(2)}   ${lo.toFixed(1).padStart(6)}      ${(-hi).toFixed(1).padStart(6)}`);
}
