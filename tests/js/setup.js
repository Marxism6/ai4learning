/**
 * tests/js/setup.js — JSDOM harness for NAT module tests.
 * Creates a browser-like environment and loads all nat-*.js modules.
 */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Minimal HTML skeleton matching the app's DOM structure
const HTML = `<!DOCTYPE html><html lang="zh" data-theme="eye-protection"><head><meta charset="UTF-8"><title data-i18n="pageTitle">Test</title></head><body>
<div id="usernameOverlay" class="overlay"><form id="usernameForm"><input id="usernameInput"><p id="usernameError" style="display:none"></p></form></div>
<div id="conversation"><div data-message="welcome"></div><div id="scrollAnchor"></div></div>
<input id="inputField"><button id="sendButton"></button>
<span id="navUser"></span><span id="progressIndicator" style="display:none"></span>
<button id="newConvButton" style="display:none"></button>
<button id="uploadButton"></button><input type="file" id="fileInput">
<div id="blockStatus"><div id="blockStatusHeader"></div><div id="blockStatusBody"></div></div>
<button id="settingsButton"></button><div id="settingsOverlay"><input id="apiKeyInput"><input id="modelInput"><datalist id="modelList"></datalist><input id="apiBaseInput"><button id="settingsSave"></button><button id="settingsClose"></button><button id="detectModels"></button><div id="settingsLangToggle"><button class="settings-option" data-lang="zh"></button><button class="settings-option" data-lang="en"></button></div><div id="settingsThemeToggle"><button class="settings-option" data-theme="eye-protection"></button><button class="settings-option" data-theme="standard"></button></div><input type="checkbox" id="settingsMemoryCheck"></div>
<button id="blockSelectorBtn"><span id="blockSelectorLabel"></span></button><div id="blockSelectorMenu"></div>
<div id="historyOverlay"><div id="historyList"></div><button id="historyClose"></button><button id="clearHistoryBtn"></button></div><div id="historyViewBar" style="display:none"><button id="historyBackBtn"></button></div>
<button id="historyButton"></button>
<button id="mathKeyboardBtn"></button><div id="mathPalette"></div>
<div id="inputPreview" style="display:none"></div>
</body></html>`;

const dom = new JSDOM(HTML, {
  url: 'http://localhost:8000',
  runScripts: 'dangerously',
  resources: 'usable',
});

// Expose JSDOM globals to Node
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.customElements = dom.window.customElements;

// Inject katex mock BEFORE loading modules (must be on dom.window)
dom.window.katex = global.katex = {
  renderToString: function (latex, opts) {
    var display = opts && opts.displayMode ? 'katex-display' : '';
    var safe = latex.replace(/[<>&"]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c];
    });
    return '<span class="katex ' + display + '"><span class="katex-html">' + safe + '</span></span>';
  },
};
global.Chart = class {};
dom.window.Element.prototype.scrollIntoView = function () {};
dom.window.HTMLElement.prototype.scrollIntoView = function () {};

// Load modules in dependency order
const JS_DIR = path.join(__dirname, '..', '..', 'static', 'js');
const mods = [
  'nat.js', 'nat-i18n.js', 'nat-settings.js',
  'nat-history.js', 'nat-blocks.js', 'nat-math.js', 'nat-chat.js', 'nat-main.js',
];

// Prevent auto-init on DOMContentLoaded (nat-main.js does this)
let initCalled = false;
const origInit = dom.window.addEventListener.bind(dom.window);
dom.window.addEventListener = function (event, fn) {
  if (event === 'DOMContentLoaded') {
    // Don't auto-init — tests call NAT.init() manually if needed
    return;
  }
  return origInit(event, fn);
};

mods.forEach(function (name) {
  var code = fs.readFileSync(path.join(JS_DIR, name), 'utf-8');
  var script = dom.window.document.createElement('script');
  script.textContent = code;
  dom.window.document.body.appendChild(script);
});

// Expose NAT for tests
module.exports = {
  NAT: dom.window.NAT,
  dom: dom,
};