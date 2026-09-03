import { describe, it, expect } from "vitest";
import { HUB_NPCS } from "../src/core/hub";

describe("hub PNJ", () => {
  it("15 PNJ avec nom, rôle et au moins une réplique", () => {
    expect(HUB_NPCS.length).toBe(15);
    for (const n of HUB_NPCS) {
      expect(n.name.length).toBeGreaterThan(0);
      expect(n.role.length).toBeGreaterThan(0);
      expect(n.lines.length).toBeGreaterThanOrEqual(1);
    }
  });
  it("8 libres, 4 verrouillés S, 3 verrouillés Ω", () => {
    expect(HUB_NPCS.filter((n) => !n.lockedRank).length).toBe(8);
    expect(HUB_NPCS.filter((n) => n.lockedRank === "S").length).toBe(4);
    expect(HUB_NPCS.filter((n) => n.lockedRank === "omega").length).toBe(3);
  });
  it("actions heal et craft présentes", () => {
    expect(HUB_NPCS.some((n) => n.action === "heal")).toBe(true);
    expect(HUB_NPCS.some((n) => n.action === "craft")).toBe(true);
  });
});
