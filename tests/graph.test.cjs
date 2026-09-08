const {test}=require('node:test');
const assert=require('node:assert/strict');
const {build}=require('../ui/graph.js');
test('shared tags form hubs; edges only connect notes to their own tags',()=>{
 const notes=[{path:'a.html',title:'A',tags:['Rust','設計','Rust']},{path:'b.html',title:'B',tags:['Rust']},{path:'c.html',title:'C',tags:[]}];
 const g=build(notes), nodes=new Map(g.nodes.map(n=>[n.id,n]));
 assert.equal(g.nodes.filter(n=>n.kind==='tag').length,2);
 assert.equal(nodes.get('tag:Rust').count,2);assert.equal(g.edges.length,3);
 assert.ok(nodes.has('note:c.html'));
 for(const e of g.edges){assert.equal(nodes.get(e.source).kind,'note');assert.equal(nodes.get(e.target).kind,'tag');assert.ok(notes.find(n=>'note:'+n.path===e.source).tags.includes(nodes.get(e.target).label));}
 assert.deepEqual(build(notes),g);
});
test('all 10000 notes remain reachable through bounded pages, including final page',()=>{
 const notes=Array.from({length:10000},(_,i)=>({path:`${i}.html`,title:String(i),tags:['共通',`分野/${i%8}`]}));
 const seen=new Set();
 for(let p=0;p<Math.ceil(notes.length/150);p++){
  const g=build(notes,p);assert.ok(g.shown<=150);assert.ok(g.edges.length<=300);
  for(const n of g.nodes){assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));if(n.kind==='note'){assert.ok(!seen.has(n.path));seen.add(n.path);}}
 }
 assert.equal(seen.size,10000);assert.equal(build(notes,999).page,66);
});
test('empty results and tag names resembling note keys stay unambiguous',()=>{
 assert.deepEqual(build([]).nodes,[]);assert.equal(build([],9).page,0);
 const g=build([{path:'Rust',title:'<script>',tags:['Rust','技術/Rust']}]);
 assert.equal(new Set(g.nodes.map(n=>n.id)).size,3);assert.equal(g.edges.length,2);
});
