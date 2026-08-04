import { redirect } from "next/navigation";
import { getSession, Session } from "./auth";
import { tenantExists } from "./tenants";
import { sanitizeSlug } from "./bos";

/** Garante sessão de owner; caso contrário manda pro login. */
export async function requireOwner(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "owner") redirect(`/c/${s.slug}`);
  return s;
}

/**
 * Garante acesso ao workspace de um cliente:
 *  - owner: acessa qualquer cliente existente (impersonate)
 *  - client: acessa apenas o próprio slug
 * Retorna a sessão e o slug saneado.
 */
export async function requireWorkspace(
  rawSlug: string,
): Promise<{ session: Session; slug: string }> {
  const s = await getSession();
  if (!s) redirect("/login");
  const slug = sanitizeSlug(rawSlug);
  if (s.role === "client" && s.slug !== slug) {
    redirect(`/c/${s.slug}`);
  }
  if (!tenantExists(slug)) {
    redirect(s.role === "owner" ? "/console" : "/login");
  }
  return { session: s, slug };
}
