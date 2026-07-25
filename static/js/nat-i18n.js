/**
 * nat-i18n.js — Internationalization (extends window.NAT).
 * Must load after nat.js.
 */
(function (N) {
  'use strict';

  N.I18N = {
    zh: {
      pageTitle:'数值分析辅导', brand:'数值分析辅导', chatTab:'对话', welcomeTitle:'欢迎使用数值分析辅导工具',
      welcomeBody:'我将通过苏格拉底式引导帮助你掌握数值方法。从顶部选择一个知识块，或直接输入你的问题。',
      inputPlaceholder:'输入你的答案或问题...', newConv:'+ 新对话', newConvTitle:'新对话',
      memLabel:'跨会话记忆', blockStatus:'学习进度', uploadTitle:'上传题目截图',
      sendLabel:'发送消息', notStarted:'未开始', inProgress:'进行中', mastered:'已掌握',
      usernamePrompt:'输入你的名字开始学习。进度按用户保存。', usernamePlaceholder:'你的名字',
      startButton:'开始', settingsTitle:'设置', modelLabel:'模型', settingsSave:'保存',
      settingsClose:'关闭',
      settingsHint:'Key 仅存储在你的浏览器本地，不会上传到任何服务器。',
      detectModels:'检测可用模型', detectModelsActive:'检测中...',
      detectModelsDone:function(n){return'已找到 '+n+' 个模型';}, detectModelsFail:'检测失败',
      analyzingImg:'正在分析图片...', errorPrefix:'错误：',
      noKeyError:'API Key 未配置。请在设置面板中输入 API Key。',
      mathKeyboardTitle:'数学键盘', mathGreek:'希腊字母', mathOps:'运算符',
      choiceIChoose:'我选',
      chartRenderError:'图表渲染错误', fileTooLarge:'文件过大，最大 10 MB',
      unsupportedFormat:'不支持的格式，请使用 PNG, JPG, WEBP',
      assessmentFailed:'评估请求失败', serverError:'服务器错误', uploadFailed:'上传失败',
      recognizedProblem:'题目识别结果',
      apiKeyLabel:'API Key', apiBaseLabel:'API 地址', modeEye:'护眼', modeStd:'标准',
      memTitle:'跨会话记忆', langTitle:'切换语言', modeTitle:'切换颜色模式',
      langLabel:'语言', themeLabel:'主题', historyTitle:'历史对话（点击继续）',
      historyButtonTitle:'历史记录', clearHistory:'清空历史', confirmClear:'确定清空所有历史吗？',
      viewingHistory:'正在查看历史对话', backToCurrent:'返回当前对话', emptyHistory:'暂无历史对话',
      historyPreview:function(n,p){return n+' 条消息 - '+p+'...';},
      invalidUsername:'用户名只能包含中英文、数字、空格和 . _ -',
      emptyUsername:'请输入用户名',
    },
    en: {
      pageTitle:'Numerical Analysis Tutor', brand:'NUMERICAL ANALYSIS TUTOR', chatTab:'CHAT',
      welcomeTitle:'Welcome to the Numerical Analysis Tutor',
      welcomeBody:"I'm here to help you master numerical methods through guided Socratic dialogue.",
      inputPlaceholder:'Type your answer or question...', newConv:'+ NEW', newConvTitle:'New Conversation',
      memLabel:'Memory', blockStatus:'BLOCK STATUS', uploadTitle:'Upload problem screenshot',
      sendLabel:'Send message', notStarted:'Not started', inProgress:'In progress', mastered:'Mastered',
      usernamePrompt:'Enter your name to begin. Progress is saved per user.',
      usernamePlaceholder:'Your name', startButton:'Start', settingsTitle:'Settings',
      modelLabel:'Model', settingsSave:'Save', settingsClose:'Close',
      settingsHint:'Your API key is stored locally in your browser and never sent to any server.',
      detectModels:'Detect Models', detectModelsActive:'Detecting...',
      detectModelsDone:function(n){return n+' models found';}, detectModelsFail:'Detection failed',
      analyzingImg:'Analyzing image...', errorPrefix:'Error: ',
      noKeyError:'API Key not configured. Please enter your API Key in Settings.',
      mathKeyboardTitle:'Math keyboard', mathGreek:'Greek', mathOps:'Operators',
      choiceIChoose:'I choose',
      chartRenderError:'Chart rendering error', fileTooLarge:'File too large. Max 10 MB.',
      unsupportedFormat:'Unsupported format. Use PNG, JPG, WEBP.',
      assessmentFailed:'Assessment failed', serverError:'Server error', uploadFailed:'Upload failed',
      recognizedProblem:'RECOGNIZED PROBLEM',
      apiKeyLabel:'API Key', apiBaseLabel:'API Base URL', modeEye:'Eye-care', modeStd:'Standard',
      memTitle:'Cross-session memory', langTitle:'Switch language', modeTitle:'Toggle color mode',
      langLabel:'Language', themeLabel:'Theme', historyTitle:'History (click to resume)',
      historyButtonTitle:'History', clearHistory:'Clear History', confirmClear:'Clear all history?',
      viewingHistory:'Viewing history', backToCurrent:'Back to current', emptyHistory:'No history',
      historyPreview:function(n,p){return n+' messages - '+p+'...';},
      invalidUsername:'Username may only contain letters, digits, spaces, and . _ -',
      emptyUsername:'Please enter a username',
    },
  };

  N.t = function (k) { return N.I18N[N.state.lang][k] || k; };
  N.templateFn = function (k) { var f = N.I18N[N.state.lang][k]; return typeof f === 'function' ? f : function () { return f || k; }; };

  N.applyLanguage = function () {
    document.documentElement.lang = N.state.lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) { var k = el.dataset.i18n; if (N.I18N[N.state.lang][k]) el.textContent = N.t(k); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) { el.placeholder = N.t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.title = N.t(el.dataset.i18nTitle); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', N.t(el.dataset.i18nAria)); });
    var brand = document.getElementById('navBrand'); if (brand) brand.textContent = N.t('brand');
    N.renderBlockMenu();
    N.renderBlockStatusChips();
    N.els.detectModelsBtn.textContent = N.t('detectModels');
    N.syncSettingsLangUI();
    N.syncSettingsThemeUI();
    N.syncSettingsMemoryUI();
    var ctx = N.els.conversation.querySelector('[data-message="context"]');
    if (ctx && N.state.blockSlug && N.state.blocks && N.state.blocks[N.state.blockSlug]) { ctx.remove(); N.addBlockContextMessage(N.state.blocks[N.state.blockSlug]); }
    N.updateBlockSelectorLabel();
  };

})(window.NAT);