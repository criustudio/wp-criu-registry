import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

function readFlag(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const baseUrl = (readFlag("--url") || process.env.MCP_HUB_URL || "http://localhost:3000").replace(/\/+$/, "");
const bearerToken = readFlag("--token") || process.env.MCP_HUB_TOKEN || process.env.MCP_API_KEY;

const headers = bearerToken
  ? {
      Authorization: `Bearer ${bearerToken}`,
    }
  : undefined;

const healthResponse = await fetch(`${baseUrl}/health`);
const health = await healthResponse.json();

const adminResponse = await fetch(`${baseUrl}/admin`);
const adminHtml = await adminResponse.text();

const client = new Client({ name: "mcp-hub-smoke", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
  requestInit: headers ? { headers } : undefined,
});

let tools = [];
try {
  await client.connect(transport);
  const result = await client.listTools();
  tools = result.tools.map((tool) => tool.name);
} finally {
  await client.close().catch(() => undefined);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      baseUrl,
      health_ok: health?.ok === true,
      connector_counts: health?.connector_counts ?? null,
      admin_contains_usage_guide: adminHtml.includes("Uso personal"),
      admin_contains_codex_snippet: adminHtml.includes("CRIU_MCP_HUB_TOKEN"),
      tool_count: tools.length,
      tools_preview: tools.slice(0, 12),
    },
    null,
    2,
  ),
);
