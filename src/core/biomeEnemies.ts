import { Archetype } from "./enemies";

export interface EnemyType {
  name: string;
  archetype: Archetype;
}

// Données générées (workflow gen-enemy-sets) : 2-3 types d'ennemis thématiques par biome.
// (injectées)
export const BIOME_ENEMIES: Record<string, EnemyType[]> = {
  "plains": [{ name: "Lapin enragé", archetype: "swarmer" }, { name: "Sanglier des champs", archetype: "chaser" }, { name: "Épouvantail tireur", archetype: "shooter" }],
  "forest": [{ name: "Louveteau affamé", archetype: "swarmer" }, { name: "Sylphe archère", archetype: "shooter" }, { name: "Ours brun gardien", archetype: "brute" }],
  "cave": [{ name: "Chauve-souris vorace", archetype: "swarmer" }, { name: "Champignon explosif", archetype: "bomber" }, { name: "Golem de gravats", archetype: "brute" }],
  "river": [{ name: "Grenouille bondissante", archetype: "chaser" }, { name: "Poisson-archer", archetype: "shooter" }, { name: "Têtard pétomane", archetype: "bomber" }],
  "swamp": [{ name: "Sangsue bondissante", archetype: "swarmer" }, { name: "Crapaud cracheur", archetype: "shooter" }, { name: "Colosse de tourbe", archetype: "brute" }],
  "windy_hills": [{ name: "Faucon piqueur", archetype: "chaser" }, { name: "Frondeur des crêtes", archetype: "shooter" }, { name: "Spore portée par le vent", archetype: "bomber" }],
  "dark_woods": [{ name: "Meute d'ombre", archetype: "swarmer" }, { name: "Sylvain rancunier", archetype: "brute" }, { name: "Veneur fantôme", archetype: "shooter" }],
  "tourbiere_blafarde": [{ name: "Feu follet blafard", archetype: "chaser" }, { name: "Vessie de méthane", archetype: "bomber" }, { name: "Noyé suintant", archetype: "shooter" }],
  "ravines_rouille": [{ name: "Automate corrodé", archetype: "brute" }, { name: "Drone de ferraille", archetype: "swarmer" }, { name: "Tourelle rouillée", archetype: "shooter" }],
  "desert": [{ name: "Scorpion des dunes", archetype: "chaser" }, { name: "Lanceur de sable", archetype: "shooter" }, { name: "Colosse de grès", archetype: "brute" }],
  "tundra": [{ name: "Meute givrée", archetype: "swarmer" }, { name: "Archer de glace", archetype: "shooter" }, { name: "Ours des neiges", archetype: "brute" }],
  "toxic_marsh": [{ name: "Crapaud pestilentiel", archetype: "bomber" }, { name: "Cracheur de venin", archetype: "shooter" }, { name: "Sangsue rampante", archetype: "chaser" }],
  "steppe_brulee": [{ name: "Charognard ardent", archetype: "chaser" }, { name: "Braise vivante", archetype: "bomber" }, { name: "Nuée de cendres", archetype: "swarmer" }],
  "salines_gelees": [{ name: "Éclat de sel", archetype: "swarmer" }, { name: "Frondeur de saumure", archetype: "shooter" }, { name: "Mastodonte de givre", archetype: "brute" }],
  "canyon_poussiere": [{ name: "Vautour des falaises", archetype: "chaser" }, { name: "Tireur embusqué", archetype: "shooter" }, { name: "Tatou explosif", archetype: "bomber" }],
  "mountains": [{ name: "Aigle des cimes", archetype: "swarmer" }, { name: "Colosse de granit", archetype: "brute" }, { name: "Frondeur de la corniche", archetype: "shooter" }],
  "jungle": [{ name: "Panthère bondissante", archetype: "chaser" }, { name: "Sarbacanier sylvestre", archetype: "shooter" }, { name: "Crapaud venimeux", archetype: "bomber" }],
  "ruins": [{ name: "Gardien de marbre", archetype: "brute" }, { name: "Spectre vengeur", archetype: "chaser" }, { name: "Sentinelle arbalétrière", archetype: "shooter" }],
  "foret_petrifiee": [{ name: "Sylphe d'écorce calcaire", archetype: "swarmer" }, { name: "Tréant pétrifié", archetype: "brute" }, { name: "Cocon de sève figée", archetype: "bomber" }],
  "gorges_oubli": [{ name: "Ombre rampante", archetype: "chaser" }, { name: "Cracheur d'abîme", archetype: "shooter" }, { name: "Lucioles d'oubli", archetype: "swarmer" }],
  "steppe_ossements": [{ name: "Cavalier décharné", archetype: "chaser" }, { name: "Archer ossuaire", archetype: "shooter" }, { name: "Charognard pestilentiel", archetype: "bomber" }],
  "plateau_fumerolles": [{ name: "Élémentaire de soufre", archetype: "brute" }, { name: "Geyser ambulant", archetype: "bomber" }, { name: "Salamandre des fumées", archetype: "swarmer" }],
  "volcano": [{ name: "Salamandre de magma", archetype: "chaser" }, { name: "Colosse d'obsidienne", archetype: "brute" }, { name: "Crapaud de cendres ardentes", archetype: "bomber" }],
  "ice_floe": [{ name: "Archer de givre", archetype: "shooter" }, { name: "Ours des neiges enragé", archetype: "brute" }, { name: "Esquille de glace", archetype: "swarmer" }],
  "catacombs": [{ name: "Liche osseuse", archetype: "shooter" }, { name: "Goule charognarde", archetype: "chaser" }, { name: "Crâne hurlant", archetype: "bomber" }],
  "mer_cendres": [{ name: "Spectre de suie", archetype: "chaser" }, { name: "Titan de scories", archetype: "brute" }, { name: "Braise vagabonde", archetype: "swarmer" }],
  "charnier_brumeux": [{ name: "Nuée de charognards", archetype: "swarmer" }, { name: "Pestiféré crachant", archetype: "shooter" }, { name: "Sac de pourriture", archetype: "bomber" }],
  "geole_foudre": [{ name: "Geôlier électrifié", archetype: "brute" }, { name: "Sentinelle à arc", archetype: "shooter" }, { name: "Étincelle captive", archetype: "chaser" }],
  "marais_poix": [{ name: "Rampant de bitume", archetype: "chaser" }, { name: "Cracheur de goudron", archetype: "shooter" }, { name: "Bulle de poix", archetype: "bomber" }],
  "desolation_sel": [{ name: "Golem de sel", archetype: "brute" }, { name: "Lanceur de cristaux", archetype: "shooter" }, { name: "Mite des salines", archetype: "swarmer" }],
  "abyss": [{ name: "Traqueur des profondeurs", archetype: "chaser" }, { name: "Bouche bénthique", archetype: "bomber" }, { name: "Léviathan abyssal", archetype: "brute" }],
  "sky_city": [{ name: "Sentinelle ailée", archetype: "shooter" }, { name: "Essaim de séraphins", archetype: "swarmer" }, { name: "Colosse de nuées", archetype: "brute" }],
  "desert_verre": [{ name: "Éclat tranchant", archetype: "swarmer" }, { name: "Sniper de mirage", archetype: "shooter" }, { name: "Golem de silice", archetype: "brute" }],
  "foret_suspendue": [{ name: "Liane étrangleuse", archetype: "chaser" }, { name: "Archer sylvain corrompu", archetype: "shooter" }, { name: "Spore éclatante", archetype: "bomber" }],
  "lac_mercure": [{ name: "Reflet vif-argent", archetype: "chaser" }, { name: "Goutte fissile", archetype: "bomber" }, { name: "Titan de mercure", archetype: "brute" }],
  "cavernes_sel": [{ name: "Rongeur cristallin", archetype: "swarmer" }, { name: "Lanceur de saumure", archetype: "shooter" }, { name: "Colosse de halite", archetype: "brute" }],
  "volcan_endormi": [{ name: "Limier de magma", archetype: "chaser" }, { name: "Cracheur de cendres", archetype: "shooter" }, { name: "Noyau instable", archetype: "bomber" }],
  "toundra_spectrale": [{ name: "Spectre glaçant", archetype: "chaser" }, { name: "Meute de revenants gelés", archetype: "swarmer" }, { name: "Ancien du givre", archetype: "brute" }],
  "marais_luminescent": [{ name: "Feu follet hypnotique", archetype: "shooter" }, { name: "Crapaud détonant", archetype: "bomber" }, { name: "Nuée de lucioles voraces", archetype: "swarmer" }],
  "void_rift": [{ name: "Déchireur du Néant", archetype: "chaser" }, { name: "Œil-Faille suppurant", archetype: "shooter" }, { name: "Effondrement ambulant", archetype: "brute" }],
  "fractured": [{ name: "Éclat-miroir vorace", archetype: "swarmer" }, { name: "Prisme dissonant", archetype: "shooter" }, { name: "Faux-soi instable", archetype: "bomber" }],
  "cimetiere_etoiles": [{ name: "Revenant supernova", archetype: "bomber" }, { name: "Tireur de poussière stellaire", archetype: "shooter" }, { name: "Colosse de naine noire", archetype: "brute" }],
  "ocean_antimatiere": [{ name: "Anguille d'antimatière", archetype: "chaser" }, { name: "Méduse d'annihilation", archetype: "bomber" }, { name: "Banc de spores-photons", archetype: "swarmer" }],
  "cathedrale_echos": [{ name: "Chœur des damnés", archetype: "shooter" }, { name: "Cloche-cuirasse", archetype: "brute" }, { name: "Litanie rampante", archetype: "swarmer" }],
  "desert_verre_hurlant": [{ name: "Faucheur de silice", archetype: "chaser" }, { name: "Mirage-arbalétrier", archetype: "shooter" }, { name: "Tempête d'éclats hurlants", archetype: "swarmer" }],
  "jardin_yeux_clos": [{ name: "Ronce aux paupières", archetype: "chaser" }, { name: "Bourgeon larmoyant", archetype: "shooter" }, { name: "Pollen onirique", archetype: "bomber" }],
  "horloge_aion": [{ name: "Rouage-bourreau", archetype: "brute" }, { name: "Aiguille décochée", archetype: "shooter" }, { name: "Essaim de secondes mortes", archetype: "swarmer" }],
  "abysse_bouches": [{ name: "Gueule rampante", archetype: "chaser" }, { name: "Avaleur cracheur", archetype: "shooter" }, { name: "Goinfre ventru", archetype: "brute" }],
  "trone_dieu_endormi": [{ name: "Sentinelle du sommeil divin", archetype: "brute" }, { name: "Cauchemar émissaire", archetype: "shooter" }, { name: "Reliquat de prière vive", archetype: "bomber" }],
};

const DEFAULT: EnemyType[] = [{ name: "Rôdeur", archetype: "chaser" }];

export function enemyTypesForBiome(id: string): EnemyType[] {
  const set = BIOME_ENEMIES[id];
  return set && set.length ? set : DEFAULT;
}
