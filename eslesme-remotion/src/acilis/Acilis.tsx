import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { FloatMotionBlur } from '../FloatMotionBlur';
import { useDesignFrame } from '../LoopMotionBlur';
import { AcilisSvg } from './AcilisSvg';
import { acilisSamples, type AcilisFx, type AcilisVariant, type Word } from './anim';

export type AcilisProps = AcilisFx & { variant: AcilisVariant; word: Word; short: boolean };

export const Acilis: React.FC<AcilisProps> = ({ variant, word, short, ...fx }) => {
  const t = useDesignFrame();
  const { width, height } = useVideoConfig();
  // HTML: 1/4 çözünürlükte blur(max(2, round(bw/45))) → tam çözünürlükte 4 katı; bloom alfası .7.
  // Bulanık kopya şeklin arkasında; üstüne şekil çizildiği için lime rengi açılmaz, ışık yalnızca dışarıda görünür.
  const bloomPx = 4 * Math.max(2, Math.round(Math.max(1, width >> 2) / 45));

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <FloatMotionBlur width={width} height={height} samples={acilisSamples(t, fx.blur, variant, word, short)}
        renderSample={(s) => <AcilisSvg t={s} variant={variant} word={word} short={short} id="a" width={width} height={height} />}
        depsKey={JSON.stringify({ variant, word, short, fx })} bloom={fx.bloom ? { px: bloomPx, opacity: .7 } : null} />
    </AbsoluteFill>
  );
};
