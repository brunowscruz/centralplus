import bcrypt from "bcryptjs";

/**
 * Hash de senha (seção 8 do spec: nunca texto puro). bcryptjs é pure-JS —
 * sem binding nativo, roda igual em dev e na VPS sem passo de build extra.
 */
const ROUNDS = 10;

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}
