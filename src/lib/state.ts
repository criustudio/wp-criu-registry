import fs from "node:fs";
import path from "node:path";
import { z } from "zod/v4";
import type { AppConfig } from "../config.js";
import type {
  ConnectorRecord,
  ConnectorStatus,
  HubState,
  NotionConnectorConfig,
  NotionConnectorRecord,
  WordPressConnectorRecord,
  WordPressEnvironment,
  WordPressSiteEntity,
  WordPressSiteRecord,
} from "./types.js";

const wordpressEnvironmentSchema = z.enum(["production", "staging", "development"]);

const notionBootstrapSchema = z.object({
  alias: z.string().min(1),
  label: z.string().min(1).optional(),
  token: z.string().min(1),
  defaultParentPageId: z.string().min(1).optional(),
  notionVersion: z.string().min(1).optional(),
});

const notionOauthSchema = z.object({
  alias: z.string().min(1),
  label: z.string().min(1).optional(),
  token: z.string().min(1),
  refreshToken: z.string().min(1).nullable().optional(),
  defaultParentPageId: z.string().min(1).optional(),
  notionVersion: z.string().min(1).optional(),
  workspaceId: z.string().min(1),
  workspaceName: z.string().nullable().optional(),
  workspaceIcon: z.string().nullable().optional(),
  botId: z.string().min(1),
  ownerType: z.enum(["user", "workspace"]).optional(),
  ownerUserId: z.string().nullable().optional(),
  ownerUserName: z.string().nullable().optional(),
  ownerUserEmail: z.string().nullable().optional(),
  status: z.enum(["enabled", "disabled"]).optional(),
});

const wordPressSiteInputSchema = z.object({
  site_id: z.string().min(1),
  site_label: z.string().min(1),
  environment: wordpressEnvironmentSchema.default("production"),
  base_url: z.string().min(1),
  bridge_url: z.string().min(1),
  token: z.string().min(1),
  notes: z.array(z.string()).optional(),
  wp_version: z.string().optional(),
  php_version: z.string().optional(),
  service_user: z.union([z.string(), z.number()]).optional(),
  source: z.enum(["manual", "wp_criu_auto_register"]).optional(),
});

export type WordPressSiteMutation = Partial<{
  site_label: string;
  environment: WordPressEnvironment;
  base_url: string;
  bridge_url: string;
  token: string;
  site_notes: string[];
  metadata_notes: string[];
  tags: string[];
  group: string | null;
  hidden: boolean;
  disabled: boolean;
  wp_version: string | null;
  php_version: string | null;
  service_user: string | null;
}>;

function nowIso(): string {
  return new Date().toISOString();
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return dedupeStrings(value.map((item) => String(item)));
  }

  if (typeof value === "string") {
    return dedupeStrings(
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  return [];
}

function normalizeOptionalScalar(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  return undefined;
}

function extractBootstrapSites(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input;
  }

  if (input && typeof input === "object" && Array.isArray((input as { sites?: unknown[] }).sites)) {
    return (input as { sites: unknown[] }).sites;
  }

  return [];
}

function buildNotionConnector(
  config: NotionConnectorConfig,
  label?: string,
  status: ConnectorStatus = "enabled",
  authMode: NotionConnectorRecord["auth_mode"] = "token",
): NotionConnectorRecord {
  return {
    connector_id: `notion:${config.alias}`,
    kind: "notion",
    label: label ?? config.workspaceName ?? config.alias,
    status,
    auth_mode: authMode,
    capabilities: ["mcp", "search", "pages", "admin", "validation"],
    config,
    entities: [],
    last_check_at: undefined,
    last_error: null,
    updated_at: nowIso(),
  };
}

function buildWordPressConnector(): WordPressConnectorRecord {
  return {
    connector_id: "wordpress",
    kind: "wordpress",
    label: "WordPress",
    status: "enabled",
    auth_mode: "bridge_token",
    capabilities: ["mcp", "registry", "bridge", "admin", "sites"],
    config: {
      registration_enabled: true,
      blocked_site_ids: [],
    },
    entities: [],
    last_check_at: undefined,
    last_error: null,
    updated_at: nowIso(),
  };
}

function normalizeWordPressSiteRecord(rawSite: unknown, fallbackSource: WordPressSiteRecord["source"]): WordPressSiteRecord {
  const parsed = wordPressSiteInputSchema.parse(rawSite);
  return {
    site_id: parsed.site_id.trim(),
    site_label: parsed.site_label.trim(),
    environment: parsed.environment,
    base_url: parsed.base_url.trim(),
    bridge_url: parsed.bridge_url.trim(),
    token: parsed.token.trim(),
    notes: dedupeStrings(parsed.notes ?? []),
    wp_version: normalizeOptionalScalar(parsed.wp_version),
    php_version: normalizeOptionalScalar(parsed.php_version),
    service_user: normalizeOptionalScalar(parsed.service_user),
    updated_at: nowIso(),
    source: parsed.source ?? fallbackSource,
  };
}

function buildWordPressEntity(site: WordPressSiteRecord, metadata?: Partial<WordPressSiteEntity>): WordPressSiteEntity {
  return {
    entity_id: site.site_id,
    label: site.site_label,
    status: metadata?.status ?? "enabled",
    hidden: metadata?.hidden ?? false,
    disabled: metadata?.disabled ?? false,
    tags: dedupeStrings(metadata?.tags ?? []),
    notes: dedupeStrings(metadata?.notes ?? []),
    group: metadata?.group?.trim() || undefined,
    site,
    last_check_at: metadata?.last_check_at,
    last_error: metadata?.last_error ?? null,
    last_seen_at: metadata?.last_seen_at,
    last_health: metadata?.last_health ?? "unknown",
  };
}

export class StateStore {
  private readonly filePath: string;
  private state: HubState;

  constructor(private readonly config: AppConfig) {
    this.filePath = config.stateFile;
    this.state = this.loadState();
    this.persist();
  }

  private ensureParentDir(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  private createDefaultState(): HubState {
    return {
      version: 1,
      updated_at: nowIso(),
      connectors: [buildWordPressConnector()],
    };
  }

  private loadState(): HubState {
    this.ensureParentDir();

    let loaded = this.createDefaultState();
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(raw) as Partial<HubState>;
        loaded = {
          version: 1,
          updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : nowIso(),
          connectors: Array.isArray(parsed.connectors) ? (parsed.connectors as ConnectorRecord[]) : [],
        };
      } catch {
        loaded = this.createDefaultState();
      }
    }

    return this.migrateState(loaded);
  }

  private migrateState(input: HubState): HubState {
    const connectorMap = new Map<string, ConnectorRecord>();

    for (const connector of input.connectors ?? []) {
      if (!connector || typeof connector !== "object" || typeof connector.connector_id !== "string") {
        continue;
      }

      if (connector.kind === "notion") {
        const rawConfig = connector.config as Partial<NotionConnectorConfig> | undefined;
        if (!rawConfig?.alias || !rawConfig.token) {
          continue;
        }
        connectorMap.set(
          connector.connector_id,
          buildNotionConnector(
            {
              alias: rawConfig.alias,
              token: rawConfig.token,
              defaultParentPageId: rawConfig.defaultParentPageId,
              notionVersion: rawConfig.notionVersion,
              refreshToken: rawConfig.refreshToken,
              workspaceId: rawConfig.workspaceId,
              workspaceName: rawConfig.workspaceName,
              workspaceIcon: rawConfig.workspaceIcon,
              botId: rawConfig.botId,
              ownerType: rawConfig.ownerType,
              ownerUserId: rawConfig.ownerUserId,
              ownerUserName: rawConfig.ownerUserName,
              ownerUserEmail: rawConfig.ownerUserEmail,
            },
            connector.label,
            connector.status === "disabled" ? "disabled" : "enabled",
            connector.auth_mode === "oauth" ? "oauth" : "token",
          ),
        );
      }

      if (connector.kind === "wordpress") {
        const rawEntities = Array.isArray(connector.entities) ? connector.entities : [];
        const normalizedEntities: WordPressSiteEntity[] = [];

        for (const entity of rawEntities) {
          try {
            const rawSite = (entity as WordPressSiteEntity).site ?? entity;
            const site = normalizeWordPressSiteRecord(rawSite, "manual");
            normalizedEntities.push(
              buildWordPressEntity(site, {
                status: (entity as WordPressSiteEntity).status === "disabled" ? "disabled" : "enabled",
                hidden: Boolean((entity as WordPressSiteEntity).hidden),
                disabled: Boolean((entity as WordPressSiteEntity).disabled),
                tags: normalizeStringArray((entity as WordPressSiteEntity).tags),
                notes: normalizeStringArray((entity as WordPressSiteEntity).notes),
                group: typeof (entity as WordPressSiteEntity).group === "string" ? (entity as WordPressSiteEntity).group : undefined,
                last_check_at: (entity as WordPressSiteEntity).last_check_at,
                last_error: (entity as WordPressSiteEntity).last_error ?? null,
                last_seen_at: (entity as WordPressSiteEntity).last_seen_at,
                last_health: (entity as WordPressSiteEntity).last_health ?? "unknown",
              }),
            );
          } catch {
            continue;
          }
        }

        const wordpressConnector = buildWordPressConnector();
        wordpressConnector.status = connector.status === "disabled" ? "disabled" : "enabled";
        const rawConfig =
          connector.config && typeof connector.config === "object"
            ? (connector.config as Partial<WordPressConnectorRecord["config"]>)
            : undefined;
        wordpressConnector.config = {
          registration_enabled: rawConfig?.registration_enabled !== false,
          blocked_site_ids: normalizeStringArray(rawConfig?.blocked_site_ids),
        };
        wordpressConnector.entities = normalizedEntities;
        wordpressConnector.updated_at = connector.updated_at ?? nowIso();
        wordpressConnector.last_check_at = connector.last_check_at;
        wordpressConnector.last_error = connector.last_error ?? null;
        connectorMap.set("wordpress", wordpressConnector);
      }
    }

    if (!connectorMap.has("wordpress")) {
      connectorMap.set("wordpress", buildWordPressConnector());
    }

    for (const bootstrap of this.config.bootstrapNotionConnections) {
      const connectorId = `notion:${bootstrap.alias}`;
      if (!connectorMap.has(connectorId)) {
        connectorMap.set(
          connectorId,
          buildNotionConnector(
            {
              alias: bootstrap.alias,
              token: bootstrap.token,
              defaultParentPageId: bootstrap.defaultParentPageId,
              notionVersion: bootstrap.notionVersion,
            },
            bootstrap.label,
          ),
        );
      }
    }

    const bootstrapSources = [
      this.config.wordPressBootstrapSitesFile,
      path.join(path.dirname(this.filePath), "sites.json"),
    ].filter((candidate, index, list): candidate is string => {
      if (!candidate) {
        return false;
      }

      const resolved = path.resolve(candidate);
      return list.findIndex((item) => item && path.resolve(item) === resolved) === index && fs.existsSync(resolved);
    });

    for (const bootstrapFile of bootstrapSources) {
      try {
        const raw = fs.readFileSync(bootstrapFile, "utf8");
        const parsed = extractBootstrapSites(JSON.parse(raw));
        const connector = connectorMap.get("wordpress");
        if (connector?.kind === "wordpress") {
          for (const siteLike of parsed) {
            try {
              const site = normalizeWordPressSiteRecord(siteLike, "manual");
              const exists = connector.entities.some((entity) => entity.entity_id.toLowerCase() === site.site_id.toLowerCase());
              if (!exists) {
                connector.entities.push(buildWordPressEntity(site));
              }
            } catch {
              continue;
            }
          }
          connector.updated_at = nowIso();
        }
      } catch {
        // ignore bootstrap read failures to avoid blocking startup
      }
    }

    return {
      version: 1,
      updated_at: nowIso(),
      connectors: Array.from(connectorMap.values()),
    };
  }

  private persist(): void {
    this.state.updated_at = nowIso();
    this.ensureParentDir();
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2) + "\n", "utf8");
  }

  private findConnectorIndex(connectorId: string): number {
    return this.state.connectors.findIndex((connector) => connector.connector_id === connectorId);
  }

  private getWordPressConnectorMutable(): WordPressConnectorRecord {
    const index = this.findConnectorIndex("wordpress");
    if (index === -1) {
      const connector = buildWordPressConnector();
      this.state.connectors.push(connector);
      return connector;
    }

    const connector = this.state.connectors[index];
    if (connector.kind !== "wordpress") {
      throw new Error("Connector wordpress is corrupted.");
    }

    return connector;
  }

  getState(): HubState {
    return structuredClone(this.state);
  }

  listConnectors(): ConnectorRecord[] {
    return structuredClone(this.state.connectors);
  }

  getNotionConnectors(options?: { includeDisabled?: boolean }): NotionConnectorRecord[] {
    return this.state.connectors
      .filter((connector): connector is NotionConnectorRecord => connector.kind === "notion")
      .filter((connector) => options?.includeDisabled || connector.status === "enabled")
      .map((connector) => structuredClone(connector));
  }

  upsertNotionConnection(input: {
    alias: string;
    label?: string;
    token: string;
    defaultParentPageId?: string;
    notionVersion?: string;
    status?: ConnectorStatus;
  }): NotionConnectorRecord {
    const parsed = notionBootstrapSchema.parse(input);
    const connectorId = `notion:${parsed.alias}`;
    const record = buildNotionConnector(
      {
        alias: parsed.alias.trim(),
        token: parsed.token.trim(),
        defaultParentPageId: parsed.defaultParentPageId?.trim() || undefined,
        notionVersion: parsed.notionVersion?.trim() || undefined,
      },
      parsed.label?.trim(),
      input.status ?? "enabled",
    );

    const index = this.findConnectorIndex(connectorId);
    if (index >= 0) {
      const existing = this.state.connectors[index];
      if (existing.kind !== "notion") {
        throw new Error(`Connector ${connectorId} is not a Notion connector.`);
      }
      record.last_check_at = existing.last_check_at;
      record.last_error = existing.last_error ?? null;
      this.state.connectors[index] = record;
    } else {
      this.state.connectors.push(record);
    }

    this.persist();
    return structuredClone(record);
  }

  upsertNotionOAuthConnection(input: {
    alias: string;
    label?: string;
    token: string;
    refreshToken?: string | null;
    defaultParentPageId?: string;
    notionVersion?: string;
    workspaceId: string;
    workspaceName?: string | null;
    workspaceIcon?: string | null;
    botId: string;
    ownerType?: "user" | "workspace";
    ownerUserId?: string | null;
    ownerUserName?: string | null;
    ownerUserEmail?: string | null;
    status?: ConnectorStatus;
  }): NotionConnectorRecord {
    const parsed = notionOauthSchema.parse(input);
    const connectorId = `notion:${parsed.alias}`;
    const record = buildNotionConnector(
      {
        alias: parsed.alias.trim(),
        token: parsed.token.trim(),
        refreshToken: parsed.refreshToken?.trim() || undefined,
        defaultParentPageId: parsed.defaultParentPageId?.trim() || undefined,
        notionVersion: parsed.notionVersion?.trim() || undefined,
        workspaceId: parsed.workspaceId.trim(),
        workspaceName: parsed.workspaceName?.trim() || undefined,
        workspaceIcon: parsed.workspaceIcon?.trim() || undefined,
        botId: parsed.botId.trim(),
        ownerType: parsed.ownerType,
        ownerUserId: parsed.ownerUserId?.trim() || undefined,
        ownerUserName: parsed.ownerUserName?.trim() || undefined,
        ownerUserEmail: parsed.ownerUserEmail?.trim() || undefined,
      },
      parsed.label?.trim() || parsed.workspaceName?.trim() || undefined,
      parsed.status ?? "enabled",
      "oauth",
    );

    const index = this.findConnectorIndex(connectorId);
    if (index >= 0) {
      const existing = this.state.connectors[index];
      if (existing.kind !== "notion") {
        throw new Error(`Connector ${connectorId} is not a Notion connector.`);
      }
      record.last_check_at = existing.last_check_at;
      record.last_error = existing.last_error ?? null;
      this.state.connectors[index] = record;
    } else {
      this.state.connectors.push(record);
    }

    this.persist();
    return structuredClone(record);
  }

  patchNotionConnection(
    alias: string,
    patch: Partial<{
      label: string;
      token: string;
      refreshToken: string | null;
      defaultParentPageId: string | null;
      notionVersion: string | null;
      workspaceId: string | null;
      workspaceName: string | null;
      workspaceIcon: string | null;
      botId: string | null;
      ownerType: "user" | "workspace" | null;
      ownerUserId: string | null;
      ownerUserName: string | null;
      ownerUserEmail: string | null;
      status: ConnectorStatus;
      last_error: string | null;
      last_check_at: string | null;
    }>,
  ): NotionConnectorRecord {
    const connectorId = `notion:${alias}`;
    const index = this.findConnectorIndex(connectorId);
    if (index === -1) {
      throw new Error(`Notion alias not found: ${alias}`);
    }

    const existing = this.state.connectors[index];
    if (existing.kind !== "notion") {
      throw new Error(`Connector ${connectorId} is not Notion.`);
    }

    existing.label = patch.label?.trim() || existing.label;
    existing.status = patch.status ?? existing.status;
    existing.config.token = patch.token?.trim() || existing.config.token;
    existing.config.refreshToken =
      patch.refreshToken === null ? undefined : patch.refreshToken?.trim() || existing.config.refreshToken;
    existing.config.defaultParentPageId =
      patch.defaultParentPageId === null ? undefined : patch.defaultParentPageId?.trim() || existing.config.defaultParentPageId;
    existing.config.notionVersion =
      patch.notionVersion === null ? undefined : patch.notionVersion?.trim() || existing.config.notionVersion;
    existing.config.workspaceId = patch.workspaceId === null ? undefined : patch.workspaceId?.trim() || existing.config.workspaceId;
    existing.config.workspaceName =
      patch.workspaceName === null ? undefined : patch.workspaceName?.trim() || existing.config.workspaceName;
    existing.config.workspaceIcon =
      patch.workspaceIcon === null ? undefined : patch.workspaceIcon?.trim() || existing.config.workspaceIcon;
    existing.config.botId = patch.botId === null ? undefined : patch.botId?.trim() || existing.config.botId;
    existing.config.ownerType = patch.ownerType === null ? undefined : patch.ownerType ?? existing.config.ownerType;
    existing.config.ownerUserId =
      patch.ownerUserId === null ? undefined : patch.ownerUserId?.trim() || existing.config.ownerUserId;
    existing.config.ownerUserName =
      patch.ownerUserName === null ? undefined : patch.ownerUserName?.trim() || existing.config.ownerUserName;
    existing.config.ownerUserEmail =
      patch.ownerUserEmail === null ? undefined : patch.ownerUserEmail?.trim() || existing.config.ownerUserEmail;
    if (patch.last_error !== undefined) {
      existing.last_error = patch.last_error;
    }
    if (patch.last_check_at !== undefined) {
      existing.last_check_at = patch.last_check_at ?? undefined;
    }
    existing.updated_at = nowIso();

    this.persist();
    return structuredClone(existing);
  }

  removeNotionConnection(alias: string): void {
    const connectorId = `notion:${alias}`;
    const index = this.findConnectorIndex(connectorId);
    if (index === -1) {
      throw new Error(`Notion alias not found: ${alias}`);
    }

    this.state.connectors.splice(index, 1);
    this.persist();
  }

  setConnectorHealth(connectorId: string, payload: { ok: boolean; error?: string | null }): void {
    const index = this.findConnectorIndex(connectorId);
    if (index === -1) {
      return;
    }

    const connector = this.state.connectors[index];
    connector.last_check_at = nowIso();
    connector.last_error = payload.ok ? null : payload.error ?? "Unknown error";
    connector.updated_at = nowIso();
    this.persist();
  }

  getWordPressConnector(): WordPressConnectorRecord {
    return structuredClone(this.getWordPressConnectorMutable());
  }

  private normalizeSiteKey(siteId: string): string {
    return siteId.trim().toLowerCase();
  }

  isWordPressSiteBlocked(siteId: string): boolean {
    const connector = this.getWordPressConnectorMutable();
    const key = this.normalizeSiteKey(siteId);
    return connector.config.blocked_site_ids.some((candidate) => this.normalizeSiteKey(candidate) === key);
  }

  blockWordPressSite(siteId: string): void {
    const connector = this.getWordPressConnectorMutable();
    const key = this.normalizeSiteKey(siteId);
    if (connector.config.blocked_site_ids.some((candidate) => this.normalizeSiteKey(candidate) === key)) {
      return;
    }

    connector.config.blocked_site_ids.push(siteId.trim());
    connector.updated_at = nowIso();
    this.persist();
  }

  unblockWordPressSite(siteId: string): void {
    const connector = this.getWordPressConnectorMutable();
    const key = this.normalizeSiteKey(siteId);
    const next = connector.config.blocked_site_ids.filter((candidate) => this.normalizeSiteKey(candidate) !== key);
    if (next.length === connector.config.blocked_site_ids.length) {
      return;
    }

    connector.config.blocked_site_ids = next;
    connector.updated_at = nowIso();
    this.persist();
  }

  listWordPressSites(options?: { includeHidden?: boolean; includeDisabled?: boolean }): WordPressSiteEntity[] {
    return this.getWordPressConnectorMutable().entities
      .filter((entity) => options?.includeHidden || !entity.hidden)
      .filter((entity) => options?.includeDisabled || !entity.disabled)
      .map((entity) => structuredClone(entity));
  }

  registerWordPressSite(
    rawSite: unknown,
    metadata?: Partial<Pick<WordPressSiteEntity, "hidden" | "disabled" | "group" | "tags" | "notes">>,
    source: WordPressSiteRecord["source"] = "manual",
  ): WordPressSiteEntity {
    const site = normalizeWordPressSiteRecord(rawSite, source);
    if (source === "wp_criu_auto_register" && this.isWordPressSiteBlocked(site.site_id)) {
      throw new Error(`WordPress site blocked by admin deletion: ${site.site_id}`);
    }

    if (source === "manual") {
      this.unblockWordPressSite(site.site_id);
    }

    const connector = this.getWordPressConnectorMutable();
    const existingIndex = connector.entities.findIndex(
      (entity) => entity.entity_id.toLowerCase() === site.site_id.toLowerCase(),
    );

    const existing = existingIndex >= 0 ? connector.entities[existingIndex] : undefined;
    const next = buildWordPressEntity(site, {
      status: existing?.status ?? "enabled",
      hidden: metadata?.hidden ?? existing?.hidden ?? false,
      disabled: metadata?.disabled ?? existing?.disabled ?? false,
      group: metadata?.group ?? existing?.group,
      tags: metadata?.tags ?? existing?.tags ?? [],
      notes: metadata?.notes ?? existing?.notes ?? [],
      last_check_at: existing?.last_check_at,
      last_error: existing?.last_error ?? null,
      last_seen_at: nowIso(),
      last_health: existing?.last_health ?? "unknown",
    });

    if (existingIndex >= 0) {
      connector.entities[existingIndex] = next;
    } else {
      connector.entities.push(next);
    }

    connector.updated_at = nowIso();
    this.persist();
    return structuredClone(next);
  }

  patchWordPressSite(siteId: string, patch: WordPressSiteMutation): WordPressSiteEntity {
    const connector = this.getWordPressConnectorMutable();
    const index = connector.entities.findIndex((entity) => entity.entity_id.toLowerCase() === siteId.toLowerCase());
    if (index === -1) {
      throw new Error(`WordPress site not found: ${siteId}`);
    }

    const entity = connector.entities[index];
    entity.label = patch.site_label?.trim() || entity.label;
    entity.site.site_label = patch.site_label?.trim() || entity.site.site_label;
    entity.site.environment = patch.environment ?? entity.site.environment;
    entity.site.base_url = patch.base_url?.trim() || entity.site.base_url;
    entity.site.bridge_url = patch.bridge_url?.trim() || entity.site.bridge_url;
    entity.site.token = patch.token?.trim() || entity.site.token;
    entity.site.notes = patch.site_notes ? normalizeStringArray(patch.site_notes) : entity.site.notes;
    entity.hidden = patch.hidden ?? entity.hidden;
    entity.disabled = patch.disabled ?? entity.disabled;
    entity.status = entity.disabled ? "disabled" : "enabled";
    entity.tags = patch.tags ? normalizeStringArray(patch.tags) : entity.tags;
    entity.notes = patch.metadata_notes ? normalizeStringArray(patch.metadata_notes) : entity.notes;
    entity.group = patch.group === null ? undefined : patch.group?.trim() || entity.group;
    entity.site.wp_version = patch.wp_version === null ? undefined : patch.wp_version?.trim() || entity.site.wp_version;
    entity.site.php_version = patch.php_version === null ? undefined : patch.php_version?.trim() || entity.site.php_version;
    entity.site.service_user =
      patch.service_user === null ? undefined : patch.service_user?.trim() || entity.site.service_user;
    entity.site.updated_at = nowIso();
    connector.updated_at = nowIso();

    this.persist();
    return structuredClone(entity);
  }

  deleteWordPressSite(siteId: string, options?: { blockAutoRegister?: boolean }): void {
    const connector = this.getWordPressConnectorMutable();
    const key = this.normalizeSiteKey(siteId);
    const next = connector.entities.filter((entity) => this.normalizeSiteKey(entity.entity_id) !== key);
    if (next.length === connector.entities.length) {
      throw new Error(`WordPress site not found: ${siteId}`);
    }

    connector.entities = next;
    connector.updated_at = nowIso();
    this.persist();

    if (options?.blockAutoRegister !== false) {
      this.blockWordPressSite(siteId);
    }
  }

  setWordPressSiteHealth(
    siteId: string,
    payload: Partial<{
      last_health: WordPressSiteEntity["last_health"];
      last_error: string | null;
      wp_version: string | null;
      php_version: string | null;
      service_user: string | null;
    }>,
  ): WordPressSiteEntity {
    const connector = this.getWordPressConnectorMutable();
    const entity = connector.entities.find((candidate) => candidate.entity_id.toLowerCase() === siteId.toLowerCase());
    if (!entity) {
      throw new Error(`WordPress site not found: ${siteId}`);
    }

    entity.last_health = payload.last_health ?? entity.last_health ?? "unknown";
    entity.last_error = payload.last_error ?? null;
    entity.last_check_at = nowIso();
    entity.last_seen_at = nowIso();
    entity.site.wp_version = payload.wp_version === null ? undefined : payload.wp_version ?? entity.site.wp_version;
    entity.site.php_version = payload.php_version === null ? undefined : payload.php_version ?? entity.site.php_version;
    entity.site.service_user =
      payload.service_user === null ? undefined : payload.service_user ?? entity.site.service_user;
    entity.site.updated_at = nowIso();
    connector.updated_at = nowIso();

    this.persist();
    return structuredClone(entity);
  }
}
