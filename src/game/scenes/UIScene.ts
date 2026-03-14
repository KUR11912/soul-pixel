import Phaser from 'phaser'

export class UIScene extends Phaser.Scene {
  private panel!: Phaser.GameObjects.Graphics
  private hpText!: Phaser.GameObjects.Text
  private enemyText!: Phaser.GameObjects.Text

  constructor() {
    super('UIScene')
  }

  create(): void {
    this.panel = this.add.graphics()
    this.drawPanel()

    this.hpText = this.add
      .text(20, 18, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e5f4ff',
      })
      .setScrollFactor(0)
      .setDepth(101)

    this.enemyText = this.add
      .text(20, 40, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#9fb8cc',
      })
      .setScrollFactor(0)
      .setDepth(101)

    this.add
      .text(20, 58, 'Move: WASD/Arrows  Attack: J/K  Menus: E/M/P  Save: L', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#7f95aa',
      })
      .setScrollFactor(0)
      .setDepth(101)

    this.refresh()

    this.registry.events.on('changedata-hp', this.refresh, this)
    this.registry.events.on('changedata-maxHp', this.refresh, this)
    this.registry.events.on('changedata-enemyCount', this.refresh, this)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-hp', this.refresh, this)
      this.registry.events.off('changedata-maxHp', this.refresh, this)
      this.registry.events.off('changedata-enemyCount', this.refresh, this)
    })
  }

  private drawPanel(): void {
    this.panel.clear()
    this.panel.fillStyle(0x11161f, 0.9)
    this.panel.fillRect(12, 12, 280, 62)
    this.panel.lineStyle(2, 0x7dd3fc, 0.95)
    this.panel.strokeRect(12, 12, 280, 62)
    this.panel.setScrollFactor(0)
    this.panel.setDepth(100)
  }

  private refresh(): void {
    const hp = Math.max(0, Number(this.registry.get('hp') ?? 0))
    const maxHp = Math.max(0, Number(this.registry.get('maxHp') ?? 0))
    const enemies = Math.max(0, Number(this.registry.get('enemyCount') ?? 0))
    const bar = '█'.repeat(hp) + '░'.repeat(Math.max(0, maxHp - hp))

    this.hpText.setText(`HP ${hp}/${maxHp} [${bar}]`)
    this.enemyText.setText(`Enemies: ${enemies}`)
  }
}
