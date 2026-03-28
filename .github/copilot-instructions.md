# Project Guidelines

## Code Style
- Use vanilla JavaScript with ES modules (`type: module`) and class-based components.
- Keep JSDoc on exported APIs and public methods (params, returns, examples where useful).
- Prefer small, focused methods and keep private helpers in `_camelCase` form.
- Add short comments only where behavior is non-obvious.
- Edit source files under `src/`; treat `dist/` as build output.

## Architecture
- Public entrypoint is `src/index.js` (`createEditor`, `EditorCore`, `SmartEditorElement`).
- `src/core/EditorCore.js` is the orchestrator that wires State, Parser, Sync, toolbar, code panel, and preview panel.
- `src/core/Parser.js` wraps `markdown-it` and injects `data-source-line` attributes used for code-preview sync.
- `src/core/compat/` contains publishing compatibility logic (`CompatibilityService`, profile factories, and rules).
- `src/ui/` contains UI building blocks (`CodePanel`, `PreviewPanel`, `Toolbar`, dialogs/modals).
- `src/plugins/` contains built-in toolbar actions; keep new behavior as actions when possible.
- `src/adapters/` contains integration layers (`WebComponent`, React adapter).

## Build and Test
- Install dependencies: `npm install`
- Build: `npm run build`
- Dev watch: `npm run dev`
- No test/lint scripts are currently defined in `package.json`; validate changes by running `npm run build`.
- Demo is served from repository root (not `demo/`): `npx serve .` then open `/demo/`.

## Conventions
- UI class prefix is `se-` (legacy `mde-` class names were removed as a breaking change).
- CSS custom properties use `--se-*` (legacy `--mde-*` vars were removed as a breaking change).
- Web Component custom events use `se-*` names:
	- `se-change`
	- `se-selection-change`
	- `se-preview-click`
	- `se-compatibility-report`
	- `se-compatibility-status-change`
	- `se-compatibility-fix-applied`
- Preserve sync mapping behavior: keep `data-source-line` / `data-source-line-end` support intact across parser and preview.
- If introducing new HTML attributes needed in preview, update DOMPurify allowlist in `src/ui/PreviewPanel.js`.
- Toolbar actions should follow `registerAction` schema (`id`, `group`, `order`, `run`, optional `isEnabled`/`isActive`).
- Prefer declarative toolbar composition through `opts.toolbar` for visibility/order/group/display concerns; treat action `group/order` as fallback defaults.
- For runtime toolbar changes, prefer `EditorCore` helper APIs (`updateToolbarConfig`, `upsert/remove` group/item/dropdown item) over manual full-config rewrites.
- Keep built-in theme definitions centralized in `src/styles/themes.js`; when adding a new built-in preset, include full token set and `swatch` metadata.
- Keep theme CSS generation centralized via `buildEditorThemeStyles()`; avoid reintroducing hardcoded per-theme blocks in `src/styles/editorStyles.js`.
- Keep compatibility panel status colors tokenized through theme variables (`--se-color-compat-*`); avoid hardcoded status colors in panel CSS.
- Preserve runtime theme API semantics in `EditorCore`: `setTheme`, `getTheme`, `getAvailableThemes`.
- Preserve toolbar theme selector UX:
	- default fallback toolbar includes a `Theme` dropdown generated from available themes,
	- entries use swatch icon + label,
	- trigger highlights only while dropdown is open (not persistently just because one item is active).
- Selection line numbers in editor-facing APIs are 0-based.
- Respect undo semantics in `CodePanel.setValue(value, undoable)`; `undoable=false` must not add to history.
- Ensure components that add listeners or timers clean them up in `destroy()`.
- Preview code blocks are rendered with a floating `.se-code-block__toolbar` overlay (language select + copy button) that appears on hover/focus-within.
- Keep `_renderCodeBlockToolbar()` in `Parser.js` as the single source for code block toolbar HTML; do not duplicate toolbar markup elsewhere.
- Copy button in preview uses `navigator.clipboard.writeText()`; on success it switches to a checkmark icon (`.is-copied` class) for 1.5 s.
- `CodePanel.replaceRange(from, to, text, opts)` applies a range change without touching cursor or selection; preserve this semantic.
- Preview stability lock: used when changing a code fence language, inserting image markdown, or updating a draw.io diagram — captures `scrollTop` before the change and holds position through the full async render cycle (KaTeX → Mermaid → images):
	- `_beginPreviewStabilityLock(scrollTop)` — freezes sync, suspends scroll callbacks, sets pin+deadline.
	- `_schedulePreviewStabilityUnlock(initialDelayMs)` — polls every 90 ms until async work settles or 1200 ms deadline, then calls `_finalizePreviewStabilityLock()`.
	- `_hasPendingPreviewAsyncWork()` — returns true while Mermaid renders or images are loading.
	- `_applyPinnedPreviewScroll()` supports anchor-based pinning (`_pinPreviewAnchor`) so typing-time updates preserve mapped preview element position, not just raw `scrollTop`.
	- Do not replace the poll loop with a fixed timer; it must wait for actual async completion.
	- `insertText()` in `EditorCore` auto-activates the lock when the inserted text contains `![`; do not bypass this by calling `_codePanel.insertText()` directly.
	- `_upsertDrawioBlock()` explicitly locks around `setMarkdown()` for the update path (sync render, async image).
	- For full-document rewrites triggered by toolbar/actions, prefer `setMarkdown(next, { preservePreviewScroll: true })` to avoid preview jumps.
- Preview image deletion UX: when an image is selected in preview and user presses `Delete`/`Backspace`, remove the corresponding markdown image token (`![...](...)`, including draw.io variant) rather than deleting a single character from code.
- Keep preview delete keyboard interception in capture phase so CodeMirror does not consume `Delete` first.
- `ImageResize` handle uses `position: fixed`; compute handle coordinates in viewport space (do not add `window.scrollX/window.scrollY`).
- Keep `proposeChange(newMarkdown, { mode })` semantics stable:
	- supported modes: `replace-all`, `replace-selection`, `insert-at-cursor`,
	- `replace-selection` falls back to `insert-at-cursor` when selection is empty,
	- cursor insert uses `selection.to` (end of selection/cursor).
- Diff modal for `proposeChange` should compare full document snapshots and highlight only true changed ranges (old/new), with cursor marker for insert mode and neutral non-changed column background.
- Busy/loading UX is centralized in `EditorCore` + `LoadingOverlay`:
	- Prefer `runWithBusy(...)` for async UI operations so lock/spinner/cancel stay consistent.
	- Preserve busy API surface (`isBusy`, `getBusyState`, `begin/update/end/cancelBusyTask`, `runWithBusy`) and web-component event `se-busy-change`.
	- Keep busy overlay anti-flicker behavior (`busy.showDelay`, `busy.minVisible`) and configurable labels (`busy.texts.defaultLabel`, `busy.texts.cancel`).

## Compatibility MVP
- Default compatibility profile is Eleventy-like (`createEleventyCompatibilityProfile`) and supports markdown-it options, disabled rules, and plugin injection.
- Keep table compatibility issue codes stable:
	- `table.missing-leading-pipe`
	- `table.missing-trailing-pipe`
	- `table.column-count-mismatch`
	- `table.invalid-separator-row`
- Keep compatibility issue panel behavior stable:
	- list is scrollable (viewport around three items visible),
	- issue text click jumps to source line/selection,
	- fix actions remain mediated by propose/diff acceptance flow,
	- per-issue `Fix` applies only the selected issue (must not normalize the whole table/block),
	- `Fix all` applies batch normalization across all fixable issues.

## Scroll Sync
- Split-mode bidirectional vertical scroll sync is implemented in `EditorCore` (`_handleCodePanelScroll`, `_handlePreviewPanelScroll`).
- Loop prevention uses a trailing-debounce source lock (`_scrollSyncSource`, `_extendScrollLock()`); do not replace with a fixed timer.
- `CodePanel.getTopVisibleLine()` must use `lineBlockAtHeight(scrollTop)` — do not revert to `viewport.from`.
- Scroll sync is active only when `mode === 'split'` and `opts.scrollSync !== false`.
- Keep edit-time suppression in place: while user types, sync is temporarily paused via debounce (`_suppressScrollSyncTemporarily`) to avoid disorienting jumps.
- Keep click-based alignment ratio-aware in both directions:
	- code -> preview uses cursor viewport ratio,
	- preview -> code uses click viewport ratio.
- Preserve large-block fallback: when preview target block is taller than viewport, anchor it to top instead of forcing ratio alignment.
- Preserve anti-jitter dead zone (ratio-based threshold) to avoid micro-scroll corrections when target is already near desired position.
- Preview click navigation must retain temporary highlight and avoid feedback loops (mark source as `preview` before code scroll).
- Clean up RAF handles and the release timer in `destroy()`.

## Syntax-Highlighted Code Blocks in Preview
- `Parser.js` renders fenced code blocks using highlight.js (tree-shaken, 35 languages registered).
- Each code line is wrapped in `<span data-source-line="N">` for code-preview sync.
- `_renderCodeBlockToolbar(selectedLang, srcLine)` generates the floating toolbar overlay inside `.se-code-block__toolbar`.
- Toolbar contains two controls:
	1. `.se-code-block__lang-select` — `<select>` for changing the code fence language.
	2. `.se-code-block__copy-btn` — icon-only `<button>` that copies code to clipboard.
- Changing language triggers `_setCodeFenceLanguage(line0, language)` in `EditorCore` which uses `CodePanel.replaceRange()` and the preview stability lock.
- Copy button feedback: adds `.is-copied` class + changes `title` to `"Copied!"` for 1.5 s, then resets.
- When adding new tags to preview HTML, update DOMPurify `ADD_TAGS` in `src/ui/PreviewPanel.js`.

## draw.io Packaging
- Keep draw.io self-hosted by default:
	- download source webapp to `vendor/drawio/` via `scripts/download-drawio.mjs`
	- copy to `dist/drawio/` during `npm run build` (`rollup.config.js`)
- Do not switch default modal URL back to hosted embed; hosted `embed.diagrams.net` is fallback-only.
- Keep draw.io version pinned via `DRAWIO_VERSION` constant in `scripts/download-drawio.mjs`; allow override by `DRAWIO_VERSION` env var.
- For demo, keep draw.io URL aligned with repo-root serving model (`npx serve .` + `/demo/`), i.e. resolve from `../dist/drawio/`.
