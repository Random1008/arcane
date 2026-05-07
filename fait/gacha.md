Tu es un expert en game design et développement de jeux web (JavaScript, Phaser.js, Node.js, Socket.io).

Je veux créer un système COMPLET de GACHA avec COMPAGNONS pour un jeu 2D pixel art.

Le système doit être professionnel, équilibré, scalable et prêt pour un jeu solo + multijoueur.

---

🎮 CONTEXTE :

- Jeu 2D pixel art
- Combat avec stats : attaque, défense, HP, vitesse, critique
- Solo + coop + multijoueur
- Compagnons suivent le joueur et donnent des bonus

---

📊 RARETÉS (ordre obligatoire) :

SECRET > MYTHIQUE > LÉGENDAIRE > ÉPIQUE > RARE > COMMUN

---

🎰 PROBABILITÉS :

- Commun : 60%
- Rare : 25%
- Épique : 10%
- Légendaire : 4%
- Mythique : 0.9%
- Secret : 0.1%

---

⚖️ RÈGLE DE DESIGN TRÈS IMPORTANTE :

Le nombre de compagnons doit respecter :

- Beaucoup de COMMUNS
- Plus de RARES que d'ÉPIQUES
- Plus d'ÉPIQUES que de LÉGENDAIRES
- Très peu de MYTHIQUES
- Très très peu de SECRET

Exemple recommandé :
- 12+ communs
- 8+ rares
- 5+ épiques
- 3–4 légendaires
- 2–3 mythiques
- 1–2 secrets

---

📦 LISTE DES COMPAGNONS :

⚪ COMMUN :
- Souris des ruines → +3% vitesse
- Moineau des plaines → +2% critique
- Tortue poussiéreuse → +5 défense
- Escargot ancien → +5% regen HP

(ajouter d'autres similaires pour atteindre une grande variété)

---

🟢 RARE :
- Loup des ombres → +8% attaque +5% vitesse
- Renard rusé → +10% critique
- Esprit feuille → +10% regen HP
- Scorpion du désert → +6% attaque + poison faible

---

🔵 ÉPIQUE :
- Esprit du feu → +15% attaque + brûlure
- Golem de glace → +20% défense + ralentissement
- Fée électrique → +12% vitesse + chain lightning
- Serpent spectral → +15% critique + bonus critique

---

🟣 LÉGENDAIRE :
- Dragon ancien → +25% attaque + souffle de feu
- Licorne sacrée → +20% regen HP + soin auto
- Spectre du néant → +30% critique + téléportation
- Titan brisé → +35% défense + bouclier automatique

---

🟡 MYTHIQUE :
- Entité cosmique → +40% toutes stats + ralentissement temps
- Oracle éternel → +25% critique + esquive auto
- Seigneur du vide → +50% attaque + vol de vie
- Gardien divin → +30% défense + survie coup fatal

---

🌑 SECRET (ULTRA CHEAT) :

- L’Architecte :
  +100% toutes stats
  double les bonus
  ralentit le temps

- Dévoreur de mondes :
  +200% attaque
  vol de vie massif
  exécution instant

- Seigneur du temps :
  -50% cooldown
  esquive automatique
  annule un coup

- Bug vivant :
  effets aléatoires extrêmes (x5 dégâts possible)

- Entité interdite :
  +50% toutes stats
  applique tous les effets

---

👥 SYSTÈME DE BONUS :

- bonus en %
- cumulables
- recalcul dynamique

Exemple :
+10% +5% = +15%

Créer une fonction pour recalculer les stats joueur.

---

👣 IA COMPAGNONS :

- suit le joueur automatiquement
- mouvement fluide
- peut orbiter autour du joueur
- option attaque auto

---

🎰 SYSTÈME GACHA :

- invocation simple
- invocation x10 (bonus chance)
- tirage basé sur probabilités
- sélection du compagnon depuis la liste

---

🎯 SYSTÈME PITY :

- 50 invocations → épique garanti
- 100 → légendaire garanti
- possibilité d’augmenter chance mythique/secret

---

🧬 SYSTÈME DE FUSION (TRÈS IMPORTANT) :

Créer un système où si un joueur obtient plusieurs fois le même compagnon :

- 3 copies → niveau 2
- 5 copies → niveau 3
- etc.

Chaque niveau augmente :
- bonus (%)
- puissance globale

Exemple :
Niveau 1 → +10% attaque
Niveau 2 → +15%
Niveau 3 → +20%

Option :
- changer l'apparence du compagnon au niveau supérieur
- débloquer un effet bonus

Créer :
- structure de stockage des duplicatas
- système d’évolution automatique ou manuel

---

📦 INVENTAIRE :

- stocker compagnons
- équiper max 3
- afficher niveau fusion

---

🌐 MULTIJOUEUR :

IMPORTANT :
- serveur valide le tirage gacha
- serveur calcule stats
- empêche triche

---

🎨 VISUEL :

- couleurs :
  vert (rare)
  bleu (épique)
  violet (légendaire)
  or (mythique)
  noir/glitch (secret)

- animation d’invocation stylée

---

🚀 OBJECTIF :

Générer :

1. Système gacha complet
2. Fonction probabilités
3. Gestion raretés
4. IA compagnon follow
5. Buff système %
6. Système fusion complet
7. Gestion inventaire
8. Intégration combat
9. Système pity
10. Code modulaire prêt à utiliser

---

IMPORTANT :
- Code JavaScript clair
- Commenté
- Compatible Phaser.js
- Structuré en modules
