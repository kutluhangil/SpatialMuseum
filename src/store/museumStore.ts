import { create } from 'zustand'
import museumJson from '../../content/museum.json'
import { MuseumSchema, type Museum, type RoomDef } from '../schema/museum'
import { migrateMuseum } from '../schema/migrate'

// Parsed at module load: an invalid museum.json fails loudly here (and earlier in `npm run validate`).
export const museum: Museum = MuseumSchema.parse(migrateMuseum(museumJson))

export function roomAt(m: Museum, x: number, z: number): RoomDef | undefined {
  return m.rooms.find(
    (r) =>
      x >= r.rect.x &&
      x <= r.rect.x + r.rect.width &&
      z >= r.rect.z &&
      z <= r.rect.z + r.rect.depth,
  )
}

function neighbours(m: Museum, roomId: string): string[] {
  const out: string[] = []
  for (const r of m.rooms) {
    if (r.id === roomId) r.doors.forEach((d) => d.to && out.push(d.to))
    // Doors are declared per side; honour a door declared only by the neighbour as well.
    else if (r.doors.some((d) => d.to === roomId)) out.push(r.id)
  }
  return out
}

/**
 * Rooms to keep mounted: everything within `hops` doors of the current room. Two hops, because
 * from inside a room you can look straight through the hub's opposite door; with one hop that
 * room would be missing and the outdoor panorama would show through the doorway.
 */
export function loadedRoomIds(m: Museum, currentRoomId: string, hops = 2): Set<string> {
  const ids = new Set([currentRoomId])
  let frontier = [currentRoomId]
  for (let i = 0; i < hops; i++) {
    frontier = frontier.flatMap((id) => neighbours(m, id)).filter((id) => !ids.has(id))
    frontier.forEach((id) => ids.add(id))
  }
  return ids
}

type MuseumState = {
  currentRoomId: string
  setCurrentRoom: (id: string) => void
}

export const useMuseumStore = create<MuseumState>((set) => ({
  currentRoomId: museum.spawn.roomId,
  setCurrentRoom: (id) => set({ currentRoomId: id }),
}))
