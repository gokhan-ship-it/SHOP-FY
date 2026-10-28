import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { FloatMotionBlur } from '../FloatMotionBlur';
import { useDesignFrame } from '../LoopMotionBlur';
import { ShapesSvg } from '../tunnel/shapes';
import { SEGMENTS, coupleSamples, sceneShapes, type Segment } from './anim';

export type CoupleAcilisProps = { segment: Segment; blur: boolean; bloom: boolean };

export const CoupleAcilis: React.FC<CoupleAcilisProps> = ({ segment, blur, bloom }) => {
  const d = useDesignFrame();
  const { width, height } = useVideoConfig();
  const { te } = SEGMENTS[segment];
  // HTML: 1/4 çözünürlükte blur(max(2, round(bw/45))) → tam çözünürlükte 4 katı; bloom alfası .7.
  // Bulanık kopya şeklin arkasında; üstüne şekil çizildiği için lime rengi açılmaz, ışık yalnızca dışarıda görünür.
  const bloomPx = 4 * Math.max(2, Math.round(Math.max(1, width >> 2) / 45));
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <FloatMotionBlur width={width} height={height} samples={coupleSamples(segment, d, blur)}
        renderSample={(t) => <ShapesSvg shapes={sceneShapes(t, te)} id="c" width={width} height={height} />}
        depsKey={JSON.stringify({ segment, blur })} bloom={bloom ? { px: bloomPx, opacity: .7 } : null} />
    </AbsoluteFill>
  );
};
