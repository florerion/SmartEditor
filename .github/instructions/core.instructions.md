---
description: "Use when editing core editor orchestration, markdown parsing, sync mapping, preview sanitization flow, or undo/history behavior in src/core and coupled UI internals."
name: "Core Editing Rules"
applyTo: "src/core/**"
---
# Core Editing Rules

- Treat `EditorCore` as the runtime orchestrator; keep it focused on wiring State, Parser, Sync, and UI components.
- Preserve code-preview mapping guarantees: `data-source-line` and `data-source-line-end` must remain consistent for sync to work.
- Keep editor-facing line indices 0-based in APIs and sync logic.
- If parser output introduces new preview attributes, update DOMPurify allowlist in `src/ui/PreviewPanel.js`.
- Respect undo semantics in `CodePanel.setValue(value, undoable)`: `undoable=false` must not add entries to history.
- For toolbar changes in `EditorCore`, prefer additive runtime APIs (`updateToolbarConfig`, `upsert/remove` group/item/dropdown item) over forcing full config replacement.
- Maintain cleanup discipline: timers, DOM listeners, and document-level handlers must be removed in `destroy()` paths.
- Prefer additive, local changes over cross-cutting rewrites in core modules.
- Preserve preview image delete behavior in `EditorCore`: deleting a preview-selected image should remove the corresponding markdown image token, scoped to the mapped source block (`data-source-line` / `data-source-line-end`), instead of deleting a single code character.
- Keep preview-delete key interception before editor keymaps (capture phase) when relying on document-level `keydown` handlers.
- Preserve scroll-sync loop guards in `EditorCore`:
	- source lock (`_scrollSyncSource`) with trailing debounce,
	- temporary typing suppression (`_suppressScrollSyncTemporarily`) to prevent editor jumps while editing.
- Keep click navigation ratio-aware and symmetric:
	- code cursor ratio drives preview alignment,
	- preview click ratio drives code alignment.
- Keep `Sync` dead-zone behavior for tiny deltas to avoid jitter, and preserve large-preview-block fallback to top anchoring.
- Preserve `proposeChange(newMarkdown, { mode })` behavior:
	- modes: `replace-all`, `replace-selection`, `insert-at-cursor`,
	- empty selection + `replace-selection` must fallback to `insert-at-cursor`,
	- insert mode uses `selection.to`.
- For `replace-all` propose previews, compute and highlight only the true changed span (trim shared prefix/suffix); avoid reverting to full-document highlight.
- Keep compatibility orchestration in `EditorCore` aligned with `CompatibilityService` contract (`validate`, `buildBatchFix`, profile switching).
- Preserve compatibility APIs and status wiring:
	- `getCompatibilityReport`, `getCompatibilityStatus`, `isCompatibilityEnabled`,
	- `setCompatibilityEnabled`, `setCompatibilityProfile`, `validateCompatibility`,
	- `proposeCompatibilityFix`, `proposeAllCompatibilityFixes`.
- Keep naming conventions stable in core-generated markup and selectors:
	- CSS/UI classes use `se-*`,
	- custom properties use `--se-*`,
	- avoid reintroducing legacy `mde-*` naming.
- Preserve preview stability lock semantics in `EditorCore` for code fence language changes:
	- `_beginPreviewStabilityLock(scrollTop)` freezes sync + scroll callbacks, sets pin and deadline.
	- `_schedulePreviewStabilityUnlock(ms)` polls `_hasPendingPreviewAsyncWork()` every 90 ms (1200 ms max) before calling `_finalizePreviewStabilityLock()`.
	- `_applyPinnedPreviewScroll()` is called after `_renderMath()` in `_updatePreview()` and in each Mermaid `finally` block.
	- Do not replace the polling loop with a fixed timeout; the loop must wait for actual Mermaid/image completion.
- `CodePanel.replaceRange(from, to, text, opts)` is a pure document patch without cursor/selection move; preserve this semantic when using it for source edits triggered from preview UI.
