// Gerçek mağaza verisiyle eski ve yeni yerleşim kontrolünü karşılaştırır.
// Kullanım: node sigma-karsilastir.mjs <veri.json> <konturlar.json> <eski-editor.js> <yeni-editor.js>
// veri.json: kopya temanın KisiselVeri JSON'u; konturlar.json: araclar/kontur-cikar.py çıktısı.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const [veriYolu, konturYolu, eskiYol, yeniYol] = process.argv.slice(2);
const ham = JSON.parse(readFileSync(veriYolu, 'utf8'));
const konturlar = JSON.parse(readFileSync(konturYolu, 'utf8'));
const kHarita = {};
konturlar.forEach((x) => { if (x.kontur) kHarita[x.sahip.split('/').pop()] = x.kontur; });
// Yeni liquid çıktısı gibi: ürün, varyant ve aksesuarlara kontur eklenir
const veri = JSON.parse(JSON.stringify(ham));
['setler', 'rakamlar', 'ikonlar'].forEach((g) => veri[g].forEach((p) => {
  p.kontur = kHarita[p.id] || null;
  p.varyantlar.forEach((v) => { v.kontur = kHarita[v.id] || null; });
}));
veri.aksesuarlar.forEach((a) => { a.kontur = kHarita[a.id] || null; });

function yukle(yol) {
  const o = { console, Date, Math, JSON, setTimeout };
  o.window = o; o.HTMLElement = class {}; o.customElements = { get: () => undefined, define: () => {} };
  vm.createContext(o); vm.runInContext(readFileSync(yol, 'utf8'), o);
  return o.KisiselEditorIc;
}
const eski = yukle(eskiYol);
const yeni = yukle(yeniYol);
const kur = (ic, v) => { const m = new ic.Model(JSON.parse(JSON.stringify(v))); return { m, y: new ic.Yerlesim(m) }; };
const E = kur(eski, ham);
const Y = kur(yeni, veri);
const alan = E.m.alanlar[0].sekil;
// İkonun şekli: yeni sürümde parcaSekli (kontur varsa çokgen); eski sürümde dışa açık değil, aynı kuralla kurulur
const sekil = (ic, t, cx, cy) => {
  if (ic.parcaSekli) return ic.parcaSekli(t, t.varyant, cx, cy, 0);
  const en = (t.varyant && t.varyant.en) || t.en, boy = (t.varyant && t.varyant.boy) || t.boy;
  return t.sekil === 'circle' ? { t: 'circle', cx, cy, r: Math.max(en, boy) / 2 } : ic.geometri.donukDikdortgen(cx, cy, en, boy, 0);
};
console.log('Alan:', alan.t, 'çap', (alan.r * 2).toFixed(1), 'cm');

// 1) Daire kenarı: ikonu merkezden dışa doğru kaydır, eski ve yeni kontrolün kabul ettiği en uzak mesafe
const ikonBul = (m, ad) => m.ikonlar.find((i) => i.ad.toLowerCase().includes(ad));
console.log('\n1) Daire kenarı: merkezden en fazla kaç cm uzağa konabiliyor (8 yön, en kötü yön)');
for (const ad of ['octopus', 'retro casette', 'kapibara', 'futbol sahası', 'kırmızı kalp', 'good luck', 'dinozor']) {
  const satir = [];
  for (const [ic, { m, y }] of [[eski, E], [yeni, Y]]) {
    const t = ikonBul(m, ad);
    if (!t) { satir.push('yok'); continue; }
    let enKotu = Infinity;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      let r = 0;
      for (let d = 0; d <= 13; d += 0.05) {
        const s = sekil(ic, t, alan.cx + Math.cos(a) * d, alan.cy + Math.sin(a) * d);
        if (y.alanaUygun(s, 'icon')) r = d; else break;
      }
      enKotu = Math.min(enKotu, r);
    }
    satir.push(enKotu.toFixed(2));
  }
  console.log('  ', ad.padEnd(16), 'eski', satir[0], 'cm  yeni', satir[1], 'cm');
}

// 2) Aynı çanta alanına kaç orta boy ikon sığıyor (açgözlü yerleştirme, 0,5 cm adım)
console.log('\n2) Çanta alanına sığan ikon sayısı (yalnız o ikondan, açgözlü yerleştirme)');
const say = (ic, { m, y }, t) => {
  const dolu = [];
  for (let i = 0; i < 40; i++) {
    const ornek = sekil(ic, t, 0, 0);
    const s = y.ilkUygun(ornek, 'icon', dolu);
    if (!s) break;
    dolu.push({ tip: 'icon', sekil: s });
  }
  return dolu.length;
};
const boyutlar = Y.m.ikonlar.map((i) => ({ ad: i.ad, alan: i.en * i.boy })).sort((a, b) => a.alan - b.alan);
const orta = boyutlar[Math.floor(boyutlar.length / 2)];
const secilen = ['octopus', 'retro casette', 'kapibara', 'kırmızı kalp', 'futbol topu', 'good luck', orta.ad.toLowerCase()];
let te = 0, ty = 0;
for (const ad of [...new Set(secilen)]) {
  const te0 = ikonBul(E.m, ad), ty0 = ikonBul(Y.m, ad);
  if (!te0 || !ty0) continue;
  const a = say(eski, E, te0), b = say(yeni, Y, ty0);
  te += a; ty += b;
  console.log('  ', (ty0.ad + ' (' + ty0.en + '×' + ty0.boy + ' cm' + (ty0.sekil === 'circle' ? ', daire' : '') + ')').padEnd(40), 'eski', String(a).padStart(2), ' yeni', String(b).padStart(2));
}
console.log('   toplam'.padEnd(43), 'eski', te, ' yeni', ty, ' (orta boy ikon: ' + orta.ad + ')');
