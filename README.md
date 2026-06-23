# Codex WP Bridge MCP

Servidor MCP local para operar uno o varios sitios WordPress que tengan instalado `Codex WP Admin Bridge`.

## Qué resuelve

Te da una sola capa de operación desde Codex para:

- listar sitios configurados;
- inspeccionar un sitio por `site_id`;
- gestionar plugins y temas;
- leer y actualizar opciones;
- leer y escribir archivos;
- ejecutar SQL de solo lectura;
- usar `rest-proxy`;
- revisar traducciones;
- inspeccionar checkout fields de WooCommerce;
- registrar sitios automáticamente desde el plugin mediante un endpoint HTTP.

## Requisitos

- Node.js 18 o superior.
- El plugin `Codex WP Admin Bridge` instalado en cada WordPress objetivo.
- Un registry HTTP accesible para el auto-registro o, como respaldo, un archivo JSON local con la lista de sitios.

## Instalación

```powershell
cd C:\Users\gioba\Documents\Codex\2026-06-23\estuvimos-trabajando-en-un-plugin-que\outputs\codex-wp-bridge-mcp
npm install
```

## Domain deploy

For a real domain deployment like `mcp.criu.com.co`, use:

- [deploy-on-domain.md](/C:/Users/gioba/Documents/Codex/2026-06-23/estuvimos-trabajando-en-un-plugin-que/outputs/codex-wp-bridge-mcp/deploy-on-domain.md)
- [Dockerfile](/C:/Users/gioba/Documents/Codex/2026-06-23/estuvimos-trabajando-en-un-plugin-que/outputs/codex-wp-bridge-mcp/Dockerfile)
- [.env.example](/C:/Users/gioba/Documents/Codex/2026-06-23/estuvimos-trabajando-en-un-plugin-que/outputs/codex-wp-bridge-mcp/.env.example)

## Registro automático

Inicia el registry:

```powershell
cd C:\Users\gioba\Documents\Codex\2026-06-23\estuvimos-trabajando-en-un-plugin-que\outputs\codex-wp-bridge-mcp
$env:CODEX_WP_BRIDGE_REGISTRY_TOKEN="REEMPLAZAR_CON_TU_TOKEN_DE_REGISTRO"
$env:CODEX_WP_BRIDGE_SITES_FILE="C:\Users\gioba\Documents\Codex\2026-06-23\estuvimos-trabajando-en-un-plugin-que\outputs\codex-wp-bridge-mcp\data\sites.json"
npm run start:registry
```

O en Windows usa:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-registry.ps1 -RegistryToken "REEMPLAZAR_CON_TU_TOKEN_DE_REGISTRO"
```

Luego en el plugin WordPress configura:

- `Registry URL`: `https://tu-registry-publico/register-site`
- `Registry token`: el mismo token del registry

Cada vez que guardes el plugin, el sitio quedará registrado solo.

Importante:

- la `Registry URL` debe ser accesible desde el WordPress remoto;
- si `wp_criu` corre en tu máquina local, expón ese endpoint con un dominio o túnel antes de usar el auto-registro.

El registry remoto también expone:

- `GET /health` para comprobar salud
- `GET /sites` con bearer token para que `wp_criu` lea automáticamente todos los sitios vinculados

## Configuración de sitios manual o de respaldo

Usa `examples/sites.example.json` como plantilla si quieres cargar sitios a mano. Luego define:

```powershell
$env:CODEX_WP_BRIDGE_SITES_FILE="C:\ruta\a\sites.json"
```

Cada entrada necesita:

- `site_id`
- `site_label`
- `environment`
- `base_url`
- `bridge_url`
- `token`

## Prueba local

```powershell
$env:CODEX_WP_BRIDGE_SITES_FILE="C:\ruta\a\sites.json"
npm start
```

El proceso queda esperando tráfico MCP por `stdio`.

## Configuración automática en Codex

La forma recomendada es apuntar `wp_criu` al registry remoto:

```toml
[mcp_servers.wp_criu]
command = "node"
args = ["C:/Users/gioba/Documents/Codex/2026-06-23/estuvimos-trabajando-en-un-plugin-que/outputs/codex-wp-bridge-mcp/src/server.js"]
cwd = "C:/Users/gioba/Documents/Codex/2026-06-23/estuvimos-trabajando-en-un-plugin-que/outputs/codex-wp-bridge-mcp"
enabled = true
required = false
startup_timeout_sec = 15
tool_timeout_sec = 120
env = { CODEX_WP_BRIDGE_REGISTRY_URL = "https://mcp.criu.com.co", CODEX_WP_BRIDGE_REGISTRY_TOKEN = "REEMPLAZAR_CON_TU_TOKEN_DE_REGISTRO", CODEX_WP_BRIDGE_SITES_FILE = "C:/Users/gioba/Documents/Codex/2026-06-23/estuvimos-trabajando-en-un-plugin-que/outputs/codex-wp-bridge-mcp/data/sites.json" }
```

Con eso, `wp_criu` intenta leer primero desde `mcp.criu.com.co/sites`. Si el registry no está disponible, puedes dejar `CODEX_WP_BRIDGE_SITES_FILE` como respaldo manual.

## Configuración en Codex

Usa `examples/codex-mcp-config.json` como base para tu bloque `mcpServers`.

Nombre recomendado del servidor en Codex:

- `wp_criu`

## Flujo recomendado

1. Inicia o despliega el registry de `wp_criu`.
2. Configura `wp_criu` en Codex con `CODEX_WP_BRIDGE_REGISTRY_URL` y `CODEX_WP_BRIDGE_REGISTRY_TOKEN`.
3. Instala el plugin final en WordPress.
4. Pega `Registry URL` y `Registry token` en `Tools > Codex Bridge`.
5. Guarda.
6. El sitio se registra solo en el registry remoto.
7. Usa `list_sites` en Codex y el nuevo sitio aparecerá sin tocar archivos locales.
