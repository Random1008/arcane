import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

/**
 * Comptes joueurs : inscription + connexion uniquement (aucun rôle, aucune console).
 * Version publique du serveur — la gestion/la modération vivent dans le dépôt dédié.
 */

export interface Account {
  username: string;
  passHash: string;
}

/** Abstraction du hachage (injectable pour des tests rapides sans bcrypt). */
export interface Hasher {
  hash(p: string): string;
  compare(p: string, h: string): boolean;
}

export const bcryptHasher: Hasher = {
  hash: (p) => bcrypt.hashSync(p, 10),
  compare: (p, h) => bcrypt.compareSync(p, h),
};

export interface MutResult {
  ok: boolean;
  accounts?: Account[];
  error?: string;
}

export function verifyLogin(accts: Account[], user: string, pass: string, hasher: Hasher): Account | null {
  const a = accts.find((x) => x.username === user);
  return a && hasher.compare(pass, a.passHash) ? a : null;
}

/** Identifiant contraint à [a-z0-9_-] (1..32) → le nom de fichier de save dérivé est 1:1 (pas de collision). */
export const USERNAME_RE = /^[a-z0-9_-]{1,32}$/;

export function createAccount(accts: Account[], user: string, pass: string, hasher: Hasher): MutResult {
  if (!user || !pass) return { ok: false, error: "identifiant et mot de passe requis" };
  if (!USERNAME_RE.test(user)) return { ok: false, error: "identifiant : 1 à 32 caractères, a-z 0-9 _ - (minuscules)" };
  if (accts.some((a) => a.username === user)) return { ok: false, error: "compte déjà existant" };
  return { ok: true, accounts: [...accts, { username: user, passHash: hasher.hash(pass) }] };
}

// — Persistance (hors logique pure) —
export function loadAccountsFile(file: string): Account[] {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Account[];
  } catch {
    return [];
  }
}

export function saveAccountsFile(file: string, accts: Account[]): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(accts, null, 2));
}
