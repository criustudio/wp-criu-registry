export function renderAdminPage(): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MCP Hub Admin</title>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap");

      :root {
        color-scheme: light;
        --bg: #efe9df;
        --panel: rgba(255, 251, 245, 0.96);
        --panel-strong: #fffdf9;
        --line: #ddd3c3;
        --line-strong: #c7b9a2;
        --text: #1b1915;
        --muted: #6f685b;
        --accent: #0f6a58;
        --accent-strong: #0a4f42;
        --accent-soft: rgba(15, 106, 88, 0.12);
        --warm: #b8683d;
        --warm-soft: rgba(184, 104, 61, 0.12);
        --danger: #a93e33;
        --danger-soft: rgba(169, 62, 51, 0.1);
        --shadow: 0 24px 70px rgba(49, 41, 28, 0.09);
        --shell: min(1480px, calc(100vw - 40px));
        --radius-xl: 26px;
        --radius-lg: 18px;
        --radius-md: 14px;
        --radius-sm: 10px;
      }

      * { box-sizing: border-box; }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        font-family: "Manrope", "Segoe UI", sans-serif;
        line-height: 1.5;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(184, 104, 61, 0.16), transparent 22rem),
          radial-gradient(circle at bottom right, rgba(15, 106, 88, 0.16), transparent 22rem),
          linear-gradient(180deg, #f7f2e9 0%, #efe9df 100%);
      }

      h1, h2, h3, h4 {
        margin: 0;
        font-family: "IBM Plex Mono", "Consolas", monospace;
      }

      h1 { font-size: 26px; }
      h2 { font-size: 18px; }
      h3 { font-size: 14px; }
      p { margin: 0; }
      input, textarea, select, button { font: inherit; }

      button {
        border: 1px solid var(--line-strong);
        background: transparent;
        color: var(--text);
        border-radius: 999px;
        padding: 10px 16px;
        min-height: 44px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: transform .18s ease, background-color .18s ease, border-color .18s ease, color .18s ease, box-shadow .18s ease;
      }

      button:hover,
      button:focus-visible {
        transform: translateY(-1px);
        border-color: var(--text);
        outline: none;
      }

      button.primary {
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        border-color: var(--accent);
        color: #fff;
        box-shadow: 0 16px 26px rgba(15, 106, 88, 0.18);
      }

      button.warn {
        color: var(--warm);
        border-color: rgba(184, 104, 61, 0.45);
        background: rgba(255, 250, 245, 0.8);
      }

      button.soft {
        background: var(--panel-strong);
      }

      button.danger {
        color: var(--danger);
        border-color: rgba(169, 62, 51, 0.35);
      }

      input,
      textarea,
      select {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.88);
        padding: 12px 14px;
        color: var(--text);
      }

      input:focus,
      textarea:focus,
      select:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 4px rgba(15, 106, 88, 0.08);
      }

      textarea {
        min-height: 102px;
        resize: vertical;
      }

      code,
      pre {
        font-family: "IBM Plex Mono", "Consolas", monospace;
        font-size: 12px;
      }

      pre {
        margin: 0;
        padding: 12px;
        max-height: 14rem;
        overflow: auto;
        border: 1px solid rgba(221, 211, 195, 0.8);
        border-radius: 14px;
        background: #f4eee2;
      }

      .subtle { color: var(--muted); }
      .hidden { display: none !important; }
      .mono { font-family: "IBM Plex Mono", "Consolas", monospace; }

      .shell {
        width: var(--shell);
        margin: 0 auto;
      }

      header {
        padding: 28px 0 14px;
      }

      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
      }

      .stack {
        display: grid;
        gap: 12px;
        min-width: 0;
      }

      .surface,
      .hero,
      .login-card,
      .drawer-shell {
        background: var(--panel);
        border: 1px solid rgba(221, 211, 195, 0.9);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow);
        backdrop-filter: blur(14px);
      }

      .hero,
      .surface {
        padding: 18px;
      }

      .hero {
        display: grid;
        gap: 14px;
      }

      .hero-top {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 16px;
        align-items: start;
      }

      .hero-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }

      .metric {
        padding: 14px;
        border: 1px solid rgba(221, 211, 195, 0.95);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.72);
      }

      .metric strong {
        display: block;
        margin-top: 8px;
        font-size: 28px;
        font-weight: 700;
      }

      main {
        padding: 18px 0 28px;
      }

      .tab-shell {
        display: grid;
        gap: 18px;
      }

      .tab-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        padding: 10px;
        position: sticky;
        top: 14px;
        z-index: 3;
      }

      .tab-button {
        border-color: transparent;
        color: var(--muted);
      }

      .tab-button.active {
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        border-color: var(--accent);
        color: #fff;
        box-shadow: 0 16px 24px rgba(15, 106, 88, 0.18);
      }

      .tab-panel {
        display: none;
      }

      .tab-panel.active {
        display: grid;
        gap: 18px;
      }

      .section-head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 12px 18px;
        align-items: start;
      }

      .section-copy {
        display: grid;
        gap: 6px;
      }

      .surface-header {
        display: grid;
        gap: 16px;
      }

      .message {
        border-radius: 16px;
        padding: 12px 14px;
        border: 1px solid rgba(221, 211, 195, 0.95);
        background: #f3eee5;
        color: var(--text);
        white-space: pre-wrap;
      }

      .message.info {
        background: rgba(15, 106, 88, 0.08);
        border-color: rgba(15, 106, 88, 0.18);
      }

      .message.warn {
        background: rgba(184, 104, 61, 0.08);
        border-color: rgba(184, 104, 61, 0.2);
      }

      .message.danger {
        background: rgba(169, 62, 51, 0.08);
        border-color: rgba(169, 62, 51, 0.22);
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .registry-shell {
        display: grid;
        gap: 14px;
      }

      .registry-head {
        display: grid;
        gap: 12px;
        padding: 0 6px;
        color: var(--muted);
        font-size: 12px;
        letter-spacing: .02em;
        text-transform: uppercase;
      }

      .registry-head.notion {
        grid-template-columns: 1.2fr 1fr 1fr 1fr;
      }

      .registry-head.wordpress {
        grid-template-columns: 1.2fr 1.35fr 1fr .9fr;
      }

      .registry-list {
        display: grid;
        gap: 14px;
      }

      .registry-row {
        border: 1px solid rgba(221, 211, 195, 0.95);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.72);
        overflow: hidden;
      }

      .registry-grid {
        display: grid;
        gap: 12px;
        padding: 16px;
      }

      .registry-grid.notion {
        grid-template-columns: 1.2fr 1fr 1fr 1fr;
      }

      .registry-grid.wordpress {
        grid-template-columns: 1.2fr 1.35fr 1fr .9fr;
      }

      .cell {
        min-width: 0;
        display: grid;
        gap: 6px;
        align-content: start;
      }

      .cell strong {
        font-size: 15px;
      }

      .cell .caption {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: .02em;
      }

      .row-footer {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        padding: 14px 16px 16px;
        border-top: 1px solid rgba(221, 211, 195, 0.8);
        background: linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.84));
      }

      .row-footer button {
        min-width: 0;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border: 1px solid rgba(221, 211, 195, 0.95);
        border-radius: 999px;
        font-size: 12px;
        color: var(--muted);
        background: rgba(255,255,255,0.68);
      }

      .pill.ok {
        color: var(--accent-strong);
        border-color: rgba(15, 106, 88, 0.22);
        background: rgba(15, 106, 88, 0.08);
      }

      .pill.off {
        color: var(--warm);
        border-color: rgba(184, 104, 61, 0.25);
        background: rgba(184, 104, 61, 0.08);
      }

      .pill.error {
        color: var(--danger);
        border-color: rgba(169, 62, 51, 0.25);
        background: rgba(169, 62, 51, 0.08);
      }

      .empty-state {
        padding: 28px;
        border: 1px dashed var(--line-strong);
        border-radius: 20px;
        text-align: center;
        color: var(--muted);
        background: rgba(255,255,255,0.54);
      }

      .layout-other {
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(260px, .78fr) minmax(360px, 1fr) minmax(280px, .9fr);
      }

      .catalog-grid,
      .connector-grid,
      .usage-grid {
        display: grid;
        gap: 12px;
      }

      .mini-card {
        display: grid;
        gap: 10px;
        padding: 14px;
        border: 1px solid rgba(221, 211, 195, 0.95);
        border-radius: 18px;
        background: rgba(255,255,255,0.7);
      }

      .scroll-area {
        max-height: clamp(24rem, 58vh, 44rem);
        overflow: auto;
        padding-right: 4px;
      }

      .drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(24, 20, 14, 0.26);
        backdrop-filter: blur(6px);
        z-index: 20;
      }

      .drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(520px, 100vw);
        padding: 18px;
        z-index: 21;
      }

      .drawer-shell {
        height: 100%;
        display: grid;
        grid-template-rows: auto auto 1fr auto;
        gap: 16px;
        padding: 20px;
        transform: translateX(0);
      }

      .drawer-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: start;
      }

      .drawer-copy {
        display: grid;
        gap: 6px;
      }

      .drawer-form {
        display: grid;
        gap: 16px;
        min-height: 0;
      }

      .drawer-body {
        min-height: 0;
        overflow: auto;
        padding-right: 4px;
        display: grid;
        gap: 14px;
        align-content: start;
      }

      .form-grid {
        display: grid;
        gap: 14px;
      }

      .field {
        display: grid;
        gap: 8px;
      }

      .field span {
        font-size: 13px;
        color: var(--muted);
      }

      .drawer-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 10px;
      }

      .drawer-note {
        padding: 12px 14px;
        border-radius: 16px;
        background: rgba(15, 106, 88, 0.08);
        border: 1px solid rgba(15, 106, 88, 0.14);
      }

      .split-row {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      #login-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .login-card {
        width: min(440px, 100%);
        display: grid;
        gap: 14px;
        padding: 22px;
      }

      @media (max-width: 1180px) {
        .layout-other {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 980px) {
        .tab-nav {
          position: static;
        }

        .registry-head {
          display: none;
        }

        .registry-grid.notion,
        .registry-grid.wordpress,
        .layout-other,
        .split-row {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 760px) {
        :root {
          --shell: min(100vw - 20px, 100%);
        }

        header {
          padding-top: 22px;
        }

        .hero,
        .surface,
        .login-card,
        .drawer-shell {
          border-radius: 20px;
        }

        .hero,
        .surface {
          padding: 16px;
        }

        .tab-button {
          flex: 1 1 calc(50% - 10px);
        }

        .drawer {
          width: 100vw;
          padding: 10px;
        }

        .drawer-shell {
          padding: 18px;
        }

        .row-footer button,
        .toolbar button {
          flex: 1 1 calc(50% - 10px);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        * {
          scroll-behavior: auto;
          transition: none !important;
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
        <label class="field">
          <span>ADMIN_API_KEY</span>
          <input id="login-key" type="password" autocomplete="current-password" />
        </label>
        <button class="primary" type="submit">Entrar</button>
        <div id="login-message" class="message hidden"></div>
      </form>
    </div>

    <div id="app-shell" class="hidden">
      <header class="shell">
        <div class="row" style="justify-content:space-between; align-items:start;">
          <div class="stack">
            <h1>MCP Hub Admin</h1>
            <p class="subtle">Onboarding técnico, compatibilidad MCP y gestión de entidades conectadas.</p>
          </div>
          <div class="toolbar">
            <button id="refresh-all" class="soft">Refrescar</button>
            <button id="logout-btn" class="warn">Salir</button>
          </div>
        </div>
      </header>

      <div class="shell hero">
        <div class="hero-top">
          <div class="stack">
            <h2>Resumen operativo</h2>
            <p class="subtle">El hub expone MCP por <code>/mcp</code>, onboarding humano por <code>/admin</code> y registry WordPress compatible por <code>/sites</code> y <code>/register-site</code>.</p>
          </div>
          <div class="toolbar">
            <button id="sync-wordpress" class="primary">Sync WordPress</button>
          </div>
        </div>
        <div class="hero-grid" id="metrics"></div>
        <div id="global-message" class="message hidden"></div>
      </div>

      <main class="shell">
        <div class="tab-shell">
          <nav class="surface tab-nav" aria-label="Areas del panel">
            <button class="tab-button active" data-tab="notion" aria-selected="true">Notion</button>
            <button class="tab-button" data-tab="wordpress" aria-selected="false">WordPress</button>
            <button class="tab-button" data-tab="other" aria-selected="false">Otros</button>
          </nav>

          <div class="tab-panel active" data-panel="notion">
            <section class="surface registry-shell">
              <div class="surface-header">
                <div class="section-head">
                  <div class="section-copy">
                    <h2>Conexiones Notion</h2>
                    <p class="subtle">Crea y administra perfiles OAuth desde un drawer lateral y deja el resto del panel para la tabla operativa.</p>
                  </div>
                  <div class="toolbar">
                    <button id="open-notion-create" class="primary">Nueva conexión Notion</button>
                  </div>
                </div>
                <div id="notion-oauth-status" class="message info"></div>
              </div>
              <div id="notion-table" class="scroll-area"></div>
            </section>
          </div>

          <div class="tab-panel" data-panel="wordpress">
            <section class="surface registry-shell">
              <div class="surface-header">
                <div class="section-head">
                  <div class="section-copy">
                    <h2>Sitios WordPress</h2>
                    <p class="subtle">Usa el drawer lateral para crear o editar sitios y mantén la tabla ancha para operación, checks y metadata.</p>
                  </div>
                  <div class="toolbar">
                    <button id="open-wordpress-create" class="primary">Nuevo sitio WordPress</button>
                  </div>
                </div>
                <div class="message warn">El bridge actual sigue funcionando igual. Esta vista solo organiza mejor la gestión operativa y las acciones.</div>
              </div>
              <div id="wordpress-table" class="scroll-area"></div>
            </section>
          </div>

          <div class="tab-panel" data-panel="other">
            <div class="layout-other">
              <section class="surface stack">
                <div class="section-head">
                  <h2>Conectores activos</h2>
                  <span class="subtle">Estado persistido</span>
                </div>
                <div id="connector-overview" class="connector-grid"></div>
              </section>

              <section class="surface stack">
                <div class="section-copy">
                  <h2>Catálogo futuro</h2>
                  <p class="subtle">Patrón técnico para sumar plataformas nuevas sin rehacer la arquitectura base del hub.</p>
                </div>
                <div id="catalog-grid" class="catalog-grid scroll-area"></div>
              </section>

              <section class="surface stack">
                <div class="section-copy">
                  <h2>Uso personal</h2>
                  <p class="subtle">Referencia rápida para conectar Codex, registrar WordPress y operar el hub sin depender de notas externas.</p>
                </div>
                <div id="usage-guide" class="usage-grid"></div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>

    <div id="drawer-backdrop" class="drawer-backdrop hidden"></div>
    <aside id="drawer" class="drawer hidden" aria-hidden="true">
      <div class="drawer-shell">
        <div class="drawer-head">
          <div class="drawer-copy">
            <h2 id="drawer-title">Nueva instancia</h2>
            <p id="drawer-subtitle" class="subtle">Completa la configuración y guarda los cambios desde este panel lateral.</p>
          </div>
          <button id="drawer-close" class="soft" type="button">Cerrar</button>
        </div>

        <div id="drawer-message" class="message hidden"></div>

        <form id="drawer-form" class="drawer-form">
          <div class="drawer-body">
            <div id="drawer-notion-fields" class="stack hidden">
              <div class="drawer-note">
                La creación de nuevas conexiones de Notion se hace por autorización OAuth. Guardas alias y metadata aquí, y luego el hub abre el flujo de autorización de Notion.
              </div>
              <div class="field">
                <span>Alias</span>
                <input id="notion-alias" />
              </div>
              <div class="field">
                <span>Label</span>
                <input id="notion-label" />
              </div>
              <div class="field">
                <span>Default Parent Page ID (opcional)</span>
                <input id="notion-parent" />
              </div>
              <div class="field">
                <span>Notion Version</span>
                <input id="notion-version" placeholder="2025-09-03" />
              </div>
              <div id="notion-edit-fields" class="split-row hidden">
                <label class="field">
                  <span>Estado</span>
                  <select id="notion-status">
                    <option value="enabled">enabled</option>
                    <option value="disabled">disabled</option>
                  </select>
                </label>
                <label class="field">
                  <span>Workspace actual</span>
                  <input id="notion-workspace" disabled />
                </label>
              </div>
            </div>

            <div id="drawer-wordpress-fields" class="stack hidden">
              <div class="split-row">
                <label class="field">
                  <span>site_id</span>
                  <input id="wp-site-id" />
                </label>
                <label class="field">
                  <span>site_label</span>
                  <input id="wp-site-label" />
                </label>
              </div>
              <div class="split-row">
                <label class="field">
                  <span>environment</span>
                  <select id="wp-environment">
                    <option value="production">production</option>
                    <option value="staging">staging</option>
                    <option value="development">development</option>
                  </select>
                </label>
                <label class="field">
                  <span>Group</span>
                  <input id="wp-group" />
                </label>
              </div>
              <div class="field">
                <span>base_url</span>
                <input id="wp-base-url" />
              </div>
              <div class="field">
                <span>bridge_url</span>
                <input id="wp-bridge-url" />
              </div>
              <div class="field">
                <span>token</span>
                <input id="wp-token" type="password" />
              </div>
              <div class="field">
                <span>Notas del sitio</span>
                <textarea id="wp-site-notes" placeholder="Una nota por línea"></textarea>
              </div>
              <div class="field">
                <span>Tags</span>
                <textarea id="wp-tags" placeholder="Un tag por línea"></textarea>
              </div>
              <div class="field">
                <span>Notas internas</span>
                <textarea id="wp-metadata-notes" placeholder="Una nota por línea"></textarea>
              </div>
            </div>
          </div>

          <div class="drawer-actions">
            <button id="drawer-cancel" class="soft" type="button">Cancelar</button>
            <button id="drawer-submit" class="primary" type="submit">Guardar</button>
          </div>
        </form>
      </div>
    </aside>

    <script>
      const state = {
        authenticated: false,
        connectors: [],
        catalog: [],
        notionOAuth: { enabled: false, redirect_uri: "" },
        activeTab: "notion",
        drawer: {
          kind: null,
          mode: "create",
          key: null,
        },
      };

      const loginShell = document.getElementById("login-shell");
      const appShell = document.getElementById("app-shell");
      const loginForm = document.getElementById("login-form");
      const loginKey = document.getElementById("login-key");
      const loginMessage = document.getElementById("login-message");
      const globalMessage = document.getElementById("global-message");
      const drawer = document.getElementById("drawer");
      const drawerBackdrop = document.getElementById("drawer-backdrop");
      const drawerForm = document.getElementById("drawer-form");
      const drawerMessage = document.getElementById("drawer-message");
      const drawerTitle = document.getElementById("drawer-title");
      const drawerSubtitle = document.getElementById("drawer-subtitle");
      const drawerSubmit = document.getElementById("drawer-submit");
      const notionFields = document.getElementById("drawer-notion-fields");
      const notionEditFields = document.getElementById("notion-edit-fields");
      const wordpressFields = document.getElementById("drawer-wordpress-fields");

      function showMessage(element, message, tone) {
        if (!message) {
          element.classList.add("hidden");
          element.classList.remove("info", "warn", "danger");
          element.textContent = "";
          return;
        }

        element.textContent = message;
        element.classList.remove("hidden");
        element.classList.remove("info", "warn", "danger");
        if (tone) {
          element.classList.add(tone);
        }
      }

      function splitLines(value) {
        return value
          .split("\\n")
          .map((item) => item.trim())
          .filter(Boolean);
      }

      function joinLines(value) {
        return Array.isArray(value) ? value.join("\\n") : "";
      }

      function escapeHtml(value) {
        return String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function statusPill(value) {
        const tone = value === "enabled" || value === "ok"
          ? "ok"
          : value === "disabled" || value === "unknown"
            ? "off"
            : value === "error"
              ? "error"
              : "";
        return '<span class="pill ' + tone + '">' + escapeHtml(value) + "</span>";
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

      function getWordPressConnector() {
        return state.connectors.find((connector) => connector.kind === "wordpress");
      }

      function getNotionConnector(alias) {
        return state.connectors.find((connector) => connector.kind === "notion" && connector.config.alias === alias);
      }

      function getWordPressEntity(siteId) {
        const connector = getWordPressConnector();
        return connector?.entities?.find((entity) => entity.site.site_id === siteId);
      }

      function resetDrawerForms() {
        document.getElementById("notion-alias").value = "";
        document.getElementById("notion-label").value = "";
        document.getElementById("notion-parent").value = "";
        document.getElementById("notion-version").value = "";
        document.getElementById("notion-status").value = "enabled";
        document.getElementById("notion-workspace").value = "";
        document.getElementById("wp-site-id").value = "";
        document.getElementById("wp-site-label").value = "";
        document.getElementById("wp-environment").value = "production";
        document.getElementById("wp-base-url").value = "";
        document.getElementById("wp-bridge-url").value = "";
        document.getElementById("wp-token").value = "";
        document.getElementById("wp-site-notes").value = "";
        document.getElementById("wp-group").value = "";
        document.getElementById("wp-tags").value = "";
        document.getElementById("wp-metadata-notes").value = "";
        document.getElementById("notion-alias").disabled = false;
      }

      function closeDrawer() {
        state.drawer = { kind: null, mode: "create", key: null };
        drawer.classList.add("hidden");
        drawerBackdrop.classList.add("hidden");
        drawer.setAttribute("aria-hidden", "true");
        showMessage(drawerMessage, "");
        resetDrawerForms();
      }

      function openDrawer(kind, mode, key) {
        state.drawer = { kind, mode, key: key || null };
        resetDrawerForms();
        showMessage(drawerMessage, "");

        notionFields.classList.toggle("hidden", kind !== "notion");
        wordpressFields.classList.toggle("hidden", kind !== "wordpress");
        notionEditFields.classList.toggle("hidden", !(kind === "notion" && mode === "edit"));

        if (kind === "notion") {
          drawerTitle.textContent = mode === "create" ? "Nueva conexión Notion" : "Editar conexión Notion";
          drawerSubtitle.textContent = mode === "create"
            ? "Define alias y metadata. Al guardar, el hub abrirá el flujo OAuth de Notion."
            : "Ajusta metadata, parent por defecto o el estado del alias sin salir del panel.";
          drawerSubmit.textContent = mode === "create" ? "Conectar con Notion" : "Guardar cambios";

          if (mode === "edit") {
            const connector = getNotionConnector(key);
            document.getElementById("notion-alias").value = connector?.config?.alias || "";
            document.getElementById("notion-label").value = connector?.label || "";
            document.getElementById("notion-parent").value = connector?.config?.defaultParentPageId || "";
            document.getElementById("notion-version").value = connector?.config?.notionVersion || "";
            document.getElementById("notion-status").value = connector?.status || "enabled";
            document.getElementById("notion-workspace").value = connector?.config?.workspaceName || connector?.config?.workspaceId || "";
            document.getElementById("notion-alias").disabled = true;
          }
        }

        if (kind === "wordpress") {
          drawerTitle.textContent = mode === "create" ? "Nuevo sitio WordPress" : "Editar sitio WordPress";
          drawerSubtitle.textContent = mode === "create"
            ? "Registra un sitio nuevo desde el panel lateral sin romper el flujo del bridge actual."
            : "Actualiza bridge, metadata y visibilidad del sitio desde un formulario más cómodo.";
          drawerSubmit.textContent = mode === "create" ? "Guardar sitio" : "Actualizar sitio";

          if (mode === "edit") {
            const entity = getWordPressEntity(key);
            document.getElementById("wp-site-id").value = entity?.site?.site_id || "";
            document.getElementById("wp-site-label").value = entity?.site?.site_label || "";
            document.getElementById("wp-environment").value = entity?.site?.environment || "production";
            document.getElementById("wp-base-url").value = entity?.site?.base_url || "";
            document.getElementById("wp-bridge-url").value = entity?.site?.bridge_url || "";
            document.getElementById("wp-token").value = entity?.site?.token || "";
            document.getElementById("wp-site-notes").value = joinLines(entity?.site?.notes);
            document.getElementById("wp-group").value = entity?.group || "";
            document.getElementById("wp-tags").value = joinLines(entity?.tags);
            document.getElementById("wp-metadata-notes").value = joinLines(entity?.notes);
            document.getElementById("wp-site-id").disabled = true;
          } else {
            document.getElementById("wp-site-id").disabled = false;
          }
        }

        drawer.classList.remove("hidden");
        drawerBackdrop.classList.remove("hidden");
        drawer.setAttribute("aria-hidden", "false");
      }

      function renderMetrics() {
        const wordpress = getWordPressConnector();
        const notionEnabled = state.connectors.filter((connector) => connector.kind === "notion" && connector.status === "enabled").length;
        const wordpressSites = wordpress?.entities?.length || 0;
        const healthWarnings = state.connectors.filter((connector) => connector.last_error).length;
        document.getElementById("metrics").innerHTML = [
          ["Conectores", String(state.connectors.length)],
          ["Notion activos", String(notionEnabled)],
          ["Sitios WordPress", String(wordpressSites)],
          ["Alertas", String(healthWarnings)],
        ].map(function(metric) {
          return '<div class="metric"><span class="subtle">' + metric[0] + "</span><strong>" + metric[1] + "</strong></div>";
        }).join("");
      }

      function renderConnectorOverview() {
        const container = document.getElementById("connector-overview");
        container.innerHTML = state.connectors.map(function(connector) {
          const summary = connector.kind === "wordpress"
            ? "Sitios: " + (connector.entities?.length || 0)
            : "Alias: " + escapeHtml(connector.config.alias) + (connector.config.workspaceName ? " · " + escapeHtml(connector.config.workspaceName) : "");
          const error = connector.last_error ? '<div class="message danger">' + escapeHtml(connector.last_error) + "</div>" : "";
          return '<article class="mini-card">'
            + '<div class="row" style="justify-content:space-between"><strong>' + escapeHtml(connector.label) + '</strong><span class="pill">' + escapeHtml(connector.kind) + "</span></div>"
            + '<div class="subtle">' + summary + "</div>"
            + '<div class="row">' + statusPill(connector.status) + '<span class="pill">auth: ' + escapeHtml(connector.auth_mode) + "</span></div>"
            + error
            + "</article>";
        }).join("");
      }

      function renderNotionTable() {
        const notionConnectors = state.connectors.filter((connector) => connector.kind === "notion");
        const container = document.getElementById("notion-table");
        if (!notionConnectors.length) {
          container.innerHTML = '<div class="empty-state">Todavía no hay conexiones de Notion. Usa <strong>Nueva conexión Notion</strong> para iniciar el flujo OAuth.</div>';
          return;
        }

        const head = '<div class="registry-head notion">'
          + "<div>Alias</div><div>Workspace</div><div>Parent</div><div>Estado</div>"
          + "</div>";

        const rows = notionConnectors.map(function(connector) {
          const workspace = connector.config.workspaceName || connector.config.workspaceId || "-";
          const parent = connector.config.defaultParentPageId || "Private / root";
          const lastCheck = connector.last_check_at || "Nunca";
          const error = connector.last_error ? '<div class="message danger">' + escapeHtml(connector.last_error) + "</div>" : "";
          return '<article class="registry-row">'
            + '<div class="registry-grid notion">'
            + '<div class="cell"><span class="caption">Alias</span><strong>' + escapeHtml(connector.config.alias) + '</strong><span class="subtle">' + escapeHtml(connector.label || "") + "</span></div>"
            + '<div class="cell"><span class="caption">Workspace</span><span>' + escapeHtml(workspace) + '</span><span class="subtle">' + escapeHtml(connector.config.ownerUserEmail || "") + "</span></div>"
            + '<div class="cell"><span class="caption">Parent por defecto</span><code>' + escapeHtml(parent) + '</code><span class="subtle">Ultimo check: ' + escapeHtml(lastCheck) + "</span></div>"
            + '<div class="cell"><span class="caption">Estado</span><div class="row">' + statusPill(connector.status) + '<span class="pill">' + escapeHtml(connector.auth_mode) + "</span></div></div>"
            + "</div>"
            + error
            + '<div class="row-footer">'
            + '<button data-action="validate-notion" data-alias="' + escapeHtml(connector.config.alias) + '">Validar</button>'
            + '<button data-action="toggle-notion" data-alias="' + escapeHtml(connector.config.alias) + '">' + (connector.status === "enabled" ? "Desactivar" : "Activar") + "</button>"
            + '<button data-action="edit-notion" data-alias="' + escapeHtml(connector.config.alias) + '">Editar</button>'
            + '<button class="danger" data-action="delete-notion" data-alias="' + escapeHtml(connector.config.alias) + '">Eliminar</button>'
            + "</div></article>";
        }).join("");

        container.innerHTML = '<div class="registry-shell">' + head + '<div class="registry-list">' + rows + "</div></div>";
      }

      function renderWordPressTable() {
        const connector = getWordPressConnector();
        const sites = connector?.entities || [];
        const container = document.getElementById("wordpress-table");
        if (!sites.length) {
          container.innerHTML = '<div class="empty-state">No hay sitios WordPress registrados. Usa <strong>Nuevo sitio WordPress</strong> para dar de alta una instancia.</div>';
          return;
        }

        const head = '<div class="registry-head wordpress">'
          + "<div>Sitio</div><div>Bridge</div><div>Metadata</div><div>Salud</div>"
          + "</div>";

        const rows = sites.map(function(entity) {
          const metadata = [
            entity.hidden ? "hidden" : null,
            entity.disabled ? "disabled" : null,
            entity.group ? "group:" + entity.group : null,
          ].filter(Boolean).join(" · ") || "sin flags";
          const tags = (entity.tags || []).join(", ");
          const health = entity.last_health || "unknown";
          const healthTone = health === "ok" ? "ok" : (health === "unknown" ? "off" : "error");
          const error = entity.last_error ? '<div class="message danger">' + escapeHtml(entity.last_error) + "</div>" : "";
          return '<article class="registry-row">'
            + '<div class="registry-grid wordpress">'
            + '<div class="cell"><span class="caption">Sitio</span><strong>' + escapeHtml(entity.site.site_id) + '</strong><span class="subtle">' + escapeHtml(entity.site.site_label || "") + ' · ' + escapeHtml(entity.site.environment || "") + "</span></div>"
            + '<div class="cell"><span class="caption">Bridge</span><code>' + escapeHtml(entity.site.bridge_url || "-") + '</code><span class="subtle">' + escapeHtml(entity.site.base_url || "") + "</span></div>"
            + '<div class="cell"><span class="caption">Metadata</span><span>' + escapeHtml(metadata) + '</span><span class="subtle">' + escapeHtml(tags || "sin tags") + "</span></div>"
            + '<div class="cell"><span class="caption">Salud</span><span class="pill ' + healthTone + '">' + escapeHtml(health) + "</span></div>"
            + "</div>"
            + error
            + '<div class="row-footer">'
            + '<button data-action="sync-site" data-site-id="' + escapeHtml(entity.site.site_id) + '">Check</button>'
            + '<button data-action="toggle-hidden" data-site-id="' + escapeHtml(entity.site.site_id) + '">' + (entity.hidden ? "Mostrar" : "Ocultar") + "</button>"
            + '<button data-action="toggle-disabled" data-site-id="' + escapeHtml(entity.site.site_id) + '">' + (entity.disabled ? "Activar" : "Desactivar") + "</button>"
            + '<button data-action="edit-site" data-site-id="' + escapeHtml(entity.site.site_id) + '">Editar</button>'
            + '<button class="danger" data-action="delete-site" data-site-id="' + escapeHtml(entity.site.site_id) + '">Eliminar</button>'
            + "</div></article>";
        }).join("");

        container.innerHTML = '<div class="registry-shell">' + head + '<div class="registry-list">' + rows + "</div></div>";
      }

      function renderCatalog() {
        document.getElementById("catalog-grid").innerHTML = state.catalog.map(function(entry) {
          return '<article class="mini-card">'
            + '<div class="row" style="justify-content:space-between"><strong>' + escapeHtml(entry.label) + '</strong><span class="pill">' + escapeHtml(entry.status) + "</span></div>"
            + '<p class="subtle">' + escapeHtml(entry.description) + "</p>"
            + '<div class="stack"><h3>Config schema</h3><pre>' + escapeHtml(JSON.stringify(entry.config_schema, null, 2)) + "</pre></div>"
            + '<div class="stack"><h3>Onboarding</h3><pre>' + escapeHtml(JSON.stringify(entry.onboarding_steps, null, 2)) + "</pre></div>"
            + "</article>";
        }).join("");
      }

      function renderUsageGuide() {
        const origin = window.location.origin;
        const wordpress = getWordPressConnector();
        const notionAliases = state.connectors
          .filter((candidate) => candidate.kind === "notion")
          .map((candidate) => candidate.config.alias);

        document.getElementById("usage-guide").innerHTML = [
          '<article class="mini-card">'
            + "<h3>Codex remoto</h3>"
            + '<pre>[mcp_servers.criu_hub]\\nurl = "' + escapeHtml(origin + "/mcp") + '"\\nbearer_token_env_var = "CRIU_MCP_HUB_TOKEN"</pre>'
            + '<p class="subtle">Define <code>CRIU_MCP_HUB_TOKEN</code> con el mismo valor de <code>MCP_API_KEY</code> en la máquina donde corre Codex.</p>'
            + "</article>",
          '<article class="mini-card">'
            + "<h3>WordPress bridge</h3>"
            + '<pre>POST ' + escapeHtml(origin + "/register-site") + '\\nAuthorization: Bearer WORDPRESS_REGISTRY_TOKEN</pre>'
            + '<p class="subtle">El plugin actual puede seguir auto-registrando sitios. Sitios visibles ahora: ' + String((wordpress?.entities?.length) || 0) + ".</p>"
            + "</article>",
          '<article class="mini-card">'
            + "<h3>Notion workspaces</h3>"
            + '<pre>' + escapeHtml(notionAliases.length ? notionAliases.join("\\n") : "Todavía no hay aliases dados de alta.") + "</pre>"
            + '<p class="subtle">Cada alias nuevo queda usable por MCP apenas autorizas la app de Notion y validas con <code>whoami</code>.</p>'
            + "</article>",
        ].join("");
      }

      function renderNotionOauthStatus() {
        const container = document.getElementById("notion-oauth-status");
        if (!state.notionOAuth.enabled) {
          container.classList.remove("info");
          container.classList.add("warn");
          container.textContent = "Notion OAuth no esta configurado todavía en el servidor. Debes cargar client_id, client_secret y redirect_uri en EasyPanel.";
          return;
        }

        container.classList.remove("warn");
        container.classList.add("info");
        container.textContent = "Conexión por autorización Notion activa. Redirect URI actual: " + (state.notionOAuth.redirect_uri || "(sin redirect_uri)") + ". Si no defines parent, el hub podrá crear páginas nuevas en Private cuando el permiso OAuth lo permita.";
      }

      function setActiveTab(tabName) {
        state.activeTab = tabName;
        try {
          window.localStorage.setItem("mcpHubActiveTab", tabName);
        } catch {}

        document.querySelectorAll("[data-tab]").forEach(function(button) {
          const active = button.dataset.tab === tabName;
          button.classList.toggle("active", active);
          button.setAttribute("aria-selected", active ? "true" : "false");
        });

        document.querySelectorAll("[data-panel]").forEach(function(panel) {
          panel.classList.toggle("active", panel.dataset.panel === tabName);
        });
      }

      function hydrateActiveTab() {
        const hashTab = window.location.hash.replace("#tab-", "").trim();
        if (hashTab && ["notion", "wordpress", "other"].includes(hashTab)) {
          state.activeTab = hashTab;
          return;
        }

        try {
          const saved = window.localStorage.getItem("mcpHubActiveTab");
          if (saved && ["notion", "wordpress", "other"].includes(saved)) {
            state.activeTab = saved;
          }
        } catch {}
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
        setActiveTab(state.activeTab);
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

        state.activeTab = "notion";
        if (status === "success") {
          showMessage(globalMessage, "Conexión Notion autorizada para alias: " + (params.get("alias") || "(sin alias)"), "info");
        } else {
          showMessage(globalMessage, params.get("error") || "No se pudo completar la autorización de Notion.", "danger");
        }

        params.delete("notion_oauth");
        params.delete("alias");
        params.delete("error");
        const next = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (next ? "?" + next : "") + "#tab-notion");
      }

      async function refreshSession() {
        const payload = await api("/api/admin/session");
        state.authenticated = Boolean(payload.authenticated);
        render();
        if (state.authenticated) {
          await loadOverview();
        }
      }

      async function handleDrawerSubmit(event) {
        event.preventDefault();
        try {
          if (state.drawer.kind === "notion") {
            const alias = document.getElementById("notion-alias").value.trim();
            const label = document.getElementById("notion-label").value.trim();
            const defaultParentPageId = document.getElementById("notion-parent").value.trim();
            const notionVersion = document.getElementById("notion-version").value.trim();

            if (state.drawer.mode === "create") {
              const params = new URLSearchParams({ alias });
              if (label) params.set("label", label);
              if (defaultParentPageId) params.set("defaultParentPageId", defaultParentPageId);
              if (notionVersion) params.set("notionVersion", notionVersion);
              window.location.href = "/api/admin/connectors/notion/oauth/start?" + params.toString();
              return;
            }

            await api("/api/admin/connectors/notion/" + state.drawer.key, {
              method: "PATCH",
              body: {
                label: label || undefined,
                defaultParentPageId: defaultParentPageId || null,
                notionVersion: notionVersion || null,
                status: document.getElementById("notion-status").value,
              },
            });

            closeDrawer();
            showMessage(globalMessage, "Conexión de Notion actualizada.", "info");
            await loadOverview();
            return;
          }

          if (state.drawer.kind === "wordpress") {
            const payload = {
              site_id: document.getElementById("wp-site-id").value.trim(),
              site_label: document.getElementById("wp-site-label").value.trim(),
              environment: document.getElementById("wp-environment").value,
              base_url: document.getElementById("wp-base-url").value.trim(),
              bridge_url: document.getElementById("wp-bridge-url").value.trim(),
              token: document.getElementById("wp-token").value.trim(),
              site_notes: splitLines(document.getElementById("wp-site-notes").value),
              group: document.getElementById("wp-group").value.trim() || undefined,
              tags: splitLines(document.getElementById("wp-tags").value),
              metadata_notes: splitLines(document.getElementById("wp-metadata-notes").value),
            };

            if (state.drawer.mode === "create") {
              await api("/api/admin/connectors/wordpress/sites", { method: "POST", body: payload });
              closeDrawer();
              showMessage(globalMessage, "Sitio WordPress registrado.", "info");
              await loadOverview();
              return;
            }

            await api("/api/admin/connectors/wordpress/sites/" + state.drawer.key, { method: "PATCH", body: payload });
            closeDrawer();
            showMessage(globalMessage, "Sitio WordPress actualizado.", "info");
            await loadOverview();
          }
        } catch (error) {
          showMessage(drawerMessage, error.message, "danger");
        }
      }

      loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        try {
          await api("/api/admin/login", { method: "POST", body: { apiKey: loginKey.value } });
          loginKey.value = "";
          state.authenticated = true;
          showMessage(loginMessage, "");
          render();
          await loadOverview();
        } catch (error) {
          showMessage(loginMessage, error.message, "danger");
        }
      });

      drawerForm.addEventListener("submit", handleDrawerSubmit);
      document.getElementById("drawer-close").addEventListener("click", closeDrawer);
      document.getElementById("drawer-cancel").addEventListener("click", closeDrawer);
      drawerBackdrop.addEventListener("click", closeDrawer);

      document.getElementById("logout-btn").addEventListener("click", async function() {
        await api("/api/admin/logout", { method: "POST" });
        state.authenticated = false;
        state.connectors = [];
        closeDrawer();
        render();
      });

      document.getElementById("refresh-all").addEventListener("click", function() {
        loadOverview().then(function() {
          showMessage(globalMessage, "Panel actualizado.", "info");
        }).catch(function(error) {
          showMessage(globalMessage, error.message, "danger");
        });
      });

      document.getElementById("sync-wordpress").addEventListener("click", async function() {
        try {
          const payload = await api("/api/admin/connectors/wordpress/sync", { method: "POST" });
          showMessage(globalMessage, JSON.stringify(payload, null, 2), "info");
          await loadOverview();
        } catch (error) {
          showMessage(globalMessage, error.message, "danger");
        }
      });

      document.getElementById("open-notion-create").addEventListener("click", function() {
        openDrawer("notion", "create");
      });

      document.getElementById("open-wordpress-create").addEventListener("click", function() {
        openDrawer("wordpress", "create");
      });

      document.body.addEventListener("click", async function(event) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.dataset.tab) {
          setActiveTab(target.dataset.tab);
          window.history.replaceState({}, "", window.location.pathname + window.location.search + "#tab-" + target.dataset.tab);
          return;
        }

        const action = target.dataset.action;
        if (!action) return;

        try {
          if (action === "validate-notion") {
            await api("/api/admin/connectors/notion/" + target.dataset.alias + "/validate", { method: "POST" });
            showMessage(globalMessage, "Conexión Notion validada.", "info");
          }

          if (action === "toggle-notion") {
            const connector = getNotionConnector(target.dataset.alias);
            await api("/api/admin/connectors/notion/" + target.dataset.alias, {
              method: "PATCH",
              body: { status: connector.status === "enabled" ? "disabled" : "enabled" },
            });
          }

          if (action === "edit-notion") {
            openDrawer("notion", "edit", target.dataset.alias);
            return;
          }

          if (action === "delete-notion") {
            if (window.confirm("Eliminar esta conexión de Notion?")) {
              await api("/api/admin/connectors/notion/" + target.dataset.alias, { method: "DELETE" });
            }
          }

          if (action === "sync-site") {
            await api("/api/admin/connectors/wordpress/sync", { method: "POST", body: { site_id: target.dataset.siteId } });
            showMessage(globalMessage, "Salud del sitio actualizada.", "info");
          }

          if (action === "toggle-hidden" || action === "toggle-disabled") {
            const entity = getWordPressEntity(target.dataset.siteId);
            await api("/api/admin/connectors/wordpress/sites/" + target.dataset.siteId, {
              method: "PATCH",
              body: action === "toggle-hidden" ? { hidden: !entity.hidden } : { disabled: !entity.disabled },
            });
          }

          if (action === "edit-site") {
            openDrawer("wordpress", "edit", target.dataset.siteId);
            return;
          }

          if (action === "delete-site") {
            if (window.confirm("Eliminar este sitio WordPress del registry?")) {
              await api("/api/admin/connectors/wordpress/sites/" + target.dataset.siteId, { method: "DELETE" });
            }
          }

          await loadOverview();
        } catch (error) {
          showMessage(globalMessage, error.message, "danger");
        }
      });

      document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && !drawer.classList.contains("hidden")) {
          closeDrawer();
        }
      });

      hydrateActiveTab();
      refreshSession().catch(function(error) {
        showMessage(loginMessage, error.message, "danger");
        loginShell.classList.remove("hidden");
      });
      applyOauthResultMessage();
    </script>
  </body>
</html>`;
}
