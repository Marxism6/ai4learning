/**
 * nat-history.js — Session persistence, history archive + viewer (extends window.NAT).
 * Must load after nat.js, nat-i18n.js.
 *
 * Server-first: reads/writes session data via REST API, falls back to localStorage.
 */
(function (N) {
  'use strict';

  // ====== Shared session payload builder ======
  N._buildSessionPayload = function () {
    N.state.sessionId = N.state.sessionId || String(Date.now());
    var block = N.state.blockSlug && N.state.blocks ? N.state.blocks[N.state.blockSlug] : null;
    var preview = '';
    for (var i = 0; i < N.state.history.length; i++) {
      if (N.state.history[i].role === 'assistant') {
        preview = (N.state.history[i].content || '').slice(0, 60);
        break;
      }
    }
    return {
      session_id: N.state.sessionId,
      block_slug: N.state.blockSlug || '',
      block_title: block ? N.localName(block) : N.t('chatTab'),
      message_count: N.state.history.length,
      preview: preview,
      history: N.state.history,
    };
  };

  // ====== Session (current working session) ======
  N.saveSession = function () {
    if (!N.state.username) return;
    N.lsSetJSON('session-' + N.state.username, { history: N.state.history, blockSlug: N.state.blockSlug });
    // POST to server (only if there is content to save)
    if (!N.state.history.length) return;
    var enc = encodeURIComponent(N.state.username);
    fetch('/api/sessions/' + enc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(N._buildSessionPayload()),
    }).catch(function () { /* ignore server save failures */ });
  };

  N.restoreSession = function () {
    if (!N.state.username) return false;
    var s = N.lsGetJSON('session-' + N.state.username, null);
    if (!s || !s.history || !s.history.length) return false;
    N.state.history = s.history; N.state.blockSlug = s.blockSlug || null;
    // 历史消息不再渲染到对话区，仅保留 state.history 供 LLM 上下文
    N.updateBlockSelectorLabel(); return true;
  };

  // ====== Archive + History ======
  N.archiveCurrentSession = function () {
    if (!N.state.history.length || !N.state.username) return;
    var key = 'history-' + N.state.username; var list = N.lsGetJSON(key, []);
    var payload = N._buildSessionPayload();
    var block = N.state.blockSlug && N.state.blocks ? N.state.blocks[N.state.blockSlug] : null;
    var entry = {
      id: String(Date.now()), timestamp: new Date().toISOString(),
      blockSlug: N.state.blockSlug,
      blockTitle: block ? N.localName(block) : N.t('chatTab'),
      messageCount: N.state.history.length, preview: payload.preview, history: N.state.history,
    };
    // Save to localStorage (backup)
    list.unshift(entry);
    if (list.length > 50) list = list.slice(0, 50); N.lsSetJSON(key, list);
    // Save to server
    var enc = encodeURIComponent(N.state.username);
    fetch('/api/sessions/' + enc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(function () { /* ignore server save failures */ });
  };

  function renderHistoryListFromEntries(list) {
    if (!list.length) {
      N.els.historyList.innerHTML = '<p class="body-sm" style="color:var(--ink-faint);padding:12px;">' + N.t('emptyHistory') + '</p>';
      return;
    }
    N.els.historyList.innerHTML = '';
    var sorted = list.slice().reverse();
    sorted.forEach(function (entry) {
      var card = document.createElement('div'); card.className = 'history-entry';
      var date = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '';
      var preview = N.templateFn('historyPreview')(entry.messageCount, (entry.preview || '').slice(0, 60));
      card.innerHTML = '<div class="history-entry-header"><span class="history-entry-block">' + N.escapeHtml(entry.blockTitle || '') + '</span><span class="history-entry-date">' + N.escapeHtml(date) + '</span></div>' +
        '<div class="history-entry-preview">' + N.escapeHtml(preview) + '</div>';
      card.addEventListener('click', function () { N.viewHistory(entry); });
      N.els.historyList.appendChild(card);
    });
  }

  N.renderHistoryList = function (query) {
    if (!N.state.username) { N.els.historyList.innerHTML = '<p class="body-sm" style="color:var(--ink-faint);padding:12px;">' + N.t('emptyHistory') + '</p>'; return; }
    var enc = encodeURIComponent(N.state.username);
    // If query provided, use search endpoint
    var url = query ? '/api/sessions/' + enc + '/search?q=' + encodeURIComponent(query)
      : '/api/sessions/' + enc;
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('server fetch failed');
        return r.json();
      })
      .then(function (data) {
        renderHistoryListFromEntries(data.sessions || []);
      })
      .catch(function () {
        if (query) { renderHistoryListFromEntries([]); return; } // Don't fallback for search
        var key = 'history-' + N.state.username;
        var list = N.lsGetJSON(key, []);
        renderHistoryListFromEntries(list);
      });
  };

  N.searchHistory = function () {
    var q = (N.els.historySearchInput.value || '').trim();
    N.renderHistoryList(q || undefined); // undefined → list all, '' → show empty
  };

  N.viewHistory = function (entry) {
    var enc = encodeURIComponent(N.state.username);
    // Server-first: fetch full session data from server
    fetch('/api/sessions/' + enc + '/' + entry.id)
      .then(function (r) {
        if (!r.ok) throw new Error('server fetch failed');
        return r.json();
      })
      .then(function (s) {
        // Remove from server after restoration
        fetch('/api/sessions/' + enc + '/' + entry.id, { method: 'DELETE' }).catch(function () {});
        applyRestoredHistory(s.history || [], s.blockSlug);
      })
      .catch(function () {
        // Fallback to localStorage entry data
        applyRestoredHistory(entry.history || [], entry.blockSlug);
        // Also remove from localStorage
        var key = 'history-' + N.state.username;
        var list = N.lsGetJSON(key, []).filter(function (e) { return e.id !== entry.id; });
        N.lsSetJSON(key, list);
      });

    function applyRestoredHistory(history, blockSlug) {
      N.closeHistory();
      N.state.history = history.slice();
      N.state.blockSlug = blockSlug || null;
      N.state.viewingHistory = false;
      N.els.conversation.querySelectorAll('.message').forEach(function (el) { if (el.dataset.message !== 'welcome') el.remove(); });
      var w = N.els.conversation.querySelector('[data-message="welcome"]'); if (w) w.style.display = 'none';
      N.state.history.forEach(function (m) {
        if (m.role === 'user') N.addUserMessage(m.content, true);
        else if (m.role === 'assistant') N.addAgentMessage(N.markdownToHtml(m.content), true);
      });
      N.els.inputField.disabled = false; N.els.sendButton.disabled = false; N.els.uploadButton.disabled = false;
      N.els.historyViewBar.style.display = 'none';
      N.updateBlockSelectorLabel(); N.saveSession(); N.scrollToBottom(); N.els.inputField.focus();
    }
  };

  N.newConversation = function () {
    N.archiveCurrentSession();
    N.state.history = []; N.state.blockSlug = null; N.state.memoryInjected = false; N.state.viewingHistory = false; N.state.sessionId = '';
    N.els.inputField.disabled = false; N.els.sendButton.disabled = false; N.els.uploadButton.disabled = false;
    N.els.historyViewBar.style.display = 'none';
    N.saveSession(); N.lsRemove('session-' + N.state.username);
    N.els.conversation.querySelectorAll('.message').forEach(function (el) { if (el.dataset.message !== 'welcome') el.remove(); });
    var w = N.els.conversation.querySelector('[data-message="welcome"]'); if (w) w.style.display = '';
    N.updateBlockSelectorLabel(); N.els.inputField.focus();
  };

  // ====== History overlay ======
  N.openHistory = function () { if (!N.state.username) return; N.closeSettings(); N.els.historyOverlay.style.display = 'flex'; N.renderHistoryList(); };
  N.closeHistory = function () { N.els.historyOverlay.style.display = 'none'; };

  // ====== Event bindings ======
  N.bindHistoryEvents = function () {
    N.els.historyButton.addEventListener('click', N.openHistory);
    N.els.historyClose.addEventListener('click', N.closeHistory);
    N.els.historyOverlay.addEventListener('click', function (e) { if (e.target === N.els.historyOverlay) N.closeHistory(); });
    N.els.historySearchInput.addEventListener('input', function () {
      var q = N.els.historySearchInput.value.trim();
      N.renderHistoryList(q || undefined);
    });
    N.els.clearHistoryBtn.addEventListener('click', function () {
      if (!confirm(N.t('confirmClear'))) return;
      // Delete server data
      var enc = encodeURIComponent(N.state.username);
      fetch('/api/sessions/' + enc, { method: 'DELETE' }).catch(function () { /* ignore */ });
      N.lsRemove('history-' + N.state.username);
      N.renderHistoryList();
    });
  };

})(window.NAT);