# Spec — Tranche J : Audio (SFX + musique + réglages)

**Date** : 2026-06-11
**Statut** : Scope approuvé. SFX + musique d'ambiance + réglages volume/mute. Sons **synthétisés
(WebAudio)** par défaut + **manifeste** pour remplacer par des fichiers fournis plus tard (pattern sprites).

## 1. `core/audio/sound.ts` (pur, testable)

- `SfxId` = "attack" | "hit" | "playerHurt" | "enemyDeath" | "pickup" | "levelup" | "ability" | "bossIntro"
  | "buy" | "uiClick" | "death".
- `SfxDef { wave: "sine"|"square"|"triangle"|"sawtooth"|"noise"; freq: number; freqEnd?: number; dur: number; gain: number }`.
- `SFX: Record<SfxId, SfxDef>` (descripteurs de synthèse — un « bip/percussion/woosh » distinct par effet).
- `MusicContext` = "worldmap" | "biome" | "boss" | "nexus" ; `MusicDef { root: number; scale: number[]; tempo: number; wave }`.
- `MUSIC: Record<MusicContext, MusicDef>` (boucle d'arpège d'ambiance par contexte).
- `clampVol(v) → [0,1]` ; `DEFAULT_AUDIO = { musicVol: 0.5, sfxVol: 0.7, muted: false }`.

## 2. `game/audio/audioEngine.ts` (singleton, couche jeu)

- `AudioContext` créé **paresseusement** et **repris à la 1ʳᵉ interaction** (politique autoplay navigateur).
- État `{ musicVol, sfxVol, muted }` chargé/sauvé en **localStorage** (`sp-audio`). Setters + getters.
- `playSfx(id)` : si un buffer de fichier (manifeste) est chargé → le joue ; sinon **synthèse** depuis `SFX`
  (oscillateur/bruit + enveloppe gain, fréquence glissante si `freqEnd`). Respecte `sfxVol`/`muted`.
- `playMusic(ctx)` : démarre/échange la boucle d'ambiance (fichier décodé, sinon arpège synthétisé depuis
  `MUSIC`) avec **fondu** ; ignore si déjà sur ce contexte. `stopMusic()`. Respecte `musicVol`/`muted`.
- Tolérant : sans WebAudio (tests/headless) les fonctions sont des no‑op (jamais d'exception).

## 3. `game/audio/manifest.ts` + `game/sfx/README.md`

- `SFX_FILES: Record<SfxId, string>` (`/sfx/<id>.mp3`) et `MUSIC_FILES: Record<MusicContext, string>`
  (`/music/<ctx>.mp3`). Chargement paresseux (`fetch` + `decodeAudioData`) ; **404/échec → repli synthèse**.
- README : déposer un fichier au bon nom pour remplacer le placeholder (servi via `publicDir`).

## 4. Câblage (couche jeu)

- **SFX** : attaque (front montant du clic) ; coup (events de dégâts du monde, throttle) ; dégâts joueur
  (PV en baisse) ; mort ennemi (baisse du nb d'ennemis) ; level‑up (niveau ↑) ; ramassage (Omganium/arme ↑) ;
  capacité (front R/C/V/B) ; intro boss (`showBossIntro`) ; mort joueur (`onDeath`) ; achat (`ShopMenu`).
- **Musique** : `WorldMapScene.create` → `playMusic("worldmap")` ; `BiomeScene.create` → `nexus` si nexus,
  `boss` si un boss est présent, sinon `biome`.
- **Reprise** : 1ʳᵉ touche/clic → `audio.resume()`.

## 5. Réglages

- Section **Audio** dans le panneau debug **F1** : sliders **Musique** et **SFX** (0–100) + case **Mute**,
  câblés aux setters (persistés). (Réglages côté appareil → localStorage, pas la sauvegarde de compte.)

## 6. Tests (vitest, déterministes)

- `SFX` contient une entrée pour **chaque** `SfxId` ; tous les `dur > 0`, `gain ∈ ]0,1]`, `freq > 0`.
- `MUSIC` a les **4** contextes ; `clampVol` borne à [0,1] ; `DEFAULT_AUDIO` cohérent.

## 7. Definition of Done

Sons audibles en jeu (synthétisés) sur les événements clés + musique d'ambiance par contexte avec fondu ;
réglages volume/mute persistés (F1) ; manifeste prêt pour des fichiers fournis. Tests verts, build OK.
`idea/audio.md` + README + index.

## 8. Hors périmètre

Mixage avancé / spatialisation 3D ; musique adaptative par phase de boss ; doublages ; éditeur de sons.
