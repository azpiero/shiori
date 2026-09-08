const {test}=require('node:test'),assert=require('node:assert/strict');
const Graph=require('../ui/graph.js'),{create}=require('../ui/graph-view.js'),{createDocument}=require('./dom.cjs');
test('layout pauses while hidden, replaces obsolete work, and keyboard opens the focused note with modifiers',()=>{
 const document=createDocument(),canvas=document.createElement('canvas'),label=document.createElement('span'),pending=new Map(),opened=[];let id=0;
 const view=create({canvas,label,onOpen:(path,e)=>opened.push({path,shift:e.shiftKey}),requestFrame:fn=>{pending.set(++id,fn);return id;},cancelFrame:key=>pending.delete(key)});
 const fixture=count=>Graph.build(Array.from({length:count},(_,i)=>({path:`notes/${i}.html`,title:String(i),links:[]})));
 view.setModel(fixture(3));assert.equal(pending.size,1);view.setVisible(false);assert.equal(pending.size,0);view.setModel(fixture(2));assert.equal(pending.size,0);view.setVisible(true);
 for(let i=0;i<60;i++){const [key,fn]=pending.entries().next().value;pending.delete(key);fn();}
 assert.equal(view.getState().iteration,60);assert.equal(pending.size,0);assert.equal(view.getState().nodes,2);
 view.zoom(1.25);view.select('notes/1.html');view.setVisible(false);view.setVisible(true);assert.equal(view.getState().scale,1.25);
 canvas.onfocus();canvas.onkeydown({key:'Home',preventDefault(){}});canvas.onkeydown({key:'Enter',shiftKey:true,preventDefault(){}});assert.deepEqual(opened,[{path:'notes/0.html',shift:true}]);assert.match(label.textContent,/notes\/0.html/);
 view.setModel(fixture(1));assert.equal(pending.size,1);assert.equal(view.getState().scale,1);
});
