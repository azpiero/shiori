#!/bin/bash
set -euo pipefail
app_dir="$(cd "$(dirname "$0")/.." && pwd)"
workspace_dir="$(dirname "$app_dir")"
if ! command -v cargo >/dev/null 2>&1; then
  export CARGO_HOME="$workspace_dir/work/toolchain/cargo"
  export RUSTUP_HOME="$workspace_dir/work/toolchain/rustup"
  export PATH="$CARGO_HOME/bin:$PATH"
fi
export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$workspace_dir/work/target}"
cargo build --locked --manifest-path "$app_dir/src-tauri/Cargo.toml" --features custom-protocol
python3 - "$app_dir" "$workspace_dir" "$CARGO_TARGET_DIR" <<'PY'
from pathlib import Path
import sys, shutil, plistlib
app, workspace, target = map(Path, sys.argv[1:])
bundle = workspace/'outputs/shiori.app'
macos = bundle/'Contents/MacOS'
resources = bundle/'Contents/Resources'
macos.mkdir(parents=True, exist_ok=True)
resources.mkdir(parents=True, exist_ok=True)
shutil.copy2(app/'src-tauri/icons/shiori.icns', resources/'shiori.icns')
staged=macos/'shiori.new'
shutil.copy2(target/'debug/shiori', staged)
staged.replace(macos/'shiori')
# The outside-Vault symlink is a source fixture, not a bundle resource.
shutil.copytree(app/'sample-vault', resources/'sample-vault', dirs_exist_ok=True,
                ignore=shutil.ignore_patterns('outside.png', '.DS_Store'))
shutil.copytree(app/'skills', resources/'skills', dirs_exist_ok=True,
                ignore=shutil.ignore_patterns('.DS_Store'))
info = {
    'CFBundleExecutable':'shiori', 'CFBundleIdentifier':'dev.takeru.shiori',
    'CFBundleName':'shiori', 'CFBundleDisplayName':'shiori',
    'CFBundlePackageType':'APPL', 'CFBundleShortVersionString':'0.1.0',
    'CFBundleIconFile':'shiori.icns',
    'CFBundleVersion':'2', 'NSHighResolutionCapable':True,
    'LSMinimumSystemVersion':'12.0'
}
(bundle/'Contents/Info.plist').write_bytes(plistlib.dumps(info))
PY
codesign --force --deep --sign - "$workspace_dir/outputs/shiori.app"
codesign --verify --deep --strict "$workspace_dir/outputs/shiori.app"
printf '%s\n' "$workspace_dir/outputs/shiori.app"
