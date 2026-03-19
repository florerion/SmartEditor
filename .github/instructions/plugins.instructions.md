---
description: "Use when creating or updating toolbar/plugin actions, plugin utilities, image upload flows, draw.io actions, or markdown-it integration glue in src/plugins."
name: "Plugin Action Rules"
applyTo: "src/plugins/**"
---
# Plugin Action Rules

- Implement new editor behavior as toolbar/plugin actions where possible, instead of embedding logic directly in UI components.
- Follow `registerAction` schema: include stable `id`, meaningful `group`, deterministic `order`, and `run(api, state, args?)`.
- Keep actions side-effect aware: prefer API methods (`replaceSelection`, `insertText`, `setMarkdown`) over direct DOM manipulation.
- Use shared helpers from `src/plugins/utils.js` when behavior matches existing patterns (`wrapSelection`, `prependLines`).
- For async actions (fetch/upload), handle failures gracefully and avoid partial document corruption.
- Preserve markdown-first output compatibility with `markdown-it` and Eleventy pipeline assumptions.
- Keep plugin files focused; avoid mixing unrelated action groups in one module.
