/* ------------------------------------------------------------------
   KOLEKSIYON SAYFASI - DENEYIM SECIMI

   Iki durum tutuyor: deneyim (single/couple) ve kime (tumu/kadin/erkek).
   Ikisi de adres satirina yansiyor, boylece reklamdan gelen link
   sayfayi dogrudan istenen halde aciyor.

   SEPETE VE INDIRIME DOKUNMUYOR. Magazadaki otomatik "Ikinci Uründe
   %50" kampanyasi sepet seviyesinde calisiyor; couple modu yalnizca
   anlatimi degistiriyor.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var MODLAR = ['single', 'couple'];
  var KIMELER = ['tumu', 'kadin', 'erkek'];

  function kur(KOK) {
    /* Kurulum ELEMAN basina: tema editorunde bolum yeniden cizilince
       DOM yepyeni oluyor ama sayfa yenilenmiyor. Sayfa capinda tek bir
       bayrak yeni DOM'u kurulumsuz birakirdi. */
    if (KOK.__ttdKurulu) return;
    KOK.__ttdKurulu = true;

    var izgara = KOK.querySelector('[data-ttd-izgara]');
    var karolar = [].slice.call(KOK.querySelectorAll('[data-ttd-karo]'));
    var upsell = KOK.querySelector('[data-ttd-upsell]');
    var bos = KOK.querySelector('[data-ttd-bos]');
    var sayiEl = KOK.querySelector('[data-ttd-sayi]');
    var kartlar = [].slice.call(KOK.querySelectorAll('[data-ttd-mod]'));
    var chipler = [].slice.call(KOK.querySelectorAll('[data-ttd-kime-sec]'));

    var upsellAcik = KOK.hasAttribute('data-ttd-upsell-acik');
    var upsellSira = parseInt(KOK.getAttribute('data-ttd-upsell-sira'), 10) || 2;
    var sayiMetin = KOK.getAttribute('data-ttd-sayi-metin') || '';

    /* Gecis suresi CSS'ten okunuyor, JS'te ikinci kez yazilmiyor:
       tema editorunde sure degistirilince ikisi birden degissin. */
    function gecisSuresi() {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
      var v = getComputedStyle(KOK).getPropertyValue('--ttd-gecis');
      var n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    }

    /* ---------- Durum ---------- */
    function temizMod(v) { return MODLAR.indexOf(v) > -1 ? v : null; }
    function temizKime(v) { return KIMELER.indexOf(v) > -1 ? v : null; }

    var q = new URLSearchParams(location.search);
    var mod = temizMod(q.get('deneyim'))
           || temizMod(KOK.getAttribute('data-ttd-varsayilan-mod'))
           || 'single';
    var kime = temizKime(q.get('kime')) || 'tumu';

    function adresYaz() {
      try {
        var u = new URL(location.href);
        u.searchParams.set('deneyim', mod);
        u.searchParams.set('kime', kime);
        history.replaceState({}, '', u.toString());
      } catch (e) { /* eski tarayici: durum yine de calisiyor */ }
    }

    /* ---------- Filtre ---------- */
    function gorunurMu(karo) {
      if (kime === 'tumu') return true;
      var k = karo.getAttribute('data-ttd-kime');
      /* "ikisi" = iki koleksiyonda birden olan urun; her iki filtrede
         de gorunuyor. Vitrinde iki kez basmak yerine bir kez basip
         iki kumeye birden dahil etmek dogrusu. */
      return k === kime || k === 'ikisi';
    }

    function ciz() {
      var gorunen = [];
      for (var i = 0; i < karolar.length; i++) {
        var ac = gorunurMu(karolar[i]);
        karolar[i].hidden = !ac;
        if (ac) gorunen.push(karolar[i]);
      }

      /* Kartlar ve chipler */
      for (var k = 0; k < kartlar.length; k++) {
        var secili = kartlar[k].getAttribute('data-ttd-mod') === mod;
        kartlar[k].setAttribute('aria-checked', secili ? 'true' : 'false');
        /* Roving tabindex: radyo grubunda Tab yalnizca SECILI ogeye
           ugrar, gruptaki gezinme ok tuslariyla olur. */
        kartlar[k].setAttribute('tabindex', secili ? '0' : '-1');
      }
      for (var c = 0; c < chipler.length; c++) {
        var cs = chipler[c].getAttribute('data-ttd-kime-sec') === kime;
        chipler[c].setAttribute('aria-checked', cs ? 'true' : 'false');
        chipler[c].setAttribute('tabindex', cs ? '0' : '-1');
      }

      /* Couple anlatimi. Urun listesi degismiyor -- degisen tek sey
         ne anlattigimiz. Gri bilgi seridi kaldirildi; o bilgi artik
         Couple kartindaki teklif rozetinde duruyor. Burada kalan is
         urun kartlarinin uzerindeki rozetler. */
      var couple = mod === 'couple';
      var rozetler = KOK.querySelectorAll('[data-ttd-rozet]');
      for (var r = 0; r < rozetler.length; r++) rozetler[r].hidden = !couple;

      /* Sayi ve bos durum */
      if (sayiEl) sayiEl.textContent = gorunen.length + (sayiMetin ? ' ' + sayiMetin : '');
      if (bos) bos.hidden = gorunen.length > 0;

      /* Upsell: yalnizca Single'da ve GORUNEN n. urunden sonra.
         Yeri her cizimde yeniden hesaplaniyor, cunku filtre degisince
         hangi karolarin gorundugu de degisiyor. */
      if (upsell) {
        var goster = upsellAcik && !couple && gorunen.length > 0;
        if (goster) {
          var hedef = gorunen[upsellSira] || null;
          if (hedef) izgara.insertBefore(upsell, hedef);
          else izgara.appendChild(upsell);
        }
        upsell.hidden = !goster;
      }

      adresYaz();
    }

    /* Filtre degisiminde once soluyor, sonra yeni kume beliriyor:
       kartlarin yer degistirmesi goz icin ani olmasin. */
    var beklemede = null;
    function uygula(animasyonlu) {
      var sure = animasyonlu ? gecisSuresi() : 0;
      if (!sure || !izgara) { ciz(); return; }
      if (beklemede) window.clearTimeout(beklemede);
      izgara.setAttribute('data-ttd-soluk', '');
      beklemede = window.setTimeout(function () {
        beklemede = null;
        ciz();
        izgara.removeAttribute('data-ttd-soluk');
      }, sure);
    }

    function modSec(yeni, animasyonlu) {
      if (!temizMod(yeni) || yeni === mod) return;
      mod = yeni;
      uygula(animasyonlu !== false);
    }
    function kimeSec(yeni) {
      if (!temizKime(yeni) || yeni === kime) return;
      kime = yeni;
      uygula(true);
    }

    /* ---------- Radyo grubu klavye davranisi ----------
       role="radio" tasiyan ogeler native radyonun klavye sozlesmesini
       KENDILIGINDEN kazanmiyor; ok tuslari, Home/End ve Space/Enter
       burada tanimlaniyor. */
    function grupBagla(ogeler, oku, sec) {
      ogeler.forEach(function (el, i) {
        el.addEventListener('click', function () { sec(oku(el)); });
        el.addEventListener('keydown', function (ev) {
          var yon = 0;
          if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') yon = 1;
          else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') yon = -1;
          else if (ev.key === ' ' || ev.key === 'Enter') {
            ev.preventDefault(); sec(oku(el)); return;
          } else if (ev.key === 'Home') {
            ev.preventDefault(); sec(oku(ogeler[0])); ogeler[0].focus(); return;
          } else if (ev.key === 'End') {
            ev.preventDefault();
            var son = ogeler[ogeler.length - 1];
            sec(oku(son)); son.focus(); return;
          }
          if (!yon) return;
          ev.preventDefault();
          var hedef = ogeler[(i + yon + ogeler.length) % ogeler.length];
          sec(oku(hedef));
          hedef.focus();
        });
      });
    }
    grupBagla(kartlar,
      function (el) { return el.getAttribute('data-ttd-mod'); },
      function (v) { modSec(v); });
    grupBagla(chipler,
      function (el) { return el.getAttribute('data-ttd-kime-sec'); },
      function (v) { kimeSec(v); });

    /* ---------- Upsell: Couple'a gec ---------- */
    var gec = KOK.querySelector('[data-ttd-couple-gec]');
    if (gec) gec.addEventListener('click', function () {
      modSec('couple');
      var hedef = KOK.querySelector('.ttd-secim');
      if (hedef && hedef.scrollIntoView) {
        hedef.scrollIntoView({ block: 'center', behavior: gecisSuresi() ? 'smooth' : 'auto' });
      }
      /* Odak secili karta gitsin: klavye kullanicisi nereye
         goturuldugunu gorsun. */
      var kart = KOK.querySelector('[data-ttd-mod="couple"]');
      if (kart) kart.focus({ preventScroll: true });
    });

    /* ---------- Paneller ---------- */
    var acikPanel = null;
    var eskiTasma = '';

    function kilitle() {
      eskiTasma = document.documentElement.style.overflow;
      /* showModal() arka plani inert yapiyor ama KAYDIRMAYI
         durdurmuyor: panel acikken arkadaki sayfa parmakla hala
         kayiyordu. */
      document.documentElement.style.overflow = 'hidden';
    }
    function coz() { document.documentElement.style.overflow = eskiTasma; }

    function panelAc(m) {
      var d = KOK.querySelector('[data-ttd-panel="' + m + '"]');
      if (!d) return;
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      acikPanel = d;
      kilitle();
    }
    function panelKapat(d) {
      if (!d) return;
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }

    [].slice.call(KOK.querySelectorAll('[data-ttd-panel-ac]')).forEach(function (b) {
      b.addEventListener('click', function () { panelAc(b.getAttribute('data-ttd-panel-ac')); });
    });

    [].slice.call(KOK.querySelectorAll('[data-ttd-panel]')).forEach(function (d) {
      var ic = d.querySelector('[data-ttd-panel-ic]');

      d.addEventListener('close', function () {
        acikPanel = null;
        coz();
        if (ic) { ic.style.transform = ''; ic.removeAttribute('data-ttd-yumusak'); }
      });

      /* Arka plana dokunma. <dialog> tiklamasinin hedefi, panel
         govdesinin DISINA basildiginda dialog'un kendisi oluyor. */
      d.addEventListener('click', function (ev) {
        if (ev.target === d) panelKapat(d);
      });

      var kapat = d.querySelector('[data-ttd-panel-kapat]');
      if (kapat) kapat.addEventListener('click', function () { panelKapat(d); });

      var sec = d.querySelector('[data-ttd-panel-sec]');
      if (sec) sec.addEventListener('click', function () {
        modSec(sec.getAttribute('data-ttd-panel-sec'));
        panelKapat(d);
      });

      /* --- Asagi surukleyerek kapatma (mobil) ---
         Yalnizca tutamaktan baslatiliyor. Panel govdesinin her yerinden
         baslatmak, icerigi kaydirmaya calisan parmakla cakisirdi. */
      var tut = d.querySelector('[data-ttd-tut]');
      if (tut && ic && window.PointerEvent) {
        var basY = 0, suruyor = false, dy = 0;

        tut.addEventListener('pointerdown', function (ev) {
          suruyor = true; basY = ev.clientY; dy = 0;
          ic.removeAttribute('data-ttd-yumusak');
          tut.setPointerCapture(ev.pointerId);
        });
        tut.addEventListener('pointermove', function (ev) {
          if (!suruyor) return;
          dy = ev.clientY - basY;
          /* Yalnizca ASAGI. Yukari cekince panel tavana yapismasin. */
          if (dy < 0) dy = 0;
          ic.style.transform = 'translateY(' + dy + 'px)';
        });
        function birak() {
          if (!suruyor) return;
          suruyor = false;
          ic.setAttribute('data-ttd-yumusak', '');
          if (dy > 90) {
            panelKapat(d);
          } else {
            ic.style.transform = 'translateY(0)';
          }
        }
        tut.addEventListener('pointerup', birak);
        tut.addEventListener('pointercancel', birak);
      }
    });

    /* Ilk cizim animasyonsuz: sayfa acilirken kartlarin solup
       belirmesi yukleme hatasi gibi gorunurdu. */
    ciz();
  }

  function tara() {
    var k = document.querySelectorAll('[data-ttd]');
    for (var i = 0; i < k.length; i++) kur(k[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tara);
  } else {
    tara();
  }
  /* Tema editorunde bolum yeniden cizildiginde. */
  document.addEventListener('shopify:section:load', tara);
})();
