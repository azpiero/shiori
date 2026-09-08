const {test}=require('node:test');const assert=require('node:assert/strict');
const {create}=require('../ui/terminal.js');const stub=require('./terminal-stub.cjs');const {createDocument}=require('./dom.cjs');
async function setup(start=async()=>({cwd:'/skills',vault:'/vault'})){
 const document=createDocument();document.querySelector('#app').innerHTML='<button id="showTerminal"></button><section id="terminalPanel" hidden></section>';
 let callback,term,context={token:'a',root:'/vault'};const calls=[],busy=[];
 class Terminal extends stub.Terminal{constructor(...args){super(...args);term=this;}}
 const panel=create({document,Terminal,FitAddon:stub.FitAddon,listen:async(_,fn)=>callback=fn,invoke:async(name,args)=>{calls.push({name,args});if(name==='terminal_start')return start(args,emit);},getContext:()=>context,onBusy:b=>busy.push(b),onComplete(){}});
 function emit(payload){callback({payload});}await panel.initialized;
 return {panel,calls,busy,emit,term:()=>term,get:s=>document.querySelector(s),setContext:c=>{context=c;panel.contextChanged();}};
}
test('opening starts a generic shell, streams binary output with acknowledgements, and hiding preserves it',async()=>{
 const s=await setup();await s.get('#showTerminal').onclick();const args=s.calls.find(c=>c.name==='terminal_start').args;
 assert.equal(args.vaultToken,'a');assert.equal(args.request,undefined);
 s.emit({session_id:'old',seq:1,data:[1]});assert.equal(s.term().output.length,0);
 s.emit({session_id:args.sessionId,seq:1,data:[27,91,51,49,109,65]});assert.deepEqual([...s.term().output[0]],[27,91,51,49,109,65]);assert.equal(s.calls.at(-1).name,'terminal_ack');
 s.term().data('claude\r');await new Promise(r=>setImmediate(r));assert.equal(s.calls.at(-1).name,'terminal_write');assert.equal(Buffer.from(s.calls.at(-1).args.data).toString(),'claude\r');
 await s.get('#showTerminal').onclick();assert.equal(s.panel.isBusy(),true);await s.get('#showTerminal').onclick();assert.equal(s.calls.filter(c=>c.name==='terminal_start').length,1);
 s.emit({session_id:args.sessionId,exit:true,message:'done'});assert.equal(s.panel.isBusy(),false);assert.deepEqual(s.busy,[true,false]);
});
test('stop during startup is deferred; immediate exits and failed starts do not leave a busy panel',async()=>{
 let resolve;const s=await setup(()=>new Promise(r=>resolve=r));const opening=s.get('#showTerminal').onclick();s.get('#terminalInfo').onclick();await s.get('#terminalStop').onclick();
 assert.equal(s.calls.filter(c=>c.name==='terminal_stop').length,0);resolve({cwd:'/skills'});await opening;assert.equal(s.calls.filter(c=>c.name==='terminal_stop').length,1);
 const fast=await setup(async(args,emit)=>{emit({session_id:args.sessionId,exit:true,message:'done'});return {cwd:'/skills'};});await fast.get('#showTerminal').onclick();assert.equal(fast.panel.isBusy(),false);assert.equal(fast.get('#terminalState').textContent,'done');
 const fail=await setup(async()=>{throw new Error('no shell');});await fail.get('#showTerminal').onclick();assert.equal(fail.panel.isBusy(),false);assert.match(fail.get('#terminalState').textContent,/no shell/);
});

test('information popover shows full live paths, dismisses accessibly and contains stop',async()=>{
 const s=await setup();assert.equal(s.get('#terminalStart'),null);assert.equal(s.get('#terminalState').textContent,'');
 await s.get('#showTerminal').onclick();assert.equal(s.get('#terminalState').textContent,'');
 s.get('#terminalInfo').onclick();assert.equal(s.get('#terminalInfo').getAttribute('aria-expanded'),'true');
 assert.match(s.get('#terminalPaths').textContent,/HTML保存先: \/vault\n\n作業場所: \/skills/);
 assert.equal(s.get('#terminalStop').closest('#terminalContext'),s.get('#terminalContext'));
 s.get('#terminalPanel').events.keydown({key:'Escape',preventDefault(){}});assert.equal(s.get('#terminalContext').hidden,true);
 s.get('#terminalInfo').onclick();const id=s.calls.find(c=>c.name==='terminal_start').args.sessionId;
 s.emit({session_id:id,exit:true,message:'exited'});s.setContext({token:'b',root:'/a very long destination/日本語/vault'});
 assert.match(s.get('#terminalPaths').textContent,/\/a very long destination\/日本語\/vault/);
 assert.equal(s.get('#terminalState').textContent,'exited');assert.equal(s.get('#terminalRestart').hidden,false);
 await s.get('#terminalRetry').onclick();assert.equal(s.calls.filter(c=>c.name==='terminal_start').length,2);assert.equal(s.get('#terminalRestart').hidden,true);
});
test('missing vault stays visible and startup errors retain an explicit retry route',async()=>{
 const s=await setup(async()=>{throw new Error('startup failed');});s.setContext(null);
 assert.equal(s.get('#terminalPrompt').textContent,'Vaultを開いてください');assert.equal(s.get('#terminalRestart').hidden,true);
 s.setContext({token:'b',root:'/new'});await s.get('#showTerminal').onclick();assert.match(s.get('#terminalState').textContent,/startup failed/);assert.equal(s.get('#terminalRestart').hidden,false);
});
