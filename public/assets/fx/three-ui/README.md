Put Three.js UI effect textures in this folder.

Recommended files:
- `dust-soft.png`: soft round dust particle
- `dust-noise.png`: broken noisy dust speck
- `ember-soft.png`: warm ember / spark particle
- `smoke-soft.png`: soft smoke puff
- `paper-glow.png`: broad paper light bloom
- `paper-noise.png`: subtle paper grain / cloud mask

Use transparent PNGs.
Suggested sizes:
- particles: `64x64` to `256x256`
- glow / noise masks: `256x256` to `1024x1024`

Current code uses generated procedural textures.
When these files are ready, they can replace the procedural materials in:
- `src/game/systems/fx/ThreeUiFxLayer.ts`
