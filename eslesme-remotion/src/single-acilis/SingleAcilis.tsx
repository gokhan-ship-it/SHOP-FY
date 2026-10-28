import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { FloatMotionBlur } from '../FloatMotionBlur';
import { useDesignFrame } from '../LoopMotionBlur';
import { Lock } from '../kilit/Lock';
import { ShapeEl, ShapesSvg, W0, H0 } from '../tunnel/shapes';
import { TE, frameAt, singleSamples, type Segment } from './anim';

// Tek bir anın sahnesi (şeffaf arka plan), eskizin global zamanı gg
export const SingleSvg: React.FC<{ gg: number; id: string; width: number; height: number }> = ({ gg, id, width, height }) => {
  const fr = frameAt(gg, TE);
  if (fr.kind === 'tunnel') return <ShapesSvg shapes={fr.shapes} id={id} width={width} height={height} />;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W0} ${H0}`} width={width} height={height}>
      {fr.pre.map((s, i) => <ShapeEl key={`a${i}`} s={s} id={`${id}a${i}`} />)}
      <Lock {...fr.lock} id={`${id}L`} />
      {fr.post.map((s, i) => <ShapeEl key={`b${i}`} s={s} id={`${id}b${i}`} />)}
    </svg>
  );
};

export type SingleAcilisProps = { segment: Segment; blur: boolean; bloom: boolean };

export const SingleAcilis: React.FC<SingleAcilisProps> = ({ segment, blur, bloom }) => {
  const d = useDesignFrame();
  const { width, height } = useVideoConfig();
  // HTML: 1/4 çözünürlükte blur(max(2, round(bw/45))) → tam çözünürlükte 4 katı; bloom alfası .6.
  // Bulanık kopya şeklin arkasında; üstüne şekil çizildiği için lime rengi açılmaz, ışık yalnızca dışarıda görünür.
  const bloomPx = 4 * Math.max(2, Math.round(Math.max(1, width >> 2) / 45));
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <FloatMotionBlur width={width} height={height} samples={singleSamples(segment, d, blur)}
        renderSample={(gg) => <SingleSvg gg={gg} id="s" width={width} height={height} />}
        depsKey={JSON.stringify({ segment, blur })} bloom={bloom ? { px: bloomPx, opacity: .6 } : null} />
    </AbsoluteFill>
  );
};
