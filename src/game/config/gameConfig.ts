import Phaser from 'phaser'
import { BootScene } from '../scenes/BootScene'
import { StartScene } from '../scenes/StartScene'
import { Level01Scene } from '../scenes/Level01Scene'
import { UIScene } from '../scenes/UIScene'
import { EquipmentScene } from '../scenes/EquipmentScene'
import { MapScene } from '../scenes/MapScene'
import { ArchiveScene } from '../scenes/ArchiveScene'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 540,
  backgroundColor: '#0f1118',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, StartScene, Level01Scene, UIScene, EquipmentScene, MapScene, ArchiveScene],
}
