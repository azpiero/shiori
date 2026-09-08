const boot = performance.now();
const {invoke} = window.__TAURI__.core;
const {listen} = window.__TAURI__.event;
let vault=null, selected='', query='', activeTags=[], theme=localStorage.getItem('theme')||'light', switching=0, hits=0, hit=0, revisionBusy=false, changed=false, composing=false, displayedUrl='';
let graphMode=false,graphPage=0,graphScale=1,graphX=0,graphY=0,currentMatches=[],graphKey=null,hitsQuery='',vaultBusy=false;
const metrics={uiReadyMs:0,scanMs:0,lastSwitchMs:0};
const $=s=>document.querySelector(s);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('#app').innerHTML=`<header class="topbar">
<div class="brand">
<img class="logo" src="assets/shiori-icon.png" alt="" width="31" height="31">
<strong>shiori</strong>
</div>
<div class="actions">
<button id="open" class="primary">フォルダを開く</button>
<button id="theme" title="ダークモード" aria-label="ダークモード" aria-pressed="false">◐</button>
</div>
</header>
<div class="layout">
<nav class="view-nav" aria-label="表示モード">
<button id="showNote" aria-label="ノート表示" title="ノート表示" aria-pressed="true" aria-controls="readerPanel">
<svg viewBox="0 0 24 24" aria-hidden="true">
<path d="M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4"/>
</svg>
</button>
<button id="showGraph" aria-label="タググラフ表示" title="タググラフ表示" aria-pressed="false" aria-controls="graphPanel">
<svg viewBox="0 0 24 24" aria-hidden="true">
<path d="m6 7 12 2-7 10L6 7"/>
<circle cx="6" cy="7" r="3"/>
<circle cx="18" cy="9" r="3"/>
<circle cx="11" cy="19" r="3"/>
</svg>
</button>
</nav>
<aside class="sidebar">
<div class="eyebrow">YOUR LIBRARY</div>
<div class="vault-name">
<span id="vaultName">Sample Vault</span>
<div class="vault-actions">
<button id="reload" title="Vault全体を再読込" aria-label="Vault全体を再読込">↻</button>
</div>
</div>
<div class="vault-path" id="root">
</div>
<details id="readErrors" class="read-errors" hidden>
<summary id="readErrorsSummary">読み取りエラー</summary>
<ul id="readErrorsList"></ul>
</details>
<div class="search">
<input id="search" placeholder="検索 / tag: タグ名" aria-label="ノートとタグを検索" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="tagSuggestions" aria-describedby="searchHelp">
<div id="tagSuggestions" class="tag-suggestions" role="listbox" aria-label="タグ候補" hidden></div>
<span id="searchHelp" class="sr-only">tag: タグ名で完全一致。複数のタグはAND。空白を含むタグは二重引用符で囲みます。候補は上下キーで選び、Enterで確定、Escapeで閉じます。</span>
<span id="suggestionStatus" class="sr-only" role="status"></span>
</div>
<section id="currentNote" class="current-note" aria-label="絞り込み対象外の表示中ノート" hidden>
</section>
<div class="list-head">
<span>NOTES</span>
<span id="results">
</span>
</div>
<div class="notes" id="notes">
</div>
</aside>
<div class="splitter" id="splitter" role="separator" aria-label="サイドバー幅" aria-orientation="vertical">
</div>
<main class="viewer">
<div id="searchNavigation" class="search-navigation" aria-label="本文内の検索" hidden>
<span id="hitCount" aria-live="polite">本文内 0件</span>
<button id="prev" aria-label="前の検索箇所">↑</button>
<button id="next" aria-label="次の検索箇所">↓</button>
</div>
<div class="notice" id="notice">
<span id="noticeText">ファイルが変更されました。再読み込みで反映できます。</span>
<button id="update">更新を反映</button>
</div>
<div id="readerPanel" class="frame-wrap">
<iframe id="noteFrame" sandbox="" referrerpolicy="no-referrer" title="HTMLノート（隔離表示）">
</iframe>
<div id="loading" class="spinner">サンプルを読み込んでいます…</div>
</div>
<section id="graphPanel" hidden>
<div class="graph-toolbar">
<div>
<strong>タグでつながるノート</strong>
<div id="graphSummary" class="graph-summary">
</div>
</div>
<div class="graph-actions">
<button id="graphPrev" aria-label="前のグラフ">←</button>
<button id="graphNext" aria-label="次のグラフ">→</button>
<button id="zoomOut" aria-label="縮小">−</button>
<button id="zoomIn" aria-label="拡大">＋</button>
<button id="graphReset">全体表示</button>
</div>
</div>
<p class="graph-help">大きい点＝タグ · 小さい点＝ノート。タグを選んで絞り込み、ノートを選んで本文へ。ドラッグで移動。点にカーソルを重ねるとタイトルを表示。</p>
<svg id="graphSvg" viewBox="0 0 1000 740" aria-label="タグとノートの関係" role="group">
</svg>
<div id="graphEmpty" class="empty" hidden>一致するノートがありません</div>
</section>
</main>
</div>
<footer class="statusbar">
<span class="read-only" title="HTMLの正本は変更しません。ノート内のJavaScriptと外部資産は制限します。">読み取り専用</span>
<span id="status">準備中</span>
<span id="timing">Tauri + Rust · sandboxed iframe · WKWebView</span>
</footer>`;
function setTheme(){document.documentElement.classList.toggle('theme-dark',theme==='dark');localStorage.setItem('theme',theme);$('#theme').setAttribute('aria-pressed',String(theme==='dark'));}
setTheme();
function status(s){$('#status').textContent=s;}
function noteUrl(path=selected){return `vault://localhost/${vault.token}/${path.split('/').map(encodeURIComponent).join('/')}`;}
function renderList(){
 if(!vault)return;
 const focused=document.activeElement;
 const focusPath=focused?.dataset.path,focusTag=focused?.dataset.tag;
 const focusContainer=focused?.closest('#notes, #currentNote')?.id;
 const matches=ShioriSearch.filter(vault.notes,{text:query,tags:activeTags});
 $('#notes').innerHTML=matches.map(n=>`<article class="note ${n.path===selected?'active':''}"><button class="note-open" title="${escape(n.path)}" aria-label="${escape(n.title)} — ${escape(n.path)}" data-path="${escape(n.path)}" ${n.path===selected?'aria-current="true"':''}><span class="note-title">${escape(n.title)}</span></button><div class="list-note-tags">${n.tags.map(t=>`<button class="note-tag" data-tag="${escape(t)}" title="タググラフを開く: ${escape(t)}" aria-label="タググラフを開く: ${escape(t)}">#${escape(t)} <span aria-hidden="true">↗</span></button>`).join('')||'<span class="untagged">タグなし</span>'}</div></article>`).join('')||'<div class="empty">一致するノートがありません</div>';
 currentMatches=matches;if(graphMode)renderGraph();
 $('#results').textContent=`${matches.length} 件`;
 renderCurrentNote();
 updateHits();
 if(focusContainer){const buttons=$('#'+focusContainer).querySelectorAll('button');[...buttons].find(b=>focusPath!==undefined?b.dataset.path===focusPath:b.dataset.tag===focusTag)?.focus();}
}
function renderCurrentNote(){
 const note=vault?.notes.find(n=>n.path===selected);
 const panel=$('#currentNote');
 panel.hidden=!note||currentMatches.some(n=>n.path===selected);
 panel.innerHTML=panel.hidden?'':`<div class="current-label">表示中 · 絞り込み対象外</div><strong title="${escape(note.path)}" aria-label="${escape(note.title)} — ${escape(note.path)}">${escape(note.title)}</strong><div class="list-note-tags">${note.tags.map(t=>`<button class="note-tag" data-tag="${escape(t)}" aria-label="タググラフを開く: ${escape(t)}">#${escape(t)} ↗</button>`).join('')||'<span class="untagged">タグなし</span>'}</div>`;
}
function selectedInfo(){renderList();}
function activateNoteList(e){
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.path!==undefined)openNote(button.dataset.path);
 else if(button.dataset.tag!==undefined){setTag(button.dataset.tag);setView(true);$('#showGraph').focus();}
}
$('#notes').onclick=activateNoteList;
$('#currentNote').onclick=activateNoteList;
function invalidateGraph(){graphKey=null;graphPage=0;}
function clearNote(){
 selected='';displayedUrl='';hitsQuery='';hits=0;hit=0;
 $('#noteFrame').src='about:blank';$('#loading').classList.add('hidden');
 renderList();updateHits();status('HTMLノートがありません');
}

function openNote(path,anchor=''){
 if(!vault)return;setView(false);selected=path;hit=0;hits=0;hitsQuery='';selectedInfo();switching=performance.now();$('#loading').classList.remove('hidden');
 const u=new URL(noteUrl());u.searchParams.set('theme',theme);u.searchParams.set('q',query.trim());u.searchParams.set('v',vault.revision);u.hash=anchor||(query.trim()?'shiori-hit-0':'');displayedUrl=u.href;$('#noteFrame').src=u.href;
}
$('#noteFrame').addEventListener('load',()=>{$('#loading').classList.add('hidden');metrics.lastSwitchMs=Math.round(performance.now()-switching);$('#timing').textContent=`UI ${metrics.uiReadyMs} ms · scan ${metrics.scanMs} ms · frame load ${metrics.lastSwitchMs} ms`;});
function updateHits(){
 const active=!graphMode&&!!selected&&!!query.trim()&&hitsQuery===query.trim();
 $('#searchNavigation').hidden=!active;
 $('#hitCount').textContent=hits?`本文内 ${hit+1} / ${hits}`:'本文内 0件';
 $('#prev').disabled=!active||!hits;$('#next').disabled=!active||!hits;
}
listen('note-served',e=>{
 if(!vault)return;
 const url=new URL(e.payload.url);
 if(url.pathname.split('/')[1]!==vault.token||!vault.notes.some(n=>n.path===e.payload.path))return;
 selected=e.payload.path;displayedUrl=e.payload.url;hits=e.payload.hits;hitsQuery=url.searchParams.get('q')||'';hit=0;
 selectedInfo();updateHits();status(`表示中: ${selected}  ·  正本への書き込みなし`);
});
function renderReadErrors(){
 const errors=vault?.errors||[];
 $('#readErrors').hidden=!errors.length;
 $('#readErrorsSummary').textContent=`読み取りエラー ${errors.length}件`;
 $('#readErrorsList').innerHTML=errors.map(error=>`<li>${escape(error)}</li>`).join('');
 if(errors.length)status(`${errors.length}件の読み取りエラー（サイドバーで詳細を確認）`);
 else $('#readErrors').open=false;
}
function setVaultBusy(busy){vaultBusy=busy;for(const id of ['reload','update','open'])$('#'+id).disabled=busy;$('#reload').setAttribute('aria-busy',String(busy));}

async function load(path=null){
 if(vaultBusy)return;setVaultBusy(true);clearTimeout(timer);
 status('HTMLを解析しています…');$('#loading').classList.remove('hidden');
 try{
  vault=await invoke('open_vault',{path});metrics.scanMs=vault.scan_ms;
  selected='';invalidateGraph();activeTags=[];query='';$('#search').value='';hideSuggestions();setView(false);
  $('#root').textContent=vault.root;$('#root').title=vault.root;$('#vaultName').textContent=vault.root.split('/').pop();$('#vaultName').title=vault.root;
  $('#notice').classList.remove('show');changed=false;
  renderList();if(vault.notes.length)openNote(vault.notes[0].path);else clearNote();
  renderReadErrors();
 }catch(e){status(String(e));$('#loading').classList.add('hidden');}finally{setVaultBusy(false);}
}
$('#open').onclick=async()=>{try{const path=await invoke('plugin:dialog|open',{options:{directory:true,multiple:false,title:'HTMLを保管したフォルダを選択'}});if(path)await load(path);}catch(e){status(String(e));}};
$('#theme').onclick=()=>{const wasGraph=graphMode;theme=theme==='light'?'dark':'light';setTheme();if(selected)openNote(selected);setView(wasGraph);};
let timer,suggestions=null,suggestionIndex=-1;
function hideSuggestions(){suggestions=null;suggestionIndex=-1;$('#tagSuggestions').hidden=true;$('#tagSuggestions').innerHTML='';$('#search').setAttribute('aria-expanded','false');$('#search').removeAttribute('aria-activedescendant');$('#suggestionStatus').textContent='';}
function showSuggestions(){
 if(composing||!vault)return;
 const input=$('#search');if(document.activeElement!==input){hideSuggestions();return;}suggestions=ShioriSearch.suggest(input.value,input.selectionStart??input.value.length,vault.notes.flatMap(n=>n.tags));suggestionIndex=-1;
 if(!suggestions){hideSuggestions();return;}
 const options=suggestions.options;
 $('#tagSuggestions').hidden=!options.length;input.setAttribute('aria-expanded',String(!!options.length));input.removeAttribute('aria-activedescendant');
 $('#tagSuggestions').innerHTML=options.map((t,i)=>`<div id="tag-option-${i}" role="option" aria-selected="false" data-index="${i}">${escape(t)}</div>`).join('');
 $('#suggestionStatus').textContent=options.length?`タグ候補 ${options.length}件。上下キーで選択できます。`:'一致するタグ候補はありません。';
}
function acceptSuggestion(index){
 if(!suggestions?.options[index])return;
 const input=$('#search'),result=ShioriSearch.complete(input.value,suggestions.token,suggestions.options[index]);
 clearTimeout(timer);input.value=result.value;input.focus();input.setSelectionRange(result.caret,result.caret);hideSuggestions();applySearch();
}
$('#tagSuggestions').onmousedown=e=>e.preventDefault();
$('#tagSuggestions').onclick=e=>{const option=e.target.closest('[data-index]');if(option)acceptSuggestion(Number(option.dataset.index));};
function applySearch(){
 if(composing)return;
 const parsed=ShioriSearch.parse($('#search').value);
 if(query!==parsed.text||JSON.stringify(activeTags)!==JSON.stringify(parsed.tags)){
  const oldQuery=query;query=parsed.text;activeTags=parsed.tags;invalidateGraph();renderList();
  if(oldQuery&&!query&&selected){const wasGraph=graphMode;openNote(selected);setView(wasGraph);}
 }
}
function search(){if(composing)return;clearTimeout(timer);hideSuggestions();timer=setTimeout(()=>{applySearch();showSuggestions();},120);}
$('#search').addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer);hideSuggestions();});
$('#search').addEventListener('compositionend',()=>{composing=false;search();});
$('#search').addEventListener('input',search);
$('#search').addEventListener('click',showSuggestions);
$('#search').addEventListener('blur',()=>{clearTimeout(timer);applySearch();hideSuggestions();});
$('#search').addEventListener('keydown',e=>{
 if(e.isComposing||composing)return;
 if(['ArrowLeft','ArrowRight','Home','End','Tab'].includes(e.key)){clearTimeout(timer);applySearch();hideSuggestions();return;}
 if(e.key==='Escape'){clearTimeout(timer);applySearch();hideSuggestions();return;}
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){
  clearTimeout(timer);applySearch();
  if(!suggestions)showSuggestions();
  if(suggestions?.options.length){e.preventDefault();suggestionIndex=(suggestionIndex+(e.key==='ArrowDown'?1:suggestionIndex<0?0:-1)+suggestions.options.length)%suggestions.options.length;
   $('#search').setAttribute('aria-activedescendant',`tag-option-${suggestionIndex}`);
   $('#tagSuggestions').querySelectorAll('[role="option"]').forEach((option,i)=>{option.setAttribute('aria-selected',String(i===suggestionIndex));if(i===suggestionIndex)option.scrollIntoView({block:'nearest'});});
  }return;
 }
 if(e.key==='Enter'){
  e.preventDefault();clearTimeout(timer);
  if(suggestionIndex>=0){acceptSuggestion(suggestionIndex);return;}
  hideSuggestions();applySearch();const first=currentMatches[0];if(first)openNote(first.path);
 }
});

function moveHit(delta){if(!hits)return;hit=(hit+delta+hits)%hits;const u=new URL(displayedUrl||$('#noteFrame').src);u.hash=`shiori-hit-${hit}`;$('#noteFrame').src=u.href;updateHits();}
$('#prev').onclick=()=>moveHit(-1);$('#next').onclick=()=>moveHit(1);
async function refresh(){
 if(vaultBusy||!vault)return;setVaultBusy(true);hideSuggestions();status('Vault全体を再読込しています…');
 try{
  const old=selected,wasGraph=graphMode;
  vault=await invoke('refresh_vault');metrics.scanMs=vault.scan_ms;invalidateGraph();
  changed=false;$('#notice').classList.remove('show');
  renderList();
  if(vault.notes.length)openNote(vault.notes.some(n=>n.path===old)?old:vault.notes[0].path);else clearNote();
  setView(wasGraph);
  renderReadErrors();
 }catch(e){status(String(e));}finally{setVaultBusy(false);}
}
$('#reload').onclick=refresh;$('#update').onclick=refresh;
setInterval(async()=>{if(!vault||vaultBusy||revisionBusy||changed)return;revisionBusy=true;try{const rev=await invoke('vault_revision');if(rev!==vault.revision){changed=true;$('#notice').classList.add('show');}}catch(e){status(String(e));}finally{revisionBusy=false;}},2000);
$('#splitter').onpointerdown=e=>{e.preventDefault();const shield=document.createElement('div');Object.assign(shield.style,{position:'fixed',inset:'0',zIndex:50,cursor:'col-resize'});document.body.append(shield);const move=e=>document.documentElement.style.setProperty('--sidebar',`${Math.max(210,Math.min(460,window.innerWidth-$('.view-nav').offsetWidth-325,e.clientX-$('.view-nav').getBoundingClientRect().right))}px`);shield.onpointermove=move;shield.onpointerup=()=>shield.remove();};
function setTag(value){
 const parsed=ShioriSearch.parse($('#search').value);
 $('#search').value=[parsed.text,value?ShioriSearch.formatTag(value):''].filter(Boolean).join(' ');
 clearTimeout(timer);hideSuggestions();applySearch();
}
function setView(graph){graphMode=graph;$('#graphPanel').hidden=!graph;$('.frame-wrap').hidden=graph;updateHits();$('#showGraph').setAttribute('aria-pressed',String(graph));$('#showNote').setAttribute('aria-pressed',String(!graph));if(graph)renderGraph();}
function graphTransform(){const g=$('#graphSvg .graph-world');if(g)g.setAttribute('transform',`translate(${graphX} ${graphY}) translate(500 370) scale(${graphScale}) translate(-500 -370)`);}
function resetGraph(){graphScale=1;graphX=0;graphY=0;graphTransform();}
function renderGraph(){
 const key=JSON.stringify([vault?.token,vault?.revision,query.trim(),activeTags,graphPage]);
 if(graphKey===key){
  $('#graphSvg').querySelectorAll('.graph-node.note').forEach(n=>n.classList.toggle('selected',n.dataset.value===selected));
  graphTransform();return;
 }
 graphKey=key;graphScale=1;graphX=0;graphY=0;
 const model=ShioriGraph.build(currentMatches,graphPage);graphPage=model.page;$('#graphSvg').classList.toggle('dense',model.shown>40);
 $('#graphSummary').textContent=`${activeTags.length?activeTags.map(t=>'#'+t).join(' + ')+' · ':''}${model.total}件中 ${model.shown?model.page*150+1:0}〜${model.page*150+model.shown}件 · ${model.page+1}/${model.pages}ページ（最大150ノート/ページ）`;
 $('#graphPrev').disabled=!model.page;$('#graphNext').disabled=model.page+1>=model.pages;$('#graphEmpty').hidden=!!model.shown;
 const byId=new Map(model.nodes.map(n=>[n.id,n]));
 const xs=model.nodes.map(n=>n.x),ys=model.nodes.map(n=>n.y),left=Math.min(0,...xs)-35,top=Math.min(0,...ys)-35;$('#graphSvg').setAttribute('viewBox',`${left} ${top} ${Math.max(1000,...xs)+220-left} ${Math.max(740,...ys)+35-top}`);
 $('#graphSvg').innerHTML='<g class="graph-world">'+model.edges.map(e=>{const a=byId.get(e.source),b=byId.get(e.target);return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;}).join('')+model.nodes.map(n=>`<g class="graph-node ${n.kind} ${n.path===selected?'selected':''}" tabindex="0" role="button" aria-label="${escape(n.kind==='tag'?'タグで絞り込む: '+n.label:'ノートを開く: '+n.label)}" data-kind="${n.kind}" data-value="${escape(n.kind==='tag'?n.label:n.path)}" transform="translate(${n.x} ${n.y})"><title>${escape(n.label)}</title><circle r="${n.kind==='tag'?15:6}"/><text x="${n.kind==='tag'?21:10}" y="4">${escape(n.kind==='tag'?'#'+n.label:n.label.length>20?n.label.slice(0,20)+'…':n.label)}</text></g>`).join('')+'</g>';
 graphTransform();
}
$('#showGraph').onclick=()=>setView(true);$('#showNote').onclick=()=>setView(false);
$('#graphPrev').onclick=()=>{graphPage--;renderGraph();};$('#graphNext').onclick=()=>{graphPage++;renderGraph();};
$('#zoomIn').onclick=()=>{graphScale=Math.min(5,graphScale*1.25);graphTransform();};$('#zoomOut').onclick=()=>{graphScale=Math.max(.25,graphScale/1.25);graphTransform();};$('#graphReset').onclick=resetGraph;
let graphDrag=null,suppressGraphClick=false;
$('#graphSvg').onpointerdown=e=>{if(e.button!==0)return;graphDrag={x:e.clientX,y:e.clientY,ox:graphX,oy:graphY};suppressGraphClick=false;};
$('#graphSvg').onpointermove=e=>{if(!graphDrag)return;const svg=$('#graphSvg'),factor=Math.max(svg.viewBox.baseVal.width/svg.clientWidth,svg.viewBox.baseVal.height/svg.clientHeight);const dx=e.clientX-graphDrag.x,dy=e.clientY-graphDrag.y;if(Math.hypot(dx,dy)>4){suppressGraphClick=true;svg.setPointerCapture(e.pointerId);}graphX=graphDrag.ox+dx*factor;graphY=graphDrag.oy+dy*factor;graphTransform();};
$('#graphSvg').onpointerup=e=>{graphDrag=null;if($('#graphSvg').hasPointerCapture(e.pointerId))$('#graphSvg').releasePointerCapture(e.pointerId);};
$('#graphSvg').onpointercancel=()=>{graphDrag=null;suppressGraphClick=true;};
function activateGraph(e){if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;if(e.type==='click'&&suppressGraphClick){suppressGraphClick=false;return;}const node=e.target.closest('.graph-node');if(!node)return;e.preventDefault();if(node.dataset.kind==='tag'){setTag(node.dataset.value);$('#showGraph').focus();}else{openNote(node.dataset.value);$('#showNote').focus();}}
$('#graphSvg').onclick=activateGraph;$('#graphSvg').onkeydown=activateGraph;
metrics.uiReadyMs=Math.round(performance.now()-boot);updateHits();load();
