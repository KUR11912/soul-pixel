export class Sfx {
  private static ctx: AudioContext | null = null

  private static getContext(): AudioContext | null {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return null
    if (!this.ctx) this.ctx = new AudioCtx()
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  static hit(volume = 0.03): void {
    const ctx = this.getContext()
    if (!ctx) return

    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(180, t)
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08)

    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.1)
  }
}
