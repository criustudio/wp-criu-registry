#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "codex-wp-bridge-mcp",
  version: "0.2.0"
});

function getSitesFile() {
  const configured = process.env.CODEX_WP_BRIDGE_SITES_FILE;
  if (!configured) {
    throw new Error("Falta CODEX_WP_BRIDGE_SITES_FILE con la ruta al JSON de sitios.");
  }
  return path.resolve(configured);
}

function loadSites() {
  const file = getSitesFile();
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error("El archivo de sitios debe ser un arreglo JSON.");
  }

  return data.map((site) => ({
    site_id: String(site.site_id ?? "").trim(),
    site_label: String(site.site_label ?? "").trim(),
    environment: String(site.environment ?? "production").trim(),
    base_url: String(site.base_url ?? "").trim(),
    bridge_url: String(site.bridge_url ?? "").trim(),
    token: String(site.token ?? "").trim(),
    notes: Array.isArray(site.notes) ? site.notes.map(String) : []
  }));
}

function resolveSite(siteRef) {
  const sites = loadSites();
  const needle = String(siteRef ?? "").trim().toLowerCase();
  const match = sites.find((site) =>
    site.site_id.toLowerCase() === needle ||
    site.site_label.toLowerCase() === needle ||
    site.base_url.toLowerCase() === needle
  );

  if (!match) {
    throw new Error(`No encontré un sitio configurado para "${siteRef}".`);
  }

  if (!match.bridge_url || !match.token) {
    throw new Error(`El sitio ${match.site_id || match.site_label} no tiene bridge_url o token completos.`);
  }

  return match;
}

function safeJson(value) {
  return JSON.stringify(value, null, 2);
}

function textResult(value, summary) {
  const content = [{ type: "text", text: safeJson(value) }];
  if (summary) {
    content.push({ type: "text", text: summary });
  }
  return { content };
}

async function bridgeRequest(siteRef, method, endpoint, body) {
  const site = resolveSite(siteRef);
  const url = `${site.bridge_url.replace(/\/$/, "")}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${site.token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const rawText = await response.text();
  let parsed = null;

  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { text: rawText };
    }
  }

  if (!response.ok) {
    throw new Error(`Bridge ${response.status} en ${site.site_id}: ${rawText || response.statusText}`);
  }

  return {
    site: {
      site_id: site.site_id,
      site_label: site.site_label,
      environment: site.environment,
      bridge_url: site.bridge_url
    },
    data: parsed
  };
}

function readZipAsBase64(zipPath) {
  const absolute = path.resolve(zipPath);
  const data = fs.readFileSync(absolute);
  return {
    filename: path.basename(absolute),
    zip_base64: data.toString("base64")
  };
}

const siteRefSchema = z.string().min(1).describe("site_id, site_label o base_url del sitio.");

server.tool(
  "list_sites",
  "Lista los sitios WordPress configurados para este MCP.",
  {
    environment: z.enum(["production", "staging", "development"]).optional()
  },
  async ({ environment }) => {
    const sites = loadSites()
      .filter((site) => !environment || site.environment === environment)
      .map((site) => ({
        site_id: site.site_id,
        site_label: site.site_label,
        environment: site.environment,
        base_url: site.base_url,
        bridge_url: site.bridge_url,
        notes: site.notes
      }));
    return textResult(sites, `Sitios disponibles: ${sites.length}.`);
  }
);

server.tool(
  "get_site_info",
  "Consulta /site-info del bridge para validar conexión y metadatos del sitio.",
  { site: siteRefSchema },
  async ({ site }) => textResult(await bridgeRequest(site, "GET", "/site-info"), `Sitio consultado: ${site}.`)
);

server.tool(
  "list_plugins",
  "Lista plugins instalados en un sitio WordPress.",
  { site: siteRefSchema },
  async ({ site }) => textResult(await bridgeRequest(site, "GET", "/plugins"), `Plugins listados para ${site}.`)
);

server.tool(
  "plugin_action",
  "Activa, desactiva o elimina un plugin por plugin_file.",
  {
    site: siteRefSchema,
    plugin_file: z.string().min(1),
    action: z.enum(["activate", "deactivate", "delete"])
  },
  async ({ site, plugin_file, action }) =>
    textResult(
      await bridgeRequest(site, "POST", "/plugins/action", { plugin_file, action }),
      `Acción ${action} ejecutada sobre ${plugin_file} en ${site}.`
    )
);

server.tool(
  "install_plugin_zip",
  "Instala un plugin ZIP local en un sitio WordPress y opcionalmente lo activa.",
  {
    site: siteRefSchema,
    zip_path: z.string().min(1).describe("Ruta local al ZIP del plugin."),
    activate: z.boolean().default(true)
  },
  async ({ site, zip_path, activate }) => {
    const zipPayload = readZipAsBase64(zip_path);
    return textResult(
      await bridgeRequest(site, "POST", "/plugins/install-zip", { ...zipPayload, activate }),
      `ZIP instalado en ${site}: ${zipPayload.filename}.`
    );
  }
);

server.tool(
  "list_themes",
  "Lista los temas instalados en un sitio WordPress.",
  { site: siteRefSchema },
  async ({ site }) => textResult(await bridgeRequest(site, "GET", "/themes"), `Temas listados para ${site}.`)
);

server.tool(
  "activate_theme",
  "Activa un tema por stylesheet.",
  {
    site: siteRefSchema,
    stylesheet: z.string().min(1)
  },
  async ({ site, stylesheet }) =>
    textResult(await bridgeRequest(site, "POST", "/themes/activate", { stylesheet }), `Tema activado en ${site}: ${stylesheet}.`)
);

server.tool(
  "get_options",
  "Lee una o varias opciones de WordPress.",
  {
    site: siteRefSchema,
    options: z.array(z.string().min(1)).min(1)
  },
  async ({ site, options }) =>
    textResult(await bridgeRequest(site, "POST", "/options/get", { options }), `Opciones consultadas en ${site}.`)
);

server.tool(
  "update_options",
  "Actualiza opciones de WordPress con un objeto JSON.",
  {
    site: siteRefSchema,
    options_json: z.string().min(2).describe("Objeto JSON con nombre de opción y valor.")
  },
  async ({ site, options_json }) => {
    const options = JSON.parse(options_json);
    return textResult(await bridgeRequest(site, "POST", "/options/update", { options }), `Opciones actualizadas en ${site}.`);
  }
);

server.tool(
  "read_file",
  "Lee un archivo dentro del ABSPATH del sitio.",
  {
    site: siteRefSchema,
    path: z.string().min(1)
  },
  async ({ site, path }) => textResult(await bridgeRequest(site, "POST", "/files/read", { path }), `Archivo leído en ${site}: ${path}.`)
);

server.tool(
  "write_file",
  "Escribe un archivo dentro del ABSPATH del sitio.",
  {
    site: siteRefSchema,
    path: z.string().min(1),
    content: z.string(),
    encoding: z.enum(["text", "base64"]).default("text"),
    backup: z.boolean().default(true)
  },
  async ({ site, path, content, encoding, backup }) =>
    textResult(
      await bridgeRequest(site, "POST", "/files/write", {
        path,
        content,
        encoding: encoding === "text" ? "" : encoding,
        backup
      }),
      `Archivo escrito en ${site}: ${path}.`
    )
);

server.tool(
  "db_query",
  "Ejecuta una consulta SQL de solo lectura en el sitio.",
  {
    site: siteRefSchema,
    sql: z.string().min(1)
  },
  async ({ site, sql }) => textResult(await bridgeRequest(site, "POST", "/db/query", { sql }), `Consulta ejecutada en ${site}.`)
);

server.tool(
  "rest_proxy",
  "Llama una ruta REST interna del WordPress objetivo.",
  {
    site: siteRefSchema,
    route: z.string().min(1).describe("Ruta interna, por ejemplo /wc/v3/products o /elementor/v1/..."),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
    params_json: z.string().optional().describe("Objeto JSON con query params."),
    body_json: z.string().optional().describe("Objeto JSON con body.")
  },
  async ({ site, route, method, params_json, body_json }) => {
    const params = params_json ? JSON.parse(params_json) : undefined;
    const body = body_json ? JSON.parse(body_json) : undefined;
    return textResult(await bridgeRequest(site, "POST", "/rest-proxy", { route, method, params, body }), `Proxy REST ejecutado en ${site}.`);
  }
);

server.tool(
  "check_translations",
  "Verifica traducciones de cadenas para un text domain dado.",
  {
    site: siteRefSchema,
    strings: z.array(z.string().min(1)).min(1),
    domain: z.string().default("default")
  },
  async ({ site, strings, domain }) =>
    textResult(await bridgeRequest(site, "POST", "/i18n/check", { strings, domain }), `Traducciones verificadas en ${site}.`)
);

server.tool(
  "check_plural_translations",
  "Verifica traducciones plurales para un text domain.",
  {
    site: siteRefSchema,
    items_json: z.string().min(2).describe("Arreglo JSON con objetos { singular, plural, number }."),
    domain: z.string().default("default")
  },
  async ({ site, items_json, domain }) => {
    const items = JSON.parse(items_json);
    return textResult(await bridgeRequest(site, "POST", "/i18n/check-plurals", { items, domain }), `Plurales verificados en ${site}.`);
  }
);

server.tool(
  "get_wc_checkout_fields",
  "Obtiene la estructura de checkout fields de WooCommerce.",
  { site: siteRefSchema },
  async ({ site }) => textResult(await bridgeRequest(site, "GET", "/wc/checkout-fields"), `Checkout fields consultados en ${site}.`)
);

server.tool(
  "bridge_raw_request",
  "Hace una llamada raw a un endpoint del bridge para cubrir casos no tipados.",
  {
    site: siteRefSchema,
    method: z.enum(["GET", "POST"]).default("GET"),
    endpoint: z.string().min(1).describe("Endpoint del bridge comenzando con /."),
    body_json: z.string().optional()
  },
  async ({ site, method, endpoint, body_json }) => {
    const body = body_json ? JSON.parse(body_json) : undefined;
    return textResult(await bridgeRequest(site, method, endpoint, body), `Raw request ejecutado en ${site}: ${endpoint}.`);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
