// kapsul-acilis-kalp-tuneli.html: couple kapsül açılışı (giriş + kalp tüneli + çıkış), "Tünel: Kalp".
// Giriş: iki halka biri yukarıdan biri aşağıdan gelip buluşur, kalp olur, bir kez atar, kontura döner, içine dalınır.
// Tarih sayacı ve galeri uygulamanın katmanı; videoda yok. Tüm fonksiyonlar kareye bağlı ve saf (30 fps karesi).
import { clamp, easeInCubic, easeInOutCubic, easeOutCubic, easeOutQuart, lerp, ramp } from '../anim';
import { blurSampleFrames } from '../blur';
import { heartTunnelShapes } from '../tunnel/HeartTunnel';
import { CX, CY, EXIT, P, TAU, lime, white, type TunnelCfg } from '../tunnel/anim';
import { H0, type TShape } from '../tunnel/shapes';

export const R = 95, INTRO = 60, DIVE0 = 46;
export const CFG: TunnelCfg = { intro: INTRO, dive0: DIVE0, heroR: R };
// Eskizde yükleme "2 sn": 2 tur tünel, çıkış 90. karede başlar
export const TE = INTRO + 2 * P;

const easeOutBack = (t: number) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function pulse(f: number, t0: number, amp: number, att = 3, dec = 11) {
  if (f < t0) return 0;
  const d = f - t0;
  if (d < att) return amp * easeOutCubic(d / att);
  if (d > att + dec * 2) return 0;
  return amp * Math.exp(-(d - att) / (dec / 3));
}

// ---------- geometri ----------
function lensPt(s: number, h: number): [number, number] {
  const g = Math.atan2(Math.sqrt(Math.max(0, R * R - h * h)), h);
  if (s < .5) { const phi = Math.PI + g - 2 * g * (s / .5); return [h + R * Math.cos(phi), R * Math.sin(phi)]; }
  const phi = g - 2 * g * ((s - .5) / .5); return [-h + R * Math.cos(phi), R * Math.sin(phi)];
}
function heartPt(s: number): [number, number] {
  const a = Math.PI + TAU * s, k = R / 16;
  return [16 * Math.pow(Math.sin(a), 3) * k, (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a) + 2.5) * k];
}
function morphD(h: number, m: number, kx: number, ky: number) {
  let d = '';
  for (let i = 0; i <= 160; i++) {
    const s = i / 160, a = lensPt(s, h), b = heartPt(s);
    d += `${i ? 'L' : 'M'}${lerp(a[0], b[0], m) * kx} ${-lerp(a[1], b[1], m) * ky}`;
  }
  return d + 'Z';
}

// ---------- giriş: iki halka buluşur, kalp olur ----------
export function introState(t: number) {
  const e = easeOutBack(ramp(t, 4, 20));
  const yA = lerp(-R - 60, CY, e), yB = lerp(H0 + R + 60, CY, e);
  let q = 0; if (t >= 20 && t < 46) { const x = t - 20; q = .12 * Math.exp(-x / 4) * Math.cos(x * .85); }
  const m = t >= 24 ? easeOutQuart(ramp(t, 24, 33)) : 0;
  const c = t >= 24 ? easeInCubic(ramp(t, 24, 32)) : 0;
  let ss = 1; if (t >= 24) { const x = t - 24; ss = 1 + .2 * Math.exp(-x / 7) * Math.sin(.45 * x); }
  ss *= 1 - .1 * easeInOutCubic(ramp(t, 44, 48));
  const b = pulse(t, 34, .10) + pulse(t, 40, .05);
  return { yA, yB, h: .40 * R, sx: 1 - q, sy: 1 + q * .8, m, c, ss, b };
}

function introShapes(t: number): TShape[] {
  if (t < 4) return [];
  const out: TShape[] = [];
  const s = introState(t), h = s.h;
  if (t >= 20 && t < 38) {
    const u = ramp(t, 20, 38);
    out.push({ kind: 'circle', cx: CX, cy: CY, r: lerp(R, R * 2.4, 1 - Math.pow(2, -10 * u)), stroke: lime(.6 * Math.pow(1 - u, 1.5)), width: lerp(2, .5, u) });
  }
  const local: TShape[] = [];
  const fillA = 1 - ramp(t, 44, 52);
  if (t < 24) {
    // iki halkanın kesişimi lime: B dairesi, A dairesiyle kırpılır (kırpma yalnızca bu grupta)
    out.push({ kind: 'group', transform: `translate(${CX} ${CY}) scale(${s.sx} ${s.sy})`, clip: { cx: -h, cy: s.yA - CY, r: R },
      children: [{ kind: 'fill', d: circleD(h, s.yB - CY, R), fill: lime(1) }] });
  } else {
    const kx = s.ss * (1 + .75 * s.b), ky = s.ss * (1 + 1.1 * s.b), d = morphD(h, s.m, kx, ky);
    local.push({ kind: 'fill', d, fill: lime(fillA) });
    const oA = ramp(t, 44, 50);
    if (oA > 0) local.push({ kind: 'stroke', d, stroke: lime(oA), width: 3.8 });
  }
  const ra = clamp((1 - s.c) / .5);
  if (ra > .01) {
    const cc = clamp(s.c), rs = lerp(1, s.ss, cc), ys = [s.yA - CY, s.yB - CY];
    [-1, 1].forEach((side, i) => local.push({ kind: 'circle', cx: side * lerp(h, .5 * R, cc) * rs, cy: lerp(ys[i], -.41 * R, cc) * rs,
      r: Math.max(1, lerp(R, .5 * R, cc) * rs), stroke: white(ra), width: lerp(2.4, 1.2, cc) }));
  }
  if (local.length) out.push({ kind: 'group', transform: `translate(${CX} ${CY}) scale(${s.sx} ${s.sy})`, children: local });
  return out;
}
const circleD = (cx: number, cy: number, r: number) => `M${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}Z`;

// kahraman kalp tünele dalarken (eskizde drawTunnel içindeki t < INTRO bölümü)
function heroShapes(t: number, { persp, na }: { persp: number; na: number }): TShape[] {
  const s = introState(t), k = s.ss * persp, d = morphD(s.h, 1, k, k);
  const children: TShape[] = [];
  const fillA = 1 - ramp(t, 44, 52);
  if (fillA > 0) children.push({ kind: 'fill', d, fill: lime(fillA * na) });
  children.push({ kind: 'stroke', d, stroke: lime(ramp(t, 44, 50) * na), width: 3.8 * persp });
  return [{ kind: 'group', transform: `translate(${CX} ${CY})`, children }];
}

// drawScene (galeri hariç): t < DIVE0 giriş, sonrası tünel
export function sceneShapes(t: number, te: number): TShape[] {
  return t < DIVE0 ? introShapes(t) : heartTunnelShapes(t, te, CFG, (h) => heroShapes(t, h));
}

// ---------- videolar ----------
// Sahne zamanı (30 fps karesi) ve çıkışın başladığı kare. Döngü videosu tünelin ikinci turundan (75–89) alınır;
// çıkış videosu yükleme "2 sn" iken 90–113. kareler. Döngüde çıkış yok (te = ∞).
export type Segment = 'giris' | 'loop' | 'cikis';
export const SEGMENTS: Record<Segment, { start: number; len: number; te: number }> = {
  giris: { start: 0, len: INTRO, te: TE },
  loop: { start: INTRO + P, len: P, te: Infinity },
  cikis: { start: TE, len: EXIT, te: TE },
};
// Bir çıkış karesinin motion blur örnekleri (HTML: max(0, t - .8·i/9))
export const coupleSamples = (seg: Segment, d: number, blur: boolean) => {
  const t = SEGMENTS[seg].start + d;
  return (blur ? blurSampleFrames(t) : [t]).map((x) => Math.max(0, x));
};
