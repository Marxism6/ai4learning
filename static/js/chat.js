/**
 * Numerical Analysis Tutor — Chat Application Logic
 *
 * Block selector dropdown, settings panel with lang/theme/memory,
 * history archive + viewer, i18n, KaTeX, charts.
 */
(function () {
  'use strict';

  var I18N = {
    zh: {
      brand:'数值分析辅导', chatTab:'对话', welcomeTitle:'欢迎使用数值分析辅导工具',
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
    },
    en: {
      brand:'NUMERICAL ANALYSIS TUTOR', chatTab:'CHAT',
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
      apiKeyLabel:'API Key', apiBaseLabel:'API Base URL', modeEye:'EYE', modeStd:'STD',
      memTitle:'Cross-session memory', langTitle:'Switch language', modeTitle:'Toggle color mode',
      langLabel:'Language', themeLabel:'Theme', historyTitle:'History (click to resume)',
      historyButtonTitle:'History', clearHistory:'Clear History', confirmClear:'Clear all history?',
      viewingHistory:'Viewing history', backToCurrent:'Back to current', emptyHistory:'No history',
      historyPreview:function(n,p){return n+' messages - '+p+'...';},
      invalidUsername:'Username may only contain letters, digits, spaces, and . _ -',
    },
  };

  var MASTERED_MARKER_RE = /:::\s*mastered\s*:::/i;
  var MASTERED_MARKER_RE_G = /:::\s*mastered\s*:::/gi;

  var state = {
    username: null, history: [], isLoading: false, theme: 'eye-protection',
    blockSlug: null, blocks: null, progress: null,
    memoryEnabled: false, memoryInjected: false, lang: 'zh', viewingHistory: false,
  };

  // DOM refs
  var overlay=document.getElementById('usernameOverlay'), usernameForm=document.getElementById('usernameForm'),
      usernameInput=document.getElementById('usernameInput'), usernameError=document.getElementById('usernameError'), conversation=document.getElementById('conversation'),
      inputField=document.getElementById('inputField'), sendButton=document.getElementById('sendButton'),
      navUser=document.getElementById('navUser'), progressIndicator=document.getElementById('progressIndicator'),
      newConvButton=document.getElementById('newConvButton'), uploadButton=document.getElementById('uploadButton'),
      fileInput=document.getElementById('fileInput'), scrollAnchor=document.getElementById('scrollAnchor'),
      blockStatus=document.getElementById('blockStatus'), blockStatusBody=document.getElementById('blockStatusBody'),
      blockStatusHeader=document.getElementById('blockStatusHeader'),
      settingsButton=document.getElementById('settingsButton'), settingsOverlay=document.getElementById('settingsOverlay'),
      apiKeyInput=document.getElementById('apiKeyInput'), modelInput=document.getElementById('modelInput'),
      modelList=document.getElementById('modelList'), apiBaseInput=document.getElementById('apiBaseInput'),
      settingsSave=document.getElementById('settingsSave'), settingsClose=document.getElementById('settingsClose'),
      detectModelsBtn=document.getElementById('detectModels'),
      blockSelectorBtn=document.getElementById('blockSelectorBtn'), blockSelectorLabel=document.getElementById('blockSelectorLabel'),
      blockSelectorMenu=document.getElementById('blockSelectorMenu'),
      settingsLangToggle=document.getElementById('settingsLangToggle'), settingsThemeToggle=document.getElementById('settingsThemeToggle'),
      settingsMemoryCheck=document.getElementById('settingsMemoryCheck'),
      historyOverlay=document.getElementById('historyOverlay'), historyList=document.getElementById('historyList'),
      historyButton=document.getElementById('historyButton'), historyClose=document.getElementById('historyClose'),
      clearHistoryBtn=document.getElementById('clearHistoryBtn'), historyViewBar=document.getElementById('historyViewBar'),
      historyBackBtn=document.getElementById('historyBackBtn'),
      mathKeyboardBtn=document.getElementById('mathKeyboardBtn'), mathPalette=document.getElementById('mathPalette'),
      inputPreview=document.getElementById('inputPreview');

  // === i18n ===
  function t(k){return I18N[state.lang][k]||k;}
  function templateFn(k){var f=I18N[state.lang][k];return typeof f==='function'?f:function(){return f||k;};}
  function applyLanguage(){
    document.documentElement.lang=state.lang;
    document.querySelectorAll('[data-i18n]').forEach(function(el){var k=el.dataset.i18n;if(I18N[state.lang][k])el.textContent=t(k);});
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){el.placeholder=t(el.dataset.i18nPlaceholder);});
    document.querySelectorAll('[data-i18n-title]').forEach(function(el){el.title=t(el.dataset.i18nTitle);});
    document.querySelectorAll('[data-i18n-aria]').forEach(function(el){el.setAttribute('aria-label',t(el.dataset.i18nAria));});
    var brand=document.getElementById('navBrand'); if(brand)brand.textContent=t('brand');
    renderBlockMenu();
    renderBlockStatusChips();
    detectModelsBtn.textContent=t('detectModels');
    // Sync settings toggle active
    syncSettingsLangUI();
    syncSettingsThemeUI();
    syncSettingsMemoryUI();
    // Re-render block context
    var ctx=conversation.querySelector('[data-message="context"]');
    if(ctx&&state.blockSlug&&state.blocks&&state.blocks[state.blockSlug]){ctx.remove();addBlockContextMessage(state.blocks[state.blockSlug]);}
    updateBlockSelectorLabel();
  }

  // === Settings panel — new controls moved from nav ===
  function syncSettingsLangUI(){
    var btns=settingsLangToggle.querySelectorAll('.settings-option');
    btns.forEach(function(b){b.classList.toggle('active',b.dataset.lang===state.lang);});
  }
  function syncSettingsThemeUI(){
    var btns=settingsThemeToggle.querySelectorAll('.settings-option');
    btns.forEach(function(b){b.classList.toggle('active',b.dataset.theme===state.theme);});
  }
  function syncSettingsMemoryUI(){
    settingsMemoryCheck.checked=state.memoryEnabled;
  }

  settingsLangToggle.addEventListener('click',function(e){
    var btn=e.target.closest('.settings-option'); if(!btn||!btn.dataset.lang)return;
    state.lang=btn.dataset.lang; lsSet('lang',state.lang); applyLanguage();
  });
  settingsThemeToggle.addEventListener('click',function(e){
    var btn=e.target.closest('.settings-option'); if(!btn||!btn.dataset.theme)return;
    state.theme=btn.dataset.theme;
    document.documentElement.setAttribute('data-theme',state.theme);
    lsSet('theme',state.theme); syncSettingsThemeUI();
  });
  settingsMemoryCheck.addEventListener('change',function(){
    state.memoryEnabled=settingsMemoryCheck.checked;
    lsSet('memory',state.memoryEnabled?'1':'0');
  });

  // === Settings panel core ===
  function loadSettings(){apiKeyInput.value=lsGet('api-key','');modelInput.value=lsGet('model','');apiBaseInput.value=lsGet('api-base','');}
  function saveSettings(){lsSet('api-key',apiKeyInput.value.trim());lsSet('model',modelInput.value.trim());lsSet('api-base',apiBaseInput.value.trim());}
  function openSettings(){loadSettings();settingsOverlay.style.display='flex';syncSettingsLangUI();syncSettingsThemeUI();syncSettingsMemoryUI();if(apiKeyInput.value.trim()&&modelList.children.length===0)detectModelsBtn.click();}
  function closeSettings(){settingsOverlay.style.display='none';}
  settingsButton.addEventListener('click',openSettings);
  settingsClose.addEventListener('click',closeSettings);
  settingsSave.addEventListener('click',function(){saveSettings();closeSettings();});
  settingsOverlay.addEventListener('click',function(e){if(e.target===settingsOverlay)closeSettings();});

  // === History overlay ===
  function openHistory(){historyOverlay.style.display='flex';renderHistoryList();}
  function closeHistory(){historyOverlay.style.display='none';}
  historyButton.addEventListener('click',openHistory);
  historyClose.addEventListener('click',closeHistory);
  historyOverlay.addEventListener('click',function(e){if(e.target===historyOverlay)closeHistory();});

  // === API Headers ===
  function buildApiHeaders(extra){var h=extra||{};h['Content-Type']='application/json';var ak=lsGet('api-key',''),m=lsGet('model',''),ab=lsGet('api-base','');if(ak)h['X-API-Key']=ak;if(m)h['X-Model']=m;if(ab)h['X-API-Base']=ab;return h;}

  // === Model Detection ===
  detectModelsBtn.addEventListener('click',async function(){
    detectModelsBtn.disabled=true;detectModelsBtn.textContent=t('detectModelsActive');
    try{
      var res=await fetch('/api/models',{headers:buildApiHeaders({})});
      if(!res.ok)throw new Error((await res.json()).detail||res.statusText);
      var data=await res.json();modelList.innerHTML='';
      data.models.forEach(function(m){var o=document.createElement('option');o.value=m;modelList.appendChild(o);});
      if(!modelInput.value&&data.models.length>0)modelInput.value=data.models[0];
      detectModelsBtn.textContent=templateFn('detectModelsDone')(data.models.length);
    }catch(err){addErrorMessage(t('errorPrefix')+err.message);detectModelsBtn.textContent=t('detectModelsFail');}
    setTimeout(function(){detectModelsBtn.disabled=false;detectModelsBtn.textContent=t('detectModels');},2000);
  });

  // === Helpers ===
  var USERNAME_RE=/^[\w\u4e00-\u9fa5 .\-]+$/;
  function localName(b){return(state.lang==='zh'&&b.title_zh)?b.title_zh:b.title;}
  function sortedBlocks(){return Object.values(state.blocks).sort(function(a,b){if(a.topic!==b.topic)return a.topic.localeCompare(b.topic);return a.title.localeCompare(b.title);});}
  function renderMathEl(el){if(window.renderMathInElement)try{window.renderMathInElement(el,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});}catch(e){}}
  function maybeBuildMemory(){if(state.memoryEnabled&&!state.memoryInjected){var m=buildMemorySummary();if(m){state.memoryInjected=true;return m;}}return '';}

  // === Helpers ===
  function isApiKeyError(msg){return /api[_ ]?key/i.test(msg||'');}
  function escapeHtml(s){var d=document.createElement('div');d.appendChild(document.createTextNode(s));return d.innerHTML;}
  function scrollToBottom(){if(scrollAnchor)scrollAnchor.scrollIntoView({behavior:'smooth',block:'end'});}
  const SP='nat-'; // localStorage prefix
  function lsGet(k,f){try{var v=localStorage.getItem(SP+k);return v!==null?v:f;}catch(_){return f;}}
  function lsSet(k,v){try{localStorage.setItem(SP+k,v);}catch(_){}}
  function lsRemove(k){try{localStorage.removeItem(SP+k);}catch(_){}}
  function lsGetJSON(k,f){try{var v=localStorage.getItem(SP+k);return v?JSON.parse(v):f;}catch(_){return f;}}
  function lsSetJSON(k,v){try{localStorage.setItem(SP+k,JSON.stringify(v));}catch(_){}}

  // === Session ===
  function saveSession(){if(!state.username)return;lsSetJSON('session-'+state.username,{history:state.history,blockSlug:state.blockSlug});}
  function restoreSession(){
    if(!state.username)return false;var s=lsGetJSON('session-'+state.username,null);if(!s||!s.history||!s.history.length)return false;
    state.history=s.history;state.blockSlug=s.blockSlug||null;
    var w=conversation.querySelector('[data-message="welcome"]');if(w)w.style.display='none';
    state.history.forEach(function(m){if(m.role==='user')addUserMessage(m.content,true);else if(m.role==='assistant')addAgentMessage(markdownToHtml(m.content),true);});
    updateBlockSelectorLabel();setTimeout(initCharts,50);return true;
  }

  // === Archive + History ===
  function archiveCurrentSession(){
    if(!state.history.length||!state.username)return;
    var key='history-'+state.username;var list=lsGetJSON(key,[]);
    var block=state.blockSlug&&state.blocks?state.blocks[state.blockSlug]:null;
    var preview='';for(var i=0;i<state.history.length;i++){if(state.history[i].role==='assistant'){preview=(state.history[i].content||'').slice(0,60);break;}}
    list.unshift({
      id:String(Date.now()),timestamp:new Date().toISOString(),
      blockSlug:state.blockSlug,
      blockTitle:block?localName(block):t('chatTab'),
      messageCount:state.history.length,preview:preview,history:state.history,
    });
    if(list.length>50)list=list.slice(0,50);lsSetJSON(key,list);
  }

  function renderHistoryList(){
    if(!state.username){historyList.innerHTML='<p class="body-sm" style="color:var(--ink-faint);padding:12px;">'+t('emptyHistory')+'</p>';return;}
    var key='history-'+state.username;var list=lsGetJSON(key,[]);
    if(!list.length){historyList.innerHTML='<p class="body-sm" style="color:var(--ink-faint);padding:12px;">'+t('emptyHistory')+'</p>';return;}
    historyList.innerHTML='';var sorted=list.slice().reverse();
    sorted.forEach(function(entry,i){
      var card=document.createElement('div');card.className='history-entry';
      var date=entry.timestamp?new Date(entry.timestamp).toLocaleString():'';
      var preview=templateFn('historyPreview')(entry.messageCount,entry.preview.slice(0,60));
      card.innerHTML='<div class="history-entry-header"><span class="history-entry-block">'+escapeHtml(entry.blockTitle||'')+'</span><span class="history-entry-date">'+escapeHtml(date)+'</span></div>'+
        '<div class="history-entry-preview">'+escapeHtml(preview)+'</div>';
      card.addEventListener('click',function(){viewHistory(entry);});
      historyList.appendChild(card);
    });
  }

  function viewHistory(entry){
    closeHistory();
    // Load entry as active session, remove from archive
    state.history=entry.history.slice();
    state.blockSlug=entry.blockSlug||null;
    state.viewingHistory=false;
    var key='history-'+state.username;
    var list=lsGetJSON(key,[]).filter(function(e){return e.id!==entry.id;});
    lsSetJSON(key,list);
    // Re-render conversation
    conversation.querySelectorAll('.message').forEach(function(el){if(el.dataset.message!=='welcome')el.remove();});
    var w=conversation.querySelector('[data-message="welcome"]');if(w)w.style.display='none';
    state.history.forEach(function(m){
      if(m.role==='user')addUserMessage(m.content,true);
      else if(m.role==='assistant')addAgentMessage(markdownToHtml(m.content),true);
    });
    inputField.disabled=false;sendButton.disabled=false;uploadButton.disabled=false;
    historyViewBar.style.display='none';
    updateBlockSelectorLabel();saveSession();scrollToBottom();inputField.focus();
  }

  // exitHistoryView removed — history entries now load as active sessions
  clearHistoryBtn.addEventListener('click',function(){
    if(!confirm(t('confirmClear')))return;
    lsRemove('history-'+state.username);renderHistoryList();
  });

  function newConversation(){
    archiveCurrentSession();
    state.history=[];state.blockSlug=null;state.memoryInjected=false;state.viewingHistory=false;
    inputField.disabled=false;sendButton.disabled=false;uploadButton.disabled=false;
    historyViewBar.style.display='none';
    saveSession();lsRemove('session-'+state.username);
    conversation.querySelectorAll('.message').forEach(function(el){if(el.dataset.message!=='welcome')el.remove();});
    var w=conversation.querySelector('[data-message="welcome"]');if(w)w.style.display='';
    updateBlockSelectorLabel();inputField.focus();
  }

  // === Memory ===
  function buildMemorySummary(){
    if(!state.progress||!state.progress.blocks)return'';
    var m=[];for(var s in state.progress.blocks){var b=state.progress.blocks[s];if(b.status==='mastered'&&b.mastery_level>0)m.push(s+' ('+b.mastery_level+')');}
    return m.length?m.join(', '):'';
  }

  // === Block Selector Dropdown (J1) ===
  function renderBlockMenu(){
    if(!state.blocks){blockSelectorMenu.innerHTML='';return;}
    blockSelectorMenu.innerHTML='';
    var chatItem=document.createElement('button');
    chatItem.className='block-menu-item'+(state.blockSlug?'':' active');
    chatItem.textContent=t('chatTab');
    chatItem.addEventListener('click',function(){selectBlock(null);closeBlockMenu();});
    blockSelectorMenu.appendChild(chatItem);
    sortedBlocks().forEach(function(block){
      var item=document.createElement('button');
      item.className='block-menu-item'+(state.blockSlug===block.slug?' active':'');
      var name=localName(block);
      item.textContent=name;
      item.addEventListener('click',function(){selectBlock(block.slug);closeBlockMenu();});
      blockSelectorMenu.appendChild(item);
    });
  }

  function closeBlockMenu(){blockSelectorMenu.style.display='none';}
  function toggleBlockMenu(){blockSelectorMenu.style.display=(blockSelectorMenu.style.display==='block')?'none':'block';renderBlockMenu();}
  blockSelectorBtn.addEventListener('click',toggleBlockMenu);
  document.addEventListener('click',function(e){if(!blockSelectorBtn.contains(e.target)&&!blockSelectorMenu.contains(e.target))closeBlockMenu();});

  function updateBlockSelectorLabel(){
    if(!state.blockSlug||!state.blocks||!state.blocks[state.blockSlug]){blockSelectorLabel.textContent=t('chatTab');return;}
    var block=state.blocks[state.blockSlug];
    blockSelectorLabel.textContent=localName(block);
  }

  // === LaTeX ===
  function tryRenderLatex(l,d){try{return katex.renderToString(l,{displayMode:d,throwOnError:false,strict:false});}catch(e){return null;}}
  function renderInline(text){var dm=[];var s=text.replace(/\$\$([\s\S]+?)\$\$/g,function(_,m){var i=dm.length;dm.push(m.trim());return '\x00DM'+i+'\x00';});s=renderInlineMath(s);s=s.replace(/\x00DM(\d+)\x00/g,function(_,i){var n=parseInt(i);return tryRenderLatex(dm[n],true)||escapeHtml('$$'+dm[n]+'$$');});s=s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');s=s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,'<em>$1</em>');return s;}
  function renderInlineMath(t){
    if(!t.trim())return'';const p=[];const rx=/(?<!\$)\$(?!\$)([^$]+?)(?<!\$)\$(?!\$)/g;var li=0,m;
    while((m=rx.exec(t))!==null){if(m.index>li)p.push(escapeHtml(t.slice(li,m.index)));var r=tryRenderLatex(m[1],false);p.push(r||escapeHtml('$'+m[1]+'$'));li=rx.lastIndex;}
    if(li<t.length)p.push(escapeHtml(t.slice(li)));return p.join('');
  }
  var chartCounter=0;

  // === Math Keyboard ===
  var MATH_SYMBOLS = {
    greek:['α','β','γ','δ','ε','ζ','η','θ','λ','μ','π','ρ','σ','τ','φ','ω','Γ','Δ','Θ','Λ','Π','Σ','Φ','Ψ','Ω'],
    operators:['±','×','÷','√','∞','≈','≠','≤','≥','∝','∂','∇','∫','∑','∏','∈','⊂','∪','∩','→','⇒','↔'],
    latex:[
      {label:'x²',insert:'$x^2$'},{label:'xᵢ',insert:'$x_i$'},{label:'a/b',insert:'$\\frac{a}{b}$'},
      {label:'∫ᵃᵇ',insert:'$\\int_a^b f(x)\\,dx$'},{label:'Σ',insert:'$\\sum_{i=1}^{n}$'},
      {label:'lim',insert:'$\\lim_{x \\to a}$'},{label:'√x',insert:'$\\sqrt{x}$'},
      {label:'矩阵',insert:'$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$'},
      {label:"f'(x)",insert:"$f'(x)$"},{label:'eˣ',insert:'$e^x$'},
    ],
  };

  var mathPaletteTab='greek';

  function renderMathPalette(){
    mathPalette.innerHTML='';
    var groups=[
      {key:'greek',title:t('mathGreek'), items:MATH_SYMBOLS.greek.map(function(s){return{label:s,insert:s};})},
      {key:'ops',title:t('mathOps'), items:MATH_SYMBOLS.operators.map(function(s){return{label:s,insert:s};})},
      {key:'latex',title:'LaTeX', items:MATH_SYMBOLS.latex},
    ];
    // Tab bar
    var tabBar=document.createElement('div');tabBar.className='math-palette-tabs';
    groups.forEach(function(g){
      var tab=document.createElement('button');tab.className='math-palette-tab'+(mathPaletteTab===g.key?' active':'');
      tab.textContent=g.title;
      tab.addEventListener('click',function(e){e.stopPropagation();mathPaletteTab=g.key;renderMathPalette();});
      tabBar.appendChild(tab);
    });
    mathPalette.appendChild(tabBar);
    // Only render active group
    var active=groups.filter(function(g){return g.key===mathPaletteTab;})[0];
    var grid=document.createElement('div');grid.className='math-palette-grid';
    active.items.forEach(function(item){
      var btn=document.createElement('button');btn.className='math-sym-btn';btn.textContent=item.label;
      btn.addEventListener('click',function(){insertAtCursor(item.insert);});
      grid.appendChild(btn);
    });
    mathPalette.appendChild(grid);
  }

  function insertAtCursor(text){
    var start=inputField.selectionStart,end=inputField.selectionEnd,val=inputField.value;
    inputField.value=val.slice(0,start)+text+val.slice(end);
    inputField.selectionStart=inputField.selectionEnd=start+text.length;
    inputField.focus();updateInputPreview();closeMathPalette();
  }

  function toggleMathPalette(){
    if(mathPalette.style.display==='block'){mathPalette.style.display='none';return;}
    renderMathPalette();mathPalette.style.display='block';
  }
  function closeMathPalette(){mathPalette.style.display='none';}

  mathKeyboardBtn.addEventListener('click',function(e){e.stopPropagation();toggleMathPalette();});
  document.addEventListener('click',function(e){if(e.target!==mathKeyboardBtn&&!mathPalette.contains(e.target))closeMathPalette();});

  function updateInputPreview(){
    var val=inputField.value;
    if(/\$|\*\*/.test(val)){inputPreview.innerHTML=renderInline(val);inputPreview.style.display='';}
    else{inputPreview.style.display='none';}
  }
  inputField.addEventListener('input',updateInputPreview);

  function markdownToHtml(md){
    md=md.replace(MASTERED_MARKER_RE_G,'');
    var mathB=[];var proc=md.replace(/\$\$([\s\S]*?)\$\$/g,function(_,m){var i=mathB.length;mathB.push(m.trim());return'\x00MATH'+i+'\x00';});
    var probB=[];proc=proc.replace(/::: problem\s*\n([\s\S]*?):::/g,function(_,c){var i=probB.length;probB.push(c.trim());return'\x00PROB'+i+'\x00';});
    var chartB=[];proc=proc.replace(/:::chart\{(.+?)\}:::/g,function(_,j){var i=chartB.length;chartB.push(j);return'\x00CHART'+i+'\x00';});
    var choiceB=[];proc=proc.replace(/::: choice\s*\n([\s\S]*?):::/g,function(_,c){var i=choiceB.length;choiceB.push(c.trim());return'\x00CHOICE'+i+'\x00';});
    var lines=proc.split('\n'),html=[],inL=false;
    for(var i=0;i<lines.length;i++){var tr=lines[i].trim();if(!tr){if(inL){html.push('</ul>');inL=false;}continue;}
      if(tr.match(/^[-*+]\s+/)){if(!inL){html.push('<ul>');inL=true;}html.push('<li>'+renderInline(tr.replace(/^[-*+]\s+/,''))+'</li>');continue;}
      if(tr.match(/^\d+\.\s+/)){if(!inL){html.push('<ol>');inL=true;}html.push('<li>'+renderInline(tr.replace(/^\d+\.\s+/,''))+'</li>');continue;}
      if(inL){html.push('</ul>');inL=false;}html.push('<p>'+renderInline(lines[i])+'</p>');
    }if(inL)html.push('</ul>');
    var h=html.join('\n');
    h=h.replace(/\x00MATH(\d+)\x00/g,function(_,i){var m=mathB[parseInt(i)],r=tryRenderLatex(m,true);return'<div class="formula-card">'+(r||escapeHtml('$$'+m+'$$'))+'</div>';});
    h=h.replace(/\x00PROB(\d+)\x00/g,function(_,i){var c=probB[parseInt(i)],ls=c.split('\n'),hd=ls[0].trim(),bd=ls.slice(1).filter(function(l){return l.trim();}),tag='',mm=hd.match(/^\*\*(.+?)\*\*/);if(mm)tag=mm[1];var bH=bd.map(function(l){return'<p>'+renderInlineMath(l)+'</p>';}).join('\n');var hH=renderInlineMath(hd);return'<div class="problem-card" data-problem="">'+(tag?'<div class="problem-tag">'+escapeHtml(tag)+'</div>':'')+'<div class="problem-body">'+(tag?'':'<p>'+hH+'</p>')+bH+'</div></div>';});
    h=h.replace(/\x00CHART(\d+)\x00/g,function(_,i){var cid='chart-'+(++chartCounter),js=chartB[parseInt(i)];return'<div class="formula-card chart-card" data-chart="'+escapeHtml(js)+'" id="'+cid+'"><canvas></canvas></div>';});
    h=h.replace(/\x00CHOICE(\d+)\x00/g,function(_,i){var raw=choiceB[parseInt(i)],restored=raw.replace(/\x00MATH(\d+)\x00/g,function(_,mi){var m=mathB[parseInt(mi)],r=tryRenderLatex(m,true);return r||escapeHtml('$$'+m+'$$');}),ls=restored.split('\n').filter(function(l){return l.trim();}),q=ls[0],opts=ls.slice(1).filter(function(l){return/^[A-D]\.\s+/.test(l.trim());}),qH=renderInline(q),optH=opts.map(function(o){var l=o.trim().match(/^([A-D])\.\s+/)[1],t=o.trim().replace(/^[A-D]\.\s+/,'');return'<button class="choice-option" data-choice="'+l+'"><span class="choice-label">'+l+'</span><span class="choice-text">'+renderInline(t)+'</span></button>';}).join('');return'<div class="choice-card"><div class="choice-question">'+qH+'</div><div class="choice-options">'+optH+'</div></div>';});
    return h;
  }

  // === Progress ===
  async function loadProgress(){if(!state.username)return;try{var r=await fetch('/api/progress/'+encodeURIComponent(state.username));if(!r.ok){console.warn('loadProgress status',r.status);return;}state.progress=await r.json();updateProgressUI();}catch(e){console.error('loadProgress',e);}}
  function updateProgressUI(){if(!state.progress)return;progressIndicator.textContent=state.progress.completed_count+'/'+state.progress.total_blocks;progressIndicator.style.display='';renderBlockStatusChips();}

  function renderBlockStatusChips(){
    if(!state.progress||!state.blocks)return;blockStatus.style.display='';
    blockStatusBody.innerHTML='';
    sortedBlocks().forEach(function(bd){var b=state.progress.blocks[bd.slug],st=b?b.status:'not-started',chip=document.createElement('button');chip.className='block-status-chip '+st;chip.dataset.slug=bd.slug;
      if(st==='mastered'){var ck=document.createElement('span');ck.textContent='✓';ck.style.fontWeight='600';chip.appendChild(ck);}
      var lbl=document.createElement('span');lbl.textContent=localName(bd).toUpperCase();chip.appendChild(lbl);
      if(st==='in-progress'){var dot=document.createElement('span');dot.className='chip-dot';chip.appendChild(dot);}
      chip.addEventListener('click',function(){if(bd.slug!==state.blockSlug)selectBlock(bd.slug);});blockStatusBody.appendChild(chip);});
  }
  blockStatusHeader.addEventListener('click',function(){blockStatus.classList.toggle('is-open');});

  // === Charts ===
  function initCharts(){conversation.querySelectorAll('.chart-card').forEach(function(card){if(card.dataset.chartInitialized)return;card.dataset.chartInitialized='1';var js=card.dataset.chart;if(!js)return;try{var cfg=JSON.parse(js),cv=card.querySelector('canvas');if(!cv)return;var ac=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#1a5c5c',im=getComputedStyle(document.documentElement).getPropertyValue('--ink-mute').trim()||'#6b6560';if(cfg.data&&cfg.data.datasets)cfg.data.datasets.forEach(function(ds){if(!ds.borderColor)ds.borderColor=ac;if(!ds.backgroundColor)ds.backgroundColor=ac+'33';if(!ds.pointBackgroundColor)ds.pointBackgroundColor=ac;if(!ds.pointBorderColor)ds.pointBorderColor='#fff';if(ds.tension==null)ds.tension=0.3;});if(!cfg.options)cfg.options={};cfg.options.responsive=true;cfg.options.maintainAspectRatio=true;if(!cfg.options.scales)cfg.options.scales={x:{grid:{color:im+'22'},ticks:{color:im}},y:{grid:{color:im+'22'},ticks:{color:im}}};new Chart(cv,cfg);}catch(e){card.innerHTML='<p class="error-message" style="padding:12px;">'+escapeHtml(t('chartRenderError'))+'</p>';}});}

  // === Progress Write ===
  async function writeProgress(slug,st,ml){if(!state.username)return;try{var b={block_slug:slug};if(st)b.status=st;if(ml!=null)b.mastery_level=ml;var r=await fetch('/api/progress/'+encodeURIComponent(state.username),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});if(!r.ok){console.warn('writeProgress status',r.status);return;}state.progress=await r.json();updateProgressUI();}catch(e){console.error('writeProgress',e);}}

  // === Messages ===
  function addUserMessage(t,noAnimation){var m=document.createElement('div');m.className='message user-message';if(noAnimation)m.style.animation='none';var c=document.createElement('div');c.className='message-content';c.innerHTML='<p>'+escapeHtml(t)+'</p>';m.appendChild(c);conversation.appendChild(m);}
  function addAgentMessage(html,noAnimation){var m=document.createElement('div');m.className='message agent-message';if(noAnimation)m.style.animation='none';var c=document.createElement('div');c.className='message-content';c.innerHTML=html;m.appendChild(c);conversation.appendChild(m);renderMathEl(c)}
  function setTypingIndicator(v){var ind=document.getElementById('typingIndicator');if(v){if(!ind){ind=document.createElement('div');ind.id='typingIndicator';ind.className='message agent-message';ind.style.animation='none';ind.innerHTML='<div class="message-content"><div class="typing-indicator"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div></div>';conversation.appendChild(ind);}}else{if(ind)ind.remove();}scrollToBottom();}
  function addErrorMessage(t){var m=document.createElement('div');m.className='message agent-message';var c=document.createElement('div');c.className='message-content';c.innerHTML='<p class="error-message">'+escapeHtml(t)+'</p>';m.appendChild(c);conversation.appendChild(m);scrollToBottom();}
  function addBlockContextMessage(block){var m=document.createElement('div');m.className='message agent-message';m.dataset.message='context';var c=document.createElement('div');c.className='message-content';var lbl=localName(block).toUpperCase();var desc=(state.lang==='zh'&&block.description_zh)?block.description_zh:block.description;c.innerHTML='<div class="knowledge-tag" style="margin-bottom:8px;">'+escapeHtml(lbl)+'</div><p><strong>'+escapeHtml(lbl)+'</strong> — '+escapeHtml(desc)+'</p><p style="font-size:15px;color:var(--ink-mute);margin-top:8px;">'+escapeHtml(t('welcomeTitle'))+'</p>';m.appendChild(c);conversation.appendChild(m);scrollToBottom();}
  function removeContextMessages(){conversation.querySelectorAll('[data-message="context"]').forEach(function(el){el.remove();});}

  // === Block selection ===
  function selectBlock(slug){
    state.blockSlug=slug||null;removeContextMessages();
    if(slug&&state.blocks&&state.blocks[slug])addBlockContextMessage(state.blocks[slug]);
    state.history=[];saveSession();updateBlockSelectorLabel();inputField.focus();closeBlockMenu();
    if(slug)startBlockAssessment(slug);
  }

  async function startBlockAssessment(slug){
    if(state.isLoading)return;state.isLoading=true;inputField.disabled=true;sendButton.disabled=true;setTypingIndicator(true);
    var mem=maybeBuildMemory();
    var msg=state.lang==='zh'?'[SYSTEM] 学生选择了知识块：'+slug+'。请开始主动评估。':'[SYSTEM] Student selected block: '+slug+'. Begin proactive assessment.';
    try{
      var r=await fetch('/api/chat',{method:'POST',headers:buildApiHeaders({}),body:JSON.stringify({username:state.username,message:msg,block_slug:slug,history:[],memory_summary:mem,lang:state.lang})});
      setTypingIndicator(false);
      if(!r.ok){var ed=await r.json().catch(function(){return{};});if(r.status===502&&ed.detail&&isApiKeyError(ed.detail)){addErrorMessage(t('noKeyError'));openSettings();if(apiKeyInput)apiKeyInput.focus();return;}throw new Error(t('assessmentFailed')+': '+(ed.detail||r.status));}
      var data=await r.json(),reply=data.reply,html=markdownToHtml(reply);
      addAgentMessage(html);state.history.push({role:'assistant',content:reply});saveSession();initCharts();
      if(state.blockSlug&&MASTERED_MARKER_RE.test(reply))writeProgress(state.blockSlug,'mastered',3);
    }catch(err){setTypingIndicator(false);addErrorMessage(t('errorPrefix')+err.message);if(isApiKeyError(err.message))openSettings();}
    finally{state.isLoading=false;inputField.disabled=false;sendButton.disabled=false;scrollToBottom();}
  }

  // === API ===
  async function sendMessage(message){
    if(state.isLoading)return;state.isLoading=true;inputField.disabled=true;sendButton.disabled=true;
    addUserMessage(message);state.history.push({role:'user',content:message});scrollToBottom();setTypingIndicator(true);
    var mem=maybeBuildMemory();
    try{
      var body={username:state.username,message:message,block_slug:state.blockSlug,history:state.history.slice(0,-1),lang:state.lang};if(mem)body.memory_summary=mem;
      var r=await fetch('/api/chat',{method:'POST',headers:buildApiHeaders({}),body:JSON.stringify(body)});
      if(!r.ok){var ed=await r.json().catch(function(){return{};});if(r.status===502&&ed.detail&&isApiKeyError(ed.detail)){addErrorMessage(t('noKeyError'));openSettings();if(apiKeyInput)apiKeyInput.focus();return;}throw new Error(t('serverError')+': '+(ed.detail||r.status));}
      var data=await r.json(),reply=data.reply;setTypingIndicator(false);
      var html=markdownToHtml(reply);addAgentMessage(html);state.history.push({role:'assistant',content:reply});saveSession();initCharts();
      if(state.blockSlug){if(state.history.filter(function(m){return m.role==='user';}).length===1)writeProgress(state.blockSlug,'in-progress');if(MASTERED_MARKER_RE.test(reply))writeProgress(state.blockSlug,'mastered',3);}
    }catch(err){setTypingIndicator(false);addErrorMessage(t('errorPrefix')+err.message);if(isApiKeyError(err.message))openSettings();}
    finally{state.isLoading=false;inputField.disabled=false;sendButton.disabled=false;inputField.focus();scrollToBottom();}
  }

  // === Choice Click Handler ===
  conversation.addEventListener('click',function(e){
    var btn=e.target.closest('.choice-option');
    if(!btn||state.isLoading)return;
    var label=btn.dataset.choice;
    var card=btn.closest('.choice-card');
    card.querySelectorAll('.choice-option').forEach(function(o){o.disabled=true;if(o===btn)o.classList.add('selected');});
    sendMessage(t('choiceIChoose')+' '+label);
  });

  // === Events ===
  function handleSend(){var m=inputField.value.trim();if(!m||state.isLoading)return;inputField.value='';sendMessage(m);}
  inputField.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}});
  sendButton.addEventListener('click',handleSend);
  uploadButton.addEventListener('click',function(){if(!state.isLoading)fileInput.click();});
  fileInput.addEventListener('change',async function(){
    var file=fileInput.files[0];if(!file)return;fileInput.value='';
    if(file.size>10*1024*1024){addErrorMessage(t('errorPrefix')+t('fileTooLarge'));return;}
    if(['image/png','image/jpeg','image/webp'].indexOf(file.type)===-1){addErrorMessage(t('errorPrefix')+t('unsupportedFormat'));return;}
    if(state.isLoading)return;state.isLoading=true;inputField.disabled=true;sendButton.disabled=true;uploadButton.disabled=true;
    var ind=document.createElement('div');ind.id='uploadIndicator';ind.className='message agent-message';ind.style.animation='none';
    ind.innerHTML='<div class="message-content"><p class="body-sm" style="color:var(--ink-mute);">'+escapeHtml(t('analyzingImg'))+'</p></div>';conversation.appendChild(ind);scrollToBottom();
    try{
      var fd=new FormData();fd.append('file',file);fd.append('username',state.username);fd.append('lang',state.lang);if(state.blockSlug)fd.append('block_slug',state.blockSlug);
      var xh={};var ak=lsGet('api-key',''),mo=lsGet('model',''),ab=lsGet('api-base','');if(ak)xh['X-API-Key']=ak;if(mo)xh['X-Model']=mo;if(ab)xh['X-API-Base']=ab;
      var r=await fetch('/api/upload',{method:'POST',headers:xh,body:fd});ind.remove();
      if(!r.ok){var ed=await r.json().catch(function(){return{};});throw new Error(t('uploadFailed')+': '+(ed.detail||r.status));}
      var data=await r.json(),rec=data.recognized_text;
      var pm=document.createElement('div');pm.className='message agent-message';pm.style.animation='none';var pc=document.createElement('div');pc.className='message-content';
      pc.innerHTML='<div class="knowledge-tag" style="margin-bottom:8px;">'+escapeHtml(t('recognizedProblem'))+'</div>';
      var bd=document.createElement('div');bd.className='problem-body';bd.innerHTML=markdownToHtml(rec);pc.appendChild(bd);pm.appendChild(pc);conversation.appendChild(pm);
      if(window.renderMathInElement)try{window.renderMathInElement(pc,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});}catch(e){}
      state.history.push({role:'assistant',content:rec});saveSession();
    }catch(err){var ui=document.getElementById('uploadIndicator');if(ui)ui.remove();addErrorMessage(t('errorPrefix')+err.message);}
    finally{state.isLoading=false;inputField.disabled=false;sendButton.disabled=false;uploadButton.disabled=false;inputField.focus();scrollToBottom();}
  });
  newConvButton.addEventListener('click',newConversation);

  // === Blocks ===
  async function loadBlocks(){try{var r=await fetch('/api/blocks');if(!r.ok)throw Error('Failed');state.blocks=await r.json();renderBlockMenu();renderBlockStatusChips();}catch(e){console.error('loadBlocks',e);}}

  // === Username ===
  function hideOverlay(){overlay.classList.add('hidden');setTimeout(function(){inputField.focus();},250);}
  function onUserLogin(name){state.username=name;navUser.textContent=name;lsSet('username',name);hideOverlay();loadBlocks();loadProgress();restoreSession();newConvButton.style.display='';}
  usernameForm.addEventListener('submit',function(e){e.preventDefault();usernameError.style.display='none';var n=usernameInput.value.trim();if(!n)return;if(!USERNAME_RE.test(n)){usernameError.textContent=t('invalidUsername');usernameError.style.display='';return;}onUserLogin(n);});

  // === Init ===
  var savedTheme=lsGet('theme','eye-protection');
  if(savedTheme==='eye-protection'||savedTheme==='standard'){state.theme=savedTheme;document.documentElement.setAttribute('data-theme',savedTheme);}
  state.lang=lsGet('lang','zh');applyLanguage();
  state.memoryEnabled=lsGet('memory','0')==='1';
  var savedUsername=lsGet('username',null);if(savedUsername)onUserLogin(savedUsername);else usernameInput.focus();

  function updateFormulaOverflow(){conversation.querySelectorAll('.formula-card').forEach(function(c){c.classList.toggle('is-overflowing',c.scrollWidth>c.clientWidth);});}
  new MutationObserver(updateFormulaOverflow).observe(conversation,{childList:true,subtree:true});
  window.addEventListener('resize',updateFormulaOverflow);
})();