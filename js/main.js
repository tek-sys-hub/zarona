// ==========================================================================
// ZARONA UNISEX - CORE JAVASCRIPT
// E-Commerce State Management, Cart Drawer, Filtering & Interactions
// ==========================================================================

import { products } from './products.js';

class ZaronaApp {
  constructor() {
    this.products = [];
    this.cart = this.loadCart();
    this.activeFilters = {
      category: 'All',
      sizes: [],
      color: null,
      maxPrice: 100,
      sort: 'newest'
    };
    
    this.init();
  }

  renderSkeletonCards(count = 6) {
    return Array(count).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-media"></div>
        <div class="skeleton-info">
          <div class="skeleton-line category"></div>
          <div class="skeleton-line title"></div>
          <div class="skeleton-line price"></div>
        </div>
      </div>
    `).join('');
  }

  normalizeProduct(p) {
    return {
      ...p,
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price) || 0,
      originalPrice: p.original_price != null ? Number(p.original_price) : (p.originalPrice ? Number(p.originalPrice) : null),
      badge: p.badge || null,
      rating: Number(p.rating) || 5.0,
      reviewsCount: p.reviews_count != null ? p.reviews_count : (p.reviewsCount || 0),
      sizes: Array.isArray(p.sizes) ? p.sizes : (typeof p.sizes === 'string' ? JSON.parse(p.sizes) : ['S', 'M', 'L', 'XL']),
      colors: Array.isArray(p.colors) && p.colors.length > 0 ? p.colors : [{ name: 'Standard', hex: '#111111', image: p.primary_image || p.primaryImage }],
      primaryImage: p.primary_image || p.primaryImage || '/assets/images/placeholder.jpg',
      secondaryImage: p.secondary_image || p.secondaryImage || p.primary_image || p.primaryImage || '/assets/images/placeholder.jpg',
      description: p.description || '',
      details: Array.isArray(p.details) ? p.details : [],
      isFeatured: Boolean(p.is_featured != null ? p.is_featured : p.isFeatured),
      isNew: Boolean(p.is_new != null ? p.is_new : p.isNew)
    };
  }

  async fetchProducts() {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          this.products = data.products.map(p => this.normalizeProduct(p));
          return;
        }
      }
    } catch (err) {
      console.warn('Could not fetch products from backend:', err);
    }
    this.products = [];
  }

  init() {
    this.initHeaderScroll();
    this.initCartDrawer();
    this.initSearchModal();
    this.initMobileDrawer();
    this.initQuickViewModal();
    this.updateCartUI();

    const shopGrid = document.getElementById('shop-products-grid');
    const featuredGrid = document.getElementById('featured-products-grid');

    // Show luxury skeleton cards immediately while data is loading
    if (shopGrid) {
      shopGrid.innerHTML = this.renderSkeletonCards(6);
    }
    if (featuredGrid) {
      featuredGrid.innerHTML = this.renderSkeletonCards(3);
    }

    this.fetchProducts().then(() => {
      if (shopGrid) {
        this.initShopPage();
      } else if (featuredGrid) {
        this.initHomePage();
      }
    });
  }

  // ------------------------------------------------------------------------
  // HEADER SCROLL EFFECT
  // ------------------------------------------------------------------------
  initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // ------------------------------------------------------------------------
  // CART STATE MANAGEMENT
  // ------------------------------------------------------------------------
  loadCart() {
    try {
      const saved = localStorage.getItem('zarona_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveCart() {
    try {
      localStorage.setItem('zarona_cart', JSON.stringify(this.cart));
    } catch (e) {
      console.error(e);
    }
    this.updateCartUI();
  }

  addToCart(productId, selectedSize, selectedColorHex, quantity = 1) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const size = selectedSize || product.sizes[0];
    const colorObj = product.colors.find(c => c.hex === selectedColorHex) || product.colors[0];

    const existingIndex = this.cart.findIndex(
      item => item.id === productId && item.size === size && item.colorName === colorObj.name
    );

    if (existingIndex > -1) {
      this.cart[existingIndex].quantity += quantity;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        size: size,
        colorName: colorObj.name,
        colorHex: colorObj.hex,
        image: colorObj.image || product.primaryImage,
        quantity: quantity
      });
    }

    this.saveCart();
    this.showToast(`Added ${product.name} to your bag`);
    this.openCart();
  }

  updateItemQuantity(index, delta) {
    if (!this.cart[index]) return;
    this.cart[index].quantity += delta;
    if (this.cart[index].quantity <= 0) {
      this.cart.splice(index, 1);
    }
    this.saveCart();
  }

  removeItem(index) {
    if (!this.cart[index]) return;
    this.cart.splice(index, 1);
    this.saveCart();
  }

  updateCartUI() {
    // Badges in header
    const badges = document.querySelectorAll('.cart-count-badge');
    const totalCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    badges.forEach(b => {
      b.textContent = totalCount;
      b.style.display = totalCount > 0 ? 'flex' : 'none';
    });

    // Cart items in drawer
    const container = document.getElementById('cart-items-list');
    const emptyState = document.getElementById('cart-empty-state');
    const footer = document.getElementById('cart-drawer-footer');
    const subtotalEl = document.getElementById('cart-subtotal-val');
    const freeShippingProgress = document.getElementById('shipping-progress-fill');
    const freeShippingText = document.getElementById('shipping-tracker-text');

    if (!container) return;

    if (this.cart.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (footer) footer.style.display = 'none';
      if (freeShippingProgress) freeShippingProgress.style.width = '0%';
      if (freeShippingText) freeShippingText.innerHTML = 'Add <strong>$50.00</strong> more for Free Shipping';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (footer) footer.style.display = 'block';

    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;

    // Free Shipping $50
    const freeShipLimit = 50.00;
    const progress = Math.min(100, (subtotal / freeShipLimit) * 100);
    if (freeShippingProgress) freeShippingProgress.style.width = `${progress}%`;
    if (freeShippingText) {
      if (subtotal >= freeShipLimit) {
        freeShippingText.innerHTML = '✨ You have qualified for <strong>Free Worldwide Shipping</strong>!';
      } else {
        const remaining = (freeShipLimit - subtotal).toFixed(2);
        freeShippingText.innerHTML = `Add <strong>$${remaining}</strong> more for Free Shipping`;
      }
    }

    // Render items
    container.innerHTML = this.cart.map((item, idx) => `
      <div class="cart-item" data-index="${idx}">
        <img src="${item.image}" alt="${item.name}" class="cart-item-thumb">
        <div class="cart-item-details">
          <div class="cart-item-top">
            <div>
              <h4 class="cart-item-title">${item.name}</h4>
              <div class="cart-item-meta">${item.size} / ${item.colorName}</div>
            </div>
            <button class="cart-item-remove" data-remove-index="${idx}" aria-label="Remove item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="cart-item-bottom">
            <div class="qty-stepper">
              <button class="qty-btn" data-qty-delta="-1" data-index="${idx}">-</button>
              <span class="qty-number">${item.quantity}</span>
              <button class="qty-btn" data-qty-delta="1" data-index="${idx}">+</button>
            </div>
            <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
          </div>
        </div>
      </div>
    `).join('');

    // Attach listeners
    container.querySelectorAll('[data-remove-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-remove-index'), 10);
        this.removeItem(idx);
      });
    });

    container.querySelectorAll('[data-qty-delta]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const delta = parseInt(btn.getAttribute('data-qty-delta'), 10);
        this.updateItemQuantity(idx, delta);
      });
    });
  }

  initCartDrawer() {
    const overlay = document.getElementById('cart-overlay');
    const drawer = document.getElementById('cart-drawer');
    const triggers = document.querySelectorAll('.cart-trigger-btn');
    const closeBtn = document.getElementById('cart-close-btn');

    triggers.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openCart();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeCart());
    }

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeCart();
      });
    }

    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        alert('Thank you for choosing Zarona. Checkout flow simulation.');
      });
    }
  }

  openCart() {
    const overlay = document.getElementById('cart-overlay');
    const drawer = document.getElementById('cart-drawer');
    if (overlay && drawer) {
      overlay.classList.add('active');
      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeCart() {
    const overlay = document.getElementById('cart-overlay');
    const drawer = document.getElementById('cart-drawer');
    if (overlay && drawer) {
      overlay.classList.remove('active');
      drawer.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // ------------------------------------------------------------------------
  // SEARCH (DESKTOP SIDE SEARCH & PHONE POPUP SEARCH)
  // ------------------------------------------------------------------------
  initSearchModal() {
    // Elements - Desktop
    const desktopSearchWrap = document.getElementById('header-search-wrapper');
    const desktopInput = document.getElementById('desktop-search-input');
    const desktopClear = document.getElementById('desktop-search-clear');
    const desktopResults = document.getElementById('desktop-search-results');
    const searchTriggerBtn = document.getElementById('search-trigger-btn');

    // Elements - Mobile Popup
    const mobileBackdrop = document.getElementById('mobile-search-backdrop');
    const mobilePopup = document.getElementById('mobile-search-popup');
    const mobileInput = document.getElementById('mobile-search-input');
    const mobileCloseBtn = document.getElementById('mobile-search-close-btn');
    const mobileResults = document.getElementById('mobile-search-results');

    // Tag pills
    const allTagPills = document.querySelectorAll('.search-tag-pill');

    const renderSearchResults = (container, query) => {
      if (!container) return;
      const cleanQuery = (query || '').trim().toLowerCase();
      if (!cleanQuery) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 1.25rem 0;">Type to search products...</p>`;
        return;
      }

      const matches = this.products.filter(p =>
        p.name.toLowerCase().includes(cleanQuery) ||
        p.category.toLowerCase().includes(cleanQuery) ||
        (p.description && p.description.toLowerCase().includes(cleanQuery))
      );

      if (matches.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 1.25rem 0;">No products found for "${query}"</p>`;
        return;
      }

      container.innerHTML = matches.map(p => `
        <div class="search-result-item" data-id="${p.id}" tabindex="0" role="button" aria-label="View ${p.name}">
          <img src="${p.primaryImage}" alt="${p.name}" class="search-result-thumb">
          <div class="search-result-info">
            <span class="search-result-name">${p.name}</span>
            <span class="search-result-meta">${p.category} &bull; $${p.price.toFixed(2)}</span>
          </div>
          <span class="search-result-view-btn">View</span>
        </div>
      `).join('');

      container.querySelectorAll('.search-result-item').forEach(item => {
        const handleSelect = (e) => {
          e.preventDefault();
          const id = item.getAttribute('data-id');
          closeAllSearch();
          this.openQuickView(id);
        };
        item.addEventListener('click', handleSelect);
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') handleSelect(e);
        });
      });
    };

    const openMobileSearch = () => {
      if (mobilePopup && mobileBackdrop) {
        mobileBackdrop.classList.add('active');
        mobilePopup.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (mobileInput) {
          mobileInput.value = '';
          renderSearchResults(mobileResults, '');
          setTimeout(() => mobileInput.focus(), 150);
        }
      }
    };

    const closeMobileSearch = () => {
      if (mobilePopup && mobileBackdrop) {
        mobilePopup.classList.remove('active');
        mobileBackdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    };

    const closeDesktopSearch = () => {
      if (desktopSearchWrap) {
        desktopSearchWrap.classList.remove('open');
      }
    };

    const closeAllSearch = () => {
      closeMobileSearch();
      closeDesktopSearch();
    };

    // Search Trigger button click
    if (searchTriggerBtn) {
      searchTriggerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.innerWidth <= 768) {
          openMobileSearch();
        } else {
          if (desktopSearchWrap) {
            const isCurrentlyOpen = desktopSearchWrap.classList.contains('open');
            if (isCurrentlyOpen) {
              closeDesktopSearch();
            } else {
              desktopSearchWrap.classList.add('open');
              if (desktopInput) {
                setTimeout(() => desktopInput.focus(), 60);
                renderSearchResults(desktopResults, desktopInput.value);
              }
            }
          }
        }
      });
    }

    // Desktop Input events
    if (desktopInput) {
      desktopInput.addEventListener('focus', () => {
        if (desktopSearchWrap) {
          desktopSearchWrap.classList.add('open');
          renderSearchResults(desktopResults, desktopInput.value);
        }
      });

      desktopInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (desktopSearchWrap) {
          desktopSearchWrap.classList.add('open');
        }
        renderSearchResults(desktopResults, val);
      });

      desktopInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeDesktopSearch();
          desktopInput.blur();
        }
      });
    }

    // Desktop Clear or Close button
    if (desktopClear && desktopInput) {
      desktopClear.addEventListener('click', (e) => {
        e.stopPropagation();
        if (desktopInput.value.trim().length > 0) {
          desktopInput.value = '';
          renderSearchResults(desktopResults, '');
          desktopInput.focus();
        } else {
          closeDesktopSearch();
        }
      });
    }

    // Mobile input events
    if (mobileInput) {
      mobileInput.addEventListener('input', (e) => {
        renderSearchResults(mobileResults, e.target.value);
      });
    }

    // Mobile close triggers
    if (mobileCloseBtn) {
      mobileCloseBtn.addEventListener('click', closeMobileSearch);
    }
    if (mobileBackdrop) {
      mobileBackdrop.addEventListener('click', closeMobileSearch);
    }

    // Tag pills click for both desktop and mobile
    allTagPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const term = pill.getAttribute('data-search-term') || pill.textContent.trim();
        if (window.innerWidth <= 768) {
          if (mobileInput) {
            mobileInput.value = term;
            renderSearchResults(mobileResults, term);
          }
        } else {
          if (desktopInput) {
            desktopInput.value = term;
            if (desktopClear) desktopClear.style.display = 'flex';
            if (desktopSearchWrap) desktopSearchWrap.classList.add('open');
            renderSearchResults(desktopResults, term);
            desktopInput.focus();
          }
        }
      });
    });

    // Close desktop dropdown on outside click
    document.addEventListener('click', (e) => {
      if (desktopSearchWrap && !desktopSearchWrap.contains(e.target)) {
        desktopSearchWrap.classList.remove('open');
      }
    });

    // Escape key closes everything
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllSearch();
      }
    });
  }

  // ------------------------------------------------------------------------
  // MOBILE NAVIGATION DRAWER
  // ------------------------------------------------------------------------
  initMobileDrawer() {
    const overlay = document.getElementById('mobile-drawer-overlay');
    const drawer = document.getElementById('mobile-drawer');
    const trigger = document.getElementById('hamburger-btn');
    const closeBtn = document.getElementById('mobile-drawer-close');

    if (trigger && overlay && drawer) {
      trigger.addEventListener('click', () => {
        overlay.classList.add('active');
        drawer.classList.add('active');
        document.body.style.overflow = 'hidden';
      });

      const closeNav = () => {
        overlay.classList.remove('active');
        drawer.classList.remove('active');
        document.body.style.overflow = '';
      };

      if (closeBtn) closeBtn.addEventListener('click', closeNav);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeNav();
      });
    }
  }

  // ------------------------------------------------------------------------
  // QUICK VIEW MODAL
  // ------------------------------------------------------------------------
  initQuickViewModal() {
    const overlay = document.getElementById('quickview-modal-overlay');
    const closeBtn = document.getElementById('quickview-close-btn');

    if (closeBtn && overlay) {
      closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    }
  }

  openQuickView(productId) {
    const product = this.products.find(p => p.id === productId);
    const overlay = document.getElementById('quickview-modal-overlay');
    if (!product || !overlay) return;

    let selectedColor = product.colors[0];
    let selectedSize = product.sizes[0];
    let qty = 1;

    document.getElementById('qv-category').textContent = product.category;
    document.getElementById('qv-title').textContent = product.name;
    document.getElementById('qv-price').textContent = `$${product.price.toFixed(2)}`;
    
    const origPriceEl = document.getElementById('qv-original-price');
    if (origPriceEl) {
      if (product.originalPrice) {
        origPriceEl.textContent = `$${product.originalPrice.toFixed(2)}`;
        origPriceEl.style.display = 'inline';
      } else {
        origPriceEl.style.display = 'none';
      }
    }

    document.getElementById('qv-desc').textContent = product.description;
    const mainImg = document.getElementById('qv-main-img');
    mainImg.src = selectedColor.image || product.primaryImage;
    mainImg.alt = product.name;

    // Render colors
    const colorsContainer = document.getElementById('qv-colors');
    colorsContainer.innerHTML = product.colors.map((c, i) => `
      <div class="color-filter-swatch ${i === 0 ? 'active' : ''}" 
           style="background-color: ${c.hex};" 
           title="${c.name}" 
           data-color-hex="${c.hex}" 
           data-color-img="${c.image}"></div>
    `).join('');

    // Render sizes
    const sizesContainer = document.getElementById('qv-sizes');
    sizesContainer.innerHTML = product.sizes.map((s, i) => `
      <button class="size-pill-btn ${i === 0 ? 'active' : ''}" data-size="${s}">${s}</button>
    `).join('');

    // Selected color label
    const colorLabel = document.getElementById('qv-selected-color-name');
    if (colorLabel) colorLabel.textContent = selectedColor.name;

    // Swatch clicks
    colorsContainer.querySelectorAll('.color-filter-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        colorsContainer.querySelectorAll('.color-filter-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const hex = swatch.getAttribute('data-color-hex');
        selectedColor = product.colors.find(c => c.hex === hex) || selectedColor;
        if (colorLabel) colorLabel.textContent = selectedColor.name;
      });
    });

    // Size clicks
    sizesContainer.querySelectorAll('.size-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sizesContainer.querySelectorAll('.size-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSize = btn.getAttribute('data-size');
      });
    });

    // Add to bag button
    const addBtn = document.getElementById('qv-add-btn');
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    newAddBtn.addEventListener('click', () => {
      this.addToCart(product.id, selectedSize, selectedColor.hex, qty);
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    });

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // ------------------------------------------------------------------------
  // HOME PAGE INITIALIZATION
  // ------------------------------------------------------------------------
  initHomePage() {
    const grid = document.getElementById('featured-products-grid');
    if (!grid) return;

    if (this.products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4.5rem 1.5rem;">
          <div style="font-family: var(--font-serif); font-size: 2rem; color: var(--text-primary); margin-bottom: 0.75rem;">
            New Bespoke Drops Arriving
          </div>
          <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto; line-height: 1.6; font-size: 0.95rem;">
            The upcoming unisex collection is currently in curation. Products will be unveiled here as new releases go live.
          </p>
        </div>
      `;
      return;
    }

    // Render featured products
    const featured = this.products.filter(p => p.isFeatured).slice(0, 6);
    const displayList = featured.length > 0 ? featured : this.products.slice(0, 6);
    grid.innerHTML = displayList.map(p => this.renderProductCardHTML(p)).join('');
    this.attachCardEventListeners(grid);
  }

  // ------------------------------------------------------------------------
  // SHOP PAGE INITIALIZATION & FILTER ENGINE
  // ------------------------------------------------------------------------
  initShopPage() {
    this.renderShopProducts();
    this.bindShopFilterControls();
  }

  renderShopProducts() {
    const grid = document.getElementById('shop-products-grid');
    const countEl = document.getElementById('product-count-num');
    if (!grid) return;

    if (this.products.length === 0) {
      if (countEl) countEl.textContent = '0';
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 5rem 1.5rem;">
          <div style="font-family: var(--font-serif); font-size: 2.2rem; color: var(--text-primary); margin-bottom: 0.75rem;">
            Curating The Collection
          </div>
          <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 2rem; line-height: 1.6; font-size: 0.95rem;">
            Our catalog is currently being updated with new releases. Check back shortly or visit again once products are added.
          </p>
          <a href="/index.html" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; padding: 0.75rem 1.5rem; border: 1px solid var(--border-color); border-radius: 999px;">
            <span>Back to Home</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </a>
        </div>
      `;
      return;
    }

    let list = [...this.products];

    // Filter Category
    if (this.activeFilters.category !== 'All') {
      list = list.filter(p => p.category.toLowerCase() === this.activeFilters.category.toLowerCase());
    }

    // Filter Sizes
    if (this.activeFilters.sizes.length > 0) {
      list = list.filter(p => p.sizes.some(s => this.activeFilters.sizes.includes(s)));
    }

    // Filter Color
    if (this.activeFilters.color) {
      list = list.filter(p => p.colors.some(c => c.hex === this.activeFilters.color));
    }

    // Filter Price
    list = list.filter(p => p.price <= this.activeFilters.maxPrice);

    // Sort
    if (this.activeFilters.sort === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (this.activeFilters.sort === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (this.activeFilters.sort === 'popular') {
      list.sort((a, b) => b.reviewsCount - a.reviewsCount);
    } else {
      // newest
      list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    }

    if (countEl) countEl.textContent = list.length;

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
          <p style="font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 1rem;">No products match your active filters.</p>
          <button id="reset-filter-inline" style="text-decoration: underline; font-weight: 600; cursor: pointer;">Clear All Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('reset-filter-inline');
      if (resetBtn) resetBtn.addEventListener('click', () => this.clearFilters());
      return;
    }

    grid.innerHTML = list.map(p => this.renderProductCardHTML(p)).join('');
    this.attachCardEventListeners(grid);
  }

  bindShopFilterControls() {
    // Category Checkboxes
    const categoryCheckboxes = document.querySelectorAll('.category-filter-checkbox');
    categoryCheckboxes.forEach(chk => {
      chk.addEventListener('change', (e) => {
        const cat = e.target.value;
        if (cat === 'All') {
          categoryCheckboxes.forEach(c => { if (c.value !== 'All') c.checked = false; });
          this.activeFilters.category = 'All';
        } else {
          document.getElementById('cat-all').checked = false;
          // Single select for simplicity matching clean UI or multi
          this.activeFilters.category = e.target.checked ? cat : 'All';
          if (!e.target.checked) document.getElementById('cat-all').checked = true;
        }
        this.renderShopProducts();
      });
    });

    // Size Buttons
    const sizeBtns = document.querySelectorAll('.shop-size-btn');
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const size = btn.getAttribute('data-size');
        if (this.activeFilters.sizes.includes(size)) {
          this.activeFilters.sizes = this.activeFilters.sizes.filter(s => s !== size);
          btn.classList.remove('active');
        } else {
          this.activeFilters.sizes.push(size);
          btn.classList.add('active');
        }
        this.renderShopProducts();
      });
    });

    // Color Swatches
    const colorSwatches = document.querySelectorAll('.shop-color-swatch');
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        const hex = swatch.getAttribute('data-hex');
        if (this.activeFilters.color === hex) {
          this.activeFilters.color = null;
          swatch.classList.remove('active');
        } else {
          colorSwatches.forEach(s => s.classList.remove('active'));
          this.activeFilters.color = hex;
          swatch.classList.add('active');
        }
        this.renderShopProducts();
      });
    });

    // Price Slider
    const slider = document.getElementById('price-slider');
    const priceDisplay = document.getElementById('price-max-val');
    if (slider && priceDisplay) {
      slider.addEventListener('input', (e) => {
        this.activeFilters.maxPrice = parseFloat(e.target.value);
        priceDisplay.textContent = `$${this.activeFilters.maxPrice}`;
        this.renderShopProducts();
      });
    }

    // Sort Dropdown
    const sortSelect = document.getElementById('shop-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.activeFilters.sort = e.target.value;
        this.renderShopProducts();
      });
    }

    // Clear Filters
    const clearBtn = document.getElementById('clear-filters-trigger');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearFilters());
    }

    // Mobile Filter Drawer Toggle
    const mobileFilterTrigger = document.getElementById('mobile-filter-trigger');
    const sidebar = document.getElementById('shop-sidebar');
    if (mobileFilterTrigger && sidebar) {
      mobileFilterTrigger.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });
    }
  }

  clearFilters() {
    this.activeFilters = {
      category: 'All',
      sizes: [],
      color: null,
      maxPrice: 100,
      sort: 'newest'
    };

    // Reset UI
    const catCheckboxes = document.querySelectorAll('.category-filter-checkbox');
    catCheckboxes.forEach(c => c.checked = c.value === 'All');

    const sizeBtns = document.querySelectorAll('.shop-size-btn');
    sizeBtns.forEach(b => b.classList.remove('active'));

    const colorSwatches = document.querySelectorAll('.shop-color-swatch');
    colorSwatches.forEach(s => s.classList.remove('active'));

    const slider = document.getElementById('price-slider');
    const priceDisplay = document.getElementById('price-max-val');
    if (slider) slider.value = 100;
    if (priceDisplay) priceDisplay.textContent = '$100';

    const sortSelect = document.getElementById('shop-sort-select');
    if (sortSelect) sortSelect.value = 'newest';

    this.renderShopProducts();
  }

  // ------------------------------------------------------------------------
  // CARD RENDERING & INTERACTIONS
  // ------------------------------------------------------------------------
  renderProductCardHTML(product) {
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const badgeHTML = product.badge ? `<span class="card-badge">${product.badge}</span>` : '';

    const swatchesHTML = product.colors.map((c, i) => `
      <span class="color-swatch-dot ${i === 0 ? 'active' : ''}" 
            style="background-color: ${c.hex};" 
            title="${c.name}"
            data-color-hex="${c.hex}" 
            data-img="${c.image}"></span>
    `).join('');

    return `
      <article class="product-card" data-id="${product.id}">
        <div class="card-media-wrapper">
          ${badgeHTML}
          <img src="${product.primaryImage}" alt="${product.name}" class="card-img" loading="lazy">
          
          <div class="card-quick-actions">
            <button class="quick-view-btn" data-action="quickview" data-id="${product.id}">Quick View</button>
            <button class="quick-add-btn" data-action="quickadd" data-id="${product.id}" title="Quick Add to Bag" aria-label="Add to bag">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="card-info">
          <h3 class="card-title">${product.name}</h3>
          <div class="card-price-row">
            <span class="card-price">$${product.price.toFixed(2)}</span>
            ${hasDiscount ? `<span class="card-price-original">$${product.originalPrice.toFixed(2)}</span>` : ''}
          </div>
          <div class="card-swatches">
            ${swatchesHTML}
          </div>
        </div>
      </article>
    `;
  }

  attachCardEventListeners(container) {
    // Quick View click
    container.querySelectorAll('[data-action="quickview"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        this.openQuickView(id);
      });
    });

    // Quick Add click
    container.querySelectorAll('[data-action="quickadd"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        this.addToCart(id);
      });
    });

    // Swatch interactive indicator
    container.querySelectorAll('.product-card').forEach(card => {
      const dots = card.querySelectorAll('.color-swatch-dot');

      dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          dots.forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
        });
      });

      // Clicking card media opens quick view
      const media = card.querySelector('.card-media-wrapper');
      if (media) {
        media.addEventListener('click', (e) => {
          if (!e.target.closest('button') && !e.target.closest('.card-quick-actions')) {
            const id = card.getAttribute('data-id');
            this.openQuickView(id);
          }
        });
      }
    });
  }

  // ------------------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // ------------------------------------------------------------------------
  showToast(message) {
    let toast = document.getElementById('global-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'global-toast';
      toast.className = 'toast-notification';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2A26F" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;

    toast.classList.add('active');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('active');
    }, 2800);
  }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.zaronaApp = new ZaronaApp();
});
