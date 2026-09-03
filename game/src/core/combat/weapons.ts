export type WeaponCategory = "melee" | "ranged";
export type Signature = "none" | "pierce";
export type Tier = "F" | "E" | "D" | "C" | "B" | "A" | "S";

export interface WeaponDef {
  id: string;
  name: string;
  category: WeaponCategory;
  atk: number;
  attackSpeed: number; // multiplicateur, 1 = base
  critChance: number; // 0..1
  critDamage: number; // multiplicateur
  range: number; // portée mêlée (0 si distance)
  arcDeg: number; // arc mêlée (0 si distance ; 360 = radial)
  knockback: number;
  projectileSpeed: number; // 0 si mêlée
  projectileRadius: number; // 0 si mêlée
  signature: Signature;
}

export type ResolvedWeapon = WeaponDef; // même forme, atk déjà multipliée par le tier

export const TIER_MULT: Record<Tier, number> = { F: 1.0, E: 1.3, D: 1.7, C: 2.2, B: 3.0, A: 4.0, S: 5.5 };
export const TIERS: Tier[] = ["F", "E", "D", "C", "B", "A", "S"];

export const WEAPONS: WeaponDef[] = [
  { id: "sword",  name: "Épée",    category: "melee",  atk: 15, attackSpeed: 1.0,  critChance: 0.10, critDamage: 1.5, range: 64, arcDeg: 100, knockback: 180, projectileSpeed: 0,   projectileRadius: 0,  signature: "none" },
  { id: "dagger", name: "Dague",   category: "melee",  atk: 8,  attackSpeed: 1.8,  critChance: 0.35, critDamage: 2.0, range: 48, arcDeg: 70,  knockback: 90,  projectileSpeed: 0,   projectileRadius: 0,  signature: "none" },
  { id: "axe",    name: "Hache",   category: "melee",  atk: 22, attackSpeed: 0.8,  critChance: 0.10, critDamage: 1.5, range: 70, arcDeg: 150, knockback: 160, projectileSpeed: 0,   projectileRadius: 0,  signature: "none" },
  { id: "hammer", name: "Marteau", category: "melee",  atk: 32, attackSpeed: 0.55, critChance: 0.05, critDamage: 1.5, range: 64, arcDeg: 360, knockback: 320, projectileSpeed: 0,   projectileRadius: 0,  signature: "none" },
  { id: "bow",    name: "Arc",     category: "ranged", atk: 10, attackSpeed: 1.2,  critChance: 0.20, critDamage: 1.8, range: 0,  arcDeg: 0,   knockback: 60,  projectileSpeed: 560, projectileRadius: 5,  signature: "pierce" },
  { id: "staff",  name: "Bâton",   category: "ranged", atk: 18, attackSpeed: 0.7,  critChance: 0.10, critDamage: 1.6, range: 0,  arcDeg: 0,   knockback: 100, projectileSpeed: 320, projectileRadius: 12, signature: "none" },
];

// Familles supplémentaires : bases des variantes nommées du catalogue (voir catalog.ts).
// Pas dans WEAPONS (qui reste les 6 armes génériques de la salle de départ).
export const FAMILY_WEAPONS: WeaponDef[] = [
  { id: "spear",    name: "Lance",    category: "melee",  atk: 18, attackSpeed: 0.9,  critChance: 0.10, critDamage: 1.5, range: 92, arcDeg: 40,  knockback: 150, projectileSpeed: 0,   projectileRadius: 0, signature: "none" },
  { id: "mace",     name: "Masse",    category: "melee",  atk: 20, attackSpeed: 0.75, critChance: 0.08, critDamage: 1.5, range: 56, arcDeg: 90,  knockback: 220, projectileSpeed: 0,   projectileRadius: 0, signature: "none" },
  { id: "flail",    name: "Fléau",    category: "melee",  atk: 16, attackSpeed: 0.85, critChance: 0.08, critDamage: 1.5, range: 58, arcDeg: 360, knockback: 120, projectileSpeed: 0,   projectileRadius: 0, signature: "none" },
  { id: "katana",   name: "Katana",   category: "melee",  atk: 12, attackSpeed: 1.5,  critChance: 0.25, critDamage: 1.8, range: 60, arcDeg: 80,  knockback: 100, projectileSpeed: 0,   projectileRadius: 0, signature: "none" },
  { id: "crossbow", name: "Arbalète", category: "ranged", atk: 24, attackSpeed: 0.55, critChance: 0.15, critDamage: 1.7, range: 0,  arcDeg: 0,   knockback: 140, projectileSpeed: 640, projectileRadius: 5, signature: "none" },
];

// Arme de départ, toujours disponible, non ramassable (slot 0).
export const FISTS: WeaponDef = {
  id: "fists", name: "Poings", category: "melee", atk: 5, attackSpeed: 1.3, critChance: 0.05, critDamage: 1.5,
  range: 40, arcDeg: 80, knockback: 70, projectileSpeed: 0, projectileRadius: 0, signature: "none",
};

const BY_ID: Record<string, WeaponDef> = Object.fromEntries([...WEAPONS, ...FAMILY_WEAPONS, FISTS].map((w) => [w.id, w]));

export function getWeaponDef(id: string): WeaponDef {
  const w = BY_ID[id];
  if (!w) throw new Error(`Arme inconnue: ${id}`);
  return w;
}

export const OMEGA_ATK_MULT = 1.8;

// Modificateur aléatoire appliqué au craft Ω (bonus, parfois avec malus)
export type OmegaMod = "none" | "feroce" | "vif" | "colossal" | "instable";
export const OMEGA_MODS: OmegaMod[] = ["feroce", "vif", "colossal", "instable"];
export const OMEGA_MOD_LABEL: Record<OmegaMod, string> = {
  none: "",
  feroce: "Féroce (+ATK)",
  vif: "Vif (+vitesse)",
  colossal: "Colossal (+recul, −vitesse)",
  instable: "Instable (+crit, −ATK)",
};

export function computeStats(def: WeaponDef, tier: Tier, omega = false, mod: OmegaMod = "none"): ResolvedWeapon {
  const r: ResolvedWeapon = { ...def, atk: def.atk * TIER_MULT[tier] * (omega ? OMEGA_ATK_MULT : 1) };
  if (omega) {
    // Ω : grosses stats + transperce
    r.critChance = Math.min(0.9, def.critChance + 0.2);
    r.critDamage = def.critDamage + 0.5;
    r.signature = "pierce";
  }
  switch (mod) {
    case "feroce":
      r.atk *= 1.25;
      break;
    case "vif":
      r.attackSpeed *= 1.3;
      break;
    case "colossal":
      r.atk *= 1.1;
      r.knockback *= 1.6;
      r.attackSpeed *= 0.85;
      break;
    case "instable":
      r.critChance = Math.min(0.95, r.critChance + 0.25);
      r.atk *= 0.9;
      break;
  }
  return r;
}
