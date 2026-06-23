# Deploy `wp_criu` registry on `mcp.criu.com.co`

## Final values to use in the plugin

- `Registry URL`: `https://mcp.criu.com.co/register-site`
- `Registry token`: `REEMPLAZAR_CON_TOKEN_SEGURO`

## What to deploy

Deploy the folder:

`C:\Users\gioba\Documents\Codex\2026-06-23\estuvimos-trabajando-en-un-plugin-que\outputs\codex-wp-bridge-mcp`

as a Node or Docker app on any server you control.

## Simplest deployment shape

### Option A: Docker app

Use the included `Dockerfile`.

Required environment variable:

```env
CODEX_WP_BRIDGE_REGISTRY_TOKEN=REEMPLAZAR_CON_TOKEN_SEGURO
```

Port exposed by the app:

`8787`

Health endpoint:

`/health`

Register endpoint:

`/register-site`

### Option B: Plain Node app

Command:

```bash
node src/registry-server.js
```

Required environment variables:

```env
CODEX_WP_BRIDGE_REGISTRY_TOKEN=REEMPLAZAR_CON_TOKEN_SEGURO
CODEX_WP_BRIDGE_SITES_FILE=/ruta/real/sites.json
CODEX_WP_BRIDGE_REGISTRY_PORT=8787
```

## DNS

Create a DNS record for:

- `mcp.criu.com.co`

Point it to the public server where this app will run:

- `A` record to the server IP, or
- `CNAME` if your platform requires it.

## Reverse proxy

Your reverse proxy should forward:

- `https://mcp.criu.com.co/health`
- `https://mcp.criu.com.co/register-site`

to:

- `http://127.0.0.1:8787`

## If you use EasyPanel

Recommended setup:

1. Create a new app service.
2. Deploy this folder or repo.
3. Expose internal port `8787`.
4. Add domain `mcp.criu.com.co`.
5. Set env var:
   - `CODEX_WP_BRIDGE_REGISTRY_TOKEN`
6. Keep `data/sites.json` persisted if you want registrations to survive redeploys.

## What you do after deploy

1. Open:
   - `https://mcp.criu.com.co/health`
2. If it responds with `ok: true`, the registry is live.
3. In the plugin put:
   - `Registry URL`: `https://mcp.criu.com.co/register-site`
   - `Registry token`: `REEMPLAZAR_CON_TOKEN_SEGURO`
4. Save the plugin settings.
5. The site should auto-register in `wp_criu`.

## Security note

This token is now your live shared registration secret if you decide to use it as-is.

If you prefer, rotate it before production and update both:

- the deployed registry env var
- the plugin `Registry token`
