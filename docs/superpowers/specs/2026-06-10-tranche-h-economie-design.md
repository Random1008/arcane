# Spec — Tranche H : Économie (or & boutique de Tibo)

**Date** : 2026-06-10
**Statut** : Scope approuvé (or par drops + vente ; boutique de Tibo = section fixe réappro/jour +
section journalière rerollée/jour avec 20% d'objets rares = tier joueur+2, plafonné à S).

## 1. Objectif

Une **économie** : monnaie **or**, gagnée par drops et par vente, dépensée à la **boutique de Tibo**
(le Marchand du hub). Deux rayons : **fixe** (réapprovisionné chaque jour) et **journalier** (rerollé
chaque jour, 20% d'objets « rares »).

## 2. Or — `world.ts` + `core/shop.ts`

- `Player.gold: number` (persiste, init 0).
- Drops d'or à la mort (dans `tickWorld`) : crédit instantané `goldReward(tier)` (ennemi) /
  `bossGoldReward(tier)` (boss), scalé par le rang du biome.
- HUD : affiche l'or.

## 3. Boutique — `core/shop.ts`

- `ItemValue` : `itemValue(tier, omega) = TIER_VALUE[tier] × (omega ? 5 : 1)`
  (`TIER_VALUE` F..S croissant). Vente = `Math.floor(value × 0.4)`.
- `ShopItem { id; kind: "weapon" | "armor"; defId?; slot?; type?; tier; price; stock }`.
- `playerShopTier(clearedTiers)` : rang max de biome nettoyé (défaut F). « Rare » = `clamp(tier+2, …, "S")`.
- `dayIndex(nowMs) = floor(nowMs / 86400000)` ; `dayRng(dayIndex)` (LCG seedé) → déterministe par jour.
- `generateShop(playerTier, dayIndex) → { fixed: ShopItem[]; daily: ShopItem[] }` :
  - **fixed** : 6 armes (sword…staff) au `playerTier`, stock 1, prix `itemValue`.
  - **daily** : 6 objets ; pour chacun `dayRng() < 0.2` → **rare** (tier = joueur+2 max S) sinon `playerTier` ;
    arme (type aléatoire) ou armure (slot+type aléatoires) ; stock 1.
- `buyItem(player, item) → boolean` : refuse si `gold < price` ou `stock === 0` ou (arme) barre pleine ;
  sinon `gold -= price`, `stock -= 1`, ajoute (arme → `addWeapon`, armure → `armorInv.push(makeArmor)`).
- `sellWeapon(player, slot)` / `sellArmor(player, invIndex)` : crédite la valeur de vente, retire l'objet
  (jamais les Poings/slot 0).

## 4. Session — cache du jour

- `getShop(playerTier) → { fixed, daily }` : recalcule `dayIndex` (Date) ; si jour changé → régénère et
  met en cache (le stock du jour persiste : les achats décrémentent le cache). `player.gold` vit sur le joueur.

## 5. UI — `BiomeScene` + menu boutique

- PNJ **Tibo** (hub) : action `"shop"` → ouvre le **menu boutique** (comme l'équipement).
- Menu : **or** affiché ; rayon **Fixe** + rayon **Journalier** (nom, tier, prix, stock) cliquables pour
  **acheter** ; liste de tes **armes/armures** cliquables pour **vendre**. Pause sim ; Échap ferme.
- HUD : compteur d'**or**.

## 6. Tests (core, déterministes)

- `itemValue` croît avec le tier ; Ω plus cher ; vente < achat.
- `generateShop` : 6 fixes (armes au tier joueur) ; ~6 journaliers ; **déterministe par `dayIndex`**
  (même jour → même shop) ; un autre jour → shop différent ; les rares (si présents) sont au tier joueur+2 (≤ S).
- `buyItem` : déduit l'or + stock + ajoute l'objet ; refuse sans or/stock.
- `sellWeapon`/`sellArmor` : crédite l'or, retire l'objet ; ne vend pas les Poings.
- `goldReward`/`bossGoldReward` croissent avec le rang ; XP/gold à la mort dans `world`.

## 7. Definition of Done

Or gagné (drops + vente) et dépensé ; boutique de Tibo (fixe réappro/jour + journalière rerollée/jour,
20% rares = tier+2 max S) ; achat/vente fonctionnels ; HUD or. Tests verts, build OK. `idea/economie.md`.

## 8. Hors périmètre

Marché/enchères entre joueurs (Courtier, multijoueur), monnaies multiples (cristaux), potions de l'Alchimiste.
