import Phaser from 'phaser'
import { DamageSystem } from '../combat/DamageSystem'
import {
  Player,
  type PlayerGrenadeThrow,
  type PlayerShot,
  type WasdKeys,
} from '../entities/player/Player'
import { Slime } from '../entities/enemies/Slime'
import { FlashFx } from '../systems/fx/FlashFx'
import { ShakeFx } from '../systems/fx/ShakeFx'
import { ParticleFx } from '../systems/fx/ParticleFx'
import { Sfx } from '../systems/fx/Sfx'
import { mutateSave, readSaveFromRegistry } from '../save/SaveStore'

type LevelTravel = {
  sceneKey: 'Level01Scene' | 'Level02Scene' | 'Level03Scene'
  mapId: 'level01' | 'level02' | 'level03'
}

type PortalAnchor = {
  x: number
  y: number
  floorTop: number
}

type PortalPreset = {
  x: number
  floorTop: number
}

type MechanismDoorConfig = {
  id: string
  xRatio: number
  unlockSide: 'left' | 'right'
}

type DoorAnchor = {
  x: number
  y: number
  floorTop: number
}

type PlayerSpawnAnchor = {
  x: number
  y: number
  floorTop: number
}

type EntrySpawnPreset = {
  x: number
  y: number
}

type CustomTravelPortalConfig = {
  rect: MarkerRect
  kind: 'prev' | 'next'
  label?: string
  fillColor?: number
  fillAlpha?: number
  strokeColor?: number
  strokeAlpha?: number
  labelColor?: string
  labelStrokeColor?: string
}

export type MarkerRect = {
  x: number
  y: number
  w: number
  h: number
}

type Level01CollisionRect = MarkerRect & {
  id?: string
}

type MechanismDoorState = {
  id: string
  unlockSide: 'left' | 'right'
  blocker: Phaser.GameObjects.Rectangle
  panel: Phaser.GameObjects.Rectangle
  hint: Phaser.GameObjects.Text
  switchX: number
  switchY: number
  opened: boolean
}

export type LevelSceneConfig = {
  sceneKey: 'Level01Scene' | 'Level02Scene' | 'Level03Scene'
  mapKey: 'level01' | 'level02' | 'level03'
  mapAssetPath: string
  mapId: 'level01' | 'level02' | 'level03'
  checkpointIndexes: number[]
  prevTravel: LevelTravel
  nextTravel: LevelTravel
}

export type PanoramaBackgroundConfig = {
  key: string
  path: string
  fitMode: 'stretch' | 'contain' | 'cover'
  fallback?: {
    key: string
    path: string
  }
}

const DEFAULT_LEVEL01_CONFIG: LevelSceneConfig = {
  sceneKey: 'Level01Scene',
  mapKey: 'level01',
  mapAssetPath: 'assets/maps/json/level01.json',
  mapId: 'level01',
  checkpointIndexes: [0, 5, 9],
  prevTravel: { sceneKey: 'Level03Scene', mapId: 'level03' },
  nextTravel: { sceneKey: 'Level02Scene', mapId: 'level02' },
}

// World-space ladder zones for level01, aligned to the live panorama layout.
const LEVEL01_LADDER_RECTS_WORLD: ReadonlyArray<MarkerRect> = [
  { x: 1193, y: 281, w: 33, h: 287 },
  { x: 1240, y: 212, w: 33, h: 445 },
  { x: 1490, y: 207, w: 33, h: 265 },
]
// World-space collision boxes for level01, aligned to the latest blue reference.
// These are independent from tile data so we can use non-32px rectangle sizes.
const LEVEL01_COLLISION_RECTS_WORLD: ReadonlyArray<Level01CollisionRect> = [
  // Top bunker and roof lips (right side)
  { x: 1152, y: 0, w: 640, h: 65 },
  { x: 1260, y: 210, w: 230, h: 24 },
  { x: 1190, y: 210, w: 50, h: 24 }, // C2 copy
  { x: 1525, y: 210, w: 260, h: 24 },

  // Left stepped ground
  { x: 0, y: 212, w: 256, h: 32 },
  { x: -60, y: 224, w: 320, h: 32 },
  { x: 40, y: 288, w: 320, h: 52 },

  // Mid platforms and center connector
  { x: 576, y: 310, w: 640, h: 32 },
  { x: 576, y: 320, w: 352, h: 32 },
  { x: 896, y: 320, w: 32, h: 160 },
  { x: 576, y: 448, w: 608, h: 32 },

  // Right floating platforms and lower walkway
  { x: 1344, y: 310, w: 128, h: 24 },
  { x: 1524, y: 310, w: 96, h: 24 },
  { x: 1268, y: 452, w: 480, h: 32 },

  // Left lower platform
  { x: 192, y: 458, w: 160, h: 46 },

  // Side blockers and bottom floor
  { x: 0, y: 564, w: 222, h: 96 },
  { x: 1755, y: 416, w: 64, h: 224 },
  { x: 0, y: 599, w: 1792, h: 54 },

  // Added from latest red markup (keep existing C1-C17 unchanged)
  { x: 1165, y: 90, w: 25, h: 115 }, // C18
  { x: 50, y: 256, w: 300, h: 48 }, // C19
  { x: 0, y: 272, w: 32, h: 368 }, // C20
  { x: 250, y: 304, w: 238, h: 40 }, // C21
  { id: 'C22', x: 350, y: 458, w: 230, h: 20 }, // C22
  { x: 576, y: 448, w: 368, h: 48 }, // C23
]
const LEVEL01_WORLD_REFERENCE = { width: 1792, height: 640 } as const
const LEVEL03_WORLD_REFERENCE = { width: 1792, height: 640 } as const

const LEVEL01_BG_KEY = 'level01-panorama'
const LEVEL01_BG_PATH = 'assets/debug/panoramas/level01_panorama.png'
const LEVEL01_SHOW_COLLIDER_DEBUG = false
const LEVEL01_COLLIDER_DEBUG_COLOR = 0x22d3ee
const LEVEL01_COLLIDER_DEBUG_ALPHA = 0.32
const LEVEL01_COLLIDER_DEBUG_DEPTH = 90
const LEVEL03_SHOW_COLLIDER_DEBUG = false
const LEVEL03_COLLIDER_DEBUG_COLOR = 0xef4444
const LEVEL03_COLLIDER_DEBUG_ALPHA = 0.28
const LEVEL03_COLLIDER_DEBUG_DEPTH = 91
const LEVEL01_SHOW_LADDER_DEBUG = false
const LEVEL01_LADDER_DEBUG_COLOR = 0xef4444
const LEVEL01_LADDER_DEBUG_ALPHA = 0.35
const LEVEL01_LADDER_DEBUG_DEPTH = 92
const LEVEL01_DROP_THROUGH_COLLISION_IDS = new Set(['C22'])
const LEVEL01_DROP_THROUGH_GRACE_MS = 220
const LEVEL01_PORTAL_REFERENCE = {
  width: 2048,
  height: 1008,
} as const

const LEVEL01_TO_LEVEL02_PORTAL_RECT = {
  x: 1937,
  y: 113,
  w: 68,
  h: 126,
} as const

const LEVEL02_ENTRY_FROM_LEVEL01_REFERENCE = {
  width: 2048,
  height: 1008,
} as const

const LEVEL02_ENTRY_FROM_LEVEL01_RECT = {
  x: 232,
  y: 38,
  w: 96,
  h: 13,
} as const

const LEVEL02_LEVEL03_LINK_REFERENCE = {
  width: 2016,
  height: 992,
} as const

const LEVEL02_LEVEL03_LINK_LEVEL02_RECT = {
  x: 969,
  y: 380,
  w: 71,
  h: 110,
} as const

const LEVEL02_LEVEL03_LINK_LEVEL03_RECT = {
  x: 1600,
  y: 898,
  w: 56,
  h: 95,
} as const

const LEVEL03_TO_LEVEL02_PORTAL = {
  x: 135,
  y: 341,
  w: 30,
  h: 68,
} as const

export class Level01Scene extends Phaser.Scene {
  private static readonly ROOM_SEGMENTS = 12
  private readonly levelConfig: LevelSceneConfig
  private readonly checkpointRooms: Set<string>
  private player!: Player
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: WasdKeys
  private jumpKey!: Phaser.Input.Keyboard.Key
  private dodgeKey!: Phaser.Input.Keyboard.Key
  private interactKey!: Phaser.Input.Keyboard.Key
  private equipPistolKey!: Phaser.Input.Keyboard.Key
  private equipRifleKey!: Phaser.Input.Keyboard.Key
  private equipGrenadeKey!: Phaser.Input.Keyboard.Key
  private fireKey!: Phaser.Input.Keyboard.Key
  private attackKey!: Phaser.Input.Keyboard.Key
  private attackKeyAlt!: Phaser.Input.Keyboard.Key
  private menuEquipKey!: Phaser.Input.Keyboard.Key
  private menuInventoryKey!: Phaser.Input.Keyboard.Key
  private menuMapKey!: Phaser.Input.Keyboard.Key
  private menuArchiveKey!: Phaser.Input.Keyboard.Key
  private quickSaveKey!: Phaser.Input.Keyboard.Key
  private enemies!: Phaser.Physics.Arcade.Group
  private enemyList: Slime[] = []
  private respawning = false
  private spawnPoint = new Phaser.Math.Vector2(96, 160)
  private mapBaseSpawn = new Phaser.Math.Vector2(96, 160)
  private readonly targetEnemyCount = 3
  private worldWidth = 0
  private worldHeight = 0
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer
  private saveTickMs = 0
  private lastRoomId = ''
  private transitioning = false
  private portalReadyAt = 0
  private portalTexts: Phaser.GameObjects.Text[] = []
  private portalAnchors: { prev: PortalAnchor; next: PortalAnchor } | null = null
  private pendingEntryPortal: 'prev' | 'next' | null = null
  private mechanismDoors: MechanismDoorState[] = []
  private terrainCollider?: Phaser.Physics.Arcade.Collider
  private level01CollisionBodies?: Phaser.Physics.Arcade.StaticGroup
  private level03CollisionBodies?: Phaser.Physics.Arcade.StaticGroup
  private level01DropThroughBodies = new Set<Phaser.GameObjects.Rectangle>()
  private level01DropThroughRects: Phaser.Geom.Rectangle[] = []
  private level01DropThroughUntilMs = 0
  private ladderRects: Phaser.Geom.Rectangle[] = []
  private climbingLadder = false
  private activeLadder: Phaser.Geom.Rectangle | null = null

  constructor(config: LevelSceneConfig = DEFAULT_LEVEL01_CONFIG) {
    super(config.sceneKey)
    this.levelConfig = config
    this.checkpointRooms = new Set(
      config.checkpointIndexes.map((idx) => `${config.mapId}:${idx}`),
    )
  }

  protected getPanoramaBackgroundConfig(): PanoramaBackgroundConfig | null {
    if (this.levelConfig.mapId === 'level01') {
      return {
        key: LEVEL01_BG_KEY,
        path: LEVEL01_BG_PATH,
        fitMode: 'stretch',
      }
    }

    return null
  }

  preload(): void {
    this.load.tilemapTiledJSON(this.levelConfig.mapKey, this.levelConfig.mapAssetPath)
    const backgroundConfig = this.getPanoramaBackgroundConfig()
    if (backgroundConfig) {
      this.load.image(backgroundConfig.key, backgroundConfig.path)
      if (backgroundConfig.fallback) {
        this.load.image(backgroundConfig.fallback.key, backgroundConfig.fallback.path)
      }
    }
  }

  init(data?: { entryPortal?: 'prev' | 'next' }): void {
    this.pendingEntryPortal =
      data?.entryPortal === 'prev' || data?.entryPortal === 'next' ? data.entryPortal : null
  }

  create(): void {
    // Scene instances are reused by Phaser after start/stop; reset portal state on each entry.
    this.transitioning = false
    this.portalReadyAt = 0
    this.portalTexts = []
    this.portalAnchors = null
    this.mechanismDoors = []
    this.terrainCollider = undefined
    this.level01CollisionBodies = undefined
    this.level03CollisionBodies = undefined
    this.level01DropThroughBodies.clear()
    this.level01DropThroughRects = []
    this.level01DropThroughUntilMs = 0
    this.ladderRects = []
    this.climbingLadder = false
    this.activeLadder = null

    const map = this.make.tilemap({ key: this.levelConfig.mapKey })
    const tiles = map.addTilesetImage('dungeon', 'tiles32', 32, 32, 0, 0)
    if (!tiles) throw new Error('Tileset mapping failed')

    const collision = map.createLayer('Collisions', tiles, 0, 0)
    if (!collision) throw new Error('Collision layer not found')
    this.collisionLayer = collision
    // Keep collision layer invisible even if later setup fails.
    collision.setVisible(false)
    collision.setAlpha(0)

    const worldWidth = map.widthInPixels
    const worldHeight = map.heightInPixels
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight

    // Treat every non-empty tile on the collision layer as a blocking tile.
    collision.setCollisionByExclusion([0, -1], true)
    collision.setVisible(false)

    const hasCustomLadders = this.getLadderRectsWorld().length > 0
    if (hasCustomLadders) {
      this.setupLevel01Ladders()
    }
    if (this.levelConfig.mapId === 'level01') {
      this.buildLevel01CollisionBodies()
    }
    if (this.levelConfig.mapId === 'level02' || this.levelConfig.mapId === 'level03') {
      this.applyLevel03CollisionRectsToTileLayer(collision)
      this.buildLevel03CollisionBodies()
    }

    const backgroundConfig = this.getPanoramaBackgroundConfig()
    if (backgroundConfig) {
      if (this.textures.exists(backgroundConfig.key)) {
        this.addPanoramaBackground(
          backgroundConfig.key,
          worldWidth,
          worldHeight,
          backgroundConfig.fitMode,
        )
      } else if (backgroundConfig.fallback && this.textures.exists(backgroundConfig.fallback.key)) {
        this.addPanoramaBackground(
          backgroundConfig.fallback.key,
          worldWidth,
          worldHeight,
          backgroundConfig.fitMode,
        )
      } else {
        this.cameras.main.setBackgroundColor('#0a0d12')
        const pathLines = backgroundConfig.fallback
          ? `${backgroundConfig.path}\n${backgroundConfig.fallback.path}`
          : backgroundConfig.path
        this.add
          .text(this.scale.width / 2, this.scale.height / 2, `Missing background:\n${pathLines}`, {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#fca5a5',
            align: 'center',
            stroke: '#111827',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(120)
      }
    } else if (this.textures.exists('bg-main')) {
      this.add
        .image(worldWidth / 2, worldHeight / 2, 'bg-main')
        .setDisplaySize(worldWidth, worldHeight)
        .setDepth(-20)
    } else {
      this.cameras.main.setBackgroundColor('#0a0d12')
    }

    // When a panorama is used, keep tile collision data for probes/spawn only.
    // Non-panorama levels still auto-build terrain art from collision tiles.
    if (!backgroundConfig) {
      this.buildArtTerrain(map, tiles, collision)
    }

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight)
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight)
    this.cameras.main.setZoom(2)
    this.cameras.main.setRoundPixels(true)

    this.mapBaseSpawn = this.getSpawnPoint(map)
    this.spawnPoint = this.mapBaseSpawn.clone()
    const save = readSaveFromRegistry(this)
    if (save.runtime.mapId === this.levelConfig.mapId) {
      this.spawnPoint.x = Phaser.Math.Clamp(save.runtime.x, 32, worldWidth - 32)
      this.spawnPoint.y = Phaser.Math.Clamp(save.runtime.y, 32, worldHeight - 64)
    }
    this.spawnPoint = this.resolveStrictPlayerSpawn(this.spawnPoint.x, this.spawnPoint.y, collision)
    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y)
    this.player.setDepth(20)

    const kb = this.input.keyboard
    if (!kb) throw new Error('Keyboard not available')
    this.cursors = kb.createCursorKeys()
    this.wasd = kb.addKeys('W,A,S,D') as WasdKeys
    this.jumpKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.dodgeKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
    this.interactKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    this.equipPistolKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F)
    this.equipRifleKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.G)
    this.equipGrenadeKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.O)
    this.fireKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P)
    this.attackKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J)
    this.attackKeyAlt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.K)
    this.menuEquipKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.menuInventoryKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.I)
    this.menuMapKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.M)
    this.menuArchiveKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.U)
    this.quickSaveKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.L)

    this.cameras.main.startFollow(this.player, true, 0.14, 0.08)
    this.cameras.main.setDeadzone(220, 140)

    this.enemies = this.physics.add.group({
      allowGravity: true,
      collideWorldBounds: true,
    })

    this.spawnEnemiesFromMap(map, collision, worldWidth, worldHeight)
    this.ensureEnemyCount(this.targetEnemyCount, collision, worldWidth, worldHeight)

    if (this.levelConfig.mapId === 'level01' && this.level01CollisionBodies) {
      this.terrainCollider = this.physics.add.collider(
        this.player,
        this.level01CollisionBodies,
        undefined,
        (_playerObj, terrainObj) => this.shouldPlayerCollideWithLevel01Body(terrainObj),
        this,
      )
      this.physics.add.collider(this.enemies, this.level01CollisionBodies)
    } else if (this.level03CollisionBodies) {
      this.terrainCollider = this.physics.add.collider(this.player, this.level03CollisionBodies)
      this.physics.add.collider(this.enemies, this.level03CollisionBodies)
    } else {
      this.terrainCollider = this.physics.add.collider(this.player, collision)
      this.physics.add.collider(this.enemies, collision)
    }

    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      this.onPlayerTouchEnemy(e as Slime)
    })
    // level01 keeps fixed ladder zones; skip dynamic door/portal generation here.
    if (this.levelConfig.mapId !== 'level01') {
      this.createMechanismDoors(collision)
      const shouldReplaceDefaultTravelPortals = this.shouldReplaceDefaultTravelPortals()
      const hasCustomTravelPortals = this.createCustomTravelPortals()
      if (!shouldReplaceDefaultTravelPortals || !hasCustomTravelPortals) {
        this.createTravelPortals(collision)
        if (this.levelConfig.mapId === 'level03') {
          this.createLevel03PortalToLevel02()
        }
      }
      this.applyTravelEntrySpawnIfNeeded(collision)
      this.portalReadyAt = Math.max(this.portalReadyAt, this.time.now + 600)
    } else {
      this.createLevel01PortalToLevel02Only()
      this.portalReadyAt = this.time.now + 600
    }

    this.registry.set('hp', this.player.getHp())
    this.registry.set('maxHp', this.player.getMaxHp())
    this.registry.set('enemyCount', this.enemyList.length)
    this.lastRoomId = this.getCurrentRoomId()
    this.syncRuntimeSave(0)

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene')
    this.scene.bringToTop('UIScene')
  }

  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.menuEquipKey)) this.toggleOverlay('EquipmentScene')
    if (Phaser.Input.Keyboard.JustDown(this.menuInventoryKey)) this.toggleOverlay('InventoryScene')
    if (Phaser.Input.Keyboard.JustDown(this.menuMapKey)) this.toggleOverlay('MapScene')
    if (Phaser.Input.Keyboard.JustDown(this.menuArchiveKey)) this.toggleOverlay('ArchiveScene')
    if (Phaser.Input.Keyboard.JustDown(this.quickSaveKey)) this.syncRuntimeSave(0)

    if (this.isAnyMenuOpen()) return

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.tryOpenMechanismDoor()
    }
    this.updateDoorInteractHints()

    if (this.levelConfig.mapId === 'level01') {
      this.updateLevel01DropThroughState()
    }

    const climbingByLadder = this.ladderRects.length > 0 && this.updateLadderMovement()
    if (!climbingByLadder) {
      this.player.update(this.cursors, this.wasd, this.jumpKey, this.dodgeKey, delta)
    }

    if (Phaser.Input.Keyboard.JustDown(this.equipPistolKey)) {
      this.player.equipPistol()
    }
    if (Phaser.Input.Keyboard.JustDown(this.equipRifleKey)) {
      this.player.equipRifle()
    }
    if (Phaser.Input.Keyboard.JustDown(this.equipGrenadeKey)) {
      this.player.equipGrenade()
    }
    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
      this.performShoot()
    }

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

  private addPanoramaBackground(
    textureKey: string,
    worldWidth: number,
    worldHeight: number,
    fitMode: 'stretch' | 'contain' | 'cover',
  ): void {
    const image = this.add.image(worldWidth / 2, worldHeight / 2, textureKey).setDepth(-20)
    if (fitMode === 'stretch') {
      image.setDisplaySize(worldWidth, worldHeight)
      return
    }

    const texture = this.textures.get(textureKey)
    const source = texture.getSourceImage() as { width?: number; height?: number } | undefined
    const sourceW = Math.max(1, source?.width ?? worldWidth)
    const sourceH = Math.max(1, source?.height ?? worldHeight)

    const scaleX = worldWidth / sourceW
    const scaleY = worldHeight / sourceH
    const scale = fitMode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY)

    image.setDisplaySize(sourceW * scale, sourceH * scale)
  }

  private toggleOverlay(sceneKey: 'EquipmentScene' | 'InventoryScene' | 'MapScene' | 'ArchiveScene'): void {
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
      this.scene.isActive('InventoryScene') ||
      this.scene.isActive('MapScene') ||
      this.scene.isActive('ArchiveScene')
    )
  }

  private setupLevel01Ladders(): void {
    const ladderRectsWorld = this.getLadderRectsWorld()
    if (ladderRectsWorld.length === 0) return

    const ladderReference = this.getLadderWorldReference()
    const scaleX = this.worldWidth / ladderReference.width
    const scaleY = this.worldHeight / ladderReference.height
    this.ladderRects = ladderRectsWorld.map(
      (rect) =>
        new Phaser.Geom.Rectangle(
          rect.x * scaleX,
          rect.y * scaleY,
          rect.w * scaleX,
          rect.h * scaleY,
        ),
    )

    for (const rect of this.ladderRects) {
      this.add
        .rectangle(
          rect.x + rect.width * 0.5,
          rect.y + rect.height * 0.5,
          rect.width,
          rect.height,
          LEVEL01_LADDER_DEBUG_COLOR,
          LEVEL01_SHOW_LADDER_DEBUG ? LEVEL01_LADDER_DEBUG_ALPHA : 0,
        )
        .setVisible(LEVEL01_SHOW_LADDER_DEBUG)
        .setStrokeStyle(
          LEVEL01_SHOW_LADDER_DEBUG ? 1 : 0,
          LEVEL01_LADDER_DEBUG_COLOR,
          LEVEL01_SHOW_LADDER_DEBUG ? 0.95 : 0,
        )
        .setDepth(LEVEL01_SHOW_LADDER_DEBUG ? LEVEL01_LADDER_DEBUG_DEPTH : -100)
    }
  }

  protected getLadderRectsWorld(): ReadonlyArray<MarkerRect> {
    if (this.levelConfig.mapId === 'level01') {
      return LEVEL01_LADDER_RECTS_WORLD
    }
    return []
  }

  protected getLadderWorldReference(): { width: number; height: number } {
    return LEVEL01_WORLD_REFERENCE
  }

  protected getCustomTravelPortals(): ReadonlyArray<CustomTravelPortalConfig> {
    return []
  }

  protected shouldReplaceDefaultTravelPortals(): boolean {
    return false
  }

  protected getCustomTravelPortalReference(): { width: number; height: number } {
    return { width: this.worldWidth, height: this.worldHeight }
  }

  private buildLevel01CollisionBodies(): void {
    if (LEVEL01_COLLISION_RECTS_WORLD.length === 0) return

    const scaleX = this.worldWidth / LEVEL01_WORLD_REFERENCE.width
    const scaleY = this.worldHeight / LEVEL01_WORLD_REFERENCE.height
    const group = this.physics.add.staticGroup()
    this.level01DropThroughBodies.clear()
    this.level01DropThroughRects = []

    for (const rect of LEVEL01_COLLISION_RECTS_WORLD) {
      const worldW = Math.max(1, rect.w * scaleX)
      const worldH = Math.max(1, rect.h * scaleY)
      const worldX = rect.x * scaleX + worldW / 2
      const worldY = rect.y * scaleY + worldH / 2

      const blocker = this.add
        .rectangle(
          worldX,
          worldY,
          worldW,
          worldH,
          LEVEL01_COLLIDER_DEBUG_COLOR,
          LEVEL01_SHOW_COLLIDER_DEBUG ? LEVEL01_COLLIDER_DEBUG_ALPHA : 0,
        )
        .setVisible(LEVEL01_SHOW_COLLIDER_DEBUG)
        .setStrokeStyle(
          LEVEL01_SHOW_COLLIDER_DEBUG ? 1 : 0,
          LEVEL01_COLLIDER_DEBUG_COLOR,
          LEVEL01_SHOW_COLLIDER_DEBUG ? 0.95 : 0,
        )
        .setDepth(LEVEL01_SHOW_COLLIDER_DEBUG ? LEVEL01_COLLIDER_DEBUG_DEPTH : -100)
      this.physics.add.existing(blocker, true)
      group.add(blocker)

      if (rect.id && LEVEL01_DROP_THROUGH_COLLISION_IDS.has(rect.id)) {
        this.level01DropThroughBodies.add(blocker)
        this.level01DropThroughRects.push(
          new Phaser.Geom.Rectangle(rect.x * scaleX, rect.y * scaleY, worldW, worldH),
        )
      }
    }

    group.refresh()
    this.level01CollisionBodies = group
  }

  protected getLevel03CollisionRectsWorld(): ReadonlyArray<MarkerRect> {
    return []
  }

  private buildLevel03CollisionBodies(): void {
    const collisionRects = this.getLevel03CollisionRectsWorld()
    if (collisionRects.length === 0) return

    const scaleX = this.worldWidth / LEVEL03_WORLD_REFERENCE.width
    const scaleY = this.worldHeight / LEVEL03_WORLD_REFERENCE.height
    const group = this.physics.add.staticGroup()

    for (const rect of collisionRects) {
      const worldW = Math.max(1, rect.w * scaleX)
      const worldH = Math.max(1, rect.h * scaleY)
      const worldX = rect.x * scaleX + worldW * 0.5
      const worldY = rect.y * scaleY + worldH * 0.5

      const blocker = this.add
        .rectangle(
          worldX,
          worldY,
          worldW,
          worldH,
          LEVEL03_COLLIDER_DEBUG_COLOR,
          LEVEL03_SHOW_COLLIDER_DEBUG ? LEVEL03_COLLIDER_DEBUG_ALPHA : 0,
        )
        .setVisible(LEVEL03_SHOW_COLLIDER_DEBUG)
        .setStrokeStyle(
          LEVEL03_SHOW_COLLIDER_DEBUG ? 1 : 0,
          LEVEL03_COLLIDER_DEBUG_COLOR,
          LEVEL03_SHOW_COLLIDER_DEBUG ? 0.95 : 0,
        )
        .setDepth(LEVEL03_SHOW_COLLIDER_DEBUG ? LEVEL03_COLLIDER_DEBUG_DEPTH : -100)

      this.physics.add.existing(blocker, true)
      group.add(blocker)
    }

    group.refresh()
    this.level03CollisionBodies = group
  }

  private applyLevel03CollisionRectsToTileLayer(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
  ): void {
    const collisionRects = this.getLevel03CollisionRectsWorld()
    if (collisionRects.length === 0) return

    const map = collisionLayer.tilemap
    const tileW = map.tileWidth
    const tileH = map.tileHeight
    const scaleX = this.worldWidth / LEVEL03_WORLD_REFERENCE.width
    const scaleY = this.worldHeight / LEVEL03_WORLD_REFERENCE.height

    for (let ty = 0; ty < map.height; ty += 1) {
      for (let tx = 0; tx < map.width; tx += 1) {
        // Phaser treats empty tiles as -1 in putTileAt(); 0 can crash on tiles[index][2].
        collisionLayer.putTileAt(-1, tx, ty, false)
      }
    }

    for (const rect of collisionRects) {
      const x0 = rect.x * scaleX
      const y0 = rect.y * scaleY
      const x1 = x0 + rect.w * scaleX
      const y1 = y0 + rect.h * scaleY

      const left = Phaser.Math.Clamp(Math.floor(x0 / tileW), 0, map.width - 1)
      const top = Phaser.Math.Clamp(Math.floor(y0 / tileH), 0, map.height - 1)
      const right = Phaser.Math.Clamp(Math.ceil(x1 / tileW) - 1, 0, map.width - 1)
      const bottom = Phaser.Math.Clamp(Math.ceil(y1 / tileH) - 1, 0, map.height - 1)

      for (let ty = top; ty <= bottom; ty += 1) {
        for (let tx = left; tx <= right; tx += 1) {
          collisionLayer.putTileAt(2, tx, ty, false)
        }
      }
    }

    collisionLayer.setCollisionByExclusion([0, -1], true)
  }

  private updateLevel01DropThroughState(): void {
    if (this.level01DropThroughRects.length === 0) return

    const downJustPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.S)
    if (!downJustPressed) return

    const body = this.player.body as Phaser.Physics.Arcade.Body
    if (!body) return
    if (!body.blocked.down && !body.touching.down) return
    if (!this.isPlayerOnDropThroughPlatform(body)) return

    this.level01DropThroughUntilMs = this.time.now + LEVEL01_DROP_THROUGH_GRACE_MS
    body.setVelocityY(Math.max(body.velocity.y, 150))
    this.player.y += 2
  }

  private shouldPlayerCollideWithLevel01Body(terrainObj: unknown): boolean {
    if (!(terrainObj instanceof Phaser.GameObjects.Rectangle)) return true
    const blocker = terrainObj
    if (!this.level01DropThroughBodies.has(blocker)) return true

    if (this.time.now < this.level01DropThroughUntilMs) return false

    const body = this.player.body as Phaser.Physics.Arcade.Body
    if (!body) return true

    const blockerTop = blocker.getBounds().top
    const topTolerance = 6
    const currentBottom = body.bottom
    const previousBottom = currentBottom - body.deltaY()
    const approachingFromAbove =
      previousBottom <= blockerTop + topTolerance && currentBottom <= blockerTop + topTolerance
    const notRising = body.velocity.y >= -8

    return approachingFromAbove && notRising
  }

  private isPlayerOnDropThroughPlatform(body: Phaser.Physics.Arcade.Body): boolean {
    const centerX = body.center.x
    const bottom = body.bottom
    const topSnap = 12

    for (const rect of this.level01DropThroughRects) {
      const rectLeft = rect.x
      const rectRight = rect.x + rect.width
      const rectTop = rect.y
      if (centerX < rectLeft - 4 || centerX > rectRight + 4) continue
      if (Math.abs(bottom - rectTop) <= topSnap) return true
    }

    return false
  }

  private updateLadderMovement(): boolean {
    if (this.ladderRects.length === 0) return false

    const body = this.player.body as Phaser.Physics.Arcade.Body
    const up = this.cursors.up.isDown || this.wasd.W.isDown
    const down = this.cursors.down.isDown || this.wasd.S.isDown
    const left = this.cursors.left.isDown || this.wasd.A.isDown
    const right = this.cursors.right.isDown || this.wasd.D.isDown
    const wantsClimb = up || down
    const nearbyLadder = this.findNearestLadderRect(this.player.x, this.player.y)

    if (!this.climbingLadder) {
      if (!nearbyLadder || !wantsClimb) return false
      this.enterLadderState(nearbyLadder)
    } else if (nearbyLadder) {
      this.activeLadder = nearbyLadder
    } else if (!wantsClimb) {
      this.exitLadderState()
      return false
    }

    const ladder = this.activeLadder
    if (!ladder) {
      this.exitLadderState()
      return false
    }

    const ladderCenterX = ladder.x + ladder.width * 0.5
    const climbSpeed = 140

    this.player.x = Phaser.Math.Linear(this.player.x, ladderCenterX, 0.45)
    body.setVelocityX(0)

    let vy = 0
    if (up && !down) vy = -climbSpeed
    if (down && !up) vy = climbSpeed
    body.setVelocityY(vy)

    const topLimit = ladder.y - 10
    const bottomLimit = ladder.y + ladder.height + 12
    this.player.y = Phaser.Math.Clamp(this.player.y, topLimit, bottomLimit)

    if (Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
      this.exitLadderState()
      body.setVelocityY(-260)
      return false
    }

    if (!wantsClimb && (left || right)) {
      this.exitLadderState()
      return false
    }

    if (!this.isWithinRectPadding(this.player.x, this.player.y, ladder, 24, 28)) {
      this.exitLadderState()
      return false
    }

    return true
  }

  private findNearestLadderRect(x: number, y: number): Phaser.Geom.Rectangle | null {
    let best: Phaser.Geom.Rectangle | null = null
    let bestDist = Number.POSITIVE_INFINITY

    for (const rect of this.ladderRects) {
      if (!this.isWithinRectPadding(x, y, rect, 20, 28)) continue
      const cx = rect.x + rect.width * 0.5
      const cy = rect.y + rect.height * 0.5
      const dist = Phaser.Math.Distance.Between(x, y, cx, cy)
      if (dist < bestDist) {
        bestDist = dist
        best = rect
      }
    }

    return best
  }

  private isWithinRectPadding(
    x: number,
    y: number,
    rect: Phaser.Geom.Rectangle,
    padX: number,
    padY: number,
  ): boolean {
    return (
      x >= rect.x - padX &&
      x <= rect.x + rect.width + padX &&
      y >= rect.y - padY &&
      y <= rect.y + rect.height + padY
    )
  }

  private enterLadderState(ladder: Phaser.Geom.Rectangle): void {
    this.climbingLadder = true
    this.activeLadder = ladder

    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setVelocity(0, 0)

    if (this.terrainCollider) {
      this.terrainCollider.active = false
    }
  }

  private exitLadderState(): void {
    if (!this.climbingLadder && !this.activeLadder) return

    this.climbingLadder = false
    this.activeLadder = null

    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(true)

    if (this.terrainCollider) {
      this.terrainCollider.active = true
    }
  }

  private getCurrentRoomId(): string {
    const roomCount = Level01Scene.ROOM_SEGMENTS
    const sectionWidth = Math.max(1, this.worldWidth / roomCount)
    const idx = Phaser.Math.Clamp(Math.floor(this.player.x / sectionWidth), 0, roomCount - 1)
    return `${this.levelConfig.mapId}:${idx}`
  }

  private syncRuntimeSave(deltaMs: number): void {
    this.saveTickMs += deltaMs
    const room = this.getCurrentRoomId()
    const roomChanged = room !== this.lastRoomId

    if (roomChanged) {
      this.lastRoomId = room
      this.touchCheckpoint(room)
    }

    if (deltaMs > 0 && this.saveTickMs < 5000 && !roomChanged) return

    const elapsedSec = Math.floor(this.saveTickMs / 1000)
    this.saveTickMs = 0

    mutateSave(this, (save) => {
      save.map.mapId = this.levelConfig.mapId
      save.map.currentRoom = room
      if (!save.map.visited.includes(room)) {
        save.map.visited.push(room)
      }

      save.runtime.mapId = this.levelConfig.mapId
      save.runtime.x = Math.floor(this.player.x)
      save.runtime.y = Math.floor(this.player.y)
      save.runtime.hp = this.player.getHp()
      save.runtime.maxHp = this.player.getMaxHp()

      if (elapsedSec > 0) {
        save.profile.playTimeSec += elapsedSec
      }
    })
  }

  private touchCheckpoint(roomId: string): void {
    if (!this.checkpointRooms.has(roomId)) return
    const safe = this.resolveStrictPlayerSpawn(this.player.x, this.player.y, this.collisionLayer)
    this.spawnPoint.x = safe.x
    this.spawnPoint.y = safe.y
  }

  private createTravelPortals(collisionLayer: Phaser.Tilemaps.TilemapLayer): void {
    const { prev, next } = this.pickPortalAnchors(collisionLayer)
    this.portalAnchors = { prev, next }
    const prevX = prev.x
    const prevY = prev.y
    const nextX = next.x
    const nextY = next.y

    const prevPortal = this.add
      .rectangle(prevX, prevY, 30, 68, 0xffa45b, 0.6)
      .setStrokeStyle(2, 0xffe7ca, 0.95)
      .setDepth(18)
    const nextPortal = this.add
      .rectangle(nextX, nextY, 30, 68, 0x66d4ff, 0.6)
      .setStrokeStyle(2, 0xd9f5ff, 0.95)
      .setDepth(18)

    this.physics.add.existing(prevPortal, true)
    this.physics.add.existing(nextPortal, true)

    const prevLabel = this.add
      .text(prevX, prevY - 48, 'PREV', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffd9b3',
        stroke: '#2a1300',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(19)
    const nextLabel = this.add
      .text(nextX, nextY - 48, 'NEXT', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#c6efff',
        stroke: '#001825',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(19)

    this.portalTexts.push(prevLabel, nextLabel)

    this.physics.add.overlap(this.player, prevPortal, () => {
      this.onTravelPortalTouched('prev')
    })
    this.physics.add.overlap(this.player, nextPortal, () => {
      this.onTravelPortalTouched('next')
    })
  }

  private createCustomTravelPortals(): boolean {
    const customPortals = this.getCustomTravelPortals()
    if (customPortals.length === 0) return false

    const reference = this.getCustomTravelPortalReference()
    const refWidth = Math.max(1, reference.width)
    const refHeight = Math.max(1, reference.height)
    const scaleX = this.worldWidth / refWidth
    const scaleY = this.worldHeight / refHeight

    for (const portalConfig of customPortals) {
      const worldW = Math.max(4, portalConfig.rect.w * scaleX)
      const worldH = Math.max(4, portalConfig.rect.h * scaleY)
      const x = Phaser.Math.Clamp(
        portalConfig.rect.x * scaleX + worldW * 0.5,
        worldW * 0.5,
        Math.max(worldW * 0.5, this.worldWidth - worldW * 0.5),
      )
      const y = Phaser.Math.Clamp(
        portalConfig.rect.y * scaleY + worldH * 0.5,
        worldH * 0.5,
        Math.max(worldH * 0.5, this.worldHeight - worldH * 0.5),
      )

      const isPrev = portalConfig.kind === 'prev'
      const fillColor = portalConfig.fillColor ?? (isPrev ? 0xffa45b : 0x66d4ff)
      const fillAlpha = portalConfig.fillAlpha ?? 0.62
      const strokeColor = portalConfig.strokeColor ?? (isPrev ? 0xffe7ca : 0xd9f5ff)
      const strokeAlpha = portalConfig.strokeAlpha ?? 0.95
      const labelColor = portalConfig.labelColor ?? (isPrev ? '#ffd9b3' : '#c6efff')
      const labelStrokeColor = portalConfig.labelStrokeColor ?? (isPrev ? '#2a1300' : '#001825')
      const labelText = portalConfig.label ?? (isPrev ? 'PREV' : 'NEXT')

      const portal = this.add
        .rectangle(x, y, worldW, worldH, fillColor, fillAlpha)
        .setStrokeStyle(2, strokeColor, strokeAlpha)
        .setDepth(18)
      this.physics.add.existing(portal, true)

      const label = this.add
        .text(x, y - 48, labelText, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: labelColor,
          stroke: labelStrokeColor,
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(19)
      this.portalTexts.push(label)

      this.physics.add.overlap(this.player, portal, () => {
        this.onTravelPortalTouched(portalConfig.kind)
      })
    }

    return true
  }

  private createLevel01PortalToLevel02Only(): void {
    const scaleX = this.worldWidth / LEVEL01_PORTAL_REFERENCE.width
    const scaleY = this.worldHeight / LEVEL01_PORTAL_REFERENCE.height
    const worldW = Math.max(4, LEVEL01_TO_LEVEL02_PORTAL_RECT.w * scaleX)
    const worldH = Math.max(4, LEVEL01_TO_LEVEL02_PORTAL_RECT.h * scaleY)
    const x = Phaser.Math.Clamp(
      LEVEL01_TO_LEVEL02_PORTAL_RECT.x * scaleX + worldW * 0.5,
      worldW * 0.5,
      Math.max(worldW * 0.5, this.worldWidth - worldW * 0.5),
    )
    const y = Phaser.Math.Clamp(
      LEVEL01_TO_LEVEL02_PORTAL_RECT.y * scaleY + worldH * 0.5,
      worldH * 0.5,
      Math.max(worldH * 0.5, this.worldHeight - worldH * 0.5),
    )

    const portal = this.add
      .rectangle(x, y, worldW, worldH, 0x66d4ff, 0.62)
      .setStrokeStyle(2, 0xd9f5ff, 0.95)
      .setDepth(18)
    this.physics.add.existing(portal, true)

    const label = this.add
      .text(x, y - 48, 'TO L02', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#c6efff',
        stroke: '#001825',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(19)
    this.portalTexts.push(label)

    this.physics.add.overlap(this.player, portal, () => {
      this.onTravelPortalTouched('next')
    })
  }

  private createLevel03PortalToLevel02(): void {
    const x = Phaser.Math.Clamp(
      LEVEL03_TO_LEVEL02_PORTAL.x,
      16,
      Math.max(16, this.worldWidth - 16),
    )
    const y = Phaser.Math.Clamp(
      LEVEL03_TO_LEVEL02_PORTAL.y,
      16,
      Math.max(16, this.worldHeight - 16),
    )

    const portal = this.add
      .rectangle(
        x,
        y,
        LEVEL03_TO_LEVEL02_PORTAL.w,
        LEVEL03_TO_LEVEL02_PORTAL.h,
        0xffa45b,
        0.62,
      )
      .setStrokeStyle(2, 0xffe7ca, 0.95)
      .setDepth(18)
    this.physics.add.existing(portal, true)

    const label = this.add
      .text(x, y - 48, 'TO L02', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffd9b3',
        stroke: '#2a1300',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(19)
    this.portalTexts.push(label)

    this.physics.add.overlap(this.player, portal, () => {
      this.onTravelPortalTouched('prev')
    })
  }

  private applyTravelEntrySpawnIfNeeded(collisionLayer: Phaser.Tilemaps.TilemapLayer): void {
    const entryPortal = this.pendingEntryPortal
    this.pendingEntryPortal = null

    if (entryPortal !== 'prev' && entryPortal !== 'next') return
    const fixedSpawn = this.getFixedEntrySpawnPreset(entryPortal)

    let safe: Phaser.Math.Vector2
    if (fixedSpawn) {
      safe = this.resolveStrictPlayerSpawn(fixedSpawn.x, fixedSpawn.y, collisionLayer)
    } else {
      if (!this.portalAnchors) return
      const anchor = entryPortal === 'prev' ? this.portalAnchors.prev : this.portalAnchors.next
      const inwardDir: -1 | 1 = entryPortal === 'prev' ? 1 : -1
      safe = this.resolveEntrySpawnAwayFromPortal(collisionLayer, anchor, inwardDir)
    }

    this.player.setPosition(safe.x, safe.y)
    this.player.setVelocity(0, 0)
    this.spawnPoint.x = safe.x
    this.spawnPoint.y = safe.y
    this.portalReadyAt = this.time.now + 1600
  }

  private getFixedEntrySpawnPreset(entryPortal: 'prev' | 'next'): EntrySpawnPreset | null {
    switch (this.levelConfig.mapId) {
      case 'level01':
        return entryPortal === 'prev' ? { x: 320, y: 178 } : { x: 1472, y: 178 }
      case 'level02':
        if (entryPortal === 'prev') {
          const centerX = LEVEL02_ENTRY_FROM_LEVEL01_RECT.x + LEVEL02_ENTRY_FROM_LEVEL01_RECT.w * 0.5
          const centerY = LEVEL02_ENTRY_FROM_LEVEL01_RECT.y + LEVEL02_ENTRY_FROM_LEVEL01_RECT.h * 0.5
          return {
            x: (centerX / LEVEL02_ENTRY_FROM_LEVEL01_REFERENCE.width) * this.worldWidth,
            y: (centerY / LEVEL02_ENTRY_FROM_LEVEL01_REFERENCE.height) * this.worldHeight,
          }
        }
        {
          const centerX =
            LEVEL02_LEVEL03_LINK_LEVEL02_RECT.x + LEVEL02_LEVEL03_LINK_LEVEL02_RECT.w * 0.5
          const centerY =
            LEVEL02_LEVEL03_LINK_LEVEL02_RECT.y + LEVEL02_LEVEL03_LINK_LEVEL02_RECT.h * 0.5
          return {
            x: (centerX / LEVEL02_LEVEL03_LINK_REFERENCE.width) * this.worldWidth,
            y: (centerY / LEVEL02_LEVEL03_LINK_REFERENCE.height) * this.worldHeight,
          }
        }
      case 'level03':
        // Level03 supports fixed portal-pair entry for deterministic cross-level travel.
        if (entryPortal === 'prev') {
          const centerX =
            LEVEL02_LEVEL03_LINK_LEVEL03_RECT.x + LEVEL02_LEVEL03_LINK_LEVEL03_RECT.w * 0.5
          const centerY =
            LEVEL02_LEVEL03_LINK_LEVEL03_RECT.y + LEVEL02_LEVEL03_LINK_LEVEL03_RECT.h * 0.5
          return {
            x: (centerX / LEVEL02_LEVEL03_LINK_REFERENCE.width) * this.worldWidth,
            y: (centerY / LEVEL02_LEVEL03_LINK_REFERENCE.height) * this.worldHeight,
          }
        }
        return { x: 1485, y: 341 }
      default:
        return null
    }
  }

  private pickPortalAnchors(collisionLayer: Phaser.Tilemaps.TilemapLayer): {
    prev: PortalAnchor
    next: PortalAnchor
  } {
    const reference = this.getPortalReference(collisionLayer)
    const presets = this.getPortalPresets()
    const pairDistance = this.getPortalPairMinDistance()

    if (this.levelConfig.mapId === 'level03') {
      const level03PairDistance = Math.max(pairDistance, 320)

      const prev =
        this.findPortalAnchorFromMapEdgeLoose(collisionLayer, 'left') ??
        this.findPortalAnchorFromMapEdge(collisionLayer, reference, 'left') ??
        this.pickPortalAnchorFromPreset(collisionLayer, presets.prev) ??
        this.findAnyPortalAnchor(collisionLayer, reference) ?? {
          x: 64,
          y: Math.floor(reference.floorTop - 34),
          floorTop: Math.floor(reference.floorTop),
        }

      let next =
        this.findPortalAnchorFromMapEdgeLoose(
          collisionLayer,
          'right',
          prev,
          level03PairDistance,
        ) ??
        this.findPortalAnchorFromMapEdge(
          collisionLayer,
          reference,
          'right',
          prev,
          level03PairDistance,
        ) ??
        this.findAnyPortalAnchor(collisionLayer, reference, prev, level03PairDistance, true) ??
        this.pickPortalAnchorFromPreset(collisionLayer, presets.next, prev, level03PairDistance) ?? {
          x: Math.floor(Math.max(64, this.worldWidth - 64)),
          y: Math.floor(reference.floorTop - 34),
          floorTop: Math.floor(reference.floorTop),
        }

      if (this.getPortalAnchorDistance(prev, next) < level03PairDistance) {
        const separatedNext =
          this.findPortalAnchorFromMapEdgeLoose(collisionLayer, 'right', prev) ??
          this.findPortalAnchorFromMapEdge(collisionLayer, reference, 'right', prev) ??
          this.findFarthestPortalAnchor(collisionLayer, reference, prev)
        if (separatedNext) next = separatedNext
      }

      return { prev, next }
    }

    const prev =
      this.findPortalAnchorFromMapEdge(collisionLayer, reference, 'left') ??
      this.pickPortalAnchorFromPreset(collisionLayer, presets.prev) ??
      this.findAnyPortalAnchor(collisionLayer, reference) ?? {
        x: 64,
        y: Math.floor(reference.floorTop - 34),
        floorTop: Math.floor(reference.floorTop),
      }

    const next =
      this.findPortalAnchorFromMapEdge(collisionLayer, reference, 'right', prev, pairDistance) ??
      this.pickPortalAnchorFromPreset(collisionLayer, presets.next, prev, pairDistance) ??
      this.findAnyPortalAnchor(collisionLayer, reference, prev, pairDistance, true) ?? {
        x: Math.floor(Math.max(64, this.worldWidth - 64)),
        y: Math.floor(reference.floorTop - 34),
        floorTop: Math.floor(reference.floorTop),
      }

    const fixedPrev = this.ensurePortalWalkable(collisionLayer, reference, prev, undefined, 0, 'left')
    let fixedNext = this.ensurePortalWalkable(
      collisionLayer,
      reference,
      next,
      fixedPrev,
      pairDistance,
      'right',
    )

    if (this.getPortalAnchorDistance(fixedPrev, fixedNext) < pairDistance) {
      const separatedNext =
        this.findPortalAnchorFromMapEdge(collisionLayer, reference, 'right', fixedPrev, pairDistance) ??
        this.findAnyPortalAnchor(collisionLayer, reference, fixedPrev, pairDistance, true) ??
        this.findFarthestPortalAnchor(collisionLayer, reference, fixedPrev)
      if (separatedNext) {
        fixedNext = this.ensurePortalWalkable(
          collisionLayer,
          reference,
          separatedNext,
          fixedPrev,
          pairDistance,
          'right',
        )
      }
    }

    return { prev: fixedPrev, next: fixedNext }
  }

  private getPortalPresets(): {
    prev: PortalPreset
    next: PortalPreset
  } {
    switch (this.levelConfig.mapId) {
      case 'level02':
        return {
          prev: { x: 272, floorTop: 384 },
          next: { x: 1456, floorTop: 384 },
        }
      case 'level03':
        return {
          prev: { x: 736, floorTop: 512 },
          next: { x: 864, floorTop: 512 },
        }
      case 'level01':
      default:
        return {
          prev: { x: 544, floorTop: 192 },
          next: { x: 1248, floorTop: 192 },
        }
    }
  }

  private getPortalPairMinDistance(): number {
    switch (this.levelConfig.mapId) {
      case 'level03':
        return 120
      default:
        return 180
    }
  }

  private getEntryPortalSpawnMinDistance(): number {
    switch (this.levelConfig.mapId) {
      case 'level03':
        return 176
      default:
        return 208
    }
  }

  private resolveEntrySpawnAwayFromPortal(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    anchor: PortalAnchor,
    inwardDir: -1 | 1,
  ): Phaser.Math.Vector2 {
    const desiredY = anchor.y + 20
    const minDistance = this.getEntryPortalSpawnMinDistance()
    const offsets = [224, 256, 288, 320, 192]

    let best: Phaser.Math.Vector2 | null = null
    let bestDistance = Number.NEGATIVE_INFINITY

    for (const offset of offsets) {
      const desiredX = anchor.x + inwardDir * offset
      const safe = this.resolveStrictPlayerSpawn(desiredX, desiredY, collisionLayer)
      const dist = Phaser.Math.Distance.Between(safe.x, safe.y, anchor.x, anchor.y)
      if (dist >= minDistance) return safe

      if (dist > bestDistance) {
        bestDistance = dist
        best = safe
      }
    }

    return best ?? this.resolveStrictPlayerSpawn(anchor.x + inwardDir * 224, desiredY, collisionLayer)
  }

  private getPortalAnchorDistance(a: PortalAnchor, b: PortalAnchor): number {
    return Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y)
  }

  private isPortalFarEnough(
    anchor: PortalAnchor,
    avoid?: PortalAnchor,
    minDistance = 0,
  ): boolean {
    if (!avoid || minDistance <= 0) return true
    return this.getPortalAnchorDistance(anchor, avoid) >= minDistance
  }

  private isPortalOverlappingDoor(anchor: PortalAnchor): boolean {
    for (const door of this.mechanismDoors) {
      const dx = Math.abs(anchor.x - door.blocker.x)
      const dy = Math.abs(anchor.y - door.blocker.y)
      if (dx <= 44 && dy <= 84) return true
    }
    return false
  }

  private isPortalAnchorAllowed(
    anchor: PortalAnchor,
    avoid?: PortalAnchor,
    minDistance = 0,
  ): boolean {
    if (!this.isPortalFarEnough(anchor, avoid, minDistance)) return false
    if (this.isPortalOverlappingDoor(anchor)) return false
    return true
  }

  private pickPortalAnchorFromPreset(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    preset: PortalPreset,
    avoid?: PortalAnchor,
    minDistance = 0,
  ): PortalAnchor | null {
    const xOffsets = [0, 32, -32, 64, -64, 96, -96]
    const floorOffsets = [0, 32, -32, 64, -64]

    for (const floorOffset of floorOffsets) {
      const floorTop = Phaser.Math.Clamp(
        preset.floorTop + floorOffset,
        96,
        this.worldHeight - 32,
      )

      for (const xOffset of xOffsets) {
        const x = Phaser.Math.Clamp(preset.x + xOffset, 48, this.worldWidth - 48)
        const floorTile = collisionLayer.getTileAtWorldXY(x, floorTop + 4, true)
        if (!floorTile || !floorTile.collides) continue
        if (!this.isPortalSpaceClear(collisionLayer, x, floorTop)) continue

        const anchor: PortalAnchor = {
          x: Math.floor(x),
          y: Math.floor(floorTop - 34),
          floorTop: Math.floor(floorTop),
        }
        if (!this.isPortalAnchorAllowed(anchor, avoid, minDistance)) continue
        return anchor
      }
    }

    return null
  }

  private findAnyPortalAnchor(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    reference: { x: number; floorTop: number },
    avoid?: PortalAnchor,
    minDistance = 0,
    startFromRight = false,
  ): PortalAnchor | null {
    if (startFromRight) {
      for (let x = this.worldWidth - 64; x >= 64; x -= 32) {
        const anchor = this.pickPortalAnchorOnFloor(collisionLayer, x, reference, avoid, minDistance)
        if (anchor) return anchor
      }
      return null
    }

    for (let x = 64; x <= this.worldWidth - 64; x += 32) {
      const anchor = this.pickPortalAnchorOnFloor(collisionLayer, x, reference, avoid, minDistance)
      if (anchor) return anchor
    }
    return null
  }

  private findPortalAnchorFromMapEdge(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    reference: { x: number; floorTop: number },
    edge: 'left' | 'right',
    avoid?: PortalAnchor,
    minDistance = 0,
  ): PortalAnchor | null {
    if (edge === 'left') {
      for (let x = 64; x <= this.worldWidth - 64; x += 32) {
        const anchor = this.tryBuildPortalAnchorAtX(collisionLayer, x, reference, avoid, minDistance)
        if (anchor) return anchor
      }
      return null
    }

    for (let x = this.worldWidth - 64; x >= 64; x -= 32) {
      const anchor = this.tryBuildPortalAnchorAtX(collisionLayer, x, reference, avoid, minDistance)
      if (anchor) return anchor
    }

    return null
  }

  private findPortalAnchorFromMapEdgeLoose(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    edge: 'left' | 'right',
    avoid?: PortalAnchor,
    minDistance = 0,
  ): PortalAnchor | null {
    if (edge === 'left') {
      for (let x = 64; x <= this.worldWidth - 64; x += 32) {
        const anchor = this.findPortalAnchorAtXLoose(collisionLayer, x, edge, avoid, minDistance)
        if (anchor) return anchor
      }
      return null
    }

    for (let x = this.worldWidth - 64; x >= 64; x -= 32) {
      const anchor = this.findPortalAnchorAtXLoose(collisionLayer, x, edge, avoid, minDistance)
      if (anchor) return anchor
    }

    return null
  }

  private findPortalAnchorAtXLoose(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    targetX: number,
    edge: 'left' | 'right',
    avoid?: PortalAnchor,
    minDistance = 0,
  ): PortalAnchor | null {
    const x = Phaser.Math.Clamp(Math.floor(targetX), 48, Math.max(48, this.worldWidth - 48))

    for (let probeY = this.worldHeight - 40; probeY >= 96; probeY -= 8) {
      const floorTile = collisionLayer.getTileAtWorldXY(x, probeY, true)
      if (!floorTile || !floorTile.collides) continue
      const floorTop = floorTile.getTop()
      if (!this.isPortalSpaceClearOnEdge(collisionLayer, x, floorTop, edge)) continue

      const anchor: PortalAnchor = {
        x: Math.floor(x),
        y: Math.floor(floorTop - 34),
        floorTop: Math.floor(floorTop),
      }

      if (!this.isPortalApproachOpen(collisionLayer, anchor, edge)) continue
      if (!this.isPortalAnchorAllowed(anchor, avoid, minDistance)) continue
      return anchor
    }

    return null
  }

  private isPortalSpaceClearOnEdge(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    centerX: number,
    floorTop: number,
    edge: 'left' | 'right',
  ): boolean {
    const bodyXOffsets = [-14, -8, 0, 8, 14]
    const bodyYOffsets = [6, 16, 26, 36, 46, 56, 66]

    for (const xOffset of bodyXOffsets) {
      for (const yOffset of bodyYOffsets) {
        const tile = collisionLayer.getTileAtWorldXY(centerX + xOffset, floorTop - yOffset, true)
        if (tile && tile.collides) return false
      }
    }

    const footChecks = [-12, 0, 12]
    for (const xOffset of footChecks) {
      const floorTile = collisionLayer.getTileAtWorldXY(centerX + xOffset, floorTop + 4, true)
      if (!floorTile || !floorTile.collides) return false
    }

    const inwardOffset = edge === 'left' ? 24 : -24
    for (const yOffset of [12, 24, 36, 48, 60]) {
      const tile = collisionLayer.getTileAtWorldXY(centerX + inwardOffset, floorTop - yOffset, true)
      if (tile && tile.collides) return false
    }

    return true
  }

  private isPortalApproachOpen(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    anchor: PortalAnchor,
    edge: 'left' | 'right',
  ): boolean {
    const inwardDir = edge === 'left' ? 1 : -1
    const approachCandidates = [anchor.x + inwardDir * 22, anchor.x - inwardDir * 22]

    for (const approachX of approachCandidates) {
      const x = Phaser.Math.Clamp(approachX, 24, this.worldWidth - 24)
      const floorTile = collisionLayer.getTileAtWorldXY(x, anchor.floorTop + 4, true)
      if (!floorTile || !floorTile.collides) continue
      if (!this.isPlayerSpaceClear(collisionLayer, x, anchor.floorTop)) continue
      return true
    }

    return false
  }

  private findFarthestPortalAnchor(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    reference: { x: number; floorTop: number },
    avoid: PortalAnchor,
  ): PortalAnchor | null {
    let best: PortalAnchor | null = null
    let bestDistance = Number.NEGATIVE_INFINITY

    for (let x = 64; x <= this.worldWidth - 64; x += 32) {
      const anchor = this.pickPortalAnchorOnFloor(collisionLayer, x, reference)
      if (!anchor) continue
      const dist = this.getPortalAnchorDistance(anchor, avoid)
      if (dist <= bestDistance) continue
      bestDistance = dist
      best = anchor
    }

    return best
  }

  private getPortalReference(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
  ): {
    x: number
    floorTop: number
  } {
    const safe = this.resolveSafePlayerSpawn(this.mapBaseSpawn.x, this.mapBaseSpawn.y, collisionLayer)
    return {
      x: safe.x,
      floorTop: Math.floor(safe.y + 14),
    }
  }

  private pickPortalAnchorOnFloor(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    targetX: number,
    reference: { x: number; floorTop: number },
    avoid?: PortalAnchor,
    minDistance = 0,
  ): PortalAnchor | null {
    const clampedTarget = Math.floor(
      Phaser.Math.Clamp(targetX, 48, Math.max(48, this.worldWidth - 48)),
    )
    const offsets = [0, 32, -32, 64, -64, 96, -96, 128, -128, 160, -160, 192, -192]

    for (const offset of offsets) {
      const x = Phaser.Math.Clamp(clampedTarget + offset, 48, Math.max(48, this.worldWidth - 48))
      const anchor = this.tryBuildPortalAnchorAtX(collisionLayer, x, reference, avoid, minDistance)
      if (!anchor) continue
      return anchor
    }

    return null
  }

  private tryBuildPortalAnchorAtX(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    targetX: number,
    reference: { x: number; floorTop: number },
    avoid?: PortalAnchor,
    minDistance = 0,
  ): PortalAnchor | null {
    const x = Phaser.Math.Clamp(Math.floor(targetX), 48, Math.max(48, this.worldWidth - 48))
    const floorTop = Math.floor(reference.floorTop)
    const floorTile = collisionLayer.getTileAtWorldXY(x, floorTop + 4, true)
    if (!floorTile || !floorTile.collides) return null
    if (!this.isPortalSpaceClear(collisionLayer, x, floorTop)) return null

    const anchor: PortalAnchor = {
      x: Math.floor(x),
      y: Math.floor(floorTop - 34),
      floorTop: Math.floor(floorTop),
    }
    if (!this.isPortalReachable(collisionLayer, anchor, reference)) return null
    if (!this.isPortalAnchorAllowed(anchor, avoid, minDistance)) return null
    return anchor
  }

  private isPortalReachable(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    anchor: PortalAnchor,
    reference: { x: number; floorTop: number },
  ): boolean {
    if (Math.abs(anchor.floorTop - reference.floorTop) > 10) return false

    const approachCandidates = [anchor.x - 22, anchor.x + 22]
    for (const approachX of approachCandidates) {
      const x = Phaser.Math.Clamp(approachX, 24, this.worldWidth - 24)
      const floorTile = collisionLayer.getTileAtWorldXY(x, anchor.floorTop + 4, true)
      if (!floorTile || !floorTile.collides) continue
      if (!this.isPlayerSpaceClear(collisionLayer, x, anchor.floorTop)) continue
      if (!this.isFloorLaneWalkable(collisionLayer, reference.x, x, anchor.floorTop)) continue
      return true
    }

    return false
  }

  private isFloorLaneWalkable(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    fromX: number,
    toX: number,
    floorTop: number,
  ): boolean {
    const left = Math.min(fromX, toX)
    const right = Math.max(fromX, toX)

    for (let x = left; x <= right; x += 8) {
      const floorTile = collisionLayer.getTileAtWorldXY(x, floorTop + 4, true)
      if (!floorTile || !floorTile.collides) return false

      const bodyTile = collisionLayer.getTileAtWorldXY(x, floorTop - 12, true)
      const headTile = collisionLayer.getTileAtWorldXY(x, floorTop - 24, true)
      if ((bodyTile && bodyTile.collides) || (headTile && headTile.collides)) return false
    }

    return true
  }

  private ensurePortalWalkable(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    reference: { x: number; floorTop: number },
    anchor: PortalAnchor,
    avoid?: PortalAnchor,
    minDistance = 0,
    preferredEdge?: 'left' | 'right',
  ): PortalAnchor {
    const normalized: PortalAnchor = {
      x: anchor.x,
      y: anchor.y,
      floorTop: anchor.floorTop,
    }

    if (
      this.isPortalReachable(collisionLayer, normalized, reference) &&
      this.isPortalAnchorAllowed(normalized, avoid, minDistance)
    ) {
      return normalized
    }

    const offsets =
      preferredEdge === 'left'
        ? [-32, -64, -96, -128, -160, 32, 64, 96, 128, 160]
        : preferredEdge === 'right'
          ? [32, 64, 96, 128, 160, -32, -64, -96, -128, -160]
          : [32, -32, 64, -64, 96, -96, 128, -128, 160, -160]

    for (const offset of offsets) {
      const x = Phaser.Math.Clamp(normalized.x + offset, 48, this.worldWidth - 48)
      const floorTile = collisionLayer.getTileAtWorldXY(x, normalized.floorTop + 4, true)
      if (!floorTile || !floorTile.collides) continue
      if (!this.isPortalSpaceClear(collisionLayer, x, normalized.floorTop)) continue
      const shifted: PortalAnchor = { x: Math.floor(x), y: normalized.y, floorTop: normalized.floorTop }
      if (!this.isPortalAnchorAllowed(shifted, avoid, minDistance)) continue
      if (this.isPortalReachable(collisionLayer, shifted, reference)) return shifted
    }

    const broadSearch =
      (preferredEdge
        ? this.findPortalAnchorFromMapEdge(
            collisionLayer,
            reference,
            preferredEdge,
            avoid,
            minDistance,
          )
        : null) ??
      this.findAnyPortalAnchor(
        collisionLayer,
        reference,
        avoid,
        minDistance,
        preferredEdge === 'right',
      ) ??
      this.pickPortalAnchorOnFloor(collisionLayer, this.worldWidth * 0.5, reference, avoid, minDistance)
    if (broadSearch) return broadSearch

    if (avoid && minDistance > 0) {
      const farthest = this.findFarthestPortalAnchor(collisionLayer, reference, avoid)
      if (farthest) return farthest
    }

    return normalized
  }

  private isPortalSpaceClear(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    centerX: number,
    floorTop: number,
  ): boolean {
    const bodyXOffsets = [-14, -8, 0, 8, 14]
    const bodyYOffsets = [6, 16, 26, 36, 46, 56, 66]

    for (const xOffset of bodyXOffsets) {
      for (const yOffset of bodyYOffsets) {
        const tile = collisionLayer.getTileAtWorldXY(centerX + xOffset, floorTop - yOffset, true)
        if (tile && tile.collides) return false
      }
    }

    const footChecks = [-12, 0, 12]
    for (const xOffset of footChecks) {
      const floorTile = collisionLayer.getTileAtWorldXY(centerX + xOffset, floorTop + 4, true)
      if (!floorTile || !floorTile.collides) return false
    }

    const sideOffsets = [-24, 24]
    let sideOpenCount = 0
    for (const sideOffset of sideOffsets) {
      let blocked = false
      for (const yOffset of [12, 24, 36, 48, 60]) {
        const tile = collisionLayer.getTileAtWorldXY(centerX + sideOffset, floorTop - yOffset, true)
        if (tile && tile.collides) {
          blocked = true
          break
        }
      }
      if (!blocked) sideOpenCount += 1
    }

    return sideOpenCount >= 2
  }

  private onTravelPortalTouched(kind: 'prev' | 'next'): void {
    if (this.transitioning || this.time.now < this.portalReadyAt) return
    const target = kind === 'prev' ? this.levelConfig.prevTravel : this.levelConfig.nextTravel
    const entryPortal: 'prev' | 'next' = kind === 'next' ? 'prev' : 'next'
    const fallbackSpawnX = kind === 'prev' ? this.worldWidth - 184 : 184
    const fallbackSpawnY = this.worldHeight - 96
    const spawnX =
      target.mapId === 'level03' ? (entryPortal === 'prev' ? 288 : 1485) : fallbackSpawnX
    const spawnY = target.mapId === 'level03' ? 341 : fallbackSpawnY
    this.travelToLinkedLevel(target, spawnX, spawnY, entryPortal)
  }

  private travelToLinkedLevel(
    target: LevelTravel,
    spawnX: number,
    spawnY: number,
    entryPortal?: 'prev' | 'next',
  ): void {
    if (this.transitioning) return
    this.transitioning = true
    this.saveTickMs = 0
    this.exitLadderState()

    const roomCount = Level01Scene.ROOM_SEGMENTS
    const sectionWidth = Math.max(1, this.worldWidth / roomCount)
    const idx = Phaser.Math.Clamp(Math.floor(spawnX / sectionWidth), 0, roomCount - 1)
    const targetRoom = `${target.mapId}:${idx}`

    mutateSave(this, (save) => {
      save.map.mapId = target.mapId
      save.map.currentRoom = targetRoom
      if (!save.map.visited.includes(targetRoom)) {
        save.map.visited.push(targetRoom)
      }

      save.runtime.mapId = target.mapId
      save.runtime.x = Math.floor(spawnX)
      save.runtime.y = Math.floor(spawnY)
      save.runtime.hp = this.player.getHp()
      save.runtime.maxHp = this.player.getMaxHp()
    })

    if (this.scene.isActive('EquipmentScene')) this.scene.stop('EquipmentScene')
    if (this.scene.isActive('InventoryScene')) this.scene.stop('InventoryScene')
    if (this.scene.isActive('MapScene')) this.scene.stop('MapScene')
    if (this.scene.isActive('ArchiveScene')) this.scene.stop('ArchiveScene')

    const manager = this.scene.manager as Phaser.Scenes.SceneManager & {
      keys?: Record<string, unknown>
    }
    const targetRegistered = !!manager.keys?.[target.sceneKey]
    if (!targetRegistered) {
      this.transitioning = false
      this.showTravelFailureBanner(`Scene not registered: ${target.sceneKey}`)
      return
    }

    try {
      // Use start() for deterministic handoff; launch()+timed checks can stall when preload takes longer.
      this.scene.start(target.sceneKey, { entryPortal: entryPortal ?? null })
    } catch (error) {
      this.transitioning = false
      const msg = error instanceof Error ? error.message : String(error)
      this.showTravelFailureBanner(`Start failed: ${target.sceneKey}\n${msg}`)
    }
  }

  private showTravelFailureBanner(message: string): void {
    this.add
      .rectangle(14, 82, 620, 54, 0x2a0b0f, 0.92)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(300)
    this.add
      .text(24, 94, `Travel error\n${message}`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#fecaca',
        stroke: '#111827',
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(301)
  }

  private createMechanismDoors(collisionLayer: Phaser.Tilemaps.TilemapLayer): void {
    const configs = this.getMechanismDoorConfigs()

    for (const config of configs) {
      const placement = this.resolveMechanismDoorPlacement(collisionLayer, config)
      if (!placement) continue
      const { anchor, unlockSide, switchX, switchY } = placement

      const blocker = this.add
        .rectangle(anchor.x, anchor.y, 30, 92, 0x475569, 0.82)
        .setStrokeStyle(2, 0xe2e8f0, 0.92)
        .setDepth(21)
      this.physics.add.existing(blocker, true)

      this.physics.add.collider(this.player, blocker)
      this.physics.add.collider(this.enemies, blocker)

      const panel = this.add
        .rectangle(switchX, switchY, 14, 24, 0xfbbf24, 0.9)
        .setStrokeStyle(1, 0xfef3c7, 1)
        .setDepth(22)

      const hint = this.add
        .text(switchX, switchY - 24, 'R OPEN', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#fef3c7',
          stroke: '#2d1b00',
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(23)
        .setVisible(false)

      this.mechanismDoors.push({
        id: config.id,
        unlockSide,
        blocker,
        panel,
        hint,
        switchX,
        switchY,
        opened: false,
      })
    }
  }

  private getMechanismDoorConfigs(): MechanismDoorConfig[] {
    return []
  }

  private resolveMechanismDoorPlacement(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    config: MechanismDoorConfig,
  ): {
    anchor: DoorAnchor
    unlockSide: 'left' | 'right'
    switchX: number
    switchY: number
  } | null {
    const desiredX = Math.floor(
      Phaser.Math.Clamp(this.worldWidth * config.xRatio, 64, this.worldWidth - 64),
    )
    const sideOrder: Array<'left' | 'right'> =
      config.unlockSide === 'left' ? ['left', 'right'] : ['right', 'left']

    const offsets = [
      0, 32, -32, 64, -64, 96, -96, 128, -128, 160, -160, 192, -192, 224, -224, 256, -256,
    ]

    for (const offset of offsets) {
      const x = Phaser.Math.Clamp(desiredX + offset, 48, this.worldWidth - 48)
      const anchor = this.findDoorGround(collisionLayer, x, 92)
      if (!anchor) continue
      if (!this.isKeyPassageAnchor(collisionLayer, anchor)) continue

      for (const unlockSide of sideOrder) {
        const switchSpot = this.findDoorSwitchSpot(collisionLayer, anchor, unlockSide)
        if (!switchSpot) continue
        return {
          anchor,
          unlockSide,
          switchX: switchSpot.x,
          switchY: switchSpot.y,
        }
      }
    }

    return null
  }

  private findDoorSwitchSpot(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    anchor: DoorAnchor,
    unlockSide: 'left' | 'right',
  ): { x: number; y: number } | null {
    const standX = this.findSideStandSpotX(collisionLayer, anchor, unlockSide)
    if (standX === null) {
      return this.createDoorSwitchFallback(collisionLayer, anchor, unlockSide)
    }

    const standFloor = collisionLayer.getTileAtWorldXY(standX, anchor.floorTop + 4, true)
    const floorTop = standFloor?.getTop() ?? anchor.floorTop
    const switchX = standX
    const switchY = floorTop - 18
    if (this.isSwitchPlacementValid(collisionLayer, switchX, switchY, floorTop, anchor.x, unlockSide)) {
      return { x: Math.floor(switchX), y: Math.floor(switchY) }
    }

    return this.createDoorSwitchFallback(collisionLayer, anchor, unlockSide)
  }

  private isSwitchPlacementValid(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    switchX: number,
    switchY: number,
    floorTop: number,
    doorX: number,
    unlockSide: 'left' | 'right',
  ): boolean {
    const panelProbeX = [-5, 0, 5]
    const panelProbeY = [6, 14, 22]
    for (const xOffset of panelProbeX) {
      for (const yOffset of panelProbeY) {
        const tile = collisionLayer.getTileAtWorldXY(switchX + xOffset, switchY + 12 - yOffset, true)
        if (tile && tile.collides) return false
      }
    }

    let standSpots = 0
    const standOffsets = [-14, 0, 14]
    for (const xOffset of standOffsets) {
      const probeX = switchX + xOffset
      const floorTile = collisionLayer.getTileAtWorldXY(probeX, floorTop + 4, true)
      if (!floorTile || !floorTile.collides) continue
      if (!this.isPlayerSpaceClear(collisionLayer, probeX, floorTop)) continue
      standSpots += 1
    }

    if (standSpots < 2) return false

    const sideDir = unlockSide === 'left' ? -1 : 1
    const nearDoorX = doorX + sideDir * 18
    return this.isHorizontalLaneClear(collisionLayer, switchX, nearDoorX, floorTop)
  }

  private isKeyPassageAnchor(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    anchor: DoorAnchor,
  ): boolean {
    const leftStand = this.findSideStandSpotX(collisionLayer, anchor, 'left')
    const rightStand = this.findSideStandSpotX(collisionLayer, anchor, 'right')
    if (leftStand === null || rightStand === null) return false
    if (Math.abs(leftStand - rightStand) < 56) return false
    return true
  }

  private findSideStandSpotX(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    anchor: DoorAnchor,
    side: 'left' | 'right',
  ): number | null {
    const dir = side === 'left' ? -1 : 1
    const distCandidates = [44, 56, 68, 80, 92, 106, 120]

    for (const dist of distCandidates) {
      const x = Phaser.Math.Clamp(anchor.x + dir * dist, 32, this.worldWidth - 32)
      const floorTile = collisionLayer.getTileAtWorldXY(x, anchor.floorTop + 4, true)
      if (!floorTile || !floorTile.collides) continue

      const floorTop = floorTile.getTop()
      if (Math.abs(floorTop - anchor.floorTop) > 26) continue
      if (!this.isPlayerSpaceClear(collisionLayer, x, floorTop)) continue
      if (!this.isHorizontalLaneClear(collisionLayer, x, anchor.x + dir * 14, floorTop)) continue

      return Math.floor(x)
    }

    return null
  }

  private isHorizontalLaneClear(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    fromX: number,
    toX: number,
    floorTop: number,
  ): boolean {
    const left = Math.min(fromX, toX)
    const right = Math.max(fromX, toX)

    for (let x = left; x <= right; x += 8) {
      const upper = collisionLayer.getTileAtWorldXY(x, floorTop - 24, true)
      const middle = collisionLayer.getTileAtWorldXY(x, floorTop - 12, true)
      if ((upper && upper.collides) || (middle && middle.collides)) return false
    }

    return true
  }

  private createDoorSwitchFallback(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    anchor: DoorAnchor,
    unlockSide: 'left' | 'right',
  ): { x: number; y: number } | null {
    const dir = unlockSide === 'left' ? -1 : 1
    const tileSize = 32
    const doorTx = Phaser.Math.Clamp(Math.floor(anchor.x / tileSize), 2, Math.floor(this.worldWidth / tileSize) - 3)
    const floorTy = Phaser.Math.Clamp(
      Math.floor(anchor.floorTop / tileSize),
      2,
      Math.floor(this.worldHeight / tileSize) - 2,
    )
    const switchTx = Phaser.Math.Clamp(doorTx + dir * 3, 2, Math.floor(this.worldWidth / tileSize) - 3)

    const bridgeStart = Math.min(doorTx + dir, switchTx - 1)
    const bridgeEnd = Math.max(doorTx + dir, switchTx + 1)
    for (let tx = bridgeStart; tx <= bridgeEnd; tx += 1) {
      collisionLayer.putTileAt(2, tx, floorTy)
      collisionLayer.putTileAt(-1, tx, floorTy - 1)
      collisionLayer.putTileAt(-1, tx, floorTy - 2)
      collisionLayer.putTileAt(-1, tx, floorTy - 3)
    }

    const switchX = switchTx * tileSize + tileSize / 2
    const floorTop = floorTy * tileSize
    const switchY = floorTop - 18

    if (!this.isSwitchPlacementValid(collisionLayer, switchX, switchY, floorTop, anchor.x, unlockSide)) {
      return null
    }

    return { x: Math.floor(switchX), y: Math.floor(switchY) }
  }

  private findDoorGround(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    x: number,
    doorHeight: number,
  ): DoorAnchor | null {
    for (let probeY = this.worldHeight - 40; probeY >= 96; probeY -= 8) {
      const tile = collisionLayer.getTileAtWorldXY(x, probeY, true)
      if (!tile || !tile.collides) continue

      const floorTop = tile.getTop()
      const y = floorTop - doorHeight / 2
      if (y < 90) continue
      if (!this.isDoorSpaceClear(collisionLayer, x, floorTop, doorHeight)) continue

      return { x: Math.floor(x), y: Math.floor(y), floorTop }
    }
    return null
  }

  private isDoorSpaceClear(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    x: number,
    floorTop: number,
    doorHeight: number,
  ): boolean {
    const xOffsets = [-11, 0, 11]
    for (const xOffset of xOffsets) {
      for (let yOffset = 8; yOffset < doorHeight; yOffset += 14) {
        const tile = collisionLayer.getTileAtWorldXY(x + xOffset, floorTop - yOffset, true)
        if (tile && tile.collides) return false
      }
    }
    return true
  }

  private tryOpenMechanismDoor(): void {
    let target: MechanismDoorState | null = null
    let bestDist = Number.POSITIVE_INFINITY

    for (const door of this.mechanismDoors) {
      if (!this.canInteractDoor(door)) continue
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, door.switchX, door.switchY)
      if (dist < bestDist) {
        bestDist = dist
        target = door
      }
    }

    if (!target) return
    this.openMechanismDoor(target)
  }

  private updateDoorInteractHints(): void {
    for (const door of this.mechanismDoors) {
      if (door.opened) {
        door.hint.setVisible(false)
        continue
      }
      door.hint.setVisible(this.canInteractDoor(door))
    }
  }

  private canInteractDoor(door: MechanismDoorState): boolean {
    if (door.opened) return false

    if (door.unlockSide === 'left' && this.player.x >= door.blocker.x - 4) return false
    if (door.unlockSide === 'right' && this.player.x <= door.blocker.x + 4) return false

    const dx = Math.abs(this.player.x - door.switchX)
    const dy = Math.abs(this.player.y - door.switchY)
    return dx <= 24 && dy <= 48
  }

  private openMechanismDoor(door: MechanismDoorState): void {
    if (door.opened) return
    door.opened = true

    const body = door.blocker.body as Phaser.Physics.Arcade.StaticBody
    body.enable = false

    door.panel.setFillStyle(0x86efac, 0.95)
    door.hint.setVisible(false)
    ParticleFx.hit(this, door.blocker.x, door.blocker.y, 10)
    Sfx.hit(0.02)

    this.tweens.add({
      targets: door.blocker,
      alpha: 0.15,
      duration: 220,
    })
  }

  private buildArtTerrain(
    map: Phaser.Tilemaps.Tilemap,
    tiles: Phaser.Tilemaps.Tileset,
    collision: Phaser.Tilemaps.TilemapLayer,
  ): void {
    const edgeLayer = map.createBlankLayer('ArtEdge', tiles, 0, 0)
    if (!edgeLayer) return
    edgeLayer.setDepth(0)
    edgeLayer.setScale(1)

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
          edgeLayer.putTileAt(this.pickInteriorTileId(x, y), x, y)
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
    // IDs are mapped for env_ground.png (15x15, tile size 32).
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

    return this.pickInteriorTileId(x, y)
  }

  private pickInteriorTileId(x: number, y: number): number {
    return this.pickByPos(x, y, [
      79, 124, 128, 129, 137, 138, 139, 140, 149, 152, 155, 158, 161, 168, 169, 174, 175,
    ])
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

  private resolveSafePlayerSpawn(
    rawX: number,
    rawY: number,
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
  ): Phaser.Math.Vector2 {
    const originX = Phaser.Math.Clamp(rawX, 48, this.worldWidth - 48)
    const originY = Phaser.Math.Clamp(rawY, 56, this.worldHeight - 64)
    const xOffsets = [0, 32, -32, 64, -64, 96, -96, 128, -128, 160, -160, 192, -192, 224, -224]

    let best: PlayerSpawnAnchor | null = null
    let bestScore = Number.POSITIVE_INFINITY

    for (const xOffset of xOffsets) {
      const x = Phaser.Math.Clamp(originX + xOffset, 48, this.worldWidth - 48)
      const anchor = this.findPlayerGround(collisionLayer, x, originY)
      if (!anchor) continue
      if (!this.isSpawnAnchorOpen(collisionLayer, anchor)) continue

      const score = Math.abs(anchor.x - originX) + Math.abs(anchor.y - originY) * 0.35
      if (score < bestScore) {
        bestScore = score
        best = anchor
      }
    }

    if (best) return new Phaser.Math.Vector2(best.x, best.y)

    const baseX = Phaser.Math.Clamp(this.mapBaseSpawn.x, 48, this.worldWidth - 48)
    const baseY = Phaser.Math.Clamp(this.mapBaseSpawn.y, 56, this.worldHeight - 64)
    for (const xOffset of xOffsets) {
      const x = Phaser.Math.Clamp(baseX + xOffset, 48, this.worldWidth - 48)
      const anchor = this.findPlayerGround(collisionLayer, x, baseY)
      if (!anchor) continue
      if (!this.isSpawnAnchorOpen(collisionLayer, anchor)) continue
      return new Phaser.Math.Vector2(anchor.x, anchor.y)
    }

    return new Phaser.Math.Vector2(baseX, baseY)
  }

  private resolveStrictPlayerSpawn(
    rawX: number,
    rawY: number,
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
  ): Phaser.Math.Vector2 {
    const primary = this.resolveSafePlayerSpawn(rawX, rawY, collisionLayer)
    if (this.isSpawnPositionStrictlySafe(collisionLayer, primary.x, primary.y)) return primary

    const xOffsets = [
      0, 24, -24, 48, -48, 72, -72, 96, -96, 128, -128, 160, -160, 192, -192, 224, -224, 256,
      -256, 288, -288,
    ]
    const yOffsets = [0, -16, 16, -32, 32, -48, 48]

    let best: Phaser.Math.Vector2 | null = null
    let bestScore = Number.POSITIVE_INFINITY

    for (const xOffset of xOffsets) {
      for (const yOffset of yOffsets) {
        const candidate = this.resolveSafePlayerSpawn(rawX + xOffset, rawY + yOffset, collisionLayer)
        if (!this.isSpawnPositionStrictlySafe(collisionLayer, candidate.x, candidate.y)) continue
        const score = Math.abs(candidate.x - rawX) + Math.abs(candidate.y - rawY) * 0.6
        if (score < bestScore) {
          bestScore = score
          best = candidate
        }
      }
    }

    if (best) return best

    const base = this.resolveSafePlayerSpawn(this.mapBaseSpawn.x, this.mapBaseSpawn.y, collisionLayer)
    if (this.isSpawnPositionStrictlySafe(collisionLayer, base.x, base.y)) return base

    for (let x = 64; x <= this.worldWidth - 64; x += 32) {
      const candidate = this.resolveSafePlayerSpawn(x, this.mapBaseSpawn.y, collisionLayer)
      if (this.isSpawnPositionStrictlySafe(collisionLayer, candidate.x, candidate.y)) return candidate
    }

    return primary
  }

  private isSpawnPositionStrictlySafe(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    centerX: number,
    centerY: number,
  ): boolean {
    const floorTop = centerY + 14
    const clampedX = Phaser.Math.Clamp(centerX, 48, this.worldWidth - 48)
    const clampedY = Phaser.Math.Clamp(centerY, 56, this.worldHeight - 56)

    if (!this.isPlayerSpaceClear(collisionLayer, clampedX, floorTop)) return false

    const footChecks = [-6, 0, 6]
    for (const xOffset of footChecks) {
      const floorTile = collisionLayer.getTileAtWorldXY(clampedX + xOffset, floorTop + 4, true)
      if (!floorTile || !floorTile.collides) return false
    }

    const sideXOffsets = [-10, 10]
    const sideYOffsets = [6, 14, 22]
    for (const xOffset of sideXOffsets) {
      for (const yOffset of sideYOffsets) {
        const tile = collisionLayer.getTileAtWorldXY(clampedX + xOffset, floorTop - yOffset, true)
        if (tile && tile.collides) return false
      }
    }

    if (this.isInsideClosedDoor(clampedX, clampedY)) return false
    return true
  }

  private isInsideClosedDoor(x: number, y: number): boolean {
    for (const door of this.mechanismDoors) {
      if (door.opened) continue
      const halfW = door.blocker.width * 0.5 + 8
      const halfH = door.blocker.height * 0.5 + 14
      if (Math.abs(x - door.blocker.x) <= halfW && Math.abs(y - door.blocker.y) <= halfH) {
        return true
      }
    }
    return false
  }

  private findPlayerGround(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    x: number,
    targetY: number,
  ): PlayerSpawnAnchor | null {
    const startY = Phaser.Math.Clamp(targetY - 180, 64, this.worldHeight - 80)
    const endY = Phaser.Math.Clamp(targetY + 260, 96, this.worldHeight - 24)

    for (let probeY = startY; probeY <= endY; probeY += 8) {
      const tile = collisionLayer.getTileAtWorldXY(x, probeY, true)
      if (!tile || !tile.collides) continue

      const floorTop = tile.getTop()
      const centerY = floorTop - 14
      if (centerY < 56 || centerY > this.worldHeight - 56) continue
      if (!this.isPlayerSpaceClear(collisionLayer, x, floorTop)) continue
      return { x: Math.floor(x), y: Math.floor(centerY), floorTop: Math.floor(floorTop) }
    }

    return null
  }

  private isSpawnAnchorOpen(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    anchor: PlayerSpawnAnchor,
  ): boolean {
    const left = this.measureSpawnWalkDistance(collisionLayer, anchor.x, anchor.floorTop, -1)
    const right = this.measureSpawnWalkDistance(collisionLayer, anchor.x, anchor.floorTop, 1)
    const longest = Math.max(left, right)
    const bothSides = left >= 48 && right >= 48
    return longest >= 128 || bothSides
  }

  private measureSpawnWalkDistance(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    startX: number,
    floorTop: number,
    dir: -1 | 1,
  ): number {
    let lastGood = 0
    for (let dist = 8; dist <= 240; dist += 8) {
      const x = Phaser.Math.Clamp(startX + dir * dist, 24, this.worldWidth - 24)
      const floorTile = collisionLayer.getTileAtWorldXY(x, floorTop + 4, true)
      if (!floorTile || !floorTile.collides) break
      if (!this.isPlayerSpaceClear(collisionLayer, x, floorTop)) break
      lastGood = dist
    }
    return lastGood
  }

  private isPlayerSpaceClear(
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    centerX: number,
    floorTop: number,
  ): boolean {
    const xOffsets = [-7, 0, 7]
    const yOffsets = [8, 16, 24]

    for (const xOffset of xOffsets) {
      for (const yOffset of yOffsets) {
        const tile = collisionLayer.getTileAtWorldXY(centerX + xOffset, floorTop - yOffset, true)
        if (tile && tile.collides) return false
      }
    }

    return true
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

  private performShoot(): void {
    const action = this.player.tryShootEquipped()
    if (!action) return

    if (action.kind === 'grenade') {
      this.performGrenadeThrow(action)
      return
    }

    if (action.weapon === 'pistol') {
      this.performBulletProjectileShot(action, 'pistol-bullet', 760, 0xfff0a8, 45, 0.0025, 0.014)
      return
    }

    if (action.weapon === 'rifle') {
      this.performBulletProjectileShot(action, 'rifle-bullet', 980, 0xfff6bd, 65, 0.0032, 0.018)
    }
  }

  private performBulletProjectileShot(
    shot: PlayerShot,
    bulletTextureKey: string,
    speedPxPerSec: number,
    hitColor: number,
    shakeDurationMs: number,
    shakeIntensity: number,
    sfxVolume: number,
  ): void {
    if (!this.textures.exists(bulletTextureKey)) {
      const fallbackColor = shot.weapon === 'rifle' ? 0xfff6bd : 0xfff0a8
      const fallbackFlash = shot.weapon === 'rifle' ? 0xffb12a : 0xff9d1e
      this.performPlayerShot(shot, fallbackColor, fallbackFlash)
      return
    }

    const bullet = this.add
      .sprite(shot.x, shot.y, bulletTextureKey)
      .setFlipX(shot.dir < 0)
      .setDepth(26)

    const tickMs = 16
    const sampleStepPx = 4
    let currentX = shot.x
    let traveled = 0
    let timer: Phaser.Time.TimerEvent | null = null

    const stopBullet = () => {
      timer?.remove(false)
      timer = null
      bullet.destroy()
    }

    const hitEnemy = (enemy: Slime) => {
      stopBullet()
      const damaged = DamageSystem.apply(enemy, shot.damage, shot.x)
      if (!damaged) return

      FlashFx.hit(enemy, 80, hitColor)
      ParticleFx.hit(this, enemy.x, enemy.y, 8 + shot.damage * 2)
      ShakeFx.hit(this.cameras.main, shakeDurationMs, shakeIntensity)
      Sfx.hit(sfxVolume)
    }

    const hitWall = (x: number) => {
      stopBullet()
      this.spawnPistolWallImpact(x - shot.dir * 4, shot.y, shot.dir)
      ShakeFx.hit(this.cameras.main, 35, 0.0018)
      Sfx.hit(0.01)
    }

    timer = this.time.addEvent({
      delay: tickMs,
      loop: true,
      callback: () => {
        const remaining = shot.range - traveled
        if (remaining <= 0) {
          stopBullet()
          return
        }

        const move = Math.min((speedPxPerSec * tickMs) / 1000, remaining)
        const nextX = currentX + shot.dir * move
        const samples = Math.max(1, Math.ceil(Math.abs(nextX - currentX) / sampleStepPx))

        for (let i = 1; i <= samples; i += 1) {
          const x = Phaser.Math.Linear(currentX, nextX, i / samples)
          const enemy = this.findBulletEnemyHit(x, shot.y, shot.width)
          if (enemy) {
            bullet.setPosition(x, shot.y)
            hitEnemy(enemy)
            return
          }

          if (this.isBulletBlockedAt(x, shot.y)) {
            bullet.setPosition(x, shot.y)
            hitWall(x)
            return
          }
        }

        currentX = nextX
        traveled += move
        bullet.setPosition(currentX, shot.y)
      },
    })
  }

  private findBulletEnemyHit(x: number, y: number, height: number): Slime | null {
    const bulletBounds = new Phaser.Geom.Rectangle(x - 5, y - height * 0.5, 10, height)

    for (const enemy of this.enemyList) {
      if (!enemy.active || enemy.dead) continue
      const body = enemy.body as Phaser.Physics.Arcade.Body | null
      if (!body) continue

      const enemyBounds = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height)
      if (Phaser.Geom.Rectangle.Overlaps(bulletBounds, enemyBounds)) return enemy
    }

    return null
  }

  private isBulletBlockedAt(x: number, y: number): boolean {
    if (x < 0 || x > this.worldWidth || y < 0 || y > this.worldHeight) return true
    if (this.isPointInsideStaticGroup(this.level01CollisionBodies, x, y)) return true
    if (this.isPointInsideStaticGroup(this.level03CollisionBodies, x, y)) return true

    for (const door of this.mechanismDoors) {
      if (door.opened) continue
      const body = door.blocker.body as Phaser.Physics.Arcade.StaticBody | null
      if (body && !body.enable) continue
      if (Phaser.Geom.Rectangle.Contains(door.blocker.getBounds(), x, y)) return true
    }

    const tile = this.collisionLayer.getTileAtWorldXY(x, y, true)
    return !!tile?.collides
  }

  private isPointInsideStaticGroup(
    group: Phaser.Physics.Arcade.StaticGroup | undefined,
    x: number,
    y: number,
  ): boolean {
    if (!group) return false

    for (const child of group.getChildren()) {
      if (!(child instanceof Phaser.GameObjects.Rectangle)) continue
      const body = child.body as Phaser.Physics.Arcade.StaticBody | null
      if (body && !body.enable) continue
      if (Phaser.Geom.Rectangle.Contains(child.getBounds(), x, y)) return true
    }

    return false
  }

  private spawnPistolWallImpact(x: number, y: number, dir: 1 | -1): void {
    if (!this.textures.exists('pistol-wall-impact')) {
      ParticleFx.hit(this, x, y, 6)
      return
    }

    const impact = this.add
      .sprite(x, y, 'pistol-wall-impact')
      .setFlipX(dir < 0)
      .setDepth(27)

    if (this.anims.exists('pistol-wall-impact')) {
      impact.play('pistol-wall-impact')
      impact.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => impact.destroy())
    } else {
      this.time.delayedCall(180, () => impact.destroy())
    }
  }

  private performPlayerShot(
    shot: PlayerShot | null,
    tracerColor: number,
    flashColor: number,
  ): void {
    if (!shot) return

    const centerX = shot.x + shot.dir * shot.range * 0.5
    const shotBounds = new Phaser.Geom.Rectangle(
      shot.dir > 0 ? shot.x : shot.x - shot.range,
      shot.y - shot.width * 0.5,
      shot.range,
      shot.width,
    )

    const tracerHeight = shot.damage > 1 ? 3 : 2
    const flashRadius = shot.damage > 1 ? 6 : 5
    const tracer = this.add
      .rectangle(centerX, shot.y, shot.range, tracerHeight, tracerColor, 0.68)
      .setDepth(24)
    const flash = this.add
      .circle(shot.x, shot.y, flashRadius, flashColor, 0.9)
      .setDepth(25)

    this.tweens.add({
      targets: [tracer, flash],
      alpha: 0,
      duration: shot.lifeMs,
      ease: 'Quad.Out',
      onComplete: () => {
        tracer.destroy()
        flash.destroy()
      },
    })

    const hitSet = new Set<Slime>()
    for (const enemy of this.enemyList) {
      if (!enemy.active || enemy.dead || hitSet.has(enemy)) continue
      const body = enemy.body as Phaser.Physics.Arcade.Body | null
      if (!body) continue

      const enemyBounds = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height)
      if (!Phaser.Geom.Rectangle.Overlaps(shotBounds, enemyBounds)) continue

      hitSet.add(enemy)
      const damaged = DamageSystem.apply(enemy, shot.damage, shot.x)
      if (!damaged) continue

      FlashFx.hit(enemy, 80, tracerColor)
      ParticleFx.hit(this, enemy.x, enemy.y, 8 + shot.damage * 2)
      ShakeFx.hit(this.cameras.main, shot.damage > 1 ? 65 : 45, shot.damage > 1 ? 0.0032 : 0.0025)
      Sfx.hit(shot.damage > 1 ? 0.018 : 0.014)
    }
  }

  private performGrenadeThrow(grenade: PlayerGrenadeThrow): void {
    const startX = grenade.x
    const startY = grenade.y
    const landX = Phaser.Math.Clamp(startX + grenade.dir * grenade.range, 24, this.worldWidth - 24)
    const landY = Phaser.Math.Clamp(startY + 34, 24, this.worldHeight - 24)
    const projectile = this.add
      .sprite(startX, startY, 'grenade-projectile')
      .setFlipX(grenade.dir < 0)
      .setDepth(26)
    if (this.anims.exists('grenade-projectile-arc')) {
      projectile.play('grenade-projectile-arc')
    }

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: grenade.flightMs,
      ease: 'Sine.InOut',
      onUpdate: (tween) => {
        const t = Number(tween.getValue())
        const x = Phaser.Math.Linear(startX, landX, t)
        const y = Phaser.Math.Linear(startY, landY, t) - Math.sin(t * Math.PI) * 44
        projectile.setPosition(x, y)
      },
      onComplete: () => {
        this.explodeGrenade(projectile, landX, landY, grenade)
      },
    })
  }

  private explodeGrenade(
    projectile: Phaser.GameObjects.Sprite,
    x: number,
    y: number,
    grenade: PlayerGrenadeThrow,
  ): void {
    projectile.destroy()

    if (this.textures.exists('grenade-explosion')) {
      const explosion = this.add
        .sprite(x, y + 6, 'grenade-explosion')
        .setOrigin(0.5, 1)
        .setDepth(27)
      if (this.anims.exists('grenade-explosion')) {
        explosion.play('grenade-explosion')
        explosion.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => explosion.destroy())
      } else {
        this.time.delayedCall(220, () => explosion.destroy())
      }
    } else {
      const fallback = this.add
        .circle(x, y, grenade.radius, 0xffb34d, 0.32)
        .setDepth(25)
        .setScale(0.35)
      this.tweens.add({
        targets: fallback,
        alpha: 0,
        scale: 1,
        duration: 190,
        ease: 'Quad.Out',
        onComplete: () => fallback.destroy(),
      })
    }

    ParticleFx.hit(this, x, y, 18)
    ShakeFx.hit(this.cameras.main, 90, 0.0045)
    Sfx.hit(0.024)

    for (const enemy of this.enemyList) {
      if (!enemy.active || enemy.dead) continue
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y)
      if (distance > grenade.radius) continue

      const damaged = DamageSystem.apply(enemy, grenade.damage, grenade.x)
      if (!damaged) continue

      FlashFx.hit(enemy, 100, 0xfff0a8)
      ParticleFx.hit(this, enemy.x, enemy.y, 14)
    }
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
    this.exitLadderState()

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
      const safeSpawn = this.resolveStrictPlayerSpawn(
        this.spawnPoint.x,
        this.spawnPoint.y,
        this.collisionLayer,
      )
      this.spawnPoint.x = safeSpawn.x
      this.spawnPoint.y = safeSpawn.y
      this.player.respawn(this.spawnPoint.x, this.spawnPoint.y)
      this.registry.set('hp', this.player.getHp())
      this.registry.set('maxHp', this.player.getMaxHp())
      this.respawning = false
    })
  }
}
