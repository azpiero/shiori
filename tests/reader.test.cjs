const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Workspace}=require('../ui/workspace.js');
const {create}=require('../ui/reader.js');
const {createDocument}=require('./dom.cjs');
function setup(callbacks={}){
 const document=createDocument();document.querySelector('#app').innerHTML='<div id="readerPanel"></div>';
 let vault={token:'vault-token',revision:'v1',notes:[{path:'a.html',title:'A',links:[{href:'b.html#section',text:'Read B'},{href:'https://example.com',text:'External'},{href:'../outside.html',text:'Outside'}]},{path:'b.html',title:'B',links:[]},{path:'c.html',title:'C',links:[]}]};
 let selected='',error='';
 const reader=create({document,getVault:()=>vault,getTheme:()=> 'light',onSelect:path=>selected=path,onStatus:text=>error=text,...callbacks});
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

function splitSetup(){
 const state=setup(),{reader,document}=state,panel=document.querySelector('#readerPanel'),divider=document.querySelector('#pane-splitter');
 const styles={};panel.style.setProperty=(key,value)=>styles[key]=value;
 panel.clientWidth=1005;panel.scrollLeft=0;panel.getBoundingClientRect=()=>({left:100});
 const callbacks=new Map();let next=0;
 document.defaultView.requestAnimationFrame=fn=>{callbacks.set(++next,fn);return next;};
 document.defaultView.cancelAnimationFrame=id=>callbacks.delete(id);
 const flush=()=>{for(const [id,fn] of callbacks){callbacks.delete(id);fn();}};
 const key=key=>divider.onkeydown({key,preventDefault(){}});
 reader.open('a.html');reader.open('b.html','','side');
 return {...state,panel,divider,styles,key,flush,callbacks};
}

test('divider has the correct DOM order and keyboard clamps both panes at 320px',()=>{
 const {panel,divider,styles,key}=splitSetup();
 assert.deepEqual(panel.children.map(el=>el.id),['pane-0','pane-splitter','pane-1']);
 assert.equal(divider.hidden,false);assert.equal(divider.getAttribute('role'),'separator');
 assert.equal(divider.getAttribute('tabindex'),'0');
 key('ArrowRight');assert.equal(styles['--pane-a'],'550px');
 for(let i=0;i<20;i++)key('ArrowRight');
 assert.ok(Math.abs(parseFloat(styles['--pane-a'])-680)<.001);assert.ok(Math.abs(parseFloat(styles['--pane-b'])-320)<.001);
 key('Home');assert.equal(styles['--pane-a'],'320px');
 assert.equal(divider.getAttribute('aria-valuemin'),'32');assert.equal(divider.getAttribute('aria-valuemax'),'68');
 key('End');assert.equal(styles['--pane-a'],'500px');
 key('ArrowLeft');divider.ondblclick();assert.equal(styles['--pane-a'],'500px');
});

test('split ratio survives closing either pane, clamps in narrow windows, and resets with the vault',()=>{
 for(const closed of [0,1]){
  const {reader,panel,divider,styles,key}=splitSetup();key('ArrowRight');
  reader.model.closePane(closed);reader.render();assert.equal(divider.hidden,true);
  reader.open('a.html','','side');assert.equal(divider.hidden,false);assert.equal(styles['--pane-a'],'550px');
  panel.clientWidth=400;reader.render();assert.equal(styles['--pane-a'],'320px');assert.equal(styles['--pane-b'],'320px');
  assert.equal(divider.getAttribute('aria-valuenow'),'50');
  panel.clientWidth=1005;reader.render();assert.equal(styles['--pane-a'],'550px');
  reader.reset();assert.equal(divider.hidden,true);reader.open('a.html','','side');assert.equal(styles['--pane-a'],'500px');
 }
});

test('drag shields iframe input, batches motion, accounts for scroll, and cleans up on release/cancel/reset',()=>{
 const {reader,document,panel,divider,styles,flush,callbacks}=splitSetup();
 panel.scrollLeft=50;divider.getBoundingClientRect=()=>({left:550});
 const down=()=>divider.onpointerdown({button:0,pointerId:1,clientX:552,preventDefault(){}});
 const shield=()=>document.querySelector('.pane-resize-shield');
 down();assert.ok(shield());assert.equal(document.activeElement,divider);
 const frame=reader.frames.values().next().value.frame,url=frame.src;
 divider.onpointermove({pointerId:2,clientX:900});assert.equal(callbacks.size,0);
 divider.onpointermove({pointerId:1,clientX:602});divider.onpointermove({pointerId:1,clientX:652});
 assert.equal(callbacks.size,1);assert.equal(styles['--pane-a'],'500px');flush();assert.equal(styles['--pane-a'],'600px');
 divider.onpointerup({pointerId:1,clientX:702});assert.equal(styles['--pane-a'],'650px');assert.equal(shield(),null);assert.equal(frame.src,url);
 down();divider.onpointermove({pointerId:1,clientX:0});divider.onpointercancel();flush();assert.equal(shield(),null);assert.equal(styles['--pane-a'],'650px');
 down();reader.reset();assert.equal(shield(),null);assert.equal(callbacks.size,0);
});


test('tag names only filter while remove and add request an editor for the originating note',()=>{
 const filtered=[],edits=[];const {reader,document,vault}=setup({onTag:t=>filtered.push(t),onEditTags:(...args)=>edits.push(args)});
 vault.notes[0].tags=['design'];reader.open('a.html');reader.open('b.html','','side');
 const pane=document.querySelector('#pane-0'),tags=document.querySelector('#pane-tags-0');
 pane.onclick({target:tags.querySelector('[data-tag]')});assert.deepEqual(filtered,['design']);assert.deepEqual(edits,[]);
 pane.onclick({target:tags.querySelector('[data-remove-tag]')});pane.onclick({target:tags.querySelector('[data-add-tag]')});
 assert.deepEqual(edits,[['a.html','design'],['a.html',undefined]]);assert.deepEqual(vault.notes[0].tags,['design']);
 assert.equal(tags.querySelector('[data-remove-tag]').getAttribute('aria-label'),'タグを外す: design');
});

test('metadata snapshots update both panes but reload only changed notes and preserve queries',()=>{
 const {reader,document,vault,setVault}=setup();const a=reader.open('a.html','','current','alpha');const b=reader.open('b.html','','tab','beta');const other=reader.open('a.html','','side','other');
 const frame=reader.frames.get(b.id).frame,url=frame.src;
 setVault({...vault,revision:'new',notes:vault.notes.map(n=>({...n,tags:['new']}))});reader.metadataRefresh(new Set(['a.html']));
 assert.equal(frame.src,url);assert.equal(a.query,'alpha');assert.equal(other.query,'other');
 for(const i of [0,1])assert.equal(document.querySelector('#pane-tags-'+i).querySelector('[data-tag]').dataset.tag,'new');
 assert.equal(reader.model.activePane,1);assert.equal(reader.model.tab.id,other.id);
});
