import Phaser from "phaser";
import { Hotbar } from "../../core/combat/hotbar";
import { weaponAbbr, weaponColor } from "./weaponVisual";

const SLOT = 44;
const GAP = 6;

export class HotbarBar {
  private boxes: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private nums: Phaser.GameObjects.Text[] = [];

  constructor(private scene: Phaser.Scene, size: number) {
    this.boxes = scene.add.graphics().setScrollFactor(0).setDepth(40);
    for (let i = 0; i < size; i++) {
      this.nums.push(
        scene.add
          .text(0, 0, `${i + 1}`, { fontFamily: "monospace", fontSize: "10px", color: "#8890a8" })
          .setScrollFactor(0)
          .setDepth(42),
      );
      this.labels.push(
        scene.add
          .text(0, 0, "", { fontFamily: "monospace", fontSize: "14px", color: "#ffffff" })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(42),
      );
    }
  }

  update(h: Hotbar): void {
    const n = h.slots.length;
    const totalW = n * SLOT + (n - 1) * GAP;
    const startX = this.scene.scale.width / 2 - totalW / 2;
    const y = this.scene.scale.height - SLOT - 14;
    this.boxes.clear();
    for (let i = 0; i < n; i++) {
      const x = startX + i * (SLOT + GAP);
      const active = i === h.activeIndex;
      this.boxes.fillStyle(0x0d0d18, 0.7).fillRect(x, y, SLOT, SLOT);
      this.boxes.lineStyle(active ? 3 : 1, active ? 0xffd24a : 0x3a3a55, 1).strokeRect(x, y, SLOT, SLOT);
      this.nums[i].setPosition(x + 4, y + 3);
      const inst = h.slots[i];
      const lbl = this.labels[i];
      lbl.setPosition(x + SLOT / 2, y + SLOT / 2 + 2);
      if (inst) {
        lbl.setText(`${weaponAbbr(inst.defId)}${inst.omega ? "Ω" : inst.tier}`);
        lbl.setColor(Phaser.Display.Color.IntegerToColor(inst.omega ? 0xff5ad0 : weaponColor(inst.defId)).rgba);
      } else {
        lbl.setText("");
      }
    }
  }
}
