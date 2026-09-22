import { useEffect } from 'react'
import { useLessonStore } from '../lesson/lessonStore'
import { useAudioStore } from './audioStore'

/**
 * Wakes the audio engine on the first gesture (browsers refuse to start it any earlier) and marks
 * every lesson step with a short click, lower in pitch when the student steps back.
 */
export function RoomAudio() {
  const start = useAudioStore((s) => s.start)
  useEffect(() => {
    const onGesture = () => {
      void start()
    }
    window.addEventListener('pointerdown', onGesture, { once: true })
    window.addEventListener('keydown', onGesture, { once: true })
    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
    }
  }, [start])

  useEffect(
    () =>
      useLessonStore.subscribe((s, prev) => {
        if (s.index !== prev.index) useAudioStore.getState().click(s.index > prev.index ? 1 : 0.8)
      }),
    [],
  )
  return null
}
