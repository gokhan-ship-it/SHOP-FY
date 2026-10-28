// Bekleme ekranı doğrulaması. Uygulama bu videolar arasında yalnızca döngünün tur sonunda geçer.
// 1) Kod: döngüler bir tur sonrasıyla aynı mı; olay videolarının ilk ve son karesinde kilit bekleme döngüsüyle aynı mı;
//    bekleme turunun sonunda kilidin konumu, boyutu ve açısı SingleHazirLoop'un başlangıcıyla aynı mı?
// 2) Videolar (render sonrası): geçişlerde atlama var mı? Geçişteki kare farkı, iki taraftaki komşu kare farklarıyla
//    aynı ölçekte olmalı.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FPS, OUT_FPS } from '../src/anim';
import { LOOP, lockProps, lockState, type Variant } from '../src/bekleme/anim';
import { BeklemeSvg } from '../src/bekleme/Bekleme';
import { readyState } from '../src/single-acilis/anim';
import { decodePng, meanDiff, pngFrames } from './video';

const k = FPS / OUT_FPS, N = LOOP / k;
let ok = true;

// ---------- 1) kodla ----------
const markup = (f: number, v: Variant) => renderToStaticMarkup(<BeklemeSvg f={f} variant={v} id="v" width={1080} height={1920} />);
for (const v of ['bekleme', 'son24'] as Variant[]) {
  let periodic = true;
  for (let i = 0; i < N; i++) if (markup(i * k, v) !== markup(i * k + LOOP, v)) periodic = false;
  console.log(`${v === 'bekleme' ? 'BeklemeLoop' : 'Son24SaatLoop'}: her kare bir tur sonrasıyla aynı (kare 0 == kare ${N}): ${periodic ? 'EVET' : 'HAYIR'}`);
  ok &&= periodic;
}
const sameLock = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b);
for (const v of ['henuz', 'ani'] as Variant[]) {
  const first = sameLock(lockProps(lockState(0, v)), lockProps(lockState(0, 'bekleme')));
  const last = sameLock(lockProps(lockState(LOOP - k, v)), lockProps(lockState(LOOP - k, 'bekleme')));
  console.log(`${v === 'henuz' ? 'HenuzDegil' : 'AniEklendi'}: ilk karede kilit bekleme döngüsüyle aynı: ${first ? 'EVET' : 'HAYIR'} | son karede: ${last ? 'EVET' : 'HAYIR'}`);
  ok &&= first && last;
}
// bekleme turunun sonu (bir sonraki turun başı) ile SingleHazirLoop'un başlangıcı: konum, boyut, açı
const a = lockState(LOOP, 'bekleme'), b = readyState(0);
const geo = { 'merkez x': [a.cx + a.dx, b.cx], 'merkez y': [a.cy, b.cy], 'kalınlık': [a.depth, b.depth], 'açı (yaw)': [a.yaw, b.yaw], 'ölçek x': [a.sx, b.sx], 'ölçek y': [a.sy, b.sy], 'kulp': [a.shO, b.shO] };
const geoDiff = Math.max(...Object.values(geo).map(([x, y]) => Math.abs(x - y)));
console.log(`Bekleme turu sonu → SingleHazirLoop: ${Object.entries(geo).map(([n, [x, y]]) => `${n} ${+x.toFixed(6)}/${+y.toFixed(6)}`).join(', ')} → ${geoDiff < 1e-9 ? 'aynı' : 'FARKLI'} (yarıçap ikisinde de 100)`);
ok &&= geoDiff < 1e-9;

// ---------- 2) geçişler videolarda ----------
const load = (f: string) => pngFrames(f).map(decodePng);
const V = {
  BeklemeLoop: load('out/bekleme-loop.mp4'), Son24SaatLoop: load('out/son-24-saat-loop.mp4'),
  HenuzDegil: load('out/henuz-degil.mp4'), AniEklendi: load('out/ani-eklendi.mp4'), SingleHazirLoop: load('out/single-hazir-loop.mp4'),
};
type Name = keyof typeof V;
const countOk = (['BeklemeLoop', 'Son24SaatLoop', 'HenuzDegil', 'AniEklendi'] as Name[]).every((n) => V[n].length === N);
console.log(`Kare sayıları: ${(Object.keys(V) as Name[]).map((n) => `${n} ${V[n].length}`).join(', ')} → ${countOk ? 'tamam' : 'HATA'}`);
ok &&= countOk;
const step = (v: Buffer[], i: number) => meanDiff(v[i], v[i + 1]);
const seam = (from: Name, to: Name) => {
  const A = V[from], B = V[to], d = meanDiff(A[A.length - 1], B[0]);
  const nb = [step(A, A.length - 2), step(B, 0)], good = d <= Math.max(...nb) * 1.5 + .1;
  console.log(`${from} → ${to}: geçiş farkı ${d.toFixed(3)} (komşu kareler ${nb.map((x) => x.toFixed(3)).join(' / ')}) → ${good ? 'atlama yok' : 'ATLAMA'}`);
  ok &&= good;
};
seam('BeklemeLoop', 'BeklemeLoop');
seam('Son24SaatLoop', 'Son24SaatLoop');
seam('BeklemeLoop', 'Son24SaatLoop');
for (const from of ['BeklemeLoop', 'Son24SaatLoop'] as Name[]) for (const to of ['HenuzDegil', 'AniEklendi'] as Name[]) seam(from, to);
seam('HenuzDegil', 'BeklemeLoop');
seam('AniEklendi', 'BeklemeLoop');
seam('BeklemeLoop', 'SingleHazirLoop');
seam('Son24SaatLoop', 'SingleHazirLoop');

if (!ok) { console.error('Bekleme doğrulaması BAŞARISIZ'); process.exit(1); }
console.log('Bekleme doğrulaması başarılı.');
