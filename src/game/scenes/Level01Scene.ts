import Phaser from 'phaser'
import { DamageSystem } from '../combat/DamageSystem'
import { Player, type WasdKeys } from '../entities/player/Player'
import { Slime } from '../entities/enemies/Slime'
import { FlashFx } from '../systems/fx/FlashFx'
import { ShakeFx } from '../systems/fx/ShakeFx'
import { ParticleFx } from '../systems/fx/ParticleFx'
import { Sfx } from '../systems/fx/Sfx'
import { mutateSave, readSaveFromRegistry } from '../save/SaveStore'

export class Level01Scene extends Phaser.Scene {
  private player!: Player
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: WasdKeys
  private jumpKey!: Phaser.Input.Keyboard.Key
  private attackKey!: Phaser.Input.Keyboard.Key
  private attackKeyAlt!: Phaser.Input.Keyboard.Key
  private menuEquipKey!: Phaser.Input.Keyboard.Key
  private menuMapKey!: Phaser.Input.Keyboard.Key
  private menuArchiveKey!: Phaser.Input.Keyboard.Key
  private quickSaveKey!: Phaser.Input.Keyboard.Key
  private enemies!: Phaser.Physics.Arcade.Group
  private enemyList: Slime[] = []
  private respawning = false
  private spawnPoint = new Phaser.Math.Vector2(96, 160)
  private readonly targetEnemyCount = 3
  private worldWidth = 0
  private saveTickMs = 0

  constructor() {
    super('Level01Scene')
  }

  preload(): void {
    this.load.tilemapTiledJSON('level01', 'assets/maps/json/level01.json')
  }

  create(): void {
    const map = this.make.tilemap({ key: 'level01' })
    const tiles = map.addTilesetImage('dungeon', 'tiles32', 32, 32, 0, 0)
    if (!tiles) throw new Error('Tileset mapping failed')

    const collision = map.createLayer('Collisions', tiles, 0, 0)
    if (!collision) throw new Error('Collision layer not found')

    collision.setCollision([2])
    collision.setVisible(false)

    const worldWidth = map.widthInPixels
    const worldHeight = map.heightInPixels
    this.worldWidth = worldWidth

    if (this.textures.exists('bg-main')) {
      this.add
        .image(worldWidth / 2, worldHeight / 2, 'bg-main')
        .setDisplaySize(worldWidth, worldHeight)
        .setDepth(-20)
    } else {
      this.cameras.main.setBackgroundColor('#0a0d12')
    }

    this.buildArtTerrain(map, tiles, collision)

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight)
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight)
    this.cameras.main.setZoom(2)
    this.cameras.main.setRoundPixels(true)

    this.spawnPoint = this.getSpawnPoint(map)
    const save = readSaveFromRegistry(this)
    if (save.runtime.mapId === 'level01') {
      this.spawnPoint.x = Phaser.Math.Clamp(save.runtime.x, 32, worldWidth - 32)
      this.spawnPoint.y = Phaser.Math.Clamp(save.runtime.y, 32, worldHeight - 64)
    }
    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y)
    this.player.setDepth(20)

    const kb = this.input.keyboard
    if (!kb) throw new Error('Keyboard not available')
    this.cursors = kb.createCursorKeys()
    this.wasd = kb.addKeys('W,A,S,D') as WasdKeys
    this.jumpKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.attackKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J)
    this.attackKeyAlt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.K)
    this.menuEquipKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.menuMapKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.M)
    this.menuArchiveKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P)
    this.quickSaveKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.L)

    this.cameras.main.startFollow(this.player, true, 0.14, 0.08)
    this.cameras.main.setDeadzone(220, 140)

    this.enemies = this.physics.add.group({
      allowGravity: true,
      collideWorldBounds: true,
    })

    this.spawnEnemiesFromMap(map, collision, worldWidth, worldHeight)
    this.ensureEnemyCount(this.targetEnemyCount, collision, worldWidth, worldHeight)

    this.physics.add.collider(this.player, collision)
    this.physics.add.collider(this.enemies, collision)

    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      this.onPlayerTouchEnemy(e as Slime)
    })

    this.registry.set('hp', this.player.getHp())
    this.registry.set('maxHp', this.player.getMaxHp())
    this.registry.set('enemyCount', this.enemyList.length)
    this.syncRuntimeSave(0)

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene')
    this.scene.bringToTop('UIScene')
  }

  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.menuEquipKey)) this.toggleOverlay('EquipmentScene')
    if (Phaser.Input.Keyboard.JustDown(this.menuMapKey)) this.toggleOverlay('MapScene')
    if (Phaser.Input.Keyboard.JustDown(this.menuArchiveKey)) this.toggleOverlay('ArchiveScene')
    if (Phaser.Input.Keyboard.JustDown(this.quickSaveKey)) this.syncRuntimeSave(0)

    if (this.isAnyMenuOpen()) return

    this.player.update(this.cursors, this.wasd, this.jumpKey, delta)

    if (
      Phaser.Input.Keyboard.JustDown(this.attackKey) ||
      Phaser.Input.Keyboard.JustDown(this.attackKeyAlt)
    ) {
      this.performAttack()
    }

    for (const enemy of this.enemyList) {
      if (enemy.active) enemy.updateAI(this.player)
    }

    this.enemyList = this.enemyList.filter((e) => e.active)
    this.registry.set('enemyCount', this.enemyList.length)

    this.syncRuntimeSave(delta)
  }

  private toggleOverlay(sceneKey: 'EquipmentScene' | 'MapScene' | 'ArchiveScene'): void {
    if (this.scene.isActive(sceneKey)) {
      this.scene.stop(sceneKey)
      return
    }
    this.scene.launch(sceneKey)
    this.scene.bringToTop(sceneKey)
  }

  private isAnyMenuOpen(): boolean {
    return (
      this.scene.isActive('EquipmentScene') ||
      this.scene.isActive('MapScene') ||
      this.scene.isActive('ArchiveScene')
    )
  }

  private getCurrentRoomId(): string {
    const roomCount = 4
    const sectionWidth = Math.max(1, this.worldWidth / roomCount)
    const idx = Phaser.Math.Clamp(Math.floor(this.player.x / sectionWidth), 0, roomCount - 1)
    return `level01:${idx}`
  }

  private syncRuntimeSave(deltaMs: number): void {
    this.saveTickMs += deltaMs
    if (deltaMs > 0 && this.saveTickMs < 5000) return

    const elapsedSec = Math.floor(this.saveTickMs / 1000)
    this.saveTickMs = 0

    const room = this.getCurrentRoomId()
    mutateSave(this, (save) => {
      save.map.mapId = 'level01'
      save.map.currentRoom = room
      if (!save.map.visited.includes(room)) {
        save.map.visited.push(room)
      }

      save.runtime.mapId = 'level01'
      save.runtime.x = Math.floor(this.player.x)
      save.runtime.y = Math.floor(this.player.y)
      save.runtime.hp = this.player.getHp()
      save.runtime.maxHp = this.player.getMaxHp()

      if (elapsedSec > 0) {
        save.profile.playTimeSec += elapsedSec
      }
    })
  }

  private buildArtTerrain(
    map: Phaser.Tilemaps.Tilemap,
    tiles: Phaser.Tilemaps.Tileset,
    collision: Phaser.Tilemaps.TilemapLayer,
  ): void {
    const fill = this.add.graphics()
    fill.fillStyle(0x11151c, 1)
    fill.setDepth(-1)

    const edgeLayer = map.createBlankLayer('ArtEdge', tiles, 0, 0)
    if (!edgeLayer) return
    edgeLayer.setDepth(0)

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        if (!this.isSolid(collision, x, y)) continue

        const up = this.isSolid(collision, x, y - 1)
        const down = this.isSolid(collision, x, y + 1)
        const left = this.isSolid(collision, x - 1, y)
        const right = this.isSolid(collision, x + 1, y)

        const isBoundary = !up || !down || !left || !right

        if (isBoundary) {
          const tileId = this.pickEdgeTileId(x, y, up, down, left, right)
          edgeLayer.putTileAt(tileId, x, y)
        } else {
          fill.fillRect(x * map.tileWidth, y * map.tileHeight, map.tileWidth, map.tileHeight)
        }
      }
    }
  }

  private isSolid(layer: Phaser.Tilemaps.TilemapLayer, tx: number, ty: number): boolean {
    const t = layer.getTileAt(tx, ty)
    return !!t && t.index !== 0
  }

  private pickEdgeTileId(
    x: number,
    y: number,
    up: boolean,
    down: boolean,
    left: boolean,
    right: boolean,
  ): number {
    if (!up) {
      if (!left && !right) return this.pickByPos(x, y, [104, 149])
      if (!left) return this.pickByPos(x, y, [35, 125])
      if (!right) return this.pickByPos(x, y, [37, 127])
      return this.pickByPos(x, y, [36, 126, 38, 128])
    }

    if (!down) {
      if (!left && !right) return this.pickByPos(x, y, [84, 174])
      if (!left) return this.pickByPos(x, y, [62, 152])
      if (!right) return this.pickByPos(x, y, [71, 161])
      return this.pickByPos(x, y, [85, 175])
    }

    if (!left) return this.pickByPos(x, y, [47, 56, 137])
    if (!right) return this.pickByPos(x, y, [50, 59, 140])

    return this.pickByPos(x, y, [79, 124, 128, 169])
  }

  private pickByPos(x: number, y: number, ids: number[]): number {
    return ids[(x * 17 + y * 31) % ids.length]
  }

  private applyEnemyPhysics(slime: Slime): void {
    const body = slime.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(true)
    body.setGravityY(1400)
    body.setImmovable(false)
    body.moves = true
    body.setMaxVelocity(180, 900)
    body.setDragX(1200)
  }

  private addEnemyAt(x: number, y: number): void {
    const slime = new Slime(this, x, y)
    slime.setDepth(20)
    this.enemies.add(slime)
    this.applyEnemyPhysics(slime)
    this.enemyList.push(slime)
  }

  private getSpawnPoint(map: Phaser.Tilemaps.Tilemap): Phaser.Math.Vector2 {
    const layer = map.getObjectLayer('Objects')
    if (!layer) return new Phaser.Math.Vector2(96, 160)

    const spawn = layer.objects.find((obj) => {
      const n = (obj.name ?? '').toLowerCase()
      const t = (obj.type ?? '').toLowerCase()
      return n === 'spawn_player' || t === 'spawn'
    })

    return new Phaser.Math.Vector2(spawn?.x ?? 96, spawn?.y ?? 160)
  }

  private getSafeEnemySpawn(
    rawX: number,
    rawY: number,
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    worldWidth: number,
    worldHeight: number,
  ): Phaser.Math.Vector2 | null {
    const x = Phaser.Math.Clamp(rawX, 24, worldWidth - 24)
    const startY = Phaser.Math.Clamp(rawY, 40, worldHeight - 180)
    const endY = worldHeight - 96

    for (let probeY = startY; probeY <= endY; probeY += 8) {
      const tile = collisionLayer.getTileAtWorldXY(x, probeY, true)
      if (!tile || !tile.collides) continue

      const top = tile.getTop()
      if (top <= 32) continue
      if (top >= worldHeight - 48) continue

      const head = collisionLayer.getTileAtWorldXY(x, top - 12, true)
      if (head && head.collides) continue

      return new Phaser.Math.Vector2(x, top - 8)
    }

    return null
  }

  private spawnEnemiesFromMap(
    map: Phaser.Tilemaps.Tilemap,
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    worldWidth: number,
    worldHeight: number,
  ): void {
    const layer = map.getObjectLayer('Objects')
    if (!layer) return

    const enemyObjs = layer.objects.filter((obj) => {
      const n = (obj.name ?? '').toLowerCase()
      const t = (obj.type ?? '').toLowerCase()
      return n === 'enemy_slime' || n === 'enemy' || t === 'enemy_slime' || t === 'enemy'
    })

    for (const obj of enemyObjs) {
      const rawX = obj.x ?? this.spawnPoint.x + 120
      const rawY = obj.y ?? this.spawnPoint.y + 40
      const safe = this.getSafeEnemySpawn(rawX, rawY, collisionLayer, worldWidth, worldHeight)
      if (!safe) continue
      this.addEnemyAt(safe.x, safe.y)
    }
  }

  private ensureEnemyCount(
    target: number,
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    worldWidth: number,
    worldHeight: number,
  ): void {
    const candidates: Array<[number, number]> = [
      [this.spawnPoint.x + 140, this.spawnPoint.y - 30],
      [this.spawnPoint.x + 260, this.spawnPoint.y - 40],
      [this.spawnPoint.x + 360, this.spawnPoint.y - 20],
      [this.spawnPoint.x + 80, this.spawnPoint.y - 10],
      [this.spawnPoint.x + 220, this.spawnPoint.y - 20],
    ]

    for (const [x, y] of candidates) {
      if (this.enemyList.length >= target) break
      const safe = this.getSafeEnemySpawn(x, y, collisionLayer, worldWidth, worldHeight)
      if (!safe) continue
      this.addEnemyAt(safe.x, safe.y)
    }
  }

  private performAttack(): void {
    const hitbox = this.player.tryAttack()
    if (!hitbox) return

    const slash = this.add.rectangle(hitbox.x, hitbox.y, 24, 20, 0x9ae6ff, 0.25).setDepth(20)

    this.tweens.add({
      targets: slash,
      alpha: 0,
      duration: 90,
      onComplete: () => slash.destroy(),
    })

    const hitSet = new Set<Slime>()

    this.physics.add.overlap(hitbox, this.enemies, (_hb, enemyObj) => {
      const enemy = enemyObj as Slime
      if (!enemy.active || enemy.dead) return
      if (hitSet.has(enemy)) return
      hitSet.add(enemy)

      const damaged = DamageSystem.apply(enemy, 1, this.player.x)
      if (!damaged) return

      FlashFx.hit(enemy, 80, 0xffffff)
      ParticleFx.hit(this, enemy.x, enemy.y, 8)
      ShakeFx.hit(this.cameras.main, 60, 0.003)
      Sfx.hit(0.018)
    })
  }

  private onPlayerTouchEnemy(enemy: Slime): void {
    if (this.respawning || !enemy.active || enemy.dead) return

    const tookDamage = DamageSystem.apply(this.player, 1, enemy.x)
    if (!tookDamage) return

    FlashFx.hit(this.player, 90, 0xffffff)
    ShakeFx.hit(this.cameras.main, 120, 0.006)
    ParticleFx.hit(this, this.player.x, this.player.y, 12)
    Sfx.hit(0.03)

    this.registry.set('hp', this.player.getHp())
    this.registry.set('maxHp', this.player.getMaxHp())

    if (this.player.isDead()) this.handlePlayerDeath()
  }

  private handlePlayerDeath(): void {
    if (this.respawning) return
    this.respawning = true

    const dieText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'YOU DIED', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#f87171',
        backgroundColor: '#11161f',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)

    this.time.delayedCall(900, () => {
      dieText.destroy()
      this.player.respawn(this.spawnPoint.x, this.spawnPoint.y)
      this.registry.set('hp', this.player.getHp())
      this.registry.set('maxHp', this.player.getMaxHp())
      this.respawning = false
    })
  }
}
