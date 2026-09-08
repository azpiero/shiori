const {test}=require('node:test');const assert=require('node:assert/strict');const {createDocument}=require('./dom.cjs');const {create}=require('../ui/move-dialog.js');
function setup(){
 const document=createDocument(),calls=[],busy=[],moved=[];let previewError,moveError,previewResult={destination:'empty/a.html',references:[{note:'notes/a.html',attribute:'src',value:'<image>',before:'/assets/a.png',after:'/other/assets/a.png'}],omitted:0,warnings:['Review CSS'],expected_hash:'hash',expected_revision:'r1'},moveResult={moved:true,old_path:'notes/a.html',path:'empty/a.html',snapshot:{token:'t'},warnings:[]};
 const dialog=create({document,getVault:()=>({token:'t',folders:['','notes','empty'],notes:[{path:'notes/a.html'}]}),invoke:async(name,args)=>{calls.push({name,args});if(name==='preview_note_move'){if(previewError)throw previewError;return previewResult;}if(moveError)throw moveError;return moveResult;},onBusy:v=>busy.push(v),onMoved:r=>moved.push(r)});
 return {dialog,document,calls,busy,moved,get:id=>document.querySelector('#move-'+id),setPreview:(v,e)=>{previewResult=v;previewError=e;},setMove:(v,e)=>{moveResult=v;moveError=e;}};
}
test('opening or dropping only previews; cancellation does not move and confirmation binds the reviewed hashes',async()=>{
 const {dialog,get,calls,document,moved}=setup();await dialog.open('notes/a.html','empty');assert.equal(calls.length,1);assert.equal(document.querySelector('#app').inert,true);assert.match(get('review').innerHTML,/&lt;image&gt;/);assert.match(get('review').innerHTML,/Review CSS/);
 get('cancel').onclick();assert.equal(calls.length,1);assert.equal(document.querySelector('#app').inert,false);
 await dialog.open('notes/a.html','empty');await get('confirm').onclick();assert.deepEqual(calls.at(-1).args,{vaultToken:'t',path:'notes/a.html',folder:'empty',expectedHash:'hash',expectedRevision:'r1'});assert.equal(moved.length,1);
});
test('stale previews, errors and duplicate moves cannot move without a current review',async()=>{
 const {dialog,get,calls,setPreview,setMove}=setup();let resolve;
 setPreview(new Promise(r=>resolve=r));const open=dialog.open('notes/a.html','empty');get('cancel').onclick();resolve({destination:'late'});await open;assert.equal(get('confirm').disabled,true);
 setPreview(null,'collision');await dialog.open('notes/a.html','empty');assert.equal(get('confirm').disabled,true);await get('confirm').onclick();assert.equal(calls.filter(c=>c.name==='move_note').length,0);assert.match(get('message').textContent,/collision/);
 setPreview({destination:'empty/a.html',references:[],warnings:[],omitted:0,expected_hash:'h',expected_revision:'r'});await get('preview').onclick();setMove(null,'external change');await get('confirm').onclick();assert.equal(get('confirm').disabled,true);assert.match(get('message').textContent,/external change/);
 await get('preview').onclick();setMove(new Promise(r=>resolve=r));const save=get('confirm').onclick();await get('confirm').onclick();assert.equal(get('cancel').disabled,true);assert.equal(calls.filter(c=>c.name==='move_note').length,2);resolve({moved:true});await save;
});
