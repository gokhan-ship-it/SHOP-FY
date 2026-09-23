#!/usr/bin/env node
// Shopify siparişlerinden Paraşüt taslak satış faturası hazırlar.
//
// AŞAMA 1: Sadece deneme (--dry-run). Paraşüt'e ve Shopify'a HİÇBİR ŞEY YAZMAZ.
// Son siparişleri okur, her biri için Paraşüt'e gönderilecek faturayı ekrana basar.
//
// Kullanım:
//   node fatura.js --dry-run            (son 10 sipariş)
//   node fatura.js --dry-run --adet 20

const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');
const { hata, envOku, tokenAl, getir } = require('./ortak');
const { shopifyTokenAl, sonSiparisler } = require('./shopify');
const H = require('./hesap');

const CIKTI_DOSYASI = path.join(__dirname, 'deneme-cikti.json');
const KAYIT_DOSYASI = path.join(__dirname, 'invoices.json');

const KATEGORI = {
  BLK: { ad: 'Bileklik', iscilik: 'BLK-01', gumus: 'BLK-02' },
  KLY: { ad: 'Kolye', iscilik: 'KLY-01', gumus: 'KLY-02' },
  CRM: { ad: 'Charm', iscilik: 'CRM-01', gumus: 'CRM-02' },
  KZK: { ad: 'Klasik Zaman Kapsülü', tek: 'KZK-01' },
};
const URUN_KODLARI = ['BLK-01', 'BLK-02', 'KLY-01', 'KLY-02', 'CRM-01', 'CRM-02', 'KZK-01'];

const turkiyeTarihi = (iso) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date(iso));
const tarihGoster = (t) => t.split('-').reverse().join('.');
const tutar = (para) => H.tlKurus(para.shopMoney.amount);

function argumanlar() {
  const a = process.argv.slice(2);
  if (!a.includes('--dry-run')) {
    hata('Şu an sadece deneme modu var. Şöyle çalıştırın:\n  node fatura.js --dry-run\n\nGerçek fatura kesme (Aşama 2) henüz yazılmadı.');
  }
  let adet = 10;
  const i = a.indexOf('--adet');
  if (i >= 0) {
    adet = Number(a[i + 1]);
    if (!Number.isInteger(adet) || adet < 1 || adet > 250) hata('--adet 1 ile 250 arasında bir sayı olmalı.');
  }
  return { adet };
}

async function oranSor() {
  const rl = readline.createInterface({ input: process.stdin });
  const satirlar = rl[Symbol.asyncIterator]();
  const sor = async (metin) => {
    process.stdout.write(metin);
    const { value, done } = await satirlar.next();
    if (done) hata('Cevap alınamadı, işlem durduruldu.');
    return value;
  };
  try {
    for (;;) {
      const oran = H.oranOku(await sor('Bu çalıştırmada uygulanacak işçilik oranı (%)? Örnek: 5 veya 4,5 → '));
      if (oran === null) { console.log('  Geçerli bir oran yazın (örnek: 5 veya 4,5).'); continue; }
      const onay = (await sor(`  Oran %${(oran / 100).toString().replace('.', ',')} olarak uygulanacak. Doğru mu? [e/h] `)).trim().toLowerCase();
      if (onay === 'e') return oran;
    }
  } finally {
    rl.close();
  }
}

// Bir siparişi fatura taslağına çevirir. Atlanacaksa { atla: 'sebep' } döner.
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
  for (const k of s.lineItems.nodes) {
    if (k.currentQuantity !== k.quantity) return { atla: `sipariş sonradan değiştirilmiş (${k.name})` };
    const vid = k.variant && k.variant.legacyResourceId;
    const kat = vid && eslesme[vid];
    if (!kat) { bilinmeyen.push(k.name); continue; }
    const net = tutar(k.originalTotalSet) - k.discountAllocations.reduce((t, d) => t + tutar(d.allocatedAmountSet), 0);
    if (!gruplar[kat]) gruplar[kat] = { kurus: 0, adet: 0, urunler: [] };
    gruplar[kat].kurus += net;
    gruplar[kat].adet += k.quantity;
    gruplar[kat].urunler.push(k.name);
  }
  if (bilinmeyen.length) return { atla: `eşleme tablosunda olmayan ürün: ${bilinmeyen.join(', ')}` };

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

async function main() {
  const { adet } = argumanlar();
  H.kendiniSina();
  console.log('Hesap testi geçti (1.898 / 2.199 / 2.299 TL örnekleri).\n');

  const env = envOku();
  const eslesme = JSON.parse(fs.readFileSync(path.join(__dirname, 'urun-kodlari.json'), 'utf8'));
  const kayit = fs.existsSync(KAYIT_DOSYASI) ? JSON.parse(fs.readFileSync(KAYIT_DOSYASI, 'utf8')) : {};

  const oran = await oranSor();

  console.log('\nParaşüt\'e giriş yapılıyor...');
  const ptoken = await tokenAl(env);
  const firma = env.PARASUT_COMPANY_ID;
  const urunId = {};
  for (const kod of URUN_KODLARI) {
    const v = await getir(ptoken, `https://api.parasut.com/v4/${firma}/products?filter[code]=${encodeURIComponent(kod)}`);
    const bulunan = v.data.filter((u) => u.attributes.code === kod);
    if (bulunan.length !== 1) hata(`Paraşüt'te ${kod} kodlu ürün kartı ${bulunan.length === 0 ? 'bulunamadı' : 'birden fazla'}. Hiçbir şey yapılmadı.`);
    urunId[kod] = bulunan[0].id;
  }
  console.log('7 ürün kartı bulundu.');

  console.log('Shopify\'a giriş yapılıyor...');
  const stoken = await shopifyTokenAl(env);
  const siparisler = await sonSiparisler(env, stoken, adet);
  console.log(`Son ${siparisler.length} sipariş okundu.\n`);

  // Katman 2: bu tarihlerde Paraşüt'te kesilmiş faturaların açıklamalarını oku.
  const tarihler = [...new Set(siparisler.map((s) => turkiyeTarihi(s.createdAt)))];
  const parasutAciklamalar = [];
  const gunlukFatura = {};
  for (const t of tarihler) {
    let sayfa = 1, toplamSayfa = 1;
    gunlukFatura[t] = 0;
    do {
      const v = await getir(ptoken, `https://api.parasut.com/v4/${firma}/sales_invoices?filter[issue_date]=${t}&page[size]=25&page[number]=${sayfa}`);
      toplamSayfa = (v.meta && v.meta.total_pages) || 1;
      for (const f of v.data) {
        gunlukFatura[t]++;
        if (f.attributes.description) parasutAciklamalar.push(f.attributes.description);
      }
      sayfa++;
    } while (sayfa <= toplamSayfa);
  }

  const hazir = [];
  const atlanan = [];
  let sira = 0;
  for (const s of siparisler) {
    sira++;
    const baslik = `[${sira}/${siparisler.length}] ${s.name} — ${tarihGoster(turkiyeTarihi(s.createdAt))} — ${H.tlGoster(tutar(s.currentTotalPriceSet))} TL`;
    console.log('─'.repeat(70));
    console.log(baslik);

    if (kayit[s.name]) {
      console.log(`  ATLANDI: yerel kayıtta var (durum: ${kayit[s.name].durum})`);
      atlanan.push({ siparis: s.name, sebep: 'yerel kayıtta zaten var' });
      continue;
    }
    const noDeseni = new RegExp(`${s.name.replace(/[^\w#]/g, '')}(?!\\d)`);
    if (parasutAciklamalar.some((a) => noDeseni.test(a))) {
      console.log('  ATLANDI: Paraşüt\'te açıklamasında bu sipariş no geçen fatura var');
      atlanan.push({ siparis: s.name, sebep: 'Paraşüt\'te zaten faturası var' });
      continue;
    }

    const h = siparisiHesapla(s, eslesme, oran);
    if (h.atla) {
      console.log(`  ATLANDI: ${h.atla}`);
      atlanan.push({ siparis: s.name, sebep: h.atla });
      continue;
    }

    for (const kat of Object.keys(h.gruplar)) {
      const g = h.gruplar[kat];
      const kargoNot = g.kargo ? ` (${H.tlGoster(g.kargo)} TL kargo dahil)` : '';
      console.log(`  ${KATEGORI[kat].ad}: ${H.tlGoster(g.kurus)} TL${kargoNot} ← ${g.urunler.join(' + ')}`);
    }
    for (const x of h.satirlar) {
      const kdvNot = x.kdv ? ` + ${H.tlGoster(x.kdvKurus)} KDV` : '';
      console.log(`    ${x.kod}  birim fiyat ${H.onbindeYaz(x.birimOnbinde).replace('.', ',')}  KDV %${x.kdv}  → ${H.tlGoster(x.netKurus)}${kdvNot}`);
    }
    console.log(`  Fatura toplamı: ${H.tlGoster(h.faturaToplam)} TL = Shopify tutarı ✓`);

    let musteriId = '(Aşama 2\'de belirlenecek)';
    if (s.email) {
      const c = await getir(ptoken, `https://api.parasut.com/v4/${firma}/contacts?filter[email]=${encodeURIComponent(s.email)}`);
      if (c.data.length === 1) { musteriId = c.data[0].id; console.log(`  Müşteri: Paraşüt'te e-postayla bulundu (no: ${musteriId})`); }
      else if (c.data.length > 1) { console.log(`  Müşteri: Paraşüt'te bu e-postayla ${c.data.length} kayıt var — Aşama 2'de elle seçilmeli`); }
      else console.log('  Müşteri: Paraşüt\'te yok, Aşama 2\'de yeni açılacak (TCKN 11111111111)');
    } else {
      console.log('  Müşteri: Shopify e-posta vermedi (izin eksik olabilir)');
    }

    const json = faturaJson(s, h, urunId, musteriId);
    console.log('  Paraşüt\'e gidecek fatura:');
    console.log(JSON.stringify(json, null, 2).split('\n').map((l) => '    ' + l).join('\n'));
    hazir.push({ siparis: s.name, tutar: H.kurusYaz(h.siparisToplam), fatura: json });
  }

  console.log('═'.repeat(70));
  console.log('ÖZET (deneme — Paraşüt\'e hiçbir şey yazılmadı)');
  console.log(`  Oran: %${(oran / 100).toString().replace('.', ',')}`);
  for (const t of tarihler) console.log(`  ${tarihGoster(t)} tarihinde Paraşüt'te zaten ${gunlukFatura[t]} fatura var`);
  console.log(`  Kesilebilecek taslak fatura: ${hazir.length}`);
  console.log(`  Atlanacak: ${atlanan.length}`);
  for (const a of atlanan) console.log(`    ${a.siparis}: ${a.sebep}`);

  fs.writeFileSync(CIKTI_DOSYASI, JSON.stringify({ oran: oran / 100, hazir, atlanan }, null, 2));
  console.log(`\nAyrıntılar şu dosyaya kaydedildi: ${CIKTI_DOSYASI}\n`);
}

main().catch((e) => hata(e.message));
