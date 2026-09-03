import Phaser from "phaser";
import { WorldMapScene } from "./game/scenes/WorldMapScene";
import { BiomeScene } from "./game/scenes/BiomeScene";
import { createDebugPanel } from "./game/debug/debugPanel";
import { DEFAULT_TUNING } from "./core/config/tuning";
import { getFlags } from "./game/session";
import { showLoginGate } from "./game/auth/loginGate";
import { getToken, getUser, clearToken } from "./shared/authStore";
import { loadOrVerify, saveToServer, startAutoSave } from "./game/net/saveClient";
import { resumeAudio } from "./game/audio/audioEngine";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#10101a",
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: 960, height: 540 },
  scene: [WorldMapScene, BiomeScene],
};

let started = false;

/** Petite barre de compte (utilisateur + déconnexion) en haut de l'écran. */
function accountBar(): void {
  const bar = document.createElement("div");
  bar.style.cssText =
    "position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:9998;display:flex;gap:8px;align-items:center;background:#0d0d18cc;border:1px solid #2a2a40;border-top:none;border-radius:0 0 8px 8px;padding:3px 10px;font:12px monospace;color:#cfd2e6";
  const who = document.createElement("span");
  who.textContent = "👤 " + (getUser() ?? "?");
  const out = document.createElement("button");
  out.textContent = "Déconnexion";
  out.style.cssText = "background:#3a1a1a;color:#f9c;border:1px solid #6a3a3a;border-radius:4px;cursor:pointer;font:11px monospace;padding:2px 8px";
  out.onclick = async () => {
    const ok = await saveToServer();
    if (!ok && !confirm("Sauvegarde impossible (serveur injoignable). Se déconnecter quand même ? La progression non sauvegardée sera perdue.")) return;
    clearToken();
    location.reload();
  };
  bar.append(who, out);
  document.body.appendChild(bar);
}

function startGame(): void {
  if (started) return;
  started = true;
  new Phaser.Game(config);
  createDebugPanel(DEFAULT_TUNING, getFlags()); // F1
  startAutoSave();
  accountBar();
  // politique autoplay : l'AudioContext ne démarre qu'après un geste utilisateur
  window.addEventListener("pointerdown", resumeAudio, { once: true });
  window.addEventListener("keydown", resumeAudio, { once: true });
}

/** Boucle de connexion : tant qu'on n'est pas authentifié + chargé, on (re)montre la porte. */
async function gate(message = ""): Promise<void> {
  await showLoginGate(message);
  const st = await loadOrVerify();
  if (st === "ok") startGame();
  else gate(st === "offline" ? "Serveur injoignable — réessaie." : "Session invalide, reconnecte-toi.");
}

async function boot(): Promise<void> {
  if (getToken()) {
    const st = await loadOrVerify(); // jeton mémorisé → vérifie + charge la sauvegarde
    if (st === "ok") return startGame();
    if (st === "unauthorized") clearToken();
    gate(st === "offline" ? "Serveur injoignable — lance « npm run dev »." : "");
  } else {
    gate();
  }
}

void boot();
