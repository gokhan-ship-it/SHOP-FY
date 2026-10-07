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
