import Phaser from 'phaser'
import { readSaveFromRegistry } from '../save/SaveStore'

type RoomNode = {
  id: string
  x: number
  y: number
  links: string[]
  checkpoint?: boolean
  locked?: boolean
  hasItem?: boolean
}

const MAP_LAYOUT = {
  frameW: 2763,
  frameH: 1347,
  frameTopExtent: 673.5,
  bottomButtonsExtent: 841,

  titleOffsetX: 0,
  titleOffsetY: -575,

  panelMainOffsetX: -255,
  panelMainOffsetY: 62,
  panelMainW: 1955,
  panelMainH: 1110,

  panelRightOffsetX: 980,
  panelRightOffsetY: 62,
  panelRightW: 514,
  panelRightH: 1110,

  buttonsOffsetY: 776,
  equipBtnOffsetX: -568,
  mapBtnOffsetX: 2,
  filesBtnOffsetX: 572,
  buttonW: 524,
  buttonH: 330,
}

const ROOM_NODES: RoomNode[] = [
  { id: 'level01:0', x: 745, y: 600, links: ['level01:1'], checkpoint: true },
  { id: 'level01:1', x: 980, y: 580, links: ['level01:0', 'level01:2', 'level01:3'], hasItem: true },
  { id: 'level01:2', x: 1230, y: 550, links: ['level01:1'], locked: true },
  { id: 'level01:3', x: 900, y: 845, links: ['level01:1'], locked: true },
]

export class MapScene extends Phaser.Scene {
  private uiScale = 1
  private uiCenter = new Phaser.Math.Vector2()
  private panelMainCenter = new Phaser.Math.Vector2()

  private overlay!: Phaser.GameObjects.Graphics
  private infoText!: Phaser.GameObjects.Text
  private tipText!: Phaser.GameObjects.Text

  private hoveredRoomId: string | null = null
  private selectedRoomId: string | null = null
  private roomZones: Phaser.GameObjects.Zone[] = []
  private keyHandler?: (event: KeyboardEvent) => void

  constructor() {
    super('MapScene')
  }

  create(): void {
    this.setupLayout()

    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.62)
      .setOrigin(0, 0)
      .setDepth(1)

    this.addUiImage('map-frame-outer', 0, 0, 10)
    this.addUiImage('map-panel-main', MAP_LAYOUT.panelMainOffsetX, MAP_LAYOUT.panelMainOffsetY, 9)
    this.addUiImage(
      'map-panel-right',
      MAP_LAYOUT.panelRightOffsetX,
      MAP_LAYOUT.panelRightOffsetY,
      9,
    )
    this.addUiImage('map-text-title', MAP_LAYOUT.titleOffsetX, MAP_LAYOUT.titleOffsetY, 30)

    this.overlay = this.add.graphics().setDepth(45)

    this.infoText = this.add
      .text(this.uiCenter.x, this.uiCenter.y + 465 * this.uiScale, '', {
        fontFamily: 'monospace',
        fontSize: `${Math.max(10, Math.floor(20 * this.uiScale))}px`,
        color: '#efe7ca',
        stroke: '#1a130c',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(70)

    this.tipText = this.add
      .text(this.uiCenter.x, this.uiCenter.y + 425 * this.uiScale, '', {
        fontFamily: 'monospace',
        fontSize: `${Math.max(9, Math.floor(16 * this.uiScale))}px`,
        color: '#cbd5e1',
        stroke: '#111827',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(71)

    this.createRoomZones()
    this.createBottomButtons()

    this.keyHandler = (event: KeyboardEvent) => this.onKeyDown(event)
    this.input.keyboard?.on('keydown', this.keyHandler)
    this.registry.events.on('changedata-saveData', this.refresh, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler)
      this.registry.events.off('changedata-saveData', this.refresh, this)
      for (const zone of this.roomZones) zone.destroy()
    })

    this.refresh()
  }

  private setupLayout(): void {
    const w = this.scale.width
    const h = this.scale.height

    const scaleByWidth = (w * 0.98) / MAP_LAYOUT.frameW
    const scaleByHeight =
      (h * 0.96) / (MAP_LAYOUT.frameTopExtent + MAP_LAYOUT.bottomButtonsExtent)
    this.uiScale = Math.min(scaleByWidth, scaleByHeight)

    this.uiCenter.set(
      w / 2,
      (h + (MAP_LAYOUT.frameTopExtent - MAP_LAYOUT.bottomButtonsExtent) * this.uiScale) / 2,
    )
    this.panelMainCenter.set(
      this.uiCenter.x + MAP_LAYOUT.panelMainOffsetX * this.uiScale,
      this.uiCenter.y + MAP_LAYOUT.panelMainOffsetY * this.uiScale,
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
    this.createButton(MAP_LAYOUT.equipBtnOffsetX, 'map-text-equip', false, () => {
      this.scene.stop()
      if (!this.scene.isActive('EquipmentScene')) this.scene.launch('EquipmentScene')
      this.scene.bringToTop('EquipmentScene')
    })

    this.createButton(MAP_LAYOUT.mapBtnOffsetX, 'map-text-map', true, () => {
      this.refresh()
    })

    this.createButton(MAP_LAYOUT.filesBtnOffsetX, 'map-text-files', false, () => {
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
    const y = this.uiCenter.y + MAP_LAYOUT.buttonsOffsetY * this.uiScale
    const baseTexture = active ? 'map-btn-active' : 'map-btn-idle'

    const bg = this.add.image(0, 0, baseTexture)
    const text = this.add.image(0, 0, textKey)

    const container = this.add.container(x, y, [bg, text]).setDepth(80)
    bg.setScale(this.uiScale)
    text.setScale(this.uiScale)

    const hitW = MAP_LAYOUT.buttonW * this.uiScale
    const hitH = MAP_LAYOUT.buttonH * this.uiScale
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
      if (!active) bg.setTexture('map-btn-idle')
    })
    container.on('pointerdown', () => {
      if (!active) bg.setTexture('map-btn-active')
      onClick()
    })
    container.on('pointerup', () => {
      if (!active) bg.setTexture('map-btn-idle')
    })

    return container
  }

  private createRoomZones(): void {
    for (const node of ROOM_NODES) {
      const world = this.toPanelWorld(node.x, node.y)
      const zone = this.add
        .zone(world.x, world.y, 86 * this.uiScale, 86 * this.uiScale)
        .setInteractive({ useHandCursor: true })
        .setDepth(60)

      zone.on('pointerover', () => {
        this.hoveredRoomId = node.id
        this.refresh()
      })

      zone.on('pointerout', () => {
        this.hoveredRoomId = null
        this.refresh()
      })

      zone.on('pointerdown', () => {
        this.selectedRoomId = node.id
        this.refresh()
      })

      this.roomZones.push(zone)
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Escape' || event.code === 'KeyM') {
      this.scene.stop()
      return
    }

    if (event.code === 'KeyE') {
      this.scene.stop()
      if (!this.scene.isActive('EquipmentScene')) this.scene.launch('EquipmentScene')
      this.scene.bringToTop('EquipmentScene')
      return
    }

    if (event.code === 'KeyP') {
      this.scene.stop()
      if (!this.scene.isActive('ArchiveScene')) this.scene.launch('ArchiveScene')
      this.scene.bringToTop('ArchiveScene')
      return
    }
  }

  private refresh(): void {
    const save = readSaveFromRegistry(this)
    const currentRoom = save.map.currentRoom
    const visited = new Set(save.map.visited)

    this.drawGraph(currentRoom, visited)

    const focus = this.hoveredRoomId ?? this.selectedRoomId ?? currentRoom
    const focusVisited = visited.has(focus)
    const total = ROOM_NODES.length

    this.infoText.setText(
      [`Current: ${currentRoom}`, `Focus: ${focus} ${focusVisited ? '[Visited]' : '[Unknown]'}`].join(
        '    ',
      ),
    )
    this.tipText.setText(`Visited: ${save.map.visited.length}/${total}   E Equip   P Files   M/ESC Close`)
  }

  private drawGraph(currentRoom: string, visited: Set<string>): void {
    this.overlay.clear()

    const drawLinked = new Set<string>()
    for (const node of ROOM_NODES) {
      const p1 = this.toPanelWorld(node.x, node.y)
      for (const linkTo of node.links) {
        const link = ROOM_NODES.find((n) => n.id === linkTo)
        if (!link) continue
        const key = [node.id, link.id].sort().join('->')
        if (drawLinked.has(key)) continue
        drawLinked.add(key)

        const p2 = this.toPanelWorld(link.x, link.y)
        const bright = visited.has(node.id) && visited.has(link.id)
        this.overlay.lineStyle(
          Math.max(1, Math.floor(4 * this.uiScale)),
          bright ? 0x7f6a4e : 0x4f463d,
          bright ? 0.9 : 0.45,
        )
        this.overlay.lineBetween(p1.x, p1.y, p2.x, p2.y)
      }
    }

    for (const node of ROOM_NODES) {
      const p = this.toPanelWorld(node.x, node.y)
      const isCurrent = node.id === currentRoom
      const isVisited = visited.has(node.id)
      const isHovered = node.id === this.hoveredRoomId
      const isSelected = node.id === this.selectedRoomId

      const fill = isCurrent ? 0x9f1d2d : isVisited ? 0x7a6b5a : 0x39342d
      const stroke = isHovered || isSelected ? 0xf8efd8 : 0x2f2a24
      const radius = (isHovered || isSelected ? 18 : 14) * this.uiScale

      this.overlay.fillStyle(fill, isCurrent ? 1 : isVisited ? 0.95 : 0.6)
      this.overlay.fillCircle(p.x, p.y, radius)
      this.overlay.lineStyle(Math.max(1, Math.floor(3 * this.uiScale)), stroke, 0.95)
      this.overlay.strokeCircle(p.x, p.y, radius)

      if (isCurrent) {
        const s = 11 * this.uiScale
        this.overlay.lineStyle(Math.max(1, Math.floor(3 * this.uiScale)), 0xeab2b5, 1)
        this.overlay.lineBetween(p.x - s, p.y - s, p.x + s, p.y + s)
        this.overlay.lineBetween(p.x - s, p.y + s, p.x + s, p.y - s)
      }

      if (node.checkpoint) this.drawFlag(p.x + 20 * this.uiScale, p.y - 26 * this.uiScale)
      if (node.locked) this.drawLock(p.x + 22 * this.uiScale, p.y - 24 * this.uiScale)
      if (node.hasItem) this.drawItem(p.x + 24 * this.uiScale, p.y - 20 * this.uiScale)
    }
  }

  private drawFlag(x: number, y: number): void {
    const poleW = Math.max(1, Math.floor(2 * this.uiScale))
    this.overlay.lineStyle(poleW, 0x2f2f2f, 1)
    this.overlay.lineBetween(x, y + 12 * this.uiScale, x, y - 12 * this.uiScale)
    this.overlay.fillStyle(0x72c46a, 1)
    this.overlay.fillTriangle(
      x,
      y - 10 * this.uiScale,
      x + 12 * this.uiScale,
      y - 7 * this.uiScale,
      x,
      y - 2 * this.uiScale,
    )
  }

  private drawLock(x: number, y: number): void {
    const w = 14 * this.uiScale
    const h = 12 * this.uiScale
    this.overlay.fillStyle(0x8f9aa5, 0.95)
    this.overlay.fillRect(x - w / 2, y - h / 2, w, h)
    this.overlay.lineStyle(Math.max(1, Math.floor(2 * this.uiScale)), 0xcbd5e1, 1)
    this.overlay.strokeRect(x - w / 2, y - h / 2, w, h)
    this.overlay.beginPath()
    this.overlay.arc(x, y - h / 2, 5 * this.uiScale, Math.PI, Math.PI * 2)
    this.overlay.strokePath()
  }

  private drawItem(x: number, y: number): void {
    const s = 9 * this.uiScale
    this.overlay.fillStyle(0x8f6544, 0.95)
    this.overlay.fillRect(x - s, y - s, s * 2, s * 2)
    this.overlay.lineStyle(Math.max(1, Math.floor(2 * this.uiScale)), 0xc49670, 1)
    this.overlay.strokeRect(x - s, y - s, s * 2, s * 2)
  }

  private toPanelWorld(localX: number, localY: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.panelMainCenter.x + (localX - MAP_LAYOUT.panelMainW / 2) * this.uiScale,
      this.panelMainCenter.y + (localY - MAP_LAYOUT.panelMainH / 2) * this.uiScale,
    )
  }
}
