(function(root){
 const Search=typeof module!=='undefined'?require('./search.js'):root.ShioriSearch;
 function create({document,getVault,getTarget,invoke,onBusy,onSaved,onError}){
  let draft=null,saving=false;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function valid(value){return value.trim()&&new TextEncoder().encode(value).length<=256&&!/[\u0000-\u001f\u007f-\u009f]/.test(value);}
  function cancel(restore=false){if(saving)return;const old=draft;draft=null;if(!old)return;old.host.classList.remove('editing');old.panel.remove();if(restore)old.host.querySelector('[data-add-tag]')?.focus();}
  function matches(path,host,token){const target=getTarget();return getVault()?.token===token&&target?.path===path&&target.host===host;}
  async function write(path,host,change){
   if(saving||!getVault())return false;
   if(change.add!==undefined&&!valid(change.add)){onError('空白のみのタグや制御文字は使えません。UTF-8で256バイト以内にしてください。');return false;}
   const token=getVault().token;saving=true;onBusy(true);let saved=false;
   try{
    const current=await invoke('get_note_tags',{vaultToken:token,path});
    if(getVault()?.token!==token)throw new Error('Vaultが変更されました。');
    const tags=[...new Set(current.tags)].filter(t=>t!==change.remove);
    if(change.add!==undefined&&!tags.includes(change.add)){if(tags.length>=128)throw new Error('タグは128個までです。');tags.push(change.add);}
    const result=await invoke('set_note_tags',{vaultToken:token,path,expectedHash:current.expected_hash,tags});
    if(!result.saved)throw new Error('保存結果を確認できません。Vaultを再読込してください。');
    saved=true;saving=false;cancel();onSaved(result,path);
   }catch(e){onError(String(e));}
   finally{saving=false;onBusy(false);if(!matches(path,host,token))cancel();else if(saved)host.querySelector('[data-add-tag]')?.focus();else draft?.input.focus();}
   return saved;
  }
  function open(path,remove,host=getTarget()?.host){
   if(saving||!host||!getVault())return;
   cancel();if(remove!==undefined)return write(path,host,{remove});
   const panel=document.createElement('div');panel.className='tag-inline';panel.innerHTML='<input id="tag-inline-input" aria-label="追加するタグ" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="tag-inline-options" aria-describedby="tag-inline-help"><span id="tag-inline-help" class="sr-only">Enterで保存。候補選択中はEnterで入力に反映し、もう一度Enterで保存。Escapeで取消。</span><div id="tag-inline-options" class="tag-inline-options" role="listbox" aria-label="既存タグの候補" hidden></div>';
   host.append(panel);host.classList.add('editing');
   const input=panel.querySelector('input'),list=panel.querySelector('[role="listbox"]');
   const session={path,host,panel,token:getVault().token,input,options:[],index:-1,composing:false};draft=session;
   function suggest(){if(draft!==session||session.composing)return;const text='tag: '+JSON.stringify(input.value),existing=getVault().notes.find(n=>n.path===path)?.tags||[];
    session.options=(Search.suggest(text,text.length,getVault().notes.flatMap(n=>n.tags))?.options||[]).filter(t=>!existing.includes(t));session.index=-1;
    list.innerHTML=session.options.map((t,i)=>`<div id="tag-inline-option-${i}" role="option" aria-selected="false" data-option="${i}">${escape(t)}</div>`).join('');list.hidden=!session.options.length;input.setAttribute('aria-expanded',String(!list.hidden));input.removeAttribute('aria-activedescendant');
   }
   function accept(index){if(!session.options[index])return;input.value=session.options[index];session.index=-1;list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');input.focus();}
   list.onmousedown=e=>e.preventDefault();list.onclick=e=>{const option=e.target.closest('[data-option]');if(option)accept(Number(option.dataset.option));};
   input.oninput=suggest;input.addEventListener('compositionstart',()=>{session.composing=true;list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');session.index=-1;});input.addEventListener('compositionend',()=>{session.composing=false;suggest();});
   input.onkeydown=e=>{
    if(saving||e.isComposing||session.composing)return;
    if(e.key==='Escape'){e.preventDefault();cancel(true);return;}
    if(['ArrowDown','ArrowUp'].includes(e.key)&&session.options.length){e.preventDefault();if(list.hidden){suggest();if(!session.options.length)return;}session.index=session.index<0?(e.key==='ArrowDown'?0:session.options.length-1):(session.index+(e.key==='ArrowDown'?1:session.options.length-1))%session.options.length;
     const options=list.querySelectorAll('[role="option"]');options.forEach((el,i)=>el.setAttribute('aria-selected',String(i===session.index)));input.setAttribute('aria-activedescendant','tag-inline-option-'+session.index);options[session.index]?.scrollIntoView({block:'nearest'});return;
    }
    if(e.key==='Enter'){e.preventDefault();if(session.index>=0&&!list.hidden)accept(session.index);else return write(path,host,{add:input.value});}
   };
   input.onblur=()=>{if(!saving)cancel();};
   suggest();input.focus();panel.scrollIntoView({block:'nearest'});
  }
  return {open,write,cancel,contextChanged(){if(draft&&!saving&&(!matches(draft.path,draft.host,draft.token)||document.querySelector('#tag-inline-input')!==draft.input))cancel();}};
 }
 root.ShioriTagEditor={create};if(typeof module!=='undefined')module.exports=root.ShioriTagEditor;
})(globalThis);
