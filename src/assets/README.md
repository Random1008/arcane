# Assets

Les **visuels (PNG)** se déposent dans **`game/img/`** (servi à la racine via `publicDir: "img"`).
Voir **`game/img/README.md`** pour la liste exacte des noms de fichiers attendus et les tailles.

- Le manifeste `manifest.ts` associe chaque clé logique (`player`, `enemy_chaser`, …, `enemy_boss`,
  `projectile`) à un fichier `/<clé>.png` dans `img/`.
- Tant qu'un fichier est absent, `placeholders.ts` génère un placeholder géométrique (aucune erreur
  bloquante ; un `console.warn` signale le fichier manquant).
- Les sprites sont **auto-redimensionnés** à la taille de jeu (cf. `render/sprites.ts` et le rendu du boss).
- Animations (spritesheets) : à ajouter plus tard ; pour l'instant 1 image fixe par entité.
