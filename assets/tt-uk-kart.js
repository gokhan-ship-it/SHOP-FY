/* ------------------------------------------------------------------
   URUN KARTI -- GALERI  (.tt-uk-*)

   Bu dosya YALNIZCA gorunumle ilgileniyor:
     - yatay galerinin nokta gostergesi (ve nokta penceresi)
     - kaydirma ile dokunmayi ayirmak
     - gorsellerin kademe kademe yuklenmesi

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
    var noktaKap = kart ? kart.querySelector('[data-uk-noktalar]') : null;
    var noktalar = noktaKap ? noktaKap.querySelectorAll('i') : [];
    var tek = serit.hasAttribute('data-uk-tek');

    /* Nokta PENCERESI: gosterge en fazla bu kadar nokta ciziyor,
       digerleri gizleniyor. Nitelik yoksa pencere yok ve butun
       noktalar duruyor -- koleksiyon kartlari bu yoldan geciyor.
       Hangi noktanin gizlenecegi asagida, ciz() icinde. */
    var pencere = 0;
    if (noktaKap && noktaKap.hasAttribute('data-uk-pencere')) {
      pencere = parseInt(noktaKap.getAttribute('data-uk-pencere'), 10) || 0;
    }

    /* --- Geciktirilmis gorseller --- */
    /* KADEME KADEME iniyor, hepsi birden degil. Serit alti fotografa
       kadar uzayabiliyor ve yan yana duran butun kartlar ayni anda
       gorus alaninda oluyor; "kart gorununce hepsini indir" kurali
       tek seferde onlarca istek aciyordu. Artik her an yalnizca
       bakilanin iki ilerisi hazir -- parmak hep yuklenmis kareye
       geliyor ama indirilmeyen fotograf da indirilmiyor. */
    var bekleyen = serit.querySelectorAll('img[data-uk-src]');
    var acikSayi = 0;
    function gorselleriAc(adet) {
      if (adet == null || adet > bekleyen.length) adet = bekleyen.length;
      for (; acikSayi < adet; acikSayi++) {
        var im = bekleyen[acikSayi];
        var ss = im.getAttribute('data-uk-srcset');
        if (ss) im.setAttribute('srcset', ss);
        im.setAttribute('src', im.getAttribute('data-uk-src'));
        im.removeAttribute('data-uk-src');
        im.removeAttribute('data-uk-srcset');
      }
    }
    /* Ilk kare zaten markupta yuklu; bu sayi ONUN otesinde kac kare
       hazir duracagini soyluyor. */
    var ILERI = 2;

    if (bekleyen.length) {
      /* Kart gorus alanina yaklasinca yukleniyor; dokunma/odak da
         hemen aciyor. IntersectionObserver yoksa gecikme birakilmiyor
         -- bos kare gostermektense erken indirmek yeglenir. */
      if (window.IntersectionObserver && kart) {
        var g = new IntersectionObserver(function (girisler) {
          for (var i = 0; i < girisler.length; i++) {
            if (girisler[i].isIntersecting) { gorselleriAc(ILERI); g.disconnect(); }
          }
        }, { rootMargin: '200px 0px' });
        g.observe(kart);
      } else {
        gorselleriAc(ILERI);
      }
      /* Dinleyiciler olayi ARGUMAN olarak gecirmesin: gorselleriAc bir
         sayi bekliyor, Event gelirse "hepsini ac" demek olurdu. */
      serit.addEventListener('pointerdown', function () { gorselleriAc(ILERI); }, { passive: true });
      serit.addEventListener('focusin', function () { gorselleriAc(ILERI); });
      /* Kullanici o karta kaydirmaya BASLAR baslamaz: parmakla gelen
         kaydirmada pointerdown zaten once gelir, ama klavye, tekerlek
         ve programatik kaydirmada tek sinyal bu. Kacinci kareye
         gelindigine gore ilerletme asagida, ciz() icinde. */
      serit.addEventListener('scroll', function () { gorselleriAc(ILERI); }, { passive: true });
    }

    if (tek) return;

    /* --- Nokta gostergesi ---
       Scroll olayi yogun akiyor; is rAF'a birakiliyor ve ayni karede
       bir kez calisiyor. Dinleyici passive: kaydirmayi geciktirmiyor. */
    var bekliyor = false;
    function ciz() {
      bekliyor = false;
      var genislik = serit.clientWidth;
      if (!genislik) return;
      var kareSayi = serit.children.length;
      var i = Math.round(serit.scrollLeft / genislik);
      if (i < 0) i = 0;
      if (i > kareSayi - 1) i = kareSayi - 1;

      /* Bakilanin iki ilerisi hazir olsun. Ilk kare markupta yuklu
         oldugu icin "bekleyen" dizisi bir kaymis: i. kareye kadar
         hazir olmak i tane acmak demek. */
      gorselleriAc(i + ILERI);

      if (!noktalar.length) return;
      var n = noktalar.length;
      if (i > n - 1) i = n - 1;

      /* Pencere: aktif noktayi ortalamaya calisiyor, iki ucta siniri
         asmadan duruyor. Aktif nokta boylece HER ZAMAN pencerenin
         icinde -- gostergenin genisligi buna guveniyor (bir aktif +
         (p-1) normal nokta, degismiyor).
         Pencere yoksa butun noktalar gorunuyor. */
      var acik = pencere && n > pencere;
      var bas = 0, son = n - 1;
      if (acik) {
        bas = i - ((pencere - 1) >> 1);
        var sonBas = n - pencere;
        if (bas > sonBas) bas = sonBas;
        if (bas < 0) bas = 0;
        son = bas + pencere - 1;
      }

      for (var k = 0; k < n; k++) {
        noktalar[k].toggleAttribute('data-uk-aktif', k === i);
        noktalar[k].toggleAttribute('data-uk-disarda', k < bas || k > son);
        /* Pencerenin otesinde baska fotograf varsa oradaki nokta
           soluk: "devami var" bilgisini nokta sayisini buyutmeden
           veren tek isaret. */
        noktalar[k].toggleAttribute(
          'data-uk-uc',
          acik && ((k === bas && bas > 0) || (k === son && son < n - 1))
        );
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
