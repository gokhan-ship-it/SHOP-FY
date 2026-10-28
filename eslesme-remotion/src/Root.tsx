import React from 'react';
import { Composition } from 'remotion';
import { Eslesme, type EslesmeProps } from './Eslesme';
import { FPS, OUT_FPS, OUT_TOTAL } from './anim';
import { Kilit, type KilitProps } from './kilit/Kilit';
import { IDLE, LOCK_END } from './kilit/anim';
import { Acilis } from './acilis/Acilis';
import { ACILIS } from './acilis/list';
import { CoupleAcilis } from './couple-acilis/CoupleAcilis';
import { SEGMENTS } from './couple-acilis/anim';
import { SingleAcilis } from './single-acilis/SingleAcilis';
import { SEGMENTS as SINGLE } from './single-acilis/anim';
import { Bekleme } from './bekleme/Bekleme';
import { LOOP } from './bekleme/anim';

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
    {/* Couple kapsül açılışı: giriş (bir kere) → kalp tüneli döngüsü (yükleme sürdükçe) → çıkış (lime); tünel ve çıkış single ile ortak */}
    {([['CoupleAcilisGiris', 'giris'], ['KalpTuneliLoop', 'loop'], ['KalpTuneliCikis', 'cikis']] as const).map(([id, segment]) => (
      <Composition key={id} id={id} component={CoupleAcilis} durationInFrames={(SEGMENTS[segment].len * OUT_FPS) / FPS} fps={OUT_FPS}
        width={1080} height={1920} defaultProps={{ segment, blur: true, bloom: true }} />
    ))}
    {/* Single kapsül açılışı: açılmaya hazır döngüsü → bileklik okutulunca açılış → KalpTuneliLoop → KalpTuneliCikis */}
    {([['SingleHazirLoop', 'hazir'], ['SingleAcilis', 'acilis']] as const).map(([id, segment]) => (
      <Composition key={id} id={id} component={SingleAcilis} durationInFrames={(SINGLE[segment].len * OUT_FPS) / FPS} fps={OUT_FPS}
        width={1080} height={1920} defaultProps={{ segment, blur: true, bloom: true }} />
    ))}
    {/* Bekleme ekranı (alıcı, kapsül henüz hazır değil): hepsi bekleme döngüsünün bir turu. Motion blur yalnızca olay videolarında. */}
    {([['BeklemeLoop', 'bekleme'], ['Son24SaatLoop', 'son24'], ['HenuzDegil', 'henuz'], ['AniEklendi', 'ani']] as const).map(([id, variant]) => (
      <Composition key={id} id={id} component={Bekleme} durationInFrames={(LOOP * OUT_FPS) / FPS} fps={OUT_FPS}
        width={1080} height={1920} defaultProps={{ variant, bloom: true }} />
    ))}
  </>
);
