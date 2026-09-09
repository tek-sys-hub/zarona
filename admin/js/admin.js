// =============================================================================
//  ZARONA ADMIN — Shared JS Utilities
//  Loaded by all admin pages
// =============================================================================

// ── Auth Guard ───────────────────────────────────────────────────────────────
export function getSession() {
  return JSON.parse(localStorage.getItem('zarona_admin_session') || 'null');
}

export function requireAuth() {
  const session = getSession();
  if (!session?.token || session?.user?.role !== 'admin') {
    window.location.href = '/admin/login.html';
    return null;
  }
  return session;
}

export function logout() {
  const session = getSession();
  if (session?.token) {
    fetch('/api/auth', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.token}` },
    }).catch(() => {});
  }
  localStorage.removeItem('zarona_admin_session');
  window.location.href = '/admin/login.html';
}

// ── API Helper ────────────────────────────────────────────────────────────────
export async function apiCall(path, options = {}) {
  const session = getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(path, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      logout();
      return;
    }
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

// ── Toast Notifications ───────────────────────────────────────────────────────
let toastContainer;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'admin-toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message, type = 'success') {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;

  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:#4CAF79;flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:#E05050;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:#D4A847;flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };

  toast.innerHTML = `${icons[type] || icons.success}<span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}

// ── Sidebar Setup ─────────────────────────────────────────────────────────────
export function initSidebar(activePage) {
  const session = requireAuth();
  if (!session) return;

  const user = session.user;

  // Populate user info
  const nameEl = document.getElementById('admin-user-name');
  const initEl = document.getElementById('admin-avatar-init');
  if (nameEl) nameEl.textContent = user.full_name || user.email;
  if (initEl) initEl.textContent = (user.full_name || user.email || 'A').charAt(0).toUpperCase();

  // Set active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-page') === activePage) {
      item.classList.add('active');
    }
  });

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', logout);

  // Mobile sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('mobile-open');
  });
}

// ── Format Helpers ─────────────────────────────────────────────────────────────
export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

export function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export function statusBadge(status) {
  const map = {
    active:     'badge-active',
    inactive:   'badge-inactive',
    pending:    'badge-pending',
    processing: 'badge-processing',
    shipped:    'badge-shipped',
    delivered:  'badge-delivered',
    cancelled:  'badge-cancelled',
    admin:      'badge-admin',
    customer:   'badge-customer',
  };
  return `<span class="badge ${map[status] || 'badge-inactive'}">${status}</span>`;
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────
export function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'opacity:1;visibility:visible;';
    overlay.innerHTML = `
      <div class="modal" style="max-width:360px;">
        <div class="modal-header">
          <span class="modal-title">Confirm Action</span>
        </div>
        <div class="modal-body">
          <p style="color:var(--text-secondary);font-size:0.85rem;">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
          <button class="btn btn-danger" id="confirm-ok">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#confirm-ok').onclick    = () => { overlay.remove(); resolve(true); };
  });
}
