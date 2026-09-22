import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useXRInputSourceState } from '@react-three/xr'
import { useLessonStore } from './lessonStore'

const NEXT_KEYS = new Set(['KeyN', 'Space'])
const PREV_KEYS = new Set(['KeyB'])

/** Controller buttons report a state every frame, not events: act on the press edge only. */
function ControllerButtons() {
  const right = useXRInputSourceState('controller', 'right')
  const left = useXRInputSourceState('controller', 'left')
  const go = useLessonStore((s) => s.go)
  const state = useRef({ a: false, b: false, x: false, y: false })
  useFrame(() => {
    const now = {
      a: right?.gamepad['a-button']?.state === 'pressed',
      b: right?.gamepad['b-button']?.state === 'pressed',
      x: left?.gamepad['x-button']?.state === 'pressed',
      y: left?.gamepad['y-button']?.state === 'pressed',
    }
    const prev = state.current
    // PLAN §7.2: A / X next, B / Y previous.
    if ((now.a && !prev.a) || (now.x && !prev.x)) go(1)
    if ((now.b && !prev.b) || (now.y && !prev.y)) go(-1)
    state.current = now
  })
  return null
}

export function LessonControls() {
  const go = useLessonStore((s) => s.go)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (NEXT_KEYS.has(e.code)) {
        e.preventDefault()
        go(1)
      } else if (PREV_KEYS.has(e.code)) go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])
  return <ControllerButtons />
}
