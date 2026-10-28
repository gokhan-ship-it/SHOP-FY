import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { FloatMotionBlur } from '../FloatMotionBlur';
import { useDesignFrame } from '../LoopMotionBlur';
import { Lock } from '../kilit/Lock';
import { ShapeEl, W0, H0 } from '../tunnel/shapes';
import { beklemeSamples, frameAt, type Variant } from './anim';

// Tek bir anın sahnesi (şeffaf arka plan)
export const BeklemeSvg: React.FC<{ f: number; variant: Variant; id: string; width: number; height: number }> = ({ f, variant, id, width, height }) => {
  const fr = frameAt(f, variant);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W0} ${H0}`} width={width} height={height}>
      {fr.pre.map((s, i) => <ShapeEl key={`a${i}`} s={s} id={`${id}a${i}`} />)}
      <Lock {...fr.lock} id={`${id}L`} />
      {fr.post.map((s, i) => <ShapeEl key={`b${i}`} s={s} id={`${id}b${i}`} />)}
    </svg>
  );
};

export type BeklemeProps = { variant: Variant; bloom: boolean };

export const Bekleme: React.FC<BeklemeProps> = ({ variant, bloom }) => {
  const d = useDesignFrame();
  const { width, height } = useVideoConfig();
  // HTML: 1/4 çözünürlükte blur(max(2, round(bw/45))) → tam çözünürlükte 4 katı.
  // Bloom alfası: eskizde .55, ama bu kilit "single kilidin bekleme döngüsü" ve süre dolunca SingleHazirLoop'a (.6)
  // geçiliyor; .55 bu geçişte ışıkta sıçrama yapıyordu. Kilit ve single açılıştaki gibi .6.
  // Bulanık kopya şeklin arkasında; üstüne şekil çizildiği için lime rengi açılmaz, ışık yalnızca dışarıda görünür.
  const bloomPx = 4 * Math.max(2, Math.round(Math.max(1, width >> 2) / 45));
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <FloatMotionBlur width={width} height={height} samples={beklemeSamples(variant, d)}
        renderSample={(f) => <BeklemeSvg f={f} variant={variant} id="w" width={width} height={height} />}
        depsKey={variant} bloom={bloom ? { px: bloomPx, opacity: .6 } : null} />
    </AbsoluteFill>
  );
};
