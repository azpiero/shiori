(function(root){
 function create({document,setTimer=root.setTimeout,clearTimer=root.clearTimeout}){
  const region=document.createElement('div');region.className='toasts';region.setAttribute('aria-label','通知');region.setAttribute('role','region');document.body.append(region);
  const entries=[];
  function pause(entry){if(entry.timer!==undefined){clearTimer(entry.timer);entry.timer=undefined;}}
  function start(entry){pause(entry);if(entry.closed||entry.kind!=='info'||entry.hover||entry.focus)return;entry.timer=setTimer(()=>close(entry),5000);entry.timer?.unref?.();}
  function close(entry){if(entry.closed)return;entry.closed=true;const focused=document.activeElement===entry.button;pause(entry);entry.element?.remove();const index=entries.indexOf(entry);if(index>=0)entries.splice(index,1);showPending();if(focused)(entries.find(e=>e.element)?.button||entry.origin)?.focus();}
  function showPending(){let visible=entries.filter(e=>e.element).length;for(const entry of entries){if(visible>=3)break;if(entry.element)continue;
   const element=document.createElement('div');element.className='toast '+entry.kind;const message=document.createElement('div');message.setAttribute('role',entry.kind==='info'?'status':'alert');message.setAttribute('aria-atomic','true');const button=document.createElement('button');button.textContent='×';button.setAttribute('aria-label','通知を閉じる');button.onclick=()=>close(entry);element.append(message);element.append(button);entry.element=element;entry.button=button;
   element.addEventListener('mouseenter',()=>{entry.hover=true;pause(entry);});element.addEventListener('mouseleave',()=>{entry.hover=false;start(entry);});element.addEventListener('focusin',()=>{entry.focus=true;pause(entry);});element.addEventListener('focusout',()=>{entry.focus=false;start(entry);});
   region.append(element);message.textContent=entry.text;visible++;start(entry);
  }}
  function notify(text,kind='error'){text=String(text);if(!text||entries.some(e=>e.text===text&&e.kind===kind))return;entries.push({text,kind,origin:document.activeElement});showPending();}
  return {error:text=>notify(text,'error'),warning:text=>notify(text,'warning'),info:text=>notify(text,'info')};
 }
 root.ShioriToasts={create};if(typeof module!=='undefined')module.exports=root.ShioriToasts;
})(globalThis);
