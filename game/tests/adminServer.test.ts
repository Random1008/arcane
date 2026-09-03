import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../server/token";
import { seedAccounts, verifyLogin, createAccount, deleteAccount, Hasher } from "../server/accounts";
import { validateCommand, validateState } from "../src/core/adminProtocol";

// Hasher factice (rapide, déterministe) pour ne pas dépendre de bcrypt dans les tests.
const fake: Hasher = { hash: (p) => "#" + p, compare: (p, h) => h === "#" + p };

describe("admin server", () => {
  it("token : round-trip sign→verify + rejets (secret, expiration, falsification)", () => {
    const t = signToken({ user: "admin", role: "admin" }, "s", 1000, 3600);
    expect(verifyToken(t, "s", 1000)?.user).toBe("admin");
    expect(verifyToken(t, "s", 1000)?.role).toBe("admin");
    expect(verifyToken(t, "autre-secret", 1000)).toBe(null);
    expect(verifyToken(t, "s", 1000 + 4000)).toBe(null); // expiré
    expect(verifyToken(t + "x", "s", 1000)).toBe(null); // signature falsifiée
    expect(verifyToken("nimporte.quoi", "s", 1000)).toBe(null);
  });

  it("comptes : seed admin/admin1234 + verifyLogin", () => {
    const a = seedAccounts([], fake);
    expect(a.find((x) => x.username === "admin")?.role).toBe("admin");
    expect(verifyLogin(a, "admin", "admin1234", fake)?.username).toBe("admin");
    expect(verifyLogin(a, "admin", "mauvais", fake)).toBe(null);
    expect(seedAccounts(a, fake).length).toBe(a.length); // pas de double seed
  });

  it("comptes : création + suppression (dernier admin protégé)", () => {
    let a = seedAccounts([], fake);
    const c = createAccount(a, "bob", "pw", "operator", fake);
    expect(c.ok).toBe(true);
    a = c.accounts!;
    expect(verifyLogin(a, "bob", "pw", fake)?.role).toBe("operator");
    expect(createAccount(a, "bob", "x", "operator", fake).ok).toBe(false); // doublon
    expect(deleteAccount(a, "admin").ok).toBe(false); // dernier admin protégé
    const d = deleteAccount(a, "bob");
    expect(d.ok).toBe(true);
    expect(d.accounts!.some((x) => x.username === "bob")).toBe(false);
  });

  it("protocole : validateCommand accepte le valide, rejette l'invalide", () => {
    expect(validateCommand({ cat: "player", action: "giveGold", value: 100 })).toEqual({ cat: "player", action: "giveGold", value: 100 });
    expect(validateCommand({ cat: "player", action: "heal" })).toEqual({ cat: "player", action: "heal" });
    expect(validateCommand({ cat: "combat", action: "spawnEnemies", value: 5 })?.cat).toBe("combat");
    expect(validateCommand({ cat: "tuning", key: "move.maxSpeed", value: 300 })?.cat).toBe("tuning");
    expect(validateCommand({ cat: "flag", key: "godMode", value: true })?.cat).toBe("flag");
    expect(validateCommand({ cat: "balance", key: "dropChance", value: 0.5 })?.cat).toBe("balance");
    expect(validateCommand({ cat: "player", action: "giveGold" })).toBe(null); // value manquante
    expect(validateCommand({ cat: "player", action: "giveGold", value: "x" })).toBe(null);
    expect(validateCommand({ cat: "inconnu" })).toBe(null);
    expect(validateCommand(null)).toBe(null);
  });

  it("protocole : rejette les valeurs hors référentiel (anti-crash du jeu)", () => {
    expect(validateCommand({ cat: "player", action: "giveWeapon", defId: "sword", tier: "S" })).toMatchObject({ action: "giveWeapon" });
    expect(validateCommand({ cat: "player", action: "giveWeapon", defId: "inconnue", tier: "F" })).toBe(null);
    expect(validateCommand({ cat: "player", action: "giveWeapon", defId: "sword", tier: "Z" })).toBe(null);
    expect(validateCommand({ cat: "player", action: "giveArmorSet", set: "chaos" })).toMatchObject({ action: "giveArmorSet" });
    expect(validateCommand({ cat: "player", action: "giveArmorSet", set: "bidon" })).toBe(null);
    expect(validateCommand({ cat: "player", action: "setClass", classId: "guerrier" })).toMatchObject({ action: "setClass" });
    expect(validateCommand({ cat: "player", action: "setClass", classId: "bogus" })).toBe(null);
    expect(validateCommand({ cat: "flag", key: "godMode", value: true })?.cat).toBe("flag");
    expect(validateCommand({ cat: "flag", key: "inconnu", value: true })).toBe(null);
    expect(validateCommand({ cat: "balance", key: "dropChance", value: 0.5 })?.cat).toBe("balance");
    expect(validateCommand({ cat: "balance", key: "inconnu", value: 1 })).toBe(null);
  });

  it("protocole : validateState accepte un snapshot complet, rejette l'incomplet", () => {
    const ok = { gold: 1, level: 2, xp: 0, className: null, hp: 10, maxHp: 10, statPoints: 0, skillPoints: 0, omganium: 0, biome: "x", nexus: false, godMode: false };
    expect(validateState(ok)?.gold).toBe(1);
    expect(validateState({ ...ok, gold: "x" })).toBe(null);
    expect(validateState({ ...ok, biome: 5 })).toBe(null);
    expect(validateState(null)).toBe(null);
  });
});
