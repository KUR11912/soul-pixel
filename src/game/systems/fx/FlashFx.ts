import Phaser from 'phaser'

export class FlashFx {
  static hit(
    target: Phaser.GameObjects.Sprite,
    durationMs = 90,
    color = 0xffffff,
  ): void {
    target.setTintFill(color)
    target.scene.time.delayedCall(durationMs, () => target.clearTint())
  }
}
