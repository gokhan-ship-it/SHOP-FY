import React from 'react';
import { H0, LIME, W0, drawScene, type AcilisVariant, type Shape } from './anim';

// Tek bir anın sahnesi: şeffaf arka plan, saf (aynı girdi → aynı SVG). Çizgiler yuvarlak uçlu (HTML: lineCap/lineJoin round).
const ShapeEl: React.FC<{ s: Shape; id: string; i: number }> = ({ s, id, i }) => {
  switch (s.kind) {
    case 'circle':
      return <circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill ?? 'none'} stroke={s.stroke ?? 'none'} strokeWidth={s.strokeWidth} />;
    case 'path':
      return <path d={s.d} fill="none" stroke={s.stroke} strokeWidth={s.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
    case 'glow': {
      const gid = `${id}g${i}`, c = `rgb(${LIME[0]},${LIME[1]},${LIME[2]})`;
      return (
        <>
          <defs>
            <radialGradient id={gid} gradientUnits="userSpaceOnUse" cx={s.cx} cy={s.cy} r={s.r}>
              <stop offset="0" stopColor={c} stopOpacity={s.inner} />
              <stop offset="1" stopColor={c} stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle cx={s.cx} cy={s.cy} r={s.r} fill={`url(#${gid})`} />
        </>
      );
    }
    case 'fill':
      return <rect x={0} y={0} width={W0} height={H0} fill={s.color} />;
  }
};

export const AcilisSvg: React.FC<{ t: number; variant: AcilisVariant; word: string; short: boolean; id: string; width: number; height: number }> = (
  { t, variant, word, short, id, width, height },
) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W0} ${H0}`} width={width} height={height}>
    {drawScene(t, variant, word, short).map((s, i) => <ShapeEl key={i} s={s} id={id} i={i} />)}
  </svg>
);
