// Paraşüt'e bağlanmak için ortak yardımcılar. Okuma: getir(). Yazma: sadece gonder().
// Token'lar ekrana basılmaz, dosyaya yazılmaz.

const fs = require('fs');
const path = require('path');

const BEKLEME_MS = 1200; // 10 saniyede 10 istek limiti

function hata(mesaj) {
  console.error('\nHATA: ' + mesaj + '\n');
  process.exit(1);
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

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
  for (const k of ['PARASUT_CLIENT_ID', 'PARASUT_CLIENT_SECRET', 'PARASUT_USERNAME', 'PARASUT_PASSWORD', 'PARASUT_COMPANY_ID']) {
    if (!env[k]) hata(`.env içinde ${k} boş.`);
  }
  return env;
}

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
  return (await cevap.json()).access_token;
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

// Paraşüt'e YAZAN tek fonksiyon. Sadece müşteri ve taslak satış faturası oluşturabilir.
// Resmileştirme (e_archives / e_invoices) ve mevcut kayda dokunan her şey burada engellenir.
const IZINLI_YAZMA = /^https:\/\/api\.parasut\.com\/v4\/\d+\/(contacts|sales_invoices)$/;

async function gonder(token, url, govde) {
  if (!IZINLI_YAZMA.test(url) || /e_archives|e_invoices/.test(url)) {
    hata(`GÜVENLİK: izin verilmeyen yazma isteği engellendi: ${url}`);
  }
  if (govde && govde.data && govde.data.id) hata('GÜVENLİK: mevcut bir kaydı değiştirme isteği engellendi.');
  for (let deneme = 1; deneme <= 5; deneme++) {
    await bekle(BEKLEME_MS);
    let cevap;
    try {
      cevap = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(govde),
      });
    } catch (e) {
      // Bağlantı koptu: kayıt oluşmuş da olabilir, oluşmamış da. Tekrar DENEMEZ.
      return { belirsiz: true, mesaj: e.message };
    }
    if (cevap.status === 429) {
      console.log('  Paraşüt "yavaşla" dedi, 10 saniye bekleniyor...');
      await bekle(10000);
      continue;
    }
    const metin = await cevap.text();
    if (cevap.ok) return { ok: true, veri: JSON.parse(metin) };
    if (cevap.status >= 500) return { belirsiz: true, mesaj: `durum kodu ${cevap.status}: ${metin}` };
    return { reddedildi: true, mesaj: `durum kodu ${cevap.status}: ${metin}` };
  }
  return { reddedildi: true, mesaj: 'art arda hız limiti hatası' };
}

module.exports = { hata, envOku, tokenAl, getir, gonder };
