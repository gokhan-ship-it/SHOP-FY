// Single kapsül açılışı doğrulaması.
// 1) Kod: SingleHazirLoop her karesi bir tur sonrasıyla aynı mı; SingleAcilis'in ilk karesi SingleHazirLoop'un ilk karesiyle aynı mı?
// 2) Videolar (render sonrası): geçişlerde atlama var mı? Geçişteki kare farkı, iki taraftaki komşu kare farklarıyla
//    aynı ölçekte olmalı. Tünel ve çıkış couple ile ortak videolar (out/kalp-tuneli-*.mp4).
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FPS, OUT_FPS } from '../src/anim';
import { RLOOP, SEGMENTS, singleSamples } from '../src/single-acilis/anim';
import { SingleSvg } from '../src/single-acilis/SingleAcilis';
import { decodePng, meanDiff, pngFrames } from './video';

const k = FPS / OUT_FPS;
let ok = true;

// ---------- 1) kodla ----------
const markup = (ggs: number[]) => ggs.map((gg) => renderToStaticMarkup(<SingleSvg gg={gg} id="v" width={1080} height={1920} />)).join('');
const HAZIR = SEGMENTS.hazir.len / k;
let periodic = true;
for (let i = 0; i < HAZIR; i++) if (markup(singleSamples('hazir', i * k, true)) !== markup(singleSamples('hazir', i * k + RLOOP, true))) periodic = false;
console.log(`SingleHazirLoop: her kare bir tur sonrasıyla aynı (kare 0 == kare ${HAZIR}): ${periodic ? 'EVET' : 'HAYIR'}`);
// açılışın ilk karesi (örnekler okutma anına kırpılır) == hazır döngüsünün başlangıç anı
const firstSame = markup(singleSamples('acilis', 0, true).slice(0, 1)) === markup([SEGMENTS.hazir.start]);
console.log(`SingleAcilis ilk karesi == SingleHazirLoop'un başlangıç anı: ${firstSame ? 'EVET' : 'HAYIR'}`);
ok &&= periodic && firstSame;

// ---------- 2) geçişler videolarda ----------
const load = (f: string) => pngFrames(f).map(decodePng);
const H = load('out/single-hazir-loop.mp4'), A = load('out/single-acilis.mp4');
const L = load('out/kalp-tuneli-loop.mp4'), C = load('out/kalp-tuneli-cikis.mp4');
const last = (v: Buffer[], n = 1) => v[v.length - n];
const step = (v: Buffer[], i: number) => meanDiff(v[i], v[i + 1]);
const countOk = H.length === SEGMENTS.hazir.len / k && A.length === SEGMENTS.acilis.len / k;
console.log(`Kare sayıları: hazır ${H.length}, açılış ${A.length} → ${countOk ? 'tamam' : 'HATA'}`);
ok &&= countOk;

const seams: [string, Buffer, Buffer, number[]][] = [
  ['SingleHazirLoop → SingleHazirLoop (döngü)', last(H), H[0], [step(H, H.length - 2), step(H, 0)]],
  ['SingleHazirLoop → SingleAcilis', last(H), A[0], [step(H, H.length - 2), step(A, 0)]],
  ['SingleAcilis → KalpTuneliLoop', last(A), L[0], [step(A, A.length - 2), step(L, 0)]],
  ['SingleAcilis → KalpTuneliCikis', last(A), C[0], [step(A, A.length - 2), step(C, 0)]],
];
for (const [name, a, b, nb] of seams) {
  const d = meanDiff(a, b), ref = Math.max(...nb), good = d <= ref * 1.5 + .1;
  console.log(`${name}: geçiş farkı ${d.toFixed(3)} (komşu kareler ${nb.map((x) => x.toFixed(3)).join(' / ')}) → ${good ? 'atlama yok' : 'ATLAMA'}`);
  ok &&= good;
}

if (!ok) { console.error('Single açılış doğrulaması BAŞARISIZ'); process.exit(1); }
console.log('Single açılış doğrulaması başarılı.');
