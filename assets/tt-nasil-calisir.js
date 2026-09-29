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

  /* ---- sayfa kaydirma kilidi ----
     SAYAC, bayrak degil: panelden karsilastirma katmanina gecerken
     ikisi kisa bir sure ayni anda aciktir (panelin kapanis gecisi
     surerken katman aciliyor). Bayrak olsaydi panelin kapanisi
     katmanin kilidini de cozer, arkadaki sayfa kayardi. */
  var kilitY = 0;
  var kilitSay = 0;
  function kilitle() {
    kilitSay++;
    if (kilitSay > 1) return;
    kilitY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var b = document.body;
    b.style.position = 'fixed';
    b.style.top = -kilitY + 'px';
    b.style.left = '0';
    b.style.right = '0';
    b.style.width = '100%';
  }
  function coz() {
    if (kilitSay === 0) return;
    kilitSay--;
    if (kilitSay > 0) return;
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

  /* ------------------------------------------------------------------
     KARSILASTIRMA KATMANI

     Ucuncu kart "Catal Karsilastirma" bolumunu tam ekran aciyor. O
     bolum bu bolumun ICINDE degil: ayni bolum grubunun ikinci uyesi,
     yani DOM'da ayri bir kardes. Tasinmiyor, kopyalanmiyor -- oldugu
     yerde position: fixed'e aliniyor. Tasima denenmedi bilerek: bu
     temada bir bolumu JS ile tasimak daha once sessiz kayiplara yol
     acti.

     <dialog> kullanilamiyor (oge bizim degil), o yuzden showModal()
     ile bedava gelen uc sey elle kuruluyor: rol, odak tuzagi, ESC.
     ------------------------------------------------------------------ */
  var farkKok = null;      /* katman ogesi */
  var farkAcan = null;     /* katmani acan kart; kapanista odak ona doner */
  var farkKapatDugme = null;

  var ODAKLANIR = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function farkBul(secici) {
    if (farkKok || !secici) return farkKok;
    try {
      farkKok = document.querySelector(secici);
    } catch (e) {
      farkKok = null;
    }
    if (!farkKok) return null;

    farkKok.classList.add('tt-nc-fark-kat');
    farkKok.setAttribute('role', 'dialog');
    farkKok.setAttribute('aria-modal', 'true');
    farkKok.setAttribute('tabindex', '-1');
    return farkKok;
  }

  /* Bolumun kendi iki secim butonunu ("Single'i sec" / "Couple'i
     sec") gizleyip yerine tek bir "devam" dugmesi koyuyor.

     Neden burada ve neden secici ile: karsilastirma bolumunun kendi
     dosyasina dokunulmuyor -- ana sayfada ayni bolum iki butonuyla
     calismaya devam ediyor. Katmanda ise musteriyi baska bir sayfaya
     atmak istemiyoruz; bilgiye baktiktan sonra bulundugu yerde
     kalmali.

     Buton bolumun KOK ogesinin icine konuyor ki --tt-catal-* renk
     degiskenlerini miras alsin. */
  function farkDevamKur(metin) {
    if (!farkKok || farkKok.ttNcDevam) return;
    farkKok.ttNcDevam = true;

    var sira = farkKok.querySelector('[class*="tt-catal-btns-"]');
    if (sira) sira.style.display = 'none';

    var d = document.createElement('button');
    d.type = 'button';
    d.className = 'tt-nc-fark-devam';
    d.textContent = metin;
    d.addEventListener('click', farkKapat);

    /* Iki butonun durdugu yere; o satir yoksa icerigin sonuna. */
    var kap = sira ? sira.parentNode : farkKok.querySelector('[class*="tt-catal-inner-"]');
    if (!kap) kap = farkKok.firstElementChild || farkKok;
    if (sira) kap.insertBefore(d, sira.nextSibling);
    else kap.appendChild(d);
  }

  /* Bolumun kok ogesi: katmanin ilk DIV cocugu. firstElementChild
     kullanilmiyor cunku bolum kendi <style> etiketiyle basliyor. */
  function farkKart() {
    if (!farkKok) return null;
    var c = farkKok.children;
    for (var i = 0; i < c.length; i++) {
      if (c[i].tagName === 'DIV') return c[i];
    }
    return null;
  }

  function farkKapatKur(etiket, ikon) {
    if (farkKapatDugme) return;
    farkKapatDugme = document.createElement('button');
    farkKapatDugme.type = 'button';
    farkKapatDugme.className = 'tt-nc-fark-kapat';
    farkKapatDugme.setAttribute('aria-label', etiket || 'Kapat');
    farkKapatDugme.innerHTML = ikon || '&times;';
    farkKapatDugme.addEventListener('click', farkKapat);
    /* Ekranin degil KARTIN icine: kart ortalandiginda dugme de
       onunla birlikte gelsin. */
    (farkKart() || farkKok).appendChild(farkKapatDugme);
  }

  function farkTus(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      farkKapat();
      return;
    }
    if (e.key !== 'Tab' && e.keyCode !== 9) return;
    var liste = farkKok.querySelectorAll(ODAKLANIR);
    if (!liste.length) { e.preventDefault(); return; }
    var ilk = liste[0];
    var son = liste[liste.length - 1];
    if (e.shiftKey && (document.activeElement === ilk || document.activeElement === farkKok)) {
      e.preventDefault();
      son.focus();
    } else if (!e.shiftKey && document.activeElement === son) {
      e.preventDefault();
      ilk.focus();
    }
  }

  function farkAc(acan) {
    if (!farkKok || document.body.getAttribute('data-tt-nc-fark')) return;
    farkAcan = acan || null;
    /* display'i once acik yaz, gecisi bir sonraki karede baslat:
       ayni karede yazilirsa tarayici gecisi atliyor. */
    document.body.setAttribute('data-tt-nc-fark', 'hazir');
    kilitle();
    document.addEventListener('keydown', farkTus, true);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        document.body.setAttribute('data-tt-nc-fark', 'acik');
        farkKok.scrollTop = 0;
        farkOdak();
      });
    });
    /* Odak IKI kez veriliyor. Katman panelden aciliyorsa panelin
       <dialog>'u GECIS ms sonra close() ediliyor; close() odagi
       kendiliginden dialog'u acan ogeye geri veriyor ve buradaki
       odagi calardi. Ikinci deneme o andan sonra. */
    window.setTimeout(function () {
      if (document.body.getAttribute('data-tt-nc-fark') === 'acik') farkOdak();
    }, GECIS + 40);
  }

  function farkOdak() {
    var hedef = farkKapatDugme || farkKok;
    /* Kullanici bu arada katmanin icinde baska bir yere gectiyse
       odagi geri almiyoruz. */
    if (!hedef || (farkKok && farkKok.contains(document.activeElement))) return;
    try { hedef.focus({ preventScroll: true }); } catch (e) { hedef.focus(); }
  }

  function farkKapat() {
    if (!farkKok || !document.body.getAttribute('data-tt-nc-fark')) return;
    document.body.setAttribute('data-tt-nc-fark', 'hazir');
    document.removeEventListener('keydown', farkTus, true);
    window.setTimeout(function () {
      /* Arada yeniden acilmissa kapatma. */
      if (document.body.getAttribute('data-tt-nc-fark') !== 'hazir') return;
      document.body.removeAttribute('data-tt-nc-fark');
      coz();
      if (farkAcan) {
        try { farkAcan.focus({ preventScroll: true }); } catch (e) { farkAcan.focus(); }
        farkAcan = null;
      }
    }, GECIS);
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

    /* odakVerme: panelden karsilastirma katmanina geciliyorsa odak
       butona DONMEMELI -- odak artik katmanda. */
    function kapat(odakVerme) {
      if (!kat.open) return;
      kat.removeAttribute('data-acik');
      if (panel) { panel.style.transform = ''; panel.removeAttribute('data-suruklu'); }
      window.clearTimeout(zaman);
      zaman = window.setTimeout(function () {
        if (typeof kat.close === 'function') kat.close();
        else kat.removeAttribute('open');
        coz();
        document.body.removeAttribute('data-tt-nc-acik');
        if (odakVerme === true) return;
        try { dugme.focus({ preventScroll: true }); } catch (e) { dugme.focus(); }
      }, GECIS);
    }

    dugme.addEventListener('click', ac);
    kat.addEventListener('click', function (e) {
      if (e.target.closest('[data-tt-nc-kapat]')) kapat();
    });

    /* ---- 3. kart: karsilastirma katmani ---- */
    var farkKart = kat.querySelector('[data-tt-nc-fark]');
    if (farkKart) {
      var bulundu = farkBul(kok.getAttribute('data-tt-nc-fark-secici'));
      if (!bulundu) {
        /* Bolum sayfada yoksa kart hicbir yere gitmez -- gosterilmiyor.
           Yarim bir kart birakmaktansa hic olmasin. */
        farkKart.hidden = true;
      } else {
        var kapatIkon = kok.querySelector('.tt-nc-kapat');
        farkKapatKur(
          kok.getAttribute('data-tt-nc-fark-etiket'),
          kapatIkon ? kapatIkon.innerHTML : ''
        );
        var devam = kok.getAttribute('data-tt-nc-fark-devam');
        if (devam) farkDevamKur(devam);
        /* Katman kapaninca odak panelin icindeki karta degil, sabit
           butona doner: panel o sirada kapali, icindeki oge odak
           alamaz. */
        farkKart.addEventListener('click', function () {
          kapat(true);
          farkAc(dugme);
        });
      }
    }
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
