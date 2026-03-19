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
- Respect undo semantics in write operations (`undoable=false` must avoid history insertion where applicable).
- In `Toolbar`, keep action rendering deterministic by `group` and `order`; avoid implicit ordering side effects.
- Ensure every component that attaches listeners/timers cleans them in `destroy()`.
