(function(root){
 const {Workspace}=typeof module!=='undefined'?require('./workspace.js'):root.ShioriWorkspace;
 function create({document,getVault,getTheme,onSelect,onStatus,onTag=()=>{}}){
  const model=new Workspace(),frames=new Map(),tabMarkup=new Map(),linkMarkup=new Map(),tagMarkup=new Map();
  const $=id=>document.querySelector(id);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const current=i=>model.panes[i]?.tabs.find(t=>t.id===model.panes[i].active);
  $('#readerPanel').innerHTML=[0,1].map(i=>`<section id="pane-${i}" class="reader-pane" aria-label="ペイン ${i+1}" hidden>
   <div class="pane-actions"><button data-action="activate" title="このペインを操作対象にする">ペイン ${i+1}</button><button data-action="new" title="新しいタブ" aria-label="ペイン ${i+1}に新しいタブ">＋</button><button data-action="find" aria-label="本文内検索を開く">検索</button><button data-action="split" title="このノートを隣のペインで開く" aria-label="隣のペインで開く">左右分割</button><button data-action="next" title="別のペインへ移動">ペイン移動</button><button data-action="close-pane" aria-label="ペイン ${i+1}を閉じる">分割解除</button></div>
   <div id="tabs-${i}" class="reader-tabs" role="tablist" aria-label="ペイン ${i+1}のタブ"></div>
   <div id="pane-tags-${i}" class="pane-tags" role="group" aria-label="ペイン ${i+1}のノートのタグ" hidden></div>
   <div id="pane-search-${i}" class="pane-search"><input id="pane-query-${i}" aria-label="ペイン ${i+1}の本文内検索" placeholder="本文内を検索（Enter）"><button data-action="search" aria-label="ペイン ${i+1}を検索">検索</button><button data-action="clear" aria-label="ペイン ${i+1}の検索を解除">×</button><span id="pane-hits-${i}" aria-live="polite"></span><button id="pane-prev-${i}" data-action="prev" aria-label="前の検索箇所">↑</button><button id="pane-next-${i}" data-action="next" aria-label="次の検索箇所">↓</button></div>
   <details id="pane-links-${i}" class="pane-links"><summary>このノートのリンク</summary><div id="links-${i}" class="link-choices"></div></details>
   <div id="documents-${i}" class="pane-documents"><div id="pane-empty-${i}" class="empty">一覧からノートを開いてください。</div></div>
  </section>`).join('');
  function note(path){return getVault()?.notes.find(n=>n.path===path);}
  function notify(){onSelect(model.tab?.path||'');}
  function markActive(){for(let i=0;i<2;i++){const section=$('#pane-'+i);section.classList.toggle('active',i===model.activePane);section.querySelector('[data-action="activate"]').setAttribute('aria-pressed',String(i===model.activePane));}}
  function focusPane(i){const tab=current(i);if(tab)$('#tab-'+tab.id).focus();else $('#pane-'+i).querySelector('[data-action="new"]').focus();$('#pane-'+i).scrollIntoView({block:'nearest',inline:'nearest'});}
  function activate(i,focus=false){model.activate(i);render();notify();if(focus)focusPane(i);}
  function frameFor(tab){
   if(frames.has(tab.id))return frames.get(tab.id);
   const panel=document.createElement('div');panel.id='panel-'+tab.id;panel.className='tab-document';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+tab.id);
   const frame=document.createElement('iframe');frame.id='frame-'+tab.id;frame.setAttribute('sandbox','');frame.setAttribute('referrerpolicy','no-referrer');frame.dataset.readerTab=tab.id;
   frame.addEventListener('load',()=>{if(model.find(tab.id)){tab.loading=false;render();}});
   frame.addEventListener('focus',()=>{const i=model.panes.findIndex(p=>p?.tabs.some(t=>t.id===tab.id));if(i>=0)activate(i);});
   const empty=document.createElement('div');empty.className='empty';empty.textContent='一覧からノートを開いてください。';panel.append(empty);panel.append(frame);const entry={panel,frame,empty};frames.set(tab.id,entry);return entry;
  }
  function navigate(tab){
   if(!tab.path)return;
   const vault=getVault(),url=new URL(`vault://localhost/${vault.token}/${tab.path.split('/').map(encodeURIComponent).join('/')}`);
   tab.request=model.id();tab.hits=0;tab.hit=0;tab.loading=true;
   for(const [key,value] of Object.entries({theme:getTheme(),q:tab.query,v:vault.revision,view:tab.id,request:tab.request}))url.searchParams.set(key,value);
   url.hash=tab.anchor||(tab.query?'shiori-hit-0':'');tab.url=url.href;
   const {frame}=frameFor(tab);frame.title=note(tab.path)?.title||tab.path;frame.src=url.href;
  }
  function links(tab){
   if(!tab?.path)return [];
   const vault=getVault(),base=new URL(tab.url),prefix='/'+vault.token+'/';
   const out=[];const seen=new Set();
   for(const link of note(tab.path)?.links||[]){
    try{
     const url=new URL(link.href,base);
     if(url.protocol!=='vault:'||url.hostname!=='localhost'||!url.pathname.startsWith(prefix))continue;
     const path=decodeURIComponent(url.pathname.slice(prefix.length));
     const normalized=vault.notes.filter(n=>n.path.normalize('NFC')===path.normalize('NFC'));
     const target=vault.notes.find(n=>n.path===path)||(normalized.length===1?normalized[0]:null);
     if(!target||seen.has(target.path+url.hash))continue;
     seen.add(target.path+url.hash);out.push({path:target.path,anchor:url.hash,text:link.text||target.title});
    }catch{}
   }
   return out;
  }
  function render(){
   const focusId=document.activeElement?.id?.startsWith('tab-')?document.activeElement.id:null;
   const ids=new Set(model.all().map(t=>t.id));
   for(const [id,{panel}] of frames)if(!ids.has(id)){panel.remove();frames.delete(id);}
   $('#readerPanel').classList.toggle('split',model.panes.filter(Boolean).length===2);
   for(let i=0;i<2;i++){
    const pane=model.panes[i],section=$('#pane-'+i);section.hidden=!pane;if(!pane)continue;
    section.classList.toggle('active',i===model.activePane);
    section.querySelector('[data-action="activate"]').setAttribute('aria-pressed',String(i===model.activePane));
    for(const action of ['next','close-pane'])section.querySelector(`[data-action="${action}"]`).disabled=!model.panes[1-i];
    const tab=current(i),query=$('#pane-query-'+i);
    if(document.activeElement!==query)query.value=tab?.query||'';
    query.disabled=!tab?.path;$('#pane-search-'+i).hidden=!tab?.query&&!pane.searchOpen;
    section.querySelector('[data-action="find"]').disabled=!tab?.path;
    const tabsHtml=pane.tabs.map(t=>`<div class="reader-tab"><button id="tab-${t.id}" role="tab" data-tab="${t.id}" aria-selected="${t.id===pane.active}" aria-controls="panel-${t.id}" tabindex="${t.id===pane.active?0:-1}" title="${escape(t.path)}">${escape(note(t.path)?.title||'新しいタブ')}</button><button data-close="${t.id}" aria-label="タブを閉じる: ${escape(note(t.path)?.title||'新しいタブ')}">×</button></div>`).join('');
    if(tabMarkup.get(i)!==tabsHtml){$('#tabs-'+i).innerHTML=tabsHtml;tabMarkup.set(i,tabsHtml);}
    const tags=note(tab?.path)?.tags||[],tagsPanel=$('#pane-tags-'+i);
    tagsPanel.hidden=!tab?.path;
    const tagsHtml=tab?.path?(tags.map(tag=>`<button class="note-tag" data-tag="${escape(tag)}" title="タググラフを開く: ${escape(tag)}" aria-label="タググラフを開く: ${escape(tag)}">#${escape(tag)} <span aria-hidden="true">↗</span></button>`).join('')||'<span class="untagged">タグなし</span>'):'';
    if(tagMarkup.get(i)!==tagsHtml){tagsPanel.innerHTML=tagsHtml;tagMarkup.set(i,tagsHtml);}
    $('#pane-hits-'+i).textContent=tab?.query?(tab.loading?'読込中':tab.hits?`${tab.hit+1} / ${tab.hits}`:'0件'):'';
    for(const direction of ['prev','next'])$('#pane-'+direction+'-'+i).disabled=!tab?.hits||tab.loading;
    const choices=links(tab);$('#pane-links-'+i).hidden=!choices.length;
    const linksHtml=choices.map((link,index)=>`<div class="link-choice"><span>${escape(link.text)}</span><button data-link="${index}" data-mode="current">ここで開く</button><button data-link="${index}" data-mode="tab">新しいタブ</button><button data-link="${index}" data-mode="side">隣のペイン</button></div>`).join('');
    if(linkMarkup.get(i)!==linksHtml){$('#links-'+i).innerHTML=linksHtml;linkMarkup.set(i,linksHtml);}
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
  function search(i,clear=false){const tab=current(i);if(!tab?.path)return;if(clear)model.panes[i].searchOpen=false;tab.query=clear?'':$('#pane-query-'+i).value.trim();tab.anchor='';navigate(tab);render();notify();}
  function closeTab(i,id){model.close(i,id);render();notify();const active=current(i);if(active)$('#tab-'+active.id).focus();else $('#pane-query-'+i).closest('.reader-pane').querySelector('[data-action="new"]').focus();}
  for(let i=0;i<2;i++){
   $('#pane-'+i).addEventListener('pointerdown',()=>{if(model.activePane!==i){model.activate(i);markActive();notify();}});
   $('#pane-'+i).addEventListener('focusin',()=>{if(model.activePane!==i){model.activate(i);markActive();notify();}});
   $('#pane-'+i).onclick=e=>{
    const button=e.target.closest('button');if(!button)return;
    model.activate(i);
    if(button.dataset.tag!==undefined){render();notify();onTag(button.dataset.tag);return;}
    if(button.dataset.tab){model.select(i,button.dataset.tab);render();notify();$('#tab-'+button.dataset.tab).focus();return;}
    if(button.dataset.close){closeTab(i,button.dataset.close);return;}
    if(button.dataset.link!==undefined){const link=links(current(i))[Number(button.dataset.link)];if(link)open(link.path,link.anchor,button.dataset.mode,current(i)?.query||'');$('#pane-links-'+i).open=false;return;}
    switch(button.dataset.action){
     case 'activate':activate(i);break;
     case 'find':model.panes[i].searchOpen=true;render();$('#pane-query-'+i).focus();break;
     case 'new':open('','','tab');$('#pane-query-'+i).closest('.reader-pane').querySelector('[data-action="new"]').focus();break;
     case 'split':open(current(i)?.path||'',current(i)?.anchor||'','side',current(i)?.query||'');break;
     case 'next':activate(1-i,true);break;
     case 'close-pane':model.closePane(i);render();notify();focusPane(model.activePane);break;
     case 'search':search(i);break;case 'clear':search(i,true);break;
     case 'prev':moveHit(i,-1);break;case 'next-hit':moveHit(i,1);break;
    }
   };
   // The hit button uses a distinct action from switching panes.
   $('#pane-next-'+i).dataset.action='next-hit';
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
  return {model,frames,open,render,activate,moveHit,syncFocusedFrame,
   reset(){model.reset();render();notify();},
   refresh(){model.reconcile(getVault().notes);for(const tab of model.all())navigate(tab);render();notify();},
   theme(){for(const tab of model.all())navigate(tab);render();},
   served(payload){if(!note(payload.path))return;const tab=model.served(payload,getVault().token);if(tab){render();notify();}},
  };
 }
 root.ShioriReader={create};
 if(typeof module!=='undefined')module.exports=root.ShioriReader;
})(globalThis);
