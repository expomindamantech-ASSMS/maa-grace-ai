'use strict';

window.Composer = (() => {
  let attachedImages = []; // array of base64 data URLs

  function init() {
    const input   = DOM.qs('#msg-input');
    const sendBtn = DOM.qs('#send-btn');
    const fileBtn = DOM.qs('#attach-btn');
    const fileIn  = DOM.qs('#file-input');

    // Send on button click
    sendBtn.addEventListener('click', handleSend);

    // Send on Enter (Shift+Enter = newline)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    // File pick
    fileBtn.addEventListener('click', () => fileIn.click());
    fileIn.addEventListener('change', handleFileChange);
  }

  async function handleFileChange(e) {
    const files = [...e.target.files];
    e.target.value = '';
    const remaining = CONSTANTS.MAX_IMAGES - attachedImages.length;
    if (remaining <= 0) { UI.toast(`Max ${CONSTANTS.MAX_IMAGES} images`, 'warn'); return; }

    for (const f of files.slice(0, remaining)) {
      if (!f.type.startsWith('image/')) { UI.toast('Only images allowed', 'warn'); continue; }
      const b64 = await Helpers.fileToBase64(f);
      if (Helpers.fileSizeMB(b64) > CONSTANTS.MAX_IMG_MB) {
        UI.toast(`Image too large (max ${CONSTANTS.MAX_IMG_MB}MB)`, 'warn'); continue;
      }
      attachedImages.push(b64);
    }
    renderPreviews();
  }

  function addImageFromSearch(url) {
    // We store the URL itself; on send we convert to base64 if needed
    attachedImages.push(url);
    renderPreviews();
  }

  function renderPreviews() {
    const box = DOM.qs('#image-previews');
    box.innerHTML = '';
    attachedImages.forEach((src, i) => {
      const wrap = DOM.el('div','relative inline-block');
      const img  = DOM.el('img','h-16 w-16 object-cover rounded-xl border border-green-700');
      img.src    = src;
      const rm   = DOM.el('button','absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center leading-none','×');
      rm.onclick = () => { attachedImages.splice(i,1); renderPreviews(); };
      wrap.appendChild(img);
      wrap.appendChild(rm);
      box.appendChild(wrap);
    });
    DOM.toggle(DOM.qs('#previews-row'), !attachedImages.length);
  }

  async function handleSend() {
    const input  = DOM.qs('#msg-input');
    const prompt = input.value.trim();
    if (!prompt && !attachedImages.length) return;

    const imgs = [...attachedImages];
    attachedImages = [];
    renderPreviews();
    input.value = '';
    input.style.height = 'auto';

    await Chat.sendMessage(prompt, imgs);
  }

  function getAttachedImages() { return attachedImages; }

  function clearImages() { attachedImages = []; renderPreviews(); }

  return { init, addImageFromSearch, getAttachedImages, clearImages };
})();
