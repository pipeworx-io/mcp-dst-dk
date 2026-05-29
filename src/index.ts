interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Statistics Denmark (Danmarks Statistik / Statbank) MCP.
 * Keyless REST API: https://api.statbank.dk/v1
 *
 * Typical flow:
 *   1. list_subjects        — browse the subject tree (People, Economy, ...).
 *   2. list_tables          — find a table id (e.g. FOLK1C) by subject or search.
 *   3. table_info           — read a table's variable codes and valid value ids.
 *   4. get_data             — pull values. You MUST use the exact variable codes
 *                             and value ids from table_info (e.g. region code
 *                             "OMRÅDE", value "000" = All Denmark; "*" = all).
 */


const BASE = 'https://api.statbank.dk/v1';
const UA = 'pipeworx-mcp-dst-dk/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'list_subjects',
    description:
      'Browse the Statistics Denmark subject tree (People, Labour, Economy, Business, Environment, ...). Pass a subject id to drill into its children; set recursive to expand the whole subtree.',
    inputSchema: {
      type: 'object',
      properties: {
        subjects: {
          type: 'string',
          description:
            'Comma-separated subject id(s) to drill into (e.g. "1"). Omit for the top-level tree.',
        },
        recursive: {
          type: 'boolean',
          description: 'Expand all descendant subjects (default false).',
        },
        lang: { type: 'string', description: 'Language: "en" (default) or "da".' },
      },
    },
  },
  {
    name: 'list_tables',
    description:
      'List/search available tables. Filter by subject id, free-text search, or recently-updated tables. Returns table ids (use with table_info / get_data), titles, period range, and variable names.',
    inputSchema: {
      type: 'object',
      properties: {
        subjects: {
          type: 'string',
          description: 'Comma-separated subject id(s) to filter by (from list_subjects).',
        },
        search: {
          type: 'string',
          description: 'Free-text filter matched against table ids and titles (case-insensitive).',
        },
        pastdays: {
          type: 'integer',
          description: 'Only tables updated within the last N days.',
        },
        includeInactive: {
          type: 'boolean',
          description: 'Include discontinued tables (default false).',
        },
        lang: { type: 'string', description: 'Language: "en" (default) or "da".' },
      },
    },
  },
  {
    name: 'table_info',
    description:
      'Metadata for a table: title, unit, last updated, and the full list of variables with their codes and valid value ids. READ THIS BEFORE get_data to learn the exact variable codes (e.g. "OMRÅDE", "Tid") and value ids you must pass.',
    inputSchema: {
      type: 'object',
      properties: {
        tableId: { type: 'string', description: 'Table id, e.g. "FOLK1C".' },
        lang: { type: 'string', description: 'Language: "en" (default) or "da".' },
      },
      required: ['tableId'],
    },
  },
  {
    name: 'get_data',
    description:
      'Pull data from a table. Provide tableId and a "variables" map of {variableCode: valueOrValues}, using codes/ids from table_info. Each value may be a single id, an array of ids, or "*" for all. Omitted variables that allow elimination are aggregated to total. format "JSONSTAT" (default, structured JSON-stat) or "BULK"/"CSV" (semicolon-delimited text).',
    inputSchema: {
      type: 'object',
      properties: {
        tableId: { type: 'string', description: 'Table id, e.g. "FOLK1C".' },
        variables: {
          type: 'object',
          description:
            'Map of variable code -> value(s). Value is a string, an array of strings, or "*". Example: {"OMRÅDE":"000","Tid":["2024K1","2024K2"],"ALDER":"IALT"}.',
        },
        format: {
          type: 'string',
          description: '"JSONSTAT" (default), "BULK" or "CSV" (both return semicolon CSV).',
        },
        lang: { type: 'string', description: 'Language: "en" (default) or "da".' },
      },
      required: ['tableId', 'variables'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const lang = typeof args.lang === 'string' && args.lang.trim() ? args.lang.trim() : 'en';

  switch (name) {
    case 'list_subjects': {
      const qs = new URLSearchParams({ lang, format: 'JSON' });
      if (typeof args.subjects === 'string' && args.subjects.trim()) {
        qs.set('subjects', args.subjects.trim());
      }
      if (args.recursive === true) qs.set('recursive', 'true');
      return dstGet(`/subjects?${qs.toString()}`);
    }

    case 'list_tables': {
      const qs = new URLSearchParams({ lang, format: 'JSON' });
      if (typeof args.subjects === 'string' && args.subjects.trim()) {
        qs.set('subjects', args.subjects.trim());
      }
      if (typeof args.pastdays === 'number') qs.set('pastdays', String(args.pastdays));
      if (args.includeInactive === true) qs.set('includeInactive', 'true');
      const tablesRaw = await dstGet(`/tables?${qs.toString()}`);
      const search = typeof args.search === 'string' ? args.search.trim().toLowerCase() : '';
      if (!search || !Array.isArray(tablesRaw)) return tablesRaw;
      return (tablesRaw as Array<Record<string, unknown>>).filter((t) => {
        const id = String(t.id ?? '').toLowerCase();
        const text = String(t.text ?? '').toLowerCase();
        return id.includes(search) || text.includes(search);
      });
    }

    case 'table_info': {
      const tableId = reqStr(args, 'tableId', '"FOLK1C"');
      const qs = new URLSearchParams({ lang, format: 'JSON' });
      return dstGet(`/tableinfo/${encodeURIComponent(tableId)}?${qs.toString()}`);
    }

    case 'get_data': {
      const tableId = reqStr(args, 'tableId', '"FOLK1C"');
      const variables = args.variables;
      if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
        throw new Error(
          'variables must be a map of {variableCode: valueOrValues}. Call table_info first to learn the codes.',
        );
      }
      const fmtRaw = typeof args.format === 'string' ? args.format.trim().toUpperCase() : 'JSONSTAT';
      const format = fmtRaw === 'CSV' ? 'BULK' : fmtRaw === 'BULK' ? 'BULK' : 'JSONSTAT';

      // Format is part of the path (/data/{table}/{format}); only lang + the
      // variable selections go in the query string.
      const qs = new URLSearchParams({ lang });
      for (const [code, val] of Object.entries(variables as Record<string, unknown>)) {
        const joined = Array.isArray(val) ? val.map(String).join(',') : String(val);
        qs.set(code, joined);
      }

      const res = await fetch(`${BASE}/data/${encodeURIComponent(tableId)}/${format}?${qs.toString()}`, {
        headers: { Accept: 'application/json', 'User-Agent': UA },
      });
      if (!res.ok) throw new Error(`DST: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
      if (format === 'BULK') return res.text();
      return res.json();
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function dstGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`DST: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
