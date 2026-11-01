// Fractal Flame — animated IFS (Iterated Function System) fractal
// Renders a Chaos Game-style fractal flame using probabilistic affine maps.
// Four affine transforms with sin/cos oscillation create morphing organic forms.
// Accumulation into a log-density buffer gives the classic flame glow.
// Spectral cosine palette colors by converged orbit position.

uniform float iTime;
uniform vec3 iResolution;

// Affine transform: z -> c*z + d_rotated(offset)
vec2 applyAffine(vec2 p, vec2 c, float rot, vec2 offset) {
    float sr = sin(rot);
    float cr = cos(rot);
    vec2 d = vec2(cr * offset.x - sr * offset.y,
                  sr * offset.x + cr * offset.y);
    return vec2(c.x * p.x - c.y * p.y + d.x,
               c.y * p.x + c.x * p.y + d.y);
}

// Hash for pseudo-random per-pixel seed
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Cosine palette for spectral coloring
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    float t = iTime * 0.3;

    // Per-pixel random seed (pixel position primes the chaos game)
    float seed = hash(gl_FragCoord.xy * 0.01 + vec2(42.0, 17.0));
    float rnd = seed;

    // IFS orbit — start near origin
    vec2 p = vec2(0.01 * rnd - 0.005, 0.01 * fract(rnd * 7.0) - 0.005);
    vec3 col = vec3(0.0);

    float accum = 0.0;
    const int ITER = 80;

    // Four affine maps with time-varying parameters
    for (int i = 0; i < ITER; i++) {
        // Advance PRNG
        rnd = fract(rnd * 1234.5 + 0.1);

        // Pick which affine map (weighted selection)
        // Map 0: 30%, Map 1: 25%, Map 2: 25%, Map 3: 20%
        float sel = rnd;

        // Scale contraction and rotation oscillate with time
        float s0 = 0.55 + 0.15 * sin(t * 0.7 + 1.0);
        float r0 = t * 0.5 + 0.3 * sin(t * 0.4);
        float s1 = 0.50 + 0.10 * cos(t * 0.6 + 2.0);
        float r1 = -t * 0.4 + 0.5 * sin(t * 0.3);
        float s2 = 0.45 + 0.12 * sin(t * 0.5 + 3.0);
        float r2 = t * 0.6 + 0.4 * cos(t * 0.5);
        float s3 = 0.40 + 0.08 * cos(t * 0.8 + 4.0);
        float r3 = -t * 0.3 + 0.2 * sin(t * 0.7);

        vec2 c;
        float rot;
        vec2 off;

        if (sel < 0.30) {
            // Map 0: spiral inward with rotation
            c = vec2(s0, -s0 * 0.4);
            rot = r0;
            off = vec2(0.3 * sin(t * 0.2), 0.1 * cos(t * 0.3));
        } else if (sel < 0.55) {
            // Map 1: contract and shift left
            c = vec2(s1 * 0.8, s1 * 0.6);
            rot = r1;
            off = vec2(-0.4 * cos(t * 0.25), 0.25 * sin(t * 0.35));
        } else if (sel < 0.80) {
            // Map 2: contract and shift right-up
            c = vec2(s2 * 0.7, -s2 * 0.5);
            rot = r2;
            off = vec2(0.35 * sin(t * 0.3), -0.3 * cos(t * 0.2));
        } else {
            // Map 3: sinusoidal fold for flame-like distortion
            p.x = sin(p.y * 3.0 + t * 0.5) * 0.3 + p.x * s3;
            p.y = cos(p.x * 2.5 + t * 0.4) * 0.2 + p.y * s3;
            c = vec2(s3, s3 * 0.3);
            rot = r3;
            off = vec2(0.1 * sin(t * 0.15), 0.35 * cos(t * 0.2));
        }

        if (sel >= 0.80) {
            // Already applied sinusoidal fold above, add offset
            float sr3 = sin(rot);
            float cr3 = cos(rot);
            p += vec2(cr3 * off.x - sr3 * off.y,
                       sr3 * off.x + cr3 * off.y);
        } else {
            p = applyAffine(p, c, rot, off);
        }

        // Accumulate: every point contributes a soft glow at uv
        vec2 delta = p - uv;
        float dist2 = dot(delta, delta);
        // Gaussian-ish kernel for flame softness
        float w = exp(-dist2 * 40.0);
        accum += w;

        // Color by converged position (maps orbit → hue)
        float hue = 0.5 + 0.5 * sin(p.x * 3.0 + p.y * 2.0 + t * 0.2);
        col += w * palette(hue);
    }

    // Log-density mapping: classic flame brightness
    float density = accum / float(ITER);
    float brightness = log(1.0 + density * 50.0) * 0.15;

    // Tone map and gamma
    col = col * brightness;
    col = pow(col, vec3(0.85));

    // Vignette
    float vig = 1.0 - 0.3 * dot(uv, uv);
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
}
