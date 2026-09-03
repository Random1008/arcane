import { ClassId } from "./classes";
import { Player } from "./world";

export type AbilityKind =
  | "projectile"
  | "aoe"
  | "buff"
  | "shield"
  | "heal"
  | "dash"
  | "summon"
  | "slow"
  | "trap"
  | "charge" // bond + dégâts + stun
  | "beam" // rayon continu en ligne
  | "execute" // dégâts + achève les ennemis sous un seuil de PV
  | "multihit" // rafale frontale (count coups)
  | "taunt" // provoque : −20% dégâts ennemis + attraction
  | "invis" // invisibilité (perte d'aggro + bonus dégâts)
  | "teleport" // téléportation vers la visée
  | "invuln" // Ω : invincibilité + buff (Mode Juggernaut)
  | "timestop" // Ω : fige tous les ennemis (Faille Temporelle)
  | "barrage"; // Ω : volée de projectiles guidés tout autour (Tempête Infinie)

export interface Ability {
  id: string;
  name: string;
  classId: ClassId;
  kind: AbilityKind;
  slot: number; // 0..3 → touches R / C / V / B
  cooldown: number;
  energyCost: number;
  power: number; // dégâts ou soin (fraction si heal)
  radius: number;
  count: number;
  duration: number;
  projectileSpeed: number;
  knockback: number;
  omega?: boolean; // capacité Ω ultime (endgame, débloquée par omegaUnlocked)
}

export const ABILITY_KEYS = ["R", "C", "V", "B"];

const A = (
  id: string,
  name: string,
  classId: ClassId,
  kind: AbilityKind,
  slot: number,
  cooldown: number,
  energyCost: number,
  p: Partial<Ability> = {},
): Ability => ({
  id,
  name,
  classId,
  kind,
  slot,
  cooldown,
  energyCost,
  power: p.power ?? 0,
  radius: p.radius ?? 0,
  count: p.count ?? 1,
  duration: p.duration ?? 0,
  projectileSpeed: p.projectileSpeed ?? 0,
  knockback: p.knockback ?? 0,
});

export const ABILITIES: Record<string, Ability> = {
  // Guerrier
  g_rage: A("g_rage", "Rage", "guerrier", "buff", 0, 10, 30, { duration: 5 }),
  g_coup_zone: A("g_coup_zone", "Coup de zone", "guerrier", "aoe", 1, 5, 25, { power: 25, radius: 110, knockback: 260 }),
  g_bouclier: A("g_bouclier", "Bouclier", "guerrier", "shield", 2, 12, 25, { duration: 2.0 }),
  g_charge: A("g_charge", "Charge", "guerrier", "charge", 3, 6, 25, { power: 200, radius: 90, knockback: 240, duration: 1.0 }),
  g_provocation: A("g_provocation", "Provocation", "guerrier", "taunt", 2, 10, 20, { radius: 200, duration: 6 }),
  g_tournoiement: A("g_tournoiement", "Lame tournoyante", "guerrier", "aoe", 0, 7, 35, { power: 22, radius: 120, knockback: 140 }),
  // Assassin
  a_dash: A("a_dash", "Dash fulgurant", "assassin", "dash", 0, 2.5, 15, { power: 240 }),
  a_lames: A("a_lames", "Tourbillon de lames", "assassin", "aoe", 1, 4, 20, { power: 18, radius: 80, knockback: 120 }),
  a_furtivite: A("a_furtivite", "Invisibilité", "assassin", "invis", 2, 12, 25, { duration: 3 }),
  a_multicoup: A("a_multicoup", "Multicoup", "assassin", "multihit", 1, 6, 25, { power: 10, count: 5, radius: 90, knockback: 80 }),
  a_execution: A("a_execution", "Exécution", "assassin", "execute", 3, 10, 30, { power: 30, count: 20, radius: 100, knockback: 60 }),
  a_teleport: A("a_teleport", "Téléportation", "assassin", "teleport", 0, 4, 20, {}),
  // Archer
  ar_multitir: A("ar_multitir", "Multi-tir", "archer", "projectile", 0, 3, 20, { power: 16, count: 3, projectileSpeed: 520, radius: 5 }),
  ar_gel: A("ar_gel", "Flèche de glace", "archer", "slow", 1, 6, 25, { radius: 160, duration: 3 }),
  ar_pluie: A("ar_pluie", "Pluie de flèches", "archer", "aoe", 2, 8, 35, { power: 28, radius: 160, knockback: 80 }),
  ar_explosive: A("ar_explosive", "Flèche explosive", "archer", "aoe", 1, 7, 30, { power: 34, radius: 120, knockback: 160 }),
  ar_feu: A("ar_feu", "Flèche de feu", "archer", "projectile", 0, 5, 25, { power: 26, count: 1, projectileSpeed: 540, radius: 8 }),
  ar_percant: A("ar_percant", "Tir perçant", "archer", "beam", 3, 6, 30, { power: 30, radius: 320 }),
  // Mage
  m_fireball: A("m_fireball", "Boule de feu", "mage", "projectile", 0, 2.5, 20, { power: 30, count: 1, projectileSpeed: 360, radius: 10 }),
  m_explosion: A("m_explosion", "Explosion", "mage", "aoe", 1, 6, 30, { power: 40, radius: 130, knockback: 200 }),
  m_gel: A("m_gel", "Gel", "mage", "slow", 2, 7, 25, { radius: 150, duration: 3 }),
  m_bouclier: A("m_bouclier", "Bouclier arcanique", "mage", "shield", 3, 12, 25, { duration: 1.8 }),
  m_nova: A("m_nova", "Nova", "mage", "aoe", 1, 7, 30, { power: 36, radius: 150, knockback: 220 }),
  m_rayon: A("m_rayon", "Rayon", "mage", "beam", 0, 5, 30, { power: 34, radius: 300 }),
  m_tempete: A("m_tempete", "Tempête électrique", "mage", "aoe", 2, 9, 40, { power: 30, radius: 180, knockback: 60 }),
  // Ingénieur
  i_mine: A("i_mine", "Mine", "ingenieur", "trap", 0, 4, 20, { power: 35, radius: 90 }),
  i_tourelle: A("i_tourelle", "Tourelle", "ingenieur", "summon", 1, 12, 35, { count: 1, duration: 12 }),
  i_heal: A("i_heal", "Kit de soin", "ingenieur", "heal", 2, 18, 30, { power: 0.35 }),
  i_grenade: A("i_grenade", "Grenade", "ingenieur", "aoe", 0, 4, 20, { power: 32, radius: 110, knockback: 180 }),
  i_drone: A("i_drone", "Drone", "ingenieur", "summon", 1, 14, 35, { count: 2, duration: 14 }),
  i_bouclier_zone: A("i_bouclier_zone", "Bouclier de zone", "ingenieur", "shield", 3, 14, 30, { duration: 3.0 }),
  // Nécromancien
  n_invocation: A("n_invocation", "Invocation", "necromancien", "summon", 0, 10, 35, { count: 3, duration: 12 }),
  n_malediction: A("n_malediction", "Malédiction", "necromancien", "slow", 1, 6, 25, { radius: 170, duration: 4 }),
  n_soin: A("n_soin", "Drain vital", "necromancien", "heal", 2, 20, 40, { power: 0.35 }),
  n_armee: A("n_armee", "Armée des morts", "necromancien", "summon", 0, 16, 50, { count: 6, duration: 14 }),
  n_explosion_cadavre: A("n_explosion_cadavre", "Explosion de cadavre", "necromancien", "aoe", 1, 7, 30, { power: 38, radius: 140, knockback: 160 }),
  n_forme_ombre: A("n_forme_ombre", "Forme d'ombre", "necromancien", "invis", 3, 14, 30, { duration: 4 }),
};

const O = (id: string, name: string, classId: ClassId, kind: AbilityKind, cooldown: number, energyCost: number, p: Partial<Ability> = {}): Ability => ({
  ...A(id, name, classId, kind, 3, cooldown, energyCost, p),
  omega: true, // ultime endgame, toujours sur le slot B
});

/** Capacités Ω ultimes (1 par classe), débloquées dès l'obtention d'un objet Ω (player.omegaUnlocked). */
export const OMEGA_ABILITIES: Record<ClassId, Ability> = {
  guerrier: O("og_juggernaut", "Mode Juggernaut", "guerrier", "invuln", 30, 60, { duration: 5 }),
  assassin: O("oa_faille", "Faille Temporelle", "assassin", "timestop", 25, 55, { duration: 2.5, radius: 900 }),
  archer: O("oar_tempete", "Tempête Infinie", "archer", "barrage", 25, 55, { power: 24, count: 18, projectileSpeed: 520, radius: 6 }),
  mage: O("om_apocalypse", "Apocalypse", "mage", "aoe", 30, 60, { power: 90, radius: 300, knockback: 240 }),
  ingenieur: O("oi_overclock", "Overclock Total", "ingenieur", "summon", 30, 60, { count: 8, duration: 16 }),
  necromancien: O("on_armee_infinie", "Armée Infinie", "necromancien", "summon", 30, 60, { count: 10, duration: 16 }),
};

/** Capacité Ω ultime d'une classe. */
export function classUltimate(classId: ClassId): Ability {
  return OMEGA_ABILITIES[classId];
}

export type PassiveStat = "maxHp" | "damageMul" | "speedMul" | "critAdd" | "defense" | "lifesteal";

export interface SkillNode {
  id: string;
  classId: ClassId;
  branch: string;
  name: string;
  desc: string;
  cost: number;
  maxRank: number;
  requires: string | null;
  effect: { kind: "passive"; stat: PassiveStat; perRank: number } | { kind: "ability"; abilityId: string };
}

// Arbres générés (workflow gen-classtrees), un par classe. (Injectés.)
export const SKILL_TREES: Record<ClassId, SkillNode[]> = {
  guerrier: [
    {"id":"gue-garde","classId":"guerrier","branch":"Défense","name":"Garde du gardien","desc":"Augmente vos points de vie pour mieux encaisser.","cost":1,"maxRank":5,"requires":null,"effect":{"kind":"passive","stat":"maxHp","perRank":20}},
    {"id":"gue-cuirasse","classId":"guerrier","branch":"Défense","name":"Cuirasse renforcée","desc":"Renforce votre armure et réduit les dégâts subis.","cost":1,"maxRank":5,"requires":"gue-garde","effect":{"kind":"passive","stat":"defense","perRank":10}},
    {"id":"gue-bouclier","classId":"guerrier","branch":"Défense","name":"Mur du rempart","desc":"Invoque un bouclier protecteur qui absorbe les coups.","cost":2,"maxRank":4,"requires":"gue-cuirasse","effect":{"kind":"ability","abilityId":"g_bouclier"}},
    {"id":"gue-force","classId":"guerrier","branch":"Offense","name":"Force brute","desc":"Augmente la puissance de vos attaques.","cost":1,"maxRank":5,"requires":null,"effect":{"kind":"passive","stat":"damageMul","perRank":0.06}},
    {"id":"gue-coup-zone","classId":"guerrier","branch":"Offense","name":"Frappe tellurique","desc":"Assène un coup dévastateur frappant tous les ennemis autour.","cost":2,"maxRank":4,"requires":"gue-force","effect":{"kind":"ability","abilityId":"g_coup_zone"}},
    {"id":"gue-tranchant","classId":"guerrier","branch":"Offense","name":"Lame affûtée","desc":"Aiguise vos coups pour des frappes critiques plus fréquentes.","cost":1,"maxRank":4,"requires":"gue-force","effect":{"kind":"passive","stat":"critAdd","perRank":0.03}},
    {"id":"gue-fureur","classId":"guerrier","branch":"Berserk","name":"Soif de combat","desc":"Draine la vie des ennemis frappés pour vous soigner.","cost":1,"maxRank":4,"requires":null,"effect":{"kind":"passive","stat":"lifesteal","perRank":0.03}},
    {"id":"gue-rage","classId":"guerrier","branch":"Berserk","name":"Rage sanguinaire","desc":"Entre dans une rage qui décuple votre puissance offensive.","cost":2,"maxRank":4,"requires":"gue-fureur","effect":{"kind":"ability","abilityId":"g_rage"}},
    {"id":"gue-frenesie","classId":"guerrier","branch":"Berserk","name":"Frénésie","desc":"Augmente votre vitesse de déplacement dans le feu de l'action.","cost":1,"maxRank":4,"requires":"gue-fureur","effect":{"kind":"passive","stat":"speedMul","perRank":0.04}},
    {"id":"gue-provocation","classId":"guerrier","branch":"Défense","name":"Cri de guerre","desc":"Provoque les ennemis proches : ils frappent plus faiblement (−20%).","cost":2,"maxRank":3,"requires":"gue-garde","effect":{"kind":"ability","abilityId":"g_provocation"}},
    {"id":"gue-charge","classId":"guerrier","branch":"Offense","name":"Charge héroïque","desc":"S'élance, percute et étourdit les ennemis sur son passage.","cost":2,"maxRank":3,"requires":"gue-force","effect":{"kind":"ability","abilityId":"g_charge"}},
    {"id":"gue-tournoiement","classId":"guerrier","branch":"Berserk","name":"Lame tournoyante","desc":"Fait tournoyer votre arme, frappant tout autour de vous.","cost":2,"maxRank":3,"requires":"gue-fureur","effect":{"kind":"ability","abilityId":"g_tournoiement"}},
  ],
  assassin: [
    {"id":"ass-precision","classId":"assassin","branch":"Critique","name":"Œil mortel","desc":"Améliore vos chances de porter un coup critique.","cost":1,"maxRank":5,"requires":null,"effect":{"kind":"passive","stat":"critAdd","perRank":0.04}},
    {"id":"ass-lames","classId":"assassin","branch":"Critique","name":"Danse des lames","desc":"Déchaîne une rafale de lames tranchantes sur la cible.","cost":2,"maxRank":4,"requires":"ass-precision","effect":{"kind":"ability","abilityId":"a_lames"}},
    {"id":"ass-saignee","classId":"assassin","branch":"Critique","name":"Saignée","desc":"Augmente les dégâts infligés par vos attaques sournoises.","cost":1,"maxRank":5,"requires":"ass-precision","effect":{"kind":"passive","stat":"damageMul","perRank":0.05}},
    {"id":"ass-ombre","classId":"assassin","branch":"Furtivité","name":"Pas de l'ombre","desc":"Draine la vie de vos victimes lors de vos frappes.","cost":1,"maxRank":4,"requires":null,"effect":{"kind":"passive","stat":"lifesteal","perRank":0.03}},
    {"id":"ass-furtivite","classId":"assassin","branch":"Furtivité","name":"Voile d'invisibilité","desc":"Disparaît dans l'ombre pour échapper aux regards ennemis.","cost":2,"maxRank":4,"requires":"ass-ombre","effect":{"kind":"ability","abilityId":"a_furtivite"}},
    {"id":"ass-discretion","classId":"assassin","branch":"Furtivité","name":"Silence mortel","desc":"Renforce votre vitalité pour survivre en territoire ennemi.","cost":1,"maxRank":4,"requires":"ass-ombre","effect":{"kind":"passive","stat":"maxHp","perRank":15}},
    {"id":"ass-agilite","classId":"assassin","branch":"Mobilité","name":"Agilité féline","desc":"Augmente votre vitesse de déplacement.","cost":1,"maxRank":5,"requires":null,"effect":{"kind":"passive","stat":"speedMul","perRank":0.05}},
    {"id":"ass-dash","classId":"assassin","branch":"Mobilité","name":"Bond fulgurant","desc":"S'élance d'un bond éclair pour traverser le champ de bataille.","cost":2,"maxRank":4,"requires":"ass-agilite","effect":{"kind":"ability","abilityId":"a_dash"}},
    {"id":"ass-esquive","classId":"assassin","branch":"Mobilité","name":"Réflexes aiguisés","desc":"Améliore votre défense grâce à des esquives instinctives.","cost":1,"maxRank":4,"requires":"ass-agilite","effect":{"kind":"passive","stat":"defense","perRank":7}},
    {"id":"ass-multicoup","classId":"assassin","branch":"Critique","name":"Multicoup","desc":"Déchaîne une rafale de coups instantanés devant vous.","cost":2,"maxRank":3,"requires":"ass-precision","effect":{"kind":"ability","abilityId":"a_multicoup"}},
    {"id":"ass-execution","classId":"assassin","branch":"Furtivité","name":"Exécution","desc":"Achève les ennemis dont les points de vie sont bas.","cost":2,"maxRank":3,"requires":"ass-ombre","effect":{"kind":"ability","abilityId":"a_execution"}},
    {"id":"ass-teleport","classId":"assassin","branch":"Mobilité","name":"Pas de l'ombre","desc":"Se téléporte instantanément vers le point visé.","cost":2,"maxRank":3,"requires":"ass-agilite","effect":{"kind":"ability","abilityId":"a_teleport"}},
  ],
  archer: [
    {"id":"arc-visee","classId":"archer","branch":"Précision","name":"Visée parfaite","desc":"Augmente vos chances de coup critique à distance.","cost":1,"maxRank":5,"requires":null,"effect":{"kind":"passive","stat":"critAdd","perRank":0.04}},
    {"id":"arc-tir-puissant","classId":"archer","branch":"Précision","name":"Tir puissant","desc":"Renforce la puissance de chacune de vos flèches.","cost":1,"maxRank":5,"requires":"arc-visee","effect":{"kind":"passive","stat":"damageMul","perRank":0.05}},
    {"id":"arc-multitir","classId":"archer","branch":"Multi-tir","name":"Volée multiple","desc":"Décoche plusieurs flèches simultanément en éventail.","cost":2,"maxRank":4,"requires":null,"effect":{"kind":"ability","abilityId":"ar_multitir"}},
    {"id":"arc-pluie","classId":"archer","branch":"Multi-tir","name":"Pluie de flèches","desc":"Fait pleuvoir une averse de flèches sur une zone.","cost":2,"maxRank":4,"requires":"arc-multitir","effect":{"kind":"ability","abilityId":"ar_pluie"}},
    {"id":"arc-carquois","classId":"archer","branch":"Multi-tir","name":"Carquois sans fin","desc":"Augmente votre vitesse pour repositionner vos tirs.","cost":1,"maxRank":4,"requires":"arc-multitir","effect":{"kind":"passive","stat":"speedMul","perRank":0.04}},
    {"id":"arc-elements","classId":"archer","branch":"Élémentaire","name":"Flèches enchantées","desc":"Imprègne vos flèches d'énergie pour plus de dégâts.","cost":1,"maxRank":5,"requires":null,"effect":{"kind":"passive","stat":"damageMul","perRank":0.05}},
    {"id":"arc-gel","classId":"archer","branch":"Élémentaire","name":"Trait de givre","desc":"Décoche une flèche glaciale qui ralentit et gèle l'ennemi.","cost":2,"maxRank":4,"requires":"arc-elements","effect":{"kind":"ability","abilityId":"ar_gel"}},
    {"id":"arc-resistance","classId":"archer","branch":"Élémentaire","name":"Endurance du chasseur","desc":"Renforce votre vitalité face aux dangers de la nature.","cost":1,"maxRank":4,"requires":"arc-elements","effect":{"kind":"passive","stat":"maxHp","perRank":15}},
    {"id":"arc-percant","classId":"archer","branch":"Précision","name":"Tir perçant","desc":"Décoche un trait qui transperce tout sur une ligne.","cost":2,"maxRank":3,"requires":"arc-visee","effect":{"kind":"ability","abilityId":"ar_percant"}},
    {"id":"arc-explosive","classId":"archer","branch":"Multi-tir","name":"Flèche explosive","desc":"Tire une flèche qui explose en zone à l'impact.","cost":2,"maxRank":3,"requires":"arc-multitir","effect":{"kind":"ability","abilityId":"ar_explosive"}},
    {"id":"arc-feu","classId":"archer","branch":"Élémentaire","name":"Flèche de feu","desc":"Décoche une flèche enflammée à fort impact.","cost":2,"maxRank":3,"requires":"arc-elements","effect":{"kind":"ability","abilityId":"ar_feu"}},
  ],
  mage: [
    {"id":"mag-arcane","classId":"mage","branch":"Destruction","name":"Maîtrise arcanique","desc":"Augmente la puissance de tous vos sorts.","cost":1,"maxRank":5,"requires":null,"effect":{"kind":"passive","stat":"damageMul","perRank":0.06}},
    {"id":"mag-fireball","classId":"mage","branch":"Destruction","name":"Boule de feu","desc":"Projette une sphère ardente qui explose à l'impact.","cost":2,"maxRank":5,"requires":"mag-arcane","effect":{"kind":"ability","abilityId":"m_fireball"}},
    {"id":"mag-explosion","classId":"mage","branch":"Destruction","name":"Détonation arcanique","desc":"Déclenche une explosion magique dévastatrice en zone.","cost":2,"maxRank":4,"requires":"mag-fireball","effect":{"kind":"ability","abilityId":"m_explosion"}},
    {"id":"mag-focalisation","classId":"mage","branch":"Contrôle","name":"Focalisation mentale","desc":"Aiguise votre esprit pour des sorts critiques plus fréquents.","cost":1,"maxRank":4,"requires":null,"effect":{"kind":"passive","stat":"critAdd","perRank":0.03}},
    {"id":"mag-gel","classId":"mage","branch":"Contrôle","name":"Nova de givre","desc":"Libère une vague de glace qui gèle les ennemis alentour.","cost":2,"maxRank":4,"requires":"mag-focalisation","effect":{"kind":"ability","abilityId":"m_gel"}},
    {"id":"mag-celerite","classId":"mage","branch":"Contrôle","name":"Célérité mystique","desc":"Augmente votre vitesse pour mieux kiter vos ennemis.","cost":1,"maxRank":4,"requires":"mag-focalisation","effect":{"kind":"passive","stat":"speedMul","perRank":0.04}},
    {"id":"mag-ward","classId":"mage","branch":"Défense magique","name":"Peau de pierre","desc":"Renforce votre armure par enchantement protecteur.","cost":1,"maxRank":5,"requires":null,"effect":{"kind":"passive","stat":"defense","perRank":10}},
    {"id":"mag-bouclier","classId":"mage","branch":"Défense magique","name":"Barrière arcanique","desc":"Érige un bouclier de mana qui absorbe les dégâts.","cost":2,"maxRank":4,"requires":"mag-ward","effect":{"kind":"ability","abilityId":"m_bouclier"}},
    {"id":"mag-vitalite","classId":"mage","branch":"Défense magique","name":"Réserve vitale","desc":"Augmente vos points de vie grâce à l'énergie arcanique.","cost":1,"maxRank":4,"requires":"mag-ward","effect":{"kind":"passive","stat":"maxHp","perRank":15}},
    {"id":"mag-rayon","classId":"mage","branch":"Destruction","name":"Rayon arcanique","desc":"Projette un faisceau continu qui transperce une ligne d'ennemis.","cost":2,"maxRank":3,"requires":"mag-arcane","effect":{"kind":"ability","abilityId":"m_rayon"}},
    {"id":"mag-tempete","classId":"mage","branch":"Destruction","name":"Tempête électrique","desc":"Déchaîne une large décharge foudroyante autour de vous.","cost":2,"maxRank":3,"requires":"mag-fireball","effect":{"kind":"ability","abilityId":"m_tempete"}},
    {"id":"mag-nova","classId":"mage","branch":"Contrôle","name":"Nova de givre","desc":"Libère une onde glaciale explosive tout autour de vous.","cost":2,"maxRank":3,"requires":"mag-focalisation","effect":{"kind":"ability","abilityId":"m_nova"}},
  ],
  ingenieur: [
    {"id":"ing-mecanisme","classId":"ingenieur","branch":"Pièges","name":"Mécanismes affûtés","desc":"Augmente les dégâts de vos pièges et engins.","cost":1,"maxRank":5,"requires":null,"effect":{"kind":"passive","stat":"damageMul","perRank":0.05}},
    {"id":"ing-mine","classId":"ingenieur","branch":"Pièges","name":"Mine explosive","desc":"Pose une mine qui détone au passage des ennemis.","cost":2,"maxRank":4,"requires":"ing-mecanisme","effect":{"kind":"ability","abilityId":"i_mine"}},
    {"id":"ing-detonateur","classId":"ingenieur","branch":"Pièges","name":"Détonateur sensible","desc":"Améliore vos critiques sur les engins piégés.","cost":1,"maxRank":4,"requires":"ing-mecanisme","effect":{"kind":"passive","stat":"critAdd","perRank":0.03}},
    {"id":"ing-ingenierie","classId":"ingenieur","branch":"Robotique","name":"Ingénierie avancée","desc":"Renforce la résistance de vos constructions et la vôtre.","cost":1,"maxRank":5,"requires":null,"effect":{"kind":"passive","stat":"defense","perRank":10}},
    {"id":"ing-tourelle","classId":"ingenieur","branch":"Robotique","name":"Tourelle automatisée","desc":"Déploie une tourelle qui tire automatiquement sur les ennemis.","cost":2,"maxRank":4,"requires":"ing-ingenierie","effect":{"kind":"ability","abilityId":"i_tourelle"}},
    {"id":"ing-blindage","classId":"ingenieur","branch":"Robotique","name":"Blindage lourd","desc":"Augmente vos points de vie grâce à un exosquelette renforcé.","cost":1,"maxRank":4,"requires":"ing-ingenierie","effect":{"kind":"passive","stat":"maxHp","perRank":20}},
    {"id":"ing-logistique","classId":"ingenieur","branch":"Support","name":"Logistique optimisée","desc":"Augmente votre vitesse de déploiement sur le terrain.","cost":1,"maxRank":4,"requires":null,"effect":{"kind":"passive","stat":"speedMul","perRank":0.04}},
    {"id":"ing-heal","classId":"ingenieur","branch":"Support","name":"Drone de soin","desc":"Active un module qui restaure progressivement votre santé.","cost":2,"maxRank":4,"requires":"ing-logistique","effect":{"kind":"ability","abilityId":"i_heal"}},
    {"id":"ing-recyclage","classId":"ingenieur","branch":"Support","name":"Recyclage énergétique","desc":"Convertit les dégâts infligés en récupération de vie.","cost":1,"maxRank":4,"requires":"ing-logistique","effect":{"kind":"passive","stat":"lifesteal","perRank":0.03}},
    {"id":"ing-grenade","classId":"ingenieur","branch":"Pièges","name":"Grenade","desc":"Lance une grenade qui explose immédiatement en zone.","cost":2,"maxRank":3,"requires":"ing-mecanisme","effect":{"kind":"ability","abilityId":"i_grenade"}},
    {"id":"ing-drone","classId":"ingenieur","branch":"Robotique","name":"Drone de combat","desc":"Déploie des drones qui pourchassent et frappent l'ennemi.","cost":2,"maxRank":3,"requires":"ing-ingenierie","effect":{"kind":"ability","abilityId":"i_drone"}},
    {"id":"ing-bouclier-zone","classId":"ingenieur","branch":"Support","name":"Bouclier de zone","desc":"Érige un champ protecteur qui absorbe les dégâts.","cost":2,"maxRank":3,"requires":"ing-logistique","effect":{"kind":"ability","abilityId":"i_bouclier_zone"}},
  ],
  necromancien: [
    {"id":"nec-legion","classId":"necromancien","branch":"Invocation","name":"Légion des morts","desc":"Augmente la puissance de vos serviteurs et sorts.","cost":1,"maxRank":5,"requires":null,"effect":{"kind":"passive","stat":"damageMul","perRank":0.05}},
    {"id":"nec-invocation","classId":"necromancien","branch":"Invocation","name":"Invocation des squelettes","desc":"Relève des serviteurs squelettiques pour combattre à vos côtés.","cost":2,"maxRank":5,"requires":"nec-legion","effect":{"kind":"ability","abilityId":"n_invocation"}},
    {"id":"nec-osseux","classId":"necromancien","branch":"Invocation","name":"Armure d'os","desc":"Renforce votre défense d'une carapace d'ossements.","cost":1,"maxRank":4,"requires":"nec-legion","effect":{"kind":"passive","stat":"defense","perRank":8}},
    {"id":"nec-affliction","classId":"necromancien","branch":"Malédictions","name":"Affliction grandissante","desc":"Accroît les chances de critique de vos sorts maudits.","cost":1,"maxRank":4,"requires":null,"effect":{"kind":"passive","stat":"critAdd","perRank":0.03}},
    {"id":"nec-malediction","classId":"necromancien","branch":"Malédictions","name":"Malédiction funeste","desc":"Maudit les ennemis, affaiblissant leur résistance.","cost":2,"maxRank":4,"requires":"nec-affliction","effect":{"kind":"ability","abilityId":"n_malediction"}},
    {"id":"nec-fleau","classId":"necromancien","branch":"Malédictions","name":"Fléau rampant","desc":"Augmente les dégâts infligés aux cibles maudites.","cost":1,"maxRank":4,"requires":"nec-affliction","effect":{"kind":"passive","stat":"damageMul","perRank":0.05}},
    {"id":"nec-vampirisme","classId":"necromancien","branch":"Sacrifice","name":"Pacte de sang","desc":"Draine la vie de vos ennemis pour vous régénérer.","cost":1,"maxRank":4,"requires":null,"effect":{"kind":"passive","stat":"lifesteal","perRank":0.04}},
    {"id":"nec-soin","classId":"necromancien","branch":"Sacrifice","name":"Transfusion impie","desc":"Convertit l'énergie nécrotique en soins puissants.","cost":2,"maxRank":4,"requires":"nec-vampirisme","effect":{"kind":"ability","abilityId":"n_soin"}},
    {"id":"nec-resilience","classId":"necromancien","branch":"Sacrifice","name":"Chair éternelle","desc":"Augmente vos points de vie par la magie nécrotique.","cost":1,"maxRank":4,"requires":"nec-vampirisme","effect":{"kind":"passive","stat":"maxHp","perRank":20}},
    {"id":"nec-armee","classId":"necromancien","branch":"Invocation","name":"Armée des morts","desc":"Relève une nuée de serviteurs qui submergent l'ennemi.","cost":2,"maxRank":3,"requires":"nec-invocation","effect":{"kind":"ability","abilityId":"n_armee"}},
    {"id":"nec-cadavre","classId":"necromancien","branch":"Malédictions","name":"Explosion de cadavre","desc":"Fait détoner l'énergie nécrotique en une explosion de zone.","cost":2,"maxRank":3,"requires":"nec-affliction","effect":{"kind":"ability","abilityId":"n_explosion_cadavre"}},
    {"id":"nec-ombre","classId":"necromancien","branch":"Sacrifice","name":"Forme d'ombre","desc":"Se dissout dans les ténèbres, invisible aux ennemis.","cost":2,"maxRank":3,"requires":"nec-vampirisme","effect":{"kind":"ability","abilityId":"n_forme_ombre"}},
  ],
};

function tree(player: Player): SkillNode[] {
  return player.class ? (SKILL_TREES[player.class] ?? []) : []; // classe inconnue → [] (ne casse pas le tick)
}

export function rankOf(player: Player, nodeId: string): number {
  return player.skills[nodeId] ?? 0;
}

export function canUnlock(player: Player, nodeId: string): { ok: boolean; reason?: string } {
  if (!player.class) return { ok: false, reason: "no-class" };
  const node = tree(player).find((n) => n.id === nodeId);
  if (!node) return { ok: false, reason: "no-node" };
  if (rankOf(player, nodeId) >= node.maxRank) return { ok: false, reason: "max-rank" };
  if (player.skillPoints < node.cost) return { ok: false, reason: "no-points" };
  if (node.requires && rankOf(player, node.requires) < 1) return { ok: false, reason: "locked" };
  return { ok: true };
}

export function unlockNode(player: Player, nodeId: string): boolean {
  if (!canUnlock(player, nodeId).ok) return false;
  const node = tree(player).find((n) => n.id === nodeId)!;
  player.skillPoints -= node.cost;
  player.skills[nodeId] = rankOf(player, nodeId) + 1;
  return true;
}

/** Rend tous les points dépensés et vide l'arbre. Renvoie le nb de points rendus. */
export function respec(player: Player): number {
  let refunded = 0;
  for (const node of tree(player)) {
    const r = rankOf(player, node.id);
    if (r > 0) refunded += r * node.cost;
  }
  player.skillPoints += refunded;
  player.skills = {};
  player.loadout = [null, null, null, null]; // les capacités sont retirées → loadout réinitialisé
  return refunded;
}

/** Change de classe : respec automatique (les points de l'ancienne classe sont rendus). */
export function setClass(player: Player, classId: ClassId): void {
  respec(player);
  player.class = classId;
}

export interface SkillPassives {
  maxHp: number;
  damageMul: number;
  speedMul: number;
  critAdd: number;
  defense: number;
  lifesteal: number;
}

export function skillPassives(player: Player): SkillPassives {
  const acc: SkillPassives = { maxHp: 0, damageMul: 0, speedMul: 0, critAdd: 0, defense: 0, lifesteal: 0 };
  for (const node of tree(player)) {
    const r = rankOf(player, node.id);
    if (r > 0 && node.effect.kind === "passive") acc[node.effect.stat] += node.effect.perRank * r;
  }
  return acc;
}

/** Capacités débloquées (rang ≥ 1 du nœud qui les porte) avec leur niveau. */
export function unlockedAbilities(player: Player): { ability: Ability; level: number }[] {
  const out: { ability: Ability; level: number }[] = [];
  for (const node of tree(player)) {
    if (node.effect.kind === "ability") {
      const r = rankOf(player, node.id);
      const ab = ABILITIES[node.effect.abilityId];
      if (r > 0 && ab) out.push({ ability: ab, level: r });
    }
  }
  // capacité Ω ultime : disponible dès qu'un objet Ω a été obtenu (endgame), sur le slot B
  if (player.class && player.omegaUnlocked) out.push({ ability: OMEGA_ABILITIES[player.class], level: 1 });
  return out;
}

/** Capacités débloquées rattachées à un slot par défaut (0..3), avec leur niveau. */
export function unlockedAbilitiesForSlot(player: Player, slot: number): { ability: Ability; level: number }[] {
  return unlockedAbilities(player).filter((a) => a.ability.slot === slot);
}

/**
 * Capacité ACTIVE d'un slot (0..3) : le choix de loadout du joueur s'il est valide (capacité
 * débloquée pour ce slot), sinon la première capacité débloquée du slot (comportement par défaut,
 * compatible avec les sauvegardes sans loadout).
 */
export function abilityForSlot(player: Player, slot: number): { ability: Ability; level: number } | null {
  const options = unlockedAbilitiesForSlot(player, slot);
  if (options.length === 0) return null;
  const chosen = player.loadout?.[slot];
  if (chosen) {
    const match = options.find((a) => a.ability.id === chosen);
    if (match) return match;
  }
  return options[0];
}

/** Fait défiler la capacité équipée d'un slot vers la suivante débloquée. Renvoie l'id choisi (ou null). */
export function cycleLoadout(player: Player, slot: number): string | null {
  const options = unlockedAbilitiesForSlot(player, slot);
  if (options.length === 0) return null;
  if (!player.loadout) player.loadout = [null, null, null, null];
  const cur = abilityForSlot(player, slot);
  const idx = cur ? options.findIndex((a) => a.ability.id === cur.ability.id) : -1;
  const next = options[(idx + 1) % options.length];
  player.loadout[slot] = next.ability.id;
  return next.ability.id;
}
