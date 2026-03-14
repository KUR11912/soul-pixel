import Phaser from 'phaser'
import {
  exportSaveJson,
  formatPlayTime,
  importSaveJson,
  readSaveFromRegistry,
  resetSaveData,
  writeSaveToRegistry,
  type SaveData,
} from '../save/SaveStore'

type FilesCategory = 'folder' | 'item' | 'weapon' | 'misc'

type FilesDoc = {
  id: string
  category: FilesCategory
  title: string
  subtitle: string
  body: string[]
}

type Rect = { x: number; y: number; w: number; h: number }

const FILES_LAYOUT = {
  frameW: 2763,
  frameH: 1347,
  frameTopExtent: 673.5,
  bottomButtonsExtent: 841,

  titleOffsetX: 0,
  titleOffsetY: -575,

  bgOffsetX: 0,
  bgOffsetY: 65,

  panelOffsetX: 0,
  panelOffsetY: 38,
  panelW: 1616,
  panelH: 1026,

  buttonsOffsetY: 776,
  equipBtnOffsetX: -568,
  mapBtnOffsetX: 2,
  filesBtnOffsetX: 572,
  buttonW: 524,
  buttonH: 330,
}

const DOC_LIST = {
  startX: 140,
  startY: 165,
  rowW: 540,
  rowH: 175,
  rowGap: 18,
  maxRows: 4,
}

const RIGHT_PAGE = {
  x: 790,
  y: 150,
  w: 660,
  h: 730,
}

const TAB_RECTS: Record<FilesCategory, Rect> = {
  folder: { x: 1560, y: 150, w: 40, h: 180 },
  item: { x: 1560, y: 380, w: 40, h: 180 },
  weapon: { x: 1560, y: 600, w: 40, h: 180 },
  misc: { x: 1560, y: 820, w: 40, h: 180 },
}

export class ArchiveScene extends Phaser.Scene {
  private uiScale = 1
  private uiCenter = new Phaser.Math.Vector2()
  private panelCenter = new Phaser.Math.Vector2()

  private selectedCategory: FilesCategory = 'folder'
  private selectedDocId: string | null = null
  private hoveredCategory: FilesCategory | null = null

  private overlay!: Phaser.GameObjects.Graphics
  private listText!: Phaser.GameObjects.Text
  private pageTitleText!: Phaser.GameObjects.Text
  private pageSubtitleText!: Phaser.GameObjects.Text
  private pageBodyText!: Phaser.GameObjects.Text
  private hintText!: Phaser.GameObjects.Text

  private tabZones: Phaser.GameObjects.Zone[] = []
  private keyHandler?: (event: KeyboardEvent) => void

  constructor() {
    super('ArchiveScene')
  }

  create(): void {
    this.setupLayout()

    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.62)
      .setOrigin(0, 0)
      .setDepth(1)

    this.addUiImage('files-bg-full', FILES_LAYOUT.bgOffsetX, FILES_LAYOUT.bgOffsetY, 6)
    this.addUiImage('files-panel-main', FILES_LAYOUT.panelOffsetX, FILES_LAYOUT.panelOffsetY, 8)
    this.addUiImage('files-frame-outer', 0, 0, 10)
    this.addUiImage('files-title-text', FILES_LAYOUT.titleOffsetX, FILES_LAYOUT.titleOffsetY, 30)

    this.overlay = this.add.graphics().setDepth(45)

    this.listText = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: `${Math.max(10, Math.floor(20 * this.uiScale))}px`,
        color: '#3a3127',
        lineSpacing: Math.max(8, Math.floor(16 * this.uiScale)),
      })
      .setDepth(70)

    this.pageTitleText = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: `${Math.max(12, Math.floor(28 * this.uiScale))}px`,
        color: '#2d261f',
        fontStyle: 'bold',
      })
      .setDepth(70)

    this.pageSubtitleText = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: `${Math.max(10, Math.floor(22 * this.uiScale))}px`,
        color: '#7b3b30',
        fontStyle: 'bold',
      })
      .setDepth(70)

    this.pageBodyText = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: `${Math.max(9, Math.floor(18 * this.uiScale))}px`,
        color: '#3c3328',
        lineSpacing: Math.max(4, Math.floor(8 * this.uiScale)),
        wordWrap: { width: RIGHT_PAGE.w * this.uiScale },
      })
      .setDepth(70)

    this.hintText = this.add
      .text(this.uiCenter.x, this.uiCenter.y + 450 * this.uiScale, '', {
        fontFamily: 'monospace',
        fontSize: `${Math.max(9, Math.floor(16 * this.uiScale))}px`,
        color: '#efe7ca',
        stroke: '#1a130c',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(75)

    this.createTabZones()
    this.createBottomButtons()

    this.keyHandler = (event: KeyboardEvent) => this.onKeyDown(event)
    this.input.keyboard?.on('keydown', this.keyHandler)
    this.registry.events.on('changedata-saveData', this.refresh, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler)
      this.registry.events.off('changedata-saveData', this.refresh, this)
      for (const z of this.tabZones) z.destroy()
    })

    this.refresh()
  }

  private setupLayout(): void {
    const w = this.scale.width
    const h = this.scale.height

    const scaleByWidth = (w * 0.98) / FILES_LAYOUT.frameW
    const scaleByHeight =
      (h * 0.96) / (FILES_LAYOUT.frameTopExtent + FILES_LAYOUT.bottomButtonsExtent)
    this.uiScale = Math.min(scaleByWidth, scaleByHeight)

    this.uiCenter.set(
      w / 2,
      (h + (FILES_LAYOUT.frameTopExtent - FILES_LAYOUT.bottomButtonsExtent) * this.uiScale) / 2,
    )

    this.panelCenter.set(
      this.uiCenter.x + FILES_LAYOUT.panelOffsetX * this.uiScale,
      this.uiCenter.y + FILES_LAYOUT.panelOffsetY * this.uiScale,
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

  private createBottomButtons(): void {
    this.createButton(FILES_LAYOUT.equipBtnOffsetX, 'files-btn-text-equip', false, () => {
      this.scene.stop()
      if (!this.scene.isActive('EquipmentScene')) this.scene.launch('EquipmentScene')
      this.scene.bringToTop('EquipmentScene')
    })

    this.createButton(FILES_LAYOUT.mapBtnOffsetX, 'files-btn-text-map', false, () => {
      this.scene.stop()
      if (!this.scene.isActive('MapScene')) this.scene.launch('MapScene')
      this.scene.bringToTop('MapScene')
    })

    this.createButton(FILES_LAYOUT.filesBtnOffsetX, 'files-btn-text-files', true, () => {
      this.refresh()
    })
  }

  private createButton(
    offsetX: number,
    textKey: string,
    active: boolean,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const x = this.uiCenter.x + offsetX * this.uiScale
    const y = this.uiCenter.y + FILES_LAYOUT.buttonsOffsetY * this.uiScale
    const baseTexture = active ? 'files-btn-active' : 'files-btn-idle'

    const bg = this.add.image(0, 0, baseTexture)
    const text = this.add.image(0, 0, textKey)
    bg.setScale(this.uiScale)
    text.setScale(this.uiScale)

    const container = this.add.container(x, y, [bg, text]).setDepth(80)
    const hitW = FILES_LAYOUT.buttonW * this.uiScale
    const hitH = FILES_LAYOUT.buttonH * this.uiScale
    container.setSize(hitW, hitH)
    container.setInteractive(
      new Phaser.Geom.Rectangle(-hitW / 2, -hitH / 2, hitW, hitH),
      Phaser.Geom.Rectangle.Contains,
    )

    container.on('pointerover', () => {
      if (!active) bg.setTint(0xf8efd8)
    })
    container.on('pointerout', () => {
      bg.clearTint()
      if (!active) bg.setTexture('files-btn-idle')
    })
    container.on('pointerdown', () => {
      if (!active) bg.setTexture('files-btn-active')
      onClick()
    })
    container.on('pointerup', () => {
      if (!active) bg.setTexture('files-btn-idle')
    })

    return container
  }

  private createTabZones(): void {
    for (const category of Object.keys(TAB_RECTS) as FilesCategory[]) {
      const rect = this.getTabRect(category)
      const zone = this.add
        .zone(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h)
        .setInteractive({ useHandCursor: true })
        .setDepth(60)

      zone.on('pointerover', () => {
        this.hoveredCategory = category
        this.refresh()
      })
      zone.on('pointerout', () => {
        this.hoveredCategory = null
        this.refresh()
      })
      zone.on('pointerdown', () => {
        this.selectedCategory = category
        this.selectedDocId = null
        this.refresh()
      })

      this.tabZones.push(zone)
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Escape' || event.code === 'KeyP') {
      this.scene.stop()
      return
    }
    if (event.code === 'KeyE') {
      this.scene.stop()
      if (!this.scene.isActive('EquipmentScene')) this.scene.launch('EquipmentScene')
      this.scene.bringToTop('EquipmentScene')
      return
    }
    if (event.code === 'KeyM') {
      this.scene.stop()
      if (!this.scene.isActive('MapScene')) this.scene.launch('MapScene')
      this.scene.bringToTop('MapScene')
      return
    }
    if (event.code === 'Digit1') {
      this.selectedCategory = 'folder'
      this.selectedDocId = null
      this.refresh()
      return
    }
    if (event.code === 'Digit2') {
      this.selectedCategory = 'item'
      this.selectedDocId = null
      this.refresh()
      return
    }
    if (event.code === 'Digit3') {
      this.selectedCategory = 'weapon'
      this.selectedDocId = null
      this.refresh()
      return
    }
    if (event.code === 'Digit4') {
      this.selectedCategory = 'misc'
      this.selectedDocId = null
      this.refresh()
      return
    }
    if (event.code === 'ArrowDown') {
      this.moveSelection(1)
      return
    }
    if (event.code === 'ArrowUp') {
      this.moveSelection(-1)
      return
    }
    if (event.code === 'KeyO') {
      this.exportSave()
      return
    }
    if (event.code === 'KeyI') {
      this.importSave()
      return
    }
    if (event.code === 'KeyR') {
      this.resetSave()
    }
  }

  private moveSelection(step: 1 | -1): void {
    const docs = this.getVisibleDocs(this.buildDocs(readSaveFromRegistry(this)))
    if (docs.length === 0) return

    const currentIndex = docs.findIndex((d) => d.id === this.selectedDocId)
    const next = Phaser.Math.Wrap(currentIndex + step, 0, docs.length)
    this.selectedDocId = docs[next].id
    this.refresh()
  }

  private exportSave(): void {
    const json = exportSaveJson(this)
    if (navigator.clipboard && window.isSecureContext) {
      void navigator.clipboard
        .writeText(json)
        .then(() => window.alert('Save JSON copied to clipboard'))
        .catch(() => window.prompt('Copy JSON below', json))
    } else {
      window.prompt('Copy JSON below', json)
    }
  }

  private importSave(): void {
    const input = window.prompt('Paste save JSON')
    if (!input) return
    const ok = importSaveJson(this, input)
    if (!ok) {
      window.alert('Import failed: invalid JSON')
      return
    }
    window.alert('Import success')
    this.refresh()
  }

  private resetSave(): void {
    const yes = window.confirm('Reset save? This cannot be undone.')
    if (!yes) return
    const next = resetSaveData()
    writeSaveToRegistry(this, next)
    window.alert('Save reset')
    this.refresh()
  }

  private buildDocs(save: SaveData): FilesDoc[] {
    const slotName = (id: string | null): string => {
      if (!id) return '(Empty)'
      return save.equipment.inventory.find((it) => it.id === id)?.name ?? id
    }

    return [
      {
        id: 'report_offensive',
        category: 'folder',
        title: 'REPORT #45: SOME OFFENSIVE',
        subtitle: '- CLASSIFIED -',
        body: [
          'ENEMY POSITIONS',
          '',
          `Current sector: ${save.map.currentRoom}`,
          `Visited sectors: ${save.map.visited.length}`,
          `Field time: ${formatPlayTime(save.profile.playTimeSec)}`,
          '',
          'Trench movement observed...',
          'Maintain pressure and hold line.',
        ],
      },
      {
        id: 'profile_card',
        category: 'folder',
        title: `PROFILE: ${save.profile.name.toUpperCase()}`,
        subtitle: '- OPERATIVE FILE -',
        body: [
          `Level: ${save.profile.level}`,
          `Souls: ${save.profile.souls}`,
          `Last Save: ${save.profile.lastSaveAt}`,
          '',
          `HP: ${save.runtime.hp}/${save.runtime.maxHp}`,
          `Map: ${save.map.mapId}`,
        ],
      },
      {
        id: 'supply_manifest',
        category: 'item',
        title: 'SUPPLY MANIFEST',
        subtitle: '- ITEM REGISTER -',
        body: [
          `Item Slot 1: ${slotName(save.equipment.slots.item1)}`,
          `Item Slot 2: ${slotName(save.equipment.slots.item2)}`,
          '',
          'Maintain ration count and',
          'medical stock after each sortie.',
        ],
      },
      {
        id: 'weapon_log',
        category: 'weapon',
        title: 'ARMAMENT LOG',
        subtitle: '- WEAPON STATUS -',
        body: [
          `Primary: ${slotName(save.equipment.slots.gun)}`,
          `Sidearm: ${slotName(save.equipment.slots.sidearm)}`,
          '',
          'Confirm ammo, check wear,',
          'and report weapon swaps.',
        ],
      },
      {
        id: 'misc_briefing',
        category: 'misc',
        title: 'FIELD BRIEFING',
        subtitle: '- GENERAL NOTES -',
        body: [
          `Current room: ${save.map.currentRoom}`,
          `Map explored: ${save.map.visited.length} sectors`,
          '',
          'Keep mission notes and',
          'special orders in this tab.',
        ],
      },
    ]
  }

  private getVisibleDocs(all: FilesDoc[]): FilesDoc[] {
    return all.filter((d) => d.category === this.selectedCategory)
  }

  private refresh(): void {
    const save = readSaveFromRegistry(this)
    const allDocs = this.buildDocs(save)
    const visibleDocs = this.getVisibleDocs(allDocs)

    if (visibleDocs.length === 0) {
      this.selectedDocId = null
    } else if (!this.selectedDocId || !visibleDocs.some((d) => d.id === this.selectedDocId)) {
      this.selectedDocId = visibleDocs[0].id
    }

    const selectedDoc = visibleDocs.find((d) => d.id === this.selectedDocId) ?? null
    this.drawOverlay(visibleDocs, selectedDoc)
    this.drawLeftList(visibleDocs, selectedDoc)
    this.drawRightPage(selectedDoc)

    this.hintText.setText(
      '1 FOLDER  2 ITEM  3 WEAPON  4 MISC    O Export  I Import  R Reset    E Equip  M Map  P/ESC Close',
    )
  }

  private drawLeftList(visibleDocs: FilesDoc[], selectedDoc: FilesDoc | null): void {
    const lines: string[] = []
    for (let i = 0; i < DOC_LIST.maxRows; i += 1) {
      const doc = visibleDocs[i]
      if (!doc) {
        lines.push('')
        lines.push('')
        continue
      }
      const marker = selectedDoc?.id === doc.id ? '>' : ' '
      lines.push(`${marker} ${doc.title}`)
      lines.push(`  ${doc.subtitle}`)
    }

    const p = this.panelLocalToWorld(DOC_LIST.startX, DOC_LIST.startY + 22)
    this.listText.setPosition(p.x + 18 * this.uiScale, p.y).setText(lines.join('\n'))
  }

  private drawRightPage(selectedDoc: FilesDoc | null): void {
    const titlePos = this.panelLocalToWorld(RIGHT_PAGE.x, RIGHT_PAGE.y)
    const subtitlePos = this.panelLocalToWorld(RIGHT_PAGE.x, RIGHT_PAGE.y + 52)
    const bodyPos = this.panelLocalToWorld(RIGHT_PAGE.x, RIGHT_PAGE.y + 120)

    if (!selectedDoc) {
      this.pageTitleText.setPosition(titlePos.x, titlePos.y).setText('NO FILE SELECTED')
      this.pageSubtitleText.setPosition(subtitlePos.x, subtitlePos.y).setText('')
      this.pageBodyText.setPosition(bodyPos.x, bodyPos.y).setText('')
      return
    }

    this.pageTitleText.setPosition(titlePos.x, titlePos.y).setText(selectedDoc.title)
    this.pageSubtitleText.setPosition(subtitlePos.x, subtitlePos.y).setText(selectedDoc.subtitle)
    this.pageBodyText.setPosition(bodyPos.x, bodyPos.y).setText(selectedDoc.body.join('\n'))
  }

  private drawOverlay(visibleDocs: FilesDoc[], selectedDoc: FilesDoc | null): void {
    this.overlay.clear()

    for (let i = 0; i < DOC_LIST.maxRows; i += 1) {
      const doc = visibleDocs[i]
      if (!doc) continue
      const rect = this.getDocRowRect(i)

      const isSelected = selectedDoc?.id === doc.id
      if (!isSelected) continue

      this.overlay.fillStyle(0xfff0c7, 0.18)
      this.overlay.fillRect(rect.x, rect.y, rect.w, rect.h)

      this.overlay.lineStyle(Math.max(1, Math.floor(3 * this.uiScale)), 0xe6d2a5, 0.95)
      this.overlay.strokeRect(rect.x, rect.y, rect.w, rect.h)
    }

    for (const category of Object.keys(TAB_RECTS) as FilesCategory[]) {
      const rect = this.getTabRect(category)
      const active = this.selectedCategory === category
      const hover = this.hoveredCategory === category
      if (!active && !hover) continue

      this.overlay.fillStyle(active ? 0xdbc9a3 : 0xcab894, active ? 0.3 : 0.16)
      this.overlay.fillRect(rect.x, rect.y, rect.w, rect.h)

      this.overlay.lineStyle(Math.max(1, Math.floor(2 * this.uiScale)), 0xf6e8c9, 0.95)
      this.overlay.strokeRect(rect.x, rect.y, rect.w, rect.h)
    }
  }

  private getDocRowRect(index: number): Rect {
    const x = DOC_LIST.startX
    const y = DOC_LIST.startY + index * (DOC_LIST.rowH + DOC_LIST.rowGap)
    return this.getPanelRect(x, y, DOC_LIST.rowW, DOC_LIST.rowH)
  }

  private getTabRect(category: FilesCategory): Rect {
    const local = TAB_RECTS[category]
    return this.getPanelRect(local.x, local.y, local.w, local.h)
  }

  private getPanelRect(localX: number, localY: number, w: number, h: number): Rect {
    const p = this.panelLocalToWorld(localX, localY)
    return { x: p.x, y: p.y, w: w * this.uiScale, h: h * this.uiScale }
  }

  private panelLocalToWorld(localX: number, localY: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.panelCenter.x + (localX - FILES_LAYOUT.panelW / 2) * this.uiScale,
      this.panelCenter.y + (localY - FILES_LAYOUT.panelH / 2) * this.uiScale,
    )
  }
}
