// Kaleidoscopic Dream Mirror
// Multi-fold rotational symmetry created by repeatedly folding UV space,
// then filling the mirrored domain with FBM noise and domain warping.
// Each kaleidoscope ring rotates at a different speed, and a spectral
// cosine palette maps the noise values to shifting iridescent colour.

uniform float iTime;
uniform vec3 iResolution;

// ——— Hash & noise (Ashima Arts style) ———
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

// ——— FBM ———
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

// ——— Spectral cosine palette ———
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    float t = iTime * 0.15;

    // Polar coords
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    // --- Kaleidoscope fold 1: 6-fold symmetry ---
    float segments1 = 6.0;
    float segAngle1 = 6.28318 / segments1;
    a = mod(a, segAngle1);
    a = abs(a - segAngle1 * 0.5); // mirror within segment

    // --- Kaleidoscope fold 2: inner 8-fold ring ---
    float segments2 = 8.0;
    float segAngle2 = 6.28318 / segments2;
    float a2 = atan(uv.y, uv.x) + t * 0.5;
    a2 = mod(a2, segAngle2);
    a2 = abs(a2 - segAngle2 * 0.5);

    // Blend the two kaleidoscope symmetries based on radius
    float blend = smoothstep(0.3, 0.8, r);
    float angle = mix(a2, a, blend);

    // Reconstruct UV from folded polar coords
    vec2 p = vec2(cos(angle), sin(angle)) * r;

    // Slow global rotation
    float cs = cos(t * 0.3);
    float sn = sin(t * 0.3);
    p = mat2(cs, -sn, sn, cs) * p;

    // --- Domain warping (2 passes of FBM) ---
    vec2 q = vec2(
        fbm(p + vec2(0.0, 0.0) + t * 0.4),
        fbm(p + vec2(5.2, 1.3) + t * 0.3)
    );
    vec2 q2 = vec2(
        fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.15),
        fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.12)
    );
    float f = fbm(p + 4.0 * q2);

    // Colour from palette, driven by warped noise
    vec3 col = palette(f * 1.2 + t * 0.2 + r * 0.3);

    // Brightness boost in high-noise areas
    col *= 0.7 + 0.3 * f;

    // Add luminous accent along kaleidoscope edges
    // Edge detection: derivative of the folded angle
    float edgeRim = 1.0 - smoothstep(0.0, 0.005, abs(angle - segAngle1 * 0.5) + 0.001 * r);
    edgeRim *= 1.0 - blend; // only in inner region (fold 2)
    float edgeRim2 = 1.0 - smoothstep(0.0, 0.005, abs(a - segAngle1 * 0.5) + 0.001 * r);
    edgeRim2 *= blend;
    col += (edgeRim + edgeRim2) * 0.35 * vec3(0.9, 0.95, 1.0);

    // Radial vignette
    col *= 1.0 - 0.4 * r * r;

    // Gamma correction
    col = pow(col, vec3(0.9));

    gl_FragColor = vec4(col, 1.0);
}
