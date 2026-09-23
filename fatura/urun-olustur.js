#!/usr/bin/env node
// Fatura için gereken 7 ürün kartını Paraşüt'te açar.
// - Önce her kodu Paraşüt'te arar; zaten varsa o kartı atlar (mükerrer açmaz).
// - Ne yapacağını ekrana basar ve "e" onayı almadan hiçbir şey yazmaz.
// - Sadece ürün kartı (POST /products) oluşturur. Faturaya, müşteriye, mevcut
//   kartlara dokunmaz.
//
// Kullanım:
//   node urun-olustur.js

const readline = require('readline/promises');
const { hata, envOku, tokenAl, getir } = require('./ortak');

// Alan adları (code, name, vat_rate, unit, currency, inventory_tracking)
// Paraşüt'ten okunan gerçek ürün kartlarında görüldü (KESIF-SONUCU.md).
const KARTLAR = [
  { code: 'BLK-01', name: 'ZAMAN KAPSÜLÜ BİLEKLİK - İŞÇİLİK BEDELİ', vat_rate: 20 },
  { code: 'BLK-02', name: 'ZAMAN KAPSÜLÜ BİLEKLİK - GÜMÜŞ BEDELİ', vat_rate: 0 },
  { code: 'KLY-01', name: 'ZAMAN KAPSÜLÜ KOLYE - İŞÇİLİK BEDELİ', vat_rate: 20 },
  { code: 'KLY-02', name: 'ZAMAN KAPSÜLÜ KOLYE - GÜMÜŞ BEDELİ', vat_rate: 0 },
  { code: 'CRM-01', name: 'ZAMAN KAPSÜLÜ CHARM - İŞÇİLİK BEDELİ', vat_rate: 20 },
  { code: 'CRM-02', name: 'ZAMAN KAPSÜLÜ CHARM - GÜMÜŞ BEDELİ', vat_rate: 0 },
  { code: 'KZK-01', name: 'KLASİK ZAMAN KAPSÜLÜ', vat_rate: 20 },
];

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function kartOlustur(token, firma, kart) {
  const govde = {
    data: {
      type: 'products',
      attributes: {
        code: kart.code,
        name: kart.name,
        vat_rate: kart.vat_rate,
        unit: 'Adet',
        currency: 'TRL',
        inventory_tracking: false,
      },
    },
  };
  for (let deneme = 1; deneme <= 5; deneme++) {
    await bekle(1200);
    const cevap = await fetch(`https://api.parasut.com/v4/${firma}/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(govde),
    });
    if (cevap.status === 429) {
      console.log('  Paraşüt "yavaşla" dedi, 10 saniye bekleniyor...');
      await bekle(10000);
      continue;
    }
    const metin = await cevap.text();
    if (!cevap.ok) {
      hata(`${kart.code} kartı açılamadı (durum kodu ${cevap.status}). Kalan kartlar açılmadı.\n${metin}`);
    }
    return JSON.parse(metin).data;
  }
  hata('Paraşüt art arda hız limiti hatası verdi, biraz sonra tekrar deneyin.');
}

async function kodlaAra(token, firma, kod) {
  const veri = await getir(token, `https://api.parasut.com/v4/${firma}/products?filter[code]=${encodeURIComponent(kod)}`);
  // Filtre gevşek eşleşme yapıyorsa diye kodu birebir kontrol et.
  return veri.data.filter((u) => u.attributes.code === kod);
}

async function main() {
  const env = envOku();
  const firma = env.PARASUT_COMPANY_ID;
  console.log('Paraşüt\'e giriş yapılıyor...');
  const token = await tokenAl(env);
  console.log('Giriş başarılı. Kodlar kontrol ediliyor...\n');

  const acilacak = [];
  for (const kart of KARTLAR) {
    const mevcut = await kodlaAra(token, firma, kart.code);
    if (mevcut.length > 0) {
      console.log(`  ${kart.code}  zaten var → ${mevcut[0].attributes.name} (atlanacak)`);
    } else {
      console.log(`  ${kart.code}  AÇILACAK → ${kart.name}  (KDV %${kart.vat_rate})`);
      acilacak.push(kart);
    }
  }

  if (acilacak.length === 0) {
    console.log('\nYedi kartın hepsi zaten var. Yapılacak bir şey yok.\n');
    return;
  }

  console.log(`\n${acilacak.length} yeni ürün kartı açılacak. Birim: Adet, para birimi: TL, stok takibi: kapalı.`);
  console.log('Başka hiçbir şey değiştirilmeyecek.\n');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const cevap = (await rl.question('Devam edilsin mi? [e/h] ')).trim().toLowerCase();
  rl.close();
  if (cevap !== 'e') {
    console.log('\nİptal edildi. Paraşüt\'e hiçbir şey yazılmadı.\n');
    return;
  }

  console.log('');
  for (const kart of acilacak) {
    const yeni = await kartOlustur(token, firma, kart);
    console.log(`  ${kart.code}  açıldı (Paraşüt no: ${yeni.id})`);
  }

  console.log('\nSon kontrol yapılıyor...\n');
  let sorunVar = false;
  for (const kart of KARTLAR) {
    const bulunan = await kodlaAra(token, firma, kart.code);
    const k = bulunan[0] && bulunan[0].attributes;
    if (bulunan.length !== 1 || Number(k.vat_rate) !== kart.vat_rate) {
      sorunVar = true;
      console.log(`  ${kart.code}  SORUN — ${bulunan.length} kart bulundu${k ? `, KDV %${Number(k.vat_rate)}` : ''}`);
    } else {
      console.log(`  ${kart.code}  tamam → ${k.name}  (KDV %${Number(k.vat_rate)})`);
    }
  }
  console.log(sorunVar ? '\nBazı kartlarda sorun var, bu ekranı Claude\'a gönderin.\n' : '\nYedi kartın hepsi hazır.\n');
}

main().catch((e) => hata(e.message));
