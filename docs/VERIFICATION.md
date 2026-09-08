# shiori 表示試作の検証記録

実施日：2026-09-08

## ユーザー確認（8:20）

- レイアウト修正後、ユーザーから「うまく動いてそう」と報告があり、見切れは解消したとして扱う。
- 「検索スクロールOK」との報告を受領。
- 添付画面で「日本語」の検索による一覧の絞り込み、本文ハイライト、検索箇所数の表示（1/4）を確認。
- 添付画面で2,000行の表の途中（55〜72行付近）が表示されており、長いノートのスクロールを確認。
- これはユーザーによる操作確認であり、フレームレートや全体性能の計測結果ではない。リンク解決の全ケース、外部通信・IPCの遮断、Text fragment、IME変換中のイベント処理は別途確認対象として残る。

## 表示領域の修正（ユーザーの8:02の画面確認後）

ユーザーのスクリーンショットでアプリの起動とHTMLの読み込みを確認した。一方、ノート本文が高さ約150pxで見切れていた。

原因は、更新通知が`display:none`になるとGridの自動配置でiframeのコンテナが第2行（auto）に入り、第3行（残りの高さ）が空になること。iframeの割合指定の高さも、親のauto高さに依存していた。

- ツールバー・通知・本文をそれぞれGridの第1・2・3行へ明示的に配置。
- 本文の行を`minmax(0, 1fr)`とし、iframeを絶対配置で領域全体に広げる。
- 画面全体の高さ・列幅も縮小可能にし、狭い幅でツールバーが折り返すよう変更。
- オフラインで再ビルド成功。アプリを差し替え、署名の整合性確認も成功。
- 修正後の実画面は未確認。アプリを終了して再起動する必要がある。

以下は修正前の初回検証記録。

## 成果物

- Apple Silicon向けTauri 2＋Rustアプリ（開発ビルド）
- sandbox付きiframe＋専用プロトコルの構成
- ソースコード、Cargo.lock、7件のHTMLサンプル、CSSとPNG

TauriはCargo.lock上で2.11.5。SQLiteや書き込み機能を入れる前の表示試作であり、要件書の全機能を実装した状態ではない。

## 成功した確認

| 確認 | 結果 |
| --- | --- |
| cargo build --features custom-protocol | 成功 |
| cargo test --features custom-protocol | 4件成功 |
| node --check ui/app.js | 成功 |
| codesign --verify --deep --strict | 成功 |
| 動的リンク先 | macOS標準ライブラリ・フレームワーク |

テスト名と範囲：

1. `paths_do_not_escape_vault`：エンコードされた日本語・空白・#・%の解決、トラバーサル、絶対パス、別トークン、Vault外シンボリックリンクの拒否。
2. `display_removes_active_content_and_preserves_text`：script・iframe・refresh・イベント属性・javascriptリンクの無効化とマーカー挿入。
3. `source_is_unchanged_and_highlight_is_escaped`：実体参照を含む表示マーカー。
4. `sample_vault_is_readable_and_never_modified`：7件のHTML抽出・表示コピー生成、全サンプルの元バイト列維持。

これらはRust側の処理を確認するものであり、WebView側でCSPが期待どおり働いたという証拠ではない。

## 起動・画面確認の制約

作業環境からの`open`はLaunchServicesの`kLSNoExecutableErr`となった。実行ファイルは存在し、直接実行ではmacOSの`_RegisterApplication`／`NSApplication`初期化中にSIGABRTとなった。HTMLの読み込みより前の段階であり、このログだけでアプリコードか作業環境の制約かを確定できない。

当初、検証用のVault外シンボリックリンクをアプリへ同梱していたため署名整合性にも問題があった。同梱物からそのリンクを除き、再署名後の整合性検証は成功した。修正後のFinderでの通常起動は未確認。

Computer Useは「permissions are not granted」で利用できず、実画面の検証は行えていない。

## 実画面で残る確認

- Finderから起動でき、7件のサンプルが表示されるか
- iframe内で専用プロトコルのHTML・CSS・画像を表示できるか
- マーカーのフラグメントと見出しでページ内移動できるか
- 内部リンク移動後に一覧の選択、見出し選択、再読み込みが正しいノートを対象にするか
- 外部画像・CSS／import・フォーム送信・自動遷移が実際に止まるか
- ノートからTauri IPCを呼べないか
- IMEの変換中に検索やEnterが誤発火しないか
- サイドバーの幅変更、長い表・大きい画像のスクロール、テーマ切替
- 外部編集通知と更新の反映
- 起動・切替時間、メモリ量、体感

## 構成選定について

iframe方式を最初の検証対象として実装した。Text fragmentは比較用ボタンを設け、通常の検索位置移動は表示用HTMLにマーカーを作る方式にした。正本に対する部分書き込みの要件とは別の処理である。

実画面が確認できていないため、iframe方式の採用確定、Text fragmentの実測結果、Tauriの操作感の評価は保留する。子WebView方式もまだ作っていない。

## shioriへの名称変更と移動（2026-09-08）

- 作業ルートを`~/Documents/shiori/`へ移動した。ソースは`app/`、実ノートは`vault/`。
- Git履歴とアプリ側のorigin（azpiero/shiori）を保持した。
- アプリ名・Rustパッケージ・識別子・UI・サンプル・仕様書をshioriへ更新した。
- 新しい場所でRustテスト4件、JavaScript構文チェック、再ビルド、アプリ署名検証が成功。
- `scripts/build-macos.sh`で同じ配置にshiori.appを再生成できる。
- 名称変更後の実画面は未確認。旧アプリを終了してoutputs/shiori.appを開き直す必要がある。

## タググラフ追加（2026-09-08）

- ノートとタグの二部グラフを追加。検索・タグ絞り込み、150件のページ表示、ノートへの遷移、拡大縮小・移動に対応。
- ノート一覧と本文上部にタグを表示。本文上部のタグからグラフへ移動できる。
- Nodeテストで共有タグの辺、重複タグ、タグなし、空結果、名前の衝突、10,000件すべてへのページ到達とページごとの件数上限を確認。
- ネイティブアプリの実画面・操作感の確認は別途必要。
- Skill同梱。標準quick_validate.pyは環境にPyYAMLがなく実行不可。frontmatterと本文は手動確認。


## Issue #7: 本文上部の操作整理（2026-09-08）

- 本文上部の常設ツールバー、パス・タグの重複表示、見出し移動、Text fragment検証ボタンを撤去。
- ノート／グラフ切替は左端のナビゲーション、Vault全体の再読込はサイドバーのVault名横へ移動。
- 一覧のタグはノート選択ボタンとは独立したボタンにし、↗とアクセシブルな名前でグラフへの移動を明示。上部のタグは一覧の絞り込みとして区別。
- 表示中のノートが絞り込み対象外になる場合のみ、タイトル・パス・タグをサイドバーに補足表示。
- 本文内検索の操作は、表示中の本文に適用された検索語と入力条件が一致する場合のみ表示。グラフ・検索解除時は非表示。
- グラフから本文を開いて戻る際はページ・ズーム・パンを保持。検索・タグ変更、Vault切替・再読込でリセット。ページ切替時はズーム・パンのみリセット。
- JavaScriptテスト9件（既存3件＋ナビゲーション6件）成功。追加テストは軽量DOM/Tauriアダプタで実際のUIイベントハンドラを実行し、状態遷移、空Vault、再読込失敗、IME変換中のEnterを確認する。実WebViewの描画やIMEそのものの検証ではない。
- 実アプリ操作はComputer Useの`timeoutReached`（-10005）で接続不可。shiori・Finderへの接続と接続リセットでも解消しなかった。ライト／ダーク、狭いウィンドウ、キーボード操作、外部更新通知の実機確認とREADME画像の差し替えは未完了。


## Issue #8: ヘッダーの整理（2026-09-08）

- ヘッダーからキャプション、試作pill、サンプルボタン、検証ログボタンを撤去。検証ログパネル・ハンドラ・CSS・Rustコマンド・ログ蓄積処理も削除。
- 起動時のサンプル読み込みとフォルダ選択を維持。テーマ切替にアクセシブルな名前と押下状態を付与。
- 読み取りエラーはサイドバーのdetails/summaryへ表示。HTMLとしてエスケープし、ノート表示後も確認可能。エラー解消後は非表示へ戻す。
- JavaScriptテスト11件成功。エラー表示・エスケープ・解消後の非表示、起動時のサンプル読み込み、フォルダ選択、テーマ切替の状態をDOM/Tauriアダプタで確認。
- Rustテスト4件成功、性能計測用テスト1件は通常どおりignore。HTMLの加工と元ファイル維持、Vault境界のテストは継続成功。
- macOSアプリのビルドとad-hoc署名・整合性検証に成功。
- Computer Useでshioriへの接続がtimeoutReached（-10005）。ライト／ダーク・狭いウィンドウ・キーボードの実画面確認、およびREADME画像の更新は未完了。READMEには画像が旧UIであることを明記。


## Issue #10: サイドバーとtag:検索（2026-09-08）

- 左ナビをアイコンのみの40px四方ボタンへ変更。タグの全件チップ、Vault件数pill、ノート先頭アイコン、パスの常設表示、サイドバー下部説明を撤去。結果件数と読み取り専用表示は維持。
- ui/search.jsにtag:の解析・完全一致AND絞り込み・候補生成を集約。空白付きタグは引用符で記述し、フリーワードとの併用に対応。
- 候補は最大8件を検索欄に重ねて表示。上下・Enter・Escape・クリックに対応し、IME変換中は更新しない。グラフ選択と検索欄の条件を同期する。
- JavaScriptテスト18件成功。日本語・階層タグ、複数条件、引用符とエスケープ、未完了入力、候補数上限、キーボード選択、IME中の未適用、グラフとの同期とハイライト語を確認。DOM/Tauriアダプタによるテストのため実IME・描画・読み上げの確認とは区別する。
- ベンチマークは同じ検索モジュールを利用するよう更新。既存100件スナップショットの7クエリで実行成功。
- macOSアプリのビルド・ad-hoc署名・整合性検証に成功。
- Computer Useは今回もshioriへの接続時にtimeoutReached（-10005）。ライト／ダーク、狭いウィンドウ、実IME・スクリーンリーダーの操作確認とスクリーンショット更新は未完了。READMEには旧画像であることを明記。


## Issue #12: 左右ペインとタブ（2026-09-08）

- 単一Vaultで左右2ペイン・最大12タブ、独立した本文検索、リンクの別タブ／別ペイン表示を実装。
- JavaScriptテスト28件成功。タブのiframeを保持する構造、配信IDによる応答先の分離、遅延応答の拒否、タブ閉鎖時の解放、再読込と削除パスの処理をテストで確認。
- macOSアプリのビルドとad-hoc署名・整合性検証に成功。
- Rustテスト5件成功。内部リンクに呼出元のview/request/q/theme/vだけが継承されることと、外部リンクの遮断を追加確認。既存のVault境界と元ファイル維持のテストも成功。
- 実WebViewのスクロール位置、キー操作、iframeフォーカス、左右配置・狭い幅・テーマ表示、およびREADME画像の更新は未確認。今回もComputer Use接続がtimeoutReached（-10005）。DOMアダプタによる検証は実画面の証拠として扱わない。
- #3の追加実機確認項目：異なるペインからのリンク遷移を交互に行っても他方の選択・ハイライトが変わらないこと、全iframeのsandboxが空であること、ノートからのIPC・外部通信の遮断が複数ペインでも維持されること。

## Issue #13: Remove the app header (2026-09-08)

- Removed the app icon/name header and its 64px grid row. Moved the folder picker beside vault reload and the theme toggle to the bottom of the navigation rail.
- Retained the existing folder/theme handlers, accessible names, theme pressed state, and loading-time disabled state. Folder selection remains present without a selected vault.
- Validation: all 28 JavaScript tests passed, including folder selection and theme switching while graph mode is active. JavaScript syntax and diff checks passed. The macOS build and ad-hoc signature verification passed.
- Native visual verification remains pending: Computer Use could not connect to shiori (`timeoutReached`, -10005). Check the layout at narrow widths, keyboard focus, light/dark reader rendering, and the folder picker after a startup failure. Existing README screenshots still show an earlier UI.

## Issue #15: Remember the last vault (2026-09-08)

- Added JSON settings in the Tauri app config directory, canonical path persistence after explicit folder selection, and startup restoration with a fresh vault token. Fallback does not overwrite the previous preference.
- Added persistent, text-only sidebar warnings for restoration and settings write failures, independent of note loading/status updates.
- Rust tests: 8 passed, 1 opt-in benchmark ignored. Covered first launch, Japanese paths, settings round-trip without tokens, missing/non-directory/relative saved paths, invalid JSON/types, unreadable settings (directory in place of the file), failed writes, corrupt JSON repair, and preservation of unknown fields. Temporary test directories do not touch real app settings.
- JavaScript tests: 29 passed, including warning visibility after note events/refresh and clearing after a successful folder selection. Syntax checks passed. macOS build, ad-hoc signing, and signature verification passed.
- Native restart/folder-picker verification remains pending: Computer Use could not connect to shiori (`timeoutReached`, -10005). Manually verify restart restores the chosen vault, unavailable or permission-denied folders fall back with a warning, and another folder can be selected afterward.

## Issue #17: Readable HTML note skill (2026-09-08)

- Added `shiori-readable-notes` for prose and presentation, with mutual links to the vault-convention skill. Added a starter HTML asset, shared script-free CSS, and source/reuse notes. No upstream files or text were vendored.
- Added the eighth bundled note, `notes/07-readable-notes.html`, using the new theme, local contents links, monochrome SVG, a three-column table, plain code, and native details/summary. The skill stylesheet and sample copy are identical.
- Both skills passed the skill-creator validator (PyYAML installed only in a temporary validation environment). Sample UUID, unique IDs, relative assets/anchors, documentation links, and absence of CSS network dependencies passed checks.
- Rust: 9 tests passed, 1 opt-in benchmark ignored. The new regression test passes the sample through `display_html` for light/dark/system, checks static components and local references, and verifies shared CSS consistency. The existing sample test checks all eight source files remain unchanged by rendering.
- macOS build, ad-hoc signing, signature verification, and diff checks passed.
- Native visual verification remains pending: Computer Use could not connect to shiori (`timeoutReached`, -10005). Open `sample-vault/` explicitly if startup restores a personal vault, then inspect “HTMLとCSSを分けてノートを育てる” in light/dark modes and a narrow split pane. Check diagram label legibility, table/code scrolling, contents links, keyboard focus, and disclosure behavior. Automated DOM checks do not establish visual correctness.

## Issue #19: Move tags into the reader (2026-09-08)

- Removed tags from sidebar note rows and the filtered-out current-note reminder. Each pane now displays its selected tab's tags below the tab bar, with an untagged label or no row for an empty tab. Long tag lists wrap inside a bounded scroll area.
- Tag buttons preserve graph navigation and free-text filtering, activate their originating pane, and focus the graph navigation control. Cached tag markup avoids replacing focused buttons during unrelated reader renders.
- JavaScript: all 31 tests passed. Coverage includes independent pane tags, tab switches, internal navigation, refresh, empty tabs, escaping, focus retention, and graph navigation without reloading the neighboring document. JavaScript syntax and diff checks passed.
- macOS build, ad-hoc signing, and signature verification passed.
- Native layout verification remains pending: Computer Use failed to connect to shiori (`timeoutReached`, -10005). Check narrow panes with many/long tags, light/dark styles, keyboard access to tag buttons, and graph return behavior.
- The future write feature is documented in [TAG_EDITING.md](TAG_EDITING.md) as a proposal awaiting agreement. No writing or tag-rename functionality was added.

## Issue #21: Integrated terminal (revised scope, 2026-09-08)

- Replaced the Claude-only request panel with an interactive shell using portable-pty 0.9.0 and locally vendored xterm.js 5.5.0 / fit addon 0.10.0. Removed Claude executable settings, fixed AI flags, and selected-note prompts.
- The initial cwd is a vault-specific app workspace containing Skills plus generated AGENTS.md/CLAUDE.md instructions. SHIORI_VAULT identifies the current HTML destination; no helper files are written into the vault. This guides tools without overriding their permissions or forcing arbitrary command output paths.
- Added byte-preserving terminal input/output, parsed-output acknowledgements, bounded input queues and 2,000-line scrollback, resize, hide/show, explicit shell close, and app-exit cleanup. Refresh and revision polling remain available during a terminal session; switching vaults requires closing it.
- JavaScript: 34 tests passed, covering session routing, raw/ANSI byte forwarding, acknowledgements, hide/show persistence, failed/fast starts, close during startup, and vault rather than note context. Syntax checks passed.
- Rust: 12 tests passed, 1 opt-in benchmark ignored. Real macOS PTY tests confirmed stdin, Ctrl-C, resize, cwd, and environment variables. Additional tests cover generated guidance, no vault writes during setup, independent workspaces, size bounds, and acknowledgement backpressure.
- macOS build, ad-hoc signing, and signature verification passed. Vendored npm archives were verified against published integrity hashes; both MIT license notices are included.
- Native graphical verification remains pending: Computer Use could not connect to shiori (`timeoutReached`, -10005). Verify xterm rendering, Japanese IME, copy/paste, actual Codex/Claude TUIs and their trust prompts, shell login configuration, and application quit during foreground work. No AI tool was automatically launched or paid AI request made.
- shiori does not save terminal transcripts. Shell history, CLI logs, and deliberately detached processes follow normal tool/shell behavior.

### Claude project Skill discovery

Terminal workspace setup now copies both bundled Skills, including their supporting assets, into `.claude/skills/`. The workspace test verifies both Skill definitions match the bundled originals and the shared stylesheet is present. The focused Rust workspace test passed. Claude slash-command discovery itself still requires a native CLI check.

## Issue #22: Resizable reader panes (2026-09-09)

- Added a focusable vertical separator between the two reader panes. Pointer capture and a full-window shield keep iframe content from intercepting a drag; updates are batched with requestAnimationFrame.
- Arrow keys adjust the left width in 5% steps, Home selects its minimum width, and End or double-click restores equal widths. Accessible values reflect the actual clamped widths.
- Both panes remain at least 320 px wide. Narrow workspaces scroll horizontally, and ResizeObserver restores the preferred ratio when space returns. Closing either pane retains the ratio; a vault/session reset restores equal widths.
- JavaScript: 37 tests passed, including divider order, keyboard limits, narrow-width clamping, close/reopen/reset, drag batching, cancellation, and unchanged iframe URLs. Syntax and diff checks passed.
- A headless Chromium layout check exercised real pointer drag, double-click, keyboard input, ResizeObserver, horizontal overflow, and closing/reopening the left pane. The mock DOM tests alone do not verify layout.
- macOS app build and ad-hoc signature verification passed. Native WKWebView dragging and rendering still require a manual app check.

## Issue #25: Per-note tag editing (2026-09-09)

- Tag-name clicks filter the sidebar without switching to the graph or writing a file. × and ＋ open an explicit draft with Save/Cancel, existing-tag suggestions, and keyboard/IME handling.
- The backend uses html5gum source spans and SHA-256 preconditions. It rejects unsupported heads, invalid inputs, stale tokens/hashes, traversal, read-only files, and symlink destinations; app writes are serialized and replacements use a flushed same-directory temporary file.
- JavaScript: 46 tests passed. Coverage includes cancellation, retained drafts on failure, concurrent input/save guards, both-pane snapshot updates, unchanged iframe retention, and stale revision-poll suppression.
- Rust: 20 tests passed; 1 opt-in benchmark ignored. Coverage includes byte preservation with CRLF/BOM, entities, quoted delimiters and raw text, atomic replacement/cleanup, permissions, boundary revalidation, concurrent saves, and saved-with-scan-error responses.
- Headless Chromium with a mocked IPC backend verified filter-only clicks, removal cancellation, suggestions, explicit save, modal interaction, and tag-chip layout at the minimum 320 px pane width without horizontal overflow. This checks frontend behavior, not native IPC or real files.
- macOS app build and ad-hoc signature verification passed. Native WKWebView datalist/IME interaction and an end-to-end tag save in the built app remain manual checks.
- The residual race with external editors and lack of custom ACL/extended-attribute preservation are documented in TAG_EDITING.md. No user vault files were changed during automated validation.

## Issue #26: Remove the reader link panel (2026-09-09)

- Removed the per-pane link menu, its rendering/click handlers, and its CSS. Removed the unused `Note.links` scan field and link extraction; the reader still rewrites internal links in the display copy for same-tab navigation.
- README now directs users to sidebar entries or graph nodes for modifier-click tab/pane opening.
- JavaScript: 45 tests passed. The originating-tab internal-navigation test and iframe sandbox assertion remain. Rust: 20 tests passed; 1 opt-in benchmark ignored, including retained internal-link routing and source-preservation checks.
- Headless Chromium with mocked IPC confirmed the panel is absent and Shift-click / Meta-click from both the sidebar and graph open adjacent panes / new tabs.
- Syntax and diff checks passed. macOS app build and ad-hoc signature verification passed. Native app appearance and modifier-click behavior remain manual checks.

## Issue #28: Notes folders and direct moves (revised 2026-09-09)

- Sidebar folder groups are rooted at notes/. Indented folders retain their ancestors when filtered and collapse entire subtrees. Creation uses a folder-plus icon; renaming uses a context menu and an input in the folder row. Per-file move buttons and the destination modal are removed; dropping onto a folder moves directly. Space followed by Enter on a folder provides the keyboard route.
- File moves run reference/hash checks before a native no-overwrite rename and show a brief status for reference impacts afterward. Folder renames retain contents, refuse collisions/stale revisions, and update descendant tab paths.
- JavaScript: 54 tests passed. Rust: 29 tests passed; 1 opt-in benchmark ignored. Coverage includes notes scope, empty folders, create/rename boundaries and collisions, byte preservation, descendant tab tracking, direct drops, keyboard moves, reference checks, and duplicate operation guards.
- Headless Chromium with mocked IPC verified inline folder creation, actual dragging into the created folder without a modal, secondary-click renaming, Escape cancellation, ancestor indentation and subtree collapse, open-tab tracking, and Space/Enter moves. Native filesystem tests use temporary fixtures; no user vault files were moved.
- Syntax and diff checks passed. macOS app build and ad-hoc signature verification passed. Native WKWebView dragging and end-to-end folder operations in the built app remain manual checks.
- Reference analysis is static and bounded; the permanent sidebar report and NOTES toolbar have been removed. Automatic repair, Finder drag/drop and cross-filesystem moves are not implemented.

## Issues #30, #37, #38: UI polish (2026-09-09)

- Removed YOUR LIBRARY and adjusted sidebar top padding at both breakpoints.
- Tab wrappers own the complete selected/hover surface, including the always-visible close button. Tab semantics and keyboard behavior are unchanged.
- Terminal steady-state text and startup toolbar button are removed. An information popover contains full selectable paths only; shell termination uses `exit` at the prompt. Exit/failure exposes a keyboard-accessible restart button in the terminal area; transition/error messages and missing-vault guidance remain visible.
- JavaScript: 57 tests passed, including selected tab class/ARIA agreement, live terminal paths, Escape dismissal, startup failure and restart.
- Headless Chromium with actual xterm and mocked IPC checked light/dark themes at 1100px and 780px, popover containment, Escape/outside-click dismissal, focus restoration and shell-exit/restart. Native shell execution was not part of this UI check.
- macOS build and signature verification passed. Native WKWebView visual confirmation remains manual.
