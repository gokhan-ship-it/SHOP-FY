// Shopify fatura adresinden Paraşüt için il ve ilçe bulur.
//
// Shopify'ın "il" (province) alanı güvenilmez, müşteriler şehir alanına bazen sadece ili,
// bazen sadece ilçeyi yazar, bazen de boş bırakır. Bu yüzden birden fazla ipucu
// puanlanır:
//   - şehir alanında yazan il              (en güçlü)
//   - posta kodu (ilk 2 hane plaka, tamamı ilçe)
//   - adreste geçen ilçe adı (yazım hatası toleranslı)
//   - adreste geçen mahalle adı (o ilde tek bir ilçeye aitse)
//   - adreste geçen il adı
//   - Shopify'ın il alanı                   (en zayıf)
// Veri: il-ilce.json (81 il, 973 ilçe, posta kodları; kaynağı dosyanın içinde yazılı).

const fs = require('fs');
const path = require('path');

const VERI = JSON.parse(fs.readFileSync(path.join(__dirname, 'il-ilce.json'), 'utf8'));

function sadelestir(metin) {
  return String(metin || '').toLocaleLowerCase('tr-TR')
    .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Plaka → { ad, ilceler: [{ ad, anahtar }] }
const IL = {};
const IL_ANAHTAR = new Map(); // sadeleştirilmiş il adı → plaka
const ILCE_GENEL = new Map(); // sadeleştirilmiş ilçe adı → [plaka, ...]
for (const [plaka, il] of Object.entries(VERI.iller)) {
  IL[plaka] = { ad: il.ad, ilceler: il.ilceler.map((ad) => ({ ad, anahtar: sadelestir(ad) })) };
  IL_ANAHTAR.set(sadelestir(il.ad), plaka);
  for (const ilce of IL[plaka].ilceler) {
    if (!ILCE_GENEL.has(ilce.anahtar)) ILCE_GENEL.set(ilce.anahtar, []);
    ILCE_GENEL.get(ilce.anahtar).push(plaka);
  }
}
for (const [kisa, plaka] of [['afyon', '03'], ['icel', '33'], ['urfa', '63'], ['maras', '46'], ['k maras', '46'], ['antep', '27'], ['izmit', '41']]) {
  if (!IL_ANAHTAR.has(kisa)) IL_ANAHTAR.set(kisa, plaka);
}

// Plaka → Map(sadeleştirilmiş mahalle adı → ilçe adı). Sadece o ilde tek ilçeye ait mahalleler.
const MAHALLE = {};
function mahalleHaritasi(plaka) {
  if (!MAHALLE[plaka]) {
    MAHALLE[plaka] = new Map();
    for (const [ad, i] of Object.entries((VERI.mahalle || {})[plaka] || {})) MAHALLE[plaka].set(sadelestir(ad), VERI.iller[plaka].ilceler[i]);
  }
  return MAHALLE[plaka];
}

// Adreste geçen mahalle adlarından ilçe (bulunan mahallelerin hepsi aynı ilçeyi göstermeli).
function mahalledenIlce(plaka, kelimeler) {
  const harita = mahalleHaritasi(plaka);
  const ilceler = new Set();
  for (let n = 1; n <= 4; n++) {
    for (let i = 0; i + n <= kelimeler.length; i++) {
      const ilce = harita.get(kelimeler.slice(i, i + n).join(' '));
      if (ilce) ilceler.add(ilce);
    }
  }
  return ilceler.size === 1 ? [...ilceler][0] : null;
}

// İki kelime arasındaki harf farkı (Levenshtein), en fazla `sinir`e kadar hesaplanır.
function fark(a, b, sinir) {
  if (Math.abs(a.length - b.length) > sinir) return sinir + 1;
  let onceki = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const simdiki = [i];
    let enAz = i;
    for (let j = 1; j <= b.length; j++) {
      simdiki[j] = Math.min(onceki[j] + 1, simdiki[j - 1] + 1, onceki[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      enAz = Math.min(enAz, simdiki[j]);
    }
    if (enAz > sinir) return sinir + 1;
    onceki = simdiki;
  }
  return onceki[b.length];
}
const izinliFark = (uzunluk) => (uzunluk >= 9 ? 2 : uzunluk >= 6 ? 1 : 0);

// Metindeki kelime dizilerinde aranan adı arar (çok kelimeli adlar için ardışık kelimeler).
function metindeBul(kelimeler, anahtar, bulanik) {
  const parca = anahtar.split(' ');
  for (let i = 0; i + parca.length <= kelimeler.length; i++) {
    const aday = kelimeler.slice(i, i + parca.length).join(' ');
    if (aday === anahtar) return 0;
  }
  if (!bulanik || anahtar === 'merkez') return null;
  const sinir = izinliFark(anahtar.length);
  if (!sinir) return null;
  for (let i = 0; i + parca.length <= kelimeler.length; i++) {
    const aday = kelimeler.slice(i, i + parca.length).join(' ');
    if (fark(aday, anahtar, sinir) <= sinir) return 1;
  }
  return null;
}

// Bir ilin ilçelerini metinde arar. Önce birebir, yoksa yazım hatası toleranslı.
function ilceAra(plaka, kelimeler) {
  const bulunan = { birebir: [], yakin: [] };
  for (const ilce of IL[plaka].ilceler) {
    const sonuc = metindeBul(kelimeler, ilce.anahtar, true);
    if (sonuc === 0) bulunan.birebir.push(ilce.ad);
    else if (sonuc === 1) bulunan.yakin.push(ilce.ad);
  }
  if (bulunan.birebir.length === 1) return { ad: bulunan.birebir[0], kaynak: 'adres' };
  if (bulunan.birebir.length === 0 && bulunan.yakin.length === 1) return { ad: bulunan.yakin[0], kaynak: 'adres (yazım düzeltildi)' };
  return null;
}

function postaKodlari(metinler) {
  const kodlar = [];
  for (const m of metinler) for (const k of String(m || '').match(/\b\d{5}\b/g) || []) if (VERI.posta[k]) kodlar.push(k);
  return kodlar;
}

// adres: Shopify billingAddress { city, province, zip, address1, address2 }
// Dönüş: { il, ilce, ilKaynak, ilceKaynak, eksik: ['il'|'ilçe', ...] }
function ilIlceBul(adres) {
  const a = adres || {};
  const sehir = sadelestir(a.city);
  const sehirKelime = sehir.split(' ').filter(Boolean);
  const tumKelime = sadelestir([a.city, a.address1, a.address2].join(' ')).split(' ').filter(Boolean);
  const puan = {};
  const ekle = (plaka, p, neden) => {
    if (!plaka || !IL[plaka]) return;
    if (!puan[plaka]) puan[plaka] = { p: 0, neden: [] };
    puan[plaka].p += p;
    puan[plaka].neden.push(neden);
  };

  // 1) Şehir alanında il adı ("KOCAELİ", "İstanbul/avcılar", "Kadıköy-İstanbul")
  for (const [anahtar, plaka] of IL_ANAHTAR) if (metindeBul(sehirKelime, anahtar, false) === 0) ekle(plaka, 5, 'şehir alanı');
  // 2) Posta kodu
  const posta = postaKodlari([a.zip, a.address1, a.address2]);
  for (const k of new Set(posta)) ekle(VERI.posta[k][0], 4, 'posta kodu');
  // 3) Adreste, Türkiye'de tek bir ile ait ilçe adı geçiyor mu ("Şemdinli" → Hakkari)
  for (const [anahtar, plakalar] of ILCE_GENEL) {
    if (plakalar.length !== 1 || anahtar === 'merkez' || anahtar.length < 4) continue;
    if (metindeBul(tumKelime, anahtar, false) === 0) ekle(plakalar[0], 3, 'ilçe adı');
  }
  // 4) Adreste il adı
  for (const [anahtar, plaka] of IL_ANAHTAR) if (metindeBul(tumKelime, anahtar, false) === 0) ekle(plaka, 2, 'adreste il adı');
  // 5) Shopify il alanı
  const prov = IL_ANAHTAR.get(sadelestir(a.province));
  if (prov) ekle(prov, 1, 'Shopify il alanı');

  const sirali = Object.entries(puan).sort((x, y) => y[1].p - x[1].p);
  const sonuc = { il: '', ilce: '', ilKaynak: '', ilceKaynak: '', eksik: [] };
  if (!sirali.length || (sirali[1] && sirali[1][1].p === sirali[0][1].p)) {
    sonuc.eksik.push('il', 'ilçe');
    return sonuc;
  }
  const plaka = sirali[0][0];
  sonuc.il = IL[plaka].ad;
  sonuc.ilKaynak = sirali[0][1].neden[0];

  // İlçe: önce şehir alanında, sonra tüm adreste, son çare posta kodu.
  const ilce = ilceAra(plaka, sehirKelime) || ilceAra(plaka, tumKelime);
  if (ilce) {
    sonuc.ilce = ilce.ad;
    sonuc.ilceKaynak = ilce.kaynak;
  } else {
    const k = posta.find((x) => VERI.posta[x][0] === plaka);
    if (k) { sonuc.ilce = VERI.posta[k][1]; sonuc.ilceKaynak = 'posta kodu'; }
    else {
      const m = mahalledenIlce(plaka, tumKelime);
      if (m) { sonuc.ilce = m; sonuc.ilceKaynak = 'mahalle adı'; }
    }
  }
  if (!sonuc.ilce) sonuc.eksik.push('ilçe');
  return sonuc;
}

module.exports = { ilIlceBul, sadelestir };
