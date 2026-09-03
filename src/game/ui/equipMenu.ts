import Phaser from "phaser";
import { Player } from "../../core/world";
import { ARMOR_SLOTS, ARMOR_SLOT_LABEL, ARMOR_TYPE_LABEL, SET_LABEL, ArmorInstance, armorEffectDesc } from "../../core/armor";
import { activeSetDescriptions } from "../../core/sets";
import { equipArmor, unequipArmor } from "../../core/equip";

const W = 560;
const H = 460;

/** Menu d'équipement (touche I) : slots équipés + inventaire + bonus de set. */
export class EquipMenu {
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
    else this.openFor(player);
  }

  openFor(player: Player): void {
    this.player = player;
    this.open = true;
    this.build();
  }

  close(): void {
    this.open = false;
    this.clear();
  }

  private clear(): void {
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

  private clickable(x: number, y: number, text: string, color: string, onClick: () => void): void {
    const t = this.label(x, y, text, color);
    t.setInteractive({ useHandCursor: true }).on("pointerdown", onClick);
  }

  private desc(a: ArmorInstance): string {
    const base = a.name ?? `${a.set ? SET_LABEL[a.set] + " " : ""}${ARMOR_TYPE_LABEL[a.type]} [${a.tier}]`;
    const fx = (a.effects ?? []).map(armorEffectDesc).join(" · ");
    return `${base} déf ${a.defense}${fx ? ` · ${fx}` : ""}`;
  }

  private build(): void {
    this.clear();
    const p = this.player;
    if (!p) return;
    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;
    const x0 = sw / 2 - W / 2;
    const y0 = sh / 2 - H / 2;

    const bg = this.scene.add.graphics().setScrollFactor(0).setDepth(60);
    bg.fillStyle(0x0d0d18, 0.92).fillRect(x0, y0, W, H);
    bg.lineStyle(2, 0x4a5a8a, 1).strokeRect(x0, y0, W, H);
    this.objs.push(bg);

    this.label(x0 + 16, y0 + 12, "ÉQUIPEMENT", "#ffd24a", 18);
    this.label(x0 + 16, y0 + 38, "Clique une pièce équipée pour la retirer, une de l'inventaire pour l'équiper.", "#9aa0b5", 11);

    // slots équipés
    let y = y0 + 64;
    this.label(x0 + 16, y, "Équipé :", "#cfe0ff");
    y += 24;
    for (const slot of ARMOR_SLOTS) {
      const a = p.armor[slot];
      const txt = `${ARMOR_SLOT_LABEL[slot].padEnd(10)} ${a ? this.desc(a) : "—"}`;
      if (a) {
        this.clickable(x0 + 28, y, txt, "#ff9d9d", () => {
          unequipArmor(p, slot);
          this.build();
        });
      } else {
        this.label(x0 + 28, y, txt, "#6a6a7a");
      }
      y += 22;
    }

    // bonus de set actifs
    y += 6;
    const bonuses = activeSetDescriptions(p.armor);
    this.label(x0 + 16, y, "Bonus de set :", "#cfe0ff");
    y += 22;
    if (bonuses.length === 0) this.label(x0 + 28, y, "aucun", "#6a6a7a");
    else for (const b of bonuses) { this.label(x0 + 28, y, b, "#7dffb0"); y += 20; }

    // inventaire (colonne droite)
    const ix = x0 + W / 2 + 8;
    let iy = y0 + 64;
    this.label(ix, iy, `Inventaire (${p.armorInv.length}) :`, "#cfe0ff");
    iy += 24;
    if (p.armorInv.length === 0) this.label(ix, iy, "vide — bats des boss !", "#6a6a7a");
    p.armorInv.slice(0, 14).forEach((a, i) => {
      this.clickable(ix, iy, `${ARMOR_SLOT_LABEL[a.slot].slice(0, 4)} · ${this.desc(a)}`, "#bfe9ff", () => {
        equipArmor(p, i);
        this.build();
      });
      iy += 22;
    });

    this.label(x0 + 16, y0 + H - 26, "[I] ou [Échap] pour fermer", "#8890a8", 12);
  }
}
