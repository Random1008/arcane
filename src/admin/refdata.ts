import { WEAPONS, TIERS, OMEGA_MODS, OMEGA_MOD_LABEL } from "../core/combat/weapons";
import { NAMED_WEAPONS } from "../core/combat/catalog";
import { ABILITIES, ABILITY_KEYS, SKILL_TREES, OMEGA_ABILITIES } from "../core/skills";
import { CLASS_IDS, CLASS_DEFS } from "../core/classes";
import { ARMOR_SLOTS, ARMOR_TYPES, OMEGA_SETS, ARMOR_SLOT_LABEL, ARMOR_TYPE_LABEL, SET_LABEL, makeArmor, UNIQUE_ARMORS, OMEGA_ARMORS, tierArmorEffects, armorEffectDesc } from "../core/armor";
import { BIOMES, SPAWN_BIOME } from "../core/biomes";
import { BOSSES } from "../core/bosses";
import { ARCHETYPES, Archetype, resolveEnemyStats } from "../core/enemies";
import { BIOME_ENEMIES } from "../core/biomeEnemies";
import { BALANCE_DEFAULTS } from "../core/balance";

export interface RefRow {
  id: string;
  info: string;
}
export interface RefGroup {
  title: string;
  rows: RefRow[];
}

// — Armures : toutes les pièces concrètes (emplacement × type), avec défense de base (tier F) —
const armorPieces: RefRow[] = ARMOR_SLOTS.flatMap((slot) =>
  ARMOR_TYPES.map((type) => ({
    id: `${slot}:${type}`,
    info: `${ARMOR_SLOT_LABEL[slot]} ${ARMOR_TYPE_LABEL[type].toLowerCase()} — déf ${makeArmor(0, slot, type, "F").defense} (F) → ${makeArmor(0, slot, type, "S").defense} (S)`,
  })),
);

// — Pièces de set Ω (emplacement × set ; toujours tier S, déf ×1.5) —
const omegaPieces: RefRow[] = OMEGA_SETS.flatMap((set) =>
  ARMOR_SLOTS.map((slot) => ({
    id: `${slot}:${set}`,
    info: `${ARMOR_SLOT_LABEL[slot]} du set ${SET_LABEL[set]} — déf ${makeArmor(0, slot, "heavy", "S", set).defense} (S, Ω)`,
  })),
);

// — Nœuds des 6 arbres de compétences —
const skillNodes: RefRow[] = CLASS_IDS.flatMap((c) =>
  SKILL_TREES[c].map((n) => ({
    id: n.id,
    info: `${n.name} (${CLASS_DEFS[c].name} · ${n.branch} · coût ${n.cost} · max ${n.maxRank})`,
  })),
);

// — Ennemis nommés par biome —
const namedEnemies: RefRow[] = Object.entries(BIOME_ENEMIES).flatMap(([biomeId, types]) =>
  types.map((t) => ({ id: t.name, info: `${biomeId} — archétype ${t.archetype}` })),
);

/** Tous les identifiants du jeu (lecture seule), dérivés directement des données du cœur. */
export const REF_GROUPS: RefGroup[] = [
  {
    title: "Armes",
    rows: WEAPONS.map((w) => ({
      id: w.id,
      info: `${w.name} — ATK ${w.atk} · vit ${w.attackSpeed} · crit ${Math.round(w.critChance * 100)}% · ${w.projectileSpeed > 0 ? `distance (proj ${w.projectileSpeed})` : `mêlée (portée ${w.range}, arc ${w.arcDeg}°)`}`,
    })),
  },
  {
    title: "Armes nommées (catalogue, 15 par tier)",
    rows: NAMED_WEAPONS.map((n) => ({
      id: n.id,
      info: `${n.name} [${n.tier}] — famille ${n.family}${n.effects?.length ? ` · effets : ${n.effects.map((e) => e.kind).join(", ")}` : ""}`,
    })),
  },
  { title: "Tiers d'arme (F→S)", rows: TIERS.map((t) => ({ id: t, info: "tier" })) },
  { title: "Modificateurs Ω", rows: OMEGA_MODS.map((m) => ({ id: m, info: OMEGA_MOD_LABEL[m] })) },
  { title: "Armures — pièces (emplacement × type)", rows: armorPieces },
  {
    title: "Armures — effets par tier (par pièce)",
    rows: (["F", "E", "D", "C", "B", "A", "S"] as const).map((t) => ({
      id: t,
      info: tierArmorEffects(t, "medium").map(armorEffectDesc).join(" · ") || "défense seule",
    })),
  },
  {
    title: "Armures — pièces uniques S (boss de rang S, 50%)",
    rows: UNIQUE_ARMORS.map((u) => ({ id: u.uid, info: `${u.name} (${ARMOR_SLOT_LABEL[u.slot]}) — ${u.desc}` })),
  },
  {
    title: "Armures Ω uniques (endgame : boss S / coffre Nexus)",
    rows: OMEGA_ARMORS.map((u) => ({ id: u.uid, info: `${u.name} (${ARMOR_SLOT_LABEL[u.slot]}) — ${u.desc}` })),
  },
  { title: "Armures — pièces de set Ω", rows: omegaPieces },
  { title: "Armures — emplacements", rows: ARMOR_SLOTS.map((s) => ({ id: s, info: ARMOR_SLOT_LABEL[s] })) },
  { title: "Armures — types", rows: ARMOR_TYPES.map((t) => ({ id: t, info: ARMOR_TYPE_LABEL[t] })) },
  { title: "Sets Ω", rows: OMEGA_SETS.map((s) => ({ id: s, info: `set ${SET_LABEL[s]} (bonus 2/4/6 pièces)` })) },
  { title: "Classes", rows: CLASS_IDS.map((c) => ({ id: c, info: `${CLASS_DEFS[c].name} — ${CLASS_DEFS[c].branches.join(" / ")}` })) },
  { title: "Capacités", rows: Object.values(ABILITIES).map((a) => ({ id: a.id, info: `${a.name} (${a.classId}, ${a.kind}, touche ${ABILITY_KEYS[a.slot]})` })) },
  { title: "Capacités Ω ultimes (1/classe, débloquée par objet Ω)", rows: Object.values(OMEGA_ABILITIES).map((a) => ({ id: a.id, info: `${a.name} (${a.classId}, ${a.kind}, recharge ${a.cooldown}s)` })) },
  { title: "Nœuds d'arbre de compétences", rows: skillNodes },
  { title: "Biomes", rows: [SPAWN_BIOME, ...BIOMES].map((b) => ({ id: b.id, info: `${b.name} [${b.tier}]` })) },
  { title: "Boss", rows: BOSSES.map((b) => ({ id: b.id, info: `${b.name} [${b.tier}]` })) },
  {
    title: "Archétypes d'ennemis",
    rows: (Object.keys(ARCHETYPES) as Archetype[]).map((a) => {
      const s = resolveEnemyStats(a, "F");
      return { id: a, info: `PV ${s.maxHp} · vit ${s.speed} · contact ${s.contactDamage} (base F)` };
    }),
  },
  { title: "Ennemis nommés (par biome)", rows: namedEnemies },
  { title: "Clés de réglage (tuning)", rows: ["move.maxSpeed", "move.accel", "move.friction", "melee.damage", "ranged.damage", "dash.distance", "dash.cooldown", "blink.range"].map((k) => ({ id: k, info: "commande tuning" })) },
  { title: "Clés d'équilibrage (balance)", rows: Object.entries(BALANCE_DEFAULTS).map(([k, v]) => ({ id: k, info: `défaut ${v} — commande balance` })) },
  { title: "Drapeaux (flags)", rows: ["godMode", "showHitboxes", "showVelocity", "showFps"].map((k) => ({ id: k, info: "commande flag" })) },
];

export interface CmdDoc {
  cat: string;
  cmd: string;
  effet: string;
}

/** Documentation des commandes admin (envoyées au jeu en direct). */
export const COMMANDS_DOC: CmdDoc[] = [
  { cat: "Joueur", cmd: "giveGold <n>", effet: "ajoute n pièces d'or" },
  { cat: "Joueur", cmd: "giveOmganium <n>", effet: "ajoute n Omganium" },
  { cat: "Joueur", cmd: "giveStatPoints <n>", effet: "ajoute n points de statistique" },
  { cat: "Joueur", cmd: "giveSkillPoints <n>", effet: "ajoute n points de compétence" },
  { cat: "Joueur", cmd: "grantLevels <n>", effet: "fait gagner n niveaux" },
  { cat: "Joueur", cmd: "heal", effet: "PV + énergie au maximum" },
  { cat: "Joueur", cmd: "godmodeOn / godmodeOff", effet: "active / désactive l'invulnérabilité" },
  { cat: "Joueur", cmd: "unlockAllSkills", effet: "débloque tout l'arbre de la classe" },
  { cat: "Joueur", cmd: "respec", effet: "réinitialise l'arbre et rend les points" },
  { cat: "Joueur", cmd: "giveWeapon <id> <tier>", effet: "donne une arme du tier choisi (ids : voir « Armes »)" },
  { cat: "Joueur", cmd: "giveArmorSet <set>", effet: "donne un set d'armure Ω complet (chaos/temps/neant)" },
  { cat: "Joueur", cmd: "setClass <id>", effet: "définit la classe du joueur (ids : voir « Classes »)" },
  { cat: "Monde", cmd: "unlockAll", effet: "nettoie + identifie tous les biomes (Nexus & PNJ S/Ω débloqués)" },
  { cat: "Monde", cmd: "identifyAll", effet: "révèle toute la carte (sans nettoyer)" },
  { cat: "Combat", cmd: "spawnBoss", effet: "fait apparaître le boss du biome courant" },
  { cat: "Combat", cmd: "spawnEnemies <n>", effet: "fait apparaître n ennemis" },
  { cat: "Combat", cmd: "killAll", effet: "élimine tous les ennemis (et le boss)" },
  { cat: "Combat", cmd: "gotoNexus", effet: "envoie le joueur au Nexus Infini" },
  { cat: "Réglages", cmd: "tuning <clé> <valeur>", effet: "modifie un paramètre (clés : voir « Clés de réglage »)" },
  { cat: "Réglages", cmd: "flag <clé> <bool>", effet: "active/désactive un drapeau (clés : voir « Drapeaux »)" },
  { cat: "Économie", cmd: "balance <clé> <valeur>", effet: "équilibrage live (clés : voir « Clés d'équilibrage »)" },
  { cat: "Modération", cmd: "warn (REST)", effet: "envoie un avertissement au joueur (toast en jeu)" },
  { cat: "Modération", cmd: "kick (REST)", effet: "déconnecte le joueur" },
  { cat: "Modération", cmd: "ban / unban (REST)", effet: "bannit / débannit le compte" },
];
