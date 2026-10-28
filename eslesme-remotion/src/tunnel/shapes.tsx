import React from 'react';

// Kalp tüneli ve açılış sahnelerinin çizim listesi: saf veri, SVG'ye birebir çevrilir.
// Koordinatlar eskizin 540×960 ölçeğinde; viewBox 1080×1920 videoya oranla ölçekler.
export type TShape =
  | { kind: 'glow'; cx: number; cy: number; r: number; color: string; alpha: number } // tüm ekrana radyal ışık
  | { kind: 'fill'; d: string; fill: string } // dolu yol
  | { kind: 'stroke'; d: string; stroke: string; width: number; round?: boolean } // çizgi (round: lineJoin round)
  | { kind: 'circle'; cx: number; cy: number; r: number; stroke?: string; width?: number; fill?: string }
  | { kind: 'gradFill'; d: string; from: [number, number]; to: [number, number]; stops: [number, string][]; opacity: number } // doğrusal gradyanla dolu yol
  | { kind: 'rect'; fill: string } // tüm ekran
  | { kind: 'group'; transform: string; clip?: { cx: number; cy: number; r: number }; children: TShape[] };

export const W0 = 540, H0 = 960;

export const ShapeEl: React.FC<{ s: TShape; id: string }> = ({ s, id }) => {
  switch (s.kind) {
    case 'glow':
      return (
        <>
          <defs>
            <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={s.cx} cy={s.cy} r={s.r}>
              <stop offset="0" stopColor={s.color} stopOpacity={s.alpha} />
              <stop offset="1" stopColor={s.color} stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect x={0} y={0} width={W0} height={H0} fill={`url(#${id})`} />
        </>
      );
    case 'fill':
      return <path d={s.d} fill={s.fill} />;
    case 'stroke':
      return <path d={s.d} fill="none" stroke={s.stroke} strokeWidth={s.width} strokeLinejoin={s.round ? 'round' : 'miter'} />;
    case 'circle':
      return <circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill ?? 'none'} stroke={s.stroke ?? 'none'} strokeWidth={s.width} />;
    case 'gradFill':
      return (
        <>
          <defs>
            <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={s.from[0]} y1={s.from[1]} x2={s.to[0]} y2={s.to[1]}>
              {s.stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
            </linearGradient>
          </defs>
          <path d={s.d} fill={`url(#${id})`} opacity={s.opacity} />
        </>
      );
    case 'rect':
      return <rect x={0} y={0} width={W0} height={H0} fill={s.fill} />;
    case 'group':
      return (
        <g transform={s.transform}>
          {s.clip && <defs><clipPath id={`${id}c`}><circle cx={s.clip.cx} cy={s.clip.cy} r={s.clip.r} /></clipPath></defs>}
          <g clipPath={s.clip ? `url(#${id}c)` : undefined}>
            {s.children.map((c, i) => <ShapeEl key={i} s={c} id={`${id}_${i}`} />)}
          </g>
        </g>
      );
  }
};

export const ShapesSvg: React.FC<{ shapes: TShape[]; id: string; width: number; height: number }> = ({ shapes, id, width, height }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W0} ${H0}`} width={width} height={height}>
    {shapes.map((s, i) => <ShapeEl key={i} s={s} id={`${id}${i}`} />)}
  </svg>
);
