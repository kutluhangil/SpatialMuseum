// Quest Browser handles one high-resolution decode comfortably; a second concurrent
// stream is what drops frames, so every play request goes through this arbiter.
class VideoManager {
  private active: HTMLVideoElement | null = null

  async play(el: HTMLVideoElement) {
    if (this.active && this.active !== el) this.active.pause()
    this.active = el
    await el.play()
  }

  pause(el: HTMLVideoElement) {
    el.pause()
    if (this.active === el) this.active = null
  }

  get current(): HTMLVideoElement | null {
    return this.active
  }
}

export const videoManager = new VideoManager()
