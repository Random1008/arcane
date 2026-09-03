import { SFX, SfxId, MUSIC, MusicContext, noteFreq, clampVol, AudioSettings, DEFAULT_AUDIO } from "../../core/audio/sound";
import { SFX_FILES, MUSIC_FILES } from "./manifest";

/**
 * Moteur audio WebAudio (singleton). Synthétise les sons par défaut ; joue un fichier du manifeste s'il
 * est présent. Tolérant : sans AudioContext (tests/headless) tout est no-op. Réglages persistés en localStorage.
 */
const LS = "sp-audio";
const ENV_FLOOR = 0.0001; // plancher des rampes exponentielles (ne peuvent pas atteindre 0)
const MUSIC_GAIN = 0.25; // niveau max de la musique (sous les SFX)

function load(): AudioSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) ?? "{}") as Partial<AudioSettings>;
    return {
      musicVol: typeof raw.musicVol === "number" && Number.isFinite(raw.musicVol) ? clampVol(raw.musicVol) : DEFAULT_AUDIO.musicVol,
      sfxVol: typeof raw.sfxVol === "number" && Number.isFinite(raw.sfxVol) ? clampVol(raw.sfxVol) : DEFAULT_AUDIO.sfxVol,
      muted: typeof raw.muted === "boolean" ? raw.muted : DEFAULT_AUDIO.muted,
    };
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}
let settings: AudioSettings = load();
function save(): void {
  try {
    localStorage.setItem(LS, JSON.stringify(settings));
  } catch {
    // localStorage indisponible
  }
}

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function resumeAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
}

export function getAudioSettings(): AudioSettings {
  return { ...settings };
}
export function setMusicVol(v: number): void {
  settings.musicVol = clampVol(v);
  save();
  applyMusicVol();
}
export function setSfxVol(v: number): void {
  settings.sfxVol = clampVol(v);
  save();
}
export function setMuted(m: boolean): void {
  settings.muted = m;
  save();
  applyMusicVol();
}

// — Chargement de fichiers (manifeste) : null = absent → synthèse —
async function fetchBuffer(c: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await c.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// — SFX —
const sfxBuffers = new Map<SfxId, AudioBuffer | null>();
const sfxLoading = new Set<SfxId>(); // anti re-fetch par frame tant que le 1er chargement n'a pas résolu
function noiseBuffer(c: AudioContext, dur: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
async function tryLoadSfx(id: SfxId): Promise<void> {
  const c = getCtx();
  if (!c || sfxLoading.has(id)) return;
  sfxLoading.add(id);
  sfxBuffers.set(id, await fetchBuffer(c, SFX_FILES[id]));
}
function playBuffer(buf: AudioBuffer, vol: number): void {
  const c = getCtx();
  if (!c) return;
  const g = c.createGain();
  g.gain.value = vol;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(g);
  g.connect(c.destination);
  src.start();
}
export function playSfx(id: SfxId): void {
  if (settings.muted) return;
  const c = getCtx();
  if (!c || c.state !== "running") return; // contexte suspendu (autoplay) → ne rien planifier
  const buf = sfxBuffers.get(id);
  if (buf) return playBuffer(buf, settings.sfxVol);
  if (!sfxBuffers.has(id)) void tryLoadSfx(id); // chargera le fichier pour les prochaines fois
  const def = SFX[id];
  const t = c.currentTime;
  const g = c.createGain();
  const peak = Math.max(ENV_FLOOR, settings.sfxVol * def.gain);
  g.gain.setValueAtTime(ENV_FLOOR, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(ENV_FLOOR, t + def.dur);
  g.connect(c.destination);
  if (def.wave === "noise") {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, def.dur);
    src.connect(g);
    src.start(t);
    src.stop(t + def.dur);
  } else {
    const o = c.createOscillator();
    o.type = def.wave;
    o.frequency.setValueAtTime(def.freq, t);
    if (def.freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, def.freqEnd), t + def.dur);
    o.connect(g);
    o.start(t);
    o.stop(t + def.dur);
  }
}

// — Musique —
let currentMusic: MusicContext | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicGain: GainNode | null = null;
let musicSource: AudioBufferSourceNode | null = null;
const musicBuffers = new Map<MusicContext, AudioBuffer | null>();
const musicLoading = new Set<MusicContext>(); // anti double fetch/decode du même fichier

function targetMusicGain(): number {
  return settings.muted ? 0 : settings.musicVol * MUSIC_GAIN;
}
function applyMusicVol(): void {
  if (musicGain && ctx) musicGain.gain.setTargetAtTime(targetMusicGain(), ctx.currentTime, 0.1);
}
function stopArpeggio(): void {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
function stopMusicLoop(): void {
  stopArpeggio();
  if (musicSource) {
    try {
      musicSource.stop();
    } catch {
      // déjà arrêté
    }
    musicSource = null;
  }
  if (musicGain) {
    try {
      musicGain.disconnect();
    } catch {
      // déjà déconnecté
    }
    musicGain = null;
  }
}
export function stopMusic(): void {
  currentMusic = null;
  stopMusicLoop();
}
export function playMusic(context: MusicContext): void {
  if (context === currentMusic) return;
  currentMusic = context;
  stopMusicLoop();
  const c = getCtx();
  if (!c) return;
  musicGain = c.createGain();
  musicGain.gain.value = ENV_FLOOR;
  musicGain.gain.setTargetAtTime(targetMusicGain(), c.currentTime, 0.5); // fondu d'entrée
  musicGain.connect(c.destination);

  if (musicBuffers.get(context)) {
    startMusicBuffer(c, context);
  } else {
    if (!musicBuffers.has(context) && !musicLoading.has(context)) void tryLoadMusic(context);
    startArpeggio(context);
  }
}
function startArpeggio(context: MusicContext): void {
  const def = MUSIC[context];
  const interval = 1000 / def.tempo;
  let step = 0;
  musicTimer = setInterval(() => {
    // contexte suspendu (autoplay) : currentTime est gelé → planifier empilerait toutes les notes
    // sur le même instant (rafale au premier geste). Muet : inutile de créer des nodes.
    if (!ctx || !musicGain || ctx.state !== "running" || settings.muted) return;
    const oct = Math.floor(step / def.scale.length) % 2;
    const f = noteFreq(def.root, def.scale[step % def.scale.length] + oct * 12);
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = def.wave;
    o.frequency.value = f;
    const g = ctx.createGain();
    const span = (interval / 1000) * 0.9;
    g.gain.setValueAtTime(ENV_FLOOR, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(ENV_FLOOR, t + span);
    o.connect(g);
    g.connect(musicGain);
    o.start(t);
    o.stop(t + span);
    step++;
  }, interval);
}
function startMusicBuffer(c: AudioContext, context: MusicContext): void {
  const buf = musicBuffers.get(context);
  if (!buf || !musicGain) return;
  musicSource = c.createBufferSource();
  musicSource.buffer = buf;
  musicSource.loop = true;
  musicSource.connect(musicGain);
  musicSource.start();
}
async function tryLoadMusic(context: MusicContext): Promise<void> {
  const c = getCtx();
  if (!c || musicLoading.has(context)) return;
  musicLoading.add(context);
  const buf = await fetchBuffer(c, MUSIC_FILES[context]);
  musicBuffers.set(context, buf);
  if (buf && currentMusic === context && !musicSource) {
    // bascule de l'arpège vers le fichier maintenant disponible
    stopArpeggio();
    startMusicBuffer(c, context);
  }
}
