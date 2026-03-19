# Copilot Context Bootstrap

Purpose: portable project context for switching machines/accounts/subscriptions.

## Repository
- Name: `md-wysiwyg-editor`
- Workspace root: `c:\projects\md-wysiwyg-editor`
- GitHub remote mentioned in repo memory: `florerion/SmartEditor`

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

## Build And Validation
- Install deps: `npm install`
- Build: `npm run build`
- Dev watch: `npm run dev`
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
- Date: 2026-03-19
- Reason: cross-account context transfer bootstrap
