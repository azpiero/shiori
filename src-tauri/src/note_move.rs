//! In-vault moves preserve source bytes; reference repair is intentionally separate.
use crate::{revision, scan, Snapshot, State, Vault, MAX_FILE, tag_editing};
use kuchiki::traits::TendrilSink;
use serde::Serialize;
use std::{fs, path::{Component,Path,PathBuf}};
use tauri::Manager;
use url::Url;

#[derive(Serialize)]
pub struct Reference { note: String, attribute: String, value: String, before: String, after: String }
#[derive(Serialize)]
pub struct Preview { path: String, destination: String, expected_hash: String, expected_revision: String, references: Vec<Reference>, omitted: usize, warnings: Vec<String> }
#[derive(Serialize)]
pub struct Moved { moved: bool, old_path: String, path: String, snapshot: Snapshot, warnings: Vec<String> }
fn folder(vault:&Vault,path:&str)->Result<PathBuf,String>{
    if path.contains(['\\','\0'])||vault.root.canonicalize().map_err(|e|e.to_string())?!=vault.root {return Err("不正なVaultまたはフォルダです".into());}
    let mut result=vault.root.clone();
    for part in Path::new(path).components(){
        let Component::Normal(name)=part else{return Err("Vault内の相対フォルダが必要です".into());};
        let name=name.to_str().ok_or("UTF-8のフォルダ名が必要です")?;
        if [".git",".DS_Store","node_modules",".shiori",".html-vault"].iter().any(|x|name.eq_ignore_ascii_case(x)) || result==vault.root&&["assets","styles"].iter().any(|x|name.eq_ignore_ascii_case(x)) {return Err("除外フォルダへは移動できません".into());}
        result.push(name);let meta=fs::symlink_metadata(&result).map_err(|e|e.to_string())?;
        if !meta.is_dir()||meta.file_type().is_symlink(){return Err("既存の通常フォルダを選んでください。シンボリックリンクは使えません".into());}
    }
    if !result.is_dir() {return Err("移動先フォルダがありません".into());}Ok(result)
}
fn destination(vault:&Vault,path:&str,to:&str)->Result<(PathBuf,PathBuf,String),String>{
    let from=tag_editing::target(vault,path)?;let directory=folder(vault,to)?;
    let dest=directory.join(from.file_name().ok_or("ノート名がありません")?);
    if dest==from{return Err("現在と異なるフォルダを選んでください".into());}
    match fs::symlink_metadata(&dest){Ok(_)=>return Err("移動先に同名のファイルがあります。上書きせず移動を停止しました".into()),Err(e) if e.kind()==std::io::ErrorKind::NotFound=>{},Err(e)=>return Err(e.to_string())}
    let relative=dest.strip_prefix(&vault.root).map_err(|e|e.to_string())?.to_str().ok_or("UTF-8のパスが必要です")?.replace('\\',"/");
    Ok((from,dest,relative))
}
fn note_url(path:&str)->Url {let mut url=Url::parse("https://shiori.invalid/").unwrap();url.path_segments_mut().unwrap().pop_if_empty().extend(path.split('/'));url}
fn local_url(base:&Url,value:&str)->Option<Url>{
    if Url::parse(value).is_ok(){return None;}
    let url=base.join(value).ok()?;
    (url.scheme()==base.scheme()&&url.host_str()==base.host_str()).then_some(url)
}
fn same_file(a:&Url,b:&Url)->bool {
    use unicode_normalization::UnicodeNormalization;
    let key=|u:&Url|percent_encoding::percent_decode_str(u.path()).decode_utf8_lossy().nfc().collect::<String>();
    a.scheme()==b.scheme()&&a.host_str()==b.host_str()&&key(a)==key(b)
}
fn display_url(url:&Url)->String {format!("{}{}",url.path(),url.fragment().map(|f|format!("#{f}")).unwrap_or_default())}
fn css_urls(source:&str)->(Vec<String>,bool){
    use cssparser::{Parser,ParserInput,Token,ParseError};
    fn collect(parser:&mut Parser<'_, '_>,out:&mut Vec<String>,uncertain:&mut bool,depth:usize){
        if depth>32{*uncertain=true;return;}
        while let Ok(token)=parser.next().cloned(){
            match token {
                Token::UnquotedUrl(value)=>out.push(value.to_string()),
                Token::AtKeyword(name) if name.eq_ignore_ascii_case("import")=>match parser.expect_url_or_string(){Ok(value)=>out.push(value.to_string()),Err(_)=>*uncertain=true},
                Token::Function(name) if name.eq_ignore_ascii_case("url")=>{
                    let value:Result<String,ParseError<'_,()>>=parser.parse_nested_block(|p|Ok(p.expect_string_cloned()?.to_string()));
                    match value{Ok(value)=>out.push(value),Err(_)=>*uncertain=true}
                },
                Token::Function(name)=>{if name.to_ascii_lowercase().contains("image-set"){*uncertain=true;}let _:Result<(),ParseError<'_,()>>=parser.parse_nested_block(|p|{collect(p,out,uncertain,depth+1);Ok(())});},
                Token::CurlyBracketBlock|Token::SquareBracketBlock|Token::ParenthesisBlock=>{let _:Result<(),ParseError<'_,()>>=parser.parse_nested_block(|p|{collect(p,out,uncertain,depth+1);Ok(())});},
                Token::BadUrl(_)|Token::BadString(_)=>*uncertain=true,
                _=>{},
            }
        }
    }
    let mut input=ParserInput::new(source);let mut out=Vec::new();let mut uncertain=false;collect(&mut Parser::new(&mut input),&mut out,&mut uncertain,0);(out,uncertain)
}
fn srcset_urls(mut source:&str)->Vec<String>{
    let mut urls=Vec::new();
    while !source.is_empty(){
        source=source.trim_start_matches(|c:char|c.is_ascii_whitespace()||c==',');if source.is_empty(){break;}
        let end=source.find(|c:char|c.is_ascii_whitespace()).unwrap_or(source.len());let token=&source[..end];source=&source[end..];
        let value=token.trim_end_matches(',');if !value.is_empty(){urls.push(value.to_string());}
        if !token.ends_with(','){source=source.find(',').map(|i|&source[i+1..]).unwrap_or("");}
    }
    urls
}
fn preview(vault:&Vault,path:&str,to:&str)->Result<Preview,String>{
    let start=revision(&vault.root);let (from,_,new_path)=destination(vault,path,to)?;
    let (bytes,_)=tag_editing::read(&from)?;std::str::from_utf8(&bytes).map_err(|_|"移動の参照確認はUTF-8ノートのみ対応しています")?;
    let old=note_url(path);let new=note_url(&new_path);let mut references=Vec::new();let mut total:usize=0;let mut warnings=Vec::new();
    // Inspect HTML directly; reader snapshots do not need a permanent link index.
    for entry in walkdir::WalkDir::new(&vault.root).follow_links(false).sort_by_file_name().into_iter().filter_entry(crate::allowed_entry){
        let entry=match entry {Ok(e)=>e,Err(e)=>{warnings.push(format!("参照を確認できません: {e}"));continue;}};
        if !entry.file_type().is_file()||entry.path().extension().and_then(|s|s.to_str())!=Some("html"){continue;}
        let relative=entry.path().strip_prefix(&vault.root).map_err(|e|e.to_string())?;
        if relative.components().next().is_some_and(|c|c.as_os_str()=="assets"||c.as_os_str()=="styles"){continue;}
        let name=relative.to_string_lossy().replace('\\',"/");
        let source=match entry.metadata().ok().filter(|m|m.len()<=MAX_FILE).and_then(|_|fs::read_to_string(entry.path()).ok()){Some(s)=>s,None=>{warnings.push(format!("{name}: サイズまたは読み取りエラーのため参照を確認できません"));continue;}};
        let doc=kuchiki::parse_html().one(source);let before_base=note_url(&name);let after_base=if name==path{new.clone()}else{before_base.clone()};
        let has_base=doc.select_first("base[href]").is_ok();
        if has_base{warnings.push(format!("{name}: base要素があります。以下の参照候補はbaseを除く表示用コピーを基準にしています。外部ブラウザでの参照も確認してください"));}
        let mut candidates=Vec::<(String,String)>::new();
        for element in doc.select("*").unwrap(){
            let attrs=element.attributes.borrow();
            for (attribute,value) in &attrs.map {
                let key=attribute.local.as_ref();let value=value.value.trim();
                if matches!(key,"href"|"src"|"poster"|"data"|"action"|"formaction"|"background"|"cite"|"longdesc"){candidates.push((key.into(),value.into()));}
                if matches!(key,"srcset"|"imagesrcset"){candidates.extend(srcset_urls(value).into_iter().map(|url|(key.into(),url)));}
                if key=="style"{let (urls,uncertain)=css_urls(value);candidates.extend(urls.into_iter().map(|url|("style/url".into(),url)));if uncertain{warnings.push(format!("{name}: style属性に個別に解析できないCSS参照があります"));}}
            }
        }
        for style in doc.select("style").unwrap(){let (urls,uncertain)=css_urls(&style.text_contents());candidates.extend(urls.into_iter().map(|url|("CSS url/@import".into(),url)));if uncertain{warnings.push(format!("{name}: 埋め込みCSSに個別に解析できない参照があります"));}}
        for (key,value) in candidates {
            let Some(before)=local_url(&before_base,&value) else{continue;};
            let Some(after)=local_url(&after_base,&value) else{continue;};
            // Fragment-only and filename-only self references travel with the document.
            let own_fragment=name==path&&(value.is_empty()||value.starts_with('#')||value.starts_with('?')||same_file(&before,&old)&&same_file(&after,&new));
            let outgoing=name==path&&!own_fragment&&!same_file(&before,&after);
            let incoming=name!=path&&same_file(&before,&old);
            if outgoing||incoming {total+=1;if references.len()<200{references.push(Reference{note:name.clone(),attribute:key,value,before:display_url(&before),after:if incoming{format!("旧パスのまま（移動後: {}）",display_url(&new))}else{display_url(&after)}});}}
        }
    }
    warnings.sort();warnings.dedup();
    if warnings.len()>200{let extra=warnings.len()-200;warnings.truncate(200);warnings.push(format!("その他{extra}件の未確認項目があります"));}
    if revision(&vault.root)!=start{return Err("確認中にVaultが変更されました。もう一度移動先を選んでください".into());}
    Ok(Preview{path:path.into(),destination:new_path,expected_hash:tag_editing::digest(&bytes),expected_revision:start,references,omitted:total.saturating_sub(200),warnings})
}
#[cfg(target_os="macos")]
fn rename_no_replace(from:&Path,to:&Path)->Result<(),String>{
    use std::{ffi::CString,os::unix::ffi::OsStrExt};
    let from=CString::new(from.as_os_str().as_bytes()).map_err(|e|e.to_string())?;let to=CString::new(to.as_os_str().as_bytes()).map_err(|e|e.to_string())?;
    // RENAME_EXCL refuses an existing destination, including a race after validation.
    if unsafe{libc::renamex_np(from.as_ptr(),to.as_ptr(),libc::RENAME_EXCL)}!=0{return Err(std::io::Error::last_os_error().to_string());}Ok(())
}
#[cfg(target_os="linux")]
fn rename_no_replace(from:&Path,to:&Path)->Result<(),String>{
    use std::{ffi::CString,os::unix::ffi::OsStrExt};
    let from=CString::new(from.as_os_str().as_bytes()).map_err(|e|e.to_string())?;let to=CString::new(to.as_os_str().as_bytes()).map_err(|e|e.to_string())?;
    if unsafe{libc::renameat2(libc::AT_FDCWD,from.as_ptr(),libc::AT_FDCWD,to.as_ptr(),libc::RENAME_NOREPLACE)}!=0{return Err(std::io::Error::last_os_error().to_string());}Ok(())
}
#[cfg(not(any(target_os="macos",target_os="linux")))]
fn rename_no_replace(_: &Path,_:&Path)->Result<(),String>{Err("このOSでは安全な上書き禁止の移動に未対応です".into())}
fn perform(vault:&Vault,path:&str,to:&str,hash:&str,expected_revision:&str)->Result<String,String>{
    let (from,dest,new_path)=destination(vault,path,to)?;
    if revision(&vault.root)!=expected_revision||tag_editing::digest(&tag_editing::read(&from)?.0)!=hash{return Err("Vaultまたはノートが変更されました。取消して再読込し、移動前の確認をやり直してください".into());}
    let (checked_from,checked_dest,_)=destination(vault,path,to)?;
    if checked_from!=from||checked_dest!=dest{return Err("移動先が変更されました".into());}
    rename_no_replace(&from,&dest)?;Ok(new_path)
}
#[tauri::command]
pub async fn preview_note_move(window:tauri::WebviewWindow,app:tauri::AppHandle,vault_token:String,path:String,folder:String)->Result<Preview,String>{
    tag_editing::main_window(&window)?;
    tauri::async_runtime::spawn_blocking(move||{let state=app.state::<State>();let guard=state.vault.lock().map_err(|_|"state error")?;preview(tag_editing::active(&guard,&vault_token)?,&path,&folder)}).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn move_note(window:tauri::WebviewWindow,app:tauri::AppHandle,vault_token:String,path:String,folder:String,expected_hash:String,expected_revision:String)->Result<Moved,String>{
    tag_editing::main_window(&window)?;
    tauri::async_runtime::spawn_blocking(move||move_locked(&app.state::<State>(),&vault_token,&path,&folder,&expected_hash,&expected_revision)).await.map_err(|e|e.to_string())?
}
fn move_locked(state:&State,token:&str,path:&str,to:&str,hash:&str,expected_revision:&str)->Result<Moved,String>{
    let guard=state.vault.lock().map_err(|_|"state error")?;let vault=tag_editing::active(&guard,token)?;
    let new_path=perform(vault,path,to,hash,expected_revision)?;let snapshot=scan(vault);
    let warnings=if snapshot.errors.is_empty(){vec![]}else{vec!["移動は完了しましたが、一部のノートを再読込できません。サイドバーのエラーを確認してください".into()]};
    Ok(Moved{moved:true,old_path:path.into(),path:new_path,snapshot,warnings})
}

#[cfg(test)]
mod tests {
 use super::*;
 struct Fixture(Vault);
 impl Fixture {fn new()->Self{let root=std::env::temp_dir().join(format!("shiori-move-{}",uuid::Uuid::new_v4()));fs::create_dir_all(root.join("notes/deep")).unwrap();fs::create_dir_all(root.join("empty")).unwrap();Self(Vault{root:root.canonicalize().unwrap(),token:"t".into()})}fn write(&self,path:&str,bytes:impl AsRef<[u8]>){fs::write(self.0.root.join(path),bytes).unwrap();}}
 impl Drop for Fixture{fn drop(&mut self){let _=fs::remove_dir_all(&self.0.root);}}
 const HTML:&str="<!doctype html>\r\n<html><head><meta name='note-id' content='keep'><meta name='note-tag' content='tag'></head><body>日本語</body></html>";
 #[test]fn existing_empty_folders_are_scanned_but_excluded_and_symlink_folders_are_not(){
  let f=Fixture::new();f.write("notes/a.html",HTML);
  for path in [".git/private","node_modules/pkg",".shiori/cache",".html-vault/cache","assets/images","styles/theme"]{fs::create_dir_all(f.0.root.join(path)).unwrap();}
  #[cfg(unix)]std::os::unix::fs::symlink(f.0.root.join("empty"),f.0.root.join("alias")).unwrap();
  assert_eq!(scan(&f.0).folders,vec!["","empty","notes","notes/deep"]);
 }
 #[test]fn preview_reports_outgoing_assets_srcset_css_and_incoming_links_without_writing(){
  let f=Fixture::new();let source=HTML.replace("</head>","<link href='../styles/a.css'></head>").replace("日本語","<img src='../assets/a.png'><a href='other.html'>other</a><a href='#here'>self</a><a href='a.html#here'>self name</a><a href='https://example.com'>external</a><img srcset='../assets/a.png 1x'><p style='background:url(../assets/a.png)'>日本語</p>");
  f.write("notes/a.html",&source);f.write("incoming.html","<a href='notes/%61.html#here'>encoded</a>");
  let p=preview(&f.0,"notes/a.html","notes/deep").unwrap();assert_eq!(p.destination,"notes/deep/a.html");assert_eq!(p.references.len(),6);assert!(p.warnings.is_empty());
  assert!(p.references.iter().any(|r|r.note=="incoming.html"));assert!(p.references.iter().any(|r|r.attribute=="src"&&r.after=="/notes/assets/a.png"));assert_eq!(fs::read_to_string(f.0.root.join("notes/a.html")).unwrap(),source);
 }
 #[test]fn move_preserves_bytes_id_permissions_and_updates_snapshot(){
  let f=Fixture::new();f.write("notes/日本 語.html",HTML);let p=preview(&f.0,"notes/日本 語.html","empty").unwrap();
  #[cfg(unix)]{use std::os::unix::fs::PermissionsExt;fs::set_permissions(f.0.root.join("notes/日本 語.html"),fs::Permissions::from_mode(0o640)).unwrap();}
  let new=perform(&f.0,"notes/日本 語.html","empty",&p.expected_hash,&p.expected_revision).unwrap();assert_eq!(new,"empty/日本 語.html");assert!(!f.0.root.join("notes/日本 語.html").exists());assert_eq!(fs::read(f.0.root.join(&new)).unwrap(),HTML.as_bytes());
  #[cfg(unix)]{use std::os::unix::fs::PermissionsExt;assert_eq!(fs::metadata(f.0.root.join(&new)).unwrap().permissions().mode()&0o777,0o640);}
  assert_eq!(scan(&f.0).notes[0].path,new);
 }
 #[test]fn rejects_collision_same_folder_invalid_paths_and_stale_source_or_vault(){
  let f=Fixture::new();f.write("notes/a.html",HTML);let p=preview(&f.0,"notes/a.html","empty").unwrap();
  for to in ["notes","../outside","/tmp","missing","notes/a.html","assets",".git"]{assert!(preview(&f.0,"notes/a.html",to).is_err(),"{to}");}
  for from in ["../a.html","/a.html","notes",".git/a.html"]{assert!(preview(&f.0,from,"empty").is_err());}
  f.write("empty/a.html","existing");assert!(perform(&f.0,"notes/a.html","empty",&p.expected_hash,&p.expected_revision).is_err());assert_eq!(fs::read_to_string(f.0.root.join("empty/a.html")).unwrap(),"existing");fs::remove_file(f.0.root.join("empty/a.html")).unwrap();
  let p=preview(&f.0,"notes/a.html","empty").unwrap();f.write("notes/a.html",HTML.replace("日本語","changed"));assert!(perform(&f.0,"notes/a.html","empty",&p.expected_hash,&p.expected_revision).is_err());
  let p=preview(&f.0,"notes/a.html","empty").unwrap();f.write("new.html",HTML);assert!(perform(&f.0,"notes/a.html","empty",&p.expected_hash,&p.expected_revision).is_err());
  assert!(tag_editing::active(&Some(f.0.clone()),"stale").is_err());assert!(!f.0.root.join("empty/a.html").exists());
 }
 #[cfg(unix)]
 #[test]fn rejects_symlink_source_and_target_and_readonly_files(){
  use std::os::unix::fs::{symlink,PermissionsExt};let f=Fixture::new();let outside=Fixture::new();f.write("notes/a.html",HTML);
  symlink(f.0.root.join("notes/a.html"),f.0.root.join("alias.html")).unwrap();symlink(outside.0.root.join("empty"),f.0.root.join("alias-dir")).unwrap();
  assert!(preview(&f.0,"alias.html","empty").is_err());assert!(preview(&f.0,"notes/a.html","alias-dir").is_err());
  let p=preview(&f.0,"notes/a.html","empty").unwrap();fs::remove_dir(f.0.root.join("empty")).unwrap();symlink(outside.0.root.join("empty"),f.0.root.join("empty")).unwrap();assert!(perform(&f.0,"notes/a.html","empty",&p.expected_hash,&p.expected_revision).is_err());assert_eq!(fs::read_dir(outside.0.root.join("empty")).unwrap().count(),0);
  fs::set_permissions(f.0.root.join("notes/a.html"),fs::Permissions::from_mode(0o444)).unwrap();assert!(preview(&f.0,"notes/a.html","notes/deep").is_err());
 }
 #[test]fn exclusive_rename_never_overwrites_an_existing_destination(){
  let f=Fixture::new();f.write("notes/a.html",HTML);f.write("empty/a.html","existing");assert!(rename_no_replace(&f.0.root.join("notes/a.html"),&f.0.root.join("empty/a.html")).is_err());assert_eq!(fs::read_to_string(f.0.root.join("notes/a.html")).unwrap(),HTML);assert_eq!(fs::read_to_string(f.0.root.join("empty/a.html")).unwrap(),"existing");
 }
 #[test]fn css_and_image_candidates_handle_quotes_escapes_data_urls_and_nested_rules(){
  let (urls,uncertain)=css_urls(r#"@import "../styles/a.css"; @media screen {p{background:url('../assets/a\20 b.png')}}"#);assert!(!uncertain);assert_eq!(urls,vec!["../styles/a.css","../assets/a b.png"]);
  assert!(css_urls("background:image-set('a.png' 1x)").1);
  assert_eq!(srcset_urls("a.png 1x, b.png 2x, data:image/png;base64,abcd 3x"),vec!["a.png","b.png","data:image/png;base64,abcd"]);
 }

 #[test]fn concurrent_commands_move_once_and_scan_errors_are_reported_as_completed(){
  use std::sync::{Arc,Barrier,Mutex};
  let f=Fixture::new();f.write("notes/a.html",HTML);f.write("bad.html",[0xff]);let p=preview(&f.0,"notes/a.html","empty").unwrap();assert!(!p.warnings.is_empty());
  let state=Arc::new(State{vault:Mutex::new(Some(f.0.clone()))});let barrier=Arc::new(Barrier::new(2));
  let threads:Vec<_>=(0..2).map(|_|{let state=state.clone();let barrier=barrier.clone();let hash=p.expected_hash.clone();let rev=p.expected_revision.clone();std::thread::spawn(move||{barrier.wait();move_locked(&state,"t","notes/a.html","empty",&hash,&rev)})}).collect();
  let successes:Vec<_>=threads.into_iter().filter_map(|t|t.join().unwrap().ok()).collect();assert_eq!(successes.len(),1);assert!(successes[0].moved);assert_eq!(successes[0].snapshot.notes[0].path,"empty/a.html");assert!(!successes[0].warnings.is_empty());
  assert!(move_locked(&state,"stale","empty/a.html","notes",&p.expected_hash,&p.expected_revision).is_err());
 }

}
