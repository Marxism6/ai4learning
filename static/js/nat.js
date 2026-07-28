/**
 * nat.js — Core namespace, state, DOM refs, and utility functions.
 * Load first. All other nat-*.js modules extend window.NAT.
 */
window.NAT = (function () {
  'use strict';

  var N = {};

  // ====== State object (shared across all modules) ======
  N.state = {
    username: null, history: [], isLoading: false, theme: 'eye-protection',
    blockSlug: null, blocks: null, progress: null,
    memoryEnabled: false, memModel: '', memoryInjected: false, lang: 'zh', viewingHistory: false, sessionId: '',
    studyMode: 'learn',
    apiKey: '', model: '', apiBase: '',
  };

  // ====== Shared constants ======
  var SP = 'nat-'; // localStorage prefix
  N.PREFIX = SP;
  N.MASTERED_MARKER_RE = /:::\s*mastered\s*:::/i;
  N.MASTERED_MARKER_RE_G = /:::\s*mastered\s*:::/gi;
  N.USERNAME_RE = /^[\w一-龥 .\-]+$/;
  N.chartCounter = 0;

  // ====== DOM refs (gathered once, shared by all modules) ======
  function $(id) { return document.getElementById(id); }
  N.els = {
    overlay: $('usernameOverlay'), usernameForm: $('usernameForm'),
    usernameInput: $('usernameInput'), usernameError: $('usernameError'),
    conversation: $('conversation'), inputField: $('inputField'),
    sendButton: $('sendButton'), navUser: $('navUser'),
    progressIndicator: $('progressIndicator'), newConvButton: $('newConvButton'),
    uploadButton: $('uploadButton'), fileInput: $('fileInput'),
    scrollAnchor: $('scrollAnchor'), blockStatus: $('blockStatus'),
    blockStatusBody: $('blockStatusBody'), blockStatusHeader: $('blockStatusHeader'),
    settingsButton: $('settingsButton'), settingsOverlay: $('settingsOverlay'),
    apiKeyInput: $('apiKeyInput'), modelInput: $('modelInput'),
    modelList: $('modelList'), apiBaseInput: $('apiBaseInput'),
    settingsSave: $('settingsSave'), settingsClose: $('settingsClose'),
    detectModelsBtn: $('detectModels'),
    blockSelectorBtn: $('blockSelectorBtn'), blockSelectorLabel: $('blockSelectorLabel'),
    blockSelectorMenu: $('blockSelectorMenu'),
    settingsLangToggle: $('settingsLangToggle'), settingsThemeToggle: $('settingsThemeToggle'),
    settingsMemoryCheck: $('settingsMemoryCheck'),
    memModelInput: $('memModelInput'),
    historyOverlay: $('historyOverlay'), historyList: $('historyList'),
    historySearchInput: $('historySearchInput'),
    historyButton: $('historyButton'), historyClose: $('historyClose'),
    clearHistoryBtn: $('clearHistoryBtn'), historyViewBar: $('historyViewBar'),
    historyBackBtn: $('historyBackBtn'),
    mathKeyboardBtn: $('mathKeyboardBtn'), mathPalette: $('mathPalette'),
    inputPreview: $('inputPreview'),
    studyModeToggle: $('studyModeToggle'),
  };

  // ====== Utility functions ======
  N.escapeHtml = function (s) { var d = document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; };
  N.scrollToBottom = function () { var a = N.els.scrollAnchor; if (a) a.scrollIntoView({ behavior: 'smooth', block: 'end' }); };
  N.isApiKeyError = function (msg) { return /api[_ ]?key/i.test(msg || ''); };

  N.lsGet = function (k, f) { try { var v = localStorage.getItem(SP + k); return v !== null ? v : f; } catch (_) { return f; } };
  N.lsSet = function (k, v) { try { localStorage.setItem(SP + k, v); } catch (_) {} };
  N.lsRemove = function (k) { try { localStorage.removeItem(SP + k); } catch (_) {} };
  N.lsGetJSON = function (k, f) { try { var v = localStorage.getItem(SP + k); return v ? JSON.parse(v) : f; } catch (_) { return f; } };
  N.lsSetJSON = function (k, v) { try { localStorage.setItem(SP + k, JSON.stringify(v)); } catch (_) {} };

  N.localName = function (b) { return (N.state.lang === 'zh' && b.title_zh) ? b.title_zh : b.title; };
  N.sortedBlocks = function () {
    return Object.values(N.state.blocks).sort(function (a, b) {
      if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
      return a.title.localeCompare(b.title);
    });
  };

  N.renderMathEl = function (el) {
    if (window.renderMathInElement) try { window.renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) {}
  };

  N.maybeBuildMemory = function () {
    if (N.state.memoryEnabled && !N.state.memoryInjected) {
      var m = N.buildMemorySummary();
      if (m) { N.state.memoryInjected = true; return m; }
    }
    return '';
  };

  N.triggerMemoryReview = function (sessionHistory) {
    if (!N.state.memoryEnabled || !N.state.memModel) return;
    var enc = encodeURIComponent(N.state.username);
    var recent = sessionHistory || N.state.history;
    fetch('/api/memory/review/' + enc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mem_model: N.state.memModel,
        mem_key: N.state.apiKey,
        mem_base: N.state.apiBase,
        recent_history: recent,
      }),
    }).catch(function () { /* fire-and-forget, never block UI */ });
  };

  return N;
})();