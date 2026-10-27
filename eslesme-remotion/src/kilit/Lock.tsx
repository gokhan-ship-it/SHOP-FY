import React from 'react';
import { clamp, easeInOutCubic, easeOutCubic, lerp, ramp } from '../anim';
import { DEPTH, lime, shackleGeo, white } from './anim';

// Tekrar kullanılabilir kilit (single-kilit-final.html'deki drawBody/drawShackle/drawFace/drawLock).
// Koordinatlar çağıran sahnenin viewBox'ındadır; açılış ve bekleme ekranı videoları da bunu kullanır.
export type LockProps = {
  f: number; // yüzeydeki dalganın zamanı (kare)
  id: string; // gradient/clip id'leri için benzersiz önek
  cx: number; cy: number; // merkez
  rad: number; // yarıçap
  depth: number; // derinlik (3B kalınlık)
  yaw: number; // dönüş açısı (radyan)
  sx: number; sy: number; // x/y esneme
  shO: number; // kulp yüksekliği
  shQ: number; // kulp çizim ilerlemesi (0…1)
  shA: number; // kulp şeffaflığı
  gap: number; // halkadaki açıklık açısı (radyan, tepede)
  kp: number; krot: number; // anahtar deliği ölçeği ve dönüş açısı
  keyLime: number; // anahtar deliğinin lime yanması (0 kapalı)
  ripple: number; // yüzeydeki dalga halkasının ilerlemesi (0…1, <0 kapalı)
  flash: number; // parlama
  level: number; // dolgu seviyesi (0…1)
  wave: number; // dalga şiddeti
  sheen: number | null; // ışık yansımasının ilerlemesi (null kapalı)
  look?: Partial<LockLook>;
};

// Eskizler arasında farklı olan çizim ölçüleri; varsayılanlar single-kilit-final.html'deki değerler
export type LockLook = {
  maxDepth: number; // gövde çizgilerinin tam görünür olduğu derinlik
  shackleWidth: number;
  sheenWidth: number; // ışık yansımasının yarı genişliği
  fadeBody: boolean; // arka elips derinlikle birlikte saydamlaşsın mı
};
const LOOK: LockLook = { maxDepth: DEPTH, shackleWidth: 20, sheenWidth: 36, fadeBody: false };

const rad2deg = (a: number) => (a * 180) / Math.PI;
const poly = (pts: [number, number][], dx = 0) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x + dx} ${y}`).join('');

// gövde: arka elips + yan yüzey
const Body: React.FC<{ p: LockProps; look: LockLook }> = ({ p, look }) => {
  if (p.depth < .5) return null;
  const s = Math.sin(p.yaw), c = Math.abs(Math.cos(p.yaw));
  const fx = p.cx + s * p.depth / 2, bx = p.cx - s * p.depth / 2;
  const rx = p.rad * c * p.sx, ry = p.rad * p.sy, a = clamp(p.depth / look.maxDepth);
  const edge = white(.3 * a);
  return (
    <g>
      <ellipse cx={bx} cy={p.cy} rx={rx} ry={ry} fill={look.fadeBody ? `rgba(76,89,19,${a})` : '#4c5913'} stroke={edge} strokeWidth={1.4} />
      {fx !== bx && (
        <>
          <defs>
            <linearGradient id={`${p.id}side`} gradientUnits="userSpaceOnUse" x1={bx} y1={0} x2={fx} y2={0}>
              <stop offset="0" stopColor="#4c5913" />
              <stop offset="1" stopColor="#9db234" />
            </linearGradient>
          </defs>
          <rect x={Math.min(bx, fx)} y={p.cy - ry} width={Math.abs(fx - bx)} height={2 * ry} fill={`url(#${p.id}side)`} />
        </>
      )}
      <path d={`M${bx} ${p.cy - ry}L${fx} ${p.cy - ry}M${bx} ${p.cy + ry}L${fx} ${p.cy + ry}`} fill="none" stroke={edge} strokeWidth={1.4} />
    </g>
  );
};

// kulp: iki yandan çizilip tepede birleşir
const Shackle: React.FC<{ p: LockProps; look: LockLook }> = ({ p, look }) => {
  if (p.shQ <= 0 || p.shA <= 0) return null;
  const r = p.rad, G = shackleGeo(r), c = Math.cos(p.yaw), M = 70, w = look.shackleWidth;
  const map = ([x, y]: [number, number]): [number, number] => [p.cx + x * c, p.cy + y - p.shO];
  const segs: [number, number][][] = [];
  if (p.shQ < 1) {
    const L: [number, number][] = [], Rr: [number, number][] = [];
    for (let i = 0; i <= M; i++) { L.push(map(G.U(p.shQ * G.sTop * i / M))); Rr.push(map(G.U(G.T - p.shQ * (G.T - G.sTop) * i / M))); }
    segs.push(L, Rr);
  } else { const pts: [number, number][] = []; for (let i = 0; i <= M * 2; i++) pts.push(map(G.U(G.T * i / (M * 2)))); segs.push(pts); }
  const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', opacity: p.shA } as const;
  return (
    <g>
      <defs>
        <linearGradient id={`${p.id}sh`} gradientUnits="userSpaceOnUse" x1={0} y1={p.cy + G.top - p.shO} x2={0} y2={p.cy + G.bot - p.shO}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9b9b9" />
        </linearGradient>
      </defs>
      {segs.map((s, i) => <path key={`o${i}`} d={poly(s)} stroke="rgba(28,28,28,1)" strokeWidth={w + 4} {...line} />)}
      {segs.map((s, i) => <path key={`m${i}`} d={poly(s)} stroke={`url(#${p.id}sh)`} strokeWidth={w} {...line} />)}
      {segs.map((s, i) => <path key={`h${i}`} d={poly(s, -w * .2 * c)} stroke={white(.9)} strokeWidth={w * .28} {...line} />)}
    </g>
  );
};

const keyholeD = (r: number) => `M${-.065 * r} ${-.06 * r}L${.065 * r} ${-.06 * r}L${.11 * r} ${.3 * r}L${-.11 * r} ${.3 * r}Z`;

// ön yüz: dolum, dalga halkası, anahtar deliği, parlama, ışık yansıması, kenar
const Face: React.FC<{ p: LockProps; look: LockLook }> = ({ p, look }) => {
  const r = p.rad, f = p.f;
  let fill: React.ReactNode = null;
  if (p.level > 0) {
    if (p.level < 1 || p.wave > 0) {
      const lvl = lerp(r + 10, -r - 14, p.level), amp = 9 * p.wave, tilt = .14 * Math.sin(f * .18) * p.wave;
      let d = `M${-r - 2} ${r + 2}`;
      for (let x = -r - 2; x <= r + 2; x += 6) d += `L${x} ${lvl + amp * (.6 * Math.sin(x * .035 + f * .35) + .4 * Math.sin(x * .062 - f * .22)) + tilt * x}`;
      d += `L${r + 2} ${r + 2}Z`;
      fill = <path d={d} fill={`url(#${p.id}lime)`} />;
    } else fill = <rect x={-r} y={-r} width={2 * r} height={2 * r} fill={`url(#${p.id}lime)`} />;
  }

  const ripple = p.ripple >= 0 && p.ripple < 1 && (
    <circle cx={0} cy={-.05 * r} r={lerp(12, r * 1.05, easeOutCubic(p.ripple))} fill="none" stroke={white(.55 * (1 - p.ripple))} strokeWidth={2} />
  );

  const keyT = `translate(0 ${.05 * r}) rotate(${rad2deg(p.krot)}) translate(0 ${-.05 * r}) scale(${p.kp} ${p.kp})`;
  const key = (color: string) => (
    <g transform={keyT} fill={color}>
      <circle cx={0} cy={-.12 * r} r={.15 * r} />
      <path d={keyholeD(r)} />
    </g>
  );

  let sheen: React.ReactNode = null;
  if (p.sheen !== null) {
    const u = ramp(p.sheen, .12, .5), hw = look.sheenWidth;
    if (u > 0 && u < 1) {
      const x = lerp(-1.6 * r, 1.6 * r, easeInOutCubic(u)), a = .35 * Math.sin(Math.PI * u);
      sheen = (
        <g transform={`rotate(${rad2deg(-.45)})`}>
          <defs>
            <linearGradient id={`${p.id}sheen`} gradientUnits="userSpaceOnUse" x1={x - hw} y1={0} x2={x + hw} y2={0}>
              <stop offset="0" stopColor="#ffffff" stopOpacity={0} />
              <stop offset=".5" stopColor="#ffffff" stopOpacity={a} />
              <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <rect x={x - hw} y={-2 * r} width={2 * hw} height={4 * r} fill={`url(#${p.id}sheen)`} />
        </g>
      );
    }
  }

  // gap < .001 ise tam daire, yoksa tepesi açık yay (iki yarım yay olarak çizilir)
  const outline = { fill: 'none', stroke: white(.95), strokeWidth: 2.6, strokeLinecap: 'round' } as const;
  let ring: React.ReactNode;
  if (p.gap < .001) ring = <circle cx={0} cy={0} r={r} {...outline} />;
  else {
    const a0 = -Math.PI / 2 + p.gap, a1 = -Math.PI / 2 - p.gap + Math.PI * 2, am = (a0 + a1) / 2;
    const pt = (a: number) => `${r * Math.cos(a)} ${r * Math.sin(a)}`;
    ring = <path d={`M${pt(a0)}A${r} ${r} 0 0 1 ${pt(am)}A${r} ${r} 0 0 1 ${pt(a1)}`} {...outline} />;
  }

  return (
    <g transform={`translate(${p.cx + Math.sin(p.yaw) * p.depth / 2} ${p.cy}) scale(${Math.cos(p.yaw) * p.sx} ${p.sy})`}>
      <defs>
        <clipPath id={`${p.id}clip`}><circle cx={0} cy={0} r={r} /></clipPath>
        <linearGradient id={`${p.id}lime`} gradientUnits="userSpaceOnUse" x1={-r} y1={-r} x2={r} y2={r}>
          <stop offset="0" stopColor="#ECFF8C" />
          <stop offset=".45" stopColor="#DEFE52" />
          <stop offset="1" stopColor="#C9E644" />
        </linearGradient>
        {p.keyLime > 0 && (
          <radialGradient id={`${p.id}kglow`} gradientUnits="userSpaceOnUse" cx={0} cy={-.05 * r} r={r * .6}>
            <stop offset="0" stopColor="#ffffff" stopOpacity={.35 * p.keyLime} />
            <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </radialGradient>
        )}
      </defs>
      <g clipPath={`url(#${p.id}clip)`}>
        {fill}
        {ripple}
        {p.kp > .01 && key('#0b0b0b')}
        {p.keyLime > 0 && (
          <>
            <rect x={-r} y={-r} width={2 * r} height={2 * r} fill={`url(#${p.id}kglow)`} />
            {key(lime(p.keyLime))}
          </>
        )}
        {p.flash > 0 && <rect x={-r} y={-r} width={2 * r} height={2 * r} fill={white(p.flash)} />}
        {sheen}
      </g>
      {ring}
    </g>
  );
};

export const Lock: React.FC<LockProps> = (p) => {
  const look = { ...LOOK, ...p.look };
  return (
    <g>
      <Body p={p} look={look} />
      <Shackle p={p} look={look} />
      <Face p={p} look={look} />
    </g>
  );
};
