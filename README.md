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

**Status:** early, read-only desktop prototype for macOS. The interface and bundled sample notes are currently in Japanese.

## Screenshots

Earlier macOS prototype showing the bundled sample vault in dark mode. These screenshots predate the simplified header, icon navigation, and tag search changes; updated captures are pending native UI verification.

| Read HTML notes | Explore shared tags |
| --- | --- |
| ![shiori displaying a sample HTML note with a local image](docs/assets/screenshot-reader.jpg) | ![shiori displaying the sample vault as a graph of notes and tags](docs/assets/screenshot-graph.jpg) |

## Features

- Open a local vault and browse notes by title, text, or tag.
- Read HTML with local images, tables, shared CSS, and note-specific styles.
- Move between highlighted search matches using controls shown only during an active note search.
- Explore a graph connecting notes to their tags. Select a tag to filter or a note to read it.
- Browse a compact title-and-tag list. Hover over a note title to see its path; tag buttons marked ↗ open a tag graph and update the search field.
- Switch between light and dark themes and resize the sidebar.
- Reload the entire vault from the button beside its name, or apply an external-change notification.
- Expand the sidebar’s read-error details to see which files could not be loaded and why.

Use the square icon buttons in the left navigation rail to switch between notes and the tag graph. Returning from a note preserves the graph page, zoom, and pan. Changing the search or tag filter, opening a vault, or refreshing its contents resets graph exploration; switching pages resets zoom and pan. A note excluded by the active filters remains identified in a compact sidebar section.

The graph displays up to 150 notes per page, follows the current search and tag filter, and supports zoom, pan, and keyboard selection. Its edges represent tag membership; hierarchical tag names use exact matching, and HTML links do not create graph edges.

## Search by text and tag

Type a phrase to search note titles and body text. Add `tag:` clauses to filter by existing tags:

| Query | Meaning |
| --- | --- |
| `tag: 開発/IT` | Notes with exactly the tag `開発/IT` |
| `ownership tag: Rust` | The text `ownership` and the tag `Rust` |
| `tag: Rust tag: 学習` | Notes containing both tags (AND) |
| `tag: "machine learning"` | A tag whose name contains spaces |

Tags use case-sensitive exact matching: `tag: 開発` does not include `開発/IT`. Free text remains a single case-insensitive substring search. Only free text is highlighted in the document.

Type `tag:` to see up to eight matching tag suggestions. Use ↑/↓ and Enter to insert a suggestion, Escape to dismiss, or click a candidate. Enter with no candidate selected opens the first matching note. Quoted tag names support JSON escapes such as `\"` and `\\`; names beginning with `tag:` must also be quoted. Empty clauses and unclosed quotes are ignored until completed; a complete but unknown tag returns no matches. IME composition is applied after confirmation.

The search field is the source of filter state. Selecting a tag in the graph or a note's ↗ tag button replaces the tag clauses with that tag while preserving free text. Remove the `tag:` clause to clear its filter. The **NOTES** count shows matching notes rather than a separate vault total.

## Workflow: AI writes, shiori reads, Git keeps history

1. Choose a vault folder, separate from the application source.
2. Give your AI assistant the path to the bundled [shiori-notes Skill](skills/shiori-notes/SKILL.md) and the target vault.
3. Ask it to create or update HTML notes. The Skill describes existing-tag reuse, generated UUIDs, stable heading IDs, relative links, and local assets.
4. Open the folder in shiori, or apply the external-change notification to read the updated files.
5. Review the changes and commit or sync the vault using your usual Git tools.

Example prompt, from the application repository:

```text
Read skills/shiori-notes/SKILL.md and follow it to create a note about Rust
ownership in ../vault. Check related notes and existing tags first, reuse
relevant tags, and link to existing notes where useful. Write the note in English.
```

The Skill is included as a file; it is not automatically installed into an AI tool. Use an assistant that can read the Skill and edit files in your chosen vault. shiori itself does not call an AI service, edit notes, or run Git commands. Commit and push are separate actions you request from your tools.

A vault can be its own Git repository. For example, after creating a new vault:

```sh
git -C ../vault init
git -C ../vault status
git -C ../vault diff
# Stage the note and asset files you have reviewed, then commit them.
```

Configure a remote and push with your Git client when you want to sync. The vault repository is independent of this app repository; no submodule is required.

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

The app starts with seven bundled sample notes. The header contains the app name, folder picker, and theme toggle. Choose **フォルダを開く** (Open folder) to open your vault, the graph icon in the left navigation rail to explore tags, and **更新を反映** (Apply updates) after editing notes externally. To return to the samples, restart the app or open `sample-vault/` through the folder picker.

Read-only status remains visible in the status bar, including while loading or showing errors. The development diagnostics panel and log collection have been removed; failed note reads are listed under **読み取りエラー** (Read errors) in the sidebar. The status bar retains basic load timings.

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
node --check ui/app.js
node --check ui/graph.js
node --check ui/search.js
```

The Rust suite covers vault boundaries, HTML sanitization, and preservation of source files. JavaScript tests cover tag syntax and suggestions, tag membership, graph pagination, and navigation/search state using a small DOM/Tauri adapter. They do not verify native WebView rendering or layout. The performance benchmark is an opt-in ignored Rust test; see [performance measurements and reproduction steps](docs/PERFORMANCE.md).

## Technology stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri 2 with a Rust backend |
| macOS rendering | System WKWebView, with a sandboxed iframe for notes |
| Interface | Plain HTML, CSS, and JavaScript; SVG for the tag graph |
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
│   │   └── shiori-notes/   # Instructions for AI-assisted note authoring
│   ├── sample-vault/       # Seven demonstration and test notes
│   ├── fixtures/           # Test assets, including vault-boundary fixtures
│   ├── tests/              # JavaScript graph tests
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

This prototype is read-only. In-app editing, automatic link repair, navigation history, and Git synchronization are not implemented.

Notes are served through a vault-scoped protocol after resolving paths and symlinks. A sandboxed iframe, Content Security Policy, and display-copy sanitization restrict scripts, forms, frames, and external resources. Original HTML remains unchanged. External links are currently disabled.

These controls have backend tests, but full verification of external-communication and IPC blocking in the real WebView remains open in [#3](https://github.com/azpiero/shiori/issues/3).

Other current limits:

- Notes must be UTF-8 files with a lowercase `.html` extension. The file-size limit is 16 MiB.
- Search uses one substring, without multi-term AND or regular expressions. List filtering ignores case; highlighting is case-sensitive and does not span HTML text nodes. At most 1,000 matches are marked per note.
- Opening or refreshing a vault reparses all notes. Large vaults can be slow; see [#1](https://github.com/azpiero/shiori/issues/1).
- Applying external changes resets the document's scroll position.
- Theme switching does not force arbitrary user HTML to adopt the app's colors.

## Contributing and roadmap

Bug reports and focused pull requests are welcome. Check [existing issues](https://github.com/azpiero/shiori/issues) before opening a new one. For bugs, include your macOS version, CPU architecture, reproduction steps, expected and actual behavior, and a small sample note when relevant. Use synthetic examples instead of private vault contents.

For code changes, describe the user-visible behavior, run the relevant tests above, and record manual UI checks when changing rendering or interaction. Discuss substantial architecture changes in an issue first.

Current work includes [large-vault performance](https://github.com/azpiero/shiori/issues/1), [WebView isolation verification](https://github.com/azpiero/shiori/issues/3), [interaction testing](https://github.com/azpiero/shiori/issues/4), [navigation history](https://github.com/azpiero/shiori/issues/5), and [Skill workflow validation](https://github.com/azpiero/shiori/issues/6).

## Documentation

Detailed working documents are currently in Japanese:

- [Requirements and design decisions](docs/requirements.md)
- [Verification records](docs/VERIFICATION.md)
- [Performance measurements](docs/PERFORMANCE.md)
- [AI note-authoring Skill](skills/shiori-notes/SKILL.md)

## License

A project license has not yet been selected. This repository currently does not include a `LICENSE` file.
