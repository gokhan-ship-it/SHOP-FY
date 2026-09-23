// Fatura tutarı hesapları. Tüm hesaplar tam sayı (kuruş) ile yapılır,
// ondalıklı sayı yuvarlama hatası olmasın diye.
//
// Birimler:
//   kuruş    = TL × 100
//   onbinde  = TL × 10000 (4 ondalık basamaklı birim fiyat için)

// Pozitif a/b'yi en yakın tam sayıya yuvarlar (yarım yukarı).
function yuvarlaBol(a, b) {
  if (a < 0) throw new Error('Negatif tutar hesaplanamaz');
  return Math.floor((2 * a + b) / (2 * b));
}

// "2299.0" / "1149.5" / "166.67" → kuruş
function tlKurus(metin) {
  const m = String(metin).trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) throw new Error(`Tutar okunamadı: ${metin}`);
  return Number(m[1]) * 100 + Number((m[2] || '0').padEnd(2, '0'));
}

// Oran metni ("5", "4,5", "4.5") → yüzde × 100 (500, 450). En fazla 2 ondalık.
function oranOku(metin) {
  const m = String(metin).trim().replace(',', '.').match(/^(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const deger = Number(m[1]) * 100 + Number((m[2] || '0').padEnd(2, '0'));
  if (deger <= 0 || deger >= 10000) return null;
  return deger;
}

const kurusYaz = (k) => (k / 100).toFixed(2);
const onbindeYaz = (o) => (o / 10000).toFixed(4);
const tlGoster = (k) => kurusYaz(k).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d),)/g, '.');

// Özel matrah ayrımı (CLAUDE.md "Hesap sırası"):
//   1. iscilik_kdv_dahil = round(tutar * X / 100, 2)
//   2. iscilik_matrah    = round(iscilik_kdv_dahil / 1.20, 4)
//   3. iscilik_kdv       = round(round(iscilik_matrah, 2) * 0.20, 2)
//   4. gumus_bedeli      = tutar - round(iscilik_matrah, 2) - iscilik_kdv
function ozelMatrahAyir(tutarKurus, oranYuzde100) {
  const iscilikKdvDahil = yuvarlaBol(tutarKurus * oranYuzde100, 10000);
  const matrahOnbinde = yuvarlaBol(iscilikKdvDahil * 1000, 12); // kuruş×100/1.2
  const matrahKurus = yuvarlaBol(matrahOnbinde, 100);
  const kdvKurus = yuvarlaBol(matrahKurus * 20, 100);
  const gumusKurus = tutarKurus - matrahKurus - kdvKurus;
  return { matrahOnbinde, matrahKurus, kdvKurus, gumusKurus, parasutKdvKurus: yuvarlaBol(matrahOnbinde * 20, 10000) };
}

// Tek satır, tamamı %20 KDV (Klasik Zaman Kapsülü).
function tamKdvli(tutarKurus) {
  const matrahOnbinde = yuvarlaBol(tutarKurus * 1000, 12);
  const matrahKurus = yuvarlaBol(matrahOnbinde, 100);
  const kdvKurus = yuvarlaBol(matrahKurus * 20, 100);
  return { matrahOnbinde, matrahKurus, kdvKurus, parasutKdvKurus: yuvarlaBol(matrahOnbinde * 20, 10000) };
}

// CLAUDE.md'deki doğrulanmış test vektörleri. Geçmezse program çalışmaz.
function kendiniSina() {
  const vektorler = [
    [189800, 790833, 1582, 180310],
    [219900, 916250, 1833, 208904],
    [229900, 957917, 1916, 218405],
  ];
  for (const [tutar, matrah, kdv, gumus] of vektorler) {
    const s = ozelMatrahAyir(tutar, 500);
    if (s.matrahOnbinde !== matrah || s.kdvKurus !== kdv || s.gumusKurus !== gumus) {
      throw new Error(`Hesap testi başarısız: ${kurusYaz(tutar)} TL → ${onbindeYaz(s.matrahOnbinde)} / ${kurusYaz(s.kdvKurus)} / ${kurusYaz(s.gumusKurus)}`);
    }
  }
}

module.exports = { tlKurus, oranOku, kurusYaz, onbindeYaz, tlGoster, ozelMatrahAyir, tamKdvli, kendiniSina };
