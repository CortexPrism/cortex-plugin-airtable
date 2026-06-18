# Changelog

## [Unreleased]

### Added
- Structured logging via ctx.logger in lifecycle hooks

### Changed
- Renamed manifest file from `cortex.json` to `manifest.json` for consistency with Cortex standard
- Standardized UI section structure to `ui.settings` format
- Normalized parameter naming: `defaultValue` → `default`, `options` → `enum`
- Added `homepage` field with repository URL
- Added `dependencies` field to manifest

## [1.0.1] — 2026-06-15

### Added
- Initial release
## [1.0.1] — 2026-06-17

### Added

- Initial project setup

## [1.0.0] — 2026-06-15

### Added

- Initial release of cortex-plugin-airtable
- `airtable_list_records` — List records with filtering and views
- `airtable_create_record` — Create records in Airtable bases
- `airtable_update_record` — Update existing records
- `airtable_list_bases` — List accessible Airtable bases
- `sheets_read` — Read data from Google Sheets
- `sheets_write` — Write data to Google Sheets
