# Vendored terminal libraries

- `@xterm/xterm` 5.5.0: `lib/xterm.js`, `css/xterm.css`, MIT license in `xterm-LICENSE`.
- `@xterm/addon-fit` 0.10.0: `lib/addon-fit.js`, MIT license in `addon-fit-LICENSE`.

Downloaded from the npm registry version endpoints and checked against their published `dist.integrity` hashes. Only the runtime files and license notices are included; npm install scripts were not run. These files load locally under the existing app CSP; no CDN or bundler is required.

Upstream: https://github.com/xtermjs/xterm.js

To update, retrieve the chosen versions from the npm registry, verify archive integrity, replace the corresponding runtime files and licenses, update this inventory, and test PTY input, Unicode, resize, and shell/TUI rendering.
