import Phaser from "phaser";

/** Boîte de dialogue simple, fixée à la caméra (nom + ligne courante). */
export class DialogueBox {
  private box: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private lineText: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private visible = false;

  constructor(private scene: Phaser.Scene) {
    this.box = scene.add.graphics().setScrollFactor(0).setDepth(50).setVisible(false);
    this.nameText = scene.add
      .text(0, 0, "", { fontFamily: "monospace", fontSize: "15px", color: "#ffd24a", fontStyle: "bold" })
      .setScrollFactor(0)
      .setDepth(51)
      .setVisible(false);
    this.lineText = scene.add
      .text(0, 0, "", { fontFamily: "monospace", fontSize: "14px", color: "#eef" })
      .setScrollFactor(0)
      .setDepth(51)
      .setVisible(false);
    this.hint = scene.add
      .text(0, 0, "[F] continuer", { fontFamily: "monospace", fontSize: "11px", color: "#8890a8" })
      .setScrollFactor(0)
      .setDepth(51)
      .setVisible(false);
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
    this.hint.setPosition(bx + bw - 96, by + 76).setVisible(true);
    this.visible = true;
  }

  hide(): void {
    this.box.setVisible(false);
    this.nameText.setVisible(false);
    this.lineText.setVisible(false);
    this.hint.setVisible(false);
    this.visible = false;
  }
}
