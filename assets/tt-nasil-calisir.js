/* ------------------------------------------------------------------
   URUN SAYFASI "NASIL CALISIR?" PANELI

   Native <dialog> + showModal(): ust katman, odak tuzagi ve ESC
   bedava geliyor. Ustune eklenen uc sey var:

     1) SAYFA KAYDIRMA KILIDI. <dialog> bunu YAPMIYOR -- perdenin
        uzerinde tekerlek cevrilince arkadaki sayfa kayiyor. iOS
        Safari overflow:hidden'i yok saydigi icin position:fixed +
        negatif top kullaniliyor; kapanista ayni yere donuluyor.

     2) KAPANIS ANIMASYONU. close() ogeyi aninda kaldiriyor, yani
        CSS gecisi gorunmuyor. Once nitelik kaldirilip gecis
        bekleniyor, sonra close().

     3) ASAGI SURUKLEYEREK KAPATMA (yalnizca mobilde). Masaustunde
        panel ortada ve konumu translate ile kuruluyor; surukleme
        orada devre disi, yoksa merkezleme bozulurdu.

   Odak: showModal() odagi panelin icine aliyor; kapanista butona
   geri veriliyor.
   ------------------------------------------------------------------ */
(function () {
  if (window.ttNcHazir) { window.ttNcKur(); return; }
  window.ttNcHazir = true;

  var GECIS = 320;        /* CSS'teki 300ms + kucuk pay */
  var ESIK = 90;          /* bu kadar asagi cekilince kapaniyor */
  var BASLA = 6;          /* surukleme bu kadar hareketten sonra baslar */

  /* ---- sayfa kaydirma kilidi ---- */
  var kilitY = 0;
  var kilitli = false;
  function kilitle() {
    if (kilitli) return;
    kilitli = true;
    kilitY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var b = document.body;
    b.style.position = 'fixed';
    b.style.top = -kilitY + 'px';
    b.style.left = '0';
    b.style.right = '0';
    b.style.width = '100%';
  }
  function coz() {
    if (!kilitli) return;
    kilitli = false;
    var b = document.body;
    b.style.position = '';
    b.style.top = '';
    b.style.left = '';
    b.style.right = '';
    b.style.width = '';
    window.scrollTo(0, kilitY);
  }

  function mobilMi() {
    return !window.matchMedia || window.matchMedia('(max-width: 767px)').matches;
  }

  function kur(kok) {
    if (!kok || kok.ttNcKuruldu) return;
    kok.ttNcKuruldu = true;

    var dugme = kok.querySelector('[data-tt-nc-ac]');
    var kat = kok.querySelector('[data-tt-nc-kat]');
    if (!dugme || !kat) return;
    var panel = kat.querySelector('[data-tt-nc-panel]');
    var zaman = null;

    function ac() {
      if (kat.open) return;
      window.clearTimeout(zaman);
      if (typeof kat.showModal === 'function') kat.showModal();
      else kat.setAttribute('open', '');
      kilitle();
      document.body.setAttribute('data-tt-nc-acik', '');
      /* Nitelik bir sonraki karede konuyor: aksi halde tarayici
         baslangic ve bitis halini ayni karede gorup gecisi atliyor. */
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { kat.setAttribute('data-acik', ''); });
      });
    }

    function kapat() {
      if (!kat.open) return;
      kat.removeAttribute('data-acik');
      if (panel) { panel.style.transform = ''; panel.removeAttribute('data-suruklu'); }
      window.clearTimeout(zaman);
      zaman = window.setTimeout(function () {
        if (typeof kat.close === 'function') kat.close();
        else kat.removeAttribute('open');
        coz();
        document.body.removeAttribute('data-tt-nc-acik');
        try { dugme.focus({ preventScroll: true }); } catch (e) { dugme.focus(); }
      }, GECIS);
    }

    dugme.addEventListener('click', ac);
    kat.addEventListener('click', function (e) {
      if (e.target.closest('[data-tt-nc-kapat]')) kapat();
    });
    /* ESC: varsayilan davranis dialog'u ANINDA kapatirdi, gecis
       gorunmezdi. Iptal edilip kendi kapanisimiz calistiriliyor. */
    kat.addEventListener('cancel', function (e) { e.preventDefault(); kapat(); });

    /* ---- asagi surukleyerek kapatma ---- */
    if (panel && window.PointerEvent) {
      var y0 = 0, dy = 0, cekiyor = false, basladi = false;

      panel.addEventListener('pointerdown', function (e) {
        if (!mobilMi() || e.pointerType === 'mouse') return;
        /* Icerik kaydirilabiliyor ve en ustte degilse once o kaysin. */
        if (panel.scrollTop > 0) return;
        cekiyor = true;
        basladi = false;
        y0 = e.clientY;
        dy = 0;
      });

      panel.addEventListener('pointermove', function (e) {
        if (!cekiyor) return;
        dy = e.clientY - y0;
        if (dy <= 0) { dy = 0; return; }
        if (!basladi) {
          if (dy < BASLA) return;
          basladi = true;
          panel.setAttribute('data-suruklu', '');
        }
        panel.style.transform = 'translateY(' + dy + 'px)';
      });

      function birak() {
        if (!cekiyor) return;
        cekiyor = false;
        panel.removeAttribute('data-suruklu');
        if (basladi && dy > ESIK) {
          kapat();
        } else {
          panel.style.transform = '';
        }
        /* Suruklendiyse parmagin kalktigi yerdeki bag/dugme
           tetiklenmesin: bir kerelik yakalama dinleyicisi. */
        if (basladi) {
          panel.addEventListener('click', function yut(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            panel.removeEventListener('click', yut, true);
          }, true);
        }
        basladi = false;
      }
      panel.addEventListener('pointerup', birak);
      panel.addEventListener('pointercancel', birak);
    }
  }

  window.ttNcKur = function (kapsam) {
    var liste = (kapsam || document).querySelectorAll('[data-tt-nc]');
    for (var i = 0; i < liste.length; i++) kur(liste[i]);
  };

  document.addEventListener('shopify:section:load', function (e) { window.ttNcKur(e.target); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { window.ttNcKur(); });
  } else {
    window.ttNcKur();
  }
})();
