import React from 'react';
import { Composition } from 'remotion';
import { Eslesme, type EslesmeProps } from './Eslesme';
import { OUT_FPS, OUT_TOTAL } from './anim';

const fxDefaults = { blur: true, jelly: true, burst: true, echo: true, bloom: true };

export const RemotionRoot: React.FC = () => (
  <>
    {/* A · Çarpışma */}
    <Composition id="EslesmeA" component={Eslesme} durationInFrames={OUT_TOTAL} fps={OUT_FPS} width={1080} height={1080}
      defaultProps={{ variant: 'A', ...fxDefaults } satisfies EslesmeProps} />
    {/* B · Plak gibi dönüş */}
    <Composition id="EslesmeB" component={Eslesme} durationInFrames={OUT_TOTAL} fps={OUT_FPS} width={1080} height={1080}
      defaultProps={{ variant: 'B', ...fxDefaults } satisfies EslesmeProps} />
  </>
);
