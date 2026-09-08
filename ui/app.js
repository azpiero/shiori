const boot = performance.now();
const {invoke} = window.__TAURI__.core;
const {listen} = window.__TAURI__.event;
let vault=null, selected='', query='', tag='', theme=localStorage.getItem('theme')||'light', switching=0, hits=0, hit=0, revisionBusy=false, changed=false, composing=false, displayedUrl='';
let graphMode=false,graphPage=0,graphScale=1,graphX=0,graphY=0,currentMatches=[],graphKey=null,hitsQuery='',vaultBusy=false;
const metrics={uiReadyMs:0,scanMs:0,lastSwitchMs:0,imeCompositions:0};
const $=s=>document.querySelector(s);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('#app').innerHTML=`<header class="topbar">
<div class="brand">
<img class="logo" src="assets/shiori-icon.png" alt="" width="31" height="31">
<div>
<strong>shiori</strong>
<div class="caption">A quieter place for your ideas</div>
</div>
<span class="pill">表示試作 / 読み取り専用</span>
</div>
<div class="actions">
<button id="sample">サンプル</button>
<button id="open" class="primary">フォルダを開く</button>
<button id="theme" title="ライト／ダーク切替">◐</button>
<button id="inspect">検証ログ</button>
</div>
</header>
<div class="layout">
<nav class="view-nav" aria-label="表示モード">
<button id="showNote" aria-label="ノート表示" title="ノート表示" aria-pressed="true" aria-controls="readerPanel">
<svg viewBox="0 0 24 24" aria-hidden="true">
<path d="M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4"/>
</svg>
<span>ノート</span>
</button>
<button id="showGraph" aria-label="タググラフ表示" title="タググラフ表示" aria-pressed="false" aria-controls="graphPanel">
<svg viewBox="0 0 24 24" aria-hidden="true">
<path d="m6 7 12 2-7 10L6 7"/>
<circle cx="6" cy="7" r="3"/>
<circle cx="18" cy="9" r="3"/>
<circle cx="11" cy="19" r="3"/>
</svg>
<span>グラフ</span>
</button>
</nav>
<aside class="sidebar">
<div class="eyebrow">YOUR LIBRARY</div>
<div class="vault-name">
<span id="vaultName">Sample Vault</span>
<div class="vault-actions">
<span id="count" class="pill">—</span>
<button id="reload" title="Vault全体を再読込" aria-label="Vault全体を再読込">↻</button>
</div>
</div>
<div class="vault-path" id="root">
</div>
<div class="search">
<input id="search" placeholder="ノートを検索…" aria-label="ノートを検索" autocomplete="off">
</div>
<div class="filter-label">タグで絞り込み</div>
<div class="filter-tags" id="tags" aria-label="タグで一覧を絞り込み">
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
<div class="sidebar-footer">HTMLをそのまま正本に。<br>ノート内のJavaScript・外部資産は停止。<br>この試作はファイルを書き換えません。</div>
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
<section id="diagnostics" class="diagnostics">
<h3>表示試作の検証ログ</h3>
<p>配信ログはRust側が扱ったリクエストです。CSPがWebView内で止めた外部通信はここには届きません。</p>
<pre id="log">
</pre>
</section>
</main>
</div>
<footer class="statusbar">
<span id="status">準備中</span>
<span id="timing">Tauri + Rust · sandboxed iframe · WKWebView</span>
</footer>`;
function setTheme(){document.documentElement.classList.toggle('theme-dark',theme==='dark');localStorage.setItem('theme',theme);}
setTheme();
function status(s){$('#status').textContent=s;}
function noteUrl(path=selected){return `vault://localhost/${vault.token}/${path.split('/').map(encodeURIComponent).join('/')}`;}
function renderList(){
 if(!vault)return;
 const focused=document.activeElement;
 const focusPath=focused?.dataset.path,focusTag=focused?.dataset.tag;
 const focusContainer=focused?.closest('#notes, #tags, #currentNote')?.id;
 const q=query.trim().toLocaleLowerCase();
 const matches=vault.notes.filter(n=>(!tag||n.tags.includes(tag))&&(!q||`${n.title}\n${n.text}`.toLocaleLowerCase().includes(q))).sort((a,b)=>Number(b.title.toLocaleLowerCase().includes(q))-Number(a.title.toLocaleLowerCase().includes(q)));
 $('#notes').innerHTML=matches.map(n=>`<article class="note ${n.path===selected?'active':''}"><button class="note-open" data-path="${escape(n.path)}" ${n.path===selected?'aria-current="true"':''}><span class="note-title"><span class="note-icon">▤</span>${escape(n.title)}</span><span class="note-path" title="${escape(n.path)}">${escape(n.path)}</span></button><div class="list-note-tags">${n.tags.map(t=>`<button class="note-tag" data-tag="${escape(t)}" title="タググラフを開く: ${escape(t)}" aria-label="タググラフを開く: ${escape(t)}">#${escape(t)} <span aria-hidden="true">↗</span></button>`).join('')||'<span class="untagged">タグなし</span>'}</div></article>`).join('')||'<div class="empty">一致するノートがありません</div>';
 currentMatches=matches;if(graphMode)renderGraph();
 $('#results').textContent=`${matches.length} 件`;
 renderCurrentNote();
 $('#tags').innerHTML=['',...new Set(vault.notes.flatMap(n=>n.tags))].map(t=>`<button class="tag ${t===tag?'active':''}" data-tag="${escape(t)}">${escape(t||'すべて')}</button>`).join('');
 updateHits();
 if(focusContainer){const buttons=$('#'+focusContainer).querySelectorAll('button');[...buttons].find(b=>focusPath!==undefined?b.dataset.path===focusPath:b.dataset.tag===focusTag)?.focus();}
}
function renderCurrentNote(){
 const note=vault?.notes.find(n=>n.path===selected);
 const panel=$('#currentNote');
 panel.hidden=!note||currentMatches.some(n=>n.path===selected);
 panel.innerHTML=panel.hidden?'':`<div class="filter-label">表示中 · 絞り込み対象外</div><strong>${escape(note.title)}</strong><div class="note-path" title="${escape(note.path)}">${escape(note.path)}</div><div class="list-note-tags">${note.tags.map(t=>`<button class="note-tag" data-tag="${escape(t)}" aria-label="タググラフを開く: ${escape(t)}">#${escape(t)} ↗</button>`).join('')||'<span class="untagged">タグなし</span>'}</div>`;
}
function selectedInfo(){renderList();}
function activateNoteList(e){
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.path!==undefined)openNote(button.dataset.path);
 else if(button.dataset.tag!==undefined){setTag(button.dataset.tag);setView(true);$('#showGraph').focus();}
}
$('#notes').onclick=activateNoteList;
$('#currentNote').onclick=activateNoteList;
$('#tags').onclick=e=>{const button=e.target.closest('button[data-tag]');if(button){const value=button.dataset.tag;setTag(value);[...$('#tags').querySelectorAll('button')].find(b=>b.dataset.tag===value)?.focus();}};
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
function setVaultBusy(busy){vaultBusy=busy;for(const id of ['reload','update','open','sample'])$('#'+id).disabled=busy;$('#reload').setAttribute('aria-busy',String(busy));}

async function load(path=null){
 if(vaultBusy)return;setVaultBusy(true);clearTimeout(timer);
 status('HTMLを解析しています…');$('#loading').classList.remove('hidden');
 try{
  vault=await invoke('open_vault',{path});metrics.scanMs=vault.scan_ms;
  selected='';invalidateGraph();tag='';query='';$('#search').value='';setView(false);
  $('#root').textContent=vault.root;$('#root').title=vault.root;$('#vaultName').textContent=vault.root.split('/').pop();$('#vaultName').title=vault.root;
  $('#count').textContent=vault.notes.length;$('#notice').classList.remove('show');changed=false;
  renderList();if(vault.notes.length)openNote(vault.notes[0].path);else clearNote();
  if(vault.errors.length)status(`${vault.errors.length}件の読み取りエラー（検証ログ参照）`);
 }catch(e){status(String(e));$('#loading').classList.add('hidden');}finally{setVaultBusy(false);}
}
$('#open').onclick=async()=>{try{const path=await invoke('plugin:dialog|open',{options:{directory:true,multiple:false,title:'HTMLを保管したフォルダを選択'}});if(path)await load(path);}catch(e){status(String(e));}};
$('#sample').onclick=()=>load();
$('#theme').onclick=()=>{const wasGraph=graphMode;theme=theme==='light'?'dark':'light';setTheme();if(selected)openNote(selected);setView(wasGraph);};
$('#search').addEventListener('compositionstart',()=>composing=true);
$('#search').addEventListener('compositionend',()=>{composing=false;metrics.imeCompositions++;search();});
let timer;
function applySearch(){
 const next=$('#search').value;
 if(query!==next){query=next;invalidateGraph();renderList();
  // Remove old highlights when clearing the search, without leaving the graph.
  if(!query.trim()&&selected){const wasGraph=graphMode;openNote(selected);setView(wasGraph);}
 }
}
function search(){if(composing)return;clearTimeout(timer);timer=setTimeout(applySearch,120);}
$('#search').addEventListener('input',search);
$('#search').addEventListener('keydown',e=>{
 if(e.key==='Enter'&&!e.isComposing&&!composing){clearTimeout(timer);applySearch();const first=currentMatches[0];if(first)openNote(first.path);}
});

function moveHit(delta){if(!hits)return;hit=(hit+delta+hits)%hits;const u=new URL(displayedUrl||$('#noteFrame').src);u.hash=`shiori-hit-${hit}`;$('#noteFrame').src=u.href;updateHits();}
$('#prev').onclick=()=>moveHit(-1);$('#next').onclick=()=>moveHit(1);
async function refresh(){
 if(vaultBusy||!vault)return;setVaultBusy(true);status('Vault全体を再読込しています…');
 try{
  const old=selected,wasGraph=graphMode;
  vault=await invoke('refresh_vault');metrics.scanMs=vault.scan_ms;invalidateGraph();
  $('#count').textContent=vault.notes.length;changed=false;$('#notice').classList.remove('show');
  renderList();
  if(vault.notes.length)openNote(vault.notes.some(n=>n.path===old)?old:vault.notes[0].path);else clearNote();
  setView(wasGraph);
  if(vault.errors.length)status(`${vault.errors.length}件の読み取りエラー（検証ログ参照）`);
 }catch(e){status(String(e));}finally{setVaultBusy(false);}
}
$('#reload').onclick=refresh;$('#update').onclick=refresh;
$('#inspect').onclick=async()=>{const d=await invoke('diagnostics');$('#log').textContent=JSON.stringify({metrics,scanErrors:vault?.errors||[],...d},null,2);$('#diagnostics').classList.toggle('show');};
setInterval(async()=>{if(!vault||vaultBusy||revisionBusy||changed)return;revisionBusy=true;try{const rev=await invoke('vault_revision');if(rev!==vault.revision){changed=true;$('#notice').classList.add('show');}}catch(e){status(String(e));}finally{revisionBusy=false;}},2000);
$('#splitter').onpointerdown=e=>{e.preventDefault();const shield=document.createElement('div');Object.assign(shield.style,{position:'fixed',inset:'0',zIndex:50,cursor:'col-resize'});document.body.append(shield);const move=e=>document.documentElement.style.setProperty('--sidebar',`${Math.max(210,Math.min(460,window.innerWidth-$('.view-nav').offsetWidth-325,e.clientX-$('.view-nav').getBoundingClientRect().right))}px`);shield.onpointermove=move;shield.onpointerup=()=>shield.remove();};
function setTag(value){if(tag!==value){tag=value;invalidateGraph();}renderList();}
function setView(graph){graphMode=graph;$('#graphPanel').hidden=!graph;$('.frame-wrap').hidden=graph;updateHits();$('#showGraph').setAttribute('aria-pressed',String(graph));$('#showNote').setAttribute('aria-pressed',String(!graph));if(graph)renderGraph();}
function graphTransform(){const g=$('#graphSvg .graph-world');if(g)g.setAttribute('transform',`translate(${graphX} ${graphY}) translate(500 370) scale(${graphScale}) translate(-500 -370)`);}
function resetGraph(){graphScale=1;graphX=0;graphY=0;graphTransform();}
function renderGraph(){
 const key=JSON.stringify([vault?.token,vault?.revision,query.trim(),tag,graphPage]);
 if(graphKey===key){
  $('#graphSvg').querySelectorAll('.graph-node.note').forEach(n=>n.classList.toggle('selected',n.dataset.value===selected));
  graphTransform();return;
 }
 graphKey=key;graphScale=1;graphX=0;graphY=0;
 const model=ShioriGraph.build(currentMatches,graphPage);graphPage=model.page;$('#graphSvg').classList.toggle('dense',model.shown>40);
 $('#graphSummary').textContent=`${tag?'#'+tag+' · ':''}${model.total}件中 ${model.shown?model.page*150+1:0}〜${model.page*150+model.shown}件 · ${model.page+1}/${model.pages}ページ（最大150ノート/ページ）`;
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
