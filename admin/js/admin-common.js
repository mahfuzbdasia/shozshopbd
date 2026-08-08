// SohozShopBD Admin — shared helpers for every admin page (auth guard, API calls, toasts)
const AdminAuth = (function () {
  const KEY = 'SohozShopBD_admin_token';
  const ADMIN_KEY = 'SohozShopBD_admin_info';

  function token() { return localStorage.getItem(KEY); }
  function setSession(token, admin) {
    localStorage.setItem(KEY, token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  }
  function admin() { try { return JSON.parse(localStorage.getItem(ADMIN_KEY)); } catch (e) { return null; } }
  function logout() { localStorage.removeItem(KEY); localStorage.removeItem(ADMIN_KEY); window.location.href = '/admin/login.html'; }
  function requireAuth() {
    if (!token()) window.location.href = '/admin/login.html';
  }
  return { token, setSession, admin, logout, requireAuth };
})();

async function adminFetch(url, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {}, {
    Authorization: `Bearer ${AdminAuth.token()}`,
  });
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) { AdminAuth.logout(); throw new Error('Session expired'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showToast(message, isError) {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast show${isError ? ' error' : ''}`;
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function fmtBDT(n) { return '৳' + Number(n || 0).toLocaleString('en-US'); }
function fmtDate(s) { return new Date(s.replace(' ', 'T') + 'Z').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

if (typeof window !== 'undefined') {
  window.AdminAuth = AdminAuth;
  window.adminFetch = adminFetch;
  window.showToast = showToast;
  window.fmtBDT = fmtBDT;
  window.fmtDate = fmtDate;
}

document.addEventListener('DOMContentLoaded', () => {
  const who = document.getElementById('admin-who');
  const admin = AdminAuth.admin();
  if (who && admin) who.textContent = admin.name;
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', AdminAuth.logout);

  const path = window.location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar-nav a').forEach((a) => {
    if (a.getAttribute('href').endsWith(path)) a.classList.add('active');
  });
});
