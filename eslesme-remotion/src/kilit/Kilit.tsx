import React, { useId } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { LoopMotionBlur, useSampleFrame } from '../LoopMotionBlur';
import { KilitSvg } from './KilitSvg';
import { segmentFrame, type KilitFx, type Segment } from './anim';

export type KilitProps = KilitFx & { segment: Segment };

// Tek bir anın sahnesi. Kare numarası useCurrentFrame()'den gelir
// (motion blur içindeyse örneğin zaman ofseti eklenmiş hali).
const Scene: React.FC<{ fx: KilitFx; segment: Segment }> = ({ fx, segment }) => {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return <KilitSvg f={segmentFrame(segment, useSampleFrame())} fx={fx} id={id} />;
};

// Motion blur katmanı (HTML'deki acc tuvali)
const Accumulated: React.FC<{ fx: KilitFx; segment: Segment }> = ({ fx, segment }) => {
  if (!fx.blur) return <Scene fx={fx} segment={segment} />;
  return (
    <LoopMotionBlur>
      <Scene fx={fx} segment={segment} />
    </LoopMotionBlur>
  );
};

export const Kilit: React.FC<KilitProps> = ({ segment, ...fx }) => {
  const { width } = useVideoConfig();
  // HTML: 1/4 çözünürlükte blur(max(2, round(bw/45))) → tam çözünürlükte 4 katı
  const bloomPx = 4 * Math.max(2, Math.round(Math.max(1, width >> 2) / 45));

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {fx.bloom && (
        // Bulanık kopya şeklin arkasında, 'lighter' ile eklenir (HTML'de alfa .6); üstüne şekil
        // çizildiği için lime dolgunun rengi açılmaz, ışık yalnızca dışarıda görünür.
        <AbsoluteFill style={{ mixBlendMode: 'plus-lighter', opacity: .6, filter: `blur(${bloomPx}px)` }}>
          <Accumulated fx={fx} segment={segment} />
        </AbsoluteFill>
      )}
      <AbsoluteFill>
        <Accumulated fx={fx} segment={segment} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
