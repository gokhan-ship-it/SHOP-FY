// Kalp tüneli (kapsul-acilis-kalp-tuneli.html'deki drawTunnel/cz/beatPulse): couple ve single açılışın ortak parçası.
// Kalp halkaları, halkaların kıvrılması, uçtaki lime kalp, merkezdeki ışık, ritim nabzı, kamera ve çıkıştaki hızlanma.
// Tüm fonksiyonlar kareye bağlı ve saf; zamanlamalar, easing'ler ve değerler eskizdekiyle aynı.
import { clamp, ramp } from '../anim';
import { W0, H0, type TShape } from './shapes';

export const CX = 270, CY = 470, TAU = Math.PI * 2;
export const P = 15, EXIT = 24; // bir vuruş (120 BPM, 30 fps karesi) ve çıkış süresi
export const FOC = 500, WR = 100, SP = 220, NEAR = 40, FAR = 2600, V = SP / P, Z0 = SP / 2;
export const Z_E0 = WR * FOC / 6, AEX = (Z_E0 - 30 - V * 18) / Math.pow(18, 3);
export const LIME = [222, 254, 82] as const;
export const lime = (a: number) => `rgba(${LIME[0]},${LIME[1]},${LIME[2]},${a})`;
export const white = (a: number) => `rgba(255,255,255,${a})`;
export const LIME_RGB = `rgb(${LIME[0]},${LIME[1]},${LIME[2]})`;

// Tünele giren sahnenin ayarları: tünel `intro` karesinde seyir haline geçer; dalış `dive0`da başlar;
// `heroR` dalınan kahraman kalbin yarıçapı (couple 95, single 105).
export type TunnelCfg = { intro: number; dive0: number; heroR: number };
export const zHero = (c: TunnelCfg) => WR * FOC / c.heroR;
const diveDist = (c: TunnelCfg) => zHero(c) + 120;

// kamera derinliği; te: çıkışın başladığı kare
export function cz(t: number, te: number, c: TunnelCfg) {
  const D = diveDist(c);
  if (t < c.dive0) return -D;
  if (t < c.intro) {
    const u = (t - c.dive0) / (c.intro - c.dive0), mm = V * (c.intro - c.dive0) / D;
    return -D + D * ((-2 * u * u * u + 3 * u * u) + (u * u * u - u * u) * mm);
  }
  if (t < te) return V * (t - c.intro);
  const tau = t - te;
  return V * (te - c.intro) + V * tau + AEX * tau * tau * tau;
}
export function beatPulse(t: number, c: TunnelCfg) {
  const ph = (((t - c.intro) % P) + P) % P;
  return ph < 2 ? ph / 2 : Math.exp(-(ph - 2) / 3);
}

// birim kalp (s: 0…1 çevre boyunca), yarı genişliği 1
export function heartUnit(s: number): [number, number] {
  const a = Math.PI + TAU * s;
  return [Math.pow(Math.sin(a), 3), -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a) + 2.5) / 16];
}
const HU: [number, number][] = [];
for (let i = 0; i <= 120; i++) HU.push(heartUnit(i / 120));
export function heartD(x0: number, y0: number, rho: number, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return HU.map(([x, y], i) => { const X = x * rho, Y = y * rho; return `${i ? 'L' : 'M'}${x0 + X * c - Y * s} ${y0 + X * s + Y * c}`; }).join('') + 'Z';
}

export type Tunnel = {
  back: TShape[]; // ışık, uçtaki lime kalp, halkalar
  hero: { persp: number; na: number } | null; // dalınan kahraman kalbin perspektifi ve görünürlüğü (sahne çizer)
  front: TShape[]; // çıkışta ekranı kaplayan lime
};

export function tunnel(t: number, te: number, c: TunnelCfg): Tunnel {
  const camz = cz(t, te, c);
  const tunA = ramp(t, c.dive0 + 2, c.dive0 + 12);
  const bp = beatPulse(t, c);
  const inExit = t >= te;
  const back: TShape[] = [], front: TShape[] = [];

  // uç: tünelin sonundaki lime kalp
  let zE = Infinity, rhoE = 6 * (1 + .4 * bp);
  if (inExit) { zE = Z_E0 - (camz - cz(te, te, c)); rhoE = WR * FOC / Math.max(1, zE); }
  const endA = ramp(t, c.dive0 + 4, c.dive0 + 12);
  const glowR = Math.min(900, 70 + rhoE * 1.6);
  // Eskizde çıkış başlar başlamaz ışık şiddeti tek karede tepeye (1) çıkıyordu (.22 → .40), döngüden çıkışa geçişte
  // atlama yapıyordu. Çıkış bir vuruş başında başladığı için ilk 2 karede normal vuruşun yükselişini izler, sonra tepede kalır.
  const glowK = inExit ? (t - te < 2 ? bp : 1) : bp;
  back.push({ kind: 'glow', cx: CX, cy: CY, r: glowR, color: LIME_RGB, alpha: (.22 + .18 * glowK) * endA });
  if (endA > 0) back.push({ kind: 'fill', d: heartD(CX, CY, rhoE), fill: lime(endA) });

  // halkalar (uzaktan yakına)
  if (tunA > 0) {
    const iMin = Math.ceil((camz + NEAR - Z0) / SP), iMax = Math.floor((camz + FAR - Z0) / SP);
    for (let i = iMax; i >= iMin; i--) {
      const z = i * SP + Z0 - camz;
      if (z >= zE) continue;
      const rho = WR * FOC / z;
      const a = clamp((FAR - z) / 800) * clamp((z - NEAR) / 120) * tunA * (.72 + .28 * bp);
      if (a <= .005) continue;
      back.push({ kind: 'stroke', d: heartD(CX, CY, rho, .2 * Math.sin(z * .0024)), stroke: white(a), width: clamp(3.4 * FOC / z, .6, 16), round: true });
    }
  }

  // kahraman kalp (girişten gelen) tünele dalarken
  let hero: Tunnel['hero'] = null;
  if (t < c.intro) {
    const zr = zHero(c) - (camz - cz(c.dive0, te, c));
    if (zr > NEAR * .5) hero = { persp: zHero(c) / zr, na: clamp((zr - NEAR) / 120) };
  }

  // çıkışta ekranı lime kaplar
  if (inExit) {
    const cover = zE < NEAR ? 1 : ramp(rhoE, 420, 1000);
    if (cover > 0) front.push({ kind: 'rect', fill: lime(cover) });
  }
  return { back, hero, front };
}

export { W0, H0 };
