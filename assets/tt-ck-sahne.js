/* TT Couple Kapsul -- sahne dongusu.
 *
 * Isaretleme sunucudan "animasyon bitmis" halde geliyor (kapsuller yan
 * yana, butun noktalar gorunur, sayac son degerde). Bu dosya koke
 * data-ck-on basarak animasyonlu hale geciriyor; yani JS yoksa ya da
 * hareket azaltilmissa ekranda zaten dogru bir statik gorsel duruyor
 * ve burada hicbir sey yapilmiyor.
 *
 * Dongu (bir tur = bir bulusma):
 *   yukle 1200ms -> bulus 1000ms -> birik 1100ms -> tekrar 900ms
 * Son bulusmadan sonra noktalar temizlenip sayac sifirlanir, basa doner.
 *
 * Her bolum ornegi kendi durumunu tutuyor; zamanlayicilar ornek
 * basina tutuluyor ve section:unload / ekran disi ciksin diye
 * temizleniyor -- iki ornek ayni sayfada birbirine karismaz.
 */
(function () {
  'use strict';

  var FAZLAR = [
    { ad: 'yukle', sure: 1200 },
    { ad: 'bulus', sure: 1000 },
    { ad: 'birik', sure: 1100 },
    { ad: 'tekrar', sure: 900 }
  ];

  /* kok elemani -> yikici fonksiyon */
  var ORNEKLER = new Map();

  function azaltilmisHareket() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* 4700 -> "4.700". Intl yoksa elle gruplama. */
  function bicim(n) {
    n = Math.round(n);
    try {
      return n.toLocaleString('tr-TR');
    } catch (e) {
      var h = String(n), c = '';
      while (h.length > 3) {
        c = '.' + h.slice(-3) + c;
        h = h.slice(0, -3);
      }
      return h + c;
    }
  }

  /* Elemanin ust'e gore olcusuz konumu. offsetLeft/offsetTop transform'dan
     etkilenmez, bu yuzden animasyon ortasinda da dogru sonuc verir. */
  function merkez(el, ust) {
    var x = 0, y = 0, p = el;
    while (p && p !== ust) {
      x += p.offsetLeft;
      y += p.offsetTop;
      p = p.offsetParent;
    }
    return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 };
  }

  function kur(kok) {
    if (!kok || kok.hasAttribute('data-ck-kurulu')) return;
    if (azaltilmisHareket()) return;

    var sahne = kok.querySelector('[data-ck-sahne]');
    var isaretler = [].slice.call(kok.querySelectorAll('[data-ck-isaret]'));
    var adimlar = [].slice.call(kok.querySelectorAll('[data-ck-adim]'));
    var sayacEl = kok.querySelector('[data-ck-sayac]');
    var hapEl = kok.querySelector('[data-ck-hap]');
    var deltaEl = kok.querySelector('[data-ck-delta]');
    var ucusEl = kok.querySelector('[data-ck-ucus]');
    if (!sahne || !isaretler.length || !sayacEl) return;

    kok.setAttribute('data-ck-kurulu', '');

    var sayacSure = parseInt(kok.getAttribute('data-ck-sure'), 10);
    if (!(sayacSure > 0)) sayacSure = 800;

    var sayilar = isaretler.map(function (el) {
      var v = parseInt(el.getAttribute('data-ck-sayi'), 10);
      return v > 0 ? v : 0;
    });

    var tur = 0;          /* hangi bulusma */
    var faz = 0;          /* FAZLAR icindeki sira */
    var zaman = 0;        /* faz zamanlayicisi */
    var popZaman = 0;
    var deltaZaman = 0;
    var cerceve = 0;      /* sayac rAF */
    var calisiyor = false;
    var gorunur = false;

    function zamanlayicilariDurdur() {
      if (zaman) { clearTimeout(zaman); zaman = 0; }
      if (popZaman) { clearTimeout(popZaman); popZaman = 0; }
      if (deltaZaman) { clearTimeout(deltaZaman); deltaZaman = 0; }
      if (cerceve) { cancelAnimationFrame(cerceve); cerceve = 0; }
    }

    function sifirla() {
      isaretler.forEach(function (el) { el.removeAttribute('data-gor'); });
      sayacEl.textContent = bicim(0);
      if (deltaEl) {
        deltaEl.removeAttribute('data-gor');
        deltaEl.textContent = '';
      }
      if (ucusEl) ucusEl.removeAttribute('data-gor');
      if (hapEl) hapEl.removeAttribute('data-pop');
    }

    function adimiIsaretle(i) {
      adimlar.forEach(function (el, j) {
        if (j === i) el.setAttribute('data-aktif', '');
        else el.removeAttribute('data-aktif');
      });
    }

    /* Sayaci bastan sona ease-out ile sayar. */
    function say(bas, son) {
      if (cerceve) { cancelAnimationFrame(cerceve); cerceve = 0; }
      var t0 = 0;
      function kare(t) {
        if (!t0) t0 = t;
        var o = Math.min(1, (t - t0) / sayacSure);
        var e = 1 - Math.pow(1 - o, 3);
        sayacEl.textContent = bicim(bas + (son - bas) * e);
        if (o < 1) cerceve = requestAnimationFrame(kare);
        else { cerceve = 0; sayacEl.textContent = bicim(son); }
      }
      cerceve = requestAnimationFrame(kare);
    }

    /* 3. asama: foto karti kapsullerden ayrilip siradaki noktaya gider,
       nokta yaylanarak belirir, sayac yeni degere sayar. */
    function biriktir(i) {
      var isaret = isaretler[i];
      if (!isaret) return;

      if (ucusEl) {
        ucusEl.removeAttribute('data-gor');
        var nokta = isaret.querySelector('[data-ck-nokta]') || isaret;
        var a = merkez(ucusEl, sahne);
        var b = merkez(nokta, sahne);
        ucusEl.style.setProperty('--hx', Math.round(b.x - a.x) + 'px');
        ucusEl.style.setProperty('--hy', Math.round(b.y - a.y) + 'px');
        /* animasyonu yeniden baslatmak icin bir kare bekleniyor */
        void ucusEl.offsetWidth;
        ucusEl.setAttribute('data-gor', '');
      }

      isaret.setAttribute('data-gor', '');

      var onceki = i > 0 ? sayilar[i - 1] : 0;
      var simdi = sayilar[i];
      say(onceki, simdi);

      if (hapEl) {
        hapEl.removeAttribute('data-pop');
        void hapEl.offsetWidth;
        hapEl.setAttribute('data-pop', '');
        popZaman = setTimeout(function () {
          popZaman = 0;
          hapEl.removeAttribute('data-pop');
        }, 480);
      }

      if (deltaEl) {
        var fark = simdi - onceki;
        deltaEl.removeAttribute('data-gor');
        deltaEl.textContent = fark > 0 ? '+' + bicim(fark) : '';
        if (fark > 0) {
          void deltaEl.offsetWidth;
          deltaEl.setAttribute('data-gor', '');
          deltaZaman = setTimeout(function () {
            deltaZaman = 0;
            deltaEl.removeAttribute('data-gor');
          }, 1150);
        }
      }
    }

    function fazaGir() {
      var f = FAZLAR[faz];
      kok.setAttribute('data-ck-faz', f.ad);
      adimiIsaretle(faz);

      if (f.ad === 'yukle' && tur === 0) sifirla();
      if (f.ad === 'birik') biriktir(tur);

      zaman = setTimeout(function () {
        zaman = 0;
        faz += 1;
        if (faz >= FAZLAR.length) {
          faz = 0;
          tur += 1;
          if (tur >= isaretler.length) tur = 0;
        }
        fazaGir();
      }, f.sure);
    }

    function basla() {
      if (calisiyor) return;
      calisiyor = true;
      kok.setAttribute('data-ck-on', '');
      fazaGir();
    }

    function duraklat() {
      if (!calisiyor) return;
      calisiyor = false;
      zamanlayicilariDurdur();
    }

    var gozcu = null;
    if (typeof IntersectionObserver === 'function') {
      gozcu = new IntersectionObserver(function (girisler) {
        for (var i = 0; i < girisler.length; i++) {
          gorunur = girisler[i].isIntersecting;
        }
        /* Ekran disinda duruyor, geri gelince bulundugu fazdan devam. */
        if (gorunur) basla();
        else duraklat();
      }, { rootMargin: '80px 0px', threshold: 0.01 });
      gozcu.observe(kok);
    } else {
      basla();
    }

    ORNEKLER.set(kok, function () {
      duraklat();
      if (gozcu) { gozcu.disconnect(); gozcu = null; }
      kok.removeAttribute('data-ck-kurulu');
      kok.removeAttribute('data-ck-on');
      kok.removeAttribute('data-ck-faz');
      adimiIsaretle(-1);
      ORNEKLER.delete(kok);
    });
  }

  function yik(kapsayici) {
    ORNEKLER.forEach(function (iptal, kok) {
      if (kapsayici === kok || kapsayici.contains(kok)) iptal();
    });
  }

  function hepsiniKur(kapsayici) {
    var kokler = (kapsayici || document).querySelectorAll('[data-ck-kok]');
    for (var i = 0; i < kokler.length; i++) kur(kokler[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { hepsiniKur(document); });
  } else {
    hepsiniKur(document);
  }

  document.addEventListener('shopify:section:load', function (e) { hepsiniKur(e.target); });
  document.addEventListener('shopify:section:unload', function (e) { yik(e.target); });
})();
