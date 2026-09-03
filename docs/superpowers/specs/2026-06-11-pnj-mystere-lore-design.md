# Design — Le PNJ mystère « AÏON », conteur du lore

> Tranche : **Lore (1ʳᵉ tranche du dossier `idea/a implementer/`)**
> Date : 2026-06-11 · Branche cible : `feat/game-topdown-controller`

## 1. Objectif

Livrer l'histoire du monde (`game/idea/a implementer/lore.md`) au joueur via un **PNJ
unique, mystérieux et récurrent**. Au départ il s'appelle **« ??? »** ; son vrai nom,
**AÏON**, se dévoile **lettre par lettre** à mesure que le joueur le retrouve et débloque
des **paliers** du lore. Quand le joueur l'aborde, il parle **comme un PNJ normal**, puis
**propose** de raconter une partie de l'histoire de ce monde (choix Oui/Non).

Inclut un **codex** (journal consultable) pour relire les paliers déjà découverts.

## 2. Le personnage

- PNJ unique nommé en interne **AÏON** (`LOREKEEPER_NAME`).
- Visuel distinct des PNJ normaux : silhouette sombre à **aura violette Ω** (cohérent avec
  l'esthétique Ω du jeu). Étiquette flottante = **nom masqué** (voir §5).
- N'est **pas** un PNJ de hub ni un PNJ de biome classique : c'est une **rencontre
  aléatoire** placée dans le biome courant au moment de l'entrée (§3).

## 3. Apparition & cachette (logique pure, testable)

À **chaque entrée dans une instance de biome** (hors Sanctuaire/Nexus — cf. Questions
ouvertes), on effectue un tirage de spawn :

```
chance(rangIndex) = 0.15 + 0.05 × rangIndex     // rangIndex : F=0 … S=6
```

| Rang | F | E | D | C | B | A | S |
|---|---|---|---|---|---|---|---|
| Chance | 15 % | 20 % | 25 % | 30 % | 35 % | 40 % | 45 % |

- Fonction `lorekeeperSpawnChance(rankIndex: number): number` dans `core/lore.ts`.

### Placement « caché » (≠ PNJ normal)

Le joueur entre au **centre** du biome (`entry`). Les PNJ normaux sont posés **près du
centre** (`freeSpawn(..., minDist 90, ...)`) avec une étiquette toujours visible. AÏON doit
être **plus dur à trouver**, tout en gardant son **corps entièrement visible** (aucune
transparence). Règle dédiée `lorekeeperSpawn(rng, level, entry, placed)` :

1. **Loin de l'entrée** : on n'accepte qu'un point à `distance(p, entry) ≥ minFar`, où
   `minFar = 0.55 × distance(centre → coin)` du biome. → il est vers la **périphérie**, pas
   sur le chemin direct entrée↔sortie.
2. **Tapi contre la géométrie** : parmi les candidats valides (`canOccupy`, sans
   chevaucher `placed`), on **privilégie celui collé à un mur** (distance au mur le plus
   proche minimale, ≥ son rayon). Il est ainsi **niché dans un recoin / derrière un
   obstacle**, visible seulement quand on s'en approche ou qu'on contourne le mur.
3. **Score** = combinaison (éloignement du centre ↑, proximité d'un mur ↑) sur ~60 tirages ;
   repli = coin le plus éloigné du centre si aucun candidat « adossé » n'est trouvé.

Le corps d'AÏON est **toujours rendu** (silhouette + aura violette). Ce qui le rend dur à
trouver = **sa position périphérique adossée** + **l'absence d'étiquette à distance** (§5),
pas une quelconque invisibilité.

- Le tirage utilise la source d'aléatoire déjà employée par la génération de biome (RNG
  seedable passée à `generateBiomeWorld`), pas de `Math.random()` brut. Placement et tirage
  sont donc **déterministes et testables**.

## 4. Dialogue (cœur de la demande)

Séquence à l'interaction (touche **F**, via `BiomeScene` + `DialogueBox`) :

1. **Accroche façon PNJ normal** — une réplique d'ambiance mystérieuse, ex.
   « Encore toi… Le monde te pousse vers moi, on dirait. »
2. **Proposition** — *« Veux-tu connaître une partie de l'histoire de ce monde ? »*
   → prompt de choix **[F] Oui · [Échap] Non**.
3. **Oui + nouveau palier disponible** → il **livre le palier** (plusieurs lignes défilées à
   F), le palier est marqué **découvert** (`loreSeen`), et **le nom se dévoile** d'un cran.
4. **Oui mais rien de neuf** (progression insuffisante, ou tous les paliers accessibles déjà
   vus) → réplique d'attente, ex. « Le reste viendra quand tu seras prêt à l'entendre. »
5. **Non** → réplique de clôture, fin du dialogue.

Le prompt Oui/Non est un **petit ajout réutilisable** à `DialogueBox` (un mode « question »
affichant deux hints). Pas de nouveau système de menu.

## 5. Révélation progressive du nom

Nom réel : **AÏON** (4 caractères visibles : `A`, `Ï`, `O`, `N`).

```
lettresRévélées(n) = floor(n / 2)        // n = nombre de paliers découverts (0..8)
nomAffiché = AÏON[0..lettres] + "?".repeat(4 - lettres)
```

| Paliers découverts | 0–1 | 2–3 | 4–5 | 6–7 | 8 |
|---|---|---|---|---|---|
| Nom affiché | `????` | `A???` | `AÏ??` | `AÏO?` | `AÏON` |

- Fonction `revealedName(seenCount: number): string` dans `core/lore.ts`.
- En-tête de la boîte de dialogue : nom masqué.
- **Étiquette flottante** : contrairement aux PNJ normaux (label toujours affiché), celle
  d'AÏON n'apparaît **que lorsque le joueur est proche** (≤ ~140 px). De loin, on ne voit
  que **son corps** — il faut le repérer à l'œil. (Renforce la cachette du §3.)

## 6. Les 8 paliers (repris de `lore.md`), gatés par la progression

Chaque palier a une **condition de déblocage** liée à un jalon, pour que les secrets endgame
ne tombent pas dès le rang F. AÏON livre toujours **le palier débloqué le plus avancé encore
non vu**.

| # | id | Contenu (résumé `lore.md`) | Gate (`isUnlocked`) |
|---|---|---|---|
| 1 | `fracture` | La Fracture ; biomes dangereux ; toi, survivant ; but : explorer/survivre/vaincre | toujours |
| 2 | `monde-avant` | Monde jadis unifié ; énergie d'équilibre ; biomes = morceaux d'avant ; boss = gardiens corrompus ; donjons = lieux anciens | rang **E** atteint |
| 3 | `essence-omega` | L'énergie = **Essence Ω** (temps/vie/réalité) ; Fracture = tentative de la contrôler ; boss = protecteurs transformés | rang **C** atteint |
| 4 | `eternite-neant` | Le monde d'origine : **L'Éternité** ; la Fracture **non accidentelle** ; le **Néant** = conséquence de la rupture | rang **A** atteint |
| 5 | `entite-fracturee` | La Fracture **continue** ; l'**Entité Fracturée** ; boss Ω (Architecte, Chronos) = erreurs de réalité | rang **S** atteint |
| 6 | `fragment` | **Tu es un Fragment de l'Essence Ω** ; le **Nexus du Néant** = cœur du déséquilibre | **Nexus débloqué** (boss S vaincu) |
| 7 | `omganium` | L'**Omganium** = fragments solides d'Essence Ω ; vérité cachée : son usage corrompt et rapproche le joueur de l'état d'entité | **1ᵉʳ objet Ω obtenu** (`omegaUnlocked`) |
| 8 | `revelation` | Les **2 fins** : **Stabiliser** (réparer, limiter Ω) / **Absorber** (devenir une entité) | **boss final Ω vaincu** |

- Le **rang du joueur** se dérive de la progression déjà existante (rangs de biomes nettoyés
  / déblocage d'anneaux). Le mapping exact réutilise les helpers existants (`session`/
  `biomes`/`worldMap`) — à câbler sans dupliquer la logique de rang.
- Palier 8 : on **livre le texte** de la révélation des 2 fins. Les fins **jouables** sont
  hors périmètre (voir §10).
- Le **texte intégral** de chaque palier (les `lines[]`) est rédigé en français, ton
  mystérieux cohérent avec les PNJ existants, dans `core/lore.ts`.

## 7. État & persistance

- Nouveau champ **`loreSeen: string[]`** au niveau de `SaveData` (`src/game/session.ts`),
  **suivant le pattern existant** de `cleared` / `identified` (un `Set<string>` en mémoire,
  sérialisé en tableau). **Pas** de champ ajouté à `Player`.
- `serialize()` ajoute `loreSeen: [...loreSeen]` ; `hydrate()` lit `data.loreSeen ?? []` ;
  `resetSession()` réinitialise à vide. Compat ascendante : une save sans `loreSeen` →
  tableau vide (pas de bump de `SAVE_VERSION` nécessaire, lecture défensive).
- Helpers `session` : `hasLoreSeen(id)`, `markLoreSeen(id)`, `loreSeenCount()`,
  `getLoreSeen(): string[]`.
- Nouveau champ **`Player.grantedAbilities: string[]`** (capacités apprises via livres,
  §11) : ajouté à `createPlayer()` (défaut `[]`) ; couvert par le `...base, ...dp` de
  `hydrate` (défaut base si absent de la save). Les **livres** vivent dans la hotbar, déjà
  sérialisée — l'hydratation doit tolérer un slot `BookInstance` (pas de filtrage qui le
  jette).

## 8. Codex (journal du lore)

- **Nouveau menu** `LoreMenu` (`src/game/ui/loreMenu.ts`) ouvert par une **touche dédiée**
  (proposé : **L** ; à confirmer libre — sinon `J`), suivant le patron des menus existants
  (`equipMenu`, `statsMenu`, `classMenu` : `toggle(player)`, exclusivité avec les autres
  menus/dialogues).
- Affiche, pour chaque palier **découvert**, son **titre + texte**. Les paliers non
  découverts apparaissent **verrouillés** (« ??? » / cadenas). En-tête : nom révélé d'AÏON
  + compteur `X / 8`.
- Lecture seule, fermeture **Échap/L**.

## 9. Découpage technique (fichiers)

| Fichier | Rôle | Nature |
|---|---|---|
| `src/core/lore.ts` | `LORE_PARTS` (8, gates + lines), `lorekeeperSpawnChance`, `lorekeeperSpawn` (placement caché), `nextLorePart(ctx)`, `revealedName`, `LOREKEEPER_NAME`, helper de rang | **pur, testé** |
| `tests/lore.test.ts` | spawn chance par rang, **placement caché** (loin du centre + adossé à un mur, déterministe), gating des paliers, sélection « plus avancé non vu », masquage du nom, exhaustivité des 8 paliers | **Vitest** |
| `src/game/session.ts` | `loreSeen` dans `SaveData` + helpers + serialize/hydrate/reset | TS |
| `tests/playerSave.test.ts` | étendre : round-trip de `loreSeen` | **Vitest** |
| `src/game/render/dialogueBox.ts` | mode « question » (prompt Oui/Non réutilisable) | Phaser |
| `src/game/scenes/BiomeScene.ts` | tirage de spawn + placement caché, visuel AÏON (aura violette), **étiquette de proximité**, branche de dialogue Oui/Non/livraison | Phaser |
| `src/game/ui/loreMenu.ts` | codex consultable | Phaser |
| `src/core/commands.ts` | entrée `/summon` dans `COMMANDS` (suggestions + help) | TS |
| `src/core/summon.ts` | helper **pur** `parseSummon(args)` → action validée (`aion` / `weapon` / `armor` / `book`) ou erreur | **pur, testé** |
| `tests/summon.test.ts` | parsing/validation de `/summon` (types, défauts, ids inconnus, abilityId de livre) | **Vitest** |
| `src/core/combat/hotbar.ts` | type union `HotbarItem = WeaponInstance \| BookInstance` ; `activeWeapon` (null si livre) ; `activeItem` ; `learnBook` (ou dans `skills.ts`) | **pur, testé** |
| `src/core/skills.ts` | `unlockedAbilities`/`abilityForSlot` incluent `grantedAbilities` (niveau 1, priorité de slot) | **pur, testé** |
| `tests/skills.test.ts` + `tests/hotbar.test.ts` | apprentissage d'un livre, capacité utilisable hors classe, non-pollution de l'arbre, priorité de slot | **Vitest** |
| `src/core/world.ts` | `InputState.use` ; `Player.grantedAbilities` ; lecture du `use` pour `learnBook` (ou côté scène) | TS |
| `src/game/input/inputMap.ts` | clic droit → `InputState.use` (front montant) | Phaser |
| `src/game/render/hotbarBar.ts` | rendu d'un slot « livre » (icône/couleur dédiée) | Phaser |
| `src/game/scenes/BiomeScene.ts` | `case "summon"` (AÏON au curseur / pickup d'arme au curseur / pièce d'armure / livre en hotbar) ; clic droit sur livre → `learnBook` | Phaser |
| `game/idea/lore.md` | **nouveau** doc d'état (idea/), synchronisé avec l'implémentation | doc |
| `game/idea/a implementer/lore.md` | **déplacé/retiré** une fois implémenté (sort du dossier « à implémenter ») | doc |
| `game/idea/lore.md` + `game/README.md` | mention du PNJ AÏON, touche du codex, commande `/summon` | doc |

Frontière nette : **toute la logique testable vit dans `core/lore.ts` + `session.ts`** ; la
couche Phaser ne fait que **tirer, placer, afficher**. Aucune règle de gating/aléatoire dans
les scènes.

## 10. Outils dev — commande `/summon`

Commande de chat **dev** (même canal que `/give`, `/spawn`…), surtout utile pour
**forcer l'apparition d'AÏON** (spawn normalement aléatoire 15–45 %) et pour tester le lore.

| Sous-commande | Effet | Destination |
|---|---|---|
| `/summon aion` | place AÏON **au curseur** dans le biome courant (même si le tirage ne l'a pas sorti). S'il est déjà présent, le repositionne. | monde |
| `/summon weapon <id> [tier]` | dépose une **arme au sol** (pickup) au curseur. `id` ∈ sword/dagger/axe/hammer/bow/staff ; `tier` F→S (défaut F). | monde (pickup) |
| `/summon armor <slot> [type] [tier] [set]` | ajoute **une pièce d'armure** à l'inventaire. `slot` ∈ casque/plastron/jambieres/bottes/gants/amulette ; `type` light/medium/heavy (défaut heavy) ; `tier` F→S (défaut S) ; `set` chaos/temps/neant (optionnel) | inventaire (`armorInv`) |
| `/summon book <abilityId>` | ajoute un **livre de compétence** à la hotbar (ex. `/summon book m_fireball`). `abilityId` ∈ clés de `ABILITIES`. **Seule source de livres** (§11). | hotbar |

- **Distinction** avec l'existant : `/give` remplit l'inventaire d'armes, `/armor` donne un
  **set complet** ; `/summon` pose des entités **dans le monde** (AÏON, arme au sol) ou une
  **pièce d'armure unitaire**. Pas de doublon fonctionnel.
- **Frontière** : `parseSummon(args): SummonAction | { error }` est **pur et testé**
  (`core/summon.ts`) ; `BiomeScene` ne fait qu'**exécuter** l'action validée (placement au
  curseur via la logique `/tp` existante, création du pickup/armure via les fabriques
  `world.pickups` / `makeArmor`).
- Messages de retour au format `Système: …` cohérent avec les autres commandes.
- L'armure au sol n'existe pas dans le moteur (les drops d'armure vont en inventaire) — on
  **n'introduit pas** de pickup d'armure ici ; `/summon armor` cible donc l'inventaire.

## 11. Livres de compétence (item)

Un **livre de compétence** est un item portant l'**id d'une capacité** (`abilityId` ∈
`ABILITIES`). En **clic droit** sur le livre tenu en main, le joueur **apprend
instantanément** cette capacité et peut s'en servir comme n'importe quel sort — **même sans
la classe ni le niveau d'arbre requis**. Il **n'apprend que ce sort**, jamais les nœuds
« sur la route » de l'arbre. **Seule source : `/summon book` (§10).**

### Modèle de données

- La hotbar contient désormais des **items de deux natures** :
  ```ts
  export interface BookInstance { kind: "book"; abilityId: string }
  export type HotbarItem = WeaponInstance | BookInstance;   // slots: (HotbarItem | null)[]
  ```
  Discriminant : `("kind" in item && item.kind === "book")`. Une `WeaponInstance` (sans
  `kind`) reste une arme.
- `activeWeapon(h)` renvoie **`null` si l'item actif est un livre** (on n'attaque pas avec un
  livre ; combat/cycle-tier/drop gèrent déjà `null`). Nouveau `activeItem(h): HotbarItem | null`
  pour la couche qui doit voir le livre (rendu, usage).
- Nouveau champ joueur **`grantedAbilities: string[]`** (capacités apprises hors arbre),
  **persisté** (lecture défensive : `dp.grantedAbilities ?? base` à l'hydratation).

### Apprentissage (clic droit)

- Nouveau champ `InputState.use?: boolean` (front montant), alimenté par le **clic droit**
  (`ptr.rightButtonDown()`, libre aujourd'hui) dans `inputMap.ts`.
- `learnBook(player, slotIndex): "ok" | "not-a-book" | "already-known"` (pur, testé) :
  - si le slot contient un livre → ajoute `abilityId` à `grantedAbilities` (sans doublon),
    **vide le slot** (livre consommé), renvoie `ok`.
- `unlockedAbilities(player)` (dans `skills.ts`) renvoie désormais les capacités de l'arbre
  **+** les `grantedAbilities` (niveau **1**). `abilityForSlot` idem. **Priorité de slot :**
  en cas de collision sur un même slot R/C/V/B, **la capacité apprise par livre prime** (le
  livre est forcément utilisable).
- **Aucun nœud d'arbre n'est touché** : `learnBook` n'écrit que dans `grantedAbilities`,
  jamais dans `player.skills`. Le respec/setClass **ne purge pas** `grantedAbilities`
  (les livres sont hors classe) — à confirmer en §13.

### Rendu & UX

- `hotbarBar.ts` : un slot « livre » s'affiche distinctement (icône/abréviation « 📖 » ou
  « LI » + couleur dédiée), avec l'`abilityId` (ou nom de capacité) en infobulle.
- Tenir un livre = **pas d'arme active** (impossible d'attaquer) jusqu'à l'apprendre.
- Message de retour `Système:` à l'apprentissage (« Capacité <nom> apprise ! »).

### Frontière testable

`learnBook`, l'extension de `unlockedAbilities`/`abilityForSlot`, et `parseSummon` (cas
`book`) sont **purs et testés**. `BiomeScene` ne fait que lire le clic droit et appeler
`learnBook`.

## 12. Hors périmètre (tranches suivantes)

- Les **2 fins jouables** (palier 8 ne livre que le texte).
- Quêtes liées au lore, voix/sons spécifiques d'AÏON, animations avancées.
- Liens croisés avec les boss Ω nommés (Architecte/Chronos) au-delà de la mention texte.

## 13. Questions ouvertes (à trancher en implémentation, défauts proposés)

1. **AÏON spawne-t-il aussi au Sanctuaire / dans le Nexus ?** → **Défaut : non** (biomes de
   combat uniquement). Le Sanctuaire reste le hub de services.
2. **Touche du codex** → **Défaut : L** ; bascule sur `J` si `L` est déjà pris.
3. **Aléa de spawn** : réutiliser une RNG seedable de `generate.ts` si elle existe, sinon
   `Math.random()` comme le reste du spawn de contenu.
4. **Mapping rang du joueur** : réutiliser le helper de rang le plus proche déjà présent
   (déblocage d'anneaux) ; à confirmer à la lecture de `worldMap.ts`/`session.ts`.
5. **Livres & respec/changement de classe** → **Défaut : `grantedAbilities` conservé**
   (les livres sont indépendants de la classe). À valider.
6. **Touche d'« usage d'objet »** → **Défaut : clic droit** (libre aujourd'hui). Option : y
   ajouter une touche clavier (ex. `U`) en doublon si besoin.
