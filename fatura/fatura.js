#!/usr/bin/env node
// Shopify siparişlerinden Paraşüt TASLAK satış faturası oluşturur (komut satırı).
// Aynı işi panel de yapar (panel.js); ikisi de motor.js'i kullanır.
// Resmileştirme YAPMAZ. Mevcut faturaya dokunmaz. Yazmadan önce onay ister.
//
// Kullanım:
//   node fatura.js --dun                           dünün tüm siparişleri
//   node fatura.js --tarih 2026-09-24              o günün tüm siparişleri
//   node fatura.js --tarih 2026-09-19:2026-09-22   birden fazla gün
//   node fatura.js --siparis 13575,13576           belirli siparişler
//   node fatura.js --dry-run                       son 10 sipariş, hiçbir şey yazmaz
//   (her komutun sonuna --dry-run eklenirse hiçbir şey yazmadan dener)
//   node fatura.js --elle-kesildi 13565,13577-13584   elle kesilenleri bildir

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { hata, hataBasVeCik, envOku } = require('./ortak');
const H = require('./hesap');
const M = require('./motor');

function argumanlar() {
  const a = process.argv.slice(2);
  const deger = (ad) => { const i = a.indexOf(ad); return i >= 0 ? a[i + 1] || '' : null; };
  const deneme = a.includes('--dry-run');
  const elle = deger('--elle-kesildi');
  if (elle !== null) return { elle: M.siparisListesiCoz(elle) };

  let kaynak = null;
  if (deger('--siparis') !== null) {
    const liste = M.siparisListesiCoz(deger('--siparis'));
    if (liste.length > 50) hata('En fazla 50 sipariş birden işlenebilir.');
    kaynak = { siparisler: liste };
  }
  if (deger('--tarih') !== null) {
    const [bas, bit = bas] = deger('--tarih').split(':');
    kaynak = { bas, bit };
  }
  if (a.includes('--dun')) { const d = M.gunEkle(M.bugun(), -1); kaynak = { bas: d, bit: d }; }
  if (!kaynak) {
    if (!deneme) hata('Nasıl çalıştırılır:\n  node fatura.js --dun\n  node fatura.js --tarih 2026-09-24\n  node fatura.js --siparis 13575\n  Sonuna --dry-run eklerseniz hiçbir şey yazmadan dener.');
    kaynak = { adet: Number(deger('--adet') || 10) };
  }
  if (kaynak.bas) M.tarihAraligiDogrula(kaynak.bas, kaynak.bit);
  return { deneme, kaynak };
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
    if ((await sor(`  Oran %${M.oranGoster(oran)} olarak uygulanacak. Doğru mu? [e/h] `)).toLowerCase() === 'e') return oran;
  }
}

function planiBas(plan, ayrinti) {
  const satir = (p) => `[${p.no}] ${M.tarihGoster(p.tarih)} — ${H.tlGoster(p.tutar)} TL`;
  for (const p of plan.hazir) {
    if (!ayrinti) {
      const ilce = p.musteri.mevcut ? '' : p.musteri.eksik.length ? `  ⚠ ${p.musteri.eksik.join(' ve ')} boş` : '';
      console.log(`  ✓ ${satir(p)}  ${p.kategoriler.join(' + ')}${p.musteri.mevcut ? '' : ' — yeni müşteri'}${ilce}`);
      continue;
    }
    console.log('─'.repeat(70));
    console.log(satir(p));
    for (const [ad, g] of Object.entries(p.gruplar)) {
      console.log(`  ${ad}: ${H.tlGoster(g.kurus)} TL${g.kargo ? ` (${H.tlGoster(g.kargo)} TL kargo dahil)` : ''} ← ${g.urunler.join(' + ')}`);
    }
    for (const x of p.satirlar) {
      console.log(`    ${x.kod}  birim fiyat ${x.birim.replace('.', ',')}  KDV %${x.kdv}  → ${H.tlGoster(x.net)}${x.kdv ? ` + ${H.tlGoster(x.kdvTutar)} KDV` : ''}`);
    }
    console.log(`  Fatura toplamı: ${H.tlGoster(p.tutar)} TL = Shopify tutarı ✓`);
    const m = p.musteri;
    console.log(m.mevcut ? `  Müşteri: daha önce bu program açmış (Paraşüt no: ${m.id})`
      : `  Müşteri: YENİ — il: ${m.il || '(boş)'}, ilçe: ${m.ilce || '(boş)'}${m.eksik.length ? '  ⚠ resmileştirirken seçin' : ''}`);
  }
  for (const a of plan.atlanan) console.log(`  – [${a.no}] ${M.tarihGoster(a.tarih)} — ${H.tlGoster(a.tutar)} TL  ATLANDI: ${a.sebep}`);

  console.log('═'.repeat(70));
  console.log(`${plan.siparisSayisi} sipariş bulundu`);
  console.log(`Uygulanacak oran: %${M.oranGoster(plan.oran)}`);
  for (const [t, n] of Object.entries(plan.gunluk)) console.log(`${M.tarihGoster(t)} tarihinde Paraşüt'te zaten ${n} fatura var`);
  const sayac = {};
  for (const a of plan.atlanan) {
    const kisa = a.sebep.replace(/\s*\(.*?\)/g, '').replace(/:.*$/, '').replace(/\s+/g, ' ').trim();
    sayac[kisa] = (sayac[kisa] || 0) + 1;
  }
  console.log(`Atlanacak: ${plan.atlanan.length}${plan.atlanan.length ? ' — ' + Object.entries(sayac).map(([k, v]) => `${v} sipariş (${k})`).join(', ') : ''}`);
  console.log(`Kesilecek taslak fatura: ${plan.hazir.length}`);
  if (plan.yeniMusteriSayisi) console.log(`Açılacak yeni müşteri kartı: ${plan.yeniMusteriSayisi}`);
  const ilcesiz = plan.hazir.filter((p) => !p.musteri.mevcut && p.musteri.eksik.length).map((p) => p.no);
  if (ilcesiz.length) console.log(`İl/ilçesi bulunamayan (resmileştirirken seçin): ${ilcesiz.join(', ')}`);
}

async function main() {
  const arg = argumanlar();
  if (arg.elle) {
    for (const r of M.elleKesildiIsaretle(arg.elle)) {
      console.log(r.durum === 'işaretlendi' ? `  ${r.no}: elle kesildi olarak işaretlendi, program bu siparişi atlayacak` : `  ${r.no}: zaten kayıtlı (durum: ${r.onceki}), değiştirilmedi`);
    }
    rl.close();
    return;
  }
  const { deneme, kaynak } = arg;
  console.log(deneme ? 'MOD: DENEME — Paraşüt\'e hiçbir şey yazılmayacak.\n' : 'MOD: GERÇEK — onayınızdan sonra Paraşüt\'te TASLAK fatura oluşturulacak.\n');

  const takili = M.takiliKayitlar(M.kayitOku());
  if (takili.length && !deneme) {
    console.log('DİKKAT: Önceki bir çalıştırmada yarıda kalmış siparişler var:');
    for (const t of takili) console.log(`  ${t.no} (${t.zaman}) — ${t.not}`);
    hata('Yarıda kalmış kayıtlar çözülmeden gerçek fatura kesilmez. Paraşüt\'te kontrol edip Claude\'a haber verin.');
  }

  const oran = await oranSor();
  console.log('\nParaşüt ve Shopify\'a bağlanılıyor...');
  const b = await M.baglan(envOku());
  const siparisler = await M.siparisleriGetir(b, kaynak);
  console.log(`${siparisler.length} sipariş okundu.\n`);
  const plan = await M.planla(b, siparisler, oran);
  planiBas(plan, !kaynak.bas);

  if (deneme) {
    const dosya = path.join(__dirname, 'deneme-cikti.json');
    fs.writeFileSync(dosya, JSON.stringify(M.planOzeti(plan), null, 2));
    console.log(`\nDENEME — Paraşüt'e hiçbir şey yazılmadı. Ayrıntılar: ${dosya}\n`);
    rl.close();
    return;
  }
  if (!plan.hazir.length) { console.log('\nKesilecek fatura yok.\n'); rl.close(); return; }

  const saniye = Math.ceil((plan.hazir.length + plan.yeniMusteriSayisi) * 1.4);
  console.log(`Tahmini süre: ~${saniye < 90 ? saniye + ' saniye' : Math.ceil(saniye / 60) + ' dakika'}`);
  const onay = await sor(`\n${plan.hazir.length} TASLAK fatura Paraşüt'te oluşturulsun mu? (Resmileştirme yapılmaz.) [e/h] `);
  rl.close();
  if (onay.toLowerCase() !== 'e') { console.log('\nİptal edildi. Paraşüt\'e hiçbir şey yazılmadı.\n'); return; }

  const sonuc = await M.uygula(b, plan, ({ i, n, no, durum, mesaj }) => {
    console.log(`${i} / ${n} — ${no}... ${durum === 'tamam' ? 'tamam' : durum.toUpperCase()} (${mesaj})`);
  });
  M.ayarYaz({ sonOran: oran / 100, sonCalisma: new Date().toISOString() });

  console.log('═'.repeat(70));
  console.log('ÖZET');
  console.log(`  Oluşturulan taslak fatura: ${sonuc.tamam.length}`);
  const uyarili = sonuc.tamam.filter((x) => x.uyari);
  if (uyarili.length) console.log(`  Tutarı farklı çıkan (kontrol edin): ${uyarili.map((x) => `${x.no} (${x.uyari})`).join(', ')}`);
  const ilcesiz = sonuc.tamam.filter((x) => x.ilceEksik).map((x) => x.no);
  if (ilcesiz.length) console.log(`  İl/ilçesi boş (resmileştirirken seçin): ${ilcesiz.join(', ')}`);
  console.log(`  Paraşüt'ün kabul etmediği: ${sonuc.hata.length}${sonuc.hata.length ? ' — ' + sonuc.hata.map((x) => `${x.no}: ${x.mesaj}`).join(' | ') : ''}`);
  if (sonuc.belirsiz.length) console.log(`  BELİRSİZ (Paraşüt'te elle kontrol edin): ${sonuc.belirsiz.map((x) => x.no).join(', ')}`);
  console.log(`  Atlanan: ${plan.atlanan.length}`);
  for (const a of plan.atlanan) console.log(`    ${a.no}: ${a.sebep}`);
  const rapor = M.raporYaz({ kaynak, oran: oran / 100, ...sonuc, atlanan: plan.atlanan });
  console.log(`\nRapor: ${rapor}`);
  console.log('Taslaklar Paraşüt\'te "Satışlar > Faturalar" altında. Resmileştirmeyi oradan elle yapın.\n');
}

main().catch((e) => { rl.close(); hataBasVeCik(e); });
