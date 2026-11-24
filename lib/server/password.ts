import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    if (stored.startsWith("scrypt$")) {
      const [, salt, hex] = stored.split("$");
      const expected = Buffer.from(hex, "hex");
      const actual = await scrypt(password, salt, expected.length);
      return expected.length === actual.length && timingSafeEqual(expected, actual);
    }
    // Compatibilité avec d'éventuels anciens mots de passe en clair.
    return password === stored;
  } catch {
    return false;
  }
}
