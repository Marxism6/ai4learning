/**
 * Numerical Analysis Tutor — Chat Application Logic
 *
 * Handles:
 * - Username entry overlay and localStorage persistence
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

  // === State ===
  const state = {
    username: null,
    history: [],
    isLoading: false,
    theme: 'eye-protection',
    blockSlug: null,
    blocks: null,
    progress: null,        // progress data from /api/progress/{username}
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
  const scrollAnchor = document.getElementById('scrollAnchor');

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

  function markdownToHtml(markdown) {
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
        htmlLines.push(`<li>${renderInlineMath(trimmed.replace(/^[-*+]\s+/, ''))}</li>`);
        continue;
      }

      if (trimmed.match(/^\d+\.\s+/)) {
        if (!inList) { htmlLines.push('<ol>'); inList = true; }
        htmlLines.push(`<li>${renderInlineMath(trimmed.replace(/^\d+\.\s+/, ''))}</li>`);
        continue;
      }

      if (inList) { htmlLines.push('</ul>'); inList = false; }

      let paragraph = renderInlineMath(line);
      paragraph = paragraph.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      paragraph = paragraph.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
      htmlLines.push(`<p>${paragraph}</p>`);
    }

    if (inList) { htmlLines.push('</ul>'); }

    let html = htmlLines.join('\n');

    html = html.replace(/\x00MATHBLOCK(\d+)\x00/g, function (_, idx) {
      const math = displayMathBlocks[parseInt(idx)];
      const rendered = tryRenderLatex(math, true);
      return `<div class="formula-card">${rendered || escapeHtml('$$' + math + '$$')}</div>`;
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

    return html;
  }

  // === Progress & Prerequisites ===

  /**
   * Fetch progress for the current user and update UI.
   */
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

  /**
   * Update progress indicator and prerequisite chips based on loaded progress.
   */
  function updateProgressUI() {
    if (!state.progress) return;

    // Progress indicator: "N/M blocks completed"
    var completed = state.progress.completed_count;
    var total = state.progress.total_blocks;
    progressIndicator.textContent = completed + '/' + total + ' completed';
    progressIndicator.style.display = '';

    // Update prerequisite chips if a block is selected
    if (state.blockSlug && state.blocks && state.blocks[state.blockSlug]) {
      renderPrerequisiteChips(state.blockSlug);
    }
  }

  /**
   * Render prerequisite chips for a given block slug.
   */
  function renderPrerequisiteChips(slug) {
    if (!state.blocks || !state.blocks[slug]) return;

    var block = state.blocks[slug];
    var prereqs = block.prerequisites || [];

    if (!prereqs.length) return;

    // Remove old chips section
    var oldSection = document.getElementById('prerequisiteChips');
    if (oldSection) oldSection.remove();

    var container = document.createElement('div');
    container.id = 'prerequisiteChips';

    var label = document.createElement('div');
    label.className = 'body-sm';
    label.style.cssText = 'color: var(--ink-mute); margin-bottom: 8px;';
    label.textContent = 'Prerequisites:';
    container.appendChild(label);

    var chipsDiv = document.createElement('div');
    chipsDiv.className = 'prerequisite-chips';

    prereqs.forEach(function (prereqSlug) {
      var chip = document.createElement('span');
      chip.className = 'prerequisite-chip';

      var prereqBlock = state.blocks[prereqSlug];
      var labelText = prereqBlock ? prereqBlock.title : prereqSlug;

      // Check if this prerequisite is mastered
      if (state.progress && state.progress.blocks && state.progress.blocks[prereqSlug]) {
        var pstatus = state.progress.blocks[prereqSlug].status;
        if (pstatus === 'mastered') {
          chip.classList.add('prerequisite-chip-done');
        }
      }

      chip.textContent = labelText.toUpperCase();
      chipsDiv.appendChild(chip);
    });

    container.appendChild(chipsDiv);

    // Insert after nav bar reference point
    var welcomeMsg = conversation.querySelector('[data-message="welcome"]');
    if (welcomeMsg) {
      welcomeMsg.parentNode.insertBefore(container, welcomeMsg.nextSibling);
    } else {
      conversation.insertBefore(container, conversation.firstChild);
    }
  }

  // === Message Rendering ===

  function addUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user-message';
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = '<p>' + escapeHtml(text) + '</p>';
    msgDiv.appendChild(content);
    conversation.appendChild(msgDiv);
  }

  function addAgentMessage(htmlContent) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message agent-message';

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

  function selectBlock(slug) {
    state.blockSlug = slug || null;

    // Update active tab
    const tabs = navTabs.querySelectorAll('.nav-tab');
    tabs.forEach(function (tab) {
      const isActive = tab.dataset.block === (slug || '');
      tab.classList.toggle('nav-tab-active', isActive);
      tab.setAttribute('data-active', isActive ? 'true' : 'false');
    });

    // Remove old context messages and chips
    removeContextMessages();
    var oldChips = document.getElementById('prerequisiteChips');
    if (oldChips) oldChips.remove();

    if (slug && state.blocks && state.blocks[slug]) {
      addBlockContextMessage(state.blocks[slug]);
      renderPrerequisiteChips(slug);
    }

    state.history = [];
    inputField.focus();
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: state.username,
          message: message,
          block_slug: state.blockSlug,
          history: state.history.slice(0, -1),
        }),
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

  // === Username Overlay ===

  function hideOverlay() {
    overlay.classList.add('hidden');
    // Restore focus to input
    setTimeout(function () { inputField.focus(); }, 250);
  }

  function handleUsernameSubmit(e) {
    e.preventDefault();
    var name = usernameInput.value.trim();
    if (!name) return;

    state.username = name;
    navUser.textContent = name;

    // Store in localStorage
    try {
      localStorage.setItem('nat-username', name);
    } catch (_) { /* ignore */ }

    hideOverlay();

    // Load blocks and progress
    loadBlocks();
    loadProgress();
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

    try {
      localStorage.setItem('nat-theme', newTheme);
    } catch (_) { /* ignore */ }
  });

  // === Init ===

  // Restore theme preference
  try {
    const savedTheme = localStorage.getItem('nat-theme');
    if (savedTheme === 'eye-protection' || savedTheme === 'standard') {
      state.theme = savedTheme;
      document.documentElement.setAttribute('data-theme', savedTheme);
      const options = modeToggle.querySelectorAll('.mode-option');
      if (savedTheme === 'standard') {
        options[0].classList.remove('active');
        options[1].classList.add('active');
      }
    }
  } catch (_) { /* ignore */ }

  // Check for saved username
  try {
    var savedUsername = localStorage.getItem('nat-username');
    if (savedUsername) {
      state.username = savedUsername;
      navUser.textContent = savedUsername;
      hideOverlay();
      loadBlocks();
      loadProgress();
    }
  } catch (_) { /* ignore */ }

  // Focus username input if overlay visible
  if (!overlay.classList.contains('hidden')) {
    usernameInput.focus();
  }

  // Export for debugging
  window.__NAT = { state };

})();