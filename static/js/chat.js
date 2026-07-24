/**
 * Numerical Analysis Tutor — Chat Application Logic
 *
 * Handles:
 * - Username entry overlay and localStorage persistence
 * - Session persistence (conversation saved/restored from localStorage)
 * - Cross-session memory toggle (compact mastery summary sent to API)
 * - New Conversation button
 * - Fetching and rendering knowledge block nav tabs
 * - Progress indicator (N/M blocks completed)
 * - Prerequisite chips (done vs. pending)
 * - Sending messages to the API with block context
 * - Rendering messages with KaTeX formula support
 * - Mode toggle (eye-protection / standard)
 * - Auto-scroll
 */

(function () {
  'use strict';

  // Shared marker regex for :::mastered::: — single source of truth
  // Use _G variant for global replacements (strip), non-G for .test() (detect)
  var MASTERED_MARKER_RE = /:::\s*mastered\s*:::/i;
  var MASTERED_MARKER_RE_G = /:::\s*mastered\s*:::/gi;

  // === State ===
  const state = {
    username: null,
    history: [],
    isLoading: false,
    theme: 'eye-protection',
    blockSlug: null,
    blocks: null,
    progress: null,
    memoryEnabled: false,   // cross-session memory toggle
    memoryInjected: false,  // true after first memory summary sent in this session
  };

  // === DOM References ===
  const overlay = document.getElementById('usernameOverlay');
  const usernameForm = document.getElementById('usernameForm');
  const usernameInput = document.getElementById('usernameInput');
  const usernameStart = document.getElementById('usernameStart');
  const conversation = document.getElementById('conversation');
  const inputField = document.getElementById('inputField');
  const sendButton = document.getElementById('sendButton');
  const modeToggle = document.getElementById('modeToggle');
  const navTabs = document.getElementById('navTabs');
  const navUser = document.getElementById('navUser');
  const progressIndicator = document.getElementById('progressIndicator');
  const newConvButton = document.getElementById('newConvButton');
  const memoryToggle = document.getElementById('memoryToggle');
  const memorySlider = document.getElementById('memorySlider');
  const uploadButton = document.getElementById('uploadButton');
  const fileInput = document.getElementById('fileInput');
  const scrollAnchor = document.getElementById('scrollAnchor');
  const blockStatus = document.getElementById('blockStatus');
  const blockStatusHeader = document.getElementById('blockStatusHeader');
  const blockStatusBody = document.getElementById('blockStatusBody');
  const blockStatusToggle = document.getElementById('blockStatusToggle');

  // === Helpers ===

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function scrollToBottom() {
    if (scrollAnchor) {
      scrollAnchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  // === localStorage Helpers ===

  const STORAGE_PREFIX = 'nat-';

  function lsGet(key, fallback) {
    try { var v = localStorage.getItem(STORAGE_PREFIX + key); return v !== null ? v : fallback; }
    catch (_) { return fallback; }
  }

  function lsSet(key, value) {
    try { localStorage.setItem(STORAGE_PREFIX + key, value); }
    catch (_) { /* ignore */ }
  }

  function lsRemove(key) {
    try { localStorage.removeItem(STORAGE_PREFIX + key); }
    catch (_) { /* ignore */ }
  }

  function lsGetJSON(key, fallback) {
    try { var v = localStorage.getItem(STORAGE_PREFIX + key); return v ? JSON.parse(v) : fallback; }
    catch (_) { return fallback; }
  }

  function lsSetJSON(key, value) {
    try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); }
    catch (_) { /* ignore */ }
  }

  // === Session Persistence ===

  /**
   * Save current session state to localStorage.
   */
  function saveSession() {
    if (!state.username) return;
    var session = {
      history: state.history,
      blockSlug: state.blockSlug,
    };
    lsSetJSON('session-' + state.username, session);
  }

  /**
   * Restore session state from localStorage.
   * Returns true if a session was restored.
   */
  function restoreSession() {
    if (!state.username) return false;
    var session = lsGetJSON('session-' + state.username, null);
    if (!session || !session.history || !session.history.length) return false;

    state.history = session.history;
    state.blockSlug = session.blockSlug || null;

    // Hide welcome message when restoring
    var welcome = conversation.querySelector('[data-message="welcome"]');
    if (welcome) welcome.style.display = 'none';

    // Re-render all history messages
    state.history.forEach(function (msg) {
      if (msg.role === 'user') {
        addUserMessage(msg.content, true);
      } else if (msg.role === 'assistant') {
        var html = markdownToHtml(msg.content);
        addAgentMessage(html, true);
      }
    });

    // Restore block selection indicator
    if (state.blockSlug) {
      updateActiveTab(state.blockSlug);
    }

    // Initialize any chart canvases after restore
    setTimeout(initCharts, 50);

    return true;
  }

  /**
   * Start a new conversation: clear history, remove session messages, show welcome.
   */
  function newConversation() {
    state.history = [];
    state.blockSlug = null;
    state.memoryInjected = false;
    updateActiveTab('');
    saveSession();
    lsRemove('session-' + state.username);

    // Remove all user and agent messages except welcome
    var msgs = conversation.querySelectorAll('.message');
    msgs.forEach(function (el) {
      if (el.dataset.message !== 'welcome') {
        el.remove();
      }
    });

    // Show welcome if hidden
    var welcome = conversation.querySelector('[data-message="welcome"]');
    if (welcome) {
      welcome.style.display = '';
    }

    inputField.focus();
  }

  // === Cross-session Memory ===

  /**
   * Build a compact mastery summary for the LLM (only mastered blocks).
   * Format: "block_slug (mastery_level), block_slug (mastery_level)"
   */
  function buildMemorySummary() {
    if (!state.progress || !state.progress.blocks) return '';

    var mastered = [];
    for (var slug in state.progress.blocks) {
      var b = state.progress.blocks[slug];
      if (b.status === 'mastered' && b.mastery_level > 0) {
        mastered.push(slug + ' (' + b.mastery_level + ')');
      }
    }

    if (!mastered.length) return '';
    return mastered.join(', ');
  }

  /**
   * Update the memory toggle UI from state.
   */
  function updateMemoryUI() {
    memoryToggle.classList.toggle('active', state.memoryEnabled);
  }

  // === LaTeX ===

  function tryRenderLatex(latex, displayMode) {
    try {
      return katex.renderToString(latex, {
        displayMode: displayMode,
        throwOnError: false,
        strict: false,
      });
    } catch (e) {
      return null;
    }
  }

  function renderInlineMath(text) {
    if (!text.trim()) return '';

    const parts = [];
    const regex = /(?<!\$)\$(?!\$)([^$]+?)(?<!\$)\$(?!\$)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(escapeHtml(text.slice(lastIndex, match.index)));
      }
      const rendered = tryRenderLatex(match[1], false);
      parts.push(rendered || escapeHtml('$' + match[1] + '$'));
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(escapeHtml(text.slice(lastIndex)));
    }

    return parts.join('');
  }

  // Chart counter for unique canvas IDs
  var chartCounter = 0;

  function markdownToHtml(markdown) {
    // Strip mastery confirmation markers before other parsing
    markdown = markdown.replace(MASTERED_MARKER_RE_G, '');

    const displayMathBlocks = [];
    let processed = markdown.replace(/\$\$([\s\S]*?)\$\$/g, function (_, math) {
      const idx = displayMathBlocks.length;
      displayMathBlocks.push(math.trim());
      return `\x00MATHBLOCK${idx}\x00`;
    });

    const problemBlocks = [];
    processed = processed.replace(/::: problem\s*\n([\s\S]*?):::/g, function (_, content) {
      const idx = problemBlocks.length;
      problemBlocks.push(content.trim());
      return `\x00PROBLEM${idx}\x00`;
    });

    // Extract :::chart{...}::: blocks before markdown processing
    const chartBlocks = [];
    processed = processed.replace(/:::chart\{(.+?)\}:::/g, function (_, jsonStr) {
      const idx = chartBlocks.length;
      chartBlocks.push(jsonStr);
      return `\x00CHART${idx}\x00`;
    });

    const lines = processed.split('\n');
    const htmlLines = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        if (inList) { htmlLines.push('</ul>'); inList = false; }
        continue;
      }

      if (trimmed.match(/^[-*+]\s+/)) {
        if (!inList) { htmlLines.push('<ul>'); inList = true; }
        htmlLines.push('<li>' + renderInlineMath(trimmed.replace(/^[-*+]\s+/, '')) + '</li>');
        continue;
      }

      if (trimmed.match(/^\d+\.\s+/)) {
        if (!inList) { htmlLines.push('<ol>'); inList = true; }
        htmlLines.push('<li>' + renderInlineMath(trimmed.replace(/^\d+\.\s+/, '')) + '</li>');
        continue;
      }

      if (inList) { htmlLines.push('</ul>'); inList = false; }

      let paragraph = renderInlineMath(line);
      paragraph = paragraph.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      paragraph = paragraph.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
      htmlLines.push('<p>' + paragraph + '</p>');
    }

    if (inList) { htmlLines.push('</ul>'); }

    let html = htmlLines.join('\n');

    html = html.replace(/\x00MATHBLOCK(\d+)\x00/g, function (_, idx) {
      const math = displayMathBlocks[parseInt(idx)];
      const rendered = tryRenderLatex(math, true);
      return '<div class="formula-card">' + (rendered || escapeHtml('$$' + math + '$$')) + '</div>';
    });

    html = html.replace(/\x00PROBLEM(\d+)\x00/g, function (_, idx) {
      const content = problemBlocks[parseInt(idx)];
      const lines = content.split('\n');
      const headerLine = lines[0].trim();
      const bodyLines = lines.slice(1).filter(function (l) { return l.trim(); });

      var tag = '';
      var headerMatch = headerLine.match(/^\*\*(.+?)\*\*/);
      if (headerMatch) { tag = headerMatch[1]; }

      var bodyHtml = bodyLines.map(function (l) {
        return '<p>' + renderInlineMath(l) + '</p>';
      }).join('\n');

      var headerHtml = renderInlineMath(headerLine);

      return '<div class="problem-card" data-problem="">' +
        (tag ? '<div class="problem-tag">' + escapeHtml(tag) + '</div>' : '') +
        '<div class="problem-body">' +
        (tag ? '' : '<p>' + headerHtml + '</p>') +
        bodyHtml +
        '</div>' +
        '</div>';
    });

    html = html.replace(/\x00CHART(\d+)\x00/g, function (_, idx) {
      var chartId = 'chart-' + (++chartCounter);
      var jsonStr = chartBlocks[parseInt(idx)];
      // Escape JSON for data attribute
      var escaped = escapeHtml(jsonStr);
      return '<div class="formula-card chart-card" data-chart="' + escaped + '" id="' + chartId + '">' +
        '<canvas></canvas>' +
        '</div>';
    });

    return html;
  }

  // === Progress & Prerequisites ===

  async function loadProgress() {
    if (!state.username) return;

    try {
      const response = await fetch('/api/progress/' + encodeURIComponent(state.username));
      if (!response.ok) return;
      state.progress = await response.json();
      updateProgressUI();
    } catch (err) {
      console.error('Failed to load progress:', err);
    }
  }

  function updateProgressUI() {
    if (!state.progress) return;

    var completed = state.progress.completed_count;
    var total = state.progress.total_blocks;
    progressIndicator.textContent = completed + '/' + total + ' completed';
    progressIndicator.style.display = '';

    renderBlockStatusChips();
  }

  /**
   * Render Block Status chips — shows each block with its mastery state.
   * Clicking a chip switches to that block (like clicking a nav tab).
   */
  function renderBlockStatusChips() {
    if (!state.progress || !state.blocks) return;

    blockStatus.style.display = '';

    var blocks = state.progress.blocks;
    var sorted = Object.values(state.blocks).sort(function (a, b) {
      if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
      return a.title.localeCompare(b.title);
    });

    blockStatusBody.innerHTML = '';

    sorted.forEach(function (blockDef) {
      var slug = blockDef.slug;
      var b = blocks[slug];
      var status = b ? b.status : 'not-started';

      var chip = document.createElement('button');
      chip.className = 'block-status-chip ' + status;
      chip.dataset.slug = slug;

      if (status === 'mastered') {
        var check = document.createElement('span');
        check.textContent = '✓';
        check.style.fontWeight = '600';
        chip.appendChild(check);
      }

      var label = document.createElement('span');
      label.textContent = blockDef.title.toUpperCase();
      chip.appendChild(label);

      if (status === 'in-progress') {
        var dot = document.createElement('span');
        dot.className = 'chip-dot';
        chip.appendChild(dot);
      }

      chip.addEventListener('click', function () {
        // Only switch if different block
        if (slug !== state.blockSlug) {
          selectBlock(slug);
        }
      });

      blockStatusBody.appendChild(chip);
    });
  }

  // Toggle open/close on block status header click
  blockStatusHeader.addEventListener('click', function () {
    blockStatus.classList.toggle('is-open');
  });

  // === Chart Rendering ===

  /**
   * Find all chart cards in the conversation and initialize Chart.js canvases.
   * Called after new messages are rendered.
   */
  function initCharts() {
    var cards = conversation.querySelectorAll('.chart-card');
    cards.forEach(function (card) {
      // Skip already-initialized charts
      if (card.dataset.chartInitialized) return;
      card.dataset.chartInitialized = '1';

      var jsonStr = card.dataset.chart;
      if (!jsonStr) return;

      try {
        var config = JSON.parse(jsonStr);
        var canvas = card.querySelector('canvas');
        if (!canvas) return;

        // Build Chart.js config with design system colors
        var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1a5c5c';
        var inkMute = getComputedStyle(document.documentElement).getPropertyValue('--ink-mute').trim() || '#6b6560';

        // Default dataset styling
        if (config.data && config.data.datasets) {
          config.data.datasets.forEach(function (ds, i) {
            if (!ds.borderColor) ds.borderColor = accent;
            if (!ds.backgroundColor) ds.backgroundColor = accent + '33'; // 20% opacity
            if (!ds.pointBackgroundColor) ds.pointBackgroundColor = accent;
            if (!ds.pointBorderColor) ds.pointBorderColor = '#fff';
            if (ds.tension == null) ds.tension = 0.3;
          });
        }

        // Default options
        if (!config.options) config.options = {};
        if (!config.options.plugins) config.options.plugins = {};

        // Add responsive defaults
        config.options.responsive = true;
        config.options.maintainAspectRatio = true;

        // Apply design system colors to scales
        if (!config.options.scales) {
          config.options.scales = {
            x: { grid: { color: inkMute + '22' }, ticks: { color: inkMute } },
            y: { grid: { color: inkMute + '22' }, ticks: { color: inkMute } },
          };
        }

        new Chart(canvas, config);
      } catch (e) {
        console.error('Chart init error:', e);
        card.innerHTML = '<p class="error-message" style="padding: 12px;">Chart rendering error</p>';
      }
    });
  }

  /**
   * *Prerequisite chips removed per spec — LLM determines prerequisites dynamically.*
   */

  // === Progress Writing ===

  /**
   * POST progress update to the server and refresh the UI.
   */
  async function writeProgress(blockSlug, status, masteryLevel) {
    if (!state.username) return;
    try {
      var body = { block_slug: blockSlug };
      if (status) body.status = status;
      if (masteryLevel != null) body.mastery_level = masteryLevel;

      var response = await fetch('/api/progress/' + encodeURIComponent(state.username), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) return;
      state.progress = await response.json();
      updateProgressUI();
    } catch (err) {
      console.error('Failed to write progress:', err);
    }
  }

  // === Message Rendering ===

  function addUserMessage(text, noAnimation) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user-message';
    if (noAnimation) msgDiv.style.animation = 'none';
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = '<p>' + escapeHtml(text) + '</p>';
    msgDiv.appendChild(content);
    conversation.appendChild(msgDiv);
  }

  function addAgentMessage(htmlContent, noAnimation) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message agent-message';
    if (noAnimation) msgDiv.style.animation = 'none';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = htmlContent;

    msgDiv.appendChild(contentDiv);
    conversation.appendChild(msgDiv);

    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(contentDiv, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
          ],
          throwOnError: false,
        });
      } catch (e) { /* ignore */ }
    }
  }

  function setTypingIndicator(visible) {
    let indicator = document.getElementById('typingIndicator');
    if (visible) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'typingIndicator';
        indicator.className = 'message agent-message';
        indicator.style.animation = 'none';
        indicator.innerHTML =
          '<div class="message-content">' +
          '<div class="typing-indicator">' +
          '<span class="dot"></span><span class="dot"></span><span class="dot"></span>' +
          '</div></div>';
        conversation.appendChild(indicator);
      }
    } else {
      if (indicator) indicator.remove();
    }
    scrollToBottom();
  }

  function addErrorMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message agent-message';
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = '<p class="error-message">' + escapeHtml(text) + '</p>';
    msgDiv.appendChild(content);
    conversation.appendChild(msgDiv);
    scrollToBottom();
  }

  function addBlockContextMessage(block) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message agent-message';
    msgDiv.dataset.message = 'context';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    contentDiv.innerHTML =
      '<div class="knowledge-tag" style="margin-bottom: 8px;">' + escapeHtml(block.title.toUpperCase()) + '</div>' +
      '<p><strong>' + escapeHtml(block.title) + '</strong> — ' + escapeHtml(block.description) + '</p>' +
      '<p style="font-size: 15px; color: var(--ink-mute); margin-top: 8px;">' +
      "I'll guide you through this topic. What would you like to explore?" +
      '</p>';

    msgDiv.appendChild(contentDiv);
    conversation.appendChild(msgDiv);
    scrollToBottom();
  }

  function removeContextMessages() {
    const msgs = conversation.querySelectorAll('[data-message="context"]');
    msgs.forEach(function (el) { el.remove(); });
  }

  // === Nav Tabs ===

  async function loadBlocks() {
    try {
      const response = await fetch('/api/blocks');
      if (!response.ok) throw new Error('Failed to load blocks');
      state.blocks = await response.json();
      renderTabs();
    } catch (err) {
      console.error('Failed to load knowledge blocks:', err);
    }
  }

  function renderTabs() {
    if (!state.blocks) return;

    while (navTabs.children.length > 1) {
      navTabs.removeChild(navTabs.lastChild);
    }

    const sorted = Object.values(state.blocks).sort(function (a, b) {
      if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
      return a.title.localeCompare(b.title);
    });

    sorted.forEach(function (block) {
      const tab = document.createElement('button');
      tab.className = 'nav-tab';
      tab.dataset.block = block.slug;
      tab.textContent = block.title.toUpperCase();
      tab.addEventListener('click', function () { selectBlock(block.slug); });
      navTabs.appendChild(tab);
    });
  }

  function updateActiveTab(slug) {
    const tabs = navTabs.querySelectorAll('.nav-tab');
    tabs.forEach(function (tab) {
      const isActive = tab.dataset.block === (slug || '');
      tab.classList.toggle('nav-tab-active', isActive);
      tab.setAttribute('data-active', isActive ? 'true' : 'false');
    });
  }

  function selectBlock(slug) {
    state.blockSlug = slug || null;
    updateActiveTab(slug);

    // Remove old context messages
    removeContextMessages();

    if (slug && state.blocks && state.blocks[slug]) {
      addBlockContextMessage(state.blocks[slug]);
    }

    state.history = [];
    saveSession();
    inputField.focus();

    // Active training mode: directly call API, no fake user bubble
    if (slug) {
      startBlockAssessment(slug);
    }
  }

  /**
   * Start block assessment without adding a user message bubble.
   * Sends a synthetic system-style prompt — not visible to the student.
   */
  async function startBlockAssessment(slug) {
    if (state.isLoading) return;
    state.isLoading = true;
    inputField.disabled = true;
    sendButton.disabled = true;
    setTypingIndicator(true);

    var memorySummary = '';
    if (state.memoryEnabled && !state.memoryInjected) {
      memorySummary = buildMemorySummary();
      if (memorySummary) state.memoryInjected = true;
    }

    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: state.username,
          message: '[SYSTEM] Student selected block: ' + slug + '. Begin proactive assessment.',
          block_slug: slug,
          history: [],
          memory_summary: memorySummary,
        }),
      });

      setTypingIndicator(false);

      if (!res.ok) {
        var errData = await res.json().catch(function () { return {}; });
        throw new Error(errData.detail || 'Assessment failed: ' + res.status);
      }

      var data = await res.json();
      var reply = data.reply;

      // Do NOT add a user message — only agent response
      var html = markdownToHtml(reply);
      addAgentMessage(html);
      state.history.push({ role: 'assistant', content: reply });
      saveSession();
      initCharts();

      // Detect mastery marker
      if (state.blockSlug && MASTERED_MARKER_RE.test(reply)) {
        writeProgress(state.blockSlug, 'mastered', 3);
      }
    } catch (err) {
      setTypingIndicator(false);
      addErrorMessage('Error: ' + err.message);
    } finally {
      state.isLoading = false;
      inputField.disabled = false;
      sendButton.disabled = false;
      scrollToBottom();
    }
  }

  // === API Calls ===

  async function sendMessage(message) {
    if (state.isLoading) return;
    state.isLoading = true;
    inputField.disabled = true;
    sendButton.disabled = true;

    addUserMessage(message);
    state.history.push({ role: 'user', content: message });
    scrollToBottom();
    setTypingIndicator(true);

    // Build memory summary if enabled and not yet injected this session
    var memorySummary = '';
    if (state.memoryEnabled && !state.memoryInjected) {
      memorySummary = buildMemorySummary();
      if (memorySummary) state.memoryInjected = true;
    }

    try {
      var body = {
        username: state.username,
        message: message,
        block_slug: state.blockSlug,
        history: state.history.slice(0, -1),
      };
      if (memorySummary) {
        body.memory_summary = memorySummary;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(function () { return {}; });
        throw new Error(errorData.detail || 'Server error: ' + response.status);
      }

      const data = await response.json();
      const reply = data.reply;

      setTypingIndicator(false);

      const html = markdownToHtml(reply);
      addAgentMessage(html);

      state.history.push({ role: 'assistant', content: reply });

      // Save session after each exchange
      saveSession();

      // Initialize any charts in the new message
      initCharts();

      // Detect mastery confirmation and write progress
      if (state.blockSlug) {
        // Mark block as in-progress after first interaction
        if (state.history.filter(function (m) { return m.role === 'user'; }).length === 1) {
          writeProgress(state.blockSlug, 'in-progress');
        }

        // Detect :::mastered::: marker in agent reply → mark mastered
        if (MASTERED_MARKER_RE.test(reply)) {
          writeProgress(state.blockSlug, 'mastered', 3);
        }
      }
    } catch (err) {
      setTypingIndicator(false);
      addErrorMessage('Error: ' + err.message);
    } finally {
      state.isLoading = false;
      inputField.disabled = false;
      sendButton.disabled = false;
      inputField.focus();
      scrollToBottom();
    }
  }

  // === Event Handlers ===

  function handleSend() {
    const message = inputField.value.trim();
    if (!message || state.isLoading) return;
    inputField.value = '';
    sendMessage(message);
  }

  inputField.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  sendButton.addEventListener('click', handleSend);

  // === Image Upload ===

  uploadButton.addEventListener('click', function () {
    if (state.isLoading) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', async function () {
    var file = fileInput.files[0];
    if (!file) return;
    fileInput.value = ''; // reset so same file can be re-uploaded

    // Validate size client-side
    var maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      addErrorMessage('File too large (' + (file.size / 1024 / 1024).toFixed(1) + ' MB). Maximum size: 10 MB.');
      return;
    }

    // Validate type client-side
    var validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (validTypes.indexOf(file.type) === -1) {
      addErrorMessage('Unsupported file format. Supported formats: PNG, JPG, WEBP.');
      return;
    }

    if (state.isLoading) return;
    state.isLoading = true;
    inputField.disabled = true;
    sendButton.disabled = true;
    uploadButton.disabled = true;

    // Show uploading indicator
    var indicator = document.createElement('div');
    indicator.id = 'uploadIndicator';
    indicator.className = 'message agent-message';
    indicator.style.animation = 'none';
    indicator.innerHTML =
      '<div class="message-content">' +
      '<p class="body-sm" style="color: var(--ink-mute);">Analyzing image...</p>' +
      '</div>';
    conversation.appendChild(indicator);
    scrollToBottom();

    try {
      var formData = new FormData();
      formData.append('file', file);
      formData.append('username', state.username);
      if (state.blockSlug) {
        formData.append('block_slug', state.blockSlug);
      }

      var response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      indicator.remove();

      if (!response.ok) {
        var errorData = await response.json().catch(function () { return {}; });
        throw new Error(errorData.detail || 'Upload failed: ' + response.status);
      }

      var data = await response.json();
      var recognized = data.recognized_text;

      // Show recognized problem in a problem card
      var problemMsg = document.createElement('div');
      problemMsg.className = 'message agent-message';
      problemMsg.style.animation = 'none';
      var problemContent = document.createElement('div');
      problemContent.className = 'message-content';
      problemContent.innerHTML =
        '<div class="knowledge-tag" style="margin-bottom: 8px;">RECOGNIZED PROBLEM</div>';

      var bodyDiv = document.createElement('div');
      bodyDiv.className = 'problem-body';
      var bodyHtml = markdownToHtml(recognized);
      bodyDiv.innerHTML = bodyHtml;
      problemContent.appendChild(bodyDiv);
      problemMsg.appendChild(problemContent);
      conversation.appendChild(problemMsg);

      // Re-render KaTeX in the recognized content
      if (window.renderMathInElement) {
        try {
          window.renderMathInElement(problemContent, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
            ],
            throwOnError: false,
          });
        } catch (e) { /* ignore */ }
      }

      // Save to history
      state.history.push({ role: 'assistant', content: recognized });
      saveSession();
    } catch (err) {
      var uploadInd = document.getElementById('uploadIndicator');
      if (uploadInd) uploadInd.remove();
      addErrorMessage('Upload error: ' + err.message);
    } finally {
      state.isLoading = false;
      inputField.disabled = false;
      sendButton.disabled = false;
      uploadButton.disabled = false;
      inputField.focus();
      scrollToBottom();
    }
  });

  // === New Conversation ===
  newConvButton.addEventListener('click', newConversation);

  // === Memory Toggle ===
  memoryToggle.addEventListener('click', function () {
    state.memoryEnabled = !state.memoryEnabled;
    updateMemoryUI();
    lsSet('memory', state.memoryEnabled ? '1' : '0');
  });

  // === Username Overlay ===

  function hideOverlay() {
    overlay.classList.add('hidden');
    setTimeout(function () { inputField.focus(); }, 250);
  }

  function onUserLogin(name) {
    state.username = name;
    navUser.textContent = name;
    lsSet('username', name);
    hideOverlay();

    loadBlocks();
    loadProgress();

    // Try to restore session; if none, show new conv button
    var restored = restoreSession();
    newConvButton.style.display = '';
  }

  function handleUsernameSubmit(e) {
    e.preventDefault();
    var name = usernameInput.value.trim();
    if (!name) return;
    onUserLogin(name);
  }

  usernameForm.addEventListener('submit', handleUsernameSubmit);

  // === Mode Toggle ===
  modeToggle.addEventListener('click', function () {
    const options = this.querySelectorAll('.mode-option');
    const currentActive = this.querySelector('.mode-option.active');
    const newActive = currentActive === options[0] ? options[1] : options[0];

    currentActive.classList.remove('active');
    newActive.classList.add('active');

    const newTheme = newActive.textContent.trim() === 'EYE' ? 'eye-protection' : 'standard';
    state.theme = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    lsSet('theme', newTheme);
  });

  // === Init ===

  // Restore theme
  var savedTheme = lsGet('theme', 'eye-protection');
  if (savedTheme === 'eye-protection' || savedTheme === 'standard') {
    state.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'standard') {
      var options = modeToggle.querySelectorAll('.mode-option');
      options[0].classList.remove('active');
      options[1].classList.add('active');
    }
  }

  // Restore memory toggle
  state.memoryEnabled = lsGet('memory', '0') === '1';
  updateMemoryUI();

  // Check for saved username
  var savedUsername = lsGet('username', null);
  if (savedUsername) {
    onUserLogin(savedUsername);
  } else {
    usernameInput.focus();
  }

  // === Fade-Edge Scroll Hint for Formula Cards ===

  /**
   * Check if formula cards have overflow content and add hint markers.
   */
  function updateFormulaOverflow() {
    var cards = conversation.querySelectorAll('.formula-card');
    cards.forEach(function (card) {
      if (card.scrollWidth > card.clientWidth) {
        card.classList.add('is-overflowing');
      } else {
        card.classList.remove('is-overflowing');
      }
    });
  }

  // Observe DOM changes to re-check formula card overflow
  var observer = new MutationObserver(updateFormulaOverflow);
  observer.observe(conversation, { childList: true, subtree: true });
  // Also check on resize
  window.addEventListener('resize', updateFormulaOverflow);

  window.__NAT = { state };

})();