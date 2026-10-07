// Minimal dependency-free pixel canvas + PNG encoder for the art build.
// Everything is integer, nearest-neighbour: no anti-aliasing is ever produced.
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync } from 'node:fs';

export const hex = h => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
};

export class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { if (!this.inside(x, y)) return [0, 0, 0, 0]; const i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]; }
  alpha(x, y) { return this.inside(x, y) ? this.d[(y * this.w + x) * 4 + 3] : 0; }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (!this.inside(x, y) || !c) return; const i = (y * this.w + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = c[3] ?? 255; }
  clear(x, y) { if (!this.inside(x, y)) return; this.d.fill(0, (y * this.w + x) * 4, (y * this.w + x) * 4 + 4); }
  fill(c) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.set(x, y, c); return this; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); return this; }
  /** Filled ellipse sampled at pixel centres (cx, cy may be fractional). */
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    return this;
  }
  /** Thick segment (capsule) from (x0,y0) to (x1,y1) with radius r. */
  capsule(x0, y0, x1, y1, r, c) {
    const minX = Math.floor(Math.min(x0, x1) - r - 1), maxX = Math.ceil(Math.max(x0, x1) + r + 1);
    const minY = Math.floor(Math.min(y0, y1) - r - 1), maxY = Math.ceil(Math.max(y0, y1) + r + 1);
    const vx = x1 - x0, vy = y1 - y0, len2 = vx * vx + vy * vy || 1;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const t = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / len2));
      const dx = px - (x0 + t * vx), dy = py - (y0 + t * vy);
      if (dx * dx + dy * dy <= r * r) this.set(x, y, c);
    }
    return this;
  }
  polygon(points, c) {
    const ys = points.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = Math.floor(Math.min(...points.map(p => p[0]))); x <= Math.ceil(Math.max(...points.map(p => p[0]))); x++) {
        const px = x + 0.5, py = y + 0.5; let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i], [xj, yj] = points[j];
          if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.set(x, y, c);
      }
    }
    return this;
  }
  /** ASCII map: each char maps to a colour via `pal`; '.' or ' ' is transparent. */
  ascii(x0, y0, rows, pal) {
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) this.set(x0 + x, y0 + y, pal[ch]); }));
    return this;
  }
  /** Outline: every transparent pixel 4-adjacent to an opaque one becomes `c`. */
  outline(c, diagonal = false) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.alpha(x, y)) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      if (diagonal) n.push([1, 1], [-1, -1], [1, -1], [-1, 1]);
      if (n.some(([dx, dy]) => this.alpha(x + dx, y + dy) && !this._isOutline(x + dx, y + dy, c))) add.push([x, y]);
    }
    for (const [x, y] of add) this.set(x, y, c);
    return this;
  }
  _isOutline(x, y, c) { const p = this.get(x, y); return p[0] === c[0] && p[1] === c[1] && p[2] === c[2]; }
  /** Replace colour a with b inside a region test. */
  recolor(from, to, test = () => true) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const p = this.get(x, y);
      if (p[3] && p[0] === from[0] && p[1] === from[1] && p[2] === from[2] && test(x, y)) this.set(x, y, to);
    }
    return this;
  }
  blit(src, dx, dy, flip = false) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const p = src.get(flip ? src.w - 1 - x : x, y);
      if (p[3]) this.set(dx + x, dy + y, p);
    }
    return this;
  }
  scaled(k) {
    const out = new Pix(this.w * k, this.h * k);
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
      const p = this.get(Math.floor(x / k), Math.floor(y / k)); if (p[3]) out.set(x, y, p);
    }
    return out;
  }
  bbox() {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.alpha(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  colors() {
    const s = new Set();
    for (let i = 0; i < this.d.length; i += 4) if (this.d[i + 3]) s.add('#' + [this.d[i], this.d[i + 1], this.d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''));
    return [...s];
  }
  png() {
    const raw = Buffer.alloc((this.w * 4 + 1) * this.h);
    for (let y = 0; y < this.h; y++) { raw[y * (this.w * 4 + 1)] = 0; Buffer.from(this.d.buffer, y * this.w * 4, this.w * 4).copy(raw, y * (this.w * 4 + 1) + 1); }
    const chunk = (type, data) => {
      const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
      const td = Buffer.concat([Buffer.from(type), data]);
      const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
      return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(this.w, 0); ihdr.writeUInt32BE(this.h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  }
  save(path) { writeFileSync(path, this.png()); return this; }
}

// 3x5 font for labels on contact sheets (same glyphs as src/pixels.ts).
const glyphs = {
  A:'010101111101101', B:'110101110101110', C:'111100100100111', D:'110101101101110', E:'111100110100111', F:'111100110100100',
  G:'111100101101111', H:'101101111101101', I:'111010010010111', J:'001001001101111', K:'101101110101101', L:'100100100100111',
  M:'101111111101101', N:'101111111111101', O:'111101101101111', P:'110101110100100', Q:'111101101111001', R:'110101110101101',
  S:'111100111001111', T:'111010010010010', U:'101101101101111', V:'101101101101010', W:'101101111111101', X:'101101010101101',
  Y:'101101010010010', Z:'111001010100111', '0':'111101101101111', '1':'010110010010111', '2':'111001111100111', '3':'111001111001111',
  '4':'101101111001001', '5':'111100111001111', '6':'111100111101111', '7':'111001010010010', '8':'111101111101111', '9':'111101111001111',
  '/':'001001010100100', '-':'000000111000000', '.':'000000000000010', ':':'000010000010000', 'x':'000101010101000',
};
export function label(p, text, x, y, c) {
  [...text.toUpperCase()].forEach((ch, i) => { const g = glyphs[ch] || glyphs[ch.toLowerCase()]; if (!g) return; for (let k = 0; k < 15; k++) if (g[k] === '1') p.set(x + i * 4 + (k % 3), y + Math.floor(k / 3), c); });
}
