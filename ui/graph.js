/* Deterministic note-link graph and bounded local-force layout. */
(function(root){
 const Links=typeof module!=='undefined'?require('./note-links.js'):root.ShioriNoteLinks;
 function build(notes,allNotes=notes){
  const paths=Links.index(allNotes),byPath=new Map(),nodes=notes.map((note,i)=>{byPath.set(note.path,i);const angle=i*2.3999632297,r=25*Math.sqrt(i);return {id:'note:'+note.path,kind:'note',path:note.path,label:note.title,x:Math.cos(angle)*r,y:Math.sin(angle)*r};});
  const edges=[],seen=new Set();let unresolved=0;
  for(let i=0;i<notes.length;i++)for(const href of new Set(notes[i].links||[])){
   const result=Links.resolve(notes[i].path,href,paths);if(result.kind==='unresolved'){unresolved++;continue;}
   if(result.kind!=='note')continue;const j=byPath.get(result.path);if(j===undefined||i===j)continue;
   const a=Math.min(i,j),b=Math.max(i,j),key=a+':'+b;if(seen.has(key))continue;seen.add(key);edges.push({source:a,target:b});
  }
  return {nodes,edges,unresolved,total:nodes.length};
 }
 function step(model,iteration=0){
  const {nodes,edges}=model,cell=55,grid=new Map(),dx=new Float64Array(nodes.length),dy=new Float64Array(nodes.length);
  nodes.forEach((n,i)=>{const key=Math.floor(n.x/cell)+','+Math.floor(n.y/cell);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);});
  nodes.forEach((n,i)=>{const x=Math.floor(n.x/cell),y=Math.floor(n.y/cell);let checked=0;
   for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const j of grid.get((x+a)+','+(y+b))||[]){if(j===i)continue;if(++checked>80)break;const other=nodes[j],vx=n.x-other.x,vy=n.y-other.y,d=Math.max(1,Math.hypot(vx,vy)),force=Math.max(0,45-d)*.12;dx[i]+=vx/d*force;dy[i]+=vy/d*force;}
  });
  for(const edge of edges){const a=nodes[edge.source],b=nodes[edge.target],vx=b.x-a.x,vy=b.y-a.y,d=Math.max(1,Math.hypot(vx,vy)),force=(d-65)*.025;dx[edge.source]+=vx/d*force;dy[edge.source]+=vy/d*force;dx[edge.target]-=vx/d*force;dy[edge.target]-=vy/d*force;}
  const cooling=1-iteration/100;nodes.forEach((n,i)=>{n.x+=Math.max(-8,Math.min(8,dx[i]))*cooling;n.y+=Math.max(-8,Math.min(8,dy[i]))*cooling;});
 }
 root.ShioriGraph={build,step};if(typeof module!=='undefined')module.exports=root.ShioriGraph;
})(globalThis);
