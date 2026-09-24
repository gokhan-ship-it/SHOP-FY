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

   PARA BICIMI SABITLENMIYOR
     Bicim burada yazili degil: bolum Liquid'i bilinen bir tutari
     (12.345,67) bicimlendirip sonucu data-sc-para-ornek olarak
     veriyor, buradaki cozucu de ondan ayiraclari geri okuyor.
     Ornegi ureten tt-para, karolardaki fiyatlari da uretiyor --
     yani cubuk ile kartlar ayni kaynaktan besleniyor. (Magazanin
     money_format'i Ingilizce gruplama uretiyor, "12,345.67TL";
     ekranin geri kalani Turkce oldugu icin ornek oradan alinmiyor.)
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  function kur(KOK) {
    if (KOK.hasAttribute('data-sc-kurulu')) return;
    KOK.setAttribute('data-sc-kurulu', '');

    var M = {};
    try { M = JSON.parse(KOK.getAttribute('data-sc-metin') || '{}'); } catch (e) { M = {}; }

    var TUTAR_GOSTER = KOK.getAttribute('data-sc-tutar-goster') === 'true';
    /* Cark kodunun tutari KURUS cinsinden; kartlardaki indirimli fiyat
       blogu ile AYNI tema ayarindan geliyor (bkz. bolumun Liquid'i). */
    var KOD_KURUS = parseInt(KOK.getAttribute('data-sc-kod-kurus'), 10) || 0;
    /* Single modunda listeyi kim ciziyor -- TEK ayar bu.

         tema   Sayfanin kendi izgarasi (main-collection). Filtreleri,
                siralamasi ve sayfalamasi korunuyor; ama o izgara
                yalnizca sayfanin KENDI koleksiyonunu basabildigi icin
                Kadin/Erkek cipleri Single modunda gizleniyor.
         kendi  Bu bolumun izgarasi, iki koleksiyon birden. Cipler
                calisiyor.

       Once ayri bir "Single modunda listelenen urunler" ayari daha
       vardi; iki ayarin adi da "Single modunda" diye basliyordu ve
       kurulumda yanlis olan cevrildi. Ustelik "bolumun izgarasi +
       yalnizca sayfanin koleksiyonu" kombinasyonu anlamsizdi: tek
       koleksiyonu filtresiz listelemeyi temanin izgarasi zaten daha
       iyi yapiyor. Ayar kaldirildi. */
    var TEMA_IZGARA = KOK.getAttribute('data-sc-tekil-izgara') !== 'kendi';
    var TUKENDI_SONA = KOK.getAttribute('data-sc-tukendi-sona') === 'true';

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
    var cubuklar = Array.prototype.slice.call(KOK.querySelectorAll('[data-sc-ilerleme]'));
    var cubuk    = KOK.querySelector('[data-sc-cubuk]');
    var durumEl  = KOK.querySelector('[data-sc-durum]');
    var tutarEl  = KOK.querySelector('[data-sc-tutar]');
    var kirilim  = KOK.querySelector('[data-sc-kirilim]');
    var kirSatir = Array.prototype.slice.call(KOK.querySelectorAll('[data-sc-kir]'));
    var tasarruf = KOK.querySelector('[data-sc-tasarruf]');
    var tasMetin = KOK.querySelector('[data-sc-tasarruf-metin]');
    var toplamEl = KOK.querySelector('[data-sc-toplam]');
    var araEl    = KOK.querySelector('[data-sc-ara]');
    var araTutar = KOK.querySelector('[data-sc-ara-tutar]');
    var kodEl    = KOK.querySelector('[data-sc-kod]');
    var kodTutar = KOK.querySelector('[data-sc-kod-tutar]');
    var dugmeMet = KOK.querySelector('[data-sc-dugme-metin]');
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

    /* ---------- Gorunurluk ----------
       Bu bolumun izgarasi her zaman iki koleksiyonu birden kapsiyor;
       Single ile Couple arasindaki tek fark, Couple'da indirim kapsami
       disindaki urunlerin elenmesi. */
    function karoUygun(karo, hangiKime) {
      var k = karo.getAttribute('data-sc-kime');
      /* Cinsiyet isareti bos olan urun, sayfanin kendi koleksiyonunda
         olup iki couple koleksiyonunun HICBIRINDE olmayan urundur.
         "Ikinci Uründe %50" indiriminin kapsami disinda kaldigi icin
         Couple modunda gosterilmiyor -- sete alinsa sayfanin veremeyecegi
         bir indirim sozu verilmis olurdu. Single modunda gorunuyor. */
      if (mod === 'couple' && !k) return false;
      if (hangiKime === 'tumu') return true;
      return k === hangiKime || k === 'ikisi';
    }

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

      sirala();

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

      baglantilariYaz();

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

    /* ---------- Tukenen urunler grubun sonuna ----------
       Izgarada "Kadin" ve "Erkek" grup basliklari var. Global bir
       siralama kadin grubunun tukenmislerini Erkek basliginin altina
       dusururdu; bu yuzden siralama HER GRUBUN KENDI ICINDE.

       Liquid'de degil burada yapiliyor: uc ayri dongude basilan ve
       ortak bir "gorulen" dizesiyle tekillestirilen listeyi iki gecise
       bolmek dedup'i kirardi. DOM'da bir kez tasimak hem daha kisa hem
       de tekillestirmeye hic dokunmuyor. */
    function tukendiSona() {
      if (!TUKENDI_SONA || !izgara) return;
      var gruplarAd = ['kadin', 'erkek'];
      for (var g = 0; g < gruplarAd.length; g++) {
        var sonMusait = null, tukenenler = [];
        for (var i = 0; i < karolar.length; i++) {
          if (karolar[i].getAttribute('data-sc-grup') !== gruplarAd[g]) continue;
          if (karolar[i].getAttribute('data-sc-var') === '0') tukenenler.push(karolar[i]);
          else sonMusait = karolar[i];
        }
        /* Grupta hic musait urun yoksa tasinacak bir sey de yok. */
        if (!sonMusait || !tukenenler.length) continue;
        var ref = sonMusait.nextSibling;
        for (var t = 0; t < tukenenler.length; t++) {
          izgara.insertBefore(tukenenler[t], ref);
        }
      }
      /* Dizi DOM sirasini yansitsin: sayimlar sirali degil ama
         okuyanin kafasi karismasin. */
      karolar = Array.prototype.slice.call(KOK.querySelectorAll('[data-sc-karo]'));
    }

    /* ---------- IKI KOLEKSIYONDA BIRDEN OLAN URUN ----------

       Karolar UC ayri dongude basiliyor (kadin, sayfanin kendi
       koleksiyonu, erkek) ve tekillestirmede ILK donguyu goren kazaniyor.
       Iki koleksiyonda birden olan urun ("Klasik Zaman Kapsulu") bu
       yuzden kadin grubunda basiliyor ve DOM'da butun erkek
       urunlerinden ONCE duruyor. "Erkek" secilince kadin karolari
       gizleniyor ve o urun listenin EN BASINA cikiyordu -- oysa kendi
       koleksiyonunda (bileklik) en sonda duruyor.

       Cozum tek bir karoyu iki yere basmak DEGIL: cinsiyet secildiginde
       "ikisi" isaretli karolar listenin sonuna aliniyor. "Tumu"de temel
       sira geri geliyor, yani grup basliklari ve gruplarin ic sirasi
       hic bozulmuyor.

       TEMEL SIRA tukendiSona()'dan SONRA donduruluyor: tukenenlerin
       grup sonuna alinmasi zaten bir kez yapilmis oluyor ve burasi onun
       uzerine biniyor. */
    var TEMEL_SIRA = null;
    function siraKur() {
      if (!izgara) return;
      TEMEL_SIRA = Array.prototype.slice.call(izgara.children);
    }
    function sirala() {
      if (!izgara || !TEMEL_SIRA) return;
      var hedef;
      if (kime === 'tumu') {
        hedef = TEMEL_SIRA;
      } else {
        var once = [], sona = [];
        for (var i = 0; i < TEMEL_SIRA.length; i++) {
          /* Grup basliklarinda data-sc-kime yok; null donuyor ve
             yerinde kaliyorlar. */
          if (TEMEL_SIRA[i].getAttribute('data-sc-kime') === 'ikisi') sona.push(TEMEL_SIRA[i]);
          else once.push(TEMEL_SIRA[i]);
        }
        hedef = once.concat(sona);
      }
      /* Sira zaten dogruysa DOM'a hic dokunulmuyor: her ciz() cagrisinda
         29 karoyu yeniden baglamanin anlami yok. */
      for (var j = 0; j < hedef.length; j++) {
        if (izgara.children[j] !== hedef[j]) break;
      }
      if (j === hedef.length) return;
      var parca = document.createDocumentFragment();
      for (var k = 0; k < hedef.length; k++) parca.appendChild(hedef[k]);
      izgara.appendChild(parca);
    }

    /* ---------- Urun baglantilari ----------
       Couple modunda urun sayfasi Couple secili acilsin diye linklere
       ?mod=couple ekleniyor. Kartlar yeniden BASILMIYOR -- yalnizca
       mevcut <a>'larin href'i yaziliyor, mod degisimi ani kaliyor. */
    function baglantilariYaz() {
      for (var k = 0; k < karolar.length; k++) {
        var kart = karolar[k].querySelector('[data-uk]');
        if (!kart) continue;
        var u = kart.getAttribute('data-uk-url');
        if (!u) continue;
        var hedef = mod === 'couple'
          ? u + (u.indexOf('?') >= 0 ? '&' : '?') + 'mod=couple'
          : u;
        var baglar = karolar[k].querySelectorAll('[data-uk-bag]');
        for (var b = 0; b < baglar.length; b++) baglar[b].setAttribute('href', hedef);
      }
    }

    function cubukOlc() {
      if (!cubuk) return;
      /* Ortuluyken (gercek sepet cekmecesi acikken) cubuk display:none;
         offsetHeight 0 cikar. Olcup yazarsak sayfanin alt boslugu
         cekmecenin ARKASINDA kayar, cekmece kapaninca da geri ziplar.
         O yuzden ortuluyken son olculen deger oldugu gibi kaliyor. */
      if (cubuk.hasAttribute('data-sc-ortulu')) return;
      if (cubuk.hidden) {
        document.body.style.removeProperty('--tt-sc-cubuk-yuk');
        return;
      }
      document.body.style.setProperty('--tt-sc-cubuk-yuk', (cubuk.offsetHeight + 12) + 'px');
    }

    /* ---------- Gercek sepet acikken cubuk kalkiyor ----------

       Tema sepet cekmecesi z-35'te, bu cubuk 60'ta: cubuk cekmecenin
       alt kismini -- ODEME butonunu -- ortuyordu ve musteri odemeye
       gecemiyordu. Cozum z-index yarisi degil (o zaman cubuk perdenin
       altindan yine sizerdi): katman aciksa cubuk tamamen kalkiyor.

       ACIK OLMANIN ISARETI TAHMIN EDILMIYOR. Tema hangi niteligi
       cevirirse cevirsin (hidden / open / sinif / style), sonuc hep
       ayni: oge GORUNUR hale geliyor. Olculen sey de bu -- gorunurluk.
       Boylece tema guncellenip mekanizma degisse bile calisiyor.

       Secici yalniz sepet cekmecesi degil: ustumuze acilan her kalici
       katmanda (menu cekmecesi, arama, hizli bakis) cubugun kalkmasi
       dogru. Bu bolumun KENDI katmanlari disarida: kendi varyant
       secicimiz native <dialog>, zaten ust katmanda ve cubuktan once
       cizilmiyor. */
    var ORTU_SEC = 'cart-drawer, #CartDrawer, [aria-modal="true"], dialog[open]';

    function ortuGorunur(el) {
      if (!el || KOK.contains(el)) return false;
      if (el.hasAttribute('hidden')) return false;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      var st = window.getComputedStyle(el);
      /* opacity BILEREK bakilmiyor: cekmece acilirken perde 0'dan
         geliyor ve o anda cubugu birakirsak ilk kareler yine ortulu
         gecerdi. */
      return st.display !== 'none' && st.visibility !== 'hidden';
    }

    function ortuVar() {
      var hepsi;
      try { hepsi = document.querySelectorAll(ORTU_SEC); }
      catch (e) { return false; }
      for (var i = 0; i < hepsi.length; i++) if (ortuGorunur(hepsi[i])) return true;
      return false;
    }

    function ortuBak() {
      if (!cubuk) return;
      var ortulu = ortuVar();
      if (ortulu === cubuk.hasAttribute('data-sc-ortulu')) return;
      cubuk.toggleAttribute('data-sc-ortulu', ortulu);
      /* Geri gelirken yeniden olculuyor: ortuluyken atlanan olcum
         nedeniyle alt boslugu bayat kalmasin. */
      if (!ortulu) cubukOlc();
    }

    var ortuBekler = false;
    function ortuPlanla() {
      if (ortuBekler) return;
      ortuBekler = true;
      window.requestAnimationFrame(function () { ortuBekler = false; ortuBak(); });
    }

    /* ---------- Hangi rakam kesin ----------

       Cubuktaki her rakam sepette ve odeme sayfasinda cikacak rakamin
       AYNISI olmak zorunda. Tek kosul var:

       SEPET BOS MU?  Indirim ("Ikinci Uronde %50 Indirim") bir
          BXGY: kapsamdaki urunlerden 1 al, 1'ini yarim fiyata al.
          Sepette zaten uygun bir urun varsa Shopify eslesmeyi bizim
          iki uronumuz disinda kurabiliyor -- o zaman ne satir
          fiyatlari ne toplam tutuyor. Sepet /cart.js ile BIR KEZ
          okunuyor; salt okuma, yan etkisi yok.

       Tutmuyorsa hic rakam gosterilmiyor: kirilim liste fiyatlarina ve
       yalnizca "%50" etiketine dusuyor. Yanlis rakam yerine
       rakamsizlik.

       ------------------------------------------------------------
       CARK KODU DA HESABA GIRIYOR

       Kod SIPARIS duzeyinde inen SABIT tutarli bir indirim: kalemlerin
       birim fiyatini degistirmiyor, toplamdan dusuyor. Iki indirim de
       birbirini kabul ediyor (BXGY'nin combinesWith.orderDiscounts'u ve
       kodun combinesWith.productDiscounts'u acik); on gercek sipariste
       ara toplam, kalem toplamindan tam kod tutari kadar dusuk cikti.
       Cekmece de ayni sonucu gosteriyor -- cart.total_price sepet
       duzeyindeki indirimler DUSULMUS degerdir.

       Kodun gecerliligini kupon katmani (assets/taksit-tablosu.js)
       zaten saniyede bir hesapliyor ve kararini kartlardaki bloga
       yaziyor; cerez cozumlemesi burada TEKRARLANMIYOR, onun sonucu
       okunuyor. Kodun suresi dolunca katman blogu geri gizliyor ve
       asagidaki gozlemci cubugu yeniden cizdiriyor -- ekranda bayat
       bir indirim kalmiyor. */
    var sepetBos = null;   /* null = daha okunmadi */
    function sepetiOku() {
      if (sepetBos !== null) return;
      sepetBos = 'bekliyor';
      fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (c) {
          sepetBos = c ? c.item_count === 0 : false;
          setCiz();
        })
        .catch(function () { sepetBos = false; setCiz(); });
    }
    function kodVarMi() {
      /* Kupon katmani gecerli kod bulunca bu blogun hidden'ini kaldiriyor. */
      return !!KOK.querySelector('[data-tt-kart-fb]:not([hidden])');
    }
    function rakamKesin() {
      return TUTAR_GOSTER && sepetBos === true;
    }
    /* Kod satiri ancak gecerli bir kod VARSA ve tutari ara toplamdan
       kucukse aciliyor. Ikinci kosul kartlardaki blogun da kurali:
       indirim tutara esit ya da ondan buyukse rakam gostermiyoruz. */
    function kodKurusu(araToplam) {
      if (!KOD_KURUS || !kodVarMi()) return 0;
      return KOD_KURUS < araToplam ? KOD_KURUS : 0;
    }

    /* ---------- Set ----------

       GOSTERIM SIRASI. `set` dizisi SECIM sirasinda duruyor ve oyle
       kaliyor: ekleme, ucuncu secimde en eskinin dusmesi, sepete
       gonderilen kalemler ve tutar hesabi hic degismedi. Yalniz
       SLOTLARA yazarken pahali olan 1. slota, ucuz olan 2. slota
       aliniyor -- cunku 2. slot "sepette yarı fiyatına" diyor ve
       Shopify BXGY'de indirimi ucuz olana uyguluyor. Bu dosyadaki
       tutar onizlemesi de zaten max + min/2 ile ayni varsayimi
       kullaniyor; yeni bir fiyat mantigi eklenmiyor, var olan
       varsayim ekrana dogru yansitiliyor.

       Slot dizinden okuyamiyor artik: hangi slotun `set` icinde hangi
       ogeyi gosterdigi data-sc-kaynak'ta duruyor, bosaltma da onu
       okuyor. */
    function gosterimSirasi() {
      if (set.length < 2) return set.map(function (_, i) { return i; });
      return set[0].fiyat >= set[1].fiyat ? [0, 1] : [1, 0];
    }

    function setCiz() {
      var n = set.length;
      var sira = gosterimSirasi();

      for (var i = 0; i < slotlar.length; i++) {
        var ust = slotlar[i].querySelector('[data-sc-slot-ust]');
        var alt = slotlar[i].querySelector('[data-sc-slot-alt]');
        var kaynak = sira.length > i ? sira[i] : -1;
        var e = kaynak >= 0 ? set[kaynak] : null;
        if (e) {
          slotlar[i].setAttribute('data-sc-dolu', '');
          slotlar[i].setAttribute('data-sc-kaynak', String(kaynak));
          ust.textContent = e.ad;
          alt.textContent = i === 0
            ? e.kimeAd + (e.varyantAd ? ' · ' + e.varyantAd : '')
            : (M.slot2AltDolu || '');
        } else {
          slotlar[i].removeAttribute('data-sc-dolu');
          slotlar[i].removeAttribute('data-sc-kaynak');
          ust.textContent = i === 0 ? (M.slot1Ust || '') : (M.slot2Ust || '');
          alt.textContent = i === 0 ? (M.slot1AltBos || '') : (M.slot2AltBos || '');
        }
      }
      for (var c = 0; c < cubuklar.length; c++) cubuklar[c].toggleAttribute('data-sc-dolu', c < n);
      if (setSayac) setSayac.textContent = n === 2 ? (M.setHazir || '') : yaz(M.setSayac, n);

      for (var k = 0; k < karolar.length; k++) {
        var id = karolar[k].getAttribute('data-sc-urun');
        var icinde = false;
        /* Karttaki numara SET KUTUSUNDAKI slot numarasiyla ayni olmali.
           Ikisi de ayni "sira" dizisinden okunuyor: slot i'de gosterilen
           oge set[sira[i]], yani urunun numarasi i+1. Fiyata gore
           siralama degisirse numara da kendiliginden dogru kaliyor. */
        var slotNo = 0;
        for (var d = 0; d < sira.length; d++) {
          if (String(set[sira[d]].urunId) === id) { icinde = true; slotNo = d + 1; }
        }
        karolar[k].toggleAttribute('data-sc-secili', icinde);

        var btn = karolar[k].querySelector('[data-sc-ekle]');
        var metin = karolar[k].querySelector('[data-sc-ekle-metin]');
        if (metin) metin.textContent = icinde ? (M.kartSecili || '') : (M.kartEkle || '');
        if (btn) {
          btn.setAttribute('aria-pressed', icinde ? 'true' : 'false');
          var ad = karolar[k].getAttribute('data-sc-ad') || '';
          var sablon = mod === 'couple'
            ? (icinde ? M.ukAriaSetCikar : M.ukAriaSetEkle)
            : M.ukAriaSepet;
          btn.setAttribute('aria-label', String(sablon || '').replace('[ad]', ad));
        }
        var sayiEl = karolar[k].querySelector('[data-uk-sira]');
        if (sayiEl) {
          sayiEl.textContent = slotNo ? String(slotNo) : '';
          sayiEl.hidden = !slotNo;
        }
      }

      cubukCiz(n, sira);
      if (dugmeMet) dugmeMet.textContent = n === 2 ? (M.dugmeTam || '') : yaz(M.dugmeEksik, n);
      if (cubuk) cubuk.toggleAttribute('data-sc-hazir', n === 2);
      if (n === 2 && uyariEl) uyariEl.hidden = true;
      cubukOlc();
    }

    /* ---------- Cubugun icerigi ----------
       Iki urun seciliyken kirilim aciliyor. Satir sirasi SLOT SIRASI:
       sira[0] pahali urun (tam fiyat), sira[1] ucuz urun (%50).
       Ayni dizi set kutusundaki slotlari ve kartlardaki numara
       rozetini de besliyor, yani ucu de birbirini tutuyor.

       Shopify BXGY'de indirimi EN UCUZ uygun urune uyguluyor; magaza
       ayari da oyle ("Ikinci Uronde %50 Indirim": 1 al, 1'ini %50).
       Bu yuzden "%50" etiketi ve ustu cizili fiyat her zaman ikinci
       satirda. */
    function cubukCiz(n, sira) {
      var ikiUrun = n === 2;
      /* Kirilim TEK URUNDE DE aciliyor. Once yalnizca ikide aciliyordu
         ve bir urun secen musteri sectigi seyin fiyatini hic
         gormuyordu -- oysa o rakam kesin: liste fiyati, hicbir indirim
         iddiasi yok. Ikinci satir bos kaldigi icin kapali. */
      if (kirilim) kirilim.toggleAttribute('data-sc-acik', n > 0);

      if (!ikiUrun) {
        /* Tek urun: birinci satira secilen urun, ikinci satir kapali. */
        if (kirSatir.length) {
          var bir = kirSatir[0];
          bir.hidden = n === 0;
          if (n === 1) {
            var e1 = set[sira[0]];
            bir.removeAttribute('data-sc-indirimli');
            var a1 = bir.querySelector('[data-sc-kir-ad]');
            var t1 = bir.querySelector('[data-sc-kir-etiket]');
            var s1 = bir.querySelector('[data-sc-kir-eski]');
            var f1 = bir.querySelector('[data-sc-kir-fiyat]');
            if (a1) a1.textContent = e1.ad;
            if (t1) t1.textContent = M.cubukEtiketTam || '';
            if (s1) s1.hidden = true;
            if (f1) f1.textContent = para(e1.fiyat);
          }
          for (var b = 1; b < kirSatir.length; b++) kirSatir[b].hidden = true;
        }
        if (araEl) araEl.hidden = true;
        if (kodEl) kodEl.hidden = true;
        if (durumEl) { durumEl.hidden = false; durumEl.textContent = n === 0 ? (M.durum2 || '') : (M.durum1 || ''); }
        if (tasarruf) tasarruf.hidden = true;
        if (toplamEl) toplamEl.hidden = true;
        if (tutarEl) tutarEl.textContent = '';
        return;
      }

      /* Iki urunde iki satir da geri geliyor. */
      for (var g = 0; g < kirSatir.length; g++) kirSatir[g].hidden = false;

      /* Sepet daha okunmadiysa simdi oku: cubuk ilk kez rakam
         gosterecegi anda, sayfa acilisinda degil. */
      sepetiOku();
      var kir = rakamKesin();

      var tam = set[sira[0]], ind = set[sira[1]];
      var indFiyat = Math.round(ind.fiyat / 2);
      var araToplam = tam.fiyat + indFiyat;
      var kod = kir ? kodKurusu(araToplam) : 0;
      var toplam = araToplam - kod;
      /* Tasarruf = %50'den gelen + carktan gelen. Musterinin cebinde
         kalan tutar bu; ikisini ayri ayri saymak yerine tek rakam. */
      var kazanc = (ind.fiyat - indFiyat) + kod;

      var veri = [
        { e: tam, etiket: M.cubukEtiketTam, indirimli: false, odenen: tam.fiyat },
        { e: ind, etiket: M.cubukEtiketIndirim, indirimli: true, odenen: indFiyat }
      ];
      for (var i = 0; i < kirSatir.length && i < veri.length; i++) {
        var sat = kirSatir[i], v = veri[i];
        sat.toggleAttribute('data-sc-indirimli', v.indirimli);
        var ad = sat.querySelector('[data-sc-kir-ad]');
        var et = sat.querySelector('[data-sc-kir-etiket]');
        var es = sat.querySelector('[data-sc-kir-eski]');
        var esT = sat.querySelector('[data-sc-kir-eski-tutar]');
        var fi = sat.querySelector('[data-sc-kir-fiyat]');
        if (ad) ad.textContent = v.e.ad;
        if (et) et.textContent = v.etiket || '';
        /* Kirilim kesin degilse satirda LISTE fiyati kaliyor ve ustu
           cizili satir hic cikmiyor -- yarim dogru bir rakam yerine
           yalnizca "%50" etiketi. */
        if (fi) fi.textContent = para(kir ? v.odenen : v.e.fiyat);
        if (es) es.hidden = !(kir && v.indirimli);
        if (esT && kir && v.indirimli) esT.textContent = para(v.e.fiyat);
      }

      /* "Ara toplam" ve "Cark indirimi" yalnizca kod varken cikiyor:
         kod yokken ara toplam zaten toplamin kendisi, ayni rakami iki
         kez yazmanin anlami yok. */
      if (araEl) {
        araEl.hidden = !kod;
        if (kod && araTutar) araTutar.textContent = para(araToplam);
      }
      if (kodEl) {
        kodEl.hidden = !kod;
        if (kod && kodTutar) kodTutar.textContent = '-' + para(kod);
      }

      /* Solda durum cumlesi yalnizca hicbir rakam yokken kaliyor --
         sifir ve bir uronde oldugu gibi. Kirilim aciksa ayni seyi iki
         kez soylemis oluyordu ("2 urun, ikincisi yari fiyatina" ile
         ustu cizili satir), o yuzden kalkiyor. */
      /* Iki ayri "rakam yazamiyorum" hali var ve ayni cumle ikisine
         birden uymuyor:
           - tutar_goster KAPALI: magaza rakam istemiyor, teklifi
             anlatan cumle dogru.
           - SEPETTE URUN VAR: rakam kesin olmadigi icin yazilmiyor;
             burada teklifi tekrar anlatmak, iki TAM fiyatin yaninda
             "indirim uygulanmadi" gibi okunuyordu.
         Sepet HENUZ OKUNMADIYSA (sepetBos null/'bekliyor') teklif
         cumlesi kaliyor: daha bilmedigimiz bir seyi soylemiyoruz,
         yoksa okuma bitene kadar bos sepette de yanlis cumle
         parlardi. */
      if (durumEl) {
        durumEl.hidden = kir;
        if (!kir) {
          var dolu = TUTAR_GOSTER && sepetBos === false;
          durumEl.textContent = (dolu ? (M.durumDolu || M.durum0) : M.durum0) || '';
        }
      }
      if (tasarruf) {
        tasarruf.hidden = !kir;
        if (kir && tasMetin) {
          tasMetin.textContent = String(M.cubukTasarruf || '').replace('[tutar]', para(kazanc));
        }
      }
      if (toplamEl) toplamEl.hidden = !kir;
      if (tutarEl) tutarEl.textContent = kir ? para(toplam) : '';
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

    /* ---------- Varyant secici ----------
       Iki amaca birden hizmet ediyor: Couple'da secilen varyant sete,
       Single'da dogrudan sepete gidiyor. Temanin quick-view'ini
       acmak yerine bu diyalog kullaniliyor -- fiyatlari gosteriyor
       (Vantablack 2.699 / 4.799 gibi farklar var), zaten kurulu ve
       iki modda da ayni. */
    var vHedef = null;
    var vAmac = 'set';
    function varyantAc(karo, amac) {
      vAmac = amac || 'set';
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
          if (vAmac === 'sepet') tekUrunEkle(vHedef, v);
          else setEkle(vHedef.getAttribute('data-sc-urun'), v, vHedef);
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

    /* ---------- Single modunda sepete ekleme ----------
       Couple'in iki kalemlik istegiyle AYNI yolu kullaniyor: /cart/add.js
       ve ardindan temanin 'cart:refresh' kancasi. Ayri bir sepet mantigi
       kurulmuyor, fiyat hesabi yapilmiyor.

       Temanin kendi <product-form> hata bildirimi kullanilamiyor: o
       bildirim form ogesinin icinde yasiyor, kartta form yok. Onun
       yerine dugme kisa sure hata haline geciyor ve ekran okuyucuya
       aria-live ile duyuruluyor. Kartin boyu degismiyor. */
    var ukDuyuru = null;
    function duyur(metin) {
      if (!ukDuyuru) {
        ukDuyuru = document.createElement('p');
        ukDuyuru.className = 'sr-only';
        ukDuyuru.setAttribute('aria-live', 'polite');
        KOK.appendChild(ukDuyuru);
      }
      ukDuyuru.textContent = metin || '';
    }

    function tekUrunEkle(karo, varyant) {
      if (gonderiyor) return;
      var btn = karo.querySelector('[data-sc-ekle]');
      gonderiyor = true;
      if (btn) btn.setAttribute('aria-busy', 'true');

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ items: [{ id: varyant.id, quantity: 1 }] })
      })
        .then(function (r) {
          if (!r.ok) throw new Error('cart');
          return r.json();
        })
        .then(function () {
          if (btn) {
            btn.setAttribute('data-uk-durum', 'basarili');
            /* ~1.3 saniye yesil tik, sonra artiya donuyor. */
            window.setTimeout(function () { btn.removeAttribute('data-uk-durum'); }, 1300);
          }
          duyur(M.ukEklendi || '');
          document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { open: true } }));
          if (!document.getElementById('CartDrawer') && !document.querySelector('cart-drawer')) {
            window.location.href = '/cart';
          }
        })
        .catch(function () {
          if (btn) {
            btn.setAttribute('data-uk-durum', 'hata');
            window.setTimeout(function () { btn.removeAttribute('data-uk-durum'); }, 1800);
          }
          duyur(M.hata || '');
        })
        .then(function () {
          gonderiyor = false;
          if (btn) btn.removeAttribute('aria-busy');
        });
    }

    /* ---------- Couple setini sepete ekleme ----------
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

    /* Karttaki kose dugmesi DELEGASYONLA baglaniyor: izgarada 29 karo
       var, her birine ayri dinleyici takmanin anlami yok. Tek dugme
       iki is yapiyor ve karari tiklama aninda MOD veriyor -- markup
       iki modda da ayni, dugme gizlenip acilmiyor. */
    if (izgara) {
      izgara.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-sc-ekle]');
        if (!btn) return;
        e.preventDefault();
        var karo = btn.closest('[data-sc-karo]');
        if (!karo) return;
        var id = karo.getAttribute('data-sc-urun');
        var vs = varyantlar(karo);
        /* Tukenen urunde dugme zaten basilmiyor; bu ikinci kemer.
           Satilabilir varyanti kalmamis urun ne sepete ne de sete
           girebiliyor. */
        if (!vs.length) return;

        if (mod === 'couple') {
          var zatenSecili = set.some(function (x) { return String(x.urunId) === id; });
          /* Secili urune tekrar basmak cikarma demek; varyant sormaya
             gerek yok. */
          if (zatenSecili || vs.length === 1) setEkle(id, vs[0], karo);
          else varyantAc(karo, 'set');
        } else {
          /* Single: tek satilabilir varyant varsa dogrudan sepete,
             birden fazlaysa once hangisi diye soruyoruz -- ilk varyanti
             varsaymak yanlis fiyat gostermek olurdu. */
          if (vs.length === 1) tekUrunEkle(karo, vs[0]);
          else varyantAc(karo, 'sepet');
        }
      });
    }

    /* Dolu slota basmak o urunu setten cikariyor. Slotun gosterdigi
       oge `set` icinde baska sirada olabilir (bkz. gosterimSirasi),
       o yuzden dizin degil data-sc-kaynak okunuyor. */
    slotlar.forEach(function (sl) {
      sl.addEventListener('click', function () {
        var k = sl.getAttribute('data-sc-kaynak');
        if (k === null) return;
        var i = parseInt(k, 10);
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

    /* Kupon katmani kodu bulunca ya da suresi dolunca kartlardaki
       blogun hidden'ini degistiriyor. Cubuk o karari okuyor ama kendi
       basina haberi olmuyordu: sayfada bekleyen musteride suresi
       dolmus bir indirim ekranda kalirdi. Tek blogu izlemek yetiyor,
       katman hepsini birlikte ceviriyor. */
    var kodBlok = KOK.querySelector('[data-tt-kart-fb]');
    if (kodBlok && window.MutationObserver) {
      new MutationObserver(function () { setCiz(); })
        .observe(kodBlok, { attributes: true, attributeFilter: ['hidden'] });
    }

    /* Cekmece/katman acilip kapanmasini yakalayan tek izleyici.
       Nitelik SUZGECI genis tutuldu cunku hangi niteligin cevrildigi
       temaya kalmis; karar yine de gorunurluge bakilarak veriliyor.
       Her mutasyonda degil, kare basina en fazla bir kez olculuyor. */
    if (window.MutationObserver) {
      new MutationObserver(ortuPlanla).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['hidden', 'open', 'class', 'style', 'aria-modal', 'aria-expanded']
      });
    }
    /* Emniyet kemeri: sepete ekledikten sonra cekmeceyi tema aciyor.
       Nitelik degisikligi zaten yakalaniyor, ama acilis animasyonlu
       oldugu icin birkac noktada daha bakiliyor -- odeme butonunun
       ortulu kalmasi kabul edilebilir bir risk degil. */
    document.addEventListener('cart:refresh', function () {
      ortuPlanla();
      window.setTimeout(ortuBak, 300);
      window.setTimeout(ortuBak, 900);
    });

    window.addEventListener('resize', cubukOlc);
    /* Kirilim acilirken cubuk buyuyor: gecis bitince yuksekligi
       yeniden olcup sayfanin alt boslugunu guncelliyoruz, yoksa son
       satirdaki kartlar cubugun altinda kaliyor. */
    if (kirilim) kirilim.addEventListener('transitionend', cubukOlc);

    /* ?mod=couple reklamdan dogrudan couple'a getirmek icin; bolum
       ayarindaki varsayilani EZIYOR. */
    try {
      var p = new URLSearchParams(window.location.search).get('mod');
      if (p === 'couple' || p === 'single') mod = p;
    } catch (e) {}

    /* Bir kez, ilk cizimden once: sonraki her ciz() cagrisinda DOM'u
       yeniden karistirmaya gerek yok, stok durumu sayfa omru boyunca
       degismiyor. */
    tukendiSona();
    siraKur();
    ciz();
    ortuBak();
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
