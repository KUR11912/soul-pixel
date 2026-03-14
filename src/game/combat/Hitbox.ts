import Phaser from 'phaser'

export class Hitbox extends Phaser.GameObjects.Zone {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    lifeMs = 90,
  ) {
    super(scene, x, y, width, height)
    scene.add.existing(this)
    scene.physics.add.existing(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setImmovable(true)
    body.setSize(width, height)

    scene.time.delayedCall(lifeMs, () => this.destroy())
  }
}
