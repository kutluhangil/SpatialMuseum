import { create } from 'zustand'
import { createAudioEngine, type AudioEngine } from './engine'

const STORAGE_KEY = 'ses'

/** Sound is on unless the student turned it off; storage may be unavailable, which is not an error. */
export function savedEnabled(raw: string | null): boolean {
  return raw !== 'kapali'
}

function readEnabled(): boolean {
  try {
    return savedEnabled(localStorage.getItem(STORAGE_KEY))
  } catch {
    return true
  }
}

function writeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'acik' : 'kapali')
  } catch {
    // The choice just will not survive a reload.
  }
}

type AudioState = {
  enabled: boolean
  engine: AudioEngine | null
  /** Called from a user gesture: creates the engine on first use and starts the room tone. */
  start: () => Promise<void>
  toggle: () => void
  click: (pitch?: number) => void
}

export const useAudioStore = create<AudioState>((set, get) => ({
  enabled: readEnabled(),
  engine: null,
  start: async () => {
    let { engine } = get()
    if (!engine) {
      engine = createAudioEngine()
      set({ engine })
    }
    await engine.resume()
    engine.setEnabled(get().enabled)
  },
  toggle: () => {
    const enabled = !get().enabled
    writeEnabled(enabled)
    get().engine?.setEnabled(enabled)
    set({ enabled })
  },
  click: (pitch) => {
    const { engine, enabled } = get()
    if (enabled) engine?.click(pitch)
  },
}))
