const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parse,filter,formatTag,suggest,complete}=require('../ui/search.js');

test('Japanese tags are exact, multiple filters are AND, and only free text is searched',()=>{
 const notes=[
  {title:'Rust ownership',text:'学習',tags:['開発/IT','Rust']},
  {title:'Rust handbook',text:'学習',tags:['開発']},
  {title:'Other',text:'ownership',tags:['開発/IT']}
 ];
 const query=parse('ownership tag: 開発/IT tag:Rust');
 assert.equal(query.text,'ownership');assert.deepEqual(query.tags,['開発/IT','Rust']);
 assert.deepEqual(filter(notes,query),[notes[0]]);
 assert.deepEqual(filter(notes,parse('tag: 開発')),[notes[1]]);
 assert.deepEqual(parse('学習 tag:Rust tag:Rust').tags,['Rust']);
});

test('quoted tags round-trip spaces, quotes, backslashes and punctuation',()=>{
 for(const tag of ['開発/IT','machine learning','quote "tag"','path\\tag','<&>','tag:','line\nbreak']){
  assert.deepEqual(parse(formatTag(tag)).tags,[tag]);
 }
 const q=parse('first tag: "machine learning" second');
 assert.equal(q.text,'first second');assert.deepEqual(q.tags,['machine learning']);
});

test('empty or unclosed tag clauses do not become a text filter; unknown complete tags match nothing',()=>{
 for(const text of ['tag:','tag:  ','tag: "未完了']){assert.deepEqual(parse(text).tags,[]);assert.equal(parse(text).text,'');}
 assert.deepEqual(parse('tag: tag: Rust').tags,['Rust']);
 assert.deepEqual(filter([{title:'A',text:'',tags:[]}],parse('tag: 不明')),[]);
 assert.equal(parse('notag:example').text,'notag:example');
});

test('suggestions are bounded, deduplicated, and completion preserves other clauses',()=>{
 const text='学習 tag: "machine l" tag: Rust';
 const suggestions=suggest(text,text.indexOf('machine l')+9,['machine learning','machine learning','Rust']);
 assert.deepEqual(suggestions.options,['machine learning']);
 const next=complete(text,suggestions.token,suggestions.options[0]);
 assert.equal(next.value,'学習 tag: "machine learning" tag: Rust');
 assert.deepEqual(parse(next.value).tags,['machine learning','Rust']);
 assert.equal(suggest('normal text',11,['Rust']),null);
 assert.equal(suggest('tag: ',5,Array.from({length:100},(_,i)=>'タグ'+i)).options.length,8);
 assert.equal(suggest('tag: 不明',7,['Rust']).options.length,0);
});
