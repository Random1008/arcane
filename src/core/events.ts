import { Tier, TIERS } from "./combat/weapons";

/**
 * Événements dynamiques de monde (tranche K) — inspirés de `fait/event.md`.
 * Un événement est tiré à la génération d'un monde de biome (jamais au Sanctuaire ni au Nexus)
 * et modifie le gameplay de toute la visite : vent, sol glissant, DoT, ennemis renforcés…
 */

export type EventSeverity = 1 | 2 | 3 | 4 | 5 | 6; // léger → … → impossible

export interface EventEffects {
  /** Direction + force d'une dérive externe constante (vent). dx/dy normalisés. */
  wind?: { dx: number; dy: number; force: number };
  /** < 1 = le joueur glisse plus (sol glissant / verglas). */
  playerFrictionMul?: number;
  /** Dégâts par seconde subis par le joueur (poison, pluie acide). */
  playerDps?: number;
  /** Multiplie PV/dégâts des ennemis créés (frénésie, corruption). */
  enemyHpMul?: number;
  enemyAtkMul?: number;
  /** Multiplie la chance de drop d'arme du monde. */
  lootMul?: number;
  /** Rayon de visibilité du joueur (0 = normal). Champ informatif pour la scène. */
  visionRadius?: number;
}

export interface WorldEventDef {
  id: string;
  name: string;
  severity: EventSeverity;
  effects: EventEffects;
}

export const EVENTS: WorldEventDef[] = [
  // — Sévérité 1 : légers (impact faible, ambiance + petit bonus/malus) —
  {
    id: "vent_fort",
    name: "Vent fort",
    severity: 1,
    effects: { wind: { dx: 1, dy: 0, force: 34 } },
  },
  {
    id: "brume_legere",
    name: "Brume légère",
    severity: 1,
    effects: { visionRadius: 220 },
  },
  {
    id: "chance_voyageur",
    name: "Chance du voyageur",
    severity: 1,
    effects: { lootMul: 1.5 },
  },
  // — Sévérité 2 : changement constaté —
  {
    id: "sol_glissant",
    name: "Sol glissant",
    severity: 2,
    effects: { playerFrictionMul: 0.12 },
  },
  {
    id: "pluie_acide",
    name: "Pluie acide",
    severity: 2,
    effects: { playerDps: 3 },
  },
  // — Sévérité 3 : dur à gérer —
  {
    id: "frenesie",
    name: "Frénésie",
    severity: 3,
    effects: { enemyHpMul: 1.3, enemyAtkMul: 1.3 },
  },
  {
    id: "brouillard_dense",
    name: "Brouillard dense",
    severity: 3,
    effects: { visionRadius: 130 },
  },
  // — Sévérité 4 : très difficile —
  {
    id: "tempete",
    name: "Tempête",
    severity: 4,
    effects: { wind: { dx: 1, dy: 0.35, force: 82 }, playerFrictionMul: 0.6 },
  },
  // — Sévérité 5 : presque impossible (rangs A/S) —
  {
    id: "zone_corrompue",
    name: "Zone corrompue",
    severity: 5,
    effects: { playerDps: 7, enemyHpMul: 1.5, enemyAtkMul: 1.4, lootMul: 1.8 },
  },
];

export const EVENT_CHANCE = 0.35; // proba qu'un biome ait un événement

/**
 * Pondération par sévérité (inspirée de event.md : 35/25/18/12/7/3 %) ramenée à une liste de
 * sévérités autorisées : un rang bas ne reçoit que des événements légers.
 */
const SEVERITY_WEIGHTS: Record<EventSeverity, number> = { 1: 35, 2: 25, 3: 18, 4: 12, 5: 7, 6: 3 };

/** Sévérités accessibles selon le rang du biome (F → 1-2, S → 1-5 ; 6 réservé au futur). */
export function severitiesForTier(tier: Tier): EventSeverity[] {
  const ti = TIERS.indexOf(tier);
  const max = Math.min(5, 2 + Math.floor(ti / 2)); // F:2, E:2, D:3, C:3, B:4, A:4, S:5
  const out: EventSeverity[] = [];
  for (let s = 1 as EventSeverity; s <= max; s++) out.push(s as EventSeverity);
  return out;
}

export function getWorldEvent(id: string): WorldEventDef | null {
  return EVENTS.find((e) => e.id === id) ?? null;
}

function pickWeighted<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Tire un événement pour un biome de rang `tier`. Renvoie `null` si aucun événement
 * (probabilité EVENT_CHANCE). Déterministe si `rng` l'est.
 */
export function rollWorldEvent(tier: Tier, rng: () => number): string | null {
  if (rng() > EVENT_CHANCE) return null;
  const allowed = severitiesForTier(tier);
  const pool = EVENTS.filter((e) => allowed.includes(e.severity));
  if (pool.length === 0) return null;
  const sev = pickWeighted(allowed, allowed.map((s) => SEVERITY_WEIGHTS[s]), rng);
  const sameSeverity = pool.filter((e) => e.severity === sev);
  return sameSeverity[Math.floor(rng() * sameSeverity.length)].id;
}
