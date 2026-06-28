// SpiralNebula — Procedural spiral galaxy with orbiting star particles
// Techniques: hash-based star field, logarithmic spiral arm density,
// FBM dust clouds, spectral cosine palette for core glow

uniform float iTime;
uniform vec3 iResolution;

// --- Hash / PRNG ---
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// --- Value noise for dust layers ---
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

// --- FBM — 5 octaves of rotating noise for nebula dust ---
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0 + vec2(100.0);
        a *= 0.5;
    }
    return v;
}

// --- Spectral palette (IQ cosine palette) ---
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.10, 0.20);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;

    // Slow overall rotation
    float t = iTime * 0.05;
    float ct = cos(t);
    float st = sin(t);
    vec2 ruv = mat2(ct, -st, st, ct) * uv;

    float r = length(ruv);
    float ang = atan(ruv.y, ruv.x);

    // --- Background: dark space with faint stars ---
    float bgStars = 0.0;
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 gp = ruv * (60.0 + fi * 40.0);
        vec2 gid = floor(gp);
        vec2 gf = fract(gp) - 0.5;
        float h = hash(gid + fi * 131.7);
        if (h > 0.97) {
            vec2 offset = vec2(hash(gid + 17.0) - 0.5, hash(gid + 31.0) - 0.5) * 0.6;
            float d = length(gf - offset);
            float twinkle = 0.6 + 0.4 * sin(iTime * (2.0 + h * 3.0) + h * 100.0);
            bgStars += (0.004 / (d * d + 0.001)) * twinkle * smoothstep(1.0, 0.8, h);
        }
    }
    vec3 col = vec3(0.01, 0.005, 0.02) + bgStars * vec3(0.7, 0.8, 1.0);

    // --- Spiral arm density ---
    // Logarithmic spiral: angle offset proportional to log(r)
    // Two main arms offset by pi
    float spiralWinding = 2.5; // tightness
    float armWidth = 0.6;
    float armDensity = 0.0;

    // 2 primary arms
    for (int arm = 0; arm < 2; arm++) {
        float armOffset = float(arm) * 3.14159;
        float spiralAngle = spiralWinding * log(r + 0.01) + armOffset;
        // Angular distance to spiral
        float da = mod(ang - spiralAngle + 3.14159, 6.28318) - 3.14159;
        // Width narrows toward center, widens outward
        float w = armWidth * (0.3 + 0.7 * smoothstep(0.0, 0.8, r));
        float density = exp(-da * da / (2.0 * w * w));
        // Radial falloff — bright core, fading edge
        float radial = exp(-r * 1.2) * smoothstep(0.0, 0.05, r);
        armDensity += density * radial;
    }

    // --- FBM dust modulated by spiral structure ---
    vec2 dustUV = ruv * 3.0 + vec2(fbm(ruv * 2.0 + iTime * 0.02) * 0.3);
    float dust = fbm(dustUV + iTime * 0.03);
    // Modulate dust by arm density so dust concentrates in arms
    float armDust = dust * armDensity * 2.5;

    // Color the dust/nebula layers
    // Inner: warm yellow-white core, mid: blue-cyan, outer: purple-red
    vec3 dustCol = palette(r * 0.8 + 0.15) * armDust;
    col += dustCol * 0.8;

    // --- Arm star particles ---
    // Grid of potential stars, placed only where armDensity is high
    float armStars = 0.0;
    for (int layer = 0; layer < 2; layer++) {
        float scale = 25.0 + float(layer) * 35.0;
        vec2 gp = ruv * scale;
        vec2 gid = floor(gp);
        vec2 gf = fract(gp) - 0.5;

        float h1 = hash(gid + float(layer) * 77.7);
        float h2 = hash(gid + float(layer) * 53.3);

        // Skip cells unlikely to be in an arm
        vec2 cellCenter = (gid + 0.5) / scale;
        float cellR = length(cellCenter);
        float cellAng = atan(cellCenter.y, cellCenter.x);
        float cellArms = 0.0;
        for (int a = 0; a < 2; a++) {
            float ao = float(a) * 3.14159;
            float sa = spiralWinding * log(cellR + 0.01) + ao;
            float cda = mod(cellAng - sa + 3.14159, 6.28318) - 3.14159;
            float cw = armWidth * (0.3 + 0.7 * smoothstep(0.0, 0.8, cellR));
            cellArms += exp(-cda * cda / (2.0 * cw * cw)) * exp(-cellR * 1.2);
        }

        if (h1 > 0.88 && cellArms > 0.15) {
            vec2 starOff = vec2(h2 - 0.5, hash(gid + 91.0) - 0.5) * 0.5;
            float d = length(gf - starOff);
            float twinkle = 0.7 + 0.3 * sin(iTime * (1.5 + h1 * 4.0) + h2 * 50.0);
            float brightness = (h1 - 0.88) / 0.12; // 0..1
            float starSize = mix(0.003, 0.012, brightness);
            armStars += (starSize / (d * d + starSize * 0.1)) * twinkle * cellArms;
        }
    }
    // Star colors — mostly warm white, some blue, some orange
    float starHue = hash(floor(ruv * 20.0) + 7.0);
    vec3 starCol = mix(
        vec3(1.0, 0.95, 0.85),  // warm white
        mix(vec3(0.6, 0.8, 1.0), vec3(1.0, 0.7, 0.4), starHue),
        0.3
    );
    col += armStars * starCol * 0.6;

    // --- Bright galactic core ---
    float coreGlow = exp(-r * 6.0) * 1.5;
    float coreFlicker = 1.0 + 0.05 * sin(iTime * 3.0);
    vec3 coreCol = mix(vec3(1.0, 0.9, 0.6), vec3(1.0, 0.6, 0.3), smoothstep(0.0, 0.15, r));
    col += coreGlow * coreCol * coreFlicker;

    // --- Subtle vignette ---
    float vig = 1.0 - 0.4 * dot(uv, uv);
    col *= vig;

    // --- Tone mapping (soft clamp) ---
    col = col / (1.0 + col * 0.5);
    // Gamma
    col = pow(col, vec3(0.9));

    gl_FragColor = vec4(col, 1.0);
}
