const {test}=require('node:test'),assert=require('node:assert/strict');const {createDocument}=require('./dom.cjs'),{create}=require('../ui/toasts.js');
function setup(){const document=createDocument(),timers=new Map();let id=0;const toasts=create({document,setTimer:(fn,ms)=>{assert.equal(ms,5000);timers.set(++id,fn);return id;},clearTimer:id=>timers.delete(id)});return {document,toasts,timers,items:()=>document.body.querySelectorAll('.toast'),expire(){for(const [id,fn] of [...timers]){timers.delete(id);fn();}}};}
test('errors and warnings persist while information expires; roles and escaping are correct',()=>{
 const s=setup();s.toasts.error('<script>error</script>');s.toasts.warning('warning');s.toasts.info('information');assert.equal(s.items().length,3);assert.equal(s.items()[0].querySelector('[role=alert]').textContent,'<script>error</script>');assert.equal(s.items()[0].querySelector('script'),null);assert.ok(s.items()[2].querySelector('[role=status]'));s.expire();assert.equal(s.items().length,2);assert.equal(s.timers.size,0);
});
test('duplicates are suppressed and pending notifications retain persistent errors',()=>{
 const s=setup();for(const message of ['a','b','c','d','a'])s.toasts.error(message);assert.equal(s.items().length,3);s.items()[0].querySelector('button').onclick();assert.equal(s.items().length,3);assert.equal(s.items()[2].querySelector('[role=alert]').textContent,'d');assert.equal(s.timers.size,0);
});
test('information timers pause during hover/focus and explicit close restores focus',()=>{
 const s=setup();const origin=s.document.createElement('button');s.document.body.append(origin);origin.focus();s.toasts.info('info');const item=s.items()[0];item.events.mouseenter();assert.equal(s.timers.size,0);item.events.focusin();item.events.mouseleave();assert.equal(s.timers.size,0);item.events.focusout();assert.equal(s.timers.size,1);const button=item.querySelector('button');button.focus();button.onclick();assert.equal(s.items().length,0);assert.equal(s.document.activeElement,origin);
});
