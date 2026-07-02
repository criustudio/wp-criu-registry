import { createHmac } from "node:crypto";
import type { Request, Response } from "express";

export const adminCookieName = "mcp_hub_admin";

function sign(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createAdminSessionValue(secret: string, ttlMs = 1000 * 60 * 60 * 24 * 14): string {
  const expiresAt = String(Date.now() + ttlMs);
  return `${expiresAt}.${sign(secret, expiresAt)}`;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {};
  }

  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = part.slice(0, separatorIndex);
      const value = decodeURIComponent(part.slice(separatorIndex + 1));
      accumulator[key] = value;
      return accumulator;
    }, {});
}

export function isAdminSessionValid(secret: string, rawValue: string | undefined): boolean {
  if (!rawValue) {
    return false;
  }

  const [expiresAt, signature] = rawValue.split(".");
  if (!expiresAt || !signature) {
    return false;
  }

  if (!/^\d+$/.test(expiresAt)) {
    return false;
  }

  if (Number(expiresAt) < Date.now()) {
    return false;
  }

  return sign(secret, expiresAt) === signature;
}

function buildCookie(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function setAdminSessionCookie(res: Response, secret: string): void {
  const value = createAdminSessionValue(secret);
  res.setHeader("Set-Cookie", buildCookie(adminCookieName, value, 60 * 60 * 24 * 14));
}

export function clearAdminSessionCookie(res: Response): void {
  res.setHeader("Set-Cookie", buildCookie(adminCookieName, "", 0));
}

export function hasAdminSession(req: Request, secret: string): boolean {
  const cookies = parseCookies(req.headers.cookie);
  return isAdminSessionValid(secret, cookies[adminCookieName]);
}
