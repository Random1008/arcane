import Phaser from "phaser";
import { InputState } from "../../core/world";
import { Vec2, v } from "../../core/math/vec2";

export class InputMap {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private blinkDown = false;
  private blinkPressed = false;
  private tierDown = false;
  private pointerMoved = false;
  private lastAim?: Vec2;
  private wheelAccum = 0;
  private abilityDown = [false, false, false, false];
  private pickupDown = false;
  private dropDown = false;

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys(
      "W,A,S,D,Z,Q,UP,LEFT,DOWN,RIGHT,SPACE,E,T,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE,R,C,V,B,G,X",
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    scene.input.mouse?.disableContextMenu();
    scene.input.on("pointermove", () => {
      this.pointerMoved = true;
    });
    scene.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.wheelAccum += dy;
    });
  }

  sample(cam: Phaser.Cameras.Scene2D.Camera, fallback: Vec2): InputState {
    const k = this.keys;
    const left = k.A.isDown || k.Q.isDown || k.LEFT.isDown;
    const right = k.D.isDown || k.RIGHT.isDown;
    const up = k.W.isDown || k.Z.isDown || k.UP.isDown;
    const down = k.S.isDown || k.DOWN.isDown;
    const moveDir = v((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));

    const ptr = this.scene.input.activePointer;
    if (this.pointerMoved) {
      const world = cam.getWorldPoint(ptr.x, ptr.y);
      this.lastAim = v(world.x, world.y);
    }
    const aimPoint = this.lastAim ?? v(fallback.x + 1, fallback.y);

    // sélection de slot via touches 1..9
    const numKeys = [k.ONE, k.TWO, k.THREE, k.FOUR, k.FIVE, k.SIX, k.SEVEN, k.EIGHT, k.NINE];
    let selectSlot = -1;
    for (let i = 0; i < numKeys.length; i++) {
      if (numKeys[i].isDown) {
        selectSlot = i;
        break;
      }
    }

    // molette → -1 / 0 / +1
    const scroll = this.wheelAccum > 0 ? 1 : this.wheelAccum < 0 ? -1 : 0;
    this.wheelAccum = 0;

    // E et T à front montant
    const eDown = k.E.isDown;
    this.blinkPressed = eDown && !this.blinkDown;
    this.blinkDown = eDown;
    const tDown = k.T.isDown;
    const cycleTier = tDown && !this.tierDown;
    this.tierDown = tDown;

    // capacités R/C/V/B → slot 0..3 (front montant, une par frame)
    const abilityKeys = [k.R, k.C, k.V, k.B];
    let ability = -1;
    for (let i = 0; i < abilityKeys.length; i++) {
      const down = abilityKeys[i].isDown;
      if (down && !this.abilityDown[i] && ability === -1) ability = i;
      this.abilityDown[i] = down;
    }

    // ramasser (G) / jeter (X) à front montant
    const gDown = k.G.isDown;
    const pickup = gDown && !this.pickupDown;
    this.pickupDown = gDown;
    const xDown = k.X.isDown;
    const drop = xDown && !this.dropDown;
    this.dropDown = xDown;

    return {
      moveDir,
      aimPoint,
      attack: ptr.leftButtonDown(),
      dash: k.SPACE.isDown,
      blink: this.blinkPressed,
      selectSlot,
      scroll,
      cycleTier,
      ability,
      pickup,
      drop,
    };
  }
}
