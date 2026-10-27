import React from 'react';
import { Composition } from 'remotion';
import { Eslesme, type EslesmeProps } from './Eslesme';
import { FPS, TOTAL } from './anim';

const fxDefaults = { blur: true, jelly: true, burst: true, echo: true, bloom: true };

export const RemotionRoot: React.FC = () => (
  <>
    {/* A · Çarpışma */}
    <Composition id="EslesmeA" component={Eslesme} durationInFrames={TOTAL} fps={FPS} width={1080} height={1080}
      defaultProps={{ variant: 'A', ...fxDefaults } satisfies EslesmeProps} />
    {/* B · Plak gibi dönüş */}
    <Composition id="EslesmeB" component={Eslesme} durationInFrames={TOTAL} fps={FPS} width={1080} height={1080}
      defaultProps={{ variant: 'B', ...fxDefaults } satisfies EslesmeProps} />
    {/* Aynı zamanlamalar, 60 fps (240 kare) */}
    <Composition id="EslesmeA60" component={Eslesme} durationInFrames={TOTAL * 2} fps={FPS * 2} width={1080} height={1080}
      defaultProps={{ variant: 'A', ...fxDefaults } satisfies EslesmeProps} />
    <Composition id="EslesmeB60" component={Eslesme} durationInFrames={TOTAL * 2} fps={FPS * 2} width={1080} height={1080}
      defaultProps={{ variant: 'B', ...fxDefaults } satisfies EslesmeProps} />
  </>
);
