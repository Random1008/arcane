# Effets sonores (optionnels)

Par défaut les effets sont **synthétisés** (WebAudio). Pour remplacer un son, dépose un fichier
**`<id>.mp3`** ici (servi à l'URL `/sfx/<id>.mp3`) — il sera utilisé automatiquement à la place
du son synthétisé, sans changer le code.

| Fichier | Joué quand |
|---|---|
| `attack.mp3` | attaque (clic gauche) |
| `hit.mp3` | un coup touche (dégâts affichés) |
| `playerHurt.mp3` | le joueur subit des dégâts |
| `enemyDeath.mp3` | mort d'un ennemi |
| `pickup.mp3` | ramassage (arme, Omganium) |
| `levelup.mp3` | montée de niveau |
| `ability.mp3` | capacité lancée (R/C/V/B) |
| `bossIntro.mp3` | apparition d'un boss |
| `buy.mp3` | achat à la boutique |
| `uiClick.mp3` | clic d'interface (carte) |
| `death.mp3` | mort du joueur |

Référence : `src/game/audio/manifest.ts` · réglages volume/mute : panneau **F1**.
