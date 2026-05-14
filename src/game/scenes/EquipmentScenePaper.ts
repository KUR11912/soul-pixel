import Phaser from 'phaser'
import { PaperSceneMotion } from '../systems/fx/PaperSceneMotion'

const BASE_WIDTH = 1920
const BASE_HEIGHT = 1080

type EquipmentUiSequenceKey =
  | 'revolver-focus'
  | 'grenade-focus'
  | 'map-transition'
  | 'files-transition'

type EquipmentUiStateKey = 'open' | 'revolver' | 'grenade'

type CropRect = { x: number; y: number; w: number; h: number }

type EquipmentFrameSequence = {
  mode: 'frames'
  frameKeys: string[]
  durationMs: number
  hideRoot: boolean
}

type EquipmentVideoSequence = {
  mode: 'video'
  bodyVideoKey: string
  tabsVideoKey?: string
  durationMs: number
  hideRoot: boolean
}

const buildFrameKeys = (prefix: string, start: number, end: number): string[] =>
  Array.from({ length: end - start + 1 }, (_, index) => {
    const frame = (start + index).toString().padStart(5, '0')
    return `${prefix}-${frame}`
  })

const buildIndexedFrameKeys = (prefix: string, indexes: readonly number[]): string[] =>
  indexes.map((index) => {
    const frame = index.toString().padStart(5, '0')
    return `${prefix}-${frame}`
  })

const MAP_OPEN_FRAME_INDEXES = Array.from({ length: 24 }, (_, index) => index)
const USE_LOCAL_FRAME_SEQUENCES = import.meta.env.DEV
const USE_LEGACY_EQUIPMENT_FRAMES = USE_LOCAL_FRAME_SEQUENCES

const EQUIPMENT_UI_SEQUENCE: Record<
  EquipmentUiSequenceKey,
  EquipmentFrameSequence | EquipmentVideoSequence
  > = {
    'revolver-focus': USE_LOCAL_FRAME_SEQUENCES
      ? {
        mode: 'frames',
        frameKeys: [
          ...buildFrameKeys('eq-ui-frame-open', 40, 81),
          ...buildFrameKeys('eq-ui-frame-revolver', 82, 118),
        ],
        durationMs: 2200,
        hideRoot: true,
      }
      : {
      mode: 'video',
      bodyVideoKey: 'eq-ui-video-revolver-focus',
      durationMs: 2200,
      hideRoot: true,
    },
  'grenade-focus': USE_LOCAL_FRAME_SEQUENCES
    ? {
      mode: 'frames',
      frameKeys: buildFrameKeys('eq-ui-frame-grenade', 128, 226),
      durationMs: 3300,
      hideRoot: true,
    }
    : {
    mode: 'video',
    bodyVideoKey: 'eq-ui-video-grenade-focus',
    durationMs: 3300,
    hideRoot: true,
  },
  'map-transition': {
    mode: 'frames',
    frameKeys: buildIndexedFrameKeys('map-ui-frame-open', MAP_OPEN_FRAME_INDEXES),
    durationMs: 1200,
    hideRoot: true,
  },
  'files-transition': {
    mode: 'frames',
    frameKeys: buildFrameKeys('files-ui-frame-open', 0, 17),
    durationMs: 833,
    hideRoot: true,
  },
}

const EQUIPMENT_UI_STATE_TEXTURES: Record<
  EquipmentUiStateKey,
  {
    bodyKey: string
    tabsKey: string
  }
  > = {
    open: {
      bodyKey: 'eq-ui-frame-open-00040',
      tabsKey: 'eq-ui-state-open-tabs',
    },
  revolver: {
    bodyKey: 'eq-ui-frame-revolver-00118',
    tabsKey: 'eq-ui-state-revolver-tabs',
  },
  grenade: {
    bodyKey: 'eq-ui-frame-grenade-00226',
    tabsKey: 'eq-ui-state-grenade-tabs',
  },
}

const EQUIPMENT_HIT_ZONES = {
  filesTab: new Phaser.Geom.Rectangle(585, 37, 270, 110),
  mapTab: new Phaser.Geom.Rectangle(888, 37, 260, 110),
  revolver: new Phaser.Geom.Rectangle(1268, 559, 584, 183),
  grenade: new Phaser.Geom.Rectangle(1271, 747, 154, 186),
  escape: new Phaser.Geom.Rectangle(1670, 1014, 232, 66),
}

const EQUIPMENT_BASE_ASSETS: Record<string, string> = {
  'eq-ui-bg': 'bg.png',
  'eq-ui-reference': 'inventory界面euqipment部分.png',
  'eq-ui-header-brush': 'Attributes底.png',
  'eq-ui-tab-selected': '选中态标签.png',
  'eq-ui-tab-idle-left': '未选中标签（左）.png',
  'eq-ui-tab-idle-mid': '未选中标签（中）.png',
  'eq-ui-equipment-strip': '物品选中标签底.png',
  'eq-ui-slot-frame': '物品栏框.png',
  'eq-ui-slot-frame-selected': '物品栏选中框.png',
  'eq-ui-keycap': '普通按键底.png',
  'eq-ui-keycap-wide': '长按键底.png',
  'eq-ui-bar-vitality': 'Vitality数值条png.png',
  'eq-ui-bar-endurance': 'Endurance数值条.png',
  'eq-ui-bar-mind': 'mind数值条.png',
  'eq-ui-icon-vitality': 'Vitality标志.png',
  'eq-ui-icon-endurance': 'Endurance标志.png',
  'eq-ui-icon-mind': 'Mind标志.png',
  'eq-ui-icon-hp': 'HP标志.png',
  'eq-ui-icon-fp': 'FP标志.png',
  'eq-ui-weapon-card': 'M1917图标.png',
  'eq-ui-weapon-wide': 'm1917.png',
  'eq-ui-item-grenade': 'iji/手雷图标.png',
  'eq-ui-item-cigarettes': 'iji/香烟物品.png',
}

const EQUIPMENT_OVERLAY_ASSETS: Record<string, string> = {
  'eq-ui-header-equipment': '组 37.png',
  'eq-ui-preview-frame': '物品底框.png',
  'eq-ui-slot-wide-selected': '组 6.png',
  'eq-ui-text-attributes': 'ATTRIBUTES.png',
  'eq-ui-text-collectables': 'collectables.png',
  'eq-ui-text-map-tab': 'MAP.png',
  'eq-ui-text-inventory-tab': 'inventory.png',
  'eq-ui-text-equipment': 'equipment.png',
  'eq-ui-text-armor': 'Armor.png',
  'eq-ui-text-weapon1': 'Weapon1.png',
  'eq-ui-text-weapon2': 'Weapon2.png',
  'eq-ui-text-item': 'Item.png',
  'eq-ui-text-vitality-value': 'Vitality_ 60_100.png',
  'eq-ui-text-endurance-value': 'Endurance_ 60_100.png',
  'eq-ui-text-mind-value': 'Mind_ 45_100.png',
  'eq-ui-text-hp': 'HP.png',
  'eq-ui-text-fp': 'FP.png',
  'eq-ui-text-hp-value': '500_500.png',
  'eq-ui-text-fp-value': '500_5003.png',
  'eq-ui-text-title-weapon': 'M1917 Revolver.png',
  'eq-ui-text-short-gun': 'Short Gun.png',
  'eq-ui-text-remote': 'Remote.png',
  'eq-ui-text-value-6': '6.png',
  'eq-ui-text-weight': 'Weight.png',
  'eq-ui-text-value-3': '3.0.png',
  'eq-ui-text-attack-power': 'Attack Power.png',
  'eq-ui-text-physical': 'Physical.png',
  'eq-ui-text-124plus': '124+.png',
  'eq-ui-text-mental': 'Mental.png',
  'eq-ui-text-20': '20.png',
  'eq-ui-text-fire': 'Fire.png',
  'eq-ui-text-0': '0.png',
  'eq-ui-text-attr-scaling': 'Attribute Scaling.png',
  'eq-ui-text-vitality': 'Vitality.png',
  'eq-ui-text-c': 'C.png',
  'eq-ui-text-endurance': 'Endurance.png',
  'eq-ui-text-b': 'B.png',
  'eq-ui-text-mind': 'Mind.png',
  'eq-ui-text-a': 'A.png',
  'eq-ui-text-passive': 'Passive Effects.png',
  'eq-ui-text-knockback': 'Knocks enemies back on hit.png',
  'eq-ui-text-q': 'Q .png',
  'eq-ui-text-e': 'E.png',
  'eq-ui-text-u': 'U.png',
  'eq-ui-text-esc': 'Esc.png',
  'eq-ui-text-sorting': 'Sorting.png',
  'eq-ui-text-return': 'Return.png',
}

const loadImageIfMissing = (
  scene: Phaser.Scene,
  key: string,
  path: string,
): void => {
  if (scene.textures.exists(key)) return
  scene.load.image(key, path)
}

const loadVideoIfMissing = (
  scene: Phaser.Scene,
  key: string,
  path: string,
): void => {
  if (scene.cache.video.exists(key)) return
  scene.load.video(key, path, true)
}

export const queueEquipmentShellAssets = (scene: Phaser.Scene): void => {
  for (const [key, fileName] of Object.entries(EQUIPMENT_BASE_ASSETS)) {
    loadImageIfMissing(scene, key, `assets/ui/equipment/items/${fileName}`)
  }

  for (const [key, fileName] of Object.entries(EQUIPMENT_OVERLAY_ASSETS)) {
    loadImageIfMissing(scene, key, `assets/ui/equipment/items/${fileName}`)
  }

  if (USE_LEGACY_EQUIPMENT_FRAMES) {
    loadImageIfMissing(
      scene,
      'eq-ui-state-open-tabs',
      'assets/ui/equipment/anims/open/tab/frame/上部标签栏_00089.png',
    )
    loadImageIfMissing(
      scene,
      'eq-ui-state-revolver-tabs',
      'assets/ui/equipment/anims/weapon_revolver_focus/tab/frame/上部标签栏_00220.png',
    )
    loadImageIfMissing(
      scene,
      'eq-ui-state-grenade-tabs',
      'assets/ui/equipment/anims/item_grenade_focus/tab/frame/上部标签栏_00230.png',
    )

    loadImageIfMissing(
      scene,
      'eq-ui-frame-open-00040',
      'assets/ui/equipment/anims/open/body/frames/inven_00040.png',
    )
    loadImageIfMissing(
      scene,
      'eq-ui-frame-revolver-00118',
      'assets/ui/equipment/anims/weapon_revolver_focus/body/frames/inven_00118.png',
    )
    loadImageIfMissing(
      scene,
      'eq-ui-frame-grenade-00226',
      'assets/ui/equipment/anims/item_grenade_focus/body/frames/inven_00226.png',
    )
  }

  if (!USE_LOCAL_FRAME_SEQUENCES) {
    loadVideoIfMissing(
      scene,
      'eq-ui-video-revolver-focus',
      'assets/ui/equipment/anims/video/revolver_focus_alpha.webm',
    )
    loadVideoIfMissing(
      scene,
      'eq-ui-video-grenade-focus',
      'assets/ui/equipment/anims/video/grenade_focus_alpha.webm',
    )
  }
}

export class EquipmentScene extends Phaser.Scene {
  private uiScale = 1
  private rootX = 0
  private rootY = 0
  private root!: Phaser.GameObjects.Container
  private paperMotion?: PaperSceneMotion
  private baseBodyImage!: Phaser.GameObjects.Image
  private baseTabsImage?: Phaser.GameObjects.Image
  private currentState: EquipmentUiStateKey = 'open'
  private topNodes: Phaser.GameObjects.Container[] = []
  private bottomNodes: Phaser.GameObjects.Container[] = []
  private decorativeNodes: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] = []
  private selectedFrame!: Phaser.GameObjects.Image
  private selectedIcon!: Phaser.GameObjects.Image
  private pulseTween?: Phaser.Tweens.Tween
  private keyHandler?: (event: KeyboardEvent) => void
  private overlayBodyImage?: Phaser.GameObjects.Image
  private overlayBodyVideo?: Phaser.GameObjects.Video
  private overlayTabsVideo?: Phaser.GameObjects.Video
  private sequenceTimer?: Phaser.Time.TimerEvent
  private sequenceFrameTimer?: Phaser.Time.TimerEvent
  private isSequencePlaying = false
  private hasRevealedSequenceOverlay = false
  private requestedSequenceAssetKeys = new Set<string>()

  constructor() {
    super('EquipmentScene')
  }

  preload(): void {
    queueEquipmentShellAssets(this)
  }

  create(): void {
    this.setupLayout()

    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x120c08, 0.44)
      .setOrigin(0, 0)
      .setDepth(1)

    this.root = this.add.container(this.rootX, this.rootY).setDepth(10)
    this.root.setScale(this.uiScale)

    this.buildAnimatedLayout()
    this.keepLegacyBuildersReferenced()

    this.installPaperMotion()
    this.beginInitialPresentation()
    this.time.delayedCall(250, () => this.prefetchUiSequenceAssets())

    this.keyHandler = (event: KeyboardEvent) => this.onKeyDown(event)
    this.input.keyboard?.on('keydown', this.keyHandler)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler)
      this.pulseTween?.remove()
      this.paperMotion?.destroy()
      this.sequenceTimer?.remove(false)
      this.destroyUiSequenceOverlay()
    })
  }

  private setupLayout(): void {
    this.uiScale = Math.min(this.scale.width / BASE_WIDTH, this.scale.height / BASE_HEIGHT)
    this.rootX = (this.scale.width - BASE_WIDTH * this.uiScale) / 2
    this.rootY = (this.scale.height - BASE_HEIGHT * this.uiScale) / 2
  }

  private buildAnimatedLayout(): void {
    const baseTexture = USE_LEGACY_EQUIPMENT_FRAMES
      ? this.ensureCompositeStateTexture('open')
      : this.ensureTransparentTexture()

    this.baseBodyImage = this.add.image(0, 0, baseTexture).setOrigin(0, 0)
    if (!USE_LEGACY_EQUIPMENT_FRAMES) {
      this.baseBodyImage.setVisible(false)
    }
    this.root.add(this.baseBodyImage)

    if (USE_LEGACY_EQUIPMENT_FRAMES) {
      this.decorativeNodes.push(this.baseBodyImage)
    } else {
      this.buildBackground()
      this.buildTopBar()
      this.buildLeftColumn()
      this.buildCenterColumn()
      this.buildRightColumn()
      this.buildBottomBar()
      this.startPulse()
    }

    this.createHitZone(EQUIPMENT_HIT_ZONES.filesTab, () => this.playArchiveTransition())
    this.createHitZone(EQUIPMENT_HIT_ZONES.mapTab, () => this.playMapTransition())
    if (USE_LEGACY_EQUIPMENT_FRAMES) {
      this.createHitZone(EQUIPMENT_HIT_ZONES.revolver, () => this.playWeaponFocus())
      this.createHitZone(EQUIPMENT_HIT_ZONES.grenade, () => this.playGrenadeFocus())
    }
    this.createHitZone(EQUIPMENT_HIT_ZONES.escape, () => this.closeMenu())
  }

  private keepLegacyBuildersReferenced(): void {
    void [
      this.buildBackground,
      this.buildTopBar,
      this.buildLeftColumn,
      this.buildCenterColumn,
      this.buildRightColumn,
      this.buildBottomBar,
      this.startPulse,
    ]
  }

  private buildBackground(): void {
    this.root.add(this.add.image(0, 0, 'eq-ui-bg').setOrigin(0, 0))

    const lines = this.add.graphics()
    lines.lineStyle(1.5, 0xcdb894, 0.38)
    for (let x = 130; x < 1790; x += 38) {
      lines.lineBetween(x, 105, Math.min(x + 20, 1790), 105)
    }
    lines.lineStyle(2, 0x4a392c, 0.52)
    lines.lineBetween(678, 178, 678, 998)
    lines.lineBetween(1266, 224, 1266, 998)
    lines.lineStyle(1, 0x9c8665, 0.24)
    lines.lineBetween(176, 736, 607, 736)
    lines.lineBetween(176, 821, 607, 821)
    lines.lineBetween(176, 914, 607, 914)
    this.root.add(lines)
    this.decorativeNodes.push(lines)
  }

  private buildTopBar(): void {
    this.topNodes.push(this.createTab(712, 92, 'eq-ui-tab-idle-left', 'eq-ui-text-collectables', () => {}))
    this.topNodes.push(this.createTab(1018, 92, 'eq-ui-tab-idle-mid', 'eq-ui-text-map-tab', () => {
      this.switchTo('MapScene')
    }))
    this.topNodes.push(this.createTab(1282, 96, 'eq-ui-tab-selected', 'eq-ui-text-inventory-tab', () => {
      this.switchTo('InventoryScene')
    }))
    this.topNodes.push(this.createKeycap(535, 109, 'eq-ui-text-q', () => {}))
    this.topNodes.push(this.createKeycap(1457, 109, 'eq-ui-text-e', () => {
      this.closeMenu()
    }))
  }

  private buildLeftColumn(): void {
    const header = this.add.image(112, 176, 'eq-ui-header-brush').setOrigin(0, 0)
    this.root.add(header)
    this.decorativeNodes.push(header)
    this.placeTexture('eq-ui-text-attributes', 185, 196)
    this.addReferenceCrop({ x: 180, y: 242, w: 126, h: 56 })
    this.addReferenceCrop({ x: 616, y: 241, w: 44, h: 54 })

    this.placeImage('eq-ui-icon-vitality', 177, 307)
    this.placeTexture('eq-ui-text-vitality-value', 282, 319)
    this.placeImage('eq-ui-bar-vitality', 282, 346)

    this.placeImage('eq-ui-icon-endurance', 170, 445)
    this.placeTexture('eq-ui-text-endurance-value', 282, 456)
    this.placeImage('eq-ui-bar-endurance', 283, 482)

    this.placeImage('eq-ui-icon-mind', 172, 581)
    this.placeTexture('eq-ui-text-mind-value', 279, 593)
    this.placeImage('eq-ui-bar-mind', 281, 621)

    this.placeImage('eq-ui-icon-hp', 177, 740)
    this.placeTexture('eq-ui-text-hp', 280, 751)
    this.placeTexture('eq-ui-text-hp-value', 280, 785)

    this.placeImage('eq-ui-icon-fp', 177, 840)
    this.placeTexture('eq-ui-text-fp', 280, 851)
    this.placeTexture('eq-ui-text-fp-value', 280, 885)
  }

  private buildCenterColumn(): void {
    this.placeTexture('eq-ui-text-title-weapon', 709, 188)
    this.placeTexture('eq-ui-text-short-gun', 708, 225)
    this.placeTexture('eq-ui-text-remote', 708, 262)

    this.decorativeNodes.push(this.placeTexture('eq-ui-preview-frame', 1048, 222))

    const previewIcon = this.add.image(1156, 339, 'eq-ui-weapon-card')
    previewIcon.setScale(0.96)
    this.root.add(previewIcon)
    this.decorativeNodes.push(previewIcon)

    this.placeTexture('eq-ui-text-fp', 710, 372)
    this.placeTexture('eq-ui-text-value-6', 1033, 372)
    this.placeTexture('eq-ui-text-weight', 708, 410)
    this.placeTexture('eq-ui-text-value-3', 1008, 409)

    this.addReferenceCrop({ x: 704, y: 456, w: 42, h: 48 })
    this.placeTexture('eq-ui-text-attack-power', 756, 463)
    this.placeTexture('eq-ui-text-physical', 755, 502)
    this.placeTexture('eq-ui-text-124plus', 1115, 503)
    this.addReferenceCrop({ x: 1204, y: 503, w: 38, h: 26 })
    this.placeTexture('eq-ui-text-mental', 755, 539)
    this.placeTexture('eq-ui-text-20', 1211, 539)
    this.placeTexture('eq-ui-text-fire', 755, 575)
    this.placeTexture('eq-ui-text-0', 1224, 576)

    this.addReferenceCrop({ x: 704, y: 624, w: 42, h: 48 })
    this.placeTexture('eq-ui-text-attr-scaling', 756, 630)
    this.placeTexture('eq-ui-text-vitality', 756, 669)
    this.placeTexture('eq-ui-text-c', 1218, 669)
    this.placeTexture('eq-ui-text-endurance', 756, 707)
    this.placeTexture('eq-ui-text-b', 1217, 706)
    this.placeTexture('eq-ui-text-mind', 756, 744)
    this.placeTexture('eq-ui-text-a', 1215, 744)

    this.addReferenceCrop({ x: 703, y: 786, w: 46, h: 43 })
    this.placeTexture('eq-ui-text-passive', 756, 793)
    this.placeTexture('eq-ui-text-knockback', 756, 830)
  }

  private buildRightColumn(): void {
    this.decorativeNodes.push(this.placeTexture('eq-ui-header-equipment', 1248, 177))
    this.placeTexture('eq-ui-text-equipment', 1300, 194)
    this.placeTexture('eq-ui-text-armor', 1301, 245)
    this.addReferenceCrop({ x: 1304, y: 277, w: 244, h: 121 }, 0.98)

    this.placeTexture('eq-ui-text-weapon1', 1301, 411)
    this.addReferenceCrop({ x: 1301, y: 444, w: 514, h: 120 }, 1)

    this.placeTexture('eq-ui-text-weapon2', 1301, 579)
    this.selectedFrame = this.add.image(1301, 615, 'eq-ui-slot-wide-selected').setOrigin(0, 0)
    this.root.add(this.selectedFrame)

    this.selectedIcon = this.add.image(1420, 680, 'eq-ui-weapon-wide')
    this.selectedIcon.setScale(1.06)
    this.root.add(this.selectedIcon)

    this.createHitZone(new Phaser.Geom.Rectangle(1301, 615, 255, 133), () => {
      this.playWeaponFocus()
    })

    this.placeTexture('eq-ui-text-item', 1301, 753)
    this.placeItemSlot(1303, 777, 'eq-ui-item-grenade', 1)
    this.createHitZone(new Phaser.Geom.Rectangle(1303, 777, 112, 132), () => {
      this.playGrenadeFocus()
    })
    this.placeItemSlot(1434, 777)
    this.placeItemSlot(1565, 777)
  }

  private buildBottomBar(): void {
    this.bottomNodes.push(this.createBottomShortcut(1517, 1037, 'eq-ui-text-u', 'eq-ui-text-sorting', false, () => {
      this.playWeaponFocus()
    }))
    this.bottomNodes.push(this.createBottomShortcut(1680, 1037, 'eq-ui-text-esc', 'eq-ui-text-return', true, () => {
      this.closeMenu()
    }))
  }

  private createTab(
    x: number,
    y: number,
    texture: string,
    labelKey: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const plate = this.add.image(0, 0, texture)
    const label = this.add.image(0, -1, labelKey).setOrigin(0.5)

    const container = this.add.container(x, y, [plate, label])
    const width = plate.width
    const height = plate.height
    container.setSize(width, height)
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    )
    container.on('pointerover', () => this.hoverContainer(container, 1.03))
    container.on('pointerout', () => this.hoverContainer(container, 1))
    container.on('pointerdown', () => this.pressContainer(container, onClick))
    this.root.add(container)
    return container
  }

  private createKeycap(
    x: number,
    y: number,
    labelKey: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const plate = this.add.image(0, 0, 'eq-ui-keycap')
    const label = this.add.image(0, 0, labelKey).setOrigin(0.5)

    const container = this.add.container(x, y, [plate, label])
    container.setSize(plate.width, plate.height)
    container.setInteractive(
      new Phaser.Geom.Rectangle(-plate.width / 2, -plate.height / 2, plate.width, plate.height),
      Phaser.Geom.Rectangle.Contains,
    )
    container.on('pointerover', () => this.hoverContainer(container, 1.04))
    container.on('pointerout', () => this.hoverContainer(container, 1))
    container.on('pointerdown', () => this.pressContainer(container, onClick))
    this.root.add(container)
    return container
  }

  private createBottomShortcut(
    x: number,
    y: number,
    keyLabel: string,
    textLabel: string,
    wide: boolean,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const texture = wide ? 'eq-ui-keycap-wide' : 'eq-ui-keycap'
    const plate = this.add.image(0, 0, texture)
    const keyText = this.add.image(0, 0, keyLabel).setOrigin(0.5)
    const labelText = this.add.image(plate.width / 2 + 12, 4, textLabel).setOrigin(0, 0.5)

    const hotkey = this.add.container(x, y, [plate, keyText, labelText])
    hotkey.setSize(plate.width + 12 + labelText.width, plate.height)
    hotkey.setInteractive(
      new Phaser.Geom.Rectangle(
        -plate.width / 2,
        -plate.height / 2,
        plate.width + 12 + labelText.width,
        plate.height,
      ),
      Phaser.Geom.Rectangle.Contains,
    )
    hotkey.on('pointerover', () => this.hoverContainer(hotkey, 1.04))
    hotkey.on('pointerout', () => this.hoverContainer(hotkey, 1))
    hotkey.on('pointerdown', () => this.pressContainer(hotkey, onClick))
    this.root.add(hotkey)
    return hotkey
  }

  private placeItemSlot(x: number, y: number, iconKey?: string, iconScale = 1): void {
    this.root.add(this.add.image(x, y, 'eq-ui-slot-frame').setOrigin(0, 0))
    if (!iconKey) return
    const icon = this.add.image(x + 56, y + 66, iconKey)
    icon.setScale(iconScale)
    this.root.add(icon)
  }

  private addReferenceCrop(rect: CropRect, alpha = 1): void {
    const key = this.ensureReferenceCropTexture(rect)
    const image = this.add.image(rect.x, rect.y, key).setOrigin(0, 0)
    image.setAlpha(alpha)
    this.root.add(image)
  }

  private ensureReferenceCropTexture(rect: CropRect): string {
    const key = `eq-ui-ref-${rect.x}-${rect.y}-${rect.w}-${rect.h}`
    if (this.textures.exists(key)) return key

    const texture = this.textures.get('eq-ui-reference')
    const source = texture.getSourceImage() as CanvasImageSource | CanvasImageSource[] | null
    const sourceImage = Array.isArray(source) ? source[0] : source
    if (!sourceImage) return 'eq-ui-reference'

    const canvasTexture = this.textures.createCanvas(key, rect.w, rect.h)
    if (!canvasTexture) return 'eq-ui-reference'
    const context = canvasTexture.getContext()
    context.clearRect(0, 0, rect.w, rect.h)
    context.drawImage(
      sourceImage,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      0,
      0,
      rect.w,
      rect.h,
    )
    canvasTexture.refresh()
    return key
  }

  private createHitZone(bounds: Phaser.Geom.Rectangle, onClick: () => void): void {
    const zone = this.add.zone(bounds.centerX, bounds.centerY, bounds.width, bounds.height)
    zone.setInteractive({ useHandCursor: true })
    zone.on('pointerdown', onClick)
    this.root.add(zone)
  }

  private placeImage(key: string, x: number, y: number): void {
    this.root.add(this.add.image(x, y, key).setOrigin(0, 0))
  }

  private placeTexture(
    key: string,
    x: number,
    y: number,
    originX = 0,
    originY = 0,
  ): Phaser.GameObjects.Image {
    const image = this.add.image(x, y, key).setOrigin(originX, originY)
    this.root.add(image)
    return image
  }

  private hoverContainer(target: Phaser.GameObjects.Container, scale: number): void {
    this.tweens.killTweensOf(target)
    this.tweens.add({
      targets: target,
      scaleX: scale,
      scaleY: scale,
      duration: 140,
      ease: 'Quad.Out',
    })
  }

  private pressContainer(target: Phaser.GameObjects.Container, onClick: () => void): void {
    this.tweens.killTweensOf(target)
    this.tweens.add({
      targets: target,
      scaleX: 0.97,
      scaleY: 0.97,
      duration: 70,
      yoyo: true,
      ease: 'Quad.Out',
      onComplete: onClick,
    })
  }

  private installPaperMotion(): void {
    this.paperMotion = new PaperSceneMotion(this, this.root, this.rootX, this.rootY, this.uiScale)
      .setRootMotion(6, 4, 0.0012)

    const [sheenA, sheenB] = this.paperMotion.addPaperSheenLayer()
    this.paperMotion
      .add(sheenA, { ampX: 6, ampY: 4, alpha: 0.025, speed: 0.22, parallaxX: 5, parallaxY: 2 })
      .add(sheenB, { ampX: 8, ampY: 5, alpha: 0.02, speed: 0.18, phase: 1.3, parallaxX: -4, parallaxY: 3 })

    for (let index = 0; index < this.topNodes.length; index += 1) {
      this.paperMotion.add(this.topNodes[index], {
        ampY: 2.4,
        rotation: 0.0028,
        speed: 0.7 + index * 0.06,
        phase: index * 0.8,
        parallaxX: 1.6,
        parallaxY: 0.8,
      })
    }

    for (let index = 0; index < this.bottomNodes.length; index += 1) {
      this.paperMotion.add(this.bottomNodes[index], {
        ampY: 1.8,
        rotation: 0.0018,
        speed: 0.54 + index * 0.07,
        phase: 2 + index * 0.7,
        parallaxX: 1.2,
      })
    }

    for (let index = 0; index < this.decorativeNodes.length; index += 1) {
      this.paperMotion.add(this.decorativeNodes[index], {
        ampX: index === 0 ? 0.8 : 1.6,
        ampY: index === 0 ? 0.8 : 1.4,
        rotation: index === 0 ? 0.001 : 0.0018,
        alpha: index === 0 ? 0.03 : 0.02,
        speed: 0.28 + index * 0.08,
        phase: 0.5 + index * 0.6,
        parallaxX: 0.8,
        parallaxY: 0.4,
      })
    }

    this.paperMotion.start()
  }

  private playEntrance(): void {
    this.root.setAlpha(0)
    this.root.y += 22 * this.uiScale
    this.tweens.add({
      targets: this.root,
      alpha: 1,
      y: this.rootY,
      duration: 220,
      ease: 'Quad.Out',
    })
  }

  private setDisplayedState(stateKey: EquipmentUiStateKey, force = false): void {
    if (!force && this.currentState === stateKey) return

    this.currentState = stateKey
    if (USE_LEGACY_EQUIPMENT_FRAMES) {
      const state = EQUIPMENT_UI_STATE_TEXTURES[stateKey]
      this.baseBodyImage.setTexture(this.ensureCompositeStateTexture(stateKey))
      this.baseTabsImage?.setTexture(state.tabsKey)
      return
    }

    this.applyEquipmentSelectionState(stateKey)
  }

  private beginInitialPresentation(): void {
    this.sequenceTimer?.remove(false)
    this.destroyUiSequenceOverlay()
    this.isSequencePlaying = false
    this.hasRevealedSequenceOverlay = false
    this.root.setVisible(true)
    this.baseBodyImage.setVisible(true)
    this.baseTabsImage?.setVisible(true)
    this.setDisplayedState('open', true)
    this.playEntrance()
  }

  private ensureCompositeStateTexture(stateKey: EquipmentUiStateKey): string {
    const state = EQUIPMENT_UI_STATE_TEXTURES[stateKey]
    const key = `${state.bodyKey}__with_tabs`
    if (this.textures.exists(key)) return key

    const bodyTexture = this.textures.get(state.bodyKey)
    const tabsTexture = this.textures.get(state.tabsKey)
    const bodySource = this.getPrimaryTextureSource(bodyTexture)
    const tabsSource = this.getPrimaryTextureSource(tabsTexture)
    if (!bodySource || !tabsSource) return state.bodyKey

    const bodySize = bodySource as CanvasImageSource & { width: number; height: number }
    const width = bodySize.width
    const height = bodySize.height
    const canvasTexture = this.textures.createCanvas(key, width, height)
    if (!canvasTexture) return state.bodyKey

    const context = canvasTexture.getContext()
    context.clearRect(0, 0, width, height)
    context.drawImage(bodySource, 0, 0, width, height)
    context.drawImage(tabsSource, 0, 0, width, height)
    canvasTexture.refresh()

    return key
  }

  private getPrimaryTextureSource(texture: Phaser.Textures.Texture): CanvasImageSource | null {
    const source = texture.getSourceImage() as CanvasImageSource | CanvasImageSource[] | null
    if (!source) return null
    return Array.isArray(source) ? source[0] ?? null : source
  }

  private ensureTransparentTexture(): string {
    const key = 'eq-ui-transparent-pixel'
    if (this.textures.exists(key)) return key

    const texture = this.textures.createCanvas(key, 1, 1)
    if (!texture) return 'eq-ui-bg'
    texture.getContext().clearRect(0, 0, 1, 1)
    texture.refresh()
    return key
  }

  private applyEquipmentSelectionState(stateKey: EquipmentUiStateKey): void {
    if (!this.selectedFrame || !this.selectedIcon) return

    if (stateKey === 'grenade') {
      this.selectedFrame.setTexture('eq-ui-slot-frame-selected')
      this.selectedFrame.setPosition(1303, 777)
      this.selectedFrame.setScale(1)
      this.selectedIcon.setTexture('eq-ui-item-grenade')
      this.selectedIcon.setPosition(1359, 843)
      this.selectedIcon.setScale(1)
      return
    }

    this.selectedFrame.setTexture('eq-ui-slot-wide-selected')
    this.selectedFrame.setPosition(1301, 615)
    this.selectedFrame.setScale(1)
    this.selectedIcon.setTexture('eq-ui-weapon-wide')
    this.selectedIcon.setPosition(1420, 680)
    this.selectedIcon.setScale(1.06)
  }

  private playSelectionFeedback(): void {
    const iconScale = this.currentState === 'grenade' ? 1 : 1.06

    this.tweens.killTweensOf([this.selectedFrame, this.selectedIcon])
    this.selectedFrame.setAlpha(0.7)
    this.selectedIcon.setScale(iconScale * 0.96)
    this.tweens.add({
      targets: this.selectedFrame,
      alpha: 1,
      duration: 170,
      ease: 'Quad.Out',
    })
    this.tweens.add({
      targets: this.selectedIcon,
      scaleX: iconScale,
      scaleY: iconScale,
      duration: 180,
      ease: 'Back.Out',
    })
  }

  private startPulse(): void {
    this.pulseTween?.remove()
  }

  private playWeaponFocus(): void {
    if (this.isSequencePlaying) return

    if (!USE_LEGACY_EQUIPMENT_FRAMES) {
      this.setDisplayedState('revolver', true)
      this.playSelectionFeedback()
      return
    }

    if (!this.hasSequenceAssets('revolver-focus')) {
      this.ensureSequenceAssets(
        'revolver-focus',
        () => this.playWeaponFocus(),
        () => this.setDisplayedState('revolver', true),
      )
      return
    }

    this.setDisplayedState('open', true)
    this.playUiSequence('revolver-focus', () => this.setDisplayedState('revolver', true))
  }

  private playGrenadeFocus(): void {
    if (this.isSequencePlaying) return

    if (!USE_LEGACY_EQUIPMENT_FRAMES) {
      this.setDisplayedState('grenade', true)
      this.playSelectionFeedback()
      return
    }

    // The exported switch animation starts from the revolver detail page.
    this.setDisplayedState('revolver', true)

    if (!this.hasSequenceAssets('grenade-focus')) {
      this.ensureSequenceAssets(
        'grenade-focus',
        () => this.playGrenadeFocus(),
        () => this.setDisplayedState('grenade', true),
      )
      return
    }

    this.playUiSequence('grenade-focus', () => this.setDisplayedState('grenade', true))
  }

  private playMapTransition(): void {
    if (this.isSequencePlaying) return
    this.switchTo('MapScene')
  }

  private playArchiveTransition(): void {
    if (this.isSequencePlaying) return

    if (!this.hasSequenceAssets('files-transition')) {
      this.ensureSequenceAssets(
        'files-transition',
        () => this.playArchiveTransition(),
        () => this.switchTo('ArchiveScene'),
      )
      return
    }

    this.setDisplayedState(this.currentState, true)
    this.playUiSequence('files-transition', () =>
      this.switchTo('ArchiveScene', { skipEntrance: true }),
    )
  }

  private hasSequenceAssets(sequenceKey: EquipmentUiSequenceKey): boolean {
    const sequence = EQUIPMENT_UI_SEQUENCE[sequenceKey]

    if (sequence.mode === 'frames') {
      return sequence.frameKeys.every((key) => this.textures.exists(key))
    }

    return (
      this.cache.video.exists(sequence.bodyVideoKey) &&
      (!sequence.tabsVideoKey || this.cache.video.exists(sequence.tabsVideoKey))
    )
  }

  private prefetchUiSequenceAssets(): void {
    if (this.load.isLoading()) return
    const queuedRevolver = this.queueFrameSequenceAssets('revolver-focus')
    const queuedGrenade = this.queueFrameSequenceAssets('grenade-focus')
    const queuedFiles = this.queueFrameSequenceAssets('files-transition')
    const queued = queuedRevolver || queuedGrenade || queuedFiles
    if (queued && !this.load.isLoading()) this.load.start()
  }

  private ensureSequenceAssets(
    sequenceKey: EquipmentUiSequenceKey,
    onReady: () => void,
    onMissing: () => void,
  ): void {
    if (this.hasSequenceAssets(sequenceKey)) {
      onReady()
      return
    }

    if (this.load.isLoading()) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () =>
        this.ensureSequenceAssets(sequenceKey, onReady, onMissing),
      )
      return
    }

    const queued = this.queueFrameSequenceAssets(sequenceKey)
    const finish = (): void => {
      if (this.hasSequenceAssets(sequenceKey)) {
        onReady()
        return
      }
      onMissing()
    }

    this.load.once(Phaser.Loader.Events.COMPLETE, finish)
    if (queued) {
      this.load.start()
    } else {
      this.load.off(Phaser.Loader.Events.COMPLETE, finish)
      onMissing()
    }
  }

  private queueFrameSequenceAssets(sequenceKey: EquipmentUiSequenceKey): boolean {
    const sequence = EQUIPMENT_UI_SEQUENCE[sequenceKey]
    if (sequence.mode !== 'frames') return false

    let queued = false
    for (const key of sequence.frameKeys) {
      if (this.textures.exists(key) || this.requestedSequenceAssetKeys.has(key)) continue
      const path = this.resolveFrameAssetPath(key)
      if (!path) continue
      this.load.image(key, path)
      this.requestedSequenceAssetKeys.add(key)
      queued = true
    }
    return queued
  }

  private resolveFrameAssetPath(key: string): string | undefined {
    const frame = key.match(/(\d{5})$/)?.[1]
    if (!frame) return undefined

    if (key.startsWith('eq-ui-frame-open-')) {
      return `assets/ui/equipment/anims/open/body/frames/inven_${frame}.png`
    }
    if (key.startsWith('eq-ui-frame-revolver-')) {
      return `assets/ui/equipment/anims/weapon_revolver_focus/body/frames/inven_${frame}.png`
    }
    if (key.startsWith('eq-ui-frame-grenade-')) {
      return `assets/ui/equipment/anims/item_grenade_focus/body/frames/inven_${frame}.png`
    }
    if (key.startsWith('files-ui-frame-open-')) {
      return `assets/ui/files/anima/file89_${frame}.png`
    }
    if (key.startsWith('map-ui-frame-open-')) {
      return `assets/ui/map/anims/open/body/frames/Map界切图3_${frame}.png`
    }
    return undefined
  }

  private playUiSequence(
    sequenceKey: EquipmentUiSequenceKey,
    onComplete?: () => void,
  ): void {
    const sequence = EQUIPMENT_UI_SEQUENCE[sequenceKey]

    this.sequenceTimer?.remove(false)
    this.sequenceFrameTimer?.remove(false)
    this.destroyUiSequenceOverlay()
    this.isSequencePlaying = true
    this.hasRevealedSequenceOverlay = false
    this.pulseTween?.pause()

    if (sequence.mode === 'frames') {
      this.playFrameSequence(sequence, onComplete)
      return
    }

    const centerX = this.rootX + (BASE_WIDTH * this.uiScale) / 2
    const centerY = this.rootY + (BASE_HEIGHT * this.uiScale) / 2

    this.overlayBodyVideo = this.add
      .video(centerX, centerY, sequence.bodyVideoKey)
      .setOrigin(0.5, 0.5)
      .setScale(this.uiScale)
      .setDepth(120)
      .setAlpha(0)
    this.overlayBodyVideo.setMute(true)
    this.overlayBodyVideo.setLoop(false)
    this.overlayBodyVideo.once('textureready', () => this.revealUiSequenceOverlay(sequence))
    this.overlayBodyVideo.once('playing', () => this.revealUiSequenceOverlay(sequence))
    this.overlayBodyVideo.play(false)

    if (sequence.tabsVideoKey && this.cache.video.exists(sequence.tabsVideoKey)) {
      this.overlayTabsVideo = this.add
        .video(centerX, centerY, sequence.tabsVideoKey)
        .setOrigin(0.5, 0.5)
        .setScale(this.uiScale)
        .setDepth(130)
        .setAlpha(0)
      this.overlayTabsVideo.setMute(true)
      this.overlayTabsVideo.setLoop(false)
      this.overlayTabsVideo.once('textureready', () => {
        if (this.overlayTabsVideo) this.overlayTabsVideo.setAlpha(1)
      })
      this.overlayTabsVideo.once('playing', () => {
        if (this.overlayTabsVideo) this.overlayTabsVideo.setAlpha(1)
      })
      this.overlayTabsVideo.play(false)
    }

    this.sequenceTimer = this.time.delayedCall(sequence.durationMs, () => {
      if (sequence.hideRoot) this.baseBodyImage.setVisible(true)
      this.destroyUiSequenceOverlay()
      this.isSequencePlaying = false
      onComplete?.()
    })
  }

  private playFrameSequence(
    sequence: EquipmentFrameSequence,
    onComplete?: () => void,
  ): void {
    const frameKeys = sequence.frameKeys.filter((key) => this.textures.exists(key))
    if (frameKeys.length === 0) {
      this.isSequencePlaying = false
      onComplete?.()
      return
    }

    this.overlayBodyImage = this.add
      .image(this.rootX, this.rootY, frameKeys[0])
      .setOrigin(0, 0)
      .setDisplaySize(BASE_WIDTH * this.uiScale, BASE_HEIGHT * this.uiScale)
      .setDepth(120)

    if (sequence.hideRoot) this.baseBodyImage.setVisible(false)

    if (frameKeys.length > 1) {
      const frameDelay = sequence.durationMs / (frameKeys.length - 1)
      let frameIndex = 0

      this.sequenceFrameTimer = this.time.addEvent({
        delay: frameDelay,
        repeat: frameKeys.length - 2,
        callback: () => {
          frameIndex += 1
          if (!this.overlayBodyImage) return
          this.overlayBodyImage.setTexture(frameKeys[frameIndex])
        },
      })
    }

    this.sequenceTimer = this.time.delayedCall(sequence.durationMs, () => {
      if (sequence.hideRoot) this.baseBodyImage.setVisible(true)
      this.destroyUiSequenceOverlay()
      this.isSequencePlaying = false
      onComplete?.()
    })
  }

  private revealUiSequenceOverlay(
    sequence: { hideRoot: boolean },
  ): void {
    if (this.hasRevealedSequenceOverlay) return
    this.hasRevealedSequenceOverlay = true
    if (sequence.hideRoot) this.baseBodyImage.setVisible(false)
    if (this.overlayBodyVideo) this.overlayBodyVideo.setAlpha(1)
  }

  private destroyUiSequenceOverlay(): void {
    this.hasRevealedSequenceOverlay = false
    this.sequenceFrameTimer?.remove(false)
    this.sequenceFrameTimer = undefined
    if (this.overlayBodyImage) {
      this.overlayBodyImage.destroy()
      this.overlayBodyImage = undefined
    }
    if (this.overlayBodyVideo) {
      this.overlayBodyVideo.stop()
      this.overlayBodyVideo.destroy()
      this.overlayBodyVideo = undefined
    }
    if (this.overlayTabsVideo) {
      this.overlayTabsVideo.stop()
      this.overlayTabsVideo.destroy()
      this.overlayTabsVideo = undefined
    }
  }

  private closeMenu(): void {
    this.scene.stop()
  }

  private switchTo(
    sceneKey: 'MapScene' | 'InventoryScene' | 'ArchiveScene',
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
    if (event.code === 'Escape' || event.code === 'KeyE') {
      this.closeMenu()
      return
    }
    if (event.code === 'KeyM') {
      this.playMapTransition()
      return
    }
    if (event.code === 'KeyI') {
      this.switchTo('InventoryScene')
      return
    }
    if (event.code === 'KeyP') {
      this.playArchiveTransition()
      return
    }
    if (event.code === 'KeyU' || event.code === 'Enter' || event.code === 'Space') {
      this.playWeaponFocus()
    }
    if (event.code === 'Digit1') {
      this.playGrenadeFocus()
    }
  }
}
