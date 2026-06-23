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
- Un archivo JSON local con la lista de sitios.

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

## Configuración en Codex

Usa `examples/codex-mcp-config.json` como base para tu bloque `mcpServers`.

Nombre recomendado del servidor en Codex:

- `wp_criu`

## Flujo recomendado

1. Inicia el registry de `wp_criu`.
2. Instala el plugin final en WordPress.
3. Pega `Registry URL` y `Registry token` en `Tools > Codex Bridge`.
4. Guarda.
5. El sitio se registra solo en `data/sites.json`.
6. Inicia el MCP desde Codex.
7. Usa herramientas como `list_sites`, `get_site_info`, `list_plugins` o `rest_proxy`.
