/* Ana sayfa "Çok satanlar" (sections/kisisel-cok-satanlar.liquid). Bölüm temanın Featured collection yapısındadır
   (splide-carousel, card-product, tabs-component); bu betik yalnızca şunları ekler:
   - Kişiselleştirmesi açık kartlarda etiket ve "Kişiselleştir" butonu (kisisel-koleksiyon.js, sade kart).
   - Filtre sekmeleri: temanın kaydırıcısında slaytlar listeden çıkarılır / geri eklenir (sayfa yenilenmez).
   - Örnek tasarım: temanın ikinci görsel katmanı (product-secondary-image) olarak tuvale çizilir; masaüstünde
     üzerine gelince temanın geçişiyle görünür, dokunmatik ekranda sabit görünür. Ürünün kisisellestirme.ornek_gorsel fotoğrafı varsa o; yoksa editörün yerleşim motoru
     (KisiselEditorIc.ornekTasarim) ürünün önizleme görseline Cool Alfabe ile örnek isim yerleştirir.
     Kadraj: önizleme kesiti kart görselinde bulunursa isim kart görselinin üstüne tam yerine çizilir; bulunamazsa
     (farklı çekim) ürün kesiti kart zemininde ortalanır. Yerleşim sonuçları ve çizilmiş örnekler (JPEG) tarayıcıda
     saklanır; çizim motoru (editör betiği) yalnızca saklanmamış ürün varsa, sayfa yüklendikten sonra boşta yüklenir.
     Hesap ve çizim kart kart, kaydırma dururken yapılır. Hata olursa kart olduğu gibi kalır. */
(function () {
  'use strict';

  // v3: isim yedekleri eklendi; eski "sığmadı" sonuçları yeniden hesaplanır
  var ONBELLEK = 'kp-ornek-v3:';
  var CIZIM = 'kp-ornek-cizim-v1:';
  // Listedeki isimlerin hiçbiri alana sığmazsa (şapka gibi küçük ön panel) denenecek kısa isimler
  var YEDEK_ISIMLER = ['ADA', 'ELA', 'NIL', 'ALI'];

  // Kaydırma sürerken örnek tasarım hesaplanmaz / çizilmez; parmak ya da sayfa durunca devam edilir
  var sonHareket = 0;
  ['scroll', 'touchmove', 'wheel'].forEach(function (olay) {
    window.addEventListener(olay, function () { sonHareket = Date.now(); }, { passive: true, capture: true });
  });
  function kaydirmaBitince(f) {
    var bekle = function () {
      if (Date.now() - sonHareket < 250) return setTimeout(bekle, 150);
      (window.requestIdleCallback || setTimeout)(f, { timeout: 1000 });
    };
    bekle();
  }

  // Shopify CDN görsel adresinde genişliği değiştirir
  function kucukGorsel(u, en) {
    if (!/[?&]width=\d+/.test(u)) return u;
    return u.replace(/([?&]width=)\d+/, '$1' + en);
  }
  function tamAdres(u) {
    return u && u.indexOf('//') === 0 ? 'https:' + u : u;
  }
  // Kısa, kararlı özet (önbellek anahtarı)
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
  function gorselYukle(src, cb) {
    var img = new Image();
    img.decoding = 'async';
    img.onload = function () { cb(img); };
    img.onerror = function () { cb(null); };
    img.src = src;
  }
  function tuvalYap(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  function yerelKaydirma(kok) {
    return kok.classList.contains('kp-cs--kaydir') && !!window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
  }

  /* ---------------- Bölüm ---------------- */

  function Bolum(kok) {
    this.kok = kok;
    this.liste = kok.querySelector('[data-kp-cs-liste]');
    this.kaydirici = kok.querySelector('splide-carousel');
    try {
      this.veri = JSON.parse(kok.querySelector('script[data-kp-cs-veri]').textContent);
    } catch (e) {
      this.veri = { urunler: {} };
    }
    // Filtre için slaytların asıl sırası
    this.slaytlar = Array.prototype.slice.call(this.liste.children);
    if (window.KisiselKartlar) {
      window.KisiselKartlar.isle(this.liste, { sade: true, renk: kok.getAttribute('data-buton') });
      if (window.KisiselKartlar.onYuklemeIzle) window.KisiselKartlar.onYuklemeIzle();
    }
    this.olaylar();
    if (kok.getAttribute('data-ornek') !== 'false') this.ornekIzle();
  }

  Bolum.prototype.olaylar = function () {
    var self = this;
    this.kok.addEventListener('click', function (e) {
      var f = e.target.closest('[data-kp-cs-filtre]');
      if (f) self.filtrele(f.getAttribute('data-kp-cs-filtre'));
    });
    this.kok.addEventListener('keydown', function (e) {
      var f = e.target.closest && e.target.closest('[data-kp-cs-filtre]');
      if (f && (e.key === 'Enter' || e.key === ' ')) self.filtrele(f.getAttribute('data-kp-cs-filtre'));
    });
  };

  // Seçilen tipin slaytları listede kalır, diğerleri çıkarılır; kaydırıcı yenilenir ve başa döner
  Bolum.prototype.filtrele = function (tur) {
    var self = this;
    this.tur = tur;
    var kalan = this.slaytlar.filter(function (s) { return tur === 'hepsi' || s.getAttribute('data-kp-cs-tur') === tur; });
    this.slaytlar.forEach(function (s) { if (s.parentNode === self.liste) self.liste.removeChild(s); });
    kalan.forEach(function (s) {
      s.classList.remove('is-active', 'is-visible', 'is-prev', 'is-next');
      s.style.removeProperty('margin-right');
      s.style.removeProperty('width');
      self.liste.appendChild(s);
      // Temanın görünme animasyonu: yeniden eklenen kart görünür kalsın
      var a = s.querySelector('.scroll-trigger');
      if (a) a.classList.remove('scroll-trigger--offscreen');
    });
    var sp = this.kaydirici && this.kaydirici.slideInstance;
    // Mobilde kaydırıcı kapalı (tarayıcının kendi kaydırması): yalnızca başa dön. Splide kapanınca da
    // is-initialized sınıfını bıraktığı için ekran genişliğine bakılır (bölüm ayarı: data-splide 640 px'te destroy)
    if (yerelKaydirma(this.kok)) {
      this.liste.scrollLeft = 0;
      sp = null;
    }
    if (sp) {
      try {
        sp.refresh();
        sp.go(0);
      } catch (e) {
        /* kaydırıcı kapalıysa (mobil ızgara) liste olduğu gibi kalır */
      }
    }
    this.kok.querySelectorAll('[data-kp-cs-filtre]').forEach(function (b) {
      var secili = b.getAttribute('data-kp-cs-filtre') === tur;
      b.classList.toggle('active', secili);
      b.setAttribute('aria-selected', secili ? 'true' : 'false');
    });
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
    this.slaytlar.forEach(function (sl, sira) {
      var kimlik = sl.getAttribute('data-kp-cs-urun');
      var u = kimlik && v.urunler && v.urunler[kimlik];
      var ic = sl.querySelector('.card-product__media-inner');
      if (!u || !ic) return;
      if (u.foto) return sayfaBosta(function () { self.fotoKoy(ic, u.foto); });
      if (!v.set || !u.harita || !isimler.length) return;
      // Her karta farklı isim: liste kartın sırasından başlayarak döner
      var sirali = isimler.slice(sira % isimler.length).concat(isimler.slice(0, sira % isimler.length));
      var anahtar = ONBELLEK + u.id + ':' + ozet(JSON.stringify(u.harita) + u.gorsel.url + (u.kapak ? u.kapak.url : '') + u.metin_siniri + setOzeti + sirali.join());
      isler.push({ ic: ic, u: u, sirali: sirali, anahtar: anahtar, sonuc: depoOku(anahtar) });
    });
    if (!isler.length) return;
    var eksik = isler.filter(function (x) { return !x.sonuc; });
    var kullanilan = [];
    var sira = isler.slice();
    // Kartlar tek tek, her biri ayrı bir boş anda ve kaydırma dururken: uzun tek bir iş kaydırmayı dondurmaz
    var adim = function () {
      var x = sira.shift();
      if (!x) return;
      if (!x.sonuc) {
        x.sonuc = self.hesapla(x, kullanilan);
        depoYaz(x.anahtar, x.sonuc);
      }
      if (x.sonuc.isim) kullanilan.push(x.sonuc.isim);
      if (!x.sonuc.yok) self.ciz(x);
      if (sira.length) kaydirmaBitince(adim);
    };
    sayfaBosta(function () {
      if (!eksik.length) return kaydirmaBitince(adim);
      editorYukle(self.kok.getAttribute('data-editor-src'), function (tamam) {
        if (tamam) kaydirmaBitince(adim);
      });
    });
  };

  // Önce kullanılmamış isimler; hiçbiri sığmazsa listeden sığan bir isim tekrar kullanılabilir; o da yoksa kısa yedekler
  Bolum.prototype.hesapla = function (x, kullanilan) {
    var ic = window.KisiselEditorIc;
    if (!ic) return { yok: true };
    try {
      var ham = this.ham(x.u);
      return ic.ornekTasarim(ham, x.sirali, kullanilan) || ic.ornekTasarim(ham, x.sirali, []) || ic.ornekTasarim(ham, YEDEK_ISIMLER, []) || { yok: true };
    } catch (e) {
      return { yok: true };
    }
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

  // Önizleme kesitinin kart görselindeki yeri (oranlar); bulunamazsa null.
  // Kart görselinin zemini kenarlardan alınır, ürünün kutusu bulunur, kesit oraya ölçeklenip renkler karşılaştırılır.
  function kadrajBul(kapak, onz) {
    try {
      var N = 160;
      var kh = Math.round((N * kapak.naturalHeight) / kapak.naturalWidth);
      var c1 = tuvalYap(N, kh).getContext('2d', { willReadFrequently: true });
      c1.drawImage(kapak, 0, 0, N, kh);
      var f = c1.getImageData(0, 0, N, kh).data;
      var kr = [], kg = [], kb = [];
      for (var x = 0; x < N; x++) {
        [0, 1, kh - 2, kh - 1].forEach(function (y) { var i = (y * N + x) * 4; kr.push(f[i]); kg.push(f[i + 1]); kb.push(f[i + 2]); });
      }
      for (var y = 0; y < kh; y++) {
        [0, 1, N - 2, N - 1].forEach(function (xx) { var i = (y * N + xx) * 4; kr.push(f[i]); kg.push(f[i + 1]); kb.push(f[i + 2]); });
      }
      var orta = function (a) { a.sort(function (p, q) { return p - q; }); return a[a.length >> 1]; };
      var br = orta(kr), bg = orta(kg), bb = orta(kb);
      var x0 = N, y0 = kh, x1 = -1, y1 = -1;
      for (y = 0; y < kh; y++) {
        for (x = 0; x < N; x++) {
          var i = (y * N + x) * 4;
          if (Math.max(Math.abs(f[i] - br), Math.abs(f[i + 1] - bg), Math.abs(f[i + 2] - bb)) > 28) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < 0) return null;
      var M = 160;
      var oh = Math.round((M * onz.naturalHeight) / onz.naturalWidth);
      var c2 = tuvalYap(M, oh).getContext('2d', { willReadFrequently: true });
      c2.drawImage(onz, 0, 0, M, oh);
      var o = c2.getImageData(0, 0, M, oh).data;
      var a0 = M, b0 = oh, a1 = -1, b1 = -1;
      for (y = 0; y < oh; y++) {
        for (x = 0; x < M; x++) {
          if (o[(y * M + x) * 4 + 3] > 128) {
            if (x < a0) a0 = x;
            if (x > a1) a1 = x;
            if (y < b0) b0 = y;
            if (y > b1) b1 = y;
          }
        }
      }
      if (a1 < 0) return null;
      // Kesitin tamamının kart görselinde kapladığı alan (piksel)
      var Wp = (x1 - x0 + 1) / ((a1 - a0 + 1) / M);
      var Hp = (y1 - y0 + 1) / ((b1 - b0 + 1) / oh);
      if (Math.abs(Wp / Hp / (onz.naturalWidth / onz.naturalHeight) - 1) > 0.08) return null;
      var px = x0 - (a0 / M) * Wp;
      var py = y0 - (b0 / oh) * Hp;
      var c3 = tuvalYap(N, kh).getContext('2d', { willReadFrequently: true });
      c3.drawImage(onz, px, py, Wp, Hp);
      var d = c3.getImageData(0, 0, N, kh).data;
      var top = 0, n = 0;
      for (i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 200) {
          top += (Math.abs(d[i] - f[i]) + Math.abs(d[i + 1] - f[i + 1]) + Math.abs(d[i + 2] - f[i + 2])) / 3;
          n++;
        }
      }
      if (n < 200 || top / n > 24) return null;
      return { x: px / N, y: py / kh, w: Wp / N, h: Hp / kh };
    } catch (e) {
      return null; // görsel okunamadı (farklı köken vb.)
    }
  }

  // Örnek tasarımı kartın görsel kutusunda, kart görseliyle aynı kadrajda tuvale çizer
  Bolum.prototype.ciz = function (is) {
    var self = this;
    var u = is.u;
    var s = is.sonuc;
    var ic = is.ic;
    var r = ic.getBoundingClientRect();
    var W = r.width || 300;
    var H = r.height || W;
    var dpr = Math.min(window.devicePixelRatio || 1, 2); // süs katmanı: 2x yeterli
    var cw = Math.round(W * dpr);
    var ch = Math.round(H * dpr);
    var gerekli = function (css, enAz, enCok) { return Math.max(enAz, Math.min(enCok, Math.ceil(css / 50) * 50)); };
    // Daha önce çizilmiş örnek (aynı tasarım ve boyut): görsel indirme ve tuval çizimi yok
    var cizimAnahtari = CIZIM + is.anahtar.slice(ONBELLEK.length) + ':' + cw + 'x' + ch;
    var hazir = cizimOku(cizimAnahtari);
    if (hazir) {
      var resim = new Image(cw, ch);
      resim.decoding = 'async';
      resim.alt = '';
      resim.onload = function () { self.katmanKoy(ic, resim, s.isim); };
      resim.src = hazir;
      return;
    }
    var onzSrc = kucukGorsel(tamAdres(u.gorsel.url), gerekli(Math.max(cw, ch), 200, 600));
    var kapakSrc = u.kapak ? kucukGorsel(tamAdres(u.kapak.url), gerekli(Math.max(cw, ch), 200, 600)) : null;

    var devam = function (kadraj, kapakImg, onzImg) {
      // Önizleme kesitinin tuvaldeki yeri
      var yer;
      var c = tuvalYap(cw, ch);
      var g = c.getContext('2d');
      if (!g) return;
      g.imageSmoothingQuality = 'high';
      if (kadraj && kapakImg) {
        // Kart görseli temadaki gibi kutuyu doldurur (object-fit: cover)
        var k = Math.max(cw / kapakImg.naturalWidth, ch / kapakImg.naturalHeight);
        var kw = kapakImg.naturalWidth * k;
        var kh = kapakImg.naturalHeight * k;
        var kx = (cw - kw) / 2;
        var ky = (ch - kh) / 2;
        g.drawImage(kapakImg, kx, ky, kw, kh);
        yer = { x: kx + kadraj.x * kw, y: ky + kadraj.y * kh, w: kadraj.w * kw, h: kadraj.h * kh };
      } else {
        // Farklı çekim: ürün kesiti kart zemininde ortalanır
        g.fillStyle = getComputedStyle(ic).backgroundColor || '#f5f5f5';
        if (/rgba\(0, 0, 0, 0\)|transparent/.test(g.fillStyle)) g.fillStyle = '#f5f5f5';
        g.fillRect(0, 0, cw, ch);
        var oran = onzImg.naturalWidth / onzImg.naturalHeight;
        var ow = Math.min(cw * 0.8, ch * 0.8 * oran);
        var oh = ow / oran;
        yer = { x: (cw - ow) / 2, y: (ch - oh) / 2, w: ow, h: oh };
        g.drawImage(onzImg, yer.x, yer.y, yer.w, yer.h);
      }
      // Harfler (yüzde konumlar önizleme görseline göre), kutuya oranı korunarak sığdırılır
      var harfler = s.parcalar.map(function (p) {
        var hw = (p.w / 100) * yer.w;
        var hh = (p.h / 100) * yer.h;
        return { p: p, x: yer.x + (p.x / 100) * yer.w, y: yer.y + (p.y / 100) * yer.h, w: hw, h: hh, src: kucukGorsel(tamAdres(p.src), gerekli(Math.max(hw, hh), 50, 150)) };
      });
      var kalan = harfler.length;
      var hata = false;
      var son = function () {
        if (--kalan > 0) return;
        if (hata) return;
        // Tuvale çizim kaydırma dururken
        if (Date.now() - sonHareket < 250) {
          kalan = 1;
          return kaydirmaBitince(son);
        }
        harfler.forEach(function (h) {
          var k2 = Math.min(h.w / h.img.naturalWidth, h.h / h.img.naturalHeight);
          var iw = h.img.naturalWidth * k2;
          var ih = h.img.naturalHeight * k2;
          g.save();
          g.translate(h.x + h.w / 2, h.y + h.h / 2);
          if (h.p.aci) g.rotate((h.p.aci * Math.PI) / 180);
          g.drawImage(h.img, -iw / 2, -ih / 2, iw, ih);
          g.restore();
        });
        cizimYaz(cizimAnahtari, c);
        self.katmanKoy(ic, c, s.isim);
      };
      if (!kalan) return;
      harfler.forEach(function (h) {
        gorselYukle(h.src, function (img) {
          if (!img) hata = true;
          h.img = img;
          son();
        });
      });
    };

    gorselYukle(onzSrc, function (onzImg) {
      if (!onzImg) return; // önizleme yoksa kart olduğu gibi kalır
      if (!kapakSrc) return devam(null, null, onzImg);
      gorselYukle(kapakSrc, function (kapakImg) {
        var kadraj = s.kadraj;
        if (kadraj === undefined) {
          kadraj = kapakImg ? kadrajBul(kapakImg, onzImg) : null;
          s.kadraj = kadraj;
          depoYaz(is.anahtar, s);
        }
        devam(kadraj, kapakImg, onzImg);
      });
    });
  };

  // Temanın ikinci görsel katmanı (product-secondary-image): üzerine gelince temanın geçişiyle görünür
  Bolum.prototype.katmanKoy = function (ic, tuval, isim) {
    var kat = document.createElement('div');
    kat.className = 'product-secondary-image kp-ornek';
    kat.setAttribute('aria-hidden', 'true');
    kat.appendChild(tuval);
    if (isim) {
      var not = document.createElement('span');
      not.className = 'kp-ornek__not';
      not.textContent = 'Örnek: ' + isim;
      kat.appendChild(not);
    }
    // Dokunmatik ekranda (üzerine gelme yok) örnek tasarım sabit görünür; otomatik yer değiştirme yok
    if (dokunmatik) kat.classList.add('kp-ornek--acik');
    var bag = ic.querySelector('a.product-link') || ic;
    bag.appendChild(kat);
    ic.classList.add('kp-ornek-var');
  };

  // Gerçek örnek fotoğrafı: kutuyu doldurur (cover)
  Bolum.prototype.fotoKoy = function (ic, src) {
    var self = this;
    var r = ic.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cw = Math.round((r.width || 300) * dpr);
    var ch = Math.round((r.height || r.width || 300) * dpr);
    gorselYukle(kucukGorsel(tamAdres(src), Math.max(300, Math.min(900, Math.ceil(Math.max(cw, ch) / 50) * 50))), function (img) {
      if (!img) return;
      var c = tuvalYap(cw, ch);
      var g = c.getContext('2d');
      if (!g) return;
      var k = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, (cw - img.naturalWidth * k) / 2, (ch - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
      self.katmanKoy(ic, c, null);
    });
  };

  var dokunmatik = window.matchMedia && window.matchMedia('(hover: none)').matches;

  // Çizilmiş örneklerin JPEG kopyası (localStorage, en yeni 16): sonraki ziyarette yeniden indirme / çizim yok
  var CIZIM_LISTE = 'kp-ornek-cizim-liste';
  function cizimOku(k) {
    try {
      return window.localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  function cizimYaz(k, c) {
    try {
      var veri = c.toDataURL('image/jpeg', 0.85);
      if (veri.length > 200000) return;
      var liste = JSON.parse(window.localStorage.getItem(CIZIM_LISTE) || '[]').filter(function (x) { return x !== k; });
      liste.unshift(k);
      liste.slice(16).forEach(function (x) { window.localStorage.removeItem(x); });
      window.localStorage.setItem(k, veri);
      window.localStorage.setItem(CIZIM_LISTE, JSON.stringify(liste.slice(0, 16)));
    } catch (e) {
      /* dolu, kapalı ya da tuval okunamıyor: her ziyarette çizilir */
    }
  }

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
