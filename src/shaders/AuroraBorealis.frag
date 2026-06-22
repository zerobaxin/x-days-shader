// Aurora Borealis — procedurally animated northern lights
// Uses layered FBM sine curtains with vertical fade and
// spectral colour mapping to simulate shimmering aurora bands.

uniform float iTime;
uniform vec3 iResolution;

// Hash-based 2D value noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion — 5 octaves
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8); // slight rotation per octave
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

// Map height → aurora spectral colour (green → cyan → magenta → violet)
vec3 auroraSpectrum(float h) {
  vec3 green  = vec3(0.1, 0.9, 0.3);
  vec3 cyan   = vec3(0.1, 0.7, 0.8);
  vec3 pink   = vec3(0.8, 0.2, 0.7);
  vec3 violet = vec3(0.4, 0.1, 0.7);
  if (h < 0.33) return mix(green, cyan, h / 0.33);
  if (h < 0.66) return mix(cyan, pink, (h - 0.33) / 0.33);
  return mix(pink, violet, (h - 0.66) / 0.34);
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
  float t = iTime * 0.15;

  // Shift UV so aurora appears in upper sky region
  vec2 p = uv + vec2(0.0, 0.6);

  // Three curtain layers at different scales and speeds
  float intensity = 0.0;
  vec3 col = vec3(0.0);

  // Layer 1 — wide slow curtain
  float n1 = fbm(vec2(p.x * 1.2 + t * 0.7, p.y * 0.8 + t * 0.2));
  float curtain1 = smoothstep(0.25, 0.7, n1);
  float fade1 = smoothstep(-0.2, 0.5, p.y) * smoothstep(1.4, 0.5, p.y);
  float h1 = fbm(vec2(p.x * 0.5 - t * 0.3, t * 0.2));
  col += auroraSpectrum(h1) * curtain1 * fade1 * 0.6;

  // Layer 2 — finer faster curtain
  float n2 = fbm(vec2(p.x * 2.5 + t * 1.1, p.y * 1.2 - t * 0.15));
  float curtain2 = smoothstep(0.3, 0.75, n2);
  float fade2 = smoothstep(0.0, 0.7, p.y) * smoothstep(1.6, 0.7, p.y);
  float h2 = fbm(vec2(p.x * 0.8 + t * 0.4, t * 0.15 + 3.0));
  col += auroraSpectrum(h2 + 0.2) * curtain2 * fade2 * 0.35;

  // Layer 3 — subtle wide glow
  float n3 = fbm(vec2(p.x * 0.6 - t * 0.5, p.y * 0.5 + t * 0.1 + 7.0));
  float curtain3 = smoothstep(0.35, 0.8, n3);
  float fade3 = smoothstep(-0.1, 0.8, p.y) * smoothstep(1.3, 0.6, p.y);
  col += auroraSpectrum(h2 + 0.5) * curtain3 * fade3 * 0.2;

  // Shimmer — high-frequency vertical streaks
  float shimmer = noise(vec2(p.x * 18.0 + t * 4.0, p.y * 3.0));
  shimmer = smoothstep(0.4, 0.8, shimmer) * fade1;
  col += vec3(0.15, 0.3, 0.2) * shimmer * 0.25;

  // Dark night sky background
  vec3 sky = mix(vec3(0.0, 0.01, 0.04), vec3(0.0, 0.0, 0.02), uv.y * 0.5 + 0.5);

  // Subtle star field
  vec2 starUV = gl_FragCoord.xy / 2.0;
  float star = hash(floor(starUV));
  star = smoothstep(0.985, 0.995, star) * (0.5 + 0.5 * sin(iTime * 1.5 + star * 50.0));
  star *= smoothstep(-0.3, -0.05, uv.y); // only above horizon
  sky += vec3(star * 0.8);

  // Horizon glow
  float horizonGlow = exp(-abs(uv.y + 0.8) * 3.0) * 0.12;
  sky += vec3(0.04, 0.06, 0.12) * horizonGlow;

  vec3 finalCol = sky + col;

  // Slight tone curve for richness
  finalCol = pow(finalCol, vec3(0.95));

  gl_FragColor = vec4(finalCol, 1.0);
}
