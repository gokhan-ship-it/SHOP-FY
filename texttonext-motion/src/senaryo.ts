// ─────────────────────────────────────────────────────────────
//  SENARYO — videonun metinlerini ve zamanlamasını buradan değiştirin.
//  Tüm zamanlar SANİYE cinsindendir. Metinleri dış sesteki
//  cümlelerin başladığı/bittiği saniyelere göre ayarlayın.
// ─────────────────────────────────────────────────────────────

export type Metin = {
  metin: string;
  baslangic: number; // ekrana gelmeye başladığı saniye
  bitis: number; // ekrandan kaybolduğu saniye
  konum: "ust" | "alt";
  vurgu?: boolean; // daha büyük ve kalın yazı
};

export type UrunSahnesi = {
  // assets/urunler klasöründeki kaçıncı fotoğraf (alfabetik sıra, 1'den başlar)
  fotograf: number;
  baslangic: number;
  bitis: number;
  // Hareket: "yakinlas" (yavaş zoom), "kay-sol" / "kay-sag" (hafif kayma)
  hareket: "yakinlas" | "uzaklas" | "kay-sol" | "kay-sag";
};

export const senaryo = {
  // Video uzunluğu (saniye)
  sure: 15,

  urunSahneleri: [
    { fotograf: 1, baslangic: 0, bitis: 5.6, hareket: "yakinlas" },
    { fotograf: 2, baslangic: 4.8, bitis: 10.6, hareket: "kay-sol" },
    { fotograf: 3, baslangic: 9.8, bitis: 15, hareket: "uzaklas" },
  ] as UrunSahnesi[],

  metinler: [
    { metin: "Sadeliğin yeni tanımı.", baslangic: 0.6, bitis: 4.6, konum: "ust", vurgu: true },
    { metin: "Her ayrıntıda özen.", baslangic: 5.4, bitis: 9.6, konum: "alt", vurgu: true },
    { metin: "Işığı yakalayan çizgiler, günlük şıklık.", baslangic: 6.6, bitis: 9.6, konum: "ust" },
    { metin: "texttonext", baslangic: 10.6, bitis: 15, konum: "ust", vurgu: true },
    { metin: "Şimdi keşfedin.", baslangic: 11.6, bitis: 15, konum: "alt" },
  ] as Metin[],
};
