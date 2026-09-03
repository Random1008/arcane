👑 BOSS

État actuel (`src/core/bosses.ts`, `src/core/boss.ts`). 1 boss par rang, dans le **dernier biome de l'anneau**.

🏟️ LE BOSS GARDE LA FIN DE L'ANNEAU (placement dynamique)
Le boss du rang apparaît dans le **dernier biome non nettoyé de son anneau** — quel que soit l'ordre de
visite, **chaque anneau se termine par un combat de boss**. Ce biome est marqué **☠ sur la carte**.
Dedans : pas d'ennemis normaux, le boss au centre. **Le vaincre nettoie le biome** (et complète l'anneau →
anneau suivant débloqué). La **sortie est scellée** tant que le boss vit.
Conséquence : le **Nexus** se débloque quand l'anneau S est entièrement nettoyé (= boss S vaincu).

| Rang | Boss | Réplique d'intro |
|---|---|---|
| F | **Gloutombre, le Ver des Cavernes** | « La pierre se souvient de chaque os qu'elle a broyé… » |
| E | **Croc-Sylve, l'Alpha aux Cent Yeux** | « La meute a faim… » |
| D | **Pestileck, la Reine des Vapeurs Acides** | « Respire profondément, petit être… » |
| C | **Khaost-Râ, le Gardien Brisé des Ruines** | « Mille ans de garde, et nul n'a franchi mon seuil… » |
| B | **Pyrokhar, l'Incendie Vivant** | « La lave fut mon berceau… » |
| A | **Nyxgouffre, le Dévoreur des Ténèbres** | « Plonge dans le noir… » |
| S | **Aïon-Thanos, le Dieu Endormi qui s'Éveille** | « J'ai rêvé la création… » |

⚙️ FRAMEWORK
- **Multi-phases** (2-3) : le boss change de phase quand ses PV chutent (patterns plus durs).
- **Barre de vie** en haut + **écran d'intro** (nom + réplique).
- **PV** : base 400 × le multiplicateur du rang (F 400 → S 2400).

🎯 PATTERNS (télégraphiés)
- **volley** : éventail de 5 projectiles vers le joueur
- **ring** : anneau de 12 projectiles à 360°
- **charge** : ruée télégraphiée (le boss devient **vulnérable** après → ×1.5 dégâts subis)
- **summon** : invoque des sbires (plafonnés à 6, disparaissent à la mort du boss)
- **aoe** : zone d'impact télégraphiée au sol (esquivable en sortant du cercle)

🪟 FENÊTRE DE FAIBLESSE
Après chaque attaque, courte fenêtre où le boss subit **+50% de dégâts** (frappe fort à ce moment).
Anti-répétition : deux patterns consécutifs diffèrent.

🎁 RÉCOMPENSES
3 drops d'armes garantis (meilleur rang) + 50% d'Omganium + 1 pièce d'armure Ω.

💡 IDÉES À VENIR
- 5 boss Ω nommés (Architecte, Chronos, Néant, Dragon, Entité) avec arènes spéciales + musique
- Mécaniques d'arène (piliers, zones de sécurité), enrage timer
