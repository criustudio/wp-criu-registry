import type { CPanelAccountEntity } from "./lib/types.js";
import type { StateStore } from "./lib/state.js";

type ApiMethod = "GET" | "POST";

function toApiError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const candidate = payload as { errors?: unknown; error?: unknown; result?: { errors?: unknown } };
    const value = candidate.errors ?? candidate.error ?? candidate.result?.errors;
    if (Array.isArray(value) && value.length > 0) {
      return value.map((item) => String(item)).join("; ");
    }
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export class CPanelHub {
  constructor(private readonly store: StateStore) {}

  listAdminAccounts(): CPanelAccountEntity[] {
    return this.store.listCPanelAccounts({ includeHidden: true, includeDisabled: true });
  }

  getConnector() {
    return this.store.getCPanelConnector();
  }

  listOperationalAccounts(): CPanelAccountEntity[] {
    return this.store.listCPanelAccounts();
  }

  registerAccount(rawAccount: unknown, metadata?: Parameters<StateStore["registerCPanelAccount"]>[1]): CPanelAccountEntity {
    return this.store.registerCPanelAccount(rawAccount, metadata);
  }

  patchAccount(accountId: string, patch: Parameters<StateStore["patchCPanelAccount"]>[1]): CPanelAccountEntity {
    return this.store.patchCPanelAccount(accountId, patch);
  }

  deleteAccount(accountId: string): void {
    this.store.deleteCPanelAccount(accountId);
  }

  private getAccount(accountId: string, includeSecrets = true): CPanelAccountEntity {
    const account = this.store
      .listCPanelAccounts({ includeHidden: true, includeDisabled: true, includeSecrets })
      .find((candidate) => candidate.entity_id.toLowerCase() === accountId.toLowerCase());
    if (!account) {
      throw new Error(`cPanel account not found: ${accountId}`);
    }
    if (!account.account.token || account.account.token === "[configured]") {
      throw new Error(`cPanel account has no usable API token: ${accountId}`);
    }
    if (account.disabled || account.status === "disabled") {
      throw new Error(`cPanel account is disabled: ${accountId}`);
    }
    return account;
  }

  private async request(
    account: CPanelAccountEntity,
    operation: { module: string; functionName: string; params?: Record<string, string | number | boolean | undefined> },
    method: ApiMethod = "GET",
  ): Promise<unknown> {
    const { account: config } = account;
    const isWhm = config.auth_mode === "whm_token";
    const base = `https://${config.host}:${config.port}`;
    const url = new URL(
      isWhm ? `/json-api/${operation.functionName}` : `/execute/${operation.module}/${operation.functionName}`,
      base,
    );
    const params = Object.entries({ ...(isWhm ? { "api.version": 1 } : {}), ...(operation.params ?? {}) }).filter(
      ([, value]) => value !== undefined,
    );
    const headers = {
      Authorization: `${isWhm ? "whm" : "cpanel"} ${config.username}:${config.token}`,
      Accept: "application/json",
    };

    const requestInit: RequestInit = { method, headers };
    if (method === "GET") {
      for (const [key, value] of params) {
        url.searchParams.set(key, String(value));
      }
    } else {
      requestInit.headers = { ...headers, "Content-Type": "application/x-www-form-urlencoded" };
      requestInit.body = new URLSearchParams(params.map(([key, value]) => [key, String(value)])).toString();
    }

    const response = await fetch(url, requestInit);
    const text = await response.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`cPanel API returned non-JSON (${response.status}).`);
    }

    const root = asRecord(payload);
    const result = asRecord(root.result);
    const success = isWhm ? root.metadata && asRecord(root.metadata).result === 1 || root.result === 1 : result.status === 1;
    if (!response.ok || !success) {
      throw new Error(toApiError(payload, `cPanel API request failed (${response.status}).`));
    }

    return payload;
  }

  async validateAccount(accountId: string): Promise<unknown> {
    const account = this.getAccount(accountId);
    const payload = account.account.auth_mode === "whm_token"
      ? await this.request(account, { module: "", functionName: "listaccts", params: { search: account.account.domain } })
      : await this.request(account, { module: "Email", functionName: "list_pops", params: { domain: account.account.domain } });
    this.store.setCPanelAccountHealth(accountId, { ok: true });
    return payload;
  }

  async listMailboxes(accountId: string): Promise<unknown> {
    const account = this.getAccount(accountId);
    if (account.account.auth_mode !== "cpanel_token") {
      throw new Error("listMailboxes requires a cPanel account token; WHM discovery is exposed separately.");
    }
    return this.request(account, { module: "Email", functionName: "list_pops", params: { domain: account.account.domain } });
  }

  async createMailbox(accountId: string, email: string, password: string, quota = 1024): Promise<unknown> {
    const account = this.getAccount(accountId);
    if (account.account.auth_mode !== "cpanel_token") {
      throw new Error("createMailbox requires a cPanel account token, not a WHM token.");
    }
    const [localPart, emailDomain] = email.trim().toLowerCase().split("@");
    if (!localPart || !emailDomain) {
      throw new Error("email must be a complete address.");
    }
    const domain = account.account.domain || emailDomain;
    if (emailDomain !== domain.toLowerCase()) {
      throw new Error(`email domain must match the registered account domain: ${domain}`);
    }
    if (password.length < 12) {
      throw new Error("mailbox password must contain at least 12 characters.");
    }

    return this.request(account, {
      module: "Email",
      functionName: "add_pop",
      params: {
        email: localPart,
        domain,
        password,
        quota,
        send_welcome_email: 0,
      },
    }, "POST");
  }

  async deleteMailbox(accountId: string, email: string): Promise<unknown> {
    const account = this.getAccount(accountId);
    if (account.account.auth_mode !== "cpanel_token") {
      throw new Error("deleteMailbox requires a cPanel account token, not a WHM token.");
    }
    const [localPart, emailDomain] = email.trim().toLowerCase().split("@");
    const domain = account.account.domain || emailDomain;
    if (!localPart || !emailDomain || emailDomain !== domain.toLowerCase()) {
      throw new Error(`email domain must match the registered account domain: ${domain}`);
    }

    return this.request(account, {
      module: "Email",
      functionName: "delete_pop",
      params: { email: localPart, domain },
    }, "POST");
  }

  async listWhmAccounts(accountId: string): Promise<unknown> {
    const account = this.getAccount(accountId);
    if (account.account.auth_mode !== "whm_token") {
      throw new Error("listWhmAccounts requires a WHM token.");
    }
    return this.request(account, { module: "", functionName: "listaccts" });
  }
}
