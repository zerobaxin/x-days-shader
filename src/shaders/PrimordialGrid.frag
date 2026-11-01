// PrimordialGrid — stateless cellular automata on the GPU
//
// No ping-pong buffers: the whole lattice is rebuilt from scratch in a single
// pass. Each generation seeds a float-only hash "primordial soup", one
// Conway-style Life step (born on 3, survive on 2-3) is applied to that soup,
// and cell heat is accumulated forward across the generations inside the same
// loop, so living regions leave glowing trails behind them.
//
// GLSL ES 1.00 note: no bitwise operators and no self-recursion are available
// in WebGL1 shaders, so the automaton is evaluated as a bounded forward loop
// over generations with a float hash instead of an integer one.

uniform float iTime;
uniform vec3 iResolution;

// --- Float-only hash (no integer bit ops in GLSL ES 1.00) ---
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
}

// Live/dead seed for lattice cell p at generation seed
float cellSeed(ivec2 p, float seed) {
    return hash21(vec2(p) + vec2(seed * 13.7, seed * 7.3));
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;

    // Lattice: ~64 cells across the viewport height
    float scale = 64.0;
    vec2 gridUV = uv * scale;
    ivec2 cell = ivec2(floor(gridUV));

    // Time-driven generation clock (each generation ~0.45 s)
    float gNow = floor(iTime * 2.2);

    // ---- evaluate the newest GENS generations, oldest first --------------
    float heat = 0.0;       // decaying trail of life
    float alive = 0.0;      // state of newest generation
    float prevAlive = 0.0;  // state one generation back (birth flashes)
    float nf = 0.0;         // neighbour density of newest generation

    const int GENS = 10;
    for (int g = 0; g < GENS; g++) {
        float seed = mod(gNow - float(GENS - 1 - g), 512.0);

        // Count live neighbours: a neighbour is alive when its hash exceeds 0.5
        float count = 0.0;
        for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
                if (dx == 0 && dy == 0) continue;
                count += step(0.5, cellSeed(cell + ivec2(dx, dy), seed));
            }
        }

        float wasAlive = step(0.5, cellSeed(cell, seed));
        float born = step(2.5, count) * step(count, 3.5) * (1.0 - wasAlive);
        float survive = wasAlive * step(1.5, count) * step(count, 3.5);
        float state = clamp(born + survive, 0.0, 1.0);

        prevAlive = alive;
        alive = state;
        nf = count / 8.0;
        heat = state + (1.0 - state) * heat * 0.72;   // age / decay trail
    }

    // Cell-edge detection for grid lines
    vec2 f = fract(gridUV) - 0.5;
    float edge = 1.0 - smoothstep(0.0, 0.06, min(abs(f.x), abs(f.y)));

    // Spectral palette (cosine palette technique)
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    vec3 col = a + b * cos(6.28318 * (c * heat + d));

    // Birth highlight: newly born cells flash bright cyan-blue
    float birth = alive * (1.0 - prevAlive);
    col += birth * vec3(0.4, 0.6, 0.9);

    // Alive cells glow; dead cells fade to near-black with heat decay
    col *= alive * 0.85 + heat * 0.55;

    // Neighbour-count tint — subtle rainbow shift per neighbourhood density
    col += alive * nf * 0.15 * vec3(0.3, -0.1, 0.4);

    // Grid lines
    vec3 gridCol = vec3(0.06, 0.08, 0.14);
    col = mix(col, gridCol, edge * 0.7);

    // Subtle pulsing background organised by cell hash
    col += (1.0 - edge) * 0.015 * hash21(vec2(cell) * 0.37 + 7.0);

    // Vignette for depth
    col *= 1.0 - 0.35 * dot(uv, uv);

    gl_FragColor = vec4(col, 1.0);
}
