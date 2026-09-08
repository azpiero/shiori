use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, io::Write, path::{Path, PathBuf}};

#[derive(Default, Deserialize, Serialize)]
struct Settings {
    last_vault: Option<PathBuf>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    claude_path: Option<PathBuf>,
    #[serde(flatten)]
    other: BTreeMap<String, serde_json::Value>,
}

fn read(path: &Path) -> Result<Settings, String> {
    match fs::read(path) {
        Ok(bytes) => serde_json::from_slice(&bytes).map_err(|e| format!("{}: {e}", path.display())),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Settings::default()),
        Err(e) => Err(format!("{}: {e}", path.display())),
    }
}

pub fn validate(root: &Path) -> Result<PathBuf, String> {
    let canonical = root.canonicalize().map_err(|e| format!("{}: {e}", root.display()))?;
    // canonicalize alone also accepts files and unreadable directories.
    fs::read_dir(&canonical).map_err(|e| format!("{}: {e}", canonical.display()))?;
    Ok(canonical)
}

pub fn restore(settings: &Path, sample: &Path) -> Result<(PathBuf, Vec<String>), String> {
    let restored = read(settings).and_then(|s| s.last_vault.map(|root| {
        if !root.is_absolute() { return Err("保存されたVaultパスが絶対パスではありません".into()); }
        validate(&root)
    }).transpose());
    match restored {
        Ok(Some(root)) => Ok((root, vec![])),
        Ok(None) => Ok((validate(sample)?, vec![])),
        Err(e) => Ok((validate(sample)?, vec![format!("前回のVaultを復元できないためサンプルを開きました: {e}")])),
    }
}

pub fn claude_path(path: &Path) -> Result<Option<PathBuf>, String> { Ok(read(path)?.claude_path) }

pub fn save_claude(path: &Path, executable: Option<PathBuf>) -> Result<(), String> {
    let mut settings = read(path)?;
    settings.claude_path = executable;
    write(path, &settings)
}

pub fn save(path: &Path, root: &Path) -> Result<(), String> {
    let mut settings = read(path).unwrap_or_default();
    settings.last_vault = Some(root.to_path_buf());
    write(path, &settings)
}

fn write(path: &Path, settings: &Settings) -> Result<(), String> {
    let write = || -> Result<(), Box<dyn std::error::Error>> {
        let parent = path.parent().ok_or("設定フォルダがありません")?;
        fs::create_dir_all(parent)?;
        let temporary = parent.join(format!("settings-{}.tmp", uuid::Uuid::new_v4()));
        let result = (|| -> Result<(), Box<dyn std::error::Error>> {
            let mut file = fs::OpenOptions::new().write(true).create_new(true).open(&temporary)?;
            file.write_all(&serde_json::to_vec_pretty(&settings)?)?;
            file.sync_all()?;
            fs::rename(&temporary, path)?;
            Ok(())
        })();
        if result.is_err() { let _ = fs::remove_file(&temporary); }
        result
    };
    write().map_err(|e| format!("{}: {e}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            let root = std::env::temp_dir().join(uuid::Uuid::new_v4().to_string());
            fs::create_dir_all(root.join("sample")).unwrap();
            fs::create_dir_all(root.join("日本語 vault")).unwrap();
            Self(root)
        }
        fn settings(&self) -> PathBuf { self.0.join("config/settings.json") }
        fn sample(&self) -> PathBuf { self.0.join("sample") }
    }
    impl Drop for Fixture { fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0); } }
    #[test]
    fn executable_setting_preserves_vault_and_other_preferences() {
        let f=Fixture::new();let root=validate(&f.sample()).unwrap();
        save(&f.settings(),&root).unwrap();
        save_claude(&f.settings(),Some(PathBuf::from("/local/claude"))).unwrap();
        assert_eq!(restore(&f.settings(),&f.sample()).unwrap().0,root);
        save(&f.settings(),&validate(&f.0.join("日本語 vault")).unwrap()).unwrap();
        assert_eq!(claude_path(&f.settings()).unwrap(),Some(PathBuf::from("/local/claude")));
        save_claude(&f.settings(),None).unwrap();assert_eq!(claude_path(&f.settings()).unwrap(),None);
    }
    #[test]
    fn first_launch_and_saved_path_round_trip() {
        let f = Fixture::new();
        assert_eq!(restore(&f.settings(), &f.sample()).unwrap(), (validate(&f.sample()).unwrap(), vec![]));
        assert!(!f.settings().exists());
        let root = validate(&f.0.join("日本語 vault/../日本語 vault")).unwrap();
        save(&f.settings(), &root).unwrap();
        assert_eq!(restore(&f.settings(), &f.sample()).unwrap(), (root, vec![]));
        let json: serde_json::Value = serde_json::from_slice(&fs::read(f.settings()).unwrap()).unwrap();
        assert_eq!(json.as_object().unwrap().len(), 1);
        assert!(json.get("token").is_none());
    }
    #[test]
    fn unavailable_vault_and_bad_settings_fall_back_without_overwriting() {
        let f = Fixture::new();
        fs::create_dir_all(f.settings().parent().unwrap()).unwrap();
        for bytes in ["{broken".to_owned(), "{\"last_vault\":42}".into(), "{\"last_vault\":\"relative\"}".into(), serde_json::json!({"last_vault":f.0.join("missing")}).to_string(), serde_json::json!({"last_vault":f.settings()}).to_string()] {
            fs::write(f.settings(), &bytes).unwrap();
            let (root, warnings) = restore(&f.settings(), &f.sample()).unwrap();
            assert_eq!(root, validate(&f.sample()).unwrap());
            assert_eq!(warnings.len(), 1);
            assert_eq!(fs::read_to_string(f.settings()).unwrap(), bytes);
        }
        fs::remove_file(f.settings()).unwrap();
        fs::create_dir(f.settings()).unwrap();
        assert_eq!(restore(&f.settings(), &f.sample()).unwrap().1.len(), 1);
        assert!(save(&f.settings(), &validate(&f.sample()).unwrap()).is_err());
    }
    #[test]
    fn explicit_selection_repairs_corrupt_json_and_preserves_future_fields() {
        let f = Fixture::new();
        fs::create_dir_all(f.settings().parent().unwrap()).unwrap();
        fs::write(f.settings(), "invalid").unwrap();
        let root = validate(&f.sample()).unwrap();
        save(&f.settings(), &root).unwrap();
        fs::write(f.settings(), r#"{"theme":"dark"}"#).unwrap();
        save(&f.settings(), &root).unwrap();
        assert_eq!(read(&f.settings()).unwrap().other["theme"], "dark");
    }
}
