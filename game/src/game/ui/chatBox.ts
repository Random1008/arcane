import Phaser from "phaser";
import { getChatMessages, pushChat } from "../session";
import { matchCommands } from "../../core/commands";

/**
 * Barre de chat (rendu Phaser, fixée à la caméra).
 * - Entrée ouvre/envoie, Échap referme.
 * - Si la saisie commence par « / », une liste de suggestions de commandes s'affiche
 *   au-dessus de la barre ; Tab complète la meilleure suggestion ; envoyer exécute la commande.
 */
export class ChatBox {
  private open = false;
  private current = "";
  private bg: Phaser.GameObjects.Graphics;
  private logText: Phaser.GameObjects.Text;
  private inputText: Phaser.GameObjects.Text;
  private suggestBg: Phaser.GameObjects.Graphics;
  private suggestText: Phaser.GameObjects.Text;

  constructor(
    private scene: Phaser.Scene,
    private onCommand?: (raw: string) => string,
  ) {
    this.bg = scene.add.graphics().setScrollFactor(0).setDepth(55).setVisible(false);
    this.suggestBg = scene.add.graphics().setScrollFactor(0).setDepth(57).setVisible(false);
    this.logText = scene.add
      .text(12, 0, "", { fontFamily: "monospace", fontSize: "13px", color: "#cfd2e6" })
      .setScrollFactor(0)
      .setDepth(56);
    this.suggestText = scene.add
      .text(12, 0, "", { fontFamily: "monospace", fontSize: "13px", color: "#cfe8b0" })
      .setScrollFactor(0)
      .setDepth(58)
      .setVisible(false);
    this.inputText = scene.add
      .text(12, 0, "", { fontFamily: "monospace", fontSize: "14px", color: "#ffffff" })
      .setScrollFactor(0)
      .setDepth(58)
      .setVisible(false);
  }

  isOpen(): boolean {
    return this.open;
  }

  openChat(): void {
    this.open = true;
    this.current = "";
    this.render();
  }

  closeChat(): void {
    this.open = false;
    this.current = "";
    this.render();
  }

  /** Reçoit les keydown natifs quand la barre est ouverte. */
  handleKey(e: KeyboardEvent): void {
    if (!this.open) return;
    if (e.key === "Tab") {
      e.preventDefault();
      const m = matchCommands(this.current);
      if (m.length) this.current = "/" + m[0].name + " ";
      this.render();
    } else if (e.key === "Enter") {
      if (e.repeat) return;
      this.submit();
    } else if (e.key === "Escape") {
      if (e.repeat) return;
      this.closeChat();
    } else if (e.key === "Backspace") {
      this.current = this.current.slice(0, -1);
      this.render();
    } else if (e.key.length === 1 && this.current.length < 120) {
      this.current += e.key;
      this.render();
    }
  }

  private submit(): void {
    const m = this.current.trim();
    if (m) {
      if (m.startsWith("/")) {
        pushChat(this.onCommand ? this.onCommand(m) : "Système: commandes indisponibles ici");
      } else {
        pushChat("Toi: " + m);
      }
    }
    this.closeChat();
  }

  /** Appelée chaque frame par la scène (repositionnement + maj du journal + suggestions). */
  render(): void {
    const msgs = getChatMessages().slice(-6);
    const h = this.scene.scale.height;
    const w = this.scene.scale.width;
    const inputY = h - 30;
    const logBottom = this.open ? inputY - 6 : h - 12;
    this.logText
      .setText(msgs.join("\n"))
      .setPosition(12, logBottom - msgs.length * 16)
      .setAlpha(this.open ? 1 : 0.6)
      .setVisible(msgs.length > 0);

    if (!this.open) {
      this.bg.setVisible(false);
      this.inputText.setVisible(false);
      this.suggestBg.setVisible(false);
      this.suggestText.setVisible(false);
      return;
    }

    this.bg.clear().fillStyle(0x0d0d18, 0.85).fillRect(0, h - 36, w, 32);
    this.bg.setVisible(true);
    this.inputText.setText("> " + this.current + "_").setPosition(12, inputY).setVisible(true);

    // suggestions de commandes (préfixe « / »)
    const matches = this.current.startsWith("/") ? matchCommands(this.current).slice(0, 6) : [];
    if (matches.length) {
      const lines = matches.map((c, i) => `${i === 0 ? "▶" : " "} ${c.usage}  —  ${c.desc}`);
      const boxH = lines.length * 16 + 8;
      const by = h - 36 - boxH - 2;
      this.suggestBg.clear().fillStyle(0x0d0d18, 0.92).fillRect(0, by, w, boxH).lineStyle(1, 0x3a3a55, 1).strokeRect(0, by, w, boxH);
      this.suggestBg.setVisible(true);
      this.suggestText.setText(lines.join("\n")).setPosition(12, by + 4).setVisible(true);
    } else {
      this.suggestBg.setVisible(false);
      this.suggestText.setVisible(false);
    }
  }
}
