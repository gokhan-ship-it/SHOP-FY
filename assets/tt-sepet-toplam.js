/* ------------------------------------------------------------------
   SEPET ARA TOPLAMINDA INDIRIM ONCESI TUTAR (USTU CIZILI)

   NE ISTENDI
   Musteri urun sayfasinda indirimli fiyati goruyor, sepette ise yalnizca
   son tutari goruyordu; kazandigi indirim ara toplamda gorunmuyordu.

   NEDEN SATIRA DEGIL, ARA TOPLAMA
   Cark kuponu (K7QX4M9TR) bir SIPARIS indirimi: Shopify onu satirlara
   DAGITMIYOR, sepetin tamamindan dusuyor. Bu yuzden item.final_price
   hic degismiyor ve temanin satirdaki hazir ustu-cizili kodu
   (sections/cart-drawer.liquid ve sections/main-cart.liquid icindeki
   "item.original_price != item.final_price" kosulu) calismiyor.
   Shopify'in kendi belgesi de boyle diyor: sepetin tamamina uygulanan
   indirim ara toplam ile toplam ARASINDA gosterilir.

   Satira "-500" yazsaydik tek uronde tutardi ama IKI uronde tutmazdi:
   500 TL bir kez dusuyor, satir basina degil. Sepet, odeme ekranindan
   onceki SON ekran; oradaki uyusmazlik en pahali olani. Bu yuzden
   satira dokunulmuyor.

   RAKAM URETILMIYOR
   Iki tutar da Shopify'dan, /cart.js'ten oldugu gibi aliniyor:
     original_total_price -> ustu cizili (indirim oncesi)
     total_price          -> temanin zaten bastigi tutar
   Toplama, cikarma, oranlama YOK. Ustelik cizmeden once temanin
   ekranda yazdigi metin ile /cart.js'ten gelen total_price'in bicimlisi
   KARSILASTIRILIYOR; birebir tutmuyorsa (veri bayatlamis demektir)
   hicbir sey cizilmiyor. Yani ekranda gorunen ustu cizili tutar, ancak
   yanindaki tutarin dogrulugu kanitlandiginda cikiyor.

   Kapsam: hem sepet cekmecesi hem /cart sayfasi, tek kanca
   (.totals__subtotal-value) ile. Ikisi de tema saticisinin dosyasi
   oldugu icin duzeltme -- "-0,00 TL" rozetinde oldugu gibi -- burada
   duruyor, tema guncellemesinden etkilenmiyor.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var KANCA = '.totals__subtotal-value';
  var SINIF = 'tt-sepet-eski';

  /* ---------- Para bicimi ----------
     Bicim koda GOMULMUYOR; layout/theme.liquid Shopify'in kendi
     ciktisini ornek olarak veriyor (window.ttParaOrnek). Asagisi o
     ornegi cozuyor, sonra cozdugu kurali ornegin KENDISINE uygulayip
     ayni dizeyi uretip uretmedigine bakiyor. Uretmiyorsa bicim null
     kaliyor ve bu blok hicbir sey yapmiyor. */
  function bicimCoz() {
    var o = window.ttParaOrnek;
    if (!o || typeof o.s !== 'string' || typeof o.k !== 'number') return null;

    /* Ilk rakamdan SON rakama kadar olan bolum sayidir; oncesi ve
       sonrasi para biriminin oneki/soneki. Ayraclarin ne oldugunu
       bilmeye gerek yok, cunku hicbir para birimi adinda rakam yok. */
    var m = o.s.match(/\d[\s\S]*\d|\d/);
    if (!m) return null;

    var cekirdek = m[0];
    var kural = {
      onEk: o.s.slice(0, m.index),
      sonEk: o.s.slice(m.index + cekirdek.length),
      ondalik: '',
      basamak: 0,
      binlik: ''
    };

    /* Sondaki iki rakamdan once bir ayrac varsa o ondalik ayracidir.
       "1,234,567.89" -> "."   |   "1,234,568" -> ayrac yok, kurussuz. */
    var son = cekirdek.match(/(\D)(\d{2})$/);
    var govde = cekirdek;
    if (son) {
      kural.ondalik = son[1];
      kural.basamak = 2;
      govde = cekirdek.slice(0, -3);
    }

    /* Geri kalanda gorunen ilk ayrac binlik ayracidir. */
    var ayrac = govde.match(/\D/);
    if (ayrac) kural.binlik = ayrac[0];

    return yaz(kural, o.k) === o.s ? kural : null;
  }

  function yaz(kural, kurus) {
    var eksi = kurus < 0;
    var n = Math.abs(kurus) / 100;
    var tam, kesir = '';

    if (kural.basamak === 2) {
      var s = n.toFixed(2);
      tam = s.slice(0, -3);
      kesir = s.slice(-2);
    } else {
      tam = String(Math.round(n));
    }
    if (kural.binlik) tam = tam.replace(/\B(?=(\d{3})+(?!\d))/g, kural.binlik);

    return (eksi ? '-' : '') + kural.onEk + tam +
      (kural.basamak === 2 ? kural.ondalik + kesir : '') + kural.sonEk;
  }

  var BICIM = null;

  /* ---------- DOM ---------- */

  /* Elemanin TEMAYA ait metni: kendi ekledigimiz span disarida birakilir.
     Boylece "tema ne yazmis" sorusunu kendi eklentimiz kirletmiyor. */
  function saf(el) {
    var s = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      var d = el.childNodes[i];
      if (d.nodeType === 1 && d.classList && d.classList.contains(SINIF)) continue;
      s += d.textContent;
    }
    return s.trim();
  }

  function kutu(metin) {
    var el = document.createElement('span');
    el.className = SINIF;
    el.textContent = metin;
    /* Ekran okuyucuya iki tutar arka arkaya okunmasin: indirim zaten
       ayri bir satirda ("K7QX4M9TR  -500.00TL") sesli okunuyor. */
    el.setAttribute('aria-hidden', 'true');
    el.style.textDecoration = 'line-through';
    el.style.opacity = '.45';
    el.style.fontWeight = '400';
    el.style.fontSize = '.7em';
    el.style.marginInlineEnd = '.35em';
    el.style.whiteSpace = 'nowrap';
    return el;
  }

  function ciz(veri) {
    var liste = document.querySelectorAll(KANCA);
    var simdi = yaz(BICIM, veri.total_price);
    var once = yaz(BICIM, veri.original_total_price);

    for (var i = 0; i < liste.length; i++) {
      var el = liste[i];
      var mevcut = el.querySelector('.' + SINIF);

      /* Ucu birden saglanmadikca cizilmiyor:
         1) temanin yazdigi tutar elimizdeki veriyle BIREBIR ayni
         2) indirim oncesi tutar gercekten daha yuksek */
      var uygun = saf(el) === simdi && veri.original_total_price > veri.total_price;

      if (!uygun) {
        if (mevcut && mevcut.parentNode) mevcut.parentNode.removeChild(mevcut);
        continue;
      }
      /* Zaten dogruysa DOM'a dokunulmuyor -- gozlemci sonsuz donmesin. */
      if (mevcut && mevcut.textContent === once) continue;
      if (mevcut && mevcut.parentNode) mevcut.parentNode.removeChild(mevcut);
      el.insertBefore(kutu(once), el.firstChild);
    }
  }

  /* ---------- Veri ---------- */
  var veri = null;
  var istekVar = false;
  var denenen = null;   /* hangi tema metni icin zaten istek attik */

  function getir() {
    if (istekVar || typeof window.fetch !== 'function') return;
    istekVar = true;
    window.fetch('/cart.js', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    }).then(function (y) {
      return y.ok ? y.json() : null;
    }).then(function (j) {
      istekVar = false;
      if (!j || typeof j.total_price !== 'number' ||
          typeof j.original_total_price !== 'number') return;
      veri = j;
      ciz(j);
    })['catch'](function () { istekVar = false; });
  }

  /* Sepet degisince tema bolumu Section Rendering API ile yeniden
     basiliyor; o yuzden tek seferlik calismak yetmiyor.

     Istek yagmurunu onleyen iki fren: elimizdeki veri ekrandakiyle
     uyusuyorsa hic istek atilmiyor; uymuyorsa AYNI metin icin yalnizca
     bir kez isteniyor. Yani tanimadigimiz bir tutar (ornegin bir para
     birimi cevirici uygulamasi) sonsuz istek uretemiyor. */
  function tik() {
    if (!BICIM) return;
    var liste = document.querySelectorAll(KANCA);
    if (!liste.length) return;

    var metin = saf(liste[0]);
    if (veri && yaz(BICIM, veri.total_price) === metin) { ciz(veri); return; }
    if (denenen === metin) return;
    denenen = metin;
    getir();
  }

  var bekler = false;
  function planla() {
    if (bekler) return;
    bekler = true;
    window.requestAnimationFrame(function () { bekler = false; tik(); });
  }

  function kur() {
    BICIM = bicimCoz();
    if (!BICIM) return;
    tik();
    if (!window.MutationObserver || !document.body) return;
    new MutationObserver(planla).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('cart:refresh', planla);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', kur);
  } else {
    kur();
  }
})();
