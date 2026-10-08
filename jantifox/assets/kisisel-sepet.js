/*
 * JantiFox kişiselleştirme: sepette tasarım gruplaması
 * - Aynı _tasarim_id'yi taşıyan kalemleri sepet çekmecesinde ve sepet sayfasında grup olarak gösterir.
 * - Çanta (baz kalem) silinirse onay sorar ve grubun tamamını siler.
 * - Tek bir patch silinirse uyarır, siler ve çanta kalemindeki tasarım özetini günceller.
 * - Çanta adedi değişirse patch adetlerini aynı oranda değiştirir.
 * - Çanta satırında model fotoğrafı yerine tasarımın önizlemesi (ürün sayfasında kaydedilen çizim kitinden),
 *   içerik özeti ve grubun toplam fiyatı; patch satırları "N patch'i göster" ile açılır.
 * Tasarım kalemi olmayan sepetlerde hiçbir şey yapmaz.
 */
(function () {
  'use strict';

  if (window.KisiselSepet) return;

  var rotalar = function () {
    var r = window.routes || {};
    return {
      sepet: r.cart_url || '/cart',
      guncelle: (r.cart_update_url || '/cart/update') + '.js',
      degistir: (r.cart_change_url || '/cart/change') + '.js'
    };
  };

  var sonSepet = null;
  var calisiyor = false;
  var tekrar = false;

  function sepetGetir() {
    return fetch(rotalar().sepet + '.js', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        sonSepet = s;
        return s;
      });
  }

  function satirlar() {
    return Array.prototype.slice.call(
      document.querySelectorAll('.cart-item[id^="CartDrawer-Item-"], .cart-item[id^="CartItem-"]')
    );
  }

  function satirNo(satir) {
    return parseInt(satir.id.split('-').pop(), 10);
  }

  function sadeAd(baslik) {
    return String(baslik || '').replace(/\s*patch\s*$/i, '').trim();
  }

  // Grubun kalan kalemlerinden tasarım özetini yeniden üretir
  // "Yapıştırılabilir Kalem Kutusu Kırmızı- LE KOKO COLLECTIF-" → "Kalem Kutusu Kırmızı"
  function aksesuarAdi(baslik) {
    return String(baslik || '').replace(/\s+/g, ' ').replace(/^Yapıştırılabilir\s+/i, '').replace(/\s*-?\s*LE KOKO COLLECTIF\s*-?\s*$/i, '').replace(/[\s-]+$/, '').trim();
  }

  // aksesuarId verilirse yalnızca o aksesuarın üzerindeki patch'lerin özeti; verilmezse çanta tasarımının özeti
  // (aksesuarlar "Kalem Kutusu Kırmızı (ADA)" olarak sona eklenir)
  function ozetUret(kalemler, aksesuarId) {
    var harfler = [];
    var digerleri = [];
    var aksesuarlar = [];
    kalemler.forEach(function (k) {
      var o = k.properties || {};
      if (!aksesuarId && o._tasarim_rol === 'aksesuar') {
        aksesuarlar.push(aksesuarAdi(k.product_title) + (o['Aksesuar tasarımı'] ? ' (' + o['Aksesuar tasarımı'] + ')' : ''));
        return;
      }
      if (o._tasarim_rol !== 'patch') return;
      if ((o._aksesuar_id || null) !== (aksesuarId || null)) return;
      if (o['Harf sırası']) {
        // Çok renkli setlerde varyant adı "Yeşil E" biçiminde: harf son kelime, renk öncesi
        var vt = String(k.variant_title || '').trim();
        var ad = /^(.*\S)\s+(\S)$/.exec(vt);
        String(o['Harf sırası']).split(',').forEach(function (s) {
          harfler.push({ sira: parseInt(s, 10), harf: ad ? ad[2] : vt, renk: ad ? ad[1] : null });
        });
      } else {
        var birim = parseInt(o._adet_birim, 10) || 1;
        var ad = o._patch_sayisi
          ? String(k.product_title || '').replace(/\s+/g, ' ').replace(/\s*(Patch\s+)?Seti\s*$/i, '').trim() + ' seti'
          : k.variant_title && k.variant_title !== 'Default Title' ? k.variant_title : sadeAd(k.product_title);
        for (var i = 0; i < birim; i++) digerleri.push(ad);
      }
    });
    harfler.sort(function (a, b) { return a.sira - b.sira; });
    var isim = harfler.map(function (h) { return h.harf; }).join('');
    var renkli = harfler.some(function (h) { return h.renk; });
    var isimOzet = isim && renkli ? isim + ' (' + harfler.map(function (h) { return h.renk ? h.renk + ' ' + h.harf : h.harf; }).join(', ') + ')' : isim;
    return { isim: isim, ozet: [isimOzet].concat(digerleri, aksesuarlar).filter(Boolean).join(' + ') };
  }

  function gruplar(sepet) {
    var g = {};
    (sepet.items || []).forEach(function (k, i) {
      var o = k.properties || {};
      if (!o._tasarim_id) return;
      if (!g[o._tasarim_id]) g[o._tasarim_id] = { baz: null, patchler: [] };
      k._satir = i + 1;
      if (o._tasarim_rol === 'baz') g[o._tasarim_id].baz = k;
      else g[o._tasarim_id].patchler.push(k);
    });
    return g;
  }

  /* ---------------- Görünüm ---------------- */

  // Ürün sayfasında sepete eklerken kaydedilen çizim kitleri (tasarım kimliğine göre)
  function cizimKitleri() {
    try {
      return JSON.parse(window.localStorage.getItem('kisisel-sepet-cizim') || '{}');
    } catch (e) {
      return {};
    }
  }

  function kacis(m) {
    return String(m == null ? '' : m).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Tasarım önizlemesi: çanta görseli üzerinde patch'ler, takılabilir alana yakın görünüm
  function kitHtml(kit) {
    var y = kit.y || { olcek: 1, sol: 0, ust: 0 };
    var parcalar = (kit.p || [])
      .map(function (p) {
        if (!p.u) return '';
        return '<img class="kp-sepet-mini__parca' + (p.d ? ' kp-sepet-mini__parca--daire' : '') + (p.j ? ' kp-sepet-mini__parca--jpg' : '') + '" src="' + kacis(p.u) + '" alt="" style="left:' + kacis(p.l) + ';top:' + kacis(p.t) + ';width:' + kacis(p.w) + ';height:' + kacis(p.h) + (p.r ? ';transform:' + kacis(p.r) : '') + '">';
      })
      .join('');
    return (
      '<div class="kp-sepet-mini" style="aspect-ratio:' + kit.o + '" aria-hidden="true">' +
      '<div class="kp-sepet-mini__sahne" style="aspect-ratio:' + kit.o + ';width:' + y.olcek * 100 + '%;left:' + y.sol + '%;top:' + y.ust + '%">' +
      '<img class="kp-sepet-mini__urun" src="' + kacis(kit.g) + '" alt="">' + parcalar +
      '</div></div>'
    );
  }

  // Temanın para biçimiyle uyumlu: 4,743.00TL
  function para(kurus) {
    var t = (Number(kurus) || 0) / 100;
    return t.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'TL';
  }

  var acikGruplar = {};

  // Çanta ve patch satırlarını tasarım grubuna göre düzenler
  function grupSatirlariniDuzenle(sepet, kap, baz) {
    var id = baz.getAttribute('data-kp-tasarim');
    var g = gruplar(sepet)[id];
    if (!g || !g.baz) return;
    var patchSatirlari = Array.prototype.slice.call(kap.querySelectorAll(':scope > [data-kp-rol="patch"][data-kp-tasarim="' + id + '"]'));
    var acik = !!acikGruplar[id];
    patchSatirlari.forEach(function (p) {
      p.classList.toggle('kp-sepet-gizli', !acik);
      // Patch satırında tasarım özeti tekrar etmesin: yalnızca patch adı (varyant), adet ve fiyat
      Array.prototype.forEach.call(p.querySelectorAll('dl .product-option'), function (o) {
        var dt = o.querySelector('dt');
        if (dt && /^(Tasarım|Harf sırası|İsim)\s*:?$/.test(dt.textContent.trim())) o.classList.add('kp-sepet-gizli');
      });
    });
    // Görsel: tasarımın önizlemesi (çizilemezse ürün görseli kalır)
    var medya = baz.querySelector('.cart-item__media');
    var kit = cizimKitleri()[id];
    if (medya && kit && !medya.querySelector('.kp-sepet-mini')) {
      medya.classList.add('kp-sepet-cizildi');
      medya.insertAdjacentHTML('beforeend', kitHtml(kit));
    }
    // İçerik özeti ve patch'leri göster/gizle
    var ad = baz.querySelector('.cart-item__name');
    var ozellik = g.baz.properties || {};
    var birimAdet = Math.max(1, g.baz.quantity || 1);
    // Hazır set satırı içindeki patch sayısı kadar sayılır (_patch_sayisi)
    var patchSayisi = g.patchler.reduce(function (t, p) {
      if ((p.properties || {})._tasarim_rol === 'aksesuar') return t;
      return t + Math.round((p.quantity || 0) / birimAdet) * (parseInt((p.properties || {})._patch_sayisi, 10) || 1);
    }, 0);
    // Aksesuar satırları görünür kalır: "+ Kalem Kutusu Kırmızı ve tasarımı"
    Array.prototype.forEach.call(kap.querySelectorAll(':scope > [data-kp-rol="aksesuar"][data-kp-tasarim="' + id + '"]'), function (satir) {
      if (satir.querySelector('.kp-sepet-aks')) return;
      var k = sepet.items[satirNo(satir) - 1];
      if (!k) return;
      var etiket = document.createElement('p');
      etiket.className = 'kp-sepet-aks';
      etiket.textContent = '+ ' + aksesuarAdi(k.product_title) + ((k.properties || {})['Aksesuar tasarımı'] ? ' ve tasarımı' : '');
      var ad0 = satir.querySelector('.cart-item__name');
      if (ad0) ad0.insertAdjacentElement('beforebegin', etiket);
    });
    if (ad && !baz.querySelector('.kp-sepet-icerik')) {
      var ic = document.createElement('p');
      ic.className = 'kp-sepet-icerik';
      ic.textContent = String(ozellik['Tasarım'] || '').split(' + ').join(' · ');
      ad.insertAdjacentElement('afterend', ic);
      if (patchSayisi) {
        var ac = document.createElement('button');
        ac.type = 'button';
        ac.className = 'kp-sepet-ac';
        ac.setAttribute('data-kp-patch-ac', id);
        ic.insertAdjacentElement('afterend', ac);
      }
    }
    var dugme = baz.querySelector('[data-kp-patch-ac]');
    if (dugme) {
      dugme.textContent = acik ? 'Patch\'leri gizle' : patchSayisi + ' patch\'i göster';
      dugme.setAttribute('aria-expanded', acik ? 'true' : 'false');
    }
    // Grubun toplam fiyatı: çanta + patch'lerin indirimli satır fiyatları
    var toplam = (Number(g.baz.final_line_price) || 0) + g.patchler.reduce(function (t, p) { return t + (Number(p.final_line_price) || 0); }, 0);
    var fiyat = baz.querySelector('.cart-item__price-wrapper');
    var yeni = '<span class="price price--end kp-sepet-toplam">' + para(toplam) + '</span>';
    if (fiyat && fiyat.innerHTML !== yeni) fiyat.innerHTML = yeni;
  }

  function isaretle() {
    if (calisiyor) {
      tekrar = true;
      return;
    }
    var mevcut = satirlar();
    // Görünür "Tasarım" özelliği olan satır yoksa sepeti hiç sorgulama
    var adayVar = mevcut.some(function (s) { return s.textContent.indexOf('Tasarım') !== -1; });
    if (!adayVar) return;
    calisiyor = true;
    sepetGetir()
      .then(function (sepet) {
        var kalemler = sepet.items || [];
        var tasarimVar = kalemler.some(function (k) { return k.properties && k.properties._tasarim_id; });
        if (!tasarimVar) return;
        var kapsayicilar = [];
        satirlar().forEach(function (satir) {
          var k = kalemler[satirNo(satir) - 1];
          var o = (k && k.properties) || {};
          if (!o._tasarim_id) {
            satir.classList.remove('kp-sepet-baz', 'kp-sepet-patch');
            satir.removeAttribute('data-kp-tasarim');
            return;
          }
          satir.setAttribute('data-kp-tasarim', o._tasarim_id);
          satir.setAttribute('data-kp-rol', o._tasarim_rol === 'baz' ? 'baz' : o._tasarim_rol === 'aksesuar' ? 'aksesuar' : 'patch');
          satir.classList.toggle('kp-sepet-baz', o._tasarim_rol === 'baz');
          satir.classList.toggle('kp-sepet-aksesuar', o._tasarim_rol === 'aksesuar');
          satir.classList.toggle('kp-sepet-patch', o._tasarim_rol !== 'baz' && o._tasarim_rol !== 'aksesuar');
          if (kapsayicilar.indexOf(satir.parentNode) === -1) kapsayicilar.push(satir.parentNode);
        });
        // Patch satırlarını kendi çantalarının hemen altına taşı (yalnızca sıra yanlışsa)
        kapsayicilar.forEach(function (kap) {
          var bazlar = kap.querySelectorAll(':scope > [data-kp-rol="baz"]');
          Array.prototype.forEach.call(bazlar, function (baz) {
            var id = baz.getAttribute('data-kp-tasarim');
            var onceki = baz;
            Array.prototype.forEach.call(kap.querySelectorAll(':scope > [data-kp-rol="patch"], :scope > [data-kp-rol="aksesuar"]'), function (p) {
              if (p.getAttribute('data-kp-tasarim') !== id) return;
              if (onceki.nextElementSibling !== p) onceki.after(p);
              onceki = p;
            });
            Array.prototype.forEach.call(kap.querySelectorAll(':scope > [data-kp-tasarim="' + id + '"]'), function (s) {
              s.classList.remove('kp-sepet-son');
            });
            onceki.classList.add('kp-sepet-son');
            grupSatirlariniDuzenle(sepet, kap, baz);
            if (!baz.querySelector('.kp-sepet-rozet')) {
              var ad = baz.querySelector('.cart-item__name');
              if (ad) {
                var rozet = document.createElement('span');
                rozet.className = 'kp-sepet-rozet';
                rozet.textContent = 'Kişiselleştirilmiş';
                ad.insertAdjacentElement('beforebegin', rozet);
              }
            }
          });
        });
      })
      .catch(function () {})
      .then(function () {
        calisiyor = false;
        if (tekrar) {
          tekrar = false;
          isaretle();
        }
      });
  }

  /* ---------------- Sepet güncelleme ---------------- */

  function yenidenCiz() {
    try {
      document.dispatchEvent(new CustomEvent('kisisel:sepet-degisti'));
    } catch (e) {
      /* eski tarayıcı */
    }
    if (/\/cart\/?$/.test(window.location.pathname)) {
      window.location.reload();
      return;
    }
    try {
      if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'kisisel-sepet' });
      }
    } catch (e) {
      /* yoksay */
    }
    fetch(window.location.pathname + '?sections=cart-icon-bubble')
      .then(function (r) { return r.json(); })
      .then(function (b) {
        var el = document.getElementById('cart-icon-bubble');
        if (el && b['cart-icon-bubble']) {
          var dom = new DOMParser().parseFromString(b['cart-icon-bubble'], 'text/html').querySelector('.shopify-section');
          if (dom) el.innerHTML = dom.innerHTML;
        }
      })
      .catch(function () {});
  }

  function postJson(url, govde) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(govde)
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || j.status) throw new Error(j.description || j.message || 'Sepet güncellenemedi.');
        return j;
      });
    });
  }

  function hataBildir(mesaj) {
    window.alert(mesaj);
  }

  function grupSil(grup) {
    var guncelle = {};
    if (grup.baz) guncelle[grup.baz.key] = 0;
    grup.patchler.forEach(function (p) { guncelle[p.key] = 0; });
    return postJson(rotalar().guncelle, { updates: guncelle });
  }

  // Konumdan bir varyantın (adet kadar) kaydını çıkarır
  function konumdanCikar(konumMetni, varyantId, adet) {
    try {
      var konum = JSON.parse(konumMetni || '{}');
      if (!konum.p) return konumMetni;
      var silinecek = adet;
      konum.p = konum.p.filter(function (x) {
        if (String(x.v) === String(varyantId) && silinecek > 0) {
          silinecek--;
          return false;
        }
        return true;
      });
      return JSON.stringify(konum);
    } catch (e) {
      return konumMetni;
    }
  }

  function ozellikKopya(k) {
    var o = {};
    Object.keys(k.properties || {}).forEach(function (a) { o[a] = k.properties[a]; });
    return o;
  }

  // Aksesuar satırını ve üzerindeki patch'leri siler; çanta satırının özeti ve konumu güncellenir
  function aksesuarSil(grup, aks) {
    var id = aks.properties._aksesuar_id;
    var guncelle = {};
    grup.patchler.forEach(function (p) { if ((p.properties || {})._aksesuar_id === id) guncelle[p.key] = 0; });
    return postJson(rotalar().guncelle, { updates: guncelle }).then(function () {
      if (!grup.baz) return;
      var kalan = grup.patchler.filter(function (p) { return (p.properties || {})._aksesuar_id !== id; });
      var ozellik = ozellikKopya(grup.baz);
      var yeni = ozetUret(kalan);
      if (yeni.ozet) ozellik['Tasarım'] = yeni.ozet;
      try {
        var konum = JSON.parse(ozellik._tasarim_konum || '{}');
        if (konum.p) konum.p = konum.p.filter(function (x) { return x.u !== id; });
        ozellik._tasarim_konum = JSON.stringify(konum);
      } catch (e) {
        /* konum bozuksa olduğu gibi */
      }
      return sepetGetir().then(function (sepet) {
        var baz = (sepet.items || []).filter(function (k) { return k.key === grup.baz.key; })[0];
        if (baz) return postJson(rotalar().degistir, { id: baz.key, quantity: baz.quantity, properties: ozellik });
      });
    });
  }

  // Aksesuarın üzerindeki bir patch silinir: aksesuar satırının tasarım özeti ve konumu, çantanın özeti güncellenir
  function aksesuarPatchSil(grup, patch) {
    var id = patch.properties._aksesuar_id;
    return postJson(rotalar().guncelle, { updates: (function () { var u = {}; u[patch.key] = 0; return u; })() }).then(function () {
      var kalan = grup.patchler.filter(function (p) { return p.key !== patch.key; });
      var aks = kalan.filter(function (p) { return (p.properties || {})._aksesuar_id === id && p.properties._tasarim_rol === 'aksesuar'; })[0];
      if (!aks) return;
      var aksOz = ozellikKopya(aks);
      var icOzet = ozetUret(kalan, id).ozet;
      if (icOzet) aksOz['Aksesuar tasarımı'] = icOzet;
      else delete aksOz['Aksesuar tasarımı'];
      aksOz._aksesuar_konum = konumdanCikar(aksOz._aksesuar_konum, patch.variant_id, parseInt(patch.properties._adet_birim, 10) || 1);
      if (!icOzet) delete aksOz._aksesuar_konum;
      aks.properties = aksOz;
      var bazOz = grup.baz ? ozellikKopya(grup.baz) : null;
      if (bazOz) {
        var yeni = ozetUret(kalan);
        if (yeni.ozet) bazOz['Tasarım'] = yeni.ozet;
        kalan.forEach(function (p) { if (p.properties && p.properties['Tasarım']) p.properties['Tasarım'] = bazOz['Tasarım']; });
        aksOz['Tasarım'] = bazOz['Tasarım'];
      }
      return sepetGetir().then(function (sepet) {
        var bul = function (key) { return (sepet.items || []).filter(function (k) { return k.key === key; })[0]; };
        var a = bul(aks.key);
        return (a ? postJson(rotalar().degistir, { id: a.key, quantity: a.quantity, properties: aksOz }) : Promise.resolve()).then(function () {
          if (!bazOz) return;
          return sepetGetir().then(function (s2) {
            var b = (s2.items || []).filter(function (k) { return k.key === grup.baz.key; })[0];
            if (b) return postJson(rotalar().degistir, { id: b.key, quantity: b.quantity, properties: bazOz });
          });
        });
      });
    });
  }

  function patchSil(grup, patch) {
    if ((patch.properties || {})._aksesuar_id) return aksesuarPatchSil(grup, patch);
    return postJson(rotalar().guncelle, { updates: (function () { var u = {}; u[patch.key] = 0; return u; })() }).then(function () {
      if (!grup.baz) return;
      var kalan = grup.patchler.filter(function (p) { return p.key !== patch.key; });
      var yeni = ozetUret(kalan);
      var ozellik = {};
      Object.keys(grup.baz.properties || {}).forEach(function (a) { ozellik[a] = grup.baz.properties[a]; });
      if (!kalan.length) {
        // Tasarımda hiç patch kalmadı: çanta düz çanta olarak kalır
        delete ozellik['Tasarım'];
        delete ozellik['İsim'];
        delete ozellik._tasarim_konum;
        ozellik._tasarim_rol = 'baz';
      } else {
        ozellik['Tasarım'] = yeni.ozet;
        if (yeni.isim) ozellik['İsim'] = yeni.isim;
        else delete ozellik['İsim'];
        try {
          var konum = JSON.parse(ozellik._tasarim_konum || '{}');
          if (konum.p && patch.properties._patch_sayisi) {
            // Hazır set satırı: setin tüm patch'lerinin konumu (aynı set örneği "ürün#sıra") çıkar
            var ilk = konum.p.filter(function (x) { return x.k && String(x.k).split('#')[0] === String(patch.product_id); })[0];
            if (ilk) konum.p = konum.p.filter(function (x) { return x.k !== ilk.k; });
            ozellik._tasarim_konum = JSON.stringify(konum);
          } else if (konum.p) {
            var silinecek = parseInt(patch.properties._adet_birim, 10) || 1;
            konum.p = konum.p.filter(function (x) {
              if (String(x.v) === String(patch.variant_id) && silinecek > 0) {
                silinecek--;
                return false;
              }
              return true;
            });
            ozellik._tasarim_konum = JSON.stringify(konum);
          }
        } catch (e) {
          /* konum bozuksa olduğu gibi kalsın */
        }
      }
      return sepetGetir().then(function (sepet) {
        var baz = (sepet.items || []).filter(function (k) { return k.key === grup.baz.key; })[0];
        if (!baz) return;
        return postJson(rotalar().degistir, { id: baz.key, quantity: baz.quantity, properties: ozellik });
      });
    });
  }

  function adetDegistir(grup, yeniAdet) {
    var guncelle = {};
    guncelle[grup.baz.key] = yeniAdet;
    grup.patchler.forEach(function (p) {
      var birim = parseInt(p.properties._adet_birim, 10) || Math.round(p.quantity / Math.max(1, grup.baz.quantity)) || 1;
      guncelle[p.key] = birim * yeniAdet;
    });
    return postJson(rotalar().guncelle, { updates: guncelle });
  }

  function grupBul(satir) {
    var id = satir.getAttribute('data-kp-tasarim');
    if (!id || !sonSepet) return null;
    var g = gruplar(sonSepet)[id];
    if (!g) return null;
    var kalem = sonSepet.items[satirNo(satir) - 1];
    return { grup: g, kalem: kalem };
  }

  function islem(soz) {
    document.documentElement.classList.add('kp-sepet-mesgul');
    return soz
      .catch(function (e) {
        hataBildir(e.message || 'Sepet güncellenemedi.');
      })
      .then(function () {
        document.documentElement.classList.remove('kp-sepet-mesgul');
        yenidenCiz();
      });
  }

  // "N patch'i göster" / "Patch'leri gizle"
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-kp-patch-ac]');
    if (!b) return;
    e.preventDefault();
    var id = b.getAttribute('data-kp-patch-ac');
    acikGruplar[id] = !acikGruplar[id];
    if (sonSepet) {
      var baz = b.closest('[data-kp-rol="baz"]');
      if (baz) grupSatirlariniDuzenle(sonSepet, baz.parentNode, baz);
    }
  });

  // Sil butonu (tema dinleyicisinden önce yakalanır)
  document.addEventListener(
    'click',
    function (e) {
      var buton = e.target.closest && e.target.closest('cart-remove-button, .cart-remove-button');
      if (!buton) return;
      var satir = buton.closest('[data-kp-tasarim]');
      if (!satir) return;
      var bilgi = grupBul(satir);
      if (!bilgi || !bilgi.kalem) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (satir.getAttribute('data-kp-rol') === 'baz') {
        if (!window.confirm('Çantayı silersen bu tasarıma ait tüm patch\'ler de sepetten çıkar. Devam edilsin mi?')) return;
        islem(grupSil(bilgi.grup));
      } else if (satir.getAttribute('data-kp-rol') === 'aksesuar') {
        if (!window.confirm('Aksesuarı silersen üzerindeki patch\'ler de sepetten çıkar. Devam edilsin mi?')) return;
        islem(aksesuarSil(bilgi.grup, bilgi.kalem));
      } else {
        if (!window.confirm('Bu patch\'i silersen tasarımın değişecek. Devam edilsin mi?')) return;
        islem(patchSil(bilgi.grup, bilgi.kalem));
      }
    },
    true
  );

  // Adet değişikliği (tema dinleyicisinden önce yakalanır)
  document.addEventListener(
    'change',
    function (e) {
      var girdi = e.target;
      if (!girdi.matches || !girdi.matches('input[name="updates[]"], .quantity__input')) return;
      var satir = girdi.closest('[data-kp-tasarim]');
      if (!satir) return;
      var bilgi = grupBul(satir);
      if (!bilgi || !bilgi.kalem) return;
      e.stopImmediatePropagation();
      var yeni = parseInt(girdi.value, 10);
      if (satir.getAttribute('data-kp-rol') !== 'baz') {
        // Patch adetleri çantaya bağlıdır; doğrudan değiştirilemez
        girdi.value = bilgi.kalem.quantity;
        return;
      }
      if (!(yeni >= 0) || yeni === bilgi.kalem.quantity) {
        girdi.value = bilgi.kalem.quantity;
        return;
      }
      if (yeni === 0) {
        if (!window.confirm('Çantayı silersen bu tasarıma ait tüm patch\'ler de sepetten çıkar. Devam edilsin mi?')) {
          girdi.value = bilgi.kalem.quantity;
          return;
        }
        islem(grupSil(bilgi.grup));
        return;
      }
      islem(adetDegistir(bilgi.grup, yeni));
    },
    true
  );

  // Sepet içeriği her yeniden çizildiğinde grupları işaretle
  var bekleyen = null;
  function planla() {
    if (bekleyen) return;
    bekleyen = setTimeout(function () {
      bekleyen = null;
      isaretle();
    }, 60);
  }
  function gozle() {
    var hedefler = [document.querySelector('cart-drawer'), document.querySelector('cart-items')].filter(Boolean);
    hedefler.forEach(function (h) {
      new MutationObserver(function (kayitlar) {
        var ilgili = kayitlar.some(function (k) {
          return Array.prototype.some.call(k.addedNodes, function (n) {
            return n.nodeType === 1 && (n.matches('.cart-item, cart-drawer-items, .drawer__inner, .js-contents') || n.querySelector('.cart-item'));
          });
        });
        if (ilgili) planla();
      }).observe(h, { childList: true, subtree: true });
    });
    planla();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gozle);
  else gozle();

  window.KisiselSepet = { ozetUret: ozetUret, yenile: isaretle };
})();
