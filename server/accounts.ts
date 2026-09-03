import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

export type Role = "admin" | "operator" | "player";
const ROLES: Role[] = ["admin", "operator", "player"];

export interface Sanction {
  type: "ban" | "unban" | "warn" | "kick";
  by: string;
  reason: string;
  at: number; // ms epoch
}

export interface Account {
  username: string;
  passHash: string;
  role: Role;
  banned?: boolean;
  sanctions?: Sanction[];
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

/** Ajoute le compte admin par défaut (admin / admin1234) s'il n'y a aucun admin. */
export function seedAccounts(accts: Account[], hasher: Hasher): Account[] {
  if (accts.some((a) => a.role === "admin")) return accts;
  return [...accts, { username: "admin", passHash: hasher.hash("admin1234"), role: "admin" }];
}

export function verifyLogin(accts: Account[], user: string, pass: string, hasher: Hasher): Account | null {
  const a = accts.find((x) => x.username === user);
  return a && hasher.compare(pass, a.passHash) ? a : null;
}

/** Identifiant contraint à [a-z0-9_-] (1..32) → le nom de fichier de save dérivé est 1:1 (pas de collision). */
export const USERNAME_RE = /^[a-z0-9_-]{1,32}$/;

export function createAccount(accts: Account[], user: string, pass: string, role: Role, hasher: Hasher): MutResult {
  if (!user || !pass) return { ok: false, error: "identifiant et mot de passe requis" };
  if (!USERNAME_RE.test(user)) return { ok: false, error: "identifiant : 1 à 32 caractères, a-z 0-9 _ - (minuscules)" };
  if (accts.some((a) => a.username === user)) return { ok: false, error: "compte déjà existant" };
  const r: Role = ROLES.includes(role) ? role : "player";
  return { ok: true, accounts: [...accts, { username: user, passHash: hasher.hash(pass), role: r }] };
}

export function isValidRole(r: string): r is Role {
  return ROLES.includes(r as Role);
}

/** Change le rôle d'un compte (refuse de rétrograder le dernier admin). */
export function setRole(accts: Account[], user: string, role: Role): MutResult {
  const a = accts.find((x) => x.username === user);
  if (!a) return { ok: false, error: "compte introuvable" };
  if (a.role === "admin" && role !== "admin" && accts.filter((x) => x.role === "admin").length <= 1) {
    return { ok: false, error: "impossible de rétrograder le dernier admin" };
  }
  // un admin n'est jamais banni (invariant partagé avec setBanned) → on lève le ban en promouvant admin
  return { ok: true, accounts: accts.map((x) => (x.username === user ? { ...x, role, banned: role === "admin" ? false : x.banned } : x)) };
}

/** Bannit / débannit un compte (on ne bannit pas un admin). Ajoute une entrée à l'historique. */
export function setBanned(accts: Account[], user: string, banned: boolean, by: string, reason: string, at: number): MutResult {
  const a = accts.find((x) => x.username === user);
  if (!a) return { ok: false, error: "compte introuvable" };
  if (banned && a.role === "admin") return { ok: false, error: "impossible de bannir un admin" };
  const s: Sanction = { type: banned ? "ban" : "unban", by, reason, at };
  return { ok: true, accounts: accts.map((x) => (x.username === user ? { ...x, banned, sanctions: [...(x.sanctions ?? []), s] } : x)) };
}

/** Ajoute une sanction non bloquante (warn/kick) à l'historique. */
export function addSanction(accts: Account[], user: string, s: Sanction): Account[] {
  return accts.map((x) => (x.username === user ? { ...x, sanctions: [...(x.sanctions ?? []), s] } : x));
}

export function deleteAccount(accts: Account[], user: string): MutResult {
  const target = accts.find((a) => a.username === user);
  if (!target) return { ok: false, error: "compte introuvable" };
  if (target.role === "admin" && accts.filter((a) => a.role === "admin").length <= 1) {
    return { ok: false, error: "impossible de supprimer le dernier admin" };
  }
  return { ok: true, accounts: accts.filter((a) => a.username !== user) };
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
