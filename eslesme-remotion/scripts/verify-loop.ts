// Loop doğrulaması: kare 0 ile bir sonraki turun başlangıcı (kare 240) birebir aynı mı,
// ve 239 → 0 geçişinde atlama var mı? (60 fps çıkış karesi i → tasarım karesi i·FPS/OUT_FPS)
import { CX, CY, FPS, OUT_FPS, OUT_TOTAL, TOTAL, drawScene, loopFrame, shift, state, type Fx, type Variant } from '../src/anim';
import { blurSampleFrames } from '../src/blur';

const FX: Fx = { blur: true, jelly: true, burst: true, echo: true, bloom: true };
// LoopMotionBlur'un sahneye verdiği örnek kareleri (Scene bunları loopFrame ile tura indirger)
const samples = (f: number) => blurSampleFrames(f).map(loopFrame);

// Bir karenin tam render girdisi: 10 blur örneğinin sahneleri + arka plan/bloom durumu
const frameDesc = (f: number, v: Variant) =>
  JSON.stringify({ scenes: samples(f).map((t) => drawScene(t, v, FX)), bg: state(shift(loopFrame(f)), v, FX).b });
// 1b) kare 0'ın blur örnekleri bir önceki turun sonuna (tasarım karesi 119.2…120) sarılıyor mu
const wraps = samples(0).slice(1).every((t) => t > TOTAL - 1);

// Dolgu şeklinin ekran koordinatlarındaki noktaları (atlama ölçümü için)
const fillPts = (f: number, v: Variant) => {
  const d = drawScene(f, v, FX);
  const fill = d.local.find((s) => s.kind === 'path' && s.fill)!;
  const { rot, sx, sy } = d.transform;
  const nums = (fill as { d: string }).d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const pts: [number, number][] = [];
  for (let i = 0; i < nums.length; i += 2) {
    const x = nums[i] * sx, y = nums[i + 1] * sy;
    pts.push([CX + x * Math.cos(rot) - y * Math.sin(rot), CY + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
};
const maxDelta = (a: [number, number][], b: [number, number][]) =>
  Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1])));

const design = (i: number) => (i * FPS) / OUT_FPS;
const last = OUT_TOTAL - 1;

let ok = true;
console.log(`Kare 0 blur örnekleri önceki turun sonuna sarılıyor: ${wraps ? 'EVET' : 'HAYIR'} (${samples(0).map((t) => t.toFixed(2)).join(', ')})`);
for (const v of ['A', 'B'] as Variant[]) {
  // 1) kare 0 == kare 240 (ve tüm kareler için i == i + OUT_TOTAL)
  let identical = true;
  for (let i = 0; i < OUT_TOTAL; i++) if (frameDesc(design(i), v) !== frameDesc(design(i + OUT_TOTAL), v)) identical = false;

  // 2) 239 → 0 geçişindeki hareket, diğer ardışık karelerdeki hareketle aynı ölçekte mi
  const deltas = Array.from({ length: OUT_TOTAL }, (_, i) => maxDelta(fillPts(design(i), v), fillPts(design((i + 1) % OUT_TOTAL), v)));
  const seam = deltas[last];
  const neighbours = Math.max(deltas[last - 1], deltas[0]);
  const maxAll = Math.max(...deltas);
  const smooth = seam <= neighbours * 1.5 + 0.5;

  console.log(`Eslesme${v}: kare0 == kare${OUT_TOTAL}: ${identical ? 'EVET' : 'HAYIR'} | ` +
    `${last}→0 hareket ${seam.toFixed(3)}px (komşu ${neighbours.toFixed(3)}px, tur maks ${maxAll.toFixed(3)}px) → ${smooth ? 'atlama yok' : 'ATLAMA'}`);
  ok &&= identical && smooth && wraps;
}
if (!ok) { console.error('Loop doğrulaması BAŞARISIZ'); process.exit(1); }
console.log('Loop doğrulaması başarılı.');
