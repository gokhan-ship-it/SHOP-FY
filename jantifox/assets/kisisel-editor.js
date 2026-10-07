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
      var v = window.sessionStorage.getItem(anahtar);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return null;
    }
  }

  function depoYaz(anahtar, deger) {
    try {
      if (deger == null) window.sessionStorage.removeItem(anahtar);
      else window.sessionStorage.setItem(anahtar, JSON.stringify(deger));
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

  function merkez(s) {
    if (s.t === 'rect') return [s.x + s.w / 2, s.y + s.h / 2];
    return [s.cx, s.cy];
  }

  function kutu(s) {
    if (s.t === 'rect') return { x: s.x, y: s.y, w: s.w, h: s.h };
    if (s.t === 'circle') return { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 };
    return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 };
  }

  // m > 0: şekli içeri daraltır, m < 0: dışarı genişletir
  function noktaIcinde(px, py, s, m) {
    m = m || 0;
    if (s.t === 'rect') {
      return px >= s.x + m - EPS && px <= s.x + s.w - m + EPS && py >= s.y + m - EPS && py <= s.y + s.h - m + EPS;
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
      return { t: 'rect', x: x / pxCm, y: y / pxCm, w: w / pxCm, h: h / pxCm };
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
        sekil: p.sekil === 'circle' ? 'circle' : 'rect',
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
        s.karakterler = {};
        s.varyantlar.forEach(function (v) {
          if (v.karakter) s.karakterler[v.karakter] = v;
        });
        return s;
      })
      .filter(Boolean);

    this.rakamSetleri = (ham.rakamlar || [])
      .map(function (p) {
        var s = patchHazirla(p);
        if (!s) return null;
        s.karakterler = {};
        s.varyantlar.forEach(function (v) {
          if (v.karakter) s.karakterler[v.karakter] = v;
        });
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

    if (!this.setler.length) throw new Error('Harf seti verisi eksik');
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

  /* ------------------------------------------------------------------ */
  /* Yerleşim ve doğrulama                                               */
  /* ------------------------------------------------------------------ */

  function Yerlesim(model) {
    this.m = model;
  }

  // İsim harflerini verilen merkeze, verilen satır sayısıyla dizer
  // Harfin gerçek ölçüsü: varyantın PNG ölçüsü, yoksa setin temsili ölçüsü
  function harfOlcu(set, h) {
    var v = set.karakterler[h];
    return { en: (v && v.en) || set.en, boy: (v && v.boy) || set.boy };
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

  Yerlesim.prototype.alanaUygun = function (sekil, tip) {
    var m = this.m;
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

  // İsim, alana tek başına (diğer patch'ler olmadan) kaç satırda sığıyor? 0 = sığmıyor
  // olculer: harflerin gerçek ölçüleri [{en, boy}]
  Yerlesim.prototype.isimSatiriOlcu = function (olculer) {
    var adet = olculer.length;
    var alan = this.m.alanBul('letter');
    if (!alan || adet === 0) return adet === 0 ? 1 : 0;
    var c = merkez(alan.sekil);
    var self = this;
    for (var satir = 1; satir <= Math.min(this.m.ayar.satir, 2); satir++) {
      if (satir === 2 && adet < 2) break;
      var dizi = this.isimDiz(olculer, c[0], c[1], satir);
      var tamam = dizi.every(function (p) {
        return self.alanaUygun(dikdortgen(p.cx, p.cy, p.en, p.boy), 'letter');
      });
      if (tamam) return satir;
    }
    return 0;
  };

  // Temsili (ortanca) harf ölçüsüyle: kapasite göstergesi için
  Yerlesim.prototype.isimSatiri = function (adet, set) {
    var olculer = [];
    for (var i = 0; i < adet; i++) olculer.push({ en: set.en, boy: set.boy });
    return this.isimSatiriOlcu(olculer);
  };

  Yerlesim.prototype.kapasite = function (set) {
    var enFazla = 0;
    for (var n = 1; n <= 40; n++) {
      if (this.isimSatiri(n, set)) enFazla = n;
      else if (n > enFazla + 2) break;
    }
    return enFazla;
  };

  // Tasarımdaki tüm yerleşik parçaların şekillerini üretir
  Yerlesim.prototype.parcalar = function (t) {
    var m = this.m;
    var liste = [];
    var set = m.set(t.setId);
    if (t.isim) {
      var harfler = Array.from(t.isim);
      var alan = m.alanBul('letter');
      var c = t.isimMerkez || (alan ? merkez(alan.sekil) : [m.Wcm / 2, m.Hcm / 2]);
      var olculer = harfler.map(function (h) { return harfOlcu(set, h); });
      var satir = this.isimSatiriOlcu(olculer) || Math.min(m.ayar.satir, harfler.length > 1 ? 2 : 1);
      var dizi = this.isimDiz(olculer, c[0], c[1], satir);
      var ayri = !!t.harfAyri;
      harfler.forEach(function (h, i) {
        var v = set.karakterler[h] || null;
        // Ayrı modda her harf kendi konumunda ve kendi grubunda sürüklenir
        var k = ayri && t.harfKonumlari && t.harfKonumlari[i] ? t.harfKonumlari[i] : [dizi[i].cx, dizi[i].cy];
        liste.push({
          uid: (ayri ? 'harf-' : 'isim-') + i,
          grup: ayri ? 'harf-' + i : 'isim',
          sira: i,
          tip: 'letter',
          tanim: set,
          varyant: v,
          etiket: h,
          sekil: dikdortgen(k[0], k[1], dizi[i].en, dizi[i].boy)
        });
      });
    }
    t.parcalar.forEach(function (p) {
      var tanim = p.tip === 'number' ? m.rakamSeti() : m.ikonHarita[p.urunId];
      if (!tanim) return;
      var varyant = null;
      tanim.varyantlar.forEach(function (v) {
        if (String(v.id) === String(p.varyantId)) varyant = v;
      });
      liste.push({
        uid: p.uid,
        grup: p.uid,
        tip: p.tip,
        tanim: tanim,
        varyant: varyant,
        etiket: p.tip === 'number' ? (varyant && varyant.karakter) || '' : tanim.ad,
        sekil: parcaSekli(tanim, varyant, p.cx, p.cy)
      });
    });
    return liste;
  };

  // Rakam/ikon şekli: varyantın PNG ölçüsü varsa o, yoksa ürünün ölçüsü
  function parcaSekli(tanim, varyant, cx, cy) {
    var en = (varyant && varyant.en) || tanim.en;
    var boy = (varyant && varyant.boy) || tanim.boy;
    if (tanim.sekil === 'circle') return { t: 'circle', cx: cx, cy: cy, r: Math.max(en, boy) / 2 };
    return dikdortgen(cx, cy, en, boy);
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
    var tip = grupParcalari[0].tip;
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
    var a = m.alanBul(tip);
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

  // İsim analizi: eksik harf, stok, sığma
  function isimAnaliz(model, yer, t) {
    var set = model.set(t.setId);
    var harfler = Array.from(t.isim || '');
    var sonuc = { harfler: harfler, eksikler: [], yoklar: [], stokSorunlari: [], sigiyor: true, kapasite: yer.kapasite(set) };
    var sayim = {};
    var gorulen = {};
    harfler.forEach(function (h) {
      var v = set.karakterler[h];
      if (!v) {
        if (gorulen[h]) return;
        gorulen[h] = true;
        var oneri = TR_ESLEME[h];
        var ov = oneri && set.karakterler[oneri];
        if (ov && ov.satilabilir && (ov.stok == null || ov.stok > 0)) sonuc.eksikler.push({ harf: h, oneri: oneri });
        else sonuc.yoklar.push(h);
        return;
      }
      sayim[h] = (sayim[h] || 0) + 1;
    });
    Object.keys(sayim).forEach(function (h) {
      var v = set.karakterler[h];
      var mevcut = !v.satilabilir ? 0 : v.stok == null ? Infinity : v.stok;
      if (mevcut < sayim[h]) sonuc.stokSorunlari.push({ harf: h, gereken: sayim[h], mevcut: mevcut });
    });
    if (harfler.length) {
      sonuc.sigiyor = yer.isimSatiriOlcu(harfler.map(function (h) { return harfOlcu(set, h); })) > 0;
    }
    sonuc.engel = sonuc.eksikler.length > 0 || sonuc.yoklar.length > 0 || sonuc.stokSorunlari.length > 0 || !sonuc.sigiyor;
    return sonuc;
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
    t.parcalar.forEach(function (x) {
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
      return;
    }
    var adet = Array.from(t.isim || '').length;
    var mevcut = Array.isArray(t.harfKonumlari) ? t.harfKonumlari.slice(0, adet) : [];
    if (mevcut.length < adet) {
      var blok = yer.parcalar({ setId: t.setId, isim: t.isim, isimMerkez: t.isimMerkez, parcalar: [] });
      for (var i = mevcut.length; i < adet; i++) mevcut.push(merkez(blok[i].sekil));
    }
    t.harfKonumlari = mevcut;
    if (!adet) t.harfAyri = false;
  }

  // Tasarımın tüm parçalarını doğrular, çakışan parçaları en yakın geçerli yere taşır
  function duzenle(model, yer, t) {
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
    var harfHatali = parcalar.some(function (p) { return p.tip === 'letter' && hatalar[p.uid]; });
    return { parcalar: yer.parcalar(t), hatalar: hatalar, isimGecerli: isimGecerli && !harfHatali };
  }

  // Blok ismi ayrı harflere böler: her harf bulunduğu yerde kalır
  function harfleriAyir(yer, t) {
    if (!t.isim || t.harfAyri) return;
    var blok = yer.parcalar(t).filter(function (p) { return p.grup === 'isim'; });
    t.harfKonumlari = blok.map(function (p) { return merkez(p.sekil); });
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
  }

  function stokKontrol(model, t, yer, adet) {
    adet = adet || 1;
    var gerek = {};
    var bilgi = {};
    yer.parcalar(t).forEach(function (p) {
      if (!p.varyant) return;
      gerek[p.varyant.id] = (gerek[p.varyant.id] || 0) + adet;
      bilgi[p.varyant.id] = p;
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
    var satirlar = { harf: 0, harfAdet: 0, rakam: 0, rakamAdet: 0, ikon: 0, ikonAdet: 0 };
    yer.parcalar(t).forEach(function (p) {
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
    satirlar.toplam = satirlar.urun + satirlar.harf + satirlar.rakam + satirlar.ikon;
    satirlar.patchToplam = satirlar.harf + satirlar.rakam + satirlar.ikon;
    return satirlar;
  }

  function tasarimOzeti(model, t) {
    var parcalar = [];
    if (t.isim) parcalar.push(t.isim);
    var rakamlar = t.parcalar.filter(function (p) { return p.tip === 'number'; });
    var ikonlar = t.parcalar.filter(function (p) { return p.tip === 'icon'; });
    var rs = model.rakamSeti();
    rakamlar.forEach(function (p) {
      var v = rs && rs.varyantlar.filter(function (x) { return String(x.id) === String(p.varyantId); })[0];
      if (v) parcalar.push(v.karakter || v.baslik);
    });
    ikonlar.forEach(function (p) {
      var i = model.ikonHarita[p.urunId];
      if (i) parcalar.push(i.ad);
    });
    return parcalar.join(' + ');
  }

  function bosMu(t) {
    return !t || (!t.isim && (!t.parcalar || !t.parcalar.length));
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
          return '<rect class="kp-alan" data-alan="' + kacis(a.id) + '" x="' + s.x + '" y="' + s.y + '" width="' + s.w + '" height="' + s.h + '" rx="0.4" />';
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
      '</div>';
    // Editörde sahne bir görünüm penceresi içinde durur; yakınlaştırma sahnenin
    // genişliği ve konumuyla yapılır (transform yok), böylece tüm hesaplar aynı kalır.
    this.kok.innerHTML = this.etkilesimli
      ? '<div class="kp-gorunum" style="aspect-ratio:' + g.en + ' / ' + g.boy + '">' + sahneHtml + '</div>'
      : sahneHtml;
    this.gorunum = this.kok.querySelector('.kp-gorunum');
    this.sahne = this.kok.querySelector('.kp-sahne');
    this.katman = this.kok.querySelector('.kp-sahne__parcalar');
  };

  // Yakın görünüm: takılabilir alan(lar) pencere genişliğinin ~%80'ini kaplar.
  Sahne.prototype.gorunumAyarla = function (yakin) {
    if (!this.gorunum) return;
    var m = this.m;
    var olcek = 1;
    var sol = 0;
    var ust = 0;
    if (yakin && m.alanlar.length) {
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
    this.yakin = !!yakin && olcek > 1;
    if (yakin) this.yakinlasabilir = olcek > 1.01;
    this.sahne.style.width = olcek * 100 + '%';
    this.sahne.style.left = sol + '%';
    this.sahne.style.top = ust + '%';
    var img = this.sahne.querySelector('.kp-sahne__urun');
    var genislik = this.gorunum.getBoundingClientRect().width;
    if (img && genislik) img.sizes = Math.ceil(genislik * olcek) + 'px';
  };

  Sahne.prototype.ciz = function (parcalar, hatalar, alanHatali) {
    var m = this.m;
    var html = parcalar
      .map(function (p) {
        var k = kutu(p.sekil);
        var stil =
          'left:' + (k.x / m.Wcm) * 100 + '%;top:' + (k.y / m.Hcm) * 100 + '%;width:' + (k.w / m.Wcm) * 100 + '%;height:' + (k.h / m.Hcm) * 100 + '%';
        var gorsel = p.varyant && p.varyant.gorsel;
        var sinif = 'kp-parca kp-parca--' + p.tip + (p.sekil.t === 'circle' ? ' kp-parca--daire' : '') + (hatalar && hatalar[p.uid] ? ' kp-parca--hatali' : '') + (p.varyant && !p.varyant.png ? ' kp-parca--jpg' : '') + (!p.varyant ? ' kp-parca--eksik' : '');
        var ic = gorsel
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
      var k = kutu(p.sekil);
      el.style.left = (k.x / m.Wcm) * 100 + '%';
      el.style.top = (k.y / m.Hcm) * 100 + '%';
      el.classList.toggle('kp-parca--hatali', !!(hatalar && hatalar[p.uid]));
    });
  };

  /* ------------------------------------------------------------------ */
  /* Editör                                                              */
  /* ------------------------------------------------------------------ */

  var ADIMLAR = [
    { id: 'yazi', ad: 'Yazı' },
    { id: 'rakam', ad: 'Rakam' },
    { id: 'ikon', ad: 'İkon' },
    { id: 'ozet', ad: 'Özet' }
  ];

  function Editor(kart) {
    this.kart = kart;
    this.m = kart.model;
    this.yer = kart.yer;
    this.adim = 'yazi';
    this.kategori = this.m.kategoriler.length ? this.m.kategoriler[0].ad : null;
    this.isimOlayGonderildi = false;
  }

  Editor.prototype.kur = function () {
    if (this.el) return;
    var el = document.createElement('div');
    el.className = 'kp-editor';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'kp-editor-baslik');
    el.hidden = true;
    el.innerHTML =
      '<div class="kp-ust">' +
      '<h2 id="kp-editor-baslik" class="kp-ust__baslik">Tasarımını oluştur</h2>' +
      '<button type="button" class="kp-kapat" data-kp-kapat aria-label="Kapat">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '</button>' +
      '</div>' +
      '<div class="kp-kaydir">' +
      '<div class="kp-onizleme"><div class="kp-onizleme__ic" style="--kp-oran:' + (this.m.gorsel.en / this.m.gorsel.boy) + '">' +
      '<div data-kp-sahne></div>' +
      '<button type="button" class="kp-onizleme__dugme kp-onizleme__dugme--gorunum" data-kp-gorunum aria-pressed="false">Tüm çantayı gör</button>' +
      '</div>' +
      (this.m.kalibre ? '' : '<p class="kp-onizleme__not">Önizleme ölçüleri henüz kalibre edilmedi.</p>') +
      '</div>' +
      '<nav class="kp-adimlar" aria-label="Tasarım adımları"><ol>' +
      ADIMLAR.map(function (a, i) {
        return '<li><button type="button" class="kp-adim" data-kp-adim="' + a.id + '"><span class="kp-adim__no">' + (i + 1) + '</span><span class="kp-adim__ad">' + a.ad + '</span></button></li>';
      }).join('') +
      '</ol></nav>' +
      '<div class="kp-paneller">' +
      '<section class="kp-panel" data-kp-panel="yazi" aria-labelledby="kp-p-yazi"></section>' +
      '<section class="kp-panel" data-kp-panel="rakam" aria-labelledby="kp-p-rakam" hidden></section>' +
      '<section class="kp-panel" data-kp-panel="ikon" aria-labelledby="kp-p-ikon" hidden></section>' +
      '<section class="kp-panel" data-kp-panel="ozet" aria-labelledby="kp-p-ozet" hidden></section>' +
      '</div>' +
      '</div>' +
      '<div class="kp-alt">' +
      '<div class="kp-alt__fiyat"><span>Toplam</span><strong data-kp-toplam></strong><small class="kp-indirim-notu">İndirimler sepette uygulanır</small></div>' +
      '<button type="button" class="btn btn-primary kp-alt__ileri" data-kp-ileri>İleri</button>' +
      '</div>';
    document.body.appendChild(el);
    this.el = el;
    this.sahne = new Sahne(this.m, this.yer, el.querySelector('[data-kp-sahne]'), { etkilesimli: true });
    this.panelYaziKur();
    this.panelRakamKur();
    this.panelIkonKur();
    this.olaylariBagla();
  };

  Editor.prototype.ac = function (adim) {
    this.kur();
    this.t = kopyala(this.kart.tasarim || bosTasarim(this.m));
    this.ilk = JSON.stringify(this.t);
    this.donusOdagi = document.activeElement;
    this.kaydirmaY = window.pageYOffset;
    document.documentElement.classList.add('kp-kilit');
    document.body.style.top = -this.kaydirmaY + 'px';
    this.el.hidden = false;
    this.sahne.gorunumAyarla(true);
    this.adimaGit(adim || 'yazi', true);
    this.yenile();
    var self = this;
    setTimeout(function () {
      var kapat = self.el.querySelector('[data-kp-kapat]');
      if (kapat) kapat.focus();
    }, 50);
    olayYayinla('kisisellestirme_acildi', { urun_id: this.m.urun.id, urun_adi: this.m.urun.baslik });
  };

  Editor.prototype.kapat = function (kaydet) {
    if (!kaydet && JSON.stringify(this.t) !== this.ilk) {
      if (!window.confirm('Tasarımında yaptığın değişiklikler kaydedilmeyecek. Çıkmak istiyor musun?')) return;
    }
    if (kaydet) this.kart.tasarimKaydet(this.t);
    this.el.hidden = true;
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
      if (hedef.hasAttribute('data-kp-kapat')) return self.kapat(false);
      if (hedef.hasAttribute('data-kp-gorunum')) {
        self.sahne.gorunumAyarla(!self.sahne.yakin);
        return self.dugmeleriGuncelle();
      }
      if (hedef.hasAttribute('data-kp-harf-mod')) {
        if (self.t.harfAyri) harfleriBirlestir(self.t);
        else harfleriAyir(self.yer, self.t);
        return self.yenile();
      }
      if (hedef.hasAttribute('data-kp-adim')) return self.adimaGit(hedef.getAttribute('data-kp-adim'));
      if (hedef.hasAttribute('data-kp-ileri')) return self.ileri();
      if (hedef.hasAttribute('data-kp-oneri-kabul')) return self.harfDegistir(hedef.getAttribute('data-harf'), hedef.getAttribute('data-oneri'));
      if (hedef.hasAttribute('data-kp-harf-sil')) return self.harfDegistir(hedef.getAttribute('data-harf'), '');
      if (hedef.hasAttribute('data-kp-bas-harf')) return self.isimAyarla(Array.from(self.t.isim)[0] || '');
      if (hedef.hasAttribute('data-kp-bas-harf-rakam')) {
        self.isimAyarla(Array.from(self.t.isim)[0] || '');
        self.rakamIpucu = true;
        return self.adimaGit('rakam');
      }
      if (hedef.hasAttribute('data-kp-takma-ad')) {
        self.isimAyarla('');
        var girdi = self.el.querySelector('[data-kp-isim]');
        girdi.placeholder = 'Takma ad (en fazla ' + self.analiz.kapasite + ' harf)';
        girdi.focus();
        return;
      }
      if (hedef.hasAttribute('data-kp-isimsiz')) {
        self.isimAyarla('');
        return self.adimaGit('ikon');
      }
      if (hedef.hasAttribute('data-kp-rakam')) return self.rakamEkle(hedef.getAttribute('data-kp-rakam'));
      if (hedef.hasAttribute('data-kp-ikon')) return self.ikonEkle(hedef.getAttribute('data-kp-ikon'));
      if (hedef.hasAttribute('data-kp-kategori')) {
        self.kategori = hedef.getAttribute('data-kp-kategori');
        return self.ikonIzgarasiCiz();
      }
      if (hedef.hasAttribute('data-kp-kaldir')) return self.parcaKaldir(hedef.getAttribute('data-kp-kaldir'));
    });
    el.addEventListener('change', function (e) {
      if (e.target.matches('[data-kp-set]')) {
        self.t.setId = e.target.value;
        self.isimAyarla(self.t.isim);
      }
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') self.kapat(false);
      if (e.key === 'Tab') self.odakTuzagi(e);
    });
    var girdi = el.querySelector('[data-kp-isim]');
    girdi.addEventListener('input', function () {
      var ham = buyukHarf(girdi.value);
      var temiz = Array.from(ham).filter(function (h) { return HARF_DESENI.test(h); }).join('');
      self.gecersizKarakter = temiz !== ham.replace(/\s/g, '') || /\s/.test(ham);
      if (girdi.value !== temiz) girdi.value = temiz;
      self.t.isim = temiz;
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
    this.t.isim = isim;
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
    if (adim === 'rakam' || adim === 'ikon') {
      var tip = adim === 'rakam' ? 'number' : 'icon';
      var self = this;
      var hatali = this.t.parcalar.some(function (p) { return p.tip === tip && self.durum.hatalar[p.uid]; });
      var stok = this.stokSorunlari.some(function (s) { return s.parca.tip === tip; });
      return hatali || stok;
    }
    return false;
  };

  Editor.prototype.adimaGit = function (adim, zorla) {
    var hedefSira = ADIMLAR.map(function (a) { return a.id; }).indexOf(adim);
    var simdiSira = ADIMLAR.map(function (a) { return a.id; }).indexOf(this.adim);
    if (!zorla && hedefSira > simdiSira) {
      for (var i = 0; i < hedefSira; i++) {
        if (this.adimEngeli(ADIMLAR[i].id)) {
          this.adim = ADIMLAR[i].id;
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
    var ileri = this.el.querySelector('[data-kp-ileri]');
    ileri.textContent = adim === 'ozet' ? 'Tamam' : 'İleri';
  };

  Editor.prototype.ileri = function () {
    if (this.adimEngeli(this.adim)) {
      this.yenile();
      var uyari = this.el.querySelector('[data-kp-panel="' + this.adim + '"] .kp-uyari--hata');
      if (uyari) uyari.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    var sira = ADIMLAR.map(function (a) { return a.id; }).indexOf(this.adim);
    if (this.adim === 'ozet') {
      for (var i = 0; i < ADIMLAR.length; i++) {
        if (this.adimEngeli(ADIMLAR[i].id)) return this.adimaGit(ADIMLAR[i].id, true);
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
      return this.kapat(true);
    }
    this.adimaGit(ADIMLAR[sira + 1].id);
  };

  /* ---------------- Paneller ---------------- */

  Editor.prototype.panelYaziKur = function () {
    var m = this.m;
    var panel = this.el.querySelector('[data-kp-panel="yazi"]');
    var setler = m.setler
      .map(function (s, i) {
        var ornek = ['A', 'B', 'C']
          .map(function (h) {
            var v = s.karakterler[h];
            return v && v.gorsel ? '<img src="' + kacis(v.gorsel) + '" alt="" loading="lazy">' : '<span>' + h + '</span>';
          })
          .join('');
        return (
          '<label class="kp-set">' +
          '<input type="radio" name="kp-set" value="' + kacis(s.id) + '" data-kp-set' + (i === 0 ? ' checked' : '') + '>' +
          '<span class="kp-set__ornek" aria-hidden="true">' + ornek + '</span>' +
          '<span class="kp-set__ad">' + kacis(s.ad) + '</span>' +
          '</label>'
        );
      })
      .join('');
    panel.innerHTML =
      '<h3 id="kp-p-yazi" class="kp-panel__baslik" tabindex="-1">Yazı</h3>' +
      '<fieldset class="kp-setler"><legend>Harf seti</legend>' + setler + '</fieldset>' +
      '<div class="kp-alan-girdi">' +
      '<label for="kp-isim" class="kp-etiket">İsim <span class="kp-etiket__not">(isteğe bağlı)</span></label>' +
      '<input id="kp-isim" class="kp-girdi" type="text" data-kp-isim autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" maxlength="24" enterkeyhint="done" aria-describedby="kp-kapasite kp-isim-uyari">' +
      '<div class="kp-isim-alt">' +
      '<button type="button" class="kp-harf-mod" data-kp-harf-mod aria-pressed="false" hidden>Harfleri ayır</button>' +
      '<p id="kp-kapasite" class="kp-kapasite" data-kp-kapasite></p>' +
      '</div>' +
      '</div>' +
      '<div id="kp-isim-uyari" class="kp-uyarilar" data-kp-isim-uyari aria-live="polite"></div>' +
      '<button type="button" class="kp-baglanti" data-kp-isimsiz>İsim istemiyorum, sadece ikonla devam et</button>';
    var girdi = panel.querySelector('[data-kp-isim]');
    girdi.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        girdi.blur();
      }
    });
  };

  Editor.prototype.panelRakamKur = function () {
    var panel = this.el.querySelector('[data-kp-panel="rakam"]');
    var rs = this.m.rakamSeti();
    var izgara = rs
      ? rs.varyantlar
          .filter(function (v) { return v.karakter; })
          .map(function (v) {
            return (
              '<button type="button" class="kp-secim kp-secim--rakam" data-kp-rakam="' + v.id + '">' +
              (v.gorsel ? '<img src="' + kacis(v.gorsel) + '" alt="" loading="lazy">' : '') +
              '<span class="kp-secim__ad">' + kacis(v.karakter) + '</span>' +
              '</button>'
            );
          })
          .join('')
      : '<p>Rakam patch\'leri şu an kullanılamıyor.</p>';
    panel.innerHTML =
      '<h3 id="kp-p-rakam" class="kp-panel__baslik" tabindex="-1">Rakam</h3>' +
      '<p class="kp-panel__aciklama">Yaş, forma numarası ya da şanslı sayın. Eklediğin rakamı önizlemede sürükleyerek yerleştirebilirsin.</p>' +
      '<div class="kp-uyarilar" data-kp-rakam-ipucu aria-live="polite"></div>' +
      '<div class="kp-izgara kp-izgara--rakam">' + izgara + '</div>' +
      '<ul class="kp-eklenenler" data-kp-eklenen="number"></ul>' +
      '<div class="kp-uyarilar" data-kp-uyari="number" aria-live="polite"></div>';
  };

  Editor.prototype.panelIkonKur = function () {
    var panel = this.el.querySelector('[data-kp-panel="ikon"]');
    var kategoriler = this.m.kategoriler
      .map(function (k) {
        return '<button type="button" class="kp-kategori" data-kp-kategori="' + kacis(k.ad) + '">' + kacis(k.ad) + '</button>';
      })
      .join('');
    panel.innerHTML =
      '<h3 id="kp-p-ikon" class="kp-panel__baslik" tabindex="-1">İkon</h3>' +
      '<p class="kp-panel__aciklama" data-kp-kalan aria-live="polite"></p>' +
      '<div class="kp-kategoriler" role="group" aria-label="İkon kategorileri">' + kategoriler + '</div>' +
      '<div class="kp-izgara kp-izgara--ikon" data-kp-ikon-izgara></div>' +
      '<ul class="kp-eklenenler" data-kp-eklenen="icon"></ul>' +
      '<div class="kp-uyarilar" data-kp-uyari="icon" aria-live="polite"></div>';
    this.ikonIzgarasiCiz();
  };

  Editor.prototype.ikonIzgarasiCiz = function () {
    var m = this.m;
    var self = this;
    var kat = m.kategoriler.filter(function (k) { return k.ad === self.kategori; })[0] || m.kategoriler[0];
    if (!kat) return;
    this.el.querySelectorAll('[data-kp-kategori]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-kp-kategori') === kat.ad ? 'true' : 'false');
    });
    this.el.querySelector('[data-kp-ikon-izgara]').innerHTML = kat.ikonlar
      .map(function (i) {
        var v = i.varyant;
        var tukendi = !v.satilabilir || v.stok === 0;
        return (
          '<button type="button" class="kp-secim kp-secim--ikon" data-kp-ikon="' + i.id + '"' + (tukendi ? ' disabled' : '') + '>' +
          (v.gorsel ? '<img src="' + kacis(v.gorsel) + '" alt="" loading="lazy">' : '') +
          '<span class="kp-secim__ad">' + kacis(i.ad) + '</span>' +
          '<span class="kp-secim__fiyat">' + (tukendi ? 'Tükendi' : paraBicimle(v.fiyat)) + '</span>' +
          '</button>'
        );
      })
      .join('');
    this.ikonDurumGuncelle();
  };

  /* ---------------- Ekleme / kaldırma ---------------- */

  Editor.prototype.parcaEkle = function (tip, urunId, varyant, tanim) {
    var uyariKutusu = this.el.querySelector('[data-kp-uyari="' + tip + '"]');
    var mevcut = !varyant.satilabilir ? 0 : varyant.stok == null ? Infinity : varyant.stok;
    var kullanilan = this.t.parcalar.filter(function (p) { return String(p.varyantId) === String(varyant.id); }).length;
    if (kullanilan + 1 > mevcut) {
      uyariKutusu.innerHTML = '<p class="kp-uyari kp-uyari--hata">' + kacis(tip === 'number' ? varyant.karakter + ' rakamı' : tanim.ad) + ' için yeterli stok yok.</p>';
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
      uyariKutusu.innerHTML = '<p class="kp-uyari kp-uyari--hata">' + kacis(tip === 'number' ? 'Bu rakam' : tanim.ad) + ' için alanda yer kalmadı. Başka bir parçayı kaldırmayı ya da daha küçük bir ikon seçmeyi deneyebilirsin.</p>';
      return false;
    }
    uyariKutusu.innerHTML = '';
    this.t.parcalar.push({ uid: yeniId(tip === 'number' ? 'r' : 'i'), tip: tip, urunId: urunId, varyantId: varyant.id, cx: c[0] + tasima[0], cy: hedefY + tasima[1] });
    this.yenile();
    return true;
  };

  Editor.prototype.rakamEkle = function (varyantId) {
    var rs = this.m.rakamSeti();
    var v = rs.varyantlar.filter(function (x) { return String(x.id) === String(varyantId); })[0];
    if (!v) return;
    this.rakamIpucu = false;
    this.parcaEkle('number', rs.id, v, rs);
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
    this.yenile();
  };

  /* ---------------- Yenileme ---------------- */

  Editor.prototype.yenile = function () {
    if (!this.el || this.el.hidden) return;
    this.analiz = isimAnaliz(this.m, this.yer, this.t);
    this.durum = duzenle(this.m, this.yer, this.t);
    this.stokSorunlari = stokKontrol(this.m, this.t, this.yer, 1);
    var alanHatali = !this.durum.isimGecerli || Object.keys(this.durum.hatalar).length > 0;
    this.sahne.ciz(this.durum.parcalar, this.durum.hatalar, alanHatali);
    this.dugmeleriGuncelle();
    this.yaziDurumGuncelle();
    this.eklenenleriCiz('number');
    this.eklenenleriCiz('icon');
    this.ikonDurumGuncelle();
    var ipucu = this.el.querySelector('[data-kp-rakam-ipucu]');
    if (ipucu) ipucu.innerHTML = this.rakamIpucu ? '<p class="kp-uyari kp-uyari--bilgi">Şimdi baş harfinin yanına bir rakam seç.</p>' : '';
    var f = fiyatHesapla(this.m, this.yer, this.t);
    this.el.querySelector('[data-kp-toplam]').textContent = paraBicimle(f.toplam);
    var ileri = this.el.querySelector('[data-kp-ileri]');
    var engel = this.adimEngeli(this.adim);
    if (this.adim === 'ozet') {
      var self = this;
      engel = ADIMLAR.some(function (a) { return self.adimEngeli(a.id); });
    }
    ileri.setAttribute('aria-disabled', engel ? 'true' : 'false');
    ileri.classList.toggle('kp-alt__ileri--engelli', !!engel);
    if (this.adim === 'ozet') this.ozetCiz();
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

  Editor.prototype.yaziDurumGuncelle = function () {
    var a = this.analiz;
    var set = this.m.set(this.t.setId);
    var harfSayisi = a.harfler.length;
    var kapasite = this.el.querySelector('[data-kp-kapasite]');
    kapasite.textContent = harfSayisi + ' / ' + a.kapasite;
    kapasite.classList.toggle('kp-kapasite--asim', harfSayisi > a.kapasite);
    this.el.querySelectorAll('[data-kp-set]').forEach(function (r) {
      r.checked = String(r.value) === String(set.id);
      r.closest('label').classList.toggle('kp-secili', r.checked);
    });
    var uyarilar = [];
    if (this.gecersizKarakter) {
      uyarilar.push('<p class="kp-uyari kp-uyari--bilgi">İsimde yalnızca harf kullanabilirsin.</p>');
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
      uyarilar.push(
        '<div class="kp-uyari kp-uyari--hata"><p>' + h + ' harfi bu sette şu an yok.</p>' +
        '<div class="kp-uyari__butonlar"><button type="button" class="kp-oneri" data-kp-harf-sil data-harf="' + h + '">' + h + ' harfini sil</button></div></div>'
      );
    });
    a.stokSorunlari.forEach(function (s) {
      uyarilar.push(
        '<p class="kp-uyari kp-uyari--hata">' +
        (s.mevcut === 0
          ? s.harf + ' harfi şu an stokta yok.'
          : s.harf + ' harfinden stokta ' + s.mevcut + ' adet var, isimde ' + s.gereken + ' kez geçiyor.') +
        '</p>'
      );
    });
    if (!a.sigiyor && harfSayisi) {
      var ilk = a.harfler[0];
      uyarilar.push(
        '<div class="kp-uyari kp-uyari--hata"><p>' + kacis(this.t.isim) + ' bu çantaya sığmıyor (en fazla ' + a.kapasite + ' harf).</p>' +
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

  Editor.prototype.eklenenleriCiz = function (tip) {
    var liste = this.el.querySelector('[data-kp-eklenen="' + tip + '"]');
    if (!liste) return;
    var self = this;
    var parcalar = this.durum.parcalar.filter(function (p) { return p.tip === tip; });
    liste.innerHTML = parcalar
      .map(function (p) {
        var hatali = self.durum.hatalar[p.uid];
        var stok = self.stokSorunlari.filter(function (s) { return s.parca.varyant === p.varyant; })[0];
        var not = hatali ? ' <span class="kp-eklenen__not">Alana sığmıyor</span>' : stok ? ' <span class="kp-eklenen__not">Stok yetersiz</span>' : '';
        var ad = tip === 'number' ? p.etiket + ' rakamı' : p.etiket;
        return (
          '<li class="kp-eklenen' + (hatali || stok ? ' kp-eklenen--hatali' : '') + '">' +
          '<span>' + kacis(ad) + not + '</span>' +
          '<button type="button" class="kp-kaldir" data-kp-kaldir="' + kacis(p.uid) + '" aria-label="' + kacis(ad) + ' kaldır">Kaldır</button>' +
          '</li>'
        );
      })
      .join('');
  };

  Editor.prototype.ikonDurumGuncelle = function () {
    var kalan = this.el && this.el.querySelector('[data-kp-kalan]');
    if (!kalan || !this.durum) return;
    var self = this;
    var ornek = this.sonIkon || { en: 6, boy: 6, sekil: 'rect' };
    var dolu = this.durum.parcalar.filter(function (p) { return !self.durum.hatalar[p.uid]; });
    var n = this.yer.kalanYer(dolu, ornek.en, ornek.boy, ornek.sekil, 'icon');
    var olcu = this.sonIkon ? ' (' + kacis(this.sonIkon.ad) + ' boyutunda)' : '';
    kalan.textContent = n === 0 ? 'Alanda yeni bir ikon için yer kalmadı' + olcu + '.' : n >= 9 ? 'Alanda ikonlar için bolca yer var.' : 'Alanda ' + n + ' ikonluk yer kaldı' + olcu + '.';
  };

  Editor.prototype.ozetCiz = function () {
    var m = this.m;
    var panel = this.el.querySelector('[data-kp-panel="ozet"]');
    var f = fiyatHesapla(m, this.yer, this.t);
    var p = function (k) { return paraBicimle(k); };
    var satirlar = '<tr><th scope="row">' + kacis(m.urun.baslik) + '</th><td>' + p(f.urun) + '</td></tr>';
    if (f.harfAdet) satirlar += '<tr><th scope="row">Harfler: ' + kacis(this.t.isim) + ' <span>(' + f.harfAdet + ' harf)</span></th><td>' + p(f.harf) + '</td></tr>';
    if (f.rakamAdet) {
      var rakamlar = this.durum.parcalar.filter(function (x) { return x.tip === 'number'; }).map(function (x) { return x.etiket; }).join(', ');
      satirlar += '<tr><th scope="row">Rakamlar: ' + kacis(rakamlar) + ' <span>(' + f.rakamAdet + ' rakam)</span></th><td>' + p(f.rakam) + '</td></tr>';
    }
    if (f.ikonAdet) {
      var ikonlar = this.durum.parcalar.filter(function (x) { return x.tip === 'icon'; }).map(function (x) { return x.etiket; }).join(', ');
      satirlar += '<tr><th scope="row">İkonlar: ' + kacis(ikonlar) + ' <span>(' + f.ikonAdet + ' ikon)</span></th><td>' + p(f.ikon) + '</td></tr>';
    }
    var self = this;
    var engelliAdim = ADIMLAR.filter(function (a) { return a.id !== 'ozet' && self.adimEngeli(a.id); })[0];
    panel.innerHTML =
      '<h3 id="kp-p-ozet" class="kp-panel__baslik" tabindex="-1">Özet</h3>' +
      (bosMu(this.t) ? '<p class="kp-uyari kp-uyari--bilgi">Henüz patch eklemedin. Tamam dersen çanta tasarımsız kalır.</p>' : '') +
      (engelliAdim ? '<p class="kp-uyari kp-uyari--hata">' + engelliAdim.ad + ' adımında çözülmesi gereken bir sorun var.</p>' : '') +
      '<table class="kp-ozet"><tbody>' + satirlar + '</tbody>' +
      '<tfoot><tr><th scope="row">Toplam</th><td>' + p(f.toplam) + '</td></tr></tfoot></table>' +
      '<p class="kp-indirim-notu kp-indirim-notu--ozet">İndirimler sepette uygulanır.</p>' +
      '<p class="kp-bilgi">Patch\'ler cırt cırtlı. Çanta eline geçince istediğin yere takar, istediğin zaman yerini değiştirirsin.</p>';
  };

  /* ---------------- Sürükleme ---------------- */

  Editor.prototype.surukleBagla = function () {
    var self = this;
    var kok = this.el.querySelector('[data-kp-sahne]');
    var aktif = null;

    function cmCevir(dxPx, dyPx) {
      var r = self.sahne.sahne.getBoundingClientRect();
      return [(dxPx / r.width) * self.m.Wcm, (dyPx / r.height) * self.m.Hcm];
    }

    kok.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('.kp-parca');
      if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var grup = el.getAttribute('data-grup');
      var grupParcalari = self.durum.parcalar.filter(function (p) { return p.grup === grup; });
      if (!grupParcalari.length) return;
      e.preventDefault();
      aktif = {
        id: e.pointerId,
        grup: grup,
        x: e.clientX,
        y: e.clientY,
        parcalar: grupParcalari,
        digerleri: self.durum.parcalar.filter(function (p) { return p.grup !== grup && !self.durum.hatalar[p.uid]; }),
        dx: 0,
        dy: 0,
        hareket: false
      };
      try {
        kok.setPointerCapture(e.pointerId);
      } catch (err) {
        /* bazı uygulama içi tarayıcılar */
      }
      self.sahne.sahne.classList.add('kp-sahne--surukleniyor');
    });

    kok.addEventListener('pointermove', function (e) {
      if (!aktif || e.pointerId !== aktif.id) return;
      e.preventDefault();
      var d = cmCevir(e.clientX - aktif.x, e.clientY - aktif.y);
      if (!aktif.hareket && Math.abs(e.clientX - aktif.x) + Math.abs(e.clientY - aktif.y) < 3) return;
      aktif.hareket = true;
      aktif.dx = d[0];
      aktif.dy = d[1];
      var tasinmis = aktif.parcalar.map(function (p) {
        return { uid: p.uid, tip: p.tip, sekil: kaydir(p.sekil, aktif.dx, aktif.dy) };
      });
      var gecerli = self.yer.grupGecerli(tasinmis, aktif.digerleri);
      var hatalar = {};
      if (!gecerli) tasinmis.forEach(function (p) { hatalar[p.uid] = true; });
      self.sahne.konumla(tasinmis, hatalar);
    });

    function birak(e) {
      if (!aktif || e.pointerId !== aktif.id) return;
      var a = aktif;
      aktif = null;
      self.sahne.sahne.classList.remove('kp-sahne--surukleniyor');
      if (!a.hareket) return;
      var tasinmis = a.parcalar.map(function (p) {
        return { uid: p.uid, tip: p.tip, sekil: kaydir(p.sekil, a.dx, a.dy) };
      });
      var dx = a.dx;
      var dy = a.dy;
      if (!self.yer.grupGecerli(tasinmis, a.digerleri)) {
        // Bırakılan noktaya en yakın geçerli konum; yoksa eski yerine döner
        var bulunan = self.yer.enYakin(a.parcalar, a.digerleri, a.dx, a.dy);
        if (bulunan) {
          dx = bulunan[0];
          dy = bulunan[1];
        } else {
          dx = 0;
          dy = 0;
        }
      }
      if (a.grup === 'isim') {
        var c = self.t.isimMerkez;
        if (!c) {
          var alan = self.m.alanBul('letter');
          c = merkez(alan.sekil);
        }
        self.t.isimMerkez = [c[0] + dx, c[1] + dy];
      } else {
        konumKaydir(self.t, a.parcalar[0], dx, dy);
      }
      self.yenile();
    }

    kok.addEventListener('pointerup', birak);
    kok.addEventListener('pointercancel', birak);
    // iOS: sahne üzerinde sayfa kaymasını engelle
    kok.addEventListener(
      'touchmove',
      function (e) {
        if (e.target.closest('.kp-parca')) e.preventDefault();
      },
      { passive: false }
    );
  };

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

    var kayitli = depoOku(this.depoAnahtari);
    this.tasarim = kayitli && kayitli.t && kayitli.v === 1 ? this.tasarimTemizle(kayitli.t) : null;
    this.mod = kayitli && kayitli.mod === 'kisisel' ? 'kisisel' : 'sade';

    var self = this;
    this.querySelectorAll('[data-kisisel-mod]').forEach(function (r) {
      r.checked = r.value === self.mod;
      r.addEventListener('change', function () {
        if (r.checked) self.modDegistir(r.value);
      });
    });
    this.querySelector('[data-kisisel-ac]').addEventListener('click', function () {
      self.editor.ac();
    });

    this.gonderYakala = this.gonderYakala.bind(this);
    document.addEventListener('submit', this.gonderYakala, true);

    this.hidden = false;
    this.modDegistir(this.mod, true);
  };

  // Kayıtlı tasarımdaki artık var olmayan parçaları ayıklar
  KisiselKart.prototype.tasarimTemizle = function (t) {
    var m = this.model;
    if (!t || !Array.isArray(t.parcalar)) return null;
    t.setId = m.set(t.setId).id;
    t.isim = typeof t.isim === 'string' ? t.isim : '';
    t.harfAyri = !!t.harfAyri && Array.isArray(t.harfKonumlari);
    if (t.harfAyri) {
      t.harfKonumlari = t.harfKonumlari.filter(function (k) {
        return Array.isArray(k) && isFinite(k[0]) && isFinite(k[1]);
      });
    } else {
      t.harfKonumlari = null;
    }
    t.parcalar = t.parcalar.filter(function (p) {
      if (p.tip === 'number') return !!m.rakamSeti();
      return p.tip === 'icon' && !!m.ikonHarita[p.urunId];
    });
    return t;
  };

  KisiselKart.prototype.modDegistir = function (mod, ilk) {
    this.mod = mod;
    this.querySelectorAll('[data-kisisel-mod]').forEach(function (r) {
      r.checked = r.value === mod;
      r.closest('label').classList.toggle('kp-secili', r.checked);
    });
    var govde = this.querySelector('[data-kisisel-govde]');
    govde.hidden = mod !== 'kisisel';
    document.body.classList.toggle('kisisel-modu', mod === 'kisisel');
    this.kaydet();
    this.guncelle();
    if (mod === 'kisisel' && !ilk && bosMu(this.tasarim)) this.editor.ac();
  };

  KisiselKart.prototype.kaydet = function () {
    depoYaz(this.depoAnahtari, { v: 1, mod: this.mod, t: this.tasarim });
  };

  KisiselKart.prototype.tasarimKaydet = function (t) {
    this.tasarim = bosMu(t) ? null : kopyala(t);
    this.kaydet();
    this.guncelle();
  };

  KisiselKart.prototype.guncelle = function () {
    var m = this.model;
    var t = this.tasarim;
    var bos = bosMu(t);
    var ozet = this.querySelector('[data-kisisel-ozet]');
    var toplam = this.querySelector('[data-kisisel-toplam]');
    var acButon = this.querySelector('[data-kisisel-ac]');
    this.querySelector('[data-kisisel-bos]').hidden = !bos;
    ozet.hidden = bos;
    toplam.hidden = bos;
    var indirimNotu = this.querySelector('[data-kisisel-indirim-notu]');
    if (indirimNotu) indirimNotu.hidden = bos;
    acButon.textContent = bos ? 'Tasarla' : 'Tasarımı düzenle';
    var f = null;
    if (!bos) {
      f = fiyatHesapla(m, this.yer, t);
      var parcalar = this.yer.parcalar(t);
      var maddeler = [];
      if (t.isim) maddeler.push(kacis(t.isim) + ' · ' + f.harfAdet + ' harf');
      var rakamlar = parcalar.filter(function (p) { return p.tip === 'number'; }).map(function (p) { return p.etiket; });
      if (rakamlar.length) maddeler.push(kacis(rakamlar.join(', ')) + ' · ' + rakamlar.length + ' rakam');
      var ikonlar = parcalar.filter(function (p) { return p.tip === 'icon'; }).map(function (p) { return p.etiket; });
      if (ikonlar.length) maddeler.push(kacis(ikonlar.join(', ')) + ' · ' + ikonlar.length + ' ikon');
      ozet.innerHTML = maddeler.map(function (x) { return '<li>' + x + '</li>'; }).join('');
      toplam.textContent = 'Toplam: ' + paraBicimle(f.toplam);
    }
    this.butonlariGuncelle(f);
    this.galeriGuncelle();
  };

  KisiselKart.prototype.gonderButonlari = function () {
    return [
      document.getElementById('ProductSubmitButton-' + this.bolum),
      document.getElementById('StickyProductSubmitButton-' + this.bolum)
    ].filter(Boolean);
  };

  KisiselKart.prototype.butonlariGuncelle = function (f) {
    var m = this.model;
    var kisisel = this.mod === 'kisisel';
    var bos = bosMu(this.tasarim);
    this.gonderButonlari().forEach(function (b) {
      var yazi = b.querySelector('span');
      if (!yazi) return;
      if (b._kpOrijinal == null) {
        b._kpOrijinal = yazi.textContent;
        b._kpOutline = b.classList.contains('btn-outline');
      }
      // "Hemen satın al" gizlendiğinde ana buton birincil görünsün
      if (b._kpOutline) {
        b.classList.toggle('btn-outline', !kisisel);
        b.classList.toggle('btn-primary', kisisel);
      }
      if (!kisisel) {
        yazi.textContent = b._kpOrijinal;
      } else if (bos) {
        yazi.textContent = 'Önce tasarımını yap';
      } else {
        yazi.textContent = 'Tasarımımla sepete ekle · ' + paraBicimle(f.toplam);
      }
    });
  };

  KisiselKart.prototype.galeriGuncelle = function () {
    var ilk = document.querySelector('#MainProduct-' + this.bolum + ' .main-carousel .splide__slide') ||
      document.querySelector('.main-carousel .splide__slide');
    if (!ilk) return;
    var katman = ilk.querySelector('.kp-galeri');
    var goster = this.mod === 'kisisel' && !bosMu(this.tasarim);
    if (!goster) {
      if (katman) katman.remove();
      return;
    }
    if (!katman) {
      katman = document.createElement('div');
      katman.className = 'kp-galeri';
      katman.innerHTML = '<div class="kp-galeri__sahne"></div><span class="kp-galeri__rozet">Senin tasarımın</span>';
      ilk.appendChild(katman);
      this.galeriSahne = new Sahne(this.model, this.yer, katman.querySelector('.kp-galeri__sahne'), { etkilesimli: false });
    }
    var t = kopyala(this.tasarim);
    var d = duzenle(this.model, this.yer, t);
    this.galeriSahne.ciz(d.parcalar, {}, false);
  };

  /* ---------------- Sepete ekleme ---------------- */

  KisiselKart.prototype.gonderYakala = function (e) {
    var form = e.target;
    // Dikkat: form.id kullanılamaz; formda name="id" alanı olduğu için o alanı döndürür.
    if (this.mod !== 'kisisel' || !form || !form.getAttribute || form.getAttribute('id') !== this.formId) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (bosMu(this.tasarim)) {
      this.editor.ac();
      return;
    }
    this.sepeteEkle(form);
  };

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
    this.gonderButonlari().forEach(function (b) {
      b.classList.toggle('loading', acik);
      b.setAttribute('aria-disabled', acik ? 'true' : 'false');
      var d = b.querySelector('.loading__spinner');
      if (d) d.classList.toggle('hidden', !acik);
    });
    this._yukleniyor = acik;
  };

  KisiselKart.prototype.sepetKalemleri = function (adet) {
    var m = this.model;
    var t = kopyala(this.tasarim);
    var d = duzenle(m, this.yer, t);
    var kimlik = tasarimKimligi();
    var ozet = tasarimOzeti(m, t);
    var alan = m.alanBul('letter') || m.alanlar[0];
    var ac = merkez(alan.sekil);
    var konum = {
      v: 1,
      alan: alan.id,
      p: d.parcalar.map(function (p) {
        var c = merkez(p.sekil);
        return {
          v: p.varyant ? p.varyant.id : null,
          t: p.tip.charAt(0),
          x: Math.round((c[0] - ac[0]) * 10) / 10,
          y: Math.round((c[1] - ac[1]) * 10) / 10
        };
      })
    };
    var bazOzellik = { 'Tasarım': ozet };
    if (t.isim) bazOzellik['İsim'] = t.isim;
    bazOzellik._tasarim_id = kimlik;
    bazOzellik._tasarim_rol = 'baz';
    bazOzellik._tasarim_konum = JSON.stringify(konum);

    // Aynı varyantları birleştir; harflerde isimdeki sırayı yaz
    var gruplar = {};
    var sira = [];
    var harfSirasi = 0;
    d.parcalar.forEach(function (p) {
      if (p.tip === 'letter') harfSirasi++;
      if (!p.varyant) return;
      var anahtar = String(p.varyant.id);
      if (!gruplar[anahtar]) {
        gruplar[anahtar] = { varyant: p.varyant, tip: p.tip, adet: 0, siralar: [] };
        sira.push(anahtar);
      }
      gruplar[anahtar].adet++;
      if (p.tip === 'letter') gruplar[anahtar].siralar.push(harfSirasi);
    });
    var kalemler = [{ id: m.urun.varyant, quantity: adet, properties: bazOzellik }];
    sira.forEach(function (a) {
      var g = gruplar[a];
      var ozellik = { 'Tasarım': ozet };
      if (g.tip === 'letter') ozellik['Harf sırası'] = g.siralar.join(', ');
      ozellik._tasarim_id = kimlik;
      ozellik._tasarim_rol = 'patch';
      ozellik._adet_birim = String(g.adet);
      kalemler.push({ id: g.varyant.id, quantity: g.adet * adet, properties: ozellik });
    });
    return { kimlik: kimlik, kalemler: kalemler, fiyat: fiyatHesapla(m, this.yer, t), hatalar: d.hatalar, tasarim: t };
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
    Yerlesim: Yerlesim,
    isimAnaliz: isimAnaliz,
    duzenle: duzenle,
    harfleriAyir: harfleriAyir,
    harfleriBirlestir: harfleriBirlestir,
    fiyatHesapla: fiyatHesapla,
    tasarimOzeti: tasarimOzeti,
    paraBicimle: paraBicimle,
    buyukHarf: buyukHarf,
    geometri: { icinde: icinde, cakisir: cakisir, noktaIcinde: noktaIcinde }
  };
})();
