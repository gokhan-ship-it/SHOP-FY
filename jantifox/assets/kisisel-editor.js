/*
 * JantiFox kişiselleştirme editörü
 * - Ürün sayfasındaki <kisisel-kart> elementini, tam ekran editörü ve sepete eklemeyi yönetir.
 * - Tüm veri <script id="KisiselVeri-{section}"> JSON'undan okunur (snippets/kisisel-veri.liquid).
 * - Ölçüler santimetre cinsindendir; ekrana yüzde olarak çizilir.
 * - Herhangi bir hata olursa kart gizli kalır ve sayfa bugünkü gibi çalışır.
 */
(function () {
  'use strict';

  if (window.customElements && customElements.get('kisisel-kart')) return;

  // Gizli ölçüm modu (?kp_olcum=1, layout/theme.liquid): yalnızca o moddayken tanımlı; normalde hiçbir şey yapmaz
  var olc = window.kpOlcum || function () {};
  olc('editor_kodu');

  /* ------------------------------------------------------------------ */
  /* Yardımcılar                                                         */
  /* ------------------------------------------------------------------ */

  var EPS = 1e-6;
  var TR_ESLEME = { 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U' };
  var HARF_DESENI = /[A-ZÇĞİÖŞÜ]/;
  var RAKAM_DESENI = /^[0-9]$/;
  // Yazı alanında harf ve rakam birlikte yazılır ("ECE7"); rakamlar rakam setinden gelir
  var KARAKTER_DESENI = /[A-ZÇĞİÖŞÜ0-9]/;
  // Renk kodu metafield'ı yoksa kullanılan yedek renkler (varyant adındaki renk adına göre)
  var RENK_KODLARI = {
    antrasit: '#63778a', beyaz: '#f6f7f8', haki: '#64894d', 'kırmızı': '#fd4a44', mavi: '#8cc8e8', pembe: '#fc5f86',
    saks: '#00438a', 'sarı': '#fcc13a', turkuaz: '#8fddc2', turuncu: '#e06800', 'yeşil': '#278282', siyah: '#222222'
  };

  // İki renk bu Lab uzaklığından (CIE76 ΔE) yakınsa yan yana "aynı renk" sayılır.
  // Piramit'te farklı adlı ama aynı görünen çiftler ΔE ≤ 4 (Mavi O–Antrasit, Haki L–Yeşil V);
  // gerçekten farklı en yakın çift ~18 (Beyaz–buz mavisi).
  var BENZER_RENK_ESIGI = 10;
  // Tek patch'lik üründe sığma denetimi dairesinin en küçük yarıçapı (cm): en büyük patch (~9,6 cm boy, köşegen
  // ~12,2 cm) Velcro'nun ortasında her açıda içinde kalır
  var TEK_PATCH_YARICAP = 8;
  // Tek patch'lik üründe yakın görünüm Velcro'nun ortasında bu kenarlı kareye göre (cm): en büyük patch (~9,6 cm boy)
  // pencerede görünür kalır
  var TEK_PATCH_YAKIN = 10;
  var TEK_PATCH_NOTU = 'Bu çantaya tek patch takılır.';
  var labOnbellek = {};

  function renkLab(kod) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(kod || '').trim());
    if (!m) return null;
    var anahtar = m.slice(1).join('').toLowerCase();
    if (labOnbellek[anahtar]) return labOnbellek[anahtar];
    var c = [1, 2, 3].map(function (i) {
      var x = parseInt(m[i], 16) / 255;
      return x > 0.04045 ? Math.pow((x + 0.055) / 1.055, 2.4) : x / 12.92;
    });
    var X = (c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047;
    var Y = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    var Z = (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883;
    var f = function (t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; };
    return (labOnbellek[anahtar] = [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]);
  }

  // İki varyant göze aynı renkte mi? Renk kodu varsa gerçek renge, yoksa renk adına bakılır.
  function benzerRenk(a, b) {
    if (!a || !b) return false;
    var la = renkLab(a.renkKodu);
    var lb = renkLab(b.renkKodu);
    if (la && lb) return Math.sqrt(Math.pow(la[0] - lb[0], 2) + Math.pow(la[1] - lb[1], 2) + Math.pow(la[2] - lb[2], 2)) < BENZER_RENK_ESIGI;
    return a.renk === b.renk;
  }

  function sayi(v) {
    var n = parseFloat(v);
    return isFinite(n) && n > 0 ? n : null;
  }

  function buyukHarf(metin) {
    try {
      return metin.toLocaleUpperCase('tr-TR');
    } catch (e) {
      // Çok eski tarayıcılar: Türkçe kuralını elle uygula
      return metin.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
    }
  }

  function kacis(metin) {
    return String(metin == null ? '' : metin)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Kutunun içeriğini html ile aynı yapar, ama yalnızca değişen öğeleri değiştirir: aynı kalan öğeler
  // (ve yüklenmiş görselleri) yerinde durur. Sonuç innerHTML = html ile birebir aynıdır.
  // anahtar verilirse (ör. data-uid) içi aynı olup yalnızca öznitelikleri değişen öğe yerinde güncellenir.
  function dugumImzasi(n) {
    return n.nodeType === 1 ? n.outerHTML : '#' + n.nodeType + ':' + n.nodeValue;
  }
  function icerikEsitle(kutu, html, anahtar) {
    var sablon = document.createElement('template');
    sablon.innerHTML = html;
    var yeniler = Array.prototype.slice.call(sablon.content.childNodes);
    var eskiler = Array.prototype.slice.call(kutu.childNodes);
    var imzalar = {};
    var anahtarlilar = {};
    var kullanildi = [];
    eskiler.forEach(function (n, i) {
      var k = dugumImzasi(n);
      (imzalar[k] = imzalar[k] || []).push(i);
      if (anahtar && n.nodeType === 1 && n.hasAttribute(anahtar)) anahtarlilar[n.getAttribute(anahtar)] = i;
    });
    var sonuc = yeniler.map(function (y) {
      var liste = imzalar[dugumImzasi(y)];
      while (liste && liste.length) {
        var i = liste.shift();
        if (!kullanildi[i]) {
          kullanildi[i] = true;
          return eskiler[i];
        }
      }
      return null;
    });
    sonuc = sonuc.map(function (n, j) {
      if (n) return n;
      var y = yeniler[j];
      var i = anahtar && y.nodeType === 1 && y.hasAttribute(anahtar) ? anahtarlilar[y.getAttribute(anahtar)] : undefined;
      var e = i === undefined || kullanildi[i] ? null : eskiler[i];
      if (!e || e.tagName !== y.tagName || e.innerHTML !== y.innerHTML) return y;
      kullanildi[i] = true;
      Array.prototype.slice.call(e.attributes).forEach(function (at) {
        if (!y.hasAttribute(at.name)) e.removeAttribute(at.name);
      });
      Array.prototype.slice.call(y.attributes).forEach(function (at) {
        if (e.getAttribute(at.name) !== at.value) e.setAttribute(at.name, at.value);
      });
      return e;
    });
    sonuc.forEach(function (n, j) {
      if (kutu.childNodes[j] !== n) kutu.insertBefore(n, kutu.childNodes[j] || null);
    });
    while (kutu.childNodes.length > sonuc.length) kutu.removeChild(kutu.lastChild);
  }

  // Mağazanın money_format ayarından bağımsız olarak Türkçe biçim: 4.980 TL, 4.980,50 TL
  function paraBicimle(kurus) {
    var negatif = kurus < 0;
    var toplamKurus = Math.round(Math.abs(Number(kurus) || 0));
    var lira = Math.floor(toplamKurus / 100);
    var kalan = toplamKurus % 100;
    var metin = String(lira).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (kalan) metin += ',' + (kalan < 10 ? '0' : '') + kalan;
    return (negatif ? '-' : '') + metin + ' TL';
  }

  function olayYayinla(ad, veri) {
    try {
      if (window.Shopify && Shopify.analytics && typeof Shopify.analytics.publish === 'function') {
        Shopify.analytics.publish(ad, veri || {});
        olcumKaydi({ kanal: 'Shopify', ad: ad, deger: veri && veri.toplam });
      }
    } catch (e) {
      /* ölçüm hatası akışı bozmasın */
    }
  }

  /* ---------------- Meta ve GA4 olayları ---------------- */

  // Meta: Facebook & Instagram uygulaması pikseli sayfanın kendi fbq'su ile kurar (Shopify'ın "açık" piksel ortamı);
  // standart olaylarını (PageView, ViewContent, sepete ekleme...) o gönderir, sunucudan da (Conversions API) aynı
  // event_id ile tekrarlar. Burada yalnızca editöre özgü olaylar aynı fbq ve aynı piksel ile, tarayıcıdan gönderilir:
  // CustomizeProduct, TasarimTamamlandi, TaslakKaydedildi ve tasarım başına tek AddToCart (tasarımın gerçek ekleme
  // isteği izlenmeyen yoldan gider, uygulama satır başına olay göndermez; bkz. sepeteEkle). Uygulama yalnızca
  // pazarlama izni varken yüklendiği için fbq yoksa ya da izin yoksa olay gönderilmez.
  // GA4: Google & YouTube uygulamasının kurduğu gtag ile, yalnızca bu ölçüm kimliğine.
  var META_PIKSEL = '3419060311599240';
  var GA4_KIMLIK = 'G-QN43QTEZW5';
  // Google & YouTube uygulamasının ürün kimliği biçimi (shopify_ZZ_ürün_varyant)
  var GA4_URUN_ONEKI = 'shopify_ZZ_';

  // Ölçüm modu (?kp_olcum=1) kutusuna kayıt; normal ziyaretçide kpOlcum.olay tanımlı değildir
  function olcumKaydi(kayit) {
    try {
      if (window.kpOlcum && typeof window.kpOlcum.olay === 'function') window.kpOlcum.olay(kayit);
    } catch (e) { /* yoksay */ }
  }

  function paraBirimi() {
    return (window.Shopify && Shopify.currency && Shopify.currency.active) || 'TRY';
  }

  function pazarlamaIzni() {
    try {
      var cp = window.Shopify && Shopify.customerPrivacy;
      if (cp && typeof cp.marketingAllowed === 'function') return !!cp.marketingAllowed();
    } catch (e) { /* yoksay */ }
    return true;
  }

  // Uygulamanın kurduğu piksel (bağlantı değişirse onu kullan); fbevents henüz yüklenmediyse bilinen kimlik
  function metaPikseli() {
    try {
      var p = window.fbq && typeof window.fbq.getState === 'function' ? window.fbq.getState().pixels || [] : [];
      var kimlikler = p.map(function (x) { return String(x.id); });
      if (kimlikler.length && kimlikler.indexOf(META_PIKSEL) < 0) return kimlikler[0];
    } catch (e) { /* yoksay */ }
    return META_PIKSEL;
  }

  function metaOlay(ad, veri, kimlik, ozel) {
    try {
      if (typeof window.fbq === 'function' && pazarlamaIzni()) {
        window.fbq(ozel ? 'trackSingleCustom' : 'trackSingle', metaPikseli(), ad, veri, { eventID: kimlik });
        return true;
      }
    } catch (e) { /* yoksay */ }
    olcumKaydi({ kanal: 'Meta', ad: ad, deger: veri && veri.value, kimlik: kimlik, not: 'gönderilmedi (fbq ya da pazarlama izni yok)' });
    return false;
  }

  function ga4Olay(ad, parametre) {
    var p = { send_to: GA4_KIMLIK };
    Object.keys(parametre || {}).forEach(function (k) { p[k] = parametre[k]; });
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', ad, p);
        return true;
      }
    } catch (e) { /* yoksay */ }
    olcumKaydi({ kanal: 'GA4', ad: ad, deger: p.value, not: 'gönderilmedi (gtag yok ya da hata verdi)' });
    return false;
  }

  function olayKimligi(on) {
    return 'kp-' + on + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Editör açıldı ("Kişiselleştir"): aynı ürün için oturumda bir kez
  function kisisellestirmeOlcumu(m) {
    // Kombinde sweatshirt rengi değişse de oturumda tek olay (değer kombin fiyatı)
    var anahtar = 'kp_cp_' + (m.kombin ? 'kombin' : m.urun.id);
    try {
      if (sessionStorage.getItem(anahtar)) return;
      sessionStorage.setItem(anahtar, '1');
    } catch (e) { /* depolama kapalıysa her açılışta */ }
    var deger = (Number(m.kombin ? m.kombin.fiyat : m.urun.fiyat) || 0) / 100;
    metaOlay('CustomizeProduct', {
      content_ids: [String(m.urun.id)], content_type: 'product_group', content_name: m.kombinAdi || m.urun.baslik, value: deger, currency: paraBirimi()
    }, olayKimligi('cp'));
    ga4Olay('customize_product', {
      value: deger, currency: paraBirimi(),
      items: [{ item_id: GA4_URUN_ONEKI + m.urun.id + '_' + m.urun.varyant, item_name: m.urun.baslik, price: deger, quantity: 1 }]
    });
  }

  // "Tasarımı tamamla": o anki toplam (kampanya indirimi düşülmüş)
  function tamamlamaOlcumu(m, tutarKurus) {
    var deger = Math.max(0, tutarKurus) / 100;
    metaOlay('TasarimTamamlandi', { content_ids: [String(m.urun.id)], content_type: 'product_group', value: deger, currency: paraBirimi() }, olayKimligi('tt'), true);
    ga4Olay('design_complete', { value: deger, currency: paraBirimi(), items: [{ item_id: GA4_URUN_ONEKI + m.urun.id + '_' + m.urun.varyant, item_name: m.urun.baslik }] });
  }

  function taslakOlcumu(m) {
    metaOlay('TaslakKaydedildi', { content_ids: [String(m.urun.id)], content_type: 'product_group' }, olayKimligi('tk'), true);
    ga4Olay('save_draft', { items: [{ item_id: GA4_URUN_ONEKI + m.urun.id + '_' + m.urun.varyant, item_name: m.urun.baslik }] });
  }

  // Tasarım sepete eklendi: tasarım başına tek AddToCart. value = ödenecek tutar (indirimler düşülmüş), içerik = ana
  // ürün ve patch / set / aksesuar ürünleri (Facebook & Instagram kataloğundaki gibi ürün kimliği, product_group).
  // event_id tasarım kimliğinden: aynı tasarımın iki kez sayılmasını Meta da engeller.
  function sepetOlcumu(m, kalemler, tasarimKimlik, tutarKurus) {
    var h = varyantHaritasi(m);
    var urunler = [];
    var icerik = {};
    var ga4 = [];
    var adet = 0;
    kalemler.forEach(function (k) {
      var b = h[String(k.id)] || {};
      var urun = b.p || String(k.id);
      if (!icerik[urun]) {
        icerik[urun] = { id: urun, quantity: 0, item_price: (b.f || 0) / 100 };
        urunler.push(urun);
      }
      icerik[urun].quantity += k.quantity;
      adet += k.quantity;
      ga4.push({ item_id: GA4_URUN_ONEKI + urun + '_' + k.id, item_name: b.n || '', price: (b.f || 0) / 100, quantity: k.quantity });
    });
    var deger = Math.max(0, tutarKurus) / 100;
    metaOlay('AddToCart', {
      content_ids: urunler, content_type: 'product_group', content_name: m.kombinAdi || m.urun.baslik,
      contents: urunler.map(function (u) { return icerik[u]; }), num_items: adet, value: deger, currency: paraBirimi()
    }, 'kp-atc-' + tasarimKimlik);
    ga4Olay('add_to_cart', { value: deger, currency: paraBirimi(), items: ga4 });
  }

  function depoOku(anahtar) {
    try {
      var v = window.localStorage.getItem(anahtar);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return null;
    }
  }

  function depoYaz(anahtar, deger) {
    try {
      if (deger == null) window.localStorage.removeItem(anahtar);
      else window.localStorage.setItem(anahtar, JSON.stringify(deger));
    } catch (e) {
      /* gizli mod vb. */
    }
  }

  var sayac = 0;
  function yeniId(on) {
    sayac += 1;
    return (on || 'p') + Date.now().toString(36) + sayac;
  }

  function tasarimKimligi() {
    var harfler = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
    var s = '';
    for (var i = 0; i < 6; i++) s += harfler.charAt(Math.floor(Math.random() * harfler.length));
    return 'T' + Date.now().toString(36).toUpperCase() + s;
  }

  function sadeAd(baslik) {
    return String(baslik || '')
      .replace(/\s*patch\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ------------------------------------------------------------------ */
  /* Geometri (cm)                                                       */
  /* ------------------------------------------------------------------ */

  function dikdortgen(cx, cy, w, h) {
    return { t: 'rect', x: cx - w / 2, y: cy - h / 2, w: w, h: h };
  }

  // Açılar derece, saat yönünde (ekran koordinatı, y aşağı); [0, 360) aralığına indirilir
  function aciNormal(a) {
    a = Math.round((Number(a) || 0) * 100) / 100;
    a %= 360;
    return a < 0 ? a + 360 : a;
  }

  function dondurNokta(nokta, pivot, aci) {
    if (!aci) return [nokta[0], nokta[1]];
    var r = (aci * Math.PI) / 180;
    var dx = nokta[0] - pivot[0];
    var dy = nokta[1] - pivot[1];
    return [pivot[0] + dx * Math.cos(r) - dy * Math.sin(r), pivot[1] + dx * Math.sin(r) + dy * Math.cos(r)];
  }

  // Dönük dikdörtgen (obb). 0/180° ve 90/270° eksene hizalı dikdörtgen olarak kalır.
  function donukDikdortgen(cx, cy, w, h, aci) {
    var a = aciNormal(aci);
    if (a % 180 === 0) return dikdortgen(cx, cy, w, h);
    if (a % 180 === 90) return dikdortgen(cx, cy, h, w);
    return { t: 'obb', cx: cx, cy: cy, w: w, h: h, a: a };
  }

  // Köşeleri yuvarlatılmış dikdörtgen (aksesuar dış ölçüsü): her açıda obb, r = köşe yarıçapı.
  // Çakışmada dikdörtgen gibi (temkinli), alana sığmada yuvarlak köşeleriyle hesaplanır.
  function yuvarlakKoseli(cx, cy, w, h, aci, r) {
    return { t: 'obb', cx: cx, cy: cy, w: w, h: h, a: aciNormal(aci), r: Math.max(0, Math.min(r || 0, w / 2, h / 2)) };
  }

  function koseler(s) {
    if (s.t === 'rect') return [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h]];
    var hw = s.w / 2;
    var hh = s.h / 2;
    return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(function (k) {
      return dondurNokta([s.cx + k[0], s.cy + k[1]], [s.cx, s.cy], s.a);
    });
  }

  // Noktanın dönük dikdörtgenin kendi eksenlerindeki konumu (merkez = 0, 0)
  function yerelNokta(s, px, py) {
    var k = dondurNokta([px, py], [s.cx, s.cy], -s.a);
    return [k[0] - s.cx, k[1] - s.cy];
  }

  // Ayırıcı eksen teoremi (SAT): iki dışbükey dörtgen çakışıyor mu?
  function satCakisir(pa, pb, bosluk) {
    var cokgenler = [pa, pb];
    for (var c = 0; c < 2; c++) {
      var p = cokgenler[c];
      for (var i = 0; i < 2; i++) {
        var ex = p[i + 1][0] - p[i][0];
        var ey = p[i + 1][1] - p[i][1];
        var u = Math.sqrt(ex * ex + ey * ey) || 1;
        var nx = -ey / u;
        var ny = ex / u;
        var aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
        pa.forEach(function (k) { var d = k[0] * nx + k[1] * ny; aMin = Math.min(aMin, d); aMax = Math.max(aMax, d); });
        pb.forEach(function (k) { var d = k[0] * nx + k[1] * ny; bMin = Math.min(bMin, d); bMax = Math.max(bMax, d); });
        if (aMin >= bMax + bosluk - EPS || bMin >= aMax + bosluk - EPS) return false;
      }
    }
    return true;
  }

  function obbDaire(o, c, bosluk) {
    var y = yerelNokta(o, c.cx, c.cy);
    return dikdortgenDaire({ x: -o.w / 2, y: -o.h / 2, w: o.w, h: o.h }, { cx: y[0], cy: y[1], r: c.r }, bosluk);
  }

  function merkez(s) {
    if (s.t === 'rect') return [s.x + s.w / 2, s.y + s.h / 2];
    if (s.t === 'cokgen') return s.ic;
    return [s.cx, s.cy];
  }

  function kutu(s) {
    if (s.t === 'rect') return { x: s.x, y: s.y, w: s.w, h: s.h };
    // Çokgende de görsel kutusu (dönük dikdörtgen) esas: seçim ve set çerçeveleri bu kutuya göre çizilir
    if (s.t === 'obb' || s.t === 'poly') {
      var k = koseler(s);
      var xs = k.map(function (p) { return p[0]; });
      var ys = k.map(function (p) { return p[1]; });
      var x1 = Math.min.apply(null, xs);
      var y1 = Math.min.apply(null, ys);
      return { x: x1, y: y1, w: Math.max.apply(null, xs) - x1, h: Math.max.apply(null, ys) - y1 };
    }
    if (s.t === 'circle') return { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 };
    if (s.t === 'cokgen') return { x: s.x, y: s.y, w: s.w, h: s.h };
    return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 };
  }

  // m > 0: şekli içeri daraltır, m < 0: dışarı genişletir
  function noktaIcinde(px, py, s, m) {
    m = m || 0;
    if (s.t === 'cokgen') {
      var icZ = cokgendeMi(px, py, s);
      if (!m) return icZ;
      return m > 0 ? icZ && !kenaraYakin(px, py, s, m) : icZ || kenaraYakin(px, py, s, -m + EPS);
    }
    if (s.t === 'poly') {
      var cp = cokgenNoktalari(s);
      var ic = noktaCokgende(px, py, cp);
      if (!m) return ic;
      var u = kenarUzakligi(px, py, cp);
      return m > 0 ? ic && u >= m - EPS : ic || u <= -m + EPS;
    }
    if (s.t === 'rect') {
      if (!(px >= s.x + m - EPS && px <= s.x + s.w - m + EPS && py >= s.y + m - EPS && py <= s.y + s.h - m + EPS)) return false;
      if (s.r) {
        // Köşeleri yuvarlatılmış alan (harita: kose_cm): köşe bölgesinde nokta köşe dairesinin içinde olmalı
        var rax = Math.abs(px - (s.x + s.w / 2)) - (s.w / 2 - s.r);
        var ray = Math.abs(py - (s.y + s.h / 2)) - (s.h / 2 - s.r);
        if (rax > 0 && ray > 0) return rax * rax + ray * ray <= Math.pow(Math.max(0, s.r - m), 2) + EPS;
      }
      return true;
    }
    if (s.t === 'obb') {
      var y = yerelNokta(s, px, py);
      var ax = Math.abs(y[0]);
      var ay = Math.abs(y[1]);
      if (ax > s.w / 2 - m + EPS || ay > s.h / 2 - m + EPS) return false;
      if (s.r) {
        // Yuvarlak köşe bölgesi: köşe dairesinin içinde olmalı
        var kx = s.w / 2 - s.r;
        var ky = s.h / 2 - s.r;
        if (ax > kx && ay > ky) return Math.pow(ax - kx, 2) + Math.pow(ay - ky, 2) <= Math.pow(Math.max(0, s.r - m), 2) + EPS;
      }
      return true;
    }
    if (s.t === 'circle') {
      var r = s.r - m;
      if (r <= 0) return false;
      var dx = px - s.cx;
      var dy = py - s.cy;
      return dx * dx + dy * dy <= r * r + EPS;
    }
    var rx = s.rx - m;
    var ry = s.ry - m;
    if (rx <= 0 || ry <= 0) return false;
    var ex = (px - s.cx) / rx;
    var ey = (py - s.cy) / ry;
    return ex * ex + ey * ey <= 1 + EPS;
  }

  function sinirNoktalari(s, n) {
    n = n || 24;
    var p = [];
    if (s.t === 'poly') return cokgenNoktalari(s);
    if (s.t === 'cokgen') return s.p;
    if (s.t === 'rect') {
      var x2 = s.x + s.w;
      var y2 = s.y + s.h;
      p.push([s.x, s.y], [x2, s.y], [x2, y2], [s.x, y2]);
      p.push([s.x + s.w / 2, s.y], [x2, s.y + s.h / 2], [s.x + s.w / 2, y2], [s.x, s.y + s.h / 2]);
      return p;
    }
    if (s.t === 'obb' && s.r) {
      // Yuvarlak köşeler: her köşede yay boyunca noktalar + kenar ortaları
      var hw = s.w / 2 - s.r;
      var hh = s.h / 2 - s.r;
      var yerel = [];
      [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]].forEach(function (k0) {
        for (var j = 0; j <= 6; j++) {
          var aa = ((k0[2] + (j * 90) / 6) * Math.PI) / 180;
          yerel.push([k0[0] * hw + Math.cos(aa) * s.r, k0[1] * hh + Math.sin(aa) * s.r]);
        }
      });
      yerel.push([0, -s.h / 2], [s.w / 2, 0], [0, s.h / 2], [-s.w / 2, 0]);
      return yerel.map(function (q) { return dondurNokta([s.cx + q[0], s.cy + q[1]], [s.cx, s.cy], s.a); });
    }
    if (s.t === 'obb') {
      var k = koseler(s);
      return k.concat(k.map(function (a, i) {
        var b = k[(i + 1) % 4];
        return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      }));
    }
    var rx = s.t === 'circle' ? s.r : s.rx;
    var ry = s.t === 'circle' ? s.r : s.ry;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      p.push([s.cx + Math.cos(a) * rx, s.cy + Math.sin(a) * ry]);
    }
    return p;
  }

  // İç şekil, dış (dışbükey) şeklin içinde mi? (m: kenar payı)
  function icinde(ic, dis, m) {
    if (dis.t === 'cokgen') return cokgenAlandaMi(ic, dis, m || 0);
    if (ic.t === 'circle' && dis.t === 'circle') {
      return Math.sqrt(Math.pow(ic.cx - dis.cx, 2) + Math.pow(ic.cy - dis.cy, 2)) + ic.r <= dis.r - m + EPS;
    }
    var noktalar = sinirNoktalari(ic, 32);
    for (var i = 0; i < noktalar.length; i++) {
      if (!noktaIcinde(noktalar[i][0], noktalar[i][1], dis, m)) return false;
    }
    return true;
  }

  function dikdortgenDaire(r, c, bosluk) {
    var nx = Math.max(r.x, Math.min(c.cx, r.x + r.w));
    var ny = Math.max(r.y, Math.min(c.cy, r.y + r.h));
    var dx = c.cx - nx;
    var dy = c.cy - ny;
    var sinir = c.r + bosluk;
    return dx * dx + dy * dy < sinir * sinir - EPS;
  }

  function cakisir(a, b, bosluk) {
    bosluk = bosluk || 0;
    if (b.t === 'cokgen') return cokgenYasakCakisir(a, b);
    if (a.t === 'cokgen') return cokgenYasakCakisir(b, a);
    if (a.t === 'poly' || b.t === 'poly') return cokgenCakisir(a, b, bosluk);
    if (a.t === 'rect' && b.t === 'rect') {
      return (
        a.x < b.x + b.w + bosluk - EPS &&
        b.x < a.x + a.w + bosluk - EPS &&
        a.y < b.y + b.h + bosluk - EPS &&
        b.y < a.y + a.h + bosluk - EPS
      );
    }
    if (a.t === 'circle' && b.t === 'circle') {
      var d = Math.sqrt(Math.pow(a.cx - b.cx, 2) + Math.pow(a.cy - b.cy, 2));
      return d < a.r + b.r + bosluk - EPS;
    }
    if ((a.t === 'obb' || b.t === 'obb') && a.t !== 'ellipse' && b.t !== 'ellipse') {
      if (a.t === 'circle') return obbDaire(b, a, bosluk);
      if (b.t === 'circle') return obbDaire(a, b, bosluk);
      return satCakisir(koseler(a), koseler(b), bosluk);
    }
    if (a.t === 'rect' && b.t === 'circle') return dikdortgenDaire(a, b, bosluk);
    if (a.t === 'circle' && b.t === 'rect') return dikdortgenDaire(b, a, bosluk);
    // Elips içeren durumlar: örnekleme
    var pa = sinirNoktalari(a, 36);
    var pb = sinirNoktalari(b, 36);
    var i;
    for (i = 0; i < pa.length; i++) if (noktaIcinde(pa[i][0], pa[i][1], b, -bosluk)) return true;
    for (i = 0; i < pb.length; i++) if (noktaIcinde(pb[i][0], pb[i][1], a, -bosluk)) return true;
    var ma = merkez(a);
    var mb = merkez(b);
    return noktaIcinde(ma[0], ma[1], b) || noktaIcinde(mb[0], mb[1], a);
  }

  function kaydir(s, dx, dy) {
    var k;
    if (s.t === 'rect') {
      k = { t: 'rect', x: s.x + dx, y: s.y + dy, w: s.w, h: s.h };
      if (s.r) k.r = s.r;
    } else {
      k = {};
      for (var a in s) k[a] = s[a];
      k.cx += dx;
      k.cy += dy;
    }
    // Hesaplanmış noktalar (çokgen, zarf) yeniden hesaplanmaz, yalnızca kaydırılır (yer aramada binlerce aday)
    if (s._ob) kaydirilmisOnbellek(s._ob, k, dx, dy);
    return k;
  }

  function kaydirilmisOnbellek(o, k, dx, dy) {
    var t = function (p) { return p.map(function (q) { return [q[0] + dx, q[1] + dy]; }); };
    var tk = function (b) { return { x: b.x + dx, y: b.y + dy, w: b.w, h: b.h }; };
    var y = {};
    for (var a in o) {
      var v = o[a];
      if (a === 'p') y.p = t(v);
      else if (a === 'kutu') y.kutu = tk(v);
      else if (a.charAt(0) === 'h') y[a] = { p: t(v.p), kutu: tk(v.kutu) };
      else if (a.charAt(0) === 'c') {
        y[a] = { p: t(v.p), kutu: tk(v.kutu), ic: t(v.ic), d: v.d && { c: [v.d.c[0] + dx, v.d.c[1] + dy], ri: v.d.ri, ro: v.d.ro } };
        if (v.e) y[a].e = v.e.map(function (z, i) { return z + (i % 2 ? dy : dx); });
      }
    }
    Object.defineProperty(k, '_ob', { value: y, enumerable: false, writable: true });
  }

  /* ---------------- Gerçek şekil (çokgen) ---------------- */
  // Patch'in şeffaf PNG'sinden çıkarılmış dış çizgi (kisisellestirme.kontur): { o: görsel en/boy, d: dışbükey mi,
  // p: [[x, y], ...] 0..1 }. Şekil t: 'poly' — cx, cy, w, h, a dönük dikdörtgenle aynıdır (görsel kutusu ve seçim
  // çerçevesi bu kutuya göre), y: noktaların kutu merkezine göre yerel konumu (cm, dönmemiş).

  var konturSayac = 0;
  function konturHazirla(k) {
    if (typeof k === 'string') {
      try { k = JSON.parse(k); } catch (e) { return null; }
    }
    if (!k || !Array.isArray(k.p) || !(Number(k.o) > 0)) return null;
    var p = k.p
      .map(function (q) { return [Number(q && q[0]), Number(q && q[1])]; })
      .filter(function (q) { return isFinite(q[0]) && isFinite(q[1]); });
    if (p.length < 3) return null;
    return { n: ++konturSayac, o: Number(k.o), d: !!k.d, p: p, onbellek: {} };
  }

  // Konturun en × boy kutusundaki yerel noktaları. Görsel kutuya önizlemedeki gibi oranını koruyarak oturur
  // (object-fit: contain): görselin oranı kutununkinden farklıysa çizgi de aynı şekilde küçülür.
  function konturYerel(k, en, boy) {
    var anahtar = en + 'x' + boy;
    var y = k.onbellek[anahtar];
    if (y) return y;
    var gw = en;
    var gh = boy;
    if (k.o > en / boy) gh = en / k.o;
    else gw = boy * k.o;
    y = k.p.map(function (q) { return [(q[0] - 0.5) * gw, (q[1] - 0.5) * gh]; });
    y.icler = {};
    k.onbellek[anahtar] = y;
    return y;
  }

  function konturluSekil(k, cx, cy, en, boy, aci) {
    return { t: 'poly', cx: cx, cy: cy, w: en, h: boy, a: aciNormal(aci), y: konturYerel(k, en, boy) };
  }

  // Konturu varsa gerçek şekil, yoksa eskisi gibi (dönük) dikdörtgen
  function sekilOlustur(k, cx, cy, en, boy, aci) {
    return k ? konturluSekil(k, cx, cy, en, boy, aci) : donukDikdortgen(cx, cy, en, boy, aci);
  }

  // Şekil başına hesap önbelleği (sayılamaz özellik: kaydir() kopyalarken taşınmaz; şekiller yerinde değişmez)
  function sekilOnbellegi(s) {
    var o = s._ob;
    if (!o) {
      o = {};
      Object.defineProperty(s, '_ob', { value: o, enumerable: false, writable: true });
    }
    return o;
  }

  // Çokgenin dünya koordinatlarındaki noktaları (önbellekli)
  function cokgenNoktalari(s) {
    var o = sekilOnbellegi(s);
    return o.p || (o.p = dunyaNoktalari(s, s.y));
  }

  function noktaKutusu(p) {
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (var i = 0; i < p.length; i++) {
      var q = p[i];
      if (q[0] < x1) x1 = q[0];
      if (q[0] > x2) x2 = q[0];
      if (q[1] < y1) y1 = q[1];
      if (q[1] > y2) y2 = q[1];
    }
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  function dunyaNoktalari(s, yerel) {
    var r = (s.a * Math.PI) / 180;
    var cs = Math.cos(r);
    var sn = Math.sin(r);
    return yerel.map(function (q) { return [s.cx + q[0] * cs - q[1] * sn, s.cy + q[0] * sn + q[1] * cs]; });
  }

  function isaretliAlan(p) {
    var a = 0;
    for (var i = 0; i < p.length; i++) {
      var j = (i + 1) % p.length;
      a += p[i][0] * p[j][1] - p[j][0] * p[i][1];
    }
    return a / 2;
  }

  // Çokgeni t kadar içe çeker (t < 0: dışa genişletir). Kenarlar t kadar kaydırılır, köşeler komşu kenarların kesişimi.
  function iceCek(p, t) {
    if (!t) return p;
    var yon = isaretliAlan(p) > 0 ? 1 : -1;
    var n = p.length;
    var normaller = p.map(function (a, i) {
      var b = p[(i + 1) % n];
      var dx = b[0] - a[0];
      var dy = b[1] - a[1];
      var u = Math.sqrt(dx * dx + dy * dy) || 1;
      return [(-dy / u) * yon, (dx / u) * yon];
    });
    return p.map(function (q, i) {
      var n1 = normaller[(i - 1 + n) % n];
      var n2 = normaller[i];
      var bx = n1[0] + n2[0];
      var by = n1[1] + n2[1];
      var c = 1 + n1[0] * n2[0] + n1[1] * n2[1];
      // Köşe kayması: iki kenar normalinin açıortayı boyunca t / cos(yarım açı); çok sivri köşelerde sınırlanır
      var k = c > 0.1 ? t / c : t * 10;
      if (Math.abs(k) * Math.sqrt(bx * bx + by * by) > Math.abs(t) * 4) {
        var u = Math.sqrt(bx * bx + by * by) || 1;
        return [q[0] + (bx / u) * t, q[1] + (by / u) * t];
      }
      return [q[0] + bx * k, q[1] + by * k];
    });
  }

  function vektorel(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  }

  // İki doğru parçası birbirini kesiyor mu (yalnızca değme sayılmaz)
  function parcalarKesisir(a, b, c, d) {
    var d1 = vektorel(c, d, a);
    var d2 = vektorel(c, d, b);
    var d3 = vektorel(a, b, c);
    var d4 = vektorel(a, b, d);
    return ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS));
  }

  function noktaCokgende(x, y, p) {
    var ic = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) ic = !ic;
    }
    return ic;
  }

  function parcayaUzaklik(x, y, a, b) {
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    var u = dx * dx + dy * dy;
    var t = u ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / u)) : 0;
    var px = a[0] + t * dx - x;
    var py = a[1] + t * dy - y;
    return Math.sqrt(px * px + py * py);
  }

  function kenarUzakligi(x, y, p) {
    var en = Infinity;
    for (var i = 0; i < p.length; i++) en = Math.min(en, parcayaUzaklik(x, y, p[i], p[(i + 1) % p.length]));
    return en;
  }

  // Kenar ortalarının biraz içerisi: kenarları çakışan (aynı hizadaki) çokgenlerde de üst üste binmeyi yakalar
  function icNoktalar(p) {
    var yon = isaretliAlan(p) > 0 ? 1 : -1;
    var d = 1e-3;
    return p.map(function (a, i) {
      var b = p[(i + 1) % p.length];
      var dx = b[0] - a[0];
      var dy = b[1] - a[1];
      var u = Math.sqrt(dx * dx + dy * dy) || 1;
      return [(a[0] + b[0]) / 2 - (dy / u) * yon * d, (a[1] + b[1]) / 2 + (dx / u) * yon * d];
    });
  }

  // Çokgenin (yerel) iç ve dış dairesi: iç dairenin merkezi şeklin içinde en derin noktaya yakın (ızgara taraması),
  // ri = o noktadan en yakın kenara, ro = en uzak köşeye uzaklık. İki şeklin iç daireleri kesişiyorsa kesin çakışır,
  // dış daireleri ayrıksa kesin çakışmaz; yalnızca arada kalanlar kenar kenar denenir.
  function cokgenDaireleri(y) {
    if (y.daireler) return y.daireler;
    var b = noktaKutusu(y);
    var enIyi = null;
    var enIyiR = -1;
    for (var i = 1; i < 12; i++) {
      for (var j = 1; j < 12; j++) {
        var x = b.x + (b.w * i) / 12;
        var yy = b.y + (b.h * j) / 12;
        if (!noktaCokgende(x, yy, y)) continue;
        var u = kenarUzakligi(x, yy, y);
        if (u > enIyiR) { enIyiR = u; enIyi = [x, yy]; }
      }
    }
    if (!enIyi) { enIyi = [b.x + b.w / 2, b.y + b.h / 2]; enIyiR = 0; }
    var ro = 0;
    y.forEach(function (q) { ro = Math.max(ro, Math.sqrt(Math.pow(q[0] - enIyi[0], 2) + Math.pow(q[1] - enIyi[1], 2))); });
    y.daireler = { c: enIyi, ri: enIyiR, ro: ro };
    return y.daireler;
  }

  // Yer aramadan önce: adaylar bu şeklin kaydırılmış kopyaları; hesaplar bir kez yapılır, adaylara kaydırılarak taşınır
  function onbellegiIsit(s, m) {
    if (m.cokgenAlan) alanZarfi(s, m.ayar.tasmaTol);
    if (s.t !== 'poly') return;
    cokgenNoktalari(s);
    sikiKutu(s);
    carpismaCokgeni(s, m.ayar.cakismaTol / 2);
  }

  // Kenarların kutuları (x1, y1, x2, y2 art arda)
  function kenarKutulari(p) {
    var e = new Array(p.length * 4);
    for (var i = 0; i < p.length; i++) {
      var a = p[i];
      var b = p[(i + 1) % p.length];
      e[i * 4] = a[0] < b[0] ? a[0] : b[0];
      e[i * 4 + 1] = a[1] < b[1] ? a[1] : b[1];
      e[i * 4 + 2] = a[0] > b[0] ? a[0] : b[0];
      e[i * 4 + 3] = a[1] > b[1] ? a[1] : b[1];
    }
    return e;
  }

  // Kutunun (x1, y1, x2, y2) içine değen kenarların başlangıç sıraları
  function kutudakiKenarlar(P, x1, y1, x2, y2) {
    var e = P.e || (P.e = kenarKutulari(P.p));
    var liste = [];
    for (var i = 0, n = P.p.length; i < n; i++) {
      var k = i * 4;
      if (e[k + 2] < x1 || e[k] > x2 || e[k + 3] < y1 || e[k + 1] > y2) continue;
      liste.push(i);
    }
    return liste;
  }

  // P, Q: { p: noktalar, kutu, ic: içerideki örnek noktalar }. Yalnızca iki kutunun ortak bölgesindeki kenarlar denenir.
  function cokgenlerKesisir(P, Q) {
    var p = P.p;
    var q = Q.p;
    if (P.d && Q.d) {
      var u = Math.sqrt(Math.pow(P.d.c[0] - Q.d.c[0], 2) + Math.pow(P.d.c[1] - Q.d.c[1], 2));
      if (u < P.d.ri + Q.d.ri - EPS) return true;
      if (u > P.d.ro + Q.d.ro + EPS) return false;
    }
    var x1 = Math.max(P.kutu.x, Q.kutu.x) - EPS;
    var y1 = Math.max(P.kutu.y, Q.kutu.y) - EPS;
    var x2 = Math.min(P.kutu.x + P.kutu.w, Q.kutu.x + Q.kutu.w) + EPS;
    var y2 = Math.min(P.kutu.y + P.kutu.h, Q.kutu.y + Q.kutu.h) + EPS;
    if (x1 > x2 || y1 > y2) return false;
    var kp = kutudakiKenarlar(P, x1, y1, x2, y2);
    var kq = kutudakiKenarlar(Q, x1, y1, x2, y2);
    var i, j;
    for (i = 0; i < kp.length; i++) {
      var a = p[kp[i]];
      var b = p[(kp[i] + 1) % p.length];
      for (j = 0; j < kq.length; j++) {
        if (parcalarKesisir(a, b, q[kq[j]], q[(kq[j] + 1) % q.length])) return true;
      }
    }
    // Kesişen kenar yok: biri ötekinin içinde ya da kenarları üst üste (aynı hizada) olabilir
    var ic = function (n) { return n[0] >= x1 && n[0] <= x2 && n[1] >= y1 && n[1] <= y2; };
    for (i = 0; i < P.ic.length; i++) if (ic(P.ic[i]) && noktaCokgende(P.ic[i][0], P.ic[i][1], q)) return true;
    for (j = 0; j < Q.ic.length; j++) if (ic(Q.ic[j]) && noktaCokgende(Q.ic[j][0], Q.ic[j][1], p)) return true;
    return false;
  }

  function cokgenDaire(P, c, r) {
    var p = P.p;
    if (r <= 0) return false;
    if (noktaCokgende(c.cx, c.cy, p)) return true;
    return kenarUzakligi(c.cx, c.cy, p) < r - EPS;
  }

  // Şeklin gerçek sınır kutusu (çokgende çizginin kutusu; diğerlerinde kutu()), önbellekli
  function sikiKutu(s) {
    var o = sekilOnbellegi(s);
    if (!o.kutu) o.kutu = s.t === 'poly' ? noktaKutusu(cokgenNoktalari(s)) : kutu(s);
    return o.kutu;
  }

  // Çakışma denetimi için şeklin çokgeni, t kadar içe çekilmiş (daire hariç); { p, kutu, ic }, önbellekli
  function carpismaCokgeni(s, t) {
    var o = sekilOnbellegi(s);
    var anahtar = 'c' + t;
    if (o[anahtar]) return o[anahtar];
    var p;
    var d = null;
    if (s.t === 'poly') {
      var yerel = s.y.icler[t] || (s.y.icler[t] = iceCek(s.y, t));
      p = dunyaNoktalari(s, yerel);
      var dy = cokgenDaireleri(yerel);
      d = { c: dunyaNoktalari(s, [dy.c])[0], ri: dy.ri, ro: dy.ro };
    } else if (s.t === 'ellipse') p = iceCek(sinirNoktalari(s, 36), t);
    else p = iceCek(koseler(s), t);
    o[anahtar] = { p: p, kutu: noktaKutusu(p), ic: icNoktalar(p), d: d };
    return o[anahtar];
  }

  // En az biri çokgen olan iki şeklin çakışması. bosluk < 0 tolerans demektir: iki şekil toplam |bosluk| kadar
  // üst üste binebilir (her biri |bosluk| / 2 içe çekilip kesin olarak denetlenir).
  function cokgenCakisir(a, b, bosluk) {
    var ka = sikiKutu(a);
    var kb = sikiKutu(b);
    if (ka.x + ka.w + bosluk <= kb.x + EPS || kb.x + kb.w + bosluk <= ka.x + EPS || ka.y + ka.h + bosluk <= kb.y + EPS || kb.y + kb.h + bosluk <= ka.y + EPS) return false;
    var t = -bosluk / 2;
    if (a.t === 'circle') return cokgenDaire(carpismaCokgeni(b, t), a, a.r - t);
    if (b.t === 'circle') return cokgenDaire(carpismaCokgeni(a, t), b, b.r - t);
    return cokgenlerKesisir(carpismaCokgeni(a, t), carpismaCokgeni(b, t));
  }

  /* ---------------- Çokgen alan (harita: shape 'poly') ---------------- */
  // Velcro alanı ya da yasaklı bölge serbest çokgen olabilir (içbükey de: ör. kemerli üst panel). Şekil t: 'cokgen',
  // p: noktalar (cm), x/y/w/h: sınır kutusu. Kenarlar yatay bantlara dağıtılır: nokta-içinde ve kenar kesişimi
  // denetimleri yalnızca ilgili bantlardaki kenarlara bakar (yer aramada binlerce aday).

  function cokgenAlan(p) {
    if (isaretliAlan(p) < 0) p = p.slice().reverse();
    var b = noktaKutusu(p);
    var n = Math.max(1, Math.min(64, Math.round(p.length / 2)));
    var s = { t: 'cokgen', p: p, x: b.x, y: b.y, w: b.w, h: b.h };
    var bant = { y0: b.y, bh: b.h / n || 1, n: n, k: [] };
    for (var i = 0; i < n; i++) bant.k.push([]);
    for (var j = 0; j < p.length; j++) {
      var a = p[j];
      var c = p[(j + 1) % p.length];
      var b1 = Math.max(0, Math.min(n - 1, Math.floor((Math.min(a[1], c[1]) - bant.y0) / bant.bh)));
      var b2 = Math.max(0, Math.min(n - 1, Math.floor((Math.max(a[1], c[1]) - bant.y0) / bant.bh)));
      for (var k = b1; k <= b2; k++) bant.k[k].push(j);
    }
    Object.defineProperty(s, '_z', { value: { bant: bant, e: kenarKutulari(p), damga: new Int32Array(p.length), sayac: 0 }, enumerable: false });
    s.alanBuyuklugu = Math.abs(isaretliAlan(p));
    // Merkez: kutunun ortası şeklin içinde ve kenara yeterince uzaksa o, değilse en derin iç nokta
    var o = [b.x + b.w / 2, b.y + b.h / 2];
    var d = cokgenDaireleri(p.slice());
    s.ic = cokgendeMi(o[0], o[1], s) && kenaraYakin(o[0], o[1], s, d.ri * 0.5) === false ? o : d.c;
    return s;
  }

  // [y1, y2] aralığındaki bantlara düşen kenarların sıraları (tekrarsız)
  function bantKenarlari(Z, y1, y2) {
    var z = Z._z;
    var bt = z.bant;
    var b1 = Math.max(0, Math.floor((y1 - bt.y0) / bt.bh));
    var b2 = Math.min(bt.n - 1, Math.floor((y2 - bt.y0) / bt.bh));
    if (b1 === b2) return bt.k[b1] || [];
    var damga = ++z.sayac;
    var liste = [];
    for (var b = b1; b <= b2; b++) {
      var k = bt.k[b];
      for (var i = 0; i < k.length; i++) {
        if (z.damga[k[i]] === damga) continue;
        z.damga[k[i]] = damga;
        liste.push(k[i]);
      }
    }
    return liste;
  }

  function cokgendeMi(x, y, Z) {
    if (x < Z.x || x > Z.x + Z.w || y < Z.y || y > Z.y + Z.h) return false;
    var p = Z.p;
    var k = bantKenarlari(Z, y, y);
    var ic = false;
    for (var n = 0; n < k.length; n++) {
      var i = k[n];
      var a = p[i];
      var b = p[(i + 1) % p.length];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) ic = !ic;
    }
    return ic;
  }

  // Noktaya r'den yakın kenar var mı
  function kenaraYakin(x, y, Z, r) {
    var p = Z.p;
    var e = Z._z.e;
    var k = bantKenarlari(Z, y - r, y + r);
    for (var n = 0; n < k.length; n++) {
      var i = k[n];
      var q = i * 4;
      if (e[q] > x + r || e[q + 2] < x - r) continue;
      if (parcayaUzaklik(x, y, p[i], p[(i + 1) % p.length]) < r - EPS) return true;
    }
    return false;
  }

  // Dışbükey zarf (monoton zincir)
  function disbukeyZarf(noktalar) {
    var p = noktalar.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    if (p.length < 3) return p;
    var alt = [];
    var ust = [];
    var i;
    for (i = 0; i < p.length; i++) {
      while (alt.length >= 2 && vektorel(alt[alt.length - 2], alt[alt.length - 1], p[i]) <= 0) alt.pop();
      alt.push(p[i]);
    }
    for (i = p.length - 1; i >= 0; i--) {
      while (ust.length >= 2 && vektorel(ust[ust.length - 2], ust[ust.length - 1], p[i]) <= 0) ust.pop();
      ust.push(p[i]);
    }
    alt.pop();
    ust.pop();
    return alt.concat(ust);
  }

  // Patch'in çokgen alana göre denetlenen şekli: dışbükey zarfı, t kadar içe çekilmiş (t = taşma toleransı). Önbellekli.
  function alanZarfi(s, t) {
    var o = sekilOnbellegi(s);
    var anahtar = 'h' + t;
    if (o[anahtar]) return o[anahtar];
    var p;
    if (s.t === 'circle') {
      var r = Math.max(s.r - t, s.r * 0.05);
      p = [];
      for (var i = 0; i < 24; i++) {
        var a = (i / 24) * Math.PI * 2;
        p.push([s.cx + Math.cos(a) * r, s.cy + Math.sin(a) * r]);
      }
    } else {
      p = iceCek(disbukeyZarf(s.t === 'poly' ? cokgenNoktalari(s) : sinirNoktalari(s, 36)), t);
    }
    o[anahtar] = { p: p, kutu: noktaKutusu(p) };
    return o[anahtar];
  }

  // Patch çokgen alanın içinde mi: zarfın tüm köşeleri alanda, alanın hiçbir kenarı zarfı kesmiyor, alanın hiçbir
  // köşesi zarfın içine girmiyor (içbükey alanın girintisi patch'in altında kalamaz). m < 0: taşma toleransı.
  function cokgenAlandaMi(s, Z, m) {
    var H = alanZarfi(s, -m);
    var hk = H.kutu;
    if (hk.x < Z.x - EPS || hk.y < Z.y - EPS || hk.x + hk.w > Z.x + Z.w + EPS || hk.y + hk.h > Z.y + Z.h + EPS) return false;
    var h = H.p;
    var i, n;
    for (i = 0; i < h.length; i++) if (!cokgendeMi(h[i][0], h[i][1], Z)) return false;
    var p = Z.p;
    var e = Z._z.e;
    var k = bantKenarlari(Z, hk.y, hk.y + hk.h);
    for (n = 0; n < k.length; n++) {
      var j = k[n];
      var q = j * 4;
      if (e[q] > hk.x + hk.w || e[q + 2] < hk.x || e[q + 1] > hk.y + hk.h || e[q + 3] < hk.y) continue;
      var a = p[j];
      var b = p[(j + 1) % p.length];
      for (i = 0; i < h.length; i++) if (parcalarKesisir(a, b, h[i], h[(i + 1) % h.length])) return false;
      if (a[0] >= hk.x && a[0] <= hk.x + hk.w && a[1] >= hk.y && a[1] <= hk.y + hk.h && noktaCokgende(a[0], a[1], h)) return false;
    }
    return true;
  }

  // Patch ile çokgen yasaklı bölge çakışıyor mu (yasaklı bölgede tolerans yok)
  function cokgenYasakCakisir(s, Z) {
    var sk = sikiKutu(s);
    if (sk.x > Z.x + Z.w || sk.x + sk.w < Z.x || sk.y > Z.y + Z.h || sk.y + sk.h < Z.y) return false;
    if (s.t === 'circle') return cokgendeMi(s.cx, s.cy, Z) || kenaraYakin(s.cx, s.cy, Z, s.r);
    var P = s.t === 'poly' ? cokgenNoktalari(s) : sinirNoktalari(s, 36);
    var i, n;
    for (i = 0; i < P.length; i++) if (cokgendeMi(P[i][0], P[i][1], Z)) return true;
    var p = Z.p;
    var e = Z._z.e;
    var k = bantKenarlari(Z, sk.y, sk.y + sk.h);
    for (n = 0; n < k.length; n++) {
      var j = k[n];
      var q = j * 4;
      if (e[q] > sk.x + sk.w || e[q + 2] < sk.x || e[q + 1] > sk.y + sk.h || e[q + 3] < sk.y) continue;
      var a = p[j];
      var b = p[(j + 1) % p.length];
      for (i = 0; i < P.length; i++) if (parcalarKesisir(a, b, P[i], P[(i + 1) % P.length])) return true;
      if (noktaCokgende(a[0], a[1], P)) return true;
    }
    return false;
  }

  function cokgenYolu(p) {
    return 'M' + p.map(function (q) { return q[0].toFixed(3) + ' ' + q[1].toFixed(3); }).join('L') + 'Z';
  }

  /* ------------------------------------------------------------------ */
  /* Veri modeli                                                         */
  /* ------------------------------------------------------------------ */

  function Model(ham) {
    var self = this;
    this.ham = ham;
    this.para = ham.para;
    this.urun = ham.urun;
    this.gorsel = ham.gorsel;
    // Ürünün metin karakter sınırı (kisisellestirme.metin_karakter_siniri); yoksa yalnızca geometri
    this.metinSiniri = ham.urun && parseInt(ham.urun.metin_siniri, 10) > 0 ? parseInt(ham.urun.metin_siniri, 10) : null;

    var ayar = ham.ayarlar || {};
    this.ayar = {
      harfEn: sayi(ayar.varsayilan_harf_genislik_cm) || 5.5,
      bosluk: ayar.patch_arasi_bosluk_cm != null ? Number(ayar.patch_arasi_bosluk_cm) : 0.3,
      satirBosluk: ayar.satir_arasi_bosluk_cm != null ? Number(ayar.satir_arasi_bosluk_cm) : 0.5,
      // Toleranslar (cm): patch alan kenarından bu kadar taşabilir, iki patch bu kadar üst üste binebilir
      // (kumaş ve cırtlı yüzey küçük taşmaları kaldırır). Yasaklı bölgelerde tolerans yok.
      tasmaTol: ayar.alan_tasma_toleransi_cm != null ? Math.max(0, Number(ayar.alan_tasma_toleransi_cm) || 0) : 0.2,
      cakismaTol: ayar.cakisma_toleransi_cm != null ? Math.max(0, Number(ayar.cakisma_toleransi_cm) || 0) : 0.2,
      satir: Math.max(1, parseInt(ayar.en_fazla_satir, 10) || 2),
      // Tutar eşikli kampanyalar (ör. Ekstra %10 İndirim, 5.000 TL) ve ücretsiz kargo eşiği: katalog ayarlarından, kuruş
      kampanyaEsikleri: (Array.isArray(ayar.kampanya_tutar_esikleri) ? ayar.kampanya_tutar_esikleri : [])
        .map(function (e) { return { baslik: String(e.baslik || ''), tutar: Math.round(Number(e.tutar) * 100) || 0 }; })
        .filter(function (e) { return e.baslik && e.tutar > 0; })
        .sort(function (a, b) { return a.tutar - b.tutar; }),
      kargoEsigi: sayi(ayar.ucretsiz_kargo_esigi) ? Math.round(Number(ayar.ucretsiz_kargo_esigi) * 100) : null
    };

    this.geometriKur(ham);

    // Ölçü önceliği: kırpılmış PNG'den hesaplanan ölçü (png_en/png_boy) > kayıtlı ölçü > varsayılan
    function patchHazirla(p, varsayilanEn) {
      var urunKonturu = konturHazirla(p.kontur);
      var varyantlar = (p.varyantlar || []).map(function (v) {
        return {
          en: sayi(v.png_en),
          boy: sayi(v.png_boy),
          id: v.id,
          baslik: v.baslik,
          karakter: v.karakter ? buyukHarf(String(v.karakter)) : null,
          renk: v.renk,
          renkKodu: v.renk_kodu || null,
          fiyat: Number(v.fiyat) || 0,
          satilabilir: !!v.satilabilir,
          stok: v.stok == null ? null : Math.max(0, Number(v.stok) || 0),
          gorsel: v.gorsel || p.gorsel,
          png: !!(v.png || (!v.gorsel && p.png)),
          // Varyantın kendi görseli varsa kendi konturu; ürünün görselini kullanıyorsa ürünün konturu
          kontur: konturHazirla(v.kontur) || (!v.gorsel ? urunKonturu : null)
        };
      });
      var en = sayi(p.png_en) || sayi(p.en);
      var boy = sayi(p.png_boy) || sayi(p.boy);
      // Varyant ölçüleri varsa (harf/rakam) temsili ölçü onların ortancası
      var vEn = varyantlar.map(function (v) { return v.en; }).filter(Boolean).sort(function (a, b) { return a - b; });
      var vBoy = varyantlar.map(function (v) { return v.boy; }).filter(Boolean).sort(function (a, b) { return a - b; });
      if (!en && vEn.length) en = vEn[Math.floor(vEn.length / 2)];
      if (!boy && vBoy.length) boy = vBoy[Math.floor(vBoy.length / 2)];
      en = en || varsayilanEn || null;
      if (!en || !boy) return null;
      return {
        id: p.id,
        baslik: p.baslik,
        ad: sadeAd(p.baslik),
        tip: p.tip,
        set: p.set,
        en: en,
        boy: boy,
        sekil: (p.png_sekil || p.sekil) === 'circle' ? 'circle' : 'rect',
        etiketler: p.etiketler || [],
        gorsel: p.gorsel,
        png: !!p.png,
        kontur: urunKonturu,
        varyantlar: varyantlar
      };
    }

    this.setler = (ham.setler || [])
      .map(function (p) {
        var s = patchHazirla(p, self.ayar.harfEn);
        if (!s) return null;
        renkliSetHazirla(s);
        return s;
      })
      .filter(Boolean);

    this.rakamSetleri = (ham.rakamlar || [])
      .map(function (p) {
        var s = patchHazirla(p);
        if (!s) return null;
        renkliSetHazirla(s);
        s.rakam = true;
        return s;
      })
      .filter(Boolean);

    var kategoriler = (ham.kategoriler || []).map(function (k) {
      return { etiket: k.etiket ? String(k.etiket).toLowerCase() : null, ad: k.ad, ikonlar: [] };
    });
    if (!kategoriler.some(function (k) { return k.etiket === null; })) {
      kategoriler.push({ etiket: null, ad: 'Diğer', ikonlar: [] });
    }
    this.ikonlar = [];
    (ham.ikonlar || []).forEach(function (p) {
      var ikon = patchHazirla(p);
      if (!ikon || !ikon.varyantlar.length) return;
      ikon.varyant = ikon.varyantlar[0];
      var etiketler = ikon.etiketler.map(function (e) { return String(e).toLowerCase(); });
      // Kategori listesindeki ilk eşleşen etiket kazanır (ör. Kalpler, Spor'dan önce gelir)
      var kat = null;
      for (var i = 0; i < kategoriler.length; i++) {
        if (kategoriler[i].etiket && etiketler.indexOf(kategoriler[i].etiket) !== -1) {
          kat = kategoriler[i];
          break;
        }
      }
      if (!kat) kat = kategoriler.filter(function (k) { return k.etiket === null; })[0];
      ikon.kategori = kat.ad;
      kat.ikonlar.push(ikon);
      self.ikonlar.push(ikon);
    });
    this.kategoriler = kategoriler.filter(function (k) { return k.ikonlar.length; });
    this.ikonHarita = {};
    this.ikonlar.forEach(function (i) { self.ikonHarita[i.id] = i; });

    // Hazır setler: satışta olan ve tüm patch'leri editörde bulunan setler
    this.hazirSetler = (ham.hazir_setler || [])
      .map(function (s) {
        var patchler = (s.patchler || []).map(function (id) { return self.ikonHarita[id]; });
        if (!patchler.length || patchler.some(function (p) { return !p; }) || !s.satilabilir || !s.varyant) return null;
        return {
          id: s.id,
          baslik: s.baslik,
          ad: setAdi(s.baslik),
          varyant: s.varyant,
          fiyat: Number(s.fiyat) || 0,
          patchler: patchler,
          parcaToplam: patchler.reduce(function (t, p) { return t + ((p.varyant && p.varyant.fiyat) || 0); }, 0)
        };
      })
      .filter(Boolean);
    this.hazirSetHarita = {};
    this.hazirSetler.forEach(function (s) { self.hazirSetHarita[s.id] = s; });

    // Yapıştırılabilir aksesuarlar (yalnızca stokta olanlar). Dış ölçü haritanın "dis" alanından;
    // kendi Velcro yüzeyi (zones) varsa aksesuar da patch'lerle tasarlanabilir.
    this.aksesuarlar = (ham.aksesuarlar || [])
      .map(function (a) {
        var h = a.harita;
        var dis = h && h.dis;
        if (!dis || !sayi(dis.en_cm) || !a.gorsel || !a.satilabilir || !a.varyant) return null;
        var adlar = aksesuarAdi(a.baslik);
        return {
          id: a.id,
          baslik: a.baslik,
          ad: adlar.tam,
          model: adlar.model,
          renk: adlar.renk,
          varyant: a.varyant,
          fiyat: Number(a.fiyat) || 0,
          stok: a.stok == null ? null : Math.max(0, Number(a.stok) || 0),
          gorsel: a.gorsel,
          harita: h,
          dis: {
            sekil: dis.shape === 'circle' ? 'circle' : 'rect',
            en: Number(dis.en_cm),
            boy: Number(dis.boy_cm) || Number(dis.en_cm),
            kose: Number(dis.kose_cm) || 0,
            // Dış kutunun görseldeki yeri (%): görsel bu kutuya göre yerleşir
            x: Number(dis.x) || 0, y: Number(dis.y) || 0, w: Number(dis.w) || 100, h: Number(dis.h) || 100
          },
          tasarlanabilir: !!(h.zones && h.zones.length),
          kontur: (function () {
            var k = konturHazirla(a.kontur);
            // Aksesuar konturu dış ölçü kutusuna göredir; görsel bu kutuya gerildiği için oran kutunun oranı
            if (k) k.o = Number(dis.en_cm) / (Number(dis.boy_cm) || Number(dis.en_cm));
            return k;
          })()
        };
      })
      .filter(function (a) { return a && (a.stok == null || a.stok > 0); });
    if (this.tekPatch) {
      this.hazirSetler = [];
      this.hazirSetHarita = {};
      this.aksesuarlar = [];
    }
    this.aksesuarHarita = {};
    this.aksesuarlar.forEach(function (a) { self.aksesuarHarita[a.id] = a; });
    this.aksModelleri = {};

    if (!this.setler.length) throw new Error('Harf seti verisi eksik');
  }

  // "Yapıştırılabilir Kalem Kutusu Kırmızı- LE KOKO COLLECTIF-" → Kalem Kutusu Kırmızı (model + renk)
  function aksesuarAdi(baslik) {
    var tam = String(baslik || '').replace(/\s+/g, ' ').replace(/^Yapıştırılabilir\s+/i, '').replace(/\s*-?\s*LE KOKO COLLECTIF\s*-?\s*$/i, '').replace(/[\s-]+$/, '').trim();
    var k = tam.split(' ');
    return { tam: tam, model: k.length > 1 ? k.slice(0, -1).join(' ') : tam, renk: k.length > 1 ? k[k.length - 1] : '' };
  }

  // "School Vibes  Patch Seti" → "School Vibes"
  function setAdi(baslik) {
    return String(baslik || '').replace(/\s+/g, ' ').replace(/\s*(Patch\s+)?Seti\s*$/i, '').trim();
  }

  function stoktaMi(v) {
    return !!v && v.satilabilir && (v.stok == null || v.stok > 0);
  }

  // Harf setinin karakter haritaları. Bir harfin birden fazla renk varyantı varsa set "çok renkli"dir
  // (ör. Piramit: "Mavi A", "Pembe A"). Karakter/renk metafield'ı yoksa varyant adından okunur.
  function renkliSetHazirla(s) {
    s.varyantlar.forEach(function (v) {
      if (!v.karakter) {
        var ad = /^(.*\S)\s+(\S)$/.exec(String(v.baslik || '').trim());
        if (ad && HARF_DESENI.test(buyukHarf(ad[2]))) {
          v.karakter = buyukHarf(ad[2]);
          if (!v.renk) v.renk = ad[1];
        } else if (/^\S$/.test(String(v.baslik || '').trim())) {
          v.karakter = buyukHarf(String(v.baslik).trim());
        }
      }
      if (!v.renkKodu && v.renk) v.renkKodu = RENK_KODLARI[String(v.renk).toLocaleLowerCase('tr-TR')] || null;
    });
    var hepsi = {};
    s.varyantlar.forEach(function (v) {
      if (!v.karakter) return;
      (hepsi[v.karakter] = hepsi[v.karakter] || []).push(v);
    });
    s.cokRenkli = Object.keys(hepsi).some(function (h) { return hepsi[h].length > 1; });
    // karakterVaryantlari: yalnızca stokta olan renkler (stokta olmayan renk hiç gösterilmez)
    s.karakterVaryantlari = {};
    s.karakterler = {};
    Object.keys(hepsi).forEach(function (h) {
      var stokta = hepsi[h].filter(stoktaMi);
      s.karakterVaryantlari[h] = stokta;
      // Tek renkli setlerde tükenmiş varyant da kalır (stok uyarısı için); çok renklide ilk stoktaki renk
      s.karakterler[h] = s.cokRenkli ? stokta[0] || null : hepsi[h][0];
      if (!s.karakterler[h]) delete s.karakterler[h];
    });
  }

  // Ürünün görseline ve haritasına bağlı her şey: ölçek, alanlar, yasaklı bölgeler. Kombin modunda sweatshirt rengi
  // değişince aynı modelde yeniden kurulur (urunDegistir); katalog (patch'ler) aynı kalır.
  Model.prototype.geometriKur = function (ham) {
    var self = this;
    var harita = ham.harita;
    if (!harita || !harita.zones || !harita.zones.length) {
      throw new Error('Kişiselleştirme haritası eksik');
    }
    // Tek patch'lik ürün (harita.tek_patch, ör. 5 cm Velcro'lu mini çanta): bir harf, bir rakam ya da bir ikon; boyut
    // sınırı yok, patch Velcro'nun ortasına takılır. Hazır set ve aksesuar yok.
    this.tekPatch = harita.tek_patch === true;
    if (this.tekPatch) this.metinSiniri = 1;
    var W = Number(ham.gorsel.en);
    var H = Number(ham.gorsel.boy);

    // Harita belirli bir görsele göre çizilir. Görsel değiştiyse (ör. yeni PNG yüklendi,
    // harita henüz güncellenmedi) önizleme "kalibre edilmedi" olarak işaretlenir.
    var haritaGorsel = harita.gorsel || {};
    var gorselUyumlu = !sayi(haritaGorsel.en) || !sayi(haritaGorsel.boy) ||
      Math.abs(haritaGorsel.en / haritaGorsel.boy - W / H) < 0.01;
    this.kalibre = harita.kalibre !== false && gorselUyumlu;

    // Ölçek (piksel/cm) önceliği:
    // 1) Gerçek ölçüsü bilinen bir alan (cap_cm ya da genislik_cm): görsel kırpılsa da doğru kalır.
    // 2) Ürünün görseldeki kutusu + gerçek genişlik.
    // 3) Görselin tamamı = gerçek genişlik.
    var pxCm = null;
    harita.zones.some(function (z) {
      var gercek = sayi(z.cap_cm) || sayi(z.genislik_cm);
      var wpx = ((Number(z.w) || 0) / 100) * W;
      var hpx = ((Number(z.h) || 0) / 100) * H;
      var olcu = z.shape === 'circle' ? Math.min(wpx, hpx) : wpx;
      if (gercek && olcu > 0) pxCm = olcu / gercek;
      return !!pxCm;
    });
    if (!pxCm && sayi(harita.real_width_cm)) {
      var kutuGenislik = harita.urun_kutusu && sayi(harita.urun_kutusu.w) ? (harita.urun_kutusu.w / 100) * W : W;
      pxCm = kutuGenislik / Number(harita.real_width_cm);
    }
    if (!pxCm) throw new Error('Haritada ölçek bilgisi yok (cap_cm ya da real_width_cm)');
    this.Wcm = W / pxCm;
    this.Hcm = H / pxCm;

    function sekle(z) {
      var x = ((Number(z.x) || 0) / 100) * W;
      var y = ((Number(z.y) || 0) / 100) * H;
      var w = ((Number(z.w) || 0) / 100) * W;
      var h = ((Number(z.h) || 0) / 100) * H;
      if (z.shape === 'poly' && Array.isArray(z.points)) {
        // Serbest çokgen: noktalar görselin genişliği / yüksekliğine göre %
        var p = z.points
          .map(function (q) { return [((Number(q && q[0]) || 0) / 100) * W / pxCm, ((Number(q && q[1]) || 0) / 100) * H / pxCm]; })
          .filter(function (q) { return isFinite(q[0]) && isFinite(q[1]); });
        if (p.length >= 3) {
          self.cokgenAlan = true;
          return cokgenAlan(p);
        }
      }
      if (z.shape === 'circle') {
        var r = Math.min(w, h) / 2;
        return { t: 'circle', cx: (x + w / 2) / pxCm, cy: (y + h / 2) / pxCm, r: r / pxCm };
      }
      if (z.shape === 'ellipse') {
        return { t: 'ellipse', cx: (x + w / 2) / pxCm, cy: (y + h / 2) / pxCm, rx: w / 2 / pxCm, ry: h / 2 / pxCm };
      }
      var alan = { t: 'rect', x: x / pxCm, y: y / pxCm, w: w / pxCm, h: h / pxCm };
      // Köşeleri yuvarlatılmış dikdörtgen alan: r = köşe yarıçapı (cm), kısa kenarın yarısını geçemez
      var kose = sayi(z.kose_cm);
      if (kose) alan.r = Math.min(kose, alan.w / 2, alan.h / 2);
      return alan;
    }

    this.alanlar = harita.zones.map(function (z, i) {
      var alan = {
        id: z.id || 'alan-' + i,
        ad: z.ad || '',
        sekil: sekle(z),
        tipler: z.allowed_types && z.allowed_types.length ? z.allowed_types : ['letter', 'number', 'icon']
      };
      // Tek patch'te sığma denetimi Velcro'yla aynı merkezli büyük dairede yapılır (en büyük patch döndürülse de sığar,
      // patch ortaya yerleşir); önizlemede alan çizgisi Velcro'nun kendisi (cizim)
      if (self.tekPatch) {
        var c = merkez(alan.sekil);
        var k = kutu(alan.sekil);
        alan.cizim = alan.sekil;
        alan.sekil = { t: 'circle', cx: c[0], cy: c[1], r: Math.max(TEK_PATCH_YARICAP, k.w / 2, k.h / 2) };
      }
      return alan;
    });
    this.yasaklar = (harita.forbidden || []).map(function (z) {
      return sekle(z);
    });
  };

  // Noktanın bulunduğu alan; hiçbirinde değilse en yakını (kutusuna uzaklıkla). tip verilirse yalnızca o tipe açık alanlar.
  Model.prototype.noktaAlani = function (x, y, tip) {
    var en = null;
    var enU = Infinity;
    for (var i = 0; i < this.alanlar.length; i++) {
      var a = this.alanlar[i];
      if (tip && a.tipler.indexOf(tip) === -1) continue;
      if (noktaIcinde(x, y, a.sekil)) return a;
      var k = kutu(a.sekil);
      var dx = Math.max(k.x - x, 0, x - (k.x + k.w));
      var dy = Math.max(k.y - y, 0, y - (k.y + k.h));
      var u = dx * dx + dy * dy;
      if (u < enU) {
        enU = u;
        en = a;
      }
    }
    return en;
  };

  Model.prototype.alanBul = function (tip) {
    for (var i = 0; i < this.alanlar.length; i++) {
      if (this.alanlar[i].tipler.indexOf(tip) !== -1) return this.alanlar[i];
    }
    return null;
  };

  Model.prototype.set = function (id) {
    for (var i = 0; i < this.setler.length; i++) if (String(this.setler[i].id) === String(id)) return this.setler[i];
    return this.setler[0];
  };

  Model.prototype.rakamSeti = function () {
    return this.rakamSetleri[0] || null;
  };

  // Aksesuarın kendi tasarımı için model: aksesuar görseli ve Velcro yüzeyi, katalog aynı
  Model.prototype.aksesuarModeli = function (id) {
    var a = this.aksesuarHarita[id];
    if (!a || !a.tasarlanabilir) return null;
    if (!this.aksModelleri[id]) {
      var ham = {};
      for (var k in this.ham) ham[k] = this.ham[k];
      ham.urun = { id: a.id, baslik: a.ad, varyant: a.varyant, fiyat: a.fiyat, satilabilir: true };
      ham.gorsel = a.gorsel;
      ham.harita = a.harita;
      ham.aksesuarlar = [];
      var m = new Model(ham);
      m.aksesuar = a;
      this.aksModelleri[id] = { m: m, yer: new Yerlesim(m) };
    }
    return this.aksModelleri[id];
  };

  // Stil adı karta yazılır: "Cool", "Piramit", "Rakam"
  function stilAdi(set) {
    if (!set) return '';
    if (set.rakam) return 'Rakam';
    return String(set.ad || '').replace(/\s*(Alfabe|Harf)\b.*$/i, '').trim() || set.ad;
  }

  // Yazıdaki i. karakterin seti: rakamlar rakam setinden; harfler kendi seçili setinden, yoksa son seçilen harf setinden
  function karakterSeti(m, t, i, h) {
    if (RAKAM_DESENI.test(h)) return m.rakamSeti();
    var id = t.karakterSetleri && t.karakterSetleri[i];
    var set = id != null ? m.setler.filter(function (x) { return String(x.id) === String(id); })[0] : null;
    return set || m.set(t.setId);
  }

  /* ------------------------------------------------------------------ */
  /* Yerleşim ve doğrulama                                               */
  /* ------------------------------------------------------------------ */

  function Yerlesim(model) {
    this.m = model;
  }

  // İsim harflerini verilen merkeze, verilen satır sayısıyla dizer
  // Harfin gerçek ölçüsü: varyantın PNG ölçüsü, yoksa setin temsili ölçüsü
  function varyantOlcu(set, v) {
    return { en: (v && v.en) || set.en, boy: (v && v.boy) || set.boy };
  }

  // Karakterin bu sette satılabilir ve stokta bir patch'i var mı (çok renkli sette herhangi bir renk)
  function karakterStoktaMi(set, h) {
    if (!set) return false;
    var stokta = function (v) { return !!v && v.satilabilir !== false && (v.stok == null || v.stok > 0); };
    if (set.cokRenkli) return (set.karakterVaryantlari[h] || []).some(stokta);
    return stokta(set.karakterler[h]);
  }

  // Türkçe karakterleri otomatik çevirir: Ç Ğ İ Ö Ş Ü'nün o karakterin setinde stokta patch'i yoksa C G I O S U kullanılır.
  // Veri odaklı: sete Türkçe karakter patch'i eklenip stokta olursa çeviri yapılmaz (önceden çevrilmiş olan da geri döner).
  // Karışık modda her karakter kendi setine göre. Müşterinin yazdığı karakter t.ceviriler[i]'de saklanır.
  // Dönüş: yazı değiştiyse true
  function turkceCevir(model, t) {
    var harfler = Array.from(t.isim || '');
    var ceviri = Array.isArray(t.ceviriler) ? t.ceviriler.slice(0, harfler.length) : [];
    var degisti = false;
    harfler.forEach(function (h, i) {
      var asil = ceviri[i] || (TR_ESLEME[h] ? h : null);
      if (!asil || !TR_ESLEME[asil]) {
        ceviri[i] = null;
        return;
      }
      var set = karakterSeti(model, t, i, asil);
      var hedef = karakterStoktaMi(set, asil) ? asil : TR_ESLEME[asil];
      if (h !== hedef) {
        harfler[i] = hedef;
        degisti = true;
      }
      ceviri[i] = hedef === asil ? null : asil;
    });
    while (ceviri.length < harfler.length) ceviri.push(null);
    t.ceviriler = ceviri.some(Boolean) ? ceviri : null;
    if (degisti) t.isim = harfler.join('');
    return degisti;
  }

  // Müşterinin yazdığı hali (çeviriden önce): "GÖKHAN"
  function yazilanIsim(t) {
    var c = t.ceviriler || [];
    return Array.from(t.isim || '').map(function (h, i) { return c[i] || h; }).join('');
  }

  // "Ö ve Ş patch'leri olmadığı için O ve S kullanıldı." (her karakter bir kez)
  function ceviriNotu(t) {
    var c = t.ceviriler || [];
    var asillar = [];
    c.forEach(function (x) { if (x && asillar.indexOf(x) === -1) asillar.push(x); });
    if (!asillar.length) return '';
    var liste = function (a) { return a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' ve ' + a[a.length - 1]; };
    return liste(asillar) + (asillar.length === 1 ? ' patch\'i' : ' patch\'leri') + ' olmadığı için ' +
      liste(asillar.map(function (x) { return TR_ESLEME[x]; })) + ' kullanıldı.';
  }

  // İsimdeki i. harfin varyantı. Çok renkli sette seçilen renk (t.harfRenkleri), yoksa ilk stoktaki renk.
  function harfVaryanti(set, t, i, h) {
    if (!set.cokRenkli) return set.karakterler[h] || null;
    var liste = set.karakterVaryantlari[h] || [];
    var id = t.harfRenkleri && t.harfRenkleri[i];
    for (var k = 0; k < liste.length; k++) if (String(liste[k].id) === String(id)) return liste[k];
    return liste[0] || null;
  }

  function isimOlculeri(m, t) {
    return Array.from(t.isim || '').map(function (h, i) {
      var set = karakterSeti(m, t, i, h);
      if (!set) return { en: m.ayar.harfEn, boy: 6 };
      var v = harfVaryanti(set, t, i, h);
      var o = varyantOlcu(set, v);
      return { en: o.en, boy: o.boy, k: (v && v.kontur) || null };
    });
  }

  // Çok renkli sette her harfe renk atar. Geçerli seçimler korunur; boş ya da geçersiz olanlara
  // stokta kalan renkler arasından, yan yana gelen harflerden göze farklı görünen bir renk verilir
  // (karşılaştırma renk koduyla: benzerRenk).
  // rastgele: "Renkleri karıştır" (tüm seçimler yeniden dağıtılır)
  // oncelik: kullanıcının az önce renk seçtiği harf; stok yetmezse diğer harf yeni renk alır
  function renkleriAta(model, t, rastgele, oncelik) {
    var harfler = Array.from(t.isim || '');
    var setler = harfler.map(function (h, i) { return karakterSeti(model, t, i, h); });
    if (!setler.some(function (s) { return s && s.cokRenkli; })) {
      t.harfRenkleri = null;
      return;
    }
    var eski = rastgele ? [] : t.harfRenkleri || [];
    var kalan = {};
    function stokKaldi(v) {
      var k = kalan[v.id];
      return k == null ? (v.stok == null ? Infinity : v.stok) > 0 : k > 0;
    }
    function dus(v) {
      if (kalan[v.id] == null) kalan[v.id] = v.stok == null ? Infinity : v.stok;
      kalan[v.id]--;
    }
    var sonuc = harfler.map(function () { return null; });
    var renkler = harfler.map(function () { return null; });
    // 1) Geçerli eski seçimler (aynı harf, stokta); önce kullanıcının son seçtiği harf
    var sira = harfler.map(function (h, i) { return i; });
    if (oncelik != null && oncelik < harfler.length) sira = [oncelik].concat(sira.filter(function (i) { return i !== oncelik; }));
    sira.forEach(function (i) {
      var h = harfler[i];
      var set = setler[i];
      if (!set || !set.cokRenkli) return;
      var liste = set.karakterVaryantlari[h] || [];
      var v = liste.filter(function (x) { return String(x.id) === String(eski[i]); })[0];
      if (v && stokKaldi(v)) {
        sonuc[i] = v.id;
        renkler[i] = v;
        dus(v);
      }
    });
    // 2) Boşları doldur
    function kullanim(v) {
      return renkler.filter(function (r) { return benzerRenk(r, v); }).length;
    }
    harfler.forEach(function (h, i) {
      var set = setler[i];
      if (sonuc[i] || !set || !set.cokRenkli) return;
      var adaylar = (set.karakterVaryantlari[h] || []).filter(stokKaldi);
      if (!adaylar.length) return;
      var puanli = adaylar.map(function (v, j) {
        var ceza = 0;
        if (i > 0 && benzerRenk(renkler[i - 1], v)) ceza += 10;
        if (i + 1 < harfler.length && benzerRenk(renkler[i + 1], v)) ceza += 6;
        ceza += kullanim(v) * 2;
        // Eşitlikte: karıştırmada rastgele, değilse harfin sırasına göre dönen bir tercih
        var sira = rastgele ? Math.random() : ((j - i) % adaylar.length + adaylar.length) % adaylar.length / adaylar.length;
        return { v: v, puan: ceza + sira };
      });
      puanli.sort(function (a, b) { return a.puan - b.puan; });
      var secilen = puanli[0].v;
      sonuc[i] = secilen.id;
      renkler[i] = secilen;
      dus(secilen);
    });
    t.harfRenkleri = sonuc;
  }

  // İsim harflerini verilen merkeze, verilen satır sayısıyla dizer. olculer: [{en, boy}] (harf sırasıyla)
  Yerlesim.prototype.isimDiz = function (olculer, cx, cy, satir) {
    var a = this.m.ayar;
    var adet = olculer.length;
    var satirlar = satir === 1 ? [adet] : [Math.ceil(adet / 2), Math.floor(adet / 2)];
    satirlar = satirlar.filter(function (k) { return k > 0; });
    var parcalar = [];
    var bas = 0;
    satirlar.forEach(function (k) {
      parcalar.push(olculer.slice(bas, bas + k));
      bas += k;
    });
    var satirBoylari = parcalar.map(function (p) { return Math.max.apply(null, p.map(function (o) { return o.boy; })); });
    var toplamBoy = satirBoylari.reduce(function (t, b) { return t + b; }, 0) + (parcalar.length - 1) * a.satirBosluk;
    var y = cy - toplamBoy / 2;
    var sonuc = [];
    parcalar.forEach(function (p, i) {
      var satirEn = p.reduce(function (t, o) { return t + o.en; }, 0) + (p.length - 1) * a.bosluk;
      var x = cx - satirEn / 2;
      var orta = y + satirBoylari[i] / 2;
      p.forEach(function (o) {
        sonuc.push({ cx: x + o.en / 2, cy: orta, en: o.en, boy: o.boy, k: o.k || null });
        x += o.en + a.bosluk;
      });
      y += satirBoylari[i] + a.satirBosluk;
    });
    return sonuc;
  };

  // Aksesuar, ikonların takılabildiği alanlara yerleşir
  function alanTipi(tip) {
    return tip === 'aksesuar' ? 'icon' : tip;
  }

  Yerlesim.prototype.alanaUygun = function (sekil, tip) {
    return !this.konumSorunu(sekil, tip);
  };

  // Parçanın tek başına konum sorunu: 'tasma' (Velcro alanın dışına taşıyor), 'yasak' (yasaklı bölgeye değiyor) ya da null
  Yerlesim.prototype.konumSorunu = function (sekil, tip) {
    var m = this.m;
    tip = alanTipi(tip);
    var uygunAlan = false;
    for (var i = 0; i < m.alanlar.length; i++) {
      var alan = m.alanlar[i];
      if (alan.tipler.indexOf(tip) !== -1 && icinde(sekil, alan.sekil, -m.ayar.tasmaTol)) {
        uygunAlan = true;
        break;
      }
    }
    if (!uygunAlan) return 'tasma';
    for (var j = 0; j < m.yasaklar.length; j++) if (cakisir(sekil, m.yasaklar[j], 0)) return 'yasak';
    return null;
  };

  // Blok isim harfleri: dizilim blok merkezi etrafında açı kadar döndürülür
  function isimHarfleri(dizi, merkezNokta, aci) {
    return dizi.map(function (p) {
      var k = dondurNokta([p.cx, p.cy], merkezNokta, aci);
      return { cx: k[0], cy: k[1], en: p.en, boy: p.boy, k: p.k || null, aci: aci, sekil: sekilOlustur(p.k, k[0], k[1], p.en, p.boy, aci) };
    });
  }

  // İsim, alana tek başına (diğer patch'ler olmadan) kaç satırda sığıyor? 0 = sığmıyor
  // olculer: harflerin gerçek ölçüleri [{en, boy}], aci: blok ismin açısı
  Yerlesim.prototype.isimSatiriOlcu = function (olculer, aci, alan) {
    return this.isimYeri(olculer, aci, alan).satir;
  };

  // Parça verilen alanın içinde mi (yasaklı bölgeye değmeden)? Çok alanlı üründe yazı bloğu tek bir alana yerleşir.
  Yerlesim.prototype.alandaUygun = function (sekil, alan) {
    var m = this.m;
    if (!icinde(sekil, alan.sekil, -m.ayar.tasmaTol)) return false;
    for (var j = 0; j < m.yasaklar.length; j++) if (cakisir(sekil, m.yasaklar[j], 0)) return false;
    return true;
  };

  // İsmin varsayılan yeri: önce alanın ortası. Ortada sığmıyorsa ve alanda yasaklı bölge varsa
  // (ör. kalem kutusunun logosu) ortaya en yakın, ismin tamamının sığdığı merkez aranır (0,5 cm adım).
  // Tek satır iki satıra tercih edilir. Sonuç: { satir (0 = sığmıyor), merkez }
  Yerlesim.prototype.isimYeri = function (olculer, aci, alan) {
    var adet = olculer.length;
    alan = alan || this.m.alanBul('letter');
    var c0 = alan ? merkez(alan.sekil) : [this.m.Wcm / 2, this.m.Hcm / 2];
    if (!alan || adet === 0) return { satir: adet === 0 ? 1 : 0, merkez: c0 };
    aci = aciNormal(aci);
    var anahtar = JSON.stringify([olculer.map(function (o) { return [o.en, o.boy, o.k ? o.k.n : 0]; }), aci, alan.id]);
    this._isimYeri = this._isimYeri || {};
    if (this._isimYeri[anahtar]) return this._isimYeri[anahtar];
    var self = this;
    var sigar = function (c, satir) {
      return isimHarfleri(self.isimDiz(olculer, c[0], c[1], satir), c, aci).every(function (p) {
        return self.alandaUygun(p.sekil, alan);
      });
    };
    var satirlar = [];
    for (var satir = 1; satir <= Math.min(this.m.ayar.satir, 2); satir++) if (satir === 1 || adet >= 2) satirlar.push(satir);
    var sonuc = null;
    satirlar.some(function (n) { if (sigar(c0, n)) sonuc = { satir: n, merkez: c0 }; return !!sonuc; });
    if (!sonuc && (this.m.yasaklar.length || alan.sekil.t === 'cokgen')) {
      var k = kutu(alan.sekil);
      // Aday merkezler (alanın içi, 0,5 cm adım) ortaya uzaklık sırasıyla; alan değişmediği sürece bir kez hesaplanır
      this._isimAdaylari = this._isimAdaylari || {};
      var adaylar = this._isimAdaylari[alan.id] || null;
      if (!adaylar) {
        adaylar = [];
        for (var x = k.x; x <= k.x + k.w + EPS; x += 0.5) {
          for (var y = k.y; y <= k.y + k.h + EPS; y += 0.5) if (noktaIcinde(x, y, alan.sekil)) adaylar.push([x, y, (x - c0[0]) * (x - c0[0]) + (y - c0[1]) * (y - c0[1])]);
        }
        adaylar.sort(function (a, b) { return a[2] - b[2]; });
        this._isimAdaylari[alan.id] = adaylar;
      }
      var tol = this.m.ayar.tasmaTol;
      satirlar.some(function (n) {
        // Ön eleme: isim bloğunun kutusu (gerçek şekillerinden) alanın kutusuna sığmayan merkezler denenmez
        var b = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
        isimHarfleri(self.isimDiz(olculer, c0[0], c0[1], n), c0, aci).forEach(function (p) {
          var q = sikiKutu(p.sekil);
          b.x1 = Math.min(b.x1, q.x - c0[0]);
          b.y1 = Math.min(b.y1, q.y - c0[1]);
          b.x2 = Math.max(b.x2, q.x + q.w - c0[0]);
          b.y2 = Math.max(b.y2, q.y + q.h - c0[1]);
        });
        if (b.x2 - b.x1 > k.w + 2 * tol + EPS || b.y2 - b.y1 > k.h + 2 * tol + EPS) return false;
        for (var i = 0; i < adaylar.length; i++) {
          var c = adaylar[i];
          if (c[0] + b.x1 < k.x - tol - EPS || c[0] + b.x2 > k.x + k.w + tol + EPS || c[1] + b.y1 < k.y - tol - EPS || c[1] + b.y2 > k.y + k.h + tol + EPS) continue;
          if (sigar(c, n)) { sonuc = { satir: n, merkez: [c[0], c[1]] }; return true; }
        }
        return false;
      });
    }
    sonuc = sonuc || { satir: 0, merkez: c0 };
    this._isimYeri[anahtar] = sonuc;
    return sonuc;
  };

  // Temsili (ortanca) harf ölçüsüyle: kapasite göstergesi için
  Yerlesim.prototype.isimSatiri = function (adet, set, aci, alan) {
    var olculer = [];
    for (var i = 0; i < adet; i++) olculer.push({ en: set.en, boy: set.boy });
    return this.isimSatiriOlcu(olculer, aci, alan);
  };

  Yerlesim.prototype.kapasite = function (set, aci, alan) {
    var enFazla = 0;
    for (var n = 1; n <= 40; n++) {
      if (this.isimSatiri(n, set, aci, alan)) enFazla = n;
      else if (n > enFazla + 2) break;
    }
    return enFazla;
  };

  // Tasarımdaki tüm yerleşik parçaların şekillerini üretir
  Yerlesim.prototype.parcalar = function (t) {
    var m = this.m;
    var liste = [];
    if (t.isim) {
      var harfler = Array.from(t.isim);
      var tumOlculer = isimOlculeri(m, t);
      var self = this;
      // Yazı bir ya da (çok alanlı üründe bölünmüşse) iki blok: her blok kendi alanında, kendi merkezi ve açısıyla
      yaziBloklari(t).forEach(function (bl) {
        var ad = BLOK_ALAN[bl.b];
        var olculer = tumOlculer.slice(bl.bas, bl.son);
        var ayri = !!t[ad.ayri];
        var blokAci = ayri ? 0 : aciNormal(t[ad.aci]);
        var yer = self.isimYeri(olculer, blokAci, blokAlani(m, t, bl.b));
        var c = t[ad.merkez] || yer.merkez;
        var satir = yer.satir || Math.min(m.ayar.satir, olculer.length > 1 ? 2 : 1);
        var dizi = isimHarfleri(self.isimDiz(olculer, c[0], c[1], satir), c, blokAci);
        for (var i = bl.bas; i < bl.son; i++) {
          var h = harfler[i];
          var o = dizi[i - bl.bas];
          var set = karakterSeti(m, t, i, h);
          var v = set ? harfVaryanti(set, t, i, h) : null;
          // Ayrı modda her harf kendi konumunda, kendi açısında ve kendi grubunda sürüklenir
          var k = ayri && t.harfKonumlari && t.harfKonumlari[i] ? t.harfKonumlari[i] : [o.cx, o.cy];
          var aci = ayri ? aciNormal(t.harfAcilari && t.harfAcilari[i]) : blokAci;
          liste.push({
            uid: (ayri ? 'harf-' : 'isim-') + i,
            grup: ayri ? 'harf-' + i : ad.grup,
            kenar: ayri ? !!(t.harfKenar && t.harfKenar[i]) : !!t[ad.kenar],
            sira: i,
            tip: RAKAM_DESENI.test(h) ? 'number' : 'letter',
            tanim: set,
            varyant: v,
            etiket: h,
            en: o.en,
            boy: o.boy,
            aci: aci,
            sekil: sekilOlustur(v && v.kontur, k[0], k[1], o.en, o.boy, aci)
          });
        }
      });
    }
    // Aksesuarlar büyük parçalar: patch'lerden önce yerleşir (çakışmada patch'ler kayar)
    (t.aksesuarlar || []).forEach(function (a) {
      var aks = m.aksesuarHarita[a.urunId];
      if (!aks) return;
      var aci = aciNormal(a.aci);
      liste.push({
        uid: a.uid,
        grup: a.uid,
        kenar: !!a.kenar,
        tip: 'aksesuar',
        tanim: aks,
        varyant: { id: aks.varyant, fiyat: aks.fiyat, satilabilir: true, stok: aks.stok, gorsel: aks.gorsel.kucuk, png: true, karakter: null },
        etiket: aks.ad,
        en: aks.dis.en,
        boy: aks.dis.boy,
        aci: aci,
        sekil: aksesuarSekli(aks, a.cx, a.cy, aci),
        icTasarim: a.tasarim || null
      });
    });
    t.parcalar.forEach(function (p) {
      var tanim = p.tip === 'number' ? m.rakamSeti() : m.ikonHarita[p.urunId];
      if (!tanim) return;
      var varyant = null;
      tanim.varyantlar.forEach(function (v) {
        if (String(v.id) === String(p.varyantId)) varyant = v;
      });
      var olcu = parcaOlcu(tanim, varyant);
      var aci = aciNormal(p.aci);
      liste.push({
        uid: p.uid,
        grup: p.uid,
        kenar: !!p.kenar,
        tip: p.tip,
        tanim: tanim,
        varyant: varyant,
        etiket: p.tip === 'number' ? (varyant && varyant.karakter) || '' : tanim.ad,
        en: olcu.en,
        boy: olcu.boy,
        aci: aci,
        sekil: parcaSekli(tanim, varyant, p.cx, p.cy, aci),
        setGrup: p.setGrup || null
      });
    });
    return liste;
  };

  // Aksesuarın çantadaki şekli: dış ölçüsüyle daire ya da köşeleri yuvarlatılmış dikdörtgen
  function aksesuarSekli(aks, cx, cy, aci) {
    if (aks.kontur) return konturluSekil(aks.kontur, cx, cy, aks.dis.en, aks.dis.boy, aci);
    if (aks.dis.sekil === 'circle') return { t: 'circle', cx: cx, cy: cy, r: aks.dis.en / 2 };
    return yuvarlakKoseli(cx, cy, aks.dis.en, aks.dis.boy, aci, aks.dis.kose);
  }

  // Rakam/ikon ölçüsü: varyantın PNG ölçüsü varsa o, yoksa ürünün ölçüsü
  function parcaOlcu(tanim, varyant) {
    return { en: (varyant && varyant.en) || tanim.en, boy: (varyant && varyant.boy) || tanim.boy };
  }

  // Rakam/ikon şekli. Daire döndürülse de dairedir (yalnızca görsel döner).
  function parcaSekli(tanim, varyant, cx, cy, aci) {
    var o = parcaOlcu(tanim, varyant);
    if (tanim.sekil === 'circle') return { t: 'circle', cx: cx, cy: cy, r: Math.max(o.en, o.boy) / 2 };
    return sekilOlustur((varyant && varyant.kontur) || tanim.kontur, cx, cy, o.en, o.boy, aci);
  }

  function kopyaParca(p, ek) {
    var k = {};
    var a;
    for (a in p) k[a] = p[a];
    for (a in ek) k[a] = ek[a];
    return k;
  }

  // Bir grubu pivot etrafında yeni açıya döndürür (parçaların merkezleri de döner)
  function grupDondur(parcalar, pivot, eskiAci, yeniAci) {
    var d = aciNormal(yeniAci - eskiAci);
    return parcalar.map(function (p) {
      var c = dondurNokta(merkez(p.sekil), pivot, d);
      var aci = aciNormal((p.aci || 0) + d);
      var sekil = p.sekil.t === 'circle'
        ? { t: 'circle', cx: c[0], cy: c[1], r: p.sekil.r }
        : p.sekil.t === 'poly'
          ? { t: 'poly', cx: c[0], cy: c[1], w: p.sekil.w, h: p.sekil.h, a: aci, y: p.sekil.y }
          : p.sekil.r ? yuvarlakKoseli(c[0], c[1], p.en, p.boy, aci, p.sekil.r) : donukDikdortgen(c[0], c[1], p.en, p.boy, aci);
      return kopyaParca(p, { sekil: sekil, aci: aci });
    });
  }

  // Seçim çerçevesi: grubun, kendi açısındaki eksenlere göre sınırları (pivot = 0, 0)
  function grupCercevesi(parcalar, pivot, aci, pay) {
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    parcalar.forEach(function (p) {
      var noktalar;
      if (p.sekil.t === 'circle') {
        var c = dondurNokta(merkez(p.sekil), pivot, -aci);
        var r = p.sekil.r;
        noktalar = [[c[0] - r, c[1] - r], [c[0] + r, c[1] + r]];
      } else {
        noktalar = koseler(p.sekil).map(function (k) { return dondurNokta(k, pivot, -aci); });
      }
      noktalar.forEach(function (k) {
        x1 = Math.min(x1, k[0] - pivot[0]);
        y1 = Math.min(y1, k[1] - pivot[1]);
        x2 = Math.max(x2, k[0] - pivot[0]);
        y2 = Math.max(y2, k[1] - pivot[1]);
      });
    });
    pay = pay || 0;
    return { pivot: pivot, aci: aci, x1: x1 - pay, y1: y1 - pay, x2: x2 + pay, y2: y2 + pay };
  }

  // Bir grubun (isim ya da tek patch) tüm parçaları geçerli mi?
  Yerlesim.prototype.grupGecerli = function (grupParcalari, digerleri) {
    for (var i = 0; i < grupParcalari.length; i++) {
      var p = grupParcalari[i];
      if (!this.alanaUygun(p.sekil, p.tip)) return false;
      for (var j = 0; j < digerleri.length; j++) {
        if (cakisir(p.sekil, digerleri[j].sekil, -this.m.ayar.cakismaTol)) return false;
      }
    }
    return true;
  };

  // Hedef noktaya en yakın geçerli kaydırmayı arar (grup birlikte taşınır)
  Yerlesim.prototype.enYakin = function (grupParcalari, digerleri, hedefDx, hedefDy, adim) {
    adim = adim || 0.25;
    var m = this.m;
    var tip = alanTipi(grupParcalari[0].tip);
    // Arama sınırı: uygun alanların kutusu (taşma toleransı kadar geniş); grubun kutusu gerçek şekillerinden
    var tol = m.ayar.tasmaTol;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var alanKutulari = [];
    m.alanlar.forEach(function (a) {
      if (a.tipler.indexOf(tip) === -1) return;
      var k = kutu(a.sekil);
      alanKutulari.push(k);
      minX = Math.min(minX, k.x - tol);
      minY = Math.min(minY, k.y - tol);
      maxX = Math.max(maxX, k.x + k.w + tol);
      maxY = Math.max(maxY, k.y + k.h + tol);
    });
    if (!isFinite(minX)) return null;
    var g = { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity };
    grupParcalari.forEach(function (p) {
      onbellegiIsit(p.sekil, m);
      var k = sikiKutu(p.sekil);
      g.x = Math.min(g.x, k.x);
      g.y = Math.min(g.y, k.y);
      g.x2 = Math.max(g.x2, k.x + k.w);
      g.y2 = Math.max(g.y2, k.y + k.h);
    });
    // Adaylar hedefe uzaklık sırasıyla denenir (eşit uzaklıkta üretim sırası). Hepsini sıralamak yerine
    // bir öncelik kuyruğundan sırayla alınır: ilk geçerli aday genelde yakındadır, sonuç tam sıralamayla aynıdır.
    var xs = [];
    var ys = [];
    var uz = [];
    for (var dx = minX - g.x; dx <= maxX - g.x2 + EPS; dx += adim) {
      for (var dy = minY - g.y; dy <= maxY - g.y2 + EPS; dy += adim) {
        var mx = dx - hedefDx;
        var my = dy - hedefDy;
        xs.push(dx);
        ys.push(dy);
        uz.push(mx * mx + my * my);
      }
    }
    var n = uz.length;
    var yigin = new Array(n);
    for (var k = 0; k < n; k++) yigin[k] = k;
    function once(a, b) {
      return uz[a] < uz[b] || (uz[a] === uz[b] && a < b);
    }
    function asagi(i, boy) {
      for (;;) {
        var sol = 2 * i + 1;
        if (sol >= boy) return;
        var en = sol + 1 < boy && once(yigin[sol + 1], yigin[sol]) ? sol + 1 : sol;
        if (!once(yigin[en], yigin[i])) return;
        var tmp = yigin[i];
        yigin[i] = yigin[en];
        yigin[en] = tmp;
        i = en;
      }
    }
    for (var h = (n >> 1) - 1; h >= 0; h--) asagi(h, n);
    // Ön eleme: her parçanın kutusu, kaydırılınca uygun alanlardan birinin kutusuna (tolerans kadar geniş) sığmalı
    // (birden çok alan varsa ortak kutudaki boşluklar denenmez)
    var parcaKutulari = grupParcalari.map(function (p) { return sikiKutu(p.sekil); });
    function kutulardaMi(ddx, ddy) {
      for (var i = 0; i < parcaKutulari.length; i++) {
        var q = parcaKutulari[i];
        var x1 = q.x + ddx, y1 = q.y + ddy, x2 = x1 + q.w, y2 = y1 + q.h;
        var var_ = false;
        for (var a = 0; a < alanKutulari.length; a++) {
          var k = alanKutulari[a];
          if (x1 >= k.x - tol - EPS && y1 >= k.y - tol - EPS && x2 <= k.x + k.w + tol + EPS && y2 <= k.y + k.h + tol + EPS) { var_ = true; break; }
        }
        if (!var_) return false;
      }
      return true;
    }
    var kalan = n;
    while (kalan > 0) {
      var j = yigin[0];
      yigin[0] = yigin[--kalan];
      asagi(0, kalan);
      var ddx = xs[j];
      var ddy = ys[j];
      if (!kutulardaMi(ddx, ddy)) continue;
      var tasinmis = grupParcalari.map(function (p) {
        return { tip: p.tip, sekil: kaydir(p.sekil, ddx, ddy) };
      });
      if (this.grupGecerli(tasinmis, digerleri)) return [ddx, ddy];
    }
    return null;
  };

  // Belirli ölçüdeki bir patch için alanda kaç yer kaldığını kabaca sayar
  Yerlesim.prototype.kalanYer = function (parcalar, en, boy, sekil, tip) {
    var dolu = parcalar.slice();
    var sayi = 0;
    var ornek = sekil === 'circle' ? { t: 'circle', cx: 0, cy: 0, r: Math.min(en, boy) / 2 } : dikdortgen(0, 0, en, boy);
    for (var i = 0; i < 9; i++) {
      var bulunan = this.ilkUygun(ornek, tip, dolu);
      if (!bulunan) break;
      dolu.push({ sekil: bulunan, tip: tip });
      sayi++;
    }
    return sayi;
  };

  Yerlesim.prototype.ilkUygun = function (ornek, tip, dolu) {
    var m = this.m;
    var adim = 0.5;
    var a = m.alanBul(alanTipi(tip));
    if (!a) return null;
    var k = kutu(a.sekil);
    var tol = m.ayar.tasmaTol;
    // Örneğin gerçek şeklinin kutusu alan kutusunun (tolerans kadar geniş) içinde kalacak kaydırmalar taranır
    onbellegiIsit(ornek, m);
    var ok = sikiKutu(ornek);
    for (var dy = k.y - tol - ok.y; dy <= k.y + k.h + tol - (ok.y + ok.h) + EPS; dy += adim) {
      for (var dx = k.x - tol - ok.x; dx <= k.x + k.w + tol - (ok.x + ok.w) + EPS; dx += adim) {
        var s = kaydir(ornek, dx, dy);
        if (this.grupGecerli([{ tip: tip, sekil: s }], dolu)) return s;
      }
    }
    return null;
  };

  /* ------------------------------------------------------------------ */
  /* Tasarım durumu                                                      */
  /* ------------------------------------------------------------------ */

  // Alan adının yönelme hâli, küçük harfle: "Üst panel" → "üst panele", "Alt cep" → "alt cebe"
  function alanYonelme(alan) {
    var ad = String((alan && alan.ad) || 'alan').toLocaleLowerCase('tr-TR').trim();
    var kelimeler = ad.split(/\s+/);
    var son = kelimeler.pop();
    var unluler = son.match(/[aeıioöuü]/g) || ['e'];
    var unlu = unluler[unluler.length - 1];
    var ek = /[aıou]/.test(unlu) ? 'a' : 'e';
    if (/[aeıioöuü]$/.test(son)) son += 'y' + ek;
    else {
      // Ünsüz yumuşaması: çok heceli sözcüklerde ve birkaç tek heceli sözcükte (cep → cebe)
      var yumusa = unluler.length > 1 || ['cep', 'dip', 'uç', 'kalp', 'renk'].indexOf(son) !== -1;
      if (yumusa) son = son.replace(/nk$/, 'ng').replace(/p$/, 'b').replace(/ç$/, 'c').replace(/t$/, 'd').replace(/k$/, 'ğ');
      son += ek;
    }
    return kelimeler.concat([son]).join(' ');
  }
  function buyukBas(s) {
    return s ? s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1) : s;
  }

  // Yazı alanında görünen değer: yazı + (çok alanlı üründe) müşterinin yazdığı boşluk
  function girdiDegeri(t) {
    var h = Array.from(t.isim || '');
    if (t.bosluk > 0 && t.bosluk < h.length) h.splice(t.bosluk, 0, ' ');
    return h.join('');
  }

  /* ---------------- Yazı blokları (çok alanlı ürün) ---------------- */
  // Yazı tek blok ('isim') ya da, birden çok harf alanı olan üründe, iki bloğa bölünmüş olabilir:
  // t.bol = ilk bloktaki harf sayısı, ikinci blok ('isim2') kalan harfler; t.bolAlan = blokların alan kimlikleri.
  // İlk bloğun konum / açı / kenar / ayrı bilgisi eskisi gibi isimMerkez, isimAci, isimKenar, harfAyri'de;
  // ikinci bloğunki isim2Merkez, isim2Aci, isim2Kenar, harfAyri2'de. t.yaziYeri: 'oto' (varsayılan) ya da alan kimliği.
  var BLOK_ALAN = [
    { grup: 'isim', merkez: 'isimMerkez', aci: 'isimAci', kenar: 'isimKenar', ayri: 'harfAyri' },
    { grup: 'isim2', merkez: 'isim2Merkez', aci: 'isim2Aci', kenar: 'isim2Kenar', ayri: 'harfAyri2' }
  ];
  function bolunmus(t) {
    var n = Array.from(t.isim || '').length;
    return t.bol > 0 && t.bol < n;
  }
  function harfBlogu(t, i) {
    return bolunmus(t) && i >= t.bol ? 1 : 0;
  }
  function blokAyri(t, b) {
    return !!t[BLOK_ALAN[b].ayri];
  }
  function harfAyriMi(t, i) {
    return blokAyri(t, harfBlogu(t, i));
  }
  function herhangiAyri(t) {
    return !!t.harfAyri || (bolunmus(t) && !!t.harfAyri2);
  }
  function grupBlogu(g) {
    return g === 'isim' ? 0 : g === 'isim2' ? 1 : -1;
  }
  function blokGrubu(g) {
    return g === 'isim' || g === 'isim2';
  }
  // Harfin grubu: ayrıysa 'harf-i', değilse bloğunun grubu
  function harfGrubu(t, i) {
    return harfAyriMi(t, i) ? 'harf-' + i : BLOK_ALAN[harfBlogu(t, i)].grup;
  }
  // Blokların harf aralıkları: [{ b, bas, son }]
  function yaziBloklari(t) {
    var n = Array.from(t.isim || '').length;
    if (!n) return [];
    return bolunmus(t) ? [{ b: 0, bas: 0, son: t.bol }, { b: 1, bas: t.bol, son: n }] : [{ b: 0, bas: 0, son: n }];
  }
  function harfAlanlari(m) {
    return m.alanlar.filter(function (a) { return a.tipler.indexOf('letter') !== -1; });
  }
  function alanKimlikle(m, id) {
    for (var i = 0; i < m.alanlar.length; i++) if (m.alanlar[i].id === id) return m.alanlar[i];
    return null;
  }
  function alanBuyuklugu(s) {
    if (s.t === 'cokgen') return s.alanBuyuklugu;
    if (s.t === 'circle') return Math.PI * s.r * s.r;
    if (s.t === 'ellipse') return Math.PI * s.rx * s.ry;
    return s.w * s.h - (4 - Math.PI) * Math.pow(s.r || 0, 2);
  }
  // Yazının varsayılan alanı: tek harf alanı varsa o; birden çoksa en büyüğü
  function varsayilanYaziAlani(m) {
    var hz = harfAlanlari(m);
    if (hz.length < 2) return hz[0] || m.alanBul('letter');
    return hz.slice().sort(function (a, b) { return alanBuyuklugu(b.sekil) - alanBuyuklugu(a.sekil); })[0];
  }
  // Bloğun yerleştiği alan
  function blokAlani(m, t, b) {
    var id = t.bolAlan && t.bolAlan[bolunmus(t) ? b : 0];
    var a = id && alanKimlikle(m, id);
    if (a && a.tipler.indexOf('letter') !== -1) return a;
    if (t.yaziYeri && t.yaziYeri !== 'oto') {
      a = alanKimlikle(m, t.yaziYeri);
      if (a && a.tipler.indexOf('letter') !== -1) return a;
    }
    return varsayilanYaziAlani(m);
  }

  // Türkçe sesli harf ve hece sınırı (bölme noktası için): ünsüz + ünlüyle başlayan hece ya da iki ünlü arası
  function sesliMi(h) {
    return /[AEIİOÖUÜ]/.test(h || '');
  }
  function heceSiniri(harfler, k) {
    var a = harfler[k - 1];
    var b = harfler[k];
    if (RAKAM_DESENI.test(a) !== RAKAM_DESENI.test(b)) return true;
    if (!sesliMi(b) && sesliMi(harfler[k + 1])) return true;
    return sesliMi(a) && sesliMi(b);
  }

  // Yazının yerleşimi (blok düzeni değişmeden hesaplanır): { bol: k ya da null, alanlar: [id, id?], sigiyor }.
  // Seçili alan: yazı yalnızca o alanda. Otomatik: önce en büyük alanda tek blok; sığmazsa en uygun noktadan
  // bölünür, ilk parça üstteki (soldaki) alana, kalanı diğerine (boşluk yazıldıysa önce oradan).
  function yaziYerlesimi(m, yer, t) {
    var harfler = Array.from(t.isim || '');
    var hz = harfAlanlari(m);
    var olculer = isimOlculeri(m, t);
    var aci0 = t.harfAyri ? 0 : aciNormal(t.isimAci);
    var sigar = function (bas, son, alan, aci) {
      return son > bas && yer.isimSatiriOlcu(olculer.slice(bas, son), aci, alan) > 0;
    };
    if (t.yaziYeri && t.yaziYeri !== 'oto') {
      var secili = alanKimlikle(m, t.yaziYeri);
      if (secili && secili.tipler.indexOf('letter') !== -1) {
        return { bol: null, alanlar: [secili.id], sigiyor: !harfler.length || sigar(0, harfler.length, secili, aci0), secili: secili };
      }
    }
    var ana = varsayilanYaziAlani(m);
    if (!ana || !harfler.length || hz.length < 2) return { bol: null, alanlar: ana ? [ana.id] : [], sigiyor: !harfler.length || (!!ana && sigar(0, harfler.length, ana, aci0)) };
    if (sigar(0, harfler.length, ana, aci0)) return { bol: null, alanlar: [ana.id], sigiyor: true };
    // İki en büyük alan, okuma sırasıyla (üstteki önce, eşitse soldaki)
    var iki = hz.slice().sort(function (a, b) { return alanBuyuklugu(b.sekil) - alanBuyuklugu(a.sekil); }).slice(0, 2)
      .sort(function (a, b) { var ma = merkez(a.sekil); var mb = merkez(b.sekil); return Math.abs(ma[1] - mb[1]) > 1 ? ma[1] - mb[1] : ma[0] - mb[0]; });
    var aci1 = t.harfAyri2 ? 0 : aciNormal(t.isim2Aci);
    var n = harfler.length;
    var enIyi = null;
    [[iki[0], iki[1]], [iki[1], iki[0]]].some(function (cift) {
      for (var k = n - 1; k >= 1; k--) {
        if (!sigar(0, k, cift[0], aci0)) continue;
        if (!sigar(k, n, cift[1], aci1)) continue;
        var puan = (t.bosluk === k ? 1000 : 0) + (k >= 2 && n - k >= 2 ? 100 : 0) + (heceSiniri(harfler, k) ? 10 : 0) + k / 100;
        if (!enIyi || puan > enIyi.puan) enIyi = { bol: k, alanlar: [cift[0].id, cift[1].id], puan: puan };
      }
      return !!enIyi;
    });
    if (enIyi) return { bol: enIyi.bol, alanlar: enIyi.alanlar, sigiyor: true };
    return { bol: null, alanlar: [ana.id], sigiyor: false };
  }

  // Yazıyı yerleşime göre bloklara dağıtır. Harfler ayrıyken bölme sabit kalır (müşterinin yerleştirdiği harfler oynamaz).
  // Bölme noktası ya da alan değişen bloğun konumu sıfırlanır (alanın ortasına gelir).
  function yaziyiDagit(m, yer, t) {
    var n = Array.from(t.isim || '').length;
    if (!n) {
      t.bol = null;
      return;
    }
    if (herhangiAyri(t) || t.bolSabit) {
      if (!bolunmus(t)) t.bol = null;
      return;
    }
    var y = yaziYerlesimi(m, yer, t);
    var eskiBol = bolunmus(t) ? t.bol : null;
    var eski = t.bolAlan || [];
    // Kayıtlı alanı olmayan (eski) tasarımda ilk bloğun konumu korunur
    if (y.bol !== eskiBol || (eski[0] && y.alanlar[0] !== eski[0])) t.isimMerkez = null;
    if (y.bol !== eskiBol || y.alanlar[1] !== eski[1]) {
      t.isim2Merkez = null;
      t.isim2Kenar = false;
    }
    t.bol = y.bol;
    t.bolAlan = y.alanlar;
    if (!y.bol) {
      t.isim2Merkez = null;
      t.isim2Aci = 0;
      t.isim2Kenar = false;
      t.harfAyri2 = false;
    }
  }

  function bosTasarim(model) {
    return { setId: model.setler[0].id, isim: '', isimMerkez: null, parcalar: [] };
  }

  function kopyala(t) {
    return JSON.parse(JSON.stringify(t));
  }

  // Yazı analizi: eksik harf/rakam, stok, sığma. Her karakter kendi setine göre denetlenir.
  function isimAnaliz(model, yer, t) {
    var harfler = Array.from(t.isim || '');
    var isimAci = t.harfAyri ? 0 : t.isimAci;
    var set0 = model.set(t.setId);
    var hz = harfAlanlari(model);
    var otomatik = !t.yaziYeri || t.yaziYeri === 'oto' || !alanKimlikle(model, t.yaziYeri);
    // Çok alanlı üründe Otomatik: kapasite iki en büyük alanın toplamı (yazı bölünebilir); seçili alanda yalnızca o alan
    var kap = hz.length > 1 && otomatik
      ? hz.slice().sort(function (a, b) { return alanBuyuklugu(b.sekil) - alanBuyuklugu(a.sekil); }).slice(0, 2)
        .reduce(function (top, a) { return top + yer.kapasite(set0, 0, a); }, 0)
      : yer.kapasite(set0, isimAci, blokAlani(model, t, 0));
    var sonuc = { harfler: harfler, eksikler: [], yoklar: [], stokSorunlari: [], sigiyor: true, kapasite: kap };
    // Ürünün karakter sınırı ile geometriye göre sınırdan küçük olanı geçerli
    if (model.metinSiniri) sonuc.kapasite = Math.min(sonuc.kapasite, model.metinSiniri);
    var sayim = {};
    var gorulen = {};
    var renkSayim = {};
    harfler.forEach(function (h, i) {
      var set = karakterSeti(model, t, i, h);
      var rakam = RAKAM_DESENI.test(h);
      var v = set && set.karakterler[h];
      if (!v) {
        var anahtar0 = (set ? set.id : '-') + ':' + h;
        if (gorulen[anahtar0]) return;
        gorulen[anahtar0] = true;
        var oneri = !rakam && TR_ESLEME[h];
        var ov = oneri && set && set.karakterler[oneri];
        if (ov && ov.satilabilir && (ov.stok == null || ov.stok > 0)) sonuc.eksikler.push({ harf: h, oneri: oneri });
        else sonuc.yoklar.push(h);
        return;
      }
      var anahtar = set.id + ':' + h;
      (sayim[anahtar] = sayim[anahtar] || { set: set, harf: h, adet: 0 }).adet++;
      if (set.cokRenkli) {
        var rv = harfVaryanti(set, t, i, h);
        if (rv) (renkSayim[rv.id] = renkSayim[rv.id] || { v: rv, harf: h, set: set, adet: 0 }).adet++;
      }
    });
    Object.keys(sayim).forEach(function (k) {
      var x = sayim[k];
      var mevcut;
      if (x.set.cokRenkli) mevcut = (x.set.karakterVaryantlari[x.harf] || []).reduce(function (t2, v) { return t2 + (v.stok == null ? Infinity : v.stok); }, 0);
      else {
        var v = x.set.karakterler[x.harf];
        mevcut = !v.satilabilir ? 0 : v.stok == null ? Infinity : v.stok;
      }
      if (mevcut < x.adet) sonuc.stokSorunlari.push({ harf: x.harf, gereken: x.adet, mevcut: mevcut });
    });
    // Çok renkli sette stok renk varyantı bazında: aynı renk birden fazla seçildiyse adet sayılır
    Object.keys(renkSayim).forEach(function (id) {
      var r = renkSayim[id];
      var mevcut = r.v.stok == null ? Infinity : r.v.stok;
      var harfSorunu = sonuc.stokSorunlari.some(function (x) { return x.harf === r.harf; });
      if (!harfSorunu && mevcut < r.adet) sonuc.stokSorunlari.push({ harf: r.harf, renk: r.v.renk, gereken: r.adet, mevcut: mevcut });
    });
    if (harfler.length) {
      var y = yaziYerlesimi(model, yer, t);
      var geo = y.sigiyor;
      if (herhangiAyri(t)) {
        // Harfler ayrıyken bölme sabit: her blok kendi alanına sığıyor mu
        var olc = isimOlculeri(model, t);
        geo = yaziBloklari(t).every(function (bl) { return yer.isimSatiriOlcu(olc.slice(bl.bas, bl.son), 0, blokAlani(model, t, bl.b)) > 0; });
      } else if (y.bol) {
        sonuc.bolunme = { parcalar: [harfler.slice(0, y.bol).join(''), harfler.slice(y.bol).join('')], alanlar: y.alanlar.map(function (id) { return alanKimlikle(model, id); }) };
      }
      if (!geo && y.secili) {
        // Seçili alana sığmıyor: alanın kapasitesi ve sığıyorsa taşınabilecek diğer alan
        sonuc.alanTasmasi = { alan: y.secili, kapasite: yer.kapasite(set0, isimAci, y.secili) };
        var olc2 = isimOlculeri(model, t);
        sonuc.alanTasmasi.diger = hz.filter(function (a) { return a !== y.secili && yer.isimSatiriOlcu(olc2, isimAci, a) > 0; })[0] || null;
      }
      sonuc.sigiyor = geo && !(model.metinSiniri && harfler.length > model.metinSiniri);
    }
    sonuc.engel = sonuc.eksikler.length > 0 || sonuc.yoklar.length > 0 || sonuc.stokSorunlari.length > 0 || !sonuc.sigiyor;
    return sonuc;
  }

  // Yazının yalnızca yerleşimi ilgilendiren kopyası (blok dizilim hesabı için)
  function yaziKopyasi(t) {
    return { setId: t.setId, isim: t.isim, karakterSetleri: t.karakterSetleri, harfRenkleri: t.harfRenkleri, isimMerkez: t.isimMerkez, isimAci: t.isimAci,
      bol: t.bol, bolAlan: t.bolAlan, yaziYeri: t.yaziYeri, isim2Merkez: t.isim2Merkez, isim2Aci: t.isim2Aci, parcalar: [] };
  }

  // Yazı değişince karakter başına diziler (set, renk, ayrı konum ve açı) yeni metne hizalanır:
  // ortak baş ve son korunur, araya eklenen karakterler son seçilen harf setiyle gelir.
  function karakterleriHizala(t, yeni) {
    var eski = Array.from(t.isim || '');
    var ye = Array.from(yeni || '');
    var bas = 0;
    while (bas < eski.length && bas < ye.length && eski[bas] === ye[bas]) bas++;
    var son = 0;
    while (son < eski.length - bas && son < ye.length - bas && eski[eski.length - 1 - son] === ye[ye.length - 1 - son]) son++;
    function hizala(dizi, bos) {
      if (!Array.isArray(dizi)) return dizi;
      var sonuc = dizi.slice(0, bas);
      for (var i = bas; i < ye.length - son; i++) sonuc.push(typeof bos === 'function' ? bos(i) : bos);
      return sonuc.concat(dizi.slice(eski.length - son));
    }
    t.karakterSetleri = hizala(t.karakterSetleri || eski.map(function () { return null; }), function () { return t.setId; });
    t.harfRenkleri = hizala(t.harfRenkleri, null);
    t.ceviriler = hizala(t.ceviriler, null);
    // Bölünmüş yazıda araya / baştan eklenen ya da silinen karakterler bölme noktasını kaydırır
    if (bolunmus(t) && bas < t.bol) {
      var kayma = ye.length - eski.length;
      var yeniBol = kayma < 0 ? Math.max(bas, t.bol + kayma) : t.bol + kayma;
      t.bol = yeniBol > 0 && yeniBol < ye.length ? yeniBol : null;
    }
    if (herhangiAyri(t)) {
      // Yeni karakterlerin konumu ve açısı harfKonumlariniEsitle'de blok dizilimden atanır
      t.harfKonumlari = hizala(t.harfKonumlari, null);
      t.harfAcilari = hizala(t.harfAcilari, null);
      t.harfKenar = hizala(t.harfKenar, false);
    }
    t.isim = ye.join('');
  }

  // Tasarımın tüm parçalarını doğrular, çakışan parçaları en yakın geçerli yere taşır
  // Bir parçanın kayıtlı konumunu kaydırır (harf ya da rakam/ikon)
  function konumKaydir(t, p, dx, dy) {
    if (blokGrubu(p.grup)) {
      return;
    }
    if (String(p.grup).indexOf('harf-') === 0) {
      var k = t.harfKonumlari[p.sira];
      t.harfKonumlari[p.sira] = [k[0] + dx, k[1] + dy];
      return;
    }
    (t.aksesuarlar || []).concat(t.parcalar).forEach(function (x) {
      if (x.uid === p.uid) {
        x.cx += dx;
        x.cy += dy;
      }
    });
  }

  // Ayrı modda harf konum listesini isimle aynı uzunlukta tutar.
  // Yeni eklenen harfler blok dizilimindeki yerinden başlar; çakışırsa düzenle() en yakın boş yere taşır.
  function harfKonumlariniEsitle(yer, t) {
    if (!herhangiAyri(t)) {
      t.harfKonumlari = null;
      t.harfAcilari = null;
      t.harfKenar = null;
      return;
    }
    var adet = Array.from(t.isim || '').length;
    var mevcut = Array.isArray(t.harfKonumlari) ? t.harfKonumlari.slice(0, adet) : [];
    var acilar = Array.isArray(t.harfAcilari) ? t.harfAcilari.slice(0, adet) : [];
    var blok = null;
    for (var i = 0; i < adet; i++) {
      if (mevcut[i] && acilar[i] != null) continue;
      if (!blok) blok = yer.parcalar(yaziKopyasi(t));
      if (!mevcut[i]) mevcut[i] = merkez(blok[i].sekil);
      if (acilar[i] == null) acilar[i] = blok[i].aci;
    }
    t.harfKonumlari = mevcut;
    t.harfAcilari = acilar;
    if (!adet) {
      t.harfAyri = false;
      t.harfAyri2 = false;
    }
  }

  // Tasarımın tüm parçalarını doğrular. Hiçbir parçayı taşımaz: geçersiz yerdeki parça bırakıldığı yerde kalır,
  // hatalar'da işaretlenir. Sorun türü: 'tasma', 'yasak' ya da 'cakisma' (ile: değdiği grup). Kenardaki parçalar geçerlidir.
  function duzenle(model, yer, t) {
    renkleriAta(model, t);
    yaziyiDagit(model, yer, t);
    harfKonumlariniEsitle(yer, t);
    var parcalar = yer.parcalar(t);
    var hatalar = {};
    var sorunlar = {};
    var aktif = parcalar.filter(function (p) { return !p.kenar; });
    aktif.forEach(function (p) {
      var s0 = yer.konumSorunu(p.sekil, p.tip);
      if (s0) {
        hatalar[p.uid] = true;
        sorunlar[p.uid] = { tur: s0 };
      }
    });
    for (var i = 0; i < aktif.length; i++) {
      for (var j = i + 1; j < aktif.length; j++) {
        var a = aktif[i];
        var b = aktif[j];
        if (a.grup === b.grup || !cakisir(a.sekil, b.sekil, -model.ayar.cakismaTol)) continue;
        // Üst üste gelen iki gruptan yalnızca en son taşınan/eklenen işaretlenir (bilinmiyorsa ikisi de).
        // Ayrılmış iki harf üst üste geldiyse ikisi de işaretlenir (hangisinin üstte göründüğünden bağımsız)
        var son = t.son || [];
        var ra = son.indexOf(a.grup);
        var rb = son.indexOf(b.grup);
        var ikiHarf = yazidaMi(a) && yazidaMi(b);
        var ciftler = ikiHarf || ra === rb ? [[a, b], [b, a]] : ra > rb ? [[a, b]] : [[b, a]];
        ciftler.forEach(function (c) {
          hatalar[c[0].uid] = true;
          if (!sorunlar[c[0].uid]) sorunlar[c[0].uid] = { tur: 'cakisma', ile: c[1].grup };
        });
      }
    }
    var isimGecerli = !parcalar.some(function (p) { return yazidaMi(p) && hatalar[p.uid]; });
    return { parcalar: parcalar, hatalar: hatalar, sorunlar: sorunlar, isimGecerli: isimGecerli };
  }

  // Son taşınan/eklenen grupların sırası (çakışmada yalnızca en son dokunulan işaretlenir)
  function sonaAl(t, grup) {
    if (!grup) return;
    t.son = (t.son || []).filter(function (g) { return g !== grup; }).concat([grup]).slice(-30);
  }

  // Kenar: çantaya takılmamış patch'ler. Tasarımdan silinmiş sayılmaz (sepete girer, fiyatlanır, stoktan düşer).
  // grup: 'isim' (blok yazı), 'harf-i' (ayrı harf) ya da parça/aksesuar uid'i
  function kenaraAl(t, grup) {
    if (blokGrubu(grup)) {
      t[BLOK_ALAN[grupBlogu(grup)].kenar] = true;
      return;
    }
    if (String(grup).indexOf('harf-') === 0) {
      var i = parseInt(String(grup).slice(5), 10);
      var adet = Array.from(t.isim || '').length;
      if (!Array.isArray(t.harfKenar)) t.harfKenar = [];
      while (t.harfKenar.length < adet) t.harfKenar.push(false);
      t.harfKenar[i] = true;
      return;
    }
    (t.aksesuarlar || []).concat(t.parcalar).forEach(function (x) { if (x.uid === grup) x.kenar = true; });
  }

  // Kenardaki grubu çantaya, verilen merkeze koyar
  function kenardanAl(t, grup, cx, cy) {
    if (blokGrubu(grup)) {
      var ad = BLOK_ALAN[grupBlogu(grup)];
      t[ad.kenar] = false;
      t[ad.merkez] = [cx, cy];
      return;
    }
    if (String(grup).indexOf('harf-') === 0) {
      var i = parseInt(String(grup).slice(5), 10);
      if (Array.isArray(t.harfKenar)) t.harfKenar[i] = false;
      if (!Array.isArray(t.harfKonumlari)) t.harfKonumlari = [];
      t.harfKonumlari[i] = [cx, cy];
      return;
    }
    (t.aksesuarlar || []).concat(t.parcalar).forEach(function (x) {
      if (x.uid === grup) {
        x.kenar = false;
        x.cx = cx;
        x.cy = cy;
      }
    });
  }

  // Parça yazının (blok ya da ayrı harf) bir karakteri mi?
  function yazidaMi(p) {
    return blokGrubu(p.grup) || String(p.grup).indexOf('harf-') === 0;
  }

  // Yazıdan i. karakteri, ona bağlı set/renk/konum bilgileriyle birlikte çıkarır
  function karakterSil(t, i) {
    var harfler = Array.from(t.isim || '');
    harfler.splice(i, 1);
    ['karakterSetleri', 'harfRenkleri', 'harfKonumlari', 'harfAcilari', 'harfKenar'].forEach(function (k) {
      if (Array.isArray(t[k])) t[k].splice(i, 1);
    });
    if (t.bol > 0 && i < t.bol) t.bol--;
    t.isim = harfler.join('');
    if (!bolunmus(t)) t.bol = null;
  }

  // Blok yazıyı ayrı harflere böler: her harf bulunduğu yerde kalır. b: yalnızca o blok (verilmezse hepsi)
  function harfleriAyir(yer, t, b) {
    if (!t.isim) return;
    var parcalar = yer.parcalar(t);
    var n = Array.from(t.isim).length;
    yaziBloklari(t).forEach(function (bl) {
      var ad = BLOK_ALAN[bl.b];
      if ((b != null && bl.b !== b) || t[ad.ayri]) return;
      if (!Array.isArray(t.harfKonumlari)) t.harfKonumlari = [];
      if (!Array.isArray(t.harfAcilari)) t.harfAcilari = [];
      if (!Array.isArray(t.harfKenar)) t.harfKenar = [];
      while (t.harfKenar.length < n) t.harfKenar.push(false);
      parcalar.forEach(function (p) {
        if (p.grup !== ad.grup) return;
        t.harfKonumlari[p.sira] = merkez(p.sekil);
        t.harfAcilari[p.sira] = p.aci;
        t.harfKenar[p.sira] = !!t[ad.kenar];
      });
      t[ad.kenar] = false;
      t[ad.ayri] = true;
    });
  }

  // Ayrı harfleri, harflerin ortalama konumunda düzenli bir blok olarak birleştirir.
  // Blok orada sığmazsa düzenle() alan merkezine alır; çakışan rakam/ikonlar en yakın boş yere taşınır.
  function harfleriBirlestir(t, b) {
    yaziBloklari(t).forEach(function (bl) {
      var ad = BLOK_ALAN[bl.b];
      if ((b != null && bl.b !== b) || !t[ad.ayri]) return;
      var k = (t.harfKonumlari || []).slice(bl.bas, bl.son).filter(Boolean);
      if (k.length) {
        var sx = 0;
        var sy = 0;
        k.forEach(function (c) {
          sx += c[0];
          sy += c[1];
        });
        t[ad.merkez] = [sx / k.length, sy / k.length];
      }
      // Harflerin hepsi kenardaysa blok da kenarda kalır; değilse blok çantaya gelir
      var kenar = Array.isArray(t.harfKenar) ? t.harfKenar.slice(bl.bas, bl.son) : [];
      t[ad.kenar] = bl.son > bl.bas && kenar.length >= bl.son - bl.bas && kenar.every(Boolean);
      t[ad.ayri] = false;
    });
    if (!herhangiAyri(t)) {
      t.harfKonumlari = null;
      t.harfAcilari = null;
      t.harfKenar = null;
    }
  }

  function stokKontrol(model, t, yer, adet) {
    adet = adet || 1;
    var gerek = {};
    var bilgi = {};
    // Bozulmamış setin patch'leri set ürünü olarak satılır: tek patch stoğu düşmez
    var setIdleri = saglamSetler(model, t).map(function (k) { return k.id; });
    yer.parcalar(t).forEach(function (p) {
      if (!p.varyant || (p.setGrup && setIdleri.indexOf(p.setGrup) !== -1)) return;
      gerek[p.varyant.id] = (gerek[p.varyant.id] || 0) + adet;
      bilgi[p.varyant.id] = p;
    });
    // Aksesuarların üzerindeki patch'ler çantadakilerle aynı stoktan düşer
    (t.aksesuarlar || []).forEach(function (a) {
      var am = a.tasarim && model.aksesuarModeli && model.aksesuarModeli(a.urunId);
      if (!am) return;
      var icSet = saglamSetler(am.m, a.tasarim).map(function (k) { return k.id; });
      am.yer.parcalar(a.tasarim).forEach(function (p) {
        if (!p.varyant || (p.setGrup && icSet.indexOf(p.setGrup) !== -1)) return;
        gerek[p.varyant.id] = (gerek[p.varyant.id] || 0) + adet;
        bilgi[p.varyant.id] = p;
      });
    });
    var sorunlar = [];
    Object.keys(gerek).forEach(function (id) {
      var v = bilgi[id].varyant;
      var mevcut = !v.satilabilir ? 0 : v.stok == null ? Infinity : v.stok;
      if (mevcut < gerek[id]) sorunlar.push({ parca: bilgi[id], gereken: gerek[id], mevcut: mevcut });
    });
    return sorunlar;
  }

  // Kenar (çantaya takılmamış) patch'ler fiyata, kampanyaya ve sepete dahil değildir; Özet'te müşteri "Evet, ekle"
  // derse seçtikleri (t.kenarAl: grup adları) dahil olur. Sonuç: satın alınacak tasarım (kenarda kalanlar çıkarılmış kopya).
  // Hazır set: patch'lerinden biri dahilse set bütün olarak dahildir (set tek ürün); hepsi dışarıdaysa set de dışarıda.
  function satinAlinacak(model, t) {
    if (!t) return t;
    // Kombin: kenardaki patch'ler de kombinin parçası (hediye Tshirt'e takılabilir); hepsi fiyata ve sepete dahil
    if (model && model.kombin) return t;
    var yaziKenar = Array.from(t.isim || '').some(function (h, i) {
      return harfAyriMi(t, i) ? !!(t.harfKenar && t.harfKenar[i]) : !!t[BLOK_ALAN[harfBlogu(t, i)].kenar];
    });
    var kenarVar = yaziKenar ||
      (t.parcalar || []).some(function (p) { return p.kenar; }) || (t.aksesuarlar || []).some(function (a) { return a.kenar; });
    if (!kenarVar) return t;
    var al = t.kenarAl || [];
    var alinir = function (g) { return al.indexOf(g) !== -1; };
    var k = kopyala(t);
    var setler = {};
    (k.hazirSetler || []).forEach(function (x) { setler[x.id] = false; });
    k.parcalar.forEach(function (p) { if (p.setGrup && p.setGrup in setler && (!p.kenar || alinir(p.uid))) setler[p.setGrup] = true; });
    k.parcalar = k.parcalar.filter(function (p) {
      if (p.setGrup && p.setGrup in setler) return setler[p.setGrup];
      return !p.kenar || alinir(p.uid);
    });
    k.hazirSetler = (k.hazirSetler || []).filter(function (x) { return setler[x.id]; });
    k.aksesuarlar = (k.aksesuarlar || []).filter(function (a) { return !a.kenar || alinir(a.uid); });
    var harfler = Array.from(k.isim || '');
    var sil = [];
    harfler.forEach(function (h, i) {
      var kenarda = harfAyriMi(k, i) ? !!(k.harfKenar && k.harfKenar[i]) : !!k[BLOK_ALAN[harfBlogu(k, i)].kenar];
      if (kenarda && !alinir(harfGrubu(k, i))) sil.push(i);
    });
    for (var i = sil.length - 1; i >= 0; i--) karakterSil(k, sil[i]);
    if (!k.isim) k.isimKenar = false;
    if (!bolunmus(k)) k.isim2Kenar = false;
    return k;
  }

  function fiyatHesapla(model, yer, t) {
    t = satinAlinacak(model, t);
    var satirlar = { harf: 0, harfAdet: 0, rakam: 0, rakamAdet: 0, ikon: 0, ikonAdet: 0, set: 0, setAdet: 0, setPatchAdet: 0, setParcaToplam: 0, setler: [] };
    var saglam = saglamSetler(model, t);
    var setIdleri = saglam.map(function (k) { return k.id; });
    saglam.forEach(function (k) {
      var tanim = model.hazirSetHarita[k.urunId];
      satirlar.set += tanim.fiyat;
      satirlar.setAdet++;
      satirlar.setPatchAdet += tanim.patchler.length;
      satirlar.setParcaToplam += tanim.parcaToplam;
      satirlar.setler.push({ id: k.id, tanim: tanim });
    });
    satirlar.aksesuar = 0;
    satirlar.aksesuarPatchAdet = 0;
    satirlar.aksesuarlar = [];
    (t.aksesuarlar || []).forEach(function (a) {
      var aks = model.aksesuarHarita && model.aksesuarHarita[a.urunId];
      if (!aks) return;
      var am = a.tasarim && !bosMu(a.tasarim) && model.aksesuarModeli(aks.id);
      var f2 = am ? fiyatHesapla(am.m, am.yer, a.tasarim) : null;
      var kalem = { uid: a.uid, tanim: aks, fiyat: aks.fiyat, patch: f2 ? f2.patchToplam : 0, patchAdet: f2 ? f2.patchAdet : 0, ozet: am ? tasarimOzeti(am.m, a.tasarim) : '' };
      kalem.toplam = kalem.fiyat + kalem.patch;
      satirlar.aksesuar += kalem.toplam;
      satirlar.aksesuarPatchAdet += kalem.patchAdet;
      satirlar.aksesuarlar.push(kalem);
    });
    yer.parcalar(t).forEach(function (p) {
      if (p.tip === 'aksesuar' || (p.setGrup && setIdleri.indexOf(p.setGrup) !== -1)) return;
      var f = p.varyant ? p.varyant.fiyat : 0;
      if (p.tip === 'letter') {
        satirlar.harf += f;
        satirlar.harfAdet++;
      } else if (p.tip === 'number') {
        satirlar.rakam += f;
        satirlar.rakamAdet++;
      } else {
        satirlar.ikon += f;
        satirlar.ikonAdet++;
      }
    });
    satirlar.urun = model.urun.fiyat;
    satirlar.patchToplam = satirlar.harf + satirlar.rakam + satirlar.ikon + satirlar.set;
    satirlar.toplam = satirlar.urun + satirlar.patchToplam + satirlar.aksesuar;
    satirlar.patchAdet = satirlar.harfAdet + satirlar.rakamAdet + satirlar.ikonAdet + satirlar.setPatchAdet + satirlar.aksesuarPatchAdet;
    return satirlar;
  }

  // İsmin özeti; çok renkli sette renklerle: "ECE (Yeşil E, Beyaz C, Turkuaz E)"
  function isimOzeti(model, t) {
    if (!t.isim) return '';
    var renkVar = false;
    var renkli = Array.from(t.isim).map(function (h, i) {
      var set = karakterSeti(model, t, i, h);
      var v = set && set.cokRenkli ? harfVaryanti(set, t, i, h) : null;
      if (v && v.renk) {
        renkVar = true;
        return v.renk + ' ' + h;
      }
      return h;
    });
    var yazilan = yazilanIsim(t);
    var ek = yazilan !== t.isim ? ' (yazılan: ' + yazilan + ')' : '';
    return renkVar ? t.isim + ' (' + renkli.join(', ') + ')' + ek : t.isim + ek;
  }

  function tasarimOzeti(model, t) {
    var parcalar = [];
    if (t.isim) parcalar.push(isimOzeti(model, t));
    var rakamlar = t.parcalar.filter(function (p) { return p.tip === 'number'; });
    var ikonlar = t.parcalar.filter(function (p) { return p.tip === 'icon'; });
    var rs = model.rakamSeti();
    rakamlar.forEach(function (p) {
      var v = rs && rs.varyantlar.filter(function (x) { return String(x.id) === String(p.varyantId); })[0];
      if (v) parcalar.push(v.karakter || v.baslik);
    });
    var saglam = saglamSetler(model, t);
    var setIdleri = saglam.map(function (k) { return k.id; });
    saglam.forEach(function (k) { parcalar.push(model.hazirSetHarita[k.urunId].ad + ' seti'); });
    ikonlar.forEach(function (p) {
      if (p.setGrup && setIdleri.indexOf(p.setGrup) !== -1) return;
      var i = model.ikonHarita[p.urunId];
      if (i) parcalar.push(i.ad);
    });
    (t.aksesuarlar || []).forEach(function (a) {
      var aks = model.aksesuarHarita && model.aksesuarHarita[a.urunId];
      if (!aks) return;
      var am = a.tasarim && !bosMu(a.tasarim) && model.aksesuarModeli(aks.id);
      parcalar.push(aks.ad + (am ? ' (' + tasarimOzeti(am.m, a.tasarim) + ')' : ''));
    });
    return parcalar.join(' + ');
  }

  // Sepetteki _tasarim_konum: x, y alan merkezine göre cm; a saat yönünde derece (0 = düz)
  function tasarimKonumu(model, parcalar, t) {
    var setKodlari = null;
    if (t) {
      setKodlari = {};
      saglamSetler(model, t).forEach(function (k, i) { setKodlari[k.id] = k.urunId + '#' + (i + 1); });
    }
    var alan = model.alanBul('letter') || model.alanlar[0];
    var ac = merkez(alan.sekil);
    var cok = model.alanlar.length > 1;
    return {
      v: 2,
      alan: alan.id,
      p: parcalar.map(function (p) {
        var c = merkez(p.sekil);
        var z = cok && !p.kenar ? model.noktaAlani(c[0], c[1]) : null;
        var k = {
          v: p.varyant ? p.varyant.id : null,
          t: p.tip.charAt(0),
          x: Math.round((c[0] - ac[0]) * 10) / 10,
          y: Math.round((c[1] - ac[1]) * 10) / 10,
          a: Math.round(p.aci || 0)
        };
        // Yazıdaki karakterler (harf ve rakam) yazı sırasıyla işaretlenir
        if (yazidaMi(p)) k.s = 1;
        // Çok alanlı üründe parçanın bulunduğu alan
        if (z) k.z = z.id;
        // Bozulmamış setin patch'i: set ürünü ve tasarımdaki set örneği ("ürün#sıra")
        if (p.setGrup && setKodlari && setKodlari[p.setGrup]) k.k = setKodlari[p.setGrup];
        // Aksesuar: sepet satırındaki iç tasarımla eşleşmesi için kimliği
        if (p.tip === 'aksesuar') k.u = p.uid;
        // Kenarda (çantaya takılmamış)
        if (p.kenar) k.e = 1;
        return k;
      })
    };
  }

  /* ---------- Hazır setler ---------- */

  // Bozulmamış set: t.hazirSetler kaydı duruyor ve setin tüm patch'leri tasarımda
  function saglamSetler(model, t) {
    return (t.hazirSetler || []).filter(function (k) {
      var tanim = model.hazirSetHarita[k.urunId];
      if (!tanim) return false;
      var adet = t.parcalar.filter(function (p) { return p.setGrup === k.id; }).length;
      return adet === tanim.patchler.length;
    });
  }

  // Bozulan ya da artık satılmayan setlerin kaydı silinir, patch'leri tek tek fiyatlanır
  function setleriTemizle(model, t) {
    var saglam = saglamSetler(model, t);
    var idler = saglam.map(function (k) { return k.id; });
    t.hazirSetler = saglam;
    t.parcalar.forEach(function (p) {
      if (p.setGrup && idler.indexOf(p.setGrup) === -1) delete p.setGrup;
    });
  }

  // Setin parçalarını çıkarmadan setten ayırır (set bozulur)
  function setiBoz(t, setGrup) {
    t.hazirSetler = (t.hazirSetler || []).filter(function (k) { return k.id !== setGrup; });
    t.parcalar.forEach(function (p) {
      if (p.setGrup === setGrup) delete p.setGrup;
    });
  }

  function bosMu(t) {
    return !t || (!t.isim && (!t.parcalar || !t.parcalar.length) && (!t.aksesuarlar || !t.aksesuarlar.length));
  }

  /* ------------------------------------------------------------------ */
  /* Önizleme çizimi                                                     */
  /* ------------------------------------------------------------------ */

  // Shopify patch görselleri 300 px genişlikte gelir (…&width=300). Ekranda çoğu 16–110 px gösterildiği için
  // srcset ile daha küçük boyutlar da sunulur; tarayıcı ekrandaki boyuta (× piksel oranı) yetecek en küçüğünü seçer.
  // En büyük seçenek yine 300 px'tir: hiçbir yerde bugünkünden düşük çözünürlük gösterilmez.
  var GORSEL_GENISLIKLERI = [100, 150, 220, 300];
  var GENISLIK_DESENI = /([?&])width=300(?=&|$)/;
  function gorselKaynak(url, cssPx) {
    if (!url || !cssPx || !GENISLIK_DESENI.test(url)) return 'src="' + kacis(url) + '"';
    var srcset = GORSEL_GENISLIKLERI.map(function (w) { return url.replace(GENISLIK_DESENI, '$1width=' + w) + ' ' + w + 'w'; }).join(', ');
    return 'src="' + kacis(url) + '" srcset="' + kacis(srcset) + '" sizes="' + Math.ceil(cssPx) + 'px"';
  }
  // Panel küçük resimleri (Görsel ve Aksesuar panelleri): kaynak yalnızca resim panelde ekrana gelince (ya da hemen
  // gelecekken) verilir (tembelIzle); boyut seçiminde ekran piksel oranı en fazla 2 sayılır (3x ekranda da 2x dosya:
  // 68 px kart için 220 yerine 150 px'lik görsel)
  function panelGorseli(url, cssPx) {
    if (!url) return '';
    var oran = Math.min(window.devicePixelRatio || 1, 2) / (window.devicePixelRatio || 1);
    if (!cssPx || !GENISLIK_DESENI.test(url)) return 'data-kp-src="' + kacis(url) + '"';
    var srcset = GORSEL_GENISLIKLERI.map(function (w) { return url.replace(GENISLIK_DESENI, '$1width=' + w) + ' ' + w + 'w'; }).join(', ');
    return 'data-kp-src="' + kacis(url) + '" data-kp-srcset="' + kacis(srcset) + '" sizes="' + Math.ceil(cssPx * oran) + 'px"';
  }
  function panelGorseliAc(img) {
    var set = img.getAttribute('data-kp-srcset');
    if (set) img.srcset = set;
    img.src = img.getAttribute('data-kp-src');
    img.removeAttribute('data-kp-srcset');
    img.removeAttribute('data-kp-src');
  }

  // Önizlemedeki patch'in ekrandaki genişliği (8 px'e yuvarlanır ki küçük oynamalar öğeyi değiştirmesin)
  function parcaGenisligi(sahneGen, oran) {
    return Math.max(8, Math.ceil((sahneGen * oran) / 8) * 8);
  }

  function Sahne(model, yer, kok, secenek) {
    this.m = model;
    this.yer = yer;
    this.kok = kok;
    this.etkilesimli = !!(secenek && secenek.etkilesimli);
    this.olustur();
    this.genislikIzle();
  }

  // Sahnenin ekrandaki genişliği (görsel boyutu seçimi için). Yalnızca büyür: küçülünce daha küçük dosya indirilmez.
  Sahne.prototype.genislikIzle = function () {
    var self = this;
    this.genislik = 0;
    if (!window.ResizeObserver || !this.sahne) return;
    new ResizeObserver(function (girdiler) {
      var w = girdiler[0] && girdiler[0].contentRect.width;
      if (!w || w <= self.genislik) return;
      self.genislik = w;
      // Var olan görsellerin sizes değeri yerinde güncellenir (öğeler yeniden kurulmaz)
      Array.prototype.forEach.call(self.katman.querySelectorAll('.kp-parca > img[sizes]'), function (img) {
        var oran = parseFloat(img.parentNode.style.width) / 100;
        if (oran > 0) img.setAttribute('sizes', parcaGenisligi(w, oran) + 'px');
      });
    }).observe(this.sahne);
  };

  Sahne.prototype.olustur = function () {
    var m = this.m;
    var g = m.gorsel;
    var alanSvg = m.alanlar
      .map(function (a) {
        var s = a.cizim || a.sekil;
        if (s.t === 'cokgen') return '<path class="kp-alan" data-alan="' + kacis(a.id) + '" d="' + cokgenYolu(s.p) + '" />';
        if (s.t === 'rect') {
          return '<rect class="kp-alan" data-alan="' + kacis(a.id) + '" x="' + s.x + '" y="' + s.y + '" width="' + s.w + '" height="' + s.h + '" rx="' + (s.r || 0.4) + '" />';
        }
        var rx = s.t === 'circle' ? s.r : s.rx;
        var ry = s.t === 'circle' ? s.r : s.ry;
        return '<ellipse class="kp-alan" data-alan="' + kacis(a.id) + '" cx="' + s.cx + '" cy="' + s.cy + '" rx="' + rx + '" ry="' + ry + '" />';
      })
      .join('');
    var yasakSvg = m.yasaklar
      .map(function (s) {
        if (s.t === 'cokgen') return '<path class="kp-yasak" d="' + cokgenYolu(s.p) + '" />';
        if (s.t === 'rect') return '<rect class="kp-yasak" x="' + s.x + '" y="' + s.y + '" width="' + s.w + '" height="' + s.h + '" />';
        var rx = s.t === 'circle' ? s.r : s.rx;
        var ry = s.t === 'circle' ? s.r : s.ry;
        return '<ellipse class="kp-yasak" cx="' + s.cx + '" cy="' + s.cy + '" rx="' + rx + '" ry="' + ry + '" />';
      })
      .join('');
    // Çok alanlı üründe her alanın sol üstünde küçük, yarı saydam adı ("Üst panel", "Alt cep")
    var cokAlan = m.alanlar.length > 1;
    var etiketHtml = cokAlan
      ? '<div class="kp-alan-etiketleri" aria-hidden="true">' + m.alanlar.map(function (a, i) {
        var k = kutu(a.sekil);
        return '<span class="kp-alan-etiket" data-alan-etiket="' + kacis(a.id) + '" style="left:' + (k.x / m.Wcm) * 100 + '%;top:' + (k.y / m.Hcm) * 100 + '%">' + kacis(a.ad || 'Alan ' + (i + 1)) + '</span>';
      }).join('') + '</div>'
      : '';
    var srcset = kacis(g.kucuk) + ' 750w, ' + kacis(g.buyuk) + ' 1200w' + (g.dev ? ', ' + kacis(g.dev) + ' 1800w' : '');
    var sahneHtml =
      '<div class="kp-sahne' + (this.etkilesimli ? ' kp-sahne--etkilesimli' : '') + (this.etkilesimli && cokAlan ? ' kp-sahne--cok-alan' : '') + '" style="aspect-ratio:' + g.en + ' / ' + g.boy + '">' +
      // Kaynak, gösterilecek boyut belli olunca verilir (gorselKaynagi): önce tahmini, sonra gerçek boyutla iki ayrı
      // genişlik indirilmesin
      '<img class="kp-sahne__urun" data-src="' + kacis(g.kucuk) + '" data-srcset="' + srcset + '" alt="' + kacis(m.urun.baslik) + '" draggable="false" decoding="async">' +
      (this.etkilesimli
        ? '<svg class="kp-sahne__alanlar" viewBox="0 0 ' + m.Wcm + ' ' + m.Hcm + '" preserveAspectRatio="none" aria-hidden="true">' + yasakSvg + alanSvg + '</svg>' + etiketHtml
        : '') +
      '<div class="kp-sahne__parcalar"></div>' +
      (this.etkilesimli
        ? '<div class="kp-sahne__secim" aria-hidden="true"><div class="kp-cerceve" hidden>' +
          '<span class="kp-cerceve__cizgi"></span>' +
          '<span class="kp-cerceve__tutamac" data-kp-tutamac title="Döndürmek için sürükle">' +
          '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</span>' +
          // Yazı seçiliyken tutamacın sağında Ayır / Birleştir (çerçeveyle döner, yazısı hep düz)
          '<button type="button" class="kp-cerceve__harf" data-kp-cerceve-harf hidden></button>' +
          '</div></div>'
        : '') +
      '</div>';
    // Editörde sahne bir görünüm penceresi içinde durur; yakınlaştırma sahnenin
    // genişliği ve konumuyla yapılır (transform yok), böylece tüm hesaplar aynı kalır.
    this.kok.innerHTML = this.etkilesimli
      ? '<div class="kp-gorunum' + (m.tekPatch ? ' kp-gorunum--tek' : '') + '" style="aspect-ratio:' + g.en + ' / ' + g.boy + '">' + sahneHtml + '</div>'
      : sahneHtml;
    this.gorunum = this.kok.querySelector('.kp-gorunum');
    this.boyutGozlemci = null;
    this.boyutIzle();
    this.sahne = this.kok.querySelector('.kp-sahne');
    // Ürün görseli gelene kadar pencerede hafif yükleniyor görünümü
    var urunImg = this.sahne.querySelector('.kp-sahne__urun');
    // Ölçülecek pencere yoksa (küçük önizlemeler) kaynak hemen, varsa ilk yerleşimde gerçek boyutla verilir
    if (urunImg && !this.gorunum) gorselKaynagi(urunImg, '(min-width: 990px) 600px, 100vw');
    if (this.gorunum && urunImg && !(urunImg.complete && urunImg.naturalWidth)) {
      var gor = this.gorunum;
      gor.classList.add('kp-gorunum--yukleniyor');
      var bitti = function () { gor.classList.remove('kp-gorunum--yukleniyor'); };
      urunImg.addEventListener('load', bitti, { once: true });
      urunImg.addEventListener('error', bitti, { once: true });
    }
    this.katman = this.kok.querySelector('.kp-sahne__parcalar');
    this.secimEl = this.kok.querySelector('.kp-cerceve');
  };

  // Yakın görünüm ölçeği ve kaydırması (pencerenin yüzdesi olarak): takılabilir alan(lar) ~%80.
  // alt: pencerenin altında örtülü kısım (0–1, kenar şeridi); alan kalan bölgeye ortalanır.
  // Görselle aynı oranlı kutular (kart ve sepet önizlemesi): bütün alanlar kutunun ~%80'ini kaplar
  function yakinGorunumOran(m, alt) {
    alt = alt || 0;
    var olcek = 1;
    var sol = 0;
    var ust = 0;
    if (m.alanlar.length) {
      var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      m.alanlar.forEach(function (a) {
        var k = kutu(a.sekil);
        x1 = Math.min(x1, k.x);
        y1 = Math.min(y1, k.y);
        x2 = Math.max(x2, k.x + k.w);
        y2 = Math.max(y2, k.y + k.h);
      });
      var oranX = (x2 - x1) / m.Wcm;
      var oranY = (y2 - y1) / m.Hcm;
      olcek = Math.max(1, Math.min(0.8 / oranX, (0.8 * (1 - alt)) / oranY));
      var cx = (x1 + x2) / 2 / m.Wcm;
      var cy = (y1 + y2) / 2 / m.Hcm;
      // Alan merkezi pencerenin (örtülü alt kısım hariç) ortasına; görselin dışına taşmayacak şekilde sınırla
      sol = Math.min(0, Math.max(100 - olcek * 100, 50 - cx * olcek * 100));
      ust = Math.min(0, Math.max(100 - olcek * 100, 50 * (1 - alt) - cy * olcek * 100));
    }
    return { olcek: olcek, sol: sol, ust: ust };
  }

  // Yakın görünümde alanın kutusu (cm). Tek patch'lik üründe sığma dairesi (16 cm) çantadan büyük olduğundan ona göre
  // yakınlaşılmaz: Velcro'nun ortasında TEK_PATCH_YAKIN kenarlı kare
  function yakinKutu(m, a) {
    if (!m.tekPatch || !a.cizim) return kutu(a.sekil);
    var c = merkez(a.cizim);
    var k = kutu(a.cizim);
    var y = Math.max(TEK_PATCH_YAKIN, k.w, k.h) / 2;
    return { x: c[0] - y, y: c[1] - y, w: y * 2, h: y * 2 };
  }

  // Görünüm penceresi (W × H px) içinde sahnenin (ürün görseli, oranı r = en / boy) yeri.
  // Pencerenin oranı görselden farklı olabilir (mobilde önizleme ekran yüksekliğiyle sınırlı): tüm ürün pencereye sığar ve
  // ortalanır; yakın görünümde takılabilir alan pencerenin ~%80'ini kaplar. Birden çok alan varsa en büyüğüne yakınlaşılır
  // (yazı otomatik olarak önce oraya yerleşir; diğerleri "Tüm ürünü gör" ile görünür).
  // Dönüş: sahnenin genişliği (pencere genişliğinin oranı), sol ve üst (pencere genişliği / yüksekliğine göre %).
  function yakinGorunum(m, alt, W, H, yakin) {
    alt = alt || 0;
    var r = m.gorsel.en / m.gorsel.boy;
    var S0 = Math.min(W, H * r); // tüm ürün pencereye sığar
    var S = S0;
    var cx = 0.5;
    var cy = 0.5;
    if (yakin && m.alanlar.length) {
      var alanlar = m.alanlar.slice();
      if (alanlar.length > 1) {
        alanlar.sort(function (p, q) { var a = kutu(p.sekil), b = kutu(q.sekil); return b.w * b.h - a.w * a.h; });
        alanlar = alanlar.slice(0, 1);
      }
      var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      alanlar.forEach(function (a) {
        var k = yakinKutu(m, a);
        x1 = Math.min(x1, k.x);
        y1 = Math.min(y1, k.y);
        x2 = Math.max(x2, k.x + k.w);
        y2 = Math.max(y2, k.y + k.h);
      });
      var dx = (x2 - x1) / m.Wcm;
      var dy = (y2 - y1) / m.Hcm;
      S = Math.max(S0, Math.min((0.8 * W) / dx, (0.8 * H * (1 - alt) * r) / dy));
      cx = (x1 + x2) / 2 / m.Wcm;
      cy = (y1 + y2) / 2 / m.Hcm;
    }
    var Hs = S / r;
    // Alan merkezi pencerenin (örtülü alt kısım hariç) ortasına; görsel pencereden büyükse kenar boşluk bırakmaz,
    // küçükse ortalanır
    var sol = S > W ? Math.min(0, Math.max(W - S, W / 2 - cx * S)) : (W - S) / 2;
    var ust = Hs > H ? Math.min(0, Math.max(H - Hs, (H * (1 - alt)) / 2 - cy * Hs)) : (H - Hs) / 2;
    return { olcek: S / S0, genislik: (S / W) * 100, sol: (sol / W) * 100, ust: (ust / H) * 100 };
  }

  Sahne.prototype.gorunumAyarla = function (yakin) {
    if (!this.gorunum) return;
    var g = this.gorunum.getBoundingClientRect();
    this.istenenYakin = !!yakin;
    if (!g.width || !g.height) {
      // Pencere henüz yerleşmedi (editör gizli): boyut gelince ResizeObserver yeniden hesaplar
      this.yakin = !!yakin;
      return;
    }
    var alt = this.altBosluk ? Math.min(0.4, this.altBosluk / g.height) : 0;
    var y = yakinGorunum(this.m, alt, g.width, g.height, yakin);
    this.yakin = !!yakin && y.olcek > 1.01;
    if (yakin) this.yakinlasabilir = y.olcek > 1.01;
    this.sahne.style.width = y.genislik + '%';
    this.sahne.style.left = y.sol + '%';
    this.sahne.style.top = y.ust + '%';
    this.boyut = g.width + 'x' + g.height;
    var img = this.sahne.querySelector('.kp-sahne__urun');
    if (img) gorselKaynagi(img, Math.ceil((g.width * y.genislik) / 100) + 'px');
  };

  // Sahnedeki ürün görseline boyut (sizes) ve ilk seferde kaynağını verir
  function gorselKaynagi(img, sizes) {
    img.sizes = sizes;
    var set = img.getAttribute('data-srcset');
    if (!set) return;
    img.srcset = set;
    img.src = img.getAttribute('data-src');
    img.removeAttribute('data-srcset');
    img.removeAttribute('data-src');
  }

  // Pencerenin boyutu değişince (küçülen önizleme, klavye, ekran döndürme) yer yeniden hesaplanır: pencere oranı
  // görselden farklı olabildiği için yüzdeler boyuta bağlıdır
  Sahne.prototype.boyutIzle = function () {
    if (!this.gorunum || !window.ResizeObserver || this.boyutGozlemci) return;
    var self = this;
    var bekliyor = false;
    this.boyutGozlemci = new ResizeObserver(function () {
      if (bekliyor) return;
      bekliyor = true;
      requestAnimationFrame(function () {
        bekliyor = false;
        var g = self.gorunum.getBoundingClientRect();
        if (!g.width || !g.height || g.width + 'x' + g.height === self.boyut) return;
        self.gorunumAyarla(self.istenenYakin);
      });
    });
    this.boyutGozlemci.observe(this.gorunum);
  };

  // Parça, döndürülmemiş ölçüsüyle merkezine yerleşir; açı CSS ile verilir
  function parcaStili(m, p) {
    var c = merkez(p.sekil);
    var en = p.en;
    var boy = p.boy;
    if (p.sekil.t === 'circle') en = boy = p.sekil.r * 2;
    if (!en || !boy) {
      var k = kutu(p.sekil);
      en = k.w;
      boy = k.h;
    }
    return {
      left: ((c[0] - en / 2) / m.Wcm) * 100 + '%',
      top: ((c[1] - boy / 2) / m.Hcm) * 100 + '%',
      width: (en / m.Wcm) * 100 + '%',
      height: (boy / m.Hcm) * 100 + '%',
      transform: p.aci ? 'rotate(' + p.aci + 'deg)' : ''
    };
  }

  // Aksesuar parçasının içi: görsel, dış ölçü kutusu parçanın kutusuna oturacak şekilde (kanca, fermuar ipi taşabilir);
  // üzerindeki patch'ler aksesuarın kendi ölçeğinde görselin içinde, aksesuarla birlikte döner
  function aksesuarIcHtml(m, p) {
    var aks = p.tanim;
    var d = aks.dis;
    var stil = 'left:' + (-d.x / d.w) * 100 + '%;top:' + (-d.y / d.h) * 100 + '%;width:' + 10000 / d.w + '%;height:' + 10000 / d.h + '%';
    var icler = '';
    var am = p.icTasarim && m.aksesuarModeli && m.aksesuarModeli(aks.id);
    if (am) {
      icler = am.yer.parcalar(p.icTasarim).filter(function (ip) { return !ip.kenar; }).map(function (ip) {
        var st = parcaStili(am.m, ip);
        var g = ip.varyant && ip.varyant.gorsel;
        return '<div class="kp-aks__parca' + (ip.sekil.t === 'circle' ? ' kp-parca--daire' : '') + '" style="left:' + st.left + ';top:' + st.top + ';width:' + st.width + ';height:' + st.height + (st.transform ? ';transform:' + st.transform : '') + '">' +
          (g ? '<img src="' + kacis(g) + '" alt="" draggable="false" decoding="async">' : '<span>' + kacis(ip.etiket) + '</span>') + '</div>';
      }).join('');
    }
    return '<div class="kp-aks__gorsel" style="' + stil + '"><img src="' + kacis(aks.gorsel.kucuk) + '" alt="" draggable="false" decoding="async">' + icler + '</div>';
  }

  Sahne.prototype.ciz = function (parcalar, hatalar, alanHatali) {
    var m = this.m;
    if (!this.genislik) this.genislik = (this.sahne && this.sahne.getBoundingClientRect().width) || Math.min(window.innerWidth || 0, 800);
    var sahneGen = this.genislik;
    var html = parcalar
      .filter(function (p) { return !p.kenar; })
      .map(function (p) {
        var st = parcaStili(m, p);
        var stil = 'left:' + st.left + ';top:' + st.top + ';width:' + st.width + ';height:' + st.height + (st.transform ? ';transform:' + st.transform : '');
        var gorsel = p.varyant && p.varyant.gorsel;
        var sinif = 'kp-parca kp-parca--' + p.tip + (p.sekil.t === 'circle' ? ' kp-parca--daire' : '') + (hatalar && hatalar[p.uid] ? ' kp-parca--hatali' : '') + (p.varyant && !p.varyant.png ? ' kp-parca--jpg' : '') + (!p.varyant ? ' kp-parca--eksik' : '');
        var ic = p.tip === 'aksesuar'
          ? aksesuarIcHtml(m, p)
          : gorsel
            ? '<img ' + gorselKaynak(gorsel, sahneGen && parcaGenisligi(sahneGen, (parseFloat(st.width) || 0) / 100)) + ' alt="" draggable="false" decoding="async">'
            : '<span>' + kacis(p.etiket) + '</span>';
        return '<div class="' + sinif + '" style="' + stil + '" data-uid="' + kacis(p.uid) + '" data-grup="' + kacis(p.grup) + '" aria-hidden="true">' + ic + '</div>';
      })
      .join('');
    icerikEsitle(this.katman, html, 'data-uid');
    if (!this.etkilesimli) return;
    this.cizilenler = parcalar;
    this.yasaklariIsaretle(parcalar);
    if (m.alanlar.length > 1) {
      // Çok alanlı: yalnızca hatalı parçanın bulunduğu alan kırmızı
      var kirmizi = {};
      if (alanHatali) {
        parcalar.forEach(function (p) {
          if (p.kenar || !(hatalar && hatalar[p.uid])) return;
          var c = merkez(p.sekil);
          var a = m.noktaAlani(c[0], c[1]);
          if (a) kirmizi[a.id] = true;
        });
      }
      this.alanlariIsaretle(kirmizi, null);
    } else {
      this.sahne.classList.toggle('kp-sahne--hata', !!alanHatali);
    }
  };

  // Yasaklı bölgeler (fermuar vb.) normalde görünmez; sürüklerken soluk görünür (CSS), bir patch değince kırmızı
  Sahne.prototype.yasaklariIsaretle = function (parcalar) {
    var m = this.m;
    if (!this.sahne || !m.yasaklar.length) return;
    var els = this.sahne.querySelectorAll('.kp-yasak');
    m.yasaklar.forEach(function (y, i) {
      var degdi = parcalar.some(function (p) { return !p.kenar && p.sekil && cakisir(p.sekil, y, 0); });
      if (els[i]) els[i].classList.toggle('kp-yasak--degdi', degdi);
    });
  };

  // Çok alanlı üründe alanların durumu: kirmizi (alan kimlikleri → true), aktif (sürüklenen parçanın alanı)
  Sahne.prototype.alanlariIsaretle = function (kirmizi, aktif) {
    if (!this.sahne) return;
    this.sahne.querySelectorAll('[data-alan]').forEach(function (el) {
      var id = el.getAttribute('data-alan');
      el.classList.toggle('kp-alan--hata', !!kirmizi[id]);
      el.classList.toggle('kp-alan--aktif', id === aktif);
    });
    this.sahne.querySelectorAll('[data-alan-etiket]').forEach(function (el) {
      var id = el.getAttribute('data-alan-etiket');
      el.classList.toggle('kp-alan-etiket--hata', !!kirmizi[id]);
      el.classList.toggle('kp-alan-etiket--aktif', id === aktif);
    });
  };

  // Sürükleme sırasında yalnızca konumları günceller
  Sahne.prototype.konumla = function (parcalar, hatalar) {
    var m = this.m;
    var self = this;
    parcalar.forEach(function (p) {
      var el = self.katman.querySelector('[data-uid="' + p.uid + '"]');
      if (!el) return;
      var st = parcaStili(m, p);
      el.style.left = st.left;
      el.style.top = st.top;
      el.style.transform = st.transform;
      el.classList.toggle('kp-parca--hatali', !!(hatalar && hatalar[p.uid]));
    });
  };

  // Seçim çerçevesi ve döndürme tutamacı (c: grupCercevesi sonucu, null: gizle)
  Sahne.prototype.secimCiz = function (c, hatali) {
    var el = this.secimEl;
    if (!el) return;
    if (!c) {
      el.hidden = true;
      return;
    }
    var m = this.m;
    var w = c.x2 - c.x1;
    var h = c.y2 - c.y1;
    el.hidden = false;
    el.style.left = ((c.pivot[0] + c.x1) / m.Wcm) * 100 + '%';
    el.style.top = ((c.pivot[1] + c.y1) / m.Hcm) * 100 + '%';
    el.style.width = (w / m.Wcm) * 100 + '%';
    el.style.height = (h / m.Hcm) * 100 + '%';
    el.style.transformOrigin = (-c.x1 / w) * 100 + '% ' + (-c.y1 / h) * 100 + '%';
    el.style.transform = 'rotate(' + c.aci + 'deg)';
    el.style.setProperty('--kp-ters-aci', -c.aci + 'deg');
    el.classList.toggle('kp-cerceve--hatali', !!hatali);
    this.cerceveSigdir();
  };

  // Tutamaç (ve Ayır / Birleştir) önizlemenin dışına taşıyorsa çerçevenin altına; buton sağdan taşıyorsa tutamacın soluna
  Sahne.prototype.cerceveSigdir = function () {
    var el = this.secimEl;
    if (!el || el.hidden || !this.gorunum) return;
    var g = this.gorunum.getBoundingClientRect();
    if (!g.width) return;
    el.classList.remove('kp-cerceve--alt', 'kp-cerceve--sol');
    var dis = function (x) {
      var r = x.getBoundingClientRect();
      return r.top < g.top + 2 || r.bottom > g.bottom - 2 || r.left < g.left + 2 || r.right > g.right - 2;
    };
    var tutamac = el.querySelector('[data-kp-tutamac]');
    var harf = el.querySelector('[data-kp-cerceve-harf]');
    var dikey = function (x) { var r = x.getBoundingClientRect(); return r.top < g.top + 2 || r.bottom > g.bottom - 2; };
    if (dikey(tutamac) || (harf && !harf.hidden && dikey(harf))) el.classList.add('kp-cerceve--alt');
    if (harf && !harf.hidden && dis(harf)) el.classList.add('kp-cerceve--sol');
  };

  /* ------------------------------------------------------------------ */
  /* Editör                                                              */
  /* ------------------------------------------------------------------ */

  var ADIMLAR = [
    { id: 'yazi', ad: 'Yazı' },
    { id: 'ikon', ad: 'İkon' },
    { id: 'aksesuar', ad: 'Aksesuar' },
    { id: 'ozet', ad: 'Özet' }
  ];
  // Aksesuarın kendi tasarım ekranı: yalnızca Yazı ve İkon sekmeleri
  var ALT_ADIMLAR = [
    { id: 'yazi', ad: 'Yazı' },
    { id: 'ikon', ad: 'İkon' }
  ];

  // Küçük önizlemenin yüksekliği (px)
  var KUCUK_ONIZLEME = 140;

  // secenek.alt: aksesuar tasarım ekranı (çanta editörünün üstünde açılır; sonunda "Çantaya yerleştir")
  function Editor(kart, secenek) {
    this.kart = kart;
    this.m = kart.model;
    this.yer = kart.yer;
    this.secenek = secenek || {};
    this.alt = !!this.secenek.alt;
    var m = this.m;
    this.adimlar = this.alt ? ALT_ADIMLAR : ADIMLAR.filter(function (a) { return a.id !== 'aksesuar' || (m.aksesuarlar && m.aksesuarlar.length); });
    // Sweatshirt kombini: önce Sweatshirt adımı (renk ve yaş), aksesuar yok
    this.kombin = !this.alt && kart.kombin ? kart.kombin : null;
    if (this.kombin) this.adimlar = [KOMBIN_ADIM].concat(this.adimlar.filter(function (a) { return a.id !== 'aksesuar'; }));
    this.adim = 'yazi';
    // İkon adımında yol: 'kendim' (kategoriler ve ikonlar) ya da 'set' (hazır setler); varsayılan kendim
    this.ikonYolu = 'kendim';
    this.kategori = this.m.kategoriler.length ? this.m.kategoriler[0].ad : null;
    this.isimOlayGonderildi = false;
  }

  // Kampanya satırları hep aynı sırada: önce adet (patch) indirimleri, sonra yüzde (tutar eşikli) indirim
  function kampanyaSirala(adlar) {
    var yuzdeli = function (ad) { return /%\s*\d/.test(ad) ? 1 : 0; };
    return adlar.slice().sort(function (a, b) { return yuzdeli(a) - yuzdeli(b); });
  }

  function masaustuMu() {
    return !!(window.matchMedia && window.matchMedia('(min-width: 1024px)').matches);
  }

  // Araç butonları: Metin "Aa", Görsel kalp çizgisi, Aksesuar sade çanta (yuvarlak köşeli gövde + kulp), aynı çizgi kalınlığı
  var ARAC_BILGI = {
    yazi: { ad: 'Metin', etiket: 'Metin ekle', simge: '<span class="kp-arac-dugme__aa">Aa</span>' },
    ikon: { ad: 'Görsel', etiket: 'Görsel ekle', simge: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' },
    aksesuar: { ad: 'Aksesuar', etiket: 'Aksesuar ekle', simge: '<svg viewBox="0 0 24 24" width="24" height="24"><rect x="4" y="8.5" width="16" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' }
  };

  Editor.prototype.kur = function () {
    if (this.el) return;
    var el = document.createElement('div');
    el.className = 'kp-editor' + (this.alt ? ' kp-editor--alt' : '');
    var aks = this.secenek.aksesuar;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'kp-editor-baslik');
    el.hidden = true;
    el.innerHTML =
      // Aksesuar ekranında üst satır: geri oku ve "[Aksesuar] tasarla"; Yazı / İkon düğmeleri altında.
      // Çanta editöründe adım göstergesi yok: Tasarım ekranında üst satır hiç yok (X önizlemenin sağ üstünde),
      // Özet'te ince satır: solda "‹ Tasarıma dön", ortada "Özet"
      (this.alt
        ? '<div class="kp-ust">' +
          '<button type="button" class="kp-geri" data-kp-kapat aria-label="Çanta tasarımına dön"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
          '<div class="kp-ust__metin"><h2 id="kp-editor-baslik" class="kp-ust__baslik" data-kp-baslik>' + kacis(aks.ad) + ' tasarla</h2>' +
          (this.secenek.buyuk ? '<p class="kp-yol">Velcro alanın neredeyse tamamını kaplar</p>' : '') + '</div>' +
          '</div>'
        : '<h2 id="kp-editor-baslik" class="kp-gizli" data-kp-baslik>Tasarımını oluştur</h2>' +
          '<div class="kp-ust kp-ust--ozet" data-kp-ozet-ust hidden>' +
          '<button type="button" class="kp-ozet-geri" data-kp-adim="tasarim"><span aria-hidden="true">‹</span> Tasarıma dön</button>' +
          '<p class="kp-ust__orta" aria-hidden="true">Özet</p>' +
          '<button type="button" class="kp-ust__kapat" data-kp-kapat-ozet aria-label="Kapat"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>' +
          '</div>') +
      (this.alt
        ? '<nav class="kp-adimlar kp-adimlar--alt" aria-label="Tasarım"><div class="kp-sekmeler">' +
          this.adimlar.map(function (a) { return '<button type="button" class="kp-sekme" data-kp-adim="' + a.id + '">' + a.ad + '</button>'; }).join('') +
          '</div></nav>'
        : '') +
      '<div class="kp-govde">' +
      // Önizleme sabit kalır; yalnızca alttaki panel kayar
      '<div class="kp-onizleme">' +
      // Araçlar önizlemenin solunda alt alta (Metin / Görsel / Aksesuar); önizleme sağda kalan alanı kaplar
      '<div class="kp-onizleme__sira">' +
      (this.alt ? '' :
        '<div class="kp-araclar" data-kp-araclar role="group" aria-label="Araçlar">' +
        this.adimlar.filter(function (a) { return a.id !== 'ozet'; }).map(function (a) {
          return '<button type="button" class="kp-arac-dugme" data-kp-adim="' + a.id + '" aria-pressed="false" aria-label="' + ARAC_BILGI[a.id].etiket + '">' +
            '<span class="kp-arac-dugme__simge" aria-hidden="true">' + ARAC_BILGI[a.id].simge + '</span><span class="kp-arac-dugme__ad" aria-hidden="true">' + ARAC_BILGI[a.id].ad + '</span>' +
            '<span class="kp-arac-dugme__rozet" data-kp-rozet="' + a.id + '" hidden></span></button>';
        }).join('') +
        '</div>') +
      '<div class="kp-onizleme__ic" style="--kp-oran:' + (this.m.gorsel.en / this.m.gorsel.boy) + '">' +
      '<div data-kp-sahne></div>' +
      (this.alt ? '' :
        '<button type="button" class="kp-kapat kp-kapat--onizleme" data-kp-kapat aria-label="Kapat">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' +
        '</button>') +
      '<div class="kp-gecmis" role="group" aria-label="Geçmiş">' +
      // Geri al: sola dönen kıvrık ok; Yinele: sağa dönen kıvrık ok (mobil ve masaüstünde aynı)
      '<button type="button" class="kp-gecmis__dugme" data-kp-geri-al aria-label="Geri al" title="Geri al" disabled><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 14L4 9l5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button type="button" class="kp-gecmis__dugme" data-kp-yinele aria-label="Yinele" title="Yinele" disabled><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 14l5-5-5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</div>' +
      '<button type="button" class="kp-onizleme__dugme kp-onizleme__dugme--gorunum" data-kp-gorunum aria-pressed="false">Tüm ürünü gör</button>' +
      // Masaüstünde (CSS): önizlemeyi alan çizgileri ve adları olmadan PNG olarak indir
      (this.alt ? '' :
        '<button type="button" class="kp-onizleme__dugme kp-onizleme__dugme--indir" data-kp-indir title="Önizlemeyi indir (alan çizgileri olmadan)">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<span>İndir</span></button>') +
      '<span class="kp-aci" data-kp-aci aria-hidden="true" hidden></span>' +
      '<div class="kp-balon" data-kp-balon role="group" hidden></div>' +
      // Önizlemenin alt kısmında havada: uyarı kutusu
      '<div class="kp-yuzen">' +
      '<div class="kp-bildirim" data-kp-bildirim role="status" aria-live="polite" hidden></div>' +
      '<div class="kp-onay" data-kp-onay role="alertdialog" aria-live="assertive" hidden></div>' +
      '</div>' +
      '<div class="kp-set-cerceve" data-kp-set-cerceve aria-hidden="true" hidden><span class="kp-set-cerceve__etiket"></span></div>' +
      // Küçük önizlemede sağ altta
      '<button type="button" class="kp-buyut" data-kp-buyut hidden>Büyüt</button>' +
      // Geçersiz konumdaki patch'lerin hemen altında (önizlemeden taşacaksa üstünde) "! Alana yerleştir"
      '<div class="kp-yerlestir-katman" data-kp-yerlestir-katman></div>' +
      '</div>' +
      '</div>' +
      // Önizlemenin hemen altında sabit satır: seçim yokken eklenenler, seçimde adı ve araçlar (aynı yükseklik)
      // Kombin: dahil patch göstergesi ve seçili Tshirt, önizlemenin hemen altında (panel kayınca da görünür)
      (this.kombin ? '<div class="kp-dahil" data-kp-dahil></div>' : '') +
      '<div class="kp-satir">' +
      '<div class="kp-etiketler" data-kp-etiketler aria-label="Eklenenler"></div>' +
      '<div class="kp-arac" data-kp-secim-cubuk role="toolbar" aria-label="Seçili patch" hidden>' +
      '<span class="kp-arac__ad" data-kp-secili-ad></span>' +
      '<span class="kp-arac__dugmeler">' +
      '<button type="button" data-kp-dondur="-15" aria-label="15 derece sola döndür"><span aria-hidden="true">↺</span> 15°</button>' +
      '<button type="button" data-kp-dondur="15" aria-label="15 derece sağa döndür"><span aria-hidden="true">↻</span> 15°</button>' +
      '<button type="button" data-kp-duzle hidden>Düzle</button>' +
      '<button type="button" data-kp-aks-tasarla hidden>Tasarla</button>' +
      '<button type="button" class="kp-arac__sil" data-kp-sil>Sil</button>' +
      '<button type="button" class="kp-arac__tamam" data-kp-secim-kaldir>Tamam</button>' +
      '</span>' +
      '</div>' +
      '</div>' +
      // Kenar: çantaya takılmamış patch'ler (fiyata dahil değil; Özet'te istenirse eklenir). Satırın altında ayrı satır,
      // boşken görünmez; sürüklerken bırakma alanı olarak vurgulanır. Aksesuar ekranında yok.
      (this.alt ? '' :
        '<div class="kp-kenar" data-kp-kenar hidden>' +
        '<span class="kp-kenar__baslik"><span aria-hidden="true">↧</span> Kenar · <span data-kp-kenar-sayi></span> · <span data-kp-kenar-fiyat>fiyata dahil değil</span></span>' +
        '<div class="kp-kenar__liste" data-kp-kenar-liste></div>' +
        '<span class="kp-kenar__birak" aria-hidden="true">Kenara bırak</span>' +
        '<button type="button" class="kp-kenar__sigdir" data-kp-sigdir-kenar>Sığdırmayı dene</button>' +
        '</div>') +
      (this.m.kalibre ? '' : '<p class="kp-onizleme__not">Önizleme ölçüleri henüz kalibre edilmedi.</p>') +
      '</div>' +
      '<div class="kp-sag">' +
      // Masaüstü: sağ sütunun en üstünde seçili aracın adı; sağında "Taslak olarak kaydet" ve kapatma (✕).
      // Masaüstünde kapatma yalnızca burada (önizlemenin köşesindeki ✕ gizli)
      (this.alt ? '' : '<div class="kp-sag__ust">' +
        '<h3 class="kp-sag__baslik" data-kp-arac-baslik aria-hidden="true"></h3>' +
        '<button type="button" class="kp-sag__taslak" data-kp-taslak-kaydet>Taslak olarak kaydet</button>' +
        '<button type="button" class="kp-sag__kapat" data-kp-kapat aria-label="Kapat"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>' +
        '</div>') +
      '<div class="kp-kaydir">' +
      // Önizlemenin altında, panelin en üstünde: geçersiz konum uyarısı ve kenar notu
      '<div class="kp-yer-uyari" data-kp-yer-uyari role="status" aria-live="polite" hidden></div>' +
      (this.alt ? '<p class="kp-alt-ipucu" data-kp-alt-ipucu hidden>Bir şey eklemezsen ' + kacis(aksesuarTuru(aks).toLocaleLowerCase('tr-TR')) + ' düz eklenir. Yazı ya da ikon eklersen buton “Tasarımımla ekle” olur.</p>' : '') +
      '<div class="kp-kenar-not" data-kp-kenar-not hidden></div>' +
      '<div class="kp-paneller">' +
      this.adimlar.map(function (a, i) {
        return '<section class="kp-panel" data-kp-panel="' + a.id + '" aria-labelledby="kp-p-' + a.id + '"' + (i ? ' hidden' : '') + '></section>';
      }).join('') +
      '</div>' +
      '</div>' +
      // Masaüstü: Kampanyalar kartı (alt çubuğun hemen üstünde, sürekli görünür) ve hemen üstünde ince kazanma bildirimi
      '<div class="kp-kazanc kp-kazanc--masa" data-kp-kazanc-masa role="status" aria-live="polite" hidden></div>' +
      '<section class="kp-kkart" data-kp-kkart aria-label="Kampanyalar" hidden>' +
      '<div class="kp-kkart__ust"><h3 class="kp-kkart__baslik">Kampanyalar</h3><strong class="kp-kkart__kazanc" data-kp-kkart-kazanc></strong></div>' +
      '<div class="kp-kkart__yol"><div class="kp-kkart__iz"><span class="kp-kkart__dolu" data-kp-kkart-dolu></span></div>' +
      '<ol class="kp-kkart__duraklar" data-kp-kkart-duraklar></ol></div>' +
      '<ul class="kp-kkart__liste" data-kp-kkart-liste></ul>' +
      '<p class="kp-kkart__hedef" data-kp-kkart-hedef></p>' +
      '</section>' +
      // Tek satırlık alt çubuk: en üstte 3 px ilerleme çizgisi; solda fiyat (dokununca kampanya paneli), sağda ana buton.
      // Kazanma bildirimi ve kampanya önerisi çubuğun hemen üstünde birkaç saniyeliğine belirir.
      // Aksesuar ekranında: solda Vazgeç, ortada toplam, sağda ana buton
      '<div class="kp-alt' + (this.alt ? ' kp-alt--aks' : '') + '">' +
      '<div class="kp-kazanc" data-kp-kazanc role="status" aria-live="polite" hidden></div>' +
      '<div class="kp-serit" data-kp-serit hidden>' +
      '<div class="kp-serit__cubuk" data-kp-serit-cubuk><span class="kp-serit__dolu" data-kp-serit-dolu></span></div>' +
      '</div>' +
      (this.alt ? '<button type="button" class="btn kp-alt__vazgec" data-kp-vazgec>Vazgeç</button>' : '') +
      '<button type="button" class="kp-alt__fiyat" data-kp-fiyat-ac aria-haspopup="dialog"><span>Toplam</span><strong data-kp-toplam></strong>' +
      '<small class="kp-indirim-notu">İndirimler sepette uygulanır</small></button>' +
      (this.alt
        ? '<button type="button" class="btn btn-primary kp-alt__ileri kp-alt__ileri--marka" data-kp-ileri>Düz ekle</button>'
        : '<button type="button" class="btn btn-primary kp-alt__ileri" data-kp-ileri>Tasarımı tamamla →</button>') +
      // Özet'te geçersiz konumda patch varsa butonun yerinde uyarı: "Hepsini düzelt" / "Tasarıma dön"
      (this.alt ? '' : '<div class="kp-alt__engel" data-kp-alt-engel hidden></div>') +
      // Özet'te: butonun altında not ve küçük bağlantı
      '<div class="kp-alt__ozet" data-kp-alt-ozet hidden>' +
      '<p class="kp-indirim-notu">İndirimler sepette uygulanır</p>' +
      '<div class="kp-alt__baglantilar">' +
      '<button type="button" class="kp-baglanti" data-kp-taslak-kaydet>Taslak olarak kaydet ve çık</button>' +
      '</div></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      // X: tasarımda bir şey varken "Tasarımın kaydedilsin mi?" paneli
      (this.alt ? '' :
        '<div class="kp-kpanel kp-taslak" data-kp-taslak hidden>' +
        '<div class="kp-kpanel__perde" data-kp-taslak-devam></div>' +
        '<div class="kp-kpanel__kutu kp-taslak__kutu" role="dialog" aria-modal="true" aria-labelledby="kp-taslak-baslik">' +
        '<h3 class="kp-kpanel__baslik" id="kp-taslak-baslik">Tasarımın kaydedilsin mi?</h3>' +
        '<p class="kp-taslak__aciklama">Taslak olarak saklarız, bu ürünün sayfasına döndüğünde kaldığın yerden devam edersin.</p>' +
        '<button type="button" class="btn btn-primary kp-taslak__ana" data-kp-taslak-kaydet>Taslak olarak kaydet ve çık</button>' +
        '<button type="button" class="btn kp-taslak__ikincil" data-kp-taslak-devam>Tasarıma devam et</button>' +
        '<button type="button" class="kp-taslak__sil" data-kp-taslak-sil>Kaydetmeden çık</button>' +
        '</div></div>' +
        // Özet: "Tasarımı büyük gör" (yalnızca görüntüleme)
        '<div class="kp-buyuk" data-kp-buyuk role="dialog" aria-modal="true" aria-label="Tasarımın büyük önizlemesi" hidden>' +
        '<button type="button" class="kp-kapat kp-kapat--onizleme kp-buyuk__kapat" data-kp-buyuk-kapat aria-label="Kapat"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>' +
        '<div class="kp-buyuk__ic" data-kp-buyuk-sahne style="--kp-oran:' + (this.m.gorsel.en / this.m.gorsel.boy) + '"></div>' +
        '</div>') +
      // Kampanya paneli: fiyata dokununca alttan açılır; dışına dokununca kapanır
      '<div class="kp-kpanel" data-kp-kpanel hidden>' +
      '<div class="kp-kpanel__perde" data-kp-kpanel-kapat></div>' +
      '<div class="kp-kpanel__kutu" role="dialog" aria-modal="true" aria-label="Kampanyalar">' +
      '<div class="kp-kpanel__ust"><h3 class="kp-kpanel__baslik">Kampanyalar</h3>' +
      '<button type="button" class="kp-kpanel__kapat" data-kp-kpanel-kapat aria-label="Kapat"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>' +
      '<p class="kp-kpanel__ozet" data-kp-serit-sol></p>' +
      '<ul class="kp-kpanel__liste" data-kp-kpanel-liste></ul>' +
      '<p class="kp-kpanel__hedef" data-kp-serit-sag></p>' +
      '<div class="kp-kpanel__cubuk"><div class="kp-kpanel__iz"><span class="kp-kpanel__dolu" data-kp-kpanel-dolu></span></div>' +
      '<ol class="kp-kpanel__duraklar" data-kp-kpanel-duraklar></ol></div>' +
      '</div>' +
      '</div>';
    document.body.appendChild(el);
    this.el = el;
    this.sahne = new Sahne(this.m, this.yer, el.querySelector('[data-kp-sahne]'), { etkilesimli: true });
    this.panelYaziKur();
    this.panelIkonKur();
    if (this.kombin) this.kombinNotlariKur();
    if (this.el.querySelector('[data-kp-panel="aksesuar"]')) this.panelAksesuarKur();
    // Alt editör: kimlikler ana editörünkilerle çakışmasın
    if (this.alt) kimlikleriAyir(el, 'kpa');
    this.olaylariBagla();
  };

  function kimlikleriAyir(kok, on) {
    kok.querySelectorAll('[id^="kp-"]').forEach(function (x) { x.id = on + x.id.slice(2); });
    ['for', 'aria-labelledby', 'aria-describedby'].forEach(function (oz) {
      kok.querySelectorAll('[' + oz + ']').forEach(function (x) {
        x.setAttribute(oz, x.getAttribute(oz).split(' ').map(function (d) { return d.indexOf('kp-') === 0 ? on + d.slice(2) : d; }).join(' '));
      });
    });
  }

  // secenek.tasarim + secenek.grup: sepetteki bir tasarımı düzenleme modu (Özet'te "Sepeti güncelle")
  Editor.prototype.ac = function (adim, secenek) {
    this.kur();
    // Görsel panelinin ilk ekranı, editör açıldıktan biraz sonra boşta önceden indirilir
    if (!this.alt && !this.onIsitma) {
      var oi = this;
      this.onIsitma = setTimeout(function () {
        (window.requestIdleCallback || setTimeout)(function () { oi.gorselOnIsit(); }, { timeout: 2000 });
      }, 2000);
    }
    this.duzenlenen = (secenek && secenek.grup) || null;
    if (!this.alt) this.el.querySelector('[data-kp-baslik]').textContent = this.duzenlenen ? 'Sepetteki tasarımı düzenle' : 'Tasarımını oluştur';
    this.t = kopyala((secenek && secenek.tasarim) || this.kart.tasarim || bosTasarim(this.m));
    if (this.kombin) this.kombinHazirla();
    var girdi = this.el.querySelector('[data-kp-isim]');
    if (girdi) girdi.value = this.t.isim || '';
    this.seciliKarakter = null;
    this.yaziIpucu = '';
    this.geriYigin = [];
    this.ileriYigin = [];
    this.gecmisSimdi = null;
    this.ilk = JSON.stringify(this.t);
    this.donusOdagi = document.activeElement;
    if (!this.alt) {
      this.kaydirmaY = window.pageYOffset;
      document.documentElement.classList.add('kp-kilit');
      document.body.style.top = -this.kaydirmaY + 'px';
    }
    this.el.hidden = false;
    // Açılışta her zaman takılabilir alana yakın (kayıtlı görünüm tercihi açılışta kullanılmaz)
    this.sahne.gorunumAyarla(true);
    // Kombinde sweatshirt ve Tshirt seçilmeden tasarıma geçilmez: önce Kombinini seç; seçim tamamsa (taslakta son
    // açık ekran Kombinini seç olsa da) tasarım ekranı
    var kombinIlk = this.kombin && (this.kombinSecimEksikleri().length ? 'sweat' : adim === 'sweat' ? 'ikon' : null);
    this.adimaGit(kombinIlk || adim || 'yazi', true);
    this.yenile();
    var self = this;
    setTimeout(function () {
      var kapat = Array.prototype.filter.call(self.el.querySelectorAll('[data-kp-kapat]'), function (b) { return b.offsetParent; })[0];
      if (kapat) kapat.focus();
    }, 50);
    this.tamamlamaGonderildi = false;
    if (!this.alt) olayYayinla('kisisellestirme_acildi', { urun_id: this.m.urun.id, urun_adi: this.m.urun.baslik });
    // Sepetteki tasarımı düzenlemek kişiselleştirmeye başlamak sayılmaz
    if (!this.alt && !this.duzenlenen) kisisellestirmeOlcumu(this.m);
  };

  // X (ve Esc): tasarımda bir şey varken "Tasarımın kaydedilsin mi?"; boşken doğrudan kapatır.
  // Sepetteki tasarımı düzenlerken eski davranış (kaydedilmeyen değişiklik sorulur).
  Editor.prototype.kapatIstek = function () {
    if (this.alt) return this.altVazgec();
    if (this.duzenlenen) return this.kapat(false);
    if (bosMu(this.t)) return this.kapat(true);
    this.taslakPaneli(true);
  };

  Editor.prototype.taslakPaneli = function (ac) {
    var panel = this.el && this.el.querySelector('[data-kp-taslak]');
    if (!panel) return;
    this.taslakAcik = !!ac;
    panel.hidden = !ac;
    if (ac) {
      var b = panel.querySelector('.kp-taslak__ana');
      if (b) b.focus({ preventScroll: true });
    }
  };

  // "Taslak olarak kaydet" (masaüstü başlık satırı, Özet'teki bağlantı, X sorusu): tasarım taslak olarak saklanır,
  // editör kapanır; ürün kartında "Taslak · [zaman]" ve kısa bildirim. Boş tasarımda yalnızca kapatır.
  Editor.prototype.taslakKaydetCik = function () {
    var kaydedilir = !this.alt && !this.duzenlenen && !bosMu(this.t);
    this.taslakPaneli(false);
    this.kapat(true);
    if (kaydedilir && this.el.hidden) {
      taslakOlcumu(this.m);
      if (this.kart.bildirimGoster) this.kart.bildirimGoster('<span>Tasarımın taslak olarak kaydedildi.</span>');
    }
  };

  // "Kaydetmeden çık": tasarım silinir; ürün kartında birkaç saniye "Tasarım silindi · Geri al"
  Editor.prototype.kaydetmedenCik = function () {
    var yedek = kopyala(this.t);
    var bilgi = { arac: this.adim === 'ozet' ? this.sonArac || 'yazi' : this.adim, yakin: !!(this.sahne && this.sahne.yakin) };
    this.taslakPaneli(false);
    this.ilk = JSON.stringify(this.t);
    this.kapat(false);
    this.kart.taslakSil(yedek, bilgi);
  };

  // Özet: "Tasarımı büyük gör" (tam ekran, yalnızca görüntüleme; tüm ürün)
  Editor.prototype.buyukGor = function (ac) {
    var kat = this.el && this.el.querySelector('[data-kp-buyuk]');
    if (!kat) return;
    this.buyukAcik = !!ac;
    kat.hidden = !ac;
    if (!ac) return;
    var kok = kat.querySelector('[data-kp-buyuk-sahne]');
    if (!this.buyukSahne) {
      this.buyukSahne = new Sahne(this.m, this.yer, kok, { etkilesimli: false });
      this.buyukSahne.sahne.style.position = 'absolute';
      this.buyukSahne.sahne.style.left = '0';
      this.buyukSahne.sahne.style.top = '0';
      this.buyukSahne.sahne.style.width = '100%';
    }
    var tS = satinAlinacak(this.m, this.t);
    var d = duzenle(this.m, this.yer, tS);
    this.buyukSahne.ciz(d.parcalar.filter(function (p) { return !p.kenar; }), {}, false);
    var kapat = kat.querySelector('[data-kp-buyuk-kapat]');
    if (kapat) kapat.focus({ preventScroll: true });
  };

  Editor.prototype.kapat = function (kaydet) {
    if (!kaydet && JSON.stringify(this.t) !== this.ilk) {
      if (!window.confirm('Tasarımında yaptığın değişiklikler kaydedilmeyecek. Çıkmak istiyor musun?')) return;
    }
    // Sepetteki tasarımı düzenlerken kapatmak sepeti de kayıtlı tasarımı da değiştirmez
    // Taslak: tasarımın tamamı (kenar, aksesuar tasarımları), açık araç ve yakınlaştırma
    if (kaydet && !this.duzenlenen && !this.alt) this.kart.tasarimKaydet(this.t, { arac: this.adim === 'ozet' ? this.sonArac || 'yazi' : this.adim, yakin: !!(this.sahne && this.sahne.yakin) });
    this.duzenlenen = null;
    this.taslakPaneli(false);
    this.buyukGor(false);
    // Bekleyen bildirimler düşer
    this.bildirimSirasi = [];
    if (this.bildirimSimdiki) this.bildirimBitir(this.bildirimSimdiki, true);
    this.el.hidden = true;
    if (this.alt) {
      if (this.donusOdagi && this.donusOdagi.focus) this.donusOdagi.focus();
      return;
    }
    document.documentElement.classList.remove('kp-kilit', 'kp-acilis-arka');
    document.body.style.top = '';
    window.scrollTo(0, this.kaydirmaY || 0);
    if (this.donusOdagi && this.donusOdagi.focus) this.donusOdagi.focus();
    if (this.kombin) this.kart.kombinKartEsitle();
  };

  Editor.prototype.olaylariBagla = function () {
    var self = this;
    var el = this.el;
    el.addEventListener('click', function (e) {
      // Kampanya paneli: perdeye ya da ✕'e dokununca kapanır; fiyata dokununca açılır
      if (e.target.closest('[data-kp-kpanel-kapat]')) return self.kampanyaPaneli(false);
      if (e.target.closest('.kp-taslak .kp-kpanel__perde')) return self.taslakPaneli(false);
      var hedef = e.target.closest('button');
      if (!hedef || !el.contains(hedef)) return;
      if (self.kombin && self.kombinTikla(hedef)) return;
      if (hedef.hasAttribute('data-kp-fiyat-ac')) return self.kampanyaPaneli(true);
      if (hedef.hasAttribute('data-kp-kapat')) return self.alt ? self.altVazgec() : self.kapatIstek();
      if (hedef.hasAttribute('data-kp-vazgec')) return self.altVazgec();
      if (hedef.hasAttribute('data-kp-gorunum')) {
        self.sahne.gorunumAyarla(!self.sahne.yakin);
        // Yakınlaşma bitince tutamaç ve Ayır / Birleştir önizlemeye sığdırılır
        setTimeout(function () { self.sahne.cerceveSigdir(); self.yerlestirBalonCiz(); }, 330);
        return self.dugmeleriGuncelle();
      }
      if (hedef.hasAttribute('data-kp-indir')) return self.onizlemeIndir(hedef);
      if (hedef.hasAttribute('data-kp-harf-mod')) return self.harfModDegistir(true);
      if (hedef.hasAttribute('data-kp-cerceve-harf')) return self.harfModDegistir();
      // Seçili alana sığmayan yazı: "İki alana böl" (Otomatik) ya da diğer alana taşı
      if (hedef.hasAttribute('data-kp-iki-alana-bol')) return self.yaziYeriSec('oto');
      if (hedef.hasAttribute('data-kp-yazi-yeri')) return self.yaziYeriSec(hedef.getAttribute('data-kp-yazi-yeri'));
      if (hedef.hasAttribute('data-kp-alana-tasi')) return self.yaziYeriSec(hedef.getAttribute('data-kp-alana-tasi'));
      if (hedef.hasAttribute('data-kp-adim')) {
        var hedefAdim = hedef.getAttribute('data-kp-adim');
        // "‹ Tasarıma dön": son açık araca döner (varsayılan Metin)
        if (hedefAdim === 'tasarim') hedefAdim = self.sonArac || self.adimlar[0].id;
        return self.adimaGit(hedefAdim, false, true);
      }
      if (hedef.hasAttribute('data-kp-ileri')) return self.ileri();
      if (hedef.hasAttribute('data-kp-oneri-kabul')) return self.harfDegistir(hedef.getAttribute('data-harf'), hedef.getAttribute('data-oneri'));
      if (hedef.hasAttribute('data-kp-harf-sil')) return self.harfDegistir(hedef.getAttribute('data-harf'), '');
      if (hedef.hasAttribute('data-kp-bas-harf')) return self.isimAyarla(Array.from(self.t.isim)[0] || '');
      if (hedef.hasAttribute('data-kp-bas-harf-rakam')) {
        self.isimAyarla(Array.from(self.t.isim)[0] || '');
        self.yaziIpucu = 'Baş harfinin yanına bir rakam yaz, ör. ' + (Array.from(self.t.isim)[0] || 'E') + '7.';
        self.yenile();
        return self.el.querySelector('[data-kp-isim]').focus();
      }
      if (hedef.hasAttribute('data-kp-karakter')) return self.karakterSec(parseInt(hedef.getAttribute('data-kp-karakter'), 10));
      if (hedef.hasAttribute('data-kp-stil')) return self.karakterStiliSec(hedef.getAttribute('data-kp-stil'));
      if (hedef.hasAttribute('data-kp-hepsi')) return self.tumHarflerStil(hedef.getAttribute('data-kp-hepsi'));
      if (hedef.hasAttribute('data-kp-karisik')) return self.karisikSec();
      if (hedef.hasAttribute('data-kp-takma-ad')) {
        self.isimAyarla('');
        var girdi = self.el.querySelector('[data-kp-isim]');
        girdi.placeholder = 'Takma ad (en fazla ' + self.analiz.kapasite + ' karakter)';
        girdi.focus();
        return;
      }
      if (hedef.hasAttribute('data-kp-gec')) return self.adimGec();
      if (hedef.hasAttribute('data-kp-ikon')) return self.ikonEkle(hedef.getAttribute('data-kp-ikon'));
      if (hedef.hasAttribute('data-kp-hazir-set')) return self.setEkle(hedef.getAttribute('data-kp-hazir-set'));
      if (hedef.hasAttribute('data-kp-aksesuar')) return self.aksesuarSec(hedef.getAttribute('data-kp-aksesuar'));
      if (hedef.hasAttribute('data-kp-aks-duz')) return self.aksesuarSec(hedef.getAttribute('data-kp-aks-duz'), true);

      if (hedef.hasAttribute('data-kp-aks-duzenle')) return self.aksesuarDuzenle(hedef.getAttribute('data-kp-aks-duzenle'));
      if (hedef.hasAttribute('data-kp-aks-tasarla')) return self.aksesuarDuzenle(self.secili);
      if (hedef.hasAttribute('data-kp-set-kaldir')) return self.setKaldir(hedef.getAttribute('data-kp-set-kaldir'));
      if (hedef.hasAttribute('data-kp-onay-eylem')) return self.onayEylemi(parseInt(hedef.getAttribute('data-kp-onay-eylem'), 10));
      if (hedef.hasAttribute('data-kp-kategori')) {
        // "Tümü →": o kategorinin tamamı ızgara olarak
        self.gorselKategori = hedef.getAttribute('data-kp-kategori');
        self.ikonIzgarasiCiz();
        var kpK = self.el.querySelector('.kp-kaydir');
        if (kpK) kpK.scrollTop = 0;
        return;
      }
      if (hedef.hasAttribute('data-kp-kategori-geri')) {
        self.gorselKategori = null;
        return self.ikonIzgarasiCiz();
      }
      if (hedef.hasAttribute('data-kp-kaldir')) return self.parcaKaldir(hedef.getAttribute('data-kp-kaldir'));
      if (hedef.hasAttribute('data-kp-isim-kaldir')) return self.isimAyarla('');
      if (hedef.hasAttribute('data-kp-etiket-sec')) return self.etiketSec(hedef.getAttribute('data-kp-etiket-sec'));
      if (hedef.hasAttribute('data-kp-urune-don')) return self.kapat(!self.duzenlenen);
      if (hedef.hasAttribute('data-kp-kapat-ozet')) return self.kapatIstek();
      if (hedef.hasAttribute('data-kp-taslak-kaydet')) return self.taslakKaydetCik();
      if (hedef.hasAttribute('data-kp-taslak-devam')) return self.taslakPaneli(false);
      if (hedef.hasAttribute('data-kp-taslak-sil')) return self.kaydetmedenCik();
      if (hedef.hasAttribute('data-kp-buyuk-ac')) return self.buyukGor(true);
      if (hedef.hasAttribute('data-kp-buyuk-kapat')) return self.buyukGor(false);
      if (hedef.hasAttribute('data-kp-tasarima-don')) return self.adimaGit(self.sonArac || 'yazi', true);
      if (hedef.hasAttribute('data-kp-geri-don')) return self.adimaGit('yazi', true);
      if (hedef.hasAttribute('data-kp-sade-al')) {
        self.kapat(true);
        return self.kart.sadeSepet();
      }
      if (hedef.hasAttribute('data-kp-dondur')) return self.acisiDegistir(Number(hedef.getAttribute('data-kp-dondur')));
      if (hedef.hasAttribute('data-kp-duzle')) return self.acisiDegistir(0, 0);
      if (hedef.hasAttribute('data-kp-sil')) return self.seciliSil();
      if (hedef.hasAttribute('data-kp-geri-al')) return self.geriAl();
      if (hedef.hasAttribute('data-kp-yinele')) return self.yinele();
      if (hedef.hasAttribute('data-kp-alana-yerlestir')) return self.alanaYerlestir(hedef.getAttribute('data-kp-alana-yerlestir'));
      if (hedef.hasAttribute('data-kp-hepsini-duzelt')) return self.hepsiniDuzelt();
      if (hedef.hasAttribute('data-kp-sigdir') || hedef.hasAttribute('data-kp-sigdir-kenar')) return self.sigdirmayiDene();
      if (hedef.hasAttribute('data-kp-yerlestir-balon')) return self.gruplariDuzelt(hedef.getAttribute('data-kp-yerlestir-balon').split('|'));
      if (hedef.hasAttribute('data-kp-bildirim-eylem')) return self.bildirimEylemi();
      if (hedef.hasAttribute('data-kp-buyut')) return self.onizlemeBoyutu(false);
      if (hedef.hasAttribute('data-kp-kenar-sec')) {
        var ka = hedef.getAttribute('data-kp-kenar-sec');
        if (!self.kenarSecim) self.kenarSecim = {};
        self.kenarSecim[ka] = self.kenarSecim[ka] === false;
        return self.ozetCiz();
      }
      if (hedef.hasAttribute('data-kp-kenar-evet')) return self.kenarCevapla(true);
      if (hedef.hasAttribute('data-kp-kenar-hayir')) return self.kenarCevapla(false);
      if (hedef.hasAttribute('data-kp-kenar-degistir')) {
        self.kenarKartAcik = true;
        return self.ozetCiz();
      }
      if (hedef.hasAttribute('data-kp-secim-kaldir')) return self.sec(null);
      if (hedef.hasAttribute('data-kp-renk')) {
        var rv = hedef.getAttribute('data-kp-renk').split(':');
        return self.renkSec(parseInt(rv[0], 10), rv[1]);
      }
      if (hedef.hasAttribute('data-kp-karistir')) return self.renkleriKaristir();
      if (hedef.hasAttribute('data-kp-balon-dondur')) return self.acisiDegistir(15);
    });
    // Klavye açıkken alttaki butonlara ya da adım çizgisine ilk dokunuş klavyeyi kapatıp kaybolmasın:
    // bu butonlar odağı almaz (tıklama normal çalışır)
    el.addEventListener('mousedown', function (e) {
      if (e.target.closest('.kp-alt button, .kp-adimlar button, .kp-araclar button, .kp-arac button, .kp-harf-mod, .kp-cerceve__harf')) e.preventDefault();
    });
    // Bildirime dokununca / fare üstündeyken kaybolmaz; bırakınca süre baştan başlar
    el.querySelectorAll('[data-kp-bildirim], [data-kp-kazanc], [data-kp-kazanc-masa]').forEach(function (b) {
      var dur = function () { self.bildirimDuraklat(b, true); };
      var devam = function () { self.bildirimDuraklat(b, false); };
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') dur(); });
      b.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') devam(); });
      b.addEventListener('pointerdown', dur);
      b.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') devam(); });
      b.addEventListener('pointercancel', devam);
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (self.kombinGaleriAcik) self.kombinGaleriKapat();
        else if (self.buyukAcik) self.buyukGor(false);
        else if (self.taslakAcik) self.taslakPaneli(false);
        else if (self.kpanelAcik) self.kampanyaPaneli(false);
        else if (self.onayAcik) self.onayKapat();
        // Seçili patch varsa önce seçim kalkar (döndürme sonrası alışkanlık); seçim yokken Esc = ✕
        else if (self.secili) self.sec(null);
        else if (self.alt) self.altVazgec();
        else self.kapatIstek();
      }
      if (e.key === 'Tab') self.odakTuzagi(e);
      if ((e.metaKey || e.ctrlKey) && !e.altKey && /^(z|y)$/i.test(e.key) && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) {
        e.preventDefault();
        if (e.key.toLowerCase() === 'y' || e.shiftKey) self.yinele();
        else self.geriAl();
        return;
      }
      // Seçili patch: ok tuşlarıyla 1°, Shift ile 15° döndürme (yazı alanlarında değil)
      if (self.secili && /^Arrow(Left|Right|Up|Down)$/.test(e.key) && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
        e.preventDefault();
        var yon = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 1;
        self.acisiDegistir(yon * (e.shiftKey ? 15 : 1));
      }
    });
    var girdi = el.querySelector('[data-kp-isim]');
    // Ekran klavyesi açıkken (görünür alan belirgin küçülünce) önizleme küçülür, yazı alanı görünür kalır
    var vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', function () {
        var klavye = document.activeElement === girdi && vv.height < window.innerHeight - 120;
        el.classList.toggle('kp-editor--klavye', klavye);
      });
      girdi.addEventListener('blur', function () { el.classList.remove('kp-editor--klavye'); });
    }
    girdi.addEventListener('input', function () {
      var ham = buyukHarf(girdi.value);
      // Çok alanlı üründe tek bir boşluk yazılabilir: yazı bölünecekse önce oradan bölünür (boşluk patch değildir)
      var cok = harfAlanlari(self.m).length > 1;
      var bosluk = null;
      if (cok) {
        var on = ham.replace(/^\s+/, '');
        var ilk = on.search(/\s/);
        if (ilk > 0) bosluk = Array.from(on.slice(0, ilk)).filter(function (h) { return KARAKTER_DESENI.test(h); }).length;
      }
      var temiz = Array.from(ham).filter(function (h) { return KARAKTER_DESENI.test(h); }).join('');
      // Patch'i olmayan karakter (emoji, noktalama, boşluk) yazılmaz; altta kısa not
      self.gecersizKarakter = (cok ? ham.replace(/\s/g, '') : ham) !== temiz;
      // Tek patch: yeni yazılan karakter öncekinin yerine geçer (A yazılıyken B yazılınca B); yapıştırılan metnin ilki
      if (self.m.tekPatch && Array.from(temiz).length > 1) {
        var kar = Array.from(temiz);
        var eskiSira = kar.indexOf(self.t.isim);
        if (eskiSira !== -1) kar.splice(eskiSira, 1);
        temiz = kar[0];
      }
      // Ürünün karakter sınırından fazlası yazılamaz (çok alanlı üründe tüm alanların toplamı)
      if (self.m.metinSiniri) temiz = Array.from(temiz).slice(0, self.m.metinSiniri).join('');
      // Tek patch: yazı eklenince takılı ikon çıkar
      var yerineGecti = false;
      if (self.m.tekPatch && temiz && self.t.parcalar.length) yerineGecti = !!self.tekPatchBosalt(false);
      if (temiz !== self.t.isim) self.t.bolSabit = false;
      karakterleriHizala(self.t, temiz);
      self.t.bosluk = bosluk && bosluk < Array.from(temiz).length ? bosluk : null;
      var gorunen = girdiDegeri(self.t);
      if (girdi.value !== gorunen && !(cok && girdi.value === gorunen + ' ')) girdi.value = gorunen;
      sonaAl(self.t, herhangiAyri(self.t) ? null : 'isim');
      // Harfler ayrıyken yeni yazılan harf boş bir yere konur (başka harfin üstüne değil)
      if (herhangiAyri(self.t)) {
        var konum = self.t.harfKonumlari || [];
        var yeniler = [];
        Array.from(temiz).forEach(function (h, i) { if (!konum[i]) yeniler.push(i); });
        if (yeniler.length) self.yeniHarfleriYerlestir(yeniler);
      }
      yaziyiDagit(self.m, self.yer, self.t);
      BLOK_ALAN.forEach(function (ad) {
        if (!self.t[ad.merkez] || self.t[ad.ayri] || self.t[ad.kenar]) return;
        var blok = self.yer.parcalar(yaziKopyasi(self.t)).filter(function (p) { return p.grup === ad.grup; });
        if (blok.some(function (p) { return self.yer.konumSorunu(p.sekil, p.tip); })) self.t[ad.merkez] = null;
      });
      if (self.seciliKarakter != null && self.seciliKarakter >= Array.from(temiz).length) self.seciliKarakter = null;
      self.yaziIpucu = '';
      self.yaziZamani = Date.now();
      self.yenile();
      if (yerineGecti) self.bildir(TEK_PATCH_NOTU + ' Yazı ikonun yerine geçti.', { sure: 4000 });
    });
    window.addEventListener('resize', function () {
      if (!self.el.hidden) {
        self.sahne.gorunumAyarla(self.sahne.yakin);
        self.yerlestirBalonCiz();
      }
    });
    // Liste (ikon, set, aksesuar) aşağı kaydırılınca önizleme küçülür; en üste dönünce büyür
    var kaydir = el.querySelector('.kp-kaydir');
    var oncekiY = 0;
    kaydir.addEventListener('scroll', function () {
      self.kaydirmaKontrol(kaydir, oncekiY);
      oncekiY = kaydir.scrollTop;
    }, { passive: true });
    // Yalnızca müşterinin kaydırması sayılır (içerik değişince tarayıcının kendi kaydırması değil)
    // (dokunup bırakmak sayılmaz; parmağın kayması ya da tekerlek gerekir)
    ['touchmove', 'wheel'].forEach(function (tur) {
      kaydir.addEventListener(tur, function () { self.sonKaydirma = Date.now(); }, { passive: true });
    });
    this.surukleBagla();
    this.kenarBagla();
  };

  Editor.prototype.odakTuzagi = function (e) {
    var odaklanabilir = Array.prototype.filter.call(
      this.el.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])'),
      function (x) { return !x.disabled && x.offsetParent !== null; }
    );
    if (!odaklanabilir.length) return;
    var ilk = odaklanabilir[0];
    var son = odaklanabilir[odaklanabilir.length - 1];
    if (e.shiftKey && document.activeElement === ilk) {
      e.preventDefault();
      son.focus();
    } else if (!e.shiftKey && document.activeElement === son) {
      e.preventDefault();
      ilk.focus();
    }
  };

  Editor.prototype.isimAyarla = function (isim) {
    if (isim !== this.t.isim) this.t.bolSabit = false;
    karakterleriHizala(this.t, isim);
    // Harfler ayrıyken yeni yazılan karakterler (konumu henüz yok)
    var yeniler = [];
    if (herhangiAyri(this.t)) {
      var konum = this.t.harfKonumlari || [];
      Array.from(isim).forEach(function (h, i) { if (!konum[i]) yeniler.push(i); });
    }
    if (this.seciliKarakter != null && this.seciliKarakter >= Array.from(isim).length) this.seciliKarakter = null;
    var girdi = this.el.querySelector('[data-kp-isim]');
    if (this.t.bosluk && this.t.bosluk >= Array.from(isim).length) this.t.bosluk = null;
    if (girdi.value !== girdiDegeri(this.t)) girdi.value = girdiDegeri(this.t);
    if (yeniler.length) this.yeniHarfleriYerlestir(yeniler);
    this.yenile();
  };

  // Harfler ayrıyken yazılan yeni harf diğer patch'lerin üstüne değil, en yakın boş yere konur.
  // Boş yer yoksa yerinde kalır ve kırmızı işaretlenir.
  Editor.prototype.yeniHarfleriYerlestir = function (siralar) {
    var self = this;
    siralar.forEach(function (i) {
      var grup = 'harf-' + i;
      self.durum = duzenle(self.m, self.yer, self.t);
      var d = self.durum;
      var parcalar = d.parcalar.filter(function (p) { return p.grup === grup; });
      sonaAl(self.t, grup);
      if (!parcalar.length || parcalar[0].kenar || !parcalar.some(function (p) { return d.hatalar[p.uid]; })) return;
      var diger = d.parcalar.filter(function (p) { return p.grup !== grup && !p.kenar; });
      var t0 = self.yer.enYakin(parcalar, diger, 0, 0);
      if (t0) self.grubuKaydir(grup, parcalar[0], t0[0], t0[1]);
    });
  };

  Editor.prototype.harfDegistir = function (harf, yerine) {
    this.isimAyarla(this.t.isim.split(harf).join(yerine));
    var girdi = this.el.querySelector('[data-kp-isim]');
    girdi.focus();
  };

  Editor.prototype.adimEngeli = function (adim) {
    if (adim === 'yazi') return this.analiz && this.analiz.engel;
    if (adim === 'aksesuar') {
      var s2 = this;
      return (this.t.aksesuarlar || []).some(function (a) { return s2.durum.hatalar[a.uid]; });
    }
    if (adim === 'ikon') {
      // İkonlar ve (eski kayıtlardan gelen) yazı dışı rakamlar
      var self = this;
      var hatali = this.t.parcalar.some(function (p) { return self.durum.hatalar[p.uid]; });
      var stok = this.stokSorunlari.some(function (s) { return !yazidaMi(s.parca); });
      return hatali || stok;
    }
    return false;
  };

  // serbest: adım çizgisinden geçiş (sorunlu adım olsa da istenen adıma gider; sorunlar sepete eklerken engellenir)
  Editor.prototype.adimaGit = function (adim, zorla, serbest) {
    var adimlar = this.adimlar;
    var hedefSira = adimlar.map(function (a) { return a.id; }).indexOf(adim);
    var simdiSira = adimlar.map(function (a) { return a.id; }).indexOf(this.adim);
    var girdi = this.el.querySelector('[data-kp-isim]');
    if (girdi && document.activeElement === girdi && adim !== 'yazi') girdi.blur();
    if (!zorla && !serbest && hedefSira > simdiSira) {
      for (var i = 0; i < hedefSira; i++) {
        if (this.adimEngeli(adimlar[i].id)) {
          this.adim = adimlar[i].id;
          this.panelGoster();
          this.yenile();
          return;
        }
      }
    }
    if (this.adim === 'yazi' && adim !== 'yazi' && this.t.isim && !this.isimOlayGonderildi) {
      olayYayinla('isim_yazildi', { harf_sayisi: Array.from(this.t.isim).length });
      this.isimOlayGonderildi = true;
    }
    if (adim !== 'ozet') this.sonArac = adim;
    if (adim !== this.adim) {
      this.secili = null;
      this.seciliHarf = null;
      this.bildirimKapat();
      this.onizlemeBoyutu(false);
      // Yeni adımın paneli en üstten başlar
      var kp = this.el.querySelector('.kp-kaydir');
      if (kp) kp.scrollTop = 0;
    }
    this.adim = adim;
    this.panelGoster();
    if (adim === 'ozet') this.ozetCiz();
    this.yenile();
    var kaydir = this.el.querySelector('.kp-kaydir');
    var panel = this.el.querySelector('[data-kp-panel="' + adim + '"]');
    if (kaydir && panel && !zorla) {
      var baslik = panel.querySelector('h3');
      if (baslik) baslik.focus({ preventScroll: true });
    }
  };

  // Sepetteki tasarımı güncelle: önce yeni grup eklenir, başarılıysa eski grup kaldırılır.
  // Başarısızsa eski grup sepette kalır, editör açık kalır ve uyarı çıkar.
  Editor.prototype.sepetiGuncelle = function () {
    var self = this;
    if (this._guncelleniyor) return;
    var grup = this.duzenlenen;
    var ileri = this.el.querySelector('[data-kp-ileri]');
    if (bosMu(this.t)) {
      this.ilk = JSON.stringify(this.t);
      this.kapat(false);
      return this.kart.sepettenSil(grup);
    }
    this._guncelleniyor = true;
    ileri.setAttribute('aria-busy', 'true');
    ileri.textContent = 'Güncelleniyor…';
    this.kart
      .sepettekiTasarimiGuncelle(grup, kopyala(this.t))
      .then(function () {
        self.ilk = JSON.stringify(self.t);
        self.kapat(false);
        self.kart.cekmeceYenile(true);
      })
      .catch(function () {
        self.bildir('Sepet güncellenemedi, tekrar dene.', { sure: 5000 });
      })
      .then(function () {
        self._guncelleniyor = false;
        ileri.removeAttribute('aria-busy');
        self.ileriYazisi();
      });
  };

  Editor.prototype.panelGoster = function () {
    var adim = this.adim;
    if (adim === 'ikon' && !this.gorselPaneliAcildi) {
      this.gorselPaneliAcildi = true;
      olc('gorsel_paneli');
    }
    this.el.querySelectorAll('[data-kp-panel]').forEach(function (p) {
      p.hidden = p.getAttribute('data-kp-panel') !== adim;
    });
    // Çanta editörü iki ekran: Tasarım (araçlar Metin / Görsel / Aksesuar) ve Özet (üstte "‹ Tasarıma dön · Özet")
    this.el.querySelectorAll('.kp-arac-dugme[data-kp-adim]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-kp-adim') === adim ? 'true' : 'false');
    });
    var araclar = this.el.querySelector('[data-kp-araclar]');
    if (araclar) araclar.hidden = adim === 'ozet';
    var ozetUst = this.el.querySelector('[data-kp-ozet-ust]');
    if (ozetUst) ozetUst.hidden = adim !== 'ozet';
    var aracBaslik = this.el.querySelector('[data-kp-arac-baslik]');
    if (aracBaslik) {
      aracBaslik.textContent = ARAC_BILGI[adim] ? ARAC_BILGI[adim].ad : '';
      aracBaslik.hidden = !ARAC_BILGI[adim];
    }
    this.el.classList.toggle('kp-editor--ozet', !this.alt && adim === 'ozet');
    // Aksesuar ekranındaki Yazı / İkon sekmeleri
    this.el.querySelectorAll('.kp-sekme[data-kp-adim]').forEach(function (b) {
      if (b.getAttribute('data-kp-adim') === adim) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    if (adim === 'ozet') this.kampanyaPaneli(false);
    var ozette = adim === 'ozet';
    this.el.querySelector('.kp-alt').classList.toggle('kp-alt--ozet', ozette);
    this.el.querySelector('[data-kp-alt-ozet]').hidden = !ozette;
    this.ileriYazisi();
  };

  // Özet adımında ana buton doğrudan sepete ekler: "Sepete ekle · toplam"
  Editor.prototype.ileriYazisi = function () {
    var ileri = this.el.querySelector('[data-kp-ileri]');
    if (this.alt) {
      // Düzenlemede "Kaydet"; yeni aksesuarda üzerine bir şey eklenmemişse "Düz ekle", eklenmişse "Tasarımımla ekle"
      var bos = bosMu(this.t);
      ileri.textContent = this.duzenlenenAks ? 'Kaydet' : bos ? 'Düz ekle' : 'Tasarımımla ekle';
      var ipucu = this.el.querySelector('[data-kp-alt-ipucu]');
      if (ipucu) ipucu.hidden = !!this.duzenlenenAks || !bos;
      return;
    }
    this.el.querySelector('.kp-alt__baglantilar').hidden = this.adim === 'ozet' && bosMu(this.t);
    if (this.kombin) {
      // Eksik varken buton soluk; dokununca ne eksik olduğu söylenir (kombinIleri). Kombinini seç ekranında buton hep
      // basılabilir ve sıradaki eksiği yazar (beyaz, kırmızı çerçeve): "Yaşını seç ↓", "Hediye Tshirt'ünü seç ↓";
      // seçim tamamsa koyu "Tasarıma başla →"
      var sec = this.adim === 'sweat';
      var siradaki = sec ? this.kombinSiradaki() : null;
      ileri.classList.toggle('kp-alt__ileri--pasif', !sec && !!this.kombinEksik());
      ileri.classList.toggle('kp-alt__ileri--yol', !!siradaki);
      if (sec) {
        ileri.textContent = siradaki === 'yas' ? 'Yaşını seç ↓' : siradaki === 'tisort' ? 'Hediye Tshirt\'ünü seç ↓' : this.kombinDevamYazisi();
        return;
      }
    }
    if (this.adim !== 'ozet') {
      ileri.textContent = 'Tasarımı tamamla →';
      return;
    }
    var f = fiyatHesapla(this.m, this.yer, this.t);
    var k = this.kampanyaSonucu();
    var adet = this.kart.adet ? this.kart.adet() : 1;
    var tutar = (bosMu(this.t) ? f.urun : f.toplam) * adet - tasarimIndirimi(k);
    // "İndirimler sepette uygulanır" notu yalnızca simülasyon başarısızsa
    this.el.querySelectorAll('.kp-alt__ozet .kp-indirim-notu').forEach(function (n) { n.hidden = !(k && k.hata); });
    if (this.duzenlenen) {
      ileri.textContent = bosMu(this.t) ? 'Sepetten çıkar' : 'Sepeti güncelle · ' + paraBicimle(tutar);
      return;
    }
    if (this.kombin) tutar = this.kombinFiyat().yeni;
    ileri.textContent = (this.kombin ? 'Kombinimi sepete ekle · ' : bosMu(this.t) ? 'Sepete ekle · ' : 'Tasarımımı sepete ekle · ') + paraBicimle(tutar);
  };

  // Aksesuarın türü cümle başında: "Kalem kutusu", "Zarf kalemlik"
  function aksesuarTuru(aks) {
    var s = String(aks.model || aks.ad || 'Aksesuar').toLocaleLowerCase('tr-TR');
    return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
  }

  // Aksesuar ekranından çıkış (Vazgeç, geri oku, Esc). Çantadaki tasarıma dokunulmaz:
  // - Henüz yerleştirilmemiş aksesuar eklenmez; üzerine patch eklendiyse önce sorulur.
  // - Yerleştirilmiş aksesuar düzenleniyorsa son yerleştirilen haline dönülür (aksesuar çantada kalır).
  Editor.prototype.altVazgec = function () {
    var self = this;
    var tur = aksesuarTuru(this.secenek.aksesuar);
    var cik = function () {
      self.ilk = JSON.stringify(self.t);
      self.kapat(false);
      if (self.secenek.vazgec) self.secenek.vazgec(!!self.duzenlenenAks);
    };
    if (this.onayAcik) this.onayKapat();
    if (!this.duzenlenenAks) {
      if (bosMu(this.t)) return cik();
      return this.onayGoster(tur + ' tasarımın silinsin mi?', [
        { yazi: 'Sil', birincil: true, eylem: cik },
        { yazi: 'Devam et', eylem: function () {} }
      ], tur + ' çantaya eklenmez, çantadaki tasarımın değişmez.');
    }
    if (JSON.stringify(this.t) === this.ilk) return cik();
    this.onayGoster('Değişiklikler geri alınsın mı?', [
      { yazi: 'Geri al', birincil: true, eylem: cik },
      { yazi: 'Devam et', eylem: function () {} }
    ], tur + ' çantada son yerleştirdiğin haliyle kalır.');
  };

  // Alttaki toplam: kampanya simülasyonu sonuçlandıysa indirimli, eski toplam üstü çizili.
  // "İndirimler sepette uygulanır" yalnızca simülasyon başarısız olursa.
  Editor.prototype.toplamCiz = function (liste) {
    var k = this.kampanyaSonucu();
    var el = this.el.querySelector('[data-kp-toplam]');
    var adet = this.alt ? 1 : this.kart.adet ? this.kart.adet() : 1;
    liste = liste * adet;
    // Yalnızca bu tasarımın fiyatı (satırlarına düşen indirimle); sepetteki diğer ürünlerin indirimi buraya yansımaz
    var ind = tasarimIndirimi(k);
    // Üstte küçük, üstü çizili eski fiyat; altında yeni fiyat ve küçük kırmızı indirim etiketi
    var html = this.kombin ? this.kombinToplamHtml(liste - ind) : ind > 0
      ? '<s class="kp-alt__eski">' + paraBicimle(liste) + '</s> <span class="kp-alt__yeni">' + paraBicimle(liste - ind) + '</span> <span class="kp-alt__etiket">−' + paraBicimle(ind) + '</span>'
      : '<span class="kp-alt__yeni">' + paraBicimle(liste) + '</span>';
    if (el.innerHTML !== html) el.innerHTML = html;
    this.el.querySelectorAll('.kp-alt__fiyat .kp-indirim-notu').forEach(function (n) { n.hidden = !(k && k.hata); });
  };

  // Aksesuar ekranının toplamı: tüm tasarım (çanta + patch'ler + bu aksesuar ve üzerindekiler)
  Editor.prototype.altToplamCiz = function (f) {
    var ana = this.secenek.ana;
    var pay = f.toplam;
    var toplam = pay;
    if (ana && ana.t) {
      var fa = fiyatHesapla(ana.m, ana.yer, ana.t);
      var uid = this.duzenlenenAks;
      var eski = 0;
      fa.aksesuarlar.forEach(function (k) { if (uid && k.uid === uid) eski = k.toplam; });
      toplam = fa.toplam - eski + pay;
    }
    this.toplamCiz(toplam);
  };

  // Aksesuar ekranı: tasarımı (ya da tasarımsız) çantaya yerleştir
  Editor.prototype.altYerlestir = function (tasarimsiz) {
    if (!tasarimsiz && this.adimlar.some(function (a) { return this.adimEngeli(a.id); }, this)) {
      this.yenile();
      this.bildir('Kırmızı işaretli bir sorun var. Düzelt ya da kaldır.', { sure: 4000 });
      return;
    }
    var t = tasarimsiz || bosMu(this.t) ? null : kopyala(this.t);
    this.ilk = JSON.stringify(this.t);
    this.kapat(false);
    if (this.secenek.yerlestir) this.secenek.yerlestir(t);
  };

  Editor.prototype.ileri = function () {
    if (this.alt) return this.altYerlestir(false);
    // Kombin: Kombinini seç ekranında ana buton "Tasarıma başla"; sweatshirt ve Tshirt seçimi ve 4 patch (ya da 4'lü set)
    // olmadan ilerlenmez
    if (this.kombin && this.adim === 'sweat') return this.kombinSecimBitti();
    if (this.kombin && this.kombinIleri()) return;
    // Yazı/Rakam/İkon: İleri her zaman çalışır (sorunlu tasarım Özet'te sepete eklenirken durdurulur)
    // Tasarım ekranında ana buton "Özete geç →" (sorunlu tasarım Özet'te sepete eklenirken durdurulur)
    if (this.adim !== 'ozet') {
      this.tamamlamaOlcumu();
      return this.adimaGit('ozet', false, true);
    }
    // Yer kontrolü yalnızca Özet'te: geçersiz patch varsa sepete eklenmez, liste ve "Hepsini düzelt" gösterilir
    if (this.hataliGruplar().length) {
      this.yenile();
      var liste = this.el.querySelector('[data-kp-ozet-yer]');
      if (liste) liste.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      this.bildir('Yeri uygun olmayan patch\'ler var. Düzeltince sepete ekleyebilirsin.', { sure: 4000 });
      return;
    }
    if (this.adimEngeli(this.adim)) {
      this.yenile();
      if (this.adim === 'yazi') {
        var uyari = this.el.querySelector('[data-kp-panel="yazi"] .kp-uyari--hata');
        if (uyari) uyari.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        this.bildir('Kırmızı işaretli patch alana sığmıyor ya da stokta yok. Yerini değiştir ya da kaldır.', { sure: 4000 });
      }
      return;
    }
    var sira = this.adimlar.map(function (a) { return a.id; }).indexOf(this.adim);
    if (this.adim === 'ozet') {
      for (var i = 0; i < this.adimlar.length; i++) {
        if (this.adimEngeli(this.adimlar[i].id)) return this.adimaGit(this.adimlar[i].id, true);
      }
      if (this.duzenlenen) return this.sepetiGuncelle();
      // Tasarımı kaydet, editörü kapat ve doğrudan sepete ekle (sepet çekmecesi editörün altında kalmasın)
      this.kapat(true);
      return this.kart.sepeteGonder();
    }
    this.adimaGit(this.adimlar[sira + 1].id);
  };

  // "Tasarımı tamamla": editör açılışı başına bir kez (geri dönüp yeniden basınca tekrar gönderilmez)
  Editor.prototype.tamamlamaOlcumu = function () {
    if (this.alt || this.tamamlamaGonderildi || bosMu(this.t)) return;
    this.tamamlamaGonderildi = true;
    var f = fiyatHesapla(this.m, this.yer, this.t);
    var adet = this.kart.adet ? this.kart.adet() : 1;
    var tutar = f.toplam * adet - tasarimIndirimi(this.kampanyaSonucu());
    olayYayinla('tasarim_tamamlandi', {
      urun_id: this.m.urun.id,
      harf_sayisi: f.harfAdet,
      rakam_sayisi: f.rakamAdet,
      ikon_sayisi: f.ikonAdet,
      toplam: tutar / 100,
      para_birimi: paraBirimi()
    });
    tamamlamaOlcumu(this.m, tutar);
  };

  /* ---------------- Paneller ---------------- */

  Editor.prototype.panelYaziKur = function () {
    var panel = this.el.querySelector('[data-kp-panel="yazi"]');
    // Tek patch: yeni karakter yazılabilsin diye 2 (yazılan öncekinin yerine geçer)
    var tek = this.m.tekPatch;
    panel.innerHTML =
      '<h3 id="kp-p-yazi" class="kp-gizli" tabindex="-1">Metin ekle</h3>' +
      '<div class="kp-alan-girdi">' +
      '<label for="kp-isim" class="kp-gizli">Yazı ve rakam</label>' +
      // Karakter sayacı yazı alanının içinde, sağda
      '<div class="kp-girdi-kap">' +
      '<input id="kp-isim" class="kp-girdi" type="text" data-kp-isim autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" maxlength="' + (tek ? 2 : this.m.metinSiniri || 24) + '" enterkeyhint="done" placeholder="' + (tek ? 'ör. A ya da 7' : 'ör. ECE7') + '" aria-describedby="kp-yazi-ipucu kp-kapasite kp-isim-uyari">' +
      // Yazı alanının sağında, sayacın solunda: Ayır / Birleştir (2+ karakterde)
      '<button type="button" class="kp-harf-mod" data-kp-harf-mod aria-pressed="false" hidden></button>' +
      '<span id="kp-kapasite" class="kp-kapasite" data-kp-kapasite></span>' +
      '</div>' +
      this.yaziYeriHtml() +
      '<div class="kp-stil-secim" data-kp-stil-secim role="group" aria-label="Harflerin stili" hidden></div>' +
      '<p id="kp-yazi-ipucu" class="kp-yazi-ipucu">' + (tek ? TEK_PATCH_NOTU + ' Bir harf ya da bir rakam yaz, ya da Görsel\'den bir patch seç.' : 'Harflere dokunarak her birinin stilini ayrı seçebilirsin.') + '</p>' +
      '<div class="kp-karakterler" data-kp-karakterler role="group" aria-label="Karakterler"></div>' +
      '<div class="kp-stil" data-kp-stil-panel hidden></div>' +
      '</div>' +
      '<div id="kp-isim-uyari" class="kp-uyarilar" data-kp-isim-uyari aria-live="polite"></div>';
    var girdi = panel.querySelector('[data-kp-isim]');
    girdi.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        girdi.blur();
      }
    });
  };

  // Çok alanlı üründe "Yazının yeri": Otomatik ya da ürünün her harf alanı (paneldeki adıyla)
  Editor.prototype.yaziYeriHtml = function () {
    var hz = harfAlanlari(this.m);
    if (hz.length < 2) return '';
    var ne = /çanta/i.test(this.m.urun.baslik || '') ? 'Bu çantada ' : 'Bu üründe ';
    var secenekler = [{ id: 'oto', ad: 'Otomatik' }].concat(hz.map(function (a, i) { return { id: a.id, ad: a.ad || 'Alan ' + (i + 1) }; }));
    return '<div class="kp-yazi-yeri" data-kp-yazi-yeri-kap>' +
      '<div class="kp-yazi-yeri__ust"><span class="kp-yazi-yeri__baslik" id="kp-yazi-yeri-baslik">Yazının yeri</span>' +
      '<span class="kp-yazi-yeri__not">' + ne + this.m.alanlar.length + ' alan var</span></div>' +
      '<div class="kp-yazi-yeri__secenekler" role="radiogroup" aria-labelledby="kp-yazi-yeri-baslik">' +
      secenekler.map(function (x) {
        return '<button type="button" class="kp-yazi-yeri__secenek" role="radio" aria-checked="false" data-kp-yazi-yeri="' + kacis(x.id) + '">' + kacis(x.ad) + '</button>';
      }).join('') +
      '</div></div>';
  };

  // Yazının yeri değişince yazı yeniden dağıtılır: ayrı harfler birleşir, bloklar alanlarının ortasına gelir
  Editor.prototype.yaziYeriSec = function (id) {
    var t = this.t;
    if (herhangiAyri(t)) harfleriBirlestir(t);
    t.bolSabit = false;
    t.yaziYeri = id === 'oto' ? 'oto' : id;
    t.bol = null;
    t.bolAlan = null;
    t.isimMerkez = null;
    t.isim2Merkez = null;
    t.isimKenar = false;
    t.isim2Kenar = false;
    sonaAl(t, 'isim');
    this.yenile();
  };

  // İkonların ortak fiyatı (hepsi aynıysa); başlığın sağında bir kez yazılır
  Editor.prototype.ikonFiyatYazisi = function () {
    if (this.kombin) return 'İlk ' + this.kombin.dahil + ' patch dahil';
    var fiyatlar = {};
    this.m.ikonlar.forEach(function (i) { if (i.varyant && i.varyant.fiyat != null) fiyatlar[i.varyant.fiyat] = true; });
    var liste = Object.keys(fiyatlar).map(Number).sort(function (a, b) { return a - b; });
    if (!liste.length) return '';
    return liste.length === 1 ? 'Tek patch ' + paraBicimle(liste[0]) : 'Patch başına ' + paraBicimle(liste[0]) + '\'den';
  };

  // İkon adımı: önce yol seçimi (Hazır setler / Kendim seçeceğim), altında set kartları ya da kategoriler ve ikonlar
  // Arama için: küçük harf, Türkçe karakterler sade (ı/i, ş/s, ğ/g, ü/u, ö/o, ç/c)
  function aramaMetni(x) {
    return String(x || '').toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function ikonKarti(i) {
    var v = i.varyant;
    var tukendi = !v.satilabilir || v.stok === 0;
    return '<button type="button" class="kp-secim kp-secim--ikon" data-kp-ikon="' + i.id + '" title="' + kacis(i.ad) + '"' + (tukendi ? ' disabled' : '') + '>' +
      (v.gorsel ? '<img ' + panelGorseli(v.gorsel, 68) + ' alt="">' : '') +
      '<span class="kp-secim__ad">' + kacis(i.ad) + '</span>' +
      (tukendi ? '<span class="kp-secim__rozet kp-secim__rozet--tukendi">Tükendi</span>' : '') +
      '</button>';
  }

  // Panel küçük resimleri ekrana gelince yüklenir. Kaydırma kutusu (.kp-kaydir) kök; dikeyde 160 px önceden.
  // Yatay kayan sıralarda (kategori satırları) sıra ekrana gelince, sıranın görünen kısmı ve bir kart genişliği
  // ötesi yüklenir; kaydırdıkça devamı. Aynı anda yalnızca ekrandakiler indirilir.
  Editor.prototype.tembelIzle = function (kap, anahtar) {
    this.tembel = this.tembel || {};
    var eski = this.tembel[anahtar];
    if (eski) eski.forEach(function (g) { g.disconnect(); });
    var gorseller = kap.querySelectorAll('img[data-kp-src]');
    if (!gorseller.length) return;
    if (!('IntersectionObserver' in window)) {
      gorseller.forEach(panelGorseliAc);
      return;
    }
    var kok = kap.closest('.kp-kaydir');
    var liste = [];
    this.tembel[anahtar] = liste;
    var ac = function (girdiler, g) {
      girdiler.forEach(function (x) {
        if (!x.isIntersecting) return;
        g.unobserve(x.target);
        if (x.target.tagName === 'IMG') return panelGorseliAc(x.target);
        // Yatay sıra ekrana geldi: sıranın kendi görünümüne göre izlenir
        var sg = new IntersectionObserver(ac, { root: x.target, rootMargin: '0px 90px' });
        liste.push(sg);
        x.target.querySelectorAll('img[data-kp-src]').forEach(function (i) { sg.observe(i); });
      });
    };
    var dikey = new IntersectionObserver(ac, { root: kok, rootMargin: '160px 0px' });
    liste.push(dikey);
    var siralar = kap.querySelectorAll('.kp-gorsel-sira');
    siralar.forEach(function (sr) { dikey.observe(sr); });
    gorseller.forEach(function (i) { if (!i.closest('.kp-gorsel-sira')) dikey.observe(i); });
  };

  // Editör hazır olduktan sonra boşta: Görsel paneli ilk açıldığında ekranda olacak küçük resimler (hazır setler ve ilk
  // iki kategori satırının başı) önceden indirilir; panel açılınca hemen görünür. Panel zaten açıldıysa bir şey yapmaz.
  Editor.prototype.gorselOnIsit = function () {
    if (this.gorselPaneliAcildi || !this.el) return;
    if (navigator.connection && navigator.connection.saveData) return;
    var kap = this.el.querySelector('[data-kp-gorsel-icerik]');
    if (!kap) return;
    var siralar = kap.querySelectorAll('.kp-gorsel-sira');
    for (var i = 0; i < Math.min(3, siralar.length); i++) {
      // Hazır setler sırası: ilk 3 set (her biri birkaç küçük resim); kategori sıraları: ilk 5 kart
      var kartlar = siralar[i].querySelectorAll('.kp-secim');
      var n = Math.min(kartlar.length, siralar[i].classList.contains('kp-gorsel-sira--set') ? 3 : 5);
      for (var k = 0; k < n; k++) kartlar[k].querySelectorAll('img[data-kp-src]').forEach(panelGorseliAc);
    }
  };

  // Görsel paneli: arama kutusu, altında "Tek patch 330 TL"; kategoriler alt alta bölümler (ilk "Hazır setler · indirimli"),
  // her bölümde yatay kayan tek sıra kart ve "Tümü →" (4 sütunlu ızgara, "← Kategori" ile geri)
  Editor.prototype.panelIkonKur = function () {
    var self = this;
    var panel = this.el.querySelector('[data-kp-panel="ikon"]');
    panel.innerHTML =
      '<h3 id="kp-p-ikon" class="kp-gizli" tabindex="-1">Görsel ekle</h3>' +
      '<div class="kp-ara"><svg class="kp-ara__simge" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '<input type="search" class="kp-ara__girdi" data-kp-gorsel-ara placeholder="Görsel ara: kalp, kedi, futbol…" aria-label="Görsel ara" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search"></div>' +
      '<p class="kp-gorsel-fiyat" data-kp-ikon-fiyat>' + kacis(this.ikonFiyatYazisi()) + '</p>' +
      (this.m.tekPatch ? '<p class="kp-yazi-ipucu" data-kp-tek-patch-notu>' + TEK_PATCH_NOTU + ' Seçtiğin görsel yazının ya da önceki görselin yerine geçer.</p>' : '') +
      '<div class="kp-gorsel-icerik" data-kp-gorsel-icerik></div>';
    var ara = panel.querySelector('[data-kp-gorsel-ara]');
    ara.addEventListener('input', function () {
      self.gorselAra = ara.value;
      self.gorselKategori = null;
      self.ikonIzgarasiCiz();
    });
    ara.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        ara.blur();
      }
    });
    this.ikonIzgarasiCiz();
  };

  Editor.prototype.ikonIzgarasiCiz = function () {
    var m = this.m;
    var kap = this.el.querySelector('[data-kp-gorsel-icerik]');
    if (!kap) return;
    var q = aramaMetni(this.gorselAra).trim();
    var kombin = this.kombin;
    var SET = kombin ? 'Patch seti seç' : 'Hazır setler';
    var setBolumu = m.hazirSetler.length ? [{ ad: SET, set: true }] : [];
    var bolumler = setBolumu.concat(m.kategoriler.map(function (k) { return { ad: k.ad, ikonlar: k.ikonlar }; }));
    var html;
    if (q) {
      // Arama: görsel adı ve kategori adında; sonuçlar ızgara (setler önce)
      var setler = m.hazirSetler.filter(function (st) { return aramaMetni(st.ad).indexOf(q) !== -1 || aramaMetni(SET).indexOf(q) !== -1; });
      var gorulen = {};
      var ikonlar = [];
      m.kategoriler.forEach(function (k) {
        var katUyar = aramaMetni(k.ad).indexOf(q) !== -1;
        k.ikonlar.forEach(function (i) {
          if (gorulen[i.id]) return;
          if (katUyar || aramaMetni(i.ad).indexOf(q) !== -1) {
            gorulen[i.id] = true;
            ikonlar.push(i);
          }
        });
      });
      html = (setler.length ? '<div class="kp-izgara kp-izgara--set">' + setler.map(function (st, i) { return setKarti(st, i); }).join('') + '</div>' : '') +
        (ikonlar.length ? '<div class="kp-izgara kp-izgara--ikon">' + ikonlar.map(ikonKarti).join('') + '</div>' : '') +
        (!setler.length && !ikonlar.length ? '<p class="kp-gorsel-bos">Sonuç bulunamadı. Başka bir kelime dene.</p>' : '');
    } else if (this.gorselKategori) {
      var b = bolumler.filter(function (x) { return x.ad === this.gorselKategori; }, this)[0];
      if (!b) {
        this.gorselKategori = null;
        return this.ikonIzgarasiCiz();
      }
      html = '<button type="button" class="kp-gorsel-geri" data-kp-kategori-geri>← ' + kacis(b.ad) + '</button>' +
        (b.set
          ? '<div class="kp-izgara kp-izgara--set">' + m.hazirSetler.map(function (st, i) { return setKarti(st, i); }).join('') + '</div>'
          : '<div class="kp-izgara kp-izgara--ikon">' + b.ikonlar.map(ikonKarti).join('') + '</div>');
    } else {
      html = bolumler.map(function (b, i) {
        // Kombin: setlerden sonra tekli patch'lerin başlığı
        var ayrac = kombin && setBolumu.length && i === 1 ? '<p class="kp-gorsel-ayrac">ya da ' + kombin.dahil + ' patch\'i kendin seç</p>' : '';
        return ayrac + '<section class="kp-gorsel-bolum' + (kombin && b.set ? ' kp-gorsel-bolum--kombin-set' : '') + '">' +
          '<div class="kp-gorsel-bolum__ust"><h4 class="kp-gorsel-bolum__ad">' + kacis(b.ad) + (b.set ? ' <span class="kp-gorsel-bolum__ek">· ' + (kombin ? kombin.dahil + ' patch dahil' : 'indirimli') + '</span>' : '') + '</h4>' +
          '<button type="button" class="kp-gorsel-tumu" data-kp-kategori="' + kacis(b.ad) + '">Tümü →</button></div>' +
          '<div class="kp-gorsel-sira' + (b.set ? ' kp-gorsel-sira--set' : '') + '">' +
          (b.set ? m.hazirSetler.map(function (st, i) { return setKarti(st, i); }).join('') : b.ikonlar.map(ikonKarti).join('')) +
          '</div></section>';
      }).join('');
    }
    // Karşılaştırma son yazılan HTML ile: yüklenen görsellerin öznitelikleri değiştiği için innerHTML artık farklıdır
    if (this.ikonHtml !== html || !kap.firstChild) {
      kap.innerHTML = html;
      this.ikonHtml = html;
      this.tembelIzle(kap, 'ikon');
    }
    this.ikonDurumGuncelle();
  };

  /* ---------------- Aksesuar ---------------- */

  // Aksesuar Velcro alanın yarısından fazlasını kaplıyorsa "neredeyse tamamını kaplar" notu
  function aksesuarBuyukMu(m, aks, alan) {
    alan = alan || m.alanBul('icon');
    if (!alan) return false;
    var s = alan.sekil;
    var alanAlani = s.t === 'cokgen' ? s.alanBuyuklugu : s.t === 'circle' ? Math.PI * s.r * s.r : s.t === 'ellipse' ? Math.PI * s.rx * s.ry : s.w * s.h - (4 - Math.PI) * Math.pow(s.r || 0, 2);
    var d = aks.dis;
    var aksAlani = d.sekil === 'circle' ? Math.PI * Math.pow(d.en / 2, 2) : d.en * d.boy - (4 - Math.PI) * d.kose * d.kose;
    return aksAlani / alanAlani >= 0.5;
  }

  Editor.prototype.panelAksesuarKur = function () {
    var m = this.m;
    var panel = this.el.querySelector('[data-kp-panel="aksesuar"]');
    // Üzerine patch takılabilen (kendi Velcro yüzeyi olan) aksesuarda "Düz ekle" ve "Tasarla"; diğerlerinde "Ekle"
    var kartlar = m.aksesuarlar
      .map(function (a) {
        var ad = kacis(a.model + (a.renk ? ' ' + a.renk : ''));
        return (
          // Yatay kart: solda görsel, sağda ad ve renk, fiyat, not ve butonlar
          '<div class="kp-secim kp-secim--aksesuar">' +
          '<img ' + panelGorseli(a.gorsel.kucuk) + ' alt="">' +
          '<span class="kp-aks-kart__bilgi">' +
          '<span class="kp-aks-kart__ust"><span class="kp-aks-kart__adlar"><span class="kp-secim__ad">' + kacis(a.model) + '</span>' +
          (a.renk ? ' <span class="kp-aks-kart__renk">' + kacis(a.renk) + '</span>' : '') + '</span>' +
          ' <span class="kp-aks-kart__fiyat">' + paraBicimle(a.fiyat) + '</span></span>' +
          (a.tasarlanabilir
            ? '<span class="kp-aks-kart__not kp-aks-kart__not--takilir">Üzerine patch takılabilir</span>' +
              '<span class="kp-aks-kart__dugmeler">' +
              '<button type="button" class="kp-aks-kart__dugme" data-kp-aks-duz="' + a.id + '" aria-label="' + ad + ', düz ekle">Düz ekle</button>' +
              '<button type="button" class="kp-aks-kart__dugme kp-aks-kart__dugme--ana" data-kp-aksesuar="' + a.id + '" aria-label="' + ad + ', tasarla">Tasarla</button>' +
              '</span>'
            : '<span class="kp-aks-kart__not">Üzerine patch takılmaz</span>' +
              '<span class="kp-aks-kart__dugmeler"><button type="button" class="kp-aks-kart__dugme kp-aks-kart__dugme--ana" data-kp-aksesuar="' + a.id + '" aria-label="' + ad + ', ekle">Ekle</button></span>') +
          '</span>' +
          '</div>'
        );
      })
      .join('');
    panel.innerHTML =
      '<h3 id="kp-p-aksesuar" class="kp-gizli" tabindex="-1">Aksesuar ekle</h3>' +
      '<div class="kp-izgara kp-izgara--aksesuar">' + kartlar + '</div>';
    this.tembelIzle(panel, 'aksesuar');
  };

  // Aksesuar kartı: "Tasarla" tasarım ekranını açar; "Düz ekle" ve "Ekle" doğrudan çantaya yerleştirir
  Editor.prototype.aksesuarSec = function (id, duz) {
    var aks = this.m.aksesuarHarita[id];
    if (!aks) return;
    if (aks.tasarlanabilir && !duz) return this.altEditorAc(aks, null, null);
    this.aksesuarYerlestir(aks, null);
  };

  Editor.prototype.aksesuarDuzenle = function (uid) {
    var a = (this.t.aksesuarlar || []).filter(function (x) { return x.uid === uid; })[0];
    var aks = a && this.m.aksesuarHarita[a.urunId];
    if (aks && aks.tasarlanabilir) this.altEditorAc(aks, a.tasarim, uid);
  };

  Editor.prototype.altEditorAc = function (aks, tasarim, uid) {
    var am = this.m.aksesuarModeli(aks.id);
    if (!am) return;
    var self = this;
    if (!this.altEditorler) this.altEditorler = {};
    var ed = this.altEditorler[aks.id];
    if (!ed) {
      ed = this.altEditorler[aks.id] = new Editor({ model: am.m, yer: am.yer, tasarim: null }, {
        alt: true,
        aksesuar: aks,
        buyuk: aksesuarBuyukMu(this.m, aks),
        ana: self,
        yerlestir: function (t) {
          if (self.adim !== 'aksesuar') self.adimaGit('aksesuar', true);
          self.aksesuarYerlestir(aks, t, ed.duzenlenenAks);
        },
        // Vazgeç: yeni aksesuarda çanta tasarımının Aksesuar adımına dönülür; düzenlemede bulunduğu adımda kalınır
        vazgec: function () { if (self.adim !== 'aksesuar') self.adimaGit('aksesuar', true); self.yenile(); }
      });
    }
    ed.duzenlenenAks = uid || null;
    ed.ac('yazi', { tasarim: tasarim || bosTasarim(am.m) });
  };

  // Çakışan patch'in adı, belirtme hâli ekiyle: "Futbol Topu'yu", "ECE7'yi"
  function belirtme(ad) {
    var s = String(ad || '');
    var son = s.charAt(s.length - 1).toLocaleLowerCase('tr-TR');
    var rakamUnlu = { '0': 'ı', '1': 'i', '2': 'i', '3': 'ü', '4': 'ü', '5': 'i', '6': 'ı', '7': 'i', '8': 'i', '9': 'u' };
    var rakamSonUnlu = { '2': 1, '6': 1, '7': 1 };
    var unlu, unluyleBiter;
    if (rakamUnlu[son]) {
      unlu = rakamUnlu[son];
      unluyleBiter = !!rakamSonUnlu[son];
    } else {
      var unluler = s.toLocaleLowerCase('tr-TR').replace(/[^aeıioöuü]/g, '');
      var u = unluler.charAt(unluler.length - 1) || 'e';
      unlu = { a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' }[u];
      unluyleBiter = /[aeıioöuü]/.test(son);
    }
    return s + '\'' + (unluyleBiter ? 'y' : '') + unlu;
  }

  // Aksesuarı çantanın Velcro alanına yerleştirir. Yer yoksa ya da bir patch'le çakışıyorsa koyu kutu:
  // "Yer aç" (kaydırarak dener, silmez) ve "[Patch]'i çıkar" (yalnızca o patch).
  // Aksesuarı çantaya yerleştirir, hiçbir şey sormaz ve hiçbir patch'i silmez:
  // - Velcro alanın büyük kısmını kaplayan aksesuar (kalem kutusu): çantadaki tüm patch'ler kenara alınır.
  // - Küçük aksesuar (zarf, mini yuvarlak): alanın en boş yerine yerleşir, yalnızca üstüne gelenler kenara alınır.
  // Aksesuarın kendi üzerindeki tasarım aynen korunur. Bildirimde "Geri al".
  Editor.prototype.aksesuarYerlestir = function (aks, icTasarim, uid) {
    var t = this.t;
    if (uid) {
      (t.aksesuarlar || []).forEach(function (a) { if (a.uid === uid) a.tasarim = icTasarim; });
      return this.yenile();
    }
    var yer = this.yer;
    var m = this.m;
    // İkon takılabilen tüm alanlar denenir (ör. sırt çantasında üst panel ve alt cep); eşitlikte ilk alan, sonra merkeze yakın
    var alanlar = m.alanlar.filter(function (a) { return a.tipler.indexOf('icon') !== -1; });
    if (!alanlar.length) return;
    var once = JSON.stringify(t);
    var d = duzenle(m, yer, t);
    var cantada = d.parcalar.filter(function (p) { return !p.kenar; });
    // Aday konumlar: alanda (yasaklı bölge dışında) aksesuarın sığdığı yerler; maliyet = üstüne gelen patch sayısı.
    // Aksesuar alanın yarısından büyükse o alandaki tüm patch'ler kenara alınır.
    var ornek = aksesuarSekli(aks, 0, 0, 0);
    onbellegiIsit(ornek, m);
    var ok = kutu(ornek);
    var en = null;
    alanlar.forEach(function (alan, ai) {
      var c = merkez(alan.sekil);
      var k = kutu(alan.sekil);
      var buyuk = aksesuarBuyukMu(m, aks, alan);
      var alandakiler = alanlar.length === 1 ? cantada : cantada.filter(function (p) {
        var pm = merkez(p.sekil);
        return noktaIcinde(pm[0], pm[1], alan.sekil, -m.ayar.tasmaTol);
      });
      for (var y = k.y + ok.h / 2; y <= k.y + k.h - ok.h / 2 + EPS; y += 0.5) {
        for (var x = k.x + ok.w / 2; x <= k.x + k.w - ok.w / 2 + EPS; x += 0.5) {
          if (!noktaIcinde(x, y, alan.sekil)) continue;
          var sk = kaydir(ornek, x, y);
          if (!icinde(sk, alan.sekil, -m.ayar.tasmaTol) || !yer.alanaUygun(sk, 'aksesuar')) continue;
          var ustte = buyuk ? alandakiler : cantada.filter(function (p) { return cakisir(sk, p.sekil, 0); });
          var maliyet = ustte.reduce(function (t0, p) { return t0 + (p.tip === 'aksesuar' ? 100 : 1); }, 0);
          var uzaklik = Math.pow(x - c[0], 2) + Math.pow(y - c[1], 2);
          if (!en || maliyet < en.maliyet || (maliyet === en.maliyet && (ai < en.ai || (ai === en.ai && uzaklik < en.uzaklik)))) {
            en = { x: x, y: y, ustte: ustte, maliyet: maliyet, uzaklik: uzaklik, ai: ai };
          }
        }
      }
    });
    if (!en) {
      this.bildir(aks.ad + ' bu alana sığmıyor.', { sure: 5000 });
      return;
    }
    var gruplar = [];
    var patchSayisi = 0;
    var aksesuarAdlari = [];
    en.ustte.forEach(function (p) {
      if (gruplar.indexOf(p.grup) === -1) gruplar.push(p.grup);
      if (p.tip !== 'aksesuar') patchSayisi++;
      else aksesuarAdlari.push(p.etiket);
    });
    var kenaraGiden = [patchSayisi ? patchSayisi + ' patch' : ''].concat(aksesuarAdlari).filter(Boolean);
    // Kenara alma ve aksesuarın eklenmesi tek yenilemede: geçmişte tek adım (Geri al / Yinele bütünüyle)
    gruplar.forEach(function (g) { kenaraAl(t, g); });
    this.aksesuarEkle(aks, icTasarim, en.x, en.y);
    var sonra = JSON.stringify(this.t);
    var eklenen = this.t.aksesuarlar[this.t.aksesuarlar.length - 1].uid;
    var onceT = JSON.parse(once);
    this.bildir(
      aks.ad + (icTasarim && !bosMu(icTasarim) ? ' tasarımınla' : '') + ' yerleştirildi.' +
      (kenaraGiden.length ? ' Çantadaki ' + kenaraGiden.join(' ve ') + ' kenara alındı, istediklerini geri sürükleyebilirsin.' : ''),
      { eylem: { yazi: 'Geri al', fn: function () {
        // Sonradan başka değişiklik yapıldıysa: aksesuar (tasarımıyla) çıkar, hâlâ kenarda duran patch'ler eski yerlerine döner
        this.islemiGeriAl(sonra, function () {
          var t2 = this.t;
          t2.parcalar = t2.parcalar.filter(function (p) { return p.uid !== eklenen; });
          if (t2.aksesuarlar) t2.aksesuarlar = t2.aksesuarlar.filter(function (a) { return a.uid !== eklenen; });
          gruplar.forEach(function (g) { kenardanGeriDondur(t2, onceT, g); });
          this.secili = null;
          this.yenile();
        });
      } } }
    );
  };

  // Kenara alınmış grubu (hâlâ kenardaysa) önceki tasarımdaki yerine döndürür
  function kenardanGeriDondur(t, onceT, grup) {
    if (blokGrubu(grup)) {
      var ad = BLOK_ALAN[grupBlogu(grup)];
      if (!t[ad.kenar]) return;
      t[ad.kenar] = !!onceT[ad.kenar];
      t[ad.merkez] = onceT[ad.merkez] || null;
      return;
    }
    if (String(grup).indexOf('harf-') === 0) {
      var i = parseInt(String(grup).slice(5), 10);
      if (!t.harfKenar || !t.harfKenar[i]) return;
      t.harfKenar[i] = !!(onceT.harfKenar && onceT.harfKenar[i]);
      if (onceT.harfKonumlari && onceT.harfKonumlari[i]) {
        if (!Array.isArray(t.harfKonumlari)) t.harfKonumlari = [];
        t.harfKonumlari[i] = onceT.harfKonumlari[i];
      }
      return;
    }
    var eski = (onceT.aksesuarlar || []).concat(onceT.parcalar || []).filter(function (x) { return x.uid === grup; })[0];
    if (!eski) return;
    (t.aksesuarlar || []).concat(t.parcalar).forEach(function (x) {
      if (x.uid !== grup || !x.kenar) return;
      x.kenar = !!eski.kenar;
      x.cx = eski.cx;
      x.cy = eski.cy;
      x.aci = eski.aci;
    });
  }

  Editor.prototype.aksesuarEkle = function (aks, icTasarim, cx, cy) {
    if (!this.t.aksesuarlar) this.t.aksesuarlar = [];
    var uid = yeniId('a');
    this.t.aksesuarlar.push({ uid: uid, urunId: aks.id, cx: cx, cy: cy, aci: 0, tasarim: icTasarim || null });
    sonaAl(this.t, uid);
    olayYayinla('aksesuar_eklendi', { urun_id: this.m.urun.id, aksesuar_id: aks.id, aksesuar_adi: aks.ad, tasarimli: !!icTasarim });
    this.bildirimKapat();
    this.yenile();
    this.sec(uid);
    this.vurgula([uid]);
  };

  // Hazır set kartı: patch önizlemeleri, set adı, "N patch · fiyat" ve üstü çizili parça toplamı
  function setKarti(s, sira) {
    return (
      '<button type="button" class="kp-secim kp-secim--set" data-kp-hazir-set="' + s.id + '" data-sira="' + sira + '" title="' + kacis(s.ad) + ' seti"' +
      ' data-kp-dahil-yazi="Dahil · ' + s.patchler.length + ' patch" data-kp-ek-yazi="+' + kacis(paraBicimle(s.fiyat)) + '">' +
      '<span class="kp-set-kart__onizleme" aria-hidden="true">' +
      s.patchler.map(function (p) { return p.varyant.gorsel ? '<img ' + panelGorseli(p.varyant.gorsel, 34) + ' alt="">' : ''; }).join('') +
      '</span>' +
      '<span class="kp-secim__ad">' + kacis(s.ad) + '</span>' +
      '<span class="kp-set-kart__fiyat">' + s.patchler.length + ' patch · <span class="kp-set-kart__tutar">' + paraBicimle(s.fiyat) + '</span>' +
      (s.parcaToplam > s.fiyat ? ' <s>' + paraBicimle(s.parcaToplam) + '</s>' : '') + '</span>' +
      '</button>'
    );
  }

  /* ---------------- Ekleme / kaldırma ---------------- */

  Editor.prototype.adimGec = function () {
    var s0 = this.adimlar.map(function (a) { return a.id; }).indexOf(this.adim);
    if (s0 < this.adimlar.length - 1) this.adimaGit(this.adimlar[s0 + 1].id, false, true);
  };

  // "… istemiyorum" butonları kaldırıldı: müşteri istemediği araca dokunmaz. Araçların rozetleri: Metin'de karakter,
  // Görsel'de eklenen görsel, Aksesuar'da aksesuar sayısı
  Editor.prototype.gecButonlariGuncelle = function () {
    var t = this.t;
    var sayi = {
      yazi: Array.from(t.isim || '').length,
      ikon: (t.parcalar || []).filter(function (p) { return p.tip === 'icon'; }).length,
      aksesuar: (t.aksesuarlar || []).length
    };
    this.el.querySelectorAll('[data-kp-rozet]').forEach(function (r) {
      var n = sayi[r.getAttribute('data-kp-rozet')] || 0;
      r.hidden = !n;
      if (r.textContent !== String(n)) r.textContent = String(n);
    });
    var bos = {
      yazi: !t.isim,
      ikon: !t.parcalar.length && !this.alt,
      aksesuar: !(t.aksesuarlar && t.aksesuarlar.length)
    };
    this.el.querySelectorAll('[data-kp-panel]').forEach(function (panel) {
      var b = panel.querySelector('[data-kp-gec]');
      if (b) b.hidden = !bos[panel.getAttribute('data-kp-panel')];
    });
  };

  Editor.prototype.parcaEkle = function (tip, urunId, varyant, tanim, yerYok) {
    var ad = tip === 'number' ? varyant.karakter + ' rakamı' : tanim.ad;
    var mevcut = !varyant.satilabilir ? 0 : varyant.stok == null ? Infinity : varyant.stok;
    var kullanilan = this.t.parcalar.filter(function (p) { return String(p.varyantId) === String(varyant.id); }).length;
    if (kullanilan + 1 > mevcut) {
      this.bildir(ad + ' için yeterli stok yok.');
      return false;
    }
    var parcalar = this.durum.parcalar;
    var ornek = parcaSekli(tanim, varyant, 0, 0);
    var ornekKutu = kutu(ornek);
    var alan = this.m.alanBul(tip);
    if (!alan) return false;
    var c = merkez(alan.sekil);
    // Hedef: alan merkezi, isim varsa ismin altı
    var hedefY = c[1];
    var isimP = parcalar.filter(function (p) { return p.grup === 'isim' && !p.kenar; });
    if (isimP.length) {
      var altSinir = Math.max.apply(null, isimP.map(function (p) { var k = kutu(p.sekil); return k.y + k.h; }));
      hedefY = altSinir + this.m.ayar.bosluk + ornekKutu.h / 2;
    }
    var baslangic = kaydir(ornek, c[0], hedefY);
    var tasima = this.yer.enYakin([{ tip: tip, sekil: baslangic }], parcalar.filter(function (p) { return !p.kenar; }), 0, 0);
    // Aksesuar ekranında kenar yok: yer yoksa eklenmez
    if (!tasima && this.alt) {
      this.bildir(ad + ' için ' + aksesuarTuru(this.secenek.aksesuar).toLocaleLowerCase('tr-TR') + ' üzerinde yer yok.', { sure: 4000 });
      return false;
    }
    var yeni = { uid: yeniId(tip === 'number' ? 'r' : 'i'), tip: tip, urunId: urunId, varyantId: varyant.id, cx: c[0] + (tasima ? tasima[0] : 0), cy: hedefY + (tasima ? tasima[1] : 0) };
    // Yer yoksa yine eklenir, kenara alınır (sepete dahil)
    if (!tasima) yeni.kenar = true;
    this.t.parcalar.push(yeni);
    sonaAl(this.t, yeni.uid);
    this.yenile();
    this.vurgula([yeni.uid]);
    if (!tasima) this.bildir(ad + ' için çantada yer yok, kenara alındı. Yer açıp çantaya sürüklersen fiyata eklenir.', { sure: 4500 });
    else this.bildirimKapat();
    return true;
  };

  Editor.prototype.ikonEkle = function (urunId) {
    var ikon = this.m.ikonHarita[urunId];
    if (!ikon) return;
    // Tek patch: ikon, takılı yazının ya da ikonun yerine geçer (eklenemezse önceki tasarım geri gelir)
    var onceki = this.m.tekPatch ? kopyala(this.t) : null;
    var yerineGecti = onceki ? this.tekPatchBosalt(true) : null;
    if (this.parcaEkle('icon', ikon.id, ikon.varyant, ikon)) {
      this.sonIkon = ikon;
      olayYayinla('ikon_eklendi', { urun_id: this.m.urun.id, ikon_id: ikon.id, ikon_adi: ikon.ad });
      if (yerineGecti) this.bildir(TEK_PATCH_NOTU + ' ' + ikon.ad + ', ' + yerineGecti + ' yerine geçti.', { sure: 4000 });
    } else if (onceki) {
      this.t = onceki;
      this.isimGirdisiniEsitle();
      this.yenile();
    }
  };

  // Tek patch'lik üründe yeni patch öncekinin yerine geçer: takılı ikon (ve ikon=true ise yazı) yenilemeden kaldırılır.
  // Dönüş: kaldırılanın kısa adı ("A harfi", "Kalp") ya da null
  Editor.prototype.tekPatchBosalt = function (ikon) {
    var t = this.t;
    var m = this.m;
    var ad = null;
    if (ikon && t.isim) {
      var h = Array.from(t.isim)[0];
      ad = h + (RAKAM_DESENI.test(h) ? ' rakamı' : ' harfi');
      karakterleriHizala(t, '');
      t.bolSabit = false;
      t.bosluk = null;
      t.isimMerkez = null;
      this.seciliKarakter = null;
      this.isimGirdisiniEsitle();
    }
    if (t.parcalar.length) {
      var p = t.parcalar[0];
      var tanim = p.tip === 'icon' ? m.ikonHarita[p.urunId] : null;
      ad = ad || (tanim ? tanim.ad : 'önceki patch');
      t.parcalar = [];
      t.hazirSetler = [];
    }
    if (ad) {
      this.durum = duzenle(m, this.yer, t);
      if (this.secili) this.sec(null);
    }
    return ad;
  };

  Editor.prototype.isimGirdisiniEsitle = function () {
    var girdi = this.el && this.el.querySelector('[data-kp-isim]');
    if (girdi && girdi.value !== girdiDegeri(this.t)) girdi.value = girdiDegeri(this.t);
  };

  Editor.prototype.parcaKaldir = function (uid) {
    this.t.parcalar = this.t.parcalar.filter(function (p) { return p.uid !== uid; });
    if (this.t.aksesuarlar) this.t.aksesuarlar = this.t.aksesuarlar.filter(function (a) { return a.uid !== uid; });
    setleriTemizle(this.m, this.t);
    this.yenile();
  };

  // Setin patch'lerini sırayla uygun boş yerlere yerleştirir. dolu: mevcut geçerli parçalar.
  // hizli: ızgaradaki "Yer aç" denetimi (kaba arama). Sonuç: [[cx, cy], ...] ya da null.
  // Sonuç: her patch için [cx, cy] ya da null (yer yok → kenar)
  Editor.prototype.setYerlestir = function (st, dolu) {
    var yer = this.yer;
    var alan = this.m.alanBul('icon');
    var c = alan ? merkez(alan.sekil) : [0, 0];
    var yerlesmis = dolu.slice();
    return st.patchler.map(function (p) {
      var ornek = parcaSekli(p, p.varyant, 0, 0);
      var tasima = alan && yer.enYakin([{ tip: 'icon', sekil: kaydir(ornek, c[0], c[1]) }], yerlesmis, 0, 0);
      if (!tasima) return null;
      var sekil = kaydir(ornek, c[0] + tasima[0], c[1] + tasima[1]);
      yerlesmis.push({ tip: 'icon', sekil: sekil });
      return merkez(sekil);
    });
  };

  // Hazır seti ekler: patch'ler birlikte, uygun boş yerlere; her biri ayrı sürüklenip döndürülebilir
  Editor.prototype.setEkle = function (urunId) {
    var st = this.m.hazirSetHarita[urunId];
    if (!st) return;
    var self = this;
    var dolu = this.durum.parcalar.filter(function (p) { return !p.kenar; });
    var konumlar = this.setYerlestir(st, dolu);
    // Aksesuar ekranında kenar yok: setin hepsi sığmıyorsa eklenmez
    if (this.alt && konumlar.some(function (k) { return !k; })) {
      this.bildir(st.ad + ' seti ' + aksesuarTuru(this.secenek.aksesuar).toLocaleLowerCase('tr-TR') + ' üzerine sığmıyor.', { sure: 4000 });
      return;
    }
    var id = yeniId('S');
    var alan = this.m.alanBul('icon');
    var c = alan ? merkez(alan.sekil) : [0, 0];
    st.patchler.forEach(function (p, i) {
      var k = konumlar[i];
      var parca = { uid: yeniId('i'), tip: 'icon', urunId: p.id, varyantId: p.varyant.id, cx: k ? k[0] : c[0], cy: k ? k[1] : c[1], setGrup: id };
      if (!k) parca.kenar = true;
      self.t.parcalar.push(parca);
      sonaAl(self.t, parca.uid);
    });
    var cantada = konumlar.filter(Boolean).length;
    var kenarda = konumlar.length - cantada;
    if (!this.t.hazirSetler) this.t.hazirSetler = [];
    this.t.hazirSetler.push({ id: id, urunId: st.id });
    // Kısa süre sarı kesikli çerçeve ve "[Set] seti" etiketi
    this.setCercevesi = id;
    clearTimeout(this.setCerceveZamanlayici);
    this.setCerceveZamanlayici = setTimeout(function () {
      self.setCercevesi = null;
      self.setCerceveCiz();
    }, 3000);
    olayYayinla('set_eklendi', { urun_id: this.m.urun.id, set_id: st.id, set_adi: st.ad });
    // Set ekleme tek geçmiş adımı; bildirimdeki "Geri al" o adımı geri alır (Yinele geri getirir)
    this.yenile();
    this.vurgula(this.t.parcalar.filter(function (p) { return p.setGrup === id; }).map(function (p) { return p.uid; }));
    var sonra = JSON.stringify(this.t);
    // Kombin: kenardakiler de kombinde, hediye Tshirt'e takılabilir
    var yerAdi = this.kombin ? 'sweatshirt\'te' : 'çantada';
    var kenarNotu = this.kombin ? ' Kenardakileri hediye Tshirt\'üne takabilirsin.' : '';
    this.bildir(
      st.ad + ' seti eklendi.' + (!kenarda ? '' : !cantada
        ? ' Alanda yer olmadığı için ' + kenarda + ' patch\'in hepsi kenarda.' + kenarNotu
        : ' ' + cantada + '\'' + sayiEki(cantada) + ' ' + yerAdi + ', ' + kenarda + '\'' + sayiEki(kenarda) + ' alanda yer olmadığı için kenarda.' + kenarNotu),
      { eylem: { yazi: 'Geri al', fn: function () { this.islemiGeriAl(sonra, function () { this.setKaldir(id); }); } } }
    );
  };

  // Sayıdan sonra iyelik/belirtme eki için: 1'i, 2'si, 3'ü, 4'ü, 5'i, 6'sı
  function sayiEki(n) {
    var ek = { 0: 'ı', 1: 'i', 2: 'si', 3: 'ü', 4: 'ü', 5: 'i', 6: 'sı', 7: 'si', 8: 'i', 9: 'u' };
    if (n % 10) return ek[n % 10];
    return { 1: 'u', 2: 'si', 3: 'u', 4: 'ı', 5: 'si', 6: 'ı', 7: 'i', 8: 'i', 9: 'ı' }[(n % 100) / 10] || 'ü';
  }

  Editor.prototype.setKaldir = function (setGrup) {
    this.t.parcalar = this.t.parcalar.filter(function (p) { return p.setGrup !== setGrup; });
    this.t.hazirSetler = (this.t.hazirSetler || []).filter(function (k) { return k.id !== setGrup; });
    if (this.setCercevesi === setGrup) this.setCercevesi = null;
    this.secili = null;
    this.yenile();
  };

  // Set çerçevesi: setin patch'lerinin ortak kutusu (önizleme koordinatında, %)
  Editor.prototype.setCerceveCiz = function () {
    var el = this.el.querySelector('[data-kp-set-cerceve]');
    var id = this.setCercevesi;
    var parcalar = id && this.durum ? this.durum.parcalar.filter(function (p) { return p.setGrup === id; }) : [];
    var kayit = id && (this.t.hazirSetler || []).filter(function (k) { return k.id === id; })[0];
    if (!parcalar.length || !kayit) {
      el.hidden = true;
      return;
    }
    var m = this.m;
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    parcalar.forEach(function (p) {
      var k = kutu(p.sekil);
      x1 = Math.min(x1, k.x); y1 = Math.min(y1, k.y); x2 = Math.max(x2, k.x + k.w); y2 = Math.max(y2, k.y + k.h);
    });
    var pay = 0.4;
    // Çerçeve sahne üzerindeki yakınlaştırmayla birlikte konumlanır
    var sahne = this.sahne.sahne;
    var ic = el.parentNode.getBoundingClientRect();
    var r = sahne.getBoundingClientRect();
    var px = function (cm, w, W) { return (cm / W) * w; };
    el.style.left = r.left - ic.left + px(x1 - pay, r.width, m.Wcm) + 'px';
    el.style.top = r.top - ic.top + px(y1 - pay, r.height, m.Hcm) + 'px';
    el.style.width = px(x2 - x1 + pay * 2, r.width, m.Wcm) + 'px';
    el.style.height = px(y2 - y1 + pay * 2, r.height, m.Hcm) + 'px';
    el.querySelector('.kp-set-cerceve__etiket').textContent = m.hazirSetHarita[kayit.urunId].ad + ' seti';
    el.hidden = false;
  };

  // Koyu onay kutusu (önizlemenin altında): metin, butonlar ve not
  Editor.prototype.onayGoster = function (metin, butonlar, not) {
    var kutu0 = this.el.querySelector('[data-kp-onay]');
    this.onayEylemleri = butonlar.map(function (b) { return b.eylem; });
    kutu0.innerHTML =
      '<p class="kp-onay__metin">' + kacis(metin) + '</p>' +
      '<div class="kp-onay__butonlar">' +
      butonlar.map(function (b, i) {
        return '<button type="button" class="kp-onay__buton' + (b.birincil ? ' kp-onay__buton--birincil' : '') + '" data-kp-onay-eylem="' + i + '">' + kacis(b.yazi) + '</button>';
      }).join('') +
      '</div>' +
      (not ? '<p class="kp-onay__not">' + kacis(not) + '</p>' : '');
    this.bildirimKapat();
    kutu0.hidden = false;
    this.onayAcik = true;
  };

  Editor.prototype.onayKapat = function () {
    var kutu0 = this.el.querySelector('[data-kp-onay]');
    if (kutu0) kutu0.hidden = true;
    this.onayAcik = false;
    this.onayEylemleri = null;
  };

  Editor.prototype.onayEylemi = function (i) {
    var eylem = this.onayEylemleri && this.onayEylemleri[i];
    this.onayKapat();
    if (typeof eylem === 'function') eylem.call(this);
  };

  /* ---------------- Patch'i aksesuarın tasarımına aktarma ---------------- */

  // Çantadaki noktanın aksesuarın kendi tasarımındaki karşılığı (aksesuarDunyaParcalari'nin tersi)
  function aksesuarYerelNokta(am, p, wx, wy) {
    var d = p.tanim.dis;
    var pc = merkez(p.sekil);
    var r = dondurNokta([wx, wy], pc, -(p.aci || 0));
    var dcx = ((d.x + d.w / 2) / 100) * am.m.Wcm;
    var dcy = ((d.y + d.h / 2) / 100) * am.m.Hcm;
    var k = d.en / ((am.m.Wcm * d.w) / 100);
    return [dcx + (r[0] - pc[0]) / k, dcy + (r[1] - pc[1]) / k];
  }

  // Sürüklenen patch (tasarımdaki tek bir ikon ya da rakam) çantadaki bir aksesuarın Velcro yüzeyinin üstünde mi?
  // Sonuç: aksesuar parçası (durum.parcalar'dan) ya da null
  Editor.prototype.aksesuarHedefi = function (grup, tasinmis) {
    if (this.alt || !tasinmis || !tasinmis.length) return null;
    if (!this.t.parcalar.some(function (x) { return x.uid === grup; })) return null;
    var m = this.m;
    var c = merkez(tasinmis[0].sekil);
    var bulunan = null;
    this.durum.parcalar.forEach(function (p) {
      if (bulunan || p.tip !== 'aksesuar' || p.kenar || !p.tanim.tasarlanabilir) return;
      var am = m.aksesuarModeli(p.tanim.id);
      var alan = am && am.m.alanBul('icon');
      if (!alan) return;
      var y = aksesuarYerelNokta(am, p, c[0], c[1]);
      if (noktaIcinde(y[0], y[1], alan.sekil)) bulunan = p;
    });
    return bulunan;
  };

  // Sürüklerken hedef aksesuar vurgulanır
  Editor.prototype.aksesuarHedefiCiz = function (uid) {
    if (!this.sahne || !this.sahne.katman) return;
    this.sahne.katman.querySelectorAll('.kp-parca--hedef').forEach(function (x) {
      if (x.getAttribute('data-uid') !== uid) x.classList.remove('kp-parca--hedef');
    });
    if (uid) {
      var el = this.sahne.katman.querySelector('[data-uid="' + uid + '"]');
      if (el) el.classList.add('kp-parca--hedef');
    }
  };

  // Patch'i (wx, wy noktasında bırakıldı) altındaki aksesuarın tasarımına taşır. Aksesuarda o noktada yer yoksa
  // en yakın boş yere; hiç yer yoksa taşımaz (false). Tek geçmiş adımı; bildirimde "Geri al".
  Editor.prototype.aksesuaraAktar = function (grup, wx, wy, aci) {
    var t = this.t;
    var parca = t.parcalar.filter(function (x) { return x.uid === grup; })[0];
    if (!parca) return false;
    var c0 = this.durum.parcalar.filter(function (x) { return x.uid === grup; })[0];
    if (!c0) return false;
    var hedef = this.aksesuarHedefi(grup, [kopyaParca(c0, { sekil: kaydir(c0.sekil, wx - merkez(c0.sekil)[0], wy - merkez(c0.sekil)[1]) })]);
    if (!hedef) return false;
    var aks = (t.aksesuarlar || []).filter(function (a) { return a.uid === hedef.uid; })[0];
    var am = this.m.aksesuarModeli(hedef.tanim.id);
    if (!aks || !am) return false;
    var y = aksesuarYerelNokta(am, hedef, wx, wy);
    var ic = kopyala(aks.tasarim || bosTasarim(am.m));
    if (!ic.parcalar) ic.parcalar = [];
    var yeni = { uid: parca.uid, tip: parca.tip, urunId: parca.urunId, varyantId: parca.varyantId, cx: y[0], cy: y[1], aci: aciNormal((aci != null ? aci : parca.aci || 0) - (hedef.aci || 0)) };
    ic.parcalar.push(yeni);
    var ad = this.grupAdi(grup);
    var tur = aksesuarTuru(hedef.tanim).toLocaleLowerCase('tr-TR');
    var d = duzenle(am.m, am.yer, ic);
    if (d.hatalar[yeni.uid]) {
      var pp = d.parcalar.filter(function (x) { return x.uid === yeni.uid; });
      var diger = d.parcalar.filter(function (x) { return x.uid !== yeni.uid && !x.kenar && !d.hatalar[x.uid]; });
      var t0 = pp.length && am.yer.enYakin(pp, diger, 0, 0);
      if (!t0) {
        this.bildir(ad + ' için ' + tur + ' üzerinde yer yok.', { sure: 3500 });
        return false;
      }
      yeni.cx += t0[0];
      yeni.cy += t0[1];
    }
    sonaAl(ic, yeni.uid);
    t.parcalar = t.parcalar.filter(function (x) { return x.uid !== grup; });
    aks.tasarim = ic;
    sonaAl(t, aks.uid);
    var setBozuldu = parca.setGrup && (t.hazirSetler || []).some(function (k) { return k.id === parca.setGrup; });
    if (this.setCercevesi && parca.setGrup === this.setCercevesi) this.setCercevesi = null;
    this.secili = null;
    this.yenile();
    var sonra = JSON.stringify(this.t);
    var eski = JSON.parse(JSON.stringify(parca));
    var aksUid = aks.uid;
    this.bildir(ad + ', ' + tur + ' tasarımına eklendi.' + (setBozuldu ? ' Set bozuldu, patch\'ler tek tek fiyatlanır.' : ''), {
      eylem: { yazi: 'Geri al', fn: function () {
        this.islemiGeriAl(sonra, function () {
          // Sonradan başka değişiklik yapıldıysa yalnızca bu patch çantadaki eski yerine döner
          (this.t.aksesuarlar || []).forEach(function (a) {
            if (a.uid === aksUid && a.tasarim) a.tasarim.parcalar = (a.tasarim.parcalar || []).filter(function (x) { return x.uid !== eski.uid; });
          });
          if (!this.t.parcalar.some(function (x) { return x.uid === eski.uid; })) this.t.parcalar.push(eski);
          this.yenile();
        });
      } }
    });
    return true;
  };

  // Bildirimdeki "Geri al": işlemden sonra başka değişiklik yapılmadıysa geçmişteki o adım geri alınır (Yinele geri getirir).
  // Yapıldıysa yedek çalışır (yalnızca o işlemin etkisini geri alır); yedek yoksa yine son adım geri alınır.
  Editor.prototype.islemiGeriAl = function (sonra, yedek) {
    if ((JSON.stringify(this.t) === sonra || !yedek) && this.geriYigin && this.geriYigin.length) return this.geriAl();
    if (yedek) yedek.call(this);
  };

  /* ---------------- Kaydırınca küçülen önizleme ---------------- */

  // Yalnızca telefonda ve İkon / Aksesuar adımlarında (Yazı adımında yazı alanı ve klavye var)
  Editor.prototype.kucultulebilir = function () {
    if (this.adim !== 'ikon' && this.adim !== 'aksesuar') return false;
    return !(window.matchMedia && window.matchMedia('(min-width: 990px)').matches);
  };

  // kucuk: önizleme ~140 px; çanta ve patch'ler orantılı küçülür, sağ altta "Büyüt"
  Editor.prototype.onizlemeBoyutu = function (kucuk) {
    kucuk = !!kucuk && this.kucultulebilir();
    if (!this.el || !!this.kucuk === kucuk) return;
    // Küçülünce panel büyür; listenin altına aynı kadar boşluk eklenir ki liste kaymaya devam etsin
    // (yoksa en üste sıçrar ve önizleme hemen yeniden büyür)
    if (kucuk) this.el.style.setProperty('--kp-kucuk-bosluk', Math.max(0, this.el.querySelector('.kp-onizleme__ic').offsetHeight - KUCUK_ONIZLEME) + 'px');
    this.kucuk = kucuk;
    this.boyutZamani = Date.now();
    this.el.classList.toggle('kp-editor--kucuk', kucuk);
    this.el.querySelector('[data-kp-buyut]').hidden = !kucuk;
    this.balonGizle();
    var self = this;
    // Geçiş bitince piksel konumlu çerçeveler yeniden hesaplanır
    clearTimeout(this.boyutZamanlayici);
    this.yerlestirBalonGizle();
    this.boyutZamanlayici = setTimeout(function () {
      self.setCerceveCiz();
      self.secimGuncelle();
      self.yerlestirBalonCiz();
    }, 320);
  };

  Editor.prototype.kaydirmaKontrol = function (k, onceki) {
    // Boyut değişirken panelin yüksekliği de değişir; bu sıradaki kaydırma olayları yok sayılır
    if (Date.now() - (this.boyutZamani || 0) < 450) return;
    var y = k.scrollTop;
    if (!this.kucuk) {
      // Parmak kalktıktan sonra süren kaydırma (momentum) da sayılır
      var kullanici = Date.now() - (this.sonKaydirma || 0) < 1500;
      if (kullanici && y > 12 && y > onceki && k.scrollHeight - k.clientHeight > 30 && this.kucultulebilir()) this.onizlemeBoyutu(true);
    } else if (y <= 0 && onceki > 0) {
      this.onizlemeBoyutu(false);
    }
  };

  // Küçük önizlemede yeni eklenen patch'ler kısa bir an vurgulanır
  Editor.prototype.vurgula = function (uidler) {
    if (!this.kucuk || !uidler || !uidler.length) return;
    var katman = this.sahne.katman;
    uidler.forEach(function (uid) {
      var x = katman.querySelector('[data-uid="' + uid + '"]');
      if (x) x.classList.add('kp-parca--yeni');
    });
    setTimeout(function () {
      katman.querySelectorAll('.kp-parca--yeni').forEach(function (x) { x.classList.remove('kp-parca--yeni'); });
    }, 1300);
  };

  /* ---------------- Yenileme ---------------- */

  // Önizleme görseli yüklenip çözülünce (en geç ms sonra) tamamlanır
  Editor.prototype.gorselHazir = function (ms) {
    var img = this.el && this.el.querySelector('.kp-sahne__urun');
    return new Promise(function (bitir) {
      if (!img) return bitir();
      var sure = setTimeout(bitir, ms || 2500);
      var tamam = function () {
        clearTimeout(sure);
        bitir();
      };
      var coz = function () {
        if (img.decode) img.decode().then(tamam, tamam);
        else tamam();
      };
      if (img.complete && img.naturalWidth) return coz();
      img.addEventListener('load', coz, { once: true });
      img.addEventListener('error', tamam, { once: true });
    });
  };

  Editor.prototype.yenile = function () {
    if (!this.el || this.el.hidden) return;
    // Bekleyen "geçersiz açı" önizlemesi varsa kapat; dönüş sürmüyorsa açı göstergesi gizlenir
    clearTimeout(this.donmeZamanlayici);
    if (!this.sahne.sahne.classList.contains('kp-sahne--donuyor')) this.aciGostergesiGizle();
    // Türkçe karakterler otomatik çevrilir (stokta patch'i yoksa); yazı alanı çevrilmiş hali gösterir, imleç yerinde kalır
    if (turkceCevir(this.m, this.t)) {
      var girdi = this.el.querySelector('[data-kp-isim]');
      if (girdi && girdi.value !== girdiDegeri(this.t)) {
        var odakta = document.activeElement === girdi;
        var bas = girdi.selectionStart;
        var son = girdi.selectionEnd;
        girdi.value = girdiDegeri(this.t);
        if (odakta && bas != null) try { girdi.setSelectionRange(bas, son); } catch (e) { /* yok say */ }
      }
    }
    yaziyiDagit(this.m, this.yer, this.t);
    this.analiz = isimAnaliz(this.m, this.yer, this.t);
    setleriTemizle(this.m, this.t);
    this.durum = duzenle(this.m, this.yer, this.t);
    this.kenarCevabiDenetle();
    this.stokSorunlari = stokKontrol(this.m, this.t, this.yer, 1);
    var alanHatali = !this.durum.isimGecerli || Object.keys(this.durum.hatalar).length > 0;
    this.sahne.ciz(this.durum.parcalar, this.durum.hatalar, alanHatali);
    this.dugmeleriGuncelle();
    this.yaziDurumGuncelle();
    this.etiketleriCiz();
    this.gecButonlariGuncelle();
    this.ikonDurumGuncelle();
    this.kampanyaGuncelle();
    var f = fiyatHesapla(this.m, this.yer, this.t);
    if (this.alt) this.altToplamCiz(f);
    else this.toplamCiz(f.toplam);
    var ileri = this.el.querySelector('[data-kp-ileri]');
    // Tasarım ekranında "Tasarımı tamamla →" her zaman çalışır; sorunlar Özet'te sepete eklerken durdurulur
    var engel = this.alt ? this.adimEngeli(this.adim) : false;
    if (this.adim === 'ozet') {
      var self = this;
      // Yeri uygun olmayan her patch (ayrılmış harfler dahil) sepete eklemeyi durdurur
      engel = this.adimlar.some(function (a) { return self.adimEngeli(a.id); }) || this.hataliGruplar().length > 0;
    }
    ileri.setAttribute('aria-disabled', engel ? 'true' : 'false');
    ileri.classList.toggle('kp-alt__ileri--engelli', !!engel);
    if (this.adim === 'ozet') this.ozetCiz();
    // Özet'te geçersiz konumda patch varsa "Sepete ekle" yerine "Hepsini düzelt / Tasarıma dön"
    var ozetEngel = !this.alt && this.adim === 'ozet' && !bosMu(this.t) && this.hataliGruplar().length > 0;
    var engelEl = this.el.querySelector('[data-kp-alt-engel]');
    if (engelEl) engelEl.hidden = !ozetEngel;
    ileri.hidden = ozetEngel;
    this.seritCiz();
    this.kazancKontrol(this.kampanyaSonucu());
    this.ileriYazisi();
    this.secimGuncelle();
    this.setCerceveCiz();
    this.kenarCiz();
    this.yerUyariCiz();
    this.yerlestirBalonCiz();
    if (this.kombin) this.kombinCiz();
    this.gecmisKaydet();
  };

  /* ---------------- Geri al / Yinele ---------------- */

  var GECMIS_SINIRI = 60;

  // Her yenilemede tasarım değiştiyse önceki hali geçmişe girer. Yazı yazarken art arda tuşlar tek adım sayılır.
  Editor.prototype.gecmisKaydet = function () {
    if (!this.geriYigin) this.geriYigin = [];
    if (!this.ileriYigin) this.ileriYigin = [];
    var simdi = JSON.stringify(this.t);
    if (this.gecmisSimdi == null) {
      this.gecmisSimdi = simdi;
    } else if (simdi !== this.gecmisSimdi) {
      var yazi = this.yaziZamani && Date.now() - this.yaziZamani < 100;
      var birlestir = yazi && this.sonDegisimYazi && Date.now() - this.sonDegisimZamani < 1500;
      if (!birlestir) {
        this.geriYigin.push(this.gecmisSimdi);
        if (this.geriYigin.length > GECMIS_SINIRI) this.geriYigin.shift();
      }
      this.ileriYigin = [];
      this.gecmisSimdi = simdi;
      this.sonDegisimYazi = !!yazi;
      this.sonDegisimZamani = Date.now();
    }
    this.gecmisDugmeleri();
  };

  Editor.prototype.gecmisDugmeleri = function () {
    var g = this.el.querySelector('[data-kp-geri-al]');
    var y = this.el.querySelector('[data-kp-yinele]');
    if (g) g.disabled = !this.geriYigin.length;
    if (y) y.disabled = !this.ileriYigin.length;
  };

  Editor.prototype.gecmisUygula = function (durum) {
    this.t = JSON.parse(durum);
    if (this.kombin) this.kombinModelEsitle();
    this.gecmisSimdi = durum;
    this.secili = null;
    this.seciliKarakter = null;
    this.sonDegisimYazi = false;
    this.onayKapat();
    this.bildirimKapat();
    var girdi = this.el.querySelector('[data-kp-isim]');
    if (girdi && girdi.value !== (this.t.isim || '')) girdi.value = this.t.isim || '';
    this.yenile();
  };

  Editor.prototype.gecmisUygulaYeni = function (durum) {
    this.t = JSON.parse(durum);
    if (this.kombin) this.kombinModelEsitle();
    var girdi = this.el.querySelector('[data-kp-isim]');
    if (girdi && girdi.value !== (this.t.isim || '')) girdi.value = this.t.isim || '';
    this.secili = null;
    this.yenile();
  };

  Editor.prototype.geriAl = function () {
    if (!this.geriYigin || !this.geriYigin.length) return;
    this.ileriYigin.push(this.gecmisSimdi);
    this.gecmisUygula(this.geriYigin.pop());
  };

  Editor.prototype.yinele = function () {
    if (!this.ileriYigin || !this.ileriYigin.length) return;
    this.geriYigin.push(this.gecmisSimdi);
    this.gecmisUygula(this.ileriYigin.pop());
  };

  /* ---------------- Geçersiz konum ve kenar ---------------- */

  // Geçersiz yerdeki gruplar (seçili grup önce)
  Editor.prototype.hataliGruplar = function () {
    var d = this.durum;
    var gruplar = [];
    d.parcalar.forEach(function (p) { if (d.hatalar[p.uid] && gruplar.indexOf(p.grup) === -1) gruplar.push(p.grup); });
    var secili = this.secili;
    if (secili && gruplar.indexOf(secili) > 0) gruplar = [secili].concat(gruplar.filter(function (g) { return g !== secili; }));
    return gruplar;
  };

  Editor.prototype.grupAdi = function (grup) {
    var b = this.grupBilgisi(grup);
    return b ? this.patchAdi(b) : '';
  };

  // Geçersiz bir grubun sorununu anlatan cümle
  Editor.prototype.sorunMetni = function (grup) {
    var d = this.durum;
    var p = d.parcalar.filter(function (x) { return x.grup === grup && d.sorunlar && d.sorunlar[x.uid]; })[0];
    var s0 = p ? d.sorunlar[p.uid] : { tur: 'tasma' };
    var ad = this.grupAdi(grup);
    if (s0.tur === 'yasak') return ad + ' takılamayan bir bölgeye geliyor.';
    if (s0.tur === 'cakisma') {
      var diger = this.grupAdi(s0.ile);
      return diger && diger !== ad ? ad + ', ' + diger + ' ile üst üste geliyor.' : ad + ' başka bir patch\'in üstüne geliyor.';
    }
    return ad + ' Velcro alanın dışına taşıyor.';
  };

  // Önizlemenin altındaki kısa uyarı: "H ve A üst üste geliyor. Sepete eklemeden önce düzeltmen yeterli." + "Hepsini düzelt".
  // Tek tek düzeltme önizlemedeki "Alana yerleştir" butonlarıyla.
  Editor.prototype.yerUyariCiz = function () {
    var kutu = this.el.querySelector('[data-kp-yer-uyari]');
    if (!kutu) return;
    var gruplar = this.hataliGruplar();
    if (!gruplar.length) {
      kutu.hidden = true;
      kutu.innerHTML = '';
      return;
    }
    var html =
      '<p class="kp-yer-uyari__metin"><span class="kp-yer-uyari__ikon" aria-hidden="true">!</span>' +
      kacis(this.yerUyariMetni(gruplar)) + ' Sepete eklemeden önce düzeltmen yeterli.</p>' +
      '<div class="kp-yer-uyari__butonlar">' +
      '<button type="button" class="kp-oneri kp-oneri--ikincil" data-kp-hepsini-duzelt>Hepsini düzelt</button>' +
      '</div>';
    kutu.hidden = false;
    if (kutu.innerHTML !== html) kutu.innerHTML = html;
  };

  // "E harfi alanın dışına taşıyor." / "E harfi ve Futbol Topu üst üste geliyor." / "H, A ve 1 patch daha üst üste geliyor."
  Editor.prototype.yerUyariMetni = function (gruplar) {
    var d = this.durum;
    var self = this;
    var sorun = function (g) {
      var p = d.parcalar.filter(function (x) { return x.grup === g && d.sorunlar && d.sorunlar[x.uid]; })[0];
      return p ? d.sorunlar[p.uid] : { tur: 'tasma' };
    };
    var turler = gruplar.map(function (g) { return sorun(g).tur; });
    var tur = turler.every(function (x) { return x === turler[0]; }) ? turler[0] : 'karisik';
    var adlar = gruplar.slice();
    // Tek patch başka bir patch'in üstüne geliyorsa ikisinin adı
    if (adlar.length === 1 && tur === 'cakisma') {
      var ile = sorun(adlar[0]).ile;
      if (ile && ile !== adlar[0]) adlar.push(ile);
    }
    var yazilar = adlar.map(function (g) {
      var ad = self.grupAdi(g);
      return adlar.length > 1 ? ad.replace(/ harfi$/, '') : ad;
    });
    var birlesik = yazilar.length === 1 ? yazilar[0]
      : yazilar.length === 2 && yazilar[0] === yazilar[1] ? 'İki ' + self.grupAdi(adlar[0])
      : yazilar.length === 2 ? yazilar[0] + ' ve ' + yazilar[1]
      : yazilar[0] + ', ' + yazilar[1] + ' ve ' + (yazilar.length - 2) + ' patch daha';
    var fiil = tur === 'cakisma' ? (adlar.length > 1 ? 'üst üste geliyor' : 'başka bir patch\'in üstüne geliyor')
      : tur === 'yasak' ? 'takılamayan bir bölgeye geliyor'
      : tur === 'tasma' ? 'alanın dışına taşıyor'
      : 'uygun yerde değil';
    return birlesik + ' ' + fiil + '.';
  };

  // Önizlemedeki "Alana yerleştir": geçersiz patch'lerin (birbirine yakın olanlar tek buton) hemen altında
  Editor.prototype.yerlestirBalonCiz = function () {
    var katman = this.el && this.el.querySelector('[data-kp-yerlestir-katman]');
    if (!katman) return;
    var gorunum = this.el.querySelector('.kp-gorunum');
    var ic = this.el.querySelector('.kp-onizleme__ic');
    if (!gorunum || !ic || this.el.hidden || !this.durum) return;
    var d = this.durum;
    var gruplar = this.hataliGruplar().filter(function (g) { return !d.parcalar.some(function (p) { return p.grup === g && p.kenar; }); });
    // Hatalı grup yoksa ölçüm yapma (her tuşta zorunlu yerleşim hesabını önler)
    if (!gruplar.length) {
      if (katman.innerHTML) katman.innerHTML = '';
      return;
    }
    var g0 = gorunum.getBoundingClientRect();
    var i0 = ic.getBoundingClientRect();
    if (!g0.width) {
      if (katman.innerHTML) katman.innerHTML = '';
      return;
    }
    // Her grubun ekrandaki kutusu
    var kutular = [];
    gruplar.forEach(function (g) {
      var k = null;
      d.parcalar.forEach(function (p) {
        if (p.grup !== g) return;
        var el = gorunum.querySelector('[data-uid="' + (window.CSS && CSS.escape ? CSS.escape(p.uid) : p.uid) + '"]');
        if (!el) return;
        var r = el.getBoundingClientRect();
        k = k ? { l: Math.min(k.l, r.left), t: Math.min(k.t, r.top), r: Math.max(k.r, r.right), b: Math.max(k.b, r.bottom) } : { l: r.left, t: r.top, r: r.right, b: r.bottom };
      });
      if (k) kutular.push({ gruplar: [g], k: k });
    });
    // Birbirine yakın (32 px) olanlar tek küme
    var YAKIN = 32;
    var degisti = true;
    while (degisti) {
      degisti = false;
      for (var a = 0; a < kutular.length && !degisti; a++) {
        for (var b = a + 1; b < kutular.length; b++) {
          var x = kutular[a].k;
          var y = kutular[b].k;
          if (x.l - YAKIN < y.r && y.l - YAKIN < x.r && x.t - YAKIN < y.b && y.t - YAKIN < x.b) {
            kutular[a] = { gruplar: kutular[a].gruplar.concat(kutular[b].gruplar), k: { l: Math.min(x.l, y.l), t: Math.min(x.t, y.t), r: Math.max(x.r, y.r), b: Math.max(x.b, y.b) } };
            kutular.splice(b, 1);
            degisti = true;
            break;
          }
        }
      }
    }
    var html = kutular.map(function (k) {
      return '<button type="button" class="kp-yerlestir-balon" data-kp-yerlestir-balon="' + kacis(k.gruplar.join('|')) + '">' +
        '<span class="kp-yerlestir-balon__ikon" aria-hidden="true">!</span>Alana yerleştir</button>';
    }).join('');
    if (katman.innerHTML !== html) katman.innerHTML = html;
    var dugmeler = katman.querySelectorAll('[data-kp-yerlestir-balon]');
    kutular.forEach(function (k, i) {
      var el = dugmeler[i];
      var w = el.offsetWidth;
      var h = el.offsetHeight;
      var bosluk = 6;
      // Önizlemenin görünen alanı içinde kalsın: altta yer yoksa patch'in üstüne
      var ust = k.k.b + bosluk;
      if (ust + h > g0.bottom - 4) ust = k.k.t - h - bosluk;
      ust = Math.max(g0.top + 4, Math.min(g0.bottom - h - 4, ust));
      var sol = (k.k.l + k.k.r) / 2 - w / 2;
      sol = Math.max(g0.left + 4, Math.min(g0.right - w - 4, sol));
      el.style.left = Math.round(sol - i0.left) + 'px';
      el.style.top = Math.round(ust - i0.top) + 'px';
    });
  };

  Editor.prototype.yerlestirBalonGizle = function () {
    var katman = this.el && this.el.querySelector('[data-kp-yerlestir-katman]');
    if (katman && katman.innerHTML) katman.innerHTML = '';
  };

  // Önizlemedeki butondan: kümedeki geçersiz patch'leri en yakın uygun yere (yer yoksa kenara)
  Editor.prototype.gruplariDuzelt = function (gruplar) {
    var self = this;
    var kenara = 0;
    gruplar.forEach(function (g) {
      self.durum = duzenle(self.m, self.yer, self.t);
      var d = self.durum;
      if (!d.parcalar.some(function (p) { return p.grup === g && d.hatalar[p.uid]; })) return;
      if (!self.alanaYerlestir(g, false)) kenara++;
    });
    this.yenile();
    if (kenara) this.bildir(this.alt ? 'Bazı patch\'ler için yer yok. Birini kaldırıp tekrar dene.' : kenara + ' patch için çantada yer yok, kenara alındı.', { sure: 3500 });
  };

  // Grubu (yazı, harf, ikon ya da aksesuar) dx, dy kadar kaydırır
  Editor.prototype.grubuKaydir = function (grup, ornek, dx, dy) {
    if (blokGrubu(grup)) {
      var b = grupBlogu(grup);
      var c = this.blokMerkezi(b);
      this.t[BLOK_ALAN[b].merkez] = [c[0] + dx, c[1] + dy];
    } else {
      konumKaydir(this.t, ornek, dx, dy);
    }
  };

  // Geçersiz grubu en yakın geçerli yere taşır; yer yoksa kenara alır. yenile: false ise yalnızca tasarımı değiştirir.
  Editor.prototype.alanaYerlestir = function (grup, yenileme) {
    var d = this.durum;
    var parcalar = d.parcalar.filter(function (p) { return p.grup === grup; });
    if (!parcalar.length) return false;
    var diger = d.parcalar.filter(function (p) { return p.grup !== grup && !p.kenar; });
    var t0 = parcalar[0].kenar ? null : this.yer.enYakin(parcalar, diger, 0, 0);
    if (t0) this.grubuKaydir(grup, parcalar[0], t0[0], t0[1]);
    else if (!this.alt) kenaraAl(this.t, grup);
    if (yenileme !== false) {
      this.yenile();
      if (!t0) this.bildir(this.alt ? this.grupAdi(grup) + ' için yer yok. Başka bir patch\'i taşı ya da kaldır.' : this.grupAdi(grup) + ' için çantada yer yok, kenara alındı.', { sure: 3500 });
    }
    return !!t0;
  };

  // Tüm geçersiz patch'ler: önce patch'ler, sonra aksesuarlar; her biri en yakın geçerli yere ya da kenara
  Editor.prototype.hepsiniDuzelt = function () {
    var kenaraGiden = 0;
    for (var i = 0; i < 60; i++) {
      this.durum = duzenle(this.m, this.yer, this.t);
      var d = this.durum;
      var gruplar = this.hataliGruplar();
      if (!gruplar.length) break;
      var aksesuarMi = function (g) { return d.parcalar.some(function (p) { return p.grup === g && p.tip === 'aksesuar'; }); };
      var sira = gruplar.filter(function (g) { return !aksesuarMi(g); }).concat(gruplar.filter(aksesuarMi));
      if (!this.alanaYerlestir(sira[0], false)) {
        kenaraGiden++;
        // Aksesuar ekranında kenar yok: yer bulunamayan patch yerinde kalır
        if (this.alt) break;
      }
    }
    this.yenile();
    this.bildir(this.alt && kenaraGiden ? 'Bazı patch\'ler için yer yok. Birini kaldırıp tekrar dene.' : kenaraGiden ? 'Patch\'ler düzeltildi. ' + kenaraGiden + ' tanesine çantada yer olmadığı için kenara alındı.' : 'Patch\'ler düzeltildi.', { sure: 3500 });
  };

  // Kenardaki grubu çantada boş bir yere yerleştirmeyi dener (yerleşmiş patch'ler oynamaz)
  Editor.prototype.kenardanYerlestir = function (grup) {
    var d = this.durum;
    var t = kopyala(this.t);
    var alan = this.m.alanBul('icon') || this.m.alanBul('letter');
    if (!alan) return false;
    var c = blokGrubu(grup) ? this.blokYeri(grupBlogu(grup), t).merkez : merkez(alan.sekil);
    kenardanAl(t, grup, c[0], c[1]);
    var parcalar = this.yer.parcalar(t).filter(function (p) { return p.grup === grup; });
    var diger = d.parcalar.filter(function (p) { return p.grup !== grup && !p.kenar; });
    if (!parcalar.length) return false;
    var t0 = this.yer.enYakin(parcalar, diger, 0, 0);
    if (!t0) return false;
    kenardanAl(this.t, grup, c[0] + t0[0], c[1] + t0[1]);
    return true;
  };

  // "Sığdırmayı dene": kenardakileri sırayla boş yerlere koyar
  Editor.prototype.sigdirmayiDene = function () {
    var yerlesen = 0;
    var kalan = 0;
    var gruplar = this.kenarGruplari().map(function (k) { return k.grup; });
    var self = this;
    gruplar.forEach(function (g) {
      self.durum = duzenle(self.m, self.yer, self.t);
      if (self.kenardanYerlestir(g)) yerlesen++;
      else kalan++;
    });
    this.yenile();
    this.bildir(!yerlesen ? 'Çantada boş yer yok, patch\'ler kenarda kaldı.' : kalan ? yerlesen + ' tanesi çantaya yerleşti, ' + kalan + ' tanesi kenarda kaldı.' : 'Hepsi çantaya yerleşti.', { sure: 3500 });
  };

  // Kenardaki gruplar, tasarımdaki sırayla: [{ grup, parcalar }]
  Editor.prototype.kenarGruplari = function () {
    var liste = [];
    var bul = {};
    (this.durum ? this.durum.parcalar : []).forEach(function (p) {
      if (!p.kenar) return;
      if (!bul[p.grup]) {
        bul[p.grup] = { grup: p.grup, parcalar: [] };
        liste.push(bul[p.grup]);
      }
      bul[p.grup].parcalar.push(p);
    });
    return liste;
  };

  // Kenar şeridi (önizlemenin alt kenarında; boşken gizli) ve paneldeki not
  Editor.prototype.kenarCiz = function () {
    var listeEl = this.el.querySelector('[data-kp-kenar-liste]');
    if (!listeEl) return;
    var kenarEl = this.el.querySelector('[data-kp-kenar]');
    var secili = this.secili;
    var gruplar = this.kenarGruplari();
    var self = this;
    var html = gruplar.map(function (k) {
      var ad = self.grupAdi(k.grup);
      var ic = k.parcalar.map(function (p) {
        var g = p.tip === 'aksesuar' ? p.tanim.gorsel.kucuk : p.varyant && p.varyant.gorsel;
        var oran = p.sekil.t === 'circle' ? 1 : (p.en || 1) / (p.boy || 1);
        return '<span class="kp-kenar__parca' + (p.sekil.t === 'circle' ? ' kp-parca--daire' : '') + (p.tip === 'aksesuar' ? ' kp-kenar__parca--aksesuar' : '') + '" style="--oran:' + oran.toFixed(3) + '">' +
          (g ? '<img src="' + kacis(g) + '" alt="" draggable="false">' : '<span>' + kacis(p.etiket) + '</span>') + '</span>';
      }).join('');
      return '<button type="button" class="kp-kenar__oge' + (secili === k.grup ? ' kp-kenar__oge--secili' : '') + '" data-kp-kenar-grup="' + kacis(k.grup) + '" aria-label="' + kacis(ad) + ', kenarda. Çantaya sürükleyebilirsin.">' + ic + '</button>';
    }).join('');
    if (listeEl.innerHTML !== html) listeEl.innerHTML = html;
    var not = this.el.querySelector('[data-kp-kenar-not]');
    var patch = 0;
    var aks = 0;
    gruplar.forEach(function (k) { k.parcalar.forEach(function (p) { if (p.tip === 'aksesuar') aks++; else patch++; }); });
    var sayi = [patch ? patch + ' patch' : '', aks ? aks + ' aksesuar' : ''].filter(Boolean).join(' · ');
    var sayiEl = this.el.querySelector('[data-kp-kenar-sayi]');
    if (sayiEl.textContent !== sayi) sayiEl.textContent = sayi;
    // Özet'te "Evet, ekle" ile hepsi eklendiyse fiyata dahil
    var t = this.t;
    var ogeler = this.kenarOgeleri();
    var hepsiDahil = ogeler.length && t.kenarCevap === 'evet' && ogeler.every(function (o) { return o.gruplar.some(function (g) { return (t.kenarAl || []).indexOf(g) !== -1; }); });
    var fiyatEl = this.el.querySelector('[data-kp-kenar-fiyat]');
    var fiyatYazi = this.kombin ? 'kombine dahil' : hepsiDahil ? 'fiyata dahil' : 'fiyata dahil değil';
    if (fiyatEl.textContent !== fiyatYazi) fiyatEl.textContent = fiyatYazi;
    var dolu = !!(patch || aks);
    if (kenarEl.hidden === dolu) kenarEl.hidden = !dolu;
    if (!dolu) {
      not.hidden = true;
      not.innerHTML = '';
      return;
    }
    var parca = [patch ? patch + ' patch' : '', aks ? aks + ' aksesuar' : ''].filter(Boolean).join(' ve ');
    var notHtml = (this.kombin
      ? '<p>Bu patch\'leri hediye Tshirt\'üne takabilirsin. Kombine dahil, sepete birlikte gelir.</p>'
      : '<p>Kenarda ' + parca + ' var. Fiyata dahil değil; istersen Özet\'te sepete ekleyebilirsin.</p>') +
      '<button type="button" class="kp-oneri kp-oneri--ikincil" data-kp-sigdir>Sığdırmayı dene</button>';
    not.hidden = false;
    if (not.innerHTML !== notHtml) not.innerHTML = notHtml;
  };

  // Kenardaki bir öğeyi çantaya sürükleme (dokununca seçilir)
  Editor.prototype.kenarBagla = function () {
    var self = this;
    var liste = this.el.querySelector('[data-kp-kenar-liste]');
    if (!liste) return;
    var aktif = null;
    function sahneUstunde(x, y) {
      var r = self.sahne.gorunum.getBoundingClientRect();
      var kr = self.el.querySelector('[data-kp-kenar]').getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= Math.min(r.bottom, kr.top);
    }
    function bitir() {
      if (aktif && aktif.hayalet) aktif.hayalet.remove();
      self.sahne.gorunum.classList.remove('kp-gorunum--hedef');
      aktif = null;
    }
    liste.addEventListener('pointerdown', function (e) {
      var oge = e.target.closest('[data-kp-kenar-grup]');
      if (!oge || (e.pointerType === 'mouse' && e.button !== 0)) return;
      aktif = { id: e.pointerId, grup: oge.getAttribute('data-kp-kenar-grup'), oge: oge, x: e.clientX, y: e.clientY, hareket: false };
    });
    liste.addEventListener('pointermove', function (e) {
      if (!aktif || e.pointerId !== aktif.id) return;
      if (!aktif.hareket) {
        // Yatay kaydırma şeridin kendisine bırakılır; yukarı (çantaya doğru) sürükleme başlatır
        if (Math.abs(e.clientY - aktif.y) < 8) return;
        aktif.hareket = true;
        try { liste.setPointerCapture(e.pointerId); } catch (err) { /* yok say */ }
        var r = aktif.oge.getBoundingClientRect();
        var h = aktif.oge.cloneNode(true);
        h.className += ' kp-kenar__hayalet';
        h.style.width = r.width + 'px';
        h.style.height = r.height + 'px';
        document.body.appendChild(h);
        aktif.hayalet = h;
        aktif.dx = r.left + r.width / 2 - aktif.x;
        aktif.dy = r.top + r.height / 2 - aktif.y;
      }
      e.preventDefault();
      var hx = e.clientX + aktif.dx;
      var hy = e.clientY + aktif.dy;
      aktif.hayalet.style.transform = 'translate(' + (hx - aktif.hayalet.offsetWidth / 2) + 'px,' + (hy - aktif.hayalet.offsetHeight / 2) + 'px)';
      self.sahne.gorunum.classList.toggle('kp-gorunum--hedef', sahneUstunde(e.clientX, e.clientY));
    });
    liste.addEventListener('pointerup', function (e) {
      if (!aktif || e.pointerId !== aktif.id) return;
      var a = aktif;
      bitir();
      if (!a.hareket) return self.etiketSec(a.grup);
      if (!sahneUstunde(e.clientX, e.clientY)) return;
      var r = self.sahne.sahne.getBoundingClientRect();
      var cx = ((e.clientX + a.dx - r.left) / r.width) * self.m.Wcm;
      var cy = ((e.clientY + a.dy - r.top) / r.height) * self.m.Hcm;
      if (self.aksesuaraAktar(a.grup, cx, cy)) return;
      kenardanAl(self.t, a.grup, cx, cy);
      sonaAl(self.t, a.grup);
      self.secili = a.grup;
      self.yenile();
    });
    liste.addEventListener('pointercancel', bitir);
  };

  // Ayır / Birleştir (yazı alanındaki ve araç çubuğundaki buton aynı işi yapar). Yazı seçiliyse seçim de geçer:
  // ayırınca ilk harfe, birleştirince bloğa. Tasarım değiştiği için Geri al / Yinele kapsar.
  // Ayır / Birleştir. Önizlemede seçili bir blok ya da harf varsa yalnızca onun bloğu; yazı alanındaki
  // butondan (seçim yokken) tüm yazı.
  Editor.prototype.harfModDegistir = function (tumu) {
    var t = this.t;
    if (Array.from(t.isim || '').length < 2) return;
    var sec = String(this.secili || '');
    var yaziSecili = blokGrubu(sec) || sec.indexOf('harf-') === 0;
    var b = !tumu && yaziSecili ? (blokGrubu(sec) ? grupBlogu(sec) : harfBlogu(t, parseInt(sec.slice(5), 10))) : null;
    var ayiriyor = b != null ? !blokAyri(t, b) : yaziBloklari(t).some(function (bl) { return !blokAyri(t, bl.b); });
    if (ayiriyor) harfleriAyir(this.yer, t, b);
    else harfleriBirlestir(t, b);
    if (yaziSecili) {
      var bl = yaziBloklari(t)[b || 0] || { bas: 0, b: 0 };
      this.secili = ayiriyor ? 'harf-' + bl.bas : BLOK_ALAN[bl.b].grup;
      this.seciliHarf = ayiriyor ? bl.bas : null;
    }
    this.yenile();
    // İlk kez ayırınca bir kez kısa bilgi
    if (ayiriyor && !depoOku('kp-harf-ayir-bilgi')) {
      depoYaz('kp-harf-ayir-bilgi', 1);
      this.bildir('Harfler ayrıldı, her birini tek tek taşıyabilirsin.', { sure: 3500 });
    }
  };

  /* ---------------- Önizlemeyi indir (masaüstü) ---------------- */

  // Ürün görseli ve takılı patch'ler (aksesuarlar ve üzerlerindeki patch'ler dahil) tuvale önizlemedeki konum, boyut ve
  // açıyla çizilir; alan çizgileri, alan adları, seçim çerçevesi ve kenardaki patch'ler yoktur. Görseller mağazanın
  // kendi alan adından gelir (tuval kirlenmez); patch görselleri çıktı boyutuna göre daha büyük istenir.
  var INDIR_GENISLIK = 1800;

  function indirGorseli(url, px) {
    if (!url) return url;
    if (!px || !GENISLIK_DESENI.test(url)) return url;
    return url.replace(GENISLIK_DESENI, '$1width=' + Math.min(1200, Math.max(300, Math.ceil(px / 100) * 100)));
  }

  function gorselYukle(url) {
    return new Promise(function (tamam, hata) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { tamam(img); };
      img.onerror = function () { hata(new Error('Görsel yüklenemedi: ' + url)); };
      img.src = url;
    });
  }

  // Görseli kutuya (w × h) orantısını koruyarak ortalar (CSS object-fit: contain)
  function sigdirCiz(ctx, img, x, y, w, h) {
    var o = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    var iw = img.naturalWidth * o;
    var ih = img.naturalHeight * o;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }

  // Bir parça (patch ya da aksesuar), sahne koordinatlarında (cm) ve pxCm ölçeğinde; ctx sahnenin sol üstündedir
  function parcaTuvaleCiz(ctx, m, p, pxCm, gorseller) {
    var c = merkez(p.sekil);
    var en = p.en;
    var boy = p.boy;
    if (p.sekil.t === 'circle') en = boy = p.sekil.r * 2;
    if (!en || !boy) {
      var k = kutu(p.sekil);
      en = k.w;
      boy = k.h;
    }
    var w = en * pxCm;
    var h = boy * pxCm;
    ctx.save();
    ctx.translate(c[0] * pxCm, c[1] * pxCm);
    if (p.aci) ctx.rotate((p.aci * Math.PI) / 180);
    if (p.tip === 'aksesuar') {
      // Aksesuar görseli dış ölçü kutusuna oturur (kanca vb. taşabilir); iç patch'ler görselin kendi ölçeğinde
      var aks = p.tanim;
      var d = aks.dis;
      var gx = -w / 2 + (-d.x / d.w) * w;
      var gy = -h / 2 + (-d.y / d.h) * h;
      var gw = (w * 100) / d.w;
      var gh = (h * 100) / d.h;
      var ag = gorseller[aks.gorsel.buyuk || aks.gorsel.kucuk];
      if (ag) ctx.drawImage(ag, gx, gy, gw, gh);
      var am = p.icTasarim && m.aksesuarModeli && m.aksesuarModeli(aks.id);
      if (am) {
        ctx.translate(gx, gy);
        am.yer.parcalar(p.icTasarim).filter(function (ip) { return !ip.kenar; }).forEach(function (ip) {
          parcaTuvaleCiz(ctx, am.m, ip, gw / am.m.Wcm, gorseller);
        });
      }
      ctx.restore();
      return;
    }
    // Önizlemedeki gibi: köşeler hafif yuvarlak (daire patch'te daire), JPG patch beyaz zeminli
    ctx.beginPath();
    if (p.sekil.t === 'circle') ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
    else if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.06);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.clip();
    if (p.varyant && !p.varyant.png) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    var g = p.varyant && gorseller[p.varyant.gorsel];
    if (g) sigdirCiz(ctx, g, -w / 2, -h / 2, w, h);
    else if (p.etiket) {
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '700 ' + Math.round(h * 0.6) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.etiket, 0, 0);
    }
    ctx.restore();
  }

  // Dosya adı: "Çok Amaçlı Mini Çanta / Sarı Çizgili" → jantifox-tasarim-cok-amacli-mini-canta-sari-cizgili.png
  function indirDosyaAdi(baslik) {
    var tr = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u' };
    var ad = String(baslik || '').toLocaleLowerCase('tr-TR').replace(/[çğıiöşü]/g, function (h) { return tr[h]; })
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return 'jantifox-tasarim' + (ad ? '-' + ad : '') + '.png';
  }

  Editor.prototype.onizlemeIndir = function (dugme) {
    var self = this;
    var m = this.m;
    if (!this.sahne || this.indiriliyor) return;
    var parcalar = (this.sahne.cizilenler || []).filter(function (p) { return !p.kenar; });
    var W = INDIR_GENISLIK;
    var H = Math.round((W * m.gorsel.boy) / m.gorsel.en);
    var pxCm = W / m.Wcm;
    // Yüklenecek görseller: ürün, patch'ler (çıktıdaki genişliklerine göre), aksesuarlar ve üzerlerindeki patch'ler
    var istek = {};
    var urunUrl = m.gorsel.dev || m.gorsel.buyuk || m.gorsel.kucuk;
    istek[urunUrl] = urunUrl;
    var ekle = function (mm, p, olcek) {
      if (p.tip === 'aksesuar') {
        var aks = p.tanim;
        var url = aks.gorsel.buyuk || aks.gorsel.kucuk;
        istek[url] = url;
        var am = p.icTasarim && mm.aksesuarModeli && mm.aksesuarModeli(aks.id);
        if (am) {
          var gw = ((p.en || 0) * olcek * 100) / aks.dis.w;
          am.yer.parcalar(p.icTasarim).forEach(function (ip) { if (!ip.kenar) ekle(am.m, ip, gw / am.m.Wcm); });
        }
        return;
      }
      var g = p.varyant && p.varyant.gorsel;
      if (g) istek[g] = indirGorseli(g, Math.max(p.en || 0, p.boy || 0) * olcek * 2);
    };
    parcalar.forEach(function (p) { ekle(m, p, pxCm); });
    var anahtarlar = Object.keys(istek);
    this.indiriliyor = true;
    if (dugme) dugme.setAttribute('aria-busy', 'true');
    var bitir = function () {
      self.indiriliyor = false;
      if (dugme) dugme.removeAttribute('aria-busy');
    };
    Promise.all(anahtarlar.map(function (k) {
      // Büyük boyut yüklenemezse önizlemedeki adres denenir
      return gorselYukle(istek[k]).catch(function () { return istek[k] !== k ? gorselYukle(k) : Promise.reject(); });
    })).then(function (imgs) {
      var gorseller = {};
      anahtarlar.forEach(function (k, i) { gorseller[k] = imgs[i]; });
      var tuval = document.createElement('canvas');
      tuval.width = W;
      tuval.height = H;
      var ctx = tuval.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(gorseller[urunUrl], 0, 0, W, H);
      parcalar.forEach(function (p) { parcaTuvaleCiz(ctx, m, p, pxCm, gorseller); });
      tuval.toBlob(function (blob) {
        bitir();
        if (!blob) return self.bildir('Önizleme indirilemedi, lütfen tekrar dene.');
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = indirDosyaAdi(m.urun.baslik);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        olayYayinla('onizleme_indirildi', { urun_id: m.urun.id, patch: parcalar.length });
      }, 'image/png');
    }).catch(function () {
      bitir();
      self.bildir('Önizleme indirilemedi, lütfen tekrar dene.');
    });
  };

  Editor.prototype.dugmeleriGuncelle = function () {
    var t0 = this.t;
    var ayri = yaziBloklari(t0).length > 0 && yaziBloklari(t0).every(function (bl) { return blokAyri(t0, bl.b); });
    var harfSayisi = Array.from(this.t.isim || '').length;
    var b = this.el.querySelector('[data-kp-harf-mod]');
    var girdi = this.el.querySelector('[data-kp-isim]');
    if (b && girdi) {
      b.hidden = harfSayisi < 2;
      // Ayır: dışa oklar; Birleştir: içe oklar
      var html = ayri
        ? '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M3 12h6M6 9l3 3-3 3M21 12h-6M18 9l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Birleştir</span>'
        : '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M10 12H3M6 9l-3 3 3 3M14 12h7M18 9l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Ayır</span>';
      if (b.innerHTML !== html) b.innerHTML = html;
      b.setAttribute('aria-pressed', ayri ? 'true' : 'false');
      b.setAttribute('aria-label', ayri ? 'Harfleri birleştir' : 'Harfleri ayır');
      // Yazı butonun altına girmesin: sağ iç boşluk butonun sol kenarına göre
      // Ölçüm yalnızca etkileyen bir şey değiştiğinde yapılır (her tuşta zorunlu yerleşim hesabını önler)
      var kap = this.el.querySelector('[data-kp-kapasite]');
      // Buton görünürken konumu sabittir (sağdan); sayacın genişliği yalnızca buton gizliyken etkiler
      var anahtar = [b.hidden, ayri, b.hidden && kap ? kap.textContent : '', this.el.className, window.innerWidth, window.innerHeight].join('|');
      if (this._dolguAnahtar !== anahtar) {
        var gr = girdi.getBoundingClientRect();
        var sol = b.hidden ? kap.getBoundingClientRect().left : b.getBoundingClientRect().left;
        if (gr.width) {
          girdi.style.paddingRight = Math.max(48, Math.round(gr.right - sol + 8)) + 'px';
          this._dolguAnahtar = anahtar;
        } else this._dolguAnahtar = null;
      }
    }
    var gorunum = this.el.querySelector('[data-kp-gorunum]');
    gorunum.hidden = !this.sahne.yakinlasabilir;
    gorunum.textContent = this.sahne.yakin ? 'Tüm ürünü gör' : 'Alana yakınlaş';
    gorunum.setAttribute('aria-pressed', this.sahne.yakin ? 'false' : 'true');
  };

  // Renk noktaları: çok renkli sette bir harfin stoktaki renkleri (en az boyut CSS'te)
  function renkNoktalari(set, t, i, h, sinif) {
    var liste = set.karakterVaryantlari[h] || [];
    var secili = harfVaryanti(set, t, i, h);
    if (liste.length <= 1) {
      return liste.length
        ? '<span class="kp-nokta kp-nokta--pasif ' + sinif + '" style="--renk:' + kacis(liste[0].renkKodu || '#ccc') + '" title="' + kacis(liste[0].renk || '') + '"></span>'
        : '';
    }
    return liste
      .map(function (v) {
        var on = secili && String(secili.id) === String(v.id);
        return '<button type="button" class="kp-nokta ' + sinif + '" style="--renk:' + kacis(v.renkKodu || '#ccc') + '" data-kp-renk="' + i + ':' + kacis(v.id) + '" aria-pressed="' + on + '" aria-label="' + kacis((v.renk || '') + ' ' + h) + '" title="' + kacis(v.renk || '') + '"></button>';
      })
      .join('');
  }

  // Harflerin (rakamlar hariç) şu anki stili: hepsi aynı setteyse o set, değilse 'karisik'
  function harfStilDurumu(m, t) {
    var harfler = Array.from(t.isim || '');
    var setler = {};
    harfler.forEach(function (h, i) {
      if (RAKAM_DESENI.test(h)) return;
      var set = karakterSeti(m, t, i, h);
      if (set) setler[set.id] = true;
    });
    var idler = Object.keys(setler);
    return idler.length === 0 ? null : idler.length === 1 ? idler[0] : 'karisik';
  }

  // Yazının altındaki karakter kartları: her karakter gerçek patch görünümüyle, altında stil adı
  // ("Cool", Piramit'te renk noktası + "Piramit", rakamlarda "Rakam"); stili değişebilen kartın köşesinde kalem.
  // Üstte "Hepsi Cool / Hepsi Piramit / Karışık". Bir harf seçiliyken stil seçimi ve Piramit rengi tek satırda.
  Editor.prototype.karakterleriCiz = function () {
    var m = this.m;
    var t = this.t;
    var harfler = Array.from(t.isim || '');
    var kutu = this.el.querySelector('[data-kp-karakterler]');
    var secili = this.seciliKarakter;
    var cokSet = m.setler.length > 1;
    var html = harfler
      .map(function (h, i) {
        var set = karakterSeti(m, t, i, h);
        var v = set ? harfVaryanti(set, t, i, h) : null;
        var on = secili === i;
        var rakam = RAKAM_DESENI.test(h);
        var stil = rakam ? 'Rakam' : stilAdi(set);
        var nokta = set && set.cokRenkli && v ? '<span class="kp-karakter__nokta" style="--renk:' + kacis(v.renkKodu || '#ccc') + '" aria-hidden="true"></span>' : '';
        return (
          '<button type="button" class="kp-karakter' + (on ? ' kp-karakter--secili' : '') + (!v ? ' kp-karakter--yok' : '') + '" data-kp-karakter="' + i + '" aria-pressed="' + on + '" aria-label="' + (i + 1) + '. karakter ' + kacis(h) + ', ' + kacis(stil) + (v && v.renk && set.cokRenkli ? ' ' + kacis(v.renk) : '') + (!rakam && cokSet ? ', stilini değiştir' : '') + '">' +
          (!rakam && cokSet ? '<span class="kp-karakter__kalem" aria-hidden="true"><svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg></span>' : '') +
          '<span class="kp-karakter__gorsel">' + (v && v.gorsel ? '<img ' + gorselKaynak(v.gorsel, 38) + ' alt="" draggable="false">' : '<span class="kp-karakter__harf">' + kacis(h) + '</span>') + '</span>' +
          '<span class="kp-karakter__stil">' + nokta + kacis(stil) + '</span>' +
          '</button>'
        );
      })
      .join('');
    kutu.hidden = !harfler.length;
    icerikEsitle(kutu, html);

    // Hepsi Cool / Hepsi Piramit / Karışık
    var secim = this.el.querySelector('[data-kp-stil-secim]');
    var durum = harfStilDurumu(m, t);
    if (secim) {
      var secimHtml = !durum || !cokSet ? '' : m.setler.map(function (st) {
        return '<button type="button" class="kp-stil-secim__dugme" data-kp-hepsi="' + kacis(st.id) + '" aria-pressed="' + (durum === String(st.id)) + '">' + kacis(stilAdi(st)) + ' Alfabe</button>';
      }).join('') + '<button type="button" class="kp-stil-secim__dugme" data-kp-karisik aria-pressed="' + (durum === 'karisik') + '">Karışık</button>';
      secim.hidden = !secimHtml;
      if (secim.innerHTML !== secimHtml) secim.innerHTML = secimHtml;
    }

    var panel = this.el.querySelector('[data-kp-stil-panel]');
    var h = secili != null ? harfler[secili] : null;
    // Rakamlarda set seçimi yok
    if (h == null || RAKAM_DESENI.test(h)) {
      panel.hidden = true;
      panel.innerHTML = '';
      return;
    }
    var set = karakterSeti(m, t, secili, h);
    var setler = m.setler
      .map(function (s) {
        var v = s.cokRenkli ? (s.karakterVaryantlari[h] || [])[0] : s.karakterler[h];
        var yok = !v || (!s.cokRenkli && !stoktaMi(v));
        var on = s === set;
        return (
          '<button type="button" class="kp-stil__set" data-kp-stil="' + kacis(s.id) + '" aria-pressed="' + on + '"' + (yok && !on ? ' disabled' : '') + '>' +
          '<span class="kp-stil__ornek">' + (v && v.gorsel ? '<img ' + gorselKaynak(v.gorsel, 30) + ' alt="">' : '<span>' + kacis(h) + '</span>') + '</span>' +
          '<span class="kp-stil__ad">' + kacis(stilAdi(s)) + (yok ? ' <small>yok</small>' : '') + '</span>' +
          '</button>'
        );
      })
      .join('');
    var etiket = (secili + 1) + '. harf ' + kacis(h);
    var renkler = set.cokRenkli
      ? '<div class="kp-stil__renk-satir">' +
        '<span class="kp-stil__renk-baslik">' + etiket + ' · ' + kacis(stilAdi(set)) + ' rengi</span>' +
        '<div class="kp-stil__renkler" role="group" aria-label="' + kacis(h) + ' harfinin rengi">' + renkNoktalari(set, t, secili, h, 'kp-nokta--buyuk') +
        '<button type="button" class="kp-karistir" data-kp-karistir aria-label="Tüm renkleri karıştır" title="Tüm renkleri karıştır"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 7h3.5c2.2 0 3.6 1 4.8 3l2.4 4c1.2 2 2.6 3 4.8 3H21M3 17h3.5c1.4 0 2.5-.4 3.4-1.2M14.1 8.2C15 7.4 16.1 7 17.5 7H21M18 4l3 3-3 3M18 14l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div>'
      : '';
    var yeni =
      (cokSet ? '<p class="kp-stil__baslik">' + etiket + ' · Stil</p><div class="kp-stil__setler" role="group" aria-label="Stil">' + setler + '</div>' : '') + renkler;
    panel.hidden = !yeni;
    if (panel.innerHTML !== yeni) panel.innerHTML = yeni;
  };

  // "Hepsi Cool / Hepsi Piramit": tüm harfler (rakamlar hariç) tek seferde o sete; Piramit'te renkler otomatik
  Editor.prototype.tumHarflerStil = function (setId) {
    var t = this.t;
    var harfler = Array.from(t.isim || '');
    var set = this.m.set(setId);
    if (!set) return;
    if (!Array.isArray(t.karakterSetleri)) t.karakterSetleri = [];
    harfler.forEach(function (h, i) {
      if (RAKAM_DESENI.test(h)) return;
      t.karakterSetleri[i] = set.id;
      if (Array.isArray(t.harfRenkleri)) t.harfRenkleri[i] = null;
    });
    t.setId = set.id;
    this.yenile();
  };

  // "Karışık": harfleri tek tek değiştirmek için ilk harfin stil seçimi açılır
  Editor.prototype.karisikSec = function () {
    var harfler = Array.from(this.t.isim || '');
    for (var i = 0; i < harfler.length; i++) {
      if (!RAKAM_DESENI.test(harfler[i])) {
        this.seciliKarakter = i;
        break;
      }
    }
    this.yenile();
    var panel = this.el.querySelector('[data-kp-stil-panel]');
    if (panel && !panel.hidden && panel.scrollIntoView) panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  // Karakter kartı: aynı karta tekrar dokununca panel kapanır
  Editor.prototype.karakterSec = function (i) {
    this.seciliKarakter = this.seciliKarakter === i ? null : i;
    this.yenile();
  };

  // Seçili karakterin stili; seçilen set sonraki harflerin de varsayılanı olur
  Editor.prototype.karakterStiliSec = function (setId) {
    var i = this.seciliKarakter;
    var t = this.t;
    if (i == null) return;
    var adet = Array.from(t.isim || '').length;
    if (!Array.isArray(t.karakterSetleri)) t.karakterSetleri = [];
    while (t.karakterSetleri.length < adet) t.karakterSetleri.push(t.setId);
    t.karakterSetleri[i] = setId;
    t.setId = setId;
    if (t.harfRenkleri) t.harfRenkleri[i] = null;
    this.yenile();
  };

  Editor.prototype.renkSec = function (i, id) {
    if (!this.t.harfRenkleri) this.t.harfRenkleri = [];
    this.t.harfRenkleri[i] = id;
    renkleriAta(this.m, this.t, false, i);
    this.seciliHarf = i;
    this.yenile();
  };

  Editor.prototype.renkleriKaristir = function () {
    renkleriAta(this.m, this.t, true);
    this.yenile();
  };

  Editor.prototype.yaziDurumGuncelle = function () {
    this.karakterleriCiz();
    var a = this.analiz;
    var harfSayisi = a.harfler.length;
    var kapasite = this.el.querySelector('[data-kp-kapasite]');
    kapasite.textContent = harfSayisi + ' / ' + a.kapasite;
    kapasite.classList.toggle('kp-kapasite--asim', harfSayisi > a.kapasite);
    var uyarilar = [];
    var ad = function (h) { return h + (RAKAM_DESENI.test(h) ? ' rakamı' : ' harfi'); };
    if (this.yaziIpucu) uyarilar.push('<p class="kp-uyari kp-uyari--bilgi">' + kacis(this.yaziIpucu) + '</p>');
    // Otomatik Türkçe karakter çevirisi: küçük gri tek satır
    var cevNot = ceviriNotu(this.t);
    if (cevNot) uyarilar.push('<p class="kp-yazi-notu" data-kp-ceviri-notu>' + kacis(cevNot) + '</p>');
    if (this.gecersizKarakter) {
      uyarilar.push('<p class="kp-yazi-notu" data-kp-gecersiz-notu>Bu karakterin patch\'i yok.</p>');
    }
    if (this.m.metinSiniri && !this.m.tekPatch && harfSayisi >= this.m.metinSiniri) {
      uyarilar.push('<p class="kp-uyari kp-uyari--bilgi" data-kp-sinir-notu>Bu ürüne en fazla ' + this.m.metinSiniri + ' karakter yazılabilir.</p>');
    }
    a.yoklar.forEach(function (h) {
      var rakam = RAKAM_DESENI.test(h);
      uyarilar.push(
        '<div class="kp-uyari kp-uyari--hata"><p>' + ad(h) + (rakam ? ' şu an yok.' : ' bu stilde şu an yok.') + '</p>' +
        '<div class="kp-uyari__butonlar"><button type="button" class="kp-oneri" data-kp-harf-sil data-harf="' + h + '">' + h + (rakam ? ' rakamını sil' : ' harfini sil') + '</button></div></div>'
      );
    });
    a.stokSorunlari.forEach(function (s) {
      uyarilar.push(
        '<p class="kp-uyari kp-uyari--hata">' +
        (s.renk
          ? kacis(s.renk + ' ' + s.harf) + ' rengi için stokta ' + s.mevcut + ' adet var, isimde ' + s.gereken + ' kez seçili. Başka bir renk seçebilirsin.'
          : s.mevcut === 0
            ? ad(s.harf) + ' şu an stokta yok.'
            : s.harf + (RAKAM_DESENI.test(s.harf) ? ' rakamından' : ' harfinden') + ' stokta ' + s.mevcut + ' adet var, yazıda ' + s.gereken + ' kez geçiyor.') +
        '</p>'
      );
    });
    // Yazının yeri seçenekleri
    var secili = this.t.yaziYeri && this.t.yaziYeri !== 'oto' ? this.t.yaziYeri : 'oto';
    this.el.querySelectorAll('[data-kp-yazi-yeri]').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-kp-yazi-yeri') === secili ? 'true' : 'false');
    });
    if (a.bolunme && harfSayisi) {
      var bo = a.bolunme;
      uyarilar.push('<p class="kp-uyari kp-uyari--tamam" data-kp-bolunme-notu>\'' + kacis(bo.parcalar[0]) + '\' ' + kacis(alanYonelme(bo.alanlar[0])) + ', \'' +
        kacis(bo.parcalar[1]) + '\' ' + kacis(alanYonelme(bo.alanlar[1])) + ' yerleşti. Harfleri istediğin alana sürükleyebilirsin.</p>');
    }
    if (!a.sigiyor && harfSayisi && a.alanTasmasi) {
      var at = a.alanTasmasi;
      var diger = at.diger;
      uyarilar.push(
        '<div class="kp-uyari kp-uyari--hata" data-kp-alan-tasmasi><p>' + kacis(this.t.isim) + ' ' + kacis(alanYonelme(at.alan)) + ' sığmıyor (en fazla ' + at.kapasite + ' harf).</p>' +
        '<div class="kp-uyari__butonlar">' +
        '<button type="button" class="kp-oneri" data-kp-iki-alana-bol>İki alana böl</button>' +
        (diger ? '<button type="button" class="kp-oneri kp-oneri--ikincil" data-kp-alana-tasi="' + kacis(diger.id) + '">' + kacis(buyukBas(alanYonelme(diger))) + ' taşı</button>' : '') +
        '</div></div>'
      );
    } else if (!a.sigiyor && harfSayisi) {
      var ilk = a.harfler[0];
      uyarilar.push(
        '<div class="kp-uyari kp-uyari--hata"><p>' + kacis(this.t.isim) + ' bu ürüne sığmıyor (en fazla ' + a.kapasite + ' karakter).</p>' +
        '<div class="kp-uyari__butonlar">' +
        '<button type="button" class="kp-oneri" data-kp-bas-harf>Baş harf: ' + ilk + '</button>' +
        (this.m.rakamSeti() ? '<button type="button" class="kp-oneri" data-kp-bas-harf-rakam>Harf + rakam: ' + ilk + '7 gibi</button>' : '') +
        '<button type="button" class="kp-oneri kp-oneri--ikincil" data-kp-takma-ad>Takma ad yaz</button>' +
        '</div></div>'
      );
    }
    var kutu = this.el.querySelector('[data-kp-isim-uyari]');
    var yeni = uyarilar.join('');
    if (kutu.innerHTML !== yeni) kutu.innerHTML = yeni;
  };

  // Önizlemenin altındaki "eklenenler" satırı: isim, rakamlar ve ikonlar küçük etiketler olarak
  Editor.prototype.etiketleriCiz = function () {
    var kutu = this.el.querySelector('[data-kp-etiketler]');
    var self = this;
    var t = this.t;
    var secili = this.secili;
    var html = [];
    function cip(grup, ad, kaldir, hatali, seciliMi, kenarda) {
      var isaret = hatali ? '<span class="kp-cip__isaret" aria-hidden="true">⚠</span>' : kenarda ? '<span class="kp-cip__isaret" aria-hidden="true">↧</span>' : '';
      var durum = hatali ? ', yeri uygun değil' : kenarda ? ', kenarda' : '';
      return (
        '<span class="kp-cip' + (hatali ? ' kp-cip--hatali' : '') + (kenarda && !hatali ? ' kp-cip--kenar' : '') + (seciliMi ? ' kp-cip--secili' : '') + '">' +
        '<button type="button" class="kp-cip__ad" data-kp-etiket-sec="' + kacis(grup) + '" aria-pressed="' + !!seciliMi + '" aria-label="' + kacis(ad + durum) + '">' + isaret + kacis(ad) + '</button>' +
        '<button type="button" class="kp-cip__kaldir" ' + kaldir + ' aria-label="' + kacis(ad) + ' kaldır">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>' +
        '</span>'
      );
    }
    if (t.isim) {
      var isimHatali = !this.durum.isimGecerli || (this.analiz && this.analiz.engel);
      var isimSecili = blokGrubu(secili) || (secili && String(secili).indexOf('harf-') === 0);
      var isimKenar = this.durum.parcalar.some(function (p) { return yazidaMi(p) && p.kenar; });
      html.push(cip(harfGrubu(t, 0), t.isim, 'data-kp-isim-kaldir', isimHatali, isimSecili, isimKenar));
    }
    var saglam = saglamSetler(this.m, t);
    var setIdleri = saglam.map(function (k) { return k.id; });
    saglam.forEach(function (k) {
      var st = self.m.hazirSetHarita[k.urunId];
      var parcalar = self.durum.parcalar.filter(function (p) { return p.setGrup === k.id; });
      var hatali = parcalar.some(function (p) { return self.durum.hatalar[p.uid]; });
      var seciliMi = parcalar.some(function (p) { return p.grup === secili; });
      var kenarda = parcalar.some(function (p) { return p.kenar; });
      html.push(cip(parcalar[0] ? parcalar[0].grup : k.id, st.ad + ' seti · ' + parcalar.length, 'data-kp-set-kaldir="' + kacis(k.id) + '"', hatali, seciliMi, kenarda));
    });
    this.durum.parcalar
      .filter(function (p) { return !yazidaMi(p) && !(p.setGrup && setIdleri.indexOf(p.setGrup) !== -1); })
      .forEach(function (p) {
        var stok = self.stokSorunlari.some(function (s) { return s.parca.varyant === p.varyant; });
        var c0 = cip(p.grup, p.etiket, 'data-kp-kaldir="' + kacis(p.uid) + '"', !!self.durum.hatalar[p.uid] || stok, secili === p.grup, p.kenar);
        if (p.tip === 'aksesuar' && p.tanim.tasarlanabilir) {
          // Kalem: aksesuarın tasarım ekranına yeniden gir
          c0 = c0.replace('<button type="button" class="kp-cip__kaldir"', '<button type="button" class="kp-cip__duzenle" data-kp-aks-duzenle="' + kacis(p.uid) + '" aria-label="' + kacis(p.etiket) + ' tasarımını düzenle"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button><button type="button" class="kp-cip__kaldir"');
        }
        html.push(c0);
      });
    // Hiçbir şey eklenmemişken satır boş kalır
    var yeni = html.join('');
    icerikEsitle(kutu, yeni);
  };

  // Etikete dokununca o patch önizlemede seçilir
  Editor.prototype.etiketSec = function (grup) {
    if (this.secili === grup) return this.sec(null);
    this.sec(grup);
    this.etiketleriCiz();
  };

  // İkon ızgarası: her ikon ve set her zaman eklenebilir (yer yoksa kenara alınır); sıra kategorideki sıradır
  Editor.prototype.ikonDurumGuncelle = function () {};

  /* ---------------- Uyarı kutusu ---------------- */

  // Tüm uyarılar tek yerde: önizlemenin alt kısmında, araç çubuğunun üstünde koyu kutu.
  // sure: ms sonra kendiliğinden kapanır (0: sorun bitene kadar açık kalır)
  // Kısa bilgi bildirimi (önizlemenin altında). Süre 4,5 sn; "Geri al" gibi eylemli olanlar 6 sn.
  // anahtar: canlı uyarılar (ör. döndürme), aynı anahtarlı bildirim yerinde güncellenir ve anahtarla kapatılır.
  Editor.prototype.bildir = function (metin, secenek) {
    secenek = secenek || {};
    var b = { tur: 'diger', metin: metin, eylem: secenek.eylem || null, anahtar: secenek.anahtar || null };
    // Canlı uyarıların kendi süresi (0: kapatılana kadar)
    if (secenek.anahtar && secenek.sure != null) b.sure = secenek.sure;
    this.bildirimEkle(b);
  };

  Editor.prototype.bildirimEylemi = function () {
    var b = this.bildirimSimdiki;
    var fn = b && b.eylem ? b.eylem.fn : null;
    if (b) this.bildirimBitir(b, true);
    if (typeof fn === 'function') fn.call(this);
  };

  // anahtar verilirse yalnızca o sorunun uyarısı kapanır (sıradaki aynı anahtarlılar da düşer)
  Editor.prototype.bildirimKapat = function (anahtar) {
    var b = this.bildirimSimdiki;
    if (anahtar) this.bildirimSirasi = (this.bildirimSirasi || []).filter(function (x) { return x.anahtar !== anahtar; });
    if (!b || b.tur !== 'diger' || (anahtar && b.anahtar !== anahtar)) return;
    this.bildirimBitir(b, true);
  };

  /* ---------------- Bildirim kuyruğu ---------------- */

  // Tüm bildirimler sıraya girer, üst üste binmez: önce kampanya kazanma, sonra öneri, sonra diğerleri.
  // Aynı bildirim art arda tekrar etmez (gösterilen aynıysa süresi baştan başlar). Dokununca / fare üstündeyken
  // kaybolmaz, bırakınca süre baştan başlar. Giriş ~250 ms (alttan kayarak), çıkış ~200 ms (aşağı kayarak söner).
  var BILDIRIM_SURE = 4500;
  var BILDIRIM_EYLEMLI_SURE = 6000;
  var BILDIRIM_CIKIS = 200;
  var BILDIRIM_ONCELIK = { kazanc: 0, oneri: 1, diger: 2 };

  Editor.prototype.bildirimEkle = function (b) {
    if (!this.el) return;
    b.kimlik = b.tur + '|' + (b.anahtar || b.metin);
    if (b.sure == null) b.sure = b.eylem ? BILDIRIM_EYLEMLI_SURE : BILDIRIM_SURE;
    var simdi = this.bildirimSimdiki;
    if (simdi && simdi.kimlik === b.kimlik && !simdi.cikiyor) {
      // Aynısı gösteriliyor: içerik güncellenir, süre baştan
      simdi.metin = b.metin;
      simdi.eylem = b.eylem;
      simdi.sure = b.sure;
      simdi.anahtar = b.anahtar;
      this.bildirimCiz(simdi, false);
      this.bildirimZamanla(simdi);
      return;
    }
    var sira = this.bildirimSirasi || (this.bildirimSirasi = []);
    for (var i = 0; i < sira.length; i++) {
      if (sira[i].kimlik === b.kimlik) {
        sira[i] = b;
        return;
      }
    }
    if (!simdi) return this.bildirimGoster(b);
    sira.push(b);
    sira.sort(function (x, y) { return BILDIRIM_ONCELIK[x.tur] - BILDIRIM_ONCELIK[y.tur]; });
  };

  Editor.prototype.bildirimEl = function (b) {
    if (b.tur === 'diger') return this.el.querySelector('[data-kp-bildirim]');
    return (masaustuMu() && this.el.querySelector('[data-kp-kazanc-masa]')) || this.el.querySelector('[data-kp-kazanc]');
  };

  Editor.prototype.bildirimCiz = function (b, animasyon) {
    var el = b.el;
    var html;
    if (b.tur === 'diger') {
      html = '<span>' + kacis(b.metin) + '</span>' + (b.eylem ? ' <button type="button" class="kp-bildirim__eylem" data-kp-bildirim-eylem>' + kacis(b.eylem.yazi) + '</button>' : '');
    } else {
      // Masaüstünde kazanma bildirimi kısa: "✨ Ekstra %10 indirim açıldı · −351 TL"
      var metin = el.hasAttribute('data-kp-kazanc-masa') ? b.metin.replace(' · Tüm siparişinde ', ' · ') : b.metin;
      var i = metin.indexOf(' ');
      html = b.tur === 'kazanc'
        ? '<span class="kp-kazanc__ikon" aria-hidden="true">' + kacis(metin.slice(0, i)) + '</span><span>' + kacis(metin.slice(i + 1)) + '</span>'
        : '<span class="kp-kazanc__ikon" aria-hidden="true">🎯</span><span>' + kacis(metin) + '</span>';
      el.classList.toggle('kp-kazanc--oneri', b.tur === 'oneri');
    }
    if (el.innerHTML !== html) el.innerHTML = html;
    if (animasyon) {
      el.classList.remove('kp-bildirim-cikis', 'kp-bildirim-giris');
      void el.offsetWidth;
      el.classList.add('kp-bildirim-giris');
    }
  };

  Editor.prototype.bildirimGoster = function (b) {
    var el = this.bildirimEl(b);
    if (!el) return this.bildirimSiradaki();
    b.el = el;
    b.cikiyor = false;
    this.bildirimSimdiki = b;
    el.hidden = false;
    this.bildirimCiz(b, true);
    if (b.tur === 'kazanc' && b.ad) {
      var nokta = this.el.querySelector('.kp-kpanel [data-kp-durak="' + (window.CSS && CSS.escape ? CSS.escape(b.ad) : b.ad) + '"]');
      if (nokta) nokta.classList.add('kp-kpanel__durak--atim');
    }
    this.bildirimZamanla(b);
  };

  Editor.prototype.bildirimZamanla = function (b) {
    clearTimeout(this.bildirimZamanlayici);
    if (b.duraklat || !b.sure) return;
    var self = this;
    this.bildirimZamanlayici = setTimeout(function () { self.bildirimBitir(b); }, b.sure);
  };

  // Bildirimi kapatır (çıkış animasyonuyla; hemen: animasyonsuz) ve sıradakini gösterir
  Editor.prototype.bildirimBitir = function (b, hemen) {
    if (this.bildirimSimdiki !== b || b.cikiyor) return;
    clearTimeout(this.bildirimZamanlayici);
    b.cikiyor = true;
    var self = this;
    var el = b.el;
    var kapat = function () {
      el.hidden = true;
      el.classList.remove('kp-bildirim-giris', 'kp-bildirim-cikis');
      if (self.bildirimSimdiki === b) self.bildirimSimdiki = null;
      self.bildirimSiradaki();
    };
    if (hemen) return kapat();
    el.classList.remove('kp-bildirim-giris');
    el.classList.add('kp-bildirim-cikis');
    setTimeout(kapat, BILDIRIM_CIKIS);
  };

  Editor.prototype.bildirimSiradaki = function () {
    var sira = this.bildirimSirasi || [];
    while (sira.length) {
      var n = sira.shift();
      if (!this.el || this.el.hidden) continue;
      // Kampanya bildirimleri Özet'te gösterilmez; öneri yalnızca hâlâ güncel tasarıma aitse
      if (n.tur !== 'diger' && this.adim === 'ozet') continue;
      if (n.tur === 'oneri' && n.anahtar !== this.kampanyaAnahtari) continue;
      return this.bildirimGoster(n);
    }
  };

  // Dokununca / fare üstündeyken bekler; bırakınca süre baştan başlar
  Editor.prototype.bildirimDuraklat = function (el, dur) {
    var b = this.bildirimSimdiki;
    if (!b || b.el !== el || b.cikiyor) return;
    b.duraklat = !!dur;
    if (dur) clearTimeout(this.bildirimZamanlayici);
    else this.bildirimZamanla(b);
  };

  // Alan sınırı: normalde görünmez; sürüklerken soluk; alan dışına taşmada kalın kırmızı ve yanıp söner
  // Sürükleme / döndürme sırasında alan sınırı. Tek alanlı üründe taşmada alan kırmızı; çok alanlıda parçanın
  // bulunduğu alan belirginleşir, taşma ya da çakışmada yalnızca o alan kırmızı olur (parcalar: taşınan parçalar).
  Editor.prototype.sinirTasma = function (acik, parcalar, sorun) {
    var sahne = this.sahne.sahne;
    // Yasaklı bölge: taşınan (ya da döndürülen) parçalar yeni yerleriyle, diğerleri son çizildiği yerde
    var cizilen = this.sahne.cizilenler || [];
    if (parcalar && parcalar.length) {
      var tasinan = {};
      parcalar.forEach(function (p) { tasinan[p.uid] = true; });
      this.sahne.yasaklariIsaretle(cizilen.filter(function (p) { return !tasinan[p.uid]; }).concat(parcalar));
    } else {
      this.sahne.yasaklariIsaretle(cizilen);
    }
    if (this.m.alanlar.length > 1) {
      var aktif = null;
      if (parcalar && parcalar.length) {
        var c = merkez(parcalar[0].sekil);
        var a = this.m.noktaAlani(c[0], c[1]);
        aktif = a && a.id;
      }
      var kirmizi = {};
      if (aktif && (acik || sorun)) kirmizi[aktif] = true;
      this.sahne.alanlariIsaretle(kirmizi, aktif);
      return;
    }
    if (sahne.classList.contains('kp-sahne--tasma') === !!acik) return;
    sahne.classList.toggle('kp-sahne--tasma', !!acik);
  };

  // Grubun sorunu: 'tasma' (alanın dışında) ya da 'cakisma' (başka patch'in üstünde); geçerliyse null
  Editor.prototype.grupSorunu = function (parcalar, digerleri) {
    var yer = this.yer;
    var disarida = parcalar.some(function (p) { return !yer.alanaUygun(p.sekil, p.tip); });
    if (disarida) return 'tasma';
    return yer.grupGecerli(parcalar, digerleri) ? null : 'cakisma';
  };

  /* ---------------- Özet: kenardaki patch'ler ---------------- */

  // Kenardaki öğeler (Özet kartı için): her biri tek seçim. Tamamı kenarda olan set tek öğe; bir kısmı çantada olan
  // setin kenardaki patch'leri set fiyatına zaten dahil olduğu için listelenmez.
  // { anahtar, gruplar (t.kenarAl'a girecek grup adları), ad, parcalar }
  Editor.prototype.kenarOgeleri = function () {
    var self = this;
    var m = this.m;
    var d = this.durum;
    // Kombinde kenardakiler zaten dahil: Özet'te "bunları da alalım mı?" sorulmaz
    if (this.alt || !d || this.kombin) return [];
    var saglam = saglamSetler(m, this.t).map(function (k) { return k.id; });
    var setBagda = {};
    d.parcalar.forEach(function (p) { if (p.setGrup && saglam.indexOf(p.setGrup) !== -1 && !p.kenar) setBagda[p.setGrup] = true; });
    var liste = [];
    var bul = {};
    d.parcalar.forEach(function (p) {
      if (!p.kenar) return;
      var anahtar, grup, ad;
      if (p.setGrup && saglam.indexOf(p.setGrup) !== -1) {
        if (setBagda[p.setGrup]) return;
        var kayit = (self.t.hazirSetler || []).filter(function (x) { return x.id === p.setGrup; })[0];
        anahtar = 'set:' + p.setGrup;
        grup = p.uid;
        ad = (kayit && m.hazirSetHarita[kayit.urunId] ? m.hazirSetHarita[kayit.urunId].ad : '') + ' seti';
      } else {
        anahtar = p.grup;
        grup = p.grup;
        ad = self.grupAdi(p.grup);
      }
      if (!bul[anahtar]) {
        bul[anahtar] = { anahtar: anahtar, gruplar: [], ad: ad, parcalar: [] };
        liste.push(bul[anahtar]);
      }
      if (bul[anahtar].gruplar.indexOf(grup) === -1) bul[anahtar].gruplar.push(grup);
      bul[anahtar].parcalar.push(p);
    });
    return liste;
  };

  // Kenardaki öğeler değiştiyse (eklendi, çantaya taşındı) verilen cevap geçersiz olur: yeniden sorulur
  Editor.prototype.kenarCevabiDenetle = function () {
    var t = this.t;
    if (!t.kenarCevap && !(t.kenarAl && t.kenarAl.length)) return;
    var imza = this.kenarOgeleri().map(function (o) { return o.anahtar; }).sort().join('|');
    if (imza !== t.kenarSorulan) {
      delete t.kenarCevap;
      delete t.kenarAl;
      delete t.kenarSorulan;
    }
  };

  // Seçili öğelerin grupları
  Editor.prototype.kenarSeciliGruplar = function (ogeler) {
    var secim = this.kenarSecim || {};
    var g = [];
    ogeler.forEach(function (o) { if (secim[o.anahtar] !== false) g = g.concat(o.gruplar); });
    return g;
  };

  Editor.prototype.kenarKartiHtml = function () {
    var ogeler = this.kenarOgeleri();
    if (!ogeler.length) return '';
    var t = this.t;
    var self = this;
    // Seçim: cevap verildiyse cevaptaki seçim, yoksa hepsi işaretli
    var imza = ogeler.map(function (o) { return o.anahtar; }).sort().join('|');
    if (this.kenarSecimImza !== imza) {
      this.kenarSecimImza = imza;
      this.kenarSecim = {};
      ogeler.forEach(function (o) {
        self.kenarSecim[o.anahtar] = t.kenarCevap === 'evet' ? o.gruplar.some(function (g) { return (t.kenarAl || []).indexOf(g) !== -1; }) : true;
      });
    }
    var patch = 0;
    var aks = 0;
    ogeler.forEach(function (o) { o.parcalar.forEach(function (p) { if (p.tip === 'aksesuar') aks++; else patch++; }); });
    var sayi = [patch ? patch + ' patch' : '', aks ? aks + ' aksesuar' : ''].filter(Boolean).join(' ve ');
    if (t.kenarCevap && !this.kenarKartAcik) {
      var eklenen = ogeler.filter(function (o) { return o.gruplar.some(function (g) { return (t.kenarAl || []).indexOf(g) !== -1; }); });
      return '<div class="kp-kenar-kart kp-kenar-kart--cevap" data-kp-kenar-kart>' +
        '<p>' + (t.kenarCevap === 'evet' && eklenen.length
          ? '✓ Kenardaki ' + kacis(eklenen.map(function (o) { return o.ad; }).join(', ')) + ' sepete eklenecek.'
          : 'Kenardaki ' + sayi + ' sepete eklenmeyecek, tasarımında kenarda duruyor.') + '</p>' +
        '<button type="button" class="kp-baglanti" data-kp-kenar-degistir>Değiştir</button></div>';
    }
    var adet = this.kart.adet ? this.kart.adet() : 1;
    var t0 = kopyala(t);
    t0.kenarAl = [];
    var t1 = kopyala(t);
    t1.kenarAl = this.kenarSeciliGruplar(ogeler);
    var fark = (fiyatHesapla(this.m, this.yer, t1).toplam - fiyatHesapla(this.m, this.yer, t0).toplam) * adet;
    var secilen = t1.kenarAl.length;
    var kartlar = ogeler.map(function (o) {
      var on = self.kenarSecim[o.anahtar] !== false;
      var gorseller = o.parcalar.map(function (p) {
        var g = p.tip === 'aksesuar' ? p.tanim.gorsel.kucuk : p.varyant && p.varyant.gorsel;
        return g ? '<img src="' + kacis(g) + '" alt="">' : '<span class="kp-kenar-kart__harf">' + kacis(p.etiket) + '</span>';
      }).join('');
      return '<button type="button" class="kp-kenar-kart__oge" data-kp-kenar-sec="' + kacis(o.anahtar) + '" aria-pressed="' + on + '" aria-label="' + kacis(o.ad) + '" title="' + kacis(o.ad) + '">' +
        '<span class="kp-kenar-kart__gorsel">' + gorseller + '</span><span class="kp-kenar-kart__isaret" aria-hidden="true">✓</span></button>';
    }).join('');
    // Set varsa adı; "istemediğine dokunup seçimi kaldır"
    var setAdlari = ogeler.filter(function (o) { return o.anahtar.indexOf('set:') === 0 && o.ad; }).map(function (o) { return o.ad; });
    var aciklama = setAdlari.length ? setAdlari.join(', ') + ' · istemediğine dokunup seçimi kaldır' : 'İstemediğine dokunup seçimi kaldır';
    return '<div class="kp-kenar-kart" data-kp-kenar-kart>' +
      '<p class="kp-kenar-kart__baslik">Kenarda ' + sayi + ' var, ' + (patch + aks === 1 ? 'bunu' : 'bunları') + ' da alalım mı?</p>' +
      '<p class="kp-kenar-kart__aciklama">' + kacis(aciklama) + '</p>' +
      '<div class="kp-kenar-kart__ogeler" role="group" aria-label="Kenardaki patch\'ler">' + kartlar + '</div>' +
      '<div class="kp-kenar-kart__butonlar">' +
      '<button type="button" class="kp-kenar-kart__dugme" data-kp-kenar-hayir>Hayır</button>' +
      '<button type="button" class="kp-kenar-kart__dugme kp-kenar-kart__dugme--ana" data-kp-kenar-evet' + (secilen ? '' : ' disabled') + '>Evet, ekle (+' + paraBicimle(fark) + ')</button>' +
      '</div>' +
      '</div>';
  };

  Editor.prototype.kenarCevapla = function (evet) {
    var ogeler = this.kenarOgeleri();
    this.t.kenarCevap = evet ? 'evet' : 'hayir';
    this.t.kenarAl = evet ? this.kenarSeciliGruplar(ogeler) : [];
    this.t.kenarSorulan = ogeler.map(function (o) { return o.anahtar; }).sort().join('|');
    this.kenarKartAcik = false;
    this.yenile();
  };

  // Özet: kalem kalem fiyatlar, uygulanan her kampanya ayrı satır (Shopify'daki adıyla), toplamda eski fiyat üstü çizili
  Editor.prototype.ozetCiz = function () {
    var m = this.m;
    var self = this;
    var panel = this.el.querySelector('[data-kp-panel="ozet"]');
    var f = fiyatHesapla(m, this.yer, this.t);
    var p = function (k) { return paraBicimle(k); };
    var satir = function (ad, alt, tutar, sinif) {
      return '<tr' + (sinif ? ' class="' + sinif + '"' : '') + '><th scope="row">' + ad + (alt ? ' <span>' + alt + '</span>' : '') + '</th><td>' + tutar + '</td></tr>';
    };
    var engelliAdim = this.adimlar.filter(function (a) { return a.id !== 'ozet' && a.id !== 'ikon' && a.id !== 'aksesuar' && self.adimEngeli(a.id); })[0];
    var hataliGruplar = this.hataliGruplar();
    // Geçersiz konumda patch varsa alt çubukta butonun yerinde: "Hepsini düzelt" ve "Tasarıma dön"
    var engelEl = this.el.querySelector('[data-kp-alt-engel]');
    if (engelEl) {
      var engelHtml = hataliGruplar.length
        ? '<div class="kp-alt-engel" data-kp-ozet-yer><p class="kp-alt-engel__metin"><span class="kp-yer-uyari__ikon" aria-hidden="true">!</span>' +
          'Sepete eklemeden önce düzelt: ' + kacis(this.sorunMetni(hataliGruplar[0])) + (hataliGruplar.length > 1 ? ' (ve ' + (hataliGruplar.length - 1) + ' patch daha)' : '') + '</p>' +
          '<div class="kp-alt-engel__butonlar"><button type="button" class="kp-oneri" data-kp-hepsini-duzelt>Hepsini düzelt</button>' +
          '<button type="button" class="kp-oneri kp-oneri--ikincil" data-kp-tasarima-don>Tasarıma dön</button></div></div>'
        : '';
      if (engelEl.innerHTML !== engelHtml) engelEl.innerHTML = engelHtml;
    }
    // Kombinde fiyata dahil sayıdan (4) az patch: yalnızca geri dönüş
    if (this.kombin && kombinPatchSayisi(this.durum && this.durum.parcalar) < this.kombin.dahil) {
      var kbos = this.kombinOzetBos();
      if (panel.innerHTML !== kbos) panel.innerHTML = kbos;
      this.ozetSahne = null;
      return;
    }
    if (bosMu(this.t)) {
      // Hiç patch yok: geri dön ya da sadece çanta (alttaki "Sepete ekle" de düz çantayı ekler)
      var bos =
        '<h3 id="kp-p-ozet" class="kp-panel__baslik" tabindex="-1">Henüz patch eklemedin</h3>' +
        '<p class="kp-panel__aciklama">Çantanı isim, rakam ya da ikonla kişiselleştirebilir ya da sadece çantayı alabilirsin.</p>' +
        '<div class="kp-ozet-bos">' +
        '<button type="button" class="kp-oneri" data-kp-geri-don>Patch eklemek için geri dön</button>' +
        '<button type="button" class="kp-oneri kp-oneri--ikincil" data-kp-sade-al>Sadece çantayı al</button>' +
        '</div>';
      if (panel.innerHTML !== bos) panel.innerHTML = bos;
      this.ozetSahne = null;
      return;
    }
    // Satırlar satın alınacak tasarımdan: kenarda kalan (eklenmeyen) patch'ler yok
    var tS = satinAlinacak(m, this.t);
    var dS = tS === this.t ? this.durum : duzenle(m, this.yer, tS);
    var satirlar = satir(kacis(m.urun.baslik) + (this.kombin ? kacis(this.kombinSweatEki()) : ''), '', p(f.urun));
    if (f.harfAdet + f.rakamAdet) satirlar += satir('Yazı ve rakam: ' + kacis(tS.isim) + (yazilanIsim(tS) !== tS.isim ? ' <span>(yazılan: ' + kacis(yazilanIsim(tS)) + ')</span>' : ''), '(' + (f.harfAdet + f.rakamAdet) + ' patch)', p(f.harf + f.rakam));
    var saglam = saglamSetler(m, tS);
    var setIdleri = saglam.map(function (k) { return k.id; });
    var ikonlar = dS.parcalar.filter(function (x) { return x.tip === 'icon' && !(x.setGrup && setIdleri.indexOf(x.setGrup) !== -1); });
    if (ikonlar.length) satirlar += satir('İkonlar: ' + kacis(ikonlar.map(function (x) { return x.etiket; }).join(', ')), '(' + ikonlar.length + ' patch)', p(f.ikon));
    f.setler.forEach(function (s) { satirlar += satir(kacis(s.tanim.ad) + ' seti', '(' + s.tanim.patchler.length + ' patch)', p(s.tanim.fiyat)); });
    f.aksesuarlar.forEach(function (a) {
      satirlar += satir(kacis(a.tanim.ad) + (a.ozet ? ' ve tasarımı: ' + kacis(a.ozet) : ''), a.patchAdet ? '(' + a.patchAdet + ' patch)' : '', p(a.toplam));
    });
    if (this.kombin) satirlar += this.kombinOzetSatiri(satir);
    var k = this.kampanyaSonucu();
    var adet = this.kart.adet ? this.kart.adet() : 1;
    var liste = f.toplam * adet;
    var kampanyaSatirlari = '';
    // Kampanya satırları: bu tasarımın satırlarına düşen indirimler
    var pay = k && !k.hata ? k.tasarimPay || null : null;
    if (pay) {
      kampanyaSirala(Object.keys(pay)).forEach(function (ad) {
        if (!(pay[ad] > 0)) return;
        // Kampanyanın bir kısmı sepetteki diğer ürünlere düşüyorsa altında gri not (toplam tutar)
        var butun = (k.aktif || {})[ad] || 0;
        var not = butun - pay[ad] >= 100 ? '<small class="kp-kampanya-not">Sepetindeki diğer ürünlerle birlikte toplam −' + p(butun) + '</small>' : '';
        kampanyaSatirlari += satir('✓ ' + kacis(kampanyaGosterimAdi(ad)) + not, '', '−' + p(pay[ad]), 'kp-ozet__kampanya');
      });
    } else if (k && k.kampanyalar) {
      k.kampanyalar.forEach(function (x) {
        kampanyaSatirlari += satir('✓ ' + kacis(kampanyaGosterimAdi(x.ad)), '', '−' + p(x.tutar), 'kp-ozet__kampanya');
      });
    }
    var ozInd = tasarimIndirimi(k);
    var kf = this.kombin && this.kombinFiyat();
    var toplam = kf
      ? '<s class="kp-ozet__eski">' + p(kf.eski) + '</s> <strong class="kp-ozet__yeni">' + p(kf.yeni) + '</strong>'
      : ozInd > 0
      ? '<s class="kp-ozet__eski">' + p(liste) + '</s> <strong class="kp-ozet__yeni">' + p(liste - ozInd) + '</strong>'
      : '<strong>' + p(liste) + '</strong>';
    // İskelet bir kez kurulur (küçük görsel yeniden yüklenmesin); parçalar değiştikçe güncellenir.
    // Telefonda tek ekran: tasarım kartı ve alt çubuk sabit, fiyat dökümü uzarsa kendi içinde kayar.
    if (!panel.querySelector('[data-kp-oz]')) {
      panel.innerHTML =
        '<div class="kp-oz" data-kp-oz>' +
        '<h3 id="kp-p-ozet" class="kp-gizli" tabindex="-1">Özet</h3>' +
        '<div class="kp-oz__kart">' +
        '<div class="kp-oz__gorsel" data-kp-oz-gorsel aria-hidden="true"></div>' +
        '<div class="kp-oz__bilgi">' +
        '<p class="kp-oz__urun">' + kacis(m.urun.baslik) + '</p>' +
        '<p class="kp-oz__icerik" data-kp-oz-icerik></p>' +
        '<p class="kp-oz__adet" data-kp-oz-adet></p>' +
        '<button type="button" class="kp-baglanti kp-oz__buyuk" data-kp-buyuk-ac>Tasarımı büyük gör</button>' +
        '</div></div>' +
        '<div data-kp-oz-uyari></div>' +
        (this.kombin ? '<div data-kp-oz-tisort></div>' : '') +
        '<div class="kp-oz__dokum" data-kp-oz-dokum></div>' +
        '<div class="kp-oz__kenar" data-kp-oz-kenar></div>' +
        '<p class="kp-oz__not"><span aria-hidden="true">ⓘ</span> Patch\'ler Velcro yüzeye takılır, istediğin zaman yerini değiştirirsin.</p>' +
        '</div>';
      this.ozetSahne = null;
    }
    var yaz = function (secici, html) {
      var el = panel.querySelector(secici);
      if (el && el.innerHTML !== html) el.innerHTML = html;
    };
    // Çantaya takılı patch'ler (setlerin patch'leri dahil, kenardakiler hariç)
    var patchSayisi = dS.parcalar.filter(function (x) { return !x.kenar && (x.tip === 'letter' || x.tip === 'number' || x.tip === 'icon'); }).length;
    var aksSayisi = (tS.aksesuarlar || []).filter(function (a) { return !a.kenar; }).length;
    yaz('[data-kp-oz-icerik]', kacis(tasarimIcerigi(m, this.yer, this.t)));
    // Kombin: kenardakiler de kombinde (hediye Tshirt'e takılır)
    var kombinKenar = this.kombin ? kombinPatchSayisi(dS.parcalar) - patchSayisi : 0;
    yaz('[data-kp-oz-adet]', kacis(this.kombin
      ? (patchSayisi + kombinKenar) + ' patch · ' + (kombinKenar ? patchSayisi + '\'' + sayiEki(patchSayisi) + ' sweatshirt\'e takılı, ' + kombinKenar + '\'' + sayiEki(kombinKenar) + ' Tshirt için kenarda' : 'sweatshirt\'e takılı')
      : patchSayisi + ' patch' + (aksSayisi ? ' · ' + aksSayisi + ' aksesuar' : '') + ' · çantaya takılı'));
    yaz('[data-kp-oz-uyari]', engelliAdim ? '<p class="kp-uyari kp-uyari--hata">' + engelliAdim.ad + ' bölümünde çözülmesi gereken bir sorun var.</p>' : '');
    yaz('[data-kp-oz-dokum]',
      '<table class="kp-ozet"><tbody>' + satirlar + kampanyaSatirlari + '</tbody>' +
      '<tfoot><tr><th scope="row">Toplam</th><td>' + toplam + '</td></tr></tfoot></table>' +
      (k && k.hata ? '<p class="kp-indirim-notu kp-indirim-notu--ozet">İndirimler sepette uygulanır</p>' : ''));
    yaz('[data-kp-oz-kenar]', this.kenarKartiHtml());
    if (this.kombin) {
      yaz('[data-kp-oz-tisort]', this.kombinOzetTisortHtml());
      yaz('.kp-oz__urun', kacis(m.urun.baslik + this.kombinSweatEki()));
    }
    // Küçük görsel: tasarımlı ürün, tüm çanta görünümü
    var gorsel = panel.querySelector('[data-kp-oz-gorsel]');
    if (!this.ozetSahne || this.ozetSahne.kok !== gorsel) {
      gorsel.innerHTML = '';
      gorsel.style.aspectRatio = m.gorsel.en + ' / ' + m.gorsel.boy;
      // Dikey görselde (sırt çantası) en fazla 130px yükseklik: alt kısımdaki alan kesilmesin
      gorsel.style.width = m.gorsel.boy > m.gorsel.en ? Math.round((130 * m.gorsel.en) / m.gorsel.boy) + 'px' : '';
      this.ozetSahne = new Sahne(m, this.yer, gorsel, { etkilesimli: false });
      this.ozetSahne.sahne.style.position = 'absolute';
      this.ozetSahne.sahne.style.left = '0';
      this.ozetSahne.sahne.style.top = '0';
      this.ozetSahne.sahne.style.width = '100%';
    }
    this.ozetSahne.ciz(dS.parcalar.filter(function (x) { return !x.kenar; }), {}, false);
  };

  // Tasarımın sepet satırları (simülasyon için): varyant ve adet
  Editor.prototype.simulasyonSatirlari = function () {
    if (this.alt) {
      var ana = this.secenek.ana;
      var t = kopyala(ana.t);
      var uid = this.duzenlenenAks;
      var ic = bosMu(this.t) ? null : kopyala(this.t);
      t.aksesuarlar = (t.aksesuarlar || []).slice();
      if (uid) t.aksesuarlar.forEach(function (a) { if (a.uid === uid) a.tasarim = ic; });
      else t.aksesuarlar.push({ uid: 'onizleme', urunId: this.secenek.aksesuar.id, cx: 0, cy: 0, aci: 0, tasarim: ic });
      var adet0 = ana.kart.adet ? ana.kart.adet() : 1;
      return simSatirlari(ana.kart.sepetKalemleri(adet0, t).kalemler, !!ana.kombin);
    }
    var adet = this.kart.adet ? this.kart.adet() : 1;
    if (bosMu(this.t)) return [{ v: this.m.urun.varyant, q: adet }];
    // Tasarım ve adet aynıysa satırlar da aynıdır: her yenilemede sepet kalemlerini baştan kurma
    var anahtar = JSON.stringify([this.t, adet]);
    if (this.simAnahtar !== anahtar) {
      this.simAnahtar = anahtar;
      this.simSatirlar = simSatirlari(this.kart.sepetKalemleri(adet, this.t).kalemler, !!this.kombin);
    }
    return this.simSatirlar.map(function (r) { return { v: r.v, q: r.q }; });
  };

  // Kampanyalı fiyat: değişiklikler biriktirilir (400 ms), sonuç önbellekte. Hata: liste fiyatı + "İndirimler sepette uygulanır"
  // Çanta editörü (aksesuar ekranında: onu açan çanta editörü)
  Editor.prototype.kok = function () {
    return this.alt ? this.secenek.ana : this;
  };

  Editor.prototype.kampanyaGuncelle = function () {
    var kok = this.kok();
    if (!kok || !kok.kart.sepetKalemleri) return;
    var self = this;
    var satirlar = this.simulasyonSatirlari();
    var haric = kok.duzenlenen ? kok.duzenlenen.id : null;
    // "Bir patch daha" ve "iki patch daha": bir sonraki kampanyayı bulmak için örnek patch'le iki ek simülasyon
    var ornek = ornekPatch(kok.m);
    var ekler = ornek ? [{ ad: '+1', satirlar: [{ v: ornek, q: 1 }] }, { ad: '+2', satirlar: [{ v: ornek, q: 2 }] }] : [];
    // Kurallar (adet basamakları, dahil ürünler) henüz öğrenilmediyse arka planda öğrenilir
    if (!kurallariOku() || Date.now() - kurallariOku().zaman > 30 * 60 * 1000) {
      kurallariOgren(kok.m).then(function () {
        if (self.el && !self.el.hidden) {
          self.kampanyaAnahtari = null;
          self.yenile();
        }
      }, function () {});
    }
    var anahtar = JSON.stringify([satirlar, haric, kampanyaSurumu]);
    if (anahtar === this.kampanyaAnahtari) return;
    this.kampanyaAnahtari = anahtar;
    // Anında: önbellekteki kesin sonuç ya da öğrenilen kurallarla yerel hesap ("hesaplanıyor" ara durumu yok)
    var anlik = kampanyaAnlik(kok.m, satirlar, haric, ekler);
    if (anlik) this.kampanya = { anahtar: anahtar, sonuc: anlik };
    if (anlik && !anlik.yerel) return;
    // Arka planda Shopify doğrular
    clearTimeout(this.kampanyaZamanlayici);
    this.kampanyaZamanlayici = setTimeout(function () {
      kampanyaHesapla(satirlar, haric, ekler, kok.m).then(
        function (s) { self.kampanyaBitti(anahtar, s); },
        function () { self.kampanyaBitti(anahtar, { hata: true }); }
      );
    }, 400);
  };

  // Shopify'ın sonucu: yerel hesapla aynıysa bir şey değişmez; farklıysa fiyat sessizce düzeltilir
  Editor.prototype.kampanyaBitti = function (anahtar, sonuc) {
    if (anahtar !== this.kampanyaAnahtari) return;
    var onceki = this.kampanya && this.kampanya.anahtar === anahtar ? this.kampanya.sonuc : null;
    // Simülasyon başarısız: yerel hesap varsa o kalır, yoksa liste fiyatı ve "İndirimler sepette uygulanır"
    if (sonuc.hata && onceki && !onceki.hata) return;
    this.kampanya = { anahtar: anahtar, sonuc: sonuc };
    // Kombin göstergesi ve kart etiketleri "sıradaki patch" ücretini ek simülasyonlardan alır: ana sonuç aynı olsa da
    // Shopify'ın sonucuyla yeniden çizilir
    if (this.kombin && !this.el.hidden) this.kombinCiz();
    if (ayniKampanya(onceki, sonuc)) return;
    if (this.el.hidden) return;
    if (this.adim === 'ozet') this.ozetCiz();
    var f = fiyatHesapla(this.m, this.yer, this.t);
    if (this.alt) this.altToplamCiz(f);
    else this.toplamCiz(f.toplam);
    this.seritCiz();
    this.kazancKontrol(sonuc);
    this.ileriYazisi();
    if (this.kombin) this.kombinCiz();
  };

  // Alt çubuğun en üstündeki 3 px ilerleme çizgisi (Özet'te yok) ve kampanya panelinin içeriği. Tasarım değişince
  // sıradaki kampanya yakınsa öneri birkaç saniyeliğine çubuğun üstünde belirir.
  Editor.prototype.seritCiz = function () {
    var serit = this.el && this.el.querySelector('[data-kp-serit]');
    if (!serit) return;
    var k = this.kampanyaSonucu();
    var kok = this.kok();
    // Kombinde tutar eşikli kampanyalar uygulanmaz (kombinEsiksiz): şeritte de yok
    var esikler = kok && !kok.kombin ? kok.m.ayar.kampanyaEsikleri : [];
    var kural = kurallariOku();
    var d = k && !k.hata ? seritDurumu(k, kural ? kural.merdiven : [], esikler, kok ? ornekPatchFiyati(kok.m) : null, kok ? enUcuzPatchFiyati(kok.m) : null, !!(kok && kok.m.tekPatch)) : null;
    this.kampanyaDurumu = d;
    var goster = !!d && this.adim !== 'ozet' && !!(d.sol || d.sag || d.duraklar.length);
    serit.hidden = !goster;
    this.el.querySelector('[data-kp-fiyat-ac]').disabled = !d;
    var kart = this.el.querySelector('[data-kp-kkart]');
    if (kart) kart.hidden = !d || this.adim === 'ozet';
    if (!d) return this.kampanyaPaneli(false);
    this.kampanyaPaneliCiz(k, d);
    this.kampanyaKartiCiz(k, d);
    if (!goster) return;
    serit.classList.toggle('kp-serit--tamam', d.hepsi);
    var dolu = this.el.querySelector('[data-kp-serit-dolu]');
    dolu.style.width = (d.dolu * 100).toFixed(1) + '%';
    // Renk geçişi tüm çubuğa yayılır: dolu kısım ilerledikçe kırmızıdan turuncuya
    dolu.style.backgroundSize = d.dolu > 0 ? (100 / d.dolu).toFixed(1) + '% 100%' : '100% 100%';
    this.oneriKontrol(d);
  };

  // Kazanılan kampanya satırları: bu tasarımın kendi satırlarına düşen tutar. Kampanyanın bir kısmı sepetteki diğer
  // ürünlere düşüyorsa (ör. 4'lü −370 TL'nin 92,50 TL'si bu tasarımda) altında küçük gri not: toplam tutar.
  // Masaüstü kartı ve mobil kampanya paneli aynı satırları kullanır.
  function kampanyaSatirlari(k) {
    var pay = k.tasarimPay || k.aktif || {};
    var hepsi = k.aktif || {};
    return kampanyaSirala(Object.keys(pay)).filter(function (ad) { return pay[ad] > 0; }).map(function (ad) {
      var toplam = hepsi[ad] || 0;
      var not = toplam - pay[ad] >= 100 ? '<small class="kp-kampanya-not">Sepetindeki diğer ürünlerle birlikte toplam −' + paraBicimle(toplam) + '</small>' : '';
      return '<li><span class="kp-kampanya-satir"><span>✓ ' + kacis(kampanyaGosterimAdi(ad)) + '</span><strong>−' + paraBicimle(pay[ad]) + '</strong></span>' + not + '</li>';
    }).join('');
  }

  // Kampanya paneli (mobil): kazanılan kampanyalar (bu tasarıma düşen tutarlarıyla), sıradaki hedef tek cümle ve
  // duraklı ilerleme çubuğu
  Editor.prototype.kampanyaPaneliCiz = function (k, d) {
    var nokta = function (x) { return !x || /[.!?…]$|\p{Extended_Pictographic}$/u.test(x) ? x : x + '.'; };
    // Üstte: "370 TL indirim kazandın" (bu tasarıma düşen; alt çubuktaki indirim etiketiyle aynı)
    this.el.querySelector('[data-kp-serit-sol]').textContent = d.sag ? nokta(d.sol) : d.sol;
    var liste = this.el.querySelector('[data-kp-kpanel-liste]');
    var html = this.kombinKampanyaSatiri() + kampanyaSatirlari(k);
    if (liste.innerHTML !== html) liste.innerHTML = html;
    liste.hidden = !html;
    var sag = this.el.querySelector('[data-kp-serit-sag]');
    sag.textContent = nokta(d.sag);
    sag.hidden = !d.sag;
    this.el.querySelector('[data-kp-kpanel-dolu]').style.width = (d.dolu * 100).toFixed(1) + '%';
    var duraklar = this.el.querySelector('[data-kp-kpanel-duraklar]');
    var dhtml = d.duraklar.map(function (x) {
      return '<li class="kp-kpanel__durak' + (x.ulasildi ? ' kp-kpanel__durak--ulasildi' : '') + '" data-kp-durak="' + kacis(x.ad) + '" style="left:' + (x.konum * 100).toFixed(1) + '%">' +
        '<span class="kp-kpanel__nokta" aria-hidden="true"></span><span class="kp-kpanel__ad">' + kacis(kampanyaGosterimAdi(x.ad).replace(/ (patch )?indirimi?$/i, '')) + '</span></li>';
    }).join('');
    if (duraklar.innerHTML !== dhtml) duraklar.innerHTML = dhtml;
  };

  // Masaüstü Kampanyalar kartı: başlıkta kazanılan, duraklar (ulaşılan kırmızı ✓, sıradaki turuncu, diğerleri gri),
  // kazanılanlar satır satır, en altta sıradaki hedef
  Editor.prototype.kampanyaKartiCiz = function (k, d) {
    var kart = this.el.querySelector('[data-kp-kkart]');
    if (!kart) return;
    var nokta = function (x) { return !x || /[.!?…]$|\p{Extended_Pictographic}$/u.test(x) ? x : x + '.'; };
    var tasarimInd = tasarimIndirimi(k) + this.kombinHediyeTutari();
    var kazanc = this.el.querySelector('[data-kp-kkart-kazanc]');
    var kazancMetin = tasarimInd > 0 ? paraBicimle(tasarimInd) + ' kazandın' + (d.hepsi ? ' 🎉' : '') : '';
    if (kazanc.textContent !== kazancMetin) kazanc.textContent = kazancMetin;
    this.el.querySelector('[data-kp-kkart-dolu]').style.width = (d.dolu * 100).toFixed(1) + '%';
    var siradaki = -1;
    d.duraklar.forEach(function (x, i) { if (siradaki < 0 && !x.ulasildi) siradaki = i; });
    var dhtml = d.duraklar.map(function (x, i) {
      var ad = x.tur === 'tutar' ? yuzdeYazisi(x.ad) || kampanyaGosterimAdi(x.ad) : kampanyaGosterimAdi(x.ad).replace(/ (patch )?indirimi?$/i, '');
      // Durağın altında kampanyanın kendi kuralı (2'li −60 TL, %10 için 5.000 TL); kazanılan tutarlar yalnızca listede
      var tutar = x.tur === 'tutar' ? paraBicimle(x.tutar) : '−' + paraBicimle(x.tutar);
      var durum = x.ulasildi ? ' kp-kkart__durak--ulasildi' : i === siradaki ? ' kp-kkart__durak--siradaki' : '';
      return '<li class="kp-kkart__durak' + durum + '" data-kp-durak="' + kacis(x.ad) + '" style="left:' + (x.konum * 100).toFixed(1) + '%">' +
        '<span class="kp-kkart__nokta" aria-hidden="true">' + (x.ulasildi ? '✓' : '') + '</span>' +
        '<span class="kp-kkart__ad">' + kacis(ad) + '</span><span class="kp-kkart__tutar">' + kacis(tutar) + '</span></li>';
    }).join('');
    var duraklar = this.el.querySelector('[data-kp-kkart-duraklar]');
    if (duraklar.innerHTML !== dhtml) duraklar.innerHTML = dhtml;
    var liste = this.el.querySelector('[data-kp-kkart-liste]');
    var lhtml = this.kombinKampanyaSatiri() + kampanyaSatirlari(k);
    if (liste.innerHTML !== lhtml) liste.innerHTML = lhtml;
    liste.hidden = !lhtml;
    var hedef = this.el.querySelector('[data-kp-kkart-hedef]');
    var hedefMetin = d.hepsi ? 'Bütün kampanyalar sepetinde.' : nokta(d.sag) || nokta(d.sol);
    if (hedef.textContent !== hedefMetin) hedef.textContent = hedefMetin;
  };

  Editor.prototype.kampanyaPaneli = function (ac) {
    var panel = this.el && this.el.querySelector('[data-kp-kpanel]');
    if (!panel) return;
    // Masaüstünde kampanyalar kartta sürekli görünür; panel yalnızca mobilde
    ac = !!ac && !!this.kampanyaDurumu && !masaustuMu();
    this.kpanelAcik = ac;
    panel.hidden = !ac;
    var dugme = this.el.querySelector('[data-kp-fiyat-ac]');
    if (dugme) dugme.setAttribute('aria-expanded', ac ? 'true' : 'false');
    if (ac) {
      var kapat = panel.querySelector('.kp-kpanel__kapat');
      if (kapat) kapat.focus({ preventScroll: true });
    }
  };

  // Öneri: müşteri bir şey ekleyip çıkardığında sıradaki kampanya yakınsa ("1 patch daha ekle, tüm siparişe %10 indirim").
  // Aynı öneri art arda tekrar etmez; kazanma bildirimi varsa önce o gösterilir.
  Editor.prototype.oneriKontrol = function (d) {
    // Kombinde fiyat 4 patch'e kadar sabit, sonrası göstergede: patch indirimi kutlaması ve önerisi gösterilmez
    if (this.kombin) return;
    var anahtar = this.kampanyaAnahtari;
    if (this.oneriAnahtari === undefined) {
      // Editör açılırken öneri yok; yalnızca değişiklikten sonra
      this.oneriAnahtari = anahtar;
      return;
    }
    if (anahtar === this.oneriAnahtari) return;
    this.oneriAnahtari = anahtar;
    if (!d.yakin || d.hepsi || !d.sag) return;
    var metin = d.sag;
    if (metin === this.sonOneri) return;
    var self = this;
    clearTimeout(this.oneriZamanlayici);
    // Kısa bir bekleme: aynı değişiklik bir kampanya kazandırdıysa önce kazanma bildirimi çıkar
    this.oneriZamanlayici = setTimeout(function () {
      if (!self.el || self.el.hidden || self.adim === 'ozet' || self.oneriAnahtari !== anahtar) return;
      // Masaüstünde öneri bildirimi yok: sıradaki hedef Kampanyalar kartında yazıyor
      if (masaustuMu()) return;
      self.sonOneri = metin;
      self.bildirimEkle({ tur: 'oneri', metin: metin, anahtar: anahtar });
    }, 700);
  };

    // Kazanma bildirimi: bir kampanyaya oturumda ilk kez ulaşıldığında (müşterinin sepetinde zaten olanlar hariç)
  Editor.prototype.kazancKontrol = function (k) {
    // Kombinde fiyat 4 patch'e kadar sabit, sonrası göstergede: patch indirimi kutlaması ve önerisi gösterilmez
    if (this.kombin) return;
    if (!k || k.hata || !k.aktif) return;
    var gorulen = gorulenKampanyalar();
    var degisti = false;
    Object.keys(k.onceAktif || {}).forEach(function (ad) { if (gorulen.indexOf(ad) === -1) { gorulen.push(ad); degisti = true; } });
    var yeni = Object.keys(k.aktif).filter(function (ad) { return gorulen.indexOf(ad) === -1; });
    if (!yeni.length) { if (degisti) gorulenKaydet(gorulen); return; }
    gorulenKaydet(gorulen.concat(yeni));
    if (this.adim === 'ozet') return;
    yeni.sort(function (a, b) { return k.aktif[b] - k.aktif[a]; });
    this.kazancGoster(kazancMetni(yeni[0], k.aktif[yeni[0]], this.kok().m.ayar.kampanyaEsikleri), yeni[0]);
  };

  Editor.prototype.kazancGoster = function (metin, ad) {
    this.bildirimEkle({ tur: 'kazanc', metin: metin, ad: ad });
  };

  // Güncel tasarıma ait kampanya sonucu (henüz hesaplanmadıysa null)
  Editor.prototype.kampanyaSonucu = function () {
    return this.kampanya && this.kampanya.anahtar === this.kampanyaAnahtari ? this.kampanya.sonuc : null;
  };

  /* ---------------- Seçim ve döndürme ---------------- */

  // Serbest döndürmede 45°'nin katlarına ±5° yaklaşınca yakalar
  function aciYakala(a) {
    a = aciNormal(a);
    for (var k = 0; k <= 8; k++) {
      if (Math.abs(a - k * 45) <= 5) return (k * 45) % 360;
    }
    return Math.round(a) % 360;
  }

  Editor.prototype.isimMerkezi = function () {
    return this.blokMerkezi(0);
  };

  // Bloğun varsayılan yerleşimi (kendi alanında): { satir, merkez }
  Editor.prototype.blokYeri = function (b, t) {
    t = t || this.t;
    var bl = yaziBloklari(t)[b] || { bas: 0, son: Array.from(t.isim || '').length };
    var ad = BLOK_ALAN[b];
    return this.yer.isimYeri(isimOlculeri(this.m, t).slice(bl.bas, bl.son), t[ad.ayri] ? 0 : aciNormal(t[ad.aci]), blokAlani(this.m, t, b));
  };

  Editor.prototype.blokMerkezi = function (b) {
    var ad = BLOK_ALAN[b];
    return this.t[ad.merkez] || this.blokYeri(b).merkez;
  };

  // Seçili grubun parçaları, döndürme merkezi, açısı ve çakışma kontrolündeki diğer parçalar
  Editor.prototype.grupBilgisi = function (grup) {
    if (!grup || !this.durum) return null;
    var d = this.durum;
    var parcalar = d.parcalar.filter(function (p) { return p.grup === grup; });
    if (!parcalar.length) return null;
    return {
      grup: grup,
      parcalar: parcalar,
      digerleri: d.parcalar.filter(function (p) { return p.grup !== grup && !d.hatalar[p.uid]; }),
      pivot: blokGrubu(grup) ? this.blokMerkezi(grupBlogu(grup)) : merkez(parcalar[0].sekil),
      aci: aciNormal(parcalar[0].aci)
    };
  };

  Editor.prototype.secimAdi = function (b) {
    var p = b.parcalar[0];
    if (blokGrubu(b.grup)) return 'Yazı (' + this.blokYazisi(grupBlogu(b.grup)) + ')';
    if (p.tip === 'letter') return p.etiket + ' harfi';
    if (p.tip === 'number') return p.etiket + ' rakamı';
    // Set patch'i de yalnızca kendi adıyla anılır ("Octopus"); set adı araç çubuğunu ve uyarıları uzatıyordu
    return p.etiket;
  };

  Editor.prototype.sec = function (grup, harfSira) {
    if (grup !== this.secili) this.secimDurumu('');
    this.secili = grup || null;
    this.seciliHarf = harfSira != null ? harfSira : null;
    // Önizlemede bir karaktere dokunulunca yazı adımında o karakterin stil paneli açılır
    if (harfSira != null && this.adim === 'yazi' && this.seciliKarakter !== harfSira) {
      this.seciliKarakter = harfSira;
      this.karakterleriCiz();
    }
    this.secimGuncelle();
  };

  // Döndürme uyarısı (ortak uyarı kutusunda); boş metin yalnızca döndürme uyarısını kapatır
  Editor.prototype.secimDurumu = function (metin, sure) {
    if (metin) this.bildir(metin, { anahtar: 'donme', sure: sure == null ? 2500 : sure });
    else this.bildirimKapat('donme');
  };

  // Uyarıyı biraz sonra kapat (sorun bitti, metin bir an daha okunabilsin)
  Editor.prototype.bildirimSonra = function (anahtar, ms) {
    var b = this.bildirimSimdiki;
    if (!b || b.anahtar !== anahtar) return;
    b.sure = ms;
    this.bildirimZamanla(b);
  };

  // Uyarılarda patch'in adı: isim için yazılan isim, diğerlerinde seçim adı
  Editor.prototype.patchAdi = function (b) {
    return blokGrubu(b.grup) ? this.blokYazisi(grupBlogu(b.grup)) : this.secimAdi(b);
  };

  // Bloğun harfleri (bölünmemiş yazıda tüm yazı)
  Editor.prototype.blokYazisi = function (b) {
    var bl = yaziBloklari(this.t)[b];
    return bl ? Array.from(this.t.isim).slice(bl.bas, bl.son).join('') : this.t.isim || '';
  };

  Editor.prototype.secimGuncelle = function () {
    var cubuk = this.el.querySelector('[data-kp-secim-cubuk]');
    var b = this.grupBilgisi(this.secili);
    if (!b) {
      this.secili = null;
      this.seciliHarf = null;
      cubuk.hidden = true;
      this.el.querySelector('[data-kp-etiketler]').hidden = false;
      this.sahne.secimCiz(null);
      this.balonGizle();
      this.etiketSecimiGuncelle();
      return;
    }
    cubuk.hidden = false;
    this.el.querySelector('[data-kp-etiketler]').hidden = true;
    this.etiketSecimiGuncelle();
    this.el.querySelector('[data-kp-secili-ad]').textContent = this.secimAdi(b) + (b.aci ? ' · ' + Math.round(b.aci) + '°' : '');

    var p0 = b.parcalar[0];
    this.el.querySelector('[data-kp-aks-tasarla]').hidden = !(p0.tip === 'aksesuar' && p0.tanim.tasarlanabilir);
    var kenarda = !!p0.kenar;
    this.el.querySelectorAll('[data-kp-dondur]').forEach(function (x) { x.hidden = kenarda; });
    // Önizlemede, tutamacın sağında: yazı seçiliyken Ayır (blok) / Birleştir (ayrı harf); yazı alanındaki butonla aynı durum
    var harfBtn = this.el.querySelector('[data-kp-cerceve-harf]');
    var yazi = blokGrubu(b.grup) || String(b.grup).indexOf('harf-') === 0;
    // Bölünmüş yazıda her blok kendi Ayır / Birleştir'i; tek harfli blok ayrılamaz
    var blokNo = blokGrubu(b.grup) ? grupBlogu(b.grup) : yazi ? harfBlogu(this.t, p0.sira) : 0;
    var blokBilgi = yaziBloklari(this.t)[blokNo];
    var blokAyriMi = blokAyri(this.t, blokNo);
    harfBtn.hidden = !yazi || kenarda || !blokBilgi || blokBilgi.son - blokBilgi.bas < 2;
    var harfHtml = blokAyriMi ? 'Birleştir' : '<span aria-hidden="true">↔</span> Ayır';
    if (harfBtn.innerHTML !== harfHtml) harfBtn.innerHTML = harfHtml;
    harfBtn.setAttribute('aria-label', blokAyriMi ? 'Harfleri birleştir' : 'Harfleri ayır');
    this.el.querySelectorAll('[data-kp-kenar-grup]').forEach(function (x) { x.classList.toggle('kp-kenar__oge--secili', x.getAttribute('data-kp-kenar-grup') === b.grup); });
    if (kenarda) this.sahne.secimCiz(null);
    else this.sahne.secimCiz(grupCercevesi(b.parcalar, b.pivot, b.aci, 0.15), !!this.durum.hatalar[b.parcalar[0].uid]);
    this.balonCiz(b);
  };

  Editor.prototype.etiketSecimiGuncelle = function () {
    var secili = this.secili;
    this.el.querySelectorAll('[data-kp-etiket-sec]').forEach(function (b) {
      var g = b.getAttribute('data-kp-etiket-sec');
      var on = !!secili && (g === secili || ((blokGrubu(g) || g.indexOf('harf-') === 0) && (blokGrubu(secili) || String(secili).indexOf('harf-') === 0)));
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.parentNode.classList.toggle('kp-cip--secili', on);
    });
  };

  // Renk seçimi yazı adımındaki stil panelinde; önizlemede balon gösterilmez
  Editor.prototype.balonCiz = function () {
    this.balonGizle();
  };

  Editor.prototype.balonGizle = function () {
    var balon = this.el && this.el.querySelector('[data-kp-balon]');
    if (balon) balon.hidden = true;
  };

  // Döndürme sırasında önizleme: geçerliyse true. Geçersizse parça kırmızı görünür.
  Editor.prototype.aciOnizle = function (b, aci) {
    var donmus = grupDondur(b.parcalar, b.pivot, b.aci, aci);
    var gecerli = this.yer.grupGecerli(donmus, b.digerleri);
    var hatalar = {};
    if (!gecerli) donmus.forEach(function (p) { hatalar[p.uid] = true; });
    this.sahne.konumla(donmus, hatalar);
    this.sahne.secimCiz(grupCercevesi(donmus, b.pivot, aci, 0.15), !gecerli);
    var gosterge = this.el.querySelector('[data-kp-aci]');
    gosterge.hidden = false;
    gosterge.textContent = Math.round(aci) + '°';
    gosterge.classList.toggle('kp-aci--hatali', !gecerli);
    var donmeSorunu = gecerli ? null : this.grupSorunu(donmus, b.digerleri);
    this.sinirTasma(donmeSorunu === 'tasma', donmus, donmeSorunu);
    return gecerli;
  };

  Editor.prototype.aciGostergesiGizle = function () {
    var g = this.el.querySelector('[data-kp-aci]');
    if (g) g.hidden = true;
  };

  // Açıyı tasarıma yazar
  Editor.prototype.aciUygula = function (grup, aci) {
    aci = aciNormal(aci);
    var t = this.t;
    sonaAl(t, grup);
    if (blokGrubu(grup)) {
      t[BLOK_ALAN[grupBlogu(grup)].aci] = aci;
    } else if (String(grup).indexOf('harf-') === 0) {
      harfKonumlariniEsitle(this.yer, t);
      t.harfAcilari[parseInt(String(grup).slice(5), 10)] = aci;
    } else {
      (t.aksesuarlar || []).concat(t.parcalar).forEach(function (x) {
        if (x.uid === grup) x.aci = aci;
      });
    }
    this.yenile();
  };

  // Serbest döndürme bitti: geçersiz açıda bırakıldıysa son geçerli açıya döner
  Editor.prototype.donmeBitir = function (b, sonGecerli) {
    this.aciGostergesiGizle();
    this.sinirTasma(false);
    this.bildirimSonra('donme', 1500);
    this.sahne.sahne.classList.remove('kp-sahne--donuyor');
    if (sonGecerli !== b.aci) this.aciUygula(b.grup, sonGecerli);
    else this.yenile();
  };

  // Butonlar ve klavye: göreli (delta) ya da mutlak açı
  Editor.prototype.acisiDegistir = function (delta, mutlak) {
    var b = this.grupBilgisi(this.secili);
    if (!b) return;
    var hedef = aciNormal(mutlak != null ? mutlak : b.aci + delta);
    if (hedef === b.aci) return;
    // Geçersiz açıda da uygulanır: patch kırmızı işaretlenir, sepete eklemeden önce düzeltilir
    this.secimDurumu('');
    this.aciUygula(b.grup, hedef);
  };

  Editor.prototype.seciliSil = function () {
    var g = this.secili;
    if (!g) return;
    this.secili = null;
    if (blokGrubu(g)) {
      // Bölünmüş yazıda yalnızca seçili bloğun harfleri silinir
      var bl = bolunmus(this.t) && yaziBloklari(this.t)[grupBlogu(g)];
      if (!bl) return this.isimAyarla('');
      for (var i = bl.son - 1; i >= bl.bas; i--) karakterSil(this.t, i);
      this.seciliKarakter = null;
      return this.isimAyarla(this.t.isim);
    }
    if (g.indexOf('harf-') === 0) {
      karakterSil(this.t, parseInt(g.slice(5), 10));
      this.seciliKarakter = null;
      return this.isimAyarla(this.t.isim);
    }
    var parca = this.t.parcalar.filter(function (p) { return p.uid === g; })[0];
    var saglam = parca && parca.setGrup && saglamSetler(this.m, this.t).some(function (k) { return k.id === parca.setGrup; });
    if (saglam) {
      this.secili = g;
      this.onayGoster('Set bozulacak, kalan patch\'ler tek tek fiyatlanacak.', [
        { yazi: 'Patch\'i sil', birincil: true, eylem: function () {
          setiBoz(this.t, parca.setGrup);
          this.secili = null;
          this.parcaKaldir(g);
        } },
        { yazi: 'Vazgeç', eylem: function () { this.secimGuncelle(); } }
      ]);
      return;
    }
    this.parcaKaldir(g);
  };

  /* ---------------- Sürükleme ---------------- */

  Editor.prototype.surukleBagla = function () {
    var self = this;
    var kok = this.el.querySelector('[data-kp-sahne]');
    var aktif = null; // tek parmak: 'tasima' (sürükleme) ya da 'tutamac' (döndürme tutamacı)
    var parmaklar = {}; // pointerId -> [x, y]
    var iki = null; // iki parmakla döndürme
    var bosDokunma = null; // boş alana dokunma: bırakınca (kısa dokunuşsa) seçimi kaldırır

    // Sürükleme boyunca sahnenin ekran kutusu bir kez ölçülür (her harekette zorunlu yerleşim hesabını önler);
    // dokunma başında, sürükleme görünümü açılınca, kaydırma/boyut değişince ve bırakınca yeniden ölçülür.
    var sahneKutusu = null;
    var kenarKutusu = null;
    function sahneRect() {
      return sahneKutusu || (sahneKutusu = self.sahne.sahne.getBoundingClientRect());
    }
    function kutuSifirla() {
      sahneKutusu = null;
      kenarKutusu = null;
    }
    window.addEventListener('scroll', kutuSifirla, { passive: true, capture: true });
    window.addEventListener('resize', kutuSifirla, { passive: true });

    function cmCevir(dxPx, dyPx) {
      var r = sahneRect();
      return [(dxPx / r.width) * self.m.Wcm, (dyPx / r.height) * self.m.Hcm];
    }

    function ekranNoktasi(cm) {
      var r = sahneRect();
      return [r.left + (cm[0] / self.m.Wcm) * r.width, r.top + (cm[1] / self.m.Hcm) * r.height];
    }

    function yonAcisi(x, y, merkezNokta) {
      return (Math.atan2(y - merkezNokta[1], x - merkezNokta[0]) * 180) / Math.PI;
    }

    function donmeBasla() {
      self.sahne.sahne.classList.add('kp-sahne--donuyor');
      self.balonGizle();
    }

    kok.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Çerçevedeki Ayır / Birleştir: yalnızca tıklama (sürükleme, seçim kaldırma yok)
      if (e.target.closest('[data-kp-cerceve-harf]')) return;
      kutuSifirla();
      parmaklar[e.pointerId] = [e.clientX, e.clientY];
      try {
        kok.setPointerCapture(e.pointerId);
      } catch (err) {
        /* bazı uygulama içi tarayıcılar */
      }
      var ids = Object.keys(parmaklar);
      // İkinci parmak: sürüklenen ya da seçili patch iki parmakla döndürülür
      if (ids.length === 2) {
        var grup = (aktif && aktif.grup) || self.secili;
        var b = grup && self.grupBilgisi(grup);
        if (b) {
          e.preventDefault();
          if (aktif && aktif.mod === 'tasima') self.sahne.konumla(aktif.parcalar, {});
          self.sahne.sahne.classList.remove('kp-sahne--surukleniyor');
          surukleBitti();
          self.sinirTasma(false);
          self.bildirimKapat('surukle');
          aktif = null;
          bosDokunma = null;
          self.sec(grup);
          var p1 = parmaklar[ids[0]];
          var p2 = parmaklar[ids[1]];
          iki = { ids: ids, bilgi: b, a0: yonAcisi(p2[0], p2[1], p1), sonGecerli: b.aci };
          donmeBasla();
        }
        return;
      }
      if (ids.length > 2 || iki) return;
      // Döndürme tutamacı
      if (e.target.closest('[data-kp-tutamac]') && self.secili) {
        var bt = self.grupBilgisi(self.secili);
        if (!bt) return;
        e.preventDefault();
        var c = ekranNoktasi(bt.pivot);
        aktif = { id: e.pointerId, mod: 'tutamac', grup: bt.grup, bilgi: bt, c: c, a0: yonAcisi(e.clientX, e.clientY, c), sonGecerli: bt.aci };
        donmeBasla();
        return;
      }
      var el = e.target.closest('.kp-parca');
      if (el && self.kucuk) {
        e.preventDefault();
        delete parmaklar[e.pointerId];
        self.onizlemeBoyutu(false);
        return;
      }
      if (!el) {
        // Boş alana dokunma seçimi kaldırır; ama ikinci parmak gelirse iki parmakla döndürmedir
        bosDokunma = { id: e.pointerId, x: e.clientX, y: e.clientY };
        return;
      }
      var grupAdi = el.getAttribute('data-grup');
      var grupParcalari = self.durum.parcalar.filter(function (p) { return p.grup === grupAdi; });
      if (!grupParcalari.length) return;
      e.preventDefault();
      var dokunulanUid = el.getAttribute('data-uid') || '';
      var harfSira = /^(isim|harf)-(\d+)$/.test(dokunulanUid) ? parseInt(dokunulanUid.split('-')[1], 10) : null;
      self.sec(grupAdi, harfSira);
      aktif = {
        id: e.pointerId,
        mod: 'tasima',
        grup: grupAdi,
        x: e.clientX,
        y: e.clientY,
        parcalar: grupParcalari,
        digerleri: self.durum.parcalar.filter(function (p) { return p.grup !== grupAdi && !self.durum.hatalar[p.uid]; }),
        dx: 0,
        dy: 0,
        sonGecerli: [0, 0],
        hareket: false
      };
    });

    kok.addEventListener('pointermove', function (e) {
      if (parmaklar[e.pointerId]) parmaklar[e.pointerId] = [e.clientX, e.clientY];
      if (iki) {
        if (iki.ids.indexOf(String(e.pointerId)) === -1) return;
        e.preventDefault();
        var p1 = parmaklar[iki.ids[0]];
        var p2 = parmaklar[iki.ids[1]];
        if (!p1 || !p2) return;
        var a = aciYakala(iki.bilgi.aci + yonAcisi(p2[0], p2[1], p1) - iki.a0);
        self.aciOnizle(iki.bilgi, a);
        iki.sonGecerli = a;
        return;
      }
      if (!aktif || e.pointerId !== aktif.id) return;
      e.preventDefault();
      if (aktif.mod === 'tutamac') {
        var a2 = aciYakala(aktif.bilgi.aci + yonAcisi(e.clientX, e.clientY, aktif.c) - aktif.a0);
        self.aciOnizle(aktif.bilgi, a2);
        aktif.sonGecerli = a2;
        return;
      }
      // Tek patch'lik üründe patch Velcro'nun ortasında sabit (döndürülebilir, taşınmaz)
      if (self.m.tekPatch) return;
      var d = cmCevir(e.clientX - aktif.x, e.clientY - aktif.y);
      if (!aktif.hareket && Math.abs(e.clientX - aktif.x) + Math.abs(e.clientY - aktif.y) < 3) return;
      if (!aktif.hareket) {
        self.sahne.sahne.classList.add('kp-sahne--surukleniyor');
        self.balonGizle();
        self.yerlestirBalonGizle();
        // Kenar bölgesi kırmızı kesikli "Kenara bırak" olarak belirir (aksesuar ekranında kenar yok)
        if (self.el.querySelector('[data-kp-kenar]')) self.el.querySelector('.kp-onizleme').classList.add('kp-onizleme--surukle');
        kutuSifirla();
      }
      aktif.hareket = true;
      aktif.dx = d[0];
      aktif.dy = d[1];
      var tasinmis = aktif.parcalar.map(function (p) {
        return kopyaParca(p, { sekil: kaydir(p.sekil, aktif.dx, aktif.dy) });
      });
      // Kenarın üstündeyse bırakınca kenara alınır
      var kenarEl = self.el.querySelector('[data-kp-kenar]');
      if (kenarEl && !kenarKutusu) kenarKutusu = kenarEl.getBoundingClientRect();
      var kr = kenarEl && kenarKutusu;
      aktif.kenaraBirak = !!kr && e.clientX >= kr.left && e.clientX <= kr.right && e.clientY >= kr.top && e.clientY <= kr.bottom;
      if (kenarEl) kenarEl.classList.toggle('kp-kenar--hedef', aktif.kenaraBirak);
      // Aksesuarın Velcro yüzeyinin üstündeyse bırakınca aksesuarın tasarımına geçer
      var hedefAks = aktif.kenaraBirak ? null : self.aksesuarHedefi(aktif.grup, tasinmis);
      self.aksesuarHedefiCiz(hedefAks && hedefAks.uid);
      var sorun = aktif.kenaraBirak || hedefAks ? null : self.grupSorunu(tasinmis, aktif.digerleri);
      var hatalar = {};
      if (sorun) tasinmis.forEach(function (p) { hatalar[p.uid] = true; });
      self.sinirTasma(sorun === 'tasma', tasinmis, sorun);
      self.sahne.konumla(tasinmis, hatalar);
    });

    function surukleBitti() {
      var oz = self.el.querySelector('.kp-onizleme');
      if (oz) oz.classList.remove('kp-onizleme--surukle');
      var kenarEl = self.el.querySelector('[data-kp-kenar]');
      if (kenarEl) kenarEl.classList.remove('kp-kenar--hedef');
      self.aksesuarHedefiCiz(null);
    }

    function birak(e) {
      kutuSifirla();
      delete parmaklar[e.pointerId];
      if (bosDokunma && bosDokunma.id === e.pointerId) {
        var kisa = Math.abs(e.clientX - bosDokunma.x) + Math.abs(e.clientY - bosDokunma.y) < 10;
        bosDokunma = null;
        if (kisa && !iki && e.type === 'pointerup' && self.secili) self.sec(null);
      }
      if (iki) {
        if (iki.ids.indexOf(String(e.pointerId)) === -1) return;
        var bitti = iki;
        iki = null;
        self.donmeBitir(bitti.bilgi, bitti.sonGecerli);
        return;
      }
      if (!aktif || e.pointerId !== aktif.id) return;
      var a = aktif;
      aktif = null;
      if (a.mod === 'tutamac') {
        self.donmeBitir(a.bilgi, a.sonGecerli);
        return;
      }
      self.sahne.sahne.classList.remove('kp-sahne--surukleniyor');
      surukleBitti();
      if (!a.hareket) return;
      var tasinmis = a.parcalar.map(function (p) {
        return kopyaParca(p, { sekil: kaydir(p.sekil, a.dx, a.dy) });
      });
      var dx = a.dx;
      var dy = a.dy;
      self.sinirTasma(false);
      var hedefAks = !a.kenaraBirak && self.aksesuarHedefi(a.grup, tasinmis);
      if (hedefAks) {
        var mc = merkez(tasinmis[0].sekil);
        if (self.aksesuaraAktar(a.grup, mc[0], mc[1], tasinmis[0].aci)) return;
      }
      // Bırakıldığı yerde kalır (geçersizse kırmızı işaretlenir); kenarın üstüne bırakıldıysa kenara alınır
      if (a.kenaraBirak) {
        kenaraAl(self.t, a.grup);
        if (self.setCercevesi && a.parcalar[0].setGrup === self.setCercevesi) self.setCercevesi = null;
        self.secili = null;
        return self.yenile();
      }
      if (blokGrubu(a.grup)) {
        var bn = grupBlogu(a.grup);
        var c = self.blokMerkezi(bn);
        self.t[BLOK_ALAN[bn].merkez] = [c[0] + dx, c[1] + dy];
      } else {
        konumKaydir(self.t, a.parcalar[0], dx, dy);
      }
      sonaAl(self.t, a.grup);
      // Setin bir patch'i taşınınca set çerçevesi kalkar (set bozulmaz)
      if (self.setCercevesi && a.parcalar[0].setGrup === self.setCercevesi) self.setCercevesi = null;
      self.yenile();
    }

    kok.addEventListener('pointerup', birak);
    kok.addEventListener('pointercancel', birak);
    // iOS: sahne üzerinde sayfa kaymasını engelle
    kok.addEventListener(
      'touchmove',
      function (e) {
        if (e.target.closest('.kp-parca, [data-kp-tutamac]') || e.touches.length > 1) e.preventDefault();
      },
      { passive: false }
    );
  };

  // Kart ve sepet için içerik özeti: "GOKHAN · 2 · Beyaz Kalp"
  function tasarimIcerigi(m, yer, t) {
    t = satinAlinacak(m, t);
    var parcalar = yer.parcalar(t);
    var ogeler = [];
    if (t.isim) ogeler.push(t.isim);
    var saglam = saglamSetler(m, t);
    var setIdleri = saglam.map(function (k) { return k.id; });
    saglam.forEach(function (k) { ogeler.push(m.hazirSetHarita[k.urunId].ad + ' seti'); });
    parcalar.forEach(function (p) {
      if (yazidaMi(p) || (p.setGrup && setIdleri.indexOf(p.setGrup) !== -1)) return;
      if (p.tip === 'number' || p.tip === 'icon' || p.tip === 'aksesuar') ogeler.push(p.etiket);
    });
    return ogeler.join(' · ');
  }

  // Sepetteki _tasarim_konum'dan çizilecek parçalar (varyant kimliği + alan merkezine göre cm + açı)
  function konumParcalari(m, konum) {
    if (!konum || !Array.isArray(konum.p)) return [];
    var alan = (konum.alan && m.alanlar.filter(function (a) { return a.id === konum.alan; })[0]) || m.alanBul('letter') || m.alanlar[0];
    if (!alan) return [];
    var ac = merkez(alan.sekil);
    var bul = {};
    m.setler.forEach(function (st) { st.varyantlar.forEach(function (v) { bul[v.id] = { tanim: st, v: v, tip: 'letter' }; }); });
    m.rakamSetleri.forEach(function (st) { st.varyantlar.forEach(function (v) { bul[v.id] = { tanim: st, v: v, tip: 'number' }; }); });
    m.ikonlar.forEach(function (ik) { ik.varyantlar.forEach(function (v) { bul[v.id] = { tanim: ik, v: v, tip: 'icon' }; }); });
    var liste = [];
    konum.p.forEach(function (x, i) {
      var b = bul[x.v];
      if (!b) return;
      var o = b.tip === 'letter' ? varyantOlcu(b.tanim, b.v) : parcaOlcu(b.tanim, b.v);
      var cx = ac[0] + (Number(x.x) || 0);
      var cy = ac[1] + (Number(x.y) || 0);
      var aci = Number(x.a) || 0;
      var sekil = b.tip !== 'letter' && b.tanim.sekil === 'circle'
        ? { t: 'circle', cx: cx, cy: cy, r: Math.max(o.en, o.boy) / 2 }
        : donukDikdortgen(cx, cy, o.en, o.boy, aci);
      // isimde: yazıya ait karakter (yeni kayıtlarda s:1; eskilerde yalnızca harfler)
      liste.push({ uid: 'k' + i, grup: 'k' + i, tip: b.tip, tanim: b.tanim, varyant: b.v, sekil: sekil, en: o.en, boy: o.boy, aci: aci, etiket: b.v.karakter || b.tanim.ad, isimde: x.s ? true : b.tip === 'letter', setKodu: x.k || null, kenar: !!x.e, alanId: x.z || null });
    });
    return liste;
  }

  // Sepetteki gruptan editör tasarımı kurar (_tasarim_konum: varyantlar + alan merkezine göre konum ve açı).
  // İsim, kaydedilen yerleşime blok olarak oturuyorsa blok; değilse harfler ayrı (her harf kendi yerinde ve açısında).
  function konumdanTasarim(m, yer, konum) {
    var parcalar = konumParcalari(m, konum);
    var aksVar = (konum && konum.p || []).some(function (x) { return x.t === 'a'; });
    if (!parcalar.length && !aksVar) return null;
    var harfler = parcalar.filter(function (p) { return p.isimde; });
    var t = bosTasarim(m);
    var ilkHarf = harfler.filter(function (p) { return p.tip === 'letter'; })[0];
    if (ilkHarf) t.setId = ilkHarf.tanim.id;
    t.isim = harfler.map(function (p) { return p.varyant.karakter || ''; }).join('');
    t.karakterSetleri = harfler.map(function (p) { return p.tip === 'letter' ? p.tanim.id : null; });
    if (harfler.some(function (p) { return p.tanim.cokRenkli; })) {
      t.harfRenkleri = harfler.map(function (p) { return p.tanim.cokRenkli ? p.varyant.id : null; });
    }
    var rs = m.rakamSetleri[0];
    t.parcalar = parcalar
      .filter(function (p) { return !p.isimde; })
      .map(function (p) {
        var c = merkez(p.sekil);
        var urunId = p.tip === 'number' ? rs && rs.id : m.ikonlar.filter(function (ik) { return ik.varyantlar.some(function (v) { return v.id === p.varyant.id; }); })[0].id;
        var parca = { uid: yeniId(p.tip === 'number' ? 'r' : 'i'), tip: p.tip, urunId: urunId, varyantId: p.varyant.id, cx: c[0], cy: c[1], aci: p.aci || 0 };
        if (p.setKodu) parca.setGrup = 'S' + p.setKodu.replace(/\W/g, '');
        if (p.kenar) parca.kenar = true;
        return parca;
      });
    // Aksesuarlar: konumdaki 'a' kayıtları (iç tasarım sepet satırından ayrıca eklenir)
    var ac0 = merkez((konum.alan && m.alanlar.filter(function (a) { return a.id === konum.alan; })[0] || m.alanBul('letter') || m.alanlar[0]).sekil);
    t.aksesuarlar = (konum.p || [])
      .filter(function (x) { return x.t === 'a'; })
      .map(function (x) {
        var aks = m.aksesuarlar.filter(function (a) { return String(a.varyant) === String(x.v); })[0];
        return aks ? { uid: x.u || yeniId('a'), urunId: aks.id, cx: ac0[0] + (Number(x.x) || 0), cy: ac0[1] + (Number(x.y) || 0), aci: Number(x.a) || 0, tasarim: null, kenar: !!x.e } : null;
      })
      .filter(Boolean);
    // Sepette set ürünü olarak duran patch'ler yeniden set olarak kurulur
    var setKodlari = {};
    parcalar.forEach(function (p) { if (p.setKodu) setKodlari['S' + p.setKodu.replace(/\W/g, '')] = p.setKodu.split('#')[0]; });
    t.hazirSetler = Object.keys(setKodlari).map(function (id) { return { id: id, urunId: setKodlari[id] }; });
    setleriTemizle(m, t);
    if (harfler.length) {
      var merkezler = harfler.map(function (p) { return merkez(p.sekil); });
      var acilar = harfler.map(function (p) { return p.aci || 0; });
      var kenarlar = harfler.map(function (p) { return !!p.kenar; });
      // Çok alanlı üründe: harfler iki alana sırayla dağılmışsa (önce biri, sonra diğeri) yazı iki blok
      var n = harfler.length;
      var zon = harfler.map(function (p) { return p.alanId; });
      if (harfAlanlari(m).length > 1 && zon.every(Boolean)) {
        var k = 1;
        while (k < n && zon[k] === zon[0]) k++;
        var ikinci = zon.slice(k);
        if (k < n && ikinci.every(function (z) { return z === ikinci[0]; }) && ikinci[0] !== zon[0]) {
          t.bol = k;
          t.bolAlan = [zon[0], ikinci[0]];
        } else if (k === n) {
          t.bolAlan = [zon[0]];
          if (zon[0] !== varsayilanYaziAlani(m).id) t.yaziYeri = zon[0];
        }
        // Sepetten gelen yerleşim olduğu gibi kalır (yazı değişene kadar yeniden dağıtılmaz)
        t.bolSabit = true;
      }
      // Her blok önce blok olarak denenir: merkez harf merkezlerinin ortalaması, sonra hesaplanan blokla aradaki fark kadar kaydır
      var bloklar = yaziBloklari(t);
      var hepsiBlok = bloklar.every(function (bl) {
        var ad = BLOK_ALAN[bl.b];
        var mz = merkezler.slice(bl.bas, bl.son);
        var ac = acilar.slice(bl.bas, bl.son);
        if (!ac.every(function (a) { return a === ac[0]; })) return false;
        var ox = 0, oy = 0;
        mz.forEach(function (c) { ox += c[0] / mz.length; oy += c[1] / mz.length; });
        t[ad.merkez] = [ox, oy];
        t[ad.aci] = ac[0];
        var blok = yer.parcalar(yaziKopyasi(t)).filter(function (p) { return p.grup === ad.grup; });
        if (blok.length !== mz.length) return false;
        var fx = 0, fy = 0;
        blok.forEach(function (p, i) { var c = merkez(p.sekil); fx += (mz[i][0] - c[0]) / blok.length; fy += (mz[i][1] - c[1]) / blok.length; });
        t[ad.merkez] = [ox + fx, oy + fy];
        blok = yer.parcalar(yaziKopyasi(t)).filter(function (p) { return p.grup === ad.grup; });
        if (!blok.every(function (p, i) { var c = merkez(p.sekil); return Math.abs(c[0] - mz[i][0]) < 0.25 && Math.abs(c[1] - mz[i][1]) < 0.25; })) return false;
        // Kenardaki harfler: bloğun hepsi kenardaysa blok kenarda; bir kısmı kenardaysa harfler ayrı
        var kb = kenarlar.slice(bl.bas, bl.son);
        if (kb.some(Boolean) && !kb.every(Boolean)) return false;
        t[ad.kenar] = kb.every(Boolean);
        return true;
      });
      if (!hepsiBlok) {
        BLOK_ALAN.forEach(function (ad) {
          t[ad.merkez] = null;
          t[ad.aci] = 0;
          t[ad.kenar] = false;
          t[ad.ayri] = true;
        });
        t.harfKonumlari = merkezler;
        t.harfAcilari = acilar;
        if (kenarlar.some(Boolean)) t.harfKenar = kenarlar;
      }
    }
    return t;
  }

  // Küçük, alana yakın tasarım önizlemesi (kart ve sepet kartı)
  function miniSahneKur(kok, m, yer) {
    kok.style.aspectRatio = m.gorsel.en + ' / ' + m.gorsel.boy;
    var sahne = new Sahne(m, yer, kok, { etkilesimli: false });
    var y = yakinGorunumOran(m);
    sahne.sahne.style.position = 'absolute';
    sahne.sahne.style.width = y.olcek * 100 + '%';
    sahne.sahne.style.left = y.sol + '%';
    sahne.sahne.style.top = y.ust + '%';
    return sahne;
  }

  function konumCiz(kok, m, yer, konum) {
    if (!kok) return;
    miniSahneKur(kok, m, yer).ciz(konumParcalari(m, konum), {}, false);
  }

  // Aksesuarı ve üzerindeki patch'leri çanta koordinatında (cm) parça listesine çevirir (çekmece görseli için).
  // Aksesuar görselinin tamamı (kanca dahil) ve iç patch'ler aksesuarla birlikte döndürülür.
  function aksesuarDunyaParcalari(m, p) {
    var aks = p.tanim;
    var d = aks.dis;
    var pc = merkez(p.sekil);
    var aci = p.aci || 0;
    var pngEn = (d.en * 100) / d.w;
    var pngBoy = (d.boy * 100) / d.h;
    var gc = dondurNokta([pc[0] + ((50 - (d.x + d.w / 2)) / 100) * pngEn, pc[1] + ((50 - (d.y + d.h / 2)) / 100) * pngBoy], pc, aci);
    var liste = [{ varyant: { gorsel: aks.gorsel.kucuk, png: true }, en: pngEn, boy: pngBoy, aci: aci, sekil: { t: 'obb', cx: gc[0], cy: gc[1], w: pngEn, h: pngBoy, a: aci } }];
    var am = p.icTasarim && m.aksesuarModeli(aks.id);
    if (!am) return liste;
    var dcx = ((d.x + d.w / 2) / 100) * am.m.Wcm;
    var dcy = ((d.y + d.h / 2) / 100) * am.m.Hcm;
    var k = d.en / ((am.m.Wcm * d.w) / 100);
    am.yer.parcalar(p.icTasarim).forEach(function (ip) {
      if (ip.kenar) return;
      var c = merkez(ip.sekil);
      var dc = dondurNokta([pc[0] + (c[0] - dcx) * k, pc[1] + (c[1] - dcy) * k], pc, aci);
      var en = (ip.sekil.t === 'circle' ? ip.sekil.r * 2 : ip.en) * k;
      var boy = (ip.sekil.t === 'circle' ? ip.sekil.r * 2 : ip.boy) * k;
      var a2 = (ip.aci || 0) + aci;
      liste.push({ varyant: ip.varyant, en: en, boy: boy, aci: a2, sekil: ip.sekil.t === 'circle' ? { t: 'circle', cx: dc[0], cy: dc[1], r: en / 2 } : { t: 'obb', cx: dc[0], cy: dc[1], w: en, h: boy, a: a2 } });
    });
    return liste;
  }

  // Sepet çekmecesinde tasarım görseli için çizim kiti (ürün sayfası dışında model verisi yok):
  // çanta görseli, yakın görünüm ve her patch'in görseli ile konumu (yüzde). localStorage'da tasarım kimliğiyle saklanır.
  var CIZIM_ANAHTARI = 'kisisel-sepet-cizim';
  function cizimKitiKaydet(kimlik, m, parcalar) {
    try {
      var kitler = JSON.parse(window.localStorage.getItem(CIZIM_ANAHTARI) || '{}');
      kitler[kimlik] = {
        z: Date.now(),
        g: m.gorsel.kucuk,
        o: m.gorsel.en / m.gorsel.boy,
        y: yakinGorunumOran(m),
        p: parcalar.filter(function (p) { return !p.kenar; }).reduce(function (l, p) { return l.concat(p.tip === 'aksesuar' ? aksesuarDunyaParcalari(m, p) : [p]); }, []).map(function (p) {
          var st = parcaStili(m, p);
          return { u: p.varyant && p.varyant.gorsel, l: st.left, t: st.top, w: st.width, h: st.height, r: st.transform, d: p.sekil.t === 'circle', j: !!(p.varyant && !p.varyant.png) };
        })
      };
      // En yeni 20 tasarım saklanır
      var anahtarlar = Object.keys(kitler).sort(function (a, b) { return kitler[b].z - kitler[a].z; });
      anahtarlar.slice(20).forEach(function (a) { delete kitler[a]; });
      window.localStorage.setItem(CIZIM_ANAHTARI, JSON.stringify(kitler));
    } catch (e) {
      /* depolama yoksa çekmecede ürün görseli kalır */
    }
  }

  /* ------------------------------------------------------------------ */
  /* Kampanyalı fiyat (Storefront API ile geçici sepet simülasyonu)       */
  /* ------------------------------------------------------------------ */

  // Fiyatı Shopify belirler: müşterinin sepetine dokunmadan Storefront API'de geçici sepetler oluşturulur
  // (mevcut sepet / mevcut sepet + tasarım), uygulanan kampanyalar adlarıyla okunur.
  // Bekletmemek için: kampanya kuralları (adet basamakları, tutarlar, %'lik eşik, hangi ürünlerin dahil olduğu)
  // simülasyonlardan öğrenilip saklanır; fiyat bu kurallarla anında yerel hesaplanır, Shopify arka planda doğrular,
  // fark çıkarsa fiyat sessizce düzeltilir ve kurallar güncellenir. Aynı sepetin sonucu önbellekten gelir.
  var KAMPANYA_API = '/api/2025-07/graphql.json';

  // Simülasyon istekleri sayfanın fetch'i ile gönderilmez. Shopify'ın Web Pixels Manager'ı window.fetch ve
  // XMLHttpRequest'i sarar; Storefront API yanıtındaki extensions.cart_changelog'u (oluşturulan her geçici sepetin
  // satırları) "ürün sepete eklendi" olarak yayınlar ve bunlar Meta'ya Conversions API ile AddToCart olarak gider: her
  // harf / ikon değişikliğinde sepete eklenmemiş ürünler için onlarca AddToCart (teşhis 2026-10-22). Gizli, aynı
  // kökenli bir iframe'in kendi fetch'i izlenmez. Kurulamazsa simülasyon yapılmaz (liste fiyatı + "İndirimler sepette
  // uygulanır"). Tasarımın gerçek sepete eklemesi (/cart/add.js) de bu yoldan gider; tasarım başına tek AddToCart
  // sepetOlcumu ile gönderilir (2026-10-30).
  var izsizCerceve = null;
  function izsizFetch() {
    try {
      if (!izsizCerceve || !izsizCerceve.isConnected || !izsizCerceve.contentWindow) {
        izsizCerceve = document.createElement('iframe');
        izsizCerceve.setAttribute('aria-hidden', 'true');
        izsizCerceve.setAttribute('tabindex', '-1');
        izsizCerceve.setAttribute('data-kp-izsiz', '');
        izsizCerceve.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
        (document.body || document.documentElement).appendChild(izsizCerceve);
      }
      var w = izsizCerceve.contentWindow;
      return w && typeof w.fetch === 'function' && w.fetch !== window.fetch ? w.fetch.bind(w) : null;
    } catch (e) {
      return null;
    }
  }

  function kampanyaIstegi(sorgu) {
    var f = izsizFetch();
    if (!f) return Promise.reject(new Error('Kampanya simülasyonu için izlenmeyen istek yok'));
    return f(window.location.origin + KAMPANYA_API, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(sorgu)
    }).then(function (r) { return r.json(); });
  }
  var kampanyaOnbellek = {}; // anahtar -> söz
  var kampanyaSonuclari = {}; // anahtar -> sonuç (anında kullanım)
  // v2: sonuçlar tasarımın payını da taşır
  var SONUC_ANAHTARI = 'kp-kampanya-sonuclari-2';
  var sepetOnbellek = null; // { zaman, satirlar: [{ v, q, p, f, tasarim }] }

  try {
    kampanyaSonuclari = JSON.parse(sessionStorage.getItem(SONUC_ANAHTARI) || '{}') || {};
  } catch (e) {
    kampanyaSonuclari = {};
  }
  function sonucSakla(anahtar, sonuc) {
    kampanyaSonuclari[anahtar] = sonuc;
    var anahtarlar = Object.keys(kampanyaSonuclari);
    if (anahtarlar.length > 40) anahtarlar.slice(0, anahtarlar.length - 40).forEach(function (a) { delete kampanyaSonuclari[a]; });
    try { sessionStorage.setItem(SONUC_ANAHTARI, JSON.stringify(kampanyaSonuclari)); } catch (e) { /* yok say */ }
  }

  // Müşterinin sepeti değişti: sepet yeniden okunur, kampanya anahtarları da değişir (sonuçlar yeniden hesaplanır)
  var kampanyaSurumu = 0;
  function kampanyaSepetiniUnut() {
    sepetOnbellek = null;
    kampanyaSurumu++;
  }

  function sepetSatirlari(sepet) {
    return (sepet.items || []).filter(simSatiri).map(function (k) {
      return { v: k.variant_id, q: k.quantity, p: k.product_id, f: Number(k.original_price != null ? k.original_price : k.price) || 0, tasarim: (k.properties || {})._tasarim_id || null };
    });
  }

  // Müşterinin şu anki sepet satırları (5 sn önbellek)
  function musteriSepeti() {
    if (sepetOnbellek && Date.now() - sepetOnbellek.zaman < 5000) return Promise.resolve(sepetOnbellek.satirlar);
    var rotalar = window.routes || {};
    return fetch((rotalar.cart_url || '/cart') + '.js', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (sepet) {
        var satirlar = sepetSatirlari(sepet);
        sepetOnbellek = { zaman: Date.now(), satirlar: satirlar };
        return satirlar;
      });
  }

  function kurus(tutar) {
    return Math.round(parseFloat((tutar && tutar.amount) || tutar || 0) * 100) || 0;
  }

  // Kampanya adı Shopify'daki gibi, yalnızca fazla boşluklar kırpılır (eşleştirme anahtarı)
  function kampanyaAdi(ad) {
    return String(ad || '').replace(/\s+/g, ' ').trim();
  }

  // Müşteriye gösterilen ad: "2li patche indirim" → "2'li patch indirimi", "Ekstra %10 İndirim" → "Ekstra %10 indirim"
  function sayiLiEki(n) {
    n = parseInt(n, 10);
    var birler = { 1: 'li', 2: 'li', 3: 'lü', 4: 'lü', 5: 'li', 6: 'lı', 7: 'li', 8: 'li', 9: 'lu' };
    var onlar = { 1: 'lu', 2: 'li', 3: 'lu', 4: 'lı', 5: 'li', 6: 'lı', 7: 'li', 8: 'li', 9: 'lı' };
    return n % 10 ? birler[n % 10] : onlar[(n % 100) / 10] || 'lü';
  }
  function kampanyaGosterimAdi(ad) {
    var a = kampanyaAdi(ad);
    var m = a.match(/^(\d+)\s*['’]?\s*(?:li|lı|lu|lü)?\s*patch(?:e|i|lere|e)?\s+indirim(?:i)?$/i);
    if (m) return m[1] + "'" + sayiLiEki(m[1]) + ' patch indirimi';
    return a.replace(/\s[İI]ndirim$/, ' indirim').replace(/\s[İI]ndirimi$/, ' indirimi');
  }

  // atla: indirimi sayılmayacak satırların varyantları (kombinin hediye Tshirt'leri: kombin indirimi tasarımın değil)
  function sepetIndirimleri(sepet, atla) {
    var adlar = {};
    var ekle = function (d) {
      var ad = kampanyaAdi(d.title) || 'İndirim';
      adlar[ad] = (adlar[ad] || 0) + kurus(d.discountedAmount);
    };
    (sepet.discountAllocations || []).forEach(ekle);
    ((sepet.lines && sepet.lines.nodes) || []).forEach(function (l) {
      if (atla && atla[satirVaryanti(l)]) return;
      (l.discountAllocations || []).forEach(ekle);
    });
    return adlar;
  }
  function satirVaryanti(l) {
    return (l.merchandise && l.merchandise.id && String(l.merchandise.id).split('/').pop()) || '';
  }
  // Kombin simülasyonunda indirimi sayılmayan hediye Tshirt varyantları (kombin dışında null)
  function kombinAtla(m) {
    if (!m || !m.kombin) return null;
    var h = {};
    m.kombin.tisortler.forEach(function (s) { s.varyantlar.forEach(function (v) { h[String(v.id)] = true; }); });
    return h;
  }

  var SEPET_PARCASI =
    'fragment C on Cart { cost { subtotalAmount { amount } totalAmount { amount } } ' +
    'discountAllocations { discountedAmount { amount } ... on CartAutomaticDiscountAllocation { title } } ' +
    'lines(first: 100) { nodes { quantity merchandise { ... on ProductVariant { id } } discountAllocations { discountedAmount { amount } ... on CartAutomaticDiscountAllocation { title } } } } }';

  function satirGirdisi(satirlar) {
    var birlesik = {};
    satirlar.forEach(function (s) { birlesik[s.v] = (birlesik[s.v] || 0) + s.q; });
    return Object.keys(birlesik).map(function (v) { return { merchandiseId: 'gid://shopify/ProductVariant/' + v, quantity: birlesik[v] }; });
  }

  var toplamIndirim = function (x) { return Object.keys(x || {}).reduce(function (t, ad) { return t + x[ad]; }, 0); };
  var kampanyaFarki = function (x, y) {
    var liste = [];
    Object.keys(y).forEach(function (ad) {
      var t = y[ad] - (x[ad] || 0);
      if (t > 0) liste.push({ ad: ad, tutar: t });
    });
    return liste;
  };

  // Tasarımın kendi satırlarına düşen indirim (alt çubuk, Özet, kart bunu gösterir; sepetteki diğer ürünlerin indirimi değil).
  // Ürün (adet) indirimi Shopify'da satırlara dağıtılır: tasarımın o satırdaki adedi oranında. Sepet düzeyindeki indirim
  // (Ekstra %10) tutarla orantılı: tasarımın (ürün indirimi düşülmüş) tutarı / sepetin ara toplamı.
  function tasarimIndirimi(k) {
    if (!k || k.hata) return 0;
    var x = k.tasarimIndirim != null ? k.tasarimIndirim : k.indirim;
    return x > 0 ? x : 0;
  }

  function tasarimPayiSepetten(cart, tasarim, atla) {
    var miktar = {};
    var tutar = 0;
    tasarim.forEach(function (s) {
      miktar[String(s.v)] = (miktar[String(s.v)] || 0) + s.q;
      tutar += (s.f || 0) * s.q;
    });
    var pay = {};
    var urunPayi = 0;
    ((cart.lines && cart.lines.nodes) || []).forEach(function (l) {
      var v = l.merchandise && l.merchandise.id && String(l.merchandise.id).split('/').pop();
      if (!v || !miktar[v] || !l.quantity || (atla && atla[v])) return;
      var oran = Math.min(1, miktar[v] / l.quantity);
      (l.discountAllocations || []).forEach(function (d) {
        var ad = kampanyaAdi(d.title) || 'İndirim';
        var x = kurus(d.discountedAmount) * oran;
        pay[ad] = (pay[ad] || 0) + x;
        urunPayi += x;
      });
    });
    var ara = kurus(cart.cost && cart.cost.subtotalAmount);
    (cart.discountAllocations || []).forEach(function (d) {
      var ad = kampanyaAdi(d.title) || 'İndirim';
      if (ara > 0) pay[ad] = (pay[ad] || 0) + kurus(d.discountedAmount) * Math.max(0, tutar - urunPayi) / ara;
    });
    Object.keys(pay).forEach(function (ad) { pay[ad] = Math.round(pay[ad]); if (!pay[ad]) delete pay[ad]; });
    return pay;
  }

  function payEkle(sonuc, pay) {
    // Kuruş hassasiyetinde: sepette görünecek tutarla aynı (Shopify satır paylarını kuruşlu dağıtır, ör. 370 / 4 = 92,50)
    Object.keys(pay).forEach(function (ad) { pay[ad] = Math.round(pay[ad]); if (!pay[ad]) delete pay[ad]; });
    sonuc.tasarimPay = pay;
    sonuc.tasarimIndirim = toplamIndirim(pay);
    return sonuc;
  }

  // Kombin sepeti: kombin indirimi (hediye Tshirt) sipariş indirimleriyle birleşmez, Shopify Tshirt indirimini seçer; tutar
  // eşikli kampanyalar (Ekstra %10) kombin sepetinde uygulanmaz (Storefront: test/kombin/kombin-v5-sepetleri.mjs, h).
  // Simülasyon kodla yapılır (kampanyaHesapla); anlık yerel hesapta ve kodsuz durumda görünseler de düşülür (önbellekteki
  // sonuç değişmez).
  function kombinEsiksiz(m, sonuc) {
    if (!m || !m.kombin || !sonuc || sonuc.hata) return sonuc;
    var adlar = (m.ayar.kampanyaEsikleri || []).map(function (e) { return kampanyaAdi(e.baslik); });
    if (!adlar.length) return sonuc;
    var suz = function (h) {
      var y = {};
      Object.keys(h || {}).forEach(function (ad) { if (adlar.indexOf(kampanyaAdi(ad)) === -1) y[ad] = h[ad]; });
      return y;
    };
    var once = suz(sonuc.onceAktif);
    var y = Object.assign({}, sonuc, kampanyaSonucu(once, suz(sonuc.aktif), sonuc.altToplam, sonuc.uygunAdet, {}));
    Object.keys(sonuc.ekler || {}).forEach(function (ad) {
      var ek = suz(sonuc.ekler[ad].aktif);
      y.ekler[ad] = { kampanyalar: kampanyaFarki(once, ek), indirim: toplamIndirim(ek) - toplamIndirim(once), aktif: ek, sepetIndirim: toplamIndirim(ek) };
    });
    if (sonuc.tasarimPay) payEkle(y, suz(sonuc.tasarimPay));
    return y;
  }

  // Ortak sonuç biçimi: once/sonra = kampanya adı → tutar (kuruş)
  function kampanyaSonucu(once, sonra, altToplam, uygunAdet, ekler) {
    return {
      kampanyalar: kampanyaFarki(once, sonra),
      // Sepetteki bir kampanya tasarımla birlikte kalkabilir (ör. 2'li yerine 4'lü): net fark ayrıca gösterilir
      kayiplar: kampanyaFarki(sonra, once),
      indirim: toplamIndirim(sonra) - toplamIndirim(once),
      sepetIndirim: toplamIndirim(sonra),
      aktif: sonra,
      onceAktif: once,
      altToplam: altToplam,
      uygunAdet: uygunAdet,
      ekler: ekler || {}
    };
  }

  /* ---------- Öğrenilen kurallar ---------- */

  // v2: Ekstra %10 oranı ürün indirimi düşülmüş ara toplama göre (eski kayıtlar yeniden öğrenilir)
  var KURAL_ANAHTARI = 'kp-kampanya-kurallari-2';
  var kurallar = null; // { zaman, ornek, merdiven: [{ k, ad, tutar }], uygun: { ürünId: bool }, yuzde: { ad: oran } }
  function kurallariOku() {
    if (kurallar) return kurallar;
    try {
      var k = JSON.parse(localStorage.getItem(KURAL_ANAHTARI) || 'null');
      if (k && Date.now() - k.zaman < 24 * 3600 * 1000 && Array.isArray(k.merdiven)) kurallar = k;
    } catch (e) { /* depolama kapalı */ }
    return kurallar;
  }
  function kurallariYaz() {
    try { localStorage.setItem(KURAL_ANAHTARI, JSON.stringify(kurallar)); } catch (e) { /* yok say */ }
  }

  // Varyant → ürün ve fiyat (çanta, harf/rakam setleri, ikonlar, hazır setler, aksesuarlar)
  function varyantHaritasi(m) {
    if (m._varyantHaritasi) return m._varyantHaritasi;
    var h = {};
    var ekle = function (v, p, f, n) { if (v != null) h[String(v)] = { p: String(p), f: Number(f) || 0, n: n || '' }; };
    ekle(m.urun.varyant, m.urun.id, m.urun.fiyat, m.urun.baslik);
    m.setler.concat(m.rakamSetleri).forEach(function (s) { s.varyantlar.forEach(function (v) { ekle(v.id, s.id, v.fiyat, s.ad); }); });
    m.ikonlar.forEach(function (i) { i.varyantlar.forEach(function (v) { ekle(v.id, i.id, v.fiyat, i.ad); }); });
    (m.hazirSetler || []).forEach(function (s) { ekle(s.varyant, s.id, s.fiyat, s.ad); });
    (m.aksesuarlar || []).forEach(function (a) { ekle(a.varyant, a.id, a.fiyat, a.ad); });
    // Kombin: bütün sweatshirt yaşları ve hediye Tshirt'ler (ölçümde Tshirt 0 TL)
    if (m.kombin) {
      m.kombin.sweatshirtler.forEach(function (s) { s.varyantlar.forEach(function (v) { ekle(v.id, s.id, v.fiyat, s.baslik); }); });
      m.kombin.tisortler.forEach(function (s) { s.varyantlar.forEach(function (v) { ekle(v.id, s.id, 0, s.baslik); }); });
    }
    m._varyantHaritasi = h;
    return h;
  }
  function satirlariZenginlestir(m, satirlar) {
    var h = varyantHaritasi(m);
    return satirlar.map(function (s) {
      var b = h[String(s.v)] || {};
      return { v: s.v, q: s.q, p: s.p != null ? String(s.p) : b.p, f: s.f != null ? s.f : b.f || 0, tasarim: s.tasarim };
    });
  }

  function yuzdeOrani(ad) {
    var k = kurallariOku();
    if (k && k.yuzde && k.yuzde[ad]) return k.yuzde[ad];
    var m = String(ad).match(/%\s*(\d+)/);
    return m ? Number(m[1]) / 100 : 0;
  }

  // Kurallarla yerel hesap: satirlar [{ v, q, p, f }]
  function yerelIndirimler(k, satirlar, esikler) {
    var ara = 0;
    var n = 0;
    satirlar.forEach(function (s) {
      ara += (s.f || 0) * s.q;
      if (k.uygun[String(s.p)] === true) n += s.q;
    });
    // Shopify (simülasyonla doğrulandı): tutar eşiği adet (ürün) indirimi düşüldükten sonraki ara toplama bakar.
    // Adet indirimiyle eşik tutmuyorsa ama indirimsiz tutuyorsa ikisi birlikte uygulanmaz; müşteriye daha çok
    // kazandıran seçilir (ör. 7 patch: 4'lü −370 yerine tek başına Ekstra %10 −531).
    var adet = null;
    k.merdiven.forEach(function (x) { if (n >= x.k) adet = x; });
    var uygunTutar = 0;
    satirlar.forEach(function (s) { if (k.uygun[String(s.p)] === true) uygunTutar += (s.f || 0) * s.q; });
    var secenek = function (adetli) {
      var aktif = {};
      var adetIndirim = adetli && adet ? adet.tutar : 0;
      if (adetli && adet) aktif[kampanyaAdi(adet.ad)] = adet.tutar;
      var alt = ara - adetIndirim;
      (esikler || []).forEach(function (e) {
        var ad = kampanyaAdi(e.baslik);
        if (alt >= e.tutar) aktif[ad] = Math.round(yuzdeOrani(ad) * alt);
      });
      return { aktif: aktif, alt: alt, adet: adetli && adet ? adet : null };
    };
    var a = secenek(true);
    var b = adet ? secenek(false) : a;
    var sec = toplamIndirim(b.aktif) > toplamIndirim(a.aktif) ? b : a;
    // alt: Shopify'daki ara toplam (uygulanan ürün indirimi düşülmüş)
    return { aktif: sec.aktif, ara: ara, alt: sec.alt, n: n, adet: sec.adet, uygunTutar: uygunTutar };
  }

  function yerelKampanya(m, temel, tasarim, ekler) {
    var k = kurallariOku();
    if (!k) return null;
    var esikler = m.ayar.kampanyaEsikleri;
    var a = yerelIndirimler(k, temel, esikler);
    var b = yerelIndirimler(k, temel.concat(tasarim), esikler);
    var ekSonuc = {};
    (ekler || []).forEach(function (e) {
      var x = yerelIndirimler(k, temel.concat(tasarim, e.satirlar), esikler);
      ekSonuc[e.ad] = { aktif: x.aktif, sepetIndirim: toplamIndirim(x.aktif), indirim: toplamIndirim(x.aktif) - toplamIndirim(a.aktif) };
    });
    var s = kampanyaSonucu(a.aktif, b.aktif, b.alt, b.n, ekSonuc);
    s.yerel = true;
    // Tasarımın payı: adet indirimi uygun tutar oranında, diğerleri (ürün indirimi düşülmüş) tutar oranında
    var tUygun = 0;
    var tTutar = 0;
    tasarim.forEach(function (x) {
      tTutar += (x.f || 0) * x.q;
      if (k.uygun[String(x.p)] === true) tUygun += (x.f || 0) * x.q;
    });
    var pay = {};
    var urunPayi = 0;
    if (!temel.length) return payEkle(s, Object.assign({}, b.aktif));
    if (b.adet && b.uygunTutar) {
      var adAdet = kampanyaAdi(b.adet.ad);
      urunPayi = b.adet.tutar * tUygun / b.uygunTutar;
      pay[adAdet] = urunPayi;
    }
    Object.keys(b.aktif).forEach(function (ad) {
      if (b.adet && ad === kampanyaAdi(b.adet.ad)) return;
      if (b.alt > 0) pay[ad] = b.aktif[ad] * Math.max(0, tTutar - urunPayi) / b.alt;
    });
    Object.keys(pay).forEach(function (ad) { pay[ad] = Math.round(pay[ad]); if (!pay[ad]) delete pay[ad]; });
    payEkle(s, pay);
    return s;
  }

  function sonucAnahtari(temel, tasarim, ekler) {
    return JSON.stringify([satirGirdisi(temel), satirGirdisi(tasarim), (ekler || []).map(function (e) { return [e.ad, satirGirdisi(e.satirlar)]; })]);
  }

  // Anında sonuç: aynı sepet daha önce Shopify'a sorulduysa o (kesin), değilse öğrenilen kurallarla yerel hesap
  function kampanyaAnlik(m, tasarimSatirlari, haric, ekler) {
    var mevcut = sepetOnbellek ? sepetOnbellek.satirlar : [];
    var temel = mevcut.filter(function (s) { return !haric || s.tasarim !== haric; });
    var kayit = kampanyaSonuclari[sonucAnahtari(temel, tasarimSatirlari, ekler)];
    if (kayit) return kombinEsiksiz(m, kayit);
    return kombinEsiksiz(m, yerelKampanya(m, satirlariZenginlestir(m, temel), satirlariZenginlestir(m, tasarimSatirlari), (ekler || []).map(function (e) { return { ad: e.ad, satirlar: satirlariZenginlestir(m, e.satirlar) }; })));
  }

  // Shopify sepetinden kural öğrenme: adet kampanyası aktifse, payı olan satırların ürünleri dahildir, olmayanlar değil.
  // Tutar eşikli kampanyanın oranı: indirim / (ara toplam − adet indirimi)
  function kurallariSepettenOgren(cart, urunler, esikler) {
    var k = kurallariOku();
    if (!k || !cart) return;
    var merdivenAdlari = k.merdiven.map(function (x) { return kampanyaAdi(x.ad); });
    var adetAktif = false;
    var degisti = false;
    var satirlar = (cart.lines && cart.lines.nodes) || [];
    satirlar.forEach(function (l) {
      (l.discountAllocations || []).forEach(function (d) { if (merdivenAdlari.indexOf(kampanyaAdi(d.title)) !== -1) adetAktif = true; });
    });
    if (adetAktif) {
      satirlar.forEach(function (l) {
        var v = l.merchandise && l.merchandise.id && String(l.merchandise.id).split('/').pop();
        var p = v && urunler[v];
        if (!p) return;
        var var_ = (l.discountAllocations || []).some(function (d) { return merdivenAdlari.indexOf(kampanyaAdi(d.title)) !== -1; });
        if (k.uygun[p] !== var_) {
          k.uygun[p] = var_;
          degisti = true;
        }
      });
    }
    var indirimler = sepetIndirimleri(cart);
    // Shopify'ın ara toplamı (subtotalAmount) ürün (adet) indirimi düşülmüş tutardır; oran buna göre
    var ara = kurus(cart.cost && cart.cost.subtotalAmount);
    (esikler || []).forEach(function (e) {
      var ad = kampanyaAdi(e.baslik);
      if (indirimler[ad] && ara > 0) {
        var oran = Math.round((indirimler[ad] / ara) * 10000) / 10000;
        if (!k.yuzde) k.yuzde = {};
        if (k.yuzde[ad] !== oran) {
          k.yuzde[ad] = oran;
          degisti = true;
        }
      }
    });
    if (degisti) kurallariYaz();
  }

  // Kuralları öğren: katalogdaki her patch ürününden birer adetlik geçici sepet (hangi ürünler dahil) ve
  // örnek patch'in 1–6 adetlik sepetleri (adet basamakları ve tutarları). Saklanan kurallar 30 dk'dan eskiyse arka planda yenilenir.
  var kuralSozu = null;
  function kurallariOgren(m) {
    var mevcut = kurallariOku();
    if (mevcut && Date.now() - mevcut.zaman < 30 * 60 * 1000) return Promise.resolve(mevcut);
    if (kuralSozu) return kuralSozu;
    var ornek = ornekPatch(m);
    if (!ornek) return Promise.resolve(mevcut);
    var urunler = {};
    var tarama = [];
    var ekle = function (v, p, uygunMu) {
      if (!v || !uygunMu) return;
      urunler[String(v.id || v)] = String(p);
      tarama.push({ v: v.id || v, q: 1 });
    };
    m.setler.concat(m.rakamSetleri).forEach(function (s) {
      var v = s.varyantlar.filter(function (x) { return x.satilabilir && x.stok !== 0; })[0];
      ekle(v, s.id, !!v);
    });
    m.ikonlar.forEach(function (i) { ekle(i.varyant, i.id, i.varyant && i.varyant.satilabilir && i.varyant.stok !== 0); });
    (m.hazirSetler || []).forEach(function (s) { ekle(s.varyant, s.id, s.satilabilir); });
    var EN_FAZLA = 6;
    var tanim = ['$k: [CartLineInput!]!'];
    var govde = ['k: cartCreate(input: { lines: $k }) { cart { ...C } }'];
    var degiskenler = { k: satirGirdisi(tarama) };
    for (var n = 1; n <= EN_FAZLA; n++) {
      tanim.push('$m' + n + ': [CartLineInput!]!');
      govde.push('m' + n + ': cartCreate(input: { lines: $m' + n + ' }) { cart { ...C } }');
      degiskenler['m' + n] = satirGirdisi([{ v: ornek, q: n }]);
    }
    kuralSozu = kampanyaIstegi({ query: 'mutation Kurallar(' + tanim.join(', ') + ') { ' + govde.join(' ') + ' } ' + SEPET_PARCASI, variables: degiskenler })
      .then(function (j) {
        var d = j && j.data;
        if (!d) throw new Error('Kurallar alınamadı');
        var merdiven = [];
        var onceki = {};
        for (var n = 1; n <= EN_FAZLA; n++) {
          var c = d['m' + n] && d['m' + n].cart;
          if (!c) continue;
          var simdi = sepetIndirimleri(c);
          Object.keys(simdi).forEach(function (ad) {
            if (!onceki[ad] && !merdiven.some(function (x) { return x.ad === ad; })) merdiven.push({ k: n, ad: ad, tutar: simdi[ad] });
          });
          onceki = simdi;
        }
        // Tutar eşikli kampanyalar merdivenden çıkarılır (örnek sepetlerde eşiği geçmezler ama yine de)
        var esikAdlari = m.ayar.kampanyaEsikleri.map(function (e) { return kampanyaAdi(e.baslik); });
        merdiven = merdiven.filter(function (x) { return esikAdlari.indexOf(x.ad) === -1; });
        kurallar = { zaman: Date.now(), ornek: ornek, merdiven: merdiven, uygun: (mevcut && mevcut.uygun) || {}, yuzde: (mevcut && mevcut.yuzde) || {} };
        // Örnek patch'in ürünü kesin dahil (basamaklar ondan çıktı)
        var h = varyantHaritasi(m);
        if (merdiven.length && h[String(ornek)]) kurallar.uygun[h[String(ornek)].p] = true;
        kurallariSepettenOgren(d.k && d.k.cart, urunler, m.ayar.kampanyaEsikleri);
        kurallariYaz();
        kuralSozu = null;
        return kurallar;
      });
    kuralSozu.catch(function () { kuralSozu = null; });
    return kuralSozu;
  }

  // tasarimSatirlari: [{ v, q }]; haric: düzenlenen sepet grubunun _tasarim_id'si (onun yerini yeni tasarım alır)
  // ekSatirlar: "bir patch daha" gibi ek simülasyonlar için ([{ ad, satirlar }])
  function kampanyaHesapla(tasarimSatirlari, haric, ekSatirlar, m) {
    return musteriSepeti().then(function (mevcut) {
      var temel = mevcut.filter(function (s) { return !haric || s.tasarim !== haric; });
      var anahtar = sonucAnahtari(temel, tasarimSatirlari, ekSatirlar);
      if (kampanyaOnbellek[anahtar]) return kampanyaOnbellek[anahtar];
      var degiskenler = { a: satirGirdisi(temel), b: satirGirdisi(temel.concat(tasarimSatirlari)) };
      var tanim = '$a: [CartLineInput!]!, $b: [CartLineInput!]!';
      // Kombin: sepete yazılan kombin kodu simülasyonda da (gerçek sepetteki gibi: kod sipariş indirimleriyle birleşmez,
      // Shopify Tshirt indirimini ve patch indirimlerini birlikte uygular)
      var kod = m && m.kombin && m.kombin.kod;
      var kodlar = kod ? ', discountCodes: $kodlar' : '';
      if (kod) {
        degiskenler.kodlar = [kod];
        tanim += ', $kodlar: [String!]';
      }
      var govde = 'a: cartCreate(input: { lines: $a' + kodlar + ' }) { cart { ...C } userErrors { message } } b: cartCreate(input: { lines: $b' + kodlar + ' }) { cart { ...C } userErrors { message } }';
      (ekSatirlar || []).forEach(function (e, i) {
        degiskenler['e' + i] = satirGirdisi(temel.concat(tasarimSatirlari, e.satirlar));
        tanim += ', $e' + i + ': [CartLineInput!]!';
        govde += ' e' + i + ': cartCreate(input: { lines: $e' + i + kodlar + ' }) { cart { ...C } userErrors { message } }';
      });
      var atla = kombinAtla(m);
      var sorgu = { query: 'mutation Simulasyon(' + tanim + ') { ' + govde + ' } ' + SEPET_PARCASI, variables: degiskenler };
      var soz = kampanyaIstegi(sorgu)
        .then(function (j) {
          var d = j && j.data;
          if (!d || !d.a || !d.b || !d.a.cart || !d.b.cart) throw new Error('Simülasyon başarısız');
          var once = sepetIndirimleri(d.a.cart, atla);
          var sonra = sepetIndirimleri(d.b.cart, atla);
          var ekler = {};
          (ekSatirlar || []).forEach(function (e, i) {
            var c = d['e' + i] && d['e' + i].cart;
            if (!c) return;
            var ek = sepetIndirimleri(c, atla);
            ekler[e.ad] = { kampanyalar: kampanyaFarki(once, ek), indirim: toplamIndirim(ek) - toplamIndirim(once), aktif: ek, sepetIndirim: toplamIndirim(ek) };
          });
          var uygunAdet = null;
          if (m) {
            // Kural öğrenme ve uygun patch sayısı (şerit için)
            var urunler = {};
            var hepsi = satirlariZenginlestir(m, temel.concat(tasarimSatirlari));
            hepsi.forEach(function (s) { if (s.p) urunler[String(s.v)] = s.p; });
            kurallariSepettenOgren(d.b.cart, urunler, m.ayar.kampanyaEsikleri);
            var k = kurallariOku();
            if (k) uygunAdet = hepsi.reduce(function (t, s) { return t + (k.uygun[String(s.p)] === true ? s.q : 0); }, 0);
          }
          var sonuc = kampanyaSonucu(once, sonra, kurus(d.b.cart.cost && d.b.cart.cost.subtotalAmount), uygunAdet, ekler);
          // Sepette başka ürün yoksa indirimin tamamı tasarımındır
          if (!temel.length) payEkle(sonuc, Object.assign({}, sonra));
          else if (m) payEkle(sonuc, tasarimPayiSepetten(d.b.cart, satirlariZenginlestir(m, tasarimSatirlari), atla));
          sonucSakla(anahtar, sonuc);
          return sonuc;
        });
      kampanyaOnbellek[anahtar] = soz;
      soz.catch(function () { delete kampanyaOnbellek[anahtar]; });
      return soz;
    }).then(function (sonuc) { return kombinEsiksiz(m, sonuc); });
  }

  // İki sonuç aynı fiyatı mı veriyor? (sessiz düzeltme gerekmez)
  function ayniKampanya(a, b) {
    if (!a || !b || a.hata || b.hata) return false;
    return a.indirim === b.indirim && JSON.stringify(a.aktif) === JSON.stringify(b.aktif);
  }

  // Basamaklar ve "bir patch daha" için örnek patch: harf setlerindeki satılabilir en ucuz varyant
  // (adet kampanyaları harf setlerini kapsıyor); eşitlikte stoğu bol olan
  function ornekPatch(m) {
    var en = null;
    (m.setler || []).forEach(function (s) {
      (s.varyantlar || []).forEach(function (v) {
        if (!v.satilabilir || (v.stok != null && v.stok < 6)) return;
        var stok = v.stok == null ? Infinity : v.stok;
        if (!en || v.fiyat < en.fiyat || (v.fiyat === en.fiyat && stok > en.stok)) en = { id: v.id, fiyat: v.fiyat, stok: stok };
      });
    });
    return en ? en.id : null;
  }
  // Katalogdaki en ucuz satılabilir patch (harf, rakam, ikon)
  function enUcuzPatchFiyati(m) {
    var en = null;
    var bak = function (v) { if (v && v.fiyat != null && v.satilabilir !== false && (en == null || v.fiyat < en)) en = v.fiyat; };
    (m.ikonlar || []).forEach(function (i) { bak(i.varyant); });
    (m.setler || []).concat(m.rakamSeti ? [m.rakamSeti()] : []).forEach(function (st) {
      if (!st) return;
      Object.keys(st.karakterler || {}).forEach(function (h) { bak(st.karakterler[h]); });
    });
    return en;
  }

  function ornekPatchFiyati(m) {
    var id = ornekPatch(m);
    var b = id && varyantHaritasi(m)[String(id)];
    return b ? b.f : null;
  }

  // "Ekstra %10 İndirim" → "%10"
  function yuzdeYazisi(ad) {
    var m = String(ad).match(/%\s*\d+/);
    return m ? m[0].replace(/\s/g, '') : '';
  }

  // Kampanya şeridi (saf hesap), iki satır: 1) kazanılan toplam, 2) tek somut eylem ve sonucu.
  // Duraklar: adet basamakları (öğrenilen) + tutar eşikleri (ayarlar). Sıradaki hedeflerden daha az harcama gerektireni.
  // tekPatchli: tek patch'lik ürün (mini çanta); bu tasarıma ikinci patch eklenemez, "N patch daha ekle" önerilmez.
  function seritDurumu(k, merdiven, esikler, ornekFiyat, enUcuz, tekPatchli) {
    var aktif = k.aktif || {};
    var adlar = Object.keys(aktif);
    var var_ = function (ad) { return adlar.indexOf(kampanyaAdi(ad)) !== -1; };
    var duraklar = (merdiven || []).map(function (x) { return { ad: kampanyaAdi(x.ad), tur: 'adet', k: x.k, tutar: x.tutar }; })
      .concat((esikler || []).map(function (e) { return { ad: kampanyaAdi(e.baslik), tur: 'tutar', tutar: e.tutar }; }));
    var enUstAdet = -1;
    duraklar.forEach(function (d, i) { if (d.tur === 'adet' && var_(d.ad)) enUstAdet = i; });
    duraklar.forEach(function (d, i) {
      d.ulasildi = d.tur === 'adet' ? i <= enUstAdet : var_(d.ad) || (k.altToplam || 0) >= d.tutar;
    });
    var indirim = k.sepetIndirim || 0;
    var simdikiAdet = enUstAdet >= 0 ? aktif[duraklar[enUstAdet].ad] || 0 : 0;
    var secenekler = [];
    // Patch: sıradaki adet basamağı
    var sonrakiAdet = duraklar.filter(function (d) { return d.tur === 'adet' && !d.ulasildi; })[0];
    if (sonrakiAdet && !tekPatchli) {
      var n = null;
      var yeni = null;
      for (var i = 1; i <= 6; i++) {
        var e = k.ekler && k.ekler['+' + i];
        if (e && e.aktif && e.aktif[sonrakiAdet.ad]) {
          n = i;
          yeni = e.sepetIndirim;
          break;
        }
      }
      if (n == null && k.uygunAdet != null && sonrakiAdet.k > k.uygunAdet) {
        n = sonrakiAdet.k - k.uygunAdet;
        yeni = indirim - simdikiAdet + sonrakiAdet.tutar;
      }
      if (n != null && yeni > indirim) {
        secenekler.push({
          maliyet: ornekFiyat ? n * ornekFiyat : 0,
          metin: n + ' patch daha ekle, ' + (indirim > 0 ? 'indirimin ' + paraBicimle(yeni) + ' olsun' : paraBicimle(yeni) + ' indirim kazan'),
          hedef: sonrakiAdet,
          patch: n
        });
      }
    }
    // Tutar: sıradaki eşik
    var esik = duraklar.filter(function (d) { return d.tur === 'tutar' && !d.ulasildi; })[0];
    if (esik) {
      // Eşik, Shopify'daki gibi adet indirimi düşülmüş ara toplama göre (altToplam)
      var kalan = esik.tutar - (k.altToplam || 0);
      var yuzde = yuzdeYazisi(esik.ad);
      var tekPatch = enUcuz || ornekFiyat;
      var birPatch = k.ekler && k.ekler['+1'];
      if (!tekPatchli && tekPatch && kalan <= tekPatch && (!birPatch || (birPatch.aktif && birPatch.aktif[esik.ad]))) {
        secenekler.push({
          maliyet: tekPatch,
          metin: '1 patch daha ekle, tüm siparişe ' + (yuzde ? yuzde + ' indirim gelsin' : 'indirim gelsin'),
          hedef: esik,
          patch: 1
        });
      } else {
        secenekler.push({
          maliyet: kalan,
          metin: paraBicimle(kalan) + ' daha ekle, tüm siparişe ' + (yuzde ? yuzde + ' indirim' : 'indirim'),
          hedef: esik
        });
      }
    }
    secenekler.sort(function (a, b) { return a.maliyet - b.maliyet; });
    var hepsi = duraklar.length > 0 && duraklar.every(function (d) { return d.ulasildi; });
    var ilkAdet = duraklar.filter(function (d) { return d.tur === 'adet'; })[0];
    // Kazanılan: bu tasarımın kendi satırlarına düşen indirim (alt çubuktaki etiketle aynı sayı); sepetteki diğer
    // ürünlerle birlikte toplam yalnızca kampanya satırlarının altındaki notta geçer
    var tasarimInd = k.tasarimIndirim != null ? Math.max(0, k.tasarimIndirim) : indirim;
    var sol = tasarimInd > 0
      ? paraBicimle(tasarimInd) + ' indirim kazandın' + (hepsi ? ' 🎉' : '')
      : 'Patch indirimleri ' + (ilkAdet ? ilkAdet.k : 2) + ' patch\'ten başlıyor';
    var sag = hepsi ? 'Bütün kampanyalar sepetinde' : secenekler.length ? secenekler[0].metin : '';
    // Çubuk: duraklar eşit aralıklı; son ulaşılan durağa kadar dolu, sonrakine yaklaştıkça biraz daha
    var say = duraklar.length;
    var son = -1;
    duraklar.forEach(function (d, i) { if (d.ulasildi) son = i; });
    var dolu = say ? (son + 1) / say : 0;
    var hedef = duraklar[son + 1];
    if (hedef && say) {
      var kismi = 0;
      var adetSecenek = secenekler.filter(function (s) { return s.patch; })[0];
      if (hedef.tur === 'adet' && adetSecenek) kismi = 1 / (adetSecenek.patch + 1);
      if (hedef.tur === 'tutar') kismi = Math.max(0, Math.min(1, (k.altToplam || 0) / hedef.tutar));
      dolu += kismi / say;
    }
    // Öneri yalnızca sıradaki kampanya yakınsa: en fazla 2 patch ya da en fazla 2 patch'lik tutar
    var enIyi = secenekler[0];
    var birim = enUcuz || ornekFiyat || 0;
    var yakin = !!enIyi && !hepsi && (enIyi.patch ? enIyi.patch <= 2 : birim > 0 && enIyi.maliyet <= 2 * birim);
    return {
      indirim: indirim,
      sol: sol,
      sag: sag,
      hepsi: hepsi,
      yakin: yakin,
      duraklar: duraklar.map(function (d, i) { return { ad: d.ad, ulasildi: d.ulasildi, konum: (i + 1) / say, tur: d.tur, tutar: d.tutar, kazanc: aktif[d.ad] || 0 }; }),
      dolu: Math.min(1, dolu)
    };
  }

  // "Ekstra %10 İndirim" → "Ekstra %10"
  function kampanyaKisaAd(ad) {
    return kampanyaAdi(ad).replace(/\s+[İIi]ndirim[i]?$/, '');
  }

  // Yönelme eki: "Ekstra %10" → "'a", "Ekstra %20" → "'ye"
  function yonelme(s) {
    var sayiEsles = String(s).match(/(\d+)\D*$/);
    if (sayiEsles) {
      var n = parseInt(sayiEsles[1], 10);
      var birler = { 1: 'e', 2: 'ye', 3: 'e', 4: 'e', 5: 'e', 6: 'ya', 7: 'ye', 8: 'e', 9: 'a' };
      var onlar = { 1: 'a', 2: 'ye', 3: 'a', 4: 'a', 5: 'ye', 6: 'a', 7: 'e', 8: 'e', 9: 'a' };
      if (n % 10) return "'" + birler[n % 10];
      if (n % 100) return "'" + onlar[(n % 100) / 10];
      return "'e";
    }
    var son = String(s).toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü]/g, '');
    var unlu = (son.match(/[aeıioöuü]/g) || ['e']).pop();
    return "'" + (/[aeıioöuü]$/.test(son) ? 'y' : '') + (/[aıou]/.test(unlu) ? 'a' : 'e');
  }

  // Kampanya kazanma bildirimi metni
  function kazancMetni(ad, tutar, esikler) {
    if (/hediye/i.test(ad)) {
      var m = ad.match(/(\d+)\s*patch\s*hediye/i);
      return '🎁 ' + (m ? m[1] + ' patch hediye eklendi' : ad);
    }
    var esik = (esikler || []).some(function (e) { return kampanyaAdi(e.baslik) === ad; });
    if (esik) return '✨ ' + kampanyaKisaAd(ad) + ' indirim açıldı · Tüm siparişinde −' + paraBicimle(tutar);
    return '🎉 ' + kampanyaGosterimAdi(ad) + ' · −' + paraBicimle(tutar);
  }

  // Oturumda bildirimi gösterilmiş (ya da müşterinin sepetinde zaten olan) kampanyalar
  var GORULEN_ANAHTARI = 'kp-kampanya-gorulen';
  function gorulenKampanyalar() {
    try { return JSON.parse(sessionStorage.getItem(GORULEN_ANAHTARI) || '[]'); } catch (e) { return gorulenKampanyalar.bellek || []; }
  }
  function gorulenKaydet(liste) {
    gorulenKampanyalar.bellek = liste;
    try { sessionStorage.setItem(GORULEN_ANAHTARI, JSON.stringify(liste)); } catch (e) { /* yok say */ }
  }

  /* ------------------------------------------------------------------ */
  /* Ürün sayfası kartı                                                  */
  /* ------------------------------------------------------------------ */

  class KisiselKart extends HTMLElement {}

  /* ------------------------------------------------------------------ */
  /* Sweatshirt kombini                                                  */
  /* ------------------------------------------------------------------ */

  // Vitrin sayfasındaki kart (data-kombin, sections/kisisel-kombin-vitrin.liquid) editörü kombin modunda açar.
  // Kampanya: 1 sweatshirt + 4 patch (hazır bir 4'lü patch seti ya da tek tek 4 patch) = 4.000 TL, Tshirt hediye.
  // - İlk ekran "Kombinini seç": Sweatshirt (renk + yaş) ve Hediye Tshirt (renk + yaş; yalnızca stoktakiler, yaş
  //   varsayılan olarak sweatshirt'ünkü, renk müşterinin seçimi). Dördü seçilmeden tasarıma geçilmez. Seçim sonradan
  //   "Değiştir" ile (tasarım ekranındaki Tshirt satırı, Özet) ya da Kombin aracıyla değişir; tasarım bozulmaz.
  //   Sweatshirt rengi değişince patch'ler alanın merkezine göre yerinde kalır, sığmayanlar en yakın boş yere, yer yoksa
  //   kenara gider.
  // - Fiyata dahil 4 patch (tema ayarı): her harf ve rakam 1 patch, 4'lü set 4 patch; kenardakiler de sayılır (hediye
  //   Tshirt'e takılabilir, sepete gider). Görsel panelinde en üstte yalnızca 4 patch'lik, satışta olan hazır setler.
  //   Önizlemenin altında sabit gösterge (dört yuva; set seçilince set adı; dolunca sıradaki patch'in ücreti fiyat
  //   motorundan). 4 patch olmadan "Tasarımı tamamla" çalışmaz.
  // - Fiyat veriden: 4 patch'e kadar sweatshirt + 4'lü setin fiyatı (2.500 + 1.500 = 4.000), üstü çizili + Tshirt'ün
  //   liste fiyatı (6.000); 4 patch'ten sonra fiyat motorundan (4 tekli: 2.500 + 2.000 − 500 = 4.000). Tshirt 0 TL
  //   gösterilir ve kampanya simülasyonuna girmez; indirimini Shopify'daki kombin indirimi yapar. Testte tema ayarındaki
  //   kod, sepete eklemenin hemen ardından sepete yazılır.
  // - Aksesuar yok. Sepete tek istek: sweatshirt (tasarım özellikleriyle), patch'ler / set ve Tshirt; hepsi aynı
  //   _tasarim_id ve _kombin ile.
  var KOMBIN_ADIM = { id: 'sweat', ad: 'Kombin' };
  ARAC_BILGI.sweat = {
    ad: 'Kombin',
    etiket: 'Kombinini seç: sweatshirt ve hediye Tshirt',
    simge: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 4.5h6l5.5 3.2-2 4.1-2.5-1.2V20h-8V10.6l-2.5 1.2-2-4.1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9.2 4.6a2.8 2.8 0 0 0 5.6 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
  };
  // 3-5 yaş sweatshirt seçilince Kombinini seç ekranının Tshirt bloğunda
  var KOMBIN_KUCUK_NOTU = 'Tshirt\'lerimizde 3-5 yaş bedeni yok. Pudra Pembe\'de 4-5 yaş var, diğer renklerde en küçük beden 6-7 yaş.';
  // "HEDİYE" etiketindeki hediye kutusu ve önizlemedeki boş Tshirt yerinin simgesi
  var KOMBIN_HEDIYE_SIMGE = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="9" width="17" height="11.5" rx="1.5"/><path d="M2.5 9h19M12 9v11.5"/><path d="M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zM12 9c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/></svg>';
  var KOMBIN_TISORT_SIMGE = '<svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M17 7l-10 6 4 8 5-2v22h16V19l5 2 4-8-10-6c-1 3-4 5-7 5s-6-2-7-5z"/></svg>';

  // "8-9 yaş" → "8-9"; "Bej Sweatshirt" → "Bej"
  function yasAdi(baslik) {
    return String(baslik || '').replace(/\s*yaş\s*$/i, '').trim();
  }
  function renkAdi(baslik) {
    return String(baslik || '').replace(/\s+(sweatshirt|t-?shirt)\s*$/i, '').trim();
  }
  function yasSirasi(a, b) {
    return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0);
  }
  // "YYYY-AA-GG SS:DD" Türkiye saati (UTC+3); boş ya da okunamayan tarih sınır sayılmaz
  function kombinTarihi(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/.exec(String(s || '').trim());
    if (!m) return null;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], (+m[4] || 0) - 3, +m[5] || 0);
  }
  function kombinVaryanti(v) {
    var stok = v.stok == null ? null : Math.max(0, Number(v.stok) || 0);
    return { id: v.id, baslik: v.baslik, yas: yasAdi(v.baslik), fiyat: Number(v.fiyat) || 0, stok: stok, satilabilir: !!v.satilabilir && (stok == null || stok > 0) };
  }

  function Kombin(ham) {
    var simdi = Date.now();
    var bas = kombinTarihi(ham.baslangic);
    var bit = kombinTarihi(ham.bitis);
    this.acik = (bas == null || simdi >= bas) && (bit == null || simdi <= bit);
    this.fiyat = Number(ham.fiyat) || 0;
    this.eskiFiyat = Number(ham.eski_fiyat) || 0;
    this.dahil = Math.max(1, parseInt(ham.dahil, 10) || 4);
    this.kod = String(ham.kod || '').trim();
    this.vitrin = ham.vitrin || null;
    this.sweatshirtler = (ham.sweatshirtler || [])
      .map(function (s) {
        return { id: s.id, baslik: s.baslik, renk: renkAdi(s.baslik), kucuk: !!s.kucuk_beden, kapak: s.kapak, onizleme: s.gorsel && (s.gorsel.kucuk || s.gorsel.buyuk), buyuk: s.gorsel && s.gorsel.buyuk, fotograflar: s.fotograflar || [], ham: s, varyantlar: (s.varyantlar || []).map(kombinVaryanti) };
      })
      .filter(function (s) { return s.ham.harita && s.ham.gorsel && s.varyantlar.some(function (v) { return v.satilabilir; }); });
    // Tshirt'te yalnızca stoktaki yaşlar; hiç stoğu olmayan renk gösterilmez
    this.tisortler = (ham.tisortler || [])
      .map(function (s) {
        return { id: s.id, baslik: s.baslik, renk: renkAdi(s.baslik), kapak: s.kapak, onizleme: s.gorsel && (s.gorsel.kucuk || s.gorsel.buyuk), buyuk: s.gorsel && s.gorsel.buyuk, fotograflar: s.fotograflar || [], varyantlar: (s.varyantlar || []).map(kombinVaryanti).filter(function (v) { return v.satilabilir; }) };
      })
      .filter(function (s) { return s.varyantlar.length; });
  }
  Kombin.prototype.sweat = function (id) {
    return this.sweatshirtler.filter(function (s) { return String(s.id) === String(id); })[0] || null;
  };
  Kombin.prototype.tisortUrunu = function (id) {
    return this.tisortler.filter(function (s) { return String(s.id) === String(id); })[0] || null;
  };
  Kombin.prototype.sweatVaryanti = function (vid) {
    for (var i = 0; i < this.sweatshirtler.length; i++) {
      var v = this.sweatshirtler[i].varyantlar.filter(function (x) { return String(x.id) === String(vid); })[0];
      if (v) return { urun: this.sweatshirtler[i], varyant: v };
    }
    return null;
  };
  // Tshirt'ün liste fiyatı (üstü çizili gösterilir): seçiliyse onun, değilse ilk Tshirt'ün
  Kombin.prototype.tisortFiyati = function (secim) {
    if (secim) return secim.varyant.fiyat;
    var ilk = this.tisortler[0];
    return ilk ? ilk.varyantlar[0].fiyat : 0;
  };
  Kombin.prototype.tisortYasiVar = function (yas) {
    return !!yas && this.tisortler.some(function (s) { return s.varyantlar.some(function (v) { return v.yas === yas; }); });
  };

  // Tasarımdaki Tshirt seçimi (t.kombin.tr: renk / ürün, t.kombin.ty: yaş) stoktaysa { urun, varyant }
  function kombinTisortu(k, t) {
    var kb = t && t.kombin;
    if (!k || !kb || !kb.tr || !kb.ty) return null;
    var urun = k.tisortUrunu(kb.tr);
    var v = urun && urun.varyantlar.filter(function (x) { return x.yas === kb.ty; })[0];
    return v ? { urun: urun, varyant: v } : null;
  }

  // Kombinin patch'leri (sırayla): her harf ve rakam 1 patch, setin her patch'i 1; kenardakiler de (Tshirt'e takılır)
  function kombinTakililar(parcalar) {
    return (parcalar || []).filter(function (p) { return p.tip === 'letter' || p.tip === 'number' || p.tip === 'icon'; });
  }

  // Kombinin taban fiyatı (fiyata dahil patch sayısına kadar gösterilen): sweatshirt + en ucuz 4'lü set, veriden
  // (2.500 + 1.500 = 4.000). Set yoksa tema ayarı / vitrin ürününün fiyatı.
  function kombinTabanFiyati(m, k) {
    var set = (m.hazirSetler || []).reduce(function (en, s) { return !en || s.fiyat < en.fiyat ? s : en; }, null);
    return set ? (Number(m.urun.fiyat) || 0) + set.fiyat : k.fiyat;
  }
  function kombinPatchSayisi(parcalar) {
    return kombinTakililar(parcalar).length;
  }

  // Kampanya simülasyonuna giren satırlar: kombinin hediye Tshirt'ü hariç (indirimini Shopify'daki kombin indirimi yapar).
  // Kombin editöründe Tshirt da girer (simSatirlari): gerçek sepetteki indirim seçimi aynı olsun; indirimi sayılmaz (kombinAtla)
  function simSatiri(k) {
    return !(k.properties && k.properties._tasarim_rol === 'hediye');
  }
  function simSatirlari(kalemler, kombin) {
    return kalemler.filter(function (k) { return kombin || simSatiri(k); }).map(function (k) { return { v: k.id, q: k.quantity }; });
  }

  // Tasarımın bütün kayıtlı konumlarını (yazı blokları, ayrı harfler, patch'ler, aksesuarlar) dx, dy kadar kaydırır
  function tasarimiKaydir(t, dx, dy) {
    if (!dx && !dy) return;
    BLOK_ALAN.forEach(function (b) {
      var k = t[b.merkez];
      if (Array.isArray(k)) t[b.merkez] = [k[0] + dx, k[1] + dy];
    });
    if (Array.isArray(t.harfKonumlari)) {
      t.harfKonumlari = t.harfKonumlari.map(function (k) { return Array.isArray(k) ? [k[0] + dx, k[1] + dy] : k; });
    }
    (t.parcalar || []).concat(t.aksesuarlar || []).forEach(function (x) {
      if (isFinite(x.cx) && isFinite(x.cy)) {
        x.cx += dx;
        x.cy += dy;
      }
    });
  }

  /* ---------- Editör: kombin modu ---------- */

  // Editör açılırken: tasarımda kombin seçimi yoksa (ya da sweatshirt / yaş artık yoksa) kurulur, model ona uyar
  Editor.prototype.kombinHazirla = function () {
    var k = this.kombin;
    var t = this.t;
    if (!t.kombin || !k.sweat(t.kombin.s)) t.kombin = { s: k.sweat(this.m.urun.id) ? this.m.urun.id : k.sweatshirtler[0].id, v: null, tr: null, ty: null };
    var s = k.sweat(t.kombin.s);
    if (t.kombin.v && !s.varyantlar.some(function (v) { return String(v.id) === String(t.kombin.v) && v.satilabilir; })) t.kombin.v = null;
    if (t.kombin.tr && !k.tisortUrunu(t.kombin.tr)) t.kombin.tr = null;
    if (!t.kombin.tyElle) this.kombinTisortYasiEsitle();
    this.kombinDonus = null;
    this.kombinIlkBildirim = false;
    if (this.kombinGaleriAcik) this.kombinGaleriKapat();
    this.kombinModelEsitle();
  };

  // Model tasarımdaki sweatshirt'e (renk ve yaş) uyar; renk değiştiyse önizlemeler yeniden kurulur (konumlar kaymaz)
  Editor.prototype.kombinModelEsitle = function () {
    var kb = this.t && this.t.kombin;
    if (!kb) return false;
    var degisti = String(this.m.urun.id) !== String(kb.s);
    this.kart.kombinUrunUygula(kb.s, kb.v);
    if (degisti && this.el) this.kombinSahneleriKur();
    return degisti;
  };

  // Renk değişince: önizleme oranı, ana sahne (aynı nesne, sürükleme dinleyicileri kapta kalır), Özet ve büyük önizleme
  Editor.prototype.kombinSahneleriKur = function () {
    var oran = String(this.m.gorsel.en / this.m.gorsel.boy);
    this.el.querySelectorAll('.kp-onizleme__ic, [data-kp-buyuk-sahne]').forEach(function (x) { x.style.setProperty('--kp-oran', oran); });
    var yakin = this.sahne.istenenYakin !== false;
    this.sahne.olustur();
    // Yeni pencere: önceki ölçü unutulur. Kombinini seç ekranında sahne gizli (boyut 0); görününce boyut gözlemcisi
    // yerleşimi ve görselin kaynağını verir (eski ölçüyle "aynı boyut" sanıp atlamaz)
    this.sahne.boyut = null;
    this.sahne.genislikIzle();
    this.sahne.gorunumAyarla(yakin);
    this.ozetSahne = null;
    this.buyukSahne = null;
    var buyuk = this.el.querySelector('[data-kp-buyuk-sahne]');
    if (buyuk) buyuk.innerHTML = '';
    var ozet = this.el.querySelector('[data-kp-panel="ozet"]');
    if (ozet) ozet.innerHTML = '';
  };

  Editor.prototype.kombinSweatYasi = function () {
    var x = this.t.kombin && this.t.kombin.v ? this.kombin.sweatVaryanti(this.t.kombin.v) : null;
    return x ? x.varyant.yas : null;
  };

  // Tshirt'ün yaşı (müşteri ayrıca seçmediyse) sweatshirt'ün yaşını izler: seçili renkte (renk yoksa herhangi bir
  // Tshirt'te) o yaş stoktaysa o, değilse boş kalır (müşteri seçer)
  Editor.prototype.kombinTisortYasiEsitle = function () {
    var kb = this.t.kombin;
    if (!kb || kb.tyElle) return;
    var yas = this.kombinSweatYasi();
    var renk = kb.tr ? this.kombin.tisortUrunu(kb.tr) : null;
    var var_ = renk ? renk.varyantlar.some(function (v) { return v.yas === yas; }) : this.kombin.tisortYasiVar(yas);
    kb.ty = yas && var_ ? yas : null;
  };

  Editor.prototype.kombinRenkSec = function (urunId) {
    var k = this.kombin;
    var s = k.sweat(urunId);
    if (!s || String(urunId) === String(this.t.kombin.s)) return;
    var once = this.m.alanlar[0] ? merkez(this.m.alanlar[0].sekil) : [0, 0];
    var eskiYas = this.kombinSweatYasi();
    var ayni = s.varyantlar.filter(function (v) { return v.satilabilir && v.yas === eskiYas; })[0];
    this.t.kombin.s = s.id;
    // Aynı yaş bu renkte stoktaysa kalır, yoksa yeniden seçilir
    this.t.kombin.v = ayni ? ayni.id : null;
    this.kombinModelEsitle();
    var sonra = this.m.alanlar[0] ? merkez(this.m.alanlar[0].sekil) : [0, 0];
    tasarimiKaydir(this.t, sonra[0] - once[0], sonra[1] - once[1]);
    this.kombinTisortYasiEsitle();
    this.secili = null;
    this.seciliHarf = null;
    // Yeni renkte sığmayan patch'ler en yakın geçerli yere; yer yoksa kenara
    var kenara = 0;
    for (var i = 0; i < 40; i++) {
      this.durum = duzenle(this.m, this.yer, this.t);
      var gruplar = this.hataliGruplar();
      if (!gruplar.length) break;
      if (!this.alanaYerlestir(gruplar[0], false)) kenara++;
    }
    this.yenile();
    var metin = s.renk + ' sweatshirt' + (eskiYas && !ayni ? '. ' + eskiYas + ' yaş bu renkte yok, yaşı seç.' : '.');
    if (kenara) metin += ' ' + kenara + ' patch yeni renkte sığmadı, kenara alındı.';
    this.bildirimKapat();
    this.bildir(metin, { sure: 3500 });
  };

  Editor.prototype.kombinYasSec = function (varyantId) {
    var s = this.kombin.sweat(this.t.kombin.s);
    var v = s && s.varyantlar.filter(function (x) { return String(x.id) === String(varyantId) && x.satilabilir; })[0];
    if (!v) return;
    this.t.kombin.v = v.id;
    this.kart.kombinUrunUygula(s.id, v.id);
    this.kombinTisortYasiEsitle();
    this.yenile();
    // Hediye Tshirt eksikse ekran hediye bloğuna kayar, blok kısa süre parlar
    if (this.adim === 'sweat' && this.kombinSiradaki() === 'tisort') {
      this.kombinEksigeGit('tisort');
      this.bildirimKapat();
      this.bildir('Harika! Şimdi hediye Tshirt\'ünü seç', { sure: 3500 });
    }
  };

  // Kombinini seç ekranında sıradaki eksik: önce sweatshirt yaşı ('yas'), sonra hediye Tshirt rengi / yaşı ('tisort')
  Editor.prototype.kombinSiradaki = function () {
    var kb = this.t.kombin || {};
    if (!kb.v) return 'yas';
    return kombinTisortu(this.kombin, this.t) ? null : 'tisort';
  };

  // Eksik olan yere yumuşakça kaydırır (sweatshirt yaşları ya da Hediye Tshirt bloğu), bloğu kısa süre vurgular.
  // Olay göndermez.
  Editor.prototype.kombinEksigeGit = function (hedef) {
    var blok = this.el.querySelector('[data-kp-panel="sweat"] [data-kp-kombin-blok="' + (hedef === 'yas' ? 'sweat' : 'tisort') + '"]');
    if (!blok) return;
    var yer = (hedef === 'yas' && blok.querySelector('.kp-kombin-yaslar')) || blok;
    var azHareket = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (yer.scrollIntoView) yer.scrollIntoView({ block: 'nearest', behavior: azHareket ? 'auto' : 'smooth' });
    blok.classList.remove('kp-kombin-blok--parla');
    void blok.offsetWidth;
    blok.classList.add('kp-kombin-blok--parla');
    clearTimeout(this._kombinParla);
    this._kombinParla = setTimeout(function () { blok.classList.remove('kp-kombin-blok--parla'); }, 1600);
  };

  // Sweatshirt rengi + yaşı ve Tshirt rengi + yaşı: eksikler sırayla (tasarım ekranındaki uyarıda söylenir)
  Editor.prototype.kombinSecimEksikleri = function () {
    var kb = this.t.kombin || {};
    var eksik = [];
    if (!kb.v) eksik.push('sweatshirt yaşı');
    if (!kb.tr) eksik.push('Tshirt rengi');
    else if (!kombinTisortu(this.kombin, this.t)) eksik.push('Tshirt yaşı');
    return eksik;
  };

  // Kombinin eksiği (sırayla): sweatshirt ve Tshirt seçimi, sonra fiyata dahil patch sayısı
  Editor.prototype.kombinEksik = function () {
    var secim = this.kombinSecimEksikleri();
    if (secim.length) return { tur: 'secim', metin: 'Tasarıma başlamak için seç: ' + secim.join(', ') + '.' };
    if (kombinPatchSayisi(this.durum && this.durum.parcalar) < this.kombin.dahil) return { tur: 'patch', metin: 'Kombin için ' + this.kombin.dahil + ' patch ya da bir patch seti seç' };
    return null;
  };

  // Ana buton: eksik varsa uyarır; seçim eksiğinde Kombinini seç ekranına götürür. true: durdu
  Editor.prototype.kombinIleri = function () {
    var eksik = this.kombinEksik();
    if (!eksik) return false;
    if (eksik.tur === 'secim') {
      if (this.adim !== 'sweat') this.kombinSecimAc(false);
      this.kombinEksigeGit(this.kombinSiradaki());
    }
    // Engel uyarısı sıradaki bilgilendirmeyi beklemez
    this.bildirimKapat();
    this.bildir(eksik.metin, { sure: 3500 });
    return true;
  };

  // "Değiştir" ve Kombin aracı: Kombinini seç ekranı; dönüşte kalınan yere gidilir (tasarıma dokunulmaz)
  Editor.prototype.kombinSecimAc = function (tisort) {
    if (this.adim !== 'sweat') this.kombinDonus = this.adim;
    this.adimaGit('sweat', false, true);
    var blok = tisort && this.el.querySelector('[data-kp-panel="sweat"] [data-kp-kombin-blok="tisort"]');
    if (blok && blok.scrollIntoView) blok.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  // Ana buton Kombinini seç ekranında hep basılabilir: eksik varsa oraya kaydırır ve vurgular ("Yaşını seç ↓",
  // "Hediye Tshirt'ünü seç ↓"); seçim tamamsa kalınan yere (ilk girişte Görsel: en üstte patch setleri)
  Editor.prototype.kombinSecimBitti = function () {
    var siradaki = this.kombinSiradaki();
    if (siradaki) return this.kombinEksigeGit(siradaki);
    var donus = this.kombinDonus && this.kombinDonus !== 'sweat' ? this.kombinDonus : 'ikon';
    this.kombinDonus = null;
    this.adimaGit(donus, false, true);
  };

  // Ödenecek tutar (patch indirimleri düşülmüş) ve fiyata dahil patch'lerin üstündeki fark
  Editor.prototype.kombinTutar = function () {
    var f = fiyatHesapla(this.m, this.yer, this.t);
    var k = this.kampanyaSonucu();
    var yeni = f.toplam - tasarimIndirimi(k);
    return { yeni: yeni, ek: k && !k.hata ? yeni - this.kombin.fiyat : null, eski: yeni + this.kombin.tisortFiyati(kombinTisortu(this.kombin, this.t)) };
  };

  // Sıradaki patch'in ek ücreti, fiyat motorundan: kampanya simülasyonunun "+1" sonucu (bir patch daha) ile
  // şimdiki sonuç arasındaki indirim farkı patch fiyatından düşülür (ör. 3. patch: 500 − (300 − 100) = 300 TL)
  Editor.prototype.kombinSiradakiUcret = function () {
    var k = this.kampanyaSonucu();
    var ek = k && !k.hata && k.ekler && k.ekler['+1'];
    var b = varyantHaritasi(this.m)[String(ornekPatch(this.m))];
    if (!ek || !b) return null;
    return Math.max(0, b.f - (ek.indirim - (k.indirim || 0)));
  };

  // Gösterilen kombin fiyatı: fiyata dahil patch sayısı dolana kadar taban fiyat (sweatshirt + 4'lü set: 4.000, üstü
  // çizili + Tshirt: 6.000); dolunca fiyat motorundan (patch indirimleri düşülmüş toplam, üstü çizili = toplam + Tshirt)
  Editor.prototype.kombinFiyat = function () {
    var k = this.kombin;
    var tisort = k.tisortFiyati(kombinTisortu(k, this.t));
    if (kombinPatchSayisi(this.durum && this.durum.parcalar) < k.dahil) {
      var taban = kombinTabanFiyati(this.m, k);
      return { yeni: taban, eski: taban + tisort };
    }
    var yeni = this.kombinTutar().yeni;
    return { yeni: yeni, eski: yeni + tisort };
  };

  // Alt çubuktaki toplam: üstü çizili eski fiyat, kombin fiyatı ve yanında "4 patch dahil"
  Editor.prototype.kombinToplamHtml = function () {
    var f = this.kombinFiyat();
    return '<s class="kp-alt__eski">' + paraBicimle(f.eski) + '</s> <span class="kp-alt__yeni">' + paraBicimle(f.yeni) + '</span> <span class="kp-alt__etiket kp-alt__etiket--hediye">' + this.kombin.dahil + ' patch dahil</span>';
  };

  // Kombinini seç ekranında ana butonun yazısı
  Editor.prototype.kombinDevamYazisi = function () {
    var donus = this.kombinDonus && this.kombinDonus !== 'sweat' ? this.kombinDonus : null;
    return donus === 'ozet' ? 'Özete dön →' : donus || !bosMu(this.t) ? 'Tasarıma dön →' : 'Tasarıma başla →';
  };

  // Kampanyalar kartı (masaüstü) ve kampanya paneli (mobil): en üstte kombin fiyatı ("4 patch dahil") ve hediye Tshirt
  Editor.prototype.kombinKampanyaSatiri = function () {
    if (!this.kombin) return '';
    var k = this.kombin;
    var n = kombinPatchSayisi(this.durum && this.durum.parcalar);
    var fiyat = '<li class="kp-kombin-satir kp-kombin-satir--fiyat"><span class="kp-kampanya-satir"><span>Kombin · ' + k.dahil + ' patch dahil</span><strong>' +
      paraBicimle(this.kombinFiyat().yeni) + '</strong></span></li>';
    if (n >= k.dahil) {
      return fiyat + '<li class="kp-kombin-satir"><span class="kp-kampanya-satir"><span>✓ Sweatshirt kombini: hediye Tshirt</span><strong>−' +
        paraBicimle(k.tisortFiyati(kombinTisortu(k, this.t))) + '</strong></span></li>';
    }
    return fiyat + '<li class="kp-kombin-satir kp-kombin-satir--bekliyor"><span class="kp-kampanya-satir"><span>Sweatshirt kombini: ' +
      (n ? (k.dahil - n) + ' patch daha seç' : 'patch seti ya da ' + k.dahil + ' patch seç') + ', Tshirt hediye</span></span></li>';
  };
  Editor.prototype.kombinHediyeTutari = function () {
    if (!this.kombin || kombinPatchSayisi(this.durum && this.durum.parcalar) < this.kombin.dahil) return 0;
    return this.kombin.tisortFiyati(kombinTisortu(this.kombin, this.t));
  };

  // Önizlemenin altındaki dahil patch göstergesi (dört yuva; set seçilince set adı; dolunca sıradaki patch'in ücreti) ve
  // seçili Tshirt satırı, Görsel kartlarındaki "Dahil" / "+500 TL" (setlerde "Dahil · 4 patch" / setin fiyatı),
  // Kombinini seç ekranı, tasarım ekranına ilk giriş bildirimi
  Editor.prototype.kombinCiz = function () {
    var k = this.kombin;
    this.kombinOnizlemeCiz();
    var takili = kombinTakililar(this.durum && this.durum.parcalar);
    var tamam = takili.length >= k.dahil;
    var siradaki = tamam ? this.kombinSiradakiUcret() : null;
    var gosterge = this.el.querySelector('[data-kp-dahil]');
    if (gosterge) {
      var yuvalar = '';
      for (var i = 0; i < k.dahil; i++) {
        var p = takili[i];
        var g = p && p.varyant && p.varyant.gorsel;
        yuvalar += p
          ? '<span class="kp-dahil__yuva kp-dahil__yuva--dolu">' + (g ? '<img src="' + kacis(g) + '" alt="">' : '<span class="kp-dahil__harf">' + kacis(p.etiket || '') + '</span>') +
            '<span class="kp-dahil__tik" aria-hidden="true">✓</span></span>'
          : '<span class="kp-dahil__yuva"></span>';
      }
      // Dahil yuvaları dolduran set (kenardakiler de sayılır): adı göstergede
      var setAdi = '';
      saglamSetler(this.m, this.t).some(function (kayit) {
        var tanim = this.m.hazirSetHarita[kayit.urunId];
        var ilk = takili.slice(0, k.dahil).filter(function (p) { return p.setGrup === kayit.id; }).length;
        if (tanim && ilk === k.dahil) setAdi = tanim.ad;
        return !!setAdi;
      }, this);
      var sonraki = 'Sıradaki patch ' + (siradaki != null ? '+' + paraBicimle(siradaki) : 'ek ücretli');
      var metin = tamam
        ? (setAdi
          ? '<strong class="kp-dahil__baslik">' + kacis(setAdi) + ' seti ✓</strong><span class="kp-dahil__alt">' + k.dahil + ' patch dahil · ' + sonraki + '</span>'
          : '<strong class="kp-dahil__baslik">' + k.dahil + ' patch dahil ✓</strong><span class="kp-dahil__alt">' + sonraki + '</span>')
        : '<strong class="kp-dahil__baslik">' + paraBicimle(kombinTabanFiyati(this.m, k)) + '\'ye ' + k.dahil + ' patch dahil</strong><span class="kp-dahil__alt">' +
          (takili.length ? (k.dahil - takili.length) + ' patch daha dahil' : 'Patch seti seç ya da ' + k.dahil + ' patch seç') + '</span>';
      var secim = kombinTisortu(k, this.t);
      var tisort = this.adim === 'sweat' ? '' :
        '<div class="kp-dahil__tisort">' + (secim && secim.urun.kapak ? '<button type="button" class="kp-dahil__tisort-gorsel" data-kp-galeri-ac="t:' + kacis(secim.urun.id) + '" aria-label="' + kacis(secim.urun.renk) + ' hediye Tshirt\'ü büyük gör"><img src="' + kacis(secim.urun.kapak) + '" alt="" width="28" height="28"></button>' : '') +
        '<span class="kp-dahil__tisort-ad">' + (secim ? 'Hediye Tshirt: ' + kacis(secim.urun.renk) + ' · ' + kacis(secim.varyant.yas) + ' yaş' : 'Hediye Tshirt seçilmedi') + '</span>' +
        '<span class="kp-dahil__ayrac" aria-hidden="true">·</span><button type="button" class="kp-dahil__degistir" data-kp-tisort-degistir>' + (secim ? 'Değiştir' : 'Seç') + '</button></div>';
      var html = '<div class="kp-dahil__ust"><div class="kp-dahil__yuvalar" aria-hidden="true">' + yuvalar + '</div><div class="kp-dahil__metin" role="status">' + metin + '</div></div>' + tisort;
      if (this._dahilHtml !== html) {
        this._dahilHtml = html;
        gosterge.innerHTML = html;
      }
      gosterge.classList.toggle('kp-dahil--tamam', tamam);
      // Kombinini seç ekranında ve Özet'te yok
      gosterge.hidden = this.adim === 'ozet' || this.adim === 'sweat';
    }
    // Görsel kartlarında: dahil yuvalar dolana kadar "Dahil" (setlerde "Dahil · 4 patch"), sonra ek ücret: tekli patch'te
    // sıradaki patch'in ücreti, sette setin fiyatı (setler patch indirimine girmez) (CSS ::after)
    var etiket = !tamam ? 'Dahil' : siradaki != null ? '+' + paraBicimle(siradaki) : '';
    if (this._kombinKartEtiketi !== etiket) {
      this._kombinKartEtiketi = etiket;
      this.el.style.setProperty('--kp-kombin-fiyat', etiket ? JSON.stringify(etiket) : 'none');
    }
    this.el.classList.toggle('kp-editor--kombin-dolu', tamam);
    // Tasarım ekranına ilk giriş (editör açılışı başına bir kez, dahil patch'ler dolmadıysa); bildirim sırasına girer
    if (!this.kombinIlkBildirim && (this.adim === 'yazi' || this.adim === 'ikon')) {
      this.kombinIlkBildirim = true;
      if (!tamam) this.bildir(k.dahil + ' patch fiyata dahil! Bir patch seti seç ya da ' + k.dahil + ' patch\'i kendin seç.');
    }
    // Giderilen eksiğin uyarısı ekranda kalmaz
    var secimTamam = !this.kombinSecimEksikleri().length;
    var b = this.bildirimSimdiki;
    if (b && b.tur === 'diger' && ((tamam && /^Kombin için/.test(b.metin)) || (secimTamam && /^Tasarıma başlamak için/.test(b.metin)))) this.bildirimKapat();
    if (this.adim === 'sweat') this.kombinPanelCiz();
  };

  // Kombinini seç: başlık, Sweatshirt bloğu (renkler tek satırda küçük kare görseller, seçili renk ve yaş başlığın
  // sağında; yaş seçilmeden yaşlar kırmızı çerçeveli) ve Hediye Tshirt bloğu
  Editor.prototype.kombinPanelCiz = function () {
    var panel = this.el.querySelector('[data-kp-panel="sweat"]');
    if (!panel) return;
    var k = this.kombin;
    var kb = this.t.kombin;
    var s = k.sweat(kb.s);
    var yas = this.kombinSweatYasi();
    var renkler = k.sweatshirtler.map(function (x) {
      var secili = String(x.id) === String(kb.s);
      return kombinRenkKutusu('data-kp-kombin-renk', x, secili, false, x.renk + ' sweatshirt');
    }).join('');
    var yaslar = s.varyantlar.slice().sort(function (a, b) { return yasSirasi(a.yas, b.yas); }).map(function (v) {
      var secili = String(v.id) === String(kb.v);
      return '<button type="button" class="kp-kombin-yas' + (secili ? ' kp-kombin-yas--secili' : '') + (!kb.v && v.satilabilir ? ' kp-kombin-yas--gerekli' : '') + '" data-kp-kombin-yas="' + kacis(v.id) + '" aria-pressed="' + secili + '"' + (v.satilabilir ? '' : ' disabled') + '>' +
        kacis(v.yas) + ' yaş</button>';
    }).join('');
    var html =
      '<h3 id="kp-p-sweat" class="kp-panel__baslik kp-kombin-baslik" tabindex="-1">Kombinini seç</h3>' +
      '<p class="kp-kombin-aciklama">Sweatshirt + patch seti ' + paraBicimle(kombinTabanFiyati(this.m, k)) + ' · <b>Tshirt hediye</b></p>' +
      '<section class="kp-kombin-blok" data-kp-kombin-blok="sweat" aria-labelledby="kp-kombin-sweat">' +
      '<div class="kp-kombin-blok__ust"><h4 id="kp-kombin-sweat" class="kp-kombin-blok__baslik">Sweatshirt</h4>' +
      '<span class="kp-kombin-blok__secim">' + kacis(s.renk) + (yas ? ' · ' + kacis(yas) + ' yaş' : '') + '</span></div>' +
      '<div class="kp-kombin-renkler" role="group" aria-label="Sweatshirt rengi">' + renkler + '</div>' +
      '<div class="kp-kombin-yaslar" role="group" aria-label="Sweatshirt yaşı">' + yaslar + '</div>' +
      '</section>' +
      this.kombinTisortHtml();
    // Yalnızca içerik değişince yeniden yazılır (parlama sınıfı ve kaydırma yerinde kalır)
    if (panel._kombinHtml !== html) {
      panel._kombinHtml = html;
      panel.innerHTML = html;
    }
  };

  // Renk kutusu: ürünün sade küçük görseli (yoksa renk adı); adı ekran okuyucu ve ipucu için
  function kombinRenkKutusu(nitelik, x, secili, soluk, ad) {
    return '<button type="button" class="kp-kombin-renk' + (secili ? ' kp-kombin-renk--secili' : '') + (soluk ? ' kp-kombin-renk--soluk' : '') + '" ' + nitelik + '="' + kacis(x.id) + '" aria-pressed="' + secili + '" aria-label="' + kacis(ad) + '" title="' + kacis(x.renk) + '">' +
      (x.kapak ? '<img src="' + kacis(x.kapak) + '" alt="" width="54" height="54" loading="lazy">' : '<span>' + kacis(x.renk) + '</span>') + '</button>';
  }

  // Kombinini seç ekranındaki Hediye Tshirt bloğu (kırmızı çerçeve, "HEDİYE", 0 TL ve üstü çizili liste fiyatı):
  // stoktaki renkler; sweatshirt yaşı seçilince seçili rengin stoktaki yaşları (renk yoksa hepsi). Yaş varsayılan
  // olarak sweatshirt'ünkü, müşteri yalnızca rengi seçer. Sweatshirt yaşı seçilene kadar soluk (yine de seçilebilir).
  Editor.prototype.kombinTisortHtml = function () {
    var k = this.kombin;
    var kb = this.t.kombin;
    var secim = kombinTisortu(k, this.t);
    var sweatYas = this.kombinSweatYasi();
    var renk = kb.tr ? k.tisortUrunu(kb.tr) : null;
    var yaslar = [];
    (renk ? [renk] : k.tisortler).forEach(function (x) {
      x.varyantlar.forEach(function (v) { if (yaslar.indexOf(v.yas) === -1) yaslar.push(v.yas); });
    });
    yaslar.sort(yasSirasi);
    var renkHtml = k.tisortler.map(function (x) {
      var yasYok = kb.ty && !x.varyantlar.some(function (v) { return v.yas === kb.ty; });
      return kombinRenkKutusu('data-kp-tisort-renk', x, renk === x, yasYok, x.renk + ' hediye Tshirt');
    }).join('');
    var yasHtml = yaslar.map(function (y) {
      var s = y === kb.ty;
      return '<button type="button" class="kp-kombin-yas' + (s ? ' kp-kombin-yas--secili' : '') + '" data-kp-tisort-yas="' + kacis(y) + '" aria-pressed="' + s + '">' + kacis(y) + ' yaş</button>';
    }).join('');
    var not = '';
    if (sweatYas && !k.tisortYasiVar(sweatYas)) {
      not = sweatYas === '3-5' ? KOMBIN_KUCUK_NOTU : 'Tshirt\'lerimizde ' + sweatYas + ' yaş bedeni yok, en yakın yaşı seç.';
    } else if (renk && kb.ty && !secim) {
      not = renk.renk + ' Tshirt\'te ' + kb.ty + ' yaş kalmadı. Başka bir yaş ya da renk seç.';
    }
    return '<section class="kp-kombin-blok kp-kombin-tisort' + (secim ? ' kp-kombin-tisort--tamam' : '') + (kb.v ? '' : ' kp-kombin-tisort--soluk') + '" data-kp-kombin-blok="tisort" aria-labelledby="kp-tisort-baslik">' +
      '<span class="kp-kombin-hediye kp-kombin-hediye--blok" aria-hidden="true">' + KOMBIN_HEDIYE_SIMGE + 'HEDİYE</span>' +
      '<div class="kp-kombin-blok__ust"><h4 id="kp-tisort-baslik" class="kp-kombin-blok__baslik">Hediye Tshirt</h4>' +
      '<span class="kp-kombin-tisort__fiyat">0 TL <s>' + paraBicimle(k.tisortFiyati(secim)) + '</s></span></div>' +
      '<div class="kp-kombin-renkler" role="group" aria-label="Tshirt rengi">' + renkHtml + '</div>' +
      (kb.v || kb.ty ? '<div class="kp-kombin-yaslar" role="group" aria-label="Tshirt yaşı">' + yasHtml + '</div>' : '') +
      (not ? '<p class="kp-kombin-uyari">' + kacis(not) + '</p>' : '') +
      (secim ? '<p class="kp-kombin-not">Patch\'lerini Tshirt\'üne de takabilirsin.</p>' : '') +
      '</section>';
  };

  // Özet: seçili hediye Tshirt (görsel, renk, yaş, 0 TL) ve "Değiştir"
  Editor.prototype.kombinOzetTisortHtml = function () {
    var secim = kombinTisortu(this.kombin, this.t);
    return '<div class="kp-kombin-ozet-tisort">' +
      (secim && secim.urun.kapak ? '<img src="' + kacis(secim.urun.kapak) + '" alt="" width="44" height="44">' : '') +
      '<div class="kp-kombin-ozet-tisort__bilgi"><p class="kp-kombin-ozet-tisort__ad">' +
      (secim ? 'Hediye Tshirt: ' + kacis(secim.urun.renk) + ' · ' + kacis(secim.varyant.yas) + ' yaş' : 'Hediye Tshirt\'ünü seç') + '</p>' +
      '<p class="kp-kombin-tisort__fiyat">Hediye · 0 TL <s>' + paraBicimle(this.kombin.tisortFiyati(secim)) + '</s></p></div>' +
      '<button type="button" class="kp-baglanti kp-kombin-ozet-tisort__degistir" data-kp-tisort-degistir>' + (secim ? 'Değiştir' : 'Seç') + '</button>' +
      '</div>' +
      '<p class="kp-kombin-not">Patch\'lerini Tshirt\'üne de takabilirsin.</p>';
  };

  // Özet'te sweatshirt satırının eki ve hediye Tshirt satırı
  Editor.prototype.kombinSweatEki = function () {
    var yas = this.kombinSweatYasi();
    return yas ? ' · ' + yas + ' yaş' : '';
  };
  Editor.prototype.kombinOzetSatiri = function (satir) {
    var secim = kombinTisortu(this.kombin, this.t);
    var ad = 'Hediye Tshirt' + (secim ? ': ' + kacis(secim.urun.renk) + ' · ' + kacis(secim.varyant.yas) + ' yaş' : '');
    return satir(ad, '', '<s>' + paraBicimle(this.kombin.tisortFiyati(secim)) + '</s> 0 TL', 'kp-ozet__hediye');
  };
  Editor.prototype.kombinOzetBos = function () {
    var n = kombinPatchSayisi(this.durum && this.durum.parcalar);
    return '<h3 id="kp-p-ozet" class="kp-panel__baslik" tabindex="-1">Kombin için ' + this.kombin.dahil + ' patch ya da bir patch seti seç</h3>' +
      '<p class="kp-panel__aciklama">Şu an ' + n + ' patch var. Her harf ve rakam 1 patch, 4\'lü set ' + this.kombin.dahil + ' patch sayılır; kenardakiler de sayılır.</p>' +
      '<div class="kp-ozet-bos"><button type="button" class="kp-oneri" data-kp-kombin-geri>Patch seçmek için geri dön</button></div>';
  };

  // Kombin düğmeleri (editörün tıklama dinleyicisinden); true: işlendi. Seçimler ve "Değiştir" olay göndermez.
  Editor.prototype.kombinTikla = function (b) {
    var kb = this.t.kombin;
    if (b.hasAttribute('data-kp-galeri-ac')) return this.kombinGaleriAc(b.getAttribute('data-kp-galeri-ac'), b), true;
    if (b.hasAttribute('data-kp-galeri-kapat')) return this.kombinGaleriKapat(), true;
    if (b.hasAttribute('data-kp-galeri-git')) return this.kombinGaleriGit(parseInt(b.getAttribute('data-kp-galeri-git'), 10)), true;
    if (b.hasAttribute('data-kp-kombin-renk')) return this.kombinRenkSec(b.getAttribute('data-kp-kombin-renk')), true;
    if (b.hasAttribute('data-kp-kombin-yas')) return this.kombinYasSec(b.getAttribute('data-kp-kombin-yas')), true;
    if (b.hasAttribute('data-kp-tisort-degistir')) return this.kombinSecimAc(true), true;
    if (b.hasAttribute('data-kp-kombin-geri')) return this.adimaGit(this.sonArac && this.sonArac !== 'sweat' ? this.sonArac : 'ikon', false, true), true;
    // Kombin aracı: dönüş yeri hatırlanır, geçişi editörün kendi dinleyicisi yapar
    if (b.getAttribute('data-kp-adim') === 'sweat' && this.adim !== 'sweat') this.kombinDonus = this.adim;
    if (b.hasAttribute('data-kp-tisort-renk')) {
      kb.tr = b.getAttribute('data-kp-tisort-renk');
      this.kombinTisortYasiEsitle();
      this.yenile();
      return true;
    }
    if (b.hasAttribute('data-kp-tisort-yas')) {
      kb.ty = b.getAttribute('data-kp-tisort-yas');
      kb.tyElle = true;
      this.yenile();
      return true;
    }
    return false;
  };

  // Kombin modunun sabit metinleri: yazı alanının altındaki not, alt çubukta "Toplam · Tshirt hediye"
  Editor.prototype.kombinNotlariKur = function () {
    var k = this.kombin;
    this.el.classList.add('kp-editor--kombin');
    var yazi = this.el.querySelector('[data-kp-panel="yazi"] .kp-alan-girdi');
    if (yazi) yazi.insertAdjacentHTML('afterend', '<p class="kp-kombin-not kp-kombin-not--yazi">Her harf 1 patch sayılır · ilk ' + k.dahil + ' patch dahil</p>');
    var etiket = this.el.querySelector('.kp-alt__fiyat > span');
    if (etiket) etiket.textContent = 'Toplam · Tshirt hediye';
    // Kombinini seç ekranında tasarım önizlemesinin yerinde kombin önizlemesi, altında 3 adım
    var sahne = this.el.querySelector('[data-kp-sahne]');
    if (sahne) sahne.insertAdjacentHTML('afterend', '<div class="kp-kombin-onizleme" data-kp-kombin-onizleme hidden></div>');
    var sira = this.el.querySelector('.kp-onizleme__sira');
    if (sira) sira.insertAdjacentHTML('afterend', '<ol class="kp-kombin-adimlar" data-kp-kombin-adimlar aria-label="Kombin adımları" hidden></ol>');
    // Ürün fotoğrafları tam ekran: kaydırılır, ✕ ile kapanır (olay göndermez)
    this.el.insertAdjacentHTML('beforeend',
      '<div class="kp-kombin-galeri" data-kp-kombin-galeri role="dialog" aria-modal="true" aria-labelledby="kp-galeri-ad" hidden>' +
      '<div class="kp-kombin-galeri__ust"><p id="kp-galeri-ad" class="kp-kombin-galeri__ad" data-kp-galeri-ad></p>' +
      '<span class="kp-kombin-galeri__sayac" data-kp-galeri-sayac></span>' +
      '<button type="button" class="kp-kombin-galeri__kapat" data-kp-galeri-kapat aria-label="Kapat"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>' +
      '<div class="kp-kombin-galeri__alan">' +
      '<div class="kp-kombin-galeri__iz" data-kp-galeri-iz></div>' +
      '<button type="button" class="kp-kombin-galeri__ok kp-kombin-galeri__ok--geri" data-kp-galeri-git="-1" aria-label="Önceki fotoğraf"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button type="button" class="kp-kombin-galeri__ok kp-kombin-galeri__ok--ileri" data-kp-galeri-git="1" aria-label="Sonraki fotoğraf"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</div></div>');
    var self = this;
    var iz = this.el.querySelector('[data-kp-galeri-iz]');
    var bekliyor = false;
    iz.addEventListener('scroll', function () {
      if (bekliyor) return;
      bekliyor = true;
      (window.requestAnimationFrame || setTimeout)(function () { bekliyor = false; self.kombinGaleriSayac(); });
    }, { passive: true });
    this.el.querySelector('[data-kp-kombin-galeri]').addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        self.kombinGaleriGit(e.key === 'ArrowLeft' ? -1 : 1);
      }
    });
  };

  // Kombin önizlemesindeki ürünlerin büyüteci (ürünün fotoğrafları tam ekran)
  function kombinBuyutec(anahtar, ad, yer) {
    return '<button type="button" class="kp-kombin-buyutec kp-kombin-buyutec--' + yer + '" data-kp-galeri-ac="' + kacis(anahtar) + '" aria-label="' + kacis(ad) + ' fotoğraflarını büyük gör">' +
      '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>' + '</button>';
  }

  // Kombinini seç ekranı: önizleme kombini birlikte gösterir (solda büyük sweatshirt, sağ altta biraz küçük ve hafif
  // üstüne binen hediye Tshirt, üstünde "HEDİYE"); renk seçilene kadar Tshirt'ün yerinde kesikli, hafif nabız atan boş
  // yer. Görseller sade (patch'siz); seçilen renkler hemen görünür. Altında 3 adım: Sweatshirt — Hediye Tshirt — Patch seti.
  // Sol araçlar, dahil patch göstergesi ve tasarım önizlemesi yalnızca tasarım ekranında (CSS: kp-editor--kombin-sec).
  Editor.prototype.kombinOnizlemeCiz = function () {
    var secEkrani = this.adim === 'sweat';
    this.el.classList.toggle('kp-editor--kombin-sec', secEkrani);
    var kutu = this.el.querySelector('[data-kp-kombin-onizleme]');
    var adimlar = this.el.querySelector('[data-kp-kombin-adimlar]');
    if (kutu) kutu.hidden = !secEkrani;
    if (adimlar) adimlar.hidden = !secEkrani;
    if (!secEkrani) return;
    var k = this.kombin;
    var kb = this.t.kombin;
    var s = k.sweat(kb.s);
    var secim = kombinTisortu(k, this.t);
    var tisort = secim ? secim.urun : kb.tr ? k.tisortUrunu(kb.tr) : null;
    if (kutu) {
      var html = '<div class="kp-kombin-onizleme__sahne">' +
        '<div class="kp-kombin-onizleme__sweat">' + (s.onizleme ? '<img src="' + kacis(s.onizleme) + '" alt="' + kacis(s.renk + ' sweatshirt') + '" draggable="false">' : '') +
        kombinBuyutec('s:' + s.id, s.baslik, 'sol') + '</div>' +
        '<div class="kp-kombin-onizleme__tisort' + (tisort ? '' : ' kp-kombin-onizleme__tisort--bos') + '">' +
        (tisort
          ? (tisort.onizleme ? '<img src="' + kacis(tisort.onizleme) + '" alt="' + kacis(tisort.renk + ' hediye Tshirt') + '" draggable="false">' : '') +
            kombinBuyutec('t:' + tisort.id, tisort.renk + ' hediye Tshirt', 'sag')
          : '<span class="kp-kombin-yuva">' + KOMBIN_TISORT_SIMGE + '<span>' + (kb.v ? 'Şimdi hediye Tshirt\'ünü seç' : 'Hediye Tshirt\'ün burada görünecek') + '</span></span>') +
        '<span class="kp-kombin-hediye kp-kombin-hediye--onizleme" aria-hidden="true">' + KOMBIN_HEDIYE_SIMGE + 'HEDİYE</span>' +
        '</div></div>';
      if (kutu._kombinHtml !== html) {
        kutu._kombinHtml = html;
        kutu.innerHTML = html;
      }
    }
    if (adimlar) {
      // Etkin adım koyu; tamamlanan kırmızı ✓; hediye adımı etkinken numarası kırmızı
      var sweatTamam = !!kb.v;
      var tisortTamam = !!secim;
      var durumlar = [
        sweatTamam ? 'tamam' : 'etkin',
        tisortTamam ? 'tamam' : sweatTamam ? 'etkin hediye' : '',
        sweatTamam && tisortTamam ? 'etkin' : ''
      ];
      var ah = ['Sweatshirt', 'Hediye Tshirt', 'Patch seti'].map(function (ad, i) {
        var d = durumlar[i];
        var tamam = d === 'tamam';
        return '<li class="kp-kombin-adim' + (d ? ' ' + d.split(' ').map(function (x) { return 'kp-kombin-adim--' + x; }).join(' ') : '') + '"' + (/etkin/.test(d) ? ' aria-current="step"' : '') + '>' +
          '<span class="kp-kombin-adim__no" aria-hidden="true">' + (tamam ? '✓' : i + 1) + '</span>' + ad + (tamam ? '<span class="kp-gizli"> (tamam)</span>' : '') + '</li>';
      }).join('');
      if (adimlar._kombinHtml !== ah) {
        adimlar._kombinHtml = ah;
        adimlar.innerHTML = ah;
      }
    }
  };

  // Tam ekran galeri: önce sade görsel, sonra ürün fotoğrafları ("Görseldeki patch'ler örnektir.")
  Editor.prototype.kombinGaleriAc = function (anahtar, donus) {
    var k = this.kombin;
    var tisort = String(anahtar).charAt(0) === 't';
    var id = String(anahtar).slice(2);
    var urun = tisort ? k.tisortUrunu(id) : k.sweat(id);
    var gal = this.el.querySelector('[data-kp-kombin-galeri]');
    if (!urun || !gal) return;
    var kareler = (urun.buyuk ? [{ src: urun.buyuk, ornek: false }] : []).concat((urun.fotograflar || []).map(function (f) { return { src: f, ornek: true }; }));
    if (!kareler.length) return;
    gal.querySelector('[data-kp-galeri-ad]').textContent = tisort ? urun.renk + ' hediye Tshirt' : urun.baslik;
    var iz = gal.querySelector('[data-kp-galeri-iz]');
    iz.innerHTML = kareler.map(function (x, i) {
      return '<figure class="kp-kombin-galeri__kare"><img src="' + kacis(x.src) + '" alt="' + kacis(urun.baslik + ' ' + (i + 1)) + '"' + (i ? ' loading="lazy"' : '') + ' draggable="false">' +
        (x.ornek ? '<figcaption>Görseldeki patch\'ler örnektir.</figcaption>' : '') + '</figure>';
    }).join('');
    this.kombinGaleriSayi = kareler.length;
    this.kombinGaleriDonus = donus || null;
    this.kombinGaleriAcik = true;
    gal.hidden = false;
    iz.scrollLeft = 0;
    this.kombinGaleriSayac();
    gal.querySelector('[data-kp-galeri-kapat]').focus({ preventScroll: true });
  };
  Editor.prototype.kombinGaleriSira = function () {
    var iz = this.el.querySelector('[data-kp-galeri-iz]');
    return iz && iz.clientWidth ? Math.round(iz.scrollLeft / iz.clientWidth) : 0;
  };
  Editor.prototype.kombinGaleriSayac = function () {
    var gal = this.el.querySelector('[data-kp-kombin-galeri]');
    if (!gal || gal.hidden) return;
    var n = this.kombinGaleriSayi || 1;
    var i = Math.min(n - 1, Math.max(0, this.kombinGaleriSira()));
    var sayac = gal.querySelector('[data-kp-galeri-sayac]');
    var metin = n > 1 ? (i + 1) + ' / ' + n : '';
    if (sayac.textContent !== metin) sayac.textContent = metin;
    gal.querySelector('[data-kp-galeri-git="-1"]').hidden = n < 2 || i === 0;
    gal.querySelector('[data-kp-galeri-git="1"]').hidden = n < 2 || i === n - 1;
  };
  Editor.prototype.kombinGaleriGit = function (yon) {
    var iz = this.el.querySelector('[data-kp-galeri-iz]');
    if (!iz) return;
    var i = Math.min((this.kombinGaleriSayi || 1) - 1, Math.max(0, this.kombinGaleriSira() + yon));
    iz.scrollTo({ left: i * iz.clientWidth, behavior: 'smooth' });
  };
  Editor.prototype.kombinGaleriKapat = function () {
    var gal = this.el.querySelector('[data-kp-kombin-galeri]');
    if (!gal) return;
    gal.hidden = true;
    this.kombinGaleriAcik = false;
    gal.querySelector('[data-kp-galeri-iz]').innerHTML = '';
    var donus = this.kombinGaleriDonus;
    this.kombinGaleriDonus = null;
    if (donus && donus.isConnected && donus.focus) donus.focus({ preventScroll: true });
  };

  /* ---------- Kart: kombin modu ---------- */

  KisiselKart.prototype.kombinKur = function (bolum) {
    var el = document.getElementById('KisiselKombin-' + bolum);
    if (!el) throw new Error('Kombin verisi bulunamadı');
    var k = new Kombin(JSON.parse(el.textContent));
    if (!k.acik || !k.sweatshirtler.length || !k.tisortler.length) throw new Error('Kombin kapalı');
    this.kombin = k;
    var m = this.model;
    m.kombin = k;
    m.kombinAdi = (k.vitrin && k.vitrin.baslik) || 'Sweatshirt Kombini';
    // Kombinde hazır setlerden yalnızca fiyata dahil sayıda (4) patch'lik olanlar (model zaten satıştakileri alır);
    // aksesuar yok
    m.hazirSetler = (m.hazirSetler || []).filter(function (st) { return st.patchler.length === k.dahil; });
    m.hazirSetHarita = {};
    m.hazirSetler.forEach(function (st) { m.hazirSetHarita[st.id] = st; });
    m.aksesuarlar = [];
    m.aksesuarHarita = {};
    m._varyantHaritasi = null;
    if (!k.sweat(m.urun.id)) this.kombinUrunUygula(k.sweatshirtler[0].id);
    // Taslak tek: renk değişse de aynı kombin tasarımı
    this.depoAnahtari = 'kisisel-tasarim-kombin';
  };

  // Sweatshirt rengi / yaşı: aynı model nesnesi yeni sweatshirt'ün görseli ve haritasıyla yeniden kurulur (editör,
  // yerleşim ve sahneler aynı nesneyi kullanır). Yaş seçilmediyse fiyat ve simülasyon için ilk stoktaki yaş.
  KisiselKart.prototype.kombinUrunUygula = function (urunId, varyantId) {
    var s = this.kombin && this.kombin.sweat(urunId);
    if (!s) return false;
    var m = this.model;
    var v = (varyantId && s.varyantlar.filter(function (x) { return String(x.id) === String(varyantId); })[0]) ||
      s.varyantlar.filter(function (x) { return x.satilabilir; })[0];
    if (String(m.urun.id) !== String(s.id)) {
      var ham = {};
      for (var a in m.ham) ham[a] = m.ham[a];
      ham.urun = { id: s.id, baslik: s.baslik, varyant: v.id, fiyat: v.fiyat, satilabilir: v.satilabilir, metin_siniri: s.ham.metin_siniri };
      ham.gorsel = s.ham.gorsel;
      ham.harita = s.ham.harita;
      m.ham = ham;
      m.urun = ham.urun;
      m.gorsel = ham.gorsel;
      m.metinSiniri = parseInt(ham.urun.metin_siniri, 10) > 0 ? parseInt(ham.urun.metin_siniri, 10) : null;
      m.geometriKur(ham);
      // Yerleşimin alana bağlı önbellekleri
      var yer = this.yer;
      Object.keys(yer).forEach(function (x) { if (x.charAt(0) === '_') delete yer[x]; });
      this.miniSahne = null;
      var mini = this.querySelector('[data-kisisel-mini]');
      if (mini) mini.innerHTML = '';
    } else {
      m.urun.varyant = v.id;
      m.urun.fiyat = v.fiyat;
      m.urun.satilabilir = v.satilabilir;
    }
    m._varyantHaritasi = null;
    return true;
  };

  // Kartta gösterilen kombin fiyatı (editördeki kombinFiyat ile aynı kural)
  KisiselKart.prototype.kombinGosterim = function (f) {
    var k = this.kombin;
    var tisort = k.tisortFiyati(kombinTisortu(k, this.tasarim));
    if (f.patchAdet < k.dahil) {
      var taban = kombinTabanFiyati(this.model, k);
      return { yeni: taban, eski: taban + tisort };
    }
    var yeni = this.kartTutar(f).odenecek;
    return { yeni: yeni, eski: yeni + tisort };
  };

  // Editör kapanınca model kayıtlı kombine döner (kaydetmeden çıkılırsa son seçilen renkte kalmasın)
  KisiselKart.prototype.kombinKartEsitle = function () {
    var kb = this.tasarim && this.tasarim.kombin;
    if (!kb || String(this.model.urun.id) === String(kb.s)) return;
    this.kombinUrunUygula(kb.s, kb.v);
    if (this.editor.el) this.editor.kombinSahneleriKur();
  };

  // Sepete eklemeden önce kartın denetimi (editör zaten engeller; kart düğmesi ve eski taslaklar için)
  KisiselKart.prototype.kombinEksigi = function (paket) {
    var k = this.kombin;
    var kb = paket.tasarim.kombin;
    if (!kb || !kb.v) return { adim: 'sweat', metin: 'Önce sweatshirt\'ünün yaşını seç.' };
    if (!kombinTisortu(k, paket.tasarim)) return { adim: 'sweat', metin: 'Hediye Tshirt\'ünü seç.' };
    if (kombinPatchSayisi(paket.parcalar) < k.dahil) return { adim: 'ikon', metin: 'Kombin için ' + k.dahil + ' patch ya da bir patch seti seç.' };
    return null;
  };

  // Test kodu (tema ayarı) sepete yazılır; sepette olan kodlar korunur. cizim: çekmece bölümleri de istenir.
  // İzlenmeyen yoldan (kod yazmak sepete ekleme değildir). Hata olursa sessizce geçilir (sepet kodsuz kalır).
  KisiselKart.prototype.kombinKoduYaz = function (cizim) {
    var kod = this.kombin && this.kombin.kod;
    if (!kod) return Promise.resolve(null);
    var rotalar = window.routes || {};
    return fetch((rotalar.cart_url || '/cart') + '.js', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (sepet) {
        var kodlar = [];
        var ekle = function (c) { if (c && kodlar.indexOf(c) === -1) kodlar.push(c); };
        (sepet.discount_codes || []).forEach(function (d) { ekle(d && d.code); });
        (sepet.cart_level_discount_applications || []).forEach(function (d) { if (d.type === 'discount_code') ekle(d.title); });
        if (kodlar.some(function (c) { return String(c).toUpperCase() === kod.toUpperCase(); })) return null;
        ekle(kod);
        var govde = { discount: kodlar.join(',') };
        if (cizim) {
          govde.sections = ['cart-drawer', 'cart-icon-bubble'];
          govde.sections_url = window.location.pathname;
        }
        return postJson((rotalar.cart_update_url || '/cart/update') + '.js', govde, true);
      })
      .catch(function () { return null; });
  };

  KisiselKart.prototype.connectedCallback = function () {
    if (this._kuruldu) return;
    this._kuruldu = true;
    try {
      this.baslat();
    } catch (e) {
      // Herhangi bir hata: kart gizli kalır, sayfa bugünkü gibi çalışır
      this.hidden = true;
      acilisOrtusuKaldir();
      if (window.console) console.warn('[kisisel] başlatılamadı:', e);
    }
  };

  KisiselKart.prototype.baslat = function () {
    var bolum = this.getAttribute('data-section-id');
    var veriEl = document.getElementById('KisiselVeri-' + bolum);
    if (!veriEl) throw new Error('Veri bulunamadı');
    olc('veri_basladi');
    this.model = new Model(JSON.parse(veriEl.textContent));
    this.yer = new Yerlesim(this.model);
    olc('veri_hazir');
    this.formId = this.getAttribute('data-form-id');
    this.bolum = bolum;
    this.depoAnahtari = 'kisisel-tasarim-' + this.model.urun.id;
    if (this.hasAttribute('data-kombin')) this.kombinKur(bolum);
    this.editor = new Editor(this);

    var self = this;
    // Kampanya kuralları arka planda öğrenilir (saklanır); editörde fiyat anında hesaplanır. Editör adresten açılıyorsa
    // önce editör ve önizleme görseli hazırlanır, istek sonra atılır (ağ ve işlemciyi görselle paylaşmasın)
    var kurallar = function () {
      olc('kampanya_basladi');
      kurallariOgren(self.model).then(function () {
        olc('kampanya_bitti');
        if (!bosMu(self.tasarim)) {
          self.kartKampanyaAnahtari = null;
          self.guncelle();
        }
      }, function () { olc('kampanya_bitti'); });
    };
    if (/[?&]kisisellestir=/.test(window.location.search)) this.hazirOlunca = kurallar;
    else kurallar();
    // "Kişiselleştirmeye başla" ve taslakta "Devam et": kaldığı araç ve yakınlaştırmayla açılır
    this.querySelectorAll('[data-kisisel-ac]').forEach(function (b) {
      b.addEventListener('click', function () {
        self.notGoster('');
        var bilgi = !bosMu(self.tasarim) && self.taslakBilgi;
        self.editor.ac(bilgi && bilgi.arac ? bilgi.arac : bosMu(self.tasarim) ? 'yazi' : 'ikon', bilgi ? { yakin: bilgi.yakin } : null);
      });
    });
    this.querySelector('[data-kisisel-sil]').addEventListener('click', function () { self.tasarimSil(); });
    this.addEventListener('click', function (e) {
      if (e.target.closest('[data-kisisel-geri-al]')) self.geriAl();
    });
    // Sayfa her göründüğünde (geri tuşu ve bfcache dahil) kayıt yeniden okunur; başka sekmedeki değişiklik de
    window.addEventListener('pageshow', function () { self.kayitOku(); });
    window.addEventListener('storage', function (e) { if (e.key === self.depoAnahtari) self.kayitOku(); });
    this.querySelectorAll('[data-kisisel-sade]').forEach(function (b) {
      b.addEventListener('click', function () { self.sadeSepet(); });
    });
    // Sepette tasarım varken: yeni (boş) tasarım
    this.querySelector('[data-kisisel-yeni]').addEventListener('click', function () {
      self.notGoster('');
      self.editor.ac('yazi');
    });
    // (b) kartın altındaki kırmızı buton
    this.querySelector('[data-kisisel-sepete-ekle]').addEventListener('click', function () { self.sepeteEkle(); });
    this.addEventListener('click', function (e) {
      if (e.target.closest('[data-kisisel-sepete-git]')) return self.sepetiAc();
      var d = e.target.closest('[data-kisisel-sepet-duzenle]');
      if (d) return self.sepettekiniDuzenle(parseInt(d.getAttribute('data-kisisel-sepet-duzenle'), 10));
      var sil = e.target.closest('[data-kisisel-sepet-sil]');
      if (sil) return self.sepettenSil(parseInt(sil.getAttribute('data-kisisel-sepet-sil'), 10));
    });
    // Sepet her değiştiğinde kart durumu yeniden belirlenir
    // Editör artık kart sayfaya gelir gelmez başlıyor (async); temanın pubsub'ı daha yüklenmemiş olabilir
    var abone = function () {
      try {
        if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          subscribe(PUB_SUB_EVENTS.cartUpdate, function () { self.sepetOku(); });
          return true;
        }
      } catch (e) {
        /* tema pubsub yoksa */
      }
      return false;
    };
    if (!abone() && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', abone, { once: true });
    document.addEventListener('kisisel:sepet-degisti', function () { self.sepetOku(); });
    window.addEventListener('pageshow', function () { self.sepetOku(); });
    window.addEventListener('resize', function () { self.butonlariGuncelle(); });
    this.davetHazirla();

    this.hidden = false;
    // Kart çalışıyorsa temanın kırmızı "Değiştirilebilir patchler…" kutusu gizlenir (yerine kartın yeşil notu);
    // JS yüklenemezse kart gizli kalır, temanın kutusu görünmeye devam eder
    document.body.classList.add('kisisel-aktif');
    this.sepettekiler = [];
    this.kayitOku();
    this.sepetOku();
    this.adrestenAc();
  };

  // Kategori sayfasındaki "Kişiselleştir" / "Tasarla": adres ?kisisellestir=1 ile gelir, editör açık başlar.
  // Parametre adresten hemen silinir; editör kapanınca müşteri normal ürün sayfasında kalır (yenileyince yeniden açılmaz).
  KisiselKart.prototype.adrestenAc = function () {
    var adres;
    try {
      adres = new URL(window.location.href);
    } catch (e) {
      return;
    }
    if (!adres.searchParams.has('kisisellestir')) return;
    adres.searchParams.delete('kisisellestir');
    try {
      history.replaceState(history.state, '', adres.pathname + adres.search + adres.hash);
    } catch (e) {
      /* yoksay */
    }
    var bilgi = !bosMu(this.tasarim) && this.taslakBilgi;
    this.editor.ac(bilgi && bilgi.arac ? bilgi.arac : bosMu(this.tasarim) ? 'yazi' : 'ikon');
    olc('editor_cizildi');
    var self = this;
    this.editor.gorselHazir(2500).then(function () {
      olc('onizleme_gorseli');
      acilisOrtusuKaldir();
      olc('kullanilabilir');
      if (self.hazirOlunca) {
        var f = self.hazirOlunca;
        self.hazirOlunca = null;
        (window.requestIdleCallback || setTimeout)(f, { timeout: 1500 });
      }
    });
  };

  // Ürün sayfası ?kisisellestir=1 ile açılınca kisisel-kart.liquid ilk boyamada beyaz bir açılış örtüsü gösterir
  // (önizleme yeri yükleniyor görünümünde). Editör ve önizleme görseli hazır olunca kalkar.
  // kp-acilis-arka artık sayfayı gizlemiyor (layout/theme.liquid; Safari gizli sayfayı load'a kadar boyamıyordu); editör opak
  // ve tam ekran olduğu için arkadaki sayfa zaten görünmez. Eski not: açılışta bütün sayfanın
  // boyanması (4 kat yavaş işlemcide ~0,6 s) editörü geciktirmez; sayfa editör kapanınca görünür.
  function acilisOrtusuKaldir() {
    var k = document.documentElement;
    if (!k.classList.contains('kp-acilis-bekle')) return;
    var editorAcik = !!document.querySelector('.kp-editor:not([hidden])');
    if (editorAcik) k.classList.add('kp-acilis-arka');
    k.classList.remove('kp-acilis-bekle');
  }

  // Kayıtlı tasarımı okur, stoğu biten ya da artık olmayan patch'leri ayıklar, kartı günceller
  KisiselKart.prototype.kayitOku = function () {
    if (this.editor.el && !this.editor.el.hidden) return; // editör açıkken dokunma
    var kayitli = depoOku(this.depoAnahtari);
    // Kombin taslağı kendi sweatshirt'ünün görseline göre kayıtlı: önce model ona döner
    if (this.kombin && kayitli && kayitli.t && kayitli.t.kombin) {
      var onceki = this.model.urun.id;
      this.kombinUrunUygula(kayitli.t.kombin.s, kayitli.t.kombin.v);
      if (String(onceki) !== String(this.model.urun.id) && this.editor.el) this.editor.kombinSahneleriKur();
    }
    var sonuc = kayitli && kayitli.t && kayitli.v === 1 ? this.tasarimTemizle(kayitli.t) : null;
    this.tasarim = sonuc && !bosMu(sonuc.t) ? sonuc.t : null;
    this.taslakBilgi = this.tasarim ? { zaman: kayitli.zaman || null, arac: kayitli.arac || null, yakin: kayitli.yakin !== false } : null;
    this.modDegistir(this.tasarim ? 'kisisel' : 'sade');
    if (sonuc && sonuc.cikanlar.length) {
      this.notGoster(
        'Tasarımındaki ' + sonuc.cikanlar.join(', ') + ' artık stokta olmadığı için çıkarıldı' +
        (sonuc.renkler.length ? '; ' + sonuc.renkler.join(', ') + ' için başka renk seçildi.' : '.')
      );
    } else if (sonuc && sonuc.renkler.length) {
      this.notGoster(sonuc.renkler.join(', ') + ' harfinin rengi stokta kalmadığı için başka renkle değiştirildi.');
    }
  };

  // Kayıtlı tasarımdaki artık var olmayan ya da stoğu biten parçaları ayıklar.
  // Dönüş: { t, cikanlar: [çıkarılan patch adları], renkler: [rengi değişen harfler] } ya da null
  KisiselKart.prototype.tasarimTemizle = function (t) {
    return tasarimiTemizle(this.model, t);
  };

  function tasarimiTemizle(m, t) {
    if (!t || !Array.isArray(t.parcalar)) return null;
    var cikanlar = [];
    var renkler = [];
    var stokta = function (v) { return !!v && v.satilabilir !== false && v.stok !== 0; };
    t.setId = m.set(t.setId).id;
    t.isim = typeof t.isim === 'string' ? t.isim : '';
    // Harf ve rakamlar: stoğu biten karakter yazıdan çıkar (yerleşim kayar: ayrı harf konumları sıfırlanır)
    var harfler = Array.from(t.isim);
    var kalanlar = [];
    var kalanRenk = [];
    var kalanSet = [];
    harfler.forEach(function (h, i) {
      var set = karakterSeti(m, t, i, h);
      var var_ = !!set && (set.cokRenkli ? (set.karakterVaryantlari[h] || []).length > 0 : stokta(set.karakterler[h]));
      if (!var_) {
        cikanlar.push(h + (RAKAM_DESENI.test(h) ? ' rakamı' : ' harfi'));
        return;
      }
      var renk = t.harfRenkleri && t.harfRenkleri[i];
      if (set.cokRenkli && renk != null && !(set.karakterVaryantlari[h] || []).some(function (v) { return String(v.id) === String(renk); })) {
        renkler.push(h);
        renk = null;
      }
      kalanlar.push(h);
      kalanRenk.push(renk == null ? null : renk);
      kalanSet.push(set.rakam ? null : set.id);
    });
    if (kalanlar.length !== harfler.length) {
      t.isim = kalanlar.join('');
      t.harfAyri = false;
      t.harfAyri2 = false;
      t.harfKonumlari = null;
      t.harfAcilari = null;
      t.bol = null;
      t.bolSabit = false;
    }
    t.karakterSetleri = kalanSet;
    if (t.harfRenkleri) t.harfRenkleri = kalanRenk;
    if (!bolunmus(t)) t.bol = null;
    t.harfAyri = !!t.harfAyri && Array.isArray(t.harfKonumlari);
    t.harfAyri2 = !!t.harfAyri2 && Array.isArray(t.harfKonumlari);
    if (herhangiAyri(t)) {
      // Geçersiz konumlar boşaltılır (sıra korunur); düzenle() blok dizilimden yeniden atar
      t.harfKonumlari = t.harfKonumlari.map(function (k) {
        return Array.isArray(k) && isFinite(k[0]) && isFinite(k[1]) ? k : null;
      });
    } else {
      t.harfKonumlari = null;
    }
    // Rakam ve ikonlar: ürün/varyant hâlâ var mı, stokta mı?
    t.parcalar = t.parcalar.filter(function (p) {
      if (p.tip === 'number') {
        var rs = m.rakamSeti();
        var rv = rs && rs.varyantlar.filter(function (v) { return String(v.id) === String(p.varyantId); })[0];
        if (stokta(rv)) return true;
        cikanlar.push(rv ? rv.karakter + ' rakamı' : 'bir rakam');
        return false;
      }
      var ikon = p.tip === 'icon' && m.ikonHarita[p.urunId];
      if (ikon && String(ikon.varyant.id) === String(p.varyantId) && stokta(ikon.varyant)) return true;
      cikanlar.push(ikon ? ikon.ad : 'bir ikon');
      return false;
    });
    // Satıştan kalkan ya da patch'i eksilen hazır set bozulur; kalan patch'ler tek tek fiyatlanır
    setleriTemizle(m, t);
    // Aksesuarlar: stokta değilse çıkar; üzerindeki tasarım da aynı kurallarla temizlenir
    t.aksesuarlar = (t.aksesuarlar || []).filter(function (a) {
      var aks = m.aksesuarHarita && m.aksesuarHarita[a.urunId];
      if (!aks) {
        cikanlar.push('bir aksesuar');
        return false;
      }
      var am = a.tasarim && m.aksesuarModeli(aks.id);
      if (am) {
        var s2 = tasarimiTemizle(am.m, a.tasarim);
        a.tasarim = s2 && !bosMu(s2.t) ? s2.t : null;
        if (s2) cikanlar = cikanlar.concat(s2.cikanlar);
      } else {
        a.tasarim = null;
      }
      return true;
    });
    return { t: t, cikanlar: cikanlar, renkler: renkler };
  }

  KisiselKart.prototype.modDegistir = function (mod) {
    this.mod = mod;
    this.durumCiz();
    this.kaydet();
    this.guncelle();
  };

  // Kartın üç durumu: (a) tasarım yok → davet; (b) kayıtlı tasarım → "Senin tasarımın";
  // (c) bu ürüne ait tasarım sepette → sepet kartı, altında (b) ya da "Bir tane daha mı istersin?"
  KisiselKart.prototype.durumCiz = function () {
    var tasarimVar = !bosMu(this.tasarim);
    var sepetVar = (this.sepettekiler || []).length > 0;
    this.querySelector('[data-kisisel-davet]').hidden = tasarimVar || sepetVar;
    // Sepette tasarım var, yeni tasarım yok: ana kutu yerine kartın altında küçük "Bir tane daha" satırı
    this.querySelector('[data-kisisel-ana]').hidden = sepetVar && !tasarimVar;
    this.querySelector('[data-kisisel-tekrar]').hidden = tasarimVar || !sepetVar;
    this.querySelector('[data-kisisel-govde]').hidden = !tasarimVar;
    this.querySelector('[data-kisisel-sepet]').hidden = !sepetVar;
    this.querySelector('[data-kisisel-sepete-ekle]').hidden = !tasarimVar;
    // Kayıtlı ya da sepette tasarım varken "Hemen satın al" gizlenir (CSS)
    document.body.classList.toggle('kisisel-tasarimli', tasarimVar || sepetVar);
  };

  // Sepetteki bu ürüne ait kişiselleştirilmiş gruplar (_tasarim_id), kart (c) durumu için
  KisiselKart.prototype.sepetOku = function () {
    var self = this;
    kampanyaSepetiniUnut();
    var m = this.model;
    var rotalar = window.routes || {};
    var sira = (this._sepetSira = (this._sepetSira || 0) + 1);
    return fetch((rotalar.cart_url || '/cart') + '.js', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (sepet) {
        if (sira !== self._sepetSira) return;
        sepetOnbellek = { zaman: Date.now(), satirlar: sepetSatirlari(sepet) };
        var gruplar = {};
        var liste = [];
        (sepet.items || []).forEach(function (k) {
          var o = k.properties || {};
          if (!o._tasarim_id) return;
          var g = gruplar[o._tasarim_id];
          if (!g) {
            g = gruplar[o._tasarim_id] = { id: o._tasarim_id, baz: null, toplam: 0, kalemler: [], patch: 0 };
            liste.push(g);
          }
          g.toplam += Number(k.final_line_price) || 0;
          g.kalemler.push(k);
          // Set satırı birden fazla patch sayılır (_patch_sayisi)
          if (o._tasarim_rol === 'patch') g.patch += (Number(k.quantity) || 0) * (Number(o._patch_sayisi) || 1);
          if (o._tasarim_rol === 'baz') g.baz = k;
        });
        // Kombin kartı sepetteki kombinleri gösterir; sweatshirt sayfasındaki kart kombinleri saymaz
        self.sepettekiler = liste.filter(function (g) {
          if (!g.baz) return false;
          var kombinde = !!(g.baz.properties || {})._kombin;
          return self.kombin ? kombinde : !kombinde && String(g.baz.product_id) === String(m.urun.id);
        });
        self.sepetCiz();
        self.durumCiz();
        self.galeriGuncelle();
      })
      .catch(function () {});
  };

  KisiselKart.prototype.sepetCiz = function () {
    var kap = this.querySelector('[data-kisisel-sepet]');
    var gruplar = this.sepettekiler || [];
    if (!gruplar.length) {
      kap.innerHTML = '';
      return;
    }
    var m = this.model;
    var kompakt = gruplar.length > 1;
    var kombin = this.kombin;
    kap.innerHTML = gruplar
      .map(function (g, i) {
        var o = g.baz.properties || {};
        var adet = Math.max(1, g.baz.quantity || 1);
        return (
          '<div class="kisisel-kart__kutu kisisel-kart__kutu--sepet' + (kompakt ? ' kisisel-kart__kutu--kompakt' : '') + '">' +
          '<div class="kisisel-kart__ust"><p class="kisisel-kart__baslik">' + (kombin ? 'Senin kombinin' : 'Senin tasarımın') + '</p><span class="kisisel-kart__sepette">✓ Sepette</span></div>' +
          '<div class="kisisel-kart__tasarim">' +
          '<div class="kisisel-kart__mini" data-kisisel-sepet-mini="' + i + '" aria-hidden="true"></div>' +
          '<div class="kisisel-kart__bilgiler">' +
          '<p class="kisisel-kart__icerik">' + kacis(String(o['Tasarım'] || '').split(' + ').join(' · ')) + '</p>' +
          '<p class="kisisel-kart__adet">' + Math.round(g.patch / adet) + ' patch' + (adet > 1 ? ' · ' + adet + ' adet' : '') + '</p>' +
          '<p class="kisisel-kart__toplam">Toplam ' + paraBicimle(g.toplam) + '</p>' +
          '</div></div>' +
          '<button type="button" class="btn btn-primary button--full-width kisisel-kart__buton kisisel-kart__sepete-git" data-kisisel-sepete-git>Sepete git</button>' +
          '<div class="kisisel-kart__butonlar">' +
          // Kombin sepette düzenlenmez (renk, Tshirt ve indirim birlikte); silip yeniden tasarlanır
          (kombin ? '' : '<button type="button" class="btn btn-outline kisisel-kart__buton" data-kisisel-sepet-duzenle="' + i + '">Düzenle</button>') +
          '<button type="button" class="btn btn-outline kisisel-kart__buton kisisel-kart__sil" data-kisisel-sepet-sil="' + i + '">Sepetten sil</button>' +
          '</div>' +
          '<p class="kisisel-kart__gri-not">' + (kombin ? 'Değiştirmek istersen sepetten silip yeniden tasarla.' : 'Düzenlediğinde sepetteki tasarımın kendiliğinden güncellenir.') + '</p>' +
          '</div>'
        );
      })
      .join('');
    var self = this;
    gruplar.forEach(function (g, i) {
      var el = kap.querySelector('[data-kisisel-sepet-mini="' + i + '"]');
      // Kombin başka renkteyse önizleme yerine o sweatshirt'ün görseli
      var ks = kombin && String(g.baz.product_id) !== String(m.urun.id) ? kombin.sweat(g.baz.product_id) : null;
      if (ks) {
        if (ks.kapak) el.innerHTML = '<img src="' + kacis(ks.kapak) + '" alt="" width="80" height="80" loading="lazy">';
        return;
      }
      try {
        var tg = self.gruptanTasarim(g);
        if (tg) miniSahneKur(el, m, self.yer).ciz(self.yer.parcalar(tg), {}, false);
      } catch (e) {
        /* konum okunamazsa önizleme boş kalır */
      }
    });
  };

  // Sepetteki tasarımı editörde aç (konumdan ve varyantlardan kurulur)
  // Sepetteki gruptan tasarım: çanta satırının konumu + aksesuar satırlarındaki iç tasarımlar
  KisiselKart.prototype.gruptanTasarim = function (g) {
    var t = null;
    try {
      t = konumdanTasarim(this.model, this.yer, JSON.parse((g.baz.properties || {})._tasarim_konum || '{}'));
    } catch (e) {
      t = null;
    }
    if (!t) return null;
    var m = this.model;
    (t.aksesuarlar || []).forEach(function (a) {
      var satir = g.kalemler.filter(function (k) { return (k.properties || {})._aksesuar_id === a.uid && (k.properties || {})._tasarim_rol === 'aksesuar'; })[0];
      var am = m.aksesuarModeli(a.urunId);
      if (!satir || !am || !satir.properties._aksesuar_konum) return;
      try {
        a.tasarim = konumdanTasarim(am.m, am.yer, JSON.parse(satir.properties._aksesuar_konum));
      } catch (e) {
        a.tasarim = null;
      }
    });
    return t;
  };

  KisiselKart.prototype.sepettekiniDuzenle = function (i) {
    var g = (this.sepettekiler || [])[i];
    if (!g) return;
    var t = this.gruptanTasarim(g);
    if (!t) {
      this.notGoster('Bu tasarım düzenlenemiyor. Sepetten silip yeniden tasarlayabilirsin.');
      return;
    }
    this.notGoster('');
    this.editor.ac('ikon', { tasarim: t, grup: g });
  };

  // izsiz: gizli iframe'in fetch'i (Web Pixels Manager izlemez; yoksa sayfanın fetch'i)
  function postJson(url, govde, izsiz) {
    var f = (izsiz && izsizFetch()) || window.fetch.bind(window);
    return f(window.location.origin + url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(govde)
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || j.status) throw new Error(j.description || j.message || 'Sepet güncellenemedi.');
        return j;
      });
    });
  }

  function anahtarlariSil(kalemler) {
    var rotalar = window.routes || {};
    var guncelle = {};
    kalemler.forEach(function (k) { guncelle[k.key] = 0; });
    return postJson((rotalar.cart_update_url || '/cart/update') + '.js', { updates: guncelle });
  }

  // Bir grup kalemi sepete ekler; başarısızsa yarım kalan kalemleri geri alır ve hata fırlatır.
  // Sepetteki tasarımı güncelleme ve silineni geri getirme yeni sepete ekleme değildir: izlenmeyen yoldan, olaysız.
  KisiselKart.prototype.grupEkle = function (kalemler, kimlik) {
    var self = this;
    var rotalar = window.routes || {};
    return postJson((rotalar.cart_add_url || '/cart/add') + '.js', { items: kalemler }, true).catch(function (e) {
      return self.yarimKalanlariTemizle(kimlik).then(function () { throw e; });
    });
  };

  // Sepetteki tasarımı güncelle: önce yeni grup eklenir, başarılıysa eski grup kaldırılır.
  // Eski grup kaldırılamazsa yeni grup geri alınır (sepette iki tasarım ya da yarım grup kalmaz).
  KisiselKart.prototype.sepettekiTasarimiGuncelle = function (g, t) {
    var self = this;
    var m = this.model;
    var paket = this.sepetKalemleri(Math.max(1, g.baz.quantity || 1), t);
    if (Object.keys(paket.hatalar).length) return Promise.reject(new Error('Tasarımda sığmayan parça var.'));
    return this.grupEkle(paket.kalemler, paket.kimlik)
      .then(function () {
        return anahtarlariSil(g.kalemler).catch(function () {
          return anahtarlariSil(g.kalemler).catch(function (e) {
            return self.yarimKalanlariTemizle(paket.kimlik).then(function () { throw e; });
          });
        });
      })
      .then(function () {
        cizimKitiKaydet(paket.kimlik, m, paket.parcalar);
        olayYayinla('sepetteki_tasarim_guncellendi', { urun_id: m.urun.id, tasarim_id: paket.kimlik });
        return self.sepetOku();
      });
  };

  // "Sepetten sil": grubun tüm satırları kaldırılır; birkaç saniye "Geri al"
  KisiselKart.prototype.sepettenSil = function (g) {
    var self = this;
    if (typeof g === 'number') g = (this.sepettekiler || [])[g];
    if (!g || this._sepetIslem) return;
    this._sepetIslem = true;
    var yedek = g.kalemler.map(function (k) { return { id: k.variant_id, quantity: k.quantity, properties: k.properties }; });
    return anahtarlariSil(g.kalemler)
      .then(function () {
        self.sepetYedek = { id: g.id, kalemler: yedek };
        self.bildirimGoster('<span>Tasarım sepetten çıkarıldı</span> · <button type="button" class="kisisel-kart__geri-al" data-kisisel-geri-al>Geri al</button>', 6000);
        olayYayinla('sepetteki_tasarim_silindi', { urun_id: self.model.urun.id, tasarim_id: g.id });
        return self.sepetOku();
      })
      .then(function () { self.cekmeceYenile(false); })
      .catch(function () { self.notGoster('Tasarım sepetten çıkarılamadı, tekrar dene.'); })
      .then(function () { self._sepetIslem = false; });
  };

  // Sepet çekmecesi ve sepet simgesi güncel sepetle yeniden çizilir; ac: çekmece açılsın mı
  KisiselKart.prototype.cekmeceYenile = function (ac) {
    var cizim = document.querySelector('cart-drawer');
    try {
      if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') publish(PUB_SUB_EVENTS.cartUpdate, { source: 'kisisel-kart' });
    } catch (e) {
      /* yoksay */
    }
    return fetch(window.location.pathname + '?sections=cart-drawer,cart-icon-bubble')
      .then(function (r) { return r.json(); })
      .then(function (bolumler) {
        if (cizim && ac && typeof cizim.renderContents === 'function') {
          cizim.classList.remove('is-empty');
          cizim.renderContents({ id: null, sections: bolumler });
          return;
        }
        // Açmadan güncelle: temanın renderContents'inin yaptığı yerleştirmenin aynısı
        if (cizim && typeof cizim.getSectionsToRender === 'function' && typeof cizim.getSectionInnerHTML === 'function') {
          cizim.getSectionsToRender().forEach(function (b) {
            var el = b.selector ? document.querySelector(b.selector) : document.getElementById(b.id);
            if (el && bolumler[b.id]) el.innerHTML = cizim.getSectionInnerHTML(bolumler[b.id], b.selector);
          });
        }
      })
      .catch(function () {});
  };

  // "Sepete git": sepet çekmecesini güncel içerikle açar; çekmece yoksa sepet sayfasına gider
  KisiselKart.prototype.sepetiAc = function () {
    document.documentElement.classList.remove('kp-acilis-arka'); // sepet çekmecesi sayfanın içinde: görünür olmalı
    var cizim = document.querySelector('cart-drawer');
    var rotalar = window.routes || {};
    if (!cizim || typeof cizim.renderContents !== 'function') {
      window.location.href = rotalar.cart_url || '/cart';
      return;
    }
    fetch(window.location.pathname + '?sections=cart-drawer,cart-icon-bubble')
      .then(function (r) { return r.json(); })
      .then(function (bolumler) {
        cizim.classList.remove('is-empty');
        cizim.renderContents({ id: null, sections: bolumler });
      })
      .catch(function () {
        if (typeof cizim.open === 'function') cizim.open();
      });
  };

  // Davet kartı: siyah daire üzerinde örnek harfler (PNG'si olan ilk setten) ve patch fiyatı
  KisiselKart.prototype.davetHazirla = function () {
    var m = this.model;
    var ornek = this.querySelector('[data-kisisel-ornek]');
    var set = m.setler.filter(function (s) { return s.karakterler.A && s.karakterler.A.png; })[0] || m.setler[0];
    if (ornek && set) {
      // Tek patch'lik üründe tek harf
      ornek.innerHTML = (m.tekPatch ? ['A'] : ['A', 'B', 'C'])
        .map(function (h) {
          var v = set.karakterler[h];
          return v && v.gorsel ? '<img ' + gorselKaynak(v.gorsel, 16) + ' alt="" loading="lazy">' : '<span>' + h + '</span>';
        })
        .join('');
    }
    var fiyatEl = this.querySelector('[data-kisisel-patch-fiyat]');
    var v0 = set && Object.keys(set.karakterler).map(function (k) { return set.karakterler[k]; })[0];
    if (fiyatEl && v0 && v0.fiyat != null) fiyatEl.textContent = (m.tekPatch ? 'Patch ' : 'Her patch ') + paraBicimle(v0.fiyat);
  };

  // "Sadece çantayı al": düz ürün akışı (temanın kendi sepete ekleme formu)
  KisiselKart.prototype.sadeSepet = function () {
    if (this.mod !== 'sade') this.modDegistir('sade');
    var form = document.getElementById(this.formId);
    if (!form) return;
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.querySelector('[type="submit"]').click();
  };

  // Editörün özet adımından: tasarım varsa tasarımla, yoksa sadece çanta
  KisiselKart.prototype.sepeteGonder = function () {
    if (bosMu(this.tasarim)) return this.sadeSepet();
    return this.sepeteEkle();
  };

  // Taslak: tasarım + kaydedilme zamanı, açık araç ve yakınlaştırma (bu cihaz ve tarayıcıda)
  KisiselKart.prototype.kaydet = function () {
    var b = this.taslakBilgi || {};
    depoYaz(this.depoAnahtari, bosMu(this.tasarim) ? null : { v: 1, mod: this.mod, t: this.tasarim, zaman: b.zaman || Date.now(), arac: b.arac || null, yakin: b.yakin !== false });
  };

  // Kartın üst kısmındaki kısa not (stoktan çıkan patch'ler vb.); boş metin gizler
  KisiselKart.prototype.notGoster = function (metin) {
    var el = this.querySelector('[data-kisisel-not]');
    if (!el) return;
    el.textContent = metin || '';
    el.hidden = !metin;
  };

  // Kart içi bildirim ("Tasarım silindi · Geri al", "Tasarımın sepete eklendi"); sure sonra kapanır
  // Kart içi bildirim ("Tasarım silindi · Geri al"): 4,5 sn, "Geri al" içerenler 6 sn. Dokununca / fare üstündeyken
  // kaybolmaz, bırakınca süre baştan başlar; alttan kayarak gelir, aşağı kayarak söner.
  KisiselKart.prototype.bildirimGoster = function (html) {
    var el = this.querySelector('[data-kisisel-bildirim]');
    var self = this;
    var sure = /data-kisisel-geri-al/.test(html) ? 6000 : 4500;
    clearTimeout(this.bildirimZamanlayici);
    el.innerHTML = html;
    el.hidden = false;
    el.classList.remove('kp-bildirim-cikis', 'kp-bildirim-giris');
    void el.offsetWidth;
    el.classList.add('kp-bildirim-giris');
    var bitir = function () {
      el.classList.remove('kp-bildirim-giris');
      el.classList.add('kp-bildirim-cikis');
      self.bildirimZamanlayici = setTimeout(function () {
        el.hidden = true;
        el.innerHTML = '';
        el.classList.remove('kp-bildirim-cikis');
        self.yedek = null;
        self.sepetYedek = null;
      }, 200);
    };
    var zamanla = function () {
      clearTimeout(self.bildirimZamanlayici);
      self.bildirimZamanlayici = setTimeout(bitir, sure);
    };
    if (!el.kpDinleyici) {
      el.kpDinleyici = true;
      var dur = function () { if (!el.classList.contains('kp-bildirim-cikis')) clearTimeout(self.bildirimZamanlayici); };
      var devam = function () { if (!el.hidden && !el.classList.contains('kp-bildirim-cikis') && el.kpZamanla) el.kpZamanla(); };
      el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') dur(); });
      el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') devam(); });
      el.addEventListener('pointerdown', dur);
      el.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') devam(); });
      el.addEventListener('pointercancel', devam);
    }
    el.kpZamanla = zamanla;
    zamanla();
  };

  KisiselKart.prototype.tasarimSil = function () {
    if (bosMu(this.tasarim)) return;
    this.yedek = kopyala(this.tasarim);
    this.tasarim = null;
    this.notGoster('');
    this.modDegistir('sade');
    this.bildirimGoster('<span>Tasarım silindi</span> · <button type="button" class="kisisel-kart__geri-al" data-kisisel-geri-al>Geri al</button>', 6000);
    olayYayinla('tasarim_silindi', { urun_id: this.model.urun.id });
  };

  KisiselKart.prototype.geriAl = function () {
    var self = this;
    if (this.sepetYedek) {
      var y = this.sepetYedek;
      this.sepetYedek = null;
      clearTimeout(this.bildirimZamanlayici);
      var b = this.querySelector('[data-kisisel-bildirim]');
      b.hidden = true;
      b.innerHTML = '';
      return this.grupEkle(y.kalemler, y.id)
        .then(function () { return self.sepetOku(); })
        .then(function () { self.cekmeceYenile(false); })
        .catch(function () { self.notGoster('Tasarım sepete geri eklenemedi, tekrar dene.'); });
    }
    if (!this.yedek) return;
    this.tasarim = this.yedek;
    this.taslakBilgi = { zaman: Date.now(), arac: this.yedekBilgi && this.yedekBilgi.arac, yakin: !(this.yedekBilgi && this.yedekBilgi.yakin === false) };
    this.yedek = null;
    this.yedekBilgi = null;
    clearTimeout(this.bildirimZamanlayici);
    var el = this.querySelector('[data-kisisel-bildirim]');
    el.hidden = true;
    el.innerHTML = '';
    this.modDegistir('kisisel');
  };

  // Sepete eklendikten sonra: kayıt temizlenir, kart kısa süre "Tasarımın sepete eklendi" der, sonra davet haline döner
  KisiselKart.prototype.sepeteEklendi = function () {
    this.tasarim = null;
    this.yedek = null;
    this.modDegistir('sade');
    this.sepetOku();
  };

  KisiselKart.prototype.tasarimKaydet = function (t, bilgi) {
    this.tasarim = bosMu(t) ? null : kopyala(t);
    this.taslakBilgi = this.tasarim ? { zaman: Date.now(), arac: bilgi && bilgi.arac, yakin: !(bilgi && bilgi.yakin === false) } : null;
    this.modDegistir(this.tasarim ? 'kisisel' : 'sade');
  };

  // Editörde "Kaydetmeden çık": taslak silinir; "Geri al" son hali taslak olarak geri getirir
  KisiselKart.prototype.taslakSil = function (yedek, bilgi) {
    this.yedek = bosMu(yedek) ? null : yedek;
    this.yedekBilgi = bilgi || null;
    this.tasarim = null;
    this.taslakBilgi = null;
    this.notGoster('');
    this.modDegistir('sade');
    if (this.yedek) this.bildirimGoster('<span>Tasarım silindi</span> · <button type="button" class="kisisel-kart__geri-al" data-kisisel-geri-al>Geri al</button>');
  };

  // "Taslak · bugün 14:32"
  function taslakZamani(zaman) {
    if (!zaman) return 'Taslak';
    var d = new Date(zaman);
    var simdi = new Date();
    var saat = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var gun = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var fark = Math.round((gun(simdi) - gun(d)) / 86400000);
    var tarih = fark === 0 ? 'bugün' : fark === 1 ? 'dün' : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    return 'Taslak · ' + tarih + ' ' + saat;
  }

  KisiselKart.prototype.guncelle = function () {
    var m = this.model;
    var t = this.tasarim;
    var f = null;
    if (!bosMu(t)) {
      f = fiyatHesapla(m, this.yer, t);
      this.querySelector('[data-kisisel-icerik]').textContent = tasarimIcerigi(m, this.yer, t);
      var adet = f.harfAdet + f.rakamAdet + f.ikonAdet;
      var kb = this.kombin && t.kombin;
      var ks = kb && this.kombin.sweatVaryanti(kb.v);
      var kt = kb && kombinTisortu(this.kombin, t);
      this.querySelector('[data-kisisel-adet]').textContent = adet + ' patch' + (kb ? ' · ' + renkAdi(m.urun.baslik) + (ks ? ' · ' + ks.varyant.yas + ' yaş' : '') : '') +
        (kt ? ' · Hediye Tshirt: ' + kt.urun.renk + ' ' + kt.varyant.yas : '');
      var taslakEl = this.querySelector('[data-kisisel-taslak]');
      if (taslakEl) taslakEl.textContent = taslakZamani(this.taslakBilgi && this.taslakBilgi.zaman);
      this.kartToplamCiz(f);
      this.kartKampanyaGuncelle();
    }
    this.butonlariGuncelle(f);
    this.galeriGuncelle();
    this.miniGuncelle();
  };

  // Kartın tutarı: liste fiyatı × adet; kampanya simülasyonu bu tasarım için sonuçlandıysa indirimli
  KisiselKart.prototype.kartTutar = function (f) {
    var adet = this.adet();
    var liste = f.toplam * adet;
    var k = this.kartKampanya && this.kartKampanya.anahtar === this.kartKampanyaAnahtari ? this.kartKampanya.sonuc : null;
    var indirim = tasarimIndirimi(k);
    return { liste: liste, odenecek: liste - indirim, indirim: indirim };
  };

  KisiselKart.prototype.kartToplamCiz = function (f) {
    var tutar = this.kartTutar(f);
    var el = this.querySelector('[data-kisisel-toplam]');
    var eski = tutar.indirim ? tutar.liste : 0;
    var yeni = tutar.odenecek;
    // Kombin: fiyata dahil patch sayısı dolana kadar taban fiyat (üstü çizili + Tshirt), sonrası toplam + Tshirt
    if (this.kombin) {
      var kg = this.kombinGosterim(f);
      eski = kg.eski;
      yeni = kg.yeni;
    }
    var html = 'Toplam ' + (eski ? '<s class="kisisel-kart__eski">' + paraBicimle(eski) + '</s> ' : '') + paraBicimle(yeni);
    if (el.innerHTML !== html) el.innerHTML = html;
  };

  // Kartın kampanyalı fiyatı: editördeki simülasyonun aynısı (müşterinin sepeti + bu tasarım), birleştirilmiş ve önbellekli
  KisiselKart.prototype.kartKampanyaGuncelle = function () {
    if (bosMu(this.tasarim)) return;
    var self = this;
    var satirlar = simSatirlari(this.sepetKalemleri(this.adet(), this.tasarim).kalemler, !!this.kombin);
    var anahtar = JSON.stringify([satirlar, kampanyaSurumu]);
    if (anahtar === this.kartKampanyaAnahtari) return;
    this.kartKampanyaAnahtari = anahtar;
    var anlik = kampanyaAnlik(this.model, satirlar, null, []);
    if (anlik) {
      this.kartKampanya = { anahtar: anahtar, sonuc: anlik };
      var f0 = fiyatHesapla(this.model, this.yer, this.tasarim);
      this.kartToplamCiz(f0);
      this.butonlariGuncelle(f0);
      if (!anlik.yerel) return;
    }
    clearTimeout(this.kartKampanyaZamanlayici);
    this.kartKampanyaZamanlayici = setTimeout(function () {
      var bitti = function (sonuc) {
        if (anahtar !== self.kartKampanyaAnahtari) return;
        if (sonuc.hata && self.kartKampanya && self.kartKampanya.anahtar === anahtar && !self.kartKampanya.sonuc.hata) return;
        self.kartKampanya = { anahtar: anahtar, sonuc: sonuc };
        if (bosMu(self.tasarim)) return;
        var f = fiyatHesapla(self.model, self.yer, self.tasarim);
        self.kartToplamCiz(f);
        self.butonlariGuncelle(f);
      };
      kampanyaHesapla(satirlar, null, [], self.model).then(bitti, function () { bitti({ hata: true }); });
    }, 300);
  };

  // Tasarımlı kartta küçük önizleme: takılabilir alana yakın görünüm
  KisiselKart.prototype.miniGuncelle = function () {
    var kutuEl = this.querySelector('[data-kisisel-mini]');
    if (!kutuEl || bosMu(this.tasarim)) return;
    var m = this.model;
    if (!this.miniSahne) this.miniSahne = miniSahneKur(kutuEl, m, this.yer);
    var d = duzenle(m, this.yer, kopyala(this.tasarim));
    this.miniSahne.ciz(d.parcalar, {}, false);
  };

  KisiselKart.prototype.gonderButonlari = function () {
    return [
      document.getElementById('ProductSubmitButton-' + this.bolum),
      document.getElementById('StickyProductSubmitButton-' + this.bolum)
    ].filter(Boolean);
  };

  // Butonlar: temanın "Sepete ekle"si (ana ve sabit çubuk) "Sadece çantayı sepete ekle" olur, davranışı aynı kalır
  // (kod yüklenmezse temanın kendi yazısı durur). Kırmızı buton "Tasarımımı sepete ekle · toplam"; sığmazsa tutarsız.
  KisiselKart.prototype.butonlariGuncelle = function (f) {
    if (!bosMu(this.tasarim)) {
      if (!f) f = fiyatHesapla(this.model, this.yer, this.tasarim);
      var kirmizi = this.querySelector('[data-kisisel-sepete-ekle]');
      var yazi = kirmizi.querySelector('[data-kisisel-sepete-yazi]');
      var dugmeAdi = this.kombin ? 'Kombinimi sepete ekle' : 'Tasarımımı sepete ekle';
      yazi.textContent = dugmeAdi + ' · ' + paraBicimle(this.kombin ? this.kombinGosterim(f).yeni : this.kartTutar(f).odenecek);
      if (kirmizi.offsetWidth && (yazi.scrollWidth > kirmizi.clientWidth || kirmizi.scrollWidth > kirmizi.clientWidth + 1)) {
        yazi.textContent = dugmeAdi;
      }
    }
    this.gonderButonlari().forEach(function (b) {
      var yazi = b.querySelector('span');
      // Tükendi gibi tema durumlarında temanın yazısına dokunulmaz
      if (!yazi || b.disabled) return;
      if (yazi.textContent.trim() !== 'Sadece çantayı sepete ekle') yazi.textContent = 'Sadece çantayı sepete ekle';
    });
  };

  // Galerideki tasarım: kayıtlı tasarım; yoksa sepetteki en son eklenen ya da düzenlenen tasarım
  // (Shopify yeni satırları sepetin başına ekler; düzenleme de yeni grup ekleyip eskisini kaldırır)
  KisiselKart.prototype.galeriParcalari = function () {
    if (!bosMu(this.tasarim)) return duzenle(this.model, this.yer, kopyala(this.tasarim)).parcalar;
    var g = (this.sepettekiler || [])[0];
    if (!g) return null;
    var t = this.gruptanTasarim(g);
    var p = t ? this.yer.parcalar(t) : [];
    return p.length ? p : null;
  };

  // Galeri: temanın galerisine slayt eklenmez; ilk slaytın ve ilk küçük resmin üstüne katman konur.
  // Tasarım yoksa katmanlar kaldırılır, galeri temanın kendi görselleriyle kalır.
  KisiselKart.prototype.galeriGuncelle = function () {
    try {
      this.galeriCiz();
    } catch (e) {
      if (window.console) console.warn('[kisisel] galeri:', e);
    }
  };

  KisiselKart.prototype.galeriCiz = function () {
    var self = this;
    var kok = document.getElementById('MainProduct-' + this.bolum) || document;
    var ilk = kok.querySelector('.main-carousel .splide__slide');
    var kucuk = kok.querySelector('.thumbnail-carousel .splide__slide');
    var parcalar = this.galeriParcalari();
    [
      [ilk, 'kp-galeri', '<span class="kp-galeri__rozet">Senin tasarımın</span>'],
      [kucuk && (kucuk.querySelector('.thumbnail') || kucuk), 'kp-galeri-kucuk', '<span class="kp-galeri-kucuk__serit">Tasarımın</span>']
    ].forEach(function (x) {
      var yer = x[0];
      if (!yer) return;
      var katman = null;
      for (var i = 0; i < yer.children.length; i++) if (yer.children[i].classList.contains(x[1])) katman = yer.children[i];
      if (!parcalar) {
        if (katman) katman.remove();
        return;
      }
      if (!katman) {
        katman = document.createElement('div');
        katman.className = x[1];
        katman.setAttribute('aria-hidden', 'true');
        katman.innerHTML = '<div class="kp-galeri__sahne"></div>' + x[2];
        yer.appendChild(katman);
        katman._kpSahne = new Sahne(self.model, self.yer, katman.querySelector('.kp-galeri__sahne'), { etkilesimli: false });
      }
      katman._kpSahne.ciz(parcalar, {}, false);
    });
    // Sayfa tasarım görseliyle açılsın (bir kez; müşteri sonra galeride gezinebilir)
    if (parcalar && ilk && !this._galeriAcildi) {
      this._galeriAcildi = true;
      var galeri = kok.querySelector('gallery-carousel') || document.querySelector('gallery-carousel');
      if (galeri && galeri.main && typeof galeri.main.go === 'function' && galeri.main.index !== 0) galeri.main.go(0);
    }
  };

  /* ---------------- Sepete ekleme ---------------- */

  KisiselKart.prototype.adet = function () {
    var girdi = document.querySelector('input[name="quantity"][form="' + this.formId + '"]') ||
      document.querySelector('#Quantity-' + this.bolum);
    var n = girdi ? parseInt(girdi.value, 10) : 1;
    return n > 0 ? n : 1;
  };

  KisiselKart.prototype.hataGoster = function (mesaj) {
    var kutu = this.querySelector('[data-kisisel-hata]');
    if (!kutu) {
      kutu = document.createElement('p');
      kutu.className = 'kp-uyari kp-uyari--hata';
      kutu.setAttribute('role', 'alert');
      kutu.setAttribute('data-kisisel-hata', '');
      this.querySelector('[data-kisisel-govde]').appendChild(kutu);
    }
    kutu.hidden = !mesaj;
    kutu.textContent = mesaj || '';
  };

  KisiselKart.prototype.yukleniyor = function (acik) {
    var b = this.querySelector('[data-kisisel-sepete-ekle]');
    b.classList.toggle('kisisel-kart__sepete--yukleniyor', acik);
    b.setAttribute('aria-disabled', acik ? 'true' : 'false');
    this._yukleniyor = acik;
  };

  // Bir tasarımın (çanta ya da aksesuar üzeri) patch satırları: aynı varyantlar birleşir, yazı karakterlerinde sıra yazılır.
  // Bozulmamış setin patch'leri tek tek değil, set ürünü olarak eklenir. ek: her satıra eklenecek özellikler.
  function patchKalemleri(m, d, t, adet, ortak) {
    var gruplar = {};
    var sira = [];
    var saglam = saglamSetler(m, t);
    var setIdleri = saglam.map(function (k) { return k.id; });
    d.parcalar.forEach(function (p) {
      if (!p.varyant || p.tip === 'aksesuar' || (p.setGrup && setIdleri.indexOf(p.setGrup) !== -1)) return;
      // Kenardaki (çantaya takılmamış) patch'ler ayrı satırda, "Durum: Takılmamış"
      var anahtar = String(p.varyant.id) + (p.kenar ? ':kenar' : '');
      if (!gruplar[anahtar]) {
        gruplar[anahtar] = { varyant: p.varyant, tip: p.tip, adet: 0, siralar: [], kenar: !!p.kenar };
        sira.push(anahtar);
      }
      gruplar[anahtar].adet++;
      // Yazıdaki harf ve rakamların yazıdaki sırası (paketlemede hangi karakterin nereye geldiği)
      if (yazidaMi(p)) gruplar[anahtar].siralar.push(p.sira + 1);
    });
    var kalemler = [];
    function ozellikler(ek) {
      var o = {};
      var a;
      for (a in ortak) o[a] = ortak[a];
      for (a in ek) o[a] = ek[a];
      return o;
    }
    sira.forEach(function (a) {
      var g = gruplar[a];
      var ek = {};
      if (g.siralar.length) ek['Harf sırası'] = g.siralar.join(', ');
      if (g.kenar) ek['Durum'] = 'Takılmamış';
      ek._tasarim_rol = 'patch';
      ek._adet_birim = String(g.adet);
      kalemler.push({ id: g.varyant.id, quantity: g.adet * adet, properties: ozellikler(ek) });
    });
    saglam.forEach(function (k) {
      var tanim = m.hazirSetHarita[k.urunId];
      var setOzellik = { _tasarim_rol: 'patch', _adet_birim: '1', _patch_sayisi: String(tanim.patchler.length) };
      var kenarda = d.parcalar.filter(function (p) { return p.setGrup === k.id && p.kenar; }).length;
      if (kenarda) setOzellik['Durum'] = kenarda === tanim.patchler.length ? 'Takılmamış' : kenarda + ' patch takılmamış';
      kalemler.push({ id: tanim.varyant, quantity: adet, properties: ozellikler(setOzellik) });
    });
    return kalemler;
  }

  KisiselKart.prototype.sepetKalemleri = function (adet, tasarim) {
    var m = this.model;
    // Kenarda kalan (Özet'te eklenmeyen) patch'ler sepete girmez
    var t = kopyala(satinAlinacak(m, tasarim || this.tasarim));
    var d = duzenle(m, this.yer, t);
    var kimlik = tasarimKimligi();
    var ozet = tasarimOzeti(m, t);
    var konum = tasarimKonumu(m, d.parcalar, t);
    var bazOzellik = { 'Tasarım': ozet };
    if (t.isim) bazOzellik['İsim'] = t.isim;
    bazOzellik._tasarim_id = kimlik;
    bazOzellik._tasarim_rol = 'baz';
    bazOzellik._tasarim_konum = JSON.stringify(konum);
    var kombin = this.kombin;
    var ortak = { 'Tasarım': ozet, _tasarim_id: kimlik };
    if (kombin) {
      bazOzellik._kombin = kimlik;
      ortak._kombin = kimlik;
    }
    var kalemler = [{ id: (kombin && t.kombin && t.kombin.v) || m.urun.varyant, quantity: adet, properties: bazOzellik }];
    kalemler = kalemler.concat(patchKalemleri(m, d, t, adet, ortak));
    // Aksesuarlar: çanta tasarım grubunun içinde alt grup (aksesuar satırı + üzerindeki patch'ler)
    var parcalar = d.parcalar.slice();
    (t.aksesuarlar || []).forEach(function (a) {
      var aks = m.aksesuarHarita[a.urunId];
      if (!aks) return;
      var ozellik = { 'Tasarım': ozet, _tasarim_id: kimlik, _tasarim_rol: 'aksesuar', _aksesuar_id: a.uid, _adet_birim: '1' };
      if (a.kenar) ozellik['Durum'] = 'Takılmamış';
      var am = a.tasarim && !bosMu(a.tasarim) && m.aksesuarModeli(aks.id);
      if (am) {
        var icT = a.tasarim;
        var icD = duzenle(am.m, am.yer, icT);
        var icOzet = tasarimOzeti(am.m, icT);
        ozellik['Aksesuar tasarımı'] = icOzet;
        ozellik._aksesuar_konum = JSON.stringify(tasarimKonumu(am.m, icD.parcalar, icT));
        kalemler.push({ id: aks.varyant, quantity: adet, properties: ozellik });
        kalemler = kalemler.concat(patchKalemleri(am.m, icD, icT, adet, { 'Tasarım': ozet, 'Aksesuar': aks.ad, _tasarim_id: kimlik, _aksesuar_id: a.uid }));
      } else {
        kalemler.push({ id: aks.varyant, quantity: adet, properties: ozellik });
      }
    });
    // Kombin: hediye Tshirt aynı grupta, ayrı rolle (kampanya simülasyonuna girmez)
    var tisort = kombin && kombinTisortu(kombin, t);
    if (tisort) {
      kalemler.push({ id: tisort.varyant.id, quantity: adet, properties: { 'Kombin': 'Hediye Tshirt', _tasarim_id: kimlik, _tasarim_rol: 'hediye', _kombin: kimlik, _adet_birim: '1' } });
    }
    return { kimlik: kimlik, kalemler: kalemler, fiyat: fiyatHesapla(m, this.yer, t), hatalar: d.hatalar, tasarim: t, parcalar: parcalar };
  };

  KisiselKart.prototype.sepeteEkle = function () {
    var self = this;
    if (this._yukleniyor) return;
    var m = this.model;
    var adet = this.adet();
    var paket = this.sepetKalemleri(adet);
    var kombinEksik = this.kombin && this.kombinEksigi(paket);
    if (kombinEksik) {
      this.hataGoster(kombinEksik.metin);
      this.editor.ac(kombinEksik.adim);
      return;
    }
    if (Object.keys(paket.hatalar).length) {
      this.hataGoster('Tasarımında alana sığmayan bir parça var. Lütfen tasarımı düzenle.');
      this.editor.ac();
      return;
    }
    var stok = stokKontrol(m, paket.tasarim, this.yer, adet);
    if (stok.length) {
      var s = stok[0];
      this.hataGoster(
        (s.parca.tip === 'letter' ? s.parca.etiket + ' harfi' : s.parca.tip === 'number' ? s.parca.etiket + ' rakamı' : s.parca.etiket) +
        ' için stok yetersiz (' + s.mevcut + ' adet var, ' + s.gereken + ' gerekiyor).'
      );
      return;
    }
    this.hataGoster('');
    this.yukleniyor(true);

    var rotalar = window.routes || {};
    var ekleUrl = (rotalar.cart_add_url || '/cart/add') + '.js';
    var cizim = document.querySelector('cart-drawer');
    var govde = { items: paket.kalemler };
    if (cizim) {
      govde.sections = ['cart-drawer', 'cart-icon-bubble'];
      govde.sections_url = window.location.pathname;
    }
    // Ödenecek tutar (kampanya indirimi düşülmüş), istekten önce: sepet değişince kart yeniden hesaplanır
    var odenecek = this.kartTutar(paket.fiyat).odenecek;
    // Gerçek ekleme izlenmeyen yoldan (gizli iframe'in fetch'i): Web Pixels Manager satır başına "ürün sepete eklendi"
    // yayınlamaz, Meta'ya ve GA4'e tasarım başına tek olay sepetOlcumu'ndan gider. Yol kurulamazsa sayfanın fetch'i
    // kullanılır; o zaman uygulamalar satır başına olay gönderir, burada ayrıca olay gönderilmez (çift sayılmasın).
    var izsiz = izsizFetch();
    var gonder = izsiz || window.fetch.bind(window);

    gonder(window.location.origin + ekleUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(govde)
    })
      .then(function (r) {
        return r.json().then(function (j) {
          return { ok: r.ok, veri: j };
        });
      })
      .then(function (sonuc) {
        if (!sonuc.ok || sonuc.veri.status) {
          var mesaj = (sonuc.veri && (sonuc.veri.description || sonuc.veri.message)) || 'Sepete eklenemedi.';
          return self.yarimKalanlariTemizle(paket.kimlik).then(function () {
            throw new Error(mesaj);
          });
        }
        olayYayinla('tasarimla_sepete_eklendi', {
          urun_id: m.urun.id,
          tasarim_id: paket.kimlik,
          adet: adet,
          toplam: odenecek / 100,
          liste: (paket.fiyat.toplam * adet) / 100,
          para_birimi: paraBirimi()
        });
        if (izsiz) sepetOlcumu(m, paket.kalemler, paket.kimlik, odenecek);
        else olcumKaydi({ kanal: 'Meta', ad: 'AddToCart', not: 'izlenmeyen yol kurulamadı: satır başına uygulama olayları' });
        try {
          if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'kisisel-editor', productVariantId: m.urun.varyant, cartData: sonuc.veri });
          }
        } catch (e) {
          /* yoksay */
        }
        cizimKitiKaydet(paket.kimlik, m, paket.parcalar);
        self.sepeteEklendi();
        // Kombin: test kodu sepete yazılır; çekmece kodlu sepetle çizilir (kod yoksa eklemenin yanıtıyla)
        return self.kombinKoduYaz(!!cizim).then(function (kodlu) {
          var bolumler = (kodlu && kodlu.sections) || sonuc.veri.sections;
          if (cizim && bolumler && bolumler['cart-drawer'] && typeof cizim.renderContents === 'function') {
            cizim.renderContents({ id: m.urun.varyant, sections: bolumler });
            // Temanın product-form.js'i gibi: boş sepet işaretini kaldır (yoksa çekmecenin odak tutması hata verir)
            cizim.classList.remove('is-empty');
          } else {
            window.location.href = rotalar.cart_url || '/cart';
          }
        });
      })
      .catch(function (err) {
        self.hataGoster(err.message || 'Sepete eklenemedi. Lütfen tekrar dene.');
      })
      .then(function () {
        self.yukleniyor(false);
      });
  };

  // Hata durumunda sepete kısmen eklenmiş kalemleri geri alır
  KisiselKart.prototype.yarimKalanlariTemizle = function (kimlik) {
    var rotalar = window.routes || {};
    return fetch((rotalar.cart_url || '/cart') + '.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (sepet) {
        var guncelle = {};
        (sepet.items || []).forEach(function (k) {
          if (k.properties && k.properties._tasarim_id === kimlik) guncelle[k.key] = 0;
        });
        if (!Object.keys(guncelle).length) return;
        return fetch((rotalar.cart_update_url || '/cart/update') + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ updates: guncelle })
        });
      })
      .catch(function () {});
  };

  // Betik async yüklenir: kart (ve içindeki düğmeler) ayrıştırılmadan tanımlanırsa yarım kartla başlar. Kartın hemen
  // arkasındaki işaret (kisisel-kart.liquid: data-kisisel-kart-son) görülünce ya da sayfa ayrıştırılınca tanımlanır.
  function kartiTanimla() {
    if (!customElements.get('kisisel-kart')) customElements.define('kisisel-kart', KisiselKart);
  }
  if (typeof document === 'undefined' || document.readyState !== 'loading' || document.querySelector('[data-kisisel-kart-son]')) kartiTanimla();
  else {
    document.addEventListener('kisisel:kart-son', kartiTanimla, { once: true });
    document.addEventListener('DOMContentLoaded', kartiTanimla, { once: true });
  }

  // Test ve hata ayıklama için iç fonksiyonlar
  // Ana sayfa "Çok satanlar" kartları: ürünün önizleme görseli üzerine örnek isim (Cool Alfabe). Sırayla denenir; tüm
  // harfleri stokta olan, ürünün alanına ve karakter sınırına sığan, kullanilan'da olmayan ilk isim seçilir.
  // Dönüş: { isim, parcalar: [{ src, x, y, w, h, aci }] } (görselin genişlik / yüksekliğine göre %) ya da null
  function ornekTasarim(ham, isimler, kullanilan) {
    var m = new Model(ham);
    var yer = new Yerlesim(m);
    var set = m.setler.filter(function (s) { return s.set === 'cool'; })[0] || m.setler[0];
    if (!set) return null;
    for (var i = 0; i < isimler.length; i++) {
      var isim = buyukHarf(String(isimler[i] || ''));
      // Tek patch'lik üründe örnek ismin baş harfi
      if (m.tekPatch) isim = Array.from(isim)[0] || '';
      if (!isim || (kullanilan && kullanilan.indexOf(isim) !== -1)) continue;
      var t = { setId: set.id, isim: isim, isimMerkez: null, parcalar: [] };
      var a = isimAnaliz(m, yer, t);
      if (!a.sigiyor || a.eksikler.length || a.yoklar.length || a.stokSorunlari.length) continue;
      var d = duzenle(m, yer, t);
      var parcalar = d.parcalar.filter(function (p) { return !p.kenar; });
      if (Object.keys(d.hatalar || {}).length || parcalar.length !== Array.from(isim).length) continue;
      if (parcalar.some(function (p) { return !(p.varyant && p.varyant.gorsel); })) continue;
      return {
        isim: isim,
        parcalar: parcalar.map(function (p) {
          var st = parcaStili(m, p);
          return { src: p.varyant.gorsel, x: parseFloat(st.left), y: parseFloat(st.top), w: parseFloat(st.width), h: parseFloat(st.height), aci: p.aci || 0 };
        })
      };
    }
    return null;
  }

  window.KisiselEditorIc = {
    ornekTasarim: ornekTasarim,
    Model: Model,
    satinAlinacak: satinAlinacak,
    karakterSeti: karakterSeti,
    karakterleriHizala: karakterleriHizala,
    karakterSil: karakterSil,
    stilAdi: stilAdi,
    tasarimiTemizle: tasarimiTemizle,
    setleriTemizle: setleriTemizle,
    saglamSetler: saglamSetler,
    Yerlesim: Yerlesim,
    isimAnaliz: isimAnaliz,
    duzenle: duzenle,
    harfleriAyir: harfleriAyir,
    harfleriBirlestir: harfleriBirlestir,
    fiyatHesapla: fiyatHesapla,
    tasarimOzeti: tasarimOzeti,
    taslakZamani: taslakZamani,
    turkceCevir: turkceCevir,
    yazilanIsim: yazilanIsim,
    ceviriNotu: ceviriNotu,
    paraBicimle: paraBicimle,
    buyukHarf: buyukHarf,
    renkleriAta: renkleriAta,
    konumParcalari: konumParcalari,
    konumdanTasarim: konumdanTasarim,
    tasarimIcerigi: tasarimIcerigi,
    benzerRenk: benzerRenk,
    harfVaryanti: harfVaryanti,
    stokKontrol: stokKontrol,
    grupDondur: grupDondur,
    tasarimKonumu: tasarimKonumu,
    aciYakala: aciYakala,
    kampanya: { seritDurumu: seritDurumu, yonelme: yonelme, kazancMetni: kazancMetni, kampanyaKisaAd: kampanyaKisaAd, kampanyaGosterimAdi: kampanyaGosterimAdi, yerelIndirimler: yerelIndirimler, tasarimPayiSepetten: tasarimPayiSepetten, tasarimIndirimi: tasarimIndirimi },
    kenar: { kenaraAl: kenaraAl, kenardanAl: kenardanAl },
    parcaSekli: parcaSekli,
    geometri: { icinde: icinde, cakisir: cakisir, noktaIcinde: noktaIcinde, donukDikdortgen: donukDikdortgen, kutu: kutu, merkez: merkez, yuvarlakKoseli: yuvarlakKoseli, konturHazirla: konturHazirla, konturluSekil: konturluSekil, sikiKutu: sikiKutu, kaydir: kaydir, cokgenAlan: cokgenAlan, disbukeyZarf: disbukeyZarf }
  };
})();
