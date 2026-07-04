# Estado live del MCP Hub

Estado validado el `2026-07-02`.

## 1. Dónde está montado

- Dominio live: `https://mcp.criu.com.co`
- Proyecto EasyPanel: `criustudio`
- Servicio EasyPanel: `wp-criu-registry`
- Repo fuente del servicio: `criustudio/wp-criu-registry`

## 2. Qué expone hoy

- MCP remoto para modelos: `https://mcp.criu.com.co/mcp`
- Panel técnico: `https://mcp.criu.com.co/admin`
- Health: `https://mcp.criu.com.co/health`
- Registry WordPress compatible: `https://mcp.criu.com.co/sites`
- Auto-registro WordPress compatible: `https://mcp.criu.com.co/register-site`

## 3. Estado funcional verificado

- El health responde como `criu-mcp-hub`.
- El panel `/admin` carga y autentica por sesión.
- El MCP remoto lista herramientas correctamente.
- El registry WordPress heredado sigue funcionando con bearer token.
- Codex local ya tiene una entrada extra `criu_hub` sin romper `wp_criu`.

## 4. Cómo usarlo en Codex

Ya quedó agregada esta entrada en `C:\Users\gioba\.codex\config.toml`:

```toml
[mcp_servers.criu_hub]
url = "https://mcp.criu.com.co/mcp"

[mcp_servers.criu_hub.http_headers]
authorization = "Bearer <MCP_API_KEY>"
```

Si un chat actual no la ve todavía:

1. cierra y vuelve a abrir Codex
2. o abre un chat nuevo
3. valida con `codex mcp list`

## 5. Cómo usarlo en ChatGPT

Como el hub ya está publicado por HTTPS, el camino simple es conectarlo como MCP remoto apuntando a:

```text
https://mcp.criu.com.co/mcp
```

Usa el mismo bearer token del `MCP_API_KEY`.

Si más adelante quieres un flujo privado o local sin exponer endpoint público, el camino recomendado es `Secure MCP Tunnel`.

## 6. Cómo dar de alta un workspace de Notion

Entra a:

```text
https://mcp.criu.com.co/admin
```

Luego:

1. inicia sesión con `ADMIN_API_KEY`
2. crea un alias técnico
3. opcionalmente define `defaultParentPageId`
4. pulsa `Conectar con Notion`
5. autoriza la integración en Notion
6. vuelve al panel y pulsa validar

Efecto esperado:

- la conexión queda disponible sin redeploy
- el alias ya se puede usar desde las herramientas `notion_*`

## 7. Cómo dar de alta o mantener WordPress

Tienes dos caminos:

1. dejar que el plugin/bridge siga auto-registrando contra `POST /register-site`
2. registrar un sitio manualmente en `/admin`

El flujo viejo sigue vivo. El token de registry no cambió en el bridge heredado.

## 8. Cómo integrar otra plataforma después

Para meter una plataforma nueva en este hub, la regla práctica es:

1. confirmar que exista API o bridge usable
2. definir manifest del conector
3. definir config schema
4. crear health check
5. modelar entidades administrables
6. añadir bloque UI de onboarding
7. exponer herramientas MCP

Si la plataforma no tiene API ni bridge viable, no vale la pena forzarla dentro del hub.

## 9. Qué falta para tener Notion realmente operativo

La base ya está lista, pero hace falta configurar la integración pública de Notion en EasyPanel:

- `NOTION_OAUTH_CLIENT_ID`
- `NOTION_OAUTH_CLIENT_SECRET`
- `NOTION_OAUTH_REDIRECT_URI=https://mcp.criu.com.co/api/admin/connectors/notion/oauth/callback`

Sin eso:

- el conector existe como capacidad
- el panel muestra el flujo
- pero no hay workspaces reales activos todavía

## 10. Verificaciones rápidas útiles

Health:

```powershell
curl https://mcp.criu.com.co/health
```

Smoke MCP:

```powershell
$env:MCP_HUB_URL = "https://mcp.criu.com.co"
$env:MCP_HUB_TOKEN = "<MCP_API_KEY>"
npm run smoke:http
```

Codex:

```powershell
codex mcp list
```
