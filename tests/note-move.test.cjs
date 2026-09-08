const {test}=require('node:test');const assert=require('node:assert/strict');const {create}=require('../ui/note-move.js');
test('drop checks references and moves directly using the inspected hash, then reports impacts',async()=>{
 const calls=[],results=[],busy=[];const review={expected_hash:'h',expected_revision:'r',references:[{value:'image.png'}]};
 const mover=create({getVault:()=>({token:'t',notes:[{path:'notes/a.html'}]}),invoke:async(name,args)=>{calls.push({name,args});return name==='preview_note_move'?review:{moved:true,path:'notes/new/a.html'};},onBusy:v=>busy.push(v),onMoved:r=>results.push(r)});
 await mover.open('notes/a.html','notes/new');assert.equal(calls.length,2);assert.equal(calls[1].args.expectedHash,'h');assert.equal(results[0].review,review);assert.deepEqual(busy,[true,false]);
});
test('errors preserve the source operation boundary and duplicate drops are ignored',async()=>{
 let resolve;const calls=[],errors=[];
 const mover=create({getVault:()=>({token:'t',notes:[{path:'notes/a.html'}]}),invoke:async name=>{calls.push(name);if(name==='preview_note_move')return new Promise(r=>resolve=r);throw Error('collision');},onBusy(){},onMoved(){assert.fail('must not report success');},onError:e=>errors.push(e)});
 const pending=mover.open('notes/a.html','notes/new');await mover.open('notes/a.html','notes/new');assert.equal(calls.length,1);resolve({expected_hash:'h',expected_revision:'r'});await pending;assert.match(errors[0],/collision/);
});
