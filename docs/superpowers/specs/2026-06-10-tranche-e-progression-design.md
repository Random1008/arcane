# Spec — Tranche E : Progression RPG

**Date** : 2026-06-10
**Projet** : RPG / Roguelite pixel art (action-RPG top-down)
**Statut** : Scope approuvé (tout E ; points libres ; + 1 PNJ hub pour l'arbre)
**Ordre de build** : **E1** (XP / niveaux / stats) → **E2** (arbre de compétences + capacités)

---

## 1. Objectif

Donner une **progression durable** : tuer/looter fait **monter de niveau**, ce qui donne des **points
de stat** (répartis librement) et des **points de compétence** pour un **arbre** (passifs + capacités
actives). Câble Eldrin (Mage), l'Entraîneur (respec) et un **nouveau PNJ « Gardien de l'Arbre »** au
Sanctuaire (ouvre l'arbre).

**Critère de réussite** : l'XP tombe et remplit une barre ; au niveau, on répartit des points de stat
(qui changent réellement PV/dégâts/vitesse/crit) ; on dépense des points de compétence dans un arbre
qui débloque passifs et **capacités actives** utilisables au combat (touches + cooldown + énergie).

---

## 2. E1 — XP, niveaux, stats

`core/progression.ts` :
- `xpForNext(level) = round(60 × 1.18^(level-1))`.
- `xpReward(archetype, tier)` : base 6 × facteur d'archétype (chaser 1, shooter 1.2, brute 2.5,
  swarmer 0.6, bomber 1.3, dummy 0) × (1 + indexTier×0.6). Boss : `round(50 × (1 + indexTier))`.
- `addXp(player, amount) → niveaux gagnés` : ajoute l'XP, gère les montées (boucle), crédite
  **+3 points de stat** et **+1 point de compétence** par niveau.
- `STATS = ["vitality","power","agility","precision"]` ; par point :
  Vitalité **+12 PV max**, Puissance **+3% dégâts**, Agilité **+2% vitesse**, Précision **+1.2% crit**.
- `allocStat(player, stat)` : si `statPoints>0`, `stats[stat]++`, `statPoints--` ; recalcule `maxHp`
  (= `BASE_HP(100) + vitality×12`) et **soigne le delta** de PV gagné.

`Player` (world.ts) gagne : `level`, `xp`, `statPoints`, `skillPoints`, `stats:{vitality,power,agility,precision}`.

Intégration combat : `derivePlayerMods(player)` = `computePlayerMods(armor)` **+ bonus de stats**
(damageMul ×(1+power×0.03), speedMul ×(1+agility×0.02), critAdd +precision×0.012) **+ passifs d'arbre**
(cf. E2). `tickWorld` utilise `w.playerMods = derivePlayerMods(p)`. XP créditée à la mort des
ennemis/boss (world.ts).

HUD : barre d'XP + niveau + (points de stat à dépenser → indicateur). Menu de stats (touche **P**).

## 3. E2 — Classes & arbres de compétences

Réf. contenu : `game/idea/class-et-arbre-de-competence.md`. **6 classes**, chacune avec son arbre
(3 branches). Le joueur choisit **UNE** classe (via le PNJ du hub) et monte SON arbre ; **respec**
possible (rend les points, permet de changer de classe). Les **stats** (E1) restent libres en parallèle.

`core/classes.ts` :
- `ClassId = "guerrier" | "assassin" | "archer" | "mage" | "ingenieur" | "necromancien"`.
- `CLASS_DEFS: { id, name, desc, branches: string[3] }` (libellés des 3 branches par classe).

`core/skills.ts` :
- **Primitives de capacité** (réutilisables) `AbilityKind = "projectile" | "aoe" | "buff" | "shield"
  | "heal" | "dash" | "summon" | "slow" | "trap"`.
- `Ability { id, name, kind, slot (0-3 → touches R/C/V/B), cooldown, energyCost, params }`.
- `SkillNode { id, classId, branch, name, desc, cost, maxRank, requires?, effect }` ;
  `effect = { kind:"passive", stat, perRank }` (stat ∈ maxHp/damageMul/speedMul/critAdd/defense/lifesteal)
  ou `{ kind:"ability", abilityId }`.
- `SKILL_TREES: Record<ClassId, SkillNode[]>` + `ABILITIES: Record<string, Ability>` (générés par workflow,
  référencent les primitives).
- `canUnlock(player, nodeId)` (classe choisie + prérequis + points + maxRank), `unlockNode`,
  `respec(player)` (rend les points, vide les nœuds), `setClass(player, classId)` (respec auto au changement),
  `skillPassives(player)` (agrège les rangs des nœuds passifs de la classe) consommé par `derivePlayerMods`,
  `unlockedAbilities(player)` (capacités dont le nœud est débloqué).

`Player` gagne : `class: ClassId | null`, `skills: Record<string, number>`, `cooldowns: Record<string, number>`.

**Capacités actives** (≤ 4 par classe, touches **R / C / V / B**) gérées dans `tickWorld`
(`InputState.ability` = slot 0-3 ou -1) : requièrent nœud débloqué + énergie + cooldown prêt. Effets par primitive :
- projectile (boule de feu, flèche…) · aoe (explosion/onde) · buff (rage : +dégâts/vitesse temporaire) ·
  shield (absorption/i-frames) · heal (soin) · dash (dash renforcé) · summon (sbire allié temporaire) ·
  slow (zone qui ralentit les ennemis) · trap (mine qui explose au contact).
- Dégâts/valeurs scalés par le rang du nœud + `playerMods`.

UI : **menu de classe/arbre** (touche **K** et via le PNJ) : si pas de classe → écran de **choix de classe** ;
sinon arbre de la classe (branches, nœuds, rangs, coût, prérequis, clic = débloquer ; bouton respec).
**Barre de capacités** (slots R/C/V/B + cooldown) au HUD.

Nouveau PNJ hub (`core/hub.ts`) : **« Maître des Classes »** (rang F, action `"classtree"`) → ouvre le
menu (choix de classe / arbre). L'**Entraîneur** (déjà présent) → action `"respec"`.

> Évolution Ω des classes (formes ultimes en endgame) = hors périmètre, noté dans l'idea.

## 4. Tests (core, déterministes)

- **progression** : `xpForNext` croissante ; `xpReward` boss > mob, scale par rang ; `addXp` fait
  monter de niveau et crédite points ; multi-niveaux d'un coup ; `allocStat` augmente maxHp + soigne,
  refuse si 0 point.
- **derive** : stats augmentent damageMul/speedMul/critAdd/maxHp ; se combinent avec l'armure.
- **classes/skills** : `setClass` fixe la classe (respec auto) ; `canUnlock`/`unlockNode` exigent la classe +
  prérequis + points + maxRank ; on ne peut débloquer un nœud d'une autre classe ; `respec` rend tous les
  points ; `skillPassives` agrège les rangs de la classe ; chaque classe a 3 branches avec racines + ≥1 capacité.
- **abilities (world)** : activer une capacité débloquée crée son effet (projectile/aoe/heal/shield/…),
  met le cooldown, consomme l'énergie ; bloquée si non débloquée / cooldown / énergie insuffisante.
- **world** : tuer un ennemi crédite de l'XP ; boss → gros XP.

## 5. Definition of Done

XP→niveaux→points ; stats libres qui modifient le combat ; **6 classes** avec arbres (passifs +
capacités actives via primitives) ; choix de classe + respec ; PNJ « Maître des Classes » + menus
(P stats, K classe/arbre) + HUD (barre XP, barre capacités). Tests verts, build OK.
`idea/progression.md` à jour (+ `idea/class-et-arbre-de-competence.md` déjà fourni).

---

## 6. Hors périmètre

Équilibrage fin de toutes les valeurs (itéré ensuite). Sorts au-delà des 4 capacités. Effets visuels
avancés des capacités. Sauvegarde persistante disque (la progression vit dans la session).
