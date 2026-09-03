🌍 BIOMES & MONDE

État actuel (`src/core/biomes.ts`, `src/core/worldMap.ts`, `src/core/generate.ts`).

🗺️ STRUCTURE EN ANNEAUX
- **Sanctuaire** au centre (hub sûr, sans ennemis, cf. `pnj.md`).
- Autour, **49 biomes** répartis en 7 anneaux de difficulté F → S.
- **n+1 biomes par anneau** : F=4, E=5, D=6, C=7, B=8, A=9, **S=10** (total 49).
- Plus on s'éloigne du centre, plus le rang (et la difficulté) montent.

🌫️ BROUILLARD & IDENTIFICATION
- Un biome non exploré = **fond noir avec « ? »** sur la carte.
- On **devine** où on est au visuel (mer, volcan, désert…) ; parler à un **PNJ** du biome **identifie** la zone (nom + couleur sur la carte).

🔒 DÉVERROUILLAGE PROGRESSIF
- Seul le **Sanctuaire** est ouvert au départ : il est **obligatoire** — le 1er anneau (rang F) ne se
  débloque **qu'après l'avoir visité**.
- Ensuite, il faut **nettoyer TOUS les biomes d'un anneau** pour débloquer l'anneau suivant.
- Biomes verrouillés = 🔒 non cliquables sur la carte.

📈 SCALING PAR RANG (`TIER_SCALING`)

| Rang | ×PV ennemis | ×Dégâts | Nb ennemis |
|---|---|---|---|
| F | 1.0 | 1.0 | 3 |
| E | 1.4 | 1.15 | 4 |
| D | 1.9 | 1.3 | 5 |
| C | 2.6 | 1.5 | 6 |
| B | 3.5 | 1.8 | 7 |
| A | 4.6 | 2.2 | 8 |
| S | 6.0 | 3.0 | 9 |

🧱 GÉNÉRATION (par biome)
Murs procéduraux, ennemis thématiques scalés, armes au sol (au rang du biome), 1 sortie,
marqueurs d'entrée de donjon. Chaque biome a sa **palette** de couleurs (sol/mur/accent).
Le **dernier biome non nettoyé de chaque anneau** contient le **boss du rang** à la place des ennemis
(placement dynamique, marqué ☠ sur la carte — cf. `boss.md`).

📋 LISTE (extrait par rang)
- **F** : Plaines, Forêt, Caverne, Rivière
- **E** : Marais, Collines venteuses, Bois sombres, + procéduraux
- **D** : Désert, Toundra, Marécage toxique, …
- **C** : Montagnes, Jungle, Ruines, …
- **B** : Volcan, Banquise, Catacombes, …
- **A** : Abysses, Cité céleste, …
- **S** : Faille du Néant, Dimension fracturée, …, Trône du Dieu Endormi

💡 IDÉES À VENIR
- Donjons réels (actuellement marqueurs) — cf. tranche F
- Mécaniques de terrain (lave, glace glissante, vapeurs)
- Tuiles de sol en pixel art par biome
- Endgame : Nexus Infini (cf. spec)
