const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {build}=require('../ui/graph.js');

// Exercise app event handlers with a small DOM/Tauri adapter. These checks do not
// simulate WebView rendering, layout, or iframe navigation; those require manual QA.
async function setup(){
 const elements=new Map(),events=new Map();let refreshResult,refreshError;
 const document={activeElement:null,body:{append(){}},documentElement:{style:{setProperty(){}},classList:{toggle(){}}}};
 class Element{
  constructor(name){this.name=name;this.id=name.startsWith('#')?name.slice(1):'';this.dataset={};this.attributes={};this.events={};this.hidden=false;this.value='';this.textContent='';this.classes=new Set();this.classList={add:k=>this.classes.add(k),remove:k=>this.classes.delete(k),toggle:(k,on)=>on?this.classes.add(k):this.classes.delete(k)};this.style={};}
  set innerHTML(html){this.html=html;if(this.name==='#app'){for(const match of html.matchAll(/id="([^"]+)"/g))elements.set('#'+match[1],new Element('#'+match[1]));}if(this.name==='#graphSvg')elements.set('#graphSvg .graph-world',new Element('world'));}
  get innerHTML(){return this.html||'';}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(k,fn){this.events[k]=fn;}
  focus(){document.activeElement=this;}
  closest(){return null;}
  querySelectorAll(){return [];}
 }
 elements.set('#app',new Element('#app'));
 for(const name of ['.frame-wrap','.view-nav'])elements.set(name,new Element(name));
 document.querySelector=name=>{const el=elements.get(name);assert.ok(el,'Unknown selector: '+name);return el;};
 document.createElement=()=>new Element('new');
 const notes=Array.from({length:160},(_,i)=>({path:`notes/${i}.html`,title:`Note ${i}`,text:'knowledge',tags:[i%2?'odd':'even'],headings:[]}));
 const vault={root:'/test/vault',token:'test-token',revision:'r1',notes,errors:[],scan_ms:1};
 refreshResult=vault;
 const context=vm.createContext({document,URL,performance,ShioriGraph:{build},localStorage:{getItem:()=>null,setItem(){}},setTimeout,clearTimeout,setInterval(){},window:{__TAURI__:{core:{invoke:async name=>{if(name==='open_vault')return vault;if(name==='refresh_vault'){if(refreshError)throw refreshError;return refreshResult;}throw new Error(name);}},event:{listen:(name,fn)=>events.set(name,fn)}}}});
 const run=code=>vm.runInContext(code,context);
 run(fs.readFileSync(require.resolve('../ui/app.js'),'utf8'));
 await new Promise(resolve=>setImmediate(resolve));
 const get=id=>elements.get(id);
 const served=(count=3)=>events.get('note-served')({payload:{path:run('selected'),url:get('#noteFrame').src,hits:count}});
 return {run,get,served,events,vault,setRefresh(result,error){refreshResult=result;refreshError=error;}};
}

test('graph exploration survives opening a note and switching back; context changes reset it',async()=>{
 const {run,get,served}=await setup();
 run('setTag("even");setView(true)');get('#zoomIn').onclick();run('graphX=80;graphY=-40;graphTransform()');
 const transform=get('#graphSvg .graph-world').attributes.transform;
 run('openNote("notes/2.html")');served();get('#showGraph').onclick();
 assert.equal(get('#graphSvg .graph-world').attributes.transform,transform);
 assert.equal(run('tag'),'even');assert.equal(get('#showGraph').attributes['aria-pressed'],'true');
 run('setTag("odd")');assert.equal(run('graphScale'),1);assert.equal(run('graphX'),0);
 run('setTag("");setView(true)');get('#graphNext').onclick();get('#zoomIn').onclick();
 run('openNote("notes/155.html");setView(true)');assert.equal(run('graphPage'),1);assert.equal(run('graphScale'),1.25);
 get('#search').value='Note 1';run('applySearch()');assert.equal(run('graphPage'),0);assert.equal(run('graphScale'),1);
});

test('search controls describe only the displayed query and hide outside note search',async()=>{
 const {run,get,served}=await setup();
 assert.equal(get('#searchNavigation').hidden,true);
 get('#search').value='knowledge';run('applySearch();openNote(selected)');served();
 assert.equal(get('#searchNavigation').hidden,false);assert.equal(get('#hitCount').textContent,'本文内 1 / 3');
 get('#next').onclick();assert.match(get('#noteFrame').src,/#shiori-hit-1$/);
 get('#showGraph').onclick();assert.equal(get('#searchNavigation').hidden,true);
 get('#showNote').onclick();assert.equal(get('#searchNavigation').hidden,false);
 get('#search').value='Note';run('applySearch()');assert.equal(get('#searchNavigation').hidden,true);
 run('openNote(selected)');served(0);assert.equal(get('#hitCount').textContent,'本文内 0件');assert.equal(get('#next').disabled,true);
 get('#search').value='';run('applySearch()');assert.equal(get('#searchNavigation').hidden,true);
 assert.equal(new URL(get('#noteFrame').src).searchParams.get('q'),'');
});

test('filtering keeps the current note identifiable without putting tag buttons inside note buttons',async()=>{
 const {run,get}=await setup();
 run('setTag("odd")');assert.equal(get('#currentNote').hidden,false);assert.match(get('#currentNote').innerHTML,/Note 0/);
 assert.match(get('#currentNote').innerHTML,/notes\/0.html/);
 run('setTag("")');assert.equal(get('#currentNote').hidden,true);
 let depth=0;
 for(const token of get('#notes').innerHTML.matchAll(/<\/?button\b[^>]*>/g)){
  if(token[0].startsWith('</'))depth--;else{assert.equal(depth,0,'nested button');depth++;}
 }
 assert.equal(depth,0);
 assert.match(get('#notes').innerHTML,/aria-current="true"/);
 assert.match(get('#notes').innerHTML,/aria-label="タググラフを開く: even"/);
});

test('refresh resets graph after content changes and handles deleted notes and empty vaults',async()=>{
 const {run,get,vault,setRefresh}=await setup();
 run('setView(true)');get('#graphNext').onclick();get('#zoomIn').onclick();
 setRefresh({...vault,revision:'r2',notes:vault.notes.slice(1)});
 await run('refresh()');assert.equal(run('selected'),'notes/1.html');assert.equal(run('graphPage'),0);assert.equal(run('graphScale'),1);assert.equal(run('graphMode'),true);
 setRefresh({...vault,revision:'r3',notes:[]});await run('refresh()');
 assert.equal(run('selected'),'');assert.equal(get('#currentNote').hidden,true);assert.equal(get('#searchNavigation').hidden,true);assert.equal(get('#noteFrame').src,'about:blank');assert.equal(get('#reload').disabled,false);
});

test('failed refresh keeps update notification and re-enables vault actions',async()=>{
 const {run,get,setRefresh}=await setup();
 run('changed=true');get('#notice').classList.add('show');setRefresh(null,new Error('Cannot read vault'));
 await run('refresh()');assert.equal(run('changed'),true);assert.ok(get('#notice').classes.has('show'));
 assert.equal(get('#reload').disabled,false);assert.match(get('#status').textContent,/Cannot read vault/);
});

test('Enter waits for IME completion; events from a previous vault are ignored',async()=>{
 const {run,get,events}=await setup();
 get('#search').value='Note 5';get('#search').events.keydown({key:'Enter',isComposing:true});assert.equal(run('selected'),'notes/0.html');
 get('#search').events.keydown({key:'Enter',isComposing:false});assert.equal(run('selected'),'notes/5.html');
 events.get('note-served')({payload:{path:'stale.html',url:'vault://localhost/old-token/stale.html',hits:9}});
 assert.equal(run('selected'),'notes/5.html');
});
