⚔️ 🛡️ 1. GUERRIER (Tank / mêlée)
🎯 Style :

résistant
combat rapproché
dégâts constants


🌳 Arbre de compétences
🛡️ Défense

+HP max
réduction dégâts
bouclier actif

⚔️ Offense

attaques lourdes
coup de zone
stun ennemi

🔥 Berserk

+ATK quand HP bas
rage (mode boost)
lifesteal


🗡️ 🌀 2. ASSASSIN (critique / mobilité)
🎯 Style :

rapide
fragile
gros dégâts critiques


🌳 Arbre
🗡️ Critique

+chance crit
+dégâts dos
one-shot bonus

👤 Furtivité

invisibilité
dash silencieux
bonus attaque surprise

⚡ Mobilité

dash rapide
double dash
esquive auto


🏹 🎯 3. ARCHER (distance / précision)
🎯 Style :

longue portée
stratégique
kite ennemis


🌳 Arbre
🎯 Précision

+dégâts tête
zoom tir
flèches perçantes

🌪️ Multi-tir

tir x2 / x3
tir en éventail
pluie de flèches

🧊 Élémentaire

flèches feu/glace
ralentissement
explosion


🔮 🔥 4. MAGE (skills / burst)
🎯 Style :

dégâts magiques
fragile
burst puissant


🌳 Arbre
🔥 Destruction

boule de feu
explosion
dégâts zone

⚡ Contrôle

ralentissement
gel
immobilisation

🛡️ Défense magique

bouclier
regen mana
téléportation


🛠️ ⚙️ 5. INGÉNIEUR (tech / stratégie)
🎯 Style :

gadgets
pièges
contrôle terrain


🌳 Arbre
💣 Pièges

mines
pièges ralentissants
explosions

🤖 Robotiques

tourelles
drones
invocations

🔧 Support

heal zone
buff équipe
recharge rapide


🩸 🔥 6. NÉCROMANCIEN (invocation / corruption)
🎯 Style :

invoque des créatures
affaiblit ennemis
gameplay unique


🌳 Arbre
💀 Invocation

zombies
squelettes
boss invoqué

🧪 Malédictions

poison
faiblesse ennemie
DOT (dégâts temps)

🩸 Sacrifice

donner HP → boost
explosion d’invocation
vol de vie


💡 BONUS : ÉVOLUTION Ω DES CLASSES
👉 en endgame chaque classe peut débloquer une forme Ω :

Guerrier → immortel temporaire
Assassin → invisibilité totale
Archer → tir infini
Mage → sorts sans coût
Ingénieur → armée de drones
Nécromancien → armée massive

---

✅ ÉTAT IMPLÉMENTÉ (tranches E2 + extension compétences)
- Les **6 classes** existent (`core/classes.ts`), chacune avec un **arbre à 3 branches** généré
  (`core/skills.ts`, `SKILL_TREES`). On choisit UNE classe via le PNJ **Maître des Classes** au
  Sanctuaire (ou touche **K**) ; **respec** (rendre les points / changer de classe) via l'Entraîneur ou le menu.
- Les nœuds sont des **passifs** (PV, défense, dégâts, crit, vitesse, vol de vie) ou débloquent une
  **capacité active**. Points de compétence gagnés à chaque niveau (cf. `progression.md`).
- **≈6 capacités actives par classe** (au lieu de 3) via des primitives variées : projectile, zone,
  buff, bouclier, soin, dash, invocation, ralentissement, piège, **charge** (bond+stun), **rayon**
  (faisceau), **exécution** (achève les ennemis sous un seuil), **multicoup** (rafale frontale),
  **provocation** (−20% dégâts ennemis), **invisibilité** (perte d'aggro), **téléportation**.
  Exemples : Guerrier → Charge, Provocation, Lame tournoyante ; Assassin → Multicoup, Exécution,
  Téléportation ; Archer → Flèche explosive/feu, Tir perçant ; Mage → Rayon, Nova, Tempête ;
  Ingénieur → Grenade, Drone, Bouclier de zone ; Nécromancien → Armée des morts, Explosion de
  cadavre, Forme d'ombre.
- **Loadout (R / C / V / B)** : comme il y a plus de capacités que de touches, chaque slot a une
  **capacité par défaut** (la 1ʳᵉ débloquée du slot) et le joueur **choisit** laquelle équiper via
  la barre « Capacités équipées » du menu de classe (**K**) — clic = capacité suivante du slot.
- **Évolution Ω des classes (endgame) — IMPLÉMENTÉE** : dès qu'un objet Ω est obtenu
  (`player.omegaUnlocked`), la classe débloque sa **capacité Ω ultime** (slot B, longue recharge) :
  Guerrier → **Mode Juggernaut** (invincible + dégâts ×2, 5 s) · Assassin → **Faille Temporelle**
  (fige tous les ennemis) · Archer → **Tempête Infinie** (volée de flèches guidées) · Mage →
  **Apocalypse** (AoE géante) · Ingénieur → **Overclock Total** (8 invocations) · Nécromancien →
  **Armée Infinie** (10 invocations). Réf. : `OMEGA_ABILITIES` dans `core/skills.ts`.
- **Pas encore** : effets visuels avancés par capacité.