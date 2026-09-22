import { useState } from 'react'
import { useTexture } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useVideoElement } from '../media/useVideoElement'
import { videoManager } from '../media/VideoManager'

type Props = {
  src: string
  poster: string
  width: number
  aspect: number
  loop?: boolean
}

/** A flat video surface that shows its poster until first played; click toggles playback. */
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
    <mesh onClick={toggle}>
      <planeGeometry args={[width, height]} />
      {/* Unlit and untone-mapped: the video should look exactly as encoded, not re-lit by the room. */}
      <meshBasicMaterial map={started ? texture : posterTexture} toneMapped={false} />
    </mesh>
  )
}
