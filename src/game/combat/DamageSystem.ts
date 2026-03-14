export interface DamageTarget {
  takeDamage(amount: number, sourceX: number): boolean
}

export class DamageSystem {
  static apply(target: DamageTarget, amount: number, sourceX: number): boolean {
    return target.takeDamage(amount, sourceX)
  }
}
