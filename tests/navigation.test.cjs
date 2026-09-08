const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {build}=require('../ui/graph.js');
const ShioriSearch=require('../ui/search.js');
const ShioriReader=require('../ui/reader.js');
const ShioriTagEditor=require('../ui/tag-editor.js');
const {create:terminalCreate}=require('../ui/terminal.js');
const terminalStub=require('./terminal-stub.cjs');
const ShioriTerminal={create:options=>terminalCreate({...options,...terminalStub})};
const {createDocument}=require('./dom.cjs');

// Exercise app event handlers with a small DOM/Tauri adapter. These checks do not
// simulate WebView rendering, layout, or iframe navigation; those require manual QA.
async function setup(initialErrors=[],initialWarnings=[]){
 const events=new Map(),calls=[],commands={},intervals=[];let refreshResult,refreshError;
 const document=createDocument();
 const notes=Array.from({length:160},(_,i)=>({path:`notes/${i}.html`,title:`Note ${i}`,text:'knowledge',tags:[i%2?'odd':'even'],headings:[]}));
 const vault={root:'/test/vault',token:'test-token',revision:'r1',notes,errors:initialErrors,warnings:initialWarnings,scan_ms:1};
 refreshResult=vault;
 const context=vm.createContext({document,URL,performance,ShioriSearch,ShioriReader,ShioriTagEditor,ShioriTerminal,ShioriGraph:{build},localStorage:{getItem:()=>null,setItem(){}},setTimeout,clearTimeout,setInterval(fn){intervals.push(fn);},window:{__TAURI__:{core:{invoke:async (name,args)=>{calls.push({name,args});if(commands[name])return commands[name](args);if(name==='terminal_start')return {cwd:'/test/workspace',vault:vault.root};if(name==='terminal_stop')return;if(name==='plugin:dialog|open')return '/another-vault';if(name==='open_vault')return vault;if(name==='refresh_vault'){if(refreshError)throw refreshError;return refreshResult;}throw new Error(name);}},event:{listen:(name,fn)=>events.set(name,fn)}}}});
 const run=code=>vm.runInContext(code,context);
 run(fs.readFileSync(require.resolve('../ui/app.js'),'utf8'));
 await new Promise(resolve=>setImmediate(resolve));
 const get=id=>id==='#noteFrame'?run('reader.frames.get(reader.model.tab?.id)?.frame'):document.querySelector(id);
 const served=(count=3)=>events.get('note-served')({payload:{path:run('selected'),url:get('#noteFrame').src,hits:count}});
 return {run,get,served,events,vault,calls,commands,intervals,setRefresh(result,error){refreshResult=result;refreshError=error;}};
}

test('graph exploration survives opening a note and switching back; context changes reset it',async()=>{
 const {run,get,served}=await setup();
 run('setTag("even");setView(true)');get('#zoomIn').onclick();run('graphX=80;graphY=-40;graphTransform()');
 const transform=get('#graphSvg .graph-world').attributes.transform;
 run('openNote("notes/2.html")');served();get('#showGraph').onclick();
 assert.equal(get('#graphSvg .graph-world').attributes.transform,transform);
 assert.equal(run('activeTags.join()'),'even');assert.equal(get('#showGraph').attributes['aria-pressed'],'true');
 run('setTag("odd")');assert.equal(run('graphScale'),1);assert.equal(run('graphX'),0);
 run('setTag("");setView(true)');get('#graphNext').onclick();get('#zoomIn').onclick();
 run('openNote("notes/155.html");setView(true)');assert.equal(run('graphPage'),1);assert.equal(run('graphScale'),1.25);
 get('#search').value='Note 1';run('applySearch()');assert.equal(run('graphPage'),0);assert.equal(run('graphScale'),1);
});

test('list search does not change an already-open tab search',async()=>{
 const {run,get,served}=await setup();
 get('#search').value='knowledge';run('applySearch();openNote(selected)');served();
 assert.equal(run('reader.model.tab.query'),'knowledge');
 assert.equal(get('#pane-hits-0').textContent,'1 / 3');
 run('reader.moveHit(0,1)');assert.match(get('#noteFrame').src,/#shiori-hit-1$/);
 get('#search').value='Note';run('applySearch()');assert.equal(run('reader.model.tab.query'),'knowledge');
 get('#showGraph').onclick();get('#showNote').onclick();assert.equal(run('reader.model.tab.hit'),1);
});

test('filtering keeps the current title identifiable while tags appear only in the reader',async()=>{
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
 assert.equal(get('#notes').querySelectorAll('[data-tag]').length,0);
 assert.equal(get('#currentNote').querySelectorAll('[data-tag]').length,0);
 assert.match(get('#pane-tags-0').innerHTML,/aria-label="タグで絞り込む: even"/);
});

test('refresh resets graph after content changes and handles deleted notes and empty vaults',async()=>{
 const {run,get,vault,setRefresh}=await setup();
 run('setView(true)');get('#graphNext').onclick();get('#zoomIn').onclick();
 setRefresh({...vault,revision:'r2',notes:vault.notes.slice(1)});
 await run('refresh()');assert.equal(run('selected'),'');assert.equal(run('graphPage'),0);assert.equal(run('graphScale'),1);assert.equal(run('graphMode'),true);
 setRefresh({...vault,revision:'r3',notes:[]});await run('refresh()');
 assert.equal(run('selected'),'');assert.equal(get('#currentNote').hidden,true);assert.equal(run('reader.model.all().length'),0);assert.equal(get('#reload').disabled,false);
});

test('failed refresh keeps update notification and re-enables vault actions',async()=>{
 const {run,get,setRefresh}=await setup();
 run('changed=true');get('#notice').classList.add('show');setRefresh(null,new Error('Cannot read vault'));
 await run('refresh()');assert.equal(run('changed'),true);assert.ok(get('#notice').classes.has('show'));
 assert.equal(get('#reload').disabled,false);assert.match(get('#status').textContent,/Cannot read vault/);
});

test('Enter waits for IME completion; events from a previous vault are ignored',async()=>{
 const {run,get,events}=await setup();
 get('#search').value='Note 5';get('#search').events.keydown({key:'Enter',preventDefault(){},isComposing:true});assert.equal(run('selected'),'notes/0.html');
 get('#search').events.keydown({key:'Enter',preventDefault(){},isComposing:false});assert.equal(run('selected'),'notes/5.html');
 events.get('note-served')({payload:{path:'stale.html',url:'vault://localhost/old-token/stale.html',hits:9}});
 assert.equal(run('selected'),'notes/5.html');
});


test('scan errors remain accessible after note load and clear after a successful refresh',async()=>{
 const error='/vault/<img onerror="bad">.html: Invalid UTF-8';
 const {run,get,served,vault,setRefresh}=await setup([error]);
 assert.equal(get('#readErrors').hidden,false);
 assert.equal(get('#readErrorsSummary').textContent,'読み取りエラー 1件');
 assert.match(get('#readErrorsList').innerHTML,/&lt;img onerror=&quot;bad&quot;&gt;/);
 assert.ok(!get('#readErrorsList').innerHTML.includes('<img'));
 served();assert.equal(get('#readErrors').hidden,false);
 get('#readErrors').open=true;setRefresh({...vault,errors:[]});await run('refresh()');
 assert.equal(get('#readErrors').hidden,true);assert.equal(get('#readErrors').open,false);assert.equal(get('#readErrorsList').innerHTML,'');
});

test('startup requests the default vault; folder and theme controls work',async()=>{
 const {run,get,calls}=await setup();
 assert.equal(calls[0].name,'open_vault');assert.equal(calls[0].args.path,null);
 await get('#open').onclick();assert.ok(calls.some(c=>c.name==='open_vault'&&c.args.path==='/another-vault'));
 assert.equal(get('#open').disabled,false);
 run('setView(true)');get('#theme').onclick();
 assert.equal(get('#theme').attributes['aria-pressed'],'true');assert.equal(run('graphMode'),true);
 get('#theme').onclick();assert.equal(get('#theme').attributes['aria-pressed'],'false');
});

test('tag syntax and graph selection share one query while highlighting only free text',async()=>{
 const {run,get,served}=await setup();
 get('#search').value='knowledge tag: even';run('applySearch();openNote(selected)');served();
 assert.equal(run('currentMatches.length'),80);
 assert.equal(new URL(get('#noteFrame').src).searchParams.get('q'),'knowledge');
 run('setTag("odd")');assert.equal(get('#search').value,'knowledge tag: odd');assert.equal(run('activeTags.join()'),'odd');
 get('#search').value='tag: odd';run('applySearch()');
 assert.equal(run('reader.model.tab.query'),'knowledge');assert.equal(new URL(get('#noteFrame').src).searchParams.get('q'),'knowledge');
});

test('keyboard completion changes the filter without opening a note, and Escape dismisses it',async()=>{
 const {run,get}=await setup();const input=get('#search');
 input.focus();input.value='tag: ';input.setSelectionRange(5,5);
 input.events.keydown({key:'ArrowDown',preventDefault(){}});
 assert.equal(input.attributes['aria-expanded'],'true');assert.equal(input.attributes['aria-activedescendant'],'tag-option-0');
 input.events.keydown({key:'Enter',preventDefault(){}});
 assert.equal(input.value,'tag: even ');assert.equal(run('activeTags.join()'),'even');assert.equal(run('selected'),'notes/0.html');assert.equal(input.attributes['aria-expanded'],'false');
 input.focus();input.value='tag: ';input.setSelectionRange(5,5);input.events.keydown({key:'ArrowUp',preventDefault(){}});
 assert.equal(input.attributes['aria-activedescendant'],'tag-option-1');
 input.events.keydown({key:'Escape'});assert.equal(input.attributes['aria-expanded'],'false');assert.equal(input.value,'tag: ');
});

test('IME composition does not apply partial tag filters or open suggestions',async()=>{
 const {run,get}=await setup();const input=get('#search');
 input.events.compositionstart();input.value='tag: odd';run('applySearch();showSuggestions()');
 assert.equal(run('activeTags.length'),0);assert.equal(input.attributes['aria-expanded'],'false');
 input.events.compositionend();run('clearTimeout(timer);applySearch()');assert.equal(run('activeTags.join()'),'odd');
});


test('vault restoration warnings survive note events and refresh, then clear on a successful selection',async()=>{
 const warning='Cannot restore <missing vault>; opened samples';
 const {run,get,served,vault,setRefresh}=await setup([],[warning]);
 assert.equal(get('#vaultWarnings').hidden,false);
 assert.equal(get('#vaultWarnings').textContent,warning);
 assert.equal(get('#vaultWarnings').children.length,0);
 served();assert.equal(get('#vaultWarnings').hidden,false);
 setRefresh({...vault,warnings:[]});await run('refresh()');
 assert.equal(get('#vaultWarnings').textContent,warning);
 vault.warnings=[];await get('#open').onclick();
 assert.equal(get('#vaultWarnings').hidden,true);
 assert.equal(get('#open').disabled,false);
});


test('reader tags filter without opening the graph or writing from their own pane and preserve free text and reader state',async()=>{
 const {run,get}=await setup();
 get('#search').value='knowledge';run('applySearch();openNote("notes/0.html");openNote("notes/1.html","","side")');
 const frame=get('#noteFrame'),src=frame.src;
 const tag=get('#pane-tags-0').querySelector('[data-tag]');tag.focus();
 get('#pane-0').onclick({target:tag});
 assert.equal(run('reader.model.activePane'),0);assert.equal(run('selected'),'notes/0.html');
 assert.equal(run('graphMode'),false);assert.equal(get('#search').value,'knowledge tag: even');
 assert.equal(get('#showGraph').getAttribute('aria-pressed'),'false');
 assert.equal(run('document.activeElement.dataset.tag'),'even');
 get('#showNote').onclick();
 assert.equal(frame.src,src);assert.equal(run('reader.model.panes[1].tabs[0].path'),'notes/1.html');
 assert.equal(run('reader.model.panes[1].tabs[0].query'),'knowledge');
});


test('terminal keeps refresh available and binds context to the vault rather than the selected note',async()=>{
 const {run,get,calls,events,vault}=await setup();
 await run('terminalPanel.initialized');await get('#showTerminal').onclick();
 const args=calls.find(c=>c.name==='terminal_start').args;
 assert.equal(args.vaultToken,vault.token);assert.equal(args.path,undefined);
 assert.equal(get('#open').disabled,true);assert.equal(get('#reload').disabled,false);
 const before=calls.length;await run('load("/other")');assert.equal(calls.length,before);
 await run('refresh()');assert.equal(calls.filter(c=>c.name==='refresh_vault').length,1);
 events.get('terminal-output')({payload:{session_id:args.sessionId,exit:true,message:'done'}});
 assert.equal(get('#open').disabled,false);assert.equal(run('changed'),true);
});


test('tag save refreshes both panes, candidates and graph while preserving queries and unrelated frames',async()=>{
 const {run,get,vault,commands,calls}=await setup();
 run('openNote("notes/0.html","","current");openNote("notes/2.html","","tab");openNote("notes/0.html","","side")');
 run('reader.model.panes[0].tabs[0].query="alpha";reader.model.tab.query="beta"');
 const untouched=run('reader.frames.get(reader.model.panes[0].tabs[1].id).frame'),src=untouched.src;
 commands.get_note_tags=()=>({tags:['even'],expected_hash:'hash'});
 commands.set_note_tags=()=>({saved:true,snapshot:{...vault,revision:'r2',notes:vault.notes.map(n=>n.path==='notes/0.html'?{...n,tags:['new'],source_hash:'new'}:n)},warning:null});
 await run('tagEditor.open("notes/0.html","even")');assert.equal(get('#open').disabled,true);assert.equal(get('#reload').disabled,true);
 get('#tag-editor-input').value='new';get('#tag-editor-add').onclick();await get('#tag-editor-save').onclick();
 assert.equal(run('document.activeElement.dataset.addTag'),'');
 assert.equal(run('vault.revision'),'r2');assert.equal(get('#open').disabled,false);assert.equal(untouched.src,src);
 assert.equal(run('reader.model.panes[0].tabs[0].query'),'alpha');assert.equal(run('reader.model.tab.query'),'beta');
 assert.equal(get('#pane-tags-1').querySelector('[data-tag]').dataset.tag,'new');
 run('reader.model.select(0,reader.model.panes[0].tabs[0].id);reader.render()');assert.equal(get('#pane-tags-0').querySelector('[data-tag]').dataset.tag,'new');
 run('setTag("new");setView(true)');assert.equal(run('currentMatches.length'),1);assert.ok(get('#graphSvg').innerHTML.includes('data-value="new"'));
 assert.equal(calls.filter(c=>c.name==='set_note_tags').length,1);
});

test('a revision poll started before an edit cannot announce the completed save as external',async()=>{
 const {run,get,vault,commands,intervals}=await setup();let resolve;
 commands.vault_revision=()=>new Promise(r=>resolve=r);const poll=intervals[0]();
 commands.get_note_tags=()=>({tags:['even'],expected_hash:'hash'});commands.set_note_tags=()=>({saved:true,snapshot:{...vault,revision:'r2'},warning:null});
 await run('tagEditor.open("notes/0.html")');await get('#tag-editor-save').onclick();resolve('r1');await poll;
 assert.equal(run('changed'),false);assert.equal(get('#notice').classList.contains('show'),false);
 commands.vault_revision=()=> 'external';await intervals[0]();assert.equal(run('changed'),true);
});
