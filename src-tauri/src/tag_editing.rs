//! Source-preserving, explicitly confirmed metadata edits. No DOM serialization.
use crate::{escape, scan, Snapshot, State, Vault, MAX_FILE};
use html5gum::{DefaultEmitter, Token, Tokenizer};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{collections::HashSet, fs::{self, OpenOptions}, io::{Read, Write}, ops::Range, path::{Component, Path, PathBuf}};
use tauri::Manager;

#[derive(Serialize)]
pub struct Draft { tags: Vec<String>, expected_hash: String }
#[derive(Serialize)]
pub struct Saved { saved: bool, snapshot: Snapshot, warning: Option<String> }
struct Head { tags: Vec<(Range<usize>, String)>, end: usize }
pub(super) fn digest(bytes: &[u8]) -> String { format!("{:x}", Sha256::digest(bytes)) }
fn valid_tags(tags: Vec<String>) -> Result<Vec<String>, String> {
    if tags.len()>128 { return Err("タグは128個までです".into()); }
    let mut seen=HashSet::new();let mut out=Vec::new();
    for tag in tags {
        if tag.trim().is_empty() || tag.len()>256 || tag.chars().any(char::is_control) { return Err("タグは空白のみ不可、制御文字なし、UTF-8で256バイト以内です".into()); }
        if seen.insert(tag.clone()) { out.push(tag); }
    }
    Ok(out)
}
fn head(source: &str) -> Result<Head, String> {
    let invalid=|| "タグ編集には曖昧さのない明示的な<head>…</head>が必要です。HTMLの構造を確認してください".to_string();
    let mut emitter=DefaultEmitter::<usize>::new_with_span();emitter.naively_switch_states(true);
    let mut phase=0;let mut html=false;let mut doctype=false;let mut raw:Option<Vec<u8>>=None;let mut tags=Vec::new();let mut end=None;
    let offset=if source.starts_with('\u{feff}'){3}else{0};
    for token in Tokenizer::new_with_emitter(&source[offset..],emitter) {
        match token.map_err(|e|e.to_string())? {
            Token::Error(e)=>return Err(format!("HTMLの構文がタグ編集に未対応です: {:?}",e.value)),
            Token::Comment(_)=>{},
            Token::Doctype(_) if phase==0&&!doctype&&!html=>doctype=true,
            Token::StartTag(t)=>{
                let name:&[u8]=&t.name;
                if phase==0 && name==b"html"&&!html&&!t.self_closing {html=true;continue;}
                if name==b"head" {
                    if phase!=0||t.self_closing {return Err(invalid());}phase=1;continue;
                }
                let is_tag=name==b"meta"&&t.attributes.get(b"name".as_slice()).is_some_and(|a|a.value.as_slice()==b"note-tag");
                if phase==0||raw.is_some() {return Err(invalid());}
                if phase==1 {
                    match name {
                        b"meta"|b"base"|b"link"=>{},
                        b"title"|b"style"|b"script" if !t.self_closing=>raw=Some(name.to_vec()),
                        _=>return Err(invalid()),
                    }
                    if is_tag {
                        let value=t.attributes.get(b"content".as_slice()).ok_or_else(invalid)?;
                        tags.push((t.span.start+offset..t.span.end+offset,String::from_utf8(value.value.to_vec()).map_err(|_|invalid())?));
                    }
                } else if is_tag {return Err("head外のnote-tagは編集に未対応です".into());}
            },
            Token::EndTag(t)=>{
                let name:&[u8]=&t.name;
                if raw.as_deref()==Some(name) {raw=None;continue;}
                if name==b"head" {
                    if phase!=1||raw.is_some() {return Err(invalid());}phase=2;end=Some(t.span.start+offset);
                } else if phase!=2 {return Err(invalid());}
            },
            Token::String(t) if phase<2&&raw.is_none()=>{
                if !t.value.iter().all(u8::is_ascii_whitespace) {return Err(invalid());}
            },
            Token::String(_)=>{},
            _=>return Err(invalid()),
        }
    }
    if phase!=2||raw.is_some(){return Err(invalid());}
    Ok(Head{tags,end:end.ok_or_else(invalid)?})
}
fn edit(source:&str,tags:Vec<String>)->Result<String,String>{
    let tags=valid_tags(tags)?;let head=head(source)?;let mut kept=HashSet::new();let mut edits=Vec::new();
    for (range,tag) in head.tags {
        if !tags.contains(&tag)||!kept.insert(tag) {edits.push((range,String::new()));}
    }
    let newline=if source.contains("\r\n"){"\r\n"}else{"\n"};
    let added=tags.iter().filter(|t|!kept.contains(*t)).map(|t|format!("<meta name=\"note-tag\" content=\"{}\">{newline}",escape(t))).collect::<String>();
    if !added.is_empty(){edits.push((head.end..head.end,added));}
    let mut out=source.to_string();for (range,value) in edits.into_iter().rev(){out.replace_range(range,&value);}
    if out.len() as u64>MAX_FILE{return Err("保存後のファイルが16MBを超えます".into());}Ok(out)
}
pub(super) fn target(vault:&Vault,path:&str)->Result<PathBuf,String>{
    let relative=Path::new(path);
    if path.is_empty()||path.contains(['\\','\0'])||relative.extension().and_then(|s|s.to_str())!=Some("html") {return Err("HTMLノートの相対パスが必要です".into());}
    if vault.root.canonicalize().map_err(|e|e.to_string())?!=vault.root {return Err("Vaultの場所が変わりました".into());}
    let mut out=vault.root.clone();
    for part in relative.components(){
        let Component::Normal(name)=part else{return Err("Vault外のパスは編集できません".into());};
        if name.to_str().is_some_and(|s|[".git",".shiori",".html-vault","node_modules",".DS_Store"].iter().any(|blocked|s.eq_ignore_ascii_case(blocked))){return Err("管理用ファイルは編集できません".into());}
        out.push(name);if fs::symlink_metadata(&out).map_err(|e|e.to_string())?.file_type().is_symlink(){return Err("シンボリックリンクは編集できません".into());}
    }
    if relative.components().next().is_some_and(|c|c.as_os_str().to_str().is_some_and(|s|s.eq_ignore_ascii_case("assets")||s.eq_ignore_ascii_case("styles"))){return Err("資産フォルダはノートの編集対象外です".into());}
    if !out.is_file()||!out.canonicalize().map_err(|e|e.to_string())?.starts_with(&vault.root){return Err("Vault内の通常ファイルが必要です".into());}
    Ok(out)
}
pub(super) fn read(path:&Path)->Result<(Vec<u8>,fs::Permissions),String>{
    let mut options=OpenOptions::new();options.read(true);
    #[cfg(unix)] {use std::os::unix::fs::OpenOptionsExt;options.custom_flags(libc::O_NOFOLLOW);}
    let file=options.open(path).map_err(|e|e.to_string())?;let meta=file.metadata().map_err(|e|e.to_string())?;
    if !meta.is_file()||meta.len()>MAX_FILE{return Err("16MB以内の通常ファイルが必要です".into());}
    if meta.permissions().readonly(){return Err("読み取り専用ノートは編集できません".into());}
    let mut bytes=Vec::new();file.take(MAX_FILE+1).read_to_end(&mut bytes).map_err(|e|e.to_string())?;
    if bytes.len() as u64>MAX_FILE{return Err("16MBを超えるノートです".into());}Ok((bytes,meta.permissions()))
}
fn source(bytes:&[u8])->Result<&str,String>{std::str::from_utf8(bytes).map_err(|_|"タグ編集はUTF-8ノートのみ対応しています".into())}
fn draft(vault:&Vault,path:&str)->Result<Draft,String>{
    let (bytes,_)=read(&target(vault,path)?)?;let head=head(source(&bytes)?)?;
    Ok(Draft{tags:head.tags.into_iter().map(|(_,t)|t).collect(),expected_hash:digest(&bytes)})
}
struct Temp(PathBuf);
impl Drop for Temp {fn drop(&mut self){let _=fs::remove_file(&self.0);}}
fn save(vault:&Vault,path:&str,expected:&str,tags:Vec<String>)->Result<(),String>{
    save_with(vault,path,expected,tags,||Ok(()))
}
fn save_with(vault:&Vault,path:&str,expected:&str,tags:Vec<String>,before_replace:impl FnOnce()->Result<(),String>)->Result<(),String>{
    let dest=target(vault,path)?;let (bytes,permissions)=read(&dest)?;
    let conflict=||"ノートが外部で変更されました。取消してVaultを再読込し、内容を確認してから編集し直してください".to_string();
    if digest(&bytes)!=expected{return Err(conflict());}
    let proposed=edit(source(&bytes)?,tags)?;if proposed.as_bytes()==bytes{return Ok(());}
    let temp_path=dest.parent().ok_or("親フォルダがありません")?.join(format!(".shiori-tags-{}.tmp",uuid::Uuid::new_v4()));
    let mut options=OpenOptions::new();options.write(true).create_new(true);
    #[cfg(unix)] {use std::os::unix::fs::OpenOptionsExt;options.mode(0o600);}
    let mut file=options.open(&temp_path).map_err(|e|e.to_string())?;
    let temp=Temp(temp_path);
    file.write_all(proposed.as_bytes()).map_err(|e|e.to_string())?;file.set_permissions(permissions).map_err(|e|e.to_string())?;file.sync_all().map_err(|e|e.to_string())?;drop(file);
    before_replace()?;
    if target(vault,path)?!=dest||digest(&read(&dest)?.0)!=expected{return Err(conflict());}
    // This final comparison is not an OS-wide compare-and-swap with external editors.
    fs::rename(&temp.0,&dest).map_err(|e|e.to_string())?;Ok(())
}
pub(super) fn active<'a>(guard:&'a Option<Vault>,token:&str)->Result<&'a Vault,String>{
    guard.as_ref().filter(|v|v.token==token).ok_or("Vaultが変更されました。編集を開き直してください".into())
}
pub(super) fn main_window(window:&tauri::WebviewWindow)->Result<(),String>{if window.label()!="main"{return Err("メイン画面からのみ編集できます".into());}Ok(())}
#[tauri::command]
pub async fn get_note_tags(window:tauri::WebviewWindow,app:tauri::AppHandle,vault_token:String,path:String)->Result<Draft,String>{
    main_window(&window)?;
    tauri::async_runtime::spawn_blocking(move||{let state=app.state::<State>();let guard=state.vault.lock().map_err(|_|"state error")?;draft(active(&guard,&vault_token)?,&path)}).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn set_note_tags(window:tauri::WebviewWindow,app:tauri::AppHandle,vault_token:String,path:String,expected_hash:String,tags:Vec<String>)->Result<Saved,String>{
    main_window(&window)?;
    tauri::async_runtime::spawn_blocking(move||set(&app.state::<State>(),&vault_token,&path,&expected_hash,tags)).await.map_err(|e|e.to_string())?
}
fn set(state:&State,token:&str,path:&str,expected:&str,tags:Vec<String>)->Result<Saved,String>{
    // Holding this guard serializes app writes and prevents a concurrent vault switch.
    let guard=state.vault.lock().map_err(|_|"state error")?;let vault=active(&guard,token)?;
    save(vault,path,expected,tags)?;
    let snapshot=scan(vault);let warning=if snapshot.errors.is_empty(){None}else{Some("タグは保存しましたが、一部のノートを再読込できません。サイドバーのエラーを確認してください".into())};
    Ok(Saved{saved:true,snapshot,warning})
}

#[cfg(test)]
mod tests {
 use super::*;
 struct Fixture(Vault);
 impl Fixture {fn new()->Self{let root=std::env::temp_dir().join(format!("shiori-tags-{}",uuid::Uuid::new_v4()));fs::create_dir(&root).unwrap();let root=root.canonicalize().unwrap();Self(Vault{root,token:"test".into()})}fn write(&self,s:&str){fs::write(self.0.root.join("n.html"),s).unwrap();}}
 impl Drop for Fixture{fn drop(&mut self){let _=fs::remove_dir_all(&self.0.root);}}
 const HTML:&str="<!doctype html><html><head><meta name='note-id' content='id'><meta name='note-tag' content='old'></head><body>日本語</body></html>";
 #[test]fn ranges_preserve_quotes_entities_case_comments_raw_text_and_crlf(){
  let tag="<MeTa\r\n CONTENT='設計 &amp; &quot;引用&quot; >' NAME=note-tag>";
  let source=format!("<!doctype html>\r\n<HTML lang='ja'>\r\n<HEAD>\r\n<!-- <meta name=note-tag content=fake> -->\r\n<meta name='note-id' content='keep'>\r\n{tag}\r\n<title>&lt;head&gt;</title><script>const x=\"<meta name='note-tag' content='fake'>\";</script><style>p::after{{content:'<head>'}}</style>\r\n</HEAD><BODY data-x='>'> unchanged\r\n</BODY></HTML>");
  let parsed=head(&source).unwrap();assert_eq!(parsed.tags.len(),1);assert_eq!(&source[parsed.tags[0].0.clone()],tag);assert_eq!(parsed.tags[0].1,"設計 & \"引用\" >");
  let out=edit(&source,vec!["技術/Rust & \"引用\" < >".into()]).unwrap();
  let added="<meta name=\"note-tag\" content=\"技術/Rust &amp; &quot;引用&quot; &lt; &gt;\">\r\n";
  assert_eq!(out,source.replace(tag,"").replace("</HEAD>",&format!("{added}</HEAD>")));
  assert_eq!(head(&out).unwrap().tags[0].1,"技術/Rust & \"引用\" < >");
 }
 #[test]fn retains_existing_bytes_deduplicates_and_allows_empty_tags(){
  assert_eq!(edit(HTML,vec!["old".into(),"old".into()]).unwrap(),HTML);
  let bom=format!("\u{feff}{HTML}");assert_eq!(edit(&bom,vec![]).unwrap(),bom.replace("<meta name='note-tag' content='old'>",""));
  assert_eq!(edit(HTML,vec![]).unwrap(),HTML.replace("<meta name='note-tag' content='old'>",""));
  let out=edit(HTML,vec!["old".into(),"Old".into(),"技術/Rust".into()]).unwrap();assert!(out.contains("<meta name='note-tag' content='old'>"));assert_eq!(head(&out).unwrap().tags.len(),3);
 }
 #[test]fn unsupported_or_malformed_html_is_rejected(){
  for source in ["<meta name=note-tag content=x>","<head><head></head>","<head><div></div></head>","<head><meta name=note-tag NAME=x content=x></head>","<head><meta name=note-tag content='x></head>","<head><!-- unfinished</head>","<head><script>unfinished</head>","<head><template><meta name=note-tag content=x></template></head>","<head><noscript></noscript></head>","<head></head><body><meta name=note-tag content=x></body>","<head></head><head></head>"]{assert!(edit(source,vec![]).is_err(),"{source}");}
 }
 #[test]fn successful_atomic_save_preserves_permissions_and_conflicts_do_not_write(){
  let f=Fixture::new();f.write(HTML);let d=draft(&f.0,"n.html").unwrap();
  #[cfg(unix)]{use std::os::unix::fs::PermissionsExt;fs::set_permissions(f.0.root.join("n.html"),fs::Permissions::from_mode(0o640)).unwrap();}
  save(&f.0,"n.html",&d.expected_hash,vec!["new".into()]).unwrap();let bytes=fs::read(f.0.root.join("n.html")).unwrap();
  assert_eq!(draft(&f.0,"n.html").unwrap().tags,vec!["new"]);
  #[cfg(unix)]{use std::os::unix::fs::PermissionsExt;assert_eq!(fs::metadata(f.0.root.join("n.html")).unwrap().permissions().mode()&0o777,0o640);}
  assert!(save(&f.0,"n.html",&d.expected_hash,vec![]).is_err());assert_eq!(fs::read(f.0.root.join("n.html")).unwrap(),bytes);
  assert_eq!(fs::read_dir(&f.0.root).unwrap().count(),1);
 }
 #[test]fn invalid_requests_readonly_utf8_and_boundaries_leave_source_untouched(){
  let f=Fixture::new();f.write(HTML);let d=draft(&f.0,"n.html").unwrap();
  for tags in [vec![" ".into()],vec!["a\nb".into()],vec!["x".repeat(257)],vec!["x".into();129]]{assert!(save(&f.0,"n.html",&d.expected_hash,tags).is_err());}
  for path in ["../n.html","/n.html",".git/n.html","n.html/..","n.txt",""]{assert!(draft(&f.0,path).is_err());}
  assert!(active(&Some(f.0.clone()),"stale").is_err());assert_eq!(fs::read_to_string(f.0.root.join("n.html")).unwrap(),HTML);
  fs::write(f.0.root.join("bad.html"),[0xff]).unwrap();assert!(draft(&f.0,"bad.html").is_err());
  #[cfg(unix)]{use std::os::unix::fs::{symlink,PermissionsExt};symlink(f.0.root.join("n.html"),f.0.root.join("link.html")).unwrap();assert!(draft(&f.0,"link.html").is_err());symlink(&f.0.root,f.0.root.join("alias")).unwrap();assert!(draft(&f.0,"alias/n.html").is_err());fs::set_permissions(f.0.root.join("n.html"),fs::Permissions::from_mode(0o444)).unwrap();assert!(draft(&f.0,"n.html").is_err());}
 }
 #[test]fn failure_and_external_change_before_replacement_clean_up_temp_files(){
  let f=Fixture::new();f.write(HTML);let d=draft(&f.0,"n.html").unwrap();
  assert!(save_with(&f.0,"n.html",&d.expected_hash,vec![],||Err("injected failure".into())).is_err());assert_eq!(fs::read_to_string(f.0.root.join("n.html")).unwrap(),HTML);
  let external=HTML.replace("日本語","external");
  assert!(save_with(&f.0,"n.html",&d.expected_hash,vec![],||{f.write(&external);Ok(())}).is_err());assert_eq!(fs::read_to_string(f.0.root.join("n.html")).unwrap(),external);assert_eq!(fs::read_dir(&f.0.root).unwrap().count(),1);
 }
 #[test]fn concurrent_app_saves_serialize_and_post_save_scan_errors_are_reported_as_saved(){
  use std::sync::{Arc,Barrier,Mutex};
  let f=Fixture::new();f.write(HTML);let hash=draft(&f.0,"n.html").unwrap().expected_hash;
  let state=Arc::new(State{vault:Mutex::new(Some(f.0.clone()))});let barrier=Arc::new(Barrier::new(2));
  let threads:Vec<_>=["a","b"].into_iter().map(|tag|{let state=state.clone();let barrier=barrier.clone();let hash=hash.clone();std::thread::spawn(move||{barrier.wait();set(&state,"test","n.html",&hash,vec![tag.into()]).is_ok()})}).collect();
  assert_eq!(threads.into_iter().filter_map(|t|t.join().ok()).filter(|ok|*ok).count(),1);
  let d=draft(&f.0,"n.html").unwrap();fs::write(f.0.root.join("bad.html"),[0xff]).unwrap();
  let response=set(&state,"test","n.html",&d.expected_hash,vec!["saved".into()]).unwrap();assert!(response.saved);assert!(response.warning.is_some());assert_eq!(response.snapshot.errors.len(),1);assert_eq!(response.snapshot.notes[0].tags,vec!["saved"]);
  assert!(set(&state,"stale","n.html",&d.expected_hash,vec![]).is_err());
 }
 #[cfg(unix)]
 #[test]fn revalidates_symlinks_and_cleans_up_on_actual_rename_failure(){
  use std::os::unix::fs::symlink;
  let f=Fixture::new();f.write(HTML);let outside=Fixture::new();outside.write(HTML);let d=draft(&f.0,"n.html").unwrap();
  assert!(save_with(&f.0,"n.html",&d.expected_hash,vec![],||{fs::remove_file(f.0.root.join("n.html")).unwrap();symlink(outside.0.root.join("n.html"),f.0.root.join("n.html")).unwrap();Ok(())}).is_err());
  assert_eq!(fs::read_to_string(outside.0.root.join("n.html")).unwrap(),HTML);assert_eq!(fs::read_dir(&f.0.root).unwrap().count(),1);
  fs::remove_file(f.0.root.join("n.html")).unwrap();f.write(HTML);
  assert!(save_with(&f.0,"n.html",&d.expected_hash,vec![],||{for entry in fs::read_dir(&f.0.root).unwrap(){let p=entry.unwrap().path();if p.extension().is_some_and(|x|x=="tmp"){fs::remove_file(p).unwrap();}}Ok(())}).is_err());
  assert_eq!(fs::read_to_string(f.0.root.join("n.html")).unwrap(),HTML);
 }

}
