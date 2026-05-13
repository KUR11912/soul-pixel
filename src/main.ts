import './style.css'
import Phaser from 'phaser'
import { gameConfig } from './game/config/gameConfig'
import { ThreeUiFxLayer } from './game/systems/fx/ThreeUiFxLayer'

const app = document.getElementById('app')
const game = new Phaser.Game(gameConfig)

if (app) {
  const syncPhaserCanvas = (): void => {
    const phaserCanvas = app.querySelector('canvas:not(.three-ui-fx)') as HTMLCanvasElement | null
    if (!phaserCanvas) {
      window.requestAnimationFrame(syncPhaserCanvas)
      return
    }

    phaserCanvas.classList.add('phaser-game-canvas')
  }

  syncPhaserCanvas()

  try {
    new ThreeUiFxLayer(game, app)
  } catch (error) {
    console.warn('Three UI FX layer failed to initialize.', error)
  }
}
