import fs from "node:fs/promises";
import path from "node:path";

function readFlag(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const registryUrl = (readFlag("--url") || process.env.LEGACY_REGISTRY_URL || "https://mcp.criu.com.co").replace(/\/+$/, "");
const registryToken = readFlag("--token") || process.env.LEGACY_REGISTRY_TOKEN || process.env.WORDPRESS_REGISTRY_TOKEN;
const outputPath = path.resolve(readFlag("--output") || process.env.LEGACY_REGISTRY_OUTPUT || path.join("data", "sites.json"));

if (!registryToken) {
  throw new Error("Missing legacy registry token. Set LEGACY_REGISTRY_TOKEN, WORDPRESS_REGISTRY_TOKEN, or pass --token.");
}

const response = await fetch(`${registryUrl}/sites`, {
  headers: {
    Authorization: `Bearer ${registryToken}`,
  },
});

const payload = await response.json().catch(async () => {
  const text = await response.text();
  throw new Error(`Legacy registry did not return JSON: ${text}`);
});

if (!response.ok) {
  throw new Error(`Legacy registry ${response.status}: ${JSON.stringify(payload)}`);
}

if (!Array.isArray(payload?.sites)) {
  throw new Error("Legacy registry response does not contain a sites array.");
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(payload.sites, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      ok: true,
      imported_sites: payload.sites.length,
      source: `${registryUrl}/sites`,
      output: outputPath,
    },
    null,
    2,
  ),
);
