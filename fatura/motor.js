// Fatura motoru: siparişleri okur, fatura planı hazırlar, onaydan sonra Paraşüt'e
// TASLAK fatura yazar. Hem komut satırı (fatura.js) hem panel (panel.js) bunu kullanır.
//
// Değişmez kurallar (CLAUDE.md):
//   - Resmileştirme yok: ortak.js/gonder() sadece /contacts ve /sales_invoices POST eder.
//   - Mevcut faturaya dokunulmaz.
//   - Yazmadan önce kayıt "isleniyor" olarak tutulur; kopan bağlantıda otomatik tekrar yok.
//   - Fatura toplamı Shopify tutarına kuruşu kuruşuna eşit değilse sipariş atlanır.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { hata, tokenAl, getir, gonder } = require('./ortak');
const { shopifyTokenAl, sonSiparisler, siparisGetir, gunSiparisleri, katalog } = require('./shopify');
const H = require('./hesap');
const { ilIlceBul } = require('./adres');

const KLASOR = __dirname;
const DOSYA = {
  kayit: path.join(KLASOR, 'invoices.json'),
  musteri: path.join(KLASOR, 'musteriler.json'),
  eslesme: path.join(KLASOR, 'urun-kodlari.json'),
  urunNot: path.join(KLASOR, 'urun-notlari.json'),
  ayar: path.join(KLASOR, 'ayarlar.json'),
  raporlar: path.join(KLASOR, 'raporlar'),
};

const KATEGORI = {
  BLK: { ad: 'Bileklik', iscilik: 'BLK-01', gumus: 'BLK-02' },
  KLY: { ad: 'Kolye', iscilik: 'KLY-01', gumus: 'KLY-02' },
  CRM: { ad: 'Charm', iscilik: 'CRM-01', gumus: 'CRM-02' },
  KZK: { ad: 'Klasik Zaman Kapsülü', tek: 'KZK-01' },
};
const URUN_KODLARI = ['BLK-01', 'BLK-02', 'KLY-01', 'KLY-02', 'CRM-01', 'CRM-02', 'KZK-01'];
const TCKN_BIREYSEL = '11111111111';
// Elle kesilen son fatura #13539'a ait (19.09.2026). Program #13540 ve sonrasını keser;
// öncesine hiçbir koşulda fatura kesmez.
const BASLANGIC_SIPARIS = 13540;
const BASLANGIC_TARIHI = '2026-09-19';
const EN_UZUN_ARALIK_GUN = 31;

// Shopify sipariş adları #14112'ye kadar "#14112", sonrasında "T714113" (ön ek "T7").
// Numara aynı sırayla devam ediyor; siparisNo ön eki atıp sıra numarasını verir.
const ON_EK_GECIS = 14113;
const siparisNo = (ad) => {
  const m = String(ad).trim().match(/^(?:#|T7)?(\d+)$/i);
  return m ? Number(m[1]) : Number(String(ad).replace(/\D/g, ''));
};
const siparisAdi = (n) => (n >= ON_EK_GECIS ? `T7${n}` : `#${n}`);
// Shopify'da seçeneği silinmiş ürünler siparişte seçenek numarası olmadan gelir;
// bunlar ürün adıyla eşlenir ("ad:astor - 316l cerrahi çelik").
const adAnahtari = (ad) => 'ad:' + String(ad).trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
const turkiyeTarihi = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date(iso));
const bugun = () => turkiyeTarihi(new Date().toISOString());
const gunEkle = (t, n) => turkiyeTarihi(new Date(Date.parse(t + 'T12:00:00+03:00') + n * 86400000).toISOString());
const tarihGoster = (t) => t.split('-').reverse().join('.');
const tutar = (para) => H.tlKurus(para.shopMoney.amount);
const oranGoster = (o) => (o / 100).toString().replace('.', ',');

// ---------------------------------------------------------------- dosyalar

const jsonOku = (dosya, bos) => (fs.existsSync(dosya) ? JSON.parse(fs.readFileSync(dosya, 'utf8')) : bos);
function guvenliYaz(dosya, veri) {
  const gecici = dosya + '.yeni';
  fs.writeFileSync(gecici, JSON.stringify(veri, null, 2));
  fs.renameSync(gecici, dosya);
}
const kayitOku = () => jsonOku(DOSYA.kayit, {});
const kayitYaz = (k) => guvenliYaz(DOSYA.kayit, k);
const musteriOku = () => jsonOku(DOSYA.musteri, {});
const eslesmeOku = () => jsonOku(DOSYA.eslesme, {});
const ayarOku = () => jsonOku(DOSYA.ayar, {});
const ayarYaz = (a) => guvenliYaz(DOSYA.ayar, { ...ayarOku(), ...a });
const epostaAnahtari = (e) => crypto.createHash('sha256').update(String(e).trim().toLowerCase()).digest('hex');

const takiliKayitlar = (kayit) => Object.entries(kayit).filter(([, v]) => v.durum === 'isleniyor')
  .map(([no, v]) => ({ no, zaman: v.zaman, not: v.not || 'fatura oluşup oluşmadığı bilinmiyor' }));

// "13565,13566", "14190-14197" veya "T714190" → ['#13565', 'T714190', ...]
function siparisListesiCoz(metin) {
  const liste = [];
  for (const parca of String(metin || '').split(',').map((x) => x.trim().replace(/#/g, '').replace(/T7(?=\d{5})/gi, '')).filter(Boolean)) {
    const m = parca.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) hata(`Anlaşılmadı: "${parca}". Örnek: 14190,14191 veya 14190-14197`);
    const bas = Number(m[1]), bit = Number(m[2] || m[1]);
    if (bit < bas || bit - bas > 500) hata(`Aralık hatalı: ${parca}`);
    for (let n = bas; n <= bit; n++) liste.push(siparisAdi(n));
  }
  if (!liste.length) hata('Sipariş numarası yazılmadı.');
  return liste;
}

// Elle faturalanan siparişleri yerel kayda "elle" olarak ekler.
function elleKesildiIsaretle(liste) {
  const kayit = kayitOku();
  const sonuc = [];
  for (const no of liste) {
    if (kayit[no]) { sonuc.push({ no, durum: 'zaten kayıtlı', onceki: kayit[no].durum }); continue; }
    kayit[no] = { durum: 'elle', zaman: new Date().toISOString() };
    sonuc.push({ no, durum: 'işaretlendi' });
  }
  kayitYaz(kayit);
  return sonuc;
}

function tarihAraligiDogrula(bas, bit) {
  const gecerli = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x));
  if (!gecerli(bas) || !gecerli(bit)) hata('Tarihi yıl-ay-gün yazın. Örnek: 2026-09-24');
  if (bit < bas) hata('Bitiş tarihi başlangıçtan önce olamaz.');
  if (bas < BASLANGIC_TARIHI) hata(`${tarihGoster(bas)} başlangıç tarihinden (${tarihGoster(BASLANGIC_TARIHI)}) önce. O günlerin faturaları elle kesildi.`);
  if (bit > bugun()) hata(`${tarihGoster(bit)} henüz gelmedi.`);
  if ((Date.parse(bit) - Date.parse(bas)) / 86400000 > EN_UZUN_ARALIK_GUN) hata(`En fazla ${EN_UZUN_ARALIK_GUN} günlük aralık işlenebilir.`);
}

// ---------------------------------------------------------------- bağlantı

async function baglan(env) {
  H.kendiniSina();
  const ptoken = await tokenAl(env);
  const firma = env.PARASUT_COMPANY_ID;
  const urunId = {};
  for (const kod of URUN_KODLARI) {
    const v = await getir(ptoken, `https://api.parasut.com/v4/${firma}/products?filter[code]=${encodeURIComponent(kod)}`);
    const bulunan = v.data.filter((u) => u.attributes.code === kod);
    if (bulunan.length !== 1) hata(`Paraşüt'te ${kod} kodlu ürün kartı ${bulunan.length === 0 ? 'bulunamadı' : 'birden fazla'}. Hiçbir şey yapılmadı.`);
    urunId[kod] = bulunan[0].id;
  }
  const stoken = await shopifyTokenAl(env);
  return { env, ptoken, firma, urunId, stoken };
}

// kaynak: { siparisler: ['#13575'] } | { bas, bit } | { adet }
async function siparisleriGetir(b, kaynak, ilerleme = () => {}) {
  if (kaynak.siparisler) {
    const liste = [];
    for (const no of kaynak.siparisler) {
      const s = await siparisGetir(b.env, b.stoken, no);
      if (!s) hata(`Shopify'da ${no} numaralı sipariş bulunamadı. Hiçbir şey yapılmadı.`);
      liste.push(s);
    }
    return liste;
  }
  if (kaynak.bas) {
    tarihAraligiDogrula(kaynak.bas, kaynak.bit);
    const liste = [];
    for (let g = kaynak.bas; g <= kaynak.bit; g = gunEkle(g, 1)) {
      ilerleme(`Shopify: ${tarihGoster(g)} siparişleri okunuyor`);
      liste.push(...(await gunSiparisleri(b.env, b.stoken, g)).filter((s) => turkiyeTarihi(s.createdAt) === g));
    }
    return liste;
  }
  return sonSiparisler(b.env, b.stoken, kaynak.adet || 10);
}

// ---------------------------------------------------------------- hesap

// Bir siparişi fatura satırlarına çevirir. Atlanacaksa { atla: 'sebep' } döner.
function siparisiHesapla(s, eslesme, oran) {
  if (s.cancelledAt) return { atla: 'iptal edilmiş' };
  if (s.test) return { atla: 'test siparişi' };
  if (s.displayFinancialStatus === 'REFUNDED' || s.displayFinancialStatus === 'PARTIALLY_REFUNDED' || tutar(s.totalRefundedSet) > 0) {
    return { atla: 'iade var' };
  }
  if (s.displayFinancialStatus !== 'PAID') return { atla: `ödeme durumu: ${s.displayFinancialStatus}` };
  if (s.currencyCode !== 'TRY') return { atla: `para birimi ${s.currencyCode}` };
  const ulke = (s.shippingAddress || s.billingAddress || {}).countryCodeV2;
  if (ulke !== 'TR') return { atla: `yurt dışı (${ulke || 'adres yok'})` };

  const gruplar = {};
  const bilinmeyen = [];
  const elle = [];
  for (const k of s.lineItems.nodes) {
    if (k.currentQuantity !== k.quantity) return { atla: `sipariş sonradan değiştirilmiş (${k.name})` };
    const vid = k.variant && k.variant.legacyResourceId;
    const kat = (vid && eslesme[vid]) || eslesme[adAnahtari(k.name)];
    if (kat === 'ELLE') { elle.push(k.name); continue; }
    if (!kat) {
      const birim = k.quantity ? H.kurusYaz(Math.round(tutar(k.originalTotalSet) / k.quantity)) : '0.00';
      bilinmeyen.push({ anahtar: vid || adAnahtari(k.name), ad: k.name, fiyat: birim, varyantYok: !vid });
      continue;
    }
    const net = tutar(k.originalTotalSet) - k.discountAllocations.reduce((t, d) => t + tutar(d.allocatedAmountSet), 0);
    if (!gruplar[kat]) gruplar[kat] = { kurus: 0, adet: 0, urunler: [] };
    gruplar[kat].kurus += net;
    gruplar[kat].adet += k.quantity;
    gruplar[kat].urunler.push(k.name);
  }
  if (bilinmeyen.length) return { atla: `kategorisi seçilmemiş ürün: ${bilinmeyen.map((x) => x.ad).join(', ')}`, bilinmeyenler: bilinmeyen };
  if (elle.length) return { atla: `elle kesilecek ürün: ${elle.join(', ')}` };

  const kargo = s.shippingLines.nodes.reduce((t, k) => t + tutar(k.discountedPriceSet), 0);
  const kategoriler = Object.keys(gruplar);
  if (kargo > 0) {
    // Bileklik/kolye/charm'ın hesabı aynı (işçilik %20 + gümüş %0): kargo ilkine eklenir.
    // Klasik (tamamı %20) başka bir grupla birlikteyse kargonun vergisi değişir → atlanır.
    let hedef = kategoriler[0];
    if (kategoriler.length > 1) {
      if (kategoriler.includes('KZK')) return { atla: `kargo (${H.tlGoster(kargo)} TL) Klasik ile diğer ürünler arasında nasıl dağıtılacak belli değil` };
      hedef = ['BLK', 'KLY', 'CRM'].find((k) => gruplar[k]);
    }
    gruplar[hedef].kurus += kargo;
    gruplar[hedef].kargo = kargo;
  }

  const siparisToplam = tutar(s.currentTotalPriceSet);
  const satirlar = [];
  for (const kat of ['BLK', 'KLY', 'CRM', 'KZK']) {
    const g = gruplar[kat];
    if (!g) continue;
    if (g.kurus <= 0) return { atla: `${KATEGORI[kat].ad} tutarı 0 TL` };
    if (kat === 'KZK') {
      const t = H.tamKdvli(g.kurus);
      if (t.kdvKurus !== t.parasutKdvKurus) return { atla: 'Paraşüt KDV yuvarlaması 1 kuruş farklı çıkabilir' };
      if (t.matrahKurus + t.kdvKurus !== g.kurus) return { atla: `Klasik satırı ${H.tlGoster(g.kurus)} TL'yi kuruşu kuruşuna tutmuyor` };
      satirlar.push({ grup: kat, kod: KATEGORI[kat].tek, birimOnbinde: t.matrahOnbinde, kdv: 20, netKurus: t.matrahKurus, kdvKurus: t.kdvKurus });
    } else {
      const a = H.ozelMatrahAyir(g.kurus, oran);
      if (a.kdvKurus !== a.parasutKdvKurus) return { atla: 'Paraşüt KDV yuvarlaması 1 kuruş farklı çıkabilir' };
      satirlar.push({ grup: kat, kod: KATEGORI[kat].iscilik, birimOnbinde: a.matrahOnbinde, kdv: 20, netKurus: a.matrahKurus, kdvKurus: a.kdvKurus });
      satirlar.push({ grup: kat, kod: KATEGORI[kat].gumus, birimOnbinde: a.gumusKurus * 100, kdv: 0, netKurus: a.gumusKurus, kdvKurus: 0 });
    }
  }

  // Paraşüt ara toplamı satır birim fiyatlarını yuvarlamadan toplayıp sonra yuvarlıyor
  // (#13820: 61,4417 + 184,3333 = 245,775 → 245,78; satır satır 245,77). Küsuratlar böyle
  // denk gelirse %20'lik satırların birim fiyatı 2 ondalıkla yazılır (184,33). Bu durumda
  // satır KDV'si = round(matrah_2ondalık × 0,20) — CLAUDE.md hesap sırasının 3. adımı;
  // ara toplam ve KDV kuruşu kuruşuna aynı kalır.
  let ikiOndalik = false;
  const yuvarlanmamisNet = Math.floor((2 * satirlar.reduce((t, x) => t + x.birimOnbinde, 0) + 100) / 200);
  if (yuvarlanmamisNet !== satirlar.reduce((t, x) => t + x.netKurus, 0)) {
    for (const x of satirlar) if (x.kdv) x.birimOnbinde = x.netKurus * 100;
    ikiOndalik = true;
  }
  if (satirlar.some((x) => x.kdv && H.yuvarlaBol(x.birimOnbinde * x.kdv, 10000) !== x.kdvKurus)) {
    return { atla: 'Paraşüt KDV yuvarlaması 1 kuruş farklı çıkabilir' };
  }

  const faturaToplam = satirlar.reduce((t, x) => t + x.netKurus + x.kdvKurus, 0);
  if (faturaToplam !== siparisToplam) {
    return { atla: `fatura toplamı (${H.tlGoster(faturaToplam)}) sipariş tutarını (${H.tlGoster(siparisToplam)}) tutmuyor` };
  }
  return { gruplar, satirlar, kargo, siparisToplam, faturaToplam, ikiOndalik, tarih: turkiyeTarihi(s.createdAt) };
}

function faturaJson(s, h, urunId, musteriId) {
  return {
    data: {
      type: 'sales_invoices',
      attributes: {
        item_type: 'invoice',
        description: `Shopify ${s.name}`,
        issue_date: h.tarih,
        due_date: h.tarih,
        currency: 'TRL',
      },
      relationships: {
        contact: { data: { type: 'contacts', id: musteriId } },
        details: {
          data: h.satirlar.map((x) => ({
            type: 'sales_invoice_details',
            attributes: { quantity: 1, unit_price: H.onbindeYaz(x.birimOnbinde), vat_rate: x.kdv },
            relationships: { product: { data: { type: 'products', id: urunId[x.kod] } } },
          })),
        },
      },
    },
  };
}

// Shopify fatura adresinden Paraşüt müşteri kartı. Alan adları gerçek bir Paraşüt
// müşteri kaydından doğrulandı (musteri-kesif.js). İl/ilçe: adres.js.
function musteriJson(s) {
  const b = s.billingAddress || {};
  const ad = [b.firstName, b.lastName].filter(Boolean).join(' ').trim() || b.company;
  const yer = ilIlceBul(b);
  const adres = [b.address1, b.address2, b.zip].filter(Boolean).join(' ').trim();
  return {
    yer,
    govde: {
      data: {
        type: 'contacts',
        attributes: {
          name: ad,
          // Müşterinin gerçek e-postası bilerek yazılmaz: müşteriye fatura e-postası gitmesin.
          // example.com e-posta almak için hiçbir zaman kullanılamayan, ayrılmış bir alan adıdır
          // (RFC 2606); bu adrese giden e-posta kimseye ulaşmaz.
          email: `siparis-${siparisNo(s.name)}@example.com`,
          contact_type: 'person',
          account_type: 'customer',
          tax_number: TCKN_BIREYSEL,
          city: yer.il,
          district: yer.ilce,
          address: adres,
          phone: b.phone || s.phone || null,
          is_abroad: false,
        },
      },
    },
  };
}

// ---------------------------------------------------------------- plan

// Paraşüt'te o günlerin faturalarının açıklamalarını okur (Katman 2).
async function parasutGunleri(b, tarihler, ilerleme = () => {}) {
  const aciklamalar = [];
  const gunluk = {};
  for (const t of tarihler) {
    ilerleme(`Paraşüt: ${tarihGoster(t)} faturaları kontrol ediliyor`);
    let sayfa = 1, toplamSayfa = 1;
    gunluk[t] = 0;
    do {
      const v = await getir(b.ptoken, `https://api.parasut.com/v4/${b.firma}/sales_invoices?filter[issue_date]=${t}&page[size]=25&page[number]=${sayfa}`);
      toplamSayfa = (v.meta && v.meta.total_pages) || 1;
      for (const f of v.data) {
        gunluk[t]++;
        if (f.attributes.description) aciklamalar.push(f.attributes.description);
      }
      sayfa++;
    } while (sayfa <= toplamSayfa);
  }
  return { aciklamalar, gunluk };
}

// Hiçbir şey yazmadan plan hazırlar.
// Dönüş: { oran, siparisSayisi, gunluk, hazir: [...], atlanan: [...], yeniMusteriSayisi }
async function planla(b, siparisler, oran, ilerleme = () => {}) {
  const eslesme = eslesmeOku();
  const kayit = kayitOku();
  const musteriler = musteriOku();
  const tarihler = [...new Set(siparisler.map((s) => turkiyeTarihi(s.createdAt)))].sort();
  const { aciklamalar, gunluk } = await parasutGunleri(b, tarihler, ilerleme);

  const hazir = [];
  const atlanan = [];
  for (const s of siparisler) {
    const ozet = { no: s.name, tarih: turkiyeTarihi(s.createdAt), tutar: tutar(s.currentTotalPriceSet), urunler: s.lineItems.nodes.map((k) => k.name) };
    const atla = (sebep, ek = {}) => atlanan.push({ ...ozet, sebep, ...ek });

    if (siparisNo(s.name) < BASLANGIC_SIPARIS || ozet.tarih < BASLANGIC_TARIHI) { atla(`#${BASLANGIC_SIPARIS - 1} ve öncesi elle faturalandı`, { tur: 'once' }); continue; }
    if (kayit[s.name]) {
      const k = kayit[s.name];
      atla(k.durum === 'elle' ? 'elle kesildi olarak işaretli' : `daha önce kesildi${k.fatura_id ? ' (Paraşüt no ' + k.fatura_id + ')' : ''}`, { tur: 'kesildi' });
      continue;
    }
    const noDeseni = new RegExp(`${s.name.replace(/[^\w#]/g, '')}(?!\\d)`);
    if (aciklamalar.some((a) => noDeseni.test(a))) { atla('Paraşüt\'te bu sipariş no ile fatura var', { tur: 'kesildi' }); continue; }

    const h = siparisiHesapla(s, eslesme, oran);
    if (h.atla) { atla(h.atla, h.bilinmeyenler ? { tur: 'yeni-urun', bilinmeyenler: h.bilinmeyenler } : { tur: 'kontrol' }); continue; }
    if (!s.email) { atla('siparişte e-posta yok, müşteri eşleştirilemez', { tur: 'kontrol' }); continue; }

    const musteriAnahtar = epostaAnahtari(s.email);
    const musteriId = musteriler[musteriAnahtar] || null;
    let yeniMusteri = null;
    let yer = null;
    if (!musteriId) {
      const m = musteriJson(s);
      if (!m.govde.data.attributes.name) { atla('siparişte müşteri adı yok', { tur: 'kontrol' }); continue; }
      yeniMusteri = m.govde;
      yer = m.yer;
    }
    hazir.push({
      ...ozet,
      kategoriler: Object.keys(h.gruplar).map((k) => KATEGORI[k].ad),
      gruplar: Object.fromEntries(Object.entries(h.gruplar).map(([k, g]) => [KATEGORI[k].ad, { kurus: g.kurus, kargo: g.kargo || 0, urunler: g.urunler }])),
      satirlar: h.satirlar.map((x) => ({ kod: x.kod, birim: H.onbindeYaz(x.birimOnbinde), kdv: x.kdv, net: x.netKurus, kdvTutar: x.kdvKurus })),
      musteri: musteriId ? { mevcut: true, id: musteriId } : { mevcut: false, il: yer.il, ilce: yer.ilce, eksik: yer.eksik, ilKaynak: yer.ilKaynak, ilceKaynak: yer.ilceKaynak },
      _ic: { s, h, musteriId, musteriAnahtar, yeniMusteri },
    });
  }
  const yeniMusteriSayisi = new Set(hazir.filter((p) => p._ic.yeniMusteri).map((p) => p._ic.musteriAnahtar)).size;
  return { oran, siparisSayisi: siparisler.length, gunluk, hazir, atlanan, yeniMusteriSayisi };
}

// Planı istemciye göndermek için iç alanlardan arındırır.
const planOzeti = (plan) => ({ ...plan, hazir: plan.hazir.map(({ _ic, ...p }) => p) });

// ---------------------------------------------------------------- yeni ürün

const KATEGORI_SECENEKLERI = {
  BLK: 'Bileklik (işçilik %20 + gümüş %0)',
  KLY: 'Kolye (işçilik %20 + gümüş %0)',
  CRM: 'Charm (işçilik %20 + gümüş %0)',
  KZK: 'Klasik Zaman Kapsülü (tek satır, %20)',
  ELLE: 'Program kesmesin, elle keseceğim',
};

// Shopify etiketinden / ürün adından kategori tahmini ("zaman kapsülü bileklik" → BLK).
function adEtiketTahmini(urun) {
  const metin = [urun.title, ...(urun.tags || [])].join(' | ').toLocaleLowerCase('tr-TR');
  if (/klasik zaman kaps/.test(metin)) return 'KZK';
  if (/bileklik|zincir/.test(metin)) return 'BLK';
  if (/kolye/.test(metin)) return 'KLY';
  if (/charm/.test(metin)) return 'CRM';
  return null;
}

// Ürün adından kategori önerisi. Sadece öneri; son karar kullanıcının.
function kategoriOner(urun, katalogListesi, eslesme) {
  const ad = urun.title;
  const kucukHarf = (x) => x.trim().toLocaleLowerCase('tr-TR');
  const urunKategorisi = (p) => {
    const kats = new Set(p.variants.nodes.map((v) => eslesme[v.legacyResourceId]).filter((k) => k && k !== 'ELLE'));
    if (kats.size === 1) return [...kats][0];
    return kats.size === 0 ? adEtiketTahmini(p) : null;
  };
  // "Kral" → "Kral Zincir", "Classic Ocean Blue" → "Ocean Blue"
  const urununKategorisi = (baslik) => {
    const b = kucukHarf(baslik);
    if (!b) return null;
    const tekler = katalogListesi.filter((p) => !/couple|\+/i.test(p.title));
    const bulunan = tekler.find((p) => kucukHarf(p.title) === b)
      || tekler.find((p) => kucukHarf(p.title).split(' ')[0] === b.split(' ')[0] && kucukHarf(p.title).startsWith(b))
      || tekler.filter((p) => b.includes(kucukHarf(p.title))).sort((x, y) => y.title.length - x.title.length)[0]
      || tekler.find((p) => kucukHarf(p.title).split(' ')[0] === b.split(' ')[0]);
    return bulunan ? urunKategorisi(bulunan) : null;
  };
  if (ad.includes('+')) {
    // "Astor + Chloe Couple Zaman Kapsülü" → ["Astor", "Chloe"]
    const parcalar = ad.split('+').map((x) => x.replace(/couple.*$/i, '').replace(/zaman kaps[uü]l[uü].*$/i, '').replace(/kişi\/.*$/i, '').trim());
    const kats = parcalar.map(urununKategorisi);
    const bilinen = kats.filter(Boolean);
    if (!bilinen.length) return { kategori: null, neden: 'setin içeriği tanınamadı' };
    if (new Set(bilinen).size === 1 && bilinen.length === kats.length) {
      return { kategori: bilinen[0], neden: `setteki ürünlerin hepsi ${KATEGORI[bilinen[0]].ad.toLocaleLowerCase('tr-TR')}` };
    }
    // Bileklik, kolye ve charm'ın fatura hesabı aynı (işçilik %20 + gümüş %0); sadece
    // Paraşüt'teki ürün kartı farklı. Karışık set ilk ürünün kartına yazılır.
    return { kategori: bilinen[0], neden: `karışık set; tutar hesabı aynı, ${parcalar[kats.indexOf(bilinen[0])]} ürününün kartına yazılır` };
  }
  // Aynı ürünün başka seçeneği eşlenmişse onu öner ("Rose Pink - 316L Çelik" → Rose Pink'in gümüşü KLY)
  const kardes = new Set((urun.variants ? urun.variants.nodes : []).map((v) => eslesme[v.legacyResourceId]).filter((k) => k && k !== 'ELLE'));
  if (kardes.size === 1) return { kategori: [...kardes][0], neden: 'aynı ürünün diğer seçeneğiyle aynı' };
  const tahmin = adEtiketTahmini(urun);
  if (tahmin) return { kategori: tahmin, neden: (urun.tags || []).length ? 'ürün adı / Shopify etiketi' : 'ürün adı' };
  const tekKelime = urununKategorisi(ad.replace(/couple/i, '').trim());
  if (tekKelime) return { kategori: tekKelime, neden: 'aynı adlı ürünle aynı' };
  return { kategori: null, neden: 'öneri yok' };
}

// Eşleme tablosunda olmayan ürünler:
//  - Shopify kataloğundaki aktif ürün seçenekleri,
//  - taslak/arşivdeki ürünlerden siparişte görülenler,
//  - siparişte görülüp katalogda hiç bulunmayanlar (silinmiş ürün/seçenek; adıyla eşlenir).
// gorulenler: Map(anahtar → { ad, fiyat }) (eski kullanım için Set(vid) de olur)
async function yeniUrunleriBul(b, gorulenler = new Map()) {
  if (gorulenler instanceof Set) gorulenler = new Map([...gorulenler].map((v) => [v, {}]));
  const eslesme = eslesmeOku();
  const liste = await katalog(b.env, b.stoken);
  const yeni = [];
  const eklenen = new Set();
  for (const urun of liste) {
    for (const v of urun.variants.nodes) {
      const vid = v.legacyResourceId;
      if (eslesme[vid]) continue;
      if (urun.status !== 'ACTIVE' && !gorulenler.has(vid)) continue;
      const oneri = kategoriOner(urun, liste, eslesme);
      eklenen.add(vid);
      yeni.push({
        vid, urun: urun.title, secenek: v.title === 'Default Title' ? '' : v.title, fiyat: v.price,
        durum: urun.status, siparisteGoruldu: gorulenler.has(vid), oneri: oneri.kategori, oneriNedeni: oneri.neden,
      });
    }
  }
  for (const [anahtar, bilgi] of gorulenler) {
    if (eklenen.has(anahtar) || eslesme[anahtar]) continue;
    const ad = bilgi.ad || anahtar;
    const oneri = kategoriOner({ title: ad.replace(/\s+-\s+[^-]*$/, ''), tags: [] }, liste, eslesme);
    eklenen.add(anahtar);
    yeni.push({
      vid: anahtar, urun: ad, secenek: '', fiyat: bilgi.fiyat || '0',
      durum: 'YOK', siparisteGoruldu: true, oneri: oneri.kategori, oneriNedeni: oneri.neden,
    });
  }
  return yeni;
}

// atamalar: [{ vid, kategori, ad }]. Sadece eşlenmemiş seçenekler atanabilir;
// mevcut eşlemeyi değiştirmek bilinçli bir karar olduğu için burada yapılmaz.
function kategoriAta(atamalar) {
  const eslesme = eslesmeOku();
  const notlar = jsonOku(DOSYA.urunNot, {});
  const sonuc = [];
  for (const { vid, kategori, ad } of atamalar) {
    if (!/^\d+$/.test(String(vid)) && !/^ad:[^\n]{1,200}$/.test(String(vid))) hata(`Geçersiz ürün no: ${vid}`);
    if (!KATEGORI_SECENEKLERI[kategori]) hata(`Geçersiz kategori: ${kategori}`);
    if (eslesme[vid]) { sonuc.push({ vid, durum: 'zaten eşli', kategori: eslesme[vid] }); continue; }
    eslesme[vid] = kategori;
    notlar[vid] = { ad: String(ad || '').slice(0, 200), kategori, zaman: new Date().toISOString() };
    sonuc.push({ vid, durum: 'eklendi', kategori });
  }
  guvenliYaz(DOSYA.eslesme, eslesme);
  guvenliYaz(DOSYA.urunNot, notlar);
  return sonuc;
}

// ---------------------------------------------------------------- yazma

// Onaylanmış planı Paraşüt'e yazar. ilerleme({ i, n, no, durum, mesaj })
async function uygula(b, plan, ilerleme = () => {}) {
  const takili = takiliKayitlar(kayitOku());
  if (takili.length) hata(`Yarıda kalmış kayıt var (${takili.map((t) => t.no).join(', ')}). Çözülmeden gerçek fatura kesilmez.`);

  const kayit = kayitOku();
  const musteriler = musteriOku();
  const sonuc = { tamam: [], hata: [], belirsiz: [], zatenVar: [] };
  let i = 0;
  for (const p of plan.hazir) {
    i++;
    const { s, h, musteriAnahtar, yeniMusteri } = p._ic;
    const no = s.name;
    const bildir = (durum, mesaj) => ilerleme({ i, n: plan.hazir.length, no, durum, mesaj });

    // Plan hazırlandıktan sonra başka bir çalıştırma kesmiş olabilir.
    if (kayit[no]) { sonuc.zatenVar.push({ no }); bildir('atlandi', 'bu arada kesilmiş'); continue; }

    // Önce "isleniyor" olarak kaydet, sonra yaz (kopan bağlantıda mükerrer fatura olmasın).
    kayit[no] = { durum: 'isleniyor', zaman: new Date().toISOString(), siparis_tarihi: h.tarih, tutar: H.kurusYaz(h.siparisToplam) };
    kayitYaz(kayit);

    // Aynı müşterinin bu çalıştırmada ikinci siparişi varsa az önce açılan kartı kullan.
    let musteriId = p._ic.musteriId || musteriler[musteriAnahtar];
    if (!musteriId) {
      const r = await gonder(b.ptoken, `https://api.parasut.com/v4/${b.firma}/contacts`, yeniMusteri);
      if (r.reddedildi) {
        delete kayit[no]; kayitYaz(kayit);
        sonuc.hata.push({ no, sebep: 'müşteri kartı açılamadı', mesaj: r.mesaj });
        bildir('hata', 'müşteri kartı açılamadı');
        continue;
      }
      if (r.belirsiz) {
        kayit[no].not = 'müşteri kartı açılırken bağlantı koptu, fatura oluşturulmadı';
        kayitYaz(kayit);
        sonuc.belirsiz.push({ no, mesaj: r.mesaj });
        bildir('belirsiz', 'bağlantı sorunu');
        continue;
      }
      musteriId = r.veri.data.id;
      musteriler[musteriAnahtar] = musteriId;
      guvenliYaz(DOSYA.musteri, musteriler);
      kayit[no].musteri_id = musteriId;
      kayitYaz(kayit);
    }

    const r = await gonder(b.ptoken, `https://api.parasut.com/v4/${b.firma}/sales_invoices`, faturaJson(s, h, b.urunId, musteriId));
    if (r.reddedildi) {
      delete kayit[no]; kayitYaz(kayit);
      sonuc.hata.push({ no, sebep: 'Paraşüt faturayı kabul etmedi', mesaj: r.mesaj });
      bildir('hata', 'Paraşüt faturayı kabul etmedi');
      continue;
    }
    if (r.belirsiz) {
      kayit[no].not = 'fatura gönderilirken bağlantı koptu — Paraşüt\'te oluşmuş olabilir';
      kayitYaz(kayit);
      sonuc.belirsiz.push({ no, mesaj: r.mesaj });
      bildir('belirsiz', 'bağlantı sorunu');
      continue;
    }

    const f = r.veri.data;
    const parasutToplam = H.tlKurus(Number(f.attributes.net_total).toFixed(2));
    kayit[no] = { ...kayit[no], durum: 'tamam', fatura_id: f.id, parasut_toplam: H.kurusYaz(parasutToplam) };
    delete kayit[no].not;
    kayitYaz(kayit);
    const ilceEksik = p.musteri && !p.musteri.mevcut && p.musteri.eksik.length > 0;
    const kayitSonuc = { no, id: f.id, tutar: parasutToplam, ilceEksik };
    if (parasutToplam !== h.siparisToplam) {
      sonuc.tamam.push({ ...kayitSonuc, uyari: `Paraşüt ${H.tlGoster(parasutToplam)} / Shopify ${H.tlGoster(h.siparisToplam)}` });
      bildir('uyari', 'tutar farklı, taslağı kontrol edin');
    } else {
      sonuc.tamam.push(kayitSonuc);
      bildir('tamam', `${H.tlGoster(parasutToplam)} TL`);
    }
  }
  return sonuc;
}

function raporYaz(veri) {
  fs.mkdirSync(DOSYA.raporlar, { recursive: true });
  const dosya = path.join(DOSYA.raporlar, `${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)}.json`);
  fs.writeFileSync(dosya, JSON.stringify(veri, null, 2));
  return dosya;
}

module.exports = {
  KATEGORI, KATEGORI_SECENEKLERI, BASLANGIC_SIPARIS, BASLANGIC_TARIHI, DOSYA,
  siparisNo, siparisAdi, adAnahtari, ON_EK_GECIS, turkiyeTarihi, bugun, gunEkle, tarihGoster, oranGoster,
  kayitOku, kayitYaz, musteriOku, eslesmeOku, ayarOku, ayarYaz, guvenliYaz, jsonOku,
  takiliKayitlar, siparisListesiCoz, elleKesildiIsaretle, tarihAraligiDogrula,
  yeniUrunleriBul, kategoriAta, kategoriOner,
  baglan, siparisleriGetir, siparisiHesapla, planla, planOzeti, uygula, raporYaz,
};
