const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Workspace}=require('../ui/workspace.js');
const {create}=require('../ui/reader.js');
const {createDocument}=require('./dom.cjs');
function setup(){
 const document=createDocument();document.querySelector('#app').innerHTML='<div id="readerPanel"></div>';
 let vault={token:'vault-token',revision:'v1',notes:[{path:'a.html',title:'A',links:[{href:'b.html#section',text:'Read B'},{href:'https://example.com',text:'External'},{href:'../outside.html',text:'Outside'}]},{path:'b.html',title:'B',links:[]},{path:'c.html',title:'C',links:[]}]};
 let selected='',error='';
 const reader=create({document,getVault:()=>vault,getTheme:()=> 'light',onSelect:path=>selected=path,onStatus:text=>error=text});
 const served=(tab,hits=2,url=tab.url)=>reader.served({path:tab.path,hits,url});
 return {reader,document,served,selected:()=>selected,error:()=>error,setVault:v=>vault=v,vault};
}

test('two panes route responses independently and keep their own queries and match positions',()=>{
 const {reader,served,selected}=setup();
 const left=reader.open('a.html','','current','alpha');
 const right=reader.open('b.html','','side','beta');
 served(right,5);served(left,3);reader.moveHit(0,1);
 assert.equal(left.query,'alpha');assert.equal(left.hit,1);assert.equal(right.query,'beta');assert.equal(right.hit,0);
 assert.equal(selected(),'b.html');assert.equal(reader.model.activePane,1);
 assert.equal(reader.model.panes.filter(Boolean).length,2);
});

test('switching tabs retains the same attached iframe and never rewrites its source',()=>{
 const {reader}=setup();const first=reader.open('a.html');
 const original=reader.frames.get(first.id),parent=original.panel.parentNode,url=original.frame.src;
 const second=reader.open('b.html','','tab');
 assert.equal(original.panel.hidden,true);
 reader.model.select(0,first.id);reader.render();
 assert.equal(reader.frames.get(first.id).frame,original.frame);assert.equal(original.panel.parentNode,parent);assert.equal(original.frame.src,url);assert.equal(original.panel.hidden,false);
 assert.equal(reader.frames.get(second.id).panel.hidden,true);
});

test('old loads, closed tabs, and foreign vault events cannot change the reader',()=>{
 const {reader,served}=setup();const tab=reader.open('a.html'),old=tab.url;
 reader.open('b.html');served(tab,9,old);assert.equal(tab.hits,0);
 served(tab,9,tab.url.replace('vault-token','other'));assert.equal(tab.hits,0);
 reader.model.close(0,tab.id);reader.render();served(tab,9);
 assert.equal(reader.model.all().length,0);assert.equal(reader.frames.size,0);
});

test('reload preserves surviving pane/tab selection and queries, closes missing paths, and invalidates requests',()=>{
 const {reader,vault,setVault}=setup();const a=reader.open('a.html','','current','alpha');
 const b=reader.open('b.html','','tab','beta');reader.open('c.html','','side','gamma');
 const old=a.request;setVault({...vault,revision:'v2',notes:vault.notes.filter(n=>n.path!=='b.html')});reader.refresh();
 assert.equal(reader.model.panes[0].active,a.id);assert.equal(reader.model.find(b.id),undefined);assert.equal(a.query,'alpha');assert.notEqual(a.request,old);
 assert.equal(reader.model.activePane,1);assert.equal(reader.model.tab.path,'c.html');assert.equal(reader.model.tab.query,'gamma');
});

test('link choices open in a separate tab or pane and every frame retains its sandbox',()=>{
 const {reader,document}=setup();reader.open('a.html');
 const choices=document.querySelector('#links-0');assert.ok(!choices.innerHTML.includes('External'));assert.ok(!choices.innerHTML.includes('Outside'));
 const target=choices.querySelector('[data-mode="side"]');
 document.querySelector('#pane-0').onclick({target});
 assert.equal(reader.model.tab.path,'b.html');assert.equal(reader.model.activePane,1);assert.match(reader.model.tab.url,/#section$/);
 for(const {frame} of reader.frames.values())assert.equal(frame.getAttribute('sandbox'),'');
});

test('tab keyboard navigation and closing keep an accessible active tab and pane movement preserves frames',()=>{
 const {reader,document}=setup();const a=reader.open('a.html');const b=reader.open('b.html','','tab');
 const keys=document.querySelector('#tabs-0');keys.onkeydown({target:document.querySelector('#tab-'+b.id),key:'ArrowLeft',preventDefault(){}});
 assert.equal(reader.model.tab.id,a.id);assert.equal(document.activeElement.id,'tab-'+a.id);
 keys.onkeydown({target:document.querySelector('#tab-'+a.id),key:'Delete',preventDefault(){}});
 assert.equal(reader.model.tab.id,b.id);assert.equal(reader.frames.has(a.id),false);
 const frame=reader.frames.get(b.id).frame;reader.open('c.html','','side');reader.model.closePane(1);reader.render();
 assert.equal(reader.model.activePane,0);assert.equal(reader.frames.get(b.id).frame,frame);
});

test('the tab limit fails without changing the current pane or destroying tabs',()=>{
 const {reader,error}=setup();for(let i=0;i<12;i++)reader.open('a.html','','tab');
 const active=reader.model.tab;reader.open('b.html','','side');
 assert.equal(reader.model.tab,active);assert.equal(reader.model.panes[1],null);assert.equal(reader.frames.size,12);assert.match(error(),/12/);
});

test('new empty tabs have a visible tabpanel and session reset releases all frames',()=>{
 const {reader,document}=setup();const tab=reader.open('','','tab');
 const panel=document.querySelector('#panel-'+tab.id);assert.equal(panel.hidden,false);assert.equal(panel.getAttribute('role'),'tabpanel');
 reader.reset();assert.equal(reader.model.all().length,0);assert.equal(reader.frames.size,0);
 const model=new Workspace();assert.equal(model.panes.filter(Boolean).length,1);
});

test('focused iframe selects its pane, and pane search does not change its neighbor',()=>{
 const {reader,document}=setup();const left=reader.open('a.html','','current','alpha');const right=reader.open('b.html','','side','beta');
 reader.frames.get(left.id).frame.focus();reader.syncFocusedFrame();assert.equal(reader.model.activePane,0);
 const input=document.querySelector('#pane-query-0');input.value='new alpha';
 const old=left.request;input.onkeydown({key:'Enter',isComposing:true,preventDefault(){}});assert.equal(left.request,old);
 input.onkeydown({key:'Enter',isComposing:false,preventDefault(){}});
 assert.equal(left.query,'new alpha');assert.equal(right.query,'beta');assert.equal(new URL(right.url).searchParams.get('q'),'beta');
 document.querySelector('#pane-0').onclick({target:document.querySelector('#pane-0').querySelector('[data-action="next"]')});
 assert.equal(reader.model.activePane,1);assert.equal(document.activeElement.id,'tab-'+right.id);
});

test('an internal link updates only its originating tab even while the other pane is active',()=>{
 const {reader,selected}=setup();const left=reader.open('a.html','','current','alpha');const right=reader.open('c.html','','side','gamma');
 const url=new URL(left.url);url.pathname='/vault-token/b.html';
 reader.served({path:'b.html',url:url.href,hits:4});
 assert.equal(left.path,'b.html');assert.equal(left.query,'alpha');assert.equal(left.hits,4);
 assert.equal(right.path,'c.html');assert.equal(right.query,'gamma');assert.equal(selected(),'c.html');
});


test('pane tags follow tab selection, internal navigation, reload, and empty tabs',()=>{
 const {reader,document,vault,setVault}=setup();
 vault.notes[0].tags=['design','<tag "quoted">'];vault.notes[1].tags=['Rust'];vault.notes[2].tags=[];
 const left=reader.open('a.html');reader.open('b.html','','side');
 const tags=i=>document.querySelector('#pane-tags-'+i);
 assert.deepEqual(tags(0).querySelectorAll('[data-tag]').map(b=>b.dataset.tag),vault.notes[0].tags);
 assert.equal(tags(0).querySelectorAll('tag').length,0);
 assert.equal(tags(1).querySelector('[data-tag]').dataset.tag,'Rust');
 reader.activate(0);const c=reader.open('c.html','','tab');assert.match(tags(0).innerHTML,/タグなし/);
 reader.model.select(0,left.id);reader.render();assert.equal(tags(0).querySelector('[data-tag]').dataset.tag,'design');
 const focused=tags(0).querySelector('[data-tag]');focused.focus();reader.render();assert.equal(tags(0).querySelector('[data-tag]'),focused);
 const url=new URL(left.url);url.pathname='/vault-token/b.html';reader.served({path:'b.html',url:url.href,hits:0});
 assert.equal(tags(0).querySelector('[data-tag]').dataset.tag,'Rust');
 setVault({...vault,revision:'v2',notes:vault.notes.map(n=>({...n,tags:['updated']}))});reader.refresh();
 for(const i of [0,1])assert.equal(tags(i).querySelector('[data-tag]').dataset.tag,'updated');
 reader.open('','','tab');assert.equal(tags(0).hidden,true);assert.equal(tags(0).innerHTML,'');
 reader.model.close(0,reader.model.tab.id);reader.render();assert.equal(tags(0).hidden,false);
 reader.reset();assert.equal(tags(0).hidden,true);
});
