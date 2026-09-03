⚔️ ARMES

État actuel du jeu (`src/core/combat/weapons.ts`, `catalog.ts`, `effects.ts`).
**105 armes nommées** (15 par tier, F → S) + les 6 armes génériques de la salle de départ + les Poings.

🥊 Poings (départ)
- Arme de base, toujours dans le slot 1, non perdable.
- ATK 5 · vitesse 1.3 · crit 5% · mêlée (portée 40, arc 80°)

🗡️ LES 11 FAMILLES (stats de base)

| Famille | Type | ATK | Vitesse | Crit | Dégâts crit | Portée/Arc | Recul |
|---|---|---|---|---|---|---|---|
| Épée | mêlée | 15 | 1.0 | 10% | ×1.5 | 64 / 100° | 180 |
| Dague | mêlée | 8 | 1.8 | 35% | ×2.0 | 48 / 70° | 90 |
| Hache | mêlée | 22 | 0.8 | 10% | ×1.5 | 70 / 150° | 160 |
| Marteau | mêlée | 32 | 0.55 | 5% | ×1.5 | 64 / 360° | 320 |
| Lance | mêlée | 18 | 0.9 | 10% | ×1.5 | 92 / 40° (poke long) | 150 |
| Masse | mêlée | 20 | 0.75 | 8% | ×1.5 | 56 / 90° | 220 |
| Fléau | mêlée | 16 | 0.85 | 8% | ×1.5 | 58 / 360° | 120 |
| Katana | mêlée | 12 | 1.5 | 25% | ×1.8 | 60 / 80° | 100 |
| Arc | distance | 10 | 1.2 | 20% | ×1.8 | proj. 560 | 60 |
| Arbalète | distance | 24 | 0.55 | 15% | ×1.7 | proj. 640 | 140 |
| Bâton | distance | 18 | 0.7 | 10% | ×1.6 | proj. 320 (gros) | 100 |

- **Mêlée** = coup d'arc (clic gauche maintenu = attaques répétées selon la cadence).
- **Distance** = tir semi-auto (un tir par clic) — sauf armes **tir auto** (maintenir = rafale).

📜 LE CATALOGUE (armes nommées)
Chaque arme nommée = **une famille + des modificateurs de stats + des effets**. 15 par tier :
- ⚪ **F** : Épée rouillée, Dague usée, Arc simple, Bâton cassé, Lance fragile, Hache émoussée, Masse bois, Fronde, Couteau, Bâton simple, Épée courte, Arc court, Marteau simple, Lance bois, Dague fine
- 🟢 **E** : Épée fer, Dague aiguisée, Arc solide, Bâton magique faible, Lance acier, Hache stable, Masse lourde, Arbalète simple, Fléau court, Sabre, Arc renforcé, Marteau guerre, Lance lourde, Dague rapide, Bâton focus
- 🔵 **D** : Épée enchantée I, Dague critique, Arc long, Bâton élémentaire I, Lance renforcée, Hache double, Marteau acier, Arbalète lourde, Fléau épineux, Katana simple, Arc sniper, Lance perçante, Bâton feu, Dague poison, Masse choc
- 🟡 **C** : Épée feu, Dague toxique, Arc glace, Bâton élémentaire II, Lance sacrée, Hache guerre, Marteau volcan, Arbalète magique, Fléau sombre, Katana rapide, Arc multi-tir, Lance foudre, Bâton glace, Dague ombre, Masse explosive
- 🟠 **B** : Épée divine, Dague spectrale, Arc céleste, Bâton suprême, Lance foudroyante, Hache titan, Marteau sacré, Arbalète explosive, Fléau infernal, Katana légendaire I, Arc pluie, Lance céleste, Bâton arcane, Dague critique+, Masse lourde+
- 🔴 **A** : Épée du roi, Dague du néant, Arc des étoiles, Bâton cosmique, Lance antique, Hache ancienne, Marteau des dieux, Arbalète divine, Fléau ultime, Katana mythique, Arc lumière, Lance dimensionnelle, Bâton stellaire, Dague ultime, Masse divine
- ⚫ **S** : Épée du chaos, Dague du temps, Arc éternité, Bâton absolu, Lance dimension, Hache néant, Marteau cosmique, Arbalète infinie, Fléau apocalypse, Katana des dieux, Arc infini, Lance ultime, Bâton universel, Dague parfaite, Masse du chaos

Ids et effets exacts : `src/core/combat/catalog.ts`.

💥 EFFETS D'ARMES (moteur `effects.ts`)
- **Statuts (DoT)** : **brûlure** (rafraîchit), **poison** (stacke ×5), **saignement** — dégâts par paquets de 0,5 s ; tuent et créditent XP/or/loot comme un coup direct. Fonctionnent aussi sur les **boss**.
- **Contrôle** : **ralentit** (slow), **étourdit** (stun, parfois en % de chance) — les boss y **résistent**.
- **À l'impact** : **drain de vie** (% des dégâts), **attaque de dos** (× dégâts si la cible tourne le dos), **anti-boss** (× dégâts vs boss), **onde de choc** (zone autour de la cible, parfois seulement sur crit), **stop temps** (crit → fige TOUS les ennemis).
- **Montée en puissance** : **combo** (+% dégâts par coup enchaîné, fenêtre 2 s), **rage** (chaque kill = +% ATK permanent sur l'instance, plafonné — conservé au jet/ramassage).
- **Tir** : **multi-tir** (éventail), **transperce**, **guidé** (les flèches virent vers la cible), **tir auto**.
- **Passifs en main** : **régénération** (PV/s), **focus d'énergie** (énergie/s), **aura** (+dégâts/+vitesse).
- L'effet de l'arme active est affiché dans le **HUD** à côté de son nom.

🎒 INVENTAIRE / RAMASSAGE
- La **barre rapide (9 slots, slot 1 = Poings)** EST ton inventaire d'armes.
- **Ramassage manuel** : sur une arme au sol, appuie sur **G** (prompt « [G] Ramasser »). Si l'inventaire
  est plein, jette d'abord. (L'**Omganium** reste auto-ramassé.)
- **Jeter** : **X** lâche l'arme active au sol (sauf Poings) ; elle conserve son tier/Ω/modificateur/rage et
  reste re-ramassable.
- Les pickups affichent l'**abréviation de la famille** (ÉP, DG, HA, MA, LA, MS, FL, KA, AR, AB, BÂ) + tier.

📦 OÙ LES OBTENIR
- **Drops d'ennemis/boss/coffres** : la rareté tirée (pity inclus) donne le **tier**, puis une arme
  nommée de ce tier est tirée au hasard.
- **Biomes** : 2-3 armes nommées du tier du biome posées au sol.
- **Boutique de Tibo** : rayon fixe = 6 armes nommées du tier joueur (sélection stable sur la journée),
  rayon journalier = armes nommées aléatoires (20% au tier joueur+2).
- **Commande** : `/give <id> [tier]` (tier par défaut = tier intrinsèque de l'arme nommée).

📈 TIERS (rareté F → S)
Touche **T** pour cycler le tier de l'arme active (cheat/debug). Le tier multiplie l'**ATK** :
- F ×1.0 · E ×1.3 · D ×1.7 · C ×2.2 · B ×3.0 · A ×4.0 · S ×5.5
- Une arme nommée droppe à son **tier intrinsèque** (une Épée du chaos est S).

🟣 ARMES Ω (au-dessus de S)
Une arme **Ω** = une arme S transformée (drop direct rare ou craft, cf. `loot-omega-craft.md`).
- **ATK ×1.8** en plus du tier, **+20% crit**, **+0.5 dégâts crit**, **transperce**.
- Reforger le tier (T) retire l'état Ω (redevient une arme normale).

🎲 MODIFICATEURS Ω (donnés au craft, aléatoires)
- **Féroce** : +25% ATK
- **Vif** : +30% vitesse d'attaque
- **Colossal** : +10% ATK, +60% recul, −15% vitesse
- **Instable** : +25% crit, −10% ATK

💡 IDÉES À VENIR
- **Armes Ω uniques** (endgame) : Briseur de Réalité, Paradoxe Temporel, Œil de l'Infini, Source
  Primordiale, Jugement Final — effets uniques + limites (cf. `a-implementer/arme-armure-competence.md`)
- Munitions / charges spéciales pour les armes à distance
- Effets visuels dédiés par statut (flammes, gouttes de poison, éclats de gel)
