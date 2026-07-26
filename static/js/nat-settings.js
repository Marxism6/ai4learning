/**
 * nat-settings.js — Settings panel + model detection (extends window.NAT).
 * Must load after nat.js, nat-i18n.js.
 */
(function (N) {
  'use strict';

  // ====== Settings panel UI sync ======
  N.syncSettingsLangUI = function () {
    var btns = N.els.settingsLangToggle.querySelectorAll('.settings-option');
    btns.forEach(function (b) { b.classList.toggle('active', b.dataset.lang === N.state.lang); });
  };
  N.syncSettingsThemeUI = function () {
    var btns = N.els.settingsThemeToggle.querySelectorAll('.settings-option');
    btns.forEach(function (b) { b.classList.toggle('active', b.dataset.theme === N.state.theme); });
  };
  N.syncSettingsMemoryUI = function () {
    N.els.settingsMemoryCheck.checked = N.state.memoryEnabled;
    var sec = document.getElementById('settingsMemorySection');
    if (sec) sec.style.display = N.state.memoryEnabled ? '' : 'none';
    N.els.memModelInput.value = N.state.memModel || '';
  };

  // ====== Settings panel core ======
  N.loadSettings = async function () {
    try {
      var res = await fetch('/api/settings/' + encodeURIComponent(N.state.username));
      if (!res.ok) throw new Error('Failed to load settings');
      var s = await res.json();
      N.els.apiKeyInput.value = s.api_key || '';
      N.els.modelInput.value = s.model || '';
      N.els.apiBaseInput.value = s.api_base || '';
      N.els.memModelInput.value = s.mem_model || '';
      N.els.settingsMemoryCheck.checked = !!s.memory_enabled;
      N.state.apiKey = s.api_key || '';
      N.state.model = s.model || '';
      N.state.apiBase = s.api_base || '';
      N.state.memoryEnabled = !!s.memory_enabled;
      N.state.memModel = s.mem_model || '';
    } catch (_) {
      // Fallback to empty on error
      N.els.apiKeyInput.value = '';
      N.els.modelInput.value = '';
      N.els.apiBaseInput.value = '';
      N.els.memModelInput.value = '';
      N.els.settingsMemoryCheck.checked = false;
    }
  };
  N.saveSettings = async function () {
    var body = {
      api_key: N.els.apiKeyInput.value.trim(),
      model: N.els.modelInput.value.trim(),
      api_base: N.els.apiBaseInput.value.trim(),
      memory_enabled: N.els.settingsMemoryCheck.checked,
      mem_model: N.els.memModelInput.value.trim(),
    };
    N.state.apiKey = body.api_key;
    N.state.model = body.model;
    N.state.apiBase = body.api_base;
    N.state.memoryEnabled = body.memory_enabled;
    N.state.memModel = body.mem_model;
    try {
      await fetch('/api/settings/' + encodeURIComponent(N.state.username), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (_) { /* fire-and-forget, never block UI */ }
  };
  N.openSettings = function () {
    if (!N.state.username) return;
    N.loadSettings().then(function () {
      N.closeHistory();
      N.els.settingsOverlay.style.display = 'flex';
      N.syncSettingsLangUI(); N.syncSettingsThemeUI(); N.syncSettingsMemoryUI();
      if (N.els.apiKeyInput.value.trim() && N.els.modelList.children.length === 0) N.els.detectModelsBtn.click();
    });
  };
  N.closeSettings = function () { N.els.settingsOverlay.style.display = 'none'; };

  // ====== Model Detection ======
  N.buildApiHeaders = function (extra) {
    var h = extra || {}; h['Content-Type'] = 'application/json';
    if (N.state.apiKey) h['X-API-Key'] = N.state.apiKey;
    if (N.state.model) h['X-Model'] = N.state.model;
    if (N.state.apiBase) h['X-API-Base'] = N.state.apiBase;
    return h;
  };

  // ====== Event bindings (run once, in init phase) ======
  N.bindSettingsEvents = function () {
    N.els.settingsLangToggle.addEventListener('click', function (e) {
      var btn = e.target.closest('.settings-option'); if (!btn || !btn.dataset.lang) return;
      N.state.lang = btn.dataset.lang; N.lsSet('lang', N.state.lang); N.applyLanguage();
    });
    N.els.settingsThemeToggle.addEventListener('click', function (e) {
      var btn = e.target.closest('.settings-option'); if (!btn || !btn.dataset.theme) return;
      N.state.theme = btn.dataset.theme;
      document.documentElement.setAttribute('data-theme', N.state.theme);
      N.lsSet('theme', N.state.theme); N.syncSettingsThemeUI();
    });
    N.els.settingsMemoryCheck.addEventListener('change', function () {
      N.state.memoryEnabled = N.els.settingsMemoryCheck.checked;
      var sec = document.getElementById('settingsMemorySection');
      if (sec) sec.style.display = N.state.memoryEnabled ? '' : 'none';
    });
    N.els.settingsButton.addEventListener('click', N.openSettings);
    N.els.settingsClose.addEventListener('click', N.closeSettings);
    N.els.settingsSave.addEventListener('click', function () { N.saveSettings().then(function () { N.closeSettings(); }); });
    N.els.settingsOverlay.addEventListener('click', function (e) { if (e.target === N.els.settingsOverlay) N.closeSettings(); });
  };

  N.bindModelDetection = function () {
    N.els.detectModelsBtn.addEventListener('click', async function () {
      N.els.detectModelsBtn.disabled = true; N.els.detectModelsBtn.textContent = N.t('detectModelsActive');
      try {
        var res = await fetch('/api/models', { headers: N.buildApiHeaders({}) });
        if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
        var data = await res.json(); N.els.modelList.innerHTML = '';
        data.models.forEach(function (m) { var o = document.createElement('option'); o.value = m; N.els.modelList.appendChild(o); });
        if (!N.els.modelInput.value && data.models.length > 0) N.els.modelInput.value = data.models[0];
        N.els.detectModelsBtn.textContent = N.templateFn('detectModelsDone')(data.models.length);
      } catch (err) { N.addErrorMessage(N.t('errorPrefix') + err.message); N.els.detectModelsBtn.textContent = N.t('detectModelsFail'); }
      setTimeout(function () { N.els.detectModelsBtn.disabled = false; N.els.detectModelsBtn.textContent = N.t('detectModels'); }, 2000);
    });
  };

})(window.NAT);