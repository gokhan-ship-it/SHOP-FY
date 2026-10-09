/* Text To Next PRO - landing sayfasi. Yalnizca layout/pro.liquid yukler. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var designMode = !!(window.Shopify && window.Shopify.designMode);

  /* ---------- Ust bar: kaydirinca zemin ---------- */
  function initBar() {
    var bar = document.querySelector('[data-pro-bar]');
    if (!bar) return;
    var ticking = false;
    function update() {
      bar.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Kaydirmada belirme ---------- */
  function initReveal(root) {
    var items = (root || document).querySelectorAll('.pro-reveal:not(.is-in)');
    if (!items.length) return;
    if (!document.documentElement.classList.contains('pro-js') || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Konsept secici ---------- */
  function KonseptPicker(root) {
    this.root = root;
    this.phone = root.querySelector('[data-pro-phone]');
    this.ui = root.querySelector('[data-pro-ui]');
    this.tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    this.nameEl = root.querySelector('[data-k-name]');
    this.dateEl = root.querySelector('[data-k-date]');
    this.timer = null;
    this.autoplay = !reduceMotion.matches && !designMode && this.tabs.length > 1;
    this.swapTimer = null;
    if (!this.phone || !this.tabs.length) return;
    this.bind();
  }

  KonseptPicker.prototype.bind = function () {
    var self = this;
    this.tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { self.stop(); self.select(i, true); });
      tab.addEventListener('keydown', function (e) {
        var n = self.tabs.length, next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = n - 1;
        if (next !== null) { e.preventDefault(); self.stop(); self.select(next, true); self.tabs[next].focus(); }
      });
    });

    if (this.autoplay && 'IntersectionObserver' in window) {
      // Kullanici dokunana kadar, sahne gorunurken konseptleri sakin bir ritimle gezdir.
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!self.autoplay) return;
          if (e.isIntersecting) self.start(); else self.pause();
        });
      }, { threshold: 0.5 }).observe(this.phone);
    }
  };

  KonseptPicker.prototype.current = function () {
    for (var i = 0; i < this.tabs.length; i++) {
      if (this.tabs[i].getAttribute('aria-selected') === 'true') return i;
    }
    return 0;
  };

  KonseptPicker.prototype.select = function (i, userInitiated) {
    var tab = this.tabs[i];
    if (!tab) return;
    var id = tab.getAttribute('data-konsept');
    var self = this;

    this.tabs.forEach(function (t, j) {
      var on = j === i;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.setAttribute('tabindex', on ? '0' : '-1');
    });
    if (userInitiated && tab.scrollIntoView && tab.parentNode.scrollWidth > tab.parentNode.clientWidth) {
      tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }

    // Doku katmanlari capraz gecis yapar; renk degiskenleri CSS'te gecis yapar.
    this.root.querySelectorAll('[data-tex]').forEach(function (el) {
      el.classList.toggle('is-active', el.getAttribute('data-tex') === id);
    });

    var apply = function () {
      self.phone.setAttribute('data-konsept', id);
      if (self.nameEl) self.nameEl.textContent = tab.getAttribute('data-name') || '';
      if (self.dateEl) self.dateEl.textContent = tab.getAttribute('data-date') || '';
      self.root.querySelectorAll('[data-logo]').forEach(function (el) {
        el.classList.toggle('is-active', el.getAttribute('data-logo') === id);
      });
    };

    if (reduceMotion.matches || !this.ui) { apply(); return; }

    // Yazi tipi gecis yapamadigi icin icerik kisa bir an soner, zemin renkleri akarken degisir.
    window.clearTimeout(this.swapTimer);
    this.ui.classList.add('is-out');
    this.swapTimer = window.setTimeout(function () {
      apply();
      window.requestAnimationFrame(function () { self.ui.classList.remove('is-out'); });
    }, 180);
  };

  KonseptPicker.prototype.start = function () {
    var self = this;
    if (this.timer || !this.autoplay) return;
    this.timer = window.setInterval(function () {
      if (document.hidden) return;
      self.select((self.current() + 1) % self.tabs.length, false);
    }, 3200);
  };
  KonseptPicker.prototype.pause = function () {
    window.clearInterval(this.timer);
    this.timer = null;
  };
  KonseptPicker.prototype.stop = function () {
    this.autoplay = false;
    this.pause();
  };

  var pickers = [];
  function initPickers(scope) {
    (scope || document).querySelectorAll('[data-pro-konsept]').forEach(function (el) {
      if (el.__proPicker) return;
      el.__proPicker = new KonseptPicker(el);
      pickers.push(el.__proPicker);
    });
  }

  function init() {
    initBar();
    initReveal();
    initPickers();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* ---------- Tema editoru ---------- */
  document.addEventListener('shopify:section:load', function (e) {
    initPickers(e.target);
    e.target.querySelectorAll('.pro-reveal').forEach(function (el) { el.classList.add('is-in'); });
  });
  document.addEventListener('shopify:block:select', function (e) {
    var tab = e.target;
    if (!tab || tab.getAttribute('role') !== 'tab') return;
    var root = tab.closest('[data-pro-konsept]');
    if (!root || !root.__proPicker) return;
    var p = root.__proPicker;
    p.stop();
    p.select(p.tabs.indexOf(tab), true);
  });
})();
