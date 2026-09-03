import { Tuning } from "../../core/config/tuning";
import { getAudioSettings, setMusicVol, setSfxVol, setMuted } from "../audio/audioEngine";

export interface DebugFlags {
  showHitboxes: boolean;
  showVelocity: boolean;
  godMode: boolean;
  showFps: boolean;
}

export function createDebugPanel(tuning: Tuning, flags: DebugFlags): void {
  if (document.getElementById("sp-debug-panel")) return; // un seul panneau (scènes multiples)
  const box = document.createElement("div");
  box.id = "sp-debug-panel";
  box.style.cssText =
    "position:fixed;top:8px;right:8px;width:240px;max-height:90vh;overflow:auto;background:#0d0d18ee;color:#cfd2e6;font:12px monospace;padding:10px;border:1px solid #2a2a40;border-radius:8px;z-index:9999;display:none";
  box.innerHTML = `<b>DEBUG (F1)</b><br/>`;

  const addSlider = (
    label: string,
    get: () => number,
    set: (n: number) => void,
    min: number,
    max: number,
    step: number,
  ) => {
    const row = document.createElement("div");
    row.style.margin = "6px 0";
    const val = document.createElement("span");
    const r = document.createElement("input");
    r.type = "range";
    r.min = `${min}`;
    r.max = `${max}`;
    r.step = `${step}`;
    r.value = `${get()}`;
    r.style.width = "100%";
    const update = () => {
      val.textContent = ` ${label}: ${get()}`;
    };
    r.oninput = () => {
      set(parseFloat(r.value));
      update();
    };
    update();
    row.appendChild(val);
    row.appendChild(r);
    box.appendChild(row);
  };

  const addToggle = (label: string, get: () => boolean, set: (b: boolean) => void) => {
    const row = document.createElement("label");
    row.style.display = "block";
    row.style.margin = "6px 0";
    const c = document.createElement("input");
    c.type = "checkbox";
    c.checked = get();
    c.onchange = () => set(c.checked);
    row.appendChild(c);
    row.appendChild(document.createTextNode(" " + label));
    box.appendChild(row);
  };

  addSlider("vitesse", () => tuning.move.maxSpeed, (n) => (tuning.move.maxSpeed = n), 60, 500, 10);
  addSlider("accel", () => tuning.move.accel, (n) => (tuning.move.accel = n), 200, 6000, 100);
  addSlider("friction", () => tuning.move.friction, (n) => (tuning.move.friction = n), 200, 6000, 100);
  addSlider("dash dist", () => tuning.dash.distance, (n) => (tuning.dash.distance = n), 60, 400, 10);
  addSlider("dash i-frames", () => tuning.dash.iframes, (n) => (tuning.dash.iframes = n), 0, 1, 0.01);
  addSlider("dash cd", () => tuning.dash.cooldown, (n) => (tuning.dash.cooldown = n), 0, 3, 0.05);
  addSlider("blink portee", () => tuning.blink.range, (n) => (tuning.blink.range = n), 60, 400, 10);
  addSlider("melee dmg", () => tuning.melee.damage, (n) => (tuning.melee.damage = n), 1, 100, 1);
  addSlider("melee portee", () => tuning.melee.range, (n) => (tuning.melee.range = n), 20, 160, 5);
  addSlider("tir dmg", () => tuning.ranged.damage, (n) => (tuning.ranged.damage = n), 1, 100, 1);
  addSlider("tir vitesse", () => tuning.ranged.projectileSpeed, (n) => (tuning.ranged.projectileSpeed = n), 100, 1000, 20);
  addToggle("godmode", () => flags.godMode, (b) => (flags.godMode = b));
  addToggle("hitboxes", () => flags.showHitboxes, (b) => (flags.showHitboxes = b));
  addToggle("vecteur vitesse", () => flags.showVelocity, (b) => (flags.showVelocity = b));
  addToggle("FPS", () => flags.showFps, (b) => (flags.showFps = b));

  // — Audio (persisté en localStorage via audioEngine) —
  const audioTitle = document.createElement("div");
  audioTitle.textContent = "AUDIO";
  audioTitle.style.cssText = "margin:10px 0 4px;color:#cf9aff;font-weight:bold";
  box.appendChild(audioTitle);
  addSlider("vol. musique", () => Math.round(getAudioSettings().musicVol * 100) / 100, (n) => setMusicVol(n), 0, 1, 0.05);
  addSlider("vol. effets", () => Math.round(getAudioSettings().sfxVol * 100) / 100, (n) => setSfxVol(n), 0, 1, 0.05);
  addToggle("muet", () => getAudioSettings().muted, (b) => setMuted(b));

  document.body.appendChild(box);
  window.addEventListener("keydown", (e) => {
    if (e.key === "F1") {
      e.preventDefault();
      box.style.display = box.style.display === "none" ? "block" : "none";
    }
  });
}
