use crate::{note_move,tag_editing,revision,scan,State,Snapshot,Vault};
use std::{fs,path::Path};
use serde::Serialize;
use tauri::Manager;
#[derive(Serialize)]
pub struct Changed { pub old_path:Option<String>, pub path:String, pub snapshot:Snapshot }
fn name(value:&str)->Result<(),String>{
 if value.trim().is_empty()||value.len()>200||value.contains(['/','\\'])||value.chars().any(char::is_control)||value=="."||value==".."||[".git",".ds_store","node_modules",".shiori",".html-vault"].iter().any(|n|value.eq_ignore_ascii_case(n)){return Err("フォルダ名に区切り文字・予約名・制御文字は使えません（200バイト以内）".into());}Ok(())
}
fn scope(path:&str)->Result<(),String>{if path=="notes"||path.starts_with("notes/"){Ok(())}else{Err("notes以下のフォルダを指定してください".into())}}
fn create(vault:&Vault,parent:&str,value:&str)->Result<Changed,String>{
 scope(parent)?;name(value)?;
 // Creating the first folder explicitly initializes notes/ for an empty vault.
 if parent=="notes"&&!vault.root.join("notes").exists(){note_move::folder(vault,"")?;fs::create_dir(vault.root.join("notes")).map_err(|e|e.to_string())?;}
 let directory=note_move::folder(vault,parent)?;let dest=directory.join(value);
 fs::create_dir(&dest).map_err(|e|format!("フォルダを作成できません（同名の項目も確認してください）: {e}"))?;
 Ok(Changed{old_path:None,path:format!("{parent}/{value}"),snapshot:scan(vault)})
}
fn rename(vault:&Vault,path:&str,value:&str,expected:&str)->Result<Changed,String>{
 scope(path)?;name(value)?;if path=="notes"{return Err("notesルートの名称は変更できません".into());}
 let from=note_move::folder(vault,path)?;let parent=Path::new(path).parent().and_then(Path::to_str).ok_or("親フォルダがありません")?;
 let to=note_move::folder(vault,parent)?.join(value);
 if from==to{return Err("別のフォルダ名を入力してください".into());}
 if revision(&vault.root)!=expected{return Err("Vaultが変更されました。再読込してから名前を変更してください".into());}
 note_move::folder(vault,path)?;note_move::folder(vault,parent)?;
 note_move::rename_no_replace(&from,&to)?;
 Ok(Changed{old_path:Some(path.into()),path:format!("{parent}/{value}"),snapshot:scan(vault)})
}
#[tauri::command]
pub async fn create_note_folder(window:tauri::WebviewWindow,app:tauri::AppHandle,vault_token:String,parent:String,name:String)->Result<Changed,String>{
 tag_editing::main_window(&window)?;tauri::async_runtime::spawn_blocking(move||{let state=app.state::<State>();let guard=state.vault.lock().map_err(|_|"state error")?;create(tag_editing::active(&guard,&vault_token)?,&parent,&name)}).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn rename_note_folder(window:tauri::WebviewWindow,app:tauri::AppHandle,vault_token:String,path:String,name:String,expected_revision:String)->Result<Changed,String>{
 tag_editing::main_window(&window)?;tauri::async_runtime::spawn_blocking(move||{let state=app.state::<State>();let guard=state.vault.lock().map_err(|_|"state error")?;rename(tag_editing::active(&guard,&vault_token)?,&path,&name,&expected_revision)}).await.map_err(|e|e.to_string())?
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn create_rename_preserves_subtree_and_refuses_conflicts_and_escape(){
 let root=std::env::temp_dir().join(format!("shiori-folders-{}",uuid::Uuid::new_v4()));fs::create_dir(&root).unwrap();let vault=Vault{root:root.canonicalize().unwrap(),token:"t".into()};
 let created=create(&vault,"notes","設計").unwrap();assert!(created.snapshot.folders.contains(&"notes/設計".into()));fs::write(root.join("notes/設計/n.html"),b"<html>keep bytes</html>").unwrap();
 let changed=rename(&vault,"notes/設計","design",&revision(&vault.root)).unwrap();assert_eq!(changed.old_path.as_deref(),Some("notes/設計"));assert_eq!(fs::read(root.join("notes/design/n.html")).unwrap(),b"<html>keep bytes</html>");
 create(&vault,"notes","taken").unwrap();assert!(rename(&vault,"notes/design","taken",&revision(&vault.root)).is_err());assert!(rename(&vault,"notes/design","other","stale").is_err());assert!(rename(&vault,"notes","other",&revision(&vault.root)).is_err());
 for value in ["../escape",".git","","bad/name"]{assert!(create(&vault,"notes",value).is_err());}assert!(create(&vault,"","outside").is_err());
 #[cfg(unix)]{std::os::unix::fs::symlink(root.join("notes/design"),root.join("notes/alias")).unwrap();assert!(create(&vault,"notes/alias","bad").is_err());assert!(rename(&vault,"notes/alias","bad",&revision(&vault.root)).is_err());}
 fs::remove_dir_all(root).unwrap();
 }
}
