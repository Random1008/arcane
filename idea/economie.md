💰 ÉCONOMIE (or & boutique de Tibo)

État actuel (`src/core/shop.ts`, `player.gold`, menu boutique de `BiomeScene`).

🪙 OR (`player.gold`)
- **Drops** : chaque ennemi/boss tué crédite de l'or, **scalé par le rang du biome**
  (`goldReward` : F≈3 → S≈21 par ennemi ; `bossGoldReward` : F≈60 → S≈420).
- **Vente** : revendre ses armes/armures à Tibo (≈ **40%** du prix d'achat).
- Affiché au HUD (« ⦿Or:N »).

🛒 BOUTIQUE DE TIBO (PNJ Marchand du hub, parle-lui)
Deux rayons, **réinitialisés chaque jour** (jour calendaire) :
- **Fixe** : les **6 armes** au **tier du joueur**, réapprovisionnées chaque jour.
- **Journalière** : ~6 objets aléatoires (arme ou armure) **rerollés chaque jour** ;
  chacun a **20% de chance d'être « rare »** = **2 tiers au‑dessus du joueur**
  (échelle F→S, **plafonné à S** ; Ω n'est pas compté).
- **Acheter** : si assez d'or → l'objet va à l'inventaire (arme → barre, armure → inventaire d'armures) ;
  le stock du jour décrémente.
- **Vendre** : clique tes armes/armures pour les revendre.

📅 « JOUR »
Le stock est mis en cache pour la journée (jour UTC). Nouveau jour (ou progression de tier) → réappro/reroll.

🎯 TIER DU JOUEUR
= rang max de biome **nettoyé** (défaut F). C'est lui qui fixe le tier des objets de la boutique
et la définition du « rare » (tier + 2).

💡 IDÉES À VENIR
- Potions (Mira l'Alchimiste), améliorations payantes (Brak/Lira)
- Marché/enchères entre joueurs (Courtier, multijoueur)
- Monnaies spéciales (cristaux, monnaie Ω du Voyageur du Néant)
