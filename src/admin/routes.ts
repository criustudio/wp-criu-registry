import { Client } from "@notionhq/client";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { z } from "zod/v4";
import type { AppConfig } from "../config.js";
import {
  clearAdminSessionCookie,
  createSignedPayload,
  hasAdminSession,
  setAdminSessionCookie,
  verifySignedPayload,
} from "../lib/auth.js";
import { connectorCatalog } from "../lib/catalog.js";
import type { StateStore } from "../lib/state.js";
import type { NotionHub } from "../notion.js";
import { renderAdminPage } from "./ui.js";
import { normalizeWordPressMutationInput, type WordPressHub } from "../wordpress.js";

const loginSchema = z.object({
  apiKey: z.string().min(1),
});

const notionCreateSchema = z.object({
  alias: z.string().min(1),
  label: z.string().min(1).optional(),
  token: z.string().min(1),
  defaultParentPageId: z.string().min(1).optional(),
  notionVersion: z.string().min(1).optional(),
});

const notionPatchSchema = z.object({
  label: z.string().min(1).optional(),
  token: z.string().min(1).optional(),
  defaultParentPageId: z.string().min(1).nullable().optional(),
  notionVersion: z.string().min(1).nullable().optional(),
  status: z.enum(["enabled", "disabled"]).optional(),
});

const notionOauthStartSchema = z.object({
  alias: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_-]+$/i, "El alias solo puede contener letras, numeros, guion y guion bajo."),
  label: z.string().min(1).optional(),
  defaultParentPageId: z.string().min(1).optional(),
  notionVersion: z.string().min(1).optional(),
});

const notionOauthStateSchema = z.object({
  alias: z.string().min(1),
  label: z.string().min(1).optional(),
  defaultParentPageId: z.string().min(1).optional(),
  notionVersion: z.string().min(1).optional(),
});

const wordPressPatchSchema = z.object({
  site_label: z.string().min(1).optional(),
  environment: z.enum(["production", "staging", "development"]).optional(),
  base_url: z.string().min(1).optional(),
  bridge_url: z.string().min(1).optional(),
  token: z.string().min(1).optional(),
  site_notes: z.union([z.array(z.string()), z.string()]).optional(),
  hidden: z.boolean().optional(),
  disabled: z.boolean().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  metadata_notes: z.union([z.array(z.string()), z.string()]).optional(),
  group: z.string().nullable().optional(),
  wp_version: z.string().nullable().optional(),
  php_version: z.string().nullable().optional(),
  service_user: z.union([z.string(), z.number()]).nullable().optional(),
});

const wordPressSyncSchema = z.object({
  site_id: z.string().min(1).optional(),
});

function toResponseError(res: Response, error: unknown, status = 400): void {
  res.status(status).json({
    ok: false,
    error: error instanceof Error ? error.message : "Unknown error",
  });
}

function buildAdminRedirect(config: AppConfig, params: Record<string, string | undefined>): string {
  const base = config.notionOAuth.redirectUri ? new URL("/admin", config.notionOAuth.redirectUri).toString() : "/admin";
  const url = new URL(base, "http://localhost");

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  if (base.startsWith("http://") || base.startsWith("https://")) {
    return `${base.split("?")[0]}?${url.searchParams.toString()}`;
  }

  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function registerAdminRoutes(app: Express, services: {
  config: AppConfig;
  store: StateStore;
  getNotionHub: (options?: { includeDisabled?: boolean }) => NotionHub;
  wordPressHub: WordPressHub;
}): void {
  app.use("/api/admin", express.json({ limit: "2mb" }));

  app.get("/admin", (_req, res) => {
    res.type("html").send(renderAdminPage());
  });

  app.get("/api/admin/session", (req, res) => {
    res.json({
      ok: true,
      authenticated: hasAdminSession(req, services.config.adminSessionSecret),
    });
  });

  app.get("/api/admin/connectors/notion/oauth/callback", async (req, res) => {
    try {
      if (!services.config.notionOAuth.enabled || !services.config.notionOAuth.clientId || !services.config.notionOAuth.clientSecret) {
        res.redirect(
          buildAdminRedirect(services.config, {
            notion_oauth: "error",
            error: "Notion OAuth no esta configurado en el servidor.",
          }),
        );
        return;
      }

      const code = z.string().min(1).parse(req.query.code);
      const stateToken = z.string().min(1).parse(req.query.state);
      const state = verifySignedPayload(services.config.adminSessionSecret, stateToken);
      const parsedState = notionOauthStateSchema.safeParse(state);
      if (!parsedState.success) {
        throw new Error("El estado OAuth de Notion es invalido o ya vencio.");
      }

      const notion = new Client();
      const response = await notion.oauth.token({
        client_id: services.config.notionOAuth.clientId,
        client_secret: services.config.notionOAuth.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: services.config.notionOAuth.redirectUri,
      });

      const ownerUser =
        response.owner.type === "user" && "user" in response.owner
          ? (response.owner.user as Record<string, unknown>)
          : undefined;
      const ownerPerson =
        ownerUser?.person && typeof ownerUser.person === "object"
          ? (ownerUser.person as Record<string, unknown>)
          : undefined;

      services.store.upsertNotionOAuthConnection({
        alias: parsedState.data.alias,
        label: parsedState.data.label ?? response.workspace_name ?? parsedState.data.alias,
        token: response.access_token,
        refreshToken: response.refresh_token,
        defaultParentPageId: parsedState.data.defaultParentPageId,
        notionVersion: parsedState.data.notionVersion,
        workspaceId: response.workspace_id,
        workspaceName: response.workspace_name,
        workspaceIcon: response.workspace_icon,
        botId: response.bot_id,
        ownerType: response.owner.type,
        ownerUserId: typeof ownerUser?.id === "string" ? ownerUser.id : undefined,
        ownerUserName: typeof ownerUser?.name === "string" ? ownerUser.name : undefined,
        ownerUserEmail: typeof ownerPerson?.email === "string" ? ownerPerson.email : undefined,
      });

      res.redirect(
        buildAdminRedirect(services.config, {
          notion_oauth: "success",
          alias: parsedState.data.alias,
        }),
      );
    } catch (error) {
      res.redirect(
        buildAdminRedirect(services.config, {
          notion_oauth: "error",
          error: error instanceof Error ? error.message : "OAuth callback failed",
        }),
      );
    }
  });

  app.post("/api/admin/login", (req, res) => {
    try {
      const parsed = loginSchema.parse(req.body);
      if (parsed.apiKey !== services.config.adminApiKey) {
        res.status(401).json({ ok: false, error: "Invalid ADMIN_API_KEY." });
        return;
      }

      setAdminSessionCookie(res, services.config.adminSessionSecret);
      res.json({ ok: true, authenticated: true });
    } catch (error) {
      toResponseError(res, error);
    }
  });

  app.post("/api/admin/logout", (_req, res) => {
    clearAdminSessionCookie(res);
    res.json({ ok: true });
  });

  app.use("/api/admin", (req: Request, res: Response, next: NextFunction) => {
    if (!hasAdminSession(req, services.config.adminSessionSecret)) {
      res.status(401).json({ ok: false, error: "Admin session required." });
      return;
    }
    next();
  });

  app.get("/api/admin/connectors", (_req, res) => {
    res.json({
      ok: true,
      connectors: services.store.listConnectors(),
      catalog: connectorCatalog,
      state_file: services.config.stateFile,
      notion_oauth: {
        enabled: services.config.notionOAuth.enabled,
        redirect_uri: services.config.notionOAuth.redirectUri,
      },
    });
  });

  app.get("/api/admin/connectors/notion/oauth/start", (req, res) => {
    try {
      if (!services.config.notionOAuth.enabled || !services.config.notionOAuth.clientId || !services.config.notionOAuth.redirectUri) {
        throw new Error("Notion OAuth no esta configurado. Define client_id, client_secret y redirect_uri en el servidor.");
      }

      const parsed = notionOauthStartSchema.parse(req.query);
      const stateToken = createSignedPayload(
        services.config.adminSessionSecret,
        {
          alias: parsed.alias,
          label: parsed.label,
          defaultParentPageId: parsed.defaultParentPageId,
          notionVersion: parsed.notionVersion,
        },
        1000 * 60 * 15,
      );

      const target = new URL("https://api.notion.com/v1/oauth/authorize");
      target.searchParams.set("client_id", services.config.notionOAuth.clientId);
      target.searchParams.set("response_type", "code");
      target.searchParams.set("owner", "user");
      target.searchParams.set("redirect_uri", services.config.notionOAuth.redirectUri);
      target.searchParams.set("state", stateToken);

      res.redirect(target.toString());
    } catch (error) {
      toResponseError(res, error);
    }
  });

  app.post("/api/admin/connectors/notion", (req, res) => {
    try {
      const parsed = notionCreateSchema.parse(req.body);
      const connector = services.store.upsertNotionConnection({
        alias: parsed.alias,
        label: parsed.label,
        token: parsed.token,
        defaultParentPageId: parsed.defaultParentPageId,
        notionVersion: parsed.notionVersion,
      });
      res.json({ ok: true, connector });
    } catch (error) {
      toResponseError(res, error);
    }
  });

  app.patch("/api/admin/connectors/notion/:alias", (req, res) => {
    try {
      const parsed = notionPatchSchema.parse(req.body);
      const connector = services.store.patchNotionConnection(req.params.alias, parsed);
      res.json({ ok: true, connector });
    } catch (error) {
      toResponseError(res, error);
    }
  });

  app.delete("/api/admin/connectors/notion/:alias", (req, res) => {
    try {
      services.store.removeNotionConnection(req.params.alias);
      res.json({ ok: true });
    } catch (error) {
      toResponseError(res, error, 404);
    }
  });

  app.post("/api/admin/connectors/notion/:alias/validate", async (req, res) => {
    try {
      const notion = services.getNotionHub({ includeDisabled: true });
      const result = await notion.whoAmI(req.params.alias);
      services.store.setConnectorHealth(`notion:${req.params.alias}`, { ok: true });
      res.json({ ok: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      services.store.setConnectorHealth(`notion:${req.params.alias}`, { ok: false, error: message });
      toResponseError(res, error);
    }
  });

  app.get("/api/admin/connectors/wordpress/sites", (_req, res) => {
    res.json({
      ok: true,
      connector: services.store.getWordPressConnector(),
      sites: services.wordPressHub.listAdminSites(),
    });
  });

  app.post("/api/admin/connectors/wordpress/sites", (req, res) => {
    try {
      const site = services.wordPressHub.registerSite(req.body, "manual");
      res.json({ ok: true, site });
    } catch (error) {
      toResponseError(res, error);
    }
  });

  app.patch("/api/admin/connectors/wordpress/sites/:siteId", (req, res) => {
    try {
      const parsed = wordPressPatchSchema.parse(req.body);
      const site = services.wordPressHub.patchSite(String(req.params.siteId), normalizeWordPressMutationInput(parsed));
      res.json({ ok: true, site });
    } catch (error) {
      toResponseError(res, error);
    }
  });

  app.delete("/api/admin/connectors/wordpress/sites/:siteId", (req, res) => {
    try {
      services.wordPressHub.deleteSite(String(req.params.siteId));
      res.json({ ok: true });
    } catch (error) {
      toResponseError(res, error, 404);
    }
  });

  app.post("/api/admin/connectors/wordpress/sync", async (req, res) => {
    try {
      const parsed = wordPressSyncSchema.parse(req.body ?? {});
      const result = await services.wordPressHub.syncSites(parsed.site_id);
      services.store.setConnectorHealth("wordpress", {
        ok: result.every((item) => item.ok),
        error: result.find((item) => !item.ok)?.error ?? null,
      });
      res.json({ ok: true, result });
    } catch (error) {
      services.store.setConnectorHealth("wordpress", {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      toResponseError(res, error);
    }
  });
}

export function registerWordPressRegistryRoutes(app: Express, services: {
  config: AppConfig;
  wordPressHub: WordPressHub;
}): void {
  app.use("/register-site", express.json({ limit: "2mb" }));
  app.use("/register-site/bridge", express.json({ limit: "2mb" }));
  app.use("/sites/:siteId", express.json({ limit: "2mb" }));

  const requireRegistryAuth = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match || match[1] !== services.config.wordPressRegistryToken) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    next();
  };

  app.get("/sites", requireRegistryAuth, (_req, res) => {
    res.json({
      ok: true,
      sites: services.wordPressHub.getPublicRegistrySites(),
    });
  });

  app.get("/sites/:siteId", requireRegistryAuth, (req, res) => {
    try {
      res.json({
        ok: true,
        site: services.wordPressHub.getSiteById(String(req.params.siteId)),
      });
    } catch (error) {
      toResponseError(res, error, 404);
    }
  });

  app.post("/register-site", requireRegistryAuth, (req, res) => {
    try {
      const site = services.wordPressHub.registerSite(req.body, "wp_criu_auto_register");
      res.json({
        ok: true,
        site_id: site.site.site_id,
        registered: true,
      });
    } catch (error) {
      toResponseError(res, error);
    }
  });

  app.post("/register-site/bridge", async (req, res) => {
    try {
      const result = await services.wordPressHub.registerSiteViaBridgeValidation(req.body, "wp_criu_auto_register");
      res.json({
        ok: true,
        site_id: result.site.site.site_id,
        registered: true,
        verified_via_bridge: true,
      });
    } catch (error) {
      toResponseError(res, error);
    }
  });

  app.patch("/sites/:siteId", requireRegistryAuth, (req, res) => {
    try {
      const parsed = wordPressPatchSchema.parse(req.body);
      const site = services.wordPressHub.patchSite(String(req.params.siteId), normalizeWordPressMutationInput(parsed));
      res.json({ ok: true, site });
    } catch (error) {
      toResponseError(res, error);
    }
  });

  app.delete("/sites/:siteId", requireRegistryAuth, (req, res) => {
    try {
      services.wordPressHub.deleteSite(String(req.params.siteId));
      res.json({ ok: true, deleted: true });
    } catch (error) {
      toResponseError(res, error, 404);
    }
  });
}
