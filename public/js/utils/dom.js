'use strict';

window.DOM = {
  qs:  (sel, ctx) => (ctx || document).querySelector(sel),
  qsa: (sel, ctx) => [...(ctx || document).querySelectorAll(sel)],

  el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  },

  show(el) { if (el) el.classList.remove('hidden'); },
  hide(el) { if (el) el.classList.add('hidden'); },
  toggle(el, force) { if (el) el.classList.toggle('hidden', force); },

  setText(sel, text) {
    const e = this.qs(sel);
    if (e) e.textContent = text;
  },

  on(target, event, sel, fn) {
    if (typeof sel === 'function') { target.addEventListener(event, sel); return; }
    target.addEventListener(event, (e) => {
      const match = e.target.closest(sel);
      if (match) fn.call(match, e);
    });
  },

  scrollBottom(el) {
    if (el) el.scrollTop = el.scrollHeight;
  },
};
