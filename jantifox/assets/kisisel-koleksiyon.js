/* Kategori / koleksiyon sayfası: kişiselleştirilebilen ürün kartlarına etiket, "Kişiselleştir" ve sepet butonu,
   sıralamanın yanına "Sadece kişiselleştirilebilenler" filtresi. Temanın kart dosyasına dokunmaz; kartlar sayfa
   geldikten (ve tema filtre / sıralama / sayfa değişiminde ızgarayı yeniden çizdikten) sonra işaretlenir.
   Veri: snippets/kisisel-koleksiyon.liquid (#KisiselKoleksiyon). Kartlar için ek istek atılmaz. */
(function () {
  'use strict';

  var veriEl = document.getElementById('KisiselKoleksiyon');
  if (!veriEl) return;
  var URUNLER;
  try {
    URUNLER = JSON.parse(veriEl.textContent).urunler || {};
  } catch (e) {
    return;
  }
  var FILTRE_ANAHTARI = 'kp-kk-filtre:' + window.location.pathname;
  var SEPET_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 7h12l-1.2 12.1a1 1 0 0 1-1 .9H8.2a1 1 0 0 1-1-.9L6 7Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 9V6a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  function kacis(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function urunKimligi(a) {
    var m = (a.pathname || '').match(/\/products\/([^/?#]+)/);
    if (!m) return null;
    try {
      return decodeURIComponent(m[1]);
    } catch (e) {
      return m[1];
    }
  }

  function editorAdresi(u) {
    return u + (u.indexOf('?') === -1 ? '?' : '&') + 'kisisellestir=1';
  }

  function depo(yaz) {
    try {
      if (yaz === undefined) return window.sessionStorage.getItem(FILTRE_ANAHTARI) === '1';
      if (yaz) window.sessionStorage.setItem(FILTRE_ANAHTARI, '1');
      else window.sessionStorage.removeItem(FILTRE_ANAHTARI);
    } catch (e) {
      /* gizli pencere */
    }
    return false;
  }

  var filtreAcik = depo() || /[?&]kisisel=1(&|$)/.test(window.location.search);

  /* ---------------- Kartlar ---------------- */

  function kartiSusle(sarici, kimlik, u) {
    var medya = sarici.querySelector('.card-product__media');
    if (!medya) return;
    var adres = editorAdresi(u.u);
    // Sol üst etiket: temanın kendi etiketi (indirim, NEW IN) varsa onun altına iner
    var temaEtiketi = medya.querySelector('.card-new-in-badge, .card__badge .badge');
    var rozet = document.createElement('span');
    rozet.className = 'kp-kk-rozet' + (temaEtiketi ? ' kp-kk-rozet--alt' : '');
    rozet.innerHTML = '<span class="kp-kk-rozet__ikon" aria-hidden="true">✎</span>' +
      '<span class="kp-kk-masaustu"> Kişiselleştirilebilir</span><span class="kp-kk-mobil-metin"> Kişiselleştir</span>';
    medya.appendChild(rozet);

    // Masaüstü: görselin alt kısmında, her zaman görünür
    var eylem = document.createElement('div');
    eylem.className = 'kp-kk-eylem';
    eylem.innerHTML =
      '<a class="kp-kk-kisisel" href="' + kacis(adres) + '">Kişiselleştir</a>' +
      '<button type="button" class="kp-kk-sepet" data-kp-kk-sepet="' + kacis(kimlik) + '" aria-label="' + kacis(u.b) + ' sepete ekle" title="Sepete ekle">' + SEPET_SVG + '</button>';
    medya.appendChild(eylem);

    // Mobil: görselin hemen altında, ürün adının üstünde, kart genişliğinde
    var mobil = document.createElement('a');
    mobil.className = 'kp-kk-mobil';
    mobil.href = adres;
    mobil.textContent = 'Kişiselleştir';
    medya.insertAdjacentElement('afterend', mobil);
  }

  function bosluk(sarici) {
    var medya = sarici.querySelector('.card-product__media');
    if (!medya) return;
    var b = document.createElement('div');
    b.className = 'kp-kk-bosluk';
    b.setAttribute('aria-hidden', 'true');
    medya.insertAdjacentElement('afterend', b);
  }

  function izgara() {
    return document.getElementById('product-grid');
  }

  function kartlariIsle() {
    var g = izgara();
    if (!g) return;
    var herhangi = false;
    Array.prototype.forEach.call(g.children, function (li) {
      var sarici = li.querySelector('.card-wrapper');
      if (!sarici) return;
      var durum = sarici.getAttribute('data-kp-kk');
      if (durum === null) {
        var a = sarici.querySelector('a.product-link[href], a[href*="/products/"]');
        var kimlik = a && urunKimligi(a);
        var u = kimlik && URUNLER[kimlik];
        durum = u ? kimlik : '';
        sarici.setAttribute('data-kp-kk', durum);
        if (u) kartiSusle(sarici, kimlik, u);
        else bosluk(sarici);
      }
      li.classList.toggle('kp-kk-acik', !!durum);
      li.setAttribute('data-kp-kk-urun', durum);
      if (durum) herhangi = true;
    });
    g.classList.toggle('kp-kk-izgara', herhangi);
  }

  /* ---------------- Filtre ---------------- */

  function filtreDugmesi(ek) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'kp-kk-filtre' + (ek ? ' ' + ek : '');
    b.setAttribute('data-kp-kk-filtre', '');
    b.setAttribute('aria-pressed', filtreAcik ? 'true' : 'false');
    b.innerHTML = '<span aria-hidden="true">✎</span> Sadece kişiselleştirilebilenler';
    return b;
  }

  function dugmeleriYerlestir() {
    // Masaüstü (dikey filtre düzeni): sıralama seçiminin yanında. Tema ızgarayı yeniden çizince yeniden eklenir.
    document.querySelectorAll('#ProductGridContainer .facet-filters.sorting').forEach(function (s) {
      if (s.querySelector('[data-kp-kk-filtre]')) return;
      var alan = s.querySelector('.facet-filters__field');
      var b = filtreDugmesi('kp-kk-filtre--masaustu');
      if (alan) alan.insertAdjacentElement('beforebegin', b);
      else s.appendChild(b);
    });
    // Mobil: "Filtrele ve sırala" düğmesinin yanında; satır yatay kaydırılabilir
    document.querySelectorAll('drawer-button.drawer-filter').forEach(function (d) {
      var satir = d.parentElement;
      if (!satir || satir.querySelector('[data-kp-kk-filtre]')) return;
      satir.classList.add('kp-kk-satir');
      d.insertAdjacentElement('afterend', filtreDugmesi('kp-kk-filtre--mobil'));
    });
    document.querySelectorAll('[data-kp-kk-filtre]').forEach(function (b) {
      b.setAttribute('aria-pressed', filtreAcik ? 'true' : 'false');
    });
  }

  function filtreyiUygula() {
    var g = izgara();
    var kap = document.getElementById('ProductGridContainer');
    if (!g) return;
    var sablon = document.getElementById('KisiselKoleksiyonKartlar');
    if (filtreAcik) {
      // Başka sayfadaki kişiselleştirilebilir ürünler de listelenir (sayfayla gelen kart şablonlarından)
      var mevcut = {};
      Array.prototype.forEach.call(g.children, function (li) {
        var k = li.getAttribute('data-kp-kk-urun') || li.getAttribute('data-kp-kk-ek');
        if (k) mevcut[k] = true;
      });
      if (sablon && sablon.content) {
        Array.prototype.forEach.call(sablon.content.children, function (li) {
          var k = li.getAttribute('data-kp-kk-ek');
          if (!k || mevcut[k]) return;
          g.appendChild(li.cloneNode(true));
          mevcut[k] = true;
        });
      }
      kartlariIsle();
      Array.prototype.forEach.call(g.children, function (li) {
        li.classList.toggle('kp-kk-gizli', !li.classList.contains('kp-kk-acik'));
      });
      var bos = g.parentElement.querySelector('.kp-kk-bos');
      var sayi = g.querySelectorAll(':scope > .kp-kk-acik').length;
      if (!sayi && !bos) {
        bos = document.createElement('p');
        bos.className = 'kp-kk-bos';
        bos.textContent = 'Bu kategoride kişiselleştirilebilen ürün yok.';
        g.insertAdjacentElement('afterend', bos);
      } else if (sayi && bos) {
        bos.remove();
      }
    } else {
      g.querySelectorAll(':scope > [data-kp-kk-ek]').forEach(function (li) { li.remove(); });
      g.querySelectorAll(':scope > .kp-kk-gizli').forEach(function (li) { li.classList.remove('kp-kk-gizli'); });
      var b2 = g.parentElement.querySelector('.kp-kk-bos');
      if (b2) b2.remove();
    }
    if (kap) kap.classList.toggle('kp-kk-filtreli', filtreAcik);
    dugmeleriYerlestir();
  }

  function filtreDegistir() {
    filtreAcik = !filtreAcik;
    depo(filtreAcik);
    try {
      var adres = new URL(window.location.href);
      if (filtreAcik) adres.searchParams.set('kisisel', '1');
      else adres.searchParams.delete('kisisel');
      history.replaceState(history.state, '', adres.pathname + adres.search + adres.hash);
    } catch (e) {
      /* yoksay */
    }
    filtreyiUygula();
  }

  /* ---------------- Sepete ekle ---------------- */

  var bildirimZamani = null;

  function bildirim(html, hata) {
    var el = document.querySelector('.kp-kk-bildirim');
    if (!el) {
      el = document.createElement('div');
      el.className = 'kp-kk-bildirim';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.classList.toggle('kp-kk-bildirim--hata', !!hata);
    el.innerHTML = html;
    el.classList.add('kp-kk-bildirim--acik');
    clearTimeout(bildirimZamani);
    bildirimZamani = setTimeout(function () { el.classList.remove('kp-kk-bildirim--acik'); }, 6000);
  }

  function sepetiYenile() {
    try {
      if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') publish(PUB_SUB_EVENTS.cartUpdate, { source: 'kisisel-koleksiyon' });
    } catch (e) {
      /* tema pubsub yoksa */
    }
    var cizim = document.querySelector('cart-drawer');
    var bolumler = ['cart-icon-bubble'];
    if (cizim && typeof cizim.getSectionsToRender === 'function') {
      cizim.getSectionsToRender().forEach(function (b) { if (bolumler.indexOf(b.id) === -1) bolumler.push(b.id); });
    }
    return fetch(window.location.pathname + '?sections=' + bolumler.join(','))
      .then(function (r) { return r.json(); })
      .then(function (b) {
        // Çekmece açılmadan güncellenir (temanın renderContents yerleştirmesiyle aynı)
        if (cizim && typeof cizim.getSectionsToRender === 'function' && typeof cizim.getSectionInnerHTML === 'function') {
          cizim.getSectionsToRender().forEach(function (s) {
            var el = s.selector ? document.querySelector(s.selector) : document.getElementById(s.id);
            if (el && b[s.id]) el.innerHTML = cizim.getSectionInnerHTML(b[s.id], s.selector);
          });
          if (cizim.classList.contains('is-empty')) cizim.classList.remove('is-empty');
          return;
        }
        var kabarcik = document.getElementById('cart-icon-bubble');
        if (kabarcik && b['cart-icon-bubble']) {
          var dom = new DOMParser().parseFromString(b['cart-icon-bubble'], 'text/html').querySelector('.shopify-section');
          if (dom) kabarcik.innerHTML = dom.innerHTML;
        }
      })
      .catch(function () {});
  }

  function sepeteEkle(kimlik, varyantId, dugme) {
    var u = URUNLER[kimlik];
    var rotalar = window.routes || {};
    if (dugme) dugme.setAttribute('aria-busy', 'true');
    return fetch((rotalar.cart_add_url || '/cart/add') + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: varyantId, quantity: 1 }] })
    })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok || j.status) throw new Error(j.description || j.message || 'Sepete eklenemedi');
          return j;
        });
      })
      .then(function () {
        bildirim('<span>Sepete eklendi</span> <span class="kp-kk-bildirim__ayrac">·</span> ' +
          '<span>Kişiselleştirmek ister misin? <a class="kp-kk-bildirim__baglanti" href="' + kacis(editorAdresi(u.u)) + '">Tasarla →</a></span>');
        sepetiYenile();
      })
      .catch(function (e) {
        bildirim(kacis(e.message || 'Sepete eklenemedi'), true);
      })
      .then(function () {
        if (dugme) dugme.removeAttribute('aria-busy');
      });
  }

  function secimiKapat() {
    document.querySelectorAll('.kp-kk-secim').forEach(function (el) { el.remove(); });
  }

  // Birden çok seçenekli ürün (beden): küçük seçim kutusu; tek seçenekliyse doğrudan eklenir
  function sepetDugmesi(dugme) {
    var kimlik = dugme.getAttribute('data-kp-kk-sepet');
    var u = URUNLER[kimlik];
    if (!u) return;
    var satilir = u.v.filter(function (v) { return v.a; });
    if (!satilir.length) {
      bildirim('Bu ürün şu an stokta yok.', true);
      return;
    }
    if (u.v.length === 1) return sepeteEkle(kimlik, satilir[0].id, dugme);
    var acik = dugme.parentElement.querySelector('.kp-kk-secim');
    secimiKapat();
    if (acik) return;
    var kutu = document.createElement('div');
    kutu.className = 'kp-kk-secim';
    kutu.setAttribute('role', 'group');
    kutu.setAttribute('aria-label', 'Seçenek seç');
    kutu.innerHTML = u.v.map(function (v) {
      return '<button type="button" data-kp-kk-varyant="' + v.id + '"' + (v.a ? '' : ' disabled') + '>' + kacis(v.t) + '</button>';
    }).join('');
    dugme.insertAdjacentElement('beforebegin', kutu);
    var ilk = kutu.querySelector('button:not([disabled])');
    if (ilk) ilk.focus();
  }

  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-kp-kk-filtre]');
    if (f) {
      e.preventDefault();
      return filtreDegistir();
    }
    var s = e.target.closest('[data-kp-kk-sepet]');
    if (s) {
      e.preventDefault();
      return sepetDugmesi(s);
    }
    var v = e.target.closest('[data-kp-kk-varyant]');
    if (v) {
      e.preventDefault();
      var d = v.closest('.kp-kk-eylem').querySelector('[data-kp-kk-sepet]');
      secimiKapat();
      return sepeteEkle(d.getAttribute('data-kp-kk-sepet'), parseInt(v.getAttribute('data-kp-kk-varyant'), 10), d);
    }
    if (!e.target.closest('.kp-kk-secim')) secimiKapat();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') secimiKapat();
  });

  /* ---------------- Başlat ---------------- */

  var bekleyen = false;
  function hepsi() {
    bekleyen = false;
    kartlariIsle();
    filtreyiUygula();
  }
  function planla() {
    if (bekleyen) return;
    bekleyen = true;
    (window.requestAnimationFrame || setTimeout)(hepsi);
  }

  function izle() {
    // Tema filtre / sıralama / sayfa değişiminde #ProductGridContainer'ın içini yeniden çizer; "Daha fazla" ve
    // sonsuz kaydırma ızgaraya kart ekler
    var kap = document.getElementById('ProductGridContainer');
    if (!kap || !window.MutationObserver) return;
    var izGrid = null;
    var gozlemci = new MutationObserver(function () {
      var g = izgara();
      if (g && g !== izGrid) {
        izGrid = g;
        gridGozlemci.disconnect();
        gridGozlemci.observe(g, { childList: true });
      }
      planla();
    });
    var gridGozlemci = new MutationObserver(planla);
    gozlemci.observe(kap, { childList: true });
    izGrid = izgara();
    if (izGrid) gridGozlemci.observe(izGrid, { childList: true });
  }

  function baslat() {
    hepsi();
    izle();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat);
  else baslat();
})();
