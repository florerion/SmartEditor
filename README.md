# Smart Editor

[![CI](https://github.com/florerion/SmartEditor/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/florerion/SmartEditor/actions/workflows/ci.yml)
[![Coverage](https://github.com/florerion/SmartEditor/actions/workflows/coverage.yml/badge.svg?branch=main)](https://github.com/florerion/SmartEditor/actions/workflows/coverage.yml)
[![GitHub release](https://img.shields.io/github/v/release/florerion/SmartEditor)](https://github.com/florerion/SmartEditor/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A framework-agnostic Markdown editor for web apps with split code/preview UX, runtime API, extensible toolbar actions, markdown-it parsing, and source-line synchronization.

This document is for developers integrating the editor into their own application. It is not an end-user guide for writing Markdown.

## Contents

- [Getting Started](#getting-started)
- [Supported Code Block Languages](#supported-code-block-languages)
- [Embedding the Editor on a Page](#embedding-the-editor-on-a-page)
- [Configuration Options](#configuration-options)
- [AI Assistant](#ai-assistant)
- [Runtime API](#runtime-api)
- [Events and Callback Usage](#events-and-callback-usage)
- [Built-in Plugins and Features](#built-in-plugins-and-features)
- [Extending Functionality (Custom Toolbar Buttons)](#extending-functionality-custom-toolbar-buttons)
- [Versioned API Changes](#versioned-api-changes)
- [Markdown Compatibility Notes](#markdown-compatibility-notes)
- [Security Notes](#security-notes)
- [License](#license)
- [Development Commands](#development-commands)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Requirements

- Modern browser with ES module support.
- A container element with explicit height (important for CodeMirror layout).
- Optional globals for enhanced preview:
  - `window.mermaid` for Mermaid rendering.
  - KaTeX CSS for math rendering visuals.
- Fenced code blocks with an explicit language, for example `javascript`, are syntax-highlighted in preview.

### Install dependencies (project development)

```bash
npm install
```

### Build

```bash
npm run build
```

Build output is written to `dist/`:

- `dist/smart-editor.esm.js`
- `dist/smart-editor.cjs.js`
- `dist/smart-editor.iife.js`

## Supported Code Block Languages

Syntax highlighting in preview is enabled for fenced code blocks with explicit language names, for example:

````markdown
```javascript
console.log('hello');
```
````

Supported language labels:

- `bash`
- `c`
- `cpp`
- `diff`
- `django`
- `dockerfile`
- `excel`
- `graphql`
- `handlebars`
- `http`
- `java`
- `javascript`
- `json`
- `kotlin`
- `lisp`
- `lua`
- `makefile`
- `markdown`
- `mathematica`
- `matlab`
- `nginx`
- `objectivec`
- `perl`
- `php`
- `plaintext`
- `powershell`
- `python`
- `ruby`
- `sql`
- `scala`
- `shell`
- `swift`
- `typescript`
- `xml`

Common aliases are accepted (for example `js`, `ts`, `html`, `sh`, `ps1`, `gql`, `md`, `objc`).

Special fallback:

- `curl` is mapped to `bash` highlighting.

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
  import { createEditor } from './dist/smart-editor.esm.js';

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

### Option B: Web Component (`<smart-editor>`)

Importing the library registers the custom element as a side effect.

```html
<smart-editor id="mde" mode="split" theme="auto" style="height: 600px;"></smart-editor>

<script type="module">
  import './dist/smart-editor.esm.js';

  const el = document.getElementById('mde');
  el.setMarkdown('# Initial content');

  el.addEventListener('se-change', (e) => {
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
| `scrollSync` | `boolean` | `true` | In `split` mode, synchronizes vertical scrolling between code and preview using smooth animated follow. |
| `theme` | `'auto' \| 'light' \| 'dark' \| 'sepia' \| 'midnight' \| 'solarized' \| 'nord' \| 'high-contrast'` | `'auto'` | Theme id applied to the editor root. `auto` follows the OS color scheme; the built-in presets can also be switched at runtime. |
| `markdown.options` | `object` | `{}` | Options passed to `markdown-it`. |
| `markdown.plugins` | `Array` | `[]` | Extra markdown-it plugins: `[[pluginFn, pluginOpts?], ...]`. |
| `upload.endpoint` | `string` | `undefined` | Default upload endpoint (`POST multipart/form-data`) used for all file types with no matching entry in `upload.endpoints`. Images fall back to base64 when omitted or on error; non-image files require an endpoint and are rejected without one. |
| `upload.endpoints` | `Object.<string,string>` | `undefined` | Per-type endpoint overrides. Keys can be a MIME type (`image/png`), a wildcard (`image/*`), or a file extension (`.pdf`). The first matching entry wins; unmatched files fall back to `upload.endpoint`. Example: `{ 'image/*': '/upload/image', 'application/pdf': '/upload/raw' }` |
| `upload.headers` | `object` | `{}` | Extra HTTP headers for upload requests (e.g. `Authorization`). |
| `upload.extraFields` | `object` | `{}` | Extra FormData fields appended to every upload (e.g. `{ upload_preset: 'my_preset' }` for Cloudinary unsigned upload). |
| `upload.responseUrlField` | `string` | `'url'` | JSON field in the upload response that holds the asset URL (e.g. `'secure_url'` for Cloudinary). |
| `upload.maxSize` | `number` | `5 * 1024 * 1024` | Max image size in bytes. |
| `upload.fileMaxSize` | `number` | `upload.maxSize` | Max non-image file size in bytes. |
| `upload.formats` | `string[]` | common image MIME list | Allowed image MIME types. |
| `upload.fileFormats` | `string[]` | `undefined` | Allowed non-image MIME types/extensions (for example `application/pdf`, `.docx`). If omitted, non-image files are accepted. |
| `upload.pickerAccept` | `string` | `*/*` | Value for file-picker `accept` attribute. |
| `drawio.url` | `string` | `https://embed.diagrams.net/?embed=1&proto=json&spin=1&ui=min&libraries=1` | draw.io embed URL used by modal. Set your own URL for self-hosted/offline mode. |
| `drawio.allowHostedFallback` | `boolean` | `true` | When `true`, editor retries with `https://embed.diagrams.net` if local/self-hosted draw.io fails to initialize. Set to `false` for strict offline mode. |
| `toolbar` | `object` | `undefined` | Declarative toolbar layout: visible items, grouping, ordering, display mode, and dropdown menus. |
| `busy.showDelay` | `number` | `140` | Delay (ms) before showing loading overlay (anti-flicker for very fast tasks). |
| `busy.minVisible` | `number` | `180` | Minimum overlay visibility time (ms) once shown, to avoid flashing. |
| `busy.texts.defaultLabel` | `string` | `'Working...'` | Default busy label used when task does not provide one. |
| `busy.texts.cancel` | `string` | `'Cancel'` | Cancel button label in the loading overlay. |
| `ai.enabled` | `boolean` | `false` | Enables the in-editor AI assistant panel and AI runtime API. |
| `ai.language` | `string` | `'pl'` | Default language metadata sent in AI requests. |
| `ai.provider` | `object` | `undefined` | Custom AI provider object implementing `send(request, opts)` and optional `isAvailable()`. When omitted, the editor uses the built-in Ollama provider. |
| `ai.promptRegistry` | `PromptRegistry` | `undefined` | Optional prompt registry used by built-in providers to build mode-specific prompt plans. |
| `ai.ollama.baseUrl` | `string` | `'http://localhost:11434'` | Base URL used by the built-in Ollama provider. |
| `ai.ollama.model` | `string` | `'qwen2.5:7b'` | Model name used by the built-in Ollama provider. |
| `ai.ollama.temperature` | `number` | `0.2` | Sampling temperature used by the built-in Ollama provider. |
| `compatibility.enabled` | `boolean` | `false` | Enables publishing-compatibility validation and suggested fixes. |
| `compatibility.showPanel` | `boolean` | `false` (auto `true` when enabled) | Shows built-in compatibility status panel above editor panes. |
| `compatibility.debounce` | `number` | `500` | Validation debounce in milliseconds while typing. |
| `compatibility.showPreviewUsingProfile` | `boolean` | `false` | When enabled, preview uses HTML generated by the compatibility profile. |
| `compatibility.markdownIt` | `object` | Eleventy-like defaults | markdown-it options for the built-in Eleventy compatibility profile. |
| `compatibility.plugins` | `Array` | `[]` | Extra markdown-it plugins for compatibility profile, e.g. `[[markdownItAnchor, opts]]`. |
| `compatibility.disableRules` | `string[]` | `['emphasis']` | markdown-it rules disabled by the built-in Eleventy compatibility profile. |
| `compatibility.profile` | `object` | Eleventy markdown-it profile | Custom profile implementing `render(markdown) => { html, tokens? }`. |
| `compatibility.rules` | `Array` | built-in table/fence/list/link rules | Validation/fix rules used by compatibility service. |
| `onChange` | `function` | `undefined` | Called with `(markdown, tokens, html)`. |
| `onSelectionChange` | `function` | `undefined` | Called with current selection object. |
| `onPaste` | `function` | `undefined` | Native paste event hook. |
| `onUploadStart` | `function` | `undefined` | Called with `(file)`. |
| `onUploadDone` | `function` | `undefined` | Called with `(file, urlOrBase64)`. |
| `onUploadError` | `function` | `undefined` | Called with `(file, error)`. |
| `onPreviewClick` | `function` | `undefined` | Called with `(element, { from, to })`. |
| `onCommand` | `function` | `undefined` | Called before `runCommand(id, args)`. |
| `onCompatibilityReport` | `function` | `undefined` | Called with latest compatibility report object. |
| `onCompatibilityStatusChange` | `function` | `undefined` | Called with `(status, report)` on status transitions. |
| `onCompatibilityFixApplied` | `function` | `undefined` | Called after user accepts compatibility fix proposal. |
| `onBusyChange` | `function` | `undefined` | Called with busy overlay state `{ busy, count, label, detail, scope, locked, canCancel, cancelToken }`. |
| `onAIResponse` | `function` | `undefined` | Called with `(result, request)` after a successful AI response. |
| `onAIError` | `function` | `undefined` | Called with `(error, request)` when AI request fails. |

## AI Assistant

The package includes built-in AI providers, but you can also supply your own provider through configuration.

### Minimal provider contract

A custom provider can be any object with this shape:

```js
const customProvider = {
  async isAvailable() {
    return true;
  },

  async send(request, opts = {}) {
    return {
      text: 'Short assistant response',
      suggestedMarkdown: '',
    };
  },
};
```

`send(request, opts)` receives:

```js
{
  mode: 'review-document' | 'improve-selection' | 'rewrite-selection' | 'chat',
  markdown: 'full current document',
  selection: {
    from: 10,
    to: 42,
    text: 'selected text',
    lineFrom: 3,
    lineTo: 5,
  },
  instruction: 'User instruction from assistant panel',
  language: 'pl',
}
```

`send()` should resolve to:

```js
{
  text: 'Human-readable assistant output',
  suggestedMarkdown: 'Optional markdown suggestion',
}
```

Notes:

- `text` is always shown in the assistant panel.
- `suggestedMarkdown` is optional, but when present it enables the "Apply Suggestion" flow.
- For `improve-selection` and `rewrite-selection`, `suggestedMarkdown` should usually contain only the replacement for the selected fragment.
- For `review-document`, `suggestedMarkdown` can be an empty string if you only want to return diagnostics.

### PromptRegistry

`PromptRegistry` centralizes mode-specific prompt templates. Built-in providers (`OllamaAIProvider`, `TokenAuthAIProvider`) can use one shared registry, so you can customize prompts in one place.

```js
import { PromptRegistry } from 'smart-md-editor';

const promptRegistry = new PromptRegistry({
  systemPrompt: 'You are an expert technical writing assistant for Markdown.',
});

promptRegistry.registerMode('improve-selection', {
  wantsJson: true,
  buildUserPrompt: (ctx) => [
    `Requested mode: ${ctx.mode}`,
    `Language: ${ctx.language}`,
    '',
    'Improve the selected fragment with a formal tone.',
    'Return strict JSON with fields: text, suggestedMarkdown.',
    '',
    `Selection:\n${ctx.selectionText}`,
    '',
    `Instruction:\n${ctx.instruction || 'Improve style and clarity.'}`,
  ].join('\n'),
});
```

You can pass it via editor configuration:

```js
const editor = createEditor('#editor', {
  ai: {
    enabled: true,
    promptRegistry,
  },
});
```

Or directly to built-in providers:

```js
import { OllamaAIProvider, TokenAuthAIProvider, OpenAICompatibleAIProvider } from 'smart-md-editor';

const ollamaProvider = new OllamaAIProvider({
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5:7b',
  promptRegistry,
});

const tokenProvider = new TokenAuthAIProvider({
  tokenUrl: 'https://auth.example.com/token',
  sendUrl: 'https://api.example.com/chat',
  promptRegistry,
});

const openaiProvider = new OpenAICompatibleAIProvider({
  apiKey: 'sk-...',
  model: 'gpt-4o',
  promptRegistry,
});
```

### Example: pass a custom provider in configuration

```js
import { createEditor } from 'smart-md-editor';

class MyAIProvider {
  async isAvailable() {
    const response = await fetch('/api/ai/health');
    return response.ok;
  }

  async send(request, opts = {}) {
    const response = await fetch('/api/ai/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: opts.signal,
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    return response.json();
  }
}

const editor = createEditor('#editor', {
  ai: {
    enabled: true,
    language: 'en',
    provider: new MyAIProvider(),
  },
});
```

### Example: replace provider at runtime

```js
import { OllamaAIProvider, TokenAuthAIProvider, OpenAICompatibleAIProvider } from 'smart-md-editor';

editor.setAIProvider(new OllamaAIProvider({
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5:7b',
}));

editor.setAIProvider(new TokenAuthAIProvider({
  tokenUrl: 'https://auth.example.com/token',
  sendUrl: 'https://api.example.com/chat',
  tokenBody: {
    client_id: 'demo-client',
    client_secret: 'demo-secret',
  },
}));

editor.setAIProvider(new OpenAICompatibleAIProvider({
  apiKey: 'sk-...',
  model: 'gpt-4o',
}));
```

### Built-in providers

- `OllamaAIProvider`: local Ollama integration.
- `TokenAuthAIProvider`: generic provider for backends that require fetching and refreshing an access token before inference requests.
- `OpenAICompatibleAIProvider`: OpenAI API and compatible services (Azure OpenAI, Ollama endpoint, etc.).

### `TokenAuthAIProvider` options

```js
import { TokenAuthAIProvider } from 'smart-md-editor';

const provider = new TokenAuthAIProvider({
  tokenUrl: 'https://auth.example.com/token',
  sendUrl: 'https://api.example.com/chat',
  tokenBody: {
    client_id: 'demo-client',
    client_secret: 'demo-secret',
  },
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `tokenUrl` | `string` | required | URL used to fetch an access token. |
| `sendUrl` | `string` | required | URL used for the AI inference request. |
| `tokenMethod` | `string` | `'POST'` | HTTP method used for the token request. |
| `tokenHeaders` | `Record<string,string>` | `{}` | Extra headers added to the token request. |
| `tokenBody` | `object \\| string \\| URLSearchParams \\| FormData` | `null` | Body sent to the token endpoint. Plain objects are serialized as JSON by default. |
| `tokenField` | `string` | `'access_token'` | Response field containing the token value. |
| `expiresInField` | `string` | `'expires_in'` | Response field containing token lifetime in seconds. |
| `expiresAtField` | `string` | `'expires_at'` | Response field containing absolute token expiry (timestamp or parseable date). |
| `refreshSkewMs` | `number` | `30000` | Token is refreshed before `send()` when expiry is closer than this threshold. |
| `authHeaderName` | `string` | `'Authorization'` | Header name used to send the token to the AI endpoint. |
| `authScheme` | `string` | `'Bearer'` | Prefix added before token value. Use empty string for raw token header. |
| `sendMethod` | `string` | `'POST'` | HTTP method used for the AI inference request. |
| `sendHeaders` | `Record<string,string>` | `{ Accept: 'application/json' }` | Extra headers added to the AI inference request. |
| `model` | `string` | `'generic-model'` | Model id passed to the default payload builder. |
| `temperature` | `number` | `0.2` | Temperature passed to the default payload builder. |
| `systemPrompt` | `string` | built-in writing assistant prompt | System prompt used by the default payload builder. |
| `buildSendPayload` | `(request, ctx) => object` | built-in implementation | Override payload construction for providers with a custom request format. |
| `parseSendResponse` | `(data, request) => { text, suggestedMarkdown }` | built-in implementation | Override response parsing for providers with a custom response format. |
| `parseTokenResponse` | `(data, ctx) => { token, expiresAtMs }` | built-in implementation | Override token parsing when your auth endpoint uses a non-standard response shape. |

Behavior notes:

- The provider caches the last token and refreshes it automatically before `send()` if it is expired or close to expiry.
- If the inference request returns `401` or `403`, the provider refreshes the token once and retries the request once.
- If `expires_at` is missing and `expires_in` is missing or invalid, the fallback token lifetime is 5 minutes.
- The default `buildSendPayload` and `parseSendResponse` handle a generic chat-style backend; override them when your API uses a different wire format.

### `OpenAICompatibleAIProvider` options

```js
import { OpenAICompatibleAIProvider } from 'smart-md-editor';

const provider = new OpenAICompatibleAIProvider({
  apiKey: 'sk-...', // Your OpenAI API key
  apiUrl: 'https://api.openai.com/v1/chat/completions', // Optional
  model: 'gpt-4o', // Optional
  temperature: 0.2, // Optional
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | required | OpenAI API key for authentication. |
| `apiUrl` | `string` | `'https://api.openai.com/v1/chat/completions'` | Endpoint URL. Works with OpenAI, Azure OpenAI, Ollama OpenAI endpoint, or any API with compatible interface. |
| `model` | `string` | `'gpt-4o'` | Model identifier sent to the API. |
| `temperature` | `number` | `0.2` | Sampling temperature (0–2). |
| `systemPrompt` | `string` | built-in writing assistant prompt | System prompt used by default PromptRegistry. |
| `promptRegistry` | `PromptRegistry` | default | Custom prompt registry for request templates. |
| `extraHeaders` | `Record<string,string>` | `{}` | Additional HTTP headers sent with every request. |

Behavior notes:

- Sends requests in OpenAI-compatible format: `{ model, messages, temperature, response_format (if JSON requested) }`.
- Expects responses in OpenAI format: `{ choices[0].message.content }`.
- Compatible with OpenAI, Azure OpenAI Embeddings, Ollama `/api/chat` endpoint (via OpenAI wrapper), and other OpenAI-compatible APIs.
- Automatically adds `Bearer` authorization header with the provided API key.

## Compatibility Quick Start (Eleventy)

Use this setup when your production publishing pipeline is Eleventy and you want editor preview/validation to match it as closely as possible.

```js
import { createEditor, createEleventyCompatibilityProfile } from 'smart-md-editor';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItCollapsible from 'markdown-it-collapsible';

const profile = createEleventyCompatibilityProfile({
  markdownIt: {
    html: true,
    breaks: true,
    linkify: true,
  },
  disableRules: ['emphasis'],
  plugins: [
    [markdownItAnchor, {
      permalink: true,
      permalinkSymbol: '',
      permalinkBefore: false,
    }],
    [markdownItCollapsible, {}],
  ],
});

const editor = createEditor('#editor', {
  compatibility: {
    enabled: true,
    showPanel: true,
    profile,
  },
});
```

Notes:
- Keep Eleventy and editor markdown-it options/plugins aligned.
- The compatibility panel supports per-issue jump + fix and batch fix flow.
- Built-in table diagnostics include: `table.missing-leading-pipe`, `table.missing-trailing-pipe`, `table.column-count-mismatch`, `table.invalid-separator-row`.

### Example: upload + parser plugins

```js
const editor = createEditor('#editor', {
  value: '# Content',
  scrollSync: true,
  busy: {
    showDelay: 160,
    minVisible: 220,
    texts: {
      defaultLabel: 'Przetwarzanie...',
      cancel: 'Anuluj',
    },
  },
  upload: {
    // Option A: custom backend
    endpoint: '/api/upload',
    headers: { Authorization: `Bearer ${token}` },
    maxSize: 8 * 1024 * 1024,
    formats: ['image/png', 'image/jpeg', 'image/webp'],
    fileFormats: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    pickerAccept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx',

    // Option B: Cloudinary unsigned direct upload (no backend needed)
    // endpoint: 'https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload',
    // extraFields: { upload_preset: 'YOUR_UPLOAD_PRESET' },
    // responseUrlField: 'secure_url',
    // maxSize: 10 * 1024 * 1024,
  },
  markdown: {
    options: { html: true, linkify: true, typographer: true },
    plugins: [
      [someMarkdownItPlugin, { someOption: true }],
    ],
  },
});
```

### Example: theme selection

```js
const editor = createEditor('#editor', {
  theme: 'sepia',
});

editor.setTheme('midnight');
console.log(editor.getAvailableThemes());
```

Built-in presets:

- `light`: neutral bright UI
- `dark`: neutral dark UI
- `sepia`: warm reading theme for long-form writing
- `midnight`: cool dark coding theme with stronger contrast
- `solarized`: classic balanced palette inspired by Solarized
- `nord`: cool arctic dark palette
- `high-contrast`: accessibility-focused very high contrast variant

## Runtime API

Returned editor instance (or `<smart-editor>` proxies) provides:

| Method | Signature | Description |
|---|---|---|
| `getMarkdown` | `() => string` | Get current markdown string. |
| `setMarkdown` | `(markdown, opts?)` | Replace full document. `opts.undoable=false` skips undo history entry. Use `opts.preservePreviewScroll=true` in toolbar/programmatic full-document rewrites to keep preview stable during render. |
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
| `setTheme` | `(theme) => string` | Switch theme to `auto` or one of the registered built-in theme ids. |
| `getTheme` | `() => string` | Read current theme id. |
| `getAvailableThemes` | `() => { id, label, description, scheme }[]` | List built-in theme metadata for selectors/settings UIs. |
| `isBusy` | `() => boolean` | Returns whether any tracked async task is currently active. |
| `getBusyState` | `() => object` | Returns current busy state snapshot. |
| `beginBusyTask` | `(opts?) => string` | Start a manual busy task and return its token. |
| `updateBusyTask` | `(token, patch) => void` | Update message/details for a running busy task. |
| `endBusyTask` | `(token) => void` | End a previously started busy task. |
| `cancelBusyTask` | `(token?) => void` | Cancel one busy task by token, or all when omitted. |
| `runWithBusy` | `(task, opts?) => Promise<any>` | Wrap an async task with loading overlay, lock, and optional cancellation signal. |
| `isAIAssistantEnabled` | `() => boolean` | Returns whether the AI assistant feature is enabled for the editor instance. |
| `isAIAssistantOpen` | `() => boolean` | Returns whether the AI assistant panel is currently open. |
| `openAIAssistantPanel` | `() => boolean` | Open the AI assistant panel. |
| `closeAIAssistantPanel` | `() => boolean` | Close the AI assistant panel. |
| `toggleAIAssistantPanel` | `() => boolean` | Toggle the AI assistant panel and return its new open state. |
| `setAIProvider` | `(provider) => void` | Replace the active AI provider at runtime. |
| `getAIProvider` | `() => object \| null` | Read the current AI provider instance. |
| `requestAIAssistant` | `(request) => Promise<{ mode, text, suggestedMarkdown }>` | Send an AI request programmatically using the active provider. |
| `registerAction` | `(actionDef)` | Register custom toolbar action. |
| `unregisterAction` | `(id)` | Remove custom toolbar action. |
| `getToolbarConfig` | `() => object \| null` | Get the current declarative toolbar config, if one is active. |
| `setToolbarConfig` | `(config) => void` | Replace the toolbar layout at runtime. |
| `updateToolbarConfig` | `(mutator) => object` | Mutate current toolbar config via callback and apply it. |
| `upsertToolbarGroup` | `(group) => object` | Add or replace one toolbar group by id. |
| `removeToolbarGroup` | `(groupId) => object` | Remove one toolbar group by id. |
| `upsertToolbarItem` | `(groupId, item, position?) => object` | Add or replace one top-level group item. |
| `removeToolbarItem` | `(groupId, itemId) => object` | Remove one top-level group item by id. |
| `upsertDropdownItem` | `(groupId, dropdownId, item, position?) => object` | Add or replace one dropdown entry. |
| `removeDropdownItem` | `(groupId, dropdownId, itemId) => object` | Remove one dropdown entry by id. |
| `runCommand` | `(id, args?)` | Run action by id programmatically. |
| `openDrawioEditor` | `(opts?) => Promise<boolean>` | Open draw.io modal and insert/update `![draw.io](image){xml}` block line. |
| `proposeChange` | `(newMarkdown, opts?) => Promise<boolean>` | Open diff modal and apply if accepted. Supports `opts.mode`: `replace-all`, `replace-selection`, `insert-at-cursor`. |
| `getCompatibilityReport` | `() => object` | Get latest compatibility report (`disabled`, `valid`, `warning`, `invalid`). |
| `getCompatibilityStatus` | `() => 'disabled' \| 'valid' \| 'warning' \| 'invalid'` | Get current compatibility status. |
| `isCompatibilityEnabled` | `() => boolean` | Check whether compatibility mode is active. |
| `setCompatibilityEnabled` | `(enabled) => object` | Enable/disable compatibility mode and return latest report. |
| `setCompatibilityProfile` | `(profile) => object` | Replace compatibility profile and revalidate when enabled. |
| `validateCompatibility` | `(opts?) => object` | Run compatibility validation manually. |
| `proposeCompatibilityFix` | `(issueId) => Promise<boolean>` | Propose/apply one issue fix through diff modal. |
| `proposeAllCompatibilityFixes` | `() => Promise<boolean>` | Propose/apply one combined fix for all fixable issues. |
| `destroy` | `()` | Dispose editor instance and listeners. |

### Example: programmatic content proposal

```js
const accepted = await editor.proposeChange('# Suggested update\n\nGenerated text...');
if (accepted) {
  console.log('Applied');
}
```

### Example: wrapping custom async work with loading state

```js
await editor.runWithBusy(async ({ signal, update }) => {
  update({ label: 'Downloading template...', detail: 'Template: weekly-report' });

  const response = await fetch('/api/templates/weekly-report', { signal });
  const markdown = await response.text();
  editor.replaceSelection(markdown);
}, {
  label: 'Downloading template...',
  detail: 'Template: weekly-report',
  lock: true,
  cancellable: true,
});
```

### Example: programmatic AI request

```js
const result = await editor.requestAIAssistant({
  mode: 'improve-selection',
  instruction: 'Make this paragraph shorter and clearer.',
});

console.log(result.text);
console.log(result.suggestedMarkdown);
```

### Example: proposal apply modes

```js
await editor.proposeChange('# Full replacement', { mode: 'replace-all' });
await editor.proposeChange('only this part', { mode: 'replace-selection' });
await editor.proposeChange(' inserted chunk ', { mode: 'insert-at-cursor' });
```

- `replace-selection` falls back to `insert-at-cursor` when no text is selected.
- In `insert-at-cursor`, insertion happens at the end of the current selection/cursor (`selection.to`).

### Theme helpers export

```js
import { EDITOR_THEME_PRESETS, getEditorThemeList } from 'smart-md-editor';

console.log(Object.keys(EDITOR_THEME_PRESETS));
console.log(getEditorThemeList());
```

If you want to add another built-in theme in the source tree, define its token set in `src/styles/themes.js`; the editor stylesheet consumes that registry automatically.

## Events and Callback Usage

### Compatibility callbacks example

```js
const editor = createEditor('#editor', {
  compatibility: {
    enabled: true,
  },
  onCompatibilityStatusChange(status, report) {
    console.log(status, report.summary);
  },
});

const report = editor.validateCompatibility();
if (report.issues[0]?.fixable) {
  await editor.proposeCompatibilityFix(report.issues[0].id);
}
```

### Compatibility profile example (Eleventy-like)

```js
import markdownItAnchor from 'markdown-it-anchor';
import markdownItCollapsible from 'markdown-it-collapsible';

const editor = createEditor('#editor', {
  compatibility: {
    enabled: true,
    markdownIt: {
      html: true,
      breaks: true,
      linkify: true,
    },
    disableRules: ['emphasis'],
    plugins: [
      [markdownItAnchor, {
        permalink: true,
        permalinkSymbol: '',
        permalinkBefore: false,
      }],
      [markdownItCollapsible, {}],
    ],
  },
});
```

The built-in Eleventy compatibility profile already includes an image resize plugin compatible with `#320px` / `#50%` markers in image alt text.

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
    // value is URL (upload success) or base64 fallback.
    // Images become ![](...), other files become [file.name](...).
  },
  onUploadError(file, error) {
    console.warn(error.message);
  },
  onCommand(id, args) {
    console.log('Action run:', id, args);
  },
  onBusyChange(state) {
    // state.busy, state.label, state.detail, state.canCancel
    console.log('Busy:', state);
  },
});
```

### Web Component events

`<smart-editor>` emits CustomEvents:

- `se-change`: `detail = { markdown, tokens, html }`
- `se-selection-change`: `detail = { from, to, text, lineFrom, lineTo }`
- `se-preview-click`: `detail = { element, lineRange: { from, to } }`
- `se-busy-change`: `detail = { busy, count, label, detail, scope, locked, canCancel, cancelToken }`
- `se-ai-response`: `detail = { result, request }`
- `se-ai-error`: `detail = { error, request }`

```js
const el = document.querySelector('smart-editor');

el.addEventListener('se-change', (e) => {
  console.log(e.detail.markdown);
});

el.addEventListener('se-preview-click', (e) => {
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
- `asset-upload` (asset picker + paste/drop support; images -> markdown image, files -> markdown link)
- `table` (dialog)
- `mermaid`
- `drawio`

### Parser-level extensions included in core

- Source line mapping attributes for code-preview sync.
- Split-mode bidirectional smooth vertical scroll sync between code and preview (`scrollSync`, enabled by default).
- Table cell source-column metadata.
- `draw.io` image block rendering from `![draw.io](image){xml}` with click-to-edit in preview.
- Fenced `mermaid` block placeholders rendered with Mermaid (if present).
- Inline/block math placeholders rendered with KaTeX post-processing.
- Image alt resize syntax: `![alt|320x180](url)` -> `<img width="320" height="180">`.

## Extending Functionality (Custom Toolbar Buttons)

Use `registerAction` to add custom actions to the toolbar.

## Toolbar Layout Configuration

If `toolbar` is omitted, the editor renders the legacy toolbar derived from registered actions (`group` + `order`).

If `toolbar` is provided, the toolbar becomes fully declarative: you decide which items are visible, in what order, in which group, and whether each item renders as `label`, `icon`, or `icon-label`.

### Supported item types

- Action reference: maps to a registered action by id.
- Custom item: defines its own `run(api, state, args?)` inline.
- Dropdown: groups action references and custom items under one hover/click trigger.

### Toolbar config example

```js
const toolbar = {
  groups: [
    {
      id: 'inline',
      order: 10,
      items: [
        { action: 'bold', display: 'icon' },
        { action: 'italic', display: 'icon' },
        {
          id: 'more-inline',
          label: 'More',
          display: 'icon-label',
          items: [
            { action: 'strikethrough', display: 'label' },
            { action: 'inline-code', label: 'Code', display: 'label' },
          ],
        },
      ],
    },
    {
      id: 'templates',
      order: 20,
      items: [
        {
          id: 'templates-menu',
          label: 'Templates',
          display: 'label',
          items: [
            {
              id: 'template-news',
              label: 'News Article',
              args: { templateId: 'news' },
              async run(api, state, args) {
                const res = await fetch(`/api/templates/${args.templateId}`);
                const { markdown } = await res.json();
                api.setMarkdown(markdown, { preservePreviewScroll: true });
              },
            },
          ],
        },
      ],
    },
  ],
};
```

### Group schema

```ts
{
  id?: string,
  order?: number,
  items: ToolbarItem[],
}
```

`toolbar.groups` accepts either an array of group objects or an object map keyed by group id.

### Item schema

```ts
type ToolbarDisplay = 'label' | 'icon' | 'icon-label';

type ToolbarItem =
  | string
  | {
      id?: string,
      action: string,
      label?: string,
      icon?: string,
      title?: string,
      shortcut?: string,
      display?: ToolbarDisplay,
      args?: object,
    }
  | {
      id?: string,
      label?: string,
      icon?: string,
      title?: string,
      shortcut?: string,
      display?: ToolbarDisplay,
      args?: object,
      isEnabled?: (state) => boolean,
      isActive?: (state) => boolean,
      run: (api, state, args?) => void | Promise<void>,
    }
  | {
      id?: string,
      label?: string,
      icon?: string,
      title?: string,
      display?: ToolbarDisplay,
      items: Array<string | object>,
    };
```

### Runtime toolbar updates

Use helper methods when host data changes, for example after the user creates a new template.

Example for integrators: add a custom action button at runtime in declarative toolbar mode,
even if the target group is not defined in initial `toolbar.groups`.

```js
editor.registerAction({
  id: 'star-wrap',
  title: 'Add star',
  icon: '⭐',
  run(api, state) {
    const text = state.selection?.text;
    if (text) api.replaceSelection(`⭐ ${text} ⭐`);
    else api.insertText(' ⭐ ');
  },
});

editor.upsertToolbarItem('custom', {
  id: 'star-wrap-item',
  action: 'star-wrap',
  display: 'icon',
});
```

`upsertToolbarItem(groupId, ...)` auto-creates the group when it does not exist.
If you need explicit group ordering, call `upsertToolbarGroup({ id, order, items: [] })` first.

```js
editor.upsertDropdownItem('templates', 'templates-menu', {
  id: 'template-new',
  label: 'New Template',
  async run(api) {
    const res = await fetch('/api/templates/new');
    const { markdown } = await res.json();
    api.setMarkdown(markdown, { preservePreviewScroll: true });
  },
});

editor.removeDropdownItem('templates', 'templates-menu', 'template-new');
```

Positioning is supported by optional `{ beforeId, afterId }` for `upsertToolbarItem` and `upsertDropdownItem`.

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
- `getToolbarConfig`, `setToolbarConfig`
- `updateToolbarConfig`
- `upsertToolbarGroup`, `removeToolbarGroup`
- `upsertToolbarItem`, `removeToolbarItem`
- `upsertDropdownItem`, `removeDropdownItem`
- `openDrawioEditor`
- `focus`

When an action rewrites the whole document (`setMarkdown(...)`), prefer:

```js
api.setMarkdown(nextMarkdown, { preservePreviewScroll: true });
```

This keeps preview stable during synchronous/asynchronous render work and avoids visible jump on toolbar-triggered document rewrites.

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
- Mermaid integration is represented as fenced blocks.
- draw.io integration is represented as `![draw.io](image){xml}` lines.
- Image resizing metadata is encoded in alt text using `|WxH` suffix.

When `compatibility.enabled` is on, the built-in compatibility service validates markdown with table, fence, list, and link rules.

Built-in issue families:

- Table: missing edge pipes, invalid separator rows, separator alignment, column-count mismatch, empty header row, unescaped pipes in cells.
- Fence: unclosed fences, mismatched delimiters, closing delimiters shorter than opening fences.
- List: invalid indentation, mixed unordered markers at the same indent level, broken ordered sequences, invalid task markers.
- Link: undefined references and empty inline destinations.

Fix behavior:

- `Fix` on a single issue uses that issue's own proposed markdown change.
- `Fix all` applies safe fixes only.
- Unsafe fixes remain available per issue, for example placeholder reference/destination fixes for links or synthetic header text for empty table headers.

Behavior details worth knowing:

- Fence openings may include info strings such as ` ```js `, but closing fences must contain only the delimiter and optional trailing spaces.
- For `fence.unclosed`, the proposed closing delimiter is inserted after the first blank line following the opening fence, or at end-of-document if no blank line exists.
- For `list.indentation-invalid`, allowed nesting steps are type-aware: ordered parents allow `4` spaces, unordered parents allow `2` spaces.
- `list.mixed-marker-style` is checked only within the same indentation level; nested unordered lists may intentionally use different markers.
- `[]()` reports both an undefined link text issue and a missing destination issue.

## draw.io Markdown Format

draw.io diagrams are serialized as one markdown line:

```md
![draw.io](<image-src>){<uri-encoded-xml>}
```

- `<image-src>` is typically a `data:image/svg+xml;base64,...` preview image.
- `<uri-encoded-xml>` is diagram XML encoded with `encodeURIComponent`.
- In preview, clicking the image or the `Edit diagram` button opens draw.io modal and preserves XML.

### draw.io URL fallback behavior

By default, editor starts draw.io modal with hosted embed (`https://embed.diagrams.net/?...`).
If you provide a custom local `drawio.url` and init fails, it retries once with hosted embed.

Use this option to enforce strict offline behavior:

```js
createEditor(element, {
  drawio: {
    url: '/drawio/?embed=1&proto=json&spin=1&ui=min&libraries=1',
    allowHostedFallback: false,
  },
});
```

### Self-hosted draw.io assets (optional)

The npm package ships editor code only (no bundled `dist/drawio` webapp). For offline/self-hosted mode,
download draw.io assets directly to your application and point `drawio.url` at that location.

```bash
npx smart-md-editor drawio:download --out ./public/drawio --version latest
```

Static hosting examples:

```bash
# Vite / plain static app
npx smart-md-editor drawio:download --out ./public/drawio --version latest

# Next.js
npx smart-md-editor drawio:download --out ./public/drawio --version latest

# Any app served from a subpath, e.g. https://example.com/docs/
npx smart-md-editor drawio:download --out ./public/docs/drawio --version latest
```

URL mapping:

```txt
./public/drawio       -> /drawio/?embed=1&proto=json&spin=1&ui=min&libraries=1
./public/docs/drawio  -> /docs/drawio/?embed=1&proto=json&spin=1&ui=min&libraries=1
```

Then configure editor:

```js
createEditor(element, {
  drawio: {
    url: '/drawio/?embed=1&proto=json&spin=1&ui=min&libraries=1',
    allowHostedFallback: false,
  },
});
```

### Example

```md
![draw.io](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iLi4uIj48L3N2Zz4=){%3Cmxfile%20host%3D%22app.diagrams.net%22%3E%3Cdiagram%20id%3D%22d1%22%20name%3D%22Page-1%22%3E%3CmxGraphModel%3E%3Croot%3E%3CmxCell%20id%3D%220%22%2F%3E%3CmxCell%20id%3D%221%22%20parent%3D%220%22%2F%3E%3C%2Froot%3E%3C%2FmxGraphModel%3E%3C%2Fdiagram%3E%3C%2Fmxfile%3E}
```

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
  - Exports: `EditorCore`, `SmartEditorElement`
  - Web Component registration: `<smart-editor>`
- Runtime API includes document ops, selection ops, mode switching, action registration, draw.io modal, and diff-based `proposeChange`.
- Core options include markdown-it configuration, upload configuration, draw.io URL override, and integration callbacks.
- Built-in action groups include inline formatting, blocks, lists, links/images, table/mermaid/draw.io, and image upload.
- Parser support includes source-line mapping, table cell metadata, Mermaid/KaTeX placeholders, draw.io image+xml blocks, and image dimension syntax (`|WxH`).

### Upgrade Notes

- Treat any removal or signature change in methods listed under `Runtime API` as breaking.
- Treat callback signature changes in `Configuration Options` as breaking.
- Treat changes to markdown serialization conventions (`draw.io` image+xml block, image `|WxH`) as breaking for downstream pipelines.
- Prefer additive changes for custom action integrations: add new action IDs instead of mutating existing IDs used by host automation.

### `0.2.0`

- Added declarative `toolbar` config for explicit grouping, ordering, display mode selection, and dropdown menus.
- Added runtime toolbar methods: `getToolbarConfig()` and `setToolbarConfig(config)`.
- Toolbar items now support inline async `run(api, state, args?)` handlers in addition to references to registered actions.
- Added runtime toolbar helper methods for granular updates (`updateToolbarConfig`, `upsert/remove` for groups/items/dropdown items).

## Development Commands

```bash
npm install
npm run build
npm run dev
npm run drawio:download
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

### Assets do not upload

For **images**, if `upload.endpoint` is missing or the upload request fails, the editor falls back to embedding the image as a base64 data URI (`![](data:image/...;base64,...)`), so the document remains self-contained.

For **non-image files** (PDF, Word, Excel, etc.), there is no base64 fallback — a data-URI makes no sense as a markdown link and would bloat the document. If no endpoint resolves for a non-image file, `onUploadError` is fired and nothing is inserted.

If your storage service uses **different endpoints per resource type** (e.g. Cloudinary's `/image/upload` vs `/raw/upload`), use `upload.endpoints`:

```js
upload: {
  endpoint: 'https://api.cloudinary.com/v1_1/demo/raw/upload',   // default for everything
  endpoints: {
    'image/*': 'https://api.cloudinary.com/v1_1/demo/image/upload', // images go here instead
  },
  extraFields: { upload_preset: 'my_preset' },
}
```

### React usage

A React adapter exists at `src/adapters/react/SmartEditor.jsx`. It exports `SmartEditor`. In the current build exports, the main package entry exports `createEditor`, `EditorCore`, and `SmartEditorElement`.
