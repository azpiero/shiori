const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create,Log,LIMIT}=require('../ui/claude.js');
const {createDocument}=require('./dom.cjs');
async function setup(start=async()=>{}){
 const document=createDocument();document.querySelector('#app').innerHTML='<button id="showClaude"></button><section id="claudePanel" hidden></section>';
 let callback,context={token:'vault-a',path:'note.html'},busy=[],completed=[];const calls=[];
 const panel=create({document,listen:async(name,fn)=>{callback=fn;},invoke:async(name,args)=>{calls.push({name,args});if(name==='claude_config')return {executable:'/local/claude'};if(name==='claude_start')return start(args,emit);},getContext:()=>context,onBusy:b=>busy.push(b),onComplete:t=>completed.push(t)});
 function emit(payload){callback({payload});}
 await panel.initialized;const get=s=>document.querySelector(s);
 get('#claudeRequest').value='Add an example';
 return {panel,get,calls,busy,completed,emit,setContext:c=>{context=c;panel.contextChanged();}};
}
test('log handles chunked JSON and bounds both displayed and incomplete output',()=>{
 const log=new Log();const message=JSON.stringify({type:'stream_event',event:{delta:{type:'text_delta',text:'日本語 <script>'}}})+'\n';
 for(const piece of [message.slice(0,20),message.slice(20)])log.feed('stdout',piece);
 assert.equal(log.text,'日本語 <script>');
 log.feed('stderr','x'.repeat(LIMIT+10));assert.equal(log.text.length,LIMIT);assert.equal(log.truncated,true);
 log.feed('stdout','a'.repeat(LIMIT+1));assert.equal(log.pending,'');
 log.feed('stdout',JSON.stringify({type:'result',is_error:true,errors:['Denied'],permission_denials:[{}]})+'\n');
 assert.match(log.text,/Denied/);assert.match(log.text,/権限/);
});
test('panel streams text safely, prevents duplicate starts, preserves captured target, and stops by run ID',async()=>{
 let resolve;const s=await setup(()=>new Promise(r=>resolve=r));const {get,panel,calls,emit}=s;
 get('#showClaude').onclick();assert.equal(get('#claudePanel').hidden,false);
 const starting=get('#claudeRun').onclick();await get('#claudeRun').onclick();
 const run=calls.find(c=>c.name==='claude_start').args;assert.equal(calls.filter(c=>c.name==='claude_start').length,1);
 s.setContext({token:'vault-a',path:'other.html'});assert.match(get('#claudeTarget').textContent,/note.html/);
 emit({run_id:'old',vault_token:'vault-a',kind:'stderr',text:'stale'});assert.equal(get('#claudeLog').textContent,'');
 emit({run_id:run.runId,vault_token:'wrong',kind:'exit',text:'wrong'});assert.equal(panel.isBusy(),true);
 emit({run_id:run.runId,vault_token:'vault-a',kind:'stderr',text:'<img onerror="bad">'});
 assert.equal(get('#claudeLog').children.length,0);assert.match(get('#claudeLog').textContent,/<img/);
 get('#claudeHide').onclick();assert.equal(panel.isBusy(),true);
 await get('#claudeStop').onclick();assert.equal(calls.filter(c=>c.name==='claude_stop').length,0);
 resolve();await starting;assert.equal(calls.at(-1).name,'claude_stop');assert.equal(calls.at(-1).args.runId,run.runId);
 emit({run_id:run.runId,vault_token:'vault-a',kind:'exit',text:'stopped'});resolve();await starting;
 assert.equal(panel.isBusy(),false);assert.equal(get('#claudeState').textContent,'stopped');assert.deepEqual(s.completed,['vault-a']);assert.deepEqual(s.busy,[true,false]);
 panel.reset();assert.equal(get('#claudeLog').textContent,'');
});
test('start failures and immediate exits do not leave the panel busy',async()=>{
 const failed=await setup(async()=>{throw new Error('spawn failed');});await failed.get('#claudeRun').onclick();
 assert.equal(failed.panel.isBusy(),false);assert.match(failed.get('#claudeState').textContent,/spawn failed/);assert.deepEqual(failed.completed,[]);
 const fast=await setup(async(args,emit)=>emit({run_id:args.runId,vault_token:args.vaultToken,kind:'exit',text:'done'}));await fast.get('#claudeRun').onclick();
 assert.equal(fast.get('#claudeState').textContent,'done');assert.equal(fast.panel.isBusy(),false);
 fast.setContext(null);assert.equal(fast.get('#claudeRun').disabled,true);
});
