import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { LoopMotionBlur, useSampleFrame } from './LoopMotionBlur';
import { CX, CY, R, S, drawScene, lime, loopFrame, shift, state, type Fx, type Shape, type Variant } from './anim';

export type EslesmeProps = Fx & { variant: Variant };

const ShapeEl: React.FC<{ s: Shape }> = ({ s }) => {
  const paint = { fill: s.fill ?? 'none', stroke: s.stroke ?? 'none', strokeWidth: s.strokeWidth };
  return s.kind === 'circle' ? <circle cx={s.cx} cy={s.cy} r={s.r} {...paint} /> : <path d={s.d} {...paint} />;
};

// Tek bir anın sahnesi (şeffaf arka plan). Kare numarası useCurrentFrame()'den gelir
// (motion blur içindeyse örneğin zaman ofseti eklenmiş hali).
const Scene: React.FC<{ fx: Fx; variant: Variant }> = ({ fx, variant }) => {
  const frame = loopFrame(useSampleFrame());
  const scene = drawScene(frame, variant, fx);
  const { rot, sx, sy } = scene.transform;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      {scene.world.map((s, i) => <ShapeEl key={`w${i}`} s={s} />)}
      <g transform={`translate(${CX} ${CY}) rotate(${(rot * 180) / Math.PI}) scale(${sx} ${sy})`}>
        {scene.local.map((s, i) => <ShapeEl key={`l${i}`} s={s} />)}
      </g>
    </svg>
  );
};

// Motion blur katmanı (HTML'deki acc tuvali)
const Accumulated: React.FC<{ fx: Fx; variant: Variant }> = ({ fx, variant }) => {
  if (!fx.blur) return <Scene fx={fx} variant={variant} />;
  return (
    <LoopMotionBlur>
      <Scene fx={fx} variant={variant} />
    </LoopMotionBlur>
  );
};

export const Eslesme: React.FC<EslesmeProps> = ({ variant, ...fx }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const s = state(shift(loopFrame(frame)), variant, fx);
  const bn = s.b / .1;
  // HTML: 1/4 çözünürlükte blur(max(2, round(bw/45))) → tam çözünürlükte 4 katı
  const bloomPx = 4 * Math.max(2, Math.round(Math.max(1, width >> 2) / 45));

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="glow" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={R * 1.9}>
            <stop offset="0" stopColor={lime(.05 + .14 * bn)} />
            <stop offset="1" stopColor={lime(0)} />
          </radialGradient>
        </defs>
        <rect width={S} height={S} fill="url(#glow)" />
      </svg>
      {fx.bloom && (
        // Bulanık kopya şeklin arkasında, 'lighter' ile eklenir; üstüne opak şekil çizildiği için
        // lime dolgunun rengi açılmaz, ışık yalnızca dışarıda görünür.
        <AbsoluteFill style={{ mixBlendMode: 'plus-lighter', opacity: .7 + .3 * bn, filter: `blur(${bloomPx}px)` }}>
          <Accumulated fx={fx} variant={variant} />
        </AbsoluteFill>
      )}
      <AbsoluteFill>
        <Accumulated fx={fx} variant={variant} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
