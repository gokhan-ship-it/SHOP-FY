// Kopya temanın önizlemesinde ana sayfa Çok satanlar bölümü: sıra, kart bileşeni, filtreler, görünür kart sayısı,
// örnek tasarımlar, tema fontu/renkleri, taşma. Yalnızca okur; ekran görüntüsü almaz.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node canli-cok-satanlar.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const URL0 = 'https://jantifox.com/?preview_theme_id=206773780766';
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const boyutlar = [{ width: 1280, height: 900 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { ...devices['Galaxy S9+'], viewport: { width: 360, height: 740 } }, { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }];
for (const b of boyutlar) {
  const c = await t.newContext(b.viewport ? { ...b, locale: 'tr-TR' } : { viewport: b, locale: 'tr-TR' });
  const s = await c.newPage();
  const hatalar = [];
  s.on('pageerror', (e) => hatalar.push(e.message));
  await s.goto(URL0, { waitUntil: 'load', timeout: 90000 });
  await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) w.remove(); });
  await s.locator('[data-kp-cs]').scrollIntoViewIfNeeded();
  await s.waitForFunction(() => document.querySelectorAll('.kp-ornek').length >= 6, null, { timeout: 30000 }).catch(() => {});
  await s.waitForTimeout(800);
  const r = await s.evaluate(() => {
    const k = document.querySelector('[data-kp-cs]');
    const l = k.querySelector('[data-kp-cs-liste]').getBoundingClientRect();
    let tam = 0, kismi = 0;
    k.querySelectorAll('[data-kp-cs-liste] > li:not([hidden])').forEach((li) => { const q = li.getBoundingClientRect(); if (q.left >= l.left - 1 && q.right <= l.right + 1) tam++; else if (q.right > l.left + 1 && q.left < l.right - 1) kismi++; });
    const h2 = k.querySelector('.section__heading');
    const digerH2 = [...document.querySelectorAll('.section__heading')].find((x) => !k.contains(x));
    const sec = k.closest('.shopify-section');
    const once = sec.previousElementSibling;
    const st = (e) => e && getComputedStyle(e);
    const btn = k.querySelector('.kp-cs__buton');
    return {
      sira: [...k.querySelectorAll('[data-kp-cs-liste] > li')].map((x) => x.getAttribute('data-kp-cs-urun')),
      basliklar: [...k.querySelectorAll('.card__heading a')].map((a) => a.textContent.trim()),
      rozet: k.querySelectorAll('.kp-kk-rozet').length,
      sapkaSade: k.querySelector('[data-kp-cs-urun="sapka"] .kp-kk-rozet, [data-kp-cs-urun="sapka"] .kp-kk-eylem') === null,
      filtreler: [...k.querySelectorAll('[data-kp-cs-filtre]')].map((x) => x.textContent),
      gorunum: { tam, kismi },
      ornek: [...k.querySelectorAll('.kp-ornek__not')].map((x) => x.textContent),
      oncekiBolum: once && once.id,
      font: st(h2).fontFamily.split(',')[0], h2: st(h2).fontSize, digerH2: digerH2 && st(digerH2).fontSize, h2Donusum: st(h2).textTransform,
      etiket: k.querySelector('.section__sub-heading')?.textContent, aciklama: k.querySelector('.section__description')?.textContent.trim(),
      zemin: st(k).backgroundColor,
      buton: btn && { metin: btn.textContent.trim(), href: btn.getAttribute('href'), en: Math.round(btn.getBoundingClientRect().width), kap: Math.round(k.querySelector('.kp-cs__alt').getBoundingClientRect().width), yari: Math.round(btn.getBoundingClientRect().left + btn.getBoundingClientRect().width / 2), radius: st(btn).borderRadius, h: st(btn).height },
      noktalar: k.querySelectorAll('.kp-cs__nokta').length, noktaGorunur: !!k.querySelector('.kp-cs__noktalar').offsetHeight,
      oklar: !!k.querySelector('.kp-cs__oklar').offsetHeight,
      tasma: document.documentElement.scrollWidth > window.innerWidth,
      kisiselHref: k.querySelector('.kp-kk-kisisel, .kp-kk-mobil')?.getAttribute('href')
    };
  });
  console.log((b.viewport || b).width, JSON.stringify(r), 'hatalar:', hatalar);
  await c.close();
}
await t.close();
