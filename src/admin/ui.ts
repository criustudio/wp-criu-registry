export function renderAdminPage(): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MCP Hub Admin</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f2ed;
        --panel: #fffdf8;
        --line: #d5cfbf;
        --text: #1f1e1a;
        --muted: #6b6558;
        --accent: #0f5c4d;
        --accent-2: #b85c2e;
        --danger: #9d1f1f;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        line-height: 1.45;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(184,92,46,.12), transparent 22rem),
          radial-gradient(circle at bottom right, rgba(15,92,77,.12), transparent 22rem),
          var(--bg);
      }
      header {
        padding: 24px 28px 12px;
      }
      h1, h2, h3 { margin: 0; font-family: "IBM Plex Mono", "Consolas", monospace; }
      h1 { font-size: 24px; }
      h2 { font-size: 18px; margin-bottom: 10px; }
      h3 { font-size: 14px; margin-bottom: 8px; }
      p { margin: 0; }
      .subtle { color: var(--muted); }
      main {
        display: grid;
        grid-template-columns: minmax(260px, .85fr) minmax(320px, 1fr) minmax(360px, 1.1fr) minmax(300px, .95fr);
        gap: 18px;
        padding: 16px 28px 28px;
        align-items: start;
      }
      section, .hero, .login-card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 10px 24px rgba(36, 34, 28, 0.06);
        min-width: 0;
      }
      .hero {
        margin: 0 28px;
        display: grid;
        gap: 10px;
      }
      .hero-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }
      .metric {
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 12px;
        background: rgba(255,255,255,.75);
      }
      .metric strong {
        display: block;
        font-size: 18px;
        margin-top: 4px;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }
      .stack {
        display: grid;
        gap: 10px;
        align-content: start;
      }
      .section-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }
      .form-actions {
        display: flex;
      }
      .form-actions > button {
        width: 100%;
        justify-content: center;
      }
      .panel-scroll {
        max-height: 56vh;
        overflow: auto;
        padding-right: 4px;
      }
      .table-wrap {
        overflow: auto;
      }
      input, textarea, select, button {
        font: inherit;
      }
      input, textarea, select {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: white;
        padding: 10px 12px;
      }
      textarea { min-height: 86px; resize: vertical; }
      button {
        border: 1px solid var(--text);
        border-radius: 999px;
        background: transparent;
        color: var(--text);
        padding: 9px 14px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        align-self: start;
      }
      button.primary {
        background: var(--accent);
        border-color: var(--accent);
        color: white;
      }
      button.warn {
        border-color: var(--accent-2);
        color: var(--accent-2);
      }
      button.danger {
        border-color: var(--danger);
        color: var(--danger);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      th, td {
        text-align: left;
        padding: 10px 8px;
        border-bottom: 1px solid var(--line);
        vertical-align: top;
      }
      th { color: var(--muted); font-weight: 600; }
      code, pre {
        font-family: "IBM Plex Mono", "Consolas", monospace;
        font-size: 12px;
      }
      pre {
        background: #f0ece2;
        padding: 10px;
        border-radius: 12px;
        overflow: auto;
        margin: 0;
        max-height: 12rem;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .pill {
        display: inline-flex;
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 3px 8px;
        font-size: 12px;
        color: var(--muted);
        margin-right: 6px;
        margin-bottom: 6px;
      }
      #login-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .login-card {
        width: min(420px, 100%);
        display: grid;
        gap: 14px;
      }
      .hidden { display: none !important; }
      .message {
        border-radius: 12px;
        padding: 10px 12px;
        background: #f0ece2;
        color: var(--text);
        white-space: pre-wrap;
      }
      #connector-section { grid-column: 1; }
      #notion-section { grid-column: 2; }
      #wordpress-section { grid-column: 3; }
      #catalog-section { grid-column: 4; }
      #usage-section { grid-column: 1; }
      @media (max-width: 1480px) {
        main {
          grid-template-columns: minmax(260px, .9fr) minmax(320px, 1fr) minmax(320px, 1fr);
        }
        #catalog-section {
          grid-column: 1 / -1;
        }
      }
      @media (max-width: 1120px) {
        main {
          grid-template-columns: repeat(2, minmax(280px, 1fr));
        }
        #connector-section,
        #notion-section,
        #wordpress-section,
        #catalog-section,
        #usage-section {
          grid-column: auto;
        }
      }
      @media (max-width: 760px) {
        header {
          padding: 20px 18px 10px;
        }
        .hero {
          margin: 0 18px;
        }
        main {
          grid-template-columns: 1fr;
          padding: 14px 18px 24px;
        }
        .panel-scroll {
          max-height: none;
          padding-right: 0;
        }
      }
    </style>
  </head>
  <body>
    <div id="login-shell" class="hidden">
      <form class="login-card" id="login-form">
        <div class="stack">
          <h1>mcp-hub admin</h1>
          <p class="subtle">Panel técnico para onboarding de Notion, registry/bridge de WordPress y futuros conectores.</p>
        </div>
        <label class="stack">
          <span>ADMIN_API_KEY</span>
          <input id="login-key" type="password" autocomplete="current-password" />
        </label>
        <button class="primary" type="submit">Entrar</button>
        <div id="login-message" class="message hidden"></div>
      </form>
    </div>

    <div id="app-shell" class="hidden">
      <header>
        <div class="row" style="justify-content:space-between">
          <div class="stack">
            <h1>MCP Hub Admin</h1>
            <p class="subtle">Onboarding técnico, compatibilidad MCP y gestión de entidades conectadas.</p>
          </div>
          <div class="row">
            <button id="refresh-all">Refrescar</button>
            <button id="logout-btn" class="warn">Salir</button>
          </div>
        </div>
      </header>

      <div class="hero">
        <div class="row" style="justify-content:space-between; gap:16px;">
          <div class="stack">
            <h2>Resumen operativo</h2>
            <p class="subtle">El hub expone MCP por <code>/mcp</code>, onboarding humano por <code>/admin</code> y registry WordPress compatible por <code>/sites</code> y <code>/register-site</code>.</p>
          </div>
          <button id="sync-wordpress" class="primary">Sync WordPress</button>
        </div>
        <div class="hero-grid" id="metrics"></div>
        <div id="global-message" class="message hidden"></div>
      </div>

      <main>
        <section id="connector-section" class="stack">
          <div class="section-head">
            <h2>Conectores activos</h2>
            <span class="subtle">Estado persistido</span>
          </div>
          <div id="connector-overview" class="stack"></div>
        </section>

        <section id="notion-section" class="stack">
          <h2>Alta Notion</h2>
          <div id="notion-oauth-status" class="message"></div>
          <div class="stack">
            <label class="stack"><span>Alias</span><input id="notion-alias" /></label>
            <label class="stack"><span>Label</span><input id="notion-label" /></label>
            <label class="stack"><span>Default Parent Page ID (opcional)</span><input id="notion-parent" /></label>
            <label class="stack"><span>Notion Version</span><input id="notion-version" placeholder="2025-09-03" /></label>
          </div>
          <div class="form-actions">
            <button id="connect-notion" class="primary">Conectar con Notion</button>
          </div>
          <div class="stack panel-scroll">
            <h3>Workspaces Notion</h3>
            <div id="notion-table" class="table-wrap"></div>
          </div>
        </section>

        <section id="wordpress-section" class="stack">
          <h2>Alta WordPress</h2>
          <div class="stack">
            <label class="stack"><span>site_id</span><input id="wp-site-id" /></label>
            <label class="stack"><span>site_label</span><input id="wp-site-label" /></label>
            <label class="stack"><span>environment</span>
              <select id="wp-environment">
                <option value="production">production</option>
                <option value="staging">staging</option>
                <option value="development">development</option>
              </select>
            </label>
            <label class="stack"><span>base_url</span><input id="wp-base-url" /></label>
            <label class="stack"><span>bridge_url</span><input id="wp-bridge-url" /></label>
            <label class="stack"><span>token</span><input id="wp-token" type="password" /></label>
            <label class="stack"><span>Notas del sitio</span><textarea id="wp-site-notes" placeholder="Una nota por línea"></textarea></label>
            <label class="stack"><span>Group</span><input id="wp-group" /></label>
            <label class="stack"><span>Tags</span><textarea id="wp-tags" placeholder="Un tag por línea"></textarea></label>
            <label class="stack"><span>Notas internas</span><textarea id="wp-metadata-notes" placeholder="Una nota por línea"></textarea></label>
          </div>
          <div class="form-actions">
            <button id="save-wordpress" class="primary">Guardar sitio WordPress</button>
          </div>
          <div class="stack panel-scroll">
            <h3>Sitios WordPress</h3>
            <div id="wordpress-table" class="table-wrap"></div>
          </div>
        </section>

        <section id="catalog-section" class="stack">
          <h2>Catálogo futuro</h2>
          <p class="subtle">Patrón técnico de onboarding para integrar una plataforma nueva más adelante.</p>
          <div id="catalog-grid" class="stack panel-scroll"></div>
        </section>

        <section id="usage-section" class="stack">
          <h2>Uso personal</h2>
          <p class="subtle">Referencia rápida para conectar Codex, registrar WordPress y operar el hub sin depender de notas externas.</p>
          <div id="usage-guide" class="stack"></div>
        </section>
      </main>
    </div>

    <script>
      const state = {
        authenticated: false,
        connectors: [],
        catalog: [],
        notionOAuth: { enabled: false, redirect_uri: "" },
      };

      const loginShell = document.getElementById("login-shell");
      const appShell = document.getElementById("app-shell");
      const loginForm = document.getElementById("login-form");
      const loginKey = document.getElementById("login-key");
      const loginMessage = document.getElementById("login-message");
      const globalMessage = document.getElementById("global-message");

      function showMessage(element, message) {
        if (!message) {
          element.classList.add("hidden");
          element.textContent = "";
          return;
        }
        element.textContent = message;
        element.classList.remove("hidden");
      }

      function splitLines(value) {
        return value
          .split("\\n")
          .map((item) => item.trim())
          .filter(Boolean);
      }

      async function api(path, options = {}) {
        const config = { ...options, headers: { ...(options.headers || {}) } };
        if (config.body && !(config.body instanceof FormData)) {
          config.headers["Content-Type"] = "application/json";
          config.body = JSON.stringify(config.body);
        }
        const response = await fetch(path, config);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const errorMessage = payload.error || payload.message || JSON.stringify(payload);
          throw new Error(errorMessage);
        }
        return payload;
      }

      function connectorCount(kind) {
        return state.connectors.filter((connector) => connector.kind === kind).length;
      }

      function renderMetrics() {
        const wordpress = state.connectors.find((connector) => connector.kind === "wordpress");
        const notionEnabled = state.connectors.filter((connector) => connector.kind === "notion" && connector.status === "enabled").length;
        const wordpressSites = wordpress?.entities?.length || 0;
        const healthWarnings = state.connectors.filter((connector) => connector.last_error).length;
        document.getElementById("metrics").innerHTML = [
          ["Conectores", String(state.connectors.length)],
          ["Notion activos", String(notionEnabled)],
          ["Sitios WordPress", String(wordpressSites)],
          ["Alertas", String(healthWarnings)],
        ].map(([label, value]) => '<div class="metric"><span class="subtle">' + label + '</span><strong>' + value + '</strong></div>').join("");
      }

      function renderConnectorOverview() {
        const container = document.getElementById("connector-overview");
        container.innerHTML = state.connectors.map((connector) => {
          const summary = connector.kind === "wordpress"
            ? 'Sites: ' + (connector.entities?.length || 0)
            : 'Alias: ' + connector.config.alias + (connector.config.workspaceName ? ' · ' + connector.config.workspaceName : '');
          const error = connector.last_error ? '<div class="message">' + connector.last_error + '</div>' : "";
          return '<div class="stack" style="border:1px solid var(--line);border-radius:12px;padding:12px;">'
            + '<div class="row" style="justify-content:space-between"><strong>' + connector.label + '</strong><span class="pill">' + connector.kind + '</span></div>'
            + '<div class="subtle">' + summary + '</div>'
            + '<div class="row"><span class="pill">status: ' + connector.status + '</span><span class="pill">auth: ' + connector.auth_mode + '</span></div>'
            + error
            + '</div>';
        }).join("");
      }

      function renderNotionTable() {
        const notionConnectors = state.connectors.filter((connector) => connector.kind === "notion");
        const html = notionConnectors.length
          ? '<table><thead><tr><th>Alias</th><th>Estado</th><th>Workspace</th><th>Parent</th><th>Último check</th><th>Acciones</th></tr></thead><tbody>'
            + notionConnectors.map((connector) => {
              const lastCheck = connector.last_check_at || "Nunca";
              const parent = connector.config.defaultParentPageId || "-";
              const workspace = connector.config.workspaceName || connector.config.workspaceId || "-";
              return '<tr>'
                + '<td><strong>' + connector.config.alias + '</strong><br><span class="subtle">' + connector.label + '</span></td>'
                + '<td>' + connector.status + '<br><span class="subtle">' + connector.auth_mode + '</span>' + (connector.last_error ? '<br><span class="subtle">' + connector.last_error + '</span>' : '') + '</td>'
                + '<td>' + workspace + '</td>'
                + '<td><code>' + parent + '</code></td>'
                + '<td>' + lastCheck + '</td>'
                + '<td class="actions">'
                + '<button data-action="validate-notion" data-alias="' + connector.config.alias + '">Validar</button>'
                + '<button data-action="toggle-notion" data-alias="' + connector.config.alias + '">' + (connector.status === "enabled" ? "Desactivar" : "Activar") + '</button>'
                + '<button data-action="edit-notion" data-alias="' + connector.config.alias + '">Editar</button>'
                + '<button class="danger" data-action="delete-notion" data-alias="' + connector.config.alias + '">Eliminar</button>'
                + '</td></tr>';
            }).join("")
            + '</tbody></table>'
          : '<p class="subtle">No hay conexiones de Notion todavía.</p>';
        document.getElementById("notion-table").innerHTML = html;
      }

      function renderWordPressTable() {
        const connector = state.connectors.find((candidate) => candidate.kind === "wordpress");
        const sites = connector?.entities || [];
        const html = sites.length
          ? '<table><thead><tr><th>Sitio</th><th>Bridge</th><th>Metadata</th><th>Salud</th><th>Acciones</th></tr></thead><tbody>'
            + sites.map((entity) => {
              const metadata = [
                entity.hidden ? "hidden" : null,
                entity.disabled ? "disabled" : null,
                entity.group ? "group:" + entity.group : null,
              ].filter(Boolean).join(", ") || "-";
              return '<tr>'
                + '<td><strong>' + entity.site.site_id + '</strong><br><span class="subtle">' + entity.site.site_label + ' · ' + entity.site.environment + '</span></td>'
                + '<td><code>' + entity.site.bridge_url + '</code></td>'
                + '<td>' + metadata + '<br><span class="subtle">' + (entity.tags || []).join(", ") + '</span></td>'
                + '<td>' + (entity.last_health || "unknown") + (entity.last_error ? '<br><span class="subtle">' + entity.last_error + '</span>' : '') + '</td>'
                + '<td class="actions">'
                + '<button data-action="sync-site" data-site-id="' + entity.site.site_id + '">Check</button>'
                + '<button data-action="toggle-hidden" data-site-id="' + entity.site.site_id + '">' + (entity.hidden ? "Mostrar" : "Ocultar") + '</button>'
                + '<button data-action="toggle-disabled" data-site-id="' + entity.site.site_id + '">' + (entity.disabled ? "Activar" : "Desactivar") + '</button>'
                + '<button data-action="edit-site" data-site-id="' + entity.site.site_id + '">Editar</button>'
                + '<button class="danger" data-action="delete-site" data-site-id="' + entity.site.site_id + '">Eliminar</button>'
                + '</td></tr>';
            }).join("")
            + '</tbody></table>'
          : '<p class="subtle">No hay sitios WordPress registrados.</p>';
        document.getElementById("wordpress-table").innerHTML = html;
      }

      function renderCatalog() {
        document.getElementById("catalog-grid").innerHTML = state.catalog.map((entry) => (
          '<div style="border:1px solid var(--line);border-radius:12px;padding:12px" class="stack">'
          + '<div class="row" style="justify-content:space-between"><strong>' + entry.label + '</strong><span class="pill">' + entry.status + '</span></div>'
          + '<p class="subtle">' + entry.description + '</p>'
          + '<div class="stack"><h3>Config schema</h3><pre>' + JSON.stringify(entry.config_schema, null, 2) + '</pre></div>'
          + '<div class="stack"><h3>Onboarding</h3><pre>' + JSON.stringify(entry.onboarding_steps, null, 2) + '</pre></div>'
          + '</div>'
        )).join("");
      }

      function renderUsageGuide() {
        const origin = window.location.origin;
        const wordpress = state.connectors.find((candidate) => candidate.kind === "wordpress");
        const notionAliases = state.connectors
          .filter((candidate) => candidate.kind === "notion")
          .map((candidate) => candidate.config.alias);

        document.getElementById("usage-guide").innerHTML = [
          '<div class="stack" style="border:1px solid var(--line);border-radius:12px;padding:12px">'
            + '<h3>Codex remoto</h3>'
            + '<pre>[mcp_servers.criu_hub]\\nurl = "' + origin + '/mcp"\\nbearer_token_env_var = "CRIU_MCP_HUB_TOKEN"</pre>'
            + '<p class="subtle">Define <code>CRIU_MCP_HUB_TOKEN</code> con el mismo valor de <code>MCP_API_KEY</code> en la máquina donde corre Codex.</p>'
          + '</div>',
          '<div class="stack" style="border:1px solid var(--line);border-radius:12px;padding:12px">'
            + '<h3>WordPress bridge</h3>'
            + '<pre>POST ' + origin + '/register-site\\nAuthorization: Bearer WORDPRESS_REGISTRY_TOKEN</pre>'
            + '<p class="subtle">El plugin actual puede seguir auto-registrando sitios. Sitios visibles ahora: ' + ((wordpress?.entities?.length) || 0) + '.</p>'
          + '</div>',
          '<div class="stack" style="border:1px solid var(--line);border-radius:12px;padding:12px">'
            + '<h3>Notion workspaces</h3>'
            + '<pre>' + (notionAliases.length ? notionAliases.join("\\n") : "Todavía no hay aliases dados de alta.") + '</pre>'
            + '<p class="subtle">Cada alias nuevo queda usable por MCP apenas autorizas la app de Notion y validas con <code>whoami</code>. Si dejas parent vacio y la conexion es OAuth, las paginas nuevas se crean en Private.</p>'
          + '</div>',
        ].join("");
      }

      function renderNotionOauthStatus() {
        const container = document.getElementById("notion-oauth-status");
        if (!state.notionOAuth.enabled) {
          container.textContent = "Notion OAuth no esta configurado todavia en el servidor. Debes cargar client_id, client_secret y redirect_uri en EasyPanel.";
          return;
        }

        container.textContent = "Conexion por autorizacion Notion activa. Redirect URI actual: " + (state.notionOAuth.redirect_uri || "(sin redirect_uri)") + ". Si no defines parent, el hub podra crear paginas nuevas en Private.";
      }

      function render() {
        loginShell.classList.toggle("hidden", state.authenticated);
        appShell.classList.toggle("hidden", !state.authenticated);
        if (!state.authenticated) return;
        renderMetrics();
        renderConnectorOverview();
        renderNotionOauthStatus();
        renderNotionTable();
        renderWordPressTable();
        renderCatalog();
        renderUsageGuide();
      }

      async function loadOverview() {
        const payload = await api("/api/admin/connectors");
        state.connectors = payload.connectors;
        state.catalog = payload.catalog;
        state.notionOAuth = payload.notion_oauth || { enabled: false, redirect_uri: "" };
        render();
      }

      function applyOauthResultMessage() {
        const params = new URLSearchParams(window.location.search);
        const status = params.get("notion_oauth");
        if (!status) return;

        if (status === "success") {
          showMessage(globalMessage, "Conexion Notion autorizada para alias: " + (params.get("alias") || "(sin alias)"));
        } else {
          showMessage(globalMessage, params.get("error") || "No se pudo completar la autorizacion de Notion.");
        }

        params.delete("notion_oauth");
        params.delete("alias");
        params.delete("error");
        const next = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (next ? "?" + next : ""));
      }

      async function refreshSession() {
        const payload = await api("/api/admin/session");
        state.authenticated = Boolean(payload.authenticated);
        render();
        if (state.authenticated) {
          await loadOverview();
        }
      }

      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          await api("/api/admin/login", { method: "POST", body: { apiKey: loginKey.value } });
          loginKey.value = "";
          state.authenticated = true;
          showMessage(loginMessage, "");
          render();
          await loadOverview();
        } catch (error) {
          showMessage(loginMessage, error.message);
        }
      });

      document.getElementById("logout-btn").addEventListener("click", async () => {
        await api("/api/admin/logout", { method: "POST" });
        state.authenticated = false;
        state.connectors = [];
        render();
      });

      document.getElementById("refresh-all").addEventListener("click", () => loadOverview().catch((error) => showMessage(globalMessage, error.message)));
      document.getElementById("sync-wordpress").addEventListener("click", async () => {
        try {
          const payload = await api("/api/admin/connectors/wordpress/sync", { method: "POST" });
          showMessage(globalMessage, JSON.stringify(payload, null, 2));
          await loadOverview();
        } catch (error) {
          showMessage(globalMessage, error.message);
        }
      });

      document.getElementById("connect-notion").addEventListener("click", () => {
        const alias = document.getElementById("notion-alias").value;
        const label = document.getElementById("notion-label").value;
        const defaultParentPageId = document.getElementById("notion-parent").value;
        const notionVersion = document.getElementById("notion-version").value;
        const params = new URLSearchParams({ alias });
        if (label) params.set("label", label);
        if (defaultParentPageId) params.set("defaultParentPageId", defaultParentPageId);
        if (notionVersion) params.set("notionVersion", notionVersion);
        window.location.href = "/api/admin/connectors/notion/oauth/start?" + params.toString();
      });

      document.getElementById("save-wordpress").addEventListener("click", async () => {
        try {
          await api("/api/admin/connectors/wordpress/sites", {
            method: "POST",
            body: {
              site_id: document.getElementById("wp-site-id").value,
              site_label: document.getElementById("wp-site-label").value,
              environment: document.getElementById("wp-environment").value,
              base_url: document.getElementById("wp-base-url").value,
              bridge_url: document.getElementById("wp-bridge-url").value,
              token: document.getElementById("wp-token").value,
              site_notes: splitLines(document.getElementById("wp-site-notes").value),
              group: document.getElementById("wp-group").value || undefined,
              tags: splitLines(document.getElementById("wp-tags").value),
              metadata_notes: splitLines(document.getElementById("wp-metadata-notes").value),
            },
          });
          await loadOverview();
        } catch (error) {
          showMessage(globalMessage, error.message);
        }
      });

      document.body.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.dataset.action;
        if (!action) return;

        try {
          if (action === "validate-notion") {
            await api("/api/admin/connectors/notion/" + target.dataset.alias + "/validate", { method: "POST" });
          }

          if (action === "toggle-notion") {
            const connector = state.connectors.find((item) => item.kind === "notion" && item.config.alias === target.dataset.alias);
            await api("/api/admin/connectors/notion/" + target.dataset.alias, {
              method: "PATCH",
              body: { status: connector.status === "enabled" ? "disabled" : "enabled" },
            });
          }

          if (action === "edit-notion") {
            const connector = state.connectors.find((item) => item.kind === "notion" && item.config.alias === target.dataset.alias);
            const raw = window.prompt("Patch Notion JSON", JSON.stringify({
              label: connector.label,
              defaultParentPageId: connector.config.defaultParentPageId || null,
              notionVersion: connector.config.notionVersion || null,
              status: connector.status,
            }, null, 2));
            if (raw) {
              await api("/api/admin/connectors/notion/" + target.dataset.alias, { method: "PATCH", body: JSON.parse(raw) });
            }
          }

          if (action === "delete-notion") {
            if (window.confirm("Eliminar esta conexión de Notion?")) {
              await api("/api/admin/connectors/notion/" + target.dataset.alias, { method: "DELETE" });
            }
          }

          if (action === "sync-site") {
            await api("/api/admin/connectors/wordpress/sync", { method: "POST", body: { site_id: target.dataset.siteId } });
          }

          if (action === "toggle-hidden" || action === "toggle-disabled") {
            const connector = state.connectors.find((item) => item.kind === "wordpress");
            const entity = connector.entities.find((item) => item.site.site_id === target.dataset.siteId);
            await api("/api/admin/connectors/wordpress/sites/" + target.dataset.siteId, {
              method: "PATCH",
              body: action === "toggle-hidden" ? { hidden: !entity.hidden } : { disabled: !entity.disabled },
            });
          }

          if (action === "edit-site") {
            const connector = state.connectors.find((item) => item.kind === "wordpress");
            const entity = connector.entities.find((item) => item.site.site_id === target.dataset.siteId);
            const raw = window.prompt("Patch WordPress site JSON", JSON.stringify({
              site_label: entity.site.site_label,
              environment: entity.site.environment,
              base_url: entity.site.base_url,
              bridge_url: entity.site.bridge_url,
              token: entity.site.token,
              site_notes: entity.site.notes,
              hidden: entity.hidden,
              disabled: entity.disabled,
              tags: entity.tags,
              group: entity.group || null,
              metadata_notes: entity.notes,
            }, null, 2));
            if (raw) {
              await api("/api/admin/connectors/wordpress/sites/" + target.dataset.siteId, { method: "PATCH", body: JSON.parse(raw) });
            }
          }

          if (action === "delete-site") {
            if (window.confirm("Eliminar este sitio WordPress del registry?")) {
              await api("/api/admin/connectors/wordpress/sites/" + target.dataset.siteId, { method: "DELETE" });
            }
          }

          await loadOverview();
        } catch (error) {
          showMessage(globalMessage, error.message);
        }
      });

      refreshSession().catch((error) => {
        showMessage(loginMessage, error.message);
        loginShell.classList.remove("hidden");
      });
      applyOauthResultMessage();
    </script>
  </body>
</html>`;
}
