# Copilot Context Bootstrap

Purpose: portable project context for switching machines/accounts/subscriptions.

## Repository
- Name: `smart-md-editor`
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
- Additional compatibility events: `se-compatibility-report`, `se-compatibility-status-change`, `se-compatibility-fix-applied`

## What This Project Is
Framework-agnostic Markdown editor with split code/preview UX, runtime API, extensible toolbar actions, markdown-it parsing, and code-preview source-line synchronization.

## Key Entry Points
- Public entrypoint: `src/index.js`
- Core orchestrator: `src/core/EditorCore.js`
- Markdown parser wrapper: `src/core/Parser.js`
- Source/preview sync logic: `src/core/Sync.js`
- Compatibility orchestration: `src/core/compat/*`
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
- Built-in theme selector:
  - default action-derived toolbar now appends a `Theme` dropdown automatically,
  - options are generated from `api.getAvailableThemes()` plus `Auto`,
  - entries use `icon-label` display with color swatches,
  - dropdown trigger stays neutral when closed and highlights only while open,
  - active theme indication is shown on menu entries (not persistent on closed trigger).

## Theme System Snapshot (Current)
- Central theme registry: `src/styles/themes.js`.
- Built-in presets:
  - `light`, `dark`, `sepia`, `midnight`, `solarized`, `nord`, `high-contrast`.
- Theme metadata is exposed for UI consumers via:
  - `getEditorThemeList()` (includes `id`, `label`, `description`, `scheme`, `swatch`),
  - `EDITOR_THEME_PRESETS` export from `src/index.js`.
- Runtime API in `EditorCore`:
  - `setTheme(theme)`,
  - `getTheme()`,
  - `getAvailableThemes()`.
- Web component proxy methods:
  - `setTheme`, `getTheme`, `getAvailableThemes`.
- Style composition:
  - `src/styles/editorStyles.js` consumes tokens and injects generated theme CSS via `buildEditorThemeStyles()`,
  - `auto` maps to OS dark preference only when `data-theme` is not set.
- Compatibility panel status colors and scrollbars are theme-token driven (`--se-color-compat-*`, `--se-color-scrollbar-*`).

## Compatibility Snapshot (Current)
- Compatibility engine is integrated in `EditorCore` with:
  - `CompatibilityService` (`src/core/compat/CompatibilityService.js`),
  - profile factories (`src/core/compat/CompatibilityProfiles.js`),
  - table rule (`src/core/compat/rules/TableCompatibilityRule.js`).
- Default compatibility profile is Eleventy-like and supports:
  - markdown-it options (`html`, `breaks`, `linkify`),
  - disabled rules (`disableRules`, default `['emphasis']`),
  - plugin injection via `compatibility.plugins`,
  - Eleventy-style image resize markers from alt text (`#320px`, `#50%`).
- `EditorCore` compatibility APIs:
  - `getCompatibilityReport`, `getCompatibilityStatus`, `isCompatibilityEnabled`,
  - `setCompatibilityEnabled`, `setCompatibilityProfile`, `validateCompatibility`,
  - `proposeCompatibilityFix`, `proposeAllCompatibilityFixes`.
- Compatibility issue panel (`src/ui/CompatibilityPanel.js`):
  - status badge + summary + fix actions,
  - per-issue code badge,
  - click issue text to jump to source line,
  - scrollable issue list viewport (about three visible rows) with themed scrollbar.
- Table compatibility issue codes:
  - `table.missing-leading-pipe`
  - `table.missing-trailing-pipe`
  - `table.column-count-mismatch`
  - `table.invalid-separator-row`

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

### 2026-03-23 sync and insertion refinements
- Toolbar insertion behavior is now consistent for empty selection:
  - headings/blockquote/lists keep cursor right after inserted prefix,
  - table action selects `Col 1` placeholder in header row,
  - code block action selects `code here` placeholder when inserted.
- Preview click -> code navigation now keeps preview stable (source lock marked as `preview`) and restores temporary clicked-line highlight.
- Code click/cursor -> preview navigation uses cursor viewport ratio; preview click -> code navigation uses click viewport ratio.
- Large preview blocks still fall back to top anchoring, and both directions include dead-zone thresholds to suppress tiny jitter scroll corrections.
- Typing now temporarily suppresses sync (debounced) to prevent disorienting jumps while editing.

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
- Replace-all diff highlight was refined to mark only the true changed span
  (common prefix/suffix trimmed), while keeping both columns on neutral background.
- Files involved:
  - `src/core/EditorCore.js`
  - `src/ui/DiffModal.js`
  - `src/styles/editorStyles.js`
  - `src/adapters/WebComponent.js`
  - `README.md`
  - `demo/index.html`

## Preview Image UX Fixes (branch: deleting-images-fix)
- Deleting an image selected in preview now removes the corresponding markdown **image token**
  (e.g. `![alt](src)` or draw.io `![draw.io](src){xml}`), not just a single character and not the whole line by default.
- `EditorCore` tracks selected preview image state via `.se-preview-image-selected` and handles
  `Delete`/`Backspace` with a document-level `keydown` listener in capture phase to prevent
  CodeMirror from consuming the key first.
- Token lookup is constrained to the mapped `data-source-line` / `data-source-line-end` block,
  preserving source/preview sync semantics.
- Image resize handle positioning in `ImageResize` was corrected for `position: fixed` coordinates:
  viewport-space values are used directly (no `window.scrollX/window.scrollY` offsets), so the
  handle stays anchored in the image corner.

## Syntax-Highlighted Code Blocks (branch: colored-code)

### highlight.js integration
- highlight.js is imported tree-shaken in `src/core/Parser.js`; 35 languages are registered explicitly.
- Fenced code blocks are rendered with per-line `<span data-source-line="N">` wrappers inside `<code class="hljs language-X">` so code-preview scroll sync continues to work.
- Full hljs token CSS is defined in `src/styles/editorStyles.js` using theme-aware `--se-color-hljs-*` custom properties.

### Code block toolbar overlay
- Each rendered code block is wrapped in `<div class="se-code-block">` (relative-positioned).
- A floating `<div class="se-code-block__toolbar">` is absolutely positioned top-right, opacity-0 by default, visible on hover/focus-within (always visible on touch via `@media (hover: none)`).
- Toolbar contains:
  1. `<select class="se-code-block__lang-select">` — 35 options generated from `SUPPORTED_CODE_LANGUAGE_OPTIONS`.
  2. `<button class="se-code-block__copy-btn">` — icon-only, `title="Copy"`, 26×26 px, mask-image SVG icon.
- HTML generation is in `Parser._renderCodeBlockToolbar(selectedLang, srcLine)`.

### Language switcher
- `EditorCore` listens to `change` on `.se-code-block__lang-select` via `_boundPreviewLanguageChange`.
- Language change calls `_setCodeFenceLanguage(line0, language)` which uses `CodePanel.replaceRange(from, to, text)` — a range edit without cursor move.
- `CodePanel.replaceRange()` does not modify selection; it is a pure document patch.

### Copy button
- Click handled in `PreviewPanel._handleCopyClick(btn)` before the `data-source-line` navigation logic.
- Uses `navigator.clipboard.writeText(codeEl.textContent)`; silently ignores clipboard permission errors.
- On success: adds `.is-copied` class (switches icon to checkmark, color to `--se-color-success`), resets after 1.5 s.

### Preview stability lock (scroll-jump fix)
- Root cause: changing a code fence language triggers a 150 ms debounced `_updatePreview()`, which swaps `innerHTML`. The new DOM has small KaTeX placeholders, shrinking the document and clamping `scrollTop`.
- Fix: pin+poll mechanism.
  - Before `replaceRange`: call `_beginPreviewStabilityLock(scrollTop)` — freezes `_suspendCodeToPreviewSync`, calls `PreviewPanel.suspendScrollCallbacks()`, stores `_pinPreviewScrollTop` + `_previewPinDeadline`.
  - Inside `_updatePreview()`, after `_renderMath()`: `_applyPinnedPreviewScroll()` restores `scrollTop`.
  - After `replaceRange`: `_schedulePreviewStabilityUnlock(220)` — waits 220 ms, then polls every 90 ms until `_hasPendingPreviewAsyncWork()` is false or 1200 ms deadline expires, then calls `_finalizePreviewStabilityLock()`.
  - `_pendingMermaidRenders` counter tracks async Mermaid SVG renders; each `_renderMermaid()` call calls `_applyPinnedPreviewScroll()` in `finally`.
  - `_pendingPreviewImageLoads` counter tracks unloaded `<img>` elements via `load`/`error` listeners (scoped to render cycle via `_previewRenderCycleId`).
- Key private fields: `_pinPreviewScrollTop`, `_previewPinDeadline`, `_pendingMermaidRenders`, `_pendingPreviewImageLoads`, `_previewRenderCycleId`, `_suspendCodeToPreviewSync`.

### Files involved
- `src/core/Parser.js` — highlight.js, per-line spans, `_renderCodeBlockToolbar()`
- `src/ui/CodePanel.js` — `replaceRange(from, to, text, opts)` method
- `src/core/EditorCore.js` — `_setCodeFenceLanguage()`, stability lock helpers, event wiring
- `src/ui/PreviewPanel.js` — scroll suspension API, `_handleCopyClick()`, DOMPurify `ADD_TAGS` updated
- `src/styles/editorStyles.js` — hljs token CSS, toolbar layout, copy button with icon states

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
- Date: 2026-03-25
- Reason: added syntax-highlighted code blocks in preview (highlight.js, language switcher, copy button, scroll-jump stability lock).
