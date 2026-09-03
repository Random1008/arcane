📈 PROGRESSION RPG

État actuel (`src/core/progression.ts`). XP, niveaux et points (tranche E1). Les **classes** et
l'**arbre de compétences** sont décrits dans [`class-et-arbre-de-competence.md`](class-et-arbre-de-competence.md) (tranche E2).

⭐ XP & NIVEAUX
- L'**XP** tombe des ennemis tués (selon archétype × rang du biome) et en **gros lot** des boss.
- `xpReward` = 6 × facteur d'archétype (chaser 1, tireur 1.2, brute 2.5, fileur 0.6, bombeur 1.3, mannequin 0)
  × (1 + index du rang × 0.6). Boss : `50 × (1 + index du rang)`.
- Coût du niveau suivant : `60 × 1.18^(niveau-1)` (courbe géométrique).
- Chaque niveau → **+3 points de stat** + **+1 point de compétence**.
- Barre d'XP en bas de l'écran + niveau au HUD.

🎚️ POINTS DE STAT (libres) — menu touche **P**
4 stats, réparties librement :
- **Vitalité** : +12 PV max par point (soigne du gain)
- **Puissance** : +3% dégâts par point
- **Agilité** : +2% vitesse par point
- **Précision** : +1.2% chance de crit par point

Ces bonus se **combinent** avec l'armure et les sets (cf. `armures.md` / `sets.md`) et, à venir,
avec les passifs de l'arbre de classe.

🌳 CLASSES & ARBRE (tranche E2)
**Débloquées au niveau 5.** 6 classes, chacune avec son arbre à 3 branches + capacités actives, choisies via un PNJ du Sanctuaire.
→ détails et liste dans [`class-et-arbre-de-competence.md`](class-et-arbre-de-competence.md).
Points de compétence dépensés dans l'arbre ; **respec** via l'Entraîneur.

💡 IDÉES À VENIR
- Sauvegarde persistante de la progression (disque)
- Paliers de récompense par niveau, titres
- Évolution Ω des classes (endgame, cf. doc des classes)
