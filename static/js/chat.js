/**
 * Numerical Analysis Tutor — Chat Application Logic
 *
 * Handles:
 * - Sending messages to the API
 * - Rendering messages with KaTeX formula support
 * - Mode toggle (eye-protection / standard)
 * - Auto-scroll
 */

(function () {
  'use strict';

  // === State ===
  const state = {
    username: 'student',
    history: [],
    isLoading: false,
    theme: 'eye-protection',
  };

  // === DOM References ===
  const conversation = document.getElementById('conversation');
  const inputField = document.getElementById('inputField');
  const sendButton = document.getElementById('sendButton');
  const modeToggle = document.getElementById('modeToggle');
  const scrollAnchor = document.getElementById('scrollAnchor');

  // === Helpers ===

  /** Escape HTML special chars. */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /** Scroll the chat area to the bottom smoothly. */
  function scrollToBottom() {
    if (scrollAnchor) {
      scrollAnchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  /** OpenAI-compatible streaming is not used in this iteration. */

  // === LaTeX Parsing ===

  /**
   * Extract display math ($$...$$) from text and return an array of segments.
   * Each segment is { type: 'text'|'display-math', content: string }.
   */
  function parseDisplayMath(text) {
    const segments = [];
    const regex = /\$\$([\s\S]*?)\$\$/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      segments.push({ type: 'display-math', content: match[1].trim() });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      segments.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return segments.length > 0 ? segments : [{ type: 'text', content: text }];
  }

  /**
   * Try to render LaTeX with KaTeX; returns HTML string or null on failure.
   */
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

  /**
   * Convert a text segment (which may contain inline $...$ math)
   * into HTML with inline KaTeX rendered.
   */
  function renderInlineMath(text) {
    if (!text.trim()) return '';

    // Split by inline math $...$ (but not $$...$$ which are already handled)
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

  /**
   * Convert markdown text (from agent response) into HTML.
   * Supports: paragraphs, bold, italic, code, lists, display math, inline math.
   */
  function markdownToHtml(markdown) {
    // First, protect display math blocks from markdown processing
    const displayMathBlocks = [];
    let processed = markdown.replace(/\$\$([\s\S]*?)\$\$/g, function (_, math) {
      const idx = displayMathBlocks.length;
      displayMathBlocks.push(math.trim());
      return `\x00MATHBLOCK${idx}\x00`;
    });

    // Process markdown line by line
    const lines = processed.split('\n');
    const htmlLines = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmed = line.trim();

      // Empty line
      if (!trimmed) {
        if (inList) {
          htmlLines.push('</ul>');
          inList = false;
        }
        continue;
      }

      // Unordered list
      if (trimmed.match(/^[-*+]\s+/)) {
        if (!inList) {
          htmlLines.push('<ul>');
          inList = true;
        }
        const itemContent = trimmed.replace(/^[-*+]\s+/, '');
        htmlLines.push(`<li>${renderInlineMath(itemContent)}</li>`);
        continue;
      }

      // Ordered list
      if (trimmed.match(/^\d+\.\s+/)) {
        if (!inList) {
          htmlLines.push('<ol>');
          inList = true;
        }
        const itemContent = trimmed.replace(/^\d+\.\s+/, '');
        htmlLines.push(`<li>${renderInlineMath(itemContent)}</li>`);
        continue;
      }

      // Close list if we were in one
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }

      // Regular paragraph — process inline markdown
      let paragraph = renderInlineMath(line);
      // Bold
      paragraph = paragraph.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Italic
      paragraph = paragraph.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
      htmlLines.push(`<p>${paragraph}</p>`);
    }

    if (inList) {
      htmlLines.push('</ul>');
    }

    let html = htmlLines.join('\n');

    // Restore display math blocks
    html = html.replace(/\x00MATHBLOCK(\d+)\x00/g, function (_, idx) {
      const math = displayMathBlocks[parseInt(idx)];
      const rendered = tryRenderLatex(math, true);
      return `<div class="formula-card">${rendered || escapeHtml('$$' + math + '$$')}</div>`;
    });

    return html;
  }

  // === Message Rendering ===

  /**
   * Create a user message bubble and append to conversation.
   */
  function addUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user-message';
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = `<p>${escapeHtml(text)}</p>`;
    msgDiv.appendChild(content);
    conversation.appendChild(msgDiv);
  }

  /**
   * Create an agent message bubble with markdown + KaTeX rendering.
   */
  function addAgentMessage(htmlContent) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message agent-message';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = htmlContent;

    msgDiv.appendChild(contentDiv);
    conversation.appendChild(msgDiv);

    // Re-render any KaTeX in the message to handle edge cases
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(contentDiv, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
          ],
          throwOnError: false,
        });
      } catch (e) {
        // Silently ignore — we already rendered inline math
      }
    }
  }

  /**
   * Show or hide the typing indicator.
   */
  function setTypingIndicator(visible) {
    let indicator = document.getElementById('typingIndicator');
    if (visible) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'typingIndicator';
        indicator.className = 'message agent-message';
        indicator.innerHTML = `
          <div class="message-content">
            <div class="typing-indicator">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>`;
        conversation.appendChild(indicator);
      }
    } else {
      if (indicator) {
        indicator.remove();
      }
    }
    scrollToBottom();
  }

  /**
   * Show an error message in the conversation.
   */
  function addErrorMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message agent-message';
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = `<p class="error-message">${escapeHtml(text)}</p>`;
    msgDiv.appendChild(content);
    conversation.appendChild(msgDiv);
    scrollToBottom();
  }

  // === API Calls ===

  async function sendMessage(message) {
    if (state.isLoading) return;
    state.isLoading = true;
    inputField.disabled = true;
    sendButton.disabled = true;

    // Add user message immediately
    addUserMessage(message);
    state.history.push({ role: 'user', content: message });
    scrollToBottom();

    // Show typing indicator
    setTypingIndicator(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: state.username,
          message: message,
          block_slug: null,
          history: state.history.slice(0, -1), // history without the new message
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply;

      // Hide typing indicator
      setTypingIndicator(false);

      // Render agent response
      const html = markdownToHtml(reply);
      addAgentMessage(html);

      // Update history
      state.history.push({ role: 'assistant', content: reply });
    } catch (err) {
      setTypingIndicator(false);
      addErrorMessage(`Error: ${err.message}`);
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

    // Store preference
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

  // Focus input on load
  inputField.focus();

  // Export for debugging
  window.__NAT = { state };

})();