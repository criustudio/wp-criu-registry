import {
  APIErrorCode,
  Client,
  isFullDataSource,
  isFullPage,
  isNotionClientError,
  type GetPageResponse,
  type PartialDataSourceObjectResponse,
  type SearchResponse,
} from "@notionhq/client";
import type { NotionConnectorRecord } from "./lib/types.js";

type SearchObject = "page" | "data_source" | "all";

export type NotionConnectionSummary = {
  connector_id: string;
  alias: string;
  label: string;
  status: "enabled" | "disabled";
  defaultParentPageId?: string;
};

export type SearchResultItem = {
  id: string;
  object: string;
  url?: string;
  title: string;
  lastEditedTime?: string;
};

type NotionHubOptions = {
  oauth?: {
    clientId: string;
    clientSecret: string;
  };
  onTokenRefresh?: (connection: NotionConnectorRecord) => Promise<NotionConnectorRecord> | NotionConnectorRecord;
};

function richTextToPlainText(items: Array<{ plain_text?: string }> | undefined): string {
  return (items ?? []).map((item) => item.plain_text ?? "").join("").trim();
}

function extractPageTitle(page: GetPageResponse): string {
  if (!isFullPage(page)) {
    return "(partial page)";
  }

  const titleProperty = Object.values(page.properties).find((property) => property.type === "title");
  if (!titleProperty || titleProperty.type !== "title") {
    return "(untitled)";
  }

  return richTextToPlainText(titleProperty.title) || "(untitled)";
}

function hasTextArrayTitle(value: unknown): value is Array<{ plain_text?: string }> {
  return Array.isArray(value);
}

function extractSearchTitle(item: SearchResponse["results"][number]): string {
  if ("properties" in item && item.object === "page") {
    return extractPageTitle(item);
  }

  if (item.object === "data_source" && isFullDataSource(item)) {
    return richTextToPlainText(item.title) || "(untitled)";
  }

  const partial = item as PartialDataSourceObjectResponse & { title?: unknown };
  if (hasTextArrayTitle(partial.title)) {
    return richTextToPlainText(partial.title) || "(untitled)";
  }

  return "(untitled)";
}

function normalizeNotionError(error: unknown): string {
  if (isNotionClientError(error)) {
    if (error.code === APIErrorCode.ObjectNotFound) {
      return "Notion no encuentra ese recurso en ese workspace o la integracion no tiene acceso.";
    }

    return `${error.name}: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown Notion error";
}

export class NotionHub {
  private readonly clients = new Map<string, Client>();
  private readonly records = new Map<string, NotionConnectorRecord>();
  private readonly summaries: NotionConnectionSummary[];

  constructor(connections: NotionConnectorRecord[], private readonly options?: NotionHubOptions) {
    this.summaries = connections.map((connection) => ({
      connector_id: connection.connector_id,
      alias: connection.config.alias,
      label: connection.label,
      status: connection.status,
      defaultParentPageId: connection.config.defaultParentPageId,
    }));

    for (const connection of connections) {
      this.records.set(connection.config.alias, structuredClone(connection));
      this.clients.set(connection.config.alias, this.createClient(connection));
    }
  }

  listConnections(): NotionConnectionSummary[] {
    return this.summaries;
  }

  private getClient(alias: string): Client {
    const client = this.clients.get(alias);
    if (!client) {
      throw new Error(`Unknown Notion workspace alias: ${alias}`);
    }
    return client;
  }

  private getRecord(alias: string): NotionConnectorRecord {
    const connection = this.records.get(alias);
    if (!connection) {
      throw new Error(`Unknown Notion workspace alias: ${alias}`);
    }
    return connection;
  }

  private createClient(connection: NotionConnectorRecord): Client {
    return new Client({
      auth: connection.config.token,
      notionVersion: connection.config.notionVersion,
    });
  }

  private getConnection(alias: string): NotionConnectionSummary {
    const connection = this.summaries.find((item) => item.alias === alias);
    if (!connection) {
      throw new Error(`Unknown Notion workspace alias: ${alias}`);
    }
    return connection;
  }

  private async refreshConnection(alias: string): Promise<NotionConnectorRecord | null> {
    const connection = this.getRecord(alias);
    if (
      connection.auth_mode !== "oauth" ||
      !connection.config.refreshToken ||
      !this.options?.oauth?.clientId ||
      !this.options?.oauth?.clientSecret ||
      !this.options?.onTokenRefresh
    ) {
      return null;
    }

    const notion = new Client();
    const refreshed = await notion.oauth.token({
      client_id: this.options.oauth.clientId,
      client_secret: this.options.oauth.clientSecret,
      grant_type: "refresh_token",
      refresh_token: connection.config.refreshToken,
    });

    const nextRecord = await this.options.onTokenRefresh({
      ...connection,
      auth_mode: "oauth",
      label: connection.label,
      config: {
        ...connection.config,
        token: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? connection.config.refreshToken,
        workspaceId: refreshed.workspace_id,
        workspaceName: refreshed.workspace_name ?? connection.config.workspaceName,
        workspaceIcon: refreshed.workspace_icon ?? connection.config.workspaceIcon,
        botId: refreshed.bot_id,
        ownerType: refreshed.owner.type,
        ownerUserId:
          refreshed.owner.type === "user" && "id" in refreshed.owner.user ? refreshed.owner.user.id : connection.config.ownerUserId,
        ownerUserName:
          refreshed.owner.type === "user" && "name" in refreshed.owner.user
            ? refreshed.owner.user.name ?? undefined
            : connection.config.ownerUserName,
        ownerUserEmail:
          refreshed.owner.type === "user" && "person" in refreshed.owner.user
            ? refreshed.owner.user.person?.email ?? undefined
            : connection.config.ownerUserEmail,
      },
    });

    this.records.set(alias, structuredClone(nextRecord));
    this.clients.set(alias, this.createClient(nextRecord));
    return nextRecord;
  }

  private async runWithClient<T>(alias: string, task: (client: Client, connection: NotionConnectionSummary) => Promise<T>): Promise<T> {
    const client = this.getClient(alias);
    const connection = this.getConnection(alias);

    try {
      return await task(client, connection);
    } catch (error) {
      if (isNotionClientError(error) && error.code === APIErrorCode.Unauthorized) {
        const refreshed = await this.refreshConnection(alias);
        if (refreshed) {
          return task(this.getClient(alias), connection);
        }
      }

      throw new Error(normalizeNotionError(error));
    }
  }

  async whoAmI(alias: string) {
    return this.runWithClient(alias, async (client, connection) => {
      const bot = await client.users.me({});
      return {
        workspace: connection,
        bot,
      };
    });
  }

  async search(alias: string, input: { query?: string; object: SearchObject; limit: number; startCursor?: string }) {
    return this.runWithClient(alias, async (client, connection) => {
      const filter =
        input.object === "all"
          ? undefined
          : {
              property: "object" as const,
              value: input.object,
            };

      const response: SearchResponse = await client.search({
        query: input.query,
        page_size: input.limit,
        start_cursor: input.startCursor,
        filter,
        sort: {
          timestamp: "last_edited_time",
          direction: "descending",
        },
      });

      const results: SearchResultItem[] = response.results.map((item) => ({
        id: item.id,
        object: item.object,
        url: "url" in item && typeof item.url === "string" ? item.url : undefined,
        title: extractSearchTitle(item),
        lastEditedTime:
          "last_edited_time" in item && typeof item.last_edited_time === "string" ? item.last_edited_time : undefined,
      }));

      return {
        workspace: connection,
        nextCursor: response.next_cursor,
        hasMore: response.has_more,
        results,
      };
    });
  }

  async getPage(alias: string, pageId: string) {
    return this.runWithClient(alias, async (client, connection) => {
      const page = await client.pages.retrieve({ page_id: pageId });
      return {
        workspace: connection,
        title: extractPageTitle(page),
        page,
      };
    });
  }

  async getPageMarkdown(alias: string, pageId: string) {
    return this.runWithClient(alias, async (client, connection) => {
      const response = await client.pages.retrieveMarkdown({ page_id: pageId });
      return {
        workspace: connection,
        pageId,
        markdown: response.markdown,
      };
    });
  }

  async createPage(alias: string, input: { title: string; markdown?: string; parentPageId?: string }) {
    return this.runWithClient(alias, async (client, connection) => {
      const record = this.getRecord(alias);
      const parentPageId = input.parentPageId ?? connection.defaultParentPageId;

      const parent =
        parentPageId
          ? {
              page_id: parentPageId,
            }
          : record.auth_mode === "oauth"
            ? {
                workspace: true as const,
                type: "workspace" as const,
              }
            : null;

      if (!parent) {
        throw new Error(
          `Workspace ${alias} no tiene defaultParentPageId configurado. Para tokens manuales debes definir un parent; con OAuth se permite crear en Private.`,
        );
      }

      const response = await client.pages.create({
        parent,
        properties: {
          title: {
            title: [
              {
                type: "text",
                text: {
                  content: input.title,
                },
              },
            ],
          },
        },
        markdown: input.markdown,
      });

      return {
        workspace: connection,
        page: response,
      };
    });
  }

  async appendMarkdown(alias: string, input: { pageId: string; markdown: string; afterBlockId?: string }) {
    return this.runWithClient(alias, async (client, connection) => {
      const response = await client.pages.updateMarkdown({
        page_id: input.pageId,
        type: "insert_content",
        insert_content: {
          content: input.markdown,
          after: input.afterBlockId,
          position: input.afterBlockId ? undefined : { type: "end" },
        },
      });

      return {
        workspace: connection,
        pageId: input.pageId,
        markdown: response.markdown,
      };
    });
  }

  async replaceMarkdown(alias: string, input: { pageId: string; markdown: string; allowDeletingContent: boolean }) {
    return this.runWithClient(alias, async (client, connection) => {
      const response = await client.pages.updateMarkdown({
        page_id: input.pageId,
        type: "replace_content",
        replace_content: {
          new_str: input.markdown,
          allow_deleting_content: input.allowDeletingContent,
        },
      });

      return {
        workspace: connection,
        pageId: input.pageId,
        markdown: response.markdown,
      };
    });
  }

  async updateTitle(alias: string, input: { pageId: string; title: string }) {
    return this.runWithClient(alias, async (client, connection) => {
      const page = await client.pages.retrieve({ page_id: input.pageId });

      if (!isFullPage(page)) {
        throw new Error("Notion returned a partial page; cannot determine title property.");
      }

      const titlePropertyEntry = Object.entries(page.properties).find(([, property]) => property.type === "title");
      if (!titlePropertyEntry) {
        throw new Error("This page does not expose a title property.");
      }

      const [titlePropertyName] = titlePropertyEntry;
      const response = await client.pages.update({
        page_id: input.pageId,
        properties: {
          [titlePropertyName]: {
            title: [
              {
                type: "text",
                text: {
                  content: input.title,
                },
              },
            ],
          },
        },
      });

      return {
        workspace: connection,
        page: response,
      };
    });
  }

  async movePage(alias: string, input: { pageId: string; parentPageId: string }) {
    return this.runWithClient(alias, async (client, connection) => {
      const response = await client.pages.move({
        page_id: input.pageId,
        parent: {
          page_id: input.parentPageId,
        },
      });

      return {
        workspace: connection,
        page: response,
      };
    });
  }

  async archivePage(alias: string, input: { pageId: string; inTrash: boolean }) {
    return this.runWithClient(alias, async (client, connection) => {
      const response = await client.pages.update({
        page_id: input.pageId,
        in_trash: input.inTrash,
      });

      return {
        workspace: connection,
        page: response,
      };
    });
  }
}
