import { useLayoutEffect } from 'react'
import { Viewer } from '../scene/Viewer'
import { SpikeScene } from '../spike/SpikeScene'
import { usePlayerStore } from '../locomotion/playerStore'

export function SpikeView() {
  useLayoutEffect(() => {
    // 2 m from the legibility chart, facing it.
    usePlayerStore.getState().reset([0, 0, 2], 0)
  }, [])
  return (
    <Viewer>
      <SpikeScene />
    </Viewer>
  )
}
