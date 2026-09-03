import { describe, it, expect } from "vitest";
import os from "node:os";
import path from "node:path";
import { safeName, writeSave, loadSave, listSaves } from "../server/saves";
import { seedAccounts, createAccount, setRole, setBanned, addSanction, isValidRole, Hasher } from "../server/accounts";
import { validateEvent } from "../src/core/adminProtocol";
import { resetSession, serialize, hydrate, getPlayer, isCleared, getNexusBest, markCleared, markNexusBest, SaveData } from "../src/game/session";

const fake: Hasher = { hash: (p) => "#" + p, compare: (p, h) => h === "#" + p };

describe("sauvegardes serveur", () => {
  it("safeName neutralise les caractères dangereux (anti path-traversal)", () => {
    expect(safeName("../../etc/passwd")).not.toContain("/");
    expect(safeName("../../etc/passwd")).not.toContain(".");
    expect(safeName("Alice")).toBe("alice");
    expect(safeName("")).toBe("_");
  });

  it("écrit puis relit la sauvegarde d'un compte", () => {
    const dir = path.join(os.tmpdir(), `sp-saves-${process.pid}`);
    expect(loadSave(dir, "neuf")).toBe(null);
    writeSave(dir, "alice", { gold: 42 });
    expect(loadSave(dir, "alice")).toEqual({ gold: 42 });
  });

  it("listSaves résume les sauvegardes (or/niveau)", () => {
    const dir = path.join(os.tmpdir(), `sp-saves-list-${process.pid}`);
    writeSave(dir, "alice", { player: { gold: 100, level: 5 } });
    writeSave(dir, "bob", { player: { gold: 30, level: 2 } });
    const list = listSaves(dir);
    expect(list.length).toBe(2);
    expect(list.find((s) => s.user === "alice")?.gold).toBe(100);
    expect(list.find((s) => s.user === "bob")?.level).toBe(2);
  });
});

describe("modération / rôles", () => {
  it("isValidRole", () => {
    expect(isValidRole("admin")).toBe(true);
    expect(isValidRole("player")).toBe(true);
    expect(isValidRole("root")).toBe(false);
  });

  it("setRole : change un rôle, refuse de rétrograder le dernier admin", () => {
    let a = seedAccounts([], fake); // contient 1 admin
    a = createAccount(a, "bob", "pw", "player", fake).accounts!;
    expect(setRole(a, "bob", "operator").accounts!.find((x) => x.username === "bob")?.role).toBe("operator");
    expect(setRole(a, "admin", "player").ok).toBe(false); // dernier admin protégé
    expect(setRole(a, "inconnu", "player").ok).toBe(false);
  });

  it("setBanned : bannit un joueur (+ sanction), refuse de bannir un admin", () => {
    let a = seedAccounts([], fake);
    a = createAccount(a, "bob", "pw", "player", fake).accounts!;
    const r = setBanned(a, "bob", true, "admin", "triche", 1000);
    expect(r.ok).toBe(true);
    const bob = r.accounts!.find((x) => x.username === "bob")!;
    expect(bob.banned).toBe(true);
    expect(bob.sanctions?.[0]).toMatchObject({ type: "ban", reason: "triche" });
    expect(setBanned(a, "admin", true, "admin", "", 1000).ok).toBe(false); // pas de ban d'admin
  });

  it("setRole vers admin lève le ban (jamais d'admin banni)", () => {
    let a = seedAccounts([], fake);
    a = createAccount(a, "bob", "pw", "player", fake).accounts!;
    a = setBanned(a, "bob", true, "admin", "", 1).accounts!;
    const promoted = setRole(a, "bob", "admin").accounts!.find((x) => x.username === "bob")!;
    expect(promoted.role).toBe("admin");
    expect(promoted.banned).toBe(false);
  });

  it("addSanction : ajoute à l'historique, préserve l'existant, no-op si compte absent", () => {
    let a = seedAccounts([], fake);
    a = createAccount(a, "bob", "pw", "player", fake).accounts!;
    a = setBanned(a, "bob", true, "admin", "x", 1).accounts!;
    a = addSanction(a, "bob", { type: "warn", by: "admin", reason: "spam", at: 2 });
    const bob = a.find((x) => x.username === "bob")!;
    expect(bob.sanctions?.length).toBe(2);
    expect(bob.sanctions?.[1]).toMatchObject({ type: "warn", reason: "spam" });
    expect(addSanction(a, "fantome", { type: "kick", by: "admin", reason: "", at: 3 })).toEqual(a); // no-op
  });
});

describe("protocole événements", () => {
  it("validateEvent accepte {type,msg}, rejette le reste, tronque", () => {
    expect(validateEvent({ type: "zone", msg: "entré : Plaines" })).toEqual({ type: "zone", msg: "entré : Plaines" });
    expect(validateEvent({ type: "x" })).toBe(null);
    expect(validateEvent({ msg: "y" })).toBe(null);
    expect(validateEvent(null)).toBe(null);
    expect(validateEvent({ type: "t", msg: "a".repeat(500) })!.msg.length).toBe(300);
  });
});

describe("comptes joueurs", () => {
  it("createAccount accepte le rôle player", () => {
    const a = createAccount(seedAccounts([], fake), "joueur", "pw", "player", fake);
    expect(a.ok).toBe(true);
    expect(a.accounts!.find((x) => x.username === "joueur")?.role).toBe("player");
  });

  it("createAccount n'accepte que des identifiants [a-z0-9_-] (mapping save 1:1, anti-collision)", () => {
    const base = seedAccounts([], fake);
    expect(createAccount(base, "Bob", "pw", "player", fake).ok).toBe(false); // majuscule
    expect(createAccount(base, "a.b", "pw", "player", fake).ok).toBe(false); // point
    expect(createAccount(base, "héros", "pw", "player", fake).ok).toBe(false); // accent
    const ok = createAccount(base, "bob_1", "pw", "player", fake);
    expect(ok.ok).toBe(true);
    expect(safeName("bob_1")).toBe("bob_1"); // identifiant valide → nom de fichier identique
  });
});

describe("session serialize/hydrate", () => {
  it("round-trip (via JSON) conserve la progression", () => {
    resetSession();
    const p = getPlayer();
    p.gold = 500;
    p.level = 4;
    markCleared("volcano");
    markNexusBest(3);
    const data = JSON.parse(JSON.stringify(serialize())) as SaveData;
    resetSession();
    expect(getPlayer().gold).toBe(0); // état neuf
    expect(hydrate(data)).toBe(true);
    expect(getPlayer().gold).toBe(500);
    expect(getPlayer().level).toBe(4);
    expect(isCleared("volcano")).toBe(true);
    expect(getNexusBest()).toBe(3);
  });

  it("version inconnue ou données absentes → refuse (état neuf conservé)", () => {
    resetSession();
    expect(hydrate({ v: 99 } as unknown as SaveData)).toBe(false);
    expect(hydrate(null)).toBe(false);
  });

  it("save partielle → champs imbriqués manquants complétés par les défauts (pas de NaN)", () => {
    resetSession();
    const partial = { v: 1, player: { gold: 5 }, cleared: [], identified: [], nexusBest: 0 } as unknown as SaveData;
    expect(hydrate(partial)).toBe(true);
    const p = getPlayer();
    expect(p.gold).toBe(5);
    expect(p.stats).toBeDefined();
    expect(Number.isFinite(p.health.maxHp)).toBe(true); // pas de NaN via fusion profonde
    expect(p.hotbar.slots.length).toBeGreaterThan(0);
  });
});
