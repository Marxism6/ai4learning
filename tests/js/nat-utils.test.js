/**
 * tests/js/nat-utils.test.js — Utility function tests
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { NAT } = require('./setup.js');

describe('escapeHtml', function () {
  it('escapes HTML special chars', function () {
    assert.strictEqual(NAT.escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert("x")&lt;/script&gt;');
  });
  it('preserves safe text', function () {
    assert.strictEqual(NAT.escapeHtml('hello world'), 'hello world');
  });
  it('escapes ampersand', function () {
    assert.strictEqual(NAT.escapeHtml('a & b'), 'a &amp; b');
  });
  it('handles empty string', function () {
    assert.strictEqual(NAT.escapeHtml(''), '');
  });
});

describe('isApiKeyError', function () {
  it('detects "api key" in message', function () {
    assert.strictEqual(NAT.isApiKeyError('API key is missing'), true);
  });
  it('detects "api_key" variant', function () {
    assert.strictEqual(NAT.isApiKeyError('api_key not found'), true);
  });
  it('rejects unrelated messages', function () {
    assert.strictEqual(NAT.isApiKeyError('server error'), false);
  });
  it('handles null/undefined', function () {
    assert.strictEqual(NAT.isApiKeyError(null), false);
    assert.strictEqual(NAT.isApiKeyError(undefined), false);
    assert.strictEqual(NAT.isApiKeyError(''), false);
  });
});

describe('localName', function () {
  var blockZH = { title: 'Newton\'s Method', title_zh: '牛顿法' };
  var blockEN = { title: 'Fixed Point Iteration' };

  it('returns zh title when lang=zh', function () {
    NAT.state.lang = 'zh';
    assert.strictEqual(NAT.localName(blockZH), '牛顿法');
  });
  it('returns en title when lang=en', function () {
    NAT.state.lang = 'en';
    assert.strictEqual(NAT.localName(blockZH), "Newton's Method");
  });
  it('falls back to en title when no zh', function () {
    NAT.state.lang = 'zh';
    assert.strictEqual(NAT.localName(blockEN), 'Fixed Point Iteration');
  });
});

describe('USERNAME_RE', function () {
  it('accepts Chinese + English + digits', function () {
    assert.ok(NAT.USERNAME_RE.test('张三abc123'));
  });
  it('accepts dots and underscores', function () {
    assert.ok(NAT.USERNAME_RE.test('user.name_test'));
  });
  it('rejects forward slash', function () {
    assert.strictEqual(NAT.USERNAME_RE.test('user/name'), false);
  });
  it('rejects angle brackets (XSS)', function () {
    assert.strictEqual(NAT.USERNAME_RE.test('<script>'), false);
  });
  it('accepts spaces', function () {
    assert.ok(NAT.USERNAME_RE.test('Zhang San'));
  });
});

describe('MASTERED_MARKER_RE', function () {
  it('detects mastered marker', function () {
    assert.ok(NAT.MASTERED_MARKER_RE.test('something ::: mastered ::: end'));
  });
  it('case insensitive', function () {
    assert.ok(NAT.MASTERED_MARKER_RE.test('::: MASTERED :::'));
  });
  it('rejects non-marker text', function () {
    assert.strictEqual(NAT.MASTERED_MARKER_RE.test('hello world'), false);
  });
});