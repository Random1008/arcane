# 🎮 PROJECT STRUCTURE – PIXEL GAME (FULL STACK)

---

# 📁 ROOT

pixel-game/
├── client/        # jeu (Phaser)
├── admin/         # dashboard React
├── server/        # backend Node.js
├── shared/        # logique partagée
├── database/      # stockage
├── docs/          # GDD + docs
└── README.md

---

# 🎮 CLIENT (PHASER GAME)

client/
├── index.html
├── main.js
├── config.js

├── assets/
│   ├── sprites/
│   ├── tiles/
│   ├── ui/
│   └── sounds/

├── scenes/
│   ├── MenuScene.js
│   ├── GameScene.js
│   ├── DungeonScene.js
│   ├── GachaScene.js
│   └── UIScene.js

├── entities/
│   ├── Player.js
│   ├── Enemy.js
│   ├── Boss.js
│   └── Companion.js

├── systems/
│   ├── CombatSystem.js
│   ├── MovementSystem.js
│   ├── EventSystem.js
│   ├── CorruptionSystem.js
│   └── GachaSystem.js

├── ui/
│   ├── HUD.js
│   ├── InventoryUI.js
│   ├── GachaUI.js
│   └── AdminMenuUI.js

---

# ⚔️ CORE LOGIC (CLIENT SIDE)

## CombatSystem.js

function calculateDamage(attacker, target) {
    let damage = attacker.attack - target.defense;
    return damage < 1 ? 1 : damage;
}

---

## CorruptionSystem.js

let corruption = 0;

function updateCorruption(time) {
    corruption += time * 0.01;

    if (corruption > 100) triggerChaosMode();
}

function getEnemyMultiplier() {
    return 1 + (corruption / 100);
}

---

## EventSystem.js

function rollEvent() {
    if (Math.random() < getEventChance()) {
        triggerEvent(selectEventTier());
    }
}

---

## GachaSystem.js

function getRarity() {
    let rand = Math.random() * 100;

    if (rand < 60) return "common";
    if (rand < 85) return "rare";
    if (rand < 95) return "epic";
    if (rand < 99) return "legendary";
    if (rand < 99.9) return "mythic";
    return "secret";
}

---

# 👤 PLAYER SYSTEM

Player.js

class Player {
    constructor() {
        this.hp = 100;
        this.attack = 20;
        this.defense = 10;
        this.speed = 5;
        this.companions = [];
    }

    calculateStats() {
        let stats = { ...this };

        this.companions.forEach(c => {
            for (let key in c.bonus) {
                stats[key] += stats[key] * c.bonus[key];
            }
        });

        return stats;
    }
}

---

# 👾 COMPANION SYSTEM

Companion.js

class Companion {
    constructor(data) {
        this.name = data.name;
        this.rarity = data.rarity;
        this.bonus = data.bonus;
    }
}

---

# 🌐 SERVER (NODE.JS)

server/
├── server.js
├── api/
│   ├── admin.js
│   ├── players.js
│   └── gacha.js

├── systems/
│   ├── PlayerSystem.js
│   ├── CombatSystem.js
│   ├── AntiCheat.js
│   ├── EventSystem.js
│   └── DungeonSystem.js

├── sockets/
│   ├── playerSocket.js
│   └── adminSocket.js

---

# 🚀 SERVER CORE

server.js

const express = require("express");
const app = express();

app.post("/kick", (req, res) => {
    // kick logic
});

app.listen(3000);

---

# 🤖 ANTI-CHEAT SYSTEM

AntiCheat.js

function checkPlayer(player) {
    if (player.speed > MAX_SPEED) {
        player.cheatScore += 10;
    }

    if (player.damage > MAX_DAMAGE) {
        player.cheatScore += 15;
    }

    if (player.cheatScore > 50) freezePlayer(player);
    if (player.cheatScore > 100) banPlayer(player);
}

---

# 📜 LOG SYSTEM

Logger.js

function log(type, message) {
    console.log(`[${type}] ${message}`);
}

---

# 🎮 ADMIN COMMAND SYSTEM

CommandHandler.js

function handleCommand(command, args) {
    switch(command) {

        case "kick":
            kickPlayer(args[0]);
            break;

        case "spawn":
            spawnMob(args[0]);
            break;

        case "gacha":
            doGacha(args[0]);
            break;

    }
}

---

# 🌐 ADMIN DASHBOARD (REACT)

admin/
├── App.js
├── components/
│   ├── Sidebar.js
│   ├── PlayerList.js
│   ├── Logs.js
│   ├── GachaPanel.js
│   └── EventPanel.js

---

# 🧠 REACT EXAMPLE

PlayerList.js

export default function PlayerList() {
    return (
        <div>
            <h1>Players</h1>
        </div>
    );
}

---

# 🔗 API CALL EXAMPLE

fetch("/kick", {
    method: "POST",
    body: JSON.stringify({ player: "Player1" })
});

---

# 🗄️ DATABASE STRUCTURE

database/

players:
- id
- name
- stats
- companions
- inventory

---

logs:
- type
- message
- timestamp

---

gacha:
- pulls
- pity
- rewards

---

# 🔧 SHARED (COMMON LOGIC)

shared/
├── constants.js
├── utils.js

---

constants.js

export const MAX_SPEED = 10;
export const MAX_DAMAGE = 999;

---

# 🎯 GAME FLOW

Player join →
Load data →
Spawn →
Combat →
Events →
Gacha →
Dungeon →
Save

---

# ✅ FINAL RESULT

This structure allows:

✅ Full game client (Phaser)
✅ Admin panel (React)
✅ Backend (Node)
✅ Anti-cheat system
✅ Logs & monitoring
✅ Gacha system
✅ Dungeon system

---

# 🚀 READY FOR DEVELOPMENT
