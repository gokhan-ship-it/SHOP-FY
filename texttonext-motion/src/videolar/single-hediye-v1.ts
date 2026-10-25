// ═════════════════════════════════════════════════════════════
//  single-hediye-v1 — TÜM AYARLAR BU DOSYADA
//
//  Metin, renk, tarih, süre veya dosya adı değiştirmek için
//  yalnızca bu dosyayı düzenleyin.
//
//  Sahne zamanları dış sesten otomatik hesaplanır: Whisper her
//  kelimenin söylendiği anı bulur, metinler o anda ekrana gelir.
//
//  Bileklik versiyonu için: bu dosyayı kopyalayıp adını
//  "single-bileklik-v1.ts" yapın, id'yi, ses dosyasını, "kolye" →
//  "bileklik", "boynunda" → "bileğinde" metinlerini ve fotoğraf
//  adlarını değiştirin; sonra src/videolar/index.ts listesine ekleyin.
// ═════════════════════════════════════════════════════════════
import type { ReklamAyarlari } from "../zaman-kapsulu/tipler";

export const singleHediyeV1: ReklamAyarlari = {
  id: "single-hediye-v1",

  // ── Dosyalar ───────────────────────────────────────────────
  ses: "single-hediye.mp3", // assets/ses/
  yerTutucuSes: "yer-tutucu/single-hediye-yer-tutucu.mp3",
  muzik: "", // assets/muzik/ — boşsa klasördeki ilk müzik dosyası
  muzikSeviyesi: 0.12,
  muzikKonusurkenSeviyesi: 0.05,
  urunGorselleri: {
    ana: "kolye.png", // assets/urunler/ — beyaz fonda kolye
    boyunda: "kolye-boyunda.jpg", // assets/urunler/ — boyunda çekim (isteğe bağlı)
  },
  // Ana fotoğrafta kapsülün (kolye ucunun) yeri: x soldan, y üstten (0–1)
  kapsulNoktasi: { x: 0.483, y: 0.835 },
  logo: "", // assets/logo/ — boşsa klasördeki ilk görsel; o da yoksa yazı logo

  // ── Görünüm ────────────────────────────────────────────────
  renkler: {
    zemin: "#FFFFFF",
    anaMetin: "#1D1D1F",
    ikincilMetin: "#86868B",
    cizgi: "#1D1D1F", // ikonlar ve ince çizgiler
  },
  yazi: { boyut: 78, buyukBoyut: 96, kalinlik: 700, harfAraligi: "-0.025em" },
  guvenliAlan: { ust: 250, alt: 380, yan: 96 }, // Instagram arayüzü için (px)
  gecisSuresi: 0.8,
  kenarYumusatma: 0.08,
  // Ürün altındaki çok hafif gölge (y: fotoğrafta dikey yer, genislik: fotoğraf genişliğine oranı)
  golge: { acik: true, opaklik: 0.05, y: 0.985, genislik: 0.28 },

  // ── Sahne içerikleri ───────────────────────────────────────
  tarih: "14 Şubat 2027",
  geriSayim: { gun: 112, saat: 7, dakika: 42, saniye: 18 },
  geriSayimEtiketleri: ["gün", "saat", "dakika", "saniye"],
  ikonKelimeleri: { fotograf: "Fotoğraf", video: "video", mesaj: "mesaj" },

  sahneler: [
    {
      // 1
      metin: "Bu kolye neden dünyadaki en iyi hediye?",
      urun: { olcek: 1, yakinlasma: 0.08 },
    },
    {
      // 2
      metin: "Çünkü içinde ne olduğunu **sadece sen** biliyorsun.",
      urun: { odak: "kapsul", olcek: 2.1, y: 120, yakinlasma: 0.08 },
    },
    {
      // 3
      metin: "Fotoğraf, video veya mesaj yüklüyorsun.",
      urun: { olcek: 0.92, y: 120, yakinlasma: 0.06 },
      efekt: "ikonlar",
    },
    {
      // 4
      metin: "Ve bir tarihe kilitliyorsun.",
      urun: { olcek: 0.82, x: -190, y: 80, kayma: 20, yakinlasma: 0.05 },
      efekt: "tarih-kilit",
    },
    {
      // 5
      metin: "O gün gelene kadar kimse açamıyor.",
      urun: { olcek: 1.15, opaklik: 0.14, y: 60, yakinlasma: 0.05 },
      efekt: "geri-sayim",
    },
    {
      // 6
      metin: "Düşünsenize…",
      konum: "orta",
      sonrasindaDuraklama: 0.6,
      urun: { gorunur: false, olcek: 1.1 },
    },
    {
      // 7
      metin: "Her gün boynunda taşıyor.",
      urun: { gorsel: "boyunda", olcek: 1.12, y: 80, yakinlasma: 0.08, kayma: -30 },
      boyundaFotoYoksa: { olcek: 1.35, y: -70, yakinlasma: 0.08, donme: 3 },
    },
    {
      // 8
      metin: "Ama içinde ne olduğunu bilmiyor.",
      urun: { olcek: 0.9, y: 120, yakinlasma: -0.04 },
      efekt: "soru-halkasi",
    },
    {
      // 9
      metin: "Ama baştan söyleyelim…",
      konum: "orta",
      sonrasindaDuraklama: 0.5,
      urun: { gorunur: false, olcek: 0.9 },
    },
    {
      // 10
      metin: "Beklemek tam bir **eziyet.**",
      konum: "orta",
      giris: "tek-seferde",
      buyukYazi: true,
      sonrasindaDuraklama: 1.2, // kapanış kartından önce cümle ekranda kalsın
      urun: { gorunur: false, olcek: 0.9 },
    },
  ],

  // ── 11. Kapanış kartı (dış ses yok) ────────────────────────
  kapanis: {
    sure: 2.5,
    logoMetni: "Text To Next",
    site: "texttonext.com",
    altSatir: "Zaman Kapsülü",
    urun: { olcek: 0.8, y: -190, yakinlasma: 0.03 },
  },
};
