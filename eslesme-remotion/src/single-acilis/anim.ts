// single-acilis-v2.html: hediye single kapsülün açılışı. 1 · açılmaya hazır döngüsü (kilit kulpunu iki kez çekiştirir),
// 2 · açılış (kulp fırlar, anahtar deliği döner, kilit düzleşir, yüzü kalbe döner, kalbe dalınır ve tünel başlar).
// Tünel ve çıkış couple ile ortak (KalpTuneliLoop / KalpTuneliCikis). İsim, yazılar, buton, gün sayacı ve galeri
// uygulamanın katmanı; videoda yok. Tüm fonksiyonlar kareye bağlı ve saf (30 fps karesi).
import { easeInCubic, easeInOutCubic, easeOutCubic, easeOutQuart, lerp, ramp } from '../anim';
import { blurSampleFrames } from '../blur';
import type { LockProps } from '../kilit/Lock';
import { heartTunnelShapes } from '../tunnel/HeartTunnel';
import { CX, CY, P, TAU, heartD, heartUnit, lime, white, type TunnelCfg } from '../tunnel/anim';
import type { TShape } from '../tunnel/shapes';

export const RB = 100, DEPTH = 30, RH = 105;
export const READY = 120, RLOOP = 60, KLIK = 6, MORPH0 = 16, DIVE0 = 42, INTRO = 56;
export const CFG: TunnelCfg = { intro: INTRO, dive0: DIVE0, heroR: RH };
// Eskizde yükleme "2 sn": 2 tur tünel (açılış videosu tünele girmeden biter, te yalnızca tutarlılık için)
export const TE = INTRO + 2 * P;
const LOOK = { maxDepth: DEPTH, shackleWidth: 18, sheenWidth: 36, fadeBody: true };
const LIME_STOPS: [number, string][] = [[0, '#ECFF8C'], [.45, '#DEFE52'], [1, '#C9E644']];

function pulse(f: number, t0: number, amp: number, att = 3, dec = 11) {
  if (f < t0) return 0;
  const d = f - t0;
  if (d < att) return amp * easeOutCubic(d / att);
  if (d > att + dec * 2) return 0;
  return amp * Math.exp(-(d - att) / (dec / 3));
}
function echo(f: number, t0: number, x: number, y: number, r0: number, amp = .6, len = 18): TShape[] {
  if (f < t0 || f >= t0 + len) return [];
  const t = ramp(f, t0, t0 + len);
  return [{ kind: 'circle', cx: x, cy: y, r: lerp(r0, r0 * 2.1, 1 - Math.pow(2, -10 * t)), stroke: lime(amp * Math.pow(1 - t, 1.5)), width: lerp(2, .5, t) }];
}

// ---------- 1 · açılmaya hazır (loop) ----------
const JIGS = [6, 36];
export function readyState(f: number) {
  const p = f / RLOOP;
  let shO = 0, flash = 0;
  for (const t0 of JIGS) if (f >= t0 && f < t0 + 16) { const d = f - t0; shO += 7 * Math.exp(-d / 2.4) * Math.abs(Math.sin(1.5 * d)); flash += .1 * Math.exp(-d / 3); }
  return { cx: CX, cy: CY - 5 * (1 - Math.cos(TAU * p)) / 2, depth: DEPTH, yaw: -.26 + .24 * Math.sin(TAU * p) * Math.sin(Math.PI * p),
    sx: 1, sy: 1, shO, shA: 1, kp: 1, krot: 0, flash, sheen: p, idle: true,
    m: 0, ss: 1, b: 0, rimA: 1, fillA: 1, outA: 0 };
}

// ---------- 2 · açılış: kilit → kalp ----------
export function openState(t: number) {
  let sx = 1, sy = 1;
  if (t < KLIK) { const e = easeOutCubic(ramp(t, 0, KLIK)); sy = 1 - .05 * e; sx = 1 + .03 * e; }
  else { const u = t - KLIK, j = Math.exp(-u / 4) * Math.cos(.9 * u); sy = 1 - .05 * j; sx = 1 + .03 * j; }
  let shO = 0, shA = 1, krot = 0, flash = 0;
  if (t >= KLIK) {
    const u = t - KLIK;
    shO = 70 * (1 - Math.exp(-u / 3.5) * Math.cos(.5 * u));
    krot = Math.PI / 2 * (1 - Math.exp(-u / 3) * Math.cos(.7 * u));
    flash = u < 10 ? .45 * Math.exp(-u / 3) : 0;
  }
  if (t >= 12) { shO += Math.pow(t - 12, 2) * .9; shA = 1 - ramp(t, 12, 22); }
  const fl = easeInOutCubic(ramp(t, 8, 18));
  const m = t < MORPH0 ? 0 : easeOutQuart(ramp(t, MORPH0, MORPH0 + 10));
  let ss = 1; if (t >= MORPH0) { const u = t - MORPH0; ss = 1 + .18 * Math.exp(-u / 7) * Math.sin(.45 * u); }
  ss *= 1 - .1 * easeInOutCubic(ramp(t, 38, 42));
  return { cx: CX, cy: CY, depth: lerp(DEPTH, 0, fl), yaw: lerp(-.26, 0, fl), sx, sy, shO, shA,
    kp: 1 - easeInCubic(ramp(t, 10, 16)), krot, flash, sheen: 0, idle: false,
    m, ss, b: (pulse(t, 28, .10) + pulse(t, 34, .05)) * (1 - ramp(t, 38, 41)), rimA: 1 - ramp(t, 18, 28), fillA: 1 - ramp(t, 38, 46), outA: ramp(t, 38, 44) };
}
type St = ReturnType<typeof openState>;

// drawLockHeart → Lock bileşeninin prop'ları
const lockProps = (st: St): Omit<LockProps, 'id'> => ({
  f: 0, cx: st.cx, cy: st.cy, rad: RB, depth: st.depth, yaw: st.yaw, sx: st.sx, sy: st.sy,
  shO: st.shO, shQ: 1, shA: st.shA, gap: 0, kp: st.kp, krot: st.krot, keyLime: 0, ripple: -1,
  flash: st.flash, level: 1, wave: 0, sheen: st.idle ? st.sheen : null,
  morph: { m: st.m, kx: st.ss * (1 + .75 * st.b), ky: st.ss * (1 + 1.1 * st.b), heartR: RH },
  fillA: st.fillA, rimA: st.rimA, outA: st.outA, look: LOOK,
});

function burst(t: number): TShape[] {
  if (t < MORPH0 + 2 || t >= MORPH0 + 18) return [];
  const u = easeOutCubic(ramp(t, MORPH0 + 2, MORPH0 + 18));
  return Array.from({ length: 8 }, (_, i) => {
    const [hx, hy] = heartUnit((i + .5) / 8), x = hx * RH, y = hy * RH, len = Math.hypot(x, y) || 1, d = 1.08 + .45 * u;
    return { kind: 'circle', cx: CX + x * d + x / len * 8, cy: CY + y * d + y / len * 8, r: Math.max(.1, 6 * (1 - u)), fill: i % 2 ? white(1 - u) : lime(1 - u) } as TShape;
  });
}

// kahraman kalp tünele dalarken (eskizde drawTunnel içindeki t < INTRO bölümü)
function heroShapes(t: number, { persp, na }: { persp: number; na: number }): TShape[] {
  const s = openState(t), r = RB * s.ss * persp, d = heartD(0, 0, RH * s.ss * persp);
  const children: TShape[] = [];
  if (s.fillA > 0) children.push({ kind: 'gradFill', d, from: [-r, -r], to: [r, r], stops: LIME_STOPS, opacity: s.fillA * na });
  children.push({ kind: 'stroke', d, stroke: lime(s.outA * na), width: 3.8 * persp });
  return [{ kind: 'group', transform: `translate(${CX} ${CY})`, children }];
}

// ---------- sahne (eskizin global zamanı gg) ----------
export type SingleFrame =
  | { kind: 'lock'; pre: TShape[]; lock: Omit<LockProps, 'id'>; post: TShape[] }
  | { kind: 'tunnel'; shapes: TShape[] };

export function frameAt(gg: number, te: number): SingleFrame {
  if (gg < READY) {
    const f = gg % RLOOP, st = readyState(f);
    return { kind: 'lock', pre: JIGS.flatMap((t0) => echo(f, t0, st.cx, st.cy, RB * 1.05, .35, 22)), lock: lockProps(st), post: [] };
  }
  const t = gg - READY;
  if (t < DIVE0) {
    const st = openState(t);
    return { kind: 'lock', pre: [...echo(t, KLIK, st.cx, st.cy, RB * 1.05), ...echo(t, MORPH0 + 2, CX, CY, RH, .5, 18)], lock: lockProps(st), post: burst(t) };
  }
  return { kind: 'tunnel', shapes: heartTunnelShapes(t, te, CFG, (h) => heroShapes(t, h)) };
}

// ---------- videolar ----------
export type Segment = 'hazir' | 'acilis';
// Hazır döngüsü eskizin ikinci turundan (60–119), açılış bileklik okutulduğu andan (120–175).
export const SEGMENTS: Record<Segment, { start: number; len: number }> = {
  hazir: { start: RLOOP, len: RLOOP },
  acilis: { start: READY, len: INTRO },
};
// Bir çıkış karesinin motion blur örnekleri, eskizin global zamanında (HTML: max(0, s); okutunca s < READY → READY).
// Hazır döngüsünde örnekler tura sarılır; 1e-6 yuvarlaması kesirli örneklerdeki kayan nokta artıklarını temizler.
export const singleSamples = (seg: Segment, d: number, blur: boolean) => {
  const gg = SEGMENTS[seg].start + d, ss = blur ? blurSampleFrames(gg) : [gg];
  return seg === 'hazir'
    ? ss.map((s) => RLOOP + Math.round(((((s % RLOOP) + RLOOP) % RLOOP) * 1e6)) / 1e6 % RLOOP)
    : ss.map((s) => Math.max(READY, s));
};
