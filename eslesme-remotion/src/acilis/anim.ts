// merhaba-acilis.html içindeki çizim mantığının birebir aktarımı (uygulama açılışı · "merhaba").
// Tüm fonksiyonlar kare numarasına bağlı ve saf; zamanlamalar, easing'ler ve yay değerleri değiştirilmedi.
// Ana ekran (drawApp) uygulamanın kendisi; videoda yok.
import { easeInCubic, easeInOutCubic, easeOutCubic, lerp, ramp } from '../anim';
import { blurSampleFrames } from '../blur';

export const FPS = 30, W0 = 540, H0 = 960, CX = 270, BASE_Y = 520, TAU = Math.PI * 2;
export const LIME = [222, 254, 82] as const;
export const lime = (a: number) => `rgba(${LIME[0]},${LIME[1]},${LIME[2]},${a})`;
export const white = (a: number) => `rgba(255,255,255,${a})`;
export const SPEED_SHORT = 2.4;

export type AcilisVariant = 'hand' | 'geo';
export type Word = 'merhaba' | 'hello' | 'hallo';
export type AcilisFx = { blur: boolean; bloom: boolean };

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutBack = (t: number) => { const c1 = 1.8, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function pulse(f: number, t0: number, amp: number, att = 3, dec = 10) {
  if (f < t0) return 0;
  const d = f - t0;
  if (d < att) return amp * easeOutCubic(d / att);
  if (d > att + dec * 2) return 0;
  return amp * Math.exp(-(d - att) / (dec / 3));
}

// Çizilecek şekiller (SVG'ye doğrudan çevrilir). Kalınlıklar ve yarıçaplar 540×960 ölçeğinde.
export type Shape =
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { kind: 'path'; d: string; stroke: string; strokeWidth: number }
  | { kind: 'glow'; cx: number; cy: number; r: number; inner: number } // lime radyal parıltı (kalem ucu)
  | { kind: 'fill'; color: string }; // tüm ekran

type Pt = [number, number];
// F noktasından ekranın en uzak köşesine uzaklık
const farCorner = (F: Pt) => Math.max(...[[0, 0], [W0, 0], [0, H0], [W0, H0]].map(([x, y]) => Math.hypot(x - F[0], y - F[1])));
const polyD = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');

// =========================================================
// 1 · TEK ÇİZGİYLE EL YAZISI
// harf noktaları: [x, y, kırılma?]  taban çizgisi y=0, x-yüksekliği 1
// =========================================================
// Harfler: EMS Allure (Allura türevi, SIL Open Font License) tek çizgi yazı fontundan alındı,
// yazım sırasına göre düzenlendi. [x, y, kırılma?] font birimi; x-yüksekliği 300.
type HandPt = [number, number] | [number, number, number];
type HandLetter = { adv: number; pre?: HandPt[]; pts: HandPt[] };
export const AL: Record<string, HandLetter> = {
  m: { adv: 687, pts: [[-31.5,183],[47.2,255],[75.6,321,1],[-34.6,28.4,1],[37.8,104],[167,252],[233,309],[280,337],[302,340],[309,312],[296,274],[208,107,1],[318,195],[403,261],[491,293,1],[447,230],[400,94.5],[413,37.8],[472,18.9],[561,69.3],[655,183]] },
  e: { adv: 346, pts: [[66.1,170],[148,211],[217,249],[252,306],[239,350],[180,356],[63,287],[15.8,252],[-34.6,192],[-66.1,139],[-72.4,88.2],[-50.4,44.1],[31.5,9.45],[170,44.1],[214,81.9],[277,135],[315,183]] },
  r: { adv: 369, pts: [[-31.5,183],[34.6,287],[154,463,1],[47.2,391],[47.2,365],[59.9,356],[258,353,1],[145,214],[81.9,101],[97.6,22],[186,28.4],[296,132],[337,183]] },
  h: { adv: 561, pts: [[-31.5,183],[113,315],[343,482],[447,605],[469,702],[394,718],[324,662],[255,586],[180,457],[101,309],[12.6,31.5,1],[110,148],[192,252],[287,315],[328,334],[350,312],[340,261],[290,183],[261,75.6],[284,18.9],[350,18.9],[413,63],[482,129],[529,183]] },
  l: { adv: 261, pts: [[-25.2,176],[91.4,265],[239,428],[346,589],[394,662],[381,709],[312,718],[243,674],[148,532],[41,340],[-28.4,198],[-50.4,85.1],[-22,25.2],[44.1,18.9],[120,53.6],[195,132],[230,183]] },
  a: { adv: 526, pre: [[34.6,261],[148,331]], pts: [[240,362],[318,352],[324,343,1],[300,358],[230,357],[148,331],[34.6,261],[-56.7,154],[-63,66.1],[-18.9,18.9],[69.3,56.7],[176,145],[277,243],[296,274,1],[255,142],[243,63],[271,18.9],[331,31.5],[406,78.8],[457,132],[495,183]] },
  b: { adv: 416, pts: [[-31.5,183],[47.2,252],[132,328],[233,406],[312,476],[394,583],[416,674],[372,721],[284,680],[195,564],[97.6,359],[37.8,202],[28.4,72.4,1],[70,22],[135,18.9],[189,40.9],[287,120],[328,183],[369,252],[365,296],[334,334],[255,320],[150,290],[90,262,1],[170,300],[260,328],[340,330],[400,305],[445,280]] },
  o: { adv: 391, pre: [[-6.3,233],[66.1,315],[142,365]], pts: [[195,337,1],[142,366],[66.1,315],[-6.3,233],[-40.9,161],[-56.7,75.6],[12.6,9.45],[101,40.9],[183,110],[230,208],[239,246],[239,284],[250,302],[300,312],[360,305]] },
};

function catmull(p0: HandPt, p1: HandPt, p2: HandPt, p3: HandPt, n: number) {
  const out: Pt[] = [], d = (a: HandPt, b: HandPt) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6, .5);
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  for (let i = 0; i < n; i++) {
    const t = t1 + (t2 - t1) * i / n;
    const L = (a: Pt | HandPt, b: Pt | HandPt, ta: number, tb: number): Pt => [(tb - t) / (tb - ta) * a[0] + (t - ta) / (tb - ta) * b[0], (tb - t) / (tb - ta) * a[1] + (t - ta) / (tb - ta) * b[1]];
    const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
    out.push(L(L(A1, A2, t0, t2), L(A2, A3, t1, t3), t1, t2));
  }
  return out;
}
function spline(pts: HandPt[]) {
  const segs: HandPt[][] = []; let cur: HandPt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) { cur.push(pts[i]); if (pts[i][2] && i < pts.length - 1) { segs.push(cur); cur = [pts[i]]; } }
  segs.push(cur);
  const out: Pt[] = [];
  for (const s of segs) for (let i = 0; i < s.length - 1; i++) {
    const p0: HandPt = i > 0 ? s[i - 1] : [2 * s[0][0] - s[1][0], 2 * s[0][1] - s[1][1]];
    const p3: HandPt = i + 2 < s.length ? s[i + 2] : [2 * s[s.length - 1][0] - s[s.length - 2][0], 2 * s[s.length - 1][1] - s[s.length - 2][1]];
    out.push(...catmull(p0, s[i], s[i + 1], p3, 12));
  }
  out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
  return out;
}
type HandGeo = { word: Pt[]; ring: Pt[]; cw: number[]; cr: number[]; unit: number; ox: number; rc: Pt; rr: number; start: HandPt };
const handCache: Record<string, HandGeo> = {};
export function handGeo(word: string): HandGeo {
  if (handCache[word]) return handCache[word];
  let x = 0; const pts: HandPt[] = [];
  for (const ch of word) {
    const L = AL[ch];
    for (const p of [...(L.pre || []), ...L.pts]) pts.push([(p[0] + x) / 300, p[1] / 300, p[2] ?? 0]);
    x += L.adv;
  }
  // uçta lime halka: son çıkıştan sağa doğru akıp halkanın altından girer
  const ex = pts[pts.length - 1], rr = .3, rc: Pt = [ex[0] + .38, ex[1] - .03 + rr];
  pts.push([ex[0] + .2, ex[1] - .06], [rc[0], rc[1] - rr]);
  const wpts = spline(pts);
  const ring: Pt[] = []; for (let i = 0; i <= 64; i++) { const a = -Math.PI / 2 + TAU * i / 64; ring.push([rc[0] + Math.cos(a) * rr, rc[1] + Math.sin(a) * rr]); }
  const cum = (arr: Pt[]) => { const c = [0]; for (let i = 1; i < arr.length; i++) c.push(c[i - 1] + Math.hypot(arr[i][0] - arr[i - 1][0], arr[i][1] - arr[i - 1][1])); return c; };
  let left = Infinity, right = -Infinity;
  for (const p of wpts) { left = Math.min(left, p[0]); right = Math.max(right, p[0]); }
  right = Math.max(right, rc[0] + rr);
  const unit = Math.min(64, 470 / (right - left)), ox = CX - (left + right) / 2 * unit;
  return (handCache[word] = { word: wpts, ring, cw: cum(wpts), cr: cum(ring), unit, ox, rc, rr, start: pts[0] });
}
export function handTimeline(word: string) {
  const n = word.length, wDur = 18 + 5.2 * n;
  const W0f = 6, W1 = W0f + wDur, R1 = W1 + 9, D0 = R1 + 7, D1 = D0 + 20, END = D1 + 3;
  return { W0: W0f, W1, R1, D0, D1, END };
}
// Canvas'taki drawPartial: yolun ilk L uzunluğu; ucu döndürür
function partial(pts: Pt[], cum: number[], L: number, map: (p: Pt) => Pt): { d: string; last: Pt } | null {
  if (L <= 0) return null;
  const out: Pt[] = [];
  let last: Pt | null = null;
  for (let i = 0; i < pts.length; i++) {
    const [X, Y] = map(pts[i]);
    if (cum[i] <= L) { out.push([X, Y]); last = [X, Y]; }
    else {
      const [Xp, Yp] = map(pts[i - 1]), u = (L - cum[i - 1]) / (cum[i] - cum[i - 1]);
      last = [lerp(Xp, X, u), lerp(Yp, Y, u)]; out.push(last); break;
    }
  }
  return { d: polyD(out), last: last! };
}
function drawHand(f: number, WORD: string): Shape[] {
  const out: Shape[] = [];
  const G = handGeo(WORD), T = handTimeline(WORD), U = G.unit;
  const F: Pt = [G.ox + G.rc[0] * U, BASE_Y - G.rc[1] * U];
  // Eskizde dalış 70 kat yakınlaşmada biter; "hello"/"hallo"da halka tam bu anda ekrandan çıkar. Uzun kelimede
  // (merhaba) halka küçük kaldığı için 70'te köşelerde kalıyordu; dalış en az halkanın ekrandan çıktığı yere kadar sürer.
  const zEnd = Math.max(70, farCorner(F) / ((G.rr - .065) * U));
  let z = 1;
  if (f >= T.D0) z = Math.exp(easeInCubic(ramp(f, T.D0, T.D1)) * Math.log(zEnd));
  const map = ([x, y]: Pt): Pt => [F[0] + (G.ox + x * U - F[0]) * z, F[1] + (BASE_Y - y * U - F[1]) * z];
  const fadeW = 1 - ramp(z, 2.5, 9);

  // başlangıç noktası
  const dotP = map([G.start[0], G.start[1]]), dotS = easeOutBack(ramp(f, 0, 7));
  if (dotS > 0) out.push({ kind: 'circle', cx: dotP[0], cy: dotP[1], r: Math.max(0, 5.5 * dotS * z), fill: lime(fadeW) });

  // kelime
  const wp = easeInOutSine(ramp(f, T.W0, T.W1));
  const word = partial(G.word, G.cw, wp * G.cw[G.cw.length - 1], map);
  if (word) out.push({ kind: 'path', d: word.d, stroke: white(fadeW), strokeWidth: Math.max(1, .11 * U * z) });
  const tip = word?.last ?? null;

  // halka
  const rp = easeInOutCubic(ramp(f, T.W1, T.R1));
  let ringTip: Pt | null = null;
  if (rp > 0) {
    const pop = f >= T.R1 ? 1 + .22 * Math.exp(-(f - T.R1) / 4) * Math.sin(.8 * (f - T.R1)) : 1;
    const mapR = (p: Pt) => map([G.rc[0] + (p[0] - G.rc[0]) * pop, G.rc[1] + (p[1] - G.rc[1]) * pop]);
    const ring = partial(G.ring, G.cr, rp * G.cr[G.cr.length - 1], mapR);
    if (ring) { out.push({ kind: 'path', d: ring.d, stroke: lime(1), strokeWidth: Math.max(1, .13 * U * z) }); ringTip = ring.last; }
  }
  // kalem ucu
  const tp = rp > 0 && rp < 1 ? ringTip : (wp > 0 && wp < 1 ? tip : null);
  if (tp) {
    out.push({ kind: 'glow', cx: tp[0], cy: tp[1], r: 18, inner: .55 });
    out.push({ kind: 'circle', cx: tp[0], cy: tp[1], r: 3.6, fill: white(1) });
  }
  // halka kapanınca ritim halkası
  if (f >= T.R1 && f < T.R1 + 18 && z < 1.5) {
    const u = ramp(f, T.R1, T.R1 + 18);
    out.push({ kind: 'circle', cx: F[0], cy: F[1], r: lerp(G.rr * U, G.rr * U * 3, 1 - Math.pow(2, -10 * u)), stroke: lime(.6 * Math.pow(1 - u, 1.5)), strokeWidth: lerp(2, .5, u) });
  }
  return out;
}

// =========================================================
// 2 · HALKALARDAN HARFLER (geometrik; birim = halka yarıçapı)
// =========================================================
type GeoLetter = { w: number; rings: { c: Pt; r: number; k: Pt }[]; stems: [Pt, Pt][] };
export const GEO: Record<string, GeoLetter> = {
  m: { w: 2.8, rings: [{ c: [.7, 1.3], r: .7, k: [0, 180] }, { c: [2.1, 1.3], r: .7, k: [0, 180] }], stems: [[[0, 2], [0, 0]], [[1.4, 1.3], [1.4, 0]], [[2.8, 1.3], [2.8, 0]]] },
  e: { w: 2, rings: [{ c: [1, 1], r: 1, k: [0, 315] }], stems: [[[0, 1], [2, 1]]] },
  r: { w: 1.1, rings: [{ c: [1, 1], r: 1, k: [90, 180] }], stems: [[[0, 2], [0, 0]]] },
  h: { w: 2, rings: [{ c: [1, 1], r: 1, k: [0, 180] }], stems: [[[0, 3.4], [0, 0]], [[2, 1], [2, 0]]] },
  a: { w: 2, rings: [{ c: [1, 1], r: 1, k: [0, 360] }], stems: [[[2, 2], [2, 0]]] },
  b: { w: 2, rings: [{ c: [1, 1], r: 1, k: [0, 360] }], stems: [[[0, 3.4], [0, 0]]] },
  l: { w: 0, rings: [{ c: [0, 1], r: .5, k: [270, 270] }], stems: [[[0, 0], [0, 3.4]]] },
  o: { w: 2, rings: [{ c: [1, 1], r: 1, k: [0, 360] }], stems: [] },
};
const GAP = .62;
export function geoLayout(word: string) {
  let x = 0; const xs: number[] = [];
  for (const ch of word) { xs.push(x); x += GEO[ch].w + GAP; }
  const dotX = x + .1, right = dotX + .45, unit = Math.min(30, 450 / right);
  return { xs, dotX, unit, ox: CX - right / 2 * unit };
}
export function geoTimeline(word: string) {
  const n = word.length, s = (i: number) => 4 + i * 5, done = s(n - 1) + 18, W = done + 2, P = W + 2 * n + 2;
  return { s, done, W, P, D0: P + 6, D1: P + 24, END: P + 26 };
}
// Canvas ellipse(cx, cy, rx, ry, 0, -a1, -a0) yayı (saat yönünde); 360°'de tam elips
function ellipseArcD(cx: number, cy: number, rx: number, ry: number, from: number, to: number) {
  const sweep = to - from, n = Math.max(1, Math.ceil(sweep / (Math.PI / 2)));
  const pt = (a: number) => `${cx + rx * Math.cos(a)} ${cy + ry * Math.sin(a)}`;
  if (sweep >= TAU) return `M${pt(0)}A${rx} ${ry} 0 1 1 ${pt(Math.PI)}A${rx} ${ry} 0 1 1 ${pt(0)}Z`;
  let d = `M${pt(from)}`;
  for (let i = 1; i <= n; i++) d += `A${rx} ${ry} 0 0 1 ${pt(from + sweep * i / n)}`;
  return d;
}
function drawGeo(f: number, WORD: string): Shape[] {
  const out: Shape[] = [];
  const Lg = geoLayout(WORD), T = geoTimeline(WORD), U = Lg.unit;
  const F: Pt = [Lg.ox + Lg.dotX * U, BASE_Y - .32 * U];
  // Eskizde dalış 90 kat yakınlaşmada biter; "merhaba"da nokta ekranı ancak ~92'de kaplıyordu.
  // Dalış en az noktanın ekranı tamamen kapladığı yere kadar sürer.
  const zEnd = Math.max(90, farCorner(F) / (.32 * U));
  let z = 1; if (f >= T.D0) z = Math.exp(easeInCubic(ramp(f, T.D0, T.D1)) * Math.log(zEnd));
  const toS = (x: number, y: number, oy = 0): Pt => [F[0] + (Lg.ox + x * U - F[0]) * z, F[1] + (BASE_Y - y * U + oy - F[1]) * z];
  const fadeW = 1 - ramp(z, 2, 7);
  [...WORD].forEach((ch, i) => {
    const L = GEO[ch], s0 = T.s(i), x0 = Lg.xs[i];
    if (f < s0) return;
    const drop = easeOutBack(ramp(f, s0, s0 + 8));
    const oy = -(1 - drop) * 420 - 7 * pulse(f, T.W + i * 2, 1, 3, 6) * 1;
    const land = f >= s0 + 8 ? .14 * Math.exp(-(f - s0 - 8) / 3) * Math.cos(.9 * (f - s0 - 8)) : 0;
    const un = easeInOutCubic(ramp(f, s0 + 7, s0 + 16));
    const stroke = white(fadeW), strokeWidth = Math.max(1, .17 * U * z);
    for (const R of L.rings) {
      const span = R.k[1] - R.k[0], miss = 360 - span;
      const a0 = lerp(R.k[0] - miss / 2, R.k[0], un), a1 = lerp(R.k[1] + miss / 2, R.k[1], un);
      if (a1 - a0 < .5) continue;
      const [cx, cy] = toS(x0 + R.c[0], R.c[1], oy);
      const rx = Math.max(.1, R.r * U * z * (1 + land * .6)), ry = Math.max(.1, R.r * U * z * (1 - land));
      out.push({ kind: 'path', d: ellipseArcD(cx, cy, rx, ry, -a1 * Math.PI / 180, -a0 * Math.PI / 180), stroke, strokeWidth });
    }
    const sg = easeOutCubic(ramp(f, s0 + 8, s0 + 18));
    if (sg > 0) for (const [p, q] of L.stems) {
      const [x1, y1] = toS(x0 + p[0], p[1], oy), [x2, y2] = toS(x0 + q[0], q[1], oy);
      out.push({ kind: 'path', d: `M${x1} ${y1}L${lerp(x1, x2, sg)} ${lerp(y1, y2, sg)}`, stroke, strokeWidth });
    }
  });
  // lime nokta. easeOutBack(0) kayan nokta artığıyla 0 yerine ~2e-16 veriyor; eskizde bu yüzden noktanın
  // küçük halkası ilk kareden itibaren görünüyordu ("ilk kare tamamen siyah" notuna aykırı). Nokta P'de belirir.
  const dp = easeOutBack(ramp(f, T.P, T.P + 7));
  if (f > T.P && dp > 0) {
    out.push({ kind: 'circle', cx: F[0], cy: F[1], r: Math.max(0, .32 * U * dp * z), fill: lime(1) });
    if (f < T.P + 18) { const u = ramp(f, T.P, T.P + 18); out.push({ kind: 'circle', cx: F[0], cy: F[1], r: lerp(8, 70, easeOutCubic(u)), stroke: lime(.55 * Math.pow(1 - u, 1.5)), strokeWidth: 1.5 }); }
    if (.32 * U * z > 1150) out.push({ kind: 'fill', color: lime(1) });
  }
  return out;
}

// ---------- zaman ----------
export function animEnd(v: AcilisVariant, word: string) { return v === 'hand' ? handTimeline(word).END : geoTimeline(word).END; }
// Videonun süresi (30 fps karesi); bundan sonrası uygulamanın ana ekranı
export function videoLen(v: AcilisVariant, word: string, short: boolean) { return animEnd(v, word) / (short ? SPEED_SHORT : 1); }

// drawScene: video zamanı t (30 fps karesi) → şekiller. Kısa versiyon aynı animasyonu 2.4 kat hızlı oynatır.
export function drawScene(t: number, v: AcilisVariant, word: string, short: boolean): Shape[] {
  const f = t * (short ? SPEED_SHORT : 1);
  return v === 'hand' ? drawHand(f, word) : drawGeo(f, word);
}

// Dalışın bittiği an (video zamanı); bundan sonra sahne sabit (el yazısında siyah, halkalarda lime)
export function diveEnd(v: AcilisVariant, word: string, short: boolean) {
  return (v === 'hand' ? handTimeline(word).D1 : geoTimeline(word).D1) / (short ? SPEED_SHORT : 1);
}

// Bir çıkış karesinin motion blur örnekleri (HTML: max(0, t - .8·i/9)). Dalış bittikten sonraki karelerde örnekler
// dalışın öncesine uzanmaz; aksi halde kısa versiyonda son kare tam lime olmuyordu.
export const acilisSamples = (t: number, blur: boolean, v: AcilisVariant, word: string, short: boolean) => {
  const end = diveEnd(v, word, short);
  return (blur ? blurSampleFrames(t) : [t]).map((x) => Math.max(0, t >= end ? Math.max(end, x) : x));
};
