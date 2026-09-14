const {invoke} = window.__TAURI__.core;
const {listen} = window.__TAURI__.event;
let vault=null, selected='', query='', activeTags=[], theme=localStorage.getItem('theme')||'light', revisionBusy=false, changed=false, composing=false;
let graphMode=false,currentMatches=[],graphKey=null,vaultBusy=false;
let terminalPanel=null,terminalBusy=false,tagEditing=false,tagEditor=null,revisionEpoch=0;
const $=s=>document.querySelector(s);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('#app').innerHTML=`<div class="layout">
<nav class="view-nav" aria-label="表示モード">
<button id="showNote" aria-label="ノート表示" title="ノート表示" aria-pressed="true" aria-controls="readerPanel">
<svg viewBox="0 0 24 24" aria-hidden="true">
<path d="M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4"/>
</svg>
</button>
<button id="showGraph" aria-label="リンクグラフ表示" title="リンクグラフ表示" aria-pressed="false" aria-controls="graphPanel">
<svg viewBox="0 0 24 24" aria-hidden="true">
<path d="m6 7 12 2-7 10L6 7"/>
<circle cx="6" cy="7" r="3"/>
<circle cx="18" cy="9" r="3"/>
<circle cx="11" cy="19" r="3"/>
</svg>
</button>
<button id="showTerminal" title="Terminal" aria-label="ターミナル" aria-pressed="false" aria-controls="terminalPanel">&gt;_</button>
<button id="theme" title="ダークモード" aria-label="ダークモード" aria-pressed="false">◐</button>
</nav>
<aside class="sidebar">
<div class="search">
<input id="search" placeholder="検索 / tag: タグ名" aria-label="ノートとタグを検索" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="tagSuggestions" aria-describedby="searchHelp">
<div id="tagSuggestions" class="tag-suggestions" role="listbox" aria-label="タグ候補" hidden></div>
<span id="searchHelp" class="sr-only">tag: タグ名で完全一致。複数のタグはAND。空白を含むタグは二重引用符で囲みます。候補は上下キーで選び、Enterで確定、Escapeで閉じます。</span>
<span id="suggestionStatus" class="sr-only" role="status"></span>
</div>
<section id="currentNote" class="current-note" aria-label="絞り込み対象外の表示中ノート" hidden>
</section>
<span id="results" class="sr-only"></span>
<div class="notes" id="notes">
</div>
<div class="vault-footer">
<div class="vault-diagnostics">
<div id="vaultWarnings" class="vault-warnings" role="status" hidden></div>
<details id="readErrors" class="read-errors" hidden>
<summary id="readErrorsSummary">読み取りエラー</summary>
<ul id="readErrorsList"></ul>
</details>
</div>
<button id="vaultSwitch" class="vault-switch" aria-haspopup="menu" aria-expanded="false" aria-controls="vaultMenu" aria-label="Vault操作">
<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5h6l2 2h10v13H3z"/></svg>
<span id="vaultName">Vault</span><span class="vault-menu-indicator" aria-hidden="true">⌃</span>
</button>
</div>
<div id="vaultMenu" class="popup-menu vault-menu" role="menu" aria-label="Vault操作" hidden>
<div class="vault-path" id="root"></div>
<button id="open" role="menuitem">Vaultを開く（切り替え）</button>
<button id="reload" role="menuitem">再読込</button>
</div>
</aside>
<div class="splitter" id="splitter" role="separator" aria-label="サイドバー幅" aria-orientation="vertical">
</div>
<div class="workspace">
<main class="viewer">
<div class="notice" id="notice">
<span id="noticeText">ファイルが変更されました。再読み込みで反映できます。</span>
<button id="update">更新を反映</button>
</div>
<div id="readerPanel" class="reader-workspace"></div>
<section id="graphPanel" hidden>
<div class="graph-toolbar">
<div>
<strong>リンクでつながるノート</strong>
<div id="graphSummary" class="graph-summary">
</div>
</div>
<div class="graph-actions">
<button id="zoomOut" aria-label="縮小">−</button>
<button id="zoomIn" aria-label="拡大">＋</button>
<button id="graphReset">全体表示</button>
</div>
</div>
<p class="graph-help">点＝ノート · 線＝HTMLリンク。ドラッグで移動、点にカーソルを重ねるとタイトルを表示。クリックで開きます。キーボードは矢印でノートを選択、Enterで開きます。</p>
<span id="graphNodeLabel" class="graph-node-label" role="status"></span>
<canvas id="graphCanvas" tabindex="0" role="group" aria-label="ノートのリンクグラフ" aria-describedby="graphNodeLabel"></canvas>
<div id="graphEmpty" class="empty" hidden>一致するノートがありません</div>
</section>
</main>
<section id="terminalPanel" class="terminal-panel" aria-label="ターミナル" hidden></section>
</div>
</div>
`;
function setTheme(){document.documentElement.classList.toggle('theme-dark',theme==='dark');localStorage.setItem('theme',theme);$('#theme').setAttribute('aria-pressed',String(theme==='dark'));}
setTheme();
const notifications=ShioriToasts.create({document});
const showError=message=>notifications.error(message);
const reader=ShioriReader.create({document,getVault:()=>vault,getTheme:()=>theme,onSelect:path=>{selected=path;renderList();tagEditor?.contextChanged();terminalPanel?.contextChanged();},onStatus:showError,onTag:setTag,onEditTags:(path,remove,host)=>{if(!vaultBusy&&!tagEditing)tagEditor.open(path,remove,host);}});

tagEditor=ShioriTagEditor.create({document,getVault:()=>vault,getTarget:()=>({path:reader.model.tab?.path,host:$('#pane-tags-'+reader.model.activePane)}),invoke,onError:showError,onBusy:busy=>{tagEditing=busy;revisionEpoch++;reader.tagBusy(busy);setVaultBusy(vaultBusy);},onSaved:(result,path)=>{
 if(result.snapshot.token!==vault?.token)return;
 const previous=new Map(vault.notes.map(n=>[n.path,n.source_hash]));
 const reloadPaths=new Set(result.snapshot.notes.filter(n=>n.path===path||previous.get(n.path)!==n.source_hash).map(n=>n.path));
 vault=result.snapshot;invalidateGraph();hideSuggestions();changed=false;$('#notice').classList.remove('show');
 reader.metadataRefresh(reloadPaths);renderList();renderReadErrors();
 if(result.warning)notifications.warning(result.warning);
}});


terminalPanel=ShioriTerminal.create({document,invoke,listen,getContext:()=>!vaultBusy&&vault?{token:vault.token,root:vault.root}:null,onBusy:busy=>{terminalBusy=busy;setVaultBusy(vaultBusy);},onComplete:token=>{if(vault?.token===token){changed=true;$('#notice').classList.add('show');}}});

function renderList(){
 if(!vault)return;
 const focused=document.activeElement;
 const focusPath=focused?.dataset.path;
 const focusContainer=focused?.closest('#notes, #currentNote')?.id;
 const matches=ShioriSearch.filter(vault.notes,{text:query,tags:activeTags});
 $('#notes').innerHTML=matches.map(n=>`<article class="note ${n.path===selected?'active':''}"><button class="note-open" title="${escape(n.title)} — ${escape(n.path)}" aria-label="${escape(n.title)} — ${escape(n.path)}" data-path="${escape(n.path)}" ${n.path===selected?'aria-current="true"':''}><svg class="tree-icon document-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6"/></svg><span class="note-title">${escape(n.title)}</span></button></article>`).join('')||'<div class="empty">一致するノートがありません</div>';
 currentMatches=matches;if(graphMode)renderGraph();
 $('#results').textContent=`${matches.length} 件`;
 renderCurrentNote();
 if(focusContainer){const buttons=$('#'+focusContainer).querySelectorAll('button');[...buttons].find(b=>b.dataset.path===focusPath)?.focus();}
}
function renderCurrentNote(){
 const note=vault?.notes.find(n=>n.path===selected);
 const panel=$('#currentNote');
 panel.hidden=!note||currentMatches.some(n=>n.path===selected);
 panel.innerHTML=panel.hidden?'':`<div class="current-label">表示中 · 絞り込み対象外</div><strong title="${escape(note.path)}" aria-label="${escape(note.title)} — ${escape(note.path)}">${escape(note.title)}</strong>`;
}
function activateNoteList(e){
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.path!==undefined)openNote(button.dataset.path,'',e.shiftKey?'side':e.metaKey||e.ctrlKey?'tab':'current');
}
$('#notes').onclick=activateNoteList;
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#vaultMenu, #vaultSwitch'))closeVaultMenu();});
function closeVaultMenu(restore=false){$('#vaultMenu').hidden=true;$('#vaultSwitch').setAttribute('aria-expanded','false');if(restore)$('#vaultSwitch').focus();}
function showVaultMenu(last=false){
 if(vaultBusy||tagEditing)return;
 hideSuggestions();const menu=$('#vaultMenu'),trigger=$('#vaultSwitch');menu.hidden=false;trigger.setAttribute('aria-expanded','true');
 const rect=trigger.getBoundingClientRect(),box=menu.getBoundingClientRect();
 menu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-box.width-8))+'px';
 menu.style.top=Math.max(8,rect.top-box.height-6)+'px';
 const items=[...menu.querySelectorAll('button')].filter(b=>!b.disabled);items[last?items.length-1:0]?.focus();
}
$('#vaultSwitch').onclick=()=>{if($('#vaultMenu').hidden)showVaultMenu();else closeVaultMenu();};
$('#vaultSwitch').onkeydown=e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();showVaultMenu(e.key==='ArrowUp');}if(e.key==='Escape'){e.preventDefault();closeVaultMenu();}};
$('#vaultMenu').onkeydown=e=>{
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeVaultMenu(true);return;}
 if(e.key==='Tab'){closeVaultMenu(true);return;}
 if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
  e.preventDefault();const items=[...$('#vaultMenu').querySelectorAll('button')].filter(b=>!b.disabled),index=items.indexOf(document.activeElement);
  const next=e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:items.length-1))%items.length;items[next]?.focus();
 }
};
document.addEventListener('focusin',e=>{if(!e.target.closest('#vaultMenu, #vaultSwitch'))closeVaultMenu();});
document.defaultView.addEventListener('resize',()=>closeVaultMenu());
function invalidateGraph(){graphKey=null;}
function clearNote(){reader.reset();selected='';renderList();}
function openNote(path,anchor='',mode='current'){
 if(!vault)return;setView(false);reader.open(path,anchor,mode,query.trim());
}
listen('note-served',e=>{if(vault)reader.served(e.payload);});
listen('reader-menu',e=>{if(!vault||!['find','next','previous','clear'].includes(e.payload))return;reader.syncFocusedFrame();setView(false);reader.menuAction(e.payload);});

function renderReadErrors(){
 const errors=vault?.errors||[];
 $('#readErrors').hidden=!errors.length;
 $('#readErrorsSummary').textContent=`読み取りエラー ${errors.length}件`;
 $('#readErrorsList').innerHTML=errors.map(error=>`<li>${escape(error)}</li>`).join('');
 if(!errors.length)$('#readErrors').open=false;
}
function setVaultBusy(busy){vaultBusy=busy;for(const id of ['reload','update','open'])$('#'+id).disabled=busy||tagEditing||(id==='open'&&terminalBusy);$('#vaultSwitch').setAttribute('aria-busy',String(busy));$('#vaultSwitch').setAttribute('aria-disabled',String(busy||tagEditing));if(busy||tagEditing)closeVaultMenu();$('#notes').setAttribute('aria-busy',String(busy));terminalPanel?.contextChanged();}

async function load(path=null){
 if(vaultBusy||terminalBusy||tagEditing)return;setVaultBusy(true);clearTimeout(timer);
 try{
  vault=await invoke('open_vault',{path});
  $('#vaultWarnings').textContent=(vault.warnings||[]).join('\n');$('#vaultWarnings').hidden=!vault.warnings?.length;
  reader.reset();terminalPanel.reset();selected='';invalidateGraph();activeTags=[];query='';$('#search').value='';hideSuggestions();setView(false);
  $('#root').textContent=vault.root;$('#root').title=vault.root;$('#vaultName').textContent=vault.root.split('/').pop();$('#vaultName').title=vault.root;$('#vaultSwitch').title=vault.root;$('#vaultSwitch').setAttribute('aria-label',`Vault操作: ${vault.root.split('/').pop()}`);
  $('#notice').classList.remove('show');changed=false;
  renderList();const [first]=vault.notes;if(first)openNote(first.path);else clearNote();
  renderReadErrors();
 }catch(e){showError(String(e));}finally{setVaultBusy(false);}
}
$('#open').onclick=async()=>{if($('#open').disabled)return;closeVaultMenu(true);try{const path=await invoke('plugin:dialog|open',{options:{directory:true,multiple:false,title:'HTMLを保管したフォルダを選択'}});if(path)await load(path);}catch(e){showError(String(e));}};
$('#theme').onclick=()=>{theme=theme==='light'?'dark':'light';setTheme();reader.theme();graphView.redraw();};
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
  query=parsed.text;activeTags=parsed.tags;invalidateGraph();renderList();
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

async function refresh(){
 if(vaultBusy||tagEditing||!vault)return;setVaultBusy(true);hideSuggestions();
 try{
  const wasGraph=graphMode;
  vault=await invoke('refresh_vault');invalidateGraph();
  changed=false;$('#notice').classList.remove('show');
  reader.refresh();renderList();
  setView(wasGraph);
  renderReadErrors();
 }catch(e){showError(String(e));}finally{setVaultBusy(false);}
}
$('#reload').onclick=()=>{if($('#reload').disabled)return;closeVaultMenu(true);return refresh();};$('#update').onclick=refresh;
let pollError=null;
setInterval(async()=>{if(!vault||vaultBusy||tagEditing||revisionBusy||changed)return;revisionBusy=true;const epoch=revisionEpoch,token=vault.token;
 try{const rev=await invoke('vault_revision');if(epoch===revisionEpoch&&token===vault?.token&&!vaultBusy){pollError=null;if(rev!==vault.revision){changed=true;$('#notice').classList.add('show');}}}
 catch(e){if(epoch===revisionEpoch&&token===vault?.token&&!vaultBusy){const key=token+':'+String(e);if(pollError!==key){pollError=key;showError(String(e));}}}
 finally{revisionBusy=false;}
},2000);
$('#splitter').onpointerdown=e=>{e.preventDefault();const shield=document.createElement('div');Object.assign(shield.style,{position:'fixed',inset:'0',zIndex:50,cursor:'col-resize'});document.body.append(shield);const move=e=>document.documentElement.style.setProperty('--sidebar',`${Math.max(210,Math.min(460,window.innerWidth-$('.view-nav').offsetWidth-325,e.clientX-$('.view-nav').getBoundingClientRect().right))}px`);shield.onpointermove=move;shield.onpointerup=()=>shield.remove();};
function setTag(value){
 const parsed=ShioriSearch.parse($('#search').value);
 $('#search').value=[parsed.text,value?ShioriSearch.formatTag(value):''].filter(Boolean).join(' ');
 clearTimeout(timer);hideSuggestions();applySearch();
}
const graphView=ShioriGraphView.create({canvas:$('#graphCanvas'),label:$('#graphNodeLabel'),onOpen:(path,e)=>{openNote(path,'',e.shiftKey?'side':e.metaKey||e.ctrlKey?'tab':'current');$('#showNote').focus();}});
function setView(graph){graphMode=graph;$('#graphPanel').hidden=!graph;$('#readerPanel').hidden=graph;$('#showGraph').setAttribute('aria-pressed',String(graph));$('#showNote').setAttribute('aria-pressed',String(!graph));graphView.setVisible(graph);if(graph)renderGraph();}
function renderGraph(){
 const key=JSON.stringify([vault?.token,vault?.revision,query.trim(),activeTags]);
 if(graphKey!==key){graphKey=key;const model=ShioriGraph.build(currentMatches,vault?.notes||[]);graphView.setModel(model);$('#graphSummary').textContent=`${model.total} ノート · ${model.edges.length} リンク${model.unresolved?` · 解決できないHTMLリンク ${model.unresolved} 件`:''}`;$('#graphEmpty').hidden=!!model.total;}
 graphView.select(selected);
}
$('#showGraph').onclick=()=>setView(true);$('#showNote').onclick=()=>setView(false);
$('#zoomIn').onclick=()=>graphView.zoom(1.25);$('#zoomOut').onclick=()=>graphView.zoom(1/1.25);$('#graphReset').onclick=()=>graphView.reset();
load();
