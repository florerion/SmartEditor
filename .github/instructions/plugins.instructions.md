---
description: "Use when creating or updating toolbar/plugin actions, plugin utilities, image upload flows, draw.io actions, or markdown-it integration glue in src/plugins."
name: "Plugin Action Rules"
applyTo: "src/plugins/**"
---
# Plugin Action Rules

- Implement new editor behavior as toolbar/plugin actions where possible, instead of embedding logic directly in UI components.
- Follow `registerAction` schema: include stable `id`, meaningful `group`, deterministic `order`, and `run(api, state, args?)`.
- Keep actions side-effect aware: prefer API methods (`replaceSelection`, `insertText`, `setMarkdown`) over direct DOM manipulation.
- When an action rewrites the whole document via `setMarkdown(...)`, prefer `setMarkdown(next, { preservePreviewScroll: true })` to avoid preview jumps.
- Use shared helpers from `src/plugins/utils.js` when behavior matches existing patterns (`wrapSelection`, `prependLines`).
- For async actions (fetch/upload), handle failures gracefully and avoid partial document corruption.
- For async actions (fetch/upload), prefer wrapping work in `api.runWithBusy(...)` so lock/spinner/cancel behavior stays consistent with editor core.
- When async actions are cancellable, honor `AbortSignal` from `runWithBusy` context and handle `AbortError` as a non-fatal user cancel path.
- `AssetUploadHandler` upload options: `endpoint` (default POST URL fallback), `endpoints` (per-type URL map by MIME/wildcard/extension; first matching key wins), `headers`, `credentials` (fetch credentials mode: `omit`/`same-origin`/`include`), `extraFields` (extra FormData entries appended to every request — use this for e.g. Cloudinary `upload_preset`), `responseUrlField` (JSON key holding the returned URL, defaults to `'url'`; Cloudinary uses `'secure_url'`).
- Keep non-image attachment behavior strict: no base64 fallback for non-image files when no endpoint resolves or upload fails; surface failure via `onUploadError`/UI feedback instead of inserting data-URI links.
- Preserve markdown-first output compatibility with `markdown-it` and Eleventy pipeline assumptions.
- Keep plugin files focused; avoid mixing unrelated action groups in one module.
