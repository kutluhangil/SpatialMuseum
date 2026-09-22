import { useEffect } from 'react'
import { Text } from '@react-three/drei'
import type { LessonVideoDef } from '../schema/museum'
import type { ScreenContent } from './lesson'
import type { WallArea } from '../classroom/layout'
import { palette } from '../design/tokens'
import { fontUrls, textSizes } from '../design/typography'
import { mediaUrl } from '../media/mediaUrl'
import { useVideoElement } from '../media/useVideoElement'
import { videoManager } from '../media/VideoManager'
import { BOARD_VIEW_DISTANCE } from './Whiteboard'

/** Plays while mounted: a lesson video starts when its step comes up and stops when it leaves. */
function ScreenVideo({ step, width }: { step: LessonVideoDef; width: number }) {
  const { video, texture } = useVideoElement(mediaUrl(step.src), step.loop)
  useEffect(() => {
    videoManager.play(video).catch((err: unknown) => {
      // Our own cleanup pausing a pending play() (step changed, or StrictMode's remount) is not a failure.
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error(`lesson video "${step.id}" failed to play (${step.src})`, err)
    })
    return () => videoManager.pause(video)
  }, [video, step.id, step.src])
  const w = Math.min(width, 2 * step.aspect * 0.95)
  return (
    <mesh>
      <planeGeometry args={[w, w / step.aspect]} />
      {/* Unlit and untone-mapped: the video should look exactly as encoded. */}
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

/** The projection screen: the current video, or the section's title slide between videos. */
export function ProjectionScreen({
  area,
  content,
  title,
}: {
  area: WallArea
  content: ScreenContent
  title: string
}) {
  const width = area.u1 - area.u0
  const size = textSizes(BOARD_VIEW_DISTANCE)
  if (content.kind === 'video')
    return <ScreenVideo key={content.step.id} step={content.step} width={width} />
  return (
    <group>
      <Text
        font={fontUrls.bold}
        fontSize={size.title}
        color={palette.murekkep}
        anchorY="bottom"
        maxWidth={width - 0.3}
        textAlign="center"
      >
        {content.section.title.tr}
      </Text>
      <mesh position-y={-0.08}>
        <planeGeometry args={[0.6, 0.02]} />
        <meshBasicMaterial color={palette.kolostrum} />
      </mesh>
      <Text
        font={fontUrls.regular}
        fontSize={size.body}
        color={palette.murekkep}
        anchorY="top"
        position-y={-0.16}
      >
        {title}
      </Text>
    </group>
  )
}
