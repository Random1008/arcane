export type HubNpcAction = "none" | "heal" | "craft" | "classtree" | "respec" | "shop";
export type LockedRank = "S" | "omega";

export interface HubNpcDef {
  name: string;
  role: string;
  lines: string[];
  lockedRank?: LockedRank; // verrouillé tant que ce rang n'est pas atteint
  action?: HubNpcAction; // action déclenchée au dialogue
}

// Hub du Sanctuaire (cf. game/idea/pnj.md). Les rangs S/Ω sont verrouillés jusqu'au déblocage.
export const HUB_NPCS: HubNpcDef[] = [
  // — Rang F : toujours disponibles —
  {
    name: "Brak",
    role: "Forgeron",
    action: "craft",
    lines: [
      "Brak, forgeron de mon état. J'améliore les armes et je transforme le métal.",
      "Tu as une arme de tier S et de l'Omganium ? Je peux la reforger en Ω, ici et maintenant.",
    ],
  },
  {
    name: "Lira",
    role: "Couturière",
    lines: [
      "Lira, à ton service. Je travaille les armures et y couds des bonus.",
      "Apporte-moi des peaux et tissus rares, et je renforcerai ta protection. (à venir)",
    ],
  },
  {
    name: "Eldrin",
    role: "Mage",
    lines: [
      "Je suis Eldrin. Les compétences et la magie, c'est mon domaine.",
      "Dash amélioré, boule de feu, téléportation... bientôt, je t'enseignerai tout cela. (à venir)",
    ],
  },
  {
    name: "Rogan",
    role: "Chasseur de quêtes",
    lines: [
      "Rogan. Si tu cherches du travail, j'ai toujours une mission ou deux.",
      "Tuer des monstres, abattre un boss, retrouver un objet... reviens, le tableau se remplira. (à venir)",
    ],
  },
  {
    name: "Tibo",
    role: "Marchand",
    action: "shop",
    lines: [
      "Tibo, marchand ambulant ! J'achète, je vends, je rachète.",
      "Mon étal change chaque jour — passe voir les arrivages !",
    ],
  },
  {
    name: "Mira",
    role: "Alchimiste",
    action: "heal",
    lines: [
      "Mira, alchimiste. Bois donc — voilà, te revoilà sur pied.",
      "Mes potions de boost et de résistance arriveront bientôt. (à venir)",
    ],
  },
  {
    name: "Kael",
    role: "Explorateur",
    lines: [
      "Kael, j'ai arpenté chaque recoin du monde connu.",
      "Je révélerai bientôt les zones cachées et les indices de donjons secrets. (à venir)",
    ],
  },
  {
    name: "Maître des Classes",
    role: "Classes & arbre",
    action: "classtree",
    lines: [
      "Chaque héros suit une voie. Guerrier, Assassin, Archer, Mage, Ingénieur, Nécromancien...",
      "Choisis ta classe et façonne ton arbre de compétences. Reviens dès que tu gagnes des niveaux.",
    ],
  },

  // — Rang S : débloqués en atteignant le rang S —
  {
    name: "Garde de l'Omganium",
    role: "Gardien Ω",
    lockedRank: "S",
    action: "craft",
    lines: [
      "Peu parviennent jusqu'à moi. Je veille sur le secret de l'Omganium.",
      "Une arme S et un fragment d'Omganium : voilà le prix d'une arme Ω. Approche.",
    ],
  },
  {
    name: "Maître d'armes",
    role: "Builds avancés",
    lockedRank: "S",
    lines: ["Tu as survécu jusqu'au rang S ? Bien. Je t'apprendrai les combos et styles de combat. (à venir)"],
  },
  {
    name: "Entraîneur",
    role: "Réinitialisation",
    lockedRank: "S",
    action: "respec",
    lines: ["Je réinitialise ton arbre de compétences et te rends tous tes points. Reforge ton build à ta guise."],
  },
  {
    name: "Courtier",
    role: "Marché",
    lockedRank: "S",
    lines: ["Le grand marché : trading et enchères entre aventuriers. Patience, il ouvrira. (à venir)"],
  },

  // — Rang Ω : débloqués en obtenant un objet Ω —
  {
    name: "Voyageur du Néant",
    role: "Marchand Ω",
    lockedRank: "omega",
    lines: ["Tu portes la marque du Ω... alors nous pouvons parler. Je vends l'impossible, à prix terrible. (à venir)"],
  },
  {
    name: "Chrono Marchand",
    role: "Échange temporel",
    lockedRank: "omega",
    lines: ["Donne-moi ton temps — ton expérience — et je te donnerai des trésors. Tentant, non ? (à venir)"],
  },
  {
    name: "Forgeron interdit",
    role: "Craft Ω avancé",
    lockedRank: "omega",
    lines: ["On m'a banni pour mes forges instables. Elles confèrent des pouvoirs... et des malédictions. (à venir)"],
  },
];
