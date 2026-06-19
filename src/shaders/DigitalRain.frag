// Digital Rain / Matrix effect — cascading glyph columns over a deep void
// Technique: layered pseudo-random vertical streaks with scroll offsets,
// head-glow on each column, randomised glyph brightness via hash, and a
// slow horizontal drift keeps the rain alive without user input.

uniform float iTime;
uniform vec3 iResolution;

// Hash from screen-space integer coords + column seed
float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;

    // Slow parallax drift per column
    float drift = sin(iTime * 0.07) * 0.15;

    // Grid parameters
    float cols = 60.0;
    float colW = 2.0 / cols;
    float cx = uv.x + drift;
    float colId = floor(cx / colW);

    // Per-column random seed & scroll speed
    float seed = hash21(vec2(colId, 0.0));
    float speed = 0.35 + seed * 0.45;

    // Scroll that column
    float scrollY = iTime * speed + seed * 40.0;

    // Cell within the column
    float cellH = 0.065;
    float localX = cx - colId * colW;
    float cellId = floor((-uv.y + scrollY) / cellH);
    float localY = (-uv.y + scrollY - cellId * cellH) / cellH;

    // Glyph brightness from hash
    float glyphSeed = hash21(vec2(colId, cellId));

    // Fade pattern: bright head fading to tail
    float headDist = scrollY - (cellId * cellH + uv.y);
    headDist = max(headDist, 0.0);
    float tailLen = 10.0 + seed * 12.0;
    float fade = 1.0 - headDist / (cellH * tailLen);
    fade = clamp(fade, 0.0, 1.0);

    // Head glow — first few cells are extra bright
    float headGlow = smoothstep(0.3, 0.0, headDist / (cellH * 3.0));

    // Glyph mask — rounded rect inside the cell
    vec2 gp = vec2(localX / colW, localY);
    gp = (gp - 0.5) * 2.0;
    float mask = smoothstep(0.85, 0.75, max(abs(gp.x), abs(gp.y)));
    mask *= step(0.08, glyphSeed); // random gaps

    // Final cell brightness
    float bright = mask * (fade * 0.45 + headGlow * 0.65);

    // --- Secondary faint layer (dense, fast, dim) ---
    float cols2 = 110.0;
    float colW2 = 2.0 / cols2;
    float drift2 = sin(iTime * 0.11 + 1.7) * 0.1;
    float cx2 = uv.x + drift2;
    float colId2 = floor(cx2 / colW2);
    float seed2 = hash21(vec2(colId2 + 73.0, 0.0));
    float speed2 = 0.6 + seed2 * 0.5;
    float scrollY2 = iTime * speed2 + seed2 * 55.0;
    float cellH2 = 0.045;
    float cellId2 = floor((-uv.y + scrollY2) / cellH2);
    float localY2 = (-uv.y + scrollY2 - cellId2 * cellH2) / cellH2;
    float gSeed2 = hash21(vec2(colId2 + 73.0, cellId2));
    float headDist2 = max(scrollY2 - (cellId2 * cellH2 + uv.y), 0.0);
    float fade2 = 1.0 - headDist2 / (cellH2 * 7.0);
    fade2 = clamp(fade2, 0.0, 1.0);
    float localX2 = cx2 - colId2 * colW2;
    vec2 gp2 = vec2(localX2 / colW2, localY2) * 2.0 - 1.0;
    float mask2 = smoothstep(0.9, 0.7, max(abs(gp2.x), abs(gp2.y))) * step(0.15, gSeed2);
    float bright2 = mask2 * fade2 * 0.18;

    // --- Compose ---
    // Classic matrix green with head-white
    vec3 col = vec3(0.0, 0.0, 0.0);

    // Primary layer
    vec3 green = vec3(0.15, 0.9, 0.25);
    vec3 white = vec3(0.85, 1.0, 0.9);
    vec3 headCol = mix(green * 1.8, white, 0.7);
    col += mix(green, headCol, headGlow) * bright;

    // Secondary layer (slightly teal)
    col += vec3(0.1, 0.55, 0.6) * bright2;

    // Subtle depth fog at edges
    float vignette = 1.0 - 0.4 * dot(uv, uv);
    col *= vignette;

    // Very faint background grid to hint at the digital substrate
    float gridLine = smoothstep(0.02, 0.0, abs(fract(uv.x * cols * 0.5) - 0.5) - 0.495)
                   + smoothstep(0.02, 0.0, abs(fract(uv.y * 15.0) - 0.5) - 0.495);
    col += vec3(0.0, 0.04, 0.02) * gridLine;

    gl_FragColor = vec4(col, 1.0);
}
