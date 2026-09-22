/* ------------------------------------------------------------------
   SINGLE / COUPLE SECIM KARTLARI  (.tt-sc-*)

   NE YAPIYOR
     - Single / Couple secimi (radiogroup, ok tuslari, ?mod= parametresi)
     - Kadin / Erkek / Tumu filtresi, grup baslikari ve sayaclar
     - Couple modunda iki urunluk set kurma + varyant secici
     - Iki urunu TEK istekte /cart/add.js'e gonderip sepet cekmecesini acma

   NE YAPMIYOR
     Fiyat hesabi ya da indirim mantigi KURMUYOR. "Ikinci Uründe %50
     Indirim" magazada tanimli OTOMATIK bir Shopify BXGY indirimi ve
     sepet seviyesinde kendiliginden isliyor. Cubuktaki tutar yalnizca
     bir onizleme; gercek tutari sepet hesapliyor.

   PARA BICIMI TAHMIN EDILMIYOR
     Magazanin money_format'i tema ayarindan farkli olabiliyor (burada
     "{{amount}}TL" yaziyor ama vitrinde Turkce bicim gorunuyor). Bu
     yuzden bicim SABITLENMIYOR: bolum Liquid'in kendi `money` filtresini
     bilinen bir tutara (12.345,67) uygulayip sonucu data-sc-para-ornek
     olarak veriyor, buradaki cozucu de ondan ayiraclari geri okuyor.
     Boylece cubuktaki bicim vitrinin geri kalaniyla ayni kaliyor.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  function kur(KOK) {
    if (KOK.hasAttribute('data-sc-kurulu')) return;
    KOK.setAttribute('data-sc-kurulu', '');

    var M = {};
    try { M = JSON.parse(KOK.getAttribute('data-sc-metin') || '{}'); } catch (e) { M = {}; }

    var TEK_KAYNAK = KOK.getAttribute('data-sc-single-kaynak') === 'kendi';
    var TUTAR_GOSTER = KOK.getAttribute('data-sc-tutar-goster') === 'true';
    /* Single modunda sayfanin KENDI urun izgarasi (main-collection)
       kullaniliyor: filtreleri, siralamasi ve sayfalamasi zaten
       calisiyor ve "Single modu sayfa bugunku gibi calissin" demek.
       Bu bolumun izgarasi yalnizca Couple modunda devreye giriyor. */
    var TEMA_IZGARA = KOK.getAttribute('data-sc-tekil-izgara') !== 'kendi';

    var izgara   = KOK.querySelector('[data-sc-izgara]');
    var filtreEl = KOK.querySelector('[data-sc-filtre]');
    var karolar  = Array.prototype.slice.call(KOK.querySelectorAll('[data-sc-karo]'));
    /* [data-sc-kime] urun karolarinda da var; cipler kendi niteligini
   tasiyor ki secici 29 karoyu birden yakalamasin. */
    var cipler   = Array.prototype.slice.call(KOK.querySelectorAll('[data-sc-cip]'));
    var kartlar  = Array.prototype.slice.call(KOK.querySelectorAll('[data-sc-mod]'));
    var gruplar  = Array.prototype.slice.call(KOK.querySelectorAll('[data-sc-grup]:not([data-sc-karo])'));
    var sayac    = KOK.querySelector('[data-sc-sayac]');
    var bos      = KOK.querySelector('[data-sc-bos]');
    var setKutu  = KOK.querySelector('[data-sc-set]');
    var setSayac = KOK.querySelector('[data-sc-set-sayac]');
    var slotlar  = Array.prototype.slice.call(KOK.querySelectorAll('[data-sc-slot]'));
    var cubuk    = KOK.querySelector('[data-sc-cubuk]');
    var durumEl  = KOK.querySelector('[data-sc-durum]');
    var tutarEl  = KOK.querySelector('[data-sc-tutar]');
    var sepetBtn = KOK.querySelector('[data-sc-ekle-sepet]');
    var uyariEl  = KOK.querySelector('[data-sc-uyari]');
    var vDialog  = KOK.querySelector('[data-sc-varyant]');
    var vBaslik  = KOK.querySelector('[data-sc-varyant-baslik]');
    var vListe   = KOK.querySelector('[data-sc-varyant-liste]');

    var mod = KOK.getAttribute('data-sc-varsayilan') === 'couple' ? 'couple' : 'single';
    var kime = 'tumu';
    var set = [];          /* en fazla 2: {urunId, varyantId, ad, kime, fiyat} */
    var gonderiyor = false;

    /* ---------- Para bicimi ----------
       Ornek "12.345,67 TL" gibi bir dize; icinden onek, sonek,
       binlik ve ondalik ayiraci ve ondalik basamak sayisi cikariliyor.
       12345.67 secildi cunku butun basamaklari farkli, yani ayiraclarin
       yeri tek anlama geliyor. */
    var BICIM = (function (ornek) {
      var yedek = { onek: '', sonek: ' TL', bin: '.', ond: ',', basamak: 2 };
      if (!ornek) return yedek;
      var ilk = ornek.search(/\d/);
      if (ilk < 0) return yedek;
      var son = ornek.length - 1;
      while (son >= 0 && !/\d/.test(ornek[son])) son--;
      var onek = ornek.slice(0, ilk);
      var sonek = ornek.slice(son + 1);
      var cekirdek = ornek.slice(ilk, son + 1);

      var m = cekirdek.match(/^(\d+)(\D)(\d{3})(\D)(\d{2})$/);
      if (m) return { onek: onek, sonek: sonek, bin: m[2], ond: m[4], basamak: 2 };
      m = cekirdek.match(/^(\d+)(\D)(\d{3})$/);
      if (m) return { onek: onek, sonek: sonek, bin: m[2], ond: '', basamak: 0 };
      m = cekirdek.match(/^(\d+)(\D)(\d{2})$/);
      if (m) return { onek: onek, sonek: sonek, bin: '', ond: m[2], basamak: 2 };
      return yedek;
    })(KOK.getAttribute('data-sc-para-ornek'));

    function binAyir(tam) {
      if (!BICIM.bin) return tam;
      return tam.replace(/\B(?=(\d{3})+(?!\d))/g, BICIM.bin);
    }
    function para(kurus) {
      var v = Math.round(kurus) / 100;
      var s;
      if (BICIM.basamak === 0) {
        s = binAyir(String(Math.round(v)));
      } else {
        var p = v.toFixed(2).split('.');
        s = binAyir(p[0]) + BICIM.ond + p[1];
      }
      return BICIM.onek + s + BICIM.sonek;
    }

    function yaz(sablon, n) {
      return String(sablon == null ? '' : sablon).replace(/\[n\]/g, String(n));
    }

    /* ---------- Varyantlar ----------
       Tukenmis varyantlar JSON'da "var": false ile duruyor; burada
       ayikliyoruz. Hicbiri kalmazsa urun zaten sepete eklenemez. */
    function varyantlar(karo) {
      if (karo._sc_v) return karo._sc_v;
      var el = karo.querySelector('[data-sc-varyantlar]');
      var hepsi = [];
      try { hepsi = JSON.parse(el.textContent); } catch (e) { hepsi = []; }
      karo._sc_v = hepsi.filter(function (v) { return v['var']; });
      return karo._sc_v;
    }
    function karoBul(urunId) {
      for (var i = 0; i < karolar.length; i++) {
        if (karolar[i].getAttribute('data-sc-urun') === String(urunId)) return karolar[i];
      }
      return null;
    }

    /* ---------- Gorunurluk ---------- */
    function karoUygun(karo, hangiKime) {
      /* Single modunda kaynak ayardan: sayfanin kendi koleksiyonu ya da
         iki couple koleksiyonu. Couple modunda her zaman iki koleksiyon. */
      if (mod === 'single' && TEK_KAYNAK && karo.getAttribute('data-sc-tekil') !== '1') return false;
      var k = karo.getAttribute('data-sc-kime');
      if (mod === 'couple' && !k) return false;
      if (hangiKime === 'tumu') return true;
      /* Kaynak TEK bir koleksiyonsa cinsiyet ayrimi anlamsiz: sayfa
         zaten tek cinsiyetin koleksiyonu. Burada "ikisi" isaretli urun
         (iki koleksiyonda birden olan Klasik Zaman Kapsulu) karsi
         cinsiyetin cipini tek basina ayakta tutar ve musteri 1 urunluk
         sahte bir "Erkek" sekmesi gorurdu. */
      if (!ikiKaynak()) return false;
      return k === hangiKime || k === 'ikisi';
    }
    function ikiKaynak() { return mod === 'couple' || !TEK_KAYNAK; }

    function kimeSayisi(hangiKime) {
      var n = 0;
      for (var i = 0; i < karolar.length; i++) if (karoUygun(karolar[i], hangiKime)) n++;
      return n;
    }

    function ciz() {
      /* Kok kendi niteligini tasiyor: kartlar da data-sc-mod tasidigi
         icin ortak bir isim '[data-sc-mod="single"]' secicisini hem
         koke hem karta esitlerdi. */
      KOK.setAttribute('data-sc-aktif-mod', mod);

      for (var i = 0; i < kartlar.length; i++) {
        var secili = kartlar[i].getAttribute('data-sc-mod') === mod;
        kartlar[i].setAttribute('aria-checked', secili ? 'true' : 'false');
        kartlar[i].setAttribute('tabindex', secili ? '0' : '-1');
      }

      /* Bos kalacak cipi gizle: tek cinsiyetli bir sayfada "Erkek"e
         basip bos ekran gormek, filtrenin bozuk oldugunu dusundurur. */
      var gorunurCip = 0;
      for (var c = 0; c < cipler.length; c++) {
        var deger = cipler[c].getAttribute('data-sc-cip');
        var bosMu = deger !== 'tumu' && kimeSayisi(deger) === 0;
        cipler[c].hidden = bosMu;
        if (!bosMu) gorunurCip++;
      }
      /* Gizlenen cip seciliyse secim "Tumu"ye donuyor. */
      var aktifCip = null;
      for (var c2 = 0; c2 < cipler.length; c2++) {
        if (cipler[c2].getAttribute('data-sc-cip') === kime) aktifCip = cipler[c2];
      }
      if (aktifCip && aktifCip.hidden) kime = 'tumu';
      /* Tek cinsiyet varsa cip satiri bilgi tasimiyor; tamamen kalkiyor. */
      var cipKapsayici = cipler.length ? cipler[0].parentNode : null;
      if (cipKapsayici) cipKapsayici.hidden = gorunurCip < 2;
      /* Cip satiri bosalinca sayac tek basina kalir; sayfanin kenarina
         yapisik bir "29 urun" yazisi bilgi degil gurultu olurdu. */
      if (sayac) sayac.hidden = gorunurCip < 2;

      for (var c3 = 0; c3 < cipler.length; c3++) {
        var s = cipler[c3].getAttribute('data-sc-cip') === kime;
        cipler[c3].setAttribute('aria-checked', s ? 'true' : 'false');
        cipler[c3].setAttribute('tabindex', s ? '0' : '-1');
      }

      var toplam = 0;
      var grupSayi = { kadin: 0, erkek: 0 };
      for (var k = 0; k < karolar.length; k++) {
        var uygun = karoUygun(karolar[k], kime);
        karolar[k].hidden = !uygun;
        if (uygun) {
          toplam++;
          var g = karolar[k].getAttribute('data-sc-grup');
          if (grupSayi[g] != null) grupSayi[g]++;
        }
        /* "Sete ekle" yalnizca Couple modunda. */
        var ekleBtn = karolar[k].querySelector('[data-sc-ekle]');
        if (ekleBtn) ekleBtn.hidden = mod !== 'couple';
      }

      /* Grup basliklari yalnizca "Tumu" secilince ve iki grup da
         doluyken anlamli; tek grup varsa baslik gereksiz gurultu. */
      var basliklarGorunur = kime === 'tumu' && grupSayi.kadin > 0 && grupSayi.erkek > 0;
      for (var gi = 0; gi < gruplar.length; gi++) {
        var ad = gruplar[gi].getAttribute('data-sc-grup');
        gruplar[gi].hidden = !basliklarGorunur;
        var sayiEl = gruplar[gi].querySelector('[data-sc-grup-sayi]');
        if (sayiEl) sayiEl.textContent = String(grupSayi[ad] || 0);
      }

      /* Single modunda temanin izgarasina devrediliyorsa bu bolumun
         izgarasi, filtre satiri ve bos-sonuc metni tamamen kalkiyor:
         gorunen liste artik bu bolumun degil. */
      var temayaDevret = TEMA_IZGARA && mod === 'single';
      temaIzgaraGoster(temayaDevret);
      if (izgara) izgara.hidden = temayaDevret;
      if (filtreEl) filtreEl.hidden = temayaDevret;

      if (sayac) sayac.textContent = toplam + ' ' + (M.sayacEki || '');
      if (bos) bos.hidden = temayaDevret || toplam > 0;

      if (setKutu) setKutu.hidden = mod !== 'couple';
      if (cubuk) cubuk.hidden = mod !== 'couple';
      document.body.classList.toggle('tt-sc-cubuk-acik', mod === 'couple');
      gizlenenler(mod === 'couple');
      setCiz();
      cubukOlc();
    }

    /* Couple modunda yapiskan cubukla cakisan ogeler (temanin yuzen
       "Filtrele ve sirala" dugmesi gibi) gizleniyor. Secici ayardan
       geliyor ki ileride baska bir widget cikarsa kod degismesin. */
    var gizliler = [];
    function gizlenenler(acik) {
      var secici = KOK.getAttribute('data-sc-gizle-secici');
      if (!secici) return;
      if (acik && !gizliler.length) {
        try { gizliler = Array.prototype.slice.call(document.querySelectorAll(secici)); }
        catch (e) { gizliler = []; }
        gizliler.forEach(function (el) {
          el._sc_eski = el.style.display;
          el.style.display = 'none';
        });
      } else if (!acik && gizliler.length) {
        gizliler.forEach(function (el) { el.style.display = el._sc_eski || ''; });
        gizliler = [];
      }
    }

    /* Temanin izgara bolumu sayfada bir kez aranip saklaniyor. Gizleme
       style.display uzerinden: bolum temanin kendi siniflariyla
       geliyor ve hidden niteligi bazi yerlesim kurallariyla
       cakisabilir. Eski deger saklaniyor ki geri donus kayipsiz olsun. */
    var temaIzgara, temaArandi = false;
    function temaIzgaraBul() {
      if (temaArandi) return temaIzgara;
      temaArandi = true;
      var sec = KOK.getAttribute('data-sc-tema-izgara');
      try { temaIzgara = sec ? document.querySelector(sec) : null; }
      catch (e) { temaIzgara = null; }
      return temaIzgara;
    }
    function temaIzgaraGoster(goster) {
      /* Temanin izgarasini HER ZAMAN bu bolum yonetiyor: ayar "kendi"
         ise liste iki modda da bu bolumun oldugu icin temaninki surekli
         gizli kaliyor. Kapatmayi kullaniciya birakmak, main-collection
         acik unutuldugunda sayfada iki urun listesi birakiyordu --
         nitekim ilk kurulumda tam olarak bu oldu. */
      var el = temaIzgaraBul();
      if (!el) return;
      if (goster) {
        if (el._sc_gizli) { el.style.display = el._sc_eski || ''; el._sc_gizli = false; }
      } else if (!el._sc_gizli) {
        el._sc_eski = el.style.display;
        el.style.display = 'none';
        el._sc_gizli = true;
      }
    }

    function cubukOlc() {
      if (!cubuk || cubuk.hidden) {
        document.body.style.removeProperty('--tt-sc-cubuk-yuk');
        return;
      }
      document.body.style.setProperty('--tt-sc-cubuk-yuk', (cubuk.offsetHeight + 12) + 'px');
    }

    /* ---------- Set ---------- */
    function setCiz() {
      var n = set.length;

      for (var i = 0; i < slotlar.length; i++) {
        var ust = slotlar[i].querySelector('[data-sc-slot-ust]');
        var alt = slotlar[i].querySelector('[data-sc-slot-alt]');
        var e = set[i];
        if (e) {
          slotlar[i].setAttribute('data-sc-dolu', '');
          ust.textContent = e.ad;
          alt.textContent = e.kimeAd + (e.varyantAd ? ' · ' + e.varyantAd : '');
        } else {
          slotlar[i].removeAttribute('data-sc-dolu');
          ust.textContent = i === 0 ? (M.slot1Ust || '') : (M.slot2Ust || '');
          alt.textContent = i === 0 ? (M.slot1Alt || '') : (M.slot2Alt || '');
        }
      }
      if (setSayac) setSayac.textContent = yaz(M.setSayac, n);

      for (var k = 0; k < karolar.length; k++) {
        var id = karolar[k].getAttribute('data-sc-urun');
        var icinde = set.some(function (e) { return String(e.urunId) === id; });
        karolar[k].toggleAttribute('data-sc-secili', icinde);
        var btn = karolar[k].querySelector('[data-sc-ekle]');
        var metin = karolar[k].querySelector('[data-sc-ekle-metin]');
        if (metin) metin.textContent = icinde ? (M.kartSecili || '') : (M.kartEkle || '');
        if (btn) btn.setAttribute('aria-pressed', icinde ? 'true' : 'false');
      }

      if (durumEl) durumEl.textContent = n === 0 ? (M.durum2 || '') : (n === 1 ? (M.durum1 || '') : (M.durum0 || ''));
      if (tutarEl) {
        if (!TUTAR_GOSTER || n < 2) {
          tutarEl.textContent = n === 2 ? (M.tutarYerine || '') : '';
        } else {
          /* Onizleme: pahali urun tam, ucuz urun yarim. Shopify de
             BXGY'de indirimi ucuz olana uyguluyor. */
          var a = set[0].fiyat, b = set[1].fiyat;
          tutarEl.textContent = para(Math.max(a, b) + Math.min(a, b) / 2);
        }
      }
      if (sepetBtn) sepetBtn.textContent = n === 2 ? (M.dugmeTam || '') : yaz(M.dugmeEksik, n);
      if (cubuk) cubuk.toggleAttribute('data-sc-hazir', n === 2);
      if (n === 2 && uyariEl) uyariEl.hidden = true;
      cubukOlc();
    }

    function setEkle(urunId, varyant, karo) {
      var idx = -1;
      for (var i = 0; i < set.length; i++) if (String(set[i].urunId) === String(urunId)) idx = i;
      if (idx >= 0) { set.splice(idx, 1); setCiz(); return; }

      /* Ucuncu secimde EN ESKI cikiyor: musteri en son dokundugu urunu
         kaybetmeyi beklemez. */
      if (set.length >= 2) set.shift();

      var k = karo.getAttribute('data-sc-kime');
      set.push({
        urunId: urunId,
        varyantId: varyant.id,
        varyantAd: varyant.ad && varyant.ad !== 'Default Title' ? varyant.ad : '',
        ad: karo.getAttribute('data-sc-ad') || '',
        kimeAd: k === 'erkek' ? (M.erkek || '') : (M.kadin || ''),
        fiyat: varyant.fiyat
      });
      setCiz();
    }

    /* ---------- Varyant secici ---------- */
    var vHedef = null;
    function varyantAc(karo) {
      var vs = varyantlar(karo);
      vHedef = karo;
      if (vBaslik) vBaslik.textContent = M.varyantBaslik || '';
      vListe.innerHTML = '';
      vs.forEach(function (v) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'tt-sc-varyant-sec';
        b.setAttribute('role', 'listitem');
        var ad = document.createElement('span');
        ad.textContent = v.ad;
        var f = document.createElement('span');
        f.className = 'tt-sc-varyant-fiyat';
        f.textContent = para(v.fiyat);
        b.appendChild(ad);
        b.appendChild(f);
        b.addEventListener('click', function () {
          varyantKapat();
          setEkle(vHedef.getAttribute('data-sc-urun'), v, vHedef);
        });
        vListe.appendChild(b);
      });
      if (typeof vDialog.showModal === 'function') vDialog.showModal();
      else vDialog.setAttribute('open', '');
      var ilk = vListe.querySelector('button');
      if (ilk) ilk.focus();
    }
    function varyantKapat() {
      if (typeof vDialog.close === 'function' && vDialog.open) vDialog.close();
      else vDialog.removeAttribute('open');
    }

    /* ---------- Sepete ekleme ----------
       Iki urun TEK istekte gidiyor. Ayni varyant iki kez secilmisse
       quantity 2 olarak birlesiyor -- iki ayri satir gondermek sepette
       tek satir olarak birlesirdi zaten, ama istek de gereksiz buyurdu. */
    function sepeteEkle() {
      if (gonderiyor) return;
      if (set.length < 2) {
        if (uyariEl) { uyariEl.textContent = M.uyari || ''; uyariEl.hidden = false; }
        cubukOlc();
        return;
      }
      gonderiyor = true;
      sepetBtn.setAttribute('aria-busy', 'true');

      var a = set[0].varyantId, b = set[1].varyantId;
      var items = String(a) === String(b)
        ? [{ id: a, quantity: 2 }]
        : [{ id: a, quantity: 1 }, { id: b, quantity: 1 }];

      olc('tt_couple_set_sepete_ekle', {
        urunler: set.map(function (e) { return e.urunId; }).join(','),
        varyantlar: set.map(function (e) { return e.varyantId; }).join(',')
      });

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ items: items })
      })
        .then(function (r) {
          if (!r.ok) throw new Error('cart');
          return r.json();
        })
        .then(function () {
          if (uyariEl) uyariEl.hidden = true;
          /* Temanin kendi kancasi: cart.js icindeki <cart-drawer>
             'cart:refresh' dinliyor, icerigi yeniden cekip
             detail.open true ise cekmeceyi aciyor. */
          document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { open: true } }));
          /* Cekmece yoksa (ayar "sayfa" ise) sepete gidiliyor. */
          if (!document.getElementById('CartDrawer') && !document.querySelector('cart-drawer')) {
            window.location.href = '/cart';
          }
        })
        .catch(function () {
          if (uyariEl) { uyariEl.textContent = M.hata || ''; uyariEl.hidden = false; }
        })
        .then(function () {
          gonderiyor = false;
          sepetBtn.removeAttribute('aria-busy');
          cubukOlc();
        });
    }

    /* ---------- Olcum ----------
       Shopify custom pixel'leri sanal bir iframe'de calisiyor ve DOM
       olaylarini GORMUYOR; desteklenen kopru Shopify.analytics.publish.
       Pixel tarafinda analytics.subscribe('tt_mod_secim', ...) ile
       yakalanir. Kurulu degilse cagri sessizce dusuyor. */
    function olc(ad, veri) {
      try {
        if (window.Shopify && Shopify.analytics && typeof Shopify.analytics.publish === 'function') {
          Shopify.analytics.publish(ad, veri || {});
        }
      } catch (e) {}
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(Object.assign({ event: ad }, veri || {}));
      } catch (e) {}
    }

    /* ---------- Baglantilar ---------- */
    function modSec(yeni) {
      if (yeni === mod) return;
      mod = yeni;
      if (mod === 'single') { set = []; }
      /* Couple'a gecince filtre "Tumu"ye donuyor: iki cinsiyetten de
         urun secilebilmesi bu modun butun amaci. */
      if (mod === 'couple') kime = 'tumu';
      ciz();
      adresYaz();
      olc('tt_mod_secim', { mod: mod });
    }

    function adresYaz() {
      try {
        var u = new URL(window.location.href);
        if (mod === 'couple') u.searchParams.set('mod', 'couple');
        else u.searchParams.delete('mod');
        window.history.replaceState({}, '', u.toString());
      } catch (e) {}
    }

    /* Radiogroup'larda gezinme: ok tuslari secimi tasiyor, Space/Enter
       odaktakini seciyor. Roving tabindex ciz() icinde guncelleniyor. */
    function okTusu(liste, e, secFn) {
      var i = liste.indexOf(document.activeElement);
      if (i < 0) return false;
      var yon = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') yon = 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') yon = -1;
      else if (e.key === 'Home') yon = -liste.length;
      else if (e.key === 'End') yon = liste.length;
      else return false;
      e.preventDefault();
      var acik = liste.filter(function (el) { return !el.hidden; });
      var j = acik.indexOf(document.activeElement);
      var h = acik[Math.max(0, Math.min(acik.length - 1, j + yon))];
      if (h) { secFn(h); h.focus(); }
      return true;
    }

    kartlar.forEach(function (k) {
      k.addEventListener('click', function () { modSec(k.getAttribute('data-sc-mod')); });
      k.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          modSec(k.getAttribute('data-sc-mod'));
          return;
        }
        okTusu(kartlar, e, function (h) { modSec(h.getAttribute('data-sc-mod')); });
      });
    });

    cipler.forEach(function (c) {
      c.addEventListener('click', function () { kime = c.getAttribute('data-sc-cip'); ciz(); });
      c.addEventListener('keydown', function (e) {
        okTusu(cipler, e, function (h) { kime = h.getAttribute('data-sc-cip'); ciz(); });
      });
    });

    /* Kart icindeki "Sete ekle" delegasyonla baglaniyor: karolar
       cok ve dugmeler mod degisince gizlenip aciliyor. */
    if (izgara) {
      izgara.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-sc-ekle]');
        if (!btn) return;
        e.preventDefault();
        var karo = btn.closest('[data-sc-karo]');
        if (!karo) return;
        var id = karo.getAttribute('data-sc-urun');
        var zatenSecili = set.some(function (x) { return String(x.urunId) === id; });
        var vs = varyantlar(karo);
        if (!vs.length) return;
        /* Secili urune tekrar basmak cikarma demek; varyant sormaya
           gerek yok. */
        if (zatenSecili || vs.length === 1) setEkle(id, vs[0], karo);
        else varyantAc(karo);
      });
    }

    /* Dolu slota basmak o urunu setten cikariyor. */
    slotlar.forEach(function (sl, i) {
      sl.addEventListener('click', function () {
        if (!set[i]) return;
        set.splice(i, 1);
        setCiz();
      });
    });

    if (sepetBtn) sepetBtn.addEventListener('click', sepeteEkle);

    var vKapat = KOK.querySelector('[data-sc-varyant-kapat]');
    if (vKapat) vKapat.addEventListener('click', varyantKapat);
    if (vDialog) {
      vDialog.addEventListener('click', function (e) {
        /* Native <dialog>'da backdrop'a tiklama hedefi dialog'un
           kendisi olur; ic kutuya tiklama degil. */
        if (e.target === vDialog) varyantKapat();
      });
    }

    window.addEventListener('resize', cubukOlc);

    /* ?mod=couple reklamdan dogrudan couple'a getirmek icin; bolum
       ayarindaki varsayilani EZIYOR. */
    try {
      var p = new URLSearchParams(window.location.search).get('mod');
      if (p === 'couple' || p === 'single') mod = p;
    } catch (e) {}

    ciz();
  }

  function hepsi() {
    var kokler = document.querySelectorAll('[data-tt-sc]');
    for (var i = 0; i < kokler.length; i++) kur(kokler[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hepsi);
  else hepsi();

  /* Tema duzenleyicide bolum bastan cizilince katman yeniden kuruluyor. */
  document.addEventListener('shopify:section:load', hepsi);
})();
