import Phaser from 'phaser'
import { loadSaveData } from '../save/SaveStore'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    this.load.image('tiles32', 'assets/art/tilesets/env_ground.png')
    this.load.image('bg-main', 'assets/art/tilesets/main_background.png')

    this.load.image('eq-frame-outer', 'assets/ui/equipment/eq_frame_outer.png')
    this.load.image('eq-panel-base', 'assets/ui/equipment/eq_panel_base.png')
    this.load.image('eq-panel-profile', 'assets/ui/equipment/eq_panel_profile.png')
    this.load.image('eq-panel-backpack', 'assets/ui/equipment/eq_panel_backpack.png')
    this.load.image('eq-panel-slots', 'assets/ui/equipment/eq_panel_slots.png')
    this.load.image('eq-labels-slots', 'assets/ui/equipment/eq_labels_slots.png')
    this.load.image('eq-title-text', 'assets/ui/equipment/eq_text_title.png')
    this.load.image('eq-btn-idle', 'assets/ui/equipment/eq_button_idle.png')
    this.load.image('eq-btn-active', 'assets/ui/equipment/eq_button_active.png')
    this.load.image('eq-btn-text-equip', 'assets/ui/equipment/eq_text_equip.png')
    this.load.image('eq-btn-text-map', 'assets/ui/equipment/eq_text_map.png')
    this.load.image('eq-btn-text-files', 'assets/ui/equipment/eq_text_files.png')

    this.load.image('map-bg-full', 'assets/ui/map/map_bg_full.png')
    this.load.image('map-frame-outer', 'assets/ui/map/map_frame_outer.png')
    this.load.image('map-panel-main', 'assets/ui/map/map_panel_main.png')
    this.load.image('map-panel-right', 'assets/ui/map/map_panel_right.png')
    this.load.image('map-text-title', 'assets/ui/map/map_text_title.png')
    this.load.image('map-text-equip', 'assets/ui/map/map_text_equip.png')
    this.load.image('map-text-map', 'assets/ui/map/map_text_map.png')
    this.load.image('map-text-files', 'assets/ui/map/map_text_files.png')
    this.load.image('map-btn-idle', 'assets/ui/map/map_button_idle.png')
    this.load.image('map-btn-idle-alt', 'assets/ui/map/map_button_idle_alt.png')
    this.load.image('map-btn-active', 'assets/ui/map/map_button_active.png')

    this.load.image('files-bg-full', 'assets/ui/files/files_bg_full.png')
    this.load.image('files-frame-outer', 'assets/ui/files/files_frame_outer.png')
    this.load.image('files-panel-main', 'assets/ui/files/files_panel_main.png')
    this.load.image('files-title-text', 'assets/ui/files/files_text_title.png')
    this.load.image('files-btn-idle', 'assets/ui/files/files_button_idle.png')
    this.load.image('files-btn-idle-alt', 'assets/ui/files/files_button_idle_alt.png')
    this.load.image('files-btn-active', 'assets/ui/files/files_button_active.png')
    this.load.image('files-btn-text-equip', 'assets/ui/files/files_text_equip.png')
    this.load.image('files-btn-text-map', 'assets/ui/files/files_text_map.png')
    this.load.image('files-btn-text-files', 'assets/ui/files/files_text_files.png')

    this.load.image('start-bg-full', 'assets/ui/start/start_bg_full.png')
    this.load.image('start-btn-start', 'assets/ui/start/start_btn_start.png')
    this.load.image('start-btn-continue', 'assets/ui/start/start_btn_continue.png')
    this.load.image('start-btn-archives', 'assets/ui/start/start_btn_archives.png')
    this.load.image('start-btn-options', 'assets/ui/start/start_btn_options.png')
    this.load.image('start-btn-exit', 'assets/ui/start/start_btn_exit.png')

    const itemIds = [
      'gas_mask',
      'field_coat',
      'service_rifle',
      'trench_club',
      'supply_bag',
      'first_aid',
      'ammo_crate',
      'ration_can',
      'bandage_roll',
      'wire_pliers',
    ]
    for (const id of itemIds) {
      this.load.image(`eq-item-${id}`, `assets/ui/equipment/items/${id}.png`)
    }
  }

  create(): void {
    this.registry.set('saveData', loadSaveData())

    const g = this.add.graphics()

    g.fillStyle(0x7dd3fc, 1)
    g.fillRect(0, 0, 16, 24)
    g.lineStyle(1, 0xe2f2ff, 0.9)
    g.strokeRect(0, 0, 16, 24)
    g.generateTexture('player', 16, 24)
    g.clear()

    g.fillStyle(0x86efac, 1)
    g.fillRect(0, 2, 16, 12)
    g.fillStyle(0x111827, 1)
    g.fillRect(4, 6, 2, 2)
    g.fillRect(10, 6, 2, 2)
    g.generateTexture('enemy-slime', 16, 16)
    g.destroy()

    this.scene.start('StartScene')
  }
}
