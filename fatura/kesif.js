#!/usr/bin/env node
// AŞAMA 0 — Paraşüt keşif betiği. SADECE OKUR (GET). Hiçbir şey oluşturmaz,
// değiştirmez, resmileştirmez. Token'lar ekrana basılmaz, dosyaya yazılmaz.
//
// Kullanım:
//   node kesif.js 2026-09-10     (faturanın düzenleme tarihi)

const fs = require('fs');
const path = require('path');

const ARANAN_FATURA = 'NX02026000000177';
const ARANAN_TUTAR = 1898;
const BEKLEME_MS = 1200; // 10 saniyede 10 istek limiti
const CIKTI_DOSYASI = path.join(__dirname, 'kesif-cikti.json');

function envOku() {
  const dosya = path.join(__dirname, '.env');
  if (!fs.existsSync(dosya)) {
    hata('.env dosyası bulunamadı. .env.ornek dosyasını kopyalayıp adını .env yapın ve doldurun.');
  }
  const env = {};
  for (const satir of fs.readFileSync(dosya, 'utf8').split(/\r?\n/)) {
    const m = satir.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  for (const k of ['PARASUT_CLIENT_ID', 'PARASUT_CLIENT_SECRET', 'PARASUT_USERNAME', 'PARASUT_PASSWORD']) {
    if (!env[k]) hata(`.env içinde ${k} boş.`);
  }
  return env;
}

function hata(mesaj) {
  console.error('\nHATA: ' + mesaj + '\n');
  process.exit(1);
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function tokenAl(env) {
  const govde = new URLSearchParams({
    grant_type: 'password',
    client_id: env.PARASUT_CLIENT_ID,
    client_secret: env.PARASUT_CLIENT_SECRET,
    username: env.PARASUT_USERNAME,
    password: env.PARASUT_PASSWORD,
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
  });
  const cevap = await fetch('https://api.parasut.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: govde,
  });
  if (!cevap.ok) {
    // Cevap gövdesi basılmaz; sadece durum kodu (sır sızmasın diye).
    hata(`Paraşüt girişi başarısız (durum kodu ${cevap.status}). Kullanıcı adı, şifre, client ID ve secret'ı kontrol edin.`);
  }
  const veri = await cevap.json();
  return veri.access_token;
}

async function getir(token, url) {
  for (let deneme = 1; deneme <= 5; deneme++) {
    await bekle(BEKLEME_MS);
    const cevap = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (cevap.status === 429) {
      console.log('  Paraşüt "yavaşla" dedi, 10 saniye bekleniyor...');
      await bekle(10000);
      continue;
    }
    const metin = await cevap.text();
    if (!cevap.ok) hata(`İstek başarısız (durum kodu ${cevap.status}):\n${metin}`);
    return JSON.parse(metin);
  }
  hata('Paraşüt art arda hız limiti hatası verdi, biraz sonra tekrar deneyin.');
}

async function main() {
  const tarih = process.argv[2];
  if (!tarih || !/^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
    hata('Faturanın tarihini yazın. Örnek: node kesif.js 2026-09-10');
  }

  const env = envOku();
  console.log('Paraşüt\'e giriş yapılıyor...');
  const token = await tokenAl(env);
  console.log('Giriş başarılı.');

  let firma = env.PARASUT_COMPANY_ID;
  if (!firma) {
    console.log('\nPARASUT_COMPANY_ID boş. Hesabınızın bilgileri aşağıda, firma numarasını buradan bulup .env dosyasına yazın:\n');
    const me = await getir(token, 'https://api.parasut.com/v4/me?include=companies');
    console.log(JSON.stringify(me, null, 2));
    return;
  }

  console.log(`${tarih} tarihli faturalar aranıyor...`);
  const include = 'details,details.product,active_e_document';
  const bulunanlar = [];
  let sayfa = 1;
  let toplamSayfa = 1;
  do {
    const url = `https://api.parasut.com/v4/${firma}/sales_invoices`
      + `?filter[issue_date]=${tarih}&include=${include}`
      + `&page[size]=25&page[number]=${sayfa}`;
    const veri = await getir(token, url);
    toplamSayfa = (veri.meta && veri.meta.total_pages) || 1;
    console.log(`  Sayfa ${sayfa}/${toplamSayfa}: ${veri.data.length} fatura`);

    for (const fatura of veri.data) {
      const ilgili = ilgiliKayitlar(fatura, veri.included || []);
      const hepsi = JSON.stringify([fatura, ilgili]);
      const tutar = Number(fatura.attributes && fatura.attributes.gross_total);
      if (hepsi.includes(ARANAN_FATURA) || tutar === ARANAN_TUTAR) {
        bulunanlar.push({ fatura, ilgili_kayitlar: ilgili });
      }
    }
    sayfa++;
  } while (sayfa <= toplamSayfa);

  if (bulunanlar.length === 0) {
    hata(`${tarih} tarihinde ${ARANAN_FATURA} numaralı veya ${ARANAN_TUTAR} TL tutarlı fatura bulunamadı. Tarihi kontrol edin.`);
  }

  const cikti = JSON.stringify(bulunanlar, null, 2);
  console.log(`\n${bulunanlar.length} eşleşen fatura bulundu:\n`);
  console.log(cikti);
  fs.writeFileSync(CIKTI_DOSYASI, cikti);
  console.log(`\nAynı bilgi şu dosyaya da kaydedildi: ${CIKTI_DOSYASI}`);
}

// Faturanın kalemlerini, ürünlerini ve e-belgesini "included" listesinden toplar.
function ilgiliKayitlar(fatura, included) {
  const bul = (tip, id) => included.find((k) => k.type === tip && k.id === id);
  const iliski = fatura.relationships || {};
  const sonuc = [];
  const detaylar = (iliski.details && iliski.details.data) || [];
  for (const ref of detaylar) {
    const kalem = bul(ref.type, ref.id);
    if (!kalem) continue;
    sonuc.push(kalem);
    const urunRef = kalem.relationships && kalem.relationships.product && kalem.relationships.product.data;
    const urun = urunRef && bul(urunRef.type, urunRef.id);
    if (urun) sonuc.push(urun);
  }
  const eRef = iliski.active_e_document && iliski.active_e_document.data;
  const eBelge = eRef && bul(eRef.type, eRef.id);
  if (eBelge) sonuc.push(eBelge);
  return sonuc;
}

main().catch((e) => hata(e.message));
