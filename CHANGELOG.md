# Changelog

All notable changes to this project are documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

- No unreleased changes yet.

## [v0.9.4] - 2026-06-21

### Added
- Added configurable editor fonts via new `fonts` option in `createEditor(...)` / `EditorCore` (`preset` string or custom `{ sans, mono }`).
- Added runtime font API: `setFont(...)`, `getFont()`, and `getAvailableFonts()`.
- Added built-in font preset registry and helpers (`EDITOR_FONT_PRESETS`, `getEditorFontList`, `isEditorFont`, `createCustomFontSet`, `normalizeFontConfig`).
- Added Web Component font support with `fonts` attribute on `<smart-editor>` and proxied font methods.

### Docs
- Updated README with font configuration options, preset list, custom `@font-face` guidance, and runtime API examples.

### Tests
- Added unit coverage for font preset/helpers module (`tests/unit/fonts.test.js`).
- Added integration coverage for EditorCore and Web Component font flows (`tests/integration/editor-fonts.test.js`).

## [v0.9.3] - 2026-06-01
- Image resize now preserves the original markdown image URL in [data-se-markdown-src]
- Resize updates now prefer [data-se-markdown-src].
- This keeps image resizing working even when preview rules rewrite image URLs in the preview.
- Preview sanitization now allows [data-se-markdown-src] so the attribute survives DOMPurify.
- Documentation and project instructions were updated to reflect the new behavior.
- Added unit tests covering the new image metadata and resize fallback logic.

## [v0.9.2] - 2026-04-22

### Fixed
- Fixed preview-to-code line mapping drift after expanded include directives so lines below include snippets resolve to correct source lines.
- Fixed include annotation/source-map offset handling by carrying explicit downstream line-shift metadata through the preview include pipeline.

### Tests
- Added integration regression coverage for downstream line mapping after expanded include blocks in preview-rules flows.

## [v0.9.1] - 2026-04-21

### Added
- Added upload request credentials option (`upload.credentials`) with supported fetch modes: `omit`, `same-origin`, `include`.

### Changed
- Updated upload pipeline docs and API JSDoc to include credentials configuration.
- Updated demo upload configuration with an explicit credentials example for authenticated upload flows.

## [v0.9.0] - 2026-04-11

### Added
- Added preview transformation rules with two-phase pipeline support (`markdown` before render, `html` after render and before sanitization).
- Added public preview-rules runtime API on the editor instance and `<smart-editor>` wrapper, including registration, toggling, replacement, rebuild, and metrics helpers.
- Added built-in preview-rules helpers for relative image URL prefixing, include directive expansion, include source-line remapping, and include decoration.
- Added web component preview-rules events: `se-preview-rules-changed`, `se-preview-rule-error`, and `se-preview-pipeline-finished`.
- Added preview-rules unit and integration coverage, including async stale-render protection, include click mapping, and preserve-scroll rebuild behavior.

### Changed
- Extended preview rendering pipeline in `EditorCore` to support sync/async preview rules with abort/version guards.
- Improved preview rebuild stability so runtime rule changes and include expansion preserve preview position more reliably.
- Expanded preview sanitization allowlist to support preview-only include decoration using `details` and `summary`.
- Updated demo to showcase preview rules with image URL rewriting, runtime include toggling, include decoration UX, and a custom `florek` transformation rule.

### Fixed
- Fixed stale async preview-rule results so older pipeline completions do not overwrite newer renders.
- Fixed expanded include preview interactions so clicks inside included content map back to the original include directive line.
- Fixed preview jump behavior when enabling, disabling, or rebuilding include-based preview rules.

### Docs
- Documented the preview-rules system in README, including configuration, lifecycle, runtime API, callbacks/events, examples, and security notes.

### Tests
- Added dedicated tests for `PreviewRulesEngine`, `EditorCore` preview-rules behavior, and end-to-end preview-rules integration flows.

## [v0.8.1] - 2026-04-11

### Fixed
- Fixed test stability so the test suite passes reliably in GitHub CI.

### Infrastructure
- Adjusted automated test execution for the GitHub environment.

## [v0.8.0] - 2026-04-10

### Added
- Added `onPreviewRendered(markdown, tokens, html)` callback for integrations that need rendered payloads.
- Added incremental block-patch preview rendering path for large markdown documents (with safe full-render fallback).
- Added additional tests for adaptive debounce, incremental preview mapping stability, base64 image deletion, and large-image line sync.

### Changed
- Changed `onChange` callback contract to `onChange(markdown)` and aligned it with debounced preview update flow.
- Updated `<smart-editor>` `se-change` event dispatch timing to fire after preview render completion (queued in microtask).
- Improved editing responsiveness with adaptive preview debounce and adaptive scroll-sync suppression release timing.
- Expanded code-view payload collapsing to include long markdown image sources (not only draw.io payloads).

### Fixed
- Fixed preview image deletion flow to reliably remove the full markdown image token, including long/base64 sources and normalized src variants.
- Fixed list compatibility detection so markdown link lists are not incorrectly reported as invalid task markers.
- Fixed source-line mapping stability in preview after inserting large image blocks.

### Docs
- Updated README callback/event documentation for `onChange`, `onPreviewRendered`, and `se-change` timing semantics.

## [v0.7.4] - 2026-04-04

### Added
- Added OpenAI-compatible AI provider support for OpenAI API-compatible services (including Azure OpenAI and Ollama OpenAI endpoint).

### Changed
- Improved propose-change accept UX and stabilized diff modal navigation.

### Fixed
- Preserved preview scroll position when accepting proposed changes.

### Docs
- Updated AI provider documentation and usage guidance in README.

### Tests
- Added/updated tests for propose-change scroll behavior, diff modal interaction, and OpenAI-compatible provider integration.

## [v0.7.3] - 2026-04-03

### Added
- Expanded compatibility validation with fence, list, and link rules.

### Changed
- Finalized compatibility fix semantics, including safe-fix behavior for batch operations.

## [v0.7.2] - 2026-04-03

### Changed
- Translated additional editor strings to English.

## [v0.7.1] - 2026-04-02

### Fixed
- Applied timing hotfixes in E2E flows.

## [v0.7.0] - 2026-04-02

### Added
- Finalized PromptRegistry integration for AI assistance.
- Added AI support with AI panel and ability to connect to AI provider.
- AI panel provide ability to review, replace and create code in editor.
- Added provider prompt customization support and documentation.

## [v0.6.0] - 2026-03-29

### Added
- Added contextual hints system with history support.

### Changed
- Added force-on-toolbar hint behavior and improved context detection.

### Tests
- Added full test coverage for hints behavior.

## [v0.5.2] - 2026-03-28

### Fixed
- Fixed ordered list indentation, outdent, and renumbering behavior.

## [v0.5.1] - 2026-03-28

### Changed
- Updated npm packaging: lightweight smart-md-editor package plus optional draw.io self-hosting assets.
- Added draw.io downloader CLI for self-hosted/offline setups.

## [v0.5.0] - 2026-03-28

### Added
- Added declarative toolbar runtime APIs and improved dropdown UX behavior.
- Added propose-change flow and diff-based editing workflow improvements.
- Added preview image deletion behavior tied to source markdown.
- Added centralized built-in themes and toolbar theme selector swatches.
- Added Eleventy compatibility MVP with issue panel and focused diff highlights.
- Added syntax-highlighted preview code blocks with language switcher and copy button.
- Added centralized busy/loading overlay APIs with cancellation support.
- Added richer upload configuration (`extraFields`, `responseUrlField`, per-type endpoints).
- Added undo/redo toolbar actions and public API wiring.

### Changed
- Renamed web component from md-editor to smart-editor.
- Finalized `mde-` to `se-` naming migration for UI classes and theme variables.
- Improved split-view scroll sync and toolbar action behavior.
- Stabilized preview behavior around typing, uploads, and draw.io updates.
- Improved image resize behavior in preview.
- Finalized release process and package rename to smart-md-editor.
- Optimized CI and coverage workflow triggers, including migration to newer Node runtime.

### Fixed
- Fixed per-issue compatibility Fix action so it applies only to the selected issue.
- Fixed preview scroll jumps during image resize and selected editing flows.

### Infrastructure
- Added and refined GitHub Pages workflow and repository hygiene updates (including dist handling).

## [v0.2.0] - Historical

### Added
- Added declarative `toolbar` config for explicit grouping, ordering, display mode selection, and dropdown menus.
- Added runtime toolbar methods: `getToolbarConfig()` and `setToolbarConfig(config)`.
- Added runtime toolbar helper methods for granular updates (`updateToolbarConfig`, `upsert/remove` for groups/items/dropdown items).
- Added inline async toolbar item handlers: `run(api, state, args?)`.

## [v0.1.0] - Historical

### Added
- Initial public integration surface:
  - `createEditor(element, options)` factory.
  - Exports: `EditorCore`, `SmartEditorElement`.
  - Web component registration: `<smart-editor>`.
- Initial runtime API for document operations, selections, mode switching, action registration, draw.io modal, and diff-based `proposeChange`.
- Initial core options for markdown-it configuration, upload configuration, draw.io URL override, and integration callbacks.
- Initial built-in action groups for formatting, blocks, lists, links/images, table/mermaid/draw.io, and image upload.
- Initial parser support for source-line mapping, table metadata, Mermaid/KaTeX placeholders, draw.io image+xml blocks, and image dimension syntax (`|WxH`).

## Notes on Historical Reconstruction

- Versions before tagged releases were reconstructed from documented project history and git commit/PR metadata.
- Changelog version notation is normalized to `vX.Y.Z` for consistency.

[Unreleased]: https://github.com/florerion/SmartEditor/compare/v0.9.3...HEAD
[v0.9.3]: https://github.com/florerion/SmartEditor/compare/v0.9.2...v0.9.3
[v0.9.2]: https://github.com/florerion/SmartEditor/compare/v0.9.1...v0.9.2
[v0.9.1]: https://github.com/florerion/SmartEditor/compare/v0.9.0...v0.9.1
[v0.9.0]: https://github.com/florerion/SmartEditor/compare/v0.8.1...v0.9.0
[v0.8.1]: https://github.com/florerion/SmartEditor/compare/v0.8.0...v0.8.1
[v0.8.0]: https://github.com/florerion/SmartEditor/compare/v0.7.4...v0.8.0
[v0.7.4]: https://github.com/florerion/SmartEditor/compare/v0.7.3...v0.7.4
[v0.7.3]: https://github.com/florerion/SmartEditor/compare/v0.7.2...v0.7.3
[v0.7.2]: https://github.com/florerion/SmartEditor/compare/v0.7.1...v0.7.2
[v0.7.1]: https://github.com/florerion/SmartEditor/compare/v0.7.0...v0.7.1
[v0.7.0]: https://github.com/florerion/SmartEditor/compare/v0.6.0...v0.7.0
[v0.6.0]: https://github.com/florerion/SmartEditor/compare/v0.5.2...v0.6.0
[v0.5.2]: https://github.com/florerion/SmartEditor/compare/v0.5.1...v0.5.2
[v0.5.1]: https://github.com/florerion/SmartEditor/compare/v0.5.0...v0.5.1
[v0.5.0]: https://github.com/florerion/SmartEditor/releases/tag/v0.5.0
