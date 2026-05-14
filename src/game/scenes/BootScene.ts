import Phaser from 'phaser'
import { loadSaveData } from '../save/SaveStore'
import { queueEquipmentShellAssets } from './EquipmentScenePaper'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    this.load.image('tiles32', 'assets/art/tilesets/env_ground.png')
    this.load.image('bg-main', 'assets/art/tilesets/main_background.png')

    this.load.image('hud-status-bar', 'assets/ui/status/status_bar.png')
    queueEquipmentShellAssets(this)

    this.load.image('start-bg-full', 'assets/ui/start/start_bg_full.png')
    this.load.image('start-desk-base', 'assets/ui/start/desk_base.png')
    this.load.image('start-prop-lamp', 'assets/ui/start/lamp_body.png')
    this.load.image('start-prop-cup', 'assets/ui/start/cup_body.png')
    this.load.image('start-prop-compass', 'assets/ui/start/compass_body.png')
    this.load.image('start-map-mask-source', 'assets/ui/start/start_map_mask.png')
    this.load.video('start-map-video-alpha', 'assets/ui/start/map_alpha.webm', true)
    this.load.video('start-map-video', 'assets/ui/start/map.mp4', true)
    this.load.video('start-map-video-primary', 'assets/ui/start/MP3.mp4', true)
    this.load.image('start-title-overlay', 'assets/ui/start/start_title_overlay.png')
    this.load.image('start-btn-start', 'assets/ui/start/start_btn_start.png')
    this.load.image('start-btn-continue', 'assets/ui/start/start_btn_continue.png')
    this.load.image('start-btn-archives', 'assets/ui/start/start_btn_archives.png')
    this.load.image('start-btn-options', 'assets/ui/start/start_btn_options.png')
    this.load.image('start-btn-exit', 'assets/ui/start/start_btn_exit.png')
    this.load.image('start-btn-burn-plate', 'assets/ui/start/selected/burn_plate.png')
    this.load.image(
      'start-dust-layer-near',
      'assets/ui/start/particles/dust_layers/clean/A1.png',
    )
    this.load.image(
      'start-dust-layer-mid',
      'assets/ui/start/particles/dust_layers/clean/A2.png',
    )
    for (let i = 1; i <= 10; i += 1) {
      const frame = i.toString().padStart(2, '0')
      this.load.image(
        `start-light-seq-${i}`,
        `assets/ui/start/lights/sequence/clean/${frame}.png`,
      )
    }

    const legacyEquipmentIcons: Record<string, string> = {
      gas_mask: 'HP标志.png',
      field_coat: 'FP标志.png',
      service_rifle: 'm1917.png',
      trench_club: 'M1917图标.png',
      supply_bag: 'iji/手雷图标.png',
      first_aid: 'iji/香烟物品.png',
      ammo_crate: 'm1917.png',
      ration_can: 'iji/香烟物品.png',
      bandage_roll: 'Vitality标志.png',
      wire_pliers: 'M1917图标.png',
    }
    for (const [id, fileName] of Object.entries(legacyEquipmentIcons)) {
      this.load.image(`eq-item-${id}`, `assets/ui/equipment/items/${fileName}`)
    }

    // Player sequence sheet provided by user: 320x320 -> 6x4 frames of 50x80.
    this.load.spritesheet('player', 'assets/art/characters/player/player_sheet.png', {
      frameWidth: 50,
      frameHeight: 80,
      endFrame: 23,
    })
    this.load.spritesheet('player-shoot', 'assets/art/characters/player/player_shoot_sheet.png', {
      frameWidth: 96,
      frameHeight: 80,
      endFrame: 5,
    })
    this.load.spritesheet('player-pistol-idle', 'assets/art/characters/player/player_pistol_idle_sheet.png', {
      frameWidth: 128,
      frameHeight: 80,
      endFrame: 5,
    })
    this.load.spritesheet('player-pistol-reload', 'assets/art/characters/player/player_pistol_reload_sheet.png', {
      frameWidth: 128,
      frameHeight: 80,
      endFrame: 5,
    })
    this.load.spritesheet('player-rifle-shoot', 'assets/art/characters/player/player_rifle_sheet.png', {
      frameWidth: 128,
      frameHeight: 80,
      endFrame: 5,
    })
    this.load.spritesheet('player-rifle-idle', 'assets/art/characters/player/player_rifle_idle_sheet.png', {
      frameWidth: 128,
      frameHeight: 80,
      endFrame: 5,
    })
    this.load.spritesheet('player-rifle-reload', 'assets/art/characters/player/player_rifle_reload_sheet.png', {
      frameWidth: 128,
      frameHeight: 80,
      endFrame: 5,
    })
    this.load.spritesheet('player-grenade-throw', 'assets/art/characters/player/player_grenade_throw_sheet.png', {
      frameWidth: 128,
      frameHeight: 80,
      endFrame: 5,
    })
    this.load.spritesheet('player-grenade-idle', 'assets/art/characters/player/player_grenade_idle_sheet.png', {
      frameWidth: 128,
      frameHeight: 80,
      endFrame: 5,
    })
    this.load.spritesheet('grenade-projectile', 'assets/fx/grenade/grenade_projectile_sheet.png', {
      frameWidth: 64,
      frameHeight: 48,
      endFrame: 5,
    })
    this.load.spritesheet('grenade-explosion', 'assets/fx/grenade/grenade_explosion_sheet.png', {
      frameWidth: 176,
      frameHeight: 112,
      endFrame: 5,
    })
    this.load.image('pistol-bullet', 'assets/fx/pistol/pistol_bullet.png')
    this.load.image('rifle-bullet', 'assets/fx/rifle/rifle_bullet.png')
    this.load.spritesheet('pistol-wall-impact', 'assets/fx/pistol/pistol_wall_impact_sheet.png', {
      frameWidth: 80,
      frameHeight: 64,
      endFrame: 4,
    })
    this.load.spritesheet('enemy-slime', 'assets/art/characters/enemies/slime/slime_sheet.png', {
      frameWidth: 64,
      frameHeight: 48,
      endFrame: 7,
    })
  }

  create(): void {
    this.registry.set('saveData', loadSaveData())

    // Force nearest filtering so pixel edges stay crisp on zoom/scale.
    this.textures.get('tiles32').setFilter(Phaser.Textures.FilterMode.NEAREST)
    if (this.textures.exists('bg-main')) {
      this.textures.get('bg-main').setFilter(Phaser.Textures.FilterMode.NEAREST)
    }
    if (this.textures.exists('start-btn-burn-plate')) {
      this.textures.get('start-btn-burn-plate').setFilter(Phaser.Textures.FilterMode.NEAREST)
    }
    if (this.textures.exists('start-desk-base')) {
      this.textures.get('start-desk-base').setFilter(Phaser.Textures.FilterMode.NEAREST)
    }
    if (this.textures.exists('start-prop-lamp')) {
      this.textures.get('start-prop-lamp').setFilter(Phaser.Textures.FilterMode.NEAREST)
    }
    if (this.textures.exists('start-prop-cup')) {
      this.textures.get('start-prop-cup').setFilter(Phaser.Textures.FilterMode.NEAREST)
    }
    if (this.textures.exists('start-prop-compass')) {
      this.textures.get('start-prop-compass').setFilter(Phaser.Textures.FilterMode.NEAREST)
    }
    if (this.textures.exists('start-map-mask-source')) {
      this.textures.get('start-map-mask-source').setFilter(Phaser.Textures.FilterMode.NEAREST)
    }
    if (this.textures.exists('start-title-overlay')) {
      this.textures.get('start-title-overlay').setFilter(Phaser.Textures.FilterMode.NEAREST)
    }

    const g = this.add.graphics()

    if (this.textures.exists('player')) {
      this.textures.get('player').setFilter(Phaser.Textures.FilterMode.NEAREST)
      if (this.textures.exists('player-shoot')) {
        this.textures.get('player-shoot').setFilter(Phaser.Textures.FilterMode.NEAREST)
      }
      if (this.textures.exists('player-pistol-idle')) {
        this.textures.get('player-pistol-idle').setFilter(Phaser.Textures.FilterMode.NEAREST)
      }
      if (this.textures.exists('player-pistol-reload')) {
        this.textures.get('player-pistol-reload').setFilter(Phaser.Textures.FilterMode.NEAREST)
      }
      if (this.textures.exists('player-rifle-shoot')) {
        this.textures.get('player-rifle-shoot').setFilter(Phaser.Textures.FilterMode.NEAREST)
      }
      if (this.textures.exists('player-rifle-idle')) {
        this.textures.get('player-rifle-idle').setFilter(Phaser.Textures.FilterMode.NEAREST)
      }
      if (this.textures.exists('player-rifle-reload')) {
        this.textures.get('player-rifle-reload').setFilter(Phaser.Textures.FilterMode.NEAREST)
      }
      if (this.textures.exists('player-grenade-throw')) {
        this.textures.get('player-grenade-throw').setFilter(Phaser.Textures.FilterMode.NEAREST)
      }
      if (this.textures.exists('player-grenade-idle')) {
        this.textures.get('player-grenade-idle').setFilter(Phaser.Textures.FilterMode.NEAREST)
      }
      this.createPlayerAnimations()
    } else {
      // Fallback: keep legacy placeholder if sprite-sheet fails to load.
      g.fillStyle(0x7dd3fc, 1)
      g.fillRect(0, 0, 16, 24)
      g.lineStyle(1, 0xe2f2ff, 0.9)
      g.strokeRect(0, 0, 16, 24)
      g.generateTexture('player', 16, 24)
      g.clear()
    }

    if (this.textures.exists('enemy-slime')) {
      this.textures.get('enemy-slime').setFilter(Phaser.Textures.FilterMode.NEAREST)
      this.createEnemyAnimations()
    } else {
      g.fillStyle(0x86efac, 1)
      g.fillRect(0, 2, 16, 12)
      g.fillStyle(0x111827, 1)
      g.fillRect(4, 6, 2, 2)
      g.fillRect(10, 6, 2, 2)
      g.generateTexture('enemy-slime', 16, 16)
    }
    g.destroy()

    if (this.textures.exists('pistol-bullet')) {
      this.textures.get('pistol-bullet').setFilter(Phaser.Textures.FilterMode.NEAREST)
    }
    if (this.textures.exists('rifle-bullet')) {
      this.textures.get('rifle-bullet').setFilter(Phaser.Textures.FilterMode.NEAREST)
    }
    if (this.textures.exists('pistol-wall-impact')) {
      this.textures.get('pistol-wall-impact').setFilter(Phaser.Textures.FilterMode.NEAREST)
    }
    this.createGrenadeFxAnimations()

    this.scene.start('StartScene')
  }

  private createPlayerAnimations(): void {
    if (!this.anims.exists('player-idle')) {
      this.anims.create({
        key: 'player-idle',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 5 }),
        frameRate: 1000 / 320,
        repeat: -1,
      })
    }

    if (!this.anims.exists('player-run')) {
      this.anims.create({
        key: 'player-run',
        frames: this.anims.generateFrameNumbers('player', { start: 6, end: 11 }),
        frameRate: 12,
        repeat: -1,
      })
    }

    if (!this.anims.exists('player-dodge')) {
      this.anims.create({
        key: 'player-dodge',
        frames: [
          { key: 'player', frame: 12, duration: 130 },
          { key: 'player', frame: 13, duration: 130 },
          { key: 'player', frame: 14, duration: 130 },
          { key: 'player', frame: 15, duration: 200 },
          { key: 'player', frame: 16, duration: 130 },
          { key: 'player', frame: 17, duration: 130 },
        ],
        frameRate: 10,
        repeat: 0,
      })
    }

    if (!this.anims.exists('player-jump')) {
      this.anims.create({
        key: 'player-jump',
        frames: this.anims.generateFrameNumbers('player', { start: 18, end: 23 }),
        frameRate: 1000 / 220,
        repeat: -1,
      })
    }

    if (this.textures.exists('player-shoot') && !this.anims.exists('player-shoot')) {
      this.anims.create({
        key: 'player-shoot',
        frames: this.anims.generateFrameNumbers('player-shoot', { start: 0, end: 5 }),
        frameRate: 14,
        repeat: 0,
      })
    }

    if (this.textures.exists('player-pistol-idle') && !this.anims.exists('player-pistol-equip')) {
      this.anims.create({
        key: 'player-pistol-equip',
        frames: this.anims.generateFrameNumbers('player-pistol-idle', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0,
      })
    }

    if (this.textures.exists('player-pistol-idle') && !this.anims.exists('player-pistol-ready')) {
      this.anims.create({
        key: 'player-pistol-ready',
        frames: this.anims.generateFrameNumbers('player-pistol-idle', { start: 5, end: 5 }),
        frameRate: 1,
        repeat: -1,
      })
    }

    if (this.textures.exists('player-pistol-reload') && !this.anims.exists('player-pistol-reload')) {
      this.anims.create({
        key: 'player-pistol-reload',
        frames: this.anims.generateFrameNumbers('player-pistol-reload', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: 0,
      })
    }

    if (this.textures.exists('player-rifle-shoot') && !this.anims.exists('player-rifle-shoot')) {
      this.anims.create({
        key: 'player-rifle-shoot',
        frames: this.anims.generateFrameNumbers('player-rifle-shoot', { start: 0, end: 5 }),
        frameRate: 14,
        repeat: 0,
      })
    }

    if (this.textures.exists('player-rifle-idle') && !this.anims.exists('player-rifle-equip')) {
      this.anims.create({
        key: 'player-rifle-equip',
        frames: this.anims.generateFrameNumbers('player-rifle-idle', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0,
      })
    }

    if (this.textures.exists('player-rifle-idle') && !this.anims.exists('player-rifle-ready')) {
      this.anims.create({
        key: 'player-rifle-ready',
        frames: this.anims.generateFrameNumbers('player-rifle-idle', { start: 5, end: 5 }),
        frameRate: 1,
        repeat: -1,
      })
    }

    if (this.textures.exists('player-rifle-reload') && !this.anims.exists('player-rifle-reload')) {
      this.anims.create({
        key: 'player-rifle-reload',
        frames: this.anims.generateFrameNumbers('player-rifle-reload', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: 0,
      })
    }

    if (this.textures.exists('player-grenade-throw') && !this.anims.exists('player-grenade-throw')) {
      this.anims.create({
        key: 'player-grenade-throw',
        frames: this.anims.generateFrameNumbers('player-grenade-throw', { start: 0, end: 5 }),
        frameRate: 13,
        repeat: 0,
      })
    }

    if (this.textures.exists('player-grenade-idle') && !this.anims.exists('player-grenade-equip')) {
      this.anims.create({
        key: 'player-grenade-equip',
        frames: this.anims.generateFrameNumbers('player-grenade-idle', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0,
      })
    }

    if (this.textures.exists('player-grenade-idle') && !this.anims.exists('player-grenade-ready')) {
      this.anims.create({
        key: 'player-grenade-ready',
        frames: this.anims.generateFrameNumbers('player-grenade-idle', { start: 5, end: 5 }),
        frameRate: 1,
        repeat: -1,
      })
    }
  }

  private createEnemyAnimations(): void {
    if (!this.anims.exists('enemy-slime-idle')) {
      this.anims.create({
        key: 'enemy-slime-idle',
        frames: this.anims.generateFrameNumbers('enemy-slime', { frames: [0, 1, 6, 1] }),
        frameRate: 4,
        repeat: -1,
      })
    }

    if (!this.anims.exists('enemy-slime-walk')) {
      this.anims.create({
        key: 'enemy-slime-walk',
        frames: this.anims.generateFrameNumbers('enemy-slime', { start: 0, end: 7 }),
        frameRate: 7,
        repeat: -1,
      })
    }
  }

  private createGrenadeFxAnimations(): void {
    if (this.textures.exists('grenade-projectile')) {
      this.textures.get('grenade-projectile').setFilter(Phaser.Textures.FilterMode.NEAREST)
      if (!this.anims.exists('grenade-projectile-arc')) {
        this.anims.create({
          key: 'grenade-projectile-arc',
          frames: this.anims.generateFrameNumbers('grenade-projectile', { start: 0, end: 5 }),
          frameRate: 12,
          repeat: -1,
        })
      }
    }

    if (this.textures.exists('grenade-explosion')) {
      this.textures.get('grenade-explosion').setFilter(Phaser.Textures.FilterMode.NEAREST)
      if (!this.anims.exists('grenade-explosion')) {
        this.anims.create({
          key: 'grenade-explosion',
          frames: this.anims.generateFrameNumbers('grenade-explosion', { start: 0, end: 5 }),
          frameRate: 13,
          repeat: 0,
        })
      }
    }

    if (this.textures.exists('pistol-wall-impact')) {
      this.textures.get('pistol-wall-impact').setFilter(Phaser.Textures.FilterMode.NEAREST)
      if (!this.anims.exists('pistol-wall-impact')) {
        this.anims.create({
          key: 'pistol-wall-impact',
          frames: this.anims.generateFrameNumbers('pistol-wall-impact', { start: 0, end: 4 }),
          frameRate: 16,
          repeat: 0,
        })
      }
    }
  }
}
