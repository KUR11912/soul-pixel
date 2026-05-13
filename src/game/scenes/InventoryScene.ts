import Phaser from 'phaser'
import { readSaveFromRegistry, type EquipmentItem, type SaveData } from '../save/SaveStore'

type InventoryCategory = 'consumables' | 'weapons' | 'gear'
type NavTabKey = 'collectables' | 'map' | 'inventory'
type SortMode = 'name' | 'power'
type StatBarKey = 'vitality' | 'endurance' | 'mind'

type StatMetrics = {
  level: number
  vitality: number
  endurance: number
  mind: number
  hpCurrent: number
  hpMax: number
  fpCurrent: number
  fpMax: number
}

type InventoryCell = {
  container: Phaser.GameObjects.Container
  glow: Phaser.GameObjects.Rectangle
  frame: Phaser.GameObjects.Rectangle
  inner: Phaser.GameObjects.Rectangle
  icon: Phaser.GameObjects.Image
  fallbackText: Phaser.GameObjects.Text
}

type NavTabButton = {
  key: NavTabKey
  container: Phaser.GameObjects.Container
  plate: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
  baseRotation: number
}

type CategoryButton = {
  key: InventoryCategory
  container: Phaser.GameObjects.Container
  plate: Phaser.GameObjects.Rectangle
  highlight: Phaser.GameObjects.Rectangle
  icon: Phaser.GameObjects.Image
  label: Phaser.GameObjects.Text
}

type ActionButton = {
  key: 'sort' | 'return'
  container: Phaser.GameObjects.Container
  keycap: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
}

type StatBarNodes = {
  label: Phaser.GameObjects.Text
  fill: Phaser.GameObjects.Rectangle
}

type EntranceTarget =
  | Phaser.GameObjects.Container
  | Phaser.GameObjects.Graphics
  | Phaser.GameObjects.Rectangle
  | Phaser.GameObjects.Text
  | Phaser.GameObjects.Image

const REF = {
  frameW: 1920,
  frameH: 1080,
  tabsY: 86,
  detailPreviewX: 1158,
  detailPreviewY: 351,
  detailPreviewW: 213,
  detailPreviewH: 254,
}

const GRID = {
  cols: 4,
  rows: 4,
  startX: 1356,
  startY: 313,
  stepX: 136,
  stepY: 151,
  cellW: 111,
  cellH: 132,
}

const PAPER_COLORS = {
  page: 0xe7d7bd,
  pageDark: 0xd6c29f,
  ink: 0x2c241c,
  accent: 0xc79a52,
  accentDark: 0xa47839,
  brush: 0x15100d,
  line: 0x8e7a60,
  slot: 0xf4ead9,
  slotLine: 0x8f7b62,
  slotGlow: 0xf6d493,
  activeTab: 0xe0c08d,
  inactiveTab: 0xd4c1a2,
  hoverPaper: 0xf6ecda,
  hp: 0xb86a58,
  endurance: 0x8ea972,
  mind: 0x7591c2,
}

const CATEGORY_LABEL: Record<InventoryCategory, string> = {
  consumables: 'CONSUMABLES',
  weapons: 'WEAPONS',
  gear: 'GEAR',
}

const CATEGORY_ICON: Record<InventoryCategory, string> = {
  consumables: 'eq-item-ration_can',
  weapons: 'eq-item-service_rifle',
  gear: 'eq-item-gas_mask',
}

const CATEGORY_ORDER: InventoryCategory[] = ['consumables', 'weapons', 'gear']

const NAV_TAB_LABEL: Record<NavTabKey, string> = {
  collectables: 'COLLECTABLES',
  map: 'MAP',
  inventory: 'INVENTORY',
}

const NAV_TAB_ROTATION: Record<NavTabKey, number> = {
  collectables: Phaser.Math.DegToRad(-2),
  map: Phaser.Math.DegToRad(-0.75),
  inventory: Phaser.Math.DegToRad(0.8),
}

const NAV_TAB_X: Record<NavTabKey, number> = {
  collectables: 714,
  map: 998,
  inventory: 1280,
}

const STAT_BAR_REFS: ReadonlyArray<{
  key: StatBarKey
  labelY: number
  barY: number
  color: number
  badgeText: string
  badgeColor: number
}> = [
  { key: 'vitality', labelY: 332, barY: 360, color: PAPER_COLORS.hp, badgeText: '+', badgeColor: 0xc66655 },
  { key: 'endurance', labelY: 456, barY: 486, color: PAPER_COLORS.endurance, badgeText: 'E', badgeColor: 0x87a56c },
  { key: 'mind', labelY: 582, barY: 610, color: PAPER_COLORS.mind, badgeText: 'M', badgeColor: 0x6f8bc0 },
]

export class InventoryScene extends Phaser.Scene {
  private uiScale = 1
  private uiCenter = new Phaser.Math.Vector2()

  private selectedCategory: InventoryCategory = 'consumables'
  private selectedIndex = 0
  private hoveredIndex = -1
  private sortMode: SortMode = 'name'

  private backdrop!: Phaser.GameObjects.Rectangle
  private paperGroup!: Phaser.GameObjects.Container
  private topGroup!: Phaser.GameObjects.Container
  private leftGroup!: Phaser.GameObjects.Container
  private detailGroup!: Phaser.GameObjects.Container
  private rightGroup!: Phaser.GameObjects.Container
  private bottomGroup!: Phaser.GameObjects.Container

  private navTabs: NavTabButton[] = []
  private categoryButtons: CategoryButton[] = []
  private actionButtons: ActionButton[] = []
  private itemCells: InventoryCell[] = []
  private statBars = new Map<StatBarKey, StatBarNodes>()

  private previewIcon!: Phaser.GameObjects.Image
  private previewFallback!: Phaser.GameObjects.Text
  private itemNameText!: Phaser.GameObjects.Text
  private itemCategoryText!: Phaser.GameObjects.Text
  private storedValueText!: Phaser.GameObjects.Text
  private effectTitleText!: Phaser.GameObjects.Text
  private effectBodyText!: Phaser.GameObjects.Text
  private levelValueText!: Phaser.GameObjects.Text
  private hpValueText!: Phaser.GameObjects.Text
  private fpValueText!: Phaser.GameObjects.Text
  private hintText!: Phaser.GameObjects.Text

  private selectedPulseTween?: Phaser.Tweens.Tween
  private previewTween?: Phaser.Tweens.Tween
  private hintTween?: Phaser.Tweens.Tween
  private keyHandler?: (event: KeyboardEvent) => void

  constructor() {
    super('InventoryScene')
  }

  create(): void {
    this.setupLayout()

    this.backdrop = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0)
      .setOrigin(0, 0)
      .setDepth(1)

    this.paperGroup = this.add.container(0, 0).setDepth(10)
    this.topGroup = this.add.container(0, 0).setDepth(20)
    this.leftGroup = this.add.container(0, 0).setDepth(25)
    this.detailGroup = this.add.container(0, 0).setDepth(25)
    this.rightGroup = this.add.container(0, 0).setDepth(30)
    this.bottomGroup = this.add.container(0, 0).setDepth(40)

    this.buildPaperFrame()
    this.buildTopTabs()
    this.buildLeftPanel()
    this.buildDetailPanel()
    this.buildRightPanel()
    this.buildBottomButtons()

    this.keyHandler = (event: KeyboardEvent) => this.onKeyDown(event)
    this.input.keyboard?.on('keydown', this.keyHandler)
    this.registry.events.on('changedata-saveData', this.refresh, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler)
      this.registry.events.off('changedata-saveData', this.refresh, this)
      this.selectedPulseTween?.remove()
      this.previewTween?.remove()
      this.hintTween?.remove()
    })

    this.refresh()
    this.playEntrance()
  }

  private setupLayout(): void {
    const scaleByWidth = (this.scale.width * 0.98) / REF.frameW
    const scaleByHeight = (this.scale.height * 0.96) / REF.frameH
    this.uiScale = Math.min(scaleByWidth, scaleByHeight)
    this.uiCenter.set(this.scale.width / 2, this.scale.height / 2)
  }

  private buildPaperFrame(): void {
    const g = this.add.graphics()
    const left = this.x(28)
    const top = this.y(16)
    const width = this.s(1864)
    const height = this.s(1048)
    const radius = Math.max(18, this.s(32))
    const ringX = this.x(18)

    g.fillStyle(0x000000, 0.28)
    g.fillRoundedRect(left + this.s(8), top + this.s(10), width, height, radius)
    g.fillStyle(PAPER_COLORS.pageDark, 1)
    g.fillRoundedRect(left, top, width, height, radius)
    g.fillStyle(PAPER_COLORS.page, 1)
    g.fillRoundedRect(left + this.s(6), top + this.s(5), width - this.s(12), height - this.s(10), radius)
    g.lineStyle(Math.max(1, this.s(2)), PAPER_COLORS.line, 0.9)
    g.strokeRoundedRect(left + this.s(6), top + this.s(5), width - this.s(12), height - this.s(10), radius)
    g.lineStyle(Math.max(1, this.s(1.5)), PAPER_COLORS.line, 0.45)
    g.strokeRoundedRect(left + this.s(34), top + this.s(28), width - this.s(68), height - this.s(56), radius * 0.7)

    g.lineStyle(Math.max(1, this.s(2)), PAPER_COLORS.line, 0.55)
    g.lineBetween(this.x(674), this.y(160), this.x(674), this.y(990))
    g.lineBetween(this.x(1271), this.y(160), this.x(1271), this.y(990))
    g.lineStyle(Math.max(1, this.s(2)), PAPER_COLORS.line, 0.4)
    g.lineBetween(this.x(228), this.y(109), this.x(1815), this.y(109))

    g.lineStyle(Math.max(1, this.s(1.5)), 0x3f3328, 0.5)
    for (let i = 0; i < 16; i += 1) {
      const cy = this.y(44 + i * 66)
      g.strokeCircle(ringX, cy, this.s(16))
      g.strokeCircle(ringX, cy, this.s(8))
    }

    g.lineStyle(Math.max(1, this.s(4)), 0x8f6b4c, 0.18)
    g.strokeCircle(this.x(632), this.y(934), this.s(78))
    g.lineStyle(Math.max(1, this.s(3)), 0x8f6b4c, 0.1)
    g.strokeCircle(this.x(640), this.y(946), this.s(92))
    g.fillStyle(0x8f6b4c, 0.07)
    g.fillCircle(this.x(1008), this.y(618), this.s(132))
    g.fillCircle(this.x(1595), this.y(835), this.s(108))

    this.paperGroup.add(g)
  }

  private buildTopTabs(): void {
    this.topGroup.add([
      this.addKeycap(this.x(525), this.y(104), 'Q'),
      this.addKeycap(this.x(1452), this.y(101), 'E'),
    ])

    for (const key of ['collectables', 'map', 'inventory'] as NavTabKey[]) {
      const tab = this.createTopTab(key, key === 'inventory')
      this.navTabs.push(tab)
      this.topGroup.add(tab.container)
    }
  }

  private buildLeftPanel(): void {
    const brushBg = this.add
      .rectangle(this.x(220), this.y(192), this.s(258), this.s(42), PAPER_COLORS.brush, 0.98)
      .setStrokeStyle(Math.max(1, this.s(1.5)), 0x000000, 0.2)
    const title = this.addText(this.x(182), this.y(184), 'ATTRIBUTES', 30, '#ffffff', 'bold')
    const levelLabel = this.addText(this.x(182), this.y(242), 'LEVEL', 28, this.inkCss(), 'bold')
    this.levelValueText = this.addText(this.x(622), this.y(242), '0', 28, this.inkCss(), 'bold')

    this.leftGroup.add([brushBg, title, levelLabel, this.levelValueText])

    for (const def of STAT_BAR_REFS) {
      const badge = this.createBadge(this.x(220), this.y(def.labelY + 8), def.badgeText, def.badgeColor)
      const label = this.addText(this.x(280), this.y(def.labelY), '', 28, this.inkCss())
      const bg = this.add
        .rectangle(this.x(463), this.y(def.barY), this.s(372), this.s(26), 0xf7efe2, 0.95)
        .setStrokeStyle(Math.max(1, this.s(2)), def.color, 0.65)
      const fill = this.add
        .rectangle(this.x(280), this.y(def.barY), this.s(1), this.s(18), def.color, 0.9)
        .setOrigin(0, 0.5)

      this.leftGroup.add([badge, label, bg, fill])
      this.statBars.set(def.key, { label, fill })
    }

    const hpBadge = this.createBadge(this.x(220), this.y(750), 'HP', 0x7c6557)
    const hpLabel = this.addText(this.x(280), this.y(718), 'HP', 28, this.inkCss(), 'bold')
    this.hpValueText = this.addText(this.x(280), this.y(750), '0/0', 28, this.inkCss())
    const fpBadge = this.createBadge(this.x(220), this.y(862), 'FP', 0x8d4e48)
    const fpLabel = this.addText(this.x(280), this.y(838), 'FP', 28, this.inkCss(), 'bold')
    this.fpValueText = this.addText(this.x(280), this.y(870), '0/0', 28, this.inkCss())

    this.leftGroup.add([hpBadge, hpLabel, this.hpValueText, fpBadge, fpLabel, this.fpValueText])
  }

  private buildDetailPanel(): void {
    this.itemNameText = this.addText(this.x(709), this.y(184), '', 30, this.inkCss(), 'bold')
    this.itemCategoryText = this.addText(this.x(709), this.y(222), '', 28, '#4b3d31')

    const previewShadow = this.add
      .rectangle(
        this.x(REF.detailPreviewX) + this.s(10),
        this.y(REF.detailPreviewY) + this.s(12),
        this.s(REF.detailPreviewW),
        this.s(REF.detailPreviewH),
        0x000000,
        0.08,
      )
    const previewFrame = this.add
      .rectangle(
        this.x(REF.detailPreviewX),
        this.y(REF.detailPreviewY),
        this.s(REF.detailPreviewW),
        this.s(REF.detailPreviewH),
        0xf1e8d8,
        0.96,
      )
      .setStrokeStyle(Math.max(1, this.s(2)), PAPER_COLORS.line, 0.6)
    this.previewIcon = this.add.image(this.x(REF.detailPreviewX), this.y(REF.detailPreviewY), 'eq-item-ration_can')
    this.previewFallback = this.addText(this.x(REF.detailPreviewX), this.y(REF.detailPreviewY), '?', 44, this.inkCss(), 'bold', 'center')
      .setOrigin(0.5)
      .setVisible(false)

    const storedLabel = this.addText(this.x(710), this.y(405), 'Stored', 28, '#4b3d31')
    this.storedValueText = this.addText(this.x(976), this.y(409), '0/0', 28, this.inkCss())
    const effectDot = this.add.circle(this.x(729), this.y(482), this.s(18), 0xf1e3cc, 1)
      .setStrokeStyle(Math.max(1, this.s(2)), PAPER_COLORS.line, 0.55)
    const effectBadge = this.addText(this.x(729), this.y(467), '+', 24, '#7a6148', 'bold', 'center').setOrigin(0.5)
    this.effectTitleText = this.addText(this.x(755), this.y(463), 'Passive Effects', 28, this.inkCss(), 'bold')
    this.effectBodyText = this.addText(this.x(755), this.y(500), '', 26, '#4b3d31')
      .setLineSpacing(Math.max(6, Math.floor(8 * this.uiScale)))
      .setWordWrapWidth(this.s(420))

    this.detailGroup.add([
      this.itemNameText,
      this.itemCategoryText,
      previewShadow,
      previewFrame,
      this.previewIcon,
      this.previewFallback,
      storedLabel,
      this.storedValueText,
      effectDot,
      effectBadge,
      this.effectTitleText,
      this.effectBodyText,
    ])
  }

  private buildRightPanel(): void {
    const categoryBar = this.add
      .rectangle(this.x(1548), this.y(196), this.s(426), this.s(49), PAPER_COLORS.brush, 0.7)
      .setStrokeStyle(Math.max(1, this.s(1.2)), 0x000000, 0.15)
    this.rightGroup.add([
      categoryBar,
      this.addKeycap(this.x(1317), this.y(190), 'Z'),
      this.addKeycap(this.x(1782), this.y(186), 'X'),
    ])

    for (let i = 0; i < CATEGORY_ORDER.length; i += 1) {
      const key = CATEGORY_ORDER[i]
      const button = this.createCategoryButton(key, this.x(1464 + i * 89), this.y(186))
      this.categoryButtons.push(button)
      this.rightGroup.add(button.container)
    }

    for (let i = 0; i < GRID.cols * GRID.rows; i += 1) {
      const cell = this.createItemCell(i)
      this.itemCells.push(cell)
      this.rightGroup.add(cell.container)
    }
  }

  private buildBottomButtons(): void {
    const sortButton = this.createActionButton('sort', this.x(1560), this.y(1002), 'U', 'Sorting')
    const returnButton = this.createActionButton('return', this.x(1750), this.y(1002), 'Esc', 'Return')
    this.actionButtons.push(sortButton, returnButton)

    this.hintText = this.addText(this.x(1490), this.y(948), '', 17, '#4f4032', 'bold').setOrigin(0, 0.5)
    this.bottomGroup.add([sortButton.container, returnButton.container, this.hintText])
  }

  private createTopTab(key: NavTabKey, active: boolean): NavTabButton {
    const width = key === 'collectables' ? this.s(276) : key === 'map' ? this.s(240) : this.s(304)
    const height = active ? this.s(96) : this.s(82)
    const x = this.x(NAV_TAB_X[key])
    const y = this.y(REF.tabsY)
    const rotation = NAV_TAB_ROTATION[key]

    const shadow = this.add
      .rectangle(this.s(4), this.s(8), width, height, 0x000000, 0.12)
      .setOrigin(0.5)
    const plate = this.add
      .rectangle(
        0,
        0,
        width,
        height,
        active ? PAPER_COLORS.activeTab : PAPER_COLORS.inactiveTab,
        active ? 1 : 0.96,
      )
      .setStrokeStyle(Math.max(1, this.s(2)), active ? PAPER_COLORS.accentDark : PAPER_COLORS.line, 0.82)
    const label = this.addText(0, active ? this.s(-5) : this.s(-1), NAV_TAB_LABEL[key], 30, active ? '#16110d' : '#806c50', active ? 'bold' : undefined, 'center').setOrigin(0.5)

    const container = this.add.container(x, y, [shadow, plate, label]).setRotation(rotation)
    container.setSize(width, height)
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    )

    if (!active) {
      container.on('pointerover', () => this.animateButtonHover(container, plate, 1.04))
      container.on('pointerout', () => this.animateButtonIdle(container, plate, rotation, PAPER_COLORS.inactiveTab))
      container.on('pointerdown', () => this.animateButtonPress(container, plate))
      container.on('pointerup', () => this.onNavTabClick(key))
    }

    return { key, container, plate, label, baseRotation: rotation }
  }

  private createCategoryButton(
    key: InventoryCategory,
    centerX: number,
    centerY: number,
  ): CategoryButton {
    const highlight = this.add
      .rectangle(0, 0, this.s(84), this.s(54), PAPER_COLORS.slotGlow, 0)
      .setStrokeStyle(Math.max(1, this.s(1.5)), PAPER_COLORS.slotGlow, 0)
    const plate = this.add
      .rectangle(0, 0, this.s(64), this.s(54), PAPER_COLORS.brush, 0.08)
      .setStrokeStyle(Math.max(1, this.s(1.2)), PAPER_COLORS.line, 0.16)
    const icon = this.add.image(0, this.s(-2), CATEGORY_ICON[key])
    this.fitImage(icon, this.s(38), this.s(38))
    const label = this.addText(0, this.s(38), CATEGORY_LABEL[key], 11, '#6b5742', 'bold', 'center').setOrigin(0.5)

    const container = this.add.container(centerX, centerY, [highlight, plate, icon, label])
    container.setSize(this.s(84), this.s(68))
    container.setInteractive(
      new Phaser.Geom.Rectangle(-this.s(42), -this.s(27), this.s(84), this.s(68)),
      Phaser.Geom.Rectangle.Contains,
    )
    container.on('pointerover', () => {
      if (this.selectedCategory === key) return
      this.tweens.killTweensOf(container)
      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 120, ease: 'Quad.Out' })
      plate.setFillStyle(PAPER_COLORS.hoverPaper, 0.22)
    })
    container.on('pointerout', () => {
      if (this.selectedCategory === key) return
      this.tweens.killTweensOf(container)
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 140, ease: 'Quad.Out' })
      plate.setFillStyle(PAPER_COLORS.brush, 0.08)
    })
    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 70,
        yoyo: true,
        ease: 'Quad.Out',
      })
      this.setCategory(key)
    })

    return { key, container, plate, highlight, icon, label }
  }

  private createItemCell(index: number): InventoryCell {
    const col = index % GRID.cols
    const row = Math.floor(index / GRID.cols)
    const x = this.x(GRID.startX + col * GRID.stepX)
    const y = this.y(GRID.startY + row * GRID.stepY)

    const glow = this.add
      .rectangle(0, 0, this.s(GRID.cellW + 16), this.s(GRID.cellH + 16), PAPER_COLORS.slotGlow, 0)
      .setStrokeStyle(Math.max(1, this.s(2)), PAPER_COLORS.slotGlow, 0)
    const frame = this.add
      .rectangle(0, 0, this.s(GRID.cellW), this.s(GRID.cellH), PAPER_COLORS.slot, 0.34)
      .setStrokeStyle(Math.max(1, this.s(2)), PAPER_COLORS.slotLine, 0.55)
    const inner = this.add
      .rectangle(0, 0, this.s(GRID.cellW - 10), this.s(GRID.cellH - 10), PAPER_COLORS.page, 0.18)
      .setStrokeStyle(Math.max(1, this.s(1)), PAPER_COLORS.slotLine, 0.18)
    const icon = this.add.image(0, 0, 'eq-item-ration_can')
    const fallbackText = this.addText(0, 0, '', 22, this.inkCss(), 'bold', 'center').setOrigin(0.5).setVisible(false)

    const container = this.add.container(x, y, [glow, frame, inner, icon, fallbackText])
    container.setSize(this.s(GRID.cellW + 16), this.s(GRID.cellH + 16))
    container.setInteractive(
      new Phaser.Geom.Rectangle(
        -this.s((GRID.cellW + 16) / 2),
        -this.s((GRID.cellH + 16) / 2),
        this.s(GRID.cellW + 16),
        this.s(GRID.cellH + 16),
      ),
      Phaser.Geom.Rectangle.Contains,
    )
    container.on('pointerover', () => {
      this.hoveredIndex = index
      this.refresh()
    })
    container.on('pointerout', () => {
      this.hoveredIndex = -1
      this.refresh()
    })
    container.on('pointerdown', () => this.selectIndex(index))

    return { container, glow, frame, inner, icon, fallbackText }
  }

  private createActionButton(
    key: 'sort' | 'return',
    centerX: number,
    centerY: number,
    keyText: string,
    labelText: string,
  ): ActionButton {
    const keycap = this.add
      .rectangle(this.s(-44), 0, this.s(42), this.s(36), 0xf3e7cf, 0.94)
      .setStrokeStyle(Math.max(1, this.s(1.5)), PAPER_COLORS.line, 0.7)
    const keyLabel = this.addText(this.s(-44), 0, keyText, 22, this.inkCss(), 'bold', 'center').setOrigin(0.5)
    const label = this.addText(this.s(6), 0, labelText, 28, this.inkCss(), 'bold').setOrigin(0, 0.5)

    const container = this.add.container(centerX, centerY, [keycap, keyLabel, label])
    container.setSize(this.s(158), this.s(44))
    container.setInteractive(
      new Phaser.Geom.Rectangle(-this.s(74), -this.s(22), this.s(158), this.s(44)),
      Phaser.Geom.Rectangle.Contains,
    )
    container.on('pointerover', () => {
      this.tweens.killTweensOf(container)
      this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 120, ease: 'Quad.Out' })
      keycap.setFillStyle(PAPER_COLORS.hoverPaper, 1)
    })
    container.on('pointerout', () => {
      this.tweens.killTweensOf(container)
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 140, ease: 'Quad.Out' })
      keycap.setFillStyle(0xf3e7cf, 0.94)
    })
    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 70,
        yoyo: true,
        ease: 'Quad.Out',
      })
      if (key === 'sort') {
        this.toggleSortMode()
      } else {
        this.scene.stop()
      }
    })

    return { key, container, keycap, label }
  }

  private createBadge(x: number, y: number, text: string, fillColor: number): Phaser.GameObjects.Container {
    const plate = this.add
      .circle(0, 0, this.s(24), 0xf3e8d4, 1)
      .setStrokeStyle(Math.max(1, this.s(2)), fillColor, 0.78)
    const accent = this.add.circle(0, 0, this.s(18), fillColor, 0.22)
    const label = this.addText(0, this.s(-1), text, text.length > 1 ? 15 : 22, this.inkCss(), 'bold', 'center').setOrigin(0.5)
    return this.add.container(x, y, [plate, accent, label])
  }

  private addKeycap(x: number, y: number, text: string): Phaser.GameObjects.Container {
    const bg = this.add
      .rectangle(0, 0, this.s(text.length > 1 ? 46 : 32), this.s(32), 0xf4e8d0, 0.92)
      .setStrokeStyle(Math.max(1, this.s(1.2)), PAPER_COLORS.line, 0.68)
    const label = this.addText(0, 0, text, 21, this.inkCss(), 'bold', 'center').setOrigin(0.5)
    return this.add.container(x, y, [bg, label])
  }

  private addText(
    x: number,
    y: number,
    text: string,
    size: number,
    color: string,
    fontStyle?: string,
    align: 'left' | 'center' | 'right' = 'left',
  ): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: `${Math.max(10, Math.floor(size * this.uiScale))}px`,
      color,
      align,
      fontStyle,
    })
  }

  private refresh(): void {
    const save = readSaveFromRegistry(this)
    const items = this.getVisibleItems(save)
    const maxIndex = Math.max(0, items.length - 1)
    if (this.selectedIndex > maxIndex) this.selectedIndex = maxIndex

    const selected = items[this.selectedIndex] ?? null
    const hovered = this.hoveredIndex >= 0 ? items[this.hoveredIndex] ?? null : null
    const focus = hovered ?? selected
    const stats = this.getStatMetrics(save)

    this.updateTopTabs()
    this.updateCategoryButtons()
    this.updateStatPanel(stats)
    this.updateGrid(items)
    this.updateDetailPanel(focus)
    this.updateBottomHint()

    if (selected) {
      this.startSelectedPulse(this.selectedIndex)
    } else {
      this.selectedPulseTween?.remove()
      this.selectedPulseTween = undefined
    }
  }

  private updateTopTabs(): void {
    for (const tab of this.navTabs) {
      const active = tab.key === 'inventory'
      tab.plate.setFillStyle(active ? PAPER_COLORS.activeTab : PAPER_COLORS.inactiveTab, active ? 1 : 0.96)
      tab.plate.setStrokeStyle(
        Math.max(1, this.s(2)),
        active ? PAPER_COLORS.accentDark : PAPER_COLORS.line,
        active ? 0.82 : 0.55,
      )
      tab.label.setColor(active ? '#16110d' : '#806c50')
      tab.container.rotation = tab.baseRotation
    }
  }

  private updateCategoryButtons(): void {
    for (const button of this.categoryButtons) {
      const active = button.key === this.selectedCategory
      button.highlight.setFillStyle(PAPER_COLORS.slotGlow, active ? 0.22 : 0)
      button.highlight.setStrokeStyle(
        Math.max(1, this.s(1.5)),
        PAPER_COLORS.slotGlow,
        active ? 0.95 : 0,
      )
      button.plate.setFillStyle(active ? PAPER_COLORS.hoverPaper : PAPER_COLORS.brush, active ? 0.3 : 0.08)
      button.plate.setStrokeStyle(
        Math.max(1, this.s(1.2)),
        active ? PAPER_COLORS.slotGlow : PAPER_COLORS.line,
        active ? 0.82 : 0.16,
      )
      button.icon.setTint(active ? 0xffffff : 0xb9a48b)
      button.label.setColor(active ? '#3a2d22' : '#6b5742')
      button.container.setScale(active ? 1.03 : 1)
    }
  }

  private updateStatPanel(stats: StatMetrics): void {
    this.levelValueText.setText(`${stats.level}`)
    this.hpValueText.setText(`${stats.hpCurrent}/${stats.hpMax}`)
    this.fpValueText.setText(`${stats.fpCurrent}/${stats.fpMax}`)

    for (const def of STAT_BAR_REFS) {
      const nodes = this.statBars.get(def.key)
      if (!nodes) continue
      const value = stats[def.key]
      const ratio = Phaser.Math.Clamp(value / 100, 0, 1)
      nodes.label.setText(`${this.toLabel(def.key)}: ${value}/100`)
      nodes.fill.setDisplaySize(this.s(362) * ratio, this.s(18))
      nodes.fill.setFillStyle(def.color, 0.9)
    }
  }

  private updateGrid(items: EquipmentItem[]): void {
    for (let i = 0; i < this.itemCells.length; i += 1) {
      const cell = this.itemCells[i]
      const item = items[i] ?? null
      const selected = i === this.selectedIndex && item !== null
      const hovered = i === this.hoveredIndex && item !== null

      cell.glow.setAlpha(selected ? 0.22 : hovered ? 0.12 : 0)
      cell.glow.setStrokeStyle(
        Math.max(1, this.s(2)),
        PAPER_COLORS.slotGlow,
        selected ? 0.95 : hovered ? 0.45 : 0,
      )
      cell.frame.setStrokeStyle(
        Math.max(1, this.s(2)),
        selected ? PAPER_COLORS.slotGlow : hovered ? PAPER_COLORS.accent : PAPER_COLORS.slotLine,
        selected ? 0.95 : hovered ? 0.68 : 0.55,
      )
      cell.frame.setFillStyle(PAPER_COLORS.slot, selected ? 0.56 : hovered ? 0.42 : 0.34)
      cell.inner.setFillStyle(PAPER_COLORS.page, selected ? 0.3 : hovered ? 0.22 : 0.18)

      if (!item) {
        cell.icon.setVisible(false)
        cell.fallbackText.setVisible(false)
        cell.container.setScale(1)
        continue
      }

      this.applyItemTexture(cell.icon, cell.fallbackText, item, this.s(70), this.s(70))
      if (!selected && !hovered) cell.container.setScale(1)
      if (hovered && !selected) cell.container.setScale(1.02)
    }
  }

  private updateDetailPanel(item: EquipmentItem | null): void {
    if (!item) {
      this.itemNameText.setText('No Item Selected')
      this.itemCategoryText.setText('Choose an item from the grid')
      this.storedValueText.setText('0/0')
      this.effectTitleText.setText('Passive Effects')
      this.effectBodyText.setText('Nothing is selected yet.')
      this.previewIcon.setVisible(false)
      this.previewFallback.setVisible(true).setText('?')
      return
    }

    this.itemNameText.setText(item.name)
    this.itemCategoryText.setText(CATEGORY_LABEL[this.getCategory(item)])
    this.storedValueText.setText(this.getStoredLabel(item))
    this.effectTitleText.setText('Passive Effects')
    this.effectBodyText.setText(this.wrapEffectText(item))
    this.applyItemTexture(this.previewIcon, this.previewFallback, item, this.s(140), this.s(140))
    this.playPreviewBounce()
  }

  private updateBottomHint(): void {
    const sortLabel = this.sortMode === 'name' ? 'Name A-Z' : 'Power High-Low'
    this.hintText.setText(`Z/X Category   Arrows Move   Enter Inspect   Sort: ${sortLabel}`)
  }

  private playEntrance(): void {
    this.backdrop.setAlpha(0)
    this.tweens.add({
      targets: this.backdrop,
      alpha: 0.72,
      duration: 220,
      ease: 'Quad.Out',
    })

    const targets: ReadonlyArray<{ target: EntranceTarget; delay: number }> = [
      { target: this.paperGroup, delay: 0 },
      { target: this.topGroup, delay: 50 },
      { target: this.leftGroup, delay: 90 },
      { target: this.detailGroup, delay: 130 },
      { target: this.rightGroup, delay: 170 },
      { target: this.bottomGroup, delay: 220 },
    ]

    for (const { target, delay } of targets) {
      target.alpha = 0
      target.y += this.s(18)
      this.tweens.add({
        targets: target,
        alpha: 1,
        y: target.y - this.s(18),
        duration: 260,
        delay,
        ease: 'Cubic.Out',
      })
    }
  }

  private onNavTabClick(key: NavTabKey): void {
    if (key === 'inventory') return
    this.scene.stop()
    if (key === 'map') {
      if (!this.scene.isActive('MapScene')) this.scene.launch('MapScene')
      this.scene.bringToTop('MapScene')
      return
    }
    if (!this.scene.isActive('ArchiveScene')) this.scene.launch('ArchiveScene')
    this.scene.bringToTop('ArchiveScene')
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Escape' || event.code === 'KeyI') {
      this.scene.stop()
      return
    }

    if (event.code === 'KeyM' || event.code === 'KeyE') {
      this.scene.stop()
      if (!this.scene.isActive('MapScene')) this.scene.launch('MapScene')
      this.scene.bringToTop('MapScene')
      return
    }

    if (event.code === 'KeyP' || event.code === 'KeyQ') {
      this.scene.stop()
      if (!this.scene.isActive('ArchiveScene')) this.scene.launch('ArchiveScene')
      this.scene.bringToTop('ArchiveScene')
      return
    }

    if (event.code === 'KeyZ') {
      this.shiftCategory(-1)
      return
    }
    if (event.code === 'KeyX') {
      this.shiftCategory(1)
      return
    }
    if (event.code === 'KeyU') {
      this.toggleSortMode()
      return
    }

    if (event.code === 'ArrowLeft') this.moveSelection(-1, 0)
    if (event.code === 'ArrowRight') this.moveSelection(1, 0)
    if (event.code === 'ArrowUp') this.moveSelection(0, -1)
    if (event.code === 'ArrowDown') this.moveSelection(0, 1)

    if (event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space') {
      this.playPreviewBounce()
    }
  }

  private setCategory(key: InventoryCategory): void {
    if (this.selectedCategory === key) return
    this.selectedCategory = key
    this.selectedIndex = 0
    this.hoveredIndex = -1
    this.showHint(`${CATEGORY_LABEL[key]} selected`)
    this.refresh()
  }

  private shiftCategory(direction: -1 | 1): void {
    const current = CATEGORY_ORDER.indexOf(this.selectedCategory)
    const next = Phaser.Math.Wrap(current + direction, 0, CATEGORY_ORDER.length)
    this.setCategory(CATEGORY_ORDER[next] ?? this.selectedCategory)
  }

  private toggleSortMode(): void {
    this.sortMode = this.sortMode === 'name' ? 'power' : 'name'
    this.showHint(this.sortMode === 'name' ? 'Sorting by name' : 'Sorting by power')
    this.refresh()
  }

  private selectIndex(index: number): void {
    const save = readSaveFromRegistry(this)
    const items = this.getVisibleItems(save)
    if (index < 0 || index >= items.length) return
    this.selectedIndex = index
    this.refresh()
  }

  private moveSelection(dx: number, dy: number): void {
    const save = readSaveFromRegistry(this)
    const items = this.getVisibleItems(save)
    if (items.length === 0) return

    let next = this.selectedIndex
    if (next < 0) next = 0
    let col = next % GRID.cols
    let row = Math.floor(next / GRID.cols)

    col = Phaser.Math.Clamp(col + dx, 0, GRID.cols - 1)
    row = Phaser.Math.Clamp(row + dy, 0, GRID.rows - 1)

    next = row * GRID.cols + col
    if (next >= items.length) next = items.length - 1
    if (next < 0) next = 0

    this.selectedIndex = next
    this.refresh()
  }

  private getVisibleItems(save: SaveData): EquipmentItem[] {
    const items = save.equipment.inventory.filter((item) => this.getCategory(item) === this.selectedCategory)
    items.sort((left, right) => {
      if (this.sortMode === 'name') return left.name.localeCompare(right.name)
      const powerDiff = right.atk + right.def - (left.atk + left.def)
      if (powerDiff !== 0) return powerDiff
      return left.name.localeCompare(right.name)
    })
    return items
  }

  private getCategory(item: EquipmentItem): InventoryCategory {
    if (item.slot === 'item1' || item.slot === 'item2') return 'consumables'
    if (item.slot === 'gun' || item.slot === 'sidearm') return 'weapons'
    return 'gear'
  }

  private getStatMetrics(save: SaveData): StatMetrics {
    const totalAtk = save.equipment.inventory.reduce((sum, item) => sum + item.atk, 0)
    const totalDef = save.equipment.inventory.reduce((sum, item) => sum + item.def, 0)
    const visitedCount = save.map.visited.length
    const vitality = Phaser.Math.Clamp(42 + save.profile.level * 6 + save.runtime.maxHp * 8, 0, 100)
    const endurance = Phaser.Math.Clamp(36 + totalDef * 7 + visitedCount * 2, 0, 100)
    const mind = Phaser.Math.Clamp(28 + totalAtk * 6 + save.equipment.inventory.length * 2, 0, 100)
    const hpMax = Math.max(100, save.runtime.maxHp * 100)
    const hpCurrent = Phaser.Math.Clamp(save.runtime.hp * 100, 0, hpMax)
    const fpMax = 500
    const fpCurrent = Math.round((mind / 100) * fpMax)
    return {
      level: save.profile.level,
      vitality,
      endurance,
      mind,
      hpCurrent,
      hpMax,
      fpCurrent,
      fpMax,
    }
  }

  private toLabel(key: StatBarKey): string {
    if (key === 'vitality') return 'Vitality'
    if (key === 'endurance') return 'Endurance'
    return 'Mind'
  }

  private wrapEffectText(item: EquipmentItem): string {
    const parts = [item.desc]
    if (item.atk > 0) parts.push(`ATK +${item.atk}`)
    if (item.def > 0) parts.push(`DEF +${item.def}`)
    return parts.join('\n')
  }

  private getStoredLabel(item: EquipmentItem): string {
    if (this.getCategory(item) === 'consumables') return '1/99'
    return '1/1'
  }

  private startSelectedPulse(index: number): void {
    const cell = this.itemCells[index]
    if (!cell) return

    this.selectedPulseTween?.remove()
    for (const other of this.itemCells) {
      if (other !== cell) other.container.setScale(1)
    }

    cell.container.setScale(1.03)
    this.selectedPulseTween = this.tweens.add({
      targets: cell.container,
      scaleX: 1.055,
      scaleY: 1.055,
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
      onUpdate: () => {
        cell.glow.setAlpha(0.18 + (cell.container.scaleX - 1) * 5.4)
      },
    })
  }

  private playPreviewBounce(): void {
    this.previewTween?.remove()
    this.previewTween = this.tweens.add({
      targets: [this.previewIcon, this.previewFallback],
      scaleX: '*=1.08',
      scaleY: '*=1.08',
      duration: 110,
      yoyo: true,
      ease: 'Back.Out',
    })
  }

  private showHint(message: string): void {
    this.hintText.setText(message)
    this.hintText.setAlpha(1)
    this.hintTween?.remove()
    this.hintTween = this.tweens.add({
      targets: this.hintText,
      alpha: 0.32,
      duration: 900,
      ease: 'Quad.Out',
    })
  }

  private applyItemTexture(
    image: Phaser.GameObjects.Image,
    fallbackText: Phaser.GameObjects.Text,
    item: EquipmentItem,
    maxW: number,
    maxH: number,
  ): void {
    const textureKey = item.icon && item.icon.length > 0 ? `eq-item-${item.icon}` : ''
    if (textureKey && this.textures.exists(textureKey)) {
      image.setVisible(true)
      image.setTexture(textureKey)
      this.fitImage(image, maxW, maxH)
      fallbackText.setVisible(false)
      return
    }

    image.setVisible(false)
    fallbackText.setVisible(true)
    fallbackText.setText(
      item.name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    )
  }

  private fitImage(image: Phaser.GameObjects.Image, maxW: number, maxH: number): void {
    const source = image.texture.getSourceImage() as
      | { width?: number; height?: number }
      | Array<{ width?: number; height?: number }>
      | null

    let textureWidth = 32
    let textureHeight = 32
    const firstSource = Array.isArray(source) ? source[0] : source
    if (firstSource) {
      textureWidth = firstSource.width ?? textureWidth
      textureHeight = firstSource.height ?? textureHeight
    }

    const scale = Math.min(maxW / textureWidth, maxH / textureHeight)
    image.setScale(scale)
  }

  private animateButtonHover(
    container: Phaser.GameObjects.Container,
    plate: Phaser.GameObjects.Rectangle,
    scale: number,
  ): void {
    this.tweens.killTweensOf(container)
    this.tweens.add({
      targets: container,
      scaleX: scale,
      scaleY: scale,
      duration: 140,
      ease: 'Quad.Out',
    })
    plate.setFillStyle(PAPER_COLORS.hoverPaper, 1)
  }

  private animateButtonIdle(
    container: Phaser.GameObjects.Container,
    plate: Phaser.GameObjects.Rectangle,
    rotation: number,
    color: number,
  ): void {
    this.tweens.killTweensOf(container)
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      rotation,
      duration: 150,
      ease: 'Quad.Out',
    })
    plate.setFillStyle(color, 0.96)
  }

  private animateButtonPress(
    container: Phaser.GameObjects.Container,
    plate: Phaser.GameObjects.Rectangle,
  ): void {
    this.tweens.killTweensOf(container)
    this.tweens.add({
      targets: container,
      scaleX: 0.97,
      scaleY: 0.97,
      duration: 70,
      yoyo: true,
      ease: 'Quad.Out',
    })
    plate.setFillStyle(PAPER_COLORS.activeTab, 1)
  }

  private x(refX: number): number {
    return this.uiCenter.x + (refX - REF.frameW / 2) * this.uiScale
  }

  private y(refY: number): number {
    return this.uiCenter.y + (refY - REF.frameH / 2) * this.uiScale
  }

  private s(refSize: number): number {
    return refSize * this.uiScale
  }

  private inkCss(): string {
    return '#2c241c'
  }
}
