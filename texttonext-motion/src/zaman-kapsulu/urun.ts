// Ürün "kamerası": sahneler arası yumuşak geçiş, push-in, kayma ve odak noktası.
import { Easing } from "remotion";
import type { Kaynaklar } from "./kaynaklar";
import type { ReklamAyarlari, UrunDurumu } from "./tipler";
import type { Zamanlama } from "./zamanlama";

export const MERKEZ_Y = 1000;
export const YER_TUTUCU_KAPSUL = { x: 0.5, y: 0.82 };

export const yumusakCikis = Easing.bezier(0.16, 1, 0.3, 1);
export const yumusakGecis = Easing.bezier(0.45, 0, 0.25, 1);
export const sinirla = (x: number) => Math.min(1, Math.max(0, x));

export type Katman = {
  gorsel: "ana" | "boyunda";
  opaklik: number;
  k: number; // ölçek
  px: number; // odak noktası (görselin 0–1 oranı)
  py: number;
  sx: number; // odak noktasının ekrandaki yeri (px)
  sy: number;
  r: number; // dönme (derece)
};

const etkin = (d: UrunDurumu, q: number, kapsul: { x: number; y: number }): Katman => {
  const gorsel = d.gorsel ?? "ana";
  const P = d.odak === "kapsul" && gorsel === "ana" ? kapsul : { x: 0.5, y: 0.5 };
  return {
    gorsel,
    opaklik: d.gorunur === false ? 0 : d.opaklik ?? 1,
    k: (d.olcek ?? 1) * (1 + (d.yakinlasma ?? 0) * q),
    px: P.x,
    py: P.y,
    sx: 540 + (d.x ?? 0) + (d.kayma ?? 0) * q,
    sy: MERKEZ_Y + (d.y ?? 0),
    r: (d.donme ?? 0) * q,
  };
};

const karistir = (a: Katman, b: Katman, p: number): Katman => {
  const l = (x: number, y: number) => x + (y - x) * p;
  return {
    gorsel: b.gorsel,
    opaklik: l(a.opaklik, b.opaklik),
    k: l(a.k, b.k),
    px: l(a.px, b.px),
    py: l(a.py, b.py),
    sx: l(a.sx, b.sx),
    sy: l(a.sy, b.sy),
    r: l(a.r, b.r),
  };
};

// Sahnelerin ürün durumları (+ sonda kapanış kartı)
export const urunDurumlari = (ayarlar: ReklamAyarlari, kaynaklar: Kaynaklar): UrunDurumu[] => [
  ...ayarlar.sahneler.map((s) =>
    s.urun.gorsel === "boyunda" && !kaynaklar.boyunda
      ? { ...s.urun, ...s.boyundaFotoYoksa, gorsel: "ana" as const }
      : s.urun,
  ),
  ayarlar.kapanis.urun,
];

export const aralik = (z: Zamanlama, i: number) =>
  i < z.sahneler.length
    ? { bas: z.sahneler[i].baslangic, son: z.sahneler[i].bitis }
    : { bas: z.kapanisBaslangic, son: z.toplamSure };

export const anlikSahne = (z: Zamanlama, t: number) => {
  let i = 0;
  for (let j = 0; j <= z.sahneler.length; j++) if (aralik(z, j).bas <= t) i = j;
  return i;
};

// Üstte metin varken ürün, metnin altından itibaren yumuşakça görünür
// (metin hiçbir zaman ürünün üstüne binmez). Sadece kırpmadır, fotoğraf değişmez.
const metinAltSiniri = (ayarlar: ReklamAyarlari, i: number) => {
  const s = ayarlar.sahneler[i];
  if (!s || s.konum === "orta") return -300;
  const boyut = s.buyukYazi ? ayarlar.yazi.buyukBoyut : ayarlar.yazi.boyut;
  const genislik = 1080 - 2 * ayarlar.guvenliAlan.yan;
  const harf = s.metin.replace(/\*\*/g, "").length;
  const satir = Math.max(1, Math.ceil((harf * 0.56 * boyut) / genislik));
  return ayarlar.guvenliAlan.ust + 50 + satir * boyut * 1.12 + 30;
};

export const urunKirpmasi = (t: number, ayarlar: ReklamAyarlari, z: Zamanlama) => {
  const i = anlikSahne(z, t);
  const p = yumusakCikis(sinirla((t - aralik(z, i).bas) / ayarlar.gecisSuresi));
  const once = i === 0 ? metinAltSiniri(ayarlar, 0) : metinAltSiniri(ayarlar, i - 1);
  return once + (metinAltSiniri(ayarlar, i) - once) * p;
};

export const urunKatmanlari = (
  t: number,
  ayarlar: ReklamAyarlari,
  kaynaklar: Kaynaklar,
  z: Zamanlama,
): Katman[] => {
  const durumlar = urunDurumlari(ayarlar, kaynaklar);
  const kapsul = kaynaklar.ana.src ? ayarlar.kapsulNoktasi : YER_TUTUCU_KAPSUL;
  const i = anlikSahne(z, t);
  const { bas, son } = aralik(z, i);
  const q = sinirla((t - bas) / Math.max(0.01, son - bas));
  const gecis = i === 0 ? 1.8 : ayarlar.gecisSuresi;
  const p = yumusakCikis(sinirla((t - bas) / gecis));
  const simdi = etkin(durumlar[i], q, kapsul);
  const once =
    i === 0
      ? { ...etkin(durumlar[0], 0, kapsul), opaklik: 0, k: simdi.k * 0.55 }
      : etkin(durumlar[i - 1], 1, kapsul);
  if (once.gorsel === simdi.gorsel) return [karistir(once, simdi, p)];
  return [
    { ...once, opaklik: once.opaklik * (1 - p) },
    { ...simdi, opaklik: simdi.opaklik * p },
  ];
};

// Görsel üzerindeki bir noktanın (0–1) ekrandaki yeri
export const ekranNoktasi = (
  katman: Katman,
  boyut: { w: number; h: number },
  nokta: { x: number; y: number },
) => {
  const dx = (nokta.x - katman.px) * boyut.w * katman.k;
  const dy = (nokta.y - katman.py) * boyut.h * katman.k;
  const a = (katman.r * Math.PI) / 180;
  return {
    x: katman.sx + dx * Math.cos(a) - dy * Math.sin(a),
    y: katman.sy + dx * Math.sin(a) + dy * Math.cos(a),
  };
};
