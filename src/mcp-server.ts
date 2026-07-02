import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { AppConfig } from "./config.js";
import type { StateStore } from "./lib/state.js";
import type { NotionHub } from "./notion.js";
import type { WordPressHub } from "./wordpress.js";

function toTextResult(title: string, payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: `${title}\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  };
}

function toErrorResult(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    isError: true,
  };
}

const siteRefSchema = z.string().min(1).describe("site_id, site_label o base_url del sitio.");

export function createServer(
  config: AppConfig,
  services: {
    store: StateStore;
    getNotionHub: (options?: { includeDisabled?: boolean }) => NotionHub;
    wordPressHub: WordPressHub;
  },
) {
  const server = new McpServer(
    {
      name: config.serverName,
      version: config.serverVersion,
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  server.registerTool(
    "hub_list_connections",
    {
      title: "List Connections",
      description: "Lista las conexiones operativas disponibles en este hub MCP.",
      annotations: {
        readOnlyHint: true,
      },
    },
    async () => {
      const notion = services.getNotionHub({ includeDisabled: true });
      const wordpress = services.store.getWordPressConnector();
      return toTextResult("Configured connections", {
        notion: notion.listConnections(),
        wordpress: {
          label: wordpress.label,
          status: wordpress.status,
          sites: wordpress.entities.length,
        },
      });
    },
  );

  server.registerTool(
    "notion_whoami",
    {
      title: "Notion Who Am I",
      description: "Verifica que una conexion de Notion esté viva y muestra el bot/token activo.",
      inputSchema: {
        workspace: z.string().min(1).describe("Alias configurado para el workspace de Notion."),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ workspace }) => {
      try {
        const notion = services.getNotionHub();
        return toTextResult("Notion identity", await notion.whoAmI(workspace));
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.registerTool(
    "notion_search",
    {
      title: "Search Notion",
      description: "Busca paginas o data sources dentro del workspace de Notion indicado.",
      inputSchema: {
        workspace: z.string().min(1),
        query: z.string().optional(),
        object: z.enum(["page", "data_source", "all"]).default("page"),
        limit: z.number().int().min(1).max(100).default(10),
        startCursor: z.string().optional(),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ workspace, query, object, limit, startCursor }) => {
      try {
        const notion = services.getNotionHub();
        return toTextResult("Notion search results", await notion.search(workspace, { query, object, limit, startCursor }));
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.registerTool(
    "notion_get_page",
    {
      title: "Get Notion Page",
      description: "Recupera una pagina de Notion con sus propiedades.",
      inputSchema: {
        workspace: z.string().min(1),
        pageId: z.string().min(1),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ workspace, pageId }) => {
      try {
        const notion = services.getNotionHub();
        return toTextResult("Notion page", await notion.getPage(workspace, pageId));
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.registerTool(
    "notion_get_page_markdown",
    {
      title: "Get Notion Page Markdown",
      description: "Recupera el contenido markdown de una pagina de Notion.",
      inputSchema: {
        workspace: z.string().min(1),
        pageId: z.string().min(1),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ workspace, pageId }) => {
      try {
        const notion = services.getNotionHub();
        return toTextResult("Notion page markdown", await notion.getPageMarkdown(workspace, pageId));
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.registerTool(
    "notion_create_page",
    {
      title: "Create Notion Page",
      description: "Crea una pagina nueva dentro del parent configurado o el parent enviado.",
      inputSchema: {
        workspace: z.string().min(1),
        title: z.string().min(1),
        markdown: z.string().optional(),
        parentPageId: z.string().optional(),
      },
    },
    async ({ workspace, title, markdown, parentPageId }) => {
      try {
        const notion = services.getNotionHub();
        return toTextResult("Notion page created", await notion.createPage(workspace, { title, markdown, parentPageId }));
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.registerTool(
    "notion_append_markdown",
    {
      title: "Append Notion Markdown",
      description: "Inserta markdown al final de una pagina de Notion o despues de un bloque especifico.",
      inputSchema: {
        workspace: z.string().min(1),
        pageId: z.string().min(1),
        markdown: z.string().min(1),
        afterBlockId: z.string().optional(),
      },
    },
    async ({ workspace, pageId, markdown, afterBlockId }) => {
      try {
        const notion = services.getNotionHub();
        return toTextResult("Notion markdown appended", await notion.appendMarkdown(workspace, { pageId, markdown, afterBlockId }));
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.registerTool(
    "notion_replace_markdown",
    {
      title: "Replace Notion Markdown",
      description: "Reemplaza por completo el contenido markdown de una pagina de Notion.",
      inputSchema: {
        workspace: z.string().min(1),
        pageId: z.string().min(1),
        markdown: z.string().min(1),
        allowDeletingContent: z.boolean().default(false),
      },
    },
    async ({ workspace, pageId, markdown, allowDeletingContent }) => {
      try {
        const notion = services.getNotionHub();
        return toTextResult(
          "Notion markdown replaced",
          await notion.replaceMarkdown(workspace, { pageId, markdown, allowDeletingContent }),
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.registerTool(
    "notion_update_title",
    {
      title: "Update Notion Title",
      description: "Actualiza el titulo de una pagina de Notion.",
      inputSchema: {
        workspace: z.string().min(1),
        pageId: z.string().min(1),
        title: z.string().min(1),
      },
    },
    async ({ workspace, pageId, title }) => {
      try {
        const notion = services.getNotionHub();
        return toTextResult("Notion title updated", await notion.updateTitle(workspace, { pageId, title }));
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.registerTool(
    "notion_move_page",
    {
      title: "Move Notion Page",
      description: "Mueve una pagina de Notion a otro parent page.",
      inputSchema: {
        workspace: z.string().min(1),
        pageId: z.string().min(1),
        parentPageId: z.string().min(1),
      },
    },
    async ({ workspace, pageId, parentPageId }) => {
      try {
        const notion = services.getNotionHub();
        return toTextResult("Notion page moved", await notion.movePage(workspace, { pageId, parentPageId }));
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.registerTool(
    "notion_archive_page",
    {
      title: "Archive Notion Page",
      description: "Manda una pagina a la papelera o la restaura.",
      inputSchema: {
        workspace: z.string().min(1),
        pageId: z.string().min(1),
        inTrash: z.boolean().default(true),
      },
    },
    async ({ workspace, pageId, inTrash }) => {
      try {
        const notion = services.getNotionHub();
        return toTextResult("Notion page archive state updated", await notion.archivePage(workspace, { pageId, inTrash }));
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "list_sites",
    "Lista los sitios WordPress configurados para este MCP.",
    {
      environment: z.enum(["production", "staging", "development"]).optional(),
    },
    async ({ environment }) => {
      try {
        const sites = services.wordPressHub.listOperationalSites(environment);
        return services.wordPressHub.buildToolTextResult(sites, `Sitios disponibles: ${sites.length}.`);
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "get_site_info",
    "Consulta /site-info del bridge para validar conexión y metadatos del sitio.",
    { site: siteRefSchema },
    async ({ site }) => {
      try {
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "GET", "/site-info"),
          `Sitio consultado: ${site}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "list_plugins",
    "Lista plugins instalados en un sitio WordPress.",
    { site: siteRefSchema },
    async ({ site }) => {
      try {
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "GET", "/plugins"),
          `Plugins listados para ${site}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "plugin_action",
    "Activa, desactiva o elimina un plugin por plugin_file.",
    {
      site: siteRefSchema,
      plugin_file: z.string().min(1),
      action: z.enum(["activate", "deactivate", "delete"]),
    },
    async ({ site, plugin_file, action }) => {
      try {
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "POST", "/plugins/action", { plugin_file, action }),
          `Acción ${action} ejecutada sobre ${plugin_file} en ${site}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "install_plugin_zip",
    "Instala un plugin ZIP local en un sitio WordPress y opcionalmente lo activa.",
    {
      site: siteRefSchema,
      zip_path: z.string().min(1).describe("Ruta local al ZIP del plugin."),
      activate: z.boolean().default(true),
    },
    async ({ site, zip_path, activate }) => {
      try {
        const zipPayload = services.wordPressHub.readZipAsBase64(zip_path);
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "POST", "/plugins/install-zip", { ...zipPayload, activate }),
          `ZIP instalado en ${site}: ${zipPayload.filename}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "list_themes",
    "Lista los temas instalados en un sitio WordPress.",
    { site: siteRefSchema },
    async ({ site }) => {
      try {
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "GET", "/themes"),
          `Temas listados para ${site}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "activate_theme",
    "Activa un tema por stylesheet.",
    {
      site: siteRefSchema,
      stylesheet: z.string().min(1),
    },
    async ({ site, stylesheet }) => {
      try {
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "POST", "/themes/activate", { stylesheet }),
          `Tema activado en ${site}: ${stylesheet}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "get_options",
    "Lee una o varias opciones de WordPress.",
    {
      site: siteRefSchema,
      options: z.array(z.string().min(1)).min(1),
    },
    async ({ site, options }) => {
      try {
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "POST", "/options/get", { options }),
          `Opciones consultadas en ${site}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "update_options",
    "Actualiza opciones de WordPress con un objeto JSON.",
    {
      site: siteRefSchema,
      options_json: z.string().min(2).describe("Objeto JSON con nombre de opción y valor."),
    },
    async ({ site, options_json }) => {
      try {
        const options = JSON.parse(options_json);
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "POST", "/options/update", { options }),
          `Opciones actualizadas en ${site}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "read_file",
    "Lee un archivo dentro del ABSPATH del sitio.",
    {
      site: siteRefSchema,
      path: z.string().min(1),
    },
    async ({ site, path }) => {
      try {
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "POST", "/files/read", { path }),
          `Archivo leído en ${site}: ${path}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "write_file",
    "Escribe un archivo dentro del ABSPATH del sitio.",
    {
      site: siteRefSchema,
      path: z.string().min(1),
      content: z.string(),
      encoding: z.enum(["text", "base64"]).default("text"),
      backup: z.boolean().default(true),
    },
    async ({ site, path, content, encoding, backup }) => {
      try {
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "POST", "/files/write", {
            path,
            content,
            encoding: encoding === "text" ? "" : encoding,
            backup,
          }),
          `Archivo escrito en ${site}: ${path}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "db_query",
    "Ejecuta una consulta SQL de solo lectura en el sitio.",
    {
      site: siteRefSchema,
      sql: z.string().min(1),
    },
    async ({ site, sql }) => {
      try {
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "POST", "/db/query", { sql }),
          `Consulta ejecutada en ${site}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "rest_proxy",
    "Llama una ruta REST interna del WordPress objetivo.",
    {
      site: siteRefSchema,
      route: z.string().min(1).describe("Ruta interna, por ejemplo /wc/v3/products o /elementor/v1/..."),
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
      params_json: z.string().optional().describe("Objeto JSON con query params."),
      body_json: z.string().optional().describe("Objeto JSON con body."),
    },
    async ({ site, route, method, params_json, body_json }) => {
      try {
        const params = params_json ? JSON.parse(params_json) : undefined;
        const body = body_json ? JSON.parse(body_json) : undefined;
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "POST", "/rest-proxy", { route, method, params, body }),
          `Proxy REST ejecutado en ${site}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "check_translations",
    "Verifica traducciones de cadenas para un text domain dado.",
    {
      site: siteRefSchema,
      strings: z.array(z.string().min(1)).min(1),
      domain: z.string().default("default"),
    },
    async ({ site, strings, domain }) => {
      try {
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "POST", "/i18n/check", { strings, domain }),
          `Traducciones verificadas en ${site}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "check_plural_translations",
    "Verifica traducciones plurales para un text domain.",
    {
      site: siteRefSchema,
      items_json: z.string().min(2).describe("Arreglo JSON con objetos { singular, plural, number }."),
      domain: z.string().default("default"),
    },
    async ({ site, items_json, domain }) => {
      try {
        const items = JSON.parse(items_json);
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "POST", "/i18n/check-plurals", { items, domain }),
          `Plurales verificados en ${site}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "get_wc_checkout_fields",
    "Obtiene la estructura de checkout fields de WooCommerce.",
    { site: siteRefSchema },
    async ({ site }) => {
      try {
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, "GET", "/wc/checkout-fields"),
          `Checkout fields consultados en ${site}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  server.tool(
    "bridge_raw_request",
    "Hace una llamada raw a un endpoint del bridge para cubrir casos no tipados.",
    {
      site: siteRefSchema,
      method: z.enum(["GET", "POST"]).default("GET"),
      endpoint: z.string().min(1).describe("Endpoint del bridge comenzando con /."),
      body_json: z.string().optional(),
    },
    async ({ site, method, endpoint, body_json }) => {
      try {
        const body = body_json ? JSON.parse(body_json) : undefined;
        return services.wordPressHub.buildToolTextResult(
          await services.wordPressHub.bridgeRequest(site, method, endpoint, body),
          `Raw request ejecutado en ${site}: ${endpoint}.`,
        );
      } catch (error) {
        return toErrorResult(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  return server;
}
