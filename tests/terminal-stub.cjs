class Terminal {
 constructor(){this.rows=24;this.cols=80;this.output=[];}
 loadAddon(addon){addon.activate?.(this);}
 open(){} focus(){} reset(){this.output=[];}
 onData(fn){this.data=fn;} onBinary(fn){this.binary=fn;}
 write(bytes,callback){this.output.push(bytes);callback?.();}
}
class FitAddon{fit(){}}
module.exports={Terminal,FitAddon};
