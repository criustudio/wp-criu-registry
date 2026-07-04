export type ConnectorKind = "notion" | "wordpress";
export type ConnectorStatus = "enabled" | "disabled";
export type ConnectorHealth = "ok" | "error" | "unknown";
export type WordPressEnvironment = "production" | "staging" | "development";

export type NotionConnectorConfig = {
  alias: string;
  token: string;
  defaultParentPageId?: string;
  notionVersion?: string;
  refreshToken?: string;
  workspaceId?: string;
  workspaceName?: string;
  workspaceIcon?: string;
  botId?: string;
  ownerType?: "user" | "workspace";
  ownerUserId?: string;
  ownerUserName?: string;
  ownerUserEmail?: string;
};

export type NotionConnectorRecord = {
  connector_id: string;
  kind: "notion";
  label: string;
  status: ConnectorStatus;
  auth_mode: "token" | "oauth";
  capabilities: string[];
  config: NotionConnectorConfig;
  entities: [];
  last_check_at?: string;
  last_error?: string | null;
  updated_at: string;
};

export type WordPressSiteRecord = {
  site_id: string;
  site_label: string;
  environment: WordPressEnvironment;
  base_url: string;
  bridge_url: string;
  token: string;
  notes: string[];
  wp_version?: string;
  php_version?: string;
  service_user?: string;
  updated_at: string;
  source: "manual" | "wp_criu_auto_register";
};

export type WordPressSiteEntity = {
  entity_id: string;
  label: string;
  status: ConnectorStatus;
  hidden: boolean;
  disabled: boolean;
  tags: string[];
  notes: string[];
  group?: string;
  site: WordPressSiteRecord;
  last_check_at?: string;
  last_error?: string | null;
  last_seen_at?: string;
  last_health?: ConnectorHealth;
};

export type WordPressConnectorConfig = {
  registration_enabled: boolean;
};

export type WordPressConnectorRecord = {
  connector_id: "wordpress";
  kind: "wordpress";
  label: string;
  status: ConnectorStatus;
  auth_mode: "bridge_token";
  capabilities: string[];
  config: WordPressConnectorConfig;
  entities: WordPressSiteEntity[];
  last_check_at?: string;
  last_error?: string | null;
  updated_at: string;
};

export type ConnectorRecord = NotionConnectorRecord | WordPressConnectorRecord;

export type HubState = {
  version: 1;
  updated_at: string;
  connectors: ConnectorRecord[];
};

export type ConnectorCatalogEntry = {
  kind: ConnectorKind | "template";
  label: string;
  status: "implemented" | "template";
  description: string;
  config_schema: Record<string, unknown>;
  entity_schema: Record<string, unknown>;
  onboarding_steps: string[];
};
