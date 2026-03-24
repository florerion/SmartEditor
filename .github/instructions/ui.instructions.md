---
description: "Use when editing UI panels/components, toolbar rendering, preview sanitization/rendering, modal dialogs, or CodeMirror wrapper behavior under src/ui."
name: "UI Component Rules"
applyTo: "src/ui/**"
---
# UI Component Rules

- Keep UI modules component-scoped: each class should own only its container, listeners, and rendering logic.
- In `PreviewPanel`, preserve sanitization and sync attributes; do not remove `data-source-line` / `data-source-line-end` support.
- When adding preview attributes required by features, update DOMPurify allowlist deliberately and minimally.
- Preserve scroll position on preview re-render unless a feature explicitly requires scroll reset.
- In `CodePanel`, keep editor-facing selection/line behavior 0-based and compatible with `EditorCore` APIs.
- Keep `CodePanel.scrollToLineAtRatio(...)` / `getCursorViewportRatio()` semantics stable for click-based sync alignment.
- Preserve dead-zone guard in ratio-based code scrolling to avoid micro-jitter.
- Respect undo semantics in write operations (`undoable=false` must avoid history insertion where applicable).
- In `Toolbar`, keep rendering deterministic:
	- action-derived fallback mode should still respect `group` and `order`,
	- declarative mode should follow explicit `toolbar.groups/items` order only.
- Preserve dropdown UX safeguards in `Toolbar` (hover bridge + delayed close + click/focus support); avoid immediate close on transient pointer gaps.
- For theme UI, source options from `getAvailableThemes()` / `getEditorThemeList()` metadata (including `swatch`) instead of duplicating color literals in toolbar/demo.
- Keep theme dropdown visual behavior stable:
	- item-level active state is highlighted in menu,
	- dropdown trigger highlights only while open.
- Ensure every component that attaches listeners/timers cleans them in `destroy()`.
- In `ImageResize`, keep handle anchoring consistent with `position: fixed` (viewport coordinates only); avoid adding page scroll offsets that shift the handle below the image.
- Preserve preview image selection affordance class (`.se-preview-image-selected`) used by core keyboard-delete flow.
- In `PreviewPanel`, keep click payload data enriched with `viewportRatio` for ratio-aware preview->code navigation.
- For `DiffModal` used by `proposeChange`, preserve full-document comparison with explicit highlight ranges for replaced/inserted content and cursor marker rendering for insert mode previews.
- In diff preview styles, keep non-changed column background neutral; reserve red/green emphasis for highlighted changed fragments only.
- For `CompatibilityPanel`, preserve UX contracts:
	- issue list is scrollable with a viewport around three visible rows,
	- scrollbar colors must respect theme tokens (`--se-color-scrollbar-*`),
	- each issue shows a code badge and supports click-to-jump behavior,
	- fix actions remain separate buttons and should not conflict with jump click targets.
- Keep UI naming consistent with current conventions:
	- classes/selectors use `se-*`,
	- style variables use `--se-*`,
	- do not introduce new `mde-*` class/variable names.
