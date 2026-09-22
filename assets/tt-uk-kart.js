/* ------------------------------------------------------------------
   URUN KARTI -- GALERI  (.tt-uk-*)

   Bu dosya YALNIZCA gorunumle ilgileniyor:
     - yatay galerinin nokta gostergesi
     - kaydirma ile dokunmayi ayirmak
     - 2. ve 3. gorselin geciktirilmis yuklenmesi

   Sepete ekleme, set mantigi ve mod degisimi bu dosyada DEGIL:
   onlar bolumun kendi dosyasinda (assets/tt-secim-kartlari.js).
   Kart yalnizca o mantigin tutamaklarini (data-sc-ekle) tasiyor.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  /* Parmak bu kadar yatay giderse tiklama kaydirma sayiliyor ve urun
     sayfasi ACILMIYOR. 8px, listelerde yaygin kullanilan esik: kucuk
     titremeleri tiklama sayacak kadar genis, bilincli bir kaydirmayi
     kacirmayacak kadar dar. */
  var ESIK = 8;

  function kur(serit) {
    if (serit.hasAttribute('data-uk-kurulu')) return;
    serit.setAttribute('data-uk-kurulu', '');

    var kart = serit.closest('.tt-uk');
    var noktalar = kart ? kart.querySelectorAll('[data-uk-noktalar] i') : [];
    var tek = serit.hasAttribute('data-uk-tek');

    /* --- Geciktirilmis gorseller --- */
    var bekleyen = serit.querySelectorAll('img[data-uk-src]');
    var acildi = false;
    function gorselleriAc() {
      if (acildi) return;
      acildi = true;
      for (var i = 0; i < bekleyen.length; i++) {
        var im = bekleyen[i];
        var ss = im.getAttribute('data-uk-srcset');
        if (ss) im.setAttribute('srcset', ss);
        im.setAttribute('src', im.getAttribute('data-uk-src'));
        im.removeAttribute('data-uk-src');
        im.removeAttribute('data-uk-srcset');
      }
    }

    if (bekleyen.length) {
      /* Kart gorus alanina yaklasinca yukleniyor; dokunma/odak da
         hemen aciyor. IntersectionObserver yoksa gecikme birakilmiyor
         -- bos kare gostermektense erken indirmek yeglenir. */
      if (window.IntersectionObserver && kart) {
        var g = new IntersectionObserver(function (girisler) {
          for (var i = 0; i < girisler.length; i++) {
            if (girisler[i].isIntersecting) { gorselleriAc(); g.disconnect(); }
          }
        }, { rootMargin: '200px 0px' });
        g.observe(kart);
      } else {
        gorselleriAc();
      }
      serit.addEventListener('pointerdown', gorselleriAc, { passive: true });
      serit.addEventListener('focusin', gorselleriAc);
      /* Kullanici o karta kaydirmaya BASLAR baslamaz: parmakla gelen
         kaydirmada pointerdown zaten once gelir, ama klavye, tekerlek
         ve programatik kaydirmada tek sinyal bu. */
      serit.addEventListener('scroll', gorselleriAc, { passive: true });
    }

    if (tek) return;

    /* --- Nokta gostergesi ---
       Scroll olayi yogun akiyor; is rAF'a birakiliyor ve ayni karede
       bir kez calisiyor. Dinleyici passive: kaydirmayi geciktirmiyor. */
    var bekliyor = false;
    function ciz() {
      bekliyor = false;
      if (!noktalar.length) return;
      var genislik = serit.clientWidth;
      if (!genislik) return;
      var i = Math.round(serit.scrollLeft / genislik);
      if (i < 0) i = 0;
      if (i > noktalar.length - 1) i = noktalar.length - 1;
      for (var k = 0; k < noktalar.length; k++) {
        noktalar[k].toggleAttribute('data-uk-aktif', k === i);
      }
    }
    serit.addEventListener('scroll', function () {
      if (bekliyor) return;
      bekliyor = true;
      window.requestAnimationFrame(ciz);
    }, { passive: true });

    /* --- Kaydirma mi dokunma mi ---
       Kaydirdiktan sonra parmak kalkinca tarayici yine de bir click
       uretiyor ve urun sayfasi aciliyordu. Yatay hareket esigi asarsa
       click YAKALAMA evresinde iptal ediliyor: link hic tetiklenmiyor.
       Kaydirma bittikten sonra da kisa bir sure kilit kaliyor, cunku
       parmak kalkisi ile click arasinda birkac ms var. */
    var bx = 0, by = 0, kaydi = false, kilitBitis = 0;

    serit.addEventListener('pointerdown', function (e) {
      bx = e.clientX;
      by = e.clientY;
      kaydi = false;
    }, { passive: true });

    serit.addEventListener('pointermove', function (e) {
      if (kaydi) return;
      var dx = Math.abs(e.clientX - bx);
      var dy = Math.abs(e.clientY - by);
      /* Yatay hareket dikeyden BUYUK olmali: asagi kaydirirken parmak
         biraz yana gidiyor diye link olmemeli. */
      if (dx > ESIK && dx > dy) {
        kaydi = true;
        kilitBitis = Date.now() + 350;
      }
    }, { passive: true });

    serit.addEventListener('click', function (e) {
      if (!kaydi && Date.now() > kilitBitis) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    /* Fare/parmak serit disina cikip birakilirsa bayrak asili kalmasin. */
    serit.addEventListener('pointercancel', function () { kaydi = false; }, { passive: true });
  }

  function hepsi() {
    var ler = document.querySelectorAll('[data-uk-serit]');
    for (var i = 0; i < ler.length; i++) kur(ler[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hepsi);
  else hepsi();

  document.addEventListener('shopify:section:load', hepsi);
})();
