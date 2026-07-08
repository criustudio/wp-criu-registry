import fs from "node:fs";
import path from "node:path";
import { z } from "zod/v4";
import type { StateStore, WordPressSiteMutation } from "./lib/state.js";
import type { ConnectorStatus, WordPressEnvironment, WordPressSiteEntity } from "./lib/types.js";

const wordPressSiteAdminInputSchema = z.preprocess((rawInput) => {
  if (!rawInput || typeof rawInput !== "object") {
    return rawInput;
  }

  const payload = { ...(rawInput as Record<string, unknown>) };
  if (payload.token == null) {
    const bridgeToken = payload.bridge_token ?? payload.site_token ?? payload.x_codex_token;
    if (typeof bridgeToken === "string" || typeof bridgeToken === "number") {
      payload.token = String(bridgeToken);
    }
  }

  if (payload.service_user != null && typeof payload.service_user === "number" && Number.isFinite(payload.service_user)) {
    payload.service_user = String(payload.service_user);
  }

  return payload;
}, z.object({
  site_id: z.string().min(1),
  site_label: z.string().min(1),
  environment: z.enum(["production", "staging", "development"]).default("production"),
  base_url: z.string().min(1),
  bridge_url: z.string().min(1),
  token: z.string().min(1),
  site_notes: z.union([z.array(z.string()), z.string()]).optional(),
  hidden: z.boolean().optional(),
  disabled: z.boolean().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  metadata_notes: z.union([z.array(z.string()), z.string()]).optional(),
  group: z.string().optional(),
  wp_version: z.string().optional(),
  php_version: z.string().optional(),
  service_user: z.union([z.string(), z.number()]).optional(),
}));

type BridgeSiteInfo = {
  site_id: string;
  site_label: string;
  environment: WordPressEnvironment;
  bridge_url: string;
};

type BridgeResponse = {
  site: BridgeSiteInfo;
  data: unknown;
};

type ValidatedRegistrationPayload = {
  site_id: string;
  site_label: string;
  environment: WordPressEnvironment;
  base_url: string;
  bridge_url: string;
  token: string;
  site_notes: string[];
  hidden?: boolean;
  disabled?: boolean;
  tags: string[];
  metadata_notes: string[];
  group?: string;
  wp_version?: string;
  php_version?: string;
  service_user?: string;
};

function safeJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function normalizeArrayInput(value: string[] | string | undefined): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => item.trim()).filter(Boolean)));
  }

  return Array.from(
    new Set(
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function extractNestedValue(payload: unknown, keys: string[]): string | undefined {
  let current: unknown = payload;
  for (const key of keys) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  if (typeof current === "number" && Number.isFinite(current)) {
    return String(current);
  }

  return typeof current === "string" && current.trim() ? current.trim() : undefined;
}

export class WordPressHub {
  constructor(private readonly store: StateStore) {}

  private getConnectorStatus(): ConnectorStatus {
    return this.store.getWordPressConnector().status;
  }

  isEnabled(): boolean {
    return this.getConnectorStatus() === "enabled";
  }

  listOperationalSites(environment?: WordPressEnvironment) {
    if (!this.isEnabled()) {
      return [];
    }

    return this.store
      .listWordPressSites({ includeDisabled: false, includeHidden: false })
      .filter((entity) => !environment || entity.site.environment === environment)
      .map((entity) => ({
        site_id: entity.site.site_id,
        site_label: entity.site.site_label,
        environment: entity.site.environment,
        base_url: entity.site.base_url,
        bridge_url: entity.site.bridge_url,
        notes: entity.site.notes,
      }));
  }

  listAdminSites(): WordPressSiteEntity[] {
    return this.store.listWordPressSites({ includeDisabled: true, includeHidden: true });
  }

  getPublicRegistrySites() {
    return this.store.listWordPressSites({ includeDisabled: true, includeHidden: true }).map((entity) => ({
      ...entity.site,
      hidden: entity.hidden,
      disabled: entity.disabled,
      tags: entity.tags,
      group: entity.group,
      metadata_notes: entity.notes,
      last_health: entity.last_health,
      last_check_at: entity.last_check_at,
      last_error: entity.last_error,
    }));
  }

  getSiteById(siteId: string): WordPressSiteEntity {
    const match = this.store
      .listWordPressSites({ includeDisabled: true, includeHidden: true })
      .find((entity) => entity.entity_id.toLowerCase() === siteId.trim().toLowerCase());

    if (!match) {
      throw new Error(`WordPress site not found: ${siteId}`);
    }

    return match;
  }

  private async bridgeProbe(site: {
    site_id: string;
    site_label: string;
    environment: WordPressEnvironment;
    bridge_url: string;
    token: string;
  }): Promise<BridgeResponse> {
    const url = `${site.bridge_url.replace(/\/$/, "")}/site-info`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Codex-Token": site.token,
        "Content-Type": "application/json",
      },
    });

    const rawText = await response.text();
    let parsed: unknown = null;
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
        bridge_url: site.bridge_url,
      },
      data: parsed,
    };
  }

  validateRegistrationPayload(rawInput: unknown): ValidatedRegistrationPayload {
    const parsed = wordPressSiteAdminInputSchema.parse(rawInput);
    return {
      site_id: parsed.site_id.trim(),
      site_label: parsed.site_label.trim(),
      environment: parsed.environment,
      base_url: parsed.base_url.trim(),
      bridge_url: parsed.bridge_url.trim(),
      token: parsed.token.trim(),
      site_notes: normalizeArrayInput(parsed.site_notes),
      hidden: parsed.hidden,
      disabled: parsed.disabled,
      tags: normalizeArrayInput(parsed.tags),
      metadata_notes: normalizeArrayInput(parsed.metadata_notes),
      group: parsed.group?.trim() || undefined,
      wp_version: parsed.wp_version?.trim() || undefined,
      php_version: parsed.php_version?.trim() || undefined,
      service_user:
        parsed.service_user === undefined || parsed.service_user === null
          ? undefined
          : String(parsed.service_user).trim() || undefined,
    };
  }

  async registerSiteViaBridgeValidation(rawInput: unknown, source: "manual" | "wp_criu_auto_register" = "wp_criu_auto_register") {
    const payload = this.validateRegistrationPayload(rawInput);
    const bridgeInfo = await this.bridgeProbe({
      site_id: payload.site_id,
      site_label: payload.site_label,
      environment: payload.environment,
      bridge_url: payload.bridge_url,
      token: payload.token,
    });

    const remoteSiteId =
      extractNestedValue(bridgeInfo.data, ["site_id"]) ??
      extractNestedValue(bridgeInfo.data, ["site_info", "site_id"]) ??
      extractNestedValue(bridgeInfo.data, ["site", "site_id"]);
    if (remoteSiteId && remoteSiteId.toLowerCase() !== payload.site_id.toLowerCase()) {
      throw new Error(`El bridge respondió site_id=${remoteSiteId}, pero el registro intentó usar ${payload.site_id}.`);
    }

    const remoteEnvironment =
      extractNestedValue(bridgeInfo.data, ["environment"]) ??
      extractNestedValue(bridgeInfo.data, ["site_info", "environment"]) ??
      extractNestedValue(bridgeInfo.data, ["site", "environment"]);
    if (remoteEnvironment && remoteEnvironment !== payload.environment) {
      throw new Error(`El bridge respondió environment=${remoteEnvironment}, pero el registro intentó usar ${payload.environment}.`);
    }

    const site = this.store.registerWordPressSite(
      {
        site_id: payload.site_id,
        site_label: payload.site_label,
        environment: payload.environment,
        base_url: payload.base_url,
        bridge_url: payload.bridge_url,
        token: payload.token,
        notes: payload.site_notes,
        wp_version: payload.wp_version,
        php_version: payload.php_version,
        service_user: payload.service_user,
        source,
      },
      {
        hidden: payload.hidden,
        disabled: payload.disabled,
        tags: payload.tags,
        notes: payload.metadata_notes,
        group: payload.group,
      },
      source,
    );

    const wpVersion =
      extractNestedValue(bridgeInfo.data, ["wp_version"]) ??
      extractNestedValue(bridgeInfo.data, ["site_info", "wp_version"]) ??
      extractNestedValue(bridgeInfo.data, ["site", "wp_version"]) ??
      payload.wp_version;
    const phpVersion =
      extractNestedValue(bridgeInfo.data, ["php_version"]) ??
      extractNestedValue(bridgeInfo.data, ["site_info", "php_version"]) ??
      extractNestedValue(bridgeInfo.data, ["site", "php_version"]) ??
      payload.php_version;
    const serviceUser =
      extractNestedValue(bridgeInfo.data, ["service_user"]) ??
      extractNestedValue(bridgeInfo.data, ["service_user_id"]) ??
      extractNestedValue(bridgeInfo.data, ["site_info", "service_user"]) ??
      extractNestedValue(bridgeInfo.data, ["site_info", "service_user_id"]) ??
      extractNestedValue(bridgeInfo.data, ["site", "service_user"]) ??
      extractNestedValue(bridgeInfo.data, ["site", "service_user_id"]) ??
      payload.service_user;

    const health = this.store.setWordPressSiteHealth(site.site.site_id, {
      last_health: "ok",
      last_error: null,
      wp_version: wpVersion ?? null,
      php_version: phpVersion ?? null,
      service_user: serviceUser ?? null,
    });

    return {
      site: health,
      bridge: bridgeInfo,
    };
  }

  registerSite(rawInput: unknown, source: "manual" | "wp_criu_auto_register" = "manual"): WordPressSiteEntity {
    const parsed = wordPressSiteAdminInputSchema.parse(rawInput);

    return this.store.registerWordPressSite(
      {
        site_id: parsed.site_id,
        site_label: parsed.site_label,
        environment: parsed.environment,
        base_url: parsed.base_url,
        bridge_url: parsed.bridge_url,
        token: parsed.token,
        notes: normalizeArrayInput(parsed.site_notes),
        wp_version: parsed.wp_version,
        php_version: parsed.php_version,
        service_user: parsed.service_user,
        source,
      },
      {
        hidden: parsed.hidden,
        disabled: parsed.disabled,
        tags: normalizeArrayInput(parsed.tags),
        notes: normalizeArrayInput(parsed.metadata_notes),
        group: parsed.group,
      },
      source,
    );
  }

  patchSite(siteId: string, patch: WordPressSiteMutation): WordPressSiteEntity {
    return this.store.patchWordPressSite(siteId, patch);
  }

  deleteSite(siteId: string): void {
    this.store.deleteWordPressSite(siteId);
  }

  async syncSites(siteId?: string) {
    const candidates = siteId
      ? [this.getSiteById(siteId)]
      : this.store.listWordPressSites({ includeDisabled: true, includeHidden: true });

    const results = [];
    for (const entity of candidates) {
      try {
        const response = await this.bridgeProbe({
          site_id: entity.site.site_id,
          site_label: entity.site.site_label,
          environment: entity.site.environment,
          bridge_url: entity.site.bridge_url,
          token: entity.site.token,
        });
        const wpVersion =
          extractNestedValue(response.data, ["wp_version"]) ??
          extractNestedValue(response.data, ["site_info", "wp_version"]) ??
          extractNestedValue(response.data, ["site", "wp_version"]);
        const phpVersion =
          extractNestedValue(response.data, ["php_version"]) ??
          extractNestedValue(response.data, ["site_info", "php_version"]) ??
          extractNestedValue(response.data, ["site", "php_version"]);
        const serviceUser =
          extractNestedValue(response.data, ["service_user"]) ??
          extractNestedValue(response.data, ["site_info", "service_user"]) ??
          extractNestedValue(response.data, ["site", "service_user"]);

        const updated = this.store.setWordPressSiteHealth(entity.site.site_id, {
          last_health: "ok",
          last_error: null,
          wp_version: wpVersion ?? null,
          php_version: phpVersion ?? null,
          service_user: serviceUser ?? null,
        });

        results.push({
          site_id: entity.site.site_id,
          ok: true,
          status: updated.last_health,
          response,
        });
      } catch (error) {
        this.store.setWordPressSiteHealth(entity.site.site_id, {
          last_health: "error",
          last_error: error instanceof Error ? error.message : "Unknown error",
        });
        results.push({
          site_id: entity.site.site_id,
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  resolveSite(siteRef: string, options?: { allowDisabled?: boolean; allowHidden?: boolean }): WordPressSiteEntity {
    if (!this.isEnabled()) {
      throw new Error("WordPress connector is disabled.");
    }

    const needle = siteRef.trim().toLowerCase();
    const sites = this.store.listWordPressSites({ includeDisabled: true, includeHidden: true });
    const entity = sites.find(
      (candidate) =>
        candidate.site.site_id.toLowerCase() === needle ||
        candidate.site.site_label.toLowerCase() === needle ||
        candidate.site.base_url.toLowerCase() === needle,
    );

    if (!entity) {
      throw new Error(`No encontré un sitio configurado para "${siteRef}".`);
    }

    if (!options?.allowHidden && entity.hidden) {
      throw new Error(`El sitio ${entity.site.site_id} está oculto para operaciones MCP.`);
    }

    if (!options?.allowDisabled && entity.disabled) {
      throw new Error(`El sitio ${entity.site.site_id} está deshabilitado para operaciones MCP.`);
    }

    return entity;
  }

  async bridgeRequest(
    siteRef: string,
    method: "GET" | "POST",
    endpoint: string,
    body?: unknown,
    allowDisabled = false,
  ): Promise<BridgeResponse> {
    const entity = this.resolveSite(siteRef, { allowDisabled, allowHidden: allowDisabled });
    const url = `${entity.site.bridge_url.replace(/\/$/, "")}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        "X-Codex-Token": entity.site.token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const rawText = await response.text();
    let parsed: unknown = null;
    if (rawText) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = { text: rawText };
      }
    }

    if (!response.ok) {
      throw new Error(`Bridge ${response.status} en ${entity.site.site_id}: ${rawText || response.statusText}`);
    }

    return {
      site: {
        site_id: entity.site.site_id,
        site_label: entity.site.site_label,
        environment: entity.site.environment,
        bridge_url: entity.site.bridge_url,
      },
      data: parsed,
    };
  }

  readZipAsBase64(zipPath: string): { filename: string; zip_base64: string } {
    const absolute = path.resolve(zipPath);
    const data = fs.readFileSync(absolute);
    return {
      filename: path.basename(absolute),
      zip_base64: data.toString("base64"),
    };
  }

  buildToolTextResult(value: unknown, summary?: string) {
    const content = [{ type: "text" as const, text: safeJson(value) }];
    if (summary) {
      content.push({ type: "text" as const, text: summary });
    }
    return { content };
  }
}

export function normalizeWordPressMutationInput(input: Partial<{
  site_label: string;
  environment: WordPressEnvironment;
  base_url: string;
  bridge_url: string;
  token: string;
  site_notes: string[] | string;
  hidden: boolean;
  disabled: boolean;
  tags: string[] | string;
  metadata_notes: string[] | string;
  group: string | null;
  wp_version: string | null;
  php_version: string | null;
  service_user: string | number | null;
}>): WordPressSiteMutation {
  return {
    site_label: input.site_label,
    environment: input.environment,
    base_url: input.base_url,
    bridge_url: input.bridge_url,
    token: input.token,
    site_notes: input.site_notes !== undefined ? normalizeArrayInput(input.site_notes) : undefined,
    hidden: input.hidden,
    disabled: input.disabled,
    tags: input.tags !== undefined ? normalizeArrayInput(input.tags) : undefined,
    metadata_notes: input.metadata_notes !== undefined ? normalizeArrayInput(input.metadata_notes) : undefined,
    group: input.group,
    wp_version: input.wp_version,
    php_version: input.php_version,
    service_user:
      input.service_user === null || input.service_user === undefined
        ? input.service_user
        : String(input.service_user),
  };
}
