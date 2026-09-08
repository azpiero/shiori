---
name: shiori-readable-notes
description: Write or revise readable HTML explanations for shiori with clear prose and a shared, script-free document stylesheet. Use for note structure and presentation; pair with shiori-notes for vault metadata and file conventions.
---

# Readable shiori notes

Use this skill for the explanation and its presentation. Read the companion [shiori-notes](../shiori-notes/SKILL.md) when saving into a vault: it owns destination selection, IDs, tags, filenames, and relative links. Preserve existing metadata and the user's language and scope. A presentation revision does not authorize rewriting unrelated notes or committing the vault.

## Prepare the document

Identify the reader's task and the evidence available. For a reference note, make the answer easy to locate. For an extended explanation, develop one concrete problem through evidence and examples; do not invent suspense, anecdotes, or certainty.

Use a single h1 and a short lead stating the result and scope. A useful explanatory order is context and main point, reasoning, worked example, then limits and related material. Adapt it to the subject. Add a linked contents list for a multi-section note; omit it when a short note is already easy to scan.

Define unfamiliar terms where they first matter, after showing the object and its function. Add a `dl` glossary only for terms referenced repeatedly. Keep one topic per paragraph and make its opening sentence identify that topic. For Japanese HTML source, put each prose sentence on its own line within the same `p`; use separate `p` elements for paragraphs, not `br` after every sentence. Preserve whitespace in code.

For Japanese reference prose, consult the technical-writing source in [references/sources.md](references/sources.md). For long narrative explanations, also consult the rhythm source there. These are optional reading, not installed dependencies. If unavailable, continue with the local guidance and disclose any source-verification limit. Preserve evidence-based uncertainty, explain mechanisms behind causal claims, identify actors, and remove empty emphasis or a summary that merely repeats the preceding description. Reserve bold for definitions and distinctions that prevent misreading.

## Use the shared assets

Start from [assets/note.html](assets/note.html). Copy [assets/shiori-document.css](assets/shiori-document.css) into the target vault's `styles/shiori-document.css` and link it relative to the note. The template assumes `notes/`; adjust for deeper paths. Replace all template fields, generate a new UUID for a new note, and reuse tags through the companion skill.

The CSS file in this skill is the distributed source; `sample-vault/styles/shiori-document.css` is its demonstration copy. Update both together when maintaining this repository. In user vaults, inspect an existing stylesheet before replacing it: reuse a compatible copy, or choose a separate filename when it has local changes. Do not load both this theme and an unrelated full-document theme without checking their interaction.

| Markup/class | Use |
| --- | --- |
| `main.document`, `.lead` | Reading column and opening context |
| `nav.contents` | Local heading links in longer notes |
| `aside.note` | A condition or limitation needed alongside the argument |
| `.accent` | At most one red emphasis per document |
| `figure.diagram`, `figcaption` | A spatial relationship with an explanation |
| `.table-scroll` around `table` | Short comparisons, normally up to three columns; use header cells and a caption |
| `pre code` | Escaped code or literal notation with horizontal scrolling |
| `details`, `summary` | Optional detail; keep essential conclusions visible |

Use restrained colors: warm paper in light mode, blue links, optional red emphasis, and separate functional search highlighting supplied by the viewer. Theme overrides use `html[data-shiori-theme]`; explicit light/dark takes precedence over the OS preference, while `system` or an absent attribute follows it. Do not encode meaning through color alone.

## Stay compatible with the viewer

- Use OS fonts. Keep any images, CSS, or optional font files inside the vault and reference them relatively; no CDN, Google Fonts, remote imports, or data URLs.
- Use plain escaped code by default. No Highlight.js, MathJax, math-copy.js, script-driven diagrams, copy buttons, or event handlers. The viewer removes scripts, frames, preloads, prefetches, and automatic redirects.
- For simple mathematics use text with `sub`/`sup`. For complex notation, use a locally generated SVG/PNG with a text equivalent and the original notation in `pre code`. Do not suggest raw LaTeX will render. Avoid mathematical decoration when prose is clearer.
- Draw meaningful diagrams as inline SVG with `viewBox`, `title`, and `desc`, using a single `currentColor` ink (dark in light mode, light in dark mode). Use geometry for connectors, not emoji, arrow characters, or ASCII art. Explain the relationship in nearby text. Ordinary sequential steps belong in an ordered list.
- External navigation is blocked in shiori. Keep source titles and URLs readable as text for copying into a browser; use local relative links for navigation inside the vault.

## Check the result

Read the note as a reader: each paragraph should add evidence, a distinction, or a useful example. Verify claims, limits, and the resolution of questions introduced earlier. In long prose, vary sentence density without padding or letting editorial instructions leak into the note.

Check IDs, tags, local anchors and asset paths with the companion skill. Inspect light and dark rendering and a narrow pane (about 320px); tables/code may scroll horizontally, prose should wrap. Verify SVG labels remain legible, keyboard focus is visible, and the note works without scripts or network access. Prefer the actual shiori viewer; a browser preview alone does not validate its sanitizer/CSP. Report any native verification that could not be completed.
