import { describe, it, expect } from "vitest";
import { SFX, MUSIC, clampVol, noteFreq, DEFAULT_AUDIO, SfxId } from "../src/core/audio/sound";
import { SFX_FILES, MUSIC_FILES } from "../src/game/audio/manifest";

describe("audio (descripteurs)", () => {
  it("SFX : une entrée par effet, paramètres valides", () => {
    const ids = Object.keys(SFX) as SfxId[];
    expect(ids.length).toBe(11);
    for (const id of ids) {
      const d = SFX[id];
      expect(d.dur).toBeGreaterThan(0);
      expect(d.gain).toBeGreaterThan(0);
      expect(d.gain).toBeLessThanOrEqual(1);
      expect(d.freq).toBeGreaterThan(0);
      if (d.freqEnd !== undefined) expect(d.freqEnd).toBeGreaterThan(0);
    }
  });

  it("MUSIC : les 4 contextes, gammes/tempo valides", () => {
    expect(Object.keys(MUSIC).sort()).toEqual(["biome", "boss", "nexus", "worldmap"]);
    for (const m of Object.values(MUSIC)) {
      expect(m.root).toBeGreaterThan(0);
      expect(m.tempo).toBeGreaterThan(0);
      expect(m.scale.length).toBeGreaterThan(0);
    }
  });

  it("manifeste : le nom de fichier correspond exactement à l'id (convention des README)", () => {
    for (const id of Object.keys(SFX)) expect(SFX_FILES[id as SfxId]).toBe(`/sfx/${id}.mp3`);
    for (const ctx of Object.keys(MUSIC)) expect(MUSIC_FILES[ctx as keyof typeof MUSIC_FILES]).toBe(`/music/${ctx}.mp3`);
  });

  it("clampVol borne à [0,1] ; noteFreq tempérée ; défauts cohérents", () => {
    expect(clampVol(-1)).toBe(0);
    expect(clampVol(2)).toBe(1);
    expect(clampVol(0.4)).toBe(0.4);
    expect(noteFreq(220, 12)).toBeCloseTo(440, 5); // +1 octave
    expect(noteFreq(220, 0)).toBe(220);
    expect(DEFAULT_AUDIO.musicVol).toBeGreaterThan(0);
    expect(DEFAULT_AUDIO.sfxVol).toBeGreaterThan(0);
    expect(DEFAULT_AUDIO.muted).toBe(false);
  });
});
