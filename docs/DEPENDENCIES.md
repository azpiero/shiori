# Dependency license inventory

Generated from locked Cargo metadata filtered for `aarch64-apple-darwin`. This includes build/proc-macro dependencies; it is not an assertion that every package is linked into the executable. Other targets need a separate inventory.

Cargo.lock SHA-256: `1276fb8ac4047e7636bbcc1e7d9ab675f56fe56b1e169c9ea6dccf747ee672c2`.

## Reproduce

```sh
cargo metadata --locked --format-version 1 --filter-platform aarch64-apple-darwin --features custom-protocol --manifest-path src-tauri/Cargo.toml > /tmp/shiori-metadata.json
python3 scripts/license-inventory.py /tmp/shiori-metadata.json
```

## Distribution notes

- The project license does not replace dependency licenses. Preserve vendored xterm.js and addon-fit MIT notices in `ui/vendor/` and include them with binary distributions.
- A binary distribution needs third-party notices beyond `ui/vendor/README.md`: Rust dependencies also include MPL-2.0, Apache-2.0, BSD, Zlib, and Unicode terms. Preserve applicable license/copyright/NOTICE text. Keep each declared expression intact: `AND` requires both terms; do not silently treat it as `OR`.
- For unchanged MPL components, provide recipients with their corresponding source location and MPL terms. The pinned crate downloads below provide the published source; modifications would also need corresponding source availability. See the [Mozilla FAQ, Q8–10](https://www.mozilla.org/en-US/MPL/2.0/FAQ/).
- Follow [Apache 2.0 section 4](https://www.apache.org/licenses/LICENSE-2.0) for applicable notices and [MIT notice retention](https://opensource.org/license/mit). This metadata inventory records declarations and identifies missing notice files; it is not a completed binary-distribution notice bundle.
- Before publishing a binary, collect and review the source notices for the packages flagged below, produce a versioned third-party notice bundle, and include that bundle in the app resources. A package lacking a standalone notice is not automatically unlicensed, nor does metadata alone supply all required attribution.

## Declared licenses

| Expression | Packages |
| --- | ---: |
| `(MIT OR Apache-2.0) AND Unicode-3.0` | 1 |
| `0BSD OR MIT OR Apache-2.0` | 1 |
| `Apache-2.0` | 1 |
| `Apache-2.0 / MIT` | 1 |
| `Apache-2.0 AND MIT` | 1 |
| `Apache-2.0 OR MIT` | 30 |
| `Apache-2.0/MIT` | 1 |
| `BSD-2-Clause OR Apache-2.0` | 1 |
| `BSD-2-Clause OR Apache-2.0 OR MIT` | 1 |
| `BSD-3-Clause` | 2 |
| `BSD-3-Clause AND MIT` | 1 |
| `BSD-3-Clause/MIT` | 1 |
| `CC0-1.0 OR MIT-0 OR Apache-2.0` | 1 |
| `MIT` | 58 |
| `MIT / Apache-2.0` | 2 |
| `MIT OR Apache-2.0` | 136 |
| `MIT OR Apache-2.0 OR Zlib` | 2 |
| `MIT OR Zlib OR Apache-2.0` | 2 |
| `MIT/Apache-2.0` | 21 |
| `MPL-2.0` | 8 |
| `Unicode-3.0` | 18 |
| `Unlicense OR MIT` | 5 |
| `Unlicense/MIT` | 2 |
| `Zlib` | 2 |
| `Zlib OR Apache-2.0 OR MIT` | 8 |

## Packages

| Package | License declaration | Standalone notice in crate archive | Source |
| --- | --- | --- | --- |
| `adler2 2.0.1` | `0BSD OR MIT OR Apache-2.0` | `LICENSE-0BSD`, `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/adler2/2.0.1/download) |
| `aho-corasick 1.1.5` | `Unlicense OR MIT` | `COPYING`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/aho-corasick/1.1.5/download) |
| `alloc-no-stdlib 2.0.4` | `BSD-3-Clause` | `LICENSE` | [crate](https://crates.io/api/v1/crates/alloc-no-stdlib/2.0.4/download) |
| `alloc-stdlib 0.2.4` | `BSD-3-Clause` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/alloc-stdlib/0.2.4/download) |
| `anyhow 1.0.104` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/anyhow/1.0.104/download) |
| `autocfg 1.5.1` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/autocfg/1.5.1/download) |
| `base64 0.21.7` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/base64/0.21.7/download) |
| `base64 0.22.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/base64/0.22.1/download) |
| `base64 0.23.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/base64/0.23.1/download) |
| `bit-set 0.8.0` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/bit-set/0.8.0/download) |
| `bit-vec 0.8.0` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/bit-vec/0.8.0/download) |
| `bitflags 1.3.2` | `MIT/Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/bitflags/1.3.2/download) |
| `bitflags 2.13.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/bitflags/2.13.1/download) |
| `block-buffer 0.10.4` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/block-buffer/0.10.4/download) |
| `block2 0.6.2` | `MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/block2/0.6.2/download) |
| `brotli 8.0.4` | `BSD-3-Clause AND MIT` | `LICENSE.BSD-3-Clause`, `LICENSE.MIT` | [crate](https://crates.io/api/v1/crates/brotli/8.0.4/download) |
| `brotli-decompressor 5.0.3` | `BSD-3-Clause/MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/brotli-decompressor/5.0.3/download) |
| `bs58 0.5.1` | `MIT/Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/bs58/0.5.1/download) |
| `byteorder 1.5.0` | `Unlicense OR MIT` | `COPYING`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/byteorder/1.5.0/download) |
| `bytes 1.12.1` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/bytes/1.12.1/download) |
| `camino 1.2.5` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/camino/1.2.5/download) |
| `cargo-platform 0.1.9` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/cargo-platform/0.1.9/download) |
| `cargo_metadata 0.19.2` | `MIT` | `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/cargo_metadata/0.19.2/download) |
| `cargo_toml 0.22.3` | `Apache-2.0 OR MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/cargo_toml/0.22.3/download) |
| `cc 1.4.5` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/cc/1.4.5/download) |
| `cfb 0.7.3` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/cfb/0.7.3/download) |
| `cfg-if 1.0.4` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/cfg-if/1.0.4/download) |
| `cfg_aliases 0.1.1` | `MIT` | `LICENSE`, `NOTICES.md` | [crate](https://crates.io/api/v1/crates/cfg_aliases/0.1.1/download) |
| `chrono 0.4.45` | `MIT OR Apache-2.0` | `LICENSE.txt` | [crate](https://crates.io/api/v1/crates/chrono/0.4.45/download) |
| `convert_case 0.4.0` | `MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/convert_case/0.4.0/download) |
| `cookie 0.18.2` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/cookie/0.18.2/download) |
| `core-foundation 0.10.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/core-foundation/0.10.1/download) |
| `core-foundation-sys 0.8.7` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/core-foundation-sys/0.8.7/download) |
| `core-graphics 0.25.0` | `MIT OR Apache-2.0` | `COPYRIGHT`, `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/core-graphics/0.25.0/download) |
| `core-graphics-types 0.2.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/core-graphics-types/0.2.0/download) |
| `cpufeatures 0.2.17` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/cpufeatures/0.2.17/download) |
| `crc32fast 1.5.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/crc32fast/1.5.1/download) |
| `crossbeam-channel 0.5.17` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT`, `LICENSE-THIRD-PARTY` | [crate](https://crates.io/api/v1/crates/crossbeam-channel/0.5.17/download) |
| `crossbeam-utils 0.8.23` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/crossbeam-utils/0.8.23/download) |
| `crypto-common 0.1.7` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/crypto-common/0.1.7/download) |
| `cssparser 0.27.2` | `MPL-2.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/cssparser/0.27.2/download) |
| `cssparser 0.36.0` | `MPL-2.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/cssparser/0.36.0/download) |
| `cssparser-macros 0.6.1` | `MPL-2.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/cssparser-macros/0.6.1/download) |
| `ctor 0.8.0` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/ctor/0.8.0/download) |
| `ctor-proc-macro 0.0.7` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/ctor-proc-macro/0.0.7/download) |
| `darling 0.23.0` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/darling/0.23.0/download) |
| `darling_core 0.23.0` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/darling_core/0.23.0/download) |
| `darling_macro 0.23.0` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/darling_macro/0.23.0/download) |
| `defmt 1.1.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/defmt/1.1.1/download) |
| `defmt-macros 1.1.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/defmt-macros/1.1.1/download) |
| `defmt-parser 1.0.0` | `MIT OR Apache-2.0` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/defmt-parser/1.0.0/download) |
| `deranged 0.5.8` | `MIT OR Apache-2.0` | `LICENSE-Apache`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/deranged/0.5.8/download) |
| `derive_more 0.99.20` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/derive_more/0.99.20/download) |
| `derive_more 2.1.1` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/derive_more/2.1.1/download) |
| `derive_more-impl 2.1.1` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/derive_more-impl/2.1.1/download) |
| `digest 0.10.7` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/digest/0.10.7/download) |
| `dirs 6.0.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/dirs/6.0.0/download) |
| `dirs-sys 0.5.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/dirs-sys/0.5.0/download) |
| `dispatch2 0.3.1` | `Zlib OR Apache-2.0 OR MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/dispatch2/0.3.1/download) |
| `displaydoc 0.2.7` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/displaydoc/0.2.7/download) |
| `dom_query 0.27.0` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/dom_query/0.27.0/download) |
| `downcast-rs 1.2.1` | `MIT/Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/downcast-rs/1.2.1/download) |
| `dpi 0.1.2` | `Apache-2.0 AND MIT` | `LICENSE`, `LICENSE-LIBM-MIT` | [crate](https://crates.io/api/v1/crates/dpi/0.1.2/download) |
| `dtoa 1.0.11` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/dtoa/1.0.11/download) |
| `dtoa-short 0.3.5` | `MPL-2.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/dtoa-short/0.3.5/download) |
| `dtor 0.3.0` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/dtor/0.3.0/download) |
| `dtor-proc-macro 0.0.6` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/dtor-proc-macro/0.0.6/download) |
| `dunce 1.0.5` | `CC0-1.0 OR MIT-0 OR Apache-2.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/dunce/1.0.5/download) |
| `dyn-clone 1.0.20` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/dyn-clone/1.0.20/download) |
| `embed-resource 3.0.11` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/embed-resource/3.0.11/download) |
| `embed_plist 1.2.2` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/embed_plist/1.2.2/download) |
| `equivalent 1.0.2` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/equivalent/1.0.2/download) |
| `erased-serde 0.4.10` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/erased-serde/0.4.10/download) |
| `fastrand 2.5.0` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/fastrand/2.5.0/download) |
| `fdeflate 0.3.7` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/fdeflate/0.3.7/download) |
| `filedescriptor 0.8.3` | `MIT` | `LICENSE.md` | [crate](https://crates.io/api/v1/crates/filedescriptor/0.8.3/download) |
| `find-msvc-tools 0.1.12` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/find-msvc-tools/0.1.12/download) |
| `flate2 1.1.10` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/flate2/1.1.10/download) |
| `fnv 1.0.7` | `Apache-2.0 / MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/fnv/1.0.7/download) |
| `foldhash 0.2.0` | `Zlib` | `LICENSE` | [crate](https://crates.io/api/v1/crates/foldhash/0.2.0/download) |
| `foreign-types 0.5.0` | `MIT/Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/foreign-types/0.5.0/download) |
| `foreign-types-macros 0.2.4` | `MIT/Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/foreign-types-macros/0.2.4/download) |
| `foreign-types-shared 0.3.1` | `MIT/Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/foreign-types-shared/0.3.1/download) |
| `form_urlencoded 1.2.2` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/form_urlencoded/1.2.2/download) |
| `futf 0.1.5` | `MIT / Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/futf/0.1.5/download) |
| `fxhash 0.2.1` | `Apache-2.0/MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/fxhash/0.2.1/download) |
| `generic-array 0.14.7` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/generic-array/0.14.7/download) |
| `getrandom 0.1.16` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/getrandom/0.1.16/download) |
| `getrandom 0.3.4` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/getrandom/0.3.4/download) |
| `getrandom 0.4.3` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/getrandom/0.4.3/download) |
| `glob 0.3.4` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/glob/0.3.4/download) |
| `hashbrown 0.12.3` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/hashbrown/0.12.3/download) |
| `hashbrown 0.17.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/hashbrown/0.17.1/download) |
| `heck 0.5.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/heck/0.5.0/download) |
| `hex 0.4.3` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/hex/0.4.3/download) |
| `html5ever 0.25.2` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/html5ever/0.25.2/download) |
| `html5ever 0.38.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/html5ever/0.38.0/download) |
| `html5gum 0.8.4` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/html5gum/0.8.4/download) |
| `http 1.5.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/http/1.5.0/download) |
| `iana-time-zone 0.1.65` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/iana-time-zone/0.1.65/download) |
| `ico 0.5.0` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/ico/0.5.0/download) |
| `icu_collections 2.3.0` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/icu_collections/2.3.0/download) |
| `icu_locale_core 2.3.0` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/icu_locale_core/2.3.0/download) |
| `icu_normalizer 2.3.0` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/icu_normalizer/2.3.0/download) |
| `icu_normalizer_data 2.3.0` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/icu_normalizer_data/2.3.0/download) |
| `icu_properties 2.3.0` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/icu_properties/2.3.0/download) |
| `icu_properties_data 2.3.0` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/icu_properties_data/2.3.0/download) |
| `icu_provider 2.3.1` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/icu_provider/2.3.1/download) |
| `ident_case 1.0.1` | `MIT/Apache-2.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/ident_case/1.0.1/download) |
| `idna 1.1.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/idna/1.1.0/download) |
| `idna_adapter 1.2.2` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/idna_adapter/1.2.2/download) |
| `indexmap 1.9.3` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/indexmap/1.9.3/download) |
| `indexmap 2.14.2` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/indexmap/2.14.2/download) |
| `infer 0.19.0` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/infer/0.19.0/download) |
| `itoa 0.4.8` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/itoa/0.4.8/download) |
| `itoa 1.0.18` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/itoa/1.0.18/download) |
| `jetscii 0.5.3` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/jetscii/0.5.3/download) |
| `jiff 0.2.35` | `Unlicense OR MIT` | `COPYING`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/jiff/0.2.35/download) |
| `jiff-core 0.1.0` | `Unlicense OR MIT` | `COPYING`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/jiff-core/0.1.0/download) |
| `json-patch 3.0.1` | `MIT/Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/json-patch/3.0.1/download) |
| `jsonptr 0.6.3` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/jsonptr/0.6.3/download) |
| `keyboard-types 0.7.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/keyboard-types/0.7.0/download) |
| `kuchiki 0.8.1` | `MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/kuchiki/0.8.1/download) |
| `libc 0.2.189` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/libc/0.2.189/download) |
| `litemap 0.8.3` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/litemap/0.8.3/download) |
| `lock_api 0.4.14` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/lock_api/0.4.14/download) |
| `log 0.4.34` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/log/0.4.34/download) |
| `mac 0.1.1` | `MIT/Apache-2.0` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/mac/0.1.1/download) |
| `markup5ever 0.10.1` | `MIT / Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/markup5ever/0.10.1/download) |
| `markup5ever 0.38.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/markup5ever/0.38.0/download) |
| `matches 0.1.10` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/matches/0.1.10/download) |
| `memchr 2.8.3` | `Unlicense OR MIT` | `COPYING`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/memchr/2.8.3/download) |
| `mime 0.3.17` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/mime/0.3.17/download) |
| `mime_guess 2.0.5` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/mime_guess/2.0.5/download) |
| `miniz_oxide 0.8.9` | `MIT OR Zlib OR Apache-2.0` | `LICENSE`, `LICENSE-APACHE.md`, `LICENSE-MIT.md`, `LICENSE-ZLIB.md` | [crate](https://crates.io/api/v1/crates/miniz_oxide/0.8.9/download) |
| `miniz_oxide 0.9.1` | `MIT OR Zlib OR Apache-2.0` | `LICENSE`, `LICENSE-APACHE.md`, `LICENSE-MIT.md`, `LICENSE-ZLIB.md` | [crate](https://crates.io/api/v1/crates/miniz_oxide/0.9.1/download) |
| `mio 1.2.3` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/mio/1.2.3/download) |
| `muda 0.19.3` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT`, `LICENSE.spdx` | [crate](https://crates.io/api/v1/crates/muda/0.19.3/download) |
| `new_debug_unreachable 1.0.6` | `MIT` | `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/new_debug_unreachable/1.0.6/download) |
| `nix 0.28.0` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/nix/0.28.0/download) |
| `nodrop 0.1.14` | `MIT/Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/nodrop/0.1.14/download) |
| `num-conv 0.2.2` | `MIT OR Apache-2.0` | `LICENSE-Apache`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/num-conv/0.2.2/download) |
| `num-traits 0.2.19` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/num-traits/0.2.19/download) |
| `objc2 0.6.4` | `MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/objc2/0.6.4/download) |
| `objc2-app-kit 0.3.2` | `Zlib OR Apache-2.0 OR MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/objc2-app-kit/0.3.2/download) |
| `objc2-core-foundation 0.3.2` | `Zlib OR Apache-2.0 OR MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/objc2-core-foundation/0.3.2/download) |
| `objc2-core-graphics 0.3.2` | `Zlib OR Apache-2.0 OR MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/objc2-core-graphics/0.3.2/download) |
| `objc2-encode 4.1.0` | `MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/objc2-encode/4.1.0/download) |
| `objc2-exception-helper 0.1.1` | `Zlib OR Apache-2.0 OR MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/objc2-exception-helper/0.1.1/download) |
| `objc2-foundation 0.3.2` | `MIT` | `src/copying.rs`, `src/tests/copying.rs` | [crate](https://crates.io/api/v1/crates/objc2-foundation/0.3.2/download) |
| `objc2-io-surface 0.3.2` | `Zlib OR Apache-2.0 OR MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/objc2-io-surface/0.3.2/download) |
| `objc2-web-kit 0.3.2` | `Zlib OR Apache-2.0 OR MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/objc2-web-kit/0.3.2/download) |
| `once_cell 1.21.4` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/once_cell/1.21.4/download) |
| `option-ext 0.2.0` | `MPL-2.0` | `LICENSE.txt` | [crate](https://crates.io/api/v1/crates/option-ext/0.2.0/download) |
| `parking_lot 0.12.5` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/parking_lot/0.12.5/download) |
| `parking_lot_core 0.9.12` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/parking_lot_core/0.9.12/download) |
| `percent-encoding 2.3.2` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/percent-encoding/2.3.2/download) |
| `phf 0.13.1` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/phf/0.13.1/download) |
| `phf 0.8.0` | `MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/phf/0.8.0/download) |
| `phf_codegen 0.13.1` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/phf_codegen/0.13.1/download) |
| `phf_codegen 0.8.0` | `MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/phf_codegen/0.8.0/download) |
| `phf_generator 0.11.3` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/phf_generator/0.11.3/download) |
| `phf_generator 0.13.1` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/phf_generator/0.13.1/download) |
| `phf_generator 0.8.0` | `MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/phf_generator/0.8.0/download) |
| `phf_macros 0.13.1` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/phf_macros/0.13.1/download) |
| `phf_macros 0.8.0` | `MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/phf_macros/0.8.0/download) |
| `phf_shared 0.11.3` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/phf_shared/0.11.3/download) |
| `phf_shared 0.13.1` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/phf_shared/0.13.1/download) |
| `phf_shared 0.8.0` | `MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/phf_shared/0.8.0/download) |
| `pin-project-lite 0.2.17` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/pin-project-lite/0.2.17/download) |
| `plist 1.10.1` | `MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/plist/1.10.1/download) |
| `png 0.17.16` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/png/0.17.16/download) |
| `png 0.18.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/png/0.18.1/download) |
| `portable-pty 0.9.0` | `MIT` | `LICENSE.md` | [crate](https://crates.io/api/v1/crates/portable-pty/0.9.0/download) |
| `potential_utf 0.1.6` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/potential_utf/0.1.6/download) |
| `powerfmt 0.2.0` | `MIT OR Apache-2.0` | `LICENSE-Apache`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/powerfmt/0.2.0/download) |
| `ppv-lite86 0.2.21` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/ppv-lite86/0.2.21/download) |
| `precomputed-hash 0.1.1` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/precomputed-hash/0.1.1/download) |
| `proc-macro-hack 0.5.20+deprecated` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/proc-macro-hack/0.5.20+deprecated/download) |
| `proc-macro2 1.0.107` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/proc-macro2/1.0.107/download) |
| `quick-xml 0.42.0` | `MIT` | `LICENSE-MIT.md` | [crate](https://crates.io/api/v1/crates/quick-xml/0.42.0/download) |
| `quote 1.0.47` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/quote/1.0.47/download) |
| `rand 0.7.3` | `MIT OR Apache-2.0` | `COPYRIGHT`, `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/rand/0.7.3/download) |
| `rand 0.8.8` | `MIT OR Apache-2.0` | `COPYRIGHT`, `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/rand/0.8.8/download) |
| `rand_chacha 0.2.2` | `MIT OR Apache-2.0` | `COPYRIGHT`, `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/rand_chacha/0.2.2/download) |
| `rand_core 0.5.1` | `MIT OR Apache-2.0` | `COPYRIGHT`, `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/rand_core/0.5.1/download) |
| `rand_core 0.6.4` | `MIT OR Apache-2.0` | `COPYRIGHT`, `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/rand_core/0.6.4/download) |
| `rand_pcg 0.2.1` | `MIT OR Apache-2.0` | `COPYRIGHT`, `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/rand_pcg/0.2.1/download) |
| `raw-window-handle 0.6.2` | `MIT OR Apache-2.0 OR Zlib` | `LICENSE-APACHE.md`, `LICENSE-MIT.md`, `LICENSE-ZLIB.md` | [crate](https://crates.io/api/v1/crates/raw-window-handle/0.6.2/download) |
| `ref-cast 1.0.27` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/ref-cast/1.0.27/download) |
| `ref-cast-impl 1.0.27` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/ref-cast-impl/1.0.27/download) |
| `regex 1.13.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/regex/1.13.1/download) |
| `regex-automata 0.4.18` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/regex-automata/0.4.18/download) |
| `regex-syntax 0.8.11` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT`, `src/unicode_tables/LICENSE-UNICODE` | [crate](https://crates.io/api/v1/crates/regex-syntax/0.8.11/download) |
| `rfd 0.16.0` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/rfd/0.16.0/download) |
| `rustc-hash 2.1.3` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/rustc-hash/2.1.3/download) |
| `rustc_version 0.4.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/rustc_version/0.4.1/download) |
| `same-file 1.0.6` | `Unlicense/MIT` | `COPYING`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/same-file/1.0.6/download) |
| `schemars 0.8.22` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/schemars/0.8.22/download) |
| `schemars 0.9.0` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/schemars/0.9.0/download) |
| `schemars 1.2.2` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/schemars/1.2.2/download) |
| `schemars_derive 0.8.22` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/schemars_derive/0.8.22/download) |
| `scopeguard 1.2.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/scopeguard/1.2.0/download) |
| `selectors 0.22.0` | `MPL-2.0` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/selectors/0.22.0/download) |
| `selectors 0.36.1` | `MPL-2.0` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/selectors/0.36.1/download) |
| `semver 1.0.28` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/semver/1.0.28/download) |
| `serde 1.0.229` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/serde/1.0.229/download) |
| `serde-untagged 0.1.9` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/serde-untagged/0.1.9/download) |
| `serde_core 1.0.229` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/serde_core/1.0.229/download) |
| `serde_derive 1.0.229` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/serde_derive/1.0.229/download) |
| `serde_derive_internals 0.29.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/serde_derive_internals/0.29.1/download) |
| `serde_json 1.0.151` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/serde_json/1.0.151/download) |
| `serde_repr 0.1.21` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/serde_repr/0.1.21/download) |
| `serde_spanned 1.1.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/serde_spanned/1.1.1/download) |
| `serde_with 3.22.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/serde_with/3.22.0/download) |
| `serde_with_macros 3.22.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/serde_with_macros/3.22.0/download) |
| `serial2 0.2.38` | `BSD-2-Clause OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-BSD` | [crate](https://crates.io/api/v1/crates/serial2/0.2.38/download) |
| `serialize-to-javascript 0.1.2` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/serialize-to-javascript/0.1.2/download) |
| `serialize-to-javascript-impl 0.1.2` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/serialize-to-javascript-impl/0.1.2/download) |
| `servo_arc 0.1.1` | `MIT/Apache-2.0` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/servo_arc/0.1.1/download) |
| `servo_arc 0.4.3` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/servo_arc/0.4.3/download) |
| `sha2 0.10.9` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/sha2/0.10.9/download) |
| `shell-words 1.1.1` | `MIT/Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/shell-words/1.1.1/download) |
| `shlex 2.0.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/shlex/2.0.1/download) |
| `simd-adler32 0.3.10` | `MIT` | `LICENSE.md` | [crate](https://crates.io/api/v1/crates/simd-adler32/0.3.10/download) |
| `siphasher 0.3.11` | `MIT/Apache-2.0` | `COPYING` | [crate](https://crates.io/api/v1/crates/siphasher/0.3.11/download) |
| `siphasher 1.0.3` | `MIT/Apache-2.0` | `COPYING` | [crate](https://crates.io/api/v1/crates/siphasher/1.0.3/download) |
| `smallvec 1.16.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/smallvec/1.16.0/download) |
| `socket2 0.6.5` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/socket2/0.6.5/download) |
| `stable_deref_trait 1.2.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/stable_deref_trait/1.2.1/download) |
| `string_cache 0.8.9` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/string_cache/0.8.9/download) |
| `string_cache 0.9.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/string_cache/0.9.0/download) |
| `string_cache_codegen 0.5.4` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/string_cache_codegen/0.5.4/download) |
| `string_cache_codegen 0.6.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/string_cache_codegen/0.6.1/download) |
| `strsim 0.11.1` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/strsim/0.11.1/download) |
| `swift-rs 1.0.8` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/swift-rs/1.0.8/download) |
| `syn 1.0.109` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/syn/1.0.109/download) |
| `syn 2.0.119` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/syn/2.0.119/download) |
| `syn 3.0.5` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/syn/3.0.5/download) |
| `synstructure 0.13.2` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/synstructure/0.13.2/download) |
| `tao 0.35.3` | `Apache-2.0` | `LICENSE`, `LICENSE.spdx` | [crate](https://crates.io/api/v1/crates/tao/0.35.3/download) |
| `tauri 2.11.5` | `Apache-2.0 OR MIT` | `LICENSE_APACHE-2.0`, `LICENSE_MIT` | [crate](https://crates.io/api/v1/crates/tauri/2.11.5/download) |
| `tauri-build 2.6.3` | `Apache-2.0 OR MIT` | `LICENSE_APACHE-2.0`, `LICENSE_MIT` | [crate](https://crates.io/api/v1/crates/tauri-build/2.6.3/download) |
| `tauri-codegen 2.6.3` | `Apache-2.0 OR MIT` | `LICENSE_APACHE-2.0`, `LICENSE_MIT` | [crate](https://crates.io/api/v1/crates/tauri-codegen/2.6.3/download) |
| `tauri-macros 2.6.3` | `Apache-2.0 OR MIT` | `LICENSE_APACHE-2.0`, `LICENSE_MIT` | [crate](https://crates.io/api/v1/crates/tauri-macros/2.6.3/download) |
| `tauri-plugin 2.6.3` | `Apache-2.0 OR MIT` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/tauri-plugin/2.6.3/download) |
| `tauri-plugin-dialog 2.7.3` | `Apache-2.0 OR MIT` | `LICENSE.spdx`, `LICENSE_APACHE-2.0`, `LICENSE_MIT` | [crate](https://crates.io/api/v1/crates/tauri-plugin-dialog/2.7.3/download) |
| `tauri-plugin-fs 2.5.2` | `Apache-2.0 OR MIT` | `LICENSE.spdx`, `LICENSE_APACHE-2.0`, `LICENSE_MIT` | [crate](https://crates.io/api/v1/crates/tauri-plugin-fs/2.5.2/download) |
| `tauri-runtime 2.11.3` | `Apache-2.0 OR MIT` | `LICENSE_APACHE-2.0`, `LICENSE_MIT` | [crate](https://crates.io/api/v1/crates/tauri-runtime/2.11.3/download) |
| `tauri-runtime-wry 2.11.4` | `Apache-2.0 OR MIT` | `LICENSE_APACHE-2.0`, `LICENSE_MIT` | [crate](https://crates.io/api/v1/crates/tauri-runtime-wry/2.11.4/download) |
| `tauri-utils 2.9.3` | `Apache-2.0 OR MIT` | `LICENSE_APACHE-2.0`, `LICENSE_MIT` | [crate](https://crates.io/api/v1/crates/tauri-utils/2.9.3/download) |
| `tauri-winres 0.3.6` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/tauri-winres/0.3.6/download) |
| `tendril 0.4.3` | `MIT/Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/tendril/0.4.3/download) |
| `tendril 0.5.1` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/tendril/0.5.1/download) |
| `thin-slice 0.1.1` | `MPL-2.0` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/thin-slice/0.1.1/download) |
| `thiserror 1.0.69` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/thiserror/1.0.69/download) |
| `thiserror 2.0.20` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/thiserror/2.0.20/download) |
| `thiserror-impl 1.0.69` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/thiserror-impl/1.0.69/download) |
| `thiserror-impl 2.0.20` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/thiserror-impl/2.0.20/download) |
| `time 0.3.55` | `MIT OR Apache-2.0` | `LICENSE-Apache`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/time/0.3.55/download) |
| `time-core 0.1.9` | `MIT OR Apache-2.0` | `LICENSE-Apache`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/time-core/0.1.9/download) |
| `time-macros 0.2.32` | `MIT OR Apache-2.0` | `LICENSE-Apache`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/time-macros/0.2.32/download) |
| `tinystr 0.8.4` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/tinystr/0.8.4/download) |
| `tinyvec 1.13.2` | `Zlib OR Apache-2.0 OR MIT` | `LICENSE-APACHE.md`, `LICENSE-MIT.md`, `LICENSE-ZLIB.md` | [crate](https://crates.io/api/v1/crates/tinyvec/1.13.2/download) |
| `tinyvec_macros 0.1.1` | `MIT OR Apache-2.0 OR Zlib` | `LICENSE-APACHE.md`, `LICENSE-MIT.md`, `LICENSE-ZLIB.md` | [crate](https://crates.io/api/v1/crates/tinyvec_macros/0.1.1/download) |
| `tokio 1.53.1` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/tokio/1.53.1/download) |
| `toml 0.9.12+spec-1.1.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/toml/0.9.12+spec-1.1.0/download) |
| `toml 1.1.5+spec-1.1.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/toml/1.1.5+spec-1.1.0/download) |
| `toml_datetime 0.7.5+spec-1.1.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/toml_datetime/0.7.5+spec-1.1.0/download) |
| `toml_datetime 1.1.1+spec-1.1.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/toml_datetime/1.1.1+spec-1.1.0/download) |
| `toml_parser 1.1.3+spec-1.1.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/toml_parser/1.1.3+spec-1.1.0/download) |
| `toml_writer 1.1.2+spec-1.1.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/toml_writer/1.1.2+spec-1.1.0/download) |
| `tray-icon 0.24.2` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT`, `LICENSE.spdx` | [crate](https://crates.io/api/v1/crates/tray-icon/0.24.2/download) |
| `typeid 1.0.3` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/typeid/1.0.3/download) |
| `typenum 1.20.1` | `MIT OR Apache-2.0` | `LICENSE`, `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/typenum/1.20.1/download) |
| `unic-char-property 0.9.0` | `MIT/Apache-2.0` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/unic-char-property/0.9.0/download) |
| `unic-char-range 0.9.0` | `MIT/Apache-2.0` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/unic-char-range/0.9.0/download) |
| `unic-common 0.9.0` | `MIT/Apache-2.0` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/unic-common/0.9.0/download) |
| `unic-ucd-ident 0.9.0` | `MIT/Apache-2.0` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/unic-ucd-ident/0.9.0/download) |
| `unic-ucd-version 0.9.0` | `MIT/Apache-2.0` | **Review source attribution** | [crate](https://crates.io/api/v1/crates/unic-ucd-version/0.9.0/download) |
| `unicase 2.9.0` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/unicase/2.9.0/download) |
| `unicode-ident 1.0.24` | `(MIT OR Apache-2.0) AND Unicode-3.0` | `LICENSE-APACHE`, `LICENSE-MIT`, `LICENSE-UNICODE` | [crate](https://crates.io/api/v1/crates/unicode-ident/1.0.24/download) |
| `unicode-normalization 0.1.25` | `MIT OR Apache-2.0` | `COPYRIGHT`, `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/unicode-normalization/0.1.25/download) |
| `unicode-segmentation 1.13.3` | `MIT OR Apache-2.0` | `COPYRIGHT`, `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/unicode-segmentation/1.13.3/download) |
| `url 2.5.8` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/url/2.5.8/download) |
| `urlpattern 0.3.0` | `MIT` | `LICENSE` | [crate](https://crates.io/api/v1/crates/urlpattern/0.3.0/download) |
| `utf-8 0.7.6` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/utf-8/0.7.6/download) |
| `utf8_iter 1.0.4` | `Apache-2.0 OR MIT` | `COPYRIGHT`, `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/utf8_iter/1.0.4/download) |
| `uuid 1.26.0` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/uuid/1.26.0/download) |
| `version_check 0.9.5` | `MIT/Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/version_check/0.9.5/download) |
| `walkdir 2.5.0` | `Unlicense/MIT` | `COPYING`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/walkdir/2.5.0/download) |
| `web_atoms 0.2.6` | `MIT OR Apache-2.0` | `LICENSE-APACHE`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/web_atoms/0.2.6/download) |
| `window-vibrancy 0.6.0` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT`, `LICENSE.spdx` | [crate](https://crates.io/api/v1/crates/window-vibrancy/0.6.0/download) |
| `winnow 0.7.15` | `MIT` | `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/winnow/0.7.15/download) |
| `winnow 1.0.4` | `MIT` | `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/winnow/1.0.4/download) |
| `writeable 0.6.4` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/writeable/0.6.4/download) |
| `wry 0.55.1` | `Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-MIT`, `LICENSE.spdx` | [crate](https://crates.io/api/v1/crates/wry/0.55.1/download) |
| `yoke 0.8.3` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/yoke/0.8.3/download) |
| `yoke-derive 0.8.2` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/yoke-derive/0.8.2/download) |
| `zerocopy 0.8.56` | `BSD-2-Clause OR Apache-2.0 OR MIT` | `LICENSE-APACHE`, `LICENSE-BSD`, `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/zerocopy/0.8.56/download) |
| `zerofrom 0.1.8` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/zerofrom/0.1.8/download) |
| `zerofrom-derive 0.1.7` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/zerofrom-derive/0.1.7/download) |
| `zerotrie 0.2.5` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/zerotrie/0.2.5/download) |
| `zerovec 0.11.8` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/zerovec/0.11.8/download) |
| `zerovec-derive 0.11.6` | `Unicode-3.0` | `LICENSE` | [crate](https://crates.io/api/v1/crates/zerovec-derive/0.11.6/download) |
| `zlib-rs 0.6.7` | `Zlib` | `LICENSE` | [crate](https://crates.io/api/v1/crates/zlib-rs/0.6.7/download) |
| `zmij 1.0.23` | `MIT` | `LICENSE-MIT` | [crate](https://crates.io/api/v1/crates/zmij/1.0.23/download) |

## Vendored frontend

| Package | License | Included notice |
| --- | --- | --- |
| @xterm/xterm 5.5.0 | MIT | [xterm-LICENSE](../ui/vendor/xterm-LICENSE) |
| @xterm/addon-fit 0.10.0 | MIT | [addon-fit-LICENSE](../ui/vendor/addon-fit-LICENSE) |

307 Cargo packages inventoried; 32 have no standalone notice file in the local crate archive. Review these at the recorded upstream revision or obtain the matching source notices before binary publication.
