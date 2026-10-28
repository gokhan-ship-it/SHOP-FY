// Doğrulama scriptleri için video kareleri (Remotion'un kendi ffmpeg'i ile; ayrıca ffmpeg kurulumu gerekmez).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

export const ffmpeg = (args: string[]) => spawnSync('npx', ['remotion', 'ffmpeg', '-v', 'error', ...args], { maxBuffer: 1 << 28 });
// Remotion'un ffmpeg'inde ham video çıkışı ve select filtresi yok; tüm kareleri 8 bit RGB PNG akışı olarak alıyoruz
export const pngFrames = (file: string) => {
  const buf: Buffer = ffmpeg(['-i', file, '-pix_fmt', 'rgb24', '-c:v', 'png', '-f', 'image2pipe', '-']).stdout;
  const frames: Buffer[] = [];
  let start = 0, off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8);
    off += 12 + len;
    if (type === 'IEND') { frames.push(buf.subarray(start, off)); start = off; off += 8; }
  }
  return frames;
};

// 8 bit RGB ya da RGBA, taramasız PNG (ffmpeg'in ve Remotion still'inin ürettiği); RGB döndürür
export function decodePng(png: Buffer) {
  let off = 8, w = 0, h = 0, bpp = 3;
  const idat: Buffer[] = [];
  while (off < png.length) {
    const len = png.readUInt32BE(off), type = png.toString('ascii', off + 4, off + 8), data = png.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      if (data[8] !== 8 || (data[9] !== 2 && data[9] !== 6) || data[12] !== 0) throw new Error('beklenmeyen PNG biçimi');
      bpp = data[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, img = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? img[y * stride + x - bpp] : 0, b = y ? img[(y - 1) * stride + x] : 0, c = x >= bpp && y ? img[(y - 1) * stride + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = ft === 0 ? 0 : ft === 1 ? a : ft === 2 ? b : ft === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      img[y * stride + x] = (line[x] + pred) & 255;
    }
  }
  if (bpp === 3) return img;
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0, j = 0; i < img.length; i += 4, j += 3) { out[j] = img[i]; out[j + 1] = img[i + 1]; out[j + 2] = img[i + 2]; }
  return out;
}

// Bir composition'ın tek bir karesi, sıkıştırmasız (Remotion still → PNG)
export const still = (comp: string, frame: number) => {
  const dir = mkdtempSync(join(tmpdir(), 'still-')), file = join(dir, 'f.png');
  const r = spawnSync('npx', ['remotion', 'still', comp, file, `--frame=${frame}`], { stdio: 'ignore' });
  if (r.status !== 0) throw new Error(`still alınamadı: ${comp} ${frame}`);
  const img = decodePng(readFileSync(file));
  rmSync(dir, { recursive: true, force: true });
  return img;
};

// İki karenin ortalama mutlak farkı (0–255)
export const meanDiff = (a: Buffer, b: Buffer) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};
