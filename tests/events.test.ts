import { describe, it, expect } from "vitest";
import { EVENTS, rollWorldEvent, getWorldEvent, severitiesForTier, EVENT_CHANCE } from "../src/core/events";
import { generateBiomeWorld } from "../src/core/generate";
import { getBiome } from "../src/core/biomes";
import { createPlayer, tickWorld } from "../src/core/world";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const noInput = () => ({
  moveDir: v(0, 0),
  aimPoint: v(0, 0),
  attack: false,
  dash: false,
  blink: false,
  selectSlot: -1,
  scroll: 0,
  cycleTier: false,
  ability: -1,
});

/** Monde de biome sans ennemis ni boss (isole le comportement testé des combats). */
function quietWorld(biomeId: string, seed: number) {
  const w = generateBiomeWorld(createPlayer(), getBiome(biomeId), lcg(seed));
  w.enemies = [];
  w.boss = null;
  return w;
}

describe("events (tranche K)", () => {
  it("chaque événement a un id unique et un nom", () => {
    const ids = new Set(EVENTS.map((e) => e.id));
    expect(ids.size).toBe(EVENTS.length);
    for (const e of EVENTS) {
      expect(e.name.length).toBeGreaterThan(0);
      expect(getWorldEvent(e.id)).toBe(e);
    }
  });

  it("les sévérités accessibles montent avec le rang (F léger → S peut être extrême)", () => {
    expect(severitiesForTier("F").length).toBeLessThanOrEqual(severitiesForTier("S").length);
    expect(severitiesForTier("F")).toContain(1);
    expect(severitiesForTier("S")).toContain(5);
  });

  it("rollWorldEvent renvoie null si le rng dépasse EVENT_CHANCE", () => {
    const rng = () => EVENT_CHANCE + 0.01; // toujours au-dessus du seuil
    expect(rollWorldEvent("S", rng)).toBeNull();
  });

  it("rollWorldEvent ne renvoie que des événements de sévérité autorisée pour le rang", () => {
    const allowed = new Set(severitiesForTier("F"));
    let rolls = 0;
    const rng = lcg(5);
    for (let i = 0; i < 200; i++) {
      const id = rollWorldEvent("F", rng);
      if (!id) continue;
      rolls++;
      const ev = getWorldEvent(id)!;
      expect(allowed.has(ev.severity)).toBe(true);
    }
    expect(rolls).toBeGreaterThan(0); // lcg(5) déclenche des événements
  });

  it("le Sanctuaire n'a jamais d'événement ; les biomes peuvent en avoir", () => {
    const spawn = generateBiomeWorld(createPlayer(), getBiome("spawn"), lcg(11));
    expect(spawn.eventId).toBeNull();
    let sawEvent = false;
    let sawNone = false;
    for (let seed = 1; seed <= 40; seed++) {
      const w = generateBiomeWorld(createPlayer(), getBiome("forest"), lcg(seed * 7 + 3));
      if (w.eventId) sawEvent = true;
      else sawNone = true;
    }
    expect(sawEvent).toBe(true);
    expect(sawNone).toBe(true); // pas systématique (EVENT_CHANCE < 1)
  });

  it("un événement à vent pousse le joueur (dérive sur plusieurs ticks)", () => {
    const w = quietWorld("plains", 21);
    w.eventId = "vent_fort";
    const start = { ...w.player.transform.pos };
    const force = getWorldEvent("vent_fort")!.effects.wind!.force;
    for (let i = 0; i < 60; i++) tickWorld(w, noInput(), DEFAULT_TUNING, 1 / 60); // 1 s
    expect(w.player.transform.pos.x).toBeGreaterThan(start.x + force * 0.5);
  });

  it("un événement à playerDps blesse le joueur sur la durée (hors godmode)", () => {
    const w = quietWorld("plains", 22);
    w.eventId = "pluie_acide";
    const hp0 = w.player.health.hp;
    for (let i = 0; i < 120; i++) tickWorld(w, noInput(), DEFAULT_TUNING, 1 / 60); // 2 s
    expect(w.player.health.hp).toBeLessThan(hp0);
    expect(w.player.health.hp).toBeGreaterThan(0); // cadencé, pas une explosion
  });

  it("le godmode protège du DoT d'événement", () => {
    const w = quietWorld("plains", 23);
    w.eventId = "pluie_acide";
    w.godMode = true;
    const hp0 = w.player.health.hp;
    for (let i = 0; i < 120; i++) tickWorld(w, noInput(), DEFAULT_TUNING, 1 / 60);
    expect(w.player.health.hp).toBe(hp0);
  });
});
