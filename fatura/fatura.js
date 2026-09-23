#!/usr/bin/env node
// Shopify siparişlerinden Paraşüt TASLAK satış faturası oluşturur.
// Resmileştirme YAPMAZ (e-arşiv / e-fatura çağrısı yok). Mevcut faturaya dokunmaz.
// Paraşüt'e yazmadan önce ne yapacağını gösterir ve onay ister.
//
// Kullanım:
//   node fatura.js --dry-run                    son 10 sipariş, hiçbir şey yazmaz
//   node fatura.js --dry-run --adet 20
//   node fatura.js --siparis 13575              tek sipariş için taslak fatura
//   node fatura.js --siparis 13575,13576        birden fazla sipariş
//   node fatura.js --siparis 13575 --dry-run    tek siparişin denemesi

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { hata, envOku, tokenAl, getir, gonder } = require('./ortak');
const { shopifyTokenAl, sonSiparisler, siparisGetir } = require('./shopify');
const H = require('./hesap');
const { ilIlce } = require('./iller');

const CIKTI_DOSYASI = path.join(__dirname, 'deneme-cikti.json');
const KAYIT_DOSYASI = path.join(__dirname, 'invoices.json');

const KATEGORI = {
  BLK: { ad: 'Bileklik', iscilik: 'BLK-01', gumus: 'BLK-02' },
  KLY: { ad: 'Kolye', iscilik: 'KLY-01', gumus: 'KLY-02' },
  CRM: { ad: 'Charm', iscilik: 'CRM-01', gumus: 'CRM-02' },
  KZK: { ad: 'Klasik Zaman Kapsülü', tek: 'KZK-01' },
};
const URUN_KODLARI = ['BLK-01', 'BLK-02', 'KLY-01', 'KLY-02', 'CRM-01', 'CRM-02', 'KZK-01'];
const TCKN_BIREYSEL = '11111111111';

const turkiyeTarihi = (iso) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date(iso));
const tarihGoster = (t) => t.split('-').reverse().join('.');
const tutar = (para) => H.tlKurus(para.shopMoney.amount);
const oranGoster = (o) => (o / 100).toString().replace('.', ',');

function argumanlar() {
  const a = process.argv.slice(2);
  const deneme = a.includes('--dry-run');
  let siparisler = null;
  const s = a.indexOf('--siparis');
  if (s >= 0) {
    const liste = (a[s + 1] || '').split(',').map((x) => x.trim().replace(/^#/, '')).filter(Boolean);
    if (!liste.length || liste.some((x) => !/^\d+$/.test(x))) hata('--siparis sonrasına sipariş numarası yazın. Örnek: --siparis 13575');
    if (liste.length > 20) hata('Şimdilik en fazla 20 sipariş birden işlenebilir.');
    siparisler = liste.map((x) => `#${x}`);
  }
  if (!deneme && !siparisler) {
    hata('Nasıl çalıştırılır:\n  node fatura.js --dry-run            (deneme, hiçbir şey yazmaz)\n  node fatura.js --siparis 13575     (tek sipariş için taslak fatura)');
  }
  let adet = 10;
  const i = a.indexOf('--adet');
  if (i >= 0) {
    adet = Number(a[i + 1]);
    if (!Number.isInteger(adet) || adet < 1 || adet > 250) hata('--adet 1 ile 250 arasında bir sayı olmalı.');
  }
  return { deneme, siparisler, adet };
}

// Tüm çalıştırma boyunca tek bir okuyucu (yapıştırılan cevaplar kaybolmasın diye).
const rl = readline.createInterface({ input: process.stdin });
const satirOkuyucu = rl[Symbol.asyncIterator]();
async function sor(metin) {
  process.stdout.write(metin);
  const { value, done } = await satirOkuyucu.next();
  if (done) hata('Cevap alınamadı, işlem durduruldu.');
  return value.trim();
}

async function oranSor() {
  for (;;) {
    const oran = H.oranOku(await sor('Bu çalıştırmada uygulanacak işçilik oranı (%)? Örnek: 5 veya 4,5 → '));
    if (oran === null) { console.log('  Geçerli bir oran yazın (örnek: 5 veya 4,5).'); continue; }
    if ((await sor(`  Oran %${oranGoster(oran)} olarak uygulanacak. Doğru mu? [e/h] `)).toLowerCase() === 'e') return oran;
  }
}

// Kayıt defteri (Katman 1). Her yazmada dosya baştan, güvenli şekilde yazılır.
function kayitOku() {
  return fs.existsSync(KAYIT_DOSYASI) ? JSON.parse(fs.readFileSync(KAYIT_DOSYASI, 'utf8')) : {};
}
function kayitYaz(kayit) {
  const gecici = KAYIT_DOSYASI + '.yeni';
  fs.writeFileSync(gecici, JSON.stringify(kayit, null, 2));
  fs.renameSync(gecici, KAYIT_DOSYASI);
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

// Shopify fatura adresinden Paraşüt müşteri kartı. Alan adları gerçek bir Paraşüt
// müşteri kaydından doğrulandı (musteri-kesif.js). İl/ilçe için iller.js'e bakın.
function musteriJson(s) {
  const b = s.billingAddress || {};
  const ad = [b.firstName, b.lastName].filter(Boolean).join(' ').trim() || b.company || s.email;
  const { il, ilce } = ilIlce(b.city, b.province);
  const adres = [b.address1, b.address2, b.zip].filter(Boolean).join(' ').trim();
  return {
    data: {
      type: 'contacts',
      attributes: {
        name: ad,
        email: s.email,
        contact_type: 'person',
        account_type: 'customer',
        tax_number: TCKN_BIREYSEL,
        city: il,
        district: ilce,
        address: adres,
        phone: b.phone || s.phone || null,
        is_abroad: false,
      },
    },
  };
}

async function main() {
  const { deneme, siparisler: istenen, adet } = argumanlar();
  H.kendiniSina();
  console.log('Hesap testi geçti (1.898 / 2.199 / 2.299 TL örnekleri).');
  console.log(deneme ? 'MOD: DENEME — Paraşüt\'e hiçbir şey yazılmayacak.\n' : 'MOD: GERÇEK — onayınızdan sonra Paraşüt\'te TASLAK fatura oluşturulacak.\n');

  const env = envOku();
  const eslesme = JSON.parse(fs.readFileSync(path.join(__dirname, 'urun-kodlari.json'), 'utf8'));
  const kayit = kayitOku();

  // Katman 1: yarıda kalmış kayıt varsa hiçbir şey yapma, kullanıcıya göster.
  const takili = Object.entries(kayit).filter(([, v]) => v.durum === 'isleniyor');
  if (takili.length && !deneme) {
    console.log('DİKKAT: Önceki bir çalıştırmada yarıda kalmış siparişler var:');
    for (const [no, v] of takili) console.log(`  ${no} (${v.zaman}) — ${v.not || 'fatura oluşup oluşmadığı bilinmiyor'}`);
    console.log('\nBu siparişlerin Paraşüt\'te faturası oluşmuş mu, elle kontrol edin.');
    console.log('Kontrol ettikten sonra invoices.json dosyasında bu satırları Claude ile birlikte düzeltin.\n');
    hata('Yarıda kalmış kayıtlar çözülmeden gerçek fatura kesilmez.');
  }

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
  let siparisler;
  if (istenen) {
    siparisler = [];
    for (const no of istenen) {
      const s = await siparisGetir(env, stoken, no);
      if (!s) hata(`Shopify'da ${no} numaralı sipariş bulunamadı. Hiçbir şey yapılmadı.`);
      siparisler.push(s);
    }
  } else {
    siparisler = await sonSiparisler(env, stoken, adet);
  }
  console.log(`${siparisler.length} sipariş okundu.\n`);

  // Katman 2: bu tarihlerde Paraşüt'teki faturaların açıklamalarını oku.
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

  // Her sipariş için planı hazırla (henüz hiçbir şey yazılmaz).
  const plan = [];
  const atlanan = [];
  let sira = 0;
  for (const s of siparisler) {
    sira++;
    console.log('─'.repeat(70));
    console.log(`[${sira}/${siparisler.length}] ${s.name} — ${tarihGoster(turkiyeTarihi(s.createdAt))} — ${H.tlGoster(tutar(s.currentTotalPriceSet))} TL`);
    const atla = (sebep) => { console.log(`  ATLANDI: ${sebep}`); atlanan.push({ siparis: s.name, sebep }); };

    if (kayit[s.name]) { atla(`yerel kayıtta var (durum: ${kayit[s.name].durum}${kayit[s.name].fatura_id ? ', fatura no ' + kayit[s.name].fatura_id : ''})`); continue; }
    const noDeseni = new RegExp(`${s.name.replace(/[^\w#]/g, '')}(?!\\d)`);
    if (parasutAciklamalar.some((a) => noDeseni.test(a))) { atla('Paraşüt\'te açıklamasında bu sipariş no geçen fatura var'); continue; }

    const h = siparisiHesapla(s, eslesme, oran);
    if (h.atla) { atla(h.atla); continue; }

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

    if (!s.email) { atla('siparişte e-posta yok, müşteri eşleştirilemez'); continue; }
    const c = await getir(ptoken, `https://api.parasut.com/v4/${firma}/contacts?filter[email]=${encodeURIComponent(s.email)}`);
    const eslesen = c.data.filter((k) => (k.attributes.email || '').toLowerCase() === s.email.toLowerCase());
    let musteriId = null;
    let yeniMusteri = null;
    if (eslesen.length > 1) { atla(`Paraşüt'te bu e-postayla ${eslesen.length} müşteri var, hangisi olduğu belli değil`); continue; }
    if (eslesen.length === 1) {
      musteriId = eslesen[0].id;
      console.log(`  Müşteri: Paraşüt'te mevcut (no: ${musteriId})`);
    } else {
      yeniMusteri = musteriJson(s);
      const m = yeniMusteri.data.attributes;
      console.log(`  Müşteri: YENİ açılacak — TCKN ${m.tax_number}, il: ${m.city || '(boş)'}, ilçe: ${m.district || '(boş)'}`);
    }
    plan.push({ s, h, musteriId, yeniMusteri });
  }

  console.log('═'.repeat(70));
  console.log(`Oran: %${oranGoster(oran)}`);
  for (const t of tarihler) console.log(`${tarihGoster(t)} tarihinde Paraşüt'te zaten ${gunlukFatura[t]} fatura var`);
  console.log(`Kesilecek taslak fatura: ${plan.length}`);
  console.log(`Atlanacak: ${atlanan.length}`);
  for (const a of atlanan) console.log(`  ${a.siparis}: ${a.sebep}`);
  const yeniSayisi = plan.filter((p) => p.yeniMusteri).length;
  if (yeniSayisi) console.log(`Açılacak yeni müşteri kartı: ${yeniSayisi}`);

  if (deneme) {
    const hazir = plan.map((p) => ({ siparis: p.s.name, tutar: H.kurusYaz(p.h.siparisToplam), fatura: faturaJson(p.s, p.h, urunId, p.musteriId || '(yeni müşteri)') }));
    fs.writeFileSync(CIKTI_DOSYASI, JSON.stringify({ oran: oran / 100, hazir, atlanan }, null, 2));
    console.log(`\nDENEME — Paraşüt'e hiçbir şey yazılmadı. Ayrıntılar: ${CIKTI_DOSYASI}\n`);
    rl.close();
    return;
  }
  if (!plan.length) { console.log('\nKesilecek fatura yok.\n'); rl.close(); return; }

  console.log(`\nTahmini süre: ~${Math.ceil((plan.length * 3 * 1.3) / 60)} dakika`);
  const onay = await sor(`\n${plan.length} TASLAK fatura Paraşüt'te oluşturulsun mu? (Resmileştirme yapılmaz.) [e/h] `);
  rl.close();
  if (onay.toLowerCase() !== 'e') { console.log('\nİptal edildi. Paraşüt\'e hiçbir şey yazılmadı.\n'); return; }

  const sonuc = { tamam: [], hata: [], belirsiz: [] };
  let i = 0;
  for (const p of plan) {
    i++;
    const no = p.s.name;
    process.stdout.write(`${i} / ${plan.length} — ${no}... `);

    // Önce "isleniyor" olarak kaydet, sonra yaz (kopan bağlantıda mükerrer fatura olmasın).
    kayit[no] = { durum: 'isleniyor', zaman: new Date().toISOString(), tutar: H.kurusYaz(p.h.siparisToplam) };
    kayitYaz(kayit);

    let musteriId = p.musteriId;
    if (!musteriId) {
      const r = await gonder(ptoken, `https://api.parasut.com/v4/${firma}/contacts`, p.yeniMusteri);
      if (r.reddedildi) {
        delete kayit[no]; kayitYaz(kayit);
        console.log('HATA (müşteri açılamadı)'); console.log(`   ${r.mesaj}`);
        sonuc.hata.push({ no, sebep: 'müşteri açılamadı' });
        continue;
      }
      if (r.belirsiz) {
        kayit[no].not = 'müşteri kartı açılırken bağlantı koptu, fatura oluşturulmadı';
        kayitYaz(kayit);
        console.log('BELİRSİZ (bağlantı sorunu)');
        sonuc.belirsiz.push({ no, sebep: r.mesaj });
        continue;
      }
      musteriId = r.veri.data.id;
      kayit[no].musteri_id = musteriId;
      kayitYaz(kayit);
    }

    const r = await gonder(ptoken, `https://api.parasut.com/v4/${firma}/sales_invoices`, faturaJson(p.s, p.h, urunId, musteriId));
    if (r.reddedildi) {
      delete kayit[no]; kayitYaz(kayit);
      console.log('HATA (Paraşüt faturayı kabul etmedi)'); console.log(`   ${r.mesaj}`);
      sonuc.hata.push({ no, sebep: 'Paraşüt faturayı kabul etmedi' });
      continue;
    }
    if (r.belirsiz) {
      kayit[no].not = 'fatura gönderilirken bağlantı koptu — Paraşüt\'te oluşmuş olabilir';
      kayitYaz(kayit);
      console.log('BELİRSİZ (bağlantı sorunu)');
      sonuc.belirsiz.push({ no, sebep: r.mesaj });
      continue;
    }

    const f = r.veri.data;
    const parasutToplam = H.tlKurus(Number(f.attributes.net_total).toFixed(2));
    kayit[no] = { ...kayit[no], durum: 'tamam', fatura_id: f.id, parasut_toplam: H.kurusYaz(parasutToplam) };
    delete kayit[no].not;
    kayitYaz(kayit);
    if (parasutToplam !== p.h.siparisToplam) {
      console.log(`tamam AMA TUTAR FARKLI: Paraşüt ${H.tlGoster(parasutToplam)} / Shopify ${H.tlGoster(p.h.siparisToplam)} — taslağı kontrol edin (fatura no ${f.id})`);
      sonuc.tamam.push({ no, id: f.id, uyari: true });
    } else {
      console.log(`tamam (Paraşüt no ${f.id}, ${H.tlGoster(parasutToplam)} TL)`);
      sonuc.tamam.push({ no, id: f.id });
    }
  }

  console.log('═'.repeat(70));
  console.log('ÖZET');
  console.log(`  Oluşturulan taslak fatura: ${sonuc.tamam.length}`);
  const uyarili = sonuc.tamam.filter((x) => x.uyari);
  if (uyarili.length) console.log(`  Tutarı farklı çıkan (kontrol edin): ${uyarili.map((x) => x.no).join(', ')}`);
  console.log(`  Paraşüt'ün kabul etmediği: ${sonuc.hata.length}${sonuc.hata.length ? ' — ' + sonuc.hata.map((x) => x.no).join(', ') : ''}`);
  if (sonuc.belirsiz.length) {
    console.log(`  BELİRSİZ (Paraşüt'te elle kontrol edin): ${sonuc.belirsiz.map((x) => x.no).join(', ')}`);
  }
  console.log(`  Atlanan: ${atlanan.length}`);
  for (const a of atlanan) console.log(`    ${a.siparis}: ${a.sebep}`);
  console.log('\nTaslaklar Paraşüt\'te "Satışlar > Faturalar" altında. Resmileştirmeyi oradan elle yapın.\n');
}

main().catch((e) => hata(e.message));
