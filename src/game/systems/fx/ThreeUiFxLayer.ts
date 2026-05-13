import Phaser from 'phaser'
import * as THREE from 'three'

type ParticleState = {
  x: number
  y: number
  z: number
  drift: number
  speed: number
  sway: number
  seed: number
  size: number
  alpha: number
}

type OverlayProfile = {
  strength: number
  warmth: number
  ember: number
}

type ParticleLayerConfig = {
  count: number
  color: string
  opacity: number
  sparkle: number
  sizeRange: [min: number, max: number]
  alphaRange: [min: number, max: number]
  speedRange: [min: number, max: number]
  driftRange: [min: number, max: number]
}

const DECOR_SCENE_KEYS = new Set(['EquipmentScene', 'MapScene', 'ArchiveScene'])

export class ThreeUiFxLayer {
  private readonly game: Phaser.Game
  private readonly host: HTMLElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.OrthographicCamera
  private readonly clock = new THREE.Clock()

  private readonly ambientStates: ParticleState[] = []
  private readonly sparkleStates: ParticleState[] = []
  private readonly ambientGeometry: THREE.BufferGeometry
  private readonly sparkleGeometry: THREE.BufferGeometry
  private readonly ambientMaterial: THREE.ShaderMaterial
  private readonly sparkleMaterial: THREE.ShaderMaterial
  private readonly ambientPoints: THREE.Points
  private readonly sparklePoints: THREE.Points

  private rafId = 0
  private width = 1
  private height = 1
  private offsetLeft = 0
  private offsetTop = 0
  private pointerX = 0
  private pointerY = 0
  private currentStrength = 0
  private currentWarmth = 0
  private currentEmber = 0

  constructor(game: Phaser.Game, host: HTMLElement) {
    this.game = game
    this.host = host
    this.host.style.position = 'relative'
    this.host.style.isolation = 'isolate'

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    })
    this.renderer.domElement.classList.add('three-ui-fx')
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20)
    this.camera.position.z = 10

    this.ambientGeometry = new THREE.BufferGeometry()
    this.sparkleGeometry = new THREE.BufferGeometry()

    this.ambientMaterial = this.createParticleMaterial('#efe1c7', 0.28, 0.12)
    this.sparkleMaterial = this.createParticleMaterial('#f7d7b0', 0.42, 0.3)

    this.ambientPoints = new THREE.Points(this.ambientGeometry, this.ambientMaterial)
    this.sparklePoints = new THREE.Points(this.sparkleGeometry, this.sparkleMaterial)
    this.scene.add(this.ambientPoints, this.sparklePoints)

    this.rebuildParticleCloud(this.ambientStates, this.ambientGeometry, {
      count: 170,
      color: '#efe1c7',
      opacity: 0.28,
      sparkle: 0.12,
      sizeRange: [1.1, 3.6],
      alphaRange: [0.08, 0.28],
      speedRange: [2.4, 7.5],
      driftRange: [1.4, 5.8],
    })
    this.rebuildParticleCloud(this.sparkleStates, this.sparkleGeometry, {
      count: 28,
      color: '#f7d7b0',
      opacity: 0.42,
      sparkle: 0.3,
      sizeRange: [2.6, 5.6],
      alphaRange: [0.16, 0.4],
      speedRange: [3.2, 8.8],
      driftRange: [2.2, 6.2],
    })

    this.host.appendChild(this.renderer.domElement)
    this.resize()

    this.onResize = this.onResize.bind(this)
    this.onPointerMove = this.onPointerMove.bind(this)
    this.animate = this.animate.bind(this)

    window.addEventListener('resize', this.onResize)
    window.addEventListener('pointermove', this.onPointerMove, { passive: true })

    this.rafId = window.requestAnimationFrame(this.animate)
  }

  dispose(): void {
    window.cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('pointermove', this.onPointerMove)
    this.renderer.dispose()
    this.ambientGeometry.dispose()
    this.sparkleGeometry.dispose()
    this.ambientMaterial.dispose()
    this.sparkleMaterial.dispose()
    this.host.removeChild(this.renderer.domElement)
  }

  private onResize(): void {
    this.resize()
  }

  private onPointerMove(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    this.pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    this.pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2
  }

  private resize(): void {
    const hostRect = this.host.getBoundingClientRect()
    const phaserCanvas = this.host.querySelector('canvas:not(.three-ui-fx)') as HTMLCanvasElement | null
    const canvasRect = phaserCanvas?.getBoundingClientRect()

    const nextWidth = Math.max(1, canvasRect?.width ?? this.host.clientWidth)
    const nextHeight = Math.max(1, canvasRect?.height ?? this.host.clientHeight)
    const nextLeft = (canvasRect?.left ?? hostRect.left) - hostRect.left
    const nextTop = (canvasRect?.top ?? hostRect.top) - hostRect.top

    const sizeChanged =
      Math.abs(nextWidth - this.width) > 0.5 || Math.abs(nextHeight - this.height) > 0.5
    const offsetChanged =
      Math.abs(nextLeft - this.offsetLeft) > 0.5 || Math.abs(nextTop - this.offsetTop) > 0.5

    this.width = nextWidth
    this.height = nextHeight
    this.offsetLeft = nextLeft
    this.offsetTop = nextTop

    if (!sizeChanged && !offsetChanged) return

    this.renderer.domElement.style.left = `${this.offsetLeft}px`
    this.renderer.domElement.style.top = `${this.offsetTop}px`
    this.renderer.domElement.style.width = `${this.width}px`
    this.renderer.domElement.style.height = `${this.height}px`

    this.renderer.setSize(this.width, this.height, false)
    this.camera.left = -this.width / 2
    this.camera.right = this.width / 2
    this.camera.top = this.height / 2
    this.camera.bottom = -this.height / 2
    this.camera.updateProjectionMatrix()
  }

  private createParticleMaterial(
    color: string,
    opacity: number,
    sparkle: number,
  ): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uVisibility: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
        uPointer: { value: new THREE.Vector2() },
        uBaseColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
        uSparkle: { value: sparkle },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute float aSeed;

        uniform float uTime;
        uniform float uVisibility;
        uniform float uPixelRatio;
        uniform vec2 uPointer;

        varying float vAlpha;
        varying float vPulse;
        varying float vSeed;

        void main() {
          vec3 transformed = position;
          float driftX = sin(uTime * (0.16 + aSeed * 0.3) + aSeed * 15.0) * (4.0 + aSeed * 16.0);
          float driftY = cos(uTime * (0.12 + aSeed * 0.24) + aSeed * 22.0) * (2.0 + aSeed * 8.0);

          transformed.x += driftX * uVisibility + uPointer.x * (5.0 + aSeed * 12.0) * uVisibility;
          transformed.y += driftY * uVisibility - uPointer.y * (4.0 + aSeed * 10.0) * uVisibility;

          vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float pulse = 0.72 + 0.28 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 31.0);
          gl_PointSize = aSize * (0.92 + pulse * 0.28) * uPixelRatio;

          vAlpha = aAlpha * uVisibility;
          vPulse = pulse;
          vSeed = aSeed;
        }
      `,
      fragmentShader: `
        uniform vec3 uBaseColor;
        uniform float uOpacity;
        uniform float uSparkle;

        varying float vAlpha;
        varying float vPulse;
        varying float vSeed;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);

          float soft = smoothstep(0.5, 0.04, dist);
          float core = smoothstep(0.22, 0.0, dist);
          float halo = smoothstep(0.48, 0.12, dist);
          float twinkle = 0.8 + sin(vSeed * 97.0 + vPulse * 6.28318) * 0.2;

          float alpha = (soft * 0.46 + core * 0.68 + halo * uSparkle * 0.22) * vAlpha * uOpacity * twinkle;
          if (alpha <= 0.01) discard;

          vec3 color = uBaseColor + core * 0.16 + halo * 0.04;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    })
  }

  private rebuildParticleCloud(
    states: ParticleState[],
    geometry: THREE.BufferGeometry,
    config: ParticleLayerConfig,
  ): void {
    states.length = 0
    const positions = new Float32Array(config.count * 3)
    const sizes = new Float32Array(config.count)
    const alphas = new Float32Array(config.count)
    const seeds = new Float32Array(config.count)

    for (let i = 0; i < config.count; i += 1) {
      const state = this.randomParticle(config)
      states.push(state)
      positions[i * 3] = state.x
      positions[i * 3 + 1] = state.y
      positions[i * 3 + 2] = state.z
      sizes[i] = state.size
      alphas[i] = state.alpha
      seeds[i] = state.seed
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
  }

  private randomParticle(config: ParticleLayerConfig): ParticleState {
    return {
      x: THREE.MathUtils.randFloatSpread(this.width * 0.88),
      y: THREE.MathUtils.randFloatSpread(this.height * 0.9),
      z: THREE.MathUtils.randFloatSpread(0.8),
      drift: THREE.MathUtils.randFloat(config.driftRange[0], config.driftRange[1]),
      speed: THREE.MathUtils.randFloat(config.speedRange[0], config.speedRange[1]),
      sway: THREE.MathUtils.randFloat(0.2, 0.8),
      seed: Math.random() * Math.PI * 2,
      size: THREE.MathUtils.randFloat(config.sizeRange[0], config.sizeRange[1]),
      alpha: THREE.MathUtils.randFloat(config.alphaRange[0], config.alphaRange[1]),
    }
  }

  private animate(): void {
    this.resize()

    const delta = Math.min(this.clock.getDelta(), 1 / 20)
    const time = this.clock.elapsedTime
    const target = this.resolveProfile()

    this.currentStrength = THREE.MathUtils.lerp(this.currentStrength, target.strength, 0.06)
    this.currentWarmth = THREE.MathUtils.lerp(this.currentWarmth, target.warmth, 0.05)
    this.currentEmber = THREE.MathUtils.lerp(this.currentEmber, target.ember, 0.05)

    this.updateParticles(this.ambientStates, this.ambientGeometry, delta, time, this.currentStrength, false)
    this.updateParticles(this.sparkleStates, this.sparkleGeometry, delta, time, this.currentEmber, true)
    this.updateMaterialStrength()

    this.renderer.domElement.style.opacity = this.currentStrength < 0.01 ? '0' : '1'
    this.renderer.render(this.scene, this.camera)
    this.rafId = window.requestAnimationFrame(this.animate)
  }

  private updateParticles(
    states: ParticleState[],
    geometry: THREE.BufferGeometry,
    delta: number,
    time: number,
    strength: number,
    isEmber: boolean,
  ): void {
    const position = geometry.getAttribute('position') as THREE.BufferAttribute

    for (let i = 0; i < states.length; i += 1) {
      const state = states[i]
      const rise = isEmber ? 10 : 5
      const sway = isEmber ? 3 : 1.6

      state.y += (state.speed * (0.24 + strength * 0.65) + rise * strength) * delta
      state.x +=
        Math.sin(time * state.sway + state.seed) *
        state.drift *
        delta *
        (0.26 + sway * strength * 0.08)
      state.x += this.pointerX * delta * (isEmber ? 3.5 : 1.8)
      state.y -= this.pointerY * delta * (isEmber ? 2.6 : 1.2)

      if (state.y > this.height * 0.56) {
        state.y = -this.height * 0.58 - Math.random() * 140
        state.x = THREE.MathUtils.randFloatSpread(this.width * 0.9)
      }
      if (Math.abs(state.x) > this.width * 0.54) {
        state.x *= 0.88
      }

      position.setXYZ(i, state.x, state.y, state.z)
    }

    position.needsUpdate = true
  }

  private updateMaterialStrength(): void {
    this.ambientMaterial.uniforms.uTime.value = this.clock.elapsedTime
    this.ambientMaterial.uniforms.uVisibility.value = this.currentStrength
    this.ambientMaterial.uniforms.uPointer.value.set(this.pointerX, this.pointerY)
    this.ambientMaterial.uniforms.uOpacity.value = 0.2 + this.currentWarmth * 0.04

    this.sparkleMaterial.uniforms.uTime.value = this.clock.elapsedTime
    this.sparkleMaterial.uniforms.uVisibility.value = this.currentStrength * (0.42 + this.currentEmber * 0.18)
    this.sparkleMaterial.uniforms.uPointer.value.set(this.pointerX, this.pointerY)
    this.sparkleMaterial.uniforms.uOpacity.value = 0.28 + this.currentWarmth * 0.06
  }

  private resolveProfile(): OverlayProfile {
    const activeScenes = this.game.scene
      .getScenes(true)
      .map((scene) => scene.scene.key)

    const activeKeys = new Set(activeScenes)
    const hasDecorScene = Array.from(DECOR_SCENE_KEYS).some((key) => activeKeys.has(key))

    if (hasDecorScene) {
      return { strength: 1, warmth: 0.88, ember: 0.18 }
    }
    return { strength: 0, warmth: 0, ember: 0 }
  }
}
