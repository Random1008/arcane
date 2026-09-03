import { describe, it, expect } from "vitest";
import { REF_GROUPS, COMMANDS_DOC } from "../src/admin/refdata";

describe("refdata (page IDs de référence)", () => {
  it("aucun groupe vide, ids uniques dans chaque groupe", () => {
    expect(REF_GROUPS.length).toBeGreaterThanOrEqual(15);
    for (const g of REF_GROUPS) {
      expect(g.rows.length, g.title).toBeGreaterThan(0);
      const ids = g.rows.map((r) => r.id);
      expect(new Set(ids).size, `${g.title} : ids dupliqués`).toBe(ids.length);
      for (const r of g.rows) expect(r.info.length, `${g.title}/${r.id}`).toBeGreaterThan(0);
    }
  });

  it("couvre toutes les pièces d'armure (18 normales + 18 Ω) et les 6 arbres (71 nœuds)", () => {
    const by = (t: string) => REF_GROUPS.find((g) => g.title === t)!.rows;
    expect(by("Armures — pièces (emplacement × type)").length).toBe(6 * 3);
    expect(by("Armures — pièces de set Ω").length).toBe(6 * 3);
    expect(by("Nœuds d'arbre de compétences").length).toBe(71); // 53 + 18 (3 nouvelles capacités × 6 classes)
    expect(by("Ennemis nommés (par biome)").length).toBeGreaterThanOrEqual(49 * 2); // ≥2 types par biome
    expect(by("Armes").every((r) => r.info.includes("ATK"))).toBe(true); // stats visibles
  });

  it("doc des commandes non vide et catégorisée", () => {
    expect(COMMANDS_DOC.length).toBeGreaterThanOrEqual(20);
    for (const c of COMMANDS_DOC) {
      expect(c.cat.length).toBeGreaterThan(0);
      expect(c.effet.length).toBeGreaterThan(0);
    }
  });
});
