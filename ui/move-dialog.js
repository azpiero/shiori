(function(root){
 const Folders=typeof module!=='undefined'?require('./folders.js'):root.ShioriFolders;
 function create({document,getVault,invoke,onBusy,onMoved}){
  const panel=document.createElement('div');panel.className='move-backdrop';panel.hidden=true;
  panel.innerHTML='<section class="tag-editor move-dialog" role="dialog" aria-modal="true" aria-labelledby="move-title"><h2 id="move-title">ノートを移動</h2><p id="move-source"></p><label for="move-folder">移動先フォルダ</label><select id="move-folder"></select><p>元ファイルの内容は変更しません。相対リンクや画像の参照先が変わる場合があります。自動修復は行いません。</p><div id="move-review" class="move-review"></div><p id="move-message" role="status"></p><div class="tag-editor-actions"><button id="move-cancel">取消</button><button id="move-preview">影響を確認</button><button id="move-confirm" class="primary">確認して移動</button></div></section>';
  document.body.append(panel);const $=id=>panel.querySelector('#move-'+id);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let session=null,saving=false,loading=false,generation=0;
  function controls(){ $('confirm').disabled=saving||loading||!session?.preview;$('folder').disabled=saving||loading;$('preview').disabled=saving||loading||!session?.choices.length;$('cancel').disabled=saving;panel.setAttribute('aria-busy',String(saving||loading)); }
  function close(){if(saving)return;const focus=session?.focus;session=null;generation++;loading=false;panel.hidden=true;document.querySelector('#app').inert=false;onBusy(false);focus?.focus();}
  async function preview(){
   if(!session||saving)return;const draft=session,folder=$('folder').value,id=++generation;draft.preview=null;loading=true;controls();$('review').innerHTML='';$('message').textContent='移動による参照への影響を確認しています…';
   try{
    const result=await invoke('preview_note_move',{vaultToken:draft.token,path:draft.path,folder});if(session!==draft||id!==generation)return;
    draft.preview=result;draft.folder=folder;
    $('review').innerHTML=`<strong>移動先: ${escape(result.destination)}</strong><p>参照先が変わる可能性のある箇所: ${result.references.length+result.omitted}件</p>`+(result.references.length?'<ul>'+result.references.map(r=>`<li><strong>${escape(r.note)}</strong> · ${escape(r.attribute)}<br><code>${escape(r.value)}</code><br>${escape(r.before)} → ${escape(r.after)}</li>`).join('')+'</ul>':'')+(result.omitted?`<p>ほか${result.omitted}件は省略しています。</p>`:'')+(result.warnings.length?'<ul>'+result.warnings.map(w=>`<li>${escape(w)}</li>`).join('')+'</ul>':'');
    $('message').textContent='内容を確認して「確認して移動」を押してください。';
   }catch(e){if(session===draft&&id===generation)$('message').textContent=String(e);}
   finally{if(session===draft&&id===generation){loading=false;controls();}}
  }
  $('folder').onchange=preview;$('preview').onclick=preview;$('cancel').onclick=close;
  $('confirm').onclick=async()=>{
   if(!session?.preview||loading||saving)return;const draft=session,p=draft.preview;saving=true;controls();$('message').textContent='移動しています…';
   try{const result=await invoke('move_note',{vaultToken:draft.token,path:draft.path,folder:draft.folder,expectedHash:p.expected_hash,expectedRevision:p.expected_revision});if(!result.moved)throw new Error('移動結果を確認できません。Vaultを再読込してください。');saving=false;close();onMoved(result);}
   catch(e){saving=false;draft.preview=null;$('message').textContent=String(e);controls();}
  };
  panel.onkeydown=e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();close();}if(e.key==='Tab'){const items=[...panel.querySelectorAll('select, button')].filter(el=>!el.disabled),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
  return {async open(path,folder){
   if(session||!getVault()?.notes.some(n=>n.path===path))return;
   const choices=Folders.folders(getVault()).filter(p=>p!==Folders.parent(path));session={path,token:getVault().token,choices,focus:document.activeElement,preview:null};generation++;saving=false;loading=false;
   onBusy(true);panel.hidden=false;document.querySelector('#app').inert=true;$('source').textContent=path;$('review').innerHTML='';
   $('folder').innerHTML=choices.map(p=>`<option value="${escape(p)}">${escape(p||'Vault直下')}</option>`).join('');$('folder').value=choices.includes(folder)?folder:(choices[0]??'');controls();$('folder').focus();
   if(choices.length){if(folder!==undefined)await preview();else $('message').textContent='移動先を選んで「影響を確認」を押してください。';}else{$('message').textContent='移動先の既存フォルダがありません。Finderなどでフォルダを作成してから再読込してください。';$('cancel').focus();}
  }};
 }
 root.ShioriMoveDialog={create};if(typeof module!=='undefined')module.exports=root.ShioriMoveDialog;
})(globalThis);
