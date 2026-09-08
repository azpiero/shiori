# Proposed per-note tag editing

Status: proposed for agreement as part of Issue #19. This branch implements display relocation only. No write command or editing UI is introduced.

## Scope

The next implementation should add and remove tags on one open note. A rename across the vault changes many files and belongs in a separate issue. Existing `tag:` search and reader tag buttons continue to navigate/filter; editing needs a distinct control so a normal tag click never writes a file.

## User flow

Open an explicit tag editor for the selected note. Suggest existing exact tag names using `ShioriSearch.suggest`; allow new names under the existing vault conventions. Show pending additions/removals and save or cancel. Cancel leaves disk unchanged. Disable repeat saves while a write is pending. A save error retains the draft; a conflict asks the user to reload and review the newer note before reapplying it.

## Backend contract

A proposed command is `set_note_tags(vault_token, path, expected_hash, tags)`. The editor first obtains the current tag values and a digest of the exact source bytes from the backend. A successful response contains a fresh vault snapshot. The backend must validate all inputs independently of the UI.

- Match the active vault token, resolve a relative HTML path inside that vault, and reject traversal, Git internals, directories, and symlink write targets. Revalidate the destination immediately before replacement. Reuse the reader's boundaries, with stricter rules for writing.
- Accept a complete desired list of nonempty tag strings, remove exact duplicates, and preserve case and hierarchical tag semantics. Agree on reasonable input limits before implementation; do not silently truncate values. Escape attribute values when generating HTML.
- Serialize app-originated writes, compare source bytes against `expected_hash`, and refuse a mismatch. Keep the original source untouched on unsupported input or a failed precondition.

## Preserve source formatting

Use an HTML-aware tokenizer that reports source byte ranges to locate `meta[name="note-tag"]` elements in the original head. Replace/remove only those ranges and insert missing tags inside that head. Preserve all other bytes, including note IDs, comments, whitespace, attribute order, line endings, and body text. Do not serialize an entire parsed DOM or use a broad regular expression over arbitrary HTML.

Before choosing a tokenizer, prove range handling with quoted `>` characters, entity-encoded values, mixed-case tag/attribute names, multiline tags, comments, raw-text elements, and CRLF input. Restrict the initial feature to valid UTF-8 notes with an unambiguous explicit head. Reject ambiguous/malformed structures with an explanation instead of silently normalizing the file. These acceptance cases should drive implementation tests.

Write the proposed bytes to a temporary file in the destination directory, preserve relevant permissions, flush, recheck the source digest, and atomically replace the destination. Clean up temporary files on failure. Atomic replacement prevents partial files but does not itself prevent lost updates: an unrelated editor can still write between the final comparison and replacement. App serialization is not a lock on external editors. Document that residual race and evaluate platform coordination during implementation; do not advertise a universal compare-and-swap guarantee.

## Refresh after saving

Return a re-scanned snapshot and its new revision from the save operation. Update sidebar search suggestions, graph data, and tags in every pane showing the edited note. Retain open paths and per-tab queries. Coordinate the revision poll with the pending save so the app does not announce its own completed change as an external update; a later external revision should still show the update notice.

The current refresh behavior reloads documents and resets scroll/match position. Prefer retaining unrelated iframes for a metadata-only change, but define and verify the behavior explicitly in the implementation issue. If the write succeeds but re-scanning fails, report that the file was saved and offer reload; do not present it as an unsaved operation.

## Agreement and next work

Confirm per-note addition/removal, source-preserving edits, conflict refusal, and snapshot refresh before implementing writes. A later implementation must cover successful edits, cancellation, invalid HTML, Unicode/entity tags, out-of-vault paths, stale vault tokens, concurrent requests, external changes, failed replacement, and post-save scan errors. Global tag rename remains separate.
