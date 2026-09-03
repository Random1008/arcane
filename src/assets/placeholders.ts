import Phaser from "phaser";
import { ASSETS, AssetSpec } from "./manifest";

function drawPlaceholder(scene: Phaser.Scene, a: AssetSpec): void {
  const g = scene.add.graphics();
  g.fillStyle(a.color, 1);
  g.lineStyle(2, 0x000000, 0.4);
  const s = a.size;
  if (a.shape === "circle") {
    g.fillCircle(s / 2, s / 2, s / 2);
    g.strokeCircle(s / 2, s / 2, s / 2);
  } else if (a.shape === "rect") {
    g.fillRect(0, 0, s, s);
    g.strokeRect(0, 0, s, s);
  } else {
    g.fillTriangle(s / 2, 0, s, s, 0, s);
    g.strokeTriangle(s / 2, 0, s, s, 0, s);
  }
  g.generateTexture(a.key, s, s);
  g.destroy();
}

/** À appeler dans preload() : met en file les PNG réels déclarés via `file`. */
export function queueRealAssets(scene: Phaser.Scene): void {
  let hasFiles = false;
  for (const a of ASSETS) {
    if (a.file) {
      scene.load.image(a.key, a.file);
      hasFiles = true;
    }
  }
  if (hasFiles) {
    scene.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.warn(`[assets] texture introuvable, placeholder utilisé pour "${file.key}"`);
    });
  }
}

/** À appeler dans create() : génère un placeholder pour tout asset sans texture chargée. */
export function buildPlaceholders(scene: Phaser.Scene): void {
  for (const a of ASSETS) {
    if (scene.textures.exists(a.key)) continue;
    if (a.file) console.warn(`[assets] "${a.key}" déclaré avec un fichier mais non chargé → placeholder`);
    drawPlaceholder(scene, a);
  }
}
