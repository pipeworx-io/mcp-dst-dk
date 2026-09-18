# mcp-dst-dk

Statistics Denmark (Danmarks Statistik / Statbank) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `denmark_population` | Denmark's total population in ONE call, from Statistics Denmark (Danmarks Statistik, table FOLK1A), keyless — plus the recent quarterly trend. PREFER for "what is Denmark's population", "how many people live in Denmark", "Danish population growth", "Denmark population according to official statistics". Counts are registered residents at the FIRST DAY of each quarter, so "2026Q2" is a 1 April snapshot, not an average over the quarter. Use list_tables / get_data for breakdowns by region, age, sex or marital status. |
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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/dst-dk/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Dst Dk data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/denmark_population \
  -H 'Content-Type: application/json' \
  -d '{}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/denmark_population`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.
