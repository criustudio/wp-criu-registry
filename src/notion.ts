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
  private readonly summaries: NotionConnectionSummary[];

  constructor(connections: NotionConnectorRecord[]) {
    this.summaries = connections.map((connection) => ({
      connector_id: connection.connector_id,
      alias: connection.config.alias,
      label: connection.label,
      status: connection.status,
      defaultParentPageId: connection.config.defaultParentPageId,
    }));

    for (const connection of connections) {
      this.clients.set(
        connection.config.alias,
        new Client({
          auth: connection.config.token,
          notionVersion: connection.config.notionVersion,
        }),
      );
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

  private getConnection(alias: string): NotionConnectionSummary {
    const connection = this.summaries.find((item) => item.alias === alias);
    if (!connection) {
      throw new Error(`Unknown Notion workspace alias: ${alias}`);
    }
    return connection;
  }

  async whoAmI(alias: string) {
    try {
      const bot = await this.getClient(alias).users.me({});
      return {
        workspace: this.getConnection(alias),
        bot,
      };
    } catch (error) {
      throw new Error(normalizeNotionError(error));
    }
  }

  async search(alias: string, input: { query?: string; object: SearchObject; limit: number; startCursor?: string }) {
    try {
      const filter =
        input.object === "all"
          ? undefined
          : {
              property: "object" as const,
              value: input.object,
            };

      const response: SearchResponse = await this.getClient(alias).search({
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
        workspace: this.getConnection(alias),
        nextCursor: response.next_cursor,
        hasMore: response.has_more,
        results,
      };
    } catch (error) {
      throw new Error(normalizeNotionError(error));
    }
  }

  async getPage(alias: string, pageId: string) {
    try {
      const page = await this.getClient(alias).pages.retrieve({ page_id: pageId });
      return {
        workspace: this.getConnection(alias),
        title: extractPageTitle(page),
        page,
      };
    } catch (error) {
      throw new Error(normalizeNotionError(error));
    }
  }

  async getPageMarkdown(alias: string, pageId: string) {
    try {
      const response = await this.getClient(alias).pages.retrieveMarkdown({ page_id: pageId });
      return {
        workspace: this.getConnection(alias),
        pageId,
        markdown: response.markdown,
      };
    } catch (error) {
      throw new Error(normalizeNotionError(error));
    }
  }

  async createPage(alias: string, input: { title: string; markdown?: string; parentPageId?: string }) {
    try {
      const connection = this.getConnection(alias);
      const parentPageId = input.parentPageId ?? connection.defaultParentPageId;

      if (!parentPageId) {
        throw new Error(`Workspace ${alias} does not have a defaultParentPageId configured and parentPageId was not provided.`);
      }

      const response = await this.getClient(alias).pages.create({
        parent: {
          page_id: parentPageId,
        },
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
    } catch (error) {
      throw new Error(normalizeNotionError(error));
    }
  }

  async appendMarkdown(alias: string, input: { pageId: string; markdown: string; afterBlockId?: string }) {
    try {
      const response = await this.getClient(alias).pages.updateMarkdown({
        page_id: input.pageId,
        type: "insert_content",
        insert_content: {
          content: input.markdown,
          after: input.afterBlockId,
          position: input.afterBlockId ? undefined : { type: "end" },
        },
      });

      return {
        workspace: this.getConnection(alias),
        pageId: input.pageId,
        markdown: response.markdown,
      };
    } catch (error) {
      throw new Error(normalizeNotionError(error));
    }
  }

  async replaceMarkdown(alias: string, input: { pageId: string; markdown: string; allowDeletingContent: boolean }) {
    try {
      const response = await this.getClient(alias).pages.updateMarkdown({
        page_id: input.pageId,
        type: "replace_content",
        replace_content: {
          new_str: input.markdown,
          allow_deleting_content: input.allowDeletingContent,
        },
      });

      return {
        workspace: this.getConnection(alias),
        pageId: input.pageId,
        markdown: response.markdown,
      };
    } catch (error) {
      throw new Error(normalizeNotionError(error));
    }
  }

  async updateTitle(alias: string, input: { pageId: string; title: string }) {
    try {
      const client = this.getClient(alias);
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
        workspace: this.getConnection(alias),
        page: response,
      };
    } catch (error) {
      throw new Error(normalizeNotionError(error));
    }
  }

  async movePage(alias: string, input: { pageId: string; parentPageId: string }) {
    try {
      const response = await this.getClient(alias).pages.move({
        page_id: input.pageId,
        parent: {
          page_id: input.parentPageId,
        },
      });

      return {
        workspace: this.getConnection(alias),
        page: response,
      };
    } catch (error) {
      throw new Error(normalizeNotionError(error));
    }
  }

  async archivePage(alias: string, input: { pageId: string; inTrash: boolean }) {
    try {
      const response = await this.getClient(alias).pages.update({
        page_id: input.pageId,
        in_trash: input.inTrash,
      });

      return {
        workspace: this.getConnection(alias),
        page: response,
      };
    } catch (error) {
      throw new Error(normalizeNotionError(error));
    }
  }
}
