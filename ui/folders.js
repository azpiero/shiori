(function(root){
 const blocked=new Set(['.git','.ds_store','node_modules','.shiori','.html-vault']);
 const parent=path=>path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';
 function allowed(path){return typeof path==='string'&&!/[\\\u0000]/.test(path)&&((path==='notes'||path.startsWith('notes/'))&&path.split('/').every(p=>p&&p!=='.'&&p!=='..'&&!blocked.has(p.toLowerCase())))&&!['assets','styles'].includes(path.split('/')[0].toLowerCase());}
 function folders(vault){
  const result=new Set();
  for(const path of [...(vault?.folders||[]),...(vault?.notes||[]).map(n=>parent(n.path))]){
   if(!allowed(path))continue;
   result.add(path);let p=parent(path);while(p&&allowed(p)){result.add(p);p=parent(p);}
  }
  return [...result].sort((a,b)=>a.localeCompare(b));
 }
 function groups(notes,paths,filtered=false){
  const groups=new Map(paths.filter(allowed).map(path=>[path,[]]));
  for(const note of notes){const path=parent(note.path);if(groups.has(path))groups.get(path).push(note);}
  return [...groups].filter(([,notes])=>!filtered||notes.length).map(([path,notes])=>({path,notes}));
 }
 function canDrop(drag,token,path,paths){return !!drag&&drag.token===token&&allowed(path)&&paths.includes(path)&&parent(drag.path)!==path;}
 root.ShioriFolders={parent,allowed,folders,groups,canDrop};if(typeof module!=='undefined')module.exports=root.ShioriFolders;
})(globalThis);
