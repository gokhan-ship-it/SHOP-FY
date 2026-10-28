// Uygulama açılışı doğrulaması (render edilmiş videolar üzerinde):
// 1) ilk kare tamamen siyah (telefonun sabit açılış ekranıyla aynı),
// 2) son kare: el yazısında siyah (ana ekran siyahtan açılır), halkalarda lime (ana ekran lime perdenin arkasından açılır),
// 3) kare sayısı composition ile aynı.
import { ACILIS } from '../src/acilis/list';
import { decodePng, pngFrames } from './video';

const W = 1080, H = 1920;
// piksellerin yüzde kaçı verilen renge (±tol) yakın
const share = (buf: Buffer, rgb: [number, number, number], tol: number) => {
  let hit = 0;
  for (let i = 0; i < buf.length; i += 3) if (Math.abs(buf[i] - rgb[0]) <= tol && Math.abs(buf[i + 1] - rgb[1]) <= tol && Math.abs(buf[i + 2] - rgb[2]) <= tol) hit++;
  return (hit / (W * H)) * 100;
};

let ok = true;
for (const a of ACILIS) {
  const frames = pngFrames(a.file), n = frames.length;
  const first = decodePng(frames[0]), last = decodePng(frames[n - 1]);
  const black0 = share(first, [0, 0, 0], 2);
  const endColor: [number, number, number] = a.props.variant === 'hand' ? [0, 0, 0] : [222, 254, 82];
  const endShare = share(last, endColor, 4);
  const good = n === a.frames && first.length === W * H * 3 && black0 === 100 && endShare >= 99.9;
  console.log(`${a.id.padEnd(24)} ${n} kare | ilk kare siyah %${black0.toFixed(3)} | son kare ${a.props.variant === 'hand' ? 'siyah' : 'lime'} %${endShare.toFixed(3)} → ${good ? 'tamam' : 'HATA'}`);
  ok &&= good;
}
if (!ok) { console.error('Açılış doğrulaması BAŞARISIZ'); process.exit(1); }
console.log('Açılış doğrulaması başarılı.');
