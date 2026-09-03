# Spec — Tranche G : Nexus Infini (endgame)

**Date** : 2026-06-10
**Statut** : Scope approuvé (hub 8 portails ; déblocage après boss S ; mini-boss tous les 5 paliers + loot scalé).

## 1. Objectif

Un mode **endgame sans fin** : depuis un **hub** à **8 portails**, le joueur enchaîne des salles de
combat de plus en plus dures (**scaling infini** au-delà du rang S), avec un **mini-boss tous les 5
paliers**. On conserve le **meilleur palier atteint**. Réutilise le moteur de salles/combat.

**Critère de réussite** : portail Nexus au Sanctuaire (ouvert après le boss S) → hub à 8 portails →
choisir un portail (combat de danger variable, ou boss) → nettoyer → retour au hub, palier +1, plus dur
→ mort = fin du run, record mis à jour.

## 2. Données — `core/nexus.ts`

- `nexusScaling(level) → { hpMult, dmgMult, count }` : croissance continue (≈ `6×(1+level*0.12)` PV,
  `3×(1+level*0.08)` dégâts, `count = min(16, 9 + floor(level/2))`), au-delà de S.
- `Portal { id; pos; radius; kind: "combat" | "boss" | "return"; danger: number; open: boolean }`.
- `PORTAL_LABEL` danger : 1 « facile », 2 « moyen », 3 « dangereux ».
- `generateNexusHub(player, palier, rng) → World` : grande arène (1100×700) **sans ennemis**, **8 portails**
  (2 par mur) tous `open` : 7 `combat` avec `danger ∈ {1,2,3}` aléatoire, 1 `boss`.
- `generateNexusRoom(player, palier, portal, rng) → World` : arène ; si `portal.kind === "boss"` et
  `palier % 5 === 0` → **mini-boss** scalé (sinon combat `danger=3`) ; sinon ennemis scalés par
  `nexusScaling(palier + portal.danger)`. Un **portail de retour** (`kind:"return"`, fermé) s'ouvre au
  nettoyage. Loot scalé (biais S=6 ; coffre garanti après le mini-boss).

## 3. World — `world.ts`

- `World` gagne `portals: Portal[]` et `portalReached: number | null`.
- `tickWorld` : joueur sur un portail **ouvert** → `portalReached = portal.id`. (Portails vides hors Nexus.)

## 4. Mode Nexus — `BiomeScene`

- `init({ nexus: true })` : palier 1, `this.world = hub`.
- État : `nexusMode`, `nexusPalier`, `nexusPortals` (descripteurs du hub courant), `inHub`.
- **Transition** : portail `combat`/`boss` du hub → charge la salle correspondante (`generateNexusRoom`).
  Portail `return` d'une salle nettoyée → retour hub, **palier += 1**, **régénère le hub**.
- **Nettoyage de salle** : plus d'ennemis (ni boss) → ouvre le portail de retour (+ coffre garanti pour la salle boss).
- **Record** : `session.nexusBest` ; à la mort (ou à l'abandon par M), `markNexusBest(palier)`.
- Rendu : **portails** (cercles colorés + libellé « Combat (moyen) » / « BOSS — palier N » / « Retour »).
  HUD Nexus : « Nexus — palier P (record R) ».
- **Accès** : dans le Sanctuaire (`BiomeScene` spawn), un **portail Nexus** apparaît si le boss S est
  vaincu (`isCleared("trone_dieu_endormi")`) ; marcher dessus → `scene.start("biome", { nexus: true })`.
- **Mort** en Nexus : record + respawn Sanctuaire (existant).

## 5. Tests (core, déterministes)

- `nexusScaling` croît avec le palier (hp/dmg/count) et dépasse le scaling S.
- `generateNexusHub` : 8 portails ouverts, exactement 1 `boss`, 7 `combat` avec danger ∈ {1,2,3}, aucun ennemi.
- `generateNexusRoom` : combat → ennemis scalés (plus à palier élevé) ; boss à palier %5 → `world.boss != null` ;
  un portail `return` fermé présent.
- `tickWorld` : joueur sur un portail ouvert → `portalReached` = son id.
- `session` : `markNexusBest` ne garde que le maximum.

## 6. Definition of Done

Portail Nexus au Sanctuaire (après boss S) ; hub 8 portails ; salles de combat scalées + mini-boss
tous les 5 paliers + coffre garanti ; palier qui monte ; record conservé ; mort = fin du run. Tests verts,
build OK. `idea/nexus.md`.

## 7. Hors périmètre

Modificateurs/malédictions de run, classements en ligne, sauvegarde du run en cours, récompenses cosmétiques.
Évolution Ω des classes (séparé).
