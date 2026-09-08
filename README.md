<p align="center">
  <img src="docs/assets/shiori-logo.png" alt="shiori — a bookmark for your knowledge" width="240">
</p>

# shiori

[![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8D8?logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-2021_edition-CE422B?logo=rust&logoColor=white)](src-tauri/Cargo.toml)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)](ui/app.js)
[![HTML5](https://img.shields.io/badge/HTML-5-E34F26?logo=html5&logoColor=white)](ui/index.html)
[![CSS](https://img.shields.io/badge/CSS-663399?logo=css&logoColor=white)](ui/app.css)
[![macOS](https://img.shields.io/badge/macOS-Apple_Silicon-000000?logo=apple&logoColor=white)](#supported-operating-systems)
[![Status: Prototype](https://img.shields.io/badge/Status-Prototype-D69E2E)](#limitations-and-security-model)

A local HTML knowledge library. Let an AI assistant write and update your notes, read them in shiori, and keep their history in Git.

Your vault is a folder of ordinary HTML, CSS, and images. HTML files remain the source of truth: shiori reads them without rewriting the originals, preserving the layouts, tables, and illustrations that make each note useful.

**Status:** early desktop prototype for macOS, with HTML reading, per-note tag editing, folder creation/renaming and note moves, and an integrated terminal. The interface and bundled sample notes are currently in Japanese.

## Screenshots

Current macOS app with the bundled sample vault in dark mode. The first capture shows the reader and integrated terminal together; the second shows the HTML link graph.

| Read notes and use the terminal | Explore note links |
| --- | --- |
| ![shiori sample note with tags, folder tree, and integrated terminal](docs/assets/screenshot-reader.jpg) | ![shiori sample vault with eight notes in the HTML link graph](docs/assets/screenshot-graph.jpg) |


## Features

- Read local HTML notes with images, tables, shared CSS, and static diagrams.
- Search titles and text, filter by tags, and edit a note's tags inline.
- Compare notes in two panes with independent tabs and document search.
- Browse folders, create or rename directories, and drag notes between them.
- Explore the HTML links between notes in a local graph.
- Open a shell with **>_** in the left rail and run `claude`, `codex`, or other installed tools yourself.
- Switch light/dark themes, resize panes, and apply external file changes.

## Quick start

Build and launch the app using the steps below. The first launch opens `sample-vault`; later launches restore the last selected vault. Use the Vault name at the bottom of the sidebar to open your own folder. Keep notes under `notes/` and supporting files in `assets/` and `styles/`.

| Action | Control |
| --- | --- |
| Open/switch vault or reload | Bottom sidebar Vault menu → **Vaultを開く（切り替え）** / **再読込** |
| Search notes | Top sidebar search field; add `tag: Rust` or `tag: "machine learning"` |
| Filter by multiple tags | `tag: Rust tag: 学習` (exact, case-sensitive matches; AND) |
| Filter by a displayed tag | Click its name below the tab bar |
| Add/remove a tag | Tag row **＋** → type and Enter to save; tag **×** removes immediately |
| Add an empty tab | **＋** at the end of the tab row |
| Open a note in a new tab / beside it | ⌘/Ctrl-click / Shift-click a sidebar item or graph node |
| Switch/close tabs | Click a title / **×**; focused title: ←/→, Home/End, Delete |
| Add/remove a pane | **pane ＋ / −** buttons at the right of the tab row |
| Resize panes | Drag the divider; double-click for equal widths |
| Find in the current document | ⌘F, type a phrase, Enter; ⌘G / ⌘⇧G moves between matches |
| Clear document search | Escape in its input, **×**, or Edit → Find → Clear Note Search |
| Create/rename a folder | Right-click a folder → **新規フォルダ** / **名称変更**; Enter saves, Escape cancels |
| Move a note | Drag its title onto a folder; keyboard: Space on note, Tab to folder, Enter |
| Open graph / terminal | Graph icon / **>_** in the left rail |
| Apply external edits | **更新を反映** in the change notification |
| Change theme | Theme button at the bottom of the left rail |

Two panes and 12 tabs share one vault. Switching tabs preserves document scroll; reload and theme changes reset it. Folder moves preserve note IDs and source bytes but do not repair links automatically. The graph uses HTML links, not shared tags. See [detailed behavior](docs/requirements.md#detailed-usage-contracts-moved-from-readme-42) and the [tag-editing contract](docs/TAG_EDITING.md).

## Workflow: AI writes, shiori reads, Git keeps history

Choose a vault separate from the app source. Give an assistant the [shiori-notes Skill](skills/shiori-notes/SKILL.md) and that vault's path:

```text
Read skills/shiori-notes/SKILL.md. Create a note about Rust ownership in ../vault.
Check related notes and existing tags first. Write the note in English.
```

The Skill covers IDs, tags, links, prose, and the [HTML template](skills/shiori-notes/assets/note.html) with its [shared theme](skills/shiori-notes/assets/theme.css). Existing user themes are not overwritten. Review the resulting files, apply the app's change notification, and commit or sync the vault with your usual Git tools. The vault may be a separate Git repository; shiori does not commit or push automatically.

## Integrated terminal

The terminal starts your shell in a helper workspace containing the Skill, not in the vault. Start your preferred AI CLI yourself. Claude discovers `/shiori-notes` under `.claude/skills/`; generated instructions and `SHIORI_VAULT` identify the current vault as the default HTML destination. `SHIORI_SKILLS` identifies the workspace's Skills directory.

Hiding the terminal preserves the session. **ⓘ** shows its paths; `exit` ends the shell. Close it before switching vaults. Reopen it after updating shiori to refresh the Skill, and restart your AI CLI if needed. Commands run with your user privileges; the working directory is not a sandbox. See [terminal details](docs/requirements.md#integrated-terminal).

Outside shiori, install the Skill in your Claude project from this repository:

```sh
project_dir="/absolute/path/to/your/project"
mkdir -p "$project_dir/.claude/skills"
# Fresh install: inspect an existing copy before updating it.
cp -R skills/shiori-notes "$project_dir/.claude/skills/"
```

Then start Claude there, invoke `/shiori-notes`, and specify the vault. Other assistants can read the Skill directly. For an older manual installation, move `shiori-readable-notes` outside the discovery directory after reviewing custom changes.

## Supported operating systems

| Platform | Current status |
| --- | --- |
| macOS / Apple Silicon | Current development and manual testing platform |
| macOS / Intel | Not yet validated; no verified build provided |
| Windows / Linux | Not currently supported or tested by this project |

The macOS bundle declares macOS 12.0 as its minimum version; compatibility across all versions from 12.0 onward has not been verified. Tauri's platform support does not imply that shiori has been tested on those platforms.


## Build and run

### Prerequisites

- macOS with Xcode Command Line Tools (`xcode-select --install`). See the [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/#macos).
- Rust stable and Cargo available on your `PATH`.
- Git to clone the repository.
- Python 3 to assemble the `.app` bundle.
- Node.js with `node --test` support for JavaScript tests only.

There is no npm install step, frontend bundler, or Tauri CLI requirement. Rust and Node.js are not needed to launch an already-built app.

### Get the source

This layout keeps build outputs and your personal vault outside the source repository:

```sh
mkdir shiori-workspace
cd shiori-workspace
git clone https://github.com/azpiero/shiori.git app
cd app
```

### Run from source

```sh
cargo run --locked --manifest-path src-tauri/Cargo.toml --features custom-protocol
```

### Build a macOS app bundle

```sh
./scripts/build-macos.sh
open ../outputs/shiori.app
```

The script builds a development binary for the host architecture, copies the sample vault and icon, and applies and verifies an ad-hoc signature. It produces `../outputs/shiori.app`; this is not a notarized release package. Close the running app and reopen it after rebuilding.

By default, the script stores build artifacts in `../work/target`. Set `CARGO_TARGET_DIR` to override that location. Its fallback to `../work/toolchain` is for the maintainer's local setup; a normal installation with Cargo on `PATH` does not need that directory.

### Tests

Run from `app/`:

```sh
cargo test --locked --manifest-path src-tauri/Cargo.toml --features custom-protocol
node --test tests/*.test.cjs
```

The Rust suite covers vault boundaries, HTML sanitization, and preservation of source files. JavaScript tests cover tag syntax and suggestions, HTML link resolution, graph layout, pane routing, tab lifetime, and navigation/search state using a small DOM/Tauri adapter. They do not verify native WebView rendering or layout. The performance benchmark is an opt-in ignored Rust test; see [performance measurements and reproduction steps](docs/PERFORMANCE.md).


## Technology stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri 2 with a Rust backend |
| macOS rendering | System WKWebView, with a sandboxed iframe for notes |
| Interface | Plain HTML, CSS, and JavaScript; Canvas 2D for the link graph |
| Terminal | Native PTY (`portable-pty`), locally bundled xterm.js and addon-fit |
| HTML processing | `kuchiki` for parsing and display-copy transformation |
| Files and metadata | `walkdir`, `serde`, `serde_json`, URL and Unicode utilities |
| Storage | Local HTML files and assets; extracted text held in memory |
| Version control | External Git tools for the app and, optionally, a separate vault repository |

Dependency versions are pinned in [Cargo.lock](src-tauri/Cargo.lock). SQLite, persistent caches, and FTS5 are not implemented; their use is being evaluated in [#1](https://github.com/azpiero/shiori/issues/1).


## Directory structure

Suggested workspace layout; your vault can live elsewhere:

```text
shiori-workspace/
├── app/                    # This Git repository
│   ├── ui/                 # HTML/CSS/JavaScript interface and graph
│   ├── src-tauri/          # Rust backend, Tauri config, icons, Cargo.lock
│   ├── skills/
│   │   └── shiori-notes/   # Vault conventions, prose, theme.css, and HTML template
│   ├── sample-vault/       # Eight demonstration and test notes
│   ├── fixtures/           # Test assets, including vault-boundary fixtures
│   ├── tests/              # JavaScript behavior tests
│   ├── scripts/            # macOS packaging and benchmark tools
│   └── docs/               # Requirements, verification, performance, images
├── vault/                  # Your notes; optionally a separate Git repository
│   ├── notes/              # UTF-8 .html files
│   ├── assets/             # Images and other local assets
│   └── styles/             # Shared CSS
├── outputs/                # Generated shiori.app
└── work/                   # Build cache and disposable benchmark data
```

The `notes/`, `assets/`, and `styles/` layout is the Skill's default for a new vault. Keep existing vault conventions when editing an established collection. `.git`, `node_modules`, `.shiori`, and `.html-vault` directories are excluded from scans; HTML under root-level `assets/` and `styles/` is not treated as notes.


## Limitations and security model

shiori is a prototype: body editing, automatic link repair, navigation history, and Git sync are not implemented. Notes must be UTF-8 `.html` files, at most 16 MiB. Vault reloads reparse the notes, so large collections can be slow; see [performance measurements](docs/PERFORMANCE.md).

The viewer sanitizes display copies in a sandboxed iframe with a vault-scoped protocol and CSP; scripts and external links/resources are disabled. Source files are preserved except for explicit tag edits and file operations. Full native WebView isolation verification remains tracked in [#3](https://github.com/azpiero/shiori/issues/3). See the [security details](docs/requirements.md#limitations-and-security-model) and [verification record](docs/VERIFICATION.md).

## Contributing

Bug reports and focused PRs are welcome in [GitHub issues](https://github.com/azpiero/shiori/issues). Include reproduction steps and a synthetic sample; run relevant tests and record UI checks. See [contribution checks](docs/requirements.md#contribution-checks).

## Documentation

- [Requirements and detailed behavior](docs/requirements.md)
- [Verification records](docs/VERIFICATION.md)
- [Performance measurements](docs/PERFORMANCE.md)
- [AI note-authoring Skill](skills/shiori-notes/SKILL.md)
- [Dependency licenses](docs/DEPENDENCIES.md)

## License

Licensed under the [MIT License](LICENSE), copyright © 2026 azpiero. This covers the application, Skills, sample notes, and project images/logos. Third-party components retain their own licenses; see [notices](NOTICE.md) and the [dependency inventory](docs/DEPENDENCIES.md).
