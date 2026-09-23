#!/usr/bin/env node
// Paraşüt'teki tüm ürün kartlarını listeler ve fatura için gereken 7 ürün
// kodunun kartlara yazılıp yazılmadığını kontrol eder. SADECE OKUR.
//
// Kullanım:
//   node urunler.js

const { hata, envOku, tokenAl, getir } = require('./ortak');

const GEREKEN_KODLAR = {
  'BLK-01': { ad: 'Bileklik işçilik', kdv: 20 },
  'BLK-02': { ad: 'Bileklik gümüş', kdv: 0 },
  'KLY-01': { ad: 'Kolye işçilik', kdv: 20 },
  'KLY-02': { ad: 'Kolye gümüş', kdv: 0 },
  'CRM-01': { ad: 'Charm işçilik', kdv: 20 },
  'CRM-02': { ad: 'Charm gümüş', kdv: 0 },
  'KZK-01': { ad: 'Klasik Zaman Kapsülü', kdv: 20 },
};

async function main() {
  const env = envOku();
  console.log('Paraşüt\'e giriş yapılıyor...');
  const token = await tokenAl(env);
  console.log('Giriş başarılı. Ürün kartları okunuyor...');

  const urunler = [];
  let sayfa = 1;
  let toplamSayfa = 1;
  do {
    const url = `https://api.parasut.com/v4/${env.PARASUT_COMPANY_ID}/products`
      + `?page[size]=25&page[number]=${sayfa}`;
    const veri = await getir(token, url);
    toplamSayfa = (veri.meta && veri.meta.total_pages) || 1;
    urunler.push(...veri.data);
    sayfa++;
  } while (sayfa <= toplamSayfa);

  console.log(`\nParaşüt'te ${urunler.length} ürün kartı var:\n`);
  for (const u of urunler) {
    const a = u.attributes;
    const kod = a.code || '(kod yok)';
    const arsiv = a.archived ? '  [arşivde]' : '';
    console.log(`  ${kod.padEnd(12)} KDV %${Number(a.vat_rate)}`.padEnd(28) + `${a.name}${arsiv}`);
  }

  console.log('\nFatura için gereken kodların kontrolü:\n');
  let sorunVar = false;
  for (const [kod, bilgi] of Object.entries(GEREKEN_KODLAR)) {
    const eslesen = urunler.filter((u) => u.attributes.code === kod && !u.attributes.archived);
    let durum;
    if (eslesen.length === 0) {
      durum = 'EKSİK — hiçbir karta yazılmamış';
      sorunVar = true;
    } else if (eslesen.length > 1) {
      durum = `SORUN — ${eslesen.length} karta birden yazılmış, sadece birinde olmalı`;
      sorunVar = true;
    } else if (Number(eslesen[0].attributes.vat_rate) !== bilgi.kdv) {
      durum = `SORUN — kartın KDV'si %${Number(eslesen[0].attributes.vat_rate)}, %${bilgi.kdv} olmalı (${eslesen[0].attributes.name})`;
      sorunVar = true;
    } else {
      durum = `tamam → ${eslesen[0].attributes.name}`;
    }
    console.log(`  ${kod}  ${bilgi.ad.padEnd(22)} ${durum}`);
  }

  console.log(sorunVar
    ? '\nBazı kodlar eksik ya da hatalı. Paraşüt\'te düzeltip bu komutu tekrar çalıştırın.\n'
    : '\nYedi kodun hepsi hazır.\n');
}

main().catch((e) => hata(e.message));
