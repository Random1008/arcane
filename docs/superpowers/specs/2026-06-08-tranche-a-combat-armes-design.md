# Spec — Tranche A : Combat & 6 types d'armes

**Date** : 2026-06-08
**Projet** : RPG / Roguelite pixel art (action-RPG top-down)
**Tranche** : A — Combat & armes data-driven (s'appuie sur la tranche 0)
**Statut** : Design approuvé par l'utilisateur

---

## 1. Objectif

Généraliser le combat de la tranche 0 (une mêlée + un tir fixes) en un **système d'armes
data-driven** : 6 types d'armes aux identités distinctes, une **barre d'inventaire façon
Minecraft** (slot actif), des stats (ATK, vitesse d'attaque, crit %, dégâts crit, portée/arc),
un **multiplicateur de tier F→S**, et un système de **coups critiques**. Toute la logique reste
dans `core/` (pure, testée, RNG injecté pour déterminisme).

**Critère de réussite** : on lance `npm run dev`, on sélectionne une arme dans la barre
(touches 1–9 / molette), on attaque au clic gauche ; chaque arme a un feeling distinct
(vitesse, portée, arc, crit, signature), le tier (touche T) fait monter les dégâts, et les
crits s'affichent distinctement. Couvert par des tests `core/` déterministes.

---

## 2. Modèle de contrôle (mis à jour)

- **Barre d'inventaire** de 9 slots (façon Minecraft), affichée en bas, fixée à la caméra.
  Slots 1–6 pré-remplis avec les 6 armes ; slots 7–9 vides.
- **Touches 1–9** : sélectionner le slot actif. **Molette** : faire défiler le slot actif.
- **Clic gauche** : attaquer avec l'arme active.
  - arme de mêlée → coup en arc (auto-répété tant que maintenu, limité par la cadence) ;
  - arme à distance → tir **semi-auto** (un tir par appui, front montant).
  - slot vide → aucune action.
- **T** : faire défiler le **tier** (F→E→D→C→B→A→S→F) de l'arme active (test/feel du scaling).
- Inchangés : déplacement ZQSD/WASD, dash (Espace), blink (E), visée souris.
- **Le clic droit n'est plus utilisé** (libéré pour un futur alt/spécial). Le pickup d'arme
  à distance et le gating `hasRangedWeapon` de la tranche 0 sont **retirés** (remplacés par
  la barre d'inventaire ; un slot vide = pas d'attaque).

---

## 3. Les 6 armes (data-driven)

Chaque arme est une `WeaponDef` (donnée pure). Catégories : `melee` | `ranged`.

| Arme (id) | Cat. | ATK | attackSpeed | critChance | critDamage | range | arcDeg | knockback | proj.Speed | proj.radius | signature |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `sword` (Épée) | melee | 15 | 1.0 | 0.10 | 1.5 | 64 | 100 | 180 | — | — | none |
| `dagger` (Dague) | melee | 8 | 1.8 | 0.35 | 2.0 | 48 | 70 | 90 | — | — | none |
| `axe` (Hache) | melee | 22 | 0.8 | 0.10 | 1.5 | 70 | 150 | 160 | — | — | none |
| `hammer` (Marteau) | melee | 32 | 0.55 | 0.05 | 1.5 | 64 | 360 | 320 | — | — | none |
| `bow` (Arc) | ranged | 10 | 1.2 | 0.20 | 1.8 | — | — | 60 | 560 | 5 | pierce |
| `staff` (Bâton) | ranged | 18 | 0.7 | 0.10 | 1.6 | — | — | 100 | 320 | 12 | none |

**Identités (la plupart émergent des stats, pas de code spécial) :**
- **Épée** : équilibrée.
- **Dague** : rapide, courte portée, très haut crit.
- **Hache** : lente, arc **large (150°)** → touche plusieurs ennemis (cleave émergent).
- **Marteau** : très lent, **arc 360° + énorme knockback** → onde de choc AoE (émergent ; le
  rendu de slash en arc 360° dessine naturellement un anneau).
- **Arc** : projectile rapide, **`pierce`** = traverse les ennemis (seul drapeau mécanique réel).
- **Bâton** : gros projectile lent (rayon 12, vitesse 320), gros dégâts.

Une seule signature mécanique : **`pierce`** (projectile). Tout le reste vient des stats.

---

## 4. Tier F→S

`Tier = 'F'|'E'|'D'|'C'|'B'|'A'|'S'`. Multiplicateur appliqué à l'**ATK** :

| F | E | D | C | B | A | S |
|---|---|---|---|---|---|---|
| ×1.0 | ×1.3 | ×1.7 | ×2.2 | ×3.0 | ×4.0 | ×5.5 |

Ω et le scaling de loot complet viendront avec la tranche loot. `computeStats(def, tier)` renvoie
les stats finales (ATK multipliée par le tier ; les autres stats inchangées pour l'instant).

---

## 5. Coups critiques

À chaque application de dégâts d'une arme : tirage `rng() < critChance`.
- crit → dégâts × `critDamage` (arrondi), marqué `crit: true`.
- mêlée multi-cibles : un jet **par cible** (chacune peut crit indépendamment).
- projectile : jet **au tir** (les dégâts du projectile incluent déjà le crit).

**RNG injecté** : le `World` détient `rng: () => number` (défaut `Math.random` à la création).
Les tests le remplacent (`() => 0` force le crit, `() => 0.999` l'empêche) → déterminisme.

---

## 6. Architecture (extension du core existant)

Nouveaux modules `core/` :
- **`core/combat/weapons.ts`** : `WeaponDef`, `WeaponCategory`, `Signature`, `WEAPONS` (les 6),
  `Tier`, `TIER_MULT`, `computeStats(def, tier) -> ResolvedWeapon`.
- **`core/combat/hotbar.ts`** : `WeaponInstance { defId, tier }`, `Hotbar { slots: (WeaponInstance|null)[], activeIndex }`,
  `createHotbar`, `selectSlot(h, i)`, `scrollSlot(h, dir)`, `activeWeapon(h)`, `cycleTier(h)`.
- **`core/combat/crit.ts`** : `rollDamage(baseAtk, critChance, critDamage, rng) -> { amount, crit }`.

Modules `core/` modifiés :
- **`entity.ts`** : `Health` inchangé (hitstun déjà là).
- **`combat/melee.ts`** : `targetsInArc` inchangé (arc 360° = radial). `MeleeCfg` reçoit ses
  valeurs depuis l'arme résolue (timings = base / attackSpeed).
- **`combat/projectile.ts`** : `Projectile` gagne `pierce: boolean`, `hitIds: Set<number>`,
  `crit: boolean`. `spawnProjectile` prend les stats de l'arme.
- **`combat/weapon.ts` (Loadout)** : **supprimé** (remplacé par hotbar).
- **`world.ts`** :
  - `Player` : remplace `loadout` par `hotbar: Hotbar` ; ajoute `rangedTimer: number`
    (cadence tir) et `attackHeld: boolean` (front montant tir semi-auto). Retire `rangedHeld`.
  - `World` : ajoute `rng: () => number` ; retire `pickup`.
  - `InputState` : `{ moveDir, aimPoint, attack, dash, blink, selectSlot, scroll, cycleTier }`
    (remplace `melee`/`ranged` par `attack` ; ajoute `selectSlot`/`scroll`/`cycleTier`).
  - `tickWorld` : applique sélection slot/scroll/cycleTier ; résout l'arme active ; mêlée OU
    tir selon la catégorie, avec stats/crit/signatures ; `DamageEvent` gagne `crit: boolean`.
  - `createWorld` : hotbar pré-rempli `[sword,dagger,axe,hammer,bow,staff]` au tier `F`,
    activeIndex 0 ; `rng = Math.random`.

Modules `game/` :
- **`game/input/inputMap.ts`** : `attack` = clic gauche ; `selectSlot` via touches 1–9 ;
  `scroll` via molette ; `cycleTier` via T (front montant) ; retire le clic droit.
- **`game/render/hotbarBar.ts`** (nouveau) : barre d'inventaire (9 slots, fixée caméra,
  slot actif surligné, abréviation + couleur par arme).
- **`game/render/floatingText.ts`** : `spawnDamageText(scene,x,y,amount,crit)` — crit plus
  gros et coloré.
- **`game/render/slash.ts`** : inchangé (utilise l'arc de l'arme active ; arc 360° = anneau).
- **`game/scenes/TrainingScene.ts`** : câble la barre + HUD (arme active + tier), passe le
  meleeCfg de l'arme active au rendu de slash, draine les `DamageEvent` (avec crit).

---

## 7. Tests (core, déterministes)

- **weapons** : `computeStats` applique le bon multiplicateur de tier à l'ATK ; les 6 défs existent
  avec la bonne catégorie.
- **crit** : `rollDamage` → crit avec `rng=()=>0`, pas de crit avec `rng=()=>0.999` ; montant ×critDamage.
- **hotbar** : `selectSlot` borne l'index ; `scrollSlot` boucle ; `activeWeapon` renvoie l'instance
  ou null ; `cycleTier` boucle F→…→S→F.
- **melee scalée** : un coup d'arme rapide (dague) a une cadence plus courte qu'un coup lent (marteau).
- **cleave** : arc large (hache, 150°) touche 2 ennemis placés de part et d'autre ; arc étroit (dague) un seul.
- **shockwave** : marteau (arc 360°) touche un ennemi situé derrière le joueur.
- **pierce** : un projectile d'arc traverse et touche 2 ennemis alignés ; un projectile de bâton (non-pierce)
  s'arrête au premier.
- **world** : sélection de slot change l'arme active ; attaque avec arme mêlée inflige des dégâts ;
  attaque avec arme distance crée un projectile (semi-auto, un par appui) ; slot vide = aucune action ;
  tier plus élevé = plus de dégâts.

Vérification : `npm test` + `npm run build` verts ; feel validé via `npm run dev`.

---

## 8. Definition of Done

- Barre d'inventaire 9 slots fonctionnelle (touches 1–9 + molette), slot actif visible.
- Les 6 armes jouables avec identités distinctes (vitesse/portée/arc/crit/pierce/knockback).
- Crit fonctionnel et affiché distinctement ; tier F→S (touche T) augmente les dégâts.
- Clic droit retiré ; pickup/loadout tranche 0 retirés sans régression du reste.
- Tests `core/` verts (anciens + nouveaux) ; build OK.

---

## 9. Hors périmètre (tranches ultérieures)

Loot/drop des armes & raretés visuelles, Ω/Omganium/craft, sets, effets de statut complexes
(poison/burn/slow/lifesteal), inventaire complet (coffres, armures), arbre de compétences.
Ce système d'armes fournit les fondations (`WeaponDef`, tier, crit) sur lesquelles le loot se branchera.
