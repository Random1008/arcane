import { describe, it, expect } from "vitest";
import {
  pushChat,
  getChatMessages,
  resetSession,
  isIdentified,
  markIdentified,
  isUnlocked,
  markCleared,
  hasClearedRank,
  isNexusUnlocked,
  getNexusBest,
  markNexusBest,
  playerShopTier,
  getShop,
  unlockEverything,
  identifyAll,
  getPlayer,
  serialize,
  hydrate,
} from "../src/game/session";
import { BIOMES } from "../src/core/biomes";
import { tickWorld, createWorld, InputState } from "../src/core/world";
import { startMelee } from "../src/core/combat/melee";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

describe("session", () => {
  it("chat : ajoute des messages et plafonne à 50", () => {
    resetSession();
    pushChat("salut");
    expect(getChatMessages()).toContain("salut");
    for (let i = 0; i < 60; i++) pushChat("m" + i);
    expect(getChatMessages().length).toBeLessThanOrEqual(50);
    expect(getChatMessages()).not.toContain("salut"); // évincé par le plafond
  });

  it("identification : sanctuaire d'office, autres après markIdentified", () => {
    resetSession();
    expect(isIdentified("spawn")).toBe(true);
    expect(isIdentified("plains")).toBe(false);
    markIdentified("plains");
    expect(isIdentified("plains")).toBe(true);
  });

  it("déverrouillage : rang F après le Sanctuaire ; rang E après TOUT le rang F", () => {
    resetSession();
    expect(isUnlocked("plains")).toBe(false); // Sanctuaire pas encore visité → F verrouillé
    markCleared("spawn"); // visiter le Sanctuaire
    expect(isUnlocked("plains")).toBe(true); // rang F ouvert
    expect(isUnlocked("swamp")).toBe(false);
    markCleared("plains"); // un seul F → pas suffisant
    expect(isUnlocked("swamp")).toBe(false);
    for (const id of ["forest", "cave", "river"]) markCleared(id); // tous les F
    expect(isUnlocked("swamp")).toBe(true);
  });

  it("hasClearedRank : faux au départ, vrai après nettoyage d'un biome de ce rang", () => {
    resetSession();
    expect(hasClearedRank("S")).toBe(false);
    markCleared("trone_dieu_endormi"); // biome de rang S
    expect(hasClearedRank("S")).toBe(true);
  });

  it("Admin : unlockEverything ouvre la carte + le Nexus + le rang S ; identifyAll révèle", () => {
    resetSession();
    expect(isNexusUnlocked()).toBe(false);
    identifyAll();
    expect(isIdentified("volcano")).toBe(true); // carte révélée sans tout nettoyer
    expect(isNexusUnlocked()).toBe(false); // identifier ≠ nettoyer
    unlockEverything();
    expect(isUnlocked("volcano")).toBe(true); // biome de rang B accessible
    expect(hasClearedRank("S")).toBe(true);
    expect(isNexusUnlocked()).toBe(true);
  });

  it("Économie : playerShopTier = rang max nettoyé ; getShop reroll quand le tier change", () => {
    resetSession();
    expect(playerShopTier()).toBe("F");
    expect(getShop().fixed[0].tier).toBe("F"); // boutique au tier F
    markCleared("trone_dieu_endormi"); // biome rang S
    expect(playerShopTier()).toBe("S");
    expect(getShop().fixed[0].tier).toBe("S"); // cache invalidé → boutique rerollée au tier S
  });

  it("hydrate : une sauvegarde passée en JSON reconstruit melee.hitIds en Set (attaque sans crash)", () => {
    resetSession();
    // simule une sauvegarde réelle : sérialisée puis ré-encodée en JSON (le Set hitIds devient {})
    const roundTripped = JSON.parse(JSON.stringify(serialize()));
    expect(roundTripped.player.melee.hitIds).toEqual({}); // un Set sérialisé en JSON = objet vide
    expect(hydrate(roundTripped)).toBe(true);
    const p = getPlayer();
    expect(p.melee.hitIds instanceof Set).toBe(true);
    // startMelee appelle hitIds.clear() : ne doit pas planter
    expect(() => startMelee(p.melee, v(1, 0), { damage: 5, range: 40, arcDeg: 80, windup: 0.06, active: 0.08, recovery: 0.12, cadence: 0.4, knockback: 70 })).not.toThrow();
  });

  it("hydrate + tickWorld : attaquer avec le joueur rechargé ne lève pas d'exception", () => {
    resetSession();
    hydrate(JSON.parse(JSON.stringify(serialize())));
    const w = createWorld();
    w.player = getPlayer(); // exerce le vrai joueur rechargé (melee.hitIds doit être un Set)
    const attack: InputState = { moveDir: v(0, 0), aimPoint: v(w.player.transform.pos.x + 50, w.player.transform.pos.y), attack: true, dash: false, blink: false, selectSlot: -1, scroll: 0, cycleTier: false, ability: -1 };
    expect(() => { for (let i = 0; i < 10; i++) tickWorld(w, attack, DEFAULT_TUNING, 1 / 60); }).not.toThrow();
  });

  it("Nexus : record = max atteint ; débloqué quand l'anneau S est entièrement nettoyé", () => {
    resetSession();
    expect(isNexusUnlocked()).toBe(false);
    expect(getNexusBest()).toBe(0);
    markNexusBest(5);
    markNexusBest(3);
    expect(getNexusBest()).toBe(5); // garde le maximum
    const sBiomes = BIOMES.filter((b) => b.tier === "S");
    for (const b of sBiomes.slice(0, -1)) markCleared(b.id);
    expect(isNexusUnlocked()).toBe(false); // il reste un biome S (celui du boss)
    markCleared(sBiomes[sBiomes.length - 1].id); // boss S vaincu (dernier biome de l'anneau)
    expect(isNexusUnlocked()).toBe(true);
  });
});
