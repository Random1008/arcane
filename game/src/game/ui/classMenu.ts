import Phaser from "phaser";
import { Player } from "../../core/world";
import { CLASS_DEFS, CLASS_IDS, CLASS_UNLOCK_LEVEL, canChooseClass } from "../../core/classes";
import { SKILL_TREES, ABILITIES, ABILITY_KEYS, canUnlock, unlockNode, respec, setClass, rankOf, SkillNode, abilityForSlot, cycleLoadout, unlockedAbilitiesForSlot } from "../../core/skills";

const W = 760;
const H = 480;

/** Menu de classe + arbre de compétences (touche K / PNJ Maître des Classes). */
export class ClassMenu {
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

  /** Ouvre directement (depuis un PNJ). */
  openFor(player: Player): void {
    this.player = player;
    this.open = true;
    this.build();
  }

  close(): void {
    this.open = false;
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }

  private box(): { x0: number; y0: number } {
    const x0 = this.scene.scale.width / 2 - W / 2;
    const y0 = this.scene.scale.height / 2 - H / 2;
    const bg = this.scene.add.graphics().setScrollFactor(0).setDepth(60);
    bg.fillStyle(0x0d0d18, 0.94).fillRect(x0, y0, W, H);
    bg.lineStyle(2, 0x4a5a8a, 1).strokeRect(x0, y0, W, H);
    this.objs.push(bg);
    return { x0, y0 };
  }

  private label(x: number, y: number, text: string, color: string, size = 13): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, { fontFamily: "monospace", fontSize: `${size}px`, color }).setScrollFactor(0).setDepth(61);
    this.objs.push(t);
    return t;
  }

  private clickable(x: number, y: number, text: string, color: string, onClick: () => void, wrap = 0): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: "monospace", fontSize: "13px", color };
    if (wrap) style.wordWrap = { width: wrap };
    const t = this.scene.add.text(x, y, text, style).setScrollFactor(0).setDepth(61);
    t.setInteractive({ useHandCursor: true }).on("pointerdown", onClick);
    this.objs.push(t);
  }

  private build(): void {
    for (const o of this.objs) o.destroy();
    this.objs = [];
    const p = this.player;
    if (!p) return;
    if (!canChooseClass(p.level)) this.buildLocked(p);
    else if (!p.class) this.buildSelect(p);
    else this.buildTree(p);
  }

  private buildLocked(p: Player): void {
    const { x0, y0 } = this.box();
    this.label(x0 + 16, y0 + 12, "CLASSES VERROUILLÉES", "#ffd24a", 18);
    this.label(x0 + 24, y0 + 64, `Atteins le niveau ${CLASS_UNLOCK_LEVEL} pour choisir ta classe`, "#cfe0ff", 14);
    this.label(x0 + 24, y0 + 92, `et débloquer ton arbre de compétences.`, "#cfe0ff", 14);
    this.label(x0 + 24, y0 + 128, `Tu es niveau ${p.level} — gagne de l'XP en combattant.`, "#9aa0b5", 12);
    this.label(x0 + 16, y0 + H - 24, "[K] ou [Échap] pour fermer", "#8890a8", 12);
  }

  private buildSelect(p: Player): void {
    const { x0, y0 } = this.box();
    this.label(x0 + 16, y0 + 12, "CHOISIS TA CLASSE", "#ffd24a", 18);
    let y = y0 + 52;
    for (const cid of CLASS_IDS) {
      const d = CLASS_DEFS[cid];
      this.clickable(x0 + 24, y, `▶ ${d.name}`, "#7dffb0", () => {
        setClass(p, cid);
        this.build();
      });
      this.label(x0 + 220, y + 1, d.desc, "#9aa0b5", 12);
      this.label(x0 + 220, y + 17, `Branches : ${d.branches.join(" · ")}`, "#6a7088", 11);
      y += 64;
    }
    this.label(x0 + 16, y0 + H - 24, "[K] ou [Échap] pour fermer", "#8890a8", 12);
  }

  private nodeColor(p: Player, n: SkillNode): string {
    if (rankOf(p, n.id) >= n.maxRank) return "#ffd24a"; // max
    if (rankOf(p, n.id) > 0) return "#bfe9ff"; // possédé
    return canUnlock(p, n.id).ok ? "#7dffb0" : "#5a6072"; // dispo / verrouillé
  }

  private nodeText(n: SkillNode, rank: number): string {
    const tag = n.effect.kind === "ability" ? ` [${ABILITY_KEYS[ABILITIES[n.effect.abilityId].slot]}]` : "";
    return `${n.name}${tag}  ${rank}/${n.maxRank} (${n.cost})`;
  }

  private buildTree(p: Player): void {
    const { x0, y0 } = this.box();
    const d = CLASS_DEFS[p.class!];
    this.label(x0 + 16, y0 + 12, `${d.name.toUpperCase()}`, "#ffd24a", 18);
    this.label(x0 + 16, y0 + 36, `Points de compétence : ${p.skillPoints}`, "#7dffb0");

    const tree = SKILL_TREES[p.class!];
    const colW = (W - 40) / 3;
    d.branches.forEach((branch, bi) => {
      const cx = x0 + 20 + bi * colW;
      this.label(cx, y0 + 64, branch, "#cfe0ff", 14);
      let y = y0 + 90;
      for (const n of tree.filter((x) => x.branch === branch)) {
        const rank = rankOf(p, n.id);
        const txt = this.nodeText(n, rank);
        if (canUnlock(p, n.id).ok) {
          this.clickable(cx, y, txt, this.nodeColor(p, n), () => {
            unlockNode(p, n.id);
            this.build();
          });
        } else {
          this.label(cx, y, txt, this.nodeColor(p, n), 13);
        }
        y += 34;
      }
    });

    // barre de loadout : capacité active par touche R/C/V/B (clic = capacité suivante du slot)
    const ly = y0 + H - 58;
    this.label(x0 + 16, ly - 18, "Capacités équipées (clic = changer) :", "#cfe0ff", 12);
    for (let slot = 0; slot < 4; slot++) {
      const lx = x0 + 16 + slot * 180;
      const opts = unlockedAbilitiesForSlot(p, slot);
      const cur = abilityForSlot(p, slot);
      const name = cur ? cur.ability.name : "—";
      const multi = opts.length > 1 ? ` (${opts.length})` : "";
      const txt = `[${ABILITY_KEYS[slot]}] ${name}${multi}`;
      if (opts.length > 1) {
        this.clickable(lx, ly, txt, "#7dffb0", () => {
          cycleLoadout(p, slot);
          this.build();
        });
      } else {
        this.label(lx, ly, txt, cur ? "#bfe9ff" : "#5a6072", 12);
      }
    }

    this.clickable(x0 + 16, y0 + H - 28, "↺ Respec (rendre les points)", "#ffb0b0", () => {
      respec(p);
      this.build();
    });
    this.clickable(x0 + W - 220, y0 + H - 28, "⇄ Changer de classe", "#ffd0a0", () => {
      respec(p);
      p.class = null;
      this.build();
    });
    this.label(x0 + W - 16, y0 + 12, "[K]/[Échap]", "#8890a8", 11).setOrigin(1, 0);
  }
}
