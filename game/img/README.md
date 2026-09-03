# Visuels du jeu (déposer les PNG ici)

Dépose tes sprites **PNG** (fond transparent) dans ce dossier, **avec exactement ces noms**.
Dès qu'un fichier est présent, il remplace automatiquement le placeholder — **aucun code à changer**.
Tant qu'un fichier manque, le placeholder géométrique reste (un avertissement console le signale).

Les sprites sont **redimensionnés automatiquement** à la taille de jeu (peu importe leur résolution
d'origine), donc tu peux fournir des sprites plus grands/nets. **Carrés + fond transparent recommandés.**

**Mobs : 5 skins chacun.** Chaque ennemi qui apparaît tire **au hasard** un skin parmi `_1`..`_5`.
Fournis donc 5 dessins par type (tu peux n'en mettre que quelques-uns : les manquants restent en placeholder).

| Fichier(s) | Quoi | Taille indicative |
|---|---|---|
| `player.png` | le joueur | ~28 px |
| `enemy_chaser_1.png` … `enemy_chaser_5.png` | Poursuiveur (mêlée) — 5 skins | ~28 px |
| `enemy_shooter_1.png` … `enemy_shooter_5.png` | Tireur (distance) — 5 skins | ~26 px |
| `enemy_brute_1.png` … `enemy_brute_5.png` | Brute (gros tank) — 5 skins | ~40 px |
| `enemy_swarmer_1.png` … `enemy_swarmer_5.png` | Fileur (petit, rapide) — 5 skins | ~18 px |
| `enemy_bomber_1.png` … `enemy_bomber_5.png` | Bombeur (explose) — 5 skins | ~24 px |
| `enemy_boss.png` | Boss (tous rangs) | ~56 px |
| `enemy_dummy.png` | Mannequin d'entraînement | ~32 px |
| `projectile.png` | Projectile (joueur & ennemis) | ~12 px |

Notes :
- Les **biomes** se distinguent par leur palette (couleurs) ; tu pourras fournir des tuiles de sol plus tard.
- Les **armes** (barre du bas), **PNJ** et **objets au sol** sont encore en placeholders ; on pourra leur
  brancher des sprites quand tu les fourniras (on ajoutera les entrées correspondantes ici).
- Pour des **animations** (frames), on ajoutera plus tard un format spritesheet ; pour l'instant : 1 image fixe par entité.
