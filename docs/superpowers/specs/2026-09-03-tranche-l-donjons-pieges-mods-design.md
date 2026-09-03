# Spec — Tranche L : Donjons à énigmes, pièges & modificateurs

**Date** : 2026-09-03
**Projet** : RPG / Roguelite pixel art (action-RPG top-down)
**Tranche** : L — Donjons : énigmes/pièges + modificateurs de run (rattrapage GDD arcane, item 2)
**Statut** : Design à implémenter (validé en session)

---

## 1. Objectif

Enrichir les **donjons** (aujourd'hui : enchaînement de salles de combat + coffre + mini-boss) pour
coller au GDD « Entrée → Combat → **Puzzle** → Boss » et au backlog `donjons.md` (« salles à
énigmes/pièges scriptés, mini-carte, modificateurs/malédictions »). Chaque donjon reçoit un
**modificateur** (malédiction/bénédiction) qui change sa saveur, et certaines salles demandent
autre chose que tuer : **activer des plaques** ou **traverser des pièges**.

**Critère de réussite** : on entre dans un donjon → un bandeau annonce son modificateur (« Maudit :
ennemis +50 % PV »). Certaines salles contiennent des **plaques à activer** (la porte ne s'ouvre
que toutes actives) ou des **pièges au sol** qui blessent. Les salles restent cohérentes avec le
mécanisme d'ouverture existant (porte → salle voisine). Couvert par des tests `core/` déterministes.

---

## 2. Modèles (core)

### 2.1 Modificateur de donjon

```ts
// src/core/dungeonMods.ts
interface DungeonModDef {
  id: string; name: string;
  enemyHpMul?: number; enemyDmgMul?: number; enemyCountMul?: number;
  goldMul?: number; lootMul?: number; chestRankBonus?: number; // +1 = meilleur butin
  playerDps?: number;        // malédiction : drain de vie constant
  playerSpeedMul?: number;   // <1 = ralenti
}
```

- `Dungeon` gagne `modId: string | null` (défini à la génération, cf. 3).
- Liste de départ (par gravité croissante, tirée selon le rang du biome) : `maudit` (PV ennemis
  ×1.5), `gele` (joueur ralenti ×0.85), `sanglant` (ennemis +dégâts, or ×1.5), `opulent`
  (coffres rang +1, ennemis ×1.2), `corrompu` (drain joueur + ennemis renforcés, rangs A/S),
  `benediction` (rare : loot ×1.5, ennemis ×0.9 — bonus pur).

### 2.2 Salles spéciales

```ts
// src/core/dungeon.ts (étendu)
type RoomKind = "start" | "normal" | "treasure" | "boss" | "puzzle" | "trap";
interface PressurePlate { id: number; x: number; y: number; radius: number; active: boolean; }
interface RoomTrap { id: number; x: number; y: number; radius: number; kind: "spikes" | "poison"; }
```

- `World` gagne `plates: PressurePlate[]` et `roomTraps: RoomTrap[]` (init `[]`).
- **Salle `puzzle`** : N plaques (2..3 selon le rang) disposées dans la salle. La salle est
  considérée « résolue » quand **toutes les plaques sont actives** (le joueur marche dessus).
  Aucun ennemi (ou 1 gardien optionnel en rang haut). Portes fermées tant que non résolu.
- **Salle `trap`** : des pièges au sol (`roomTraps`) + ennemis ; la salle se résout en tuant les
  ennemis (comme `normal`), mais le sol blesse — le joueur doit jouer avec le placement.

### 2.3 Génération (generateDungeon)

- Après la répartition start/normal/treasure/boss :
  - **1 salle `puzzle`** : choisir une salle `normal` de profondeur ≥ 2 sur le **chemin vers le
    boss** (chemin = salle dont un voisin mène vers la profondeur max ; simple : salle `normal`
    de profondeur `maxDepth-1` si elle existe, sinon la plus profonde non-boss non-treasure).
  - **1 salle `trap`** : une autre salle `normal` quelconque (profondeur ≥ 1), jamais la même.
  - Si le donjon est trop petit (5 salles), on ne force que `puzzle` ; `trap` seulement si ≥ 6.
- Tirage du **modificateur** : `rollDungeonMod(biomeTier, rng)` avec table par rang :
  F/E → mods légers (maudit, gele) ; D/C → + sanglant/opulent ; B/A → + corrompu ;
  S → tous, pondération benediction plus faible. `null` possible (≈ 25 % pas de mod).

### 2.4 Salle puzzle — résolution & portes

- Le tick (`tickWorld`) met à jour `plates` : joueur dans le rayon → `active = true`.
- Règle de résolution : une salle `puzzle` est « cleared » quand toutes ses plaques sont actives.
  C'est la **scène** qui ouvre les portes (même chemin que le clear par combat existant) — le
  `World` expose `roomSolved(room)` (fonction pure core) pour que la scène n'ait pas à dupliquer
  la règle. Les salles `puzzle` n'ont pas d'ennemis → le clear « combat » existant ne doit pas
  s'appliquer (sinon la porte s'ouvrirait au spawn). La scène doit donc choisir : si la salle est
  `puzzle` → résolution par plaques ; sinon → résolution par combat (comportement actuel).
- Plaque rendue : disque clair (accent) qui s'assombrit/change quand active.

### 2.5 Pièges de salle (trap)

- Les `roomTraps` sont fixes (positions de spawn connues par la génération de salle) ; ils
  blessent le joueur s'il marche dedans (même mécanique DoT cadencée que le terrain de la tranche
  K — `hurtPlayer` avec i-frames). Rendu : zone colorée semi-transparente + bordure.

---

## 3. Effets des modificateurs (tickWorld + génération de salle)

- **À la génération de salle** (`generateRoomWorld`) : `enemyHpMul` / `enemyDmgMul` / `enemyCountMul`
  appliqués aux ennemis créés ; `chestRankBonus` au coffre ; `goldMul` stocké pour les rewards.
- **Au tick** (`tickWorld`) : `playerDps` (drain, cadencé ~0.5 s via `hurtPlayer`),
  `playerSpeedMul` appliqué au `cfg.maxSpeed` du joueur ; `lootMul` appliqué à `BALANCE.dropChance`.
- Les mods **boss** s'appliquent aussi au mini-boss (`makeBoss` × muls).
- Le modificateur est affiché dans la salle de départ (bandeau) et rappelé en coin d'écran.

---

## 4. Fichiers touchés

- **Nouveau** : `src/core/dungeonMods.ts` (defs + tirage), tests `tests/dungeonMods.test.ts`,
  `tests/dungeonRooms.test.ts` (puzzle/trap : génération + résolution + portes).
- **Modifiés** : `src/core/dungeon.ts` (RoomKind, generateDungeon, generateRoomWorld : plaques,
  pièges, muls), `src/core/world.ts` (champs `plates`/`roomTraps`, tick plaques/drain/muls),
  `src/core/defaultWorldState` (init), `src/game/scenes/BiomeScene.ts` (clear puzzle vs combat,
  bandeau mod, rendu plaques/pièges).

---

## 5. Hors périmètre

Mini-carte du donjon, clés/portes spéciales, donjons « infinis » (déjà couverts par Nexus),
salles à énigmes logiques complexes (télépousseurs, miroirs) — tranches ultérieures.
