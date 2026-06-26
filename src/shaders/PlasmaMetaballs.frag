// PlasmaMetaballs.frag — Spectral plasma metaballs
// Overlapping distance-field blobs oscillate in Lissajous paths.
// The soft-minimum of their distances is mapped to a spectral palette
// inspired by the classic plasma demo, with phase-shifted layering
// to produce vivid rainbow fringes where blobs merge.

uniform float iTime;
uniform vec3 iResolution;

// Value noise — integer hash + smoothstep interpolation
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Spectral palette — cycles through vivid hues
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
}

// Soft min — smooth union of distance fields
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    float t = iTime;

    // 7 blob centres on Lissajous orbits — each with unique frequency ratios
    float d = 100.0; // start large

    d = smin(d, length(uv - vec2(
        0.70 * sin(t * 0.37 + 0.0),
        0.50 * cos(t * 0.53 + 0.0)
    )) - 0.55, 0.6);

    d = smin(d, length(uv - vec2(
        0.65 * sin(t * 0.41 + 1.2),
        0.45 * cos(t * 0.67 + 1.2)
    )) - 0.50, 0.6);

    d = smin(d, length(uv - vec2(
        0.55 * sin(t * 0.29 + 2.4),
        0.70 * cos(t * 0.47 + 2.4)
    )) - 0.45, 0.6);

    d = smin(d, length(uv - vec2(
        0.50 * sin(t * 0.61 + 3.6),
        0.60 * cos(t * 0.31 + 3.6)
    )) - 0.40, 0.6);

    d = smin(d, length(uv - vec2(
        0.75 * sin(t * 0.23 + 4.8),
        0.35 * cos(t * 0.59 + 4.8)
    )) - 0.48, 0.6);

    d = smin(d, length(uv - vec2(
        0.40 * sin(t * 0.51 + 6.0),
        0.80 * cos(t * 0.27 + 6.0)
    )) - 0.38, 0.6);

    d = smin(d, length(uv - vec2(
        0.60 * sin(t * 0.43 + 7.2),
        0.55 * cos(t * 0.37 + 7.2)
    )) - 0.52, 0.6);

    // Primary plasma signal from metaball distance
    float p1 = d;

    // Secondary high-frequency noise layer for fine detail
    float n = vnoise(uv * 3.0 + t * 0.15);
    float p2 = p1 + 0.12 * sin(n * 6.28 + t * 0.5);

    // Tertiary radial pulse for breathing glow
    float pulse = 0.08 * sin(length(uv) * 4.0 - t * 1.2);

    // Final combined signal
    float signal = p2 + pulse;

    // Map to spectral colours — two palette layers offset in phase
    vec3 col = palette(signal * 0.8 + t * 0.08);
    col += 0.25 * palette(signal * 1.4 + t * 0.12 + 0.5);

    // Boost brightness inside blobs (where d < 0)
    float interior = smoothstep(0.05, -0.3, d);
    col += interior * 0.2;

    // Darken deep background outside blobs
    float outside = smoothstep(0.0, 0.8, d);
    col *= 1.0 - 0.4 * outside * outside;

    // Vignette
    float vig = 1.0 - 0.35 * dot(uv * 0.5, uv * 0.5);
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
}
