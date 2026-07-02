# Operacion personal del MCP Hub

Esta guia deja el hub listo para uso personal con `WordPress + Notion` y con Codex conectado al mismo endpoint remoto.

## 1. Qué queda centralizado

- `https://tu-dominio/mcp`: endpoint MCP para Codex y, después, ChatGPT.
- `https://tu-dominio/admin`: panel técnico para onboarding.
- `https://tu-dominio/sites` y `https://tu-dominio/register-site`: registry WordPress compatible.

Tu flujo ideal no es conectar cada app directo a Codex. El patrón es:

1. conectas la app al hub;
2. el hub persiste esa conexión;
3. Codex usa un único servidor MCP.

## 2. Despliegue local rápido

1. `npm install`
2. `copy .env.example .env`
3. Ajustar `MCP_API_KEY`, `ADMIN_API_KEY`, `ADMIN_SESSION_SECRET` y `WORDPRESS_REGISTRY_TOKEN`
4. `npm run dev`
5. Verificar:
   - `http://localhost:3000/health`
   - `http://localhost:3000/admin`

## 3. Despliegue directo en EasyPanel

Usa el `docker-compose.yml` del repo.

Variables mínimas:

- `MCP_AUTH_MODE=bearer`
- `MCP_API_KEY=<token privado>`
- `MCP_ALLOWED_HOSTS=mcp.tu-dominio.com,localhost,127.0.0.1`
- `ADMIN_API_KEY=<clave del panel>`
- `ADMIN_SESSION_SECRET=<secreto largo>`
- `WORDPRESS_REGISTRY_TOKEN=<token del plugin/bridge>`
- `HUB_STATE_FILE=/app/data/hub-state.json`

Persistencia:

- monta un volumen sobre `/app/data`

## 4. Reemplazo de un `wp_criu_registry` existente

Si el dominio actual ya expone el registry viejo:

1. respalda el volumen actual;
2. conserva el archivo legado `sites.json` dentro de `/app/data`;
3. deja `WORDPRESS_BOOTSTRAP_SITES_FILE=/app/data/sites.json`;
4. inicia el hub nuevo;
5. entra a `/admin` y confirma que los sitios heredados están visibles.

Si no vas a reutilizar el mismo volumen del servicio viejo, puedes traer los sitios antes del cambio con:

```powershell
$env:LEGACY_REGISTRY_TOKEN = "tu_token_actual"
npm run import:legacy-registry
```

Eso deja un `data/sites.json` local que el hub puede importar en el primer arranque.

El hub soporta importar sitios desde:

- un arreglo JSON legado;
- un objeto con forma `{ "sites": [...] }`;
- registros donde `service_user` venga como texto o número.

## 5. Cómo dar de alta servicios

### Notion

Desde `/admin`:

1. crear `alias`
2. poner `label`
3. pegar `token`
4. definir `defaultParentPageId` si quieres un parent por defecto
5. guardar
6. pulsar `Validar`

Resultado esperado:

- el alias queda activo sin redeploy;
- las herramientas `notion_*` ya pueden usar ese workspace.

### WordPress

Dos caminos:

- auto-registro del plugin/bridge actual a `POST /register-site`
- alta manual desde `/admin`

Campos mínimos por sitio:

- `site_id`
- `site_label`
- `environment`
- `base_url`
- `bridge_url`
- `token`

Metadata útil:

- `hidden`
- `disabled`
- `tags`
- `group`
- `notes`

## 6. Cómo conectar Codex

Añade esta entrada a `C:\Users\gioba\.codex\config.toml` cuando el dominio final ya esté sirviendo el hub:

```toml
[mcp_servers.criu_hub]
url = "https://mcp.criu.com.co/mcp"
bearer_token_env_var = "CRIU_MCP_HUB_TOKEN"
```

Y define en el entorno de la máquina:

```powershell
$env:CRIU_MCP_HUB_TOKEN = "tu_mismo_MCP_API_KEY"
```

Después reinicia Codex y valida que aparezcan herramientas como:

- `hub_list_connections`
- `notion_whoami`
- `list_sites`

Si quieres validar el endpoint antes de tocar `config.toml`, usa:

```powershell
$env:MCP_HUB_URL = "https://mcp.criu.com.co"
$env:MCP_HUB_TOKEN = "tu_mismo_MCP_API_KEY"
npm run smoke:http
```

## 7. Uso diario

- revisa `/health` para ver que el servicio siga arriba;
- usa `/admin` para altas, edición y validación;
- desactiva u oculta sitios antes de borrarlos si solo quieres sacarlos del contexto del modelo;
- usa `hub_list_connections` para confirmar lo que el MCP ve realmente.

## 8. Cómo integrar una app nueva después

Cada conector nuevo debe entrar con este paquete mínimo:

1. `manifest`
2. `config schema`
3. `health check`
4. `admin form`
5. `entity schema`
6. `MCP adapter`

Si la plataforma no tiene API o bridge viable, no debería entrar al hub en esa fase.
