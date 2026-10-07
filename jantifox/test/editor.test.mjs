// node --test jantifox/test/  — editörün geometri ve iş kurallarını test eder
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ornekVeri } from './ornek-veri.mjs';

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
