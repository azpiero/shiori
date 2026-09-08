(function(root){
 const LIMIT=64*1024;
 class Log {
  constructor(){this.text='';this.pending='';this.truncated=false;this.streamed=false;}
  append(text){this.text+=text;if(this.text.length>LIMIT){this.text=this.text.slice(-LIMIT);this.truncated=true;}}
  feed(kind,text){
   if(kind!=='stdout'){this.append(text+'\n');return;}
   this.pending+=text;
   let index;
   while((index=this.pending.indexOf('\n'))>=0){const line=this.pending.slice(0,index);this.pending=this.pending.slice(index+1);this.line(line);}
   if(this.pending.length>LIMIT){this.pending='';this.append('\n[長すぎる出力行を省略]\n');this.truncated=true;}
  }
  line(line){
   if(!line.trim())return;
   try {
    const data=JSON.parse(line);
    const delta=data.event?.delta;
    if(data.type==='stream_event'&&delta?.type==='text_delta'){this.streamed=true;this.append(delta.text||'');}
    else if(data.type==='assistant'){
     for(const part of data.message?.content||[])if(part.type==='tool_use')this.append(`\n[${part.name}]\n`);else if(part.type==='text'&&!this.streamed)this.append(part.text+'\n');
    }else if(data.type==='result'){
     if(data.is_error)this.append('\n[Claude error]\n'+(data.errors||[data.result||'失敗']).join('\n')+'\n');
     else if(!this.streamed)this.append((data.result||'')+'\n');
     if(data.permission_denials?.length)this.append('\n権限により実行できなかった操作があります。外部ターミナルで確認してください。\n');
    }
   }catch{this.append(line+'\n');}
  }
  finish(){if(this.pending)this.line(this.pending);this.pending='';}
 }
 function create({document,invoke,listen,getContext,onBusy,onComplete}){
  const $=s=>document.querySelector(s);let busy=false,starting=false,stopRequested=false,ready=false,run=null,log=new Log(),configuration=false;
  $('#claudePanel').innerHTML=`<div class="claude-heading"><strong>Claude</strong><span id="claudeState" role="status">準備中</span><button id="claudeHide" aria-label="Claudeパネルを閉じる">×</button></div>
   <p class="claude-help">表示中ノートをClaudeに編集させます。Vaultの内容が設定済みAIサービスに送信されます。作業フォルダはVaultですが、OSによるアクセス制限ではありません。</p>
   <div id="claudeTarget" class="claude-target"></div>
   <details><summary>Claudeの実行ファイル</summary><label>絶対パス <input id="claudeExecutable" placeholder="/Users/name/.local/bin/claude"></label><button id="claudeSave">保存</button><span> 空欄を保存すると自動検出</span></details>
   <label for="claudeRequest">このノートへの依頼</label><textarea id="claudeRequest" rows="2" placeholder="具体例を追記してください"></textarea>
   <div class="claude-actions"><button id="claudeRun">実行</button><button id="claudeStop" disabled>中断</button><button id="claudeClear">ログを消去</button><span>完了後は「更新を反映」で読み直します</span></div>
   <div id="claudeLogHint" class="claude-help">ログはアプリのメモリ内のみ（末尾64K文字まで）</div><pre id="claudeLog" tabindex="0" aria-label="Claudeの実行ログ"></pre>`;
  function state(text){$('#claudeState').textContent=text;}
  function render(){
   const context=run&&busy?run:getContext();$('#claudeTarget').textContent=context?.path?`対象: ${context.path}`:'ノートを開いてください';
   $('#claudeRun').disabled=busy||!ready||!configuration||!getContext()?.path;
   $('#claudeStop').disabled=!busy;for(const id of ['claudeRequest','claudeExecutable','claudeSave'])$('#'+id).disabled=busy;
   $('#claudeLog').textContent=log.text;
   $('#claudeLogHint').textContent=log.truncated?'ログは末尾64K文字のみ表示（古い出力は省略）':'ログはアプリのメモリ内のみ（末尾64K文字まで）';
  }
  function show(visible){$('#claudePanel').hidden=!visible;$('#showClaude').setAttribute('aria-pressed',String(visible));if(visible)$('#claudeRequest').focus();}
  $('#showClaude').onclick=()=>show($('#claudePanel').hidden);$('#claudeHide').onclick=()=>{show(false);$('#showClaude').focus();};
  async function config(){try{const value=await invoke('claude_config');$('#claudeExecutable').value=value.executable;configuration=!value.error;state(value.error||'実行できます');}catch(e){state(String(e));configuration=false;}render();}
  $('#claudeExecutable').oninput=()=>{configuration=false;state('実行ファイルの変更を保存してください');render();};
  $('#claudeSave').onclick=async()=>{if(busy)return;try{await invoke('claude_configure',{path:$('#claudeExecutable').value});await config();}catch(e){state(String(e));}};
  $('#claudeRun').onclick=async()=>{
   if(busy||!ready||!configuration)return;const context=getContext(),request=$('#claudeRequest').value.trim();
   if(!context?.path||!request){state('ノートを開き、依頼を入力してください');return;}
   const bytes=root.crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
   const hex=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
   run={...context,id:`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`};const active=run;busy=true;starting=true;stopRequested=false;log=new Log();onBusy(true);state('起動しています…');render();
   try{await invoke('claude_start',{runId:active.id,vaultToken:active.token,path:active.path,request});starting=false;if(busy&&run===active){if(stopRequested)await $('#claudeStop').onclick();else state('実行中');}}
   catch(e){if(run===active){starting=false;busy=false;onBusy(false);state(String(e));render();}}
  };
  $('#claudeStop').onclick=async()=>{if(!busy)return;stopRequested=true;if(starting){state('起動後に中断します…');return;}try{await invoke('claude_stop',{runId:run.id});if(busy)state('中断しています…');}catch(e){state(String(e));}};
  $('#claudeClear').onclick=()=>{log=new Log();render();};
  const initialized=Promise.resolve(listen('claude-output',({payload})=>{
   if(!busy||!run||payload.run_id!==run.id||payload.vault_token!==run.token)return;
   if(payload.kind==='exit'){log.finish();busy=false;onBusy(false);state(payload.text);onComplete(run.token);}
   else log.feed(payload.kind,payload.text);
   render();
  })).then(async()=>{ready=true;await config();}).catch(e=>{state(String(e));render();});
  render();
  return {initialized,contextChanged:render,reset(){if(!busy){run=null;log=new Log();$('#claudeRequest').value='';render();}},isBusy:()=>busy};
 }
 root.ShioriClaude={create,Log,LIMIT};if(typeof module!=='undefined')module.exports=root.ShioriClaude;
})(globalThis);
