import { useLayoutEffect } from 'react'
import { Viewer } from '../scene/Viewer'
import { Museum } from '../scene/Museum'
import { museum } from '../store/museumStore'
import { usePlayerStore } from '../locomotion/playerStore'
import { useLessonStore } from '../lesson/lessonStore'

export function MuseumView() {
  useLayoutEffect(() => {
    usePlayerStore.getState().reset(museum.spawn.position, museum.spawn.yaw, museum.spawn.posture)
    useLessonStore.getState().reset()
  }, [])
  return (
    <Viewer>
      <Museum museum={museum} />
    </Viewer>
  )
}
