//! Opt-in benchmark of the exact current scanner. Not part of the application runtime.
use super::*;
#[test]
#[ignore = "requires generated benchmark vaults and SHIORI_BENCH_ROOT"]
fn measure_current_scanner() {
    let root=PathBuf::from(std::env::var_os("SHIORI_BENCH_ROOT").expect("SHIORI_BENCH_ROOT"));
    let output=PathBuf::from(std::env::var_os("SHIORI_BENCH_OUTPUT").expect("SHIORI_BENCH_OUTPUT"));
    std::fs::create_dir_all(&output).unwrap();
    let mut results=Vec::new();
    for count in [100usize,1000,10000] {
        let vault=Vault{root:root.join(format!("vault-{count}")).canonicalize().unwrap(),token:"benchmark".into()};
        let mut runs=Vec::new();
        for run in 0..3 {
            let start=Instant::now();let snapshot=scan(&vault);let scan_ms=start.elapsed().as_secs_f64()*1000.0;
            assert_eq!(snapshot.notes.len(),count);assert!(snapshot.errors.is_empty());
            let start=Instant::now();let json=serde_json::to_vec(&snapshot).unwrap();let json_ms=start.elapsed().as_secs_f64()*1000.0;
            if run==0 {std::fs::write(output.join(format!("snapshot-{count}.json")),&json).unwrap();}
            let start=Instant::now();let _=revision(&vault.root);let revision_ms=start.elapsed().as_secs_f64()*1000.0;
            let html_bytes:u64=snapshot.notes.iter().map(|n|n.size).sum();
            let text_bytes:usize=snapshot.notes.iter().map(|n|n.text.len()).sum();
            // Same refresh path is scan() of the full vault; no incremental update exists yet.
            let row=serde_json::json!({"run":run+1,"scan_ms":scan_ms,"serialize_ms":json_ms,"revision_ms":revision_ms,"json_bytes":json.len(),"html_bytes":html_bytes,"text_bytes":text_bytes});
            eprintln!("BENCH {count}: {row}");runs.push(row);
        }
        // Single-node display work, independent of list/DOM paint costs.
        let path=vault.root.join("notes/note-00000.html");let source=std::fs::read_to_string(path).unwrap();
        let state=State{vault:Mutex::new(None),logs:Mutex::new(Vec::new()),start:Instant::now()};
        let url=Url::parse("vault://localhost/benchmark/notes/note-00000.html?q=知識").unwrap();
        let start=Instant::now();for _ in 0..20 {std::hint::black_box(display_html(&source,&url,&state));}
        let display_ms=start.elapsed().as_secs_f64()*1000.0/20.0;
        results.push(serde_json::json!({"count":count,"runs":runs,"display_copy_5kb_mean_ms":display_ms}));
    }
    std::fs::write(output.join("rust.json"),serde_json::to_vec_pretty(&serde_json::json!({"profile":if cfg!(debug_assertions){"debug"}else{"release"},"results":results})).unwrap()).unwrap();
}
