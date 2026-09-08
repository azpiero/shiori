use std::{io::{Read, Write}, path::{Path, PathBuf}, sync::{Arc, Mutex, Condvar, atomic::{AtomicBool, Ordering}}, time::Duration, hash::{Hash, Hasher}, collections::hash_map::DefaultHasher};
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, ChildKiller, PtySize};
use serde::Serialize;
use tauri::{Emitter, Manager};

#[derive(Default)]
pub struct Runner(pub Mutex<Option<Session>>);
pub struct Session {
    id: String, master: Box<dyn MasterPty + Send>, input: std::sync::mpsc::SyncSender<Input>, killer: Box<dyn ChildKiller + Send + Sync>,
    flow: Arc<Flow>, pid: Option<u32>,
}
struct Input {bytes:Vec<u8>,reply:std::sync::mpsc::Sender<Result<(),String>>}
#[derive(Default)]
struct Flow { ack: Mutex<u64>, changed: Condvar, stopped: AtomicBool }
impl Flow {
    fn stop(&self){self.stopped.store(true,Ordering::SeqCst);self.changed.notify_all();}
    fn wait(&self,seq:u64)->bool {
        let mut ack=self.ack.lock().unwrap();
        while *ack<seq && !self.stopped.load(Ordering::SeqCst) { ack=self.changed.wait_timeout(ack,Duration::from_millis(100)).unwrap().0; }
        !self.stopped.load(Ordering::SeqCst)
    }
}
impl Session {
    fn stop(&mut self) {
        self.flow.stop();
        #[cfg(unix)] unsafe {
            if let Some(fg)=self.master.process_group_leader(){if fg>0{libc::kill(-fg,libc::SIGHUP);libc::kill(-fg,libc::SIGKILL);}}
            if let Some(pid)=self.pid{libc::kill(-(pid as i32),libc::SIGHUP);libc::kill(-(pid as i32),libc::SIGKILL);}
        }
        let _=self.killer.kill();
    }
}
impl Runner {pub fn stop(&self){if let Ok(mut session)=self.0.lock(){if let Some(session)=session.as_mut(){session.stop();}}}}
#[derive(Clone,Serialize)]
struct Output {session_id:String,seq:u64,data:Vec<u8>,exit:bool,message:String}
#[derive(Serialize)]
pub struct Started {cwd:String,vault:String}
fn main_window(window:&tauri::WebviewWindow)->Result<(),String>{if window.label()!="main"{return Err("メイン画面からのみ操作できます".into());}Ok(())}
fn size(rows:u16,cols:u16)->Result<PtySize,String>{if !(2..=200).contains(&rows)||!(2..=400).contains(&cols){return Err("無効なターミナルサイズ".into());}Ok(PtySize{rows,cols,pixel_width:0,pixel_height:0})}
fn skills_dir()->PathBuf {
    let bundled=std::env::current_exe().ok().and_then(|p|p.parent().and_then(|p|p.parent()).map(|p|p.join("Resources/skills")));
    bundled.filter(|p|p.is_dir()).unwrap_or_else(||PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../skills"))
}
fn copy_skills(source:&Path,dest:&Path)->Result<(),String>{
    std::fs::create_dir_all(dest).map_err(|e|e.to_string())?;
    for entry in std::fs::read_dir(source).map_err(|e|e.to_string())?{
        let entry=entry.map_err(|e|e.to_string())?;let kind=entry.file_type().map_err(|e|e.to_string())?;
        if entry.file_name()==".DS_Store"{continue;}
        if kind.is_dir(){copy_skills(&entry.path(),&dest.join(entry.file_name()))?;}else if kind.is_file(){std::fs::copy(entry.path(),dest.join(entry.file_name())).map_err(|e|e.to_string())?;}
    }Ok(())
}
fn workspace(base:&Path,vault:&Path,skills:&Path)->Result<PathBuf,String>{
    let mut hash=DefaultHasher::new();vault.hash(&mut hash);let cwd=base.join(format!("{:016x}",hash.finish()));
    copy_skills(skills,&cwd.join("skills"))?;
    copy_skills(skills,&cwd.join(".claude/skills"))?;
    let guide=format!("# shiori terminal workspace\n\nThis directory contains authoring skills; it is not the HTML vault.\nThe current vault is this absolute path (JSON string): {}\n\nUnless the user specifies another destination, create HTML notes in that vault's notes/ directory and supporting files in its assets/ and styles/ directories. Inspect existing vault conventions first. Never use this workspace or the application bundle as the default note destination.\n\nRead skills/shiori-notes/SKILL.md for metadata, IDs, tags, and links. Read skills/shiori-readable-notes/SKILL.md for prose, templates, and shared CSS. Preserve existing note IDs when editing. No particular note is selected for you. Git operations require the user's instruction.\n\nClaude project skills are installed in .claude/skills; invoke /shiori-readable-notes or /shiori-notes.\n\nSHIORI_VAULT and SHIORI_SKILLS contain the same absolute paths in the shell environment. Tool sandbox permissions may require granting access to the vault; do not disable protections automatically.\n",serde_json::to_string(vault).map_err(|e|e.to_string())?);
    for name in ["AGENTS.md","CLAUDE.md"]{std::fs::write(cwd.join(name),&guide).map_err(|e|e.to_string())?;}
    Ok(cwd)
}
fn shell_command(cwd:&Path,vault:&Path)->CommandBuilder{
    // Let the platform choose the user's shell, without injecting a command.
    let mut cmd=CommandBuilder::new_default_prog();cmd.cwd(cwd);cmd.env("TERM","xterm-256color");cmd.env("COLORTERM","truecolor");cmd.env("SHIORI_VAULT",vault);cmd.env("SHIORI_SKILLS",cwd.join("skills"));cmd
}
#[tauri::command]
pub fn terminal_start(session_id:String,vault_token:String,rows:u16,cols:u16,app:tauri::AppHandle,window:tauri::WebviewWindow)->Result<Started,String>{
    main_window(&window)?;uuid::Uuid::parse_str(&session_id).map_err(|_|"無効なセッションID")?;
    let runner=app.state::<Runner>();let mut guard=runner.0.lock().map_err(|_|"状態エラー")?;if guard.is_some(){return Err("ターミナルは既に起動しています".into());}
    let vault=crate::current(&app.state::<crate::State>())?;if vault.token!=vault_token{return Err("Vaultが変更されました".into());}
    let root=crate::settings::validate(&vault.root)?;
    let base=app.path().app_data_dir().map_err(|e|e.to_string())?.join("terminal-workspaces");let cwd=workspace(&base,&root,&skills_dir())?;
    let pair=native_pty_system().openpty(size(rows,cols)?).map_err(|e|e.to_string())?;
    #[cfg(unix)] if let Some(fd)=pair.master.as_raw_fd(){unsafe{let flags=libc::fcntl(fd,libc::F_GETFL);if flags<0||libc::fcntl(fd,libc::F_SETFL,flags|libc::O_NONBLOCK)<0{return Err(std::io::Error::last_os_error().to_string());}}}
    let mut reader=pair.master.try_clone_reader().map_err(|e|e.to_string())?;let mut writer=pair.master.take_writer().map_err(|e|e.to_string())?;
    let mut child=pair.slave.spawn_command(shell_command(&cwd,&root)).map_err(|e|e.to_string())?;drop(pair.slave);
    let flow=Arc::new(Flow::default());let pid=child.process_id();
    let(input,receiver)=std::sync::mpsc::sync_channel::<Input>(4);
    let input_flow=flow.clone();
    std::thread::spawn(move||{
        while let Ok(input)=receiver.recv(){let bytes=input.bytes;let mut offset=0;while offset<bytes.len(){
            if input_flow.stopped.load(Ordering::SeqCst){return;}
            match writer.write(&bytes[offset..]){Ok(0)=>return,Ok(n)=>offset+=n,Err(e) if e.kind()==std::io::ErrorKind::WouldBlock=>std::thread::sleep(Duration::from_millis(10)),Err(e) if e.kind()==std::io::ErrorKind::Interrupted=>continue,Err(_)=>return}
        }let _=input.reply.send(Ok(()));}
    });
    *guard=Some(Session{id:session_id.clone(),master:pair.master,input,killer:child.clone_killer(),flow:flow.clone(),pid});
    let read_app=app.clone();let read_id=session_id.clone();let read_flow=flow.clone();let(done_tx,done_rx)=std::sync::mpsc::channel();
    std::thread::spawn(move||{
        let mut seq=0;let mut bytes=[0;4096];
        loop {if read_flow.stopped.load(Ordering::SeqCst){break;}match reader.read(&mut bytes){Ok(0)=>break,Ok(n)=>{
            if read_flow.stopped.load(Ordering::SeqCst){break;}seq+=1;
            if read_app.emit_to("main","terminal-output",Output{session_id:read_id.clone(),seq,data:bytes[..n].to_vec(),exit:false,message:String::new()}).is_err(){break;}
            if !read_flow.wait(seq){break;}
        },Err(e) if e.kind()==std::io::ErrorKind::Interrupted=>continue,Err(e) if e.kind()==std::io::ErrorKind::WouldBlock=>std::thread::sleep(Duration::from_millis(10)),Err(_)=>break}}
        let _=done_tx.send(());
    });
    let handle=app.clone();
    std::thread::spawn(move||{
        let result=child.wait();
        // Allow the terminal to consume the final PTY output before exit. A
        // detached process holding the tty must not block session cleanup.
        let _=done_rx.recv_timeout(Duration::from_secs(2));flow.stop();
        if let Ok(mut guard)=handle.state::<Runner>().0.lock(){if guard.as_ref().is_some_and(|s|s.id==session_id){if let Some(mut s)=guard.take(){s.stop();}}}
        let message=match result{Ok(s)=>format!("シェルが終了しました: {s}"),Err(e)=>e.to_string()};
        let _=handle.emit_to("main","terminal-output",Output{session_id,seq:0,data:vec![],exit:true,message});
    });
    Ok(Started{cwd:cwd.to_string_lossy().into(),vault:root.to_string_lossy().into()})
}
#[tauri::command]
pub async fn terminal_write(session_id:String,data:Vec<u8>,app:tauri::AppHandle,window:tauri::WebviewWindow)->Result<(),String>{
    main_window(&window)?;if data.len()>8192{return Err("入力が長すぎます".into());}
    let sender={let runner=app.state::<Runner>();let guard=runner.0.lock().map_err(|_|"状態エラー")?;guard.as_ref().filter(|s|s.id==session_id).ok_or("セッションが終了しています")?.input.clone()};
    tauri::async_runtime::spawn_blocking(move||{let(send,recv)=std::sync::mpsc::channel();sender.send(Input{bytes:data,reply:send}).map_err(|_|"セッションが終了しています".to_string())?;recv.recv().map_err(|_|"入力を中断しました".to_string())?}).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub fn terminal_resize(session_id:String,rows:u16,cols:u16,app:tauri::AppHandle,window:tauri::WebviewWindow)->Result<(),String>{
    main_window(&window)?;let runner=app.state::<Runner>();let guard=runner.0.lock().map_err(|_|"状態エラー")?;let s=guard.as_ref().filter(|s|s.id==session_id).ok_or("セッションが終了しています")?;s.master.resize(size(rows,cols)?).map_err(|e|e.to_string())
}
#[tauri::command]
pub fn terminal_ack(session_id:String,seq:u64,app:tauri::AppHandle,window:tauri::WebviewWindow)->Result<(),String>{
    main_window(&window)?;let runner=app.state::<Runner>();let guard=runner.0.lock().map_err(|_|"状態エラー")?;if let Some(s)=guard.as_ref().filter(|s|s.id==session_id){let mut ack=s.flow.ack.lock().map_err(|_|"状態エラー")?;*ack=(*ack).max(seq);s.flow.changed.notify_all();}Ok(())
}
#[tauri::command]
pub fn terminal_stop(session_id:String,app:tauri::AppHandle,window:tauri::WebviewWindow)->Result<(),String>{
    main_window(&window)?;let runner=app.state::<Runner>();let mut guard=runner.0.lock().map_err(|_|"状態エラー")?;if let Some(s)=guard.as_mut(){if s.id!=session_id{return Err("セッションが一致しません".into());}s.stop();}Ok(())
}

#[cfg(test)]
mod tests {
 use super::*;
 struct Fixture(PathBuf);impl Fixture{fn new()->Self{let p=std::env::temp_dir().join(uuid::Uuid::new_v4().to_string());std::fs::create_dir(&p).unwrap();Self(p.canonicalize().unwrap())}}impl Drop for Fixture{fn drop(&mut self){let _=std::fs::remove_dir_all(&self.0);}}
 #[test]fn workspace_binds_guidance_to_vault_without_writing_notes(){
  let f=Fixture::new();let vault=f.0.join("日本語 vault $notes");std::fs::create_dir(&vault).unwrap();
  let cwd=workspace(&f.0.join("sessions"),&vault,&skills_dir()).unwrap();
  assert!(cwd.join("skills/shiori-notes/SKILL.md").is_file());
  for name in ["shiori-notes","shiori-readable-notes"] {
   assert_eq!(std::fs::read(cwd.join(".claude/skills").join(name).join("SKILL.md")).unwrap(),std::fs::read(skills_dir().join(name).join("SKILL.md")).unwrap());
  }
  assert!(cwd.join(".claude/skills/shiori-readable-notes/assets/shiori-document.css").is_file());
  for file in ["AGENTS.md","CLAUDE.md"]{let guide=std::fs::read_to_string(cwd.join(file)).unwrap();assert!(guide.contains(&serde_json::to_string(&vault).unwrap()));assert!(guide.contains("notes/"));}
  assert_eq!(std::fs::read_dir(&vault).unwrap().count(),0);
  let other=workspace(&f.0.join("sessions"),&f.0,&skills_dir()).unwrap();assert_ne!(cwd,other);
  let cmd=shell_command(&cwd,&vault);assert!(cmd.is_default_prog());assert!(cmd.iter_extra_env_as_str().any(|(k,v)|k=="SHIORI_VAULT"&&v==vault.to_str().unwrap()));
  assert!(size(0,80).is_err());assert!(size(24,401).is_err());
 }
 #[test]fn output_waits_for_ack_and_stop_releases_backpressure(){
  let flow=Arc::new(Flow::default());let copy=flow.clone();let(send,recv)=std::sync::mpsc::channel();
  std::thread::spawn(move||{send.send(copy.wait(1)).unwrap();});assert!(recv.recv_timeout(Duration::from_millis(20)).is_err());
  *flow.ack.lock().unwrap()=1;flow.changed.notify_all();assert!(recv.recv_timeout(Duration::from_secs(1)).unwrap());
  flow.stop();assert!(!flow.wait(2));
 }
 #[test]#[cfg(unix)]fn real_pty_supports_input_resize_interrupt_and_environment(){
  let f=Fixture::new();let pair=native_pty_system().openpty(size(24,80).unwrap()).unwrap();
  let mut cmd=CommandBuilder::new("/bin/sh");cmd.arg("-i");cmd.cwd(&f.0);cmd.env("SHIORI_VAULT","/tmp/日本語 vault");
  let mut reader=pair.master.try_clone_reader().unwrap();let mut writer=pair.master.take_writer().unwrap();
  let mut child=pair.slave.spawn_command(cmd).unwrap();drop(pair.slave);
  let(send,recv)=std::sync::mpsc::channel();std::thread::spawn(move||{let mut b=[0;4096];while let Ok(n)=reader.read(&mut b){if n==0{break;}if send.send(b[..n].to_vec()).is_err(){break;}}});
  pair.master.resize(size(33,99).unwrap()).unwrap();
  writer.write_all(b"printf 'VAULT=%s\\n' \"$SHIORI_VAULT\"; pwd; stty size\n").unwrap();
  let mut output=Vec::new();let deadline=std::time::Instant::now()+Duration::from_secs(3);
  while std::time::Instant::now()<deadline{if let Ok(b)=recv.recv_timeout(Duration::from_millis(100)){output.extend(b);}let text=String::from_utf8_lossy(&output);if text.contains("33 99")&&text.contains(f.0.to_str().unwrap()){break;}}
  let text=String::from_utf8_lossy(&output);let valid=text.contains("VAULT=/tmp/日本語 vault")&&text.contains("33 99")&&text.contains(f.0.to_str().unwrap());
  writer.write_all(b"sleep 30\n").unwrap();std::thread::sleep(Duration::from_millis(50));writer.write_all(&[3]).unwrap();writer.write_all(b"printf 'INTERRUPTED\\n'\n").unwrap();
  let mut interrupted=false;let deadline=std::time::Instant::now()+Duration::from_secs(3);
  while std::time::Instant::now()<deadline{if let Ok(b)=recv.recv_timeout(Duration::from_millis(100)){if String::from_utf8_lossy(&b).contains("INTERRUPTED\r\n"){interrupted=true;break;}}}
  let _=child.kill();let _=child.wait();assert!(valid,"{text}");assert!(interrupted,"Ctrl-C did not return to the shell");
 }
}
