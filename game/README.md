# Top-down Roguelite — Tranches 0 (jouabilité) + A (armes) + B (monde)

Socle de jouabilité d'un action-RPG top-down (Phaser 3 + TypeScript). Toute la logique de jeu
vit dans `src/core/` (pure, testée) ; `src/game/` est la couche Phaser (rendu, input, debug).

## Lancer

```bash
cd game
npm install
npm run dev
```

Puis ouvrir l'URL affichée dans le navigateur.

## Comptes & connexion (obligatoire)

Le jeu s'ouvre sur une **page de connexion** : il faut un **compte** pour jouer. On peut **s'inscrire**
(bouton « Créer un compte ») ou se connecter, avec une case **« Rester connecté »** (cochée = session
persistante via localStorage ; décochée = le temps de la session). La **progression est sauvegardée par
compte** côté serveur (auto‑save + à la mort/sortie). Bouton **Déconnexion** en haut de l'écran.
Les comptes peuvent aussi être créés depuis la **console d'administration** (rôles `player`/`operator`/`admin`).
Nécessite le serveur (`npm run dev` le lance).

## Console d'administration (backend + comptes)

```bash
npm run dev        # lance le jeu (Vite) ET le serveur admin (port 8787) ensemble
# jeu seul : npm run dev:game   ·   serveur seul : npm run server
```

Dans le jeu, **F2** ouvre la **console d'administration** (`/admin.html`) dans un nouvel onglet.
⚠️ Le login échoue (HTTP 500) si le **serveur admin n'est pas lancé** — `npm run dev` le démarre avec le jeu.
Connexion par défaut : **admin / admin1234**. La console pilote le jeu **en direct** (joueur, monde,
combat, réglages live, contenu/économie) et gère les **comptes**. Outil **dev local** (auth réelle
bcrypt+JWT, non durci pour une exposition publique). Voir `idea/admin.md`.

## Tests

```bash
npm test        # logique core/ + serveur (Vitest, headless)
npm run build   # vérif TypeScript + build de production (jeu + page admin)
```

## Contrôles

| Action | Touche |
|---|---|
| Se déplacer | ZQSD / WASD / flèches |
| Viser | souris |
| **Attaquer (arme active)** | **clic gauche** (mêlée = coup en arc ; distance = tir semi-auto, un par clic) |
| **Choisir l'arme** | **touches 1–9** ou **molette** |
| **Changer le tier (F→S)** | **T** |
| **Chat** | **Entrée** (ouvrir / envoyer) · **Échap** (fermer) |
| Dash | Espace |
| Blink / téléportation | E |
| Panneau debug | F1 |
| Panneau admin (or, niveaux, classes, déblocage, spawn, Nexus) | F2 |

## Armes (barre d'inventaire façon Minecraft)

On démarre avec les **Poings** (slot 1, toujours là). Les 6 armes sont **posées au sol** dans la
salle : marche dessus pour les **ramasser** (elles s'ajoutent à la barre et s'équipent) :
**Épée** (équilibrée) · **Dague** (rapide, haut crit) · **Hache** (arc large = cleave) ·
**Marteau** (lent, onde de choc 360° + gros knockback) · **Arc** (transperce les ennemis) ·
**Bâton** (gros projectile lent). Chaque arme a ses stats (ATK / vitesse / crit / portée / arc).
Le **tier** (T) multiplie l'ATK (F ×1 → S ×5.5). Les **coups critiques** s'affichent en rouge et plus gros.

## Monde & biomes

Le jeu démarre sur la **carte du monde**. Au **centre** : le **Sanctuaire** (★), biome de départ
commun, sûr (sans ennemis, avec des armes à ramasser). Autour, **49 biomes** en anneaux, chaque
anneau ayant **un biome de plus** que le précédent (**F=4** au centre → **S=10** à l'extérieur =
plus difficile). **Progression par déverrouillage** : seuls le Sanctuaire et le **1er anneau (rang
F)** sont ouverts au départ ; il faut **nettoyer TOUS les biomes d'un anneau** (vaincre tous leurs
ennemis) pour **débloquer l'anneau suivant**. Les biomes **verrouillés** affichent un **🔒**
(non cliquables) ; les biomes **non identifiés** restent en **« ? »** sur la carte : tu **devines**
d'après le visuel de la zone (rouge = volcan, bleu = mer/rivière, blanc = neige…). Clique un biome
débloqué pour entrer dans une **zone générée** procéduralement (sol/murs colorés selon le biome,
ennemis dont la résistance/nombre dépendent du rang, une **sortie** = disque clair, des **entrées de
donjon** = carrés sombres, à remplir plus tard). Reviens à la carte via la sortie ou la touche
**M / Échap**. Tes **armes et tes PV persistent** d'un biome à l'autre.

- **Cercle bleu** = toi. **Ennemis variés et nommés** propres à chaque biome — 5 archétypes :
  **poursuiveur** (mêlée), **tireur** (projectiles), **brute** (lent, costaud), **fileur** (rapide, en meute),
  **bombeur** (explose au contact). Ils approchent/attaquent selon leur type et **enragent** (teinte rouge,
  plus rapides/forts) sous 30 % de PV ; leur résistance/nombre montent avec le rang du biome.
- **Boss** : le **boss du rang garde le dernier biome de chaque anneau** — quel que soit ton ordre de
  visite, le **dernier biome non nettoyé** de l'anneau (marqué **☠** sur la carte) contient un **boss
  multi-phases** avec barre de vie, attaques **télégraphiées** (volée, anneau, charge, invocation, zone)
  qui **changent de phase** à PV bas et laissent une **fenêtre de faiblesse** après une charge. **Le
  vaincre nettoie le biome et complète l'anneau.**
- **Loot** : ennemis et boss **lâchent des armes** au sol, de rareté variable **F → S → Ω**. La rareté
  monte avec le rang du biome ; les **boss** donnent 3 drops garantis de meilleure qualité. Un système
  **anti-malchance (pity)** augmente tes chances de rare après des drops communs. Les armes **Ω**
  (violet/or, marquées « Ω ») ont de grosses stats et **transpercent**.
- **Omganium & craft Ω** : un matériau rare, l'**Omganium** (losange vert « ✦ »), tombe parfois des
  ennemis et **50 % du temps des boss**. Avec **1 Omganium** et une **arme de tier S** en main, tape
  **`/craft`** pour la transformer en **arme Ω** avec un **modificateur aléatoire** (Féroce/Vif/Colossal/Instable).
- **Armure & sets Ω** : 6 emplacements (casque, plastron, jambières, bottes, gants, amulette). La
  **défense** réduit les dégâts subis. Les **boss lâchent des pièces d'armure Ω** appartenant à un des
  3 **sets** — **Chaos** (+dégâts), **Temps** (ralentit les ennemis), **Néant** (esquive) — avec des
  **bonus à 2 / 4 / 6 pièces** du même set. Ouvre l'**équipement avec `I`** (clic pour équiper/retirer).
  *(Astuce test : `/armor chaos|temps|neant` donne un set complet, `/omganium` de la ressource.)*
- **PNJ (cercles dorés)** : approche-toi et appuie sur **F** pour discuter. Le PNJ se présente
  (son nom apparaît) et te dit où tu es → le biome devient **identifié** (nom + couleur) sur la carte.
- **Audio** : effets sonores **synthétisés** (attaque, coups, ramassage, level-up, boss…) + **musique
  d'ambiance** par contexte (carte / biome / boss / Nexus) avec fondu. Volumes & muet : panneau **F1**
  (persistés). Remplaçables par tes fichiers : dépose `img/sfx/<id>.mp3` ou `img/music/<ctx>.mp3`.
- **Économie** : les ennemis/boss lâchent de l'**or** (scalé par rang). Parle à **Tibo** (Marchand du
  Sanctuaire) pour ouvrir sa **boutique** : rayon **fixe** (réappro chaque jour) + rayon **journalier**
  (rerollé chaque jour, **20%** d'objets rares = tier joueur +2, max S). **Achète/vends** armes et armures.
- **Nexus Infini (endgame)** : après avoir vaincu le **boss S**, un **portail** apparaît au Sanctuaire →
  un **hub à 8 portails** = **7 niveaux de difficulté** (niveau 1 = 0 monstre → niveau 7 = quasi
  impossible) **+ 1 portail de boss** (coffre garanti). Ton **meilleur niveau** est conservé. **M** pour abandonner.
- **Donjons** : marche sur une **entrée de donjon** (carré sombre) d'un biome → instance **ramifiée** de
  salles à explorer. Nettoie une salle → ses **portes** s'ouvrent ; des culs-de-sac cachent des **coffres** ;
  la dernière salle abrite un **mini-boss** → coffre garanti + portail de sortie.
- **Progression RPG** : tuer/looter donne de l'**XP** → **niveaux** (barre en bas). Chaque niveau =
  **+3 points de stat** (touche **P** : Vitalité/Puissance/Agilité/Précision) et **+1 point de compétence**.
- **Classes & compétences** : choisis **1 classe** parmi 6 (Guerrier, Assassin, Archer, Mage, Ingénieur,
  Nécromancien) via le **Maître des Classes** du hub (ou touche **K**). Monte ton **arbre** (3 branches :
  passifs + capacités). **Capacités actives** sur **R / C / V / B** (cooldown + énergie) — boule de feu,
  bouclier, soin, invocation, pièges, ralentissement… **Respec** via l'Entraîneur.
- **Hub du Sanctuaire** : le biome de départ a une **plateforme** avec des PNJ de service — Forgeron,
  Couturière, Mage, Quêtes, Marchand, Alchimiste, Explorateur (+ PNJ avancés/secrets). **Mira** te
  **soigne**, **Brak**/**Gardien Ω** tentent le **craft Ω**. Les PNJ de rang **S/Ω** sont **grisés et
  verrouillés** (« ??? », bulle « … » si tu leur parles) jusqu'à ce que tu atteignes ce rang
  (S = nettoyer un biome S, Ω = obtenir un objet Ω).
  Tant que tu n'as parlé à personne, le lieu reste un mystère sur la carte.
- Tu démarres aux **poings**. Les **disques colorés au sol** (ÉP/DG/HA/MA/AR/BÂ) sont des armes au
  tier du biome : marche dessus pour les ramasser, puis choisis-les dans la barre (1–9 / molette).
- **Mort** : si tes PV tombent à 0, tu **perds 20 % de ton inventaire** (objets au hasard, **jamais les Poings**) et tu **respawn au Sanctuaire**, PV/énergie pleins.
- **Chat & commandes** : **Entrée** ouvre la barre. Tape un message, ou une **commande** commençant par `/` :
  en tapant `/`, des **suggestions** s'affichent au-dessus (filtrées par préfixe, ex. `/god` → `godmode`) ;
  **Tab** complète la 1ʳᵉ suggestion. Commandes : `/godmode` · `/heal` · `/give <arme> [tier]` ·
  `/tier <F-S>` · `/kill` · `/spawn [n]` · `/tp` (au curseur) · `/help`.
- **F1** : panneau de réglage en direct + toggles godmode / hitboxes / vecteur vitesse / FPS.

> Note : la salle d'entraînement de la tranche 0 a été remplacée par le flux carte ↔ biome ;
> `createWorld()` subsiste comme fixture de tests.

## Art

Le jeu tourne avec des placeholders géométriques. Pour brancher ton pixel art :
**dépose tes PNG dans `game/img/`** avec les noms attendus (voir `img/README.md`) — ils remplacent
les placeholders automatiquement, sans toucher au code, et sont **auto-redimensionnés** à la taille de jeu.
Aucun changement de code nécessaire.
```
