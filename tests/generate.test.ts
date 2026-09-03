import { describe, it, expect } from "vitest";
import { generateBiomeWorld } from "../src/core/generate";
import { getBiome, TIER_SCALING } from "../src/core/biomes";
import { npcsForBiome } from "../src/core/npcs";
import { enemyTypesForBiome } from "../src/core/biomeEnemies";
import { createPlayer } from "../src/core/world";
import { canOccupy } from "../src/core/collision";
import { distance } from "../src/core/math/vec2";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("generate", () => {
  it("déterministe : même seed → même zone", () => {
    const a = generateBiomeWorld(createPlayer(), getBiome("plains"), lcg(42));
    const b = generateBiomeWorld(createPlayer(), getBiome("plains"), lcg(42));
    expect(JSON.stringify(a.level.walls)).toBe(JSON.stringify(b.level.walls));
    expect(a.enemies.map((e) => [e.transform.pos.x, e.transform.pos.y])).toEqual(
      b.enemies.map((e) => [e.transform.pos.x, e.transform.pos.y]),
    );
  });
  it("nombre d'ennemis = scaling du tier", () => {
    const w = generateBiomeWorld(createPlayer(), getBiome("plains"), lcg(1));
    expect(w.enemies.length).toBe(TIER_SCALING.F.count);
  });
  it("le sanctuaire de départ n'a aucun ennemi", () => {
    const w = generateBiomeWorld(createPlayer(), getBiome("spawn"), lcg(1));
    expect(w.enemies.length).toBe(0);
  });
  it("instancie les PNJ du biome (hub au sanctuaire), non encore parlés", () => {
    const w = generateBiomeWorld(createPlayer(), getBiome("forest"), lcg(2));
    expect(w.npcs.length).toBe(npcsForBiome("forest").length);
    expect(w.npcs.every((n) => n.talked === false)).toBe(true);
    const spawn = generateBiomeWorld(createPlayer(), getBiome("spawn"), lcg(2));
    expect(spawn.npcs.length).toBe(15); // PNJ de hub
  });
  it("les ennemis générés ont des archétypes issus du set du biome + un skin 1..5", () => {
    const w = generateBiomeWorld(createPlayer(), getBiome("forest"), lcg(4));
    const allowed = new Set(enemyTypesForBiome("forest").map((e) => e.archetype));
    expect(w.enemies.length).toBeGreaterThan(0);
    for (const e of w.enemies) {
      expect(allowed.has(e.archetype)).toBe(true);
      expect(e.skin).toBeGreaterThanOrEqual(1);
      expect(e.skin).toBeLessThanOrEqual(5);
    }
  });
  it("≥1 sortie, marqueurs de donjon = biome.dungeons", () => {
    const biome = getBiome("ruins"); // 3 donjons
    const w = generateBiomeWorld(createPlayer(), biome, lcg(7));
    expect(w.exits.length).toBeGreaterThanOrEqual(1);
    expect(w.dungeonEntrances.length).toBe(biome.dungeons);
  });
  it("des armes sont posées au sol (2 à 3), au tier du biome", () => {
    const w = generateBiomeWorld(createPlayer(), getBiome("void_rift"), lcg(9));
    expect(w.pickups.length).toBeGreaterThanOrEqual(2);
    expect(w.pickups.length).toBeLessThanOrEqual(3);
    for (const pk of w.pickups) expect(pk.tier).toBe("S");
  });

  it("aucune entité ne recouvre la sortie (sur 30 seeds)", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const w = generateBiomeWorld(createPlayer(), getBiome("ruins"), lcg(seed));
      const exit = w.exits[0];
      const ents = [
        ...w.enemies.map((e) => ({ pos: e.transform.pos, r: e.radius })),
        ...w.pickups.map((p) => ({ pos: p.pos, r: p.radius })),
        ...w.npcs.map((n) => ({ pos: n.pos, r: n.radius })),
        ...w.dungeonEntrances.map((d) => ({ pos: d.pos, r: d.radius })),
      ];
      for (const e of ents) {
        expect(distance(e.pos, exit.pos)).toBeGreaterThanOrEqual(e.r + exit.radius);
      }
    }
  });

  it("le Sanctuaire place les 14 PNJ de hub avec un rôle ; un biome normal n'a pas de rôle", () => {
    const hub = generateBiomeWorld(createPlayer(), getBiome("spawn"), lcg(1));
    expect(hub.npcs.length).toBe(15);
    expect(hub.npcs.every((n) => !!n.role)).toBe(true);
    const normal = generateBiomeWorld(createPlayer(), getBiome("plains"), lcg(1));
    expect(normal.npcs.every((n) => !n.role)).toBe(true);
  });

  it("finalBoss=true → boss du rang et aucun ennemi régulier ; sinon pas de boss (même un ex-biome-boss)", () => {
    const bossW = generateBiomeWorld(createPlayer(), getBiome("plains"), lcg(1), true); // dernier biome de l'anneau
    expect(bossW.boss).not.toBe(null);
    expect(bossW.boss!.tier).toBe("F"); // boss du rang du biome
    expect(bossW.enemies.length).toBe(0);
    const normalW = generateBiomeWorld(createPlayer(), getBiome("cave"), lcg(1)); // plus de biome-boss fixe
    expect(normalW.boss).toBe(null);
    expect(normalW.enemies.length).toBeGreaterThan(0);
    const hub = generateBiomeWorld(createPlayer(), getBiome("spawn"), lcg(1), true); // jamais de boss au Sanctuaire
    expect(hub.boss).toBe(null);
  });

  it("le joueur est le même objet, placé sur une case libre", () => {
    const p = createPlayer();
    const w = generateBiomeWorld(p, getBiome("plains"), lcg(3));
    expect(w.player).toBe(p);
    expect(canOccupy(w.player.transform.pos, w.player.radius, w.level)).toBe(true);
  });
});
