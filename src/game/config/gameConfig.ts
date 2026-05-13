import Phaser from 'phaser'
import { BootScene } from '../scenes/BootScene'
import { StartScene } from '../scenes/StartScene'
import { Level01Scene } from '../scenes/Level01Scene'
import { Level02Scene } from '../scenes/Level02Scene'
import { Level03Scene } from '../scenes/Level03Scene'
import { UIScene } from '../scenes/UIScene'
import { EquipmentScene } from '../scenes/EquipmentScenePaper'
import { InventoryScene } from '../scenes/InventoryScene'
import { MapScene } from '../scenes/MapSceneNotebook'
import { ArchiveScene } from '../scenes/ArchiveSceneNotebook'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1920,
  height: 1080,
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
    antialiasGL: false,
    pixelArt: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
  },
  scene: [
    BootScene,
    StartScene,
    Level01Scene,
    Level02Scene,
    Level03Scene,
    UIScene,
    EquipmentScene,
    InventoryScene,
    MapScene,
    ArchiveScene,
  ],
}
