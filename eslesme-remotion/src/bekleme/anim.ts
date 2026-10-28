// kapsul-bekleme-ekrani.html: alıcının bekleme ekranındaki kilit (kapsül henüz açılmaya hazır değil).
// Zaman halkası, geri sayım, yazılar ve bildirimler uygulamanın katmanı; videoda yalnızca kilit ve animasyonları var.
// "Süre dolsun" için video yok: uygulama döngünün tur sonunda SingleHazirLoop'a geçer (kilidin konumu/boyutu aynı).
// Tüm fonksiyonlar kareye bağlı ve saf (30 fps karesi); bir tur 60 kare.
import { easeInCubic, easeOutCubic, lerp, ramp } from '../anim';
import { blurSampleFrames } from '../blur';
import type { LockProps } from '../kilit/Lock';
import { TAU, lime } from '../tunnel/anim';
import type { TShape } from '../tunnel/shapes';

export const CX = 270, CYL = 470, RB = 100, DEPTH = 30, LOOP = 60;
const LOOK = { maxDepth: DEPTH, shackleWidth: 18, sheenWidth: 34, fadeBody: false };

// Videolar: hepsi bekleme döngüsünün bir turu. Olay videolarında olay turun başında (e = 0) başlar.
export type Variant = 'bekleme' | 'son24' | 'henuz' | 'ani';
const EV: Record<Variant, { last24: boolean; shake: number | null; drop: number | null; blur: boolean }> = {
  bekleme: { last24: false, shake: null, drop: null, blur: false },
  son24: { last24: true, shake: null, drop: null, blur: false },
  henuz: { last24: false, shake: 0, drop: null, blur: true },
  ani: { last24: false, shake: null, drop: 0, blur: true },
};
export const variantBlur = (v: Variant) => EV[v].blur;

function pulse(f: number, t0: number, amp: number, att = 3, dec = 11) {
  if (f < t0) return 0;
  const d = f - t0;
  if (d < att) return amp * easeOutCubic(d / att);
  if (d > att + dec * 2) return 0;
  return amp * Math.exp(-(d - att) / (dec / 3));
}
function echo(f: number, t0: number, x: number, y: number, r0: number, amp = .5, len = 20): TShape[] {
  if (f < t0 || f >= t0 + len) return [];
  const u = ramp(f, t0, t0 + len);
  return [{ kind: 'circle', cx: x, cy: y, r: lerp(r0, r0 * 2, 1 - Math.pow(2, -10 * u)), stroke: lime(amp * Math.pow(1 - u, 1.5)), width: lerp(2, .5, u) }];
}

// ---------- kilit durumu ----------
export function idleState(f: number) {
  const p = (((f % LOOP) + LOOP) % LOOP) / LOOP;
  return { cx: CX, dx: 0, cy: CYL - 5 * (1 - Math.cos(TAU * p)) / 2, depth: DEPTH,
    yaw: -.26 + .24 * Math.sin(TAU * p) * Math.sin(Math.PI * p), sx: 1, sy: 1,
    shO: 0, kp: 1, flash: 0, keyLime: 0, ripple: -1, sheen: p };
}
export function lockState(f: number, v: Variant) {
  const ev = EV[v], st = idleState(f);
  if (ev.last24) {
    const q = ((f % 30) + 30) % 30, z = pulse(q, 0, .035, 2, 5);
    st.sx *= 1 + z; st.sy *= 1 + z;
  }
  if (ev.shake !== null) {
    const u = f - ev.shake;
    if (u >= 0 && u < 34) {
      const k = Math.exp(-u / 6), s = Math.sin(u * 1.3);
      st.dx += 14 * k * s; st.yaw += -.22 * k * s; st.shO += 4 * Math.exp(-u / 4) * Math.abs(Math.sin(u * 2.2));
    }
  }
  if (ev.drop !== null) {
    const u = f - ev.drop;
    if (u >= 14 && u < 46) {
      const v2 = u - 14;
      st.sy *= 1 - .05 * Math.exp(-v2 / 4) * Math.cos(.9 * v2); st.sx *= 1 + .03 * Math.exp(-v2 / 4) * Math.cos(.9 * v2);
      st.keyLime = Math.max(st.keyLime, 1 - ramp(u, 16, 34));
      st.ripple = ramp(u, 14, 34);
    }
  }
  return st;
}
type St = ReturnType<typeof idleState>;
const faceCenter = (st: St): [number, number] => [st.cx + st.dx + Math.sin(st.yaw) * st.depth / 2, st.cy];

// drawLock → Lock bileşeninin prop'ları (kilit cx + dx'te)
export const lockProps = (st: St): Omit<LockProps, 'id'> => ({
  f: 0, cx: st.cx + st.dx, cy: st.cy, rad: RB, depth: st.depth, yaw: st.yaw, sx: st.sx, sy: st.sy,
  shO: st.shO, shQ: 1, shA: 1, gap: 0, kp: st.kp, krot: 0, keyLime: st.keyLime, ripple: st.ripple,
  flash: st.flash, level: 1, wave: 0, sheen: st.sheen, look: LOOK,
});

// ---------- anı damlası ----------
function dropPos(f: number, e: number, v: Variant): [number, number] {
  const u = f - e, s = easeInCubic(ramp(u, 0, 14)) * .85 + ramp(u, 0, 14) * .15;
  const st = lockState(f, v), [fx, fy] = faceCenter(st);
  const p0 = [CX - 200, CYL - 250], p1 = [CX - 70, CYL - 360], p2 = [fx, fy - .12 * RB * st.sy];
  const x = (1 - s) * (1 - s) * p0[0] + 2 * (1 - s) * s * p1[0] + s * s * p2[0];
  const y = (1 - s) * (1 - s) * p0[1] + 2 * (1 - s) * s * p1[1] + s * s * p2[1];
  return [x, y];
}
function drops(f: number, v: Variant): TShape[] {
  const e = EV[v].drop;
  if (e === null) return [];
  const u = f - e; if (u < 0 || u >= 15) return [];
  const out: TShape[] = [], appear = ramp(u, 0, 3);
  for (let k = 5; k >= 0; k--) {
    const uu = u - k * .9; if (uu < 0) continue;
    const [x, y] = dropPos(e + uu, e, v), r = lerp(8, 4.5, ramp(uu, 0, 14)) * (1 - k * .14);
    out.push({ kind: 'circle', cx: x, cy: y, r, fill: lime(appear * (k ? .22 * (1 - k / 6) : 1)) });
  }
  return out;
}

// ---------- sahne ----------
export function frameAt(f: number, v: Variant): { pre: TShape[]; lock: Omit<LockProps, 'id'>; post: TShape[] } {
  const st = lockState(f, v), pre: TShape[] = [];
  if (EV[v].last24) { const q = Math.floor(f / 30) * 30; pre.push(...echo(f, q, CX, st.cy, RB * 1.05, .18, 26)); }
  const e = EV[v].drop;
  if (e !== null) pre.push(...echo(f, e + 14, CX, st.cy, RB * 1.05, .45, 22));
  return { pre, lock: lockProps(st), post: drops(f, v) };
}

// Bir çıkış karesinin örnekleri (30 fps karesi). Olay videolarında turun başından önceki örnekler bir önceki
// bekleme turundan gelir (idleState döngüye sarar, olay henüz başlamamıştır); eskizde de olay bekleme sırasında gelir.
export const beklemeSamples = (v: Variant, d: number) => (EV[v].blur ? blurSampleFrames(d) : [d]);
