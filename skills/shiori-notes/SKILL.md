---
name: shiori-notes
description: Create or edit HTML notes for a shiori vault, including clear prose, compact shared styling, stable IDs, existing tags, relative links, and static diagrams. Use when authoring or restyling shiori notes.
---

# shiori notes

## Destination and scope

Use the user's specified vault, or the current vault identified by the workspace instructions and `SHIORI_VAULT`. If neither identifies it, ask. Never confuse the application source, bundled sample-vault, or terminal workspace with the user's vault.

Inspect related notes, existing metadata, and directory conventions first. Keep notes below `notes/`; use existing supporting directories, or `assets/` and `styles/` when none exist. Use NFC for new filenames without renaming existing files in bulk. Restrict changes to the requested notes and necessary assets. Do not write derived SQLite data. Commit and push require separate user instructions.

The integrated terminal installs this Skill in both `skills/` and `.claude/skills/`; Claude can invoke `/shiori-notes`. Those helper directories are not note destinations. Reopen the shell after an app update to refresh the copies.

The app can create/rename folders under `notes/` and move notes by dragging. Moves preserve IDs and source bytes but do not repair relative links. After a requested move, check incoming/outgoing links and CSS/image paths; repair only within the requested scope. Tags can also be added or removed inline in the app, so reread the current file before saving to preserve concurrent edits.

## Metadata and links

- Use UTF-8, doctype, `html lang`, charset, viewport, title, and exactly one h1 describing the same subject.
- Generate a UUID with a tool for each new note's single `note-id`. Preserve existing note and heading IDs when editing or renaming. A duplicate created as a separate note needs a new UUID. A note created or edited by this Skill must have a valid `note-id`; add a generated UUID when it is missing in a requested file. The viewer can still read legacy notes without IDs; paths currently drive navigation and moves, and IDs do not imply automatic link repair. Repair missing IDs only in requested files; keep heading IDs unique and stable.
- Inspect `meta[name="note-tag"]` in related notes and reuse exact spellings. Add necessary new tags, one meta element per tag; no comma-separated values, duplicate tags, or leading `#`. Hierarchical tags such as `技術/Rust` are literal values; filtering uses exact matches without implied parents. The link graph connects notes through HTML links, not shared tags.
- Verify internal targets before writing relative links. URL-encode each path segment while preserving `/`: encode filename `#` as `%23`, `%` as `%25`, and spaces as `%20`. Append a heading fragment after the path; HTML-escape attribute values as well.
- External source URLs must be readable plain text, optionally inside `code`, rather than `a href="https://…"`: shiori removes external navigation links. Link only to local notes and local heading anchors.

## Prose and structure

Start from [assets/note.html](assets/note.html), replacing every placeholder (including UUID and tags), adjusting `lang` and the stylesheet path for nested notes. Keep the `.kicker`, `.lead`, `.meta`, and `.footer` skeleton; use meaningful topic, context/date, and source or related-note information rather than decorative filler.

State the result and scope in the lead. Develop context → reasoning → worked example → limits; adapt headings to the subject. Each paragraph develops one topic. Define terms where first needed; add contents, a glossary, or optional detail only when they help navigation or understanding. Avoid repetitive summaries and unsupported claims. For Japanese prose, put one sentence per source line within the same `p`; use separate `p` elements for paragraph boundaries, never repeated `br` elements.

Optional editorial references and their reuse/license decisions are in [references/sources.md](references/sources.md). They are not required dependencies; do not vendor their text or assets merely because they are publicly readable.

## Canonical shared style

[assets/theme.css](assets/theme.css) is the source of truth: the existing shiori vault's compact green theme, with 14px body, 12px code, and 12.5px tables, plus reusable static components. Preserve these defaults instead of inventing another global theme. The sample vault's `styles/theme.css` is an identical demonstration copy.

For each target vault:

1. Compare the bundled stylesheet's bytes with `styles/theme.css` (or the existing shared-style directory). If absent, copy the bundled file there; if identical, reuse it.
2. If an existing file differs, **do not overwrite it**. Try `shiori-theme.css` in the same directory. Reuse it only if identical; otherwise use `shiori-theme-<full SHA-256 of bundled CSS>.css`. If that also exists with different bytes, stop and report the collision rather than overwrite.
3. Link the requested note to the selected canonical copy with a correct relative path. Replace that note's old global stylesheet link and duplicated global CSS; leave unrelated notes and old shared assets untouched. Preserve its IDs and content unless editing them is part of the request. Existing placement conventions take priority over a template's example path.

Shared typography, colors, headings, lists, tables, code blocks, and components belong in this single stylesheet. A note-local `style` may contain only necessary diagram-specific layout, scoped to a unique diagram class; do not repeat global selectors or component rules. Use `.contents` for navigation, `.note` for asides, `.grid`/`.card` for comparisons, `.table-scroll` around wide tables, `figure.diagram` with `figcaption` for diagrams, and plain `pre > code` for code. Add `tabindex="0"` to horizontally scrollable code/table containers for keyboard access. Use semantic table captions and headers, and `details`/`summary` for optional detail.

## Viewer constraints

The viewer sanitizes HTML and enforces CSP. Do not depend on scripts, event handlers, iframes, CDN assets, external fonts, data URLs, or network access. CSS and image paths must resolve inside the vault; relative URLs inside CSS resolve from the CSS file. HTML-escape code examples. Use text with `sub`/`sup` for simple math; no runtime math or syntax-highlighting library.

Use static inline SVG with `viewBox`, an accessible `title` and `desc`, and monochrome `currentColor` strokes/fills. Avoid interactive SVG and remote references. Both explicit `html[data-shiori-theme="light"|"dark"]` and OS theme fallback are supported by the shared CSS; never hard-code a diagram's light background.

## Verify and report

Check note/tag spelling, UUID uniqueness and preserved IDs, exactly one h1, meaningful heading order, all replaced placeholders, local anchors, and real link/asset targets within the vault. Inspect light and dark rendering, a 320px pane, keyboard focus, and printing: tables/code may scroll within their containers but must not widen the page, and printed code must wrap. Check that prose, diagrams, and sources work without scripts or network access. Prefer the actual shiori viewer when available; a browser preview does not validate its sanitizer. Report any checks you could not perform.

Report created/changed paths, tags, and which stylesheet was reused or copied (including any collision avoidance). The user can apply shiori's external-change notification to reload the notes. Migration of unrelated real-vault notes is a separate task; do not mass-edit a vault as part of installing this skill.
