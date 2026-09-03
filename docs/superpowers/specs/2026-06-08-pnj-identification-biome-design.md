# Spec — PNJ & identification de biome (extension tranche B)

**Date** : 2026-06-08
**Projet** : RPG / Roguelite pixel art (action-RPG top-down)
**Statut** : Design approuvé par l'utilisateur

---

## 1. Objectif

Peupler chaque biome (sauf le Sanctuaire) de **PNJ** non-hostiles à qui parler, et transformer la
**révélation de la carte** en mécanique de découverte : entrer dans un biome ne révèle plus son
identité ; il faut **parler à un PNJ** qui se présente (dit son nom) et nomme le lieu. Tant que ce
n'est pas fait, le biome reste « ? » sur la carte et le joueur **devine** d'après le visuel de la
zone (rouge = volcan, bleu = mer/rivière, blanc = neige…).

**Critère de réussite** : dans un biome, des PNJ (nom affiché « ? ») sont présents ; s'approcher +
**F** ouvre un dialogue où le PNJ donne son nom et le nom du biome ; après le dialogue, le nom du
PNJ est connu, et le biome devient **identifié** (nom + couleur) sur la carte. Le Sanctuaire est
identifié d'office et n'a pas de PNJ.

---

## 2. PNJ

- Données : `NpcDef { name, lines: string[] }`. `BIOME_NPCS : Record<biomeId, NpcDef[]>` couvre les
  **20 biomes** (pas le Sanctuaire). 1 à 2 PNJ par biome.
- À l'entrée d'un biome, `generateBiomeWorld` instancie les PNJ (`World.npcs: Npc[]`) à des
  positions libres. `Npc { id, pos, radius, name, lines, talked }`. Les PNJ sont **inertes**
  (ne bougent pas, non solides) et n'apparaissent **pas** dans le Sanctuaire.
- **Nom inconnu** tant que `talked === false` : affiché « ? » au-dessus du PNJ ; après dialogue,
  son nom s'affiche.

## 3. Interaction & dialogue

- Touche **F** près d'un PNJ (distance ≤ rayon joueur + rayon PNJ + marge) → ouvre une **boîte de
  dialogue** (Phaser, fixée à la caméra, en bas).
- Pendant le dialogue : **la simulation est en pause** (pas de `tickWorld`). **F** fait avancer
  ligne par ligne ; à la dernière ligne, ferme la boîte, met `npc.talked = true` et **identifie le
  biome** (`markIdentified(biomeId)`).
- Indice **[F]** affiché au-dessus d'un PNJ quand le joueur est à portée.

## 4. Identification sur la carte

- `session` : `identified` (Set, contient `spawn` d'office) **remplace** `explored` pour la
  révélation. `isIdentified(id)`, `markIdentified(id)`.
- États d'un nœud sur la carte :
  - **verrouillé** (`!isUnlocked`) → 🔒 non cliquable (inchangé) ;
  - **débloqué & non identifié** → cercle noir + « ? », nom « ??? », **cliquable** ;
  - **identifié** → palette + nom + rang (★ pour le Sanctuaire).
- Le déverrouillage (nettoyage → anneau suivant) reste basé sur `cleared` (inchangé).

## 5. Contenu (généré, FR, thématique)

Pour chacun des 20 biomes : 1–2 PNJ avec un **nom** cohérent avec le thème et 2–3 **répliques** ;
**la 1ʳᵉ réplique doit contenir le nom du biome** (ex. « … bienvenue dans la Forêt. ») et le PNJ
**se présente** (donne son nom). Généré via un workflow multi-agents (un par biome), puis figé en
données statiques dans `core/npcs.ts`.

## 6. Architecture

- `core/npcs.ts` (NEW) : `NpcDef`, `BIOME_NPCS`, `npcsForBiome(id)`.
- `core/world.ts` (MOD) : `Npc` + `World.npcs: Npc[]` (createWorld → `npcs: []`).
- `core/generate.ts` (MOD) : instancie `world.npcs` depuis `npcsForBiome(biome.id)` (positions libres).
- `game/session.ts` (MOD) : `identified` (+ `spawn`) remplace `explored` ; `isIdentified` / `markIdentified`.
- `game/scenes/BiomeScene.ts` (MOD) : rendu PNJ (marqueur + nom/« ? » + indice [F]) ; gestion **F**
  (ouvrir/avancer/fermer dialogue) ; pause sim pendant dialogue ; fin de dialogue → `markIdentified`.
- `game/scenes/WorldMapScene.ts` (MOD) : révélation pilotée par `isIdentified` (au lieu d'`isExplored`).
- `game/render/dialogueBox.ts` (NEW) : petite boîte de dialogue Phaser (nom + ligne).

## 7. Tests (core, déterministes)

- **npcs** : `BIOME_NPCS` a une entrée pour les 20 biomes ; **aucune pour `spawn`** ; chaque biome a
  ≥1 PNJ avec un `name` non vide et ≥1 ligne ; la 1ʳᵉ ligne de chaque biome **contient le nom du biome**.
- **generate** : `world.npcs.length === npcsForBiome(biome.id).length` (≥1 pour un biome normal) ;
  **0 PNJ** pour le Sanctuaire ; PNJ initial `talked === false`.

Vérification : `npm test` + `npm run build` verts ; dialogue + identification validés via `npm run dev`.

## 8. Definition of Done

- PNJ présents dans chaque biome non-spawn ; nom « ? » avant dialogue, révélé après.
- F ouvre/avance/ferme le dialogue (sim en pause) ; le PNJ nomme le biome.
- La carte révèle un biome **seulement** après avoir parlé à un PNJ ; Sanctuaire identifié d'office.
- Tests core verts (npcs + generate + existants) ; build OK.

## 9. Hors périmètre

PNJ marchands / quêtes / économie (tranches D/H), PNJ mobiles ou avec IA, choix de dialogue
ramifiés, voix/portraits. Ici : PNJ statiques avec dialogue linéaire qui identifie le biome.
