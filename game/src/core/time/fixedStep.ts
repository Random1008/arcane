export class FixedStep {
  private acc = 0;

  constructor(public readonly step: number, private readonly maxTicks = 5) {}

  /** Ajoute le delta (s) et renvoie le nombre de ticks fixes à exécuter. */
  advance(deltaSeconds: number): number {
    this.acc += deltaSeconds;
    let ticks = 0;
    while (this.acc >= this.step && ticks < this.maxTicks) {
      this.acc -= this.step;
      ticks++;
    }
    if (ticks >= this.maxTicks) this.acc = 0; // anti-spirale de la mort
    return ticks;
  }
}
