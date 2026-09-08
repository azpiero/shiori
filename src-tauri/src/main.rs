#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use kuchiki::{traits::TendrilSink, NodeRef};
use percent_encoding::percent_decode_str;
use serde::Serialize;
use std::{collections::hash_map::DefaultHasher, hash::{Hash, Hasher}, path::{Component, Path, PathBuf}, sync::Mutex, time::Instant};
use tauri::{Emitter, Manager};
use unicode_normalization::UnicodeNormalization;
use url::Url;
use walkdir::WalkDir;

mod settings;
mod claude;

const MAX_FILE: u64 = 16 * 1024 * 1024;
const NOTE_CSP: &str = "default-src 'none'; script-src 'none'; style-src vault: 'unsafe-inline'; img-src vault:; font-src vault:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox";
#[derive(Clone)]
struct Vault { root: PathBuf, token: String }
struct State { vault: Mutex<Option<Vault>> }
#[derive(Serialize)]
struct Heading { id: String, text: String }
#[derive(Serialize)]
struct NoteLink { href: String, text: String }
#[derive(Serialize)]
struct Note { path: String, title: String, tags: Vec<String>, headings: Vec<Heading>, links: Vec<NoteLink>, text: String, size: u64 }
#[derive(Serialize)]
struct Snapshot { warnings: Vec<String>, root: String, token: String, notes: Vec<Note>, errors: Vec<String>, revision: String, scan_ms: u128 }
fn current(state: &State) -> Result<Vault, String> { state.vault.lock().map_err(|_| "state error")?.clone().ok_or("Vaultが未選択です".into()) }
fn allowed_entry(entry: &walkdir::DirEntry) -> bool {
    !matches!(entry.file_name().to_str(), Some(".git" | ".DS_Store" | "node_modules" | ".shiori" | ".html-vault"))
}
fn revision(root: &Path) -> String {
    let mut h = DefaultHasher::new();
    for entry in WalkDir::new(root).follow_links(false).sort_by_file_name().into_iter().filter_entry(allowed_entry).filter_map(Result::ok) {
        entry.path().hash(&mut h);
        if let Ok(m) = entry.metadata() { m.len().hash(&mut h); m.modified().ok().hash(&mut h); }
    }
    format!("{:x}", h.finish())
}
fn parse_note(path: &Path, root: &Path) -> Result<Note,String> {
    let meta = std::fs::metadata(path).map_err(|e| e.to_string())?;
    if meta.len() > MAX_FILE { return Err("16MBを超えるため試作では未対応".into()); }
    let source = std::fs::read_to_string(path).map_err(|e| format!("UTF-8として読めません: {e}"))?;
    let doc = kuchiki::parse_html().one(source);
    let title = doc.select_first("title").ok().map(|n| n.text_contents().trim().to_string()).filter(|s| !s.is_empty()).unwrap_or_else(|| path.file_stem().unwrap_or_default().to_string_lossy().into());
    let tags = doc.select("meta[name='note-tag']").unwrap().filter_map(|n| n.attributes.borrow().get("content").map(String::from)).collect();
    let headings = doc.select("h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]").unwrap().map(|n| Heading { id:n.attributes.borrow().get("id").unwrap_or("").to_string(), text:n.text_contents() }).collect();
    let links = doc.select("a[href]").unwrap().map(|n| NoteLink { href:n.attributes.borrow().get("href").unwrap_or("").to_string(), text:n.text_contents().trim().to_string() }).collect();
    for n in doc.select("script,style,template,noscript").unwrap().collect::<Vec<_>>() { n.as_node().detach(); }
    let text = doc.select_first("body").map(|n| n.text_contents()).unwrap_or_default();
    Ok(Note { path:path.strip_prefix(root).map_err(|e| e.to_string())?.to_string_lossy().into(), title, tags, headings, links, text, size:meta.len() })
}
fn scan(vault: &Vault) -> Snapshot {
    let start = Instant::now(); let mut notes = Vec::new(); let mut errors = Vec::new();
    for entry in WalkDir::new(&vault.root).follow_links(false).sort_by_file_name().into_iter().filter_entry(allowed_entry) {
        match entry {
            Ok(e) if e.file_type().is_file() && e.path().extension().and_then(|s| s.to_str()) == Some("html") => {
                if e.path().strip_prefix(&vault.root).ok().and_then(|p| p.components().next()).is_some_and(|c| c.as_os_str() == "assets" || c.as_os_str() == "styles") { continue; }
                match parse_note(e.path(), &vault.root) { Ok(note) => notes.push(note), Err(err) => errors.push(format!("{}: {}", e.path().display(),err)) }
            },
            Err(e) => errors.push(e.to_string()), _ => ()
        }
    }
    Snapshot { warnings:vec![], root:vault.root.to_string_lossy().into(), token:vault.token.clone(), notes, errors, revision:revision(&vault.root), scan_ms:start.elapsed().as_millis() }
}
#[tauri::command]
async fn open_vault(path: Option<String>, app: tauri::AppHandle) -> Result<Snapshot,String> {
    let (vault, warnings) = {
    let runner = app.state::<claude::Runner>();
    let guard = runner.0.lock().map_err(|_| "実行状態エラー")?;
    if guard.is_some() { return Err("Claudeの終了または中断後にVaultを切り替えてください".into()); }
    let config = app.path().app_config_dir().map(|dir| dir.join("settings.json"));
    let mut warnings = Vec::new();
    if let Err(e) = &config { warnings.push(format!("設定フォルダを取得できません: {e}")); }
    let explicit = path.is_some();
    let root = if let Some(path) = path {
        settings::validate(Path::new(&path))?
    } else {
        let bundled = std::env::current_exe().ok().and_then(|p| p.parent().and_then(|p| p.parent()).map(|p| p.join("Resources/sample-vault")));
        let sample = bundled.filter(|p| p.is_dir()).unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../sample-vault"));
        if let Ok(file) = &config {
            let (root, restore_warnings) = settings::restore(file, &sample)?;
            warnings.extend(restore_warnings);
            root
        } else { settings::validate(&sample)? }
    };
    let vault = Vault { root, token:uuid::Uuid::new_v4().to_string() };
    *app.state::<State>().vault.lock().map_err(|_| "state error")? = Some(vault.clone());
    // Startup/fallback must not replace an unavailable user's saved vault with samples.
    if explicit {
        if let Ok(file) = &config {
            if let Err(e) = settings::save(file, &vault.root) {
                warnings.push(format!("Vaultは開きましたが、次回起動用の設定を保存できません: {e}"));
            }
        }
    }
    (vault, warnings)
    };
    let mut snapshot = tauri::async_runtime::spawn_blocking(move || scan(&vault)).await.map_err(|e|e.to_string())?;
    snapshot.warnings = warnings;
    Ok(snapshot)
}
#[tauri::command]
async fn refresh_vault(app: tauri::AppHandle) -> Result<Snapshot,String> {
    let vault = current(&app.state::<State>())?;
    tauri::async_runtime::spawn_blocking(move || scan(&vault)).await.map_err(|e|e.to_string())
}
#[tauri::command]
async fn vault_revision(app: tauri::AppHandle) -> Result<String,String> {
    let vault = current(&app.state::<State>())?;
    tauri::async_runtime::spawn_blocking(move || revision(&vault.root)).await.map_err(|e|e.to_string())
}
fn resolve(vault: &Vault, uri: &Url) -> Result<PathBuf,String> {
    if uri.scheme() != "vault" || uri.host_str() != Some("localhost") { return Err("許可外のURL".into()); }
    let prefix = format!("/{}/", vault.token);
    let raw = uri.path().strip_prefix(&prefix).ok_or("無効なVault識別子")?;
    let decoded = percent_decode_str(raw).decode_utf8().map_err(|_| "不正なUTF-8")?;
    if decoded.contains('\0') || decoded.contains('\\') { return Err("不正なパス".into()); }
    let relative = Path::new(decoded.as_ref());
    if relative.components().any(|c| !matches!(c, Component::Normal(_))) { return Err("Vault外のパス".into()); }
    let direct = vault.root.join(relative);
    let target = match direct.canonicalize() {
        Ok(p) => p,
        Err(_) => {
            // Preserve disk names; NFC is only a comparison key.
            let key: String = decoded.nfc().collect();
            let candidates: Vec<_> = WalkDir::new(&vault.root).follow_links(false).into_iter().filter_map(Result::ok).filter(|e| e.file_type().is_file()).filter(|e| e.path().strip_prefix(&vault.root).ok().is_some_and(|p| p.to_string_lossy().nfc().collect::<String>() == key)).map(|e|e.path().to_path_buf()).collect();
            if candidates.len() != 1 { return Err("参照先が存在しないか曖昧です".into()); }
            candidates[0].canonicalize().map_err(|e|e.to_string())?
        }
    };
    if !target.starts_with(&vault.root) || !target.is_file() { return Err("Vault外のファイルは配信しません".into()); }
    if target.strip_prefix(&vault.root).unwrap().components().any(|c| c.as_os_str() == ".git") { return Err("Git内部は配信しません".into()); }
    Ok(target)
}
fn escape(s:&str) -> String { s.replace('&',"&amp;").replace('<',"&lt;").replace('>',"&gt;").replace('"',"&quot;") }
fn fragment_node(html:String) -> NodeRef {
    let d = kuchiki::parse_html().one(format!("<html><body>{html}</body></html>"));
    let body = d.select_first("body").unwrap(); let holder = NodeRef::new_document();
    for node in body.as_node().children().collect::<Vec<_>>() { holder.append(node); } holder
}
fn display_html(source:&str, uri:&Url) -> (String,usize) {
    let doc = kuchiki::parse_html().one(source);
    // Only this transient display copy is rewritten; original bytes never change.
    for n in doc.select("script,iframe,frame,frameset,object,embed,base,meta[http-equiv],link[rel='preload'],link[rel='prefetch']").unwrap().collect::<Vec<_>>() {
        n.as_node().detach();
    }
    for n in doc.select("*").unwrap() {
        let mut attrs = n.attributes.borrow_mut();
        attrs.map.retain(|k,_| !k.local.as_ref().starts_with("on") && !matches!(k.local.as_ref(),"srcdoc"|"autofocus"|"formaction"|"action"|"target"|"ping"|"download"));
        if n.name.local.as_ref() == "a" {
            if let Some(href) = attrs.get("href").map(String::from) {
                if !href.starts_with('#') {
                    match uri.join(&href) {
                        Ok(mut dest) if dest.scheme()=="vault" && dest.host_str()==Some("localhost") => {
                            // Routing context belongs to the requesting reader tab, never to note-authored URLs.
                            let retained: Vec<(String,String)> = dest.query_pairs().filter(|(k,_)| !matches!(k.as_ref(),"theme"|"q"|"v"|"view"|"request")).map(|(k,v)|(k.into_owned(),v.into_owned())).collect();
                            dest.set_query(None);
                            dest.query_pairs_mut().extend_pairs(retained);
                            for (key,value) in uri.query_pairs().filter(|(k,_)|matches!(k.as_ref(),"theme"|"q"|"v"|"view"|"request")) { dest.query_pairs_mut().append_pair(&key,&value); }
                            attrs.insert("href", dest.to_string());
                        },
                        _ => { attrs.insert("href","#shiori-blocked-link".into()); attrs.insert("title",format!("試作では外部遷移を停止: {href}")); }
                    }
                }
            }
        }
    }
    let theme = uri.query_pairs().find(|(k,_)|k=="theme").map(|(_,v)|v.to_string()).unwrap_or("system".into());
    if let Ok(html) = doc.select_first("html") { html.attributes.borrow_mut().insert("data-shiori-theme",theme.clone()); }
    let q = uri.query_pairs().find(|(k,_)|k=="q").map(|(_,v)|v.into_owned()).unwrap_or_default();
    let mut matches = 0;
    if !q.is_empty() && q.len() <= 512 {
        let nodes:Vec<_> = doc.select_first("body").unwrap().as_node().descendants().filter(|n|n.as_text().is_some()).collect();
        for node in nodes {
            if node.ancestors().any(|n| n.as_element().is_some_and(|e|matches!(e.name.local.as_ref(),"style"|"script"|"textarea"))) { continue; }
            let text = node.as_text().unwrap().borrow().to_string();
            if !text.contains(&q) { continue; }
            let mut out = String::new(); let mut last=0;
            for (i,_) in text.match_indices(&q).take(1000usize.saturating_sub(matches)) {
                out.push_str(&escape(&text[last..i]));
                out.push_str(&format!("<mark id=\"shiori-hit-{matches}\" class=\"shiori-search-hit\">{}</mark>",escape(&q)));
                matches+=1; last=i+q.len();
            }
            out.push_str(&escape(&text[last..]));
            let frag = fragment_node(out);
            for child in frag.children().collect::<Vec<_>>() { node.insert_before(child); } node.detach();
        }
    }
    let css = format!("html{{color-scheme:{}}} .shiori-search-hit{{background:#ffe290!important;color:#211b0a!important;scroll-margin-top:36px}} .shiori-search-hit:target{{outline:3px solid #c68019}}",if theme=="dark"{"dark"}else if theme=="light"{"light"}else{"light dark"});
    let style_doc = kuchiki::parse_html().one(format!("<html><head><style>{css}</style></head></html>"));
    doc.select_first("head").unwrap().as_node().append(style_doc.select_first("style").unwrap().as_node().clone());
    (doc.to_string(),matches)
}
fn respond(app: &tauri::AppHandle, request: tauri::http::Request<Vec<u8>>) -> tauri::http::Response<Vec<u8>> {
    let state = app.state::<State>();
    let mut response = tauri::http::Response::builder().header("Content-Security-Policy",NOTE_CSP).header("Cache-Control","no-store").header("Access-Control-Allow-Origin","*").header("X-Content-Type-Options","nosniff");
    let result = (|| -> Result<(Vec<u8>,String),String> {
        if request.method() != "GET" { return Err("GETのみ許可".into()); }
        let vault = current(&state)?; let url=Url::parse(&request.uri().to_string()).map_err(|e|e.to_string())?;
        let target=resolve(&vault,&url)?;
        if std::fs::metadata(&target).map_err(|e|e.to_string())?.len()>MAX_FILE { return Err("16MB超のファイルは試作対象外".into()); }
        let ext=target.extension().and_then(|s|s.to_str()).unwrap_or("").to_ascii_lowercase();
        let mime=mime_guess::from_path(&target).first_or_octet_stream().to_string();
        if !matches!(ext.as_str(),"html"|"css"|"png"|"jpg"|"jpeg"|"webp"|"gif"|"svg"|"woff"|"woff2"|"ttf"|"otf") { return Err("試作対象外の形式".into()); }
        let data=std::fs::read(&target).map_err(|e|e.to_string())?;
        if ext=="html" {
            let source=String::from_utf8(data).map_err(|e|e.to_string())?;
            let (html,hits)=display_html(&source,&url);
            let path=target.strip_prefix(&vault.root).unwrap().to_string_lossy().to_string();
            let _=app.emit_to("main","note-served",serde_json::json!({"path":path,"hits":hits,"url":url.to_string()}));
            Ok((html.into_bytes(),"text/html; charset=utf-8".into()))
        } else { Ok((data,mime)) }
    })();
    match result {
        Ok((body,mime)) => response.header("Content-Type",mime).body(body).unwrap(),
        Err(e) => { response=response.status(403); response.header("Content-Type","text/html; charset=utf-8").body(format!("<!doctype html><meta charset=utf-8><h2>読み込みを停止しました</h2><p>{}</p>",escape(&e)).into_bytes()).unwrap() }
    }
}
fn main() {
    tauri::Builder::default()
        .manage(State { vault:Mutex::new(None) })
        .manage(claude::Runner::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![open_vault,refresh_vault,vault_revision,claude::claude_config,claude::claude_configure,claude::claude_start,claude::claude_stop])
        .register_asynchronous_uri_scheme_protocol("vault",|ctx,request,responder| { let app=ctx.app_handle().clone(); std::thread::spawn(move || responder.respond(respond(&app,request))); })
        .build(tauri::generate_context!()).expect("Tauri app failed")
        .run(|app,event| { if matches!(event,tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit) { app.state::<claude::Runner>().stop(); } });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn display_removes_active_content_and_preserves_text() {
        let source="<html><head><meta http-equiv='refresh' content='0;url=https://example.com'></head><body onload='evil()'><script>evil()</script><iframe src='https://example.com'></iframe><a href='javascript:evil()'>外部</a><p>日本語の検索</p></body></html>";
        let (out,hits)=display_html(source,&Url::parse("vault://localhost/token/n.html?q=検索").unwrap());
        assert!(!out.contains("<script")); assert!(!out.contains("<iframe")); assert!(!out.contains("http-equiv")); assert!(!out.contains("onload=")); assert!(!out.contains("href=\"javascript:")); assert!(out.contains("id=\"shiori-hit-0\"")); assert_eq!(hits,1);
    }
    #[test] fn internal_links_preserve_reader_context_and_override_note_authored_routing() {
        let source=r#"<a href="other.html?view=forged&amp;request=old&amp;q=wrong#section">Other</a><a href="https://example.com">External</a>"#;
        let uri=Url::parse("vault://localhost/token/a.html?view=tab-a&request=load-a&q=Rust&theme=dark&v=revision").unwrap();
        let (html,_)=display_html(source,&uri);
        let doc=kuchiki::parse_html().one(html);
        let anchor=doc.select_first("a").unwrap();
        let attrs=anchor.attributes.borrow();
        let link=Url::parse(attrs.get("href").unwrap()).unwrap();
        for (key,value) in [("view","tab-a"),("request","load-a"),("q","Rust"),("theme","dark"),("v","revision")] {
            let values:Vec<_>=link.query_pairs().filter(|(k,_)|k==key).map(|(_,v)|v.into_owned()).collect();
            assert_eq!(values,vec![value.to_string()]);
        }
        assert_eq!(link.fragment(),Some("section"));
        assert!(NOTE_CSP.contains("script-src 'none'"));assert!(NOTE_CSP.contains("sandbox"));
        let external=doc.select("a").unwrap().nth(1).unwrap();
        assert_eq!(external.attributes.borrow().get("href"),Some("#shiori-blocked-link"));
    }
    #[test] fn paths_do_not_escape_vault() {
        let root=std::env::temp_dir().join(uuid::Uuid::new_v4().to_string()); std::fs::create_dir_all(&root).unwrap();
        std::fs::write(root.join("日本 #%.html"),"<p>hello</p>").unwrap();
        let v=Vault{root:root.canonicalize().unwrap(),token:"token".into()};
        assert!(resolve(&v,&Url::parse("vault://localhost/token/日本%20%23%25.html").unwrap()).is_ok());
        for u in ["vault://localhost/token/%2e%2e/etc/passwd","vault://localhost/token/%2Fetc%2Fpasswd","vault://localhost/wrong/file.html","file:///etc/passwd"] { assert!(resolve(&v,&Url::parse(u).unwrap()).is_err(),"{u}"); }
        #[cfg(unix)] { std::os::unix::fs::symlink("/etc/passwd",root.join("outside.html")).unwrap(); assert!(resolve(&v,&Url::parse("vault://localhost/token/outside.html").unwrap()).is_err()); }
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test] fn source_is_unchanged_and_highlight_is_escaped() {
        let source="<p>A&amp;B &lt;test&gt;</p>"; let (html,n)=display_html(source,&Url::parse("vault://localhost/token/x.html?q=A%26B").unwrap()); assert_eq!(n,1); assert!(html.contains("A&amp;B")); assert_eq!(source,"<p>A&amp;B &lt;test&gt;</p>");
    }
    #[test] fn readable_sample_keeps_static_components_and_local_styles_after_sanitizing() {
        let root=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../sample-vault").canonicalize().unwrap();
        let vault=Vault {root,token:"readable-test".into()};
        let source=std::fs::read_to_string(vault.root.join("notes/07-readable-notes.html")).unwrap();
        for theme in ["light","dark","system"] {
            let uri=Url::parse(&format!("vault://localhost/readable-test/notes/07-readable-notes.html?theme={theme}&q=共有CSS")).unwrap();
            let (html,hits)=display_html(&source,&uri);
            let doc=kuchiki::parse_html().one(html);
            assert!(hits>0);
            assert_eq!(doc.select_first("html").unwrap().attributes.borrow().get("data-shiori-theme"),Some(theme));
            for selector in ["svg title","svg desc","svg path","table caption","pre code","details summary"] {
                assert!(doc.select_first(selector).is_ok(),"missing {selector}");
            }
            assert!(doc.select("script,iframe").unwrap().next().is_none());
            for link in doc.select("link[href],a[href]").unwrap() {
                let attrs=link.attributes.borrow();
                let href=attrs.get("href").unwrap();
                if let Some(id)=href.strip_prefix('#') {
                    assert!(doc.select("[id]").unwrap().any(|node| node.attributes.borrow().get("id")==Some(id)));
                } else { assert!(resolve(&vault,&uri.join(href).unwrap()).is_ok(),"unresolved {href}"); }
            }
        }
        assert_eq!(std::fs::read(vault.root.join("styles/shiori-document.css")).unwrap(),include_bytes!("../../skills/shiori-readable-notes/assets/shiori-document.css"));
    }
    #[test] fn sample_vault_is_readable_and_never_modified() {
        let root=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../sample-vault").canonicalize().unwrap();
        let v=Vault{root:root.clone(),token:"test".into()};
        let files:Vec<_>=WalkDir::new(&root).follow_links(false).into_iter().filter_map(Result::ok).filter(|e|e.file_type().is_file()).map(|e|{let p=e.into_path();let b=std::fs::read(&p).unwrap();(p,b)}).collect();
        let snapshot=scan(&v); assert_eq!(snapshot.notes.len(),8);assert!(snapshot.errors.is_empty());assert!(snapshot.notes.iter().any(|n|!n.links.is_empty()));
        for note in &snapshot.notes {
            let mut u=Url::parse("vault://localhost/test/").unwrap();
            u.path_segments_mut().unwrap().pop_if_empty().extend(note.path.split('/'));
            u.query_pairs_mut().append_pair("q","知識").append_pair("theme","dark");
            let p=resolve(&v,&u).unwrap();let source=std::fs::read_to_string(p).unwrap();let (out,_)=display_html(&source,&u);
            assert!(out.contains("data-shiori-theme=\"dark\""));assert!(!out.contains("<script"));assert!(!out.contains("<iframe"));assert!(!out.contains("http-equiv="));
        }
        for (p,b) in files {assert_eq!(std::fs::read(p).unwrap(),b);}
    }
}

#[cfg(test)]
mod benchmark;
