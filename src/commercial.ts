import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express, { type Express, type Request, type Response } from "express";
import type { AppConfig } from "./config.js";
import { hasAdminSession } from "./lib/auth.js";

type CommercialSite = { id: string; label: string; url: string; secret: string; status: "active" | "suspended"; createdAt: string; updatedAt: string };
type Enrollment = { hash: string; expiresAt: number };
type Invitation = { hash: string; siteId: string; permissions: string[]; expiresAt: number };
type Membership = { siteId: string; permissions: string[]; active: boolean; linkedAt: string };
type CommercialUser = { telegramId: string; firstName: string; memberships: Membership[]; activeSiteId: string };
type CommercialState = { version: 1; sites: CommercialSite[]; enrollments: Enrollment[]; invitations: Invitation[]; users: CommercialUser[]; updateIds: number[]; pendingReplies: Record<string, { chatId: string; text: string }> };

const permissions = new Set([
  "product.read", "product.update.text", "product.update.price", "product.update.stock",
  "product.update.media", "product.trash", "product.delete_permanently", "page.update.content",
]);
const permissionLabels: Record<string, string> = {
  "product.read": "consultar productos",
  "product.update.text": "cambiar textos de productos",
  "product.update.price": "cambiar precios",
  "product.update.stock": "actualizar existencias",
  "product.update.media": "cambiar fotos de productos",
  "product.trash": "enviar productos a la papelera",
  "product.delete_permanently": "eliminar productos con doble confirmación",
  "page.update.content": "actualizar contenido autorizado de páginas",
};

function token(): string { return crypto.randomBytes(24).toString("base64url"); }
function hash(value: string): string { return crypto.createHash("sha256").update(value).digest("hex"); }
function sign(secret: string, timestamp: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}
function safeUrl(raw: string): string {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
    host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) {
    throw new Error("La web debe tener una URL pública HTTPS.");
  }
  return url.origin;
}
function fail(res: Response, status: number, message: string): void { res.status(status).json({ ok: false, error: message }); }

class CommercialStore {
  private readonly file: string;
  readonly data: CommercialState;

  constructor(stateFile: string) {
    this.file = path.join(path.dirname(stateFile), "commercial-state.json");
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    let loaded: Partial<CommercialState> = {};
    if (fs.existsSync(this.file)) {
      try { loaded = JSON.parse(fs.readFileSync(this.file, "utf8")) as Partial<CommercialState>; } catch { throw new Error("No se pudo leer el estado comercial; se detuvo para proteger los accesos."); }
    }
    this.data = {
      version: 1,
      sites: Array.isArray(loaded.sites) ? loaded.sites : [],
      enrollments: Array.isArray(loaded.enrollments) ? loaded.enrollments : [],
      invitations: Array.isArray(loaded.invitations) ? loaded.invitations : [],
      users: Array.isArray(loaded.users) ? loaded.users : [],
      updateIds: Array.isArray(loaded.updateIds) ? loaded.updateIds : [],
      pendingReplies: loaded.pendingReplies && typeof loaded.pendingReplies === "object" ? loaded.pendingReplies : {},
    };
    this.save();
  }

  save(): void {
    const temp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    fs.renameSync(temp, this.file);
  }
  prune(): void {
    const now = Date.now();
    this.data.enrollments = this.data.enrollments.filter((item) => item.expiresAt > now);
    this.data.invitations = this.data.invitations.filter((item) => item.expiresAt > now);
  }
}

async function requestSite(site: CommercialSite, route: string, payload: unknown, requestId: string = crypto.randomUUID()): Promise<unknown> {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const response = await fetch(`${site.url}/wp-json/triu-commercial/v1/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Criu-Timestamp": timestamp, "X-Criu-Request-ID": requestId, "X-Criu-Signature": sign(site.secret, timestamp, `${requestId}.${body}`) },
    body,
    signal: AbortSignal.timeout(25000),
  });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok) { throw new Error(`La web no aceptó la solicitud (${response.status}).`); }
  return result;
}

async function telegram(tokenValue: string, method: string, payload: unknown): Promise<unknown> {
  const response = await fetch(`https://api.telegram.org/bot${tokenValue}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000),
  });
  const result = await response.json() as { ok?: boolean; result?: unknown };
  if (!response.ok || !result.ok) { throw new Error("Telegram no respondió correctamente."); }
  return result.result;
}

export function registerCommercialRoutes(app: Express, config: AppConfig): void {
  app.use("/commercial/v1", express.json({ limit: "2mb" }));
  const store = new CommercialStore(config.stateFile);
  const botToken = process.env.CRIU_COMMERCIAL_TELEGRAM_TOKEN ?? "";
  const botUsername = process.env.CRIU_COMMERCIAL_BOT_USERNAME ?? "elixirwebmaster_bot";
  const webhookSecret = process.env.CRIU_COMMERCIAL_WEBHOOK_SECRET ?? "";
  const publicUrl = process.env.CRIU_COMMERCIAL_PUBLIC_URL ?? "https://mcp.criu.com.co";
  const inFlight = new Set<number>();

  function admin(req: Request, res: Response): boolean {
    if (!hasAdminSession(req, config.adminSessionSecret)) { fail(res, 401, "Inicia sesión en el panel Criu."); return false; }
    return true;
  }

  async function issueInvitation(site: CommercialSite, raw: unknown): Promise<string> {
    if (!botToken || !webhookSecret) throw new Error("El bot aún no está configurado en Criu.");
    const webhook = await telegram(botToken, "getWebhookInfo", {}) as { url?: string };
    if (webhook.url !== `${publicUrl}/commercial/v1/telegram`) throw new Error("Conecta primero el bot con el panel comercial Criu.");
    if (!Array.isArray(raw)) throw new Error("Selecciona al menos un permiso.");
    const granted = raw.filter((item): item is string => typeof item === "string" && permissions.has(item));
    if (!granted.length) throw new Error("Selecciona al menos un permiso.");
    store.prune();
    const code = token();
    store.data.invitations.push({ hash: hash(code), siteId: site.id, permissions: granted, expiresAt: Date.now() + 20 * 60_000 });
    store.save();
    return `https://t.me/${botUsername}?start=${code}`;
  }

  app.get("/api/admin/connectors/commercial/sites", (req, res) => {
    if (!admin(req, res)) return;
    store.prune();
    res.json({ ok: true, botConfigured: Boolean(botToken && webhookSecret), sites: store.data.sites.map((site) => ({
      id: site.id, label: site.label, url: site.url, status: site.status, updatedAt: site.updatedAt,
      users: store.data.users.filter((user) => user.memberships.some((member) => member.siteId === site.id && member.active)).map((user) => ({
        telegramId: user.telegramId, firstName: user.firstName,
        permissions: user.memberships.find((member) => member.siteId === site.id)?.permissions ?? [],
      })),
    })) });
  });

  app.post("/commercial/v1/sites/register", async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const url = safeUrl(String(body.site_url ?? ""));
      const label = String(body.site_label ?? "").trim().slice(0, 120);
      const secret = String(body.site_secret ?? "");
      if (!label || !/^[a-f0-9]{64}$/i.test(secret)) { fail(res, 400, "Datos de conexión incompletos."); return; }
      const nonce = token();
      const proof = await fetch(`${url}/wp-json/triu-commercial/v1/hub-challenge?nonce=${encodeURIComponent(nonce)}`, { signal: AbortSignal.timeout(10000) });
      const checked = await proof.json() as { proof?: string };
      const expected = crypto.createHmac("sha256", secret).update(nonce).digest("hex");
      if (!proof.ok || checked.proof !== expected) { fail(res, 400, "No se pudo comprobar el control de la web."); return; }
      const id = `commercial-${hash(url).slice(0, 16)}`;
      const now = new Date().toISOString();
      const existing = store.data.sites.find((site) => site.id === id);
      if (existing && existing.secret !== secret) { fail(res, 409, "La web ya tiene otra conexión. Revísala desde el panel Criu."); return; }
      if (existing?.status === "suspended") { fail(res, 409, "Esta conexión está suspendida. Revísala desde el panel Criu."); return; }
      if (existing) { existing.label = label; existing.updatedAt = now; }
      else { store.data.sites.push({ id, label, url, secret, status: "active", createdAt: now, updatedAt: now }); }
      store.save();
      res.json({ ok: true, siteId: id, botUsername });
    } catch { fail(res, 400, "No se pudo registrar la web. Comprueba la URL HTTPS y vuelve a intentarlo."); }
  });

  app.post("/commercial/v1/intent", async (req, res) => {
    const key = process.env.CRIU_COMMERCIAL_OPENAI_KEY ?? "";
    const siteId = String(req.headers["x-criu-site-id"] ?? "");
    const timestamp = String(req.headers["x-criu-timestamp"] ?? "");
    const signature = String(req.headers["x-criu-signature"] ?? "");
    const site = store.data.sites.find((item) => item.id === siteId && item.status === "active");
    const input = String(req.body?.message ?? "");
    if (!site || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
      !/^[a-f0-9]{64}$/i.test(signature) ||
      !crypto.timingSafeEqual(Buffer.from(signature.toLowerCase()), Buffer.from(sign(site.secret, timestamp, input)))) {
      fail(res, 401, "Conexión no autorizada."); return;
    }
    if (!key) { fail(res, 503, "La IA todavía no está configurada en Criu."); return; }
    const schema = { type: "object", properties: {
      action: { type: "string", enum: ["product_search", "product_update", "product_image", "product_delete", "page_update", "page_image", "page_add_item", "unsupported", "unknown"] },
      product_query: { type: "string" }, field: { type: "string", enum: ["", "name", "description", "short_description", "regular_price", "sale_price", "stock_quantity"] },
      value: { type: "string" }, slot_query: { type: "string" }, reply: { type: "string" },
    }, required: ["action", "product_query", "field", "value", "slot_query", "reply"], additionalProperties: false };
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.CRIU_COMMERCIAL_OPENAI_MODEL ?? "gpt-4o-mini",
          instructions: "Clasifica solicitudes de un comercial de WordPress. Responde en JSON según el esquema. Solo identifica intención y datos; no afirmes que hiciste cambios. Para precios usa regular_price o sale_price. Para fotos de producto usa product_image. Para cambios informativos de página o Elementor usa page_update, page_image o page_add_item. Si piden colores, animaciones, estructura, código, plugins, archivos, configuración o tareas fuera del catálogo usa unsupported. Si falta un dato deja su campo como cadena vacía. El reply debe ser una pregunta breve solo para unknown o unsupported.",
          input: [{ role: "user", content: input }], text: { format: { type: "json_schema", name: "criu_commercial_intent", strict: true, schema } }, max_output_tokens: 300,
        }), signal: AbortSignal.timeout(20000),
      });
      const result = await response.json() as { status?: string; output?: { type?: string; content?: { type?: string; text?: string }[] }[] };
      if (!response.ok || result.status !== "completed") { fail(res, 502, "No pude interpretar la solicitud ahora."); return; }
      const content = result.output?.find((item) => item.type === "message")?.content?.find((item) => item.type === "output_text")?.text;
      const intent = content ? JSON.parse(content) as Record<string, unknown> : null;
      if (!intent || typeof intent.action !== "string") { fail(res, 502, "No pude entender la solicitud."); return; }
      res.json({ ok: true, intent });
    } catch { fail(res, 502, "No pude interpretar la solicitud ahora."); }
  });

  app.post("/commercial/v1/sites/:siteId/revoke", (req, res) => {
    const siteId = String(req.params.siteId);
    const site = store.data.sites.find((item) => item.id === siteId && item.status === "active");
    const timestamp = String(req.headers["x-criu-timestamp"] ?? "");
    const signature = String(req.headers["x-criu-signature"] ?? "");
    const telegramId = String(req.body?.telegram_id ?? "");
    if (!site || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
      !/^[a-f0-9]{64}$/i.test(signature) ||
      !crypto.timingSafeEqual(Buffer.from(signature.toLowerCase()), Buffer.from(sign(site.secret, timestamp, telegramId)))) {
      fail(res, 401, "Conexión no autorizada."); return;
    }
    const user = store.data.users.find((item) => item.telegramId === telegramId);
    const membership = user?.memberships.find((item) => item.siteId === siteId);
    if (membership) { membership.active = false; if (user?.activeSiteId === siteId) user.activeSiteId = ""; store.save(); }
    res.json({ ok: true, revoked: Boolean(membership) });
  });

  app.get("/commercial/v1/media/:fileId", async (req, res) => {
    if (!botToken) { fail(res, 503, "Bot sin configurar."); return; }
    const siteId = String(req.query.site_id ?? "");
    const fileId = String(req.params.fileId ?? "");
    const timestamp = String(req.query.timestamp ?? "");
    const signature = String(req.query.signature ?? "");
    const site = store.data.sites.find((item) => item.id === siteId && item.status === "active");
    if (!site || !/^[A-Za-z0-9_-]{10,256}$/.test(fileId) || !/^\d+$/.test(timestamp) ||
      Math.abs(Date.now() / 1000 - Number(timestamp)) > 90 || !/^[a-f0-9]{64}$/i.test(signature) ||
      !crypto.timingSafeEqual(Buffer.from(signature.toLowerCase()), Buffer.from(crypto.createHmac("sha256", site.secret).update(`${siteId}.${fileId}.${timestamp}`).digest("hex")))) {
      fail(res, 401, "Archivo no autorizado."); return;
    }
    try {
      const file = await telegram(botToken, "getFile", { file_id: fileId }) as { file_path?: string; file_size?: number };
      if (!file.file_path || (file.file_size ?? 0) > 10 * 1024 * 1024) { fail(res, 400, "Fotografía no disponible."); return; }
      const remote = await fetch(`https://api.telegram.org/file/bot${botToken}/${file.file_path}`, { signal: AbortSignal.timeout(20000) });
      if (!remote.ok) { fail(res, 502, "No se pudo descargar la fotografía."); return; }
      const bytes = Buffer.from(await remote.arrayBuffer());
      if (bytes.length > 10 * 1024 * 1024) { fail(res, 400, "La fotografía supera el límite."); return; }
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Cache-Control", "no-store");
      res.send(bytes);
    } catch { fail(res, 502, "No se pudo descargar la fotografía."); }
  });

  app.post("/api/admin/connectors/commercial/sites/:siteId/invitations", async (req, res) => {
    if (!admin(req, res)) return;
    const site = store.data.sites.find((item) => item.id === req.params.siteId && item.status === "active");
    if (!site) { fail(res, 404, "Conexión no disponible."); return; }
    try { res.json({ ok: true, url: await issueInvitation(site, req.body?.permissions), expiresInSeconds: 1200 }); }
    catch (error) { fail(res, 400, error instanceof Error ? error.message : "Permisos no válidos."); }
  });

  app.post("/api/admin/connectors/commercial/sites/:siteId/suspend", (req, res) => {
    if (!admin(req, res)) return;
    const site = store.data.sites.find((item) => item.id === req.params.siteId);
    if (!site) { fail(res, 404, "Conexión no encontrada."); return; }
    site.status = "suspended"; site.updatedAt = new Date().toISOString(); store.save();
    res.json({ ok: true });
  });

  app.post("/api/admin/connectors/commercial/sites/:siteId/users/:telegramId/revoke", async (req, res) => {
    if (!admin(req, res)) return;
    const site = store.data.sites.find((item) => item.id === req.params.siteId);
    const user = store.data.users.find((item) => item.telegramId === req.params.telegramId);
    const membership = user?.memberships.find((item) => item.siteId === site?.id && item.active);
    if (!site || !membership) { fail(res, 404, "Acceso no encontrado."); return; }
    try {
      await requestSite(site, "hub-revoke", { telegram_id: user?.telegramId });
      membership.active = false;
      if (user?.activeSiteId === site.id) user.activeSiteId = "";
      store.save();
      res.json({ ok: true });
    } catch { fail(res, 502, "No se pudo revocar el acceso en la web."); }
  });

  app.post("/api/admin/connectors/commercial/connect-bot", async (req, res) => {
    if (!admin(req, res)) return;
    if (!botToken || !webhookSecret) { fail(res, 503, "Configura el token y el secreto del bot en el servicio."); return; }
    try {
      const site = store.data.sites.find((item) => item.status === "active");
      if (!site) { fail(res, 409, "Registra primero una web comercial activa."); return; }
      await telegram(botToken, "setWebhook", { url: `${publicUrl}/commercial/v1/telegram`, secret_token: webhookSecret, allowed_updates: ["message"], drop_pending_updates: false });
      res.json({ ok: true, url: `${publicUrl}/commercial/v1/telegram` });
    } catch { fail(res, 502, "Telegram no aceptó el webhook."); }
  });

  app.post("/commercial/v1/telegram", async (req, res) => {
    if (!botToken || !webhookSecret) { fail(res, 503, "Bot sin configurar."); return; }
    const received = String(req.headers["x-telegram-bot-api-secret-token"] ?? "");
    if (!received || !crypto.timingSafeEqual(Buffer.from(hash(received)), Buffer.from(hash(webhookSecret)))) {
      fail(res, 401, "No autorizado."); return;
    }
    const update = req.body as Record<string, unknown>;
    const updateId = Number(update.update_id);
    if (!Number.isSafeInteger(updateId) || store.data.updateIds.includes(updateId)) { res.json({ ok: true }); return; }
    if (inFlight.has(updateId)) { fail(res, 503, "Mensaje en proceso."); return; }
    inFlight.add(updateId);
    const pending = store.data.pendingReplies[String(updateId)];
    if (pending) {
      try {
        await telegram(botToken, "sendMessage", { chat_id: pending.chatId, text: pending.text });
        delete store.data.pendingReplies[String(updateId)];
        store.data.updateIds.push(updateId);
        store.data.updateIds = store.data.updateIds.slice(-200);
        store.save();
        res.json({ ok: true });
      } catch { fail(res, 503, "No se pudo entregar la respuesta."); }
      inFlight.delete(updateId);
      return;
    }
    const message = update.message as Record<string, unknown> | undefined;
    const chat = message?.chat as Record<string, unknown> | undefined;
    const from = message?.from as Record<string, unknown> | undefined;
    if (!message || chat?.type !== "private" || !from?.id || !chat?.id) { inFlight.delete(updateId); res.json({ ok: true }); return; }
    const actor = String(from.id);
    const text = String(message.text ?? message.caption ?? "").trim();
    let reply = "";
    try {
      let user = store.data.users.find((item) => item.telegramId === actor);
      const start = /^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]+))?$/i.exec(text);
      if (start?.[1]) {
        const invite = store.data.invitations.find((item) => item.hash === hash(start[1]) && item.expiresAt > Date.now());
        const site = store.data.sites.find((item) => item.id === invite?.siteId && item.status === "active");
        if (!invite || !site) { reply = "La invitación venció o ya fue utilizada. Pide un nuevo enlace al administrador."; }
        else {
          await requestSite(site, "hub-link", { telegram_id: actor, first_name: String(from.first_name ?? ""), permissions: invite.permissions }, `link-${updateId}`);
          if (!user) { user = { telegramId: actor, firstName: String(from.first_name ?? ""), memberships: [], activeSiteId: site.id }; store.data.users.push(user); }
          user.memberships = user.memberships.filter((item) => item.siteId !== site.id);
          user.memberships.push({ siteId: site.id, permissions: invite.permissions, active: true, linkedAt: new Date().toISOString() });
          user.activeSiteId = site.id;
          store.data.invitations = store.data.invitations.filter((item) => item !== invite);
          reply = `¡Listo! Quedaste vinculado con ${site.label}.\nPuedes ${invite.permissions.map((item) => permissionLabels[item]).filter(Boolean).join(", ")}.\n\nCuéntame qué necesitas actualizar. Te pediré confirmación antes de aplicar cambios.`;
        }
      } else if (!user || !user.memberships.some((item) => item.active && store.data.sites.some((site) => site.id === item.siteId && site.status === "active"))) {
        reply = "Este chat aún no está autorizado. Pide un enlace de invitación al administrador de tu web.";
      } else if (/^\/sitios(?:@\w+)?$/i.test(text)) {
        const sites = user.memberships.filter((item) => item.active).map((item) => store.data.sites.find((site) => site.id === item.siteId && site.status === "active")).filter((site): site is CommercialSite => Boolean(site));
        reply = sites.map((site, index) => `${index + 1}. ${site.label}`).join("\n") + "\nEscribe /sitio NÚMERO para elegir.";
      } else if (/^\/sitio\s+(\d+)$/i.test(text)) {
        const index = Number(/^\/sitio\s+(\d+)$/i.exec(text)?.[1]) - 1;
        const sites = user.memberships.filter((item) => item.active).map((item) => store.data.sites.find((site) => site.id === item.siteId && site.status === "active")).filter((site): site is CommercialSite => Boolean(site));
        if (sites[index]) { user.activeSiteId = sites[index].id; reply = `Listo, ahora trabajaremos con ${sites[index].label}.`; }
        else { reply = "No encontré esa web. Escribe /sitios para ver tus opciones."; }
      } else {
        const site = store.data.sites.find((item) => item.id === user?.activeSiteId && item.status === "active");
        if (!site) { reply = "Elige una web activa con /sitios."; }
        else {
          const result = await requestSite(site, "hub-message", { message, site_id: site.id }, `message-${updateId}`) as { reply?: string };
          reply = String(result.reply ?? "No pude responder ahora. Intenta de nuevo.");
        }
      }
      if (reply) {
        store.data.pendingReplies[String(updateId)] = { chatId: String(chat.id), text: reply };
        store.save();
        await telegram(botToken, "sendMessage", { chat_id: chat.id, text: reply });
        delete store.data.pendingReplies[String(updateId)];
      }
      store.data.updateIds.push(updateId);
      store.data.updateIds = store.data.updateIds.slice(-200);
      store.save();
      res.json({ ok: true });
    } catch { fail(res, 503, "No se pudo procesar el mensaje."); }
    finally { inFlight.delete(updateId); }
  });

  app.get("/admin/commercial", (req, res) => {
    if (!admin(req, res)) return;
    res.type("html").send(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Asistente comercial Criu</title>
<style>body{font:16px system-ui;max-width:960px;margin:40px auto;padding:0 20px;color:#192521}button{padding:9px 14px;margin:5px}article{border:1px solid #ccd5d0;border-radius:10px;padding:18px;margin:14px 0}code{overflow-wrap:anywhere}label{display:block;margin:5px 0}</style>
<h1>Webmaster IA</h1><p><a href="/admin#tab-webmaster">Volver a Webmaster IA en el panel MCP</a></p><p>Conexiones comerciales independientes del Bridge.</p>
<p>Instala el plugin en WordPress y pulsa «Registrar con Criu». La web aparecerá aquí; genera la invitación desde su tarjeta.</p><p id="bot"></p><button id="connect-bot">Activar bot compartido</button><div id="sites"></div><p id="notice"></p>
<script>
const labels=${JSON.stringify(permissionLabels)};
async function api(url,method='GET',body){const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.error||'Error');return data}
async function render(){const data=await api('/api/admin/connectors/commercial/sites');document.getElementById('bot').textContent=data.botConfigured?'Bot configurado en el servidor':'Falta configurar el bot en el servidor';const box=document.getElementById('sites');box.replaceChildren();for(const site of data.sites){const card=document.createElement('article');const title=document.createElement('h2');title.textContent=site.label;card.append(title);const detail=document.createElement('p');detail.textContent=site.url+' · '+site.status+' · '+site.users.length+' persona(s)';card.append(detail);for(const person of site.users){const row=document.createElement('p');row.textContent=person.firstName+' ('+person.telegramId+') · '+person.permissions.map(x=>labels[x]||x).join(', ');const revoke=document.createElement('button');revoke.textContent='Revocar';revoke.onclick=async()=>{try{await api('/api/admin/connectors/commercial/sites/'+encodeURIComponent(site.id)+'/users/'+encodeURIComponent(person.telegramId)+'/revoke','POST');await render()}catch(e){document.getElementById('notice').textContent=e.message}};row.append(' ',revoke);card.append(row)}if(site.status==='active'){const form=document.createElement('div');for(const [key,label] of Object.entries(labels)){const row=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.value=key;check.checked=key!=='product.delete_permanently';row.append(check,document.createTextNode(' '+label));form.append(row)}card.append(form);const button=document.createElement('button');button.textContent='Crear invitación (20 minutos)';button.onclick=async()=>{try{const granted=[...form.querySelectorAll('input:checked')].map(x=>x.value);const result=await api('/api/admin/connectors/commercial/sites/'+encodeURIComponent(site.id)+'/invitations','POST',{permissions:granted});const link=document.createElement('a');link.href=result.url;link.textContent=result.url;link.target='_blank';const output=document.createElement('p');output.append('Enlace de un solo uso: ',link);card.append(output)}catch(e){document.getElementById('notice').textContent=e.message}};card.append(button)}box.append(card)}}
render().catch(e=>document.getElementById('notice').textContent=e.message);
document.getElementById('connect-bot').onclick=async()=>{try{const data=await api('/api/admin/connectors/commercial/connect-bot','POST');document.getElementById('notice').textContent='Bot conectado al panel Criu: '+data.url}catch(e){document.getElementById('notice').textContent=e.message}};
</script></html>`);
  });
}
