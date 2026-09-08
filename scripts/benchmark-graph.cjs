/* Optional browser benchmark: node scripts/benchmark-graph.cjs /path/to/playwright */
const fs=require('node:fs'),path=require('node:path');
const {build,step}=require('../ui/graph.js');
function fixture(count){return Array.from({length:count},(_,i)=>({path:`notes/${i}.html`,title:`Note ${i}`,links:i?[`${i-1}.html`,`${Math.floor(i/10)*10}.html`]:[]}));}
(async()=>{
 if(!process.argv[2]){for(const count of [500,2000,10000]){let start=performance.now();const model=build(fixture(count)),buildMs=performance.now()-start;start=performance.now();for(let i=0;i<60;i++)step(model,i);console.log(JSON.stringify({count,edges:model.edges.length,buildMs,layoutMs:performance.now()-start}));}return;}
 const {chromium}=require(process.argv[2]),browser=await chromium.launch({headless:true});
 try{const page=await browser.newPage({viewport:{width:1000,height:740}});
 await page.setContent('<style>canvas{width:1000px;height:700px;--accent:#346753;--ink:#252d29;--bg:#f5f5f1}body{margin:0}</style><canvas tabindex="0"></canvas><span></span>');
 for(const file of ['note-links','graph','graph-view'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../ui',file+'.js'),'utf8')});
 const results=await page.evaluate(async()=>{
 const view=ShioriGraphView.create({canvas:document.querySelector('canvas'),label:document.querySelector('span'),onOpen(){}}),out=[];
 for(const count of [500,2000,10000]){
 const notes=Array.from({length:count},(_,i)=>({path:`notes/${i}.html`,title:`Note ${i}`,links:i?[`${i-1}.html`,`${Math.floor(i/10)*10}.html`]:[]}));
 let start=performance.now();const model=ShioriGraph.build(notes),buildMs=performance.now()-start;start=performance.now();for(let i=0;i<60;i++)ShioriGraph.step(model,i);const layoutMs=performance.now()-start;
 start=performance.now();view.setModel(ShioriGraph.build(notes));await new Promise(resolve=>{function check(){if(view.getState().iteration===60)resolve();else requestAnimationFrame(check);}check();});const settleMs=performance.now()-start;
 const frames=[],draws=[];let last=performance.now();for(let i=0;i<120;i++){view.zoom(i%2?1/1.01:1.01);view.pan(i%2?-1:1,0);await new Promise(requestAnimationFrame);const now=performance.now();frames.push(now-last);last=now;}
 for(let i=0;i<60;i++){start=performance.now();view.draw();draws.push(performance.now()-start);}frames.sort((a,b)=>a-b);draws.sort((a,b)=>a-b);
 out.push({count,edges:model.edges.length,buildMs,layoutMs,settleMs,panZoomFrameP95:frames[114],drawP95:draws[57]});
 }return out;});console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
