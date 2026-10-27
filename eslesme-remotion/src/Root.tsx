import React from 'react';
import { Composition } from 'remotion';
import { Eslesme, type EslesmeProps } from './Eslesme';
import { FPS, OUT_FPS, OUT_TOTAL } from './anim';
import { Kilit, type KilitProps } from './kilit/Kilit';
import { IDLE, LOCK_END } from './kilit/anim';
import { Acilis } from './acilis/Acilis';
import { ACILIS } from './acilis/list';

const fxDefaults = { blur: true, jelly: true, burst: true, echo: true, bloom: true };
const kilitFx = { blur: true, bloom: true, echo: true };


export const RemotionRoot: React.FC = () => (
  <>
    {/* A · Çarpışma */}
    <Composition id="EslesmeA" component={Eslesme} durationInFrames={OUT_TOTAL} fps={OUT_FPS} width={1080} height={1080}
      defaultProps={{ variant: 'A', ...fxDefaults } satisfies EslesmeProps} />
    {/* B · Plak gibi dönüş */}
    <Composition id="EslesmeB" component={Eslesme} durationInFrames={OUT_TOTAL} fps={OUT_FPS} width={1080} height={1080}
      defaultProps={{ variant: 'B', ...fxDefaults } satisfies EslesmeProps} />
    {/* Single kilit: kilitlendiğinde bir kere oynar (2.67 sn) */}
    <Composition id="SingleKilit" component={Kilit} durationInFrames={(LOCK_END * OUT_FPS) / FPS} fps={OUT_FPS} width={1080} height={1080}
      defaultProps={{ segment: 'lock', ...kilitFx } satisfies KilitProps} />
    {/* Single kilit bekleme: kilit bitince, kapsül kilitli kaldıkça loop (2 sn); hareket yavaş, motion blur kapalı */}
    <Composition id="SingleKilitBekleme" component={Kilit} durationInFrames={(IDLE * OUT_FPS) / FPS} fps={OUT_FPS} width={1080} height={1080}
      defaultProps={{ segment: 'idle', ...kilitFx, blur: false } satisfies KilitProps} />
    {/* Uygulama açılışı "merhaba" (1 · el yazısı, 2 · halkalardan harfler); ilk kare tamamen siyah */}
    {ACILIS.map((a) => (
      <Composition key={a.id} id={a.id} component={Acilis} durationInFrames={a.frames} fps={OUT_FPS} width={1080} height={1920}
        defaultProps={a.props} />
    ))}
  </>
);
