// Single kilit doğrulaması (60 fps çıkış karesi i → tasarım karesi i·FPS/OUT_FPS):
// 1) bekleme videosunda kare 0 ile bir sonraki turun başlangıcı (kare 120) birebir aynı mı,
// 2) bekleme 119 → 0 geçişinde atlama var mı,
// 3) kilit videosunun son karesinden bekleme videosunun ilk karesine geçişte atlama var mı?
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OUT_FPS } from '../src/anim';
import { blurSampleFrames } from '../src/blur';
import { KilitSvg } from '../src/kilit/KilitSvg';
import { FPS, IDLE, LOCK_END, TAU, kilitSamples, lockState, segmentFrame, shackleGeo, type KilitFx, type Segment } from '../src/kilit/anim';

// Root.tsx'teki varsayılanlar: kilitte motion blur açık, beklemede kapalı
const FX: Record<Segment, KilitFx> = { lock: { blur: true, bloom: true, echo: true }, idle: { blur: false, bloom: true, echo: true } };
const design = (i: number) => (i * FPS) / OUT_FPS;
const LOCK_FRAMES = (LOCK_END * OUT_FPS) / FPS, IDLE_FRAMES = (IDLE * OUT_FPS) / FPS;

// Bir çıkış karesinin tam render girdisi: örneklerin (blur açıksa 10) SVG'si
const frameMarkup = (seg: Segment, i: number) =>
  kilitSamples(seg, design(i), FX[seg].blur).map((t) => renderToStaticMarkup(<KilitSvg f={t} fx={FX[seg]} id="v" size={1080} />)).join('');

// Kilidin ekrandaki referans noktaları (yüz çevresi, halka tepesi, anahtar deliği), 1080 ölçeğinde
const keyPts = (f: number) => {
  const st = lockState(f), k = 1080 / 800;
  const fx0 = st.cx + Math.sin(st.yaw) * st.depth / 2, kx = Math.cos(st.yaw) * st.sx, ky = st.sy;
  const pts: [number, number][] = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; pts.push([fx0 + st.rad * Math.cos(a) * kx, st.cy + st.rad * Math.sin(a) * ky]); }
  const G = shackleGeo(st.rad), [x, y] = G.U(G.sTop);
  pts.push([st.cx + x * Math.cos(st.yaw), st.cy + y - st.shO]);
  pts.push([fx0, st.cy - .27 * st.rad * st.kp * ky]);
  return pts.map(([px, py]) => [px * k, py * k] as [number, number]);
};
const move = (f0: number, f1: number) => {
  const a = keyPts(f0), b = keyPts(f1);
  return Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1])));
};
const segF = (seg: Segment, i: number) => segmentFrame(seg, design(i));
const fmt = (x: number) => x.toFixed(3);

let ok = true;

// 1) bekleme loop'u: tüm kareler için i == i + IDLE_FRAMES
let identical = true;
for (let i = 0; i < IDLE_FRAMES; i++) if (frameMarkup('idle', i) !== frameMarkup('idle', i + IDLE_FRAMES)) identical = false;
// blur açılırsa kare 0'ın örnekleri turun sonuna sarılmalı
const wraps = blurSampleFrames(0).slice(1).every((t) => segmentFrame('idle', t) > LOCK_END + IDLE - 1);
console.log(`SingleKilitBekleme: kare0 == kare${IDLE_FRAMES}: ${identical ? 'EVET' : 'HAYIR'} | blur açılırsa kare 0 örnekleri turun sonuna sarılıyor: ${wraps ? 'EVET' : 'HAYIR'}`);
ok &&= identical && wraps;

// 2) bekleme 119 → 0 geçişi
const idleMoves = Array.from({ length: IDLE_FRAMES }, (_, i) => move(segF('idle', i), segF('idle', (i + 1) % IDLE_FRAMES)));
const seam = idleMoves[IDLE_FRAMES - 1], seamNb = Math.max(idleMoves[IDLE_FRAMES - 2], idleMoves[0]);
const seamOk = seam <= seamNb * 1.5 + 0.5;
console.log(`SingleKilitBekleme: ${IDLE_FRAMES - 1}→0 hareket ${fmt(seam)}px (komşu ${fmt(seamNb)}px, tur maks ${fmt(Math.max(...idleMoves))}px) → ${seamOk ? 'atlama yok' : 'ATLAMA'}`);
ok &&= seamOk;

// 3) kilit son karesi → bekleme ilk karesi
const hand = move(segF('lock', LOCK_FRAMES - 1), segF('idle', 0));
const handNb = Math.max(move(segF('lock', LOCK_FRAMES - 2), segF('lock', LOCK_FRAMES - 1)), idleMoves[0]);
const handOk = hand <= handNb * 1.5 + 0.5;
console.log(`SingleKilit → SingleKilitBekleme: geçiş hareketi ${fmt(hand)}px (komşu ${fmt(handNb)}px) → ${handOk ? 'atlama yok' : 'ATLAMA'}`);
ok &&= handOk;

if (!ok) { console.error('Kilit doğrulaması BAŞARISIZ'); process.exit(1); }
console.log('Kilit doğrulaması başarılı.');
