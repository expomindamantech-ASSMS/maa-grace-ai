'use strict';

window.Chat = (() => {
  let currentThreadId = null;
  let generating = false;

  /* ── Sidebar thread list ──────────────────────────────── */
  async function loadThreads() {
    const list = DOM.qs('#thread-list');
    list.innerHTML = '<p class="text-gray-500 text-xs px-3 py-2">Loading…</p>';
    try {
      const threads = await API.listThreads();
      list.innerHTML = '';
      if (!threads.length) {
        list.innerHTML = '<p class="text-gray-500 text-xs px-3 py-2">No chats yet</p>';
        return;
      }
      threads.forEach(t => list.appendChild(buildThreadItem(t)));
    } catch(e) {
      list.innerHTML = `<p class="text-red-400 text-xs px-3">${e.message}</p>`;
    }
  }

  function buildThreadItem(t) {
    const isActive = t.id === currentThreadId;
    const wrap = DOM.el('div', `thread-item group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${isActive?'bg-green-900/40 text-white':'text-gray-300 hover:bg-gray-800'}`);
    wrap.dataset.id = t.id;

    const title = DOM.el('span', 'flex-1 truncate text-sm', Helpers.escapeHtml(t.title || 'New Chat'));
    const renameBtn = DOM.el('button','opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-400 text-xs p-1','✏️');
    const deleteBtn = DOM.el('button','opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 text-xs p-1','🗑');

    wrap.appendChild(title);
    wrap.appendChild(renameBtn);
    wrap.appendChild(deleteBtn);

    wrap.addEventListener('click', (e) => {
      if (e.target === renameBtn || e.target === deleteBtn) return;
      openThread(t.id, t.title);
    });

    renameBtn.onclick = (e) => { e.stopPropagation(); startRename(wrap, title, t.id); };
    deleteBtn.onclick = (e) => { e.stopPropagation(); UI.confirmDelete(deleteBtn, () => removeThread(t.id)); };

    return wrap;
  }

  function startRename(wrap, titleEl, threadId) {
    const input = DOM.el('input', 'flex-1 bg-transparent border-b border-yellow-400 text-sm text-white outline-none');
    input.value = titleEl.textContent;
    wrap.replaceChild(input, titleEl);
    input.focus();

    const save = async () => {
      const val = input.value.trim();
      if (val && val !== titleEl.textContent) {
        try { await API.renameThread(threadId, val); titleEl.textContent = val; }
        catch(e) { UI.toast(e.message, 'error'); }
      }
      wrap.replaceChild(titleEl, input);
    };

    input.addEventListener('blur',    save);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  save();
      if (e.key === 'Escape') wrap.replaceChild(titleEl, input);
    });
  }

  async function removeThread(threadId) {
    try {
      await API.deleteThread(threadId);
      if (currentThreadId === threadId) {
        currentThreadId = null;
        DOM.qs('#messages').innerHTML = '';
        DOM.qs('#chat-title').textContent = 'Maa Grace AI';
      }
      loadThreads();
      UI.toast('Chat deleted', 'success');
    } catch(e) { UI.toast(e.message, 'error'); }
  }

  /* ── Open / load thread ───────────────────────────────── */
  async function openThread(threadId, title) {
    currentThreadId = threadId;
    DOM.qs('#chat-title').textContent = title || 'Chat';
    DOM.qs('#messages').innerHTML = '<div class="text-gray-500 text-sm text-center py-8">Loading messages…</div>';

    // mark active
    DOM.qsa('.thread-item').forEach(el => {
      el.classList.toggle('bg-green-900/40', el.dataset.id === threadId);
      el.classList.toggle('text-white', el.dataset.id === threadId);
    });

    try {
      const msgs = await API.getMessages(threadId);
      renderMessages(msgs);
    } catch(e) {
      DOM.qs('#messages').innerHTML = `<p class="text-red-400 text-center">${e.message}</p>`;
    }
  }

  function renderMessages(msgs) {
    const box = DOM.qs('#messages');
    box.innerHTML = '';
    if (!msgs.length) {
      box.innerHTML = '<div class="text-gray-500 text-sm text-center py-16">Start a conversation ✨</div>';
      return;
    }
    msgs.forEach(m => box.appendChild(buildMessageEl(m)));
    DOM.scrollBottom(box);
  }

  function buildMessageEl(m) {
    const isUser = m.role === 'user';
    const wrap   = DOM.el('div', `flex ${isUser?'justify-end':'justify-start'} mb-4`);

    if (m.role === 'image') {
      wrap.className = 'flex justify-start mb-4';
      wrap.innerHTML = `
        <div class="max-w-xs">
          <img src="${m.imageUrl}" alt="AI image" class="rounded-2xl shadow-lg max-w-full cursor-pointer"
               onclick="window.open('${m.imageUrl}','_blank')">
          <p class="text-xs text-gray-500 mt-1">${Helpers.escapeHtml(m.content||'')}</p>
        </div>`;
      return wrap;
    }

    const bubble = DOM.el('div',
      `max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? 'bg-green-600 text-white rounded-br-sm'
          : 'bg-gray-800 text-gray-100 rounded-bl-sm'
      }`
    );
    bubble.innerHTML = Helpers.markdownToHtml(m.content);

    const time = DOM.el('p', 'text-xs text-gray-500 mt-1 px-1', Helpers.formatTime(m.createdAt));

    const col = DOM.el('div', `flex flex-col ${isUser?'items-end':'items-start'}`);
    col.appendChild(bubble);
    col.appendChild(time);
    wrap.appendChild(col);
    return wrap;
  }

  /* ── Send message ─────────────────────────────────────── */
  async function sendMessage(prompt, images) {
    if (generating || !prompt.trim()) return;
    if (!currentThreadId) {
      UI.toast('Select or create a chat first', 'warn');
      return;
    }

    generating = true;
    setSendDisabled(true);

    // render user bubble immediately
    appendBubble({ role:'user', content: prompt, createdAt: new Date() });
    if (images && images.length) {
      images.forEach(src => appendImagePreview(src));
    }

    // placeholder AI bubble with streaming cursor
    const aiBubble = appendStreamingBubble();

    try {
      const history = collectHistory();
      const res = await API.submitPrompt({
        prompt, images: images || [], threadId: currentThreadId, history,
      });
      await streamText(aiBubble, res.reply);
      await UI.refreshUsage();
      loadThreads(); // refresh titles
    } catch(e) {
      aiBubble.innerHTML = `<span class="text-red-400">${e.message}</span>`;
      UI.toast(e.message, 'error');
    } finally {
      generating = false;
      setSendDisabled(false);
    }
  }

  function appendBubble(m) {
    const box = DOM.qs('#messages');
    const el  = buildMessageEl(m);
    box.appendChild(el);
    DOM.scrollBottom(box);
    return el;
  }

  function appendImagePreview(src) {
    const box  = DOM.qs('#messages');
    const wrap = DOM.el('div','flex justify-end mb-2');
    wrap.innerHTML = `<img src="${src}" class="max-h-32 rounded-xl border border-green-700">`;
    box.appendChild(wrap);
    DOM.scrollBottom(box);
  }

  function appendStreamingBubble() {
    const box  = DOM.qs('#messages');
    const wrap = DOM.el('div','flex justify-start mb-4');
    const col  = DOM.el('div','flex flex-col items-start');
    const bub  = DOM.el('div','max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed bg-gray-800 text-gray-100');
    bub.innerHTML = '<span class="streaming-cursor">▌</span>';
    col.appendChild(bub);
    wrap.appendChild(col);
    box.appendChild(wrap);
    DOM.scrollBottom(box);
    return bub;
  }

  async function streamText(bubble, text) {
    bubble.textContent = '';
    const cursor = DOM.el('span','streaming-cursor','▌');
    bubble.appendChild(cursor);

    for (const char of text) {
      const tn = document.createTextNode(char);
      bubble.insertBefore(tn, cursor);
      DOM.scrollBottom(DOM.qs('#messages'));
      await delay(CONSTANTS.STREAM_DELAY_MS);
    }
    cursor.remove();
    // re-render as markdown
    bubble.innerHTML = Helpers.markdownToHtml(text);
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  function collectHistory() {
    const bubbles = DOM.qsa('#messages .flex.mb-4');
    return bubbles.slice(-10).map(wrap => {
      const isUser = wrap.classList.contains('justify-end');
      const bub    = wrap.querySelector('div > div');
      return { role: isUser ? 'user' : 'assistant', content: bub ? bub.textContent : '' };
    }).filter(m => m.content);
  }

  function setSendDisabled(v) {
    const btn = DOM.qs('#send-btn');
    if (btn) btn.disabled = v;
  }

  /* ── New thread ───────────────────────────────────────── */
  async function newThread() {
    try {
      const res = await API.createThread('New Chat');
      await loadThreads();
      await openThread(res.threadId, res.title);
    } catch(e) { UI.toast(e.message,'error'); }
  }

  /* ── Exports ──────────────────────────────────────────── */
  async function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const msgs = await API.getMessages(currentThreadId);
    doc.setFontSize(14);
    doc.text(DOM.qs('#chat-title').textContent, 14, 18);
    doc.setFontSize(10);
    let y = 28;
    for (const m of msgs) {
      const lines = doc.splitTextToSize(`[${m.role}] ${m.content || m.imageUrl}`, 180);
      if (y + lines.length * 6 > 280) { doc.addPage(); y = 14; }
      doc.text(lines, 14, y);
      y += lines.length * 6 + 3;
    }
    doc.save(`chat-${currentThreadId}.pdf`);
  }

  async function exportDOCX() {
    const { Document, Packer, Paragraph, TextRun } = window.docx;
    const msgs = await API.getMessages(currentThreadId);
    const children = msgs.map(m => new Paragraph({
      children: [new TextRun({ text: `[${m.role}] ${m.content || m.imageUrl}`, break: 1 })],
    }));
    const doc = new Document({ sections:[{ children }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chat-${currentThreadId}.docx`;
    a.click();
  }

  async function exportXLS() {
    const msgs = await API.getMessages(currentThreadId);
    const data  = [['Role','Content','Time']];
    msgs.forEach(m => data.push([m.role, m.content || m.imageUrl || '', Helpers.formatDate(m.createdAt)]));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Chat');
    XLSX.writeFile(wb, `chat-${currentThreadId}.xlsx`);
  }

  return {
    loadThreads, openThread, newThread, sendMessage,
    getCurrentThreadId: () => currentThreadId,
    exportPDF, exportDOCX, exportXLS,
  };
})();
