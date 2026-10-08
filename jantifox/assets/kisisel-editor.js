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

  // Oturumda ilk kez mi? (sessionStorage; erişilemezse sayfa ömrü boyunca bellekte)
  var ilkKezBellek = {};
  function ilkKezMi(anahtar) {
    try {
      if (window.sessionStorage.getItem(anahtar)) return false;
      window.sessionStorage.setItem(anahtar, '1');
      return true;
    } catch (e) {
      if (ilkKezBellek[anahtar]) return false;
      ilkKezBellek[anahtar] = true;
      return true;
    }
  }

  function olayYayinla(ad, veri) {
    try {
      if (window.Shopify && Shopify.analytics && typeof Shopify.analytics.publish === 'function') {
        Shopify.analytics.publish(ad, veri || {});
      }
    } catch (e) {
      /* ölçüm hatası akışı bozmasın */
    }
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
    return [s.cx, s.cy];
  }

  function kutu(s) {
    if (s.t === 'rect') return { x: s.x, y: s.y, w: s.w, h: s.h };
    if (s.t === 'obb') {
      var k = koseler(s);
      var xs = k.map(function (p) { return p[0]; });
      var ys = k.map(function (p) { return p[1]; });
      var x1 = Math.min.apply(null, xs);
      var y1 = Math.min.apply(null, ys);
      return { x: x1, y: y1, w: Math.max.apply(null, xs) - x1, h: Math.max.apply(null, ys) - y1 };
    }
    if (s.t === 'circle') return { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 };
    return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 };
  }

  // m > 0: şekli içeri daraltır, m < 0: dışarı genişletir
  function noktaIcinde(px, py, s, m) {
    m = m || 0;
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
    if (s.t === 'rect') return { t: 'rect', x: s.x + dx, y: s.y + dy, w: s.w, h: s.h };
    var k = {};
    for (var a in s) k[a] = s[a];
    k.cx += dx;
    k.cy += dy;
    return k;
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

    var ayar = ham.ayarlar || {};
    this.ayar = {
      harfEn: sayi(ayar.varsayilan_harf_genislik_cm) || 5.5,
      bosluk: ayar.patch_arasi_bosluk_cm != null ? Number(ayar.patch_arasi_bosluk_cm) : 0.3,
      satirBosluk: ayar.satir_arasi_bosluk_cm != null ? Number(ayar.satir_arasi_bosluk_cm) : 0.5,
      kenar: ayar.kenar_payi_cm != null ? Number(ayar.kenar_payi_cm) : 0.3,
      satir: Math.max(1, parseInt(ayar.en_fazla_satir, 10) || 2)
    };

    var harita = ham.harita;
    if (!harita || !harita.zones || !harita.zones.length) {
      throw new Error('Kişiselleştirme haritası eksik');
    }
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
      return {
        id: z.id || 'alan-' + i,
        ad: z.ad || '',
        sekil: sekle(z),
        tipler: z.allowed_types && z.allowed_types.length ? z.allowed_types : ['letter', 'number', 'icon']
      };
    });
    this.yasaklar = (harita.forbidden || []).map(function (z) {
      return sekle(z);
    });

    // Ölçü önceliği: kırpılmış PNG'den hesaplanan ölçü (png_en/png_boy) > kayıtlı ölçü > varsayılan
    function patchHazirla(p, varsayilanEn) {
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
          png: !!(v.png || (!v.gorsel && p.png))
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
          tasarlanabilir: !!(h.zones && h.zones.length)
        };
      })
      .filter(function (a) { return a && (a.stok == null || a.stok > 0); });
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
      return set ? varyantOlcu(set, harfVaryanti(set, t, i, h)) : { en: m.ayar.harfEn, boy: 6 };
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
        sonuc.push({ cx: x + o.en / 2, cy: orta, en: o.en, boy: o.boy });
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
    var m = this.m;
    tip = alanTipi(tip);
    var uygunAlan = false;
    for (var i = 0; i < m.alanlar.length; i++) {
      var alan = m.alanlar[i];
      if (alan.tipler.indexOf(tip) !== -1 && icinde(sekil, alan.sekil, m.ayar.kenar)) {
        uygunAlan = true;
        break;
      }
    }
    if (!uygunAlan) return false;
    for (var j = 0; j < m.yasaklar.length; j++) if (cakisir(sekil, m.yasaklar[j], 0)) return false;
    return true;
  };

  // Blok isim harfleri: dizilim blok merkezi etrafında açı kadar döndürülür
  function isimHarfleri(dizi, merkezNokta, aci) {
    return dizi.map(function (p) {
      var k = dondurNokta([p.cx, p.cy], merkezNokta, aci);
      return { cx: k[0], cy: k[1], en: p.en, boy: p.boy, aci: aci, sekil: donukDikdortgen(k[0], k[1], p.en, p.boy, aci) };
    });
  }

  // İsim, alana tek başına (diğer patch'ler olmadan) kaç satırda sığıyor? 0 = sığmıyor
  // olculer: harflerin gerçek ölçüleri [{en, boy}], aci: blok ismin açısı
  Yerlesim.prototype.isimSatiriOlcu = function (olculer, aci) {
    return this.isimYeri(olculer, aci).satir;
  };

  // İsmin varsayılan yeri: önce alanın ortası. Ortada sığmıyorsa ve alanda yasaklı bölge varsa
  // (ör. kalem kutusunun logosu) ortaya en yakın, ismin tamamının sığdığı merkez aranır (0,5 cm adım).
  // Tek satır iki satıra tercih edilir. Sonuç: { satir (0 = sığmıyor), merkez }
  Yerlesim.prototype.isimYeri = function (olculer, aci) {
    var adet = olculer.length;
    var alan = this.m.alanBul('letter');
    var c0 = alan ? merkez(alan.sekil) : [this.m.Wcm / 2, this.m.Hcm / 2];
    if (!alan || adet === 0) return { satir: adet === 0 ? 1 : 0, merkez: c0 };
    aci = aciNormal(aci);
    var anahtar = JSON.stringify([olculer, aci]);
    this._isimYeri = this._isimYeri || {};
    if (this._isimYeri[anahtar]) return this._isimYeri[anahtar];
    var self = this;
    var sigar = function (c, satir) {
      return isimHarfleri(self.isimDiz(olculer, c[0], c[1], satir), c, aci).every(function (p) {
        return self.alanaUygun(p.sekil, 'letter');
      });
    };
    var satirlar = [];
    for (var satir = 1; satir <= Math.min(this.m.ayar.satir, 2); satir++) if (satir === 1 || adet >= 2) satirlar.push(satir);
    var sonuc = null;
    satirlar.some(function (n) { if (sigar(c0, n)) sonuc = { satir: n, merkez: c0 }; return !!sonuc; });
    if (!sonuc && this.m.yasaklar.length) {
      var k = kutu(alan.sekil);
      var adaylar = [];
      for (var x = k.x; x <= k.x + k.w + EPS; x += 0.5) {
        for (var y = k.y; y <= k.y + k.h + EPS; y += 0.5) adaylar.push([x, y]);
      }
      adaylar.sort(function (a, b) {
        return Math.pow(a[0] - c0[0], 2) + Math.pow(a[1] - c0[1], 2) - (Math.pow(b[0] - c0[0], 2) + Math.pow(b[1] - c0[1], 2));
      });
      satirlar.some(function (n) {
        for (var i = 0; i < adaylar.length; i++) {
          if (sigar(adaylar[i], n)) { sonuc = { satir: n, merkez: adaylar[i] }; return true; }
        }
        return false;
      });
    }
    sonuc = sonuc || { satir: 0, merkez: c0 };
    this._isimYeri[anahtar] = sonuc;
    return sonuc;
  };

  // Temsili (ortanca) harf ölçüsüyle: kapasite göstergesi için
  Yerlesim.prototype.isimSatiri = function (adet, set, aci) {
    var olculer = [];
    for (var i = 0; i < adet; i++) olculer.push({ en: set.en, boy: set.boy });
    return this.isimSatiriOlcu(olculer, aci);
  };

  Yerlesim.prototype.kapasite = function (set, aci) {
    var enFazla = 0;
    for (var n = 1; n <= 40; n++) {
      if (this.isimSatiri(n, set, aci)) enFazla = n;
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
      var olculer = isimOlculeri(m, t);
      var ayri = !!t.harfAyri;
      var isimAci = ayri ? 0 : aciNormal(t.isimAci);
      var yer = this.isimYeri(olculer, isimAci);
      var c = t.isimMerkez || yer.merkez;
      var satir = yer.satir || Math.min(m.ayar.satir, harfler.length > 1 ? 2 : 1);
      var dizi = isimHarfleri(this.isimDiz(olculer, c[0], c[1], satir), c, isimAci);
      harfler.forEach(function (h, i) {
        var set = karakterSeti(m, t, i, h);
        var v = set ? harfVaryanti(set, t, i, h) : null;
        // Ayrı modda her harf kendi konumunda, kendi açısında ve kendi grubunda sürüklenir
        var k = ayri && t.harfKonumlari && t.harfKonumlari[i] ? t.harfKonumlari[i] : [dizi[i].cx, dizi[i].cy];
        var aci = ayri ? aciNormal(t.harfAcilari && t.harfAcilari[i]) : isimAci;
        liste.push({
          uid: (ayri ? 'harf-' : 'isim-') + i,
          grup: ayri ? 'harf-' + i : 'isim',
          sira: i,
          tip: RAKAM_DESENI.test(h) ? 'number' : 'letter',
          tanim: set,
          varyant: v,
          etiket: h,
          en: dizi[i].en,
          boy: dizi[i].boy,
          aci: aci,
          sekil: donukDikdortgen(k[0], k[1], dizi[i].en, dizi[i].boy, aci)
        });
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
    return donukDikdortgen(cx, cy, o.en, o.boy, aci);
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
        if (cakisir(p.sekil, digerleri[j].sekil, 0)) return false;
      }
    }
    return true;
  };

  // Hedef noktaya en yakın geçerli kaydırmayı arar (grup birlikte taşınır)
  Yerlesim.prototype.enYakin = function (grupParcalari, digerleri, hedefDx, hedefDy, adim) {
    adim = adim || 0.25;
    var m = this.m;
    var tip = alanTipi(grupParcalari[0].tip);
    // Arama sınırı: uygun alanların kutusu
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    m.alanlar.forEach(function (a) {
      if (a.tipler.indexOf(tip) === -1) return;
      var k = kutu(a.sekil);
      minX = Math.min(minX, k.x);
      minY = Math.min(minY, k.y);
      maxX = Math.max(maxX, k.x + k.w);
      maxY = Math.max(maxY, k.y + k.h);
    });
    if (!isFinite(minX)) return null;
    var g = { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity };
    grupParcalari.forEach(function (p) {
      var k = kutu(p.sekil);
      g.x = Math.min(g.x, k.x);
      g.y = Math.min(g.y, k.y);
      g.x2 = Math.max(g.x2, k.x + k.w);
      g.y2 = Math.max(g.y2, k.y + k.h);
    });
    var adaylar = [];
    for (var dx = minX - g.x; dx <= maxX - g.x2 + EPS; dx += adim) {
      for (var dy = minY - g.y; dy <= maxY - g.y2 + EPS; dy += adim) {
        var mx = dx - hedefDx;
        var my = dy - hedefDy;
        adaylar.push([mx * mx + my * my, dx, dy]);
      }
    }
    adaylar.sort(function (a, b) { return a[0] - b[0]; });
    for (var i = 0; i < adaylar.length; i++) {
      var ddx = adaylar[i][1];
      var ddy = adaylar[i][2];
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
    var ok = kutu(ornek);
    for (var y = k.y + ok.h / 2; y <= k.y + k.h - ok.h / 2 + EPS; y += adim) {
      for (var x = k.x + ok.w / 2; x <= k.x + k.w - ok.w / 2 + EPS; x += adim) {
        var c = merkez(ornek);
        var s = kaydir(ornek, x - c[0], y - c[1]);
        if (this.grupGecerli([{ tip: tip, sekil: s }], dolu)) return s;
      }
    }
    return null;
  };

  /* ------------------------------------------------------------------ */
  /* Tasarım durumu                                                      */
  /* ------------------------------------------------------------------ */

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
    var sonuc = { harfler: harfler, eksikler: [], yoklar: [], stokSorunlari: [], sigiyor: true, kapasite: yer.kapasite(model.set(t.setId), isimAci) };
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
      sonuc.sigiyor = yer.isimSatiriOlcu(isimOlculeri(model, t), isimAci) > 0;
    }
    sonuc.engel = sonuc.eksikler.length > 0 || sonuc.yoklar.length > 0 || sonuc.stokSorunlari.length > 0 || !sonuc.sigiyor;
    return sonuc;
  }

  // Yazının yalnızca yerleşimi ilgilendiren kopyası (blok dizilim hesabı için)
  function yaziKopyasi(t) {
    return { setId: t.setId, isim: t.isim, karakterSetleri: t.karakterSetleri, harfRenkleri: t.harfRenkleri, isimMerkez: t.isimMerkez, isimAci: t.isimAci, parcalar: [] };
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
    if (t.harfAyri) {
      // Yeni karakterlerin konumu ve açısı harfKonumlariniEsitle'de blok dizilimden atanır
      t.harfKonumlari = hizala(t.harfKonumlari, null);
      t.harfAcilari = hizala(t.harfAcilari, null);
    }
    t.isim = ye.join('');
  }

  // Tasarımın tüm parçalarını doğrular, çakışan parçaları en yakın geçerli yere taşır
  // Bir parçanın kayıtlı konumunu kaydırır (harf ya da rakam/ikon)
  function konumKaydir(t, p, dx, dy) {
    if (p.grup === 'isim') {
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
    if (!t.harfAyri) {
      t.harfKonumlari = null;
      t.harfAcilari = null;
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
    if (!adet) t.harfAyri = false;
  }

  // Tasarımın tüm parçalarını doğrular, çakışan parçaları en yakın geçerli yere taşır
  function duzenle(model, yer, t) {
    renkleriAta(model, t);
    harfKonumlariniEsitle(yer, t);
    var parcalar = yer.parcalar(t);
    var isimP = parcalar.filter(function (p) { return p.grup === 'isim'; });
    var digerleri = parcalar.filter(function (p) { return p.grup !== 'isim'; });
    var hatalar = {};

    // Blok isim: kullanıcı taşıdıysa ve hâlâ geçerliyse koru, değilse merkeze al
    if (isimP.length && t.isimMerkez && !yer.grupGecerli(isimP, [])) {
      t.isimMerkez = null;
      parcalar = yer.parcalar(t);
      isimP = parcalar.filter(function (p) { return p.grup === 'isim'; });
      digerleri = parcalar.filter(function (p) { return p.grup !== 'isim'; });
    }
    var isimGecerli = isimP.length === 0 || yer.grupGecerli(isimP, []);
    if (!isimGecerli) isimP.forEach(function (p) { hatalar[p.uid] = true; });

    // Ayrı harfler listenin başında olduğu için rakam ve ikonlardan önce yerleşir
    var yerlesmis = isimGecerli ? isimP.slice() : [];
    digerleri.forEach(function (p) {
      if (yer.grupGecerli([p], yerlesmis)) {
        yerlesmis.push(p);
        return;
      }
      var tasima = yer.enYakin([p], yerlesmis, 0, 0);
      if (tasima) {
        konumKaydir(t, p, tasima[0], tasima[1]);
        p.sekil = kaydir(p.sekil, tasima[0], tasima[1]);
        yerlesmis.push(p);
      } else {
        hatalar[p.uid] = true;
      }
    });
    var harfHatali = parcalar.some(function (p) { return yazidaMi(p) && hatalar[p.uid]; });
    return { parcalar: yer.parcalar(t), hatalar: hatalar, isimGecerli: isimGecerli && !harfHatali };
  }

  // Parça yazının (blok ya da ayrı harf) bir karakteri mi?
  function yazidaMi(p) {
    return p.grup === 'isim' || String(p.grup).indexOf('harf-') === 0;
  }

  // Yazıdan i. karakteri, ona bağlı set/renk/konum bilgileriyle birlikte çıkarır
  function karakterSil(t, i) {
    var harfler = Array.from(t.isim || '');
    harfler.splice(i, 1);
    ['karakterSetleri', 'harfRenkleri', 'harfKonumlari', 'harfAcilari'].forEach(function (k) {
      if (Array.isArray(t[k])) t[k].splice(i, 1);
    });
    t.isim = harfler.join('');
  }

  // Blok ismi ayrı harflere böler: her harf bulunduğu yerde kalır
  function harfleriAyir(yer, t) {
    if (!t.isim || t.harfAyri) return;
    var blok = yer.parcalar(t).filter(function (p) { return p.grup === 'isim'; });
    t.harfKonumlari = blok.map(function (p) { return merkez(p.sekil); });
    t.harfAcilari = blok.map(function (p) { return p.aci; });
    t.harfAyri = true;
  }

  // Ayrı harfleri, harflerin ortalama konumunda düzenli bir blok olarak birleştirir.
  // Blok orada sığmazsa düzenle() alan merkezine alır; çakışan rakam/ikonlar en yakın boş yere taşınır.
  function harfleriBirlestir(t) {
    if (!t.harfAyri) return;
    var k = t.harfKonumlari || [];
    if (k.length) {
      var sx = 0;
      var sy = 0;
      k.forEach(function (c) {
        sx += c[0];
        sy += c[1];
      });
      t.isimMerkez = [sx / k.length, sy / k.length];
    }
    t.harfAyri = false;
    t.harfKonumlari = null;
    t.harfAcilari = null;
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

  function fiyatHesapla(model, yer, t) {
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
    return renkVar ? t.isim + ' (' + renkli.join(', ') + ')' : t.isim;
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
    return {
      v: 2,
      alan: alan.id,
      p: parcalar.map(function (p) {
        var c = merkez(p.sekil);
        var k = {
          v: p.varyant ? p.varyant.id : null,
          t: p.tip.charAt(0),
          x: Math.round((c[0] - ac[0]) * 10) / 10,
          y: Math.round((c[1] - ac[1]) * 10) / 10,
          a: Math.round(p.aci || 0)
        };
        // Yazıdaki karakterler (harf ve rakam) yazı sırasıyla işaretlenir
        if (p.grup === 'isim' || String(p.grup).indexOf('harf-') === 0) k.s = 1;
        // Bozulmamış setin patch'i: set ürünü ve tasarımdaki set örneği ("ürün#sıra")
        if (p.setGrup && setKodlari && setKodlari[p.setGrup]) k.k = setKodlari[p.setGrup];
        // Aksesuar: sepet satırındaki iç tasarımla eşleşmesi için kimliği
        if (p.tip === 'aksesuar') k.u = p.uid;
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

  function Sahne(model, yer, kok, secenek) {
    this.m = model;
    this.yer = yer;
    this.kok = kok;
    this.etkilesimli = !!(secenek && secenek.etkilesimli);
    this.olustur();
  }

  Sahne.prototype.olustur = function () {
    var m = this.m;
    var g = m.gorsel;
    var alanSvg = m.alanlar
      .map(function (a) {
        var s = a.sekil;
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
        if (s.t === 'rect') return '<rect class="kp-yasak" x="' + s.x + '" y="' + s.y + '" width="' + s.w + '" height="' + s.h + '" />';
        var rx = s.t === 'circle' ? s.r : s.rx;
        var ry = s.t === 'circle' ? s.r : s.ry;
        return '<ellipse class="kp-yasak" cx="' + s.cx + '" cy="' + s.cy + '" rx="' + rx + '" ry="' + ry + '" />';
      })
      .join('');
    var srcset = kacis(g.kucuk) + ' 750w, ' + kacis(g.buyuk) + ' 1200w' + (g.dev ? ', ' + kacis(g.dev) + ' 1800w' : '');
    var sahneHtml =
      '<div class="kp-sahne' + (this.etkilesimli ? ' kp-sahne--etkilesimli' : '') + '" style="aspect-ratio:' + g.en + ' / ' + g.boy + '">' +
      '<img class="kp-sahne__urun" src="' + kacis(g.kucuk) + '" srcset="' + srcset + '" sizes="(min-width: 990px) 600px, 100vw" alt="' + kacis(m.urun.baslik) + '" draggable="false" decoding="async">' +
      (this.etkilesimli
        ? '<svg class="kp-sahne__alanlar" viewBox="0 0 ' + m.Wcm + ' ' + m.Hcm + '" preserveAspectRatio="none" aria-hidden="true">' + yasakSvg + alanSvg + '</svg>'
        : '') +
      '<div class="kp-sahne__parcalar"></div>' +
      (this.etkilesimli
        ? '<div class="kp-sahne__secim" aria-hidden="true"><div class="kp-cerceve" hidden>' +
          '<span class="kp-cerceve__cizgi"></span>' +
          '<span class="kp-cerceve__tutamac" data-kp-tutamac title="Döndürmek için sürükle">' +
          '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</span></div></div>'
        : '') +
      '</div>';
    // Editörde sahne bir görünüm penceresi içinde durur; yakınlaştırma sahnenin
    // genişliği ve konumuyla yapılır (transform yok), böylece tüm hesaplar aynı kalır.
    this.kok.innerHTML = this.etkilesimli
      ? '<div class="kp-gorunum" style="aspect-ratio:' + g.en + ' / ' + g.boy + '">' + sahneHtml + '</div>'
      : sahneHtml;
    this.gorunum = this.kok.querySelector('.kp-gorunum');
    this.sahne = this.kok.querySelector('.kp-sahne');
    this.katman = this.kok.querySelector('.kp-sahne__parcalar');
    this.secimEl = this.kok.querySelector('.kp-cerceve');
  };

  // Yakın görünüm ölçeği ve kaydırması (pencerenin yüzdesi olarak): takılabilir alan(lar) ~%80
  function yakinGorunum(m) {
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
      olcek = Math.max(1, Math.min(0.8 / oranX, 0.8 / oranY));
      var cx = (x1 + x2) / 2 / m.Wcm;
      var cy = (y1 + y2) / 2 / m.Hcm;
      // Alan merkezi pencerenin ortasına; görselin dışına taşmayacak şekilde sınırla
      sol = Math.min(0, Math.max(100 - olcek * 100, 50 - cx * olcek * 100));
      ust = Math.min(0, Math.max(100 - olcek * 100, 50 - cy * olcek * 100));
    }
    return { olcek: olcek, sol: sol, ust: ust };
  }

  // Yakın görünüm: takılabilir alan(lar) pencere genişliğinin ~%80'ini kaplar.
  Sahne.prototype.gorunumAyarla = function (yakin) {
    if (!this.gorunum) return;
    var y = yakin ? yakinGorunum(this.m) : { olcek: 1, sol: 0, ust: 0 };
    var olcek = y.olcek;
    var sol = y.sol;
    var ust = y.ust;
    this.yakin = !!yakin && olcek > 1;
    if (yakin) this.yakinlasabilir = olcek > 1.01;
    this.sahne.style.width = olcek * 100 + '%';
    this.sahne.style.left = sol + '%';
    this.sahne.style.top = ust + '%';
    var img = this.sahne.querySelector('.kp-sahne__urun');
    var genislik = this.gorunum.getBoundingClientRect().width;
    if (img && genislik) img.sizes = Math.ceil(genislik * olcek) + 'px';
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
      icler = am.yer.parcalar(p.icTasarim).map(function (ip) {
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
    var html = parcalar
      .map(function (p) {
        var st = parcaStili(m, p);
        var stil = 'left:' + st.left + ';top:' + st.top + ';width:' + st.width + ';height:' + st.height + (st.transform ? ';transform:' + st.transform : '');
        var gorsel = p.varyant && p.varyant.gorsel;
        var sinif = 'kp-parca kp-parca--' + p.tip + (p.sekil.t === 'circle' ? ' kp-parca--daire' : '') + (hatalar && hatalar[p.uid] ? ' kp-parca--hatali' : '') + (p.varyant && !p.varyant.png ? ' kp-parca--jpg' : '') + (!p.varyant ? ' kp-parca--eksik' : '');
        var ic = p.tip === 'aksesuar'
          ? aksesuarIcHtml(m, p)
          : gorsel
            ? '<img src="' + kacis(gorsel) + '" alt="" draggable="false" decoding="async">'
            : '<span>' + kacis(p.etiket) + '</span>';
        return '<div class="' + sinif + '" style="' + stil + '" data-uid="' + kacis(p.uid) + '" data-grup="' + kacis(p.grup) + '" aria-hidden="true">' + ic + '</div>';
      })
      .join('');
    this.katman.innerHTML = html;
    if (this.etkilesimli) this.sahne.classList.toggle('kp-sahne--hata', !!alanHatali);
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
    el.classList.toggle('kp-cerceve--hatali', !!hatali);
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

  var SET_KATEGORI = 'Hazır setler';

  // secenek.alt: aksesuar tasarım ekranı (çanta editörünün üstünde açılır; sonunda "Çantaya yerleştir")
  function Editor(kart, secenek) {
    this.kart = kart;
    this.m = kart.model;
    this.yer = kart.yer;
    this.secenek = secenek || {};
    this.alt = !!this.secenek.alt;
    var m = this.m;
    this.adimlar = this.alt ? ALT_ADIMLAR : ADIMLAR.filter(function (a) { return a.id !== 'aksesuar' || (m.aksesuarlar && m.aksesuarlar.length); });
    this.adim = 'yazi';
    // Hazır setler varsa ikon kategorilerinin en başında
    this.kategori = this.m.hazirSetler.length ? SET_KATEGORI : this.m.kategoriler.length ? this.m.kategoriler[0].ad : null;
    this.isimOlayGonderildi = false;
  }

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
      '<div class="kp-ust">' +
      (this.alt
        ? '<button type="button" class="kp-geri" data-kp-kapat aria-label="Çanta tasarımına dön"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
        : '') +
      '<div class="kp-ust__metin"><h2 id="kp-editor-baslik" class="kp-ust__baslik">' + (this.alt ? kacis(aks.ad) + ' tasarla' : 'Tasarımını oluştur') + '</h2>' +
      (this.alt ? '<p class="kp-yol">Çanta tasarımın <span aria-hidden="true">›</span> ' + kacis(aks.ad) + '</p>' : '') + '</div>' +
      (this.alt ? '' : '<button type="button" class="kp-kapat" data-kp-kapat aria-label="Kapat">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '</button>') +
      '</div>' +
      // İlerleme: başlığın hemen altında dört parçalı ince çizgi
      '<nav class="kp-adimlar" aria-label="Tasarım adımları"><ol>' +
      this.adimlar.map(function (a, i) {
        return '<li><button type="button" class="kp-adim" data-kp-adim="' + a.id + '"><span class="kp-adim__cizgi" aria-hidden="true"></span><span class="kp-adim__ad"><span class="kp-adim__no">' + (i + 1) + '</span> ' + a.ad + '</span></button></li>';
      }).join('') +
      '</ol></nav>' +
      '<div class="kp-govde">' +
      // Önizleme sabit kalır; yalnızca alttaki panel kayar
      '<div class="kp-onizleme"><div class="kp-onizleme__ic" style="--kp-oran:' + (this.m.gorsel.en / this.m.gorsel.boy) + '">' +
      '<div data-kp-sahne></div>' +
      '<button type="button" class="kp-onizleme__dugme kp-onizleme__dugme--gorunum" data-kp-gorunum aria-pressed="false">Tüm çantayı gör</button>' +
      '<span class="kp-aci" data-kp-aci aria-hidden="true" hidden></span>' +
      '<div class="kp-balon" data-kp-balon role="group" hidden></div>' +
      // Önizlemenin alt kısmında havada: uyarı kutusu
      '<div class="kp-yuzen">' +
      '<div class="kp-bildirim" data-kp-bildirim role="status" aria-live="polite" hidden></div>' +
      '<div class="kp-onay" data-kp-onay role="alertdialog" aria-live="assertive" hidden></div>' +
      '</div>' +
      '<div class="kp-set-cerceve" data-kp-set-cerceve aria-hidden="true" hidden><span class="kp-set-cerceve__etiket"></span></div>' +
      '</div>' +
      // Önizlemenin altındaki satır: eklenenler etiketleri; bir patch seçilince aynı yükseklikte araç çubuğu
      '<div class="kp-satir">' +
      '<div class="kp-etiketler" data-kp-etiketler aria-label="Eklenenler"></div>' +
      '<div class="kp-arac" data-kp-secim-cubuk role="toolbar" aria-label="Seçili patch" hidden>' +
      '<span class="kp-gizli">Seçili: <span data-kp-secili-ad></span></span>' +
      '<button type="button" data-kp-dondur="-15" aria-label="15 derece sola döndür"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>15°</span></button>' +
      '<button type="button" data-kp-dondur="15" aria-label="15 derece sağa döndür"><span>15°</span><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button type="button" data-kp-duzle>Düzle</button>' +
      '<button type="button" data-kp-aks-tasarla hidden>Tasarla</button>' +
      '<button type="button" class="kp-arac__sil" data-kp-sil>Sil</button>' +
      '<button type="button" class="kp-arac__tamam" data-kp-secim-kaldir>Tamam</button>' +
      '</div>' +
      '</div>' +
      (this.m.kalibre ? '' : '<p class="kp-onizleme__not">Önizleme ölçüleri henüz kalibre edilmedi.</p>') +
      '</div>' +
      '<div class="kp-sag">' +
      '<div class="kp-kaydir">' +
      '<div class="kp-paneller">' +
      this.adimlar.map(function (a, i) {
        return '<section class="kp-panel" data-kp-panel="' + a.id + '" aria-labelledby="kp-p-' + a.id + '"' + (i ? ' hidden' : '') + '></section>';
      }).join('') +
      '</div>' +
      '</div>' +
      '<div class="kp-alt">' +
      '<div class="kp-alt__fiyat"><span>Toplam</span><strong data-kp-toplam></strong>' +
      (this.alt ? '<small class="kp-alt__pay" data-kp-pay></small>' : '') +
      '<small class="kp-indirim-notu">İndirimler sepette uygulanır</small></div>' +
      (this.alt
        ? '<div class="kp-alt__dugmeler"><button type="button" class="btn kp-alt__vazgec" data-kp-vazgec>Vazgeç</button>' +
          '<button type="button" class="btn btn-primary kp-alt__ileri kp-alt__ileri--marka" data-kp-ileri>İleri</button></div>'
        : '<button type="button" class="btn btn-primary kp-alt__ileri" data-kp-ileri>İleri</button>') +
      (this.alt
        ? '<div class="kp-alt__aks">' +
          (this.secenek.buyuk ? '<p class="kp-aks-not">Velcro alanın neredeyse tamamını kaplar.</p>' : '') +
          '<button type="button" class="kp-baglanti" data-kp-tasarimsiz>' + kacis(belirtme(aks.ad)) + ' tasarlamadan yerleştir</button></div>'
        : '') +
      // Özet adımında: butonun altında not ve iki küçük bağlantı
      '<div class="kp-alt__ozet" data-kp-alt-ozet hidden>' +
      '<p class="kp-indirim-notu">İndirimler sepette uygulanır</p>' +
      '<div class="kp-alt__baglantilar">' +
      '<button type="button" class="kp-baglanti" data-kp-duzenle>Tasarımı düzenle</button>' +
      '<button type="button" class="kp-baglanti" data-kp-urune-don>Ürün sayfasına dön</button>' +
      '</div></div>' +
      '</div>' +
      '</div>' +
      '</div>';
    document.body.appendChild(el);
    this.el = el;
    this.sahne = new Sahne(this.m, this.yer, el.querySelector('[data-kp-sahne]'), { etkilesimli: true });
    this.panelYaziKur();
    this.panelIkonKur();
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
    this.duzenlenen = (secenek && secenek.grup) || null;
    if (!this.alt) this.el.querySelector('.kp-ust__baslik').textContent = this.duzenlenen ? 'Sepetteki tasarımı düzenle' : 'Tasarımını oluştur';
    this.t = kopyala((secenek && secenek.tasarim) || this.kart.tasarim || bosTasarim(this.m));
    var girdi = this.el.querySelector('[data-kp-isim]');
    if (girdi) girdi.value = this.t.isim || '';
    this.seciliKarakter = null;
    this.yaziIpucu = '';
    this.ilk = JSON.stringify(this.t);
    this.donusOdagi = document.activeElement;
    if (!this.alt) {
      this.kaydirmaY = window.pageYOffset;
      document.documentElement.classList.add('kp-kilit');
      document.body.style.top = -this.kaydirmaY + 'px';
    }
    this.el.hidden = false;
    this.sahne.gorunumAyarla(true);
    this.adimaGit(adim || 'yazi', true);
    this.yenile();
    var self = this;
    setTimeout(function () {
      var kapat = self.el.querySelector('[data-kp-kapat]');
      if (kapat) kapat.focus();
    }, 50);
    if (!this.alt) olayYayinla('kisisellestirme_acildi', { urun_id: this.m.urun.id, urun_adi: this.m.urun.baslik });
  };

  Editor.prototype.kapat = function (kaydet) {
    if (!kaydet && JSON.stringify(this.t) !== this.ilk) {
      if (!window.confirm('Tasarımında yaptığın değişiklikler kaydedilmeyecek. Çıkmak istiyor musun?')) return;
    }
    // Sepetteki tasarımı düzenlerken kapatmak sepeti de kayıtlı tasarımı da değiştirmez
    if (kaydet && !this.duzenlenen && !this.alt) this.kart.tasarimKaydet(this.t);
    this.duzenlenen = null;
    this.el.hidden = true;
    if (this.alt) {
      if (this.donusOdagi && this.donusOdagi.focus) this.donusOdagi.focus();
      return;
    }
    document.documentElement.classList.remove('kp-kilit');
    document.body.style.top = '';
    window.scrollTo(0, this.kaydirmaY || 0);
    if (this.donusOdagi && this.donusOdagi.focus) this.donusOdagi.focus();
  };

  Editor.prototype.olaylariBagla = function () {
    var self = this;
    var el = this.el;
    el.addEventListener('click', function (e) {
      var hedef = e.target.closest('button');
      if (!hedef || !el.contains(hedef)) return;
      if (hedef.hasAttribute('data-kp-kapat')) return self.alt ? self.altVazgec() : self.kapat(false);
      if (hedef.hasAttribute('data-kp-vazgec')) return self.altVazgec();
      if (hedef.hasAttribute('data-kp-gorunum')) {
        self.sahne.gorunumAyarla(!self.sahne.yakin);
        return self.dugmeleriGuncelle();
      }
      if (hedef.hasAttribute('data-kp-harf-mod')) {
        if (self.t.harfAyri) harfleriBirlestir(self.t);
        else harfleriAyir(self.yer, self.t);
        return self.yenile();
      }
      if (hedef.hasAttribute('data-kp-adim')) return self.adimaGit(hedef.getAttribute('data-kp-adim'), false, true);
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
      if (hedef.hasAttribute('data-kp-aks-duzenle')) return self.aksesuarDuzenle(hedef.getAttribute('data-kp-aks-duzenle'));
      if (hedef.hasAttribute('data-kp-tasarimsiz')) return self.altYerlestir(true);
      if (hedef.hasAttribute('data-kp-aks-tasarla')) return self.aksesuarDuzenle(self.secili);
      if (hedef.hasAttribute('data-kp-set-kaldir')) return self.setKaldir(hedef.getAttribute('data-kp-set-kaldir'));
      if (hedef.hasAttribute('data-kp-onay-eylem')) return self.onayEylemi(parseInt(hedef.getAttribute('data-kp-onay-eylem'), 10));
      if (hedef.hasAttribute('data-kp-kategori')) {
        self.kategori = hedef.getAttribute('data-kp-kategori');
        return self.ikonIzgarasiCiz();
      }
      if (hedef.hasAttribute('data-kp-kaldir')) return self.parcaKaldir(hedef.getAttribute('data-kp-kaldir'));
      if (hedef.hasAttribute('data-kp-isim-kaldir')) return self.isimAyarla('');
      if (hedef.hasAttribute('data-kp-etiket-sec')) return self.etiketSec(hedef.getAttribute('data-kp-etiket-sec'));
      if (hedef.hasAttribute('data-kp-duzenle')) return self.adimaGit('ikon', true);
      if (hedef.hasAttribute('data-kp-urune-don')) return self.kapat(!self.duzenlenen);
      if (hedef.hasAttribute('data-kp-geri-don')) return self.adimaGit('yazi', true);
      if (hedef.hasAttribute('data-kp-sade-al')) {
        self.kapat(true);
        return self.kart.sadeSepet();
      }
      if (hedef.hasAttribute('data-kp-dondur')) return self.acisiDegistir(Number(hedef.getAttribute('data-kp-dondur')));
      if (hedef.hasAttribute('data-kp-duzle')) return self.acisiDegistir(0, 0);
      if (hedef.hasAttribute('data-kp-sil')) return self.seciliSil();
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
      if (e.target.closest('.kp-alt button, .kp-adimlar button, .kp-arac button')) e.preventDefault();
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (self.onayAcik) self.onayKapat();
        else if (self.secili) self.sec(null);
        else if (self.alt) self.altVazgec();
        else self.kapat(false);
      }
      if (e.key === 'Tab') self.odakTuzagi(e);
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
      var temiz = Array.from(ham).filter(function (h) { return KARAKTER_DESENI.test(h); }).join('');
      self.gecersizKarakter = temiz !== ham.replace(/\s/g, '') || /\s/.test(ham);
      if (girdi.value !== temiz) girdi.value = temiz;
      karakterleriHizala(self.t, temiz);
      if (self.seciliKarakter != null && self.seciliKarakter >= Array.from(temiz).length) self.seciliKarakter = null;
      self.yaziIpucu = '';
      self.yenile();
    });
    window.addEventListener('resize', function () {
      if (!self.el.hidden) self.sahne.gorunumAyarla(self.sahne.yakin);
    });
    this.surukleBagla();
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
    karakterleriHizala(this.t, isim);
    if (this.seciliKarakter != null && this.seciliKarakter >= Array.from(isim).length) this.seciliKarakter = null;
    var girdi = this.el.querySelector('[data-kp-isim]');
    if (girdi.value !== isim) girdi.value = isim;
    this.yenile();
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
      var stok = this.stokSorunlari.some(function (s) { return s.parca.grup !== 'isim' && String(s.parca.grup).indexOf('harf-') !== 0; });
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
    if (adim !== this.adim) {
      this.secili = null;
      this.seciliHarf = null;
      this.bildirimKapat();
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
    this.el.querySelectorAll('[data-kp-panel]').forEach(function (p) {
      p.hidden = p.getAttribute('data-kp-panel') !== adim;
    });
    var gecildi = true;
    this.el.querySelectorAll('[data-kp-adim]').forEach(function (b) {
      var id = b.getAttribute('data-kp-adim');
      if (id === adim) {
        b.setAttribute('aria-current', 'step');
        gecildi = false;
      } else {
        b.removeAttribute('aria-current');
      }
      b.classList.toggle('kp-adim--gecildi', gecildi && id !== adim);
    });
    var ozette = adim === 'ozet';
    this.el.querySelector('.kp-alt').classList.toggle('kp-alt--ozet', ozette);
    this.el.querySelector('[data-kp-alt-ozet]').hidden = !ozette;
    this.ileriYazisi();
  };

  // Özet adımında ana buton doğrudan sepete ekler: "Sepete ekle · toplam"
  Editor.prototype.ileriYazisi = function () {
    var ileri = this.el.querySelector('[data-kp-ileri]');
    if (this.alt) {
      ileri.textContent = 'Çantaya yerleştir';
      return;
    }
    this.el.querySelector('.kp-alt__baglantilar').hidden = this.adim === 'ozet' && bosMu(this.t);
    if (this.adim !== 'ozet') {
      ileri.textContent = 'İleri';
      return;
    }
    var f = fiyatHesapla(this.m, this.yer, this.t);
    var k = this.kampanyaSonucu();
    var adet = this.kart.adet ? this.kart.adet() : 1;
    var tutar = (bosMu(this.t) ? f.urun : f.toplam) * adet - (k && k.indirim > 0 ? k.indirim : 0);
    // "İndirimler sepette uygulanır" notu yalnızca simülasyon başarısızsa
    this.el.querySelectorAll('.kp-alt__ozet .kp-indirim-notu').forEach(function (n) { n.hidden = !(k && k.hata); });
    if (this.duzenlenen) {
      ileri.textContent = bosMu(this.t) ? 'Sepetten çıkar' : 'Sepeti güncelle · ' + paraBicimle(tutar);
      return;
    }
    ileri.textContent = (bosMu(this.t) ? 'Sepete ekle · ' : 'Tasarımımı sepete ekle · ') + paraBicimle(tutar);
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

  // Aksesuar ekranının toplamı: tüm tasarım (çanta + patch'ler + bu aksesuar ve üzerindekiler); altında aksesuarın payı
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
    this.el.querySelector('[data-kp-toplam]').textContent = paraBicimle(toplam);
    this.el.querySelector('[data-kp-pay]').textContent =
      aksesuarTuru(this.secenek.aksesuar) + (bosMu(this.t) ? '' : ' ve tasarımı') + ': ' + paraBicimle(pay);
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
    // Yazı/Rakam/İkon: İleri her zaman çalışır (sorunlu tasarım Özet'te sepete eklenirken durdurulur)
    if (this.adim !== 'ozet') {
      var s0 = this.adimlar.map(function (a) { return a.id; }).indexOf(this.adim);
      return this.adimaGit(this.adimlar[s0 + 1].id, false, true);
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
      var f = fiyatHesapla(this.m, this.yer, this.t);
      if (!bosMu(this.t)) {
        olayYayinla('tasarim_tamamlandi', {
          urun_id: this.m.urun.id,
          harf_sayisi: f.harfAdet,
          rakam_sayisi: f.rakamAdet,
          ikon_sayisi: f.ikonAdet,
          toplam: f.toplam / 100,
          para_birimi: (window.Shopify && Shopify.currency && Shopify.currency.active) || 'TRY'
        });
      }
      if (this.duzenlenen) return this.sepetiGuncelle();
      // Tasarımı kaydet, editörü kapat ve doğrudan sepete ekle (sepet çekmecesi editörün altında kalmasın)
      this.kapat(true);
      return this.kart.sepeteGonder();
    }
    this.adimaGit(this.adimlar[sira + 1].id);
  };

  /* ---------------- Paneller ---------------- */

  Editor.prototype.panelYaziKur = function () {
    var panel = this.el.querySelector('[data-kp-panel="yazi"]');
    panel.innerHTML =
      '<div class="kp-panel__ust"><h3 id="kp-p-yazi" class="kp-panel__baslik" tabindex="-1">Yazı ve rakam</h3>' + '<button type="button" class="kp-gec" data-kp-gec hidden>Bu adımı geç <span aria-hidden="true">→</span></button>' + '</div>' +
      '<div class="kp-alan-girdi">' +
      '<label for="kp-isim" class="kp-gizli">Yazı ve rakam</label>' +
      '<input id="kp-isim" class="kp-girdi" type="text" data-kp-isim autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" maxlength="24" enterkeyhint="done" placeholder="ör. ECE7" aria-describedby="kp-yazi-ipucu kp-kapasite kp-isim-uyari">' +
      '<p id="kp-yazi-ipucu" class="kp-yazi-ipucu">Harflere dokunarak her birinin stilini ayrı seçebilirsin.</p>' +
      '<div class="kp-karakterler" data-kp-karakterler role="group" aria-label="Karakterler"></div>' +
      '<div class="kp-stil" data-kp-stil-panel hidden></div>' +
      '<div class="kp-isim-alt">' +
      '<button type="button" class="kp-harf-mod" data-kp-harf-mod aria-pressed="false" hidden>Harfleri ayır</button>' +
      '<p id="kp-kapasite" class="kp-kapasite" data-kp-kapasite></p>' +
      '</div>' +
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

  // İkonların ortak fiyatı (hepsi aynıysa); başlığın sağında bir kez yazılır
  Editor.prototype.ikonFiyatYazisi = function () {
    var fiyatlar = {};
    this.m.ikonlar.forEach(function (i) { if (i.varyant && i.varyant.fiyat != null) fiyatlar[i.varyant.fiyat] = true; });
    var liste = Object.keys(fiyatlar).map(Number).sort(function (a, b) { return a - b; });
    if (!liste.length) return '';
    return liste.length === 1 ? 'Her patch ' + paraBicimle(liste[0]) : 'Patch başına ' + paraBicimle(liste[0]) + '\'den';
  };

  Editor.prototype.panelIkonKur = function () {
    var panel = this.el.querySelector('[data-kp-panel="ikon"]');
    var adlar = (this.m.hazirSetler.length ? [SET_KATEGORI] : []).concat(this.m.kategoriler.map(function (k) { return k.ad; }));
    var kategoriler = adlar
      .map(function (ad) {
        return '<button type="button" class="kp-kategori' + (ad === SET_KATEGORI ? ' kp-kategori--set' : '') + '" data-kp-kategori="' + kacis(ad) + '">' + kacis(ad) + '</button>';
      })
      .join('');
    panel.innerHTML =
      '<div class="kp-panel__ust"><h3 id="kp-p-ikon" class="kp-panel__baslik" tabindex="-1">İkon</h3>' +
      '<span class="kp-panel__sag"><span class="kp-panel__fiyat" data-kp-ikon-fiyat>' + kacis(this.ikonFiyatYazisi()) + '</span>' + '<button type="button" class="kp-gec" data-kp-gec hidden>Bu adımı geç <span aria-hidden="true">→</span></button>' + '</span></div>' +
      '<div class="kp-kategoriler" role="group" aria-label="İkon kategorileri">' + kategoriler + '</div>' +
      '<p class="kp-panel__aciklama" data-kp-set-aciklama hidden>Birlikte uyumlu 3\'lü ve 4\'lü setler. Seti ekleyince patch\'leri tek tek de taşıyıp döndürebilirsin.</p>' +
      '<div class="kp-izgara kp-izgara--ikon" data-kp-ikon-izgara></div>';
    this.ikonIzgarasiCiz();
  };

  Editor.prototype.ikonIzgarasiCiz = function () {
    var m = this.m;
    var self = this;
    var setler = this.kategori === SET_KATEGORI && m.hazirSetler.length;
    var kat = setler ? { ad: SET_KATEGORI } : m.kategoriler.filter(function (k) { return k.ad === self.kategori; })[0] || m.kategoriler[0];
    if (!kat) return;
    this.el.querySelectorAll('[data-kp-kategori]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-kp-kategori') === kat.ad ? 'true' : 'false');
    });
    var izgara = this.el.querySelector('[data-kp-ikon-izgara]');
    this.el.querySelector('[data-kp-set-aciklama]').hidden = !setler;
    izgara.classList.toggle('kp-izgara--set', !!setler);
    this.el.querySelector('[data-kp-ikon-fiyat]').textContent = setler ? this.ikonFiyatYazisi().replace(/^Her patch/, 'Tek patch') : this.ikonFiyatYazisi();
    if (setler) {
      izgara.innerHTML = m.hazirSetler.map(function (s, sira) { return setKarti(s, sira); }).join('');
      this.ikonDurumGuncelle();
      return;
    }
    izgara.innerHTML = kat.ikonlar
      .map(function (i, sira) {
        var v = i.varyant;
        var tukendi = !v.satilabilir || v.stok === 0;
        return (
          '<button type="button" class="kp-secim kp-secim--ikon" data-kp-ikon="' + i.id + '" data-sira="' + sira + '" title="' + kacis(i.ad) + '"' + (tukendi ? ' disabled' : '') + '>' +
          (v.gorsel ? '<img src="' + kacis(v.gorsel) + '" alt="" loading="lazy">' : '') +
          '<span class="kp-secim__ad">' + kacis(i.ad) + '</span>' +
          (tukendi ? '<span class="kp-secim__rozet kp-secim__rozet--tukendi">Tükendi</span>' : '<span class="kp-secim__rozet" aria-hidden="true">Yer aç</span>') +
          '</button>'
        );
      })
      .join('');
    this.ikonDurumGuncelle();
  };

  /* ---------------- Aksesuar ---------------- */

  // Aksesuar Velcro alanın yarısından fazlasını kaplıyorsa "neredeyse tamamını kaplar" notu
  function aksesuarBuyukMu(m, aks) {
    var alan = m.alanBul('icon');
    if (!alan) return false;
    var s = alan.sekil;
    var alanAlani = s.t === 'circle' ? Math.PI * s.r * s.r : s.t === 'ellipse' ? Math.PI * s.rx * s.ry : s.w * s.h - (4 - Math.PI) * Math.pow(s.r || 0, 2);
    var d = aks.dis;
    var aksAlani = d.sekil === 'circle' ? Math.PI * Math.pow(d.en / 2, 2) : d.en * d.boy - (4 - Math.PI) * d.kose * d.kose;
    return aksAlani / alanAlani >= 0.5;
  }

  Editor.prototype.panelAksesuarKur = function () {
    var m = this.m;
    var panel = this.el.querySelector('[data-kp-panel="aksesuar"]');
    var kartlar = m.aksesuarlar
      .map(function (a) {
        return (
          '<button type="button" class="kp-secim kp-secim--aksesuar" data-kp-aksesuar="' + a.id + '">' +
          '<img src="' + kacis(a.gorsel.kucuk) + '" alt="" loading="lazy">' +
          '<span class="kp-secim__ad">' + kacis(a.model) + '</span>' +
          (a.renk ? '<span class="kp-aks-kart__renk">' + kacis(a.renk) + '</span>' : '') +
          '<span class="kp-aks-kart__fiyat">' + paraBicimle(a.fiyat) + '</span>' +
          (aksesuarBuyukMu(m, a) ? '<span class="kp-aks-kart__not">Velcro alanın neredeyse tamamını kaplar</span>' : '') +
          '</button>'
        );
      })
      .join('');
    panel.innerHTML =
      '<div class="kp-panel__ust"><h3 id="kp-p-aksesuar" class="kp-panel__baslik" tabindex="-1">Aksesuar</h3>' + '<button type="button" class="kp-gec" data-kp-gec hidden>Bu adımı geç <span aria-hidden="true">→</span></button>' + '</div>' +
      '<p class="kp-panel__aciklama">Çantanın Velcro yüzeyine takılabilen aksesuarlar. İstersen önce onu da patch\'lerle tasarlarsın.</p>' +
      '<div class="kp-izgara kp-izgara--aksesuar">' + kartlar + '</div>';
  };

  // Aksesuar kartı: tasarlanabiliyorsa tasarım ekranı, değilse doğrudan çantaya yerleştir
  Editor.prototype.aksesuarSec = function (id) {
    var aks = this.m.aksesuarHarita[id];
    if (!aks) return;
    if (aks.tasarlanabilir) return this.altEditorAc(aks, null, null);
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
        yerlestir: function (t) { self.aksesuarYerlestir(aks, t, ed.duzenlenenAks); },
        // Vazgeç: yeni aksesuarda çanta tasarımının Aksesuar adımına dönülür; düzenlemede bulunduğu adımda kalınır
        vazgec: function (duzenleme) { if (!duzenleme && self.adim !== 'aksesuar') self.adimaGit('aksesuar', true); self.yenile(); }
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
  Editor.prototype.aksesuarYerlestir = function (aks, icTasarim, uid) {
    var t = this.t;
    if (uid) {
      (t.aksesuarlar || []).forEach(function (a) { if (a.uid === uid) a.tasarim = icTasarim; });
      return this.yenile();
    }
    var self = this;
    var yer = this.yer;
    var alan = this.m.alanBul('icon');
    if (!alan) return;
    var c = merkez(alan.sekil);
    var ornek = aksesuarSekli(aks, c[0], c[1], 0);
    var dolu = this.durum.parcalar.filter(function (p) { return !self.durum.hatalar[p.uid]; });
    var tasima = yer.enYakin([{ tip: 'aksesuar', sekil: ornek }], dolu, 0, 0);
    if (tasima) return this.aksesuarEkle(aks, icTasarim, c[0] + tasima[0], c[1] + tasima[1]);
    // Boş alana sığıyor mu? Sığıyorsa çakışan patch'i bul
    var bos = yer.enYakin([{ tip: 'aksesuar', sekil: ornek }], [], 0, 0);
    if (!bos) {
      this.bildir(aks.ad + ' bu alana sığmıyor.', { sure: 5000 });
      return;
    }
    var konumda = kaydir(ornek, bos[0], bos[1]);
    var cakisan = dolu.filter(function (p) { return cakisir(konumda, p.sekil, 0); })[0];
    this.cakismaKutusu(aks, icTasarim, cakisan, false);
  };

  // Koyu kutu: "[Aksesuar] için alanda yer yok. [Patch] ile çakışıyor." + Yer aç / [Patch]'i çıkar.
  // Yer aç başarısız olursa kutu "yer açılamadı" diyerek kalır; aksesuar tasarımı kaybolmaz.
  Editor.prototype.cakismaKutusu = function (aks, icTasarim, cakisan, yerAcilamadi) {
    var grup = cakisan && cakisan.grup;
    var ad = cakisan ? (yazidaMi(cakisan) ? this.t.isim : cakisan.etiket) : '';
    var metin = yerAcilamadi
      ? 'Patch\'leri kaydırarak yer açılamadı.' + (ad ? ' ' + ad + ' hâlâ ' + aks.ad + ' ile çakışıyor.' : '')
      : aks.ad + ' için alanda yer yok.' + (ad ? ' ' + ad + ' ile çakışıyor.' : '');
    this.onayGoster(metin, [
      yerAcilamadi ? null : { yazi: 'Yer aç', birincil: true, eylem: function () {
        if (!this.yerAc(aks, icTasarim)) this.cakismaKutusu(aks, icTasarim, cakisan, true);
      } },
      grup ? { yazi: belirtme(ad) + ' çıkar', birincil: yerAcilamadi, eylem: function () {
        this.grubuCikar(grup);
        this.aksesuarYerlestir(aks, icTasarim);
      } } : null,
      { yazi: 'Vazgeç', eylem: function () {} }
    ].filter(Boolean), yerAcilamadi ? null : '\u2018Yer aç\u2019 patch\'leri kaydırarak sığdırmayı dener, hiçbir şeyi silmez.');
  };

  Editor.prototype.aksesuarEkle = function (aks, icTasarim, cx, cy) {
    if (!this.t.aksesuarlar) this.t.aksesuarlar = [];
    var uid = yeniId('a');
    this.t.aksesuarlar.push({ uid: uid, urunId: aks.id, cx: cx, cy: cy, aci: 0, tasarim: icTasarim || null });
    olayYayinla('aksesuar_eklendi', { urun_id: this.m.urun.id, aksesuar_id: aks.id, aksesuar_adi: aks.ad, tasarimli: !!icTasarim });
    this.bildirimKapat();
    this.yenile();
    this.sec(uid);
  };

  // Çakışan grubu (yazı, harf, ikon ya da aksesuar) çıkarır — yalnızca kullanıcı onayıyla çağrılır
  Editor.prototype.grubuCikar = function (grup) {
    var t = this.t;
    if (grup === 'isim') return this.isimAyarla('');
    if (String(grup).indexOf('harf-') === 0) {
      karakterSil(t, parseInt(String(grup).slice(5), 10));
      return this.isimAyarla(t.isim);
    }
    var parca = t.parcalar.filter(function (p) { return p.uid === grup; })[0];
    if (parca && parca.setGrup) setiBoz(t, parca.setGrup);
    this.parcaKaldir(grup);
  };

  // "Yer aç": aksesuarı alanda olası yerlere koymayı dener; çakışan patch'leri (grup grup) en yakın boş yere kaydırır.
  // Hiçbir şey silinmez. Başarılıysa yerleştirir ve true döner.
  Editor.prototype.yerAc = function (aks, icTasarim) {
    var self = this;
    var yer = this.yer;
    var alan = this.m.alanBul('icon');
    var c = merkez(alan.sekil);
    var ornek = aksesuarSekli(aks, 0, 0, 0);
    var k = kutu(alan.sekil);
    var ok = kutu(ornek);
    var adaylar = [];
    for (var y = k.y + ok.h / 2; y <= k.y + k.h - ok.h / 2 + EPS; y += 0.5) {
      for (var x = k.x + ok.w / 2; x <= k.x + k.w - ok.w / 2 + EPS; x += 0.5) {
        var s = kaydir(ornek, x, y);
        if (yer.alanaUygun(s, 'aksesuar')) adaylar.push({ s: s, d: Math.pow(x - c[0], 2) + Math.pow(y - c[1], 2) });
      }
    }
    adaylar.sort(function (a, b) { return a.d - b.d; });
    var d = this.durum;
    var dolu = d.parcalar.filter(function (p) { return !d.hatalar[p.uid]; });
    for (var i = 0; i < Math.min(adaylar.length, 40); i++) {
      var aksP = { tip: 'aksesuar', sekil: adaylar[i].s, grup: '_yeni' };
      var cakisan = {};
      dolu.forEach(function (p) { if (cakisir(aksP.sekil, p.sekil, 0)) cakisan[p.grup] = true; });
      var gruplar = Object.keys(cakisan);
      var sabit = dolu.filter(function (p) { return !cakisan[p.grup]; }).concat([aksP]);
      var tasimalar = [];
      var olmadi = false;
      for (var g = 0; g < gruplar.length && !olmadi; g++) {
        var gp = dolu.filter(function (p) { return p.grup === gruplar[g]; });
        var t0 = yer.enYakin(gp, sabit, 0, 0, 0.5);
        if (!t0) {
          olmadi = true;
          break;
        }
        var tasinmis = gp.map(function (p) { return kopyaParca(p, { sekil: kaydir(p.sekil, t0[0], t0[1]) }); });
        sabit = sabit.concat(tasinmis);
        tasimalar.push({ grup: gruplar[g], parca: gp[0], dx: t0[0], dy: t0[1] });
      }
      if (olmadi) continue;
      tasimalar.forEach(function (tm) {
        if (tm.grup === 'isim') {
          var ic = self.isimMerkezi();
          self.t.isimMerkez = [ic[0] + tm.dx, ic[1] + tm.dy];
        } else {
          konumKaydir(self.t, tm.parca, tm.dx, tm.dy);
        }
      });
      var m0 = merkez(adaylar[i].s);
      this.aksesuarEkle(aks, icTasarim, m0[0], m0[1]);
      return true;
    }
    return false;
  };

  // Hazır set kartı: patch önizlemeleri, set adı, "N patch · fiyat" ve üstü çizili parça toplamı
  function setKarti(s, sira) {
    return (
      '<button type="button" class="kp-secim kp-secim--set" data-kp-hazir-set="' + s.id + '" data-sira="' + sira + '" title="' + kacis(s.ad) + ' seti">' +
      '<span class="kp-set-kart__onizleme" aria-hidden="true">' +
      s.patchler.map(function (p) { return p.varyant.gorsel ? '<img src="' + kacis(p.varyant.gorsel) + '" alt="" loading="lazy">' : ''; }).join('') +
      '</span>' +
      '<span class="kp-secim__ad">' + kacis(s.ad) + '</span>' +
      '<span class="kp-set-kart__fiyat">' + s.patchler.length + ' patch · ' + paraBicimle(s.fiyat) +
      (s.parcaToplam > s.fiyat ? ' <s>' + paraBicimle(s.parcaToplam) + '</s>' : '') + '</span>' +
      '<span class="kp-secim__rozet" aria-hidden="true">Yer aç</span>' +
      '</button>'
    );
  }

  /* ---------------- Ekleme / kaldırma ---------------- */

  // "Bu adımı geç →": o adımda hiçbir şey eklenmemişse görünür
  Editor.prototype.adimGec = function () {
    var s0 = this.adimlar.map(function (a) { return a.id; }).indexOf(this.adim);
    if (s0 < this.adimlar.length - 1) this.adimaGit(this.adimlar[s0 + 1].id, false, true);
  };

  Editor.prototype.gecButonlariGuncelle = function () {
    var t = this.t;
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
    var isimP = parcalar.filter(function (p) { return p.grup === 'isim'; });
    if (isimP.length) {
      var altSinir = Math.max.apply(null, isimP.map(function (p) { var k = kutu(p.sekil); return k.y + k.h; }));
      hedefY = altSinir + this.m.ayar.bosluk + ornekKutu.h / 2;
    }
    var baslangic = kaydir(ornek, c[0], hedefY);
    var tasima = this.yer.enYakin([{ tip: tip, sekil: baslangic }], parcalar.filter(function (p) { return !this.durum.hatalar[p.uid]; }, this), 0, 0);
    if (!tasima) {
      this.bildir(yerYok
        ? ad + ' için şu an yer yok. Patch\'leri kaydırarak yer açabilir, bir patch\'i kaldırabilir ya da daha küçük bir ikon seçebilirsin.'
        : ad + ' için alanda yer kalmadı. Bir patch\'i kaldırmayı' + (tip === 'icon' ? ' ya da daha küçük bir ikon seçmeyi' : '') + ' deneyebilirsin.', { sure: 5000 });
      return false;
    }
    this.bildirimKapat();
    this.t.parcalar.push({ uid: yeniId(tip === 'number' ? 'r' : 'i'), tip: tip, urunId: urunId, varyantId: varyant.id, cx: c[0] + tasima[0], cy: hedefY + tasima[1] });
    this.yenile();
    return true;
  };

  Editor.prototype.ikonEkle = function (urunId) {
    var ikon = this.m.ikonHarita[urunId];
    if (!ikon) return;
    // Soluk ("Yer aç") ikon: yine de denenir (ince aramada yer bulunabilir); olmazsa yer açma açıklaması
    var kart = this.el.querySelector('[data-kp-ikon="' + urunId + '"]');
    var yerYok = !!(kart && kart.classList.contains('kp-secim--sigmaz'));
    if (this.parcaEkle('icon', ikon.id, ikon.varyant, ikon, yerYok)) {
      this.sonIkon = ikon;
      olayYayinla('ikon_eklendi', { urun_id: this.m.urun.id, ikon_id: ikon.id, ikon_adi: ikon.ad });
    }
  };

  Editor.prototype.parcaKaldir = function (uid) {
    this.t.parcalar = this.t.parcalar.filter(function (p) { return p.uid !== uid; });
    if (this.t.aksesuarlar) this.t.aksesuarlar = this.t.aksesuarlar.filter(function (a) { return a.uid !== uid; });
    setleriTemizle(this.m, this.t);
    this.yenile();
  };

  // Setin patch'lerini sırayla uygun boş yerlere yerleştirir. dolu: mevcut geçerli parçalar.
  // hizli: ızgaradaki "Yer aç" denetimi (kaba arama). Sonuç: [[cx, cy], ...] ya da null.
  Editor.prototype.setYerlestir = function (st, dolu, hizli) {
    var yer = this.yer;
    var alan = this.m.alanBul('icon');
    if (!alan) return null;
    var c = merkez(alan.sekil);
    var yerlesmis = dolu.slice();
    var sonuc = [];
    for (var i = 0; i < st.patchler.length; i++) {
      var p = st.patchler[i];
      var ornek = parcaSekli(p, p.varyant, 0, 0);
      var sekil;
      if (hizli) {
        sekil = yer.ilkUygun(ornek, 'icon', yerlesmis);
      } else {
        var tasima = yer.enYakin([{ tip: 'icon', sekil: kaydir(ornek, c[0], c[1]) }], yerlesmis, 0, 0);
        sekil = tasima ? kaydir(ornek, c[0] + tasima[0], c[1] + tasima[1]) : null;
      }
      if (!sekil) return null;
      yerlesmis.push({ tip: 'icon', sekil: sekil });
      sonuc.push(merkez(sekil));
    }
    return sonuc;
  };

  // Hazır seti ekler: patch'ler birlikte, uygun boş yerlere; her biri ayrı sürüklenip döndürülebilir
  Editor.prototype.setEkle = function (urunId) {
    var st = this.m.hazirSetHarita[urunId];
    if (!st) return;
    var self = this;
    var dolu = this.durum.parcalar.filter(function (p) { return !self.durum.hatalar[p.uid]; });
    var konumlar = this.setYerlestir(st, dolu, false);
    if (!konumlar) {
      this.bildir(st.ad + ' seti için alanda yer yok. Patch\'leri kaydırabilir ya da bir patch\'i kaldırabilirsin.', { sure: 5000 });
      return;
    }
    this.bildirimKapat();
    var id = yeniId('S');
    st.patchler.forEach(function (p, i) {
      self.t.parcalar.push({ uid: yeniId('i'), tip: 'icon', urunId: p.id, varyantId: p.varyant.id, cx: konumlar[i][0], cy: konumlar[i][1], setGrup: id });
    });
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
    this.yenile();
  };

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

  /* ---------------- Yenileme ---------------- */

  Editor.prototype.yenile = function () {
    if (!this.el || this.el.hidden) return;
    // Bekleyen "geçersiz açı" önizlemesi varsa kapat; dönüş sürmüyorsa açı göstergesi gizlenir
    clearTimeout(this.donmeZamanlayici);
    if (!this.sahne.sahne.classList.contains('kp-sahne--donuyor')) this.aciGostergesiGizle();
    this.analiz = isimAnaliz(this.m, this.yer, this.t);
    setleriTemizle(this.m, this.t);
    this.durum = duzenle(this.m, this.yer, this.t);
    this.stokSorunlari = stokKontrol(this.m, this.t, this.yer, 1);
    var alanHatali = !this.durum.isimGecerli || Object.keys(this.durum.hatalar).length > 0;
    this.sahne.ciz(this.durum.parcalar, this.durum.hatalar, alanHatali);
    this.dugmeleriGuncelle();
    this.yaziDurumGuncelle();
    this.etiketleriCiz();
    this.gecButonlariGuncelle();
    this.ikonDurumGuncelle();
    var f = fiyatHesapla(this.m, this.yer, this.t);
    if (this.alt) this.altToplamCiz(f);
    else this.el.querySelector('[data-kp-toplam]').textContent = paraBicimle(f.toplam);
    var ileri = this.el.querySelector('[data-kp-ileri]');
    var engel = this.adimEngeli(this.adim);
    if (this.adim === 'ozet') {
      var self = this;
      engel = this.adimlar.some(function (a) { return self.adimEngeli(a.id); });
    }
    ileri.setAttribute('aria-disabled', engel ? 'true' : 'false');
    ileri.classList.toggle('kp-alt__ileri--engelli', !!engel);
    if (this.adim === 'ozet') {
      this.kampanyaGuncelle();
      this.ozetCiz();
    }
    this.ileriYazisi();
    this.secimGuncelle();
    this.setCerceveCiz();
  };

  Editor.prototype.dugmeleriGuncelle = function () {
    var ayri = !!this.t.harfAyri;
    var harfSayisi = Array.from(this.t.isim || '').length;
    this.el.querySelectorAll('[data-kp-harf-mod]').forEach(function (b) {
      b.hidden = harfSayisi < 2;
      b.textContent = ayri ? 'Harfleri birleştir' : 'Harfleri ayır';
      b.setAttribute('aria-pressed', ayri ? 'true' : 'false');
    });
    var gorunum = this.el.querySelector('[data-kp-gorunum]');
    gorunum.hidden = !this.sahne.yakinlasabilir;
    gorunum.textContent = this.sahne.yakin ? 'Tüm çantayı gör' : 'Alana yakınlaş';
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

  // Yazının altındaki karakter kartları: karakter kendi stilinde, altında stil adı.
  // Bir karta dokununca altında stil paneli açılır: Cool / Piramit ve Piramit'te stoktaki renkler.
  Editor.prototype.karakterleriCiz = function () {
    var m = this.m;
    var t = this.t;
    var harfler = Array.from(t.isim || '');
    var kutu = this.el.querySelector('[data-kp-karakterler]');
    var secili = this.seciliKarakter;
    var html = harfler
      .map(function (h, i) {
        var set = karakterSeti(m, t, i, h);
        var v = set ? harfVaryanti(set, t, i, h) : null;
        var on = secili === i;
        return (
          '<button type="button" class="kp-karakter' + (on ? ' kp-karakter--secili' : '') + (!v ? ' kp-karakter--yok' : '') + '" data-kp-karakter="' + i + '" aria-pressed="' + on + '" aria-label="' + (i + 1) + '. karakter ' + kacis(h) + ', ' + kacis(stilAdi(set)) + (v && v.renk && set.cokRenkli ? ' ' + kacis(v.renk) : '') + '">' +
          '<span class="kp-karakter__gorsel">' + (v && v.gorsel ? '<img src="' + kacis(v.gorsel) + '" alt="" draggable="false">' : '<span class="kp-karakter__harf">' + kacis(h) + '</span>') + '</span>' +
          '<span class="kp-karakter__stil">' + kacis(stilAdi(set)) + '</span>' +
          '</button>'
        );
      })
      .join('');
    kutu.hidden = !harfler.length;
    if (kutu.innerHTML !== html) kutu.innerHTML = html;
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
          '<span class="kp-stil__ornek">' + (v && v.gorsel ? '<img src="' + kacis(v.gorsel) + '" alt="">' : '<span>' + kacis(h) + '</span>') + '</span>' +
          '<span class="kp-stil__ad">' + kacis(stilAdi(s)) + (yok ? ' <small>yok</small>' : '') + '</span>' +
          '</button>'
        );
      })
      .join('');
    var renkler = set.cokRenkli
      ? '<div class="kp-stil__renkler" role="group" aria-label="' + kacis(h) + ' harfinin rengi">' + renkNoktalari(set, t, secili, h, 'kp-nokta--buyuk') +
        '<button type="button" class="kp-karistir" data-kp-karistir aria-label="Tüm renkleri karıştır" title="Tüm renkleri karıştır"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 7h3.5c2.2 0 3.6 1 4.8 3l2.4 4c1.2 2 2.6 3 4.8 3H21M3 17h3.5c1.4 0 2.5-.4 3.4-1.2M14.1 8.2C15 7.4 16.1 7 17.5 7H21M18 4l3 3-3 3M18 14l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>'
      : '';
    var yeni =
      '<p class="kp-stil__baslik">' + (secili + 1) + '. karakter (' + kacis(h) + ') için stil</p>' +
      '<div class="kp-stil__setler" role="group" aria-label="Stil">' + setler + '</div>' + renkler;
    panel.hidden = false;
    if (panel.innerHTML !== yeni) panel.innerHTML = yeni;
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
    if (this.gecersizKarakter) {
      uyarilar.push('<p class="kp-uyari kp-uyari--bilgi">Yazıda yalnızca harf ve rakam kullanabilirsin.</p>');
    }
    a.eksikler.forEach(function (e) {
      uyarilar.push(
        '<div class="kp-uyari kp-uyari--hata"><p>' + e.harf + ' harfi şu an yok, ' + e.oneri + ' olarak yazmak ister misin?</p>' +
        '<div class="kp-uyari__butonlar">' +
        '<button type="button" class="kp-oneri" data-kp-oneri-kabul data-harf="' + e.harf + '" data-oneri="' + e.oneri + '">' + e.oneri + ' olarak yaz</button>' +
        '<button type="button" class="kp-oneri kp-oneri--ikincil" data-kp-harf-sil data-harf="' + e.harf + '">' + e.harf + ' harfini sil</button>' +
        '</div></div>'
      );
    });
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
    if (!a.sigiyor && harfSayisi) {
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
    function cip(grup, ad, kaldir, hatali, seciliMi) {
      return (
        '<span class="kp-cip' + (hatali ? ' kp-cip--hatali' : '') + (seciliMi ? ' kp-cip--secili' : '') + '">' +
        '<button type="button" class="kp-cip__ad" data-kp-etiket-sec="' + kacis(grup) + '" aria-pressed="' + !!seciliMi + '">' + kacis(ad) + '</button>' +
        '<button type="button" class="kp-cip__kaldir" ' + kaldir + ' aria-label="' + kacis(ad) + ' kaldır">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>' +
        '</span>'
      );
    }
    if (t.isim) {
      var isimHatali = !this.durum.isimGecerli || (this.analiz && this.analiz.engel);
      var isimSecili = secili === 'isim' || (secili && String(secili).indexOf('harf-') === 0);
      html.push(cip(t.harfAyri ? 'harf-0' : 'isim', t.isim, 'data-kp-isim-kaldir', isimHatali, isimSecili));
    }
    var saglam = saglamSetler(this.m, t);
    var setIdleri = saglam.map(function (k) { return k.id; });
    saglam.forEach(function (k) {
      var st = self.m.hazirSetHarita[k.urunId];
      var parcalar = self.durum.parcalar.filter(function (p) { return p.setGrup === k.id; });
      var hatali = parcalar.some(function (p) { return self.durum.hatalar[p.uid]; });
      var seciliMi = parcalar.some(function (p) { return p.grup === secili; });
      html.push(cip(parcalar[0] ? parcalar[0].grup : k.id, st.ad + ' seti · ' + parcalar.length, 'data-kp-set-kaldir="' + kacis(k.id) + '"', hatali, seciliMi));
    });
    this.durum.parcalar
      .filter(function (p) { return !yazidaMi(p) && !(p.setGrup && setIdleri.indexOf(p.setGrup) !== -1); })
      .forEach(function (p) {
        var stok = self.stokSorunlari.some(function (s) { return s.parca.varyant === p.varyant; });
        var c0 = cip(p.grup, p.etiket, 'data-kp-kaldir="' + kacis(p.uid) + '"', !!self.durum.hatalar[p.uid] || stok, secili === p.grup);
        if (p.tip === 'aksesuar' && p.tanim.tasarlanabilir) {
          // Kalem: aksesuarın tasarım ekranına yeniden gir
          c0 = c0.replace('<button type="button" class="kp-cip__kaldir"', '<button type="button" class="kp-cip__duzenle" data-kp-aks-duzenle="' + kacis(p.uid) + '" aria-label="' + kacis(p.etiket) + ' tasarımını düzenle"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button><button type="button" class="kp-cip__kaldir"');
        }
        html.push(c0);
      });
    var yeni = html.length ? html.join('') : '<span class="kp-etiketler__bos">Eklediğin isim, rakam ve ikonlar burada görünür.</span>';
    if (kutu.innerHTML !== yeni) kutu.innerHTML = yeni;
  };

  // Etikete dokununca o patch önizlemede seçilir
  Editor.prototype.etiketSec = function (grup) {
    if (this.secili === grup) return this.sec(null);
    this.sec(grup);
    this.etiketleriCiz();
  };

  // İkon ızgarası: o an alana sığmayacak ikonlar soluk ve "Yer aç" etiketli, listenin sonunda.
  // Sığanlar başta; kendi aralarında kategorideki sıra korunur. Aynı ölçüdeki ikonlar bir kez denenir;
  // sonuç tasarım (patch konumları) değişene kadar saklanır, patch kaydırılınca hemen yenilenir.
  Editor.prototype.ikonDurumGuncelle = function () {
    var izgara = this.el && this.el.querySelector('[data-kp-ikon-izgara]');
    if (!izgara || !this.durum || this.adim !== 'ikon') return;
    var self = this;
    var dolu = this.durum.parcalar.filter(function (p) { return !self.durum.hatalar[p.uid]; });
    var anahtar = JSON.stringify(dolu.map(function (p) { return [p.uid, kutu(p.sekil)]; }));
    if (this.sigmaOnbellek && this.sigmaOnbellek.anahtar !== anahtar) this.sigmaOnbellek = null;
    if (!this.sigmaOnbellek) this.sigmaOnbellek = { anahtar: anahtar, olcu: {} };
    var onbellek = this.sigmaOnbellek.olcu;
    var kartlar = Array.prototype.slice.call(izgara.querySelectorAll('[data-kp-ikon], [data-kp-hazir-set]'));
    kartlar.forEach(function (b) {
      var setId = b.getAttribute('data-kp-hazir-set');
      if (setId) {
        var st = self.m.hazirSetHarita[setId];
        if (!st) return;
        var anahtarSet = 'set:' + st.patchler.map(function (p) { var o2 = parcaSekli(p, p.varyant, 0, 0); return o2.t + ':' + o2.r + ':' + JSON.stringify(kutu(o2)); }).join('|');
        if (!(anahtarSet in onbellek)) onbellek[anahtarSet] = !!self.setYerlestir(st, dolu, true);
        var sigarSet = onbellek[anahtarSet];
        b.classList.toggle('kp-secim--sigmaz', !sigarSet);
        b.setAttribute('aria-label', st.ad + ' seti, ' + st.patchler.length + ' patch' + (sigarSet ? '' : ', şu an yer yok'));
        b._kpSigar = sigarSet;
        return;
      }
      var ikon = self.m.ikonHarita[b.getAttribute('data-kp-ikon')];
      if (!ikon) return;
      var sigar = false;
      if (!b.disabled) {
        var ornek = parcaSekli(ikon, ikon.varyant, 0, 0);
        var o = ornek.t + ':' + ornek.r + ':' + JSON.stringify(kutu(ornek));
        if (!(o in onbellek)) onbellek[o] = !!self.yer.ilkUygun(ornek, 'icon', dolu);
        sigar = onbellek[o];
        b.classList.toggle('kp-secim--sigmaz', !sigar);
        b.setAttribute('aria-label', ikon.ad + (sigar ? '' : ', şu an yer yok'));
      }
      b._kpSigar = sigar;
    });
    // Sıra: sığanlar (kategori sırasıyla), sonra sığmayanlar ve tükenenler (kategori sırasıyla)
    var sirali = kartlar
      .map(function (b) { return { b: b, s: Number(b.getAttribute('data-sira')) }; })
      .sort(function (x, y) { return (y.b._kpSigar - x.b._kpSigar) || (x.s - y.s); })
      .map(function (x) { return x.b; });
    var degisti = sirali.some(function (b, i) { return b !== kartlar[i]; });
    if (degisti) sirali.forEach(function (b) { izgara.appendChild(b); });
  };

  /* ---------------- Uyarı kutusu ---------------- */

  // Tüm uyarılar tek yerde: önizlemenin alt kısmında, araç çubuğunun üstünde koyu kutu.
  // sure: ms sonra kendiliğinden kapanır (0: sorun bitene kadar açık kalır)
  Editor.prototype.bildir = function (metin, secenek) {
    var kutu = this.el && this.el.querySelector('[data-kp-bildirim]');
    if (!kutu) return;
    var sure = secenek && secenek.sure != null ? secenek.sure : 3500;
    clearTimeout(this.bildirimZamanlayici);
    if (kutu.textContent !== metin) kutu.textContent = metin;
    kutu.hidden = false;
    this.bildirimAnahtar = (secenek && secenek.anahtar) || null;
    var self = this;
    if (sure) this.bildirimZamanlayici = setTimeout(function () { self.bildirimKapat(); }, sure);
  };

  // anahtar verilirse yalnızca o sorunun uyarısı kapanır
  Editor.prototype.bildirimKapat = function (anahtar) {
    var kutu = this.el && this.el.querySelector('[data-kp-bildirim]');
    if (!kutu || (anahtar && this.bildirimAnahtar !== anahtar)) return;
    clearTimeout(this.bildirimZamanlayici);
    kutu.hidden = true;
    this.bildirimAnahtar = null;
  };

  // Alan sınırı: normalde görünmez; sürüklerken soluk; alan dışına taşmada kalın kırmızı ve yanıp söner
  Editor.prototype.sinirTasma = function (acik) {
    var sahne = this.sahne.sahne;
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
    var engelliAdim = this.adimlar.filter(function (a) { return a.id !== 'ozet' && self.adimEngeli(a.id); })[0];
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
      return;
    }
    var satirlar = satir(kacis(m.urun.baslik), '', p(f.urun));
    if (f.harfAdet + f.rakamAdet) satirlar += satir('Yazı ve rakam: ' + kacis(this.t.isim), '(' + (f.harfAdet + f.rakamAdet) + ' patch)', p(f.harf + f.rakam));
    var saglam = saglamSetler(m, this.t);
    var setIdleri = saglam.map(function (k) { return k.id; });
    var ikonlar = this.durum.parcalar.filter(function (x) { return x.tip === 'icon' && !(x.setGrup && setIdleri.indexOf(x.setGrup) !== -1); });
    if (ikonlar.length) satirlar += satir('İkonlar: ' + kacis(ikonlar.map(function (x) { return x.etiket; }).join(', ')), '(' + ikonlar.length + ' patch)', p(f.ikon));
    f.setler.forEach(function (s) { satirlar += satir(kacis(s.tanim.ad) + ' seti', '(' + s.tanim.patchler.length + ' patch)', p(s.tanim.fiyat)); });
    f.aksesuarlar.forEach(function (a) {
      satirlar += satir(kacis(a.tanim.ad) + (a.ozet ? ' ve tasarımı: ' + kacis(a.ozet) : ''), a.patchAdet ? '(' + a.patchAdet + ' patch)' : '', p(a.toplam));
    });
    var k = this.kampanyaSonucu();
    var adet = this.kart.adet ? this.kart.adet() : 1;
    var liste = f.toplam * adet;
    var kampanyaSatirlari = '';
    if (k && k.kampanyalar) {
      k.kampanyalar.forEach(function (x) {
        kampanyaSatirlari += satir('✓ ' + kacis(x.ad), '', '−' + p(x.tutar), 'kp-ozet__kampanya');
      });
      (k.kayiplar || []).forEach(function (x) {
        kampanyaSatirlari += satir('Sepetindeki ' + kacis(x.ad) + ' bunun yerine geçer', '', '+' + p(x.tutar), 'kp-ozet__kayip');
      });
    }
    var toplam = k && k.indirim > 0
      ? '<s class="kp-ozet__eski">' + p(liste) + '</s> <strong>' + p(liste - k.indirim) + '</strong>'
      : p(liste);
    panel.innerHTML =
      '<h3 id="kp-p-ozet" class="kp-panel__baslik" tabindex="-1">Tasarımın hazır</h3>' +
      (engelliAdim ? '<p class="kp-uyari kp-uyari--hata">' + engelliAdim.ad + ' adımında çözülmesi gereken bir sorun var.</p>' : '') +
      '<table class="kp-ozet"><tbody>' + satirlar + kampanyaSatirlari + '</tbody>' +
      '<tfoot><tr><th scope="row">Toplam</th><td>' + toplam + '</td></tr></tfoot></table>' +
      (k && k.hata ? '<p class="kp-indirim-notu kp-indirim-notu--ozet">İndirimler sepette uygulanır</p>' : '') +
      '<p class="kp-bilgi">Patch\'ler Velcro yüzeye takılır. Çanta eline geçince istediğin yere takar, istediğin zaman yerini değiştirirsin.</p>';
  };

  // Tasarımın sepet satırları (simülasyon için): varyant ve adet
  Editor.prototype.simulasyonSatirlari = function () {
    var adet = this.kart.adet ? this.kart.adet() : 1;
    if (bosMu(this.t)) return [{ v: this.m.urun.varyant, q: adet }];
    return this.kart.sepetKalemleri(adet, this.t).kalemler.map(function (k) { return { v: k.id, q: k.quantity }; });
  };

  // Kampanyalı fiyat: değişiklikler biriktirilir (350 ms), sonuç önbellekte. Hata: liste fiyatı + "İndirimler sepette uygulanır"
  Editor.prototype.kampanyaGuncelle = function () {
    if (this.alt || !this.kart.sepetKalemleri) return;
    var self = this;
    var satirlar = this.simulasyonSatirlari();
    var haric = this.duzenlenen ? this.duzenlenen.id : null;
    var anahtar = JSON.stringify([satirlar, haric]);
    if (anahtar === this.kampanyaAnahtari) return;
    this.kampanyaAnahtari = anahtar;
    clearTimeout(this.kampanyaZamanlayici);
    this.kampanyaZamanlayici = setTimeout(function () {
      kampanyaHesapla(satirlar, haric).then(
        function (s) { self.kampanyaBitti(anahtar, s); },
        function () { self.kampanyaBitti(anahtar, { hata: true }); }
      );
    }, 350);
  };

  Editor.prototype.kampanyaBitti = function (anahtar, sonuc) {
    if (anahtar !== this.kampanyaAnahtari) return;
    this.kampanya = { anahtar: anahtar, sonuc: sonuc };
    if (this.el.hidden) return;
    if (this.adim === 'ozet') this.ozetCiz();
    this.ileriYazisi();
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
    if (this.t.isimMerkez) return this.t.isimMerkez;
    return this.yer.isimYeri(isimOlculeri(this.m, this.t), this.t.harfAyri ? 0 : this.t.isimAci).merkez;
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
      pivot: grup === 'isim' ? this.isimMerkezi() : merkez(parcalar[0].sekil),
      aci: aciNormal(parcalar[0].aci)
    };
  };

  Editor.prototype.secimAdi = function (b) {
    var p = b.parcalar[0];
    if (b.grup === 'isim') return 'Yazı (' + this.t.isim + ')';
    if (p.tip === 'letter') return (p.varyant && p.varyant.renk && p.tanim && p.tanim.cokRenkli ? p.varyant.renk + ' ' : '') + p.etiket + ' harfi';
    if (p.tip === 'number') return p.etiket + ' rakamı';
    if (p.setGrup) {
      var k = (this.t.hazirSetler || []).filter(function (x) { return x.id === p.setGrup; })[0];
      var st = k && this.m.hazirSetHarita[k.urunId];
      if (st) return p.etiket + ' (' + st.ad + ' seti)';
    }
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
    if (this.bildirimAnahtar !== anahtar) return;
    var self = this;
    clearTimeout(this.bildirimZamanlayici);
    this.bildirimZamanlayici = setTimeout(function () { self.bildirimKapat(anahtar); }, ms);
  };

  // Uyarılarda patch'in adı: isim için yazılan isim, diğerlerinde seçim adı
  Editor.prototype.patchAdi = function (b) {
    return b.grup === 'isim' ? this.t.isim : this.secimAdi(b);
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
    this.el.querySelector('[data-kp-duzle]').disabled = !b.aci;
    var p0 = b.parcalar[0];
    this.el.querySelector('[data-kp-aks-tasarla]').hidden = !(p0.tip === 'aksesuar' && p0.tanim.tasarlanabilir);
    this.sahne.secimCiz(grupCercevesi(b.parcalar, b.pivot, b.aci, 0.15), !!this.durum.hatalar[b.parcalar[0].uid]);
    this.balonCiz(b);
  };

  Editor.prototype.etiketSecimiGuncelle = function () {
    var secili = this.secili;
    this.el.querySelectorAll('[data-kp-etiket-sec]').forEach(function (b) {
      var g = b.getAttribute('data-kp-etiket-sec');
      var on = !!secili && (g === secili || ((g === 'isim' || g.indexOf('harf-') === 0) && (secili === 'isim' || String(secili).indexOf('harf-') === 0)));
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
    if (gecerli) {
      this.secimDurumu('');
      this.sinirTasma(false);
    } else {
      this.secimDurumu('Bu açıda alana sığmıyor.', 0);
      this.sinirTasma(this.grupSorunu(donmus, b.digerleri) === 'tasma');
    }
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
    if (grup === 'isim') {
      t.isimAci = aci;
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
    var self = this;
    if (!this.yer.grupGecerli(grupDondur(b.parcalar, b.pivot, b.aci, hedef), b.digerleri)) {
      // Kısa bir an kırmızı göster, sonra eski açıya dön
      this.aciOnizle(b, hedef);
      this.secimDurumu('Bu açıda alana sığmıyor.');
      clearTimeout(this.donmeZamanlayici);
      this.donmeZamanlayici = setTimeout(function () {
        self.aciGostergesiGizle();
        self.sinirTasma(false);
        self.yenile();
      }, 600);
      return;
    }
    this.secimDurumu('');
    this.aciUygula(b.grup, hedef);
  };

  Editor.prototype.seciliSil = function () {
    var g = this.secili;
    if (!g) return;
    this.secili = null;
    if (g === 'isim') return this.isimAyarla('');
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

    function cmCevir(dxPx, dyPx) {
      var r = self.sahne.sahne.getBoundingClientRect();
      return [(dxPx / r.width) * self.m.Wcm, (dyPx / r.height) * self.m.Hcm];
    }

    function ekranNoktasi(cm) {
      var r = self.sahne.sahne.getBoundingClientRect();
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
        if (self.aciOnizle(iki.bilgi, a)) iki.sonGecerli = a;
        return;
      }
      if (!aktif || e.pointerId !== aktif.id) return;
      e.preventDefault();
      if (aktif.mod === 'tutamac') {
        var a2 = aciYakala(aktif.bilgi.aci + yonAcisi(e.clientX, e.clientY, aktif.c) - aktif.a0);
        if (self.aciOnizle(aktif.bilgi, a2)) aktif.sonGecerli = a2;
        return;
      }
      var d = cmCevir(e.clientX - aktif.x, e.clientY - aktif.y);
      if (!aktif.hareket && Math.abs(e.clientX - aktif.x) + Math.abs(e.clientY - aktif.y) < 3) return;
      if (!aktif.hareket) {
        self.sahne.sahne.classList.add('kp-sahne--surukleniyor');
        self.balonGizle();
      }
      aktif.hareket = true;
      aktif.dx = d[0];
      aktif.dy = d[1];
      var tasinmis = aktif.parcalar.map(function (p) {
        return kopyaParca(p, { sekil: kaydir(p.sekil, aktif.dx, aktif.dy) });
      });
      var sorun = self.grupSorunu(tasinmis, aktif.digerleri);
      var hatalar = {};
      if (sorun) {
        tasinmis.forEach(function (p) { hatalar[p.uid] = true; });
        // Metin oturum başına her sorun türü için yalnızca ilk sefer; sonra yalnızca kırmızı sınır/patch
        if (aktif.sorun !== sorun) {
          aktif.sorun = sorun;
          if (ilkKezMi('kp-uyari-' + sorun)) {
            var ad = self.patchAdi(self.grupBilgisi(aktif.grup));
            self.bildir(
              ad + (sorun === 'tasma' ? ' alanın dışına taşıyor.' : ' başka bir patch\'in üstüne geliyor.') + ' Bırakırsan son yerine döner.',
              { sure: 0, anahtar: 'surukle' }
            );
          } else {
            self.bildirimKapat('surukle');
          }
        }
      } else {
        aktif.sorun = null;
        aktif.sonGecerli = [aktif.dx, aktif.dy];
        self.bildirimKapat('surukle');
      }
      self.sinirTasma(sorun === 'tasma');
      self.sahne.konumla(tasinmis, hatalar);
    });

    function birak(e) {
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
      if (!a.hareket) return;
      var tasinmis = a.parcalar.map(function (p) {
        return kopyaParca(p, { sekil: kaydir(p.sekil, a.dx, a.dy) });
      });
      var dx = a.dx;
      var dy = a.dy;
      self.sinirTasma(false);
      if (!self.yer.grupGecerli(tasinmis, a.digerleri)) {
        // Geçersiz yerde bırakıldı: sürüklemedeki son geçerli konuma döner
        dx = a.sonGecerli[0];
        dy = a.sonGecerli[1];
        self.bildirimSonra('surukle', 1200);
      }
      if (a.grup === 'isim') {
        var c = self.isimMerkezi();
        self.t.isimMerkez = [c[0] + dx, c[1] + dy];
      } else {
        konumKaydir(self.t, a.parcalar[0], dx, dy);
      }
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
      liste.push({ uid: 'k' + i, grup: 'k' + i, tip: b.tip, tanim: b.tanim, varyant: b.v, sekil: sekil, en: o.en, boy: o.boy, aci: aci, etiket: b.v.karakter || b.tanim.ad, isimde: x.s ? true : b.tip === 'letter', setKodu: x.k || null });
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
        return parca;
      });
    // Aksesuarlar: konumdaki 'a' kayıtları (iç tasarım sepet satırından ayrıca eklenir)
    var ac0 = merkez((konum.alan && m.alanlar.filter(function (a) { return a.id === konum.alan; })[0] || m.alanBul('letter') || m.alanlar[0]).sekil);
    t.aksesuarlar = (konum.p || [])
      .filter(function (x) { return x.t === 'a'; })
      .map(function (x) {
        var aks = m.aksesuarlar.filter(function (a) { return String(a.varyant) === String(x.v); })[0];
        return aks ? { uid: x.u || yeniId('a'), urunId: aks.id, cx: ac0[0] + (Number(x.x) || 0), cy: ac0[1] + (Number(x.y) || 0), aci: Number(x.a) || 0, tasarim: null } : null;
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
      // Önce blok olarak dene: merkez harf merkezlerinin ortalaması, sonra hesaplanan blokla aradaki fark kadar kaydır
      var ayniAci = acilar.every(function (a) { return a === acilar[0]; });
      var blokOldu = false;
      if (ayniAci) {
        var ox = 0, oy = 0;
        merkezler.forEach(function (c) { ox += c[0] / merkezler.length; oy += c[1] / merkezler.length; });
        t.isimMerkez = [ox, oy];
        t.isimAci = acilar[0];
        var blok = yer.parcalar(yaziKopyasi(t)).filter(function (p) { return p.grup === 'isim'; });
        if (blok.length === merkezler.length) {
          var fx = 0, fy = 0;
          blok.forEach(function (p, i) { var c = merkez(p.sekil); fx += (merkezler[i][0] - c[0]) / blok.length; fy += (merkezler[i][1] - c[1]) / blok.length; });
          t.isimMerkez = [ox + fx, oy + fy];
          blok = yer.parcalar(yaziKopyasi(t)).filter(function (p) { return p.grup === 'isim'; });
          blokOldu = blok.every(function (p, i) { var c = merkez(p.sekil); return Math.abs(c[0] - merkezler[i][0]) < 0.25 && Math.abs(c[1] - merkezler[i][1]) < 0.25; });
        }
      }
      if (!blokOldu) {
        t.isimMerkez = null;
        t.isimAci = 0;
        t.harfAyri = true;
        t.harfKonumlari = merkezler;
        t.harfAcilari = acilar;
      }
    }
    return t;
  }

  // Küçük, alana yakın tasarım önizlemesi (kart ve sepet kartı)
  function miniSahneKur(kok, m, yer) {
    kok.style.aspectRatio = m.gorsel.en + ' / ' + m.gorsel.boy;
    var sahne = new Sahne(m, yer, kok, { etkilesimli: false });
    var y = yakinGorunum(m);
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
        y: yakinGorunum(m),
        p: parcalar.reduce(function (l, p) { return l.concat(p.tip === 'aksesuar' ? aksesuarDunyaParcalari(m, p) : [p]); }, []).map(function (p) {
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

  // Kendi indirim hesabımız yok: müşterinin sepetine dokunmadan Storefront API'de geçici sepetler oluşturulur
  // (mevcut sepet / mevcut sepet + tasarım), Shopify'ın uyguladığı kampanyalar adlarıyla okunur. Sonuçlar önbellekte.
  var KAMPANYA_API = '/api/2025-07/graphql.json';
  var kampanyaOnbellek = {};
  var sepetOnbellek = null; // { zaman, satirlar: [{ v, q, tasarim }] }

  function kampanyaSepetiniUnut() {
    sepetOnbellek = null;
  }

  // Müşterinin şu anki sepet satırları (5 sn önbellek)
  function musteriSepeti() {
    if (sepetOnbellek && Date.now() - sepetOnbellek.zaman < 5000) return Promise.resolve(sepetOnbellek.satirlar);
    var rotalar = window.routes || {};
    return fetch((rotalar.cart_url || '/cart') + '.js', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (sepet) {
        var satirlar = (sepet.items || []).map(function (k) {
          return { v: k.variant_id, q: k.quantity, tasarim: (k.properties || {})._tasarim_id || null };
        });
        sepetOnbellek = { zaman: Date.now(), satirlar: satirlar };
        return satirlar;
      });
  }

  function kurus(tutar) {
    return Math.round(parseFloat((tutar && tutar.amount) || tutar || 0) * 100) || 0;
  }

  // Kampanya adı Shopify'daki gibi, yalnızca fazla boşluklar kırpılır
  function kampanyaAdi(ad) {
    return String(ad || '').replace(/\s+/g, ' ').trim();
  }

  function sepetIndirimleri(sepet) {
    var adlar = {};
    var ekle = function (d) {
      var ad = kampanyaAdi(d.title) || 'İndirim';
      adlar[ad] = (adlar[ad] || 0) + kurus(d.discountedAmount);
    };
    (sepet.discountAllocations || []).forEach(ekle);
    ((sepet.lines && sepet.lines.nodes) || []).forEach(function (l) { (l.discountAllocations || []).forEach(ekle); });
    return adlar;
  }

  var SEPET_PARCASI =
    'fragment C on Cart { cost { totalAmount { amount } } ' +
    'discountAllocations { discountedAmount { amount } ... on CartAutomaticDiscountAllocation { title } } ' +
    'lines(first: 100) { nodes { quantity discountAllocations { discountedAmount { amount } ... on CartAutomaticDiscountAllocation { title } } } } }';

  function satirGirdisi(satirlar) {
    var birlesik = {};
    satirlar.forEach(function (s) { birlesik[s.v] = (birlesik[s.v] || 0) + s.q; });
    return Object.keys(birlesik).map(function (v) { return { merchandiseId: 'gid://shopify/ProductVariant/' + v, quantity: birlesik[v] }; });
  }

  // tasarimSatirlari: [{ v, q }]; haric: düzenlenen sepet grubunun _tasarim_id'si (onun yerini yeni tasarım alır)
  // ekSatirlar: "bir patch daha" gibi ek simülasyonlar için ([{ ad, satirlar }])
  // Sonuç: { liste, indirim, indirimli, kampanyalar: [{ ad, tutar }], ekler: { ad: { indirim, kampanyalar } } }
  function kampanyaHesapla(tasarimSatirlari, haric, ekSatirlar) {
    return musteriSepeti().then(function (mevcut) {
      var temel = mevcut.filter(function (s) { return !haric || s.tasarim !== haric; });
      var anahtar = JSON.stringify([satirGirdisi(temel), satirGirdisi(tasarimSatirlari), (ekSatirlar || []).map(function (e) { return [e.ad, satirGirdisi(e.satirlar)]; })]);
      if (kampanyaOnbellek[anahtar]) return kampanyaOnbellek[anahtar];
      var degiskenler = { a: satirGirdisi(temel), b: satirGirdisi(temel.concat(tasarimSatirlari)) };
      var tanim = '$a: [CartLineInput!]!, $b: [CartLineInput!]!';
      var govde = 'a: cartCreate(input: { lines: $a }) { cart { ...C } userErrors { message } } b: cartCreate(input: { lines: $b }) { cart { ...C } userErrors { message } }';
      (ekSatirlar || []).forEach(function (e, i) {
        degiskenler['e' + i] = satirGirdisi(temel.concat(tasarimSatirlari, e.satirlar));
        tanim += ', $e' + i + ': [CartLineInput!]!';
        govde += ' e' + i + ': cartCreate(input: { lines: $e' + i + ' }) { cart { ...C } userErrors { message } }';
      });
      var sorgu = { query: 'mutation Simulasyon(' + tanim + ') { ' + govde + ' } ' + SEPET_PARCASI, variables: degiskenler };
      var soz = fetch(KAMPANYA_API, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(sorgu) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var d = j && j.data;
          if (!d || !d.a || !d.b || !d.a.cart || !d.b.cart) throw new Error('Simülasyon başarısız');
          var once = sepetIndirimleri(d.a.cart);
          var sonra = sepetIndirimleri(d.b.cart);
          var fark = function (x, y) {
            var liste = [];
            Object.keys(y).forEach(function (ad) {
              var t = y[ad] - (x[ad] || 0);
              if (t > 0) liste.push({ ad: ad, tutar: t });
            });
            return liste;
          };
          var toplamIndirim = function (x) { return Object.keys(x).reduce(function (t, ad) { return t + x[ad]; }, 0); };
          var kampanyalar = fark(once, sonra);
          // Sepetteki bir kampanya tasarımla birlikte kalkabilir (ör. 2'li yerine 4'lü): net fark ayrıca gösterilir
          var kayiplar = fark(sonra, once);
          var sonuc = { kampanyalar: kampanyalar, kayiplar: kayiplar, indirim: toplamIndirim(sonra) - toplamIndirim(once), ekler: {}, sepetIndirim: toplamIndirim(sonra) };
          (ekSatirlar || []).forEach(function (e, i) {
            var c = d['e' + i] && d['e' + i].cart;
            if (!c) return;
            var ek = sepetIndirimleri(c);
            sonuc.ekler[e.ad] = { kampanyalar: fark(once, ek), indirim: toplamIndirim(ek) - toplamIndirim(once) };
          });
          return sonuc;
        });
      kampanyaOnbellek[anahtar] = soz;
      soz.catch(function () { delete kampanyaOnbellek[anahtar]; });
      return soz;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Ürün sayfası kartı                                                  */
  /* ------------------------------------------------------------------ */

  class KisiselKart extends HTMLElement {}

  KisiselKart.prototype.connectedCallback = function () {
    if (this._kuruldu) return;
    this._kuruldu = true;
    try {
      this.baslat();
    } catch (e) {
      // Herhangi bir hata: kart gizli kalır, sayfa bugünkü gibi çalışır
      this.hidden = true;
      if (window.console) console.warn('[kisisel] başlatılamadı:', e);
    }
  };

  KisiselKart.prototype.baslat = function () {
    var bolum = this.getAttribute('data-section-id');
    var veriEl = document.getElementById('KisiselVeri-' + bolum);
    if (!veriEl) throw new Error('Veri bulunamadı');
    this.model = new Model(JSON.parse(veriEl.textContent));
    this.yer = new Yerlesim(this.model);
    this.formId = this.getAttribute('data-form-id');
    this.bolum = bolum;
    this.depoAnahtari = 'kisisel-tasarim-' + this.model.urun.id;
    this.editor = new Editor(this);

    var self = this;
    this.querySelectorAll('[data-kisisel-ac]').forEach(function (b) {
      b.addEventListener('click', function () {
        self.notGoster('');
        self.editor.ac(bosMu(self.tasarim) ? 'yazi' : 'ikon');
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
    try {
      if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
        subscribe(PUB_SUB_EVENTS.cartUpdate, function () { self.sepetOku(); });
      }
    } catch (e) {
      /* tema pubsub yoksa */
    }
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
  };

  // Kayıtlı tasarımı okur, stoğu biten ya da artık olmayan patch'leri ayıklar, kartı günceller
  KisiselKart.prototype.kayitOku = function () {
    if (this.editor.el && !this.editor.el.hidden) return; // editör açıkken dokunma
    var kayitli = depoOku(this.depoAnahtari);
    var sonuc = kayitli && kayitli.t && kayitli.v === 1 ? this.tasarimTemizle(kayitli.t) : null;
    this.tasarim = sonuc && !bosMu(sonuc.t) ? sonuc.t : null;
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
      t.harfKonumlari = null;
      t.harfAcilari = null;
    }
    t.karakterSetleri = kalanSet;
    if (t.harfRenkleri) t.harfRenkleri = kalanRenk;
    t.harfAyri = !!t.harfAyri && Array.isArray(t.harfKonumlari);
    if (t.harfAyri) {
      t.harfKonumlari = t.harfKonumlari.filter(function (k) {
        return Array.isArray(k) && isFinite(k[0]) && isFinite(k[1]);
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
        self.sepettekiler = liste.filter(function (g) { return g.baz && String(g.baz.product_id) === String(m.urun.id); });
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
    kap.innerHTML = gruplar
      .map(function (g, i) {
        var o = g.baz.properties || {};
        var adet = Math.max(1, g.baz.quantity || 1);
        return (
          '<div class="kisisel-kart__kutu kisisel-kart__kutu--sepet' + (kompakt ? ' kisisel-kart__kutu--kompakt' : '') + '">' +
          '<div class="kisisel-kart__ust"><p class="kisisel-kart__baslik">Senin tasarımın</p><span class="kisisel-kart__sepette">✓ Sepette</span></div>' +
          '<div class="kisisel-kart__tasarim">' +
          '<div class="kisisel-kart__mini" data-kisisel-sepet-mini="' + i + '" aria-hidden="true"></div>' +
          '<div class="kisisel-kart__bilgiler">' +
          '<p class="kisisel-kart__icerik">' + kacis(String(o['Tasarım'] || '').split(' + ').join(' · ')) + '</p>' +
          '<p class="kisisel-kart__adet">' + Math.round(g.patch / adet) + ' patch' + (adet > 1 ? ' · ' + adet + ' adet' : '') + '</p>' +
          '<p class="kisisel-kart__toplam">Toplam ' + paraBicimle(g.toplam) + '</p>' +
          '</div></div>' +
          '<button type="button" class="btn btn-primary button--full-width kisisel-kart__buton kisisel-kart__sepete-git" data-kisisel-sepete-git>Sepete git</button>' +
          '<div class="kisisel-kart__butonlar">' +
          '<button type="button" class="btn btn-outline kisisel-kart__buton" data-kisisel-sepet-duzenle="' + i + '">Düzenle</button>' +
          '<button type="button" class="btn btn-outline kisisel-kart__buton kisisel-kart__sil" data-kisisel-sepet-sil="' + i + '">Sepetten sil</button>' +
          '</div>' +
          '<p class="kisisel-kart__gri-not">Düzenlediğinde sepetteki tasarımın kendiliğinden güncellenir.</p>' +
          '</div>'
        );
      })
      .join('');
    var self = this;
    gruplar.forEach(function (g, i) {
      var el = kap.querySelector('[data-kisisel-sepet-mini="' + i + '"]');
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

  function postJson(url, govde) {
    return fetch(url, {
      method: 'POST',
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

  // Bir grup kalemi sepete ekler; başarısızsa yarım kalan kalemleri geri alır ve hata fırlatır
  KisiselKart.prototype.grupEkle = function (kalemler, kimlik) {
    var self = this;
    var rotalar = window.routes || {};
    return postJson((rotalar.cart_add_url || '/cart/add') + '.js', { items: kalemler }).catch(function (e) {
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
      ornek.innerHTML = ['A', 'B', 'C']
        .map(function (h) {
          var v = set.karakterler[h];
          return v && v.gorsel ? '<img src="' + kacis(v.gorsel) + '" alt="" loading="lazy">' : '<span>' + h + '</span>';
        })
        .join('');
    }
    var fiyatEl = this.querySelector('[data-kisisel-patch-fiyat]');
    var v0 = set && Object.keys(set.karakterler).map(function (k) { return set.karakterler[k]; })[0];
    if (fiyatEl && v0 && v0.fiyat != null) fiyatEl.textContent = 'Her patch ' + paraBicimle(v0.fiyat);
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

  KisiselKart.prototype.kaydet = function () {
    depoYaz(this.depoAnahtari, bosMu(this.tasarim) ? null : { v: 1, mod: this.mod, t: this.tasarim });
  };

  // Kartın üst kısmındaki kısa not (stoktan çıkan patch'ler vb.); boş metin gizler
  KisiselKart.prototype.notGoster = function (metin) {
    var el = this.querySelector('[data-kisisel-not]');
    if (!el) return;
    el.textContent = metin || '';
    el.hidden = !metin;
  };

  // Kart içi bildirim ("Tasarım silindi · Geri al", "Tasarımın sepete eklendi"); sure sonra kapanır
  KisiselKart.prototype.bildirimGoster = function (html, sure) {
    var el = this.querySelector('[data-kisisel-bildirim]');
    var self = this;
    clearTimeout(this.bildirimZamanlayici);
    el.innerHTML = html;
    el.hidden = false;
    this.bildirimZamanlayici = setTimeout(function () {
      el.hidden = true;
      el.innerHTML = '';
      self.yedek = null;
      self.sepetYedek = null;
    }, sure || 6000);
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
    this.yedek = null;
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

  KisiselKart.prototype.tasarimKaydet = function (t) {
    this.tasarim = bosMu(t) ? null : kopyala(t);
    this.modDegistir(this.tasarim ? 'kisisel' : 'sade');
  };

  KisiselKart.prototype.guncelle = function () {
    var m = this.model;
    var t = this.tasarim;
    var f = null;
    if (!bosMu(t)) {
      f = fiyatHesapla(m, this.yer, t);
      this.querySelector('[data-kisisel-icerik]').textContent = tasarimIcerigi(m, this.yer, t);
      var adet = f.harfAdet + f.rakamAdet + f.ikonAdet;
      this.querySelector('[data-kisisel-adet]').textContent = adet + ' patch';
      this.querySelector('[data-kisisel-toplam]').textContent = 'Toplam ' + paraBicimle(f.toplam);
    }
    this.butonlariGuncelle(f);
    this.galeriGuncelle();
    this.miniGuncelle();
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
      yazi.textContent = 'Tasarımımı sepete ekle · ' + paraBicimle(f.toplam);
      if (kirmizi.offsetWidth && (yazi.scrollWidth > kirmizi.clientWidth || kirmizi.scrollWidth > kirmizi.clientWidth + 1)) {
        yazi.textContent = 'Tasarımımı sepete ekle';
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
      var anahtar = String(p.varyant.id);
      if (!gruplar[anahtar]) {
        gruplar[anahtar] = { varyant: p.varyant, tip: p.tip, adet: 0, siralar: [] };
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
      ek._tasarim_rol = 'patch';
      ek._adet_birim = String(g.adet);
      kalemler.push({ id: g.varyant.id, quantity: g.adet * adet, properties: ozellikler(ek) });
    });
    saglam.forEach(function (k) {
      var tanim = m.hazirSetHarita[k.urunId];
      kalemler.push({ id: tanim.varyant, quantity: adet, properties: ozellikler({ _tasarim_rol: 'patch', _adet_birim: '1', _patch_sayisi: String(tanim.patchler.length) }) });
    });
    return kalemler;
  }

  KisiselKart.prototype.sepetKalemleri = function (adet, tasarim) {
    var m = this.model;
    var t = kopyala(tasarim || this.tasarim);
    var d = duzenle(m, this.yer, t);
    var kimlik = tasarimKimligi();
    var ozet = tasarimOzeti(m, t);
    var konum = tasarimKonumu(m, d.parcalar, t);
    var bazOzellik = { 'Tasarım': ozet };
    if (t.isim) bazOzellik['İsim'] = t.isim;
    bazOzellik._tasarim_id = kimlik;
    bazOzellik._tasarim_rol = 'baz';
    bazOzellik._tasarim_konum = JSON.stringify(konum);
    var kalemler = [{ id: m.urun.varyant, quantity: adet, properties: bazOzellik }];
    kalemler = kalemler.concat(patchKalemleri(m, d, t, adet, { 'Tasarım': ozet, _tasarim_id: kimlik }));
    // Aksesuarlar: çanta tasarım grubunun içinde alt grup (aksesuar satırı + üzerindeki patch'ler)
    var parcalar = d.parcalar.slice();
    (t.aksesuarlar || []).forEach(function (a) {
      var aks = m.aksesuarHarita[a.urunId];
      if (!aks) return;
      var ozellik = { 'Tasarım': ozet, _tasarim_id: kimlik, _tasarim_rol: 'aksesuar', _aksesuar_id: a.uid, _adet_birim: '1' };
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
    return { kimlik: kimlik, kalemler: kalemler, fiyat: fiyatHesapla(m, this.yer, t), hatalar: d.hatalar, tasarim: t, parcalar: parcalar };
  };

  KisiselKart.prototype.sepeteEkle = function () {
    var self = this;
    if (this._yukleniyor) return;
    var m = this.model;
    var adet = this.adet();
    var paket = this.sepetKalemleri(adet);
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

    fetch(ekleUrl, {
      method: 'POST',
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
          toplam: (paket.fiyat.toplam * adet) / 100,
          para_birimi: (window.Shopify && Shopify.currency && Shopify.currency.active) || 'TRY'
        });
        try {
          if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'kisisel-editor', productVariantId: m.urun.varyant, cartData: sonuc.veri });
          }
        } catch (e) {
          /* yoksay */
        }
        cizimKitiKaydet(paket.kimlik, m, paket.parcalar);
        self.sepeteEklendi();
        if (cizim && sonuc.veri.sections && sonuc.veri.sections['cart-drawer'] && typeof cizim.renderContents === 'function') {
          cizim.renderContents({ id: m.urun.varyant, sections: sonuc.veri.sections });
          // Temanın product-form.js'i gibi: boş sepet işaretini kaldır (yoksa çekmecenin odak tutması hata verir)
          cizim.classList.remove('is-empty');
        } else {
          window.location.href = rotalar.cart_url || '/cart';
        }
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

  customElements.define('kisisel-kart', KisiselKart);

  // Test ve hata ayıklama için iç fonksiyonlar
  window.KisiselEditorIc = {
    Model: Model,
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
    geometri: { icinde: icinde, cakisir: cakisir, noktaIcinde: noktaIcinde, donukDikdortgen: donukDikdortgen, kutu: kutu, merkez: merkez, yuvarlakKoseli: yuvarlakKoseli }
  };
})();
