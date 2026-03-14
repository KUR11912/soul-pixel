import Phaser from 'phaser'

export type EquipSlot = 'head' | 'body' | 'gun' | 'sidearm' | 'item1' | 'item2'

export type EquipmentItem = {
  id: string
  icon: string
  name: string
  slot: EquipSlot
  atk: number
  def: number
  desc: string
}

export type SaveData = {
  version: number
  profile: {
    name: string
    level: number
    souls: number
    playTimeSec: number
    lastSaveAt: string
  }
  map: {
    mapId: string
    currentRoom: string
    visited: string[]
  }
  runtime: {
    mapId: string
    x: number
    y: number
    hp: number
    maxHp: number
  }
  equipment: {
    slots: Record<EquipSlot, string | null>
    inventory: EquipmentItem[]
  }
}

const SAVE_KEY = 'soul-pixel-save-v1'

export const ITEM_ICON_BY_ID: Record<string, string> = {
  gas_mask: 'gas_mask',
  field_coat: 'field_coat',
  service_rifle: 'service_rifle',
  trench_club: 'trench_club',
  supply_bag: 'supply_bag',
  first_aid: 'first_aid',
  ammo_crate: 'ammo_crate',
  ration_can: 'ration_can',
  bandage_roll: 'bandage_roll',
  wire_pliers: 'wire_pliers',
}

const DEFAULT_ITEMS: EquipmentItem[] = [
  {
    id: 'gas_mask',
    icon: ITEM_ICON_BY_ID.gas_mask,
    name: 'Gas Mask',
    slot: 'head',
    atk: 0,
    def: 2,
    desc: 'A basic mask that improves survival.',
  },
  {
    id: 'field_coat',
    icon: ITEM_ICON_BY_ID.field_coat,
    name: 'Field Coat',
    slot: 'body',
    atk: 0,
    def: 3,
    desc: 'Standard coat that adds defense.',
  },
  {
    id: 'service_rifle',
    icon: ITEM_ICON_BY_ID.service_rifle,
    name: 'Service Rifle',
    slot: 'gun',
    atk: 4,
    def: 0,
    desc: 'Primary gun with stable damage.',
  },
  {
    id: 'trench_club',
    icon: ITEM_ICON_BY_ID.trench_club,
    name: 'Trench Club',
    slot: 'sidearm',
    atk: 3,
    def: 0,
    desc: 'Short range backup weapon.',
  },
  {
    id: 'supply_bag',
    icon: ITEM_ICON_BY_ID.supply_bag,
    name: 'Supply Bag',
    slot: 'item1',
    atk: 0,
    def: 1,
    desc: 'Field pouch carrying utility tools.',
  },
  {
    id: 'first_aid',
    icon: ITEM_ICON_BY_ID.first_aid,
    name: 'First Aid',
    slot: 'item2',
    atk: 0,
    def: 1,
    desc: 'Medical kit for emergency use.',
  },
  {
    id: 'ammo_crate',
    icon: ITEM_ICON_BY_ID.ammo_crate,
    name: 'Ammo Crate',
    slot: 'gun',
    atk: 1,
    def: 0,
    desc: 'Extra ammo improves firearm output.',
  },
  {
    id: 'ration_can',
    icon: ITEM_ICON_BY_ID.ration_can,
    name: 'Ration Can',
    slot: 'item1',
    atk: 0,
    def: 0,
    desc: 'Simple ration used in long patrols.',
  },
  {
    id: 'bandage_roll',
    icon: ITEM_ICON_BY_ID.bandage_roll,
    name: 'Bandage Roll',
    slot: 'item2',
    atk: 0,
    def: 0,
    desc: 'Basic medical supply.',
  },
  {
    id: 'wire_pliers',
    icon: ITEM_ICON_BY_ID.wire_pliers,
    name: 'Wire Pliers',
    slot: 'sidearm',
    atk: 2,
    def: 0,
    desc: 'Improvised close-range utility weapon.',
  },
]

export function createDefaultSave(): SaveData {
  const now = new Date().toISOString()
  return {
    version: 2,
    profile: {
      name: 'Wanderer',
      level: 1,
      souls: 0,
      playTimeSec: 0,
      lastSaveAt: now,
    },
    map: {
      mapId: 'level01',
      currentRoom: 'level01:0',
      visited: ['level01:0'],
    },
    runtime: {
      mapId: 'level01',
      x: 96,
      y: 160,
      hp: 5,
      maxHp: 5,
    },
    equipment: {
      slots: {
        head: null,
        body: null,
        gun: null,
        sidearm: null,
        item1: null,
        item2: null,
      },
      inventory: [...DEFAULT_ITEMS],
    },
  }
}

function clampNum(n: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : fallback
  return Math.min(max, Math.max(min, v))
}

function normalizeItem(item: unknown): EquipmentItem | null {
  if (!item || typeof item !== 'object') return null
  const src = item as Partial<EquipmentItem>
  if (!src.id || !src.name || !src.slot) return null
  if (
    src.slot !== 'head' &&
    src.slot !== 'body' &&
    src.slot !== 'gun' &&
    src.slot !== 'sidearm' &&
    src.slot !== 'item1' &&
    src.slot !== 'item2'
  ) {
    return null
  }
  const id = String(src.id)
  const iconFromId = ITEM_ICON_BY_ID[id]
  const icon =
    iconFromId ??
    (typeof src.icon === 'string' && src.icon.length > 0 ? String(src.icon) : id)

  return {
    id,
    icon,
    name: String(src.name),
    slot: src.slot,
    atk: clampNum(src.atk, 0, 0),
    def: clampNum(src.def, 0, 0),
    desc: String(src.desc ?? ''),
  }
}

function normalizeSave(input: unknown): SaveData {
  const fallback = createDefaultSave()
  if (!input || typeof input !== 'object') return fallback
  const src = input as Partial<SaveData>
  const slotRaw = src.equipment?.slots as Record<string, unknown> | undefined
  const readSlot = (value: unknown): string | null =>
    typeof value === 'string' && value.length > 0 ? value : null

  const inventoryRaw = Array.isArray(src.equipment?.inventory)
    ? src.equipment?.inventory.map(normalizeItem).filter((v): v is EquipmentItem => !!v)
    : []
  const seenItemIds = new Set<string>()
  const inventory: EquipmentItem[] = []
  for (const item of inventoryRaw) {
    if (seenItemIds.has(item.id)) continue
    seenItemIds.add(item.id)
    inventory.push(item)
  }

  const visited = Array.isArray(src.map?.visited)
    ? src.map.visited.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : []

  const currentRoom =
    typeof src.map?.currentRoom === 'string' && src.map.currentRoom.length > 0
      ? src.map.currentRoom
      : 'level01:0'

  const normalized: SaveData = {
    version: clampNum(src.version, 1, 1),
    profile: {
      name:
        typeof src.profile?.name === 'string' && src.profile.name.length > 0
          ? src.profile.name
          : fallback.profile.name,
      level: clampNum(src.profile?.level, 1, 1),
      souls: clampNum(src.profile?.souls, 0, 0),
      playTimeSec: clampNum(src.profile?.playTimeSec, 0, 0),
      lastSaveAt:
        typeof src.profile?.lastSaveAt === 'string' && src.profile.lastSaveAt.length > 0
          ? src.profile.lastSaveAt
          : fallback.profile.lastSaveAt,
    },
    map: {
      mapId:
        typeof src.map?.mapId === 'string' && src.map.mapId.length > 0 ? src.map.mapId : 'level01',
      currentRoom,
      visited: visited.length > 0 ? Array.from(new Set(visited)) : [currentRoom],
    },
    runtime: {
      mapId:
        typeof src.runtime?.mapId === 'string' && src.runtime.mapId.length > 0
          ? src.runtime.mapId
          : 'level01',
      x: clampNum(src.runtime?.x, 96),
      y: clampNum(src.runtime?.y, 160),
      hp: clampNum(src.runtime?.hp, 5, 0),
      maxHp: clampNum(src.runtime?.maxHp, 5, 1),
    },
    equipment: {
      slots: {
        head: readSlot(slotRaw?.head),
        body: readSlot(slotRaw?.body) ?? readSlot(slotRaw?.armor),
        gun: readSlot(slotRaw?.gun) ?? readSlot(slotRaw?.weapon),
        sidearm: readSlot(slotRaw?.sidearm),
        item1: readSlot(slotRaw?.item1) ?? readSlot(slotRaw?.relic),
        item2: readSlot(slotRaw?.item2),
      },
      inventory: inventory.length > 0 ? inventory : [...DEFAULT_ITEMS],
    },
  }

  // Migration to v2: start with empty equipped slots.
  if (normalized.version < 2) {
    normalized.version = 2
    normalized.equipment.slots = {
      head: null,
      body: null,
      gun: null,
      sidearm: null,
      item1: null,
      item2: null,
    }
  }

  // Enforce slot compatibility even for imported/edited saves.
  const invMap = new Map(normalized.equipment.inventory.map((item) => [item.id, item]))
  for (const slot of Object.keys(normalized.equipment.slots) as EquipSlot[]) {
    const id = normalized.equipment.slots[slot]
    if (!id) continue
    const item = invMap.get(id)
    if (!item || item.slot !== slot) {
      normalized.equipment.slots[slot] = null
    }
  }

  if (!normalized.map.visited.includes(normalized.map.currentRoom)) {
    normalized.map.visited.push(normalized.map.currentRoom)
  }

  return normalized
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return createDefaultSave()
    return normalizeSave(JSON.parse(raw))
  } catch {
    return createDefaultSave()
  }
}

export function writeSaveData(data: SaveData): SaveData {
  const next = normalizeSave(data)
  next.profile.lastSaveAt = new Date().toISOString()
  localStorage.setItem(SAVE_KEY, JSON.stringify(next))
  return next
}

export function resetSaveData(): SaveData {
  const next = createDefaultSave()
  localStorage.setItem(SAVE_KEY, JSON.stringify(next))
  return next
}

export function readSaveFromRegistry(scene: Phaser.Scene): SaveData {
  const value = scene.registry.get('saveData')
  if (value) return normalizeSave(value)
  const loaded = loadSaveData()
  scene.registry.set('saveData', loaded)
  return loaded
}

export function writeSaveToRegistry(scene: Phaser.Scene, data: SaveData): SaveData {
  const next = writeSaveData(data)
  scene.registry.set('saveData', next)
  return next
}

export function mutateSave(scene: Phaser.Scene, recipe: (draft: SaveData) => void): SaveData {
  const current = readSaveFromRegistry(scene)
  const draft = normalizeSave(JSON.parse(JSON.stringify(current)))
  recipe(draft)
  return writeSaveToRegistry(scene, draft)
}

export function exportSaveJson(scene: Phaser.Scene): string {
  return JSON.stringify(readSaveFromRegistry(scene), null, 2)
}

export function importSaveJson(scene: Phaser.Scene, json: string): boolean {
  try {
    const parsed = JSON.parse(json)
    const normalized = normalizeSave(parsed)
    writeSaveToRegistry(scene, normalized)
    return true
  } catch {
    return false
  }
}

export function formatPlayTime(playTimeSec: number): string {
  const sec = Math.max(0, Math.floor(playTimeSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')}`
}
