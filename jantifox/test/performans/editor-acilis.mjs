// Editörün açılış düzeni: ürün sayfası ?kisisellestir=1 ile açılır (Çok satanlar / kategori "Kişiselleştir" butonu gibi),
// belirli anlarda önizleme kutusu, sahne yakınlaştırması, yazı alanı ve panelin konumu ölçülür. Ekran görüntüsü yok.
// Kullanım: node test/performans/editor-acilis.mjs <taban-adres> <handle,...> [mobil|masaustu] [tema_id]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const [taban = 'https://jantifox.com', liste = 'mavi-beyaz-cizgili-spor-canta', cihaz = 'mobil', tema = ''] = process.argv.slice(2);
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ayar = cihaz === 'mobil' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } };
const sonuc = [];
for (const h of liste.split(',')) {
  const c = await t.newContext({ ...ayar, locale: 'tr-TR' });
  const s = await c.newPage();
  const olc = () => s.evaluate(() => {
    const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return b.width || b.height ? { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) } : null; };
    const ed = document.querySelector('.kp-editor');
    const gor = ed && ed.querySelector('.kp-onizleme__ic');
    const sahne = ed && ed.querySelector('.kp-sahne');
    const isim = ed && ed.querySelector('[data-kp-isim]');
    const img = ed && ed.querySelector('.kp-sahne__urun');
    const yuk = ed && ed.querySelector('.kp-yukleniyor, [data-kp-yukleniyor]');
    return {
      acik: !!ed && !ed.hidden, vp: { w: innerWidth, h: innerHeight },
      onizleme: r(gor), sahne: sahne ? { w: sahne.style.width, l: sahne.style.left, t: sahne.style.top } : null,
      gorsel: img ? { yuklendi: img.complete && img.naturalWidth > 0, src: (img.currentSrc || img.src || '').split('?')[0].split('/').pop() } : null,
      isim: r(isim), isimGorunur: !!isim && (() => { const b = isim.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight && b.height > 0; })(),
      yukleniyor: !!yuk && !!yuk.offsetParent
    };
  });
  const adres = taban + '/products/' + h + '?kisisellestir=1' + (tema ? '&preview_theme_id=' + tema : '');
  await s.goto(adres, { waitUntil: 'commit', timeout: 90000 });
  const anlar = {};
  for (const ms of [500, 1500, 4000]) { await s.waitForTimeout(ms - (Object.keys(anlar).length ? [500, 1500, 4000][Object.keys(anlar).length - 1] : 0)); anlar[ms] = await olc().catch((e) => ({ hata: e.message.slice(0, 80) })); }
  sonuc.push({ h, anlar });
  await c.close();
}
console.log(JSON.stringify(sonuc));
await t.close();
