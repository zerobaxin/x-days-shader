// ————————————————————————————————————————————————————————————
//  Glitch Databend
//  A corrupted-broadcast aesthetic. A synthetic analogue test
//  card (colour bars, oscilloscope trace, tone blocks) is being
//  torn apart by digital decay:
//    · per-scanline horizontal "databend" row shifting
//    · animated RGB channel separation (chromatic tearing)
//    · hard block corruption flashes + a travelling tear line
//    · bit-crush posterisation whose depth follows the glitch
//  All randomness is hash-based and re-seeded a few times per
//  second so tears snap in hard cuts instead of drifting.
// ————————————————————————————————————————————————————————————

uniform float iTime;
uniform vec3 iResolution;

// ——— hashes ————————————————————————————————————————————————
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);
    p3 += dot(p3, vec3(p3.y, p3.z, p3.x) + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// smooth value noise — used for the soft databend smear
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

// ——— broadcast colour-bar palette (cyan / magenta / amber biased) ———
vec3 barColor(float i) {
    vec3 c = vec3(0.90, 0.90, 0.92);            // white
    if (i > 0.14) c = vec3(0.95, 0.82, 0.10);   // amber
    if (i > 0.28) c = vec3(0.08, 0.86, 0.92);   // cyan
    if (i > 0.42) c = vec3(0.10, 0.88, 0.38);   // green
    if (i > 0.56) c = vec3(0.92, 0.12, 0.78);   // magenta
    if (i > 0.70) c = vec3(0.92, 0.18, 0.20);   // red
    if (i > 0.84) c = vec3(0.16, 0.24, 0.95);   // blue
    // desaturate slightly so the video looks analog
    return mix(c, vec3(dot(c, vec3(0.299, 0.587, 0.114))), 0.15);
}

// ——— the "source" image that is being corrupted ————————————————
vec3 testCard(vec2 p, float t) {
    vec3 col = vec3(0.015, 0.022, 0.045);       // dark signal floor

    // —— colour bars across the upper two thirds
    if (p.y > -0.18) {
        float i = clamp(p.x * 0.5 + 0.5, 0.0, 0.999);
        vec3 bar = barColor(i);
        col = bar * (0.72 + 0.40 * smoothstep(-0.18, 1.0, p.y));
        // slow luminance sweep passing over the bars
        float s = p.x - sin(t * 0.55) * 1.3;
        col += bar * 0.30 * exp(-s * s * 4.0);
    }

    // —— oscilloscope waveform trace in the middle band
    float w = 0.30 * sin(p.x * 6.5 + t * 1.7)
            + 0.17 * sin(p.x * 15.0 - t * 2.3)
            + 0.07 * sin(p.x * 37.0 + t * 3.9);
    float y0 = -0.52 + w * 0.30;
    float trace = smoothstep(0.040, 0.0, abs(p.y - y0));
    col += vec3(0.55, 1.0, 0.85) * trace;

    // —— grey tone blocks along the bottom
    if (p.y < -0.74) {
        float k = floor((p.x * 0.5 + 0.5) * 12.0);
        float lvl = 0.05 + 0.85 * hash21(vec2(k, 3.0));
        col = mix(col, vec3(lvl), 0.9);
    }

    // —— faint grid hinting at the digital substrate beneath
    vec2 g = abs(fract(p * 8.0) - 0.5);
    col += vec3(0.09, 0.15, 0.22) * smoothstep(0.470, 0.5, max(g.x, g.y));

    return col;
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    float t = iTime;

    // ——— glitch envelope: slow breathing + occasional violent tear bursts
    float seg  = floor(t * 3.0);                           // hard-cut reseed rate
    float soft = 0.5 + 0.5 * sin(t * 0.9);                 // slow intensity breath
    float spike = smoothstep(0.78, 1.0, hash11(seg * 2.7 + 1.3));
    float glitch = 0.22 + 0.55 * soft + 1.15 * spike;

    // ——— per-scanline row shifting (the actual "databend")
    vec2 guv = uv;
    float rows = 88.0;
    float row  = floor(uv.y * rows);
    float rr   = hash21(vec2(row, seg * 1.7));
    guv.x += (rr - 0.5) * 0.60 * glitch * step(0.52, rr);
    // whole horizontal bands slip sideways as blocks
    float band = floor(uv.y * 6.0);
    float bs   = hash21(vec2(band, seg * 3.1 + 5.0));
    guv.x += (bs - 0.5) * 0.30 * glitch * step(0.68, bs);
    // soft, continuous smear so the picture breathes even between bursts
    guv.x += (vnoise(vec2(uv.y * 3.0, t * 0.6)) - 0.5) * 0.07 * glitch;
    guv.y += (vnoise(vec2(uv.x * 2.2 - t * 0.3, t * 0.4)) - 0.5) * 0.02 * glitch;

    // ——— RGB channel separation (chromatic tearing)
    float sep = (0.010 + 0.042 * glitch);
    vec3 col = vec3(
        testCard(guv + vec2(sep, sep * 0.35), t).r,
        testCard(guv, t).g,
        testCard(guv - vec2(sep, sep * 0.35), t).b
    );
    // extra magenta/cyan fringe only from the split channels
    vec3 base = testCard(guv, t);
    col += vec3(0.10, 0.0, 0.16) * (col.r - base.r) * 6.0;

    // ——— crisp interlaced scanlines
    float sl = step(0.5, fract(gl_FragCoord.y * 0.5));
    col *= 0.80 + 0.20 * sl;

    // ——— block corruption: hard-edged rectangles flare bright
    vec2 cell = floor(gl_FragCoord.xy / 26.0);
    float cn = hash21(cell + floor(t * 11.0) * 7.3);
    col += vec3(0.55, 0.95, 1.0) * step(0.962, cn) * 0.75 * glitch;

    // ——— travelling horizontal tear line
    float ly = fract(t * 0.19) * 2.4 - 1.2;
    float line = smoothstep(0.022, 0.0, abs(uv.y - ly));
    col += vec3(0.75, 1.0, 0.95) * line * 0.45 * glitch;

    // ——— chroma noise floor
    col += (hash21(gl_FragCoord.xy + fract(t) * 137.0) - 0.5) * 0.07 * glitch;

    // ——— bit-crush: quantisation depth loosens as the glitch worsens
    float levels = mix(52.0, 9.0, clamp(glitch * 0.55, 0.0, 1.0));
    col = floor(col * levels) / levels;

    // ——— vignette + gentle filmic curve
    col *= 1.0 - 0.20 * dot(uv, uv);
    col = pow(max(col, 0.0), vec3(0.88));

    gl_FragColor = vec4(col, 1.0);
}
