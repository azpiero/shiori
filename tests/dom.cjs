// Minimal DOM adapter for event/state tests, not a rendering engine.
function createDocument(){
 const document={activeElement:null,defaultView:{addEventListener(){}}};
 const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.parentNode=null;this.attributes={};this.dataset={};this.events={};this.hidden=false;this.value='';this._text='';this.style={setProperty(){}};this.classes=new Set();this.classList={add:k=>this.classes.add(k),remove:k=>this.classes.delete(k),toggle:(k,on)=>{if(on===undefined)on=!this.classes.has(k);return on?this.classes.add(k):this.classes.delete(k);},contains:k=>this.classes.has(k)};}
  get id(){return this.attributes.id||'';}set id(v){this.attributes.id=v;}
  get className(){return [...this.classes].join(' ');}set className(v){this.classes=new Set(v.split(/\s+/));}
  setAttribute(k,v){this.attributes[k]=String(v);if(k==='class')this.className=v;if(k==='hidden')this.hidden=true;if(k==='disabled')this.disabled=true;if(k==='value')this.value=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
  getAttribute(k){return this.attributes[k]??null;}
  removeAttribute(k){delete this.attributes[k];}
  set textContent(v){this._text=String(v);}get textContent(){return this._text;}
  get innerHTML(){return this.html||'';}
  set innerHTML(html){
   this.html=html;for(const child of this.children)child.parentNode=null;this.children=[];
   const stack=[this];
   for(const m of html.matchAll(/<(\/?)([\w-]+)([^>]*)>|([^<]+)/g)){
    if(m[4]){stack.at(-1)._text+=decode(m[4]);continue;}
    if(m[1]){if(stack.length>1)stack.pop();continue;}
    const el=new Element(m[2]);for(const a of m[3].matchAll(/([:\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))el.setAttribute(a[1],decode(a[2]??a[3]??a[4]??''));
    stack.at(-1).append(el);if(!['input','img','br','hr','meta','link','path','circle','line'].includes(m[2])&&!m[3].endsWith('/'))stack.push(el);
   }
  }
  append(child){if(child.parentNode)child.remove();this.children.push(child);child.parentNode=this;}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;}
  matches(selector){
   const tag=selector.match(/^[\w-]+/);if(tag&&tag[0]!==this.tagName)return false;
   const id=selector.match(/#([\w-]+)/);if(id&&id[1]!==this.id)return false;
   for(const c of selector.matchAll(/\.([\w-]+)/g))if(!this.classes.has(c[1]))return false;
   for(const a of selector.matchAll(/\[([\w-]+)(?:="?([^"\]]+)"?)?\]/g)){
    const value=a[1].startsWith('data-')?this.dataset[a[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:this.attributes[a[1]];
    if(value===undefined||(a[2]!==undefined&&value!==a[2]))return false;
   }
   return true;
  }
  querySelectorAll(selector){
   const results=[];const selectors=selector.split(',').map(s=>s.trim());
   const visit=el=>{for(const child of el.children){if(selectors.some(s=>{const parts=s.split(/\s+/);if(!child.matches(parts.pop()))return false;let parent=child.parentNode;while(parts.length){const part=parts.pop();while(parent&&!parent.matches(part))parent=parent.parentNode;if(!parent)return false;parent=parent.parentNode;}return true;}))results.push(child);visit(child);}};visit(this);return results;
  }
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  closest(s){let el=this;while(el){if(s.split(',').some(x=>el.matches(x.trim())))return el;el=el.parentNode;}return null;}
  addEventListener(name,fn){this.events[name]=fn;}
  focus(){document.activeElement=this;}
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
  scrollIntoView(){}
  getBoundingClientRect(){return {left:0,right:52,top:0,bottom:0};}
 }
 document.body=new Element('body');document.documentElement=new Element('html');document.documentElement.append(document.body);
 document.addEventListener=(name,fn)=>document.body.addEventListener(name,fn);
 document.querySelector=s=>document.documentElement.querySelector(s);
 document.createElement=t=>new Element(t);
 const app=new Element();app.id='app';document.body.append(app);
 return document;
}
module.exports={createDocument};
