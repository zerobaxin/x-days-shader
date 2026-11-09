// ————————————————————————————————————————————————————————————
//  Chladni Cymatics
//  Sound made visible: sand on a driven vibrating plate.
//
//  A square plate constrained at its centre, vibrating in a
//  resonant mode, is displaced by two crossed standing waves:
//
//      F(x,y) = cos(n·πx)·cos(m·πy) − cos(m·πx)·cos(n·πy)
//
//  Sand sprinkled on the plate is flung off the antinodes (where
//  |F| is large) and settles where the surface stands still — the
//  nodal lines F = 0 — tracing the classic Chladni figures. A
//  radial mode from a circular plate is superposed on top, so the
//  whole field is a genuine sum of standing waves.
//
//  Techniques
//    · nodal distance  — the quantity that drives everything is an
//      approximate true distance to the zero set, d ≈ |F| / |∇F|,
//      built from central differences of F. Normalising by the
//      gradient keeps the sand ridges a constant width everywhere,
//      even where the figure is dense.
//    · sand settling   — an exponential rolloff of d paints the
//      grain ridges; per-cell hash jitter makes them sparkle like
//      real lycopodium powder.
//    · relief light    — the same gradient doubles as a surface
//      normal, giving a fake bevel across each ridge plus a tight
//      specular sweep that slides over the pattern.
//    · morphing modes  — the two mode numbers drift continuously
//      (n, m and the radial k, q), so the plate glides smoothly
//      from one resonance to the next instead of hard-cutting, and
//      the sand appears to crawl and re-settle.
//    · atmosphere      — brushed-metal plate texture, a slow global
//      rotation, a radial bloom behind the ridges, filmic rolloff
//      and a vignette.
// ————————————————————————————————————————————————————————————

uniform float iTime;
uniform vec3 iResolution;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

// ——— helpers ————————————————————————————————————————————————
mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);
    p3 += dot(p3, vec3(p3.y, p3.z, p3.x) + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        s += a * vnoise(p);
        p = rot(0.7) * p * 2.03;
        a *= 0.5;
    }
    return s;
}

vec3 pal(float t) {
    return 0.5 + 0.5 * cos(TAU * (t + vec3(0.0, 0.33, 0.67)));
}

// ——— plate modes —————————————————————————————————————————————
// Square plate, centre-clamped: crossed standing waves. Zero set
// is the Chladni figure (Paul Bourke's classic form).
float squareMode(vec2 p, float n, float m) {
    return cos(n * PI * p.x) * cos(m * PI * p.y)
         - cos(m * PI * p.x) * cos(n * PI * p.y);
}

// Circular plate mode: concentric rings crossed with an angular
// standing wave (a cheap stand-in for the Bessel radial profile).
float radialMode(vec2 p, float k, float q) {
    float r = length(p);
    float a = atan(p.y, p.x);
    return sin(k * r) * cos(q * a);
}

// Full superposed displacement field, with all modes drifting.
float plateField(vec2 p, float t) {
    float n = 3.4 + 1.7 * sin(0.110 * t);
    float m = 6.3 + 1.9 * cos(0.130 * t + 1.3);
    float s1 = squareMode(p, n, m);

    float k = 7.5 + 2.0 * sin(0.070 * t + 0.4);
    float q = 5.0 + 1.0 * cos(0.090 * t + 0.6);
    float s2 = radialMode(p * 1.25, k, q);

    return s1 + 0.55 * s2;
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    float t = iTime;
    float r = length(uv);

    // Slow drift of the whole plate so the figure never sits still.
    vec2 p = rot(0.05 * t) * uv * 1.05;

    // ——— displacement field + gradient ————————————————————————
    float F = plateField(p, t);

    float e = 0.004;
    vec2 g = vec2(
        plateField(p + vec2(e, 0.0), t) - plateField(p - vec2(e, 0.0), t),
        plateField(p + vec2(0.0, e), t) - plateField(p - vec2(0.0, e), t)
    ) / (2.0 * e);

    float grad = length(g) + 1e-3;
    float nodeDist = abs(F) / grad;          // ≈ distance to nodal line

    // ——— sand ridges driven by nodal distance ————————————————
    float w = 0.017;                          // ridge half-width
    float core = exp(-pow(nodeDist / w, 1.7));
    float glow = exp(-nodeDist / (w * 5.5));

    // Grain jitter: per-cell hash gives the powder its sparkle.
    float dust = 0.70 + 0.55 * hash21(floor(uv * 235.0) + floor(t * 5.0));

    // ——— relief lighting from the field gradient ——————————————
    vec3 nrm = normalize(vec3(-g * 0.20, 1.0));
    vec3 L = normalize(vec3(0.45, 0.62, 0.65));
    float spec = pow(max(reflect(-L, nrm).z, 0.0), 42.0);

    // ——— brushed metal plate ——————————————————————————————————
    float tex = fbm(uv * 2.4 + vec2(0.0, 0.02 * t));
    float brush = 0.5 + 0.5 * sin(atan(uv.y, uv.x) * 120.0 + tex * 4.0);
    vec3 metal = mix(vec3(0.020, 0.024, 0.036),
                     vec3(0.070, 0.078, 0.105), tex);
    metal += vec3(0.012, 0.013, 0.018) * brush;

    // ——— colour ———————————————————————————————————————————————
    float hue = 0.55 + 0.20 * sin(0.30 * t) + 0.14 * r;
    vec3 glowCol = pal(hue);
    vec3 sandCol = mix(vec3(1.00, 0.87, 0.63), pal(0.10 + 0.12 * sin(0.23 * t)), 0.35);

    vec3 col = metal * (0.75 + 0.55 * tex);

    // Vibration bloom radiating from the centre of the plate.
    col += glowCol * 0.075 * exp(-r * r * 2.2);

    // Soft acoustic halo, then the brightly lit grain ridges.
    col += glowCol * glow * 0.42;
    col += sandCol * core * dust * 1.15;
    col += mix(sandCol, vec3(1.0), 0.5) * core * spec * 1.35;

    // Faint pick-up along steep slopes, so ridges read as raised.
    col += glowCol * clamp(grad * 0.022, 0.0, 0.12);

    // Vignette, filmic rolloff, gentle gamma lift.
    col *= 1.0 - 0.55 * smoothstep(0.78, 1.70, r);
    col = col / (1.0 + col);
    col = pow(col, vec3(0.88));

    gl_FragColor = vec4(col, 1.0);
}
