# Per-note tag editing

Implemented for Issue #25. Tag names filter the sidebar without switching to the graph. The graph remains available from the navigation rail. There is no per-tag rename or vault-wide rename operation.

## Draft and save

Click × to prepare a removal or ＋ to open the editor. The editor reads current tags and a SHA-256 digest from disk, then maintains a local draft. Existing exact tag names are offered through `ShioriSearch.suggest` and a native datalist. Add the input to the draft before saving. Save is explicit; Cancel/Escape never writes. Errors retain the draft; repeat saves and cancellation while writing are disabled. The background is inert while the editor is open, and Cancel returns focus to the triggering control; Save focuses the active pane’s add-tag button after updating its chips.

A conflict requires cancellation, vault reload, and review before reapplying the change. The application does not silently retry against a newer hash. Vault switching and manual refresh are disabled while the editor is open.

## Commands and validation

`get_note_tags(vault_token, path)` returns `{tags, expected_hash}` from the exact source bytes. `set_note_tags(vault_token, path, expected_hash, tags)` accepts the complete desired list and returns `{saved: true, snapshot, warning}` after saving and re-scanning. Both commands require the main webview and active vault token.

- At most 128 tags; at most 256 UTF-8 bytes each. Reject empty/whitespace-only values and control characters. Remove exact duplicates; retain case, whitespace within nonempty names, and hierarchical tag semantics.
- Accept only relative `.html` note paths in the current vault. Reject traversal, Git/app internals, asset folders, directories, read-only files, and symlinks in any destination component. Validate the canonical vault and revalidate the path immediately before replacement.
- Hold the vault-state mutex across saving and scanning. App writes are serialized; a vault switch cannot change the token mid-write.

## Source preservation

The [html5gum tokenizer](https://docs.rs/html5gum/0.8.4/html5gum/) supplies decoded attributes and original byte spans. State switching handles script/style/title content without treating embedded markup as metadata. Only original note-tag element ranges are removed; retained tags keep their exact bytes, and new escaped elements are inserted before the explicit closing head. No parsed DOM is serialized.

Support is intentionally restricted to UTF-8 (including BOM), at most 16 MiB, with one unambiguous explicit head. Head children may be meta, link, base, title, style, script, comments, or whitespace. Template/noscript and malformed or ambiguous heads are refused. Tokenizer errors and note-tag elements outside the head are refused. Other metadata, IDs, comments, attribute order, body content, and existing whitespace/line endings stay byte-for-byte unchanged. Inserted lines follow CRLF when present, otherwise LF.

Write a unique temporary file in the destination directory using exclusive creation, preserve the original file's standard permission bits, flush, revalidate the destination and digest, then atomically rename. Failure removes the temporary file. This implementation does not promise preservation of extended attributes or custom ACLs.

The final comparison is **not** a universal compare-and-swap. An external editor or filesystem actor can still change the source or path between the final check and rename. App serialization does not coordinate external processes. Platform-wide file coordination is not implemented; simultaneous editing of the same note should be avoided. No automatic Git operation is performed.

## Snapshot and reader behavior

The save response contains the new scan and revision. Both panes, sidebar search, suggestions, and graph use that snapshot. Open tabs and their queries remain. The edited note and other notes whose source digest changed reload; this resets their scroll and current match. Unchanged iframes are retained. Deleted/unreadable paths are reconciled using the existing reader behavior.

Revision polling pauses during the editor session. Responses from polls started before the session are discarded using a generation counter. A later external revision still raises the update notice. Scan errors are returned with `saved: true` and a warning; the UI closes the saved draft and shows the scan errors instead of inviting a repeat save.

## Verification

Rust tests cover source ranges with quoted `>`, entities, Unicode, mixed-case names, multiline metadata, CRLF/BOM, comments, and raw text; retained bytes and duplicate handling; malformed input; limits and permissions; traversal/symlink/token rejection; successful replacement; stale hashes; concurrent saves; external changes before replacement; failed replacement cleanup; and post-save scan errors.

JavaScript tests cover filter-only clicks, originating-note add/remove callbacks, cancellation, suggestions, IME, validation, duplicate saves, stale reads, retained drafts on error, saved-with-warning handling, both-pane snapshot updates, unchanged iframe retention, and revision-poll coordination. Native macOS datalist, IME, and file operations remain manual verification items.
