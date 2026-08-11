/* ANA-SCRIPT-IMZA-7Q4 */
(function () {
  if (window.__ttTkKurulu) return;
  window.__ttTkKurulu = true;


  /* Ayarlar satir ici <script> adasinda degil, dogrudan <dialog>
     uzerindeki data-tt-tk-veri ozniteliginde. Sebep: sayfadaki bir
     eklenti satir ici script etiketlerini etkisizlestiriyor; oznitelik
     hicbir zaman dokunulmuyor. */
  function veri() {
    var el = document.querySelector('[data-tt-tk-veri]');
    if (!el) return null;
    try { return JSON.parse(el.getAttribute('data-tt-tk-veri')); } catch (e) { return null; }
  }

  /* Emniyet: bolum tek kez ciziliyor ama tema bir sekilde kopyalarsa
     diye paneli body'ye tasiyip fazlalari siliyoruz. Body altindaki
     kopya hicbir gizli kapsayicinin icinde kalmaz. */
  /* Kartlar her sayfada var; yapilandirma layout'tan gelen global
     dugumde. Taksit bolumu olan sayfalarda o da yeterli. */
  function kartVeri() {
    var el = document.querySelector('[data-tt-kart-veri]');
    if (el) {
      try { return JSON.parse(el.getAttribute('data-tt-kart-veri')); } catch (e) {}
    }
    return veri();
  }

  function panelBul() {
    var hepsi = document.querySelectorAll('dialog[data-tt-tk]');
    if (!hepsi.length) return null;
    var sec = document.querySelector('body > dialog[data-tt-tk]');
    if (!sec) { sec = hepsi[0]; document.body.appendChild(sec); }
    for (var i = 0; i < hepsi.length; i++) {
      if (hepsi[i] !== sec && hepsi[i].parentNode) hepsi[i].parentNode.removeChild(hepsi[i]);
    }
    return sec;
  }

  function seciliKurus(V) {
    var id = new URLSearchParams(location.search).get('variant');
    if (id && V.varyantlar && V.varyantlar[id] != null) return V.varyantlar[id];
    return V.varsayilan;
  }

  function kacis(m) {
    return String(m == null ? '' : m)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* PayTR tutarlari Turkce bicimde doner: "2.873,41".
     Virgul varsa noktalar binlik ayracidir; virgul yoksa nokta ondalik
     kabul edilir (bicim degisirse yanlis okumayalim diye). */
  function sayi(m) {
    if (m == null) return NaN;
    var t = String(m).replace(/[^\d.,]/g, '');
    if (!t) return NaN;
    if (t.indexOf(',') !== -1) t = t.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(t);
    return isNaN(n) ? NaN : n;
  }

  /* Logo adresleri PayTR'nin HTML'inden geliyor ve goreli olabilir.
     O HTML about:blank bir iframe'de duruyor, yani goreli adres orada
     cozulemiyor; oldugu gibi kopyalarsak urun sayfasina gore cozulur ve
     kirik cikar. PayTR adresine gore mutlaklastiriyoruz. */
  function logoAdres(V, ham) {
    if (!ham) return null;
    if (/^(https?:)?\/\//i.test(ham) || /^data:/i.test(ham)) return ham;
    try { return new URL(ham, V.kaynak).href; } catch (e) { return ham; }
  }

  function bicimSade(tutar) {
    return Number(tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function bicim(V, tutar) {
    return bicimSade(tutar) + ' ' + (V.paraBirim || 'TL');
  }

  /* Bant etiketinde "500,00 TL" degil "500 TL" yazsin: tam sayiysa
     kurus gosterilmiyor. Dar ekranda basligi tek satirda tutuyor. */
  function bicimKisa(V, tutar) {
    var n = Number(tutar);
    var tam = Math.abs(n - Math.round(n)) < 0.005;
    var g = n.toLocaleString('tr-TR', tam
      ? { maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return g + ' ' + (V.paraBirim || 'TL');
  }

  /* ---------------------------------------------------------------
     INDIRIM KATMANI - kaynak COOKIE, DOM degil.
     Cark uygulamasi kodu su uc cookie'ye yaziyor:
       wlo-codebar-code    -> indirim kodu
       wlo-codebar-counter -> gecerlilik suresi, saniye
       wlo-codebar-time    -> kodun alindigi an, ms
     Boylece kod cubugu ekranda olmasa da, uygulamanin script'i hic
     yuklenmese de katman calisiyor.

     Uc durum:
       A  kod var + suresi dolmamis + ayardaki tutar > 0
          -> yesil bant, satirlar indirimli, ustu cizili eski tutar
       B  kod var + tutar ayari bos/0
          -> gri bant, satirlar INDIRIMSIZ. Yanlis rakam gostermektense
             rakamsiz bilgi veriyoruz.
       C  uc cookie'den biri bile okunamiyor ya da sure dolmus
          -> hicbir bant yok, panel indirimsiz haliyle calisir.
     Varsayilan tutar diye bir sey YOK; tutar yalnizca ayardan gelir.
  --------------------------------------------------------------- */
  function cerez(ad) {
    if (!ad) return '';
    var hepsi = String(document.cookie || '').split(';');
    for (var i = 0; i < hepsi.length; i++) {
      var c = hepsi[i].trim();
      var esit = c.indexOf('=');
      if (esit < 0) continue;
      if (c.slice(0, esit) !== ad) continue;
      try { return decodeURIComponent(c.slice(esit + 1)); }
      catch (e) { return c.slice(esit + 1); }
    }
    return '';
  }

  /* Kod cubugu kapatilinca uygulama cerezleri siliyor. Musteri kodu
     kazandi ve suresi hala doluyor; bir bandi kapatmak kodu iptal
     etmemeli. Bu yuzden gecerli kodu ilk gordugumuzde saklayip cerez
     kaybolsa da suresi bitene kadar kullaniyoruz. */
  var KOD_ANAHTAR = 'ttKod';
  function kodSakla(kod, bitis) {
    try { localStorage.setItem(KOD_ANAHTAR, JSON.stringify({ k: kod, b: bitis })); } catch (e) {}
  }
  function kodOku() {
    try {
      var v = JSON.parse(localStorage.getItem(KOD_ANAHTAR) || 'null');
      if (v && v.k && v.b > Date.now()) return v;
      if (v) localStorage.removeItem(KOD_ANAHTAR);
    } catch (e) {}
    return null;
  }

  /* Gecerli kodu bulur. Urun fiyatindan bagimsiz oldugu icin koleksiyon
     sayfasi da bunu kullaniyor -- ikinci bir cerez mantigi yok. */
  function kodBul(V) {
    if (!V.indirimAktif) return null;
    var kod   = cerez(V.cKod);
    var sure  = parseFloat(cerez(V.cSure));
    var basla = parseFloat(cerez(V.cZaman));
    var bitis = 0;
    if (kod && isFinite(sure) && isFinite(basla)) {
      bitis = basla + sure * 1000;
      if (bitis > Date.now()) kodSakla(kod, bitis);
    }
    if (!(bitis > Date.now())) {
      var y = kodOku();
      if (!y) return null;
      kod = y.k; bitis = y.b;
    }
    return { kod: kod, bitis: bitis };
  }

  function indirimBul(V, tamKurus) {
    if (!V.indirimAktif) return null;

    var g = kodBul(V);
    if (!g) return null;                                             // Durum C
    var kod = g.kod, bitis = g.bitis;

    var tutar = parseFloat(String(V.indTutar == null ? '' : V.indTutar).replace(',', '.'));
    var indKurus = isFinite(tutar) ? Math.round(tutar * 100) : 0;

    /* Tutar yok, sifir ya da urun fiyatini asiyor: indirimli rakam
       hesaplayamayiz. Kodu yine de duyuruyoruz ama rakamlara
       dokunmuyoruz -> Durum B. */
    if (!(indKurus > 0) || indKurus >= tamKurus) {
      return { durum: 'B', kod: kod, bitis: bitis, indKurus: 0, netKurus: tamKurus };
    }
    return { durum: 'A', kod: kod, bitis: bitis, indKurus: indKurus, netKurus: tamKurus - indKurus };
  }

  /* Geri sayim yalnizca panel acikken ve sekme ondeyken calisir.
     Sure bitince sessizce Durum C'ye donuyoruz -- "kodunuzun suresi
     doldu" gibi bir uyari yok, sayfa yenilemeye de gerek yok. */
  var sayacZ = null, sonBitis = null;
  function sayaciDurdur() {
    if (sayacZ) { window.clearInterval(sayacZ); sayacZ = null; }
  }
  function sayaciYaz(el, bitis) {
    var kalan = Math.max(0, bitis - Date.now());
    var dk = Math.floor(kalan / 60000);
    var sn = Math.floor((kalan % 60000) / 1000);
    el.textContent = dk + ':' + (sn < 10 ? '0' : '') + sn;
    return kalan;
  }
  /* Ayni geri sayim hem modalde hem urun sayfasi fiyat serideinde
     kullaniliyor; tek zamanlayici butun sayac ogelerini guncelliyor. */
  function sayaciTik(bitis) {
    var el = document.querySelectorAll('[data-tt-tk-sayac]');
    if (!el.length) return -1;
    var kalan = 0;
    for (var i = 0; i < el.length; i++) kalan = sayaciYaz(el[i], bitis);
    return kalan;
  }
  function sayaciBaslat(bitis) {
    sayaciDurdur();
    sonBitis = bitis;
    var kalan = sayaciTik(bitis);
    /* -1 "gosterilecek sayac yok", 0 "sure doldu" demek. Ikisini ayni
       saymak sonsuz donguye yol aciyordu: sayac ogesi yokken sureBitti()
       cagriliyor, o da fbCiz() ile sayaci yeniden baslatiyordu. */
    if (kalan < 0) return;
    if (kalan === 0) { sureBitti(); return; }
    sayacZ = window.setInterval(function () {
      var k = sayaciTik(bitis);
      if (k < 0) { sayaciDurdur(); return; }
      if (k === 0) sureBitti();
    }, 1000);
  }
  document.addEventListener('visibilitychange', function () {
    if (!sonBitis) return;
    if (document.hidden) { sayaciDurdur(); return; }
    if (document.querySelector('[data-tt-tk-sayac]')) sayaciBaslat(sonBitis);
  });

  /* Tetikleyiciyi METNINDEN taniyoruz. Shopify'in "text" ayari <a>
     etiketinde data-* / aria-* ozniteliklerini siliyor, href'i de
     tema cizim aninda degistirebiliyor. Metin ise magaza sahibinin
     yazdigi sey ve oldugu gibi kaliyor. */
  function tetikMi(a, V) {
    if (!a || a.tagName !== 'A') return false;
    if (a.hasAttribute('data-tt-tk-ac')) return true;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('taksit-tablosu') !== -1) return true;
    var m = (a.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return !!(V && V.metin && m === V.metin);
  }

  var yuklendi = null, yuklenenAnahtar = null;
  var sonIstek = null, sonHamAdet = null;   // teshis kutusu icin

  function durum(metin) {
    var p = panelBul();
    var g = p && p.querySelector('[data-tt-tk-govde]');
    if (!g) return;
    g.innerHTML = '';
    var el = document.createElement('p');
    el.className = 'tt-tk-durum';
    el.textContent = metin;
    g.appendChild(el);
  }

  /* PayTR script'i AYRI BIR IFRAME icinde calisiyor: document.write
     kullanan gomme script'ler sayfa yuklendikten sonra calisirsa butun
     belgeyi siler. Iframe about:blank oldugu icin ayni kaynakta,
     DOM'unu okuyabiliyoruz. */
  function getir(V, kurus, bitti, hata) {
    var cerceve = document.createElement('iframe');
    cerceve.setAttribute('aria-hidden', 'true');
    cerceve.setAttribute('tabindex', '-1');
    cerceve.style.cssText = 'position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(cerceve);

    var temizle = function () { if (cerceve.parentNode) cerceve.parentNode.removeChild(cerceve); };
    var zamanasimi = window.setTimeout(function () { temizle(); hata('hata'); }, 12000);

    /* PayTR'ye "taksit=0" yani BUTUN taksitler soruluyor, sinir burada
       degil "en cok taksit" ayariyla asagida uygulaniyor. Sebep: adrese
       taksit=3 yazildiginda PayTR yalnizca 3 taksitlik satiri donduruyor,
       "3'e kadar" diye anlamiyor; 2 taksit satiri bu yuzden hic gelmiyordu. */
    var adres = V.kaynak.replace('{TUTAR}', (kurus / 100).toFixed(2));
    sonIstek = adres;

    var d = cerceve.contentDocument;
    d.open();
    d.write('<!doctype html><html><head><meta charset="utf-8"></head><body>' +
            '<div id="paytr_taksit_tablosu"></div>' +
            '<scr' + 'ipt src="' + adres.replace(/"/g, '&quot;') + '"><\/scr' + 'ipt>' +
            '</body></html>');
    d.close();

    var deneme = 0;
    (function bekle() {
      deneme++;
      var kutular = null;
      try { kutular = cerceve.contentDocument.querySelectorAll('.taksit-tablosu-wrapper'); } catch (e) {}
      if (kutular && kutular.length) {
        window.clearTimeout(zamanasimi);
        var sonuc = ayristir(V, cerceve.contentDocument);
        temizle();
        if (sonuc && sonuc.satirlar.length) bitti(sonuc);
        else hata(sonuc ? 'yok' : 'hata');
        return;
      }
      if (deneme > 120) { window.clearTimeout(zamanasimi); temizle(); hata('hata'); return; }
      window.setTimeout(bekle, 100);
    })();
  }

  function ayristir(V, d) {
    var kutular = d.querySelectorAll('.taksit-tablosu-wrapper');
    if (!kutular.length) return null;
    var aileler = [], ham = [];
    for (var i = 0; i < kutular.length; i++) {
      var k = kutular[i];
      var img = k.querySelector('.taksit-logo img');
      var satirlar = [];
      var rows = k.querySelectorAll('.taksit-tutar-wrapper');
      for (var j = 0; j < rows.length; j++) {
        var hucre = rows[j].querySelectorAll('.taksit-tutari');
        if (hucre.length < 2) continue;
        var sol = (hucre[0].textContent || '').replace(/\s+/g, ' ').trim();
        var sag = (hucre[1].textContent || '').replace(/\s+/g, ' ').trim();
        var m = sol.match(/(\d+)\s*[xX]\s*([\d.,]+)/);
        if (!m) continue;
        var adet = parseInt(m[1], 10);
        if (ham.indexOf(adet) === -1) ham.push(adet);          // PayTR ne gonderdi (kirpmadan once)
        if (V.enCokTaksit && adet > V.enCokTaksit) continue;   // emniyet kemeri
        satirlar.push({ adet: adet, aylik: sayi(m[2]), toplam: sayi(sag) });
      }
      if (!satirlar.length) continue;
      satirlar.sort(function (a, b) { return a.adet - b.adet; });
      aileler.push({ logo: img ? logoAdres(V, img.getAttribute('src')) : null, satirlar: satirlar });
    }
    ham.sort(function (x, y) { return x - y; });
    sonHamAdet = ham;
    if (!aileler.length) return null;
    var imza = function (a) {
      return a.satirlar.map(function (x) { return x.adet + '|' + x.aylik + '|' + x.toplam; }).join(';');
    };
    var ilk = imza(aileler[0]);
    return {
      hepsiAyni: aileler.every(function (a) { return imza(a) === ilk; }),
      satirlar: aileler[0].satirlar,
      aileler: aileler,
      logolar: aileler.map(function (a) { return a.logo; }).filter(Boolean)
    };
  }

  /* ---------------------------------------------------------------
     CIZIM - referans tasarim: grupli liste, hairline ayraclar,
     tabular rakamlar, tek renkli vurgu (vade farksiz rozeti).
     Tablo + buyuk harf sutun basligi yok; "TAKSIT/TAKSIT" sorunu
     bu yuzden kaynagindan kalkiyor.
  --------------------------------------------------------------- */

  function satirCiz(V, etiket, aylik, toplam, fiyat, eskiAylik) {
    var fark = toplam - fiyat;
    var vadeYok = !(fark > 0.005);

    var sol = '<div><div class="tt-tk-etiket">' + kacis(etiket) + '</div>';
    if (vadeYok) {
      sol += '<div class="tt-tk-alt">' + kacis(V.vadeYok) + '</div>';
    } else {
      var kalip = V.vadeFark || '+{TUTAR}';
      sol += '<div class="tt-tk-alt">' + kacis(kalip.replace('{TUTAR}', bicim(V, fark))) + '</div>';
    }
    sol += '</div>';

    var ust = '<div class="tt-tk-tutar-satir">';
    if (eskiAylik != null && eskiAylik > aylik + 0.005) {
      ust += '<span class="tt-tk-eski">' + kacis(bicimSade(eskiAylik)) + '</span>';
    }
    ust += '<span class="tt-tk-tutar">' + kacis(bicim(V, aylik)) + '</span></div>';

    var sag = '<div class="tt-tk-sag">' + ust +
              '<div class="tt-tk-toplam">' + kacis(V.toplamOn) + ' ' + kacis(bicim(V, toplam)) + '</div>' +
              '</div>';

    return '<div class="tt-tk-satir">' + sol + sag + '</div>';
  }

  /* Bir kart ailesinin satirlarindan grup kutusunu uretir.
     Ilk satir her zaman tek cekim: PayTR "1 x ..." donduruyorsa o
     kullanilir, dondurmuyorsa urun fiyatindan uretilir (vade farki
     yok, tutar = fiyat). Boylece iki durumda da dogru cikar.
     "eski" verilirse her satirda indirim oncesi tutar ustu cizili. */
  function grupCiz(V, satirlar, fiyat, eski) {
    var h = '';
    var tek = null, taksitler = [];
    for (var i = 0; i < satirlar.length; i++) {
      if (satirlar[i].adet === 1) tek = satirlar[i];
      else taksitler.push(satirlar[i]);
    }
    var e = function (adet) { return eski && eski[adet] != null ? eski[adet] : null; };

    if (tek) h += satirCiz(V, V.tekCekim, tek.aylik, tek.toplam, fiyat, e(1));
    else h += satirCiz(V, V.tekCekim, fiyat, fiyat, fiyat, e(1));

    for (var j = 0; j < taksitler.length; j++) {
      var t = taksitler[j];
      h += satirCiz(V, t.adet + ' ' + (V.taksitEk || ''), t.aylik, t.toplam, fiyat, e(t.adet));
    }
    return '<div class="tt-tk-grup">' + h + '</div>';
  }

  /* Indirim oncesi aylik tutarlar. Aileler farkli oran veriyorsa tek
     bir "eski" tutar dogru olmaz, o durumda ustu cizili satir hic
     gosterilmiyor. */
  function eskiHarita(paket, tamKurus) {
    if (!paket.tam || !paket.tam.hepsiAyni || !paket.net.hepsiAyni) return null;
    var h = { 1: tamKurus / 100 };
    var sat = paket.tam.satirlar;
    for (var i = 0; i < sat.length; i++) h[sat[i].adet] = sat[i].aylik;
    return h;
  }

  function indirimBandi(V, ind) {
    if (!ind) return '';
    var kazanc = ind.durum === 'A';

    var etiket = kazanc
      ? String(V.indEtiket || '').replace('{TUTAR}', bicimKisa(V, ind.indKurus / 100))
      : String(V.indBEtiket || '');

    /* Durum B'de once "asagidaki tutarlar indirim oncesi" uyarisi,
       sonra geri sayim cumlesi. */
    var kalip = kazanc
      ? String(V.indSayacMetni || '')
      : ((V.indBNot ? V.indBNot + ' ' : '') + String(V.indSayacMetni || ''));

    var h = '<div class="tt-tk-indirim ' + (kazanc ? 'tt-tk-ind-kazanc' : 'tt-tk-ind-bilgi') + '">' +
            '<div class="tt-tk-ind-ust"><span class="tt-tk-ind-etiket">' + kacis(etiket) + '</span>';
    if (ind.kod) h += '<span class="tt-tk-ind-kod">' + kacis(ind.kod) + '</span>';
    h += '</div>';

    if (kalip) {
      var par = kalip.split('{SURE}');
      h += '<p class="tt-tk-ind-not">' + kacis(par[0]) +
           '<span class="tt-tk-sayac" data-tt-tk-sayac></span>' +
           kacis(par.length > 1 ? par[1] : '') + '</p>';
    }
    return h + '</div>';
  }

  /* Maddeli not listesi. Indirime ozgu madde yalnizca Durum A'da
     ekleniyor; Durum B'de tutar bilinmedigi icin bant zaten "sepette
     uygulanacak" diyor, listede tekrar etmiyoruz. */
  function listeCiz(V, ind) {
    var sat = String(V.maddeler || '').split(/\r?\n/);
    var madde = [];
    for (var i = 0; i < sat.length; i++) {
      var t = sat[i].trim();
      if (t) madde.push(t);
    }
    if (ind && ind.durum === 'A' && V.indNot) madde.push(V.indNot);
    if (!madde.length) return '';

    var tik = '<svg class="tt-tk-tik" viewBox="0 0 16 16" aria-hidden="true">' +
              '<path d="M3 8.5l3.2 3.2L13 5"/></svg>';
    var h = '<ul class="tt-tk-liste">';
    for (var j = 0; j < madde.length; j++) {
      h += '<li>' + tik + '<span>' + kacis(madde[j]) + '</span></li>';
    }
    return h + '</ul>';
  }

  function ciz(V, paket, kurus, ind, tamKurus) {
    var p = panelBul();
    var g = p && p.querySelector('[data-tt-tk-govde]');
    if (!g) return;
    var s = paket.net;
    var fiyat = kurus / 100;
    /* Ustu cizili eski tutar yalnizca Durum A'da anlamli. */
    var eski = (ind && ind.durum === 'A') ? eskiHarita(paket, tamKurus) : null;
    var h = indirimBandi(V, ind);

    if (s.hepsiAyni) {
      h += grupCiz(V, s.satirlar, fiyat, eski);
    } else {
      for (var i = 0; i < s.aileler.length; i++) {
        h += '<div class="tt-tk-bolum">';
        if (s.aileler[i].logo) {
          h += '<div class="tt-tk-aile"><img src="' + kacis(s.aileler[i].logo) + '" alt="" loading="lazy"></div>';
        }
        h += grupCiz(V, s.aileler[i].satirlar, fiyat, null) + '</div>';
      }
    }

    h += listeCiz(V, ind);

    var kart = '';
    if (s.hepsiAyni && s.logolar.length) {
      kart += '<p class="tt-tk-kartlar-baslik">' + kacis(V.logoNot || '') + '</p><div class="tt-tk-logolar">';
      for (var k = 0; k < s.logolar.length; k++) {
        kart += '<img src="' + kacis(s.logolar[k]) + '" alt="" loading="lazy">';
      }
      kart += '</div>';
    }
    if (V.kartNot) {
      kart += '<p class="tt-tk-uyari">' + kacis(V.kartNot) + '</p>';
    }
    if (kart) h += '<div class="tt-tk-kartlar">' + kart + '</div>';

    g.innerHTML = h;
    if (ind) sayaciBaslat(ind.bitis); else { sayaciDurdur(); sonBitis = null; }
  }

  function hashTemizle() {
    if (location.hash !== '#taksit-tablosu') return;
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }

  /* Durum A'da PayTR'ye iki soru soruluyor: indirimli tutar (gosterilen
     rakamlar) ve indirimsiz tutar (ustu cizili rakamlar). Ikincisi
     gelmezse panel yine aciliyor, yalnizca ustu cizili tutarlar cikmiyor. */
  function getirIkili(V, netKurus, tamKurus, bitti, hata) {
    getir(V, netKurus, function (net) {
      if (!tamKurus || tamKurus === netKurus) { bitti({ net: net, tam: null }); return; }
      getir(V, tamKurus, function (tam) { bitti({ net: net, tam: tam }); },
                         function () { bitti({ net: net, tam: null }); });
    }, hata);
  }

  function basligiYaz(V, tamKurus) {
    var panel = panelBul();
    var f = panel && panel.querySelector('[data-tt-tk-fiyat]');
    if (!f) return;
    f.innerHTML = kacis(V.fiyatOnEk || '') + ' <b>' + kacis(bicim(V, tamKurus / 100)) + '</b>';
  }

  /* Sure dolunca: bant kalkar, satirlar indirimsiz tutara doner.
     Durum A'da indirimsiz tablo zaten yuklenmisti, aginca yeniden
     istek atmiyoruz. */
  var son = null, bitisIsleniyor = false;
  function sureBitti() {
    if (bitisIsleniyor) return;                // tekrar girisi engelle
    bitisIsleniyor = true;
    try { sureBittiIc(); } finally { bitisIsleniyor = false; }
  }
  function sureBittiIc() {
    sayaciDurdur();
    sonBitis = null;
    fbCiz();                                   // fiyat blogu: serit kalkar, tutar indirimsize doner
    kolCiz();                                  // koleksiyon: serit kalkar, kart bloklari gizlenir
    var V = veri(), p = panelBul();
    if (!V || !p || !p.open || !son) return;
    if (son.durum === 'B') { ciz(V, son.paket, son.tam, null, son.tam); return; }
    if (son.paket && son.paket.tam) {
      yuklendi = { net: son.paket.tam, tam: null };
      yuklenenAnahtar = son.tam + '|' + son.tam;
      son = { durum: null, paket: yuklendi, tam: son.tam };
      ciz(V, yuklendi, son.tam, null, son.tam);
      return;
    }
    yuklendi = null; yuklenenAnahtar = null; son = null;
    ac(null);
  }

  function ac(e) {
    var V = veri(), panel = panelBul();
    if (!V || !panel) return;
    if (e) e.preventDefault();

    var tamKurus = seciliKurus(V);
    if (V.altLimit && tamKurus < V.altLimit) return;

    var ind = indirimBul(V, tamKurus);            // cookie tek sefer, dongude degil
    var indirimli = !!(ind && ind.durum === 'A');
    var netKurus = indirimli ? ind.netKurus : tamKurus;

    basligiYaz(V, tamKurus);

    if (typeof panel.showModal === 'function') { if (!panel.open) panel.showModal(); }
    else panel.setAttribute('open', '');

    var anahtar = tamKurus + '|' + netKurus;
    if (yuklendi && yuklenenAnahtar === anahtar) {
      son = { durum: ind ? ind.durum : null, paket: yuklendi, tam: tamKurus };
      ciz(V, yuklendi, netKurus, ind, tamKurus);
      return;
    }
    durum(V.yukleniyor);
    getirIkili(V, netKurus, indirimli ? tamKurus : null, function (paket) {
      yuklendi = paket; yuklenenAnahtar = anahtar;
      son = { durum: ind ? ind.durum : null, paket: paket, tam: tamKurus };
      ciz(V, paket, netKurus, ind, tamKurus);
    }, function (tur) {
      durum(tur === 'yok' ? V.yok : V.hata);
    });
  }

  /* Yakalama evresi: temalar "#" ile baslayan baglantilari yumusak
     kaydirma icin yakalayip stopPropagation() cagirabiliyor; kabarma
     evresindeki bir dinleyici o durumda hic calismaz. */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-tt-tk-kapat]')) {
      var p1 = panelBul(); if (p1) p1.close();
      hashTemizle();
      fbCiz();          // serit sayaci calismaya devam etsin
      return;
    }
    var p2 = panelBul();
    if (p2 && t === p2) { p2.close(); hashTemizle(); fbCiz(); return; }
    if (tetikMi(t.closest('a'), veri())) ac(e);
  }, true);

  document.addEventListener('close', function (e) {
    if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-tt-tk')) { hashTemizle(); fbCiz(); }
  }, true);

  /* Ikinci yol: tiklama baska bir kod tarafindan yutulsa bile tarayici
     adrese #taksit-tablosu yaziyorsa buradan yakaliyoruz. */
  function hashKontrol() {
    if (location.hash === '#taksit-tablosu') {
      var p = panelBul();
      if (p && !p.open) ac(null);
    }
  }
  window.addEventListener('hashchange', hashKontrol);

  /* ---------------------------------------------------------------
     URUN SAYFASI FIYAT BLOGU
     Fiyatin altindaki taksit satiri ve indirim seridi.
     Kod tespiti modaldekiyle AYNI fonksiyon (indirimBul) -- ikinci bir
     cerez mantigi yazilmadi. Blok ilk boyamada indirimsiz haliyle
     Liquid'den basiliyor; burasi yalnizca uzerine yaziyor, yani cerez
     okuma ilk boyamayi beklettirmiyor.
  --------------------------------------------------------------- */
  var fbOran = null;              // PayTR'den dogrulanan oran; null ise blogun kendi orani

  function fbBloklar() { return document.querySelectorAll('[data-tt-fb]'); }

  /* Tema para bicimi "2,599.00TL", modal "2.599,00 TL". Ikisini de dogru
     okumak icin ondalik ayraci sondan bulunuyor: son ayirici karakterden
     sonra tam 2 hane varsa o ondalik, degilse hepsi binlik. */
  function paraCoz(m) {
    var t = String(m == null ? '' : m).replace(/[^\d.,]/g, '');
    if (!t) return NaN;
    var son = Math.max(t.lastIndexOf('.'), t.lastIndexOf(','));
    if (son > -1 && t.length - son === 3) {
      return parseFloat(t.slice(0, son).replace(/[.,]/g, '') + '.' + t.slice(son + 1));
    }
    return parseFloat(t.replace(/[.,]/g, ''));
  }

  /* Once adresteki varyant, sonra ekrandaki fiyat, en son blogun kendi
     degeri. Varyant degisiminde tema hangisini guncellerse guncellesin
     dogru tutari buluyoruz. */
  function fbFiyat(V, blok) {
    var id = new URLSearchParams(location.search).get('variant');
    if (id && V.varyantlar && V.varyantlar[id] != null) return V.varyantlar[id];
    var el = document.querySelector('.price__regular');
    if (el) {
      var n = paraCoz(el.textContent);
      if (isFinite(n) && n > 0) return Math.round(n * 100);
    }
    var b = blok && blok.getAttribute('data-tt-fb-fiyat');
    return b ? parseInt(b, 10) : V.varsayilan;
  }

  function saatKur(kap, kalip) {
    if (!kap || kap.querySelector('[data-tt-tk-sayac]')) return;
    var par = String(kalip || '{SURE}').split('{SURE}');
    kap.textContent = '';
    kap.appendChild(document.createTextNode(par[0]));
    var sp = document.createElement('span');
    sp.setAttribute('data-tt-tk-sayac', '');
    kap.appendChild(sp);
    kap.appendChild(document.createTextNode(par.length > 1 ? par[1] : ''));
  }

  function fbCiz() {
    var V = veri();
    if (!V) return;
    var bloklar = fbBloklar();

    var tamKurus = bloklar.length ? fbFiyat(V, bloklar[0]) : seciliKurus(V);
    var ind = indirimBul(V, tamKurus);
    var taban = (ind && ind.durum === 'A') ? ind.netKurus : tamKurus;

    for (var i = 0; i < bloklar.length; i++) {
      var b = bloklar[i];
      var adet = parseInt(b.getAttribute('data-tt-fb-taksit'), 10) || 3;
      var oran = fbOran != null ? fbOran : parseFloat(b.getAttribute('data-tt-fb-oran'));
      if (!isFinite(oran)) oran = 0;
      var aylik = taban * (1 + oran / 100) / adet / 100;

      var a = b.querySelector('[data-tt-fb-aylik]');
      if (a) a.textContent = String(V.fbAyda || '{TUTAR}').replace('{TUTAR}', bicim(V, aylik));
      var t = b.querySelector('[data-tt-fb-adet]');
      if (t) t.textContent = String(V.fbTaksitEk || '').replace('{ADET}', adet);

      /* Kod varsa vurguyu yesil serit tasiyor, taksit satiri sadelesiyor. */
      var satir = b.querySelector('[data-tt-fb-satir]');
      if (satir) {
        satir.className = satir.className.replace(/\s*tt-fb-s[23]/g, '') + (ind ? ' tt-fb-s2' : ' tt-fb-s3');
      }

      var serit = b.querySelector('[data-tt-fb-serit]');
      if (!serit) continue;
      if (!ind) { serit.hidden = true; continue; }
      serit.className = serit.className.replace(/\s*tt-fb-serit-bilgi/g, '') +
                        (ind.durum === 'A' ? '' : ' tt-fb-serit-bilgi');
      var m = serit.querySelector('[data-tt-fb-serit-metin]');
      if (m) {
        m.textContent = ind.durum === 'A'
          ? String(V.fbKodlu || '').replace('{TUTAR}', bicim(V, ind.netKurus / 100))
          : String(V.indBEtiket || '');
      }
      saatKur(serit.querySelector('[data-tt-fb-saat]'), V.fbSaat);
      serit.hidden = false;
    }
    /* Sayaci burasi yonetiyor: indirim varsa calisir, yoksa durur.
       Boylece modal kapandiginda serit sayaci olmuyor. */
    if (ind) sayaciBaslat(ind.bitis);
    else { sayaciDurdur(); sonBitis = null; }
  }

  /* Blogun kendi orani ilk boyama icin; gercegi PayTR biliyor. Ilk
     boyamadan sonra bir kez soruluyor, sonuc oturum boyunca saklaniyor,
     gerekirse rakam sessizce duzeltiliyor.

     Kartlarda artik aylik tutar gosterilmiyor; oran yalnizca urun sayfasi
     fiyat blogunu ilgilendiriyor. Sayfada [data-tt-fb] yoksa (koleksiyon,
     arama, ana sayfa) hicbir sey sorulmuyor -- o sayfalarda PayTR istegi
     tamamen kalkti. */
  function fbOranDuzelt() {
    var V = veri() || kartVeri(), bloklar = fbBloklar();
    if (!V || !bloklar.length) return;
    var adet = parseInt(bloklar[0].getAttribute('data-tt-fb-taksit'), 10) || 3;
    var anahtar = 'ttOran' + adet;

    try {
      var kayit = sessionStorage.getItem(anahtar);
      if (kayit) { fbOran = parseFloat(kayit); fbCiz(); return; }
    } catch (e) {}

    var tamKurus = fbFiyat(V, bloklar[0]);
    if (!tamKurus) return;
    getir(V, tamKurus, function (sonuc) {
      var sat = (sonuc && sonuc.satirlar) || [];
      for (var i = 0; i < sat.length; i++) {
        if (sat[i].adet !== adet) continue;
        var o = (sat[i].toplam * 100 / tamKurus - 1) * 100;
        if (!isFinite(o) || o < 0 || o > 100) return;
        fbOran = o;
        try { sessionStorage.setItem(anahtar, String(o)); } catch (e) {}
        fbCiz();
        return;
      }
    }, function () {});
  }

  /* Varyant degisimi: tema fiyati hangi yolla degistirirse degistirsin
     (adres, bolum yeniden cizimi, kendi JS'i) fiyat ogesindeki degisiklik
     yakalanip blok yeniden hesaplaniyor. */
  function fbIzle() {
    if (!window.MutationObserver) return;
    var hedef = document.querySelectorAll('.price');
    if (!hedef.length) return;
    var z = null;
    var g = new MutationObserver(function () {
      if (z) window.clearTimeout(z);
      z = window.setTimeout(fbCiz, 60);
    });
    for (var i = 0; i < hedef.length; i++) {
      g.observe(hedef[i], { childList: true, characterData: true, subtree: true });
    }
  }

  /* Cark sayfa acildiktan SONRA cerez yaziyor. Sayfa basina tek okuma
     bunu kaciriyordu. Burada saniyede bir yalnizca uc cerezin degeri
     karsilastiriliyor -- degismediyse hicbir sey yapilmiyor. Sekme arka
     plandayken hic okunmuyor. */
  var sonCerezImza = null;
  function cerezImza(V) {
    return cerez(V.cKod) + '|' + cerez(V.cSure) + '|' + cerez(V.cZaman);
  }
  function cerezIzle() {
    var V = kartVeri();
    if (!V || !V.indirimAktif) return;
    sonCerezImza = cerezImza(V);
    window.setInterval(function () {
      if (document.hidden) return;
      var V2 = kartVeri();
      if (!V2) return;
      var im = cerezImza(V2);
      if (im === sonCerezImza) return;
      sonCerezImza = im;
      yuklendi = null; yuklenenAnahtar = null;   // modal onbellegi artik gecersiz
      fbCiz();
      kolCiz();
      var p = panelBul();
      if (p && p.open) ac(null);
    }, 1000);
  }

  /* ---------------------------------------------------------------
     KOLEKSIYON SAYFASI
     Izgaranin ustunde tek serit (bolumun kendi yerinde, sablonda
     izgaranin ustune konuldugu icin JS'in izgarayi bulmasi gerekmiyor)
     ve her kartin fiyat blogunun indirimli hali.
  --------------------------------------------------------------- */
  /* Izgara benzeri kapsayici mi? Grid her zaman; flex ise ancak birden
     cok urun karti tasiyorsa (karusel, yatay serit) sayiyoruz -- kartin
     kendi ic sarmalayicilari da flex, onlar izgara degil. */
  function izgaraMi(el) {
    if (!el || el.nodeType !== 1) return false;
    var d = window.getComputedStyle(el).display;
    if (d === 'grid' || d === 'inline-grid') return true;
    if (d === 'flex' || d === 'inline-flex') return el.querySelectorAll('.product-card').length > 1;
    return false;
  }

  /* Bu kapsayici DOGRUDAN urun karti hucreleri tasiyor mu? Seridin kendisi
     sayilmaz, yoksa eklendikten sonra kendi varligi testi bozar. */
  function kartKapsayicisi(el) {
    if (!izgaraMi(el)) return false;
    var c = el.children;
    for (var i = 0; i < c.length; i++) {
      if (c[i].hasAttribute('data-tt-kol')) continue;
      if (c[i].classList.contains('product-card') || c[i].querySelector('.product-card')) return true;
    }
    return false;
  }

  /* Serit sayfada YOKSA ilk urun izgarasinin ustune bir kez eklenir;
     varsa (sablona elle konmussa) ikincisi olusturulmaz.

     IZGARANIN DISINA, KARDES OLARAK basiliyor. Onceden konum
     kart.parentNode.parentNode diye SEVIYE SAYARAK bulunuyordu; tema
     karti fazladan bir sarmalayiciya koydugunda o hesap bir seviye
     sasiyor ve serit izgaranin COCUGU olarak doguyordu. Grid onu urun
     karti sanip tek sutun genisligine sikistiriyor, "500 TL indirim
     kodunuz aktif" dort satira boluniyordu. Artik seviye sayilmiyor:
     kapsayici hesaplanmis display'den bulunuyor. */
  function seritYuvasi() {
    var v = document.querySelector('[data-tt-kol]');
    if (v) return v;
    var ilk = document.querySelector('[data-tt-kart-fb]');
    if (!ilk) return null;
    var kart = ilk.closest('.product-card') || ilk.parentNode;

    var el = kart, izgara = null, adim = 0;
    while (el && el.parentNode && adim++ < 8) {
      if (kartKapsayicisi(el.parentNode)) { izgara = el.parentNode; break; }
      el = el.parentNode;
    }
    if (!izgara || !izgara.parentNode) return null;

    var d = document.createElement('div');
    d.className = 'tt-kol';
    d.setAttribute('data-tt-kol', '');
    d.innerHTML = '<div class="tt-kol-serit" data-tt-kol-serit hidden>' +
                  '<span class="tt-kol-metin" data-tt-kol-metin></span>' +
                  '<span class="tt-kol-saat" data-tt-kol-saat></span></div>';
    izgara.parentNode.insertBefore(d, izgara);

    /* Emniyet: ic ice izgaralarda ustteki de kart tasiyor olabilir.
       Serit hala bir kart kapsayicisinin icindeyse bir seviye disari
       cikariyoruz -- boylece hicbir izgaranin cocugu olarak kalmiyor. */
    var kacis = 0;
    while (d.parentNode && d.parentNode.parentNode && kartKapsayicisi(d.parentNode) && kacis++ < 4) {
      d.parentNode.parentNode.insertBefore(d, d.parentNode);
    }
    return d;
  }

  function kolCiz() {
    var V = kartVeri();
    if (!V) return;

    var g = kodBul(V);
    var t = parseFloat(String(V.indTutar == null ? '' : V.indTutar).replace(',', '.'));
    var indKurus = (isFinite(t) && t > 0) ? Math.round(t * 100) : 0;

    var kap = seritYuvasi();
    var serit = kap && kap.querySelector('[data-tt-kol-serit]');
    if (serit) {
      if (!g) {
        serit.hidden = true;
      } else {
        var m = serit.querySelector('[data-tt-kol-metin]');
        if (m) {
          m.textContent = indKurus
            ? String(V.kolMetni || '').replace('{TUTAR}', bicimKisa(V, indKurus / 100))
            : String(V.indBEtiket || '');
        }
        serit.className = serit.className.replace(/\s*tt-kol-bilgi/g, '') + (indKurus ? '' : ' tt-kol-bilgi');
        saatKur(serit.querySelector('[data-tt-kol-saat]'), V.kolSaat);
        serit.hidden = false;
      }
    }

    /* KART FIYAT BLOGU (kart-fiyat-versiyon-b.html)
       Etiket, yesil tutar ve ustu cizili fiyat Liquid'de hesaplanip
       [hidden] basiliyor; burada yalnizca GORUNURLUK degisiyor -- rakam
       uretilmiyor, para bicimlendirilmiyor.
         kod gecerli  -> blok gorunur, temanin kendi fiyat satiri gizlenir
         kod yok/dolmus -> blok gizli kalir, tek satir normal fiyat gorunur
       Sure dolunca sureBittiIc() burayi yeniden cagirdigi icin sayfa
       yenilenmeden sessizce ikinci duruma donuluyor. */
    var bloklar = document.querySelectorAll('[data-tt-kart-fb]');
    for (var i = 0; i < bloklar.length; i++) {
      var b = bloklar[i];
      var kurus = parseInt(b.getAttribute('data-tt-kart-fiyat'), 10);
      /* Indirim urun fiyatina esit ya da ondan buyukse o kartta gosterilmez.
         Liquid de ayni kontrolu yapiyor; bu ikinci kemer, ayar sonradan
         degisip blok onbellekten gelirse yanlis rakam ekranda kalmasin. */
      var uygun = !!(g && indKurus > 0 && isFinite(kurus) && indKurus < kurus);
      b.hidden = !uygun;
      var normal = b.parentNode && b.parentNode.querySelector('.price');
      if (normal) normal.classList.toggle('tt-gizli', uygun);
    }

    if (g) sayaciBaslat(g.bitis);
    else if (!document.querySelector('[data-tt-fb]')) { sayaciDurdur(); sonBitis = null; }
  }

  function kur() {
    panelBul();
    fbCiz();
    kolCiz();
    fbIzle();
    cerezIzle();
    window.setTimeout(fbOranDuzelt, 1200);     // ilk boyamayi beklettirme
    var V = veri();
    var l = document.getElementsByTagName('a');
    for (var i = 0; i < l.length; i++) {
      if (tetikMi(l[i], V)) {
        l[i].setAttribute('aria-haspopup', 'dialog');
        l[i].setAttribute('role', 'button');
      }
    }
    hashKontrol();
  }
  /* --- gecici teshis kutusu --- */
  var hatalar = [];
  window.addEventListener('error', function (e) {
    hatalar.push((e.message || 'hata') + ' @ ' + (e.filename || '?').split('/').pop() + ':' + (e.lineno || '?'));
  });

  function V0kirp() { var V = veri(); return V ? V.enCokTaksit : '?'; }
  function tani() {
    var kutular = document.querySelectorAll('[data-tt-tk-tani]');
    if (!kutular.length) return;
    var V = veri();
    var p = document.querySelector('body > dialog[data-tt-tk]');
    var hepsi = document.querySelectorAll('dialog[data-tt-tk]');
    var eslesen = [];
    var l = document.getElementsByTagName('a');
    for (var i = 0; i < l.length; i++) if (tetikMi(l[i], V)) eslesen.push(l[i]);

    var sat = [];
    sat.push('DIŞ SCRIPT YÜKLENDİ ✓');
    sat.push('veri: ' + (V ? 'okundu (fiyat ' + (V.varsayilan / 100) + ' TL, max ' + V.enCokTaksit + ')' : 'OKUNAMADI ✕'));
    sat.push('panel: ' + hepsi.length + ' adet, body altında: ' + (p ? 'evet' : 'HAYIR ✕'));
    sat.push('<dialog> desteği: ' + (p && typeof p.showModal === 'function' ? 'var' : 'YOK ✕'));
    sat.push('eşleşen bağlantı: ' + eslesen.length + (eslesen.length ? '' : ' ✕'));
    if (eslesen.length) {
      var a = eslesen[0];
      sat.push('  metin: "' + (a.textContent || '').replace(/\s+/g, ' ').trim() + '"');
      sat.push('  href : ' + (a.getAttribute('href') || '(yok)'));
    } else {
      var tum = [], say = 0;
      for (var j = 0; j < l.length && say < 6; j++) {
        var yz = (l[j].textContent || '').replace(/\s+/g, ' ').trim();
        if (yz && yz.length < 40) { tum.push('"' + yz + '"'); say++; }
      }
      sat.push('  aranan metin: "' + (V && V.metin) + '"');
      sat.push('  sayfadaki linkler: ' + tum.join(', '));
    }
    sat.push('PayTR isteği: ' + (sonIstek ? sonIstek.replace(/token=[^&]*/, 'token=***') : '(henüz atılmadı)'));
    sat.push('PayTR\'nin döndürdüğü taksitler: ' + (sonHamAdet ? (sonHamAdet.join(', ') || 'hiç') : '(henüz yok)'));
    sat.push('ayardaki en fazla taksit: ' + V0kirp());
    sat.push('JS hatası: ' + (hatalar.length ? hatalar.join(' | ') : 'yok'));
    sat.push('— Pencereyi denemek için BU KUTUYA dokunun —');
    for (var q = 0; q < kutular.length; q++) {
      kutular[q].textContent = sat.join('\n');
      kutular[q].onclick = function () { ac(null); };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { kur(); tani(); });
  } else { kur(); tani(); }
  window.setTimeout(tani, 1500);
})();
