# mcp-dst-dk

Statistics Denmark (Danmarks Statistik / Statbank) MCP. Keyless REST API: https://api.statbank.dk/v1

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1856+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

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

Both URLs reach the same gateway and the same 1856+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/denmark_population \
  -H 'Content-Type: application/json' \
  -d '{}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/denmark_population`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Run it from npm

`@pipeworx/mcp-dst-dk` is a local stdio bridge to the Pipeworx gateway: your MCP client
starts it with `npx`, and it forwards every call to the same
`https://gateway.pipeworx.io/dst-dk/mcp` endpoint shown above. It needs network access;
there is no offline mode.

```json
{
  "mcpServers": {
    "dst-dk": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-dst-dk"]
    }
  }
}
```

Without a key it calls anonymously, capped at 50 calls a day. A free account
raises that to 200 a day: get a key at https://pipeworx.io/signup and add
`"env": { "PIPEWORX_API_KEY": "<your key>" }` to the server entry.
The key is sent as a Bearer token, the same way a hosted connection sends it,
so calls are metered and billed exactly as they are there.

It lists **only** this pack's tools by default. Set `PIPEWORX_META_TOOLS=1` to
also list `ask_pipeworx` and the other gateway-wide tools.

Behind an HTTPS proxy: Node's built-in `fetch` does not read `HTTPS_PROXY` by
default. Newer Node releases honour it when `NODE_USE_ENV_PROXY=1` is set; check
your Node version's documentation.

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
