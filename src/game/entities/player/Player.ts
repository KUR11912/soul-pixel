import Phaser from 'phaser'
import { Hitbox } from '../../combat/Hitbox'
import { IFrameSystem } from '../../combat/IFrameSystem'
import { KnockbackSystem } from '../../combat/KnockbackSystem'

export type WasdKeys = {
  W: Phaser.Input.Keyboard.Key
  A: Phaser.Input.Keyboard.Key
  S: Phaser.Input.Keyboard.Key
  D: Phaser.Input.Keyboard.Key
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly moveSpeed = 210
  private readonly jumpVelocity = -460
  private readonly secondJumpVelocity = -430
  private readonly maxAirJumps = 1
  private airJumpsLeft = this.maxAirJumps

  private readonly wallStickTimeMs = 170
  private readonly wallCoyoteMs = 140
  private readonly wallSlideSpeed = 120
  private readonly wallJumpVelocityY = -450
  private readonly wallJumpVelocityX = 280
  private readonly wallJumpMoveLockMs = 110
  private wallStickUntil = -99999
  private lastWallAt = -99999
  private wallSide: -1 | 0 | 1 = 0
  private moveLockUntil = -99999

  private readonly gravityY = 1400
  private readonly maxFallSpeed = 900
  private readonly extraFallAccel = 1400

  private readonly coyoteTimeMs = 100
  private readonly jumpBufferMs = 120
  private readonly jumpCutFactor = 0.52
  private lastGroundedAt = -99999
  private lastJumpPressedAt = -99999

  private readonly maxHp = 5
  private hp = this.maxHp
  private facing: 1 | -1 = 1
  private nextAttackAt = 0
  private readonly attackCooldownMs = 260
  private readonly attackLifeMs = 100
  private readonly iFrames: IFrameSystem
  private deadState = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player')
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.iFrames = new IFrameSystem(scene)

    this.setOrigin(0.5, 0.5)
    this.setCollideWorldBounds(true)
    this.setDepth(5)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setSize(12, 22)
    body.setOffset(2, 2)
    body.setGravityY(this.gravityY)
    body.setMaxVelocity(260, this.maxFallSpeed)
  }

  getHp(): number {
    return this.hp
  }

  getMaxHp(): number {
    return this.maxHp
  }

  isDead(): boolean {
    return this.deadState
  }

  canTakeDamage(): boolean {
    return !this.deadState && !this.iFrames.isActive()
  }

  update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: WasdKeys,
    jumpKey: Phaser.Input.Keyboard.Key,
    deltaMs: number,
  ): void {
    if (this.deadState) {
      this.setVelocityX(0)
      return
    }

    const body = this.body as Phaser.Physics.Arcade.Body
    const now = this.scene.time.now
    const dt = deltaMs / 1000

    const left = cursors.left.isDown || wasd.A.isDown
    const right = cursors.right.isDown || wasd.D.isDown
    const moveX = (left ? -1 : 0) + (right ? 1 : 0)

    const onGround = body.blocked.down || body.touching.down
    if (onGround) {
      this.lastGroundedAt = now
      this.airJumpsLeft = this.maxAirJumps
      this.wallStickUntil = -99999
      this.lastWallAt = -99999
      this.wallSide = 0
    }

    // 墙体判定加入 wasTouching，提升“贴边”时的吸附命中率
    const touchingLeft = body.blocked.left || body.touching.left || body.wasTouching.left
    const touchingRight = body.blocked.right || body.touching.right || body.wasTouching.right
    const touchingWall = !onGround && (touchingLeft || touchingRight)

    if (touchingWall) {
      this.wallSide = touchingLeft ? -1 : 1
      this.lastWallAt = now

      const pressingTowardWall =
        (this.wallSide === -1 && left) || (this.wallSide === 1 && right)

      if (pressingTowardWall && body.velocity.y >= 0) {
        this.wallStickUntil = now + this.wallStickTimeMs
      }
    }

    const wallRecent = !onGround && now - this.lastWallAt <= this.wallCoyoteMs
    const wallSticking = wallRecent && now <= this.wallStickUntil

    if (now >= this.moveLockUntil) {
      this.setVelocityX(moveX * this.moveSpeed)
    }

    if (moveX > 0) this.facing = 1
    if (moveX < 0) this.facing = -1
    this.setFlipX(this.facing < 0)

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(cursors.up) ||
      Phaser.Input.Keyboard.JustDown(wasd.W) ||
      Phaser.Input.Keyboard.JustDown(jumpKey)

    if (jumpPressed) this.lastJumpPressedAt = now

    const canGroundJump =
      now - this.lastJumpPressedAt <= this.jumpBufferMs &&
      now - this.lastGroundedAt <= this.coyoteTimeMs

    if (canGroundJump) {
      this.setVelocityY(this.jumpVelocity)
      this.lastJumpPressedAt = -99999
      this.lastGroundedAt = -99999
    } else if (jumpPressed && wallRecent && this.wallSide !== 0) {
      const pushDir: 1 | -1 = this.wallSide === -1 ? 1 : -1
      this.setVelocityX(pushDir * this.wallJumpVelocityX)
      this.setVelocityY(this.wallJumpVelocityY)
      this.facing = pushDir
      this.setFlipX(this.facing < 0)

      this.moveLockUntil = now + this.wallJumpMoveLockMs
      this.wallStickUntil = -99999
      this.lastJumpPressedAt = -99999
      this.lastGroundedAt = -99999

      // 蹭墙跳后给回 1 次空中跳，手感更稳
      this.airJumpsLeft = this.maxAirJumps
    } else if (jumpPressed && !onGround && this.airJumpsLeft > 0) {
      this.airJumpsLeft -= 1
      this.setVelocityY(this.secondJumpVelocity)
      this.lastJumpPressedAt = -99999
    }

    const jumpReleased =
      Phaser.Input.Keyboard.JustUp(cursors.up) ||
      Phaser.Input.Keyboard.JustUp(wasd.W) ||
      Phaser.Input.Keyboard.JustUp(jumpKey)

    if (jumpReleased && body.velocity.y < 0) {
      this.setVelocityY(body.velocity.y * this.jumpCutFactor)
    }

    if (wallSticking && body.velocity.y > this.wallSlideSpeed) {
      this.setVelocityY(this.wallSlideSpeed)
    }

    if (body.velocity.y > 0) {
      if (wallSticking) {
        this.setVelocityY(Math.min(body.velocity.y, this.wallSlideSpeed))
      } else {
        const boosted = body.velocity.y + this.extraFallAccel * dt
        this.setVelocityY(Math.min(this.maxFallSpeed, boosted))
      }
    }
  }

  tryAttack(): Hitbox | null {
    if (this.deadState) return null
    const now = this.scene.time.now
    if (now < this.nextAttackAt) return null

    this.nextAttackAt = now + this.attackCooldownMs
    return new Hitbox(
      this.scene,
      this.x + this.facing * 18,
      this.y - 2,
      24,
      20,
      this.attackLifeMs,
    )
  }

  takeDamage(amount: number, sourceX: number): boolean {
    if (!this.canTakeDamage()) return false

    this.hp = Math.max(0, this.hp - amount)
    const body = this.body as Phaser.Physics.Arcade.Body
    KnockbackSystem.apply(body, sourceX, 240, 110)
    this.iFrames.start(420)

    if (this.hp <= 0) {
      this.deadState = true
      this.setTint(0x334155)
      this.setVelocityX(0)
    }

    return true
  }

  respawn(x: number, y: number): void {
    this.deadState = false
    this.hp = this.maxHp
    this.airJumpsLeft = this.maxAirJumps
    this.iFrames.clear()
    this.clearTint()
    this.setPosition(x, y)
    this.setVelocity(0, 0)
    this.lastGroundedAt = this.scene.time.now
    this.lastJumpPressedAt = -99999
    this.wallStickUntil = -99999
    this.lastWallAt = -99999
    this.wallSide = 0
    this.moveLockUntil = -99999
  }
}
