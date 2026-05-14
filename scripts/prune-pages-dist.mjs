import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const distDir = join(rootDir, 'dist')

const sizeOf = (path) => {
  if (!existsSync(path)) return 0
  const stat = statSync(path)
  if (stat.isFile()) return stat.size
  if (!stat.isDirectory()) return 0
  return readdirSync(path).reduce((sum, name) => sum + sizeOf(join(path, name)), 0)
}

let removedBytes = 0

const removeDistPath = (relativePath) => {
  const target = join(distDir, relativePath)
  if (!existsSync(target)) return
  removedBytes += sizeOf(target)
  rmSync(target, { recursive: true, force: true })
}

const pruneNumberedFrames = (relativeDir, keepFrame) => {
  const dir = join(distDir, relativeDir)
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const match = entry.name.match(/(\d{5})\.png$/i)
    if (!match) continue
    const frame = Number(match[1])
    if (!keepFrame(frame)) {
      removeDistPath(join(relativeDir, entry.name))
    }
  }
}

const pruneTabFrames = (relativeDir, keepFrames) => {
  const dir = join(distDir, relativeDir)
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const match = entry.name.match(/(\d{5})\.png$/i)
    if (!match) continue
    if (!keepFrames.has(Number(match[1]))) {
      removeDistPath(join(relativeDir, entry.name))
    }
  }
}

removeDistPath('assets/debug')

removeDistPath('assets/ui/files/pages/ITEM_coordinate_guide.png')
removeDistPath('assets/ui/equipment/states')

for (let frame = 1; frame <= 12; frame += 1) {
  removeDistPath(`assets/ui/start/lights/sequence/${frame}.png`)
}

for (const file of [
  'assets/ui/start/lights/light_halo.png',
  'assets/ui/start/lights/light_halo.png.png',
  'assets/ui/start/lights/light_core.png',
  'assets/ui/start/lights/light_core.png.png',
  'assets/ui/start/lights/light_noise.png',
  'assets/ui/start/lights/light_noise.png.png',
  'assets/ui/start/particles/dust_layers/A1.png',
  'assets/ui/start/particles/dust_layers/A2.png',
  'assets/ui/start/particles/dust_layers/A3.png',
]) {
  removeDistPath(file)
}

pruneNumberedFrames('assets/ui/equipment/anims/open/body/frames', (frame) => frame === 40)
pruneNumberedFrames(
  'assets/ui/equipment/anims/weapon_revolver_focus/body/frames',
  (frame) => frame === 118,
)
pruneNumberedFrames(
  'assets/ui/equipment/anims/item_grenade_focus/body/frames',
  (frame) => frame === 226,
)
pruneNumberedFrames('assets/ui/files/anima', (frame) => frame === 17)
pruneNumberedFrames('assets/ui/map/anims/open/body/frames', () => false)
removeDistPath('assets/ui/map/anims/open/body/runtime')

pruneTabFrames('assets/ui/equipment/anims/open/tab/frame', new Set([89]))
pruneTabFrames('assets/ui/equipment/anims/weapon_revolver_focus/tab/frame', new Set([220]))
pruneTabFrames('assets/ui/equipment/anims/item_grenade_focus/tab/frame', new Set([230]))

console.log(`Pruned ${(removedBytes / 1024 / 1024).toFixed(1)} MB from GitHub Pages artifact.`)
