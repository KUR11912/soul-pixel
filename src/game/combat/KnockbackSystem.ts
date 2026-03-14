import Phaser from 'phaser'

export class KnockbackSystem {
  static apply(
    body: Phaser.Physics.Arcade.Body,
    sourceX: number,
    powerX = 200,
    powerY = 80,
  ): void {
    const dir = body.center.x >= sourceX ? 1 : -1
    body.setVelocity(dir * powerX, -powerY)
  }
}
