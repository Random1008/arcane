export interface CommandDef {
  name: string;
  usage: string;
  desc: string;
}

export const COMMANDS: CommandDef[] = [
  { name: "godmode", usage: "/godmode", desc: "(in)vulnérabilité" },
  { name: "heal", usage: "/heal", desc: "PV + énergie au max" },
  { name: "give", usage: "/give <arme> [tier]", desc: "ajoute une arme (id classique ou arme nommée du catalogue)" },
  { name: "tier", usage: "/tier <F-S>", desc: "change le tier de l'arme active" },
  { name: "kill", usage: "/kill", desc: "élimine tous les ennemis" },
  { name: "spawn", usage: "/spawn [n]", desc: "fait apparaître n ennemis" },
  { name: "tp", usage: "/tp", desc: "téléporte au curseur" },
  { name: "craft", usage: "/craft", desc: "transforme l'arme S active en arme Ω (coûte 1 Omganium)" },
  { name: "omganium", usage: "/omganium [n]", desc: "ajoute n Omganium (défaut 1)" },
  { name: "armor", usage: "/armor <chaos|temps|neant|uniques|omega>", desc: "ajoute un set Ω (ou les 7 uniques S, ou les 6 Ω uniques)" },
  { name: "help", usage: "/help", desc: "liste les commandes" },
];

/** Renvoie les commandes dont le nom commence par le 1er token tapé (après le « / »). */
export function matchCommands(input: string): CommandDef[] {
  if (!input.startsWith("/")) return [];
  const token = input.slice(1).split(/\s+/)[0].toLowerCase();
  return COMMANDS.filter((c) => c.name.startsWith(token));
}
