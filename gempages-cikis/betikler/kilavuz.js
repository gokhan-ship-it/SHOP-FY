// Kilavuz sayfalarinin bolum bolum dokumu (yayindaki site, temiz oturum). Her cihaz icin gorunen ogeler + render edilmis DOM.
const { webkit, devices } = require('playwright');
const fs = require('fs');
const CIK = process.argv[2]; const sayfalar = JSON.parse(process.argv[3]);
fs.mkdirSync(CIK, { recursive: true });
(async () => {
  const br = await webkit.launch(); const sonuc = {};
  for (const h of sayfalar) {
    sonuc[h] = {};
    for (const cihaz of ['masaustu', 'telefon']) {
      const ctx = await br.newContext(cihaz === 'telefon' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
      const p = await ctx.newPage(); const ag = new Set();
      p.on('request', r => { const t = r.resourceType(); if (['image', 'media', 'font'].includes(t) && !r.url().startsWith('data:')) ag.add(t + ' ' + r.url()); });
      const r = await p.goto('https://texttonext.com/pages/' + h, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(3000);
      for (let i = 0; i < 40; i++) { const k = await p.evaluate(() => { scrollBy(0, 600); return document.documentElement.scrollHeight - scrollY - innerHeight; }); await p.waitForTimeout(400); if (k <= 0) break; }
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500);
      const veri = await p.evaluate(() => {
        const gor = el => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const rc = el.getBoundingClientRect(); return rc.width > 0 && rc.height > 0; };
        const tamGor = el => { for (let e = el; e && e !== document.body; e = e.parentElement) if (!gor(e)) return false; return true; };
        const abs = u => { try { return new URL(u, location.href).href; } catch (e) { return u; } };
        const BLOK = /^(P|H1|H2|H3|H4|H5|H6|LI|BUTTON|A|LABEL|TD|TH|SUMMARY|FIGCAPTION|BLOCKQUOTE)$/;
        const bolumler = [];
        document.querySelectorAll('[id^="shopify-section-template--"]').forEach(sec => {
          const ogeler = []; const goruldu = new Set();
          const yuru = el => {
            if (!(el instanceof Element)) return;
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) return;
            const g = tamGor(el);
            if (el.id && !el.id.startsWith('shopify-section')) ogeler.push({ tur: 'id', id: el.id, gorunur: g, etiket: el.tagName.toLowerCase() });
            if (el.tagName === 'IMG') { ogeler.push({ tur: 'gorsel', url: abs(el.currentSrc || el.src), src: el.getAttribute('src'), alt: el.alt || '', gorunur: g, boyut: Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height) }); return; }
            if (el.tagName === 'VIDEO') { const k = [...el.querySelectorAll('source')].map(s => abs(s.src || s.getAttribute('data-src'))); ogeler.push({ tur: 'video', url: abs(el.currentSrc || el.getAttribute('src') || el.getAttribute('data-src') || k[0] || ''), kaynaklar: k, poster: el.poster || '', autoplay: el.autoplay, loop: el.loop, muted: el.muted, controls: el.controls, gorunur: g }); return; }
            if (el.tagName === 'IFRAME') { ogeler.push({ tur: 'iframe', url: abs(el.src || el.getAttribute('data-src') || ''), gorunur: g }); return; }
            const bg = getComputedStyle(el).backgroundImage; if (bg && bg !== 'none') (bg.match(/url\(["']?([^"')]+)/g) || []).forEach(m => { const u = m.replace(/^url\(["']?/, ''); if (!u.startsWith('data:')) ogeler.push({ tur: 'arka-plan', url: abs(u), gorunur: g }); });
            if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
              ogeler.push({ tur: el.tagName === 'A' ? 'link' : 'buton', metin: (el.innerText || '').trim().replace(/\s+/g, ' '), href: el.getAttribute('href') || '', hrefTam: el.href || '', target: el.getAttribute('target') || '', gorunur: g });
              if (!(el.innerText || '').trim()) { [...el.querySelectorAll('img,video,iframe')].forEach(c => yuru(c)); return; }
            }
            if (BLOK.test(el.tagName) || (el.children.length === 0 && (el.textContent || '').trim())) {
              const t = (el.innerText || el.textContent || '').trim();
              if (t && !goruldu.has(el)) { ogeler.push({ tur: /^H[1-6]$/.test(el.tagName) ? 'baslik-' + el.tagName.toLowerCase() : 'metin', metin: t, etiket: el.tagName.toLowerCase(), gorunur: g }); el.querySelectorAll('*').forEach(c => goruldu.add(c)); }
              [...el.querySelectorAll(el.tagName === 'A' || el.tagName === 'BUTTON' ? 'img,video,iframe' : 'img,video,iframe,a,button')].forEach(c => yuru(c));
              return;
            }
            [...el.children].forEach(yuru);
          };
          [...sec.children].forEach(yuru);
          bolumler.push({ id: sec.id, ogeler });
        });
        const tumIdler = [...document.querySelectorAll('[id]')].map(e => e.id).filter(i => !/^(shopify-|wheelio|ShopifyChat|PBar)/.test(i));
        return { baslik: document.title, kanonik: (document.querySelector('link[rel=canonical]') || {}).href || '', metaAciklama: (document.querySelector('meta[name=description]') || {}).content || '', tema: window.Shopify && Shopify.theme ? Shopify.theme.name + ' (' + Shopify.theme.id + ')' : '?', bolumler, tumIdler };
      });
      veri.sunucuTema = (((r && r.headers()['server-timing']) || '').match(/theme;desc="(\d+)"/) || [])[1] || null;
      veri.agMedya = [...ag];
      sonuc[h][cihaz] = veri;
      if (cihaz === 'masaustu') fs.writeFileSync(`${CIK}/${h}-render-dom.html`, '<!-- Render edilmis DOM (JS calistiktan sonra), yayindaki site, ' + new Date().toISOString() + ', tema: ' + veri.tema + ' -->\n' + await p.content());
      console.log(h, cihaz, veri.tema, veri.sunucuTema, veri.bolumler.map(b => b.ogeler.length).join(','));
      await ctx.close(); await new Promise(z => setTimeout(z, 1500));
    }
  }
  fs.writeFileSync(`${CIK}/kilavuz-dokum.json`, JSON.stringify(sonuc, null, 1)); await br.close();
})();
