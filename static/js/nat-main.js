/**
 * nat-main.js — Init, events, username, file upload (extends window.NAT).
 * Load last — depends on all other nat-*.js modules.
 */
(function (N) {
  'use strict';

  // ====== Send handler ======
  N.handleSend = function () { var m = N.els.inputField.value.trim(); if (!m || N.state.isLoading) return; N.sendMessage(m); };

  // ====== File upload ======
  N.bindUploadEvents = function () {
    N.els.uploadButton.addEventListener('click', function () { if (!N.state.isLoading) N.els.fileInput.click(); });
    N.els.fileInput.addEventListener('change', async function () {
      var file = N.els.fileInput.files[0]; if (!file) return; N.els.fileInput.value = '';
      if (file.size > 10 * 1024 * 1024) { N.addErrorMessage(N.t('errorPrefix') + N.t('fileTooLarge')); return; }
      if (['image/png', 'image/jpeg', 'image/webp'].indexOf(file.type) === -1) { N.addErrorMessage(N.t('errorPrefix') + N.t('unsupportedFormat')); return; }
      if (N.state.isLoading) return; N.state.isLoading = true; N.els.inputField.disabled = true; N.els.sendButton.disabled = true; N.els.uploadButton.disabled = true;
      var ind = document.createElement('div'); ind.id = 'uploadIndicator'; ind.className = 'message agent-message'; ind.style.animation = 'none';
      ind.innerHTML = '<div class="message-content"><p class="body-sm" style="color:var(--ink-mute);">' + N.escapeHtml(N.t('analyzingImg')) + '</p></div>'; N.els.conversation.appendChild(ind); N.scrollToBottom();
      try {
        var fd = new FormData(); fd.append('file', file); fd.append('username', N.state.username); fd.append('lang', N.state.lang); if (N.state.blockSlug) fd.append('block_slug', N.state.blockSlug);
        var xh = {}; var ak = N.lsGet('api-key', ''), mo = N.lsGet('model', ''), ab = N.lsGet('api-base', ''); if (ak) xh['X-API-Key'] = ak; if (mo) xh['X-Model'] = mo; if (ab) xh['X-API-Base'] = ab;
        var r = await fetch('/api/upload', { method: 'POST', headers: xh, body: fd }); ind.remove();
        if (!r.ok) { var ed = await r.json().catch(function () { return {}; }); throw new Error(N.t('uploadFailed') + ': ' + (ed.detail || r.status)); }
        var data = await r.json(), rec = data.recognized_text;
        var pm = document.createElement('div'); pm.className = 'message agent-message'; pm.style.animation = 'none'; var pc = document.createElement('div'); pc.className = 'message-content';
        pc.innerHTML = '<div class="knowledge-tag" style="margin-bottom:8px;">' + N.escapeHtml(N.t('recognizedProblem')) + '</div>';
        var bd = document.createElement('div'); bd.className = 'problem-body'; bd.innerHTML = N.markdownToHtml(rec); pc.appendChild(bd); pm.appendChild(pc); N.els.conversation.appendChild(pm);
        if (window.renderMathInElement) try { window.renderMathInElement(pc, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) {}
        N.state.history.push({ role: 'assistant', content: rec }); N.saveSession();
      } catch (err) { var ui = document.getElementById('uploadIndicator'); if (ui) ui.remove(); N.addErrorMessage(N.t('errorPrefix') + err.message); }
      finally { N.state.isLoading = false; N.els.inputField.disabled = false; N.els.sendButton.disabled = false; N.els.uploadButton.disabled = false; N.els.inputField.focus(); N.scrollToBottom(); }
    });
  };

  // ====== Username login ======
  N.hideOverlay = function () { N.els.overlay.classList.add('hidden'); setTimeout(function () { N.els.inputField.focus(); }, 250); };
  N.onUserLogin = function (name) {
    N.state.username = name; N.els.navUser.textContent = name; N.lsSet('username', name); N.hideOverlay();
    N.loadBlocks(); N.loadProgress(); N.restoreSession(); N.els.newConvButton.style.display = '';
  };

  // ====== Bind all events ======
  N.bindAllEvents = function () {
    N.els.inputField.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); N.handleSend(); } });
    N.els.sendButton.addEventListener('click', N.handleSend);
    N.els.newConvButton.addEventListener('click', N.newConversation);
    N.els.usernameForm.addEventListener('submit', function (e) {
      e.preventDefault(); N.els.usernameError.style.display = 'none'; var n = N.els.usernameInput.value.trim();
      if (!n) { N.els.usernameError.textContent = N.t('emptyUsername'); N.els.usernameError.style.display = ''; return; }
      if (!N.USERNAME_RE.test(n)) { N.els.usernameError.textContent = N.t('invalidUsername'); N.els.usernameError.style.display = ''; return; }
      N.onUserLogin(n);
    });

    // Module events
    N.bindSettingsEvents();
    N.bindModelDetection();
    N.bindHistoryEvents();
    N.bindBlocksEvents();
    N.bindMathEvents();
    N.bindChatEvents();
    N.bindUploadEvents();
  };

  // ====== Init ======
  N.init = function () {
    var savedTheme = N.lsGet('theme', 'eye-protection');
    if (savedTheme === 'eye-protection' || savedTheme === 'standard') { N.state.theme = savedTheme; document.documentElement.setAttribute('data-theme', savedTheme); }
    N.state.lang = N.lsGet('lang', 'zh'); N.applyLanguage();
    N.state.memoryEnabled = N.lsGet('memory', '0') === '1';
    N.bindAllEvents();
    var savedUsername = N.lsGet('username', null);
    if (savedUsername) N.onUserLogin(savedUsername); else N.els.usernameInput.focus();
    // Formula overflow observer
    function updateFormulaOverflow() { N.els.conversation.querySelectorAll('.formula-card').forEach(function (c) { c.classList.toggle('is-overflowing', c.scrollWidth > c.clientWidth); }); }
    new MutationObserver(updateFormulaOverflow).observe(N.els.conversation, { childList: true, subtree: true });
    window.addEventListener('resize', updateFormulaOverflow);
  };

})(window.NAT);

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', function () { window.NAT.init(); });