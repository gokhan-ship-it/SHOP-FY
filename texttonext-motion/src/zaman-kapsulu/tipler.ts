// Zaman Kapsülü reklam şablonunun ayar tipleri.
// Asıl ayarlar src/videolar/ klasöründeki dosyalardadır.

export type UrunDurumu = {
  gorsel?: "ana" | "boyunda"; // hangi fotoğraf
  gorunur?: boolean; // false: ürün ekranda yok (sadece metin)
  opaklik?: number; // 0–1
  olcek?: number; // 1 = normal boy
  odak?: "merkez" | "kapsul"; // kameranın baktığı nokta
  x?: number; // yatay konum kaydırma (px)
  y?: number; // dikey konum kaydırma (px)
  yakinlasma?: number; // sahne boyunca push-in (0.08 = %8 büyüme)
  kayma?: number; // sahne boyunca yatay kayma (px)
  donme?: number; // sahne boyunca dönme (derece)
};

export type Sahne = {
  // Ekrana gelen ve dış seste söylenen cümle.
  // **çift yıldız** arasındaki kelimeler kalın yazılır.
  metin: string;
  konum?: "ust" | "orta"; // ust: ürünün üstünde, orta: ekranın ortasında
  giris?: "kelime-kelime" | "tek-seferde";
  buyukYazi?: boolean;
  // Bu cümleden sonra en az bu kadar sessizlik olsun (saniye).
  // Seste yeterli boşluk yoksa video bu kadar bekletilir.
  sonrasindaDuraklama?: number;
  urun: UrunDurumu;
  // Boyunda çekilmiş fotoğraf yoksa kullanılacak ürün hareketi
  boyundaFotoYoksa?: UrunDurumu;
  efekt?: "ikonlar" | "tarih-kilit" | "geri-sayim" | "soru-halkasi";
};

export type ReklamAyarlari = {
  id: string;
  ses: string; // assets/ses içindeki dosya adı
  yerTutucuSes?: string; // gerçek ses yokken kullanılacak geçici ses
  muzik?: string; // assets/muzik içindeki dosya adı (yoksa klasördeki ilk dosya)
  muzikSeviyesi: number; // 0–1, dış ses yokken
  muzikKonusurkenSeviyesi: number; // 0–1, dış ses konuşurken
  urunGorselleri: { ana: string; boyunda: string };
  kapsulNoktasi: { x: number; y: number }; // ana fotoğrafta kapsülün yeri (0–1)
  logo?: string; // assets/logo içindeki dosya adı (yoksa klasördeki ilk görsel)
  renkler: { zemin: string; anaMetin: string; ikincilMetin: string; cizgi: string };
  yazi: { boyut: number; buyukBoyut: number; kalinlik: number; harfAraligi: string };
  tarih: string;
  geriSayim: { gun: number; saat: number; dakika: number; saniye: number };
  geriSayimEtiketleri: [string, string, string, string];
  ikonKelimeleri: { fotograf: string; video: string; mesaj: string };
  guvenliAlan: { ust: number; alt: number; yan: number };
  gecisSuresi: number; // sahneler arası yumuşak geçiş (sn)
  kenarYumusatma: number; // fotoğraf kenarlarının beyaza karışma oranı (0–0.2)
  golge: { acik: boolean; opaklik: number; y: number };
  sahneler: Sahne[];
  kapanis: { sure: number; logoMetni: string; site: string; altSatir: string; urun: UrunDurumu };
};
