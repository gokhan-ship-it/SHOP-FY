/* ------------------------------------------------------------------
   COK SATANLAR SERIDI  (.tt-cs-*)

   Bu dosya YALNIZCA gorunumle ilgileniyor:
     - kategori cipleri (Tumu / Couple / Kadin / Erkek)
     - nokta gostergesi ve ok butonlari
   Fiyat, indirim ve sepet mantigi burada YOK. Indirimli fiyat blogunu
   assets/taksit-tablosu.js (kolCiz) aciyor; bu dosya ona hic
   dokunmuyor.

   Her bolum kendi durumunu tasiyor: ayni sayfada iki kez eklenirse
   ikisi birbirini bozmuyor. Tema editorunde bolum yeniden yuklenince
   (shopify:section:load) yeni kok icin bastan kuruluyor.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  function kur(kok) {
    /* Nitelik kurulumun kendisinde: ayni kok iki kez gecerse
       (DOMContentLoaded + section:load) ikinci cagri hemen donuyor. */
    if (kok.hasAttribute('data-cs-kurulu')) return;
    kok.setAttribute('data-cs-kurulu', '');

    var serit = kok.querySelector('[data-cs-serit]');
    if (!serit) return;

    var kartlar = Array.prototype.slice.call(kok.querySelectorAll('[data-cs-kart]'));
    var cipler = Array.prototype.slice.call(kok.querySelectorAll('[data-cs-cip]'));
    var oklar = Array.prototype.slice.call(kok.querySelectorAll('[data-cs-ok]'));
    var nav = kok.querySelector('[data-cs-nav]');
    var noktaKap = kok.querySelector('[data-cs-noktalar]');
    var kat = 'tumu';

    function gorunenler() {
      var g = [];
      for (var i = 0; i < kartlar.length; i++) if (!kartlar[i].hidden) g.push(kartlar[i]);
      return g;
    }

    /* Nokta sayisi gorunen kart sayisi kadar: filtre degisince
       noktalar da yeniden hesaplaniyor. Ogeler yeniden yaratilmak
       yerine eklenip cikariliyor, boylece gecis animasyonu kopmuyor. */
    function noktaKur(n) {
      if (!noktaKap) return [];
      while (noktaKap.children.length > n) noktaKap.removeChild(noktaKap.lastChild);
      while (noktaKap.children.length < n) noktaKap.appendChild(document.createElement('i'));
      return Array.prototype.slice.call(noktaKap.children);
    }

    /* Bir "adim" = kart genisligi + aradaki bosluk. Olcu CSS'ten
       okunuyor, JS'e kopyalanmiyor: kart genisligi mobil/masaustu
       ve ayar degisince kendiliginden dogru kaliyor. */
    function adim() {
      var g = gorunenler();
      if (!g.length) return serit.clientWidth || 1;
      var r = g[0].getBoundingClientRect();
      var ara = 12;
      if (g.length > 1) {
        var fark = g[1].getBoundingClientRect().left - r.right;
        if (fark > 0) ara = fark;
      }
      return r.width + ara;
    }

    var bekliyor = false;
    function ciz() {
      bekliyor = false;
      var g = gorunenler();
      var noktalar = noktaKur(g.length);
      var a = adim();

      var son = serit.scrollWidth - serit.clientWidth;
      var basta = serit.scrollLeft <= 1;
      /* 2px pay: tarayicilar kesirli scrollLeft dondurebiliyor. */
      var sonda = serit.scrollLeft >= son - 2;

      var i = a ? Math.round(serit.scrollLeft / a) : 0;
      if (i < 0) i = 0;
      if (i > g.length - 1) i = g.length - 1;
      /* Sona yaslanildiginda son kart aktif sayiliyor: masaustunde
         ayni anda 3 kart gorundugu icin scrollLeft hicbir zaman
         (n-1) adima ulasmiyor ve son nokta aksi halde hic yanmazdi. */
      if (sonda && g.length) i = g.length - 1;

      for (var k = 0; k < noktalar.length; k++) {
        if (k === i) noktalar[k].setAttribute('data-cs-aktif', '');
        else noktalar[k].removeAttribute('data-cs-aktif');
      }

      for (var o = 0; o < oklar.length; o++) {
        var yon = parseInt(oklar[o].getAttribute('data-cs-ok'), 10) || 0;
        oklar[o].disabled = g.length < 2 || (yon < 0 ? basta : sonda);
      }

      /* Tek kart kaldiysa gezinti bilgi tasimiyor. */
      if (nav) nav.hidden = g.length < 2;
    }

    serit.addEventListener('scroll', function () {
      if (bekliyor) return;
      bekliyor = true;
      window.requestAnimationFrame(ciz);
    }, { passive: true });

    for (var o = 0; o < oklar.length; o++) {
      (function (dugme) {
        dugme.addEventListener('click', function () {
          var yon = parseInt(dugme.getAttribute('data-cs-ok'), 10) || 1;
          serit.scrollBy({ left: adim() * yon, behavior: 'smooth' });
        });
      })(oklar[o]);
    }

    /* --- Cipler --- */
    function cipSec(yeni) {
      kat = yeni;
      for (var c = 0; c < cipler.length; c++) {
        var secili = cipler[c].getAttribute('data-cs-cip') === kat;
        cipler[c].setAttribute('aria-checked', secili ? 'true' : 'false');
        cipler[c].setAttribute('tabindex', secili ? '0' : '-1');
      }
      for (var k = 0; k < kartlar.length; k++) {
        kartlar[k].hidden = !(kat === 'tumu' || kartlar[k].getAttribute('data-cs-kat') === kat);
      }
      /* Filtre degisince serit basa donuyor: ikinci kategoride
         kaydirilmis bir yerden baslamak "kart yok" izlenimi
         veriyordu. Noktalar ciz() icinde yeniden kuruluyor. */
      serit.scrollLeft = 0;
      ciz();
    }

    for (var c = 0; c < cipler.length; c++) {
      (function (cip) {
        cip.addEventListener('click', function () { cipSec(cip.getAttribute('data-cs-cip')); });
        /* Radiogroup klavye gezinmesi: ok tuslari cipler arasinda
           dolasiyor, Home/End uclara gidiyor. */
        cip.addEventListener('keydown', function (e) {
          var yon = 0;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') yon = 1;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') yon = -1;
          else if (e.key === 'Home') yon = -99;
          else if (e.key === 'End') yon = 99;
          else return;
          e.preventDefault();
          var su = cipler.indexOf(cip);
          var hedef = yon === -99 ? 0 : (yon === 99 ? cipler.length - 1 : su + yon);
          if (hedef < 0) hedef = cipler.length - 1;
          if (hedef > cipler.length - 1) hedef = 0;
          cipler[hedef].focus();
          cipSec(cipler[hedef].getAttribute('data-cs-cip'));
        });
      })(cipler[c]);
    }

    /* Kart genisligi ekrana gore degisiyor; adim da degisiyor. */
    window.addEventListener('resize', function () {
      if (bekliyor) return;
      bekliyor = true;
      window.requestAnimationFrame(ciz);
    }, { passive: true });

    ciz();
  }

  function hepsi(kapsam) {
    var kok = (kapsam || document).querySelectorAll('[data-tt-cs]');
    for (var i = 0; i < kok.length; i++) kur(kok[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { hepsi(); });
  } else {
    hepsi();
  }

  document.addEventListener('shopify:section:load', function (e) {
    hepsi(e.target || document);
  });
})();
