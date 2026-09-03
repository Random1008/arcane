export type ClassId = "guerrier" | "assassin" | "archer" | "mage" | "ingenieur" | "necromancien";

/** Niveau requis pour débloquer le choix de classe et l'arbre de compétences. */
export const CLASS_UNLOCK_LEVEL = 5;
export function canChooseClass(level: number): boolean {
  return level >= CLASS_UNLOCK_LEVEL;
}

export const CLASS_IDS: ClassId[] = ["guerrier", "assassin", "archer", "mage", "ingenieur", "necromancien"];

export interface ClassDef {
  id: ClassId;
  name: string;
  desc: string;
  branches: [string, string, string];
}

export const CLASS_DEFS: Record<ClassId, ClassDef> = {
  guerrier: { id: "guerrier", name: "Guerrier", desc: "Tank de mêlée : résistant, dégâts constants.", branches: ["Défense", "Offense", "Berserk"] },
  assassin: { id: "assassin", name: "Assassin", desc: "Rapide et fragile, gros dégâts critiques.", branches: ["Critique", "Furtivité", "Mobilité"] },
  archer: { id: "archer", name: "Archer", desc: "Longue portée, kite et précision.", branches: ["Précision", "Multi-tir", "Élémentaire"] },
  mage: { id: "mage", name: "Mage", desc: "Burst magique puissant, fragile.", branches: ["Destruction", "Contrôle", "Défense magique"] },
  ingenieur: { id: "ingenieur", name: "Ingénieur", desc: "Gadgets, pièges, contrôle du terrain.", branches: ["Pièges", "Robotique", "Support"] },
  necromancien: { id: "necromancien", name: "Nécromancien", desc: "Invoque des créatures, affaiblit l'ennemi.", branches: ["Invocation", "Malédictions", "Sacrifice"] },
};
