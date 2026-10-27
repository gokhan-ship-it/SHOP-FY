import React from 'react';
import { clamp, easeInOutCubic, lerp, ramp } from '../anim';
import { CX, CY, DEPTH, FILL1, IMPACT, R, RB, S, echo, lockState, shackleGeo, white, type KilitFx, type LockState } from './anim';

// HTML'deki drawScene/drawLock: tek bir kare, şeffaf arka plan, saf (aynı girdi → aynı SVG).
// `id` aynı sayfadaki örneklerin gradient/clip id'lerinin çakışmasını önler.

const rad2deg = (a: number) => (a * 180) / Math.PI;
const poly = (pts: [number, number][], dx = 0) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x + dx} ${y}`).join('');

// gövde (3B kalınlık)
const Body: React.FC<{ st: LockState; id: string }> = ({ st, id }) => {
  if (st.depth < .5) return null;
  const s = Math.sin(st.yaw), c = Math.abs(Math.cos(st.yaw));
  const fx = st.cx + s * st.depth / 2, bx = st.cx - s * st.depth / 2;
  const rx = st.rad * c * st.sx, ry = st.rad * st.sy, a = clamp(st.depth / DEPTH);
  const edge = white(.3 * a);
  return (
    <g>
      <ellipse cx={bx} cy={st.cy} rx={rx} ry={ry} fill="#4c5913" stroke={edge} strokeWidth={1.4} />
      {fx !== bx && (
        <>
          <defs>
            <linearGradient id={`${id}side`} gradientUnits="userSpaceOnUse" x1={bx} y1={0} x2={fx} y2={0}>
              <stop offset="0" stopColor="#4c5913" />
              <stop offset="1" stopColor="#9db234" />
            </linearGradient>
          </defs>
          <rect x={Math.min(bx, fx)} y={st.cy - ry} width={Math.abs(fx - bx)} height={2 * ry} fill={`url(#${id}side)`} />
        </>
      )}
      <path d={`M${bx} ${st.cy - ry}L${fx} ${st.cy - ry}M${bx} ${st.cy + ry}L${fx} ${st.cy + ry}`} fill="none" stroke={edge} strokeWidth={1.4} />
    </g>
  );
};

// kilit halkası
const Shackle: React.FC<{ st: LockState; id: string }> = ({ st, id }) => {
  if (st.shQ <= 0 || st.shA <= 0) return null;
  const r = st.rad, G = shackleGeo(r), c = Math.cos(st.yaw), M = 70, w = 20;
  const map = ([x, y]: [number, number]): [number, number] => [st.cx + x * c, st.cy + y - st.shO];
  const segs: [number, number][][] = [];
  if (st.shQ < 1) {
    const L: [number, number][] = [], Rr: [number, number][] = [];
    for (let i = 0; i <= M; i++) { L.push(map(G.U(st.shQ * G.sTop * i / M))); Rr.push(map(G.U(G.T - st.shQ * (G.T - G.sTop) * i / M))); }
    segs.push(L, Rr);
  } else { const pts: [number, number][] = []; for (let i = 0; i <= M * 2; i++) pts.push(map(G.U(G.T * i / (M * 2)))); segs.push(pts); }
  const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', opacity: st.shA } as const;
  return (
    <g>
      <defs>
        <linearGradient id={`${id}sh`} gradientUnits="userSpaceOnUse" x1={0} y1={st.cy + G.top - st.shO} x2={0} y2={st.cy + G.bot - st.shO}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9b9b9" />
        </linearGradient>
      </defs>
      {segs.map((p, i) => <path key={`o${i}`} d={poly(p)} stroke="rgba(28,28,28,1)" strokeWidth={w + 4} {...line} />)}
      {segs.map((p, i) => <path key={`m${i}`} d={poly(p)} stroke={`url(#${id}sh)`} strokeWidth={w} {...line} />)}
      {segs.map((p, i) => <path key={`h${i}`} d={poly(p, -w * .2 * c)} stroke={white(.9)} strokeWidth={w * .28} {...line} />)}
    </g>
  );
};

// ön yüz: dolum, anahtar deliği, flaş, parlama, dış çizgi
const Face: React.FC<{ f: number; st: LockState; id: string }> = ({ f, st, id }) => {
  const r = st.rad;
  let fill: React.ReactNode = null;
  if (st.level > 0) {
    if (st.level < 1 || st.wave > 0) {
      const lvl = lerp(r + 10, -r - 14, st.level), amp = 9 * st.wave, tilt = .14 * Math.sin(f * .18) * st.wave;
      let d = `M${-r - 2} ${r + 2}`;
      for (let x = -r - 2; x <= r + 2; x += 6) d += `L${x} ${lvl + amp * (.6 * Math.sin(x * .035 + f * .35) + .4 * Math.sin(x * .062 - f * .22)) + tilt * x}`;
      d += `L${r + 2} ${r + 2}Z`;
      fill = <path d={d} fill={`url(#${id}lime)`} />;
    } else fill = <rect x={-r} y={-r} width={2 * r} height={2 * r} fill={`url(#${id}lime)`} />;
  }

  let sheen: React.ReactNode = null;
  if (st.idle) {
    const u = ramp(st.sheen, .12, .5);
    if (u > 0 && u < 1) {
      const x = lerp(-1.6 * r, 1.6 * r, easeInOutCubic(u)), a = .35 * Math.sin(Math.PI * u);
      sheen = (
        <g transform={`rotate(${rad2deg(-.45)})`}>
          <defs>
            <linearGradient id={`${id}sheen`} gradientUnits="userSpaceOnUse" x1={x - 36} y1={0} x2={x + 36} y2={0}>
              <stop offset="0" stopColor="#ffffff" stopOpacity={0} />
              <stop offset=".5" stopColor="#ffffff" stopOpacity={a} />
              <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <rect x={x - 36} y={-2 * r} width={72} height={4 * r} fill={`url(#${id}sheen)`} />
        </g>
      );
    }
  }

  // HTML: gap < .001 ise tam daire, yoksa üstte boşluklu yay (iki yarım yay olarak çizilir)
  const outline = { fill: 'none', stroke: white(.95), strokeWidth: 2.6, strokeLinecap: 'round' } as const;
  let ring: React.ReactNode;
  if (st.gap < .001) ring = <circle cx={0} cy={0} r={r} {...outline} />;
  else {
    const a0 = -Math.PI / 2 + st.gap, a1 = -Math.PI / 2 - st.gap + Math.PI * 2, am = (a0 + a1) / 2;
    const pt = (a: number) => `${r * Math.cos(a)} ${r * Math.sin(a)}`;
    ring = <path d={`M${pt(a0)}A${r} ${r} 0 0 1 ${pt(am)}A${r} ${r} 0 0 1 ${pt(a1)}`} {...outline} />;
  }

  return (
    <g transform={`translate(${st.cx + Math.sin(st.yaw) * st.depth / 2} ${st.cy}) scale(${Math.cos(st.yaw) * st.sx} ${st.sy})`}>
      <defs>
        <clipPath id={`${id}clip`}><circle cx={0} cy={0} r={r} /></clipPath>
        <linearGradient id={`${id}lime`} gradientUnits="userSpaceOnUse" x1={-r} y1={-r} x2={r} y2={r}>
          <stop offset="0" stopColor="#ECFF8C" />
          <stop offset=".45" stopColor="#DEFE52" />
          <stop offset="1" stopColor="#C9E644" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}clip)`}>
        {fill}
        {st.kp > .01 && (
          <g transform={`translate(0 ${.05 * r}) rotate(${rad2deg(st.krot)}) translate(0 ${-.05 * r}) scale(${st.kp} ${st.kp})`} fill="#0b0b0b">
            <circle cx={0} cy={-.12 * r} r={.15 * r} />
            <path d={`M${-.065 * r} ${-.06 * r}L${.065 * r} ${-.06 * r}L${.11 * r} ${.3 * r}L${-.11 * r} ${.3 * r}Z`} />
          </g>
        )}
        {st.flash > 0 && <rect x={-r} y={-r} width={2 * r} height={2 * r} fill={white(st.flash)} />}
        {sheen}
      </g>
      {ring}
    </g>
  );
};

export const KilitSvg: React.FC<{ f: number; fx: KilitFx; id: string }> = ({ f, fx, id }) => {
  const st = lockState(f);
  const rings = [echo(f, FILL1, CX, CY, R, fx), echo(f, IMPACT, st.cx, st.cy, RB * 1.05, fx)];
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      {rings.map((e, i) => e && <circle key={i} cx={e.cx} cy={e.cy} r={e.r} fill="none" stroke={e.stroke} strokeWidth={e.strokeWidth} />)}
      <Body st={st} id={id} />
      <Shackle st={st} id={id} />
      <Face f={f} st={st} id={id} />
    </svg>
  );
};
