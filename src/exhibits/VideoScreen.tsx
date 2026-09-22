import { useState } from 'react'
import { useTexture } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { palette } from '../design/tokens'
import { useVideoElement } from '../media/useVideoElement'
import { videoManager } from '../media/VideoManager'

type Props = {
  src: string
  poster: string
  width: number
  aspect: number
  loop?: boolean
}

// A wall screen, not a poster: a dark bezel around the picture and a play mark over it until it
// runs, so it reads as something to press.
const BEZEL = 0.035
const PLAY_MARK = 0.13

/** A wall screen that shows its poster until first played; click toggles playback. */
export function VideoScreen({ src, poster, width, aspect, loop = false }: Props) {
  const { video, texture } = useVideoElement(src, loop)
  const posterTexture = useTexture(poster)
  const [started, setStarted] = useState(false)
  const height = width / aspect

  const toggle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (video.paused) {
      setStarted(true)
      videoManager
        .play(video)
        .catch((err: unknown) => console.error(`video play failed: ${src}`, err))
    } else {
      videoManager.pause(video)
    }
  }

  return (
    <group onClick={toggle}>
      <mesh position-z={-0.004}>
        <planeGeometry args={[width + BEZEL * 2, height + BEZEL * 2]} />
        <meshBasicMaterial color={palette.murekkep} />
      </mesh>
      <mesh>
        <planeGeometry args={[width, height]} />
        {/* Unlit and untone-mapped: the video should look exactly as encoded, not re-lit by the room. */}
        <meshBasicMaterial map={started ? texture : posterTexture} toneMapped={false} />
      </mesh>
      {!started && (
        // A dark triangle over the still: in a headset this is what says "press me".
        <mesh position-z={0.004} rotation-z={-Math.PI / 2}>
          <circleGeometry args={[PLAY_MARK, 3]} />
          <meshBasicMaterial color={palette.murekkep} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}
