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
  function _userKey(k) { return k + '-' + N.state.username; }
  N.loadSettings = function () {
    N.els.apiKeyInput.value = N.lsGet(_userKey('api-key'), '');
    N.els.modelInput.value = N.lsGet(_userKey('model'), '');
    N.els.apiBaseInput.value = N.lsGet(_userKey('api-base'), '');
    N.state.apiKey = N.els.apiKeyInput.value;
    N.state.model = N.els.modelInput.value;
    N.state.apiBase = N.els.apiBaseInput.value;
  };
  N.saveSettings = function () {
    N.state.apiKey = N.els.apiKeyInput.value.trim();
    N.state.model = N.els.modelInput.value.trim();
    N.state.apiBase = N.els.apiBaseInput.value.trim();
    N.state.memModel = N.els.memModelInput.value.trim();
    N.lsSet(_userKey('api-key'), N.state.apiKey);
    N.lsSet(_userKey('model'), N.state.model);
    N.lsSet(_userKey('api-base'), N.state.apiBase);
    N.lsSet(_userKey('mem-model'), N.state.memModel);
  };
  N.openSettings = function () {
    if (!N.state.username) return;
    N.loadSettings(); N.closeHistory();
    N.els.settingsOverlay.style.display = 'flex';
    N.syncSettingsLangUI(); N.syncSettingsThemeUI(); N.syncSettingsMemoryUI();
    if (N.els.apiKeyInput.value.trim() && N.els.modelList.children.length === 0) N.els.detectModelsBtn.click();
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
      N.lsSet(_userKey('memory-enable'), N.state.memoryEnabled ? '1' : '0');
      var sec = document.getElementById('settingsMemorySection');
      if (sec) sec.style.display = N.state.memoryEnabled ? '' : 'none';
    });
    N.els.settingsButton.addEventListener('click', N.openSettings);
    N.els.settingsClose.addEventListener('click', N.closeSettings);
    N.els.settingsSave.addEventListener('click', function () { N.saveSettings(); N.closeSettings(); });
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