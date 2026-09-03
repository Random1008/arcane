import { describe, it, expect } from "vitest";
import { createWorld, makeEnemy, tickWorld, hurtPlayer, InputState } from "../src/core/world";
import { makeBoss } from "../src/core/boss";
import { BOSSES } from "../src/core/bosses";
import {
  ULTIMATE_WEAPONS,
  isUltimateWeapon,
  randomUltimateWeaponId,
  weaponsOfTier,
} from "../src/core/combat/catalog";
import {
  OMEGA_ARMORS,
  UNIQUE_ARMORS,
  makeOmegaArmor,
  omegaArmorDef,
} from "../src/core/armor";
import { computePlayerMods } from "../src/core/sets";
import { OMEGA_ABILITIES, classUltimate, setClass, unlockedAbilities } from "../src/core/skills";
import { castAbility } from "../src/core/abilities";
import { CLASS_IDS } from "../src/core/classes";
import { WeaponInstance } from "../src/core/combat/hotbar";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v } from "../src/core/math/vec2";

const T = DEFAULT_TUNING;
const dt = 1 / 60;
const noInput = (over: Partial<InputState> = {}): InputState => ({ moveDir: v(0, 0), aimPoint: v(0, 0), attack: false, dash: false, blink: false, selectSlot: -1, scroll: 0, cycleTier: false, ability: -1, ...over });

describe("armes Ω uniques", () => {
  it("il y a 5 armes Ω uniques, marquées ultimate, tier S", () => {
    expect(ULTIMATE_WEAPONS.length).toBe(5);
    for (const u of ULTIMATE_WEAPONS) {
      expect(u.ultimate).toBe(true);
      expect(u.tier).toBe("S");
      expect(isUltimateWeapon(u.id)).toBe(true);
    }
  });

  it("les armes Ω uniques sont EXCLUES du tirage normal de tier S", () => {
    const sPool = weaponsOfTier("S");
    expect(sPool.some((n) => n.ultimate)).toBe(false);
    // 1000 tirages : jamais d'ultime
    let rngState = 1;
    const rng = () => ((rngState = (rngState * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 1000; i++) {
      const id = weaponsOfTier("S")[Math.floor(rng() * sPool.length)].id;
      expect(isUltimateWeapon(id)).toBe(false);
    }
  });

  it("randomUltimateWeaponId ne rend que des armes Ω uniques", () => {
    for (let i = 0; i < 20; i++) expect(isUltimateWeapon(randomUltimateWeaponId(() => i / 20))).toBe(true);
  });

  it("Briseur de Réalité : draine le porteur (selfDrain) tant qu'elle est en main", () => {
    const w = createWorld();
    w.enemies = [];
    const inst: WeaponInstance = { defId: "omega_briseur_realite", tier: "S", omega: true };
    w.player.hotbar.slots[1] = inst;
    w.player.hotbar.activeIndex = 1;
    w.player.health.hp = 100;
    for (let i = 0; i < 120; i++) tickWorld(w, noInput(), T, dt); // 2 s
    expect(w.player.health.hp).toBeLessThan(100);
    expect(w.player.health.hp).toBeGreaterThanOrEqual(1); // jamais sous 1 PV
  });

  it("Source Primordiale : applique brûlure + poison + ralentissement à l'impact", () => {
    const w = createWorld();
    const e = makeEnemy(80, w.player.transform.pos.x + 60, w.player.transform.pos.y, "dummy", "S", "Cible", 1);
    e.health.hp = e.health.maxHp = 100000;
    w.enemies = [e];
    w.pickups = [];
    w.rng = () => 0.99;
    const inst: WeaponInstance = { defId: "omega_source_primordiale", tier: "S", omega: true };
    w.player.hotbar.slots[1] = inst;
    w.player.hotbar.activeIndex = 1;
    for (let i = 0; i < 30; i++) tickWorld(w, noInput({ attack: true, aimPoint: v(e.transform.pos.x, e.transform.pos.y) }), T, dt);
    expect(e.status.burn).toBeDefined();
    expect(e.status.poison).toBeDefined();
    expect(e.slowTimer).toBeGreaterThan(0);
  });
});

describe("armures Ω uniques", () => {
  it("6 armures Ω, fabrication marquée omega, défense élevée", () => {
    expect(OMEGA_ARMORS.length).toBe(6);
    for (const def of OMEGA_ARMORS) {
      const a = makeOmegaArmor(1, def);
      expect(a.omega).toBe(true);
      expect(a.tier).toBe("S");
      expect(a.name).toBe(def.name);
      expect(a.effects!.length).toBeGreaterThan(0);
      // plus défensive qu'une pièce unique S équivalente
    }
    expect(omegaArmorDef("immortel_absolu")?.slot).toBe("plastron");
  });

  it("Immortel Absolu : flag revive dans les mods + ressuscite au coup létal, une fois par combat", () => {
    const w = createWorld();
    const p = w.player;
    p.armor.plastron = makeOmegaArmor(1, omegaArmorDef("immortel_absolu")!);
    w.enemies = [makeEnemy(81, 99999, 99999, "chaser", "F", "loin", 1)]; // en combat (loin → ne tape pas)
    w.rng = () => 0.99; // pas d'esquive
    tickWorld(w, noInput(), T, dt);
    expect(w.playerMods.revive).toBe(true);
    // coup létal → résurrection à 50% PV
    p.health.iframes = 0;
    expect(hurtPlayer(w, 99999, v(0, 0))).toBe(true);
    expect(p.health.hp).toBeGreaterThan(0);
    expect(p.reviveUsed).toBe(true);
    // 2e coup létal ce combat → mort réelle (plus de résurrection)
    p.health.iframes = 0;
    hurtPlayer(w, 99999, v(0, 0));
    expect(p.health.hp).toBe(0);
  });

  it("la résurrection se recharge hors combat", () => {
    const w = createWorld();
    const p = w.player;
    p.armor.plastron = makeOmegaArmor(1, omegaArmorDef("immortel_absolu")!);
    w.enemies = [];
    p.reviveUsed = true;
    tickWorld(w, noInput(), T, dt); // pas d'ennemis → recharge
    expect(p.reviveUsed).toBe(false);
  });

  it("Fureur Cosmique : +vitesse d'attaque mais +dégâts subis (glass cannon)", () => {
    const armor = { casque: null, plastron: null, jambieres: null, bottes: null, gants: makeOmegaArmor(1, omegaArmorDef("fureur_cosmique")!), amulette: null };
    const m = computePlayerMods(armor);
    expect(m.attackSpeedMul).toBeGreaterThan(1);
    expect(m.incomingMul).toBeGreaterThan(1);
  });

  it("Rempart Infini : bloque automatiquement les attaques (autoBlockCooldown)", () => {
    const armor = { casque: null, plastron: null, jambieres: null, bottes: null, gants: null, amulette: makeOmegaArmor(1, omegaArmorDef("rempart_infini")!) };
    expect(computePlayerMods(armor).autoBlockCooldown).toBeGreaterThan(0);
  });

  it("les uid des Ω uniques ne collisionnent pas avec les uniques S", () => {
    const sUids = new Set(UNIQUE_ARMORS.map((u) => u.uid));
    for (const u of OMEGA_ARMORS) expect(sUids.has(u.uid)).toBe(false);
  });
});

describe("capacités Ω ultimes", () => {
  it("1 ultime par classe, marquée omega, slot B", () => {
    for (const cid of CLASS_IDS) {
      const u = classUltimate(cid);
      expect(u.omega).toBe(true);
      expect(u.slot).toBe(3);
      expect(u.classId).toBe(cid);
    }
    expect(Object.keys(OMEGA_ABILITIES).length).toBe(6);
  });

  it("l'ultime n'est débloquée qu'après l'obtention d'un objet Ω", () => {
    const w = createWorld();
    const p = w.player;
    setClass(p, "guerrier");
    expect(unlockedAbilities(p).some((a) => a.ability.omega)).toBe(false);
    p.omegaUnlocked = true;
    const unlocked = unlockedAbilities(p);
    expect(unlocked.some((a) => a.ability.id === "og_juggernaut")).toBe(true);
  });

  it("Mode Juggernaut : rend invincible (iframes) et booste (buffTimer)", () => {
    const w = createWorld();
    const p = w.player;
    p.energy = 100;
    castAbility(w, classUltimate("guerrier"), 1, v(p.transform.pos.x + 10, p.transform.pos.y));
    expect(p.health.iframes).toBeGreaterThan(4);
    expect(p.buffTimer).toBeGreaterThan(4);
  });

  it("Faille Temporelle : fige tous les ennemis de l'écran", () => {
    const w = createWorld();
    const p = w.player;
    p.energy = 100;
    const far = makeEnemy(82, p.transform.pos.x + 600, p.transform.pos.y, "chaser", "F", "loin", 1);
    w.enemies = [far];
    castAbility(w, classUltimate("assassin"), 1, v(p.transform.pos.x + 100, p.transform.pos.y));
    expect(far.health.hitstun).toBeGreaterThan(2);
  });

  it("Tempête Infinie : génère une volée de nombreux projectiles guidés", () => {
    const w = createWorld();
    const p = w.player;
    p.energy = 100;
    castAbility(w, classUltimate("archer"), 1, v(p.transform.pos.x + 100, p.transform.pos.y));
    expect(w.projectiles.length).toBeGreaterThanOrEqual(16);
    expect(w.projectiles.every((pr) => pr.homing)).toBe(true);
  });

  it("toutes les capacités Ω se lancent sans crash", () => {
    for (const cid of CLASS_IDS) {
      const w = createWorld();
      w.enemies = [makeEnemy(90, w.player.transform.pos.x + 40, w.player.transform.pos.y, "chaser", "F", "c", 1)];
      w.player.energy = 100;
      expect(() => castAbility(w, classUltimate(cid), 1, v(w.player.transform.pos.x + 80, w.player.transform.pos.y))).not.toThrow();
    }
  });
});

describe("drops endgame", () => {
  it("un boss S peut lâcher une arme Ω unique + débloque l'Ω", () => {
    const w = createWorld();
    w.enemies = [];
    w.rng = () => 0.1; // < tous les seuils (0.5/0.25/0.2)
    w.boss = makeBoss(BOSSES[0], "S", 600, 300);
    w.boss.health.hp = 0;
    tickWorld(w, noInput(), T, dt);
    expect(w.pickups.some((pk) => pk.omega && isUltimateWeapon(pk.defId))).toBe(true);
    expect(w.player.armorInv.some((a) => a.omega)).toBe(true);
    expect(w.player.omegaUnlocked).toBe(true);
  });

  it("le coffre de boss du Nexus (rang 6) donne un butin Ω garanti", () => {
    const w = createWorld();
    w.enemies = [];
    w.rng = () => 0.5;
    const p = w.player;
    w.chests = [{ id: 750, pos: { x: p.transform.pos.x, y: p.transform.pos.y }, radius: 20, opened: false, rank: 6 }];
    tickWorld(w, noInput(), T, dt);
    expect(w.pickups.some((pk) => pk.omega && isUltimateWeapon(pk.defId))).toBe(true);
    expect(w.player.armorInv.some((a) => a.omega)).toBe(true);
  });
});
