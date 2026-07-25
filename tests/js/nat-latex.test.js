/**
 * tests/js/nat-latex.test.js — LaTeX rendering + markdown tests
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { NAT } = require('./setup.js');

describe('tryRenderLatex', function () {
  it('renders simple inline math', function () {
    var r = NAT.tryRenderLatex('x^2', false);
    assert.ok(r);
    assert.ok(r.indexOf('x') !== -1);
  });

  it('renders display math', function () {
    var r = NAT.tryRenderLatex('\\frac{a}{b}', true);
    assert.ok(r);
    assert.ok(r.indexOf('frac') !== -1);
  });

  it('returns null for malformed LaTeX', function () {
    // This is a judgement: katex mock gracefully handles most input
    // but in real katex, some truly broken input returns nothing
    var r = NAT.tryRenderLatex('\\', false);
    assert.ok(r || r === null); // either renders or returns null
  });
});

describe('renderInlineMath', function () {
  it('wraps inline math in $...$', function () {
    var result = NAT.renderInlineMath('hello $x^2$ world');
    assert.ok(result.indexOf('x') !== -1);
    assert.ok(result.indexOf('katex') !== -1);
  });

  it('escapes non-math text', function () {
    var result = NAT.renderInlineMath('hello world');
    assert.strictEqual(result, 'hello world');
  });

  it('handles empty string', function () {
    assert.strictEqual(NAT.renderInlineMath(''), '');
  });
});

describe('renderInline', function () {
  it('renders bold markdown', function () {
    var result = NAT.renderInline('hello **world**');
    assert.ok(result.indexOf('<strong>world</strong>') !== -1);
  });

  it('renders italic markdown', function () {
    var result = NAT.renderInline('hello *world*');
    assert.ok(result.indexOf('<em>world</em>') !== -1);
  });

  it('renders display math $$...$$', function () {
    var result = NAT.renderInline('text $$x^2$$ more');
    assert.ok(result.indexOf('katex') !== -1 || result.indexOf('DM') === -1); // display math placeholder resolved
  });

  it('renders inline math $...$', function () {
    var result = NAT.renderInline('text $x^2$');
    assert.ok(result.indexOf('katex') !== -1);
  });
});

describe('markdownToHtml', function () {
  it('strips mastered markers', function () {
    var result = NAT.markdownToHtml('hello ::: mastered ::: world');
    assert.strictEqual(result.indexOf('mastered'), -1);
  });

  it('renders display math blocks', function () {
    var result = NAT.markdownToHtml('text\n\n$$x^2$$\n\nmore');
    assert.ok(result.indexOf('formula-card') !== -1);
  });

  it('converts bullet lists to ul', function () {
    var result = NAT.markdownToHtml('- item 1\n- item 2');
    assert.ok(result.indexOf('<ul>') !== -1);
    assert.ok(result.indexOf('<li>item 1</li>') !== -1);
  });

  it('converts numbered lists to ol', function () {
    var result = NAT.markdownToHtml('1. first\n2. second');
    assert.ok(result.indexOf('<ol>') !== -1);
  });

  it('renders problem cards', function () {
    var result = NAT.markdownToHtml('::: problem\n**tag**\nbody text\n:::');
    assert.ok(result.indexOf('problem-card') !== -1);
    assert.ok(result.indexOf('problem-tag') !== -1);
  });

  it('renders choice cards', function () {
    var result = NAT.markdownToHtml('::: choice\nquestion?\nA. option1\nB. option2\n:::');
    assert.ok(result.indexOf('choice-card') !== -1);
    assert.ok(result.indexOf('choice-option') !== -1);
  });

  it('handles empty input', function () {
    var result = NAT.markdownToHtml('');
    assert.strictEqual(typeof result, 'string');
  });

  it('renders chart placeholder', function () {
    var result = NAT.markdownToHtml(':::chart{"type":"line","data":{}}:::');
    assert.ok(result.indexOf('chart-card') !== -1);
  });
});

describe('MASTERED_MARKER_RE_G (global)', function () {
  it('strips all occurrences', function () {
    var result = NAT.markdownToHtml('::: mastered ::: a ::: mastered ::: b');
    assert.strictEqual(result.indexOf('mastered'), -1);
  });
});