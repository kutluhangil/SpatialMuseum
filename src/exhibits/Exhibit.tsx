import { Suspense } from 'react'
import type { ExhibitDef, RoomDef } from '../schema/museum'
import { exhibitHeight } from '../schema/museum'
import { wallFrame, wallPoint, wallYaw } from '../scene/wallFrame'
import { mediaUrl } from '../media/mediaUrl'
import { VideoScreen } from './VideoScreen'
import { ImageExhibit } from './ImageExhibit'
import { TextPanel } from './TextPanel'
import { Label } from './Label'
import { frameBorder } from './frameSpec'

/** Places one exhibit on its wall and draws it by type. */
export function Exhibit({
  exhibit,
  room,
  detail,
}: {
  exhibit: ExhibitDef
  room: RoomDef
  /** 'far': seen only through two doorways; placards and panel text are unreadable, so skipped. */
  detail: 'full' | 'far'
}) {
  const p = exhibit.placement
  const frame = wallFrame(room, p.wall)
  const position = wallPoint(frame, p.u, p.v, p.depthOffset)
  return (
    <group name={`exhibit:${exhibit.id}`} position={position} rotation-y={wallYaw(frame)}>
      <Suspense fallback={null}>
        {exhibit.type === 'video' && (
          <VideoScreen
            src={mediaUrl(exhibit.src)}
            poster={mediaUrl(exhibit.poster)}
            width={p.width}
            aspect={exhibit.aspect}
            loop={exhibit.loop}
          />
        )}
        {exhibit.type === 'image' && <ImageExhibit exhibit={exhibit} />}
        {exhibit.type === 'text' && <TextPanel exhibit={exhibit} withText={detail === 'full'} />}
        {detail === 'full' && exhibit.label && (
          <Label
            label={exhibit.label}
            width={p.width + frameBorder(exhibit) * 2}
            exhibitHeight={exhibitHeight(exhibit) + frameBorder(exhibit) * 2}
          />
        )}
      </Suspense>
    </group>
  )
}
