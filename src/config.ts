import path from "node:path";
import { z } from "zod/v4";

const bootstrapNotionSchema = z.object({
  alias: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_-]+$/i, "alias must contain only letters, numbers, _ or -"),
  label: z.string().min(1).optional(),
  token: z.string().min(1),
  defaultParentPageId: z.string().min(1).optional(),
  notionVersion: z.string().min(1).optional(),
});

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  MCP_SERVER_NAME: z.string().min(1).default("criu-mcp-hub"),
  MCP_SERVER_VERSION: z.string().min(1).default("0.2.0"),
  MCP_AUTH_MODE: z.enum(["none", "bearer"]).default("none"),
  MCP_API_KEY: z.string().optional(),
  MCP_ALLOWED_HOSTS: z.string().default(""),
  ADMIN_API_KEY: z.string().optional(),
  ADMIN_SESSION_SECRET: z.string().optional(),
  HUB_STATE_FILE: z.string().default(path.resolve(process.cwd(), "data", "hub-state.json")),
  WORDPRESS_REGISTRY_TOKEN: z.string().optional(),
  WORDPRESS_BOOTSTRAP_SITES_FILE: z.string().optional(),
  NOTION_CONNECTIONS_JSON: z.string().default("[]"),
  NOTION_OAUTH_CLIENT_ID: z.string().optional(),
  NOTION_OAUTH_CLIENT_SECRET: z.string().optional(),
  NOTION_OAUTH_REDIRECT_URI: z.string().url().optional(),
});

export type BootstrapNotionConnection = z.infer<typeof bootstrapNotionSchema>;

export type AppConfig = {
  port: number;
  serverName: string;
  serverVersion: string;
  authMode: "none" | "bearer";
  apiKey?: string;
  allowedHosts: string[];
  adminApiKey: string;
  adminSessionSecret: string;
  stateFile: string;
  wordPressRegistryToken: string;
  bootstrapNotionConnections: BootstrapNotionConnection[];
  wordPressBootstrapSitesFile?: string;
  notionOAuth: {
    enabled: boolean;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  };
};

function parseBootstrapNotionConnections(rawJson: string): BootstrapNotionConnection[] {
  const parsed = JSON.parse(rawJson) as unknown;
  const connections = z.array(bootstrapNotionSchema).parse(parsed);
  const seen = new Set<string>();

  for (const connection of connections) {
    if (seen.has(connection.alias)) {
      throw new Error(`Duplicate Notion alias detected: ${connection.alias}`);
    }
    seen.add(connection.alias);
  }

  return connections;
}

function parseAllowedHosts(rawHosts: string): string[] {
  const hosts = rawHosts
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(hosts)];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);

  if (parsed.MCP_AUTH_MODE === "bearer" && !parsed.MCP_API_KEY) {
    throw new Error("MCP_API_KEY is required when MCP_AUTH_MODE=bearer");
  }

  return {
    port: parsed.PORT,
    serverName: parsed.MCP_SERVER_NAME,
    serverVersion: parsed.MCP_SERVER_VERSION,
    authMode: parsed.MCP_AUTH_MODE,
    apiKey: parsed.MCP_API_KEY,
    allowedHosts: parseAllowedHosts(parsed.MCP_ALLOWED_HOSTS),
    adminApiKey: parsed.ADMIN_API_KEY ?? parsed.MCP_API_KEY ?? "dev-admin-key",
    adminSessionSecret: parsed.ADMIN_SESSION_SECRET ?? "dev-session-secret",
    stateFile: path.resolve(parsed.HUB_STATE_FILE),
    wordPressRegistryToken: parsed.WORDPRESS_REGISTRY_TOKEN ?? "dev-wp-registry-token",
    bootstrapNotionConnections: parseBootstrapNotionConnections(parsed.NOTION_CONNECTIONS_JSON),
    wordPressBootstrapSitesFile: parsed.WORDPRESS_BOOTSTRAP_SITES_FILE
      ? path.resolve(parsed.WORDPRESS_BOOTSTRAP_SITES_FILE)
      : undefined,
    notionOAuth: {
      enabled: Boolean(
        parsed.NOTION_OAUTH_CLIENT_ID && parsed.NOTION_OAUTH_CLIENT_SECRET && parsed.NOTION_OAUTH_REDIRECT_URI,
      ),
      clientId: parsed.NOTION_OAUTH_CLIENT_ID,
      clientSecret: parsed.NOTION_OAUTH_CLIENT_SECRET,
      redirectUri: parsed.NOTION_OAUTH_REDIRECT_URI,
    },
  };
}
