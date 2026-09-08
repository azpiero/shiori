const {test}=require('node:test');const assert=require('node:assert/strict');
const {createDocument}=require('./dom.cjs');const {create}=require('../ui/tag-editor.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
 const document=createDocument(),calls=[],busy=[],saved=[];let readResult={tags:['old','old'],expected_hash:'hash'},saveResult={saved:true,snapshot:{token:'token'},warning:null},readError,saveError;
 const vault={token:'token',notes:[{tags:['old','日本 語','技術/Rust','<quoted>']}]};
 const editor=create({document,getVault:()=>vault,invoke:async(name,args)=>{calls.push({name,args});if(name==='get_note_tags'){if(readError)throw readError;return readResult;}if(saveError)throw saveError;return saveResult;},onBusy:v=>busy.push(v),onSaved:(...args)=>saved.push(args)});
 return {editor,document,calls,busy,saved,get:id=>document.querySelector('#tag-editor-'+id),panel:()=>document.querySelector('.tag-editor-backdrop'),setSave:(value,error)=>{saveResult=value;saveError=error;},setRead:(value,error)=>{readResult=value;readError=error;}};
}
test('remove is a pending draft, cancel never writes, and add uses exact existing tag suggestions',async()=>{
 const {editor,get,calls,panel,document}=setup();await editor.open('a.html','old');
 assert.equal(calls.length,1);assert.match(get('tags').innerHTML,/タグなし/);assert.equal(document.querySelector('#app').inert,true);
 get('cancel').onclick();assert.equal(calls.length,1);assert.equal(panel().hidden,true);assert.equal(document.querySelector('#app').inert,false);
 await editor.open('a.html');get('input').value='日本';get('input').oninput();assert.match(get('suggestions').innerHTML,/日本 語/);
 get('input').value='日本 語';get('add').onclick();assert.match(get('tags').innerHTML,/日本 語/);assert.equal(calls.filter(c=>c.name==='set_note_tags').length,0);
 await get('save').onclick();assert.deepEqual(calls.at(-1).args,{vaultToken:'token',path:'a.html',expectedHash:'hash',tags:['old','日本 語']});assert.equal(panel().hidden,true);
});
test('input validation and IME do not add partial tags; pending text must be added before save',async()=>{
 const {editor,get,calls}=setup();await editor.open('a.html');
 get('input').value='日';get('input').oncompositionstart();get('input').onkeydown({key:'Enter',isComposing:true,preventDefault(){}});assert.ok(!get('tags').innerHTML.includes('日'));
 get('input').oncompositionend();await get('save').onclick();assert.equal(calls.length,1);assert.match(get('message').textContent,/入力中/);
 for(const value of [' ','bad\nname','a'.repeat(257)]){get('input').value=value;get('add').onclick();assert.ok(!get('tags').innerHTML.includes('data-remove="1"'));}
 get('input').value='<quoted>';get('add').onclick();assert.match(get('tags').innerHTML,/&lt;quoted&gt;/);assert.equal(get('tags').querySelector('quoted'),null);
});
test('a conflict retains the draft and a saved response with a scan warning closes it',async()=>{
 const {editor,get,setSave,panel,saved}=setup();await editor.open('a.html','old');
 setSave(null,'外部変更: 再読込してください');await get('save').onclick();assert.equal(panel().hidden,false);assert.match(get('tags').innerHTML,/タグなし/);assert.match(get('message').textContent,/外部変更/);assert.equal(get('save').disabled,false);
 const result={saved:true,snapshot:{token:'token'},warning:'保存済み・再読込エラー'};setSave(result);await get('save').onclick();assert.equal(panel().hidden,true);assert.deepEqual(saved,[[result,'a.html']]);
});
test('duplicate saves are blocked and cancelling a pending read ignores its eventual response',async()=>{
 const {editor,get,setSave,setRead,calls,panel}=setup();let resolve;
 setRead(new Promise(r=>resolve=r));const open=editor.open('a.html');get('cancel').onclick();resolve({tags:['late'],expected_hash:'late'});await open;assert.equal(panel().hidden,true);
 setRead({tags:['old'],expected_hash:'hash'});await editor.open('a.html');
 setSave(new Promise(r=>resolve=r));const save=get('save').onclick();await get('save').onclick();get('cancel').onclick();assert.equal(panel().hidden,false);assert.equal(calls.filter(c=>c.name==='set_note_tags').length,1);assert.equal(get('cancel').disabled,true);
 resolve({saved:true,snapshot:{token:'token'}});await save;assert.equal(panel().hidden,true);
});
test('read errors cannot be saved and Escape cancels with focus restored',async()=>{
 const {editor,get,setRead,calls,document,panel}=setup();const trigger=document.createElement('button');document.body.append(trigger);trigger.focus();setRead(null,'unsupported HTML');
 await editor.open('a.html');assert.equal(get('save').disabled,true);assert.match(get('message').textContent,/unsupported/);await get('save').onclick();assert.equal(calls.length,1);
 panel().onkeydown({key:'Escape',preventDefault(){}});assert.equal(document.activeElement,trigger);assert.equal(panel().hidden,true);
});
