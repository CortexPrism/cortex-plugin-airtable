import type { PluginContext, Tool, ToolCallResult, ToolContext } from './types.ts';

let config: Record<string, string> = {};

async function resolveConfig(ctx: PluginContext): Promise<Record<string, string>> {
  const keys = ['airtableApiKey', 'airtableDefaultBase', 'sheetsClientEmail', 'sheetsPrivateKey'];
  const cfg: Record<string, string> = {};
  for (const k of keys) {
    cfg[k] = (await ctx.config.get(k)) ?? '';
  }
  return cfg;
}

export async function onLoad(ctx: PluginContext): Promise<void> {
  config = await resolveConfig(ctx);
}

function airtableHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${config.airtableApiKey}`,
    'Content-Type': 'application/json',
    'User-Agent': 'CortexPrism-AirtablePlugin/1.0.0',
  };
}

async function airtableFetch(
  path: string,
  options: RequestInit = {},
  timeoutMs = 30000,
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.airtable.com/v0/${path}`, {
      ...options,
      headers: { ...airtableHeaders(), ...(options.headers as Record<string, string> || {}) },
      signal: controller.signal,
    });
    clearTimeout(t);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        data: null,
        error: `Airtable error ${res.status}: ${JSON.stringify(data)}`,
      };
    }
    return { ok: true, data };
  } catch (e) {
    clearTimeout(t);
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, data: null, error: 'Request timeout' };
    }
    return { ok: false, data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

const airtableListRecordsTool: Tool = {
  definition: {
    name: 'airtable_list_records',
    description: 'List records from an Airtable table with optional filtering',
    params: [
      { name: 'base_id', type: 'string', description: 'Airtable base ID', required: true },
      { name: 'table_name', type: 'string', description: 'Table name or ID', required: true },
      {
        name: 'max_records',
        type: 'number',
        description: 'Maximum records',
        required: false,
        defaultValue: 100,
      },
      {
        name: 'filter_formula',
        type: 'string',
        description: 'Airtable filter formula',
        required: false,
      },
      {
        name: 'view',
        type: 'string',
        description: 'Name or ID of a specific view',
        required: false,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const baseId = String(args.base_id || '');
      const tableName = String(args.table_name || '');
      if (!baseId) {
        return {
          toolName: 'airtable_list_records',
          success: false,
          output: '',
          error: 'base_id is required',
          durationMs: Date.now() - start,
        };
      }
      if (!tableName) {
        return {
          toolName: 'airtable_list_records',
          success: false,
          output: '',
          error: 'table_name is required',
          durationMs: Date.now() - start,
        };
      }
      const params = new URLSearchParams();
      const maxRecords = typeof args.max_records === 'number' ? args.max_records : 100;
      params.set('maxRecords', String(maxRecords));
      if (typeof args.filter_formula === 'string' && args.filter_formula) {
        params.set('filterByFormula', args.filter_formula);
      }
      if (typeof args.view === 'string' && args.view) params.set('view', args.view);
      const path = `${encodeURIComponent(baseId)}/${
        encodeURIComponent(tableName)
      }?${params.toString()}`;
      const result = await airtableFetch(path);
      if (!result.ok) {
        return {
          toolName: 'airtable_list_records',
          success: false,
          output: '',
          error: result.error || 'List failed',
          durationMs: Date.now() - start,
        };
      }
      return {
        toolName: 'airtable_list_records',
        success: true,
        output: JSON.stringify(result.data, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'airtable_list_records',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const airtableCreateRecordTool: Tool = {
  definition: {
    name: 'airtable_create_record',
    description: 'Create a new record in an Airtable table',
    params: [
      { name: 'base_id', type: 'string', description: 'Airtable base ID', required: true },
      { name: 'table_name', type: 'string', description: 'Table name or ID', required: true },
      {
        name: 'fields',
        type: 'string',
        description: 'JSON object of field names to values',
        required: true,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const baseId = String(args.base_id || '');
      const tableName = String(args.table_name || '');
      const fieldsRaw = String(args.fields || '');
      if (!baseId) {
        return {
          toolName: 'airtable_create_record',
          success: false,
          output: '',
          error: 'base_id is required',
          durationMs: Date.now() - start,
        };
      }
      if (!tableName) {
        return {
          toolName: 'airtable_create_record',
          success: false,
          output: '',
          error: 'table_name is required',
          durationMs: Date.now() - start,
        };
      }
      if (!fieldsRaw) {
        return {
          toolName: 'airtable_create_record',
          success: false,
          output: '',
          error: 'fields is required',
          durationMs: Date.now() - start,
        };
      }
      let fields: Record<string, unknown>;
      try {
        fields = JSON.parse(fieldsRaw);
      } catch {
        return {
          toolName: 'airtable_create_record',
          success: false,
          output: '',
          error: 'fields must be valid JSON',
          durationMs: Date.now() - start,
        };
      }
      const path = `${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`;
      const result = await airtableFetch(path, {
        method: 'POST',
        body: JSON.stringify({ records: [{ fields }] }),
      });
      if (!result.ok) {
        return {
          toolName: 'airtable_create_record',
          success: false,
          output: '',
          error: result.error || 'Create failed',
          durationMs: Date.now() - start,
        };
      }
      return {
        toolName: 'airtable_create_record',
        success: true,
        output: JSON.stringify(result.data, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'airtable_create_record',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const airtableUpdateRecordTool: Tool = {
  definition: {
    name: 'airtable_update_record',
    description: 'Update an existing record in an Airtable table',
    params: [
      { name: 'base_id', type: 'string', description: 'Airtable base ID', required: true },
      { name: 'table_name', type: 'string', description: 'Table name or ID', required: true },
      { name: 'record_id', type: 'string', description: 'Record ID to update', required: true },
      {
        name: 'fields',
        type: 'string',
        description: 'JSON object of field names to updated values',
        required: true,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const baseId = String(args.base_id || '');
      const tableName = String(args.table_name || '');
      const recordId = String(args.record_id || '');
      const fieldsRaw = String(args.fields || '');
      if (!baseId) {
        return {
          toolName: 'airtable_update_record',
          success: false,
          output: '',
          error: 'base_id is required',
          durationMs: Date.now() - start,
        };
      }
      if (!tableName) {
        return {
          toolName: 'airtable_update_record',
          success: false,
          output: '',
          error: 'table_name is required',
          durationMs: Date.now() - start,
        };
      }
      if (!recordId) {
        return {
          toolName: 'airtable_update_record',
          success: false,
          output: '',
          error: 'record_id is required',
          durationMs: Date.now() - start,
        };
      }
      if (!fieldsRaw) {
        return {
          toolName: 'airtable_update_record',
          success: false,
          output: '',
          error: 'fields is required',
          durationMs: Date.now() - start,
        };
      }
      let fields: Record<string, unknown>;
      try {
        fields = JSON.parse(fieldsRaw);
      } catch {
        return {
          toolName: 'airtable_update_record',
          success: false,
          output: '',
          error: 'fields must be valid JSON',
          durationMs: Date.now() - start,
        };
      }
      const path = `${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}/${
        encodeURIComponent(recordId)
      }`;
      const result = await airtableFetch(path, {
        method: 'PATCH',
        body: JSON.stringify({ fields }),
      });
      if (!result.ok) {
        return {
          toolName: 'airtable_update_record',
          success: false,
          output: '',
          error: result.error || 'Update failed',
          durationMs: Date.now() - start,
        };
      }
      return {
        toolName: 'airtable_update_record',
        success: true,
        output: JSON.stringify(result.data, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'airtable_update_record',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const airtableListBasesTool: Tool = {
  definition: {
    name: 'airtable_list_bases',
    description: 'List all Airtable bases accessible with the configured API key',
    params: [],
    capabilities: ['network:fetch'],
  },
  execute: async (_args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch('https://api.airtable.com/v0/meta/bases', {
          headers: airtableHeaders(),
          signal: controller.signal,
        });
        clearTimeout(t);
        if (!res.ok) {
          const txt = await res.text();
          return {
            toolName: 'airtable_list_bases',
            success: false,
            output: '',
            error: `Airtable error ${res.status}: ${txt}`,
            durationMs: Date.now() - start,
          };
        }
        const data = await res.json();
        return {
          toolName: 'airtable_list_bases',
          success: true,
          output: JSON.stringify(data, null, 2),
          durationMs: Date.now() - start,
        };
      } catch (e) {
        clearTimeout(t);
        if (e instanceof Error && e.name === 'AbortError') {
          return {
            toolName: 'airtable_list_bases',
            success: false,
            output: '',
            error: 'Request timeout (15s)',
            durationMs: Date.now() - start,
          };
        }
        throw e;
      }
    } catch (error) {
      return {
        toolName: 'airtable_list_bases',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const sheetsReadTool: Tool = {
  definition: {
    name: 'sheets_read',
    description: 'Read data from a Google Sheet',
    params: [
      {
        name: 'spreadsheet_id',
        type: 'string',
        description: 'Google Sheets spreadsheet ID',
        required: true,
      },
      {
        name: 'range',
        type: 'string',
        description: 'A1 notation range to read',
        required: false,
        defaultValue: 'Sheet1',
      },
      { name: 'sheet_name', type: 'string', description: 'Sheet/tab name', required: false },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const spreadsheetId = String(args.spreadsheet_id || '');
      if (!spreadsheetId) {
        return {
          toolName: 'sheets_read',
          success: false,
          output: '',
          error: 'spreadsheet_id is required',
          durationMs: Date.now() - start,
        };
      }
      let range = typeof args.range === 'string' && args.range ? args.range : 'Sheet1';
      if (typeof args.sheet_name === 'string' && args.sheet_name) {
        range = `'${args.sheet_name}'!A:Z`;
      }
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${
            encodeURIComponent(spreadsheetId)
          }/values/${encodeURIComponent(range)}`,
          {
            headers: {
              'Authorization': `Bearer ${config.sheetsPrivateKey}`,
              'User-Agent': 'CortexPrism-AirtablePlugin/1.0.0',
            },
            signal: controller.signal,
          },
        );
        clearTimeout(t);
        if (!res.ok) {
          const txt = await res.text();
          return {
            toolName: 'sheets_read',
            success: false,
            output: '',
            error: `Sheets error ${res.status}: ${txt}`,
            durationMs: Date.now() - start,
          };
        }
        const data = await res.json();
        return {
          toolName: 'sheets_read',
          success: true,
          output: JSON.stringify(data, null, 2),
          durationMs: Date.now() - start,
        };
      } catch (e) {
        clearTimeout(t);
        if (e instanceof Error && e.name === 'AbortError') {
          return {
            toolName: 'sheets_read',
            success: false,
            output: '',
            error: 'Request timeout (15s)',
            durationMs: Date.now() - start,
          };
        }
        throw e;
      }
    } catch (error) {
      return {
        toolName: 'sheets_read',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const sheetsWriteTool: Tool = {
  definition: {
    name: 'sheets_write',
    description: 'Write data to a Google Sheet',
    params: [
      {
        name: 'spreadsheet_id',
        type: 'string',
        description: 'Google Sheets spreadsheet ID',
        required: true,
      },
      {
        name: 'range',
        type: 'string',
        description: 'A1 notation range to write to',
        required: true,
      },
      {
        name: 'values',
        type: 'string',
        description: 'JSON 2D array of values to write',
        required: true,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const spreadsheetId = String(args.spreadsheet_id || '');
      const range = String(args.range || '');
      const valuesRaw = String(args.values || '');
      if (!spreadsheetId) {
        return {
          toolName: 'sheets_write',
          success: false,
          output: '',
          error: 'spreadsheet_id is required',
          durationMs: Date.now() - start,
        };
      }
      if (!range) {
        return {
          toolName: 'sheets_write',
          success: false,
          output: '',
          error: 'range is required',
          durationMs: Date.now() - start,
        };
      }
      if (!valuesRaw) {
        return {
          toolName: 'sheets_write',
          success: false,
          output: '',
          error: 'values is required',
          durationMs: Date.now() - start,
        };
      }
      let values: unknown[][];
      try {
        values = JSON.parse(valuesRaw);
      } catch {
        return {
          toolName: 'sheets_write',
          success: false,
          output: '',
          error: 'values must be valid JSON',
          durationMs: Date.now() - start,
        };
      }
      if (!Array.isArray(values)) {
        return {
          toolName: 'sheets_write',
          success: false,
          output: '',
          error: 'values must be a JSON 2D array',
          durationMs: Date.now() - start,
        };
      }
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${
            encodeURIComponent(spreadsheetId)
          }/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.sheetsPrivateKey}`,
              'Content-Type': 'application/json',
              'User-Agent': 'CortexPrism-AirtablePlugin/1.0.0',
            },
            body: JSON.stringify({ values }),
            signal: controller.signal,
          },
        );
        clearTimeout(t);
        if (!res.ok) {
          const txt = await res.text();
          return {
            toolName: 'sheets_write',
            success: false,
            output: '',
            error: `Sheets error ${res.status}: ${txt}`,
            durationMs: Date.now() - start,
          };
        }
        const data = await res.json();
        return {
          toolName: 'sheets_write',
          success: true,
          output: JSON.stringify(data, null, 2),
          durationMs: Date.now() - start,
        };
      } catch (e) {
        clearTimeout(t);
        if (e instanceof Error && e.name === 'AbortError') {
          return {
            toolName: 'sheets_write',
            success: false,
            output: '',
            error: 'Request timeout (15s)',
            durationMs: Date.now() - start,
          };
        }
        throw e;
      }
    } catch (error) {
      return {
        toolName: 'sheets_write',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

export async function onUnload(_ctx: PluginContext): Promise<void> {}

export const tools: Tool[] = [
  airtableListRecordsTool,
  airtableCreateRecordTool,
  airtableUpdateRecordTool,
  airtableListBasesTool,
  sheetsReadTool,
  sheetsWriteTool,
];
