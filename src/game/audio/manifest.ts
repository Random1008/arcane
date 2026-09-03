import { SfxId, MusicContext } from "../../core/audio/sound";

/**
 * Fichiers audio optionnels (publicDir = "img" → `game/img/x` est servi à l'URL `/x`). Dépose un fichier
 * au bon nom pour remplacer le son synthétisé : `game/img/sfx/<id>.mp3` ou `game/img/music/<ctx>.mp3`.
 * Absent → repli sur la synthèse WebAudio.
 */
export const SFX_FILES: Record<SfxId, string> = {
  attack: "/sfx/attack.mp3",
  hit: "/sfx/hit.mp3",
  playerHurt: "/sfx/playerHurt.mp3",
  enemyDeath: "/sfx/enemyDeath.mp3",
  pickup: "/sfx/pickup.mp3",
  levelup: "/sfx/levelup.mp3",
  ability: "/sfx/ability.mp3",
  bossIntro: "/sfx/bossIntro.mp3",
  buy: "/sfx/buy.mp3",
  uiClick: "/sfx/uiClick.mp3",
  death: "/sfx/death.mp3",
};

export const MUSIC_FILES: Record<MusicContext, string> = {
  worldmap: "/music/worldmap.mp3",
  biome: "/music/biome.mp3",
  boss: "/music/boss.mp3",
  nexus: "/music/nexus.mp3",
};
