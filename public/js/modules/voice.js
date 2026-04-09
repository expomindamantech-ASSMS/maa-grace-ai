'use strict';

window.Voice = (() => {
  let mediaRecorder = null;
  let chunks        = [];
  let recording     = false;

  function init() {
    const btn = DOM.qs('#voice-btn');
    if (!btn) return;
    btn.addEventListener('click', toggle);
  }

  async function toggle() {
    recording ? stop() : start();
  }

  async function start() {
    if (!navigator.mediaDevices) { UI.toast('Microphone not supported', 'error'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = processAudio;
      mediaRecorder.start();
      recording = true;
      DOM.qs('#voice-btn').classList.add('text-red-500','animate-pulse');
      DOM.qs('#voice-btn').title = 'Stop recording';
      UI.toast('Recording… tap again to stop', 'info');
    } catch(e) { UI.toast('Mic access denied', 'error'); }
  }

  function stop() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    recording = false;
    DOM.qs('#voice-btn').classList.remove('text-red-500','animate-pulse');
    DOM.qs('#voice-btn').title = 'Record voice';
  }

  async function processAudio() {
    const blob    = new Blob(chunks, { type: 'audio/webm' });
    const b64full = await Helpers.blobToBase64(blob);
    const [, b64] = b64full.split(',');
    UI.showLoading('Transcribing…');
    try {
      const res = await API.transcribeVoice({ audioBase64: b64, mimeType: 'audio/webm' });
      const input = DOM.qs('#msg-input');
      input.value = (input.value + ' ' + res.transcript).trim();
      input.focus();
      UI.toast('Transcribed ✅', 'success');
    } catch(e) {
      UI.toast(e.message, 'error');
    } finally {
      UI.hideLoading();
    }
  }

  return { init };
})();
