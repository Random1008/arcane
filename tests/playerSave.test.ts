import { describe, it, expect } from "vitest";
import os from "node:os";
import path from "node:path";
import { safeName, writeSave, loadSave, listSaves } from "../server/saves";
import { createAccount, Hasher, USERNAME_RE } from "../server/accounts";
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

describe("comptes joueurs", () => {
  it("createAccount enregistre un joueur", () => {
    const a = createAccount([], "joueur", "pw", fake);
    expect(a.ok).toBe(true);
    expect(a.accounts!.find((x) => x.username === "joueur")?.username).toBe("joueur");
  });

  it("createAccount refuse un doublon", () => {
    const base = createAccount([], "bob", "pw", fake).accounts!;
    expect(createAccount(base, "bob", "pw2", fake).ok).toBe(false);
  });

  it("createAccount n'accepte que des identifiants [a-z0-9_-] (mapping save 1:1, anti-collision)", () => {
    const base = createAccount([], "alice", "pw", fake).accounts!;
    expect(createAccount(base, "Bob", "pw", fake).ok).toBe(false); // majuscule
    expect(createAccount(base, "a.b", "pw", fake).ok).toBe(false); // point
    expect(createAccount(base, "héros", "pw", fake).ok).toBe(false); // accent
    expect(USERNAME_RE.test("")).toBe(false);
    expect(USERNAME_RE.test("a".repeat(33))).toBe(false);
    const ok = createAccount(base, "bob_1", "pw", fake);
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
