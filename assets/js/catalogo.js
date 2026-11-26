(function () {
  'use strict';

  var config = window.ITUC_CONFIG;
  if (!config || !config.branches) {
    return;
  }

  var CATEGORY_COPY = {
    all: {
      title: 'Catálogo completo.',
      sub: 'Equipos seleccionados y accesorios con garantía.',
      docTitle: 'Catálogo — iTuc Cel | Tucumán & Salta',
    },
    celulares: {
      title: 'iPhone y Celulares.',
      sub: 'Nuevos sellados y seminuevos con garantía escrita.',
      docTitle: 'Celulares — iTuc Cel | Tucumán & Salta',
    },
    accesorios: {
      title: 'Accesorios & Ecosistema.',
      sub: 'Audio, Apple Watch, MagSafe y complementos originales.',
      docTitle: 'Accesorios — iTuc Cel | Tucumán & Salta',
    },
  };

  var STOCK_LABELS = {
    disponible: 'Disponible',
    ultimas: 'Últimas unidades',
    pedido: 'A pedido',
  };

  function buildWhatsAppUrl(branchKey, message) {
    var branch = config.branches[branchKey] || config.branches.tucuman;
    var text = message ? '?text=' + encodeURIComponent(message) : '';
    return 'https://wa.me/' + branch.whatsappNumber + text;
  }

  function hydrateBranchAndNavLinks() {
    document.querySelectorAll('[data-branch-field]').forEach(function (el) {
      var parts = el.getAttribute('data-branch-field').split('.');
      var branch = config.branches[parts[0]];
      if (branch && branch[parts[1]]) {
        el.textContent = branch[parts[1]];
      }
    });

    var isSubfolder = /\/ituc(\/|\/catalogo\.html)?$/i.test(window.location.pathname);
    document.querySelectorAll('[data-site-home]').forEach(function (link) {
      link.href = isSubfolder ? 'index.html' : '/';
    });
    document.querySelectorAll('[data-admin-link]').forEach(function (link) {
      link.href = isSubfolder ? 'admin.html' : '/admin';
    });
  }

  function initBranchPickerModal() {
    var modal = document.getElementById('branch-modal');
    var closeBtn = document.getElementById('branch-modal-close');
    var contextText = document.getElementById('branch-modal-context');
    var linkTucuman = document.getElementById('modal-wa-tucuman');
    var linkSalta = document.getElementById('modal-wa-salta');

    if (!modal) return;

    var lastTrigger = null;

    function openModal(contextLabel, trigger) {
      lastTrigger = trigger || null;
      var context = contextLabel || 'Consulta de catálogo';

      if (contextText) {
        contextText.textContent = 'Consulta: ' + context + '. Elegí tu sucursal:';
      }
      if (linkTucuman) {
        linkTucuman.href = buildWhatsAppUrl(
          'tucuman',
          'Hola iTuc Cel (Tucumán)! Quiero consultar sobre: ' + context + '.'
        );
      }
      if (linkSalta) {
        linkSalta.href = buildWhatsAppUrl(
          'salta',
          'Hola iTuc Cel (Salta)! Quiero consultar sobre: ' + context + '.'
        );
      }

      modal.hidden = false;
      if (closeBtn) closeBtn.focus();
    }

    function closeModal() {
      modal.hidden = true;
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
    }

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-open-branch-picker]');
      if (trigger) {
        openModal(trigger.getAttribute('data-wa-context'), trigger);
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', function (event) {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) {
        closeModal();
      }
    });
  }

  function createArrowIcon() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 12h14m-6-6 6 6-6 6');
    svg.appendChild(path);
    return svg;
  }

  function initCatalogPage() {
    var grid = document.getElementById('catalog-grid');
    var filterButtons = document.querySelectorAll('[data-catalog-filter]');
    var pageTitle = document.getElementById('catalog-page-title');
    var pageSub = document.getElementById('catalog-page-sub');

    if (!grid) return;

    var params = new URLSearchParams(window.location.search);
    var initialCat = (params.get('cat') || 'all').toLowerCase();
    var activeFilter = CATEGORY_COPY[initialCat] ? initialCat : 'all';
    var allProducts = [];

    function syncFilterUI(updateHistory) {
      var copy = CATEGORY_COPY[activeFilter] || CATEGORY_COPY.all;
      if (pageTitle) pageTitle.textContent = copy.title;
      if (pageSub) pageSub.textContent = copy.sub;
      document.title = copy.docTitle;

      filterButtons.forEach(function (btn) {
        var isMatch = btn.getAttribute('data-catalog-filter') === activeFilter;
        btn.classList.toggle('is-active', isMatch);
        btn.setAttribute('aria-pressed', String(isMatch));
      });

      if (updateHistory && window.history && window.history.replaceState) {
        var nextUrl =
          activeFilter === 'all'
            ? window.location.pathname
            : window.location.pathname + '?cat=' + encodeURIComponent(activeFilter);
        window.history.replaceState(null, '', nextUrl);
      }
    }

    function renderProducts() {
      grid.innerHTML = '';

      var filtered = allProducts.filter(function (item) {
        if (item.visible === false) return false;
        if (activeFilter === 'all') return true;
        return item.category === activeFilter;
      });

      if (!filtered.length) {
        var emptyCard = document.createElement('div');
        emptyCard.className = 'card catalog-empty';
        emptyCard.textContent = 'No hay productos publicados en esta categoría por el momento.';
        grid.appendChild(emptyCard);
        return;
      }

      filtered.forEach(function (item) {
        var card = document.createElement('article');
        card.className = 'card catalog-card';

        var media = document.createElement('div');
        media.className = 'catalog-media';

        var img = document.createElement('img');
        img.src = item.image || 'assets/img/cat-iphones.png';
        img.alt = item.title || 'Producto iTuc Cel';
        img.width = 800;
        img.height = 500;
        img.loading = 'lazy';
        media.appendChild(img);

        var stockKey = STOCK_LABELS[item.stock] ? item.stock : 'disponible';
        var badge = document.createElement('span');
        badge.className = 'stock-badge is-' + stockKey;
        badge.textContent = STOCK_LABELS[stockKey];
        media.appendChild(badge);

        var body = document.createElement('div');
        body.className = 'catalog-body';

        var meta = document.createElement('div');
        meta.className = 'catalog-meta';

        var title = document.createElement('h3');
        title.textContent = item.title || '';
        meta.appendChild(title);

        if (item.subtitle) {
          var sub = document.createElement('p');
          sub.className = 'catalog-sub';
          sub.textContent = item.subtitle;
          meta.appendChild(sub);
        }

        var bottom = document.createElement('div');
        bottom.className = 'catalog-bottom';

        var price = document.createElement('span');
        price.className = 'catalog-price';
        price.textContent = item.price || 'Consultar';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary btn-sm';
        btn.setAttribute('data-open-branch-picker', '');
        var contextText = item.subtitle ? item.title + ' (' + item.subtitle + ')' : item.title;
        btn.setAttribute('data-wa-context', contextText || 'Catálogo');

        var btnText = document.createElement('span');
        btnText.textContent = 'Consultar';
        btn.appendChild(btnText);
        btn.appendChild(createArrowIcon());

        bottom.appendChild(price);
        bottom.appendChild(btn);

        body.appendChild(meta);
        body.appendChild(bottom);

        card.appendChild(media);
        card.appendChild(body);
        grid.appendChild(card);
      });
    }

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeFilter = btn.getAttribute('data-catalog-filter') || 'all';
        syncFilterUI(true);
        renderProducts();
      });
    });

    function loadFromLocalSeed() {
      return fetch('data/products.json', { cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) throw new Error('Seed HTTP ' + res.status);
          return res.json();
        })
        .then(function (list) {
          allProducts = Array.isArray(list) ? list : [];
          renderProducts();
        })
        .catch(function () {
          allProducts = [];
          renderProducts();
        });
    }

    syncFilterUI(false);

    fetch('/api/products', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('API HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        if (payload && payload.storage && payload.storage.mode === 'ephemeral') {
          try {
            var cached = localStorage.getItem('ituc_demo_products');
            if (cached) {
              var parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) {
                allProducts = parsed;
                renderProducts();
                return;
              }
            }
          } catch (e) {
            // Ignorar storage bloqueado
          }
        }
        allProducts = Array.isArray(payload.products) ? payload.products : [];
        renderProducts();
      })
      .catch(function () {
        loadFromLocalSeed();
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    hydrateBranchAndNavLinks();
    initBranchPickerModal();
    initCatalogPage();
  });
})();
