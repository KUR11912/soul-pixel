import Phaser from 'phaser'
import { readSaveFromRegistry } from '../save/SaveStore'

export class UIScene extends Phaser.Scene {
  private recoverCooldownUntil = 0

  constructor() {
    super('UIScene')
  }

  create(): void {
    this.add
      .image(0, 0, 'hud-status-bar')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(100)

    this.refresh()

    this.registry.events.on('changedata-saveData', this.refresh, this)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-saveData', this.refresh, this)
    })
  }

  private refresh(): void {
    const save = readSaveFromRegistry(this)
    const mapId = save.runtime.mapId
    const activeGameplay = this.getActiveGameplaySceneKey()
    this.tryRecoverGameplayScene(activeGameplay, mapId)
  }

  update(): void {
    this.refresh()
  }

  private getActiveGameplaySceneKey(): 'Level01Scene' | 'Level02Scene' | 'Level03Scene' | null {
    if (this.scene.isActive('Level01Scene')) return 'Level01Scene'
    if (this.scene.isActive('Level02Scene')) return 'Level02Scene'
    if (this.scene.isActive('Level03Scene')) return 'Level03Scene'
    return null
  }

  private tryRecoverGameplayScene(
    activeGameplay: 'Level01Scene' | 'Level02Scene' | 'Level03Scene' | null,
    mapId: string,
  ): void {
    if (activeGameplay) return
    if (this.time.now < this.recoverCooldownUntil) return

    const target =
      mapId === 'level02' ? 'Level02Scene' : mapId === 'level03' ? 'Level03Scene' : 'Level01Scene'
    if (!this.isSceneRegistered(target)) return
    this.recoverCooldownUntil = this.time.now + 1000

    try {
      if (this.scene.isSleeping(target)) {
        this.scene.wake(target)
      } else if (!this.scene.isActive(target)) {
        this.scene.run(target)
      }
      this.scene.bringToTop('UIScene')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[UIScene] recover gameplay scene failed:', error)
    }
  }

  private isSceneRegistered(sceneKey: string): boolean {
    const manager = this.scene.manager as Phaser.Scenes.SceneManager & {
      keys?: Record<string, unknown>
    }
    return !!manager.keys?.[sceneKey]
  }
}
