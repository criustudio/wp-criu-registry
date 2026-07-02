import type { ConnectorCatalogEntry } from "./types.js";

export const connectorCatalog: ConnectorCatalogEntry[] = [
  {
    kind: "notion",
    label: "Notion",
    status: "implemented",
    description: "Conector por token para varios workspaces, operado por alias y editable desde el panel.",
    config_schema: {
      alias: "string",
      label: "string",
      token: "string",
      defaultParentPageId: "string?",
      notionVersion: "string?",
      status: "enabled|disabled",
    },
    entity_schema: {
      type: "none",
      note: "Las entidades se gestionan directamente por herramientas MCP sobre pages/data sources.",
    },
    onboarding_steps: [
      "Crear alias tecnico",
      "Pegar token de integracion",
      "Definir parent por defecto opcional",
      "Validar con whoami",
      "Habilitar para MCP",
    ],
  },
  {
    kind: "wordpress",
    label: "WordPress",
    status: "implemented",
    description: "Registry compatible con el bridge actual y operaciones remotas via bridge_url + token por sitio.",
    config_schema: {
      connector: {
        registration_enabled: "boolean",
      },
      site: {
        site_id: "string",
        site_label: "string",
        environment: "production|staging|development",
        base_url: "string",
        bridge_url: "string",
        token: "string",
        site_notes: "string[]?",
        hidden: "boolean?",
        disabled: "boolean?",
        tags: "string[]?",
        group: "string?",
        metadata_notes: "string[]?",
      },
    },
    entity_schema: {
      entity_id: "site_id",
      health: "last_health",
      metadata: ["hidden", "disabled", "tags", "notes", "group"],
    },
    onboarding_steps: [
      "Registrar sitio manualmente o via /register-site",
      "Validar /site-info",
      "Clasificar metadata tecnica",
      "Dejar visible u oculto para MCP",
    ],
  },
  {
    kind: "template",
    label: "Future Connector Template",
    status: "template",
    description: "Base para evaluar e integrar una plataforma nueva sin rehacer la arquitectura.",
    config_schema: {
      manifest: {
        connector_id: "string",
        kind: "string",
        label: "string",
        auth_mode: "string",
        capabilities: "string[]",
      },
      adapter: {
        health_check: "function/endpoint",
        config_schema: "json schema",
        entity_schema: "json schema",
      },
    },
    entity_schema: {
      pattern: ["config", "health check", "entities", "MCP tools", "admin form"],
    },
    onboarding_steps: [
      "Revisar si la plataforma tiene API o bridge viable",
      "Definir manifest y config schema",
      "Implementar health check",
      "Añadir admin form",
      "Exponer herramientas MCP",
    ],
  },
];
