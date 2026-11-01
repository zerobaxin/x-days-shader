uniform float iTime;
uniform vec3 iResolution;

// ===========================================================================
//  Curl Fluid Currents  (XDS059)
//
//  A stateless fluid-dye lookalike - no simulation buffers required:
//
//  1. VELOCITY FIELD: the flow is the curl of a smooth scalar potential built
//     from a few sinusoidal vortices plus a slow global swirl. Taking the curl
//     makes the field divergence-free, so it reads as incompressible fluid
//     rather than a random wobble. Cost: 5 cos() per evaluation.
//  2. ADVECTION: the pixel coordinate is pushed *backwards* along the flow in
//     ~22 Euler steps, each evaluated at an earlier time. The result is the
//     streamline the dye travelled along - motion blur for free.
//  3. DYE: high-frequency sinusoidal bands sampled at the advected coordinate
//     are stretched and sheared by the flow itself, giving the long thin ink
//     filaments of stirred paint. Two crossed band sets make a woven marble
//     lattice, and one cheap FBM pass adds micro turbulence.
//  4. LOOK: a spectral cosine palette maps dye density to colour, stretched
//     filament cores get an additive cyan-white glow, and a vignette frames it.
// ===========================================================================

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
}

// smooth value noise
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

float fbm(vec2 p) {
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        s += a * vnoise(p);
        p = rot * p * 2.03 + 7.31;
        a *= 0.5;
    }
    return s;
}

// Divergence-free velocity: v = curl(psi), psi = sum of sinusoidal vortices.
vec2 flow(vec2 p, float t) {
    vec2 k0 = vec2(1.00, 0.35);  float a0 = 1.10;  float w0 = 0.55;
    vec2 k1 = vec2(-0.45, 1.25); float a1 = 0.80;  float w1 = -0.42;
    vec2 k2 = vec2(1.70, -1.10); float a2 = 0.45;  float w2 = 0.78;

    float c0 = a0 * cos(dot(p, k0) + w0 * t);
    float c1 = a1 * cos(dot(p, k1) + w1 * t);
    float c2 = a2 * cos(dot(p, k2) + w2 * t);

    // (dpsi/dy, -dpsi/dx)
    vec2 v = c0 * vec2(k0.y, -k0.x)
           + c1 * vec2(k1.y, -k1.x)
           + c2 * vec2(k2.y, -k2.x);

    // slow global swirl, also divergence-free
    v += 0.16 * vec2(-p.y, p.x);

    return v;
}

vec3 palette(float x) {
    return 0.5 + 0.5 * cos(6.28318 * (vec3(0.00, 0.33, 0.67) + x));
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    float t = iTime;

    // ---- backward advection: trace the streamline -------------------------
    vec2 p = uv;
    float streak = 0.0;
    float curlAmt = 0.0;
    const int STEPS = 22;
    const float DT = 0.030;
    for (int i = 0; i < STEPS; i++) {
        float fi = float(i);
        float w = 1.0 - fi / float(STEPS);          // older steps fade out
        vec2 v = flow(p, t - fi * 0.055);           // sample the past
        p -= v * DT;                                // step against the flow
        streak += w * length(v);
        curlAmt += w * (v.x * v.y);                 // signed shear -> hue drift
    }
    streak /= float(STEPS);
    curlAmt /= float(STEPS);

    // ---- dye: crossed bands stretched by the flow -------------------------
    float b1 = 0.5 + 0.5 * sin(p.y * 5.5 + 3.1 * streak + t * 0.70);
    float b2 = 0.5 + 0.5 * sin(p.x * 4.2 - 2.4 * streak - t * 0.50 + 1.7);
    float bands = b1 * b2;

    // sharpen the band ridges so thin bright filaments emerge
    float core = pow(max(b1, b2), 8.0);

    // micro turbulence, carried along by the same flow
    float turb = fbm(p * 2.1 + vec2(0.0, t * 0.06) + 0.5 * streak);

    float dye = clamp(bands * 0.75 + turb * 0.55 + 0.18 * core, 0.0, 1.0);

    // ---- shading ----------------------------------------------------------
    vec3 col = vec3(0.015, 0.028, 0.075);           // deep water

    float hue = 0.30 + 0.55 * dye + 0.28 * curlAmt + 0.10 * length(uv);
    vec3 dyeCol = palette(hue);
    col += dyeCol * pow(dye, 1.35) * 1.15;

    // glowing filament cores
    col += vec3(0.55, 0.85, 1.00) * core * (0.35 + 0.45 * streak);

    // streamline haze: brightness follows the local current speed
    col += vec3(0.10, 0.22, 0.45) * (streak * 0.55 + 0.05);

    // soft bloom lift in the densest dye regions
    col += dyeCol * smoothstep(0.75, 1.0, dye) * 0.35;

    // vignette + gentle contrast curve
    col *= 1.0 - 0.34 * dot(uv, uv);
    col = pow(clamp(col, 0.0, 1.0), vec3(0.92));

    gl_FragColor = vec4(col, 1.0);
}
