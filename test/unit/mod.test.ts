import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { tools } from '../../mod.ts';
import type { PluginContext, ToolContext } from '../../types.ts';

// Mock PluginContext
const mockContext: PluginContext & ToolContext = {
  pluginId: 'cortex-plugin-airtable',
  pluginDir: '/tmp/plugins/cortex-plugin-airtable',
  state: {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    list: async () => ({}),
  },
  config: {
    get: async () => null,
    set: async () => {},
    getAll: async () => ({}),
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  host: {
    registerTool: () => {},
    unregisterTool: () => {},
  },
  sessionId: 'test-session',
  workingDir: '/tmp',
  agentId: 'test-agent',
  workspaceDir: '/tmp',
};

function findTool(name: string) {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

Deno.test('tools array — exports all tools', () => {
  assertEquals(tools.length >= 1, true);
});

Deno.test('airtable_list_records — rejects empty base_id', async () => {
  const tool = findTool('airtable_list_records');
  const result = await tool.execute({ 'base_id': '' }, mockContext);
  assertEquals(result.success, false);
  assertEquals(result.success, false);
});

Deno.test('airtable_create_record — rejects empty base_id', async () => {
  const tool = findTool('airtable_create_record');
  const result = await tool.execute({ 'base_id': '' }, mockContext);
  assertEquals(result.success, false);
  assertEquals(result.success, false);
});

Deno.test('airtable_update_record — rejects empty base_id', async () => {
  const tool = findTool('airtable_update_record');
  const result = await tool.execute({ 'base_id': '' }, mockContext);
  assertEquals(result.success, false);
  assertEquals(result.success, false);
});

Deno.test('airtable_list_bases — tool is defined with name and description', () => {
  const tool = findTool('airtable_list_bases');
  assertEquals(typeof tool.definition.description, 'string');
  assertEquals(tool.definition.description.length > 0, true);
});

Deno.test('sheets_read — rejects empty spreadsheet_id', async () => {
  const tool = findTool('sheets_read');
  const result = await tool.execute({ 'spreadsheet_id': '' }, mockContext);
  assertEquals(result.success, false);
  assertEquals(result.success, false);
});

Deno.test('sheets_write — rejects empty spreadsheet_id', async () => {
  const tool = findTool('sheets_write');
  const result = await tool.execute({ 'spreadsheet_id': '' }, mockContext);
  assertEquals(result.success, false);
  assertEquals(result.success, false);
});

Deno.test('all tools return durationMs', async () => {
  for (const tool of tools) {
    const args: Record<string, unknown> = {};
    const result = await tool.execute(args, mockContext);
    assertEquals(typeof result.durationMs, 'number');
    assertEquals(result.durationMs >= 0, true);
  }
});
