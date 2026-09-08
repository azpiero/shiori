/* Canvas rendering keeps the DOM constant as the vault grows. Layout is advanced
   one bounded iteration per frame and cancelled when replaced or hidden. */
(function(root){
 function create({canvas,label,onOpen,requestFrame=root.requestAnimationFrame?.bind(root),cancelFrame=root.cancelAnimationFrame?.bind(root)}){
  const ctx=canvas.getContext?.('2d');let model={nodes:[],edges:[]},selected='',hover=-1,focus=-1,scale=1,x=0,y=0,fit=1,cx=0,cy=0,iteration=60,frame=null,visible=true,drag=null,suppress=false;
  function bounds(){let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(const n of model.nodes){left=Math.min(left,n.x);right=Math.max(right,n.x);top=Math.min(top,n.y);bottom=Math.max(bottom,n.y);}cx=(left+right)/2||0;cy=(top+bottom)/2||0;fit=Math.min((canvas.clientWidth||1000)/Math.max(200,right-left+80),(canvas.clientHeight||600)/Math.max(200,bottom-top+80));}
  function point(n){return {x:(n.x-cx)*fit*scale+(canvas.clientWidth||1000)/2+x,y:(n.y-cy)*fit*scale+(canvas.clientHeight||600)/2+y};}
  function draw(){
   if(!ctx||!visible)return;const width=canvas.clientWidth||1000,height=canvas.clientHeight||600,dpr=Math.min(root.devicePixelRatio||1,2);
   if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);bounds();}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
   const style=root.getComputedStyle(canvas),accent=style.getPropertyValue('--accent').trim(),ink=style.getPropertyValue('--ink').trim(),bg=style.getPropertyValue('--bg').trim();
   ctx.strokeStyle=accent;ctx.globalAlpha=.25;ctx.lineWidth=1;ctx.beginPath();for(const e of model.edges){const a=point(model.nodes[e.source]),b=point(model.nodes[e.target]);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.stroke();ctx.globalAlpha=1;
   ctx.fillStyle=accent;ctx.beginPath();for(const n of model.nodes){const p=point(n);if(p.x<0||p.y<0||p.x>width||p.y>height)continue;ctx.moveTo(p.x+3,p.y);ctx.arc(p.x,p.y,3,0,Math.PI*2);}ctx.fill();
   model.nodes.forEach((n,i)=>{if(i!==hover&&i!==focus&&n.path!==selected)return;const p=point(n);ctx.fillStyle=accent;ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();ctx.font='12px sans-serif';ctx.lineWidth=4;ctx.strokeStyle=bg;const title=n.label.length>60?n.label.slice(0,60)+'…':n.label,tx=Math.max(4,Math.min(width-ctx.measureText(title).width-4,p.x+10)),ty=Math.max(16,Math.min(height-4,p.y-10));ctx.strokeText(title,tx,ty);ctx.fillStyle=ink;ctx.fillText(title,tx,ty);});
  }
  function schedule(){if(!requestFrame||frame!==null||!visible)return;frame=requestFrame(()=>{frame=null;if(iteration<60){root.ShioriGraph.step(model,iteration++);bounds();}draw();if(iteration<60)schedule();});}
  function announce(index){const n=model.nodes[index];label.textContent=n?`${n.label} — ${n.path}`:'';canvas.title=n?.label||'';}
  function hit(e){const rect=canvas.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;let best=-1,distance=10;model.nodes.forEach((n,i)=>{const p=point(n),d=Math.hypot(p.x-px,p.y-py);if(d<distance){distance=d;best=i;}});return best;}
  canvas.onpointerdown=e=>{if(e.button!==0)return;canvas.focus();drag={px:e.clientX,py:e.clientY,x,y};suppress=false;canvas.setPointerCapture?.(e.pointerId);};
  canvas.onpointermove=e=>{if(drag){const dx=e.clientX-drag.px,dy=e.clientY-drag.py;if(Math.hypot(dx,dy)>4)suppress=true;x=drag.x+dx;y=drag.y+dy;}else{hover=hit(e);announce(hover);canvas.style.cursor=hover<0?'grab':'pointer';}schedule();};
  canvas.onpointerup=e=>{drag=null;if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
  canvas.onpointercancel=()=>{drag=null;suppress=true;};canvas.onpointerleave=()=>{hover=-1;announce(focus);schedule();};
  canvas.onclick=e=>{if(suppress){suppress=false;return;}const i=hit(e);if(i>=0)onOpen(model.nodes[i].path,e);};
  canvas.onkeydown=e=>{
   if(!model.nodes.length)return;
   if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();focus=e.key==='Home'?0:e.key==='End'?model.nodes.length-1:(focus+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)+model.nodes.length)%model.nodes.length;const n=model.nodes[focus];x=-(n.x-cx)*fit*scale;y=-(n.y-cy)*fit*scale;announce(focus);schedule();}
   if(['Enter',' '].includes(e.key)&&focus>=0){e.preventDefault();onOpen(model.nodes[focus].path,e);}
  };
  canvas.onfocus=()=>{if(focus<0&&model.nodes.length)focus=Math.max(0,model.nodes.findIndex(n=>n.path===selected));announce(focus);schedule();};
  canvas.onblur=()=>{focus=-1;announce(hover);schedule();};
  if(root.ResizeObserver)new root.ResizeObserver(()=>{bounds();schedule();}).observe(canvas);
  return {setModel(value){if(frame!==null)cancelFrame?.(frame);frame=null;model=value;iteration=0;hover=focus=-1;scale=1;x=y=0;bounds();announce(-1);schedule();},select(path){selected=path;schedule();},pan(dx,dy){x+=dx;y+=dy;schedule();},zoom(factor){scale=Math.max(.2,Math.min(20,scale*factor));schedule();},reset(){scale=1;x=y=0;bounds();schedule();},redraw:schedule,setVisible(value){visible=value;if(value)schedule();else if(frame!==null){cancelFrame?.(frame);frame=null;}},getState:()=>({scale,x,y,iteration,nodes:model.nodes.length,edges:model.edges.length}),draw};
 }
 root.ShioriGraphView={create};if(typeof module!=='undefined')module.exports=root.ShioriGraphView;
})(globalThis);
