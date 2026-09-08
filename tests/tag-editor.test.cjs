const {test}=require('node:test'),assert=require('node:assert/strict');
const {createDocument}=require('./dom.cjs'),{create}=require('../ui/tag-editor.js');
function setup(){
 const document=createDocument(),host=document.createElement('div');host.innerHTML='<button data-add-tag>+</button>';document.body.append(host);
 const calls=[],busy=[],saved=[],errors=[];let read={tags:['old','old'],expected_hash:'hash'},result={saved:true,snapshot:{token:'t'}},failure=null,target={path:'a.html',host};const vault={token:'t',notes:[{path:'a.html',tags:['old']},{path:'b.html',tags:['日本 語','<quoted>']}]};
 const editor=create({document,getVault:()=>vault,getTarget:()=>target,invoke:async(name,args)=>{calls.push({name,args});if(failure)throw failure;return name==='get_note_tags'?read:result;},onBusy:b=>{busy.push(b);host.querySelectorAll('button, input').forEach(el=>el.disabled=b);},onSaved:(...args)=>saved.push(args),onError:e=>errors.push(e)});
 return {editor,host,document,calls,busy,saved,errors,input:()=>document.querySelector('#tag-inline-input'),options:()=>document.querySelector('#tag-inline-options'),setRead:r=>read=r,setResult:r=>result=r,fail:e=>failure=e,setTarget:t=>target=t};
}
const enter=s=>s.input().onkeydown({key:'Enter',preventDefault(){}});
test('remove writes immediately with a fresh hash and no modal',async()=>{
 const s=setup();await s.editor.open('a.html','old');assert.deepEqual(s.calls.at(-1).args,{vaultToken:'t',path:'a.html',expectedHash:'hash',tags:[]});assert.equal(s.document.querySelector('[role="dialog"]'),null);assert.deepEqual(s.busy,[true,false]);assert.equal(s.saved.length,1);
});
test('inline suggestions first complete then save; Escape and blur discard without writes',async()=>{
 const s=setup();s.editor.open('a.html');s.input().onkeydown({key:'ArrowUp',preventDefault(){}});assert.equal(s.input().getAttribute('aria-activedescendant'),'tag-inline-option-1');s.input().value='日本';s.input().oninput();assert.match(s.options().innerHTML,/日本 語/);s.input().onkeydown({key:'ArrowDown',preventDefault(){}});await enter(s);assert.equal(s.input().value,'日本 語');assert.equal(s.calls.length,0);await enter(s);assert.deepEqual(s.calls.at(-1).args.tags,['old','日本 語']);assert.equal(s.input(),null);
 s.editor.open('a.html');s.input().onkeydown({key:'Escape',preventDefault(){}});assert.equal(s.input(),null);assert.equal(s.calls.length,2);
 s.editor.open('a.html');s.input().onblur();assert.equal(s.input(),null);assert.equal(s.calls.length,2);
});
test('validation, IME and tag count prevent invalid writes',async()=>{
 const s=setup();s.editor.open('a.html');s.input().value='日';s.input().events.compositionstart();await enter(s);assert.equal(s.calls.length,0);s.input().events.compositionend();
 for(const value of [' ','bad\nname','あ'.repeat(86)]){s.input().value=value;await enter(s);}assert.equal(s.calls.length,0);assert.equal(s.errors.length,3);
 s.setRead({tags:Array.from({length:128},(_,i)=>String(i)),expected_hash:'h'});s.input().value='new';await enter(s);assert.equal(s.calls.length,1);assert.match(s.errors.at(-1),/128/);
});
test('pending writes lock controls and reject duplicate sends; failures report status and allow retry',async()=>{
 const s=setup();let resolve;s.setRead(new Promise(r=>resolve=r));s.editor.open('a.html');s.input().value='new';const saving=enter(s);assert.equal(s.input().disabled,true);await s.editor.open('a.html','old');assert.equal(s.calls.length,1);resolve({tags:['old'],expected_hash:'h'});await saving;assert.equal(s.saved.length,1);
 s.fail('外部変更');s.editor.open('a.html');s.input().value='retry';await enter(s);assert.match(s.errors.at(-1),/外部変更/);assert.equal(s.input().disabled,false);assert.equal(s.saved.length,1);
 s.fail(null);s.setRead({tags:['old'],expected_hash:'fresh'});await enter(s);assert.equal(s.saved.length,2);
});
test('pane changes discard drafts and late completion never focuses another pane',async()=>{
 const s=setup();s.editor.open('a.html');s.setTarget({path:'b.html',host:s.host});s.editor.contextChanged();assert.equal(s.input(),null);
 s.setTarget({path:'a.html',host:s.host});let resolve;s.setResult(new Promise(r=>resolve=r));const write=s.editor.open('a.html','old');await new Promise(r=>setImmediate(r));s.setTarget({path:'b.html',host:s.host});const other=s.document.createElement('button');s.document.body.append(other);other.focus();resolve({saved:true,snapshot:{token:'t'}});await write;assert.equal(s.document.activeElement,other);
});
test('write conflicts preserve input and scan warnings remain saved outcomes',async()=>{
 const s=setup();s.setResult({then(resolve,reject){reject('競合: 再読込してください');}});s.editor.open('a.html');s.input().value='new';await enter(s);
 assert.equal(s.calls.at(-1).name,'set_note_tags');assert.match(s.errors.at(-1),/競合/);assert.equal(s.input().value,'new');assert.equal(s.saved.length,0);
 const result={saved:true,snapshot:{token:'t'},warning:'保存済み・一部読み取りエラー'};s.setResult(result);await enter(s);assert.equal(s.input(),null);assert.equal(s.saved[0][0],result);
});
