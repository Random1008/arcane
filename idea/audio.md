🔊 AUDIO (SFX + musique + réglages)

État actuel (`src/core/audio/sound.ts` = descripteurs purs ; `src/game/audio/audioEngine.ts` = moteur WebAudio).

🎛️ PRINCIPE
Comme les sprites : **placeholders synthétisés maintenant, fichiers fournis plus tard**.
- Par défaut, chaque son est **synthétisé à la volée** (WebAudio : oscillateur/bruit + enveloppe).
- Dépose un fichier au bon nom (`img/sfx/<id>.mp3`, `img/music/<contexte>.mp3`) → il **remplace**
  automatiquement la synthèse (chargement paresseux, repli si absent). Voir `img/sfx/README.md`
  et `img/music/README.md`.

🔔 EFFETS SONORES (11)
attaque · coup (hit) · dégâts joueur · mort d'ennemi · ramassage (arme/Omganium) · level-up ·
capacité (R/C/V/B) · intro de boss · achat boutique · clic UI (carte) · mort du joueur.
Déclenchés par **diff d'état** (PV/niveau/Omganium/nb d'ennemis/armes) et **fronts d'input** dans
`BiomeScene.playEventSfx`, + hooks directs (intro boss, mort, achat, clic carte).

🎵 MUSIQUE D'AMBIANCE (4 contextes, avec fondu)
- `worldmap` : carte du monde (arpège majeur calme)
- `biome` : exploration biome/donjon (mineur)
- `boss` : combat de boss — biome-boss, salle de donjon, Nexus (grave, rapide)
- `nexus` : hub/salles du Nexus (suspendu)
Boucle d'arpège synthétisée par contexte ; un fichier `music/<ctx>.mp3` la remplace (lecture en boucle).
Changement de contexte → fondu ; `playMusic` ignore si déjà sur le bon contexte.

🎚️ RÉGLAGES (panneau **F1**, section AUDIO)
Volume **musique**, volume **effets**, **muet** — **persistés** en localStorage (`sp-audio`, par appareil).
L'AudioContext démarre au **premier geste** (politique autoplay des navigateurs).

💡 IDÉES À VENIR
- Musique adaptative par phase de boss ; stingers (victoire, coffre)
- Spatialisation (volume selon la distance) ; variations de pitch aléatoires
- Sons par arme / par biome
