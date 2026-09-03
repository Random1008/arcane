import Phaser from "phaser";
import { World } from "../../core/world";

export class SpriteLayer {
  private map = new Map<number, Phaser.GameObjects.Image>();

  constructor(private scene: Phaser.Scene) {}

  private ensure(id: number, key: string): Phaser.GameObjects.Image {
    let s = this.map.get(id);
    if (!s) {
      s = this.scene.add.image(0, 0, key).setDepth(5);
      this.map.set(id, s);
    }
    return s;
  }

  sync(w: World): void {
    const p = w.player;
    const ps = this.ensure(p.id, "player");
    ps.setPosition(p.transform.pos.x, p.transform.pos.y);
    ps.setDisplaySize(p.radius * 2.3, p.radius * 2.3); // ajuste le sprite à la taille de jeu
    if (p.health.iframes > 0) ps.setTint(0xffd24a); // flash doré pendant l'invulnérabilité
    else ps.clearTint();

    const alive = new Set<number>([p.id]);
    for (const e of w.enemies) {
      alive.add(e.id);
      const key = e.archetype === "dummy" ? "enemy_dummy" : `enemy_${e.archetype}_${e.skin}`;
      const s = this.ensure(e.id, key);
      s.setPosition(e.transform.pos.x, e.transform.pos.y);
      s.setDisplaySize(e.radius * 2.3, e.radius * 2.3);
      s.setTint(e.health.hp / e.health.maxHp < 0.3 ? 0xff3030 : 0xffffff);
    }
    for (const proj of w.projectiles) {
      alive.add(proj.id);
      this.ensure(proj.id, "projectile")
        .setPosition(proj.pos.x, proj.pos.y)
        .setDisplaySize(proj.radius * 2.2, proj.radius * 2.2);
    }
    for (const [id, s] of this.map) {
      if (!alive.has(id)) {
        s.destroy();
        this.map.delete(id);
      }
    }
  }
}
