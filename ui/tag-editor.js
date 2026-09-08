(function(root){
 const Search=typeof module!=='undefined'?require('./search.js'):root.ShioriSearch;
 function create({document,getVault,invoke,onBusy,onSaved}){
  const panel=document.createElement('div');panel.className='tag-editor-backdrop';panel.hidden=true;
  panel.innerHTML='<section class="tag-editor" role="dialog" aria-modal="true" aria-labelledby="tag-editor-title"><h2 id="tag-editor-title">ノートのタグを編集</h2><p id="tag-editor-path"></p><p>変更は「保存」で確定します。</p><div id="tag-editor-tags" class="tag-editor-tags"></div><label for="tag-editor-input">追加するタグ</label><div class="tag-editor-add"><input id="tag-editor-input" autocomplete="off" list="tag-editor-suggestions"><datalist id="tag-editor-suggestions"></datalist><button id="tag-editor-add">追加</button></div><p id="tag-editor-message" role="status"></p><div class="tag-editor-actions"><button id="tag-editor-cancel">取消</button><button id="tag-editor-save" class="primary">保存</button></div></section>';
  document.body.append(panel);const $=id=>panel.querySelector('#'+id);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let session=null,loading=false,saving=false,composing=false;
  function message(text){$('tag-editor-message').textContent=text;}
  function controls(){
   const locked=loading||saving;
   for(const id of ['tag-editor-input','tag-editor-add','tag-editor-save'])$(id).disabled=locked||!session?.hash;
   $('tag-editor-cancel').disabled=saving;
   for(const button of $('tag-editor-tags').querySelectorAll('button'))button.disabled=locked;
   panel.setAttribute('aria-busy',String(locked));
  }
  function render(){
   $('tag-editor-tags').innerHTML=session.tags.map((tag,i)=>`<span class="tag-chip"><span>${escape(tag)}</span><button data-remove="${i}" aria-label="タグを外す: ${escape(tag)}">×</button></span>`).join('')||'<span class="untagged">タグなし</span>';controls();
  }
  function suggest(){
   const value=$('tag-editor-input').value;
   const text='tag: '+JSON.stringify(value),result=Search.suggest(text,text.length,getVault()?.notes.flatMap(n=>n.tags)||[]);
   $('tag-editor-suggestions').innerHTML=(result?.options||[]).filter(t=>!session.tags.includes(t)).map(t=>`<option value="${escape(t)}"></option>`).join('');
  }
  function add(){
   if(loading||saving||!session?.hash||composing)return;
   const value=$('tag-editor-input').value;
   if(!value.trim()||new TextEncoder().encode(value).length>256||/[\u0000-\u001f\u007f-\u009f]/.test(value)){message('空白のみのタグや制御文字は使えません。UTF-8で256バイト以内にしてください。');return;}
   if(!session.tags.includes(value)){if(session.tags.length>=128){message('タグは128個までです。');return;}session.tags.push(value);}
   $('tag-editor-input').value='';message('未保存の変更があります。');render();suggest();$('tag-editor-input').focus();
  }
  function close(){if(saving)return;const focus=session?.focus;session=null;loading=false;panel.hidden=true;document.querySelector('#app').inert=false;onBusy(false);focus?.focus();}
  $('tag-editor-cancel').onclick=close;
  $('tag-editor-add').onclick=add;
  $('tag-editor-input').oninput=()=>{if(!composing)suggest();};
  $('tag-editor-input').oncompositionstart=()=>{composing=true;};$('tag-editor-input').oncompositionend=()=>{composing=false;suggest();};
  $('tag-editor-input').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing&&!composing){e.preventDefault();add();}};
  $('tag-editor-tags').onclick=e=>{const b=e.target.closest('[data-remove]');if(b&&!loading&&!saving){session.tags.splice(Number(b.dataset.remove),1);render();suggest();message('未保存の変更があります。');$('tag-editor-input').focus();}};
  $('tag-editor-save').onclick=async()=>{
   if(!session?.hash||loading||saving)return;
   if($('tag-editor-input').value){message('入力中のタグを「追加」するか、入力欄を空にしてから保存してください。');$('tag-editor-input').focus();return;}
   const draft=session;saving=true;controls();message('保存しています…');
   try{
    const result=await invoke('set_note_tags',{vaultToken:draft.token,path:draft.path,expectedHash:draft.hash,tags:[...draft.tags]});
    // Saved is explicit: scan warnings must never appear as a retryable unsaved draft.
    if(!result.saved)throw new Error('保存結果を確認できません。Vaultを再読込してください。');
    saving=false;close();onSaved(result,draft.path);
   }catch(e){saving=false;message(String(e));controls();}
  };
  panel.onkeydown=e=>{
   if(e.key==='Escape'&&!e.isComposing){e.preventDefault();close();}
   if(e.key==='Tab'){
    const items=[...panel.querySelectorAll('input, button')].filter(el=>!el.disabled),first=items[0],last=items.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
   }
  };
  return {async open(path,remove){
   if(session||!getVault())return;
   session={path,token:getVault().token,tags:[],hash:null,focus:document.activeElement};const draft=session;
   panel.hidden=false;document.querySelector('#app').inert=true;loading=true;composing=false;onBusy(true);$('tag-editor-path').textContent=path;$('tag-editor-input').value='';$('tag-editor-suggestions').innerHTML='';message('タグを読み込んでいます…');render();$('tag-editor-cancel').focus();
   try{
    const result=await invoke('get_note_tags',{vaultToken:draft.token,path});if(session!==draft)return;
    draft.hash=result.expected_hash;draft.tags=[...new Set(result.tags)].filter(t=>t!==remove);loading=false;render();suggest();
    message(remove===undefined?'タグを追加・削除して保存してください。':'タグの削除を保留しています。保存で確定します。');$('tag-editor-input').focus();
   }catch(e){if(session!==draft)return;loading=false;message(String(e));controls();}
  }};
 }
 root.ShioriTagEditor={create};if(typeof module!=='undefined')module.exports=root.ShioriTagEditor;
})(globalThis);
