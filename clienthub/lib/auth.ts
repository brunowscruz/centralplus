import crypto from "node:crypto";
import { cookies } from "next/headers";
import { readConfig, writeConfig } from "./tenants";
import { hashPassword, verifyPassword } from "./password";

/**
 * Sessão leve assinada por HMAC — suficiente para o estágio atual (solo
 * operador, poucos clientes). Senha do cliente já é hash (bcrypt, ver
 * lib/password.ts); para produção com mais escala, trocar por store de
 * sessão real (Redis/DB) em vez de cookie assinado.
 */
export type Role = "owner" | "client";

export interface Session {
  role: Role;
  slug?: string; // presente quando role=client, ou quando owner faz impersonate
  email?: string;
  exp: number; // epoch ms
}

const COOKIE = "ch_session";
const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12h

function secret(): string {
  return process.env.SESSION_SECRET || "insecure-dev-secret";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSession(s: Session): string {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  // timing-safe compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
    if (!s.exp || s.exp < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(COOKIE)?.value);
}

export async function setSession(s: Session): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encodeSession(s), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(MAX_AGE_MS / 1000),
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export function newExp(): number {
  return Date.now() + MAX_AGE_MS;
}

// ---- credential checks -----------------------------------------------------

export function verifyOwner(email: string, password: string): boolean {
  const oe = process.env.OWNER_EMAIL || "admin@agencia.com";
  const op = process.env.OWNER_PASSWORD || "owner123";
  return (
    safeEqual(email.trim().toLowerCase(), oe.toLowerCase()) &&
    safeEqual(password, op)
  );
}

/**
 * Login de cliente contra `clientes/<slug>/config.json` -> acesso.{login,senha_hash}.
 * Clientes provisionados antes do hash (acesso.senha em texto puro) ainda
 * conseguem entrar — a primeira vez que a senha bate, o config.json é
 * regravado só com o hash (migração silenciosa, sem quebrar acesso existente).
 */
export function verifyClient(
  login: string,
  password: string,
): { slug: string } | null {
  // login pode ser o slug ou o campo acesso.login
  const l = login.trim().toLowerCase();
  try {
    const direct = readConfig(l);
    if (matchesClient(direct, l, password)) return { slug: direct.slug };
  } catch {
    /* ignore */
  }
  return null;
}

function matchesClient(
  cfg: ReturnType<typeof readConfig>,
  login: string,
  password: string,
): boolean {
  const acesso = cfg.acesso;
  if (!acesso) return false;
  const loginOk =
    safeEqual(login, cfg.slug) ||
    (acesso.login ? safeEqual(login, acesso.login.toLowerCase()) : false);
  if (!loginOk) return false;

  if (acesso.senha_hash) {
    return verifyPassword(password, acesso.senha_hash);
  }
  if (acesso.senha) {
    const ok = safeEqual(password, acesso.senha);
    if (ok) migrateToHash(cfg.slug, cfg, password);
    return ok;
  }
  return false;
}

/** Regrava o config.json trocando senha em texto puro pelo hash bcrypt. */
function migrateToHash(
  slug: string,
  cfg: ReturnType<typeof readConfig>,
  password: string,
): void {
  try {
    writeConfig(slug, {
      ...cfg,
      acesso: { login: cfg.acesso?.login, senha_hash: hashPassword(password) },
    });
  } catch {
    /* não bloqueia o login se a migração falhar por algum motivo de I/O */
  }
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
