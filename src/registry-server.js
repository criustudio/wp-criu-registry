#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const host = process.env.CODEX_WP_BRIDGE_REGISTRY_HOST || "0.0.0.0";
const port = Number(process.env.PORT || process.env.CODEX_WP_BRIDGE_REGISTRY_PORT || 8787);
const registryToken = process.env.CODEX_WP_BRIDGE_REGISTRY_TOKEN || "";
const sitesFile = path.resolve(
  process.env.CODEX_WP_BRIDGE_SITES_FILE ||
    path.join(process.cwd(), "data", "sites.json")
);

if (!registryToken) {
  console.error("Falta CODEX_WP_BRIDGE_REGISTRY_TOKEN para proteger el endpoint de registro.");
  process.exit(1);
}

function ensureSitesFile() {
  const dir = path.dirname(sitesFile);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(sitesFile)) {
    fs.writeFileSync(sitesFile, "[]\n", "utf8");
  }
}

function loadSites() {
  ensureSitesFile();
  const raw = fs.readFileSync(sitesFile, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function saveSites(sites) {
  ensureSitesFile();
  fs.writeFileSync(sitesFile, JSON.stringify(sites, null, 2) + "\n", "utf8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large."));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function requireAuth(req) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match && match[1] === registryToken;
}

function normalizeSite(site) {
  return {
    site_id: String(site.site_id || "").trim(),
    site_label: String(site.site_label || "").trim(),
    environment: String(site.environment || "production").trim(),
    base_url: String(site.base_url || "").trim(),
    bridge_url: String(site.bridge_url || "").trim(),
    token: String(site.token || "").trim(),
    notes: Array.isArray(site.notes) ? site.notes.map(String) : [],
    wp_version: site.wp_version ? String(site.wp_version) : undefined,
    php_version: site.php_version ? String(site.php_version) : undefined,
    service_user: site.service_user ?? undefined,
    updated_at: new Date().toISOString(),
    source: "wp_criu_auto_register"
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
    return sendJson(res, 200, {
      ok: true,
      service: "wp_criu_registry",
      sites_file: sitesFile
    });
  }

  if (req.method === "GET" && url.pathname === "/sites") {
    if (!requireAuth(req)) {
      return sendJson(res, 401, { ok: false, error: "Unauthorized" });
    }

    return sendJson(res, 200, {
      ok: true,
      sites: loadSites()
    });
  }

  if (req.method === "POST" && url.pathname === "/register-site") {
    if (!requireAuth(req)) {
      return sendJson(res, 401, { ok: false, error: "Unauthorized" });
    }

    try {
      const rawBody = await readBody(req);
      const site = normalizeSite(JSON.parse(rawBody || "{}"));

      if (!site.site_id || !site.site_label || !site.base_url || !site.bridge_url || !site.token) {
        return sendJson(res, 400, {
          ok: false,
          error: "site_id, site_label, base_url, bridge_url, and token are required."
        });
      }

      const sites = loadSites();
      const index = sites.findIndex((item) => String(item.site_id).toLowerCase() === site.site_id.toLowerCase());

      if (index >= 0) {
        sites[index] = { ...sites[index], ...site };
      } else {
        sites.push(site);
      }

      saveSites(sites);

      return sendJson(res, 200, {
        ok: true,
        site_id: site.site_id,
        registered: true,
        total_sites: sites.length
      });
    } catch (error) {
      return sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error"
      });
    }
  }

  return sendJson(res, 404, { ok: false, error: "Not found" });
});

ensureSitesFile();
server.listen(port, host, () => {
  console.log(`wp_criu registry listening on http://${host}:${port}`);
  console.log(`sites file: ${sitesFile}`);
});
