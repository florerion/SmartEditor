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
