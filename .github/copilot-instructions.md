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
- Preserve sync mapping behavior: keep `data-source-line` / `data-source-line-end` support intact across parser and preview.
- If introducing new HTML attributes needed in preview, update DOMPurify allowlist in `src/ui/PreviewPanel.js`.
- Toolbar actions should follow `registerAction` schema (`id`, `group`, `order`, `run`, optional `isEnabled`/`isActive`).
- Prefer declarative toolbar composition through `opts.toolbar` for visibility/order/group/display concerns; treat action `group/order` as fallback defaults.
- For runtime toolbar changes, prefer `EditorCore` helper APIs (`updateToolbarConfig`, `upsert/remove` group/item/dropdown item) over manual full-config rewrites.
- Selection line numbers in editor-facing APIs are 0-based.
- Respect undo semantics in `CodePanel.setValue(value, undoable)`; `undoable=false` must not add to history.
- Ensure components that add listeners or timers clean them up in `destroy()`.
- Preview image deletion UX: when an image is selected in preview and user presses `Delete`/`Backspace`, remove the corresponding markdown image token (`![...](...)`, including draw.io variant) rather than deleting a single character from code.
- Keep preview delete keyboard interception in capture phase so CodeMirror does not consume `Delete` first.
- `ImageResize` handle uses `position: fixed`; compute handle coordinates in viewport space (do not add `window.scrollX/window.scrollY`).
- Keep `proposeChange(newMarkdown, { mode })` semantics stable:
	- supported modes: `replace-all`, `replace-selection`, `insert-at-cursor`,
	- `replace-selection` falls back to `insert-at-cursor` when selection is empty,
	- cursor insert uses `selection.to` (end of selection/cursor).
- Diff modal for `proposeChange` should compare full document snapshots and highlight the changed target range (old/new), with cursor marker for insert mode.

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

## draw.io Packaging
- Keep draw.io self-hosted by default:
	- download source webapp to `vendor/drawio/` via `scripts/download-drawio.mjs`
	- copy to `dist/drawio/` during `npm run build` (`rollup.config.js`)
- Do not switch default modal URL back to hosted embed; hosted `embed.diagrams.net` is fallback-only.
- Keep draw.io version pinned via `DRAWIO_VERSION` constant in `scripts/download-drawio.mjs`; allow override by `DRAWIO_VERSION` env var.
- For demo, keep draw.io URL aligned with repo-root serving model (`npx serve .` + `/demo/`), i.e. resolve from `../dist/drawio/`.
