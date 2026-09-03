import Phaser from "phaser";

export function spawnDamageText(scene: Phaser.Scene, x: number, y: number, amount: number, crit: boolean): void {
  const size = crit ? "22px" : "16px";
  const color = crit ? "#ff5d5d" : "#ffd24a";
  const label = crit ? `${Math.round(amount)}!` : `${Math.round(amount)}`;
  const t = scene.add
    .text(x, y, label, { fontFamily: "monospace", fontSize: size, color, fontStyle: crit ? "bold" : "normal" })
    .setOrigin(0.5)
    .setDepth(30);
  scene.tweens.add({
    targets: t,
    y: y - (crit ? 40 : 28),
    alpha: 0,
    duration: crit ? 750 : 600,
    onComplete: () => t.destroy(),
  });
}
