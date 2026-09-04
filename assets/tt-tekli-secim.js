/* ------------------------------------------------------------------
   TEKLI URUN SAYFASI - SAG SUTUN SECIM KATMANI

   Hicbir paylasilan dosyaya dokunmadan calisir:

   - Ham madde segmenti temanin <variant-picker> elementindeki gercek
     radio input'u tetikler. Fiyat, adres satiri, form ve stok durumu
     temanin kendi akisinda guncellenir.
   - Taksit kutusu icin [data-tt-tk-veri] ozniteligi guncellenir;
     taksit-tablosu.js onu her cagrida yeniden okudugu icin hem satir
     hem modal dogru tutari gosterir. O dosya degistirilmez.
   - Native secici ve native sepet butonu YALNIZCA kurulum basariyla
     bittikten sonra gizlenir. JS calismazsa sayfa eski haliyle tam
     calisir kalir.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  if (window.__ttTsKurulu) return;
  window.__ttTsKurulu = true;

  var KOK = document.querySelector('[data-tt-ts]');
  if (!KOK) return;

  var V = null;
  try {
    V = JSON.parse(KOK.querySelector('[data-tt-ts-veri]').textContent);
  } catch (e) { return; }
  if (!V || !V.varyantlar || !V.varyantlar.length) return;

  var secici = document.getElementById(KOK.getAttribute('data-tt-ts-secici'));
  var form = document.getElementById(KOK.getAttribute('data-tt-ts-form'));
  var mod = 'tek';

  /* --- Turkce para bicimi: binlik nokta, kurus virgul. --- */
  function para(kurus) {
    var t = (Math.round(kurus) / 100).toFixed(2).split('.');
    return t[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + t[1] + ' TL';
  }

  function varyantBul(id) {
    for (var i = 0; i < V.varyantlar.length; i++) {
      if (String(V.varyantlar[i].id) === String(id)) return V.varyantlar[i];
    }
    return null;
  }

  /* Secili varyant: once formun gizli input'u, sonra adres satiri,
     en son ilk stoklu varyant. */
  function seciliVaryant() {
    var el = form && form.querySelector('input[name="id"]');
    var v = el && varyantBul(el.value);
    if (v) return v;
    var id = new URLSearchParams(location.search).get('variant');
    v = id && varyantBul(id);
    if (v) return v;
    for (var i = 0; i < V.varyantlar.length; i++) {
      if (V.varyantlar[i].stok) return V.varyantlar[i];
    }
    return V.varyantlar[0];
  }

  /* --- Tutarlar --- */
  function tekKurus() { return seciliVaryant().kurus; }
  function setKurus() {
    var p = tekKurus();
    return p + Math.round(p * (100 - V.indirim) / 100);
  }
  function setEskiKurus() { return tekKurus() * 2; }
  function aktifKurus() { return mod === 'set' ? setKurus() : tekKurus(); }

  /* ------------------------------------------------------------------
     TAKSIT KUTUSU
     taksit-tablosu.js tutari [data-tt-tk-veri] ozniteliginden HER
     CAGRIDA yeniden okuyor. Secili varyantin karsiligini ve varsayilani
     aktif tutara cekince hem satir hem modal dogru calisiyor.
     Orijinal deger saklaniyor, tek moda donunce geri yaziliyor.
     ------------------------------------------------------------------ */
  var tkEl = null, tkAsil = null;
  function tkHazirla() {
    tkEl = document.querySelector('[data-tt-tk-veri]');
    if (tkEl && tkAsil === null) tkAsil = tkEl.getAttribute('data-tt-tk-veri');
  }
  function tkYaz() {
    tkHazirla();
    if (!tkEl || !tkAsil) return;
    var d;
    try { d = JSON.parse(tkAsil); } catch (e) { return; }
    var hedef = aktifKurus();
    d.varsayilan = hedef;
    if (!d.varyantlar) d.varyantlar = {};
    /* Adres satirinda hangi varyant varsa fbFiyat onu okuyor. */
    for (var i = 0; i < V.varyantlar.length; i++) {
      d.varyantlar[String(V.varyantlar[i].id)] = hedef;
    }
    tkEl.setAttribute('data-tt-tk-veri', JSON.stringify(d));
  }
  function tkGeriAl() {
    tkHazirla();
    if (tkEl && tkAsil) tkEl.setAttribute('data-tt-tk-veri', tkAsil);
  }

  /* Temanin fiyat alani. Set modunda toplam + ustu cizili tutar
     buraya yaziliyor; bu degisiklik ayni zamanda taksit-tablosu.js'in
     .price uzerindeki gozlemcisini tetikleyip satiri yeniden cizdiriyor. */
  function fiyatAlani() { return document.querySelector('.product__info-container .price, .price'); }

  var fiyatAsil = null;
  function fiyatYaz() {
    var el = fiyatAlani();
    if (!el) return;
    if (fiyatAsil === null) fiyatAsil = el.innerHTML;
    if (mod !== 'set') { el.innerHTML = fiyatAsil; return; }
    el.innerHTML =
      '<span class="tt-ts-fiyat-set">' + para(setKurus()) + '</span> ' +
      '<s class="tt-ts-fiyat-eski">' + para(setEskiKurus()) + '</s>';
  }

  /* --- Ham madde segmenti --- */
  function nativeRadyo(deger) {
    if (!secici) return null;
    return secici.querySelector('input[type="radio"][data-option-value="' +
      String(deger).replace(/"/g, '\\"') + '"]');
  }

  function segmentBagla() {
    var hucreler = KOK.querySelectorAll('[data-tt-ts-hm]');
    if (!hucreler.length || !secici) return false;
    var bagliSayi = 0;
    for (var i = 0; i < hucreler.length; i++) {
      (function (h) {
        var r = nativeRadyo(h.getAttribute('data-tt-ts-hm'));
        if (!r) return;
        bagliSayi++;
        h.addEventListener('click', function () {
          if (r.checked) return;
          r.checked = true;
          r.dispatchEvent(new Event('change', { bubbles: true }));
          r.click();
        });
      })(hucreler[i]);
    }
    /* Her secenege karsilik gelen native input bulunamadiysa segmenti
       devreye almiyoruz -- yarim calisan bir secici olmasin. */
    return bagliSayi === hucreler.length;
  }

  function segmentTazele() {
    var v = seciliVaryant();
    var hucreler = KOK.querySelectorAll('[data-tt-ts-hm]');
    for (var i = 0; i < hucreler.length; i++) {
      var esit = hucreler[i].getAttribute('data-tt-ts-hm') === v.deger;
      hucreler[i].setAttribute('aria-checked', esit ? 'true' : 'false');
    }
  }

  /* --- Kartlar, ozet, buton --- */
  function ciz() {
    segmentTazele();

    var tek = KOK.querySelector('[data-tt-ts-tek-fiyat]');
    if (tek) tek.textContent = para(tekKurus());
    var sf = KOK.querySelector('[data-tt-ts-set-fiyat]');
    if (sf) sf.textContent = para(setKurus());
    var se = KOK.querySelector('[data-tt-ts-set-eski]');
    if (se) se.textContent = para(setEskiKurus());

    var kartlar = KOK.querySelectorAll('[data-tt-ts-mod]');
    for (var i = 0; i < kartlar.length; i++) {
      kartlar[i].setAttribute('aria-checked',
        kartlar[i].getAttribute('data-tt-ts-mod') === mod ? 'true' : 'false');
    }

    var ozet = KOK.querySelector('[data-tt-ts-ozet]');
    if (ozet) {
      if (mod === 'set') {
        ozet.hidden = false;
        ozet.textContent = V.urun + ' + ' + V.urun + ' · 2 ürün';
      } else {
        ozet.hidden = true;
      }
    }

    var btn = KOK.querySelector('[data-tt-ts-sepet]');
    if (btn) btn.textContent = V.sepetMetin + ' · ' + para(aktifKurus());

    fiyatYaz();
    if (mod === 'set') tkYaz(); else tkGeriAl();
  }

  /* --- Sepete ekleme --- */
  function sepeteEkle(e) {
    if (mod !== 'set') return;          /* tek mod: formun kendi akisi */
    e.preventDefault();
    var v = seciliVaryant();
    var btn = KOK.querySelector('[data-tt-ts-sepet]');
    if (btn) btn.disabled = true;
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ id: v.id, quantity: 2 }] })
    }).then(function (r) { return r.json(); })
      .then(function () { window.location.href = '/cart'; })
      .catch(function () { if (btn) btn.disabled = false; });
  }

  /* --- Kurulum --- */
  var segmentTamam = segmentBagla();

  var kartlar = KOK.querySelectorAll('[data-tt-ts-mod]');
  for (var i = 0; i < kartlar.length; i++) {
    (function (k) {
      k.addEventListener('click', function () {
        mod = k.getAttribute('data-tt-ts-mod');
        ciz();
      });
    })(kartlar[i]);
  }

  var sepet = KOK.querySelector('[data-tt-ts-sepet]');
  if (sepet) sepet.addEventListener('click', sepeteEkle);

  /* Native secici degisince (kendi segmentimizden veya baska yoldan)
     kartlari ve tutarlari tazele. */
  if (secici) {
    secici.addEventListener('change', function () { window.setTimeout(ciz, 60); });
  }

  /* Segment eksiksiz bagliysa native seciciyi ve native sepet butonunu
     gizle. Bagli degilse ikisi de gorunur kalir: sayfa bozulmaz. */
  if (segmentTamam) {
    KOK.setAttribute('data-tt-ts-hazir', '');
    if (secici) secici.classList.add('tt-ts-native-gizli');
    if (form) {
      var nb = form.querySelector('[name="add"], button[type="submit"]');
      if (nb) nb.classList.add('tt-ts-native-gizli');
    }
  }

  ciz();
})();
