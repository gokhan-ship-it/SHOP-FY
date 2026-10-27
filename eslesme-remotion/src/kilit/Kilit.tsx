import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { FloatMotionBlur } from '../FloatMotionBlur';
import { useDesignFrame } from '../LoopMotionBlur';
import { KilitSvg } from './KilitSvg';
import { kilitSamples, type KilitFx, type Segment } from './anim';

export type KilitProps = KilitFx & { segment: Segment };

export const Kilit: React.FC<KilitProps> = ({ segment, ...fx }) => {
  const frame = useDesignFrame();
  const { width, height } = useVideoConfig();
  // HTML: 1/4 çözünürlükte blur(max(2, round(bw/45))) → tam çözünürlükte 4 katı; bloom alfası .6.
  // Bulanık kopya şeklin arkasında; üstüne şekil çizildiği için lime rengi açılmaz, ışık yalnızca dışarıda görünür.
  const bloomPx = 4 * Math.max(2, Math.round(Math.max(1, width >> 2) / 45));

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <FloatMotionBlur width={width} height={height} samples={kilitSamples(segment, frame, fx.blur)}
        renderSample={(t) => <KilitSvg f={t} fx={fx} id="k" size={width} />}
        depsKey={JSON.stringify(fx)} bloom={fx.bloom ? { px: bloomPx, opacity: .6 } : null} />
    </AbsoluteFill>
  );
};
