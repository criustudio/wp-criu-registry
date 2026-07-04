import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import express, { type Request, type Response, type NextFunction } from "express";
import { loadConfig } from "./config.js";
import { registerAdminRoutes, registerWordPressRegistryRoutes } from "./admin/routes.js";
import { StateStore } from "./lib/state.js";
import { createServer } from "./mcp-server.js";
import { NotionHub } from "./notion.js";
import { WordPressHub } from "./wordpress.js";

const config = loadConfig();
const app = createMcpExpressApp({
  host: "0.0.0.0",
  allowedHosts: config.allowedHosts.length > 0 ? config.allowedHosts : undefined,
});
const store = new StateStore(config);
const wordPressHub = new WordPressHub(store);

function getNotionHub(options?: { includeDisabled?: boolean }) {
  return new NotionHub(store.getNotionConnectors({ includeDisabled: options?.includeDisabled }), {
    oauth: config.notionOAuth.enabled && config.notionOAuth.clientId && config.notionOAuth.clientSecret
      ? {
          clientId: config.notionOAuth.clientId,
          clientSecret: config.notionOAuth.clientSecret,
        }
      : undefined,
    onTokenRefresh: (connection) =>
      store.patchNotionConnection(connection.config.alias, {
        token: connection.config.token,
        refreshToken: connection.config.refreshToken ?? null,
        workspaceId: connection.config.workspaceId ?? null,
        workspaceName: connection.config.workspaceName ?? null,
        workspaceIcon: connection.config.workspaceIcon ?? null,
        botId: connection.config.botId ?? null,
        ownerType: connection.config.ownerType ?? null,
        ownerUserId: connection.config.ownerUserId ?? null,
        ownerUserName: connection.config.ownerUserName ?? null,
        ownerUserEmail: connection.config.ownerUserEmail ?? null,
        last_error: null,
      }),
  });
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (config.authMode === "none") {
    next();
    return;
  }

  const header = req.headers.authorization;
  const expected = `Bearer ${config.apiKey}`;
  if (header !== expected) {
    res.status(401).json({
      error: "unauthorized",
      message: "Missing or invalid bearer token.",
    });
    return;
  }

  next();
}

registerAdminRoutes(app, { config, store, getNotionHub, wordPressHub });
registerWordPressRegistryRoutes(app, { config, wordPressHub });

app.get("/", (_req, res) => {
  res.json({
    name: config.serverName,
    version: config.serverVersion,
    endpoint: "/mcp",
    admin: "/admin",
    registry: {
      sites: "/sites",
      register_site: "/register-site",
    },
    authMode: config.authMode,
    chatgpt: {
      primary_path: "Secure MCP Tunnel",
      fallback: "HTTPS direct to /mcp",
    },
  });
});

app.get("/health", (_req, res) => {
  const connectors = store.listConnectors();
  res.json({
    ok: true,
    name: config.serverName,
    version: config.serverVersion,
    state_file: config.stateFile,
    connector_counts: {
      total: connectors.length,
      notion: connectors.filter((connector) => connector.kind === "notion").length,
      wordpress_sites: store.getWordPressConnector().entities.length,
    },
    defaults_in_use: {
      admin_api_key: config.adminApiKey === "dev-admin-key",
      admin_session_secret: config.adminSessionSecret === "dev-session-secret",
      wordpress_registry_token: config.wordPressRegistryToken === "dev-wp-registry-token",
    },
  });
});

app.post("/mcp", authMiddleware, async (req, res) => {
  const server = createServer(config, { store, getNotionHub, wordPressHub });

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", authMiddleware, (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
});

app.delete("/mcp", authMiddleware, (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
});

app.listen(config.port, (error?: Error) => {
  if (error) {
    console.error("Failed to start MCP Hub:", error);
    process.exit(1);
  }

  console.log(`MCP Hub listening on port ${config.port}`);
});
