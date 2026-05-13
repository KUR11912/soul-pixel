import {
  Level01Scene,
  type LevelSceneConfig,
  type MarkerRect,
  type PanoramaBackgroundConfig,
} from './Level01Scene'

const LEVEL03_CONFIG: LevelSceneConfig = {
  sceneKey: 'Level03Scene',
  mapKey: 'level03',
  mapAssetPath: 'assets/maps/json/level03.json',
  mapId: 'level03',
  checkpointIndexes: [0, 5, 9],
  prevTravel: { sceneKey: 'Level02Scene', mapId: 'level02' },
  nextTravel: { sceneKey: 'Level01Scene', mapId: 'level01' },
}

const LEVEL03_BG_KEY = 'level03-panorama'
const LEVEL03_BG_PATH = 'assets/art/backgrounds/level03_panorama.png'
const LEVEL03_BG_FALLBACK_KEY = 'level03-panorama-fallback'
const LEVEL03_BG_FALLBACK_PATH = 'assets/art/backgrounds/level03_new.png'
const LEVEL03_LADDER_REFERENCE = { width: 2048, height: 1008 } as const
const LEVEL03_PORTAL_REFERENCE = { width: 2016, height: 992 } as const

// User-authored level03 collision boxes (R1-R46).
// Coordinates are authored against a 2048x1008 reference frame.
// Level01Scene builds custom collision bodies against a 1792x640 reference, so
// we convert this set into that internal reference before runtime scaling.
const LEVEL03_WORLD_REFERENCE = { width: 2048, height: 1008 } as const
const LEVEL03_COLLISION_INTERNAL_REFERENCE = { width: 1792, height: 640 } as const

const LEVEL03_COLLISION_RECTS_SOURCE_WORLD: ReadonlyArray<MarkerRect> = [
  { x: 661, y: 212, w: 39, h: 175 }, // R1
  { x: 978, y: 212, w: 46, h: 57 }, // R2
  { x: 1155, y: 212, w: 306, h: 19 }, // R3
  { x: 1498, y: 212, w: 31, h: 19 }, // R4
  { x: 703, y: 213, w: 269, h: 18 }, // R5
  { x: 1614, y: 232, w: 434, h: 26 }, // R6
  { x: 1583, y: 235, w: 25, h: 49 }, // R7
  { x: 182, y: 275, w: 211, h: 40 }, // R8
  { x: 398, y: 276, w: 88, h: 63 }, // R9
  { x: 395, y: 346, w: 141, h: 42 }, // R10
  { x: 619, y: 346, w: 38, h: 40 }, // R11
  { x: 898, y: 352, w: 210, h: 32 }, // R12
  { x: 703, y: 353, w: 159, h: 18 }, // R13
  { x: 1155, y: 353, w: 306, h: 18 }, // R14
  { x: 1496, y: 353, w: 31, h: 18 }, // R15
  { x: 1059, y: 389, w: 51, h: 108 }, // R16
  { x: 1614, y: 389, w: 434, h: 22 }, // R17
  { x: 38, y: 478, w: 159, h: 131 }, // R18
  { x: 1547, y: 492, w: 353, h: 19 }, // R19
  { x: 1058, y: 501, w: 145, h: 9 }, // R20
  { x: 1211, y: 501, w: 325, h: 208 }, // R21
  { x: 208, y: 511, w: 447, h: 98 }, // R22
  { x: 660, y: 512, w: 380, h: 20 }, // R23
  { x: 1046, y: 518, w: 152, h: 254 }, // R24
  { x: 2017, y: 598, w: 29, h: 409 }, // R25
  { x: 1545, y: 615, w: 467, h: 22 }, // R26
  { x: 38, y: 619, w: 221, h: 90 }, // R27
  { x: 266, y: 663, w: 80, h: 46 }, // R28
  { x: 1543, y: 665, w: 181, h: 44 }, // R29
  { x: 228, y: 712, w: 248, h: 46 }, // R30
  { x: 1586, y: 714, w: 72, h: 142 }, // R31
  { x: 569, y: 715, w: 293, h: 37 }, // R32
  { x: 868, y: 715, w: 52, h: 136 }, // R33
  { x: 923, y: 715, w: 67, h: 37 }, // R34
  { x: 1667, y: 716, w: 345, h: 52 }, // R35
  { x: 1669, y: 772, w: 342, h: 25 }, // R36
  { x: 183, y: 853, w: 163, h: 45 }, // R37
  { x: 560, y: 856, w: 123, h: 151 }, // R38
  { x: 687, y: 856, w: 240, h: 38 }, // R39
  { x: 931, y: 862, w: 109, h: 21 }, // R40
  { x: 1079, y: 862, w: 86, h: 145 }, // R41
  { x: 43, y: 948, w: 172, h: 59 }, // R42
  { x: 1168, y: 954, w: 36, h: 53 }, // R43
  { x: 218, y: 991, w: 331, h: 16 }, // R44
  { x: 693, y: 991, w: 379, h: 16 }, // R45
  { x: 1211, y: 999, w: 800, h: 8 }, // R46
]

const LEVEL03_COLLISION_RECTS_WORLD: ReadonlyArray<MarkerRect> =
  LEVEL03_COLLISION_RECTS_SOURCE_WORLD.map((rect) => ({
    x: (rect.x / LEVEL03_WORLD_REFERENCE.width) * LEVEL03_COLLISION_INTERNAL_REFERENCE.width,
    y: (rect.y / LEVEL03_WORLD_REFERENCE.height) * LEVEL03_COLLISION_INTERNAL_REFERENCE.height,
    w: (rect.w / LEVEL03_WORLD_REFERENCE.width) * LEVEL03_COLLISION_INTERNAL_REFERENCE.width,
    h: (rect.h / LEVEL03_WORLD_REFERENCE.height) * LEVEL03_COLLISION_INTERNAL_REFERENCE.height,
  }))

const LEVEL03_LADDER_RECTS_WORLD: ReadonlyArray<MarkerRect> = [
  { x: 866, y: 351, w: 26, h: 146 }, // G1
  { x: 1004, y: 711, w: 25, h: 146 }, // G2
  { x: 1467, y: 204, w: 26, h: 291 }, // G3
  { x: 1547, y: 229, w: 25, h: 257 }, // G4
]

const LEVEL03_CUSTOM_TRAVEL_PORTALS: ReadonlyArray<{
  rect: MarkerRect
  kind: 'prev' | 'next'
  label: string
}> = [
  { rect: { x: 1953, y: 294, w: 50, h: 92 }, kind: 'next', label: 'TO L01' }, // G1
  { rect: { x: 1600, y: 898, w: 56, h: 95 }, kind: 'prev', label: 'TO L02' }, // G2
]

export class Level03Scene extends Level01Scene {
  private createFailed = false

  constructor() {
    super(LEVEL03_CONFIG)
  }

  protected override getPanoramaBackgroundConfig(): PanoramaBackgroundConfig | null {
    return {
      key: LEVEL03_BG_KEY,
      path: LEVEL03_BG_PATH,
      fitMode: 'cover',
      fallback: {
        key: LEVEL03_BG_FALLBACK_KEY,
        path: LEVEL03_BG_FALLBACK_PATH,
      },
    }
  }

  create(): void {
    this.createFailed = false
    try {
      super.create()
    } catch (error) {
      this.createFailed = true
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      // Surface create-time errors in-game instead of a silent black screen.
      // eslint-disable-next-line no-console
      console.error('[Level03Scene] create failed:', error)
      this.cameras.main.setBackgroundColor('#200b0b')
      this.add
        .rectangle(0, 0, this.scale.width, this.scale.height, 0x05070c, 0.96)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(998)
      this.add
        .text(
          16,
          16,
          `Level03 load failed\n${message}\n\nCheck:\n1) assets path\n2) map layer names\n3) console stack`,
          {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#fecaca',
            stroke: '#1f2937',
            strokeThickness: 3,
          },
        )
        .setScrollFactor(0)
        .setDepth(999)
    }
  }

  update(time: number, delta: number): void {
    if (this.createFailed) return
    super.update(time, delta)
  }

  protected override getLevel03CollisionRectsWorld(): ReadonlyArray<MarkerRect> {
    return LEVEL03_COLLISION_RECTS_WORLD
  }

  protected override getLadderRectsWorld(): ReadonlyArray<MarkerRect> {
    return LEVEL03_LADDER_RECTS_WORLD
  }

  protected override getLadderWorldReference(): { width: number; height: number } {
    return LEVEL03_LADDER_REFERENCE
  }

  protected override getCustomTravelPortals() {
    return LEVEL03_CUSTOM_TRAVEL_PORTALS
  }

  protected override shouldReplaceDefaultTravelPortals(): boolean {
    return true
  }

  protected override getCustomTravelPortalReference(): { width: number; height: number } {
    return LEVEL03_PORTAL_REFERENCE
  }
}
