/**
 * Pont entre le panneau admin DOM (persistant) et la scène de jeu active, pour les actions qui
 * exigent la scène (spawn, Nexus). BiomeScene enregistre ses hooks au create() et les retire au shutdown.
 */
export interface AdminSceneHooks {
  spawnBoss(): string;
  spawnEnemies(n: number): string;
  killAll(): string;
  gotoNexus(): string;
  context(): { biome: string; nexus: boolean }; // pour le snapshot d'état envoyé à la console admin
}

let hooks: AdminSceneHooks | null = null;

export function setAdminHooks(h: AdminSceneHooks | null): void {
  hooks = h;
}

export function getAdminHooks(): AdminSceneHooks | null {
  return hooks;
}
