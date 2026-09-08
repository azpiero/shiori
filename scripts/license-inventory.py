#!/usr/bin/env python3
"""Summarize a locked, target-filtered cargo metadata JSON without guessing licenses."""
import argparse
import collections
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('metadata', type=Path)
parser.add_argument('--output', type=Path, default=Path('docs/DEPENDENCIES.md'))
args = parser.parse_args()
metadata = json.loads(args.metadata.read_text())
packages = sorted((p for p in metadata['packages'] if p['id'] not in metadata['workspace_members']), key=lambda p: (p['name'], p['version']))
counts = collections.Counter(p['license'] or 'UNDECLARED' for p in packages)
lines = ['# Dependency license inventory', '',
 'Generated from locked Cargo metadata filtered for `aarch64-apple-darwin`. This includes build/proc-macro dependencies; it is not an assertion that every package is linked into the executable. Other targets need a separate inventory.', '',
 'Cargo.lock SHA-256: `' + hashlib.sha256(Path('src-tauri/Cargo.lock').read_bytes()).hexdigest() + '`.', '',
 '## Reproduce', '', '```sh',
 'cargo metadata --locked --format-version 1 --filter-platform aarch64-apple-darwin --features custom-protocol --manifest-path src-tauri/Cargo.toml > /tmp/shiori-metadata.json',
 'python3 scripts/license-inventory.py /tmp/shiori-metadata.json', '```', '',
 '## Distribution notes', '',
 '- The project license does not replace dependency licenses. Preserve vendored xterm.js and addon-fit MIT notices in `ui/vendor/` and include them with binary distributions.',
 '- A binary distribution needs third-party notices beyond `ui/vendor/README.md`: Rust dependencies also include MPL-2.0, Apache-2.0, BSD, Zlib, and Unicode terms. Preserve applicable license/copyright/NOTICE text. Keep each declared expression intact: `AND` requires both terms; do not silently treat it as `OR`.',
 '- For unchanged MPL components, provide recipients with their corresponding source location and MPL terms. The pinned crate downloads below provide the published source; modifications would also need corresponding source availability. See the [Mozilla FAQ, Q8–10](https://www.mozilla.org/en-US/MPL/2.0/FAQ/).',
 '- Follow [Apache 2.0 section 4](https://www.apache.org/licenses/LICENSE-2.0) for applicable notices and [MIT notice retention](https://opensource.org/license/mit). This metadata inventory records declarations and identifies missing notice files; it is not a completed binary-distribution notice bundle.',
 '- Before publishing a binary, collect and review the source notices for the packages flagged below, produce a versioned third-party notice bundle, and include that bundle in the app resources. A package lacking a standalone notice is not automatically unlicensed, nor does metadata alone supply all required attribution.', '',
 '## Declared licenses', '', '| Expression | Packages |', '| --- | ---: |']
lines += [f'| `{license}` | {n} |' for license, n in sorted(counts.items())]
lines += ['', '## Packages', '', '| Package | License declaration | Standalone notice in crate archive | Source |', '| --- | --- | --- | --- |']
missing = []
for p in packages:
    root = Path(p['manifest_path']).parent
    notices = sorted(f.relative_to(root).as_posix() for f in root.rglob('*') if f.is_file() and f.name.lower().startswith(('license', 'copying', 'notice', 'copyright')))
    if not notices:
        missing.append(f"{p['name']} {p['version']}")
    source = f"https://crates.io/api/v1/crates/{p['name']}/{p['version']}/download"
    lines.append(f"| `{p['name']} {p['version']}` | `{p['license'] or 'UNDECLARED'}` | {', '.join('`'+n+'`' for n in notices) or '**Review source attribution**'} | [crate]({source}) |")
lines += ['', '## Vendored frontend', '', '| Package | License | Included notice |', '| --- | --- | --- |',
 '| @xterm/xterm 5.5.0 | MIT | [xterm-LICENSE](../ui/vendor/xterm-LICENSE) |',
 '| @xterm/addon-fit 0.10.0 | MIT | [addon-fit-LICENSE](../ui/vendor/addon-fit-LICENSE) |', '',
 f'{len(packages)} Cargo packages inventoried; {len(missing)} have no standalone notice file in the local crate archive. Review these at the recorded upstream revision or obtain the matching source notices before binary publication.', '']
args.output.write_text('\n'.join(lines))
print(f'{len(packages)} packages; {len(missing)} source-notice reviews required; wrote {args.output}')
