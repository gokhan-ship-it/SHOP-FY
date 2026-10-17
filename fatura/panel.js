#!/usr/bin/env node
// Fatura Paneli: tarayıcıda açılan, sadece bu bilgisayarda çalışan arayüz.
// Terminal komutuyla (fatura.js) aynı motoru kullanır; aynı güvenlik kuralları geçerlidir.
//
// Güvenlik:
//   - Sadece 127.0.0.1'den bağlantı kabul eder (ağdaki başka cihazlar erişemez).
//   - Her açılışta rastgele bir oturum anahtarı üretir; her istek bunu taşımalı
//     (başka bir web sitesinin arka planda panele istek atmasını engeller).
//   - Paraşüt'e yazma sadece önizlemesi yapılmış ve onaylanmış plan için çalışır.
//   - Şifreler tarayıcıya hiç gönderilmez.
//
// Başlatma: node panel.js   (Masaüstündeki "Fatura Paneli" simgesi bunu yapar)

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn, execFile } = require('child_process');
const { envOku, KullaniciHatasi } = require('./ortak');
const H = require('./hesap');
const M = require('./motor');

const PORT = Number(process.env.FATURA_PANEL_PORT || 4545);
const ADRES = `http://127.0.0.1:${PORT}`;
const ANAHTAR = crypto.randomBytes(24).toString('hex');
const BOSTA_KAPANMA_MS = 45 * 60 * 1000;
const PLAN_GECERLILIK_MS = 30 * 60 * 1000;
const BAGLANTI_YENILEME_MS = 90 * 60 * 1000; // Paraşüt token'ı 2 saat geçerli

let sonIstek = Date.now();
let baglanti = null;
let baglantiZamani = 0;
let is = null; // { id, tur, durum, adimlar[], ilerleme, sonuc, hata }
let sonPlan = null; // { id, zaman, plan, kullanildi }

// ---------------------------------------------------------------- yardımcılar

async function baglantiAl() {
  if (!baglanti || Date.now() - baglantiZamani > BAGLANTI_YENILEME_MS) {
    baglanti = await M.baglan(envOku());
    baglantiZamani = Date.now();
  }
  return baglanti;
}

function isBaslat(tur, calistir) {
  if (is && is.durum === 'calisiyor') throw new KullaniciHatasi('Başka bir işlem sürüyor, bitmesini bekleyin.');
  is = { id: crypto.randomBytes(6).toString('hex'), tur, durum: 'calisiyor', adimlar: [], ilerleme: null, sonuc: null, hata: null, basladi: Date.now() };
  const mevcut = is;
  const adim = (m) => { mevcut.adimlar.push(m); if (mevcut.adimlar.length > 300) mevcut.adimlar.shift(); };
  calistir(mevcut, adim)
    .then((sonuc) => { mevcut.sonuc = sonuc; mevcut.durum = 'bitti'; })
    .catch((e) => {
      mevcut.hata = e instanceof KullaniciHatasi ? e.message : `Beklenmeyen hata: ${e.message}`;
      mevcut.durum = 'hata';
      if (!(e instanceof KullaniciHatasi)) console.error(e);
      baglanti = null; // bir sonraki işlemde yeniden bağlan
    });
  return { isId: mevcut.id };
}

// Son kesilen sipariş ve önerilen tarih aralığı (kaldığı yerden devam).
async function sonKesilenBul() {
  const kayit = M.kayitOku();
  let enBuyuk = null;
  for (const [no, v] of Object.entries(kayit)) {
    if (v.durum !== 'tamam' && v.durum !== 'elle') continue;
    if (!enBuyuk || M.siparisNo(no) > M.siparisNo(enBuyuk.no)) enBuyuk = { no, ...v };
  }
  if (!enBuyuk) return null;
  let tarih = enBuyuk.siparis_tarihi || M.ayarOku().sonKesilenTarih?.[enBuyuk.no] || null;
  if (!tarih) {
    try {
      const b = await baglantiAl();
      const [s] = await M.siparisleriGetir(b, { siparisler: [enBuyuk.no] });
      tarih = M.turkiyeTarihi(s.createdAt);
      M.ayarYaz({ sonKesilenTarih: { [enBuyuk.no]: tarih } });
    } catch { /* bağlantı yoksa tarih bilinmiyor */ }
  }
  return { no: enBuyuk.no, tarih, durum: enBuyuk.durum };
}

function durum() {
  const kayit = M.kayitOku();
  const ayar = M.ayarOku();
  return {
    bugun: M.bugun(),
    baslangic: { siparis: M.BASLANGIC_SIPARIS, tarih: M.BASLANGIC_TARIHI },
    takili: M.takiliKayitlar(kayit),
    kesilenSayisi: Object.values(kayit).filter((v) => v.durum === 'tamam').length,
    sonOran: ayar.sonOran || null,
    sonCalisma: ayar.sonCalisma || null,
    kategoriler: M.KATEGORI_SECENEKLERI,
    guncelleme: guncellemeBul(),
    is: is && { id: is.id, tur: is.tur, durum: is.durum },
  };
}

// ---------------------------------------------------------------- güncelleme

const PROGRAM_DOSYALARI = /^(?:[\w-]+\.js|panel\.html|il-ilce\.json|KULLANIM\.md)$/;

// İndirilenler'deki en yeni "SHOP-FY-..." klasörü (bu panelin kendi klasörü hariç).
function guncellemeBul() {
  const indirilen = path.join(os.homedir(), 'Downloads');
  const kendi = path.resolve(__dirname, '..');
  let enYeni = null;
  try {
    for (const ad of fs.readdirSync(indirilen)) {
      if (!/^SHOP-FY/i.test(ad)) continue;
      const tam = path.join(indirilen, ad);
      if (path.resolve(tam) === kendi) continue;
      const motor = path.join(tam, 'fatura', 'motor.js');
      if (!fs.existsSync(motor)) continue;
      const zaman = fs.statSync(motor).mtimeMs;
      if (!enYeni || zaman > enYeni.zaman) enYeni = { klasor: tam, zaman };
    }
  } catch { return null; }
  if (!enYeni) return null;
  const kaynak = path.join(enYeni.klasor, 'fatura');
  const dosyaFarkli = fs.readdirSync(kaynak).some((f) => {
    if (!PROGRAM_DOSYALARI.test(f)) return false;
    const hedef = path.join(__dirname, f);
    return !fs.existsSync(hedef) || !fs.readFileSync(hedef).equals(fs.readFileSync(path.join(kaynak, f)));
  });
  // Ürün eşlemesi panelden de değiştiği için birebir karşılaştırılmaz: sadece yeni ürün var mı?
  let yeniUrunVar = false;
  try {
    const mevcut = M.eslesmeOku();
    yeniUrunVar = Object.keys(JSON.parse(fs.readFileSync(path.join(kaynak, 'urun-kodlari.json'), 'utf8'))).some((v) => !mevcut[v]);
  } catch { /* dosya yoksa önemli değil */ }
  const yeniMi = dosyaFarkli || yeniUrunVar;
  return yeniMi ? { klasor: path.basename(enYeni.klasor), tarih: new Date(enYeni.zaman).toISOString() } : null;
}

function guncellemeYukle() {
  const bilgi = guncellemeBul();
  if (!bilgi) throw new KullaniciHatasi('İndirilenler klasöründe yeni bir sürüm bulunamadı.');
  const kaynak = path.join(os.homedir(), 'Downloads', bilgi.klasor, 'fatura');
  const kopyalanan = [];
  for (const f of fs.readdirSync(kaynak)) {
    if (!PROGRAM_DOSYALARI.test(f)) continue;
    const icerik = fs.readFileSync(path.join(kaynak, f));
    const hedef = path.join(__dirname, f);
    if (fs.existsSync(hedef) && fs.readFileSync(hedef).equals(icerik)) continue;
    fs.writeFileSync(hedef + '.yeni', icerik);
    fs.renameSync(hedef + '.yeni', hedef);
    kopyalanan.push(f);
  }
  // Ürün eşlemesi: panelden yaptığınız atamalar korunur, yeni sürümdeki eklemeler katılır.
  const yeniEslesme = JSON.parse(fs.readFileSync(path.join(kaynak, 'urun-kodlari.json'), 'utf8'));
  const mevcut = M.eslesmeOku();
  let eklenen = 0;
  for (const [vid, kat] of Object.entries(yeniEslesme)) if (!mevcut[vid]) { mevcut[vid] = kat; eklenen++; }
  if (eklenen) M.guvenliYaz(M.DOSYA.eslesme, mevcut);
  return { kopyalanan, eklenenUrun: eklenen };
}

function yenidenBaslat() {
  setTimeout(() => {
    sunucu.close();
    spawn(process.execPath, [__filename, '--yeniden'], { cwd: __dirname, detached: true, stdio: 'ignore' }).unref();
    process.exit(0);
  }, 300);
}

// ---------------------------------------------------------------- API

async function api(yol, govde) {
  switch (yol) {
    case 'GET /api/durum':
      return durum();

    case 'GET /api/son-kesilen':
      return { sonKesilen: await sonKesilenBul() };

    case 'GET /api/is':
      if (!is) return { is: null };
      return { is: { id: is.id, tur: is.tur, durum: is.durum, adimlar: is.adimlar.slice(-12), ilerleme: is.ilerleme, sonuc: is.sonuc, hata: is.hata } };

    case 'POST /api/onizle': {
      const oran = H.oranOku(govde.oran);
      if (oran === null) throw new KullaniciHatasi('İşçilik oranını yazın (örnek: 5 veya 4,5).');
      M.tarihAraligiDogrula(govde.bas, govde.bit);
      return isBaslat('onizle', async (j, adim) => {
        adim('Paraşüt ve Shopify\'a bağlanılıyor');
        const b = await baglantiAl();
        const siparisler = await M.siparisleriGetir(b, { bas: govde.bas, bit: govde.bit }, adim);
        adim(`${siparisler.length} sipariş okundu, fatura planı hazırlanıyor`);
        const plan = await M.planla(b, siparisler, oran, adim);
        const gorulen = new Set(plan.atlanan.flatMap((a) => a.vidler || []));
        adim('Yeni ürünler kontrol ediliyor');
        const yeniUrunler = await M.yeniUrunleriBul(b, gorulen);
        sonPlan = { id: crypto.randomBytes(8).toString('hex'), zaman: Date.now(), plan, kullanildi: false, aralik: { bas: govde.bas, bit: govde.bit } };
        return { planId: sonPlan.id, aralik: sonPlan.aralik, ...M.planOzeti(plan), yeniUrunler };
      });
    }

    case 'POST /api/kes': {
      if (!sonPlan || sonPlan.id !== govde.planId) throw new KullaniciHatasi('Bu önizleme artık geçerli değil. Lütfen yeniden önizleyin.');
      if (sonPlan.kullanildi) throw new KullaniciHatasi('Bu önizlemedeki faturalar zaten oluşturuldu.');
      if (Date.now() - sonPlan.zaman > PLAN_GECERLILIK_MS) throw new KullaniciHatasi('Önizleme 30 dakikadan eski. Lütfen yeniden önizleyin.');
      if (!sonPlan.plan.hazir.length) throw new KullaniciHatasi('Kesilecek fatura yok.');
      sonPlan.kullanildi = true;
      const plan = sonPlan.plan;
      const aralik = sonPlan.aralik;
      return isBaslat('kes', async (j, adim) => {
        const b = await baglantiAl();
        j.ilerleme = { i: 0, n: plan.hazir.length };
        const sonuc = await M.uygula(b, plan, ({ i, n, no, durum: d, mesaj }) => {
          j.ilerleme = { i, n };
          adim(`${i} / ${n} — ${no}: ${d === 'tamam' ? 'tamam' : d.toUpperCase()} (${mesaj})`);
        });
        M.ayarYaz({ sonOran: plan.oran / 100, sonCalisma: new Date().toISOString() });
        const rapor = M.raporYaz({ kaynak: aralik, oran: plan.oran / 100, ...sonuc, atlanan: plan.atlanan.map(({ vidler, ...a }) => a) });
        return { ...sonuc, rapor: path.basename(rapor) };
      });
    }

    case 'POST /api/yeni-urunler':
      return isBaslat('yeni-urun', async (j, adim) => {
        adim('Shopify ürün kataloğu okunuyor');
        const b = await baglantiAl();
        return { yeniUrunler: await M.yeniUrunleriBul(b) };
      });

    case 'POST /api/kategori':
      if (!Array.isArray(govde.atamalar) || !govde.atamalar.length) throw new KullaniciHatasi('Kategori seçilmedi.');
      sonPlan = null; // eşleme değişti, eski önizleme geçersiz
      return { sonuc: M.kategoriAta(govde.atamalar) };

    case 'POST /api/elle':
      return { sonuc: M.elleKesildiIsaretle(M.siparisListesiCoz(govde.metin)) };

    case 'POST /api/guncelle': {
      if (is && is.durum === 'calisiyor') throw new KullaniciHatasi('İşlem sürerken güncelleme yapılamaz.');
      const sonuc = guncellemeYukle();
      yenidenBaslat();
      return sonuc;
    }

    case 'POST /api/kapat':
      setTimeout(() => process.exit(0), 200);
      return { tamam: true };

    default:
      return undefined;
  }
}

// ---------------------------------------------------------------- sunucu

function gonderJson(res, kod, veri) {
  const metin = JSON.stringify(veri);
  res.writeHead(kod, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(metin);
}

const sunucu = http.createServer(async (req, res) => {
  sonIstek = Date.now();
  // Sadece bu bilgisayardan, panelin kendi adresinden gelen istekler.
  if (req.socket.remoteAddress !== '127.0.0.1' && req.socket.remoteAddress !== '::ffff:127.0.0.1') { res.writeHead(403); return res.end(); }
  if (req.headers.host !== `127.0.0.1:${PORT}` && req.headers.host !== `localhost:${PORT}`) { res.writeHead(403); return res.end(); }

  const url = new URL(req.url, ADRES);
  if (req.method === 'GET' && url.pathname === '/') {
    const html = fs.readFileSync(path.join(__dirname, 'panel.html'), 'utf8').replace('__ANAHTAR__', ANAHTAR);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
      'X-Frame-Options': 'DENY',
    });
    return res.end(html);
  }
  if (!url.pathname.startsWith('/api/')) { res.writeHead(404); return res.end(); }
  if (req.headers['x-panel-anahtar'] !== ANAHTAR) return gonderJson(res, 403, { hata: 'Panel oturumu geçersiz. Sayfayı yenileyin.' });

  let govde = {};
  if (req.method === 'POST') {
    let ham = '';
    for await (const parca of req) { ham += parca; if (ham.length > 1e6) { res.writeHead(413); return res.end(); } }
    try { govde = ham ? JSON.parse(ham) : {}; } catch { return gonderJson(res, 400, { hata: 'Geçersiz istek.' }); }
  }
  try {
    const sonuc = await api(`${req.method} ${url.pathname}`, govde);
    if (sonuc === undefined) return gonderJson(res, 404, { hata: 'Bulunamadı' });
    gonderJson(res, 200, sonuc);
  } catch (e) {
    if (!(e instanceof KullaniciHatasi)) console.error(e);
    gonderJson(res, 400, { hata: e instanceof KullaniciHatasi ? e.message : `Beklenmeyen hata: ${e.message}` });
  }
});

function tarayicidaAc() {
  if (process.env.FATURA_PANEL_TARAYICI === '0') return;
  const komut = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  execFile(komut, [ADRES], () => {});
}

sunucu.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    // Panel zaten açık: sadece tarayıcıda göster.
    tarayicidaAc();
    setTimeout(() => process.exit(0), 500);
    return;
  }
  console.error(e);
  process.exit(1);
});

sunucu.listen(PORT, '127.0.0.1', () => {
  console.log(`Fatura Paneli çalışıyor: ${ADRES}`);
  if (!process.argv.includes('--yeniden')) tarayicidaAc();
});

// Uzun süre kullanılmazsa kendiliğinden kapanır (işlem sürüyorsa beklemez).
setInterval(() => {
  if (Date.now() - sonIstek > BOSTA_KAPANMA_MS && !(is && is.durum === 'calisiyor')) process.exit(0);
}, 60 * 1000).unref();
