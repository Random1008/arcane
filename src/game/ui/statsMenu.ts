import Phaser from "phaser";
import { Player } from "../../core/world";
import { STAT_KEYS, STAT_LABEL, allocStat, xpForNext } from "../../core/progression";

const W = 420;
const H = 320;

/** Menu de stats (touche P) : niveau, XP, points à répartir, +1 par stat. */
export class StatsMenu {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private open = false;
  private player: Player | null = null;

  constructor(private scene: Phaser.Scene) {
    const onResize = () => {
      if (this.open) this.build();
    };
    scene.scale.on("resize", onResize);
    scene.events.once("shutdown", () => scene.scale.off("resize", onResize));
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(player: Player): void {
    if (this.open) this.close();
    else {
      this.player = player;
      this.open = true;
      this.build();
    }
  }

  close(): void {
    this.open = false;
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }

  private label(x: number, y: number, text: string, color: string, size = 14): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: "monospace", fontSize: `${size}px`, color })
      .setScrollFactor(0)
      .setDepth(61);
    this.objs.push(t);
    return t;
  }

  private build(): void {
    for (const o of this.objs) o.destroy();
    this.objs = [];
    const p = this.player;
    if (!p) return;
    const x0 = this.scene.scale.width / 2 - W / 2;
    const y0 = this.scene.scale.height / 2 - H / 2;

    const bg = this.scene.add.graphics().setScrollFactor(0).setDepth(60);
    bg.fillStyle(0x0d0d18, 0.92).fillRect(x0, y0, W, H);
    bg.lineStyle(2, 0x4a5a8a, 1).strokeRect(x0, y0, W, H);
    this.objs.push(bg);

    this.label(x0 + 16, y0 + 12, "PROGRESSION", "#ffd24a", 18);
    this.label(x0 + 16, y0 + 40, `Niveau ${p.level}   XP ${Math.floor(p.xp)} / ${xpForNext(p.level)}`, "#cfe0ff");
    this.label(x0 + 16, y0 + 62, `Points de stat : ${p.statPoints}   ·   Points de compétence : ${p.skillPoints}`, "#7dffb0");

    let y = y0 + 100;
    for (const key of STAT_KEYS) {
      this.label(x0 + 28, y, `${STAT_LABEL[key].padEnd(22)} ${p.stats[key]}`, "#eef");
      if (p.statPoints > 0) {
        const plus = this.label(x0 + W - 60, y - 2, "[ + ]", "#7dffb0");
        plus.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          allocStat(p, key);
          this.build();
        });
      }
      y += 34;
    }

    this.label(x0 + 16, y0 + H - 26, "[P] ou [Échap] pour fermer   ·   [K] arbre de compétences", "#8890a8", 12);
  }
}
