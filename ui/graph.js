/* A bounded, deterministic bipartite graph: edges always mean tag membership. */
(function(root){
 function build(notes, page=0, limit=150){
  const pages=Math.max(1,Math.ceil(notes.length/limit));
  page=Math.max(0,Math.min(page,pages-1));
  const visible=notes.slice(page*limit,(page+1)*limit);
  const counts=new Map();
  for(const n of visible)for(const t of new Set(n.tags))counts.set(t,(counts.get(t)||0)+1);
  const tags=[...counts.keys()].sort();
  const hubs=tags.map((tag,i)=>({id:`tag:${tag}`,kind:'tag',label:tag,count:counts.get(tag),x:500+330*Math.cos(i*2*Math.PI/tags.length-Math.PI/2),y:370+240*Math.sin(i*2*Math.PI/tags.length-Math.PI/2)}));
  const byTag=new Map(hubs.map(h=>[h.label,h]));
  const groups=new Map();
  for(const n of visible){const key=[...new Set(n.tags)].sort().join('\0');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(n);}
  const nodes=[...hubs],edges=[];
  for(const group of groups.values())group.forEach((note,i)=>{
   const targets=[...new Set(note.tags)].map(t=>byTag.get(t));
   const cx=targets.length?targets.reduce((s,t)=>s+t.x,0)/targets.length:500;
   const cy=targets.length?targets.reduce((s,t)=>s+t.y,0)/targets.length:370;
   const a=i*2.3999632297, r=targets.length?48+Math.sqrt(i)*13:35+Math.sqrt(i)*14;
   const node={id:`note:${note.path}`,kind:'note',label:note.title,path:note.path,x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r};nodes.push(node);
   for(const target of targets)edges.push({source:node.id,target:target.id});
  });
  return {nodes,edges,page,pages,total:notes.length,shown:visible.length};
 }
 root.ShioriGraph={build};
 if(typeof module!=='undefined')module.exports=root.ShioriGraph;
})(globalThis);
