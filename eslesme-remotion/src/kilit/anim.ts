// single-kilit-final.html içindeki çizim mantığının birebir aktarımı.
// Tüm fonksiyonlar kare numarasına bağlı ve saf; zamanlamalar, easing'ler ve yay değerleri değiştirilmedi.
import { clamp, easeInCubic, easeInOutCubic, easeOutCubic, lerp, ramp } from '../anim';
import { blurSampleFrames } from '../blur';

export const FPS = 30, TOTAL = 140, LOCK_END = 80, IMPACT = 60;
export const FILL0 = 15, FILL1 = 33, F3D0 = 38, F3D1 = 50, KEY0 = 44;
export const S = 800, CX = 400, CY = 400, R = 150, RB = 112, DEPTH = 34, TAU = Math.PI * 2, D = Math.PI / 180;
export const LIME = [222, 254, 82] as const;
export const lime = (a: number) => `rgba(${LIME[0]},${LIME[1]},${LIME[2]},${a})`;
export const white = (a: number) => `rgba(255,255,255,${a})`;

// Kilit anı 0…LOCK_END bir kere oynar; bekleme döngüsü LOCK_END…TOTAL kilitli kaldıkça döner
export const IDLE = TOTAL - LOCK_END;
export type Segment = 'lock' | 'idle';
export type KilitFx = { blur: boolean; bloom: boolean; echo: boolean };

// Segmentin kendi zamanını (blur örnekleri dahil) HTML'deki kare numarasına çevirir.
// Kilit: HTML'deki gibi 0'ın altı 0'a kırpılır. Bekleme: döngü içinde sarılır, böylece
// bekleme videosunun kare 0'ı ile bir sonraki turun başlangıcı birebir aynı olur.
// 1e-6 yuvarlaması kesirli blur örneklerinde kayan nokta artıklarını temizler (görsel fark yok).
export const segmentFrame = (seg: Segment, t: number) =>
  seg === 'lock' ? Math.max(0, t) : LOCK_END + Math.round(((((t % IDLE) + IDLE) % IDLE) * 1e6)) / 1e6 % IDLE;

// Bir çıkış karesinin (tasarım karesi `frame`) motion blur örnekleri, HTML karesi cinsinden
export const kilitSamples = (seg: Segment, frame: number, blur: boolean) =>
  (blur ? blurSampleFrames(frame) : [frame]).map((t) => segmentFrame(seg, t));

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export function echo(f: number, t0: number, x: number, y: number, r0: number, FX: KilitFx) {
  if (!FX.echo || f < t0 || f >= t0 + 18) return null;
  const t = ramp(f, t0, t0 + 18);
  return { cx: x, cy: y, r: lerp(r0, r0 * 2.2, 1 - Math.pow(2, -10 * t)), stroke: lime(.6 * Math.pow(1 - t, 1.5)), strokeWidth: lerp(2, .5, t) };
}

// ---------- hareket durumu (kareye bağlı saf fonksiyon) ----------
export function keyPop(f: number) { if (f < KEY0) return 0; const t = f - KEY0; return 1 - Math.exp(-t / 4) * Math.cos(.45 * t); }

export function lockState(f: number) {
  if (f >= LOCK_END) {
    const p = (f - LOCK_END) / (TOTAL - LOCK_END);
    return { rad: RB, cx: CX, cy: CY + 50 - 5 * (1 - Math.cos(TAU * p)) / 2, depth: DEPTH,
      yaw: -.26 + .24 * Math.sin(TAU * p) * Math.sin(Math.PI * p), sx: 1, sy: 1,
      shQ: 1, shO: 0, shA: 1, gap: 0, kp: 1, krot: 0, flash: 0, level: 1, wave: 0, idle: true, sheen: p };
  }
  const fadeL = 1 - ramp(f, 72, 78);
  const t3 = easeInOutCubic(ramp(f, F3D0, F3D1));
  let sx = 1, sy = 1;
  if (f >= 8 && f < FILL0) sx = sy = lerp(1, 1.03, easeOutCubic(ramp(f, 8, FILL0)));
  else if (f >= FILL0 && f < FILL1) sx = sy = lerp(1.03, 1, easeInOutCubic(ramp(f, FILL0, FILL1)));
  else if (f >= FILL1) { const u = f - FILL1, j = .08 * Math.exp(-u / 4) * Math.sin(.9 * u); sx = 1 + j * .6; sy = 1 - j; }

  const rad = lerp(R, RB, t3), cy = lerp(CY, CY + 50, t3), depth = DEPTH * t3;
  let yaw = 0;
  if (f >= F3D0 && f < 52) yaw = -.62 * easeOutCubic(ramp(f, F3D0, 52));
  else if (f >= 52) { const u = f - 52; yaw = -.26 - .36 * Math.exp(-u / 6) * Math.cos(.25 * u) * fadeL; }
  if (f >= IMPACT) { const u = f - IMPACT, j = .07 * Math.exp(-u / 4) * Math.sin(.9 * u) * fadeL; sy *= 1 - j; sx *= 1 + j * .5; }

  const shQ = easeInOutCubic(ramp(f, 40, 50));
  let shO = 44;
  if (f >= 50 && f < 56) shO = 44 + 8 * easeOutCubic(ramp(f, 50, 56));
  else if (f >= 56 && f < IMPACT) shO = lerp(52, 0, easeInCubic(ramp(f, 56, IMPACT)));
  else if (f >= IMPACT) shO = 0;

  const gap = f < IMPACT ? 30 * D : 30 * D * (1 - easeOutCubic(ramp(f, IMPACT, IMPACT + 5)));
  const flash = (f >= IMPACT && f < IMPACT + 12) ? .5 * Math.exp(-(f - IMPACT) / 3) : 0;
  let level = 1, wave = 0;
  if (f < FILL0) level = 0;
  else if (f < FILL1) { const p = ramp(f, FILL0, FILL1); level = easeInOutSine(p); wave = Math.sin(Math.PI * p); }
  return { rad, cx: CX, cy, depth, yaw, sx, sy, shQ, shO, shA: 1, gap, kp: keyPop(f), krot: 0, flash, level, wave, idle: false, sheen: 0 };
}
export type LockState = ReturnType<typeof lockState>;

// ---------- geometri ----------
export function shackleGeo(r: number) {
  const a = .5 * r, ybL = -.75 * r, ybR = -.3 * r, yt = -1.3 * r;
  const L1 = ybL - yt, LA = Math.PI * a, L2 = ybR - yt, T = L1 + LA + L2;
  const U = (s: number): [number, number] => {
    if (s <= L1) return [-a, ybL - s];
    if (s <= L1 + LA) { const ang = (s - L1) / a; return [-a * Math.cos(ang), yt - a * Math.sin(ang)]; }
    return [a, yt + (s - L1 - LA)];
  };
  return { U, T, sTop: L1 + LA / 2, top: yt - a, bot: ybR };
}
