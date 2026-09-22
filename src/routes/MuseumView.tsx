import { useLayoutEffect } from 'react'
import { Viewer } from '../scene/Viewer'
import { Museum } from '../scene/Museum'
import { museum } from '../store/museumStore'
import { usePlayerStore } from '../locomotion/playerStore'

export function MuseumView() {
  useLayoutEffect(() => {
    // The seat is always the spawn seat, but the lesson resumes at the saved step.
    usePlayerStore.getState().reset(museum.spawn.position, museum.spawn.yaw, museum.spawn.posture)
  }, [])
  return (
    <Viewer>
      <Museum museum={museum} />
    </Viewer>
  )
}
