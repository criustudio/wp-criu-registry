export type ConnectorKind = "notion" | "wordpress" | "cpanel";
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
  blocked_site_ids: string[];
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

export type CPanelAuthMode = "cpanel_token" | "whm_token";

export type CPanelAccountRecord = {
  account_id: string;
  account_label: string;
  auth_mode: CPanelAuthMode;
  host: string;
  username: string;
  domain?: string;
  port: number;
  token: string;
  notes: string[];
  updated_at: string;
  source: "manual";
};

export type CPanelAccountEntity = {
  entity_id: string;
  label: string;
  status: ConnectorStatus;
  hidden: boolean;
  disabled: boolean;
  tags: string[];
  notes: string[];
  group?: string;
  account: CPanelAccountRecord;
  last_check_at?: string;
  last_error?: string | null;
  last_health?: ConnectorHealth;
};

export type CPanelConnectorRecord = {
  connector_id: "cpanel";
  kind: "cpanel";
  label: string;
  status: ConnectorStatus;
  auth_mode: "api_token";
  capabilities: string[];
  config: {
    registration_enabled: boolean;
    blocked_account_ids: string[];
  };
  entities: CPanelAccountEntity[];
  last_check_at?: string;
  last_error?: string | null;
  updated_at: string;
};

export type ConnectorRecord = NotionConnectorRecord | WordPressConnectorRecord | CPanelConnectorRecord;

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
