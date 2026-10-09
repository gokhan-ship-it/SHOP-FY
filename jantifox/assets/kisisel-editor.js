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
    // Ürünün metin karakter sınırı (kisisellestirme.metin_karakter_siniri); yoksa yalnızca geometri
    this.metinSiniri = ham.urun && parseInt(ham.urun.metin_siniri, 10) > 0 ? parseInt(ham.urun.metin_siniri, 10) : null;

    var ayar = ham.ayarlar || {};
    this.ayar = {
      harfEn: sayi(ayar.varsayilan_harf_genislik_cm) || 5.5,
      bosluk: ayar.patch_arasi_bosluk_cm != null ? Number(ayar.patch_arasi_bosluk_cm) : 0.3,
      satirBosluk: ayar.satir_arasi_bosluk_cm != null ? Number(ayar.satir_arasi_bosluk_cm) : 0.5,
      kenar: ayar.kenar_payi_cm != null ? Number(ayar.kenar_payi_cm) : 0.3,
      satir: Math.max(1, parseInt(ayar.en_fazla_satir, 10) || 2),
      // Tutar eşikli kampanyalar (ör. Ekstra %10 İndirim, 5.000 TL) ve ücretsiz kargo eşiği: katalog ayarlarından, kuruş
      kampanyaEsikleri: (Array.isArray(ayar.kampanya_tutar_esikleri) ? ayar.kampanya_tutar_esikleri : [])
        .map(function (e) { return { baslik: String(e.baslik || ''), tutar: Math.round(Number(e.tutar) * 100) || 0 }; })
        .filter(function (e) { return e.baslik && e.tutar > 0; })
        .sort(function (a, b) { return a.tutar - b.tutar; }),
      kargoEsigi: sayi(ayar.ucretsiz_kargo_esigi) ? Math.round(Number(ayar.ucretsiz_kargo_esigi) * 100) : null
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
    return !this.konumSorunu(sekil, tip);
  };

  // Parçanın tek başına konum sorunu: 'tasma' (Velcro alanın dışına taşıyor), 'yasak' (yasaklı bölgeye değiyor) ya da null
  Yerlesim.prototype.konumSorunu = function (sekil, tip) {
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
    if (!uygunAlan) return 'tasma';
    for (var j = 0; j < m.yasaklar.length; j++) if (cakisir(sekil, m.yasaklar[j], 0)) return 'yasak';
    return null;
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
          kenar: ayri ? !!(t.harfKenar && t.harfKenar[i]) : !!t.isimKenar,
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
      sonuc.sigiyor = yer.isimSatiriOlcu(isimOlculeri(model, t), isimAci) > 0 && !(model.metinSiniri && harfler.length > model.metinSiniri);
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
      t.harfKenar = hizala(t.harfKenar, false);
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
    if (!adet) t.harfAyri = false;
  }

  // Tasarımın tüm parçalarını doğrular. Hiçbir parçayı taşımaz: geçersiz yerdeki parça bırakıldığı yerde kalır,
  // hatalar'da işaretlenir. Sorun türü: 'tasma', 'yasak' ya da 'cakisma' (ile: değdiği grup). Kenardaki parçalar geçerlidir.
  function duzenle(model, yer, t) {
    renkleriAta(model, t);
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
        if (a.grup === b.grup || !cakisir(a.sekil, b.sekil, 0)) continue;
        // Üst üste gelen iki gruptan yalnızca en son taşınan/eklenen işaretlenir (bilinmiyorsa ikisi de)
        var son = t.son || [];
        var ra = son.indexOf(a.grup);
        var rb = son.indexOf(b.grup);
        var ciftler = ra === rb ? [[a, b], [b, a]] : ra > rb ? [[a, b]] : [[b, a]];
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
    if (grup === 'isim') {
      t.isimKenar = true;
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
    if (grup === 'isim') {
      t.isimKenar = false;
      t.isimMerkez = [cx, cy];
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
    return p.grup === 'isim' || String(p.grup).indexOf('harf-') === 0;
  }

  // Yazıdan i. karakteri, ona bağlı set/renk/konum bilgileriyle birlikte çıkarır
  function karakterSil(t, i) {
    var harfler = Array.from(t.isim || '');
    harfler.splice(i, 1);
    ['karakterSetleri', 'harfRenkleri', 'harfKonumlari', 'harfAcilari', 'harfKenar'].forEach(function (k) {
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
    t.harfKenar = blok.map(function () { return !!t.isimKenar; });
    t.isimKenar = false;
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
    // Harflerin hepsi kenardaysa blok da kenarda kalır; değilse blok çantaya gelir
    var kenar = Array.isArray(t.harfKenar) ? t.harfKenar : [];
    var adet = Array.from(t.isim || '').length;
    t.isimKenar = adet > 0 && kenar.length >= adet && kenar.slice(0, adet).every(Boolean);
    t.harfAyri = false;
    t.harfKonumlari = null;
    t.harfAcilari = null;
    t.harfKenar = null;
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
    var harfKenar = t.harfAyri ? (t.harfKenar || []) : [];
    var kenarVar = (!t.harfAyri && t.isimKenar && t.isim) || harfKenar.some(Boolean) ||
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
      var kenarda = k.harfAyri ? !!(k.harfKenar && k.harfKenar[i]) : !!k.isimKenar;
      var grup = k.harfAyri ? 'harf-' + i : 'isim';
      if (kenarda && !alinir(grup)) sil.push(i);
    });
    for (var i = sil.length - 1; i >= 0; i--) karakterSil(k, sil[i]);
    if (!k.isim) k.isimKenar = false;
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
          '</span>' +
          // Yazı seçiliyken tutamacın sağında Ayır / Birleştir (çerçeveyle döner, yazısı hep düz)
          '<button type="button" class="kp-cerceve__harf" data-kp-cerceve-harf hidden></button>' +
          '</div></div>'
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

  // Yakın görünüm ölçeği ve kaydırması (pencerenin yüzdesi olarak): takılabilir alan(lar) ~%80.
  // alt: pencerenin altında örtülü kısım (0–1, kenar şeridi); alan kalan bölgeye ortalanır.
  function yakinGorunum(m, alt) {
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

  // Yakın görünüm: takılabilir alan(lar) pencere genişliğinin ~%80'ini kaplar.
  Sahne.prototype.gorunumAyarla = function (yakin) {
    if (!this.gorunum) return;
    var yukseklik = this.gorunum.getBoundingClientRect().height;
    var alt = this.altBosluk && yukseklik ? Math.min(0.4, this.altBosluk / yukseklik) : 0;
    var y = yakin ? yakinGorunum(this.m, alt) : { olcek: 1, sol: 0, ust: 0 };
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
    this.adim = 'yazi';
    // İkon adımında yol: 'kendim' (kategoriler ve ikonlar) ya da 'set' (hazır setler); varsayılan kendim
    this.ikonYolu = 'kendim';
    this.kategori = this.m.kategoriler.length ? this.m.kategoriler[0].ad : null;
    this.isimOlayGonderildi = false;
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
          '<span class="kp-ust__bos" aria-hidden="true"></span>' +
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
      '<button type="button" class="kp-gecmis__dugme" data-kp-geri-al aria-label="Geri al" title="Geri al" disabled><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 7L4 12l5 5M4 12h10a6 6 0 0 1 0 12h-2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -3)"/></svg></button>' +
      '<button type="button" class="kp-gecmis__dugme" data-kp-yinele aria-label="Yinele" title="Yinele" disabled><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 7l5 5-5 5M20 12H10a6 6 0 0 0 0 12h2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -3)"/></svg></button>' +
      '</div>' +
      '<button type="button" class="kp-onizleme__dugme kp-onizleme__dugme--gorunum" data-kp-gorunum aria-pressed="false">Tüm çantayı gör</button>' +
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
      '</div>' +
      '</div>' +
      // Önizlemenin hemen altında sabit satır: seçim yokken eklenenler, seçimde adı ve araçlar (aynı yükseklik)
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
        '</div>') +
      (this.m.kalibre ? '' : '<p class="kp-onizleme__not">Önizleme ölçüleri henüz kalibre edilmedi.</p>') +
      '</div>' +
      '<div class="kp-sag">' +
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
      // Özet'te: butonun altında not ve küçük bağlantı
      '<div class="kp-alt__ozet" data-kp-alt-ozet hidden>' +
      '<p class="kp-indirim-notu">İndirimler sepette uygulanır</p>' +
      '<div class="kp-alt__baglantilar">' +
      '<button type="button" class="kp-baglanti" data-kp-urune-don>Ürün sayfasına dön</button>' +
      '</div></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      // Kampanya paneli: fiyata dokununca alttan açılır; dışına dokununca kapanır
      '<div class="kp-kpanel" data-kp-kpanel hidden>' +
      '<div class="kp-kpanel__perde" data-kp-kpanel-kapat></div>' +
      '<div class="kp-kpanel__kutu" role="dialog" aria-modal="true" aria-label="Kampanyalar">' +
      '<div class="kp-kpanel__ust"><h3 class="kp-kpanel__baslik">Kampanyalar</h3>' +
      '<button type="button" class="kp-kpanel__kapat" data-kp-kpanel-kapat aria-label="Kapat"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>' +
      '<p class="kp-kpanel__ozet" data-kp-serit-sol></p>' +
      '<ul class="kp-kpanel__liste" data-kp-kpanel-liste></ul>' +
      '<p class="kp-kpanel__birlikte" data-kp-kpanel-birlikte hidden></p>' +
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
    if (!this.alt) this.el.querySelector('[data-kp-baslik]').textContent = this.duzenlenen ? 'Sepetteki tasarımı düzenle' : 'Tasarımını oluştur';
    this.t = kopyala((secenek && secenek.tasarim) || this.kart.tasarim || bosTasarim(this.m));
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
      // Kampanya paneli: perdeye ya da ✕'e dokununca kapanır; fiyata dokununca açılır
      if (e.target.closest('[data-kp-kpanel-kapat]')) return self.kampanyaPaneli(false);
      var hedef = e.target.closest('button');
      if (!hedef || !el.contains(hedef)) return;
      if (hedef.hasAttribute('data-kp-fiyat-ac')) return self.kampanyaPaneli(true);
      if (hedef.hasAttribute('data-kp-kapat')) return self.alt ? self.altVazgec() : self.kapat(false);
      if (hedef.hasAttribute('data-kp-vazgec')) return self.altVazgec();
      if (hedef.hasAttribute('data-kp-gorunum')) {
        self.sahne.gorunumAyarla(!self.sahne.yakin);
        // Yakınlaşma bitince tutamaç ve Ayır / Birleştir önizlemeye sığdırılır
        setTimeout(function () { self.sahne.cerceveSigdir(); }, 330);
        return self.dugmeleriGuncelle();
      }
      if (hedef.hasAttribute('data-kp-harf-mod') || hedef.hasAttribute('data-kp-cerceve-harf')) return self.harfModDegistir();
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
      if (hedef.hasAttribute('data-kp-sigdir')) return self.sigdirmayiDene();
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
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (self.kpanelAcik) self.kampanyaPaneli(false);
        else if (self.onayAcik) self.onayKapat();
        else if (self.secili) self.sec(null);
        else if (self.alt) self.altVazgec();
        else self.kapat(false);
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
      var temiz = Array.from(ham).filter(function (h) { return KARAKTER_DESENI.test(h); }).join('');
      // Ürünün karakter sınırından fazlası yazılamaz
      if (self.m.metinSiniri) temiz = Array.from(temiz).slice(0, self.m.metinSiniri).join('');
      self.gecersizKarakter = temiz !== ham.replace(/\s/g, '') || /\s/.test(ham);
      if (girdi.value !== temiz) girdi.value = temiz;
      karakterleriHizala(self.t, temiz);
      sonaAl(self.t, self.t.harfAyri ? null : 'isim');
      if (self.t.isimMerkez && !self.t.harfAyri && !self.t.isimKenar) {
        var blok = self.yer.parcalar(yaziKopyasi(self.t)).filter(function (p) { return p.grup === 'isim'; });
        if (blok.some(function (p) { return self.yer.konumSorunu(p.sekil, p.tip); })) self.t.isimMerkez = null;
      }
      if (self.seciliKarakter != null && self.seciliKarakter >= Array.from(temiz).length) self.seciliKarakter = null;
      self.yaziIpucu = '';
      self.yaziZamani = Date.now();
      self.yenile();
    });
    window.addEventListener('resize', function () {
      if (!self.el.hidden) self.sahne.gorunumAyarla(self.sahne.yakin);
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
    var html = ind > 0
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
    // Yazı/Rakam/İkon: İleri her zaman çalışır (sorunlu tasarım Özet'te sepete eklenirken durdurulur)
    // Tasarım ekranında ana buton "Özete geç →" (sorunlu tasarım Özet'te sepete eklenirken durdurulur)
    if (this.adim !== 'ozet') return this.adimaGit('ozet', false, true);
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
      '<h3 id="kp-p-yazi" class="kp-gizli" tabindex="-1">Metin ekle</h3>' +
      '<div class="kp-alan-girdi">' +
      '<label for="kp-isim" class="kp-gizli">Yazı ve rakam</label>' +
      // Karakter sayacı yazı alanının içinde, sağda
      '<div class="kp-girdi-kap">' +
      '<input id="kp-isim" class="kp-girdi" type="text" data-kp-isim autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" maxlength="' + (this.m.metinSiniri || 24) + '" enterkeyhint="done" placeholder="ör. ECE7" aria-describedby="kp-yazi-ipucu kp-kapasite kp-isim-uyari">' +
      // Yazı alanının sağında, sayacın solunda: Ayır / Birleştir (2+ karakterde)
      '<button type="button" class="kp-harf-mod" data-kp-harf-mod aria-pressed="false" hidden></button>' +
      '<span id="kp-kapasite" class="kp-kapasite" data-kp-kapasite></span>' +
      '</div>' +
      '<div class="kp-stil-secim" data-kp-stil-secim role="group" aria-label="Harflerin stili" hidden></div>' +
      '<p id="kp-yazi-ipucu" class="kp-yazi-ipucu">Harflere dokunarak her birinin stilini ayrı seçebilirsin.</p>' +
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

  // İkonların ortak fiyatı (hepsi aynıysa); başlığın sağında bir kez yazılır
  Editor.prototype.ikonFiyatYazisi = function () {
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
      (v.gorsel ? '<img src="' + kacis(v.gorsel) + '" alt="" loading="lazy">' : '') +
      '<span class="kp-secim__ad">' + kacis(i.ad) + '</span>' +
      (tukendi ? '<span class="kp-secim__rozet kp-secim__rozet--tukendi">Tükendi</span>' : '') +
      '</button>';
  }

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
    var SET = 'Hazır setler';
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
      html = bolumler.map(function (b) {
        return '<section class="kp-gorsel-bolum">' +
          '<div class="kp-gorsel-bolum__ust"><h4 class="kp-gorsel-bolum__ad">' + kacis(b.ad) + (b.set ? ' <span class="kp-gorsel-bolum__ek">· indirimli</span>' : '') + '</h4>' +
          '<button type="button" class="kp-gorsel-tumu" data-kp-kategori="' + kacis(b.ad) + '">Tümü →</button></div>' +
          '<div class="kp-gorsel-sira' + (b.set ? ' kp-gorsel-sira--set' : '') + '">' +
          (b.set ? m.hazirSetler.map(function (st, i) { return setKarti(st, i); }).join('') : b.ikonlar.map(ikonKarti).join('')) +
          '</div></section>';
      }).join('');
    }
    if (kap.innerHTML !== html) kap.innerHTML = html;
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
    // Üzerine patch takılabilen (kendi Velcro yüzeyi olan) aksesuarda "Düz ekle" ve "Tasarla"; diğerlerinde "Ekle"
    var kartlar = m.aksesuarlar
      .map(function (a) {
        var ad = kacis(a.model + (a.renk ? ' ' + a.renk : ''));
        return (
          // Yatay kart: solda görsel, sağda ad ve renk, fiyat, not ve butonlar
          '<div class="kp-secim kp-secim--aksesuar">' +
          '<img src="' + kacis(a.gorsel.kucuk) + '" alt="" loading="lazy">' +
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
    var alan = this.m.alanBul('icon');
    if (!alan) return;
    var once = JSON.stringify(t);
    var c = merkez(alan.sekil);
    var d = duzenle(this.m, yer, t);
    var cantada = d.parcalar.filter(function (p) { return !p.kenar; });
    var buyuk = aksesuarBuyukMu(this.m, aks);
    // Aday konumlar: alanda (yasaklı bölge dışında) aksesuarın sığdığı yerler; maliyet = üstüne gelen patch sayısı
    var ornek = aksesuarSekli(aks, 0, 0, 0);
    var k = kutu(alan.sekil);
    var ok = kutu(ornek);
    var en = null;
    for (var y = k.y + ok.h / 2; y <= k.y + k.h - ok.h / 2 + EPS; y += 0.5) {
      for (var x = k.x + ok.w / 2; x <= k.x + k.w - ok.w / 2 + EPS; x += 0.5) {
        var sk = kaydir(ornek, x, y);
        if (!yer.alanaUygun(sk, 'aksesuar')) continue;
        var ustte = buyuk ? cantada : cantada.filter(function (p) { return cakisir(sk, p.sekil, 0); });
        var maliyet = ustte.reduce(function (t0, p) { return t0 + (p.tip === 'aksesuar' ? 100 : 1); }, 0);
        var uzaklik = Math.pow(x - c[0], 2) + Math.pow(y - c[1], 2);
        if (!en || maliyet < en.maliyet || (maliyet === en.maliyet && uzaklik < en.uzaklik)) en = { x: x, y: y, ustte: ustte, maliyet: maliyet, uzaklik: uzaklik };
      }
    }
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
    if (grup === 'isim') {
      if (!t.isimKenar) return;
      t.isimKenar = !!onceT.isimKenar;
      t.isimMerkez = onceT.isimMerkez || null;
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
      '<button type="button" class="kp-secim kp-secim--set" data-kp-hazir-set="' + s.id + '" data-sira="' + sira + '" title="' + kacis(s.ad) + ' seti">' +
      '<span class="kp-set-kart__onizleme" aria-hidden="true">' +
      s.patchler.map(function (p) { return p.varyant.gorsel ? '<img src="' + kacis(p.varyant.gorsel) + '" alt="" loading="lazy">' : ''; }).join('') +
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
    var isimP = parcalar.filter(function (p) { return p.grup === 'isim'; });
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
    if (this.parcaEkle('icon', ikon.id, ikon.varyant, ikon)) {
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
    this.bildir(
      st.ad + ' seti eklendi.' + (!kenarda ? '' : !cantada
        ? ' Alanda yer olmadığı için ' + kenarda + ' patch\'in hepsi kenarda.'
        : ' ' + cantada + '\'' + sayiEki(cantada) + ' çantada, ' + kenarda + '\'' + sayiEki(kenarda) + ' alanda yer olmadığı için kenarda.'),
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
    this.boyutZamanlayici = setTimeout(function () {
      self.setCerceveCiz();
      self.secimGuncelle();
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

  Editor.prototype.yenile = function () {
    if (!this.el || this.el.hidden) return;
    // Bekleyen "geçersiz açı" önizlemesi varsa kapat; dönüş sürmüyorsa açı göstergesi gizlenir
    clearTimeout(this.donmeZamanlayici);
    if (!this.sahne.sahne.classList.contains('kp-sahne--donuyor')) this.aciGostergesiGizle();
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
      engel = this.adimlar.some(function (a) { return self.adimEngeli(a.id); });
    }
    ileri.setAttribute('aria-disabled', engel ? 'true' : 'false');
    ileri.classList.toggle('kp-alt__ileri--engelli', !!engel);
    if (this.adim === 'ozet') this.ozetCiz();
    this.seritCiz();
    this.kazancKontrol(this.kampanyaSonucu());
    this.ileriYazisi();
    this.secimGuncelle();
    this.setCerceveCiz();
    this.kenarCiz();
    this.yerUyariCiz();
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

  // Önizlemenin altındaki açık zeminli uyarı: ilk geçersiz patch + "Alana yerleştir"
  Editor.prototype.yerUyariCiz = function () {
    var kutu = this.el.querySelector('[data-kp-yer-uyari]');
    if (!kutu) return;
    var gruplar = this.hataliGruplar();
    if (!gruplar.length) {
      kutu.hidden = true;
      kutu.innerHTML = '';
      return;
    }
    var g = gruplar[0];
    var html =
      '<p class="kp-yer-uyari__metin"><span class="kp-yer-uyari__ikon" aria-hidden="true">!</span>' +
      kacis(this.sorunMetni(g)) + ' İstediğin gibi düzenlemeye devam edebilirsin, sepete eklemeden önce düzeltmen yeterli.' +
      (gruplar.length > 1 ? ' <span class="kp-yer-uyari__ek">(+' + (gruplar.length - 1) + ' patch daha)</span>' : '') + '</p>' +
      '<div class="kp-yer-uyari__butonlar">' +
      '<button type="button" class="kp-oneri" data-kp-alana-yerlestir="' + kacis(g) + '">Alana yerleştir</button>' +
      (gruplar.length > 1 ? '<button type="button" class="kp-oneri kp-oneri--ikincil" data-kp-hepsini-duzelt>Hepsini düzelt</button>' : '') +
      '</div>';
    kutu.hidden = false;
    if (kutu.innerHTML !== html) kutu.innerHTML = html;
  };

  // Grubu (yazı, harf, ikon ya da aksesuar) dx, dy kadar kaydırır
  Editor.prototype.grubuKaydir = function (grup, ornek, dx, dy) {
    if (grup === 'isim') {
      var c = this.isimMerkezi();
      this.t.isimMerkez = [c[0] + dx, c[1] + dy];
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
    var c = grup === 'isim' ? this.yer.isimYeri(isimOlculeri(this.m, t), t.isimAci).merkez : merkez(alan.sekil);
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
    var fiyatYazi = hepsiDahil ? 'fiyata dahil' : 'fiyata dahil değil';
    if (fiyatEl.textContent !== fiyatYazi) fiyatEl.textContent = fiyatYazi;
    var dolu = !!(patch || aks);
    if (kenarEl.hidden === dolu) kenarEl.hidden = !dolu;
    if (!dolu) {
      not.hidden = true;
      not.innerHTML = '';
      return;
    }
    var parca = [patch ? patch + ' patch' : '', aks ? aks + ' aksesuar' : ''].filter(Boolean).join(' ve ');
    var notHtml = '<p>Kenarda ' + parca + ' var. Fiyata dahil değil; istersen Özet\'te sepete ekleyebilirsin.</p>' +
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
  Editor.prototype.harfModDegistir = function () {
    var t = this.t;
    if (Array.from(t.isim || '').length < 2) return;
    var ayiriyor = !t.harfAyri;
    var yaziSecili = this.secili === 'isim' || String(this.secili || '').indexOf('harf-') === 0;
    if (ayiriyor) harfleriAyir(this.yer, t);
    else harfleriBirlestir(t);
    if (yaziSecili) {
      this.secili = ayiriyor ? 'harf-0' : 'isim';
      this.seciliHarf = ayiriyor ? 0 : null;
    }
    this.yenile();
    // İlk kez ayırınca bir kez kısa bilgi
    if (ayiriyor && !depoOku('kp-harf-ayir-bilgi')) {
      depoYaz('kp-harf-ayir-bilgi', 1);
      this.bildir('Harfler ayrıldı, her birini tek tek taşıyabilirsin.', { sure: 3500 });
    }
  };

  Editor.prototype.dugmeleriGuncelle = function () {
    var ayri = !!this.t.harfAyri;
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
      var gr = girdi.getBoundingClientRect();
      var sol = b.hidden ? this.el.querySelector('[data-kp-kapasite]').getBoundingClientRect().left : b.getBoundingClientRect().left;
      if (gr.width) girdi.style.paddingRight = Math.max(48, Math.round(gr.right - sol + 8)) + 'px';
    }
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
          '<span class="kp-karakter__gorsel">' + (v && v.gorsel ? '<img src="' + kacis(v.gorsel) + '" alt="" draggable="false">' : '<span class="kp-karakter__harf">' + kacis(h) + '</span>') + '</span>' +
          '<span class="kp-karakter__stil">' + nokta + kacis(stil) + '</span>' +
          '</button>'
        );
      })
      .join('');
    kutu.hidden = !harfler.length;
    if (kutu.innerHTML !== html) kutu.innerHTML = html;

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
          '<span class="kp-stil__ornek">' + (v && v.gorsel ? '<img src="' + kacis(v.gorsel) + '" alt="">' : '<span>' + kacis(h) + '</span>') + '</span>' +
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
    if (this.gecersizKarakter) {
      uyarilar.push('<p class="kp-uyari kp-uyari--bilgi">Yazıda yalnızca harf ve rakam kullanabilirsin.</p>');
    }
    if (this.m.metinSiniri && harfSayisi >= this.m.metinSiniri) {
      uyarilar.push('<p class="kp-uyari kp-uyari--bilgi" data-kp-sinir-notu>Bu ürüne en fazla ' + this.m.metinSiniri + ' karakter yazılabilir.</p>');
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
      var isimSecili = secili === 'isim' || (secili && String(secili).indexOf('harf-') === 0);
      var isimKenar = this.durum.parcalar.some(function (p) { return yazidaMi(p) && p.kenar; });
      html.push(cip(t.harfAyri ? 'harf-0' : 'isim', t.isim, 'data-kp-isim-kaldir', isimHatali, isimSecili, isimKenar));
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
    if (kutu.innerHTML !== yeni) kutu.innerHTML = yeni;
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
  Editor.prototype.bildir = function (metin, secenek) {
    var kutu = this.el && this.el.querySelector('[data-kp-bildirim]');
    if (!kutu) return;
    var eylem = secenek && secenek.eylem;
    var sure = secenek && secenek.sure != null ? secenek.sure : eylem ? 6000 : 3500;
    clearTimeout(this.bildirimZamanlayici);
    this.bildirimEylemFn = eylem ? eylem.fn : null;
    var html = '<span>' + kacis(metin) + '</span>' + (eylem ? ' <button type="button" class="kp-bildirim__eylem" data-kp-bildirim-eylem>' + kacis(eylem.yazi) + '</button>' : '');
    if (kutu.innerHTML !== html) kutu.innerHTML = html;
    kutu.hidden = false;
    this.bildirimAnahtar = (secenek && secenek.anahtar) || null;
    var self = this;
    if (sure) this.bildirimZamanlayici = setTimeout(function () { self.bildirimKapat(); }, sure);
  };

  Editor.prototype.bildirimEylemi = function () {
    var fn = this.bildirimEylemFn;
    this.bildirimKapat();
    if (typeof fn === 'function') fn.call(this);
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

  /* ---------------- Özet: kenardaki patch'ler ---------------- */

  // Kenardaki öğeler (Özet kartı için): her biri tek seçim. Tamamı kenarda olan set tek öğe; bir kısmı çantada olan
  // setin kenardaki patch'leri set fiyatına zaten dahil olduğu için listelenmez.
  // { anahtar, gruplar (t.kenarAl'a girecek grup adları), ad, parcalar }
  Editor.prototype.kenarOgeleri = function () {
    var self = this;
    var m = this.m;
    var d = this.durum;
    if (this.alt || !d) return [];
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
    return '<div class="kp-kenar-kart" data-kp-kenar-kart>' +
      '<p class="kp-kenar-kart__baslik">Kenarda kullanmadığın ' + sayi + ' var</p>' +
      '<p class="kp-kenar-kart__aciklama">Bunları da almak ister misin? Çantaya sonradan istediğin zaman takabilirsin. Almak istemediklerine dokunup seçimi kaldırabilirsin.</p>' +
      '<div class="kp-kenar-kart__ogeler" role="group" aria-label="Kenardaki patch\'ler">' + kartlar + '</div>' +
      '<div class="kp-kenar-kart__butonlar">' +
      '<button type="button" class="kp-kenar-kart__dugme" data-kp-kenar-hayir>Hayır, almayacağım</button>' +
      '<button type="button" class="kp-kenar-kart__dugme kp-kenar-kart__dugme--ana" data-kp-kenar-evet' + (secilen ? '' : ' disabled') + '>Evet, ekle (+' + paraBicimle(fark) + ')</button>' +
      '</div>' +
      '<p class="kp-kenar-kart__not">Eklersen kampanya indirimin de yeniden hesaplanır.</p>' +
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
    var yerListesi = hataliGruplar.length
      ? '<div class="kp-yer-uyari kp-yer-uyari--ozet" data-kp-ozet-yer><p class="kp-yer-uyari__metin"><span class="kp-yer-uyari__ikon" aria-hidden="true">!</span>Sepete eklemeden önce şu patch\'lerin yerini düzeltmen gerekiyor:</p>' +
        '<ul class="kp-yer-uyari__liste">' + hataliGruplar.map(function (g) { return '<li>' + kacis(self.sorunMetni(g)) + '</li>'; }).join('') + '</ul>' +
        '<div class="kp-yer-uyari__butonlar"><button type="button" class="kp-oneri" data-kp-hepsini-duzelt>Hepsini düzelt</button></div>' +
        '<p class="kp-yer-uyari__not">Hepsini düzelt, her patch\'i en yakın uygun yere taşır; yer yoksa kenara alır.</p></div>'
      : '';
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
    // Satırlar satın alınacak tasarımdan: kenarda kalan (eklenmeyen) patch'ler yok
    var tS = satinAlinacak(m, this.t);
    var dS = tS === this.t ? this.durum : duzenle(m, this.yer, tS);
    var satirlar = satir(kacis(m.urun.baslik), '', p(f.urun));
    if (f.harfAdet + f.rakamAdet) satirlar += satir('Yazı ve rakam: ' + kacis(tS.isim), '(' + (f.harfAdet + f.rakamAdet) + ' patch)', p(f.harf + f.rakam));
    var saglam = saglamSetler(m, tS);
    var setIdleri = saglam.map(function (k) { return k.id; });
    var ikonlar = dS.parcalar.filter(function (x) { return x.tip === 'icon' && !(x.setGrup && setIdleri.indexOf(x.setGrup) !== -1); });
    if (ikonlar.length) satirlar += satir('İkonlar: ' + kacis(ikonlar.map(function (x) { return x.etiket; }).join(', ')), '(' + ikonlar.length + ' patch)', p(f.ikon));
    f.setler.forEach(function (s) { satirlar += satir(kacis(s.tanim.ad) + ' seti', '(' + s.tanim.patchler.length + ' patch)', p(s.tanim.fiyat)); });
    f.aksesuarlar.forEach(function (a) {
      satirlar += satir(kacis(a.tanim.ad) + (a.ozet ? ' ve tasarımı: ' + kacis(a.ozet) : ''), a.patchAdet ? '(' + a.patchAdet + ' patch)' : '', p(a.toplam));
    });
    var k = this.kampanyaSonucu();
    var adet = this.kart.adet ? this.kart.adet() : 1;
    var liste = f.toplam * adet;
    var kampanyaSatirlari = '';
    // Kampanya satırları: bu tasarımın satırlarına düşen indirimler
    var pay = k && !k.hata ? k.tasarimPay || null : null;
    if (pay) {
      Object.keys(pay).forEach(function (ad) {
        if (pay[ad] > 0) kampanyaSatirlari += satir('✓ ' + kacis(kampanyaGosterimAdi(ad)), '', '−' + p(pay[ad]), 'kp-ozet__kampanya');
      });
    } else if (k && k.kampanyalar) {
      k.kampanyalar.forEach(function (x) {
        kampanyaSatirlari += satir('✓ ' + kacis(kampanyaGosterimAdi(x.ad)), '', '−' + p(x.tutar), 'kp-ozet__kampanya');
      });
    }
    var ozInd = tasarimIndirimi(k);
    var toplam = ozInd > 0
      ? '<s class="kp-ozet__eski">' + p(liste) + '</s> <strong>' + p(liste - ozInd) + '</strong>'
      : p(liste);
    panel.innerHTML =
      '<h3 id="kp-p-ozet" class="kp-panel__baslik" tabindex="-1">Tasarımın hazır</h3>' +
      (engelliAdim ? '<p class="kp-uyari kp-uyari--hata">' + engelliAdim.ad + ' adımında çözülmesi gereken bir sorun var.</p>' : '') +
      yerListesi +
      this.kenarKartiHtml() +
      '<table class="kp-ozet"><tbody>' + satirlar + kampanyaSatirlari + '</tbody>' +
      '<tfoot><tr><th scope="row">Toplam</th><td>' + toplam + '</td></tr></tfoot></table>' +
      (k && k.hata ? '<p class="kp-indirim-notu kp-indirim-notu--ozet">İndirimler sepette uygulanır</p>' : '') +
      '<p class="kp-bilgi">Patch\'ler Velcro yüzeye takılır. Çanta eline geçince istediğin yere takar, istediğin zaman yerini değiştirirsin.</p>';
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
      return ana.kart.sepetKalemleri(adet0, t).kalemler.map(function (k) { return { v: k.id, q: k.quantity }; });
    }
    var adet = this.kart.adet ? this.kart.adet() : 1;
    if (bosMu(this.t)) return [{ v: this.m.urun.varyant, q: adet }];
    return this.kart.sepetKalemleri(adet, this.t).kalemler.map(function (k) { return { v: k.id, q: k.quantity }; });
  };

  // Kampanyalı fiyat: değişiklikler biriktirilir (350 ms), sonuç önbellekte. Hata: liste fiyatı + "İndirimler sepette uygulanır"
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
    }, 350);
  };

  // Shopify'ın sonucu: yerel hesapla aynıysa bir şey değişmez; farklıysa fiyat sessizce düzeltilir
  Editor.prototype.kampanyaBitti = function (anahtar, sonuc) {
    if (anahtar !== this.kampanyaAnahtari) return;
    var onceki = this.kampanya && this.kampanya.anahtar === anahtar ? this.kampanya.sonuc : null;
    // Simülasyon başarısız: yerel hesap varsa o kalır, yoksa liste fiyatı ve "İndirimler sepette uygulanır"
    if (sonuc.hata && onceki && !onceki.hata) return;
    this.kampanya = { anahtar: anahtar, sonuc: sonuc };
    if (ayniKampanya(onceki, sonuc)) return;
    if (this.el.hidden) return;
    if (this.adim === 'ozet') this.ozetCiz();
    var f = fiyatHesapla(this.m, this.yer, this.t);
    if (this.alt) this.altToplamCiz(f);
    else this.toplamCiz(f.toplam);
    this.seritCiz();
    this.kazancKontrol(sonuc);
    this.ileriYazisi();
  };

  // Alt çubuğun en üstündeki 3 px ilerleme çizgisi (Özet'te yok) ve kampanya panelinin içeriği. Tasarım değişince
  // sıradaki kampanya yakınsa öneri birkaç saniyeliğine çubuğun üstünde belirir.
  Editor.prototype.seritCiz = function () {
    var serit = this.el && this.el.querySelector('[data-kp-serit]');
    if (!serit) return;
    var k = this.kampanyaSonucu();
    var kok = this.kok();
    var esikler = kok ? kok.m.ayar.kampanyaEsikleri : [];
    var kural = kurallariOku();
    var d = k && !k.hata ? seritDurumu(k, kural ? kural.merdiven : [], esikler, kok ? ornekPatchFiyati(kok.m) : null, kok ? enUcuzPatchFiyati(kok.m) : null) : null;
    this.kampanyaDurumu = d;
    var goster = !!d && this.adim !== 'ozet' && !!(d.sol || d.sag || d.duraklar.length);
    serit.hidden = !goster;
    this.el.querySelector('[data-kp-fiyat-ac]').disabled = !d;
    if (!d) return this.kampanyaPaneli(false);
    this.kampanyaPaneliCiz(k, d);
    if (!goster) return;
    serit.classList.toggle('kp-serit--tamam', d.hepsi);
    var dolu = this.el.querySelector('[data-kp-serit-dolu]');
    dolu.style.width = (d.dolu * 100).toFixed(1) + '%';
    // Renk geçişi tüm çubuğa yayılır: dolu kısım ilerledikçe kırmızıdan turuncuya
    dolu.style.backgroundSize = d.dolu > 0 ? (100 / d.dolu).toFixed(1) + '% 100%' : '100% 100%';
    this.oneriKontrol(d);
  };

  // Kampanya paneli: kazanılan kampanyalar (bu tasarıma düşen tutarlarıyla), sepettekilerle birlikte notu,
  // sıradaki hedef tek cümle ve duraklı ilerleme çubuğu
  Editor.prototype.kampanyaPaneliCiz = function (k, d) {
    var nokta = function (x) { return !x || /[.!?…]$|\p{Extended_Pictographic}$/u.test(x) ? x : x + '.'; };
    var pay = k.tasarimPay || k.aktif || {};
    var adlar = Object.keys(pay).filter(function (ad) { return pay[ad] > 0; });
    var tasarimInd = tasarimIndirimi(k);
    // Üstte: "370 TL indirim kazandın" (sepettekiler de katkı veriyorsa "(sepetindekilerle birlikte)")
    this.el.querySelector('[data-kp-serit-sol]').textContent = d.sag ? nokta(d.sol) : d.sol;
    var liste = this.el.querySelector('[data-kp-kpanel-liste]');
    var html = adlar.map(function (ad) {
      return '<li><span>✓ ' + kacis(kampanyaGosterimAdi(ad)) + '</span><strong>−' + paraBicimle(pay[ad]) + '</strong></li>';
    }).join('');
    if (liste.innerHTML !== html) liste.innerHTML = html;
    liste.hidden = !adlar.length;
    // İndirimin bir kısmı sepetteki diğer ürünlerden geliyorsa: satırlar bu tasarıma düşen tutarlardır
    var birlikte = this.el.querySelector('[data-kp-kpanel-birlikte]');
    var fark = d.indirim - tasarimInd;
    birlikte.hidden = !(fark >= 100 && adlar.length);
    if (!birlikte.hidden) birlikte.textContent = 'Bu tasarıma düşen indirim ' + paraBicimle(tasarimInd) + ', kalanı sepetindeki diğer ürünlerden.';
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

  Editor.prototype.kampanyaPaneli = function (ac) {
    var panel = this.el && this.el.querySelector('[data-kp-kpanel]');
    if (!panel) return;
    ac = !!ac && !!this.kampanyaDurumu;
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
      self.sonOneri = metin;
      self.altBildirim({ tur: 'oneri', metin: metin, anahtar: anahtar });
    }, 700);
  };

    // Kazanma bildirimi: bir kampanyaya oturumda ilk kez ulaşıldığında (müşterinin sepetinde zaten olanlar hariç)
  Editor.prototype.kazancKontrol = function (k) {
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
    this.altBildirim({ tur: 'kazanc', metin: metin, ad: ad });
  };

  // Alt çubuğun üstündeki kısa bildirimler: kazanma bildirimi (kırmızı) ve kampanya önerisi (koyu).
  // Kazanma bildirimi öneriden önce gelir: öneri gösterilirken kazanç gelirse öneri kesilir ve sonra yeniden gösterilir.
  Editor.prototype.altBildirim = function (b) {
    var el = this.el.querySelector('[data-kp-kazanc]');
    if (!el) return;
    var self = this;
    var simdiki = this.altBildirimSimdiki;
    if (simdiki && simdiki.tur === 'kazanc' && b.tur === 'oneri') {
      this.altBildirimSirasi = b;
      return;
    }
    if (simdiki && simdiki.tur === 'oneri' && b.tur === 'kazanc') this.altBildirimSirasi = simdiki;
    this.altBildirimSimdiki = b;
    var i = b.metin.indexOf(' ');
    el.innerHTML = b.tur === 'kazanc'
      ? '<span class="kp-kazanc__ikon" aria-hidden="true">' + kacis(b.metin.slice(0, i)) + '</span><span>' + kacis(b.metin.slice(i + 1)) + '</span>'
      : '<span class="kp-kazanc__ikon" aria-hidden="true">🎯</span><span>' + kacis(b.metin) + '</span>';
    el.classList.toggle('kp-kazanc--oneri', b.tur === 'oneri');
    el.hidden = false;
    el.classList.remove('kp-kazanc--goster');
    void el.offsetWidth;
    el.classList.add('kp-kazanc--goster');
    if (b.tur === 'kazanc' && b.ad) {
      var nokta = this.el.querySelector('.kp-kpanel [data-kp-durak="' + (window.CSS && CSS.escape ? CSS.escape(b.ad) : b.ad) + '"]');
      if (nokta) nokta.classList.add('kp-kpanel__durak--atim');
    }
    clearTimeout(this.kazancZamanlayici);
    this.kazancZamanlayici = setTimeout(function () {
      el.hidden = true;
      el.classList.remove('kp-kazanc--goster');
      self.altBildirimSimdiki = null;
      var sira = self.altBildirimSirasi;
      self.altBildirimSirasi = null;
      // Sıradaki öneri hâlâ güncel tasarıma aitse gösterilir
      if (sira && self.el && !self.el.hidden && self.adim !== 'ozet' && (sira.tur !== 'oneri' || sira.anahtar === self.kampanyaAnahtari)) self.altBildirim(sira);
    }, b.tur === 'kazanc' ? 2600 : 3200);
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
    if (p.tip === 'letter') return p.etiket + ' harfi';
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

    var p0 = b.parcalar[0];
    this.el.querySelector('[data-kp-aks-tasarla]').hidden = !(p0.tip === 'aksesuar' && p0.tanim.tasarlanabilir);
    var kenarda = !!p0.kenar;
    this.el.querySelectorAll('[data-kp-dondur]').forEach(function (x) { x.hidden = kenarda; });
    // Önizlemede, tutamacın sağında: yazı seçiliyken Ayır (blok) / Birleştir (ayrı harf); yazı alanındaki butonla aynı durum
    var harfBtn = this.el.querySelector('[data-kp-cerceve-harf]');
    var yazi = b.grup === 'isim' || String(b.grup).indexOf('harf-') === 0;
    harfBtn.hidden = !yazi || kenarda || Array.from(this.t.isim || '').length < 2;
    var harfHtml = this.t.harfAyri ? 'Birleştir' : '<span aria-hidden="true">↔</span> Ayır';
    if (harfBtn.innerHTML !== harfHtml) harfBtn.innerHTML = harfHtml;
    harfBtn.setAttribute('aria-label', this.t.harfAyri ? 'Harfleri birleştir' : 'Harfleri ayır');
    this.el.querySelectorAll('[data-kp-kenar-grup]').forEach(function (x) { x.classList.toggle('kp-kenar__oge--secili', x.getAttribute('data-kp-kenar-grup') === b.grup); });
    if (kenarda) this.sahne.secimCiz(null);
    else this.sahne.secimCiz(grupCercevesi(b.parcalar, b.pivot, b.aci, 0.15), !!this.durum.hatalar[b.parcalar[0].uid]);
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
    this.sinirTasma(!gecerli && this.grupSorunu(donmus, b.digerleri) === 'tasma');
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
    // Geçersiz açıda da uygulanır: patch kırmızı işaretlenir, sepete eklemeden önce düzeltilir
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
      // Çerçevedeki Ayır / Birleştir: yalnızca tıklama (sürükleme, seçim kaldırma yok)
      if (e.target.closest('[data-kp-cerceve-harf]')) return;
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
      var d = cmCevir(e.clientX - aktif.x, e.clientY - aktif.y);
      if (!aktif.hareket && Math.abs(e.clientX - aktif.x) + Math.abs(e.clientY - aktif.y) < 3) return;
      if (!aktif.hareket) {
        self.sahne.sahne.classList.add('kp-sahne--surukleniyor');
        self.balonGizle();
        // Kenar bölgesi kırmızı kesikli "Kenara bırak" olarak belirir (aksesuar ekranında kenar yok)
        if (self.el.querySelector('[data-kp-kenar]')) self.el.querySelector('.kp-onizleme').classList.add('kp-onizleme--surukle');
      }
      aktif.hareket = true;
      aktif.dx = d[0];
      aktif.dy = d[1];
      var tasinmis = aktif.parcalar.map(function (p) {
        return kopyaParca(p, { sekil: kaydir(p.sekil, aktif.dx, aktif.dy) });
      });
      // Kenarın üstündeyse bırakınca kenara alınır
      var kenarEl = self.el.querySelector('[data-kp-kenar]');
      var kr = kenarEl && kenarEl.getBoundingClientRect();
      aktif.kenaraBirak = !!kr && e.clientX >= kr.left && e.clientX <= kr.right && e.clientY >= kr.top && e.clientY <= kr.bottom;
      if (kenarEl) kenarEl.classList.toggle('kp-kenar--hedef', aktif.kenaraBirak);
      // Aksesuarın Velcro yüzeyinin üstündeyse bırakınca aksesuarın tasarımına geçer
      var hedefAks = aktif.kenaraBirak ? null : self.aksesuarHedefi(aktif.grup, tasinmis);
      self.aksesuarHedefiCiz(hedefAks && hedefAks.uid);
      var sorun = aktif.kenaraBirak || hedefAks ? null : self.grupSorunu(tasinmis, aktif.digerleri);
      var hatalar = {};
      if (sorun) tasinmis.forEach(function (p) { hatalar[p.uid] = true; });
      self.sinirTasma(sorun === 'tasma');
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
      if (a.grup === 'isim') {
        var c = self.isimMerkezi();
        self.t.isimMerkez = [c[0] + dx, c[1] + dy];
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
      liste.push({ uid: 'k' + i, grup: 'k' + i, tip: b.tip, tanim: b.tanim, varyant: b.v, sekil: sekil, en: o.en, boy: o.boy, aci: aci, etiket: b.v.karakter || b.tanim.ad, isimde: x.s ? true : b.tip === 'letter', setKodu: x.k || null, kenar: !!x.e });
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
      // Kenardaki harfler: hepsi kenardaysa blok kenarda; bir kısmı kenardaysa harfler ayrı
      var kenarlar = harfler.map(function (p) { return !!p.kenar; });
      var hepsiKenar = kenarlar.every(Boolean);
      if (blokOldu && kenarlar.some(Boolean) && !hepsiKenar) blokOldu = false;
      if (!blokOldu) {
        t.isimMerkez = null;
        t.isimAci = 0;
        t.harfAyri = true;
        t.harfKonumlari = merkezler;
        t.harfAcilari = acilar;
        if (kenarlar.some(Boolean)) t.harfKenar = kenarlar;
      } else if (hepsiKenar) {
        t.isimKenar = true;
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
        y: yakinGorunum(m),
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
    return (sepet.items || []).map(function (k) {
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

  function tasarimPayiSepetten(cart, tasarim) {
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
      if (!v || !miktar[v] || !l.quantity) return;
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
    // Gösterim tam TL (Shopify'ın satır payları kuruşlu olabilir)
    Object.keys(pay).forEach(function (ad) { pay[ad] = Math.round(pay[ad] / 100) * 100; if (!pay[ad]) delete pay[ad]; });
    sonuc.tasarimPay = pay;
    sonuc.tasarimIndirim = toplamIndirim(pay);
    return sonuc;
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
    var ekle = function (v, p, f) { if (v != null) h[String(v)] = { p: String(p), f: Number(f) || 0 }; };
    ekle(m.urun.varyant, m.urun.id, m.urun.fiyat);
    m.setler.concat(m.rakamSetleri).forEach(function (s) { s.varyantlar.forEach(function (v) { ekle(v.id, s.id, v.fiyat); }); });
    m.ikonlar.forEach(function (i) { i.varyantlar.forEach(function (v) { ekle(v.id, i.id, v.fiyat); }); });
    (m.hazirSetler || []).forEach(function (s) { ekle(s.varyant, s.id, s.fiyat); });
    (m.aksesuarlar || []).forEach(function (a) { ekle(a.varyant, a.id, a.fiyat); });
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
    if (kayit) return kayit;
    return yerelKampanya(m, satirlariZenginlestir(m, temel), satirlariZenginlestir(m, tasarimSatirlari), (ekler || []).map(function (e) { return { ad: e.ad, satirlar: satirlariZenginlestir(m, e.satirlar) }; }));
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
    kuralSozu = fetch(KAMPANYA_API, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: 'mutation Kurallar(' + tanim.join(', ') + ') { ' + govde.join(' ') + ' } ' + SEPET_PARCASI, variables: degiskenler }) })
      .then(function (r) { return r.json(); })
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
          var ekler = {};
          (ekSatirlar || []).forEach(function (e, i) {
            var c = d['e' + i] && d['e' + i].cart;
            if (!c) return;
            var ek = sepetIndirimleri(c);
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
          else if (m) payEkle(sonuc, tasarimPayiSepetten(d.b.cart, satirlariZenginlestir(m, tasarimSatirlari)));
          sonucSakla(anahtar, sonuc);
          return sonuc;
        });
      kampanyaOnbellek[anahtar] = soz;
      soz.catch(function () { delete kampanyaOnbellek[anahtar]; });
      return soz;
    });
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
  function seritDurumu(k, merdiven, esikler, ornekFiyat, enUcuz) {
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
    if (sonrakiAdet) {
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
      if (tekPatch && kalan <= tekPatch && (!birPatch || (birPatch.aktif && birPatch.aktif[esik.ad]))) {
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
    // İndirimin bir kısmı sepetteki diğer ürünlerden geliyorsa belirtilir
    var birlikte = k.tasarimIndirim != null && indirim - k.tasarimIndirim >= 100;
    var sol = indirim > 0
      ? paraBicimle(indirim) + ' indirim kazandın' + (birlikte ? ' (sepetindekilerle birlikte)' : '') + (hepsi ? ' 🎉' : '')
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
      duraklar: duraklar.map(function (d, i) { return { ad: d.ad, ulasildi: d.ulasildi, konum: (i + 1) / say }; }),
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
    // Kampanya kuralları sayfa açılırken arka planda öğrenilir (saklanır); editörde fiyat anında hesaplanır
    kurallariOgren(this.model).then(function () {
      if (!bosMu(self.tasarim)) {
        self.kartKampanyaAnahtari = null;
        self.guncelle();
      }
    }, function () {});
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
    var html = 'Toplam ' + (tutar.indirim ? '<s class="kisisel-kart__eski">' + paraBicimle(tutar.liste) + '</s> ' : '') + paraBicimle(tutar.odenecek);
    if (el.innerHTML !== html) el.innerHTML = html;
  };

  // Kartın kampanyalı fiyatı: editördeki simülasyonun aynısı (müşterinin sepeti + bu tasarım), birleştirilmiş ve önbellekli
  KisiselKart.prototype.kartKampanyaGuncelle = function () {
    if (bosMu(this.tasarim)) return;
    var self = this;
    var satirlar = this.sepetKalemleri(this.adet(), this.tasarim).kalemler.map(function (k) { return { v: k.id, q: k.quantity }; });
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
      yazi.textContent = 'Tasarımımı sepete ekle · ' + paraBicimle(this.kartTutar(f).odenecek);
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
    var kalemler = [{ id: m.urun.varyant, quantity: adet, properties: bazOzellik }];
    kalemler = kalemler.concat(patchKalemleri(m, d, t, adet, { 'Tasarım': ozet, _tasarim_id: kimlik }));
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
    geometri: { icinde: icinde, cakisir: cakisir, noktaIcinde: noktaIcinde, donukDikdortgen: donukDikdortgen, kutu: kutu, merkez: merkez, yuvarlakKoseli: yuvarlakKoseli }
  };
})();
