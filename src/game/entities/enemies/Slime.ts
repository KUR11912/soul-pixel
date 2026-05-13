import type { Player } from '../player/Player'
import { EnemyBase } from './EnemyBase'

export class Slime extends EnemyBase {
  private readonly moveSpeed = 58
  private readonly chaseRange = 320
  private readonly stopRange = 18
  private currentAnimKey = ''

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy-slime', 3)
    this.y -= 16

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setSize(34, 30)
    body.setOffset(15, 14)

    if (scene.anims.exists('enemy-slime-idle')) {
      this.playAnim('enemy-slime-idle')
    }
  }

  updateAI(player: Player): void {
    if (this.dead || player.isDead()) return

    const body = this.body as Phaser.Physics.Arcade.Body
    const dx = player.x - this.x
    const dy = Math.abs(player.y - this.y)
    const onGround = body.blocked.down || body.touching.down

    // 只追 X，不改 Y（Y 交给重力）
    if (Math.abs(dx) <= this.chaseRange && dy <= 140) {
      if (Math.abs(dx) <= this.stopRange) body.setVelocityX(0)
      else body.setVelocityX(Math.sign(dx) * this.moveSpeed)
    } else {
      body.setVelocityX(0)
    }

    // 可选：撞墙时小跳，避免卡墙
    if (onGround && (body.blocked.left || body.blocked.right)) {
      body.setVelocityY(-260)
    }

    if (body.velocity.x > 0) this.setFlipX(false)
    if (body.velocity.x < 0) this.setFlipX(true)
    this.playAnim(Math.abs(body.velocity.x) > 1 ? 'enemy-slime-walk' : 'enemy-slime-idle')
  }

  private playAnim(key: string): void {
    if (!this.scene.anims.exists(key) || this.currentAnimKey === key) return
    this.currentAnimKey = key
    this.anims.play(key, true)
  }
}
