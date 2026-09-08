const boot = performance.now();
const {invoke} = window.__TAURI__.core;
const {listen} = window.__TAURI__.event;
let vault=null, selected='', query='', activeTags=[], theme=localStorage.getItem('theme')||'light', revisionBusy=false, changed=false, composing=false;
let graphMode=false,graphPage=0,graphScale=1,graphX=0,graphY=0,currentMatches=[],graphKey=null,vaultBusy=false;
let terminalPanel=null,terminalBusy=false,tagEditing=false,tagEditor=null,revisionEpoch=0,moving=false,noteMover=null,dragNote=null;
const collapsedFolders=new Set();let folderEdit=null;
const metrics={uiReadyMs:0,scanMs:0};
const $=s=>document.querySelector(s);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('#app').innerHTML=`<div class="layout">
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
<button id="showTerminal" title="Terminal" aria-label="ターミナル" aria-pressed="false" aria-controls="terminalPanel">&gt;_</button>
<button id="theme" title="ダークモード" aria-label="ダークモード" aria-pressed="false">◐</button>
</nav>
<aside class="sidebar">
<div class="eyebrow">YOUR LIBRARY</div>
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
<div class="list-head">
<span>NOTES</span><button id="newFolder" class="folder-tool" title="notesにフォルダを作成" aria-label="フォルダを作成">＋</button>
<span id="results">
</span>
</div>
<div id="folderEditor" class="folder-editor" hidden><label id="folderEditorLabel" for="folderName"></label><input id="folderName" aria-label="フォルダ名" autocomplete="off"><div><button id="saveFolder">保存</button><button id="cancelFolder">取消</button></div><span id="folderError" role="status"></span></div><details id="moveReport" class="move-report" hidden><summary>移動後に確認する参照</summary><div id="moveReportBody"></div></details>
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
<section id="terminalPanel" class="terminal-panel" aria-label="ターミナル" hidden></section>
</div>
</div>
<footer class="statusbar">
<span class="read-only" title="本文は閲覧専用です。タグ編集とフォルダ移動は確認後に実行します。ターミナルの外部プロセスも編集できます。">本文は閲覧・タグ編集／移動可</span>
<span id="status">準備中</span>
<span id="timing">Tauri + Rust · sandboxed iframe · WKWebView</span>
</footer>`;
function setTheme(){document.documentElement.classList.toggle('theme-dark',theme==='dark');localStorage.setItem('theme',theme);$('#theme').setAttribute('aria-pressed',String(theme==='dark'));}
setTheme();
function status(s){$('#status').textContent=s;}
const reader=ShioriReader.create({document,getVault:()=>vault,getTheme:()=>theme,onSelect:path=>{selected=path;renderList();terminalPanel?.contextChanged();status(path?`表示中: ${path}`:'一覧からノートを開いてください');},onStatus:status,onTag:setTag,onEditTags:(path,remove)=>{if(!vaultBusy&&!moving)tagEditor.open(path,remove);}});

tagEditor=ShioriTagEditor.create({document,getVault:()=>vault,invoke,onBusy:busy=>{tagEditing=busy;revisionEpoch++;setVaultBusy(vaultBusy);},onSaved:(result,path)=>{
 if(result.snapshot.token!==vault?.token)return;
 const previous=new Map(vault.notes.map(n=>[n.path,n.source_hash]));
 const reloadPaths=new Set(result.snapshot.notes.filter(n=>n.path===path||previous.get(n.path)!==n.source_hash).map(n=>n.path));
 vault=result.snapshot;metrics.scanMs=vault.scan_ms;invalidateGraph();hideSuggestions();changed=false;$('#notice').classList.remove('show');
 reader.metadataRefresh(reloadPaths);renderList();renderReadErrors();
 status(result.warning||'タグを保存しました');
 $('#pane-tags-'+reader.model.activePane)?.querySelector('[data-add-tag]')?.focus();
}});

noteMover=ShioriNoteMove.create({document,getVault:()=>vault,invoke,onError:status,onBusy:busy=>{moving=busy;revisionEpoch++;setVaultBusy(vaultBusy);},onMoved:result=>{
 if(result.snapshot.token!==vault?.token)return;
 const previous=new Map(vault.notes.map(n=>[n.path,n.source_hash]));
 const reloadPaths=new Set(result.snapshot.notes.filter(n=>n.path===result.path||previous.get(n.path)!==n.source_hash).map(n=>n.path));
 vault=result.snapshot;metrics.scanMs=vault.scan_ms;invalidateGraph();hideSuggestions();changed=false;$('#notice').classList.remove('show');
 collapsedFolders.delete(ShioriFolders.parent(result.path));reader.moved(result.old_path,result.path,reloadPaths);renderList();renderReadErrors();
 status(result.warnings?.join(' / ')||`移動しました: ${result.old_path} → ${result.path}`);
 const review=result.review;$('#moveReport').hidden=!review||(!review.references.length&&!review.warnings.length);
 if(review)$('#moveReportBody').innerHTML=review.references.map(r=>`<p><strong>${escape(r.note)}</strong><br>${escape(r.value)}<br>${escape(r.before)} → ${escape(r.after)}</p>`).join('')+review.warnings.map(w=>`<p>${escape(w)}</p>`).join('')+(review.omitted?`<p>ほか${review.omitted}件</p>`:'');
 [...$('#notes').querySelectorAll('[data-path]')].find(b=>b.dataset.path===result.path)?.focus();
}});
function beginMove(path,folder){if(!vaultBusy&&!tagEditing&&!moving)return noteMover.open(path,folder);}

terminalPanel=ShioriTerminal.create({document,invoke,listen,getContext:()=>!vaultBusy&&vault?{token:vault.token,root:vault.root}:null,onBusy:busy=>{terminalBusy=busy;setVaultBusy(vaultBusy);},onComplete:token=>{if(vault?.token===token){changed=true;$('#notice').classList.add('show');}}});

function renderList(){
 if(!vault)return;
 const focused=document.activeElement;
 const focusKey=['path','folder','createFolder','renameFolder'].find(key=>focused?.dataset[key]!==undefined);
 const focusPath=focused?.dataset[focusKey];
 const focusContainer=focused?.closest('#notes, #currentNote')?.id;
 const matches=ShioriSearch.filter(vault.notes.filter(n=>n.path.startsWith('notes/')),{text:query,tags:activeTags});
 const filtered=!!query.trim()||!!activeTags.length;
 $('#notes').innerHTML=ShioriFolders.groups(matches,ShioriFolders.folders(vault),filtered).map(({path,notes},i)=>{
  const expanded=filtered||!collapsedFolders.has(path);
  return `<section class="folder-group"><div class="folder-heading"><button class="folder-row" data-folder="${escape(path)}" aria-expanded="${expanded}" aria-controls="folder-notes-${i}" title="${escape(path)}"><span aria-hidden="true">${expanded?'▾':'▸'}</span><span class="folder-name">${escape(path)}</span><span class="folder-count">${notes.length}</span></button><button class="folder-tool" data-create-folder="${escape(path)}" aria-label="${escape(path)}にフォルダを作成" title="子フォルダを作成">＋</button>${path!=='notes'?`<button class="folder-tool" data-rename-folder="${escape(path)}" aria-label="${escape(path)}の名称変更" title="名称変更">✎</button>`:''}</div><div id="folder-notes-${i}" ${expanded?'':'hidden'}>`+notes.map(n=>`<article class="note ${n.path===selected?'active':''}"><button class="note-open" draggable="true" aria-describedby="folderMoveHelp" title="${escape(n.path)}" aria-label="${escape(n.title)} — ${escape(n.path)}" data-path="${escape(n.path)}" ${n.path===selected?'aria-current="true"':''}><span class="note-title">${escape(n.title)}</span></button></article>`).join('')+'</div></section>';
 }).join('')||'<div class="empty">一致するノートがありません</div>';
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
 if(button.dataset.createFolder!==undefined){editFolder('create',button.dataset.createFolder);return;}
 if(button.dataset.renameFolder!==undefined){editFolder('rename',button.dataset.renameFolder);return;}
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
$('#notes').onkeydown=e=>{if(e.key==='Escape'){clearDrag();status('移動を取消しました');}if(e.key===' '&&!moving&&!tagEditing&&!vaultBusy){const button=e.target.closest('[data-path]');if(button){e.preventDefault();dragNote={token:vault.token,path:button.dataset.path,keyboard:true};status('移動先のフォルダへTabで移動し、Enterで格納します。Escapeで取消。');}}};
function editFolder(mode,path){if(vaultBusy||moving||tagEditing||!vault)return;folderEdit={mode,path,token:vault.token,revision:vault.revision};$('#folderEditor').hidden=false;$('#folderEditorLabel').textContent=mode==='rename'?`${path} の名称変更`:`${path} にフォルダを作成`;$('#folderName').value=mode==='rename'?path.split('/').pop():'';$('#folderError').textContent='';$('#folderName').focus();}
$('#newFolder').onclick=()=>editFolder('create','notes');
$('#cancelFolder').onclick=()=>{if(moving)return;folderEdit=null;$('#folderEditor').hidden=true;};
$('#saveFolder').onclick=async()=>{
 if(!folderEdit||moving||vaultBusy||tagEditing)return;const draft=folderEdit,name=$('#folderName').value;
 moving=true;revisionEpoch++;setVaultBusy(vaultBusy);$('#saveFolder').disabled=true;$('#cancelFolder').disabled=true;
 try{
  const result=await invoke(draft.mode==='create'?'create_note_folder':'rename_note_folder',draft.mode==='create'?{vaultToken:draft.token,parent:draft.path,name}:{vaultToken:draft.token,path:draft.path,name,expectedRevision:draft.revision});
  if(result.snapshot.token!==vault?.token)return;
  vault=result.snapshot;changed=false;$('#notice').classList.remove('show');invalidateGraph();hideSuggestions();collapsedFolders.clear();
  if(result.old_path){const paths=new Set(vault.notes.filter(n=>n.path.startsWith(result.path+'/')).map(n=>n.path));reader.moved(result.old_path,result.path,paths);$('#moveReport').hidden=false;$('#moveReportBody').textContent=`${result.old_path} → ${result.path}。フォルダ内外の相対リンク・画像参照は自動修復していません。内容を確認してください。`;}else reader.render();
  renderList();renderReadErrors();folderEdit=null;$('#folderEditor').hidden=true;status(result.snapshot.errors.length?'フォルダ操作は完了しました。一部の読み取りエラーを確認してください':`フォルダを${draft.mode==='create'?'作成':'変更'}しました: ${result.path}`);
 }catch(e){$('#folderError').textContent=String(e);}finally{moving=false;revisionEpoch++;$('#saveFolder').disabled=false;$('#cancelFolder').disabled=false;setVaultBusy(vaultBusy);}
};
$('#folderName').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();$('#saveFolder').onclick();}if(e.key==='Escape')$('#cancelFolder').onclick();};
function invalidateGraph(){graphKey=null;graphPage=0;}
function clearNote(){reader.reset();selected='';renderList();status('HTMLノートがありません');}
function openNote(path,anchor='',mode='current'){
 if(!vault)return;setView(false);reader.open(path,anchor,mode,query.trim());
}
listen('note-served',e=>{if(vault)reader.served(e.payload);});

function renderReadErrors(){
 const errors=vault?.errors||[];
 $('#readErrors').hidden=!errors.length;
 $('#readErrorsSummary').textContent=`読み取りエラー ${errors.length}件`;
 $('#readErrorsList').innerHTML=errors.map(error=>`<li>${escape(error)}</li>`).join('');
 if(errors.length)status(`${errors.length}件の読み取りエラー（サイドバーで詳細を確認）`);
 else $('#readErrors').open=false;
}
function setVaultBusy(busy){vaultBusy=busy;for(const id of ['reload','update','open'])$('#'+id).disabled=busy||tagEditing||moving||(id==='open'&&terminalBusy);$('#reload').setAttribute('aria-busy',String(busy));terminalPanel?.contextChanged();}

async function load(path=null){
 if(vaultBusy||terminalBusy||tagEditing||moving)return;setVaultBusy(true);clearTimeout(timer);
 status('HTMLを解析しています…');
 try{
  vault=await invoke('open_vault',{path});metrics.scanMs=vault.scan_ms;
  $('#vaultWarnings').textContent=(vault.warnings||[]).join('\n');$('#vaultWarnings').hidden=!vault.warnings?.length;
  folderEdit=null;$('#folderEditor').hidden=true;$('#moveReport').hidden=true;collapsedFolders.clear();clearDrag();reader.reset();terminalPanel.reset();selected='';invalidateGraph();activeTags=[];query='';$('#search').value='';hideSuggestions();setView(false);
  $('#root').textContent=vault.root;$('#root').title=vault.root;$('#vaultName').textContent=vault.root.split('/').pop();$('#vaultName').title=vault.root;
  $('#notice').classList.remove('show');changed=false;
  renderList();const first=vault.notes.find(n=>n.path.startsWith('notes/'));if(first)openNote(first.path);else clearNote();
  renderReadErrors();$('#timing').textContent=`UI ${metrics.uiReadyMs} ms · scan ${metrics.scanMs} ms`;
 }catch(e){status(String(e));}finally{setVaultBusy(false);}
}
$('#open').onclick=async()=>{try{const path=await invoke('plugin:dialog|open',{options:{directory:true,multiple:false,title:'HTMLを保管したフォルダを選択'}});if(path)await load(path);}catch(e){status(String(e));}};
$('#theme').onclick=()=>{theme=theme==='light'?'dark':'light';setTheme();reader.theme();};
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
 if(vaultBusy||tagEditing||moving||!vault)return;setVaultBusy(true);hideSuggestions();status('Vault全体を再読込しています…');
 try{
  const wasGraph=graphMode;
  vault=await invoke('refresh_vault');metrics.scanMs=vault.scan_ms;invalidateGraph();
  changed=false;$('#notice').classList.remove('show');
  reader.refresh();renderList();
  setView(wasGraph);
  renderReadErrors();$('#timing').textContent=`UI ${metrics.uiReadyMs} ms · scan ${metrics.scanMs} ms`;
 }catch(e){status(String(e));}finally{setVaultBusy(false);}
}
$('#reload').onclick=refresh;$('#update').onclick=refresh;
setInterval(async()=>{if(!vault||vaultBusy||tagEditing||moving||revisionBusy||changed)return;revisionBusy=true;const epoch=revisionEpoch,token=vault.token;try{const rev=await invoke('vault_revision');if(epoch===revisionEpoch&&token===vault?.token&&!vaultBusy&&rev!==vault.revision){changed=true;$('#notice').classList.add('show');}}catch(e){status(String(e));}finally{revisionBusy=false;}},2000);
$('#splitter').onpointerdown=e=>{e.preventDefault();const shield=document.createElement('div');Object.assign(shield.style,{position:'fixed',inset:'0',zIndex:50,cursor:'col-resize'});document.body.append(shield);const move=e=>document.documentElement.style.setProperty('--sidebar',`${Math.max(210,Math.min(460,window.innerWidth-$('.view-nav').offsetWidth-325,e.clientX-$('.view-nav').getBoundingClientRect().right))}px`);shield.onpointermove=move;shield.onpointerup=()=>shield.remove();};
function setTag(value){
 const parsed=ShioriSearch.parse($('#search').value);
 $('#search').value=[parsed.text,value?ShioriSearch.formatTag(value):''].filter(Boolean).join(' ');
 clearTimeout(timer);hideSuggestions();applySearch();
}
function setView(graph){graphMode=graph;$('#graphPanel').hidden=!graph;$('#readerPanel').hidden=graph;$('#showGraph').setAttribute('aria-pressed',String(graph));$('#showNote').setAttribute('aria-pressed',String(!graph));if(graph)renderGraph();}
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
function activateGraph(e){if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;if(e.type==='click'&&suppressGraphClick){suppressGraphClick=false;return;}const node=e.target.closest('.graph-node');if(!node)return;e.preventDefault();if(node.dataset.kind==='tag'){setTag(node.dataset.value);$('#showGraph').focus();}else{openNote(node.dataset.value,'',e.shiftKey?'side':e.metaKey||e.ctrlKey?'tab':'current');$('#showNote').focus();}}
$('#graphSvg').onclick=activateGraph;$('#graphSvg').onkeydown=activateGraph;
metrics.uiReadyMs=Math.round(performance.now()-boot);load();
