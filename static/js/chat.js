/**
 * Numerical Analysis Tutor — Chat Application Logic
 *
 * Handles:
 * - i18n (Chinese / English), language toggle
 * - Username entry overlay and localStorage persistence
 * - Settings panel (API Key, Model, Base URL) with model detection
 * - Session persistence, cross-session memory
 * - Block nav tabs, block status panel, progress
 * - KaTeX formula rendering, chart rendering
 * - Mode toggle (eye-protection / standard)
 */

(function () {
  'use strict';

  // === i18n Dictionary ===
  var I18N = {
    zh: {
      brand: '数值分析辅导',
      chatTab: '对话',
      welcomeTitle: '欢迎使用数值分析辅导工具',
      welcomeBody: '我将通过苏格拉底式引导帮助你掌握数值方法。从顶部选择一个知识块，或直接输入你的问题。',
      inputPlaceholder: '输入你的答案或问题...',
      newConv: '+ 新对话',
      memLabel: '记忆',
      blockStatus: '学习进度',
      uploadTitle: '上传题目截图',
      sendLabel: '发送消息',
      notStarted: '未开始',
      inProgress: '进行中',
      mastered: '已掌握',
      usernamePrompt: '输入你的名字开始学习。进度按用户保存。',
      usernamePlaceholder: '你的名字',
      startButton: '开始',
      settingsTitle: '设置（Settings）',
      modelLabel: '模型（Model）',
      settingsSave: '保存（Save）',
      settingsClose: '关闭（Close）',
      settingsHint: 'Key 仅存储在你的浏览器本地，不会上传到任何服务器。',
      detectModels: '检测可用模型',
      detectModelsActive: '检测中...',
      detectModelsDone: function(n) { return '已找到 ' + n + ' 个模型'; },
      detectModelsFail: '检测失败',
      assessMsg: '[SYSTEM] 学生选择了知识块：{slug}。请开始主动评估。',
      analyzingImg: '正在分析图片...',
      errorPrefix: '错误：',
      noKeyError: 'API Key 未配置。请在设置面板中输入 API Key。',
      chartRenderError: '图表渲染错误',
      fileTooLarge: '文件过大，最大 10 MB',
      unsupportedFormat: '不支持的格式，请使用 PNG, JPG, WEBP',
      assessmentFailed: '评估请求失败',
      serverError: '服务器错误',
      uploadFailed: '上传失败',
      recognizedProblem: '题目识别结果',
      apiKeyLabel: 'API Key（API 密钥）',
      apiBaseLabel: 'API 地址（Base URL）',
      modeEye: '护眼',
      modeStd: '标准',
      memTitle: '跨会话记忆',
      langTitle: '切换语言',
      modeTitle: '切换颜色模式',
    },
    en: {
      brand: 'NUMERICAL ANALYSIS TUTOR',
      chatTab: 'CHAT',
      welcomeTitle: 'Welcome to the Numerical Analysis Tutor',
      welcomeBody: "I'm here to help you master numerical methods through guided Socratic dialogue. Select a topic from the navigation bar above, or just start typing your question below.",
      inputPlaceholder: 'Type your answer or question...',
      newConv: '+ NEW',
      memLabel: 'MEM',
      blockStatus: 'BLOCK STATUS',
      uploadTitle: 'Upload problem screenshot',
      sendLabel: 'Send message',
      notStarted: 'Not started',
      inProgress: 'In progress',
      mastered: 'Mastered',
      usernamePrompt: 'Enter your name to begin. Progress is saved per user.',
      usernamePlaceholder: 'Your name',
      startButton: 'Start',
      settingsTitle: 'Settings',
      modelLabel: 'Model',
      settingsSave: 'Save',
      settingsClose: 'Close',
      settingsHint: 'Your API key is stored locally in your browser and never sent to any server.',
      detectModels: 'Detect Models',
      detectModelsActive: 'Detecting...',
      detectModelsDone: function(n) { return n + ' models found'; },
      detectModelsFail: 'Detection failed',
      assessMsg: '[SYSTEM] Student selected block: {slug}. Begin proactive assessment.',
      analyzingImg: 'Analyzing image...',
      errorPrefix: 'Error: ',
      noKeyError: 'API Key not configured. Please enter your API Key in Settings.',
      chartRenderError: 'Chart rendering error',
      fileTooLarge: 'File too large. Max 10 MB.',
      unsupportedFormat: 'Unsupported format. Use PNG, JPG, WEBP.',
      assessmentFailed: 'Assessment failed',
      serverError: 'Server error',
      uploadFailed: 'Upload failed',
      recognizedProblem: 'RECOGNIZED PROBLEM',
      apiKeyLabel: 'API Key',
      apiBaseLabel: 'API Base URL',
      modeEye: 'EYE',
      modeStd: 'STD',
      memTitle: 'Cross-session memory',
      langTitle: 'Switch language',
      modeTitle: 'Toggle color mode',
    },
  };

  // Shared marker regex for :::mastered:::
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
    memoryEnabled: false,
    memoryInjected: false,
    lang: 'zh',
  };

  // === DOM References ===
  const overlay = document.getElementById('usernameOverlay');
  const usernameForm = document.getElementById('usernameForm');
  const usernameInput = document.getElementById('usernameInput');
  const conversation = document.getElementById('conversation');
  const inputField = document.getElementById('inputField');
  const sendButton = document.getElementById('sendButton');
  const modeToggle = document.getElementById('modeToggle');
  const navTabs = document.getElementById('navTabs');
  const navUser = document.getElementById('navUser');
  const progressIndicator = document.getElementById('progressIndicator');
  const newConvButton = document.getElementById('newConvButton');
  const memoryToggle = document.getElementById('memoryToggle');
  const uploadButton = document.getElementById('uploadButton');
  const fileInput = document.getElementById('fileInput');
  const scrollAnchor = document.getElementById('scrollAnchor');
  const blockStatus = document.getElementById('blockStatus');
  const blockStatusHeader = document.getElementById('blockStatusHeader');
  const blockStatusBody = document.getElementById('blockStatusBody');
  const langToggle = document.getElementById('langToggle');
  const settingsButton = document.getElementById('settingsButton');
  const settingsOverlay = document.getElementById('settingsOverlay');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const modelInput = document.getElementById('modelInput');
  const modelList = document.getElementById('modelList');
  const apiBaseInput = document.getElementById('apiBaseInput');
  const settingsSave = document.getElementById('settingsSave');
  const settingsClose = document.getElementById('settingsClose');
  const detectModelsBtn = document.getElementById('detectModels');

  // === i18n Helpers ===

  function t(key) { return I18N[state.lang][key] || key; }

  function tf(key) {
    var fn = I18N[state.lang][key];
    return typeof fn === 'function' ? fn : function () { return fn || key; };
  }

  /** Apply current language to all DOM elements with data-i18n attributes. */
  function applyLanguage() {
    document.documentElement.lang = state.lang;
    // data-i18n → textContent
    var els = document.querySelectorAll('[data-i18n]');
    els.forEach(function (el) {
      var key = el.dataset.i18n;
      if (I18N[state.lang][key]) {
        el.textContent = t(key);
      }
    });
    // data-i18n-placeholder → placeholder
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(function (el) {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    // data-i18n-title → title
    var titles = document.querySelectorAll('[data-i18n-title]');
    titles.forEach(function (el) {
      el.title = t(el.dataset.i18nTitle);
    });
    // data-i18n-aria → aria-label
    var arias = document.querySelectorAll('[data-i18n-aria]');
    arias.forEach(function (el) {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
    // Nav brand
    var brand = document.getElementById('navBrand');
    if (brand) brand.textContent = t('brand');
    // Lang toggle active state
    var opts = langToggle.querySelectorAll('.lang-option');
    opts.forEach(function (o) {
      o.classList.toggle('active', (state.lang === 'zh' && o.textContent === '中') || (state.lang === 'en' && o.textContent === 'EN'));
    });
    // Re-render tabs with correct language
    renderTabs();
    // Re-render block status chips
    renderBlockStatusChips();
    // Update detect models button text
    detectModelsBtn.textContent = t('detectModels');
  }

  // === Settings Panel ===

  function loadSettings() {
    apiKeyInput.value = lsGet('api-key', '');
    modelInput.value = lsGet('model', '');
    apiBaseInput.value = lsGet('api-base', '');
  }

  function saveSettings() {
    lsSet('api-key', apiKeyInput.value.trim());
    lsSet('model', modelInput.value.trim());
    lsSet('api-base', apiBaseInput.value.trim());
  }

  function openSettings() {
    loadSettings();
    settingsOverlay.style.display = 'flex';
    // Auto-detect if key already set
    if (apiKeyInput.value.trim() && modelList.children.length === 0) {
      detectModelsBtn.click();
    }
  }

  function closeSettings() {
    settingsOverlay.style.display = 'none';
  }

  settingsButton.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);
  settingsSave.addEventListener('click', function () {
    saveSettings();
    closeSettings();
  });
  // Close on overlay click (outside card)
  settingsOverlay.addEventListener('click', function (e) {
    if (e.target === settingsOverlay) closeSettings();
  });

  // === API Header Builder ===

  function buildApiHeaders(extra) {
    var headers = extra || {};
    headers['Content-Type'] = 'application/json';
    var apiKey = lsGet('api-key', '');
    var model = lsGet('model', '');
    var apiBase = lsGet('api-base', '');
    if (apiKey) headers['X-API-Key'] = apiKey;
    if (model) headers['X-Model'] = model;
    if (apiBase) headers['X-API-Base'] = apiBase;
    return headers;
  }

  // === Model Detection ===

  detectModelsBtn.addEventListener('click', async function () {
    detectModelsBtn.disabled = true;
    detectModelsBtn.textContent = t('detectModelsActive');
    try {
      var res = await fetch('/api/models', { headers: buildApiHeaders({}) });
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
      var data = await res.json();
      modelList.innerHTML = '';
      data.models.forEach(function (m) {
        var opt = document.createElement('option');
        opt.value = m;
        modelList.appendChild(opt);
      });
      if (!modelInput.value && data.models.length > 0) {
        modelInput.value = data.models[0];
      }
      detectModelsBtn.textContent = tf('detectModelsDone')(data.models.length);
    } catch (err) {
      detectModelsBtn.textContent = t('detectModelsFail');
    }
    // Reset button text after 2s
    var btn = detectModelsBtn;
    setTimeout(function () {
      btn.disabled = false;
      btn.textContent = t('detectModels');
    }, 2000);
  });

  // === Helpers ===

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function scrollToBottom() {
    if (scrollAnchor) scrollAnchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  // === localStorage ===

  const SP = 'nat-';
  function lsGet(key, fb) { try { var v = localStorage.getItem(SP + key); return v !== null ? v : fb; } catch (_) { return fb; } }
  function lsSet(key, v) { try { localStorage.setItem(SP + key, v); } catch (_) {} }
  function lsRemove(key) { try { localStorage.removeItem(SP + key); } catch (_) {} }
  function lsGetJSON(key, fb) { try { var v = localStorage.getItem(SP + key); return v ? JSON.parse(v) : fb; } catch (_) { return fb; } }
  function lsSetJSON(key, v) { try { localStorage.setItem(SP + key, JSON.stringify(v)); } catch (_) {} }

  // === Session Persistence ===

  function saveSession() {
    if (!state.username) return;
    lsSetJSON('session-' + state.username, { history: state.history, blockSlug: state.blockSlug });
  }

  function restoreSession() {
    if (!state.username) return false;
    var session = lsGetJSON('session-' + state.username, null);
    if (!session || !session.history || !session.history.length) return false;
    state.history = session.history;
    state.blockSlug = session.blockSlug || null;

    var welcome = conversation.querySelector('[data-message="welcome"]');
    if (welcome) welcome.style.display = 'none';

    state.history.forEach(function (msg) {
      if (msg.role === 'user') addUserMessage(msg.content, true);
      else if (msg.role === 'assistant') addAgentMessage(markdownToHtml(msg.content), true);
    });
    if (state.blockSlug) updateActiveTab(state.blockSlug);
    setTimeout(initCharts, 50);
    return true;
  }

  function newConversation() {
    state.history = [];
    state.blockSlug = null;
    state.memoryInjected = false;
    updateActiveTab('');
    saveSession();
    lsRemove('session-' + state.username);
    var msgs = conversation.querySelectorAll('.message');
    msgs.forEach(function (el) { if (el.dataset.message !== 'welcome') el.remove(); });
    var welcome = conversation.querySelector('[data-message="welcome"]');
    if (welcome) welcome.style.display = '';
    inputField.focus();
  }

  // === Memory ===

  function buildMemorySummary() {
    if (!state.progress || !state.progress.blocks) return '';
    var mastered = [];
    for (var slug in state.progress.blocks) {
      var b = state.progress.blocks[slug];
      if (b.status === 'mastered' && b.mastery_level > 0) mastered.push(slug + ' (' + b.mastery_level + ')');
    }
    return mastered.length ? mastered.join(', ') : '';
  }

  function updateMemoryUI() { memoryToggle.classList.toggle('active', state.memoryEnabled); }

  // === LaTeX ===

  function tryRenderLatex(latex, displayMode) {
    try { return katex.renderToString(latex, { displayMode: displayMode, throwOnError: false, strict: false }); }
    catch (e) { return null; }
  }

  function renderInlineMath(text) {
    if (!text.trim()) return '';
    const parts = [];
    const regex = /(?<!\$)\$(?!\$)([^$]+?)(?<!\$)\$(?!\$)/g;
    let lastIndex = 0, match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(escapeHtml(text.slice(lastIndex, match.index)));
      var rendered = tryRenderLatex(match[1], false);
      parts.push(rendered || escapeHtml('$' + match[1] + '$'));
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(escapeHtml(text.slice(lastIndex)));
    return parts.join('');
  }

  var chartCounter = 0;

  function markdownToHtml(markdown) {
    markdown = markdown.replace(MASTERED_MARKER_RE_G, '');

    var displayMathBlocks = [];
    var processed = markdown.replace(/\$\$([\s\S]*?)\$\$/g, function (_, m) {
      var idx = displayMathBlocks.length;
      displayMathBlocks.push(m.trim());
      return '\x00MATHBLOCK' + idx + '\x00';
    });

    var problemBlocks = [];
    processed = processed.replace(/::: problem\s*\n([\s\S]*?):::/g, function (_, c) {
      var idx = problemBlocks.length;
      problemBlocks.push(c.trim());
      return '\x00PROBLEM' + idx + '\x00';
    });

    var chartBlocks = [];
    processed = processed.replace(/:::chart\{(.+?)\}:::/g, function (_, j) {
      var idx = chartBlocks.length;
      chartBlocks.push(j);
      return '\x00CHART' + idx + '\x00';
    });

    var lines = processed.split('\n');
    var htmlLines = [];
    var inList = false;

    for (var i = 0; i < lines.length; i++) {
      var trimmed = lines[i].trim();
      if (!trimmed) { if (inList) { htmlLines.push('</ul>'); inList = false; } continue; }
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
      var p = renderInlineMath(lines[i]);
      p = p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      p = p.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
      htmlLines.push('<p>' + p + '</p>');
    }
    if (inList) htmlLines.push('</ul>');

    var html = htmlLines.join('\n');
    html = html.replace(/\x00MATHBLOCK(\d+)\x00/g, function (_, idx) {
      var math = displayMathBlocks[parseInt(idx)];
      var rendered = tryRenderLatex(math, true);
      return '<div class="formula-card">' + (rendered || escapeHtml('$$' + math + '$$')) + '</div>';
    });
    html = html.replace(/\x00PROBLEM(\d+)\x00/g, function (_, idx) {
      var c = problemBlocks[parseInt(idx)];
      var ls = c.split('\n');
      var hdr = ls[0].trim();
      var body = ls.slice(1).filter(function (l) { return l.trim(); });
      var tag = '';
      var m = hdr.match(/^\*\*(.+?)\*\*/);
      if (m) tag = m[1];
      var bHtml = body.map(function (l) { return '<p>' + renderInlineMath(l) + '</p>'; }).join('\n');
      var hHtml = renderInlineMath(hdr);
      return '<div class="problem-card" data-problem="">' +
        (tag ? '<div class="problem-tag">' + escapeHtml(tag) + '</div>' : '') +
        '<div class="problem-body">' + (tag ? '' : '<p>' + hHtml + '</p>') + bHtml + '</div></div>';
    });
    html = html.replace(/\x00CHART(\d+)\x00/g, function (_, idx) {
      var cid = 'chart-' + (++chartCounter);
      var jsonStr = chartBlocks[parseInt(idx)];
      return '<div class="formula-card chart-card" data-chart="' + escapeHtml(jsonStr) + '" id="' + cid + '"><canvas></canvas></div>';
    });
    return html;
  }

  // === Progress ===

  async function loadProgress() {
    if (!state.username) return;
    try {
      var res = await fetch('/api/progress/' + encodeURIComponent(state.username));
      if (!res.ok) return;
      state.progress = await res.json();
      updateProgressUI();
    } catch (err) { console.error('Failed to load progress:', err); }
  }

  function updateProgressUI() {
    if (!state.progress) return;
    var completed = state.progress.completed_count;
    var total = state.progress.total_blocks;
    progressIndicator.textContent = completed + '/' + total;
    progressIndicator.style.display = '';
    renderBlockStatusChips();
  }

  function renderBlockStatusChips() {
    if (!state.progress || !state.blocks) return;
    blockStatus.style.display = '';
    var sorted = Object.values(state.blocks).sort(function (a, b) {
      if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
      return a.title.localeCompare(b.title);
    });
    blockStatusBody.innerHTML = '';
    sorted.forEach(function (bd) {
      var b = state.progress.blocks[bd.slug];
      var st = b ? b.status : 'not-started';
      var chip = document.createElement('button');
      chip.className = 'block-status-chip ' + st;
      chip.dataset.slug = bd.slug;
      if (st === 'mastered') { var ck = document.createElement('span'); ck.textContent = '✓'; ck.style.fontWeight = '600'; chip.appendChild(ck); }
      var lbl = document.createElement('span');
      lbl.textContent = state.lang === 'zh' && bd.title_zh ? bd.title_zh.toUpperCase() : bd.title.toUpperCase();
      chip.appendChild(lbl);
      if (st === 'in-progress') { var dot = document.createElement('span'); dot.className = 'chip-dot'; chip.appendChild(dot); }
      chip.addEventListener('click', function () { if (bd.slug !== state.blockSlug) selectBlock(bd.slug); });
      blockStatusBody.appendChild(chip);
    });
  }

  blockStatusHeader.addEventListener('click', function () { blockStatus.classList.toggle('is-open'); });

  // === Charts ===

  function initCharts() {
    var cards = conversation.querySelectorAll('.chart-card');
    cards.forEach(function (card) {
      if (card.dataset.chartInitialized) return;
      card.dataset.chartInitialized = '1';
      var jsonStr = card.dataset.chart;
      if (!jsonStr) return;
      try {
        var config = JSON.parse(jsonStr);
        var canvas = card.querySelector('canvas');
        if (!canvas) return;
        var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1a5c5c';
        var inkMute = getComputedStyle(document.documentElement).getPropertyValue('--ink-mute').trim() || '#6b6560';
        if (config.data && config.data.datasets) {
          config.data.datasets.forEach(function (ds) {
            if (!ds.borderColor) ds.borderColor = accent;
            if (!ds.backgroundColor) ds.backgroundColor = accent + '33';
            if (!ds.pointBackgroundColor) ds.pointBackgroundColor = accent;
            if (!ds.pointBorderColor) ds.pointBorderColor = '#fff';
            if (ds.tension == null) ds.tension = 0.3;
          });
        }
        if (!config.options) config.options = {};
        config.options.responsive = true;
        config.options.maintainAspectRatio = true;
        if (!config.options.scales) {
          config.options.scales = { x: { grid: { color: inkMute + '22' }, ticks: { color: inkMute } }, y: { grid: { color: inkMute + '22' }, ticks: { color: inkMute } } };
        }
        new Chart(canvas, config);
      } catch (e) { card.innerHTML = '<p class="error-message" style="padding: 12px;">' + escapeHtml(t('chartRenderError')) + '</p>'; }
    });
  }

  // === Progress Writing ===

  async function writeProgress(blockSlug, status, masteryLevel) {
    if (!state.username) return;
    try {
      var body = { block_slug: blockSlug };
      if (status) body.status = status;
      if (masteryLevel != null) body.mastery_level = masteryLevel;
      var res = await fetch('/api/progress/' + encodeURIComponent(state.username), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) return;
      state.progress = await res.json();
      updateProgressUI();
    } catch (err) { console.error('Failed to write progress:', err); }
  }

  // === Message Rendering ===

  function addUserMessage(text, noAnim) {
    var msg = document.createElement('div');
    msg.className = 'message user-message';
    if (noAnim) msg.style.animation = 'none';
    var c = document.createElement('div');
    c.className = 'message-content';
    c.innerHTML = '<p>' + escapeHtml(text) + '</p>';
    msg.appendChild(c);
    conversation.appendChild(msg);
  }

  function addAgentMessage(htmlContent, noAnim) {
    var msg = document.createElement('div');
    msg.className = 'message agent-message';
    if (noAnim) msg.style.animation = 'none';
    var c = document.createElement('div');
    c.className = 'message-content';
    c.innerHTML = htmlContent;
    msg.appendChild(c);
    conversation.appendChild(msg);
    if (window.renderMathInElement) {
      try { window.renderMathInElement(c, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); }
      catch (e) { /* ignore */ }
    }
  }

  function setTypingIndicator(visible) {
    var ind = document.getElementById('typingIndicator');
    if (visible) {
      if (!ind) {
        ind = document.createElement('div');
        ind.id = 'typingIndicator';
        ind.className = 'message agent-message';
        ind.style.animation = 'none';
        ind.innerHTML = '<div class="message-content"><div class="typing-indicator"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div></div>';
        conversation.appendChild(ind);
      }
    } else { if (ind) ind.remove(); }
    scrollToBottom();
  }

  function addErrorMessage(text) {
    var msg = document.createElement('div');
    msg.className = 'message agent-message';
    var c = document.createElement('div');
    c.className = 'message-content';
    c.innerHTML = '<p class="error-message">' + escapeHtml(text) + '</p>';
    msg.appendChild(c);
    conversation.appendChild(msg);
    scrollToBottom();
  }

  function addBlockContextMessage(block) {
    var msg = document.createElement('div');
    msg.className = 'message agent-message';
    msg.dataset.message = 'context';
    var c = document.createElement('div');
    c.className = 'message-content';
    var label = state.lang === 'zh' && block.title_zh ? block.title_zh.toUpperCase() : block.title.toUpperCase();
    var desc = state.lang === 'zh' && block.description_zh ? block.description_zh : block.description;
    c.innerHTML = '<div class="knowledge-tag" style="margin-bottom: 8px;">' + escapeHtml(label) + '</div>' +
      '<p><strong>' + escapeHtml(label) + '</strong> — ' + escapeHtml(desc) + '</p>' +
      '<p style="font-size: 15px; color: var(--ink-mute); margin-top: 8px;">' +
      escapeHtml(t('welcomeTitle')) + '</p>';
    msg.appendChild(c);
    conversation.appendChild(msg);
    scrollToBottom();
  }

  function removeContextMessages() {
    conversation.querySelectorAll('[data-message="context"]').forEach(function (el) { el.remove(); });
  }

  // === Nav Tabs ===

  async function loadBlocks() {
    try {
      var res = await fetch('/api/blocks');
      if (!res.ok) throw new Error('Failed to load blocks');
      state.blocks = await res.json();
      renderTabs();
    } catch (err) { console.error('Failed to load knowledge blocks:', err); }
  }

  function renderTabs() {
    if (!state.blocks) return;
    while (navTabs.children.length > 1) navTabs.removeChild(navTabs.lastChild);
    var sorted = Object.values(state.blocks).sort(function (a, b) {
      if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
      return a.title.localeCompare(b.title);
    });
    sorted.forEach(function (block) {
      var tab = document.createElement('button');
      tab.className = 'nav-tab';
      tab.dataset.block = block.slug;
      var displayName = (state.lang === 'zh' && block.title_zh) ? block.title_zh.toUpperCase() : block.title.toUpperCase();
      tab.textContent = displayName;
      tab.addEventListener('click', function () { selectBlock(block.slug); });
      navTabs.appendChild(tab);
    });
  }

  function updateActiveTab(slug) {
    navTabs.querySelectorAll('.nav-tab').forEach(function (tab) {
      var isActive = tab.dataset.block === (slug || '');
      tab.classList.toggle('nav-tab-active', isActive);
      tab.setAttribute('data-active', isActive ? 'true' : 'false');
    });
  }

  function selectBlock(slug) {
    state.blockSlug = slug || null;
    updateActiveTab(slug);
    removeContextMessages();
    if (slug && state.blocks && state.blocks[slug]) addBlockContextMessage(state.blocks[slug]);
    state.history = [];
    saveSession();
    inputField.focus();
    if (slug) startBlockAssessment(slug);
  }

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

    var msgText = state.lang === 'zh'
      ? '[SYSTEM] 学生选择了知识块：' + slug + '。请开始主动评估。'
      : '[SYSTEM] Student selected block: ' + slug + '. Begin proactive assessment.';

    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: buildApiHeaders({}),
        body: JSON.stringify({
          username: state.username,
          message: msgText,
          block_slug: slug,
          history: [],
          memory_summary: memorySummary,
          lang: state.lang,
        }),
      });
      setTypingIndicator(false);
      if (!res.ok) {
        var errData = await res.json().catch(function () { return {}; });
        if (res.status === 502 && errData.detail && errData.detail.indexOf('API key') !== -1) {
          addErrorMessage(t('noKeyError'));
          openSettings();
          if (apiKeyInput) apiKeyInput.focus();
          return;
        }
        throw new Error(t('assessmentFailed') + ': ' + (errData.detail || res.status));
      }
      var data = await res.json();
      var reply = data.reply;
      var html = markdownToHtml(reply);
      addAgentMessage(html);
      state.history.push({ role: 'assistant', content: reply });
      saveSession();
      initCharts();
      if (state.blockSlug && MASTERED_MARKER_RE.test(reply)) writeProgress(state.blockSlug, 'mastered', 3);
    } catch (err) {
      setTypingIndicator(false);
      addErrorMessage(t('errorPrefix') + err.message);
      // Pop settings on 502 key errors
      if (err.message.indexOf('API key') !== -1) openSettings();
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
        lang: state.lang,
      };
      if (memorySummary) body.memory_summary = memorySummary;

      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: buildApiHeaders({}),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        var errData = await res.json().catch(function () { return {}; });
        if (res.status === 502 && errData.detail && errData.detail.indexOf('API key') !== -1) {
          addErrorMessage(t('noKeyError'));
          openSettings();
          if (apiKeyInput) apiKeyInput.focus();
          return;
        }
        throw new Error(t('serverError') + ': ' + (errData.detail || res.status));
      }

      var data = await res.json();
      var reply = data.reply;
      setTypingIndicator(false);

      var html = markdownToHtml(reply);
      addAgentMessage(html);
      state.history.push({ role: 'assistant', content: reply });
      saveSession();
      initCharts();

      if (state.blockSlug) {
        if (state.history.filter(function (m) { return m.role === 'user'; }).length === 1) writeProgress(state.blockSlug, 'in-progress');
        if (MASTERED_MARKER_RE.test(reply)) writeProgress(state.blockSlug, 'mastered', 3);
      }
    } catch (err) {
      setTypingIndicator(false);
      addErrorMessage(t('errorPrefix') + err.message);
      if (err.message.indexOf('API key') !== -1) openSettings();
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
    var msg = inputField.value.trim();
    if (!msg || state.isLoading) return;
    inputField.value = '';
    sendMessage(msg);
  }

  inputField.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
  sendButton.addEventListener('click', handleSend);

  // === Image Upload ===

  uploadButton.addEventListener('click', function () { if (!state.isLoading) fileInput.click(); });

  fileInput.addEventListener('change', async function () {
    var file = fileInput.files[0];
    if (!file) return;
    fileInput.value = '';
    var maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) { addErrorMessage(t('errorPrefix') + t('fileTooLarge')); return; }
    var valid = ['image/png', 'image/jpeg', 'image/webp'];
    if (valid.indexOf(file.type) === -1) { addErrorMessage(t('errorPrefix') + t('unsupportedFormat')); return; }
    if (state.isLoading) return;
    state.isLoading = true;
    inputField.disabled = true;
    sendButton.disabled = true;
    uploadButton.disabled = true;

    var indicator = document.createElement('div');
    indicator.id = 'uploadIndicator';
    indicator.className = 'message agent-message';
    indicator.style.animation = 'none';
    indicator.innerHTML = '<div class="message-content"><p class="body-sm" style="color: var(--ink-mute);">' + escapeHtml(t('analyzingImg')) + '</p></div>';
    conversation.appendChild(indicator);
    scrollToBottom();

    try {
      var fd = new FormData();
      fd.append('file', file);
      fd.append('username', state.username);
      fd.append('lang', state.lang);
      if (state.blockSlug) fd.append('block_slug', state.blockSlug);

      // Build extra headers excluding Content-Type (form-data sets its own)
      var extraHeaders = {};
      var apiKey = lsGet('api-key', ''), model = lsGet('model', ''), apiBase = lsGet('api-base', '');
      if (apiKey) extraHeaders['X-API-Key'] = apiKey;
      if (model) extraHeaders['X-Model'] = model;
      if (apiBase) extraHeaders['X-API-Base'] = apiBase;

      var res = await fetch('/api/upload', { method: 'POST', headers: extraHeaders, body: fd });
      indicator.remove();

      if (!res.ok) {
        var errData2 = await res.json().catch(function () { return {}; });
        throw new Error(t('uploadFailed') + ': ' + (errData2.detail || res.status));
      }

      var data = await res.json();
      var recognized = data.recognized_text;
      var problemMsg = document.createElement('div');
      problemMsg.className = 'message agent-message';
      problemMsg.style.animation = 'none';
      var pc = document.createElement('div');
      pc.className = 'message-content';
      pc.innerHTML = '<div class="knowledge-tag" style="margin-bottom: 8px;">' + escapeHtml(t('recognizedProblem')) + '</div>';
      var bd = document.createElement('div');
      bd.className = 'problem-body';
      bd.innerHTML = markdownToHtml(recognized);
      pc.appendChild(bd);
      problemMsg.appendChild(pc);
      conversation.appendChild(problemMsg);

      if (window.renderMathInElement) {
        try { window.renderMathInElement(pc, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); }
        catch (e) { /* ignore */ }
      }
      state.history.push({ role: 'assistant', content: recognized });
      saveSession();
    } catch (err) {
      var ui = document.getElementById('uploadIndicator');
      if (ui) ui.remove();
      addErrorMessage(t('errorPrefix') + err.message);
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

  // === Language Toggle ===
  langToggle.addEventListener('click', function () {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    lsSet('lang', state.lang);
    applyLanguage();
  });

  // === Username Overlay ===

  function hideOverlay() { overlay.classList.add('hidden'); setTimeout(function () { inputField.focus(); }, 250); }

  function onUserLogin(name) {
    state.username = name;
    navUser.textContent = name;
    lsSet('username', name);
    hideOverlay();
    loadBlocks();
    loadProgress();
    restoreSession();
    newConvButton.style.display = '';
  }

  usernameForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = usernameInput.value.trim();
    if (name) onUserLogin(name);
  });

  // === Mode Toggle ===
  modeToggle.addEventListener('click', function () {
    var opts = this.querySelectorAll('.mode-option');
    var cur = this.querySelector('.mode-option.active');
    var next = cur === opts[0] ? opts[1] : opts[0];
    cur.classList.remove('active');
    next.classList.add('active');
    var theme = next.dataset.mode || 'eye-protection';
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    lsSet('theme', theme);
  });

  // === Init ===

  // Restore theme
  var savedTheme = lsGet('theme', 'eye-protection');
  if (savedTheme === 'eye-protection' || savedTheme === 'standard') {
    state.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'standard') {
      var modeOpts = modeToggle.querySelectorAll('.mode-option');
      modeOpts[0].classList.remove('active');
      modeOpts[1].classList.add('active');
    }
  }

  // Restore language
  state.lang = lsGet('lang', 'zh');
  applyLanguage();

  // Restore memory
  state.memoryEnabled = lsGet('memory', '0') === '1';
  updateMemoryUI();

  // Check for saved username
  var savedUsername = lsGet('username', null);
  if (savedUsername) onUserLogin(savedUsername);
  else usernameInput.focus();

  // === Formula overflow ===

  function updateFormulaOverflow() {
    conversation.querySelectorAll('.formula-card').forEach(function (card) {
      card.classList.toggle('is-overflowing', card.scrollWidth > card.clientWidth);
    });
  }
  var observer = new MutationObserver(updateFormulaOverflow);
  observer.observe(conversation, { childList: true, subtree: true });
  window.addEventListener('resize', updateFormulaOverflow);

  window.__NAT = { state };

})();