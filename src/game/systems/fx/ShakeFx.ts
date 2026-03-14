import Phaser from 'phaser'

export class ShakeFx {
  static hit(
    camera: Phaser.Cameras.Scene2D.Camera,
    durationMs = 120,
    intensity = 0.006,
  ): void {
    camera.shake(durationMs, intensity, true)
  }
}
