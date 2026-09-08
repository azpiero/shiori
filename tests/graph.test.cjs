const {test}=require('node:test');const assert=require('node:assert/strict');
const {build,step}=require('../ui/graph.js');const Links=require('../ui/note-links.js');
const note=(path,links=[])=>({path,title:path,tags:['shared'],links});
test('links create undirected deduplicated edges and preserve isolated notes',()=>{
 const notes=[note('notes/a.html',['b.html#one','b.html#two','a.html#self']),note('notes/b.html',['a.html']),note('notes/c.html')];
 const graph=build(notes);assert.equal(graph.nodes.length,3);assert.deepEqual(graph.edges,[{source:0,target:1}]);assert.equal(graph.unresolved,0);assert.deepEqual(build(notes),graph);
 for(let i=0;i<60;i++)step(graph,i);assert.ok(graph.nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));
});
test('resolver handles encoded Unicode, NFC fallback, ambiguity and vault boundaries',()=>{
 const paths=Links.index([note('notes/a.html'),note('notes/日本語.html'),note('notes/cafe\u0301.html')]);
 assert.deepEqual(Links.resolve('notes/a.html','%E6%97%A5%E6%9C%AC%E8%AA%9E.html?q=x#h',paths),{kind:'note',path:'notes/日本語.html'});
 assert.equal(Links.resolve('notes/a.html','café.html',paths).path,'notes/cafe\u0301.html');
 for(const href of ['https://example.com/a.html','//example.com/a.html','mailto:a','../assets/a.png','../styles/a.html','#heading'])assert.equal(Links.resolve('notes/a.html',href,paths).kind,'ignored');
 for(const href of ['../../outside.html','/notes/a.html','/__vault__/notes/a.html','missing.html','%FF.html','%2e%2e/%2e%2e/out.html'])assert.equal(Links.resolve('notes/a.html',href,paths).kind,'unresolved');
 const ambiguous=Links.index([note('notes/éé.html'),note('notes/e\u0301é.html')]);assert.equal(Links.resolve('notes/a.html','ée%CC%81.html',ambiguous).kind,'unresolved');
});
test('filtered-out destinations are not broken links; missing HTML links are counted',()=>{
 const notes=[note('notes/a.html',['b.html','gone.html','gone.html']),note('notes/b.html')];const graph=build([notes[0]],notes);assert.equal(graph.edges.length,0);assert.equal(graph.unresolved,1);
});
test('10000 notes are present without pages and layout is deterministic',()=>{
 const notes=Array.from({length:10000},(_,i)=>note(`notes/${i}.html`,i?[`${i-1}.html`]:[]));const graph=build(notes);assert.equal(graph.nodes.length,10000);assert.equal(graph.edges.length,9999);
 step(graph);assert.ok(graph.nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));
 const small=notes.slice(0,20),a=build(small),b=build(small);for(let i=0;i<60;i++){step(a,i);step(b,i);}assert.deepEqual(a,b);assert.deepEqual(build([]).nodes,[]);
});
