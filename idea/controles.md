🎮 CONTRÔLES & COMMANDES

État actuel (`src/game/input/inputMap.ts`, `src/game/scenes/BiomeScene.ts`, `src/core/commands.ts`).

⌨️ TOUCHES

| Action | Touche |
|---|---|
| Se déplacer | ZQSD / WASD / flèches |
| Viser | souris |
| Attaquer (arme active) | clic gauche (mêlée = maintenir ; distance = un clic par tir) |
| Dash | Espace (i-frames) |
| Blink (téléportation courte) | E |
| Changer le tier de l'arme | T |
| Sélectionner une arme | 1 – 9 (ou molette) |
| Ramasser l'arme au sol | G (près d'une arme) |
| Jeter l'arme active | X |
| Équipement (armures) | I |
| Carte du monde | M |
| Parler à un PNJ | F |
| Chat / commandes | Entrée (ouvre/envoie), Échap (ferme) |
| Stats | P |
| Arbre de compétences / classe | K |
| Capacités actives | R / C / V / B |
| Panneau debug (tuning, godmode…) | F1 |
| Console d'administration web (ouvre /admin.html, connexion admin/admin1234) | F2 |

🗺️ CARTE DU MONDE (touche M)
- **Molette** = zoomer/dézoomer (centré sur le curseur)
- **Clic-glissé** = déplacer la vue (pan)
- **R** = recentrer / réinitialiser le zoom
- **Clic** sur un biome débloqué = y entrer

💬 CHAT & SUGGESTIONS
Ouvre le chat avec **Entrée**. Tape `/` pour une commande ; une **suggestion** s'affiche en haut
(ex. taper `/god` propose `/godmode`).

🛠️ COMMANDES (`/help` pour la liste)
- `/godmode` — (in)vulnérabilité
- `/heal` — PV + énergie au max
- `/give <arme> [tier]` — ajoute une arme (sword/dagger/axe/hammer/bow/staff)
- `/tier <F-S>` — change le tier de l'arme active
- `/kill` — élimine tous les ennemis
- `/spawn [n]` — fait apparaître n ennemis
- `/tp` — téléporte au curseur
- `/craft` — transforme l'arme S active en arme Ω (coûte 1 Omganium)
- `/omganium [n]` — ajoute n Omganium (test)
- `/armor <chaos|temps|neant>` — ajoute un set Ω complet (test)
- `/help` — liste les commandes

💡 IDÉES À VENIR
- Rebind des touches, support manette
- Compétences actives (sorts) liées à des touches (cf. Mage Eldrin, tranche E)
