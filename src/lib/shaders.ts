// Shader loader: fragment shaders are loaded lazily, one chunk per file,
// instead of being statically bundled into the main JS chunk.
import vertexShader from '../shaders/vertex.vert'

const shaderLoaders = import.meta.glob('../shaders/*.frag', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>

const cache = new Map<string, string>()

const FALLBACK_SHADER = `
  uniform float iTime;
  uniform vec3 iResolution;
  uniform vec4 iMouse;

  void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0,2,4));
    gl_FragColor = vec4(col, 1.0);
  }
`

function assertShaderSource(name: string, source: string): string {
  if (source.includes('<!DOCTYPE html>') || source.includes('<html')) {
    throw new Error(`Invalid shader content for ${name}`)
  }
  return source
}

export const loadShader = async (shaderName: string): Promise<string> => {
  const cached = cache.get(shaderName)
  if (cached) return cached

  const loader = shaderLoaders[`../shaders/${shaderName}`]
  if (loader) {
    const source = assertShaderSource(shaderName, await loader())
    cache.set(shaderName, source)
    return source
  }

  // Fallback: fetch from the server (development, or a shader missing above)
  try {
    const response = await fetch(`/shaders/${shaderName}`)
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${response.statusText}`)
    }
    const source = assertShaderSource(shaderName, await response.text())
    cache.set(shaderName, source)
    return source
  } catch (error) {
    console.error(`Failed to load shader ${shaderName}:`, error)
    return FALLBACK_SHADER
  }
}

export { vertexShader }
