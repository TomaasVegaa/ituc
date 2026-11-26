(function () {
  'use strict';

  var config = window.ITUC_CONFIG;
  if (!config || !config.branches) {
    return;
  }

  function buildWhatsAppUrl(branchKey, message) {
    var branch = config.branches[branchKey] || config.branches.tucuman;
    var text = message ? '?text=' + encodeURIComponent(message) : '';
    return 'https://wa.me/' + branch.whatsappNumber + text;
  }

  function hydrateBranchData() {
    document.querySelectorAll('[data-branch-field]').forEach(function (el) {
      var parts = el.getAttribute('data-branch-field').split('.');
      var branch = config.branches[parts[0]];
      if (branch && branch[parts[1]]) {
        el.textContent = branch[parts[1]];
      }
    });

    document.querySelectorAll('[data-branch-map]').forEach(function (el) {
      var branch = config.branches[el.getAttribute('data-branch-map')];
      if (branch) {
        el.href = branch.mapDirectUrl;
      }
    });

    document.querySelectorAll('[data-wa-branch]').forEach(function (el) {
      var branchKey = el.getAttribute('data-wa-branch');
      var branch = config.branches[branchKey];
      if (branch) {
        el.href = buildWhatsAppUrl(
          branchKey,
          'Hola iTuc Cel (' + branch.name + '), quiero hacer una consulta.'
        );
      }
    });

    var igLink = document.getElementById('instagram-link');
    if (igLink && config.brand.instagramUrl) {
      igLink.href = config.brand.instagramUrl;
    }
  }

  function initHeaderAndMobileMenu() {
    var header = document.getElementById('site-header');
    var toggle = document.getElementById('menu-toggle');
    var mobileNav = document.getElementById('mobile-nav');

    function updateScrollState() {
      if (!header) return;
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    }

    window.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();

    if (!toggle || !mobileNav) return;

    function setMenuOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      mobileNav.hidden = !open;
    }

    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      setMenuOpen(!isOpen);
    });

    mobileNav.querySelectorAll('a, button').forEach(function (item) {
      item.addEventListener('click', function () {
        setMenuOpen(false);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false);
        toggle.focus();
      }
    });
  }

  function initBranchMapSwitcher() {
    var buttons = document.querySelectorAll('[data-branch-select]');
    var cards = document.querySelectorAll('[data-branch-card]');
    var iframe = document.getElementById('branch-map');
    var overlayTitle = document.getElementById('map-overlay-title');
    var overlayAddr = document.getElementById('map-overlay-addr');
    var overlayLink = document.getElementById('map-overlay-link');

    if (!buttons.length || !iframe) return;

    function selectBranch(branchKey) {
      var branch = config.branches[branchKey];
      if (!branch) return;

      cards.forEach(function (card) {
        card.classList.toggle('is-active', card.getAttribute('data-branch-card') === branchKey);
      });

      buttons.forEach(function (btn) {
        var active = btn.getAttribute('data-branch-select') === branchKey;
        btn.setAttribute('aria-pressed', String(active));
      });

      if (iframe.getAttribute('src') !== branch.mapEmbedUrl) {
        iframe.src = branch.mapEmbedUrl;
      }
      iframe.title = 'Mapa de sucursal iTuc Cel - ' + branch.name;

      if (overlayTitle) overlayTitle.textContent = 'Sucursal ' + branch.name;
      if (overlayAddr) overlayAddr.textContent = branch.address;
      if (overlayLink) overlayLink.href = branch.mapDirectUrl;
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectBranch(btn.getAttribute('data-branch-select'));
      });
    });
  }

  function initRepairForm() {
    var form = document.getElementById('repair-form');
    if (!form) return;

    var branchInputs = form.querySelectorAll('input[name="repairBranch"]');
    var deviceInput = document.getElementById('repair-device');
    var issueInput = document.getElementById('repair-issue');
    var nameInput = document.getElementById('repair-name');
    var notesInput = document.getElementById('repair-notes');
    var submitBtn = document.getElementById('repair-submit');
    var submitLabel = document.getElementById('repair-submit-label');
    var feedback = document.getElementById('repair-feedback');
    var summary = document.getElementById('repair-summary');
    var manualLink = document.getElementById('repair-manual-link');

    function getSelectedBranchKey() {
      var checked = form.querySelector('input[name="repairBranch"]:checked');
      return checked ? checked.value : 'tucuman';
    }

    function updateSubmitBranchLabel() {
      var branch = config.branches[getSelectedBranchKey()];
      if (submitLabel && branch) {
        submitLabel.textContent = 'Enviar a Service ' + branch.name;
      }
    }

    branchInputs.forEach(function (radio) {
      radio.addEventListener('change', updateSubmitBranchLabel);
    });
    updateSubmitBranchLabel();

    function validateField(input, errorId, message) {
      var errorEl = document.getElementById(errorId);
      var value = (input.value || '').trim();
      var valid = value.length > 0;
      input.classList.toggle('is-invalid', !valid);
      input.setAttribute('aria-invalid', String(!valid));
      if (errorEl) {
        errorEl.textContent = valid ? '' : message;
      }
      return valid;
    }

    deviceInput.addEventListener('blur', function () {
      validateField(deviceInput, 'error-device', 'Elegí tu dispositivo.');
    });
    deviceInput.addEventListener('change', function () {
      validateField(deviceInput, 'error-device', 'Elegí tu dispositivo.');
    });

    issueInput.addEventListener('blur', function () {
      validateField(issueInput, 'error-issue', 'Elegí el servicio o falla.');
    });
    issueInput.addEventListener('change', function () {
      validateField(issueInput, 'error-issue', 'Elegí el servicio o falla.');
    });

    nameInput.addEventListener('blur', function () {
      validateField(nameInput, 'error-name', 'Ingresá tu nombre.');
    });
    nameInput.addEventListener('input', function () {
      if (nameInput.classList.contains('is-invalid')) {
        validateField(nameInput, 'error-name', 'Ingresá tu nombre.');
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var isDeviceValid = validateField(deviceInput, 'error-device', 'Elegí tu dispositivo.');
      var isIssueValid = validateField(issueInput, 'error-issue', 'Elegí el servicio o falla.');
      var isNameValid = validateField(nameInput, 'error-name', 'Ingresá tu nombre.');

      if (!isDeviceValid || !isIssueValid || !isNameValid) {
        var firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var branchKey = getSelectedBranchKey();
      var branch = config.branches[branchKey];
      var device = deviceInput.value.trim();
      var issue = issueInput.value.trim();
      var clientName = nameInput.value.trim();
      var notes = (notesInput.value || '').trim();

      var lines = [
        'Hola iTuc Care (' + branch.name + '), quiero solicitar turno de service:',
        '- Nombre: ' + clientName,
        '- Equipo: ' + device,
        '- Servicio: ' + issue,
      ];
      if (notes) {
        lines.push('- Detalle: ' + notes);
      }

      var waUrl = buildWhatsAppUrl(branchKey, lines.join('\n'));

      submitBtn.disabled = true;
      submitLabel.textContent = 'Preparando WhatsApp...';

      window.setTimeout(function () {
        submitBtn.disabled = false;
        updateSubmitBranchLabel();

        if (summary) {
          summary.textContent =
            'Sucursal ' + branch.name + ' · ' + device + ' (' + issue + ').';
        }
        if (manualLink) {
          manualLink.href = waUrl;
        }
        if (feedback) {
          feedback.hidden = false;
        }

        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }, 220);
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
      var context = contextLabel || 'Consulta general';

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

  function initDynamicCatalog() {
    var grid = document.getElementById('catalog-grid');
    var filterButtons = document.querySelectorAll('[data-catalog-filter]');
    if (!grid) return;

    var STOCK_LABELS = {
      disponible: 'Disponible',
      ultimas: 'Últimas unidades',
      pedido: 'A pedido',
    };

    var allProducts = [];
    var activeFilter = 'all';

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
        filterButtons.forEach(function (other) {
          var isMatch = other === btn;
          other.classList.toggle('is-active', isMatch);
          other.setAttribute('aria-pressed', String(isMatch));
        });
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

  function adjustAdminLink() {
    var link = document.querySelector('[data-admin-link]');
    if (!link) return;
    if (/\/ituc(\/|\/index\.html)?$/i.test(window.location.pathname)) {
      link.href = 'admin.html';
    }
  }

  function initScrollReveal() {
    var elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      elements.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
    );

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    hydrateBranchData();
    adjustAdminLink();
    initHeaderAndMobileMenu();
    initDynamicCatalog();
    initBranchMapSwitcher();
    initRepairForm();
    initBranchPickerModal();
    initScrollReveal();
  });
})();
