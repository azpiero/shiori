/* Shared search syntax for the UI, benchmarks, and tests. No DOM dependencies. */
(function(root){
 function parse(input){
  const tokens=[],text=[];let cursor=0,i=0;
  while(i<input.length){
   if((i===0||/\s/.test(input[i-1]))&&input.slice(i,i+4)==='tag:'){
    const start=i;let valueStart=i+4;
    while(/\s/.test(input[valueStart]||'')&&valueStart<input.length)valueStart++;
    let end=valueStart,value='',complete=false;
    if(input[valueStart]==='"'){
     end++;let escaped=false,closed=false;
     while(end<input.length){const c=input[end++];if(!escaped&&c==='"'){closed=true;break;}if(!escaped&&c==='\\')escaped=true;else escaped=false;}
     if(closed){try{value=JSON.parse(input.slice(valueStart,end));complete=!!value;}catch{}}
     else value=input.slice(valueStart+1,end).replace(/\\(["\\])/g,'$1');
     if(end<input.length&&!/\s/.test(input[end])){complete=false;while(end<input.length&&!/\s/.test(input[end]))end++;}
    }else if(input.slice(valueStart,valueStart+4)!=='tag:'){
     while(end<input.length&&!/\s/.test(input[end]))end++;
     value=input.slice(valueStart,end);complete=!!value;
    }
    text.push(input.slice(cursor,start));tokens.push({start,end,valueStart,value,complete});cursor=end;i=Math.max(end,start+4);
   }else i++;
  }
  text.push(input.slice(cursor));
  return {text:text.join(' ').replace(/\s+/g,' ').trim(),tags:[...new Set(tokens.filter(t=>t.complete).map(t=>t.value))],tokens};
 }
 function formatTag(value){return 'tag: '+(/[\s"\\]/.test(value)||value.startsWith("tag:")?JSON.stringify(value):value);}
 function filter(notes,{text,tags}){
  const q=text.trim().toLocaleLowerCase();
  return notes.filter(n=>tags.every(t=>n.tags.includes(t))&&(!q||`${n.title}\n${n.text}`.toLocaleLowerCase().includes(q))).sort((a,b)=>Number(b.title.toLocaleLowerCase().includes(q))-Number(a.title.toLocaleLowerCase().includes(q)));
 }
 function suggest(input,caret,tags){
  const token=parse(input).tokens.find(t=>caret>=t.valueStart&&caret<=t.end);
  if(!token)return null;
  const options=[...new Set(tags)].sort().filter(t=>t.toLocaleLowerCase().includes(token.value.toLocaleLowerCase())).slice(0,8);
  return {token,options};
 }
 function complete(input,token,value){
  const before=input.slice(0,token.start),after=input.slice(token.end);
  const replacement=formatTag(value);
  return {value:before+replacement+(after.startsWith(' ')?after:' '+after),caret:before.length+replacement.length+1};
 }
 root.ShioriSearch={parse,formatTag,filter,suggest,complete};
 if(typeof module!=='undefined')module.exports=root.ShioriSearch;
})(globalThis);
