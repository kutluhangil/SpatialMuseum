import {
  AddEquation,
  Color,
  CustomBlending,
  DstColorFactor,
  OneFactor,
  ShadowMaterial,
  Vector2,
  Vector3,
  Vector4,
  type WebGLProgramParametersWithUniforms,
} from 'three'
import type { RoomDef } from '../schema/museum'
import { wallFrame, wallPoint } from './wallFrame'
import { GLAZING_DEPTH, sunDirection, sunOpenings, sunWall } from './sun'
import { WINDOW } from './WallBuilder'

/** The shader handles this many sunlit windows; unused slots are empty openings. */
export const MAX_SUN_WINDOWS = 4

/**
 * Uniforms of the sunlight shader, shared by every surface the sun falls on: a blind moving
 * updates the floor and the furniture in one write.
 */
export type SunUniforms = {
  sunColor: { value: Color }
  sunDir: { value: Vector3 }
  sunOrigin: { value: Vector3 }
  sunNormal: { value: Vector3 }
  sunU: { value: Vector3 }
  sunWindows: { value: Vector4[] }
  sunBars: { value: Vector2[] }
  sunBar: { value: number }
}

export function createSunUniforms(room: RoomDef, colour: Color): SunUniforms | null {
  const dir = sunDirection(room)
  const wall = sunWall(room)
  if (!dir || !wall) return null
  const f = wallFrame(room, wall)
  const u = setSunCover(
    {
      sunColor: { value: colour },
      sunDir: { value: dir },
      sunOrigin: { value: new Vector3(...wallPoint(f, 0, 0, GLAZING_DEPTH)) },
      sunNormal: { value: new Vector3(...f.normal) },
      sunU: { value: new Vector3(...f.uDir) },
      sunWindows: { value: Array.from({ length: MAX_SUN_WINDOWS }, () => new Vector4()) },
      sunBars: { value: Array.from({ length: MAX_SUN_WINDOWS }, () => new Vector2()) },
      sunBar: { value: WINDOW.bar },
    },
    room,
    [],
  )
  return u
}

/** Writes each window's open part (below its blind) into the uniforms; returns them. */
export function setSunCover(
  u: SunUniforms,
  room: RoomDef,
  covered: readonly number[],
): SunUniforms {
  const openings = sunOpenings(room, covered)
  if (openings.length > MAX_SUN_WINDOWS) {
    throw new Error(
      `room "${room.id}" has ${openings.length} sunlit windows; the sun shader handles ${MAX_SUN_WINDOWS}`,
    )
  }
  u.sunWindows.value.forEach((w, i) => {
    const o = openings[i]
    if (o) w.set(o.u0, o.u1, o.v0, o.v1)
    else w.set(0, 0, 0, 0)
  })
  u.sunBars.value.forEach((b, i) => {
    const o = openings[i]
    b.set(o?.upright ?? 0, o?.transom ?? 0)
  })
  return u
}

const VERTEX_PARS = 'varying vec3 vSunWorld;\nvarying vec3 vSunNormal;'
const VERTEX_MAIN = [
  'vSunWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
  'vSunNormal = normalize(mat3(modelMatrix) * objectNormal);',
].join('\n')

const FRAGMENT_PARS = `
varying vec3 vSunWorld;
varying vec3 vSunNormal;
uniform vec3 sunColor;
uniform vec3 sunDir;
uniform vec3 sunOrigin;
uniform vec3 sunNormal;
uniform vec3 sunU;
uniform vec4 sunWindows[${MAX_SUN_WINDOWS}];
uniform vec2 sunBars[${MAX_SUN_WINDOWS}];
uniform float sunBar;
float sunSpan(float x, float a, float b, float soft) {
  return smoothstep(a - soft, a + soft, x) * (1.0 - smoothstep(b - soft, b + soft, x));
}`

// Follows each fragment back up the sunbeam to the glazing, and asks whether that point is glass
// (lit), a glazing bar, wall or blind (dark). The edge softens with the distance travelled: the
// sun is a disc, not a point, and the sky around it blurs the edge further.
const FRAGMENT_MAIN = `
float sunFacing = max(dot(normalize(vSunNormal), -sunDir), 0.0);
float sunT = dot(sunOrigin - vSunWorld, sunNormal) / dot(-sunDir, sunNormal);
vec3 sunAt = vSunWorld - sunDir * sunT;
float sunUAt = dot(sunAt - sunOrigin, sunU);
float soft = 0.012 + 0.018 * sunT;
float sunOpen = 0.0;
for (int i = 0; i < ${MAX_SUN_WINDOWS}; i++) {
  vec4 w = sunWindows[i];
  float pane = sunSpan(sunUAt, w.x, w.y, soft) * sunSpan(sunAt.y, w.z, w.w, soft);
  float bars = max(
    sunSpan(sunUAt, sunBars[i].x - sunBar * 0.5, sunBars[i].x + sunBar * 0.5, soft),
    sunSpan(sunAt.y, sunBars[i].y - sunBar * 0.5, sunBars[i].y + sunBar * 0.5, soft)
  );
  sunOpen += pane * (1.0 - bars);
}
gl_FragColor = vec4(sunColor * sunFacing * min(sunOpen, 1.0) * step(0.0, sunT) * getShadowMask(), 1.0);`

const SHADOW_OUT = 'gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );'

/**
 * Sunlight as a second pass over a surface that is already drawn: where the beam through a window
 * reaches it and nothing (a desk, a chair) stands in the way, the surface's own colour is scaled
 * up by the sun (result = surface × (1 + sun)). Multiplying rather than adding keeps a blue chair
 * blue and the tile pattern visible in the light, where an added colour would wash both out.
 * Built on ShadowMaterial for its access to the sun's shadow map; the mesh must `receiveShadow`.
 */
export function createSunMaterial(uniforms: SunUniforms): ShadowMaterial {
  const m = new ShadowMaterial({ transparent: true, depthWrite: false })
  m.blending = CustomBlending
  m.blendEquation = AddEquation
  m.blendSrc = DstColorFactor
  m.blendDst = OneFactor
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${VERTEX_MAIN}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace(SHADOW_OUT, FRAGMENT_MAIN)
    if (
      !shader.vertexShader.includes('vSunWorld = ') ||
      !shader.fragmentShader.includes('sunOpen +=')
    ) {
      throw new Error(
        'createSunMaterial: ShadowMaterial shader chunks changed; the sunlight could not be injected',
      )
    }
  }
  m.customProgramCacheKey = () => 'room-sunlight'
  return m
}
