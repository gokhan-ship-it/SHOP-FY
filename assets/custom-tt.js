/* Text To Next - urun sayfasi ek ogeleri
   Urun basliginin ustune: 5 yildiz - puan - ayrac - kullanici ikonu - kullanici sayisi
   Metinleri degistirmek icin asagidaki AYAR blogunu duzenleyin. */
(function () {
  'use strict';

  var AYAR = {
    puan: '4.9',
    kullanici: '100.000+ Kullanıcı',
    starCount: 5
  };

  var NS = 'http://www.w3.org/2000/svg';

  function svg(cls) {
    var el = document.createElementNS(NS, 'svg');
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('focusable', 'false');
    if (cls) el.setAttribute('class', cls);
    return el;
  }

  function path(d) {
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    return p;
  }

  function shape(def) {
    var el = document.createElementNS(NS, def.t);
    for (var k in def) {
      if (k !== 't' && Object.prototype.hasOwnProperty.call(def, k)) el.setAttribute(k, def[k]);
    }
    return el;
  }

  function buildStars() {
    var wrap = document.createElement('span');
    wrap.className = 'tt-stars';
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', '5 üzerinden ' + AYAR.puan + ' yıldız');
    for (var i = 0; i < AYAR.starCount; i++) {
      var s = svg();
      s.appendChild(path('M12 2.4l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.2l-5.8 3.06 1.11-6.46-4.7-4.58 6.49-.94z'));
      wrap.appendChild(s);
    }
    return wrap;
  }

  function buildUsersIcon() {
    var ic = svg('tt-proof-icon');
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', '9.2');
    c.setAttribute('cy', '8.2');
    c.setAttribute('r', '3.2');
    ic.appendChild(c);
    ic.appendChild(path('M2.8 19.4c.8-3.3 3.4-5.1 6.4-5.1s5.6 1.8 6.4 5.1'));
    ic.appendChild(path('M16.4 5.4a3.2 3.2 0 0 1 0 6.1'));
    ic.appendChild(path('M17.6 14.6c2.1.5 3.4 2.1 3.9 4.3'));
    return ic;
  }

  function span(cls, text) {
    var el = document.createElement('span');
    el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  function buildProof() {
    var row = document.createElement('div');
    row.className = 'tt-proof';
    row.setAttribute('data-tt-proof', '');
    row.appendChild(buildStars());
    if (AYAR.puan) row.appendChild(span('tt-proof-score', AYAR.puan));
    if (AYAR.puan && AYAR.kullanici) row.appendChild(span('tt-proof-sep'));
    if (AYAR.kullanici) {
      row.appendChild(buildUsersIcon());
      row.appendChild(span('tt-proof-users', AYAR.kullanici));
    }
    return row;
  }

  /* --- Sepete Ekle altindaki uc satirin tik ikonlarini degistir --- */
  var SATIR_IKON = [
    {
      ara: 'taksit',
      sekiller: [
        { t: 'rect', x: '2.5', y: '5', width: '19', height: '14', rx: '2.5' },
        { t: 'path', d: 'M2.5 9.5h19' },
        { t: 'path', d: 'M6 14.5h4' }
      ]
    },
    {
      ara: 'kargo',
      sekiller: [
        { t: 'rect', x: '1.8', y: '6', width: '11.4', height: '10', rx: '1.6' },
        { t: 'path', d: 'M13.2 9.4h3.5l3 3.1V16h-6.5z' },
        { t: 'circle', cx: '7', cy: '18', r: '1.9' },
        { t: 'circle', cx: '16.6', cy: '18', r: '1.9' },
        { t: 'path', d: 'M8.9 18h5.8' }
      ]
    },
    {
      ara: 'değişim',
      sekiller: [
        { t: 'path', d: 'M4 10.2a8 8 0 0 1 13.3-4' },
        { t: 'path', d: 'M17.6 3.2v3.4h-3.4' },
        { t: 'path', d: 'M20 13.8a8 8 0 0 1-13.3 4' },
        { t: 'path', d: 'M6.4 20.8v-3.4h3.4' }
      ]
    }
  ];

  function swapRowIcons(scope) {
    var rows = (scope || document).querySelectorAll('.product__text');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var txt = (row.textContent || '').toLowerCase();
      var def = null;
      for (var j = 0; j < SATIR_IKON.length; j++) {
        if (txt.indexOf(SATIR_IKON[j].ara) > -1) { def = SATIR_IKON[j]; break; }
      }
      if (!def) continue;
      var ic = row.querySelector('svg');
      if (!ic || ic.hasAttribute('data-tt-icon')) continue;
      ic.setAttribute('data-tt-icon', '');
      ic.setAttribute('viewBox', '0 0 24 24');
      ic.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      while (ic.firstChild) ic.removeChild(ic.firstChild);
      for (var k = 0; k < def.sekiller.length; k++) ic.appendChild(shape(def.sekiller[k]));
    }
  }

  function mountProof(scope) {
    var title = (scope || document).querySelector('.product__title');
    if (!title || !title.parentNode) return;
    if (title.parentNode.querySelector('[data-tt-proof]')) return;
    title.parentNode.insertBefore(buildProof(), title);
  }

  function init(scope) {
    if (!document.body) return;
    if (document.body.className.indexOf('template-product') === -1) return;
    mountProof(scope);
    swapRowIcons(scope);
  }

  document.addEventListener('shopify:section:load', function (e) { init(e.target); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }
})();

/* ------------------------------------------------------------------
   SEPETTE TUTARI SIFIR OLAN INDIRIM ROZETI GIZLENIYOR

   NE OLUYORDU
   "Ikinci Uronde %50 Indirim" bir BXGY: 1 al, 1'ini yarim fiyata al.
   Shopify indirimi UCUZ satira yaziyor, ama ALINAN satira da bir
   tahsis birakiyor -- tutari 0. Temanin sepeti (sections/cart-drawer
   ve sections/main-cart) butun tahsisleri suzmeden bastigi icin o
   satirda "Ikinci Uronde %50 Indirim" rozeti ve yaninda kirmizi
   "-0,00 TL" cikiyordu. Musteriye sifir tutarli bir indirim vaadi
   gibi okunuyordu.

   NEDEN BURADA, TEMANIN LIQUID'INDE DEGIL
   Dogru yer aslinda o iki Liquid dosyasi; tek satirlik bir kosul
   yeterdi. Ama ikisi de TEMA SATICISININ dosyasi (61 ve 63 KB) ve
   tema her guncellendiginde uzerine yaziliyor -- duzeltme her
   seferinde elle yeniden uygulanmak zorunda kalirdi. Burasi bizim
   dosyamiz, guncellemeden etkilenmiyor ve tek yerden HEM cekmeceyi
   HEM /cart sayfasini kapsiyor.

   Odunu: /cart sayfasinda rozet cok kisa bir an gorunup kaybedebilir
   (script defer). Cekmecede o bile yok, cunku cekmece acilana kadar
   zaten hidden.

   RAKAMLARA DOKUNMUYOR. Yalnizca tutari sifir olan satir DOM'dan
   kaldiriliyor; fiyatlar, ara toplam ve odeme sayfasi aynen kaliyor.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  /* Tutar dizesi sifir mi? Para bicimine bagli kalmamak icin yalnizca
     RAKAMLARA bakiliyor: "-0,00 TL" -> "000" -> sifir;
     "-1.149,50 TL" -> "114950" -> sifir degil. Boylece magaza para
     birimini ya da ayiraclarini degistirse de calisiyor. */
  function sifirMi(metin) {
    var rakamlar = String(metin == null ? '' : metin).replace(/\D/g, '');
    return rakamlar.length > 0 && /^0+$/.test(rakamlar);
  }

  function suz() {
    var satirlar = document.querySelectorAll('.discounts__discount');
    for (var i = 0; i < satirlar.length; i++) {
      var satir = satirlar[i];
      var tutar = satir.querySelector('.badge--onsale');
      /* Tutar rozeti yoksa dokunulmuyor: tanimadigimiz bir bicim. */
      if (!tutar || !sifirMi(tutar.textContent)) continue;
      var liste = satir.parentNode;
      satir.parentNode.removeChild(satir);
      /* Listede baska satir kalmadiysa bosluk birakmasin. */
      if (liste && liste.classList && liste.classList.contains('discounts') &&
          !liste.querySelector('.discounts__discount')) {
        if (liste.parentNode) liste.parentNode.removeChild(liste);
      }
    }
  }

  /* Sepet her degistiginde (adet, kaldir, kod) tema bolumu Section
     Rendering API ile yeniden basiyor; o yuzden tek seferlik suzme
     yetmiyor. Kare basina en fazla bir kez calisiyor.

     Kendi silmelerimiz gozlemciyi bir kez daha tetikliyor; ikinci
     gecis bir sey bulamayip duruyor, yani donguye girmiyor. */
  var bekler = false;
  function planla() {
    if (bekler) return;
    bekler = true;
    window.requestAnimationFrame(function () { bekler = false; suz(); });
  }

  function kur() {
    suz();
    if (!window.MutationObserver || !document.body) return;
    new MutationObserver(planla).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', kur);
  } else {
    kur();
  }
})();
