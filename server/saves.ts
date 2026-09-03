import fs from "node:fs";
import path from "node:path";

/** Persistance des sauvegardes de joueur (une par compte). Le nom de fichier est dérivé du user. */

/** Nom de fichier sûr : on n'autorise que [a-z0-9_-], le reste est remplacé (anti path-traversal). */
export function safeName(user: string): string {
  return user.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 64) || "_";
}

export function loadSave(dir: string, user: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, safeName(user) + ".json"), "utf8"));
  } catch {
    return null; // pas de sauvegarde encore
  }
}

export function writeSave(dir: string, user: string, save: unknown): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, safeName(user) + ".json"), JSON.stringify(save));
}

export interface SaveSummary {
  user: string;
  size: number;
  mtime: number;
  gold: number;
  level: number;
}

/** Résumé de toutes les sauvegardes (pour économie/stats/serveur). */
export function listSaves(dir: string): SaveSummary[] {
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  return files.map((f) => {
    const full = path.join(dir, f);
    const st = fs.statSync(full);
    let gold = 0;
    let level = 0;
    try {
      const s = JSON.parse(fs.readFileSync(full, "utf8")) as { player?: { gold?: number; level?: number } };
      gold = s.player?.gold ?? 0;
      level = s.player?.level ?? 0;
    } catch {
      // save illisible → 0
    }
    return { user: f.replace(/\.json$/, ""), size: st.size, mtime: st.mtimeMs, gold, level };
  });
}

export function deleteSaveFile(dir: string, user: string): void {
  try {
    fs.unlinkSync(path.join(dir, safeName(user) + ".json"));
  } catch {
    // pas de save à supprimer
  }
}
