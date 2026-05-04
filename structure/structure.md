🎮 🧱 1. STRUCTURE COMPLÈTE DU PROJET
pixel-game/
│
├── client/                 → Frontend (jeu)
│   ├── index.html
│   ├── main.js
│   ├── game/
│   │   ├── scenes/
│   │   │   ├── MenuScene.js
│   │   │   ├── GameScene.js
│   │   │   └── UIScene.js
│   │   ├── player.js
│   │   ├── enemy.js
│   │   ├── combat.js
│   │   └── config.js
│
├── server/                 → Backend multijoueur
│   ├── server.js
│   └── rooms.js
│
├── package.json
