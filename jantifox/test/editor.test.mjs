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

test('ECE + 7 + kalp: fiyat 4.650 TL (5 patch); çakışan parçalar taşınmaz, işaretlenir', () => {
  const { m, y } = kur();
  const c = m.alanlar[0].sekil;
  const t = tasarim(m, 'ECE', [
    { uid: 'r1', tip: 'number', urunId: 9722985382174, varyantId: 2007, cx: c.cx, cy: c.cy },
    { uid: 'i1', tip: 'icon', urunId: 5, varyantId: 3005, cx: c.cx, cy: c.cy }
  ]);
  const d = ic.duzenle(m, y, t);
  // Hepsi alanın ortasında üst üste: bırakıldıkları yerde kalır, kırmızı işaretlenir
  assert.equal(d.hatalar.r1, true);
  assert.equal(d.hatalar.i1, true);
  assert.equal(d.sorunlar.i1.tur, 'cakisma');
  assert.equal(t.parcalar[0].cx, c.cx, 'taşınmadı');
  assert.equal(d.isimGecerli, false);
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
  // Bir harfi diğerinin üstüne koy: taşınmaz, iki harf de işaretlenir
  t.harfKonumlari[2] = t.harfKonumlari[0].slice();
  d = ic.duzenle(m, y, t);
  assert.deepEqual(duz(Object.keys(d.hatalar).sort()), ['harf-0', 'harf-2']);
  assert.deepEqual(duz(t.harfKonumlari[2]), duz(t.harfKonumlari[0]));
  // Birleştir: tek blok, hepsi aynı satırda eşit aralıklı
  ic.harfleriBirlestir(t);
  d = ic.duzenle(m, y, t);
  const b = d.parcalar.filter((p) => p.tip === 'letter');
  assert.ok(b.every((p) => p.grup === 'isim'));
  assert.ok(Math.abs(b[0].sekil.y - b[2].sekil.y) < 1e-9);
  assert.ok(Math.abs((b[1].sekil.x - b[0].sekil.x) - (b[2].sekil.x - b[1].sekil.x)) < 1e-9);
});

test('ayrı modda isme harf eklenince yeni harf blok dizilimdeki yerinden başlar', () => {
  const { m, y } = kur();
  const t = tasarim(m, 'EC');
  ic.harfleriAyir(y, t);
  t.isim = 'ECE';
  ic.duzenle(m, y, t);
  assert.equal(t.harfKonumlari.length, 3);
  assert.ok(t.harfKonumlari.every((k) => Array.isArray(k) && k.length === 2));
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
  // 8×3,5 dikdörtgen kenara yakın: düzken sığar, 45°'de köşesi daireden toleranstan (0,2 cm) fazla taşar
  const cx = c.cx + 9;
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
  // i1 30° döndürülünce köşesi i2'ye değer: hiçbir şey kaymaz, ikisi de işaretlenir, açı korunur
  t.parcalar[0].aci = 30;
  d = ic.duzenle(m, y, t);
  const p1 = d.parcalar.find((p) => p.uid === 'i1');
  assert.equal(p1.aci, 30);
  assert.equal(p1.sekil.t, 'obb');
  assert.deepEqual(duz(Object.keys(d.hatalar).sort()), ['i1', 'i2']);
  assert.equal(t.parcalar[1].cx, c.cx + 3.1, 'i2 yerinde');
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

test('yan yana kontrolü renk koduna göre: aynı görünen farklı adlar aynı renk, aynı adlı farklı tonlar farklı', () => {
  const { m, p } = kurP();
  const v = (h, renk) => p.karakterVaryantlari[h].find((x) => x.renk === renk);
  assert.equal(ic.benzerRenk(v('L', 'Haki'), v('V', 'Yeşil')), true, 'Haki L ≈ Yeşil V');
  assert.equal(ic.benzerRenk(v('O', 'Mavi'), v('B', 'Antrasit')), true, 'Mavi O ≈ Antrasit');
  assert.equal(ic.benzerRenk(v('A', 'Mavi'), v('D', 'Mavi')), false, 'buz mavisi ≠ gök mavisi');
  assert.equal(ic.benzerRenk(v('C', 'Beyaz'), v('A', 'Mavi')), false, 'beyaz ≠ buz mavisi');
  // LV: Haki L yanına Yeşil V gelmez (otomatik ve her karıştırmada)
  const t = piramitTasarim(m, 'LV');
  ic.renkleriAta(m, t);
  const benzerKomsu = (t) => Array.from(t.isim).some((h, i) => i > 0 && ic.benzerRenk(ic.harfVaryanti(p, t, i - 1, t.isim[i - 1]), ic.harfVaryanti(p, t, i, h)));
  assert.equal(benzerKomsu(t), false, renkleri(p, t).join());
  for (let k = 0; k < 40; k++) {
    ic.renkleriAta(m, t, true);
    assert.equal(benzerKomsu(t), false, 'karıştır LV: ' + renkleri(p, t).join());
  }
  // OT: Mavi O (gri) yanına Antrasit T değil, Kırmızı T
  const t2 = piramitTasarim(m, 'OT');
  for (let k = 0; k < 40; k++) {
    ic.renkleriAta(m, t2, k > 0);
    assert.deepEqual(renkleri(p, t2), ['Mavi', 'Kırmızı'], 'karıştır OT');
  }
  // AD: buz mavisi A ile gök mavisi D yan yana olabilir (ikisi de "Mavi" adlı); renkler hâlâ dağıtılır
  const t3 = piramitTasarim(m, 'ADA');
  ic.renkleriAta(m, t3);
  assert.equal(benzerKomsu(t3), false, renkleri(p, t3).join());
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

// Sepetteki tasarımı düzenleme: _tasarim_konum'dan kurulan tasarım aynı yerleşimi verir
const konumlar = (m, y, t) => ic.duzenle(m, y, t).parcalar.map((p) => {
  const c = ic.geometri.kutu(p.sekil);
  return [p.tip, p.varyant && p.varyant.id, Math.round((c.x + c.w / 2) * 10) / 10, Math.round((c.y + c.h / 2) * 10) / 10, Math.round(p.aci || 0)];
});
// Sepetteki konum 0,1 cm'ye yuvarlanır: karşılaştırma ±0,15 cm
const yakin = (a, b) => {
  assert.equal(a.length, b.length);
  a.forEach((x, i) => {
    assert.deepEqual([x[0], x[1], x[4]], [b[i][0], b[i][1], b[i][4]]);
    assert.ok(Math.abs(x[2] - b[i][2]) <= 0.15 && Math.abs(x[3] - b[i][3]) <= 0.15, JSON.stringify([x, b[i]]));
  });
};
const geriKur = (m, y, t) => {
  const d = ic.duzenle(m, y, t);
  const konum = JSON.parse(JSON.stringify(ic.tasarimKonumu(m, d.parcalar)));
  return ic.konumdanTasarim(m, y, konum);
};

test('sepetten geri kurma: blok isim + rakam + ikon (döndürülmüş) aynı yerleşim', () => {
  const { m, y } = kur();
  const t = tasarim(m, 'ECE', [
    { uid: 'r1', tip: 'number', urunId: m.rakamSetleri[0].id, varyantId: m.rakamSetleri[0].karakterler['7'].id, cx: 15, cy: 26 },
    { uid: 'i1', tip: 'icon', urunId: 1, varyantId: 3001, cx: 24, cy: 26, aci: 30 }
  ]);
  t.isimAci = 15;
  const k = geriKur(m, y, t);
  assert.equal(k.isim, 'ECE');
  assert.ok(!k.harfAyri, 'blok olarak kuruldu');
  assert.equal(k.isimAci, 15);
  yakin(konumlar(m, y, k), konumlar(m, y, t));
});

test('sepetten geri kurma: ayrı ve farklı açılı harfler', () => {
  const { m, y } = kur();
  const t = tasarim(m, 'ECE');
  ic.harfleriAyir(y, t);
  t.harfKonumlari[2] = [t.harfKonumlari[2][0], t.harfKonumlari[2][1] + 7];
  t.harfAcilari[2] = 45;
  const k = geriKur(m, y, t);
  assert.equal(k.harfAyri, true, 'blok tutmadı, harfler ayrı');
  yakin(konumlar(m, y, k), konumlar(m, y, t));
});

test('sepetten geri kurma: Piramit renkleri korunur', () => {
  const { m, y } = kurP();
  const p = m.setler[1];
  const t = { setId: p.id, isim: 'ECE', isimMerkez: null, parcalar: [], harfRenkleri: [p.karakterVaryantlari.E[0].id, null, p.karakterVaryantlari.E[2].id] };
  const k = geriKur(m, y, t);
  assert.equal(String(k.setId), String(p.id));
  assert.deepEqual(duz(Array.from(k.isim).map((h, i) => ic.harfVaryanti(p, k, i, h).baslik)), duz(Array.from(t.isim).map((h, i) => ic.harfVaryanti(p, t, i, h).baslik)));
  assert.equal(geriKur(m, y, { setId: m.setler[0].id, isim: '', isimMerkez: null, parcalar: [] }), null, 'boş konum: kurulamaz');
});

// ---------- Yazı ve rakam birleşik, karakter başına stil ----------

test('ECE7: rakam yazının parçası, rakam setinden gelir, fiyat ve sıra doğru', () => {
  const { m, y } = kur();
  const t = tasarim(m, 'ECE7');
  const d = ic.duzenle(m, y, t);
  const yazi = d.parcalar.filter((p) => p.grup === 'isim');
  assert.deepEqual(duz(yazi.map((p) => [p.tip, p.etiket])), [['letter', 'E'], ['letter', 'C'], ['letter', 'E'], ['number', '7']]);
  assert.equal(String(yazi[3].varyant.id), String(m.rakamSetleri[0].karakterler['7'].id));
  assert.equal(ic.stilAdi(yazi[3].tanim), 'Rakam');
  assert.equal(ic.stilAdi(yazi[0].tanim), 'Cool');
  const f = ic.fiyatHesapla(m, y, t);
  assert.equal(f.harfAdet, 3);
  assert.equal(f.rakamAdet, 1);
  assert.equal(ic.tasarimOzeti(m, t), 'ECE7');
  assert.equal(ic.isimAnaliz(m, y, t).engel, false);
  // Sepet konumu: yazı karakterleri işaretli
  const konum = ic.tasarimKonumu(m, d.parcalar);
  assert.deepEqual(duz(konum.p.map((x) => [x.t, x.s || 0])), [['l', 1], ['l', 1], ['l', 1], ['n', 1]]);
});

test('karışık stil: aynı yazıda Cool ve Piramit; Türkçe uyarı ve stok her karakterin kendi setine göre', () => {
  const { m, y } = kurP();
  const cool = m.setler[0];
  const pir = m.setler[1];
  const t = { setId: cool.id, isim: 'EC', isimMerkez: null, parcalar: [], karakterSetleri: [cool.id, pir.id] };
  const d = ic.duzenle(m, y, t);
  assert.equal(d.parcalar[0].tanim, cool);
  assert.equal(d.parcalar[1].tanim, pir);
  assert.ok(/ C$/.test(d.parcalar[1].varyant.baslik), 'Piramit C renkli varyant');
  assert.equal(t.harfRenkleri[0], null, 'Cool harfin rengi yok');
  assert.ok(t.harfRenkleri[1], 'Piramit harfe renk atandı');
  assert.ok(/^EC \(E, \S+ C\)$/.test(ic.tasarimOzeti(m, t)), ic.tasarimOzeti(m, t));
  // İ: Cool'da yok (I önerilir); Piramit setinde İ yoksa o karakter için ayrı uyarı
  const t2 = { setId: cool.id, isim: 'İİ', isimMerkez: null, parcalar: [], karakterSetleri: [cool.id, pir.id] };
  const a = ic.isimAnaliz(m, y, t2);
  assert.equal(a.engel, true);
  assert.equal(a.eksikler.length + a.yoklar.length, 2, 'her set için ayrı uyarı');
});

test('karakter hizalama: araya eklenen karakter son seçilen setle gelir, silinen karakterin bilgileri gider', () => {
  const { m } = kurP();
  const cool = m.setler[0];
  const pir = m.setler[1];
  const t = { setId: pir.id, isim: 'AB', isimMerkez: null, parcalar: [], karakterSetleri: [cool.id, pir.id], harfRenkleri: [null, 'x'] };
  ic.karakterleriHizala(t, 'AXB');
  assert.equal(t.isim, 'AXB');
  assert.deepEqual(duz(t.karakterSetleri), [cool.id, pir.id, pir.id]);
  assert.deepEqual(duz(t.harfRenkleri), [null, null, 'x']);
  ic.karakterleriHizala(t, 'AXB7');
  assert.equal(String(ic.karakterSeti(m, t, 3, '7').id), String(m.rakamSetleri[0].id), 'rakam her zaman rakam seti');
  ic.karakterSil(t, 0);
  assert.equal(t.isim, 'XB7');
  assert.deepEqual(duz(t.karakterSetleri), [pir.id, pir.id, pir.id]);
});

test('sepetten geri kurma: harf + rakam karışık yazı ve ayrı ikon', () => {
  const { m, y } = kurP();
  const pir = m.setler[1];
  const t = { setId: m.setler[0].id, isim: 'EC7', isimMerkez: null, karakterSetleri: [m.setler[0].id, pir.id, null], parcalar: [{ uid: 'i1', tip: 'icon', urunId: 2, varyantId: 3002, cx: 24, cy: 26 }] };
  ic.duzenle(m, y, t);
  const k = geriKur(m, y, t);
  assert.equal(k.isim, 'EC7');
  assert.deepEqual(duz(k.karakterSetleri.map(String)), [String(m.setler[0].id), String(pir.id), 'null']);
  assert.equal(k.parcalar.length, 1);
  assert.equal(k.parcalar[0].tip, 'icon');
  yakin(konumlar(m, y, k), konumlar(m, y, t));
});

// ---------- Hazır setler ----------

const setTasarimi = (m) => ({
  setId: m.setler[0].id, isim: '', isimMerkez: null,
  parcalar: [
    { uid: 'a', tip: 'icon', urunId: 2, varyantId: 3002, cx: 14, cy: 22, setGrup: 'S1' },
    { uid: 'b', tip: 'icon', urunId: 4, varyantId: 3004, cx: 21, cy: 22, setGrup: 'S1' },
    { uid: 'c', tip: 'icon', urunId: 5, varyantId: 3005, cx: 17, cy: 29, setGrup: 'S1' }
  ],
  hazirSetler: [{ id: 'S1', urunId: 8001 }]
});

test('hazır setler: yalnızca satışta ve tüm patch\'leri katalogda olanlar; ad sade', () => {
  const { m } = kur();
  assert.deepEqual(duz(m.hazirSetler.map((s) => [s.id, s.ad, s.patchler.length, s.parcaToplam])), [[8001, 'School Vibes', 3, 99000]]);
});

test('bozulmamış set: set fiyatı, set ürünü özeti, tek patch stoğu düşmez; bozulunca tek tek', () => {
  const { m, y } = kur();
  const t = setTasarimi(m);
  let f = ic.fiyatHesapla(m, y, t);
  assert.equal(f.toplam, 300000 + 80000);
  assert.equal(f.patchAdet, 3);
  assert.equal(ic.tasarimOzeti(m, t), 'School Vibes seti');
  // Sarı Kalp'in tek stoğu 1: set ürünü olarak satılınca iki çantada da sorun yok
  assert.deepEqual(duz(ic.stokKontrol(m, t, y, 2)), []);
  // Setten bir patch çıkınca set bozulur, kalanlar tek tek
  t.parcalar.pop();
  ic.setleriTemizle(m, t);
  assert.equal(t.hazirSetler.length, 0);
  assert.ok(t.parcalar.every((p) => !p.setGrup));
  f = ic.fiyatHesapla(m, y, t);
  assert.equal(f.toplam, 300000 + 2 * 33000);
  assert.equal(ic.tasarimOzeti(m, t), 'Futbol Topu + Musical Note');
});

test('sepetten geri kurma: set patch\'leri yeniden set olur, konum patch bazında', () => {
  const { m, y } = kur();
  const t = setTasarimi(m);
  t.isim = 'EC';
  const d = ic.duzenle(m, y, t);
  const konum = duz(ic.tasarimKonumu(m, d.parcalar, t));
  assert.deepEqual(konum.p.filter((x) => x.t === 'i').map((x) => x.k), ['8001#1', '8001#1', '8001#1']);
  const k = ic.konumdanTasarim(m, y, konum);
  assert.equal(k.hazirSetler.length, 1);
  assert.equal(String(k.hazirSetler[0].urunId), '8001');
  assert.equal(ic.fiyatHesapla(m, y, k).toplam, 300000 + 2 * 33000 + 80000);
  yakin(konumlar(m, y, k), konumlar(m, y, t));
});

test('kenar: fiyata dahil değil; Özet\'te seçilenler (kenarAl) dahil; set bütün olarak', () => {
  const { m, y } = kur();
  const t = setTasarimi(m);
  t.isim = 'EC';
  const tam = ic.fiyatHesapla(m, y, t).toplam;
  // Setin bir patch'i kenarda: set çantada sayılır, fiyat değişmez
  t.parcalar[0].kenar = true;
  assert.equal(ic.fiyatHesapla(m, y, t).toplam, tam);
  // Setin tamamı kenarda: set fiyata dahil değil
  t.parcalar.forEach((p) => { p.kenar = true; });
  assert.equal(ic.fiyatHesapla(m, y, t).toplam, tam - 80000);
  assert.equal(ic.satinAlinacak(m, t).hazirSetler.length, 0);
  // Özet'te bir patch'i seçmek setin tamamını getirir
  t.kenarAl = [t.parcalar[1].uid];
  assert.equal(ic.fiyatHesapla(m, y, t).toplam, tam);
  // Yazı kenarda: harfleri dahil değil; isim seçilince dahil
  t.kenarAl = [];
  t.isimKenar = true;
  const kenarsiz = ic.satinAlinacak(m, t);
  assert.equal(kenarsiz.isim, '');
  assert.equal(ic.fiyatHesapla(m, y, t).toplam, 300000);
  t.kenarAl = ['isim'];
  assert.equal(ic.satinAlinacak(m, t).isim, 'EC');
  // Asıl tasarım değişmez
  assert.equal(t.isim, 'EC');
  assert.equal(t.parcalar.length, 3);
});

// ---------- Aksesuarlar ----------

test('aksesuarlar: ad, model, renk, dış ölçü; stokta olmayan yok; tasarlanabilirlik Velcro yüzeyinden', () => {
  const { m } = kur();
  assert.deepEqual(duz(m.aksesuarlar.map((a) => [a.id, a.ad, a.model, a.renk, a.tasarlanabilir])), [
    [9101, 'Kalem Kutusu Kırmızı', 'Kalem Kutusu', 'Kırmızı', true],
    [9102, 'Zarf Kalemlik Kırmızı/Pembe', 'Zarf Kalemlik', 'Kırmızı/Pembe', false],
    [9103, 'Mini Yuvarlak Çanta Mavi', 'Mini Yuvarlak Çanta', 'Mavi', false]
  ]);
  const am = m.aksesuarModeli(9101);
  assert.ok(Math.abs(am.m.Wcm - 22) < 0.01, 'aksesuarın kendi ölçeği: görsel 22 cm');
  assert.equal(m.aksesuarModeli(9102), null);
});

test('kalem kutusu 25 cm daireye yalnızca yuvarlak köşeleriyle sığar; her açıda', () => {
  const { m, y } = kur();
  const alan = m.alanBul('icon');
  const c = ic.geometri.merkez(alan.sekil);
  const yk = (aci, r) => ({ t: 'obb', cx: c[0], cy: c[1], w: 22, h: 12, a: aci, r });
  // Köşegen 25,06 cm: köşeler 0,03 cm taşar, 0,2 cm tolerans içinde kalır. 22,6 × 12 düz dikdörtgen (köşegen 25,59) taşar.
  assert.equal(y.alanaUygun(yk(0, 0), 'aksesuar'), true, 'düz dikdörtgen tolerans içinde');
  assert.equal(y.alanaUygun({ t: 'obb', cx: c[0], cy: c[1], w: 22.6, h: 12, a: 0, r: 0 }, 'aksesuar'), false, 'toleranstan fazla taşan düz dikdörtgen');
  assert.equal(y.alanaUygun({ t: 'obb', cx: c[0], cy: c[1], w: 22.6, h: 12, a: 0, r: 2 }, 'aksesuar'), true, 'aynısı yuvarlak köşeli sığar');
  for (const a of [0, 30, 45, 90, 135]) assert.equal(y.alanaUygun(yk(a, 2), 'aksesuar'), true, a + '°');
});

test('aksesuar fiyatı, üzerindeki tasarım, özet ve sepet satırları; geri kurma', () => {
  const { m, y } = kur();
  const am = m.aksesuarModeli(9101);
  const ic0 = { setId: m.setler[0].id, isim: 'ADA', isimMerkez: null, parcalar: [] };
  const alan = m.alanBul('icon');
  const c = ic.geometri.merkez(alan.sekil);
  const t = { setId: m.setler[0].id, isim: '', isimMerkez: null, parcalar: [], aksesuarlar: [{ uid: 'a1', urunId: 9101, cx: c[0], cy: c[1], aci: 0, tasarim: ic0 }] };
  const d = ic.duzenle(m, y, t);
  assert.equal(Object.keys(d.hatalar).length, 0, 'aksesuar alanda geçerli');
  const f = ic.fiyatHesapla(m, y, t);
  assert.equal(f.toplam, 300000 + 170000 + 3 * 33000);
  assert.equal(f.patchAdet, 3);
  assert.equal(ic.tasarimOzeti(m, t), 'Kalem Kutusu Kırmızı (ADA)');
  const konum = duz(ic.tasarimKonumu(m, d.parcalar, t));
  assert.deepEqual(konum.p.map((x) => [x.t, x.u || null]), [['a', 'a1']]);
  const k = ic.konumdanTasarim(m, y, konum);
  assert.equal(k.aksesuarlar.length, 1);
  assert.equal(k.aksesuarlar[0].uid, 'a1');
  assert.ok(Math.abs(k.aksesuarlar[0].cx - c[0]) < 0.11);
  // Stok: aksesuarın üzerindeki A ile çantadaki A aynı stoktan
  assert.deepEqual(duz(ic.stokKontrol(m, t, y, 1)), []);
  assert.ok(am.yer.parcalar(ic0).every((p) => am.yer.alanaUygun(p.sekil, p.tip)), 'ADA aksesuarın Velcro yüzeyine sığar');
});

test('yuvarlak köşeli dikdörtgen alan (kose_cm): köşe yuvarlaklığı içinde kalma kontrolünde', () => {
  const v = ornekVeri();
  v.gorsel = { ...v.gorsel, en: 1200, boy: 655 };
  v.harita = { surum: 2, tip: 'aksesuar', kalibre: true, gorsel: { en: 1200, boy: 655 },
    dis: { shape: 'rect', x: 0, y: 0, w: 100, h: 100, en_cm: 22, boy_cm: 12, kose_cm: 3.3 },
    zones: [{ id: 'velcro', shape: 'rect', x: 0, y: 0, w: 100, h: 100, kose_cm: 3, genislik_cm: 22, allowed_types: ['letter', 'number', 'icon'] }] };
  const m = new ic.Model(v);
  const s = m.alanlar[0].sekil;
  assert.equal(s.t, 'rect'); assert.ok(Math.abs(s.w - 22) < 0.01); assert.equal(s.r, 3);
  const g = ic.geometri;
  assert.equal(g.noktaIcinde(0.3, 0.3, s, 0), false, 'köşe ucu yuvarlaklığın dışında');
  assert.equal(g.noktaIcinde(3, 0.1, s, 0), true, 'yayın bittiği yerde üst kenar içeride');
  assert.equal(g.noktaIcinde(11, 6, s, 0), true);
  // 4 × 4 cm patch: köşeye dayalıyken sığmaz, köşe dairesine teğet konumda sığar
  const kose = { t: 'rect', x: 0, y: 0, w: 4, h: 4 };
  assert.equal(g.icinde(kose, s, 0), false);
  const d = 3 - 3 / Math.SQRT2 + 0.01; // köşe noktası (d, d) yayın içinde
  assert.equal(g.icinde({ t: 'rect', x: d, y: d, w: 4, h: 4 }, s, 0), true);
  // Kenar payıyla: yay da payı kadar içeri çekilir
  assert.equal(g.icinde({ t: 'rect', x: d, y: d, w: 4, h: 4 }, s, 0.3), false);
  // Köşesiz dikdörtgende köşeye dayalı patch sığar (eski davranış)
  assert.equal(g.icinde(kose, { t: 'rect', x: 0, y: 0, w: 22, h: 12 }, 0), true);
  // Yarıçap kısa kenarın yarısını geçemez
  v.harita.zones[0].kose_cm = 50;
  const yeni = new ic.Model(v).alanlar[0].sekil;
  assert.ok(Math.abs(yeni.r - yeni.h / 2) < 1e-9 && yeni.r < 6.01);
});

test('kalem kutusu gerçek haritaları (Kırmızı, Turuncu): Velcro yüzeyi, yuvarlak köşe, logo yasaklı', () => {
  const haritalar = JSON.parse(readFileSync(new URL('../veri/aksesuar/haritalar.json', import.meta.url), 'utf8'));
  for (const [anahtar, logo] of [['kalem-kutusu-kirmizi', [958, 443]], ['kalem-kutusu-turuncu', [980.5, 442.5]]]) {
    const v = ornekVeri();
    v.aksesuarlar[0] = { ...v.aksesuarlar[0], gorsel: { en: 1200, boy: 655, kucuk: 'k.png', buyuk: 'k.png' }, harita: haritalar[anahtar] };
    const m = new ic.Model(v);
    assert.equal(m.aksesuarlar[0].tasarlanabilir, true, anahtar + ' tasarlanabilir');
    const am = m.aksesuarModeli(9101);
    assert.ok(Math.abs(am.m.Wcm - 22) < 0.05, 'ölçek: görsel 22 cm, ' + am.m.Wcm);
    const alan = am.m.alanlar[0].sekil;
    assert.equal(alan.r, 2);
    // İsim ortada logoya çarpıyorsa ortaya en yakın sığdığı yere kayar: gerçek Cool harfiyle (4,49 × 6 cm) 3 harf tek satır
    assert.equal(am.yer.kapasite({ en: 4.49, boy: 6 }, 0), 3, anahtar + ': kapasite');
    const ic0 = { setId: m.setler[0].id, isim: 'AL', isimMerkez: null, parcalar: [] };
    const pr = am.yer.parcalar(ic0);
    assert.ok(pr.every((p) => am.yer.alanaUygun(p.sekil, p.tip)), anahtar + ': AL sığar');
    assert.ok(Math.abs(pr[0].sekil.y - pr[1].sekil.y) < 1e-9, 'tek satır');
    const pxCm = 1200 / 22;
    const ikon = (cx, cy) => ({ t: 'rect', x: cx - 2, y: cy - 2, w: 4, h: 4 });
    assert.equal(am.yer.alanaUygun(ikon(6, 6), 'icon'), true, 'ortada sığar');
    assert.equal(am.yer.alanaUygun(ikon(logo[0] / pxCm, logo[1] / pxCm), 'icon'), false, anahtar + ': logonun üstüne konmaz');
    // Turuncu: sağ kenardaki D halkası şeridi yasaklı (3 × 3 cm ikon şeridin üstünde)
    if (anahtar === 'kalem-kutusu-turuncu') {
      assert.equal(am.m.yasaklar.length, 2);
      // 1 × 1 cm: x 1095–1150 px; y 455'te şeride değer, y 330'da değmez
      assert.equal(am.yer.alanaUygun({ t: 'rect', x: 1095 / pxCm, y: 455 / pxCm, w: 1, h: 1 }, 'icon'), false, 'D halkasının üstüne konmaz');
      assert.equal(am.yer.alanaUygun({ t: 'rect', x: 1095 / pxCm, y: 330 / pxCm, w: 1, h: 1 }, 'icon'), true, 'şeridin üstünde serbest');
    }
    // Köşeye dayalı 4 × 4 cm ikon yuvarlak köşeden taşar; köşe dairesine teğet konumda sığar (alan kenarı 0,2 cm tolerans kadar dışarıda)
    const tol = am.m.ayar.tasmaTol;
    const sol = alan.x - tol, ust = alan.y - tol;
    assert.equal(am.yer.alanaUygun({ t: 'rect', x: sol, y: ust, w: 4, h: 4 }, 'icon'), false, anahtar + ': köşede taşar');
    const d = (2 + tol) * (1 - 1 / Math.SQRT2) + 0.02;
    assert.equal(am.yer.alanaUygun({ t: 'rect', x: sol + d, y: ust + d, w: 4, h: 4 }, 'icon'), true, anahtar + ': köşe yayının içinde sığar');
  }
});

test('kampanya şeridi: sade iki satır, daha ucuz hedef, tümü; anlaşılır adlar; yerel hesap', () => {
  const k = ic.kampanya;
  assert.equal(k.yonelme('Ekstra %10'), "'a");
  assert.equal(k.yonelme('Ekstra %20'), "'ye");
  assert.equal(k.kampanyaGosterimAdi('2li patche indirim '), "2'li patch indirimi");
  assert.equal(k.kampanyaGosterimAdi(" 3'lü  patche indirim "), "3'lü patch indirimi");
  assert.equal(k.kampanyaGosterimAdi("  4'lü  patche indirim "), "4'lü patch indirimi");
  assert.equal(k.kampanyaGosterimAdi('Ekstra %10 İndirim'), 'Ekstra %10 indirim');
  assert.equal(k.kampanyaGosterimAdi('Çanta Alana 1 Patch Hediye'), 'Çanta Alana 1 Patch Hediye');
  const merdiven = [{ k: 2, ad: '2li patche indirim ', tutar: 6000 }, { k: 3, ad: " 3'lü  patche indirim ", tutar: 19000 }, { k: 4, ad: "  4'lü  patche indirim ", tutar: 37000 }];
  const esikler = [{ baslik: 'Ekstra %10 İndirim', tutar: 500000 }];
  const sade = (d) => { for (const x of [d.sol, d.sag]) { assert.ok(!/kaldı|→/.test(x), x); assert.ok(!/patche/.test(x), x); } };
  // Hiç indirim yok, 1 patch var
  let d = k.seritDurumu({ aktif: {}, sepetIndirim: 0, altToplam: 333000, uygunAdet: 1, ekler: { '+1': { aktif: { '2li patche indirim': 6000 }, sepetIndirim: 6000 } } }, merdiven, esikler, 33000);
  assert.equal(d.sol, "Patch indirimleri 2 patch'ten başlıyor");
  assert.equal(d.sag, '1 patch daha ekle, 60 TL indirim kazan');
  sade(d);
  // 3'lü aktif; bir patch daha 4'lü (330 TL) < Ekstra'ya 1.010 TL
  d = k.seritDurumu({ aktif: { "3'lü patche indirim": 19000 }, sepetIndirim: 19000, altToplam: 399000, uygunAdet: 3,
    ekler: { '+1': { aktif: { "4'lü patche indirim": 37000 }, sepetIndirim: 37000 } } }, merdiven, esikler, 33000);
  assert.equal(d.sol, '190 TL indirim kazandın');
  assert.equal(d.sag, '1 patch daha ekle, indirimin 370 TL olsun');
  assert.deepEqual(duz(d.duraklar.map((x) => x.ulasildi)), [true, true, false, false]);
  sade(d);
  // 4'lü aktif, ara toplam (adet indirimi düşülmüş) 4.280: sıradaki tek hedef Ekstra %10 → 720 TL
  d = k.seritDurumu({ aktif: { "4'lü patche indirim": 37000 }, sepetIndirim: 37000, altToplam: 428000, uygunAdet: 4, ekler: {} }, merdiven, esikler, 33000);
  assert.equal(d.sag, '720 TL daha ekle, tüm siparişe %10 indirim');
  // 4.980 TL tasarım, kampanyalı 4.610: eşik indirimden sonraki tutara bakar → 390 TL
  d = k.seritDurumu({ aktif: { "4'lü patche indirim": 37000 }, sepetIndirim: 37000, altToplam: 461000, uygunAdet: 6, ekler: {} }, merdiven, esikler, 33000, 33000);
  assert.equal(d.sag, '390 TL daha ekle, tüm siparişe %10 indirim');
  // Kalan en ucuz patch'ten az: "1 patch daha ekle"
  d = k.seritDurumu({ aktif: { "4'lü patche indirim": 37000 }, sepetIndirim: 37000, altToplam: 489000, uygunAdet: 7, ekler: {} }, merdiven, esikler, 33000, 33000);
  assert.equal(d.sag, '1 patch daha ekle, tüm siparişe %10 indirim gelsin');
  sade(d);
  // 2'li aktif, ara toplam 4.900: 1 patch (330 TL) yerine Ekstra'ya 100 TL daha ucuz
  d = k.seritDurumu({ aktif: { '2li patche indirim': 6000 }, sepetIndirim: 6000, altToplam: 490000, uygunAdet: 2,
    ekler: { '+1': { aktif: { "3'lü patche indirim": 19000 }, sepetIndirim: 19000 } } }, merdiven, esikler, 33000);
  assert.equal(d.sag, '100 TL daha ekle, tüm siparişe %10 indirim');
  // Hepsi
  d = k.seritDurumu({ aktif: { "4'lü patche indirim": 37000, 'Ekstra %10 İndirim': 63100 }, sepetIndirim: 100100, altToplam: 668000, uygunAdet: 5, ekler: {} }, merdiven, esikler, 33000);
  assert.equal(d.sol, '1.001 TL indirim kazandın 🎉');
  assert.equal(d.sag, 'Bütün kampanyalar sepetinde');
  assert.equal(d.dolu, 1);
  // Yerel hesap, Shopify simülasyonuyla aynı (çanta 3.000 + n harf × 330): eşik adet indirimi sonrası ara toplama bakar;
  // ikisi birlikte tutmazsa daha çok kazandıran seçilir
  const kural = { merdiven, uygun: { 9: true }, yuzde: { 'Ekstra %10 İndirim': 0.1 } };
  const sepetN = (n) => [{ p: 1, f: 300000, q: 1 }, { p: 9, f: 33000, q: n }];
  let y = k.yerelIndirimler(kural, sepetN(6), esikler);
  assert.deepEqual([duz(y.aktif), y.alt], [{ "4'lü patche indirim": 37000 }, 461000]);
  y = k.yerelIndirimler(kural, sepetN(7), esikler);
  assert.deepEqual([duz(y.aktif), y.alt], [{ 'Ekstra %10 İndirim': 53100 }, 531000], '7 harf: tek başına Ekstra %10');
  y = k.yerelIndirimler(kural, sepetN(8), esikler);
  assert.deepEqual([duz(y.aktif), y.alt], [{ "4'lü patche indirim": 37000, 'Ekstra %10 İndirim': 52700 }, 527000]);
  assert.equal(k.kazancMetni('Ekstra %10 İndirim', 66400, esikler), '✨ Ekstra %10 indirim açıldı · Tüm siparişinde −664 TL');
  assert.equal(k.kazancMetni("4'lü patche indirim", 37000, esikler), "🎉 4'lü patch indirimi · −370 TL");
  assert.equal(k.kazancMetni('Çanta Alana 1 Patch Hediye', 33000, esikler), '🎁 1 patch hediye eklendi');
});


test('metin karakter sınırı: geometriyle küçüğü geçerli, aşınca sığmıyor', () => {
  const v = ornekVeri();
  const geo = new ic.Yerlesim(new ic.Model(v)).kapasite(new ic.Model(v).setler[0]);
  v.urun.metin_siniri = 3;
  const m = new ic.Model(v);
  const y = new ic.Yerlesim(m);
  assert.equal(m.metinSiniri, 3);
  assert.ok(geo > 3, 'geometri ' + geo);
  assert.equal(ic.isimAnaliz(m, y, tasarim(m, 'ECE')).kapasite, 3);
  assert.equal(ic.isimAnaliz(m, y, tasarim(m, 'ECE')).sigiyor, true);
  assert.equal(ic.isimAnaliz(m, y, tasarim(m, 'ECEM')).sigiyor, false);
  // Sınır geometriden büyükse geometri geçerli; tanımsızsa yalnız geometri
  const v2 = ornekVeri(); v2.urun.metin_siniri = 99;
  const m2 = new ic.Model(v2);
  assert.equal(ic.isimAnaliz(m2, new ic.Yerlesim(m2), tasarim(m2, 'ECE')).kapasite, geo);
  const m3 = new ic.Model(ornekVeri());
  assert.equal(m3.metinSiniri, null);
  assert.equal(ic.isimAnaliz(m3, new ic.Yerlesim(m3), tasarim(m3, 'ECE')).kapasite, geo);
});

test('kampanya: tasarımın payı yalnız kendi satırlarına düşen indirim', () => {
  const k = ic.kampanya;
  const gid = (v) => 'gid://shopify/ProductVariant/' + v;
  // Sepette başka bir çanta (3.000) + 2 patch; tasarım: çanta + 4 patch. 4'lü −370 TL 6 patch'e dağıldı, Ekstra %10 sepet düzeyinde
  const cart = {
    cost: { subtotalAmount: { amount: '8610.0' } },
    lines: { nodes: [
      { quantity: 2, merchandise: { id: gid(1) }, discountAllocations: [] },
      { quantity: 6, merchandise: { id: gid(9) }, discountAllocations: [{ title: "4'lü patche indirim", discountedAmount: { amount: '370.0' } }] }
    ] },
    discountAllocations: [{ title: 'Ekstra %10 İndirim', discountedAmount: { amount: '861.0' } }]
  };
  const tasarimSatirlari = [{ v: 1, q: 1, f: 300000 }, { v: 9, q: 4, f: 33000 }];
  const pay = k.tasarimPayiSepetten(cart, tasarimSatirlari);
  // Adet: 370 × 4/6 = 246,67; Ekstra: 861 × (4.320 − 246,67) / 8.610 = 407,33
  assert.deepEqual(duz(pay), { "4'lü patche indirim": 24667, 'Ekstra %10 İndirim': 40733 }, "ham pay (kuruş; sepette görünecek tutar)");
  assert.equal(k.tasarimIndirimi({ indirim: 123100, tasarimIndirim: 65400 }), 65400);
  assert.equal(k.tasarimIndirimi({ indirim: 37000 }), 37000);
  assert.equal(k.tasarimIndirimi({ hata: true, indirim: 5 }), 0);
  // Şerit: kazanılan, bu tasarıma düşen indirim (alt çubuk etiketiyle aynı sayı); sepettekilerle birlikte toplam
  // yalnızca kampanya satırlarının altındaki notta geçer
  const d = k.seritDurumu({ aktif: { "4'lü patche indirim": 37000, 'Ekstra %10 İndirim': 86100 }, indirim: 93000, tasarimIndirim: 65400, sepetIndirim: 123100, altToplam: 861000, uygunAdet: 6, ekler: {} },
    [{ k: 4, ad: "4'lü patche indirim", tutar: 37000 }], [{ baslik: 'Ekstra %10 İndirim', tutar: 500000 }], 33000, 33000);
  assert.equal(d.sol, '654 TL indirim kazandın 🎉');
});

test('kampanya önerisi yalnızca sıradaki kampanya yakınsa (en fazla 2 patch ya da 2 patch tutarı)', () => {
  const k = ic.kampanya;
  const merdiven = [{ k: 2, ad: '2li patche indirim ', tutar: 6000 }, { k: 3, ad: " 3'lü  patche indirim ", tutar: 19000 }, { k: 4, ad: "  4'lü  patche indirim ", tutar: 37000 }];
  const esikler = [{ baslik: 'Ekstra %10 İndirim', tutar: 500000 }];
  // 1 patch daha → 3'lü: yakın
  let d = k.seritDurumu({ aktif: { '2li patche indirim': 6000 }, sepetIndirim: 6000, altToplam: 360000, uygunAdet: 2,
    ekler: { '+1': { aktif: { "3'lü patche indirim": 19000 }, sepetIndirim: 19000 } } }, merdiven, esikler, 33000, 33000);
  assert.equal(d.yakin, true);
  // %10'a 1.050 TL (3 patch'ten fazla): uzak
  d = k.seritDurumu({ aktif: { "4'lü patche indirim": 37000 }, sepetIndirim: 37000, altToplam: 395000, uygunAdet: 4, ekler: {} }, merdiven, esikler, 33000, 33000);
  assert.equal(d.sag, '1.050 TL daha ekle, tüm siparişe %10 indirim');
  assert.equal(d.yakin, false);
  // %10'a 390 TL (2 patch tutarından az): yakın
  d = k.seritDurumu({ aktif: { "4'lü patche indirim": 37000 }, sepetIndirim: 37000, altToplam: 461000, uygunAdet: 6, ekler: {} }, merdiven, esikler, 33000, 33000);
  assert.equal(d.yakin, true);
  // Hepsi: öneri yok
  d = k.seritDurumu({ aktif: { "4'lü patche indirim": 37000, 'Ekstra %10 İndirim': 63100 }, sepetIndirim: 100100, altToplam: 668000, uygunAdet: 5, ekler: {} }, merdiven, esikler, 33000, 33000);
  assert.equal(d.yakin, false);
});

test('ayrılmış harfler üst üste gelince ikisi de işaretlenir (son dokunulandan bağımsız)', () => {
  const { m, y } = kur();
  const t = tasarim(m, 'GOK');
  ic.harfleriAyir(y, t);
  // O'yu G'nin üstüne koy; G en son dokunulan olsa da ikisi de hatalı
  t.harfKonumlari[1] = t.harfKonumlari[0].slice();
  t.son = ['harf-1', 'harf-0'];
  const d = ic.duzenle(m, y, t);
  assert.ok(d.hatalar['harf-0'] && d.hatalar['harf-1'], JSON.stringify(Object.keys(d.hatalar)));
  assert.ok(!d.hatalar['harf-2']);
  assert.equal(d.isimGecerli, false, 'Özet ve sepet kontrolü: yazı geçersiz');
});

test('Türkçe karakterler otomatik çevrilir; veri odaklı ve karakter başına set', () => {
  // Cool'da Ç Ğ İ Ö Ş Ü yok: GÖKHAN → GOKHAN, yazılan saklanır, not
  let m = new ic.Model(ornekVeri());
  let t = tasarim(m, ic.buyukHarf('gökhan şiir'.replace(' ', '')));
  assert.equal(t.isim, 'GÖKHANŞİİR');
  assert.equal(ic.turkceCevir(m, t), true);
  assert.equal(t.isim, 'GOKHANSIIR');
  assert.equal(ic.yazilanIsim(t), 'GÖKHANŞİİR');
  assert.equal(ic.ceviriNotu(t), "Ö, Ş ve İ patch'leri olmadığı için O, S ve I kullanıldı.");
  assert.equal(ic.turkceCevir(m, t), false, 'ikinci kez değişmez');
  // ı → I (Türkçe büyük harf kuralı), tek karakter notu
  t = tasarim(m, ic.buyukHarf('ışık'));
  ic.turkceCevir(m, t);
  assert.equal(t.isim, 'ISIK');
  assert.equal(ic.ceviriNotu(t), "Ş patch'i olmadığı için S kullanıldı.");
  // Özet ve sepette çevrilmiş hali, yanında yazılan
  t = tasarim(m, 'GÖKHAN');
  ic.turkceCevir(m, t);
  assert.equal(ic.tasarimOzeti(m, t), 'GOKHAN (yazılan: GÖKHAN)');
  // Mağazaya stokta Cool Ö eklenirse çeviri yapılmaz (kod değişmeden)
  const v = ornekVeri();
  v.setler[0].varyantlar.push({ id: 1999, baslik: 'Ö', karakter: 'Ö', renk: null, fiyat: 33000, satilabilir: true, stok: 5, gorsel: 'Ö.jpg', png: false });
  m = new ic.Model(v);
  t = tasarim(m, 'GÖKHAN');
  assert.equal(ic.turkceCevir(m, t), false);
  assert.equal(t.isim, 'GÖKHAN');
  assert.equal(ic.ceviriNotu(t), '');
  // Stokta değilse yine çevrilir
  v.setler[0].varyantlar[v.setler[0].varyantlar.length - 1].stok = 0;
  m = new ic.Model(v);
  t = tasarim(m, 'GÖKHAN');
  ic.turkceCevir(m, t);
  assert.equal(t.isim, 'GOKHAN');
  // Karışık: Ö Piramit'te var, Cool'da yok → yalnızca Cool seçili Ö çevrilir; set değişince geri döner
  const vp = ornekVeriPiramitli();
  vp.setler[1].varyantlar.push({ id: 5999, baslik: 'Mavi Ö', karakter: null, renk: null, renk_kodu: '#5f7286', png_en: 5.4, png_boy: 6, fiyat: 33000, satilabilir: true, stok: 20, gorsel: 'MaviÖ.png', png: true });
  m = new ic.Model(vp);
  const piramit = m.setler.find((x) => x.cokRenkli);
  t = tasarim(m, 'ÖÖ');
  t.karakterSetleri = [m.setler[0].id, piramit.id];
  ic.turkceCevir(m, t);
  assert.equal(t.isim, 'OÖ');
  assert.deepEqual(duz(t.ceviriler), ['Ö', null]);
  t.karakterSetleri = [piramit.id, piramit.id];
  ic.turkceCevir(m, t);
  assert.equal(t.isim, 'ÖÖ', 'Piramit seçilince Ö geri gelir');
  assert.equal(t.ceviriler, null);
});

/* ---------------- Gerçek şekil (kontur) ve toleranslar ---------------- */

const yuvarlakKontur = (n = 32) => ({ v: 1, o: 1, d: 1, p: Array.from({ length: n }, (_, i) => [0.5 + 0.5 * Math.cos((i / n) * 2 * Math.PI), 0.5 + 0.5 * Math.sin((i / n) * 2 * Math.PI)]) });
// Mağazadaki Octopus patch'inin konturu (içbükey: dokunaçlar)
const ahtapotKontur = { v: 1, o: 1.0256, d: 0, p: [[0.56, 0], [0.388, 0.026], [0.283, 0.106], [0.207, 0.268], [0.192, 0.381], [0.213, 0.532], [0.06, 0.627], [0, 0.696], [0, 0.771], [0.152, 0.944], [0.263, 0.938], [0.34, 0.998], [0.393, 0.998], [0.475, 0.938], [0.588, 0.991], [0.693, 0.92], [0.76, 0.942], [0.83, 0.926], [0.998, 0.781], [0.967, 0.651], [0.76, 0.523], [0.803, 0.297], [0.758, 0.14], [0.685, 0.056]] };
// L harfi: sağ üstte büyük girinti
const lKontur = { v: 1, o: 0.75, d: 0, p: [[0, 0], [0.35, 0], [0.35, 0.7], [1, 0.7], [1, 1], [0, 1]] };

const konturluKur = (ayarlar) => {
  const v = ornekVeri();
  v.ikonlar[3] = { ...v.ikonlar[3], en: '8', boy: '7', kontur: ahtapotKontur }; // Musical Note → ahtapot şekli
  v.ikonlar[4] = { ...v.ikonlar[4], en: '6', boy: '6', kontur: yuvarlakKontur() }; // Sarı Kalp → yuvarlak şekil (kare kutu)
  if (ayarlar) v.ayarlar = { ...v.ayarlar, ...ayarlar };
  const m = new ic.Model(v);
  return { m, y: new ic.Yerlesim(m) };
};

test('kontur: geçersiz veri yok sayılır, şekil yoksa eski dikdörtgen kullanılır', () => {
  assert.equal(g.konturHazirla(null), null);
  assert.equal(g.konturHazirla({ o: 1, p: [[0, 0], [1, 1]] }), null, 'en az 3 nokta');
  assert.equal(g.konturHazirla('bozuk json'), null);
  assert.ok(g.konturHazirla(JSON.stringify(yuvarlakKontur())), 'metin olarak gelen JSON da okunur');
  const { m } = kur();
  const t = tasarim(m, '', [{ uid: 'i1', tip: 'icon', urunId: 4, varyantId: 3004, cx: 20, cy: 20, aci: 0 }]);
  const p = new ic.Yerlesim(m).parcalar(t)[0];
  assert.equal(p.sekil.t, 'rect', 'konturu olmayan ikon dikdörtgen');
  const k = konturluKur();
  const p2 = k.y.parcalar(tasarim(k.m, '', [{ uid: 'i1', tip: 'icon', urunId: 4, varyantId: 3004, cx: 20, cy: 20, aci: 0 }]))[0];
  assert.equal(p2.sekil.t, 'poly', 'konturlu ikon çokgen');
  assert.equal(p2.sekil.y.length, ahtapotKontur.p.length);
});

test('dairenin kenarında yuvarlak patch: kutusunun köşeleri taşsa da şekil içerideyse uyarı yok', () => {
  const { m, y } = konturluKur();
  const c = m.alanlar[0].sekil; // çap 25 cm
  // 6 × 6 kutu, yuvarlak şekil (yarıçap 3). Merkez 9,6 cm dışarıda: şekil 12,6 cm'ye uzanır (≤ 12,5 + 0,2),
  // kutunun köşeleri ise ~13,9 cm'de (eski kontrol taşma derdi)
  const ikon = (d) => [{ uid: 'y1', tip: 'icon', urunId: 5, varyantId: 3005, cx: c.cx + d, cy: c.cy, aci: 0 }];
  const t = tasarim(m, '', ikon(9.6));
  const d = ic.duzenle(m, y, t);
  assert.deepEqual(Object.keys(d.hatalar), [], 'yuvarlak şekil daire içinde');
  assert.equal(y.alanaUygun(g.donukDikdortgen(c.cx + 9.6, c.cy, 6, 6, 0), 'icon'), false, 'aynı yerde dikdörtgen kutu taşardı');
  // 0,3 cm daha dışarı: şekil 12,9 cm'ye uzanır, tolerans aşılır
  const d2 = ic.duzenle(m, y, tasarim(m, '', ikon(9.9)));
  assert.deepEqual(Object.keys(d2.hatalar), ['y1']);
  assert.equal(d2.sorunlar.y1.tur, 'tasma');
});

test('dairenin kenarında düzensiz şekilli patch (ahtapot): her yönde ve dönükken gerçek şekille denetlenir', () => {
  const { m, y } = konturluKur();
  const c = m.alanlar[0].sekil;
  const t = m.ikonHarita[4];
  const sekil = (x, yy, a) => y.parcalar(tasarim(m, '', [{ uid: 'o1', tip: 'icon', urunId: 4, varyantId: 3004, cx: x, cy: yy, aci: a }]))[0].sekil;
  for (const aci of [0, 30, 135]) {
    for (let k = 0; k < 8; k++) {
      const yon = (k / 8) * 2 * Math.PI;
      // Merkezden dışa doğru: gerçek şekil ile kabul edilen en uzak mesafe, dikdörtgenle kabul edilenden fazla
      let rSekil = 0, rKutu = 0;
      for (let d = 0; d <= 12; d += 0.1) {
        const x = c.cx + Math.cos(yon) * d, yy = c.cy + Math.sin(yon) * d;
        if (y.alanaUygun(sekil(x, yy, aci), 'icon')) rSekil = d; else break;
      }
      for (let d = 0; d <= 12; d += 0.1) {
        const x = c.cx + Math.cos(yon) * d, yy = c.cy + Math.sin(yon) * d;
        if (y.alanaUygun(g.donukDikdortgen(x, yy, t.en, t.boy, aci), 'icon')) rKutu = d; else break;
      }
      assert.ok(rSekil > rKutu, aci + '° yön ' + k + ': şekil ' + rSekil.toFixed(1) + ' > kutu ' + rKutu.toFixed(1));
      // Kabul edilen en uzak konumda şeklin hiçbir noktası alanın 0,2 cm'den fazla dışında değil
      const s = sekil(c.cx + Math.cos(yon) * rSekil, c.cy + Math.sin(yon) * rSekil, aci);
      const r = (s.a * Math.PI) / 180;
      for (const q of s.y) {
        const px = s.cx + q[0] * Math.cos(r) - q[1] * Math.sin(r), py = s.cy + q[0] * Math.sin(r) + q[1] * Math.cos(r);
        assert.ok(Math.hypot(px - c.cx, py - c.cy) <= c.r + 0.2 + 1e-6);
      }
    }
  }
});

test('çakışma toleransı: iki patch 0,2 cm\'ye kadar üst üste binebilir; daha fazlası çakışma', () => {
  const { m, y } = konturluKur();
  const c = m.alanlar[0].sekil;
  // İki yuvarlak (yarıçap 3) patch yan yana: merkezler arası 6 − binme
  const iki = (binme) => tasarim(m, '', [
    { uid: 'a', tip: 'icon', urunId: 5, varyantId: 3005, cx: c.cx - 3 + binme / 2, cy: c.cy, aci: 0 },
    { uid: 'b', tip: 'icon', urunId: 5, varyantId: 3005, cx: c.cx + 3 - binme / 2, cy: c.cy, aci: 0 }
  ]);
  assert.deepEqual(Object.keys(ic.duzenle(m, y, iki(0.15)).hatalar), [], '0,15 cm binme serbest');
  assert.ok(Object.keys(ic.duzenle(m, y, iki(0.3)).hatalar).length > 0, '0,3 cm binme çakışma');
  // Aynı yere konan iki patch (kenarları tam üst üste) çakışır
  const ayni = tasarim(m, '', [
    { uid: 'a', tip: 'icon', urunId: 4, varyantId: 3004, cx: c.cx, cy: c.cy, aci: 0 },
    { uid: 'b', tip: 'icon', urunId: 4, varyantId: 3004, cx: c.cx, cy: c.cy, aci: 0 }
  ]);
  assert.ok(Object.keys(ic.duzenle(m, y, ayni).hatalar).length > 0, 'aynı konum çakışma');
  // Dikdörtgen (konturu olmayan) patch'lerde de aynı tolerans
  const k = kur();
  const ck = k.m.alanlar[0].sekil;
  const dk = (binme) => tasarim(k.m, '', [
    { uid: 'a', tip: 'icon', urunId: 4, varyantId: 3004, cx: ck.cx - 3 + binme / 2, cy: ck.cy, aci: 0 },
    { uid: 'b', tip: 'icon', urunId: 4, varyantId: 3004, cx: ck.cx + 3 - binme / 2, cy: ck.cy, aci: 0 }
  ]);
  assert.deepEqual(Object.keys(ic.duzenle(k.m, k.y, dk(0.15)).hatalar), []);
  assert.ok(Object.keys(ic.duzenle(k.m, k.y, dk(0.3)).hatalar).length > 0);
});

test('içbükey şekil: L\'nin girintisine konan patch çakışmaz (dışbükey zarf olsa çakışırdı)', () => {
  const L = g.konturluSekil(g.konturHazirla(lKontur), 10, 10, 6, 8, 0); // kutu 6 × 8; görsel oranı 0,75 → tam oturur
  const kare = { t: 'rect', x: 10 - 3 + 6 * 0.35 + 0.3, y: 10 - 4 + 0.2, w: 3, h: 3 }; // L'nin sağ üstteki boşluğu
  assert.equal(g.cakisir(L, kare, 0), false, 'girintide');
  assert.equal(g.cakisir(L, { ...kare, y: kare.y + 3 }, 0), true, 'aşağı inince L\'nin ayağına değer');
  // Küçük şekil büyüğün tamamen içindeyse (kenarlar kesişmez) de çakışma
  const buyuk = g.konturluSekil(g.konturHazirla(yuvarlakKontur()), 10, 10, 10, 10, 0);
  const kucuk = g.konturluSekil(g.konturHazirla(yuvarlakKontur()), 10.5, 9.5, 2, 2, 0);
  assert.equal(g.cakisir(buyuk, kucuk, 0), true, 'iç içe çokgen');
  assert.equal(g.cakisir(buyuk, kucuk, -0.2), true, 'toleransla da');
  assert.equal(g.cakisir(kucuk, { t: 'rect', x: 10.3, y: 9.3, w: 0.4, h: 0.4 }, 0), true, 'çokgenin içindeki küçük kare');
  // Dönük L de aynı
  const L90 = g.konturluSekil(g.konturHazirla(lKontur), 10, 10, 6, 8, 90);
  assert.equal(g.cakisir(L90, { t: 'rect', x: 20, y: 20, w: 1, h: 1 }, 0), false);
});

test('yasaklı bölgede tolerans yok; alan taşması toleransı katalog ayarından', () => {
  const v = ornekVeri();
  v.ikonlar[4] = { ...v.ikonlar[4], en: '6', boy: '6', kontur: yuvarlakKontur() };
  v.harita = { ...v.harita, forbidden: [{ shape: 'circle', x: 48, y: 50, w: 4, h: 4 }] };
  const m = new ic.Model(v);
  const y = new ic.Yerlesim(m);
  const yasak = m.yasaklar[0];
  // Yuvarlak patch yasaklı daireye 0,05 cm değiyor: tolerans olmadığı için 'yasak'
  const s = g.konturluSekil(m.ikonHarita[5].kontur, yasak.cx - yasak.r - 3 + 0.05, yasak.cy, 6, 6, 0);
  assert.equal(y.konumSorunu(s, 'icon'), 'yasak');
  const s2 = g.konturluSekil(m.ikonHarita[5].kontur, yasak.cx - yasak.r - 3 - 0.05, yasak.cy, 6, 6, 0);
  assert.equal(y.konumSorunu(s2, 'icon'), null);
  // Alan toleransı 0 yapılırsa kenardan 0,1 cm taşan patch geçersiz olur
  const c = m.alanlar[0].sekil;
  const kenar = (mm) => g.konturluSekil(mm.ikonHarita[5].kontur, c.cx, c.cy - c.r + 3 - 0.1, 6, 6, 0);
  assert.equal(y.konumSorunu(kenar(m), 'icon'), null, 'varsayılan 0,2 cm tolerans');
  const v0 = { ...v, ayarlar: { ...v.ayarlar, alan_tasma_toleransi_cm: 0, cakisma_toleransi_cm: 0.5 } };
  const m0 = new ic.Model(v0);
  assert.equal(m0.ayar.tasmaTol, 0);
  assert.equal(m0.ayar.cakismaTol, 0.5);
  assert.equal(new ic.Yerlesim(m0).konumSorunu(kenar(m0), 'icon'), 'tasma');
});

test('yerleştirme: konturlu ikonlar daireye dikdörtgen kutularından daha çok sığar', () => {
  const say = ({ m, y }, urunId) => {
    const t = m.ikonHarita[urunId];
    const dolu = [];
    for (let i = 0; i < 30; i++) {
      const s = y.ilkUygun(ic.parcaSekli(t, t.varyant, 0, 0, 0), 'icon', dolu);
      if (!s) break;
      dolu.push({ tip: 'icon', sekil: s });
    }
    return dolu;
  };
  const k = konturluKur();
  const kutulu = konturluKur();
  kutulu.m.ikonHarita[4].kontur = null;
  kutulu.m.ikonHarita[4].varyant.kontur = null;
  const a = say(k, 4), b = say(kutulu, 4);
  assert.ok(a.length > b.length, 'ahtapot: şekille ' + a.length + ', kutuyla ' + b.length);
  // Yerleşenlerin hiçbiri birbiriyle (toleransı aşarak) çakışmaz ve alan içinde
  for (let i = 0; i < a.length; i++) {
    assert.equal(k.y.konumSorunu(a[i].sekil, 'icon'), null);
    for (let j = i + 1; j < a.length; j++) assert.equal(g.cakisir(a[i].sekil, a[j].sekil, -0.2), false);
  }
});

/* ---------------- Çokgen alanlar (harita shape 'poly') ---------------- */

// U biçimli içbükey alan (cm): 30 × 20, üstten açılan girinti x 16,5–17,5, y 0–12
const uAlan = () => g.cokgenAlan([[0, 0], [16.5, 0], [16.5, 12], [17.5, 12], [17.5, 0], [30, 0], [30, 20], [0, 20]]);
// Görsel 1000 × 1000 px; noktalar %. Kemerli üst panel: alt köşeler düz, üstü yarım daire (yaklaşık), genişlik 24 cm
const kemerNoktalari = () => {
  const p = [[20, 70], [80, 70]];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; p.push([50 + 30 * Math.cos(a), 40 - 30 * Math.sin(a)]); }
  return p;
};
const cokgenVeri = (zones, forbidden = []) => {
  const v = ornekVeri();
  v.gorsel = { en: 1000, boy: 1000, kucuk: 'k.jpg', buyuk: 'b.jpg' };
  v.harita = { surum: 2, kalibre: true, gorsel: { en: 1000, boy: 1000 }, zones, forbidden };
  return v;
};
const kemerZone = () => {
  const p = kemerNoktalari();
  return { id: 'ust-panel', ad: 'Üst panel', shape: 'poly', x: 20, y: 10, w: 60, h: 60, genislik_cm: 24, points: p, allowed_types: ['letter', 'number', 'icon'] };
};

test('çokgen alan: içbükey girinti patch\'in altında kalamaz (köşeleri içeride olsa da)', () => {
  const Z = uAlan();
  const ic = (s) => g.icinde(s, Z, 0);
  // Girintinin altında: geçerli
  assert.equal(ic(g.donukDikdortgen(15, 15, 10, 3, 0)), true);
  // Girintiyi aşan, ama köşeleri ve kenar ortaları kollarda: eski nokta örneklemesi kaçırırdı
  const s = g.donukDikdortgen(15, 9, 10, 3, 0);
  assert.equal(ic(s), false);
  // Döndürülmüş ve daire patch'ler
  assert.equal(ic(g.donukDikdortgen(8, 10, 6, 6, 45)), true);
  assert.equal(ic({ t: 'circle', cx: 17, cy: 15, r: 2.5 }), true);
  assert.equal(ic({ t: 'circle', cx: 17, cy: 13, r: 2.5 }), false, 'daire girintiye giriyor');
  // Kenardan taşma: 0,2 cm tolerans içinde geçerli, fazlası değil
  assert.equal(g.icinde(g.donukDikdortgen(3 - 0.15, 15, 6, 4, 0), Z, -0.2), true);
  assert.equal(g.icinde(g.donukDikdortgen(3 - 0.3, 15, 6, 4, 0), Z, -0.2), false);
  // Nokta içinde (girinti dışarıda)
  assert.equal(g.noktaIcinde(17, 5, Z), false);
  assert.equal(g.noktaIcinde(17, 5, Z, -0.6), true, 'tolerans kadar genişletilmiş');
  assert.equal(g.noktaIcinde(17, 15, Z), true);
});

test('çokgen alan haritadan: ölçek girilen genişlikten, kemerli panelde kapasite ve yerleştirme', () => {
  const m = new ic.Model(cokgenVeri([kemerZone()]));
  const y = new ic.Yerlesim(m);
  const a = m.alanlar[0].sekil;
  assert.equal(a.t, 'cokgen');
  assert.ok(Math.abs(a.w - 24) < 0.01, 'genişlik ' + a.w);
  assert.ok(Math.abs(m.Wcm - 40) < 0.01);
  assert.ok(g.noktaIcinde(...g.merkez(a), a), 'merkez alanın içinde');
  const k = y.kapasite(m.setler[0]);
  assert.ok(k >= 4, 'kapasite ' + k);
  const tm = tasarim(m, 'ECE');
  assert.equal(ic.isimAnaliz(m, y, tm).sigiyor, true);
  // İkonlar sırayla yerleşir; hepsi alanın içinde ve birbirine çakışmıyor
  const t = m.ikonHarita[5];
  const dolu = [];
  for (let i = 0; i < 20; i++) {
    const s = y.ilkUygun(ic.parcaSekli(t, null, 0, 0, 0), 'icon', dolu);
    if (!s) break;
    dolu.push({ tip: 'icon', sekil: s });
  }
  assert.ok(dolu.length >= 6, 'yerleşen ' + dolu.length);
  for (let i = 0; i < dolu.length; i++) {
    assert.equal(y.konumSorunu(dolu[i].sekil, 'icon'), null);
    for (let j = i + 1; j < dolu.length; j++) assert.equal(g.cakisir(dolu[i].sekil, dolu[j].sekil, -0.2), false);
  }
  // Kemerin üst köşesine (dışarıya) konan patch taşıyor; en yakın geçerli yer bulunur
  const ust = [{ tip: 'icon', sekil: ic.parcaSekli(t, null, a.x + 1, a.y + 1, 0) }];
  assert.equal(y.konumSorunu(ust[0].sekil, 'icon'), 'tasma');
  const d = y.enYakin(ust, [], 0, 0);
  assert.ok(d, 'yer bulundu');
  assert.equal(y.konumSorunu(g.kaydir(ust[0].sekil, d[0], d[1]), 'icon'), null);
});

test('çokgen yasaklı bölge ve iki çokgen alan (üst panel + alt cep)', () => {
  const alt = [[22, 75], [78, 75], [78, 95], [22, 95]];
  const yasak = [[40, 50], [60, 50], [60, 56], [40, 56]];
  const m = new ic.Model(cokgenVeri([kemerZone(), { id: 'alt-cep', ad: 'Alt cep', shape: 'poly', x: 22, y: 75, w: 56, h: 20, points: alt, allowed_types: ['icon'] }],
    [{ ad: 'Fermuar', shape: 'poly', x: 40, y: 50, w: 20, h: 6, points: yasak }]));
  const y = new ic.Yerlesim(m);
  assert.equal(m.yasaklar[0].t, 'cokgen');
  const t = m.ikonHarita[5];
  const Y = m.yasaklar[0];
  assert.equal(y.konumSorunu(ic.parcaSekli(t, null, Y.x + Y.w / 2, Y.y + Y.h + 1, 0), 'icon'), 'yasak');
  assert.equal(y.konumSorunu(ic.parcaSekli(t, null, Y.x + Y.w / 2, Y.y + Y.h + 3, 0), 'icon'), null);
  // Alt cep yalnızca ikon: harf orada geçersiz, ikon geçerli
  const A = m.alanlar[1].sekil;
  const c = g.merkez(A);
  assert.equal(y.konumSorunu(ic.parcaSekli(t, null, c[0], c[1], 0), 'icon'), null);
  assert.equal(y.konumSorunu(g.donukDikdortgen(c[0], c[1], 4, 5, 0), 'letter'), 'tasma');
});

test('çokgen alan: ismin ortası girintiye düşüyorsa ismin sığdığı yer aranır', () => {
  // U alanı (%): 1000 px = 40 cm; girinti ortada
  const p = [[10, 20], [47, 20], [47, 55], [53, 55], [53, 20], [90, 20], [90, 80], [10, 80]];
  const m = new ic.Model(cokgenVeri([{ id: 'u', shape: 'poly', x: 10, y: 20, w: 80, h: 60, genislik_cm: 32, points: p }]));
  const y = new ic.Yerlesim(m);
  const yer = y.isimYeri([{ en: 5, boy: 6 }, { en: 5, boy: 6 }, { en: 5, boy: 6 }], 0);
  assert.ok(yer.satir >= 1, 'sığdı');
  assert.ok(yer.merkez[1] > 55 * 0.4, 'girintinin altında: ' + yer.merkez);
});

/* ---------------- Çok alanlı ürün: yazının alanlara dağıtılması ---------------- */

// Üst panel (kemer, 24 cm) ve daha küçük alt cep (22 × 8 cm); ikisi de harf alır
const ikiAlanVeri = () => cokgenVeri([
  kemerZone(),
  { id: 'alt-cep', ad: 'Alt cep', shape: 'rect', x: 22.5, y: 75, w: 55, h: 20, allowed_types: ['letter', 'number', 'icon'] }
]);
const ikiAlanKur = () => {
  const m = new ic.Model(ikiAlanVeri());
  return { m, y: new ic.Yerlesim(m) };
};
const blokParcalari = (y, t) => y.parcalar(t).filter((p) => !p.kenar);

test('çok alanlı: sığmayan yazı hece sınırından bölünür, ilk parça üstteki alana', () => {
  const { m, y } = ikiAlanKur();
  const t = tasarim(m, 'GOKHANCAN');
  const d = ic.duzenle(m, y, t);
  assert.equal(t.bol, 6, 'GOKHAN | CAN');
  assert.deepEqual(duz(t.bolAlan), ['ust-panel', 'alt-cep']);
  assert.deepEqual(Object.keys(d.hatalar), []);
  const gruplar = d.parcalar.map((p) => p.grup);
  assert.deepEqual(duz(gruplar), ['isim', 'isim', 'isim', 'isim', 'isim', 'isim', 'isim2', 'isim2', 'isim2']);
  // İkinci bloğun harfleri alt cepte
  const cep = m.alanlar[1].sekil;
  d.parcalar.filter((p) => p.grup === 'isim2').forEach((p) => assert.equal(g.icinde(p.sekil, cep, -0.2), true));
  const a = ic.isimAnaliz(m, y, t);
  assert.equal(a.sigiyor, true);
  assert.deepEqual(duz(a.bolunme.parcalar), ['GOKHAN', 'CAN']);
  // Otomatik: kapasite iki alanın toplamı
  const k1 = y.kapasite(m.setler[0], 0, m.alanlar[0]);
  const k2 = y.kapasite(m.setler[0], 0, m.alanlar[1]);
  assert.equal(a.kapasite, k1 + k2);
  // Kısa yazı tek blok, en büyük alanda
  const t2 = tasarim(m, 'ECE');
  ic.duzenle(m, y, t2);
  assert.equal(t2.bol, null);
  assert.equal(t2.bolAlan[0], 'ust-panel');
});

test('çok alanlı: yazılan boşluk sığıyorsa bölme noktası olur', () => {
  const { m, y } = ikiAlanKur();
  const t = tasarim(m, 'GOKHANCAN');
  t.bosluk = 7;
  ic.duzenle(m, y, t);
  assert.equal(t.bol, 7, 'GOKHANC | AN');
  t.bosluk = 2;
  t.bol = null;
  ic.duzenle(m, y, t);
  assert.equal(t.bol, 6, 'GO | KHANCAN sığmaz: hece sınırı');
});

test('çok alanlı: seçili alana sığmayan yazı bölünmez; uyarı bilgisi, diğer alan önerisi', () => {
  const { m, y } = ikiAlanKur();
  const t = tasarim(m, 'GOKHAN');
  t.yaziYeri = 'alt-cep';
  const d = ic.duzenle(m, y, t);
  assert.equal(t.bol, null);
  assert.equal(t.bolAlan[0], 'alt-cep');
  const a = ic.isimAnaliz(m, y, t);
  assert.equal(a.sigiyor, false);
  assert.equal(a.alanTasmasi.alan.id, 'alt-cep');
  assert.equal(a.alanTasmasi.kapasite, y.kapasite(m.setler[0], 0, m.alanlar[1]));
  assert.equal(a.alanTasmasi.diger.id, 'ust-panel');
  assert.equal(a.kapasite, a.alanTasmasi.kapasite, 'seçili alanda kapasite yalnızca o alan');
  assert.ok(Object.keys(d.hatalar).length > 0, 'taşan harfler işaretli');
  // Sığan kısa yazı seçili alanda kalır
  t.isim = 'CAN';
  ic.duzenle(m, y, t);
  const cep = m.alanlar[1].sekil;
  blokParcalari(y, t).forEach((p) => assert.equal(g.icinde(p.sekil, cep, -0.2), true));
});

test('çok alanlı: Ayır / Birleştir blok başına; yazı değişince bölme kayar', () => {
  const { m, y } = ikiAlanKur();
  const t = tasarim(m, 'GOKHANCAN');
  ic.duzenle(m, y, t);
  const once = blokParcalari(y, t).map((p) => g.merkez(p.sekil));
  ic.harfleriAyir(y, t, 1);
  assert.equal(!!t.harfAyri, false);
  assert.equal(t.harfAyri2, true);
  const d = ic.duzenle(m, y, t);
  assert.deepEqual(duz(d.parcalar.map((p) => p.grup)), ['isim', 'isim', 'isim', 'isim', 'isim', 'isim', 'harf-6', 'harf-7', 'harf-8']);
  d.parcalar.forEach((p, i) => { const c = g.merkez(p.sekil); assert.ok(Math.abs(c[0] - once[i][0]) < 1e-6 && Math.abs(c[1] - once[i][1]) < 1e-6, 'yerinde kaldı'); });
  // Harfler ayrıyken bölme sabit: başa harf eklenince bölme kayar
  ic.karakterleriHizala(t, 'XGOKHANCAN');
  assert.equal(t.bol, 7);
  ic.karakterleriHizala(t, 'GOKHANCAN');
  assert.equal(t.bol, 6);
  ic.harfleriBirlestir(t, 1);
  assert.equal(!!t.harfAyri2, false);
  assert.equal(t.harfKonumlari, null);
  assert.deepEqual(duz(ic.duzenle(m, y, t).parcalar.map((p) => p.grup).slice(6)), ['isim2', 'isim2', 'isim2']);
  // Kenardaki ikinci blok satın alınmaz (sepete girmez)
  t.isim2Kenar = true;
  assert.equal(ic.satinAlinacak(m, t).isim, 'GOKHAN');
});

test('çok alanlı: sepet konumunda her parçanın alanı; sepetten iki blok olarak geri kurulur', () => {
  const { m, y } = ikiAlanKur();
  const t = tasarim(m, 'GOKHANCAN');
  const d = ic.duzenle(m, y, t);
  const konum = ic.tasarimKonumu(m, d.parcalar, t);
  assert.deepEqual(duz(konum.p.map((x) => x.z)), ['ust-panel', 'ust-panel', 'ust-panel', 'ust-panel', 'ust-panel', 'ust-panel', 'alt-cep', 'alt-cep', 'alt-cep']);
  assert.ok(konum.p.every((x) => x.s === 1));
  const g2 = ic.konumdanTasarim(m, y, duz(konum));
  assert.equal(g2.isim, 'GOKHANCAN');
  assert.equal(g2.bol, 6);
  assert.equal(!!g2.harfAyri, false);
  assert.equal(!!g2.harfAyri2, false);
  const d2 = ic.duzenle(m, y, g2);
  d2.parcalar.forEach((p, i) => {
    const a = g.merkez(p.sekil);
    const b = g.merkez(d.parcalar[i].sekil);
    assert.ok(Math.abs(a[0] - b[0]) < 0.2 && Math.abs(a[1] - b[1]) < 0.2, 'aynı yerde');
  });
});

test('tek alanlı üründe yazı eskisi gibi: bölme yok, seçim seçenekleri yok', () => {
  const { m, y } = kur();
  const t = tasarim(m, 'ABDULKADIR');
  ic.duzenle(m, y, t);
  assert.equal(t.bol, null);
  const konum = ic.tasarimKonumu(m, ic.duzenle(m, y, t).parcalar, t);
  assert.ok(konum.p.every((x) => x.z === undefined));
});

test('örnek tasarım (ana sayfa çok satanlar): Cool Alfabe ile sığan ilk isim, kullanılanlar atlanır', () => {
  const ham = JSON.parse(readFileSync(new URL('./kisisel-veri-spor.json', import.meta.url), 'utf8'));
  const isimler = ['ATLAS', 'LEYLA', 'PERA', 'EGE', 'MIRO', 'ADA', 'ECE'];
  const a = duz(ic.ornekTasarim(ham, isimler, []));
  assert.equal(a.isim, 'ATLAS');
  assert.equal(a.parcalar.length, 5);
  const cool = ham.setler.find((s) => s.set === 'cool');
  const gorseller = new Set(cool.varyantlar.map((v) => v.gorsel));
  a.parcalar.forEach((p) => {
    assert.ok(gorseller.has(p.src), 'Cool Alfabe görseli');
    assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.w <= 100 && p.y + p.h <= 100, 'görselin içinde');
  });
  // Aynı bölümde ikinci karta farklı isim düşer
  const b = duz(ic.ornekTasarim(ham, isimler, ['ATLAS']));
  assert.ok(b && b.isim !== 'ATLAS');
  // Karakter sınırı aşılırsa o isim atlanır
  const sinirli = JSON.parse(JSON.stringify(ham));
  sinirli.urun.metin_siniri = 3;
  const c = duz(ic.ornekTasarim(sinirli, isimler, []));
  assert.ok(c && Array.from(c.isim).length <= 3);
  // Hiçbiri olmazsa null
  assert.equal(ic.ornekTasarim(ham, ['ÇĞŞ'], []), null);
});
