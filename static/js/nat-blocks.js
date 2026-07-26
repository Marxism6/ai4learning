/**
 * nat-blocks.js — Block selector, progress chips, memory (extends window.NAT).
 * Must load after nat.js, nat-i18n.js, nat-history.js.
 */
(function (N) {
  'use strict';

  // ====== Memory ======
  N.buildMemorySummary = function () {
    if (!N.state.progress || !N.state.progress.blocks) return '';
    var m = [];
    for (var s in N.state.progress.blocks) { var b = N.state.progress.blocks[s]; if (b.status === 'mastered' && b.mastery_level > 0) m.push(s + ' (' + b.mastery_level + ')'); }
    return m.length ? m.join(', ') : '';
  };

  // ====== Block Selector Dropdown ======
  N.renderBlockMenu = function () {
    if (!N.state.blocks) { N.els.blockSelectorMenu.innerHTML = ''; return; }
    N.els.blockSelectorMenu.innerHTML = '';
    var chatItem = document.createElement('button');
    chatItem.className = 'block-menu-item' + (N.state.blockSlug ? '' : ' active');
    chatItem.textContent = N.t('chatTab');
    chatItem.addEventListener('click', function () { N.selectBlock(null); N.closeBlockMenu(); });
    N.els.blockSelectorMenu.appendChild(chatItem);
    N.sortedBlocks().forEach(function (block) {
      var item = document.createElement('button');
      item.className = 'block-menu-item' + (N.state.blockSlug === block.slug ? ' active' : '');
      item.textContent = N.localName(block);
      item.addEventListener('click', function () { N.selectBlock(block.slug); N.closeBlockMenu(); });
      N.els.blockSelectorMenu.appendChild(item);
    });
  };

  N.closeBlockMenu = function () { N.els.blockSelectorMenu.style.display = 'none'; };
  N.updateBlockSelectorLabel = function () {
    if (!N.state.blockSlug || !N.state.blocks || !N.state.blocks[N.state.blockSlug]) { N.els.blockSelectorLabel.textContent = N.t('chatTab'); return; }
    N.els.blockSelectorLabel.textContent = N.localName(N.state.blocks[N.state.blockSlug]);
  };

  N.toggleBlockMenu = function () { N.closeMathPalette(); N.els.blockSelectorMenu.style.display = (N.els.blockSelectorMenu.style.display === 'block') ? 'none' : 'block'; N.renderBlockMenu(); };

  // ====== Progress ======
  N.loadProgress = async function () {
    if (!N.state.username) return;
    try { var r = await fetch('/api/progress/' + encodeURIComponent(N.state.username)); if (!r.ok) { console.warn('loadProgress status', r.status); return; } N.state.progress = await r.json(); N.updateProgressUI(); } catch (e) { console.error('loadProgress', e); }
  };
  N.updateProgressUI = function () {
    if (!N.state.progress) return;
    N.els.progressIndicator.textContent = N.state.progress.completed_count + '/' + N.state.progress.total_blocks;
    N.els.progressIndicator.style.display = '';
    N.renderBlockStatusChips();
  };

  N.renderBlockStatusChips = function () {
    if (!N.state.progress || !N.state.blocks) return;
    N.els.blockStatus.style.display = '';
    N.els.blockStatusBody.innerHTML = '';
    N.sortedBlocks().forEach(function (bd) {
      var b = N.state.progress.blocks[bd.slug], st = b ? b.status : 'not-started', chip = document.createElement('button');
      chip.className = 'block-status-chip ' + st; chip.dataset.slug = bd.slug;
      if (st === 'mastered') { var ck = document.createElement('span'); ck.textContent = '✓'; ck.style.fontWeight = '600'; chip.appendChild(ck); }
      var lbl = document.createElement('span'); lbl.textContent = N.localName(bd).toUpperCase(); chip.appendChild(lbl);
      if (st === 'in-progress') { var dot = document.createElement('span'); dot.className = 'chip-dot'; chip.appendChild(dot); }
      chip.addEventListener('click', function () { if (bd.slug !== N.state.blockSlug) N.selectBlock(bd.slug); });
      N.els.blockStatusBody.appendChild(chip);
    });
  };

  N.writeProgress = async function (slug, st, ml) {
    if (!N.state.username) return;
    try { var b = { block_slug: slug }; if (st) b.status = st; if (ml != null) b.mastery_level = ml; var r = await fetch('/api/progress/' + encodeURIComponent(N.state.username), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); if (!r.ok) { console.warn('writeProgress status', r.status); return; } N.state.progress = await r.json(); N.updateProgressUI(); } catch (e) { console.error('writeProgress', e); }
  };

  N.loadBlocks = async function () {
    try { var r = await fetch('/api/blocks'); if (!r.ok) throw Error('Failed'); N.state.blocks = await r.json(); N.renderBlockMenu(); N.renderBlockStatusChips(); N.updateBlockSelectorLabel(); } catch (e) { console.error('loadBlocks', e); }
  };

  // ====== Block selection ======
  N.selectBlock = function (slug) {
    N.archiveCurrentSession();
    N.state.blockSlug = slug || null; N.removeContextMessages();
    if (slug && N.state.blocks && N.state.blocks[slug]) N.addBlockContextMessage(N.state.blocks[slug]);
    N.state.history = []; N.saveSession(); N.updateBlockSelectorLabel(); N.els.inputField.focus(); N.closeBlockMenu();
    if (slug) N.startBlockAssessment(slug);
  };

  N.startBlockAssessment = async function (slug) {
    if (N.state.isLoading) return; N.state.isLoading = true; N.els.inputField.disabled = true; N.els.sendButton.disabled = true; N.setTypingIndicator(true);
    var mem = N.maybeBuildMemory();
    var msg = N.state.lang === 'zh' ? '[SYSTEM] 学生选择了知识块：' + slug + '。请开始主动评估。' : '[SYSTEM] Student selected block: ' + slug + '. Begin proactive assessment.';
    try {
      var r = await fetch('/api/chat', { method: 'POST', headers: N.buildApiHeaders({}), body: JSON.stringify({ username: N.state.username, message: msg, block_slug: slug, history: [], memory_summary: mem, lang: N.state.lang }) });
      N.setTypingIndicator(false);
      if (!r.ok) { var ed = await r.json().catch(function () { return {}; }); if (r.status === 502 && ed.detail && N.isApiKeyError(ed.detail)) { N.addErrorMessage(N.t('noKeyError')); N.openSettings(); if (N.els.apiKeyInput) N.els.apiKeyInput.focus(); return; } throw new Error(N.t('assessmentFailed') + ': ' + (ed.detail || r.status)); }
      var data = await r.json(), reply = data.reply, html = N.markdownToHtml(reply);
      N.addAgentMessage(html); N.state.history.push({ role: 'assistant', content: reply }); N.saveSession(); N.triggerMemoryReview(reply); N.initCharts();
      if (N.state.blockSlug && N.MASTERED_MARKER_RE.test(reply)) N.writeProgress(N.state.blockSlug, 'mastered', 3);
    } catch (err) { N.setTypingIndicator(false); N.addErrorMessage(N.t('errorPrefix') + err.message); if (N.isApiKeyError(err.message)) N.openSettings(); }
    finally { N.state.isLoading = false; N.els.inputField.disabled = false; N.els.sendButton.disabled = false; N.scrollToBottom(); }
  };

  // ====== Event bindings ======
  N.bindBlocksEvents = function () {
    N.els.blockSelectorBtn.addEventListener('click', N.toggleBlockMenu);
    document.addEventListener('click', function (e) { if (!N.els.blockSelectorBtn.contains(e.target) && !N.els.blockSelectorMenu.contains(e.target)) N.closeBlockMenu(); });
    N.els.blockStatusHeader.addEventListener('click', function () { N.els.blockStatus.classList.toggle('is-open'); });
  };

})(window.NAT);