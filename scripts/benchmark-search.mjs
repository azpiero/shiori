// Measure the current production filter/sort and list string generation.
// Node timings exclude WebKit DOM, layout, painting, IPC, and the 120ms input debounce.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const {filter:filterNotes}=createRequire(import.meta.url)('../ui/search.js');
import {performance} from 'node:perf_hooks';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const self=fileURLToPath(import.meta.url);
const resultDir=path.resolve(process.argv[2]);
const count=Number(process.argv[3]);
if (!count) {
  const results=[];
  for(const n of [100,1000,10000]) {
    const child=spawnSync(process.execPath,[self,resultDir,String(n)],{encoding:'utf8',maxBuffer:10*1024*1024});
    if(child.status!==0)throw new Error(child.stderr||child.stdout);
    results.push(JSON.parse(child.stdout));
  }
  fs.writeFileSync(path.join(resultDir,'javascript.json'),JSON.stringify({engine:process.version,architecture:process.arch,results},null,2));
  console.log(JSON.stringify(results,null,2));
} else {
  const source=fs.readFileSync(path.join(path.dirname(self),'../ui/app.js'),'utf8');
  const listLine=source.split('\n').find(l=>l.trim().startsWith("$('#notes').innerHTML=matches.map"));
  if(!listLine)throw new Error('Production code changed: benchmark extraction must be reviewed');
  const filter=(vault,tag,q)=>filterNotes(vault.notes,{text:q,tags:tag?[tag]:[]});
  const expression=listLine.trim().replace("$('#notes').innerHTML=",'').replace(/;$/,'');
  const render=vm.runInNewContext(`(function(matches,selected,escape){return ${expression};})`);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const raw=fs.readFileSync(path.join(resultDir,`snapshot-${count}.json`),'utf8');
  const parseStart=performance.now();const vault=JSON.parse(raw);const parseMs=performance.now()-parseStart;
  const searches=[];
  const stats=values=>{const a=[...values].sort((a,b)=>a-b);return {median_ms:a[Math.floor(a.length/2)],p95_ms:a[Math.ceil(a.length*.95)-1],min_ms:a[0],max_ms:a.at(-1)};};
  for(const [query,tag] of [['',''],['知識',''],['検索',''],['計',''],['SHIORI-00042',''],['存在しないキーワードZZZ',''],['','分野/検索']]){
    const q=query.toLocaleLowerCase();let matches;
    for(let i=0;i<3;i++)filter(vault,tag,q);
    const searchTimes=[],listTimes=[];let bytes=0;
    for(let i=0;i<15;i++){
      let start=performance.now();matches=filter(vault,tag,q);searchTimes.push(performance.now()-start);
      start=performance.now();const markup=render(matches,'',escape);listTimes.push(performance.now()-start);bytes=Buffer.byteLength(markup);
    }
    searches.push({query,tag,matches:matches.length,search:stats(searchTimes),list_markup:stats(listTimes),list_html_bytes:bytes});
  }
  console.log(JSON.stringify({count,json_parse_ms:parseMs,searches,node_memory_bytes:process.memoryUsage(),node_peak_rss_kib:process.resourceUsage().maxRSS}));
}
