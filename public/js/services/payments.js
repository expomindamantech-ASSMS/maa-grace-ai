'use strict';

window.PaymentsService = {
  async openPlansModal() {
    UI.openModal('plans-modal');
    const grid = DOM.qs('#plans-grid');
    grid.innerHTML = '<p class="text-gray-400 text-sm">Loading plans…</p>';
    try {
      const plans = await API.listPlans();
      if (!plans.length) {
        grid.innerHTML = '<p class="text-gray-400 text-sm">No plans available yet.</p>';
        return;
      }
      grid.innerHTML = '';
      plans.forEach(p => {
        const card = DOM.el('div', 'bg-gray-800 rounded-2xl p-5 flex flex-col gap-3 border border-gray-700 hover:border-green-500 transition');
        card.innerHTML = `
          <h3 class="text-white font-bold text-lg capitalize">${Helpers.escapeHtml(p.name)}</h3>
          <p class="text-green-400 text-2xl font-bold">${p.currency} ${p.price}<span class="text-sm text-gray-400">/mo</span></p>
          <ul class="text-sm text-gray-300 space-y-1">${(p.features||[]).map(f=>`<li>✅ ${Helpers.escapeHtml(f)}</li>`).join('')}</ul>
          <button class="mt-auto bg-green-600 hover:bg-green-500 text-white rounded-xl py-2 text-sm font-semibold"
                  data-plan-id="${p.id}" data-plan-name="${p.name}">Subscribe</button>`;
        card.querySelector('button').onclick = () => window.PaymentsService.startPayment(p.id, p.name);
        grid.appendChild(card);
      });
    } catch(e) { grid.innerHTML = `<p class="text-red-400">${e.message}</p>`; }
  },

  async startPayment(planId, planName) {
    const email = Parse.User.current()?.get('email') || window.prompt('Enter your email:');
    if (!email) return;
    UI.showLoading('Initializing payment…');
    try {
      const res = await API.initializePayment({ planId, email });
      UI.hideLoading();
      window.location.href = res.authorizationUrl;
    } catch(e) {
      UI.hideLoading();
      UI.toast(e.message, 'error');
    }
  },

  async verifyAfterRedirect() {
    const params = new URLSearchParams(window.location.search);
    const ref    = params.get('reference') || params.get('trxref');
    if (!ref) return;
    UI.showLoading('Verifying payment…');
    try {
      const res = await API.verifyPayment({ reference: ref });
      UI.hideLoading();
      if (res.ok) {
        UI.toast(`${res.plan} plan activated! 🎉`, 'success');
        UI.refreshUsage();
      }
    } catch(e) {
      UI.hideLoading();
      UI.toast(e.message, 'error');
    }
    // clean URL
    window.history.replaceState({}, '', window.location.pathname);
  },
};
