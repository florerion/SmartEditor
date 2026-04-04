# Changelog

All notable changes to this project are documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

- No unreleased changes yet.

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

## [0.5.1] - 2026-03-28

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

## [0.2.0] - Historical

### Added
- Added declarative `toolbar` config for explicit grouping, ordering, display mode selection, and dropdown menus.
- Added runtime toolbar methods: `getToolbarConfig()` and `setToolbarConfig(config)`.
- Added runtime toolbar helper methods for granular updates (`updateToolbarConfig`, `upsert/remove` for groups/items/dropdown items).
- Added inline async toolbar item handlers: `run(api, state, args?)`.

## [0.1.0] - Historical

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
- Tag naming is preserved as published (both `0.5.1` and `v*` tags exist in repository history).

[Unreleased]: https://github.com/florerion/SmartEditor/compare/v0.7.4...HEAD
[v0.7.4]: https://github.com/florerion/SmartEditor/compare/v0.7.3...v0.7.4
[v0.7.3]: https://github.com/florerion/SmartEditor/compare/v0.7.2...v0.7.3
[v0.7.2]: https://github.com/florerion/SmartEditor/compare/v0.7.1...v0.7.2
[v0.7.1]: https://github.com/florerion/SmartEditor/compare/v0.7.0...v0.7.1
[v0.7.0]: https://github.com/florerion/SmartEditor/compare/v0.6.0...v0.7.0
[v0.6.0]: https://github.com/florerion/SmartEditor/compare/v0.5.2...v0.6.0
[v0.5.2]: https://github.com/florerion/SmartEditor/compare/0.5.1...v0.5.2
[0.5.1]: https://github.com/florerion/SmartEditor/compare/v0.5.0...0.5.1
[v0.5.0]: https://github.com/florerion/SmartEditor/releases/tag/v0.5.0
