<p align="center">
  <img src="docs/assets/shiori-logo.png" alt="shiori — a bookmark for your knowledge" width="240">
</p>

# shiori

A local HTML knowledge library. Let an AI assistant write and update your notes, read them in shiori, and keep their history in Git.

Your vault is a folder of ordinary HTML, CSS, and images. HTML files remain the source of truth: shiori reads them without rewriting the originals, preserving the layouts, tables, and illustrations that make each note useful.

**Status:** early, read-only desktop prototype for macOS. The interface and bundled sample notes are currently in Japanese.

## Screenshots

Actual macOS app windows showing the bundled sample vault in dark mode.

| Read HTML notes | Explore shared tags |
| --- | --- |
| ![shiori displaying a sample HTML note with a local image](docs/assets/screenshot-reader.jpg) | ![shiori displaying the sample vault as a graph of notes and tags](docs/assets/screenshot-graph.jpg) |

## Features

- Open a local vault and browse notes by title, text, or tag.
- Read HTML with local images, tables, shared CSS, and note-specific styles.
- Jump to headings and highlighted search matches.
- Explore a graph connecting notes to their tags. Select a tag to filter or a note to read it.
- See tags in the note list and above the document; open a tag's graph directly from a note.
- Switch between light and dark themes and resize the sidebar.
- Detect external file changes and reload them on demand.

The graph displays up to 150 notes per page, follows the current search and tag filter, and supports zoom, pan, and keyboard selection. Its edges represent tag membership; hierarchical tag names use exact matching, and HTML links do not create graph edges.

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

The app starts with seven bundled sample notes. Choose **フォルダを開く** (Open folder) to open your vault, **タググラフ** (Tag graph) to explore tags, and **更新を反映** (Apply updates) after editing notes externally.

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
node --test tests/graph.test.cjs
node --check ui/app.js
node --check ui/graph.js
```

The Rust suite covers vault boundaries, HTML sanitization, and preservation of source files. JavaScript tests cover tag membership and graph pagination. The performance benchmark is an opt-in ignored Rust test; see [performance measurements and reproduction steps](docs/PERFORMANCE.md).

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
