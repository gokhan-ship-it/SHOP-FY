// eslesme-animasyon-v2.html içindeki çizim mantığının birebir aktarımı.
// Tüm fonksiyonlar kare numarasına bağlı ve saf; zamanlamalar, easing'ler ve yay değerleri değiştirilmedi.

export const FPS = 30, TOTAL = 120, S = 800, CX = 400, CY = 400, R = 150, TAU = Math.PI * 2, N = 200, I = 30;
// Video çıkışı: tasarım 30 fps karelerinde tanımlı, 60 fps'te yarım karelik adımlarla çizilir
export const OUT_FPS = 60, OUT_TOTAL = (TOTAL * OUT_FPS) / FPS;
// Loop doğrudan hazırlık hareketiyle başlasın diye iç zaman çizelgesi 15 kare kaydırıldı
export const OFF = 15;
// Negatif kareleri de (motion blur örnekleri) HTML'deki gibi döngüye sarar
export const shift = (f: number) => (((f + OFF) % TOTAL) + TOTAL) % TOTAL;
// Remotion karesini tek tura indirger. 1e-6 kare hassasiyetine yuvarlama, kesirli blur örneklerinde
// f ile f + TOTAL'in kayan nokta artıkları yüzünden farklı sonuç vermesini önler (görsel fark yok).
export const loopFrame = (f: number) => Math.round(((((f % TOTAL) + TOTAL) % TOTAL) * 1e6)) / 1e6 % TOTAL;
export const LIME = [222, 254, 82] as const;
export const lime = (a: number) => `rgba(${LIME[0]},${LIME[1]},${LIME[2]},${a})`;

export type Variant = 'A' | 'B';
export type Fx = { blur: boolean; jelly: boolean; burst: boolean; echo: boolean; bloom: boolean };

// ---------- yardımcılar ----------
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeInOutCubic = (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
export const easeInOutQuint = (t: number) => (t < .5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2);
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export function pulse(f: number, t0: number, amp: number, att = 3, dec = 11) {
  if (f < t0) return 0;
  const d = f - t0;
  if (d < att) return amp * easeOutCubic(d / att);
  if (d > att + dec * 2) return 0;
  return amp * Math.exp(-(d - att) / (dec / 3));
}

// ---------- hareket durumu (kareye bağlı, saf fonksiyon) ----------
export function state(f: number, VAR: Variant, FX: Fx) {
  const H0 = .49, fade = 1 - ramp(f, 110, 117);
  let h = H0, rot = 0;

  if (VAR === 'A') {
    if (f >= 15 && f < 24) h = lerp(H0, .57, easeOutCubic(ramp(f, 15, 24)));
    else if (f >= 24 && f < I) h = lerp(.57, .36, easeInCubic(ramp(f, 24, I)));
  } else {
    if (f >= 15 && f < 19) { const t = easeOutCubic(ramp(f, 15, 19)); h = lerp(H0, .52, t); rot = -.17 * t; }
    else if (f >= 19 && f < I) h = f < 24 ? lerp(.52, .50, ramp(f, 19, 24)) : lerp(.50, .36, easeInCubic(ramp(f, 24, I)));
    if (f >= 19 && f < 28) rot = lerp(-.17, Math.PI + .1, easeInOutQuint(ramp(f, 19, 28)));
    else if (f >= 28) rot = Math.PI + .1 * Math.exp(-(f - 28) / 3) * Math.cos((f - 28) * .8);
  }
  if (f >= I && f < 90) { const t = f - I; h = .40 - .04 * Math.exp(-t / 3) * Math.cos(t * .8); }
  if (f >= 90) { const t = f - 90; h = .49 - .09 * Math.exp(-t / 5) * Math.cos(.42 * t) * fade; }

  // ezilme-esneme
  let st = 0, q = 0;
  if (f >= I - 6 && f < I) st = .08 * easeInCubic(ramp(f, I - 6, I));
  if (f >= I && f < I + 24) { const t = f - I; q = .12 * Math.exp(-t / 4) * Math.cos(t * .85); }
  const bop = pulse(f, 0, .025, 2, 6) + pulse(f, 105, .025, 2, 6);
  const sx = (1 + st - q) * (1 + bop), sy = (1 - st * .5 + q * .8) * (1 + bop);

  // lens → kalp
  let m = 0;
  if (f >= 35 && f < 90) m = easeOutQuart(ramp(f, 35, 44));
  else if (f >= 90) m = 1 - easeOutQuart(ramp(f, 90, 99));

  // halkaların kalbe çekilmesi
  let c = 0;
  if (f >= 35 && f < 90) c = easeInCubic(ramp(f, 35, 43));
  else if (f >= 90) { const t = f - 90; c = Math.exp(-t / 4.5) * Math.cos(.42 * t) * fade; }

  // kalp pop + yana yatma
  let ss = 1, hr = 0;
  if (f >= 35 && f < 84) { const t = f - 35; ss = 1 + .2 * Math.exp(-t / 7) * Math.sin(.45 * t); hr = (VAR === 'A' ? -1 : 1) * .16 * Math.exp(-t / 6) * Math.sin(.5 * t); }
  else if (f >= 84 && f < 90) { const t = easeInOutCubic(ramp(f, 84, 90)); ss = lerp(1, .86, t); hr = -.07 * t; }
  else if (f >= 90) { const t = f - 90; ss = 1 - .14 * Math.exp(-t / 5) * Math.cos(.5 * t) * fade; hr = -.07 * Math.exp(-t / 4) * Math.cos(.6 * t) * fade; }

  // jöle
  let j = 0;
  if (FX.jelly) for (const [t0, a] of [[I, .035], [35, .04], [90, .03]]) {
    if (f < t0 || f >= t0 + 30) continue;
    const t = f - t0; j += a * Math.exp(-t / 5) * Math.sin(.75 * t) * (t0 === 90 ? fade : 1);
  }

  const b = pulse(f, 60, .10) + pulse(f, 67, .05);
  let rd = rot; while (rd > Math.PI / 2) rd -= Math.PI; while (rd < -Math.PI / 2) rd += Math.PI;
  return { h, rot: rd + hr, sx, sy, m, c, ss, b, j };
}
export type State = ReturnType<typeof state>;

// ---------- geometri ----------
export function lensPt(s: number, h: number): [number, number] {
  const g = Math.atan2(Math.sqrt(Math.max(0, R * R - h * h)), h);
  if (s < .5) { const phi = Math.PI + g - 2 * g * (s / .5); return [h + R * Math.cos(phi), R * Math.sin(phi)]; }
  const phi = g - 2 * g * ((s - .5) / .5); return [-h + R * Math.cos(phi), R * Math.sin(phi)];
}
export function heartPt(s: number): [number, number] {
  const t = Math.PI + TAU * s, k = R / 16;
  return [16 * Math.pow(Math.sin(t), 3) * k,
    (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5) * k];
}
export function localPt(s: number, h: number, m: number, kx: number, ky: number, j: number): [number, number] {
  s = s - Math.floor(s);
  const a = lensPt(s, h), b = heartPt(s);
  let x = lerp(a[0], b[0], m), y = -lerp(a[1], b[1], m);
  if (j) { const w = 1 + j * Math.cos(4 * Math.atan2(y, x)); x *= w; y *= w; }
  return [x * kx, y * ky];
}
// Canvas'taki path() ile aynı örnekleme: N+1 nokta, moveTo/lineTo, closePath
export function pathD(h: number, m: number, kx: number, ky: number, j = 0) {
  let d = '';
  for (let i = 0; i <= N; i++) {
    const [x, y] = localPt(i / N, h, m, kx, ky, j);
    d += `${i ? 'L' : 'M'}${x.toFixed(3)} ${y.toFixed(3)}`;
  }
  return d + 'Z';
}

// ---------- sahne tanımı (drawScene) ----------
// Canvas çağrılarını, SVG olarak çizilecek saf bir şekil listesine çevirir.
export type Shape =
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { kind: 'path'; d: string; fill?: string; stroke?: string; strokeWidth?: number };

export type SceneDesc = {
  world: Shape[]; // dönüşümsüz (eşleşme halkası)
  transform: { rot: number; sx: number; sy: number };
  local: Shape[]; // translate(CX,CY) rotate scale altında
};

export function drawScene(frame: number, VAR: Variant, FX: Fx): SceneDesc {
  const f = shift(frame);
  const s = state(f, VAR, FX), hp = s.h * R;
  const world: Shape[] = [], local: Shape[] = [];

  // eşleşme anı halkası
  if (FX.echo && f >= I && f < I + 18) {
    const t = ramp(f, I, I + 18);
    world.push({ kind: 'circle', cx: CX, cy: CY, r: lerp(.55 * R, 2.5 * R, easeOutExpo(t)),
      stroke: `rgba(255,255,255,${.6 * Math.pow(1 - t, 1.5)})`, strokeWidth: lerp(2, .5, t) });
  }

  const kx = s.ss * (1 + .75 * s.b), ky = s.ss * (1 + 1.1 * s.b);

  // kalp yankıları (atışlarda)
  if (FX.echo) for (const [b0, amp] of [[60, .85], [67, .45]]) {
    if (f < b0 || f >= b0 + 20) continue;
    const t = ramp(f, b0, b0 + 20), e = 1 + .7 * easeOutCubic(t);
    local.push({ kind: 'path', d: pathD(hp, 1, s.ss * e, s.ss * e), stroke: lime(amp * Math.pow(1 - t, 1.6)), strokeWidth: 2 / e });
  }

  // dolgu
  local.push({ kind: 'path', d: pathD(hp, s.m, kx, ky, s.j), fill: lime(1) });

  // halkalar
  const ra = clamp((1 - s.c) / .5);
  if (ra > .01) {
    const cc = clamp(s.c, -1, 1), cp = clamp(cc), rs = lerp(1, s.ss, cp);
    for (const side of [-1, 1]) {
      local.push({ kind: 'circle', cx: side * lerp(hp, .5 * R, cc) * rs, cy: -lerp(0, .41 * R, cc) * rs,
        r: Math.max(1, lerp(R, .5 * R, cc) * rs), stroke: `rgba(255,255,255,${ra})`, strokeWidth: lerp(2.6, 1.2, cp) });
    }
  }

  // pop parçacıkları
  if (FX.burst && f >= 36 && f < 52) {
    const t = easeOutCubic(ramp(f, 36, 52));
    for (let i = 0; i < 8; i++) {
      const [x, y] = localPt((i + .5) / 8, hp, 1, 1, 1, 0);
      const len = Math.hypot(x, y) || 1, d = 1.08 + .45 * t;
      local.push({ kind: 'circle', cx: x * d + x / len * 8, cy: y * d + y / len * 8, r: Math.max(.1, 6 * (1 - t)),
        fill: i % 2 ? `rgba(255,255,255,${1 - t})` : lime(1 - t) });
    }
  }

  return { world, transform: { rot: s.rot, sx: s.sx, sy: s.sy }, local };
}
