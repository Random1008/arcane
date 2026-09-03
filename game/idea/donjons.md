🏰 DONJONS

État actuel (`src/core/dungeon.ts`, mode donjon de `BiomeScene`). Instances **ramifiées** accessibles
depuis les **entrées de donjon** d'un biome.

🚪 ENTRÉE
Marche sur une **entrée de donjon** (carré sombre dans un biome) → lance le donjon de ce biome
(même combat/capacités/menus/HUD qu'un biome).

🗺️ STRUCTURE (graphe ramifié)
- Un **arbre** de salles (~5 au rang F → 9 au rang S) généré aléatoirement depuis la salle d'entrée.
- Types de salles :
  - **entrée** : départ (quelques ennemis légers)
  - **normale** : combat (nombre d'ennemis ↑ avec la profondeur et le rang)
  - **trésor** : cul-de-sac avec un **coffre secret**
  - **boss** : la salle la plus éloignée → **mini-boss**
- Salles voisines reliées par des **portes** (N/S/E/O).

🔓 PROGRESSION
- Les **portes sont verrouillées** tant que la salle n'est pas **nettoyée** (tous les ennemis vaincus).
- Une fois nettoyée, les portes s'ouvrent ; marche sur une porte ouverte → salle voisine
  (tu arrives à la porte opposée). **L'état nettoyé des salles est conservé** (tu peux revenir en arrière).
- **Coffres** : marche dessus → s'ouvre → lâche du loot (système de drop habituel).

🏆 FIN
- Salle **boss** : bats le mini-boss → un **coffre garanti** (meilleur loot + chance d'Omganium/armure Ω)
  + un **portail de sortie** apparaissent. Marche sur le portail → retour à la carte.
- **Mort** en donjon : respawn au Sanctuaire (perte de 20% du stuff), comme partout.
- **M** = abandonner le donjon (retour carte).

🧱 HUD
« Donjon <biome> — Salles x/total » + indicateur de salle (ennemis / mini-boss / nettoyée).

💡 IDÉES À VENIR
- Salles à énigmes/pièges scriptés, mini-carte du donjon
- Donjons d'élite, modificateurs (malédictions), clés/portes spéciales
- Donjons « infinis » de l'endgame (Nexus Infini, tranche G)
