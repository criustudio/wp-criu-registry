# MCP Hub propio para Codex y ChatGPT

Este servicio consolida dos cosas en una sola capa:

- MCP remoto por `Streamable HTTP` para Codex y ChatGPT.
- Panel técnico y registry compatible para onboarding de conectores y sitios WordPress.

## Qué incluye ahora

- Hub MCP con herramientas de Notion y WordPress.
- State store persistido en JSON para onboarding editable.
- Panel técnico en `/admin`.
- Admin API en `/api/admin/*`.
- Registry WordPress compatible:
  - `GET /sites`
  - `GET /sites/:site_id`
  - `POST /register-site`
  - `PATCH /sites/:site_id`
  - `DELETE /sites/:site_id`

## Arquitectura

- `src/index.ts`: entrypoint HTTP, `/mcp`, `/health`, `/admin` y rutas de registry.
- `src/mcp-server.ts`: herramientas MCP de Notion y WordPress.
- `src/lib/state.ts`: estado persistido del hub.
- `src/notion.ts`: adaptador Notion por alias.
- `src/wordpress.ts`: adaptador WordPress compatible con el bridge actual.
- `src/admin/*`: UI y API técnica de onboarding.

## Variables de entorno

Obligatorias en producción:

- `ADMIN_API_KEY`
- `ADMIN_SESSION_SECRET`
- `WORDPRESS_REGISTRY_TOKEN`

Recomendadas:

- `MCP_AUTH_MODE=bearer`
- `MCP_API_KEY`
- `MCP_ALLOWED_HOSTS=mcp.tudominio.com,localhost,127.0.0.1`
- `HUB_STATE_FILE=/app/data/hub-state.json`

Bootstrap opcional:

- `NOTION_CONNECTIONS_JSON`
- `WORDPRESS_BOOTSTRAP_SITES_FILE`
- `NOTION_OAUTH_CLIENT_ID`
- `NOTION_OAUTH_CLIENT_SECRET`
- `NOTION_OAUTH_REDIRECT_URI`

## Rutas principales

- `GET /`
- `GET /health`
- `GET /admin`
- `POST /mcp`
- `GET /sites`
- `POST /register-site`

## Panel técnico

El panel permite:

- iniciar autorizaciones de Notion por OAuth;
- almacenar y editar conexiones Notion ya autorizadas;
- validarlas con `whoami`;
- registrar sitios WordPress a mano;
- ver estado de bridge;
- ocultar o desactivar sitios sin borrarlos lógicamente del modelo;
- eliminar sitios del registry;
- ver el catálogo técnico para futuros conectores.

## Compatibilidad WordPress

La idea es no romper el stack actual:

- el plugin WordPress puede seguir enviando auto-registro a `POST /register-site`;
- el modelo por `site_id`, `site_label` y `base_url` se mantiene;
- las herramientas MCP WordPress conservan los mismos nombres usados antes.

## Uso local

```bash
npm install
copy .env.example .env
npm run dev
```

Pruebas rápidas:

```bash
curl http://localhost:3000/health
npm run smoke:http
```

Abre:

```text
http://localhost:3000/admin
```

## Despliegue en EasyPanel

1. Crea el servicio desde este directorio.
2. Persiste `./data` o define un volumen para `HUB_STATE_FILE`.
3. Configura `MCP_AUTH_MODE=bearer` y un `MCP_API_KEY` privado.
4. Configura `MCP_ALLOWED_HOSTS` con tu dominio publico y localhost.
5. Configura `ADMIN_API_KEY`, `ADMIN_SESSION_SECRET` y `WORDPRESS_REGISTRY_TOKEN`.
6. Si vas a conectar Notion desde el panel, configura `NOTION_OAUTH_CLIENT_ID`, `NOTION_OAUTH_CLIENT_SECRET` y `NOTION_OAUTH_REDIRECT_URI=https://tu-dominio/api/admin/connectors/notion/oauth/callback`.
7. Si vienes del `wp_criu_registry` actual, monta el mismo volumen y deja `WORDPRESS_BOOTSTRAP_SITES_FILE=/app/data/sites.json`.
8. Publica el servicio por HTTPS.
9. Usa `/mcp` para MCP y `/admin` para onboarding humano.

## Onboarding de Notion

1. Crea una integración pública de Notion y define como redirect URI:
   - `https://tu-dominio/api/admin/connectors/notion/oauth/callback`
2. Carga `NOTION_OAUTH_CLIENT_ID`, `NOTION_OAUTH_CLIENT_SECRET` y `NOTION_OAUTH_REDIRECT_URI` en EasyPanel.
3. Entra a `/admin`.
4. Escribe `alias`, `label` opcional y `defaultParentPageId` opcional.
5. Pulsa `Conectar con Notion`.
6. Autoriza la integración en Notion.
7. Vuelve al panel y valida con `whoami`.

## Migración directa desde el registry actual

Si `mcp.criu.com.co` hoy responde como `wp_criu_registry`, la migración segura para reemplazarlo con este hub es:

1. Respaldar el volumen actual de `/app/data`.
2. Mantener el archivo legado `sites.json` en ese mismo volumen.
3. Desplegar este servicio con:
   - `HUB_STATE_FILE=/app/data/hub-state.json`
   - `WORDPRESS_BOOTSTRAP_SITES_FILE=/app/data/sites.json`
4. Arrancar el hub nuevo.
5. Confirmar en `/admin` que los sitios heredados aparecieron.

El hub también intenta detectar automáticamente un `sites.json` vecino al `hub-state.json`, de modo que un reemplazo directo no dependa de pasos manuales extra.

## Codex

Ejemplo con bearer:

```toml
[mcp_servers.criu_hub]
url = "https://mcp.tudominio.com/mcp"
bearer_token_env_var = "CRIU_MCP_HUB_TOKEN"
```

El valor de `CRIU_MCP_HUB_TOKEN` debe ser el mismo `MCP_API_KEY` del hub.

## ChatGPT

Diseño recomendado:

- camino principal: `Secure MCP Tunnel`
- fallback: endpoint HTTPS directo a `/mcp`

## Guía operativa

Hay una guía más aterrizada de uso personal, despliegue y onboarding en [docs/OPERACION_PERSONAL.md](./docs/OPERACION_PERSONAL.md).

Si este repo ya está desplegado en producción, el estado operativo real y los endpoints live actuales quedaron documentados en [docs/ESTADO_LIVE_MCP_CRIU.md](./docs/ESTADO_LIVE_MCP_CRIU.md).

## Scripts útiles

Importar sitios desde el registry vivo actual a `data/sites.json`:

```bash
LEGACY_REGISTRY_TOKEN=tu_token npm run import:legacy-registry
```

O explícitamente:

```bash
node scripts/import-legacy-registry.mjs --url https://mcp.criu.com.co --token tu_token --output ./data/sites.json
```

Hacer smoke test HTTP/MCP del hub ya levantado:

```bash
MCP_HUB_URL=https://mcp.criu.com.co MCP_HUB_TOKEN=tu_token npm run smoke:http
```

## Futuros conectores

Cada integración nueva debería entrar como:

1. manifest del conector
2. config schema
3. health check
4. admin form
5. entidades administrables
6. adaptador MCP
