import { create } from 'zustand'

/**
 * What the student can change about the room itself: the lights and the blinds. Both are deliberate
 * acts (walk up to the switch, pull the chain), so they are not persisted — the room is found the
 * way the last class left it.
 */
type RoomState = {
  lightsOn: boolean
  blindsDown: boolean
  toggleLights: () => void
  toggleBlinds: () => void
}

export const useRoomStore = create<RoomState>((set) => ({
  lightsOn: true,
  blindsDown: true,
  toggleLights: () => set((s) => ({ lightsOn: !s.lightsOn })),
  toggleBlinds: () => set((s) => ({ blindsDown: !s.blindsDown })),
}))
