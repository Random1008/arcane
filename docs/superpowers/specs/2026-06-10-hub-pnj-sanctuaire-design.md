# Spec — Hub PNJ du Sanctuaire

**Date** : 2026-06-10
**Projet** : RPG / Roguelite pixel art (action-RPG top-down)
**Statut** : Scope approuvé par l'utilisateur (présence + dialogues + gating ; fonctions existantes câblées)
**Réf.** : `game/idea/pnj.md`

---

## 1. Objectif

Faire du **Sanctuaire** (biome de départ `spawn`) un **hub social** : une plateforme avec les PNJ
de service (forgeron, marchand, alchimiste…). Les PNJ de haut rang (S, Ω) sont **visibles mais
verrouillés** tant que le joueur n'a pas atteint le rang correspondant : leur parler n'affiche qu'une
**bulle « … »**. Les fonctions déjà disponibles dans le jeu sont câblées ; les autres affichent un
dialogue de présentation (« à venir »).

**Critère de réussite** : en entrant au Sanctuaire, le joueur voit une plateforme avec ~14 PNJ ;
parler à un PNJ de rang F ouvre un dialogue (et déclenche soin/craft pour Mira/Brak/Gardien) ;
un PNJ verrouillé montre « … » ; il se débloque quand le rang requis est atteint.

---

## 2. Données — `core/hub.ts`

- `HubNpcAction = "none" | "heal" | "craft"`.
- `HubNpcDef { name, role, lines: string[], lockedRank?: "S" | "omega", action?: HubNpcAction }`.
- `HUB_NPCS: HubNpcDef[]` (14, depuis `pnj.md`) :
  - **F (toujours)** : Brak *Forgeron* (`craft`), Lira *Couturière*, Eldrin *Mage*, Rogan *Chasseur de quêtes*,
    Tibo *Marchand*, Mira *Alchimiste* (`heal`), Kael *Explorateur*.
  - **S (lockedRank "S")** : Maître d'armes, Entraîneur, Courtier, Gardien de l'Omganium (`craft`).
  - **Ω (lockedRank "omega")** : Voyageur du Néant, Chrono Marchand, Forgeron interdit.

Chaque `lines` = 1-3 répliques décrivant le rôle (et, pour les non câblés, mention « à venir »).

---

## 3. Modèle & déblocage

- `world.ts` : `Npc` gagne des champs optionnels `role?`, `lockedRank?: "S"|"omega"`, `action?: HubNpcAction`.
  `Player` gagne `omegaUnlocked: boolean` (init false).
- `craft.ts` : `craftOmega` succès → `player.omegaUnlocked = true`.
- `world.ts` ramassage : pickup `omega` → `player.omegaUnlocked = true`.
- **Déblocage** (évalué côté scène) :
  - `"S"` débloqué si **un biome de rang S est nettoyé** (`session.cleared` ∩ biomes tier S).
  - `"omega"` débloqué si `player.omegaUnlocked`.
  - `game/session.ts` : `hasClearedRank(tier): boolean` (cleared + `getBiome().tier`).

---

## 4. Placement & plateforme — `core/generate.ts` + `BiomeScene`

- `generate.ts` : si `biome.id === "spawn"`, placer les `HUB_NPCS` à des **positions fixes** (2 rangées
  centrées : 7 en haut ~y260, 7 en bas ~y440, x répartis), avec `role/lockedRank/action`. Sinon, PNJ
  de biome inchangés. Le joueur du Sanctuaire apparaît en bas (hors plateforme).
- `BiomeScene` : pour le Sanctuaire, dessiner une **plateforme** (rectangle de pierre + liseré) sous les PNJ.

---

## 5. Interaction & rendu — `BiomeScene`

- **Label PNJ hub** : déverrouillé → `Nom · Rôle` ; verrouillé → `???` (+ marqueur grisé).
- **onInteract** :
  - PNJ hub **verrouillé** (lockedRank non débloqué) → afficher une **bulle « … »** (nom `???`, ligne `…`),
    F la referme ; aucun déblocage, rôle non révélé.
  - PNJ hub **déverrouillé** → dialogue des `lines` ; à l'ouverture, déclencher l'`action` :
    - `heal` → `player.health.hp = maxHp`, `energy = max` + texte flottant « Soigné ! ».
    - `craft` → `craftOmega(player, rng)` + ligne de résultat (réutilise les messages de craft).
  - PNJ de biome (avec `lines`, sans `role`) → comportement existant (identification du biome).
- Rendu : PNJ hub = cercle doré (déjà) ; **verrouillé = teinte grise**. (Dessins fournis plus tard.)

---

## 6. Tests (core, déterministes)

- **hub** : `HUB_NPCS` a 14 entrées ; chaque def a `name`/`role`/`lines≥1` ; les rangs verrouillés
  correspondent (4 en S, 3 en Ω, 7 sans lock) ; actions `heal`/`craft` présentes.
- **generate** : `generateBiomeWorld(spawn)` place 14 PNJ avec `role` défini ; un biome normal n'a pas de `role`.
- **craft/loot** : `craftOmega` succès → `omegaUnlocked=true` ; ramasser un pickup Ω → `omegaUnlocked=true`.
- **session** : `hasClearedRank("S")` faux au départ, vrai après nettoyage d'un biome S.

---

## 7. Definition of Done

14 PNJ sur une plateforme au Sanctuaire ; F→dialogue (+ soin/craft) pour les déverrouillés ; bulle « … »
pour les verrouillés ; déblocage par rang (S = biome S nettoyé, Ω = objet Ω obtenu). Tests verts, build OK.

---

## 8. Hors périmètre

Fonctions complètes des PNJ (boutique/économie = tranche H, compétences = E, quêtes = futur,
potions de l'Alchimiste au-delà du soin, reset de skills). Apparition aléatoire du Voyageur du Néant
(ici simplement présent mais verrouillé). Sprites définitifs (fournis par l'utilisateur).
