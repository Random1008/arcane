/**
 * Descripteurs audio purs (synthèse WebAudio). Aucune dépendance navigateur ici : ce module ne fait que
 * décrire les sons ; la lecture vit dans game/audio/audioEngine.ts. Testable.
 */

export type Wave = "sine" | "square" | "triangle" | "sawtooth" | "noise";

export type SfxId =
  | "attack"
  | "hit"
  | "playerHurt"
  | "enemyDeath"
  | "pickup"
  | "levelup"
  | "ability"
  | "bossIntro"
  | "buy"
  | "uiClick"
  | "death";

export interface SfxDef {
  wave: Wave;
  freq: number; // Hz de départ
  freqEnd?: number; // glissando jusqu'à cette fréquence
  dur: number; // secondes
  gain: number; // 0..1 (amplitude crête)
}

export const SFX: Record<SfxId, SfxDef> = {
  attack: { wave: "triangle", freq: 220, freqEnd: 140, dur: 0.08, gain: 0.25 },
  hit: { wave: "square", freq: 520, freqEnd: 320, dur: 0.05, gain: 0.2 },
  playerHurt: { wave: "sawtooth", freq: 200, freqEnd: 90, dur: 0.18, gain: 0.3 },
  enemyDeath: { wave: "noise", freq: 300, dur: 0.15, gain: 0.25 },
  pickup: { wave: "sine", freq: 660, freqEnd: 990, dur: 0.12, gain: 0.25 },
  levelup: { wave: "sine", freq: 523, freqEnd: 1046, dur: 0.4, gain: 0.3 },
  ability: { wave: "sawtooth", freq: 300, freqEnd: 720, dur: 0.18, gain: 0.28 },
  bossIntro: { wave: "sawtooth", freq: 110, freqEnd: 70, dur: 0.6, gain: 0.35 },
  buy: { wave: "sine", freq: 880, freqEnd: 1320, dur: 0.1, gain: 0.25 },
  uiClick: { wave: "square", freq: 440, dur: 0.03, gain: 0.15 },
  death: { wave: "sawtooth", freq: 180, freqEnd: 40, dur: 0.7, gain: 0.35 },
};

export type MusicContext = "worldmap" | "biome" | "boss" | "nexus";

export type OscWave = Exclude<Wave, "noise">; // la musique est jouée par oscillateur (pas de bruit)

export interface MusicDef {
  root: number; // Hz de la fondamentale
  scale: number[]; // décalages en demi-tons (gamme de l'arpège)
  tempo: number; // notes par seconde
  wave: OscWave;
}

export const MUSIC: Record<MusicContext, MusicDef> = {
  worldmap: { root: 220, scale: [0, 4, 7, 12], tempo: 2, wave: "triangle" },
  biome: { root: 196, scale: [0, 3, 7, 10], tempo: 2.5, wave: "triangle" },
  boss: { root: 110, scale: [0, 3, 6, 7], tempo: 4, wave: "sawtooth" },
  nexus: { root: 261, scale: [0, 5, 7, 11], tempo: 3, wave: "sine" },
};

/** Fréquence d'une note : demi-tons au-dessus de la fondamentale (gamme tempérée). */
export function noteFreq(root: number, semitones: number): number {
  return root * Math.pow(2, semitones / 12);
}

export function clampVol(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export interface AudioSettings {
  musicVol: number;
  sfxVol: number;
  muted: boolean;
}

export const DEFAULT_AUDIO: AudioSettings = { musicVol: 0.5, sfxVol: 0.7, muted: false };
