// SacredMandala.frag — Rotating mandala with layered sacred geometry
// Concentric rings of petals, seeds, and star polygons overlap
// with phase offsets, breathed by a slow pulse. Radial symmetry
// and rotational animation create a meditative, kaleidoscopic effect.

uniform float iTime;
uniform vec3 iResolution;

// Simple hash for pseudo-random variation per ring
float hash(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

// 2D rotation matrix
mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// Signed distance for a petal shape (elongated teardrop)
float petal(vec2 p, float w, float h) {
  p.x = abs(p.x);
  // Implicit curve: x^2 narrows toward tip
  float d = length(p * vec2(1.0 / max(w, 0.001), 1.0 / max(h, 0.001)));
  return smoothstep(1.0, 0.95, d);
}

// Star polygon: N points, sharpness control
float star(vec2 p, int n, float sharp) {
  float a = atan(p.y, p.x);
  float r = length(p);
  float seg = 6.28318 / float(n);
  float d = cos(floor(0.5 + a / seg) * seg - a) * r;
  return smoothstep(sharp + 0.02, sharp - 0.02, d);
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
  float t = iTime * 0.15;

  // Polar coordinates
  float r = length(uv);
  float a = atan(uv.y, uv.x);

  vec3 col = vec3(0.0);

  // Breathing pulse
  float pulse = 0.85 + 0.15 * sin(iTime * 0.5);

  // --- Ring layers: each at a different radius with unique symmetry ---
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float ringR = 0.12 + fi * 0.16; // radial position of ring
    float nSym = 4.0 + fi * 2.0;     // petals: 4,6,8,10,12,14
    float rotSpeed = (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0) * (0.3 + fi * 0.08);
    float rotAngle = t * rotSpeed + fi * 0.618;

    // Repeated angle within symmetry group
    float segA = 6.28318 / nSym;
    float repA = mod(a - rotAngle, segA) - segA * 0.5;

    // Radial profile: thin ring band
    float ringDist = abs(r - ringR * pulse);
    float band = smoothstep(0.025, 0.005, ringDist);

    // Petal shape within the angle slice
    vec2 local = vec2(repA, r - ringR * pulse);
    local *= rot(-rotAngle * 0.3);
    float pLen = 0.03 + fi * 0.004;
    float pWid = pLen * 0.35;
    float petalShape = petal(local, pWid, pLen);
    float petalMask = band * petalShape * (0.6 + 0.4 * sin(fi * 1.7 + iTime * 0.4));

    // Color: warm gold → cool violet gradient per ring
    float hue = fi * 0.12 + 0.08 * sin(iTime * 0.3 + fi);
    vec3 ringCol = 0.55 + 0.45 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));
    // Boost brightness for inner rings
    ringCol *= 1.0 + 0.3 * (1.0 - fi / 6.0);

    col += ringCol * petalMask;
  }

  // --- Radial spokes (dashed lines) ---
  int nSpokes = 12;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float spokeA = 6.28318 / 12.0 * fi + t * 0.1;
    float angleDist = abs(sin(a - spokeA));
    float spokeLine = smoothstep(0.04, 0.005, angleDist * r);
    // Dashes along the spoke
    float dash = smoothstep(0.5, 0.45, fract(r * 12.0 - iTime * 0.2));
    float spoke = spokeLine * dash;

    // Fading with distance
    spoke *= smoothstep(1.1, 0.15, r);

    vec3 spokeCol = vec3(0.9, 0.85, 0.7) * 0.3;
    col += spokeCol * spoke;
  }

  // --- Central star polygon ---
  {
    float starR = 0.08 + 0.01 * sin(iTime * 0.7);
    vec2 sp = uv * rot(t * 0.5);
    float s = star(sp, 6, starR);
    float fade = smoothstep(0.2, 0.0, r);
    vec3 starCol = vec3(1.0, 0.95, 0.85) * s * fade * 0.7;
    col += starCol;
  }

  // --- Outer star polygon (counter-rotating) ---
  {
    float starR2 = 0.3 + 0.02 * sin(iTime * 0.35);
    vec2 sp2 = uv * rot(-t * 0.3);
    float s2 = star(sp2, 12, starR2);
    float mask = smoothstep(0.35, 0.25, r) * smoothstep(0.1, 0.2, r);
    vec3 s2Col = vec3(0.7, 0.6, 0.9) * s2 * mask * 0.4;
    col += s2Col;
  }

  // --- Eye of Providence (concentric glowing rings at center) ---
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float eyeR = 0.015 + fi * 0.02;
    float eye = smoothstep(eyeR + 0.005, eyeR, r) - smoothstep(eyeR - 0.003, eyeR - 0.008, r);
    float pulse2 = 0.8 + 0.2 * sin(iTime * 1.0 + fi * 2.0);
    vec3 eyeCol = vec3(1.0, 0.9, 0.7) * eye * pulse2;
    col += eyeCol;
  }

  // --- Outer boundary circle ---
  float outerRing = smoothstep(0.005, 0.0, abs(r - 1.0 * pulse)) * 0.4;
  col += vec3(0.6, 0.55, 0.8) * outerRing;

  // --- Seed-of-life dot ring (tiny circles at vertices) ---
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float dotA = 6.28318 / 6.0 * fi + t * 0.2;
    vec2 dotPos = vec2(cos(dotA), sin(dotA)) * 0.35 * pulse;
    float dot = smoothstep(0.012, 0.006, length(uv - dotPos));
    col += vec3(0.95, 0.9, 0.75) * dot * 0.6;
  }

  // Vignette
  col *= 1.0 - 0.4 * smoothstep(0.6, 1.1, r);

  // Slight background glow
  col += vec3(0.02, 0.015, 0.03) * (1.0 - smoothstep(0.0, 1.1, r));

  gl_FragColor = vec4(col, 1.0);
}
