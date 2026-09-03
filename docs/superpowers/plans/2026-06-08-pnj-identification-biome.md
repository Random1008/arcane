# PNJ & identification de biome — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** PNJ non-hostiles par biome ; parler à un PNJ (F) révèle son nom + identifie le biome sur la carte ; un biome non identifié reste « ? » (on devine d'après le visuel).

**Architecture:** `core/npcs.ts` (données générées) + `World.npcs` peuplé par `generate.ts` ; `session.identified` remplace `explored` ; `BiomeScene` gère rendu PNJ + dialogue (F, sim en pause) ; `WorldMapScene` révèle selon `isIdentified`.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest.

> Réf. spec `docs/superpowers/specs/2026-06-08-pnj-identification-biome-design.md`. Le contenu (noms + dialogues) est généré par workflow puis figé dans `core/npcs.ts`.

---

## Task 1: core/npcs.ts (données + contrat)

**Files:** Create `game/src/core/npcs.ts` (données générées par workflow) — Test `game/tests/npcs.test.ts`

- [ ] **Step 1: Test (contrat de contenu)** `game/tests/npcs.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { BIOME_NPCS, npcsForBiome } from "../src/core/npcs";
import { BIOMES, getBiome } from "../src/core/biomes";

describe("npcs", () => {
  it("un set de PNJ pour chacun des 20 biomes, aucun pour le sanctuaire", () => {
    for (const b of BIOMES) {
      const npcs = npcsForBiome(b.id);
      expect(npcs.length).toBeGreaterThanOrEqual(1);
      for (const n of npcs) {
        expect(n.name.length).toBeGreaterThan(0);
        expect(n.lines.length).toBeGreaterThanOrEqual(1);
      }
    }
    expect(npcsForBiome("spawn")).toEqual([]);
  });
  it("la 1re réplique de chaque biome nomme le biome", () => {
    for (const b of BIOMES) {
      const first = npcsForBiome(b.id)[0];
      expect(first.lines.join(" ").toLowerCase()).toContain(getBiome(b.id).name.toLowerCase());
    }
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter `core/npcs.ts`** — structure + données générées (cf. workflow). Forme :

```ts
export interface NpcDef {
  name: string;
  lines: string[];
}

// Données générées (1-2 PNJ par biome ; 1re ligne = nom du PNJ + nom du biome).
export const BIOME_NPCS: Record<string, NpcDef[]> = {
  /* plains: [{ name: "...", lines: ["...Plaines..."] }], ... les 20 biomes ... */
};

export function npcsForBiome(id: string): NpcDef[] {
  return BIOME_NPCS[id] ?? [];
}
```

> Le contenu réel des 20 entrées est produit par le workflow `gen-npcs` puis collé ici.

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git add game/src/core/npcs.ts game/tests/npcs.test.ts && git commit -m "feat(core): biome NPC data"`

---

## Task 2: world.ts — type Npc + World.npcs

**Files:** Modify `game/src/core/world.ts`

- [ ] **Step 1:** Ajouter le type `Npc` près de `WeaponPickup` :

```ts
export interface Npc {
  id: number;
  pos: Vec2;
  radius: number;
  name: string;
  lines: string[];
  talked: boolean;
}
```

- [ ] **Step 2:** Ajouter `npcs: Npc[]` à l'interface `World` (après `dungeonEntrances`).

- [ ] **Step 3:** Dans `createWorld`, ajouter `npcs: []` à l'objet retourné.

- [ ] **Step 4:** Compile — `cd game && npx tsc --noEmit`.
- [ ] **Step 5:** Commit — `git add game/src/core/world.ts && git commit -m "feat(core): Npc type + World.npcs"`

---

## Task 3: generate.ts — instancier les PNJ

**Files:** Modify `game/src/core/generate.ts` ; Test `game/tests/generate.test.ts`

- [ ] **Step 1: Test (ajouts)** dans `generate.test.ts` :

```ts
import { npcsForBiome } from "../src/core/npcs";
// ...
it("instancie les PNJ du biome (0 pour le sanctuaire)", () => {
  const w = generateBiomeWorld(createPlayer(), getBiome("forest"), lcg(2));
  expect(w.npcs.length).toBe(npcsForBiome("forest").length);
  expect(w.npcs.every((n) => n.talked === false)).toBe(true);
  const spawn = generateBiomeWorld(createPlayer(), getBiome("spawn"), lcg(2));
  expect(spawn.npcs.length).toBe(0);
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implémenter** — importer `npcsForBiome` et `Npc`, instancier après les pickups :

```ts
// en tête
import { npcsForBiome } from "./npcs";
import { Player, World, Enemy, Exit, DungeonEntrance, WeaponPickup, Npc } from "./world";
```
```ts
// après la création des pickups, avant `const exits`
const npcs: Npc[] = npcsForBiome(biome.id).map((def, i) => ({
  id: 600 + i,
  pos: freeSpawn(rng, level, entry, 90, 16),
  radius: 16,
  name: def.name,
  lines: def.lines,
  talked: false,
}));
```
```ts
// dans le return, ajouter `npcs,`
return { player, enemies, projectiles: [], pickups, npcs, exits, dungeonEntrances, level, biome, events: [], nextId: id + 1000, godMode: false, rng, exitReached: false };
```

- [ ] **Step 4: Run → PASS.** (`cd game && npm test`)
- [ ] **Step 5: Commit** — `git add game/src/core/generate.ts game/tests/generate.test.ts && git commit -m "feat(core): spawn NPCs in generated biomes"`

---

## Task 4: session.ts — identified remplace explored

**Files:** Modify `game/src/game/session.ts`

- [ ] **Step 1: Remplacer** `explored`/`isExplored`/`markExplored` par `identified` :

```ts
let identified = new Set<string>(["spawn"]); // le sanctuaire est identifié d'office

export function isIdentified(id: string): boolean {
  return identified.has(id);
}
export function markIdentified(id: string): void {
  identified.add(id);
}
```
et dans `resetSession`, remplacer la ligne `explored = ...` par `identified = new Set<string>(["spawn"]);`.

- [ ] **Step 2: Compile** — sera en erreur tant que BiomeScene/WorldMapScene référencent `markExplored`/`isExplored` ; corrigé aux tâches 6-7.
- [ ] **Step 3:** (commit groupé avec tâches 6-7)

---

## Task 5: dialogueBox.ts

**Files:** Create `game/src/game/render/dialogueBox.ts`

- [ ] **Step 1: Implémenter** — petite boîte de dialogue fixée caméra :

```ts
import Phaser from "phaser";

export class DialogueBox {
  private box: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private lineText: Phaser.GameObjects.Text;
  private visible = false;

  constructor(private scene: Phaser.Scene) {
    this.box = scene.add.graphics().setScrollFactor(0).setDepth(50).setVisible(false);
    this.nameText = scene.add.text(0, 0, "", { fontFamily: "monospace", fontSize: "15px", color: "#ffd24a", fontStyle: "bold" }).setScrollFactor(0).setDepth(51).setVisible(false);
    this.lineText = scene.add.text(0, 0, "", { fontFamily: "monospace", fontSize: "14px", color: "#eef", wordWrap: { width: 0 } }).setScrollFactor(0).setDepth(51).setVisible(false);
  }

  isOpen(): boolean {
    return this.visible;
  }

  show(name: string, line: string): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const bw = Math.min(720, w - 40);
    const bx = (w - bw) / 2;
    const by = h - 130;
    this.box.clear();
    this.box.fillStyle(0x0d0d18, 0.92).fillRect(bx, by, bw, 96);
    this.box.lineStyle(2, 0x3a3a55, 1).strokeRect(bx, by, bw, 96);
    this.box.setVisible(true);
    this.nameText.setText(name).setPosition(bx + 14, by + 10).setVisible(true);
    this.lineText.setStyle({ fontFamily: "monospace", fontSize: "14px", color: "#eef", wordWrap: { width: bw - 28 } });
    this.lineText.setText(line).setPosition(bx + 14, by + 36).setVisible(true);
    this.visible = true;
  }

  hide(): void {
    this.box.setVisible(false);
    this.nameText.setVisible(false);
    this.lineText.setVisible(false);
    this.visible = false;
  }
}
```

- [ ] **Step 2: Compile** — `cd game && npx tsc --noEmit`.
- [ ] **Step 3:** (commit groupé avec tâche 6)

---

## Task 6: BiomeScene — rendu PNJ + dialogue (F)

**Files:** Modify `game/src/game/scenes/BiomeScene.ts`

- [ ] **Step 1: Imports & session** — remplacer `markExplored` par `markIdentified`, importer la boîte :

```ts
import { DialogueBox } from "../render/dialogueBox";
import { getPlayer, getFlags, markCleared, markIdentified } from "../session";
```
Retirer l'appel `markExplored(this.biomeId);` dans `create()`.

- [ ] **Step 2: Champs** :

```ts
  private dialogue!: DialogueBox;
  private npcGfx!: Phaser.GameObjects.Graphics;
  private npcLabels: Phaser.GameObjects.Text[] = [];
  private dialogueNpc: import("../../core/world").Npc | null = null;
  private dialogueLine = 0;
```

- [ ] **Step 3: create()** — après la barre d'inventaire, créer la boîte + le calque PNJ + le handler F :

```ts
    this.dialogue = new DialogueBox(this);
    this.npcGfx = this.add.graphics().setDepth(5);
    for (const npc of this.world.npcs) {
      this.npcLabels.push(
        this.add.text(npc.pos.x, npc.pos.y - 26, "?", { fontFamily: "monospace", fontSize: "12px", color: "#ffe9a8", fontStyle: "bold" }).setOrigin(0.5).setDepth(7),
      );
    }
    this.input.keyboard!.on("keydown-F", () => this.onInteract());
```

- [ ] **Step 4: onInteract()** (nouvelle méthode) :

```ts
  private onInteract() {
    if (this.dialogue.isOpen()) {
      this.dialogueLine++;
      const npc = this.dialogueNpc!;
      if (this.dialogueLine >= npc.lines.length) {
        npc.talked = true;
        markIdentified(this.biomeId);
        this.dialogue.hide();
        this.dialogueNpc = null;
      } else {
        this.dialogue.show(npc.talked ? npc.name : "???", npc.lines[this.dialogueLine]);
      }
      return;
    }
    // ouvrir : PNJ le plus proche à portée
    const p = this.world.player;
    let best: import("../../core/world").Npc | null = null;
    let bestD = Infinity;
    for (const npc of this.world.npcs) {
      const d = Math.hypot(npc.pos.x - p.transform.pos.x, npc.pos.y - p.transform.pos.y);
      if (d <= p.radius + npc.radius + 24 && d < bestD) {
        best = npc;
        bestD = d;
      }
    }
    if (best) {
      this.dialogueNpc = best;
      this.dialogueLine = 0;
      this.dialogue.show("???", best.lines[0]);
    }
  }
```

- [ ] **Step 5: update()** — geler la sim pendant le dialogue, et rendre les PNJ. Tout en haut de `update`, après calcul de `dt` et `input`, court-circuiter si dialogue ouvert :

```ts
    if (this.dialogue.isOpen()) {
      return; // sim en pause pendant le dialogue
    }
```
Puis, juste avant `this.sprites.sync(this.world);`, dessiner les PNJ :

```ts
    // PNJ (marqueur + nom/“?” + indice [F] à portée)
    this.npcGfx.clear();
    const pp = this.world.player.transform.pos;
    this.world.npcs.forEach((npc, i) => {
      this.npcGfx.fillStyle(0xffe9a8, 0.95).fillCircle(npc.pos.x, npc.pos.y, npc.radius);
      this.npcGfx.lineStyle(2, 0x6a5a2a, 1).strokeCircle(npc.pos.x, npc.pos.y, npc.radius);
      const near = Math.hypot(npc.pos.x - pp.x, npc.pos.y - pp.y) <= this.world.player.radius + npc.radius + 24;
      const lbl = this.npcLabels[i];
      lbl.setText(npc.talked ? npc.name + (near ? "  [F]" : "") : near ? "?  [F]" : "?");
      lbl.setPosition(npc.pos.x, npc.pos.y - npc.radius - 12);
    });
```

- [ ] **Step 6: Build** — `cd game && npm run build`.
- [ ] **Step 7:** (commit groupé avec tâche 7)

---

## Task 7: WorldMapScene — révélation = identifié

**Files:** Modify `game/src/game/scenes/WorldMapScene.ts`

- [ ] **Step 1:** Remplacer l'import et l'usage `isExplored` par `isIdentified` :

```ts
import { isUnlocked, isIdentified } from "../session";
```
et dans la boucle des nœuds : `const explored = isIdentified(n.biomeId);` (le reste du rendu inchangé : `explored ? palette+nom : noir+"?"`).

- [ ] **Step 2: Build** — `cd game && npm run build` → OK.
- [ ] **Step 3: Dev** — `cd game && npm run dev` ; vérifier : carte avec ★ + « ? » ; entrer un biome F → PNJ jaunes (« ? »), s'approcher → « ? [F] » ; F → dialogue (le PNJ se présente + nomme le biome), F avance, fin → nom du PNJ connu + biome identifié sur la carte ; sim figée pendant le dialogue.
- [ ] **Step 4: Commit** — `git add game/src/game game/src/core/world.ts && git commit -m "feat(game): NPCs + dialogue (F) + map reveal on identification"`

---

## Task 8: Vérification finale

- [ ] **Step 1:** `cd game && npm test` → tout vert (npcs + generate + existants).
- [ ] **Step 2:** `cd game && npm run build` → OK.
- [ ] **Step 3: README** — section Monde : préciser que les biomes se révèlent en **parlant à un PNJ** (F), pas en entrant.
- [ ] **Step 4: Commit** — `git add game/README.md && git commit -m "docs(game): README PNJ & identification"`

---

## Auto-revue (couverture spec)

- §2 PNJ data + instanciation → Tasks 1,2,3 ✔
- §3 interaction/dialogue (F, pause, fin → identifie) → Tasks 5,6 ✔
- §4 identified remplace explored sur la carte → Tasks 4,7 ✔
- §5 contenu (workflow → npcs.ts, 1re ligne nomme le biome) → Task 1 + workflow ✔
- §6 archi → toutes ✔
- §7 tests (npcs contrat, generate npcs/spawn 0) → Tasks 1,3 ✔
- §8 DoD → Task 8 ✔

Types : `NpcDef`, `Npc`, `World.npcs`, `identified/isIdentified/markIdentified`, `DialogueBox`,
`npcsForBiome` — cohérents entre tâches.
