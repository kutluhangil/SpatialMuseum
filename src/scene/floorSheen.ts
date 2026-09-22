import { Color, type WebGLProgramParametersWithUniforms } from 'three'

/**
 * Polished-tile sheen for an unlit floor: a Fresnel term that brightens the floor towards grazing
 * angles, the way glazed ceramic reflects the room far ahead of you but not at your feet. It is a
 * few ALU ops per pixel, where a real planar reflection would draw the whole room twice (four times
 * in VR). Assumes a horizontal floor (normal +Y).
 */
export function floorSheen(color: string, strength: number) {
  const sheenColor = new Color(color).multiplyScalar(strength)
  return (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.sheenColor = { value: sheenColor }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSheenWorld;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvSheenWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vSheenWorld;\nuniform vec3 sheenColor;',
      )
      .replace(
        '#include <opaque_fragment>',
        [
          'vec3 sheenView = normalize(cameraPosition - vSheenWorld);',
          'outgoingLight += sheenColor * pow(1.0 - clamp(sheenView.y, 0.0, 1.0), 4.0);',
          '#include <opaque_fragment>',
        ].join('\n'),
      )
    if (
      !shader.vertexShader.includes('vSheenWorld = ') ||
      !shader.fragmentShader.includes('sheenColor * pow')
    ) {
      throw new Error(
        'floorSheen: MeshBasicMaterial shader chunks changed; the sheen could not be injected',
      )
    }
  }
}
