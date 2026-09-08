/* Resolve authored links against a synthetic vault URL, matching reader routing.
   The reader removes <base>; absolute external URLs and paths outside the token
   are not local note links. Prefer exact paths, then an unambiguous NFC match. */
(function(root){
 function index(notes){const exact=new Set(notes.map(n=>n.path)),normalized=new Map();for(const path of exact){const key=path.normalize('NFC');normalized.set(key,normalized.has(key)?null:path);}return {exact,normalized};}
 function resolve(path,href,paths){
  if(typeof href!=='string')return {kind:'ignored'};
  href=href.trim();if(!href||href.startsWith('#')||/^[a-z][a-z\d+.-]*:/i.test(href)||href.startsWith('//'))return {kind:'ignored'};
  try{
   const base='vault://localhost/__vault__/'+path.split('/').map(encodeURIComponent).join('/'),url=new URL(href,base);
   const decoded=decodeURIComponent(url.pathname);
   if(!/\.html$/i.test(decoded))return {kind:'ignored'};
   if(href.startsWith('/')||url.host!=='localhost'||!decoded.startsWith('/__vault__/')||/[\\\0]/.test(decoded))return {kind:'unresolved'};
   const target=decoded.slice('/__vault__/'.length);
   if(target.split('/').some(p=>p==='.'||p==='..'))return {kind:'unresolved'};
   if(/^(assets|styles)\//.test(target))return {kind:'ignored'};
   const found=paths.exact.has(target)?target:paths.normalized.get(target.normalize('NFC'));
   return found?{kind:'note',path:found}:{kind:'unresolved'};
  }catch{return {kind:/\.html(?:[?#]|$)/i.test(href)?'unresolved':'ignored'};}
 }
 root.ShioriNoteLinks={index,resolve};if(typeof module!=='undefined')module.exports=root.ShioriNoteLinks;
})(globalThis);
