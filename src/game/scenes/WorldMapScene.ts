import Phaser from "phaser";
import { playMusic, playSfx, resumeAudio } from "../audio/audioEngine";
import { buildWorldMap } from "../../core/worldMap";
import { getBiome } from "../../core/biomes";
import { isIdentified, isUnlocked, isRingFinal } from "../session";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;
const CLICK_SLOP = 6; // px de glissé en deçà desquels on considère un clic (et non un pan)

export class WorldMapScene extends Phaser.Scene {
  private dragging = false;
  private dragDist = 0;

  constructor() {
    super("worldmap");
  }

  create() {
    resumeAudio();
    playMusic("worldmap");
    const nodes = buildWorldMap();
    const W = this.scale.width;
    const H = this.scale.height;
    const cam = this.cameras.main;
    cam.setBackgroundColor("#0b0b14");

    // calque carte (zoomable/déplaçable) + UI fixe (titre/aide) sur une 2e caméra
    const layer = this.add.container(0, 0);
    const ui = this.cameras.add(0, 0, W, H);

    const title = this.add
      .text(W / 2, 22, "CARTE DU MONDE — nettoie TOUT un anneau pour ouvrir le suivant", { fontFamily: "monospace", fontSize: "14px", color: "#cfd2e6" })
      .setOrigin(0.5)
      .setDepth(50);
    const tip = this.add.text(W / 2, 44, "", { fontFamily: "monospace", fontSize: "12px", color: "#aab0c8" }).setOrigin(0.5).setDepth(50);
    const help = this.add
      .text(W / 2, H - 14, "Molette = zoom · clic-glissé = déplacer · R = recentrer", { fontFamily: "monospace", fontSize: "11px", color: "#6a7088" })
      .setOrigin(0.5)
      .setDepth(50);

    cam.ignore([title, tip, help]); // la caméra carte n'affiche pas l'UI
    ui.ignore(layer); // la caméra UI n'affiche pas la carte

    // mise à l'échelle pour faire tenir tous les anneaux
    const maxR = Math.max(...nodes.map((n) => n.ringRadius), 1);
    const usable = Math.min(W, H) / 2 - 64;
    const scale = usable / maxR;
    const cx = W / 2;
    const cy = H / 2 + 24;

    const g = this.add.graphics();
    g.lineStyle(1, 0x24243a, 1);
    for (const r of [...new Set(nodes.map((n) => n.ringRadius))]) g.strokeCircle(cx, cy, r * scale);
    layer.add(g);

    for (const n of nodes) {
      const b = getBiome(n.biomeId);
      const x = cx + n.x * scale;
      const y = cy + n.y * scale;
      const isSpawn = n.biomeId === "spawn";
      const identified = isIdentified(n.biomeId);
      const unlocked = isUnlocked(n.biomeId);
      const r = isSpawn ? 9 : 10;

      if (!unlocked) {
        const c = this.add.circle(x, y, r, 0x000000).setStrokeStyle(1.5, 0x33333f, 0.8).setInteractive({ useHandCursor: true });
        const lock = this.add.text(x, y, "🔒", { fontFamily: "monospace", fontSize: "11px", color: "#5a5a6a" }).setOrigin(0.5);
        const lockMsg = b.tier === "F" ? "Verrouillé — visite d'abord le Sanctuaire" : "Verrouillé — nettoie tout l'anneau précédent";
        c.on("pointerover", () => tip.setText(lockMsg));
        c.on("pointerout", () => tip.setText(""));
        layer.add([c, lock]);
        continue;
      }

      const fill = identified ? b.palette.ground : 0x000000;
      const baseStroke = isSpawn ? 0xffd24a : identified ? 0xffffff : 0x555566;
      const node = this.add
        .circle(x, y, r, fill)
        .setStrokeStyle(isSpawn ? 3 : 2, baseStroke, identified || isSpawn ? 0.95 : 0.8)
        .setInteractive({ useHandCursor: true });
      const tierTxt = this.add
        .text(x, y, identified ? (isSpawn ? "★" : b.tier) : "?", { fontFamily: "monospace", fontSize: "11px", color: identified ? "#0d0d18" : "#cfd2e6", fontStyle: "bold" })
        .setOrigin(0.5);
      layer.add([node, tierTxt]);
      if (identified) {
        layer.add(this.add.text(x, y + r + 7, b.name, { fontFamily: "monospace", fontSize: "9px", color: "#aab0c8" }).setOrigin(0.5));
      }
      const finalOfRing = isRingFinal(n.biomeId);
      if (finalOfRing) {
        // dernier biome de l'anneau → le boss du rang y attend
        layer.add(this.add.text(x, y - r - 8, "☠", { fontFamily: "monospace", fontSize: "12px", color: "#ff5d5d" }).setOrigin(0.5));
      }

      const tipText = isSpawn
        ? "Sanctuaire (départ)"
        : finalOfRing
          ? `${identified ? b.name : "Inexploré"} [${b.tier}] — ☠ le boss de l'anneau t'y attend !`
          : identified
            ? `${b.name} [${b.tier}]`
            : "Inexploré — entre pour découvrir";
      node.on("pointerover", () => {
        node.setStrokeStyle(3, 0xffd24a, 1);
        tip.setText(tipText);
      });
      node.on("pointerout", () => {
        node.setStrokeStyle(isSpawn ? 3 : 2, baseStroke, identified || isSpawn ? 0.95 : 0.8);
        tip.setText("");
      });
      // clic = entrer (uniquement si on n'a pas glissé pour déplacer la vue)
      node.on("pointerup", () => {
        if (this.dragDist < CLICK_SLOP) {
          playSfx("uiClick");
          this.scene.start("biome", { biomeId: n.biomeId });
        }
      });
    }

    // — déplacement (clic-glissé) —
    this.input.on("pointerdown", () => {
      this.dragging = true;
      this.dragDist = 0;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      const dx = p.x - p.prevPosition.x;
      const dy = p.y - p.prevPosition.y;
      this.dragDist += Math.hypot(dx, dy);
      cam.scrollX -= dx / cam.zoom;
      cam.scrollY -= dy / cam.zoom;
    });
    this.input.on("pointerup", () => {
      this.dragging = false;
    });

    // — zoom (molette, centré sur le curseur) —
    this.input.on("wheel", (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      const before = cam.getWorldPoint(p.x, p.y);
      cam.zoom = Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.88 : 1.14), MIN_ZOOM, MAX_ZOOM);
      const after = cam.getWorldPoint(p.x, p.y);
      cam.scrollX += before.x - after.x;
      cam.scrollY += before.y - after.y;
    });

    // — recentrer —
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R).on("down", () => {
      cam.zoom = 1;
      cam.centerOn(W / 2, H / 2);
    });
  }
}
