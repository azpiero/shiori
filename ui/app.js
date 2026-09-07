const boot = performance.now();
const {invoke} = window.__TAURI__.core;
const {listen} = window.__TAURI__.event;
let vault=null, selected='', query='', tag='', theme=localStorage.getItem('theme')||'light', switching=0, hits=0, hit=0, revisionBusy=false, changed=false, composing=false, displayedUrl='';
const metrics={uiReadyMs:0,scanMs:0,lastSwitchMs:0,imeCompositions:0};
const $=s=>document.querySelector(s);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('#app').innerHTML=`<header class="topbar"><div class="brand"><div class="logo">▱</div><div><strong>HTML Vault</strong><div class="caption">A quieter place for your ideas</div></div><span class="pill">表示試作 / 読み取り専用</span></div><div class="actions"><button id="sample">サンプル</button><button id="open" class="primary">フォルダを開く</button><button id="theme" title="ライト／ダーク切替">◐</button><button id="inspect">検証ログ</button></div></header><div class="layout"><aside class="sidebar"><div class="eyebrow">YOUR LIBRARY</div><div class="vault-name"><span id="vaultName">Sample Vault</span><span id="count" class="pill">—</span></div><div class="vault-path" id="root"></div><div class="search"><input id="search" placeholder="ノートを検索…" aria-label="ノートを検索" autocomplete="off"></div><div class="filter-tags" id="tags"></div><div class="list-head"><span>NOTES</span><span id="results"></span></div><div class="notes" id="notes"></div><div class="sidebar-footer">HTMLをそのまま正本に。<br>ノート内のJavaScript・外部資産は停止。<br>この試作はファイルを書き換えません。</div></aside><div class="splitter" id="splitter" role="separator" aria-label="サイドバー幅" aria-orientation="vertical"></div><main class="viewer"><div class="document-toolbar"><div id="breadcrumb" class="breadcrumb">ノートを選択</div><div class="document-tools"><select id="headings" aria-label="見出しへ移動"><option value="">見出しへ移動</option></select><button id="prev" title="前の検索箇所">↑</button><span id="hitCount" class="caption">—</span><button id="next" title="次の検索箇所">↓</button><button id="textFragment" title="iframeではText fragmentは対象外のため比較用">Text fragment検証</button><button id="reload">再読込</button></div></div><div class="notice" id="notice"><span id="noticeText">ファイルが変更されました。再読み込みで反映できます。</span><button id="update">更新を反映</button></div><div class="frame-wrap"><iframe id="noteFrame" sandbox="" referrerpolicy="no-referrer" title="HTMLノート（隔離表示）"></iframe><div id="loading" class="spinner">サンプルを読み込んでいます…</div></div><section id="diagnostics" class="diagnostics"><h3>表示試作の検証ログ</h3><p>配信ログはRust側が扱ったリクエストです。CSPがWebView内で止めた外部通信はここには届きません。</p><pre id="log"></pre></section></main></div><footer class="statusbar"><span id="status">準備中</span><span id="timing">Tauri + Rust · sandboxed iframe · WKWebView</span></footer>`;
function setTheme(){document.documentElement.classList.toggle('theme-dark',theme==='dark');localStorage.setItem('theme',theme);}
setTheme();
function status(s){$('#status').textContent=s;}
function noteUrl(path=selected){return `vault://localhost/${vault.token}/${path.split('/').map(encodeURIComponent).join('/')}`;}
function renderList(){
 if(!vault)return;
 const q=query.trim().toLocaleLowerCase();
 const matches=vault.notes.filter(n=>(!tag||n.tags.includes(tag))&&(!q||`${n.title}\n${n.text}`.toLocaleLowerCase().includes(q))).sort((a,b)=>Number(b.title.toLocaleLowerCase().includes(q))-Number(a.title.toLocaleLowerCase().includes(q)));
 $('#notes').innerHTML=matches.map(n=>`<button class="note ${n.path===selected?'active':''}" data-path="${escape(n.path)}"><div class="note-title"><span class="note-icon">▤</span>${escape(n.title)}</div><div class="note-path">${escape(n.path)}</div></button>`).join('')||'<div class="empty">一致するノートがありません</div>';
 $('#results').textContent=`${matches.length} 件`;
 $('#notes').querySelectorAll('button').forEach(b=>b.onclick=()=>openNote(b.dataset.path));
 $('#tags').innerHTML=['',...new Set(vault.notes.flatMap(n=>n.tags))].slice(0,12).map(t=>`<button class="tag ${t===tag?'active':''}" data-tag="${escape(t)}">${escape(t||'すべて')}</button>`).join('');
 $('#tags').querySelectorAll('button').forEach(b=>b.onclick=()=>{tag=b.dataset.tag;renderList();});
}
function selectedInfo(){const n=vault.notes.find(n=>n.path===selected);$('#breadcrumb').textContent=selected;$('#headings').innerHTML='<option value="">見出しへ移動</option>'+(n?.headings||[]).map(h=>`<option value="${escape(h.id)}">${escape(h.text)}</option>`).join('');renderList();}
function openNote(path,anchor=''){
 if(!vault)return;selected=path;hit=0;hits=0;selectedInfo();switching=performance.now();$('#loading').classList.remove('hidden');
 const u=new URL(noteUrl());u.searchParams.set('theme',theme);u.searchParams.set('q',query.trim());u.searchParams.set('v',vault.revision);u.hash=anchor||(query.trim()?'hv-hit-0':'');displayedUrl=u.href;$('#noteFrame').src=u.href;
}
$('#noteFrame').addEventListener('load',()=>{$('#loading').classList.add('hidden');metrics.lastSwitchMs=Math.round(performance.now()-switching);$('#timing').textContent=`UI ${metrics.uiReadyMs} ms · scan ${metrics.scanMs} ms · frame load ${metrics.lastSwitchMs} ms`;});
function updateHits(){$('#hitCount').textContent=hits?`${hit+1}/${hits}`:'—';$('#prev').disabled=!hits;$('#next').disabled=!hits;}
listen('note-served',e=>{if(!vault)return; selected=e.payload.path;displayedUrl=e.payload.url;hits=e.payload.hits;hit=0;selectedInfo();updateHits();status(`表示中: ${selected}  ·  正本への書き込みなし`);});
async function load(path=null){status('HTMLを解析しています…');$('#loading').classList.remove('hidden');try{vault=await invoke('open_vault',{path});metrics.scanMs=vault.scan_ms;tag='';query='';$('#search').value='';$('#root').textContent=vault.root;$('#root').title=vault.root;$('#vaultName').textContent=vault.root.split('/').pop();$('#count').textContent=vault.notes.length;$('#notice').classList.remove('show');changed=false;renderList();if(vault.notes.length)openNote(vault.notes[0].path);else{$('#noteFrame').src='about:blank';$('#loading').classList.add('hidden');status('HTMLノートがありません');}if(vault.errors.length)status(`${vault.errors.length}件の読み取りエラー（検証ログ参照）`);}catch(e){status(String(e));$('#loading').classList.add('hidden');}}
$('#open').onclick=async()=>{try{const path=await invoke('plugin:dialog|open',{options:{directory:true,multiple:false,title:'HTMLを保管したフォルダを選択'}});if(path)await load(path);}catch(e){status(String(e));}};
$('#sample').onclick=()=>load();
$('#theme').onclick=()=>{theme=theme==='light'?'dark':'light';setTheme();if(selected)openNote(selected);};
$('#search').addEventListener('compositionstart',()=>composing=true);
$('#search').addEventListener('compositionend',()=>{composing=false;metrics.imeCompositions++;search();});
let timer;function search(){if(composing)return;clearTimeout(timer);timer=setTimeout(()=>{query=$('#search').value;renderList();},120);}
$('#search').addEventListener('input',search);
$('#search').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&!composing){query=$('#search').value;renderList();const first=$('#notes button');if(first)openNote(first.dataset.path);}});
$('#headings').onchange=e=>{if(e.target.value){const u=new URL(displayedUrl||$('#noteFrame').src);u.hash=e.target.value;$('#noteFrame').src=u.href;}};
function moveHit(delta){if(!hits)return;hit=(hit+delta+hits)%hits;const u=new URL(displayedUrl||$('#noteFrame').src);u.hash=`hv-hit-${hit}`;$('#noteFrame').src=u.href;updateHits();}
$('#prev').onclick=()=>moveHit(-1);$('#next').onclick=()=>moveHit(1);
$('#textFragment').onclick=()=>{if(!selected)return;const word=query.trim()||'知識';const u=new URL(noteUrl());u.searchParams.set('theme',theme);u.hash=`:~:text=${encodeURIComponent(word)}`;$('#noteFrame').src=u.href;status('Text fragment比較中。iframeでは移動対象外。通常検索は表示コピーのアンカーで移動します。');};
async function refresh(){try{const old=selected;vault=await invoke('refresh_vault');metrics.scanMs=vault.scan_ms;changed=false;$('#notice').classList.remove('show');renderList();if(vault.notes.length){openNote(vault.notes.some(n=>n.path===old)?old:vault.notes[0].path);}else{selected='';$('#noteFrame').src='about:blank';$('#breadcrumb').textContent='ノートがありません';$('#loading').classList.add('hidden');}}catch(e){status(String(e));}}
$('#reload').onclick=refresh;$('#update').onclick=refresh;
$('#inspect').onclick=async()=>{const d=await invoke('diagnostics');$('#log').textContent=JSON.stringify({metrics,scanErrors:vault?.errors||[],...d},null,2);$('#diagnostics').classList.toggle('show');};
setInterval(async()=>{if(!vault||revisionBusy||changed)return;revisionBusy=true;try{const rev=await invoke('vault_revision');if(rev!==vault.revision){changed=true;$('#notice').classList.add('show');}}catch(e){status(String(e));}finally{revisionBusy=false;}},2000);
$('#splitter').onpointerdown=e=>{e.preventDefault();const shield=document.createElement('div');Object.assign(shield.style,{position:'fixed',inset:'0',zIndex:50,cursor:'col-resize'});document.body.append(shield);const move=e=>document.documentElement.style.setProperty('--sidebar',`${Math.max(210,Math.min(460,e.clientX))}px`);shield.onpointermove=move;shield.onpointerup=()=>shield.remove();};
metrics.uiReadyMs=Math.round(performance.now()-boot);updateHits();load();
