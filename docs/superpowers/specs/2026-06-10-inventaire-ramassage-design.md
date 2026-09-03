# Spec — Inventaire : ramassage manuel & jet d'armes

**Date** : 2026-06-10
**Statut** : Scope approuvé (la barre rapide = l'inventaire ; touches dédiées).

## Objectif

Donner le contrôle sur les armes : **ramassage manuel** (au lieu de l'auto-ramassage), possibilité
de **jeter** une arme, la **barre rapide (9 slots)** servant d'inventaire.

## Comportement

- **Inventaire = barre rapide** (9 slots, slot 1 = Poings, inchangé). Pas de sac séparé.
- **Ramasser** (touche **G**, front montant) : si une arme au sol est à portée, la ramasser dans le 1er
  slot libre et l'équiper. Si l'inventaire est plein → rien (feedback « Inventaire plein »). Plus
  d'auto-ramassage des armes.
- **Jeter** (touche **X**, front montant) : lâche l'**arme active** au sol (interdit sur les Poings/slot 0).
  Le pickup conserve `defId/tier/omega/mod` (re-ramassable, sans perte). Le slot devient vide, l'arme
  active repasse aux Poings.
- **Omganium** (matériau) : reste **auto-ramassé** (ressource).
- **Prompt** : quand une arme est à portée, afficher « [G] Ramasser <nom> [tier/Ω] » (ou « Inventaire
  plein — X pour jeter ») près de l'arme.

## Implémentation

- `world.ts` : `InputState.pickup?`/`drop?` ; `WeaponPickup.mod?` ; `tickWorld` — remplacer la boucle
  d'auto-ramassage des armes par : ramassage manuel (arme la plus proche à portée si `input.pickup`) et
  jet de l'arme active si `input.drop`. Matériaux inchangés (auto).
- `inputMap.ts` : touches **G** (pickup) et **X** (drop), fronts montants.
- `BiomeScene.ts` : texte de prompt près de l'arme la plus proche à portée.

## Tests

- ramassage manuel : sur une arme + `pickup` → équipée ; sans `pickup` → reste au sol.
- inventaire plein : `pickup` ne prend rien si aucun slot libre.
- jet : `drop` lâche l'arme active au sol (pickup conserve tier/omega/mod), slot vidé, actif = Poings ;
  ne jette pas les Poings.
- Omganium toujours auto-ramassé.

## Hors périmètre

Sac séparé/plus grand, tri/stacking, jet d'armures.
