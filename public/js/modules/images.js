'use strict';

window.Images = (() => {
  /* ── Pexels image search modal ───────────────────────── */
  function openSearchModal() {
    UI.openModal('pexels-modal');
    DOM.qs('#pexels-results').innerHTML = '';
    DOM.qs('#pexels-input').value = '';
    DOM.qs('#pexels-input').focus();
  }

  function closeSearchModal() { UI.closeModal('pexels-modal'); }

  async function searchPexels() {
    const q = DOM.qs('#pexels-input').value.trim();
    if (!q) return;
    const grid = DOM.qs('#pexels-results');
    grid.innerHTML = '<p class="text-gray-400 text-sm col-span-3">Searching…</p>';
    try {
      const res = await API.searchPexels({ query: q, perPage: 12 });
      grid.innerHTML = '';
      if (!res.photos.length) { grid.innerHTML = '<p class="text-gray-400 text-sm col-span-3">No results</p>'; return; }
      res.photos.forEach(p => {
        const img = DOM.el('img','w-full h-24 object-cover rounded-xl cursor-pointer hover:ring-2 ring-green-500 transition');
        img.src   = p.thumb;
        img.title = p.photographer;
        img.onclick = () => selectPexelsImage(p.full);
        grid.appendChild(img);
      });
    } catch(e) { grid.innerHTML = `<p class="text-red-400 text-sm col-span-3">${e.message}</p>`; }
  }

  function selectPexelsImage(url) {
    Composer.addImageFromSearch(url);
    closeSearchModal();
    UI.toast('Image attached ✅', 'success');
  }

  /* ── AI image generation ─────────────────────────────── */
  async function generateAIImage() {
    const threadId = Chat.getCurrentThreadId();
    if (!threadId) { UI.toast('Open a chat first', 'warn'); return; }

    const prompt = DOM.qs('#msg-input').value.trim() || window.prompt('Image prompt:');
    if (!prompt) return;

    UI.showLoading('Generating image…');
    try {
      const res = await API.generateImage({ prompt, threadId });
      // Append to message list
      const box  = DOM.qs('#messages');
      const wrap = DOM.el('div','flex justify-start mb-4');
      wrap.innerHTML = `
        <div class="max-w-xs">
          <img src="${res.imageUrl}" alt="AI image" class="rounded-2xl shadow-lg max-w-full cursor-pointer"
               onclick="window.open('${res.imageUrl}','_blank')">
          <p class="text-xs text-gray-500 mt-1">${Helpers.escapeHtml(prompt)}</p>
        </div>`;
      box.appendChild(wrap);
      DOM.scrollBottom(box);
      DOM.qs('#msg-input').value = '';
      UI.toast('Image generated ✅', 'success');
      UI.refreshUsage();
    } catch(e) {
      UI.toast(e.message, 'error');
    } finally {
      UI.hideLoading();
    }
  }

  /* ── Image preview modal ─────────────────────────────── */
  function previewImage(src) {
    const modal = DOM.qs('#img-preview-modal');
    DOM.qs('#img-preview-src').src = src;
    UI.openModal('img-preview-modal');
  }

  function init() {
    // Pexels search button
    DOM.qs('#pexels-btn')?.addEventListener('click', openSearchModal);
    DOM.qs('#pexels-close')?.addEventListener('click', closeSearchModal);
    DOM.qs('#pexels-search-btn')?.addEventListener('click', searchPexels);
    DOM.qs('#pexels-input')?.addEventListener('keydown', e => { if(e.key==='Enter') searchPexels(); });

    // AI generate button
    DOM.qs('#generate-img-btn')?.addEventListener('click', generateAIImage);

    // Preview close
    DOM.qs('#img-preview-close')?.addEventListener('click', () => UI.closeModal('img-preview-modal'));
  }

  return { init, openSearchModal, generateAIImage, previewImage };
})();
