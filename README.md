# Airtable & Spreadsheet Automator

Read and write Airtable bases, Google Sheets, and Excel files from CortexPrism.

## Installation

```bash
cortex plugin install marketplace:cortex-plugin-airtable
cortex plugin install github:CortexPrism/cortex-plugin-airtable
cortex plugin install ./manifest.json
```

## Configuration

### Airtable
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `airtableApiKey` | secret | yes | Personal access token |
| `airtableDefaultBase` | text | no | Default base ID |

### Google Sheets
| Key | Type | Description |
|-----|------|-------------|
| `sheetsClientEmail` | text | Service account email |
| `sheetsPrivateKey` | secret | Service account private key |

## Tools

### airtable_list_records — List records
- `base_id` (string, required)
- `table_name` (string, required)
- `max_records` (number, default `100`)
- `filter_formula` (string, optional)
- `view` (string, optional)

### airtable_create_record — Create record
- `base_id` (string, required)
- `table_name` (string, required)
- `fields` (string, required) — JSON object

### airtable_update_record — Update record
- `base_id` (string, required)
- `table_name` (string, required)
- `record_id` (string, required)
- `fields` (string, required) — JSON object

### airtable_list_bases — List bases
- No parameters

### sheets_read — Read Google Sheet
- `spreadsheet_id` (string, required)
- `range` (string, default `"Sheet1"`)
- `sheet_name` (string, optional)

### sheets_write — Write to Google Sheet
- `spreadsheet_id` (string, required)
- `range` (string, required)
- `values` (string, required) — JSON 2D array

## Capabilities

- `tools` — Tool execution
- `network:fetch` — HTTPS to Airtable/Sheets APIs
- `fs:read` — File system read
- `fs:write` — File system write

## Development

```bash
deno task test
deno fmt --check
deno lint
```

## License

MIT
