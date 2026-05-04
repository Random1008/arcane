Tu es un expert en développement de jeux vidéo web (JavaScript, Phaser.js, Node.js, Socket.io).

Je veux créer un jeu web en pixel art avec les caractéristiques suivantes :

🎮 CONCEPT GLOBAL :
- Jeu 2D en pixel art
- Monde composé de plusieurs biomes (forêt, désert, neige, etc.)
- Système de combat avec armes et armures
- Donjons avec ennemis et boss
- Système de quêtes

---

🌍 MODES DE JEU :

Je veux 3 modes différents :

1. MODE SOLO
- Monde local (pas de serveur)
- Sauvegarde du joueur (niveau, inventaire, position)
- Exploration libre
- Quêtes scénarisées

2. MODE COOP PRIVÉ (INVITER DES AMIS)
- Le joueur peut créer une partie privée
- Génération d’un code de salle (ex: ABCD123)
- Les amis peuvent rejoindre avec ce code
- Le créateur de la partie est le "host" (serveur temporaire)
- Maximum 2 à 4 joueurs
- Monde synchronisé (positions, ennemis, loot)

3. MODE MULTIJOUEUR GLOBAL
- Monde en ligne avec plusieurs joueurs
- Serveur Node.js central
- Interaction entre joueurs
- Événements globaux (boss, invasions)

---

🧱 MENU PRINCIPAL :

Créer un menu avec :
- Bouton "Mode Solo"
- Bouton "Inviter des amis"
- Bouton "Multijoueur"

Sous-menus :
- SOLO → bouton "Lancer la partie"
- INVITE → 
    - bouton "Créer une partie"
    - champ pour entrer un code
    - bouton "Rejoindre"
- MULTI → bouton "Entrer dans le monde"

Interface moderne style jeu pixel (animations simples, transitions)

---

⚔️ GAMEPLAY :

- Système de combat (attaque, dégâts, vie)
- Différentes armes et armures
- Effets (poison, feu, gel)
- IA ennemie simple

---

🧙 PROGRESSION :

- Niveaux du joueur
- Amélioration des stats
- Inventaire
- Loot dans les donjons

---

🏰 DONJONS :

- Donjons instanciés ou partagés
- Boss avec plusieurs phases
- Loot rare

---

🔌 MULTIJOUEUR (TRÈS IMPORTANT) :

Utiliser :
- Node.js
- Socket.io

Fonctionnalités :
- Synchronisation des positions des joueurs
- Synchronisation des actions (attaque, déplacement)
- Système de "rooms" pour le coop privé
- Exemple :
    socket.emit("createRoom")
    socket.emit("joinRoom", code)

- Serveur contrôle la logique (anti-triche)

---

📦 STRUCTURE TECHNIQUE :

Frontend :
- HTML / CSS / JavaScript
- Phaser.js recommandé

Backend :
- Node.js + Express
- Socket.io

---

🎨 STYLE :

- Pixel art
- Interface simple et lisible
- Animations fluides
- Effets visuels (particules, coups, dégâts)

---

🚀 OBJECTIF :

Donne-moi :
1. Une architecture complète du projet
2. Le code du menu principal (React ou HTML/JS)
3. Un exemple de serveur Node.js avec Socket.io
4. Un exemple de connexion client → serveur
5. Les bases pour afficher plusieurs joueurs à l’écran
6. Des bonnes pratiques pour éviter la triche
7. Un plan étape par étape pour développer le jeu

---

IMPORTANT :
- Code clair et structuré
- Commentaires dans le code
- Explications simples

🔥 Astuce importante
Tu peux aussi l’améliorer en ajoutant :
👉 “utilise Phaser.js pour la partie jeu”
👉 “simplifie pour débutant”
👉 “fais étape par étape”
