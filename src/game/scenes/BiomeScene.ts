import Phaser from "phaser";
import { buildPlaceholders, queueRealAssets } from "../../assets/placeholders";
import { tickWorld, World, Npc, InputState, spawnChasers, killAllEnemies, healFull } from "../../core/world";
import { saveToServer } from "../net/saveClient";
import { playSfx, playMusic } from "../audio/audioEngine";
import { generateBiomeWorld } from "../../core/generate";
import { generateDungeon, generateRoomWorld, roomById, opposite, entryPos, Dungeon, Dir, isPuzzleRoom, puzzleResolved } from "../../core/dungeon";
import { getDungeonMod } from "../../core/dungeonMods";
import { generateNexusHub, generateNexusRoom, clearNexusRoom, Portal, NEXUS_LEVEL_LABEL, NEXUS_LEVELS } from "../../core/nexus";
import { getBiome } from "../../core/biomes";
import { getWorldEvent } from "../../core/events";
import { respawnPlayer } from "../../core/death";
import { DEFAULT_TUNING } from "../../core/config/tuning";
import { FixedStep } from "../../core/time/fixedStep";
import { clampToBounds } from "../../core/collision";
import { v } from "../../core/math/vec2";
import { InputMap } from "../input/inputMap";
import { SpriteLayer } from "../render/sprites";
import { spawnDamageText } from "../render/floatingText";
import { drawMeleeSlash } from "../render/slash";
import { HotbarBar } from "../render/hotbarBar";
import { weaponAbbr, weaponColor } from "../render/weaponVisual";
import { activeWeapon, addWeapon, selectSlot } from "../../core/combat/hotbar";
import { computeStats, WEAPONS, TIERS, Tier, OMEGA_MOD_LABEL } from "../../core/combat/weapons";
import { getWeaponDefEx, namedWeapon, weaponEffects, isUltimateWeapon } from "../../core/combat/catalog";
import { EFFECT_LABEL } from "../../core/combat/effects";
import { craftOmega } from "../../core/craft";
import { makeArmor, makeUniqueArmor, makeOmegaArmor, UNIQUE_ARMORS, OMEGA_ARMORS, ARMOR_SLOTS, OMEGA_SETS, OmegaSet } from "../../core/armor";
import { EquipMenu } from "../ui/equipMenu";
import { StatsMenu } from "../ui/statsMenu";
import { ClassMenu } from "../ui/classMenu";
import { ShopMenu } from "../ui/shopMenu";
import { xpForNext } from "../../core/progression";
import { respec, abilityForSlot, ABILITY_KEYS } from "../../core/skills";
import { CLASS_UNLOCK_LEVEL } from "../../core/classes";
import { COMMANDS } from "../../core/commands";
import { createDebugPanel } from "../debug/debugPanel";
import { DialogueBox } from "../render/dialogueBox";
import { ChatBox } from "../ui/chatBox";
import { getPlayer, getFlags, markIdentified, markCleared, isCleared, hasClearedRank, isNexusUnlocked, isRingFinal, getNexusBest, markNexusBest } from "../session";

const normalizeTier = (s?: string): Tier | null => {
  const u = (s ?? "").toUpperCase();
  return (TIERS as string[]).includes(u) ? (u as Tier) : null;
};

export class BiomeScene extends Phaser.Scene {
  private biomeId = "plains";
  private world!: World;
  private inputMap!: InputMap;
  private sprites!: SpriteLayer;
  private fixed = new FixedStep(1 / 60);
  private tuning = DEFAULT_TUNING;
  private flags = getFlags();
  private gfx!: Phaser.GameObjects.Graphics;
  private slashGfx!: Phaser.GameObjects.Graphics;
  private pickupGfx!: Phaser.GameObjects.Graphics;
  private pickupLabels = new Map<number, Phaser.GameObjects.Text>();
  private portalLabels = new Map<number, Phaser.GameObjects.Text>();
  private hotbarBar!: HotbarBar;
  private hud!: Phaser.GameObjects.Text;
  private hadEnemies = false;
  private hadBoss = false;
  private dungeonMode = false;
  private dungeon: Dungeon | null = null;
  private roomCache = new Map<number, World>();
  private currentRoomId = 0;
  // suivi pour les SFX (diff d'état d'une frame à l'autre)
  private prevHp = 0;
  private prevLevel = 0;
  private prevOmganium = 0;
  private prevEnemies = 0;
  private prevWeapons = 0;
  private prevAttack = false;
  private prevAbility = -1;
  private nexusMode = false;
  private nexusLevel = 0; // niveau de la salle courante (0 = hub)
  private get inHub(): boolean {
    return this.nexusLevel === 0;
  }
  private cleared = false;
  private dead = false;
  private bossSprite?: Phaser.GameObjects.Image;
  private bossGfx!: Phaser.GameObjects.Graphics;
  private bossBar!: Phaser.GameObjects.Graphics;
  private bossBarText!: Phaser.GameObjects.Text;
  private dialogue!: DialogueBox;
  private npcGfx!: Phaser.GameObjects.Graphics;
  private npcLabels: Phaser.GameObjects.Text[] = [];
  private dialogueNpc: Npc | null = null;
  private dialogueLine = 0;
  private dialogueLocked = false; // bulle « … » d'un PNJ verrouillé
  private lastInteract = 0;
  private chat!: ChatBox;
  private equipMenu!: EquipMenu;
  private statsMenu!: StatsMenu;
  private classMenu!: ClassMenu;
  private shopMenu!: ShopMenu;
  private xpBar!: Phaser.GameObjects.Graphics;
  private abilityBar!: Phaser.GameObjects.Graphics;
  private pickupPrompt!: Phaser.GameObjects.Text;
  private abilityTexts: Phaser.GameObjects.Text[] = [];
  private wasPaused = false;

  constructor() {
    super("biome");
  }

  init(data: { biomeId?: string; dungeon?: boolean; nexus?: boolean }) {
    this.biomeId = data?.biomeId ?? "plains";
    this.dungeonMode = data?.dungeon ?? false;
    this.nexusMode = data?.nexus ?? false;
  }

  preload() {
    queueRealAssets(this);
  }

  create() {
    buildPlaceholders(this);
    const biome = getBiome(this.biomeId);
    if (this.nexusMode) {
      this.nexusLevel = 0; // hub
      this.dungeon = null;
      this.roomCache = new Map();
      this.world = generateNexusHub(getPlayer(), Math.random);
    } else if (this.dungeonMode) {
      this.dungeon = generateDungeon(biome, Math.random);
      this.roomCache = new Map();
      this.currentRoomId = this.dungeon.startId;
      this.world = this.getRoomWorld(this.currentRoomId);
      this.world.player.transform.pos = { x: this.world.level.bounds.w / 2, y: this.world.level.bounds.h - 90 };
      this.world.player.health.iframes = Math.max(this.world.player.health.iframes, 0.6); // grâce d'entrée
      // bandeau du modificateur de donjon (tranche L)
      const mod = getDungeonMod(this.dungeon.modId ?? "");
      if (mod) this.banner(`⚠ Donjon ${mod.name}`, "#ffb38a");
    } else {
      this.world = generateBiomeWorld(getPlayer(), biome, Math.random, isRingFinal(this.biomeId));
      this.dungeon = null; // libère l'état donjon (cache de salles) en mode biome
      this.roomCache = new Map();
      this.currentRoomId = 0;
      // visiter le Sanctuaire le marque « fait » → débloque le 1er anneau (passage obligatoire)
      if (this.biomeId === "spawn") markCleared("spawn");
      // un biome-boss déjà nettoyé ne refait pas combattre son boss
      if (isCleared(this.biomeId) && this.world.boss) this.world.boss = null;
      // portail du Nexus Infini au Sanctuaire (après avoir vaincu le boss S)
      if (this.biomeId === "spawn" && isNexusUnlocked()) {
        // décalé latéralement pour ne pas barrer le corridor spawn→sortie carte (entre les 2 rangées de PNJ)
        this.world.portals.push({ id: 5000, pos: { x: 820, y: 260 }, radius: 28, kind: "return", danger: 0, open: true });
      }
    }
    this.hadEnemies = this.world.enemies.length > 0;
    this.hadBoss = this.world.boss !== null;
    this.cleared = false;
    this.dead = false;
    this.syncAudioCounters();
    playMusic(this.musicContext());
    // réinit des états d'instance (Phaser réutilise la scène entre les biomes)
    this.npcLabels = [];
    this.dialogueNpc = null;
    this.dialogueLine = 0;
    this.dialogueLocked = false;
    this.wasPaused = false;
    this.lastInteract = 0;
    this.bossSprite = undefined;
    this.inputMap = new InputMap(this);
    this.sprites = new SpriteLayer(this);
    this.gfx = this.add.graphics().setDepth(1);
    this.bossGfx = this.add.graphics().setDepth(2);
    this.pickupGfx = this.add.graphics().setDepth(3);
    this.slashGfx = this.add.graphics().setDepth(6);
    this.bossBar = this.add.graphics().setScrollFactor(0).setDepth(21).setVisible(false);
    this.bossBarText = this.add
      .text(0, 0, "", { fontFamily: "monospace", fontSize: "13px", color: "#ffd0d0", fontStyle: "bold" })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(22)
      .setVisible(false);
    this.pickupLabels = new Map(); // labels créés à la volée (les drops apparaissent en jeu)
    this.portalLabels = new Map();
    this.hotbarBar = new HotbarBar(this, getPlayer().hotbar.slots.length);
    this.dialogue = new DialogueBox(this);
    this.chat = new ChatBox(this, (raw) => this.runCommand(raw));
    this.equipMenu = new EquipMenu(this);
    this.statsMenu = new StatsMenu(this);
    this.classMenu = new ClassMenu(this);
    this.shopMenu = new ShopMenu(this);
    this.pickupPrompt = this.add
      .text(0, 0, "", { fontFamily: "monospace", fontSize: "12px", color: "#ffe9a8", fontStyle: "bold" })
      .setOrigin(0.5)
      .setDepth(8)
      .setVisible(false);
    this.xpBar = this.add.graphics().setScrollFactor(0).setDepth(20);
    this.abilityBar = this.add.graphics().setScrollFactor(0).setDepth(40);
    this.abilityTexts = [];
    for (let i = 0; i < 4; i++) {
      this.abilityTexts.push(
        this.add.text(0, 0, "", { fontFamily: "monospace", fontSize: "11px", color: "#cfe0ff" }).setScrollFactor(0).setDepth(42).setOrigin(0.5),
      );
    }
    this.npcGfx = this.add.graphics().setDepth(5);
    for (const npc of this.world.npcs) {
      this.npcLabels.push(
        this.add
          .text(npc.pos.x, npc.pos.y - npc.radius - 12, "?", {
            fontFamily: "monospace",
            fontSize: "12px",
            color: "#ffe9a8",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(7),
      );
    }
    this.hud = this.add
      .text(12, 12, "", { fontFamily: "monospace", fontSize: "14px", color: "#eef" })
      .setScrollFactor(0)
      .setDepth(20);
    // brouillard d'événement (tranche K) : voile sombre plein écran selon le rayon de vision
    const evDef = this.world.eventId ? getWorldEvent(this.world.eventId) : null;
    const vr = evDef?.effects.visionRadius;
    if (vr) {
      const sw = this.scale.width;
      const sh = this.scale.height;
      const alpha = vr <= 150 ? 0.82 : 0.6;
      this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x05070d, alpha).setScrollFactor(0).setDepth(50);
    }
    this.cameras.main.setBackgroundColor((this.world.biome ?? biome).palette.ground);
    const lb = this.world.level.bounds;
    this.cameras.main.setBounds(0, 0, lb.w, lb.h);
    this.cameras.main.centerOn(this.world.player.transform.pos.x, this.world.player.transform.pos.y);
    createDebugPanel(this.tuning, this.flags);
    // Touches enregistrées comme Key (emitOnRepeat=false par défaut → pas d'auto-répétition)
    // et auto-détruites au shutdown de la scène.
    const kb = this.input.keyboard!;
    const anyMenu = () => this.chat.isOpen() || this.equipMenu.isOpen() || this.statsMenu.isOpen() || this.classMenu.isOpen() || this.shopMenu.isOpen();
    const otherMenu = (self: { isOpen(): boolean }) =>
      [this.equipMenu, this.statsMenu, this.classMenu, this.shopMenu].some((m) => m !== self && m.isOpen()) || this.chat.isOpen();
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.M).on("down", () => {
      if (!anyMenu() && !this.dialogue.isOpen()) this.scene.start("worldmap");
    });
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on("down", () => {
      if (this.dialogue.isOpen()) {
        this.dialogue.hide();
        this.dialogueNpc = null;
        this.dialogueLocked = false;
      } else if (this.equipMenu.isOpen()) this.equipMenu.close();
      else if (this.statsMenu.isOpen()) this.statsMenu.close();
      else if (this.classMenu.isOpen()) this.classMenu.close();
      else if (this.shopMenu.isOpen()) this.shopMenu.close();
      else if (!this.chat.isOpen()) this.scene.start("worldmap");
    });
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.F).on("down", () => {
      if (!anyMenu()) this.onInteract(); // F gère aussi l'avancement du dialogue
    });
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.I).on("down", () => {
      if (!otherMenu(this.equipMenu) && !this.dialogue.isOpen()) this.equipMenu.toggle(this.world.player);
    });
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.P).on("down", () => {
      if (!otherMenu(this.statsMenu) && !this.dialogue.isOpen()) this.statsMenu.toggle(this.world.player);
    });
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.K).on("down", () => {
      if (!otherMenu(this.classMenu) && !this.dialogue.isOpen()) this.classMenu.toggle(this.world.player);
    });
    // chat : Entrée ouvre/envoie, Échap referme ; la saisie capte les keydown natifs
    kb.on("keydown", (e: KeyboardEvent) => {
      if (this.chat.isOpen()) {
        this.chat.handleKey(e);
      } else if (
        e.key === "Enter" &&
        !e.repeat &&
        !this.equipMenu.isOpen() &&
        !this.statsMenu.isOpen() &&
        !this.classMenu.isOpen() &&
        !this.shopMenu.isOpen() &&
        !this.dialogue.isOpen()
      ) {
        this.chat.openChat();
      }
    });

    this.showBossIntro();
  }

  /** Carte d'intro du boss (nom + réplique) ; rejouée aussi à l'entrée d'une salle de boss (donjon/Nexus). */
  private showBossIntro(): void {
    if (!this.world.boss) return;
    playSfx("bossIntro");
    const b = this.world.boss;
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const nameT = this.add.text(cx, cy - 30, b.name, { fontFamily: "monospace", fontSize: "24px", color: "#ff5d5d", fontStyle: "bold" }).setOrigin(0.5).setScrollFactor(0).setDepth(45);
    const introT = this.add.text(cx, cy + 8, b.intro, { fontFamily: "monospace", fontSize: "14px", color: "#ffd0d0", wordWrap: { width: this.scale.width - 80 }, align: "center" }).setOrigin(0.5).setScrollFactor(0).setDepth(45);
    this.tweens.add({ targets: [nameT, introT], alpha: 0, delay: 2200, duration: 800, onComplete: () => { nameT.destroy(); introT.destroy(); } });
  }

  private getRoomWorld(roomId: number): World {
    let w = this.roomCache.get(roomId);
    if (!w) {
      w = generateRoomWorld(
        getPlayer(),
        getBiome(this.biomeId),
        roomById(this.dungeon!, roomId),
        Math.random,
        this.dungeon?.modId ?? null,
      );
      this.roomCache.set(roomId, w);
    }
    return w;
  }

  /** Bandeau temporaire centré (modificateur de donjon, etc.). */
  private banner(text: string, color: string): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 - 80;
    const t = this.add
      .text(cx, cy, text, { fontFamily: "monospace", fontSize: "18px", color, fontStyle: "bold" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(45);
    this.tweens.add({ targets: t, alpha: 0, delay: 2400, duration: 900, onComplete: () => t.destroy() });
  }

  /** Change de salle de donjon (cache l'état nettoyé). */
  private loadRoom(roomId: number, entryDir?: Dir): void {
    this.currentRoomId = roomId;
    this.world = this.getRoomWorld(roomId);
    this.world.doorReached = null; // évite une re-transition immédiate
    this.world.events.length = 0; // pas de replay des dégâts flottants de l'ancienne salle
    this.world.godMode = this.flags.godMode;
    const p = this.world.player;
    p.transform.pos = entryDir ? entryPos(entryDir) : { x: this.world.level.bounds.w / 2, y: this.world.level.bounds.h - 90 };
    p.transform.vel = { x: 0, y: 0 };
    p.health.iframes = Math.max(p.health.iframes, 0.6); // brève grâce à l'entrée de la salle
    this.hadEnemies = this.world.enemies.length > 0;
    this.hadBoss = this.world.boss !== null;
    this.dialogue.hide();
    this.dialogueNpc = null;
    this.dialogueLocked = false;
    if (this.bossSprite) {
      this.bossSprite.destroy();
      this.bossSprite = undefined;
    }
    const lb = this.world.level.bounds;
    this.cameras.main.setBounds(0, 0, lb.w, lb.h);
    this.cameras.main.centerOn(p.transform.pos.x, p.transform.pos.y);
    this.syncAudioCounters(); // évite les SFX fantômes au changement de salle
    playMusic(this.musicContext());
    this.showBossIntro(); // salle de mini-boss du donjon
  }

  /** Salle nettoyée → ouvre les portes ; salle boss vaincue → coffre garanti + portail de sortie. */
  private updateDungeon(): void {
    if (!this.dungeon) return;
    const room = roomById(this.dungeon, this.currentRoomId);
    if (room.cleared) return;
    // salle puzzle : résolue quand toutes les plaques sont actives (pas d'ennemis à tuer)
    if (isPuzzleRoom(room)) {
      if (!puzzleResolved(this.world.plates)) return;
      room.cleared = true;
      playMusic(this.musicContext());
      for (const door of this.world.doors) door.open = true;
      for (const door of this.world.doors) {
        const nb = this.roomCache.get(door.to);
        if (nb) for (const nd of nb.doors) if (nd.to === this.currentRoomId) nd.open = true;
      }
      return;
    }
    if (this.world.enemies.length > 0 || this.world.boss !== null) return;
    room.cleared = true;
    playMusic(this.musicContext()); // salle (et mini-boss éventuel) vaincue → musique d'exploration
    for (const door of this.world.doors) door.open = true;
    for (const door of this.world.doors) {
      const nb = this.roomCache.get(door.to); // ouvre la porte réciproque des salles déjà générées
      if (nb) for (const nd of nb.doors) if (nd.to === this.currentRoomId) nd.open = true;
    }
    if (room.kind === "boss") {
      const lb = this.world.level.bounds;
      const ti = TIERS.indexOf(this.world.biome!.tier);
      this.world.chests.push({ id: 750, pos: { x: lb.w / 2, y: lb.h / 2 }, radius: 20, opened: false, rank: ti + 2 });
      this.world.exits.push({ id: 999, pos: { x: lb.w / 2, y: lb.h / 2 + 130 }, radius: 26 });
    }
  }

  private syncAudioCounters(): void {
    const p = this.world.player;
    this.prevHp = p.health.hp;
    this.prevLevel = p.level;
    this.prevOmganium = p.omganium;
    this.prevEnemies = this.world.enemies.length;
    this.prevWeapons = p.hotbar.slots.filter((s) => s && s.defId !== "fists").length;
  }

  /** Contexte musical courant (boss prioritaire, puis Nexus, sinon exploration). */
  private musicContext(): "boss" | "nexus" | "biome" {
    return this.world.boss ? "boss" : this.nexusMode ? "nexus" : "biome";
  }

  /** Joue les SFX déclenchés par les changements d'état/inputs de cette frame. */
  private playEventSfx(input: InputState): void {
    const p = this.world.player;
    if (input.attack && !this.prevAttack) playSfx("attack");
    this.prevAttack = input.attack;
    if (input.ability >= 0 && this.prevAbility < 0) {
      // ne sonne que si le lancement est possible (miroir des gardes de castAbility)
      const ua = abilityForSlot(p, input.ability);
      if (ua && (p.cooldowns[ua.ability.id] ?? 0) <= 0 && p.energy >= ua.ability.energyCost) playSfx("ability");
    }
    this.prevAbility = input.ability;
    // coups portés (exclut les dégâts subis — couverts par playerHurt — et le marqueur de mort de boss)
    if (this.world.events.some((ev) => ev.targetId !== p.id && ev.amount > 0)) playSfx("hit");
    if (p.health.hp < this.prevHp - 0.5) playSfx("playerHurt");
    if (p.level > this.prevLevel) playSfx("levelup");
    const weapons = p.hotbar.slots.filter((s) => s && s.defId !== "fists").length;
    if (p.omganium > this.prevOmganium || weapons > this.prevWeapons) playSfx("pickup");
    if (this.world.enemies.length < this.prevEnemies) playSfx("enemyDeath");
    this.prevHp = p.health.hp;
    this.prevLevel = p.level;
    this.prevOmganium = p.omganium;
    this.prevEnemies = this.world.enemies.length;
    this.prevWeapons = weapons;
  }

  /** Réinitialise l'affichage transitoire après un changement de salle (donjon/nexus). */
  private afterRoomSwap(): void {
    this.world.portalReached = null;
    this.world.events.length = 0;
    this.hadEnemies = this.world.enemies.length > 0;
    this.hadBoss = this.world.boss !== null;
    if (this.bossSprite) {
      this.bossSprite.destroy();
      this.bossSprite = undefined;
    }
    this.dialogue.hide();
    this.dialogueNpc = null;
    this.dialogueLocked = false;
    const lb = this.world.level.bounds;
    this.cameras.main.setBounds(0, 0, lb.w, lb.h);
    this.cameras.main.centerOn(this.world.player.transform.pos.x, this.world.player.transform.pos.y);
    this.syncAudioCounters();
    playMusic(this.musicContext());
    this.showBossIntro(); // salle de mini-boss du Nexus
  }

  private loadNexusHub(): void {
    this.nexusLevel = 0; // 0 = hub (this.inHub en dérive)
    this.world = generateNexusHub(getPlayer(), Math.random);
    this.world.godMode = this.flags.godMode;
    this.afterRoomSwap();
  }

  private loadNexusRoom(portal: Portal): void {
    this.nexusLevel = portal.kind === "boss" ? NEXUS_LEVELS : portal.danger; // niveau de difficulté
    this.world = generateNexusRoom(getPlayer(), portal, Math.random);
    this.world.godMode = this.flags.godMode;
    this.world.player.health.iframes = Math.max(this.world.player.health.iframes, 0.6);
    this.afterRoomSwap();
  }

  /** Salle de Nexus nettoyée → ouvre le retour (+ coffre garanti boss) ; record seulement si la salle avait un défi. */
  private updateNexus(): void {
    if (clearNexusRoom(this.world, this.inHub, this.hadBoss)) {
      if (this.hadEnemies || this.hadBoss) markNexusBest(this.nexusLevel); // pas de record pour le niveau 1 (vide)
      playMusic(this.musicContext()); // boss/salle vaincu → musique du Nexus
    }
  }

  /** Touche F : ouvre / fait avancer / ferme le dialogue avec le PNJ le plus proche. */
  private onInteract() {
    // verrou anti-réentrance (double-tap / même salve d'événements)
    const now = this.time.now;
    if (now - this.lastInteract < 150) return;
    this.lastInteract = now;

    if (this.dialogue.isOpen()) {
      if (this.dialogueLocked) {
        // bulle « … » → simple fermeture
        this.dialogue.hide();
        this.dialogueNpc = null;
        this.dialogueLocked = false;
        return;
      }
      const npc = this.dialogueNpc!;
      this.dialogueLine++;
      if (this.dialogueLine >= npc.lines.length) {
        npc.talked = true; // le vrai nom du PNJ s'affichera désormais
        this.dialogue.hide();
        this.dialogueNpc = null;
      } else {
        this.dialogue.show(this.npcLabel(npc), npc.lines[this.dialogueLine]);
      }
      return;
    }
    const p = this.world.player;
    let best: Npc | null = null;
    let bestD = Infinity;
    for (const npc of this.world.npcs) {
      const d = Math.hypot(npc.pos.x - p.transform.pos.x, npc.pos.y - p.transform.pos.y);
      if (d <= p.radius + npc.radius + 24 && d < bestD) {
        best = npc;
        bestD = d;
      }
    }
    if (!best) return;
    // PNJ de hub verrouillé → bulle « … », rien d'autre
    if (this.isNpcLocked(best)) {
      this.dialogueNpc = best;
      this.dialogueLocked = true;
      this.dialogue.show("???", "…");
      return;
    }
    // PNJ « Maître des Classes » → ouvre directement le menu de classe (pas de dialogue par-dessus)
    if (best.action === "shop") {
      this.shopMenu.openFor(this.world.player);
      return;
    }
    if (best.action === "classtree") {
      this.classMenu.openFor(this.world.player);
      this.dialogueNpc = null;
      return;
    }
    this.dialogueNpc = best;
    this.dialogueLine = 0;
    this.dialogueLocked = false;
    if (!best.role) markIdentified(this.biomeId); // PNJ de biome : la 1re réplique nomme le lieu
    this.runNpcAction(best); // soin / craft / respec pour les PNJ de hub
    this.dialogue.show(this.npcLabel(best), best.lines[0]);
  }

  /** Un PNJ de hub est verrouillé tant que son rang n'est pas atteint. */
  private isNpcLocked(npc: Npc): boolean {
    if (!npc.lockedRank) return false;
    if (npc.lockedRank === "omega") return !this.world.player.omegaUnlocked;
    return !hasClearedRank(npc.lockedRank);
  }

  /** Libellé affiché : PNJ de hub = « Nom · Rôle » ; PNJ de biome = nom (après dialogue) ou « ??? ». */
  private npcLabel(npc: Npc): string {
    if (npc.role) return `${npc.name} · ${npc.role}`;
    return npc.talked ? npc.name : "???";
  }

  /** Déclenche l'action d'un PNJ de hub (soin / craft) et donne un retour flottant. */
  private runNpcAction(npc: Npc): void {
    if (npc.action === "heal") {
      healFull(this.world.player, this.tuning.resources.maxEnergy);
      this.floatMsg("Soigné !", "#7dffb0");
    } else if (npc.action === "craft") {
      const res = craftOmega(this.world.player, this.world.rng);
      const msg: Record<string, string> = {
        ok: "✦ Arme transformée en Ω !",
        "no-weapon": "Aucune arme active",
        "already-omega": "Déjà une arme Ω",
        "not-s": "Arme de tier S requise",
        "no-omganium": "Omganium requis",
      };
      this.floatMsg(msg[res] ?? res, res === "ok" ? "#ff5ad0" : "#ffd0d0");
    } else if (npc.action === "respec") {
      const refunded = respec(this.world.player);
      this.floatMsg(refunded > 0 ? `Respec : +${refunded} pts rendus` : "Rien à réinitialiser", "#7dffb0");
    }
  }

  /** Petit texte flottant au-dessus du joueur (retour d'action PNJ). */
  private floatMsg(text: string, color: string): void {
    const p = this.world.player.transform.pos;
    const t = this.add.text(p.x, p.y - 36, text, { fontFamily: "monospace", fontSize: "14px", color, fontStyle: "bold" }).setOrigin(0.5).setDepth(46);
    this.tweens.add({ targets: t, y: p.y - 72, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  /** Mort du joueur : perte de 20% du stuff, écran de mort, puis respawn au Sanctuaire. */
  private onDeath() {
    this.dead = true;
    playSfx("death");
    const dropped = respawnPlayer(getPlayer(), Math.random);
    void saveToServer(); // persiste l'état APRÈS respawn (pertes d'objets prises en compte)
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x6a0000, 0.55).setScrollFactor(0).setDepth(60);
    this.add
      .text(w / 2, h / 2 - 20, "VOUS ÊTES MORT", {
        fontFamily: "monospace",
        fontSize: "32px",
        color: "#ff5d5d",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(61);
    this.add
      .text(
        w / 2,
        h / 2 + 26,
        dropped > 0 ? `${dropped} objet(s) perdu(s) — respawn au Sanctuaire...` : "Respawn au Sanctuaire...",
        { fontFamily: "monospace", fontSize: "15px", color: "#ffd0d0" },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(61);
    this.time.delayedCall(2000, () => this.scene.start("biome", { biomeId: "spawn" }));
  }

  /** Exécute une commande de chat « /xxx » et renvoie un message de retour. */
  private runCommand(raw: string): string {
    const parts = raw.slice(1).trim().split(/\s+/).filter(Boolean);
    const cmd = (parts[0] ?? "").toLowerCase();
    const args = parts.slice(1);
    const p = this.world.player;
    switch (cmd) {
      case "godmode":
        this.flags.godMode = !this.flags.godMode;
        return `Système: godmode ${this.flags.godMode ? "ON" : "OFF"}`;
      case "heal":
        healFull(p, this.tuning.resources.maxEnergy);
        return "Système: PV et énergie au maximum";
      case "kill": {
        const n = killAllEnemies(this.world);
        return `Système: ${n} ennemi(s) éliminé(s)`;
      }
      case "give": {
        const id = (args[0] ?? "").toLowerCase();
        const named = namedWeapon(id);
        if (!named && !WEAPONS.some((wp) => wp.id === id)) return `Système: arme inconnue « ${id || "?"} »`;
        const omega = isUltimateWeapon(id); // arme Ω unique : intrinsèquement Ω
        const tier = normalizeTier(args[1]) ?? named?.tier ?? "F"; // arme nommée : tier intrinsèque par défaut
        const slot = addWeapon(p.hotbar, { defId: id, tier, omega });
        if (slot < 0) return "Système: inventaire plein";
        selectSlot(p.hotbar, slot);
        if (omega) p.omegaUnlocked = true;
        return `Système: ${getWeaponDefEx(id).name} [${omega ? "Ω" : tier}] ajouté`;
      }
      case "tier": {
        const t = normalizeTier(args[0]);
        if (!t) return "Système: tier invalide (F E D C B A S)";
        const w = activeWeapon(p.hotbar);
        if (!w) return "Système: aucun objet actif";
        w.tier = t;
        return `Système: tier réglé sur ${t}`;
      }
      case "spawn": {
        const n = spawnChasers(this.world, parseInt(args[0] ?? "1", 10) || 1, this.world.biome?.tier ?? "F");
        this.hadEnemies = true;
        this.cleared = false;
        return `Système: ${n} ennemi(s) invoqué(s)`;
      }
      case "tp": {
        const ptr = this.input.activePointer;
        const world = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
        p.transform.pos = clampToBounds(v(world.x, world.y), p.radius, this.world.level.bounds);
        return "Système: téléporté au curseur";
      }
      case "craft": {
        const res = craftOmega(this.world.player, this.world.rng);
        if (res === "ok") {
          const w = activeWeapon(this.world.player.hotbar)!;
          return `Système: ✦ Arme transformée en Ω — ${OMEGA_MOD_LABEL[w.mod ?? "none"]}`;
        }
        const msg: Record<string, string> = {
          "no-weapon": "aucune arme active",
          "already-omega": "cette arme est déjà Ω",
          "not-s": "il faut une arme de tier S",
          "no-omganium": "pas assez d'Omganium (1 requis)",
        };
        return "Système: craft impossible — " + (msg[res] ?? res);
      }
      case "omganium": {
        const n = Math.max(1, parseInt(args[0] ?? "1", 10) || 1);
        this.world.player.omganium += n;
        return `Système: +${n} Omganium (total ${this.world.player.omganium})`;
      }
      case "armor": {
        if ((args[0] ?? "") === "uniques") {
          for (const u of UNIQUE_ARMORS) this.world.player.armorInv.push(makeUniqueArmor(this.world.nextId++, u));
          return `Système: ${UNIQUE_ARMORS.length} pièces uniques S ajoutées à l'inventaire (ouvre I pour équiper)`;
        }
        if ((args[0] ?? "") === "omega") {
          for (const u of OMEGA_ARMORS) this.world.player.armorInv.push(makeOmegaArmor(this.world.nextId++, u));
          this.world.player.omegaUnlocked = true;
          return `Système: ${OMEGA_ARMORS.length} pièces Ω uniques ajoutées (ouvre I pour équiper)`;
        }
        const set = (args[0] ?? "chaos") as OmegaSet;
        if (!OMEGA_SETS.includes(set)) return "Système: set inconnu (chaos/temps/neant/uniques/omega)";
        for (const slot of ARMOR_SLOTS) this.world.player.armorInv.push(makeArmor(this.world.nextId++, slot, "heavy", "S", set));
        return `Système: set Ω « ${set} » ajouté à l'inventaire (ouvre I pour équiper)`;
      }
      case "help":
        return "Système: " + COMMANDS.map((c) => "/" + c.name).join("  ");
      default:
        return `Système: commande inconnue « /${cmd} » (tape /help)`;
    }
  }

  update(_t: number, deltaMs: number) {
    this.chat.render();
    if (this.dialogue.isOpen() || this.dead || this.chat.isOpen() || this.equipMenu.isOpen() || this.statsMenu.isOpen() || this.classMenu.isOpen() || this.shopMenu.isOpen()) {
      this.wasPaused = true;
      return; // sim en pause
    }
    const dt = deltaMs / 1000;
    const input = this.inputMap.sample(this.cameras.main, this.world.player.transform.pos);
    if (this.wasPaused) {
      this.wasPaused = false;
      this.syncAudioCounters(); // l'état a pu changer en pause (achat/vente) → pas de SFX fantôme
      // 1re frame après une pause : neutralise toutes les actions one-shot (anti-fantôme)
      input.attack = false;
      input.dash = false;
      input.blink = false;
      input.ability = -1;
      input.selectSlot = -1;
      input.cycleTier = false;
      input.scroll = 0;
      input.pickup = false;
      input.drop = false;
    }
    this.world.godMode = this.flags.godMode;
    const ticks = this.fixed.advance(dt);
    for (let i = 0; i < ticks; i++) tickWorld(this.world, input, this.tuning, this.fixed.step);
    if (ticks > 0) this.playEventSfx(input); // SFX d'après simulation (events lus avant leur effacement au rendu)

    // mort du joueur → perte d'objets + respawn au Sanctuaire
    if (this.world.player.health.hp <= 0) {
      this.onDeath();
      return;
    }

    if (this.nexusMode) {
      this.updateNexus();
      if (this.world.portalReached !== null) {
        const id = this.world.portalReached;
        this.world.portalReached = null;
        const portal = this.world.portals.find((p) => p.id === id);
        if (portal) {
          if (portal.kind === "return") this.loadNexusHub();
          else this.loadNexusRoom(portal);
        }
        return; // salle changée
      }
    } else if (this.dungeonMode) {
      this.updateDungeon();
      if (this.world.doorReached !== null) {
        const to = this.world.doorReached;
        const door = this.world.doors.find((d) => d.to === to);
        this.world.doorReached = null;
        if (door) this.loadRoom(to, opposite(door.dir));
        return; // salle changée : on saute le rendu de cette frame
      }
    } else {
      // nettoyage du biome → débloque l'anneau suivant (boss vaincu, ou tous les ennemis vaincus)
      if (!this.cleared) {
        const done = this.hadBoss ? this.world.boss === null : this.hadEnemies && this.world.enemies.length === 0;
        if (done) {
          this.cleared = true;
          markCleared(this.biomeId);
          playMusic(this.musicContext()); // boss vaincu → retour à la musique d'exploration
        }
      }
      // entrée de donjon → lance le donjon de ce biome
      if (this.world.dungeonReached) {
        this.scene.start("biome", { biomeId: this.biomeId, dungeon: true });
        return;
      }
      // portail du Nexus (au Sanctuaire) → lance le Nexus Infini
      if (this.world.portalReached !== null) {
        this.scene.start("biome", { nexus: true });
        return;
      }
    }

    if (this.world.exitReached) {
      void saveToServer(); // sauvegarde en quittant vers la carte
      this.scene.start("worldmap");
      return;
    }

    for (const ev of this.world.events) spawnDamageText(this, ev.x, ev.y, ev.amount, ev.crit);
    this.world.events.length = 0;

    const biome = this.world.biome!;
    const lvl = this.world.level;
    this.gfx.clear();
    // sol (palette) + grille discrète
    this.gfx.fillStyle(biome.palette.ground, 1).fillRect(lvl.bounds.x, lvl.bounds.y, lvl.bounds.w, lvl.bounds.h);
    this.gfx.lineStyle(1, 0x000000, 0.08);
    for (let gx = 0; gx <= lvl.bounds.w; gx += 64) this.gfx.lineBetween(gx, 0, gx, lvl.bounds.h);
    for (let gy = 0; gy <= lvl.bounds.h; gy += 64) this.gfx.lineBetween(0, gy, lvl.bounds.w, gy);
    // zones de terrain (tranche K) : dessinées sous les murs/entités
    for (const z of this.world.terrain) {
      const col = z.kind === "lava" ? 0xff5a1f : z.kind === "poison" ? 0x7adf4a : z.kind === "ice" ? 0x9fd8ff : 0x8890a8;
      this.gfx.fillStyle(col, 0.45).fillRect(z.x, z.y, z.w, z.h);
      this.gfx.lineStyle(2, col, 0.8).strokeRect(z.x, z.y, z.w, z.h);
    }
    // plateforme de pierre du hub (Sanctuaire)
    if (this.biomeId === "spawn") {
      this.gfx.fillStyle(0x5a6072, 1).fillRect(100, 150, 800, 250);
      this.gfx.lineStyle(4, 0x3a3f4d, 1).strokeRect(100, 150, 800, 250);
    }
    // murs (palette)
    this.gfx.fillStyle(biome.palette.wall, 1);
    for (const wll of lvl.walls) this.gfx.fillRect(wll.x, wll.y, wll.w, wll.h);
    // sorties (portail accent ; scellée tant qu'un boss vit) + entrées de donjon (carrés sombres)
    const exitSealed = this.world.boss !== null;
    for (const ex of this.world.exits) {
      this.gfx.fillStyle(exitSealed ? 0x33333f : biome.palette.accent, exitSealed ? 0.55 : 0.9).fillCircle(ex.pos.x, ex.pos.y, ex.radius);
      this.gfx.lineStyle(3, exitSealed ? 0x6a6a7a : 0xffffff, 0.9).strokeCircle(ex.pos.x, ex.pos.y, ex.radius);
    }
    for (const dg of this.world.dungeonEntrances) {
      this.gfx.fillStyle(0x0a0a12, 0.92).fillRect(dg.pos.x - dg.radius, dg.pos.y - dg.radius, dg.radius * 2, dg.radius * 2);
      this.gfx.lineStyle(2, biome.palette.accent, 0.9).strokeRect(dg.pos.x - dg.radius, dg.pos.y - dg.radius, dg.radius * 2, dg.radius * 2);
    }
    // portes de donjon (verrouillées = grises ; ouvertes = accent) + coffres
    for (const door of this.world.doors) {
      const horiz = door.dir === "N" || door.dir === "S";
      const w0 = horiz ? 56 : 16;
      const h0 = horiz ? 16 : 56;
      this.gfx.fillStyle(door.open ? biome.palette.accent : 0x33333f, door.open ? 0.9 : 0.85).fillRect(door.pos.x - w0 / 2, door.pos.y - h0 / 2, w0, h0);
      this.gfx.lineStyle(2, door.open ? 0xffffff : 0x6a6a7a, 0.9).strokeRect(door.pos.x - w0 / 2, door.pos.y - h0 / 2, w0, h0);
    }
    for (const ch of this.world.chests) {
      this.gfx.fillStyle(ch.opened ? 0x6a5a2a : 0xffd24a, 0.95).fillRect(ch.pos.x - 12, ch.pos.y - 10, 24, 20);
      this.gfx.lineStyle(2, 0x3a2f10, 1).strokeRect(ch.pos.x - 12, ch.pos.y - 10, 24, 20);
    }
    // plaques de pression (salles puzzle, tranche L)
    for (const pl of this.world.plates) {
      this.gfx.fillStyle(pl.active ? 0x7dffb0 : biome.palette.accent, pl.active ? 0.85 : 0.55).fillCircle(pl.x, pl.y, pl.radius);
      this.gfx.lineStyle(2, pl.active ? 0xffffff : 0x000000, pl.active ? 0.9 : 0.5).strokeCircle(pl.x, pl.y, pl.radius);
      this.gfx.lineStyle(3, pl.active ? 0x2a6a4a : 0x000000, 0.8).lineBetween(pl.x - 7, pl.y, pl.x + 7, pl.y);
      this.gfx.lineBetween(pl.x, pl.y - 7, pl.x, pl.y + 7);
    }
    // pièges de salle (tranche L)
    for (const tr of this.world.roomTraps) {
      const col = tr.kind === "poison" ? 0x7adf4a : 0x8890a8;
      this.gfx.fillStyle(col, 0.4).fillCircle(tr.x, tr.y, tr.radius);
      this.gfx.lineStyle(2, col, 0.9).strokeCircle(tr.x, tr.y, tr.radius);
    }
    // portails (Nexus + entrée Nexus au Sanctuaire)
    const seenPortals = new Set<number>();
    for (const pr of this.world.portals) {
      seenPortals.add(pr.id);
      let col: number;
      let label: string;
      if (pr.kind === "return") {
        col = 0x4ad6ff;
        label = this.nexusMode ? "↩ Retour au hub" : "✦ NEXUS INFINI";
      } else if (pr.kind === "boss") {
        col = 0xff5d5d;
        label = "☠ BOSS";
      } else {
        col = pr.danger >= 6 ? 0xff5d5d : pr.danger >= 4 ? 0xffa64d : pr.danger >= 2 ? 0xffe066 : 0x7dffb0;
        label = `Niveau ${pr.danger} — ${NEXUS_LEVEL_LABEL[pr.danger]}`;
      }
      const a = pr.open ? 0.85 : 0.35;
      this.gfx.fillStyle(col, a).fillCircle(pr.pos.x, pr.pos.y, pr.radius);
      this.gfx.lineStyle(3, 0xffffff, pr.open ? 0.9 : 0.4).strokeCircle(pr.pos.x, pr.pos.y, pr.radius);
      let lbl = this.portalLabels.get(pr.id);
      if (!lbl) {
        lbl = this.add.text(0, 0, "", { fontFamily: "monospace", fontSize: "11px", color: "#eef", fontStyle: "bold" }).setOrigin(0.5).setDepth(4);
        this.portalLabels.set(pr.id, lbl);
      }
      lbl.setText(label).setPosition(pr.pos.x, pr.pos.y - pr.radius - 12).setVisible(true);
    }
    for (const [id, lbl] of this.portalLabels) {
      if (!seenPortals.has(id)) {
        lbl.destroy();
        this.portalLabels.delete(id);
      }
    }
    if (this.flags.showHitboxes) {
      this.gfx.lineStyle(1, 0x00ff88, 0.9);
      const p = this.world.player;
      this.gfx.strokeCircle(p.transform.pos.x, p.transform.pos.y, p.radius);
      for (const e of this.world.enemies) this.gfx.strokeCircle(e.transform.pos.x, e.transform.pos.y, e.radius);
    }

    // slash mêlée (arc de l'arme active)
    this.slashGfx.clear();
    const pl = this.world.player;
    const inst = activeWeapon(pl.hotbar);
    if (inst) {
      const rw = computeStats(getWeaponDefEx(inst.defId), inst.tier, inst.omega, inst.mod);
      if (rw.category === "melee") {
        const s = rw.attackSpeed;
        drawMeleeSlash(this.slashGfx, pl.transform.pos.x, pl.transform.pos.y, pl.melee, {
          damage: rw.atk,
          range: rw.range,
          arcDeg: rw.arcDeg,
          knockback: rw.knockback,
          windup: this.tuning.melee.windup / s,
          active: this.tuning.melee.active / s,
          recovery: this.tuning.melee.recovery / s,
          cadence: this.tuning.melee.cadence / s,
        });
      }
    }

    // armes au sol (drops inclus) — labels créés à la volée, couleur/marque Ω
    this.pickupGfx.clear();
    const seenPk = new Set<number>();
    for (const pk of this.world.pickups) {
      if (pk.taken) continue;
      seenPk.add(pk.id);
      const col = pk.omega ? 0xff5ad0 : weaponColor(pk.defId);
      this.pickupGfx.fillStyle(col, 0.9).fillCircle(pk.pos.x, pk.pos.y, pk.radius);
      this.pickupGfx.lineStyle(2, pk.omega ? 0xffe066 : 0xffffff, pk.omega ? 1 : 0.8).strokeCircle(pk.pos.x, pk.pos.y, pk.radius);
      let lbl = this.pickupLabels.get(pk.id);
      if (!lbl) {
        lbl = this.add
          .text(pk.pos.x, pk.pos.y, "", { fontFamily: "monospace", fontSize: "12px", color: "#0d0d18", fontStyle: "bold" })
          .setOrigin(0.5)
          .setDepth(4);
        this.pickupLabels.set(pk.id, lbl);
      }
      lbl.setText(pk.omega ? "Ω" : `${weaponAbbr(pk.defId)}${pk.tier}`).setPosition(pk.pos.x, pk.pos.y).setVisible(true);
    }
    // Omganium au sol (losange vert + ✦)
    for (const m of this.world.materials) {
      if (m.taken) continue;
      seenPk.add(m.id);
      this.pickupGfx.fillStyle(0x4dffc3, 0.95).fillCircle(m.pos.x, m.pos.y, m.radius);
      this.pickupGfx.lineStyle(2, 0x0a3a2c, 1).strokeCircle(m.pos.x, m.pos.y, m.radius);
      let lbl = this.pickupLabels.get(m.id);
      if (!lbl) {
        lbl = this.add
          .text(m.pos.x, m.pos.y, "✦", { fontFamily: "monospace", fontSize: "12px", color: "#0a3a2c", fontStyle: "bold" })
          .setOrigin(0.5)
          .setDepth(4);
        this.pickupLabels.set(m.id, lbl);
      }
      lbl.setPosition(m.pos.x, m.pos.y).setVisible(true);
    }
    for (const [id, lbl] of this.pickupLabels) {
      if (!seenPk.has(id)) {
        lbl.destroy();
        this.pickupLabels.delete(id);
      }
    }
    // alliés invoqués (cercles verts) + pièges (anneaux orange)
    for (const a of this.world.allies) {
      this.pickupGfx.fillStyle(0x6affa0, 0.9).fillCircle(a.pos.x, a.pos.y, a.radius);
      this.pickupGfx.lineStyle(2, 0x1a5a32, 1).strokeCircle(a.pos.x, a.pos.y, a.radius);
    }
    for (const tr of this.world.traps) {
      this.pickupGfx.lineStyle(2, 0xffa64d, 0.9).strokeCircle(tr.pos.x, tr.pos.y, tr.radius);
      this.pickupGfx.fillStyle(0xffa64d, 0.85).fillCircle(tr.pos.x, tr.pos.y, 6);
    }

    // prompt de ramassage : arme la plus proche à portée
    {
      const pp = this.world.player.transform.pos;
      let near: (typeof this.world.pickups)[number] | null = null;
      let nd = Infinity;
      for (const pk of this.world.pickups) {
        if (pk.taken) continue;
        const d = Math.hypot(pk.pos.x - pp.x, pk.pos.y - pp.y);
        if (d <= this.world.player.radius + pk.radius + 18 && d < nd) {
          nd = d;
          near = pk;
        }
      }
      if (near) {
        const full = !getPlayer().hotbar.slots.some((s) => s === null);
        const name = `${getWeaponDefEx(near.defId).name} [${near.omega ? "Ω" : near.tier}]`;
        this.pickupPrompt.setText(full ? "Inventaire plein — [X] jeter" : `[G] Ramasser ${name}`).setPosition(near.pos.x, near.pos.y - near.radius - 14).setVisible(true);
      } else {
        this.pickupPrompt.setVisible(false);
      }
    }

    // PNJ (marqueur + nom/rôle ; verrouillé = grisé « ??? » ; indice [F] à portée)
    this.npcGfx.clear();
    const ppos = this.world.player.transform.pos;
    this.world.npcs.forEach((npc, i) => {
      const locked = this.isNpcLocked(npc);
      this.npcGfx.fillStyle(locked ? 0x6a6a7a : 0xffe9a8, 0.95).fillCircle(npc.pos.x, npc.pos.y, npc.radius);
      this.npcGfx.lineStyle(2, locked ? 0x3a3a45 : 0x6a5a2a, 1).strokeCircle(npc.pos.x, npc.pos.y, npc.radius);
      const near = Math.hypot(npc.pos.x - ppos.x, npc.pos.y - ppos.y) <= this.world.player.radius + npc.radius + 24;
      let text: string;
      if (npc.role) {
        // verrouillé : juste « ??? » ; sinon nom seul, rôle complet à portée
        if (locked) text = "???";
        else text = near ? `${npc.name} · ${npc.role}` : npc.name;
      } else {
        text = npc.talked ? npc.name : "?";
      }
      const lbl = this.npcLabels[i];
      lbl.setText(near ? `${text}  [F]` : text);
      lbl.setPosition(npc.pos.x, npc.pos.y - npc.radius - 12);
    });

    // boss : sprite + télégraphes + barre de vie
    this.bossGfx.clear();
    const boss = this.world.boss;
    if (boss) {
      if (!this.bossSprite) this.bossSprite = this.add.image(0, 0, "enemy_boss").setDepth(6);
      this.bossSprite.setPosition(boss.transform.pos.x, boss.transform.pos.y).setVisible(true);
      this.bossSprite.setDisplaySize(boss.radius * 2, boss.radius * 2);
      this.bossSprite.setTint(boss.state === "weakness" ? 0xffd24a : 0xffffff);
      const tg = boss.telegraph;
      if (tg) {
        if (tg.kind === "aoe") {
          this.bossGfx.fillStyle(0xff3030, 0.15 + 0.25 * tg.progress).fillCircle(tg.x, tg.y, tg.radius);
          this.bossGfx.lineStyle(2, 0xff5d5d, 0.9).strokeCircle(tg.x, tg.y, tg.radius);
        } else if (tg.kind === "charge") {
          this.bossGfx
            .lineStyle(3, 0xff5d5d, 0.5 + 0.4 * tg.progress)
            .lineBetween(boss.transform.pos.x, boss.transform.pos.y, boss.transform.pos.x + tg.dirX * 320, boss.transform.pos.y + tg.dirY * 320);
        } else {
          this.bossGfx.lineStyle(3, 0xffd24a, 0.5 + 0.4 * tg.progress).strokeCircle(boss.transform.pos.x, boss.transform.pos.y, boss.radius + 8 + 6 * tg.progress);
        }
      }
      const bw = Math.min(520, this.scale.width - 80);
      const bx = (this.scale.width - bw) / 2;
      const by = 56;
      const frac = Math.max(0, boss.health.hp / boss.health.maxHp);
      this.bossBar.clear();
      this.bossBar.fillStyle(0x0d0d18, 0.85).fillRect(bx - 2, by - 2, bw + 4, 16);
      this.bossBar.fillStyle(0x6a0000, 1).fillRect(bx, by, bw, 12);
      this.bossBar.fillStyle(0xff4d4d, 1).fillRect(bx, by, bw * frac, 12);
      this.bossBar.setVisible(true);
      this.bossBarText.setText(`${boss.name}  —  phase ${boss.phaseIndex + 1}/${boss.phases.length}`).setPosition(this.scale.width / 2, by - 18).setVisible(true);
    } else {
      if (this.bossSprite) this.bossSprite.setVisible(false);
      this.bossBar.setVisible(false);
      this.bossBarText.setVisible(false);
    }

    this.sprites.sync(this.world);
    this.cameras.main.centerOn(pl.transform.pos.x, pl.transform.pos.y);
    this.hotbarBar.update(pl.hotbar);

    const act = activeWeapon(pl.hotbar);
    const actFx = act ? weaponEffects(act.defId) : [];
    const fxTxt = actFx.length > 0 ? ` · ${actFx.map((e) => EFFECT_LABEL[e.kind]).join(", ")}` : "";
    const wpn = act ? `${getWeaponDefEx(act.defId).name} [${act.omega ? "Ω" : act.tier}]${fxTxt}` : "(slot vide)";
    const fps = this.flags.showFps ? `  FPS:${Math.round(this.game.loop.actualFps)}` : "";
    const omg = `  ⦿Or:${pl.gold}${pl.omganium > 0 ? `  ✦Omg:${pl.omganium}` : ""}`;
    const classTxt = pl.class ? "" : pl.level >= CLASS_UNLOCK_LEVEL ? " — sans classe [K]" : ` — classe au niv ${CLASS_UNLOCK_LEVEL}`;
    const lvlTxt = `  Niv ${pl.level}${classTxt}${pl.statPoints > 0 ? ` (+${pl.statPoints} pts [P])` : ""}${pl.skillPoints > 0 && pl.class ? ` (+${pl.skillPoints} comp. [K])` : ""}`;
    // barre d'XP (bas de l'écran)
    const xpFrac = Math.max(0, Math.min(1, pl.xp / xpForNext(pl.level)));
    const sw = this.scale.width;
    this.xpBar.clear();
    this.xpBar.fillStyle(0x0d0d18, 0.85).fillRect(0, this.scale.height - 6, sw, 6);
    this.xpBar.fillStyle(0x4ad6ff, 1).fillRect(0, this.scale.height - 6, sw * xpFrac, 6);

    // barre de capacités (bas-droite : slots R/C/V/B + cooldown)
    this.abilityBar.clear();
    const asz = 40;
    const agap = 6;
    const ax0 = this.scale.width - 4 * (asz + agap) - 10;
    const ay = this.scale.height - asz - 16;
    for (let i = 0; i < 4; i++) {
      const ax = ax0 + i * (asz + agap);
      const ua = abilityForSlot(pl, i);
      this.abilityBar.fillStyle(0x0d0d18, 0.7).fillRect(ax, ay, asz, asz);
      this.abilityBar.lineStyle(1, 0x3a3a55, 1).strokeRect(ax, ay, asz, asz);
      const txt = this.abilityTexts[i];
      if (ua) {
        const cd = pl.cooldowns[ua.ability.id] ?? 0;
        const ready = cd <= 0 && pl.energy >= ua.ability.energyCost;
        if (cd > 0) {
          const frac = Math.min(1, cd / ua.ability.cooldown);
          this.abilityBar.fillStyle(0x000000, 0.55).fillRect(ax, ay + asz * (1 - frac), asz, asz * frac);
        }
        txt.setText(`${ABILITY_KEYS[i]}\n${cd > 0 ? Math.ceil(cd) : "●"}`).setColor(ready ? "#7dffb0" : "#8890a8");
      } else {
        txt.setText(ABILITY_KEYS[i]).setColor("#3a3a55");
      }
      txt.setPosition(ax + asz / 2, ay + asz / 2).setAlign("center").setVisible(true);
    }
    if (this.nexusMode) {
      const where = this.inHub ? "hub" : `niveau ${this.nexusLevel}`;
      const loc = this.inHub
        ? "choisis un niveau (1-7) ou le boss"
        : this.world.boss !== null
          ? "⚔ MINI-BOSS"
          : this.world.enemies.length > 0
            ? `ennemis: ${this.world.enemies.length}`
            : "✓ nettoyé — portail de retour ouvert";
      this.hud.setText(
        `Nexus Infini — ${where} (record niv. ${getNexusBest()})${lvlTxt}   PV ${Math.round(pl.health.hp)}/${pl.health.maxHp}   Arme: ${wpn}${omg}   ${loc}   (M=abandonner)${fps}`,
      );
    } else if (this.dungeonMode && this.dungeon) {
      const room = roomById(this.dungeon, this.currentRoomId);
      const total = this.dungeon.rooms.length;
      const done = this.dungeon.rooms.filter((r) => r.cleared).length;
      const platesLeft = this.world.plates.filter((p) => !p.active).length;
      const roomTag =
        this.world.boss !== null
          ? "  ⚔ MINI-BOSS"
          : isPuzzleRoom(room)
            ? platesLeft > 0
              ? `  plaques: ${this.world.plates.length - platesLeft}/${this.world.plates.length}`
              : "  ✓ énigme résolue"
            : this.world.enemies.length > 0
              ? `  ennemis: ${this.world.enemies.length}`
              : room.kind === "boss"
                ? "  ✓ Donjon terminé — portail ouvert"
                : "  ✓ salle nettoyée";
      const modName = getDungeonMod(this.world.modId ?? "")?.name;
      const modTxt = modName ? `   ☠ ${modName}` : "";
      this.hud.setText(
        `Donjon ${biome.name} [${biome.tier}]${lvlTxt}   PV ${Math.round(pl.health.hp)}/${pl.health.maxHp}   Arme: ${wpn}${omg}   Salles ${done}/${total} (prof. ${room.depth})${roomTag}${modTxt}${fps}`,
      );
    } else {
      const clr = this.cleared
        ? "  ✓ NETTOYÉ (anneau suivant débloqué)"
        : this.hadBoss && this.world.boss
          ? "  ⚔ BOSS"
          : this.hadEnemies
            ? `  ennemis: ${this.world.enemies.length}`
            : "";
      const evName = getWorldEvent(this.world.eventId ?? "")?.name;
      const evTxt = evName ? `   ⚡ ${evName}` : "";
      this.hud.setText(
        `${biome.name} [${biome.tier}]${lvlTxt}   PV ${Math.round(pl.health.hp)}/${pl.health.maxHp}   Arme: ${wpn}${omg}${evTxt}   (M=carte, I=équip, P=stats, K=classe, Entrée=chat)${clr}${fps}`,
      );
    }
  }
}
