(function(root){
 const {Workspace}=typeof module!=='undefined'?require('./workspace.js'):root.ShioriWorkspace;
 function create({document,getVault,getTheme,onSelect,onStatus,onTag=()=>{},onEditTags=()=>{}}){
  let tagWriting=false;
  const model=new Workspace(),frames=new Map(),tabMarkup=new Map(),tagMarkup=new Map();
  const $=id=>document.querySelector(id);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const current=i=>model.panes[i]?.tabs.find(t=>t.id===model.panes[i].active);
  $('#readerPanel').innerHTML=[0,1].map(i=>`<section id="pane-${i}" class="reader-pane" tabindex="0" aria-label="ペイン ${i+1}" hidden>
   <div class="pane-actions"><button data-action="split" title="隣にペインを増やす" aria-label="隣にペインを増やす"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 21H3V3h18v9M8 3v18M18 14v8M14 18h8"/></svg></button><button data-action="close-pane" title="このペインを削除" aria-label="ペイン ${i+1}を削除"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 21H3V3h18v9M8 3v18M14 18h8"/></svg></button></div>
   <div id="tabs-${i}" class="reader-tabs" role="tablist" aria-label="ペイン ${i+1}のタブ"></div>
   <div id="pane-tags-${i}" class="pane-tags" role="group" aria-label="ペイン ${i+1}のノートのタグ" hidden></div>
   <div id="pane-search-${i}" class="pane-search"><input id="pane-query-${i}" aria-label="ペイン ${i+1}の本文内検索" placeholder="本文内を検索（Enter）"><button data-action="search" aria-label="ペイン ${i+1}を検索">検索</button><button data-action="clear" aria-label="ペイン ${i+1}の検索を解除">×</button><span id="pane-hits-${i}" aria-live="polite"></span><button id="pane-prev-${i}" data-action="prev" aria-label="前の検索箇所">↑</button><button id="pane-next-${i}" data-action="next-hit" aria-label="次の検索箇所">↓</button></div>
   <div id="documents-${i}" class="pane-documents"><div id="pane-empty-${i}" class="empty">このペインを選択して、一覧からノートを開いてください。</div></div>
  </section>`).join('<div id="pane-splitter" class="pane-splitter" role="separator" tabindex="0" aria-label="左右ペインの幅" aria-orientation="vertical" aria-controls="pane-0 pane-1" title="ドラッグまたは←/→で幅を変更、Homeで最小、Endまたはダブルクリックで等幅" hidden></div>');
  const workspace=$('#readerPanel'),separator=$('#pane-splitter'),view=document.defaultView;
  let ratio=.5,drag=null,resizeFrame=null,pendingX=null;
  const split=()=>model.panes.every(Boolean);
  function geometry(){
   const width=Math.max(640,(workspace.clientWidth||0)-5),min=320/width;
   return {width,min,value:Math.max(min,Math.min(1-min,ratio))};
  }
  function resize(){
   const {width,min,value}=geometry();
   workspace.style.setProperty('--pane-a',`${width*value}px`);
   workspace.style.setProperty('--pane-b',`${width*(1-value)}px`);
   for(const [key,n] of Object.entries({min:min*100,max:(1-min)*100,now:value*100}))separator.setAttribute('aria-value'+key,String(Math.round(n*100)/100));
   separator.setAttribute('aria-valuetext',`左 ${Math.round(value*100)}%、右 ${Math.round((1-value)*100)}%`);
  }
  function setRatio(value){const {min}=geometry();ratio=Math.max(min,Math.min(1-min,value));resize();}
  function moveDivider(){
   resizeFrame=null;
   if(!drag||pendingX===null)return;
   const x=pendingX;pendingX=null;
   setRatio((x-workspace.getBoundingClientRect().left+(workspace.scrollLeft||0)-drag.offset)/geometry().width);
  }
  function stopDrag(){
   if(resizeFrame!==null)view.cancelAnimationFrame(resizeFrame);
   resizeFrame=null;pendingX=null;
   if(drag){const {shield,id}=drag;drag=null;shield.remove();if(separator.hasPointerCapture?.(id))separator.releasePointerCapture(id);}
  }
  separator.onpointerdown=e=>{
   if(!split()||e.button!==0||drag)return;
   e.preventDefault();separator.focus();
   const shield=document.createElement('div');shield.className='pane-resize-shield';
   document.body.append(shield);
   drag={shield,id:e.pointerId,offset:e.clientX-separator.getBoundingClientRect().left};
   separator.onpointermove=event=>{
    if(event.pointerId!==drag?.id)return;
    pendingX=event.clientX;
    if(resizeFrame===null)resizeFrame=view.requestAnimationFrame(moveDivider);
   };
   separator.onpointerup=event=>{if(event.pointerId!==drag?.id)return;if(resizeFrame!==null)view.cancelAnimationFrame(resizeFrame);pendingX=event.clientX;moveDivider();stopDrag();};
   separator.onpointercancel=separator.onlostpointercapture=()=>stopDrag();
   separator.setPointerCapture?.(e.pointerId);
  };
  separator.ondblclick=()=>{if(split())setRatio(.5);};
  separator.onkeydown=e=>{
   if(!split()||e.isComposing)return;
   let value;
   if(e.key==='ArrowLeft')value=geometry().value-.05;
   if(e.key==='ArrowRight')value=geometry().value+.05;
   if(e.key==='Home')value=0;
   if(e.key==='End')value=.5;
   if(value!==undefined){e.preventDefault();setRatio(value);}
   if(e.key==='Escape')stopDrag();
  };
  view?.addEventListener('blur',stopDrag);
  if(view?.ResizeObserver)new view.ResizeObserver(resize).observe(workspace);
  else view?.addEventListener('resize',resize);
  function note(path){return getVault()?.notes.find(n=>n.path===path);}
  function notify(){onSelect(model.tab?.path||'');}
  function markActive(){for(let i=0;i<2;i++){const section=$('#pane-'+i);section.classList.toggle('active',i===model.activePane);section.setAttribute('aria-label',`ペイン ${i+1}${i===model.activePane?'（選択中）':''}`);}}
  function focusPane(i){const tab=current(i);if(tab)$('#tab-'+tab.id).focus();else $('#pane-'+i).focus();$('#pane-'+i).scrollIntoView({block:'nearest',inline:'nearest'});}
  function activate(i,focus=false){model.activate(i);render();notify();if(focus)focusPane(i);}
  function frameFor(tab){
   if(frames.has(tab.id))return frames.get(tab.id);
   const panel=document.createElement('div');panel.id='panel-'+tab.id;panel.className='tab-document';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+tab.id);
   const frame=document.createElement('iframe');frame.id='frame-'+tab.id;frame.setAttribute('sandbox','');frame.setAttribute('referrerpolicy','no-referrer');frame.dataset.readerTab=tab.id;
   frame.addEventListener('load',()=>{if(model.find(tab.id)){tab.loading=false;render();}});
   frame.addEventListener('focus',()=>{const i=model.panes.findIndex(p=>p?.tabs.some(t=>t.id===tab.id));if(i>=0)activate(i);});
   const empty=document.createElement('div');empty.className='empty';empty.textContent='このペインを選択して、一覧からノートを開いてください。';panel.append(empty);panel.append(frame);const entry={panel,frame,empty};frames.set(tab.id,entry);return entry;
  }
  function navigate(tab){
   if(!tab.path)return;
   const vault=getVault(),url=new URL(`vault://localhost/${vault.token}/${tab.path.split('/').map(encodeURIComponent).join('/')}`);
   tab.request=model.id();tab.hits=0;tab.hit=0;tab.loading=true;
   for(const [key,value] of Object.entries({theme:getTheme(),q:tab.query,v:vault.revision,view:tab.id,request:tab.request}))url.searchParams.set(key,value);
   url.hash=tab.anchor||(tab.query?'shiori-hit-0':'');tab.url=url.href;
   const {frame}=frameFor(tab);frame.title=note(tab.path)?.title||tab.path;frame.src=url.href;
  }
  function render(){
   const focusId=document.activeElement?.id?.startsWith('tab-')?document.activeElement.id:null;
   const ids=new Set(model.all().map(t=>t.id));
   for(const [id,{panel}] of frames)if(!ids.has(id)){panel.remove();frames.delete(id);}
   workspace.classList.toggle('split',split());separator.hidden=!split();
   if(!split())stopDrag();
   resize();
   for(let i=0;i<2;i++){
    const pane=model.panes[i],section=$('#pane-'+i);section.hidden=!pane;if(!pane)continue;
    section.classList.toggle('active',i===model.activePane);
    section.setAttribute('aria-label',`ペイン ${i+1}${i===model.activePane?'（選択中）':''}`);
    section.querySelector('[data-action="close-pane"]').disabled=!split();section.querySelector('[data-action="split"]').disabled=split();
    const tab=current(i),query=$('#pane-query-'+i);
    if(document.activeElement!==query)query.value=tab?.query||'';
    query.disabled=!tab?.path;$('#pane-search-'+i).hidden=!tab?.path;
    const tabsHtml=pane.tabs.map(t=>`<div class="reader-tab ${t.id===pane.active?'active':''}"><button id="tab-${t.id}" role="tab" data-tab="${t.id}" aria-selected="${t.id===pane.active}" aria-controls="panel-${t.id}" tabindex="${t.id===pane.active?0:-1}" title="${escape(t.path)}">${escape(note(t.path)?.title||'新しいタブ')}</button><button data-close="${t.id}" aria-label="タブを閉じる: ${escape(note(t.path)?.title||'新しいタブ')}">×</button></div>`).join('');
    if(tabMarkup.get(i)!==tabsHtml){$('#tabs-'+i).innerHTML=tabsHtml;tabMarkup.set(i,tabsHtml);}
    const tags=note(tab?.path)?.tags||[],tagsPanel=$('#pane-tags-'+i);
    tagsPanel.hidden=!tab?.path;
    const tagsHtml=tab?.path?(tags.map(tag=>`<span class="tag-chip"><button class="note-tag" data-tag="${escape(tag)}" title="タグで絞り込む: ${escape(tag)}" aria-label="タグで絞り込む: ${escape(tag)}">#${escape(tag)}</button><button data-remove-tag="${escape(tag)}" aria-label="タグを外す: ${escape(tag)}">×</button></span>`).join('')||'<span class="untagged">タグなし</span>')+'<button data-add-tag aria-label="タグを追加">＋</button>':'';
    if(tagMarkup.get(i)!==tagsHtml){tagsPanel.innerHTML=tagsHtml;tagMarkup.set(i,tagsHtml);}
    tagsPanel.querySelectorAll('button, input').forEach(el=>el.disabled=tagWriting);
    $('#pane-hits-'+i).textContent=tab?.query?(tab.loading?'読込中':tab.hits?`${tab.hit+1} / ${tab.hits}`:'0件'):'';
    for(const direction of ['prev','next'])$('#pane-'+direction+'-'+i).disabled=!tab?.hits||tab.loading;
    $('#pane-empty-'+i).hidden=!!tab;
    for(const t of pane.tabs){
     const {panel,frame,empty}=frameFor(t);panel.hidden=t.id!==pane.active;frame.hidden=!t.path;empty.hidden=!!t.path;
     // Never detach an existing iframe during tab switches: its scroll stays intact.
     if(panel.parentNode!==$('#documents-'+i))$('#documents-'+i).append(panel);
     if(!t.path&&!frame.src)frame.src='about:blank';
    }
   }
   if(focusId)$('#'+focusId)?.focus();
  }
  function open(path,anchor='',mode='current',query=''){
   if(path&&!note(path))return;
   try{const tab=model.open(path,query,mode,anchor);navigate(tab);render();notify();return tab;}catch(e){onStatus(e.message);}
  }
  function moveHit(i,delta){const tab=current(i);if(!tab?.hits)return;tab.hit=(tab.hit+delta+tab.hits)%tab.hits;const url=new URL(tab.url);url.hash='shiori-hit-'+tab.hit;tab.url=url.href;frames.get(tab.id).frame.src=url.href;render();}
  function search(i,clear=false){const tab=current(i);if(!tab?.path)return;tab.query=clear?'':$('#pane-query-'+i).value.trim();tab.anchor='';navigate(tab);render();notify();}
  function closeTab(i,id){model.close(i,id);render();notify();const active=current(i);if(active)$('#tab-'+active.id).focus();else focusPane(i);}
  for(let i=0;i<2;i++){
   $('#pane-'+i).addEventListener('pointerdown',()=>{if(model.activePane!==i){model.activate(i);markActive();notify();}});
   $('#pane-'+i).addEventListener('focusin',()=>{if(model.activePane!==i){model.activate(i);markActive();notify();}});
   $('#pane-'+i).onclick=e=>{
    const button=e.target.closest('button');if(!button)return;
    model.activate(i);
    if(button.dataset.removeTag!==undefined||button.dataset.addTag!==undefined){const path=current(i)?.path;if(path)onEditTags(path,button.dataset.removeTag,$('#pane-tags-'+i));return;}
    if(button.dataset.tag!==undefined){render();notify();onTag(button.dataset.tag);return;}
    if(button.dataset.tab){model.select(i,button.dataset.tab);render();notify();$('#tab-'+button.dataset.tab).focus();return;}
    if(button.dataset.close){closeTab(i,button.dataset.close);return;}
    switch(button.dataset.action){
     case 'split':if(!split()){const tab=open(current(i)?.path||'',current(i)?.anchor||'','side',current(i)?.query||'');if(tab)focusPane(model.activePane);}break;
     case 'close-pane':model.closePane(i);render();notify();focusPane(model.activePane);break;
     case 'search':search(i);break;case 'clear':search(i,true);break;
     case 'prev':moveHit(i,-1);break;case 'next-hit':moveHit(i,1);break;
    }
   };
   $('#pane-query-'+i).onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();model.activate(i);search(i);}};
   $('#tabs-'+i).onkeydown=e=>{
    const button=e.target.closest('[role="tab"]');if(!button)return;
    const tabs=model.panes[i].tabs,index=tabs.findIndex(t=>t.id===button.dataset.tab);
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();closeTab(i,button.dataset.tab);return;}
    let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;
    if(next!==undefined){e.preventDefault();model.select(i,tabs[next].id);render();notify();$('#tab-'+tabs[next].id).focus();}
   };
  }
  // Focus does not bubble out of sandboxed documents. Read only the parent
  // document's active iframe; never inspect or script the note document.
  function syncFocusedFrame(){
   const id=document.activeElement?.dataset.readerTab;
   if(!id)return;
   const i=model.panes.findIndex(p=>p?.tabs.some(t=>t.id===id));
   if(i>=0&&model.activePane!==i)activate(i);
  }
  document.defaultView?.addEventListener('blur',()=>setTimeout(syncFocusedFrame,0));
  document.defaultView?.setInterval?.(syncFocusedFrame,200);
  render();
  return {tagBusy(busy){tagWriting=busy;for(const i of [0,1])$('#pane-tags-'+i).querySelectorAll('button, input').forEach(el=>el.disabled=busy);},model,frames,open,render,activate,moveHit,syncFocusedFrame,
   reset(){stopDrag();ratio=.5;model.reset();render();notify();},
   moved(oldPath,newPath,paths){for(const tab of model.all())if(tab.path===oldPath||tab.path.startsWith(oldPath+'/'))tab.path=newPath+tab.path.slice(oldPath.length);model.reconcile(getVault().notes);for(const tab of model.all())if(paths.has(tab.path))navigate(tab);render();notify();},
   metadataRefresh(paths){model.reconcile(getVault().notes);for(const tab of model.all())if(paths.has(tab.path))navigate(tab);render();notify();},
   refresh(){model.reconcile(getVault().notes);for(const tab of model.all())navigate(tab);render();notify();},
   theme(){for(const tab of model.all())navigate(tab);render();},
   served(payload){if(!note(payload.path))return;const tab=model.served(payload,getVault().token);if(tab){render();notify();}},
  };
 }
 root.ShioriReader={create};
 if(typeof module!=='undefined')module.exports=root.ShioriReader;
})(globalThis);
