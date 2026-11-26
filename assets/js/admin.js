(function () {
  'use strict';

  var STOCK_LABELS = {
    disponible: 'Disponible',
    ultimas: 'Últimas unidades',
    pedido: 'A pedido',
  };

  var CATEGORY_LABELS = {
    celulares: 'Celulares',
    accesorios: 'Accesorios',
  };

  var state = {
    products: [],
    filter: 'all',
    storage: null,
    token: '',
    pendingDeleteId: '',
    lastTrigger: null,
  };

  var loginView = document.getElementById('admin-login-view');
  var dashboardView = document.getElementById('admin-dashboard-view');
  var apiNotice = document.getElementById('api-unavailable-notice');
  var loginForm = document.getElementById('admin-login-form');
  var passwordInput = document.getElementById('admin-password');
  var togglePasswordBtn = document.getElementById('toggle-password-btn');
  var loginError = document.getElementById('login-error');
  var loginSubmitBtn = document.getElementById('login-submit-btn');
  var demoHint = document.getElementById('demo-password-hint');

  var storageBadge = document.getElementById('storage-badge');
  var ephemeralBanner = document.getElementById('ephemeral-banner');
  var logoutBtn = document.getElementById('logout-btn');
  var newProductBtn = document.getElementById('new-product-btn');
  var filterButtons = document.querySelectorAll('[data-admin-filter]');
  var productList = document.getElementById('admin-product-list');

  var productModal = document.getElementById('product-modal');
  var productModalTitle = document.getElementById('product-modal-title');
  var productModalClose = document.getElementById('product-modal-close');
  var productCancelBtn = document.getElementById('product-cancel-btn');
  var productForm = document.getElementById('product-form');
  var productIdInput = document.getElementById('product-id');
  var productTitleInput = document.getElementById('product-title');
  var productCategoryInput = document.getElementById('product-category');
  var productStockInput = document.getElementById('product-stock');
  var productSubtitleInput = document.getElementById('product-subtitle');
  var productPriceInput = document.getElementById('product-price');
  var productImageUrlInput = document.getElementById('product-image-url');
  var productImageFileInput = document.getElementById('product-image-file');
  var productImagePreview = document.getElementById('product-image-preview');
  var productVisibleInput = document.getElementById('product-visible');
  var productSaveBtn = document.getElementById('product-save-btn');
  var errorTitle = document.getElementById('error-product-title');
  var errorImage = document.getElementById('error-product-image');

  var deleteModal = document.getElementById('delete-modal');
  var deleteModalClose = document.getElementById('delete-modal-close');
  var deleteCancelBtn = document.getElementById('delete-cancel-btn');
  var deleteConfirmBtn = document.getElementById('delete-confirm-btn');
  var deleteModalDesc = document.getElementById('delete-modal-desc');

  var toastEl = document.getElementById('admin-toast');
  var toastTimer = null;

  function adjustSiteLinks() {
    var isSubfolder = /\/ituc(\/|\/admin\.html)?$/i.test(window.location.pathname);
    document.querySelectorAll('[data-site-home]').forEach(function (el) {
      el.href = isSubfolder ? 'index.html' : '/';
    });
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.hidden = true;
    }, 3000);
  }

  function apiFetch(url, options) {
    var opts = Object.assign({ credentials: 'same-origin' }, options || {});
    var headers = Object.assign({}, opts.headers || {});
    if (state.token) {
      headers.Authorization = 'Bearer ' + state.token;
    }
    opts.headers = headers;
    return fetch(url, opts).then(function (res) {
      return res
        .json()
        .catch(function () {
          return null;
        })
        .then(function (data) {
          return { status: res.status, ok: res.ok, data: data };
        });
    });
  }

  function updateStorageUI(storage) {
    state.storage = storage || null;
    if (!storageBadge || !storage) return;
    storageBadge.textContent = storage.label || 'Almacenamiento';
    storageBadge.classList.toggle('is-persistent', Boolean(storage.persistent));
    storageBadge.classList.toggle('is-ephemeral', storage.mode === 'ephemeral');

    if (ephemeralBanner) {
      ephemeralBanner.hidden = storage.mode !== 'ephemeral';
    }

    if (storage.mode === 'ephemeral') {
      try {
        localStorage.setItem('ituc_demo_products', JSON.stringify(state.products));
      } catch (e) {
        // Ignorar storage bloqueado
      }
    }
  }

  function createSvgIcon(paths) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    paths.forEach(function (d) {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    });
    return svg;
  }

  function renderProducts() {
    if (!productList) return;
    productList.innerHTML = '';

    var filtered = state.products.filter(function (item) {
      return state.filter === 'all' || item.category === state.filter;
    });

    if (!filtered.length) {
      var empty = document.createElement('div');
      empty.className = 'card catalog-empty';
      empty.textContent = 'No hay productos en esta vista. Tocá "Nuevo producto" para cargar uno.';
      productList.appendChild(empty);
      return;
    }

    var canReorder = state.filter === 'all';

    filtered.forEach(function (item, idx) {
      var row = document.createElement('article');
      row.className = 'card admin-row' + (item.visible === false ? ' is-hidden-item' : '');

      var main = document.createElement('div');
      main.className = 'admin-row-main';

      var thumb = document.createElement('img');
      thumb.className = 'admin-thumb';
      thumb.src = item.image || 'assets/img/cat-iphones.png';
      thumb.alt = item.title || 'Producto';
      thumb.width = 88;
      thumb.height = 58;
      main.appendChild(thumb);

      var info = document.createElement('div');
      info.className = 'admin-row-info';

      var titleLine = document.createElement('div');
      titleLine.className = 'admin-row-title-line';

      var h3 = document.createElement('h3');
      h3.textContent = item.title;
      titleLine.appendChild(h3);

      var catTag = document.createElement('span');
      catTag.className = 'admin-cat-tag';
      catTag.textContent = CATEGORY_LABELS[item.category] || 'Celulares';
      titleLine.appendChild(catTag);

      info.appendChild(titleLine);

      if (item.subtitle) {
        var sub = document.createElement('p');
        sub.className = 'admin-row-sub';
        sub.textContent = item.subtitle;
        info.appendChild(sub);
      }

      var meta = document.createElement('div');
      meta.className = 'admin-row-meta';

      var priceSpan = document.createElement('span');
      priceSpan.className = 'admin-row-price';
      priceSpan.textContent = item.price || 'Consultar';
      meta.appendChild(priceSpan);

      var stockSpan = document.createElement('span');
      stockSpan.textContent = '· ' + (STOCK_LABELS[item.stock] || 'Disponible');
      meta.appendChild(stockSpan);

      var visLabel = document.createElement('span');
      visLabel.textContent = item.visible === false ? '· Oculto en la web' : '· Visible en la web';
      meta.appendChild(visLabel);

      info.appendChild(meta);
      main.appendChild(info);

      var actions = document.createElement('div');
      actions.className = 'admin-row-actions';

      var upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'icon-btn';
      upBtn.title = canReorder ? 'Subir posición' : 'Mostrá "Todos" para reordenar';
      upBtn.setAttribute('aria-label', 'Subir ' + item.title);
      upBtn.disabled = !canReorder || idx === 0;
      upBtn.appendChild(createSvgIcon(['m18 15-6-6-6 6']));
      upBtn.addEventListener('click', function () {
        moveProduct(item.id, -1);
      });

      var downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'icon-btn';
      downBtn.title = canReorder ? 'Bajar posición' : 'Mostrá "Todos" para reordenar';
      downBtn.setAttribute('aria-label', 'Bajar ' + item.title);
      downBtn.disabled = !canReorder || idx === filtered.length - 1;
      downBtn.appendChild(createSvgIcon(['m6 9 6 6 6-6']));
      downBtn.addEventListener('click', function () {
        moveProduct(item.id, 1);
      });

      var visBtn = document.createElement('button');
      visBtn.type = 'button';
      visBtn.className = 'icon-btn' + (item.visible !== false ? ' is-active' : '');
      visBtn.setAttribute('aria-label', (item.visible !== false ? 'Ocultar ' : 'Mostrar ') + item.title);
      var visText = document.createElement('span');
      visText.textContent = item.visible !== false ? 'Visible' : 'Oculto';
      visBtn.appendChild(visText);
      visBtn.addEventListener('click', function () {
        toggleVisibility(item);
      });

      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'icon-btn';
      editBtn.setAttribute('aria-label', 'Editar ' + item.title);
      editBtn.appendChild(createSvgIcon(['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z']));
      var editText = document.createElement('span');
      editText.textContent = 'Editar';
      editBtn.appendChild(editText);
      editBtn.addEventListener('click', function () {
        openProductModal(item, editBtn);
      });

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'icon-btn is-danger';
      delBtn.setAttribute('aria-label', 'Eliminar ' + item.title);
      delBtn.appendChild(createSvgIcon(['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2']));
      delBtn.addEventListener('click', function () {
        openDeleteModal(item, delBtn);
      });

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(visBtn);
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      row.appendChild(main);
      row.appendChild(actions);
      productList.appendChild(row);
    });
  }

  function loadAdminProducts() {
    return apiFetch('/api/products?all=1').then(function (res) {
      if (res.status === 401) {
        showLoginView();
        return;
      }
      if (!res.ok || !res.data) {
        showToast('No se pudieron cargar los productos.');
        return;
      }
      state.products = Array.isArray(res.data.products) ? res.data.products : [];
      updateStorageUI(res.data.storage);
      renderProducts();
    });
  }

  function moveProduct(id, delta) {
    var idx = state.products.findIndex(function (p) {
      return p.id === id;
    });
    var nextIdx = idx + delta;
    if (idx === -1 || nextIdx < 0 || nextIdx >= state.products.length) return;

    var copy = state.products.slice();
    var moved = copy.splice(idx, 1)[0];
    copy.splice(nextIdx, 0, moved);
    state.products = copy;
    renderProducts();

    apiFetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderedIds: copy.map(function (p) {
          return p.id;
        }),
      }),
    }).then(function (res) {
      if (!res.ok || !res.data) {
        showToast('Error al guardar el orden.');
        loadAdminProducts();
        return;
      }
      state.products = res.data.products;
      updateStorageUI(res.data.storage);
      renderProducts();
      showToast('Orden actualizado.');
    });
  }

  function toggleVisibility(item) {
    var nextVisible = item.visible === false;
    apiFetch('/api/products/' + encodeURIComponent(item.id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: nextVisible }),
    }).then(function (res) {
      if (!res.ok || !res.data) {
        showToast('No se pudo actualizar visibilidad.');
        return;
      }
      state.products = res.data.products;
      updateStorageUI(res.data.storage);
      renderProducts();
      showToast(nextVisible ? 'Producto visible en la web.' : 'Producto ocultado.');
    });
  }

  function updateImagePreview(src) {
    if (!productImagePreview) return;
    productImagePreview.src = src || 'assets/img/cat-iphones.png';
  }

  function openProductModal(item, trigger) {
    state.lastTrigger = trigger || null;
    if (errorTitle) errorTitle.textContent = '';
    if (errorImage) errorImage.textContent = '';

    if (item) {
      productModalTitle.textContent = 'Editar producto';
      productIdInput.value = item.id;
      productTitleInput.value = item.title || '';
      productCategoryInput.value = item.category || 'celulares';
      productStockInput.value = item.stock || 'disponible';
      productSubtitleInput.value = item.subtitle || '';
      productPriceInput.value = item.price || '';
      productImageUrlInput.value = item.image || 'assets/img/cat-iphones.png';
      productVisibleInput.checked = item.visible !== false;
    } else {
      productModalTitle.textContent = 'Nuevo producto';
      productIdInput.value = '';
      productTitleInput.value = '';
      productCategoryInput.value = state.filter === 'accesorios' ? 'accesorios' : 'celulares';
      productStockInput.value = 'disponible';
      productSubtitleInput.value = '';
      productPriceInput.value = '';
      productImageUrlInput.value =
        productCategoryInput.value === 'accesorios'
          ? 'assets/img/cat-ecosystem.png'
          : 'assets/img/cat-iphones.png';
      productVisibleInput.checked = true;
    }

    updateImagePreview(productImageUrlInput.value);
    productModal.hidden = false;
    productTitleInput.focus();
  }

  function closeProductModal() {
    productModal.hidden = true;
    if (state.lastTrigger && typeof state.lastTrigger.focus === 'function') {
      state.lastTrigger.focus();
    }
  }

  function openDeleteModal(item, trigger) {
    state.pendingDeleteId = item.id;
    state.lastTrigger = trigger || null;
    if (deleteModalDesc) {
      deleteModalDesc.textContent = '¿Seguro que querés eliminar "' + item.title + '"?';
    }
    deleteModal.hidden = false;
    deleteConfirmBtn.focus();
  }

  function closeDeleteModal() {
    deleteModal.hidden = true;
    state.pendingDeleteId = '';
    if (state.lastTrigger && typeof state.lastTrigger.focus === 'function') {
      state.lastTrigger.focus();
    }
  }

  function compressImageFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var maxW = 800;
          var scale = img.width > maxW ? maxW / img.width : 1;
          var w = Math.max(1, Math.round(img.width * scale));
          var h = Math.max(1, Math.round(img.height * scale));
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = function () {
          reject(new Error('No se pudo leer la imagen.'));
        };
        img.src = reader.result;
      };
      reader.onerror = function () {
        reject(new Error('No se pudo leer el archivo.'));
      };
      reader.readAsDataURL(file);
    });
  }

  function showDashboardView() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    loadAdminProducts();
  }

  function showLoginView() {
    dashboardView.hidden = true;
    loginView.hidden = false;
  }

  function bindEvents() {
    if (togglePasswordBtn && passwordInput) {
      togglePasswordBtn.addEventListener('click', function () {
        var show = passwordInput.type === 'password';
        passwordInput.type = show ? 'text' : 'password';
        togglePasswordBtn.setAttribute('aria-pressed', String(show));
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        loginError.textContent = '';
        var pwd = passwordInput.value;
        if (!pwd) {
          loginError.textContent = 'Ingresá tu contraseña.';
          passwordInput.focus();
          return;
        }

        loginSubmitBtn.disabled = true;
        apiFetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd }),
        }).then(function (res) {
          loginSubmitBtn.disabled = false;
          if (!res.ok || !res.data || !res.data.authenticated) {
            loginError.textContent =
              (res.data && res.data.error) || 'Contraseña incorrecta.';
            passwordInput.focus();
            return;
          }
          state.token = res.data.token || '';
          passwordInput.value = '';
          showDashboardView();
        });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        apiFetch('/api/auth', { method: 'DELETE' }).then(function () {
          state.token = '';
          showLoginView();
        });
      });
    }

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.filter = btn.getAttribute('data-admin-filter') || 'all';
        filterButtons.forEach(function (other) {
          var active = other === btn;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-pressed', String(active));
        });
        renderProducts();
      });
    });

    if (newProductBtn) {
      newProductBtn.addEventListener('click', function () {
        openProductModal(null, newProductBtn);
      });
    }

    if (productModalClose) productModalClose.addEventListener('click', closeProductModal);
    if (productCancelBtn) productCancelBtn.addEventListener('click', closeProductModal);
    if (productModal) {
      productModal.addEventListener('click', function (event) {
        if (event.target === productModal) closeProductModal();
      });
    }

    document.querySelectorAll('[data-image-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var preset = btn.getAttribute('data-image-preset');
        productImageUrlInput.value = preset;
        updateImagePreview(preset);
        if (errorImage) errorImage.textContent = '';
      });
    });

    if (productImageUrlInput) {
      productImageUrlInput.addEventListener('input', function () {
        updateImagePreview(productImageUrlInput.value.trim());
      });
    }

    if (productImageFileInput) {
      productImageFileInput.addEventListener('change', function () {
        var file = productImageFileInput.files && productImageFileInput.files[0];
        if (!file) return;
        compressImageFile(file)
          .then(function (dataUrl) {
            productImageUrlInput.value = dataUrl;
            updateImagePreview(dataUrl);
            if (errorImage) errorImage.textContent = '';
          })
          .catch(function (err) {
            if (errorImage) errorImage.textContent = err.message;
          });
      });
    }

    if (productForm) {
      productForm.addEventListener('submit', function (event) {
        event.preventDefault();
        errorTitle.textContent = '';
        errorImage.textContent = '';

        var title = productTitleInput.value.trim();
        if (title.length < 2) {
          errorTitle.textContent = 'Ingresá un nombre válido (mínimo 2 caracteres).';
          productTitleInput.focus();
          return;
        }

        var id = productIdInput.value.trim();
        var payload = {
          title: title,
          category: productCategoryInput.value,
          stock: productStockInput.value,
          subtitle: productSubtitleInput.value.trim(),
          price: productPriceInput.value.trim() || 'Consultar',
          image: productImageUrlInput.value.trim(),
          visible: productVisibleInput.checked,
        };

        var url = id ? '/api/products/' + encodeURIComponent(id) : '/api/products';
        var method = id ? 'PUT' : 'POST';

        productSaveBtn.disabled = true;
        apiFetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(function (res) {
          productSaveBtn.disabled = false;
          if (!res.ok || !res.data) {
            var errs = (res.data && res.data.errors) || {};
            if (errs.title) errorTitle.textContent = errs.title;
            if (errs.image) errorImage.textContent = errs.image;
            if (!errs.title && !errs.image) {
              showToast((res.data && res.data.error) || 'No se pudo guardar.');
            }
            return;
          }
          state.products = res.data.products;
          updateStorageUI(res.data.storage);
          renderProducts();
          closeProductModal();
          showToast(id ? 'Producto actualizado.' : 'Producto agregado al catálogo.');
        });
      });
    }

    if (deleteModalClose) deleteModalClose.addEventListener('click', closeDeleteModal);
    if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeleteModal);
    if (deleteModal) {
      deleteModal.addEventListener('click', function (event) {
        if (event.target === deleteModal) closeDeleteModal();
      });
    }

    if (deleteConfirmBtn) {
      deleteConfirmBtn.addEventListener('click', function () {
        var id = state.pendingDeleteId;
        if (!id) return;
        deleteConfirmBtn.disabled = true;
        apiFetch('/api/products/' + encodeURIComponent(id), {
          method: 'DELETE',
        }).then(function (res) {
          deleteConfirmBtn.disabled = false;
          if (!res.ok || !res.data) {
            showToast('No se pudo eliminar el producto.');
            return;
          }
          state.products = res.data.products;
          updateStorageUI(res.data.storage);
          renderProducts();
          closeDeleteModal();
          showToast('Producto eliminado.');
        });
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (productModal && !productModal.hidden) {
        closeProductModal();
      } else if (deleteModal && !deleteModal.hidden) {
        closeDeleteModal();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    adjustSiteLinks();
    bindEvents();

    apiFetch('/api/auth')
      .then(function (res) {
        if (!res.ok || !res.data || typeof res.data.authenticated !== 'boolean') {
          if (apiNotice) apiNotice.hidden = false;
          if (loginSubmitBtn) loginSubmitBtn.disabled = true;
          return;
        }
        if (demoHint) {
          demoHint.hidden = !res.data.usingDefaultPassword;
        }
        if (res.data.authenticated) {
          showDashboardView();
        } else {
          showLoginView();
        }
      })
      .catch(function () {
        if (apiNotice) apiNotice.hidden = false;
        if (loginSubmitBtn) loginSubmitBtn.disabled = true;
      });
  });
})();
