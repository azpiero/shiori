(function(root){
 function uuid(){const b=root.crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(n=>n.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
 function create({document,invoke,listen,getContext,onBusy,onComplete,Terminal=root.Terminal,FitAddon=root.FitAddon.FitAddon,ResizeObserver=root.ResizeObserver}){
  const $=s=>document.querySelector(s);let term=null,fit=null,session=null,ready=false,starting=false,closing=false,inputQueue=Promise.resolve(),queuedBytes=0;
  $('#terminalPanel').innerHTML='<div class="terminal-heading"><strong>Terminal</strong><span id="terminalState" role="status">起動できます</span><button id="terminalStart">シェルを起動</button><button id="terminalStop" disabled>シェルを終了</button><button id="terminalHide" aria-label="ターミナルを隠す">×</button></div><div id="terminalContext" class="terminal-context"></div><div id="terminalScreen"></div>';
  function state(text){$('#terminalState').textContent=text;}
  function render(){const context=session||getContext();$('#terminalContext').textContent=context?.root?`HTML保存先: ${context.root}${session?.cwd?` · 作業場所: ${session.cwd}`:''}`:'Vaultを開いてください';$('#terminalContext').title=$('#terminalContext').textContent;$('#terminalStart').disabled=!ready||!!session||!getContext();$('#terminalStop').disabled=!session||closing;}
  function resize(){if(!term||$('#terminalPanel').hidden)return;fit.fit();if(session&&!starting)invoke('terminal_resize',{sessionId:session.id,rows:Math.max(2,Math.min(200,term.rows)),cols:Math.max(2,Math.min(400,term.cols))}).catch(e=>state(String(e)));}
  function input(data){
   const active=session;if(!active||starting||closing)return;
   if(queuedBytes+data.length>65536){state('入力待ちが多いため貼り付けを停止しました');return;}
   queuedBytes+=data.length;
   inputQueue=inputQueue.then(async()=>{try{for(let i=0;i<data.length;i+=4096){if(session!==active||closing)break;await invoke('terminal_write',{sessionId:active.id,data:Array.from(data.slice(i,i+4096))});}}catch(e){state(String(e));}finally{queuedBytes-=data.length;}});
  }
  function mount(){if(term)return;term=new Terminal({scrollback:2000,fontSize:12,convertEol:false,allowProposedApi:false,theme:{background:'#171c19',foreground:'#e6ece7'},linkHandler:{activate(){}}});fit=new FitAddon();term.loadAddon(fit);term.open($('#terminalScreen'));term.onData(text=>input(new TextEncoder().encode(text)));term.onBinary(text=>input(Uint8Array.from(text,c=>c.charCodeAt(0)&255)));if(ResizeObserver)new ResizeObserver(resize).observe($('#terminalScreen'));}
  async function start(){
   if(!ready||session||!getContext())return;mount();term.reset();session={...getContext(),id:uuid()};const active=session;starting=true;closing=false;onBusy(true);state('シェルを起動しています…');render();fit.fit();
   try{const info=await invoke('terminal_start',{sessionId:active.id,vaultToken:active.token,rows:Math.max(2,Math.min(200,term.rows)),cols:Math.max(2,Math.min(400,term.cols))});starting=false;if(session===active){active.cwd=info.cwd;render();resize();if(closing)await stop();else{state('入力できます');term.focus();}}}
   catch(e){if(session===active){session=null;starting=false;closing=false;onBusy(false);state(String(e));render();}}
  }
  async function stop(){if(!session)return;closing=true;state(starting?'起動後に終了します…':'終了しています…');render();if(starting)return;try{await invoke('terminal_stop',{sessionId:session.id});}catch(e){closing=false;state(String(e));render();}}
  async function show(){const visible=$('#terminalPanel').hidden;$('#terminalPanel').hidden=!visible;$('#showTerminal').setAttribute('aria-pressed',String(visible));if(visible){mount();resize();if(!session)await start();else term.focus();}}
  $('#showTerminal').onclick=show;$('#terminalStart').onclick=start;$('#terminalStop').onclick=stop;
  $('#terminalHide').onclick=()=>{if(!$('#terminalPanel').hidden)show();$('#showTerminal').focus();};
  const initialized=Promise.resolve(listen('terminal-output',({payload})=>{
   const active=session;if(!active||payload.session_id!==active.id)return;
   if(payload.exit){session=null;starting=false;closing=false;onBusy(false);state(payload.message);onComplete(active.token);render();return;}
   term.write(new Uint8Array(payload.data),()=>{invoke('terminal_ack',{sessionId:active.id,seq:payload.seq}).catch(e=>state(String(e)));});
  })).then(()=>{ready=true;render();}).catch(e=>state(String(e)));
  render();return {initialized,contextChanged:render,isBusy:()=>!!session,reset(){if(!session){term?.reset();render();}}};
 }
 root.ShioriTerminal={create};if(typeof module!=='undefined')module.exports=root.ShioriTerminal;
})(globalThis);
