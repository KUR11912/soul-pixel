import Phaser from 'phaser'

export class IFrameSystem {
  private until = 0
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  start(durationMs: number): void {
    this.until = this.scene.time.now + durationMs
  }

  isActive(): boolean {
    return this.scene.time.now < this.until
  }

  clear(): void {
    this.until = 0
  }
}
