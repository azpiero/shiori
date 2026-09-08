/* A single-vault reader session. Frames are owned by reader.js, not this model. */
(function(root){
 class Workspace{
  constructor(id=()=>Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join('-')){this.id=id;this.reset();}
  reset(){this.panes=[{tabs:[],active:null},null];this.activePane=0;}
  get pane(){return this.panes[this.activePane];}
  get tab(){return this.pane?.tabs.find(t=>t.id===this.pane.active)||null;}
  all(){return this.panes.flatMap(p=>p?.tabs||[]);}
  find(id){return this.all().find(t=>t.id===id);}
  open(path,query='',mode='current',anchor=''){
   const index=mode==='side'?1-this.activePane:this.activePane;
   const pane=this.panes[index];
   let tab=mode==='current'?pane?.tabs.find(t=>t.id===pane.active):null;
   if(!tab&&this.all().length>=12)throw new Error('開けるタブは合計12件までです。不要なタブを閉じてください。');
   if(!this.panes[index])this.panes[index]={tabs:[],active:null};
   if(!tab){tab={id:this.id()};this.panes[index].tabs.push(tab);}
   Object.assign(tab,{path,query,anchor,url:'',hits:0,hit:0,request:this.id(),loading:!!path});
   this.panes[index].active=tab.id;this.activePane=index;return tab;
  }
  select(index,id){if(!this.panes[index]?.tabs.some(t=>t.id===id))return;this.activePane=index;this.panes[index].active=id;}
  activate(index){if(this.panes[index])this.activePane=index;}
  close(index,id){
   const pane=this.panes[index];if(!pane)return;
   const position=pane.tabs.findIndex(t=>t.id===id);if(position<0)return;
   pane.tabs.splice(position,1);
   if(pane.active===id)pane.active=pane.tabs[Math.min(position,pane.tabs.length-1)]?.id||null;
  }
  closePane(index){if(!this.panes[1-index])return;this.panes[index]=null;this.activePane=1-index;}
  reconcile(notes){const paths=new Set(notes.map(n=>n.path));for(let i=0;i<2;i++)for(const t of [...(this.panes[i]?.tabs||[])])if(t.path&&!paths.has(t.path))this.close(i,t.id);}
  served(payload,token){
   const url=new URL(payload.url),tab=this.find(url.searchParams.get('view'));
   if(url.protocol!=='vault:'||url.hostname!=='localhost'||url.pathname.split('/')[1]!==token||!tab||url.searchParams.get('request')!==tab.request)return null;
   const same=tab.path===payload.path;
   Object.assign(tab,{path:payload.path,url:payload.url,query:url.searchParams.get('q')||'',hits:payload.hits,hit:same?Math.min(tab.hit,Math.max(0,payload.hits-1)):0,loading:false});
   return tab;
  }
 }
 root.ShioriWorkspace={Workspace};
 if(typeof module!=='undefined')module.exports=root.ShioriWorkspace;
})(globalThis);
