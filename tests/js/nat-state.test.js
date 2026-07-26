/**
 * tests/js/nat-state.test.js — History, message, and state management tests
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { NAT } = require('./setup.js');

describe('rollbackUserMessage', function () {
  beforeEach(function () {
    NAT.state.history = [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'hi' }];
    NAT.state.username = 'testuser';
  });

  it('pops last message from history', function () {
    assert.strictEqual(NAT.state.history.length, 2);
    NAT.rollbackUserMessage(null);
    assert.strictEqual(NAT.state.history.length, 1);
    assert.strictEqual(NAT.state.history[0].role, 'user');
  });

  it('removes DOM element when provided', function () {
    var el = document.createElement('div');
    document.body.appendChild(el);
    assert.ok(document.body.contains(el));
    NAT.rollbackUserMessage(el);
    assert.strictEqual(document.body.contains(el), false);
  });

  it('handles missing DOM element gracefully', function () {
    assert.doesNotThrow(function () {
      NAT.rollbackUserMessage(null);
    });
    assert.doesNotThrow(function () {
      NAT.rollbackUserMessage(undefined);
    });
  });
});

describe('addUserMessage', function () {
  it('returns a DOM element', function () {
    var el = NAT.addUserMessage('test message');
    assert.ok(el instanceof window.HTMLElement);
    assert.ok(el.classList.contains('user-message'));
  });

  it('adds message to conversation', function () {
    var before = NAT.els.conversation.children.length;
    NAT.addUserMessage('test');
    assert.strictEqual(NAT.els.conversation.children.length, before + 1);
  });

  it('escapes HTML in content', function () {
    var el = NAT.addUserMessage('<b>bold</b>');
    assert.ok(el.innerHTML.indexOf('&lt;b&gt;') !== -1);
  });
});

describe('addErrorMessage', function () {
  it('adds error message to conversation', function () {
    var before = NAT.els.conversation.children.length;
    NAT.addErrorMessage('test error');
    assert.strictEqual(NAT.els.conversation.children.length, before + 1);
  });

  it('error message has error-message class', function () {
    NAT.addErrorMessage('test');
    var msgs = NAT.els.conversation.querySelectorAll('.error-message');
    assert.ok(msgs.length >= 1);
  });
});

describe('setTypingIndicator', function () {
  it('creates indicator on true', function () {
    NAT.setTypingIndicator(true);
    var ind = document.getElementById('typingIndicator');
    assert.ok(ind);
    assert.ok(ind.querySelector('.typing-indicator'));
  });

  it('removes indicator on false', function () {
    NAT.setTypingIndicator(true);
    NAT.setTypingIndicator(false);
    assert.strictEqual(document.getElementById('typingIndicator'), null);
  });
});

describe('archiveCurrentSession', function () {
  beforeEach(function () {
    NAT.state.username = 'testuser';
    NAT.state.history = [
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'this is the answer with a long text' },
    ];
    NAT.state.blockSlug = 'newton';
    NAT.state.blocks = { newton: { title: 'Newton', title_zh: '牛顿法' } };
    // Reset storage
    NAT.lsRemove('history-testuser');
  });

  it('saves session to localStorage', function () {
    NAT.archiveCurrentSession();
    var list = NAT.lsGetJSON('history-testuser', []);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].blockSlug, 'newton');
    assert.strictEqual(list[0].messageCount, 2);
    assert.strictEqual(list[0].preview, 'this is the answer with a long text'.slice(0, 60));
  });

  it('does not archive empty history', function () {
    NAT.state.history = [];
    NAT.archiveCurrentSession();
    var list = NAT.lsGetJSON('history-testuser', []);
    assert.strictEqual(list.length, 0);
  });

  it('does not archive without username', function () {
    NAT.state.username = null;
    NAT.state.history = [{ role: 'user', content: 'x' }];
    NAT.archiveCurrentSession();
    var list = NAT.lsGetJSON('history-testuser', []);
    assert.strictEqual(list.length, 0);
  });
});

describe('i18n', function () {
  it('t() returns zh text by default', function () {
    NAT.state.lang = 'zh';
    assert.strictEqual(NAT.t('brand'), '数值分析辅导');
  });

  it('t() returns en text when lang=en', function () {
    NAT.state.lang = 'en';
    assert.strictEqual(NAT.t('brand'), 'NUMERICAL ANALYSIS TUTOR');
  });

  it('t() returns key for missing key', function () {
    assert.strictEqual(NAT.t('nonexistent'), 'nonexistent');
  });

  it('emptyUsername exists in both languages', function () {
    NAT.state.lang = 'zh';
    assert.strictEqual(NAT.t('emptyUsername'), '请输入用户名');
    NAT.state.lang = 'en';
    assert.strictEqual(NAT.t('emptyUsername'), 'Please enter a username');
  });
});

describe('historyPreview template', function () {
  it('zh template formats correctly', function () {
    NAT.state.lang = 'zh';
    assert.strictEqual(NAT.templateFn('historyPreview')(3, 'abc'), '3 条消息 - abc...');
  });
  it('en template formats correctly', function () {
    NAT.state.lang = 'en';
    assert.strictEqual(NAT.templateFn('historyPreview')(5, 'xyz'), '5 messages - xyz...');
  });
});

describe('applyLanguage DOM updates', function () {
  it('updates title element', function () {
    NAT.state.lang = 'zh';
    NAT.applyLanguage();
    var t = document.querySelector('title');
    assert.strictEqual(t.textContent, '数值分析辅导');
  });

  it('updates title in English', function () {
    NAT.state.lang = 'en';
    NAT.applyLanguage();
    var t = document.querySelector('title');
    assert.strictEqual(t.textContent, 'Numerical Analysis Tutor');
  });
});

describe('removeContextMessages', function () {
  it('removes all context messages', function () {
    var m = document.createElement('div');
    m.className = 'message';
    m.dataset.message = 'context';
    NAT.els.conversation.appendChild(m);
    NAT.removeContextMessages();
    assert.strictEqual(NAT.els.conversation.querySelectorAll('[data-message="context"]').length, 0);
  });
});

describe('buildApiHeaders', function () {
  beforeEach(function () {
    NAT.state.apiKey = 'sk-test';
    NAT.state.model = 'deepseek';
    NAT.state.apiBase = 'https://api.example.com';
  });

  it('sets Content-Type', function () {
    var h = NAT.buildApiHeaders({});
    assert.strictEqual(h['Content-Type'], 'application/json');
  });

  it('includes stored API key', function () {
    var h = NAT.buildApiHeaders({});
    assert.strictEqual(h['X-API-Key'], 'sk-test');
  });

  it('includes stored model', function () {
    var h = NAT.buildApiHeaders({});
    assert.strictEqual(h['X-Model'], 'deepseek');
  });

  it('merges extra headers', function () {
    var h = NAT.buildApiHeaders({ 'X-Custom': 'foo' });
    assert.strictEqual(h['X-Custom'], 'foo');
  });
});

describe('maybeBuildMemory', function () {
  beforeEach(function () {
    NAT.state.progress = {
      blocks: { newton: { status: 'mastered', mastery_level: 3 }, bisect: { status: 'in-progress' } },
    };
    NAT.state.memoryEnabled = true;
    NAT.state.memoryInjected = false;
  });

  it('includes mastered blocks in summary', function () {
    var m = NAT.maybeBuildMemory();
    assert.ok(m.indexOf('newton') !== -1);
    assert.ok(m.indexOf('3') !== -1);
  });

  it('excludes in-progress blocks', function () {
    var m = NAT.maybeBuildMemory();
    assert.strictEqual(m.indexOf('bisect'), -1);
  });

  it('returns empty when memory disabled', function () {
    NAT.state.memoryEnabled = false;
    assert.strictEqual(NAT.maybeBuildMemory(), '');
  });

  it('only injects once', function () {
    NAT.maybeBuildMemory();
    assert.strictEqual(NAT.state.memoryInjected, true);
    assert.strictEqual(NAT.maybeBuildMemory(), '');
  });
});