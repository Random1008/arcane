# Spec — Tranche D : Loot, Ω, craft & sets

**Date** : 2026-06-08
**Projet** : RPG / Roguelite pixel art (action-RPG top-down)
**Tranche** : D (loot/Ω/craft/sets) — s'appuie sur A (armes), C (ennemis/boss)
**Statut** : Scope approuvé par l'utilisateur (tout D)
**Ordre de build** : **D1** (loot & raretés & pity) → **D2** (Omganium & craft Ω) → **D3** (armure & sets Ω)

---

## 1. Objectif

Boucler la boucle « explorer → combattre → **looter** → améliorer → craft Ω → repeat » : les ennemis
et boss **lâchent du butin** de rareté variable (F→S→**Ω**) avec anti-malchance ; l'**Omganium** permet
de **transformer une arme S en arme Ω** ; un **système d'armure** avec **sets Ω** (Chaos/Temps/Néant)
offre des **bonus de set** (2/4/6 pièces).

---

## 2. Raretés (commun)

Rareté = tier d'arme existant **F→S** + une rareté supplémentaire **Ω** (modélisée par un drapeau
`omega` sur l'instance, pour ne pas casser les tiers F→S des biomes/ennemis).

`core/loot.ts` :
- `RARITIES = ["F","E","D","C","B","A","S","omega"]`, poids de base `[40,25,15,10,6,3,1,0.3]`.
- `rollRarity(rng, biasLevel, pity)` : tirage pondéré ; les poids des hautes raretés montent avec
  `biasLevel` (= index du rang du biome 0..6) et avec `pity`. Renvoie une rareté.
  - poids effectif d'un rang `r` = `base[r] × (1 + biasLevel×0.35 + pity×0.05)^r`.
- **Pity** : compteur `player.pity` (persiste). À chaque drop : si rareté ≥ A → `pity = 0`, sinon `pity++`.

`Tier` reste `F..S`. Ω = `{ tier: "S", omega: true }`.

---

## 3. D1 — Loot & drops

- À la **mort d'un ennemi** (dans `tickWorld`) : `rng() < DROP_CHANCE` (≈0.35) → tire une rareté
  (`rollRarity` avec le rang du biome + pity), choisit un **type d'arme** au hasard, et crée un
  **`WeaponPickup`** au sol à sa position. Met à jour `player.pity`.
- **Boss** : à sa mort, **2-3 drops garantis** de rang élevé (biasLevel + boss bonus) + (cf. D2) chance d'Omganium.
- `WeaponPickup` gagne `omega: boolean`. Le ramassage (existant) ajoute l'arme à la barre avec son tier+omega.
- `core/combat/weapons.ts` : `computeStats(def, tier, omega=false)` — si omega : `atk ×= OMEGA_ATK_MULT (1.8)`,
  crit +0.2 (max 0.9), critDamage +0.5, `signature = "pierce"`. `WeaponInstance` gagne `omega?: boolean`.
- Rendu : pickups Ω en couleur spéciale + « Ω » ; barre d'inventaire et HUD affichent « Ω » au lieu du tier.

## 4. D2 — Omganium & craft Ω

- **Omganium** : matériau. `world.materials: MaterialPickup[]` (drop rare ~5% sur ennemi, **50% sur boss**) ;
  ramassage → `player.omganium++` (compteur persistant sur le joueur).
- **Craft Ω** (commande `/craft` + indice UI) : si l'arme active est **tier S non-omega** et `player.omganium ≥ 1`
  → consomme 1 Omganium, passe l'arme en **omega = true** (+ **bonus/malus aléatoire** : un modificateur
  parmi un petit set, ex. +crit / +vitesse / −portée…). Sinon message d'erreur explicite.

## 5. D3 — Armure & sets Ω

- **Armures** `core/armor.ts` : types `light|medium|heavy` ; stats `defense`, `speedMod`, `critMod`.
  **6 slots** d'équipement : `casque, plastron, jambières, bottes, gants, amulette`.
- `player.armor: Record<Slot, ArmorInstance|null>`. **Défense** réduit les dégâts subis
  (`applyDamage` au joueur : `amount × (100/(100+def))`). Équipement via menu (touche **I**).
- **Sets Ω** : `chaos` (dégâts/explosions/overdrive), `temps` (ralentit/stoppe les ennemis),
  `neant` (invisibilité/furtivité). Une `ArmorInstance` Ω porte un `set`. Bonus actifs selon le nombre
  de pièces équipées du même set : **2 / 4 / 6 (complet)** — effets croissants (data-driven `core/sets.ts`).
- Drops/craft d'armures Ω de set (réutilise le système de loot/craft).

---

## 6. Architecture (par étape)

- **D1** : `core/loot.ts` (rollRarity, rollDrop), `weapons.ts` (omega dans computeStats + WeaponInstance),
  `world.ts` (`player.pity`, drop à la mort, `WeaponPickup.omega`, boss drops), rendu pickups/HUD/barre Ω.
- **D2** : `core/omganium`/loot (drop matériau), `world.materials` + `player.omganium`, `craft` (core fn) +
  commande `/craft` (BiomeScene).
- **D3** : `core/armor.ts`, `core/sets.ts`, `player.armor`, défense dans `applyDamage`, menu d'équipement
  (nouvelle UI), effets de set, drops d'armures.

---

## 7. Tests (core, déterministes)

- **loot** : `rollRarity` — RNG forcé bas → F, forcé haut → raretés élevées ; biasLevel haut décale vers
  le haut ; somme des poids cohérente ; Ω atteignable. Pity réinitialisé sur rareté ≥ A.
- **weapons omega** : `computeStats(..., true)` > non-omega (atk, crit) ; signature pierce.
- **world** : un ennemi qui meurt peut droper un `WeaponPickup` (RNG forcé) ; boss → drops garantis.
- **D2** : drop Omganium (boss 50%) ; `craft` consomme 1 Omganium et passe l'arme S en Ω ; refus si pas S / pas d'Omganium.
- **D3** : défense réduit les dégâts ; bonus de set actifs aux seuils 2/4/6 ; équiper/déséquiper.

---

## 8. Definition of Done (par étape)

- **D1** : ennemis/boss lâchent des armes de rareté variable (jusqu'à Ω), pity fonctionnel, Ω affichée ; tests verts.
- **D2** : Omganium ramassable, `/craft` transforme S→Ω avec bonus/malus ; tests verts.
- **D3** : armure équipable (6 slots) réduisant les dégâts, 3 sets Ω avec bonus 2/4/6 ; tests verts.

---

## 9. Hors périmètre

Économie/monnaies (or/cristaux, marché) = tranche H. Multijoueur (loot individuel) = K.
Effets de set très avancés (vrai « stop time » global) simplifiés en effets locaux jouables.
