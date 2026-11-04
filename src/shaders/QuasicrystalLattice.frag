// ————————————————————————————————————————————————————————————
//  Quasicrystal Lattice
//  An aperiodic (Penrose-like) tiling grown from the "fat lines"
//  trick, with no state and no textures.
//
//  A family of parallel stripes at angle θ is just a 1-D periodic
//  grid, and the distance to its nearest line is cheap:
//        d = |fract(dot(p, dir) / spacing + 0.5 + phase) - 0.5| * spacing
//
//  Union 5 such families with directions 36° apart (k·π/5). Because
//  a stripe family is bidirectional (θ ≡ θ+π), 5 families already
//  give a 10-fold dihedral structure: translation never repeats,
//  yet the rotational symmetry is exact — a quasicrystal. Its line
//  set traces the classic rhombus / star lattice of Penrose tilings.
//
//  Layered technique:
//    · 5-fold lattice  — nearest-family distance drives a crisp
//      line core, a soft halo bloom and a tight node sparkle that
//      fires only where two families cross (2nd-nearest ≈ 0).
//    · faceting        — the direction of the nearest family is
//      kept, so each edge is shaded against a fixed light like a
//      cut glass face; highlights sweep across as the tiling turns.
//    · 12-fold etching — 6 families 30° apart at a finer scale are
//      cut inside the cells, adding micro detail and depth.
//    · motion          — a slow global rotation plus an r² twist,
//      and per-family phase "breathing" so the lattice drifts and
//      morphs instead of merely spinning.
//    · atmosphere      — 4-octave FBM mottles the dark glass
//      interior, a radial bloom sits behind it all, and a filmic
//      rolloff + vignette close the frame.
// ————————————————————————————————————————————————————————————

uniform float iTime;
uniform vec3 iResolution;

const float TAU = 6.28318530718;

// ——— helpers ————————————————————————————————————————————————
mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

vec3 pal(float t) {
    return 0.5 + 0.5 * cos(TAU * (t + vec3(0.0, 0.33, 0.67)));
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

// Distance to the nearest line of a single stripe family.
float fatline(vec2 p, vec2 dir, float inv, float phase) {
    return abs(fract(dot(p, dir) * inv + 0.5 + phase) - 0.5) / inv;
}

// ——— 5-fold lattice (36° apart) — Penrose-like rhombi ————————
// Returns nearest distance, second-nearest distance and the
// direction of the family that owns the nearest line.
void qc5(vec2 p, float inv, float breathe, out float d1, out float d2, out vec2 g1) {
    d1 = 1e9;
    d2 = 1e9;
    g1 = vec2(1.0, 0.0);
    for (int k = 0; k < 5; k++) {
        float th = 3.14159265 * float(k) / 5.0;
        vec2 dir = vec2(cos(th), sin(th));
        float ph = breathe * sin(float(k) * 1.7);
        float d = fatline(p, dir, inv, ph);
        if (d < d1) {
            d2 = d1;
            d1 = d;
            g1 = dir;
        } else {
            d2 = min(d2, d);
        }
    }
}

// ——— 12-fold etching (30° apart) ————————————————————————————
void qc6(vec2 p, float inv, float breathe, out float d1, out float d2) {
    d1 = 1e9;
    d2 = 1e9;
    for (int k = 0; k < 6; k++) {
        float th = 3.14159265 * float(k) / 6.0;
        vec2 dir = vec2(cos(th), sin(th));
        float ph = breathe * sin(float(k) * 2.3 + 1.0);
        float d = fatline(p, dir, inv, ph);
        if (d < d1) {
            d2 = d1;
            d1 = d;
        } else {
            d2 = min(d2, d);
        }
    }
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    float t = iTime;
    float r = length(uv);

    // Slow global rotation with an r² twist -> the tiling swirls.
    vec2 p = rot(0.05 * t + 0.22 * r * r) * uv;

    // ——— main 5-fold lattice ————————————————————————————————
    float spacing = 0.34;
    float inv = 1.0 / spacing;
    float d1, d2;
    vec2 g1;
    qc5(p, inv, 0.05, d1, d2, g1);

    float w = 0.065 * spacing;                              // half line width

    float core = 1.0 - smoothstep(0.0, w, d1);              // crisp line
    float halo = 1.0 - smoothstep(0.0, w * 7.0, d1);        // soft bloom
    halo = halo * halo * halo;
    float node = 1.0 - smoothstep(0.0, w * 2.4, d2);        // 2-family crossings
    node = node * node * node * node;

    // Faceted glass shading: light the edge by its family direction.
    vec2 light = normalize(vec2(0.55, 0.83));
    float facet = 0.55 + 0.75 * dot(g1, light);

    // ——— finer 12-fold etching inside the cells ——————————————
    float etchSpacing = spacing * 0.52;
    float e1, e2;
    qc6(rot(-0.09 * t + 0.9) * p, 1.0 / etchSpacing, 0.06 * sin(t * 0.4), e1, e2);

    float we = 0.05 * etchSpacing;
    float etch = 1.0 - smoothstep(0.0, we, e1);
    float etchHalo = 1.0 - smoothstep(0.0, we * 8.0, e1);
    etchHalo = etchHalo * etchHalo * etchHalo;
    float etchNode = 1.0 - smoothstep(0.0, we * 2.4, e2);
    etchNode = etchNode * etchNode * etchNode * etchNode;

    // ——— colour ————————————————————————————————————————————
    float tex = fbm(p * 1.6 + vec2(0.0, 0.15 * t));
    vec3 base = mix(vec3(0.015, 0.018, 0.045), vec3(0.055, 0.035, 0.110), tex);

    float hue = 0.55 + 0.21 * sin(0.9 * p.x + 0.45 * t)
                     + 0.15 * cos(0.75 * p.y - 0.30 * t);
    vec3 edgeCol = pal(hue);
    vec3 etchCol = pal(hue + 0.42);

    vec3 col = base * (0.55 + 0.70 * tex);

    // Etching glows faintly and is suppressed under the bright edges.
    col += etchCol * (etch * 0.35 + etchHalo * 0.10 + etchNode * 0.60)
         * 0.85 * (1.0 - core * 0.6);

    // Main lattice: bloom + faceted core + white-hot crossings.
    col += edgeCol * halo * 0.50;
    col += edgeCol * core * 1.95 * facet;
    col += mix(edgeCol, vec3(1.0), 0.78) * node * 2.20;

    // Radial bloom behind the tiling, then vignette.
    col += pal(hue + 0.15) * 0.10 * exp(-r * r * 3.0);
    col *= 1.0 - 0.50 * smoothstep(0.75, 1.65, r);

    // Filmic rolloff + gentle gamma lift.
    col = col / (1.0 + col);
    col = pow(col, vec3(0.85));

    gl_FragColor = vec4(col, 1.0);
}
