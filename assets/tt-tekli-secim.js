/* ------------------------------------------------------------------
   TEKLI URUN SAYFASI - SAG SUTUN SECIM KATMANI

   Hicbir paylasilan dosyaya dokunmadan calisir. Ayrintili gerekce icin
   snippets/tt-tekli-secim.liquid basindaki nota bakin.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  /* Kurulum ELEMAN basina, sayfa basina degil. Tema editorunde bir blok
     duzenlenince Shopify bolumu yeniden ciziyor: DOM yepyeni oluyor ama
     sayfa yenilenmiyor. Sayfa capinda tek bir bayrak burada "zaten
     kuruldu" deyip yeni DOM'u kurulumsuz birakiyordu; katman olu
     goruniyordu (kart tiklanmiyor, grid bos, native secici gizlenmiyor). */
  function kur(KOK) {
    if (KOK.__ttTsKurulu) return;
    KOK.__ttTsKurulu = true;

    var V = null;
    try { V = JSON.parse(KOK.querySelector('[data-tt-ts-veri]').textContent); } catch (e) { return; }
    if (!V || !V.varyantlar || !V.varyantlar.length) return;

    /* Katalogda secenek adi ve deger metni tutarsiz ("Ham Madde" /
       "Hammadde", "316L Cerrahi Celik" / "316L Celik"). Bu yuzden tam
       metin degil anahtar kelime eslestiriyoruz. */
    function cins(deger) {
      var t = String(deger || '').toLocaleLowerCase('tr');
      if (t.indexOf('gümüş') > -1 || t.indexOf('gumus') > -1) return 'gumus';
      if (t.indexOf('çelik') > -1 || t.indexOf('celik') > -1) return 'celik';
      return 'diger';
    }
    function cinsAd(c) { return c === 'gumus' ? 'gümüş' : (c === 'celik' ? 'çelik' : ''); }

    /* Veri adasindaki listeler sondaki null ile kapaniyor (Liquid'de
       virgul kacinmak icin); burada temizleniyor. */
    var GRUP = {};
    ['kadin', 'erkek'].forEach(function (g) {
      var k = (V.gruplar && V.gruplar[g]) || { urunler: [] };
      GRUP[g] = {
        url: k.url || '/collections/all',
        urunler: (k.urunler || [])
          .filter(function (u) { return u && u.varyantlar; })
          .map(function (u) {
            /* Listeler null ile kapaniyor (Liquid'de sondaki virgulu
               onlemek icin); burada temizleniyor. */
            u.varyantlar = u.varyantlar.filter(function (v) { return v; });
            return u;
          })
          .filter(function (u) { return u.varyantlar.length; })
          /* Yalnizca taki onerilsin: ham maddesi olmayan urunler
             ("Default Title" tek varyantli kutu, event kapsulu vb.) listeye
             girmiyor. Olcut varyant adi degil, celik/gumus olup olmamasi. */
          .filter(function (u) {
            return u.varyantlar.some(function (v) { return cins(v.deger) !== 'diger'; });
          })
      };
    });

    var secici = document.getElementById(KOK.getAttribute('data-tt-ts-secici'));
    var form = document.getElementById(KOK.getAttribute('data-tt-ts-form'));

    /* Alt sayfa body'ye tasiniyor: kartin border/overflow yigin baglami
       panelin ustune binmesin. Tasindiktan sonra KOK icinde bulunamayacagi
       icin sorgular iki kapsayicida birden yapiliyor. */
    var SHEET = KOK.querySelector('[data-tt-ts-sheet]');
    if (SHEET) {
      /* Editorde bolum yeniden cizilince onceki kurulumun body'ye tasidigi
         panel geride kaliyor. Ayni sahibe ait eskisi temizlenmezse her
         duzenlemede body'de bir kopya birikirdi. */
      var sahip = KOK.getAttribute('data-tt-ts-form') || '';
      var eski = document.querySelectorAll('body > [data-tt-ts-sheet]');
      for (var e = 0; e < eski.length; e++) {
        if (eski[e].getAttribute('data-tt-ts-sahip') === sahip) eski[e].parentNode.removeChild(eski[e]);
      }
      SHEET.setAttribute('data-tt-ts-sahip', sahip);
      document.body.appendChild(SHEET);
    }
    function hepsi(sel) {
      var a = [].slice.call(KOK.querySelectorAll(sel));
      if (SHEET) a = a.concat([].slice.call(SHEET.querySelectorAll(sel)));
      return a;
    }

    var mod = 'tek';
    /* Varsayilan grup snippet'te urunun koleksiyonundan turetiliyor:
       erkek urunundeysek kadin, kadin urunundeysek erkek acik geliyor. */
    var grup = KOK.getAttribute('data-tt-ts-grup-varsayilan') === 'erkek' ? 'erkek' : 'kadin';
    var siraGumus = false;   /* false: once celikler */
    var ikinci = null;       /* {urun, varyant} */

    /* ---------- Yardimcilar ---------- */
    function bin(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
    function para(kurus) {
      var t = (Math.round(kurus) / 100).toFixed(2).split('.');
      return bin(t[0]) + ',' + t[1] + ' TL';
    }
    /* Karolar 3 sutunda ~100px: kurus ve ikinci "TL" satiri kiriyordu.
       Orada yuvarlak tutar gosteriliyor, ana tutarlar tam bicimde kaliyor. */
    function paraKisa(kurus, ekli) {
      return bin(Math.round(kurus / 100)) + (ekli ? ' TL' : '');
    }

    function varyantBul(id) {
      for (var i = 0; i < V.varyantlar.length; i++) {
        if (String(V.varyantlar[i].id) === String(id)) return V.varyantlar[i];
      }
      return null;
    }
    function seciliVaryant() {
      var el = form && form.querySelector('input[name="id"]');
      var v = el && varyantBul(el.value);
      if (v) return v;
      var id = new URLSearchParams(location.search).get('variant');
      v = id && varyantBul(id);
      if (v) return v;
      for (var i = 0; i < V.varyantlar.length; i++) if (V.varyantlar[i].stok) return V.varyantlar[i];
      return V.varyantlar[0];
    }
    function aktifCins() { return cins(seciliVaryant().deger); }

    /* Ikinci urun ustteki ham maddeyi devraliyor; o ham maddede varyanti
       yoksa mevcut tek varyanti seciliyor. */
    function varyantSec(urun) {
      var hedef = aktifCins();
      for (var i = 0; i < urun.varyantlar.length; i++) {
        if (cins(urun.varyantlar[i].deger) === hedef) return urun.varyantlar[i];
      }
      return urun.varyantlar[0];
    }

    /* ---------- Tutarlar ---------- */
    function p1() { return seciliVaryant().kurus; }
    function p2() { return ikinci ? ikinci.varyant.kurus : p1(); }
    function indirimKurus() {
      return Math.round(Math.min(p1(), p2()) * V.indirim / 100);
    }
    function setKurus() { return p1() + p2() - indirimKurus(); }
    function setEskiKurus() { return p1() + p2(); }
    function aktifKurus() { return mod === 'set' ? setKurus() : p1(); }

    /* Bir karonun sete katkisi: indirim iki urunden ucuz olana gidiyor. */
    function katki(fiyat) {
      return fiyat - (fiyat <= p1() ? Math.round(fiyat * V.indirim / 100) : 0);
    }

    /* ---------- Taksit kutusu ----------
       taksit-tablosu.js tutari [data-tt-tk-veri] ozniteliginden HER
       CAGRIDA yeniden okuyor; oznitelik guncellenince hem satir hem modal
       dogru tutari gosteriyor. O dosya degistirilmiyor. */
    var tkEl = null, tkAsil = null;
    function tkHazirla() {
      tkEl = document.querySelector('[data-tt-tk-veri]');
      if (tkEl && tkAsil === null) tkAsil = tkEl.getAttribute('data-tt-tk-veri');
    }
    function tkYaz() {
      tkHazirla();
      if (!tkEl || !tkAsil) return;
      var d; try { d = JSON.parse(tkAsil); } catch (e) { return; }
      var hedef = aktifKurus();
      d.varsayilan = hedef;
      if (!d.varyantlar) d.varyantlar = {};
      for (var i = 0; i < V.varyantlar.length; i++) d.varyantlar[String(V.varyantlar[i].id)] = hedef;
      tkEl.setAttribute('data-tt-tk-veri', JSON.stringify(d));
    }
    function tkGeriAl() { tkHazirla(); if (tkEl && tkAsil) tkEl.setAttribute('data-tt-tk-veri', tkAsil); }

    /* ---------- Temanin fiyat alani ---------- */
    var fiyatAsil = null;
    function fiyatAlani() { return document.querySelector('.price'); }
    function fiyatYaz() {
      var el = fiyatAlani();
      if (!el) return;
      if (fiyatAsil === null) fiyatAsil = el.innerHTML;
      if (mod !== 'set') { el.innerHTML = fiyatAsil; return; }
      el.innerHTML = '<span class="tt-ts-fiyat-set">' + para(setKurus()) + '</span>' +
                     '<s class="tt-ts-fiyat-eski">' + para(setEskiKurus()) + '</s>';
    }

    /* ---------- Ham madde segmenti ---------- */
    function nativeRadyo(deger) {
      if (!secici) return null;
      var hepsi = secici.querySelectorAll('input[type="radio"][data-option-value]');
      for (var i = 0; i < hepsi.length; i++) {
        if (hepsi[i].getAttribute('data-option-value') === deger) return hepsi[i];
      }
      return null;
    }
    function segmentBagla() {
      var h = KOK.querySelectorAll('[data-tt-ts-hm]');
      if (!h.length || !secici) return false;
      var bagli = 0;
      for (var i = 0; i < h.length; i++) {
        (function (el) {
          var r = nativeRadyo(el.getAttribute('data-tt-ts-hm'));
          if (!r) return;
          bagli++;
          el.addEventListener('click', function () {
            if (r.checked) return;
            r.checked = true;
            r.dispatchEvent(new Event('change', { bubbles: true }));
            r.click();
          });
        })(h[i]);
      }
      return bagli === h.length;
    }

    /* ---------- Ikinci urun grid'i ---------- */
    function listele() {
      var l = GRUP[grup].urunler.slice();
      l.forEach(function (u) { u.__v = varyantSec(u); });
      /* Filtre DEGIL, siralama: hicbir urun listeden cikmiyor. */
      l.sort(function (a, b) {
        var ca = cins(a.__v.deger) === (siraGumus ? 'gumus' : 'celik') ? 0 : 1;
        var cb = cins(b.__v.deger) === (siraGumus ? 'gumus' : 'celik') ? 0 : 1;
        return ca - cb;
      });
      return l;
    }

    function tikSvg() {
      return '<span class="tt-ts-karo-tik"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
             'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
             '<path d="M4 8.5l2.5 2.5L12 5.5"/></svg></span>';
    }

    function karoHtml(u, i, secili) {
      var v = u.__v;
      var etiket = (u.varyantlar.length === 1 && cinsAd(cins(v.deger)))
        ? 'Sadece ' + cinsAd(cins(v.deger)) : v.deger;
      return '<button type="button" class="tt-ts-karo" role="radio" data-tt-ts-karo="' + i + '"' +
        ' aria-checked="' + (secili ? 'true' : 'false') + '">' + tikSvg() +
        '<span class="tt-ts-karo-kutu">' +
        '<img class="tt-ts-karo-gorsel" src="' + (u.gorsel || '') + '" alt="" loading="lazy">' +
        '</span>' +
        '<span class="tt-ts-karo-ad">' + u.ad + '</span>' +
        '<span class="tt-ts-karo-hm">' + etiket + '</span>' +
        '<span class="tt-ts-karo-fiyat">' + paraKisa(katki(v.kurus), true) +
        '<s class="tt-ts-karo-eski">' + paraKisa(v.kurus, false) + '</s></span></button>';
    }

    function karoBagla(kap, liste, kapat) {
      var k = kap.querySelectorAll('[data-tt-ts-karo]');
      for (var i = 0; i < k.length; i++) {
        (function (el) {
          el.addEventListener('click', function (ev) {
            ev.stopPropagation();
            var u = liste[parseInt(el.getAttribute('data-tt-ts-karo'), 10)];
            ikinci = { urun: u, varyant: varyantSec(u) };
            if (kapat && SHEET && SHEET.open) SHEET.close();
            ciz();
          });
        })(k[i]);
      }
    }

    function gridCiz() {
      var kap = KOK.querySelector('[data-tt-ts-grid]');
      if (!kap) return;
      var liste = listele();
      if (!ikinci || liste.indexOf(ikinci.urun) === -1) {
        /* Varsayilan olarak gruptaki EN UCUZ urun seciliyor: teklif ilk
           bakista mumkun olan en dusuk tutarla gorunsun. */
        var ucuz = null;
        liste.forEach(function (u) {
          if (!ucuz || u.__v.kurus < ucuz.__v.kurus) ucuz = u;
        });
        if (ucuz) ikinci = { urun: ucuz, varyant: ucuz.__v };
      } else {
        ikinci.varyant = varyantSec(ikinci.urun);
      }

      /* Secili urun her zaman gorunen 5 karodan biri olsun: en ucuz urun
         siralamada geride kalabiliyor, rozette adi gecip karosu ortada
         olmamasi kafa karistirirdi. */
      if (ikinci) {
        var yeri = liste.indexOf(ikinci.urun);
        if (yeri > 4) { liste.splice(yeri, 1); liste.unshift(ikinci.urun); }
      }

      var h = '';
      liste.slice(0, 5).forEach(function (u, i) {
        h += karoHtml(u, i, ikinci && ikinci.urun === u);
      });
      /* 6. hucre: alt sayfayi acan cikis. Sayfadan cikilmiyor. */
      h += '<button type="button" class="tt-ts-karo tt-ts-karo--tum" data-tt-ts-tum>' +
           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
           '<path d="M5 12h14M13 6l6 6-6 6"/></svg><span>Tümünü gör</span></button>';
      kap.innerHTML = h;
      karoBagla(kap, liste, false);

      var tum = kap.querySelector('[data-tt-ts-tum]');
      if (tum) tum.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (SHEET && typeof SHEET.showModal === 'function') SHEET.showModal();
        else if (SHEET) SHEET.setAttribute('open', '');
      });

      /* Alt sayfa: ayni gruptaki TUM urunler, ayni karo bileseni. */
      var sk = SHEET && SHEET.querySelector('[data-tt-ts-sheet-grid]');
      if (sk) {
        var sh = '';
        liste.forEach(function (u, i) { sh += karoHtml(u, i, ikinci && ikinci.urun === u); });
        sk.innerHTML = sh;
        karoBagla(sk, liste, true);
      }
    }

    /* ---------- Cizim ---------- */
    function ciz() {
      var v1 = seciliVaryant();

      var hm = KOK.querySelectorAll('[data-tt-ts-hm]');
      for (var i = 0; i < hm.length; i++) {
        hm[i].setAttribute('aria-checked', hm[i].getAttribute('data-tt-ts-hm') === v1.deger ? 'true' : 'false');
      }
      var gr = hepsi('[data-tt-ts-grup]');
      for (var j = 0; j < gr.length; j++) {
        gr[j].setAttribute('aria-checked', gr[j].getAttribute('data-tt-ts-grup') === grup ? 'true' : 'false');
      }
      var kartlar = KOK.querySelectorAll('[data-tt-ts-mod]');
      for (var k = 0; k < kartlar.length; k++) {
        kartlar[k].setAttribute('aria-checked', kartlar[k].getAttribute('data-tt-ts-mod') === mod ? 'true' : 'false');
      }

      /* Grid her modda hesaplaniyor: rozetteki ikinci urun adi, kart
         secili olmasa da dogru gorunsun. Gorunurlugu CSS yonetiyor. */
      gridCiz();

      hepsi('[data-tt-ts-sirala-metin]').forEach(function (el) {
        el.textContent = siraGumus ? 'Önce gümüşler gösteriliyor.' : 'Önce çelikler gösteriliyor.';
      });
      hepsi('[data-tt-ts-sirala-btn]').forEach(function (el) {
        el.textContent = siraGumus ? 'Çelikleri gör' : 'Gümüşleri gör';
      });

      var tek = KOK.querySelector('[data-tt-ts-tek-fiyat]');
      if (tek) tek.textContent = para(p1());
      var sf = KOK.querySelector('[data-tt-ts-set-fiyat]');
      if (sf) sf.textContent = para(setKurus());
      var se = KOK.querySelector('[data-tt-ts-set-eski]');
      if (se) se.textContent = para(setEskiKurus());

      var sa = KOK.querySelector('[data-tt-ts-secili-ad]');
      var sl = KOK.querySelector('[data-tt-ts-hm-degistir]');
      if (sa && ikinci) {
        var ad = cinsAd(cins(ikinci.varyant.deger)) || ikinci.varyant.deger;
        sa.textContent = ikinci.urun.ad + ' · ' + ad;
        if (sl) sl.hidden = ikinci.urun.varyantlar.length < 2;
      }

      var ru = KOK.querySelector('[data-tt-ts-rozet-urun]');
      if (ru) ru.textContent = ikinci ? '+ ' + ikinci.urun.ad + ' ile birlikte' : '';

      var ozet = KOK.querySelector('[data-tt-ts-ozet]');
      if (ozet) {
        if (mod === 'set' && ikinci) {
          ozet.hidden = false;
          ozet.textContent = V.urun + ' + ' + ikinci.urun.ad + ' · 2 ürün';
        } else { ozet.hidden = true; }
      }

      var btn = KOK.querySelector('[data-tt-ts-sepet]');
      if (btn) btn.textContent = V.sepetMetin + ' · ' + para(aktifKurus());

      fiyatYaz();
      if (mod === 'set') tkYaz(); else tkGeriAl();
    }

    /* ---------- Sepete ekleme ---------- */
    function sepeteEkle(e) {
      if (mod !== 'set' || !ikinci) return;   /* tek mod: formun kendi akisi */
      e.preventDefault();
      var btn = KOK.querySelector('[data-tt-ts-sepet]');
      if (btn) btn.disabled = true;
      var v1 = seciliVaryant();
      var items = (String(v1.id) === String(ikinci.varyant.id))
        ? [{ id: v1.id, quantity: 2 }]
        : [{ id: v1.id, quantity: 1 }, { id: ikinci.varyant.id, quantity: 1 }];
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ items: items })
      }).then(function (r) { return r.json(); })
        .then(function () { window.location.href = '/cart'; })
        .catch(function () { if (btn) btn.disabled = false; });
    }

    /* ---------- Kurulum ---------- */

    /* CSS'te currentColor'dan turetilemeyen iki token (koyu dolu rozet ve
       sepet butonu) burada somut renge cevriliyor: sayfanin gercek metin
       rengi ve en yakin saydam olmayan ata zemini olculuyor. Boylece
       katman acik da koyu da olsa dogru ciziliyor. */
    function zeminBul(el) {
      for (var n = el; n && n !== document.documentElement; n = n.parentElement) {
        var b = getComputedStyle(n).backgroundColor;
        if (b && b !== 'transparent' && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(b)) return b;
      }
      var g = getComputedStyle(document.body).backgroundColor;
      return (g && g !== 'transparent') ? g : '#ffffff';
    }
    try {
      KOK.style.setProperty('--tt-ts-ink', getComputedStyle(KOK).color);
      KOK.style.setProperty('--tt-ts-zemin', zeminBul(KOK));
    } catch (e) {}

    var segmentTamam = segmentBagla();

    var kartlar = KOK.querySelectorAll('[data-tt-ts-mod]');
    for (var i = 0; i < kartlar.length; i++) {
      (function (k) {
        function sec() { mod = k.getAttribute('data-tt-ts-mod'); ciz(); }
        k.addEventListener('click', function (ev) {
          /* Kart icindeki kendi kontrolleri kart secimini tetiklemesin. */
          if (ev.target.closest('.tt-ts-ikinci') && k.getAttribute('aria-checked') === 'true') return;
          sec();
        });
        k.addEventListener('keydown', function (ev) {
          if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); sec(); }
        });
      })(kartlar[i]);
    }

    hepsi('[data-tt-ts-grup]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.stopPropagation();
        grup = el.getAttribute('data-tt-ts-grup');
        ikinci = null;
        ciz();
      });
    });

    hepsi('[data-tt-ts-sirala-btn]').forEach(function (el) {
      el.addEventListener('click', function (ev) { ev.stopPropagation(); siraGumus = !siraGumus; ciz(); });
    });

    if (SHEET) {
      var kap = SHEET.querySelector('[data-tt-ts-sheet-kapat]');
      if (kap) kap.addEventListener('click', function () { SHEET.close(); });
      /* Panelin disina basinca kapansin. */
      SHEET.addEventListener('click', function (ev) {
        if (ev.target === SHEET) SHEET.close();
      });
    }

    var hd = KOK.querySelector('[data-tt-ts-hm-degistir]');
    if (hd) hd.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (!ikinci || ikinci.urun.varyantlar.length < 2) return;
      var su = String(ikinci.varyant.id);
      for (var i = 0; i < ikinci.urun.varyantlar.length; i++) {
        if (String(ikinci.urun.varyantlar[i].id) !== su) { ikinci.varyant = ikinci.urun.varyantlar[i]; break; }
      }
      ciz();
    });

    var sepet = KOK.querySelector('[data-tt-ts-sepet]');
    if (sepet) sepet.addEventListener('click', sepeteEkle);

    if (secici) secici.addEventListener('change', function () { window.setTimeout(ciz, 60); });

    if (segmentTamam) {
      KOK.setAttribute('data-tt-ts-hazir', '');
      if (secici) secici.classList.add('tt-ts-native-gizli');
      if (form) {
        var nb = form.querySelector('[name="add"], button[type="submit"]');
        if (nb) nb.classList.add('tt-ts-native-gizli');
      }
    }

    ciz();
  }

  /* ---------- Cerceveleme ayar paneli ----------
     Karo fotograflarinin dogru cercevelemesi ancak gercek fotograflara
     bakarak bulunabiliyor; kod bunu hesaplayamaz. Panel yalnizca adreste
     ?ttayar=1 varken aciliyor, musteri hicbir kosulda gormuyor. Bulunan
     degerler Ozel Liquid blogundaki render satirina yaziliyor. */
  function ayarPaneli() {
    if (document.getElementById('tt-ts-ayar')) return;
    var q = new URLSearchParams(location.search);
    if (!q.get('ttayar')) return;
    var kokler = document.querySelectorAll('[data-tt-ts]');
    if (!kokler.length) return;

    function oku(ad, yedek) {
      var v = getComputedStyle(kokler[0]).getPropertyValue(ad).trim();
      var s = parseFloat(v);
      return isNaN(s) ? yedek : s;
    }
    var oran = oku('--tt-ts-karo-oran', 0.8);
    var zoom = oku('--tt-ts-karo-zoom', 1);
    var kaydir = oku('--tt-ts-karo-kaydir', 0);

    var p = document.createElement('div');
    p.id = 'tt-ts-ayar';
    p.setAttribute('style', [
      'position:fixed', 'right:12px', 'bottom:12px', 'z-index:99999',
      'width:250px', 'padding:12px 14px', 'border-radius:12px',
      'background:#1d1d1f', 'color:#fff', 'font:12px/1.45 -apple-system,system-ui,sans-serif',
      'box-shadow:0 8px 28px rgba(0,0,0,.35)'
    ].join(';'));
    /* Panel dar onizlemede karolarin ustunu kapatiyor; baslikla katlanip
       kucuk bir pile donusuyor ki sonuca bakarken engel olmasin. */
    p.innerHTML =
      '<button data-kat type="button" style="display:flex;width:100%;align-items:center;' +
      'justify-content:space-between;gap:8px;padding:0;border:0;background:none;color:inherit;' +
      'font:inherit;font-weight:600;cursor:pointer">Karo cercevelemesi<span data-ok>–</span></button>' +
      '<div data-govde>' +
      '<div style="opacity:.6;margin:2px 0 10px">Yalnizca ?ttayar=1 ile gorunur</div>' +
      '<label style="display:block;margin-bottom:2px">Kutu orani: <b data-o></b></label>' +
      '<input data-os type="range" min="0.6" max="1.4" step="0.01" style="width:100%">' +
      '<div style="opacity:.6;margin:2px 0 10px">kucuk = uzun kutu, buyuk = basik</div>' +
      '<label style="display:block;margin-bottom:2px">Yakinlastirma: <b data-z></b></label>' +
      '<input data-zs type="range" min="0.8" max="2" step="0.01" style="width:100%;margin-bottom:10px">' +
      '<label style="display:block;margin-bottom:2px">Dikey kaydirma: <b data-k></b>%</label>' +
      '<input data-ks type="range" min="-60" max="60" step="0.5" style="width:100%">' +
      '<div style="opacity:.6;margin:2px 0 10px">eksi = altini goster, arti = ustunu</div>' +
      '<div data-uyari style="margin:0 0 10px;padding:6px 8px;border-radius:8px;' +
      'background:#4a3a00;color:#ffd479"></div>' +
      '<div style="opacity:.6;margin-bottom:4px">Ozel Liquid bloguna yapistir:</div>' +
      '<code data-cikti style="display:block;padding:8px;border-radius:8px;background:#000;' +
      'color:#7fd4a0;word-break:break-all;user-select:all;cursor:text"></code>' +
      '<button data-sifirla type="button" style="margin-top:8px;width:100%;padding:6px;' +
      'border:0;border-radius:8px;background:#3a3a3c;color:#fff;font:inherit;cursor:pointer">' +
      'Basa dondur (0.8 / 1 / 0)</button></div>';
    document.body.appendChild(p);

    var os = p.querySelector('[data-os]'), zs = p.querySelector('[data-zs]');
    var ks = p.querySelector('[data-ks]');
    var ob = p.querySelector('[data-o]'), zb = p.querySelector('[data-z]');
    var kb = p.querySelector('[data-k]');
    var cikti = p.querySelector('[data-cikti]'), uyari = p.querySelector('[data-uyari]');

    /* Kaydirma cok buyudugunde gorsel kutunun disina tasip alt (veya ust)
       kenarda bos bant birakiyor. Bunu gozle fark etmek zor -- fotograf
       zemini acik oldugu icin bant beyaz gorunuyor -- o yuzden hesaplanip
       uyari olarak yaziliyor. Kutu yuksekligi 1 kabul edilirse gorselin
       yarim yuksekligi zoom/2, kaymasi zoom*kaydir. */
    function bosBantYuzde() {
      var yariBosluk = 0.5 - (zoom / 2 - Math.abs(zoom * kaydir / 100));
      return Math.max(0, yariBosluk) * 100;
    }

    function uygula() {
      for (var i = 0; i < kokler.length; i++) {
        kokler[i].style.setProperty('--tt-ts-karo-oran', String(oran));
        kokler[i].style.setProperty('--tt-ts-karo-zoom', String(zoom));
        kokler[i].style.setProperty('--tt-ts-karo-kaydir', kaydir + '%');
      }
      os.value = oran; zs.value = zoom; ks.value = kaydir;
      ob.textContent = oran.toFixed(2);
      zb.textContent = zoom.toFixed(2);
      kb.textContent = kaydir;
      var bos = bosBantYuzde();
      if (bos > 1) {
        uyari.hidden = false;
        uyari.textContent = 'Karo yuksekliginin %' + Math.round(bos) +
          ' kadari bos kaliyor. Kutu oranini buyutmeyi (basiklastirmayi) deneyin.';
      } else {
        uyari.hidden = true;
      }
      cikti.textContent = "{% render 'tt-tekli-secim', karo_oran: " + oran.toFixed(2) +
                          ', karo_zoom: ' + zoom.toFixed(2) +
                          ', karo_kaydir: ' + kaydir + ' %}';
    }
    os.addEventListener('input', function () { oran = parseFloat(os.value); uygula(); });
    zs.addEventListener('input', function () { zoom = parseFloat(zs.value); uygula(); });
    ks.addEventListener('input', function () { kaydir = parseFloat(ks.value); uygula(); });
    p.querySelector('[data-sifirla]').addEventListener('click', function () {
      oran = 0.8; zoom = 1; kaydir = 0; uygula();
    });
    var govde = p.querySelector('[data-govde]');
    p.querySelector('[data-kat]').addEventListener('click', function () {
      govde.hidden = !govde.hidden;
      p.querySelector('[data-ok]').textContent = govde.hidden ? '+' : '–';
      p.style.width = govde.hidden ? 'auto' : '250px';
    });
    uygula();
  }

  /* Ilk yukleme + tema editorunde her yeniden cizim. shopify:section:load
     yalnizca editorde tetikleniyor, magazada ek maliyeti yok. */
  function tara() {
    var k = document.querySelectorAll('[data-tt-ts]');
    for (var i = 0; i < k.length; i++) kur(k[i]);
    ayarPaneli();
  }
  tara();
  /* Olayin target'ini daraltmiyoruz: kurulum eleman basina korumali,
     bu yuzden tum sayfayi yeniden taramak bedava ve daha az varsayim. */
  document.addEventListener('shopify:section:load', tara);
})();
