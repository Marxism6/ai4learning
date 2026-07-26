/**
 * nat-chat.js — Message rendering, API calls, charts (extends window.NAT).
 * Must load after nat.js, nat-i18n.js, nat-math.js.
 */
(function (N) {
  'use strict';

  // ====== Message rendering ======
  N.addUserMessage = function (t, noAnimation) { var m = document.createElement('div'); m.className = 'message user-message'; if (noAnimation) m.style.animation = 'none'; var c = document.createElement('div'); c.className = 'message-content'; c.innerHTML = '<p>' + N.escapeHtml(t) + '</p>'; m.appendChild(c); N.els.conversation.appendChild(m); return m; };
  N.addAgentMessage = function (html, noAnimation) { var m = document.createElement('div'); m.className = 'message agent-message'; if (noAnimation) m.style.animation = 'none'; var c = document.createElement('div'); c.className = 'message-content'; c.innerHTML = html; m.appendChild(c); N.els.conversation.appendChild(m); N.renderMathEl(c); };
  N.setTypingIndicator = function (v) { var ind = document.getElementById('typingIndicator'); if (v) { if (!ind) { ind = document.createElement('div'); ind.id = 'typingIndicator'; ind.className = 'message agent-message'; ind.style.animation = 'none'; ind.innerHTML = '<div class="message-content"><div class="typing-indicator"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div></div>'; N.els.conversation.appendChild(ind); } } else { if (ind) ind.remove(); } N.scrollToBottom(); };
  N.addErrorMessage = function (t) { var m = document.createElement('div'); m.className = 'message agent-message'; var c = document.createElement('div'); c.className = 'message-content'; c.innerHTML = '<p class="error-message">' + N.escapeHtml(t) + '</p>'; m.appendChild(c); N.els.conversation.appendChild(m); N.scrollToBottom(); };
  N.addBlockContextMessage = function (block) { var m = document.createElement('div'); m.className = 'message agent-message'; m.dataset.message = 'context'; var c = document.createElement('div'); c.className = 'message-content'; var lbl = N.localName(block).toUpperCase(); var desc = (N.state.lang === 'zh' && block.description_zh) ? block.description_zh : block.description; c.innerHTML = '<div class="knowledge-tag" style="margin-bottom:8px;">' + N.escapeHtml(lbl) + '</div><p><strong>' + N.escapeHtml(lbl) + '</strong> — ' + N.escapeHtml(desc) + '</p><p style="font-size:15px;color:var(--ink-mute);margin-top:8px;">' + N.escapeHtml(N.t('welcomeTitle')) + '</p>'; m.appendChild(c); N.els.conversation.appendChild(m); N.scrollToBottom(); };
  N.removeContextMessages = function () { N.els.conversation.querySelectorAll('[data-message="context"]').forEach(function (el) { el.remove(); }); };
  N.rollbackUserMessage = function (el) { N.state.history.pop(); if (el) el.remove(); };

  // ====== Charts ======
  N.initCharts = function () {
    N.els.conversation.querySelectorAll('.chart-card').forEach(function (card) { if (card.dataset.chartInitialized) return; card.dataset.chartInitialized = '1'; var js = card.dataset.chart; if (!js) return; try { var cfg = JSON.parse(js), cv = card.querySelector('canvas'); if (!cv) return; var ac = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1a5c5c', im = getComputedStyle(document.documentElement).getPropertyValue('--ink-mute').trim() || '#6b6560'; if (cfg.data && cfg.data.datasets) cfg.data.datasets.forEach(function (ds) { if (!ds.borderColor) ds.borderColor = ac; if (!ds.backgroundColor) ds.backgroundColor = ac + '33'; if (!ds.pointBackgroundColor) ds.pointBackgroundColor = ac; if (!ds.pointBorderColor) ds.pointBorderColor = '#fff'; if (ds.tension == null) ds.tension = 0.3; }); if (!cfg.options) cfg.options = {}; cfg.options.responsive = true; cfg.options.maintainAspectRatio = true; if (!cfg.options.scales) cfg.options.scales = { x: { grid: { color: im + '22' }, ticks: { color: im } }, y: { grid: { color: im + '22' }, ticks: { color: im } } }; new Chart(cv, cfg); } catch (e) { card.innerHTML = '<p class="error-message" style="padding:12px;">' + N.escapeHtml(N.t('chartRenderError')) + '</p>'; } });
  };

  // ====== API ======
  N.sendMessage = async function (message) {
    if (N.state.isLoading) return; N.state.isLoading = true; N.els.inputField.disabled = true; N.els.sendButton.disabled = true;
    var userEl = N.addUserMessage(message); N.state.history.push({ role: 'user', content: message }); N.scrollToBottom(); N.setTypingIndicator(true);
    var mem = N.maybeBuildMemory();
    try {
      var body = { username: N.state.username, message: message, block_slug: N.state.blockSlug, history: N.state.history.slice(0, -1), memory_enabled: N.state.memoryEnabled, lang: N.state.lang }; if (mem) body.memory_summary = mem;
      var r = await fetch('/api/chat', { method: 'POST', headers: N.buildApiHeaders({}), body: JSON.stringify(body) });
      if (!r.ok) { var ed = await r.json().catch(function () { return {}; }); if (r.status === 502 && ed.detail && N.isApiKeyError(ed.detail)) { N.setTypingIndicator(false); N.rollbackUserMessage(userEl); N.addErrorMessage(N.t('noKeyError')); N.openSettings(); if (N.els.apiKeyInput) N.els.apiKeyInput.focus(); return; } throw new Error(N.t('serverError') + ': ' + (ed.detail || r.status)); }
      var data = await r.json(), reply = data.reply; N.els.inputField.value = ''; N.setTypingIndicator(false);
      var html = N.markdownToHtml(reply); N.addAgentMessage(html); N.state.history.push({ role: 'assistant', content: reply }); N.saveSession(); N.triggerMemoryReview(reply); N.initCharts();
      if (N.state.blockSlug) { if (N.state.history.filter(function (m) { return m.role === 'user'; }).length === 1) N.writeProgress(N.state.blockSlug, 'in-progress'); if (N.MASTERED_MARKER_RE.test(reply)) N.writeProgress(N.state.blockSlug, 'mastered', 3); }
    } catch (err) { N.setTypingIndicator(false); N.rollbackUserMessage(userEl); N.addErrorMessage(N.t('errorPrefix') + err.message); if (N.isApiKeyError(err.message)) N.openSettings(); }
    finally { N.state.isLoading = false; N.els.inputField.disabled = false; N.els.sendButton.disabled = false; N.els.inputField.focus(); N.scrollToBottom(); }
  };

  // ====== Event bindings ======
  N.bindChatEvents = function () {
    N.els.conversation.addEventListener('click', function (e) {
      var btn = e.target.closest('.choice-option');
      if (!btn || N.state.isLoading) return;
      var label = btn.dataset.choice;
      var card = btn.closest('.choice-card');
      card.querySelectorAll('.choice-option').forEach(function (o) { o.disabled = true; if (o === btn) o.classList.add('selected'); });
      N.sendMessage(N.t('choiceIChoose') + ' ' + label);
    });
  };

})(window.NAT);