// node --test jantifox/test/  — editörün geometri ve iş kurallarını test eder
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ornekVeri, ornekVeriPiramitli } from './ornek-veri.mjs';

const kod = readFileSync(new URL('../assets/kisisel-editor.js', import.meta.url), 'utf8');
const ortam = { console, Date, Math, JSON, setTimeout };
ortam.window = ortam;
ortam.HTMLElement = class {};
ortam.customElements = { get: () => undefined, define: () => {} };
vm.createContext(ortam);
vm.runInContext(kod, ortam);
const ic = ortam.KisiselEditorIc;
const duz = (x) => JSON.parse(JSON.stringify(x));

const kur = (v) => {
  const m = new ic.Model(ornekVeri(v));
  return { m, y: new ic.Yerlesim(m) };
};
const tasarim = (m, isim, parcalar = []) => ({ setId: m.setler[0].id, isim, isimMerkez: null, parcalar });

test('ölçek: 25 cm daire, 40 cm çanta', () => {
  const { m } = kur();
  const alan = m.alanlar[0].sekil;
  assert.equal(alan.t, 'circle');
  assert.ok(Math.abs(alan.r * 2 - 25) < 0.01, 'çap ' + alan.r * 2);
});

test('Türkçe büyük harf: i → İ', () => {
  assert.equal(ic.buyukHarf('elif'), 'ELİF');
  assert.equal(ic.buyukHarf('ırmak'), 'IRMAK');
});

test('kapasite daire geometrisinden hesaplanır ve 2 satırı kullanır', () => {
  const { m, y } = kur();
  const set = m.setler[0];
  const k = y.kapasite(set);
  const tekSatir = (() => { let n = 0; for (let i = 1; i < 20; i++) if (y.isimDiz(i, set, 0, 0, 1) && y.isimSatiri(i, set) === 1) n = i; return n; })();
  console.log('tek satır en fazla:', tekSatir, '· iki satırla kapasite:', k);
  assert.ok(k > tekSatir, 'iki satır kapasiteyi artırmalı');
  assert.equal(y.isimSatiri(k + 1, set), 0);
});

test('ECE sığar, stok yeterli, engel yok', () => {
  const { m, y } = kur();
  const a = ic.isimAnaliz(m, y, tasarim(m, 'ECE'));
  assert.equal(a.engel, false);
  assert.equal(a.sigiyor, true);
});

test('ELİF: İ yok → I önerisi, engel var', () => {
  const { m, y } = kur();
  const a = ic.isimAnaliz(m, y, tasarim(m, 'ELİF'));
  assert.deepEqual(duz(a.eksikler.map((e) => [e.harf, e.oneri])), [['İ', 'I']]);
  assert.equal(a.engel, true);
});

test('Ç Ğ Ö Ş Ü önerileri', () => {
  const { m, y } = kur();
  const a = ic.isimAnaliz(m, y, tasarim(m, 'ÇĞÖŞÜ'));
  assert.deepEqual(a.eksikler.map((e) => e.oneri).join(''), 'CGOSU');
});

test('aynı harf stok kontrolü (YAY: Y stok 1)', () => {
  const v = ornekVeri();
  v.setler[0].varyantlar.find((x) => x.karakter === 'Y').stok = 1;
  const { m, y } = kur(v);
  const a = ic.isimAnaliz(m, y, tasarim(m, 'YAY'));
  assert.deepEqual(duz(a.stokSorunlari), [{ harf: 'Y', gereken: 2, mevcut: 1 }]);
});

test('uzun isim sığmaz, engel olur', () => {
  const { m, y } = kur();
  const a = ic.isimAnaliz(m, y, tasarim(m, 'ABDULKADIRCAN'));
  assert.equal(a.sigiyor, false);
  assert.equal(a.engel, true);
});

test('kalpler yüksekliği olmadığı için katalogdan düşer; kategori önceliği', () => {
  const { m } = kur();
  assert.equal(m.ikonHarita[1], undefined, 'yüksekliği olmayan kalp listelenmemeli');
  assert.equal(m.ikonHarita[5].kategori, 'Kalpler');
  assert.equal(m.ikonHarita[4].kategori, 'Diğer');
});

test('ECE + 7 + kalp: fiyat 4.650 TL (5 patch) ve parçalar çakışmaz', () => {
  const { m, y } = kur();
  const c = m.alanlar[0].sekil;
  const t = tasarim(m, 'ECE', [
    { uid: 'r1', tip: 'number', urunId: 9722985382174, varyantId: 2007, cx: c.cx, cy: c.cy },
    { uid: 'i1', tip: 'icon', urunId: 5, varyantId: 3005, cx: c.cx, cy: c.cy }
  ]);
  const d = ic.duzenle(m, y, t);
  assert.deepEqual(duz(d.hatalar), {}, 'çakışan parçalar geçerli yere taşınmalı');
  const p = d.parcalar;
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) assert.equal(ic.geometri.cakisir(p[i].sekil, p[j].sekil, 0), false);
  const f = ic.fiyatHesapla(m, y, t);
  assert.equal(f.toplam, 300000 + 5 * 33000);
  assert.equal(ic.paraBicimle(f.toplam, m.para), '4.650 TL');
  assert.equal(ic.tasarimOzeti(m, t), 'ECE + 7 + Sarı Kalp');
});

test('daire dışına taşan patch geçersiz', () => {
  const { m, y } = kur();
  const c = m.alanlar[0].sekil;
  const kare = { t: 'rect', x: c.cx + c.r - 2, y: c.cy - 1, w: 4, h: 2 };
  assert.equal(y.alanaUygun(kare, 'icon'), false);
  const ic2 = { t: 'rect', x: c.cx - 2, y: c.cy - 1, w: 4, h: 2 };
  assert.equal(y.alanaUygun(ic2, 'icon'), true);
});

test('yasaklı bölgeye değen patch geçersiz', () => {
  const v = ornekVeri();
  v.harita.forbidden = [{ shape: 'rect', x: 45, y: 45, w: 10, h: 10 }];
  const { m, y } = kur(v);
  const c = m.alanlar[0].sekil;
  assert.equal(y.alanaUygun({ t: 'rect', x: c.cx - 1, y: c.cy - 1, w: 2, h: 2 }, 'icon'), false);
});

test('elips ve dikdörtgen alan desteği', () => {
  const v = ornekVeri();
  v.harita.zones = [{ id: 'oval', shape: 'ellipse', x: 20, y: 30, w: 60, h: 30, allowed_types: ['icon'] }, { id: 'kutu', shape: 'rect', x: 10, y: 70, w: 30, h: 20, allowed_types: ['letter'] }];
  const { m, y } = kur(v);
  assert.equal(m.alanlar[0].sekil.t, 'ellipse');
  assert.equal(m.alanBul('letter').id, 'kutu');
  assert.ok(y.kapasite(m.setler[0]) >= 1);
});

test('ikon için kalan yer sayısı', () => {
  const { m, y } = kur();
  const n = y.kalanYer([], 6, 6, 'rect', 'icon');
  assert.ok(n >= 4, 'boş 25 cm dairede en az 4 tane 6x6 ikon olmalı: ' + n);
});

test('fiyat her zaman Türkçe biçimde', () => {
  assert.equal(ic.paraBicimle(498000), '4.980 TL');
  assert.equal(ic.paraBicimle(498050), '4.980,50 TL');
  assert.equal(ic.paraBicimle(33000), '330 TL');
  assert.equal(ic.paraBicimle(123456789), '1.234.567,89 TL');
});

test('ölçek dairenin gerçek çapından (cap_cm) gelir; kırpılmış görselde de doğru', () => {
  const v = ornekVeri();
  // Kırpılmış PNG: 1000x1100, daire görselin %60'ı genişliğinde, gerçek çap 25 cm
  v.gorsel = { en: 1000, boy: 1100, kucuk: 'k', buyuk: 'b' };
  v.harita = { zones: [{ id: 'on-daire', shape: 'circle', x: 20, y: 30, w: 60, h: 54.545, cap_cm: 25, allowed_types: ['letter', 'number', 'icon'] }], forbidden: [] };
  const { m } = kur(v);
  assert.ok(Math.abs(m.alanlar[0].sekil.r * 2 - 25) < 0.01);
  assert.ok(Math.abs(m.Wcm - 1000 / (600 / 25)) < 0.01);
});

test('harita başka boyuttaki görsele aitse kalibre değil sayılır', () => {
  const v = ornekVeri();
  v.harita.gorsel = { en: 1000, boy: 1500 };
  assert.equal(kur(v).m.kalibre, false);
});

test('harfleri ayır: her harf ayrı grup, birleştir: düzenli blok', () => {
  const { m, y } = kur();
  const t = tasarim(m, 'ECE');
  ic.duzenle(m, y, t);
  ic.harfleriAyir(y, t);
  assert.equal(t.harfAyri, true);
  let d = ic.duzenle(m, y, t);
  const harfler = d.parcalar.filter((p) => p.tip === 'letter');
  assert.deepEqual(duz(harfler.map((p) => p.grup)), ['harf-0', 'harf-1', 'harf-2']);
  // Bir harfi diğerinin üstüne koy: düzenle en yakın boş yere taşımalı
  t.harfKonumlari[2] = t.harfKonumlari[0].slice();
  d = ic.duzenle(m, y, t);
  const h = d.parcalar.filter((p) => p.tip === 'letter');
  assert.deepEqual(duz(d.hatalar), {});
  assert.equal(ic.geometri.cakisir(h[0].sekil, h[2].sekil, 0), false);
  // Birleştir: tek blok, hepsi aynı satırda eşit aralıklı
  ic.harfleriBirlestir(t);
  d = ic.duzenle(m, y, t);
  const b = d.parcalar.filter((p) => p.tip === 'letter');
  assert.ok(b.every((p) => p.grup === 'isim'));
  assert.ok(Math.abs(b[0].sekil.y - b[2].sekil.y) < 1e-9);
  assert.ok(Math.abs((b[1].sekil.x - b[0].sekil.x) - (b[2].sekil.x - b[1].sekil.x)) < 1e-9);
});

test('ayrı modda isme harf eklenince yeni harf geçerli bir yere yerleşir', () => {
  const { m, y } = kur();
  const t = tasarim(m, 'EC');
  ic.harfleriAyir(y, t);
  t.isim = 'ECE';
  const d = ic.duzenle(m, y, t);
  assert.equal(t.harfKonumlari.length, 3);
  assert.deepEqual(duz(d.hatalar), {});
});

test('PNG ölçüleri: harf başına genişlik, rakam/ikon varyant ölçüsü öncelikli', () => {
  const v = ornekVeri();
  // I dar, W geniş; ortanca harf genişliği temsili ölçü olur
  v.setler[0].varyantlar.forEach((x) => { x.png_en = x.karakter === 'I' ? 2.1 : x.karakter === 'W' ? 7.4 : 5.0; x.png_boy = 6; });
  v.rakamlar[0].varyantlar.forEach((x) => { x.png_en = x.karakter === '1' ? 3.2 : 5.1; x.png_boy = 6; });
  v.ikonlar[0].png_en = 5; v.ikonlar[0].png_boy = 4.6; // kalp: yükseklik PNG'den tamamlandı
  const { m, y } = kur(v);
  assert.equal(m.setler[0].en, 5.0, 'temsili harf genişliği ortanca');
  assert.ok(m.ikonHarita[1], 'yüksekliği PNG\'den gelen kalp artık listede');
  const c = m.alanlar[0].sekil;
  const t = tasarim(m, 'WIW', [{ uid: 'r1', tip: 'number', urunId: 9722985382174, varyantId: 2001, cx: c.cx, cy: c.cy + 7 }]);
  const d = ic.duzenle(m, y, t);
  const h = d.parcalar.filter((p) => p.tip === 'letter');
  assert.deepEqual(duz(h.map((p) => +p.sekil.w.toFixed(2))), [7.4, 2.1, 7.4]);
  const r = d.parcalar.find((p) => p.tip === 'number');
  assert.equal(+r.sekil.w.toFixed(2), 3.2, 'rakam 1 kendi genişliğinde');
  // Dar harflerle daha uzun isim sığar
  assert.equal(ic.isimAnaliz(m, y, tasarim(m, 'IIIIIII')).sigiyor, true);
});

test('PNG şekli eski şekil kaydından önceliklidir', () => {
  const v = ornekVeri();
  // Futbol Topu kayıtta daire; PNG yuvarlak değilse png_sekil 'rect' gelir
  v.ikonlar[1].png_sekil = 'rect';
  // Sevimli Köpek kayıtta dikdörtgen; PNG yuvarlaksa 'circle'
  v.ikonlar[2].png_sekil = 'circle';
  const { m } = kur(v);
  assert.equal(m.ikonHarita[2].sekil, 'rect');
  assert.equal(m.ikonHarita[3].sekil, 'circle');
  // png_sekil yoksa eski kayıt kullanılır
  assert.equal(kur().m.ikonHarita[2].sekil, 'circle');
});

// ---------------- Döndürme ----------------
const g = ic.geometri;

test('dönük dikdörtgen: 0/90° eksene hizalı kalır, diğer açılarda obb', () => {
  assert.equal(g.donukDikdortgen(0, 0, 8, 3, 0).t, 'rect');
  const d90 = g.donukDikdortgen(0, 0, 8, 3, 90);
  assert.deepEqual(duz([d90.w, d90.h]), [3, 8]);
  const o = g.donukDikdortgen(0, 0, 8, 3, 30);
  assert.equal(o.t, 'obb');
  const k = g.kutu(o);
  // 8×3 dikdörtgen 30°: sınır kutusu 8cos30 + 3sin30 = 8,43
  assert.ok(Math.abs(k.w - (8 * Math.cos(Math.PI / 6) + 3 * Math.sin(Math.PI / 6))) < 1e-9);
});

test('SAT: eksen kutuları çakışsa da dönük dikdörtgenler çakışmayabilir', () => {
  const a = g.donukDikdortgen(0, 0, 8, 1, 45);
  const b = g.donukDikdortgen(3.2, -3.2, 8, 1, 45); // aynı doğrultuda, yan yana paralel şeritler
  assert.equal(g.cakisir({ t: 'rect', ...g.kutu(a) }, { t: 'rect', ...g.kutu(b) }, 0), true, 'kutular çakışıyor');
  assert.equal(g.cakisir(a, b, 0), false, 'dönük şekiller çakışmıyor');
  const c = g.donukDikdortgen(0, 0, 8, 1, -45); // çapraz: X şekli
  assert.equal(g.cakisir(a, c, 0), true);
  // Daire ile: dönük şeridin ucuna yakın ama dışında
  assert.equal(g.cakisir(a, { t: 'circle', cx: 3, cy: -3, r: 0.5 }, 0), false);
  assert.equal(g.cakisir(a, { t: 'circle', cx: 2, cy: 2, r: 0.5 }, 0), true);
});

test('dönük patch alana sığma: köşeler dairenin içinde olmalı', () => {
  const { m, y } = kur();
  const c = m.alanlar[0].sekil; // çap 25 cm
  // 8×3,5 dikdörtgen kenara yakın: düzken sığar, 45°'de köşesi daireden taşar
  const cx = c.cx + 8.2;
  assert.equal(y.alanaUygun(g.donukDikdortgen(cx, c.cy, 3.5, 8, 0), 'icon'), true);
  assert.equal(y.alanaUygun(g.donukDikdortgen(cx, c.cy, 3.5, 8, 45), 'icon'), false);
});

test('ikon açısı tasarımda saklanır; döndürülmüş şekil çakışmada kullanılır', () => {
  const { m, y } = kur();
  const c = m.alanlar[0].sekil;
  const t = tasarim(m, '', [
    { uid: 'i1', tip: 'icon', urunId: 4, varyantId: 3004, cx: c.cx - 3.1, cy: c.cy, aci: 0 },
    { uid: 'i2', tip: 'icon', urunId: 4, varyantId: 3004, cx: c.cx + 3.1, cy: c.cy, aci: 0 }
  ]);
  // 6 cm genişliğinde iki not 6,2 cm arayla: düzken çakışmaz
  let d = ic.duzenle(m, y, t);
  assert.deepEqual(duz(Object.keys(d.hatalar)), []);
  // i1 30° döndürülünce köşesi i2'ye değer; duzenle i2'yi kaydırır ama açıyı korur
  t.parcalar[0].aci = 30;
  d = ic.duzenle(m, y, t);
  const p1 = d.parcalar.find((p) => p.uid === 'i1');
  const p2 = d.parcalar.find((p) => p.uid === 'i2');
  assert.equal(p1.aci, 30);
  assert.equal(p1.sekil.t, 'obb');
  assert.equal(g.cakisir(p1.sekil, p2.sekil, 0), false);
  assert.notEqual(t.parcalar[1].cx, c.cx + 3.1, 'i2 kaydırıldı');
});

test('blok isim bütün olarak döner; kapasite açıyı hesaba katar', () => {
  const { m, y } = kur();
  const t = tasarim(m, 'ECE');
  t.isimAci = 90;
  const d = ic.duzenle(m, y, t);
  const h = d.parcalar.filter((p) => p.tip === 'letter');
  assert.ok(h.every((p) => p.aci === 90));
  // 90°'de harfler dikey sütun olur: x'ler aynı, y'ler farklı
  const xs = h.map((p) => +p.sekil.x.toFixed(3) + p.sekil.w / 2);
  assert.ok(Math.max(...xs) - Math.min(...xs) < 1e-6, 'aynı sütunda');
  // Grup döndürme: merkez etrafında
  const pivot = [m.alanlar[0].sekil.cx, m.alanlar[0].sekil.cy];
  const geri = ic.grupDondur(h, pivot, 90, 0);
  assert.ok(geri.every((p) => p.aci === 0 && p.sekil.t === 'rect'));
  // Dairede (simetrik) kapasite açıdan bağımsız
  const set = m.setler[0];
  assert.equal(y.kapasite(set, 0), y.kapasite(set, 90));
});

test('harfleri ayırınca blok açısı her harfe geçer; birleştirince temizlenir', () => {
  const { m, y } = kur();
  const t = tasarim(m, 'ECE');
  t.isimAci = 30;
  ic.harfleriAyir(y, t);
  assert.deepEqual(duz(t.harfAcilari), [30, 30, 30]);
  t.harfAcilari[1] = 120;
  const d = ic.duzenle(m, y, t);
  assert.equal(d.parcalar.find((p) => p.uid === 'harf-1').aci, 120);
  ic.harfleriBirlestir(t);
  assert.equal(t.harfAcilari, null);
});

test('açı yakalama: 45° katlarına ±5° içinde yapışır', () => {
  assert.equal(ic.aciYakala(41), 45);
  assert.equal(ic.aciYakala(-3), 0);
  assert.equal(ic.aciYakala(184.6), 180);
  assert.equal(ic.aciYakala(150.4), 150);
  assert.equal(ic.aciYakala(357), 0);
});

test('sepet konumu her parçanın açısını içerir', () => {
  const { m, y } = kur();
  const c = m.alanlar[0].sekil;
  const t = tasarim(m, 'EC', [{ uid: 'i1', tip: 'icon', urunId: 4, varyantId: 3004, cx: c.cx, cy: c.cy + 7, aci: 150 }]);
  t.isimAci = 15;
  const d = ic.duzenle(m, y, t);
  const k = ic.tasarimKonumu(m, d.parcalar);
  assert.equal(k.v, 2);
  assert.deepEqual(duz(k.p.map((p) => p.a)), [15, 15, 150]);
  assert.ok(k.p.every((p) => typeof p.x === 'number' && typeof p.y === 'number'));
});

// ---------------- Çok renkli harf seti (Piramit) ----------------
const kurP = () => {
  const m = new ic.Model(ornekVeriPiramitli());
  return { m, y: new ic.Yerlesim(m), p: m.setler[1] };
};
const piramitTasarim = (m, isim) => ({ setId: m.setler[1].id, isim, isimMerkez: null, parcalar: [] });
const renkleri = (p, t) => Array.from(t.isim).map((h, i) => ic.harfVaryanti(p, t, i, h).renk);

test('çok renkli set: harf ve renk varyant adından okunur, tükenen renk görünmez', () => {
  const { m, p } = kurP();
  assert.equal(m.setler[0].cokRenkli, false, 'Cool tek renkli');
  assert.equal(p.cokRenkli, true);
  assert.deepEqual(duz(p.karakterVaryantlari.A.map((v) => v.renk)), ['Mavi', 'Pembe', 'Turuncu']);
  assert.equal(p.karakterVaryantlari.K.length, 0, 'K\'nın tek rengi tükenmiş');
  assert.equal(p.karakterler.K, undefined);
  assert.equal(p.karakterVaryantlari.C[0].renkKodu, '#f6f7f8', 'renk kodu yoksa addan yedek renk');
});

test('otomatik renk: yan yana harfler farklı renkte, stok renk bazında sayılır', () => {
  const { m, p } = kurP();
  const t = piramitTasarim(m, 'AAA');
  ic.renkleriAta(m, t);
  const r = renkleri(p, t);
  assert.notEqual(r[0], r[1]);
  assert.notEqual(r[1], r[2]);
  // E: Turkuaz'dan stokta 1 → 4 E'de Turkuaz en fazla bir kez
  const t2 = piramitTasarim(m, 'EEEE');
  ic.renkleriAta(m, t2);
  const r2 = renkleri(p, t2);
  assert.ok(r2.filter((x) => x === 'Turkuaz').length <= 1, r2.join());
  for (let i = 1; i < r2.length; i++) assert.notEqual(r2[i], r2[i - 1], 'komşular farklı: ' + r2.join());
  // Geçerli seçim korunur
  const pembe = p.karakterVaryantlari.A[1].id;
  t.harfRenkleri[0] = pembe;
  ic.renkleriAta(m, t);
  assert.equal(String(t.harfRenkleri[0]), String(pembe));
});

test('aynı rengi stoktan fazla seçmek uyarı verir; tükenmiş harf "yok" sayılır', () => {
  const { m, y, p } = kurP();
  const turkuaz = p.karakterVaryantlari.E[1].id;
  const t = piramitTasarim(m, 'ECE');
  t.harfRenkleri = [turkuaz, null, turkuaz];
  // Atama yapılmadan (ör. kayıtlı tasarım) aynı renk iki kez: uyarı
  const a = ic.isimAnaliz(m, y, t);
  assert.equal(a.stokSorunlari.length, 1);
  assert.deepEqual(duz(a.stokSorunlari[0]), { harf: 'E', renk: 'Turkuaz', gereken: 2, mevcut: 1 });
  assert.equal(a.engel, true);
  // Kullanıcı 3. harfe Turkuaz seçti: öncelik onda, 1. harf başka renge geçer
  ic.renkleriAta(m, t, false, 2);
  assert.equal(String(t.harfRenkleri[2]), String(turkuaz));
  assert.notEqual(String(t.harfRenkleri[0]), String(turkuaz));
  assert.deepEqual(duz(ic.isimAnaliz(m, y, t).stokSorunlari), []);
  const k = ic.isimAnaliz(m, y, piramitTasarim(m, 'KAR'));
  assert.deepEqual(duz(k.yoklar), ['K']);
  const tr = ic.isimAnaliz(m, y, piramitTasarim(m, 'ÖDA'));
  assert.deepEqual(duz(tr.eksikler), [{ harf: 'Ö', oneri: 'O' }]);
});

test('parçalar seçilen renk varyantını kullanır; özet renkleri yazar', () => {
  const { m, y, p } = kurP();
  const t = piramitTasarim(m, 'ECE');
  t.harfRenkleri = [p.karakterVaryantlari.E[0].id, null, p.karakterVaryantlari.E[1].id];
  const d = ic.duzenle(m, y, t);
  const harfler = d.parcalar.filter((x) => x.tip === 'letter');
  assert.deepEqual(duz(harfler.map((x) => x.varyant.baslik)), ['Yeşil E', 'Beyaz C', 'Turkuaz E']);
  assert.equal(ic.tasarimOzeti(m, t), 'ECE (Yeşil E, Beyaz C, Turkuaz E)');
  // Stok kontrolü varyant bazında
  assert.deepEqual(duz(ic.stokKontrol(m, t, y, 1)), []);
  assert.equal(ic.stokKontrol(m, t, y, 2).length, 1, '2 çantada Turkuaz E yetmez');
});

test('Cool\'dan Piramit\'e geçince isim korunur, renkler atanır', () => {
  const { m, y, p } = kurP();
  const t = tasarim(m, 'ELA');
  ic.duzenle(m, y, t);
  assert.equal(t.harfRenkleri, null);
  t.setId = p.id;
  const d = ic.duzenle(m, y, t);
  assert.equal(t.isim, 'ELA');
  assert.equal(t.harfRenkleri.length, 3);
  assert.ok(d.parcalar.every((x) => x.varyant && /\S+ [ELA]$/.test(x.varyant.baslik)));
  // Ayrı modda ve döndürmede de çalışır
  ic.harfleriAyir(y, t);
  t.harfAcilari[1] = 30;
  const d2 = ic.duzenle(m, y, t);
  assert.equal(d2.parcalar.find((x) => x.uid === 'harf-1').aci, 30);
  assert.equal(d2.parcalar.find((x) => x.uid === 'harf-1').varyant.karakter, 'L');
});
