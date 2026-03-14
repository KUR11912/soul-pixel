import Phaser from 'phaser'
import {
  ITEM_ICON_BY_ID,
  mutateSave,
  readSaveFromRegistry,
  type EquipSlot,
  type EquipmentItem,
} from '../save/SaveStore'

type Rect = { x: number; y: number; w: number; h: number }

const REF_LAYOUT = {
  frameW: 2763,
  frameH: 1347,
  frameTopExtent: 673.5,
  bottomButtonsExtent: 841,

  titleOffsetX: 0,
  titleOffsetY: -575,

  profileOffsetX: -885,
  profileOffsetY: 56,
  profileW: 700,
  profileH: 1100,

  panelBaseOffsetX: 0,
  panelBaseOffsetY: 56,

  bagOffsetX: 7,
  bagOffsetY: 65,
  bagW: 1073,
  bagH: 1108,

  slotsOffsetX: 872,
  slotsOffsetY: 95,
  slotLabelsOffsetX: 872,
  slotLabelsOffsetY: -45,
  slotsW: 547,
  slotsH: 982,

  buttonsOffsetY: 776,
  equipBtnOffsetX: -568,
  mapBtnOffsetX: 2,
  filesBtnOffsetX: 572,
  buttonW: 524,
  buttonH: 330,
}

const BAG_GRID = {
  cols: 6,
  rows: 5,
  startX: 118,
  startY: 331,
  cellW: 118,
  cellH: 118,
  gapX: 25,
  gapY: 15,
}

const SLOT_LABEL: Record<EquipSlot, string> = {
  head: 'HEAD',
  body: 'BODY',
  gun: 'GUN',
  sidearm: 'SIDEARM',
  item1: 'ITEM1',
  item2: 'ITEM2',
}

const SLOT_RECTS: Record<EquipSlot, Rect> = {
  head: { x: 38, y: 34, w: 130, h: 130 },
  body: { x: 365, y: 34, w: 130, h: 130 },
  gun: { x: 53, y: 320, w: 442, h: 120 },
  sidearm: { x: 53, y: 545, w: 442, h: 120 },
  item1: { x: 45, y: 800, w: 130, h: 130 },
  item2: { x: 365, y: 800, w: 130, h: 130 },
}

export class EquipmentScene extends Phaser.Scene {
  private uiScale = 1
  private uiCenter = new Phaser.Math.Vector2()
  private bagCenter = new Phaser.Math.Vector2()
  private slotsCenter = new Phaser.Math.Vector2()

  private selectedIndex = -1
  private hoveredIndex = -1
  private hoveredSlot: EquipSlot | null = null

  private overlay!: Phaser.GameObjects.Graphics
  private selectedText!: Phaser.GameObjects.Text
  private summaryText!: Phaser.GameObjects.Text
  private tipText!: Phaser.GameObjects.Text
  private tipHideTimer?: Phaser.Time.TimerEvent

  private bagZones: Phaser.GameObjects.Zone[] = []
  private slotZones: Phaser.GameObjects.Zone[] = []
  private bagIconNodes: Phaser.GameObjects.GameObject[] = []
  private slotIconNodes: Phaser.GameObjects.GameObject[] = []
  private failedIconIds = new Set<string>()
  private keyHandler?: (event: KeyboardEvent) => void

  constructor() {
    super('EquipmentScene')
  }

  create(): void {
    this.setupLayout()

    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.6)
      .setOrigin(0, 0)
      .setDepth(1)

    this.addUiImage('eq-frame-outer', 0, 0, 10)
    this.addUiImage(
      'eq-panel-base',
      REF_LAYOUT.panelBaseOffsetX,
      REF_LAYOUT.panelBaseOffsetY,
      8,
    )
    this.addUiImage('eq-panel-profile', REF_LAYOUT.profileOffsetX, REF_LAYOUT.profileOffsetY, 20)
    this.addUiImage('eq-panel-backpack', REF_LAYOUT.bagOffsetX, REF_LAYOUT.bagOffsetY, 9)
    this.addUiImage('eq-panel-slots', REF_LAYOUT.slotsOffsetX, REF_LAYOUT.slotsOffsetY, 20)
    this.addUiImage(
      'eq-labels-slots',
      REF_LAYOUT.slotLabelsOffsetX,
      REF_LAYOUT.slotLabelsOffsetY,
      22,
    )
    this.addUiImage('eq-title-text', REF_LAYOUT.titleOffsetX, REF_LAYOUT.titleOffsetY, 30)

    this.overlay = this.add.graphics().setDepth(40)

    this.selectedText = this.add
      .text(
        this.uiCenter.x,
        this.uiCenter.y + (REF_LAYOUT.buttonsOffsetY - 110) * this.uiScale,
        '',
        {
          fontFamily: 'monospace',
          fontSize: `${Math.max(12, Math.floor(26 * this.uiScale))}px`,
          color: '#efe7ca',
          stroke: '#1a130c',
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5, 0.5)
      .setDepth(70)

    this.summaryText = this.add
      .text(
        this.uiCenter.x + 510 * this.uiScale,
        this.uiCenter.y + 435 * this.uiScale,
        '',
        {
          fontFamily: 'monospace',
          fontSize: `${Math.max(8, Math.floor(18 * this.uiScale))}px`,
          color: '#efe7ca',
          lineSpacing: 4,
          align: 'left',
        },
      )
      .setOrigin(0, 0)
      .setDepth(70)

    this.tipText = this.add
      .text(
        this.uiCenter.x,
        this.uiCenter.y + (REF_LAYOUT.buttonsOffsetY - 68) * this.uiScale,
        '',
        {
          fontFamily: 'monospace',
          fontSize: `${Math.max(10, Math.floor(18 * this.uiScale))}px`,
          color: '#fca5a5',
          stroke: '#1a130c',
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5, 0.5)
      .setDepth(71)
      .setAlpha(0)

    this.createBagZones()
    this.createSlotZones()
    this.createBottomButtons()

    this.keyHandler = (event: KeyboardEvent) => this.onKeyDown(event)
    this.input.keyboard?.on('keydown', this.keyHandler)
    this.registry.events.on('changedata-saveData', this.refresh, this)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler)
      this.registry.events.off('changedata-saveData', this.refresh, this)
      for (const zone of this.bagZones) zone.destroy()
      for (const zone of this.slotZones) zone.destroy()
      this.destroyNodes(this.bagIconNodes)
      this.destroyNodes(this.slotIconNodes)
      if (this.tipHideTimer) this.tipHideTimer.remove(false)
    })

    this.refresh()
  }

  private setupLayout(): void {
    const w = this.scale.width
    const h = this.scale.height

    const scaleByWidth = (w * 0.98) / REF_LAYOUT.frameW
    const scaleByHeight =
      (h * 0.96) / (REF_LAYOUT.frameTopExtent + REF_LAYOUT.bottomButtonsExtent)
    this.uiScale = Math.min(scaleByWidth, scaleByHeight)

    this.uiCenter.set(
      w / 2,
      (h + (REF_LAYOUT.frameTopExtent - REF_LAYOUT.bottomButtonsExtent) * this.uiScale) / 2,
    )

    this.bagCenter.set(
      this.uiCenter.x + REF_LAYOUT.bagOffsetX * this.uiScale,
      this.uiCenter.y + REF_LAYOUT.bagOffsetY * this.uiScale,
    )

    this.slotsCenter.set(
      this.uiCenter.x + REF_LAYOUT.slotsOffsetX * this.uiScale,
      this.uiCenter.y + REF_LAYOUT.slotsOffsetY * this.uiScale,
    )
  }

  private addUiImage(
    key: string,
    offsetX: number,
    offsetY: number,
    depth: number,
  ): Phaser.GameObjects.Image {
    return this.add
      .image(
        this.uiCenter.x + offsetX * this.uiScale,
        this.uiCenter.y + offsetY * this.uiScale,
        key,
      )
      .setScale(this.uiScale)
      .setDepth(depth)
  }

  private createBagZones(): void {
    const total = BAG_GRID.cols * BAG_GRID.rows
    for (let i = 0; i < total; i += 1) {
      const rect = this.getBagCellRect(i)
      const zone = this.add
        .zone(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h)
        .setInteractive({ useHandCursor: true })
        .setDepth(60)

      zone.on('pointerover', () => {
        this.hoveredIndex = i
        this.refresh()
      })
      zone.on('pointerout', () => {
        this.hoveredIndex = -1
        this.refresh()
      })
      zone.on('pointerdown', () => this.onBagCellDown(i))

      this.bagZones.push(zone)
    }
  }

  private createSlotZones(): void {
    const entries = Object.entries(SLOT_RECTS) as Array<[EquipSlot, Rect]>

    for (const [slot] of entries) {
      const rect = this.getSlotRect(slot)
      const zone = this.add
        .zone(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h)
        .setInteractive({ useHandCursor: true })
        .setDepth(60)

      zone.on('pointerover', () => {
        this.hoveredSlot = slot
        this.refresh()
      })
      zone.on('pointerout', () => {
        this.hoveredSlot = null
        this.refresh()
      })
      zone.on('pointerdown', () => this.onSlotDown(slot))

      this.slotZones.push(zone)
    }
  }

  private createBottomButtons(): void {
    this.createButton(REF_LAYOUT.equipBtnOffsetX, 'eq-btn-text-equip', true, () => {
      this.refresh()
    })

    this.createButton(REF_LAYOUT.mapBtnOffsetX, 'eq-btn-text-map', false, () => {
      this.scene.stop()
      if (!this.scene.isActive('MapScene')) this.scene.launch('MapScene')
      this.scene.bringToTop('MapScene')
    })

    this.createButton(REF_LAYOUT.filesBtnOffsetX, 'eq-btn-text-files', false, () => {
      this.scene.stop()
      if (!this.scene.isActive('ArchiveScene')) this.scene.launch('ArchiveScene')
      this.scene.bringToTop('ArchiveScene')
    })
  }

  private createButton(
    offsetX: number,
    textKey: string,
    active: boolean,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const x = this.uiCenter.x + offsetX * this.uiScale
    const y = this.uiCenter.y + REF_LAYOUT.buttonsOffsetY * this.uiScale
    const baseTexture = active ? 'eq-btn-active' : 'eq-btn-idle'

    const bg = this.add.image(0, 0, baseTexture)
    const text = this.add.image(0, 0, textKey)

    const container = this.add.container(x, y, [bg, text]).setDepth(80)
    bg.setScale(this.uiScale)
    text.setScale(this.uiScale)

    const hitW = REF_LAYOUT.buttonW * this.uiScale
    const hitH = REF_LAYOUT.buttonH * this.uiScale
    container.setSize(hitW, hitH)
    container.setInteractive(
      new Phaser.Geom.Rectangle(-hitW / 2, -hitH / 2, hitW, hitH),
      Phaser.Geom.Rectangle.Contains,
    )

    container.on('pointerover', () => {
      if (!active) bg.setTint(0xf6e8c9)
    })
    container.on('pointerout', () => {
      bg.clearTint()
      if (!active) bg.setTexture('eq-btn-idle')
    })
    container.on('pointerdown', () => {
      if (!active) bg.setTexture('eq-btn-active')
      onClick()
    })
    container.on('pointerup', () => {
      if (!active) bg.setTexture('eq-btn-idle')
    })

    return container
  }

  private onBagCellDown(index: number): void {
    const save = readSaveFromRegistry(this)
    const backpack = this.getBackpackItems(save)
    if (index < 0 || index >= backpack.length) return

    this.selectedIndex = index

    // Click backpack icon -> auto equip into matching slot.
    const item = backpack[index]
    this.tryEquip(item, item.slot)
  }

  private onSlotDown(slot: EquipSlot): void {
    const save = readSaveFromRegistry(this)
    const backpack = this.getBackpackItems(save)
    const selected = this.selectedIndex >= 0 ? backpack[this.selectedIndex] : undefined

    if (selected) {
      if (selected.slot === slot) {
        this.tryEquip(selected, slot)
      } else {
        const equippedId = save.equipment.slots[slot]
        if (equippedId) {
          this.unequip(slot)
        } else {
          this.showTip(`Cannot equip here. Need ${SLOT_LABEL[selected.slot]}.`)
        }
      }
      return
    }

    if (!save.equipment.slots[slot]) return
    this.unequip(slot)
  }

  private tryEquip(item: EquipmentItem, slot: EquipSlot): void {
    if (item.slot !== slot) {
      this.showTip(`Cannot equip here. Need ${SLOT_LABEL[item.slot]}.`)
      return
    }
    mutateSave(this, (save) => {
      save.equipment.slots[slot] = item.id
    })
    this.refresh()
  }

  private unequip(slot: EquipSlot): void {
    mutateSave(this, (save) => {
      save.equipment.slots[slot] = null
    })
    this.showTip(`Unequipped ${SLOT_LABEL[slot]}.`, '#93c5fd')
    this.refresh()
  }

  private showTip(message: string, color = '#fca5a5'): void {
    this.tipText.setText(message)
    this.tipText.setColor(color)
    this.tipText.setAlpha(1)

    if (this.tipHideTimer) this.tipHideTimer.remove(false)
    this.tipHideTimer = this.time.delayedCall(1100, () => {
      this.tipText.setAlpha(0)
    })
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Escape' || event.code === 'KeyE') {
      this.scene.stop()
      return
    }

    if (event.code === 'KeyM') {
      this.scene.stop()
      if (!this.scene.isActive('MapScene')) this.scene.launch('MapScene')
      this.scene.bringToTop('MapScene')
      return
    }

    if (event.code === 'KeyP') {
      this.scene.stop()
      if (!this.scene.isActive('ArchiveScene')) this.scene.launch('ArchiveScene')
      this.scene.bringToTop('ArchiveScene')
      return
    }

    const save = readSaveFromRegistry(this)
    const backpack = this.getBackpackItems(save)
    const index = this.keyCodeToIndex(event.code)
    if (index >= 0 && index < backpack.length) {
      this.selectedIndex = index
      this.refresh()
      return
    }

    if (event.code === 'ArrowLeft') this.moveSelection(-1, 0)
    if (event.code === 'ArrowRight') this.moveSelection(1, 0)
    if (event.code === 'ArrowUp') this.moveSelection(0, -1)
    if (event.code === 'ArrowDown') this.moveSelection(0, 1)

    if (event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space') {
      const selected = this.selectedIndex >= 0 ? backpack[this.selectedIndex] : undefined
      if (!selected) return
      this.tryEquip(selected, selected.slot)
    }
  }

  private moveSelection(dx: number, dy: number): void {
    const save = readSaveFromRegistry(this)
    const backpack = this.getBackpackItems(save)
    if (backpack.length === 0) return

    if (this.selectedIndex < 0) {
      this.selectedIndex = 0
    }

    const cols = BAG_GRID.cols
    const rows = BAG_GRID.rows
    let col = this.selectedIndex % cols
    let row = Math.floor(this.selectedIndex / cols)

    col = Phaser.Math.Clamp(col + dx, 0, cols - 1)
    row = Phaser.Math.Clamp(row + dy, 0, rows - 1)

    let next = row * cols + col
    if (next >= backpack.length) next = backpack.length - 1
    if (next < 0) next = 0

    this.selectedIndex = next
    this.refresh()
  }

  private keyCodeToIndex(code: string): number {
    if (code === 'Digit1') return 0
    if (code === 'Digit2') return 1
    if (code === 'Digit3') return 2
    if (code === 'Digit4') return 3
    if (code === 'Digit5') return 4
    if (code === 'Digit6') return 5
    if (code === 'Digit7') return 6
    if (code === 'Digit8') return 7
    if (code === 'Digit9') return 8
    return -1
  }

  private refresh(): void {
    const save = readSaveFromRegistry(this)
    const inv = save.equipment.inventory
    const backpack = this.getBackpackItems(save)
    const slots = save.equipment.slots

    this.queueItemTextures(save)

    if (backpack.length === 0) {
      this.selectedIndex = -1
    } else if (this.selectedIndex >= backpack.length) {
      this.selectedIndex = backpack.length - 1
    }

    const selected = this.selectedIndex >= 0 ? backpack[this.selectedIndex] : null
    const hovered =
      this.hoveredIndex >= 0 && this.hoveredIndex < backpack.length
        ? backpack[this.hoveredIndex]
        : null
    const focus = hovered ?? selected

    if (focus) {
      this.selectedText.setText(
        `Selected: ${focus.name} [${SLOT_LABEL[focus.slot]}]  ATK+${focus.atk} DEF+${focus.def}`,
      )
    } else {
      this.selectedText.setText('Selected: (Empty)')
    }

    const getName = (id: string | null): string => {
      if (!id) return '(Empty)'
      return inv.find((it) => it.id === id)?.name ?? id
    }

    this.summaryText.setText(
      [
        `HEAD:    ${getName(slots.head)}`,
        `BODY:    ${getName(slots.body)}`,
        `GUN:     ${getName(slots.gun)}`,
        `SIDEARM: ${getName(slots.sidearm)}`,
        `ITEM1:   ${getName(slots.item1)}`,
        `ITEM2:   ${getName(slots.item2)}`,
      ].join('\n'),
    )

    this.drawBackpackIcons(backpack)
    this.drawEquippedIcons(save.equipment.slots, inv)
    this.drawOverlay(save)
  }

  private drawBackpackIcons(inventory: EquipmentItem[]): void {
    this.destroyNodes(this.bagIconNodes)

    const maxCount = BAG_GRID.cols * BAG_GRID.rows
    const count = Math.min(inventory.length, maxCount)

    for (let i = 0; i < count; i += 1) {
      const item = inventory[i]
      const rect = this.getBagCellRect(i)
      const cx = rect.x + rect.w / 2
      const cy = rect.y + rect.h / 2
      const nodes = this.createItemVisualNodes(item, cx, cy, rect.w * 0.74, rect.h * 0.74, 32)
      this.bagIconNodes.push(...nodes)
    }
  }

  private drawEquippedIcons(
    slots: Record<EquipSlot, string | null>,
    inventory: EquipmentItem[],
  ): void {
    this.destroyNodes(this.slotIconNodes)

    for (const slot of Object.keys(SLOT_RECTS) as EquipSlot[]) {
      const itemId = slots[slot]
      if (!itemId) continue

      const item =
        inventory.find((it) => it.id === itemId) ??
        ({
          id: itemId,
          icon: ITEM_ICON_BY_ID[itemId] ?? itemId,
          name: itemId,
          slot,
          atk: 0,
          def: 0,
          desc: '',
        } as EquipmentItem)

      const rect = this.getSlotRect(slot)
      const cx = rect.x + rect.w / 2
      const cy = rect.y + rect.h / 2
      const smallSlot =
        slot === 'head' || slot === 'body' || slot === 'item1' || slot === 'item2'
      const maxW = rect.w * (smallSlot ? 0.76 : 0.88)
      const maxH = rect.h * (smallSlot ? 0.76 : 0.82)
      const nodes = this.createItemVisualNodes(item, cx, cy, maxW, maxH, 33)
      this.slotIconNodes.push(...nodes)
    }
  }

  private createItemVisualNodes(
    item: EquipmentItem,
    cx: number,
    cy: number,
    maxW: number,
    maxH: number,
    depth: number,
  ): Phaser.GameObjects.GameObject[] {
    const textureKey = this.getItemTextureKey(item)
    if (this.textures.exists(textureKey)) {
      const image = this.add.image(cx, cy, textureKey).setDepth(depth)
      const tex = this.textures.get(textureKey)
      const source = tex.getSourceImage() as
        | { width?: number; height?: number }
        | Array<{ width?: number; height?: number }>
        | null

      let tw = 32
      let th = 32
      if (Array.isArray(source) && source.length > 0) {
        tw = source[0].width ?? tw
        th = source[0].height ?? th
      } else if (!Array.isArray(source) && source) {
        tw = source.width ?? tw
        th = source.height ?? th
      }

      const scale = Math.min(maxW / tw, maxH / th)
      image.setScale(scale)
      return [image]
    }

    // Fallback when icon file is missing.
    const card = this.add
      .rectangle(cx, cy, maxW, maxH, 0x3b2b1f, 0.86)
      .setDepth(depth)
      .setStrokeStyle(Math.max(1, Math.floor(2 * this.uiScale)), 0xcfb892, 0.9)

    const initialsRaw =
      item.name
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0] ?? '')
        .join('')
        .toUpperCase() || item.id.slice(0, 2).toUpperCase()
    const initials = initialsRaw.slice(0, 2)

    const label = this.add
      .text(cx, cy, initials, {
        fontFamily: 'monospace',
        fontSize: `${Math.max(10, Math.floor(20 * this.uiScale))}px`,
        color: '#efe7ca',
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)

    return [card, label]
  }

  private getItemTextureKey(item: EquipmentItem): string {
    const iconId = item.icon && item.icon.length > 0 ? item.icon : ITEM_ICON_BY_ID[item.id] ?? item.id
    return `eq-item-${iconId}`
  }

  private queueItemTextures(save: ReturnType<typeof readSaveFromRegistry>): void {
    if (this.load.isLoading()) return

    const iconIds = new Set<string>()
    const invMap = new Map(save.equipment.inventory.map((item) => [item.id, item]))

    for (const item of save.equipment.inventory) {
      const iconId =
        item.icon && item.icon.length > 0 ? item.icon : ITEM_ICON_BY_ID[item.id] ?? item.id
      iconIds.add(iconId)
    }

    for (const id of Object.values(save.equipment.slots)) {
      if (!id) continue
      const invItem = invMap.get(id)
      if (invItem) {
        const iconId =
          invItem.icon && invItem.icon.length > 0
            ? invItem.icon
            : ITEM_ICON_BY_ID[invItem.id] ?? invItem.id
        iconIds.add(iconId)
      } else {
        iconIds.add(ITEM_ICON_BY_ID[id] ?? id)
      }
    }

    const toLoadIconIds: string[] = []
    for (const iconId of iconIds) {
      if (this.failedIconIds.has(iconId)) continue
      const key = `eq-item-${iconId}`
      if (this.textures.exists(key)) continue
      toLoadIconIds.push(iconId)
    }

    if (toLoadIconIds.length === 0) return

    const onFileError = (file: Phaser.Loader.File): void => {
      const key = file.key
      if (typeof key !== 'string') return
      if (!key.startsWith('eq-item-')) return
      const iconId = key.slice('eq-item-'.length)
      this.failedIconIds.add(iconId)
    }

    const onComplete = (): void => {
      this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileError)
      this.load.off(Phaser.Loader.Events.COMPLETE, onComplete)
      this.refresh()
    }

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileError)
    this.load.once(Phaser.Loader.Events.COMPLETE, onComplete)

    for (const iconId of toLoadIconIds) {
      this.load.image(`eq-item-${iconId}`, `assets/ui/equipment/items/${iconId}.png`)
    }
    this.load.start()
  }

  private destroyNodes(nodes: Phaser.GameObjects.GameObject[]): void {
    for (const n of nodes) n.destroy()
    nodes.length = 0
  }

  private drawOverlay(save: ReturnType<typeof readSaveFromRegistry>): void {
    this.overlay.clear()

    // Backpack: hidden by default, only show hover highlight.
    const backpackCount = this.getBackpackItems(save).length
    if (this.hoveredIndex >= 0 && this.hoveredIndex < backpackCount) {
      const rect = this.getBagCellRect(this.hoveredIndex)
      this.overlay.fillStyle(0xf6e8c9, 0.16)
      this.overlay.fillRect(rect.x, rect.y, rect.w, rect.h)
      this.overlay.lineStyle(Math.max(1, Math.floor(3 * this.uiScale)), 0xf6e8c9, 0.95)
      this.overlay.strokeRect(rect.x, rect.y, rect.w, rect.h)
    }

    // Right slots: hidden by default, only show highlight when hovered.
    if (this.hoveredSlot) {
      const rect = this.getSlotRect(this.hoveredSlot)

      const backpack = this.getBackpackItems(save)
      const selected = this.selectedIndex >= 0 ? backpack[this.selectedIndex] : null
      const isMatch = !!selected && selected.slot === this.hoveredSlot
      const isEquipped = !!save.equipment.slots[this.hoveredSlot]

      const fillColor = isMatch ? 0xfff0c7 : 0xf6e8c9
      const fillAlpha = isMatch ? 0.24 : 0.16
      const strokeColor = isMatch ? 0xf6d493 : isEquipped ? 0xb7c99d : 0xf6e8c9

      this.overlay.fillStyle(fillColor, fillAlpha)
      this.overlay.fillRect(rect.x, rect.y, rect.w, rect.h)

      this.overlay.lineStyle(Math.max(1, Math.floor(3 * this.uiScale)), strokeColor, 0.95)
      this.overlay.strokeRect(rect.x, rect.y, rect.w, rect.h)
    }
  }

  private getBackpackItems(save: ReturnType<typeof readSaveFromRegistry>): EquipmentItem[] {
    const equippedIds = new Set(
      Object.values(save.equipment.slots).filter((id): id is string => typeof id === 'string'),
    )
    return save.equipment.inventory.filter((item) => !equippedIds.has(item.id))
  }

  private getBagCellRect(index: number): Rect {
    const col = index % BAG_GRID.cols
    const row = Math.floor(index / BAG_GRID.cols)

    const x =
      this.bagCenter.x +
      (-REF_LAYOUT.bagW / 2 + BAG_GRID.startX + col * (BAG_GRID.cellW + BAG_GRID.gapX)) *
        this.uiScale
    const y =
      this.bagCenter.y +
      (-REF_LAYOUT.bagH / 2 + BAG_GRID.startY + row * (BAG_GRID.cellH + BAG_GRID.gapY)) *
        this.uiScale

    return {
      x,
      y,
      w: BAG_GRID.cellW * this.uiScale,
      h: BAG_GRID.cellH * this.uiScale,
    }
  }

  private getSlotRect(slot: EquipSlot): Rect {
    const local = SLOT_RECTS[slot]
    const x = this.slotsCenter.x + (-REF_LAYOUT.slotsW / 2 + local.x) * this.uiScale
    const y = this.slotsCenter.y + (-REF_LAYOUT.slotsH / 2 + local.y) * this.uiScale
    return {
      x,
      y,
      w: local.w * this.uiScale,
      h: local.h * this.uiScale,
    }
  }
}
