// HOMEHELP UK — ADMIN PANEL APPLICATION LOGIC (UX REFINED)
const API_BASE = '/api/admin';

let token = localStorage.getItem('adminToken') || null;
let currentAdmin = JSON.parse(localStorage.getItem('adminUser') || 'null');

// Data Stores
let categoriesData = [];
let servicesData = [];
let recentServicesData = [];
let providersData = [];
let currentEditingService = null;
let categoryOriginalState = null;
let serviceOriginalState = null;

// Pagination & Sorting State
const sortState = {
  recent: { col: null, dir: 'asc' },
  categories: { col: 'orderIndex', dir: 'asc' },
  services: { col: 'name', dir: 'asc' }
};

const paginationState = {
  categories: { page: 1, pageSize: 8 },
  services: { page: 1, pageSize: 10 },
  providers: { page: 1, pageSize: 10 }
};

// Icon Mapping Dictionary
const ICON_MAP = {
  'restaurant': '🍳',
  'sparkles': '✨',
  'build': '🔧',
  'flash': '⚡',
  'color-palette': '🎨',
  'leaf': '🌱',
  'shirt': '👔',
  'paw': '🐾',
  'car': '🚗',
  'cut': '✂️',
  'cube': '📦',
  'home': '🏠',
  'tv': '📺',
  'water': '💧',
  'hammer': '🔨',
  'construct': '🏗️',
  'gas': '🔥',
  'baby': '👶',
  'heart': '❤️',
  'move': '📦'
};

// Route Mapping
const ROUTE_MAP = {
  '/admin': 'dashboard',
  '/admin/': 'dashboard',
  '/admin/categories': 'categories',
  '/admin/services': 'services',
  '/admin/providers': 'providers',
  '/admin/settings': 'settings'
};

const TAB_PATH_MAP = {
  dashboard: '/admin',
  categories: '/admin/categories',
  services: '/admin/services',
  providers: '/admin/providers',
  settings: '/admin/settings'
};

// DOM Elements
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const mainLayout = document.getElementById('mainLayout');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  if (token && currentAdmin) {
    showDashboard();
  } else {
    showLogin();
  }

  setupEventListeners();
  window.addEventListener('popstate', handlePopState);
});

// --- TOAST SYSTEM ---
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
    <button class="toast-close">&times;</button>
  `;

  toast.querySelector('.toast-close').onclick = () => removeToast(toast);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }
}

function removeToast(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(100%)';
  setTimeout(() => toast.remove(), 300);
}

// --- CONFIRMATION MODAL SYSTEM ---
function showConfirmModal({ title, text, warningText, confirmBtnText = 'Confirm Delete', onConfirm }) {
  const modal = document.getElementById('confirmModal');
  document.getElementById('confirmModalTitle').textContent = title || 'Confirm Action';
  document.getElementById('confirmModalText').textContent = text || 'Are you sure you want to proceed?';

  const warnEl = document.getElementById('confirmModalWarning');
  if (warningText) {
    warnEl.textContent = warningText;
    warnEl.classList.remove('hidden');
  } else {
    warnEl.classList.add('hidden');
  }

  const confirmBtn = document.getElementById('confirmModalConfirm');
  confirmBtn.textContent = confirmBtnText;

  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.onclick = async () => {
    modal.classList.add('hidden');
    if (onConfirm) await onConfirm();
  };

  modal.classList.remove('hidden');
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Login Handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server returned HTML error page (Status ${res.status}). Ensure Vercel environment variables & DB connection are configured.`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Invalid credentials');
      }

      token = data.token;
      currentAdmin = data.user;
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(currentAdmin));

      showToast('Logged in successfully', 'success');
      showDashboard();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove('hidden');
      showToast(`Login failed: ${err.message}`, 'error');
    }
  });

  // Logout Handler
  logoutBtn.addEventListener('click', () => {
    token = null;
    currentAdmin = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    showToast('Logged out of Admin Portal', 'info');
    showLogin();
  });

  // Refresh Button Handler with Spinner Loading State
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    const originalText = document.getElementById('refreshBtnText').textContent;
    document.getElementById('refreshBtnText').textContent = 'Refreshing...';
    refreshBtn.querySelector('.icon').className = 'spinner';

    try {
      await loadAllData();
      showToast('Catalogue refreshed', 'success');
    } catch (err) {
      showToast('Unable to refresh catalogue', 'error');
    } finally {
      refreshBtn.disabled = false;
      document.getElementById('refreshBtnText').textContent = originalText;
      refreshBtn.querySelector('.spinner').className = 'icon';
      refreshBtn.querySelector('.icon').textContent = '🔄';
    }
  });

  // View Full Catalogue Button Handler
  document.getElementById('viewFullCatalogueBtn')?.addEventListener('click', () => {
    navigateTo('/admin/services');
  });

  // Tab Navigation
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const path = btn.dataset.path || TAB_PATH_MAP[btn.dataset.tab] || '/admin';
      navigateTo(path);
    });
  });

  // Modal Tab Switching
  document.querySelectorAll('.modal-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const targetContent = document.getElementById(`modaltab-${btn.dataset.modaltab}`);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // Modal Close Handlers
  document.querySelectorAll('.close-modal, #confirmModalCancel, #confirmModalCloseBtn, #closeProviderModalBtn, #closeProviderModalFooterBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    });
  });

  // Provider Search & Filters
  const provSearch = document.getElementById('providerSearch');
  const clearProvSearch = document.getElementById('clearProviderSearch');
  const provStatusFilter = document.getElementById('providerStatusFilter');
  const provVerifiedFilter = document.getElementById('providerVerifiedFilter');

  if (provSearch) {
    provSearch.addEventListener('input', () => {
      clearProvSearch.classList.toggle('hidden', !provSearch.value);
      paginationState.providers.page = 1;
      renderProvidersTable();
    });
  }

  if (clearProvSearch) {
    clearProvSearch.addEventListener('click', () => {
      provSearch.value = '';
      clearProvSearch.classList.add('hidden');
      paginationState.providers.page = 1;
      renderProvidersTable();
    });
  }

  if (provStatusFilter) {
    provStatusFilter.addEventListener('change', () => {
      paginationState.providers.page = 1;
      renderProvidersTable();
    });
  }

  if (provVerifiedFilter) {
    provVerifiedFilter.addEventListener('change', () => {
      paginationState.providers.page = 1;
      renderProvidersTable();
    });
  }

  // Provider Pagination
  document.getElementById('provPrevPage')?.addEventListener('click', () => {
    if (paginationState.providers.page > 1) {
      paginationState.providers.page--;
      renderProvidersTable();
    }
  });

  document.getElementById('provNextPage')?.addEventListener('click', () => {
    paginationState.providers.page++;
    renderProvidersTable();
  });

  // Sortable Table Headers
  document.querySelectorAll('.data-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const tableKey = th.dataset.table;
      const colKey = th.dataset.col;
      const currentSort = sortState[tableKey];

      if (currentSort.col === colKey) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.col = colKey;
        currentSort.dir = 'asc';
      }

      updateSortHeaderIcons(tableKey);

      if (tableKey === 'categories') renderCategoriesTable();
      if (tableKey === 'services') renderServicesTable();
      if (tableKey === 'recent') renderRecentServicesTable();
    });
  });

  // Category Search & Filter & Pagination Handlers
  const catSearch = document.getElementById('categorySearch');
  const clearCatSearch = document.getElementById('clearCategorySearch');
  const catStatusFilter = document.getElementById('categoryStatusFilter');

  if (catSearch) {
    catSearch.addEventListener('input', () => {
      if (clearCatSearch) clearCatSearch.classList.toggle('hidden', !catSearch.value);
      paginationState.categories.page = 1;
      renderCategoriesTable();
    });
  }

  if (clearCatSearch) {
    clearCatSearch.addEventListener('click', () => {
      if (catSearch) catSearch.value = '';
      clearCatSearch.classList.add('hidden');
      paginationState.categories.page = 1;
      renderCategoriesTable();
    });
  }

  if (catStatusFilter) {
    catStatusFilter.addEventListener('change', () => {
      paginationState.categories.page = 1;
      renderCategoriesTable();
    });
  }

  document.getElementById('catPrevPage')?.addEventListener('click', () => {
    if (paginationState.categories.page > 1) {
      paginationState.categories.page--;
      renderCategoriesTable();
    }
  });

  document.getElementById('catNextPage')?.addEventListener('click', () => {
    paginationState.categories.page++;
    renderCategoriesTable();
  });

  // Service Search & Filter & Pagination Handlers
  const srvSearch = document.getElementById('serviceSearch');
  const clearSrvSearch = document.getElementById('clearServiceSearch');
  const srvCatFilter = document.getElementById('categoryFilter');
  const srvStatusFilter = document.getElementById('statusFilter');

  if (srvSearch) {
    srvSearch.addEventListener('input', () => {
      if (clearSrvSearch) clearSrvSearch.classList.toggle('hidden', !srvSearch.value);
      paginationState.services.page = 1;
      renderServicesTable();
    });
  }

  if (clearSrvSearch) {
    clearSrvSearch.addEventListener('click', () => {
      if (srvSearch) srvSearch.value = '';
      clearSrvSearch.classList.add('hidden');
      paginationState.services.page = 1;
      renderServicesTable();
    });
  }

  if (srvCatFilter) {
    srvCatFilter.addEventListener('change', () => {
      paginationState.services.page = 1;
      renderServicesTable();
    });
  }

  if (srvStatusFilter) {
    srvStatusFilter.addEventListener('change', () => {
      paginationState.services.page = 1;
      renderServicesTable();
    });
  }

  document.getElementById('srvPrevPage')?.addEventListener('click', () => {
    if (paginationState.services.page > 1) {
      paginationState.services.page--;
      renderServicesTable();
    }
  });

  document.getElementById('srvNextPage')?.addEventListener('click', () => {
    paginationState.services.page++;
    renderServicesTable();
  });

  // Category Form Change Tracking
  document.getElementById('categoryForm').addEventListener('input', checkCategoryFormChanges);
  document.getElementById('categoryForm').addEventListener('change', checkCategoryFormChanges);

  // Add Category Modal Handler
  document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
    document.getElementById('categoryModalTitle').textContent = 'Add New Category';
    document.getElementById('editCategoryId').value = '';
    document.getElementById('categoryForm').reset();
    document.getElementById('catIsActive').checked = true;
    categoryOriginalState = getCategoryFormValues();
    checkCategoryFormChanges();
    document.getElementById('categoryModal').classList.remove('hidden');
  });

  // Submit Category Form
  document.getElementById('categoryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const catId = document.getElementById('editCategoryId').value;
    const payload = {
      name: document.getElementById('catName').value.trim(),
      icon: document.getElementById('catIcon').value,
      price: Number(document.getElementById('catPrice').value) || 0,
      unit: document.getElementById('catUnit').value,
      description: document.getElementById('catDescription').value,
      isActive: document.getElementById('catIsActive').checked
    };

    try {
      const url = catId ? `${API_BASE}/categories/${catId}` : `${API_BASE}/categories`;
      const method = catId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Operation failed');

      document.getElementById('categoryModal').classList.add('hidden');
      showToast(catId ? 'Category updated successfully' : 'Category created successfully', 'success');
      await loadCategories();
      await loadDashboardStats();
    } catch (err) {
      showToast(`Error saving category: ${err.message}`, 'error');
    }
  });

  // Add Service Modal Handler
  document.getElementById('addServiceBtn')?.addEventListener('click', () => {
    openServiceModal(null);
  });

  // Service Form Change Tracking
  document.getElementById('serviceForm').addEventListener('input', checkServiceFormChanges);
  document.getElementById('serviceForm').addEventListener('change', checkServiceFormChanges);

  // Add Add-on button listener
  document.getElementById('addAddonBtn')?.addEventListener('click', () => {
    addAddonRowUI();
  });

  // Submit Service Form
  document.getElementById('serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const srvId = document.getElementById('editServiceId').value;
    
    const customerRequirements = collectRequirementsFromUI();
    const addons = collectAddonsFromUI();
    const providerEligibility = {
      requiredCertifications: document.getElementById('eligRequiredCertifications').value.split(',').map(s=>s.trim()).filter(Boolean),
      requiredEquipment: document.getElementById('eligRequiredEquipment').value.split(',').map(s=>s.trim()).filter(Boolean),
      requiredInsurance: document.getElementById('eligRequiredInsurance').checked
    };

    const pricingModel = document.getElementById('srvPricingModel').value;
    const basePrice = Number(document.getElementById('srvBasePrice').value) || 0;
    const unitLabel = document.getElementById('srvUnitLabel').value || 'Unit';
    const unitLabelPlural = document.getElementById('srvUnitLabelPlural').value || 'Units';
    const includedQty = Number(document.getElementById('srvIncludedQty').value) || 1;
    const extraUnitPrice = Number(document.getElementById('srvExtraUnitPrice').value) || 0;
    const minQty = Number(document.getElementById('srvMinQty').value) || 1;
    const maxQty = Number(document.getElementById('srvMaxQty').value) || 10;
    const defaultDuration = Number(document.getElementById('srvDefaultDuration').value) || 2.0;

    const pricingRules = {
      pricingModel,
      unitLabel,
      unitLabelPlural,
      includedQuantity: includedQty,
      additionalUnitPrice: extraUnitPrice,
      minimumQuantity: minQty,
      maximumQuantity: maxQty
    };

    const payload = {
      name: document.getElementById('srvName').value.trim(),
      categoryId: document.getElementById('srvCategory').value,
      price: basePrice,
      unit: unitLabel.toLowerCase(),
      duration: `${defaultDuration} hrs`,
      description: document.getElementById('srvFullDesc').value,
      baseIncludes: document.getElementById('srvShortDesc').value,
      imageUrl: document.getElementById('srvImageUrl').value,
      isActive: document.getElementById('srvIsActive').checked,
      isVisible: document.getElementById('srvIsVisible').checked,
      pricingRules,
      customerRequirements,
      addons,
      providerEligibility
    };

    try {
      const url = srvId ? `${API_BASE}/services/${srvId}` : `${API_BASE}/services`;
      const method = srvId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to save service');

      document.getElementById('serviceModal').classList.add('hidden');
      showToast(srvId ? 'Service configuration saved' : 'New service created successfully', 'success');
      await loadServices();
      await loadDashboardStats();
    } catch (err) {
      showToast(`Error saving service: ${err.message}`, 'error');
    }
  });

  document.getElementById('addRequirementBtn').addEventListener('click', addRequirementRowUI);
  document.getElementById('addAddonBtn').addEventListener('click', addAddonRowUI);
}

function showLogin() {
  loginOverlay.classList.remove('hidden');
  mainLayout.classList.add('hidden');
}

function showDashboard() {
  loginOverlay.classList.add('hidden');
  mainLayout.classList.remove('hidden');
  document.getElementById('adminName').textContent = currentAdmin.name || 'Platform Admin';
  document.getElementById('adminEmailDisplay').textContent = currentAdmin.email || 'admin@homehelp.uk';
  
  // Resolve route from current pathname
  const path = window.location.pathname.replace(/\/$/, '') || '/admin';
  const tabName = ROUTE_MAP[path] || 'dashboard';
  switchTab(tabName, false);
}

function navigateTo(path) {
  const normalizedPath = path.replace(/\/$/, '') || '/admin';
  const tabName = ROUTE_MAP[normalizedPath] || 'dashboard';
  if (window.location.pathname !== normalizedPath) {
    window.history.pushState({ tab: tabName }, '', normalizedPath);
  }
  switchTab(tabName, false);
}

function handlePopState(e) {
  const path = window.location.pathname.replace(/\/$/, '') || '/admin';
  const tabName = ROUTE_MAP[path] || 'dashboard';
  switchTab(tabName, false);
}

function switchTab(tabName, shouldPushState = true) {
  if (shouldPushState) {
    const targetPath = TAB_PATH_MAP[tabName] || '/admin';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: tabName }, '', targetPath);
    }
  }

  document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const activeBtn = document.querySelector(`.sidebar-nav .nav-item[data-tab="${tabName}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  const activeTabContent = document.getElementById(`tab-${tabName}`);
  if (activeTabContent) activeTabContent.classList.add('active');

  const titles = {
    dashboard: 'Dashboard Overview',
    categories: 'Category Management',
    services: 'Centralized Service Catalogue & Pricing',
    providers: 'Provider Management',
    settings: 'Platform Settings'
  };
  document.getElementById('currentTabTitle').textContent = titles[tabName] || 'Admin Dashboard';

  loadActiveRouteData(tabName);
}

async function loadActiveRouteData(tabName) {
  try {
    if (tabName === 'dashboard') {
      await loadDashboardStats();
    } else if (tabName === 'categories') {
      await loadCategories();
    } else if (tabName === 'services') {
      if (categoriesData.length === 0) await loadCategories();
      await loadServices();
    } else if (tabName === 'providers') {
      await loadProviders();
    } else if (tabName === 'settings') {
      await loadPlatformSettings();
    }
  } catch (err) {
    console.error(`Error loading data for ${tabName}:`, err);
  }
}

async function loadAllData() {
  const path = window.location.pathname.replace(/\/$/, '') || '/admin';
  const currentTab = ROUTE_MAP[path] || 'dashboard';
  await loadActiveRouteData(currentTab);
}

// --- DASHBOARD DATA ---
async function loadDashboardStats() {
  try {
    const res = await fetch(`${API_BASE}/dashboard-stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.stats) {
      const s = data.stats;
      document.getElementById('statCategories').textContent = s.totalCategories;
      document.getElementById('statServices').textContent = s.totalServices;
      document.getElementById('statActive').textContent = s.activeServices;
      document.getElementById('statInactive').textContent = s.inactiveServices;
      document.getElementById('statConfigured').textContent = s.servicesWithPricingConfigured;

      recentServicesData = s.recentlyUpdatedServices || [];
      renderRecentServicesTable();
    }
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

function renderRecentServicesTable() {
  const tbody = document.getElementById('recentServicesTbody');
  let sorted = [...recentServicesData];
  const sort = sortState.recent;

  if (sort.col) {
    sorted.sort((a, b) => {
      let valA = a[sort.col] || '';
      let valB = b[sort.col] || '';
      if (sort.col === 'price') { valA = Number(valA); valB = Number(valB); }
      if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No recent services</td></tr>';
    return;
  }

  tbody.innerHTML = sorted.map(srv => `
    <tr>
      <td><strong>${escapeHtml(srv.name)}</strong></td>
      <td>${escapeHtml(srv.category_name || 'N/A')}</td>
      <td>£${Number(srv.price).toFixed(2)}</td>
      <td>${escapeHtml(srv.unit || 'visit')}</td>
      <td><span class="badge ${srv.is_active ? 'badge-success' : 'badge-warning'}">${srv.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
    </tr>
  `).join('');
}

// --- CATEGORIES ---
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      categoriesData = data.categories || [];
      renderCategoriesTable();
      populateCategorySelects();
    }
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

function renderCategoriesTable() {
  const tbody = document.getElementById('categoriesTbody');
  if (!tbody) return;
  const term = document.getElementById('categorySearch')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('categoryStatusFilter')?.value || 'all';

  let filtered = categoriesData.filter(c => {
    const matchTerm = c.name.toLowerCase().includes(term) || c.id.toLowerCase().includes(term);
    let matchStatus = true;
    if (statusFilter === 'active') matchStatus = c.isActive;
    if (statusFilter === 'inactive') matchStatus = !c.isActive;
    return matchTerm && matchStatus;
  });

  // Sorting
  const sort = sortState.categories;
  if (sort.col) {
    filtered.sort((a, b) => {
      let valA = a[sort.col];
      let valB = b[sort.col];
      if (sort.col === 'price' || sort.col === 'orderIndex') { valA = Number(valA || 0); valB = Number(valB || 0); }
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Pagination
  const state = paginationState.categories;
  const total = filtered.length;
  const maxPage = Math.ceil(total / state.pageSize) || 1;
  if (state.page > maxPage) state.page = maxPage;

  const startIdx = (state.page - 1) * state.pageSize;
  const pagedItems = filtered.slice(startIdx, startIdx + state.pageSize);

  document.getElementById('categoryPageInfo').textContent = total > 0 ? `Showing ${startIdx + 1}-${Math.min(startIdx + state.pageSize, total)} of ${total} categories` : 'Showing 0 of 0';
  document.getElementById('catPageNum').textContent = `Page ${state.page} of ${maxPage}`;
  document.getElementById('catPrevPage').disabled = state.page <= 1;
  document.getElementById('catNextPage').disabled = state.page >= maxPage;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <span class="empty-icon">📂</span>
            <h4>No categories found</h4>
            <p>No categories match search query "${escapeHtml(term)}" or selected status filter.</p>
            <button class="btn btn-sm btn-secondary mt-8" onclick="clearCategoryFilters()">Clear Filters</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pagedItems.map(c => `
    <tr>
      <td>${c.orderIndex}</td>
      <td><strong>${escapeHtml(c.name)}</strong><br><small class="text-muted">${c.id}</small></td>
      <td>${renderIconBadge(c.icon)}</td>
      <td>£${Number(c.price).toFixed(2)}</td>
      <td>${escapeHtml(c.unit || 'hr')}</td>
      <td><span class="badge ${c.isActive ? 'badge-success' : 'badge-warning'}">${c.isActive ? 'ACTIVE' : 'INACTIVE'}</span></td>
      <td>
        <button type="button" class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editCategory('${c.id}')">Edit</button>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteCategory('${c.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

window.clearCategoryFilters = function() {
  document.getElementById('categorySearch').value = '';
  document.getElementById('clearCategorySearch').classList.add('hidden');
  document.getElementById('categoryStatusFilter').value = 'all';
  paginationState.categories.page = 1;
  renderCategoriesTable();
};

function populateCategorySelects() {
  const catFilter = document.getElementById('categoryFilter');
  const srvCat = document.getElementById('srvCategory');

  const optionsHtml = categoriesData.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  catFilter.innerHTML = '<option value="">All Categories</option>' + optionsHtml;
  srvCat.innerHTML = optionsHtml;
}

window.editCategory = function(id) {
  const c = categoriesData.find(cat => cat.id === id);
  if (!c) return;
  document.getElementById('categoryModalTitle').textContent = `Edit Category: ${c.name}`;
  document.getElementById('editCategoryId').value = c.id;
  document.getElementById('catName').value = c.name;
  document.getElementById('catIcon').value = c.icon || 'sparkles';
  document.getElementById('catPrice').value = c.price;
  document.getElementById('catUnit').value = c.unit || 'hr';
  document.getElementById('catDescription').value = c.description || '';
  document.getElementById('catIsActive').checked = c.isActive;

  categoryOriginalState = getCategoryFormValues();
  checkCategoryFormChanges();

  document.getElementById('categoryModal').classList.remove('hidden');
};

function getCategoryFormValues() {
  return JSON.stringify({
    name: document.getElementById('catName').value.trim(),
    icon: document.getElementById('catIcon').value,
    price: Number(document.getElementById('catPrice').value) || 0,
    unit: document.getElementById('catUnit').value,
    description: document.getElementById('catDescription').value,
    isActive: document.getElementById('catIsActive').checked
  });
}

function checkCategoryFormChanges() {
  const current = getCategoryFormValues();
  const isValid = document.getElementById('catName').value.trim().length > 0;
  const isChanged = current !== categoryOriginalState;
  document.getElementById('saveCategoryBtn').disabled = !(isValid && isChanged);
}

window.deleteCategory = function(id) {
  const c = categoriesData.find(cat => cat.id === id);
  if (!c) return;

  const activeServices = servicesData.filter(s => s.categoryId === id && s.isActive && !s.isArchived);
  let warningText = null;
  if (activeServices.length > 0) {
    warningText = `⚠️ This category currently contains ${activeServices.length} active services. Deleting this category may affect those dependent services.`;
  }

  showConfirmModal({
    title: `Delete "${c.name}" Category?`,
    text: `Are you sure you want to permanently delete the "${c.name}" category?`,
    warningText,
    confirmBtnText: 'Confirm Delete',
    onConfirm: async () => {
      try {
        const res = await fetch(`${API_BASE}/categories/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) {
          showToast(`Unable to delete category: ${data.message}`, 'error');
          return;
        }
        showToast(`Category "${c.name}" deleted successfully`, 'success');
        await loadCategories();
        await loadDashboardStats();
      } catch (err) {
        showToast(`Error deleting category: ${err.message}`, 'error');
      }
    }
  });
};

// --- SERVICES CATALOGUE ---
async function loadServices() {
  try {
    const res = await fetch(`${API_BASE}/services`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      servicesData = data.services || [];
      renderServicesTable();
    }
  } catch (err) {
    console.error('Error loading services:', err);
  }
}

function renderServicesTable() {
  const tbody = document.getElementById('servicesTbody');
  if (!tbody) return;
  const term = document.getElementById('serviceSearch')?.value.toLowerCase().trim() || '';
  const catFilter = document.getElementById('categoryFilter')?.value || '';
  const statusFilter = document.getElementById('statusFilter')?.value || '';

  let filtered = servicesData.filter(s => {
    const matchTerm = s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term);
    const matchCat = !catFilter || s.categoryId === catFilter;
    let matchStatus = true;
    if (statusFilter === 'active') matchStatus = s.isActive && !s.isArchived;
    if (statusFilter === 'inactive') matchStatus = !s.isActive && !s.isArchived;
    if (statusFilter === 'archived') matchStatus = s.isArchived;
    return matchTerm && matchCat && matchStatus;
  });

  // Sorting
  const sort = sortState.services;
  if (sort.col) {
    filtered.sort((a, b) => {
      let valA = a[sort.col];
      let valB = b[sort.col];
      if (sort.col === 'price') { valA = Number(valA || 0); valB = Number(valB || 0); }
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Pagination
  const state = paginationState.services;
  const total = filtered.length;
  const maxPage = Math.ceil(total / state.pageSize) || 1;
  if (state.page > maxPage) state.page = maxPage;

  const startIdx = (state.page - 1) * state.pageSize;
  const pagedItems = filtered.slice(startIdx, startIdx + state.pageSize);

  document.getElementById('servicePageInfo').textContent = total > 0 ? `Showing ${startIdx + 1}-${Math.min(startIdx + state.pageSize, total)} of ${total} services` : 'Showing 0 of 0';
  document.getElementById('srvPageNum').textContent = `Page ${state.page} of ${maxPage}`;
  document.getElementById('srvPrevPage').disabled = state.page <= 1;
  document.getElementById('srvNextPage').disabled = state.page >= maxPage;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state">
            <span class="empty-icon">🛠️</span>
            <h4>No services available</h4>
            <p>No services match search query "${escapeHtml(term)}" or selected filters.</p>
            <button class="btn btn-sm btn-secondary mt-8" onclick="clearServiceFilters()">Clear Filters</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pagedItems.map(s => {
    const model = s.pricingRules?.pricingModel || 'unitBased';
    const statusBadge = s.isArchived
      ? '<span class="badge badge-danger">ARCHIVED</span>'
      : (s.isActive ? '<span class="badge badge-success">ACTIVE</span>' : '<span class="badge badge-warning">INACTIVE</span>');

    return `
      <tr>
        <td><img src="${s.imageUrl || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=100&q=80'}" class="table-img" alt="service"></td>
        <td><code>${s.id}</code></td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${escapeHtml(s.categoryName)}</td>
        <td><span class="badge badge-info">${model}</span></td>
        <td>£${Number(s.price).toFixed(2)}</td>
        <td>${escapeHtml(s.unit || 'visit')}</td>
        <td>${statusBadge}</td>
        <td>
          <button type="button" class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); openServiceModal('${s.id}')">Edit</button>
          <button type="button" class="btn btn-sm ${s.isActive ? 'btn-outline-danger' : 'btn-primary'}" onclick="event.stopPropagation(); toggleServiceStatus('${s.id}', ${!s.isActive})">
            ${s.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.clearServiceFilters = function() {
  document.getElementById('serviceSearch').value = '';
  document.getElementById('clearServiceSearch').classList.add('hidden');
  document.getElementById('categoryFilter').value = '';
  document.getElementById('statusFilter').value = '';
  paginationState.services.page = 1;
  renderServicesTable();
};

window.openServiceModal = function(id) {
  currentEditingService = servicesData.find(s => s.id === id) || null;
  const modal = document.getElementById('serviceModal');
  const title = document.getElementById('serviceModalTitle');

  if (currentEditingService) {
    title.textContent = `Edit Service: ${currentEditingService.name}`;
    document.getElementById('editServiceId').value = currentEditingService.id;
    document.getElementById('srvName').value = currentEditingService.name;
    document.getElementById('srvCategory').value = currentEditingService.categoryId;
    document.getElementById('srvShortDesc').value = currentEditingService.baseIncludes || '';
    document.getElementById('srvFullDesc').value = currentEditingService.description || '';
    document.getElementById('srvImageUrl').value = currentEditingService.imageUrl || '';
    document.getElementById('srvIsActive').checked = currentEditingService.isActive;
    document.getElementById('srvIsVisible').checked = currentEditingService.isVisible;

    const pr = currentEditingService.pricingRules || {};
    const sc = currentEditingService.schedulingConfig || {};
    document.getElementById('srvPricingModel').value = pr.pricingModel || 'unitBased';
    document.getElementById('srvBasePrice').value = currentEditingService.price;
    document.getElementById('srvUnitLabel').value = pr.unitLabel || 'Item';
    document.getElementById('srvUnitLabelPlural').value = pr.unitLabelPlural || 'Items';
    document.getElementById('srvIncludedQty').value = pr.includedQuantity || 1;
    document.getElementById('srvExtraUnitPrice').value = pr.additionalUnitPrice || 0;
    document.getElementById('srvMinQty').value = pr.minimumQuantity || 1;
    document.getElementById('srvMaxQty').value = pr.maximumQuantity || 10;

    document.getElementById('srvSchedulingType').value = sc.schedulingType || 'fixed_duration';
    document.getElementById('srvDefaultDuration').value = sc.defaultDurationHours || 2.0;

    document.getElementById('srvWhatsIncluded').value = (currentEditingService.whatsIncluded || []).join('\n');
    document.getElementById('srvWhatsNotIncluded').value = (currentEditingService.whatsNotIncluded || []).join('\n');
    document.getElementById('srvGalleryImages').value = (currentEditingService.galleryImages || []).join('\n');

    const faqsArr = (currentEditingService.faqs || []).map(f => `Q: ${f.q || f.question || ''} | A: ${f.a || f.answer || ''}`);
    document.getElementById('srvFaqs').value = faqsArr.join('\n');

    renderRequirementsUI(currentEditingService.customerRequirements || []);
    renderAddonsUI(currentEditingService.addons || []);

    const el = currentEditingService.providerEligibility || {};
    document.getElementById('eligRequiredCertifications').value = (el.requiredCertifications || []).join(', ');
    document.getElementById('eligRequiredEquipment').value = (el.requiredEquipment || []).join(', ');
    document.getElementById('eligRequiredInsurance').checked = el.requiredInsurance !== false;
  } else {
    title.textContent = 'Create New Service';
    document.getElementById('editServiceId').value = '';
    document.getElementById('serviceForm').reset();
    renderRequirementsUI([]);
    renderAddonsUI([]);
  }

  serviceOriginalState = getServiceFormValues();
  checkServiceFormChanges();

  modal.classList.remove('hidden');
};

function getServiceFormValues() {
  return JSON.stringify({
    name: document.getElementById('srvName')?.value.trim() || '',
    categoryId: document.getElementById('srvCategory')?.value || '',
    shortDesc: document.getElementById('srvShortDesc')?.value || '',
    fullDesc: document.getElementById('srvFullDesc')?.value || '',
    imageUrl: document.getElementById('srvImageUrl')?.value || '',
    isActive: document.getElementById('srvIsActive')?.checked || false,
    isVisible: document.getElementById('srvIsVisible')?.checked || false,

    whatsIncluded: document.getElementById('srvWhatsIncluded')?.value || '',
    whatsNotIncluded: document.getElementById('srvWhatsNotIncluded')?.value || '',
    faqs: document.getElementById('srvFaqs')?.value || '',

    pricingModel: document.getElementById('srvPricingModel')?.value || 'unitBased',
    price: Number(document.getElementById('srvBasePrice')?.value) || 0,
    unitLabel: document.getElementById('srvUnitLabel')?.value || '',
    unitLabelPlural: document.getElementById('srvUnitLabelPlural')?.value || '',
    includedQty: document.getElementById('srvIncludedQty')?.value || '',
    extraUnitPrice: document.getElementById('srvExtraUnitPrice')?.value || '',
    minQty: document.getElementById('srvMinQty')?.value || '',
    maxQty: document.getElementById('srvMaxQty')?.value || '',

    schedulingType: document.getElementById('srvSchedulingType')?.value || '',
    defaultDuration: document.getElementById('srvDefaultDuration')?.value || '',

    reqs: JSON.stringify(collectRequirementsFromUI()),
    addons: JSON.stringify(collectAddonsFromUI()),

    certifications: document.getElementById('eligRequiredCertifications')?.value || '',
    equipment: document.getElementById('eligRequiredEquipment')?.value || '',
    insurance: document.getElementById('eligRequiredInsurance')?.checked || false,

    gallery: document.getElementById('srvGalleryImages')?.value || ''
  });
}

function checkServiceFormChanges() {
  const current = getServiceFormValues();
  const isValid = document.getElementById('srvName').value.trim().length > 0 && document.getElementById('srvCategory').value !== '';
  const isChanged = current !== serviceOriginalState;
  document.getElementById('saveServiceBtn').disabled = !(isValid && isChanged);
}

window.toggleServiceStatus = async function(id, newStatus) {
  const srv = servicesData.find(s => s.id === id);
  const actionName = newStatus ? 'Activate' : 'Deactivate';
  const serviceName = srv ? srv.name : id;
  const warningText = !newStatus ? `⚠️ Deactivating "${serviceName}" will prevent new customer bookings. Existing active bookings will remain unchanged.` : null;

  showConfirmModal({
    title: `${actionName} "${serviceName}" Service?`,
    text: `Are you sure you want to ${actionName.toLowerCase()} this service?`,
    warningText,
    confirmBtnText: actionName,
    onConfirm: async () => {
      try {
        const res = await fetch(`${API_BASE}/services/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ isActive: newStatus })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showToast(`Service status updated to ${newStatus ? 'active' : 'inactive'}`, 'success');
        await loadServices();
        await loadDashboardStats();
      } catch (err) {
        showToast(`Error updating status: ${err.message}`, 'error');
      }
    }
  });
};

// UI Builders for Requirements & Addons
function renderRequirementsUI(reqs) {
  const container = document.getElementById('requirementsContainer');
  if (!reqs || reqs.length === 0) {
    container.innerHTML = '<p class="text-muted">No custom customer questions added yet.</p>';
    return;
  }

  container.innerHTML = reqs.map((r, i) => `
    <div class="item-row" data-index="${i}">
      <div>
        <strong>${escapeHtml(r.question || r.label)}</strong>
        <span class="badge badge-info">${r.type || 'text'}</span>
        ${r.required ? '<span class="badge badge-warning">Required</span>' : ''}
      </div>
      <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeRequirementRow(${i})">Remove</button>
    </div>
  `).join('');
}

function addRequirementRowUI() {
  const container = document.getElementById('inlineRequirementFormContainer');
  if (!container) return;

  container.innerHTML = `
    <div style="background: var(--bg-dark); border: 1px solid var(--border-color); padding: 14px; border-radius: var(--radius-sm); margin-bottom: 12px;">
      <h5 style="margin-bottom: 8px;">Add Customer Question / Requirement</h5>
      <div class="form-group" style="margin-bottom: 8px;">
        <label>Question / Requirement Label *</label>
        <input type="text" id="newReqQuestion" placeholder="e.g., Property Size or Parking Available">
      </div>
      <div class="form-row" style="margin-bottom: 8px;">
        <div class="form-group" style="margin-bottom: 0;">
          <label>Field Type</label>
          <select id="newReqType">
            <option value="text">Short Text</option>
            <option value="textarea">Long Text</option>
            <option value="boolean">Yes/No Checkbox</option>
          </select>
        </div>
        <div class="form-group checkbox-group" style="margin-bottom: 0; align-items: flex-end;">
          <label><input type="checkbox" id="newReqRequired"> Required Field</label>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="btn btn-sm btn-secondary" onclick="cancelInlineRequirementUI()">Cancel</button>
        <button type="button" class="btn btn-sm btn-primary" onclick="confirmSaveRequirementUI()">Save Question</button>
      </div>
    </div>
  `;
}

window.cancelInlineRequirementUI = function() {
  const container = document.getElementById('inlineRequirementFormContainer');
  if (container) container.innerHTML = '';
};

window.confirmSaveRequirementUI = function() {
  const questionEl = document.getElementById('newReqQuestion');
  const typeEl = document.getElementById('newReqType');
  const reqEl = document.getElementById('newReqRequired');

  const question = questionEl ? questionEl.value.trim() : '';
  if (!question) {
    showToast('Requirement question label is required', 'error');
    return;
  }

  const reqs = currentEditingService ? (currentEditingService.customerRequirements || []) : [];
  reqs.push({
    id: `req_${Date.now()}`,
    question,
    type: typeEl ? typeEl.value : 'text',
    required: reqEl ? reqEl.checked : false
  });

  if (currentEditingService) currentEditingService.customerRequirements = reqs;
  renderRequirementsUI(reqs);
  checkServiceFormChanges();
  cancelInlineRequirementUI();
};

window.removeRequirementRow = function(i) {
  const reqs = currentEditingService ? currentEditingService.customerRequirements : [];
  reqs.splice(i, 1);
  renderRequirementsUI(reqs);
  checkServiceFormChanges();
};

function renderAddonsUI(addons) {
  const container = document.getElementById('addonsContainer');
  if (!addons || addons.length === 0) {
    container.innerHTML = '<p class="text-muted">No add-ons created for this service.</p>';
    return;
  }

  container.innerHTML = addons.map((a, i) => {
    const name = a.name || a.title || a.label || `Add-on ${i + 1}`;
    const price = Number(a.price || 0).toFixed(2);
    return `
      <div class="item-row">
        <div class="addon-row-title">
          <strong>${escapeHtml(name)}</strong> — £${price}
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeAddonRow(${i})">Remove</button>
      </div>
    `;
  }).join('');
}

function addAddonRowUI() {
  const formContainer = document.getElementById('inlineAddonFormContainer');
  if (!formContainer) return;

  if (document.getElementById('inlineAddonCard')) return;

  formContainer.innerHTML = `
    <div class="inline-addon-card" id="inlineAddonCard">
      <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 10px; color: var(--accent-primary);">+ Add New Add-on</div>
      <div class="inline-addon-row">
        <div class="inline-addon-field" style="flex: 2;">
          <label style="font-size: 0.75rem; color: var(--text-muted);">Add-on Name *</label>
          <input type="text" id="newAddonName" placeholder="e.g. Extra Bracket Mounting">
          <span class="inline-error-msg hidden" id="addonNameError">Name is required</span>
        </div>
        <div class="inline-addon-field" style="flex: 1;">
          <label style="font-size: 0.75rem; color: var(--text-muted);">Price (£) *</label>
          <input type="number" step="0.01" min="0.01" id="newAddonPrice" placeholder="15.00">
          <span class="inline-error-msg hidden" id="addonPriceError">Valid price required</span>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;">
        <button type="button" class="btn btn-sm btn-secondary" onclick="cancelInlineAddon()">Cancel</button>
        <button type="button" class="btn btn-sm btn-primary" onclick="saveInlineAddon()">Save Add-on</button>
      </div>
    </div>
  `;
}

window.cancelInlineAddon = function() {
  const formContainer = document.getElementById('inlineAddonFormContainer');
  if (formContainer) formContainer.innerHTML = '';
};

window.saveInlineAddon = function() {
  const nameInput = document.getElementById('newAddonName');
  const priceInput = document.getElementById('newAddonPrice');
  const nameErr = document.getElementById('addonNameError');
  const priceErr = document.getElementById('addonPriceError');

  const nameVal = nameInput.value.trim();
  const priceVal = Number(priceInput.value);

  let valid = true;

  if (!nameVal) {
    nameInput.classList.add('has-error');
    nameErr.classList.remove('hidden');
    valid = false;
  } else {
    nameInput.classList.remove('has-error');
    nameErr.classList.add('hidden');
  }

  if (isNaN(priceVal) || priceVal <= 0) {
    priceInput.classList.add('has-error');
    priceErr.classList.remove('hidden');
    valid = false;
  } else {
    priceInput.classList.remove('has-error');
    priceErr.classList.add('hidden');
  }

  if (!valid) return;

  const addons = currentEditingService ? (currentEditingService.addons || []) : [];
  addons.push({
    id: `addon_${Date.now()}`,
    name: nameVal,
    price: Math.round(priceVal * 100) / 100
  });

  if (currentEditingService) currentEditingService.addons = addons;
  window.cancelInlineAddon();
  renderAddonsUI(addons);
  checkServiceFormChanges();
};

window.removeAddonRow = function(i) {
  const addons = currentEditingService ? currentEditingService.addons : [];
  const item = addons[i];
  const name = item ? (item.name || item.title || item.label || `Add-on ${i + 1}`) : 'this add-on';

  showConfirmModal({
    title: `Remove Add-on "${name}"?`,
    text: `Are you sure you want to remove the add-on "${name}" from this service?`,
    confirmBtnText: 'Remove Add-on',
    onConfirm: () => {
      addons.splice(i, 1);
      if (currentEditingService) currentEditingService.addons = addons;
      renderAddonsUI(addons);
      checkServiceFormChanges();
    }
  });
};

function collectRequirementsFromUI() {
  return currentEditingService ? (currentEditingService.customerRequirements || []) : [];
}

function collectAddonsFromUI() {
  return currentEditingService ? (currentEditingService.addons || []) : [];
}

function updateSortHeaderIcons(tableKey) {
  const current = sortState[tableKey];
  document.querySelectorAll(`.data-table th.sortable[data-table="${tableKey}"]`).forEach(th => {
    const col = th.dataset.col;
    const iconEl = th.querySelector('.sort-icon');
    if (iconEl) {
      if (current.col === col) {
        iconEl.textContent = current.dir === 'asc' ? ' ↑' : ' ↓';
      } else {
        iconEl.textContent = '';
      }
    }
  });
}

function renderIconBadge(iconName) {
  const glyph = ICON_MAP[iconName] || '📁';
  return `<span class="icon-glyph-badge">${glyph} ${escapeHtml(iconName || 'default')}</span>`;
}

// --- PROVIDERS MANAGEMENT UI ---
async function loadProviders() {
  try {
    const res = await fetch(`${API_BASE}/providers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      providersData = data.providers || [];
      renderProvidersTable();
    }
  } catch (err) {
    console.error('Error loading providers:', err);
    showToast('Failed to load providers', 'error');
  }
}

function renderProvidersTable() {
  const tbody = document.getElementById('providersTbody');
  if (!tbody) return;

  const term = document.getElementById('providerSearch')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('providerStatusFilter')?.value || 'all';
  const verifiedFilter = document.getElementById('providerVerifiedFilter')?.value || 'all';

  let filtered = providersData.filter(p => {
    const matchTerm = p.name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term) || p.phone.toLowerCase().includes(term);
    let matchStatus = true;
    if (statusFilter === 'active') matchStatus = p.isActive;
    if (statusFilter === 'inactive') matchStatus = !p.isActive;

    let matchVerified = true;
    if (verifiedFilter === 'verified') matchVerified = p.verified;
    if (verifiedFilter === 'unverified') matchVerified = !p.verified;

    return matchTerm && matchStatus && matchVerified;
  });

  // Pagination
  const state = paginationState.providers;
  const total = filtered.length;
  const maxPage = Math.ceil(total / state.pageSize) || 1;
  if (state.page > maxPage) state.page = maxPage;

  const startIdx = (state.page - 1) * state.pageSize;
  const pagedItems = filtered.slice(startIdx, startIdx + state.pageSize);

  document.getElementById('providerPageInfo').textContent = `Showing ${pagedItems.length} of ${total} providers`;
  document.getElementById('provPageNum').textContent = `Page ${state.page} of ${maxPage}`;
  document.getElementById('provPrevPage').disabled = state.page <= 1;
  document.getElementById('provNextPage').disabled = state.page >= maxPage;

  if (pagedItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No providers found</td></tr>';
    return;
  }

  tbody.innerHTML = pagedItems.map(p => {
    const categoriesCount = p.categories ? p.categories.length : 0;
    const servicesCount = p.services ? p.services.length : 0;

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700;">
              ${escapeHtml((p.name || 'P').charAt(0).toUpperCase())}
            </div>
            <strong>${escapeHtml(p.name)}</strong>
          </div>
        </td>
        <td>${escapeHtml(p.email)}</td>
        <td>${escapeHtml(p.phone || 'N/A')}</td>
        <td>${escapeHtml(p.postcode || 'London')} (${p.serviceRadiusMiles} mi)</td>
        <td><span class="badge badge-info">${servicesCount} services offered (${categoriesCount} cats)</span></td>
        <td><span class="badge ${p.isActive ? 'badge-success' : 'badge-danger'}">${p.isActive ? 'ACTIVE' : 'INACTIVE'}</span></td>
        <td><span class="badge ${p.verified ? 'badge-success' : 'badge-warning'}">${p.verified ? 'VERIFIED' : 'UNVERIFIED'}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); openProviderModal('${p.id}')">View</button>
            <button type="button" class="btn btn-sm ${p.isActive ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="event.stopPropagation(); toggleProviderStatusUI('${p.id}', 'active', ${!p.isActive})">
              ${p.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.openProviderModal = async function(providerId) {
  const modal = document.getElementById('providerDetailModal');
  const body = document.getElementById('providerModalBody');
  modal.classList.remove('hidden');
  body.innerHTML = '<p class="text-center" style="padding: 40px;">Loading provider profile...</p>';

  try {
    const res = await fetch(`${API_BASE}/providers/${providerId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    const p = data.provider;
    document.getElementById('providerModalTitle').textContent = `Provider Profile: ${p.name}`;

    const regDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

    body.innerHTML = `
      <div style="display: flex; gap: 16px; margin-bottom: 20px; align-items: center; background: var(--bg-dark); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--accent-primary); color: #fff; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; font-weight: 700;">
          ${escapeHtml((p.name || 'P').charAt(0).toUpperCase())}
        </div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 4px 0;">${escapeHtml(p.name)}</h3>
          <p style="margin: 0; color: var(--text-muted); font-size: 0.85rem;">
            ${escapeHtml(p.email)} • ${escapeHtml(p.phone || 'No phone')} • Registered ${regDate}
          </p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-sm ${p.isActive ? 'btn-danger' : 'btn-success'}" onclick="toggleProviderStatusUI('${p.id}', 'active', ${!p.isActive})">
            ${p.isActive ? 'Deactivate Account' : 'Activate Account'}
          </button>
          <button type="button" class="btn btn-sm ${p.verified ? 'btn-secondary' : 'btn-primary'}" onclick="toggleProviderStatusUI('${p.id}', 'verified', ${!p.verified})">
            ${p.verified ? 'Mark Unverified' : 'Mark Verified'}
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <div style="background: var(--bg-dark); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <h4 style="color: var(--accent-gold); margin-top: 0; margin-bottom: 12px;">Account & Coverage Summary</h4>
          <p style="margin: 6px 0;"><strong>Postcode / Base:</strong> ${escapeHtml(p.postcode || 'N/A')}</p>
          <p style="margin: 6px 0;"><strong>Service Radius:</strong> ${p.serviceRadiusMiles} miles</p>
          <p style="margin: 6px 0;"><strong>Rating:</strong> ⭐ ${p.rating} (${p.reviewCount} reviews)</p>
          <p style="margin: 6px 0;"><strong>Completed Jobs:</strong> ${p.completedJobs}</p>
          <p style="margin: 6px 0;"><strong>Vacation Mode:</strong> ${p.vacationMode ? 'ON' : 'OFF'}</p>
        </div>

        <div style="background: var(--bg-dark); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <h4 style="color: var(--accent-gold); margin-top: 0; margin-bottom: 12px;">Categories Offered & Verification Docs</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
            ${p.categories && p.categories.length > 0
              ? p.categories.map(c => `<span class="badge badge-info">${escapeHtml(c.name || c)}</span>`).join('')
              : '<span class="text-muted">No active categories selected</span>'}
          </div>
          <h5 style="margin: 8px 0 4px 0; font-size: 0.85rem; color: var(--text-muted);">Verification & Compliance Documents</h5>
          <p style="margin: 0; font-size: 0.85rem;">
            ${p.documents && Object.keys(p.documents).length > 0
              ? Object.entries(p.documents).map(([k, v]) => `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}`).join('<br>')
              : '<span class="text-muted">Not provided</span>'}
          </p>
        </div>
      </div>

      <div style="background: var(--bg-dark); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <h4 style="color: var(--accent-gold); margin-top: 0; margin-bottom: 12px;">Services Participation & Access</h4>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
          Core pricing and rules are set by Admin. You can enable or disable provider access to individual services below.
        </p>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Category</th>
                <th>Global Admin Price</th>
                <th>Provider Participation</th>
                <th>Admin Action</th>
              </tr>
            </thead>
            <tbody>
              ${p.services && p.services.length > 0 ? p.services.map(s => `
                <tr>
                  <td><strong>${escapeHtml(s.name)}</strong></td>
                  <td>${escapeHtml(s.categoryName || 'N/A')}</td>
                  <td>£${Number(s.price).toFixed(2)} / ${escapeHtml(s.unit || 'visit')}</td>
                  <td>
                    <span class="badge ${s.enabled ? 'badge-success' : 'badge-warning'}">
                      ${s.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </td>
                  <td>
                    <button type="button" class="btn btn-xs ${s.enabled ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="toggleProviderServiceUI('${p.id}', '${s.serviceId}', ${!s.enabled})">
                      ${s.enabled ? 'Disable Access' : 'Enable Access'}
                    </button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="text-center">No services configured for this provider</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<p class="text-danger text-center">Error loading provider details: ${err.message}</p>`;
  }
};

window.toggleProviderStatusUI = async function(providerId, field, value) {
  const actionName = field === 'active' ? (value ? 'Activate' : 'Deactivate') : (value ? 'Verify' : 'Unverify');

  showConfirmModal({
    title: `${actionName} Provider Account?`,
    text: `Are you sure you want to ${actionName.toLowerCase()} this provider account?`,
    confirmBtnText: actionName,
    onConfirm: async () => {
      try {
        const payload = field === 'active' ? { isActive: value } : { verified: value };
        const res = await fetch(`${API_BASE}/providers/${providerId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        showToast(`Provider ${actionName.toLowerCase()}d successfully`, 'success');
        document.getElementById('providerDetailModal').classList.add('hidden');
        await loadProviders();
      } catch (err) {
        showToast(`Error updating provider status: ${err.message}`, 'error');
      }
    }
  });
};

window.toggleProviderServiceUI = async function(providerId, serviceId, enabled) {
  try {
    const res = await fetch(`${API_BASE}/providers/${providerId}/services/${serviceId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ enabled })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    showToast(`Provider service access updated`, 'success');
    await openProviderModal(providerId);
    await loadProviders();
  } catch (err) {
    showToast(`Error updating service access: ${err.message}`, 'error');
  }
};

async function loadPlatformSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.settings)) {
      const commSetting = data.settings.find(s => s.key === 'platform_commission_pct');
      if (commSetting && document.getElementById('platformCommission')) {
        document.getElementById('platformCommission').value = commSetting.value;
      }
    }
  } catch (err) {
    console.error('Error loading platform settings:', err);
  }
}

document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const val = document.getElementById('platformCommission').value;
  try {
    const res = await fetch(`${API_BASE}/settings/platform_commission_pct`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ value: val })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    showToast('Platform settings updated successfully', 'success');
  } catch (err) {
    showToast(`Error updating settings: ${err.message}`, 'error');
  }
});

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
