# Spec — Jouabilité & contrôleur (top-down) — Tranche 0

**Date** : 2026-06-08
**Projet** : RPG / Roguelite pixel art (action-RPG top-down)
**Tranche** : Socle de jouabilité — contrôleur du joueur & game-feel
**Statut** : Validé (design approuvé par l'utilisateur)

---

## 1. Contexte & objectif

Le projet global est un action-RPG roguelite multijoueur ambitieux (20 biomes, donjons,
loot/Ω, boss, économie, multijoueur…). Il est découpé en tranches indépendantes, chacune
avec son propre cycle *spec → plan → implémentation*.

Cette première tranche construit **en profondeur le contrôleur du joueur et le game-feel** :
le socle sur lequel tous les autres systèmes viendront se greffer. L'objectif est d'obtenir
un personnage **agréable à manier et testable**, pas encore le système de combat complet.

**Critère de réussite** : on lance `npm run dev`, on contrôle un personnage en vue de dessus
qui se déplace avec une bonne inertie, dash (avec invulnérabilité), blink, frappe au corps-à-corps,
et tire à distance *uniquement* après avoir ramassé une arme à distance — le tout réglable en live
et couvert par des tests sur la logique.

---

## 2. Périmètre

### Inclus
- Déplacement top-down avec inertie (accel / friction / vitesse max).
- Dash directionnel avec fenêtre d'i-frames (invulnérabilité) + cooldown.
- Compétence **Blink / téléportation** (coût énergie, cooldown, bloquée par les murs).
- Attaque **mêlée** (toujours disponible) : hitbox en arc devant la visée.
- Attaque **à distance** (projectile) : **active uniquement si une arme à distance est équipée**.
- Notion minimale d'**arme équipée** + **pickup d'arme à distance** dans la salle de test.
- Modèle d'entité léger : Transform / Health / Hitbox-Hurtbox.
- Ennemi simple **poursuiveur** + **mannequin** statique (affichage des dégâts).
- Caméra qui suit le joueur (deadzone + léger lissage).
- **Mode debug** : réglage live de tous les paramètres + toggles hitbox / vecteur vitesse / godmode / FPS.
- **Pipeline d'assets** configurable (manifeste) avec placeholders géométriques générés tant
  qu'aucun PNG n'est fourni.
- Tests (Vitest) sur toute la logique `core/`.

### Exclus (tranches ultérieures)
Les 6 types d'armes complets et leurs stats, l'XP / niveaux / arbre de compétences, les biomes
et la carte du monde, le système de loot / raretés / Ω / craft, les vrais boss et leur IA avancée,
le multijoueur, l'économie. Tout cela se branchera **sur** ce socle.

---

## 3. Décisions techniques

| Sujet | Choix |
|---|---|
| Moteur | Phaser 3 |
| Langage | TypeScript |
| Build / dev server | Vite |
| Tests | Vitest (logique `core/`, headless) |
| Vue | Top-down, déplacement X/Y, visée souris |
| Physique / collisions | Phaser Arcade Physics (couche `game/` uniquement) |
| Art | Fourni par l'utilisateur ; placeholders géométriques swappables en attendant |
| Architecture | Cœur logique pur (`core/`, sans Phaser) + couche de rendu (`game/`) |
| Simulation | Pas de temps **fixe** (feel indépendant du FPS, tests déterministes) |

---

## 4. Architecture

Deux couches strictement séparées :

- **`core/`** — logique pure TypeScript, **aucun import Phaser**. Mouvement, dash, blink,
  combat, dégâts, IA, machines à états. Entièrement testable en headless. C'est la couche
  pensée pour grandir vers les futurs sous-systèmes.
- **`game/`** — couche Phaser : scènes, sprites, animations, caméra, particules, input
  matériel, panneau debug. Elle *traduit* l'état du `core/` en rendu, et l'input matériel
  en intentions abstraites.

La règle d'or : `core/` ne connaît jamais Phaser. La couche `game/` appelle `core/` à chaque
frame et lit le résultat pour afficher.

### Arborescence cible
```
game/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ vitest.config.ts
├─ src/
│  ├─ main.ts                    # bootstrap Phaser
│  ├─ core/
│  │  ├─ config/tuning.ts        # TOUS les chiffres de feel (source unique)
│  │  ├─ math/vec2.ts            # utilitaires vecteurs
│  │  ├─ time/fixedStep.ts       # accumulateur pas-de-temps fixe
│  │  ├─ entity.ts               # Entity + composants Transform/Health/Hurtbox
│  │  ├─ movement.ts             # inertie : accel/friction/vitesse max
│  │  ├─ abilities/
│  │  │  ├─ ability.ts           # interface commune (cooldown, coût énergie)
│  │  │  ├─ dash.ts              # machine à états + i-frames
│  │  │  └─ blink.ts             # téléport courte portée, bloqué par murs
│  │  ├─ combat/
│  │  │  ├─ melee.ts             # arc de frappe, timing windup/active/recovery
│  │  │  ├─ projectile.ts        # tir à distance (vitesse, durée, dégâts)
│  │  │  ├─ damage.ts            # application dégâts + respect i-frames + knockback
│  │  │  └─ weapon.ts            # arme équipée + gating de l'attaque à distance
│  │  ├─ ai/chaser.ts            # ennemi qui poursuit
│  │  └─ world.ts                # état du monde (entités, résolution par frame)
│  ├─ game/
│  │  ├─ scenes/TrainingScene.ts # salle de test (mannequin, chaser, pickup)
│  │  ├─ input/inputMap.ts       # clavier+souris → InputState (remappable)
│  │  ├─ render/                 # sprites, anims, caméra, dégâts flottants, particules
│  │  └─ debug/debugPanel.ts     # réglage live + toggles
│  └─ assets/
│     ├─ manifest.ts             # nom logique → fichier + format anim
│     ├─ placeholders.ts         # génération de textures géométriques
│     └─ README.md               # format attendu pour les sprites de l'utilisateur
└─ tests/                        # Vitest, miroir de core/
```

---

## 5. Modules détaillés

Chaque module expose une fonction/clas­se au rôle unique, testable isolément.

- **`config/tuning.ts`** — objet typé regroupant **tous** les paramètres de feel (cf. §10).
  Source unique de vérité ; c'est ce que le panneau debug édite.
- **`time/fixedStep.ts`** — accumulateur qui appelle la simulation `core/` à intervalle fixe
  (ex. 1/60 s) quel que soit le FPS de rendu. Garantit un feel constant et des tests déterministes.
- **`entity.ts`** — `Entity` = id + composants : `Transform` (position, vitesse),
  `Health` (PV, timer i-frames), `Hurtbox`/`Hitbox` (formes de collision logiques).
- **`movement.ts`** — `(InputState.moveVector, tuning, dt) → nouvelle vitesse`. Gère
  l'accélération vers la vitesse cible et la friction au relâchement. Fonction pure.
- **`abilities/ability.ts`** — interface commune : `canActivate(energy, now)`, `activate()`,
  état de cooldown, coût en énergie. Dash et Blink l'implémentent ; heal/magie/invis viendront
  s'y conformer plus tard.
- **`abilities/dash.ts`** — machine à états `Ready → Dashing → Cooldown`. Pendant `Dashing` :
  vitesse imposée dans la direction du dash + **i-frames** (invulnérabilité). Cooldown ensuite.
- **`abilities/blink.ts`** — repositionne instantanément le joueur vers le point de visée,
  distance plafonnée ; **arrêté avant un mur** (clamp sur collision). Coût énergie + cooldown.
- **`combat/melee.ts`** — déclenche une hitbox en arc devant la direction de visée, avec
  timing `windup → active → recovery` et une cadence minimale entre coups.
- **`combat/projectile.ts`** — crée un projectile vers la visée (vitesse, durée de vie, dégâts).
- **`combat/weapon.ts`** — état d'équipement minimal. `hasRangedWeapon: boolean` (faux par
  défaut). **L'attaque à distance ne produit rien tant que `hasRangedWeapon` est faux** ;
  ramasser le pickup le passe à vrai. La mêlée est toujours disponible.
- **`combat/damage.ts`** — applique les dégâts à une `Health` **uniquement si la cible n'est
  pas en i-frames**, déclenche un court knockback, retourne l'événement (pour les nombres flottants).
- **`ai/chaser.ts`** — calcule un vecteur de déplacement vers le joueur (poursuite simple).
  Volontairement minimal ; l'IA complète est une tranche ultérieure.
- **`world.ts`** — détient les entités et orchestre l'ordre de résolution par tick
  (mouvement → dash → blink → combat → IA → dégâts/collisions).

---

## 6. Boucle de jeu & data flow

À chaque frame de rendu (Phaser `update(time, delta)`) :

1. **Input** : `inputMap` lit clavier + souris → `InputState` abstrait
   (`moveVector`, `aimPoint`, actions pressées : `melee`, `ranged`, `dash`, `blink`).
2. **Simulation** : l'accumulateur exécute zéro, un ou plusieurs **ticks fixes** de `core/`
   avec `(InputState, world, dtFixe)`. Ordre : mouvement → dash → blink → combat → IA →
   résolution dégâts/collisions.
3. **Rendu** : la couche `game/` lit l'état des entités → positionne/anime les sprites,
   met à jour la caméra, affiche particules et nombres de dégâts.

`core/` étant indépendant de Phaser, on peut le faire tourner en test avec une horloge
simulée et asserter le comportement.

---

## 7. Système d'armes minimal & gating de l'attaque à distance

- Le joueur possède un état d'arme : mêlée intégrée (toujours active) + drapeau
  `hasRangedWeapon` (faux au départ).
- **Clic gauche** → attaque mêlée : toujours active.
- **Clic droit** → attaque à distance :
  - si `hasRangedWeapon === false` → **no-op total** (aucun projectile, aucun cooldown consommé ;
    éventuel indice visuel discret côté UI, sans bloquer).
  - si `hasRangedWeapon === true` → tire un projectile vers la visée (cadence respectée).
- La **salle d'entraînement** place un **pickup d'arme à distance** au sol : marcher dessus
  passe `hasRangedWeapon` à vrai (feedback de ramassage) et active le clic droit.
- Ce mini-système préfigure proprement le futur loot/équipement sans le préempter.

---

## 8. Contrôles (remappables)

| Action | Touche par défaut |
|---|---|
| Se déplacer | ZQSD / WASD / flèches |
| Viser | souris |
| Attaque mêlée | clic gauche |
| Attaque à distance | clic droit (no-op sans arme à distance) |
| Dash | Espace |
| Blink / téléportation | E |

Le mapping vit dans `game/input/inputMap.ts` et est conçu pour être remappé.

---

## 9. Modèle d'entités & ressources

- **Joueur** : `Transform`, `Health` (PV 100), énergie (100, regen 12/s), arme équipée.
- **Mannequin** : `Transform` statique + `Health` ; encaisse les dégâts, affiche les nombres,
  ne riposte pas.
- **Chaser** : `Transform` + `Health` + `ai/chaser` ; se dirige vers le joueur, inflige des
  dégâts au contact (testables contre les i-frames du dash).

Stats limitées à PV et énergie pour cette tranche ; les stats RPG complètes (ATK/DEF/crit…)
arrivent plus tard.

---

## 10. Paramètres de game-feel (valeurs de départ, réglables en live)

| Système | Réglages |
|---|---|
| Déplacement | vitesse max 220, accel 2000, friction 1800 (px, px/s²) |
| Dash | distance 180, durée 0.18 s, **i-frames 0.25 s**, cooldown 0.8 s |
| Blink | portée 220, cooldown 3 s, coût énergie 20, bloqué par murs |
| Attaque mêlée | dégâts 15, portée 60, arc 90°, cadence 0.4 s (windup 0.06 / active 0.08 / recovery 0.12) |
| Attaque à distance | dégâts 8, projectile 480 px/s, durée 1.2 s, cadence 0.25 s |
| Ressources | PV 100, énergie 100, regen énergie 12/s |
| Chaser | vitesse 120, dégâts contact 5, cadence contact 0.6 s |

Toutes ces valeurs sont des points de départ destinés à être ajustés au feeling via le panneau debug.

---

## 11. Pipeline d'assets

- `assets/manifest.ts` : registre typé `nom logique → { fichier, format d'anim }`
  (ex. `player`, `enemy_chaser`, `projectile`, `ranged_pickup`).
- Tant qu'un fichier est absent, `assets/placeholders.ts` **génère une texture géométrique**
  (forme + couleur) via Phaser Graphics → `generateTexture`, et le jeu tourne normalement.
- Quand l'utilisateur dépose un PNG et met à jour le manifeste, la texture réelle remplace
  le placeholder **sans modification du code de jeu**.
- `assets/README.md` documente : taille de sprite attendue, disposition des frames d'animation,
  conventions de nommage.
- Robustesse : un fichier manquant → fallback placeholder + `console.warn`, jamais de crash.

---

## 12. Mode debug

Panneau overlay (déclenché par une touche, ex. F1) permettant de :

- régler **en live** tous les paramètres de §10 ;
- activer/désactiver : **afficher hitbox/hurtbox**, **vecteur de vitesse**, **godmode**,
  compteur **FPS**.

C'est la version « mode dev » du cahier des charges, à l'échelle de cette tranche.

---

## 13. Stratégie de test

Vitest sur `core/` (headless), notamment :

- **Mouvement** : montée en vitesse (accel) puis décélération (friction) conformes.
- **Dash** : transitions d'états ; **i-frames actives pendant le dash** ; cooldown respecté.
- **Blink** : repositionnement plafonné à la portée ; **arrêt avant un mur** ; coût énergie ;
  refus si énergie insuffisante ou en cooldown.
- **Mêlée** : fenêtres windup/active/recovery ; pas de double-coup avant la cadence.
- **Attaque à distance** : **no-op si `hasRangedWeapon` faux** ; tir effectif après ramassage ;
  cadence respectée.
- **Dégâts** : appliqués hors i-frames, **ignorés pendant les i-frames** ; knockback déclenché.

Vérification locale : `npm run build` + `npm test` passent. Le feeling se valide par l'utilisateur
via `npm run dev` dans le navigateur.

---

## 14. Definition of Done

- Le projet `game/` se lance (`npm run dev`) sur une salle d'entraînement jouable.
- Déplacement avec inertie, dash + i-frames, blink bloqué par murs : opérationnels et réglables.
- Mêlée fonctionnelle ; attaque à distance **inerte sans arme**, active après ramassage du pickup.
- Mannequin (dégâts affichés) + chaser (poursuite, dégâts au contact) présents.
- Caméra suit le joueur ; panneau debug fonctionnel (réglages + toggles).
- Placeholders géométriques en place ; pipeline d'assets prêt à recevoir les PNG de l'utilisateur.
- Tests `core/` verts ; `build` OK.

---

## 15. Extensions futures (s'appuieront sur ce socle)

6 armes complètes & stats → stats RPG/XP/compétences → biomes & monde → loot/Ω/craft/sets →
boss & IA avancée → endgame (Nexus Infini) → économie → multijoueur. Chaque élément réutilise
les briques `core/` (entités, abilities, combat, dégâts) définies ici.
