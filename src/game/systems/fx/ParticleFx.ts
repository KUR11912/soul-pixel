import Phaser from 'phaser'

export class ParticleFx {
  static hit(scene: Phaser.Scene, x: number, y: number, count = 12): void {
    for (let i = 0; i < count; i += 1) {
      const p = scene.add.rectangle(x, y, 2, 2, 0xbbe8ff).setDepth(30)
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const dist = Phaser.Math.FloatBetween(18, 52)

      scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist + Phaser.Math.FloatBetween(6, 16),
        alpha: 0,
        duration: 220,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      })
    }
  }
}
