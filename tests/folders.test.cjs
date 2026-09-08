const {test}=require('node:test');const assert=require('node:assert/strict');const F=require('../ui/folders.js');
test('folder groups include empty destinations and root, but omit excluded or invalid paths',()=>{
 const vault={folders:['','notes','notes/日本語','notes/empty','.git','node_modules/a','assets/pics','styles','notes/.shiori','../outside','bad\\path'],notes:[{path:'notes/a.html'},{path:'notes/日本語/b.html'}]};
 const paths=F.folders(vault);assert.deepEqual(paths,['notes','notes/empty','notes/日本語']);
 const all=F.groups(vault.notes,paths);assert.equal(all.find(g=>g.path==='notes/empty').notes.length,0);
 assert.deepEqual(F.groups([vault.notes[1]],paths,true).map(g=>g.path),['notes/日本語']);
});
test('drops require an internal same-vault drag and an existing different allowed folder',()=>{
 const drag={token:'t',path:'notes/a.html'},paths=['','notes','notes/empty'];
 assert.equal(F.canDrop(drag,'t','notes/empty',paths),true);assert.equal(F.canDrop(drag,'t','',paths),false);
 for(const [d,token,path] of [[null,'t','notes/empty'],[drag,'other','notes/empty'],[drag,'t','notes'],[drag,'t','missing'],[drag,'t','../outside'],[drag,'t','assets']])assert.equal(F.canDrop(d,token,path,paths),false);
});

test('tree preserves ancestors for filtered descendants and a creation root for empty vaults',()=>{
 const note={path:'notes/test/deep/a.html'};
 const tree=F.tree([note],F.folders({notes:[note],folders:['notes/empty']}),true);
 assert.equal(tree[0].path,'notes');assert.equal(tree[0].children.length,1);
 assert.equal(tree[0].children[0].path,'notes/test');assert.deepEqual(tree[0].children[0].children[0].notes,[note]);
 assert.deepEqual(F.folders({}),['notes']);
});
