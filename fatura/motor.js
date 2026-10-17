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
const { shopifyTokenAl, sonSiparisler, siparisGetir, gunSiparisleri } = require('./shopify');
const H = require('./hesap');
const { ilIlceBul } = require('./adres');

const KLASOR = __dirname;
const DOSYA = {
  kayit: path.join(KLASOR, 'invoices.json'),
  musteri: path.join(KLASOR, 'musteriler.json'),
  eslesme: path.join(KLASOR, 'urun-kodlari.json'),
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

const siparisNo = (ad) => Number(String(ad).replace(/\D/g, ''));
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

// "13565,13566" veya "13577-13584" → ['#13565', ...]
function siparisListesiCoz(metin) {
  const liste = [];
  for (const parca of String(metin || '').split(',').map((x) => x.trim().replace(/#/g, '')).filter(Boolean)) {
    const m = parca.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) hata(`Anlaşılmadı: "${parca}". Örnek: 13565,13566 veya 13577-13584`);
    const bas = Number(m[1]), bit = Number(m[2] || m[1]);
    if (bit < bas || bit - bas > 500) hata(`Aralık hatalı: ${parca}`);
    for (let n = bas; n <= bit; n++) liste.push(`#${n}`);
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
    const kat = vid && eslesme[vid];
    if (kat === 'ELLE') { elle.push(k.name); continue; }
    if (!kat) { bilinmeyen.push(k.name); continue; }
    const net = tutar(k.originalTotalSet) - k.discountAllocations.reduce((t, d) => t + tutar(d.allocatedAmountSet), 0);
    if (!gruplar[kat]) gruplar[kat] = { kurus: 0, adet: 0, urunler: [] };
    gruplar[kat].kurus += net;
    gruplar[kat].adet += k.quantity;
    gruplar[kat].urunler.push(k.name);
  }
  if (bilinmeyen.length) return { atla: `eşleme tablosunda olmayan ürün: ${bilinmeyen.join(', ')}`, bilinmeyen: true };
  if (elle.length) return { atla: `elle kesilecek ürün: ${elle.join(', ')}` };

  const kargo = s.shippingLines.nodes.reduce((t, k) => t + tutar(k.discountedPriceSet), 0);
  const kategoriler = Object.keys(gruplar);
  if (kargo > 0) {
    if (kategoriler.length > 1) return { atla: `kargo (${H.tlGoster(kargo)} TL) birden fazla kategoriye nasıl dağıtılacak belli değil` };
    gruplar[kategoriler[0]].kurus += kargo;
    gruplar[kategoriler[0]].kargo = kargo;
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
  // (#13820: 61,4417 + 184,3333 = 245,775 → 245,78; satır satır 245,77). İki işçilik
  // satırının küsuratları böyle denk gelirse fatura 1 kuruş şaşar → sipariş atlanır.
  const yuvarlanmamisNet = Math.floor((2 * satirlar.reduce((t, x) => t + x.birimOnbinde, 0) + 100) / 200);
  if (yuvarlanmamisNet !== satirlar.reduce((t, x) => t + x.netKurus, 0)) {
    return { atla: 'Paraşüt toplamı 1 kuruş farklı çıkar (iki işçilik satırının küsuratı denk geliyor), elle kesin' };
  }

  const faturaToplam = satirlar.reduce((t, x) => t + x.netKurus + x.kdvKurus, 0);
  if (faturaToplam !== siparisToplam) {
    return { atla: `fatura toplamı (${H.tlGoster(faturaToplam)}) sipariş tutarını (${H.tlGoster(siparisToplam)}) tutmuyor` };
  }
  return { gruplar, satirlar, kargo, siparisToplam, faturaToplam, tarih: turkiyeTarihi(s.createdAt) };
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
    if (h.atla) { atla(h.atla, { tur: h.bilinmeyen ? 'yeni-urun' : 'kontrol' }); continue; }
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
  KATEGORI, BASLANGIC_SIPARIS, BASLANGIC_TARIHI, DOSYA,
  siparisNo, turkiyeTarihi, bugun, gunEkle, tarihGoster, oranGoster,
  kayitOku, kayitYaz, musteriOku, eslesmeOku, ayarOku, ayarYaz, guvenliYaz, jsonOku,
  takiliKayitlar, siparisListesiCoz, elleKesildiIsaretle, tarihAraligiDogrula,
  baglan, siparisleriGetir, siparisiHesapla, planla, planOzeti, uygula, raporYaz,
};
