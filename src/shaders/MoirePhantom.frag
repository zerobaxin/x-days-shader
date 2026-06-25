// Moiré Phantom — optical illusion from overlapping rotating radial grids
// Three fan gratings at different angular offsets counter-rotate;
// their interference produces ghostly Moiré arcs that breathe and drift.
// A slow colour wheel tints the phantom fringes, and vignette + dither
// keep the edges clean.
uniform float iTime;
uniform vec3 iResolution;

// Rotational Moiré: two radial line families at angles a, b
// interfere whenever |sin(n*(a-b))| is small — low-order harmonics
// create the visible phantom arcs.
float radialGrid(vec2 p, float angle, float spokes) {
    float a = atan(p.y, p.x) + angle;
    // Triangle-wave with period 2π/spokes → sharp lines
    float t = abs(fract(a * spokes / 6.2831853) - 0.5) * 2.0;
    return smoothstep(0.08, 0.02, t);
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    float t = iTime;

    // --- Three rotating radial gratings ---
    float sp = 24.0; // base spoke count
    float g1 = radialGrid(uv,  t * 0.15, sp);
    float g2 = radialGrid(uv, -t * 0.22, sp + 4.0);
    float g3 = radialGrid(uv,  t * 0.09 + 1.047, sp - 2.0);

    // Multiply grids → interference only where all three overlap,
    // producing bright Moiré fringes
    float moire = g1 * g2 * g3;

    // Add partially-transparent double overlaps for richer fringes
    float moire2 = g1 * g2 * 0.4 + g2 * g3 * 0.4 + g3 * g1 * 0.4;
    float m = moire + moire2 * 0.35;

    // --- Radial wave modulation (concentric phantom rings) ---
    float r = length(uv);
    float ring = 0.5 + 0.5 * sin(r * 18.0 - t * 1.2);
    m *= 0.7 + 0.3 * ring;

    // --- Colour wheel based on angle + time ---
    float hue = atan(uv.y, uv.x) / 6.2831853 + 0.5 + t * 0.04;
    vec3 col1 = 0.5 + 0.5 * cos(6.2831853 * (hue + vec3(0.0, 0.33, 0.67)));
    vec3 col2 = 0.5 + 0.5 * cos(6.2831853 * (hue * 1.5 + vec3(0.1, 0.45, 0.78)));

    // Mix two colour layers weighted by the different interference terms
    vec3 col = mix(col2 * 0.5, col1, m);

    // --- Background: faint static radial lines for depth ---
    float bg = 1.0 - smoothstep(0.02, 0.09,
                 abs(fract(atan(uv.y, uv.x) * sp / 6.2831853) - 0.5) * 2.0);
    col += vec3(0.015, 0.01, 0.025) * bg;

    // --- Vignette ---
    col *= 1.0 - 0.45 * r * r;

    // --- Tone-map (simple Reinhard) ---
    col = col / (1.0 + col);

    gl_FragColor = vec4(col, 1.0);
}
