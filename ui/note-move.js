// Drag/keyboard destination selection happens in the sidebar, never in a modal.
(function(root){
 function create({getVault,invoke,onBusy,onMoved,onError=()=>{}}){
  let busy=false;
  return {async open(path,folder){
   if(busy||!getVault()?.notes.some(n=>n.path===path)||!folder)return;
   busy=true;onBusy(true);const token=getVault().token;
   try{
    const review=await invoke('preview_note_move',{vaultToken:token,path,folder});
    const result=await invoke('move_note',{vaultToken:token,path,folder,expectedHash:review.expected_hash,expectedRevision:review.expected_revision});
    if(!result.moved)throw new Error('移動結果を確認できません。Vaultを再読込してください。');
    onMoved({...result,review});
   }catch(e){onError(String(e));}finally{busy=false;onBusy(false);}
  }};
 }
 root.ShioriNoteMove={create};if(typeof module!=='undefined')module.exports=root.ShioriNoteMove;
})(globalThis);
