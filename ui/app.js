const {invoke} = window.__TAURI__.core;
const {listen} = window.__TAURI__.event;
let vault=null, selected='', query='', activeTags=[], theme=localStorage.getItem('theme')||'light', revisionBusy=false, changed=false, composing=false;
let graphMode=false,currentMatches=[],graphKey=null,vaultBusy=false;
let terminalPanel=null,terminalBusy=false,tagEditing=false,tagEditor=null,revisionEpoch=0,moving=false,noteMover=null,dragNote=null;
const collapsedFolders=new Set();let folderEdit=null;
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
<div class="vault-name">
<span id="vaultName">Sample Vault</span>
<div class="vault-actions">
<button id="open" title="フォルダを開く" aria-label="フォルダを開く"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5h6l2 2h10v3M3 7h6l2 3h10l-3 10H3z"/></svg></button>
<button id="reload" title="Vault全体を再読込" aria-label="Vault全体を再読込">↻</button>
</div>
</div>
<div class="vault-path" id="root">
</div>
<div id="vaultWarnings" class="vault-warnings" role="status" hidden></div>
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
<span id="results" class="sr-only"></span>
<div id="folderMenu" class="folder-menu" role="menu" aria-label="フォルダ操作" hidden></div>
<span id="folderMoveHelp" class="sr-only">ノートをSpaceで選択し、移動先のフォルダへTabで移動してEnterで格納。Escapeで取消。</span><div class="notes" id="notes">
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
const reader=ShioriReader.create({document,getVault:()=>vault,getTheme:()=>theme,onSelect:path=>{selected=path;renderList();tagEditor?.contextChanged();terminalPanel?.contextChanged();},onStatus:showError,onTag:setTag,onEditTags:(path,remove,host)=>{if(!vaultBusy&&!moving&&!tagEditing)tagEditor.open(path,remove,host);}});

tagEditor=ShioriTagEditor.create({document,getVault:()=>vault,getTarget:()=>({path:reader.model.tab?.path,host:$('#pane-tags-'+reader.model.activePane)}),invoke,onError:showError,onBusy:busy=>{tagEditing=busy;revisionEpoch++;reader.tagBusy(busy);setVaultBusy(vaultBusy);},onSaved:(result,path)=>{
 if(result.snapshot.token!==vault?.token)return;
 const previous=new Map(vault.notes.map(n=>[n.path,n.source_hash]));
 const reloadPaths=new Set(result.snapshot.notes.filter(n=>n.path===path||previous.get(n.path)!==n.source_hash).map(n=>n.path));
 vault=result.snapshot;invalidateGraph();hideSuggestions();changed=false;$('#notice').classList.remove('show');
 reader.metadataRefresh(reloadPaths);renderList();renderReadErrors();
 if(result.warning)notifications.warning(result.warning);
}});

noteMover=ShioriNoteMove.create({document,getVault:()=>vault,invoke,onError:showError,onBusy:busy=>{moving=busy;revisionEpoch++;setVaultBusy(vaultBusy);},onMoved:result=>{
 if(result.snapshot.token!==vault?.token)return;
 const previous=new Map(vault.notes.map(n=>[n.path,n.source_hash]));
 const reloadPaths=new Set(result.snapshot.notes.filter(n=>n.path===result.path||previous.get(n.path)!==n.source_hash).map(n=>n.path));
 vault=result.snapshot;invalidateGraph();hideSuggestions();changed=false;$('#notice').classList.remove('show');
 collapsedFolders.delete(ShioriFolders.parent(result.path));reader.moved(result.old_path,result.path,reloadPaths);renderList();renderReadErrors();
 if(result.warnings?.length)notifications.warning(result.warnings.join(' / '));
 if(!result.warnings?.length&&result.review?.references.length)notifications.warning(`移動しました: ${result.path}（参照先が変わるリンクがあります）`);
 [...$('#notes').querySelectorAll('[data-path]')].find(b=>b.dataset.path===result.path)?.focus();
}});
function beginMove(path,folder){if(!vaultBusy&&!tagEditing&&!moving)return noteMover.open(path,folder);}

terminalPanel=ShioriTerminal.create({document,invoke,listen,getContext:()=>!vaultBusy&&vault?{token:vault.token,root:vault.root}:null,onBusy:busy=>{terminalBusy=busy;setVaultBusy(vaultBusy);},onComplete:token=>{if(vault?.token===token){changed=true;$('#notice').classList.add('show');}}});

function renderList(){
 if(!vault)return;
 const focused=document.activeElement;
 const focusKey=['path','folder'].find(key=>focused?.dataset[key]!==undefined);
 const focusPath=focused?.dataset[focusKey];
 const focusContainer=focused?.closest('#notes, #currentNote')?.id;
 const matches=ShioriSearch.filter(vault.notes.filter(n=>n.path.startsWith('notes/')),{text:query,tags:activeTags});
 const filtered=!!query.trim()||!!activeTags.length;
 const inputFocused=focused?.id==='folderName',caret=focused?.selectionStart;
 const editor=()=>`<div class="folder-inline"><input id="folderName" aria-label="フォルダ名" autocomplete="off" value="${escape(folderEdit.value)}" ${moving?'disabled':''}><span class="sr-only">Enterで保存、Escapeで取消</span></div>`;
 let groupId=0;
 const renderFolder=({path,notes,children})=>{
  const expanded=filtered||!collapsedFolders.has(path),id=groupId++;
  const renaming=folderEdit?.mode==='rename'&&folderEdit.path===path;
  return `<section class="folder-group"><div class="folder-heading" data-folder-heading="${escape(path)}">${renaming?editor():`<button class="folder-row" data-folder="${escape(path)}" aria-expanded="${expanded}" aria-controls="folder-notes-${id}" title="${escape(path)}"><svg class="tree-icon folder-icon ${expanded?'open':'closed'}" viewBox="0 0 24 24" aria-hidden="true"><path d="${expanded?'M3 7V5h6l2 2h10v3M3 7h6l2 3h10l-3 10H3z':'M3 7V5h6l2 2h10v13H3z'}"/></svg><span class="folder-name">${escape(path.split('/').pop())}</span></button>`}</div><div class="folder-children" id="folder-notes-${id}" ${expanded?'':'hidden'}>${folderEdit?.mode==='create'&&folderEdit.path===path?editor():''}${children.map(renderFolder).join('')}${notes.map(n=>`<article class="note ${n.path===selected?'active':''}"><button class="note-open" draggable="true" aria-describedby="folderMoveHelp" title="${escape(n.title)} — ${escape(n.path)}" aria-label="${escape(n.title)} — ${escape(n.path)}" data-path="${escape(n.path)}" ${n.path===selected?'aria-current="true"':''}><svg class="tree-icon document-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6"/></svg><span class="note-title">${escape(n.title)}</span></button></article>`).join('')}</div></section>`;
 };
 $('#notes').innerHTML=ShioriFolders.tree(matches,ShioriFolders.folders(vault),filtered).map(renderFolder).join('')||'<div class="empty">一致するノートがありません</div>';
 if(inputFocused&&$('#folderName')){$('#folderName').focus();$('#folderName').setSelectionRange(caret,caret);}
 currentMatches=matches;if(graphMode)renderGraph();
 $('#results').textContent=`${matches.length} 件`;
 renderCurrentNote();
 if(focusContainer){const buttons=$('#'+focusContainer).querySelectorAll('button');[...buttons].find(b=>b.dataset[focusKey]===focusPath)?.focus();}
}
function renderCurrentNote(){
 const note=vault?.notes.find(n=>n.path===selected);
 const panel=$('#currentNote');
 panel.hidden=!note||currentMatches.some(n=>n.path===selected);
 panel.innerHTML=panel.hidden?'':`<div class="current-label">表示中 · 絞り込み対象外</div><strong title="${escape(note.path)}" aria-label="${escape(note.title)} — ${escape(note.path)}">${escape(note.title)}</strong>`;
}
function activateNoteList(e){
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.folder!==undefined){const path=button.dataset.folder;if(dragNote?.keyboard){const source=dragNote.path;const valid=dropFolder(e);clearDrag();if(valid)beginMove(source,path);return;}if(collapsedFolders.has(path))collapsedFolders.delete(path);else collapsedFolders.add(path);renderList();[...$('#notes').querySelectorAll('[data-folder]')].find(b=>b.dataset.folder===path)?.focus();return;}
 if(button.dataset.path!==undefined)openNote(button.dataset.path,'',e.shiftKey?'side':e.metaKey||e.ctrlKey?'tab':'current');
}
$('#notes').onclick=activateNoteList;
function dropFolder(e){const row=e.target.closest('[data-folder]');return row&&ShioriFolders.canDrop(dragNote,vault?.token,row.dataset.folder,ShioriFolders.folders(vault))?row:null;}
function clearDrag(){dragNote=null;for(const row of $('#notes').querySelectorAll('.drop-target'))row.classList.remove('drop-target');}
$('#notes').ondragstart=e=>{const button=e.target.closest('[data-path]');if(!button||vaultBusy||moving||tagEditing){e.preventDefault();return;}dragNote={token:vault.token,path:button.dataset.path};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-shiori-note',JSON.stringify(dragNote));};
$('#notes').ondragover=e=>{for(const row of $('#notes').querySelectorAll('.drop-target'))row.classList.remove('drop-target');const row=dropFolder(e);if(row){e.preventDefault();e.dataTransfer.dropEffect='move';row.classList.add('drop-target');}};
$('#notes').ondrop=e=>{e.preventDefault();if(!dragNote||e.dataTransfer?.getData('application/x-shiori-note')!==JSON.stringify(dragNote)){clearDrag();return;}const row=dropFolder(e),path=dragNote?.path;clearDrag();if(row){e.preventDefault();beginMove(path,row.dataset.folder);}};
$('#notes').ondragend=clearDrag;
$('#notes').oninput=e=>{if(e.target.id==='folderName'&&folderEdit)folderEdit.value=e.target.value;};
$('#notes').onkeydown=e=>{
 if(e.target.id==='folderName'){if(e.isComposing)return;if(e.key==='Enter'){e.preventDefault();saveFolder();}if(e.key==='Escape'&&!moving){e.preventDefault();const path=folderEdit.path;folderEdit=null;renderList();focusFolder(path);}return;}
 const row=e.target.closest('[data-folder]');
 if(row&&(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10'))){e.preventDefault();showFolderMenu(row.dataset.folder,row.getBoundingClientRect());return;}
 if(e.key==='Escape'){clearDrag();}
 if(e.key===' '&&!moving&&!tagEditing&&!vaultBusy){const button=e.target.closest('[data-path]');if(button){e.preventDefault();dragNote={token:vault.token,path:button.dataset.path,keyboard:true};notifications.info('移動先のフォルダへTabで移動し、Enterで格納します。Escapeで取消。');}}
};
function focusFolder(path){[...$('#notes').querySelectorAll('[data-folder]')].find(b=>b.dataset.folder===path)?.focus();}
let menuPath=null;
function closeFolderMenu(restore=false){$('#folderMenu').hidden=true;if(restore)focusFolder(menuPath);menuPath=null;}
function showFolderMenu(path,point){
 if(moving||vaultBusy||tagEditing)return;
 menuPath=path;const menu=$('#folderMenu');menu.innerHTML=`<button role="menuitem" data-action="create">新規フォルダ</button>${path==='notes'?'':'<button role="menuitem" data-action="rename">名称変更</button>'}`;menu.hidden=false;
 menu.style.left=Math.max(0,Math.min(point.left,window.innerWidth-180))+'px';menu.style.top=Math.max(0,Math.min(point.bottom??point.top,window.innerHeight-90))+'px';menu.querySelector('button').focus();
}
$('#notes').oncontextmenu=e=>{const row=e.target.closest('[data-folder-heading]');if(row&&!folderEdit){e.preventDefault();showFolderMenu(row.dataset.folderHeading,{left:e.clientX,top:e.clientY});}};
$('#folderMenu').onclick=e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action){const path=menuPath;closeFolderMenu();editFolder(action,path);}};
$('#folderMenu').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();closeFolderMenu(true);}if(e.key==='Tab')closeFolderMenu();if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const items=[...$('#folderMenu').querySelectorAll('button')],index=items.indexOf(document.activeElement);items[(index+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus();}};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#folderMenu'))closeFolderMenu();});
function editFolder(mode,path){
 if(vaultBusy||moving||tagEditing||!vault)return;
 closeFolderMenu();folderEdit={mode,path,token:vault.token,revision:vault.revision,value:mode==='rename'?path.split('/').pop():''};
 let ancestor=path;while(ancestor){collapsedFolders.delete(ancestor);ancestor=ShioriFolders.parent(ancestor);}
 renderList();const input=$('#folderName');input?.focus();input?.setSelectionRange(0,input.value.length);
}
async function saveFolder(){
 if(!folderEdit||moving||vaultBusy||tagEditing)return;const draft=folderEdit,name=$('#folderName').value;
 moving=true;revisionEpoch++;setVaultBusy(vaultBusy);$('#folderName').disabled=true;
 try{
  const result=await invoke(draft.mode==='create'?'create_note_folder':'rename_note_folder',draft.mode==='create'?{vaultToken:draft.token,parent:draft.path,name}:{vaultToken:draft.token,path:draft.path,name,expectedRevision:draft.revision});
  if(result.snapshot.token!==vault?.token)return;
  folderEdit=null;vault=result.snapshot;changed=false;$('#notice').classList.remove('show');invalidateGraph();hideSuggestions();collapsedFolders.clear();
  if(result.old_path){const paths=new Set(vault.notes.filter(n=>n.path.startsWith(result.path+'/')).map(n=>n.path));reader.moved(result.old_path,result.path,paths);}else reader.render();
  renderList();renderReadErrors();focusFolder(result.path);
 }catch(e){showError(String(e));}finally{moving=false;revisionEpoch++;if($('#folderName')){$('#folderName').disabled=false;$('#folderName').focus();}setVaultBusy(vaultBusy);}
}
function invalidateGraph(){graphKey=null;}
function clearNote(){reader.reset();selected='';renderList();}
function openNote(path,anchor='',mode='current'){
 if(!vault)return;setView(false);reader.open(path,anchor,mode,query.trim());
}
listen('note-served',e=>{if(vault)reader.served(e.payload);});

function renderReadErrors(){
 const errors=vault?.errors||[];
 $('#readErrors').hidden=!errors.length;
 $('#readErrorsSummary').textContent=`読み取りエラー ${errors.length}件`;
 $('#readErrorsList').innerHTML=errors.map(error=>`<li>${escape(error)}</li>`).join('');
 if(!errors.length)$('#readErrors').open=false;
}
function setVaultBusy(busy){vaultBusy=busy;for(const id of ['reload','update','open'])$('#'+id).disabled=busy||tagEditing||moving||(id==='open'&&terminalBusy);$('#reload').setAttribute('aria-busy',String(busy));$('#notes').setAttribute('aria-busy',String(busy));terminalPanel?.contextChanged();}

async function load(path=null){
 if(vaultBusy||terminalBusy||tagEditing||moving)return;setVaultBusy(true);clearTimeout(timer);
 try{
  vault=await invoke('open_vault',{path});
  $('#vaultWarnings').textContent=(vault.warnings||[]).join('\n');$('#vaultWarnings').hidden=!vault.warnings?.length;
  folderEdit=null;closeFolderMenu();collapsedFolders.clear();clearDrag();reader.reset();terminalPanel.reset();selected='';invalidateGraph();activeTags=[];query='';$('#search').value='';hideSuggestions();setView(false);
  $('#root').textContent=vault.root;$('#root').title=vault.root;$('#vaultName').textContent=vault.root.split('/').pop();$('#vaultName').title=vault.root;
  $('#notice').classList.remove('show');changed=false;
  renderList();const first=vault.notes.find(n=>n.path.startsWith('notes/'));if(first)openNote(first.path);else clearNote();
  renderReadErrors();
 }catch(e){showError(String(e));}finally{setVaultBusy(false);}
}
$('#open').onclick=async()=>{try{const path=await invoke('plugin:dialog|open',{options:{directory:true,multiple:false,title:'HTMLを保管したフォルダを選択'}});if(path)await load(path);}catch(e){showError(String(e));}};
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
 if(vaultBusy||tagEditing||moving||!vault)return;setVaultBusy(true);hideSuggestions();
 try{
  const wasGraph=graphMode;
  vault=await invoke('refresh_vault');invalidateGraph();
  changed=false;$('#notice').classList.remove('show');
  reader.refresh();renderList();
  setView(wasGraph);
  renderReadErrors();
 }catch(e){showError(String(e));}finally{setVaultBusy(false);}
}
$('#reload').onclick=refresh;$('#update').onclick=refresh;
let pollError=null;
setInterval(async()=>{if(!vault||vaultBusy||tagEditing||moving||revisionBusy||changed)return;revisionBusy=true;const epoch=revisionEpoch,token=vault.token;
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
