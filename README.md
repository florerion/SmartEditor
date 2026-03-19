# md-wysiwyg-editor

A framework-agnostic Markdown editor for web apps with split code/preview UX, runtime API, extensible toolbar actions, markdown-it parsing, and source-line synchronization.

This document is for developers integrating the editor into their own application. It is not an end-user guide for writing Markdown.

## Contents

- Getting Started
- Embedding the Editor on a Page
- Configuration Options
- Runtime API
- Events and Callback Usage
- Built-in Plugins and Features
- Extending Functionality (Custom Toolbar Buttons)
- Versioned API Changes
- Markdown Compatibility Notes
- Security Notes
- License
- Development Commands
- Troubleshooting

## Getting Started

### Requirements

- Modern browser with ES module support.
- A container element with explicit height (important for CodeMirror layout).
- Optional globals for enhanced preview:
  - `window.mermaid` for Mermaid rendering.
  - KaTeX CSS for math rendering visuals.

### Install dependencies (project development)

```bash
npm install
```

### Build

```bash
npm run build
```

Build output is written to `dist/`:

- `dist/md-editor.esm.js`
- `dist/md-editor.cjs.js`
- `dist/md-editor.iife.js`

## Embedding the Editor on a Page

### Option A: Vanilla JS (`createEditor`)

```html
<div id="editor" style="height: 600px;"></div>

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({ startOnLoad: false });
</script>

<script type="module">
  import { createEditor } from './dist/md-editor.esm.js';

  const editor = createEditor('#editor', {
    value: '# Hello',
    mode: 'split',
    onChange: (markdown, tokens, html) => {
      console.log(markdown.length, tokens.length);
    },
  });

  window.editor = editor;
</script>
```

### Option B: Web Component (`<md-editor>`)

Importing the library registers the custom element as a side effect.

```html
<md-editor id="mde" mode="split" theme="auto" style="height: 600px;"></md-editor>

<script type="module">
  import './dist/md-editor.esm.js';

  const el = document.getElementById('mde');
  el.setMarkdown('# Initial content');

  el.addEventListener('mde-change', (e) => {
    console.log(e.detail.markdown);
  });
</script>
```

## Configuration Options

`createEditor(element, options)` and `new EditorCore(element, options)` use the same options schema.

| Option | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | `''` | Initial markdown content. |
| `mode` | `'split' \| 'code' \| 'preview' \| 'wysiwyg'` | `'split'` | Initial view mode (`wysiwyg` is preview-first beta mode). |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Theme hint (`data-theme` on root). |
| `markdown.options` | `object` | `{}` | Options passed to `markdown-it`. |
| `markdown.plugins` | `Array` | `[]` | Extra markdown-it plugins: `[[pluginFn, pluginOpts?], ...]`. |
| `upload.endpoint` | `string` | `undefined` | Image upload endpoint (`POST`, expects `{ url }`). |
| `upload.headers` | `object` | `{}` | Headers for upload requests (e.g. auth). |
| `upload.maxSize` | `number` | `5 * 1024 * 1024` | Max image size in bytes. |
| `upload.formats` | `string[]` | common image MIME list | Allowed image MIME types. |
| `drawio.url` | `string` | `https://embed.diagrams.net/?embed=1&spin=1&proto=json` | draw.io embed URL used by modal. |
| `onChange` | `function` | `undefined` | Called with `(markdown, tokens, html)`. |
| `onSelectionChange` | `function` | `undefined` | Called with current selection object. |
| `onPaste` | `function` | `undefined` | Native paste event hook. |
| `onUploadStart` | `function` | `undefined` | Called with `(file)`. |
| `onUploadDone` | `function` | `undefined` | Called with `(file, urlOrBase64)`. |
| `onUploadError` | `function` | `undefined` | Called with `(file, error)`. |
| `onPreviewClick` | `function` | `undefined` | Called with `(element, { from, to })`. |
| `onCommand` | `function` | `undefined` | Called before `runCommand(id, args)`. |

### Example: upload + parser plugins

```js
const editor = createEditor('#editor', {
  value: '# Content',
  upload: {
    endpoint: '/api/upload',
    headers: { Authorization: `Bearer ${token}` },
    maxSize: 8 * 1024 * 1024,
    formats: ['image/png', 'image/jpeg', 'image/webp'],
  },
  markdown: {
    options: { html: true, linkify: true, typographer: true },
    plugins: [
      [someMarkdownItPlugin, { someOption: true }],
    ],
  },
});
```

## Runtime API

Returned editor instance (or `<md-editor>` proxies) provides:

| Method | Signature | Description |
|---|---|---|
| `getMarkdown` | `() => string` | Get current markdown string. |
| `setMarkdown` | `(markdown, opts?)` | Replace full document. `opts.undoable=false` skips undo history entry. |
| `getTokens` | `() => object[]` | Get markdown-it token array for current markdown. |
| `getPreview` | `() => string` | Get sanitized preview HTML. |
| `getSelection` | `() => { from, to, text, lineFrom, lineTo }` | Current selection info (`line*` are 0-based). |
| `setSelection` | `(from, to)` | Set selection by character offsets. |
| `insertText` | `(text, position?)` | Insert text at cursor or explicit offset. |
| `replaceSelection` | `(text)` | Replace current selection. |
| `undo` | `()` | Undo in code editor. |
| `redo` | `()` | Redo in code editor. |
| `focus` | `()` | Focus code editor. |
| `setMode` | `(mode)` | Switch mode: `split`, `code`, `preview`, `wysiwyg`. |
| `getMode` | `() => mode` | Read current mode. |
| `registerAction` | `(actionDef)` | Register custom toolbar action. |
| `unregisterAction` | `(id)` | Remove custom toolbar action. |
| `runCommand` | `(id, args?)` | Run action by id programmatically. |
| `openDrawioEditor` | `(opts?) => Promise<boolean>` | Open draw.io modal and insert/update fenced block. |
| `proposeChange` | `(newMarkdown) => Promise<boolean>` | Open diff modal and apply if accepted. |
| `destroy` | `()` | Dispose editor instance and listeners. |

### Example: programmatic content proposal

```js
const accepted = await editor.proposeChange('# Suggested update\n\nGenerated text...');
if (accepted) {
  console.log('Applied');
}
```

## Events and Callback Usage

### JS callback options (`createEditor`)

```js
const editor = createEditor('#editor', {
  onChange(markdown, tokens, html) {
    // Persist markdown or update app state
  },
  onSelectionChange(sel) {
    // sel: { from, to, text, lineFrom, lineTo }
  },
  onPreviewClick(element, range) {
    // range: { from, to }
  },
  onUploadStart(file) {
    console.log('Uploading:', file.name);
  },
  onUploadDone(file, value) {
    // value is URL (upload success) or base64 fallback
  },
  onUploadError(file, error) {
    console.warn(error.message);
  },
  onCommand(id, args) {
    console.log('Action run:', id, args);
  },
});
```

### Web Component events

`<md-editor>` emits CustomEvents:

- `mde-change`: `detail = { markdown, tokens, html }`
- `mde-selection-change`: `detail = { from, to, text, lineFrom, lineTo }`
- `mde-preview-click`: `detail = { element, lineRange: { from, to } }`

```js
const el = document.querySelector('md-editor');

el.addEventListener('mde-change', (e) => {
  console.log(e.detail.markdown);
});

el.addEventListener('mde-preview-click', (e) => {
  console.log(e.detail.lineRange.from);
});
```

## Built-in Plugins and Features

The editor auto-registers built-in toolbar actions grouped by intent.

### Inline formatting

- `bold`
- `italic`
- `strikethrough`
- `inline-code`

### Block structure

- `h1`, `h2`, `h3`
- `blockquote`
- `hr`
- `code-block`

### Lists

- `ul`
- `ol`
- `task-list`

### Insert tools

- `link`
- `image` (URL prompt)
- `image-upload` (file picker + paste/drop support)
- `table` (dialog)
- `mermaid`
- `drawio`

### Parser-level extensions included in core

- Source line mapping attributes for code-preview sync.
- Table cell source-column metadata.
- Fenced `drawio` block rendering with edit button.
- Fenced `mermaid` block placeholders rendered with Mermaid (if present).
- Inline/block math placeholders rendered with KaTeX post-processing.
- Image alt resize syntax: `![alt|320x180](url)` -> `<img width="320" height="180">`.

## Extending Functionality (Custom Toolbar Buttons)

Use `registerAction` to add custom actions to the toolbar.

### Action schema

```ts
{
  id: string,
  label?: string,
  icon?: string,      // SVG string or text
  title?: string,
  group?: string,     // default: 'default'
  order?: number,     // default: 50
  shortcut?: string,  // display only
  isEnabled?: (state) => boolean,
  isActive?: (state) => boolean,
  run: async (api, state, args?) => void,
}
```

### `api` object available in actions

- `getMarkdown`, `setMarkdown`
- `getTokens`, `getPreview`
- `getSelection`, `setSelection`
- `insertText`, `replaceSelection`
- `runCommand`
- `openDrawioEditor`
- `focus`

### `state` object available in actions

- `state.selection`
- `state.markdown`
- `state.cursorLine`

### Example: async custom action

```js
editor.registerAction({
  id: 'insert-suggestion',
  title: 'Insert suggestion',
  label: 'AI',
  group: 'custom',
  order: 200,
  async run(api, state) {
    const res = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: state.markdown }),
    });

    const { suggestion } = await res.json();
    api.replaceSelection(suggestion || 'No suggestion');
  },
});
```

To remove it later:

```js
editor.unregisterAction('insert-suggestion');
```

## Markdown Compatibility Notes

The editor is designed to keep markdown output compatible with markdown-it based pipelines.

- Core parser is markdown-it with configurable options/plugins.
- Generated markdown remains plain markdown text.
- draw.io and Mermaid integrations are represented as fenced blocks.
- Image resizing metadata is encoded in alt text using `|WxH` suffix.

## Security Notes

- Preview HTML is sanitized with DOMPurify before rendering.
- If you add custom parser output attributes/tags needed in preview, update the allowlist in `src/ui/PreviewPanel.js`.
- Upload endpoint must validate file type/size server-side as well.

## License

This project is licensed under the MIT License. See `LICENSE` for details.

## Versioned API Changes

Use this section as a compatibility reference when upgrading the editor in host applications.

### `0.1.0`

- Initial public integration surface:
  - Factory: `createEditor(element, options)`
  - Exports: `EditorCore`, `MdEditorElement`
  - Web Component registration: `<md-editor>`
- Runtime API includes document ops, selection ops, mode switching, action registration, draw.io modal, and diff-based `proposeChange`.
- Core options include markdown-it configuration, upload configuration, draw.io URL override, and integration callbacks.
- Built-in action groups include inline formatting, blocks, lists, links/images, table/mermaid/draw.io, and image upload.
- Parser support includes source-line mapping, table cell metadata, Mermaid/KaTeX placeholders, draw.io fenced blocks, and image dimension syntax (`|WxH`).

### Upgrade Notes

- Treat any removal or signature change in methods listed under `Runtime API` as breaking.
- Treat callback signature changes in `Configuration Options` as breaking.
- Treat changes to markdown serialization conventions (`drawio` fenced blocks, image `|WxH`) as breaking for downstream pipelines.
- Prefer additive changes for custom action integrations: add new action IDs instead of mutating existing IDs used by host automation.

## Development Commands

```bash
npm install
npm run build
npm run dev
```

To run the demo, serve from repository root (not from `demo/`):

```bash
npx serve .
```

Then open `/demo/` in the browser.

## Troubleshooting

### Editor is blank or layout is broken

Ensure the editor container has explicit height, for example:

```html
<div id="editor" style="height: 600px;"></div>
```

### Mermaid blocks stay as raw code

Ensure Mermaid script is loaded and initialized on the page (`window.mermaid`).

### Math blocks render as placeholders or plain text

Ensure KaTeX CSS is loaded. (KaTeX rendering is run by core, CSS controls visual output.)

### Images do not upload

If `upload.endpoint` is missing or fails, the editor falls back to base64 insertion. Configure endpoint + auth headers for URL-based image links.

### React usage

A React adapter exists at `src/adapters/react/MdEditor.jsx`. In the current build exports, the main package entry exports `createEditor`, `EditorCore`, and `MdEditorElement`.
