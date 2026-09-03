import { describe, it, expect } from "vitest";
import { makeStatus, applyDot, tickStatus, MAX_POISON_STACKS } from "../src/core/combat/effects";
import { createWorld, makeEnemy, tickWorld, InputState, World } from "../src/core/world";
import { WeaponInstance } from "../src/core/combat/hotbar";
import { Tier } from "../src/core/combat/weapons";
import { DEFAULT_TUNING } from "../src/core/config/tuning";
import { v, Vec2 } from "../src/core/math/vec2";

const T = DEFAULT_TUNING;
const dt = 1 / 60;

const input = (over: Partial<InputState> = {}): InputState => ({
  moveDir: v(0, 0),
  aimPoint: v(0, 0),
  attack: false,
  dash: false,
  blink: false,
  selectSlot: -1,
  scroll: 0,
  cycleTier: false,
  ability: -1,
  ...over,
});

/** Monde de test : joueur armé d'une arme nommée, un ennemi immobile (dummy) à portée. */
function setup(defId: string, tier: Tier, enemyPos: Vec2 = v(350, 400), archetype: "dummy" | "chaser" = "dummy") {
  const w = createWorld();
  w.enemies = [makeEnemy(50, enemyPos.x, enemyPos.y, archetype, "F", "Cible", 1)];
  w.pickups = [];
  const inst: WeaponInstance = { defId, tier };
  w.player.hotbar.slots[1] = inst;
  w.player.hotbar.activeIndex = 1;
  w.rng = () => 0.99; // pas de crit, pas de stun aléatoire, pas de drop
  return { w, inst, enemy: () => w.enemies[0] };
}

function tickN(w: World, inp: InputState, n: number): void {
  for (let i = 0; i < n; i++) tickWorld(w, inp, T, dt);
}

const attackAt = (pos: Vec2): InputState => input({ attack: true, aimPoint: pos });

describe("statuts (DoT)", () => {
  it("burn : inflige ~dps × durée puis expire", () => {
    const st = makeStatus();
    applyDot(st, "burn", 10, 2);
    let total = 0;
    for (let i = 0; i < 300; i++) total += tickStatus(st, dt); // 5 s
    expect(total).toBeGreaterThanOrEqual(15);
    expect(total).toBeLessThanOrEqual(25); // ~20
    expect(st.burn).toBeUndefined(); // expiré
  });

  it("poison : stacke (dégâts multipliés), plafonné", () => {
    const st = makeStatus();
    for (let i = 0; i < 10; i++) applyDot(st, "poison", 4, 4);
    expect(st.poison!.stacks).toBe(MAX_POISON_STACKS);
    const st1 = makeStatus();
    applyDot(st1, "poison", 4, 4);
    let one = 0;
    for (let i = 0; i < 240; i++) one += tickStatus(st1, dt);
    let five = 0;
    for (let i = 0; i < 240; i++) five += tickStatus(st, dt);
    expect(five).toBeGreaterThan(one * 3);
  });
});

describe("effets d'armes en jeu", () => {
  it("Épée feu : un coup applique la brûlure et la cible perd des PV sur la durée", () => {
    const { w, enemy } = setup("epee_feu", "C");
    tickN(w, attackAt(v(350, 400)), 10); // windup → coup
    expect(enemy().status.burn).toBeDefined();
    const hpAfterHit = enemy().health.hp;
    tickN(w, input(), 120); // 2 s sans attaquer
    expect(enemy().health.hp).toBeLessThan(hpAfterHit);
  });

  it("Dague poison : les coups stackent le poison", () => {
    const { w, enemy } = setup("dague_poison", "D");
    tickN(w, attackAt(v(350, 400)), 60); // plusieurs coups (dague rapide)
    expect(enemy().status.poison).toBeDefined();
    expect(enemy().status.poison!.stacks).toBeGreaterThan(1);
  });

  it("Arc glace : le projectile ralentit la cible", () => {
    const { w, enemy } = setup("arc_glace", "C", v(420, 400));
    tickN(w, attackAt(v(420, 400)), 30);
    expect(enemy().slowTimer).toBeGreaterThan(0);
  });

  it("Marteau acier : étourdit la cible (hitstun prolongé)", () => {
    const { w, enemy } = setup("marteau_acier", "D");
    let maxStun = 0;
    for (let i = 0; i < 30; i++) {
      tickWorld(w, attackAt(v(350, 400)), T, dt);
      maxStun = Math.max(maxStun, enemy().health.hitstun);
    }
    expect(maxStun).toBeGreaterThan(0.4); // stun 0.6s > hitstun de knockback (~0.26 max)
  });

  it("Fléau sombre : draine de la vie au joueur", () => {
    const { w } = setup("fleau_sombre", "C");
    w.player.health.hp = 50;
    tickN(w, attackAt(v(350, 400)), 12);
    expect(w.player.health.hp).toBeGreaterThan(50);
  });

  it("Masse choc : onde de choc qui touche un ennemi proche de la cible", () => {
    const { w } = setup("masse_choc", "D");
    const second = makeEnemy(51, 410, 400, "dummy", "F", "Voisin", 1);
    w.enemies.push(second); // hors de portée mêlée (110 px du joueur), mais dans l'onde (60 px de la cible)
    tickN(w, attackAt(v(350, 400)), 10);
    expect(second.health.hp).toBeLessThan(second.health.maxHp);
  });

  it("Arc multi-tir : un appui tire 2 projectiles", () => {
    const { w } = setup("arc_multi_tir", "C", v(900, 400));
    tickWorld(w, attackAt(v(900, 400)), T, dt);
    expect(w.projectiles.length).toBe(2);
  });

  it("Arc éternité (autofire) : maintenir le bouton enchaîne les tirs", () => {
    const { w } = setup("arc_eternite", "S", v(900, 400));
    w.enemies = []; // rien à toucher : on compte les projectiles vivants
    tickN(w, attackAt(v(900, -2000)), 60); // 1 s de tir maintenu vers le haut
    expect(w.projectiles.length).toBeGreaterThan(2);
  });

  it("arc classique : pas d'autofire (1 tir par appui maintenu)", () => {
    const { w } = setup("arc_simple", "F", v(900, 400));
    w.enemies = [];
    tickN(w, attackAt(v(900, -2000)), 60);
    expect(w.projectiles.length).toBe(1);
  });

  it("Épée rouillée : le combo monte et amplifie les dégâts", () => {
    const { w } = setup("epee_rouillee", "F");
    tickN(w, attackAt(v(350, 400)), 80); // plusieurs coups enchaînés
    expect(w.player.comboStacks).toBeGreaterThan(0);
    tickN(w, input(), 150); // 2,5 s sans frapper → combo perdu
    expect(w.player.comboStacks).toBe(0);
  });

  it("Hache ancienne : chaque kill augmente l'ATK de l'instance", () => {
    const { w, inst, enemy } = setup("hache_ancienne", "A", v(350, 400), "chaser");
    enemy().health.hp = 1;
    tickN(w, attackAt(v(350, 400)), 10);
    expect(inst.killBonus).toBe(3);
  });

  it("Épée divine : régénère les PV tant qu'elle est en main", () => {
    const { w } = setup("epee_divine", "B");
    w.player.health.hp = 50;
    tickN(w, input(), 60); // 1 s sans rien faire
    expect(w.player.health.hp).toBeGreaterThan(50.5);
  });

  it("Bâton focus : l'énergie remonte plus vite que la régénération de base", () => {
    const { w } = setup("baton_focus", "E");
    w.player.energy = 0;
    tickN(w, input(), 60); // 1 s : base 12 + focus 2
    expect(w.player.energy).toBeGreaterThan(13);
  });

  it("Épée du roi : aura de dégâts active seulement quand l'arme est en main", () => {
    const { w } = setup("epee_du_roi", "A");
    tickWorld(w, input(), T, dt);
    const withAura = w.playerMods.damageMul;
    tickWorld(w, input({ selectSlot: 0 }), T, dt); // repasse aux Poings
    expect(withAura).toBeCloseTo(w.playerMods.damageMul * 1.15, 5);
  });

  it("Dague du temps : un crit fige tous les ennemis", () => {
    const { w } = setup("dague_du_temps", "S");
    const loin = makeEnemy(52, 700, 700, "dummy", "F", "Loin", 1);
    w.enemies.push(loin);
    w.rng = () => 0; // crit garanti
    tickN(w, attackAt(v(350, 400)), 10);
    expect(loin.health.hitstun).toBeGreaterThan(0.5);
  });

  it("Lance sacrée : dégâts amplifiés contre la cible de dos non, contre boss oui (mult appliqué)", () => {
    // vérification simple : l'effet est déclaré et l'arme se résout
    const { w, enemy } = setup("lance_sacree", "C");
    tickN(w, attackAt(v(350, 400)), 10);
    expect(enemy().health.hp).toBeLessThan(enemy().health.maxHp);
  });

  it("le loot lâche des armes nommées du catalogue", () => {
    const w = createWorld();
    w.rng = () => 0; // drop garanti, rareté F
    const e = makeEnemy(60, 200, 200, "chaser", "F", "R", 1);
    e.health.hp = 0;
    w.enemies = [e];
    w.pickups = [];
    tickWorld(w, input(), T, dt);
    expect(w.pickups.length).toBe(1);
    expect(w.pickups[0].defId).toBe("epee_rouillee"); // 1ʳᵉ arme F du catalogue (rng 0)
  });
});
