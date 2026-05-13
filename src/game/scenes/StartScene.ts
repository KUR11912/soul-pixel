import Phaser from 'phaser'
import { readSaveFromRegistry, resetSaveData } from '../save/SaveStore'

type MenuEntry = {
  key: string
  action: () => void
}

type MenuButtonView = {
  baseX: number
  baseY: number
  width: number
  height: number
  burnPlateBaseScale: number
  sweepProgress: number
  container: Phaser.GameObjects.Container
  shadow: Phaser.GameObjects.Image
  burnPlate: Phaser.GameObjects.Image
  base: Phaser.GameObjects.Image
  active: Phaser.GameObjects.Image
  accentLine: Phaser.GameObjects.Rectangle
  accentDot: Phaser.GameObjects.Rectangle
  sweepTween?: Phaser.Tweens.Tween
}

type DustPointSource = {
  points: Phaser.Math.Vector2[]
  getRandomPoint: (
    point: Phaser.Types.Math.Vector2Like,
  ) => Phaser.Types.Math.Vector2Like
}

type TitlePathLayer = {
  image: Phaser.GameObjects.Image
  baseX: number
  baseY: number
  offsetX: number
  offsetY: number
  wobbleX: number
  wobbleY: number
  speed: number
  baseAlpha: number
  alphaBoost: number
  tint: number
  phase: number
  blendMode: number
}

type SplitShadowSprite = {
  body: Phaser.GameObjects.Image
  shadow: Phaser.GameObjects.Image
  anchorX: number
  anchorY: number
  baseOffset: number
  stretchX: number
  stretchY: number
  baseAlpha: number
  rotationFactor: number
}

const START_LAYOUT = {
  bgW: 2760,
  bgH: 1504,

  buttonStartOffsetY: -115,
  buttonStepY: 122,
  buttonOffsetX: 0,

  // Top-right lantern flame bounds in start_bg_full reference coordinates.
  lampFlameRefX: 2609,
  lampFlameRefY: 18,
  lampFlameRefW: 80,
  lampFlameRefH: 128,

  // Decorative motion overlays, estimated from the current start layout.
  compassNeedleRefX: 136,
  compassNeedleRefY: 706,
  cupWaterRefX: 2538,
  cupWaterRefY: 744,
  cupWaterRefW: 142,
  cupWaterRefH: 30,
}

const START_SPLIT_LAYOUT = {
  lampBodyRefX: 2536,
  lampBodyRefY: 9,
  cupBodyRefX: 2522,
  cupBodyRefY: 638,
  compassBodyRefX: 8,
  compassBodyRefY: 468,
  pencilPatchRefX: 0,
  pencilPatchRefY: 980,
  pencilPatchRefW: 188,
  pencilPatchRefH: 500,
  pencilTextureKey: 'start-prop-pencil-patch',
  mapMaskSourceKey: 'start-map-mask-source',
  mapMaskTextureKey: 'start-map-mask-alpha',
  mapPaperRefPoints: [
    [304, 178],
    [520, 172],
    [546, 154],
    [936, 154],
    [960, 168],
    [1594, 167],
    [1634, 154],
    [2032, 154],
    [2066, 166],
    [2326, 174],
    [2476, 196],
    [2506, 234],
    [2504, 520],
    [2440, 556],
    [2362, 604],
    [2348, 1324],
    [2176, 1370],
    [1990, 1394],
    [1606, 1396],
    [1548, 1368],
    [1088, 1370],
    [1032, 1408],
    [608, 1407],
    [454, 1376],
    [320, 1334],
    [300, 612],
    [268, 544],
    [268, 276],
  ] as const,
}

const START_DUST_LAYER_PRESETS = [
  {
    key: 'start-dust-layer-mid',
    particleTextureKey: 'start-dust-fx-mid',
    depth: 17,
    sampleStep: 11,
    alphaThreshold: 12,
    spawnDensity: 0.45,
    maxPoints: 2200,
    lifespanMin: 4800,
    lifespanMax: 8600,
    frequency: 42,
    quantity: 1,
    speedXMin: -30,
    speedXMax: 32,
    speedYMin: -24,
    speedYMax: 24,
    accelXMin: -11,
    accelXMax: 11,
    accelYMin: -10,
    accelYMax: 10,
    scaleStart: 0.54,
    scaleEnd: 0.16,
    alphaStart: 0.28,
    tint: [0xb9a891, 0xcab59a, 0xdac3a5],
  },
  {
    key: 'start-dust-layer-near',
    particleTextureKey: 'start-dust-fx-near',
    depth: 18,
    sampleStep: 10,
    alphaThreshold: 10,
    spawnDensity: 0.5,
    maxPoints: 2600,
    lifespanMin: 3400,
    lifespanMax: 7000,
    frequency: 30,
    quantity: 1,
    speedXMin: -46,
    speedXMax: 50,
    speedYMin: -35,
    speedYMax: 36,
    accelXMin: -18,
    accelXMax: 18,
    accelYMin: -16,
    accelYMax: 16,
    scaleStart: 0.72,
    scaleEnd: 0.2,
    alphaStart: 0.34,
    tint: [0xc5b091, 0xd5be9c, 0xe4ccaa],
  },
]

const START_GLOBAL_EMBER_PRESETS = [
  {
    textureKey: 'start-ember-speck',
    depth: 19,
    blendMode: Phaser.BlendModes.ADD,
    xMinRatio: -0.04,
    xMaxRatio: 1.02,
    yMinRatio: 0.24,
    yMaxRatio: 1.02,
    frequency: 122,
    quantity: 1,
    lifespanMin: 3000,
    lifespanMax: 5600,
    speedXMin: -10,
    speedXMax: 14,
    speedYMin: -22,
    speedYMax: -6,
    accelXMin: -2,
    accelXMax: 2,
    accelYMin: -1,
    accelYMax: 0,
    rotateMin: -50,
    rotateMax: 50,
    scaleStart: 0.2,
    scaleEnd: 0.04,
    alphaStart: 0.14,
    tint: [0xfff0da, 0xffd59e, 0xf39a47],
  },
  {
    textureKey: 'start-menu-ember-speck',
    depth: 27,
    blendMode: Phaser.BlendModes.ADD,
    xMinRatio: -0.02,
    xMaxRatio: 0.66,
    yMinRatio: 0.38,
    yMaxRatio: 1.04,
    frequency: 146,
    quantity: 1,
    lifespanMin: 2100,
    lifespanMax: 4200,
    speedXMin: -18,
    speedXMax: 24,
    speedYMin: -38,
    speedYMax: -12,
    accelXMin: -4,
    accelXMax: 4,
    accelYMin: -2,
    accelYMax: 0,
    rotateMin: -140,
    rotateMax: 140,
    scaleStart: 0.26,
    scaleEnd: 0.05,
    alphaStart: 0.24,
    tint: [0xfff0d9, 0xffce86, 0xe47f34, 0x6b2c13],
  },
  {
    textureKey: 'start-ember-glow-mote',
    depth: 21,
    blendMode: Phaser.BlendModes.ADD,
    xMinRatio: 0.04,
    xMaxRatio: 0.86,
    yMinRatio: 0.48,
    yMaxRatio: 1.06,
    frequency: 238,
    quantity: 1,
    lifespanMin: 2600,
    lifespanMax: 5400,
    speedXMin: -12,
    speedXMax: 16,
    speedYMin: -20,
    speedYMax: -4,
    accelXMin: -2,
    accelXMax: 2,
    accelYMin: -3,
    accelYMax: 0,
    rotateMin: -20,
    rotateMax: 20,
    scaleStart: 0.34,
    scaleEnd: 0.08,
    alphaStart: 0.1,
    tint: [0xffd7a1, 0xe37a38, 0xa2471f],
  },
]

const START_MENU_SELECTED_OFFSET_X = 0
const START_MENU_UNSELECTED_OFFSET_X = 0
const START_MENU_SELECTED_SCALE = 1.06
const START_MENU_UNSELECTED_SCALE = 0.97
const START_MENU_SWEEP_WIDTH_RATIO = 0.38
const START_MENU_SWEEP_EDGE_PAD_RATIO = 0.08
const START_TITLE_PATH = {
  refX: 716,
  refY: 214,
  width: 1396,
  height: 320,
  textureKey: 'start-title-path-mask',
  overlayKey: 'start-title-overlay',
  overlayMaskTextureKey: 'start-title-overlay-mask',
}

const START_TITLE_BURN = {
  charTextureKey: 'start-title-burn-char',
  glowTextureKey: 'start-title-burn-glow',
  updateStepMs: 48,
  cycleMs: 5000,
  coarseCell: 12,
}

const START_PRIMARY_VIDEO_SCALE_X = 1.0
const START_PRIMARY_VIDEO_SCALE_Y = 1.0

export class StartScene extends Phaser.Scene {
  private starting = false
  private uiScale = 1
  private uiCenter = new Phaser.Math.Vector2()
  private usingFullVideoBackdrop = false

  private menuEntries: MenuEntry[] = []
  private menuButtons: MenuButtonView[] = []
  private selectedIndex = 0
  private tipText!: Phaser.GameObjects.Text
  private keyHandler?: (event: KeyboardEvent) => void
  private ambientEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = []
  private titlePathLayers: TitlePathLayer[] = []
  private titlePathCenter = new Phaser.Math.Vector2()
  private titlePathBounds = new Phaser.Geom.Rectangle()
  private titleBurnNodes: Phaser.GameObjects.GameObject[] = []
  private titleBurnCharCanvas?: Phaser.Textures.CanvasTexture
  private titleBurnGlowCanvas?: Phaser.Textures.CanvasTexture
  private titleBurnSourcePixels?: Uint8ClampedArray
  private titleBurnEdgeMask?: Uint8Array
  private titleBurnNoise?: Float32Array
  private titleBurnSpeckNoise?: Float32Array
  private titleBurnUpdateAccum = 0
  private titleEmberEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private titleEmberBurstEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private titleEmberBurstEvent?: Phaser.Time.TimerEvent
  private titleAshEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private lampFlameNodes: Phaser.GameObjects.GameObject[] = []
  private lampFlickerEvent?: Phaser.Time.TimerEvent
  private decorMotionNodes: Phaser.GameObjects.GameObject[] = []
  private layeredStartNodes: Phaser.GameObjects.GameObject[] = []
  private layeredStartVideo?: Phaser.GameObjects.Video
  private startSceneRevealCover?: Phaser.GameObjects.Rectangle
  private splitShadowSprites: SplitShadowSprite[] = []
  private videoNoiseNodes: Phaser.GameObjects.GameObject[] = []
  private videoNoiseTile?: Phaser.GameObjects.TileSprite
  private selectedButtonEmberEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private selectedButtonEmberBurstEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private selectedButtonEmberBurstEvent?: Phaser.Time.TimerEvent
  private selectedButtonEmberIndex = -1

  constructor() {
    super('StartScene')
  }

  create(): void {
    this.usingFullVideoBackdrop = false
    this.setupLayout()

    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 1)
      .setOrigin(0, 0)
      .setDepth(0)
    this.createStartSceneRevealCover()

    const layeredBackdropBuilt = this.runOptionalStartupStep(
      'layered backdrop',
      () => this.createLayeredStartBackdrop(),
      false,
    )

    if (!layeredBackdropBuilt) {
      this.add
        .image(this.uiCenter.x, this.uiCenter.y, 'start-bg-full')
        .setScale(this.uiScale)
        .setDepth(5)
    }

    if (!this.usingFullVideoBackdrop) {
      this.runOptionalStartupStep('title path effect', () => this.createTitlePathEffect())
      this.runOptionalStartupStep('decor motion overlays', () => this.createDecorMotionOverlays())
    }
    this.runOptionalStartupStep('top-right lamp firelight', () =>
      this.createTopRightLampLightSequence(),
    )

    this.runOptionalStartupStep('ambient battlefield particles', () =>
      this.createAmbientBattlefieldParticles(),
    )
    this.runOptionalStartupStep('retro video noise overlay', () =>
      this.createRetroVideoNoiseOverlay(),
    )

    this.tipText = this.add
      .text(this.uiCenter.x, this.uiCenter.y + 430 * this.uiScale, '', {
        fontFamily: 'monospace',
        fontSize: `${Math.max(9, Math.floor(18 * this.uiScale))}px`,
        color: '#e8e0c6',
        stroke: '#1a1510',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(40)

    this.menuEntries = [
      { key: 'start-btn-start', action: () => this.startNewGame() },
      { key: 'start-btn-continue', action: () => this.continueGame() },
      { key: 'start-btn-archives', action: () => this.openArchives() },
      { key: 'start-btn-options', action: () => this.showTip('Options: coming soon') },
      { key: 'start-btn-exit', action: () => this.tryExit() },
    ]

    this.createMenuButtons()
    this.updateButtonVisuals()
    this.showTip('Arrow Up/Down + Enter, or mouse click')
    if (!this.usingFullVideoBackdrop) {
      this.releaseStartSceneRevealCover()
    }

    this.keyHandler = (event: KeyboardEvent) => this.onKeyDown(event)
    this.input.keyboard?.on('keydown', this.keyHandler)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler)
      if (this.startSceneRevealCover) {
        this.tweens.killTweensOf(this.startSceneRevealCover)
        this.startSceneRevealCover.destroy()
        this.startSceneRevealCover = undefined
      }
      for (const button of this.menuButtons) {
        if (button.sweepTween) button.sweepTween.remove()
        this.tweens.killTweensOf(button.container)
        this.tweens.killTweensOf(button.shadow)
        this.tweens.killTweensOf(button.burnPlate)
        this.tweens.killTweensOf(button.base)
        this.tweens.killTweensOf(button.active)
        this.tweens.killTweensOf(button.accentLine)
        this.tweens.killTweensOf(button.accentDot)
      }
      this.menuButtons.length = 0
      this.clearSelectedButtonEmberFx()
      this.selectedButtonEmberIndex = -1
      for (const layer of this.titlePathLayers) {
        this.tweens.killTweensOf(layer.image)
        layer.image.destroy()
      }
      this.titlePathLayers.length = 0
      this.titlePathCenter.set(0, 0)
      this.titlePathBounds.setTo(0, 0, 0, 0)
      for (const node of this.titleBurnNodes) node.destroy()
      this.titleBurnNodes.length = 0
      this.titleBurnCharCanvas = undefined
      this.titleBurnGlowCanvas = undefined
      this.titleBurnSourcePixels = undefined
      this.titleBurnEdgeMask = undefined
      this.titleBurnNoise = undefined
      this.titleBurnSpeckNoise = undefined
      this.titleBurnUpdateAccum = 0
      if (this.titleEmberEmitter) {
        this.titleEmberEmitter.destroy()
        this.titleEmberEmitter = undefined
      }
      if (this.titleEmberBurstEmitter) {
        this.titleEmberBurstEmitter.destroy()
        this.titleEmberBurstEmitter = undefined
      }
      if (this.titleEmberBurstEvent) {
        this.titleEmberBurstEvent.remove(false)
        this.titleEmberBurstEvent = undefined
      }
      if (this.titleAshEmitter) {
        this.titleAshEmitter.destroy()
        this.titleAshEmitter = undefined
      }
      if (this.textures.exists(START_TITLE_BURN.charTextureKey)) {
        this.textures.remove(START_TITLE_BURN.charTextureKey)
      }
      if (this.textures.exists(START_TITLE_BURN.glowTextureKey)) {
        this.textures.remove(START_TITLE_BURN.glowTextureKey)
      }
      if (this.textures.exists(START_TITLE_PATH.overlayMaskTextureKey)) {
        this.textures.remove(START_TITLE_PATH.overlayMaskTextureKey)
      }
      if (this.lampFlickerEvent) {
        this.lampFlickerEvent.remove(false)
        this.lampFlickerEvent = undefined
      }
      for (const node of this.lampFlameNodes) {
        this.tweens.killTweensOf(node)
        node.destroy()
      }
      this.lampFlameNodes.length = 0
      if (this.layeredStartVideo) {
        this.layeredStartVideo.stop()
        this.layeredStartVideo = undefined
      }
      for (const node of this.layeredStartNodes) {
        this.tweens.killTweensOf(node)
        node.destroy()
      }
      this.layeredStartNodes.length = 0
      this.splitShadowSprites.length = 0
      if (this.textures.exists(START_SPLIT_LAYOUT.pencilTextureKey)) {
        this.textures.remove(START_SPLIT_LAYOUT.pencilTextureKey)
      }
      if (this.textures.exists(START_SPLIT_LAYOUT.mapMaskTextureKey)) {
        this.textures.remove(START_SPLIT_LAYOUT.mapMaskTextureKey)
      }
      for (const node of this.decorMotionNodes) {
        this.tweens.killTweensOf(node)
        node.destroy()
      }
      this.decorMotionNodes.length = 0
      this.videoNoiseTile = undefined
      for (const node of this.videoNoiseNodes) {
        this.tweens.killTweensOf(node)
        node.destroy()
      }
      this.videoNoiseNodes.length = 0
      for (const emitter of this.ambientEmitters) emitter.destroy()
      this.ambientEmitters.length = 0
    })
  }

  update(time: number, delta: number): void {
    this.updateTitlePathEffect(time, delta)
    this.updateTitleBurnEffect(time, delta)
    this.updateRetroVideoNoise(time)
  }

  private createLayeredStartBackdrop(): boolean {
    if (this.cache.video.exists('start-map-video-primary')) {
      this.usingFullVideoBackdrop = true

      const fullStartVideo = this.createFullStartVideo('start-map-video-primary', 5)
      fullStartVideo.setAlpha(0)
      const revealFullStartVideo = (): void => {
        if (this.layeredStartVideo === fullStartVideo) {
          fullStartVideo.setAlpha(1)
          this.releaseStartSceneRevealCover()
        }
      }
      fullStartVideo.once('textureready', revealFullStartVideo)
      fullStartVideo.once('playing', revealFullStartVideo)
      this.time.delayedCall(450, revealFullStartVideo)
      fullStartVideo.setMute(true)
      fullStartVideo.setLoop(false)
      fullStartVideo.play(false)
      this.layeredStartVideo = fullStartVideo
      this.layeredStartNodes.push(fullStartVideo)
      return true
    }

    if (
      !this.textures.exists('start-desk-base') ||
      !this.textures.exists('start-prop-lamp') ||
      !this.textures.exists('start-prop-cup') ||
      !this.textures.exists('start-prop-compass')
    ) {
      return false
    }

    const desk = this.add
      .image(this.uiCenter.x, this.uiCenter.y, 'start-desk-base')
      .setScale(this.uiScale)
      .setDepth(5)
    this.layeredStartNodes.push(desk)

    const preferredMapVideoKey = 'start-map-video'
    const mapVideoAvailable = this.cache.video.exists(preferredMapVideoKey)
    const mapMaskTexture = this.ensureStartMapMaskTexture()

    if (mapMaskTexture) {
      const maskImage = this.add
        .image(this.uiCenter.x, this.uiCenter.y, mapMaskTexture)
        .setOrigin(0.5, 0.5)
        .setScale(this.uiScale)
        .setDepth(6)
        .setVisible(false)
      const mapMask = maskImage.createBitmapMask()

      if (mapVideoAvailable) {
        const mapVideo = this.createStartMapVideo(preferredMapVideoKey, 7)
        mapVideo.setMask(mapMask)
        mapVideo.setMute(true)
        mapVideo.setLoop(true)
        mapVideo.play(true)
        this.layeredStartVideo = mapVideo
        this.layeredStartNodes.push(maskImage, mapVideo)
      } else {
        const mapImage = this.add
          .image(this.uiCenter.x, this.uiCenter.y, 'start-bg-full')
          .setOrigin(0.5, 0.5)
          .setScale(this.uiScale)
          .setDepth(7)
          .setAlpha(1)
        mapImage.setMask(mapMask)
        this.layeredStartNodes.push(maskImage, mapImage)
      }
    } else if (this.cache.video.exists('start-map-video-alpha')) {
      const mapVideo = this.createStartMapVideo('start-map-video-alpha', 7)
      mapVideo.setMute(true)
      mapVideo.setLoop(true)
      mapVideo.play(true)
      this.layeredStartVideo = mapVideo
      this.layeredStartNodes.push(mapVideo)
    } else {
      const mapPoints = this.buildStartMapWorldPolygon()
      const maskShape = this.add.graphics().setVisible(false).setDepth(6)
      maskShape.fillStyle(0xffffff, 1)
      maskShape.fillPoints(mapPoints, true)
      const mapMask = maskShape.createGeometryMask()

      if (mapVideoAvailable) {
        const mapVideo = this.createStartMapVideo(preferredMapVideoKey, 7)
        mapVideo.setMask(mapMask)
        mapVideo.setMute(true)
        mapVideo.setLoop(true)
        mapVideo.play(true)
        this.layeredStartVideo = mapVideo
        this.layeredStartNodes.push(maskShape, mapVideo)
      } else {
        const mapImage = this.add
          .image(this.uiCenter.x, this.uiCenter.y, 'start-bg-full')
          .setOrigin(0.5, 0.5)
          .setScale(this.uiScale)
          .setDepth(7)
          .setAlpha(1)
        mapImage.setMask(mapMask)
        this.layeredStartNodes.push(maskShape, mapImage)
      }
    }

    this.addSplitShadowProp('start-prop-compass', START_SPLIT_LAYOUT.compassBodyRefX, START_SPLIT_LAYOUT.compassBodyRefY, {
      bodyDepth: 8.4,
      shadowDepth: 7.6,
      anchorRatioX: 0.52,
      anchorRatioY: 0.72,
      baseOffset: 14,
      stretchX: 0.08,
      stretchY: 0.05,
      baseAlpha: 0.24,
      rotationFactor: 0.55,
    })

    const pencilTexture = this.ensureStartPencilPatchTexture()
    if (pencilTexture) {
      this.addSplitShadowProp(pencilTexture, START_SPLIT_LAYOUT.pencilPatchRefX, START_SPLIT_LAYOUT.pencilPatchRefY, {
        bodyDepth: 8.2,
        shadowDepth: 7.4,
        anchorRatioX: 0.34,
        anchorRatioY: 0.82,
        baseOffset: 12,
        stretchX: 0.12,
        stretchY: 0.06,
        baseAlpha: 0.18,
        rotationFactor: 0.4,
      })
    }

    this.addSplitShadowProp('start-prop-cup', START_SPLIT_LAYOUT.cupBodyRefX, START_SPLIT_LAYOUT.cupBodyRefY, {
      bodyDepth: 8.7,
      shadowDepth: 7.8,
      anchorRatioX: 0.52,
      anchorRatioY: 0.78,
      baseOffset: 20,
      stretchX: 0.1,
      stretchY: 0.06,
      baseAlpha: 0.23,
      rotationFactor: 0.36,
    })

    this.addSplitShadowProp('start-prop-lamp', START_SPLIT_LAYOUT.lampBodyRefX, START_SPLIT_LAYOUT.lampBodyRefY, {
      bodyDepth: 91,
      shadowDepth: 87,
      anchorRatioX: 0.5,
      anchorRatioY: 0.76,
      baseOffset: 8,
      stretchX: 0.04,
      stretchY: 0.03,
      baseAlpha: 0.12,
      rotationFactor: 0.18,
    })

    const flameTopLeft = this.refToWorld(START_LAYOUT.lampFlameRefX, START_LAYOUT.lampFlameRefY)
    const flameW = START_LAYOUT.lampFlameRefW * this.uiScale
    const flameH = START_LAYOUT.lampFlameRefH * this.uiScale
    this.updateLampDrivenShadows(flameTopLeft.x + flameW * 0.5, flameTopLeft.y + flameH * 0.5, 0.5)

    return true
  }

  private createStartSceneRevealCover(): void {
    this.startSceneRevealCover = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 1)
      .setOrigin(0, 0)
      .setDepth(1000)
  }

  private releaseStartSceneRevealCover(): void {
    const cover = this.startSceneRevealCover
    if (!cover || cover.alpha <= 0) return

    this.tweens.killTweensOf(cover)
    this.tweens.add({
      targets: cover,
      alpha: 0,
      duration: 160,
      ease: 'Quad.Out',
      onComplete: () => {
        if (this.startSceneRevealCover === cover) {
          cover.destroy()
          this.startSceneRevealCover = undefined
        }
      },
    })
  }

  private createFullStartVideo(videoKey: string, depth: number): Phaser.GameObjects.Video {
    const video = this.add
      .video(this.uiCenter.x, this.uiCenter.y, videoKey)
      .setOrigin(0.5, 0.5)
      .setDepth(depth)
      .setAlpha(1)

    const applySize = (): void => this.applyFullStartVideoSize(video)
    applySize()
    video.on('created', applySize)
    video.on('metadata', applySize)
    video.on('play', applySize)
    video.on('playing', applySize)
    this.time.delayedCall(0, applySize)
    this.time.delayedCall(120, applySize)
    this.time.delayedCall(500, applySize)

    return video
  }

  private applyFullStartVideoSize(video: Phaser.GameObjects.Video): void {
    video
      .setPosition(this.uiCenter.x, this.uiCenter.y)
      .setDisplaySize(
        START_LAYOUT.bgW * this.uiScale * START_PRIMARY_VIDEO_SCALE_X,
        START_LAYOUT.bgH * this.uiScale * START_PRIMARY_VIDEO_SCALE_Y,
      )
  }

  private createStartMapVideo(videoKey: string, depth: number): Phaser.GameObjects.Video {
    const bounds = this.getStartMapReferenceBounds()
    const center = this.refToWorld(bounds.centerX, bounds.centerY)
    return this.add
      .video(center.x, center.y, videoKey)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(bounds.width * this.uiScale, bounds.height * this.uiScale)
      .setDepth(depth)
      .setAlpha(1)
  }

  private getStartMapReferenceBounds(): Phaser.Geom.Rectangle {
    const xs = START_SPLIT_LAYOUT.mapPaperRefPoints.map(([x]) => x)
    const ys = START_SPLIT_LAYOUT.mapPaperRefPoints.map(([, y]) => y)
    const left = Math.min(...xs)
    const right = Math.max(...xs)
    const top = Math.min(...ys)
    const bottom = Math.max(...ys)
    return new Phaser.Geom.Rectangle(left, top, right - left, bottom - top)
  }

  private buildStartMapWorldPolygon(): Phaser.Math.Vector2[] {
    return START_SPLIT_LAYOUT.mapPaperRefPoints.map(([x, y]) => this.refToWorld(x, y))
  }

  private ensureStartMapMaskTexture(): string | undefined {
    if (!this.textures.exists(START_SPLIT_LAYOUT.mapMaskSourceKey)) {
      return undefined
    }
    if (this.textures.exists(START_SPLIT_LAYOUT.mapMaskTextureKey)) {
      return START_SPLIT_LAYOUT.mapMaskTextureKey
    }

    const sourceTexture = this.textures.get(START_SPLIT_LAYOUT.mapMaskSourceKey)
    const sourceImage = sourceTexture?.getSourceImage() as CanvasImageSource | undefined
    if (!sourceImage) return undefined

    const width = START_LAYOUT.bgW
    const height = START_LAYOUT.bgH
    const scratch = document.createElement('canvas')
    scratch.width = width
    scratch.height = height
    const scratchCtx = scratch.getContext('2d', { willReadFrequently: true })
    if (!scratchCtx) return undefined

    scratchCtx.clearRect(0, 0, width, height)
    scratchCtx.drawImage(sourceImage, 0, 0, width, height)
    const sourcePixels = scratchCtx.getImageData(0, 0, width, height).data

    const canvasTexture = this.textures.createCanvas(
      START_SPLIT_LAYOUT.mapMaskTextureKey,
      width,
      height,
    )
    if (!canvasTexture) return undefined

    const outCtx = canvasTexture.getContext()
    const outImage = outCtx.createImageData(width, height)
    const outPixels = outImage.data

    for (let i = 0; i < sourcePixels.length; i += 4) {
      const alpha = sourcePixels[i + 3]
      if (alpha < 8) continue

      const luminance =
        sourcePixels[i] * 0.2126 +
        sourcePixels[i + 1] * 0.7152 +
        sourcePixels[i + 2] * 0.0722
      const maskAlpha = Math.round((luminance / 255) * alpha)
      if (maskAlpha < 12) continue

      outPixels[i] = 255
      outPixels[i + 1] = 255
      outPixels[i + 2] = 255
      outPixels[i + 3] = maskAlpha
    }

    outCtx.putImageData(outImage, 0, 0)
    canvasTexture.refresh()
    this.textures
      .get(START_SPLIT_LAYOUT.mapMaskTextureKey)
      .setFilter(Phaser.Textures.FilterMode.NEAREST)

    return START_SPLIT_LAYOUT.mapMaskTextureKey
  }

  private addSplitShadowProp(
    textureKey: string,
    refX: number,
    refY: number,
    config: {
      bodyDepth: number
      shadowDepth: number
      anchorRatioX: number
      anchorRatioY: number
      baseOffset: number
      stretchX: number
      stretchY: number
      baseAlpha: number
      rotationFactor: number
    },
  ): void {
    if (!this.textures.exists(textureKey)) return

    const topLeft = this.refToWorld(refX, refY)
    const shadow = this.add
      .image(topLeft.x, topLeft.y, textureKey)
      .setOrigin(0, 0)
      .setScale(this.uiScale)
      .setTint(0x150b08)
      .setAlpha(config.baseAlpha)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(config.shadowDepth)

    const body = this.add
      .image(topLeft.x, topLeft.y, textureKey)
      .setOrigin(0, 0)
      .setScale(this.uiScale)
      .setDepth(config.bodyDepth)

    this.layeredStartNodes.push(shadow, body)
    this.splitShadowSprites.push({
      body,
      shadow,
      anchorX: topLeft.x + body.width * this.uiScale * config.anchorRatioX,
      anchorY: topLeft.y + body.height * this.uiScale * config.anchorRatioY,
      baseOffset: config.baseOffset,
      stretchX: config.stretchX,
      stretchY: config.stretchY,
      baseAlpha: config.baseAlpha,
      rotationFactor: config.rotationFactor,
    })
  }

  private ensureStartPencilPatchTexture(): string | undefined {
    if (this.textures.exists(START_SPLIT_LAYOUT.pencilTextureKey)) {
      return START_SPLIT_LAYOUT.pencilTextureKey
    }

    const sourceTexture = this.textures.get('start-bg-full')
    if (!sourceTexture) return undefined

    const sourceImage = sourceTexture.getSourceImage() as CanvasImageSource | undefined
    if (!sourceImage) return undefined

    const w = START_SPLIT_LAYOUT.pencilPatchRefW
    const h = START_SPLIT_LAYOUT.pencilPatchRefH
    const canvasTexture = this.textures.createCanvas(START_SPLIT_LAYOUT.pencilTextureKey, w, h)
    if (!canvasTexture) return undefined

    const ctx = canvasTexture.context
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(
      sourceImage,
      START_SPLIT_LAYOUT.pencilPatchRefX,
      START_SPLIT_LAYOUT.pencilPatchRefY,
      START_SPLIT_LAYOUT.pencilPatchRefW,
      START_SPLIT_LAYOUT.pencilPatchRefH,
      0,
      0,
      w,
      h,
    )
    canvasTexture.refresh()
    this.textures.get(START_SPLIT_LAYOUT.pencilTextureKey).setFilter(Phaser.Textures.FilterMode.NEAREST)
    return START_SPLIT_LAYOUT.pencilTextureKey
  }

  private updateLampDrivenShadows(lightX: number, lightY: number, pulse: number): void {
    for (const layer of this.splitShadowSprites) {
      const dx = layer.anchorX - lightX
      const dy = layer.anchorY - lightY
      const distance = Math.max(1, Math.hypot(dx, dy))
      const nx = dx / distance
      const ny = dy / distance
      const offset = layer.baseOffset * this.uiScale * (0.88 + pulse * 0.34)

      layer.shadow.setPosition(
        layer.body.x + nx * offset,
        layer.body.y + ny * offset + 2 * this.uiScale,
      )
      layer.shadow.setScale(
        this.uiScale * (1 + Math.abs(nx) * layer.stretchX * (0.9 + pulse * 0.3)),
        this.uiScale * (0.98 + Math.abs(ny) * layer.stretchY * (0.35 + pulse * 0.12)),
      )
      layer.shadow.setRotation(nx * 0.08 * layer.rotationFactor)
      layer.shadow.setAlpha(layer.baseAlpha + pulse * 0.045)
    }

  }

  private createTitlePathEffect(): void {
    const titleTexture = this.resolveTitlePathTexture()
    this.titlePathCenter.copy(titleTexture.effectCenter)
    this.titlePathBounds.setTo(
      this.titlePathCenter.x - titleTexture.effectWidth * 0.5,
      this.titlePathCenter.y - titleTexture.effectHeight * 0.5,
      titleTexture.effectWidth,
      titleTexture.effectHeight,
    )

    const layerConfigs = [
      {
        depth: 22,
        tint: 0x1d0907,
        blendMode: Phaser.BlendModes.NORMAL,
        offsetX: 0,
        offsetY: 0,
        wobbleX: 1.8,
        wobbleY: 1.05,
        speed: 0.82,
        baseAlpha: 0.94,
        alphaBoost: 0.03,
        phase: 0.6,
      },
      {
        depth: 23,
        tint: 0xff8a36,
        blendMode: Phaser.BlendModes.ADD,
        offsetX: 1,
        offsetY: -1,
        wobbleX: 1.1,
        wobbleY: 0.55,
        speed: 1.04,
        baseAlpha: 0.01,
        alphaBoost: 0.04,
        phase: 3.7,
      },
    ] as const

    for (const config of layerConfigs) {
      const image = this.createTitlePathSprite(
        titleTexture.key,
        titleTexture.baseX,
        titleTexture.baseY,
        config.depth,
      )
      image
        .setBlendMode(config.blendMode)
        .setTint(config.tint)
        .setAlpha(config.baseAlpha)

      this.titlePathLayers.push({
        image,
        baseX: titleTexture.baseX,
        baseY: titleTexture.baseY,
        offsetX: config.offsetX,
        offsetY: config.offsetY,
        wobbleX: config.wobbleX,
        wobbleY: config.wobbleY,
        speed: config.speed,
        baseAlpha: config.baseAlpha,
        alphaBoost: config.alphaBoost,
        tint: config.tint,
        phase: config.phase,
        blendMode: config.blendMode,
      })
    }

    this.createTitleBurnEffect(titleTexture.key)
  }

  private resolveTitlePathTexture(): {
    key: string
    baseX: number
    baseY: number
    effectCenter: Phaser.Math.Vector2
    effectWidth: number
    effectHeight: number
  } {
    const rect = START_TITLE_PATH
    const effectCenter = this.refToWorld(rect.refX + rect.width / 2, rect.refY + rect.height / 2)
    const overlayMaskKey = this.ensureTitleOverlayMaskTexture()
    if (overlayMaskKey) {
      return {
        key: overlayMaskKey,
        baseX: effectCenter.x,
        baseY: effectCenter.y,
        effectCenter,
        effectWidth: rect.width * this.uiScale,
        effectHeight: rect.height * this.uiScale,
      }
    }

    return {
      key: this.ensureTitlePathMaskTexture(),
      baseX: effectCenter.x,
      baseY: effectCenter.y,
      effectCenter,
      effectWidth: rect.width * this.uiScale,
      effectHeight: rect.height * this.uiScale,
    }
  }

  private ensureTitlePathMaskTexture(): string {
    const rect = START_TITLE_PATH
    const textureKey = rect.textureKey
    if (this.textures.exists(textureKey)) return textureKey

    const sourceTexture = this.textures.get('start-bg-full')
    const sourceImage = sourceTexture?.getSourceImage() as CanvasImageSource | undefined
    const sourceWidth = (sourceImage as { width?: number } | undefined)?.width ?? 0
    const sourceHeight = (sourceImage as { height?: number } | undefined)?.height ?? 0
    if (!sourceImage || sourceWidth <= 0 || sourceHeight <= 0) return 'start-bg-full'

    const canvasTexture = this.textures.createCanvas(textureKey, rect.width, rect.height)
    if (!canvasTexture) return 'start-bg-full'

    const ctx = canvasTexture.context
    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.drawImage(
      sourceImage,
      rect.refX,
      rect.refY,
      rect.width,
      rect.height,
      0,
      0,
      rect.width,
      rect.height,
    )
    const imageData = ctx.getImageData(0, 0, rect.width, rect.height)
    const pixels = imageData.data

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3]
      if (alpha === 0) continue

      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const saturation = max - min
      const coolBias = Phaser.Math.Clamp((b - r + 28) / 84, 0, 1)
      const darkness = Phaser.Math.Clamp((160 - luminance) / 74, 0, 1)
      const inkStrength = Phaser.Math.Clamp(darkness * 0.82 + coolBias * 0.28 + saturation / 2550, 0, 1)

      if (inkStrength <= 0.06) {
        pixels[i + 3] = 0
        continue
      }

      const alphaOut = Math.min(255, Math.round(alpha * Math.pow(inkStrength, 1.18)))
      pixels[i] = Math.round(r * 0.7)
      pixels[i + 1] = Math.round(g * 0.74)
      pixels[i + 2] = Math.round(b * 0.86)
      pixels[i + 3] = alphaOut
    }

    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.putImageData(imageData, 0, 0)
    canvasTexture.refresh()
    this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST)
    return textureKey
  }

  private ensureTitleOverlayMaskTexture(): string | undefined {
    const rect = START_TITLE_PATH
    const textureKey = rect.overlayMaskTextureKey
    if (this.textures.exists(textureKey)) return textureKey
    if (!this.textures.exists(rect.overlayKey)) return undefined

    const sourceTexture = this.textures.get(rect.overlayKey)
    const sourceImage = sourceTexture?.getSourceImage() as CanvasImageSource | undefined
    const sourceWidth = (sourceImage as { width?: number } | undefined)?.width ?? 0
    const sourceHeight = (sourceImage as { height?: number } | undefined)?.height ?? 0
    if (!sourceImage || sourceWidth <= 0 || sourceHeight <= 0) return undefined

    const canvasTexture = this.textures.createCanvas(textureKey, rect.width, rect.height)
    if (!canvasTexture) return undefined

    const ctx = canvasTexture.context
    ctx.clearRect(0, 0, rect.width, rect.height)

    const useFullCanvasCrop = sourceWidth >= START_LAYOUT.bgW && sourceHeight >= START_LAYOUT.bgH
    if (useFullCanvasCrop) {
      ctx.drawImage(
        sourceImage,
        rect.refX,
        rect.refY,
        rect.width,
        rect.height,
        0,
        0,
        rect.width,
        rect.height,
      )
    } else {
      ctx.drawImage(sourceImage, 0, 0, sourceWidth, sourceHeight, 0, 0, rect.width, rect.height)
    }

    const imageData = ctx.getImageData(0, 0, rect.width, rect.height)
    const pixels = imageData.data

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3]
      if (alpha === 0) continue

      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const saturation = max - min
      const coolBias = Phaser.Math.Clamp((b - r + 28) / 84, 0, 1)
      const darkness = Phaser.Math.Clamp((160 - luminance) / 74, 0, 1)
      const sourcePresence = alpha / 255
      const alphaMaskStrength =
        saturation <= 36
          ? sourcePresence * Phaser.Math.Clamp((luminance - 110) / 120, 0, 1)
          : 0
      const inkStrength = Phaser.Math.Clamp(
        Math.max(darkness * 0.82 + coolBias * 0.28 + saturation / 2550, alphaMaskStrength),
        0,
        1,
      )

      if (inkStrength <= 0.055) {
        pixels[i + 3] = 0
        continue
      }

      const alphaOut = Math.min(255, Math.round(alpha * Math.pow(inkStrength, 1.06)))
      pixels[i] = 255
      pixels[i + 1] = 255
      pixels[i + 2] = 255
      pixels[i + 3] = alphaOut
    }

    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.putImageData(imageData, 0, 0)
    canvasTexture.refresh()
    this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST)
    return textureKey
  }

  private createTitlePathSprite(
    textureKey: string,
    x: number,
    y: number,
    depth: number,
  ): Phaser.GameObjects.Image {
    return this.add
      .image(x, y, textureKey)
      .setScale(this.uiScale)
      .setDepth(depth)
      .setAlpha(0)
  }

  private createTitleBurnEffect(sourceTextureKey: string): void {
    const rect = START_TITLE_PATH
    const sourcePixels = this.captureTexturePixels(sourceTextureKey, rect.width, rect.height)
    if (!sourcePixels) return

    this.titleBurnSourcePixels = sourcePixels
    this.titleBurnEdgeMask = this.buildTitleBurnEdgeMask(sourcePixels, rect.width, rect.height)
    this.titleBurnNoise = new Float32Array(rect.width * rect.height)
    this.titleBurnSpeckNoise = new Float32Array(rect.width * rect.height)
    this.populateTitleBurnNoise(rect.width, rect.height)

    if (this.textures.exists(START_TITLE_BURN.charTextureKey)) {
      this.textures.remove(START_TITLE_BURN.charTextureKey)
    }
    if (this.textures.exists(START_TITLE_BURN.glowTextureKey)) {
      this.textures.remove(START_TITLE_BURN.glowTextureKey)
    }

    const charCanvas = this.textures.createCanvas(
      START_TITLE_BURN.charTextureKey,
      rect.width,
      rect.height,
    )
    const glowCanvas = this.textures.createCanvas(
      START_TITLE_BURN.glowTextureKey,
      rect.width,
      rect.height,
    )
    if (!charCanvas || !glowCanvas) return

    this.titleBurnCharCanvas = charCanvas
    this.titleBurnGlowCanvas = glowCanvas
    this.textures.get(START_TITLE_BURN.charTextureKey).setFilter(Phaser.Textures.FilterMode.NEAREST)
    this.textures.get(START_TITLE_BURN.glowTextureKey).setFilter(Phaser.Textures.FilterMode.NEAREST)

    const charImage = this.add
      .image(this.titlePathCenter.x, this.titlePathCenter.y, START_TITLE_BURN.charTextureKey)
      .setScale(this.uiScale)
      .setDepth(24)
      .setAlpha(0.96)

    const glowImage = this.add
      .image(this.titlePathCenter.x, this.titlePathCenter.y, START_TITLE_BURN.glowTextureKey)
      .setScale(this.uiScale)
      .setDepth(25)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.95)

    this.titleBurnNodes.push(charImage, glowImage)
    this.createTitleEmberParticles(rect.width, rect.height)
    this.renderTitleBurnOverlay(0.7, 0.9, 0)
  }

  private buildTitleBurnEdgeMask(
    sourcePixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): Uint8Array {
    const edgeMask = new Uint8Array(width * height)
    const alphaAt = (x: number, y: number): number => sourcePixels[(y * width + x) * 4 + 3]

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        if (alphaAt(x, y) < 16) continue

        if (
          alphaAt(x - 1, y) < 16 ||
          alphaAt(x + 1, y) < 16 ||
          alphaAt(x, y - 1) < 16 ||
          alphaAt(x, y + 1) < 16
        ) {
          edgeMask[y * width + x] = 2
        }
      }
    }

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const idx = y * width + x
        if (edgeMask[idx] !== 0 || alphaAt(x, y) >= 16) continue

        let nearInk = false
        for (let oy = -3; oy <= 3 && !nearInk; oy += 1) {
          for (let ox = -3; ox <= 3; ox += 1) {
            if (ox === 0 && oy === 0) continue
            if (alphaAt(x + ox, y + oy) >= 16) {
              nearInk = true
              break
            }
          }
        }

        if (nearInk) {
          edgeMask[idx] = 1
        }
      }
    }

    return edgeMask
  }

  private createTitleEmberParticles(width: number, height: number): void {
    if (!this.titleBurnEdgeMask) return

    this.ensureParticleTextures()
    this.titleEmberEmitter?.destroy()
    this.titleEmberBurstEmitter?.destroy()
    this.titleAshEmitter?.destroy()
    if (this.titleEmberBurstEvent) {
      this.titleEmberBurstEvent.remove(false)
      this.titleEmberBurstEvent = undefined
    }

    const edgeSource = this.buildTitleEdgePointSource(width, height, this.titleBurnEdgeMask)
    if (edgeSource.points.length === 0) return

    const emitter = this.add.particles(0, 0, 'start-menu-ember-speck', {
      emitZone: { type: 'random', source: edgeSource },
      frequency: 82,
      quantity: 1,
      lifespan: { min: 1050, max: 1750 },
      rotate: { min: -70, max: 70 },
      scale: { start: 0.28 * this.uiScale, end: 0.03 * this.uiScale },
      alpha: { start: 0.62, end: 0 },
      tint: [0xfff1d0, 0xffcb7a, 0xde7a33, 0x7a3318],
      emitCallback: (particle: Phaser.GameObjects.Particles.Particle) => {
        this.applyTitleEmberDrift(particle, false)
      },
    })
    emitter.setBlendMode(Phaser.BlendModes.ADD)
    emitter.setDepth(26)
    this.titleEmberEmitter = emitter

    const burstEmitter = this.add.particles(0, 0, 'start-menu-ember-speck', {
      frequency: -1,
      lifespan: { min: 1120, max: 1820 },
      rotate: { min: -90, max: 90 },
      scale: { start: 0.34 * this.uiScale, end: 0.04 * this.uiScale },
      alpha: { start: 0.74, end: 0 },
      tint: [0xfff2d8, 0xffd188, 0xeb7d34, 0x8b3819],
      emitCallback: (particle: Phaser.GameObjects.Particles.Particle) => {
        this.applyTitleEmberDrift(particle, true)
      },
    })
    burstEmitter.setBlendMode(Phaser.BlendModes.ADD)
    burstEmitter.setDepth(26.2)
    this.titleEmberBurstEmitter = burstEmitter

    const ashEmitter = this.add.particles(0, 0, 'start-menu-ember-speck', {
      emitZone: { type: 'random', source: edgeSource },
      frequency: 170,
      quantity: 1,
      lifespan: { min: 1200, max: 2200 },
      rotate: { min: -90, max: 90 },
      scale: { start: 0.22 * this.uiScale, end: 0.03 * this.uiScale },
      alpha: { start: 0.22, end: 0 },
      tint: [0x2b211b, 0x3a2d25, 0x4a3a30, 0x5b4739],
      emitCallback: (particle: Phaser.GameObjects.Particles.Particle) => {
        this.applyTitleAshDrift(particle)
      },
    })
    ashEmitter.setBlendMode(Phaser.BlendModes.NORMAL)
    ashEmitter.setDepth(25.8)
    this.titleAshEmitter = ashEmitter

    const triggerBurst = (): void => {
      if (!this.titleEmberBurstEmitter || edgeSource.points.length === 0) return
      const hotspot = edgeSource.points[Phaser.Math.Between(0, edgeSource.points.length - 1)]
      const burstX = hotspot.x + Phaser.Math.FloatBetween(-16, 16)
      const burstY = hotspot.y + Phaser.Math.FloatBetween(-10, 10)
      this.titleEmberBurstEmitter.explode(Phaser.Math.Between(2, 5), burstX, burstY)
      this.titleEmberBurstEvent = this.time.delayedCall(
        Phaser.Math.Between(260, 620),
        triggerBurst,
      )
    }

    this.titleEmberBurstEvent = this.time.delayedCall(
      Phaser.Math.Between(180, 420),
      triggerBurst,
    )
  }

  private captureTexturePixels(
    textureKey: string,
    width: number,
    height: number,
  ): Uint8ClampedArray | undefined {
    const sourceTexture = this.textures.get(textureKey)
    const sourceImage = sourceTexture?.getSourceImage() as CanvasImageSource | undefined
    const sourceWidth = (sourceImage as { width?: number } | undefined)?.width ?? 0
    const sourceHeight = (sourceImage as { height?: number } | undefined)?.height ?? 0
    if (!sourceImage || sourceWidth <= 0 || sourceHeight <= 0) return undefined

    const scanKey = `${textureKey}-burn-scan`
    if (this.textures.exists(scanKey)) this.textures.remove(scanKey)
    const scanTexture = this.textures.createCanvas(scanKey, width, height)
    if (!scanTexture) return undefined

    const ctx = scanTexture.context
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(sourceImage, 0, 0, width, height)
    const pixels = new Uint8ClampedArray(ctx.getImageData(0, 0, width, height).data)
    this.textures.remove(scanKey)
    return pixels
  }

  private populateTitleBurnNoise(width: number, height: number): void {
    if (!this.titleBurnNoise || !this.titleBurnSpeckNoise) return

    const coarseCell = START_TITLE_BURN.coarseCell
    const coarseW = Math.ceil(width / coarseCell)
    const coarseH = Math.ceil(height / coarseCell)
    const coarse = new Float32Array(coarseW * coarseH)

    for (let i = 0; i < coarse.length; i += 1) {
      coarse[i] = Math.random()
    }

    for (let y = 0; y < height; y += 1) {
      const gy = Math.floor(y / coarseCell)
      const gyNext = Math.min(coarseH - 1, gy + 1)
      const ty = (y % coarseCell) / coarseCell
      for (let x = 0; x < width; x += 1) {
        const gx = Math.floor(x / coarseCell)
        const gxNext = Math.min(coarseW - 1, gx + 1)
        const tx = (x % coarseCell) / coarseCell

        const top = Phaser.Math.Linear(
          coarse[gy * coarseW + gx],
          coarse[gy * coarseW + gxNext],
          tx,
        )
        const bottom = Phaser.Math.Linear(
          coarse[gyNext * coarseW + gx],
          coarse[gyNext * coarseW + gxNext],
          tx,
        )
        const smooth = Phaser.Math.Linear(top, bottom, ty)
        const plume = 0.5 + 0.5 * Math.sin(y * 0.053 + x * 0.019)
        const idx = y * width + x
        this.titleBurnNoise[idx] = Phaser.Math.Clamp(smooth * 0.72 + plume * 0.28, 0, 1)
        this.titleBurnSpeckNoise[idx] = Math.random()
      }
    }
  }

  private updateTitleBurnEffect(time: number, delta: number): void {
    if (
      !this.titleBurnCharCanvas ||
      !this.titleBurnGlowCanvas ||
      !this.titleBurnSourcePixels ||
      !this.titleBurnEdgeMask ||
      !this.titleBurnNoise ||
      !this.titleBurnSpeckNoise
    ) {
      return
    }

    this.titleBurnUpdateAccum += delta
    if (this.titleBurnUpdateAccum < START_TITLE_BURN.updateStepMs) return
    this.titleBurnUpdateAccum %= START_TITLE_BURN.updateStepMs

    const cycle = (time % START_TITLE_BURN.cycleMs) / START_TITLE_BURN.cycleMs
    const slowPulse = 0.5 + 0.5 * Math.sin(cycle * Math.PI * 2)
    const warmFlicker = Math.pow(0.5 + 0.5 * Math.sin(time * 0.011), 3)
    const emberStrength = 0.56 + slowPulse * 0.2 + warmFlicker * 0.18
    const masterAlpha = 0.76 + slowPulse * 0.08 + warmFlicker * 0.12

    this.renderTitleBurnOverlay(emberStrength, masterAlpha, time * 0.001)
  }

  private renderTitleBurnOverlay(progress: number, masterAlpha: number, now: number): void {
    if (
      !this.titleBurnCharCanvas ||
      !this.titleBurnGlowCanvas ||
      !this.titleBurnSourcePixels ||
      !this.titleBurnEdgeMask ||
      !this.titleBurnNoise ||
      !this.titleBurnSpeckNoise
    ) {
      return
    }

    const width = START_TITLE_PATH.width
    const height = START_TITLE_PATH.height
    const source = this.titleBurnSourcePixels
    const edgeMask = this.titleBurnEdgeMask
    const noise = this.titleBurnNoise
    const speck = this.titleBurnSpeckNoise
    const charCtx = this.titleBurnCharCanvas.context
    const glowCtx = this.titleBurnGlowCanvas.context
    const charImageData = charCtx.createImageData(width, height)
    const glowImageData = glowCtx.createImageData(width, height)
    const charPixels = charImageData.data
    const glowPixels = glowImageData.data

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x
        const pixel = idx * 4
        const edge = edgeMask[idx]
        if (edge === 0) continue

        const alpha = source[pixel + 3]
        const n = noise[idx]
        const s = speck[idx]
        const flicker = 0.5 + 0.5 * Math.sin(now * 5.2 + x * 0.12 + y * 0.08)
        const hotspot = Phaser.Math.Clamp((n * 0.55 + s * 0.45 + flicker * 0.4) - 0.72, 0, 1) / 0.28
        const emberHeat = Phaser.Math.Clamp(progress * (0.22 + hotspot * 0.95), 0, 1)
        const soot = Phaser.Math.Clamp((n * 0.68 + (1 - s) * 0.32) - 0.5, 0, 1) / 0.5

        if (edge === 2 && alpha > 0) {
          const charAlpha = (0.05 + hotspot * 0.2) * masterAlpha
          const glowAlpha = (0.08 + hotspot * 0.62) * masterAlpha

          const warmR = 72 + Math.round(40 * emberHeat)
          const warmG = 28 + Math.round(26 * emberHeat)
          const warmB = 12 + Math.round(12 * emberHeat)
          const sootMix = Phaser.Math.Clamp(soot * 0.58, 0, 0.58)

          charPixels[pixel] = Math.round(Phaser.Math.Linear(warmR, 30, sootMix))
          charPixels[pixel + 1] = Math.round(Phaser.Math.Linear(warmG, 20, sootMix))
          charPixels[pixel + 2] = Math.round(Phaser.Math.Linear(warmB, 16, sootMix))
          charPixels[pixel + 3] = Math.round(alpha * (charAlpha + soot * 0.08 * masterAlpha))

          glowPixels[pixel] = 255
          glowPixels[pixel + 1] = 98 + Math.round(102 * emberHeat)
          glowPixels[pixel + 2] = 14 + Math.round(42 * emberHeat)
          glowPixels[pixel + 3] = Math.round(alpha * glowAlpha)
          continue
        }

        if (edge === 1) {
          const outerGlowAlpha = (0.05 + hotspot * 0.42) * masterAlpha
          const ashAlpha = (0.03 + soot * 0.12) * masterAlpha

          charPixels[pixel] = 34 + Math.round(18 * soot)
          charPixels[pixel + 1] = 27 + Math.round(10 * soot)
          charPixels[pixel + 2] = 22 + Math.round(8 * soot)
          charPixels[pixel + 3] = Math.round(255 * ashAlpha)

          glowPixels[pixel] = 255
          glowPixels[pixel + 1] = 96 + Math.round(96 * emberHeat)
          glowPixels[pixel + 2] = 14 + Math.round(40 * emberHeat)
          glowPixels[pixel + 3] = Math.round(255 * outerGlowAlpha)
        }
      }
    }

    charCtx.clearRect(0, 0, width, height)
    glowCtx.clearRect(0, 0, width, height)
    charCtx.putImageData(charImageData, 0, 0)
    glowCtx.putImageData(glowImageData, 0, 0)

    this.titleBurnCharCanvas.refresh()
    this.titleBurnGlowCanvas.refresh()
  }

  private buildTitleEdgePointSource(
    width: number,
    height: number,
    edgeMask: Uint8Array,
  ): DustPointSource {
    const points: Phaser.Math.Vector2[] = []
    const step = 5
    const baseX = this.titlePathCenter.x - width * 0.5 * this.uiScale
    const baseY = this.titlePathCenter.y - height * 0.5 * this.uiScale

    for (let y = 1; y < height - 1; y += step) {
      for (let x = 1; x < width - 1; x += step) {
        const idx = y * width + x
        if (edgeMask[idx] === 0) continue

        points.push(
          new Phaser.Math.Vector2(
            baseX + x * this.uiScale + Phaser.Math.FloatBetween(-2.1, 2.1) * this.uiScale,
            baseY + y * this.uiScale + Phaser.Math.FloatBetween(-1.8, 1.8) * this.uiScale,
          ),
        )
      }
    }

    return {
      points,
      getRandomPoint: (
        point: Phaser.Types.Math.Vector2Like,
      ): Phaser.Types.Math.Vector2Like => {
        const sample = points[Phaser.Math.Between(0, points.length - 1)]
        point.x = sample.x
        point.y = sample.y
        return point
      },
    }
  }

  private applyTitleEmberDrift(
    particle: Phaser.GameObjects.Particles.Particle,
    burst: boolean,
  ): void {
    let dx = particle.x - this.titlePathCenter.x
    let dy = particle.y - this.titlePathCenter.y

    if (dx === 0 && dy === 0) {
      dx = Phaser.Math.FloatBetween(-1, 1)
      dy = Phaser.Math.FloatBetween(-1, 1)
    }

    const len = Math.max(0.001, Math.sqrt(dx * dx + dy * dy))
    const nx = dx / len
    const outward = burst
      ? Phaser.Math.FloatBetween(22, 42)
      : Phaser.Math.FloatBetween(10, 22)
    const updraft = burst
      ? Phaser.Math.FloatBetween(24, 38)
      : Phaser.Math.FloatBetween(10, 20)
    const driftX = burst
      ? Phaser.Math.FloatBetween(-8, 8)
      : Phaser.Math.FloatBetween(-4, 4)

    particle.velocityX = nx * outward + driftX
    particle.velocityY = -updraft + Math.abs(nx) * -4
    particle.accelerationX = nx * (burst ? 4 : 2)
    particle.accelerationY = -(burst ? 3 : 1)
  }

  private applyTitleAshDrift(particle: Phaser.GameObjects.Particles.Particle): void {
    let dx = particle.x - this.titlePathCenter.x
    if (dx === 0) dx = Phaser.Math.FloatBetween(-1, 1)

    const nx = dx / Math.max(0.001, Math.abs(dx))
    particle.velocityX = nx * Phaser.Math.FloatBetween(4, 10) + Phaser.Math.FloatBetween(-2, 2)
    particle.velocityY = -Phaser.Math.FloatBetween(5, 12)
    particle.accelerationX = nx * 0.5
    particle.accelerationY = -0.6
  }

  private updateTitlePathEffect(time: number, _delta: number): void {
    if (this.titlePathLayers.length === 0) return

    const now = time * 0.001
    const fastPulse = Math.pow(0.5 + 0.5 * Math.sin(now * 5.1), 4)
    const mediumPulse = 0.5 + 0.5 * Math.sin(now * 1.9 + 0.7)
    const slowPulse = 0.5 + 0.5 * Math.sin(now * 0.82 + 1.4)
    const flicker = Phaser.Math.Clamp(fastPulse * 0.62 + mediumPulse * 0.34 + slowPulse * 0.18, 0, 0.9)

    for (let i = 0; i < this.titlePathLayers.length; i += 1) {
      const layer = this.titlePathLayers[i]
      const layerPulse = 0.5 + 0.5 * Math.sin(now * (0.7 + layer.speed * 0.55) + layer.phase)
      const intensity = flicker * (0.84 + layer.alphaBoost * 1.4 + layerPulse * 0.28)

      layer.image.setPosition(
        layer.baseX + layer.offsetX * this.uiScale,
        layer.baseY + layer.offsetY * this.uiScale,
      )
      layer.image.setAlpha(layer.baseAlpha + layer.alphaBoost * intensity)
      layer.image.setTint(layer.tint)
      layer.image.setBlendMode(layer.blendMode)
    }
  }

  private createDecorMotionOverlays(): void {
    this.ensureParticleTextures()
    this.createCompassNeedleSway()
    this.createCupWaterSway()
  }

  private createCompassNeedleSway(): void {
    const pos = this.refToWorld(START_LAYOUT.compassNeedleRefX, START_LAYOUT.compassNeedleRefY)

    const needleShadow = this.add
      .image(1.4 * this.uiScale, 1.8 * this.uiScale, 'start-compass-needle')
      .setOrigin(0.5, 0.78)
      .setScale(this.uiScale * 0.96)
      .setTint(0x2d2118)
      .setAlpha(0.24)

    const needle = this.add
      .image(0, 0, 'start-compass-needle')
      .setOrigin(0.5, 0.78)
      .setScale(this.uiScale * 1.02)
      .setAlpha(0.96)

    const cap = this.add
      .circle(0, 8 * this.uiScale, Math.max(2.2, 3.4 * this.uiScale), 0xe9d1a7, 0.78)
      .setStrokeStyle(Math.max(1, 1.1 * this.uiScale), 0x4b3728, 0.55)

    const needleRoot = this.add
      .container(pos.x, pos.y, [needleShadow, needle, cap])
      .setDepth(9)
      .setAngle(36)

    this.decorMotionNodes.push(needleRoot)

    this.tweens.add({
      targets: needleRoot,
      angle: { from: 30.6, to: 41.8 },
      duration: 1980,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    })
  }

  private createCupWaterSway(): void {
    const pos = this.refToWorld(START_LAYOUT.cupWaterRefX, START_LAYOUT.cupWaterRefY)
    const w = START_LAYOUT.cupWaterRefW * this.uiScale
    const h = START_LAYOUT.cupWaterRefH * this.uiScale

    const maskShape = this.add.graphics().setVisible(false).setDepth(8)
    maskShape.fillStyle(0xffffff, 1)
    maskShape.fillEllipse(pos.x, pos.y, w, h)

    const waterShadow = this.add.ellipse(0, h * 0.06, w * 0.9, h * 0.7, 0x434947, 0.12)
    const waterFill = this.add.ellipse(0, 0, w, h, 0x808982, 0.24)
    const waterHighlight = this.add.rectangle(
      -w * 0.12,
      -h * 0.18,
      w * 0.48,
      Math.max(1.2, 2.1 * this.uiScale),
      0xf3fbf4,
      0.18,
    )
    const waterGlint = this.add.rectangle(
      w * 0.18,
      -h * 0.02,
      w * 0.12,
      Math.max(1, 1.4 * this.uiScale),
      0xffffff,
      0.08,
    )

    const waterRoot = this.add
      .container(pos.x, pos.y, [waterShadow, waterFill, waterHighlight, waterGlint])
      .setDepth(9)
      .setAlpha(0.96)

    waterRoot.setMask(maskShape.createGeometryMask())
    this.decorMotionNodes.push(maskShape, waterRoot)

    this.tweens.add({
      targets: waterRoot,
      angle: { from: -1.5, to: 1.5 },
      y: pos.y + 1.2 * this.uiScale,
      duration: 2240,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    })

    this.tweens.add({
      targets: waterHighlight,
      x: { from: -w * 0.18, to: -w * 0.06 },
      alpha: { from: 0.13, to: 0.2 },
      duration: 1980,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    })
  }

  private createRetroVideoNoiseOverlay(): void {
    this.ensureParticleTextures()

    const w = this.scale.width
    const h = this.scale.height

    const noiseTile = this.add
      .tileSprite(0, 0, w, h, 'start-video-noise-tile')
      .setOrigin(0, 0)
      .setAlpha(0.1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(120)

    this.videoNoiseTile = noiseTile
    this.videoNoiseNodes.push(noiseTile)

    const scanColumns = [
      { xRatio: 0.21, alpha: 0.08, scaleX: 1.05 },
      { xRatio: 0.53, alpha: 0.07, scaleX: 0.94 },
      { xRatio: 0.84, alpha: 0.06, scaleX: 0.88 },
    ]

    for (const column of scanColumns) {
      const scan = this.add
        .image(w * column.xRatio, h * 0.5, 'start-video-scan-column')
        .setScale(column.scaleX, h / 256)
        .setAlpha(column.alpha)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(121)

      this.videoNoiseNodes.push(scan)
      this.tweens.add({
        targets: scan,
        alpha: { from: column.alpha * 0.65, to: column.alpha * 1.28 },
        duration: 1700 + Math.floor(column.xRatio * 600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      })
    }

    const speckEmitter = this.add.particles(0, 0, 'start-video-noise-speck', {
      x: { min: 0, max: w },
      y: { min: 0, max: h },
      frequency: 34,
      quantity: 1,
      lifespan: { min: 120, max: 340 },
      speedX: { min: -1.6, max: 1.6 },
      speedY: { min: -1.4, max: 1.4 },
      scale: { start: 0.72, end: 0 },
      alpha: { start: 0.34, end: 0 },
      tint: [0xffffff, 0xe5ebff, 0xffe1f1],
    })
    speckEmitter.setBlendMode(Phaser.BlendModes.ADD)
    speckEmitter.setDepth(122)
    this.ambientEmitters.push(speckEmitter)
  }

  private updateRetroVideoNoise(time: number): void {
    if (!this.videoNoiseTile) return

    const frame = Math.floor(time / 46)
    const now = time * 0.001
    this.videoNoiseTile.tilePositionX = (frame * 17) % 192
    this.videoNoiseTile.tilePositionY = (frame * 11) % 108
    this.videoNoiseTile.setAlpha(0.08 + (0.5 + 0.5 * Math.sin(now * 8.4)) * 0.035)
  }

  private createAmbientBattlefieldParticles(): void {
    this.ensureParticleTextures()

    const w = this.scale.width
    const h = this.scale.height
    const flameTopLeft = this.refToWorld(START_LAYOUT.lampFlameRefX, START_LAYOUT.lampFlameRefY)
    const flameW = START_LAYOUT.lampFlameRefW * this.uiScale
    const flameH = START_LAYOUT.lampFlameRefH * this.uiScale
    const flameCenterX = flameTopLeft.x + flameW * 0.5

    this.createAmbientDustLayers(w, h)
    this.createGlobalEmberDrift(w, h)

    // Tiny warm embers around the top-right lamp for a worn campfire feel.
    const emberEmitter = this.add.particles(0, 0, 'start-ember-speck', {
      x: { min: flameCenterX - 96 * this.uiScale, max: flameCenterX + 38 * this.uiScale },
      y: { min: flameTopLeft.y - 8 * this.uiScale, max: flameTopLeft.y + flameH * 0.82 },
      lifespan: { min: 1000, max: 2100 },
      frequency: 130,
      quantity: 1,
      speedX: { min: -46, max: 22 },
      speedY: { min: -74, max: -28 },
      angle: { min: 220, max: 320 },
      scale: { start: 0.72 * this.uiScale, end: 0 },
      alpha: { start: 0.34, end: 0 },
      tint: [0xffdfad, 0xf8c78d, 0xe4a86d],
    })
    emberEmitter.setBlendMode(Phaser.BlendModes.ADD)
    emberEmitter.setDepth(96)
    this.ambientEmitters.push(emberEmitter)
  }

  private createGlobalEmberDrift(w: number, h: number): void {
    for (const preset of START_GLOBAL_EMBER_PRESETS) {
      const emitter = this.add.particles(0, 0, preset.textureKey, {
        x: {
          min: preset.xMinRatio * w,
          max: preset.xMaxRatio * w,
        },
        y: {
          min: preset.yMinRatio * h,
          max: preset.yMaxRatio * h,
        },
        lifespan: { min: preset.lifespanMin, max: preset.lifespanMax },
        frequency: preset.frequency,
        quantity: preset.quantity,
        speedX: { min: preset.speedXMin, max: preset.speedXMax },
        speedY: { min: preset.speedYMin, max: preset.speedYMax },
        accelerationX: { min: preset.accelXMin, max: preset.accelXMax },
        accelerationY: { min: preset.accelYMin, max: preset.accelYMax },
        rotate: { min: preset.rotateMin, max: preset.rotateMax },
        angle: { min: 0, max: 360 },
        scale: {
          start: preset.scaleStart * this.uiScale,
          end: preset.scaleEnd * this.uiScale,
        },
        alpha: { start: preset.alphaStart, end: 0 },
        tint: preset.tint,
      })
      emitter.setBlendMode(preset.blendMode)
      emitter.setDepth(preset.depth)
      this.ambientEmitters.push(emitter)
    }
  }

  private createAmbientDustLayers(w: number, h: number): void {
    for (const preset of START_DUST_LAYER_PRESETS) {
      if (!this.textures.exists(preset.key)) continue

      const zoneSource = this.buildDustPointSource(
        preset.key,
        w,
        h,
        preset.sampleStep,
        preset.alphaThreshold,
        preset.spawnDensity,
        preset.maxPoints,
      )
      const canUseEmitZone =
        !!zoneSource && zoneSource.points.length >= Math.max(120, Math.floor(preset.maxPoints * 0.08))

      const particleTextureKey = this.textures.exists(preset.particleTextureKey)
        ? preset.particleTextureKey
        : 'start-dust-speck'

      const emitter = this.add.particles(0, 0, particleTextureKey, {
        x: { min: 0, max: w },
        y: { min: h * 0.08, max: h * 0.96 },
        emitZone: canUseEmitZone ? { type: 'random', source: zoneSource } : undefined,
        lifespan: { min: preset.lifespanMin, max: preset.lifespanMax },
        frequency: preset.frequency,
        quantity: preset.quantity,
        speedX: { min: preset.speedXMin, max: preset.speedXMax },
        speedY: { min: preset.speedYMin, max: preset.speedYMax },
        accelerationX: { min: preset.accelXMin, max: preset.accelXMax },
        accelerationY: { min: preset.accelYMin, max: preset.accelYMax },
        angle: { min: 0, max: 360 },
        rotate: { min: 0, max: 360 },
        scale: {
          start: preset.scaleStart * this.uiScale,
          end: preset.scaleEnd * this.uiScale,
        },
        alpha: { start: preset.alphaStart, end: 0 },
        tint: preset.tint,
      })
      emitter.setDepth(preset.depth)
      this.ambientEmitters.push(emitter)
    }

    if (this.ambientEmitters.length > 0) return

    // Fallback for missing dust layer textures.
    const fallbackDust = this.add.particles(0, 0, 'start-dust-speck', {
      x: { min: 0, max: w },
      y: { min: h * 0.1, max: h * 0.95 },
      lifespan: { min: 3800, max: 7600 },
      frequency: 80,
      quantity: 1,
      speedX: { min: -28, max: 28 },
      speedY: { min: -22, max: 22 },
      accelerationX: { min: -9, max: 9 },
      accelerationY: { min: -9, max: 9 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7 * this.uiScale, end: 0.16 * this.uiScale },
      alpha: { start: 0.2, end: 0 },
      tint: [0x6a6156, 0x7c705f, 0x93836d],
    })
    fallbackDust.setDepth(18)
    this.ambientEmitters.push(fallbackDust)
  }

  private buildDustPointSource(
    textureKey: string,
    worldWidth: number,
    worldHeight: number,
    sampleStep: number,
    alphaThreshold: number,
    spawnDensity: number,
    maxPoints: number,
  ): DustPointSource | undefined {
    const texture = this.textures.get(textureKey)
    if (!texture) return undefined

    const sourceImage = texture.getSourceImage() as CanvasImageSource
    const width = (sourceImage as { width?: number }).width ?? 0
    const height = (sourceImage as { height?: number }).height ?? 0
    if (width <= 0 || height <= 0) return undefined

    const scanKey = `scan-${textureKey}`
    if (this.textures.exists(scanKey)) this.textures.remove(scanKey)
    const scanTexture = this.textures.createCanvas(scanKey, width, height)
    if (!scanTexture) return undefined
    const ctx = scanTexture.context
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(sourceImage, 0, 0, width, height)
    scanTexture.refresh()

    const imageData = ctx.getImageData(0, 0, width, height).data
    const points: Phaser.Math.Vector2[] = []
    const safeStep = Math.max(2, sampleStep)

    for (let y = 0; y < height; y += safeStep) {
      for (let x = 0; x < width; x += safeStep) {
        const i = (y * width + x) * 4
        const alpha = imageData[i + 3]
        if (alpha < alphaThreshold) continue

        const lum = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3
        const strength = (alpha / 255) * (0.35 + (lum / 255) * 0.65)
        if (Math.random() > strength * spawnDensity) continue

        const nx = (x + Phaser.Math.FloatBetween(-safeStep * 0.5, safeStep * 0.5)) / width
        const ny = (y + Phaser.Math.FloatBetween(-safeStep * 0.5, safeStep * 0.5)) / height
        points.push(new Phaser.Math.Vector2(nx * worldWidth, ny * worldHeight))
      }
    }

    this.textures.remove(scanKey)
    if (points.length === 0) return undefined
    if (points.length > maxPoints) {
      Phaser.Utils.Array.Shuffle(points)
      points.length = maxPoints
    }

    return {
      points,
      getRandomPoint: (
        point: Phaser.Types.Math.Vector2Like,
      ): Phaser.Types.Math.Vector2Like => {
        const sample = points[Phaser.Math.Between(0, points.length - 1)]
        point.x = sample.x
        point.y = sample.y
        return point
      },
    }
  }

  private ensureParticleTextures(): void {
    if (!this.textures.exists('start-dust-speck')) {
      const g = this.add.graphics()
      g.setVisible(false)
      g.fillStyle(0xffffff, 1)
      g.fillCircle(7, 7, 6)
      g.generateTexture('start-dust-speck', 14, 14)
      g.destroy()
    }

    if (!this.textures.exists('start-ember-speck')) {
      const g = this.add.graphics()
      g.setVisible(false)
      g.fillStyle(0xffffff, 1)
      g.fillEllipse(6, 4, 10, 5)
      g.generateTexture('start-ember-speck', 12, 8)
      g.destroy()
    }

    if (!this.textures.exists('start-menu-ember-speck')) {
      const g = this.add.graphics()
      g.setVisible(false)
      g.fillStyle(0xffffff, 0.2)
      g.fillCircle(8, 8, 6)
      g.fillStyle(0xffffff, 0.65)
      g.fillCircle(8, 8, 3)
      g.fillStyle(0xffffff, 1)
      g.fillCircle(8, 8, 1)
      g.generateTexture('start-menu-ember-speck', 16, 16)
      g.destroy()
    }

    if (!this.textures.exists('start-ember-glow-mote')) {
      const g = this.add.graphics()
      g.setVisible(false)
      g.fillStyle(0xffffff, 0.08)
      g.fillCircle(16, 16, 15)
      g.fillStyle(0xffffff, 0.2)
      g.fillCircle(16, 16, 10)
      g.fillStyle(0xffffff, 0.42)
      g.fillCircle(16, 16, 5)
      g.generateTexture('start-ember-glow-mote', 32, 32)
      g.destroy()
    }

    if (!this.textures.exists('start-compass-needle')) {
      const g = this.add.graphics()
      g.setVisible(false)
      g.fillStyle(0xaf2e22, 0.96)
      g.fillTriangle(11, 4, 4, 33, 18, 33)
      g.fillStyle(0xe6d8b8, 0.9)
      g.fillTriangle(11, 53, 6, 27, 16, 27)
      g.fillStyle(0x3d2a1f, 0.42)
      g.fillRect(10, 25, 2, 10)
      g.generateTexture('start-compass-needle', 22, 58)
      g.destroy()
    }

    if (!this.textures.exists('start-video-noise-speck')) {
      const g = this.add.graphics()
      g.setVisible(false)
      g.fillStyle(0xffffff, 0.22)
      g.fillCircle(3, 3, 2)
      g.fillStyle(0xffffff, 0.78)
      g.fillCircle(3, 3, 1)
      g.generateTexture('start-video-noise-speck', 6, 6)
      g.destroy()
    }

    if (!this.textures.exists('start-video-scan-column')) {
      const g = this.add.graphics()
      g.setVisible(false)
      g.fillStyle(0xffffff, 0.025)
      g.fillRect(0, 0, 16, 256)
      g.fillStyle(0x86b8ff, 0.06)
      g.fillRect(4, 0, 1, 256)
      g.fillStyle(0xffffff, 0.1)
      g.fillRect(7, 0, 2, 256)
      g.fillStyle(0xff9ed5, 0.05)
      g.fillRect(11, 0, 1, 256)
      g.generateTexture('start-video-scan-column', 16, 256)
      g.destroy()
    }

    if (!this.textures.exists('start-video-noise-tile')) {
      const noiseTexture = this.textures.createCanvas('start-video-noise-tile', 192, 108)
      if (noiseTexture) {
        const ctx = noiseTexture.context
        ctx.clearRect(0, 0, 192, 108)

        const imageData = ctx.createImageData(192, 108)
        const pixels = imageData.data
        for (let i = 0; i < pixels.length; i += 4) {
          const roll = Math.random()
          if (roll < 0.022) {
            const colorRoll = Math.random()
            if (colorRoll < 0.14) {
              pixels[i] = 255
              pixels[i + 1] = 216
              pixels[i + 2] = 236
            } else if (colorRoll < 0.28) {
              pixels[i] = 214
              pixels[i + 1] = 230
              pixels[i + 2] = 255
            } else {
              pixels[i] = 255
              pixels[i + 1] = 255
              pixels[i + 2] = 255
            }
            pixels[i + 3] = 40 + Math.floor(Math.random() * 70)
          } else if (roll < 0.032) {
            pixels[i] = 255
            pixels[i + 1] = 255
            pixels[i + 2] = 255
            pixels[i + 3] = 14 + Math.floor(Math.random() * 26)
          }
        }

        ctx.putImageData(imageData, 0, 0)
        noiseTexture.refresh()
        this.textures.get('start-video-noise-tile').setFilter(Phaser.Textures.FilterMode.NEAREST)
      }
    }

    if (!this.textures.exists('start-lamp-glow')) {
      const g = this.add.graphics()
      g.setVisible(false)
      g.fillStyle(0xffffff, 0.14)
      g.fillCircle(24, 24, 24)
      g.fillStyle(0xffffff, 0.3)
      g.fillCircle(24, 24, 17)
      g.fillStyle(0xffffff, 0.52)
      g.fillCircle(24, 24, 10)
      g.generateTexture('start-lamp-glow', 48, 48)
      g.destroy()
    }

    if (!this.textures.exists('start-lamp-light-cone')) {
      const g = this.add.graphics()
      g.setVisible(false)
      g.fillStyle(0xffffff, 0.055)
      g.fillEllipse(64, 136, 120, 42)
      g.fillStyle(0xffffff, 0.095)
      g.fillTriangle(64, 8, 10, 132, 118, 132)
      g.fillStyle(0xffffff, 0.16)
      g.fillEllipse(64, 104, 92, 82)
      g.fillStyle(0xffffff, 0.25)
      g.fillEllipse(64, 68, 58, 64)
      g.fillStyle(0xffffff, 0.34)
      g.fillEllipse(64, 34, 28, 30)
      g.generateTexture('start-lamp-light-cone', 128, 160)
      g.destroy()
    }

    if (!this.textures.exists('start-lamp-flame-outer')) {
      const g = this.add.graphics()
      g.setVisible(false)
      g.fillStyle(0xffffff, 0.16)
      g.fillTriangle(14, 3, 4, 28, 24, 28)
      g.fillStyle(0xffffff, 0.42)
      g.fillEllipse(14, 20, 18, 22)
      g.fillStyle(0xffffff, 0.84)
      g.fillTriangle(14, 5, 7, 24, 21, 24)
      g.fillStyle(0xffffff, 1)
      g.fillEllipse(14, 12, 8, 10)
      g.generateTexture('start-lamp-flame-outer', 28, 32)
      g.destroy()
    }

    if (!this.textures.exists('start-lamp-flame-core')) {
      const g = this.add.graphics()
      g.setVisible(false)
      g.fillStyle(0xffffff, 0.26)
      g.fillTriangle(10, 2, 4, 20, 16, 20)
      g.fillStyle(0xffffff, 0.72)
      g.fillEllipse(10, 15, 12, 14)
      g.fillStyle(0xffffff, 1)
      g.fillEllipse(10, 9, 6, 8)
      g.generateTexture('start-lamp-flame-core', 20, 24)
      g.destroy()
    }

    if (!this.textures.exists('start-trench-sand-speck')) {
      const g = this.add.graphics()
      g.setVisible(false)
      g.fillStyle(0xffffff, 0.2)
      g.fillEllipse(9, 9, 18, 10)
      g.fillStyle(0xffffff, 0.5)
      g.fillEllipse(9, 9, 12, 6)
      g.fillStyle(0xffffff, 0.86)
      g.fillEllipse(9, 9, 7, 3)
      g.fillStyle(0xffffff, 1)
      g.fillCircle(12, 9, 1)
      g.fillCircle(7, 10, 1)
      g.generateTexture('start-trench-sand-speck', 18, 18)
      g.destroy()
    }
  }

  private createTopRightLampLightSequence(): void {
    this.ensureParticleTextures()

    const flameTopLeft = this.refToWorld(START_LAYOUT.lampFlameRefX, START_LAYOUT.lampFlameRefY)
    const flameW = START_LAYOUT.lampFlameRefW * this.uiScale
    const flameH = START_LAYOUT.lampFlameRefH * this.uiScale
    const flameX = flameTopLeft.x + flameW * 0.5
    const flameY = flameTopLeft.y + flameH * 0.5
    const radialUnit = Math.max(flameW, flameH)
    const flameVisualScale = 0.72
    const haloFarBaseScale = (radialUnit * 9.7) / 48
    const haloOuterBaseScale = (radialUnit * 7.7) / 48
    const haloMidBaseScale = (radialUnit * 5.8) / 48
    const haloInnerBaseScale = (radialUnit * 3.8) / 48
    const flameBodyBaseScaleX = (flameW / 28) * flameVisualScale
    const flameBodyBaseScaleY = (flameH / 32) * flameVisualScale
    const flameCoreBaseScaleX = ((flameW * 0.48) / 20) * flameVisualScale
    const flameCoreBaseScaleY = ((flameH * 0.72) / 24) * flameVisualScale

    const rangeRings = [
      { radius: radialUnit * 5.45, fillAlpha: 0.01, strokeAlpha: 0.02, tint: 0xa94f20 },
      { radius: radialUnit * 4.15, fillAlpha: 0.014, strokeAlpha: 0.03, tint: 0xd5732c },
      { radius: radialUnit * 3.05, fillAlpha: 0.02, strokeAlpha: 0.042, tint: 0xf29a43 },
      { radius: radialUnit * 2.08, fillAlpha: 0.028, strokeAlpha: 0.065, tint: 0xffc06a },
      { radius: radialUnit * 1.22, fillAlpha: 0.04, strokeAlpha: 0.1, tint: 0xffe1a0 },
    ].map((ring, index) => {
      const node = this.add
        .circle(flameX, flameY, ring.radius, ring.tint, ring.fillAlpha)
        .setStrokeStyle(Math.max(1, 1.2 * this.uiScale), ring.tint, ring.strokeAlpha)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(84 + index * 0.25)
      return { ...ring, node }
    })

    const haloFar = this.add
      .image(flameX, flameY, 'start-lamp-glow')
      .setScale(haloFarBaseScale)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xd7964d)
      .setAlpha(0.09)
      .setDepth(88)

    const haloOuter = this.add
      .image(flameX, flameY, 'start-lamp-glow')
      .setScale(haloOuterBaseScale)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xefb467)
      .setAlpha(0.12)
      .setDepth(88)

    const haloMid = this.add
      .image(flameX, flameY, 'start-lamp-glow')
      .setScale(haloMidBaseScale)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffd190)
      .setAlpha(0.16)
      .setDepth(89)

    const haloInner = this.add
      .image(flameX, flameY, 'start-lamp-glow')
      .setScale(haloInnerBaseScale)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xfff0be)
      .setAlpha(0.24)
      .setDepth(90)

    const flameLeft = this.add
      .image(flameX - flameW * 0.12, flameY + flameH * 0.02, 'start-lamp-flame-outer')
      .setOrigin(0.5, 0.5)
      .setScale(flameBodyBaseScaleX * 0.62, flameBodyBaseScaleY * 0.82)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffa13a)
      .setAlpha(0.32)
      .setRotation(-0.18)
      .setDepth(94)

    const flameRight = this.add
      .image(flameX + flameW * 0.1, flameY + flameH * 0.03, 'start-lamp-flame-outer')
      .setOrigin(0.5, 0.5)
      .setScale(flameBodyBaseScaleX * 0.52, flameBodyBaseScaleY * 0.76)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffc56e)
      .setAlpha(0.25)
      .setRotation(0.16)
      .setDepth(94)

    const flameBody = this.add
      .image(flameX, flameY, 'start-lamp-flame-outer')
      .setOrigin(0.5, 0.5)
      .setScale(flameBodyBaseScaleX, flameBodyBaseScaleY)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff7e1f)
      .setAlpha(0.54)
      .setDepth(95)

    const flameCore = this.add
      .image(flameX, flameY + flameH * 0.04, 'start-lamp-flame-core')
      .setOrigin(0.5, 0.5)
      .setScale(flameCoreBaseScaleX, flameCoreBaseScaleY)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffffe2)
      .setAlpha(0.78)
      .setDepth(96)

    this.lampFlameNodes.push(
      ...rangeRings.map((ring) => ring.node),
      haloFar,
      haloOuter,
      haloMid,
      haloInner,
      flameLeft,
      flameRight,
      flameBody,
      flameCore,
    )

    this.updateLampDrivenShadows(flameX, flameY, 0.5)

    const outerEmitter = this.add.particles(flameX, flameY, 'start-lamp-flame-outer', {
      x: { min: -flameW * 0.08, max: flameW * 0.08 },
      y: { min: -flameH * 0.06, max: flameH * 0.12 },
      frequency: 72,
      quantity: 1,
      lifespan: { min: 420, max: 680 },
      speedX: { min: -14, max: 14 },
      speedY: { min: -82, max: -24 },
      accelerationY: { min: -12, max: -20 },
      scale: { start: flameBodyBaseScaleX * 1.0, end: flameBodyBaseScaleX * 0.1 },
      alpha: { start: 0.34, end: 0 },
      rotate: { min: -18, max: 18 },
      tint: [0xffd783, 0xff9b30, 0xee5b16],
    })
    outerEmitter.setBlendMode(Phaser.BlendModes.ADD)
    outerEmitter.setDepth(95)
    this.ambientEmitters.push(outerEmitter)

    const innerEmitter = this.add.particles(flameX, flameY, 'start-lamp-flame-core', {
      x: { min: -flameW * 0.05, max: flameW * 0.05 },
      y: { min: -flameH * 0.04, max: flameH * 0.1 },
      frequency: 58,
      quantity: 1,
      lifespan: { min: 340, max: 600 },
      speedX: { min: -7, max: 7 },
      speedY: { min: -58, max: -16 },
      accelerationY: { min: -6, max: -12 },
      scale: { start: flameCoreBaseScaleX * 0.94, end: flameCoreBaseScaleX * 0.14 },
      alpha: { start: 0.62, end: 0 },
      rotate: { min: -8, max: 8 },
      tint: [0xfffff1, 0xfff3c7, 0xffd477],
    })
    innerEmitter.setBlendMode(Phaser.BlendModes.ADD)
    innerEmitter.setDepth(96)
    this.ambientEmitters.push(innerEmitter)

    const sparkEmitter = this.add.particles(flameX, flameY, 'start-ember-glow-mote', {
      x: { min: -flameW * 0.24, max: flameW * 0.24 },
      y: { min: -flameH * 0.18, max: flameH * 0.2 },
      frequency: 62,
      quantity: 1,
      lifespan: { min: 560, max: 1180 },
      speedX: { min: -18, max: 16 },
      speedY: { min: -96, max: -30 },
      accelerationX: { min: -5, max: 5 },
      accelerationY: { min: -14, max: -4 },
      scale: { start: 0.2 * this.uiScale, end: 0.03 * this.uiScale },
      alpha: { start: 0.36, end: 0 },
      rotate: { min: -60, max: 60 },
      tint: [0xfff4c8, 0xffc36c, 0xf27b22],
    })
    sparkEmitter.setBlendMode(Phaser.BlendModes.ADD)
    sparkEmitter.setDepth(97)
    this.ambientEmitters.push(sparkEmitter)

    const trenchDust = this.add.particles(flameX, flameY, 'start-trench-sand-speck', {
      x: { min: -flameW * 0.5, max: flameW * 0.5 },
      y: { min: -flameH * 0.16, max: flameH * 1.25 },
      frequency: 210,
      quantity: 1,
      lifespan: { min: 1900, max: 3600 },
      speedX: { min: -8, max: 4 },
      speedY: { min: -22, max: -8 },
      accelerationX: { min: -2, max: 2 },
      accelerationY: { min: -2, max: 0 },
      scale: { start: 0.22 * this.uiScale, end: 0.05 * this.uiScale },
      alpha: { start: 0.13, end: 0 },
      tint: [0x9e7e5d, 0xc0a07c, 0xe0c7a3],
    })
    trenchDust.setBlendMode(Phaser.BlendModes.ADD)
    trenchDust.setDepth(92)
    this.ambientEmitters.push(trenchDust)

    this.lampFlickerEvent = this.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => {
        const dx = Phaser.Math.FloatBetween(-1.2, 1.25) * this.uiScale
        const dy = Phaser.Math.FloatBetween(-2.8, 1.8) * this.uiScale
        const pulse = Phaser.Math.FloatBetween(0, 1)
        const haloX = flameX + dx * 0.18
        const haloY = flameY + dy * 0.14

        for (let i = 0; i < rangeRings.length; i += 1) {
          const ring = rangeRings[i]
          const ringPulse = Phaser.Math.Clamp(pulse * 0.58 + (1 - i / rangeRings.length) * 0.18, 0, 1)
          const drift = (i + 1) * 0.26
          ring.node.setPosition(haloX - dx * drift, haloY - dy * drift)
          ring.node.setScale(0.985 + ringPulse * (0.025 + i * 0.006))
          ring.node.setAlpha(0.68 + ringPulse * 0.1)
          ring.node.setFillStyle(ring.tint, ring.fillAlpha + ringPulse * 0.009)
          ring.node.setStrokeStyle(
            Math.max(1, 1.2 * this.uiScale),
            ring.tint,
            ring.strokeAlpha + ringPulse * 0.02,
          )
        }

        haloFar.setPosition(haloX, haloY)
        haloOuter.setPosition(haloX, haloY)
        haloMid.setPosition(haloX, haloY)
        haloInner.setPosition(haloX, haloY)

        haloFar.setScale(haloFarBaseScale * (0.985 + pulse * 0.03))
        haloOuter.setScale(haloOuterBaseScale * (0.985 + pulse * 0.038))
        haloMid.setScale(haloMidBaseScale * (0.986 + pulse * 0.046))
        haloInner.setScale(haloInnerBaseScale * (0.987 + pulse * 0.055))

        haloFar.setAlpha(0.075 + pulse * 0.03)
        haloOuter.setAlpha(0.1 + pulse * 0.035)
        haloMid.setAlpha(0.135 + pulse * 0.045)
        haloInner.setAlpha(0.2 + pulse * 0.06)

        flameLeft.setPosition(flameX - flameW * 0.12 + dx * 0.9, flameY + flameH * 0.02 + dy * 0.3)
        flameRight.setPosition(flameX + flameW * 0.1 + dx * 0.8, flameY + flameH * 0.03 + dy * 0.32)
        flameBody.setPosition(flameX + dx * 0.7, flameY + dy * 0.34)
        flameCore.setPosition(flameX + dx * 0.45, flameY + flameH * 0.04 + dy * 0.24)

        flameLeft.setRotation(-0.2 + Phaser.Math.FloatBetween(-0.08, 0.08))
        flameRight.setRotation(0.18 + Phaser.Math.FloatBetween(-0.08, 0.08))
        flameLeft.setScale(
          flameBodyBaseScaleX * (0.54 + Phaser.Math.FloatBetween(0, 0.13)),
          flameBodyBaseScaleY * (0.74 + Phaser.Math.FloatBetween(0, 0.16)),
        )
        flameRight.setScale(
          flameBodyBaseScaleX * (0.48 + Phaser.Math.FloatBetween(0, 0.11)),
          flameBodyBaseScaleY * (0.68 + Phaser.Math.FloatBetween(0, 0.16)),
        )
        flameLeft.setAlpha(0.24 + Phaser.Math.FloatBetween(0, 0.12))
        flameRight.setAlpha(0.2 + Phaser.Math.FloatBetween(0, 0.1))

        flameBody.setScale(
          flameBodyBaseScaleX * (0.94 + Phaser.Math.FloatBetween(0, 0.13)),
          flameBodyBaseScaleY * (0.94 + Phaser.Math.FloatBetween(0, 0.16)),
        )
        flameCore.setScale(
          flameCoreBaseScaleX * (0.9 + Phaser.Math.FloatBetween(0, 0.12)),
          flameCoreBaseScaleY * (0.9 + Phaser.Math.FloatBetween(0, 0.13)),
        )
        flameBody.setAlpha(0.48 + Phaser.Math.FloatBetween(0, 0.12))
        flameCore.setAlpha(0.68 + Phaser.Math.FloatBetween(0, 0.1))

        outerEmitter.setPosition(flameX + dx * 0.6, flameY + dy * 0.3)
        innerEmitter.setPosition(flameX + dx * 0.38, flameY + dy * 0.22)
        sparkEmitter.setPosition(flameX + dx * 0.4, flameY + dy * 0.2)
        trenchDust.setPosition(flameX + dx * 0.26, flameY + dy * 0.16)
        this.updateLampDrivenShadows(haloX, haloY, pulse)
      },
    })
  }

  private refToWorld(refX: number, refY: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.uiCenter.x + (refX - START_LAYOUT.bgW / 2) * this.uiScale,
      this.uiCenter.y + (refY - START_LAYOUT.bgH / 2) * this.uiScale,
    )
  }

  private runOptionalStartupStep<T>(label: string, fn: () => T, fallback?: T): T | undefined {
    try {
      return fn()
    } catch (error) {
      console.error(`[StartScene] Failed to initialize ${label}.`, error)
      return fallback
    }
  }

  private setupLayout(): void {
    const w = this.scale.width
    const h = this.scale.height
    const scaleByWidth = (w * 0.98) / START_LAYOUT.bgW
    const scaleByHeight = (h * 0.98) / START_LAYOUT.bgH
    this.uiScale = Math.min(scaleByWidth, scaleByHeight)
    this.uiCenter.set(w / 2, h / 2)
  }

  private createMenuButtons(): void {
    const baseScale = this.uiScale
    const startY = this.uiCenter.y + START_LAYOUT.buttonStartOffsetY * this.uiScale
    const x = this.uiCenter.x + START_LAYOUT.buttonOffsetX * this.uiScale

    for (let i = 0; i < this.menuEntries.length; i += 1) {
      const y = startY + i * START_LAYOUT.buttonStepY * this.uiScale
      const shadow = this.add
        .image(12 * this.uiScale, 7 * this.uiScale, this.menuEntries[i].key)
        .setScale(baseScale)
        .setTint(0x5f4632)
        .setAlpha(0.14)

      const burnPlate = this.add.image(0, 0, 'start-btn-burn-plate').setAlpha(0)
      const base = this.add.image(0, 0, this.menuEntries[i].key).setScale(baseScale)
      const active = this.add
        .image(0, 0, this.menuEntries[i].key)
        .setScale(baseScale)
        .setTint(0xfff4d4)
        .setAlpha(0)

      const buttonWidth = base.displayWidth
      const buttonHeight = base.displayHeight
      const burnPlateScale = baseScale
      burnPlate.setScale(burnPlateScale)

      const accentLine = this.add
        .rectangle(
          -buttonWidth * 0.5 - 24 * this.uiScale,
          0,
          42 * this.uiScale,
          Math.max(2, 3 * this.uiScale),
          0xf5e1b8,
          0,
        )
        .setOrigin(1, 0.5)
        .setScale(0, 1)

      const accentDot = this.add
        .rectangle(
          -buttonWidth * 0.5 - 52 * this.uiScale,
          0,
          7 * this.uiScale,
          7 * this.uiScale,
          0xf5e1b8,
          0,
        )
        .setScale(0)

      const container = this.add
        .container(x, y, [shadow, burnPlate, base, active, accentLine, accentDot])
        .setDepth(30)
      container.bringToTop(burnPlate)

      container.setSize(buttonWidth, buttonHeight)
      container.setInteractive(
        new Phaser.Geom.Rectangle(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight),
        Phaser.Geom.Rectangle.Contains,
      )

      const buttonView: MenuButtonView = {
        baseX: x,
        baseY: y,
        width: buttonWidth,
        height: buttonHeight,
        burnPlateBaseScale: burnPlateScale,
        sweepProgress: 0,
        container,
        shadow,
        burnPlate,
        base,
        active,
        accentLine,
        accentDot,
      }

      this.applyButtonSweep(buttonView, 0)

      container.on('pointerover', () => {
        this.selectedIndex = i
        this.updateButtonVisuals()
      })
      container.on('pointerdown', () => {
        this.selectedIndex = i
        this.updateButtonVisuals()
      })
      container.on('pointerup', () => {
        this.runSelectedAction()
      })

      this.menuButtons.push(buttonView)
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'ArrowUp' || event.code === 'KeyW') {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex - 1, 0, this.menuButtons.length)
      this.updateButtonVisuals()
      return
    }
    if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + 1, 0, this.menuButtons.length)
      this.updateButtonVisuals()
      return
    }
    if (event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space') {
      this.runSelectedAction()
    }
  }

  private runSelectedAction(): void {
    const entry = this.menuEntries[this.selectedIndex]
    if (!entry) return
    entry.action()
  }

  private updateButtonVisuals(): void {
    for (let i = 0; i < this.menuButtons.length; i += 1) {
      const btn = this.menuButtons[i]
      const selected = i === this.selectedIndex
      const distance = Math.abs(i - this.selectedIndex)
      const targetX =
        btn.baseX +
        this.uiScale * (selected ? START_MENU_SELECTED_OFFSET_X : START_MENU_UNSELECTED_OFFSET_X)
      const targetScale = selected ? START_MENU_SELECTED_SCALE : START_MENU_UNSELECTED_SCALE
      const targetAlpha = selected ? 1 : Math.max(0.5, 0.82 - distance * 0.08)
      const targetDepth = selected ? 38 : 28 - distance

      this.tweens.killTweensOf(btn.container)
      this.tweens.killTweensOf(btn.shadow)
      this.tweens.killTweensOf(btn.burnPlate)
      this.tweens.killTweensOf(btn.base)
      this.tweens.killTweensOf(btn.active)
      this.tweens.killTweensOf(btn.accentLine)
      this.tweens.killTweensOf(btn.accentDot)

      btn.container.setDepth(targetDepth)
      btn.base.setTint(selected ? 0xf4ead3 : 0xa9967c)

      this.tweens.add({
        targets: btn.burnPlate,
        alpha: selected ? 0.98 : 0,
        scaleX: selected ? btn.burnPlateBaseScale * 1.01 : btn.burnPlateBaseScale * 0.98,
        scaleY: selected ? btn.burnPlateBaseScale * 1.01 : btn.burnPlateBaseScale * 0.98,
        duration: 180,
        ease: 'Cubic.Out',
      })

      this.tweens.add({
        targets: btn.container,
        x: targetX,
        scaleX: targetScale,
        scaleY: targetScale,
        alpha: targetAlpha,
        duration: 180,
        ease: 'Cubic.Out',
      })

      this.tweens.add({
        targets: btn.shadow,
        x: selected ? 12 * this.uiScale : 9 * this.uiScale,
        alpha: selected ? 0.18 : 0.08,
        duration: 180,
        ease: 'Cubic.Out',
      })

      this.tweens.add({
        targets: btn.base,
        alpha: selected ? 0.98 : 0.74,
        duration: 180,
        ease: 'Sine.Out',
      })

      this.tweens.add({
        targets: btn.active,
        alpha: selected ? 0.7 : 0,
        duration: 180,
        ease: 'Sine.Out',
      })

      this.tweens.add({
        targets: btn.accentLine,
        alpha: selected ? 0.95 : 0,
        scaleX: selected ? 1 : 0,
        duration: 180,
        ease: 'Cubic.Out',
      })

      this.tweens.add({
        targets: btn.accentDot,
        alpha: selected ? 0.95 : 0,
        scaleX: selected ? 1 : 0,
        scaleY: selected ? 1 : 0,
        duration: 180,
        ease: 'Back.Out',
      })

      if (selected) {
        if (!btn.sweepTween) {
          btn.sweepTween = this.tweens.add({
            targets: btn,
            sweepProgress: 1,
            duration: 960,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1,
            onUpdate: () => this.applyButtonSweep(btn, 1),
          })
        }
      } else {
        if (btn.sweepTween) {
          btn.sweepTween.remove()
          btn.sweepTween = undefined
        }
        btn.sweepProgress = 0
        this.applyButtonSweep(btn, 0)
      }
    }

    this.refreshSelectedButtonEmberEmitter()
  }

  private applyButtonSweep(button: MenuButtonView, intensity: number): void {
    const texWidth = Math.max(1, Math.floor(button.active.width))
    const texHeight = Math.max(1, Math.floor(button.active.height))

    if (intensity <= 0) {
      button.active.setCrop(0, 0, 0, texHeight)
      return
    }

    const cropWidth = Math.max(1, Math.floor(texWidth * START_MENU_SWEEP_WIDTH_RATIO))
    const edgePad = Math.floor(texWidth * START_MENU_SWEEP_EDGE_PAD_RATIO)
    const travel = Math.max(0, texWidth - cropWidth - edgePad * 2)
    const cropX = edgePad + Math.floor(travel * button.sweepProgress)
    button.active.setCrop(cropX, 0, cropWidth, texHeight)
  }

  private refreshSelectedButtonEmberEmitter(): void {
    const button = this.menuButtons[this.selectedIndex]
    if (!button) {
      this.clearSelectedButtonEmberFx()
      this.selectedButtonEmberIndex = -1
      return
    }

    if (this.selectedButtonEmberEmitter && this.selectedButtonEmberIndex === this.selectedIndex) {
      return
    }

    this.clearSelectedButtonEmberFx()

    const halfW = button.width * START_MENU_SELECTED_SCALE * 0.52
    const halfH = button.height * START_MENU_SELECTED_SCALE * 0.7
    const edgeSource = this.buildRectEdgePointSource(
      button.container.x,
      button.container.y,
      halfW,
      halfH,
      Math.max(10, Math.floor(18 * this.uiScale)),
    )

    const emberEmitter = this.add.particles(0, 0, 'start-menu-ember-speck', {
      emitZone: { type: 'random', source: edgeSource },
      frequency: 68,
      quantity: 1,
      lifespan: { min: 700, max: 1550 },
      rotate: { min: -90, max: 90 },
      scale: { start: 0.46 * this.uiScale, end: 0.04 * this.uiScale },
      alpha: { start: 0.62, end: 0 },
      tint: [0xe7c58d, 0xc98d4c, 0xa45a24, 0x6f3214],
      emitCallback: (particle: Phaser.GameObjects.Particles.Particle) => {
        this.applyOutwardEmberVector(particle, button.container.x, button.container.y, false)
      },
    })
    emberEmitter.setBlendMode(Phaser.BlendModes.ADD)
    emberEmitter.setDepth(39)

    const emberBurstEmitter = this.add.particles(0, 0, 'start-menu-ember-speck', {
      frequency: -1,
      lifespan: { min: 520, max: 1220 },
      rotate: { min: -160, max: 160 },
      scale: { start: 0.7 * this.uiScale, end: 0.08 * this.uiScale },
      alpha: { start: 0.74, end: 0 },
      tint: [0xf0cf9a, 0xd19755, 0xad6028, 0x743518],
      emitCallback: (particle: Phaser.GameObjects.Particles.Particle) => {
        this.applyOutwardEmberVector(particle, button.container.x, button.container.y, true)
      },
    })
    emberBurstEmitter.setBlendMode(Phaser.BlendModes.ADD)
    emberBurstEmitter.setDepth(40)

    this.selectedButtonEmberEmitter = emberEmitter
    this.selectedButtonEmberBurstEmitter = emberBurstEmitter
    this.selectedButtonEmberIndex = this.selectedIndex

    const triggerBurst = (): void => {
      if (!this.selectedButtonEmberBurstEmitter) return
      const hotspot = edgeSource.points[Phaser.Math.Between(0, edgeSource.points.length - 1)]
      const burstX = hotspot.x + Phaser.Math.FloatBetween(-14, 14)
      const burstY = hotspot.y + Phaser.Math.FloatBetween(-8, 8)
      const burstCount = Phaser.Math.Between(2, 5)
      this.selectedButtonEmberBurstEmitter.explode(burstCount, burstX, burstY)
      this.selectedButtonEmberBurstEvent = this.time.delayedCall(
        Phaser.Math.Between(170, 520),
        triggerBurst,
      )
    }

    this.selectedButtonEmberBurstEvent = this.time.delayedCall(
      Phaser.Math.Between(120, 240),
      triggerBurst,
    )
  }

  private clearSelectedButtonEmberFx(): void {
    if (this.selectedButtonEmberBurstEvent) {
      this.selectedButtonEmberBurstEvent.remove(false)
      this.selectedButtonEmberBurstEvent = undefined
    }
    if (this.selectedButtonEmberEmitter) {
      this.selectedButtonEmberEmitter.destroy()
      this.selectedButtonEmberEmitter = undefined
    }
    if (this.selectedButtonEmberBurstEmitter) {
      this.selectedButtonEmberBurstEmitter.destroy()
      this.selectedButtonEmberBurstEmitter = undefined
    }
  }

  private applyOutwardEmberVector(
    particle: Phaser.GameObjects.Particles.Particle,
    centerX: number,
    centerY: number,
    burst: boolean,
  ): void {
    let dx = particle.x - centerX
    let dy = particle.y - centerY

    if (dx === 0 && dy === 0) {
      dx = Phaser.Math.FloatBetween(-1, 1)
      dy = Phaser.Math.FloatBetween(-1, 1)
    }

    const len = Math.max(0.001, Math.sqrt(dx * dx + dy * dy))
    const nx = dx / len
    const ny = dy / len
    const tx = -ny
    const ty = nx

    const outwardSpeed = burst
      ? Phaser.Math.FloatBetween(30, 60)
      : Phaser.Math.FloatBetween(12, 28)
    const tangentDrift = burst
      ? Phaser.Math.FloatBetween(-8, 8)
      : Phaser.Math.FloatBetween(-4, 4)

    particle.velocityX = nx * outwardSpeed + tx * tangentDrift
    particle.velocityY = ny * outwardSpeed + ty * tangentDrift
    particle.accelerationX = nx * (burst ? 6 : 3)
    particle.accelerationY = ny * (burst ? 6 : 3)
  }

  private buildRectEdgePointSource(
    centerX: number,
    centerY: number,
    halfW: number,
    halfH: number,
    step: number,
  ): DustPointSource {
    const points: Phaser.Math.Vector2[] = []

    for (let x = -halfW; x <= halfW; x += step) {
      points.push(
        new Phaser.Math.Vector2(centerX + x, centerY - halfH + Phaser.Math.FloatBetween(-3, 3)),
      )
      points.push(
        new Phaser.Math.Vector2(centerX + x, centerY + halfH + Phaser.Math.FloatBetween(-3, 3)),
      )
    }

    for (let y = -halfH + step; y <= halfH - step; y += step) {
      points.push(
        new Phaser.Math.Vector2(centerX - halfW + Phaser.Math.FloatBetween(-3, 3), centerY + y),
      )
      points.push(
        new Phaser.Math.Vector2(centerX + halfW + Phaser.Math.FloatBetween(-3, 3), centerY + y),
      )
    }

    return {
      points,
      getRandomPoint: (
        point: Phaser.Types.Math.Vector2Like,
      ): Phaser.Types.Math.Vector2Like => {
        const sample = points[Phaser.Math.Between(0, points.length - 1)]
        point.x = sample.x
        point.y = sample.y
        return point
      },
    }
  }

  private openArchives(): void {
    this.scene.stop()
    if (!this.scene.isActive('ArchiveScene')) this.scene.launch('ArchiveScene')
    this.scene.bringToTop('ArchiveScene')
  }

  private tryExit(): void {
    this.showTip('Browser mode cannot close automatically')
  }

  private showTip(message: string): void {
    this.tipText.setText(message)
    this.tweens.killTweensOf(this.tipText)
    this.tipText.setAlpha(1)
    this.tweens.add({
      targets: this.tipText,
      alpha: 0.35,
      duration: 1600,
      ease: 'Sine.Out',
    })
  }

  private startNewGame(): void {
    if (this.starting) return
    this.starting = true

    const freshSave = resetSaveData()
    this.registry.set('saveData', freshSave)

    this.stopOverlayScenes()
    this.cameras.main.fadeOut(220, 7, 10, 16)
    this.time.delayedCall(230, () => {
      this.scene.start('Level02Scene')
    })
  }

  private continueGame(): void {
    if (this.starting) return
    this.starting = true

    this.stopOverlayScenes()
    this.cameras.main.fadeOut(220, 7, 10, 16)
    this.time.delayedCall(230, () => {
      const save = readSaveFromRegistry(this)
      const target =
        save.runtime.mapId === 'level02'
          ? 'Level02Scene'
          : save.runtime.mapId === 'level03'
            ? 'Level03Scene'
            : 'Level01Scene'
      this.scene.start(target)
    })
  }

  private stopOverlayScenes(): void {
    if (this.scene.isActive('UIScene')) this.scene.stop('UIScene')
    if (this.scene.isActive('EquipmentScene')) this.scene.stop('EquipmentScene')
    if (this.scene.isActive('MapScene')) this.scene.stop('MapScene')
    if (this.scene.isActive('ArchiveScene')) this.scene.stop('ArchiveScene')
  }
}
