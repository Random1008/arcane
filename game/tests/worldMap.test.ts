import { describe, it, expect } from "vitest";
import { buildWorldMap, isBiomeUnlocked, isRingFinalBiome } from "../src/core/worldMap";
import { BIOMES } from "../src/core/biomes";

describe("worldMap", () => {
  it("place le départ au centre + 20 biomes en anneaux (F→S)", () => {
    const nodes = buildWorldMap();
    expect(nodes.length).toBe(50); // 49 biomes + sanctuaire central
    const spawn = nodes.find((n) => n.biomeId === "spawn");
    expect(spawn?.ringRadius).toBe(0); // pile au centre
    const ringF = nodes.filter((n) => n.tier === "F" && n.biomeId !== "spawn");
    expect(ringF.length).toBe(4);
    const s = nodes.filter((n) => n.tier === "S");
    expect(spawn!.ringRadius).toBeLessThan(s[0].ringRadius);
  });

  it("déverrouillage : il faut nettoyer TOUT l'anneau pour ouvrir le suivant", () => {
    const fIds = BIOMES.filter((b) => b.tier === "F").map((b) => b.id);
    const eIds = BIOMES.filter((b) => b.tier === "E").map((b) => b.id);
    expect(isBiomeUnlocked("spawn", new Set())).toBe(true);
    expect(isBiomeUnlocked("plains", new Set())).toBe(false); // rang F verrouillé tant que le Sanctuaire n'est pas visité
    expect(isBiomeUnlocked("plains", new Set(["spawn"]))).toBe(true); // après le Sanctuaire
    // un seul F nettoyé → rang E encore verrouillé
    expect(isBiomeUnlocked("swamp", new Set([fIds[0]]))).toBe(false);
    // TOUS les F nettoyés → rang E ouvert
    expect(isBiomeUnlocked("swamp", new Set(fIds))).toBe(true);
    // E partiellement nettoyé → rang D verrouillé ; tous les E → D ouvert
    expect(isBiomeUnlocked("desert", new Set([...fIds, eIds[0]]))).toBe(false);
    expect(isBiomeUnlocked("desert", new Set([...fIds, ...eIds]))).toBe(true);
  });

  it("isRingFinalBiome : vrai seulement pour le dernier biome non nettoyé de son anneau", () => {
    const fIds = BIOMES.filter((b) => b.tier === "F").map((b) => b.id); // 4 biomes
    expect(isRingFinalBiome(fIds[0], new Set())).toBe(false); // 3 autres restent
    const allButLast = new Set(fIds.slice(0, -1));
    const last = fIds[fIds.length - 1];
    expect(isRingFinalBiome(last, allButLast)).toBe(true); // dernier restant → boss
    expect(isRingFinalBiome(fIds[0], allButLast)).toBe(false); // déjà nettoyé → non
    expect(isRingFinalBiome(last, new Set(fIds))).toBe(false); // anneau fini → plus de boss
    expect(isRingFinalBiome("spawn", new Set())).toBe(false); // jamais au Sanctuaire
    // l'ordre n'importe pas : n'importe quel biome peut être le dernier
    const allButFirst = new Set(fIds.slice(1));
    expect(isRingFinalBiome(fIds[0], allButFirst)).toBe(true);
  });
});
