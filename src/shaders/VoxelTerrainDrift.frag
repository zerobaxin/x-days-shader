// VoxelTerrainDrift.frag
// ---------------------------------------------------------------------------
// A raymarched voxel landscape.
//
// Technique:
//   1. Heightfield  - a 3-octave value-noise FBM (drifting in time) is
//      quantised with floor() so terrain heights snap to integer "block"
//      layers. Each layer becomes a flat-topped voxel column.
//   2. Intersection - the camera ray is marched with a growing step size
//      (0.45 + 2.8% of distance) against max(height, waterLevel), then the
//      hit is polished with 7 bisection passes.
//   3. Water        - every column below y = 0 is flooded up to a flat water
//      plane, shaded with animated ripple normals, a sun specular highlight
//      and a fresnel sky reflection.
//   4. Shading      - normals come from finite differences of the *stepped*
//      height, which keeps the flat block top faces while beveling the
//      column edges. Albedo is banded by altitude (sand / grass / rock /
//      snow), tinted per-cell by a hash, and block outlines are darkened
//      along the cell borders. Fog, a cloud sky and a sun disc finish it.
//
// Everything is stateless and OpenGL ES 1.00 friendly (fixed loop bounds,
// gl_FragCoord / gl_FragColor).
// ---------------------------------------------------------------------------

uniform float iTime;
uniform vec3 iResolution;

#define TIME_PERIOD 1200.0

// ------------------------- hash / value noise ------------------------------
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Smooth value noise on a unit lattice.
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Three octaves are plenty for a blocky terrain silhouette.
float fbm3(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * vnoise(p);
    p = p * 2.07 + 19.3;
    a *= 0.5;
  }
  return s;
}

// ---------------------------- voxel heightfield ----------------------------
// Returns an INTEGER height (in voxel layers) for world position p.
float terrainHeight(vec2 p, float tw) {
  vec2 q = p * 0.055;
  // Slow drift of the noise domain: the landmass crawls while the camera flies.
  float base = fbm3(q + vec2(tw * 0.055, -tw * 0.040));
  float det = vnoise(q * 3.1 - vec2(tw * 0.030, tw * 0.050));
  float h = (base - 0.5) * 16.0 + (det - 0.5) * 3.0 + 2.0;
  // Quantise into discrete block layers -> stair-stepped voxel columns.
  return floor(h);
}

// Sky colour for a given ray direction (used for background + fog tint).
vec3 skyColor(vec3 rd, float tw) {
  float y = clamp(rd.y, -1.0, 1.0);
  vec3 zenith = vec3(0.16, 0.40, 0.78);
  vec3 horizon = vec3(0.84, 0.89, 0.97);
  vec3 col = mix(horizon, zenith, pow(clamp(y, 0.0, 1.0), 0.55));

  vec3 sunDir = normalize(vec3(0.45, 0.40, -0.80));
  float sd = max(dot(rd, sunDir), 0.0);
  col += vec3(1.00, 0.88, 0.62) * pow(sd, 320.0) * 1.8;   // sun disc
  col += vec3(1.00, 0.72, 0.42) * pow(sd, 11.0) * 0.22;   // warm glow

  // Flat cloud deck projected onto the dome, drifting with time.
  if (rd.y > 0.03) {
    vec2 cp = rd.xz / rd.y * 0.55 + vec2(tw * 0.22, tw * 0.08);
    float cl = fbm3(cp * 0.75);
    cl = smoothstep(0.46, 0.74, cl);
    // Thicker clouds get a grey underside.
    vec3 cloudCol = mix(vec3(0.86, 0.88, 0.93), vec3(1.0),
                        0.5 + 0.5 * smoothstep(0.5, 0.9, cl));
    col = mix(col, cloudCol, cl * 0.90);
  }
  return col;
}

void main() {
  // Screen space, y in [-1, 1], aspect corrected.
  vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;

  // Wrap time so coordinates never lose float precision on long runs.
  float tw = mod(iTime, TIME_PERIOD);
  float camZ = tw * 3.2;

  // Camera drifts forward and sways from side to side.
  float sway = sin(tw * 0.11);
  vec3 ro = vec3(sway * 7.0, 14.0 - sin(tw * 0.07) * 1.5, camZ);
  vec3 ta = vec3(sin(tw * 0.11 + 0.7) * 7.0, 6.5, camZ + 24.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.55 * fw);

  vec3 sunDir = normalize(vec3(0.45, 0.40, -0.80));

  // --------------------------- field intersection ---------------------------
  float maxDist = 118.0;
  float dist = 0.6;
  float hitT = -1.0;
  for (int i = 0; i < 150; i++) {
    vec3 p = ro + rd * dist;
    float h = terrainHeight(p.xz, tw);
    // Water floods every column whose block height is below sea level.
    float surface = max(h, 0.0);
    if (p.y < surface) {
      hitT = dist;
      break;
    }
    dist += 0.45 + 0.028 * dist;   // coarse far steps, fine near steps
    if (dist > maxDist) break;
  }

  vec3 col;

  if (hitT > 0.0) {
    // ------------------------------ refine hit ------------------------------
    float t0 = max(hitT - 1.2, 0.0);
    float t1 = hitT;
    for (int i = 0; i < 7; i++) {
      float tm = 0.5 * (t0 + t1);
      vec3 pm = ro + rd * tm;
      if (pm.y < max(terrainHeight(pm.xz, tw), 0.0)) t1 = tm; else t0 = tm;
    }
    float th = 0.5 * (t0 + t1);
    vec3 p = ro + rd * th;

    float hBlock = terrainHeight(p.xz, tw);
    bool isWater = (hBlock < 0.0) && (p.y >= hBlock);

    vec3 albedo;
    vec3 n;

    if (isWater) {
      // Animated ripple normal from three taps of cheap value noise.
      float e = 0.22;
      vec2 wp = p.xz * 0.55 + vec2(tw * 0.9, tw * 0.55);
      float c0 = vnoise(wp);
      float cx = vnoise(wp + vec2(e, 0.0));
      float cz = vnoise(wp + vec2(0.0, e));
      n = normalize(vec3((c0 - cx) * 0.55, 1.0, (c0 - cz) * 0.55));
      albedo = vec3(0.03, 0.16, 0.26);
    } else {
      // Normals from finite differences of the STEPPED height: flat tops stay
      // flat, column edges become slanted bevels.
      float e = 0.35;
      float hL = terrainHeight(p.xz - vec2(e, 0.0), tw);
      float hR = terrainHeight(p.xz + vec2(e, 0.0), tw);
      float hD = terrainHeight(p.xz - vec2(0.0, e), tw);
      float hU = terrainHeight(p.xz + vec2(0.0, e), tw);
      n = normalize(vec3(hL - hR, 2.0 * e, hD - hU));

      // Altitude bands: beach -> grass -> rock -> snow.
      vec2 cell = floor(p.xz);
      float rnd = hash21(cell);
      vec3 sand  = vec3(0.85, 0.78, 0.55);
      vec3 grass = mix(vec3(0.24, 0.47, 0.19), vec3(0.15, 0.35, 0.13), rnd);
      vec3 rock  = mix(vec3(0.44, 0.43, 0.46), vec3(0.31, 0.31, 0.34), rnd);
      vec3 snow  = vec3(0.90, 0.93, 0.98);

      albedo = mix(sand, grass, smoothstep(0.6, 2.4, hBlock));
      albedo = mix(albedo, rock, smoothstep(4.5, 6.5, hBlock));
      albedo = mix(albedo, snow, smoothstep(7.5, 9.5, hBlock));
      albedo *= 0.90 + 0.20 * hash21(cell * 1.37 + 0.41);

      // Darken the seams between blocks for a crisp voxel outline.
      vec2 g = abs(fract(p.xz) - 0.5);
      float edge = smoothstep(0.40, 0.50, max(g.x, g.y));
      albedo *= 1.0 - 0.22 * edge * clamp(n.y, 0.0, 1.0);
    }

    // ------------------------------- lighting -------------------------------
    vec3 skyCol = mix(vec3(0.62, 0.72, 0.90), vec3(0.20, 0.38, 0.68),
                      0.5 + 0.5 * n.y);
    float dif = max(dot(n, sunDir), 0.0);
    vec3 lit = albedo * (0.32 * skyCol + 0.90 * dif * vec3(1.0, 0.96, 0.86));

    if (isWater) {
      vec3 hv = normalize(sunDir - rd);
      float spec = pow(max(dot(n, hv), 0.0), 110.0);
      float fres = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
      lit = mix(lit, skyCol * 1.05, clamp(fres * 0.6, 0.0, 1.0));
      lit += vec3(1.0, 0.97, 0.88) * spec * 1.5;
    }

    // -------------------------------- fog -----------------------------------
    float fog = 1.0 - exp(-th * 0.020);
    fog = fog * fog * (3.0 - 2.0 * fog);
    col = mix(lit, skyColor(rd, tw), clamp(fog, 0.0, 1.0));
  } else {
    // No geometry: pure sky / clouds / sun.
    col = skyColor(rd, tw);
  }

  // Gentle contrast curve + vignette.
  col = pow(clamp(col, 0.0, 1.0), vec3(0.92));
  float vig = 1.0 - 0.22 * dot(uv, uv) * 0.35;
  col *= clamp(vig, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
