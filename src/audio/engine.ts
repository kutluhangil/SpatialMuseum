// Sound is synthesised here rather than shipped as files: a lecture room's air handling is noise
// through a filter, and the interface sounds are two short envelopes. Nothing to download, nothing
// to licence, and it stays in step with the rest of the room being procedural.

const ROOM_TONE_GAIN = 0.035
const CLICK_GAIN = 0.06
// Ventilation is a low rumble with a little life in it, not a steady hiss.
const ROOM_TONE_CUTOFF = 430
const ROOM_TONE_SWELL = { rate: 0.06, depth: 0.35 }

/** Two seconds of brown noise, looped: darker than white noise, the way moving air sounds. */
function brownNoise(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

export type AudioEngine = {
  /** Must be called from a user gesture: browsers refuse to start audio before one. */
  resume: () => Promise<void>
  setEnabled: (enabled: boolean) => void
  click: (pitch?: number) => void
  dispose: () => void
}

export function createAudioEngine(): AudioEngine {
  const ctx = new AudioContext()
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  const tone = ctx.createBufferSource()
  tone.buffer = brownNoise(ctx)
  tone.loop = true
  const toneFilter = ctx.createBiquadFilter()
  toneFilter.type = 'lowpass'
  toneFilter.frequency.value = ROOM_TONE_CUTOFF
  const toneGain = ctx.createGain()
  toneGain.gain.value = ROOM_TONE_GAIN
  // A slow swell keeps the tone from sounding like a stuck sample.
  const swell = ctx.createOscillator()
  swell.frequency.value = ROOM_TONE_SWELL.rate
  const swellDepth = ctx.createGain()
  swellDepth.gain.value = ROOM_TONE_GAIN * ROOM_TONE_SWELL.depth
  swell.connect(swellDepth).connect(toneGain.gain)
  tone.connect(toneFilter).connect(toneGain).connect(master)
  tone.start()
  swell.start()

  return {
    resume: async () => {
      if (ctx.state === 'suspended') await ctx.resume()
    },
    setEnabled: (enabled) => {
      const now = ctx.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.25)
    },
    click: (pitch = 1) => {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(880 * pitch, now)
      osc.frequency.exponentialRampToValueAtTime(420 * pitch, now + 0.06)
      const env = ctx.createGain()
      env.gain.setValueAtTime(0, now)
      env.gain.linearRampToValueAtTime(CLICK_GAIN, now + 0.006)
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
      osc.connect(env).connect(master)
      osc.start(now)
      osc.stop(now + 0.14)
    },
    dispose: () => {
      tone.stop()
      swell.stop()
      void ctx.close()
    },
  }
}
