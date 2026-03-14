import Phaser from 'phaser'
import { IFrameSystem } from '../../combat/IFrameSystem'
import { KnockbackSystem } from '../../combat/KnockbackSystem'
import type { Player } from '../player/Player'

export abstract class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  protected hp: number
  private readonly iFrames: IFrameSystem
  private deadState = false

  protected constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    maxHp = 3,
  ) {
    super(scene, x, y, texture)
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.hp = maxHp
    this.iFrames = new IFrameSystem(scene)

    this.setDepth(5)
    this.setCollideWorldBounds(true)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setSize(14, 14)
    body.setOffset(1, 1)
    body.setAllowGravity(true)
    body.setGravityY(1400)
    body.setMaxVelocity(180, 900)
    body.setDragX(1200)
  }

  get dead(): boolean {
    return this.deadState
  }

  canTakeDamage(): boolean {
    return !this.deadState && !this.iFrames.isActive()
  }

  takeDamage(amount: number, sourceX: number): boolean {
    if (!this.canTakeDamage()) return false

    this.hp = Math.max(0, this.hp - amount)
    const body = this.body as Phaser.Physics.Arcade.Body
    KnockbackSystem.apply(body, sourceX, 150, 70)
    this.iFrames.start(220)

    if (this.hp <= 0) {
      this.deadState = true
      body.enable = false
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 240,
        onComplete: () => this.destroy(),
      })
    }

    return true
  }

  abstract updateAI(player: Player): void
}
