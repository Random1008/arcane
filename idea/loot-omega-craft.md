💎 LOOT · RARETÉS · Ω · CRAFT

État actuel (`src/core/loot.ts`, `src/core/craft.ts`).

🎲 RARETÉS & DROPS
Les ennemis et boss lâchent des **armes** au sol, de rareté tirée au sort. Poids de base :

| Rareté | F | E | D | C | B | A | S | Ω |
|---|---|---|---|---|---|---|---|---|
| Poids | 40 | 25 | 15 | 10 | 6 | 3 | 1 | 0.3 |

- La distribution **monte avec le rang du biome** (biais) et avec le **pity**.
- **Chance de drop** : ~35% par ennemi tué (hors mannequin et sbires de boss).
- **Boss** : 3 drops garantis de meilleur rang.

🍀 PITY (anti-malchance)
Compteur qui augmente à chaque drop **commun** et se **réinitialise** dès un drop rare (≥ A) :
plus tu enchaînes les communs, plus tes chances de rare montent.

🟣 RARETÉ Ω
- Drop direct très rare (0.3% × biais), ou obtenue par **craft** (transformer une arme S).
- Une arme Ω = grosses stats + transperce (cf. `armes.md`).

🟢 OMGANIUM (matériau) — **ressource Ω très rare**
- Losange vert « ✦ » au sol (auto-ramassé).
- **Impossible à obtenir avant le rang A** : ne tombe que dans les biomes **A** et **S** (et leurs donjons).
- Drop rare et croissant avec la difficulté, à partir du rang A :
  - **Ennemi** : ~1,7% (A) → ~2% (S) — très rare.
  - **Boss** : **20% (A) → 30% (S)**.
  - **Coffre** : **17% (A) → 27% (S)** — gaté sur le rang **réel** du biome (pas le rang gonflé du coffre).
- Principe : ressource d'endgame, biome difficile = ressource plus intéressante.
- Sert à **crafter** des armes Ω (1 par craft → l'Omganium reste précieux).

🔨 CRAFT Ω
Avec une **arme de tier S** en main + **1 Omganium** : commande **`/craft`** (ou parler au Forgeron
Brak / au Gardien de l'Omganium au hub) → l'arme devient **Ω** + un **modificateur aléatoire**
(Féroce / Vif / Colossal / Instable, cf. `armes.md`).

💀 MORT & PERTE
À 0 PV : mort, **perte de 20% de l'inventaire** (objets au sol), puis respawn au Sanctuaire.
*(L'armure « Immortel Absolu Ω » ressuscite automatiquement 1×/combat avant la mort — voir `armures.md`.)*

🌟 OBJETS Ω UNIQUES (ENDGAME)
Au-dessus des armes/armures Ω génériques : des **objets nommés** à effets « cheat mais fun », qui ne
tombent **qu'en endgame** (boss de rang **S** ou **coffre de boss du Nexus**, qui en donne un garanti).
Obtenir n'importe quel objet Ω débloque aussi la **capacité Ω ultime** de ta classe (cf. `class-et-arbre`).

- **5 armes Ω uniques** (`/give <id>` ; toujours Ω) :
  - **Briseur de Réalité** (épée) — onde de choc sur crit, +5% ATK/kill (max 50%), *mais perd 0,5% PV/s en main*.
  - **Paradoxe Temporel** (dague) — crit → stop le temps, combo qui enfle, crit très élevé.
  - **Œil de l'Infini** (arc) — 3 flèches guidées, transperce, tir auto.
  - **Source Primordiale** (bâton) — 2 projectiles, brûlure + poison + ralentissement, régén d'énergie.
  - **Jugement Final** (marteau) — onde de choc géante + étourdit tout ce qui est touché.
- **6 armures Ω uniques** (`/armor omega`) : Immortel Absolu, Voile du Néant, Flash Dimensionnel,
  Fureur Cosmique, Vision Divine, Rempart Infini — détails dans `armures.md`.
- **Drops** : boss S → arme Ω unique 25% · armure Ω unique 20% (en plus du set Ω et de l'unique S).
  Coffre de boss du Nexus (rang 6) → **1 arme + 1 armure Ω uniques garanties**.

💡 IDÉES À VENIR
- Omganium sur les boss Ω à 50% (endgame), recettes de craft avancées (Forgeron interdit)
- Drops d'armures non-Ω au sol (actuellement via boss/boutique)
- Objets consommables (potions de l'Alchimiste)
