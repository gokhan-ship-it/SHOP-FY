/* ------------------------------------------------------------------
   KAMPANYALI COUPLE SETLER -- SERIT GEZINTISI  (.tt-sc-setler-*)

   Seridin KENDISI tarayicinin kaydirmasi; bu dosya yalnizca uzerine
   bir gezinti cubugu koyuyor: iki ok ve nokta gostergesi.

   NEDEN OK SART:
   Kartin icindeki gorsel galerisi de yatayda kayiyor ve
   overscroll-behavior-x: contain tasiyor, yani gorselin uzerinden
   yapilan kaydirma seride GECMIYOR. Gorsel alani kartin buyuk
   kismini kapladigi icin ok olmadan serit cogu zaman
   suruklenemiyordu. Oklar sus degil, gezinmenin kendisi.

   NEDEN ILK HAL GIZLI:
   Kartlar zaten sigiyorsa (az set, genis ekran) cubuk gereksiz.
   Karar olcuye bagli oldugu icin yalnizca burada verilebiliyor;
   markup gizli basiliyor ve sigmayan listede aciliyor. Tersi olsaydi
   sigan listede cubuk bir an gorunup kaybolurdu.

   Bu dosya fiyat, sepet ve indirim mantigina DOKUNMUYOR.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  function kur(serit) {
    if (serit.hasAttribute('data-sc-setler-kurulu')) return;
    serit.setAttribute('data-sc-setler-kurulu', '');

    var kutu = serit.parentNode;
    var nav = kutu ? kutu.querySelector('[data-sc-setler-nav]') : null;
    var noktalar = nav ? nav.querySelectorAll('[data-sc-setler-nokta] i') : [];
    var oklar = nav ? nav.querySelectorAll('[data-sc-setler-ok]') : [];
    if (!nav) return;

    /* Bir adim = bir kart + aradaki bosluk. Kart genisligi ayardan
       geliyor ve ekrana gore degistigi icin olcu HER SEFERINDE
       ogeden okunuyor, bir yere yazilmiyor. */
    function adim() {
      var kart = serit.querySelector('.tt-sc-setkart');
      if (!kart) return serit.clientWidth;
      var g = kart.getBoundingClientRect().width;
      var ara = parseFloat(getComputedStyle(serit).columnGap);
      if (!isFinite(ara)) ara = 0;
      return g + ara;
    }

    /* Yuvarlama payi: scrollLeft kesirli gelebiliyor (tarayici
       olcegi, yuzde genislik). 2px'lik pay olmadan son karta
       gelindiginde "ileri" oku acik kaliyordu. */
    var PAY = 2;

    var bekliyor = false;
    function ciz() {
      bekliyor = false;

      var kaydirilabilir = serit.scrollWidth - serit.clientWidth;
      nav.hidden = kaydirilabilir <= PAY;
      if (nav.hidden) return;

      var sol = serit.scrollLeft;
      for (var o = 0; o < oklar.length; o++) {
        var yon = parseInt(oklar[o].getAttribute('data-sc-setler-ok'), 10);
        oklar[o].disabled = yon < 0
          ? sol <= PAY
          : sol >= kaydirilabilir - PAY;
      }

      if (!noktalar.length) return;
      var a = adim();
      var i = a > 0 ? Math.round(sol / a) : 0;
      if (i < 0) i = 0;
      if (i > noktalar.length - 1) i = noktalar.length - 1;
      /* Son kart gorunuyorsa son nokta yansin: kalan yol tam bir
         adimdan kisa oldugu icin bolme asagi yuvarlar ve gosterge
         sona hic ulasmazdi. */
      if (sol >= kaydirilabilir - PAY) i = noktalar.length - 1;
      for (var k = 0; k < noktalar.length; k++) {
        noktalar[k].toggleAttribute('data-sc-aktif', k === i);
      }
    }

    serit.addEventListener('scroll', function () {
      if (bekliyor) return;
      bekliyor = true;
      window.requestAnimationFrame(ciz);
    }, { passive: true });

    for (var o = 0; o < oklar.length; o++) {
      oklar[o].addEventListener('click', function (e) {
        var yon = parseInt(e.currentTarget.getAttribute('data-sc-setler-ok'), 10);
        var kisa = window.matchMedia
          && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        serit.scrollBy({ left: yon * adim(), behavior: kisa ? 'auto' : 'smooth' });
      });
    }

    /* Genislik degisince (ekran donmesi, masaustune gecis) kart
       olcusu ve kaydirilabilir mesafe degisiyor. */
    if (window.ResizeObserver) {
      new window.ResizeObserver(ciz).observe(serit);
    } else {
      window.addEventListener('resize', ciz);
    }

    ciz();
  }

  function hepsi() {
    var ler = document.querySelectorAll('.tt-sc-setler-izgara');
    for (var i = 0; i < ler.length; i++) kur(ler[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hepsi);
  else hepsi();

  document.addEventListener('shopify:section:load', hepsi);
})();
