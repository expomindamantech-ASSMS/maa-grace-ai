'use strict';

/* ── Bootstrap ─────────────────────────────────────────── */
(async function init() {
  // Init Parse
  Parse.initialize(APP_CONFIG.PARSE_APP_ID, APP_CONFIG.PARSE_JS_KEY);
  Parse.serverURL = APP_CONFIG.PARSE_SERVER_URL;

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }

  // Wire auth buttons
  DOM.qs('#login-btn')?.addEventListener('click',  handleLogin);
  DOM.qs('#signup-btn')?.addEventListener('click', handleSignup);
  DOM.qs('#logout-btn')?.addEventListener('click', handleLogout);
  DOM.qs('#show-signup')?.addEventListener('click', UI.showSignup.bind(UI));
  DOM.qs('#show-login')?.addEventListener('click',  UI.showLogin.bind(UI));

  // Wire sidebar new chat
  DOM.qs('#new-chat-btn')?.addEventListener('click', Chat.newThread);

  // Wire export buttons
  DOM.qs('#export-pdf')?.addEventListener('click',  Chat.exportPDF);
  DOM.qs('#export-docx')?.addEventListener('click', Chat.exportDOCX);
  DOM.qs('#export-xls')?.addEventListener('click',  Chat.exportXLS);

  // Wire upgrade button
  DOM.qs('#upgrade-btn')?.addEventListener('click', PaymentsService.openPlansModal.bind(PaymentsService));
  DOM.qs('#plans-close')?.addEventListener('click', () => UI.closeModal('plans-modal'));

  // Mobile sidebar toggle
  DOM.qs('#sidebar-toggle')?.addEventListener('click', UI.toggleSidebar);

  // Auto-resize textarea
  const input = DOM.qs('#msg-input');
  if (input) {
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 160) + 'px';
    });
  }

  // Init modules
  Composer.init();
  Images.init();
  Voice.init();

  // Check session
  const user = Parse.User.current();
  if (user) {
    await enterApp();
  } else {
    UI.showAuth();
  }
})();

async function handleLogin() {
  const username = DOM.qs('#login-user').value.trim();
  const password = DOM.qs('#login-pass').value;
  if (!username || !password) { UI.toast('Fill all fields', 'warn'); return; }
  UI.showLoading('Logging in…');
  try {
    await Parse.User.logIn(username, password);
    await enterApp();
  } catch(e) {
    UI.toast(e.message, 'error');
  } finally {
    UI.hideLoading();
  }
}

async function handleSignup() {
  const username = DOM.qs('#signup-user').value.trim();
  const email    = DOM.qs('#signup-email').value.trim();
  const password = DOM.qs('#signup-pass').value;
  if (!username || !email || !password) { UI.toast('Fill all fields', 'warn'); return; }
  UI.showLoading('Creating account…');
  try {
    const user = new Parse.User();
    user.set('username', username);
    user.set('email', email);
    user.set('password', password);
    await user.signUp();
    await enterApp();
  } catch(e) {
    UI.toast(e.message, 'error');
  } finally {
    UI.hideLoading();
  }
}

async function handleLogout() {
  await Parse.User.logOut();
  UI.showAuth();
}

async function enterApp() {
  UI.showApp();
  DOM.qs('#user-name').textContent = Parse.User.current()?.get('username') || '';
  await Promise.all([Chat.loadThreads(), UI.refreshUsage()]);
  await PaymentsService.verifyAfterRedirect();
}
