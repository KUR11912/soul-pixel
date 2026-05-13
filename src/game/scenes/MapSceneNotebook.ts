import Phaser from 'phaser'

const BASE_WIDTH = 1920
const BASE_HEIGHT = 1080
const MAP_OPEN_FIRST_FRAME_KEY = 'map-ui-frame-open-00000'
const MAP_OPEN_FINAL_FRAME_KEY = 'map-ui-state-final'
const MAP_OPEN_LAST_FRAME_KEY = 'map-ui-frame-open-00023'
const MAP_OPEN_FALLBACK_KEY = 'map-ui-state-open'
const MAP_OPEN_SEQUENCE_DURATION_MS = 2200
const MAP_OPEN_SEQUENCE_HOLD_FIRST_MS = 180
const MAP_OPEN_FRAME_INDEXES = Array.from({ length: 24 }, (_, index) => index)
const MAP_OPEN_FRAME_KEYS = MAP_OPEN_FRAME_INDEXES.map((index) => {
  const frame = index.toString().padStart(5, '0')
  return `map-ui-frame-open-${frame}`
})
const FILES_OPEN_FRAME_KEYS = Array.from({ length: 18 }, (_, index) => {
  const frame = index.toString().padStart(5, '0')
  return `files-ui-frame-open-${frame}`
})

const MAP_HIT_ZONES = {
  filesTab: new Phaser.Geom.Rectangle(584, 26, 274, 112),
  inventoryTab: new Phaser.Geom.Rectangle(1125, 26, 360, 112),
  escape: new Phaser.Geom.Rectangle(1663, 1013, 184, 72),
}

export class MapScene extends Phaser.Scene {
  private uiScale = 1
  private rootX = 0
  private rootY = 0
  private root!: Phaser.GameObjects.Container
  private baseImage!: Phaser.GameObjects.Image
  private overlayImage?: Phaser.GameObjects.Image
  private sequenceTimer?: Phaser.Time.TimerEvent
  private sequenceFrameTimer?: Phaser.Time.TimerEvent
  private keyHandler?: (event: KeyboardEvent) => void
  private isSequencePlaying = false

  constructor() {
    super('MapScene')
  }

  preload(): void {
    if (!this.textures.exists(MAP_OPEN_FALLBACK_KEY)) {
      this.load.image(
        MAP_OPEN_FALLBACK_KEY,
        'assets/ui/map/states/open_from_equipment_body.png',
      )
    }
    for (const frame of MAP_OPEN_FRAME_INDEXES) {
      const padded = frame.toString().padStart(5, '0')
      const key = `map-ui-frame-open-${padded}`
      if (!this.textures.exists(key)) {
        this.load.image(key, `assets/ui/map/anims/open/body/frames/Map界切图3_${padded}.png`)
      }
    }
    if (!this.textures.exists(MAP_OPEN_FINAL_FRAME_KEY)) {
      this.load.image(
        MAP_OPEN_FINAL_FRAME_KEY,
        'assets/ui/map/anims/open/body/frames/Map界切图3_00023.png',
      )
    }
  }

  create(): void {
    this.setupLayout()

    this.root = this.add.container(this.rootX, this.rootY).setDepth(10)
    this.root.setScale(this.uiScale)

    this.baseImage = this.add
      .image(0, 0, this.resolveInitialTextureKey())
      .setOrigin(0, 0)
      .setDisplaySize(BASE_WIDTH, BASE_HEIGHT)
    this.root.add(this.baseImage)

    this.playEntrance()
    this.installNavigationZones()

    this.keyHandler = (event: KeyboardEvent) => this.onKeyDown(event)
    this.input.keyboard?.on('keydown', this.keyHandler)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler)
      this.sequenceTimer?.remove(false)
      this.sequenceFrameTimer?.remove(false)
      this.destroySequenceOverlay()
    })
  }

  private setupLayout(): void {
    this.uiScale = Math.min(this.scale.width / BASE_WIDTH, this.scale.height / BASE_HEIGHT)
    this.rootX = (this.scale.width - BASE_WIDTH * this.uiScale) / 2
    this.rootY = (this.scale.height - BASE_HEIGHT * this.uiScale) / 2
  }

  private resolveInitialTextureKey(): string {
    if (this.textures.exists(MAP_OPEN_FIRST_FRAME_KEY)) {
      return MAP_OPEN_FIRST_FRAME_KEY
    }
    return this.resolveBaseTextureKey()
  }

  private resolveBaseTextureKey(): string {
    if (this.textures.exists(MAP_OPEN_FINAL_FRAME_KEY)) {
      return MAP_OPEN_FINAL_FRAME_KEY
    }
    if (this.textures.exists(MAP_OPEN_LAST_FRAME_KEY)) {
      return MAP_OPEN_LAST_FRAME_KEY
    }
    return MAP_OPEN_FALLBACK_KEY
  }

  private playEntrance(): void {
    if (MAP_OPEN_FRAME_KEYS.every((key) => this.textures.exists(key))) {
      this.playFrameSequence(MAP_OPEN_FRAME_KEYS, MAP_OPEN_SEQUENCE_DURATION_MS, undefined, {
        holdFirstMs: MAP_OPEN_SEQUENCE_HOLD_FIRST_MS,
        finalTextureKey: MAP_OPEN_FINAL_FRAME_KEY,
      })
      return
    }

    this.root.setAlpha(0)
    this.root.y = this.rootY + 18 * this.uiScale
    this.tweens.add({
      targets: this.root,
      alpha: 1,
      y: this.rootY,
      duration: 180,
      ease: 'Quad.Out',
    })
  }

  private installNavigationZones(): void {
    this.createZone(MAP_HIT_ZONES.filesTab, () => this.playArchiveTransition())
    this.createZone(MAP_HIT_ZONES.inventoryTab, () => this.returnToEquipment())
    this.createZone(MAP_HIT_ZONES.escape, () => this.returnToEquipment())
  }

  private createZone(bounds: Phaser.Geom.Rectangle, onClick: () => void): void {
    const zone = this.add
      .zone(
        this.rootX + (bounds.x + bounds.width / 2) * this.uiScale,
        this.rootY + (bounds.y + bounds.height / 2) * this.uiScale,
        bounds.width * this.uiScale,
        bounds.height * this.uiScale,
      )
      .setDepth(30)
      .setInteractive({ useHandCursor: true })

    zone.on('pointerdown', onClick)
  }

  private playArchiveTransition(): void {
    if (this.isSequencePlaying) return

    if (!FILES_OPEN_FRAME_KEYS.every((key) => this.textures.exists(key))) {
      this.switchTo('ArchiveScene')
      return
    }

    this.playFrameSequence(FILES_OPEN_FRAME_KEYS, 833, () =>
      this.switchTo('ArchiveScene', { skipEntrance: true }),
    )
  }

  private playFrameSequence(
    frameKeys: string[],
    durationMs: number,
    onComplete?: () => void,
    options?: {
      holdFirstMs?: number
      finalTextureKey?: string
    },
  ): void {
    this.sequenceTimer?.remove(false)
    this.sequenceFrameTimer?.remove(false)
    this.destroySequenceOverlay()
    this.isSequencePlaying = true

    this.overlayImage = this.add
      .image(this.rootX, this.rootY, frameKeys[0])
      .setOrigin(0, 0)
      .setDisplaySize(BASE_WIDTH * this.uiScale, BASE_HEIGHT * this.uiScale)
      .setDepth(120)

    this.baseImage.setVisible(false)

    if (frameKeys.length > 1) {
      const holdFirstMs = Math.max(0, options?.holdFirstMs ?? 0)
      const remainingDurationMs = Math.max(0, durationMs - holdFirstMs)
      const frameDelay = remainingDurationMs / (frameKeys.length - 1)
      let frameIndex = 0

      this.sequenceFrameTimer = this.time.addEvent({
        delay: frameDelay,
        repeat: frameKeys.length - 2,
        startAt: -holdFirstMs,
        callback: () => {
          frameIndex += 1
          this.overlayImage?.setTexture(frameKeys[frameIndex])
        },
      })
    }

    this.sequenceTimer = this.time.delayedCall(durationMs, () => {
      const finalTextureKey =
        options?.finalTextureKey && this.textures.exists(options.finalTextureKey)
          ? options.finalTextureKey
          : (frameKeys[frameKeys.length - 1] ?? this.resolveBaseTextureKey())
      this.baseImage.setTexture(finalTextureKey).setDisplaySize(BASE_WIDTH, BASE_HEIGHT)
      this.baseImage.setVisible(true)
      this.destroySequenceOverlay()
      this.isSequencePlaying = false
      onComplete?.()
    })
  }

  private destroySequenceOverlay(): void {
    this.sequenceFrameTimer?.remove(false)
    this.sequenceFrameTimer = undefined

    if (this.overlayImage) {
      this.overlayImage.destroy()
      this.overlayImage = undefined
    }
  }

  private returnToEquipment(): void {
    this.switchTo('EquipmentScene')
  }

  private switchTo(
    sceneKey: 'EquipmentScene' | 'ArchiveScene',
    data?: { skipEntrance?: boolean },
  ): void {
    this.scene.stop()
    if (this.scene.isActive(sceneKey)) {
      this.scene.stop(sceneKey)
    }
    this.scene.launch(sceneKey, data)
    this.scene.bringToTop(sceneKey)
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Escape' || event.code === 'KeyE' || event.code === 'KeyI') {
      this.returnToEquipment()
      return
    }

    if (event.code === 'KeyQ' || event.code === 'KeyP') {
      this.playArchiveTransition()
    }
  }
}
