# Project Guidelines

## Code Style
- Use vanilla JavaScript with ES modules (`type: module`) and class-based components.
- Keep JSDoc on exported APIs and public methods (params, returns, examples where useful).
- Prefer small, focused methods and keep private helpers in `_camelCase` form.
- Add short comments only where behavior is non-obvious.
- Edit source files under `src/`; treat `dist/` as build output.

## Architecture
- Public entrypoint is `src/index.js` (`createEditor`, `EditorCore`, `MdEditorElement`).
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
- Preserve sync mapping behavior: keep `data-source-line` / `data-source-line-end` support intact across parser and preview.
- If introducing new HTML attributes needed in preview, update DOMPurify allowlist in `src/ui/PreviewPanel.js`.
- Toolbar actions should follow `registerAction` schema (`id`, `group`, `order`, `run`, optional `isEnabled`/`isActive`).
- Selection line numbers in editor-facing APIs are 0-based.
- Respect undo semantics in `CodePanel.setValue(value, undoable)`; `undoable=false` must not add to history.
- Ensure components that add listeners or timers clean them up in `destroy()`.
