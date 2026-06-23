param(
  [string]$RegistryToken = "REEMPLAZAR_CON_TU_TOKEN_DE_REGISTRO",
  [string]$SitesFile = "C:\Users\gioba\Documents\Codex\2026-06-23\estuvimos-trabajando-en-un-plugin-que\outputs\codex-wp-bridge-mcp\data\sites.json",
  [string]$Host = "0.0.0.0",
  [int]$Port = 8787
)

$env:CODEX_WP_BRIDGE_REGISTRY_TOKEN = $RegistryToken
$env:CODEX_WP_BRIDGE_SITES_FILE = $SitesFile
$env:CODEX_WP_BRIDGE_REGISTRY_HOST = $Host
$env:CODEX_WP_BRIDGE_REGISTRY_PORT = "$Port"

Write-Host "Starting wp_criu registry on http://$Host`:$Port"
Write-Host "Sites file: $SitesFile"

node (Join-Path $PSScriptRoot "..\src\registry-server.js")
