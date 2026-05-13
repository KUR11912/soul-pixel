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

export type PlayerShot = {
  kind: 'shot'
  x: number
  y: number
  dir: 1 | -1
  range: number
  width: number
  lifeMs: number
  damage: number
  weapon: PlayerWeapon
}

export type PlayerGrenadeThrow = {
  kind: 'grenade'
  x: number
  y: number
  dir: 1 | -1
  range: number
  radius: number
  damage: number
  flightMs: number
  weapon: 'grenade'
}

export type PlayerAttackAction = PlayerShot | PlayerGrenadeThrow

export type PlayerWeapon = 'pistol' | 'rifle' | 'grenade'

export type PlayerAmmoState = {
  weapon: PlayerWeapon | null
  pistolAmmo: number
  pistolMagazineSize: number
  rifleAmmo: number
  rifleMagazineSize: number
  reloadingWeapon: 'pistol' | 'rifle' | null
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
  private equippedWeapon: PlayerWeapon | null = null
  private equippingUntil = -99999
  private readonly equipAnimMs = 500
  private nextAttackAt = 0
  private readonly attackCooldownMs = 260
  private readonly attackLifeMs = 100
  private nextShootAt = 0
  private shootingUntil = -99999
  private readonly shootCooldownMs = 480
  private readonly shootAnimMs = 360
  private readonly shootRangePx = 260
  private readonly shootWidthPx = 16
  private readonly pistolMagazineSize = 6
  private pistolAmmo = this.pistolMagazineSize
  private nextRifleShootAt = 0
  private readonly rifleShootCooldownMs = 720
  private readonly rifleShootAnimMs = 390
  private readonly rifleShootRangePx = 420
  private readonly rifleShootWidthPx = 14
  private readonly rifleMagazineSize = 5
  private rifleAmmo = this.rifleMagazineSize
  private readonly pistolReloadAnimMs = 620
  private readonly rifleReloadAnimMs = 620
  private reloadingWeapon: 'pistol' | 'rifle' | null = null
  private reloadingUntil = -99999
  private nextGrenadeThrowAt = 0
  private readonly grenadeThrowCooldownMs = 1150
  private readonly grenadeThrowAnimMs = 520
  private readonly grenadeThrowRangePx = 150
  private readonly grenadeBlastRadiusPx = 62
  private readonly grenadeFlightMs = 520
  private readonly iFrames: IFrameSystem
  private deadState = false

  private readonly dodgeDistancePx = 168
  private readonly dodgeDurationMs = 850
  private readonly dodgeSpeed = Math.round((this.dodgeDistancePx / this.dodgeDurationMs) * 1000)
  private readonly dodgeCooldownMs = 700
  private readonly dodgeIFrameMs = 850
  private readonly dodgeTrailIntervalMs = 40
  private dodgeUntil = -99999
  private nextDodgeAt = 0
  private dodgeDir: 1 | -1 = 1
  private nextTrailAt = 0
  private currentAnimKey = ''
  private bodyHitW = 19
  private bodyHitH = 34
  private normalBodyOffsetX = 16
  private normalBodyOffsetY = 42
  private shootBodyOffsetX = 38
  private rifleShootBodyOffsetX = 54
  private weaponIdleBodyOffsetX = 54

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player')
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.iFrames = new IFrameSystem(scene)

    this.setOrigin(0.5, 0.5)
    this.setCollideWorldBounds(true)
    this.setDepth(5)

    const body = this.body as Phaser.Physics.Arcade.Body
    // Keep collision compact around lower body and adapt to sprite-frame size.
    const frameW = this.frame?.realWidth ?? 50
    const frameH = this.frame?.realHeight ?? 80
    const hitW = Math.max(12, Math.round(frameW * 0.38))
    const hitH = Math.max(28, Math.round(frameH * 0.42))
    const offsetX = Math.round((frameW - hitW) * 0.5)
    const offsetY = Math.round(frameH - hitH - 4)
    this.bodyHitW = hitW
    this.bodyHitH = hitH
    this.normalBodyOffsetX = offsetX
    this.normalBodyOffsetY = offsetY
    this.shootBodyOffsetX = Math.round((96 - hitW) * 0.5)
    this.rifleShootBodyOffsetX = Math.round((128 - hitW) * 0.5)
    this.weaponIdleBodyOffsetX = Math.round((128 - hitW) * 0.5)
    body.setSize(hitW, hitH)
    body.setOffset(offsetX, offsetY)
    body.setGravityY(this.gravityY)
    body.setMaxVelocity(260, this.maxFallSpeed)

    if (scene.anims.exists('player-idle')) {
      this.playAnim('player-idle')
    }
    this.syncAmmoState()
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

  isDodging(): boolean {
    return !this.deadState && this.scene.time.now < this.dodgeUntil
  }

  getAmmoState(): PlayerAmmoState {
    return {
      weapon: this.equippedWeapon,
      pistolAmmo: this.pistolAmmo,
      pistolMagazineSize: this.pistolMagazineSize,
      rifleAmmo: this.rifleAmmo,
      rifleMagazineSize: this.rifleMagazineSize,
      reloadingWeapon: this.reloadingWeapon,
    }
  }

  update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: WasdKeys,
    jumpKey: Phaser.Input.Keyboard.Key,
    dodgeKey: Phaser.Input.Keyboard.Key,
    deltaMs: number,
  ): void {
    if (this.deadState) {
      this.setVelocityX(0)
      this.anims.stop()
      return
    }

    const body = this.body as Phaser.Physics.Arcade.Body
    const now = this.scene.time.now
    const dt = deltaMs / 1000
    this.finishReloadIfNeeded(now)

    const left = cursors.left.isDown || wasd.A.isDown
    const right = cursors.right.isDown || wasd.D.isDown
    const moveX = (left ? -1 : 0) + (right ? 1 : 0)
    const dodgePressed = Phaser.Input.Keyboard.JustDown(dodgeKey)

    if (dodgePressed && now >= this.nextDodgeAt && now >= this.dodgeUntil) {
      const dashDir = moveX !== 0 ? (moveX > 0 ? 1 : -1) : this.facing
      this.startDodge(dashDir, now)
    }

    if (now < this.dodgeUntil) {
      this.setVelocityX(this.dodgeDir * this.dodgeSpeed)
      this.setFlipX(this.dodgeDir < 0)
      this.facing = this.dodgeDir
      this.emitDodgeTrail(now)
      if (this.currentAnimKey !== 'player-dodge') {
        this.playAnim('player-dodge')
      }
      return
    }

    const onGround = body.blocked.down || body.touching.down
    if (onGround) {
      this.lastGroundedAt = now
      this.airJumpsLeft = this.maxAirJumps
      this.wallStickUntil = -99999
      this.lastWallAt = -99999
      this.wallSide = 0
    }

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

    this.updateAnimationState(moveX, onGround)
  }

  private startDodge(dir: 1 | -1, now: number): void {
    this.dodgeDir = dir
    this.dodgeUntil = now + this.dodgeDurationMs
    this.nextDodgeAt = now + this.dodgeCooldownMs
    this.nextTrailAt = now
    this.iFrames.start(this.dodgeIFrameMs)
  }

  private emitDodgeTrail(now: number): void {
    if (now < this.nextTrailAt) return
    this.nextTrailAt = now + this.dodgeTrailIntervalMs

    const frame = this.frame?.name ?? 0
    const ghost = this.scene.add
      .sprite(this.x, this.y, 'player', frame)
      .setDepth(this.depth - 1)
      .setAlpha(0.35)
      .setTint(0xbfe8ff)
      .setFlipX(this.flipX)

    ghost.setScale(this.scaleX, this.scaleY)

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 180,
      onComplete: () => ghost.destroy(),
    })
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

  equipPistol(): void {
    this.finishReloadIfNeeded()
    if (this.deadState || this.isDodging() || this.isReloading()) return
    this.equippedWeapon = 'pistol'
    this.equippingUntil = this.scene.time.now + this.equipAnimMs
    this.playAnim('player-pistol-equip', true)
    this.syncAmmoState()
  }

  equipRifle(): void {
    this.finishReloadIfNeeded()
    if (this.deadState || this.isDodging() || this.isReloading()) return
    this.equippedWeapon = 'rifle'
    this.equippingUntil = this.scene.time.now + this.equipAnimMs
    this.playAnim('player-rifle-equip', true)
    this.syncAmmoState()
  }

  equipGrenade(): void {
    this.finishReloadIfNeeded()
    if (this.deadState || this.isDodging() || this.isReloading()) return
    this.equippedWeapon = 'grenade'
    this.equippingUntil = this.scene.time.now + this.equipAnimMs
    this.playAnim('player-grenade-equip', true)
    this.syncAmmoState()
  }

  tryShootEquipped(): PlayerAttackAction | null {
    this.finishReloadIfNeeded()
    if (this.isReloading()) return null
    if (this.equippedWeapon === 'pistol') return this.tryShoot()
    if (this.equippedWeapon === 'rifle') return this.tryRifleShoot()
    if (this.equippedWeapon === 'grenade') return this.tryGrenadeThrow()
    return null
  }

  tryShoot(): PlayerShot | null {
    if (this.deadState || this.isDodging()) return null

    const now = this.scene.time.now
    this.finishReloadIfNeeded(now)
    if (this.isReloading()) return null
    if (now < this.nextShootAt) return null
    if (this.pistolAmmo <= 0) {
      this.startReload('pistol', now)
      return null
    }

    this.nextShootAt = now + this.shootCooldownMs
    this.shootingUntil = now + this.shootAnimMs
    this.pistolAmmo -= 1
    this.playAnim('player-shoot', true)
    this.syncAmmoState()

    return {
      kind: 'shot',
      x: this.x + this.facing * 34,
      y: this.y - 2,
      dir: this.facing,
      range: this.shootRangePx,
      width: this.shootWidthPx,
      lifeMs: 70,
      damage: 1,
      weapon: 'pistol',
    }
  }

  tryRifleShoot(): PlayerShot | null {
    if (this.deadState || this.isDodging()) return null

    const now = this.scene.time.now
    this.finishReloadIfNeeded(now)
    if (this.isReloading()) return null
    if (now < this.nextRifleShootAt) return null
    if (this.rifleAmmo <= 0) {
      this.startReload('rifle', now)
      return null
    }

    this.nextRifleShootAt = now + this.rifleShootCooldownMs
    this.shootingUntil = now + this.rifleShootAnimMs
    this.rifleAmmo -= 1
    this.playAnim('player-rifle-shoot', true)
    this.syncAmmoState()

    return {
      kind: 'shot',
      x: this.x + this.facing * 46,
      y: this.y - 2,
      dir: this.facing,
      range: this.rifleShootRangePx,
      width: this.rifleShootWidthPx,
      lifeMs: 90,
      damage: 2,
      weapon: 'rifle',
    }
  }

  tryGrenadeThrow(): PlayerGrenadeThrow | null {
    if (this.deadState || this.isDodging()) return null

    const now = this.scene.time.now
    if (now < this.nextGrenadeThrowAt) return null

    this.nextGrenadeThrowAt = now + this.grenadeThrowCooldownMs
    this.shootingUntil = now + this.grenadeThrowAnimMs
    this.playAnim('player-grenade-throw', true)

    return {
      kind: 'grenade',
      x: this.x + this.facing * 24,
      y: this.y - 22,
      dir: this.facing,
      range: this.grenadeThrowRangePx,
      radius: this.grenadeBlastRadiusPx,
      damage: 3,
      flightMs: this.grenadeFlightMs,
      weapon: 'grenade',
    }
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
    this.dodgeUntil = -99999
    this.nextDodgeAt = 0
    this.nextTrailAt = 0
    this.nextShootAt = 0
    this.nextRifleShootAt = 0
    this.nextGrenadeThrowAt = 0
    this.shootingUntil = -99999
    this.equippedWeapon = null
    this.equippingUntil = -99999
    this.pistolAmmo = this.pistolMagazineSize
    this.rifleAmmo = this.rifleMagazineSize
    this.reloadingWeapon = null
    this.reloadingUntil = -99999
    this.playAnim('player-idle')
    this.syncAmmoState()
  }

  private updateAnimationState(moveX: number, onGround: boolean): void {
    if (!this.anims || !this.texture) return

    const now = this.scene.time.now
    if (now < this.shootingUntil || now < this.equippingUntil || now < this.reloadingUntil) {
      return
    }

    if (!onGround) {
      this.playAnim('player-jump')
      return
    }

    if (moveX !== 0) {
      this.playAnim('player-run')
      return
    }

    const readyAnim = this.getEquippedReadyAnim()
    this.playAnim(readyAnim ?? 'player-idle')
  }

  private getEquippedReadyAnim(): string | null {
    if (this.equippedWeapon === 'pistol') return 'player-pistol-ready'
    if (this.equippedWeapon === 'rifle') return 'player-rifle-ready'
    if (this.equippedWeapon === 'grenade') return 'player-grenade-ready'
    return null
  }

  private playAnim(key: string, restart = false): void {
    if (!this.scene.anims.exists(key)) return
    if (this.currentAnimKey === key && this.anims.isPlaying && !restart) return
    this.applyBodyOffsetForAnimation(key)
    this.currentAnimKey = key
    this.anims.play(key, !restart)
  }

  private applyBodyOffsetForAnimation(key: string): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null
    if (!body) return

    body.setSize(this.bodyHitW, this.bodyHitH)
    let offsetX = this.normalBodyOffsetX
    if (key === 'player-shoot') offsetX = this.shootBodyOffsetX
    if (key === 'player-rifle-shoot') offsetX = this.rifleShootBodyOffsetX
    if (
      key === 'player-pistol-equip' ||
      key === 'player-pistol-ready' ||
      key === 'player-pistol-reload' ||
      key === 'player-rifle-equip' ||
      key === 'player-rifle-ready' ||
      key === 'player-rifle-reload' ||
      key === 'player-grenade-throw' ||
      key === 'player-grenade-equip' ||
      key === 'player-grenade-ready'
    ) {
      offsetX = this.weaponIdleBodyOffsetX
    }
    body.setOffset(offsetX, this.normalBodyOffsetY)
  }

  private isReloading(): boolean {
    return this.reloadingWeapon !== null && this.scene.time.now < this.reloadingUntil
  }

  private startReload(weapon: 'pistol' | 'rifle', now = this.scene.time.now): void {
    if (this.deadState || this.isDodging() || this.isReloading()) return

    const duration = weapon === 'pistol' ? this.pistolReloadAnimMs : this.rifleReloadAnimMs
    this.reloadingWeapon = weapon
    this.reloadingUntil = now + duration
    this.shootingUntil = this.reloadingUntil
    if (weapon === 'pistol') {
      this.nextShootAt = this.reloadingUntil
      this.playAnim('player-pistol-reload', true)
    } else {
      this.nextRifleShootAt = this.reloadingUntil
      this.playAnim('player-rifle-reload', true)
    }
    this.syncAmmoState()
  }

  private finishReloadIfNeeded(now = this.scene.time.now): void {
    if (!this.reloadingWeapon || now < this.reloadingUntil) return

    if (this.reloadingWeapon === 'pistol') {
      this.pistolAmmo = this.pistolMagazineSize
    } else {
      this.rifleAmmo = this.rifleMagazineSize
    }
    this.reloadingWeapon = null
    this.reloadingUntil = -99999
    this.syncAmmoState()
  }

  private syncAmmoState(): void {
    this.scene.registry.set('ammoState', this.getAmmoState())
  }
}
