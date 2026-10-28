// Couple açılış ve kalp tüneli doğrulaması.
// 1) Kod: KalpTuneliLoop'un her karesi bir tur sonrasıyla (15 eskiz karesi) aynı mı (blur örnekleri dahil)?
// 2) Videolar (render sonrası): geçişlerde atlama var mı? Geçişteki kare farkı, iki taraftaki komşu kare farklarıyla
//    aynı ölçekte olmalı. Çıkışın son karesi tamamen lime mi?
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FPS, OUT_FPS } from '../src/anim';
import { P } from '../src/tunnel/anim';
import { ShapesSvg } from '../src/tunnel/shapes';
import { SEGMENTS, coupleSamples, sceneShapes } from '../src/couple-acilis/anim';
import { decodePng, meanDiff, pngFrames } from './video';

const k = FPS / OUT_FPS;
let ok = true;

// ---------- 1) döngü kodla ----------
// SVG'deki sayılar 1e-6 hassasiyetle, geri kalan her şey birebir aynı olmalı
const markup = (t: number, te: number) => renderToStaticMarkup(<ShapesSvg shapes={sceneShapes(t, te)} id="v" width={1080} height={1920} />);
const NUM = /-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g;
const same = (a: string, b: string) => {
  if (a.replace(NUM, '#') !== b.replace(NUM, '#')) return false;
  const x = a.match(NUM) ?? [], y = b.match(NUM) ?? [];
  return x.every((v, i) => Math.abs(Number(v) - Number(y[i])) <= 1e-6 * Math.max(1, Math.abs(Number(v))));
};
const LOOP_FRAMES = SEGMENTS.loop.len / k;
let periodic = true;
for (let i = 0; i < LOOP_FRAMES; i++) {
  const a = coupleSamples('loop', i * k, true), b = a.map((t) => t + P);
  if (!a.every((t, j) => same(markup(t, Infinity), markup(b[j], Infinity)))) periodic = false;
}
console.log(`KalpTuneliLoop: her kare bir tur sonrasıyla aynı (kare 0 == kare ${LOOP_FRAMES}): ${periodic ? 'EVET' : 'HAYIR'}`);
ok &&= periodic;

// ---------- 2) geçişler videolarda ----------
const load = (f: string) => pngFrames(f).map(decodePng);
const G = load('out/couple-acilis-giris.mp4'), L = load('out/kalp-tuneli-loop.mp4'), C = load('out/kalp-tuneli-cikis.mp4');
const last = (v: Buffer[], n = 1) => v[v.length - n];
const step = (v: Buffer[], i: number) => meanDiff(v[i], v[i + 1]);
const counts = { giris: G.length, loop: L.length, cikis: C.length };
const countOk = (Object.keys(counts) as (keyof typeof counts)[]).every((s) => counts[s] === SEGMENTS[s].len / k);
console.log(`Kare sayıları: giriş ${G.length}, döngü ${L.length}, çıkış ${C.length} → ${countOk ? 'tamam' : 'HATA'}`);
ok &&= countOk;

const seams: [string, Buffer, Buffer, number[]][] = [
  ['CoupleAcilisGiris → KalpTuneliLoop', last(G), L[0], [step(G, G.length - 2), step(L, 0)]],
  ['KalpTuneliLoop → KalpTuneliLoop (döngü)', last(L), L[0], [step(L, L.length - 2), step(L, 0)]],
  ['KalpTuneliLoop → KalpTuneliCikis', last(L), C[0], [step(L, L.length - 2), step(C, 0)]],
  ['CoupleAcilisGiris → KalpTuneliCikis', last(G), C[0], [step(G, G.length - 2), step(C, 0)]],
];
for (const [name, a, b, nb] of seams) {
  const d = meanDiff(a, b), ref = Math.max(...nb), good = d <= ref * 1.5 + .1;
  console.log(`${name}: geçiş farkı ${d.toFixed(3)} (komşu kareler ${nb.map((x) => x.toFixed(3)).join(' / ')}) → ${good ? 'atlama yok' : 'ATLAMA'}`);
  ok &&= good;
}

// çıkışın son karesi tamamen lime (#DEFE52, ±4)
const end = last(C);
let hit = 0;
for (let i = 0; i < end.length; i += 3) if (Math.abs(end[i] - 222) <= 4 && Math.abs(end[i + 1] - 254) <= 4 && Math.abs(end[i + 2] - 82) <= 4) hit++;
const limeShare = (hit / (end.length / 3)) * 100;
console.log(`KalpTuneliCikis son kare lime: %${limeShare.toFixed(3)} → ${limeShare >= 99.9 ? 'tamam' : 'HATA'}`);
ok &&= limeShare >= 99.9;

if (!ok) { console.error('Tünel doğrulaması BAŞARISIZ'); process.exit(1); }
console.log('Tünel doğrulaması başarılı.');
