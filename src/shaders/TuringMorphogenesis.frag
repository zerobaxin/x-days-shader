// TuringMorphogenesis.frag
// Stateless approximation of Gray-Scott reaction-diffusion (Turing patterns).
// True RD requires ping-pong buffers; instead we band-pass filter
// multi-octave FBM noise at different spatial scales, then combine
// with Laplacian-style derivatives to mimic the activator-inhibitor
// activator field that produces spots, stripes and labyrinths.
// Parameters drift over time so the pattern morphs between regimes.

uniform float iTime;
uniform vec3 iResolution;

// --- Noise utilities (value noise + FBM) ---
float hash21(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// FBM with rotating offsets for organic motion
float fbm(vec2 p, float t) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(t * 0.1), sin(t * 0.1), -sin(t * 0.1), cos(t * 0.1));
    for (int i = 0; i < 6; i++) {
        v += a * vnoise(p);
        p = rot * p * 2.0 + vec2(1.7, 9.2);
        a *= 0.5;
    }
    return v;
}

// --- Band-pass filter: highpass = signal - lowpass, bandpass = smooth(highpass) ---
// Approximates the scale-selective response in Turing's model
float bandpass(vec2 p, float scale, float t) {
    float fine  = fbm(p * scale, t);
    float coarse = fbm(p * scale * 0.5, t);
    // Laplacian-like: detect where fine exceeds coarse (activator > inhibitor)
    return fine - coarse * 1.1;
}

// Cosine palette for spectral colouring
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    float t = iTime;

    // Slowly drifting domain warping for organic morphing
    vec2 p = uv;
    p += 0.15 * vec2(
        fbm(uv * 1.3 + 0.1 * t, t),
        fbm(uv * 1.3 + vec2(5.2, 1.3) + 0.1 * t, t)
    );

    // --- Three bandpass scales: spots, stripes, labyrinths ---
    // The scale ratio and threshold mimic feed/kill rates in Gray-Scott
    float bp1 = bandpass(p, 8.0, t);   // medium – stripes/labyrinth
    float bp2 = bandpass(p, 16.0, t);  // fine – spots regime
    float bp3 = bandpass(p, 3.5, t);   // coarse – large blobs

    // Combine with time-varying weights so pattern morphs between regimes
    float morph = sin(t * 0.05) * 0.5 + 0.5; // 0..1 slow morph
    float field = mix(
        bp1 * 0.6 + bp2 * 0.4,
        bp1 * 0.3 + bp3 * 0.7,
        morph
    );

    // Nonlinear activation (sigmoid) sharpens into Turing-like thresholds
    field = 1.0 / (1.0 + exp(-field * 12.0));

    // Second derivative for edge emphasis (labyrinth walls)
    float dx = 0.01;
    float lap = 0.0;
    lap += 1.0 / (1.0 + exp(-bandpass(p + vec2(dx, 0.0), mix(8.0, 3.5, morph), t) * 12.0));
    lap += 1.0 / (1.0 + exp(-bandpass(p - vec2(dx, 0.0), mix(8.0, 3.5, morph), t) * 12.0));
    lap += 1.0 / (1.0 + exp(-bandpass(p + vec2(0.0, dx), mix(8.0, 3.5, morph), t) * 12.0));
    lap += 1.0 / (1.0 + exp(-bandpass(p - vec2(0.0, dx), mix(8.0, 3.5, morph), t) * 12.0));
    lap = abs(lap / 4.0 - field); // Laplacian magnitude = edge strength

    // --- Colour mapping ---
    // Map activator field to palette, edges get brighter glow
    vec3 col = palette(field * 0.8 + t * 0.02);

    // Edge glow (labyrinth walls shimmer)
    col += vec3(0.15, 0.25, 0.35) * pow(lap, 0.5) * 2.0;

    // Subtle vignette
    float vig = 1.0 - 0.35 * dot(uv, uv);
    col *= vig;

    // Gentle breathing pulse
    col *= 0.95 + 0.05 * sin(t * 0.8);

    gl_FragColor = vec4(col, 1.0);
}
