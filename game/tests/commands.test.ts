import { describe, it, expect } from "vitest";
import { matchCommands, COMMANDS } from "../src/core/commands";

describe("commands", () => {
  it("/god → suggère godmode", () => {
    const m = matchCommands("/god");
    expect(m.map((c) => c.name)).toEqual(["godmode"]);
  });
  it("/ → toutes les commandes", () => {
    expect(matchCommands("/").length).toBe(COMMANDS.length);
  });
  it("préfixe partagé → plusieurs suggestions", () => {
    const names = matchCommands("/g").map((c) => c.name);
    expect(names).toContain("godmode");
    expect(names).toContain("give");
  });
  it("inconnu → aucune suggestion ; sans slash → aucune", () => {
    expect(matchCommands("/zzz")).toEqual([]);
    expect(matchCommands("bonjour")).toEqual([]);
  });
  it("ignore les arguments après le 1er token", () => {
    expect(matchCommands("/give sword S").map((c) => c.name)).toEqual(["give"]);
  });
});
