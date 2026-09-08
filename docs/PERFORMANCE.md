# shiori：100〜10,000ノートの性能計測

実施日：2026-09-08

## 結果

今回の合成データでは、SQLiteなしの単純な文字列検索は10,000件でも処理部分が約19〜24msだった。一方、現在の開発ビルドの全件解析は約4.4秒、結果のJSON化は約1.4秒だった。

現時点では全文検索索引の導入より、変更分だけの再解析、一覧の表示件数制御、必要な情報だけの画面への転送を優先するのが妥当と考える。SQLiteは起動間で解析結果を保持する方法として引き続き候補になるが、この計測だけで必須とは判断しない。

| ノート数 | HTML合計 | 全件読み込み・解析 | JSON化 | 文字列検索 | 変更有無の走査 |
| --- | --- | --- | --- | --- | --- |
| 100 | 0.75 MB | 0.046 秒 | 0.015 秒 | 0.2〜0.3 ms | 0.5 ms |
| 1,000 | 7.48 MB | 0.445 秒 | 0.142 秒 | 1.8〜2.6 ms | 3.7 ms |
| 10,000 | 74.81 MB | 4.428 秒 | 1.438 秒 | 18.7〜23.8 ms | 37.4 ms |

全件読み込み・解析、JSON化、変更有無の走査は3回の中央値。文字列検索は各クエリ15回の中央値の範囲。Rustは現在のアプリと同じ開発ビルド、JavaScriptはNodeで計測した。

## 測定したもの／含まないもの

- Rust側ではアプリの実際の`scan()`、`revision()`、`display_html()`を呼び出した。
- JSON化は`serde_json::to_vec()`の時間で、Tauri IPC全体の時間ではない。
- JavaScript側は現在の`ui/app.js`からfilter／sortと一覧HTML文字列生成の式を取り出して実行した。
- NodeのV8とアプリのWebKit JavaScriptエンジンは異なる。JavaScriptの数値は処理規模を判断する参考であり、実画面の検索応答時間ではない。
- DOM生成、レイアウト、描画、イベント登録、IPC転送、キー入力、IME、スクロールは測定していない。
- アプリの120msの入力待ち時間も検索処理の表には含めていない。
- データ生成直後に測定しており、OSのファイルキャッシュが利用され得る。電源投入直後のコールド起動ではない。
- リリースビルドの性能は未測定。

## サンプルデータ

個人情報を含まない、独立した検証用Vaultを作成した。実ノート用`vault/`とアプリ同梱の7件のサンプルは変更していない。

| フォルダ | 内容 |
| --- | --- |
| `work/performance-vaults/vault-100` | 100件 |
| `work/performance-vaults/vault-1000` | 1,000件 |
| `work/performance-vaults/vault-10000` | 10,000件 |

作業ルートは`/Users/takeru/Documents/shiori`。

- HTMLはUTF-8。日本語8分野の文章、タイトル、2つのタグ、見出し、内部リンク、表を含む。
- 件数の90%は約5KB、9%は約20KB、1%は約100KB。平均約7.48KB／ノート。
- 各ノートには固定UUIDと一意の識別文字列を付けた。
- 共有CSSとSVGを含み、10件に1件がSVGを参照する。大量画像の描画負荷を模したデータではない。
- 同じ文章構造を繰り返す合成データであり、多様な実Vaultを完全に再現するものではない。
- データはGit管理対象外のworkに置き、生成スクリプトだけをソース管理する。

## 手元のアプリで確認する方法

1. shioriの「フォルダを開く」で、上記のvault-1000またはvault-10000を選ぶ。
2. 一覧が表示されるまでの待ち時間を確認する。
3. `検索`（約1/8の件数）、`知識`（全件）、`SHIORI-00042`（1件）、`存在しないキーワードZZZ`（0件）で検索する。
4. タグ「分野/検索」の絞り込み、一覧スクロール、ノート切替を確認する。
5. 検証用ノートを1件編集し、更新通知と「更新を反映」の待ち時間を確認する。

アプリの処理方式は今回変更していないので、既存のshiori.appをそのまま使える。

## 観察と次の判断

1. **単純検索自体は継続できる可能性が高い。** 今回の文字列処理では10,000件でも数十ms。FTS5を優先する根拠は得られていない。
2. **起動と再読み込みが先に重くなる。** 現行の更新ボタンは1件の編集でも`scan()`で全件解析する。変更分だけの更新が有効と推測する。今回、1件編集後のGUI操作自体を測定したわけではない。
3. **画面への転送量が多い。** 10,000件では本文を含むJSONが約69.6MBになる。SQLiteを導入しても、この転送方式を維持すればこの負担は残る。
4. **一覧の描画は別の課題。** 全件一致時に10,000個のボタンを生成する実装。文字列生成だけの測定ではDOM・描画の負担は分からない。ページ分割・仮想スクロール・表示上限などを実画面で検討する。
5. **定期走査は10,000件で約37ms。** 約2秒おきに実行する現行方式は、保存場所や資産数によって負担が変わる。これはSQLiteの有無とは別の問題。
6. **メモリの評価は未完了。** 生データにNodeプロセスのメモリ値を記録したが、測定用JSON文字列・中間配列・VMも含む。shioriアプリの常駐メモリ量として扱わない。

## 再現

ソースの`app/`を起点に、未作成の出力先へ実行する。

```sh
python3 scripts/generate-benchmark-vaults.py ../work/performance-vaults
SHIORI_BENCH_ROOT="$PWD/../work/performance-vaults" \
SHIORI_BENCH_OUTPUT="$PWD/../work/performance-results" \
cargo test --offline --locked --manifest-path src-tauri/Cargo.toml \
  --features custom-protocol measure_current_scanner -- --ignored --nocapture
node scripts/benchmark-search.mjs ../work/performance-results
```

RustがPATHにない場合、この作業環境の`../work/toolchain/cargo`・`../work/toolchain/rustup`をCARGO_HOME・RUSTUP_HOMEへ指定する必要がある。生成器は既存ディレクトリを上書きしない。

計測用Rustモジュールは`cfg(test)`＋ignored testで、通常のアプリには組み込まれない。

## HTML link graph — Issue #33 (2026-09-09)

Reproduce graph construction and the 60 layout iterations without a browser:

```sh
node scripts/benchmark-graph.cjs
```

For Canvas rendering, use a locally installed Playwright package and its Chromium browser:

```sh
node scripts/benchmark-graph.cjs /absolute/path/to/node_modules/playwright
```

The fixture links each note to its predecessor and its ten-note group root; reciprocal/duplicate edges are merged. All nodes remain present. Browser measurements use a 1000×700 CSS-pixel canvas, 60 layout iterations, 120 animated pan/zoom frames and 60 drawing calls. `layoutMs` is synchronous compute time; `settleMs` includes the animation-frame pacing used in the app. Frame p95 includes browser scheduling/rasterization; draw p95 measures Canvas command submission, not GPU completion.

Measured on Apple M4 Pro in headless Chromium (not native WKWebView); benchmark launcher: Node v24.11.1:

| Nodes | Edges | Build ms | Layout compute ms | Settle ms | Pan/zoom frame p95 ms | Draw submission p95 ms |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 500 | 899 | 2.7 | 35.9 | 965.4 | 17.5 | 1.2 |
| 2,000 | 3,599 | 8.6 | 116.4 | 981.1 | 17.5 | 2.9 |
| 10,000 | 17,999 | 37.5 | 616.0 | 3,291.6 | 39.6 | 11.3 |

Canvas removes per-node DOM overhead. Local spatial-grid repulsion bounds neighbor checks, and layout runs one iteration per frame so it can be paused/replaced. The measured 2,000-note case is near 60 fps; the 10,000-note case is closer to 25 fps at the p95 interval. This is not a guarantee for dense graphs or other devices. Worker layout/WebGL rendering remain candidates for #1; this implementation neither paginates nor silently truncates nodes/edges. Search/filter changes and vault refreshes rebuild the graph; resizing fits the existing layout.
