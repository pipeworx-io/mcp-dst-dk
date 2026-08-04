# mcp-dst-dk

Statistics Denmark (Danmarks Statistik / Statbank) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `list_subjects` | Browse the Statistics Denmark subject tree (People, Labour, Economy, Business, Environment, ...). Pass a subject id to drill into its children; set recursive to expand the whole subtree. |
| `list_tables` | List/search available tables. Filter by subject id, free-text search, or recently-updated tables. Returns table ids (use with table_info / get_data), titles, period range, and variable names. |
| `table_info` | Metadata for a table: title, unit, last updated, and the full list of variables with their codes and valid value ids. READ THIS BEFORE get_data to learn the exact variable codes (e.g. "OMRÅDE", "Tid") and value ids you must pass. |
| `get_data` | Pull data from a table. Provide tableId and a "variables" map of {variableCode: valueOrValues}, using codes/ids from table_info. Each value may be a single id, an array of ids, or "*" for all. Omitted variables that allow elimination are aggregated to total. format "JSONSTAT" (default, structured JSON-stat) or "BULK"/"CSV" (semicolon-delimited text). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "dst-dk": {
      "url": "https://gateway.pipeworx.io/dst-dk/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Dst Dk data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
