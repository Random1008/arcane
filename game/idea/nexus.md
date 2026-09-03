♾️ NEXUS INFINI (endgame)

État actuel (`src/core/nexus.ts`, mode nexus de `BiomeScene`). Mode **endgame sans fin**.

🔓 ACCÈS
Un **portail Nexus** apparaît au **Sanctuaire** une fois le **boss S (Trône du Dieu Endormi)** vaincu.
Marche dessus → entre dans le Nexus (palier 1).

🌀 LE HUB (8 portails) — **7 niveaux de difficulté**
Une grande salle sûre avec **8 portails** (2 par mur) :
- **7 portails de combat** = **niveaux de difficulté 1 à 7** (trivial → quasi impossible).
- **1 portail de boss**.
Choisis le niveau que tu veux affronter.

⚔️ SALLES
- **Niveau 1** : **0 monstre** → la salle est nettoyée d'entrée, le portail de retour s'ouvre direct
  (retour au hub à 8 portails).
- **Niveaux 2 → 7** : de plus en plus d'ennemis, de plus en plus coriaces ; **niveau 7 = quasi impossible**.
  Nettoie tous les ennemis → **portail de retour** → hub. Plus le niveau est haut, meilleur le loot.
- **Portail de boss** : mini-boss surpuissant (niveau 7) → **coffre garanti**.

📈 SCALING & RÉCOMPENSES
- `nexusScaling(niveau 1..7)` : PV `1.5×n²`, dégâts `1+1.1n`, nombre d'ennemis (0 au niv 1 → 17 au niv 7).
- Loot au plafond **S** (raretés F→Ω biaisées au max) ; **Omganium** possible (rang d'endgame).
- **Record** = **meilleur niveau nettoyé** (conservé). **Mort** = fin du run ; **M** = abandonner.

🧱 HUD
« Nexus Infini — niveau N (record niv. R) » + état de la salle.

💡 IDÉES À VENIR
- Modificateurs/malédictions de run (risque ↔ récompense)
- Récompenses cosmétiques / titres par palier, classement
- Évolution Ω des classes débloquée en profondeur (cf. `class-et-arbre-de-competence.md`)
- Boss Ω nommés comme paliers-jalons
