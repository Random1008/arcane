👾 ENNEMIS (mobs)

État actuel (`src/core/enemies.ts`, `src/core/ai.ts`, `src/core/biomeEnemies.ts`).

🎭 5 ARCHÉTYPES + le mannequin
PV de base = 40, dégâts de contact de base = 5 (multipliés par l'archétype × le rang du biome).

| Archétype | ×PV | ×Dégâts | Vitesse | Rayon | Recul | Comportement |
|---|---|---|---|---|---|---|
| 🔴 Poursuiveur | 1.0 | 1.0 | 120 | 14 | 120 | fonce au contact |
| 🟣 Tireur | 0.7 | 0.8 | 120 | 13 | 60 | garde ses distances (260↔170) et tire (cadence 1.3) |
| ⬜ Brute | 3.0 | 2.2 | 70 | 20 | 260 | lent, très résistant, cogne fort |
| 🟧 Fileur | 0.4 | 0.6 | 185 | 10 | 70 | petit, rapide, en meute |
| 🟡 Bombeur | 0.6 | 2.5 | 150 | 13 | 200 | explose au contact (zone 80) puis meurt |
| 🟦 Mannequin | ×5 | 0 | 0 | 16 | 0 | cible d'entraînement (immobile) |

😡 RAGE
Sous **30% de PV**, un ennemi enrage : **×1.4 vitesse** et **×1.5 dégâts** (teinte rouge).

🧠 IA
- Poursuiveur/Brute/Fileur → approche + dégâts de contact (cadence anti-spam + i-frame joueur 0.12s).
- Tireur → se positionne (approche / recule / strafe) et tire des projectiles ; longe les murs s'il est acculé.
- Bombeur → fonce et détone à mi-portée d'explosion (dégâts de zone).
- **Séparation** : les ennemis ne se superposent pas (poussée mutuelle).

🎨 5 SKINS PAR MOB
Chaque mob tire au hasard 1 skin parmi 5 à son apparition (fichiers `img/enemy_<type>_<1..5>.png`).

🌍 SETS PAR BIOME
Chaque biome a ses ennemis **nommés et thématiques** (générés). Exemples :
- Forêt → Louveteau affamé (fileur), Sylphe archère (tireur), Ours brun gardien (brute)
- Catacombes → Liche osseuse (tireur), Goule charognarde (poursuiveur), Crâne hurlant (bombeur)
- Volcan → Salamandre de magma, Colosse d'obsidienne, Crapaud de cendres ardentes

📈 SCALING PAR RANG (biome)
PV et dégâts ×selon le rang : F ×1.0 → S ×6.0 (PV) / ×3.0 (dégâts). Nombre d'ennemis : F 3 → S 9.

💡 IDÉES À VENIR
- Sbires d'élite, variantes champions (auras, gros loot)
- Nouveaux archétypes (soigneur, invocateur, bouclier)
- Comportements de meute coordonnés
