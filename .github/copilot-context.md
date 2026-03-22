# Copilot Context Bootstrap

Purpose: portable project context for switching machines/accounts/subscriptions.

## Repository
- Name: `md-wysiwyg-editor`
- Workspace root: `c:\projects\md-wysiwyg-editor`
- GitHub remote mentioned in repo memory: `florerion/SmartEditor`

## Naming Snapshot (Current)
- Web Component tag: `<smart-editor>`
- Public class export: `SmartEditorElement`
- React adapter component: `SmartEditor` in `src/adapters/react/SmartEditor.jsx`
- Bundle outputs: `dist/smart-editor.{esm,cjs,iife}.js`
- UI class prefix: `se-*` (legacy `mde-*` class names removed)
- CSS custom properties: `--se-*` (legacy `--mde-*` removed)
- Web Component events: `se-change`, `se-selection-change`, `se-preview-click`

## What This Project Is
Framework-agnostic Markdown editor with split code/preview UX, runtime API, extensible toolbar actions, markdown-it parsing, and code-preview source-line synchronization.

## Key Entry Points
- Public entrypoint: `src/index.js`
- Core orchestrator: `src/core/EditorCore.js`
- Markdown parser wrapper: `src/core/Parser.js`
- Source/preview sync logic: `src/core/Sync.js`
- UI components: `src/ui/*`
- Built-in actions/plugins: `src/plugins/*`
- Integrations: `src/adapters/WebComponent.js`, `src/adapters/react/*`

## Critical Conventions
- Keep line numbers in editor-facing APIs 0-based.
- Preserve preview sync attributes:
  - `data-source-line`
  - `data-source-line-end`
- If adding new preview attributes, update DOMPurify allowlist in `src/ui/PreviewPanel.js`.
- Respect undo semantics in `CodePanel.setValue(value, undoable)`:
  - `undoable=false` must not create history entries.
- Ensure classes that register listeners/timers clean them up in `destroy()`.
- Keep plugin behavior in actions where possible (`registerAction` schema).

## Toolbar Snapshot (Current)
- Toolbar supports two rendering modes:
  - Legacy action-derived layout (`group` + `order`) when `opts.toolbar` is omitted.
  - Declarative layout when `opts.toolbar` is provided.
- Declarative toolbar supports:
  - explicit groups and order,
  - per-item display mode: `label`, `icon`, `icon-label`,
  - dropdown menus,
  - entries bound to registered actions and custom inline async `run(api, state, args?)` handlers.
- Runtime toolbar APIs in `EditorCore`:
  - `getToolbarConfig`, `setToolbarConfig`, `updateToolbarConfig`,
  - `upsert/remove` helpers for groups, items, and dropdown entries.
- Dropdown UX stability:
  - CSS hover bridge between trigger and menu,
  - delayed close logic (160ms) with cancellation on pointer/focus re-entry,
  - click/focus support remains enabled.

## draw.io Snapshot (Current)
- Markdown serialization for draw.io is now one-line only:
  - `![draw.io](image-src){uri-encoded-xml}`
- Legacy fenced draw.io blocks (` ```drawio `) are no longer supported.
- Preview renders draw.io as a single clickable image (no frame/header/footer/edit button UI).
- Clicking a draw.io image in preview opens modal edit for that diagram payload.
- Toolbar draw.io action always starts from a fresh, blank diagram:
  - `openDrawioEditor({ forceNew: true })`
- draw.io runtime is self-hosted by default (offline-friendly):
  - Source is downloaded on install to `vendor/drawio/`.
  - Build copies `vendor/drawio/` to `dist/drawio/`.
  - Default modal URL is `./drawio/?embed=1&proto=json&spin=1&ui=min&libraries=1`.
  - Demo overrides URL to `../dist/drawio/?embed=1&proto=json&spin=1&ui=min&libraries=1`.
- Versioning model for bundled draw.io:
  - Pinned in `scripts/download-drawio.mjs` as `DRAWIO_VERSION`.
  - Override with environment variable `DRAWIO_VERSION`.
  - `DRAWIO_VERSION=latest` resolves from GitHub Releases API.
- Runtime resilience:
  - `DrawioModal` has a guard for self-hosted failures (iframe error or no `init` event in time).
  - Guard performs one-time fallback to hosted `https://embed.diagrams.net/?embed=1&proto=json&spin=1&ui=min&libraries=1`.
- Core files involved:
  - `src/core/Parser.js`
  - `src/core/EditorCore.js`
  - `src/ui/DrawioModal.js`
  - `src/plugins/drawio.js`
  - `scripts/download-drawio.mjs`
  - `rollup.config.js`

## Code-Preview Display & Sync (branch: code-preview-display)

### Visual payload collapsing in CodeMirror
- Long base64 image sources (`data:...;base64,...`) and draw.io XML payloads (`{uri-encoded-xml}`) are
  visually truncated in the editor: `head[...]tail` using a `Decoration.replace` widget.
- Actual document text is never modified; purely a view-layer effect.
- Implementation: `longPayloadCollapsePlugin` ViewPlugin in `src/ui/CodePanel.js`.
- Thresholds: `COLLAPSE_MIN_LENGTH`, `COLLAPSE_HEAD`, `COLLAPSE_TAIL` constants in `CodePanel.js`.

### Diff modal scroll fix
- `editor.proposeChange()` diff modal: long content is now scrollable.
- Fix: added `overflow: hidden` to `.se-diff__body` and `min-height: 0` to `.se-diff__col`
  and `.se-diff__pre` in `src/styles/editorStyles.js`.

### Split-mode bidirectional scroll sync
- New option: `opts.scrollSync` (default `true`); active only in `mode === 'split'`, Y-axis only.
- Code → preview: `EditorCore._handleCodePanelScroll` reads top-visible line via
  `CodePanel.getTopVisibleLine()` (`lineBlockAtHeight(scrollTop)`) and calls
  `Sync.scrollPreviewToLine(line, root, { behavior: 'smooth' })`.
- Preview → code: `EditorCore._handlePreviewPanelScroll` reads top-visible source line via
  `Sync.getTopPreviewLine(root)` and calls `CodePanel.scrollViewportToLine(line, { behavior: 'smooth' })`.
- Loop guard: `_scrollSyncSource` flag (`'code'|'preview'|null`) with **trailing-debounce 150ms**
  (each echo event from the steered panel resets the timer, covering the full smooth animation).
- Key methods added to `Sync.js`: `scrollPreviewToLine`, `getTopPreviewLine`.
- Key methods added to `CodePanel`: `getTopVisibleLine`, `scrollViewportToLine`, `onScroll` callback.
- Key method added to `PreviewPanel`: `onScroll` callback.

## Propose Change Extension (branch: propose-extension)
- `EditorCore.proposeChange(newMarkdown, { mode })` now supports:
  - `replace-all`
  - `replace-selection`
  - `insert-at-cursor`
- Behavior rules:
  - `replace-selection` with empty selection falls back to `insert-at-cursor`.
  - Cursor insertion uses `selection.to` (end of current selection/cursor).
- Diff modal now compares full-document snapshots and highlights the target replacement range:
  - red-highlight in current document,
  - green-highlight in proposed document,
  - cursor marker for insert mode.
- Files involved:
  - `src/core/EditorCore.js`
  - `src/ui/DiffModal.js`
  - `src/styles/editorStyles.js`
  - `src/adapters/WebComponent.js`
  - `README.md`
  - `demo/index.html`

## Build And Validation
- Install deps: `npm install`
- Build: `npm run build`
- Dev watch: `npm run dev`
- Re-download bundled draw.io manually: `npm run drawio:download`
- No test/lint scripts defined currently; verify changes with `npm run build`.

## Recommended Handoff Workflow
1. Pull the latest repository.
2. Open this file first: `.github/copilot-context.md`.
3. Then open:
   - `.github/copilot-instructions.md`
   - `.github/instructions/core.instructions.md`
   - `.github/instructions/plugins.instructions.md`
   - `.github/instructions/ui.instructions.md`
4. Ask Copilot to summarize the current status from:
   - `README.md`
   - `/memories/repo/status.md` (if available in current environment)

## Suggested Prompt On A New Machine
Use this project context and instruction files as the source of truth. Before making changes, summarize architecture, constraints, and current status. Then propose and implement minimal, local edits under `src/` and validate with `npm run build`.

## Last Updated
- Date: 2026-03-22
- Reason: finalized breaking rename migration to `se-*` naming (classes, CSS vars, and web-component events) and preserved `proposeChange` mode extension context
