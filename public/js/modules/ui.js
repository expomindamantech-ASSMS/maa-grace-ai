'use strict';

window.UI = {
  /* ── Toast ─────────────────────────────────────────────── */
  toast(msg, type) {
    const colors = { success:'bg-green-600', error:'bg-red-600', info:'bg-blue-600', warn:'bg-yellow-600' };
    const bg = colors[type] || colors.info;
    const t = DOM.el('div', `fixed bottom-6 right-4 z-50 px-4 py-3 rounded-xl text-white text-sm shadow-lg ${bg} transition-all`, msg);
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, CONSTANTS.TOAST_DURATION);
  },

  /* ── Loading overlay ──────────────────────────────────── */
  showLoading(msg) {
    let ov = DOM.qs('#app-overlay');
    if (!ov) {
      ov = DOM.el('div', 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center', '');
      ov.id = 'app-overlay';
      document.body.appendChild(ov);
    }
    ov.innerHTML = `<div class="bg-gray-900 rounded-2xl px-8 py-6 text-white flex flex-col items-center gap-3">
      <div class="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
      <p class="text-sm">${msg || 'Loading…'}</p></div>`;
  },

  hideLoading() {
    const ov = DOM.qs('#app-overlay');
    if (ov) ov.remove();
  },

  /* ── Modal helpers ────────────────────────────────────── */
  openModal(id)  { DOM.show(DOM.qs(`#${id}`)); },
  closeModal(id) { DOM.hide(DOM.qs(`#${id}`)); },

  /* ── Usage bar ────────────────────────────────────────── */
  async refreshUsage() {
    try {
      const usage = await API.getUsage();
      const bar   = DOM.qs('#usage-bar');
      if (!bar) return;
      const pct = usage.limits.messages
        ? Math.min(100, Math.round((usage.used.messages / usage.limits.messages) * 100))
        : 0;
      bar.innerHTML = `
        <div class="flex justify-between text-xs text-gray-400 mb-1">
          <span>Messages ${usage.used.messages}/${usage.limits.messages}</span>
          <span class="text-yellow-400 capitalize">${usage.plan}</span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-1.5">
          <div class="h-1.5 rounded-full ${pct>=90?'bg-red-500':'bg-green-500'}" style="width:${pct}%"></div>
        </div>`;
    } catch(_) {}
  },

  /* ── Auth forms toggle ────────────────────────────────── */
  showLogin()    { DOM.hide(DOM.qs('#signup-form')); DOM.show(DOM.qs('#login-form')); },
  showSignup()   { DOM.hide(DOM.qs('#login-form'));  DOM.show(DOM.qs('#signup-form')); },
  showApp()      { DOM.hide(DOM.qs('#auth-screen')); DOM.show(DOM.qs('#app-screen')); },
  showAuth()     { DOM.show(DOM.qs('#auth-screen')); DOM.hide(DOM.qs('#app-screen')); },

  /* ── Sidebar toggle (mobile) ──────────────────────────── */
  toggleSidebar() {
    DOM.qs('#sidebar').classList.toggle('-translate-x-full');
  },

  /* ── Confirm inline delete ────────────────────────────── */
  confirmDelete(btn, onConfirm) {
    btn.textContent = 'Sure?';
    btn.classList.add('text-red-400');
    const t = setTimeout(() => { btn.textContent = '🗑'; btn.classList.remove('text-red-400'); }, CONSTANTS.DELETE_CONFIRM_MS);
    btn.onclick = () => { clearTimeout(t); onConfirm(); };
  },
};
