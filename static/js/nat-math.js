/**
 * nat-math.js — LaTeX rendering, math keyboard, markdown→HTML (extends window.NAT).
 * Must load after nat.js, nat-i18n.js.
 */
(function (N) {
  'use strict';

  // ====== LaTeX rendering ======
  N.tryRenderLatex = function (l, d) { try { return katex.renderToString(l, { displayMode: d, throwOnError: false, strict: false }); } catch (e) { return null; } };
  N.renderInline = function (text) {
    var dm = []; var s = text.replace(/\$\$([\s\S]+?)\$\$/g, function (_, m) { var i = dm.length; dm.push(m.trim()); return '\x00DM' + i + '\x00'; });
    s = N.renderInlineMath(s); s = s.replace(/\x00DM(\d+)\x00/g, function (_, i) { var n = parseInt(i); return N.tryRenderLatex(dm[n], true) || N.escapeHtml('$$' + dm[n] + '$$'); });
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    return s;
  };
  N.renderInlineMath = function (t) {
    if (!t.trim()) return ''; var p = []; var rx = /(?<!\$)\$(?!\$)([^$]+?)(?<!\$)\$(?!\$)/g; var li = 0, m;
    while ((m = rx.exec(t)) !== null) { if (m.index > li) p.push(N.escapeHtml(t.slice(li, m.index))); var r = N.tryRenderLatex(m[1], false); p.push(r || N.escapeHtml('$' + m[1] + '$')); li = rx.lastIndex; }
    if (li < t.length) p.push(N.escapeHtml(t.slice(li))); return p.join('');
  };

  // ====== Math Keyboard ======
  var MATH_SYMBOLS = {
    greek: ['α','β','γ','δ','ε','ζ','η','θ','λ','μ','π','ρ','σ','τ','φ','ω','Γ','Δ','Θ','Λ','Π','Σ','Φ','Ψ','Ω'],
    operators: ['±','×','÷','√','∞','≈','≠','≤','≥','∝','∂','∇','∫','∑','∏','∈','⊂','∪','∩','→','⇒','↔'],
    latex: [
      {label:'x²',insert:'$x^2$'},{label:'xᵢ',insert:'$x_i$'},{label:'a/b',insert:'$\\frac{a}{b}$'},
      {label:'∫ᵃᵇ',insert:'$\\int_a^b f(x)\\,dx$'},{label:'Σ',insert:'$\\sum_{i=1}^{n}$'},
      {label:'lim',insert:'$\\lim_{x \\to a}$'},{label:'√x',insert:'$\\sqrt{x}$'},
      {label:'矩阵',insert:'$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$'},
      {label:"f'(x)",insert:"$f'(x)$"},{label:'eˣ',insert:'$e^x$'},
    ],
  };
  N.mathPaletteTab = 'greek';

  N.renderMathPalette = function () {
    N.els.mathPalette.innerHTML = '';
    var groups = [
      { key: 'greek', title: N.t('mathGreek'), items: MATH_SYMBOLS.greek.map(function (s) { return { label: s, insert: s }; }) },
      { key: 'ops', title: N.t('mathOps'), items: MATH_SYMBOLS.operators.map(function (s) { return { label: s, insert: s }; }) },
      { key: 'latex', title: 'LaTeX', items: MATH_SYMBOLS.latex },
    ];
    var tabBar = document.createElement('div'); tabBar.className = 'math-palette-tabs';
    groups.forEach(function (g) {
      var tab = document.createElement('button'); tab.className = 'math-palette-tab' + (N.mathPaletteTab === g.key ? ' active' : '');
      tab.textContent = g.title;
      tab.addEventListener('click', function (e) { e.stopPropagation(); N.mathPaletteTab = g.key; N.renderMathPalette(); });
      tabBar.appendChild(tab);
    });
    N.els.mathPalette.appendChild(tabBar);
    var active = groups.filter(function (g) { return g.key === N.mathPaletteTab; })[0];
    var grid = document.createElement('div'); grid.className = 'math-palette-grid';
    active.items.forEach(function (item) {
      var btn = document.createElement('button'); btn.className = 'math-sym-btn'; btn.textContent = item.label;
      btn.addEventListener('click', function () { N.insertAtCursor(item.insert); });
      grid.appendChild(btn);
    });
    N.els.mathPalette.appendChild(grid);
  };

  N.insertAtCursor = function (text) {
    var start = N.els.inputField.selectionStart, end = N.els.inputField.selectionEnd, val = N.els.inputField.value;
    N.els.inputField.value = val.slice(0, start) + text + val.slice(end);
    N.els.inputField.selectionStart = N.els.inputField.selectionEnd = start + text.length;
    N.els.inputField.focus(); N.updateInputPreview(); N.closeMathPalette();
  };

  N.toggleMathPalette = function () {
    if (N.els.mathPalette.style.display === 'block') { N.els.mathPalette.style.display = 'none'; return; }
    N.closeBlockMenu(); N.renderMathPalette(); N.els.mathPalette.style.display = 'block';
  };
  N.closeMathPalette = function () { N.els.mathPalette.style.display = 'none'; };

  N.updateInputPreview = function () {
    var val = N.els.inputField.value;
    if (/\$|\*\*/.test(val)) { N.els.inputPreview.innerHTML = N.renderInline(val); N.els.inputPreview.style.display = ''; }
    else { N.els.inputPreview.style.display = 'none'; }
  };

  // ====== Markdown→HTML ======
  N.markdownToHtml = function (md) {
    md = md.replace(N.MASTERED_MARKER_RE_G, '');
    var mathB = []; var proc = md.replace(/\$\$([\s\S]*?)\$\$/g, function (_, m) { var i = mathB.length; mathB.push(m.trim()); return '\x00MATH' + i + '\x00'; });
    var probB = []; proc = proc.replace(/::: problem\s*\n([\s\S]*?):::/g, function (_, c) { var i = probB.length; probB.push(c.trim()); return '\x00PROB' + i + '\x00'; });
    var chartB = []; proc = proc.replace(/:::chart\{(.+?)\}:::/g, function (_, j) { var i = chartB.length; chartB.push(j); return '\x00CHART' + i + '\x00'; });
    var choiceB = []; proc = proc.replace(/::: choice\s*\n([\s\S]*?):::/g, function (_, c) { var i = choiceB.length; choiceB.push(c.trim()); return '\x00CHOICE' + i + '\x00'; });
    var lines = proc.split('\n'), html = [], inL = false;
    for (var i = 0; i < lines.length; i++) { var tr = lines[i].trim(); if (!tr) { if (inL) { html.push('</ul>'); inL = false; } continue; }
      if (tr.match(/^[-*+]\s+/)) { if (!inL) { html.push('<ul>'); inL = true; } html.push('<li>' + N.renderInline(tr.replace(/^[-*+]\s+/, '')) + '</li>'); continue; }
      if (tr.match(/^\d+\.\s+/)) { if (!inL) { html.push('<ol>'); inL = true; } html.push('<li>' + N.renderInline(tr.replace(/^\d+\.\s+/, '')) + '</li>'); continue; }
      if (inL) { html.push('</ul>'); inL = false; } html.push('<p>' + N.renderInline(lines[i]) + '</p>');
    } if (inL) html.push('</ul>');
    var h = html.join('\n');
    h = h.replace(/\x00MATH(\d+)\x00/g, function (_, i) { var m = mathB[parseInt(i)], r = N.tryRenderLatex(m, true); return '<div class="formula-card">' + (r || N.escapeHtml('$$' + m + '$$')) + '</div>'; });
    h = h.replace(/\x00PROB(\d+)\x00/g, function (_, i) { var c = probB[parseInt(i)], ls = c.split('\n'), hd = ls[0].trim(), bd = ls.slice(1).filter(function (l) { return l.trim(); }), tag = '', mm = hd.match(/^\*\*(.+?)\*\*/); if (mm) tag = mm[1]; var bH = bd.map(function (l) { return '<p>' + N.renderInlineMath(l) + '</p>'; }).join('\n'); var hH = N.renderInlineMath(hd); return '<div class="problem-card" data-problem="">' + (tag ? '<div class="problem-tag">' + N.escapeHtml(tag) + '</div>' : '') + '<div class="problem-body">' + (tag ? '' : '<p>' + hH + '</p>') + bH + '</div></div>'; });
    h = h.replace(/\x00CHART(\d+)\x00/g, function (_, i) { var cid = 'chart-' + (++N.chartCounter), js = chartB[parseInt(i)]; return '<div class="formula-card chart-card" data-chart="' + N.escapeHtml(js) + '" id="' + cid + '"><canvas></canvas></div>'; });
    h = h.replace(/\x00CHOICE(\d+)\x00/g, function (_, i) { var raw = choiceB[parseInt(i)], restored = raw.replace(/\x00MATH(\d+)\x00/g, function (_, mi) { var m = mathB[parseInt(mi)], r = N.tryRenderLatex(m, true); return r || N.escapeHtml('$$' + m + '$$'); }), ls = restored.split('\n').filter(function (l) { return l.trim(); }), q = ls[0], opts = ls.slice(1).filter(function (l) { return /^[A-D]\.\s+/.test(l.trim()); }), qH = N.renderInline(q), optH = opts.map(function (o) { var l = o.trim().match(/^([A-D])\.\s+/)[1], t = o.trim().replace(/^[A-D]\.\s+/, ''); return '<button class="choice-option" data-choice="' + l + '"><span class="choice-label">' + l + '</span><span class="choice-text">' + N.renderInline(t) + '</span></button>'; }).join(''); return '<div class="choice-card"><div class="choice-question">' + qH + '</div><div class="choice-options">' + optH + '</div></div>'; });
    return h;
  };

  // ====== Event bindings ======
  N.bindMathEvents = function () {
    N.els.mathKeyboardBtn.addEventListener('click', function (e) { e.stopPropagation(); N.toggleMathPalette(); });
    document.addEventListener('click', function (e) { if (e.target !== N.els.mathKeyboardBtn && !N.els.mathPalette.contains(e.target)) N.closeMathPalette(); });
    N.els.inputField.addEventListener('input', N.updateInputPreview);
  };

})(window.NAT);