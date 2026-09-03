import Phaser from "phaser";
import { Player } from "../../core/world";
import { getShop } from "../session";
import { buyItem, sellWeapon, sellArmor, sellValueOf, ShopItem } from "../../core/shop";
import { getWeaponDefEx } from "../../core/combat/catalog";
import { ARMOR_SLOT_LABEL, ARMOR_TYPE_LABEL } from "../../core/armor";
import { playSfx } from "../audio/audioEngine";

const W = 840;
const H = 540;
const ROW = 22;

/** Boutique de Tibo : achat (fixe + journalier) et vente. */
export class ShopMenu {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private open = false;
  private player: Player | null = null;
  private sellScroll = 0; // décalage (en lignes) de la liste de vente

  constructor(private scene: Phaser.Scene) {
    const onResize = () => {
      if (this.open) this.build();
    };
    const onWheel = (_p: unknown, _go: unknown, _dx: number, dy: number) => {
      if (!this.open) return;
      this.sellScroll += dy > 0 ? 1 : -1; // molette = défile la colonne de vente
      this.build();
    };
    scene.scale.on("resize", onResize);
    scene.input.on("wheel", onWheel);
    scene.events.once("shutdown", () => {
      scene.scale.off("resize", onResize);
      scene.input.off("wheel", onWheel);
    });
  }

  isOpen(): boolean {
    return this.open;
  }

  openFor(player: Player): void {
    this.player = player;
    this.open = true;
    this.sellScroll = 0;
    this.build();
  }

  close(): void {
    this.open = false;
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }

  private label(x: number, y: number, text: string, color: string, size = 12): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, { fontFamily: "monospace", fontSize: `${size}px`, color }).setScrollFactor(0).setDepth(61);
    this.objs.push(t);
    return t;
  }

  private clickable(x: number, y: number, text: string, color: string, onClick: () => void): void {
    const t = this.label(x, y, text, color);
    t.setInteractive({ useHandCursor: true }).on("pointerdown", onClick);
  }

  private itemLabel(it: ShopItem, suffix = ""): string {
    const name = it.kind === "weapon" ? getWeaponDefEx(it.defId!).name : `${ARMOR_SLOT_LABEL[it.slot!]} ${ARMOR_TYPE_LABEL[it.type!]}`;
    return `${name} [${it.tier}]  ${it.price}o${it.stock > 0 ? "" : " (épuisé)"}${suffix}`;
  }

  private buyColumn(p: Player, x: number, y0: number, title: string, items: ShopItem[]): void {
    this.label(x, y0, title, "#cfe0ff", 13);
    const hasFreeSlot = p.hotbar.slots.some((s) => s === null);
    let y = y0 + ROW;
    for (const it of items) {
      const full = it.kind === "weapon" && !hasFreeSlot; // barre d'inventaire pleine
      const affordable = it.stock > 0 && p.gold >= it.price && !full;
      if (affordable) {
        this.clickable(x, y, this.itemLabel(it), "#7dffb0", () => {
          if (buyItem(p, it)) playSfx("buy");
          this.build();
        });
      } else {
        this.label(x, y, this.itemLabel(it, full ? " (inv. plein)" : ""), "#6a6a7a");
      }
      y += ROW;
    }
  }

  private build(): void {
    for (const o of this.objs) o.destroy();
    this.objs = [];
    const p = this.player;
    if (!p) return;
    const x0 = this.scene.scale.width / 2 - W / 2;
    const y0 = this.scene.scale.height / 2 - H / 2;

    const bg = this.scene.add.graphics().setScrollFactor(0).setDepth(60);
    bg.fillStyle(0x0d0d18, 0.94).fillRect(x0, y0, W, H);
    bg.lineStyle(2, 0x4a5a8a, 1).strokeRect(x0, y0, W, H);
    this.objs.push(bg);

    this.label(x0 + 16, y0 + 12, "BOUTIQUE DE TIBO", "#ffd24a", 18);
    this.label(x0 + W - 160, y0 + 16, `Or : ${p.gold}`, "#ffe066", 14);

    const shop = getShop();
    this.buyColumn(p, x0 + 20, y0 + 48, "Achat — Fixe (réappro/jour)", shop.fixed);
    this.buyColumn(p, x0 + 300, y0 + 48, "Achat — Journalier (reroll/jour)", shop.daily);

    // vente (colonne droite) — liste défilable à la molette pour ne pas déborder du cadre
    const sx = x0 + 580;
    const top = y0 + 70;
    const maxRows = Math.floor((H - 110) / ROW); // lignes visibles
    const entries: { text: string; onClick: () => void }[] = [];
    p.hotbar.slots.forEach((inst, i) => {
      if (!inst || i === 0 || inst.defId === "fists") return;
      const val = sellValueOf(inst.tier, inst.omega);
      entries.push({
        text: `${getWeaponDefEx(inst.defId).name} [${inst.omega ? "Ω" : inst.tier}] → ${val}o`,
        onClick: () => {
          if (sellWeapon(p, i) > 0) playSfx("buy");
          this.build();
        },
      });
    });
    p.armorInv.forEach((a, i) => {
      const val = sellValueOf(a.tier, !!a.set);
      entries.push({
        text: `${ARMOR_SLOT_LABEL[a.slot].slice(0, 4)} ${ARMOR_TYPE_LABEL[a.type].slice(0, 3)} [${a.set ? "Ω" : a.tier}] → ${val}o`,
        onClick: () => {
          if (sellArmor(p, i) > 0) playSfx("buy");
          this.build();
        },
      });
    });

    const maxScroll = Math.max(0, entries.length - maxRows);
    this.sellScroll = Math.min(Math.max(0, this.sellScroll), maxScroll);
    this.label(sx, y0 + 48, `Vendre${entries.length > maxRows ? " (molette ↕)" : ""}`, "#cfe0ff", 13);
    const slice = entries.slice(this.sellScroll, this.sellScroll + maxRows);
    slice.forEach((e, k) => this.clickable(sx, top + k * ROW, e.text, "#ffd0a0", e.onClick));
    if (this.sellScroll + maxRows < entries.length) {
      this.label(sx, top + maxRows * ROW, `▼ +${entries.length - this.sellScroll - maxRows} autres`, "#8890a8");
    }

    this.label(x0 + 16, y0 + H - 24, "[Échap] pour fermer", "#8890a8", 12);
  }
}
