// Türkiye'nin 81 ili. Shopify'daki "il" (province) alanı güvenilmez olduğu için
// müşterinin yazdığı şehir metni bu listeyle karşılaştırılır.
const ILLER = ['Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin',
  'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale',
  'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep',
  'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman',
  'Kars', 'Kastamonu', 'Kayseri', 'Kilis', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya',
  'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa',
  'Siirt', 'Sinop', 'Şırnak', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'];

// "KOCAELİ", "istanbul", "Izmir", "Afyon" → karşılaştırma anahtarı (Türkçe harfler sadeleşir)
function anahtar(metin) {
  return String(metin || '').trim().toLocaleLowerCase('tr-TR')
    .replace(/[ıi̇]/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z]/g, '');
}
const IL_ANAHTAR = new Map(ILLER.map((il) => [anahtar(il), il]));
IL_ANAHTAR.set('afyon', 'Afyonkarahisar');
IL_ANAHTAR.set('icel', 'Mersin');
IL_ANAHTAR.set('urfa', 'Şanlıurfa');
IL_ANAHTAR.set('maras', 'Kahramanmaraş');
IL_ANAHTAR.set('antep', 'Gaziantep');

const ilBul = (metin) => IL_ANAHTAR.get(anahtar(metin)) || null;

// Shopify adresinden { il, ilce }. Müşterinin yazdığı şehir metni önceliklidir.
//   "KOCAELİ"          → Kocaeli / ''
//   "Hakkari/Şemdinli" → Hakkari / Şemdinli
//   "Zeytinburnu" + province "Istanbul" → İstanbul / Zeytinburnu
function ilIlce(sehirMetni, province) {
  const parcalar = String(sehirMetni || '').split(/[\/,-]/).map((x) => x.trim()).filter(Boolean);
  if (parcalar.length) {
    const il = ilBul(parcalar[0]);
    if (il) return { il, ilce: parcalar.slice(1).join(' ') };
    if (parcalar.length > 1 && ilBul(parcalar[parcalar.length - 1])) {
      return { il: ilBul(parcalar[parcalar.length - 1]), ilce: parcalar.slice(0, -1).join(' ') };
    }
  }
  return { il: ilBul(province) || String(province || '').trim(), ilce: parcalar.join(' ') };
}

module.exports = { ilIlce };
