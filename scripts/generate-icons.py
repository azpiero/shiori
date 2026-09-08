#!/usr/bin/env python3
"""Package the approved PNG into macOS icon sizes (requires macOS sips)."""
from pathlib import Path
import struct
import subprocess
import tempfile

app = Path(__file__).resolve().parent.parent
source = app / 'docs/assets/shiori-icon-source.png'
def resize(size, destination):
    subprocess.run(['sips', '-z', str(size), str(size), str(source), '--out', str(destination)], check=True, stdout=subprocess.DEVNULL)

resize(1024, app / 'src-tauri/icons/icon.png')
resize(128, app / 'ui/assets/shiori-icon.png')
parts = []
with tempfile.TemporaryDirectory(prefix='shiori-icons-') as folder:
    for kind, size in [('icp4',16), ('icp5',32), ('icp6',64), ('ic07',128), ('ic08',256), ('ic09',512), ('ic10',1024)]:
        path = Path(folder) / f'{size}.png'
        resize(size, path)
        data = path.read_bytes()
        assert data.startswith(b'\x89PNG\r\n\x1a\n')
        parts.append(kind.encode('ascii') + struct.pack('>I',len(data)+8) + data)
body = b''.join(parts)
(app / 'src-tauri/icons/shiori.icns').write_bytes(b'icns' + struct.pack('>I',len(body)+8) + body)
