import { getToken } from "../../shared/authStore";
import { serialize, hydrate, SaveData } from "../session";

export type LoadStatus = "ok" | "unauthorized" | "offline";

/**
 * Vérifie le jeton et charge la sauvegarde. `ok` = jeton valide (save appliquée ou nouveau joueur),
 * `unauthorized` = jeton refusé (→ reconnexion), `offline` = serveur injoignable.
 */
export async function loadOrVerify(): Promise<LoadStatus> {
  const token = getToken();
  if (!token) return "unauthorized";
  try {
    const res = await fetch("/api/save", { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) return "unauthorized";
    if (!res.ok) return "offline";
    const { save } = (await res.json()) as { save: SaveData | null };
    hydrate(save); // null → on garde le joueur neuf
    return "ok";
  } catch {
    return "offline";
  }
}

/** Envoie l'état courant au serveur. Renvoie true si écrit, false si échec réseau/serveur. */
export async function saveToServer(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch("/api/save", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ save: serialize() }),
      keepalive: true, // permet l'envoi même pendant la fermeture/masquage de l'onglet
    });
    return res.ok;
  } catch {
    return false; // hors-ligne : on retentera à la prochaine sauvegarde
  }
}

const AUTOSAVE_INTERVAL_MS = 20000;
let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoSave(): void {
  if (autoSaveTimer) return;
  autoSaveTimer = setInterval(() => void saveToServer(), AUTOSAVE_INTERVAL_MS);
  // sauvegarde aussi quand l'onglet passe en arrière-plan / se ferme (limite la perte à la dernière action)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void saveToServer();
  });
}
