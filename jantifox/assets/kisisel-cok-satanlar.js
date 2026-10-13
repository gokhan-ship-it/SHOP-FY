/* Ana sayfa "Çok satanlar" (sections/kisisel-cok-satanlar.liquid): yatay kayan kartlar, filtre düğmeleri, oklar,
   mobilde sayfa noktaları ve kartlarda örnek tasarım.
   Kart bileşeni kategori sayfasındakiyle aynı (kisisel-koleksiyon.js → window.KisiselKartlar).
   Örnek tasarım: ürünün kisisellestirme.ornek_gorsel fotoğrafı varsa o; yoksa editörün çizim motoru
   (kisisel-editor.js → KisiselEditorIc.ornekTasarim) ürünün önizleme görseline örnek isim yerleştirir. Bölüm görüntü
   alanına yaklaşınca çizilir; sonuç (harflerin konumları) tarayıcıda saklanır, sonraki açılışta editör yüklenmez.
   Çizim olmazsa kartın normal görseli kalır. */
(function () {
  'use strict';

  var TURLER = [['hepsi', 'Hepsi'], ['canta', 'Çanta'], ['kiyafet', 'Kıyafet'], ['sapka', 'Şapka']];
  var ONBELLEK = 'kp-ornek-v1:';

  function kacis(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Shopify CDN görsel adresinde genişliği değiştirir (harfler kartta küçük görünür)
  function kucukGorsel(u, en) {
    if (!/[?&]width=\d+/.test(u)) return u;
    return u.replace(/([?&]width=)\d+/, '$1' + en);
  }
  function tamAdres(u) {
    return u && u.indexOf('//') === 0 ? 'https:' + u : u;
  }
  // Kısa, kararlı özet (önbellek anahtarı): harita, görsel ve harf görselleri değişince yeniden çizilir
  function ozet(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function depoOku(k) {
    try {
      return JSON.parse(window.localStorage.getItem(k) || 'null');
    } catch (e) {
      return null;
    }
  }
  function depoYaz(k, v) {
    try {
      window.localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      /* dolu ya da kapalı: önbelleksiz devam */
    }
  }

  /* ---------------- Kaydırma, oklar, noktalar ---------------- */

  function Bolum(kok) {
    this.kok = kok;
    this.liste = kok.querySelector('[data-kp-cs-liste]');
    this.noktalar = kok.querySelector('[data-kp-cs-noktalar]');
    try {
      this.veri = JSON.parse(kok.querySelector('script[data-kp-cs-veri]').textContent);
    } catch (e) {
      this.veri = { turler: {}, urunler: {} };
    }
    this.tur = 'hepsi';
    if (window.KisiselKartlar) window.KisiselKartlar.isle(this.liste);
    this.filtreleriKur();
    this.olaylar();
    this.guncelle();
    if (kok.getAttribute('data-ornek') !== 'false') this.ornekIzle();
  }

  Bolum.prototype.gorunenler = function () {
    return Array.prototype.filter.call(this.liste.children, function (li) { return !li.hidden; });
  };

  Bolum.prototype.filtreleriKur = function () {
    var kap = this.kok.querySelector('[data-kp-cs-filtreler]');
    if (!kap) return;
    var t = this.veri.turler || {};
    var self = this;
    var dugmeler = TURLER.filter(function (x) { return x[0] === 'hepsi' || t[x[0]] > 0; });
    // Tek tip varsa filtre anlamsız: düğmeler gösterilmez
    if (dugmeler.length <= 2) {
      kap.hidden = true;
      return;
    }
    kap.innerHTML = dugmeler.map(function (x) {
      return '<button type="button" class="kp-kk-filtre kp-cs__filtre" data-kp-cs-filtre="' + x[0] + '" aria-pressed="' + (x[0] === self.tur) + '">' + kacis(x[1]) + '</button>';
    }).join('');
  };

  Bolum.prototype.filtrele = function (tur) {
    this.tur = tur;
    Array.prototype.forEach.call(this.liste.children, function (li) {
      li.hidden = tur !== 'hepsi' && li.getAttribute('data-kp-cs-tur') !== tur;
    });
    this.kok.querySelectorAll('[data-kp-cs-filtre]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-kp-cs-filtre') === tur ? 'true' : 'false');
    });
    this.liste.scrollLeft = 0;
    this.guncelle();
  };

  Bolum.prototype.adim = function () {
    var ilk = this.gorunenler()[0];
    if (!ilk) return this.liste.clientWidth;
    var bosluk = parseFloat(getComputedStyle(this.liste).columnGap) || 0;
    return ilk.getBoundingClientRect().width + bosluk;
  };

  Bolum.prototype.guncelle = function () {
    var l = this.liste;
    var son = l.scrollWidth - l.clientWidth - 2;
    this.kok.querySelectorAll('[data-kp-cs-ok]').forEach(function (b) {
      var yon = Number(b.getAttribute('data-kp-cs-ok'));
      b.disabled = yon < 0 ? l.scrollLeft <= 2 : l.scrollLeft >= son;
    });
    this.kok.classList.toggle('kp-cs--kaymaz', son <= 0);
    if (!this.noktalar) return;
    var n = this.gorunenler().length;
    var adim = this.adim();
    var sayfa = adim > 0 ? Math.round(l.scrollLeft / adim) : 0;
    if (l.scrollLeft >= son) sayfa = n - 1;
    if (this.noktalar.childElementCount !== n) {
      this.noktalar.innerHTML = new Array(n + 1).join('<span class="kp-cs__nokta"></span>');
    }
    Array.prototype.forEach.call(this.noktalar.children, function (x, i) {
      x.classList.toggle('kp-cs__nokta--aktif', i === Math.min(sayfa, n - 1));
    });
  };

  Bolum.prototype.olaylar = function () {
    var self = this;
    this.kok.addEventListener('click', function (e) {
      var f = e.target.closest('[data-kp-cs-filtre]');
      if (f) return self.filtrele(f.getAttribute('data-kp-cs-filtre'));
      var ok = e.target.closest('[data-kp-cs-ok]');
      if (ok) self.liste.scrollBy({ left: Number(ok.getAttribute('data-kp-cs-ok')) * self.adim(), behavior: 'smooth' });
    });
    var bekle = false;
    this.liste.addEventListener('scroll', function () {
      if (bekle) return;
      bekle = true;
      requestAnimationFrame(function () { bekle = false; self.guncelle(); });
    }, { passive: true });
    window.addEventListener('resize', function () { self.guncelle(); });
  };

  /* ---------------- Örnek tasarım ---------------- */

  Bolum.prototype.ornekIzle = function () {
    var self = this;
    if (!('IntersectionObserver' in window)) return this.ornekleriCiz();
    var g = new IntersectionObserver(function (girdiler) {
      if (!girdiler.some(function (x) { return x.isIntersecting; })) return;
      g.disconnect();
      self.ornekleriCiz();
    }, { rootMargin: '300px 0px' });
    g.observe(this.kok);
  };

  Bolum.prototype.ornekleriCiz = function () {
    var self = this;
    var v = this.veri;
    var isimler = (v.isimler || []).map(function (x) { return String(x).trim().toUpperCase(); }).filter(Boolean);
    var setOzeti = v.set ? ozet((v.set.varyantlar || []).map(function (x) { return x.id + x.gorsel; }).join()) : '';
    var isler = [];
    Array.prototype.forEach.call(this.liste.children, function (li, sira) {
      var kimlik = li.getAttribute('data-kp-cs-urun');
      var u = kimlik && v.urunler && v.urunler[kimlik];
      var medya = li.querySelector('.card-product__media');
      if (!u || !medya) return;
      if (u.foto) return self.fotoKoy(medya, u.foto);
      if (!v.set || !u.harita) return;
      // Her karta farklı isim: liste kartın sırasından başlayarak döner
      var sirali = isimler.slice(sira % isimler.length).concat(isimler.slice(0, sira % isimler.length));
      var anahtar = ONBELLEK + u.id + ':' + ozet(JSON.stringify(u.harita) + u.gorsel.url + u.metin_siniri + setOzeti + sirali.join());
      isler.push({ li: li, medya: medya, u: u, sirali: sirali, anahtar: anahtar, sonuc: depoOku(anahtar) });
    });
    if (!isler.length) return;
    var eksik = isler.filter(function (x) { return !x.sonuc; });
    var bitir = function () {
      var kullanilan = [];
      isler.forEach(function (x) {
        if (!x.sonuc) {
          try {
            x.sonuc = window.KisiselEditorIc.ornekTasarim(self.ham(x.u), x.sirali, kullanilan) || { yok: true };
          } catch (e) {
            x.sonuc = { yok: true };
          }
          depoYaz(x.anahtar, x.sonuc);
        }
        if (x.sonuc.isim) kullanilan.push(x.sonuc.isim);
        if (!x.sonuc.yok) self.ciz(x.medya, x.u, x.sonuc);
      });
    };
    if (!eksik.length) return bitir();
    // Önbellekte olmayan varsa çizim motoru (editör betiği) bir kez yüklenir: sayfa yüklendikten sonra, boşta
    var src = this.kok.getAttribute('data-editor-src');
    sayfaBosta(function () {
      editorYukle(src, function (tamam) {
        if (!tamam) return;
        (window.requestIdleCallback || setTimeout)(bitir);
      });
    });
  };

  // Editörün beklediği veri biçimi (yalnızca örnek yazı için gerekenler)
  Bolum.prototype.ham = function (u) {
    var v = this.veri;
    return {
      urun: { id: u.id, baslik: '', varyant: 0, fiyat: 0, satilabilir: true, metin_siniri: u.metin_siniri },
      gorsel: { en: u.gorsel.en, boy: u.gorsel.boy, kucuk: u.gorsel.url, buyuk: u.gorsel.url },
      harita: u.harita,
      ayarlar: v.ayarlar || {},
      setler: [v.set],
      rakamlar: [],
      ikonlar: [],
      hazir_setler: [],
      aksesuarlar: []
    };
  };

  // Tuvale (canvas) çizilir: görseller Image ile iner (CDN sıkıştırılmış biçim verir; SVG <image> isteğine PNG
  // döndürüyor) ve geç çizilen süs katmanı sayfanın LCP ölçümünü etkilemez (canvas LCP adayı değildir).
  // Görseller kartta çizileceği boyutta istenir: iPhone'a CDN bu dosyaları PNG gönderiyor
  Bolum.prototype.ciz = function (medya, u, s) {
    var W = u.gorsel.en;
    var H = u.gorsel.boy;
    var oran = W / H;
    var m = medya.getBoundingClientRect();
    var mw = m.width || 300;
    var mh = m.height || mw;
    // Süs katmanı: 2x yoğunluk yeterli
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var sahneEn = Math.min(0.92 * mw, 0.92 * mh * oran);
    var gerekli = function (css, enAz, enCok) { return Math.max(enAz, Math.min(enCok, Math.ceil((css * dpr) / 50) * 50)); };
    var urun = { src: kucukGorsel(tamAdres(u.gorsel.url), gerekli(sahneEn, 200, 600)) };
    var harfler = s.parcalar.map(function (p) {
      return { p: p, src: kucukGorsel(tamAdres(p.src), gerekli((sahneEn * Math.max(p.w, p.h / oran)) / 100, 50, 150)) };
    });
    var hepsi = [urun].concat(harfler);
    var kalan = hepsi.length;
    var hata = false;
    var bitti = function () {
      if (--kalan > 0) return;
      if (hata) return; // yüklenemeyen görsel: kartın normal görseli kalır
      var cw = Math.max(1, Math.round(sahneEn * dpr));
      var ch = Math.max(1, Math.round((sahneEn / oran) * dpr));
      var tuval = document.createElement('canvas');
      tuval.width = cw;
      tuval.height = ch;
      var c = tuval.getContext('2d');
      if (!c) return;
      c.imageSmoothingQuality = 'high';
      c.drawImage(urun.img, 0, 0, cw, ch);
      harfler.forEach(function (h) {
        var x = (h.p.x / 100) * cw;
        var y = (h.p.y / 100) * ch;
        var w = (h.p.w / 100) * cw;
        var hh = (h.p.h / 100) * ch;
        // Kutuya oranı korunarak sığdırılır (editördeki gibi), merkez etrafında döndürülür
        var k = Math.min(w / h.img.naturalWidth, hh / h.img.naturalHeight);
        var iw = h.img.naturalWidth * k;
        var ih = h.img.naturalHeight * k;
        c.save();
        c.translate(x + w / 2, y + hh / 2);
        if (h.p.aci) c.rotate((h.p.aci * Math.PI) / 180);
        c.drawImage(h.img, -iw / 2, -ih / 2, iw, ih);
        c.restore();
      });
      var kat = document.createElement('div');
      kat.className = 'kp-ornek';
      kat.setAttribute('aria-hidden', 'true');
      var sahne = document.createElement('div');
      sahne.className = 'kp-ornek__sahne';
      sahne.style.setProperty('--kp-oran', String(oran));
      sahne.style.aspectRatio = W + ' / ' + H;
      sahne.appendChild(tuval);
      kat.appendChild(sahne);
      var not = document.createElement('span');
      not.className = 'kp-ornek__not';
      not.textContent = 'Örnek tasarım: ' + s.isim;
      kat.appendChild(not);
      medya.insertBefore(kat, medya.firstChild && medya.firstChild.nextSibling);
      medya.classList.add('kp-ornek-var');
    };
    hepsi.forEach(function (x) {
      x.img = new Image();
      x.img.decoding = 'async';
      x.img.onload = bitti;
      x.img.onerror = function () { hata = true; bitti(); };
      x.img.src = x.src;
    });
  };

  // Gerçek örnek fotoğrafı: kartı doldurur (cover); o da tuvale çizilir
  Bolum.prototype.fotoKoy = function (medya, src) {
    var m = medya.getBoundingClientRect();
    var mw = m.width || 300;
    var mh = m.height || mw;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var on = new Image();
    on.decoding = 'async';
    on.onload = function () {
      var cw = Math.max(1, Math.round(mw * dpr));
      var ch = Math.max(1, Math.round(mh * dpr));
      var tuval = document.createElement('canvas');
      tuval.width = cw;
      tuval.height = ch;
      var c = tuval.getContext('2d');
      if (!c) return;
      var k = Math.max(cw / on.naturalWidth, ch / on.naturalHeight);
      var iw = on.naturalWidth * k;
      var ih = on.naturalHeight * k;
      c.imageSmoothingQuality = 'high';
      c.drawImage(on, (cw - iw) / 2, (ch - ih) / 2, iw, ih);
      var kat = document.createElement('div');
      kat.className = 'kp-ornek kp-ornek--foto';
      kat.setAttribute('aria-hidden', 'true');
      kat.appendChild(tuval);
      medya.insertBefore(kat, medya.firstChild && medya.firstChild.nextSibling);
      medya.classList.add('kp-ornek-var');
    };
    on.src = kucukGorsel(tamAdres(src), Math.max(300, Math.min(900, Math.ceil((mw * dpr) / 50) * 50)));
  };

  function sayfaBosta(f) {
    var bosta = function () { (window.requestIdleCallback || setTimeout)(f, { timeout: 2000 }); };
    if (document.readyState === 'complete') bosta();
    else window.addEventListener('load', bosta, { once: true });
  }

  var editorDurum = null;
  var editorBekleyen = [];
  function editorYukle(src, cb) {
    if (window.KisiselEditorIc) return cb(true);
    editorBekleyen.push(cb);
    if (editorDurum) return;
    editorDurum = 'yukleniyor';
    var b = document.createElement('script');
    b.src = src;
    b.async = true;
    b.onload = function () { editorBekleyen.splice(0).forEach(function (f) { f(!!window.KisiselEditorIc); }); };
    b.onerror = function () { editorBekleyen.splice(0).forEach(function (f) { f(false); }); };
    document.head.appendChild(b);
  }

  function baslat() {
    document.querySelectorAll('[data-kp-cs]').forEach(function (kok) {
      if (kok.kpBolum) return;
      kok.kpBolum = new Bolum(kok);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat);
  else baslat();
  // Tema düzenleyicisinde bölüm eklenince / değişince
  document.addEventListener('shopify:section:load', baslat);
})();
