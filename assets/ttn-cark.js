/* ------------------------------------------------------------------
   INDIRIM CARKI  (.ttn-cark-*)

   NE YAPIYOR
     - Kompakt kart -> acilan cark -> kupon karti durum makinesi
     - Hileli ama ilan edildigi gibi calisan cevirme: sonuc HER ZAMAN
       tema ayarindaki indirim tutari; cark o tutari yazan dilimlerden
       birinde duruyor
     - Kazaninca kodu sepete uyguluyor (/cart/update.js, discount)
     - Uc cerezi yaziyor; mevcut indirim katmani onlari okuyup
       fiyat gosterimini kendisi hallediyor
     - Sure dolunca kodu sepetten kaldirip her seyi geri aliyor

   NE YAPMIYOR
     Fiyat HESAPLAMIYOR. Kartlardaki indirimli fiyat, urun sayfasi
     fiyat blogu ve taksit modali assets/taksit-tablosu.js'in isi;
     burasi ona yalnizca "gecerli bir kod var" sinyalini veriyor.
     Ikinci bir indirim mantigi kurulmadi.

   SINYAL NEDEN CEREZ
     Katman cerez adlarini tema ayarindan okuyor (tt_cerez_kod /
     _sure / _zaman) ve saniyede bir orneliyor. Wheelio da ayni uc
     cerezi yaziyordu. Boylece uygulama kaldirilirken katmanin tek
     satiri degismedi.

   DURUM NEREDE
     localStorage.ttnCark = { d: "yok"|"red"|"kazandi", t: <ms> }
     Cerezler tureyen bilgi; asil kaynak bu. Sayac da buradan
     hesaplaniyor, yani sayfa degistikce sifirlanmiyor.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  if (window.__ttnCarkKurulu) return;
  window.__ttnCarkKurulu = true;

  var ANAHTAR = 'ttnCark';

  var vNode = document.querySelector('[data-ttn-veri]');
  if (!vNode) return;
  var V = {};
  try { V = JSON.parse(vNode.getAttribute('data-ttn-veri') || '{}'); } catch (e) { return; }
  if (!V.kod) return;

  var SURE_MS = (parseFloat(V.sureDk) || 30) * 60000;
  var SURE_SN = Math.round(SURE_MS / 1000);
  var AZ_HAREKET = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Durum ----------
     Her erisim try/catch icinde: gizli sekmede, depolama kapaliyken ya
     da kota dolduysa localStorage OKUMADA DA atabiliyor. Okunamazsa
     "hic etkilesim olmamis" varsayiliyor -- musteri carki goruyor,
     kaybedilen tek sey gecmis bir reddetme. */
  function durumOku() {
    try {
      var h = JSON.parse(window.localStorage.getItem(ANAHTAR) || 'null');
      if (h && (h.d === 'yok' || h.d === 'red' || h.d === 'kazandi')) return h;
    } catch (e) {}
    return { d: 'yok', t: 0 };
  }
  function durumYaz(d, t) {
    try { window.localStorage.setItem(ANAHTAR, JSON.stringify({ d: d, t: t || 0 })); }
    catch (e) {}
  }
  /* Suresi dolan kupon kaydi SILINIYOR, "bitti" diye saklanmiyor.
     Sebep: saklansaydi o tarayicida cark bir daha hic gorunmezdi --
     31. dakikada donen musteriye magaza hicbir kampanya sunmamis
     olurdu. Kayit gidince durum dogal olarak "yok" oluyor ve musteri
     carki yeniden cevirebiliyor. */
  function durumSil() {
    try { window.localStorage.removeItem(ANAHTAR); } catch (e) {}
  }
  function kalanMs() {
    var h = durumOku();
    if (h.d !== 'kazandi') return 0;
    return Math.max(0, h.t + SURE_MS - Date.now());
  }
  /* Ekranda gorunen hal. "bitti" saklanmiyor, kalan sureden turuyor:
     boylece saat degistirme ya da baska bir sekmede gecen sure
     kendiliginden dogru okunuyor. */
  function gorunenDurum() {
    var h = durumOku();
    if (h.d !== 'kazandi') return h.d;
    return kalanMs() > 0 ? 'kazandi' : 'bitti';
  }

  /* ---------- Cerezler ----------
     Katmanin sozlesmesi: kod (dize), sure (SANIYE), zaman (ms).
     Gecerlilik katmanda "zaman + sure*1000 > simdi" diye hesaplaniyor,
     o yuzden sure ve zaman HER ZAMAN baslangic degerleri; yalnizca
     cerezin max-age'i kalan sureye gore kisaliyor. */
  function cerezVar(ad) {
    return ('; ' + document.cookie).indexOf('; ' + ad + '=') >= 0;
  }
  /* SameSite=Lax dogru varsayilan: cerez yalnizca kendi sitemizde
     gecerli. Ama TEMA DUZENLEYICISININ onizlemesi CAPRAZ-SITE bir
     iframe (ust cerceve admin.shopify.com, ic cerceve magaza) ve orada
     tarayici Lax cerezi SESSIZCE dusuruyor -- olctuk: ust duzeyde
     yaziliyor, iframe icinde yazilmiyor. Kupon katmani da o cerezleri
     okudugu icin duzenleyicide fiyatlar indirimli gorunmuyordu.

     Yazamadiysak SameSite=None ile bir kez daha deniyoruz. Vitrinde
     (ust duzey) ilk yazma zaten tutuyor, yani bu ikinci satir gercek
     musteride HIC calismiyor; yalnizca onizleme icin. */
  function cerezYaz(ad, deger, saniye) {
    if (!ad) return;
    var govde = ad + '=' + encodeURIComponent(deger) +
      '; path=/; max-age=' + Math.max(0, Math.round(saniye));
    document.cookie = govde + '; SameSite=Lax';
    if (!cerezVar(ad)) document.cookie = govde + '; SameSite=None; Secure';
  }
  function cerezSil(ad) {
    if (!ad) return;
    document.cookie = ad + '=; path=/; max-age=0; SameSite=Lax';
    if (cerezVar(ad)) document.cookie = ad + '=; path=/; max-age=0; SameSite=None; Secure';
  }

  /* ---------- Katmanin localStorage aynasi ----------
     assets/taksit-tablosu.js gecerli bir kodu ilk gordugunde
     localStorage.ttKod = { k: kod, b: bitisMs } olarak sakliyor ve
     cerez kaybolsa bile suresi bitene kadar oradan okuyor (kodBul).

     Ayni kaydi biz de yaziyoruz. NEDEN: ucuncu taraf cerezleri kapali
     bir tarayicida onizleme iframe'inde HICBIR cerez yazilamiyor ama
     localStorage calisiyor (olculdu). O durumda katman kodu bir
     sonraki sayfa yuklemesinde buradan goruyor.

     Ikinci bir indirim mantigi DEGIL: yazdigimiz sey cerezlerdekiyle
     birebir ayni bilgi (kod + bitis ani). Sure dolunca siliyoruz;
     katman da kendi basina suresi gecmis kaydi atiyor. */
  var AYNA = 'ttKod';
  function aynaYaz(bitis) {
    try { window.localStorage.setItem(AYNA, JSON.stringify({ k: V.kod, b: bitis })); }
    catch (e) {}
  }
  function aynaSil() {
    try { window.localStorage.removeItem(AYNA); } catch (e) {}
  }

  function cerezleriYaz() {
    var h = durumOku();
    var kalan = kalanMs();
    if (h.d !== 'kazandi' || kalan <= 0) return;
    var sn = Math.ceil(kalan / 1000);
    cerezYaz(V.cKod, V.kod, sn);
    cerezYaz(V.cSure, SURE_SN, sn);
    cerezYaz(V.cZaman, h.t, sn);
    aynaYaz(h.t + SURE_MS);
  }
  function cerezleriSil() {
    cerezSil(V.cKod);
    cerezSil(V.cSure);
    cerezSil(V.cZaman);
    aynaSil();
  }

  /* ---------- Sepet ----------
     Belgelenmis yol: POST /cart/update.js, gövdede { discount }.
     Sayfa yonlendirmesi yok; musteri hicbir sey kopyalamiyor. */
  var sonUygulama = 0;
  var kendiOlay = false;

  function kodUygula(duyurulsun) {
    if (Date.now() - sonUygulama < 3000) return Promise.resolve();
    sonUygulama = Date.now();
    return fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ discount: V.kod })
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function () {
        if (!duyurulsun) return;
        /* Cekmece ACILMIYOR: detail.open verilmiyor. Musteri carki
           cevirdi, sepete gitmek istedigini soylemedi. */
        kendiOlay = true;
        document.dispatchEvent(new CustomEvent('cart:refresh'));
        window.setTimeout(function () { kendiOlay = false; }, 500);
      })
      .catch(function () {});
  }

  /* Bos dize BUTUN kodlari siler. Musterinin elle girdigi baska bir
     kod varsa ona dokunmamak icin once sepet okunuyor ve yalnizca
     bizimki cikariliyor -- kalanlar geri yaziliyor. */
  function kodKaldir() {
    return fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) {
        if (!c) return null;
        var hepsi = (c.discount_applications || []).filter(function (d) {
          return d && d.type === 'discount_code' && d.title;
        });
        var bizim = hepsi.filter(function (d) {
          return String(d.title).toUpperCase() === String(V.kod).toUpperCase();
        });
        if (!bizim.length) return null;
        var kalanlar = hepsi
          .filter(function (d) { return String(d.title).toUpperCase() !== String(V.kod).toUpperCase(); })
          .map(function (d) { return d.title; });
        return fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ discount: kalanlar.join(',') })
        });
      })
      .catch(function () {});
  }

  /* ---------- Alttaki sabit bar ---------- */
  var bar = document.querySelector('[data-ttn-bar]');
  var barMetin = bar && bar.querySelector('[data-ttn-bar-metin]');
  var barSayac = bar && bar.querySelector('[data-ttn-bar-sayac]');

  /* Barla cakisan sabit ogeler (sohbet balonu, mobil dock) yukari
     kaydiriliyor. transform kullaniliyor, bottom degil: o ogelerin
     kendi bottom degerlerini bilmiyoruz ve bilmemiz de gerekmiyor. */
  function stilleriKur() {
    var parcalar = [];
    var sec = String(V.kaydirSecici || '').trim();
    if (sec) {
      parcalar.push('body.ttn-cark-bar-acik :is(' + sec + ')' +
        '{transform:translateY(calc(-1 * var(--ttn-cark-bar, 0px)));' +
        'transition:transform 200ms ease}');
    }
    /* Koleksiyon izgarasindaki serit ayni seyi soyluyor; ikisi birden
       gurultu. Ayardan kapatilabiliyor.

       KANCA "kod var", "bar gorunuyor" DEGIL: bar cekmece acilinca ya
       da yapiskan sepet cubugu ekrandayken kalkiyor; serit o anlarda
       geri gelseydi musteri ayni mesaji bir anda iki yerde gorurdu. */
    if (V.kolGizle) {
      parcalar.push('body.ttn-cark-kod .tt-kol{display:none !important}');
    }
    if (!parcalar.length) return;
    var st = document.createElement('style');
    st.setAttribute('data-ttn-cark-stil', '');
    st.textContent = parcalar.join('\n');
    document.head.appendChild(st);
  }

  function barOlc() {
    if (!bar || bar.hidden || bar.hasAttribute('data-ttn-ortulu')) return;
    document.body.style.setProperty('--ttn-cark-bar', bar.offsetHeight + 'px');
  }

  function barCiz() {
    if (!bar) return;
    var acik = gorunenDurum() === 'kazandi';
    bar.hidden = !acik;
    document.body.classList.toggle('ttn-cark-kod', acik);
    document.body.classList.toggle('ttn-cark-bar-acik', acik);
    if (!acik) {
      document.body.style.removeProperty('--ttn-cark-bar');
      return;
    }
    if (barMetin) {
      barMetin.textContent = String(V.barMetin || '').replace('[tutar]', V.tutarYazi || '');
    }
    barOlc();
  }

  /* ---------- Katman acikken bar kalkiyor ----------
     Yapiskan sepet cubugunda olculmus davranisin aynisi: temanin sepet
     cekmecesi z-35, bar z-55 -- bar "Odemeye gec" butonunu orterdi.
     Acik olmanin isareti tahmin edilmiyor, GORUNURLUK olculuyor;
     tema hangi niteligi cevirirse cevirsin sonuc ayni. */
  var ORTU_SEC = 'cart-drawer, #CartDrawer, [aria-modal="true"], dialog[open]';

  /* Ayardan gelen ekleme: ekranin altini BASKA bir cubuk tutuyorsa
     (koleksiyondaki yapiskan sepet cubugu gibi) bizim bar cekiliyor.
     Iki siyah serit ust uste binmesin diye: sayac zaten kupon kartinda
     duruyor, indirim de o cubugun kendi hesabinda gorunuyor.
     Ayari bosaltirsan bar her zaman cikar.

     AYRI DEGISKENDE TUTULUYOR, yukaridakine EKLENMIYOR: ayara gecersiz
     bir secici yazilirsa querySelectorAll atar ve tek dizede birlesmis
     olsalardi cekmece korumasi da birlikte duserdi -- odeme butonu yine
     ortulurdu. Ikisi ayri sorulunca kotu ayar yalnizca kendini bozar. */
  var ORTU_EK = String(V.gizleSecici || '').trim();

  function ortuGorunur(el) {
    if (!el || el === bar || (bar && bar.contains(el))) return false;
    if (el.hasAttribute('hidden')) return false;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var st = window.getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden';
  }
  function ortuSor(sec) {
    if (!sec) return false;
    var hepsi;
    try { hepsi = document.querySelectorAll(sec); }
    catch (e) { return false; }
    for (var i = 0; i < hepsi.length; i++) if (ortuGorunur(hepsi[i])) return true;
    return false;
  }
  function ortuVar() {
    return ortuSor(ORTU_SEC) || ortuSor(ORTU_EK);
  }
  function ortuBak() {
    if (!bar) return;
    var ortulu = ortuVar();
    if (ortulu === bar.hasAttribute('data-ttn-ortulu')) return;
    bar.toggleAttribute('data-ttn-ortulu', ortulu);
    document.body.classList.toggle('ttn-cark-bar-acik', !ortulu && gorunenDurum() === 'kazandi');
    if (!ortulu) barOlc();
  }
  var ortuBekler = false;
  function ortuPlanla() {
    if (ortuBekler) return;
    ortuBekler = true;
    window.requestAnimationFrame(function () { ortuBekler = false; ortuBak(); });
  }

  /* ---------- Sayac ----------
     Tek zamanlayici butun sayaclari yaziyor. Kalan sure her seferinde
     wonAt'ten hesaplaniyor: sekme arka planda beklese de, musteri
     baska sayfaya gitse de dogru kaliyor. */
  var tik = null;
  function mmss(ms) {
    var t = Math.max(0, Math.round(ms / 1000));
    var d = Math.floor(t / 60), s = t % 60;
    return d + ':' + (s < 10 ? '0' : '') + s;
  }
  function sayacYaz() {
    var kalan = kalanMs();
    var metin = mmss(kalan);
    if (barSayac) barSayac.textContent = metin;
    var kupSayac = document.querySelectorAll('[data-ttn-kupon-sayac]');
    for (var i = 0; i < kupSayac.length; i++) kupSayac[i].textContent = metin;
    return kalan;
  }
  function sayacBaslat() {
    sayacDurdur();
    if (gorunenDurum() !== 'kazandi') return;
    sayacYaz();
    tik = window.setInterval(function () {
      if (sayacYaz() <= 0) sureBitti();
    }, 1000);
  }
  function sayacDurdur() {
    if (tik) { window.clearInterval(tik); tik = null; }
  }

  /* ---------- Sure dolunca ----------
     Temizlik + BASA DONUS. Musteri carki yeniden gorup cevirebiliyor;
     karar magaza sahibinin (25.09.2026): "kampanya hicbir musteriye
     kapanmasin, 31. dakikada donen kisi de indirimi gorebilsin".

     Iki yerden cagriliyor:
       1. Sayac sifira inince (musteri sayfadayken)
       2. Acilista, kaydi suresi dolmus bulursak (musteri sekmeyi
          kapatip sonra donmus). Bu ikincisi olmasa kod SEPETTE ASILI
          kalirdi -- cerezler kendi kendine dusuyor ama sepetteki
          indirimi kaldiran tek yer burasi.

     Tek seferlik: kodKaldir() bir ag istegi, iki kez gitmesin. */
  var kapatildi = false;
  function sureBitti() {
    if (kapatildi) return;
    kapatildi = true;
    sayacDurdur();
    cerezleriSil();
    kodKaldir();
    durumSil();
    kartiSifirla();
    ciz();
  }

  /* Cevirme sirasinda karta birakilan izler geri aliniyor: dugme
     yeniden basilabilir olmali, kazanan dilim parlamamali ve cark
     baslangic acisina donmeli. Yoksa sure dolup kart geri gelince
     olu bir cark gorunurdu. */
  function kartiSifirla() {
    for (var i = 0; i < kokler.length; i++) {
      var k = kokler[i];
      k._ttnDonuyor = false;
      var btn = k.querySelector('[data-ttn-cevir]');
      if (btn) btn.disabled = false;
      var isaretli = k.querySelectorAll('[data-ttn-kazanan]');
      for (var j = 0; j < isaretli.length; j++) isaretli[j].removeAttribute('data-ttn-kazanan');
      var carkim = k.querySelector('[data-ttn-carkim]');
      if (carkim) {
        /* Gecisi kapatmadan sifirlarsak cark geri sarardi. */
        carkim.style.transition = 'none';
        carkim.style.transform = '';
        /* Bir sonraki cevirmede gecis yeniden kurulacak; burada
           yalnizca anlik sifirlama icin kapatildi. */
      }
    }
  }

  /* ---------- Bolum (kart) ---------- */
  var kokler = Array.prototype.slice.call(document.querySelectorAll('[data-ttn-cark]'));

  /* ---------- Disariya verilen sinyal ----------
     Kokteki data-ttn-kod, "su an gecerli bir cark kodu var" demek.
     Koleksiyondaki yapiskan cubuk bunu okuyup cark indirimini kendi
     hesabina katiyor.

     NEDEN AYRI BIR SINYAL: cubuk bunu once kupon katmaninin DOM'undan
     cikariyordu ([data-tt-kart-fb] gorunur mu). O katman cerezlerle
     besleniyor ve cerezleri baska bir uygulama da (Wheelio) yonetiyor;
     uzerine yazdiginda kart blogu kapaniyor ve cubuk kodu goremez
     oluyordu. Oysa kodu artik BIZ veriyoruz ve durumu BIZ tutuyoruz --
     dogru kaynak burasi. Cubuk eski yolu yedek olarak koruyor. */
  function sinyal() {
    var kok = document.documentElement;
    if (gorunenDurum() === 'kazandi') kok.setAttribute('data-ttn-kod', V.kod);
    else kok.removeAttribute('data-ttn-kod');
  }

  /* "bitti" ekranda ASLA cizilmiyor, basa donuyor.

     Normalde buraya hic dusulmuyor: sure dolunca sureBitti() kaydi
     siliyor ve durum zaten "yok" oluyor. Bu satir emniyet kemeri --
     temizlik herhangi bir sebeple gec kalirsa (acilista ilk cizimden
     onceki an, depolama yazilamamis olmasi) kart YOK OLMAK yerine
     basa donmus gorunuyor. Kaybolmak en kotu basarisizlik bicimi:
     musteri kampanyayi hic gormezdi. */
  function cizimDurumu() {
    var d = gorunenDurum();
    return d === 'bitti' ? 'yok' : d;
  }

  function ciz() {
    var d = cizimDurumu();
    sinyal();
    for (var i = 0; i < kokler.length; i++) {
      var k = kokler[i];
      k.setAttribute('data-ttn-durum', d);
      if (d !== 'yok' && d !== 'red') k.removeAttribute('data-ttn-acik');
      var bas = k.querySelector('[data-ttn-kupon-baslik]');
      var kod = k.querySelector('[data-ttn-kupon-kod]');
      if (bas) {
        var M = metin(k);
        bas.textContent = String(M.kuponBaslik || '').replace('[tutar]', V.tutarYazi || '');
      }
      if (kod) kod.textContent = V.kod;
    }
    barCiz();
  }

  function metin(k) {
    if (k._ttnM) return k._ttnM;
    var m = {};
    try { m = JSON.parse(k.getAttribute('data-ttn-metin') || '{}'); } catch (e) { m = {}; }
    k._ttnM = m;
    return m;
  }

  function duyur(k, s) {
    var el = k.querySelector('[data-ttn-duyuru]');
    if (el) el.textContent = s || '';
  }

  function ac(k) {
    if (gorunenDurum() === 'kazandi') return;
    k.setAttribute('data-ttn-acik', '');
    var kom = k.querySelector('[data-ttn-kompakt]');
    if (kom) kom.setAttribute('aria-expanded', 'true');
    var btn = k.querySelector('[data-ttn-cevir]');
    if (btn) btn.focus({ preventScroll: true });
  }
  function kapat(k, reddetti) {
    k.removeAttribute('data-ttn-acik');
    var kom = k.querySelector('[data-ttn-kompakt]');
    if (kom) kom.setAttribute('aria-expanded', 'false');
    if (reddetti) {
      /* "Istemiyorum" carki KAPATMIYOR, yalnizca bir daha
         kendiliginden acilmamasini isaretliyor: fikrini degistiren
         musteri karta dokunup yeniden acabiliyor. */
      durumYaz('red', 0);
    }
  }

  /* ---------- Cevirme ----------
     Sonuc her zaman tema ayarindaki tutar. Hangi 500 diliminde
     duracagi rastgele ve dilimin ortasindan +-12 derece sapiyor;
     dilim yarim genisligi 22.5 derece, yani sapma dilimden hic
     tasmiyor ama donus her seferinde farkli yerde bitiyor. */
  function cevir(k) {
    if (k._ttnDonuyor) return;
    if (gorunenDurum() === 'kazandi') return;
    k._ttnDonuyor = true;

    var carkim = k.querySelector('[data-ttn-carkim]');
    var btn = k.querySelector('[data-ttn-cevir]');
    if (btn) btn.disabled = true;

    var adaylar = (k.getAttribute('data-ttn-kazananlar') || '')
      .split(',')
      .map(function (x) { return parseInt(x, 10); })
      .filter(function (x) { return isFinite(x); });
    if (!adaylar.length) adaylar = [0];

    var i = adaylar[Math.floor(Math.random() * adaylar.length)];
    var sapma = (Math.random() * 24) - 12;
    var aci = 360 * 6 - (i * 45 + 22.5) + sapma;

    function bitir() {
      k._ttnDonuyor = false;
      isaretle(k, i);
      try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
      if (!AZ_HAREKET) konfeti(k);
      kazandi(k);
    }

    if (!carkim || AZ_HAREKET) {
      if (carkim) carkim.style.transform = 'rotate(' + aci + 'deg)';
      bitir();
      return;
    }

    carkim.style.transition = 'transform 4200ms cubic-bezier(.12,.85,.18,1)';
    carkim.style.transform = 'rotate(' + aci + 'deg)';
    var bitti = false;
    function bir() {
      if (bitti) return;
      bitti = true;
      carkim.removeEventListener('transitionend', bir);
      bitir();
    }
    carkim.addEventListener('transitionend', bir);
    /* transitionend gelmezse (sekme arka plana alinirsa olabiliyor)
       kazanci yine de veriyoruz -- musteri cevirdi. */
    window.setTimeout(bir, 4600);
  }

  /* Vurgu BUYUK carka: bolumde iki cark var (kompakt karttaki mini ve
     acilan alandaki buyuk) ve ikisi de ayni data-ttn-dilim
     numaralarini tasiyor. Kok uzerinden aranirsa mini olan bulunuyor
     ve kazanan dilim yanlis yerde parliyordu. */
  function isaretle(k, i) {
    var carkim = k.querySelector('[data-ttn-carkim]');
    if (!carkim) return;
    var dilim = carkim.querySelector('[data-ttn-dilim="' + i + '"]');
    var yazi = carkim.querySelector('[data-ttn-yazi="' + i + '"]');
    if (dilim) dilim.setAttribute('data-ttn-kazanan', '');
    if (yazi) yazi.setAttribute('data-ttn-kazanan', '');
  }

  function kazandi(k) {
    var simdi = Date.now();
    /* Yeni kupon: bir sonraki sure dolumu yine kapatilabilsin. */
    kapatildi = false;
    durumYaz('kazandi', simdi);
    cerezleriYaz();
    kodUygula(true);
    duyur(k, String(V.duyuruKazandi || '').replace('[tutar]', V.tutarYazi || ''));
    /* Kupon kartina gecis: konfeti gorunsun diye kisa bir bekleme.
       Az-hareket modunda beklemeden geciliyor. */
    window.setTimeout(function () {
      ciz();
      sayacBaslat();
    }, AZ_HAREKET ? 0 : 1100);
  }

  /* ---------- Konfeti ----------
     Kutuphane yok: 40 parcacik, tek bir rAF dongusu, ~1,2 saniye.
     Bittiginde tuval temizlenip dongu duruyor. */
  function konfeti(k) {
    var tuval = k.querySelector('[data-ttn-konfeti]');
    if (!tuval || !tuval.getContext) return;
    var ctx = tuval.getContext('2d');
    var o = window.devicePixelRatio || 1;
    var g = tuval.clientWidth, y = tuval.clientHeight;
    if (!g || !y) return;
    tuval.width = g * o;
    tuval.height = y * o;
    ctx.scale(o, o);

    var renkler = ['#78F5AB', '#1F4648', '#5CC98F', '#D3DDD2'];
    var p = [];
    for (var i = 0; i < 40; i++) {
      p.push({
        x: g / 2,
        y: y / 2,
        vx: (Math.random() - 0.5) * 9,
        vy: (Math.random() - 1) * 7,
        e: 3 + Math.random() * 4,
        a: Math.random() * Math.PI,
        va: (Math.random() - 0.5) * 0.4,
        r: renkler[i % renkler.length]
      });
    }
    var bas = 0;
    function kare(t) {
      if (!bas) bas = t;
      var gecen = t - bas;
      ctx.clearRect(0, 0, g, y);
      for (var j = 0; j < p.length; j++) {
        var q = p[j];
        q.vy += 0.28;
        q.x += q.vx;
        q.y += q.vy;
        q.a += q.va;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - gecen / 1200);
        ctx.translate(q.x, q.y);
        ctx.rotate(q.a);
        ctx.fillStyle = q.r;
        ctx.fillRect(-q.e / 2, -q.e / 2, q.e, q.e * 1.6);
        ctx.restore();
      }
      if (gecen < 1200) window.requestAnimationFrame(kare);
      else ctx.clearRect(0, 0, g, y);
    }
    window.requestAnimationFrame(kare);
  }

  /* ---------- Baglantilar ---------- */
  kokler.forEach(function (k) {
    var kom = k.querySelector('[data-ttn-kompakt]');
    if (kom) {
      kom.addEventListener('click', function () { ac(k); });
      kom.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); ac(k); }
      });
    }
    var kapatBtn = k.querySelector('[data-ttn-kapat]');
    if (kapatBtn) kapatBtn.addEventListener('click', function () { kapat(k, true); });
    var cevirBtn = k.querySelector('[data-ttn-cevir]');
    if (cevirBtn) cevirBtn.addEventListener('click', function () { cevir(k); });
  });

  /* Sepet her degistiginde kod yeniden uygulaniyor. Sebep: bos sepete
     yazilan indirimin korunacagi garanti degil; urun eklendikten sonra
     tekrar yazmak ucuz ve kesin. Kendi tetikledigimiz olay ve uc
     saniyelik pencere ile donguye girmesi engelleniyor. */
  document.addEventListener('cart:refresh', function () {
    if (kendiOlay) return;
    if (gorunenDurum() !== 'kazandi') return;
    kodUygula(false);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { sayacDurdur(); return; }
    /* Arka planda gecen sure icin: donunce once cizim tazeleniyor. */
    ciz();
    cerezleriYaz();
    sayacBaslat();
  });

  if (window.MutationObserver) {
    new MutationObserver(ortuPlanla).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'open', 'class', 'style', 'aria-modal', 'aria-expanded']
    });
  }
  window.addEventListener('resize', barOlc);

  /* ---------- Reklam trafigi: ?cark=1 ----------
     Otomatik ACILMIYOR. Yalnizca karta yumusakca kaydiriliyor ve mini
     cark bir kez belirgin donuyor -- davet, dayatma degil. */
  function reklam() {
    var p;
    try { p = new URLSearchParams(window.location.search).get('cark'); }
    catch (e) { return; }
    if (p !== '1') return;
    if (gorunenDurum() !== 'yok') return;
    var k = kokler[0];
    if (!k) return;
    window.setTimeout(function () {
      try { k.scrollIntoView({ behavior: AZ_HAREKET ? 'auto' : 'smooth', block: 'center' }); }
      catch (e) { k.scrollIntoView(); }
      k.setAttribute('data-ttn-selam', '');
      window.setTimeout(function () { k.removeAttribute('data-ttn-selam'); }, 1500);
    }, 250);
  }

  /* ---------- Acilis ---------- */
  stilleriKur();

  /* SURESI DOLMUS KUPONU ILK CIZIMDEN ONCE KAPAT.
     Musteri sekmeyi kapatip 30 dakikadan sonra donduyse kayit hala
     "kazandi" yaziyor ama suresi gecmis. Temizligi burada yapmazsak
     kod SEPETTE asili kalirdi. Cizimden ONCE cagriliyor ki kart bir
     an gizlenip sonra geri gelmesin -- yerlesim ziplamiyor. */
  if (durumOku().d === 'kazandi' && kalanMs() <= 0) sureBitti();

  ciz();
  ortuBak();
  if (gorunenDurum() === 'kazandi') {
    /* Yeni sekme/oturumda cerezler silinmis olabilir; katman yeniden
       beslensin. Kod da sepette olmayabilir (musteri sepeti bosaltmis
       olabilir), o yuzden bir kez daha uygulaniyor. */
    cerezleriYaz();
    kodUygula(false);
    sayacBaslat();
  }
  reklam();
})();
