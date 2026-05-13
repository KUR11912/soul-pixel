import {
  Level01Scene,
  type LevelSceneConfig,
  type MarkerRect,
  type PanoramaBackgroundConfig,
} from './Level01Scene'

const LEVEL02_CONFIG: LevelSceneConfig = {
  sceneKey: 'Level02Scene',
  mapKey: 'level02',
  mapAssetPath: 'assets/maps/json/level02.json',
  mapId: 'level02',
  checkpointIndexes: [0, 5, 9],
  prevTravel: { sceneKey: 'Level01Scene', mapId: 'level01' },
  nextTravel: { sceneKey: 'Level03Scene', mapId: 'level03' },
}

const LEVEL02_BG_KEY = 'level02-panorama'
const LEVEL02_BG_PATH = 'assets/debug/panoramas/level02_panorama.jpg'
const LEVEL02_LADDER_REFERENCE = { width: 2048, height: 1008 } as const
const LEVEL02_PORTAL_REFERENCE = { width: 2016, height: 992 } as const

// User-authored level02 collision boxes (B1-B29).
// Coordinates are authored against a 2048x1008 reference frame.
// Level01Scene builds custom collision bodies against a 1792x640 reference, so
// we convert this set into that internal reference before runtime scaling.
const LEVEL02_WORLD_REFERENCE = { width: 2048, height: 1008 } as const
const LEVEL02_COLLISION_INTERNAL_REFERENCE = { width: 1792, height: 640 } as const

const LEVEL02_COLLISION_RECTS_BLUE_WORLD: ReadonlyArray<MarkerRect> = [
  { x: 399, y: 13, w: 299, h: 355 }, // B1
  { x: 38, y: 16, w: 198, h: 212 }, // B2
  { x: 709, y: 16, w: 405, h: 161 }, // B3
  { x: 1403, y: 152, w: 188, h: 47 }, // B4
  { x: 1011, y: 187, w: 381, h: 47 }, // B5
  { x: 1602, y: 199, w: 143, h: 47 }, // B6
  { x: 1799, y: 199, w: 249, h: 47 }, // B7
  { x: 38, y: 238, w: 34, h: 281 }, // B8
  { x: 160, y: 315, w: 166, h: 56 }, // B9
  { x: 1799, y: 318, w: 111, h: 50 }, // B10
  { x: 708, y: 325, w: 170, h: 35 }, // B11
  { x: 1072, y: 327, w: 57, h: 192 }, // B12
  { x: 1134, y: 327, w: 586, h: 47 }, // B13
  { x: 911, y: 330, w: 156, h: 41 }, // B14
  { x: 161, y: 381, w: 42, h: 43 }, // B15
  { x: 1663, y: 381, w: 57, h: 118 }, // B16
  { x: 1726, y: 424, w: 28, h: 75 }, // B17
  { x: 1817, y: 424, w: 101, h: 127 }, // B18
  { x: 1971, y: 424, w: 77, h: 127 }, // B19
  { x: 655, y: 489, w: 407, h: 34 }, // B20
  { x: 396, y: 491, w: 249, h: 115 }, // B21
  { x: 1139, y: 504, w: 615, h: 47 }, // B22
  { x: 1045, y: 528, w: 82, h: 209 }, // B23
  { x: 31, y: 529, w: 231, h: 170 }, // B24
  { x: 229, y: 709, w: 245, h: 48 }, // B25
  { x: 576, y: 713, w: 414, h: 48 }, // B26
  { x: 1134, y: 728, w: 615, h: 47 }, // B27
  { x: 1855, y: 728, w: 178, h: 47 }, // B28
  { x: 38, y: 972, w: 1995, h: 35 }, // B29
]

const LEVEL02_LADDER_RECTS_WORLD: ReadonlyArray<MarkerRect> = [
  { x: 878, y: 325, w: 33, h: 163 }, // G1
  { x: 1754, y: 203, w: 36, h: 221 }, // G2
  { x: 1767, y: 435, w: 35, h: 553 }, // G3
]

const LEVEL02_CUSTOM_TRAVEL_PORTALS: ReadonlyArray<{
  rect: MarkerRect
  kind: 'prev' | 'next'
  label: string
}> = [
  { rect: { x: 969, y: 380, w: 71, h: 110 }, kind: 'next', label: 'TO L03' },
]

const LEVEL02_COLLISION_RECTS_WORLD: ReadonlyArray<MarkerRect> =
  LEVEL02_COLLISION_RECTS_BLUE_WORLD.map((rect) => ({
    x: (rect.x / LEVEL02_WORLD_REFERENCE.width) * LEVEL02_COLLISION_INTERNAL_REFERENCE.width,
    y: (rect.y / LEVEL02_WORLD_REFERENCE.height) * LEVEL02_COLLISION_INTERNAL_REFERENCE.height,
    w: (rect.w / LEVEL02_WORLD_REFERENCE.width) * LEVEL02_COLLISION_INTERNAL_REFERENCE.width,
    h: (rect.h / LEVEL02_WORLD_REFERENCE.height) * LEVEL02_COLLISION_INTERNAL_REFERENCE.height,
  }))

export class Level02Scene extends Level01Scene {
  constructor() {
    super(LEVEL02_CONFIG)
  }

  protected override getPanoramaBackgroundConfig(): PanoramaBackgroundConfig | null {
    return {
      key: LEVEL02_BG_KEY,
      path: LEVEL02_BG_PATH,
      fitMode: 'cover',
    }
  }

  protected override getLevel03CollisionRectsWorld(): ReadonlyArray<MarkerRect> {
    return LEVEL02_COLLISION_RECTS_WORLD
  }

  protected override getLadderRectsWorld(): ReadonlyArray<MarkerRect> {
    return LEVEL02_LADDER_RECTS_WORLD
  }

  protected override getLadderWorldReference(): { width: number; height: number } {
    return LEVEL02_LADDER_REFERENCE
  }

  protected override getCustomTravelPortals() {
    return LEVEL02_CUSTOM_TRAVEL_PORTALS
  }

  protected override getCustomTravelPortalReference(): { width: number; height: number } {
    return LEVEL02_PORTAL_REFERENCE
  }
}
