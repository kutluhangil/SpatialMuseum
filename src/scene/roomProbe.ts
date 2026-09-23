import { Vector3, type Texture, type WebGLProgramParametersWithUniforms } from 'three'
import type { RoomDef } from '../schema/museum'

/**
 * A reflection probe: the room rendered once into a cube map from its middle, plus the room's box.
 * Reflective surfaces intersect their reflected ray with that box before looking the colour up
 * ("box projection"), so a window reflected in the floor lands under the window rather than
 * sliding around with the viewer, as a plain environment map would.
 *
 * The uniforms are shared objects: every material that reflects the room holds the same ones, so
 * a fresh capture shows everywhere at once.
 */
export type RoomProbe = {
  map: { value: Texture | null }
  centre: { value: Vector3 }
  boxMin: { value: Vector3 }
  boxMax: { value: Vector3 }
  /** 0 until the first capture: before it, the cube holds nothing worth reflecting. */
  ready: { value: number }
}

// Head height of a seated-to-standing student: the viewpoint the reflections are most right for.
export const PROBE_HEIGHT = 1.35

export function createRoomProbe(room: Pick<RoomDef, 'rect' | 'height'>): RoomProbe {
  const { x, z, width, depth } = room.rect
  return {
    map: { value: null },
    centre: { value: new Vector3(x + width / 2, PROBE_HEIGHT, z + depth / 2) },
    boxMin: { value: new Vector3(x, 0, z) },
    boxMax: { value: new Vector3(x + width, room.height, z + depth) },
    ready: { value: 0 },
  }
}

// One probe per room, so every reflective surface in it (the room's own, the classroom's
// furniture) shares the same capture.
const probes = new WeakMap<RoomDef, RoomProbe>()

export function roomProbe(room: RoomDef): RoomProbe {
  let probe = probes.get(room)
  if (!probe) {
    probe = createRoomProbe(room)
    probes.set(room, probe)
  }
  return probe
}

/** Points the probe at a cube map, or detaches it (null) until the next capture. */
export function attachProbe(probe: RoomProbe, map: Texture | null): void {
  probe.map.value = map
  probe.ready.value = 0
}

/** The cube now holds the room: reflective surfaces may start showing it. */
export function markProbeCaptured(probe: RoomProbe): void {
  probe.ready.value = 1
}

export type Reflective = {
  /** Reflectance straight on (Schlick's F0): about 0.04 for glass and glazed ceramic. */
  f0: number
  /** Overall scale on the reflection, for surfaces that are waxed or dirtier than the physics. */
  strength: number
  /** Mip level of the cube to read: 0 is a mirror, each level blurs by another factor of two. */
  lod: number
  /**
   * 'floor': the surface normal is straight up and needs no attribute.
   * 'mesh': the geometry's own normals (walls, glass).
   */
  normal: 'floor' | 'mesh'
  /**
   * 'opaque': the reflection replaces part of the surface colour.
   * 'glass': a transparent layer; the reflection adds coverage, so clear glass shows only it.
   */
  mode: 'opaque' | 'glass'
  /**
   * 'all': every face reflects. 'tops': only faces turned up (desk tops, seats); the vertical
   * faces of moulded furniture are matter than its tops and seen at grazing angles, where a full
   * Fresnel reflection of the white walls would bleach their colour.
   */
  faces?: 'all' | 'tops'
}

const VERTEX_PARS = 'varying vec3 vProbeWorld;\nvarying vec3 vProbeNormal;'
// A floor needs no normal attribute (and may not have one), so only mesh mode reads it.
function vertexMain(r: Reflective): string {
  const world = 'vProbeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;'
  return r.normal === 'mesh'
    ? `${world}\nvProbeNormal = normalize(mat3(modelMatrix) * normal);`
    : `${world}\nvProbeNormal = vec3(0.0, 1.0, 0.0);`
}

const FRAGMENT_PARS = `
varying vec3 vProbeWorld;
varying vec3 vProbeNormal;
uniform samplerCube probeMap;
uniform vec3 probeCentre;
uniform vec3 probeBoxMin;
uniform vec3 probeBoxMax;
uniform float probeReady;
uniform float probeF0;
uniform float probeStrength;
uniform float probeLod;
vec3 probeLookup(vec3 p, vec3 r) {
  vec3 wall = mix(probeBoxMin, probeBoxMax, step(0.0, r));
  vec3 t3 = (wall - p) / r;
  float t = min(min(t3.x, t3.y), t3.z);
  return textureLod(probeMap, p + r * max(t, 0.0) - probeCentre, probeLod).rgb;
}`

function fragmentMain(r: Reflective): string {
  const normal = r.normal === 'floor' ? 'vec3(0.0, 1.0, 0.0)' : 'normalize(vProbeNormal)'
  const blend =
    r.mode === 'glass'
      ? [
          'float probeCover = diffuseColor.a + probeF;',
          'outgoingLight = (outgoingLight * diffuseColor.a + probeEnv * probeF) / max(probeCover, 1e-4);',
          'diffuseColor.a = min(probeCover, 1.0);',
        ].join('\n')
      : 'outgoingLight = mix(outgoingLight, probeEnv, probeF);'
  return `
vec3 probeView = normalize(vProbeWorld - cameraPosition);
vec3 probeN = ${normal};
// Glass is seen from both sides; the normal that counts is the one facing the eye.
probeN = dot(probeN, probeView) > 0.0 ? -probeN : probeN;
float probeCos = clamp(dot(probeN, -probeView), 0.0, 1.0);
float probeF = probeReady * probeStrength * (probeF0 + (1.0 - probeF0) * pow(1.0 - probeCos, 5.0));
${r.faces === 'tops' ? 'probeF *= smoothstep(0.55, 0.95, probeN.y);' : ''}
vec3 probeEnv = probeLookup(vProbeWorld, reflect(probeView, probeN));
${blend}
#include <opaque_fragment>`
}

/**
 * onBeforeCompile for a MeshBasicMaterial that reflects the room. Unlit surfaces keep their baked
 * colour; the reflection is mixed in by a Fresnel term, strongest at grazing angles. Pair it with
 * `customProgramCacheKey={() => probeCacheKey(r)}`.
 */
export function probeReflection(probe: RoomProbe, r: Reflective) {
  return (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.probeMap = probe.map
    shader.uniforms.probeCentre = probe.centre
    shader.uniforms.probeBoxMin = probe.boxMin
    shader.uniforms.probeBoxMax = probe.boxMax
    shader.uniforms.probeReady = probe.ready
    shader.uniforms.probeF0 = { value: r.f0 }
    shader.uniforms.probeStrength = { value: r.strength }
    shader.uniforms.probeLod = { value: r.lod }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${vertexMain(r)}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <opaque_fragment>', fragmentMain(r))
    if (
      !shader.vertexShader.includes('vProbeWorld = ') ||
      !shader.fragmentShader.includes('probeLookup(vProbeWorld')
    ) {
      throw new Error(
        'probeReflection: MeshBasicMaterial shader chunks changed; the reflection could not be injected',
      )
    }
  }
}

/** Program cache key: materials that differ only in uniforms still need distinct programs per mode. */
export function probeCacheKey(r: Reflective): string {
  return `room-probe:${r.normal}:${r.mode}:${r.faces ?? 'all'}`
}
