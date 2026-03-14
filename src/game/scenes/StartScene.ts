import Phaser from 'phaser'

type MenuEntry = {
  key: string
  action: () => void
}

const START_LAYOUT = {
  bgW: 2760,
  bgH: 1504,

  buttonStartOffsetY: -115,
  buttonStepY: 122,
  buttonOffsetX: 0,
}

export class StartScene extends Phaser.Scene {
  private starting = false
  private uiScale = 1
  private uiCenter = new Phaser.Math.Vector2()

  private menuEntries: MenuEntry[] = []
  private menuButtons: Phaser.GameObjects.Image[] = []
  private selectedIndex = 0
  private tipText!: Phaser.GameObjects.Text
  private keyHandler?: (event: KeyboardEvent) => void

  constructor() {
    super('StartScene')
  }

  create(): void {
    this.setupLayout()

    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 1)
      .setOrigin(0, 0)
      .setDepth(0)

    this.add
      .image(this.uiCenter.x, this.uiCenter.y, 'start-bg-full')
      .setScale(this.uiScale)
      .setDepth(5)

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
      { key: 'start-btn-start', action: () => this.startGame() },
      { key: 'start-btn-continue', action: () => this.startGame() },
      { key: 'start-btn-archives', action: () => this.openArchives() },
      { key: 'start-btn-options', action: () => this.showTip('Options: coming soon') },
      { key: 'start-btn-exit', action: () => this.tryExit() },
    ]

    this.createMenuButtons()
    this.updateButtonVisuals()
    this.showTip('Arrow Up/Down + Enter, or mouse click')

    this.keyHandler = (event: KeyboardEvent) => this.onKeyDown(event)
    this.input.keyboard?.on('keydown', this.keyHandler)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler)
    })
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
      const image = this.add.image(x, y, this.menuEntries[i].key).setScale(baseScale).setDepth(30)

      image.setInteractive({ useHandCursor: true })
      image.on('pointerover', () => {
        this.selectedIndex = i
        this.updateButtonVisuals()
      })
      image.on('pointerdown', () => {
        this.selectedIndex = i
        this.updateButtonVisuals()
      })
      image.on('pointerup', () => {
        this.runSelectedAction()
      })

      this.menuButtons.push(image)
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
      btn.clearTint()
      btn.setAlpha(selected ? 1 : 0.94)
      btn.setScale(this.uiScale * (selected ? 1.03 : 1))
      if (selected) {
        btn.setTint(0xf7ecd0)
      }
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

  private startGame(): void {
    if (this.starting) return
    this.starting = true

    if (this.scene.isActive('UIScene')) this.scene.stop('UIScene')
    if (this.scene.isActive('EquipmentScene')) this.scene.stop('EquipmentScene')
    if (this.scene.isActive('MapScene')) this.scene.stop('MapScene')
    if (this.scene.isActive('ArchiveScene')) this.scene.stop('ArchiveScene')

    this.cameras.main.fadeOut(220, 7, 10, 16)
    this.time.delayedCall(230, () => {
      this.scene.start('Level01Scene')
    })
  }
}

