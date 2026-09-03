import { Vec2, sub, normalize } from "../math/vec2";

export const chaserMoveDir = (self: Vec2, target: Vec2): Vec2 => normalize(sub(target, self));
