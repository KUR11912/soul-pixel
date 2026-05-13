import Phaser from 'phaser'

type MotionTarget = Phaser.GameObjects.Container | Phaser.GameObjects.Image | Phaser.GameObjects.Graphics

type MotionOptions = {
  ampX?: number
  ampY?: number
  rotation?: number
  alpha?: number
  speed?: number
  phase?: number
  parallaxX?: number
  parallaxY?: number
}

type RegisteredTarget = {
  target: MotionTarget
  baseX: number
  baseY: number
  baseRotation: number
  baseAlpha: number
  options: Required<MotionOptions>
}

export class PaperSceneMotion {
  private readonly scene: Phaser.Scene
  private readonly root: Phaser.GameObjects.Container
  private readonly baseRootX: number
  private readonly baseRootY: number
  private readonly uiScale: number
  private readonly targets: RegisteredTarget[] = []

  private pointerX = 0
  private pointerY = 0
  private pointerTargetX = 0
  private pointerTargetY = 0
  private running = false
  private rootParallaxX = 8
  private rootParallaxY = 5
  private rootRotation = 0

  constructor(
    scene: Phaser.Scene,
    root: Phaser.GameObjects.Container,
    baseRootX: number,
    baseRootY: number,
    uiScale: number,
  ) {
    this.scene = scene
    this.root = root
    this.baseRootX = baseRootX
    this.baseRootY = baseRootY
    this.uiScale = uiScale
  }

  setRootMotion(parallaxX: number, parallaxY: number, rotation: number): this {
    this.rootParallaxX = parallaxX
    this.rootParallaxY = parallaxY
    this.rootRotation = rotation
    return this
  }

  add(target: MotionTarget, options: MotionOptions = {}): this {
    this.targets.push({
      target,
      baseX: target.x,
      baseY: target.y,
      baseRotation: target.rotation,
      baseAlpha: target.alpha,
      options: {
        ampX: options.ampX ?? 0,
        ampY: options.ampY ?? 0,
        rotation: options.rotation ?? 0,
        alpha: options.alpha ?? 0,
        speed: options.speed ?? 1,
        phase: options.phase ?? Math.random() * Math.PI * 2,
        parallaxX: options.parallaxX ?? 0,
        parallaxY: options.parallaxY ?? 0,
      },
    })
    return this
  }

  addPaperSheenLayer(width = 1920, height = 1080): Phaser.GameObjects.Image[] {
    const broadKey = this.ensureSheenTexture('paper-fx-sheen-broad', 960, 580, 0.15)
    const streakKey = this.ensureSheenTexture('paper-fx-sheen-streak', 760, 360, 0.22)

    const broad = this.scene.add.image(width * 0.36, height * 0.42, broadKey).setOrigin(0.5)
    broad.setBlendMode(Phaser.BlendModes.SCREEN)
    broad.setAlpha(0.12)

    const streak = this.scene.add.image(width * 0.72, height * 0.63, streakKey).setOrigin(0.5)
    streak.setBlendMode(Phaser.BlendModes.SCREEN)
    streak.setAlpha(0.09)

    this.root.add([broad, streak])
    return [broad, streak]
  }

  start(delayMs = 240): void {
    if (this.running) return
    this.running = true

    this.scene.input.on('pointermove', this.handlePointerMove, this)

    this.scene.time.delayedCall(delayMs, () => {
      if (!this.running) return
      this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this)
    })

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy())
  }

  destroy(): void {
    if (!this.running) return
    this.running = false
    this.scene.input.off('pointermove', this.handlePointerMove, this)
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this)
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    this.pointerTargetX = Phaser.Math.Clamp(
      (pointer.x - this.scene.scale.width * 0.5) / (this.scene.scale.width * 0.5),
      -1,
      1,
    )
    this.pointerTargetY = Phaser.Math.Clamp(
      (pointer.y - this.scene.scale.height * 0.5) / (this.scene.scale.height * 0.5),
      -1,
      1,
    )
  }

  private update(_: number, delta: number): void {
    const dt = delta / 1000

    this.pointerX = Phaser.Math.Linear(this.pointerX, this.pointerTargetX, Math.min(1, dt * 5.2))
    this.pointerY = Phaser.Math.Linear(this.pointerY, this.pointerTargetY, Math.min(1, dt * 5.2))

    this.root.x =
      this.baseRootX +
      this.pointerX * this.rootParallaxX * this.uiScale
    this.root.y =
      this.baseRootY +
      this.pointerY * this.rootParallaxY * this.uiScale
    this.root.rotation = this.pointerX * this.rootRotation * 0.35

    for (const item of this.targets) {
      const { target, baseX, baseY, baseRotation, baseAlpha, options } = item
      const parallaxX = this.pointerX * options.parallaxX * this.uiScale
      const parallaxY = this.pointerY * options.parallaxY * this.uiScale

      target.x = baseX + parallaxX
      target.y = baseY + parallaxY
      target.rotation = baseRotation + this.pointerX * options.rotation * 0.4
      target.alpha = baseAlpha
    }
  }

  private ensureSheenTexture(
    key: string,
    width: number,
    height: number,
    opacity: number,
  ): string {
    if (this.scene.textures.exists(key)) return key

    const canvasTexture = this.scene.textures.createCanvas(key, width, height)
    if (!canvasTexture) return key

    const ctx = canvasTexture.getContext()
    ctx.clearRect(0, 0, width, height)

    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, `rgba(255,247,228,0)`)
    gradient.addColorStop(0.18, `rgba(255,246,221,${opacity * 0.35})`)
    gradient.addColorStop(0.5, `rgba(255,246,225,${opacity})`)
    gradient.addColorStop(0.84, `rgba(255,243,214,${opacity * 0.26})`)
    gradient.addColorStop(1, `rgba(255,242,210,0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.ellipse(width * 0.5, height * 0.5, width * 0.48, height * 0.42, -0.42, 0, Math.PI * 2)
    ctx.fill()

    canvasTexture.refresh()
    return key
  }
}
