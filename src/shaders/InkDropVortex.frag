// InkDropVortex — Single-pass fluid simulation using curl noise advection.
// Multiple ink drops injected with curl-noise-driven velocity fields create
// swirling, organic ink-in-water patterns. HSV color coding per drop source
// with semi-Lagrangian advection and procedural vorticity confinement.

uniform float iTime;
uniform vec3 iResolution;

// Simple hash for pseudo-random values
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Smoothed value noise
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// FBM (6 octaves) for rich noise texture
float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8); // domain rotation reduces axis-aligned artifacts
    for (int i = 0; i < 6; i++) {
        v += a * vnoise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

// Curl of scalar noise field — produces divergence-free velocity (incompressible flow)
vec2 curlNoise(vec2 p, float t) {
    float e = 0.01;
    float n = fbm(p + vec2(t * 0.15, t * 0.08));
    float nx = fbm(p + vec2(e, 0.0) + vec2(t * 0.15, t * 0.08));
    float ny = fbm(p + vec2(0.0, e) + vec2(t * 0.15, t * 0.08));
    // ∂n/∂y, -∂n/∂x  (curl in 2D)
    return vec2(ny - n, -(nx - n)) / e;
}

// HSV to RGB conversion
vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = clamp(abs(fract(h + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
    return v * mix(vec3(1.0), c, s);
}

// Semi-Lagrangian advection: trace back along velocity field
vec2 advect(vec2 uv, float t) {
    vec2 p = uv * 3.0;
    vec2 vel = curlNoise(p, t) * 0.6;
    vel += curlNoise(p * 2.5, t * 0.7) * 0.25; // finer-scale curl for detail
    return uv + vel * 0.004; // trace-back distance
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;

    float t = iTime;

    // Advect UV back through the curl-noise velocity field
    vec2 uv1 = advect(uv, t);
    vec2 uv2 = advect(uv, t - 0.15);  // slightly older state for richer mixing
    vec2 uv3 = advect(uv, t - 0.35);  // even older for depth layering

    // === Drop injection sources (orbit + oscillate) ===
    // Each drop drifts in a circular orbit and breathes in/out
    float phase = t * 0.4;

    vec2 d1 = vec2(sin(phase * 0.7) * 0.55, cos(phase * 0.5) * 0.4);
    vec2 d2 = vec2(cos(phase * 0.6 + 2.0) * 0.5, sin(phase * 0.8 + 1.0) * 0.55);
    vec2 d3 = vec2(sin(phase * 0.9 + 4.0) * 0.45, cos(phase * 0.4 + 3.0) * 0.35);
    vec2 d4 = vec2(cos(phase * 0.5 + 5.5) * 0.65, sin(phase * 0.7 + 4.5) * 0.45);

    // Drop radii pulsate
    float r1 = 0.08 + 0.04 * sin(t * 1.2);
    float r2 = 0.09 + 0.035 * sin(t * 0.9 + 1.5);
    float r3 = 0.07 + 0.04 * sin(t * 1.5 + 3.0);
    float r4 = 0.06 + 0.03 * sin(t * 1.1 + 4.5);

    // Compute ink intensity for each drop at advected positions
    // Gaussian-falloff drops, advected to create stretched filaments
    float ink1 = exp(-length(uv1 - d1) * length(uv1 - d1) / (r1 * r1)) * 0.9;
    float ink2 = exp(-length(uv2 - d2) * length(uv2 - d2) / (r2 * r2)) * 0.85;
    float ink3 = exp(-length(uv3 - d3) * length(uv3 - d3) / (r3 * r3)) * 0.8;
    float ink4 = exp(-length(uv1 - d4) * length(uv1 - d4) / (r4 * r4)) * 0.75;

    // Assign each drop a distinct hue that slowly drifts
    vec3 c1 = hsv2rgb(0.0 + t * 0.02, 0.85, 1.0);          // warm red-orange
    vec3 c2 = hsv2rgb(0.58 + t * 0.015, 0.9, 1.0);          // blue-cyan
    vec3 c3 = hsv2rgb(0.33 + t * 0.018, 0.8, 0.95);         // green-teal
    vec3 c4 = hsv2rgb(0.78 + t * 0.012, 0.85, 0.9);         // violet-magenta

    // Accumulate ink color (additive blending simulates translucent dye mixing)
    vec3 col = vec3(0.0);
    col += ink1 * c1;
    col += ink2 * c2;
    col += ink3 * c3;
    col += ink4 * c4;

    // === Vorticity accent lines ===
    // Gradient magnitude of the velocity field creates fine streaks
    // where the shear is strongest, adding fine detail to the flow
    vec2 p = uv * 3.0;
    float e = 0.02;
    vec2 vel_r  = curlNoise(p + vec2(e, 0.0), t);
    vec2 vel_l  = curlNoise(p - vec2(e, 0.0), t);
    vec2 vel_u  = curlNoise(p + vec2(0.0, e), t);
    vec2 vel_d  = curlNoise(p - vec2(0.0, e), t);
    float curl_z = (vel_r.y - vel_l.y) / (2.0 * e) - (vel_u.x - vel_d.x) / (2.0 * e);
    float accent = smoothstep(0.8, 3.0, abs(curl_z)) * 0.15;
    col += accent * vec3(0.7, 0.85, 1.0) * (1.0 - smoothstep(0.8, 2.5, length(col)));

    // === Background ===
    // Subtle radial gradient from dark navy to black
    float bg = 1.0 - smoothstep(0.0, 1.8, length(uv));
    col += vec3(0.01, 0.015, 0.04) * bg;

    // Tone-map and add subtle vignette for focus
    col = 1.0 - exp(-col * 1.8); // filmic s-curve
    float vignette = 1.0 - dot(uv * 0.45, uv * 0.45);
    col *= smoothstep(0.0, 0.8, vignette);

    gl_FragColor = vec4(col, 1.0);
}
