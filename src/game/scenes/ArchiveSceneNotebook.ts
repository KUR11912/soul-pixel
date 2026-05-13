import Phaser from 'phaser'

const BASE_WIDTH = 1920
const BASE_HEIGHT = 1080
const FILES_OPEN_SEQUENCE_DURATION_MS = 833
const FILES_OPEN_FINAL_FRAME_KEY = 'files-ui-frame-open-00017'
const FILES_OPEN_FALLBACK_KEY = 'files-ui-bg'
const FILES_OPEN_FRAME_KEYS = Array.from({ length: 18 }, (_, index) => {
  const frame = index.toString().padStart(5, '0')
  return `files-ui-frame-open-${frame}`
})

const FILES_HIT_ZONES = {
  mapTab: new Phaser.Geom.Rectangle(875, 26, 272, 112),
  inventoryTab: new Phaser.Geom.Rectangle(1146, 26, 344, 112),
  escape: new Phaser.Geom.Rectangle(1663, 1013, 184, 72),
}

export class ArchiveScene extends Phaser.Scene {
  private uiScale = 1
  private rootX = 0
  private rootY = 0
  private root!: Phaser.GameObjects.Container
  private baseImage!: Phaser.GameObjects.Image
  private sequenceTimer?: Phaser.Time.TimerEvent
  private sequenceFrameTimer?: Phaser.Time.TimerEvent
  private keyHandler?: (event: KeyboardEvent) => void
  private skipEntranceSequence = false

  constructor() {
    super('ArchiveScene')
  }

  init(data?: { skipEntrance?: boolean }): void {
    this.skipEntranceSequence = data?.skipEntrance === true
  }

  preload(): void {
    if (!this.textures.exists(FILES_OPEN_FALLBACK_KEY)) {
      this.load.image(FILES_OPEN_FALLBACK_KEY, 'assets/ui/files/bg.png')
    }
    for (let frame = 0; frame <= 17; frame += 1) {
      const padded = frame.toString().padStart(5, '0')
      const key = `files-ui-frame-open-${padded}`
      if (!this.textures.exists(key)) {
        this.load.image(key, `assets/ui/files/anima/file89_${padded}.png`)
      }
    }
  }

  create(): void {
    this.setupLayout()

    this.root = this.add.container(this.rootX, this.rootY).setDepth(10)
    this.root.setScale(this.uiScale)

    this.baseImage = this.add
      .image(0, 0, this.resolveBaseTextureKey())
      .setOrigin(0, 0)
    this.root.add(this.baseImage)

    this.playEntrance()
    this.installNavigationZones()

    this.keyHandler = (event: KeyboardEvent) => this.onKeyDown(event)
    this.input.keyboard?.on('keydown', this.keyHandler)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler)
      this.sequenceTimer?.remove(false)
      this.sequenceFrameTimer?.remove(false)
    })
  }

  private setupLayout(): void {
    this.uiScale = Math.min(this.scale.width / BASE_WIDTH, this.scale.height / BASE_HEIGHT)
    this.rootX = (this.scale.width - BASE_WIDTH * this.uiScale) / 2
    this.rootY = (this.scale.height - BASE_HEIGHT * this.uiScale) / 2
  }

  private resolveBaseTextureKey(): string {
    if (
      !this.skipEntranceSequence &&
      FILES_OPEN_FRAME_KEYS.every((key) => this.textures.exists(key))
    ) {
      return FILES_OPEN_FRAME_KEYS[0]
    }
    if (this.textures.exists(FILES_OPEN_FINAL_FRAME_KEY)) {
      return FILES_OPEN_FINAL_FRAME_KEY
    }
    return FILES_OPEN_FALLBACK_KEY
  }

  private playEntrance(): void {
    if (this.skipEntranceSequence && this.baseImage.texture.key === FILES_OPEN_FINAL_FRAME_KEY) {
      this.root.setAlpha(1)
      this.root.y = this.rootY
      return
    }

    if (
      !this.skipEntranceSequence &&
      FILES_OPEN_FRAME_KEYS.every((key) => this.textures.exists(key))
    ) {
      this.root.setAlpha(1)
      this.root.y = this.rootY
      this.playFrameSequence()
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

  private playFrameSequence(): void {
    this.sequenceTimer?.remove(false)
    this.sequenceFrameTimer?.remove(false)
    this.baseImage.setTexture(FILES_OPEN_FRAME_KEYS[0])

    const frameDelay = FILES_OPEN_SEQUENCE_DURATION_MS / (FILES_OPEN_FRAME_KEYS.length - 1)
    let frameIndex = 0

    this.sequenceFrameTimer = this.time.addEvent({
      delay: frameDelay,
      repeat: FILES_OPEN_FRAME_KEYS.length - 2,
      callback: () => {
        frameIndex += 1
        this.baseImage.setTexture(FILES_OPEN_FRAME_KEYS[frameIndex])
      },
    })

    this.sequenceTimer = this.time.delayedCall(FILES_OPEN_SEQUENCE_DURATION_MS, () => {
      this.baseImage.setTexture(FILES_OPEN_FINAL_FRAME_KEY)
    })
  }

  private installNavigationZones(): void {
    this.createZone(FILES_HIT_ZONES.mapTab, () => this.switchTo('MapScene'))
    this.createZone(FILES_HIT_ZONES.inventoryTab, () => this.switchTo('EquipmentScene'))
    this.createZone(FILES_HIT_ZONES.escape, () => this.switchTo('MapScene'))
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

  private switchTo(sceneKey: 'MapScene' | 'EquipmentScene'): void {
    this.scene.stop()
    if (this.scene.isActive(sceneKey)) {
      this.scene.stop(sceneKey)
    }
    this.scene.launch(sceneKey)
    this.scene.bringToTop(sceneKey)
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Escape' || event.code === 'KeyE' || event.code === 'KeyM') {
      this.switchTo('MapScene')
      return
    }

    if (event.code === 'KeyI') {
      this.switchTo('EquipmentScene')
    }
  }
}
